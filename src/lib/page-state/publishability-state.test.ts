import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_STATES } from "./page-state";
import {
  PUBLISHABILITY_STATES,
  classifyPublishabilityState,
} from "./publishability-state";

test("buy ready maps to PUBLISHABLE_BUY_READY", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_BUY_READY,
  });
  assert.equal(state, PUBLISHABILITY_STATES.PUBLISHABLE_BUY_READY);
});

test("trust suppressed maps to PUBLISHABLE_TRUST_GATED", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST,
  });
  assert.equal(state, PUBLISHABILITY_STATES.PUBLISHABLE_TRUST_GATED);
});

test("indexable info maps to PUBLISHABLE_INFO_READY by default", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_INFO_ONLY,
  });
  assert.equal(state, PUBLISHABILITY_STATES.PUBLISHABLE_INFO_READY);
});

test("indexable info with isInfoPage false maps to NEEDS_IMPROVEMENT", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_INFO_ONLY,
    isInfoPage: false,
  });
  assert.equal(state, PUBLISHABILITY_STATES.NEEDS_IMPROVEMENT);
});

test("sitemap excluded demand maps to NOINDEX_DEMAND_HOLD", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.SITEMAP_EXCLUDED_DEMAND,
  });
  assert.equal(state, PUBLISHABILITY_STATES.NOINDEX_DEMAND_HOLD);
});

test("sitemap excluded low signal maps to NOINDEX_LOW_SIGNAL", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL,
  });
  assert.equal(state, PUBLISHABILITY_STATES.NOINDEX_LOW_SIGNAL);
});

test("blocked/retired overrides all", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_BUY_READY,
    hasQualityIssue: true,
    isBlockedOrRetired: true,
  });
  assert.equal(state, PUBLISHABILITY_STATES.BLOCKED_OR_RETIRED);
});

test("quality issue overrides normal publishable states but not blocked/retired", () => {
  const state = classifyPublishabilityState({
    pageState: PAGE_STATES.INDEXABLE_BUY_READY,
    hasQualityIssue: true,
    isBlockedOrRetired: false,
  });
  assert.equal(state, PUBLISHABILITY_STATES.NEEDS_IMPROVEMENT);
});

test("missing pageState maps to UNKNOWN", () => {
  const state = classifyPublishabilityState({
    pageState: null,
  });
  assert.equal(state, PUBLISHABILITY_STATES.UNKNOWN);
});
