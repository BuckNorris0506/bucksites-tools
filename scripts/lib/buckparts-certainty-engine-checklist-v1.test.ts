import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuckpartsCertaintyEngineChecklistV1,
  BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1,
  BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1,
  BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1,
  BUCKPARTS_VERIFIED_LINK_DEFINITION_V1,
} from "./buckparts-certainty-engine-checklist-v1";
import type { RpwfePurchaseOptionRescueOwnerReviewLaneV1 } from "./rpwfe-purchase-option-rescue-owner-review-v1";
import type { AirPurifierDemandSelectedBatchOwnerReviewLaneV1 } from "./air-purifier-demand-selected-batch-owner-review-v1";

const FILTERS_CSV = `brand_slug,slug,oem_part_number,name,replacement_interval_months,notes
ge,rpwfe,RPWFE,GE RPWFE,6,
ge,mwf,MWF,GE MWF,6,
`;

const RETAILER_LINKS_CSV = `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at
rpwfe,OEM parts catalog,https://www.geapplianceparts.com/search?searchKeyword=RPWFE,true,0,oem-parts-catalog,,,
mwf,Amazon,https://www.amazon.com/dp/B00EXAMPLE?tag=buckparts20-20,true,0,amazon,direct_buyable,fixture,2026-05-01
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

const rpwfeLane = {
  contract: "rpwfe_purchase_option_rescue_owner_review_v1",
  current_public_state: "no_buy_options",
  compatible_model_count: 20,
  existing_retailer_row_status: "SEARCH_PLACEHOLDER_BLOCKED",
  compatible_waterdrop_path_status: "UNPROVEN_UNAUTHORIZED",
  customer_visible_problem: true,
} as Pick<
  RpwfePurchaseOptionRescueOwnerReviewLaneV1,
  | "contract"
  | "current_public_state"
  | "compatible_model_count"
  | "existing_retailer_row_status"
  | "compatible_waterdrop_path_status"
  | "customer_visible_problem"
>;

const apLane = {
  contract: "air_purifier_demand_selected_batch_owner_review_v1",
  batch_start_authorized: false,
  blockers: ["open_batch_not_proven", "owner_batch_start_approval_missing"],
} as Pick<
  AirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  "contract" | "batch_start_authorized" | "blockers"
>;

test("certainty engine checklist lane is read-only with mutation flags false", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({
    rootDir: "/fixture",
    ...fixtureReader({
      "data/filters.csv": FILTERS_CSV,
      "data/retailer_links.csv": RETAILER_LINKS_CSV,
    }),
    rpwfeOwnerReview: rpwfeLane as RpwfePurchaseOptionRescueOwnerReviewLaneV1,
    apDemandSelectedOwnerReview: apLane as AirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  });

  assert.equal(lane.contract, "buckparts_certainty_engine_checklist_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.buy_cta_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.recommended_jq_path, BUCKPARTS_CERTAINTY_ENGINE_CHECKLIST_CC_JQ_PATH_V1);
});

test("exposes stable top-level terminology and AI positioning fields", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({ rootDir: process.cwd() });

  assert.equal(lane.branded_term, BUCKPARTS_VERIFIED_LINK_BRANDED_TERM_V1);
  assert.equal(lane.branded_term, "BuckParts Verified Link");
  assert.equal(lane.branded_term_definition, BUCKPARTS_VERIFIED_LINK_DEFINITION_V1);
  assert.match(lane.branded_term_definition, /checked against the part/i);
  assert.equal(lane.ai_vs_buckparts_positioning, BUCKPARTS_AI_VS_BUCKPARTS_POSITIONING_V1);
  assert.match(lane.ai_vs_buckparts_positioning, /AI can suggest\. BuckParts verifies\./);
  assert.match(lane.ai_vs_buckparts_explanation, /withhold a BuckParts Verified Link/i);

  assert.equal(lane.customer_facing_terminology.branded_term, lane.branded_term);
  assert.equal(lane.customer_facing_terminology.branded_term_definition, lane.branded_term_definition);
});

test("checklist has at least 39 items with priority-ordered top lanes", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: rpwfeLane as RpwfePurchaseOptionRescueOwnerReviewLaneV1,
    apDemandSelectedOwnerReview: apLane as AirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  });

  assert.ok(lane.checklist_item_count >= 39);
  assert.equal(lane.checklist_items.length, lane.checklist_item_count);

  const first = lane.checklist_items[0]!;
  assert.equal(first.id, "every_filter_has_buckparts_verified_link_or_safe_buyer_path");
  assert.equal(first.label, "Every filter page must have a BuckParts Verified Link or safe buyer path.");
  assert.notEqual(first.status, "PROVEN");

  const ids = lane.checklist_items.map((item) => item.id);
  assert.ok(ids.indexOf("buyer_path_coverage_scoreboard") < 5);
  assert.ok(ids.indexOf("high_demand_no_buy_emergency_lane") < 5);
  assert.ok(ids.indexOf("model_first_lookup_is_first_class") < 12);
  assert.ok(ids.includes("visual_match_proof"));
  assert.ok(ids.includes("label_photo_screenshot_upload"));
  assert.ok(ids.includes("why_buckparts_beats_generic_ai"));
  assert.equal(ids.includes("label_photo_screenshot_intake"), false);

  const visual = lane.checklist_items.find((item) => item.id === "visual_match_proof");
  assert.equal(visual?.status, "NOT_PROVEN");
  const upload = lane.checklist_items.find((item) => item.id === "label_photo_screenshot_upload");
  assert.equal(upload?.status, "NOT_PROVEN");
  assert.match(upload?.label ?? "", /model sticker|Amazon screenshot|appliance tag/i);
});

test("surfaces BuckParts Verified Link terminology and forbids buy button as preferred language", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({ rootDir: process.cwd() });

  assert.ok(lane.customer_facing_terminology.forbidden_customer_language.includes("buy button"));
  assert.ok(
    lane.customer_facing_terminology.preferred_language.some((phrase) =>
      phrase.includes("BuckParts Verified Link"),
    ),
  );

  assert.ok(!lane.north_star_statement.toLowerCase().includes("buy button"));
  assert.ok(!lane.master_question.toLowerCase().includes("buy button"));
  for (const item of lane.checklist_items) {
    assert.ok(!item.label.toLowerCase().includes("buy button"));
  }
});

test("surfaces RPWFE blocker and AP batch start blocked when lanes attached", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: rpwfeLane as RpwfePurchaseOptionRescueOwnerReviewLaneV1,
    apDemandSelectedOwnerReview: apLane as AirPurifierDemandSelectedBatchOwnerReviewLaneV1,
  });

  assert.ok(
    lane.current_blockers.some((blocker) => blocker.includes("rpwfe:current_public_state=no_buy_options")),
  );
  assert.ok(lane.current_blockers.some((blocker) => blocker.includes("ap_batch_start:blocked")));

  const emergency = lane.checklist_items.find((item) => item.id === "high_demand_no_buy_emergency_lane");
  assert.ok(emergency?.proof_or_blocker.includes("rpwfe"));
});

test("surfaces marketing two-handle plan seal goal and no forced login", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({ rootDir: process.cwd() });

  assert.equal(lane.login_and_email_stance.forced_login_before_value, false);
  assert.equal(lane.marketing_plan.every_post_must_include_educational_component, true);

  const aiItem = lane.checklist_items.find((item) => item.id === "why_buckparts_beats_generic_ai");
  assert.ok(aiItem);
  assert.match(aiItem!.why_it_matters, /AI can suggest\. BuckParts verifies\./);
  assert.notEqual(aiItem!.status, "PROVEN");
});

test("does not emit revenue conversion traffic or adoption claims in customer-facing copy", () => {
  const lane = buildBuckpartsCertaintyEngineChecklistV1({ rootDir: process.cwd() });
  const customerFacing = [
    lane.north_star_statement,
    lane.master_question,
    lane.branded_term_definition,
    lane.ai_vs_buckparts_explanation,
    lane.recommended_next_action,
    ...lane.checklist_items.flatMap((item) => [item.label, item.why_it_matters, item.proof_or_blocker]),
    ...lane.marketing_plan.founder_themes,
    ...lane.marketing_plan.brand_themes,
  ]
    .join(" ")
    .toLowerCase();
  assert.equal(customerFacing.includes("revenue"), false);
  assert.equal(customerFacing.includes("conversion rate"), false);
  assert.equal(customerFacing.includes("customer adoption"), false);
  assert.equal(customerFacing.includes("traffic growth"), false);
  assert.ok(
    lane.unknown_facts.some((fact) => /revenue|conversion|adoption|traffic/i.test(fact)),
  );
});
