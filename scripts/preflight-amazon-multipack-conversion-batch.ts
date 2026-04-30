import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import * as linksModuleNs from "@/lib/retailers/launch-buy-links";
import * as enrichmentModuleNs from "./lib/discovery-candidate-enrichment";

const linksModule = (linksModuleNs as { default?: unknown }).default ?? linksModuleNs;
const enrichmentModule =
  (enrichmentModuleNs as { default?: unknown }).default ?? enrichmentModuleNs;
const { buyLinkGateFailureKind } = linksModule as {
  buyLinkGateFailureKind: typeof import("@/lib/retailers/launch-buy-links").buyLinkGateFailureKind;
};
const { canonicalAmazonDpUrl } = enrichmentModule as {
  canonicalAmazonDpUrl: typeof import("./lib/discovery-candidate-enrichment").canonicalAmazonDpUrl;
};

const BATCH_FILE = "data/evidence/amazon-multipack-conversion-batch.2026-04-30.json";
const AFFILIATE_TRACKER_FILE = "data/affiliate/affiliate-application-tracker.json";

type CandidateInput = {
  token: string;
  canonical_dp_url: string;
  asin: string;
  buyable_subtype: "MULTIPACK_DIRECT_BUYABLE";
  browser_truth_classification_candidate: "direct_buyable";
  confidence: "exact";
  mutation_status: "NOT_APPLIED";
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
};

type MappingStatus = "OK" | "UNKNOWN" | "AMBIGUOUS";
type DuplicateStatus = "CLEAR" | "DUPLICATE_FOUND" | "UNKNOWN";
type GateStatus = "PASS" | "FAIL" | "UNKNOWN";

type CandidatePreflight = {
  token: string;
  canonical_dp_url: string;
  asin: string;
  buyable_subtype: "MULTIPACK_DIRECT_BUYABLE";
  browser_truth_classification_candidate: "direct_buyable";
  confidence: "exact";
  mutation_status: "NOT_APPLIED";
  filter_slug: string;
  filter_id: string | "UNKNOWN";
  mapping_status: MappingStatus;
  duplicate_status: DuplicateStatus;
  gate_status: GateStatus;
  amazon_tag_verified: boolean | null;
  ready_for_sql_plan: boolean;
  blockers: string[];
};

export type AmazonMultipackConversionBatchPreflightReport = {
  report_name: "buckparts_amazon_multipack_conversion_batch_preflight_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  candidates: CandidatePreflight[];
  all_ready_for_sql_plan: boolean;
  known_unknowns: string[];
  recommended_next_action: string;
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  readTextFile?: (absolutePath: string) => string;
  fetchFilters?: () => Promise<FilterRow[]>;
  fetchRetailerLinks?: () => Promise<RetailerLinkRow[]>;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function parseAffiliateTagVerified(trackerText: string): boolean | null {
  const parsed = JSON.parse(trackerText) as Array<{
    id?: string;
    tagVerified?: boolean | null;
  }>;
  if (!Array.isArray(parsed)) return null;
  const amazonRecord = parsed.find((row) => row?.id === "amazon-associates");
  if (!amazonRecord) return null;
  return typeof amazonRecord.tagVerified === "boolean" ? amazonRecord.tagVerified : null;
}

function extractAsinFromCanonical(url: string): string {
  const match = url.match(/\/dp\/([A-Z0-9]{10})$/i);
  return match?.[1]?.toUpperCase() ?? "UNKNOWN";
}

function matchesFilterToken(filter: FilterRow, token: string): boolean {
  const t = normalizeToken(token);
  const slug = normalizeToken(filter.slug ?? "");
  const oem = normalizeToken(filter.oem_part_number ?? "");
  return slug === t || oem === t;
}

async function fetchFiltersViaSupabase(): Promise<FilterRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: FilterRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("filters")
      .select("id,slug,oem_part_number")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as FilterRow[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

async function fetchRetailerLinksViaSupabase(): Promise<RetailerLinkRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: RetailerLinkRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("retailer_links")
      .select("id,filter_id,retailer_key,affiliate_url,browser_truth_classification")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as RetailerLinkRow[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

function buildCandidateResult(args: {
  candidate: CandidateInput;
  filters: FilterRow[] | null;
  links: RetailerLinkRow[] | null;
  amazonTagVerified: boolean | null;
}): CandidatePreflight {
  const blockers: string[] = [];
  const canonical = canonicalAmazonDpUrl(args.candidate.canonical_dp_url) ?? args.candidate.canonical_dp_url;
  const asin = extractAsinFromCanonical(canonical);

  let mappingStatus: MappingStatus = "UNKNOWN";
  let filterId: string | "UNKNOWN" = "UNKNOWN";
  let filterSlug = "UNKNOWN";
  if (args.filters !== null) {
    const matches = args.filters.filter((filter) => matchesFilterToken(filter, args.candidate.token));
    if (matches.length === 1) {
      mappingStatus = "OK";
      filterId = matches[0]!.id;
      filterSlug = matches[0]!.slug ?? "UNKNOWN";
    } else if (matches.length > 1) {
      mappingStatus = "AMBIGUOUS";
      blockers.push("ambiguous filter mapping");
    } else {
      mappingStatus = "UNKNOWN";
      blockers.push("missing filter mapping");
    }
  } else {
    blockers.push("filters dataset unavailable");
  }

  let duplicateStatus: DuplicateStatus = "UNKNOWN";
  if (args.links !== null) {
    if (filterId === "UNKNOWN") {
      duplicateStatus = "UNKNOWN";
    } else {
      const duplicates = args.links.filter((row) => {
        if ((row.filter_id ?? "") !== filterId) return false;
        return normalizeToken(row.retailer_key ?? "") === "amazon";
      });
      duplicateStatus = duplicates.length > 0 ? "DUPLICATE_FOUND" : "CLEAR";
      if (duplicateStatus === "DUPLICATE_FOUND") {
        blockers.push("duplicate amazon retailer slot exists");
      }
    }
  } else {
    blockers.push("retailer links dataset unavailable");
  }

  let gateStatus: GateStatus = "UNKNOWN";
  try {
    const failure = buyLinkGateFailureKind({
      retailer_key: "amazon",
      affiliate_url: canonical,
      browser_truth_classification: "direct_buyable",
      browser_truth_buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
    });
    gateStatus = failure === null ? "PASS" : "FAIL";
    if (gateStatus === "FAIL") blockers.push(`buy-link gate fail: ${failure}`);
  } catch {
    gateStatus = "UNKNOWN";
    blockers.push("gate evaluation failed");
  }

  if (args.amazonTagVerified !== true) {
    blockers.push("amazon tag not verified");
  }

  const readyForSqlPlan =
    mappingStatus === "OK" &&
    duplicateStatus === "CLEAR" &&
    gateStatus === "PASS" &&
    args.amazonTagVerified === true;

  return {
    token: args.candidate.token,
    canonical_dp_url: canonical,
    asin,
    buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
    browser_truth_classification_candidate: "direct_buyable",
    confidence: "exact",
    mutation_status: "NOT_APPLIED",
    filter_slug: filterSlug,
    filter_id: filterId,
    mapping_status: mappingStatus,
    duplicate_status: duplicateStatus,
    gate_status: gateStatus,
    amazon_tag_verified: args.amazonTagVerified,
    ready_for_sql_plan: readyForSqlPlan,
    blockers,
  };
}

export async function buildAmazonMultipackConversionBatchPreflightReport(
  options: BuildOptions = {},
): Promise<AmazonMultipackConversionBatchPreflightReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const fetchFilters = options.fetchFilters ?? fetchFiltersViaSupabase;
  const fetchLinks = options.fetchRetailerLinks ?? fetchRetailerLinksViaSupabase;

  const knownUnknowns: string[] = [];
  const batchRaw = readTextFile(path.resolve(rootDir, BATCH_FILE));
  const batchParsed = JSON.parse(batchRaw) as {
    staged_candidates?: CandidateInput[];
  };

  const stagedCandidates: CandidateInput[] = (batchParsed.staged_candidates ?? [])
    .filter((row): row is CandidateInput => {
      return (
        typeof row.token === "string" &&
        typeof row.canonical_dp_url === "string" &&
        typeof row.asin === "string" &&
        row.buyable_subtype === "MULTIPACK_DIRECT_BUYABLE" &&
        row.browser_truth_classification_candidate === "direct_buyable" &&
        row.confidence === "exact" &&
        row.mutation_status === "NOT_APPLIED"
      );
    })
    .map((row) => ({
      token: row.token,
      canonical_dp_url: row.canonical_dp_url,
      asin: row.asin,
      buyable_subtype: "MULTIPACK_DIRECT_BUYABLE",
      browser_truth_classification_candidate: "direct_buyable",
      confidence: "exact",
      mutation_status: "NOT_APPLIED",
    }));

  const trackerRaw = readTextFile(path.resolve(rootDir, AFFILIATE_TRACKER_FILE));
  const amazonTagVerified = parseAffiliateTagVerified(trackerRaw);

  let filters: FilterRow[] | null = null;
  let links: RetailerLinkRow[] | null = null;
  try {
    filters = await fetchFilters();
  } catch {
    knownUnknowns.push("Failed to fetch filters.");
  }
  try {
    links = await fetchLinks();
  } catch {
    knownUnknowns.push("Failed to fetch retailer_links.");
  }

  const candidates = stagedCandidates.map((candidate) =>
    buildCandidateResult({
      candidate,
      filters,
      links,
      amazonTagVerified,
    }),
  );

  const allReadyForSqlPlan =
    candidates.length > 0 && candidates.every((candidate) => candidate.ready_for_sql_plan);

  const recommendedNextAction = allReadyForSqlPlan
    ? "All multipack candidates preflight clean; SQL planning may be drafted (still no apply)."
    : "Resolve mapping/duplicate/gate/tag blockers first; do not draft SQL until all_ready_for_sql_plan is true.";

  return {
    report_name: "buckparts_amazon_multipack_conversion_batch_preflight_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    candidates,
    all_ready_for_sql_plan: allReadyForSqlPlan,
    known_unknowns: [
      ...knownUnknowns,
      ...(amazonTagVerified === null ? ["Amazon tag verification status unknown."] : []),
    ],
    recommended_next_action: recommendedNextAction,
  };
}

export async function main(): Promise<void> {
  const report = await buildAmazonMultipackConversionBatchPreflightReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[preflight-amazon-multipack-conversion-batch] failed", error);
    process.exit(1);
  });
}
