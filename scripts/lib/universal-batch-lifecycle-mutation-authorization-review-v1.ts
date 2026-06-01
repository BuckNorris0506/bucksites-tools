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
  apply_executor_ready: false;
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

  const mutationAuthorized = review_blockers.length === 0 && approvalRow != null;
  const mutation_authorization_review_status: UniversalBatchLifecycleMutationAuthorizationReviewStatusV1 =
    mutationAuthorized ? "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" : "BLOCKED";

  if (!mutationAuthorized) {
    unknown_facts.push(
      "UNKNOWN: guarded CSV apply executor contract is not lifecycle-authorized in current repo state.",
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
    apply_executor_ready: false,
    apply_mutation_authorized: mutationAuthorized,
    csv_apply_authorized: mutationAuthorized,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    recommended_next_action: mutationAuthorized
      ? "LIFECYCLE MUTATION AUTHORIZATION [AUTHORIZED]: explicit owner_mutation_approved row is active for this execution plan. Apply remains blocked until a guarded CSV apply executor exists."
      : `LIFECYCLE MUTATION AUTHORIZATION [BLOCKED]: explicit owner_mutation_approved row missing/invalid for ${executionPlanArtifactRelPath}. Run ${UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1} read-only.`,
    proven_facts,
    unknown_facts,
  };
}
