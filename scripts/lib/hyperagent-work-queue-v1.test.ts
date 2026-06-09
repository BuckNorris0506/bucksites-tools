import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  buildHyperAgentWorkQueueV1,
  HYPERAGENT_WORK_QUEUE_CONTRACT_V1,
} from "./hyperagent-work-queue-v1";
import { EDR4RXD1_FAMILY_KEY_V1, EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1 } from "./edr4rxd1-owner-review-packet-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/hyperagent-work-queue-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

test("contract and read-only flags", () => {
  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(queue.contract, HYPERAGENT_WORK_QUEUE_CONTRACT_V1);
  assert.equal(queue.read_only, true);
  assert.equal(queue.data_mutation, false);
  assert.equal(queue.mutation_authorized, false);
  assert.ok(queue.generated_at);
  assert.ok(Array.isArray(queue.exact_repo_paths_read));
  assert.ok(queue.proven_facts.length > 0);
  assert.ok(queue.unknown_facts.length > 0);
});

test("frozen families appear in blocked_items", () => {
  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  const frozenBlocked = queue.blocked_items.filter(
    (item) =>
      item.family_key === "filter::frigidaire::eptwfu01" ||
      item.family_key === "filter::frigidaire::fppwfu01",
  );
  assert.ok(
    frozenBlocked.length > 0 || queue.proven_facts.some((f) => f.includes("frozen_family_keys=")),
    "expected frozen family blockers",
  );
  for (const item of frozenBlocked) {
    assert.equal(item.eligible_now, false);
    assert.ok(item.blocked_reasons.some((r) => r.includes("frozen") || r.includes("freeze")));
  }
});

test("reconciliation-blocked wf2cb is not eligible for full-family dispatch", () => {
  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  const wf2cb = queue.items.find((item) => item.family_key === "filter::frigidaire::wf2cb");
  assert.ok(wf2cb, "expected wf2cb queue item from control graph");
  assert.equal(wf2cb.mission_type, "BOUNDED_EVIDENCE_SLICE");
  assert.equal(wf2cb.recommended_action_scope, "BOUNDED_RESEARCH_ONLY");
  assert.ok(wf2cb.slug_batch.length > 0);
  assert.match(wf2cb.title, /not full-family scaling/i);
});

test("EDR4RXD1 is owner-review-ready and excluded from next_eligible_item", () => {
  assert.ok(existsSync(`${ROOT}/${EDR4RXD1_OWNER_REVIEW_PACKET_JSON_REL_V1}`));

  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  const edr4Ready = queue.owner_review_ready_items.find(
    (item) => item.family_key === EDR4RXD1_FAMILY_KEY_V1,
  );
  assert.ok(edr4Ready, "EDR4RXD1 must be owner_review_ready when owner packet exists");
  assert.equal(edr4Ready.eligible_now, false);
  assert.equal(edr4Ready.hyperagent_dispatch_authorized, false);
  assert.ok(edr4Ready.owner_review_packet_rel_path?.includes("edr4rxd1-owner-review-packet"));

  const edr4Candidate = queue.items.find(
    (item) => item.family_key === EDR4RXD1_FAMILY_KEY_V1,
  );
  if (edr4Candidate) {
    assert.equal(edr4Candidate.eligible_now, false);
    assert.ok(edr4Candidate.blocked_reasons.some((r) => r.includes("owner_review_ready")));
  }

  assert.notEqual(queue.next_eligible_item?.family_key, EDR4RXD1_FAMILY_KEY_V1);
});

test("next_eligible_item is highest-value research still needing HyperAgent", () => {
  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(queue.next_eligible_item, "expected a next HyperAgent dispatch candidate");
  assert.equal(queue.next_eligible_item.eligible_now, true);
  assert.equal(queue.next_eligible_item.hyperagent_dispatch_authorized, true);
  assert.equal(queue.next_eligible_item.mutation_authorized, false);

  const eligible = queue.items.filter((item) => item.eligible_now);
  for (const item of eligible) {
    if (item.queue_item_id === queue.next_eligible_item!.queue_item_id) continue;
    const itemPriority = dispatchPriorityForTest(item);
    const nextPriority = dispatchPriorityForTest(queue.next_eligible_item!);
    if (itemPriority < nextPriority) {
      assert.fail(`next_eligible_item should outrank ${item.queue_item_id} on dispatch priority`);
    }
    if (itemPriority === nextPriority && item.leverage_score > queue.next_eligible_item!.leverage_score) {
      assert.fail(`next_eligible_item should outrank ${item.queue_item_id} on leverage_score`);
    }
  }
});

function dispatchPriorityForTest(item: {
  mission_type: string;
  safety_tier: string;
  leverage_score: number;
}): number {
  if (item.mission_type === "EVIDENCE_CAPTURE") {
    if (item.safety_tier === "SAFE_EVIDENCE") return 1;
    if (item.safety_tier === "BOUNDED_EVIDENCE_RESEARCH") return 2;
    return 3;
  }
  if (item.mission_type === "BAD_MAPPING_RESEARCH") return 4;
  return 5;
}

test("bad mapping research item is present with recommended_first_batch slugs", () => {
  const queue = buildHyperAgentWorkQueueV1({ rootDir: ROOT, now: FIXED_NOW });
  const badMapping = queue.items.find((item) => item.mission_type === "BAD_MAPPING_RESEARCH");
  assert.ok(badMapping);
  assert.ok(badMapping.slug_batch.length > 0);
  assert.ok(badMapping.slug_batch.includes("samsung-rf27t5501sr"));
  assert.equal(badMapping.mutation_authorized, false);
});

test("read-only guard blocks product and evidence writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
  ];
  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
  }
});
