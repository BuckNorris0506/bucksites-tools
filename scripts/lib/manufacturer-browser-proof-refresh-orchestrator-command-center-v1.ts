/**
 * Command Center v2 projection for manufacturer browser proof refresh orchestrator v1.
 */

import {
  buildManufacturerBrowserProofRefreshOrchestratorV1,
  loadManufacturerBrowserProofRefreshOrchestratorReportV1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1,
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1,
  type ManufacturerBrowserProofRefreshBatchV1,
  type ManufacturerBrowserProofRefreshOrchestratorReportV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CONTRACT_V1;

export const MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_browser_proof_refresh_orchestrator_v1" as const;

export type ManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_pass_forbidden: true;
  readiness_gate_promotion_authorized: false;
  recommended_jq_path: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1;
  generated_at: string;
  factory_generated_at: string;
  orchestrator_artifact_path: string;
  orchestrator_md_artifact_path: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1;
  scheduled_slug_count: number;
  manufacturer_refresh_batch_count: number;
  manufacturer_refresh_batches: ManufacturerBrowserProofRefreshBatchV1[];
  deploy_build_marker: ManufacturerBrowserProofRefreshOrchestratorReportV1["deploy_build_marker"];
  inspect_summary: ManufacturerBrowserProofRefreshOrchestratorReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function laneFromReport(
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1,
): ManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    readiness_gate_promotion_authorized: false,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    factory_generated_at: report.factory_generated_at,
    orchestrator_artifact_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
    orchestrator_md_artifact_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1,
    scheduled_slug_count: report.scheduled_slug_count,
    manufacturer_refresh_batch_count: report.manufacturer_refresh_batch_count,
    manufacturer_refresh_batches: report.manufacturer_refresh_batches,
    deploy_build_marker: report.deploy_build_marker,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  prefer_committed_artifact?: boolean;
}): ManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneV1 {
  if (args.prefer_committed_artifact !== false) {
    const committed = loadManufacturerBrowserProofRefreshOrchestratorReportV1({
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    if (committed) {
      return laneFromReport(committed);
    }
  }
  const report = buildManufacturerBrowserProofRefreshOrchestratorV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return laneFromReport(report);
}

export function buildManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerBrowserProofRefreshOrchestratorCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    readiness_gate_promotion_authorized: false,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    factory_generated_at: "UNKNOWN",
    orchestrator_artifact_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_JSON_REL_V1,
    orchestrator_md_artifact_path: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_REFRESH_ORCHESTRATOR_SOURCE_COMMAND_V1,
    scheduled_slug_count: 0,
    manufacturer_refresh_batch_count: 0,
    manufacturer_refresh_batches: [],
    deploy_build_marker: {
      marker: "UNKNOWN",
      marker_source_path: null,
      proof_after_marker_proven: "UNKNOWN",
    },
    inspect_summary: {
      recommended_next_action:
        "Run npm run buckparts:manufacturer-browser-proof-factory, then npm run buckparts:manufacturer-browser-proof-refresh-orchestrator.",
      readiness_gate_note:
        "manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.",
      factory_note: "Refresh orchestrator requires committed manufacturer_browser_proof_factory_v1 artifact.",
    },
    recommended_next_action:
      "Run npm run buckparts:manufacturer-browser-proof-factory, then npm run buckparts:manufacturer-browser-proof-refresh-orchestrator.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_browser_proof_refresh_orchestrator_v1 build failure without throwing.",
      "PROVEN: auto_pass_forbidden=true.",
    ],
    unknown_facts: [
      `UNKNOWN: manufacturer_browser_proof_refresh_orchestrator_v1 failed: ${args.reason}`,
    ],
  };
}
