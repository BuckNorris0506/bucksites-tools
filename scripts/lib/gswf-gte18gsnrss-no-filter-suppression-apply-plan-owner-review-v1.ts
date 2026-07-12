/**
 * Read-only ge-gte18gsnrss no-filter suppression apply-plan owner review v1.
 * Plans exact CSV removals of gswf + gswf2 for one slug with PROVEN_NO_FILTER evidence.
 * Does not mutate compat, retailer_links, evidence, Supabase, pages, sitemap, robots, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1 =
  "gswf_gte18gsnrss_no_filter_suppression_apply_plan_owner_review_v1" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1.md" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1,
] as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1 = "ge-gte18gsnrss" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1 = [
  { fridge_slug: "ge-gte18gsnrss", filter_slug: "gswf" },
  { fridge_slug: "ge-gte18gsnrss", filter_slug: "gswf2" },
] as const;

export const GSWF_GTE18GSNRSS_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-cursor-validation-v1.json" as const;

export const GSWF_GTE18GSNRSS_HYPERAGENT_INGEST_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-hyperagent-ingest-packet-v1.json" as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type GswfGte18gsnrssNoFilterPlannedRemovalV1 = {
  fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  filter_slug: "gswf" | "gswf2";
  row_key: string;
};

export type GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1 = {
  contract: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  apply_plan_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  verified_link_authorized: false;
  retailer_links_mutation_authorized: false;
  buy_cta_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  generated_at: string;
  source_command: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_SOURCE_COMMAND_V1;
  target_fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  model_number: "GTE18GSNRSS";
  proposed_compat_action: "suppress_all_filter_mappings";
  evidence_label: "PROVEN_NO_FILTER";
  hyperagent_actual_filter: "NONE — no water dispenser";
  hyperagent_evidence_confidence: "PROVEN";
  cursor_verdict: "VALIDATION_FAIL";
  reason: string;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  planned_slug_count: 1;
  planned_csv_removals: GswfGte18gsnrssNoFilterPlannedRemovalV1[];
  planned_csv_additions: [];
  planned_compat_row_removals: 2;
  planned_compat_row_additions: 0;
  before_mappings: string[];
  after_mappings: [];
  excluded_partial_slugs: readonly string[];
  excluded_gswf_repaired_slugs: readonly string[];
  out_of_scope: string[];
  source_evidence_rel_paths: string[];
  owner_approval_requirements: string[];
  risk_notes: string[];
  proven_facts: string[];
  unknown_facts: string[];
  exact_repo_paths_read: string[];
};

type CursorPacketV1 = {
  validation_details?: {
    row_verdicts?: Array<{
      fridge_slug?: string;
      hyperagent_actual_filter?: string;
      hyperagent_evidence_confidence?: string;
      hyperagent_evidence_label?: string;
      cursor_verdict?: string;
      repo_compat_filter_slugs?: string[];
      reason?: string;
    }>;
  };
};

type IngestPacketV1 = {
  candidate_rows?: Array<{
    slug?: string;
    model_number?: string;
    filter_evidence?: string;
    evidence_confidence?: string;
    evidence_label?: string;
    wrong_part_actual_filter?: string;
    source_urls?: string[];
  }>;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

function readCompatFiltersForSlug(rootDir: string, fridgeSlug: string): string[] {
  const rows = parse(readFileSync(path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const filters = new Set<string>();
  for (const row of rows) {
    if (normalizeSlug(row.fridge_slug ?? "") !== normalizeSlug(fridgeSlug)) continue;
    const filter = normalizeSlug(row.filter_slug ?? "");
    if (filter) filters.add(filter);
  }
  return Array.from(filters).sort();
}

export function buildGswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1(args: {
  rootDir: string;
  now?: () => Date;
}): GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const target = GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;

  const before_mappings = readCompatFiltersForSlug(args.rootDir, target);
  const expected = [...GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(before_mappings) !== JSON.stringify(expected)) {
    throw new Error(
      `ge-gte18gsnrss CSV mappings expected exactly ${expected.join("|")}, got ${before_mappings.join("|") || "(none)"}`,
    );
  }

  const cursorAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_CURSOR_VALIDATION_JSON_REL_V1);
  const ingestAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_HYPERAGENT_INGEST_JSON_REL_V1);
  if (!existsSync(cursorAbs)) {
    throw new Error(`missing cursor validation artifact: ${GSWF_GTE18GSNRSS_CURSOR_VALIDATION_JSON_REL_V1}`);
  }
  if (!existsSync(ingestAbs)) {
    throw new Error(`missing hyperagent ingest artifact: ${GSWF_GTE18GSNRSS_HYPERAGENT_INGEST_JSON_REL_V1}`);
  }

  const cursor = JSON.parse(readFileSync(cursorAbs, "utf8")) as CursorPacketV1;
  const ingest = JSON.parse(readFileSync(ingestAbs, "utf8")) as IngestPacketV1;
  const cursorRow = (cursor.validation_details?.row_verdicts ?? []).find(
    (row) => normalizeSlug(row.fridge_slug ?? "") === target,
  );
  const ingestRow = (ingest.candidate_rows ?? []).find(
    (row) => normalizeSlug(row.slug ?? "") === target,
  );

  if (!cursorRow) {
    throw new Error("cursor validation missing ge-gte18gsnrss row");
  }
  if (cursorRow.cursor_verdict !== "VALIDATION_FAIL") {
    throw new Error(`cursor verdict expected VALIDATION_FAIL, got ${String(cursorRow.cursor_verdict)}`);
  }
  if (cursorRow.hyperagent_evidence_label !== "PROVEN_NO_FILTER") {
    throw new Error(
      `cursor evidence_label expected PROVEN_NO_FILTER, got ${String(cursorRow.hyperagent_evidence_label)}`,
    );
  }
  if (!ingestRow || ingestRow.evidence_label !== "PROVEN_NO_FILTER") {
    throw new Error("hyperagent ingest missing PROVEN_NO_FILTER for ge-gte18gsnrss");
  }

  const planned_csv_removals: GswfGte18gsnrssNoFilterPlannedRemovalV1[] =
    GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map((row) => ({
      fridge_slug: row.fridge_slug,
      filter_slug: row.filter_slug,
      row_key: rowKey(row.fridge_slug, row.filter_slug),
    }));

  const exact_repo_paths_read = [
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    GSWF_GTE18GSNRSS_CURSOR_VALIDATION_JSON_REL_V1,
    GSWF_GTE18GSNRSS_HYPERAGENT_INGEST_JSON_REL_V1,
  ].sort();

  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    apply_plan_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    verified_link_authorized: false,
    retailer_links_mutation_authorized: false,
    buy_cta_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    generated_at: generatedAt,
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_SOURCE_COMMAND_V1,
    target_fridge_slug: target,
    model_number: "GTE18GSNRSS",
    proposed_compat_action: "suppress_all_filter_mappings",
    evidence_label: "PROVEN_NO_FILTER",
    hyperagent_actual_filter: "NONE — no water dispenser",
    hyperagent_evidence_confidence: "PROVEN",
    cursor_verdict: "VALIDATION_FAIL",
    reason:
      "PROVEN_NO_FILTER — OEM/HyperAgent confirm no water dispenser / no filtration hardware; suppress all filter mappings (gswf + gswf2).",
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    planned_slug_count: 1,
    planned_csv_removals,
    planned_csv_additions: [],
    planned_compat_row_removals: 2,
    planned_compat_row_additions: 0,
    before_mappings,
    after_mappings: [],
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    out_of_scope: [
      "PARTIAL GSWF slugs (ge-gfe28hmkww, ge-gsc25frshss, ge-gse26gshess)",
      "GSWF 13 repaired fridge slugs (already closed CSV/Supabase lanes)",
      "data/retailer_links.csv",
      "buy CTA / Verified Link",
      "sitemap / robots",
      "Product JSON-LD",
      "Supabase mutation (separate founder-gated lane only after CSV, if ever)",
    ],
    source_evidence_rel_paths: [
      GSWF_GTE18GSNRSS_CURSOR_VALIDATION_JSON_REL_V1,
      GSWF_GTE18GSNRSS_HYPERAGENT_INGEST_JSON_REL_V1,
    ],
    owner_approval_requirements: [
      "Founder approval artifact required before any compatibility_mappings.csv mutation for ge-gte18gsnrss.",
      "Approval must bind this exact plan: 1 slug, 2 removals (gswf + gswf2), 0 additions.",
      "Do not expand scope to PARTIAL or GSWF-13 repaired slugs.",
      "Do not authorize retailer_links, buy CTA, sitemap/robots, or Product JSON-LD from this plan.",
      "Separate guarded executor required for apply — this packet is read-only planning only.",
    ],
    risk_notes: [
      "Live Supabase parity for this slug is UNKNOWN until a separate read/sync lane is authorized.",
      "Do not reuse GSWF 13 wrong-part or Supabase sync executors for this slug.",
      "model-filter-correctness-audit may still lag as LIKELY_CORRECT_NEEDS_EVIDENCE — HyperAgent PROVEN_NO_FILTER governs this lane.",
    ],
    proven_facts: [
      "PROVEN: target_fridge_slug=ge-gte18gsnrss only; planned_slug_count=1.",
      "PROVEN: CSV currently maps ge-gte18gsnrss → gswf|gswf2 exactly.",
      "PROVEN: planned_csv_removals=2 (ge-gte18gsnrss,gswf and ge-gte18gsnrss,gswf2); planned_csv_additions=0.",
      "PROVEN: evidence_label=PROVEN_NO_FILTER; cursor_verdict=VALIDATION_FAIL; hyperagent_actual_filter=NONE — no water dispenser.",
      "PROVEN: mutation_authorized=false; csv_apply_authorized=false; supabase_mutation_authorized=false; buy_cta_authorized=false.",
      "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are excluded from this plan.",
      "PROVEN: retailer_links / sitemap / robots / Product JSON-LD mutation authorized=false.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether live Supabase compatibility_mappings still contains gswf/gswf2 for ge-gte18gsnrss.",
      "UNKNOWN: Whether public runtime currently surfaces wrong-filter guidance for this model page after deploy.",
    ],
    exact_repo_paths_read,
  };
}

export function buildGswfGte18gsnrssNoFilterSuppressionApplyPlanMarkdownV1(
  plan: GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# GSWF ge-gte18gsnrss no-filter suppression apply-plan owner review v1",
    "",
    `Generated: ${plan.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${plan.contract}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- mutation_authorized: **false**`,
    `- csv_apply_authorized: **false**`,
    `- supabase_mutation_authorized: **false**`,
    `- buy_cta_authorized: **false**`,
    `- owner_approval_required: **true**`,
    "",
    "## Scope",
    "",
    `- target_fridge_slug: \`${plan.target_fridge_slug}\``,
    `- model_number: \`${plan.model_number}\``,
    `- proposed_compat_action: \`${plan.proposed_compat_action}\``,
    `- evidence_label: \`${plan.evidence_label}\``,
    `- hyperagent_actual_filter: \`${plan.hyperagent_actual_filter}\``,
    `- cursor_verdict: \`${plan.cursor_verdict}\``,
    `- reason: ${plan.reason}`,
    "",
    "## Planned CSV changes (not applied)",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| planned_slug_count | ${String(plan.planned_slug_count)} |`,
    `| planned_compat_row_removals | ${String(plan.planned_compat_row_removals)} |`,
    `| planned_compat_row_additions | ${String(plan.planned_compat_row_additions)} |`,
    `| before_mappings | \`${plan.before_mappings.join("|")}\` |`,
    `| after_mappings | \`(none)\` |`,
    "",
    "### Removals",
    "",
    ...plan.planned_csv_removals.map((row) => `- \`${row.row_key}\``),
    "",
    "### Additions",
    "",
    "- none",
    "",
    "## Explicitly excluded",
    "",
    `- PARTIAL: \`${plan.excluded_partial_slugs.join("|")}\``,
    `- GSWF 13 repaired: \`${plan.excluded_gswf_repaired_slugs.join("|")}\``,
    "",
    "## Out of scope",
    "",
    ...plan.out_of_scope.map((item) => `- ${item}`),
    "",
    "## Owner approval requirements",
    "",
    ...plan.owner_approval_requirements.map((item) => `- ${item}`),
    "",
    "## Risk notes",
    "",
    ...plan.risk_notes.map((item) => `- ${item}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function writeGswfGte18gsnrssNoFilterSuppressionApplyPlanArtifactsV1(args: {
  rootDir: string;
  plan: GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildGswfGte18gsnrssNoFilterSuppressionApplyPlanMarkdownV1(args.plan), "utf8");
  return {
    json_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1,
    md_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_MD_REL_V1,
  };
}
