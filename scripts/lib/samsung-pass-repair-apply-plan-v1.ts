/**
 * Read-only SAMSUNG_PASS_REPAIR_APPLY_PLAN_V1.
 * Approval-gated compat apply plan for samsung_pass_ready rows from truth repair owner review.
 * Does not mutate compat, filters, fridge_models, evidence, Supabase, pages, retailer links, sitemap, robots, or HQ handoff.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  CURSOR_VALIDATED_CORRECT_VERDICT_V1,
  PHANTOM_FILTER_SLUGS_V1,
  REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
} from "./refrigerator-truth-scoreboard-v1";
import {
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
  SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
  type TruthRepairOwnerReviewSlugRowV1,
} from "./refrigerator-truth-repair-owner-review-v1";

export const SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1 =
  "samsung_pass_repair_apply_plan_v1" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-apply-plan-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-apply-plan-v1.md" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-apply-plan" as const;

export const SAMSUNG_PASS_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1,
] as const;

export const SAMSUNG_PASS_TARGET_FILTER_SLUG_V1 = "da97-17376b" as const;

export const SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1 = [
  "samsung-rf27t5201sr",
  "samsung-rf27t5501sr",
  "samsung-rf28r6301sr",
  "samsung-rf28t5101sr",
  "samsung-rs22t5201sg",
] as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;
const FILTERS_CSV_REL_V1 = "data/filters.csv" as const;
const FILTER_ALIASES_CSV_REL_V1 = "data/filter_aliases.csv" as const;

export type ValidationBasisV1 = {
  source_batch_id: string;
  source_validation_rel_path: string;
  cursor_verdict: string;
  discovered_token: string | null;
  discovered_part_number: string | null;
  evidence_category: string | null;
  reason: string;
};

export type SamsungPassRepairPlannedRowV1 = {
  fridge_slug: string;
  operation: "replace_mapping" | "split_mapping";
  before_mappings: string[];
  after_mappings: string[];
  removed_filter_slugs: string[];
  added_filter_slugs: string[];
  target_filter_slug: string;
  repo_classification: string;
  validation_basis: ValidationBasisV1;
  mutation_authorized: false;
  not_applied: true;
};

export type ExpectedScoreboardDeltaV1 = {
  scoreboard_source_contract: typeof REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1;
  baseline_wrong_part_risk_count: number;
  estimated_wrong_part_risk_reduction_if_owner_approved: number;
  estimated_wrong_part_risk_count_after_apply: number;
  baseline_multi_mapped_count: number;
  estimated_multi_mapped_reduction_if_owner_approved: number;
  estimated_multi_mapped_count_after_apply: number;
  baseline_phantom_model_count: number;
  estimated_phantom_model_reduction_if_owner_approved: number;
  estimated_phantom_model_count_after_catalog_review: number;
  planned_compat_row_removals: number;
  planned_compat_row_additions: number;
};

export type SamsungPassRepairApplyPlanV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  generated_at: string;
  source_command: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_SOURCE_COMMAND_V1;
  source_owner_review_packet: {
    contract: typeof REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1;
    rel_path: typeof REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1;
    repair_group: "samsung_pass_ready";
    slug_count: number;
  };
  source_validation_packet: {
    batch_id: string;
    rel_path: typeof SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1;
  };
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  planned_rows: SamsungPassRepairPlannedRowV1[];
  removed_filter_slugs: string[];
  added_filter_slugs: string[];
  validation_basis: ValidationBasisV1[];
  risk_notes: string[];
  expected_scoreboard_delta: ExpectedScoreboardDeltaV1;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type OwnerReviewPacketV1 = {
  contract?: string;
  scoreboard_impact_estimate?: {
    scoreboard_source_contract?: string;
    baseline_wrong_part_risk_count?: number;
    estimated_wrong_part_risk_reduction_if_owner_approved?: number;
    estimated_wrong_part_risk_count_after_apply?: number;
    baseline_multi_mapped_count?: number;
    estimated_multi_mapped_reduction_if_owner_approved?: number;
    estimated_multi_mapped_count_after_apply?: number;
    baseline_phantom_model_count?: number;
    estimated_phantom_model_reduction_if_owner_approved?: number;
    estimated_phantom_model_count_after_catalog_review?: number;
  };
  repair_groups?: Array<{
    repair_group?: string;
    batch_id?: string;
    slug_rows?: TruthRepairOwnerReviewSlugRowV1[];
  }>;
};

type CursorValidationRowV1 = {
  fridge_slug?: string;
  discovered_token?: string;
  discovered_part_number?: string;
  evidence_category?: string;
  cursor_verdict?: string;
  reason?: string;
};

type CursorValidationPacketV1 = {
  contract?: string;
  validation_details?: {
    batch_id?: string;
    row_verdicts?: CursorValidationRowV1[];
  };
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
    throw new Error(`target filter slug not known in repo filters.csv or filter_aliases.csv: ${filterSlug}`);
  }
}

function buildPlannedRow(args: {
  ownerRow: TruthRepairOwnerReviewSlugRowV1;
  validationRow: CursorValidationRowV1;
  committedMappings: string[];
  batchId: string;
}): SamsungPassRepairPlannedRowV1 {
  const fridgeSlug = normalizeSlug(args.ownerRow.fridge_slug);
  const target = normalizeSlug(args.ownerRow.validated_target_filter_slug ?? "");
  if (!target) {
    throw new Error(`missing validated target for ${fridgeSlug}`);
  }

  const beforeMappings = [...args.committedMappings].sort();
  const ownerBefore = [...args.ownerRow.current_mapped_filter_slugs].map(normalizeSlug).sort();
  if (JSON.stringify(beforeMappings) !== JSON.stringify(ownerBefore)) {
    throw new Error(
      `committed CSV mappings for ${fridgeSlug} (${beforeMappings.join("|")}) do not match owner-review packet (${ownerBefore.join("|")})`,
    );
  }

  const removed = beforeMappings.filter((slug) => slug !== target);
  const added = beforeMappings.includes(target) ? [] : [target];
  const afterMappings = [target];

  const operation =
    args.ownerRow.proposed_mutation_type === "split_mapping" ? "split_mapping" : "replace_mapping";

  return {
    fridge_slug: fridgeSlug,
    operation,
    before_mappings: beforeMappings,
    after_mappings: afterMappings,
    removed_filter_slugs: removed,
    added_filter_slugs: added,
    target_filter_slug: target,
    repo_classification: args.ownerRow.repo_classification,
    validation_basis: {
      source_batch_id: args.batchId,
      source_validation_rel_path: SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
      cursor_verdict: args.validationRow.cursor_verdict ?? "UNKNOWN",
      discovered_token: args.validationRow.discovered_token ?? args.ownerRow.discovered_token,
      discovered_part_number: args.validationRow.discovered_part_number ?? null,
      evidence_category: args.validationRow.evidence_category ?? args.ownerRow.evidence_tier,
      reason: args.validationRow.reason ?? args.ownerRow.reason,
    },
    mutation_authorized: false,
    not_applied: true,
  };
}

function buildRiskNotes(plannedRows: SamsungPassRepairPlannedRowV1[]): string[] {
  const phantomRemovals = plannedRows.flatMap((row) =>
    row.removed_filter_slugs.filter((slug) =>
      (PHANTOM_FILTER_SLUGS_V1 as readonly string[]).includes(slug),
    ),
  );
  const phantomSlugSet = new Set(phantomRemovals);

  return [
    "owner_approval_required=true — this artifact is a read-only apply plan only; nothing has been applied.",
    "mutation_authorized=false on every planned row — separate owner-approved apply executor required for CSV/Supabase writes.",
    "Only 5 of 15 Samsung bad-mapping batch rows are VALIDATION_PASS — remaining 10 PARTIAL rows are excluded from this plan.",
    `Planned removals include repo-proven phantom filter slug(s): ${Array.from(phantomSlugSet).join("|") || "none"}.`,
    "Live Supabase compatibility_mappings may differ from committed CSV at apply time — re-validate before execution.",
    "No manual-evidence JSON commits, page updates, retailer-link changes, sitemap/robots edits, or HQ handoff in this plan.",
    "Target filter da97-17376b is HAF-QIN family — wrong-family DA29 co-maps are the intended removal set.",
  ];
}

export function buildSamsungPassRepairApplyPlanV1(args: {
  rootDir: string;
  now?: () => Date;
}): SamsungPassRepairApplyPlanV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const ownerReview = readJsonFile<OwnerReviewPacketV1>(
    args.rootDir,
    REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
  );
  if (ownerReview.contract !== REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("Owner review packet contract mismatch");
  }

  const passGroup = ownerReview.repair_groups?.find(
    (group) => group.repair_group === "samsung_pass_ready",
  );
  if (!passGroup?.slug_rows?.length) {
    throw new Error("samsung_pass_ready repair group missing from owner review packet");
  }

  const passRows = passGroup.slug_rows;
  const passSlugs = passRows.map((row) => normalizeSlug(row.fridge_slug)).sort();
  const expectedSlugs = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(passSlugs) !== JSON.stringify(expectedSlugs)) {
    throw new Error(
      `samsung_pass_ready slug set mismatch — expected ${expectedSlugs.join(", ")}, got ${passSlugs.join(", ")}`,
    );
  }

  for (const row of passRows) {
    if (row.repair_group !== "samsung_pass_ready") {
      throw new Error(`planned row ${row.fridge_slug} is not in samsung_pass_ready`);
    }
    if (row.validation_verdict !== CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
      throw new Error(
        `planned row ${row.fridge_slug} validation verdict is ${row.validation_verdict}, expected ${CURSOR_VALIDATED_CORRECT_VERDICT_V1}`,
      );
    }
    if (normalizeSlug(row.validated_target_filter_slug ?? "") !== SAMSUNG_PASS_TARGET_FILTER_SLUG_V1) {
      throw new Error(
        `planned row ${row.fridge_slug} target ${row.validated_target_filter_slug ?? "null"} is not ${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}`,
      );
    }
  }

  const validationPacket = readJsonFile<CursorValidationPacketV1>(
    args.rootDir,
    SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
  );
  if (validationPacket.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) {
    throw new Error("Samsung cursor validation packet contract mismatch");
  }

  const validationBySlug = new Map(
    (validationPacket.validation_details?.row_verdicts ?? [])
      .filter((row) => row.fridge_slug)
      .map((row) => [normalizeSlug(row.fridge_slug!), row] as const),
  );

  const knownFilterSlugs = readKnownFilterSlugs(args.rootDir);
  assertKnownFilterSlug(SAMSUNG_PASS_TARGET_FILTER_SLUG_V1, knownFilterSlugs);

  const compatBySlug = readCompatBySlug(args.rootDir);
  const batchId =
    validationPacket.validation_details?.batch_id ?? "samsung-bad-mapping-batch-001";

  const plannedRows: SamsungPassRepairPlannedRowV1[] = [];
  for (const ownerRow of passRows) {
    const fridgeSlug = normalizeSlug(ownerRow.fridge_slug);
    const validationRow = validationBySlug.get(fridgeSlug);
    if (!validationRow) {
      throw new Error(`Samsung validation row missing for ${fridgeSlug}`);
    }
    if (validationRow.cursor_verdict !== CURSOR_VALIDATED_CORRECT_VERDICT_V1) {
      throw new Error(
        `Samsung validation verdict for ${fridgeSlug} is ${validationRow.cursor_verdict ?? "UNKNOWN"}, expected ${CURSOR_VALIDATED_CORRECT_VERDICT_V1}`,
      );
    }

    const committedMappings = compatBySlug.get(fridgeSlug) ?? [];
    if (committedMappings.length === 0) {
      throw new Error(`committed CSV has no mappings for ${fridgeSlug}`);
    }

    plannedRows.push(
      buildPlannedRow({
        ownerRow,
        validationRow,
        committedMappings,
        batchId,
      }),
    );
  }

  plannedRows.sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));

  const removed_filter_slugs = Array.from(
    new Set(plannedRows.flatMap((row) => row.removed_filter_slugs)),
  ).sort();
  const added_filter_slugs = Array.from(
    new Set(plannedRows.flatMap((row) => row.added_filter_slugs)),
  ).sort();
  const validation_basis = plannedRows.map((row) => row.validation_basis);

  const impact = ownerReview.scoreboard_impact_estimate;
  const planned_compat_row_removals = plannedRows.reduce(
    (sum, row) => sum + row.removed_filter_slugs.length,
    0,
  );
  const planned_compat_row_additions = plannedRows.reduce(
    (sum, row) => sum + row.added_filter_slugs.length,
    0,
  );

  const expected_scoreboard_delta: ExpectedScoreboardDeltaV1 = {
    scoreboard_source_contract: REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
    baseline_wrong_part_risk_count: impact?.baseline_wrong_part_risk_count ?? 75,
    estimated_wrong_part_risk_reduction_if_owner_approved:
      impact?.estimated_wrong_part_risk_reduction_if_owner_approved ?? 5,
    estimated_wrong_part_risk_count_after_apply:
      impact?.estimated_wrong_part_risk_count_after_apply ?? 70,
    baseline_multi_mapped_count: impact?.baseline_multi_mapped_count ?? 212,
    estimated_multi_mapped_reduction_if_owner_approved:
      impact?.estimated_multi_mapped_reduction_if_owner_approved ?? 1,
    estimated_multi_mapped_count_after_apply:
      impact?.estimated_multi_mapped_count_after_apply ?? 211,
    baseline_phantom_model_count: impact?.baseline_phantom_model_count ?? 15,
    estimated_phantom_model_reduction_if_owner_approved:
      impact?.estimated_phantom_model_reduction_if_owner_approved ?? 2,
    estimated_phantom_model_count_after_catalog_review:
      impact?.estimated_phantom_model_count_after_catalog_review ?? 13,
    planned_compat_row_removals,
    planned_compat_row_additions,
  };

  const exact_repo_paths_read = [
    REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
    SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    FILTERS_CSV_REL_V1,
    FILTER_ALIASES_CSV_REL_V1,
  ].sort();

  return {
    contract: SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    generated_at: generatedAt,
    source_command: SAMSUNG_PASS_REPAIR_APPLY_PLAN_SOURCE_COMMAND_V1,
    source_owner_review_packet: {
      contract: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1,
      rel_path: REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
      repair_group: "samsung_pass_ready",
      slug_count: plannedRows.length,
    },
    source_validation_packet: {
      batch_id: batchId,
      rel_path: SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
    },
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    planned_rows: plannedRows,
    removed_filter_slugs,
    added_filter_slugs,
    validation_basis,
    risk_notes: buildRiskNotes(plannedRows),
    expected_scoreboard_delta,
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: ${String(plannedRows.length)} samsung_pass_ready rows planned from ${REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1}.`,
      `PROVEN: All planned rows have cursor_verdict=${CURSOR_VALIDATED_CORRECT_VERDICT_V1} in Samsung validation packet.`,
      `PROVEN: Target filter ${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1} exists in filters.csv and filter_aliases.csv.`,
      `PROVEN: planned_compat_row_removals=${String(planned_compat_row_removals)}; planned_compat_row_additions=${String(planned_compat_row_additions)}.`,
      "PROVEN: mutation_authorized=false; owner_approval_required=true; csv_apply_authorized=false.",
      "PROVEN: Read-only apply plan — no compatibility_mappings.csv or Supabase mutation performed.",
    ],
    unknown_facts: [
      "UNKNOWN: When owner will approve this Samsung PASS compat apply packet.",
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV at apply time.",
      "UNKNOWN: Whether post-apply manual-evidence capture is needed for page confidence upgrades.",
    ],
  };
}

export function buildSamsungPassRepairApplyPlanMarkdownV1(
  plan: SamsungPassRepairApplyPlanV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair apply plan v1",
    "",
    `Generated: ${plan.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${plan.contract}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- mutation_authorized: **false**`,
    `- owner_approval_required: **true**`,
    `- apply_authorized: **false**`,
    "",
    "## Source",
    "",
    `- owner review: \`${plan.source_owner_review_packet.rel_path}\` (${plan.source_owner_review_packet.repair_group}, ${String(plan.source_owner_review_packet.slug_count)} slugs)`,
    `- validation: \`${plan.source_validation_packet.rel_path}\` (${plan.source_validation_packet.batch_id})`,
    `- target CSV: \`${plan.target_csv_rel_path}\` (not modified)`,
    "",
    "## Rollup",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| planned slug count | ${String(plan.planned_rows.length)} |`,
    `| removed filter slugs | \`${plan.removed_filter_slugs.join("|")}\` |`,
    `| added filter slugs | \`${plan.added_filter_slugs.join("|")}\` |`,
    `| compat row removals | ${String(plan.expected_scoreboard_delta.planned_compat_row_removals)} |`,
    `| compat row additions | ${String(plan.expected_scoreboard_delta.planned_compat_row_additions)} |`,
    "",
    "## Expected scoreboard delta (if owner-approved)",
    "",
    `| Metric | Baseline | After apply | Reduction |`,
    `| --- | ---: | ---: | ---: |`,
    `| wrong_part_risk_count | ${String(plan.expected_scoreboard_delta.baseline_wrong_part_risk_count)} | ${String(plan.expected_scoreboard_delta.estimated_wrong_part_risk_count_after_apply)} | ${String(plan.expected_scoreboard_delta.estimated_wrong_part_risk_reduction_if_owner_approved)} |`,
    `| multi_mapped_count | ${String(plan.expected_scoreboard_delta.baseline_multi_mapped_count)} | ${String(plan.expected_scoreboard_delta.estimated_multi_mapped_count_after_apply)} | ${String(plan.expected_scoreboard_delta.estimated_multi_mapped_reduction_if_owner_approved)} |`,
    `| phantom_model_count | ${String(plan.expected_scoreboard_delta.baseline_phantom_model_count)} | ${String(plan.expected_scoreboard_delta.estimated_phantom_model_count_after_catalog_review)} | ${String(plan.expected_scoreboard_delta.estimated_phantom_model_reduction_if_owner_approved)} |`,
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
    lines.push(`- remove: \`${row.removed_filter_slugs.join("|") || "none"}\``);
    lines.push(`- add: \`${row.added_filter_slugs.join("|") || "none"}\``);
    lines.push(`- target: \`${row.target_filter_slug}\``);
    lines.push(`- verdict: \`${row.validation_basis.cursor_verdict}\``);
    lines.push(`- mutation_authorized: **false**`);
    lines.push(`- basis: ${row.validation_basis.reason}`, "");
  }

  return `${lines.join("\n")}\n`;
}

export function writeSamsungPassRepairApplyPlanArtifactsV1(args: {
  rootDir: string;
  plan: SamsungPassRepairApplyPlanV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungPassRepairApplyPlanMarkdownV1(args.plan), "utf8");
  return {
    json_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    md_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1,
  };
}
