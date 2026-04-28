import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_STATES, classifyPageState } from "./page-state";

test("indexable + valid CTA -> INDEXABLE_BUY_READY", () => {
  const state = classifyPageState({
    isIndexable: true,
    validCtaCount: 2,
  });
  assert.equal(state, PAGE_STATES.INDEXABLE_BUY_READY);
});

test("indexable + suppress_buy + no CTA -> INDEXABLE_BUY_SUPPRESSED_TRUST", () => {
  const state = classifyPageState({
    isIndexable: true,
    validCtaCount: 0,
    buyerPathState: "suppress_buy",
  });
  assert.equal(state, PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST);
});

test("indexable + no CTA + no suppress -> INDEXABLE_INFO_ONLY", () => {
  const state = classifyPageState({
    isIndexable: true,
    validCtaCount: 0,
    buyerPathState: "show_buy",
  });
  assert.equal(state, PAGE_STATES.INDEXABLE_INFO_ONLY);
});

test("non-indexable + demand -> SITEMAP_EXCLUDED_DEMAND", () => {
  const state = classifyPageState({
    isIndexable: false,
    validCtaCount: 0,
    hasDemandSignal: true,
  });
  assert.equal(state, PAGE_STATES.SITEMAP_EXCLUDED_DEMAND);
});

test("non-indexable + no demand -> SITEMAP_EXCLUDED_LOW_SIGNAL", () => {
  const state = classifyPageState({
    isIndexable: false,
    validCtaCount: 0,
    hasDemandSignal: false,
  });
  assert.equal(state, PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL);
});

test("missing indexability -> UNKNOWN", () => {
  const state = classifyPageState({
    isIndexable: null,
    validCtaCount: 1,
    hasDemandSignal: true,
  });
  assert.equal(state, PAGE_STATES.UNKNOWN);
});

test("null validCtaCount does not become buy-ready", () => {
  const state = classifyPageState({
    isIndexable: true,
    validCtaCount: null,
    buyerPathState: "show_buy",
  });
  assert.equal(state, PAGE_STATES.INDEXABLE_INFO_ONLY);
});
