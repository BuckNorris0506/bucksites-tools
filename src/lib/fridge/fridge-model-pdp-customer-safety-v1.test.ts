import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CONFUSION_FAMILY_WARN_MODEL_PAGE_NOTE_V1,
  DISPUTED_ANCHOR_MODEL_PAGE_NOTE_V1,
  FRIGIDAIRE_PROVEN_ANCHOR_SIBLING_DRIFT_GUARD_ID_V1,
  resolveFridgeModelPdpCustomerSafetyV1,
} from "@/lib/fridge/fridge-model-pdp-customer-safety-v1";
import { resetLearnedFailureGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";
import { resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-single-filter-family-ambiguity-v1";
import { buildModelPageTrust, buildPartPageTrust } from "@/lib/trust/part-trust";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { classifyPageState, PAGE_STATES } from "@/lib/page-state/page-state";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function resetCaches(): void {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
}

test("disputed anchor frigidaire-fghb2868pf prefers caution buy and noindex", () => {
  resetCaches();
  const safety = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "frigidaire-fghb2868pf",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, false);
  assert.equal(safety.prefer_caution_buy, true);
  assert.equal(safety.prefer_noindex, true);
  assert.equal(safety.disputed_proven_anchor, true);
  assert.ok(
    safety.confusion_family_warn_guard_ids.includes(
      FRIGIDAIRE_PROVEN_ANCHOR_SIBLING_DRIFT_GUARD_ID_V1,
    ),
  );
  assert.equal(safety.model_page_caution_note, DISPUTED_ANCHOR_MODEL_PAGE_NOTE_V1);

  const pageState = classifyPageState({
    isIndexable: safety.prefer_noindex ? false : true,
    validCtaCount: 1,
    buyerPathState: null,
    hasDemandSignal: null,
  });
  assert.equal(pageState, PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL);
  assert.equal(getRobotsFromPageState(pageState).index, false);
});

test("prefix contamination WARN frigidaire-ffhn2740tw cautions buy without noindex", () => {
  resetCaches();
  const safety = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "frigidaire-ffhn2740tw",
    rootDir: ROOT,
  });
  assert.equal(safety.prefer_caution_buy, true);
  assert.equal(safety.prefer_noindex, false);
  assert.equal(safety.disputed_proven_anchor, false);
  assert.equal(safety.model_page_caution_note, CONFUSION_FAMILY_WARN_MODEL_PAGE_NOTE_V1);

  const trust = buildPartPageTrust({
    modelsCount: 1,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "FPPWFU01",
  });
  if (safety.prefer_caution_buy) {
    trust.buyer_path_state = "show_caution_buy";
  }
  assert.equal(trust.buyer_path_state, "show_caution_buy");
});

test("BLOCK samsung model remains fully quarantined", () => {
  resetCaches();
  const safety = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "samsung-rf18hfenbww",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, true);
  assert.equal(safety.prefer_caution_buy, false);
  assert.equal(safety.prefer_noindex, true);
});

test("PASS single-family samsung-rf28r7351sr unchanged", () => {
  resetCaches();
  const safety = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "samsung-rf28r7351sr",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, false);
  assert.equal(safety.prefer_caution_buy, false);
  assert.equal(safety.model_page_caution_note, null);

  const trust = buildPartPageTrust({
    modelsCount: 1,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "HAF-QIN",
  });
  assert.equal(trust.buyer_path_state, "show_confident_buy");
});

test("multi-filter no-recommended model page trust still suppresses buy", () => {
  resetCaches();
  const safety = resolveFridgeModelPdpCustomerSafetyV1({
    fridgeModelSlug: "samsung-rf28r7351sr",
    rootDir: ROOT,
  });
  assert.equal(safety.prefer_caution_buy, false);

  const trust = buildModelPageTrust({
    totalFits: 3,
    hasRecommendedFit: false,
    primaryIsRecommended: false,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "DA29-00020B",
    modelNumber: "RF28R7351SR",
  });
  assert.equal(trust.buyer_path_state, "suppress_buy");
});
