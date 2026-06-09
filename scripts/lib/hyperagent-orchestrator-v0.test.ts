import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1,
} from "./bad-mapping-correction-batch-runner-v1";
import {
  hyperAgentDedupKeyV1,
  hyperAgentSlugBatchFingerprintV1,
  HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1,
  HYPERAGENT_DISPATCH_EVENTS_REL_V1,
  type HyperAgentDispatchEventV1,
} from "./hyperagent-dispatch-registry-v1";
import {
  buildCopyPastePromptV0,
  buildHyperAgentMissionPacketV0,
  HYPERAGENT_MISSION_NOT_AUTHORIZED_V0,
  HYPERAGENT_MISSION_PACKET_CONTRACT_V0,
  HYPERAGENT_ORCHESTRATOR_BASE_NAMED_SKILLS_V0,
  HYPERAGENT_ORCHESTRATOR_HALT_CONDITIONS_V0,
  HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0,
  HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0,
  HYPERAGENT_ORCHESTRATOR_RESULT_CONTRACT_V0,
  loadOperatorDispatchEventsV0,
  runHyperAgentOrchestratorV0,
} from "./hyperagent-orchestrator-v0";
import { buildHyperAgentWorkQueueV1 } from "./hyperagent-work-queue-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/hyperagent-orchestrator-v0.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-08T14:00:00.000Z");

const SAMSUNG_SLUG_BATCH = JSON.parse(
  readFileSync(`${ROOT}/${BAD_MAPPING_CORRECTION_BATCH_RUNNER_JSON_REL_V1}`, "utf8"),
).recommended_first_batch_slugs as string[];

const SAMSUNG_SCOPE_KEY = `bad_mapping:${SAMSUNG_SLUG_BATCH.slice(0, 3).join(",")}`;

function samsungDispatchEvent(): HyperAgentDispatchEventV1 {
  return {
    event_id: "samsung-bad-mapping-batch-001",
    dedup_key: hyperAgentDedupKeyV1("BAD_MAPPING_RESEARCH", SAMSUNG_SCOPE_KEY),
    queue_item_id: "6221c29967994612",
    mission_type: "BAD_MAPPING_RESEARCH",
    scope_key: SAMSUNG_SCOPE_KEY,
    slug_batch_fingerprint: hyperAgentSlugBatchFingerprintV1(SAMSUNG_SLUG_BATCH),
    dispatched_at: "2026-06-08T12:00:00.000Z",
    task_id: null,
    operator_note: "fixture",
  };
}

function makeIsolatedPaths(): {
  dispatchAbsPath: string;
  outboxAbsPath: string;
} {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "hyperagent-orch-"));
  const dispatchAbsPath = path.join(
    tempRoot,
    "data/fridge/batch-production/hyperagent/hyperagent-dispatch-events-v1.json",
  );
  const outboxAbsPath = path.join(
    tempRoot,
    "data/fridge/batch-production/hyperagent/outbox",
  );
  mkdirSync(path.dirname(dispatchAbsPath), { recursive: true });
  mkdirSync(outboxAbsPath, { recursive: true });
  writeFileSync(
    dispatchAbsPath,
    `${JSON.stringify({ contract: HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1, events: [] }, null, 2)}\n`,
    "utf8",
  );
  return { dispatchAbsPath, outboxAbsPath };
}

function fileMtimeMs(absPath: string): number {
  return statSync(absPath).mtimeMs;
}

test("dry-run never mutates dispatch events or outbox", () => {
  const { dispatchAbsPath, outboxAbsPath } = makeIsolatedPaths();
  const dispatchBefore = fileMtimeMs(dispatchAbsPath);
  const outboxBefore = readdirSync(outboxAbsPath).length;

  const result = runHyperAgentOrchestratorV0({
    rootDir: ROOT,
    confirmDispatch: false,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
    pathOverrides: {
      dispatchEventsAbsPath: dispatchAbsPath,
      outboxAbsPath,
    },
  });

  assert.equal(result.halt_condition, "DRY_RUN_PREVIEW");
  assert.equal(result.data_mutation, false);
  assert.equal(result.dispatch_event_appended, false);
  assert.equal(result.mission_packet_json_rel_path, null);
  assert.equal(fileMtimeMs(dispatchAbsPath), dispatchBefore);
  assert.equal(readdirSync(outboxAbsPath).length, outboxBefore);
});

test("confirm-dispatch appends exactly one event and writes mission JSON and MD", () => {
  const { dispatchAbsPath, outboxAbsPath } = makeIsolatedPaths();

  const result = runHyperAgentOrchestratorV0({
    rootDir: ROOT,
    confirmDispatch: true,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
    pathOverrides: {
      dispatchEventsAbsPath: dispatchAbsPath,
      outboxAbsPath,
    },
  });

  assert.equal(result.halt_condition, "DISPATCH_RECORDED");
  assert.equal(result.dispatch_event_appended, true);
  assert.equal(result.data_mutation, true);
  assert.equal(result.mutation_authorized, false);
  assert.ok(result.mission_packet_json_rel_path?.endsWith(".json"));
  assert.ok(result.mission_packet_md_rel_path?.endsWith(".md"));

  const events = loadOperatorDispatchEventsV0(dispatchAbsPath);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.dedup_key, result.mission_packet?.dedup_key);
  assert.equal(events[0]?.queue_item_id, result.queue_item_id);

  const jsonName = path.basename(result.mission_packet_json_rel_path!);
  const mdName = path.basename(result.mission_packet_md_rel_path!);
  assert.ok(existsSync(path.join(outboxAbsPath, jsonName)));
  assert.ok(existsSync(path.join(outboxAbsPath, mdName)));
});

test("second confirm-dispatch for same queue item fails ALREADY_DISPATCHED", () => {
  const { dispatchAbsPath, outboxAbsPath } = makeIsolatedPaths();
  const operatorEvents = [samsungDispatchEvent()];

  const first = runHyperAgentOrchestratorV0({
    rootDir: ROOT,
    confirmDispatch: true,
    now: FIXED_NOW,
    operatorEvents,
    pathOverrides: {
      dispatchEventsAbsPath: dispatchAbsPath,
      outboxAbsPath,
    },
  });
  assert.equal(first.halt_condition, "DISPATCH_RECORDED");

  const firstDedupKey = first.mission_packet!.dedup_key;
  const firstQueueItemId = first.queue_item_id;

  const second = runHyperAgentOrchestratorV0({
    rootDir: ROOT,
    confirmDispatch: true,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
    pathOverrides: {
      dispatchEventsAbsPath: dispatchAbsPath,
      outboxAbsPath,
    },
  });

  assert.equal(second.halt_condition, "ALREADY_DISPATCHED");
  assert.equal(second.exit_code, 1);
  assert.equal(second.queue_item_id, firstQueueItemId);
  assert.ok(
    second.blocked_reasons.some((reason) =>
      reason.includes(`already_dispatched_dedup_key:${firstDedupKey}`),
    ),
  );
  assert.equal(loadOperatorDispatchEventsV0(dispatchAbsPath).length, 1);
  assert.equal(readdirSync(outboxAbsPath).length, 2);
});

test("mission packet has loop fields and read-only flags", () => {
  const queue = buildHyperAgentWorkQueueV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
  });
  const item = queue.next_eligible_item;
  assert.ok(item);

  const packet = buildHyperAgentMissionPacketV0({
    item,
    generatedAt: FIXED_NOW().toISOString(),
    halt_condition: "DRY_RUN_PREVIEW",
  });

  assert.equal(packet.contract, HYPERAGENT_MISSION_PACKET_CONTRACT_V0);
  assert.equal(packet.loop_iteration, HYPERAGENT_ORCHESTRATOR_LOOP_ITERATION_V0);
  assert.equal(packet.loop_halt_after_dispatch, true);
  assert.equal(packet.halt_condition, "DRY_RUN_PREVIEW");
  assert.ok(packet.mission_id);
  assert.equal(packet.queue_item_id, item.queue_item_id);
  assert.ok(packet.dedup_key);
  assert.ok(packet.slug_batch_fingerprint);
  assert.equal(packet.discovery_status, "DISCOVERY_OPEN");
  assert.equal(packet.truth_closure_claimed, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.deepEqual(packet.not_authorized, [...HYPERAGENT_MISSION_NOT_AUTHORIZED_V0]);
  assert.ok(packet.named_skill_used.length > 0);
  for (const skill of HYPERAGENT_ORCHESTRATOR_BASE_NAMED_SKILLS_V0) {
    assert.ok(packet.named_skill_used.includes(skill), `expected named skill ${skill}`);
  }
  assert.ok(packet.copy_paste_prompt.length > 0);
  assert.equal(packet.deliverable_contract, "buckparts_hyperagent_ingest_packet_v1");
  assert.ok(packet.deliverable_rel_path_hint.includes("hyperagent-ingest-packet-v1.json"));
  assert.ok(packet.repo_context_paths.length > 0);
});

test("wf2cb bounded prompt includes all 5 slugs and warns no full-family scaling", () => {
  const queue = buildHyperAgentWorkQueueV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
  });
  const item = queue.next_eligible_item;
  assert.ok(item);
  assert.equal(item.family_key, "filter::frigidaire::wf2cb");
  assert.equal(item.mission_type, "BOUNDED_EVIDENCE_SLICE");
  assert.equal(item.slug_batch.length, 5);

  const prompt = buildCopyPastePromptV0(item);
  for (const slug of item.slug_batch) {
    assert.ok(prompt.includes(slug), `expected slug ${slug} in prompt`);
  }
  assert.match(prompt, /Full-family HyperAgent scaling is BLOCKED/i);
  assert.match(prompt, /BOUNDED RESEARCH ONLY/i);
  assert.match(prompt, /official manufacturer/i);
  assert.match(prompt, /truth_closure_claimed=false/i);
});

test("result includes halt_condition", () => {
  const { dispatchAbsPath, outboxAbsPath } = makeIsolatedPaths();
  const result = runHyperAgentOrchestratorV0({
    rootDir: ROOT,
    confirmDispatch: false,
    now: FIXED_NOW,
    operatorEvents: [samsungDispatchEvent()],
    pathOverrides: {
      dispatchEventsAbsPath: dispatchAbsPath,
      outboxAbsPath,
    },
  });
  assert.equal(result.contract, HYPERAGENT_ORCHESTRATOR_RESULT_CONTRACT_V0);
  assert.ok(HYPERAGENT_ORCHESTRATOR_HALT_CONDITIONS_V0.includes(result.halt_condition));
  assert.equal(result.halt_condition, "DRY_RUN_PREVIEW");
  assert.equal(result.mission_packet?.halt_condition, "DRY_RUN_PREVIEW");
});

test("read-only guard blocks writes outside allowed hyperagent dispatch/outbox paths", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
  ];
  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
  }
  assert.ok(LIB_SOURCE.includes("HYPERAGENT_DISPATCH_EVENTS_REL_V1"));
  assert.ok(LIB_SOURCE.includes("HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0"));
});
