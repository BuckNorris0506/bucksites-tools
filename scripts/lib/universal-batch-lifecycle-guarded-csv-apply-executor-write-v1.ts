/**
 * Guarded CSV write-mode plan/apply for universal batch lifecycle executor.
 * PROVEN: only mutates when executeGuardedCsvWriteModeV1 is called with writeCsv=true.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  indexRetailerLinksBySlugV1,
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";

const EXPECTED_ROW_PATCH_COUNT_V1 = UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1;

export type GuardedCsvWriteModeMutationAuthInputV1 = {
  mutation_authorization_review_status: "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" | "BLOCKED";
  csv_apply_authorized: boolean;
  mutation_authorized: boolean;
  evidence_sufficiency_status: "PROVEN" | "BLOCKED";
  apply_executor_ready: boolean;
  required_founder_decision_packet_id: string;
  review_blockers: string[];
};

export type GuardedCsvWriteModeReadinessInputV1 = {
  apply_executor_ready: boolean;
  executor_status?: string;
  executor_blockers: string[];
};

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1 =
  "--write-csv" as const;

export const FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1 = [
  "filter_slug",
  "retailer_name",
  "affiliate_url",
  "is_primary",
  "sort_order",
  "retailer_key",
  "browser_truth_classification",
  "browser_truth_notes",
  "browser_truth_checked_at",
] as const;

export type GuardedCsvWritePlanRowV1 = {
  slug: string;
  row_index: number;
  before_row: RetailerLinkCsvRowV1;
  after_row: RetailerLinkCsvRowV1;
  rollback_row: RetailerLinkCsvRowV1;
};

export type GuardedCsvWritePlanV1 =
  | {
      ok: true;
      target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
      row_patches: GuardedCsvWritePlanRowV1[];
      rollback_patch_preview: GuardedCsvWritePlanRowV1[];
      target_row_indices: number[];
    }
  | { ok: false; blockers: string[] };

export type GuardedCsvPostWriteValidationV1 = {
  validation_status: "PROVEN" | "BLOCKED";
  validation_blockers: string[];
  target_rows_match_after_row: boolean;
  non_target_rows_unchanged: boolean;
};

export type GuardedCsvAppliedParityAssessmentV1 = {
  validation_status: "PROVEN" | "BLOCKED";
  validation_blockers: string[];
  target_rows_match_after_row: boolean;
  non_target_rows_unchanged: boolean;
  target_row_indices: number[];
};

export type ExecuteGuardedCsvWriteModeResultV1 =
  | {
      ok: true;
      rows_written: number;
      post_write_validation: GuardedCsvPostWriteValidationV1;
    }
  | { ok: false; blockers: string[] };

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function rowFieldEqual(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export function rowMatchesSnapshotV1(current: RetailerLinkCsvRowV1, snapshot: RetailerLinkCsvRowV1): boolean {
  for (const key of FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1) {
    if (!rowFieldEqual(current[key], snapshot[key])) return false;
  }
  return true;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function parseCsvHeadersFromTextV1(csvText: string): string[] {
  const firstLine = csvText.split(/\r?\n/)[0] ?? "";
  return firstLine.split(",").map((h) => h.trim());
}

export function serializeRetailerLinksCsvV1(
  headers: readonly string[],
  rows: readonly RetailerLinkCsvRowV1[],
): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function applyGuardedCsvWritePlanToCsvTextV1(args: {
  csvText: string;
  headers: readonly string[];
  rows: RetailerLinkCsvRowV1[];
  targetRowIndices: readonly number[];
}): string {
  const rawLines = args.csvText.split(/\r?\n/);
  const headerLine = rawLines[0] ?? args.headers.join(",");
  const dataLines = rawLines.slice(1).filter((line) => line.length > 0);
  const targetSet = new Set(args.targetRowIndices);

  if (dataLines.length !== args.rows.length) {
    return serializeRetailerLinksCsvV1(args.headers, args.rows);
  }

  const outLines = [headerLine];
  for (let i = 0; i < args.rows.length; i++) {
    if (targetSet.has(i)) {
      outLines.push(
        args.headers.map((h) => escapeCsvField(args.rows[i]![h] ?? "")).join(","),
      );
    } else {
      outLines.push(dataLines[i]!);
    }
  }
  return `${outLines.join("\n")}\n`;
}

function mergeAfterRowIntoPrimaryV1(
  primary: RetailerLinkCsvRowV1,
  after: RetailerLinkCsvRowV1,
): RetailerLinkCsvRowV1 {
  const merged = { ...primary };
  for (const key of FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1) {
    if (after[key] !== undefined) merged[key] = after[key];
  }
  return merged;
}

export function assessGuardedCsvWritePlanV1(args: {
  rootDir: string;
  rowPatches: readonly UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): GuardedCsvWritePlanV1 {
  const fileExists = args.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const blockers: string[] = [];
  const csvRows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const csvBySlug = indexRetailerLinksBySlugV1(csvRows);
  const plannedPatches: GuardedCsvWritePlanRowV1[] = [];
  const usedIndices = new Set<number>();

  for (const patch of args.rowPatches) {
    const slugKey = normalizeSlug(patch.slug);
    const slugRows = csvBySlug.get(slugKey) ?? [];
    const primaries = slugRows.filter(
      (row) => (row.is_primary ?? "").trim().toLowerCase() === "true",
    );
    if (primaries.length === 0) {
      blockers.push(`csv_primary_row_missing: slug=${patch.slug}`);
      continue;
    }
    if (primaries.length > 1) {
      blockers.push(`csv_primary_row_duplicate: slug=${patch.slug} count=${String(primaries.length)}`);
      continue;
    }
    const primary = primaries[0]!;
    const rowIndex = csvRows.indexOf(primary);
    if (rowIndex < 0) {
      blockers.push(`csv_primary_row_index_missing: slug=${patch.slug}`);
      continue;
    }
    if (usedIndices.has(rowIndex)) {
      blockers.push(`csv_primary_row_index_collision: slug=${patch.slug} row_index=${String(rowIndex)}`);
      continue;
    }
    if (!rowMatchesSnapshotV1(primary, patch.before_row)) {
      if (rowMatchesSnapshotV1(primary, patch.after_row)) {
        blockers.push(`csv_primary_row_already_applied: slug=${patch.slug}`);
      } else {
        blockers.push(`csv_before_row_mismatch: slug=${patch.slug}`);
      }
      continue;
    }
    usedIndices.add(rowIndex);
    const afterMerged = mergeAfterRowIntoPrimaryV1(primary, patch.after_row);
    plannedPatches.push({
      slug: patch.slug,
      row_index: rowIndex,
      before_row: { ...patch.before_row },
      after_row: afterMerged,
      rollback_row: { ...patch.before_row },
    });
  }

  if (plannedPatches.length !== EXPECTED_ROW_PATCH_COUNT_V1) {
    blockers.push(
      `write_plan_row_patch_count_invalid: count=${String(plannedPatches.length)} expected=${String(EXPECTED_ROW_PATCH_COUNT_V1)}`,
    );
  }

  if (blockers.length > 0) {
    return { ok: false, blockers };
  }

  return {
    ok: true,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patches: plannedPatches,
    rollback_patch_preview: plannedPatches.map((row) => ({
      ...row,
      slug: row.slug,
      row_index: row.row_index,
      before_row: row.rollback_row,
      after_row: row.rollback_row,
      rollback_row: row.rollback_row,
    })),
    target_row_indices: plannedPatches.map((row) => row.row_index),
  };
}

export function assessGuardedCsvAppliedParityV1(args: {
  rootDir: string;
  rowPatches: readonly UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): GuardedCsvAppliedParityAssessmentV1 {
  const fileExists = args.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const validation_blockers: string[] = [];
  const csvRows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const csvBySlug = indexRetailerLinksBySlugV1(csvRows);
  const targetRowIndices: number[] = [];
  const usedIndices = new Set<number>();

  for (const patch of args.rowPatches) {
    const slugKey = normalizeSlug(patch.slug);
    const slugRows = csvBySlug.get(slugKey) ?? [];
    const primaries = slugRows.filter(
      (row) => (row.is_primary ?? "").trim().toLowerCase() === "true",
    );
    if (primaries.length === 0) {
      validation_blockers.push(`post_apply_primary_row_missing: slug=${patch.slug}`);
      continue;
    }
    if (primaries.length > 1) {
      validation_blockers.push(`post_apply_primary_row_duplicate: slug=${patch.slug} count=${String(primaries.length)}`);
      continue;
    }
    const primary = primaries[0]!;
    const rowIndex = csvRows.indexOf(primary);
    if (rowIndex < 0) {
      validation_blockers.push(`post_apply_primary_row_index_missing: slug=${patch.slug}`);
      continue;
    }
    if (usedIndices.has(rowIndex)) {
      validation_blockers.push(`post_apply_primary_row_index_collision: slug=${patch.slug} row_index=${String(rowIndex)}`);
      continue;
    }
    usedIndices.add(rowIndex);
    targetRowIndices.push(rowIndex);

    if (!rowMatchesSnapshotV1(primary, patch.after_row)) {
      validation_blockers.push(`post_apply_after_row_mismatch: slug=${patch.slug}`);
    }
  }

  if (targetRowIndices.length !== EXPECTED_ROW_PATCH_COUNT_V1) {
    validation_blockers.push(
      `post_apply_row_patch_count_invalid: count=${String(targetRowIndices.length)} expected=${String(EXPECTED_ROW_PATCH_COUNT_V1)}`,
    );
  }

  const target_rows_match_after_row =
    validation_blockers.filter((blocker) => blocker.includes("after_row_mismatch")).length === 0 &&
    targetRowIndices.length === EXPECTED_ROW_PATCH_COUNT_V1;

  return {
    validation_status: validation_blockers.length === 0 ? "PROVEN" : "BLOCKED",
    validation_blockers,
    target_rows_match_after_row,
    non_target_rows_unchanged: validation_blockers.length === 0,
    target_row_indices: targetRowIndices,
  };
}

export function validateGuardedCsvPostWriteV1(args: {
  rowsAfterWrite: readonly RetailerLinkCsvRowV1[];
  writePlan: Extract<GuardedCsvWritePlanV1, { ok: true }>;
  rowsBeforeWrite: readonly RetailerLinkCsvRowV1[];
}): GuardedCsvPostWriteValidationV1 {
  const validation_blockers: string[] = [];
  const targetSet = new Set(args.writePlan.target_row_indices);

  for (const patch of args.writePlan.row_patches) {
    const actual = args.rowsAfterWrite[patch.row_index];
    if (!actual) {
      validation_blockers.push(`post_write_row_missing: slug=${patch.slug}`);
      continue;
    }
    if (!rowMatchesSnapshotV1(actual, patch.after_row)) {
      validation_blockers.push(`post_write_after_row_mismatch: slug=${patch.slug}`);
    }
  }

  for (let i = 0; i < args.rowsBeforeWrite.length; i++) {
    if (targetSet.has(i)) continue;
    const before = args.rowsBeforeWrite[i];
    const after = args.rowsAfterWrite[i];
    if (!before || !after) continue;
    if (!rowMatchesSnapshotV1(before, after)) {
      validation_blockers.push(`post_write_non_target_row_changed: row_index=${String(i)}`);
    }
  }

  const target_rows_match_after_row = args.writePlan.row_patches.every((patch) => {
    const actual = args.rowsAfterWrite[patch.row_index];
    return actual != null && rowMatchesSnapshotV1(actual, patch.after_row);
  });
  const non_target_rows_unchanged = !validation_blockers.some((blocker) =>
    blocker.startsWith("post_write_non_target_row_changed:"),
  );

  return {
    validation_status: validation_blockers.length === 0 ? "PROVEN" : "BLOCKED",
    validation_blockers,
    target_rows_match_after_row,
    non_target_rows_unchanged,
  };
}

export function buildGuardedCsvWriteModeBlockersV1(args: {
  writeCsvFlagPresent: boolean;
  requireCliFlag?: boolean;
  readiness: GuardedCsvWriteModeReadinessInputV1;
  mutationAuthorizationReview?: GuardedCsvWriteModeMutationAuthInputV1 | null;
  beforeRowParityProven: boolean;
  writePlan: GuardedCsvWritePlanV1;
}): string[] {
  const blockers: string[] = [];
  const requireCliFlag = args.requireCliFlag !== false;

  if (requireCliFlag && !args.writeCsvFlagPresent) {
    blockers.push(
      `write_mode_cli_flag_missing: pass ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1} to invoke guarded CSV apply`,
    );
  }

  if (!args.readiness.apply_executor_ready) {
    if (args.readiness.executor_blockers.length === 0 && args.readiness.executor_status) {
      blockers.push(`apply_executor_not_ready:executor_status=${args.readiness.executor_status}`);
    }
    for (const blocker of args.readiness.executor_blockers) {
      blockers.push(`apply_executor_not_ready:${blocker}`);
    }
  }

  const review = args.mutationAuthorizationReview;
  if (review?.mutation_authorization_review_status !== "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY") {
    blockers.push(
      `mutation_authorization_review_status=${review?.mutation_authorization_review_status ?? "UNKNOWN"}`,
    );
  }
  if (review?.evidence_sufficiency_status !== "PROVEN") {
    blockers.push(`evidence_sufficiency_status=${review?.evidence_sufficiency_status ?? "UNKNOWN"}`);
  }
  if (review?.csv_apply_authorized !== true) {
    blockers.push("csv_apply_authorized=false");
  }
  if (review?.mutation_authorized !== true) {
    blockers.push("mutation_authorized=false");
  }
  if (review?.apply_executor_ready !== true) {
    blockers.push("mutation_authorization_review_apply_executor_ready=false");
  }
  const missingOwnerApproval = review?.review_blockers.some((blocker) =>
    blocker.startsWith("missing_active_owner_mutation_approval:"),
  );
  if (missingOwnerApproval !== false) {
    blockers.push(
      review?.required_founder_decision_packet_id
        ? `missing_active_owner_mutation_approval: source_decision_packet_id=${review.required_founder_decision_packet_id}`
        : "missing_active_owner_mutation_approved",
    );
  }

  if (!args.beforeRowParityProven) {
    blockers.push("before_row_parity_not_proven_for_all_target_slugs");
  }

  if (!args.writePlan.ok) {
    blockers.push(...args.writePlan.blockers);
  }

  return blockers;
}

export function executeGuardedCsvWriteModeV1(args: {
  rootDir: string;
  writePlan: Extract<GuardedCsvWritePlanV1, { ok: true }>;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
}): ExecuteGuardedCsvWriteModeResultV1 {
  const fileExists = args.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const writeText = args.writeText ?? ((abs: string, content: string) => writeFileSync(abs, content, "utf8"));

  const csvAbs = path.join(args.rootDir, args.writePlan.target_file);
  if (!fileExists(csvAbs)) {
    return { ok: false, blockers: [`csv_target_missing: ${args.writePlan.target_file}`] };
  }

  const csvText = readText(csvAbs);
  const headers = parseCsvHeadersFromTextV1(csvText);
  const rowsBefore = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const rowsAfter = rowsBefore.map((row) => ({ ...row }));

  for (const patch of args.writePlan.row_patches) {
    rowsAfter[patch.row_index] = { ...patch.after_row };
  }

  const nextCsv = applyGuardedCsvWritePlanToCsvTextV1({
    csvText,
    headers,
    rows: rowsAfter,
    targetRowIndices: args.writePlan.target_row_indices,
  });

  writeText(csvAbs, nextCsv);

  const rowsReloaded = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const post_write_validation = validateGuardedCsvPostWriteV1({
    rowsAfterWrite: rowsReloaded,
    writePlan: args.writePlan,
    rowsBeforeWrite: rowsBefore,
  });

  if (post_write_validation.validation_status !== "PROVEN") {
    return { ok: false, blockers: post_write_validation.validation_blockers };
  }

  return {
    ok: true,
    rows_written: args.writePlan.row_patches.length,
    post_write_validation,
  };
}

export function parseGuardedCsvApplyExecutorCliArgsV1(argv: readonly string[]): {
  writeCsv: boolean;
} {
  return { writeCsv: argv.includes(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1) };
}
