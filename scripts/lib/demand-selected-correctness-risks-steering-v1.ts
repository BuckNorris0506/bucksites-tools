/**
 * Command Center steering when AP demand-selected discovery is proven but correctness risks block progression.
 * Demotes stale demand_to_coverage batch-planning NBA; does not change demand lane or mutation authority.
 */

import {
  COMMAND_CENTER_ISSUES_DIR_REL_V1,
  type CommandCenterIssueRecordV1,
} from "./command-center-issue-registry-v1";
import type { AirPurifierDemandSelectedCorrectnessRisksLaneV1 } from "./air-purifier-demand-selected-correctness-risks-command-center-v1";
import {
  AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1,
  AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1,
} from "./air-purifier-demand-selected-correctness-risks-command-center-v1";
import type { ApDemandSelectedOpenBatchProofStatusV1 } from "./ap-demand-selected-batch-run-registry-v1";
import {
  DEMAND_TO_COVERAGE_AFTER_FRIDGE_CLOSEOUT_STEERING_STATUS_V1,
  DEMAND_TO_COVERAGE_NEXT_LANE_SOURCE_COMMAND_V1,
} from "./refrigerator-water-closed-lifecycle-command-center-steering-v1";
import type { DemandToCoverageNextLaneReportV1 } from "./demand-to-coverage-next-lane-v1";
import { DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1 } from "./demand-to-coverage-next-lane-v1";

export const DEMAND_SELECTED_CORRECTNESS_RISKS_STEERING_STATUS_V1 =
  "CORRECTNESS_RESOLUTION_REQUIRED" as const;

export const AP_DEMAND_SELECTED_CORRECTNESS_RISKS_SOURCE_SYSTEM_V1 =
  "ap_demand_selected_correctness_risks_v1" as const;

export const AP_DEMAND_SELECTED_CORRECTNESS_BLOCKING_VERDICTS_V1 = [
  "issue_track_and_split_before_progression",
  "exclude_from_future_batch_progression",
] as const;

export type ApDemandSelectedCorrectnessBlockingVerdictV1 =
  (typeof AP_DEMAND_SELECTED_CORRECTNESS_BLOCKING_VERDICTS_V1)[number];

export type DemandSelectedCorrectnessRisksSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  demoted_steering_layers: string[];
  mutation_block_reasons: string[];
  linked_issue_ids: string[];
};

export function isBlockingCorrectnessVerdictV1(status: string | "UNKNOWN"): boolean {
  return (AP_DEMAND_SELECTED_CORRECTNESS_BLOCKING_VERDICTS_V1 as readonly string[]).includes(
    status,
  );
}

export function hasBlockingCorrectnessVerdictsV1(
  correctnessRisks: Pick<
    AirPurifierDemandSelectedCorrectnessRisksLaneV1,
    "vornado_md1_0023_status" | "renpho_rp_ap003_status"
  >,
): boolean {
  return (
    isBlockingCorrectnessVerdictV1(correctnessRisks.vornado_md1_0023_status) ||
    isBlockingCorrectnessVerdictV1(correctnessRisks.renpho_rp_ap003_status)
  );
}

export function filterLinkedCorrectnessIssuesV1(
  issues: CommandCenterIssueRecordV1[],
): CommandCenterIssueRecordV1[] {
  return issues.filter(
    (issue) => issue.source_system === AP_DEMAND_SELECTED_CORRECTNESS_RISKS_SOURCE_SYSTEM_V1,
  );
}

export function filterOpenLinkedCorrectnessIssuesV1(
  issues: CommandCenterIssueRecordV1[],
): CommandCenterIssueRecordV1[] {
  return filterLinkedCorrectnessIssuesV1(issues).filter(
    (issue) => issue.status !== "CLOSED_PROVEN",
  );
}

export function shouldClearDemandSelectedCorrectnessRisksSteeringV1(args: {
  correctnessRisks: Pick<
    AirPurifierDemandSelectedCorrectnessRisksLaneV1,
    "vornado_md1_0023_status" | "renpho_rp_ap003_status"
  >;
  issues: CommandCenterIssueRecordV1[];
}): boolean {
  const linkedIssues = filterLinkedCorrectnessIssuesV1(args.issues);
  const openLinkedIssues = linkedIssues.filter((issue) => issue.status !== "CLOSED_PROVEN");

  if (
    linkedIssues.length > 0 &&
    openLinkedIssues.length === 0 &&
    linkedIssues.every((issue) => issue.status === "CLOSED_PROVEN")
  ) {
    return true;
  }

  return !hasBlockingCorrectnessVerdictsV1(args.correctnessRisks) && openLinkedIssues.length === 0;
}

export function resolveDemandSelectedCorrectnessRisksSteeringOverrideV1(args: {
  correctnessRisks: Pick<
    AirPurifierDemandSelectedCorrectnessRisksLaneV1,
    | "source_status"
    | "vornado_md1_0023_status"
    | "renpho_rp_ap003_status"
    | "recommended_action"
  >;
  ownerReviewOpenBatchProof: Pick<ApDemandSelectedOpenBatchProofStatusV1, "open_batch_existence">;
  demandLane: Pick<
    DemandToCoverageNextLaneReportV1,
    | "read_only"
    | "data_mutation"
    | "runtime_status"
    | "recommendation_status"
    | "recommended_wedge"
  >;
  issues: CommandCenterIssueRecordV1[];
  brainStopTheLine: boolean;
}): DemandSelectedCorrectnessRisksSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.demandLane.read_only !== true || args.demandLane.data_mutation !== false) return null;
  if (args.demandLane.runtime_status !== "PROVEN") return null;
  if (args.demandLane.recommendation_status !== "START_NEW_DEMAND_SELECTED_BATCH") return null;
  if (args.demandLane.recommended_wedge !== "air_purifier") return null;
  if (args.correctnessRisks.source_status !== "PROVEN") return null;
  if (args.ownerReviewOpenBatchProof.open_batch_existence !== "PROVEN") return null;

  if (
    shouldClearDemandSelectedCorrectnessRisksSteeringV1({
      correctnessRisks: args.correctnessRisks,
      issues: args.issues,
    })
  ) {
    return null;
  }

  if (!hasBlockingCorrectnessVerdictsV1(args.correctnessRisks)) return null;

  const openLinkedIssues = filterOpenLinkedCorrectnessIssuesV1(args.issues);
  const linkedIssueIds =
    openLinkedIssues.length > 0
      ? openLinkedIssues.map((issue) => issue.issue_id)
      : filterLinkedCorrectnessIssuesV1(args.issues).map((issue) => issue.issue_id);

  const issueCitation =
    linkedIssueIds.length > 0
      ? linkedIssueIds
          .map((issueId) => {
            const issue = args.issues.find((row) => row.issue_id === issueId);
            const slug = issue?.issue_packet_v1?.filter_slug;
            return slug ? `${issueId} (${slug})` : issueId;
          })
          .join(" and ")
      : "linked correctness-risk issue packets";

  const verdictSummary = [
    args.correctnessRisks.vornado_md1_0023_status !== "UNKNOWN"
      ? `vornado-md1-0023=${args.correctnessRisks.vornado_md1_0023_status}`
      : null,
    args.correctnessRisks.renpho_rp_ap003_status !== "UNKNOWN"
      ? `renpho-rp-ap003=${args.correctnessRisks.renpho_rp_ap003_status}`
      : null,
  ]
    .filter((value): value is string => value != null)
    .join("; ");

  return {
    linked_issue_ids: linkedIssueIds,
    next_best_action:
      `CORRECTNESS_RISKS [${DEMAND_SELECTED_CORRECTNESS_RISKS_STEERING_STATUS_V1}]: ` +
      `AP demand-selected discovery is proven on disk but catalog identity correctness blocks batch progression` +
      (verdictSummary ? ` (${verdictSummary})` : "") +
      `. Resolve owner-approved catalog identity for ${issueCitation} before resuming demand-selected batch planning. ` +
      "Mutation unauthorized. " +
      `Demoted: demand_to_coverage ${DEMAND_TO_COVERAGE_AFTER_FRIDGE_CLOSEOUT_STEERING_STATUS_V1} batch-planning messaging (wedge selection unchanged).`,
    why_this_action:
      typeof args.correctnessRisks.recommended_action === "string" &&
      args.correctnessRisks.recommended_action !== "UNKNOWN"
        ? args.correctnessRisks.recommended_action
        : "Correctness-risk audit blocks demand-selected batch progression until catalog identity is owner-resolved.",
    next_move_command:
      linkedIssueIds.length > 0
        ? `Review ${COMMAND_CENTER_ISSUES_DIR_REL_V1}/${linkedIssueIds.join(".json and ")}.json and ${AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1}; advance only with owner-approved catalog identity resolution.`
        : `Review ${AP_DEMAND_SELECTED_CORRECTNESS_RISKS_AUDIT_REL_PATH_V1}; advance only with owner-approved catalog identity resolution.`,
    demoted_steering_layers: [
      `demand_to_coverage:${DEMAND_TO_COVERAGE_AFTER_FRIDGE_CLOSEOUT_STEERING_STATUS_V1}`,
      DEMAND_TO_COVERAGE_NEXT_LANE_SOURCE_COMMAND_V1,
    ],
    mutation_block_reasons: [
      `${AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1}:source_status=PROVEN`,
      `${AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1}:blocking_verdicts_present`,
      "ap_demand_selected_open_batch:open_batch_existence=PROVEN",
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:read_only=true`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:data_mutation=false`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:runtime_status=PROVEN`,
      `${DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1}:recommendation_status=START_NEW_DEMAND_SELECTED_BATCH`,
      "demand_selected_batch:batch_start_authorized=false",
      "demand_selected_batch:csv_apply_authorized=false",
      "demand_selected_batch:supabase_mutation_authorized=false",
      "demand_selected_batch:evidence_write_authorized=false",
      "demand_selected_batch:netlify_api_authorized=false",
      "demand_selected_batch:public_ui_mutation_authorized=false",
      ...linkedIssueIds.map((issueId) => `correctness_linked_issue_open:${issueId}`),
    ],
  };
}
