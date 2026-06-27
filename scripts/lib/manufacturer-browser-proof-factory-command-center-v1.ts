/**
 * Command Center v2 projection for manufacturer browser proof factory v1 (read-only).
 */

import {
  buildManufacturerBrowserProofFactoryV1,
  loadManufacturerBrowserProofFactoryReportV1,
  MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
  MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1,
  MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1,
  type ManufacturerBrowserProofCaptureBatchV1,
  type ManufacturerBrowserProofFactoryReportV1,
  type ManufacturerBrowserProofSlugAssessmentV1,
} from "./manufacturer-browser-proof-factory-v1";

export const MANUFACTURER_BROWSER_PROOF_FACTORY_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_BROWSER_PROOF_FACTORY_CONTRACT_V1;

export const MANUFACTURER_BROWSER_PROOF_FACTORY_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_browser_proof_factory_v1" as const;

export type ManufacturerBrowserProofFactoryCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_pass_forbidden: true;
  recommended_jq_path: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_CC_JQ_PATH_V1;
  generated_at: string;
  orchestrator_generated_at: string;
  factory_artifact_path: string;
  capture_queue_artifact_path: string;
  owner_work_packet_artifact_path: string;
  source_command: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1;
  slug_assessment_count: number;
  capture_work_required_count: number;
  fresh_official_pass_count: number;
  stale_count: number;
  missing_count: number;
  blocked_count: number;
  capture_batches: ManufacturerBrowserProofCaptureBatchV1[];
  slug_assessments: ManufacturerBrowserProofSlugAssessmentV1[];
  normalization_draft_rels: string[];
  inspect_summary: ManufacturerBrowserProofFactoryReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function laneFromReport(
  report: ManufacturerBrowserProofFactoryReportV1,
): ManufacturerBrowserProofFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_FACTORY_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    orchestrator_generated_at: report.orchestrator_generated_at,
    factory_artifact_path: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    capture_queue_artifact_path: MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1,
    owner_work_packet_artifact_path: MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1,
    slug_assessment_count: report.slug_assessment_count,
    capture_work_required_count: report.capture_work_required_count,
    fresh_official_pass_count: report.fresh_official_pass_count,
    stale_count: report.stale_count,
    missing_count: report.missing_count,
    blocked_count: report.blocked_count,
    capture_batches: report.capture_batches,
    slug_assessments: report.slug_assessments,
    normalization_draft_rels: report.normalization_draft_rels,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildManufacturerBrowserProofFactoryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  prefer_committed_artifact?: boolean;
}): ManufacturerBrowserProofFactoryCommandCenterLaneV1 {
  if (args.prefer_committed_artifact !== false) {
    const committed = loadManufacturerBrowserProofFactoryReportV1({
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    if (committed) {
      return laneFromReport(committed);
    }
  }
  const { report } = buildManufacturerBrowserProofFactoryV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return laneFromReport(report);
}

export function buildManufacturerBrowserProofFactoryCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerBrowserProofFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_BROWSER_PROOF_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_pass_forbidden: true,
    recommended_jq_path: MANUFACTURER_BROWSER_PROOF_FACTORY_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    orchestrator_generated_at: "UNKNOWN",
    factory_artifact_path: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    capture_queue_artifact_path: MANUFACTURER_BROWSER_PROOF_CAPTURE_QUEUE_MD_REL_V1,
    owner_work_packet_artifact_path: MANUFACTURER_BROWSER_PROOF_OWNER_WORK_PACKET_MD_REL_V1,
    source_command: MANUFACTURER_BROWSER_PROOF_FACTORY_SOURCE_COMMAND_V1,
    slug_assessment_count: 0,
    capture_work_required_count: 0,
    fresh_official_pass_count: 0,
    stale_count: 0,
    missing_count: 0,
    blocked_count: 0,
    capture_batches: [],
    slug_assessments: [],
    normalization_draft_rels: [],
    inspect_summary: {
      recommended_next_action:
        "Restore orchestrator artifact, then run npm run buckparts:manufacturer-browser-proof-factory.",
      readiness_gate_note:
        "manufacturer_safe_link_rescue_readiness_gate_v1 remains sole READY_FOR_APPLY promotion authority.",
      apply_plan_factory_note:
        "manufacturer_safe_link_rescue_apply_plan_factory_v1 consumes fresh official PASS owner proof only.",
    },
    recommended_next_action:
      "Restore orchestrator artifact, then run npm run buckparts:manufacturer-browser-proof-factory.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_browser_proof_factory_v1 build failure without throwing.",
      "PROVEN: auto_pass_forbidden — factory never grants PASS_BROWSER_PROOF.",
    ],
    unknown_facts: [`UNKNOWN: manufacturer_browser_proof_factory_v1 failed: ${args.reason}`],
  };
}
