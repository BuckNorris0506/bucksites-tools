import assert from "node:assert/strict";
import test from "node:test";

import {
  AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1,
  buildAmazonOwnerScreenshotEvidenceV1,
  computeScreenshotEvidenceMutationReadyV1,
  deriveOwnerVerdictFromScreenshotFactsV1,
  type AmazonOwnerScreenshotFactsV1,
  validateAmazonOwnerScreenshotEvidenceV1,
} from "./amazon-owner-screenshot-evidence-v1";

/** Test-only fixture from owner chat facts — screenshot not committed to repo. */
export const W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1: AmazonOwnerScreenshotFactsV1 = {
  token: "W10413645A",
  filter_slug: "w10413645a",
  filter_id: "12354159-8882-4b95-9aab-2c096f55407f",
  generated_at: "2026-05-15T22:00:00.000Z",
  screenshot_sources: [
    {
      label: "owner_chat_screenshot_w10413645a_pdp",
      path: null,
      committed_to_repo: false,
      captured_at_iso: null,
    },
  ],
  page_kind: "product_detail_page",
  token_visible_in_pdp_title: true,
  token_visible_elsewhere_on_page: false,
  seller_controlled_pdp_identity: true,
  buy_path_visible: true,
  stock_status: "in_stock",
  price_visible_usd: 33.99,
  sold_by: "LIMERDU",
  fulfilled_by: "Amazon",
  brand_visible: "Yanhour",
  oem_or_aftermarket: "compatible_aftermarket",
  relationship_notes: "Compatible replacement; not OEM Whirlpool.",
  asin: null,
  canonical_url: null,
  seller_title_visible: "Title includes exact token W10413645A (owner screenshot observation)",
};

test("validateAmazonOwnerScreenshotEvidenceV1 accepts built packet", () => {
  const doc = buildAmazonOwnerScreenshotEvidenceV1(W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1);
  const v = validateAmazonOwnerScreenshotEvidenceV1(doc);
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(v.doc.report_name, AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1);
    assert.equal(v.doc.mutation_ready, false);
  }
});

test("W10413645A classifies as compatible aftermarket direct buyable, not OEM", () => {
  const doc = buildAmazonOwnerScreenshotEvidenceV1(W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1);
  assert.equal(
    deriveOwnerVerdictFromScreenshotFactsV1(W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1),
    "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET",
  );
  assert.equal(doc.owner_verdict, "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET");
  assert.equal(doc.product_attribution, "aftermarket_compatible");
  assert.match(doc.browser_evidence.oem_or_aftermarket, /compatible aftermarket/i);
  assert.doesNotMatch(doc.browser_evidence.oem_or_aftermarket, /OEM Whirlpool/i);
  assert.equal(doc.browser_evidence.browser_verdict, "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE");
  assert.equal(doc.page_observation.token_visible_in_pdp_title, true);
  assert.equal(doc.page_observation.page_kind, "product_detail_page");
  assert.equal(doc.buyability_observation.buy_path_visible, true);
  assert.ok(doc.notes.some((n) => /do not classify or market as OEM/i.test(n)));
});

test("W10413645A mutation_ready stays false and checklist notes missing ASIN", () => {
  const doc = buildAmazonOwnerScreenshotEvidenceV1(W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1);
  const m = computeScreenshotEvidenceMutationReadyV1(W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1);
  assert.equal(m.mutation_ready, false);
  assert.equal(doc.mutation_ready, false);
  assert.equal(doc.asin_reuse_policy_preview.mutation_ready, false);
  assert.equal(doc.all_safety_conditions_for_review_met, false);
  assert.ok(doc.do_not_publish_reason);
  assert.equal(doc.asin_reuse_policy_preview.classification, "UNKNOWN");
});

test("W10413645A with ASIN still does not set mutation_ready true", () => {
  const withAsin = buildAmazonOwnerScreenshotEvidenceV1({
    ...W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1,
    asin: "B00AAAAAA1",
    canonical_url: "https://www.amazon.com/dp/B00AAAAAA1",
    screenshot_sources: [
      {
        label: "repo_fixture",
        path: "data/evidence/screenshots/w10413645a-fixture.png",
        committed_to_repo: true,
      },
    ],
  });
  assert.equal(withAsin.mutation_ready, false);
  assert.equal(withAsin.asin, "B00AAAAAA1");
  assert.notEqual(withAsin.product_attribution, "oem_official");
});

test("oem_or_aftermarket oem_official yields OEM verdict only when facts say OEM", () => {
  const oemFacts: AmazonOwnerScreenshotFactsV1 = {
    ...W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1,
    oem_or_aftermarket: "oem_official",
    brand_visible: "Whirlpool",
    relationship_notes: "OEM",
  };
  assert.equal(deriveOwnerVerdictFromScreenshotFactsV1(oemFacts), "DIRECT_BUYABLE_EXACT_TOKEN_OEM");
  const doc = buildAmazonOwnerScreenshotEvidenceV1(oemFacts);
  assert.equal(doc.browser_evidence.browser_verdict, "PASS_OEM_DIRECT_BUYABLE");
  assert.equal(doc.product_attribution, "oem_official");
});

test("search page facts do not claim direct buyable PDP", () => {
  const serp: AmazonOwnerScreenshotFactsV1 = {
    ...W10413645A_OWNER_SCREENSHOT_FACTS_FIXTURE_V1,
    page_kind: "search_results_page",
  };
  assert.equal(deriveOwnerVerdictFromScreenshotFactsV1(serp), "SEARCH_PAGE_ONLY");
  const doc = buildAmazonOwnerScreenshotEvidenceV1(serp);
  assert.equal(doc.browser_evidence.browser_verdict, "SEARCH_RESULTS_ONLY");
});
