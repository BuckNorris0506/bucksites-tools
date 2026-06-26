/**
 * BuckParts Truth MCP v1 — execution ledger intelligence (read-only).
 * Projects committed ledger artifact when present, else live derived build.
 */

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
  BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1,
  BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1,
  buildBuckpartsExecutionLedgerReportV1,
  loadBuckpartsExecutionLedgerReportV1,
  type BuckpartsExecutionLedgerReportV1,
  type ExecutionLedgerEntryV1,
} from "./buckparts-execution-ledger-v1";

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

export const BUCKPARTS_MCP_EXECUTION_LEDGER_CONTRACT_V1 = "buckparts_mcp_execution_ledger_v1" as const;

export const EXECUTION_LEDGER_CC_JQ_PATH_V1 = ".command_center_v2.execution_ledger_v1" as const;

type LedgerLoadSourceV1 = "committed_artifact" | "live_build";

type LedgerLoadResultV1 =
  | {
      ok: true;
      report: BuckpartsExecutionLedgerReportV1;
      source: LedgerLoadSourceV1;
      repo_paths_read: string[];
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_EXECUTION_LEDGER_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_EXECUTION_LEDGER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function loadLedgerForMcp(deps: BuckPartsMcpDepsV1): LedgerLoadResultV1 {
  const committed = loadBuckpartsExecutionLedgerReportV1({ rootDir: deps.rootDir });
  if (committed) {
    return {
      ok: true,
      report: committed,
      source: "committed_artifact",
      repo_paths_read: [BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1, ...committed.source_paths_read],
    };
  }

  try {
    const report = buildBuckpartsExecutionLedgerReportV1({ rootDir: deps.rootDir });
    return {
      ok: true,
      report,
      source: "live_build",
      repo_paths_read: report.source_paths_read,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [BUCKPARTS_EXECUTION_LEDGER_JSON_REL_V1],
      truth_note: `Execution ledger load failed: ${message}`,
    };
  }
}

function normalizeLookupToken(value: string): string {
  return value.trim().toLowerCase();
}

function entryMatchesLookup(entry: ExecutionLedgerEntryV1, token: string): boolean {
  const normalized = normalizeLookupToken(token);
  if (!normalized) return false;
  if (normalizeLookupToken(entry.entry_id).includes(normalized)) return true;
  if (normalizeLookupToken(entry.operational_lane).includes(normalized)) return true;
  if (
    entry.business_capability_unlocked !== "UNKNOWN" &&
    normalizeLookupToken(entry.business_capability_unlocked).includes(normalized)
  ) {
    return true;
  }
  if (entry.commit_sha !== "UNKNOWN" && entry.commit_sha.toLowerCase().startsWith(normalized)) {
    return true;
  }
  return false;
}

export function executionHistoryV1(
  deps: BuckPartsMcpDepsV1,
  limit?: number,
): ReturnType<typeof envelope> & {
  truth_status: "PROVEN" | "UNKNOWN";
  source: LedgerLoadSourceV1 | "UNKNOWN";
  entry_count: number;
  entries: ExecutionLedgerEntryV1[];
  command_center_jq_path: typeof EXECUTION_LEDGER_CC_JQ_PATH_V1;
  repo_paths_read: string[];
  truth_note: string;
} {
  const loaded = loadLedgerForMcp(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      truth_status: "UNKNOWN",
      source: "UNKNOWN",
      entry_count: 0,
      entries: [],
      command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const bounded =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? loaded.report.entries.slice(0, Math.floor(limit))
      : loaded.report.entries;

  return {
    ...envelope(),
    truth_status: "PROVEN",
    source: loaded.source,
    entry_count: bounded.length,
    entries: bounded,
    command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      loaded.source === "committed_artifact"
        ? "Execution history from committed ledger artifact."
        : `Live derived ledger (no committed artifact). Run ${BUCKPARTS_EXECUTION_LEDGER_SOURCE_COMMAND_V1} to materialize.`,
  };
}

export function lastCompletedCapabilityV1(deps: BuckPartsMcpDepsV1): ReturnType<typeof envelope> & {
  truth_status: "PROVEN" | "UNKNOWN";
  source: LedgerLoadSourceV1 | "UNKNOWN";
  last_completed_capability: ExecutionLedgerEntryV1 | null;
  command_center_jq_path: typeof EXECUTION_LEDGER_CC_JQ_PATH_V1;
  repo_paths_read: string[];
  truth_note: string;
} {
  const loaded = loadLedgerForMcp(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      truth_status: "UNKNOWN",
      source: "UNKNOWN",
      last_completed_capability: null,
      command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  return {
    ...envelope(),
    truth_status: loaded.report.last_completed_capability ? "PROVEN" : "UNKNOWN",
    source: loaded.source,
    last_completed_capability: loaded.report.last_completed_capability,
    command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
    repo_paths_read: loaded.repo_paths_read,
    truth_note: loaded.report.last_completed_capability
      ? "Most recent completed capability from ledger ordering by completion_timestamp."
      : "UNKNOWN — no completed ledger entries found in committed sources.",
  };
}

export function capabilityTimelineV1(deps: BuckPartsMcpDepsV1): ReturnType<typeof envelope> & {
  truth_status: "PROVEN" | "UNKNOWN";
  source: LedgerLoadSourceV1 | "UNKNOWN";
  capability_timeline: BuckpartsExecutionLedgerReportV1["capability_timeline"];
  command_center_jq_path: typeof EXECUTION_LEDGER_CC_JQ_PATH_V1;
  repo_paths_read: string[];
  truth_note: string;
} {
  const loaded = loadLedgerForMcp(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      truth_status: "UNKNOWN",
      source: "UNKNOWN",
      capability_timeline: [],
      command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  return {
    ...envelope(),
    truth_status: loaded.report.capability_timeline.length > 0 ? "PROVEN" : "UNKNOWN",
    source: loaded.source,
    capability_timeline: loaded.report.capability_timeline,
    command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      loaded.report.capability_timeline.length > 0
        ? "Capability groups ordered by latest completion per operational lane."
        : "UNKNOWN — no capability timeline entries.",
  };
}

export function capabilityLookupV1(
  deps: BuckPartsMcpDepsV1,
  commitOrName: string,
): ReturnType<typeof envelope> & {
  truth_status: "PROVEN" | "UNKNOWN";
  source: LedgerLoadSourceV1 | "UNKNOWN";
  lookup_token: string;
  match_count: number;
  matches: ExecutionLedgerEntryV1[];
  command_center_jq_path: typeof EXECUTION_LEDGER_CC_JQ_PATH_V1;
  repo_paths_read: string[];
  truth_note: string;
} {
  const loaded = loadLedgerForMcp(deps);
  const lookupToken = commitOrName.trim();
  if (!loaded.ok) {
    return {
      ...envelope(),
      truth_status: "UNKNOWN",
      source: "UNKNOWN",
      lookup_token: lookupToken,
      match_count: 0,
      matches: [],
      command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const matches = loaded.report.entries.filter((entry) => entryMatchesLookup(entry, lookupToken));

  return {
    ...envelope(),
    truth_status: matches.length > 0 ? "PROVEN" : "UNKNOWN",
    source: loaded.source,
    lookup_token: lookupToken,
    match_count: matches.length,
    matches,
    command_center_jq_path: EXECUTION_LEDGER_CC_JQ_PATH_V1,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      matches.length > 0
        ? `Matched ${String(matches.length)} ledger entry(ies) for token "${lookupToken}".`
        : `UNKNOWN — no ledger entries match "${lookupToken}".`,
  };
}

export { BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1 };
