import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildManufacturerRescueOwnerApprovalPacketFactoryV1,
  buildManufacturerRescueOwnerApprovalPacketFromPlansV1,
  groupManufacturerRescueApplyPlansIntoCohortsV1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
  MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
  writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1,
} from "./manufacturer-rescue-owner-approval-packet-factory-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
  type ManufacturerRescueApplyPlanV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";

function readyPlan(overrides: Partial<ManufacturerRescueApplyPlanV1>): ManufacturerRescueApplyPlanV1 {
  const slug = overrides.filter_slug ?? "edr4rxd1";
  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-safe-link-rescue-apply-plan-factory" as const,
    filter_slug: slug,
    manufacturer_key: "everydrop_whirlpool",
    oem_part_token: "EDR4RXD1",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_approval_required: true,
    readiness_gate_required_after_owner_approval: true,
    proof_artifact_path: `data/fridge/batch-production/drafts/fridge-safe-link-owner-browser-proof-result-${slug}-v1.json`,
    browser_proof_checked_at: "2026-06-20T12:00:00.000Z",
    official_destination_url:
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    browser_truth_classification: "direct_buyable",
    exact_token_evidence: {
      mode: "identity_blob_includes",
      proven: true,
      notes: "exact token proven",
    },
    wrong_family_evidence: {
      blocked: false,
      forbidden_tokens_checked: [],
      detected_forbidden_tokens: [],
      notes: "no wrong-family tokens",
    },
    current_csv_row: {
      filter_slug: slug,
      retailer_name: "OEM parts catalog (keyword lookup)",
      affiliate_url: "https://www.whirlpool.com/search.jsp?searchKeyword=edr4rxd1",
      is_primary: true,
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: null,
      browser_truth_notes: null,
      browser_truth_checked_at: null,
    },
    proposed_csv_row: {
      filter_slug: slug,
      retailer_name: "Whirlpool",
      affiliate_url:
        "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html",
      is_primary: true,
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "test",
      browser_truth_checked_at: "2026-06-20T12:00:00.000Z",
      customer_visible_label: "BuckParts Verified Link",
      label_subtype: "official_manufacturer_official_whirlpool",
    },
    blockers: [],
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

test("groups compatible READY plans into one cohort", () => {
  const plans = [
    readyPlan({ filter_slug: "edr4rxd1" }),
    readyPlan({
      filter_slug: "edr3rxd1",
      oem_part_token: "EDR3RXD1",
      official_destination_url:
        "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html",
      proposed_csv_row: {
        ...readyPlan({}).proposed_csv_row!,
        filter_slug: "edr3rxd1",
        affiliate_url:
          "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html",
      },
      current_csv_row: {
        ...readyPlan({}).current_csv_row!,
        filter_slug: "edr3rxd1",
      },
    }),
  ];
  const cohorts = groupManufacturerRescueApplyPlansIntoCohortsV1(plans);
  assert.equal(cohorts.length, 1);
  assert.equal(cohorts[0]!.plans.length, 2);
  assert.equal(cohorts[0]!.plans[0]!.filter_slug, "edr3rxd1");
});

test("separate cohorts for different manufacturers", () => {
  const plans = [
    readyPlan({ filter_slug: "edr4rxd1", manufacturer_key: "everydrop_whirlpool" }),
    readyPlan({
      filter_slug: "mwf",
      manufacturer_key: "ge_appliance_parts",
      oem_part_token: "MWF",
      exact_token_evidence: {
        mode: "title_h1_word_boundary",
        proven: true,
        notes: "exact token proven",
      },
      proposed_csv_row: {
        ...readyPlan({}).proposed_csv_row!,
        filter_slug: "mwf",
        label_subtype: "official_manufacturer_official_ge",
        retailer_name: "GE Appliance Parts",
        affiliate_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
      },
      current_csv_row: {
        ...readyPlan({}).current_csv_row!,
        filter_slug: "mwf",
      },
    }),
  ];
  const cohorts = groupManufacturerRescueApplyPlansIntoCohortsV1(plans);
  assert.equal(cohorts.length, 2);
});

test("approval packet never auto-approves", () => {
  const packet = buildManufacturerRescueOwnerApprovalPacketFromPlansV1({
    cohort_id: "test_cohort",
    plans: [readyPlan({})],
  });
  assert.equal(packet.auto_approval_forbidden, true);
  assert.equal(packet.owner_approval_required, true);
  assert.equal(packet.csv_apply_authorized, false);
  assert.equal(packet.readiness_gate_promotion_authorized, false);
  assert.equal(packet.contract, MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1);
});

test("batch approval eligible when multiple slugs share mutation pattern", () => {
  const packet = buildManufacturerRescueOwnerApprovalPacketFromPlansV1({
    cohort_id: "test_cohort",
    plans: [readyPlan({ filter_slug: "edr4rxd1" }), readyPlan({ filter_slug: "edr3rxd1" })],
  });
  assert.equal(packet.batch_approval_eligible, true);
  assert.equal(packet.lane_count, 2);
});

test("non-READY plans are excluded from cohort grouping", () => {
  const cohorts = groupManufacturerRescueApplyPlansIntoCohortsV1([
    readyPlan({}),
    readyPlan({ filter_slug: "wf3cb", plan_status: "BLOCKED_CONFUSION_FAMILY_REVIEW" }),
  ]);
  assert.equal(cohorts.length, 1);
  assert.equal(cohorts[0]!.plans.length, 1);
});

test("factory artifacts are read-only drafts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mfr-owner-approval-factory-"));
  const plans = [readyPlan({ filter_slug: "edr4rxd1" })];
  const packet = buildManufacturerRescueOwnerApprovalPacketFromPlansV1({
    cohort_id: "approval_cohort_everydrop",
    plans,
  });
  const report = {
    contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_FACTORY_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    csv_apply_authorized: false as const,
    supabase_mutation_authorized: false as const,
    browser_automation_authorized: false as const,
    coverage_unlocked: false as const,
    auto_approval_forbidden: true as const,
    readiness_gate_promotion_authorized: false as const,
    generated_at: "2026-06-26T12:00:00.000Z",
    source_command: "npm run buckparts:manufacturer-rescue-owner-approval-packet-factory" as const,
    apply_plan_factory_contract: "manufacturer_safe_link_rescue_apply_plan_factory_v1" as const,
    apply_plan_factory_generated_at: "2026-06-26T12:00:00.000Z",
    apply_plan_factory_artifact_path:
      "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-factory-v1.json",
    ready_for_owner_review_plan_count: 1,
    approval_cohort_count: 1,
    batch_approval_eligible_cohort_count: 0,
    total_lanes_in_cohorts: 1,
    cohorts: [],
    skipped_non_ready_plan_count: 0,
    inspect_summary: {
      recommended_next_action: "test",
      readiness_gate_owner_approval_note: "test",
      apply_plan_factory_note: "test",
    },
    proven_facts: [],
    unknown_facts: [],
  };
  const template = {
    contract: "founder_decision_registry_v1" as const,
    template_only: true as const,
    not_consumed_by_automation: true as const,
    mutation_authorized: false as const,
    read_only: true as const,
    data_mutation: false as const,
    template_for_packet_contract: MANUFACTURER_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    source_decision_packet_id: "manufacturer_rescue_owner_approval_packet_v1" as const,
    cohort_id: packet.cohort_id,
    apply_plan_artifact_rels: [packet.lanes[0]!.apply_plan_artifact_rel],
    allowed_founder_option_ids: ["approve_apply_plan"] as const,
    row_template: {},
    notes: [],
  };
  const written = writeManufacturerRescueOwnerApprovalPacketFactoryArtifactsV1({
    rootDir: root,
    report,
    packets: [packet],
    decision_templates: [template],
  });
  const factoryJson = JSON.parse(
    readFileSync(path.join(root, written.factoryJsonRelPath), "utf8"),
  ) as { read_only: boolean; auto_approval_forbidden: boolean };
  assert.equal(factoryJson.read_only, true);
  assert.equal(factoryJson.auto_approval_forbidden, true);
  assert.equal(written.approvalPacketRelPaths.length, 1);
  assert.equal(written.decisionTemplateRelPaths.length, 1);
});

test("factory with no READY plans produces zero cohorts", () => {
  const { report } = buildManufacturerRescueOwnerApprovalPacketFactoryV1({
    rootDir: process.cwd(),
    fileExists: () => false,
    now: () => new Date("2026-06-26T12:00:00.000Z"),
  });
  assert.equal(report.approval_cohort_count, 0);
  assert.equal(report.ready_for_owner_review_plan_count, 0);
  assert.equal(report.auto_approval_forbidden, true);
});
