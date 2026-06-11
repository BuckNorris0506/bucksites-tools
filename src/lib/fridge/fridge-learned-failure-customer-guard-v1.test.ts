import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  resetLearnedFailureGuardIndexCacheForTestsV1,
  resolveFridgeCustomerSafetyV1,
} from "@/lib/fridge/fridge-learned-failure-customer-guard-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("samsung-rf18hfenbww BLOCK guard quarantines customer buy surface", () => {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: "samsung-rf18hfenbww",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, true);
  assert.equal(safety.reason, "LEARNED_FAILURE_GUARD_BLOCK");
  assert.equal(safety.evidence_basis, "PROVEN");
  assert.ok(safety.learned_failure_guard_ids.includes("samsung_da29_da97_co_map"));
  assert.match(safety.public_message ?? "", /buying options/i);
});

test("owner review override still takes precedence", () => {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: "lg-lrfxs3106s",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, true);
  assert.equal(safety.reason, "OWNER_REVIEW_OVERRIDE");
});

test("samsung-rf28r7351sr remains non-quarantined when guard passes", () => {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: "samsung-rf28r7351sr",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, false);
});

test("GSWF WARN single_filter_family model stays non-quarantined", () => {
  resetLearnedFailureGuardIndexCacheForTestsV1();
  const safety = resolveFridgeCustomerSafetyV1({
    fridgeModelSlug: "ge-gfe28gmkbb",
    rootDir: ROOT,
  });
  assert.equal(safety.quarantine, false);
  assert.equal(safety.reason, null);
});
