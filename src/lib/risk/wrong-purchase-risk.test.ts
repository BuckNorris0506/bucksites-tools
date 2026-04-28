import test from "node:test";
import assert from "node:assert/strict";
import {
  WRONG_PURCHASE_RISKS,
  mapSignalsToWrongPurchaseRisk,
} from "./wrong-purchase-risk";

test("no compatibility mapping", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({
      matchBasis: "no_repo_compatibility_mapping",
      gateFailureKind: "search_placeholder",
    }),
    WRONG_PURCHASE_RISKS.NO_COMPATIBILITY_MAPPING,
  );
});

test("ambiguous multi part", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({
      matchBasis: "multiple_mapped_parts_no_recommended",
    }),
    WRONG_PURCHASE_RISKS.AMBIGUOUS_MULTI_PART_MATCH,
  );
});

test("each gate failure kind maps correctly", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ gateFailureKind: "search_placeholder" }),
    WRONG_PURCHASE_RISKS.SEARCH_PLACEHOLDER_LINK,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ gateFailureKind: "indirect_discovery" }),
    WRONG_PURCHASE_RISKS.INDIRECT_DISCOVERY_LINK,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ gateFailureKind: "broken_destination" }),
    WRONG_PURCHASE_RISKS.BROKEN_DESTINATION_LINK,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ gateFailureKind: "missing_browser_truth" }),
    WRONG_PURCHASE_RISKS.MISSING_BROWSER_TRUTH,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ gateFailureKind: "unsafe_browser_truth" }),
    WRONG_PURCHASE_RISKS.UNSAFE_BROWSER_TRUTH,
  );
});

test("404/not_found maps to broken destination", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ operatorReason: "404" }),
    WRONG_PURCHASE_RISKS.BROKEN_DESTINATION_LINK,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ operatorReason: "404/not_found" }),
    WRONG_PURCHASE_RISKS.BROKEN_DESTINATION_LINK,
  );
});

test("discontinued warning maps correctly", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ operatorReason: "discontinued/substitution" }),
    WRONG_PURCHASE_RISKS.DISCONTINUED_OR_SUBSTITUTION,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ hasSubstitutionOrDiscontinuedWarning: true }),
    WRONG_PURCHASE_RISKS.DISCONTINUED_OR_SUBSTITUTION,
  );
});

test("no exact token maps correctly", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ operatorReason: "no exact token" }),
    WRONG_PURCHASE_RISKS.TOKEN_OR_SUFFIX_MISMATCH,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ hasExactTokenOrAliasProof: false }),
    WRONG_PURCHASE_RISKS.TOKEN_OR_SUFFIX_MISMATCH,
  );
});

test("no buyability maps correctly", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ operatorReason: "no buyability" }),
    WRONG_PURCHASE_RISKS.NO_BUYABILITY_EVIDENCE,
  );
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ hasBuyabilityEvidence: false }),
    WRONG_PURCHASE_RISKS.NO_BUYABILITY_EVIDENCE,
  );
});

test("suppress_buy maps to no verified buy link", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ buyerPathState: "suppress_buy" }),
    WRONG_PURCHASE_RISKS.NO_VERIFIED_BUY_LINK,
  );
});

test("zero approved links maps to no verified buy link", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ approvedRetailerLinkCount: 0 }),
    WRONG_PURCHASE_RISKS.NO_VERIFIED_BUY_LINK,
  );
});

test("non-direct browser truth maps to unsafe browser truth", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({ browserTruthClassification: "likely_valid" }),
    WRONG_PURCHASE_RISKS.UNSAFE_BROWSER_TRUTH,
  );
});

test("fallback maps to UNKNOWN", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({
      buyerPathState: "show_buy",
      approvedRetailerLinkCount: 2,
      browserTruthClassification: "direct_buyable",
    }),
    WRONG_PURCHASE_RISKS.UNKNOWN,
  );
});

test("priority: compatibility risk beats link risk", () => {
  assert.equal(
    mapSignalsToWrongPurchaseRisk({
      matchBasis: "no_repo_compatibility_mapping",
      gateFailureKind: "unsafe_browser_truth",
      operatorReason: "no buyability",
    }),
    WRONG_PURCHASE_RISKS.NO_COMPATIBILITY_MAPPING,
  );
});
