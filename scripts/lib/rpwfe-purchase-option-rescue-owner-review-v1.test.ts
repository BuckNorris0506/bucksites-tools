import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRpwfePurchaseOptionRescueOwnerReviewLaneV1,
} from "./rpwfe-purchase-option-rescue-owner-review-v1";

const FILTERS_CSV = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
ge,rpwfe,RPWFE,GE RPWFE (RFID),6,fixture
`;

const COMPAT_CSV = `fridge_slug,filter_slug
ge-gfe28gmkes,rpwfe
ge-gfe28gynfs,rpwfe
ge-gfe28gskss,rpwfe
`;

const RETAILER_LINKS_CSV = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
rpwfe,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE,true,0,oem-parts-catalog,,,
`;

const RPWFE_DOC = `
GE Appliance Parts spec PDP: https://www.geapplianceparts.com/store/parts/spec/RPWFE
Proof: PROVEN Playwright direct_buyable with Add to Cart.
Waterdrop WD-F19C evidence: UNKNOWN until visible PDP proof.
`;

const WATERDROP_DOC = `
Waterdrop WD-F19C exists on HD/Amazon web: INFERRED (owner + external web; not in-repo browser proof yet).
`;

function fixtureReader(files: Record<string, string>) {
  return {
    fileExists: (abs: string) => Object.keys(files).some((suffix) => abs.endsWith(suffix)),
    readTextFile: (abs: string) => {
      const key = Object.keys(files).find((suffix) => abs.endsWith(suffix));
      return key ? files[key] : "";
    },
  };
}

const ALL_FILES = {
  "data/filters.csv": FILTERS_CSV,
  "data/compatibility_mappings.csv": COMPAT_CSV,
  "data/retailer_links.csv": RETAILER_LINKS_CSV,
  "docs/RPWFE-PURCHASE-OPTION-RESCUE-V1.md": RPWFE_DOC,
  "docs/WATERDROP-CATALOG-INTELLIGENCE-V1.md": WATERDROP_DOC,
};

test("RPWFE purchase-option rescue owner-review lane is read-only and mutation-blocked", () => {
  const reader = fixtureReader(ALL_FILES);
  const lane = buildRpwfePurchaseOptionRescueOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    ...reader,
  });

  assert.equal(lane.contract, "rpwfe_purchase_option_rescue_owner_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1");
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.public_route, "/filter/rpwfe");
  assert.equal(lane.customer_visible_problem, true);
  assert.equal(lane.current_public_state, "no_buy_options");
  assert.equal(lane.compatible_model_count, 3);
  assert.equal(lane.existing_retailer_row_status, "SEARCH_PLACEHOLDER_BLOCKED");
  assert.equal(lane.existing_retailer_row?.gate_failure_kind, "search_placeholder");
  assert.equal(lane.official_ge_path_status, "PROVEN_IN_REPO_DOC_NOT_APPLIED");
  assert.equal(lane.compatible_waterdrop_path_status, "UNPROVEN_UNAUTHORIZED");
  assert.equal(lane.candidate_waterdrop_product, "WD-F19C");
  assert.equal(lane.safe_labeling_required, true);
  assert.equal(lane.official_label_authorized, false);
  assert.equal(lane.compatible_label_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.ok(lane.blockers.includes("official_ge_direct_pdp_not_proven_or_not_applied"));
  assert.ok(lane.blockers.includes("waterdrop_wd_f19c_evidence_not_proven"));
  assert.ok(lane.blockers.includes("compatible_replacement_labeling_not_authorized"));
  assert.ok(lane.blockers.includes("owner_rescue_approval_missing"));
  assert.ok(lane.blockers.includes("csv_supabase_mutation_not_authorized"));
  assert.ok(lane.next_safe_evidence_packet_recommendations.some((p) => p.packet_id.includes("official_ge")));
  assert.ok(lane.next_safe_evidence_packet_recommendations.some((p) => p.packet_id.includes("waterdrop")));
  assert.match(lane.next_agent_action, /do not add buy links/i);
});

test("RPWFE owner-review lane degrades safely when inputs are missing", () => {
  const lane = buildRpwfePurchaseOptionRescueOwnerReviewLaneV1({
    rootDir: "/fixture-root",
    fileExists: () => false,
    readTextFile: () => "",
  });

  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.compatible_model_count, "UNKNOWN");
  assert.equal(lane.existing_retailer_row_status, "UNKNOWN");
  assert.equal(lane.official_ge_path_status, "UNKNOWN");
  assert.equal(lane.compatible_waterdrop_path_status, "UNKNOWN");
  assert.equal(lane.candidate_waterdrop_product, "UNKNOWN");
  assert.equal(lane.official_label_authorized, false);
  assert.equal(lane.compatible_label_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.ok(lane.blockers.includes("rpwfe_filter_catalog_row_missing"));
  assert.ok(lane.blockers.includes("rpwfe_search_placeholder_row_not_proven"));
  assert.ok(lane.unknown_facts.some((fact) => fact.includes("data/retailer_links.csv")));
});
