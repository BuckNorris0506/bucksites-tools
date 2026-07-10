/**
 * Read-only GSWF wrong-part repair apply-plan owner review v1.
 * Designs surgical compatibility_mappings.csv repairs for 13 proven wrong-part rows only.
 * Does not mutate compat, retailer_links, evidence, Supabase, pages, sitemap, robots, or HQ handoff.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  GSWF_FAMILY_KEY_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1,
  GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
  type GswfFamilyReconciliationSlugRowV1,
} from "./gswf-family-reconciliation-owner-review-v1";

export const GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1 =
  "gswf_wrong_part_repair_apply_plan_owner_review_v1" as const;

export const GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-apply-plan-owner-review-v1.json" as const;

export const GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-apply-plan-owner-review-v1.md" as const;

export const GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-wrong-part-repair-apply-plan-owner-review" as const;

export const GSWF_WRONG_PART_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1,
] as const;

export const GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 = ["gswf", "gswf2"] as const;

export const GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 = [
  "ge-gfe28hmkww",
  "ge-gsc25frshss",
  "ge-gse26gshess",
] as const;

export const GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1 = ["ge-gte18gsnrss"] as const;

export const GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1 = [
  "ge-cwe23sshww",
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gfe28gmkbb",
  "ge-gfe28gskes",
  "ge-gfe28hskss",
  "ge-gne25jmkww",
  "ge-gne27jstss",
  "ge-gse25hskss",
  "ge-gye22gskww",
  "ge-pfe28kmkww",
  "ge-pfe28kynbb",
  "ge-pvd28bymfs",
] as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;
const FILTERS_CSV_REL_V1 = "data/filters.csv" as const;
const FILTER_ALIASES_CSV_REL_V1 = "data/filter_aliases.csv" as const;

export type GswfWrongPartRepairPlannedRowV1 = {
  fridge_slug: string;
  operation: "surgical_remove_gswf_family_mappings";
  before_mappings: string[];
  after_mappings: string[];
  wrong_part_removals: string[];
  preserved_mappings: string[];
  proposed_remap_target_filter_slug: string | null;
  added_filter_slugs: string[];
  hyperagent_actual_filter: string;
  hyperagent_evidence_confidence: string;
  cursor_verdict: string;
  source_row_category: "proven_wrong_part_repair";
  mutation_authorized: false;
  csv_apply_authorized: false;
  verified_link_authorized: false;
  buy_cta_authorized: false;
  not_applied: true;
};

export type GswfWrongPartRepairApplyPlanOwnerReviewV1 = {
  contract: typeof GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  apply_plan_authorized: false;
  csv_apply_authorized: false;
  verified_link_authorized: false;
  retailer_links_mutation_authorized: false;
  buy_cta_authorized: false;
  supabase_mutation_authorized: false;
  generated_at: string;
  source_command: typeof GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_SOURCE_COMMAND_V1;
  family_key: typeof GSWF_FAMILY_KEY_V1;
  source_owner_review_packet: {
    contract: typeof GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1;
    rel_path: typeof GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1;
    row_category: "proven_wrong_part_repair";
    slug_count: number;
  };
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  excluded_from_plan: {
    partial_browser_proof_required_slugs: readonly string[];
    no_filter_suppression_slugs: readonly string[];
    reason: string;
  };
  planned_rows: GswfWrongPartRepairPlannedRowV1[];
  wrong_part_family_filter_slugs: readonly string[];
  rollup_removed_filter_slugs: string[];
  rollup_added_filter_slugs: string[];
  planned_compat_row_removals: number;
  planned_compat_row_additions: number;
  owner_approval_requirements: string[];
  risk_notes: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type GswfFamilyReconciliationOwnerReviewPacketV1 = {
  contract?: string;
  family_key?: string;
  proven_wrong_part_repair_candidates?: GswfFamilyReconciliationSlugRowV1[];
  browser_proof_required_rows?: GswfFamilyReconciliationSlugRowV1[];
  no_filter_suppression_rows?: GswfFamilyReconciliationSlugRowV1[];
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function readCompatBySlug(rootDir: string): Map<string, string[]> {
  const rows = parse(
    readFileSync(path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1), "utf8"),
    {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    },
  ) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = row.fridge_slug?.trim();
    const filter = row.filter_slug?.trim();
    if (!slug || !filter) continue;
    const key = normalizeSlug(slug);
    const existing = bySlug.get(key) ?? [];
    existing.push(normalizeSlug(filter));
    bySlug.set(key, existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, Array.from(new Set(filters)).sort());
  }
  return bySlug;
}

function readKnownFilterSlugs(rootDir: string): Set<string> {
  const known = new Set<string>();

  const filterRows = parse(readFileSync(path.join(rootDir, FILTERS_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ slug?: string }>;
  for (const row of filterRows) {
    const slug = row.slug?.trim();
    if (slug) known.add(normalizeSlug(slug));
  }

  const aliasRows = parse(readFileSync(path.join(rootDir, FILTER_ALIASES_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ filter_slug?: string }>;
  for (const row of aliasRows) {
    const slug = row.filter_slug?.trim();
    if (slug) known.add(normalizeSlug(slug));
  }

  return known;
}

function assertKnownFilterSlug(filterSlug: string, knownSlugs: Set<string>): void {
  if (!knownSlugs.has(normalizeSlug(filterSlug))) {
    throw new Error(`proposed remap target not known in filters.csv or filter_aliases.csv: ${filterSlug}`);
  }
}

function wrongPartRemovalsForRow(
  beforeMappings: string[],
  sourceMappedFilters: string[],
): string[] {
  const sourceSet = new Set(sourceMappedFilters.map(normalizeSlug));
  return beforeMappings.filter(
    (slug) =>
      (GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]).includes(slug) &&
      sourceSet.has(slug),
  );
}

function buildPlannedRow(args: {
  ownerRow: GswfFamilyReconciliationSlugRowV1;
  committedMappings: string[];
  knownFilterSlugs: Set<string>;
}): GswfWrongPartRepairPlannedRowV1 {
  const fridgeSlug = normalizeSlug(args.ownerRow.fridge_slug);
  if (args.ownerRow.row_category !== "proven_wrong_part_repair") {
    throw new Error(`row ${fridgeSlug} is not proven_wrong_part_repair`);
  }

  const beforeMappings = [...args.committedMappings].sort();
  const packetBefore = [...args.ownerRow.repo_mapped_filter_slugs].map(normalizeSlug).sort();
  if (JSON.stringify(beforeMappings) !== JSON.stringify(packetBefore)) {
    throw new Error(
      `committed CSV mappings for ${fridgeSlug} (${beforeMappings.join("|")}) do not match source owner packet (${packetBefore.join("|")})`,
    );
  }

  const wrongPartRemovals = wrongPartRemovalsForRow(
    beforeMappings,
    args.ownerRow.repo_mapped_filter_slugs,
  );
  if (wrongPartRemovals.length === 0) {
    throw new Error(`no gswf/gswf2 removals planned for ${fridgeSlug}`);
  }

  const preservedMappings = beforeMappings
    .filter((slug) => !wrongPartRemovals.includes(slug))
    .sort();

  const remapTarget = args.ownerRow.proposed_remap_target_filter_slug
    ? normalizeSlug(args.ownerRow.proposed_remap_target_filter_slug)
    : null;

  const addedFilterSlugs: string[] = [];
  if (remapTarget) {
    assertKnownFilterSlug(remapTarget, args.knownFilterSlugs);
    if (!preservedMappings.includes(remapTarget)) {
      addedFilterSlugs.push(remapTarget);
    }
  }

  const afterMappings = [...preservedMappings, ...addedFilterSlugs].sort();

  return {
    fridge_slug: fridgeSlug,
    operation: "surgical_remove_gswf_family_mappings",
    before_mappings: beforeMappings,
    after_mappings: afterMappings,
    wrong_part_removals: wrongPartRemovals,
    preserved_mappings: preservedMappings,
    proposed_remap_target_filter_slug: remapTarget,
    added_filter_slugs: addedFilterSlugs,
    hyperagent_actual_filter: args.ownerRow.hyperagent_actual_filter,
    hyperagent_evidence_confidence: args.ownerRow.hyperagent_evidence_confidence,
    cursor_verdict: args.ownerRow.cursor_verdict,
    source_row_category: "proven_wrong_part_repair",
    mutation_authorized: false,
    csv_apply_authorized: false,
    verified_link_authorized: false,
    buy_cta_authorized: false,
    not_applied: true,
  };
}

function buildOwnerApprovalRequirements(): string[] {
  return [
    "Owner must explicitly approve filter::ge::gswf wrong-part repair apply plan before any CSV or Supabase compat mutation.",
    "Owner must confirm each of the 13 planned rows after reviewing before/after mapping intent in this packet.",
    "Owner must complete browser-proof Tier-1 capture for 3 PARTIAL slugs before including them in any apply executor.",
    "Owner must approve no-filter suppression for ge-gte18gsnrss in a separate lane — not included in this plan.",
    "No GSWF buy CTA, retailer_links.csv edit, or Verified Link promotion is authorized by approving this compat-only design.",
    "Re-validate committed compatibility_mappings.csv and live Supabase state immediately before any future guarded apply.",
    "BP-000003 caution behavior must remain until post-apply re-audit proves safe customer-facing posture.",
  ];
}

function buildRiskNotes(plannedRows: GswfWrongPartRepairPlannedRowV1[]): string[] {
  return [
    "owner_approval_required=true — this artifact designs a future CSV repair only; nothing has been applied.",
    "mutation_authorized=false, csv_apply_authorized=false, buy_cta_authorized=false on packet and every planned row.",
    "Only 13 of 17 GSWF mission slugs are included — 3 PARTIAL browser-proof rows and 1 no-filter row are explicitly excluded.",
    `Surgical removals are limited to wrong-part family slugs: ${GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1.join("|")}.`,
    `Planned compat row removals=${String(plannedRows.reduce((sum, row) => sum + row.wrong_part_removals.length, 0))}; additions=${String(plannedRows.reduce((sum, row) => sum + row.added_filter_slugs.length, 0))}.`,
    "Proposed remap targets come only from gswf-family-reconciliation-owner-review-v1 proposed_remap_target_filter_slug fields.",
    "Unrelated valid mappings (e.g. smartwater-mwfp, xwf) are preserved where present in committed CSV.",
    "No retailer_links.csv changes, public buy CTA changes, manual-evidence commits, or page updates in this plan.",
    "Live Supabase compatibility_mappings may differ from committed CSV at apply time — re-validate before execution.",
  ];
}

export function buildGswfWrongPartRepairApplyPlanOwnerReviewV1(args: {
  rootDir: string;
  now?: () => Date;
}): GswfWrongPartRepairApplyPlanOwnerReviewV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const ownerReview = readJsonFile<GswfFamilyReconciliationOwnerReviewPacketV1>(
    args.rootDir,
    GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
  );
  if (ownerReview.contract !== GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("GSWF family reconciliation owner review packet contract mismatch");
  }
  if (ownerReview.family_key !== GSWF_FAMILY_KEY_V1) {
    throw new Error("GSWF family reconciliation owner review family_key mismatch");
  }

  const repairCandidates = (ownerReview.proven_wrong_part_repair_candidates ?? []).filter(
    (row) => row.row_category === "proven_wrong_part_repair",
  );
  if (repairCandidates.length !== GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1.length) {
    throw new Error(
      `expected ${String(GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1.length)} proven wrong-part rows, got ${String(repairCandidates.length)}`,
    );
  }

  const plannedSlugs = repairCandidates.map((row) => normalizeSlug(row.fridge_slug)).sort();
  const expectedSlugs = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(plannedSlugs) !== JSON.stringify(expectedSlugs)) {
    throw new Error(
      `proven wrong-part slug set mismatch — expected ${expectedSlugs.join(", ")}, got ${plannedSlugs.join(", ")}`,
    );
  }

  const excludedPartial = (ownerReview.browser_proof_required_rows ?? []).map((row) =>
    normalizeSlug(row.fridge_slug),
  );
  const excludedNoFilter = (ownerReview.no_filter_suppression_rows ?? []).map((row) =>
    normalizeSlug(row.fridge_slug),
  );
  if (
    JSON.stringify([...excludedPartial].sort()) !==
    JSON.stringify([...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1].sort())
  ) {
    throw new Error("partial browser-proof exclusion set mismatch");
  }
  if (
    JSON.stringify(excludedNoFilter) !==
    JSON.stringify([...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1])
  ) {
    throw new Error("no-filter exclusion set mismatch");
  }

  const knownFilterSlugs = readKnownFilterSlugs(args.rootDir);
  const compatBySlug = readCompatBySlug(args.rootDir);

  const plannedRows: GswfWrongPartRepairPlannedRowV1[] = [];
  for (const ownerRow of repairCandidates) {
    const fridgeSlug = normalizeSlug(ownerRow.fridge_slug);
    const committedMappings = compatBySlug.get(fridgeSlug) ?? [];
    if (committedMappings.length === 0) {
      throw new Error(`committed CSV has no mappings for ${fridgeSlug}`);
    }
    plannedRows.push(
      buildPlannedRow({
        ownerRow,
        committedMappings,
        knownFilterSlugs,
      }),
    );
  }
  plannedRows.sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));

  const rollup_removed_filter_slugs = Array.from(
    new Set(plannedRows.flatMap((row) => row.wrong_part_removals)),
  ).sort();
  const rollup_added_filter_slugs = Array.from(
    new Set(plannedRows.flatMap((row) => row.added_filter_slugs)),
  ).sort();
  const planned_compat_row_removals = plannedRows.reduce(
    (sum, row) => sum + row.wrong_part_removals.length,
    0,
  );
  const planned_compat_row_additions = plannedRows.reduce(
    (sum, row) => sum + row.added_filter_slugs.length,
    0,
  );

  const exact_repo_paths_read = [
    GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    FILTERS_CSV_REL_V1,
    FILTER_ALIASES_CSV_REL_V1,
  ].sort();

  return {
    contract: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    apply_plan_authorized: false,
    csv_apply_authorized: false,
    verified_link_authorized: false,
    retailer_links_mutation_authorized: false,
    buy_cta_authorized: false,
    supabase_mutation_authorized: false,
    generated_at: generatedAt,
    source_command: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_SOURCE_COMMAND_V1,
    family_key: GSWF_FAMILY_KEY_V1,
    source_owner_review_packet: {
      contract: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1,
      rel_path: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
      row_category: "proven_wrong_part_repair",
      slug_count: plannedRows.length,
    },
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    excluded_from_plan: {
      partial_browser_proof_required_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
      no_filter_suppression_slugs: [...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1],
      reason:
        "PARTIAL rows require owner-browser Tier-1 proof; no-filter row requires separate suppression lane — neither is authorized in this compat-only apply-plan design.",
    },
    planned_rows: plannedRows,
    wrong_part_family_filter_slugs: [...GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1],
    rollup_removed_filter_slugs,
    rollup_added_filter_slugs,
    planned_compat_row_removals,
    planned_compat_row_additions,
    owner_approval_requirements: buildOwnerApprovalRequirements(),
    risk_notes: buildRiskNotes(plannedRows),
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: ${String(plannedRows.length)} proven_wrong_part_repair rows planned from ${GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1}.`,
      `PROVEN: Excluded ${String(GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1.length)} PARTIAL and ${String(GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1.length)} no-filter slug(s) from this plan.`,
      `PROVEN: Surgical removals limited to ${GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1.join("|")} where present in source rows.`,
      `PROVEN: planned_compat_row_removals=${String(planned_compat_row_removals)}; planned_compat_row_additions=${String(planned_compat_row_additions)}.`,
      "PROVEN: mutation_authorized=false; apply_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
      "PROVEN: Read-only apply-plan design — compatibility_mappings.csv not modified.",
    ],
    unknown_facts: [
      "UNKNOWN: When owner will approve this GSWF wrong-part repair apply plan.",
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV at apply time.",
      "UNKNOWN: Whether post-apply manual-evidence capture is needed before lifting GSWF caution copy.",
    ],
  };
}

export function buildGswfWrongPartRepairApplyPlanOwnerReviewMarkdownV1(
  plan: GswfWrongPartRepairApplyPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# GSWF wrong-part repair apply-plan owner review v1",
    "",
    `Generated: ${plan.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${plan.contract}\``,
    `- family_key: \`${plan.family_key}\``,
    `- read_only: **true**`,
    `- mutation_authorized: **false**`,
    `- apply_authorized: **false**`,
    `- apply_plan_authorized: **false**`,
    `- buy_cta_authorized: **false**`,
    `- retailer_links_mutation_authorized: **false**`,
    `- owner_approval_required: **true**`,
    "",
    "## Source",
    "",
    `- owner review: \`${plan.source_owner_review_packet.rel_path}\` (${plan.source_owner_review_packet.row_category}, ${String(plan.source_owner_review_packet.slug_count)} slugs)`,
    `- target CSV: \`${plan.target_csv_rel_path}\` (not modified)`,
    "",
    "## Excluded from plan",
    "",
    `- PARTIAL browser-proof slugs: \`${plan.excluded_from_plan.partial_browser_proof_required_slugs.join("|")}\``,
    `- no-filter suppression slugs: \`${plan.excluded_from_plan.no_filter_suppression_slugs.join("|")}\``,
    `- reason: ${plan.excluded_from_plan.reason}`,
    "",
    "## Rollup",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| planned slug count | ${String(plan.planned_rows.length)} |`,
    `| wrong-part family removals | \`${plan.rollup_removed_filter_slugs.join("|")}\` |`,
    `| proposed remap additions | \`${plan.rollup_added_filter_slugs.join("|") || "none"}\` |`,
    `| compat row removals | ${String(plan.planned_compat_row_removals)} |`,
    `| compat row additions | ${String(plan.planned_compat_row_additions)} |`,
    "",
    "## Owner approval requirements",
    "",
    ...plan.owner_approval_requirements.map((item) => `- ${item}`),
    "",
    "## Risk notes",
    "",
    ...plan.risk_notes.map((note) => `- ${note}`),
    "",
    "## Planned rows",
    "",
  ];

  for (const row of plan.planned_rows) {
    lines.push(`### ${row.fridge_slug}`, "");
    lines.push(`- operation: \`${row.operation}\``);
    lines.push(`- before: \`${row.before_mappings.join("|")}\``);
    lines.push(`- after: \`${row.after_mappings.join("|")}\``);
    lines.push(`- wrong_part_removals: \`${row.wrong_part_removals.join("|")}\``);
    lines.push(`- preserved: \`${row.preserved_mappings.join("|") || "none"}\``);
    lines.push(`- add: \`${row.added_filter_slugs.join("|") || "none"}\``);
    lines.push(`- remap target: \`${row.proposed_remap_target_filter_slug ?? "none"}\``);
    lines.push(`- hyperagent_actual_filter: \`${row.hyperagent_actual_filter}\``);
    lines.push(`- verdict: \`${row.cursor_verdict}\``);
    lines.push(`- mutation_authorized: **false**`, "");
  }

  return `${lines.join("\n")}\n`;
}

export function writeGswfWrongPartRepairApplyPlanOwnerReviewArtifactsV1(args: {
  rootDir: string;
  plan: GswfWrongPartRepairApplyPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildGswfWrongPartRepairApplyPlanOwnerReviewMarkdownV1(args.plan), "utf8");
  return {
    json_rel_path: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
    md_rel_path: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_MD_REL_V1,
  };
}
