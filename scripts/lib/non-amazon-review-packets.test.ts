import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  buildReviewPacket,
  DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES,
  evaluateCandidateEvidence,
  isNonAmazonPdpUrl,
} from "./non-amazon-review-packets";

test("da97-08006b evaluates to PASS", () => {
  const evidence = DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-08006b"];
  const evaluated = evaluateCandidateEvidence(evidence);
  assert.equal(evaluated.decision, "PASS");
});

test("da97-15217d evaluates to PASS", () => {
  const evidence = DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-15217d"];
  const evaluated = evaluateCandidateEvidence(evidence);
  assert.equal(evaluated.decision, "PASS");
});

test("da29-00012b does not evaluate to PASS", () => {
  const evidence = DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da29-00012b"];
  const evaluated = evaluateCandidateEvidence(evidence);
  assert.notEqual(evaluated.decision, "PASS");
});

test("search/category URL is rejected", () => {
  assert.equal(
    isNonAmazonPdpUrl("https://www.repairclinic.com/Search?SearchTerm=DA97-15217D"),
    false,
  );
  const evidence = {
    ...DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-15217d"],
    pdp_url: "https://www.repairclinic.com/Search?SearchTerm=DA97-15217D",
  };
  const evaluated = evaluateCandidateEvidence(evidence);
  assert.equal(evaluated.decision, "FAIL");
});

test("substitution/discontinued warning is rejected", () => {
  const evidence = {
    ...DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-15217d"],
    substitution_or_discontinued_warning_present: "yes" as const,
  };
  const evaluated = evaluateCandidateEvidence(evidence);
  assert.equal(evaluated.decision, "FAIL");
});

test("packet output includes all required 12 fields", () => {
  const packet = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "has_valid_cta (1)",
    evidence: DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-15217d"],
  });
  const keys = Object.keys(packet).sort();
  assert.deepEqual(keys, [
    "buyability_evidence",
    "current_cta_status",
    "decision",
    "exact_token_or_alias_proof",
    "family_gap_source",
    "filter_slug",
    "part_label",
    "pdp_url",
    "recommended_next_action",
    "retailer",
    "risk_label",
    "substitution_or_discontinued_warning_present",
  ]);
});

test("packet generation helpers have no write side effects", () => {
  const original = fs.writeFileSync;
  let writeCalled = false;
  const fakeWrite: typeof fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
    writeCalled = true;
    return original(...args);
  }) as typeof fs.writeFileSync;
  fs.writeFileSync = fakeWrite;
  try {
    const packet = buildReviewPacket({
      filter_slug: "da97-08006b",
      current_cta_status: "has_valid_cta (1)",
      evidence: DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES["da97-08006b"],
    });
    assert.equal(packet.decision, "PASS");
    assert.equal(writeCalled, false);
  } finally {
    fs.writeFileSync = original;
  }
});
