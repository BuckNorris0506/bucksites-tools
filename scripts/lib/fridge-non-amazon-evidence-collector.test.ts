import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import { buildReviewPacket } from "./non-amazon-review-packets";
import {
  collectEvidenceForCandidate,
  extractEvidenceFromPageText,
  isAllowedNonAmazonProductCandidateUrl,
  parseManualFallbackCaptures,
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
      source: "unverified_url_guess",
    },
  });
  const packet = buildReviewPacket({
    filter_slug: "da29-00012b",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.notEqual(packet.decision, "PASS");
});

test("guessed AppliancePartsPros slug URL with 404 => FAIL/rejected candidate", async () => {
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-17376a",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-da97-17376a.html",
      source: "unverified_url_guess",
    },
    fetchImpl: async () =>
      ({
        ok: false,
        status: 404,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da97-17376a",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.equal(packet.decision, "FAIL");
});

test("403 fetch + no fallback => UNKNOWN", async () => {
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-15217d",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
    fetchImpl: async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.equal(packet.decision, "UNKNOWN");
});

test("403 fetch + fallback token+buyability+no warning => PASS", async () => {
  const fallbackByUrl = parseManualFallbackCaptures(
    JSON.stringify([
      {
        url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
        captured_at: "2026-04-26T23:00:00.000Z",
        raw_excerpt:
          "Samsung DA97-15217D Refrigerator Ice Maker Assembly OEM Part. Manufacturer's Part Number: DA97-15217D. In Stock. Add to Cart. $123.60",
      },
    ]),
  );
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-15217d",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
    fallbackByUrl,
    fetchImpl: async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.equal(packet.decision, "PASS");
  assert.equal(evidence.evidence_source, "manual_capture");
});

test("403 fetch + fallback missing required signal => not PASS", async () => {
  const fallbackByUrl = parseManualFallbackCaptures(
    JSON.stringify([
      {
        url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
        captured_at: "2026-04-26T23:00:00.000Z",
        raw_excerpt: "Samsung DA97-15217D Refrigerator Ice Maker Assembly OEM Part.",
      },
    ]),
  );
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-15217d",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
    fallbackByUrl,
    fetchImpl: async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.notEqual(packet.decision, "PASS");
});

test("fallback with substitution/discontinued warning => not PASS", async () => {
  const fallbackByUrl = parseManualFallbackCaptures(
    JSON.stringify([
      {
        url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
        captured_at: "2026-04-26T23:00:00.000Z",
        raw_excerpt:
          "DA97-15217D In Stock Add to Cart but this part is discontinued and replaced by DA97-15217E.",
      },
    ]),
  );
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-15217d",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
    fallbackByUrl,
    fetchImpl: async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da97-15217d",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.notEqual(packet.decision, "PASS");
});

test("fetch 404 => FAIL and fallback is ignored", async () => {
  const fallbackByUrl = parseManualFallbackCaptures(
    JSON.stringify([
      {
        url: "https://www.appliancepartspros.com/samsung-da29-00019a.html",
        captured_at: "2026-04-26T23:00:00.000Z",
        raw_excerpt:
          "DA29-00019A In Stock Add to Cart $59.00 (manual excerpt that must be ignored for 404).",
      },
    ]),
  );
  const evidence = await collectEvidenceForCandidate({
    slug: "da29-00019a",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-da29-00019a.html",
      source: "unverified_url_guess",
    },
    fallbackByUrl,
    fetchImpl: async () =>
      ({
        ok: false,
        status: 404,
        text: async () => "",
      }) as unknown as Response,
  });
  const packet = buildReviewPacket({
    filter_slug: "da29-00019a",
    current_cta_status: "no_valid_cta",
    evidence,
  });
  assert.equal(packet.decision, "FAIL");
  assert.equal(evidence.evidence_source, "fetched_page");
});

test("provenance fields appear in collected evidence", async () => {
  const fallbackByUrl = parseManualFallbackCaptures(
    JSON.stringify([
      {
        url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
        captured_at: "2026-04-26T23:00:00.000Z",
        raw_excerpt:
          "Samsung DA97-15217D Refrigerator Ice Maker Assembly OEM Part. In Stock. Add to Cart.",
      },
    ]),
  );
  const evidence = await collectEvidenceForCandidate({
    slug: "da97-15217d",
    candidate: {
      retailer: "AppliancePartsPros",
      retailer_key: "appliancepartspros",
      url: "https://www.appliancepartspros.com/samsung-assy-ice-maker-da97-15217d-ap6261445.html",
      source: "seeded",
    },
    fallbackByUrl,
    fetchImpl: async () =>
      ({
        ok: false,
        status: 403,
        text: async () => "",
      }) as unknown as Response,
  });
  assert.equal(evidence.evidence_source, "manual_capture");
  assert.equal(Boolean(evidence.captured_at), true);
  assert.equal(Boolean(evidence.raw_excerpt), true);
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
