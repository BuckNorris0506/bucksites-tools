import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import { buildReviewPacket } from "./non-amazon-review-packets";
import {
  collectEvidenceForCandidate,
  extractEvidenceFromPageText,
  isAllowedNonAmazonProductCandidateUrl,
} from "./fridge-non-amazon-evidence-collector";

test("rejects Amazon/search/category URLs", () => {
  assert.equal(isAllowedNonAmazonProductCandidateUrl("https://www.amazon.com/dp/B000TEST"), false);
  assert.equal(
    isAllowedNonAmazonProductCandidateUrl("https://www.repairclinic.com/Search?SearchTerm=DA97-15217D"),
    false,
  );
  assert.equal(
    isAllowedNonAmazonProductCandidateUrl("https://www.example.com/category/refrigerator-filters"),
    false,
  );
});

test("detects exact token present and absent", () => {
  const present = extractEvidenceFromPageText({
    slug: "da97-15217d",
    retailer: "Example",
    retailer_key: "example",
    url: "https://example.com/pdp",
    pageText: "Manufacturer Part Number: DA97-15217D Genuine OEM",
  });
  assert.equal(present.has_exact_token_or_alias_proof, true);

  const absent = extractEvidenceFromPageText({
    slug: "da97-15217d",
    retailer: "Example",
    retailer_key: "example",
    url: "https://example.com/pdp",
    pageText: "Manufacturer Part Number: DA97-15217B Genuine OEM",
  });
  assert.equal(absent.has_exact_token_or_alias_proof, false);
});

test("detects buyability evidence", () => {
  const evidence = extractEvidenceFromPageText({
    slug: "da97-15217d",
    retailer: "Example",
    retailer_key: "example",
    url: "https://example.com/pdp",
    pageText: "In Stock. Add to Cart. $123.60",
  });
  assert.equal(evidence.has_buyability_evidence, true);
});

test("detects substitution/discontinued warning", () => {
  const evidence = extractEvidenceFromPageText({
    slug: "da97-15217d",
    retailer: "Example",
    retailer_key: "example",
    url: "https://example.com/pdp",
    pageText: "This part is discontinued and replaced by DA97-15217E.",
  });
  assert.equal(evidence.substitution_or_discontinued_warning_present, "yes");
});

test("PASS only when token + buyability + no substitution warning", () => {
  const passEvidence = extractEvidenceFromPageText({
    slug: "da97-15217d",
    retailer: "Example",
    retailer_key: "example",
    url: "https://example.com/pdp",
    pageText: "Genuine OEM DA97-15217D In Stock Add to Cart $123.60",
  });
  const passPacket = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence: passEvidence,
  });
  assert.equal(passPacket.decision, "PASS");

  const failEvidence = {
    ...passEvidence,
    substitution_or_discontinued_warning_present: "yes" as const,
  };
  const failPacket = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence: failEvidence,
  });
  assert.notEqual(failPacket.decision, "PASS");
});

test("da29-00012b snippet-only evidence does not become PASS", async () => {
  const evidence = await collectEvidenceForCandidate({
    slug: "da29-00012b",
    candidate: {
      retailer: "AllFilters",
      retailer_key: "allfilters",
      url: "https://www.allfilters.com/search?query=DA29-00012B",
      source: "heuristic",
    },
  });
  const packet = buildReviewPacket({
    filter_slug: "da29-00012b",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.notEqual(packet.decision, "PASS");
});

test("collector has no write side effects", () => {
  const original = fs.writeFileSync;
  let writeCalled = false;
  const fakeWrite: typeof fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
    writeCalled = true;
    return original(...args);
  }) as typeof fs.writeFileSync;
  fs.writeFileSync = fakeWrite;
  try {
    const evidence = extractEvidenceFromPageText({
      slug: "da97-15217d",
      retailer: "Example",
      retailer_key: "example",
      url: "https://example.com/pdp",
      pageText: "Genuine OEM DA97-15217D In Stock Add to Cart $123.60",
    });
    assert.equal(evidence.has_exact_token_or_alias_proof, true);
    assert.equal(writeCalled, false);
  } finally {
    fs.writeFileSync = original;
  }
});
