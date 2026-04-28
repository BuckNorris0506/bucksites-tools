import test from "node:test";
import assert from "node:assert/strict";
import {
  NO_BUY_REASONS,
  getNoBuyUserMessage,
  mapSignalsToNoBuyReason,
} from "./no-buy-reason";

test("each WrongPurchaseRisk maps correctly", () => {
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "NO_COMPATIBILITY_MAPPING" }),
    NO_BUY_REASONS.NO_COMPATIBILITY_PROOF,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "AMBIGUOUS_MULTI_PART_MATCH" }),
    NO_BUY_REASONS.AMBIGUOUS_COMPATIBILITY,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "SEARCH_PLACEHOLDER_LINK" }),
    NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "INDIRECT_DISCOVERY_LINK" }),
    NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "BROKEN_DESTINATION_LINK" }),
    NO_BUY_REASONS.DESTINATION_UNAVAILABLE,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "MISSING_BROWSER_TRUTH" }),
    NO_BUY_REASONS.LINK_UNDER_REVIEW,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "UNSAFE_BROWSER_TRUTH" }),
    NO_BUY_REASONS.LINK_FAILED_SAFETY_CHECK,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "DISCONTINUED_OR_SUBSTITUTION" }),
    NO_BUY_REASONS.SUBSTITUTION_UNVERIFIED,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "TOKEN_OR_SUFFIX_MISMATCH" }),
    NO_BUY_REASONS.PART_TOKEN_MISMATCH_RISK,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ wrongPurchaseRisk: "NO_BUYABILITY_EVIDENCE" }),
    NO_BUY_REASONS.BUYABILITY_NOT_CONFIRMED,
  );
});

test("replacementSafeToBuy false maps to REPLACEMENT_NOT_SAFE_YET", () => {
  assert.equal(
    mapSignalsToNoBuyReason({ replacementSafeToBuy: false }),
    NO_BUY_REASONS.REPLACEMENT_NOT_SAFE_YET,
  );
});

test("candidate links under review maps to LINK_UNDER_REVIEW", () => {
  assert.equal(
    mapSignalsToNoBuyReason({ hasCandidateLinksUnderReview: true }),
    NO_BUY_REASONS.LINK_UNDER_REVIEW,
  );
});

test("suppress_buy maps to NO_VERIFIED_CHECKOUT_LINK", () => {
  assert.equal(
    mapSignalsToNoBuyReason({ buyerPathState: "suppress_buy" }),
    NO_BUY_REASONS.NO_VERIFIED_CHECKOUT_LINK,
  );
});

test("gate failure fallback maps correctly", () => {
  assert.equal(
    mapSignalsToNoBuyReason({ gateFailureKind: "search_placeholder" }),
    NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ gateFailureKind: "indirect_discovery" }),
    NO_BUY_REASONS.LINK_IS_SEARCH_OR_DISCOVERY,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ gateFailureKind: "broken_destination" }),
    NO_BUY_REASONS.DESTINATION_UNAVAILABLE,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ gateFailureKind: "missing_browser_truth" }),
    NO_BUY_REASONS.LINK_UNDER_REVIEW,
  );
  assert.equal(
    mapSignalsToNoBuyReason({ gateFailureKind: "unsafe_browser_truth" }),
    NO_BUY_REASONS.LINK_FAILED_SAFETY_CHECK,
  );
});

test("fallback maps to UNKNOWN", () => {
  assert.equal(mapSignalsToNoBuyReason({}), NO_BUY_REASONS.UNKNOWN);
});

test("every NoBuyReason has a non-empty user message", () => {
  for (const reason of Object.values(NO_BUY_REASONS)) {
    const message = getNoBuyUserMessage(reason);
    assert.equal(typeof message, "string");
    assert.ok(message.trim().length > 0);
  }
});

test('messages do not contain "guaranteed", "definitely fits", or "safe to buy"', () => {
  const banned = ["guaranteed", "definitely fits", "safe to buy"];
  for (const reason of Object.values(NO_BUY_REASONS)) {
    const message = getNoBuyUserMessage(reason).toLowerCase();
    for (const term of banned) {
      assert.equal(message.includes(term), false);
    }
  }
});
