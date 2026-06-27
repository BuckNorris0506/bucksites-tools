/**
 * Command Center v2 projection for Wedge Completion Evaluator v1 (read-only).
 */

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  WEDGE_COMPLETION_EVALUATOR_CC_JQ_PATH_V1,
  WEDGE_COMPLETION_EVALUATOR_CONTRACT_V1,
  WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
  buildWedgeCompletionEvaluatorReportV1,
  type WedgeCompletionEvaluatorReportV1,
} from "./wedge-completion-evaluator-v1";

export const WEDGE_COMPLETION_EVALUATOR_CC_LANE_CONTRACT_V1 =
  "wedge_completion_evaluator_v1" as const;

export type WedgeCompletionEvaluatorCommandCenterLaneV1 = WedgeCompletionEvaluatorReportV1 & {
  contract: typeof WEDGE_COMPLETION_EVALUATOR_CC_LANE_CONTRACT_V1;
  recommended_jq_path: typeof WEDGE_COMPLETION_EVALUATOR_CC_JQ_PATH_V1;
};

export async function buildWedgeCompletionEvaluatorCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<WedgeCompletionEvaluatorCommandCenterLaneV1> {
  const report = await buildWedgeCompletionEvaluatorReportV1({
    rootDir: args.rootDir,
    now: args.now,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  });
  return {
    ...report,
    contract: WEDGE_COMPLETION_EVALUATOR_CC_LANE_CONTRACT_V1,
    recommended_jq_path: WEDGE_COMPLETION_EVALUATOR_CC_JQ_PATH_V1,
  };
}

export function buildWedgeCompletionEvaluatorCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): WedgeCompletionEvaluatorCommandCenterLaneV1 {
  return {
    contract: WEDGE_COMPLETION_EVALUATOR_CC_LANE_CONTRACT_V1,
    audit_contract: "wedge_completion_audit_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    source_command: WEDGE_COMPLETION_EVALUATOR_SOURCE_COMMAND_V1,
    standard_design_doc: "docs/BuckParts-WEDGE-COMPLETION-STANDARD-DESIGN.md",
    generated_at: args.generated_at,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    overall_status: "EVALUATION_UNKNOWN",
    dimensions: [],
    blocking_dimensions: [],
    blocking_criteria: [],
    recommended_next_action: `UNKNOWN: wedge completion evaluator lane failed — ${args.reason}`,
    recommended_jq_path: WEDGE_COMPLETION_EVALUATOR_CC_JQ_PATH_V1,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}
