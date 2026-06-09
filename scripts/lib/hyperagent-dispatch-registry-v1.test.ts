import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildHyperAgentDispatchRegistryV1,
  hyperAgentDedupKeyV1,
  hyperAgentQueueItemIdV1,
  hyperAgentSlugBatchFingerprintV1,
  HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1,
  isHyperAgentRedispatchBlockedV1,
  type HyperAgentDispatchEventV1,
} from "./hyperagent-dispatch-registry-v1";
import { EDR4RXD1_FAMILY_KEY_V1 } from "./edr4rxd1-owner-review-packet-v1";
import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
} from "./bad-mapping-correction-batch-runner-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/hyperagent-dispatch-registry-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

const SAMSUNG_SLUG_BATCH = JSON.parse(
  readFileSync(`${ROOT}/${BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1}`, "utf8"),
).recommended_first_batch_slugs as string[];

const SAMSUNG_SCOPE_KEY = `bad_mapping:${SAMSUNG_SLUG_BATCH.slice(0, 3).join(",")}`;
const SAMSUNG_DEDUP_KEY = hyperAgentDedupKeyV1("BAD_MAPPING_RESEARCH", SAMSUNG_SCOPE_KEY);
const SAMSUNG_FINGERPRINT = hyperAgentSlugBatchFingerprintV1(SAMSUNG_SLUG_BATCH);

test("contract and read-only flags", () => {
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [],
  });
  assert.equal(registry.contract, HYPERAGENT_DISPATCH_REGISTRY_CONTRACT_V1);
  assert.equal(registry.read_only, true);
  assert.equal(registry.data_mutation, false);
  assert.equal(registry.mutation_authorized, false);
  assert.ok(registry.generated_at);
  assert.ok(Array.isArray(registry.entries));
  assert.ok(Array.isArray(registry.frozen_family_keys));
  assert.ok(Array.isArray(registry.owner_review_ready_family_keys));
  assert.ok(Array.isArray(registry.redispatch_blocked_dedup_keys));
  assert.equal(registry.operator_events_present, false);
  assert.equal(registry.operator_events_rel_path, "data/fridge/batch-production/hyperagent/hyperagent-dispatch-events-v1.json");
});

test("FROZEN entries include eptwfu01 and fppwfu01", () => {
  const registry = buildHyperAgentDispatchRegistryV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(registry.frozen_family_keys.includes("filter::frigidaire::eptwfu01"));
  assert.ok(registry.frozen_family_keys.includes("filter::frigidaire::fppwfu01"));

  const frozenEntries = registry.entries.filter((entry) => entry.status === "FROZEN");
  assert.equal(frozenEntries.length, 2);
  for (const entry of frozenEntries) {
    assert.equal(entry.block_redispatch, true);
    assert.equal(entry.source, "generated");
    assert.match(entry.blocked_reason, /freeze_reason:/);
  }
});

test("OWNER_REVIEW_READY includes edr4rxd1 when owner packet and cursor validation exist", () => {
  const registry = buildHyperAgentDispatchRegistryV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(registry.owner_review_ready_family_keys.includes(EDR4RXD1_FAMILY_KEY_V1));

  const edr4 = registry.entries.find(
    (entry) =>
      entry.status === "OWNER_REVIEW_READY" && entry.family_key === EDR4RXD1_FAMILY_KEY_V1,
  );
  assert.ok(edr4);
  assert.equal(edr4.block_redispatch, true);
  assert.ok(edr4.artifact_rel_paths.some((p) => p.includes("edr4rxd1-owner-review-packet")));
  assert.ok(edr4.artifact_rel_paths.some((p) => p.includes("edr4rxd1-evidence-batch-cursor-validation")));
});

test("empty operator overlay does not block Samsung batch", () => {
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [],
  });
  const block = isHyperAgentRedispatchBlockedV1({
    registry,
    dedup_key: SAMSUNG_DEDUP_KEY,
    slug_batch_fingerprint: SAMSUNG_FINGERPRINT,
    family_key: null,
    mission_type: "BAD_MAPPING_RESEARCH",
  });
  assert.equal(block.blocked, false);
});

test("operator DISPATCHED event blocks Samsung batch by dedup_key", () => {
  const dispatched: HyperAgentDispatchEventV1 = {
    event_id: "test-dispatch-samsung-batch",
    dedup_key: SAMSUNG_DEDUP_KEY,
    queue_item_id: hyperAgentQueueItemIdV1("BAD_MAPPING_RESEARCH", SAMSUNG_SCOPE_KEY),
    mission_type: "BAD_MAPPING_RESEARCH",
    scope_key: SAMSUNG_SCOPE_KEY,
    slug_batch_fingerprint: SAMSUNG_FINGERPRINT,
    dispatched_at: "2026-06-08T12:00:00.000Z",
  };
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [dispatched],
  });

  const dispatchedEntry = registry.entries.find((entry) => entry.status === "DISPATCHED");
  assert.ok(dispatchedEntry);
  assert.equal(dispatchedEntry.block_redispatch, true);
  assert.equal(dispatchedEntry.source, "operator");

  const block = isHyperAgentRedispatchBlockedV1({
    registry,
    dedup_key: SAMSUNG_DEDUP_KEY,
    slug_batch_fingerprint: SAMSUNG_FINGERPRINT,
    family_key: null,
    mission_type: "BAD_MAPPING_RESEARCH",
  });
  assert.equal(block.blocked, true);
  assert.ok(block.reasons.some((r) => r.includes("registry_redispatch_blocked_dedup_key")));
});

test("slug_batch_fingerprint blocks same slug cohort when scope text changes", () => {
  const altScopeKey = `bad_mapping:${SAMSUNG_SLUG_BATCH.slice(0, 2).join(",")}`;
  const altDedupKey = hyperAgentDedupKeyV1("BAD_MAPPING_RESEARCH", altScopeKey);
  assert.notEqual(altDedupKey, SAMSUNG_DEDUP_KEY);

  const dispatched: HyperAgentDispatchEventV1 = {
    event_id: "test-dispatch-fingerprint-only",
    dedup_key: SAMSUNG_DEDUP_KEY,
    queue_item_id: hyperAgentQueueItemIdV1("BAD_MAPPING_RESEARCH", SAMSUNG_SCOPE_KEY),
    mission_type: "BAD_MAPPING_RESEARCH",
    scope_key: SAMSUNG_SCOPE_KEY,
    slug_batch_fingerprint: SAMSUNG_FINGERPRINT,
    dispatched_at: "2026-06-08T12:00:00.000Z",
  };
  const registry = buildHyperAgentDispatchRegistryV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [dispatched],
  });

  const block = isHyperAgentRedispatchBlockedV1({
    registry,
    dedup_key: altDedupKey,
    slug_batch_fingerprint: SAMSUNG_FINGERPRINT,
    family_key: null,
    mission_type: "BAD_MAPPING_RESEARCH",
  });
  assert.equal(block.blocked, true);
  assert.ok(block.reasons.some((r) => r.includes("registry_redispatch_blocked_slug_fingerprint")));
});

test("read-only guard blocks writes to compat/evidence/Supabase/page/retailer/HQ handoff", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
  }
});
