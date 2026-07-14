/**
 * Read-only fridge model PDP rendered truth proof pack v1.
 * Local data-path proof: Supabase backend mappings vs PDP loader + quarantine render set.
 * Does not mutate Supabase, CSV, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD.
 * Does not fetch production URLs. PARTIAL 3 explicitly excluded.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { getFridgeBySlug } from "@/lib/data/fridges";
import { resolveFridgeCustomerSafetyV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

import {
  tryLoadSupabaseCompatForModelV1,
  type SupabaseCompatLoadResultV1,
} from "./buckparts-page-factory-preflight-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_C_SUITE_COHORT_SLUGS_V1,
  BUCKPARTS_C_SUITE_GTE18_SLUG_V1,
} from "./buckparts-c-suite-readiness-audit-v1";
import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1 } from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";
import { SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1 } from "./samsung-pass-repair-apply-plan-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_rendered_truth_proof_pack_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-rendered-truth-proof-pack" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1 = [
  "gte18",
  "samsung_pass_5",
  "gswf_13",
  "qa_20",
] as const;

export type BuckpartsFridgePdpRenderedTruthCohortIdV1 =
  (typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1)[number];

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1: Record<
  BuckpartsFridgePdpRenderedTruthCohortIdV1,
  readonly string[]
> = {
  gte18: [BUCKPARTS_C_SUITE_GTE18_SLUG_V1],
  samsung_pass_5: [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1],
  gswf_13: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
  qa_20: [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1],
};

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1: readonly string[] =
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1.flatMap(
    (id) => BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1[id],
  );

export const BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1 = 39 as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type BuckpartsFridgePdpRenderedTruthClassificationV1 =
  | "MATCH"
  | "MISMATCH"
  | "UNKNOWN_RENDER"
  | "QUARANTINED_SUPPRESSED";

export type BuckpartsFridgePdpRenderedTruthSlugRowV1 = {
  cohort: BuckpartsFridgePdpRenderedTruthCohortIdV1;
  slug: string;
  backend_closed_cohort: true;
  partial_excluded: true;
  csv_mappings: string[];
  supabase_mappings: string[] | null;
  pdp_loader_mappings: string[] | null;
  rendered_filter_slugs: string[] | null;
  quarantine: boolean | null;
  quarantine_reason: string | null;
  classification: BuckpartsFridgePdpRenderedTruthClassificationV1;
  frontend_safe_promoted: boolean;
  only_in_supabase_vs_csv: string[];
  only_in_csv_vs_supabase: string[];
  only_in_supabase_vs_pdp: string[];
  only_in_pdp_vs_supabase: string[];
  notes: string[];
};

export type BuckpartsFridgePdpRenderedTruthProofPackV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  live_production_fetch_enabled: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_SOURCE_COMMAND_V1;
  scope: {
    cohorts: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1;
    slug_count: number;
    slugs: string[];
    excluded_partial_slugs: readonly string[];
  };
  summary: {
    MATCH: number;
    MISMATCH: number;
    UNKNOWN_RENDER: number;
    QUARANTINED_SUPPRESSED: number;
    frontend_safe_promoted_count: number;
    backend_closed_slug_count: number;
  };
  rows: BuckpartsFridgePdpRenderedTruthSlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildBuckpartsFridgePdpRenderedTruthProofDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadCsvByFridgeSlug?: () => Map<string, string[]>;
  loadSupabaseCompat?: (
    fridgeSlug: string,
  ) => Promise<SupabaseCompatLoadResultV1> | SupabaseCompatLoadResultV1;
  loadPdpFridgeFilters?: (
    fridgeSlug: string,
  ) => Promise<{ status: "CHECKED"; filter_slugs: string[] } | { status: "MISSING" | "UNKNOWN"; reason: string }>;
  resolveQuarantine?: (fridgeSlug: string) => {
    quarantine: boolean;
    reason: string | null;
  };
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function setsEqual(a: string[], b: string[]): boolean {
  return JSON.stringify(sortedUnique(a)) === JSON.stringify(sortedUnique(b));
}

function diffOnlyIn(left: string[], right: string[]): string[] {
  const rightSet = new Set(sortedUnique(right));
  return sortedUnique(left).filter((v) => !rightSet.has(v));
}

function defaultReadCsvByFridgeSlug(rootDir: string): Map<string, string[]> {
  const abs = path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  if (!existsSync(abs)) throw new Error(`missing ${COMPATIBILITY_MAPPINGS_CSV_REL_V1}`);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const fridge = normalizeSlug(row.fridge_slug ?? "");
    const filter = normalizeSlug(row.filter_slug ?? "");
    if (!fridge || !filter) continue;
    const list = map.get(fridge) ?? [];
    list.push(filter);
    map.set(fridge, list);
  }
  for (const [slug, filters] of map) map.set(slug, sortedUnique(filters));
  return map;
}

async function defaultLoadPdpFridgeFilters(
  fridgeSlug: string,
): Promise<{ status: "CHECKED"; filter_slugs: string[] } | { status: "MISSING" | "UNKNOWN"; reason: string }> {
  try {
    const { loadEnv } = await import("./load-env");
    loadEnv();
    const fridge = await getFridgeBySlug(fridgeSlug);
    if (!fridge) {
      return { status: "MISSING", reason: `getFridgeBySlug returned null for ${fridgeSlug}` };
    }
    return {
      status: "CHECKED",
      filter_slugs: sortedUnique(fridge.filters.map((f) => f.slug)),
    };
  } catch (err) {
    return {
      status: "UNKNOWN",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function defaultResolveQuarantine(
  fridgeSlug: string,
  rootDir: string,
): { quarantine: boolean; reason: string | null } {
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: fridgeSlug,
    rootDir,
  });
  return {
    quarantine: safety.quarantine === true,
    reason: safety.reason ?? safety.public_message,
  };
}

export function classifyFridgePdpRenderedTruthSlugV1(args: {
  cohort: BuckpartsFridgePdpRenderedTruthCohortIdV1;
  slug: string;
  csv_mappings: string[];
  supabase: SupabaseCompatLoadResultV1;
  pdp:
    | { status: "CHECKED"; filter_slugs: string[] }
    | { status: "MISSING" | "UNKNOWN"; reason: string };
  quarantine: { quarantine: boolean; reason: string | null };
}): BuckpartsFridgePdpRenderedTruthSlugRowV1 {
  const slug = normalizeSlug(args.slug);
  const csv_mappings = sortedUnique(args.csv_mappings);
  const notes: string[] = [
    "backend_closed_cohort=true; PARTIAL excluded from this pack",
    "frontend_safe_promoted requires local PDP-data-path MATCH (not live HTML/CTA/go proof)",
  ];

  if (args.supabase.status === "UNKNOWN_DB_UNAVAILABLE" || args.pdp.status !== "CHECKED") {
    return {
      cohort: args.cohort,
      slug,
      backend_closed_cohort: true,
      partial_excluded: true,
      csv_mappings,
      supabase_mappings:
        args.supabase.status === "CHECKED" ? sortedUnique(args.supabase.supabase_filter_slugs) : null,
      pdp_loader_mappings: args.pdp.status === "CHECKED" ? sortedUnique(args.pdp.filter_slugs) : null,
      rendered_filter_slugs: null,
      quarantine: args.quarantine.quarantine,
      quarantine_reason: args.quarantine.reason,
      classification: "UNKNOWN_RENDER",
      frontend_safe_promoted: false,
      only_in_supabase_vs_csv: [],
      only_in_csv_vs_supabase: [],
      only_in_supabase_vs_pdp: [],
      only_in_pdp_vs_supabase: [],
      notes: [
        ...notes,
        args.supabase.status === "UNKNOWN_DB_UNAVAILABLE"
          ? `supabase_read_failed: ${args.supabase.reason}`
          : `pdp_loader_failed: ${
              args.pdp.status === "CHECKED" ? "unexpected_checked" : args.pdp.reason
            }`,
      ],
    };
  }

  const supabase_mappings = sortedUnique(args.supabase.supabase_filter_slugs);
  const pdp_loader_mappings = sortedUnique(args.pdp.filter_slugs);
  const rendered_filter_slugs = args.quarantine.quarantine ? [] : [...pdp_loader_mappings];

  const only_in_supabase_vs_csv = diffOnlyIn(supabase_mappings, csv_mappings);
  const only_in_csv_vs_supabase = diffOnlyIn(csv_mappings, supabase_mappings);
  const only_in_supabase_vs_pdp = diffOnlyIn(supabase_mappings, pdp_loader_mappings);
  const only_in_pdp_vs_supabase = diffOnlyIn(pdp_loader_mappings, supabase_mappings);

  const csvEqualsSupabase = setsEqual(csv_mappings, supabase_mappings);
  const supabaseEqualsPdp = setsEqual(supabase_mappings, pdp_loader_mappings);

  if (args.quarantine.quarantine && pdp_loader_mappings.length > 0) {
    return {
      cohort: args.cohort,
      slug,
      backend_closed_cohort: true,
      partial_excluded: true,
      csv_mappings,
      supabase_mappings,
      pdp_loader_mappings,
      rendered_filter_slugs,
      quarantine: true,
      quarantine_reason: args.quarantine.reason,
      classification: "QUARANTINED_SUPPRESSED",
      frontend_safe_promoted: false,
      only_in_supabase_vs_csv,
      only_in_csv_vs_supabase,
      only_in_supabase_vs_pdp,
      only_in_pdp_vs_supabase,
      notes: [
        ...notes,
        "Quarantine suppresses customer-visible filters; mapping MATCH not promoted to frontend_safe",
      ],
    };
  }

  if (!csvEqualsSupabase || !supabaseEqualsPdp) {
    return {
      cohort: args.cohort,
      slug,
      backend_closed_cohort: true,
      partial_excluded: true,
      csv_mappings,
      supabase_mappings,
      pdp_loader_mappings,
      rendered_filter_slugs,
      quarantine: args.quarantine.quarantine,
      quarantine_reason: args.quarantine.reason,
      classification: "MISMATCH",
      frontend_safe_promoted: false,
      only_in_supabase_vs_csv,
      only_in_csv_vs_supabase,
      only_in_supabase_vs_pdp,
      only_in_pdp_vs_supabase,
      notes: [
        ...notes,
        !csvEqualsSupabase ? "CSV intent ≠ Supabase runtime mappings" : "CSV equals Supabase",
        !supabaseEqualsPdp
          ? "Supabase admin mappings ≠ getFridgeBySlug PDP loader mappings"
          : "Supabase equals PDP loader",
      ],
    };
  }

  // Local rendered set equals PDP loader mappings (quarantine false or already empty).
  if (!setsEqual(rendered_filter_slugs, pdp_loader_mappings)) {
    return {
      cohort: args.cohort,
      slug,
      backend_closed_cohort: true,
      partial_excluded: true,
      csv_mappings,
      supabase_mappings,
      pdp_loader_mappings,
      rendered_filter_slugs,
      quarantine: args.quarantine.quarantine,
      quarantine_reason: args.quarantine.reason,
      classification: "MISMATCH",
      frontend_safe_promoted: false,
      only_in_supabase_vs_csv,
      only_in_csv_vs_supabase,
      only_in_supabase_vs_pdp,
      only_in_pdp_vs_supabase,
      notes: [...notes, "Rendered set diverged from PDP loader unexpectedly"],
    };
  }

  return {
    cohort: args.cohort,
    slug,
    backend_closed_cohort: true,
    partial_excluded: true,
    csv_mappings,
    supabase_mappings,
    pdp_loader_mappings,
    rendered_filter_slugs,
    quarantine: args.quarantine.quarantine,
    quarantine_reason: args.quarantine.reason,
    classification: "MATCH",
    frontend_safe_promoted: true,
    only_in_supabase_vs_csv,
    only_in_csv_vs_supabase,
    only_in_supabase_vs_pdp,
    only_in_pdp_vs_supabase,
    notes: [
      ...notes,
      "PROMOTED mapping-layer frontend_safe: CSV=Supabase=PDP loader=rendered (local data-path only)",
      "Not claimed: live Netlify HTML, CTA visibility, or /go outcomes",
    ],
  };
}

export async function buildBuckpartsFridgeModelPdpRenderedTruthProofPackV1(
  deps: BuildBuckpartsFridgePdpRenderedTruthProofDepsV1,
): Promise<BuckpartsFridgePdpRenderedTruthProofPackV1> {
  if (
    BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1.length !==
    BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1
  ) {
    throw new Error(
      `rendered truth proof scope must be exactly ${String(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1)} slugs`,
    );
  }
  const unique = new Set(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1.map(normalizeSlug));
  if (unique.size !== BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1) {
    throw new Error("rendered truth proof slug lists must be unique/non-overlapping");
  }
  for (const partial of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    if (unique.has(normalizeSlug(partial))) {
      throw new Error(`PARTIAL slug leaked into rendered truth scope: ${partial}`);
    }
  }
  // Cross-check C-Suite closed cohorts remain aligned.
  if (
    JSON.stringify([...BUCKPARTS_C_SUITE_COHORT_SLUGS_V1.qa_20]) !==
    JSON.stringify([...BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1.qa_20])
  ) {
    throw new Error("QA 20 cohort slug list drifted from C-Suite constants");
  }

  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const csvBySlug = deps.loadCsvByFridgeSlug
    ? deps.loadCsvByFridgeSlug()
    : defaultReadCsvByFridgeSlug(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? tryLoadSupabaseCompatForModelV1;
  const loadPdp = deps.loadPdpFridgeFilters ?? defaultLoadPdpFridgeFilters;
  const resolveQuarantine =
    deps.resolveQuarantine ??
    ((slug: string) => defaultResolveQuarantine(slug, deps.rootDir));

  const rows: BuckpartsFridgePdpRenderedTruthSlugRowV1[] = [];
  for (const cohort of BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1) {
    for (const slugRaw of BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_SLUGS_V1[cohort]) {
      const slug = normalizeSlug(slugRaw);
      const supabase = await loadSupabase(slug, []);
      const pdp = await loadPdp(slug);
      const quarantine = resolveQuarantine(slug);
      rows.push(
        classifyFridgePdpRenderedTruthSlugV1({
          cohort,
          slug,
          csv_mappings: csvBySlug.get(slug) ?? [],
          supabase,
          pdp,
          quarantine,
        }),
      );
    }
  }

  const summary = {
    MATCH: 0,
    MISMATCH: 0,
    UNKNOWN_RENDER: 0,
    QUARANTINED_SUPPRESSED: 0,
    frontend_safe_promoted_count: 0,
    backend_closed_slug_count: rows.length,
  };
  for (const row of rows) {
    summary[row.classification] += 1;
    if (row.frontend_safe_promoted) summary.frontend_safe_promoted_count += 1;
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    live_production_fetch_enabled: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_SOURCE_COMMAND_V1,
    scope: {
      cohorts: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_COHORT_IDS_V1,
      slug_count: rows.length,
      slugs: [...BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_ALL_SLUGS_V1],
      excluded_partial_slugs: GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary,
    rows,
    proven_facts: [
      "PROVEN: read_only=true; data_mutation=false; all mutation/buy/sitemap/JSON-LD flags false.",
      `PROVEN: exact backend-closed scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_EXPECTED_SLUG_COUNT_V1)} (GTE18+PASS5+GSWF13+QA20); PARTIAL 3 excluded.`,
      "PROVEN: live_production_fetch_enabled=false; local getFridgeBySlug + Supabase compat + quarantine safety only.",
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      `PROVEN: frontend_safe_promoted_count=${String(summary.frontend_safe_promoted_count)} (mapping-layer local data-path only).`,
    ],
    unknown_facts: [
      "UNKNOWN: Live production HTML for these 39 PDPs (no production fetch).",
      "UNKNOWN: CTA visibility and /go outcomes for these slugs.",
      "UNKNOWN: CDN/env drift between local Supabase read and deployed Netlify render.",
    ],
    risk_notes: [
      "frontend_safe_promoted is mapping-set proof only — not monetizable buyer-path approval.",
      "Do not mutate CSV, Supabase, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.",
      "PARTIAL 3 remains out of scope and must not be promoted from this pack.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpRenderedTruthProofMarkdownV1(
  report: BuckpartsFridgePdpRenderedTruthProofPackV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP rendered truth proof pack v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- live_production_fetch_enabled: **${String(report.live_production_fetch_enabled)}**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- excluded PARTIAL: \`${report.scope.excluded_partial_slugs.join(", ")}\``,
    "",
    "## Summary",
    "",
    `- MATCH: ${String(report.summary.MATCH)}`,
    `- MISMATCH: ${String(report.summary.MISMATCH)}`,
    `- UNKNOWN_RENDER: ${String(report.summary.UNKNOWN_RENDER)}`,
    `- QUARANTINED_SUPPRESSED: ${String(report.summary.QUARANTINED_SUPPRESSED)}`,
    `- frontend_safe_promoted_count: ${String(report.summary.frontend_safe_promoted_count)}`,
    "",
    "## Rows",
    "",
    "| cohort | slug | classification | frontend_safe_promoted | supabase | rendered |",
    "|---|---|---|---|---|---|",
  ];
  for (const row of report.rows) {
    lines.push(
      `| ${row.cohort} | ${row.slug} | ${row.classification} | ${String(row.frontend_safe_promoted)} | ${(row.supabase_mappings ?? []).join("|") || "(none/unread)"} | ${(row.rendered_filter_slugs ?? []).join("|") || "(none/unread)"} |`,
    );
  }
  lines.push("", "## Proven facts", "");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("", "## Unknown facts", "");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("", "## Risk notes", "");
  for (const n of report.risk_notes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

export function writeBuckpartsFridgeModelPdpRenderedTruthProofArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgePdpRenderedTruthProofPackV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("rendered truth proof write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsFridgeModelPdpRenderedTruthProofMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
