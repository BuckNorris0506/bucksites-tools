/**
 * Command Center v2 projection for BuckParts execution ledger v1 (read-only).
 */

import {
  BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1,
  BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
  buildBuckpartsExecutionLedgerReportV1,
  loadBuckpartsExecutionLedgerReportV1,
  type BuckpartsExecutionLedgerReportV1,
  type ExecutionLedgerCapabilityGroupV1,
  type ExecutionLedgerEntryV1,
} from "./buckparts-execution-ledger-v1";

export const BUCKPARTS_EXECUTION_LEDGER_CC_LANE_CONTRACT_V1 = "buckparts_execution_ledger_v1" as const;

export const BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1 =
  ".command_center_v2.execution_ledger_v1" as const;

export type BuckpartsExecutionLedgerCommandCenterLaneV1 = {
  contract: typeof BUCKPARTS_EXECUTION_LEDGER_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  coverage_unlocked: false;
  recommended_jq_path: typeof BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1;
  generated_at: string;
  ledger_artifact_path: string;
  source_command: typeof BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1;
  entry_count: number;
  entries: ExecutionLedgerEntryV1[];
  capability_timeline: ExecutionLedgerCapabilityGroupV1[];
  last_completed_capability: ExecutionLedgerEntryV1 | null;
  source_paths_read: string[];
  inspect_summary: BuckpartsExecutionLedgerReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function buildBuckpartsExecutionLedgerCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
}): BuckpartsExecutionLedgerCommandCenterLaneV1 {
  const report =
    loadBuckpartsExecutionLedgerReportV1({ rootDir: args.rootDir }) ??
    buildBuckpartsExecutionLedgerReportV1({
      rootDir: args.rootDir,
      now: args.now,
    });

  return {
    contract: BUCKPARTS_EXECUTION_LEDGER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    ledger_artifact_path: BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1,
    source_command: BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
    entry_count: report.entry_count,
    entries: report.entries,
    capability_timeline: report.capability_timeline,
    last_completed_capability: report.last_completed_capability,
    source_paths_read: report.source_paths_read,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildBuckpartsExecutionLedgerCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): BuckpartsExecutionLedgerCommandCenterLaneV1 {
  return {
    contract: BUCKPARTS_EXECUTION_LEDGER_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    ledger_artifact_path: BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1,
    source_command: BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
    entry_count: 0,
    entries: [],
    capability_timeline: [],
    last_completed_capability: null,
    source_paths_read: [],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: BUCKPARTS_EXECUTION_LEDGER_CC_JQ_PATH_V1,
        entries: ".entries",
        capability_timeline: ".capability_timeline",
        last_completed_capability: ".last_completed_capability",
      },
      recommended_next_action: `UNKNOWN — execution ledger lane failed: ${args.reason}`,
    },
    recommended_next_action: `UNKNOWN — execution ledger lane failed: ${args.reason}`,
    proven_facts: [],
    unknown_facts: [
      `UNKNOWN: execution ledger build failed (${args.reason}).`,
      "UNKNOWN: completed operational history until ledger sources are readable.",
    ],
  };
}
