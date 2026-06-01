/**
 * Read-only universal batch lifecycle mutation-authorization review for refrigerator_water.
 * PROVEN: no CSV, retailer_links, Supabase, public UI, evidence writes, deploy, or Netlify.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryDocumentV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanReportV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";
import type { UniversalBatchLifecycleApplyReadinessReportV1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import { assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import {
  assessUniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyV1,
  type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyCountsV1,
  type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1,
  type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyStatusV1,
} from "./universal-batch-lifecycle-mutation-authorization-evidence-sufficiency-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1 =
  "universal_batch_lifecycle_mutation_authorization_review_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-mutation-authorization-review" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1" as const;

export type UniversalBatchLifecycleMutationAuthorizationReviewStatusV1 =
  | "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY"
  | "BLOCKED";

export type UniversalBatchLifecycleMutationAuthorizationReviewReportV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: boolean;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CC_JQ_PATH_V1;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1;
  generated_at: string;
  wedge: "refrigerator_water";
  mutation_authorization_review_status: UniversalBatchLifecycleMutationAuthorizationReviewStatusV1;
  source_apply_execution_plan_artifact_rel_path: string;
  source_apply_execution_plan_status: string;
  source_apply_readiness_status: string;
  required_founder_decision_packet_id: string;
  authorized_decision_id: string | null;
  authorization_expires_at: string | null;
  authorization_review_after: string | null;
  review_blockers: string[];
  apply_executor_ready: boolean;
  evidence_sufficiency_status: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyStatusV1;
  evidence_sufficiency_counts: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyCountsV1;
  evidence_sufficiency_rows: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1[];
  apply_mutation_authorized: boolean;
  csv_apply_authorized: boolean;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildUniversalBatchLifecycleMutationAuthorizationReviewInputV1 = {
  rootDir: string;
  now?: () => Date;
  applyReadiness?: Pick<
    UniversalBatchLifecycleApplyReadinessReportV1,
    "apply_readiness_status" | "source_apply_plan_artifact_rel_path" | "planned_change_count"
  > | null;
  applyExecutionPlan?: Pick<
    UniversalBatchLifecycleApplyExecutionPlanReportV1,
    "execution_plan_status" | "source_apply_plan_artifact_rel_path" | "planned_change_count"
  > | null;
  applyExecutionPlanArtifactRelPath?: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function parseBatchDigestFromApplyPlanRelPath(relPath: string): string | null {
  const m = /fridge-buyer-path-batch-apply-plan-v1-([a-z0-9]+)\.json$/i.exec(relPath);
  return m?.[1] ?? null;
}

function buildDefaultApplyExecutionPlanArtifactRelPathV1(applyPlanRelPath: string): string | null {
  const digest = parseBatchDigestFromApplyPlanRelPath(applyPlanRelPath);
  if (!digest) return null;
  return `${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1}/fridge-buyer-path-batch-apply-execution-plan-v1-${digest}.json`;
}

function findLatestActiveLifecycleMutationApprovalRowV1(args: {
  rootDir: string;
  requiredPacketId: string;
  nowIso: string;
}): FounderDecisionRegistryRowV1 | null {
  const files = scanFounderDecisionRegistryJsonFilesV1(args.rootDir);
  const matches: FounderDecisionRegistryRowV1[] = [];
  for (const f of files) {
    if ("parseError" in f) continue;
    const validated = validateFounderDecisionRegistryDocumentV1(f.parsed);
    if (!validated.ok) continue;
    for (const row of validated.doc.rows) {
      if (row.source_decision_packet_id !== args.requiredPacketId) continue;
      if (!isFounderRegistryRowActiveMutationApproval(row, args.nowIso)) continue;
      matches.push(row);
    }
  }
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => Date.parse(b.decided_at) - Date.parse(a.decided_at))[0] ?? null;
}

function loadApplyPlanPlannedChangesForEvidenceSufficiencyV1(args: {
  rootDir: string;
  relPath: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}):
  | {
      ok: true;
      plannedChanges: Array<{ slug: string; evidence_artifact_path: string; oem_token?: string }>;
    }
  | { ok: false } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return { ok: false };
  try {
    const doc = JSON.parse(args.readText(abs)) as Record<string, unknown>;
    if (doc.contract !== FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1) return { ok: false };
    const planned_changes = doc.planned_changes;
    if (!Array.isArray(planned_changes)) return { ok: false };
    const plannedChanges = planned_changes.map((row) => {
      const o = row as Record<string, unknown>;
      return {
        slug: typeof o.slug === "string" ? o.slug : "",
        evidence_artifact_path:
          typeof o.evidence_artifact_path === "string" ? o.evidence_artifact_path : "",
        oem_token: typeof o.oem_token === "string" ? o.oem_token : undefined,
      };
    });
    return { ok: true, plannedChanges };
  } catch {
    return { ok: false };
  }
}

export function buildUniversalBatchLifecycleMutationAuthorizationReviewV1(
  input: BuildUniversalBatchLifecycleMutationAuthorizationReviewInputV1,
): UniversalBatchLifecycleMutationAuthorizationReviewReportV1 {
  const now = input.now ?? (() => new Date());
  const fileExists = input.fileExists ?? defaultFileExists;
  const readText = input.readText ?? defaultReadText;
  const nowIso = now().toISOString();
  const review_blockers: string[] = [];
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [
    "PROVEN: universal_batch_lifecycle_mutation_authorization_review_v1 is read-only; mutation remains blocked unless explicit owner_mutation_approved row validates.",
  ];

  const applyReadinessStatus = input.applyReadiness?.apply_readiness_status ?? "UNKNOWN";
  const applyExecutionPlanStatus = input.applyExecutionPlan?.execution_plan_status ?? "UNKNOWN";

  if (applyReadinessStatus !== "PROVEN") {
    review_blockers.push(`apply_readiness_not_proven: apply_readiness_status=${applyReadinessStatus}`);
  }
  if (applyExecutionPlanStatus !== "READY_FOR_MUTATION_AUTH_REVIEW") {
    review_blockers.push(
      `apply_execution_plan_not_ready: execution_plan_status=${applyExecutionPlanStatus}`,
    );
  }

  const applyPlanRelPath = input.applyExecutionPlan?.source_apply_plan_artifact_rel_path ??
    input.applyReadiness?.source_apply_plan_artifact_rel_path ?? "";
  const inferredExecutionPlanRelPath =
    applyPlanRelPath.length > 0 ? buildDefaultApplyExecutionPlanArtifactRelPathV1(applyPlanRelPath) : null;
  const executionPlanArtifactRelPath =
    input.applyExecutionPlanArtifactRelPath ??
    inferredExecutionPlanRelPath ??
    `${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1}/UNKNOWN.json`;

  const executionPlanAbs = path.join(input.rootDir, executionPlanArtifactRelPath);
  if (!fileExists(executionPlanAbs)) {
    review_blockers.push(`apply_execution_plan_artifact_missing: ${executionPlanArtifactRelPath}`);
  } else {
    try {
      const doc = JSON.parse(readText(executionPlanAbs)) as Record<string, unknown>;
      if (doc.contract !== UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1) {
        review_blockers.push(
          `apply_execution_plan_contract_invalid: expected ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1}`,
        );
      }
      if (doc.execution_plan_status !== "READY_FOR_MUTATION_AUTH_REVIEW") {
        review_blockers.push(
          `apply_execution_plan_artifact_status_invalid: execution_plan_status=${String(doc.execution_plan_status)}`,
        );
      }
    } catch {
      review_blockers.push(`apply_execution_plan_artifact_invalid_json: ${executionPlanArtifactRelPath}`);
    }
  }

  const required_founder_decision_packet_id =
    `${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1}:${executionPlanArtifactRelPath}`;
  const approvalRow = findLatestActiveLifecycleMutationApprovalRowV1({
    rootDir: input.rootDir,
    requiredPacketId: required_founder_decision_packet_id,
    nowIso,
  });

  if (!approvalRow) {
    review_blockers.push(
      `missing_active_owner_mutation_approval: source_decision_packet_id=${required_founder_decision_packet_id}`,
    );
  } else {
    proven_facts.push(
      `PROVEN: active owner_mutation_approved row found (decision_id=${approvalRow.decision_id}).`,
    );
  }

  const applyPlanLoaded = applyPlanRelPath.length > 0
    ? loadApplyPlanPlannedChangesForEvidenceSufficiencyV1({
        rootDir: input.rootDir,
        relPath: applyPlanRelPath,
        fileExists,
        readText,
      })
    : { ok: false as const };
  if (!applyPlanLoaded.ok) {
    review_blockers.push(`apply_plan_artifact_missing_or_invalid: ${applyPlanRelPath || "UNKNOWN"}`);
  }

  const evidenceSufficiency = assessUniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyV1({
    rootDir: input.rootDir,
    plannedChanges: applyPlanLoaded.ok ? applyPlanLoaded.plannedChanges : [],
    fileExists,
    readText,
  });
  if (evidenceSufficiency.evidence_sufficiency_status !== "PROVEN") {
    for (const blocker of evidenceSufficiency.evidence_sufficiency_blockers) {
      review_blockers.push(blocker);
    }
  } else {
    proven_facts.push(
      `PROVEN: evidence_sufficiency_status=PROVEN for ${String(evidenceSufficiency.evidence_sufficiency_counts.total)} planned rows (${String(evidenceSufficiency.evidence_sufficiency_counts.structured_proven)} structured, ${String(evidenceSufficiency.evidence_sufficiency_counts.legacy_acceptable)} legacy).`,
    );
  }

  const executorReadiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
    rootDir: input.rootDir,
    executionPlanArtifactRelPath,
    fileExists,
    readText,
  });
  const apply_executor_ready = executorReadiness.apply_executor_ready;
  if (!apply_executor_ready) {
    for (const blocker of executorReadiness.executor_blockers) {
      review_blockers.push(`apply_executor_not_ready:${blocker}`);
    }
  } else {
    proven_facts.push(
      `PROVEN: guarded CSV apply executor contract validates DRY_RUN readiness for ${String(executorReadiness.row_patch_count)} row patches.`,
    );
  }

  const mutationAuthorized =
    applyReadinessStatus === "PROVEN" &&
    applyExecutionPlanStatus === "READY_FOR_MUTATION_AUTH_REVIEW" &&
    apply_executor_ready &&
    evidenceSufficiency.evidence_sufficiency_status === "PROVEN" &&
    approvalRow != null &&
    review_blockers.length === 0;

  const mutation_authorization_review_status: UniversalBatchLifecycleMutationAuthorizationReviewStatusV1 =
    mutationAuthorized ? "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" : "BLOCKED";

  if (!mutationAuthorized) {
    unknown_facts.push(
      "UNKNOWN: CSV write mode remains blocked until apply readiness, execution plan, guarded executor DRY_RUN readiness, evidence sufficiency, and explicit owner_mutation_approved row all validate.",
    );
  }

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: mutationAuthorized,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CC_JQ_PATH_V1,
    source_command: UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
    generated_at: nowIso,
    wedge: "refrigerator_water",
    mutation_authorization_review_status,
    source_apply_execution_plan_artifact_rel_path: executionPlanArtifactRelPath,
    source_apply_execution_plan_status: applyExecutionPlanStatus,
    source_apply_readiness_status: applyReadinessStatus,
    required_founder_decision_packet_id,
    authorized_decision_id: approvalRow?.decision_id ?? null,
    authorization_expires_at: approvalRow?.expires_at ?? null,
    authorization_review_after: approvalRow?.review_after ?? null,
    review_blockers,
    apply_executor_ready,
    evidence_sufficiency_status: evidenceSufficiency.evidence_sufficiency_status,
    evidence_sufficiency_counts: evidenceSufficiency.evidence_sufficiency_counts,
    evidence_sufficiency_rows: evidenceSufficiency.evidence_sufficiency_rows,
    apply_mutation_authorized: mutationAuthorized,
    csv_apply_authorized: mutationAuthorized,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    recommended_next_action: mutationAuthorized
      ? `LIFECYCLE MUTATION AUTHORIZATION [AUTHORIZED]: explicit owner_mutation_approved row is active for this execution plan. CSV write remains blocked until guarded apply executor write mode is explicitly invoked with all preconditions met.`
      : evidenceSufficiency.evidence_sufficiency_status !== "PROVEN"
        ? `LIFECYCLE MUTATION AUTHORIZATION [BLOCKED]: evidence sufficiency is BLOCKED (${String(evidenceSufficiency.evidence_sufficiency_counts.insufficient)} insufficient of ${String(evidenceSufficiency.evidence_sufficiency_counts.total)} rows). Owner mutation approval alone cannot authorize guarded CSV apply. Run ${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1} read-only.`
        : apply_executor_ready
          ? `LIFECYCLE MUTATION AUTHORIZATION [BLOCKED]: guarded CSV apply executor is DRY_RUN_READY but explicit owner_mutation_approved row is missing/invalid for ${executionPlanArtifactRelPath}. Run ${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1} read-only.`
          : `LIFECYCLE MUTATION AUTHORIZATION [BLOCKED]: explicit owner_mutation_approved row missing/invalid and guarded CSV apply executor is not ready for ${executionPlanArtifactRelPath}. Run ${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1} read-only.`,
    proven_facts,
    unknown_facts,
  };
}
