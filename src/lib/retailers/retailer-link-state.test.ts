import test from "node:test";
import assert from "node:assert/strict";
import {
  RETAILER_LINK_STATES,
  mapSignalsToRetailerLinkState,
} from "./retailer-link-state";

test("rejected overrides all", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({
      reviewStatus: "rejected",
      gateFailureKind: "search_placeholder",
      verifierClass: "direct_buyable",
    }),
    RETAILER_LINK_STATES.REJECTED,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({
      candidateState: "rejected",
      verifierClass: "direct_buyable",
    }),
    RETAILER_LINK_STATES.REJECTED,
  );
});

test("each gate failure maps correctly", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ gateFailureKind: "search_placeholder" }),
    RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ gateFailureKind: "indirect_discovery" }),
    RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ gateFailureKind: "broken_destination" }),
    RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ gateFailureKind: "missing_browser_truth" }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_MISSING,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ gateFailureKind: "unsafe_browser_truth" }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE,
  );
});

test("operator 404/not_found maps to destination unavailable", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "404" }),
    RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "404/not_found" }),
    RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE,
  );
});

test("discontinued/substitution maps to destination unavailable", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "discontinued/substitution" }),
    RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE,
  );
});

test("suffix drift/no exact token maps to token risk", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "suffix drift" }),
    RETAILER_LINK_STATES.BLOCKED_TOKEN_OR_MATCH_RISK,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "no exact token" }),
    RETAILER_LINK_STATES.BLOCKED_TOKEN_OR_MATCH_RISK,
  );
});

test("no buyability maps correctly", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "no buyability" }),
    RETAILER_LINK_STATES.BLOCKED_NO_BUYABILITY_EVIDENCE,
  );
});

test("direct_buyable maps live", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "direct_buyable" }),
    RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ browserTruthClassification: "direct_buyable" }),
    RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ candidateState: "direct_buyable" }),
    RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE,
  );
});

test("BLOCKED_UNSAFE buyable subtype maps blocked unsafe even with direct_buyable class", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({
      browserTruthClassification: "direct_buyable",
      browserTruthBuyableSubtype: "BLOCKED_UNSAFE",
    }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE,
  );
});

test("likely_valid maps likely non-buyable", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "likely_valid" }),
    RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ browserTruthClassification: "likely_valid" }),
    RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ candidateState: "likely_valid" }),
    RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE,
  );
});

test("verifier search/not_found/blocked classes map correctly", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "likely_search_results" }),
    RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "likely_not_found" }),
    RETAILER_LINK_STATES.BLOCKED_DESTINATION_UNAVAILABLE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "likely_blocked" }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "timeout" }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ verifierClass: "browser_error" }),
    RETAILER_LINK_STATES.BLOCKED_BROWSER_TRUTH_UNSAFE,
  );
});

test("candidate lifecycle states map correctly", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ candidateState: "browser_truth_checked" }),
    RETAILER_LINK_STATES.CANDIDATE_BROWSER_CHECKED,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ candidateState: "token_verified" }),
    RETAILER_LINK_STATES.CANDIDATE_TOKEN_VERIFIED,
  );
  assert.equal(
    mapSignalsToRetailerLinkState({ candidateState: "candidate_found" }),
    RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW,
  );
});

test("no candidate maps pending review", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({ operatorReason: "no candidate" }),
    RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW,
  );
});

test("fallback maps pending review", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({}),
    RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW,
  );
});

test("missing browser truth does not inflate to live state even when subtype is present", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({
      browserTruthClassification: null,
      browserTruthBuyableSubtype: "MULTIPACK_DIRECT_BUYABLE",
    }),
    RETAILER_LINK_STATES.CANDIDATE_PENDING_REVIEW,
  );
});

test("priority: gate failure beats direct_buyable", () => {
  assert.equal(
    mapSignalsToRetailerLinkState({
      gateFailureKind: "search_placeholder",
      verifierClass: "direct_buyable",
      browserTruthClassification: "direct_buyable",
      candidateState: "direct_buyable",
    }),
    RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY,
  );
});
