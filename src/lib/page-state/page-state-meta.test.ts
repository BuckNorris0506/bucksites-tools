import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_STATES } from "./page-state";
import { getRobotsFromPageState } from "./page-state-meta";

test("indexable states return index true, follow true", () => {
  const states = [
    PAGE_STATES.INDEXABLE_BUY_READY,
    PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST,
    PAGE_STATES.INDEXABLE_INFO_ONLY,
  ];
  for (const state of states) {
    assert.deepEqual(getRobotsFromPageState(state), { index: true, follow: true });
  }
});

test("non-indexable and unknown states return index false, follow true", () => {
  const states = [
    PAGE_STATES.SITEMAP_EXCLUDED_DEMAND,
    PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL,
    PAGE_STATES.UNKNOWN,
  ];
  for (const state of states) {
    assert.deepEqual(getRobotsFromPageState(state), { index: false, follow: true });
  }
});
