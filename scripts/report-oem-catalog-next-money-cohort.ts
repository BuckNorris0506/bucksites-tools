import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

const OEM_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);
const EXCLUDED_FRIGIDAIRE_TOKENS = [
  "242017801",
  "242086201",
  "242294502",
  "EPTWFU01",
  "FPPWFU01",
] as const;
const TOP_CANDIDATE_LIMIT = 25;

type RawRetailerLinkRow = {
  id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

type FetchResult = {
  table: string;
  rows: RawRetailerLinkRow[];
};

type CandidateRow = {
  link_id: string;
  table: string;
  retailer_key: string;
  domain: string;
  affiliate_url: string;
  detected_token: string | "UNKNOWN";
  blocked_state: "BLOCKED_SEARCH_OR_DISCOVERY";
  domain_blocked_count: number;
};

export type OemCatalogNextMoneyCohortReport = {
  report_name: "buckparts_oem_catalog_next_money_cohort_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  total_remaining_rows: number | "UNKNOWN";
  top_domains: Array<{ domain: string; blocked_count: number }> | "UNKNOWN";
  top_tables: Array<{ table: string; blocked_count: number }> | "UNKNOWN";
  top_candidate_rows: CandidateRow[] | "UNKNOWN";
  recommended_next_cohort: string;
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchRows?: () => Promise<FetchResult[]>;
};

function tablePriority(table: string): number {
  if (table === "retailer_links") return 0;
  if (table === "whole_house_water_retailer_links") return 1;
  if (table === "air_purifier_retailer_links") return 2;
  return 99;
}

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key : "(unknown_retailer)";
}

function normalizeLinkId(id: string | null): string {
  return typeof id === "string" && id.trim().length > 0 ? id : "(missing_id)";
}

function normalizeUrl(url: string | null): string {
  return typeof url === "string" ? url : "";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "(invalid_url)";
  }
}

function extractDetectedToken(url: string): string | "UNKNOWN" {
  try {
    const u = new URL(url);
    const queryEntries = Array.from(u.searchParams.entries());
    const queryKeys = ["q", "query", "searchterm", "searchkeyword", "keywords", "ntt"];
    for (const key of queryKeys) {
      const value = queryEntries.find(([k]) => k.toLowerCase() === key)?.[1];
      if (value && value.trim().length > 0) return value.trim().toUpperCase();
    }
    const pathToken = u.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => /^[a-z0-9-]{4,}$/i.test(segment))
      .at(-1);
    return pathToken ? pathToken.toUpperCase() : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function shouldExcludeFrigidaireHandled(url: string): boolean {
  const upper = url.toUpperCase();
  return EXCLUDED_FRIGIDAIRE_TOKENS.some((token) => upper.includes(token));
}

async function fetchRowsViaSupabase(): Promise<FetchResult[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const tables: Array<{ name: string; approvedOnly: boolean }> = [
    { name: "retailer_links", approvedOnly: false },
    { name: "air_purifier_retailer_links", approvedOnly: true },
    { name: "whole_house_water_retailer_links", approvedOnly: true },
  ];

  const out: FetchResult[] = [];
  for (const table of tables) {
    const rows: RawRetailerLinkRow[] = [];
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(table.name)
        .select("id,retailer_key,affiliate_url,browser_truth_classification")
        .range(from, from + pageSize - 1);
      if (table.approvedOnly) query = query.eq("status", "approved");
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as RawRetailerLinkRow[];
      rows.push(...chunk);
      if (chunk.length < pageSize) break;
    }
    out.push({ table: table.name, rows });
  }
  return out;
}

function countBy<T extends string>(
  values: T[],
): Array<{ key: T; count: number }> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.entries(counts).map(([key, count]) => ({ key: key as T, count }));
}

function buildRecommendedNextCohort(
  topCandidateRows: CandidateRow[],
): string {
  if (topCandidateRows.length === 0) {
    return "No remaining non-Frigidaire OEM blocked-search cohort is currently available.";
  }
  const pairCounts = new Map<string, { table: string; domain: string; count: number }>();
  for (const row of topCandidateRows) {
    const key = `${row.table}||${row.domain}`;
    const existing = pairCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      pairCounts.set(key, { table: row.table, domain: row.domain, count: 1 });
    }
  }
  const bestPair = Array.from(pairCounts.values()).sort((a, b) => {
    return (
      b.count - a.count ||
      tablePriority(a.table) - tablePriority(b.table) ||
      a.domain.localeCompare(b.domain)
    );
  })[0];
  if (!bestPair || bestPair.count < 1) {
    return "No remaining non-Frigidaire OEM blocked-search cohort is currently available.";
  }
  return `Start with ${bestPair.table} rows on domain ${bestPair.domain} (highest actionable blocked-search concentration).`;
}

export function buildOemCatalogNextMoneyCohortReportFromRows(
  fetched: FetchResult[],
  now: () => Date,
): OemCatalogNextMoneyCohortReport {
  const baseRows: Omit<CandidateRow, "domain_blocked_count">[] = [];
  for (const result of fetched) {
    for (const row of result.rows) {
      const retailerKey = normalizeRetailerKey(row.retailer_key);
      if (!OEM_KEYS.has(retailerKey)) continue;
      const affiliateUrl = normalizeUrl(row.affiliate_url);
      if (shouldExcludeFrigidaireHandled(affiliateUrl)) continue;
      const gateFailureKind = buyLinkGateFailureKind({
        retailer_key: row.retailer_key,
        affiliate_url: affiliateUrl,
        browser_truth_classification: row.browser_truth_classification,
      });
      const state = mapSignalsToRetailerLinkState({
        browserTruthClassification: row.browser_truth_classification,
        gateFailureKind,
      });
      if (state !== "BLOCKED_SEARCH_OR_DISCOVERY") continue;
      baseRows.push({
        link_id: normalizeLinkId(row.id),
        table: result.table,
        retailer_key: retailerKey,
        domain: extractDomain(affiliateUrl),
        affiliate_url: affiliateUrl,
        detected_token: extractDetectedToken(affiliateUrl),
        blocked_state: "BLOCKED_SEARCH_OR_DISCOVERY",
      });
    }
  }

  const topDomains = countBy(baseRows.map((row) => row.domain))
    .map(({ key, count }) => ({ domain: key, blocked_count: count }))
    .sort((a, b) => b.blocked_count - a.blocked_count || a.domain.localeCompare(b.domain));
  const topTables = countBy(baseRows.map((row) => row.table))
    .map(({ key, count }) => ({ table: key, blocked_count: count }))
    .sort(
      (a, b) =>
        b.blocked_count - a.blocked_count ||
        tablePriority(a.table) - tablePriority(b.table) ||
        a.table.localeCompare(b.table),
    );

  const domainCount = new Map(topDomains.map((row) => [row.domain, row.blocked_count]));
  const topCandidateRows: CandidateRow[] = baseRows
    .map((row) => ({
      ...row,
      domain_blocked_count: domainCount.get(row.domain) ?? 0,
    }))
    .sort((a, b) => {
      return (
        b.domain_blocked_count - a.domain_blocked_count ||
        tablePriority(a.table) - tablePriority(b.table) ||
        a.affiliate_url.localeCompare(b.affiliate_url)
      );
    })
    .slice(0, TOP_CANDIDATE_LIMIT);

  return {
    report_name: "buckparts_oem_catalog_next_money_cohort_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    total_remaining_rows: baseRows.length,
    top_domains: topDomains,
    top_tables: topTables,
    top_candidate_rows: topCandidateRows,
    recommended_next_cohort: buildRecommendedNextCohort(topCandidateRows),
    known_unknowns: [],
  };
}

export async function buildOemCatalogNextMoneyCohortReport(
  options: BuildOptions = {},
): Promise<OemCatalogNextMoneyCohortReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchRows ?? fetchRowsViaSupabase;
  try {
    return buildOemCatalogNextMoneyCohortReportFromRows(await fetchRows(), now);
  } catch {
    return {
      report_name: "buckparts_oem_catalog_next_money_cohort_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_remaining_rows: "UNKNOWN",
      top_domains: "UNKNOWN",
      top_tables: "UNKNOWN",
      top_candidate_rows: "UNKNOWN",
      recommended_next_cohort: "Unable to derive next cohort because retailer-link dataset is unavailable.",
      known_unknowns: ["Retailer-link dataset unavailable; OEM next money cohort is UNKNOWN."],
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildOemCatalogNextMoneyCohortReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-oem-catalog-next-money-cohort] failed", error);
    process.exit(1);
  });
}

