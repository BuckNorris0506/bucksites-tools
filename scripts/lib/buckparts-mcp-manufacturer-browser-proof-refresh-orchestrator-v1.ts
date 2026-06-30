/**
 * BuckParts Truth MCP v2 — manufacturer browser proof refresh orchestrator (read-only).
 * Projects committed refresh orchestrator artifact only; no live rebuild.
 */

import type { BuckPartsMcpDepsV1 } from "./buckparts-mcp-truth-context-v1";
import {
  loadManufacturerBrowserProofRefreshOrchestratorReportV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1,
  manufacturerBrowserProofRefreshBatchRelV1,
  type ManufacturerBrowserProofRefreshBatchV1,
  type ManufacturerBrowserProofRefreshOrchestratorReportV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";
import { MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1 } from "./manufacturer-browser-proof-refresh-orchestrator-command-center-v1";

export const BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1 =
  "buckparts_mcp_manufacturer_browser_proof_refresh_orchestrator_v1" as const;

type McpReadOnlyEnvelopeV1 = {
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

type OrchestratorLoadResultV1 =
  | {
      ok: true;
      report: ManufacturerBrowserProofRefreshOrchestratorReportV1;
      repo_paths_read: string[];
    }
  | {
      ok: false;
      truth_status: "UNKNOWN";
      repo_paths_read: string[];
      truth_note: string;
    };

function envelope(): McpReadOnlyEnvelopeV1 & {
  contract: typeof BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1;
} {
  return {
    contract: BUCKPARTS_MCP_MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function loadOrchestratorArtifact(deps: BuckPartsMcpDepsV1): OrchestratorLoadResultV1 {
  const report = loadManufacturerBrowserProofRefreshOrchestratorReportV1({
    rootDir: deps.rootDir,
  });
  if (!report) {
    return {
      ok: false,
      truth_status: "UNKNOWN",
      repo_paths_read: [MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1],
      truth_note: `Committed refresh orchestrator artifact missing or invalid. Run ${MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1} locally; MCP does not rebuild upstream systems.`,
    };
  }
  return {
    ok: true,
    report,
    repo_paths_read: [
      MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
      ...report.manufacturer_refresh_batch_rels,
    ],
  };
}

function normalizeManufacturerKey(value: string): string {
  return value.trim().toLowerCase();
}

function findBatch(
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1,
  manufacturerKey: string,
): ManufacturerBrowserProofRefreshBatchV1 | null {
  const normalized = normalizeManufacturerKey(manufacturerKey);
  return (
    report.manufacturer_refresh_batches.find(
      (batch) => normalizeManufacturerKey(batch.manufacturer_key) === normalized,
    ) ?? null
  );
}

export function manufacturerBrowserProofRefreshScheduleV1(deps: BuckPartsMcpDepsV1) {
  const loaded = loadOrchestratorArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_refresh_schedule",
      truth_status: loaded.truth_status,
      orchestrator_contract: "UNKNOWN",
      command_center_jq_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1,
      scheduled_slug_count: 0,
      manufacturer_refresh_batch_count: 0,
      manufacturer_refresh_batches: [] as ManufacturerBrowserProofRefreshBatchV1[],
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const { report } = loaded;
  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_refresh_schedule",
    truth_status: "PROVEN" as const,
    orchestrator_contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
    command_center_jq_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1,
    scheduled_slug_count: report.scheduled_slug_count,
    manufacturer_refresh_batch_count: report.manufacturer_refresh_batch_count,
    manufacturer_refresh_batches: report.manufacturer_refresh_batches,
    inspect_summary: report.inspect_summary,
    deploy_build_marker: report.deploy_build_marker,
    auto_pass_forbidden: report.auto_pass_forbidden,
    browser_automation_authorized: report.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: loaded.repo_paths_read,
    truth_note:
      "Refresh schedule projected from committed manufacturer_browser_proof_refresh_orchestrator_v1 artifact only.",
  };
}

export function manufacturerBrowserProofRefreshBatchV1(
  deps: BuckPartsMcpDepsV1,
  manufacturerKey: string,
) {
  const loaded = loadOrchestratorArtifact(deps);
  if (!loaded.ok) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_refresh_batch",
      truth_status: loaded.truth_status,
      found: false,
      manufacturer_key: manufacturerKey,
      batch: null,
      batch_artifact_rel: manufacturerBrowserProofRefreshBatchRelV1(manufacturerKey),
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: loaded.truth_note,
    };
  }

  const batch = findBatch(loaded.report, manufacturerKey);
  const batchRel = manufacturerBrowserProofRefreshBatchRelV1(manufacturerKey);
  if (!batch) {
    return {
      ...envelope(),
      tool: "manufacturer_browser_proof_refresh_batch",
      truth_status: "UNKNOWN" as const,
      found: false,
      manufacturer_key: manufacturerKey,
      batch: null,
      batch_artifact_rel: batchRel,
      auto_pass_forbidden: true,
      browser_automation_authorized: false,
      coverage_unlocked: false,
      repo_paths_read: loaded.repo_paths_read,
      truth_note: `No refresh batch scheduled for manufacturer_key=${manufacturerKey} in committed orchestrator artifact.`,
    };
  }

  return {
    ...envelope(),
    tool: "manufacturer_browser_proof_refresh_batch",
    truth_status: "PROVEN" as const,
    found: true,
    manufacturer_key: batch.manufacturer_key,
    batch,
    batch_artifact_rel: batchRel,
    auto_pass_forbidden: batch.auto_pass_forbidden,
    browser_automation_authorized: batch.browser_automation_authorized,
    coverage_unlocked: false,
    repo_paths_read: [...loaded.repo_paths_read, batchRel],
    truth_note: "Manufacturer refresh batch projected from committed orchestrator artifact.",
  };
}
