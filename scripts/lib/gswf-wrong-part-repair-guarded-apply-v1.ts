/**
 * Guarded GSWF wrong-part repair compatibility_mappings.csv apply executor v1.
 * Default dry-run; real apply requires --apply and validated founder decision registry approval.
 * This lane designs/validates the executor — dry-run does not mutate CSV.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
  type GswfWrongPartRepairApplyPlanOwnerReviewV1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_WRONG_PART_REPAIR_GUARDED_APPLY_CONTRACT_V1 =
  "gswf_wrong_part_repair_guarded_apply_v1" as const;

export const GSWF_WRONG_PART_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/gswf-wrong-part-repair-owner-approval-v1.json" as const;

export const GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-guarded-apply-dry-run-v1.json" as const;

export const GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-guarded-apply-dry-run-v1.md" as const;

export const GSWF_WRONG_PART_GUARDED_APPLY_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-wrong-part-repair-guarded-apply" as const;

export const GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1 = {
  planned_slug_count: 13,
  planned_removals: 26,
  planned_additions: 13,
} as const;

export const GSWF_WRONG_PART_GUARDED_APPLY_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1,
  GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_MD_REL_V1,
] as const;

export type CompatCsvRowV1 = { fridge_slug: string; filter_slug: string };

export type PlannedCompatRowChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  csv_row_key: string;
};

export type CompatApplyRowResultV1 = {
  csv_row_key: string;
  operation: "remove" | "add";
  status: "planned" | "applied" | "noop_already_absent" | "noop_already_present";
};

export type BeforeAfterDiffRowV1 = {
  fridge_slug: string;
  before_mappings: string[];
  after_mappings: string[];
  wrong_part_removals: string[];
  added_filter_slugs: string[];
  preserved_mappings: string[];
  proposed_remap_target_filter_slug: string | null;
};

export type GswfWrongPartRepairGuardedApplyReportV1 = {
  contract: typeof GSWF_WRONG_PART_REPAIR_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  data_mutation: boolean;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  apply_plan_rel_path: string;
  owner_approval_rel_path: string;
  target_csv_rel_path: string;
  owner_approval_decision_id: string | null;
  owner_approval_valid: boolean;
  owner_approval_required_for_apply: true;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  excluded_slugs_untouched: string[];
  planned_csv_row_deltas: PlannedCompatRowChangeV1[];
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  row_results: CompatApplyRowResultV1[];
  before_after_diff: BeforeAfterDiffRowV1[];
  csv_row_count_before: number;
  csv_row_count_after: number;
  untouched_slug_row_keys_count: number;
  rollback_instructions: string[];
  generated_at: string;
  proven_facts: string[];
  unknown_facts: string[];
};

type GswfWrongPartOwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  apply_plan_rel_path?: string;
  approved_slug_count?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  gswf_wrong_part_repair_owner_approval_context_v1?: GswfWrongPartOwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(row: CompatCsvRowV1): string {
  return `${normalizeSlug(row.fridge_slug)},${normalizeSlug(row.filter_slug)}`;
}

function parseRowKey(key: string): { fridge_slug: string; filter_slug: string } {
  const comma = key.indexOf(",");
  if (comma === -1) {
    throw new Error(`Invalid compat row key: ${key}`);
  }
  return {
    fridge_slug: key.slice(0, comma).trim().toLowerCase(),
    filter_slug: key.slice(comma + 1).trim().toLowerCase(),
  };
}

function readCompatRows(absPath: string, readText: (p: string) => string): CompatCsvRowV1[] {
  return parse(readText(absPath), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CompatCsvRowV1[];
}

function writeCompatRows(
  absPath: string,
  rows: CompatCsvRowV1[],
  writeText: (p: string, c: string) => void,
): void {
  const lines = ["fridge_slug,filter_slug"];
  for (const row of rows) {
    lines.push(`${row.fridge_slug.trim()},${row.filter_slug.trim()}`);
  }
  writeText(absPath, `${lines.join("\n")}\n`);
}

function mappingsBySlug(rows: CompatCsvRowV1[]): Map<string, string[]> {
  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = normalizeSlug(row.fridge_slug);
    const filter = normalizeSlug(row.filter_slug);
    const existing = bySlug.get(slug) ?? [];
    existing.push(filter);
    bySlug.set(slug, existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, Array.from(new Set(filters)).sort());
  }
  return bySlug;
}

function loadApplyPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): GswfWrongPartRepairApplyPlanOwnerReviewV1 {
  const plan = JSON.parse(readText(path.join(rootDir, relPath))) as GswfWrongPartRepairApplyPlanOwnerReviewV1;
  if (plan.contract !== GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("GSWF wrong-part apply plan contract mismatch");
  }
  return plan;
}

function buildPlannedChanges(plan: GswfWrongPartRepairApplyPlanOwnerReviewV1): {
  removals: PlannedCompatRowChangeV1[];
  additions: PlannedCompatRowChangeV1[];
  diff: BeforeAfterDiffRowV1[];
  planShapeErrors: string[];
} {
  const removals: PlannedCompatRowChangeV1[] = [];
  const additions: PlannedCompatRowChangeV1[] = [];
  const diff: BeforeAfterDiffRowV1[] = [];
  const planShapeErrors: string[] = [];
  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);

  for (const row of plan.planned_rows) {
    if (row.source_row_category !== "proven_wrong_part_repair") {
      planShapeErrors.push(
        `planned row ${row.fridge_slug} has source_row_category=${row.source_row_category}, expected proven_wrong_part_repair`,
      );
    }

    for (const filter of row.wrong_part_removals) {
      const filter_slug = normalizeSlug(filter);
      if (!family.has(filter_slug)) {
        planShapeErrors.push(
          `planned removal for ${row.fridge_slug} is not gswf/gswf2: ${filter_slug}`,
        );
      }
    }

    const remap = row.proposed_remap_target_filter_slug
      ? normalizeSlug(row.proposed_remap_target_filter_slug)
      : null;
    for (const filter of row.added_filter_slugs) {
      const filter_slug = normalizeSlug(filter);
      if (!remap || filter_slug !== remap) {
        planShapeErrors.push(
          `planned addition for ${row.fridge_slug} (${filter_slug}) does not match proposed_remap_target_filter_slug (${remap ?? "null"})`,
        );
      }
    }

    diff.push({
      fridge_slug: row.fridge_slug,
      before_mappings: [...row.before_mappings],
      after_mappings: [...row.after_mappings],
      wrong_part_removals: [...row.wrong_part_removals],
      added_filter_slugs: [...row.added_filter_slugs],
      preserved_mappings: [...row.preserved_mappings],
      proposed_remap_target_filter_slug: row.proposed_remap_target_filter_slug,
    });

    for (const filter of row.wrong_part_removals) {
      const fridge_slug = normalizeSlug(row.fridge_slug);
      const filter_slug = normalizeSlug(filter);
      removals.push({
        operation: "remove",
        fridge_slug,
        filter_slug,
        csv_row_key: `${fridge_slug},${filter_slug}`,
      });
    }
    for (const filter of row.added_filter_slugs) {
      const fridge_slug = normalizeSlug(row.fridge_slug);
      const filter_slug = normalizeSlug(filter);
      additions.push({
        operation: "add",
        fridge_slug,
        filter_slug,
        csv_row_key: `${fridge_slug},${filter_slug}`,
      });
    }
  }

  return { removals, additions, diff, planShapeErrors };
}

function findOwnerApprovalRow(args: {
  rootDir: string;
  relPath: string;
  applyPlanRelPath: string;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { row: RawRegistryRowV1 | null; errors: string[] } {
  const errors: string[] = [];
  const approvalAbs = path.join(args.rootDir, args.relPath);
  if (!existsSync(approvalAbs)) {
    return { row: null, errors: [`owner approval file missing: ${args.relPath}`] };
  }
  const doc = JSON.parse(args.readText(approvalAbs)) as {
    rows?: unknown[];
  };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return { row: null, errors: [`owner approval document invalid: ${validated.errors.join("; ")}`] };
  }

  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) {
      continue;
    }
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;

    const ctx = row.gswf_wrong_part_repair_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_apply_plan") continue;
    if (ctx?.apply_plan_rel_path !== args.applyPlanRelPath) {
      errors.push(
        `owner approval apply_plan_rel_path mismatch: expected ${args.applyPlanRelPath}, got ${ctx?.apply_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: rowValidation.row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) {
      errors.push(`owner approval row fails mutation approval gate: ${gate.blockers.join(",")}`);
      continue;
    }
    return { row, errors: [] };
  }

  errors.push("no matching owner approval row with approve_apply_plan for this apply plan");
  return { row: null, errors };
}

function verifyBeforeMappings(args: {
  plan: GswfWrongPartRepairApplyPlanOwnerReviewV1;
  bySlug: Map<string, string[]>;
}): string[] {
  const errors: string[] = [];
  for (const row of args.plan.planned_rows) {
    const slug = normalizeSlug(row.fridge_slug);
    const current = args.bySlug.get(slug) ?? [];
    const expected = [...row.before_mappings].map(normalizeSlug).sort();
    if (JSON.stringify(current) !== JSON.stringify(expected)) {
      errors.push(
        `before_mappings mismatch for ${slug}: CSV has ${current.join("|") || "none"}, plan expects ${expected.join("|")}`,
      );
    }
  }
  return errors;
}

function verifyExcludedRowsUntouched(args: {
  plan: GswfWrongPartRepairApplyPlanOwnerReviewV1;
  plannedSlugs: Set<string>;
  removals: PlannedCompatRowChangeV1[];
  additions: PlannedCompatRowChangeV1[];
}): { errors: string[]; excludedSlugs: string[] } {
  const excluded = [
    ...(args.plan.excluded_from_plan?.partial_browser_proof_required_slugs ??
      GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1),
    ...(args.plan.excluded_from_plan?.no_filter_suppression_slugs ??
      GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1),
  ].map(normalizeSlug);
  const errors: string[] = [];

  for (const slug of excluded) {
    if (args.plannedSlugs.has(slug)) {
      errors.push(`excluded slug ${slug} appears in planned_rows`);
    }
  }
  for (const change of [...args.removals, ...args.additions]) {
    if (excluded.includes(change.fridge_slug)) {
      errors.push(`planned change touches excluded slug ${change.fridge_slug}: ${change.csv_row_key}`);
    }
  }

  return { errors, excludedSlugs: Array.from(new Set(excluded)).sort() };
}

function buildRollbackInstructions(changes: {
  removals: PlannedCompatRowChangeV1[];
  additions: PlannedCompatRowChangeV1[];
}): string[] {
  return [
    "To rollback a future GSWF wrong-part guarded apply, reverse the CSV row edits on data/compatibility_mappings.csv only:",
    ...changes.additions.map(
      (row) => `REMOVE rollback row: ${row.csv_row_key} (undo planned addition)`,
    ),
    ...changes.removals.map(
      (row) => `ADD rollback row: ${row.csv_row_key} (restore planned removal)`,
    ),
    "Re-run dry-run after rollback to confirm before_mappings match the apply plan again.",
    "Rollback does not mutate Supabase, filters.csv, fridge_models.csv, manual evidence, pages, retailer links, sitemap/robots, buy CTA, or HQ handoff.",
  ];
}

export type RunGswfWrongPartRepairGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  applyPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  compatCsvRelPath?: string;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
};

export function runGswfWrongPartRepairGuardedApplyV1(
  deps: RunGswfWrongPartRepairGuardedApplyDepsV1,
): GswfWrongPartRepairGuardedApplyReportV1 {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const writeText =
    deps.writeText ?? ((absPath: string, content: string) => writeFileSync(absPath, content, "utf8"));

  const applyPlanRelPath =
    deps.applyPlanRelPath ?? GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? GSWF_WRONG_PART_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];
  const plan = loadApplyPlan(deps.rootDir, applyPlanRelPath, readText);
  const targetCsvRelPath = plan.target_csv_rel_path;
  const compatCsvRelPath = deps.compatCsvRelPath ?? targetCsvRelPath;
  const compatAbsPath = path.join(deps.rootDir, compatCsvRelPath);

  if (plan.planned_rows.length !== GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_slug_count) {
    blocked_reasons.push(
      `planned_slug_count expected ${String(GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_rows.length)}`,
    );
  }

  const plannedSlugList = plan.planned_rows.map((row) => normalizeSlug(row.fridge_slug)).sort();
  const expectedSlugList = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(plannedSlugList) !== JSON.stringify(expectedSlugList)) {
    blocked_reasons.push(
      `planned slug set mismatch — expected ${expectedSlugList.join(", ")}, got ${plannedSlugList.join(", ")}`,
    );
  }

  const { removals, additions, diff, planShapeErrors } = buildPlannedChanges(plan);
  blocked_reasons.push(...planShapeErrors);

  if (removals.length !== GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_removals) {
    blocked_reasons.push(
      `planned_removals expected ${String(GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_removals)}, got ${String(removals.length)}`,
    );
  }
  if (additions.length !== GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_additions) {
    blocked_reasons.push(
      `planned_additions expected ${String(GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_additions)}, got ${String(additions.length)}`,
    );
  }

  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    applyPlanRelPath,
    referenceTimeIso: generatedAt,
    readText,
  });

  // Dry-run may proceed without owner approval; apply mode requires it.
  if (deps.mode === "apply" && !approval.row) {
    blocked_reasons.push(...approval.errors);
    blocked_reasons.push("apply mode blocked — owner_mutation_approved decision row required");
  }

  const rowsBefore = readCompatRows(compatAbsPath, readText);
  const csv_row_count_before = rowsBefore.length;
  const beforeBySlug = mappingsBySlug(rowsBefore);
  blocked_reasons.push(...verifyBeforeMappings({ plan, bySlug: beforeBySlug }));

  const plannedSlugs = new Set(plan.planned_rows.map((row) => normalizeSlug(row.fridge_slug)));
  const excludedCheck = verifyExcludedRowsUntouched({
    plan,
    plannedSlugs,
    removals,
    additions,
  });
  blocked_reasons.push(...excludedCheck.errors);

  const untouchedBefore = rowsBefore
    .filter((row) => !plannedSlugs.has(normalizeSlug(row.fridge_slug)))
    .map((row) => rowKey(row))
    .sort();

  let workingRows = rowsBefore.map((row) => ({
    fridge_slug: row.fridge_slug.trim(),
    filter_slug: row.filter_slug.trim(),
  }));

  const planned_removal_row_keys: string[] = [];
  const planned_addition_row_keys: string[] = [];
  const row_results: CompatApplyRowResultV1[] = [];

  function currentKeys(): Set<string> {
    return new Set(workingRows.map((row) => rowKey(row)));
  }

  if (blocked_reasons.length === 0) {
    for (const removal of removals) {
      const key = removal.csv_row_key;
      const index = workingRows.findIndex((row) => rowKey(row) === key);
      if (index === -1) {
        blocked_reasons.push(`planned removal missing from CSV: ${key}`);
        row_results.push({ csv_row_key: key, operation: "remove", status: "noop_already_absent" });
        continue;
      }
      workingRows = workingRows.filter((_, i) => i !== index);
      planned_removal_row_keys.push(key);
      row_results.push({
        csv_row_key: key,
        operation: "remove",
        status: deps.mode === "apply" ? "applied" : "planned",
      });
    }

    for (const addition of additions) {
      const key = addition.csv_row_key;
      if (currentKeys().has(key)) {
        blocked_reasons.push(`planned addition already present in CSV: ${key}`);
        row_results.push({ csv_row_key: key, operation: "add", status: "noop_already_present" });
        continue;
      }
      const parsed = parseRowKey(key);
      workingRows.push({
        fridge_slug: parsed.fridge_slug,
        filter_slug: parsed.filter_slug,
      });
      planned_addition_row_keys.push(key);
      row_results.push({
        csv_row_key: key,
        operation: "add",
        status: deps.mode === "apply" ? "applied" : "planned",
      });
    }

    const afterBySlug = mappingsBySlug(workingRows);
    for (const row of plan.planned_rows) {
      const slug = normalizeSlug(row.fridge_slug);
      const after = afterBySlug.get(slug) ?? [];
      const expected = [...row.after_mappings].map(normalizeSlug).sort();
      if (JSON.stringify(after) !== JSON.stringify(expected)) {
        blocked_reasons.push(
          `post-apply after_mappings mismatch for ${slug}: got ${after.join("|") || "none"}, expected ${expected.join("|")}`,
        );
      }
    }

    const untouchedAfter = workingRows
      .filter((row) => !plannedSlugs.has(normalizeSlug(row.fridge_slug)))
      .map((row) => rowKey(row))
      .sort();
    if (JSON.stringify(untouchedBefore) !== JSON.stringify(untouchedAfter)) {
      blocked_reasons.push("non-planned slug rows would be modified — apply blocked");
    }

    for (const slug of excludedCheck.excludedSlugs) {
      const before = beforeBySlug.get(slug) ?? [];
      const after = afterBySlug.get(slug) ?? [];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        blocked_reasons.push(`excluded slug mappings would change: ${slug}`);
      }
    }
  }

  const csv_row_count_after = workingRows.length;
  const ready = blocked_reasons.length === 0;

  if (deps.mode === "apply" && ready) {
    writeCompatRows(compatAbsPath, workingRows, writeText);
  }

  const apply_status: GswfWrongPartRepairGuardedApplyReportV1["apply_status"] = !ready
    ? "BLOCKED"
    : deps.mode === "apply"
      ? "APPLIED"
      : "DRY_RUN_READY";

  const planned_csv_row_deltas = [...removals, ...additions].sort((a, b) =>
    a.csv_row_key.localeCompare(b.csv_row_key),
  );

  return {
    contract: GSWF_WRONG_PART_REPAIR_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    data_mutation: deps.mode === "apply" && ready,
    apply_status,
    blocked_reasons,
    apply_plan_rel_path: applyPlanRelPath,
    owner_approval_rel_path: ownerApprovalRelPath,
    target_csv_rel_path: compatCsvRelPath,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_valid: approval.row != null,
    owner_approval_required_for_apply: true,
    planned_slug_count: plan.planned_rows.length,
    planned_removals: removals.length,
    planned_additions: additions.length,
    excluded_slugs_untouched: excludedCheck.excludedSlugs,
    planned_csv_row_deltas,
    planned_removal_row_keys,
    planned_addition_row_keys,
    row_results,
    before_after_diff: diff,
    csv_row_count_before,
    csv_row_count_after,
    untouched_slug_row_keys_count: untouchedBefore.length,
    rollback_instructions: buildRollbackInstructions({ removals, additions }),
    generated_at: generatedAt,
    proven_facts: [
      `PROVEN: mode=${deps.mode}; apply_status=${apply_status}; data_mutation=${String(deps.mode === "apply" && ready)}.`,
      `PROVEN: planned_removals=${String(removals.length)}; planned_additions=${String(additions.length)}; planned_slug_count=${String(plan.planned_rows.length)}.`,
      `PROVEN: owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}; apply requires owner approval.`,
      `PROVEN: excluded_slugs_untouched=${excludedCheck.excludedSlugs.join("|") || "none"}.`,
      `PROVEN: untouched_slug_row_keys_count=${String(untouchedBefore.length)} (non-planned rows preserved in dry-run/apply simulation).`,
      ready
        ? "PROVEN: before_mappings matched apply plan; simulated after_mappings match planned targets; removals limited to gswf/gswf2."
        : "PROVEN: apply/dry-run blocked before CSV mutation.",
    ],
    unknown_facts: [
      "UNKNOWN: When owner will create gswf-wrong-part-repair-owner-approval-v1.json.",
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV after a future apply.",
      "UNKNOWN: Whether post-apply caution-copy / buy-CTA policy changes are needed after compat repair.",
    ],
  };
}

export function buildGswfWrongPartRepairGuardedApplyMarkdownV1(
  report: GswfWrongPartRepairGuardedApplyReportV1,
): string {
  const lines: string[] = [
    "# GSWF wrong-part repair guarded apply dry-run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- owner_approval_valid: **${String(report.owner_approval_valid)}**`,
    `- owner_approval_required_for_apply: **true**`,
    `- owner_approval_decision_id: \`${report.owner_approval_decision_id ?? "none"}\``,
    "",
    "## Sources",
    "",
    `- apply_plan: \`${report.apply_plan_rel_path}\``,
    `- owner_approval: \`${report.owner_approval_rel_path}\``,
    `- target_csv: \`${report.target_csv_rel_path}\` (not modified in dry-run)`,
    "",
    "## Planned changes",
    "",
    `- planned_slug_count: ${String(report.planned_slug_count)}`,
    `- planned_removals: ${String(report.planned_removals)}`,
    `- planned_additions: ${String(report.planned_additions)}`,
    `- csv_row_count_before: ${String(report.csv_row_count_before)}`,
    `- csv_row_count_after: ${String(report.csv_row_count_after)}`,
    `- untouched_slug_row_keys_count: ${String(report.untouched_slug_row_keys_count)}`,
    `- excluded_slugs_untouched: \`${report.excluded_slugs_untouched.join("|")}\``,
    "",
    "## Exact CSV row deltas",
    "",
  ];

  for (const delta of report.planned_csv_row_deltas) {
    lines.push(`- **${delta.operation}** \`${delta.csv_row_key}\``);
  }

  lines.push(
    "",
    "## Before / after diff",
    "",
    "| fridge_slug | before | after | remove | add | preserved |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  for (const row of report.before_after_diff) {
    lines.push(
      `| \`${row.fridge_slug}\` | \`${row.before_mappings.join("|")}\` | \`${row.after_mappings.join("|")}\` | \`${row.wrong_part_removals.join("|")}\` | \`${row.added_filter_slugs.join("|")}\` | \`${row.preserved_mappings.join("|") || "none"}\` |`,
    );
  }

  lines.push("", "## Row results", "");
  for (const row of report.row_results) {
    lines.push(`- \`${row.csv_row_key}\` — ${row.operation} — ${row.status}`);
  }

  if (report.blocked_reasons.length > 0) {
    lines.push("", "## Blocked reasons", "", ...report.blocked_reasons.map((r) => `- ${r}`));
  }

  lines.push("", "## Rollback instructions", "", ...report.rollback_instructions.map((r) => `- ${r}`), "");

  return `${lines.join("\n")}\n`;
}

export function writeGswfWrongPartRepairGuardedApplyDryRunArtifactsV1(args: {
  rootDir: string;
  report: GswfWrongPartRepairGuardedApplyReportV1;
  jsonRelPath?: string;
  mdRelPath?: string;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = args.jsonRelPath ?? GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1;
  const mdRel = args.mdRelPath ?? GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildGswfWrongPartRepairGuardedApplyMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
