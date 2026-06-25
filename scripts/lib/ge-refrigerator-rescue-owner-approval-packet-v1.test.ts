import assert from "node:assert/strict";
import test from "node:test";

import { deriveGeRescueBrowserSignals } from "./ge-refrigerator-rescue-browser-capture-v1";
import {
  buildGeRefrigeratorRescueOwnerApprovalLaneV1,
  buildGeRefrigeratorRescueOwnerApprovalPacketV1,
} from "./ge-refrigerator-rescue-owner-approval-packet-v1";
import type { GeRefrigeratorRescueAdapterReportV1 } from "./ge-refrigerator-rescue-adapter-v1";

const retailerCsv = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
mwf,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWF,true,0,oem-parts-catalog,,,
rpwfe,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,applied,2026-06-02T14:23:08.624Z
`;

const filtersCsv = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
ge,mwf,MWF,GE MWF,6,
ge,rpwfe,RPWFE,GE RPWFE,6,
`;

const passEvidence = {
  contract: "ge_refrigerator_rescue_browser_evidence_v1",
  adapter_contract: "ge_refrigerator_rescue_adapter_v1",
  read_only: true,
  data_mutation: false,
  filter_slug: "mwf",
  oem_part_token: "MWF",
  target_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
  checked_at: "2026-06-10T12:00:00.000Z",
  browser_truth_status: "PASS",
  direct_pdp_status: "PROVEN",
  exact_token_in_primary_slice: true,
  official_manufacturer_path: true,
  direct_purchase_control_visible: true,
  wrong_family_assessment: {
    blocked: false,
    forbidden_tokens_checked: ["MWFP"],
    detected_forbidden_tokens: [],
    notes: "ok",
  },
  validation_gates: [],
  evidence_summary: "PASS",
  captured_signals: {
    final_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    page_title: "MWF",
    h1_text: "MWF",
    sku_line_sample: null,
    purchase_actions_visible: ["Add to Cart"],
    classification: "direct_buyable",
    classification_notes: null,
    text_sample_excerpt: null,
    screenshot_path: null,
    navigation_error: null,
  },
  blockers: [],
  prohibited_actions: [],
  buckparts_verified_link_authorized: false,
  csv_apply_authorized: false,
  supabase_mutation_authorized: false,
  public_ui_mutation_authorized: false,
  netlify_api_authorized: false,
  waterdrop_in_scope: false,
  owner_review_ready: true,
  apply_plan_proposal_ready: true,
};

test("deriveGeRescueBrowserSignals PASS for direct_buyable MSWF", () => {
  const d = deriveGeRescueBrowserSignals({
    filterSlug: "mswf",
    oemPartToken: "MSWF",
    targetUrl: "https://www.geapplianceparts.com/store/parts/spec/MSWF",
    csvPrimaryIsSearchPlaceholder: true,
    finalUrl: "https://www.geapplianceparts.com/store/parts/spec/MSWF",
    title: "MSWF | GE Parts",
    h1Text: "MSWF",
    textSample: "GE refrigerator water filter MSWF",
    purchaseActions: ["Add to Cart"],
    classification: "direct_buyable",
    captureCompleted: true,
  });
  assert.equal(d.browser_truth_status, "PASS");
  assert.equal(d.owner_review_ready, true);
  assert.equal(d.blockers.length, 0);
});

test("owner approval lane NOT_READY without browser evidence", () => {
  const cohortRow = {
    filter_slug: "mwf",
    oem_part_token: "MWF",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER" as const,
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 5,
    csv_primary_is_search_placeholder: true,
    csv_browser_truth_classification: null,
    current_primary_affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWF",
    discovered_spec_pdp_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    proposed_retailer_name: "GE Appliance Parts" as const,
    proposed_retailer_key: "oem-parts-catalog" as const,
    proposed_customer_label: "BuckParts Verified Link" as const,
    proposed_label_subtype: "official_manufacturer_official_ge" as const,
    supersession_review_required: false,
    wrong_family_forbidden_tokens: ["MWFP"],
    browser_evidence_artifact_rel_path:
      "data/fridge/batch-production/ge-rescue/mwf-official-ge-browser-evidence-v1.json",
    validation_gates: [],
    adapter_ready_for_browser_capture: true,
    owner_apply_packet_lane_eligible: true,
    brand_slug: "ge",
  };

  const lane = buildGeRefrigeratorRescueOwnerApprovalLaneV1({
    rootDir: "/tmp",
    cohortRow,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: (p) => (p.includes("retailer_links") ? retailerCsv : ""),
  });

  assert.equal(lane.plan_status, "NOT_READY");
  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.ok(lane.blockers.includes("browser_evidence_artifact_missing"));
});

test("owner approval lane PROPOSED_OWNER_REVIEW_READY with PASS evidence", () => {
  const cohortRow = {
    filter_slug: "mwf",
    oem_part_token: "MWF",
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER" as const,
    in_fridge_rescue_queue: true,
    rescue_queue_rank: 5,
    csv_primary_is_search_placeholder: true,
    csv_browser_truth_classification: null,
    current_primary_affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWF",
    discovered_spec_pdp_url: "https://www.geapplianceparts.com/store/parts/spec/MWF",
    proposed_retailer_name: "GE Appliance Parts" as const,
    proposed_retailer_key: "oem-parts-catalog" as const,
    proposed_customer_label: "BuckParts Verified Link" as const,
    proposed_label_subtype: "official_manufacturer_official_ge" as const,
    supersession_review_required: false,
    wrong_family_forbidden_tokens: ["MWFP"],
    browser_evidence_artifact_rel_path:
      "data/fridge/batch-production/ge-rescue/mwf-official-ge-browser-evidence-v1.json",
    validation_gates: [],
    adapter_ready_for_browser_capture: true,
    owner_apply_packet_lane_eligible: true,
    brand_slug: "ge",
  };

  const lane = buildGeRefrigeratorRescueOwnerApprovalLaneV1({
    rootDir: "/tmp",
    cohortRow,
    fileExists: (p) =>
      p.includes("retailer_links") || p.includes("mwf-official-ge-browser-evidence"),
    readTextFile: (p) => {
      if (p.includes("retailer_links")) return retailerCsv;
      if (p.includes("mwf-official-ge-browser-evidence")) return JSON.stringify(passEvidence);
      return "";
    },
  });

  assert.equal(lane.plan_status, "PROPOSED_OWNER_REVIEW_READY");
  assert.equal(lane.apply_plan_proposal_ready, true);
  assert.equal(lane.owner_apply_review_ready, true);
  assert.ok(lane.planned_retailer_links_csv_change);
  assert.match(
    lane.planned_retailer_links_csv_change!.current_row.affiliate_url ?? "",
    /searchKeyword=MWF/i,
  );
  assert.equal(
    lane.planned_retailer_links_csv_change!.proposed_row.affiliate_url,
    "https://www.geapplianceparts.com/store/parts/spec/MWF",
  );
});

test("owner approval packet is read-only with prohibited actions", () => {
  const packet = buildGeRefrigeratorRescueOwnerApprovalPacketV1({
    rootDir: "/tmp",
    now: () => new Date("2026-06-10T00:00:00.000Z"),
    fileExists: (p) => p.includes("retailer_links") || p.includes("filters"),
    readTextFile: (p) => {
      if (p.includes("retailer_links")) return retailerCsv;
      if (p.includes("filters")) return filtersCsv;
      return "";
    },
  });

  assert.equal(packet.contract, "ge_refrigerator_rescue_owner_approval_packet_v1");
  assert.equal(packet.read_only, true);
  assert.equal(packet.csv_apply_authorized, false);
  assert.equal(packet.apply_authorized, false);
  assert.ok(packet.prohibited_actions_still_apply.length > 0);
  assert.equal(packet.lanes.length, 1);
});
