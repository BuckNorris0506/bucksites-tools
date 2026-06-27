/**
 * Command Center v2 projection for manufacturer rescue owner approval packet factory v1.
 */

import {
  buildManufacturerRescueOwnerApprovalPacketFactoryV1,
  loadManufacturerRescueOwnerApprovalPacketFactoryReportV1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1,
  type ManufacturerRescueOwnerApprovalCohortSummaryV1,
  type ManufacturerRescueOwnerApprovalPacketFactoryReportV1,
} from "./manufacturer-rescue-owner-approval-packet-factory-v1";

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_rescue_owner_approval_packet_factory_v1" as const;

export type ManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_approval_forbidden: true;
  readiness_gate_promotion_authorized: false;
  recommended_jq_path: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_JQ_PATH_V1;
  generated_at: string;
  apply_plan_factory_generated_at: string;
  factory_artifact_path: string;
  factory_md_artifact_path: string;
  source_command: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1;
  ready_for_owner_review_plan_count: number;
  approval_cohort_count: number;
  batch_approval_eligible_cohort_count: number;
  total_lanes_in_cohorts: number;
  cohorts: ManufacturerRescueOwnerApprovalCohortSummaryV1[];
  inspect_summary: ManufacturerRescueOwnerApprovalPacketFactoryReportV1["inspect_summary"];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

function laneFromReport(
  report: ManufacturerRescueOwnerApprovalPacketFactoryReportV1,
): ManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_approval_forbidden: true,
    readiness_gate_promotion_authorized: false,
    recommended_jq_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_JQ_PATH_V1,
    generated_at: report.generated_at,
    apply_plan_factory_generated_at: report.apply_plan_factory_generated_at,
    factory_artifact_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1,
    factory_md_artifact_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1,
    source_command: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1,
    ready_for_owner_review_plan_count: report.ready_for_owner_review_plan_count,
    approval_cohort_count: report.approval_cohort_count,
    batch_approval_eligible_cohort_count: report.batch_approval_eligible_cohort_count,
    total_lanes_in_cohorts: report.total_lanes_in_cohorts,
    cohorts: report.cohorts,
    inspect_summary: report.inspect_summary,
    recommended_next_action: report.inspect_summary.recommended_next_action,
    proven_facts: report.proven_facts,
    unknown_facts: report.unknown_facts,
  };
}

export function buildManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  prefer_committed_artifact?: boolean;
}): ManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneV1 {
  if (args.prefer_committed_artifact !== false) {
    const committed = loadManufacturerRescueOwnerApprovalPacketFactoryReportV1({
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      readText: args.readText,
    });
    if (committed) {
      return laneFromReport(committed);
    }
  }
  const { report } = buildManufacturerRescueOwnerApprovalPacketFactoryV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return laneFromReport(report);
}

export function buildManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerRescueOwnerApprovalPacketFactoryCommandCenterLaneV1 {
  return {
    contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    auto_approval_forbidden: true,
    readiness_gate_promotion_authorized: false,
    recommended_jq_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    apply_plan_factory_generated_at: "UNKNOWN",
    factory_artifact_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1,
    factory_md_artifact_path: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1,
    source_command: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1,
    ready_for_owner_review_plan_count: 0,
    approval_cohort_count: 0,
    batch_approval_eligible_cohort_count: 0,
    total_lanes_in_cohorts: 0,
    cohorts: [],
    inspect_summary: {
      recommended_next_action:
        "Restore apply-plan factory artifacts, then run npm run buckparts:manufacturer-rescue-owner-approval-packet-factory.",
      readiness_gate_owner_approval_note:
        "Readiness Gate owner_approval_exists requires founder decision rows — packets do not auto-satisfy.",
      apply_plan_factory_note:
        "manufacturer_safe_link_rescue_apply_plan_factory_v1 must produce READY_FOR_OWNER_REVIEW plans first.",
    },
    recommended_next_action:
      "Restore apply-plan factory artifacts, then run npm run buckparts:manufacturer-rescue-owner-approval-packet-factory.",
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_rescue_owner_approval_packet_factory_v1 build failure without throwing.",
      "PROVEN: auto_approval_forbidden=true.",
    ],
    unknown_facts: [
      `UNKNOWN: manufacturer_rescue_owner_approval_packet_factory_v1 failed: ${args.reason}`,
    ],
  };
}
