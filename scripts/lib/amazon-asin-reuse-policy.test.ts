import assert from "node:assert/strict";
import test from "node:test";

import { classifyAmazonAsinReusePolicy } from "./amazon-asin-reuse-policy";

test("Option A complete shared-ASIN proof is insert-plan eligible and not mutation-ready", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "EDR3RXD1",
    asin: "B087PDLZL9",
    noSafePdpFound: false,
    exactTokenProof: true,
    sellerControlledTargetTokenProof: true,
    replacementOrCompatibleRelationshipProof: true,
    buyabilityProof: true,
    attributionCanBeLabeled: true,
    asinCollisionEvidenceFileCount: 2,
  });

  assert.equal(result.classification, "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE");
  assert.equal(result.policy_status, "OWNER_APPROVED_INSERT_PLAN_ELIGIBLE");
  assert.equal(result.mutation_ready, false);
});

test("ASIN collision without seller-controlled target-token proof remains blocked/unknown", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "COLLIDE1",
    asin: "B012345678",
    noSafePdpFound: false,
    exactTokenProof: false,
    sellerControlledTargetTokenProof: false,
    replacementOrCompatibleRelationshipProof: true,
    buyabilityProof: true,
    attributionCanBeLabeled: true,
    asinCollisionEvidenceFileCount: 1,
  });

  assert.equal(result.classification, "HUMAN_BROWSER_VERIFICATION_REQUIRED");
  assert.equal(result.policy_status, "BLOCKED");
  assert.equal(result.mutation_ready, false);
});

test("non-colliding exact PDP evidence is owner-review eligible but still not auto-mutation-ready", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "4396508",
    asin: "B00NXPKBQ2",
    noSafePdpFound: false,
    exactTokenProof: true,
    sellerControlledTargetTokenProof: true,
    replacementOrCompatibleRelationshipProof: true,
    buyabilityProof: true,
    attributionCanBeLabeled: true,
    asinCollisionEvidenceFileCount: 0,
  });

  assert.equal(result.classification, "EXACT_PDP_PROVEN_NO_COLLISION");
  assert.equal(result.policy_status, "OWNER_REVIEW_ELIGIBLE");
  assert.equal(result.mutation_ready, false);
});

test("live retailer_links ASIN reuse is insert-plan eligible under Option A when proof is complete", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "EDR4RXD1",
    asin: "B00UB38V2A",
    noSafePdpFound: false,
    exactTokenProof: true,
    sellerControlledTargetTokenProof: true,
    replacementOrCompatibleRelationshipProof: true,
    buyabilityProof: true,
    attributionCanBeLabeled: true,
    asinCollisionEvidenceFileCount: 0,
    liveAsinReuseCount: 1,
  });

  assert.equal(result.classification, "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE");
  assert.equal(result.policy_status, "OWNER_APPROVED_INSERT_PLAN_ELIGIBLE");
  assert.equal(result.mutation_ready, false);
});

test("shared-ASIN reuse remains collision review when Option A proof is incomplete", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "PARTIAL1",
    asin: "B012345678",
    noSafePdpFound: false,
    exactTokenProof: true,
    sellerControlledTargetTokenProof: true,
    replacementOrCompatibleRelationshipProof: "UNKNOWN",
    buyabilityProof: true,
    attributionCanBeLabeled: true,
    asinCollisionEvidenceFileCount: 0,
    liveAsinReuseCount: 1,
  });

  assert.equal(result.classification, "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED");
  assert.equal(result.policy_status, "OWNER_POLICY_REVIEW_REQUIRED");
  assert.equal(result.mutation_ready, false);
});

test("no-safe-PDP evidence remains blocked and not mutation-ready", () => {
  const result = classifyAmazonAsinReusePolicy({
    token: "4396842",
    asin: null,
    noSafePdpFound: true,
    exactTokenProof: false,
    sellerControlledTargetTokenProof: false,
    replacementOrCompatibleRelationshipProof: false,
    buyabilityProof: false,
    attributionCanBeLabeled: false,
    asinCollisionEvidenceFileCount: 0,
  });

  assert.equal(result.classification, "NO_SAFE_PDP_FOUND");
  assert.equal(result.policy_status, "BLOCKED");
  assert.equal(result.mutation_ready, false);
});
