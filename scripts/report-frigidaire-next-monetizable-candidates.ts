import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

const EXCLUDED_TOKENS = ["242017801", "242086201", "242294502", "EPTWFU01", "FPPWFU01"] as const;
const OEM_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);

type FilterRow = {
  id: string;
  slug: string | null;
  oem_part_number: string | null;
  brand_slug: string | null;
};

type RetailerLinkRow = {
  filter_id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

type CandidateRow = {
  token_or_slug: string;
  filter_slug: string;
  blocked_oem_count: number;
  non_oem_link_count: number;
  direct_buyable_non_oem_count: number;
  recommended_action: string;
};

export type FrigidaireNextMonetizableCandidatesReport = {
  report_name: "buckparts_frigidaire_next_monetizable_candidates_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  excluded_tokens: string[];
  candidates: CandidateRow[];
  known_unknowns: string[];
  recommended_next_action: string;
};

type FetchResult = {
  filters: FilterRow[];
  links: RetailerLinkRow[];
};

type BuildOptions = {
  now?: () => Date;
  fetchData?: () => Promise<FetchResult>;
};

async function fetchDataViaSupabase(): Promise<FetchResult> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;

  const filters: FilterRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("filters")
      .select("id,slug,oem_part_number,brand_slug")
      .eq("brand_slug", "frigidaire")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as FilterRow[];
    filters.push(...chunk);
    if (chunk.length < pageSize) break;
  }

  const filterIds = filters.map((row) => row.id);
  const links: RetailerLinkRow[] = [];
  for (let i = 0; i < filterIds.length; i += pageSize) {
    const idChunk = filterIds.slice(i, i + pageSize);
    if (idChunk.length === 0) continue;
    const { data, error } = await supabase
      .from("retailer_links")
      .select("filter_id,retailer_key,affiliate_url,browser_truth_classification")
      .in("filter_id", idChunk);
    if (error) throw error;
    links.push(...((data ?? []) as RetailerLinkRow[]));
  }

  return { filters, links };
}

function normalizeTokenOrSlug(filter: FilterRow): string {
  const token = filter.oem_part_number?.trim();
  if (token) return token;
  return (filter.slug ?? "").trim();
}

function isBlockedOemRow(row: RetailerLinkRow): boolean {
  if (!OEM_KEYS.has((row.retailer_key ?? "").trim().toLowerCase())) return false;
  const gateFailureKind = buyLinkGateFailureKind({
    retailer_key: row.retailer_key,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification,
  });
  const state = mapSignalsToRetailerLinkState({
    browserTruthClassification: row.browser_truth_classification,
    gateFailureKind,
  });
  return state.startsWith("BLOCKED_");
}

function isNonOemRow(row: RetailerLinkRow): boolean {
  return !OEM_KEYS.has((row.retailer_key ?? "").trim().toLowerCase());
}

function buildRecommendedAction(directBuyableNonOemCount: number): string {
  if (directBuyableNonOemCount > 0) {
    return "Review and promote an existing direct_buyable non-OEM link to primary CTA for this filter.";
  }
  return "Collect browser-truth evidence on existing non-OEM links; promote only after direct_buyable proof.";
}

function buildRecommendedNextAction(candidates: CandidateRow[]): string {
  if (candidates.some((row) => row.direct_buyable_non_oem_count > 0)) {
    return "Start with candidates already containing direct_buyable non-OEM links and promote safely after final review.";
  }
  return "No immediate safe-CTA uplift candidates are proven; gather browser-truth evidence for non-OEM links first.";
}

export function buildFrigidaireNextMonetizableCandidatesReportFromData(
  input: FetchResult,
  now: () => Date,
): FrigidaireNextMonetizableCandidatesReport {
  const excluded = new Set(EXCLUDED_TOKENS.map((token) => token.toUpperCase()));
  const linksByFilterId = new Map<string, RetailerLinkRow[]>();
  for (const row of input.links) {
    const filterId = row.filter_id ?? "";
    if (!filterId) continue;
    const existing = linksByFilterId.get(filterId);
    if (existing) existing.push(row);
    else linksByFilterId.set(filterId, [row]);
  }

  const knownUnknowns: string[] = [];
  const candidates: CandidateRow[] = [];
  for (const filter of input.filters) {
    const filterSlug = (filter.slug ?? "").trim();
    if (!filterSlug) {
      knownUnknowns.push(`Filter ${filter.id} has missing slug.`);
      continue;
    }
    const tokenOrSlug = normalizeTokenOrSlug(filter);
    if (!tokenOrSlug) {
      knownUnknowns.push(`Filter ${filterSlug} has no token_or_slug identifier.`);
      continue;
    }
    if (excluded.has(tokenOrSlug.toUpperCase())) continue;

    const links = linksByFilterId.get(filter.id) ?? [];
    const blockedOemCount = links.filter(isBlockedOemRow).length;
    const nonOemRows = links.filter(isNonOemRow);
    const nonOemLinkCount = nonOemRows.length;
    const directBuyableNonOemCount = nonOemRows.filter(
      (row) => (row.browser_truth_classification ?? "").trim() === "direct_buyable",
    ).length;

    if (blockedOemCount === 0 || nonOemLinkCount === 0) continue;
    candidates.push({
      token_or_slug: tokenOrSlug,
      filter_slug: filterSlug,
      blocked_oem_count: blockedOemCount,
      non_oem_link_count: nonOemLinkCount,
      direct_buyable_non_oem_count: directBuyableNonOemCount,
      recommended_action: buildRecommendedAction(directBuyableNonOemCount),
    });
  }

  candidates.sort((a, b) => {
    return (
      b.direct_buyable_non_oem_count - a.direct_buyable_non_oem_count ||
      b.non_oem_link_count - a.non_oem_link_count ||
      b.blocked_oem_count - a.blocked_oem_count ||
      a.filter_slug.localeCompare(b.filter_slug)
    );
  });

  return {
    report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    excluded_tokens: [...EXCLUDED_TOKENS],
    candidates,
    known_unknowns: knownUnknowns,
    recommended_next_action: buildRecommendedNextAction(candidates),
  };
}

export async function buildFrigidaireNextMonetizableCandidatesReport(
  options: BuildOptions = {},
): Promise<FrigidaireNextMonetizableCandidatesReport> {
  const now = options.now ?? (() => new Date());
  const fetchData = options.fetchData ?? fetchDataViaSupabase;
  try {
    return buildFrigidaireNextMonetizableCandidatesReportFromData(await fetchData(), now);
  } catch {
    return {
      report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      excluded_tokens: [...EXCLUDED_TOKENS],
      candidates: [],
      known_unknowns: ["Frigidaire filter/retailer-link dataset unavailable; candidate queue unresolved."],
      recommended_next_action: "Restore read access and rerun candidate queue before planning promotions.",
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildFrigidaireNextMonetizableCandidatesReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-frigidaire-next-monetizable-candidates] failed", error);
    process.exit(1);
  });
}

