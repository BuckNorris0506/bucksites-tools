/**
 * Guarded refrigerator model-first compatibility_mappings.csv apply executor v1.
 * Applies ONLY the approved QA compat cleanup plan to data/compatibility_mappings.csv.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./refrigerator-model-first-batch-resolver-v1";
import { buildRefrigeratorModelFirstBatchResolverV1 } from "./refrigerator-model-first-batch-resolver-v1";
import {
  COMPAT_MAPPINGS_CSV_REL_V1,
  buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
  type PlannedCompatCsvRowChangeV1,
  type RefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
} from "./refrigerator-model-first-mapping-review-compat-apply-plan-v1";
import {
  detectRefrigeratorModelFirstQaBatchPostApplyV1,
} from "./refrigerator-model-first-qa-batch-post-apply-v1";

export const REFRIGERATOR_MODEL_FIRST_COMPAT_APPLY_EXECUTOR_CONTRACT_V1 =
  "refrigerator_model_first_mapping_review_compat_apply_executor_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1 =
  "I approve the refrigerator QA compatibility cleanup for the 20-model batch only" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_EXPECTED_COUNTS_V1 = {
  mapping_review_model_count: 20,
  total_planned_removals: 53,
  total_planned_additions: 10,
  total_planned_keeps: 16,
} as const;

export type CompatCsvRowV1 = { fridge_slug: string; filter_slug: string };

export type CompatApplyRowResultV1 = {
  csv_row_key: string;
  operation: "remove" | "add" | "keep";
  status: "applied" | "noop_already_absent" | "noop_already_present" | "verified_present";
};

export type RefrigeratorModelFirstCompatApplyExecutorResultV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_COMPAT_APPLY_EXECUTOR_CONTRACT_V1;
  mode: "dry_run" | "apply";
  data_mutation: boolean;
  target_csv_rel_path: typeof COMPAT_MAPPINGS_CSV_REL_V1;
  approval_phrase_required: typeof REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1;
  approval_provided: boolean;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "BLOCKED" | "ALREADY_APPLIED";
  blocked_reasons: string[];
  plan_inspect_summary: RefrigeratorModelFirstMappingReviewCompatApplyPlanV1["inspect_summary"];
  applied_removals: string[];
  noop_removals: string[];
  applied_additions: string[];
  noop_additions: string[];
  verified_keeps: string[];
  row_results: CompatApplyRowResultV1[];
  csv_row_count_before: number;
  csv_row_count_after: number;
  post_apply_resolver_inspect_summary: ReturnType<
    typeof buildRefrigeratorModelFirstBatchResolverV1
  >["inspect_summary"] | null;
  post_apply_confidence_explanation: string | null;
};

function rowKey(row: CompatCsvRowV1): string {
  return `${row.fridge_slug.trim().toLowerCase()},${row.filter_slug.trim().toLowerCase()}`;
}

function readCompatRows(rootDir: string): CompatCsvRowV1[] {
  const abs = path.join(rootDir, COMPAT_MAPPINGS_CSV_REL_V1);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CompatCsvRowV1[];
}

function writeCompatRows(rootDir: string, rows: CompatCsvRowV1[]): void {
  const abs = path.join(rootDir, COMPAT_MAPPINGS_CSV_REL_V1);
  const lines = ["fridge_slug,filter_slug"];
  for (const row of rows) {
    lines.push(`${row.fridge_slug.trim()},${row.filter_slug.trim()}`);
  }
  writeFileSync(abs, `${lines.join("\n")}\n`, "utf8");
}

function verifyPreApplyPlanCounts(
  plan: RefrigeratorModelFirstMappingReviewCompatApplyPlanV1,
): string[] {
  const expected = REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_EXPECTED_COUNTS_V1;
  const reasons: string[] = [];
  const summary = plan.inspect_summary;
  if (summary.mapping_review_model_count !== expected.mapping_review_model_count) {
    reasons.push(
      `mapping_review_model_count expected ${expected.mapping_review_model_count}, got ${summary.mapping_review_model_count}`,
    );
  }
  if (summary.total_planned_removals !== expected.total_planned_removals) {
    reasons.push(
      `total_planned_removals expected ${expected.total_planned_removals}, got ${summary.total_planned_removals}`,
    );
  }
  if (summary.total_planned_additions !== expected.total_planned_additions) {
    reasons.push(
      `total_planned_additions expected ${expected.total_planned_additions}, got ${summary.total_planned_additions}`,
    );
  }
  if (summary.total_planned_keeps !== expected.total_planned_keeps) {
    reasons.push(
      `total_planned_keeps expected ${expected.total_planned_keeps}, got ${summary.total_planned_keeps}`,
    );
  }
  return reasons;
}

function explainPostApplyConfidence(args: {
  inspect: ReturnType<typeof buildRefrigeratorModelFirstBatchResolverV1>["inspect_summary"];
}): string {
  const counts = args.inspect.confidence_counts;
  if (counts.MAPPING_REVIEW_REQUIRED > 0) {
    return (
      `After CSV reconcile, ${counts.MAPPING_REVIEW_REQUIRED} model(s) remain MAPPING_REVIEW_REQUIRED because legacy CSV slugs still do not fully match official manufacturer filter families under existing resolver rules — not forced to PASS/PROVEN.`
    );
  }
  if (counts.PROVEN > 0 && counts.UNKNOWN === 0) {
    return (
      `After CSV reconcile, resolver reports ${counts.PROVEN} PROVEN and ${counts.UNKNOWN} UNKNOWN under existing read-only rules — confidence comes from resolver logic, not manual promotion.`
    );
  }
  return `Post-apply resolver confidence: PROVEN=${counts.PROVEN}, UNKNOWN=${counts.UNKNOWN}, MAPPING_REVIEW_REQUIRED=${counts.MAPPING_REVIEW_REQUIRED}.`;
}

function buildAlreadyAppliedResult(args: {
  mode: "dry_run" | "apply";
  approvalProvided: boolean;
  blocked_reasons: string[];
  plan: RefrigeratorModelFirstMappingReviewCompatApplyPlanV1;
  resolver: ReturnType<typeof buildRefrigeratorModelFirstBatchResolverV1>;
  csv_row_count_before: number;
}): RefrigeratorModelFirstCompatApplyExecutorResultV1 {
  const apply_status: RefrigeratorModelFirstCompatApplyExecutorResultV1["apply_status"] =
    args.blocked_reasons.length > 0
      ? "BLOCKED"
      : args.mode === "apply"
        ? "ALREADY_APPLIED"
        : "DRY_RUN_READY";

  return {
    contract: REFRIGERATOR_MODEL_FIRST_COMPAT_APPLY_EXECUTOR_CONTRACT_V1,
    mode: args.mode,
    data_mutation: false,
    target_csv_rel_path: COMPAT_MAPPINGS_CSV_REL_V1,
    approval_phrase_required: REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1,
    approval_provided: args.approvalProvided,
    apply_status,
    blocked_reasons: args.blocked_reasons,
    plan_inspect_summary: args.plan.inspect_summary,
    applied_removals: [],
    noop_removals: [],
    applied_additions: [],
    noop_additions: [],
    verified_keeps: [],
    row_results: [],
    csv_row_count_before: args.csv_row_count_before,
    csv_row_count_after: args.csv_row_count_before,
    post_apply_resolver_inspect_summary: args.resolver.inspect_summary,
    post_apply_confidence_explanation:
      args.mode === "dry_run"
        ? "Post-apply: approved 20-model QA compat cleanup already applied — no remaining approved CSV changes for this batch."
        : explainPostApplyConfidence({ inspect: args.resolver.inspect_summary }),
  };
}

export function runRefrigeratorModelFirstCompatApplyExecutorV1(args: {
  rootDir: string;
  manifestRelPath?: string;
  mode: "dry_run" | "apply";
  approvalPhrase?: string | null;
  now?: () => Date;
}): RefrigeratorModelFirstCompatApplyExecutorResultV1 {
  const manifestRelPath = args.manifestRelPath ?? REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  const blocked_reasons: string[] = [];
  const approvalProvided =
    (args.approvalPhrase ?? "").trim() === REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1;

  if (args.mode === "apply" && !approvalProvided) {
    blocked_reasons.push(
      `Missing or invalid approval phrase — must exactly match: ${REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1}`,
    );
  }

  const plan = buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1({
    rootDir: args.rootDir,
    manifestRelPath,
    now: args.now,
  });

  const resolver = buildRefrigeratorModelFirstBatchResolverV1({
    rootDir: args.rootDir,
    manifestRelPath,
    now: args.now,
  });
  const postApplyState = detectRefrigeratorModelFirstQaBatchPostApplyV1({ resolver });
  const rowsBefore = readCompatRows(args.rootDir);
  const csv_row_count_before = rowsBefore.length;

  if (postApplyState) {
    if (plan.inspect_summary.total_planned_removals > 0) {
      blocked_reasons.push(
        `Post-apply state but forward plan still lists ${String(plan.inspect_summary.total_planned_removals)} pending removal(s)`,
      );
    }
    if (plan.inspect_summary.total_planned_additions > 0) {
      blocked_reasons.push(
        `Post-apply state but forward plan still lists ${String(plan.inspect_summary.total_planned_additions)} pending addition(s)`,
      );
    }

    return buildAlreadyAppliedResult({
      mode: args.mode,
      approvalProvided,
      blocked_reasons,
      plan,
      resolver,
      csv_row_count_before,
    });
  }

  blocked_reasons.push(...verifyPreApplyPlanCounts(plan));

  const batchSlugs = new Set(plan.rows.map((row) => row.fridge_slug.trim().toLowerCase()));
  for (const change of [
    ...plan.planned_compat_csv_row_removals,
    ...plan.planned_compat_csv_row_additions,
  ]) {
    if (!batchSlugs.has(change.fridge_slug)) {
      blocked_reasons.push(`Planned change targets non-batch fridge_slug: ${change.fridge_slug}`);
    }
  }

  let workingRows = rowsBefore.map((row) => ({
    fridge_slug: row.fridge_slug.trim(),
    filter_slug: row.filter_slug.trim(),
  }));

  const applied_removals: string[] = [];
  const noop_removals: string[] = [];
  const applied_additions: string[] = [];
  const noop_additions: string[] = [];
  const verified_keeps: string[] = [];
  const row_results: CompatApplyRowResultV1[] = [];

  function currentKeys(): Set<string> {
    return new Set(workingRows.map((row) => rowKey(row)));
  }

  function applyRemoval(removal: PlannedCompatCsvRowChangeV1): void {
    const key = removal.csv_row_key;
    const index = workingRows.findIndex((row) => rowKey(row) === key);
    if (index === -1) {
      noop_removals.push(key);
      row_results.push({ csv_row_key: key, operation: "remove", status: "noop_already_absent" });
      return;
    }
    workingRows = workingRows.filter((_, i) => i !== index);
    applied_removals.push(key);
    row_results.push({ csv_row_key: key, operation: "remove", status: "applied" });
  }

  function applyAddition(addition: PlannedCompatCsvRowChangeV1): void {
    const key = addition.csv_row_key;
    if (currentKeys().has(key)) {
      noop_additions.push(key);
      row_results.push({ csv_row_key: key, operation: "add", status: "noop_already_present" });
      return;
    }
    workingRows.push({
      fridge_slug: addition.fridge_slug,
      filter_slug: addition.filter_slug,
    });
    applied_additions.push(key);
    row_results.push({ csv_row_key: key, operation: "add", status: "applied" });
  }

  function applyKeep(keepKey: string): void {
    if (currentKeys().has(keepKey)) {
      verified_keeps.push(keepKey);
      row_results.push({ csv_row_key: keepKey, operation: "keep", status: "verified_present" });
      return;
    }
    blocked_reasons.push(`Expected keep row missing from CSV before apply: ${keepKey}`);
    row_results.push({ csv_row_key: keepKey, operation: "keep", status: "noop_already_absent" });
  }

  if (blocked_reasons.length === 0) {
    for (const keepKey of plan.rows.flatMap((row) => row.planned_keeps)) {
      applyKeep(keepKey);
    }
    if (blocked_reasons.length === 0) {
      for (const removal of plan.planned_compat_csv_row_removals) {
        applyRemoval(removal);
      }
      for (const addition of plan.planned_compat_csv_row_additions) {
        applyAddition(addition);
      }
    }
  }

  const csv_row_count_after = workingRows.length;

  let post_apply_resolver_inspect_summary = null;
  let post_apply_confidence_explanation = null;

  const readyToMutate = blocked_reasons.length === 0;

  if (args.mode === "apply" && readyToMutate) {
    writeCompatRows(args.rootDir, workingRows);
    const postApplyResolver = buildRefrigeratorModelFirstBatchResolverV1({
      rootDir: args.rootDir,
      manifestRelPath,
      now: args.now,
    });
    post_apply_resolver_inspect_summary = postApplyResolver.inspect_summary;
    post_apply_confidence_explanation = explainPostApplyConfidence({
      inspect: postApplyResolver.inspect_summary,
    });
  } else if (args.mode === "dry_run" && readyToMutate) {
    post_apply_resolver_inspect_summary = resolver.inspect_summary;
    post_apply_confidence_explanation =
      "Dry run — resolver state reflects pre-apply CSV; run with mode=apply and valid approval to mutate CSV and re-check confidence.";
  }

  const apply_status: RefrigeratorModelFirstCompatApplyExecutorResultV1["apply_status"] =
    blocked_reasons.length > 0 ? "BLOCKED" : args.mode === "apply" ? "APPLIED" : "DRY_RUN_READY";

  return {
    contract: REFRIGERATOR_MODEL_FIRST_COMPAT_APPLY_EXECUTOR_CONTRACT_V1,
    mode: args.mode,
    data_mutation: args.mode === "apply" && blocked_reasons.length === 0,
    target_csv_rel_path: COMPAT_MAPPINGS_CSV_REL_V1,
    approval_phrase_required: REFRIGERATOR_MODEL_FIRST_QA_COMPAT_APPLY_APPROVAL_PHRASE_V1,
    approval_provided: approvalProvided,
    apply_status,
    blocked_reasons,
    plan_inspect_summary: plan.inspect_summary,
    applied_removals,
    noop_removals,
    applied_additions,
    noop_additions,
    verified_keeps,
    row_results,
    csv_row_count_before,
    csv_row_count_after,
    post_apply_resolver_inspect_summary,
    post_apply_confidence_explanation,
  };
}
