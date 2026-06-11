import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  filterFridgeModelsForCustomerDisplayV1,
  GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1,
  GSWF_FILTER_PAGE_CAUTION_NOTE_V1,
  resolveFridgeFilterPdpCustomerSafetyV1,
  resolveFridgeSearchModelHitDisplayV1,
} from "@/lib/fridge/fridge-filter-pdp-customer-safety-v1";
import { resetLearnedFailureGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";
import { resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1 } from "@/lib/fridge/fridge-single-filter-family-ambiguity-v1";
import { classifyPageState, PAGE_STATES } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function model(slug: string) {
  return { slug, id: slug, model_number: slug };
}

function resetGuardCachesForTestsV1(): void {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  resetSingleFilterFamilyAmbiguityGuardIndexCacheForTestsV1();
}

test("hides BLOCK samsung models from filter PDP compat list", () => {
  resetGuardCachesForTestsV1();
  const { models, hiddenQuarantinedCount } = filterFridgeModelsForCustomerDisplayV1(
    [
      model("samsung-rf18hfenbww"),
      model("samsung-rf28r7351sr"),
      model("samsung-rf22n9781sg"),
    ],
    { rootDir: ROOT },
  );
  assert.equal(hiddenQuarantinedCount, 2);
  assert.deepEqual(
    models.map((m) => m.slug),
    ["samsung-rf28r7351sr"],
  );
});

test("da97-15217d mixed mapping keeps safe models and shows partial caution", () => {
  resetGuardCachesForTestsV1();
  const da97Models = [
    "samsung-rf18hfenbww",
    "samsung-rf263beaesp",
    "samsung-rf22n9781sg",
    "samsung-rf23bb8200ql",
    "samsung-rs25j500dww",
    "samsung-rf24fsedbsr",
    "samsung-rf20a5101sr",
    "samsung-rs25h5000sr",
    "samsung-rf26hfendsr",
    "samsung-rf24fsedsr",
    "samsung-rf28r6201sw",
  ].map(model);

  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "da97-15217d",
    fridgeModels: da97Models,
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });

  assert.equal(safety.hidden_quarantined_model_count, 4);
  assert.equal(safety.display_models_count, 7);
  assert.equal(safety.force_suppress_buy, false);
  assert.match(safety.filter_page_caution_note ?? "", /conflicting part families/i);
});

test("lt1000p all-quarantined mapping suppresses buy even with gated retailer links", () => {
  resetGuardCachesForTestsV1();
  const lt1000Models = [
    "lg-lfxs26973s",
    "lg-lfxc22596s",
    "lg-lmxs28626s",
    "lg-lfcs22520s",
  ].map(model);

  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "lt1000p",
    fridgeModels: lt1000Models,
    gatedRetailerLinkCount: 2,
    rootDir: ROOT,
  });

  assert.equal(safety.display_models_count, 0);
  assert.equal(safety.hidden_quarantined_model_count, lt1000Models.length);
  assert.equal(safety.force_suppress_buy, true);
  assert.equal(safety.prefer_noindex, true);
  assert.match(safety.filter_page_caution_note ?? "", /under compatibility review/i);

  const trust = buildPartPageTrust({
    modelsCount: safety.display_models_count,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "LT1000P",
  });
  trust.buyer_path_state = "suppress_buy";
  assert.equal(trust.buyer_path_state, "suppress_buy");

  const pageState = classifyPageState({
    isIndexable: safety.prefer_noindex ? false : true,
    validCtaCount: 0,
    buyerPathState: "suppress_buy",
    hasDemandSignal: null,
  });
  assert.equal(pageState, PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL);
  assert.equal(getRobotsFromPageState(pageState).index, false);
});

test("lt800p majority-quarantined TIER 0 slug suppresses confident buy", () => {
  resetGuardCachesForTestsV1();
  const blocked = [
    "lg-lfxc22596d",
    "lg-lfxs30796s",
    "lg-lrmvc2306d",
    "lg-lfxs28566b",
    "lg-lfxc22526d",
    "lg-lrfxs2503b",
    "lg-lrfxs3106w",
    "lg-lupxs3186n",
    "lg-lfcc25426s",
    "lg-lfcs23520s",
    "lg-lsxs27366s",
    "lg-lfxs29566s",
  ].map(model);
  const safe = [model("lg-lfxs28596b"), model("lg-lfxc22596b"), model("lg-lfcc23596s")];

  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "lt800p",
    fridgeModels: [...blocked, ...safe],
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });

  assert.equal(safety.hidden_quarantined_model_count, 12);
  assert.equal(safety.display_models_count, 3);
  assert.equal(safety.force_suppress_buy, true);
  assert.equal(safety.prefer_noindex, false);
});

test("mixed BLOCK/safe filter PDP downgrades to caution buy, not confident buy", () => {
  resetGuardCachesForTestsV1();
  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "da97-15217d",
    fridgeModels: [model("samsung-rf18hfenbww"), model("samsung-rf28r6201sw")],
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });

  const trust = buildPartPageTrust({
    modelsCount: safety.display_models_count,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "DA97-15217D",
  });
  if (!safety.force_suppress_buy && safety.hidden_quarantined_model_count > 0) {
    trust.buyer_path_state = "show_caution_buy";
  }
  assert.equal(trust.buyer_path_state, "show_caution_buy");
  assert.notEqual(trust.buyer_path_state, "show_confident_buy");
});

test("search BLOCK fridge model suppresses typical replacement line", () => {
  resetGuardCachesForTestsV1();
  const blocked = resolveFridgeSearchModelHitDisplayV1({
    fridgeModelSlug: "samsung-rf18hfenbww",
    rootDir: ROOT,
  });
  assert.equal(blocked.show_typical_replacement, false);
  assert.match(blocked.status_line ?? "", /Compatibility under review/i);

  const safe = resolveFridgeSearchModelHitDisplayV1({
    fridgeModelSlug: "samsung-rf28r7351sr",
    rootDir: ROOT,
  });
  assert.equal(safe.show_typical_replacement, true);
  assert.equal(safe.status_line, null);
});

test("filter with only non-quarantined models passes through unchanged", () => {
  resetGuardCachesForTestsV1();
  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "mwf",
    fridgeModels: [model("ge-gss25gshss"), model("ge-pss26sgpass")],
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });

  assert.equal(safety.hidden_quarantined_model_count, 0);
  assert.equal(safety.display_models_count, 2);
  assert.equal(safety.filter_page_caution_note, null);
  assert.equal(safety.force_suppress_buy, false);
  assert.equal(safety.evidence_basis, "UNKNOWN");
});

test("GSWF all-WARN ambiguity keeps models visible with caution note and show_caution_buy", () => {
  resetGuardCachesForTestsV1();
  const gswfModels = [
    "ge-cwe23sshww",
    "ge-gfe24jgkww",
    "ge-gfe28gmkbb",
    "ge-gfe28gskes",
    "ge-gne25jmkww",
    "ge-gte18gsnrss",
    "ge-pfe28kmkww",
    "ge-pvd28bymfs",
  ].map(model);

  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "gswf",
    fridgeModels: gswfModels,
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });

  assert.equal(safety.display_models_count, gswfModels.length);
  assert.equal(safety.hidden_quarantined_model_count, 0);
  assert.equal(safety.warn_ambiguous_model_count, gswfModels.length);
  assert.equal(safety.force_suppress_buy, false);
  assert.equal(safety.prefer_caution_buy, true);
  assert.equal(safety.prefer_noindex, false);
  assert.match(safety.filter_page_caution_note ?? "", /reviewing GSWF compatibility/i);

  const trust = buildPartPageTrust({
    modelsCount: safety.display_models_count,
    retailerLinks: [{ id: "x", retailer_name: "A", affiliate_url: "https://example.com" }],
    oemPartNumber: "GSWF",
  });
  if (safety.prefer_caution_buy) {
    trust.buyer_path_state = "show_caution_buy";
  }
  assert.equal(trust.buyer_path_state, "show_caution_buy");
  assert.notEqual(trust.buyer_path_state, "show_confident_buy");
});

test("GSWF2 adds verify-housing note without data mutation", () => {
  resetGuardCachesForTestsV1();
  const safety = resolveFridgeFilterPdpCustomerSafetyV1({
    filterSlug: "gswf2",
    fridgeModels: [model("ge-gye22gskww")],
    gatedRetailerLinkCount: 1,
    rootDir: ROOT,
  });
  assert.equal(safety.display_models_count, 1);
  assert.ok((safety.filter_page_caution_note ?? "").includes(GSWF_FILTER_PAGE_CAUTION_NOTE_V1));
  assert.ok((safety.filter_page_caution_note ?? "").includes(GSWF2_FILTER_PAGE_VERIFY_HOUSING_NOTE_V1));
});

test("search WARN-ambiguous GSWF model suppresses typical replacement", () => {
  resetGuardCachesForTestsV1();
  const hit = resolveFridgeSearchModelHitDisplayV1({
    fridgeModelSlug: "ge-gfe28gmkbb",
    rootDir: ROOT,
  });
  assert.equal(hit.show_typical_replacement, false);
  assert.match(hit.status_line ?? "", /Compatibility under review/i);
});

test("search PASS single-family model still shows typical replacement", () => {
  resetGuardCachesForTestsV1();
  const hit = resolveFridgeSearchModelHitDisplayV1({
    fridgeModelSlug: "samsung-rf28r7351sr",
    rootDir: ROOT,
  });
  assert.equal(hit.show_typical_replacement, true);
  assert.equal(hit.status_line, null);
});
