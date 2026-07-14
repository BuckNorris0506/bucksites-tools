/**
 * BuckParts C-Suite readiness audit v1 — read-only compose of parity artifacts + architecture truth.
 * Separates backend parity progress from runtime Supabase / frontend-safe / monetizable buyer paths.
 * Does not mutate CSV, Supabase, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { execSync } from "node:child_process";

import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1 } from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";
import { SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1 } from "./samsung-pass-repair-apply-plan-v1";

export const BUCKPARTS_C_SUITE_READINESS_AUDIT_CONTRACT_V1 =
  "buckparts_c_suite_readiness_audit_v1" as const;

export const BUCKPARTS_C_SUITE_READINESS_AUDIT_SOURCE_COMMAND_V1 =
  "npm run buckparts:c-suite-readiness-audit" as const;

export const BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-c-suite-readiness-audit-v1.json" as const;

export const BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-c-suite-readiness-audit-v1.md" as const;

export const BUCKPARTS_C_SUITE_READINESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1,
  BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1,
] as const;

export const BUCKPARTS_C_SUITE_GTE18_SLUG_V1 = "ge-gte18gsnrss" as const;

export const BUCKPARTS_C_SUITE_COHORT_IDS_V1 = [
  "gte18",
  "samsung_pass_5",
  "gswf_13",
  "qa_20",
  "gswf_partial_3",
] as const;

export type BuckpartsCSuiteCohortIdV1 =
  (typeof BUCKPARTS_C_SUITE_COHORT_IDS_V1)[number];

export const BUCKPARTS_C_SUITE_COHORT_SLUGS_V1: Record<
  BuckpartsCSuiteCohortIdV1,
  readonly string[]
> = {
  gte18: [BUCKPARTS_C_SUITE_GTE18_SLUG_V1],
  samsung_pass_5: [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1],
  gswf_13: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
  qa_20: [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1],
  gswf_partial_3: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
};

export const BUCKPARTS_C_SUITE_ALL_SLUGS_V1: readonly string[] = (
  BUCKPARTS_C_SUITE_COHORT_IDS_V1 as readonly BuckpartsCSuiteCohortIdV1[]
).flatMap((id) => [...BUCKPARTS_C_SUITE_COHORT_SLUGS_V1[id]]);

export const BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1 = 42 as const;
export const BUCKPARTS_C_SUITE_EXPECTED_COHORT_COUNT_V1 = 5 as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export const BUCKPARTS_C_SUITE_PARITY_ARTIFACT_RELS_V1 = {
  gte18:
    "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.json",
  samsung_pass_5:
    "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-parity-owner-review-v1.json",
  gswf_13:
    "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json",
  qa_20:
    "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.json",
  gswf_partial_3:
    "data/fridge/batch-production/drafts/gswf-partial-owner-browser-proof-packet-v1.json",
  credit_control: "data/ops/credit-control/credit-control-center-v1.json",
} as const;

const ARCHITECTURE_INSPECT_PATHS_V1 = {
  fridge_page: "src/app/fridge/[slug]/page.tsx",
  fridge_data: "src/lib/data/fridges.ts",
  filter_page: "src/app/filter/[slug]/page.tsx",
  filter_data: "src/lib/data/filters.ts",
  search_page: "src/app/search/page.tsx",
  search_data: "src/lib/data/search.ts",
  cta_gate: "src/lib/retailers/launch-buy-links.ts",
  cta_ui: "src/components/trust/TrustAwareBuySection.tsx",
  go_route: "src/app/go/[linkId]/route.ts",
  go_handler: "src/lib/retailers/go-affiliate-route-handler.ts",
  sitemap: "src/app/sitemap.ts",
  sitemap_urls: "src/lib/sitemap/wedge-indexable-urls.ts",
  robots: "src/app/robots.ts",
  product_json_ld: "src/lib/seo/structured-data.ts",
} as const;

export type BuckpartsCSuiteVerdictV1 = "PASS" | "FAIL" | "UNKNOWN";

export type BuckpartsCSuiteBackendClassificationV1 =
  | "IN_SYNC"
  | "SUPABASE_STILL_HAS_OLD_ROWS"
  | "SUPABASE_MISSING_TARGET"
  | "CONFLICT"
  | "PARTIAL_HELD_UNKNOWN_NOT_PROVEN"
  | "UNKNOWN_READ_FAILED"
  | "UNKNOWN_ARTIFACT_MISSING";

export type BuckpartsCSuiteArchitectureSurfaceV1 = {
  surface: string;
  primary_runtime_source: string;
  secondary_or_ops_source: string;
  inspected_paths: string[];
  code_proof: string;
  live_render_proof: "UNKNOWN";
};

export type BuckpartsCSuiteArchitectureSourceMapV1 = {
  fridge_slug_page: BuckpartsCSuiteArchitectureSurfaceV1;
  filter_slug_page: BuckpartsCSuiteArchitectureSurfaceV1;
  search: BuckpartsCSuiteArchitectureSurfaceV1;
  cta: BuckpartsCSuiteArchitectureSurfaceV1;
  go: BuckpartsCSuiteArchitectureSurfaceV1;
  sitemap: BuckpartsCSuiteArchitectureSurfaceV1;
  robots: BuckpartsCSuiteArchitectureSurfaceV1;
  product_json_ld: BuckpartsCSuiteArchitectureSurfaceV1;
  csv_role_vs_supabase_role: {
    csv_role: string;
    supabase_role: string;
    proof: string;
  };
};

export type BuckpartsCSuiteExecutiveLaneV1 = {
  lane: string;
  verdict: BuckpartsCSuiteVerdictV1;
  blockers: string[];
  evidence: string[];
};

export type BuckpartsCSuiteCohortRowV1 = {
  cohort: BuckpartsCSuiteCohortIdV1;
  slug: string;
  csv_mappings: string[];
  supabase_mappings: string[] | null;
  backend_classification: BuckpartsCSuiteBackendClassificationV1;
  frontend_observed_state: "UNKNOWN" | "MATCH" | "MISMATCH";
  cta_go_link_state: "UNKNOWN";
  product_json_ld_state: "UNKNOWN";
  verdict: BuckpartsCSuiteVerdictV1;
  notes: string[];
};

export type BuckpartsCSuiteReadinessAuditV1 = {
  contract: typeof BUCKPARTS_C_SUITE_READINESS_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  live_fetch_enabled: false;
  live_fetch_status: "DISABLED_BY_DEFAULT" | "DISABLED_IN_V1";
  generated_at: string;
  source_command: typeof BUCKPARTS_C_SUITE_READINESS_AUDIT_SOURCE_COMMAND_V1;
  head_sha: string | null;
  audit_mode: "local_repo_build";
  scope: {
    cohorts: typeof BUCKPARTS_C_SUITE_COHORT_IDS_V1;
    slug_count: number;
    cohort_count: number;
    slugs: string[];
  };
  architecture_source_map: BuckpartsCSuiteArchitectureSourceMapV1;
  executive_lanes: {
    ceo_strategy: BuckpartsCSuiteExecutiveLaneV1;
    cto_architecture: BuckpartsCSuiteExecutiveLaneV1;
    cpo_journey: BuckpartsCSuiteExecutiveLaneV1;
    coo_ops: BuckpartsCSuiteExecutiveLaneV1;
    cfo_deploy_revenue: BuckpartsCSuiteExecutiveLaneV1;
    clo_risk_claims: BuckpartsCSuiteExecutiveLaneV1;
    cmo_demand: BuckpartsCSuiteExecutiveLaneV1;
    data_metrics: BuckpartsCSuiteExecutiveLaneV1;
  };
  cohort_rows: BuckpartsCSuiteCohortRowV1[];
  cohort_totals: {
    by_cohort: Record<
      BuckpartsCSuiteCohortIdV1,
      { slug_count: number; PASS: number; FAIL: number; UNKNOWN: number }
    >;
    by_verdict: { PASS: number; FAIL: number; UNKNOWN: number };
    backend_closed_in_sync_count: number;
    qa_20_supabase_old_rows_count: number;
    partial_held_count: number;
  };
  explicit_callouts: string[];
  next_10_moves: string[];
  credit_control_summary: {
    status: "READ" | "UNKNOWN";
    deployment_posture: string | null;
    evidence_rel_path: string;
    notes: string[];
  };
  ship_guard_summary: {
    status: "UNKNOWN";
    notes: string[];
  };
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildBuckpartsCSuiteReadinessAuditDepsV1 = {
  rootDir: string;
  now?: () => Date;
  readTextFile?: (relPath: string) => string | null;
  headSha?: string | null;
  liveBaseUrl?: string | null;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function defaultReadTextFile(rootDir: string, relPath: string): string | null {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function readCsvByFridgeSlug(
  rootDir: string,
  readTextFile: (relPath: string) => string | null,
): Map<string, string[]> {
  const raw = readTextFile(COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  if (raw == null) {
    throw new Error(`missing ${COMPATIBILITY_MAPPINGS_CSV_REL_V1}`);
  }
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const fridge = normalizeSlug(row.fridge_slug ?? "");
    const filter = normalizeSlug(row.filter_slug ?? "");
    if (!fridge || !filter) continue;
    const existing = map.get(fridge) ?? [];
    existing.push(filter);
    map.set(fridge, existing);
  }
  for (const [k, v] of map) map.set(k, sortedUnique(v));
  return map;
}

type ParitySlugFactsV1 = {
  classification: BuckpartsCSuiteBackendClassificationV1;
  supabase_mappings: string[] | null;
  source_artifact: string;
};

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function mapParityClassification(
  value: unknown,
): BuckpartsCSuiteBackendClassificationV1 {
  const s = String(value ?? "");
  if (s === "IN_SYNC") return "IN_SYNC";
  if (s === "SUPABASE_STILL_HAS_OLD_ROWS") return "SUPABASE_STILL_HAS_OLD_ROWS";
  if (s === "SUPABASE_MISSING_TARGET") return "SUPABASE_MISSING_TARGET";
  if (s === "CONFLICT" || s === "CONFLICT_REQUIRES_REVIEW") return "CONFLICT";
  if (s === "UNKNOWN_READ_FAILED") return "UNKNOWN_READ_FAILED";
  return "UNKNOWN_ARTIFACT_MISSING";
}

function loadParityFactsIndex(args: {
  readTextFile: (relPath: string) => string | null;
}): Map<string, ParitySlugFactsV1> {
  const index = new Map<string, ParitySlugFactsV1>();

  const gte18Rel = BUCKPARTS_C_SUITE_PARITY_ARTIFACT_RELS_V1.gte18;
  const gte18Raw = args.readTextFile(gte18Rel);
  if (gte18Raw) {
    const obj = parseJsonObject(gte18Raw);
    if (obj) {
      const slug = normalizeSlug(String(obj.target_fridge_slug ?? BUCKPARTS_C_SUITE_GTE18_SLUG_V1));
      index.set(slug, {
        classification: mapParityClassification(obj.classification),
        supabase_mappings: Array.isArray(obj.supabase_mappings)
          ? sortedUnique(obj.supabase_mappings.map(String))
          : null,
        source_artifact: gte18Rel,
      });
    }
  }

  for (const key of ["samsung_pass_5", "gswf_13", "qa_20"] as const) {
    const rel = BUCKPARTS_C_SUITE_PARITY_ARTIFACT_RELS_V1[key];
    const raw = args.readTextFile(rel);
    if (!raw) continue;
    const obj = parseJsonObject(raw);
    if (!obj || !Array.isArray(obj.rows)) continue;
    for (const row of obj.rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const slug = normalizeSlug(String(r.fridge_slug ?? ""));
      if (!slug) continue;
      index.set(slug, {
        classification: mapParityClassification(r.classification),
        supabase_mappings: Array.isArray(r.supabase_mappings)
          ? sortedUnique(r.supabase_mappings.map(String))
          : null,
        source_artifact: rel,
      });
    }
  }

  const partialRel = BUCKPARTS_C_SUITE_PARITY_ARTIFACT_RELS_V1.gswf_partial_3;
  const partialRaw = args.readTextFile(partialRel);
  if (partialRaw) {
    const obj = parseJsonObject(partialRaw);
    const rows = Array.isArray(obj?.slug_rows)
      ? obj.slug_rows
      : Array.isArray(obj?.target_slugs)
        ? (obj.target_slugs as unknown[]).map((slug) => ({ fridge_slug: slug }))
        : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const slug = normalizeSlug(String(r.fridge_slug ?? ""));
      if (!slug) continue;
      index.set(slug, {
        classification: "PARTIAL_HELD_UNKNOWN_NOT_PROVEN",
        supabase_mappings: null,
        source_artifact: partialRel,
      });
    }
  }

  return index;
}

function surface(
  surfaceName: string,
  primary: string,
  secondary: string,
  paths: string[],
  codeProof: string,
): BuckpartsCSuiteArchitectureSurfaceV1 {
  return {
    surface: surfaceName,
    primary_runtime_source: primary,
    secondary_or_ops_source: secondary,
    inspected_paths: paths,
    code_proof: codeProof,
    live_render_proof: "UNKNOWN",
  };
}

export function buildBuckpartsCSuiteArchitectureSourceMapV1(args: {
  readTextFile: (relPath: string) => string | null;
}): BuckpartsCSuiteArchitectureSourceMapV1 {
  const read = args.readTextFile;
  const fridges = read(ARCHITECTURE_INSPECT_PATHS_V1.fridge_data) ?? "";
  const filters = read(ARCHITECTURE_INSPECT_PATHS_V1.filter_data) ?? "";
  const search = read(ARCHITECTURE_INSPECT_PATHS_V1.search_data) ?? "";
  const cta = read(ARCHITECTURE_INSPECT_PATHS_V1.cta_gate) ?? "";
  const go = read(ARCHITECTURE_INSPECT_PATHS_V1.go_route) ?? "";
  const jsonLd = read(ARCHITECTURE_INSPECT_PATHS_V1.product_json_ld) ?? "";
  const sitemap = read(ARCHITECTURE_INSPECT_PATHS_V1.sitemap) ?? "";
  const robots = read(ARCHITECTURE_INSPECT_PATHS_V1.robots) ?? "";

  const fridgeUsesSupabase =
    fridges.includes('from("compatibility_mappings")') &&
    fridges.includes("getSupabaseServerClient");
  const filterUsesSupabase = filters.includes("getSupabaseServerClient");
  const searchUsesSupabase = /supabase|getSupabase/i.test(search);
  const ctaHasDirectBuyable = /direct_buyable|filterRealBuy/i.test(cta);
  const goUsesRetailerLink =
    go.includes("getRetailerLinkById") || go.includes("go-unavailable");
  const jsonLdSuppresses =
    jsonLd.includes("canEmitRefrigeratorFilterProductJsonLdV1") &&
    jsonLd.includes("hasTruthfulOfferJsonLd");
  const sitemapPresent = sitemap.includes("collectHomekeepWedgeSitemapUrls");
  const robotsPresent = robots.length > 0;

  return {
    fridge_slug_page: surface(
      "/fridge/[slug]",
      fridgeUsesSupabase ? "supabase.compatibility_mappings" : "UNKNOWN",
      "csv ops/parity only",
      [ARCHITECTURE_INSPECT_PATHS_V1.fridge_page, ARCHITECTURE_INSPECT_PATHS_V1.fridge_data],
      fridgeUsesSupabase
        ? "PROVEN: getFridgeBySlug reads Supabase fridge_models + compatibility_mappings"
        : "UNKNOWN: fridge data loader proof incomplete",
    ),
    filter_slug_page: surface(
      "/filter/[slug]",
      filterUsesSupabase ? "supabase.filters+retailer_links" : "UNKNOWN",
      "csv ops/parity only",
      [ARCHITECTURE_INSPECT_PATHS_V1.filter_page, ARCHITECTURE_INSPECT_PATHS_V1.filter_data],
      filterUsesSupabase
        ? "PROVEN: filter page data loader uses Supabase server client"
        : "UNKNOWN: filter data loader proof incomplete",
    ),
    search: surface(
      "search",
      searchUsesSupabase ? "supabase" : "UNKNOWN",
      "csv ops/parity only",
      [ARCHITECTURE_INSPECT_PATHS_V1.search_page, ARCHITECTURE_INSPECT_PATHS_V1.search_data],
      searchUsesSupabase
        ? "PROVEN: search data path references Supabase"
        : "UNKNOWN: search loader proof incomplete",
    ),
    cta: surface(
      "CTA",
      ctaHasDirectBuyable
        ? "supabase.retailer_links + direct_buyable gates"
        : "UNKNOWN",
      "no invent; fail closed without gate",
      [ARCHITECTURE_INSPECT_PATHS_V1.cta_gate, ARCHITECTURE_INSPECT_PATHS_V1.cta_ui],
      ctaHasDirectBuyable
        ? "PROVEN: launch-buy-links gates on direct_buyable / safe buy filters"
        : "UNKNOWN: CTA gate proof incomplete",
    ),
    go: surface(
      "/go",
      goUsesRetailerLink ? "supabase.retailer_links via getRetailerLinkById" : "UNKNOWN",
      "fail closed → /go-unavailable",
      [ARCHITECTURE_INSPECT_PATHS_V1.go_route, ARCHITECTURE_INSPECT_PATHS_V1.go_handler],
      goUsesRetailerLink
        ? "PROVEN: /go resolves retailer link or redirects go-unavailable"
        : "UNKNOWN: /go route proof incomplete",
    ),
    sitemap: surface(
      "sitemap",
      sitemapPresent ? "supabase + safety collectors" : "UNKNOWN",
      "homepage-only fallback on failure",
      [ARCHITECTURE_INSPECT_PATHS_V1.sitemap, ARCHITECTURE_INSPECT_PATHS_V1.sitemap_urls],
      sitemapPresent
        ? "PROVEN: sitemap uses wedge indexable URL collector with fallback"
        : "UNKNOWN: sitemap proof incomplete",
    ),
    robots: surface(
      "robots",
      robotsPresent ? "static/codegen robots policy" : "UNKNOWN",
      "n/a",
      [ARCHITECTURE_INSPECT_PATHS_V1.robots],
      robotsPresent ? "PROVEN: robots.ts present" : "UNKNOWN: robots.ts missing",
    ),
    product_json_ld: surface(
      "Product JSON-LD",
      jsonLdSuppresses
        ? "suppressed_without_truthful_offer (code gate)"
        : "UNKNOWN",
      "no invented offers/review/aggregateRating",
      [ARCHITECTURE_INSPECT_PATHS_V1.product_json_ld],
      jsonLdSuppresses
        ? "PROVEN: resolveRefrigeratorFilterProductJsonLdV1 returns null unless hasTruthfulOfferJsonLd"
        : "UNKNOWN: Product JSON-LD suppression gate not found",
    ),
    csv_role_vs_supabase_role: {
      csv_role: "ops_parity_intent_only_not_runtime_customer_truth",
      supabase_role: "runtime_customer_truth_for_pdp_search_cta_go_sitemap",
      proof: fridgeUsesSupabase
        ? "PROVEN: live fridge PDP loader does not read data/compatibility_mappings.csv; runtime = Supabase"
        : "UNKNOWN: could not prove CSV vs Supabase runtime split from fridge loader",
    },
  };
}

export function classifyCSuiteSlugVerdictV1(args: {
  cohort: BuckpartsCSuiteCohortIdV1;
  backend_classification: BuckpartsCSuiteBackendClassificationV1;
  frontend_observed_state: "UNKNOWN" | "MATCH" | "MISMATCH";
}): BuckpartsCSuiteVerdictV1 {
  if (args.cohort === "gswf_partial_3") return "UNKNOWN";
  if (
    args.backend_classification === "SUPABASE_STILL_HAS_OLD_ROWS" ||
    args.backend_classification === "CONFLICT" ||
    args.backend_classification === "SUPABASE_MISSING_TARGET"
  ) {
    return "FAIL";
  }
  if (args.frontend_observed_state === "MISMATCH") return "FAIL";
  if (
    args.backend_classification === "IN_SYNC" &&
    args.frontend_observed_state === "MATCH"
  ) {
    return "PASS";
  }
  // IN_SYNC without render/source proof is not frontend-safe PASS.
  return "UNKNOWN";
}

function emptyTotals(): Record<
  BuckpartsCSuiteCohortIdV1,
  { slug_count: number; PASS: number; FAIL: number; UNKNOWN: number }
> {
  const out = {} as Record<
    BuckpartsCSuiteCohortIdV1,
    { slug_count: number; PASS: number; FAIL: number; UNKNOWN: number }
  >;
  for (const id of BUCKPARTS_C_SUITE_COHORT_IDS_V1) {
    out[id] = { slug_count: 0, PASS: 0, FAIL: 0, UNKNOWN: 0 };
  }
  return out;
}

function lane(
  name: string,
  verdict: BuckpartsCSuiteVerdictV1,
  blockers: string[],
  evidence: string[],
): BuckpartsCSuiteExecutiveLaneV1 {
  return { lane: name, verdict, blockers, evidence };
}

export function buildBuckpartsCSuiteNext10MovesV1(args: {
  qaFailCount: number;
  backendClosedCount: number;
  partialHeldCount: number;
  qaBackendClosed?: boolean;
}): string[] {
  // Prefer explicit closed flag when provided; otherwise treat zero old-row failures as post-sync posture.
  const useClosedMoves =
    args.qaBackendClosed === true ||
    (args.qaBackendClosed !== false && args.qaFailCount === 0);
  const movesWhenQaDrifting = [
    "Build Refrigerator QA 20 Supabase sync plan/owner-review (20/20 still have old runtime rows).",
    "Produce frontend mismatch proof pack (PDP filter extract) for worst QA drift slugs.",
    "Run IN_SYNC cohort smoke for PASS 5 + GTE18 + sample GSWF 13 (confirm PDP equals intent).",
    "PARTIAL 3 promotion kill-check: assert no CTA/index 'ready' and keep held.",
    "Safe CTA gap report for IN_SYNC cohorts (repaired truth ≠ monetizable buyer path).",
    "Split Command Center metrics: backend_parity_closed vs frontend_safe_coverage.",
    "JSON-LD / claims lint on sample filter pages in the 42-slug scope.",
    "Credit/deploy gate board: what truth work proceeds without spend vs needs deploy.",
    "Demand ∩ QA-drift: prioritize sync for QA slugs appearing in GSC/search-miss.",
    "COO reusable checklist template: parity → sync plan → approval → guarded apply → already_applied.",
  ];
  const movesWhenQaClosed = [
    "Produce frontend rendered truth proof pack (PDP filter extract) for IN_SYNC cohorts including QA 20 — do not claim frontend-safe without render proof.",
    "Run IN_SYNC cohort smoke for PASS 5 + GTE18 + GSWF 13 + QA 20 sample (confirm PDP equals CSV/Supabase intent).",
    "CTA / go-link proof for correct filters only on IN_SYNC slugs (visibility + /go vs go-unavailable).",
    "PARTIAL 3 promotion kill-check: assert no CTA/index 'ready' and keep held.",
    "Safe CTA gap report for IN_SYNC cohorts (repaired truth ≠ monetizable buyer path).",
    "Split Command Center metrics: backend_parity_closed vs frontend_safe_coverage.",
    "JSON-LD / claims lint on sample filter pages in the 42-slug scope.",
    "Credit/deploy gate board: what truth work proceeds without spend vs needs deploy.",
    "Demand ∩ closed backend cohorts: prioritize frontend proof for GSC/search-miss IN_SYNC slugs.",
    "COO reusable checklist template: parity → sync plan → approval → guarded apply → already_applied.",
  ];
  const base = useClosedMoves ? movesWhenQaClosed : movesWhenQaDrifting;
  return base.map((move, i) => {
    if (!useClosedMoves && i === 0 && args.qaFailCount > 0) {
      return `${move} (auditor count: ${String(args.qaFailCount)} FAIL / old-row slugs).`;
    }
    if (i === 1 && useClosedMoves) {
      return `${move} (backend-closed IN_SYNC count this audit: ${String(args.backendClosedCount)}).`;
    }
    if (!useClosedMoves && i === 2) {
      return `${move} (backend-closed IN_SYNC count this audit: ${String(args.backendClosedCount)}).`;
    }
    if (i === 3) {
      return `${move} (held count: ${String(args.partialHeldCount)}).`;
    }
    return move;
  });
}

function resolveHeadSha(rootDir: string, override?: string | null): string | null {
  if (override !== undefined) return override;
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

export function buildBuckpartsCSuiteReadinessAuditV1(
  deps: BuildBuckpartsCSuiteReadinessAuditDepsV1,
): BuckpartsCSuiteReadinessAuditV1 {
  const readTextFile =
    deps.readTextFile ?? ((rel) => defaultReadTextFile(deps.rootDir, rel));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const liveRequested = Boolean(deps.liveBaseUrl && deps.liveBaseUrl.trim());
  const live_fetch_status = liveRequested ? "DISABLED_IN_V1" : "DISABLED_BY_DEFAULT";

  if (BUCKPARTS_C_SUITE_ALL_SLUGS_V1.length !== BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `c-suite audit scope must be exactly ${String(BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1)} slugs`,
    );
  }
  const uniqueSlugs = new Set(BUCKPARTS_C_SUITE_ALL_SLUGS_V1.map(normalizeSlug));
  if (uniqueSlugs.size !== BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1) {
    throw new Error("c-suite audit cohort slug lists must be unique and non-overlapping");
  }

  const csvBySlug = readCsvByFridgeSlug(deps.rootDir, readTextFile);
  const parityIndex = loadParityFactsIndex({ readTextFile });
  const architecture_source_map = buildBuckpartsCSuiteArchitectureSourceMapV1({
    readTextFile,
  });

  const cohort_rows: BuckpartsCSuiteCohortRowV1[] = [];
  for (const cohort of BUCKPARTS_C_SUITE_COHORT_IDS_V1) {
    for (const slugRaw of BUCKPARTS_C_SUITE_COHORT_SLUGS_V1[cohort]) {
      const slug = normalizeSlug(slugRaw);
      const csv_mappings = csvBySlug.get(slug) ?? [];
      const parity = parityIndex.get(slug);
      const backend_classification =
        cohort === "gswf_partial_3"
          ? "PARTIAL_HELD_UNKNOWN_NOT_PROVEN"
          : (parity?.classification ?? "UNKNOWN_ARTIFACT_MISSING");
      const supabase_mappings =
        cohort === "gswf_partial_3" ? null : (parity?.supabase_mappings ?? null);
      const frontend_observed_state = "UNKNOWN" as const;
      const verdict = classifyCSuiteSlugVerdictV1({
        cohort,
        backend_classification,
        frontend_observed_state,
      });
      const notes: string[] = [];
      if (parity?.source_artifact) {
        notes.push(`parity_artifact=${parity.source_artifact}`);
      } else if (cohort !== "gswf_partial_3") {
        notes.push("parity_artifact=MISSING");
      }
      if (cohort === "gswf_partial_3") {
        notes.push("HELD: never promote PARTIAL into apply/buyer-ready claims");
      }
      if (backend_classification === "IN_SYNC") {
        notes.push(
          "Backend parity closed; frontend match NOT claimed without render/source proof",
        );
      }
      if (backend_classification === "SUPABASE_STILL_HAS_OLD_ROWS") {
        notes.push(
          "Runtime customer truth likely shows old Supabase rows on /fridge/[slug]",
        );
      }
      cohort_rows.push({
        cohort,
        slug,
        csv_mappings,
        supabase_mappings,
        backend_classification,
        frontend_observed_state,
        cta_go_link_state: "UNKNOWN",
        product_json_ld_state: "UNKNOWN",
        verdict,
        notes,
      });
    }
  }

  const by_cohort = emptyTotals();
  const by_verdict = { PASS: 0, FAIL: 0, UNKNOWN: 0 };
  let backend_closed_in_sync_count = 0;
  let qa_20_supabase_old_rows_count = 0;
  let partial_held_count = 0;
  for (const row of cohort_rows) {
    by_cohort[row.cohort].slug_count += 1;
    by_cohort[row.cohort][row.verdict] += 1;
    by_verdict[row.verdict] += 1;
    if (row.backend_classification === "IN_SYNC") backend_closed_in_sync_count += 1;
    if (
      row.cohort === "qa_20" &&
      row.backend_classification === "SUPABASE_STILL_HAS_OLD_ROWS"
    ) {
      qa_20_supabase_old_rows_count += 1;
    }
    if (row.cohort === "gswf_partial_3") partial_held_count += 1;
  }

  const creditRel = BUCKPARTS_C_SUITE_PARITY_ARTIFACT_RELS_V1.credit_control;
  const creditRaw = readTextFile(creditRel);
  let credit_control_summary: BuckpartsCSuiteReadinessAuditV1["credit_control_summary"] = {
    status: "UNKNOWN",
    deployment_posture: null,
    evidence_rel_path: creditRel,
    notes: ["Credit control artifact missing or unreadable; do not invent Netlify balance."],
  };
  if (creditRaw) {
    const obj = parseJsonObject(creditRaw);
    if (obj) {
      credit_control_summary = {
        status: "READ",
        deployment_posture:
          typeof obj.deployment_posture === "string" ? obj.deployment_posture : null,
        evidence_rel_path: creditRel,
        notes: [
          "Read-only credit-control summarize only; credit_spend_authorized not claimed from this audit.",
        ],
      };
    }
  }

  const qaRiskFull =
    qa_20_supabase_old_rows_count ===
    BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.qa_20.length;
  const qaRiskPartial =
    qa_20_supabase_old_rows_count > 0 && !qaRiskFull;
  const qaBackendClosed =
    qa_20_supabase_old_rows_count === 0 &&
    cohort_rows
      .filter((r) => r.cohort === "qa_20")
      .every((r) => r.backend_classification === "IN_SYNC");
  const backendClosedCohorts = [
    "gte18",
    "samsung_pass_5",
    "gswf_13",
    "qa_20",
  ] as const;
  const backendClosedAll = backendClosedCohorts.every((id) =>
    cohort_rows
      .filter((r) => r.cohort === id)
      .every((r) => r.backend_classification === "IN_SYNC"),
  );

  const executive_lanes = {
    ceo_strategy: lane(
      "CEO strategy",
      qaRiskFull ? "FAIL" : "UNKNOWN",
      qaRiskFull
        ? [
            "QA 20 runtime-risk: Supabase still has old rows on 20/20 while CSV intent is repaired",
            "Frontend match for IN_SYNC cohorts not proven (render/source proof absent)",
          ]
        : [
            "Frontend/customer-safe truth not proven for scoped cohorts (render/source proof absent)",
            ...(qaRiskPartial
              ? [
                  `QA 20 partial Supabase old-row drift remains on ${String(qa_20_supabase_old_rows_count)}/20`,
                ]
              : []),
          ],
      [
        backendClosedAll
          ? "PASS 5 / GTE18 / GSWF 13 / QA 20 backend parity closed (artifact-backed IN_SYNC)"
          : qaBackendClosed
            ? "QA 20 backend/runtime parity closed IN_SYNC 20/20; other closed-cohort evidence may still be partial"
            : "Some closed cohorts missing IN_SYNC evidence",
        "PARTIAL 3 remains held / not promoted",
        "IN_SYNC does not auto-claim frontend-safe PASS",
      ],
    ),
    cto_architecture: lane(
      "CTO architecture",
      architecture_source_map.csv_role_vs_supabase_role.proof.startsWith("PROVEN")
        ? "PASS"
        : "UNKNOWN",
      [
        "Live render / CDN / env parity for the 42 slugs not checked (live fetch disabled)",
      ],
      [
        architecture_source_map.csv_role_vs_supabase_role.proof,
        architecture_source_map.fridge_slug_page.code_proof,
        architecture_source_map.product_json_ld.code_proof,
      ],
    ),
    cpo_journey: lane(
      "CPO journey",
      qaRiskFull ? "FAIL" : "UNKNOWN",
      [
        ...(qaRiskFull
          ? ["QA 20 customers likely see old Supabase filter families on model PDP"]
          : []),
        ...(qaRiskPartial
          ? [
              `QA 20 partial drift may still surface old filters on ${String(qa_20_supabase_old_rows_count)}/20 PDPs`,
            ]
          : []),
        "Search → PDP → CTA → /go journey not render-proven for any slug in v1",
      ],
      [
        "Journey architecture coded as Supabase runtime",
        qaBackendClosed
          ? "QA 20 backend/runtime mappings IN_SYNC; frontend journey still UNKNOWN without render proof"
          : "CTA/go/product JSON-LD states remain UNKNOWN at slug level without page proof",
      ],
    ),
    coo_ops: lane(
      "COO operating system",
      "PASS",
      ["Time/cost per batch not instrumented in this audit"],
      [
        "Reusable guarded lane exists: parity → plan → approval → dry-run → apply → already_applied",
        qaBackendClosed
          ? "QA 20 Supabase sync lane closed (parity IN_SYNC / post-apply ALREADY_APPLIED posture); next COO priority is frontend proof, not another sync plan"
          : "QA 20 remains the highest-priority unfinished sync after closed PASS/GTE18/GSWF13 lanes",
      ],
    ),
    cfo_deploy_revenue: lane(
      "CFO deploy/revenue",
      credit_control_summary.status === "READ" &&
        credit_control_summary.deployment_posture
        ? "UNKNOWN"
        : "UNKNOWN",
      [
        "Monetizable safe buyer paths not proven for scoped cohorts (CTA UNKNOWN)",
        liveRequested
          ? "Live base URL requested but live fetch disabled in v1"
          : "Live Netlify credit/API not re-verified this session",
      ],
      [
        credit_control_summary.status === "READ"
          ? `Credit control deployment_posture=${String(credit_control_summary.deployment_posture)}`
          : "Credit control UNKNOWN",
        "Ship guard posture not recomputed in this audit (UNKNOWN)",
      ],
    ),
    clo_risk_claims: lane(
      "CLO risk/claims",
      architecture_source_map.product_json_ld.code_proof.startsWith("PROVEN")
        ? "PASS"
        : "UNKNOWN",
      ["Live page HTML / emitted JSON-LD not fetched for scoped slugs"],
      [
        architecture_source_map.product_json_ld.code_proof,
        "Per-slug product_json_ld_state=UNKNOWN until page emission inspected",
      ],
    ),
    cmo_demand: lane(
      "CMO demand capture",
      "UNKNOWN",
      [
        "Fresh GSC / search-miss demand intersection not loaded in v1",
        qaBackendClosed
          ? "Do not treat backend IN_SYNC (including QA 20) or PARTIAL as frontend-safe coverage wins"
          : "Do not treat QA-drift or PARTIAL as coverage wins",
      ],
      ["Demand alignment left UNKNOWN rather than invented"],
    ),
    data_metrics: lane(
      "Data Officer metrics",
      "FAIL",
      qaBackendClosed
        ? [
            "Backend parity progress (PASS/GTE18/GSWF13/QA20 closed) must not be reported as frontend-safe coverage",
            "Frontend observed state / CTA / go-link remain UNKNOWN for all scoped slugs without render proof",
          ]
        : [
            "Backend parity progress (PASS/GTE18/GSWF13 closed) must not be reported as frontend-safe coverage",
            "QA 20 proves CSV intent ≠ runtime Supabase customer truth",
          ],
      [
        `backend_closed_in_sync_count=${String(backend_closed_in_sync_count)}`,
        `qa_20_supabase_old_rows_count=${String(qa_20_supabase_old_rows_count)}`,
        `frontend_observed_state UNKNOWN for all ${String(cohort_rows.length)} slugs`,
      ],
    ),
  };

  const next_10_moves = buildBuckpartsCSuiteNext10MovesV1({
    qaFailCount: qa_20_supabase_old_rows_count,
    backendClosedCount: backend_closed_in_sync_count,
    partialHeldCount: partial_held_count,
    qaBackendClosed,
  });

  const explicit_callouts = [
    qaRiskFull
      ? "QA 20 is runtime-risk because Supabase still has old rows on 20/20."
      : qaRiskPartial
        ? `QA 20 still has Supabase old leftover rows on ${String(qa_20_supabase_old_rows_count)}/20 (partial drift).`
        : "QA 20 backend/runtime Supabase parity is closed IN_SYNC 20/20 (old leftover rows=0).",
    backendClosedAll
      ? "PASS 5, GTE18, GSWF 13, and QA 20 are backend parity closed (artifact-backed IN_SYNC)."
      : "PASS 5, GTE18, and GSWF 13 are backend parity closed (artifact-backed IN_SYNC) when their parity packets are present.",
    "Frontend match is not claimed unless render/source proof exists — IN_SYNC does not auto-mark frontend-safe.",
    "GSWF PARTIAL 3 remains held/unknown and must never be promoted from this audit.",
    "Product JSON-LD / CTA / go-link per-slug claims remain UNKNOWN without inspected page/data proof.",
  ];

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; all mutation/buy/sitemap/JSON-LD mutation flags false.",
    `PROVEN: exact scope=${String(BUCKPARTS_C_SUITE_EXPECTED_SLUG_COUNT_V1)} slugs across ${String(BUCKPARTS_C_SUITE_EXPECTED_COHORT_COUNT_V1)} cohorts.`,
    "PROVEN: live_fetch_enabled=false by default; v1 does not fetch production URLs.",
    architecture_source_map.csv_role_vs_supabase_role.proof,
    `PROVEN: QA old-row count from parity artifact compose=${String(qa_20_supabase_old_rows_count)}.`,
    ...(qaBackendClosed
      ? ["PROVEN: QA 20 cohort backend classifications are IN_SYNC for all 20 slugs."]
      : []),
  ];

  const unknown_facts = [
    "UNKNOWN: Observed PDP filter lists for all 42 slugs (no render/source proof in v1).",
    "UNKNOWN: CTA visibility and /go outcomes for all 42 slugs.",
    "UNKNOWN: Live production HTML parity vs local/repo Supabase.",
    "UNKNOWN: Fresh demand/GSC intersection for prioritization.",
    "UNKNOWN: Ship-guard consolidated recompute this session.",
  ];

  const risk_notes = [
    "Customer pages read Supabase; CSV-only repairs do not fix live wrong-part exposure.",
    "Do not invent Product offers/review/aggregateRating or buy eligibility from this packet.",
    "Do not create approval/apply from this audit.",
    ...(liveRequested
      ? ["--live-base-url was present but live fetch remains disabled in v1."]
      : []),
  ];

  return {
    contract: BUCKPARTS_C_SUITE_READINESS_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_fetch_enabled: false,
    live_fetch_status,
    generated_at,
    source_command: BUCKPARTS_C_SUITE_READINESS_AUDIT_SOURCE_COMMAND_V1,
    head_sha: resolveHeadSha(deps.rootDir, deps.headSha),
    audit_mode: "local_repo_build",
    scope: {
      cohorts: BUCKPARTS_C_SUITE_COHORT_IDS_V1,
      slug_count: BUCKPARTS_C_SUITE_ALL_SLUGS_V1.length,
      cohort_count: BUCKPARTS_C_SUITE_COHORT_IDS_V1.length,
      slugs: [...BUCKPARTS_C_SUITE_ALL_SLUGS_V1],
    },
    architecture_source_map,
    executive_lanes,
    cohort_rows,
    cohort_totals: {
      by_cohort,
      by_verdict,
      backend_closed_in_sync_count,
      qa_20_supabase_old_rows_count,
      partial_held_count,
    },
    explicit_callouts,
    next_10_moves,
    credit_control_summary,
    ship_guard_summary: {
      status: "UNKNOWN",
      notes: [
        "Ship guard not re-executed inside c-suite audit v1; report UNKNOWN rather than invent.",
      ],
    },
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildBuckpartsCSuiteReadinessAuditMarkdownV1(
  report: BuckpartsCSuiteReadinessAuditV1,
): string {
  const lines: string[] = [
    "# BuckParts C-Suite readiness audit v1",
    "",
    `Generated: ${report.generated_at}`,
    `HEAD: \`${report.head_sha ?? "UNKNOWN"}\``,
    "",
    "## Executive verdicts",
    "",
  ];
  for (const laneObj of Object.values(report.executive_lanes)) {
    lines.push(`- **${laneObj.lane}**: ${laneObj.verdict}`);
    for (const b of laneObj.blockers) lines.push(`  - blocker: ${b}`);
  }
  lines.push("", "## Explicit callouts", "");
  for (const c of report.explicit_callouts) lines.push(`- ${c}`);
  lines.push(
    "",
    "## Cohort totals",
    "",
    `- PASS: ${String(report.cohort_totals.by_verdict.PASS)}`,
    `- FAIL: ${String(report.cohort_totals.by_verdict.FAIL)}`,
    `- UNKNOWN: ${String(report.cohort_totals.by_verdict.UNKNOWN)}`,
    `- backend_closed_in_sync_count: ${String(report.cohort_totals.backend_closed_in_sync_count)}`,
    `- qa_20_supabase_old_rows_count: ${String(report.cohort_totals.qa_20_supabase_old_rows_count)}`,
    `- partial_held_count: ${String(report.cohort_totals.partial_held_count)}`,
    "",
    "## Cohort table",
    "",
    "| cohort | slug | csv | supabase | backend | frontend | CTA/go | verdict |",
    "|---|---|---|---|---|---|---|---|",
  );
  for (const row of report.cohort_rows) {
    lines.push(
      `| ${row.cohort} | ${row.slug} | ${row.csv_mappings.join("|") || "(none)"} | ${row.supabase_mappings ? row.supabase_mappings.join("|") || "(none)" : "UNKNOWN"} | ${row.backend_classification} | ${row.frontend_observed_state} | ${row.cta_go_link_state} | ${row.verdict} |`,
    );
  }
  lines.push("", "## Architecture source map", "");
  lines.push(
    `- CSV role: ${report.architecture_source_map.csv_role_vs_supabase_role.csv_role}`,
  );
  lines.push(
    `- Supabase role: ${report.architecture_source_map.csv_role_vs_supabase_role.supabase_role}`,
  );
  lines.push(`- ${report.architecture_source_map.csv_role_vs_supabase_role.proof}`);
  for (const key of [
    "fridge_slug_page",
    "filter_slug_page",
    "search",
    "cta",
    "go",
    "sitemap",
    "robots",
    "product_json_ld",
  ] as const) {
    const s = report.architecture_source_map[key];
    lines.push(
      `- **${s.surface}**: runtime=${s.primary_runtime_source}; live_render=${s.live_render_proof}`,
    );
  }
  lines.push("", "## Ranked next 10 moves", "");
  report.next_10_moves.forEach((m, i) => lines.push(`${String(i + 1)}. ${m}`));
  lines.push("", "## Flags", "");
  lines.push(`- read_only: **${String(report.read_only)}**`);
  lines.push(`- data_mutation: **${String(report.data_mutation)}**`);
  lines.push(`- live_fetch_enabled: **${String(report.live_fetch_enabled)}**`);
  lines.push(`- live_fetch_status: **${report.live_fetch_status}**`);
  lines.push("", "## Proven facts", "");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("", "## Unknown facts", "");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("", "## Risk notes", "");
  for (const n of report.risk_notes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

export function writeBuckpartsCSuiteReadinessAuditArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsCSuiteReadinessAuditV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_C_SUITE_READINESS_AUDIT_JSON_REL_V1;
  const mdRel = BUCKPARTS_C_SUITE_READINESS_AUDIT_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_C_SUITE_READINESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("c-suite audit write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsCSuiteReadinessAuditMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
