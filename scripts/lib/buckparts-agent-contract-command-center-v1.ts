/**
 * Command Center v2 projection for BuckParts Agent Contract v1 (read-only).
 */

import {
  BUCKPARTS_AGENT_CC_JQ_PATH_V1,
  BUCKPARTS_AGENT_CONTRACT_V1,
  BUCKPARTS_AGENT_SOURCE_COMMAND_V1,
  buildAgentContractProjectionV1,
  type AgentContractProjectionV1,
} from "./buckparts-agent-contract-v1";

export const AGENT_CONTRACT_CC_LANE_CONTRACT_V1 = "agent_contract_v1" as const;

export type AgentContractCommandCenterLaneV1 = Omit<AgentContractProjectionV1, "contract"> & {
  contract: typeof AGENT_CONTRACT_CC_LANE_CONTRACT_V1;
};

export function buildAgentContractCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): AgentContractCommandCenterLaneV1 {
  const projection = buildAgentContractProjectionV1(args);
  return {
    ...projection,
    contract: AGENT_CONTRACT_CC_LANE_CONTRACT_V1,
    recommended_jq_path: BUCKPARTS_AGENT_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_AGENT_SOURCE_COMMAND_V1,
  };
}

export function buildAgentContractCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): AgentContractCommandCenterLaneV1 {
  return {
    contract: AGENT_CONTRACT_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: BUCKPARTS_AGENT_CC_JQ_PATH_V1,
    source_command: BUCKPARTS_AGENT_SOURCE_COMMAND_V1,
    generated_at: args.generated_at,
    manifest_count: 0,
    pending_result_count: 0,
    validation_pass_count: 0,
    validation_fail_count: 0,
    timed_out_count: 0,
    exhausted_count: 0,
    latest_manifests: [],
    recommended_next_action: `UNKNOWN: Agent contract lane failed — ${args.reason}`,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}

export {
  BUCKPARTS_AGENT_CC_JQ_PATH_V1,
  BUCKPARTS_AGENT_CONTRACT_V1,
  BUCKPARTS_AGENT_SOURCE_COMMAND_V1,
};
