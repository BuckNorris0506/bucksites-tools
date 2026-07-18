/**
 * Command Center v2 projection for BuckParts execution ledger v1 (read-only).
 */

import {
  BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1,
  BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
  EXECUTION_LEDGER_TRIGGER_COMMAND_CENTER_V1,
  loadBuckpartsExecutionLedgerReportV1,
  refreshBuckpartsExecutionLedgerV1,
  resolveExecutionLedgerFreshnessV1,
  type BuckpartsExecutionLedgerReportV1,
  type ExecutionLedgerCapabilityGroupV1,
  type ExecutionLedgerEntryV1,
  type ExecutionLedgerFreshnessV1,
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
  freshness: ExecutionLedgerFreshnessV1;
  inspect_summary: BuckpartsExecutionLedgerReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export function buildBuckpartsExecutionLedgerCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  auto_refresh?: boolean;
  trigger_source?: string;
}): BuckpartsExecutionLedgerCommandCenterLaneV1 {
  const triggerSource = args.trigger_source ?? EXECUTION_LEDGER_TRIGGER_COMMAND_CENTER_V1;
  // Default: load-only. Refresh requires explicit auto_refresh=true opt-in.
  const report =
    args.auto_refresh === true
      ? refreshBuckpartsExecutionLedgerV1({
          rootDir: args.rootDir,
          trigger_source: triggerSource,
          now: args.now,
        }).report
      : loadBuckpartsExecutionLedgerReportV1({ rootDir: args.rootDir });

  if (!report) {
    throw new Error("execution ledger artifact missing and auto_refresh!=true");
  }

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
    freshness: resolveExecutionLedgerFreshnessV1(report, args.now),
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
    freshness: {
      last_generated_at: args.generated_at,
      source_artifact_count: 0,
      stale_after: "UNKNOWN",
      freshness_status: "UNKNOWN",
      last_refresh_trigger_source: "UNKNOWN",
    },
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
