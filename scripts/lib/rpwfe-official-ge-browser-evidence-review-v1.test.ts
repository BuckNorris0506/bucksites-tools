import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyOemPage,
  type RpwfeOfficialGeBrowserEvidenceArtifactV1,
} from "./rpwfe-official-ge-browser-capture-v1";
import { buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1 } from "./rpwfe-official-ge-browser-evidence-review-v1";

const passArtifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 = {
  contract: "rpwfe_official_ge_browser_evidence_v1",
  read_only: true,
  data_mutation: false,
  filter_slug: "rpwfe",
  target_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
  checked_at: "2026-05-31T12:00:00.000Z",
  browser_truth_status: "PASS",
  direct_pdp_status: "PROVEN",
  exact_token_visible: true,
  official_manufacturer_path: true,
  direct_purchase_control_visible: true,
  evidence_summary: "PASS",
  captured_signals: {
    final_url: "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
    page_title: "RPWFE Refrigerator Water Filter",
    h1_text: "RPWFE",
    sku_line_sample: null,
    purchase_actions_visible: ["Add to Cart"],
    classification: "direct_buyable",
    classification_notes: "purchase",
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

const failArtifact: RpwfeOfficialGeBrowserEvidenceArtifactV1 = {
  ...passArtifact,
  browser_truth_status: "FAIL",
  direct_pdp_status: "NOT_PROVEN",
  exact_token_visible: false,
  direct_purchase_control_visible: false,
  owner_review_ready: false,
  apply_plan_proposal_ready: false,
  blockers: ["direct_purchase_control_not_visible"],
};

const rescuePlanStub = {
  official_ge_candidate: { status: "PROVEN_IN_REPO_DOC_NOT_APPLIED" },
} as Parameters<typeof buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1>[0]["rescuePlan"];

test("PASS artifact → owner-review-ready, not applied", () => {
  const lane = buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1({
    rootDir: "/tmp",
    fileExists: () => true,
    readTextFile: () => JSON.stringify(passArtifact),
    rescuePlan: rescuePlanStub,
  });

  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.official_ge_verified_link_candidate_status, "BROWSER_PROVEN_OWNER_REVIEW_READY");
  assert.equal(lane.owner_review_ready, true);
  assert.equal(lane.apply_plan_proposal_ready, true);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.waterdrop_in_scope, false);
});

test("FAIL blocks apply plan proposal", () => {
  const lane = buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1({
    rootDir: "/tmp",
    fileExists: () => true,
    readTextFile: () => JSON.stringify(failArtifact),
    rescuePlan: rescuePlanStub,
  });

  assert.equal(lane.browser_truth_status, "FAIL");
  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.equal(lane.owner_review_ready, false);
  assert.equal(lane.official_ge_verified_link_candidate_status, "BROWSER_FAILED");
});

test("UNKNOWN artifact blocks apply plan proposal", () => {
  const unknownArtifact = { ...passArtifact, browser_truth_status: "UNKNOWN" as const };
  const lane = buildRpwfeOfficialGeBrowserEvidenceReviewLaneV1({
    rootDir: "/tmp",
    fileExists: () => true,
    readTextFile: () => JSON.stringify(unknownArtifact),
    rescuePlan: rescuePlanStub,
  });

  assert.equal(lane.apply_plan_proposal_ready, false);
  assert.equal(lane.official_ge_verified_link_candidate_status, "BROWSER_UNKNOWN");
});

test("deriveRpwfeSignals via classify: search URL fails direct PDP", () => {
  const { classification } = classifyOemPage({
    finalUrl: "https://www.geapplianceparts.com/search?searchKeyword=RPWFE",
    title: "Search",
    textSample: "results for RPWFE",
    purchaseActions: [],
    hardTimeout: false,
    gotoFailed: false,
    errorNote: "",
  });
  assert.equal(classification, "likely_search_results");
});
