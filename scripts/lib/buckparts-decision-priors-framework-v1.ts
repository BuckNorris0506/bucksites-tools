/**
 * Decision Priors Framework v1 — disk projection over existing OAR / ODR artifacts.
 * Re-exports the pure framework and loads owner-decisions without creating a new store.
 */

import path from "node:path";

import {
  buildDecisionPriorsFrameworkProjectionV1,
  type CandidateExecutiveDecisionV1,
  type DecisionPriorsFrameworkProjectionV1,
  type OwnerApprovalRecordSubstrateV1,
} from "../../src/lib/owner-dashboard/decision-priors-framework-v1";
import {
  listOwnerDecisionRequestArtifactPathsV1,
  loadOwnerDecisionRequestV1,
} from "../../src/lib/owner-dashboard/owner-decision-queue-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import { validateFounderDecisionRegistryDocumentV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";

export * from "../../src/lib/owner-dashboard/decision-priors-framework-v1";

export function loadCandidateExecutiveDecisionsFromOwnerDecisionRequestsV1(
  rootDir: string,
): CandidateExecutiveDecisionV1[] {
  const out: CandidateExecutiveDecisionV1[] = [];
  for (const rel of listOwnerDecisionRequestArtifactPathsV1(rootDir)) {
    const request = loadOwnerDecisionRequestV1(rootDir, rel);
    if (!request) continue;
    out.push({
      decision_request_id: request.decision_request_id,
      recommended_option: request.recommended_option,
      decision_type: request.decision_type,
      source_system: request.source_system,
      source_artifact_path: request.source_artifact_path,
      target_slugs: request.target_slugs,
      ...(request.decision_priors ? { decision_priors: request.decision_priors } : {}),
    });
  }
  return out;
}

export function loadOwnerApprovalRecordSubstratesFromRegistryV1(
  rootDir: string,
): OwnerApprovalRecordSubstrateV1[] {
  const out: OwnerApprovalRecordSubstrateV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if (!("parsed" in file)) continue;
    const doc = validateFounderDecisionRegistryDocumentV1(file.parsed);
    if (!doc.ok) continue;
    for (const row of doc.doc.rows) {
      out.push({
        decision_id: row.decision_id,
        decision_status: row.decision_status,
        source_queue_row_id: row.source_queue_row_id,
        source_decision_packet_id: row.source_decision_packet_id,
        owner_note: row.owner_note,
        allowed_next_scope: row.allowed_next_scope,
        ...(row.executive_recommendation_decision_priors
          ? {
              executive_recommendation_decision_priors:
                row.executive_recommendation_decision_priors,
            }
          : {}),
      });
    }
  }
  return out;
}

export function buildDecisionPriorsFrameworkProjectionFromRepoV1(args?: {
  rootDir?: string;
  now?: () => Date;
}): DecisionPriorsFrameworkProjectionV1 {
  const rootDir = args?.rootDir ?? path.resolve(process.cwd());
  return buildDecisionPriorsFrameworkProjectionV1({
    candidates: loadCandidateExecutiveDecisionsFromOwnerDecisionRequestsV1(rootDir),
    oar_rows: loadOwnerApprovalRecordSubstratesFromRegistryV1(rootDir),
    now: args?.now,
  });
}
