/**
 * Universal batch lifecycle guarded CSV apply executor.
 * PROVEN: default mode is DRY_RUN (read_only=true, data_mutation=false).
 * Write mode requires explicit --write-csv and full lifecycle authorization.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  indexRetailerLinksBySlugV1,
  loadFridgeRetailerLinksCsvRowsV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import {
  assessGuardedCsvWritePlanV1,
  assessGuardedCsvAppliedParityV1,
  buildGuardedCsvWriteModeBlockersV1,
  executeGuardedCsvWriteModeV1,
  parseGuardedCsvApplyExecutorCliArgsV1,
  rowMatchesSnapshotV1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1,
  type GuardedCsvPostWriteValidationV1,
  type GuardedCsvWritePlanRowV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";

export {
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1,
  parseGuardedCsvApplyExecutorCliArgsV1,
  assessGuardedCsvWritePlanV1,
  assessGuardedCsvAppliedParityV1,
  executeGuardedCsvWriteModeV1,
  rowMatchesSnapshotV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1 =
  "universal_batch_lifecycle_guarded_csv_apply_executor_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor -- --write-csv" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_guarded_csv_apply_executor_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1 =
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1;

export type UniversalBatchLifecycleGuardedCsvApplyExecutorModeV1 = "DRY_RUN" | "WRITE_CSV";

export type UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 =
  | "PRE_APPLY_DRY_RUN_READY"
  | "APPLIED_PARITY_PROVEN"
  | "BLOCKED";

export type UniversalBatchLifecycleGuardedCsvApplyExecutorWriteModeStatusV1 =
  | "NOT_INVOKED"
  | "BLOCKED"
  | "APPLIED";

export type UniversalBatchLifecycleGuardedCsvApplyExecutorBeforeRowParityV1 = {
  slug: string;
  parity_status: "PROVEN" | "BLOCKED";
  blockers: string[];
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1 = {
  apply_executor_ready: boolean;
  executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1;
  executor_blockers: string[];
  source_execution_plan_artifact_rel_path: string;
  target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  row_patch_count: number;
  row_patch_slugs: string[];
  applied_parity_proven: boolean;
  applied_parity_validation: GuardedCsvPostWriteValidationV1 | null;
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorPostWriteValidationPlanV1 = {
  step_id: string;
  purpose: string;
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1;
  generated_at: string;
  wedge: "refrigerator_water";
  executor_mode: UniversalBatchLifecycleGuardedCsvApplyExecutorModeV1;
  executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1;
  apply_executor_ready: boolean;
  write_mode_available: boolean;
  write_mode_cli_flag_present: boolean;
  write_mode_invoked: boolean;
  write_mode_status: UniversalBatchLifecycleGuardedCsvApplyExecutorWriteModeStatusV1;
  csv_write_authorized: boolean;
  apply_mutation_authorized: boolean;
  source_execution_plan_artifact_rel_path: string;
  source_execution_plan_status: string;
  target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  row_patch_count: number;
  row_patch_slugs: string[];
  before_row_parity: UniversalBatchLifecycleGuardedCsvApplyExecutorBeforeRowParityV1[];
  rollback_patch_preview: GuardedCsvWritePlanRowV1[];
  executor_blockers: string[];
  write_mode_blockers: string[];
  write_mode_preconditions: string[];
  post_write_validation_plan: UniversalBatchLifecycleGuardedCsvApplyExecutorPostWriteValidationPlanV1[];
  post_write_validation: GuardedCsvPostWriteValidationV1 | null;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
  retailer_links_mutation_authorized: boolean;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 = {
  mutation_authorization_review_status: "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" | "BLOCKED";
  csv_apply_authorized: boolean;
  mutation_authorized: boolean;
  evidence_sufficiency_status: "PROVEN" | "BLOCKED";
  apply_executor_ready: boolean;
  required_founder_decision_packet_id: string;
  review_blockers: string[];
};

export type BuildUniversalBatchLifecycleGuardedCsvApplyExecutorInputV1 = {
  rootDir: string;
  now?: () => Date;
  executionPlanArtifactRelPath?: string;
  mutationAuthorizationReview?: UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 | null;
  writeCsv?: boolean;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function sortedSlugSet(slugs: readonly string[]): string[] {
  return Array.from(new Set(slugs.map(normalizeSlug))).sort((a, b) => a.localeCompare(b));
}

function beforeRowMatchesCsvV1(
  expected: RetailerLinkCsvRowV1,
  actual: RetailerLinkCsvRowV1,
): boolean {
  return rowMatchesSnapshotV1(actual, expected);
}

type LoadedExecutionPlanArtifactV1 = {
  execution_plan_status: string;
  target_file: string;
  planned_change_count: number;
  row_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
};

function loadExecutionPlanArtifactV1(args: {
  rootDir: string;
  relPath: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): { ok: true; doc: LoadedExecutionPlanArtifactV1 } | { ok: false; errors: string[] } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) {
    return { ok: false, errors: [`execution_plan_artifact_missing: ${args.relPath}`] };
  }
  try {
    const parsed = JSON.parse(args.readText(abs)) as Record<string, unknown>;
    const errors: string[] = [];
    if (parsed.contract !== UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1) {
      errors.push(
        `execution_plan_contract_invalid: expected ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1}`,
      );
    }
    const execution_plan_status = String(parsed.execution_plan_status ?? "UNKNOWN");
    const target_file = String(parsed.target_file ?? "");
    const planned_change_count = parsed.planned_change_count;
    const row_patch_preview = parsed.row_patch_preview;
    if (execution_plan_status !== "READY_FOR_MUTATION_AUTH_REVIEW") {
      errors.push(
        `execution_plan_status_invalid: execution_plan_status=${execution_plan_status}`,
      );
    }
    if (target_file !== FRIDGE_RETAILER_LINKS_CSV_REL_V1) {
      errors.push(`execution_plan_target_file_invalid: target_file=${target_file || "missing"}`);
    }
    if (
      typeof planned_change_count !== "number" ||
      planned_change_count !== UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1
    ) {
      errors.push(
        `execution_plan_planned_change_count_invalid: planned_change_count=${String(planned_change_count)}`,
      );
    }
    if (!Array.isArray(row_patch_preview)) {
      errors.push("execution_plan_row_patch_preview_missing");
    } else if (
      row_patch_preview.length !==
      UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1
    ) {
      errors.push(
        `execution_plan_row_patch_preview_count_invalid: count=${String(row_patch_preview.length)}`,
      );
    }
    if (errors.length > 0) return { ok: false, errors };

    const preview = row_patch_preview as UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
    return {
      ok: true,
      doc: {
        execution_plan_status,
        target_file,
        planned_change_count: planned_change_count as number,
        row_patch_preview: preview,
      },
    };
  } catch {
    return { ok: false, errors: [`execution_plan_artifact_invalid_json: ${args.relPath}`] };
  }
}

export function assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1(
  input: BuildUniversalBatchLifecycleGuardedCsvApplyExecutorInputV1,
): UniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1 {
  const fileExists = input.fileExists ?? defaultFileExists;
  const readText = input.readText ?? defaultReadText;
  const executionPlanRelPath =
    input.executionPlanArtifactRelPath ??
    UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1;

  const executor_blockers: string[] = [];
  const loaded = loadExecutionPlanArtifactV1({
    rootDir: input.rootDir,
    relPath: executionPlanRelPath,
    fileExists,
    readText,
  });
  if (!loaded.ok) {
    executor_blockers.push(...loaded.errors);
    return {
      apply_executor_ready: false,
      executor_status: "BLOCKED",
      executor_blockers,
      source_execution_plan_artifact_rel_path: executionPlanRelPath,
      target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
      row_patch_count: 0,
      row_patch_slugs: [],
      applied_parity_proven: false,
      applied_parity_validation: null,
    };
  }

  const previewSlugs = loaded.doc.row_patch_preview.map((row) => row.slug);
  if (
    previewSlugs.length !== UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1
  ) {
    executor_blockers.push(
      `row_patch_preview_count_invalid: count=${String(previewSlugs.length)} expected=${String(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1)}`,
    );
  }
  if (new Set(previewSlugs.map(normalizeSlug)).size !== previewSlugs.length) {
    executor_blockers.push("row_patch_preview_duplicate_slugs");
  }

  const csvRows = loadFridgeRetailerLinksCsvRowsV1({ rootDir: input.rootDir, fileExists, readText });
  const csvBySlug = indexRetailerLinksBySlugV1(csvRows);
  let beforeMismatchCount = 0;
  let afterMatchCount = 0;
  for (const patch of loaded.doc.row_patch_preview) {
    const slugKey = normalizeSlug(patch.slug);
    const slugRows = csvBySlug.get(slugKey) ?? [];
    const primaryRow = slugRows.find(
      (row) => (row.is_primary ?? "").trim().toLowerCase() === "true",
    );
    if (!primaryRow) {
      executor_blockers.push(`csv_primary_row_missing: slug=${patch.slug}`);
      continue;
    }
    if (beforeRowMatchesCsvV1(patch.after_row, primaryRow)) {
      afterMatchCount += 1;
      continue;
    }
    if (!beforeRowMatchesCsvV1(patch.before_row, primaryRow)) {
      beforeMismatchCount += 1;
      executor_blockers.push(`csv_before_row_mismatch: slug=${patch.slug}`);
    }
  }
  if (
    executor_blockers.length === 0 &&
    afterMatchCount > 0 &&
    afterMatchCount !== UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1
  ) {
    executor_blockers.push(
      `csv_apply_partially_already_applied: after_row_match_count=${String(afterMatchCount)} expected=${String(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1)}`,
    );
  }

  const appliedParity =
    executor_blockers.length === 0 &&
    beforeMismatchCount === 0 &&
    afterMatchCount === UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1
      ? assessGuardedCsvAppliedParityV1({
          rootDir: input.rootDir,
          rowPatches: loaded.doc.row_patch_preview,
          fileExists,
          readText,
        })
      : null;
  const appliedParityProven = appliedParity?.validation_status === "PROVEN";
  const executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 =
    appliedParityProven
      ? "APPLIED_PARITY_PROVEN"
      : executor_blockers.length === 0
        ? "PRE_APPLY_DRY_RUN_READY"
        : "BLOCKED";

  return {
    apply_executor_ready: executor_status === "PRE_APPLY_DRY_RUN_READY",
    executor_status,
    executor_blockers,
    source_execution_plan_artifact_rel_path: executionPlanRelPath,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_count: loaded.doc.row_patch_preview.length,
    row_patch_slugs: sortedSlugSet(previewSlugs),
    applied_parity_proven: appliedParityProven,
    applied_parity_validation: appliedParity
      ? {
          validation_status: appliedParity.validation_status,
          validation_blockers: appliedParity.validation_blockers,
          target_rows_match_after_row: appliedParity.target_rows_match_after_row,
          non_target_rows_unchanged: appliedParity.non_target_rows_unchanged,
        }
      : null,
  };
}

const POST_WRITE_VALIDATION_PLAN_V1: UniversalBatchLifecycleGuardedCsvApplyExecutorPostWriteValidationPlanV1[] =
  [
    {
      step_id: "reload_retailer_links_csv",
      purpose: "Re-read data/retailer_links.csv and verify all 14 target primary rows match execution-plan after_row.",
    },
    {
      step_id: "verify_non_target_rows_unchanged",
      purpose: "Confirm every non-target CSV row byte-matches pre-write snapshot for guarded apply scope.",
    },
    {
      step_id: "verify_no_supabase_public_ui_evidence_netlify_mutation",
      purpose:
        "Confirm this executor path performs CSV-only mutation; Supabase/public UI/evidence/Netlify remain unauthorized.",
    },
  ];

export function buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1(
  input: BuildUniversalBatchLifecycleGuardedCsvApplyExecutorInputV1,
): UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 {
  const now = input.now ?? (() => new Date());
  const writeCsv = input.writeCsv === true;
  const fileExists = input.fileExists ?? defaultFileExists;
  const readText = input.readText ?? defaultReadText;

  const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1(input);
  const loaded = loadExecutionPlanArtifactV1({
    rootDir: input.rootDir,
    relPath:
      input.executionPlanArtifactRelPath ??
      UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1,
    fileExists,
    readText,
  });
  const rowPatches = loaded.ok ? loaded.doc.row_patch_preview : [];

  const before_row_parity: UniversalBatchLifecycleGuardedCsvApplyExecutorBeforeRowParityV1[] =
    readiness.row_patch_slugs.map((slug) => {
      if (readiness.applied_parity_proven) {
        return {
          slug,
          parity_status: "BLOCKED",
          blockers: [`csv_primary_row_already_applied: slug=${slug}`],
        };
      }
      const slugBlockers = readiness.executor_blockers.filter((blocker) =>
        blocker.endsWith(`slug=${slug}`),
      );
      return {
        slug,
        parity_status: slugBlockers.length === 0 ? "PROVEN" : "BLOCKED",
        blockers: slugBlockers,
      };
    });
  const beforeRowParityProven =
    !readiness.applied_parity_proven &&
    before_row_parity.length === UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1 &&
    before_row_parity.every((row) => row.parity_status === "PROVEN");

  const writePlan = assessGuardedCsvWritePlanV1({
    rootDir: input.rootDir,
    rowPatches,
    fileExists,
    readText,
  });
  const appliedParity = readiness.applied_parity_validation;
  const appliedParityProven = readiness.applied_parity_proven;

  const write_mode_available =
    !appliedParityProven &&
    buildGuardedCsvWriteModeBlockersV1({
      writeCsvFlagPresent: true,
      requireCliFlag: false,
      readiness,
      mutationAuthorizationReview: input.mutationAuthorizationReview,
      beforeRowParityProven,
      writePlan,
    }).length === 0;

  const write_mode_blockers = buildGuardedCsvWriteModeBlockersV1({
    writeCsvFlagPresent: writeCsv,
    requireCliFlag: true,
    readiness,
    mutationAuthorizationReview: input.mutationAuthorizationReview,
    beforeRowParityProven,
    writePlan,
  });
  if (appliedParityProven) {
    write_mode_blockers.push("csv_apply_already_applied: APPLIED_PARITY_PROVEN");
  }
  const lifecycleCsvAuthorized =
    input.mutationAuthorizationReview?.mutation_authorization_review_status ===
      "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
    input.mutationAuthorizationReview.csv_apply_authorized === true &&
    input.mutationAuthorizationReview.mutation_authorized === true;

  let write_mode_status: UniversalBatchLifecycleGuardedCsvApplyExecutorWriteModeStatusV1 = "NOT_INVOKED";
  let post_write_validation: GuardedCsvPostWriteValidationV1 | null = null;
  let data_mutation = false;
  let read_only = true;

  if (writeCsv) {
    if (!write_mode_available) {
      write_mode_status = "BLOCKED";
    } else if (writePlan.ok) {
      const writeResult = executeGuardedCsvWriteModeV1({
        rootDir: input.rootDir,
        writePlan,
        fileExists,
        readText,
        writeText: input.writeText,
      });
      if (writeResult.ok) {
        write_mode_status = "APPLIED";
        post_write_validation = writeResult.post_write_validation;
        data_mutation = true;
        read_only = false;
      } else {
        write_mode_status = "BLOCKED";
        for (const blocker of writeResult.blockers) {
          write_mode_blockers.push(`write_mode_apply_blocked:${blocker}`);
        }
      }
    }
  }

  const executor_mode: UniversalBatchLifecycleGuardedCsvApplyExecutorModeV1 = writeCsv
    ? "WRITE_CSV"
    : "DRY_RUN";

  const proven_facts = [
    writeCsv && data_mutation
      ? "PROVEN: guarded CSV write mode applied exactly scoped primary rows in data/retailer_links.csv."
      : "PROVEN: universal_batch_lifecycle_guarded_csv_apply_executor_v1 default is DRY_RUN; data_mutation=false unless --write-csv succeeds.",
    `PROVEN: target_file=${FRIDGE_RETAILER_LINKS_CSV_REL_V1}; write_mode_invoked=${String(writeCsv && data_mutation)}.`,
    `PROVEN: source_execution_plan_artifact_rel_path=${readiness.source_execution_plan_artifact_rel_path}.`,
  ];
  if (readiness.apply_executor_ready) {
    proven_facts.push(
      `PROVEN: executor_status=PRE_APPLY_DRY_RUN_READY for ${String(readiness.row_patch_count)} row_patch_preview slugs.`,
    );
  }
  if (appliedParityProven) {
    proven_facts.push(
      `PROVEN: executor_status=APPLIED_PARITY_PROVEN for ${String(readiness.row_patch_count)} row_patch_preview slugs.`,
    );
    proven_facts.push("PROVEN: target primary rows match execution_plan.row_patch_preview.after_row.");
    proven_facts.push("PROVEN: post-apply recognition blocks repeat guarded CSV apply.");
  }
  if (beforeRowParityProven) {
    proven_facts.push("PROVEN: before_row_parity=PROVEN for all 14 target slugs.");
  }
  if (write_mode_available && !writeCsv) {
    proven_facts.push(
      `PROVEN: write_mode_available=true; invoke with ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1}.`,
    );
  }

  const unknown_facts =
    appliedParityProven
      ? []
      : writeCsv && !data_mutation
      ? ["UNKNOWN: write mode was requested but blocked; no CSV mutation occurred."]
      : writeCsv && data_mutation
        ? []
        : [
            "UNKNOWN: CSV write mode not invoked; guarded apply remains read-only until explicit --write-csv.",
          ];

  const recommended_next_action = writeCsv && data_mutation
    ? `LIFECYCLE GUARDED CSV APPLY EXECUTOR [WRITE_APPLIED]: applied ${String(writePlan.ok ? writePlan.row_patches.length : 0)} primary-row patches to ${FRIDGE_RETAILER_LINKS_CSV_REL_V1}. Post-write validation PROVEN.`
    : appliedParityProven
      ? `LIFECYCLE GUARDED CSV APPLY EXECUTOR [APPLIED_PARITY_PROVEN]: ${FRIDGE_RETAILER_LINKS_CSV_REL_V1} already matches the 14-row execution-plan after_row preview. Repeat write mode is blocked; proceed to post-apply validation and closeout.`
      : write_mode_available && lifecycleCsvAuthorized
      ? `LIFECYCLE GUARDED CSV APPLY EXECUTOR [DRY_RUN_READY]: lifecycle authorizes guarded CSV apply for ${String(readiness.row_patch_count)} rows. Write mode is available but not invoked; no CSV mutation applied. Run ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1} read-only or ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1} only when intentionally applying.`
      : readiness.apply_executor_ready
        ? `LIFECYCLE GUARDED CSV APPLY EXECUTOR [DRY_RUN_READY]: read-only dry-run validated ${String(readiness.row_patch_count)} row patches against ${FRIDGE_RETAILER_LINKS_CSV_REL_V1}. Write mode blocked (${String(write_mode_blockers.length)} blockers). No CSV mutation applied. Run ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1}.`
        : `LIFECYCLE GUARDED CSV APPLY EXECUTOR [BLOCKED]: dry-run blocked (${String(readiness.executor_blockers.length)} blockers). No CSV mutation applied.`;

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
    read_only,
    data_mutation,
    mutation_authorized: lifecycleCsvAuthorized && data_mutation,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1,
    source_command: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    executor_mode,
    executor_status: readiness.executor_status,
    apply_executor_ready: readiness.apply_executor_ready,
    write_mode_available,
    write_mode_cli_flag_present: writeCsv,
    write_mode_invoked: writeCsv && data_mutation,
    write_mode_status,
    csv_write_authorized: lifecycleCsvAuthorized && data_mutation,
    apply_mutation_authorized: lifecycleCsvAuthorized && data_mutation,
    source_execution_plan_artifact_rel_path: readiness.source_execution_plan_artifact_rel_path,
    source_execution_plan_status: appliedParityProven
      ? "APPLIED_PARITY_PROVEN"
      : readiness.apply_executor_ready
        ? "READY_FOR_MUTATION_AUTH_REVIEW"
        : "BLOCKED",
    target_file: readiness.target_file,
    row_patch_count: readiness.row_patch_count,
    row_patch_slugs: readiness.row_patch_slugs,
    before_row_parity,
    rollback_patch_preview: writePlan.ok ? writePlan.rollback_patch_preview : [],
    executor_blockers: readiness.executor_blockers,
    write_mode_blockers,
    write_mode_preconditions: [
      "mutation_authorization_review_status=MUTATION_AUTHORIZED_FOR_GUARDED_APPLY",
      "evidence_sufficiency_status=PROVEN",
      "apply_executor_ready=true",
      "csv_apply_authorized=true",
      `target_file exactly ${FRIDGE_RETAILER_LINKS_CSV_REL_V1}`,
      "execution_plan_status=READY_FOR_MUTATION_AUTH_REVIEW",
      `row_patch_preview_count=${String(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1)}`,
      "before_row_parity=PROVEN for all target slugs",
      `explicit CLI flag ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1}`,
      "retailer_links_mutation_authorized=true scoped to 14 primary rows only",
      "supabase_mutation_authorized=false",
      "public_ui_mutation_authorized=false",
      "evidence_write_authorized=false",
      "netlify_api_authorized=false",
    ],
    post_write_validation_plan: POST_WRITE_VALIDATION_PLAN_V1,
    post_write_validation: post_write_validation ?? appliedParity,
    recommended_next_action,
    proven_facts,
    unknown_facts,
    retailer_links_mutation_authorized: lifecycleCsvAuthorized && data_mutation,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}
