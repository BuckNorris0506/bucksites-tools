/**
 * Batch Production Lane v1 — shared read-only pipeline from --source (no manual JSON).
 * PROVEN: no I/O in pure builders; CLI callers supply readFile deps.
 */

import { buildBatchAgentEvidenceCapturePacketV1 } from "./batch-agent-evidence-capture-packet-v1";
import {
  buildBatchEvidenceCollectionPlanV1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";
import {
  BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
  BATCH_OWNER_SCREENSHOT_DRAFT_NO_WRITE_ATTESTATION_V1,
  buildBatchOwnerScreenshotDraftPacketV1,
  parseBatchOwnerScreenshotFactsInputV1,
  type BatchOwnerScreenshotDraftPacketV1,
  type BatchOwnerScreenshotFactsInputV1,
} from "./batch-owner-screenshot-draft-packet-v1";
import {
  buildBatchProductionReviewFromSourceV1,
  type BuildBatchProductionRowsFromSourceDepsV1,
} from "./batch-production-source-v1";
import type { BatchProductionReviewReportV1 } from "./batch-production-lane-v1";
import type { BatchAgentEvidenceCapturePacketV1 } from "./batch-agent-evidence-capture-packet-v1";

export const BATCH_PLANNING_DRAFT_AWAITING_AGENT_FACTS_V1 =
  "awaiting_agent_facts_from_capture_packet" as const;

export const BATCH_PLANNING_DRAFT_REVIEW_PROVEN_FACT_V1 =
  "PROVEN: Planning-seed draft review built from repo --source without agent-filled facts JSON; every row has draft_ready_for_owner_review=false until agent output is supplied via --facts.";

export type BatchLaneArtifactsFromSourceV1 = {
  source: string;
  review: BatchProductionReviewReportV1;
  plan: BatchEvidenceCollectionPlanV1;
  capture_packet: BatchAgentEvidenceCapturePacketV1;
};

export function buildBatchLaneArtifactsFromSourceV1(
  source: string,
  repoRoot: string,
  deps: BuildBatchProductionRowsFromSourceDepsV1,
  options?: { generated_at?: string },
): BatchLaneArtifactsFromSourceV1 {
  const generated_at = options?.generated_at ?? new Date().toISOString();
  const review = buildBatchProductionReviewFromSourceV1(source, repoRoot, deps);
  const plan = buildBatchEvidenceCollectionPlanV1({
    reviewReport: review,
    generated_at,
  });
  const capture_packet = buildBatchAgentEvidenceCapturePacketV1({
    plan,
    generated_at,
  });
  return { source, review, plan, capture_packet };
}

/** Synthetic draft review for owner planning checklist before agent facts exist. */
export function buildPlanningDraftReviewFromLaneArtifactsV1(
  artifacts: BatchLaneArtifactsFromSourceV1,
  options?: { generated_at?: string },
): BatchOwnerScreenshotDraftPacketV1 {
  const generated_at = options?.generated_at ?? new Date().toISOString();
  const reviewRowById = new Map(
    artifacts.review.candidates.map((row) => [row.row_id, row] as const),
  );

  const rows = artifacts.plan.rows.map((planRow) => {
    const reviewRow = reviewRowById.get(planRow.row_id);
    const planning_review_candidate_url = reviewRow?.url?.trim() || null;

    return {
      row_id: planRow.row_id,
      token: planRow.token,
      slug: planRow.slug,
      source_queue_row_id: planRow.source_queue_row_id,
      proposed_production_evidence_prefix: planRow.evidence_prefix,
      suggested_production_evidence_path: null,
      draft_packet: null,
      planning_review_candidate_url,
      missing_owner_facts: [BATCH_PLANNING_DRAFT_AWAITING_AGENT_FACTS_V1],
      production_evidence_commit_blockers: [],
      draft_ready_for_owner_review: false,
      may_write_production_evidence: false as const,
      may_mutate: false as const,
    };
  });

  return {
    contract: BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_production_evidence: false,
    automation_input: false,
    generated_at,
    source_plan_contract: artifacts.plan.contract,
    source_plan_generated_at: artifacts.plan.generated_at,
    draft_row_count: rows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_production_evidence_write_attestation: BATCH_OWNER_SCREENSHOT_DRAFT_NO_WRITE_ATTESTATION_V1,
    rows,
    proven_facts: [
      BATCH_PLANNING_DRAFT_REVIEW_PROVEN_FACT_V1,
      `PROVEN: source=${artifacts.source}`,
      `PROVEN: cohort_row_count=${rows.length}`,
    ],
    unknown_facts: [
      "UNKNOWN: owner_verdict and agent observations until agent fills capture packet output JSON.",
    ],
  };
}

export type ResolveBatchDraftReviewForOwnerApprovalOptionsV1 = {
  source: string;
  repoRoot: string;
  deps: BuildBatchProductionRowsFromSourceDepsV1;
  factsInput?: BatchOwnerScreenshotFactsInputV1;
  factsRaw?: unknown;
  generated_at?: string;
};

export type ResolveBatchDraftReviewForOwnerApprovalResultV1 = {
  artifacts: BatchLaneArtifactsFromSourceV1;
  draftReview: BatchOwnerScreenshotDraftPacketV1;
  /** True when built without agent facts (planning cohort). */
  from_planning_seed: boolean;
};

/**
 * Resolves draft review for owner approval workflows:
 * - With facts: full draft packet (owner-review-ready when facts satisfy gates).
 * - Without facts: planning-seed draft (checklist cohort; compile fail-closed on approve).
 */
export function resolveBatchDraftReviewForOwnerApprovalV1(
  options: ResolveBatchDraftReviewForOwnerApprovalOptionsV1,
): ResolveBatchDraftReviewForOwnerApprovalResultV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const artifacts = buildBatchLaneArtifactsFromSourceV1(
    options.source,
    options.repoRoot,
    options.deps,
    { generated_at },
  );

  const factsInput =
    options.factsInput ??
    (options.factsRaw != null ? parseBatchOwnerScreenshotFactsInputV1(options.factsRaw) : null);

  if (factsInput) {
    return {
      artifacts,
      draftReview: buildBatchOwnerScreenshotDraftPacketV1({
        plan: artifacts.plan,
        factsInput,
        generated_at,
      }),
      from_planning_seed: false,
    };
  }

  return {
    artifacts,
    draftReview: buildPlanningDraftReviewFromLaneArtifactsV1(artifacts, { generated_at }),
    from_planning_seed: true,
  };
}
