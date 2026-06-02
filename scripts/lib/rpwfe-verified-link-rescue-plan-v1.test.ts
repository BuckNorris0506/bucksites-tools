import assert from "node:assert/strict";
import test from "node:test";

import { buildRpwfeVerifiedLinkRescuePlanV1 } from "./rpwfe-verified-link-rescue-plan-v1";
import type { RpwfePurchaseOptionRescueOwnerReviewLaneV1 } from "./rpwfe-purchase-option-rescue-owner-review-v1";

const ownerReviewFixture = {
  contract: "rpwfe_purchase_option_rescue_owner_review_v1",
  read_only: true,
  data_mutation: false,
  recommended_jq_path: ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1",
  filter_slug: "rpwfe",
  public_route: "/filter/rpwfe",
  customer_visible_problem: true,
  current_public_state: "no_buy_options",
  compatible_model_count: 20,
  existing_retailer_row_status: "SEARCH_PLACEHOLDER_BLOCKED",
  existing_retailer_row: {
    source_path: "data/retailer_links.csv",
    retailer_name: "OEM parts catalog",
    retailer_key: "oem-parts-catalog",
    affiliate_url: "https://www.geapplianceparts.com/search?searchKeyword=RPWFE",
    gate_failure_kind: "search_placeholder",
    retailer_link_state: "BLOCKED_SEARCH_OR_DISCOVERY",
  },
  official_ge_path_status: "PROVEN_IN_REPO_DOC_NOT_APPLIED",
  official_ge_candidate_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
  compatible_waterdrop_path_status: "UNPROVEN_UNAUTHORIZED",
  candidate_waterdrop_product: "WD-F19C",
  safe_labeling_required: true,
  official_label_authorized: false,
  compatible_label_authorized: false,
  csv_apply_authorized: false,
  supabase_mutation_authorized: false,
  evidence_write_authorized: false,
  public_ui_mutation_authorized: false,
  netlify_api_authorized: false,
  customer_trust_impact: [],
  blockers: ["official_ge_direct_pdp_not_proven_or_not_applied"],
  next_safe_evidence_packet_recommendations: [],
  proven_facts: [],
  inferred_facts: [],
  unknown_facts: [],
  next_agent_action: "",
  next_owner_action: "",
} as RpwfePurchaseOptionRescueOwnerReviewLaneV1;

test("rpwfe_verified_link_rescue_plan_v1 is read-only with mutation flags false", () => {
  const lane = buildRpwfeVerifiedLinkRescuePlanV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: ownerReviewFixture,
  });

  assert.equal(lane.contract, "rpwfe_verified_link_rescue_plan_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.deploy_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
});

test("surfaces HIGH_DEMAND emergency and separates GE vs Waterdrop", () => {
  const lane = buildRpwfeVerifiedLinkRescuePlanV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: ownerReviewFixture,
  });

  assert.equal(lane.emergency_classification, "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP");
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.official_ge_candidate.path_type, "OFFICIAL_GE_MANUFACTURER");
  assert.equal(lane.official_ge_candidate.separated_from_compatible_path, true);
  assert.equal(lane.compatible_waterdrop_candidate.path_type, "COMPATIBLE_REPLACEMENT_NOT_OFFICIAL_GE");
  assert.equal(lane.compatible_waterdrop_candidate.product_sku, "WD-F19C");
  assert.equal(lane.compatible_waterdrop_candidate.status, "UNPROVEN_UNAUTHORIZED");
  assert.equal(lane.compatible_waterdrop_candidate.not_official_ge, true);
  assert.equal(lane.official_ge_candidate.buckparts_verified_link_authorized, false);
  assert.equal(lane.compatible_waterdrop_candidate.buckparts_verified_link_authorized, false);
});

test("includes Visual Match Proof and plain-language electronic filter risk", () => {
  const lane = buildRpwfeVerifiedLinkRescuePlanV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: ownerReviewFixture,
  });

  assert.equal(lane.visual_match_proof_needed.required, true);
  assert.equal(lane.visual_match_proof_needed.status, "NOT_PROVEN");
  assert.match(lane.visual_match_proof_needed.summary, /visual similarity alone is not proof/i);
  assert.match(lane.electronic_filter_risk_plain_language, /small electronic piece inside/i);
  assert.ok(
    lane.evidence_requirements.compatible_waterdrop.some((req) =>
      req.toLowerCase().includes("visual match"),
    ),
  );
});

test("prohibited claims block official GE label for Waterdrop and unsupported fits", () => {
  const lane = buildRpwfeVerifiedLinkRescuePlanV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: ownerReviewFixture,
  });

  const blob = lane.prohibited_claims.join(" ").toLowerCase();
  assert.ok(blob.includes("do not call waterdrop"));
  assert.ok(blob.includes("official ge"));
  assert.ok(blob.includes("fits"));
  assert.ok(blob.includes("buckparts verified link"));
  assert.ok(blob.includes("better than generic ai"));
  assert.ok(blob.includes("guarantee"));
});

test("references Certainty Engine context and BuckParts Verified Link term", () => {
  const lane = buildRpwfeVerifiedLinkRescuePlanV1({
    rootDir: process.cwd(),
    rpwfeOwnerReview: ownerReviewFixture,
    certaintyEngineChecklist: {
      checklist_items: [
        {
          id: "every_filter_has_buckparts_verified_link_or_safe_buyer_path",
          status: "NOT_PROVEN",
          label: "",
          why_it_matters: "",
          proof_or_blocker: "",
          priority_rank: 1,
        },
        {
          id: "high_demand_no_buy_emergency_lane",
          status: "BLOCKED",
          label: "",
          why_it_matters: "",
          proof_or_blocker: "BLOCKED example: /filter/rpwfe",
          priority_rank: 3,
        },
      ],
    } as unknown as import("./buckparts-certainty-engine-checklist-v1").BuckpartsCertaintyEngineChecklistLaneV1,
  });

  assert.match(lane.why_this_matters_to_certainty_engine, /Certainty Engine/i);
  assert.equal(lane.certainty_engine_context.branded_customer_term, "BuckParts Verified Link");
  assert.match(lane.certainty_engine_context.ai_positioning, /AI can suggest\. BuckParts verifies\./);
  assert.equal(lane.certainty_engine_context.first_checklist_item_status, "NOT_PROVEN");
  assert.equal(lane.certainty_engine_context.high_demand_no_buy_emergency_lane_references_rpwfe, true);
});
