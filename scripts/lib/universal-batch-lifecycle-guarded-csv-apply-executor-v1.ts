/**
 * Read-only universal batch lifecycle guarded CSV apply executor (DRY-RUN only).
 * PROVEN: default mode does not write data/retailer_links.csv or authorize mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  findPrimaryRetailerLinkRowForSlugV1,
  indexRetailerLinksBySlugV1,
  loadFridgeRetailerLinksCsvRowsV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1 =
  "universal_batch_lifecycle_guarded_csv_apply_executor_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_guarded_csv_apply_executor_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1 =
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1;

export type UniversalBatchLifecycleGuardedCsvApplyExecutorModeV1 = "DRY_RUN";

export type UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 = "DRY_RUN_READY" | "BLOCKED";

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
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1;
  generated_at: string;
  wedge: "refrigerator_water";
  executor_mode: UniversalBatchLifecycleGuardedCsvApplyExecutorModeV1;
  executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1;
  apply_executor_ready: boolean;
  write_mode_available: false;
  csv_write_authorized: false;
  apply_mutation_authorized: false;
  source_execution_plan_artifact_rel_path: string;
  source_execution_plan_status: string;
  target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  row_patch_count: number;
  row_patch_slugs: string[];
  before_row_parity: UniversalBatchLifecycleGuardedCsvApplyExecutorBeforeRowParityV1[];
  executor_blockers: string[];
  write_mode_blockers: string[];
  write_mode_preconditions: string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 = {
  mutation_authorization_review_status: "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" | "BLOCKED";
  csv_apply_authorized: boolean;
  required_founder_decision_packet_id: string;
  review_blockers: string[];
};

export type BuildUniversalBatchLifecycleGuardedCsvApplyExecutorInputV1 = {
  rootDir: string;
  now?: () => Date;
  executionPlanArtifactRelPath?: string;
  mutationAuthorizationReview?: UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 | null;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
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
  for (const [key, value] of Object.entries(expected)) {
    if ((actual[key] ?? "").trim() !== (value ?? "").trim()) return false;
  }
  return true;
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

function buildWriteModeBlockersV1(args: {
  mutationAuthorizationReview?: UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 | null;
}): string[] {
  const blockers: string[] = [
    "write_mode_not_implemented: guarded CSV apply executor is DRY_RUN-only in current repo state",
  ];
  const review = args.mutationAuthorizationReview;
  if (review?.mutation_authorization_review_status !== "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY") {
    blockers.push(
      `mutation_authorization_review_status=${review?.mutation_authorization_review_status ?? "UNKNOWN"}`,
    );
  }
  if (review?.csv_apply_authorized !== true) {
    blockers.push("csv_apply_authorized=false");
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
  return blockers;
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
  for (const patch of loaded.doc.row_patch_preview) {
    const slugKey = normalizeSlug(patch.slug);
    const slugRows = csvBySlug.get(slugKey) ?? [];
    const primaryRow = findPrimaryRetailerLinkRowForSlugV1(slugRows);
    if (!primaryRow) {
      executor_blockers.push(`csv_primary_row_missing: slug=${patch.slug}`);
      continue;
    }
    if (!beforeRowMatchesCsvV1(patch.before_row, primaryRow)) {
      executor_blockers.push(`csv_before_row_mismatch: slug=${patch.slug}`);
    }
  }

  const executor_status: UniversalBatchLifecycleGuardedCsvApplyExecutorStatusV1 =
    executor_blockers.length === 0 ? "DRY_RUN_READY" : "BLOCKED";

  return {
    apply_executor_ready: executor_status === "DRY_RUN_READY",
    executor_status,
    executor_blockers,
    source_execution_plan_artifact_rel_path: executionPlanRelPath,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_count: loaded.doc.row_patch_preview.length,
    row_patch_slugs: sortedSlugSet(previewSlugs),
  };
}

export function buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1(
  input: BuildUniversalBatchLifecycleGuardedCsvApplyExecutorInputV1,
): UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 {
  const now = input.now ?? (() => new Date());
  const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1(input);
  const write_mode_blockers = buildWriteModeBlockersV1({
    mutationAuthorizationReview: input.mutationAuthorizationReview,
  });

  const before_row_parity: UniversalBatchLifecycleGuardedCsvApplyExecutorBeforeRowParityV1[] =
    readiness.row_patch_slugs.map((slug) => {
      const slugBlockers = readiness.executor_blockers.filter((blocker) =>
        blocker.endsWith(`slug=${slug}`),
      );
      return {
        slug,
        parity_status: slugBlockers.length === 0 ? "PROVEN" : "BLOCKED",
        blockers: slugBlockers,
      };
    });

  const proven_facts = [
    "PROVEN: universal_batch_lifecycle_guarded_csv_apply_executor_v1 is DRY_RUN-only; data_mutation=false.",
    `PROVEN: target_file=${FRIDGE_RETAILER_LINKS_CSV_REL_V1}; write_mode_available=false.`,
    `PROVEN: source_execution_plan_artifact_rel_path=${readiness.source_execution_plan_artifact_rel_path}.`,
  ];
  if (readiness.apply_executor_ready) {
    proven_facts.push(
      `PROVEN: executor_status=DRY_RUN_READY for ${String(readiness.row_patch_count)} row_patch_preview slugs.`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: CSV write mode is not implemented; guarded apply remains read-only in this repo state.",
  ];

  const recommended_next_action = readiness.apply_executor_ready
    ? `LIFECYCLE GUARDED CSV APPLY EXECUTOR [DRY_RUN_READY]: read-only dry-run validated ${String(readiness.row_patch_count)} row patches against ${FRIDGE_RETAILER_LINKS_CSV_REL_V1}. Mutation unauthorized; write mode blocked (${String(write_mode_blockers.length)} preconditions unmet). Run ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1}.`
    : `LIFECYCLE GUARDED CSV APPLY EXECUTOR [BLOCKED]: dry-run blocked (${String(readiness.executor_blockers.length)} blockers). Run ${UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1} read-only. No CSV mutation authorized.`;

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CC_JQ_PATH_V1,
    source_command: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    executor_mode: "DRY_RUN",
    executor_status: readiness.executor_status,
    apply_executor_ready: readiness.apply_executor_ready,
    write_mode_available: false,
    csv_write_authorized: false,
    apply_mutation_authorized: false,
    source_execution_plan_artifact_rel_path: readiness.source_execution_plan_artifact_rel_path,
    source_execution_plan_status:
      readiness.apply_executor_ready ? "READY_FOR_MUTATION_AUTH_REVIEW" : "BLOCKED",
    target_file: readiness.target_file,
    row_patch_count: readiness.row_patch_count,
    row_patch_slugs: readiness.row_patch_slugs,
    before_row_parity,
    executor_blockers: readiness.executor_blockers,
    write_mode_blockers,
    write_mode_preconditions: [
      "mutation_authorization_review_status=MUTATION_AUTHORIZED_FOR_GUARDED_APPLY",
      "active owner_mutation_approved row for exact required_founder_decision_packet_id",
      "csv_apply_authorized=true from lifecycle mutation authorization review",
      `target_file exactly ${FRIDGE_RETAILER_LINKS_CSV_REL_V1}`,
      "slug set exactly equals execution plan row_patch_preview slugs",
      "explicit future write mode flag (not present in this repo state)",
    ],
    recommended_next_action,
    proven_facts,
    unknown_facts,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}
