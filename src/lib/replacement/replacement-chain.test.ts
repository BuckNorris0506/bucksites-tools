import test from "node:test";
import assert from "node:assert/strict";
import {
  REPLACEMENT_RELATIONSHIP_TYPES,
  evaluateReplacementChainSafety,
  isValidReplacementChainRecord,
  type ReplacementChainRecord,
} from "./replacement-chain";

function baseSafeInput() {
  return {
    relationshipType: REPLACEMENT_RELATIONSHIP_TYPES.official_supersession as const,
    confidence: "exact" as const,
    hasCtaGateFailure: false,
    buyerPathState: "show_buy",
    wrongPurchaseRisk: null,
    hasExactTokenOrAliasProof: true,
    hasBuyabilityEvidence: true,
  };
}

function validRecord(): ReplacementChainRecord {
  return {
    chainId: "chain-001",
    originalPartNumber: "OLD-123",
    replacementPartNumber: "NEW-456",
    relationshipType: REPLACEMENT_RELATIONSHIP_TYPES.official_supersession,
    confidence: "exact",
    safeToBuyReplacement: true,
    checkedAt: "2026-04-28T13:00:00.000Z",
    provenance: {
      sourceType: "repo_mapping",
      sourceUrl: "https://buckparts.com/filter/new-456",
      evidenceExcerpt: "Direct supersession confirmed in captured evidence.",
      evidenceRef: {
        table: "compatibility_mappings",
        rowCount: 1,
        verified: true,
        note: null,
      },
    },
  };
}

test("official supersession exact + no risk => safe true", () => {
  assert.equal(evaluateReplacementChainSafety(baseSafeInput()), true);
});

test("direct compatible likely + no risk => safe true", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      relationshipType: REPLACEMENT_RELATIONSHIP_TYPES.direct_compatible_replacement,
      confidence: "likely",
    }),
    true,
  );
});

test("recommended model replacement likely + no risk => safe true", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      relationshipType:
        REPLACEMENT_RELATIONSHIP_TYPES.recommended_model_specific_replacement,
      confidence: "likely",
    }),
    true,
  );
});

test("alias_or_same_part_token => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      relationshipType: REPLACEMENT_RELATIONSHIP_TYPES.alias_or_same_part_token,
    }),
    false,
  );
});

test("possible substitution unverified => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      relationshipType:
        REPLACEMENT_RELATIONSHIP_TYPES.possible_substitution_unverified,
    }),
    false,
  );
});

test("discontinued no replacement => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      relationshipType:
        REPLACEMENT_RELATIONSHIP_TYPES.discontinued_no_verified_replacement,
    }),
    false,
  );
});

test("uncertain confidence => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      confidence: "uncertain",
    }),
    false,
  );
});

test("CTA gate failure => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      hasCtaGateFailure: true,
    }),
    false,
  );
});

test("suppress_buy => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      buyerPathState: "suppress_buy",
    }),
    false,
  );
});

test("token mismatch risk => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      wrongPurchaseRisk: "TOKEN_OR_SUFFIX_MISMATCH",
    }),
    false,
  );
});

test("no buyability risk => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      wrongPurchaseRisk: "NO_BUYABILITY_EVIDENCE",
    }),
    false,
  );
});

test("UNKNOWN risk => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      wrongPurchaseRisk: "UNKNOWN",
    }),
    false,
  );
});

test("missing exact token proof false => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      hasExactTokenOrAliasProof: false,
    }),
    false,
  );
});

test("missing buyability false => safe false", () => {
  assert.equal(
    evaluateReplacementChainSafety({
      ...baseSafeInput(),
      hasBuyabilityEvidence: false,
    }),
    false,
  );
});

test("valid record passes", () => {
  assert.equal(isValidReplacementChainRecord(validRecord()), true);
});

test("invalid relationship type fails", () => {
  const record = {
    ...validRecord(),
    relationshipType: "nonexistent_relationship",
  };
  assert.equal(isValidReplacementChainRecord(record), false);
});

test("invalid checkedAt fails", () => {
  const record = {
    ...validRecord(),
    checkedAt: "not-a-date",
  };
  assert.equal(isValidReplacementChainRecord(record), false);
});
