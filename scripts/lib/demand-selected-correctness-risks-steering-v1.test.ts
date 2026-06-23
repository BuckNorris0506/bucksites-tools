import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AP_DEMAND_SELECTED_CORRECTNESS_BLOCKING_VERDICTS_V1,
  filterOpenLinkedCorrectnessIssuesV1,
  hasBlockingCorrectnessVerdictsV1,
  isBlockingCorrectnessVerdictV1,
  resolveDemandSelectedCorrectnessRisksSteeringOverrideV1,
  shouldClearDemandSelectedCorrectnessRisksSteeringV1,
} from "./demand-selected-correctness-risks-steering-v1";
import { DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1 } from "./demand-to-coverage-next-lane-v1";
import type { CommandCenterIssueRecordV1 } from "./command-center-issue-registry-v1";

const provenDemandLane = {
  read_only: true as const,
  data_mutation: false as const,
  runtime_status: "PROVEN" as const,
  recommendation_status: "START_NEW_DEMAND_SELECTED_BATCH" as const,
  recommended_wedge: "air_purifier" as const,
};

const provenCorrectnessRisks = {
  source_status: "PROVEN" as const,
  vornado_md1_0023_status: "issue_track_and_split_before_progression",
  renpho_rp_ap003_status: "exclude_from_future_batch_progression",
  recommended_action:
    "Track vornado-md1-0023 identity split | Exclude renpho-rp-ap003 from future batch progression",
};

const provenOpenBatchProof = {
  open_batch_existence: "PROVEN" as const,
};

function linkedIssue(
  issueId: string,
  filterSlug: string,
  status: CommandCenterIssueRecordV1["status"] = "PACKET_READY",
): CommandCenterIssueRecordV1 {
  return {
    issue_id: issueId,
    title: `${issueId} title`,
    issue_type: "ap_catalog_identity",
    severity: "TIER_1",
    source_system: "ap_demand_selected_correctness_risks_v1",
    detected_at: "2026-06-23T21:00:00.000Z",
    status,
    assigned_to: "Owner",
    affected_routes: [`/filter/${filterSlug}`],
    evidence_files: [],
    repair_commit: null,
    deploy_commit: null,
    closed_at: status === "CLOSED_PROVEN" ? "2026-06-24T00:00:00.000Z" : null,
    re_audit_outcome: null,
    closure_reason: null,
    closure_evidence: [],
    closure_approved: status === "CLOSED_PROVEN",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    issue_packet_v1: {
      contract: "command_center_issue_packet_v1",
      read_only: true,
      filter_slug: filterSlug,
      wedge: "air_purifier",
      measurable_blocker: "blocker",
      stalled_lane_contract: "air_purifier_demand_selected_batch_owner_review_v1",
      closure_criteria: [],
      affected_artifacts: [],
      affected_queues: [],
      owner_review_implications: [],
      future_batch_scope_rules: [],
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
    },
  };
}

const liveRepoIssues = [
  linkedIssue("BP-000005", "vornado-md1-0023"),
  linkedIssue("BP-000006", "renpho-rp-ap003"),
];

describe("demand-selected-correctness-risks-steering-v1", () => {
  test("blocking verdict constants cover live audit statuses", () => {
    assert.ok(
      isBlockingCorrectnessVerdictV1("issue_track_and_split_before_progression"),
    );
    assert.ok(isBlockingCorrectnessVerdictV1("exclude_from_future_batch_progression"));
    assert.equal(isBlockingCorrectnessVerdictV1("UNKNOWN"), false);
    assert.equal(AP_DEMAND_SELECTED_CORRECTNESS_BLOCKING_VERDICTS_V1.length, 2);
  });

  test("returns override for live-repo-shaped activation inputs", () => {
    const override = resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
      correctnessRisks: provenCorrectnessRisks,
      ownerReviewOpenBatchProof: provenOpenBatchProof,
      demandLane: provenDemandLane,
      issues: liveRepoIssues,
      brainStopTheLine: false,
    });

    assert.ok(override);
    assert.match(
      override.next_best_action,
      /^CORRECTNESS_RISKS \[CORRECTNESS_RESOLUTION_REQUIRED\]:/,
    );
    assert.match(override.next_best_action, /BP-000005 \(vornado-md1-0023\)/);
    assert.match(override.next_best_action, /BP-000006 \(renpho-rp-ap003\)/);
    assert.match(override.next_best_action, /catalog identity correctness blocks batch progression/i);
    assert.match(override.next_best_action, /batch-planning messaging \(wedge selection unchanged\)/i);
    assert.match(override.next_best_action, /mutation unauthorized/i);
    assert.deepEqual(override.linked_issue_ids, ["BP-000005", "BP-000006"]);
    assert.ok(
      override.mutation_block_reasons.every((reason) => !/authorized=true/i.test(reason)),
    );
    assert.ok(
      override.mutation_block_reasons.includes(
        `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:recommendation_status=START_NEW_DEMAND_SELECTED_BATCH`,
      ),
    );
  });

  test("returns null when brainStopTheLine is true", () => {
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: provenCorrectnessRisks,
        ownerReviewOpenBatchProof: provenOpenBatchProof,
        demandLane: provenDemandLane,
        issues: liveRepoIssues,
        brainStopTheLine: true,
      }),
      null,
    );
  });

  test("returns null when open batch existence is not proven", () => {
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: provenCorrectnessRisks,
        ownerReviewOpenBatchProof: { open_batch_existence: "NOT_PROVEN" },
        demandLane: provenDemandLane,
        issues: liveRepoIssues,
        brainStopTheLine: false,
      }),
      null,
    );
  });

  test("returns null when correctness source is not PROVEN", () => {
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: { ...provenCorrectnessRisks, source_status: "UNKNOWN" },
        ownerReviewOpenBatchProof: provenOpenBatchProof,
        demandLane: provenDemandLane,
        issues: liveRepoIssues,
        brainStopTheLine: false,
      }),
      null,
    );
  });

  test("returns null when demand wedge or recommendation status does not match", () => {
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: provenCorrectnessRisks,
        ownerReviewOpenBatchProof: provenOpenBatchProof,
        demandLane: { ...provenDemandLane, recommended_wedge: "refrigerator_water" },
        issues: liveRepoIssues,
        brainStopTheLine: false,
      }),
      null,
    );
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: provenCorrectnessRisks,
        ownerReviewOpenBatchProof: provenOpenBatchProof,
        demandLane: { ...provenDemandLane, recommendation_status: "RECOMMEND_REOPEN" },
        issues: liveRepoIssues,
        brainStopTheLine: false,
      }),
      null,
    );
  });

  test("clears when all linked issues are CLOSED_PROVEN even if audit verdicts remain blocking", () => {
    const closedIssues = liveRepoIssues.map((issue) => ({
      ...issue,
      status: "CLOSED_PROVEN" as const,
      closed_at: "2026-06-24T00:00:00.000Z",
      closure_approved: true,
    }));

    assert.equal(
      shouldClearDemandSelectedCorrectnessRisksSteeringV1({
        correctnessRisks: provenCorrectnessRisks,
        issues: closedIssues,
      }),
      true,
    );
    assert.equal(
      resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
        correctnessRisks: provenCorrectnessRisks,
        ownerReviewOpenBatchProof: provenOpenBatchProof,
        demandLane: provenDemandLane,
        issues: closedIssues,
        brainStopTheLine: false,
      }),
      null,
    );
  });

  test("still returns override when only BP-000005 is closed but renpho verdict remains blocking", () => {
    const partialIssues = [
      linkedIssue("BP-000005", "vornado-md1-0023", "CLOSED_PROVEN"),
      linkedIssue("BP-000006", "renpho-rp-ap003", "PACKET_READY"),
    ];

    assert.equal(
      shouldClearDemandSelectedCorrectnessRisksSteeringV1({
        correctnessRisks: provenCorrectnessRisks,
        issues: partialIssues,
      }),
      false,
    );
    assert.ok(hasBlockingCorrectnessVerdictsV1(provenCorrectnessRisks));
    assert.deepEqual(
      filterOpenLinkedCorrectnessIssuesV1(partialIssues).map((issue) => issue.issue_id),
      ["BP-000006"],
    );

    const override = resolveDemandSelectedCorrectnessRisksSteeringOverrideV1({
      correctnessRisks: provenCorrectnessRisks,
      ownerReviewOpenBatchProof: provenOpenBatchProof,
      demandLane: provenDemandLane,
      issues: partialIssues,
      brainStopTheLine: false,
    });

    assert.ok(override);
    assert.match(override.next_best_action, /BP-000006 \(renpho-rp-ap003\)/);
    assert.doesNotMatch(override.next_best_action, /BP-000005/);
  });
});
