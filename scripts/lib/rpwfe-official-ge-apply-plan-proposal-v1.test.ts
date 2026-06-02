import assert from "node:assert/strict";
import test from "node:test";

import type { RpwfeOfficialGeBrowserEvidenceArtifactV1 } from "./rpwfe-official-ge-browser-capture-v1";
import { buildRpwfeOfficialGeApplyPlanProposalLaneV1 } from "./rpwfe-official-ge-apply-plan-proposal-v1";

const passArtifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 = {
  contract: "rpwfe_official_ge_browser_evidence_v1",
  read_only: true,
  data_mutation: false,
  filter_slug: "rpwfe",
  target_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
  checked_at: "2026-06-02T14:23:08.624Z",
  browser_truth_status: "PASS",
  direct_pdp_status: "PROVEN",
  exact_token_visible: true,
  official_manufacturer_path: true,
  direct_purchase_control_visible: true,
  evidence_summary: "PASS",
  captured_signals: {
    final_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
    page_title: "RPWFE",
    h1_text: "RPWFE",
    sku_line_sample: null,
    purchase_actions_visible: ["Add to Cart"],
    classification: "direct_buyable",
    classification_notes: null,
    text_sample_excerpt: null,
    screenshot_path: null,
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

const retailerCsv = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
rpwfe,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE,true,0,oem-parts-catalog,,,
`;

const appliedRetailerCsv = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
rpwfe,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,RPWFE official GE guarded CSV apply v1,2026-06-02T14:23:08.624Z
`;

test("PASS browser artifact with applied repo CSV surfaces already_applied noop plan", () => {
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: (p) => p.includes("rpwfe-official-ge-browser-evidence") || p.includes("retailer_links"),
    readTextFile: (p) => {
      if (p.includes("rpwfe-official-ge-browser-evidence")) return JSON.stringify(passArtifact);
      if (p.includes("retailer_links")) return appliedRetailerCsv;
      return "";
    },
  });

  assert.equal(lane.plan_status, "ALREADY_APPLIED_REPO_DIRECT_BUYABLE");
  assert.equal(lane.csv_apply_noop, true);
  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.equal(lane.owner_apply_review_ready, false);
  assert.equal(lane.current_row_state, "repo_direct_buyable_official_ge_spec_pdp_applied");
  assert.equal(lane.planned_retailer_links_csv_change, null);
  assert.ok(lane.blockers.includes("repo_csv_already_applied_official_ge"));
  assert.ok(lane.blockers.includes("supabase_parity_not_applied"));
  assert.match(lane.next_recommended_action, /Supabase parity/i);
});

test("PASS browser artifact creates owner-review-ready apply-plan proposal", () => {
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: (p) => p.includes("rpwfe-official-ge-browser-evidence") || p.includes("retailer_links"),
    readTextFile: (p) => {
      if (p.includes("rpwfe-official-ge-browser-evidence")) return JSON.stringify(passArtifact);
      if (p.includes("retailer_links")) return retailerCsv;
      return "";
    },
  });

  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.plan_status, "PROPOSED_OWNER_REVIEW_READY");
  assert.equal(lane.apply_plan_proposal_ready, true);
  assert.equal(lane.owner_apply_review_ready, true);
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.public_route, "/filter/rpwfe");
  assert.equal(lane.current_row_state, "existing_ge_catalog_search_placeholder_blocked");
  assert.equal(lane.proposed_url, "https://www.geapplianceparts.com/store/parts/spec/RPWFE");
  assert.equal(lane.proposed_customer_label, "BuckParts Verified Link");
  assert.equal(lane.proposed_label_subtype, "official_manufacturer_official_ge");
  assert.ok(lane.planned_retailer_links_csv_change);
  assert.match(
    lane.planned_retailer_links_csv_change!.current_row.affiliate_url ?? "",
    /searchKeyword=RPWFE/i,
  );
  assert.equal(
    lane.planned_retailer_links_csv_change!.proposed_row.affiliate_url,
    "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
  );
});

test("FAIL evidence does not create apply-ready proposal", () => {
  const failArtifact = { ...passArtifact, browser_truth_status: "FAIL" as const, apply_plan_proposal_ready: false };
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: () => true,
    readTextFile: () => JSON.stringify(failArtifact),
  });

  assert.equal(lane.plan_status, "NOT_READY");
  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.equal(lane.planned_retailer_links_csv_change, null);
  assert.ok(lane.blockers.includes("official_ge_browser_truth_not_pass"));
});

test("UNKNOWN evidence does not create apply-ready proposal", () => {
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: () => false,
    readTextFile: () => "",
  });

  assert.equal(lane.browser_truth_status, "UNKNOWN");
  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.equal(lane.planned_retailer_links_csv_change, null);
});

test("proposal excludes Waterdrop compatible replacement and Amazon", () => {
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: (p) => p.includes("evidence") || p.includes("retailer_links"),
    readTextFile: (p) => {
      if (p.includes("evidence")) return JSON.stringify(passArtifact);
      return retailerCsv;
    },
  });

  assert.equal(lane.waterdrop_in_proposal, false);
  assert.equal(lane.compatible_replacement_in_proposal, false);
  assert.equal(lane.amazon_in_proposal, false);
  const proposed = lane.planned_retailer_links_csv_change?.proposed_row;
  assert.equal(proposed?.waterdrop, false);
  assert.equal(proposed?.compatible_replacement, false);
  assert.equal(proposed?.amazon, false);
  assert.notEqual(proposed?.retailer_key, "amazon");
  assert.notEqual(proposed?.affiliate_url?.includes("amazon.com"), true);
  assert.notEqual(proposed?.label_subtype, "compatible_replacement");
});

test("mutation flags and required blockers stay false", () => {
  const lane = buildRpwfeOfficialGeApplyPlanProposalLaneV1({
    rootDir: "/tmp",
    fileExists: (p) => p.includes("evidence") || p.includes("retailer_links"),
    readTextFile: (p) => {
      if (p.includes("evidence")) return JSON.stringify(passArtifact);
      return retailerCsv;
    },
  });

  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.ok(lane.blockers.includes("owner_apply_approval_missing"));
  assert.ok(lane.blockers.includes("csv_apply_not_authorized"));
  assert.ok(lane.blockers.includes("supabase_mutation_not_authorized"));
  assert.ok(lane.blockers.includes("public_ui_mutation_not_authorized"));
});
