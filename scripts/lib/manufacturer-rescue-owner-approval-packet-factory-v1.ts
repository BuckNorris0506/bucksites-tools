/**
 * Manufacturer Rescue Owner Approval Packet Factory v1 — read-only batch owner approval
 * packets from READY_FOR_OWNER_REVIEW apply-plan artifacts. Never auto-approves or promotes.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1,
  loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1,
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1,
  manufacturerSafeLinkRescueApplyPlanRelV1,
  type ManufacturerRescueApplyPlanFactoryReportV1,
  type ManufacturerRescueApplyPlanProposedCsvRowV1,
  type ManufacturerRescueApplyPlanV1,
  type ManufacturerRescueRetailerLinksCsvRowSnapshotV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1 =
  "manufacturer_rescue_owner_approval_packet_factory_v1" as const;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1 =
  "manufacturer_rescue_owner_approval_packet_v1" as const;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-factory-v1.json" as const;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-factory-v1.md" as const;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-rescue-owner-approval-packet-factory" as const;

export const MANUFACTURER_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1 =
  "manufacturer_rescue_owner_approval_packet_v1" as const;

export const MANUFACTURER_RESCUE_APPROVAL_OPTION_IDS_V1 = [
  "approve_apply_plan",
  "reject_apply_plan",
  "defer_apply_plan",
  "request_more_proof",
] as const;

export type ManufacturerRescueApprovalOptionIdV1 =
  (typeof MANUFACTURER_RESCUE_APPROVAL_OPTION_IDS_V1)[number];

export const MANUFACTURER_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1 =
  "PROVEN: Approving an owner approval packet records founder intent only. It does not apply data/retailer_links.csv changes, mutate Supabase, authorize READY_FOR_APPLY promotion, or deploy. Readiness Gate remains sole READY_FOR_APPLY promotion authority after owner_mutation_approved founder decision rows exist." as const;

export const MANUFACTURER_RESCUE_PROHIBITED_ACTIONS_V1 = [
  "Do not mutate retailer_links.csv from this approval packet alone.",
  "Do not mutate Supabase retailer_links or production database state.",
  "Do not promote READY_FOR_APPLY — readiness gate remains sole promotion authority.",
  "Do not bypass confusion-family or supersession review gates.",
  "Do not auto-approve — founder decision with owner_mutation_approved required per cohort or slug policy.",
  "approve_apply_plan authorizes proceeding toward guarded per-slug apply — not automatic CSV apply.",
] as const;

export type ManufacturerRescueMutationPatternFingerprintV1 = {
  manufacturer_key: string;
  retailer_key: string;
  label_subtype: string;
  exact_token_mode: string;
  change_kind: "update_existing_primary_row_affiliate_url";
  browser_truth_classification: "direct_buyable";
  customer_visible_label: "BuckParts Verified Link";
  trust_requirements: {
    confusion_family_review_required: false;
    supersession_review_required: false;
    wrong_family_blocked: false;
  };
};

export type ManufacturerRescuePlannedRetailerLinksCsvChangeV1 = {
  source_path: "data/retailer_links.csv";
  filter_slug: string;
  change_kind: "update_existing_primary_row_affiliate_url";
  current_row: ManufacturerRescueRetailerLinksCsvRowSnapshotV1;
  proposed_row: ManufacturerRescueApplyPlanProposedCsvRowV1;
};

export type ManufacturerRescueOwnerApprovalLaneV1 = {
  filter_slug: string;
  oem_part_token: string;
  manufacturer_key: string;
  apply_plan_artifact_rel: string;
  apply_plan_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1;
  proof_artifact_path: string | null;
  browser_proof_checked_at: string | null;
  official_destination_url: string | null;
  exact_token_evidence: ManufacturerRescueApplyPlanV1["exact_token_evidence"];
  wrong_family_evidence: ManufacturerRescueApplyPlanV1["wrong_family_evidence"];
  planned_retailer_links_csv_change: ManufacturerRescuePlannedRetailerLinksCsvChangeV1;
};

export type ManufacturerRescueOwnerApprovalPacketV1 = {
  contract: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  auto_approval_forbidden: true;
  apply_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  readiness_gate_promotion_authorized: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1;
  cohort_id: string;
  manufacturer_key: string;
  batch_approval_eligible: boolean;
  batch_approval_policy_note: string;
  mutation_pattern_fingerprint: ManufacturerRescueMutationPatternFingerprintV1;
  filter_slugs: string[];
  lane_count: number;
  lanes: ManufacturerRescueOwnerApprovalLaneV1[];
  approval_options: Array<{
    option_id: ManufacturerRescueApprovalOptionIdV1;
    label: string;
    description: string;
    founder_decision_registry_mapping: {
      decision_status: "approved" | "rejected" | "deferred" | "needs_more_evidence";
      allowed_next_scope: "none" | "read_only_agent" | "owner_mutation_approved";
      evidence_required_before_mutation: boolean;
    };
  }>;
  owner_decision_template_rel: string;
  readiness_gate_owner_approval_contract_note: string;
  separate_apply_executor_required_statement: typeof MANUFACTURER_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1;
  prohibited_actions_still_apply: typeof MANUFACTURER_RESCUE_PROHIBITED_ACTIONS_V1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type ManufacturerRescueOwnerApprovalCohortSummaryV1 = {
  cohort_id: string;
  manufacturer_key: string;
  lane_count: number;
  filter_slugs: string[];
  batch_approval_eligible: boolean;
  approval_packet_rel: string;
  approval_packet_md_rel: string;
  owner_decision_template_rel: string;
  mutation_pattern_fingerprint: ManufacturerRescueMutationPatternFingerprintV1;
};

export type ManufacturerRescueOwnerApprovalPacketFactoryReportV1 = {
  contract: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  auto_approval_forbidden: true;
  readiness_gate_promotion_authorized: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1;
  apply_plan_factory_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1;
  apply_plan_factory_generated_at: string;
  apply_plan_factory_artifact_path: string;
  ready_for_owner_review_plan_count: number;
  approval_cohort_count: number;
  batch_approval_eligible_cohort_count: number;
  total_lanes_in_cohorts: number;
  cohorts: ManufacturerRescueOwnerApprovalCohortSummaryV1[];
  skipped_non_ready_plan_count: number;
  inspect_summary: {
    recommended_next_action: string;
    readiness_gate_owner_approval_note: string;
    apply_plan_factory_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

function sanitizeCohortSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function manufacturerRescueOwnerApprovalPacketRelV1(cohortId: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-${sanitizeCohortSegment(cohortId)}-v1.json`;
}

export function manufacturerRescueOwnerApprovalPacketMdRelV1(cohortId: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-${sanitizeCohortSegment(cohortId)}-v1.md`;
}

export function manufacturerRescueOwnerDecisionTemplateRelV1(cohortId: string): string {
  return `data/fridge/batch-production/drafts/manufacturer-rescue-owner-decision-template-${sanitizeCohortSegment(cohortId)}-v1.json`;
}

function mutationPatternFingerprintFromPlan(
  plan: ManufacturerRescueApplyPlanV1,
): ManufacturerRescueMutationPatternFingerprintV1 {
  const proposed = plan.proposed_csv_row;
  if (!proposed) {
    throw new Error(`READY_FOR_OWNER_REVIEW plan missing proposed_csv_row: ${plan.filter_slug}`);
  }
  return {
    manufacturer_key: plan.manufacturer_key,
    retailer_key: plan.retailer_key,
    label_subtype: proposed.label_subtype,
    exact_token_mode: plan.exact_token_evidence.mode,
    change_kind: "update_existing_primary_row_affiliate_url",
    browser_truth_classification: "direct_buyable",
    customer_visible_label: "BuckParts Verified Link",
    trust_requirements: {
      confusion_family_review_required: false,
      supersession_review_required: false,
      wrong_family_blocked: false,
    },
  };
}

function fingerprintKey(fingerprint: ManufacturerRescueMutationPatternFingerprintV1): string {
  const payload = JSON.stringify(fingerprint);
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

export function buildManufacturerRescueOwnerApprovalCohortIdV1(
  fingerprint: ManufacturerRescueMutationPatternFingerprintV1,
): string {
  return `approval_cohort_${sanitizeCohortSegment(fingerprint.manufacturer_key)}_${sanitizeCohortSegment(fingerprint.label_subtype)}_${fingerprintKey(fingerprint)}`;
}

function buildPlannedChange(plan: ManufacturerRescueApplyPlanV1): ManufacturerRescuePlannedRetailerLinksCsvChangeV1 {
  if (!plan.current_csv_row || !plan.proposed_csv_row) {
    throw new Error(`apply plan missing csv row snapshots: ${plan.filter_slug}`);
  }
  return {
    source_path: "data/retailer_links.csv",
    filter_slug: plan.filter_slug,
    change_kind: "update_existing_primary_row_affiliate_url",
    current_row: plan.current_csv_row,
    proposed_row: plan.proposed_csv_row,
  };
}

function buildLaneFromPlan(plan: ManufacturerRescueApplyPlanV1): ManufacturerRescueOwnerApprovalLaneV1 {
  return {
    filter_slug: plan.filter_slug,
    oem_part_token: plan.oem_part_token,
    manufacturer_key: plan.manufacturer_key,
    apply_plan_artifact_rel: manufacturerSafeLinkRescueApplyPlanRelV1(plan.filter_slug),
    apply_plan_contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
    proof_artifact_path: plan.proof_artifact_path,
    browser_proof_checked_at: plan.browser_proof_checked_at,
    official_destination_url: plan.official_destination_url,
    exact_token_evidence: plan.exact_token_evidence,
    wrong_family_evidence: plan.wrong_family_evidence,
    planned_retailer_links_csv_change: buildPlannedChange(plan),
  };
}

function buildApprovalOptions(): ManufacturerRescueOwnerApprovalPacketV1["approval_options"] {
  return [
    {
      option_id: "approve_apply_plan",
      label: "Approve apply plan(s) for guarded CSV apply planning",
      description:
        "Records founder intent to proceed toward guarded per-slug retailer_links.csv apply — not automatic mutation.",
      founder_decision_registry_mapping: {
        decision_status: "approved",
        allowed_next_scope: "owner_mutation_approved",
        evidence_required_before_mutation: true,
      },
    },
    {
      option_id: "reject_apply_plan",
      label: "Reject apply plan(s)",
      description: "Blocks this cohort from guarded apply until a new apply plan is generated.",
      founder_decision_registry_mapping: {
        decision_status: "rejected",
        allowed_next_scope: "none",
        evidence_required_before_mutation: true,
      },
    },
    {
      option_id: "defer_apply_plan",
      label: "Defer decision",
      description: "No founder approval recorded; readiness gate owner_approval_exists remains FAIL.",
      founder_decision_registry_mapping: {
        decision_status: "deferred",
        allowed_next_scope: "none",
        evidence_required_before_mutation: true,
      },
    },
    {
      option_id: "request_more_proof",
      label: "Request more proof",
      description: "Owner needs refreshed browser proof or additional review before approval.",
      founder_decision_registry_mapping: {
        decision_status: "needs_more_evidence",
        allowed_next_scope: "none",
        evidence_required_before_mutation: true,
      },
    },
  ];
}

export function buildManufacturerRescueOwnerDecisionTemplateV1(args: {
  packet: ManufacturerRescueOwnerApprovalPacketV1;
}): {
  contract: typeof FOUNDER_DECISION_REGISTRY_CONTRACT_V1;
  template_only: true;
  not_consumed_by_automation: true;
  mutation_authorized: false;
  read_only: true;
  data_mutation: false;
  template_for_packet_contract: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  source_decision_packet_id: typeof MANUFACTURER_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1;
  cohort_id: string;
  apply_plan_artifact_rels: string[];
  allowed_founder_option_ids: ManufacturerRescueApprovalOptionIdV1[];
  row_template: Record<string, unknown>;
  notes: string[];
} {
  const applyPlanRels = args.packet.lanes.map((lane) => lane.apply_plan_artifact_rel);
  return {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    template_only: true,
    not_consumed_by_automation: true,
    mutation_authorized: false,
    read_only: true,
    data_mutation: false,
    template_for_packet_contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    source_decision_packet_id: MANUFACTURER_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
    cohort_id: args.packet.cohort_id,
    apply_plan_artifact_rels: applyPlanRels,
    allowed_founder_option_ids: [...MANUFACTURER_RESCUE_APPROVAL_OPTION_IDS_V1],
    row_template: {
      decision_id: "REPLACE_WITH_STABLE_ID",
      source_queue_row_id: `manufacturer-rescue-${args.packet.cohort_id}`,
      source_decision_packet_id: MANUFACTURER_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
      decided_at: "REPLACE_WITH_ISO8601",
      decision_status: "REPLACE_WITH approved|rejected|deferred|needs_more_evidence",
      owner_note:
        "REPLACE_WITH_FOUNDER_NOTE — required non-empty when allowed_next_scope is owner_mutation_approved",
      allowed_next_scope: "REPLACE_WITH none|read_only_agent|owner_mutation_approved",
      evidence_required_before_mutation: true,
      prohibited_actions_still_apply: [...MANUFACTURER_RESCUE_PROHIBITED_ACTIONS_V1],
      manufacturer_rescue_owner_approval_context_v1: {
        review_packet_contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
        cohort_id: args.packet.cohort_id,
        founder_option_id:
          "REPLACE_WITH approve_apply_plan|reject_apply_plan|defer_apply_plan|request_more_proof",
        apply_plan_artifact_rels: applyPlanRels,
        filter_slugs: args.packet.filter_slugs,
        batch_approval_eligible: args.packet.batch_approval_eligible,
      },
    },
    notes: [
      "Template only — not consumed by repo automation.",
      "Readiness Gate check owner_approval_exists requires decision_status=approved and allowed_next_scope=owner_mutation_approved referencing slug or apply plan path.",
      MANUFACTURER_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
    ],
  };
}

export function buildManufacturerRescueOwnerApprovalPacketFromPlansV1(args: {
  cohort_id: string;
  plans: ManufacturerRescueApplyPlanV1[];
  now?: () => Date;
}): ManufacturerRescueOwnerApprovalPacketV1 {
  const now = args.now ?? (() => new Date());
  const sorted = args.plans.slice().sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));
  if (sorted.length === 0) {
    throw new Error("cannot build approval packet from empty plan list");
  }
  for (const plan of sorted) {
    if (plan.plan_status !== "READY_FOR_OWNER_REVIEW") {
      throw new Error(`plan not READY_FOR_OWNER_REVIEW: ${plan.filter_slug}`);
    }
  }

  const fingerprint = mutationPatternFingerprintFromPlan(sorted[0]!);
  for (const plan of sorted.slice(1)) {
    const other = mutationPatternFingerprintFromPlan(plan);
    if (JSON.stringify(other) !== JSON.stringify(fingerprint)) {
      throw new Error(
        `incompatible mutation patterns in cohort ${args.cohort_id}: ${sorted[0]!.filter_slug} vs ${plan.filter_slug}`,
      );
    }
  }

  const lanes = sorted.map(buildLaneFromPlan);
  const batch_approval_eligible = lanes.length > 1;

  return {
    contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    auto_approval_forbidden: true,
    apply_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    readiness_gate_promotion_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1,
    cohort_id: args.cohort_id,
    manufacturer_key: fingerprint.manufacturer_key,
    batch_approval_eligible,
    batch_approval_policy_note: batch_approval_eligible
      ? "Multiple slugs share identical mutation pattern and cleared trust gates — one founder decision may cover all slugs when policy allows."
      : "Single-slug cohort — founder decision applies to one slug only.",
    mutation_pattern_fingerprint: fingerprint,
    filter_slugs: lanes.map((lane) => lane.filter_slug),
    lane_count: lanes.length,
    lanes,
    approval_options: buildApprovalOptions(),
    owner_decision_template_rel: manufacturerRescueOwnerDecisionTemplateRelV1(args.cohort_id),
    readiness_gate_owner_approval_contract_note:
      "Readiness Gate owner_approval_exists requires founder_decision_registry row with decision_status=approved, allowed_next_scope=owner_mutation_approved, and slug or apply-plan path match.",
    separate_apply_executor_required_statement: MANUFACTURER_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
    prohibited_actions_still_apply: MANUFACTURER_RESCUE_PROHIBITED_ACTIONS_V1,
    proven_facts: [
      "PROVEN: Packet is read-only — auto_approval_forbidden=true.",
      `PROVEN: ${String(lanes.length)} lane(s) sourced from READY_FOR_OWNER_REVIEW apply plans only.`,
      "PROVEN: confusion-family and supersession blockers excluded at apply-plan factory layer.",
      "PROVEN: Readiness Gate remains sole READY_FOR_APPLY promotion authority.",
    ],
    unknown_facts: ["UNKNOWN: Live production buyer-path parity until post-apply census re-run."],
  };
}

export function groupManufacturerRescueApplyPlansIntoCohortsV1(
  plans: ManufacturerRescueApplyPlanV1[],
): Array<{ cohort_id: string; plans: ManufacturerRescueApplyPlanV1[] }> {
  const ready = plans.filter((plan) => plan.plan_status === "READY_FOR_OWNER_REVIEW");
  const byKey = new Map<string, ManufacturerRescueApplyPlanV1[]>();
  for (const plan of ready) {
    const fingerprint = mutationPatternFingerprintFromPlan(plan);
    const cohort_id = buildManufacturerRescueOwnerApprovalCohortIdV1(fingerprint);
    const list = byKey.get(cohort_id) ?? [];
    list.push(plan);
    byKey.set(cohort_id, list);
  }
  return Array.from(byKey.entries())
    .map(([cohort_id, cohortPlans]) => ({
      cohort_id,
      plans: cohortPlans.sort((a, b) => a.filter_slug.localeCompare(b.filter_slug)),
    }))
    .sort((a, b) => b.plans.length - a.plans.length || a.cohort_id.localeCompare(b.cohort_id));
}

export function buildManufacturerRescueOwnerApprovalPacketFactoryV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): {
  report: ManufacturerRescueOwnerApprovalPacketFactoryReportV1;
  packets: ManufacturerRescueOwnerApprovalPacketV1[];
  decision_templates: ReturnType<typeof buildManufacturerRescueOwnerDecisionTemplateV1>[];
} {
  const now = args.now ?? (() => new Date());
  const committedFactory = loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });

  const { factory: applyPlanFactory, plans } = buildManufacturerSafeLinkRescueApplyPlanFactoryPlansV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });

  const readyPlans = plans.filter((plan) => plan.plan_status === "READY_FOR_OWNER_REVIEW");
  const cohortGroups = groupManufacturerRescueApplyPlansIntoCohortsV1(plans);
  const packets = cohortGroups.map((group) =>
    buildManufacturerRescueOwnerApprovalPacketFromPlansV1({
      cohort_id: group.cohort_id,
      plans: group.plans,
      now: args.now,
    }),
  );
  const decision_templates = packets.map((packet) =>
    buildManufacturerRescueOwnerDecisionTemplateV1({ packet }),
  );

  const cohorts: ManufacturerRescueOwnerApprovalCohortSummaryV1[] = packets.map((packet) => ({
    cohort_id: packet.cohort_id,
    manufacturer_key: packet.manufacturer_key,
    lane_count: packet.lane_count,
    filter_slugs: packet.filter_slugs,
    batch_approval_eligible: packet.batch_approval_eligible,
    approval_packet_rel: manufacturerRescueOwnerApprovalPacketRelV1(packet.cohort_id),
    approval_packet_md_rel: manufacturerRescueOwnerApprovalPacketMdRelV1(packet.cohort_id),
    owner_decision_template_rel: manufacturerRescueOwnerDecisionTemplateRelV1(packet.cohort_id),
    mutation_pattern_fingerprint: packet.mutation_pattern_fingerprint,
  }));

  const report: ManufacturerRescueOwnerApprovalPacketFactoryReportV1 = {
    contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    auto_approval_forbidden: true,
    readiness_gate_promotion_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_SOURCE_COMMAND_V1,
    apply_plan_factory_contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_CONTRACT_V1,
    apply_plan_factory_generated_at:
      committedFactory?.generated_at ?? applyPlanFactory.generated_at,
    apply_plan_factory_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_FACTORY_JSON_REL_V1,
    ready_for_owner_review_plan_count: readyPlans.length,
    approval_cohort_count: cohorts.length,
    batch_approval_eligible_cohort_count: cohorts.filter((c) => c.batch_approval_eligible).length,
    total_lanes_in_cohorts: cohorts.reduce((sum, c) => sum + c.lane_count, 0),
    cohorts,
    skipped_non_ready_plan_count: plans.length - readyPlans.length,
    inspect_summary: {
      recommended_next_action:
        cohorts.length > 0
          ? `Owner review ${String(cohorts.length)} approval cohort packet(s) covering ${String(readyPlans.length)} slug(s); record founder_decision_registry rows with owner_mutation_approved before re-running readiness gate.`
          : "No READY_FOR_OWNER_REVIEW apply plans — run apply-plan factory after fresh browser proof; resolve blockers first.",
      readiness_gate_owner_approval_note:
        "Readiness Gate owner_approval_exists check consumes founder_decision_registry rows — packets do not auto-satisfy that check.",
      apply_plan_factory_note:
        "Factory consumes manufacturer_safe_link_rescue_apply_plan_factory_v1 READY_FOR_OWNER_REVIEW outputs only.",
    },
    proven_facts: [
      "PROVEN: Factory is read-only — no CSV, Supabase, SQL, or production mutation.",
      "PROVEN: auto_approval_forbidden — no founder decisions written automatically.",
      `PROVEN: grouped ${String(readyPlans.length)} READY_FOR_OWNER_REVIEW plan(s) into ${String(cohorts.length)} approval cohort(s).`,
      `PROVEN: ${String(cohorts.filter((c) => c.batch_approval_eligible).length)} cohort(s) batch-approval eligible.`,
      "PROVEN: Readiness Gate remains sole READY_FOR_APPLY promotion authority.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production buyer-path parity until post-apply census re-run.",
    ],
  };

  return { report, packets, decision_templates };
}

export function buildManufacturerRescueOwnerApprovalPacketMarkdownV1(
  packet: ManufacturerRescueOwnerApprovalPacketV1,
): string {
  const lines = [
    `# Manufacturer rescue owner approval packet — ${packet.cohort_id}`,
    "",
    `- generated_at: **${packet.generated_at}**`,
    `- manufacturer: **${packet.manufacturer_key}**`,
    `- lane_count: **${String(packet.lane_count)}**`,
    `- batch_approval_eligible: **${String(packet.batch_approval_eligible)}**`,
    `- auto_approval_forbidden: **true**`,
  ];
  lines.push(
    "",
    "## Authorization",
    "",
    "- mutation_authorized: **false**",
    "- csv_apply_authorized: **false**",
    "- readiness_gate_promotion_authorized: **false**",
    "",
    "## Slugs",
    "",
    packet.filter_slugs.map((slug) => `- **${slug}**`).join("\n"),
    "",
    "## Lanes",
    "",
  );
  for (const lane of packet.lanes) {
    lines.push(
      `### ${lane.filter_slug}`,
      `- oem_part_token: **${lane.oem_part_token}**`,
      `- apply_plan: \`${lane.apply_plan_artifact_rel}\``,
      `- proof: \`${lane.proof_artifact_path ?? "UNKNOWN"}\``,
      `- official_destination_url: ${lane.official_destination_url ?? "UNKNOWN"}`,
      `- current affiliate_url: ${lane.planned_retailer_links_csv_change.current_row.affiliate_url ?? "UNKNOWN"}`,
      `- proposed affiliate_url: ${lane.planned_retailer_links_csv_change.proposed_row.affiliate_url ?? "UNKNOWN"}`,
      "",
    );
  }
  lines.push(
    "## Approval options",
    "",
    ...packet.approval_options.map(
      (option) =>
        `- **${option.option_id}** — ${option.label} (${option.founder_decision_registry_mapping.allowed_next_scope})`,
    ),
    "",
    "## Readiness gate",
    "",
    packet.readiness_gate_owner_approval_contract_note,
    "",
    packet.separate_apply_executor_required_statement,
    "",
  );
  return lines.join("\n");
}

export function buildManufacturerRescueOwnerApprovalPacketFactoryMarkdownV1(
  report: ManufacturerRescueOwnerApprovalPacketFactoryReportV1,
): string {
  const lines = [
    "# Manufacturer rescue owner approval packet factory v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- ready_for_owner_review_plan_count: **${String(report.ready_for_owner_review_plan_count)}**`,
    `- approval_cohort_count: **${String(report.approval_cohort_count)}**`,
    `- batch_approval_eligible_cohort_count: **${String(report.batch_approval_eligible_cohort_count)}**`,
    `- skipped_non_ready_plan_count: **${String(report.skipped_non_ready_plan_count)}**`,
    "",
    "## Approval cohorts",
    "",
  ];
  if (report.cohorts.length === 0) {
    lines.push("_No approval cohorts — no READY_FOR_OWNER_REVIEW apply plans._", "");
  } else {
    for (const cohort of report.cohorts) {
      lines.push(
        `### ${cohort.cohort_id}`,
        `- manufacturer: **${cohort.manufacturer_key}**`,
        `- lane_count: **${String(cohort.lane_count)}**`,
        `- batch_approval_eligible: **${String(cohort.batch_approval_eligible)}**`,
        `- slugs: ${cohort.filter_slugs.join(", ")}`,
        `- packet: \`${cohort.approval_packet_rel}\``,
        `- decision template: \`${cohort.owner_decision_template_rel}\``,
        "",
      );
    }
  }
  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerRescueOwnerApprovalPacketFactoryReportV1;
  packets: ManufacturerRescueOwnerApprovalPacketV1[];
  decision_templates: ReturnType<typeof buildManufacturerRescueOwnerDecisionTemplateV1>[];
}): {
  factoryJsonRelPath: string;
  factoryMdRelPath: string;
  approvalPacketRelPaths: string[];
  decisionTemplateRelPaths: string[];
} {
  const factoryAbs = path.join(args.rootDir, MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1);
  const factoryMdAbs = path.join(args.rootDir, MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1);
  mkdirSync(path.dirname(factoryAbs), { recursive: true });
  writeFileSync(factoryAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    factoryMdAbs,
    `${buildManufacturerRescueOwnerApprovalPacketFactoryMarkdownV1(args.report)}\n`,
    "utf8",
  );

  const approvalPacketRelPaths: string[] = [];
  for (const packet of args.packets) {
    const jsonRel = manufacturerRescueOwnerApprovalPacketRelV1(packet.cohort_id);
    const mdRel = manufacturerRescueOwnerApprovalPacketMdRelV1(packet.cohort_id);
    writeFileSync(
      path.join(args.rootDir, jsonRel),
      `${JSON.stringify(packet, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      path.join(args.rootDir, mdRel),
      `${buildManufacturerRescueOwnerApprovalPacketMarkdownV1(packet)}\n`,
      "utf8",
    );
    approvalPacketRelPaths.push(jsonRel);
  }

  const decisionTemplateRelPaths: string[] = [];
  for (const template of args.decision_templates) {
    const rel = manufacturerRescueOwnerDecisionTemplateRelV1(template.cohort_id);
    const abs = path.join(args.rootDir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    decisionTemplateRelPaths.push(rel);
  }

  return {
    factoryJsonRelPath: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1,
    factoryMdRelPath: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_MD_REL_V1,
    approvalPacketRelPaths,
    decisionTemplateRelPaths,
  };
}

export function loadManufacturerRescueOwnerApprovalPacketFactoryReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueOwnerApprovalPacketFactoryReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueOwnerApprovalPacketFactoryReportV1;
    if (parsed.contract !== MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
