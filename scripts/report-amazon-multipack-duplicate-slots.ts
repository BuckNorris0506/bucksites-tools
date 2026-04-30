import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import * as linksModuleNs from "@/lib/retailers/launch-buy-links";

const linksModule = (linksModuleNs as { default?: unknown }).default ?? linksModuleNs;
const { buyLinkGateFailureKind } = linksModule as {
  buyLinkGateFailureKind: typeof import("@/lib/retailers/launch-buy-links").buyLinkGateFailureKind;
};

const BATCH_FILE = "data/evidence/amazon-multipack-conversion-batch.2026-04-30.json";
const TARGET_TOKENS = new Set(["ADQ36006101", "DA29-00003G", "DA29-00020A"]);

type StagedCandidate = {
  token: string;
  canonical_dp_url: string;
  asin: string;
};

type FilterRow = {
  id: string;
  slug: string | null;
  oem_part_number: string | null;
};

type RetailerLinkRow = {
  id: string | null;
  filter_id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  is_primary: boolean | null;
  status: string | null;
};

type Recommendation =
  | "NOOP_EXISTING_SLOT_ALREADY_SAFE"
  | "UPDATE_EXISTING_SLOT_TO_MULTIPACK_SUBTYPE"
  | "KEEP_EXISTING_AND_DO_NOT_ADD_MULTIPACK"
  | "UNKNOWN_REVIEW_REQUIRED";

export type MultipackDuplicateDiagnosisRow = {
  token: string;
  filter_slug: string;
  filter_id: string | "UNKNOWN";
  existing_link_id: string | "UNKNOWN";
  existing_affiliate_url: string | null;
  existing_browser_truth_classification: string | null;
  existing_buyable_subtype: string | null;
  existing_is_primary: boolean | null;
  existing_status: string | null;
  staged_multipack_url: string;
  staged_asin: string;
  recommendation: Recommendation;
};

export type AmazonMultipackDuplicateSlotsReport = {
  report_name: "buckparts_amazon_multipack_duplicate_slots_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  rows: MultipackDuplicateDiagnosisRow[];
  known_unknowns: string[];
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  readTextFile?: (absolutePath: string) => string;
  fetchFilters?: () => Promise<FilterRow[]>;
  fetchRetailerLinks?: () => Promise<{ rows: RetailerLinkRow[]; buyableSubtypeColumnPresent: boolean }>;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function matchesFilterToken(filter: FilterRow, token: string): boolean {
  const t = normalizeToken(token);
  return normalizeToken(filter.slug ?? "") === t || normalizeToken(filter.oem_part_number ?? "") === t;
}

function isLikelyMultipackUrl(url: string | null): boolean {
  if (!url) return false;
  const text = url.toLowerCase();
  return /(?:^|[^a-z0-9])(2|3|4|5|6|8|10|12)[- ]?pack(?:[^a-z0-9]|$)/i.test(text);
}

function recommend(args: {
  existing: RetailerLinkRow | null;
  stagedUrl: string;
  stagedSubtypeMultipack: boolean;
}): Recommendation {
  if (!args.existing) return "UNKNOWN_REVIEW_REQUIRED";
  const gateFailure = buyLinkGateFailureKind({
    retailer_key: args.existing.retailer_key,
    affiliate_url: args.existing.affiliate_url ?? "",
    browser_truth_classification: args.existing.browser_truth_classification,
    browser_truth_buyable_subtype: args.existing.browser_truth_buyable_subtype,
  });
  const safe = gateFailure === null;
  if (safe && args.existing.browser_truth_classification === "direct_buyable") {
    const subtype = (args.existing.browser_truth_buyable_subtype ?? "").trim();
    if (!subtype && args.stagedSubtypeMultipack && !isLikelyMultipackUrl(args.existing.affiliate_url)) {
      return "UPDATE_EXISTING_SLOT_TO_MULTIPACK_SUBTYPE";
    }
    return "NOOP_EXISTING_SLOT_ALREADY_SAFE";
  }
  if (gateFailure === "search_placeholder" || gateFailure === "indirect_discovery") {
    return "UPDATE_EXISTING_SLOT_TO_MULTIPACK_SUBTYPE";
  }
  return "KEEP_EXISTING_AND_DO_NOT_ADD_MULTIPACK";
}

async function fetchFiltersViaSupabase(): Promise<FilterRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const rows: FilterRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("filters")
      .select("id,slug,oem_part_number")
      .range(from, from + 999);
    if (error) throw error;
    const chunk = (data ?? []) as FilterRow[];
    rows.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return rows;
}

async function fetchRetailerLinksViaSupabase(): Promise<{
  rows: RetailerLinkRow[];
  buyableSubtypeColumnPresent: boolean;
}> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const rows: RetailerLinkRow[] = [];
  let subtypePresent = true;
  for (let from = 0; ; from += 1000) {
    const withSubtypeCols =
      "id,filter_id,retailer_key,affiliate_url,browser_truth_classification,browser_truth_buyable_subtype,is_primary,status";
    const withoutSubtypeCols =
      "id,filter_id,retailer_key,affiliate_url,browser_truth_classification,is_primary,status";
    let chunkRows: Array<Record<string, unknown>> = [];
    if (subtypePresent) {
      const withSubtype = await supabase.from("retailer_links").select(withSubtypeCols).range(from, from + 999);
      if (withSubtype.error) {
        subtypePresent = false;
        if (from > 0) throw withSubtype.error;
        const withoutSubtype = await supabase
          .from("retailer_links")
          .select(withoutSubtypeCols)
          .range(from, from + 999);
        if (withoutSubtype.error) throw withoutSubtype.error;
        chunkRows = (withoutSubtype.data ?? []) as Array<Record<string, unknown>>;
      } else {
        chunkRows = (withSubtype.data ?? []) as Array<Record<string, unknown>>;
      }
    } else {
      const withoutSubtype = await supabase
        .from("retailer_links")
        .select(withoutSubtypeCols)
        .range(from, from + 999);
      if (withoutSubtype.error) throw withoutSubtype.error;
      chunkRows = (withoutSubtype.data ?? []) as Array<Record<string, unknown>>;
    }
    for (const row of chunkRows) {
      rows.push({
        id: (row.id as string | null | undefined) ?? null,
        filter_id: (row.filter_id as string | null | undefined) ?? null,
        retailer_key: (row.retailer_key as string | null | undefined) ?? null,
        affiliate_url: (row.affiliate_url as string | null | undefined) ?? null,
        browser_truth_classification: (row.browser_truth_classification as string | null | undefined) ?? null,
        browser_truth_buyable_subtype:
          (row.browser_truth_buyable_subtype as string | null | undefined) ?? null,
        is_primary: (row.is_primary as boolean | null | undefined) ?? null,
        status: (row.status as string | null | undefined) ?? null,
      });
    }
    if (chunkRows.length < 1000) break;
  }
  return { rows, buyableSubtypeColumnPresent: subtypePresent };
}

export async function buildAmazonMultipackDuplicateSlotsReport(
  options: BuildOptions = {},
): Promise<AmazonMultipackDuplicateSlotsReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const fetchFilters = options.fetchFilters ?? fetchFiltersViaSupabase;
  const fetchRetailerLinks = options.fetchRetailerLinks ?? fetchRetailerLinksViaSupabase;
  const knownUnknowns: string[] = [];

  const batchRaw = readTextFile(path.resolve(rootDir, BATCH_FILE));
  const batchParsed = JSON.parse(batchRaw) as { staged_candidates?: StagedCandidate[] };
  const staged = (batchParsed.staged_candidates ?? []).filter((c) => TARGET_TOKENS.has(c.token.toUpperCase()));

  let filters: FilterRow[] | null = null;
  let linksResult: { rows: RetailerLinkRow[]; buyableSubtypeColumnPresent: boolean } | null = null;
  try {
    filters = await fetchFilters();
  } catch {
    knownUnknowns.push("Failed to fetch filters.");
  }
  try {
    linksResult = await fetchRetailerLinks();
    if (!linksResult.buyableSubtypeColumnPresent) {
      knownUnknowns.push("browser_truth_buyable_subtype column not present on retailer_links.");
    }
  } catch {
    knownUnknowns.push("Failed to fetch retailer_links.");
  }

  const rows: MultipackDuplicateDiagnosisRow[] = staged.map((candidate) => {
    const matched = (filters ?? []).filter((f) => matchesFilterToken(f, candidate.token));
    const filter = matched.length === 1 ? matched[0] : null;
    const existing =
      filter == null || linksResult == null
        ? null
        : linksResult.rows.find(
            (row) =>
              row.filter_id === filter.id &&
              normalizeToken(row.retailer_key ?? "") === "amazon",
          ) ?? null;
    return {
      token: candidate.token,
      filter_slug: filter?.slug ?? "UNKNOWN",
      filter_id: filter?.id ?? "UNKNOWN",
      existing_link_id: existing?.id ?? "UNKNOWN",
      existing_affiliate_url: existing?.affiliate_url ?? null,
      existing_browser_truth_classification: existing?.browser_truth_classification ?? null,
      existing_buyable_subtype: existing?.browser_truth_buyable_subtype ?? null,
      existing_is_primary: existing?.is_primary ?? null,
      existing_status: existing?.status ?? null,
      staged_multipack_url: candidate.canonical_dp_url,
      staged_asin: candidate.asin,
      recommendation: recommend({
        existing,
        stagedUrl: candidate.canonical_dp_url,
        stagedSubtypeMultipack: true,
      }),
    };
  });

  return {
    report_name: "buckparts_amazon_multipack_duplicate_slots_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    rows,
    known_unknowns: knownUnknowns,
  };
}

export async function main(): Promise<void> {
  const report = await buildAmazonMultipackDuplicateSlotsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-amazon-multipack-duplicate-slots] failed", error);
    process.exit(1);
  });
}
