/**
 * Guarded Samsung PASS repair compatibility_mappings.csv apply executor v1.
 * Default dry-run; real apply requires --apply and validated founder decision registry approval.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  type SamsungPassRepairApplyPlanV1,
  type SamsungPassRepairPlannedRowV1,
} from "./samsung-pass-repair-apply-plan-v1";

export const SAMSUNG_PASS_REPAIR_GUARDED_APPLY_CONTRACT_V1 =
  "samsung_pass_repair_guarded_apply_v1" as const;

export const SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/samsung-pass-repair-owner-approval-v1.json" as const;

export const SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/samsung-pass-repair-guarded-apply-v1.json" as const;

export const SAMSUNG_PASS_GUARDED_APPLY_REPORT_MD_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/samsung-pass-repair-guarded-apply-v1.md" as const;

export const SAMSUNG_PASS_GUARDED_APPLY_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-guarded-apply" as const;

export const SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1 = {
  planned_slug_count: 5,
  planned_removals: 6,
  planned_additions: 5,
} as const;

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
  removed_filter_slugs: string[];
  added_filter_slugs: string[];
};

export type SamsungPassRepairGuardedApplyReportV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  data_mutation: boolean;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  apply_plan_rel_path: string;
  owner_approval_rel_path: string;
  target_csv_rel_path: string;
  owner_approval_decision_id: string | null;
  owner_approval_valid: boolean;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  applied_removals: string[];
  applied_additions: string[];
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

type SamsungPassOwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  apply_plan_rel_path?: string;
  approved_slug_count?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  samsung_pass_repair_owner_approval_context_v1?: SamsungPassOwnerApprovalContextV1;
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

function writeCompatRows(absPath: string, rows: CompatCsvRowV1[], writeText: (p: string, c: string) => void): void {
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

function buildPlannedChanges(plan: SamsungPassRepairApplyPlanV1): {
  removals: PlannedCompatRowChangeV1[];
  additions: PlannedCompatRowChangeV1[];
  diff: BeforeAfterDiffRowV1[];
} {
  const removals: PlannedCompatRowChangeV1[] = [];
  const additions: PlannedCompatRowChangeV1[] = [];
  const diff: BeforeAfterDiffRowV1[] = [];

  for (const row of plan.planned_rows) {
    diff.push({
      fridge_slug: row.fridge_slug,
      before_mappings: [...row.before_mappings],
      after_mappings: [...row.after_mappings],
      removed_filter_slugs: [...row.removed_filter_slugs],
      added_filter_slugs: [...row.added_filter_slugs],
    });
    for (const filter of row.removed_filter_slugs) {
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

  return { removals, additions, diff };
}

function loadApplyPlan(rootDir: string, relPath: string, readText: (p: string) => string): SamsungPassRepairApplyPlanV1 {
  const plan = JSON.parse(readText(path.join(rootDir, relPath))) as SamsungPassRepairApplyPlanV1;
  if (plan.contract !== SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1) {
    throw new Error("Samsung PASS apply plan contract mismatch");
  }
  return plan;
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

    const ctx = row.samsung_pass_repair_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_apply_plan") continue;
    if (ctx?.apply_plan_rel_path !== args.applyPlanRelPath) {
      errors.push(
        `owner approval apply_plan_rel_path mismatch: expected ${args.applyPlanRelPath}, got ${ctx?.apply_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (!isFounderRegistryRowActiveMutationApproval(rowValidation.row, args.referenceTimeIso)) {
      errors.push("owner approval row is not an active mutation approval (expired or review_after due)");
      continue;
    }
    return { row, errors: [] };
  }

  errors.push("no matching owner approval row with approve_apply_plan for this apply plan");
  return { row: null, errors };
}

function verifyBeforeMappings(args: {
  plan: SamsungPassRepairApplyPlanV1;
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

function buildRollbackInstructions(changes: {
  removals: PlannedCompatRowChangeV1[];
  additions: PlannedCompatRowChangeV1[];
}): string[] {
  return [
    "To rollback this Samsung PASS guarded apply, reverse the CSV row edits on data/compatibility_mappings.csv only:",
    ...changes.additions.map(
      (row) => `REMOVE rollback row: ${row.csv_row_key} (undo planned addition)`,
    ),
    ...changes.removals.map(
      (row) => `ADD rollback row: ${row.csv_row_key} (restore planned removal)`,
    ),
    "Re-run dry-run after rollback to confirm before_mappings match the apply plan again.",
    "Rollback does not mutate Supabase, filters.csv, fridge_models.csv, manual evidence, pages, retailer links, sitemap/robots, or HQ handoff.",
  ];
}

export type RunSamsungPassRepairGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  applyPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  compatCsvRelPath?: string;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
};

export function runSamsungPassRepairGuardedApplyV1(
  deps: RunSamsungPassRepairGuardedApplyDepsV1,
): SamsungPassRepairGuardedApplyReportV1 {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const writeText = deps.writeText ?? ((absPath: string, content: string) => writeFileSync(absPath, content, "utf8"));

  const applyPlanRelPath = deps.applyPlanRelPath ?? SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath = deps.ownerApprovalRelPath ?? SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];
  const plan = loadApplyPlan(deps.rootDir, applyPlanRelPath, readText);
  const targetCsvRelPath = plan.target_csv_rel_path;
  const compatCsvRelPath = deps.compatCsvRelPath ?? targetCsvRelPath;
  const compatAbsPath = path.join(deps.rootDir, compatCsvRelPath);

  if (plan.planned_rows.length !== SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_slug_count) {
    blocked_reasons.push(
      `planned_slug_count expected ${String(SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_rows.length)}`,
    );
  }

  const { removals, additions, diff } = buildPlannedChanges(plan);
  if (removals.length !== SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_removals) {
    blocked_reasons.push(
      `planned_removals expected ${String(SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_removals)}, got ${String(removals.length)}`,
    );
  }
  if (additions.length !== SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_additions) {
    blocked_reasons.push(
      `planned_additions expected ${String(SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_additions)}, got ${String(additions.length)}`,
    );
  }

  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    applyPlanRelPath,
    referenceTimeIso: generatedAt,
    readText,
  });
  if (!approval.row) {
    blocked_reasons.push(...approval.errors);
  }

  if (deps.mode === "apply" && !approval.row) {
    blocked_reasons.push("apply mode blocked — owner_mutation_approved decision row required");
  }

  const rowsBefore = readCompatRows(compatAbsPath, readText);
  const csv_row_count_before = rowsBefore.length;
  const beforeBySlug = mappingsBySlug(rowsBefore);
  blocked_reasons.push(...verifyBeforeMappings({ plan, bySlug: beforeBySlug }));

  const plannedSlugs = new Set(plan.planned_rows.map((row) => normalizeSlug(row.fridge_slug)));
  const untouchedBefore = rowsBefore
    .filter((row) => !plannedSlugs.has(normalizeSlug(row.fridge_slug)))
    .map((row) => rowKey(row))
    .sort();

  let workingRows = rowsBefore.map((row) => ({
    fridge_slug: row.fridge_slug.trim(),
    filter_slug: row.filter_slug.trim(),
  }));

  const applied_removals: string[] = [];
  const applied_additions: string[] = [];
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
      applied_removals.push(key);
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
      applied_additions.push(key);
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
  }

  const csv_row_count_after = workingRows.length;
  const ready = blocked_reasons.length === 0;

  if (deps.mode === "apply" && ready) {
    writeCompatRows(compatAbsPath, workingRows, writeText);
  }

  const apply_status: SamsungPassRepairGuardedApplyReportV1["apply_status"] = !ready
    ? "BLOCKED"
    : deps.mode === "apply"
      ? "APPLIED"
      : "DRY_RUN_READY";

  return {
    contract: SAMSUNG_PASS_REPAIR_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    data_mutation: deps.mode === "apply" && ready,
    apply_status,
    blocked_reasons,
    apply_plan_rel_path: applyPlanRelPath,
    owner_approval_rel_path: ownerApprovalRelPath,
    target_csv_rel_path: compatCsvRelPath,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_valid: approval.row != null,
    planned_slug_count: plan.planned_rows.length,
    planned_removals: removals.length,
    planned_additions: additions.length,
    applied_removals,
    applied_additions,
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
      `PROVEN: owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}.`,
      `PROVEN: untouched_slug_row_keys_count=${String(untouchedBefore.length)} (non-planned rows preserved in dry-run/apply simulation).`,
      ready
        ? "PROVEN: before_mappings matched apply plan; simulated after_mappings match planned targets."
        : "PROVEN: apply blocked before CSV mutation.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV after apply.",
      "UNKNOWN: Whether post-apply manual-evidence or page updates are needed for the 5 slugs.",
    ],
  };
}

export function buildSamsungPassRepairGuardedApplyMarkdownV1(
  report: SamsungPassRepairGuardedApplyReportV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair guarded apply v1",
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
    `- owner_approval_decision_id: \`${report.owner_approval_decision_id ?? "none"}\``,
    "",
    "## Sources",
    "",
    `- apply_plan: \`${report.apply_plan_rel_path}\``,
    `- owner_approval: \`${report.owner_approval_rel_path}\``,
    `- target_csv: \`${report.target_csv_rel_path}\``,
    "",
    "## Planned changes",
    "",
    `- planned_slug_count: ${String(report.planned_slug_count)}`,
    `- planned_removals: ${String(report.planned_removals)}`,
    `- planned_additions: ${String(report.planned_additions)}`,
    `- csv_row_count_before: ${String(report.csv_row_count_before)}`,
    `- csv_row_count_after: ${String(report.csv_row_count_after)}`,
    `- untouched_slug_row_keys_count: ${String(report.untouched_slug_row_keys_count)}`,
    "",
    "## Before / after diff",
    "",
    "| fridge_slug | before | after | remove | add |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const row of report.before_after_diff) {
    lines.push(
      `| \`${row.fridge_slug}\` | \`${row.before_mappings.join("|")}\` | \`${row.after_mappings.join("|")}\` | \`${row.removed_filter_slugs.join("|")}\` | \`${row.added_filter_slugs.join("|")}\` |`,
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

export function writeSamsungPassRepairGuardedApplyReportV1(args: {
  rootDir: string;
  report: SamsungPassRepairGuardedApplyReportV1;
  jsonRelPath?: string;
  mdRelPath?: string;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = args.jsonRelPath ?? SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1;
  const mdRel = args.mdRelPath ?? SAMSUNG_PASS_GUARDED_APPLY_REPORT_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungPassRepairGuardedApplyMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
