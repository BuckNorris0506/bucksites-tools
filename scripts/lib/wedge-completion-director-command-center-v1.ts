/**
 * Command Center v2 projection for Wedge Completion Director v1 (read-only).
 */

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1,
  WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1,
  buildWedgeCompletionDirectorReportUnknownV1,
  buildWedgeCompletionDirectorReportV1,
  type WedgeCompletionDirectorRecommendedActionV1,
  type WedgeCompletionDirectorReportV1,
} from "./wedge-completion-director-v1";

export const WEDGE_COMPLETION_DIRECTOR_CC_LANE_CONTRACT_V1 =
  WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1;

export type WedgeCompletionDirectorCommandCenterInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".recommended_next_action";
    command_center: typeof WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1;
    evaluator: ".command_center_v2.wedge_completion_evaluator_v1";
  };
  overall_status: WedgeCompletionDirectorReportV1["overall_status"];
  recommended_action_id: WedgeCompletionDirectorRecommendedActionV1["action_id"];
  blocking_criterion_ids: string[];
  top_blocking_slug: string | null;
  fail_criteria_addressed_count: number;
  director_generated_at: string;
  evaluator_source_command: string;
};

export type WedgeCompletionDirectorCommandCenterLaneV1 = WedgeCompletionDirectorReportV1 & {
  contract: typeof WEDGE_COMPLETION_DIRECTOR_CC_LANE_CONTRACT_V1;
  recommended_jq_path: typeof WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1;
  inspect_summary: WedgeCompletionDirectorCommandCenterInspectSummaryV1;
};

function buildInspectSummary(
  report: WedgeCompletionDirectorReportV1,
): WedgeCompletionDirectorCommandCenterInspectSummaryV1 {
  return {
    recommended_jq_paths: {
      standalone_report: ".recommended_next_action",
      command_center: WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1,
      evaluator: ".command_center_v2.wedge_completion_evaluator_v1",
    },
    overall_status: report.overall_status,
    recommended_action_id: report.recommended_next_action.action_id,
    blocking_criterion_ids: report.recommended_next_action.blocking_criterion_ids,
    top_blocking_slug: report.recommended_next_action.top_blocking_slug,
    fail_criteria_addressed_count: report.recommended_next_action.fail_criteria_addressed_count,
    director_generated_at: report.generated_at,
    evaluator_source_command: report.evaluator_source_command,
  };
}

export async function buildWedgeCompletionDirectorCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<WedgeCompletionDirectorCommandCenterLaneV1> {
  const report = await buildWedgeCompletionDirectorReportV1({
    rootDir: args.rootDir,
    now: args.now,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  });
  return {
    ...report,
    contract: WEDGE_COMPLETION_DIRECTOR_CC_LANE_CONTRACT_V1,
    recommended_jq_path: WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1,
    inspect_summary: buildInspectSummary(report),
  };
}

export function buildWedgeCompletionDirectorCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): WedgeCompletionDirectorCommandCenterLaneV1 {
  const report = buildWedgeCompletionDirectorReportUnknownV1({
    generated_at: args.generated_at,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    reason: args.reason,
  });
  return {
    ...report,
    contract: WEDGE_COMPLETION_DIRECTOR_CC_LANE_CONTRACT_V1,
    recommended_jq_path: WEDGE_COMPLETION_DIRECTOR_CC_JQ_PATH_V1,
    inspect_summary: buildInspectSummary(report),
  };
}
