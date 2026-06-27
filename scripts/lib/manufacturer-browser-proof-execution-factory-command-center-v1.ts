/**
 * Command Center v2 projection for manufacturer browser proof execution factory v1.
 */

import {
  buildManufacturerBrowserProofExecutionFactoryV1,
  loadManufacturerBrowserProofExecutionFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1,
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1,
  type ManufacturerBrowserProofExecutionFactoryReportV1,
  type ManufacturerBrowserProofExecutionManifestV1,
  type ManufacturerBrowserProofExecutionPacketV1,
} from "./manufacturer-browser-proof-execution-factory-v1";

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CONTRACT_V1;

export const MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_browser_proof_execution_factory_v1" as const;

export type ManufacturerBrowserProofExecutionFactoryCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_pass_forbidden: true;
  recommended_jq_path: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1;
  generated_at: string;
  execution_factory_artifact_path: string;
  execution_factory_md_artifact_path: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1;
  intake_complete: boolean;
  artifact_intake: ManufacturerBrowserProofExecutionFactoryReportV1["artifact_intake"];
  scheduled_slug_count: number;
  manufacturer_execution_batch_count: number;
  manufacturer_execution_manifests: ManufacturerBrowserProofExecutionManifestV1[];
  execution_packets: ManufacturerBrowserProofExecutionPacketV1[];
  inspect_summary: ManufacturerBrowserProofExecutionFactoryReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function laneFromReport(
  report: ManufacturerBrowserProofExecutionFactoryReportV1,
): ManufacturerBrowserProofExecutionFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    execution_factory_artifact_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
    execution_factory_md_artifact_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1,
    intake_complete: report.intake_complete,
    artifact_intake: report.artifact_intake,
    scheduled_slug_count: report.scheduled_slug_count,
    manufacturer_execution_batch_count: report.manufacturer_execution_batch_count,
    manufacturer_execution_manifests: report.manufacturer_execution_manifests,
    execution_packets: report.execution_packets,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildManufacturerBrowserProofExecutionFactoryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  prefer_committed_artifact?: boolean;
}): ManufacturerBrowserProofExecutionFactoryCommandCenterLaneV1 {
  if (args.prefer_committed_artifact !== false) {
    const committed = loadManufacturerBrowserProofExecutionFactoryReportV1({
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    if (committed) {
      return laneFromReport(committed);
    }
  }
  const report = buildManufacturerBrowserProofExecutionFactoryV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return laneFromReport(report);
}

export function buildManufacturerBrowserProofExecutionFactoryCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerBrowserProofExecutionFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    execution_factory_artifact_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_JSON_REL_V1,
    execution_factory_md_artifact_path: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_EXECUTION_FACTORY_SOURCE_COMMAND_V1,
    intake_complete: false,
    artifact_intake: {} as ManufacturerBrowserProofExecutionFactoryReportV1["artifact_intake"],
    scheduled_slug_count: 0,
    manufacturer_execution_batch_count: 0,
    manufacturer_execution_manifests: [],
    execution_packets: [],
    inspect_summary: {
      recommended_next_action:
        "Run npm run buckparts:manufacturer-browser-proof-execution-factory after refresh orchestrator artifacts are committed.",
      trust_gate_note: "Execution factory unavailable.",
      factory_note: "UNKNOWN",
    },
    recommended_next_action:
      "Run npm run buckparts:manufacturer-browser-proof-execution-factory after refresh orchestrator artifacts are committed.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_browser_proof_execution_factory_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: manufacturer_browser_proof_execution_factory_v1 failed: ${args.reason}`],
  };
}
