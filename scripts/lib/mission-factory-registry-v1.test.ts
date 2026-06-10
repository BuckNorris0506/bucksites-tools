import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMissionFactoryRegistryCommandCenterLaneV1,
  MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1,
} from "./mission-factory-registry-command-center-v1";
import {
  buildMissionFactoryRegistryReportV1,
  createMissionFactoryRegistryEntryV1,
  enforceMissionFactoryRegistryTtlV1,
  getMissionFactoryRegistryEntryV1,
  isMissionFactoryTransitionAllowedV1,
  loadMissionFactoryRegistryV1,
  MISSION_FACTORY_REGISTRY_CONTRACT_V1,
  MISSION_FACTORY_REGISTRY_JSON_REL_V1,
  missionFactoryDedupKeyV1,
  queryMissionFactoryRegistryEntriesV1,
  saveMissionFactoryRegistryV1,
  transitionMissionFactoryRegistryEntryV1,
  validateMissionFactoryRegistryDocumentV1,
} from "./mission-factory-registry-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/mission-factory-registry-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

function withIsolatedRegistryRoot(run: (registryRoot: string) => void): void {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-registry-"));
  try {
    const registryRoot = path.join(tmp, "registry-root");
    mkdirSync(registryRoot, { recursive: true });
    saveMissionFactoryRegistryV1(registryRoot, loadMissionFactoryRegistryV1(registryRoot));
    run(registryRoot);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("initial committed registry document validates", () => {
  const doc = loadMissionFactoryRegistryV1(ROOT);
  assert.equal(doc.contract, MISSION_FACTORY_REGISTRY_CONTRACT_V1);
  assert.equal(doc.schema_version, "1.0");
  assert.equal(doc.mutation_authorized, false);

  const validated = validateMissionFactoryRegistryDocumentV1(doc);
  assert.equal(validated.ok, true);

  assert.ok(doc.missions.length >= 1, "committed registry is seeded with missions");
  assert.equal(doc.missions.length, 15);

  const gswfMission = getMissionFactoryRegistryEntryV1(doc, "MF-2026-0003");
  assert.ok(gswfMission);
  assert.equal(gswfMission!.state, "DISCOVERY_COMPLETE");
  assert.equal(gswfMission!.target_family, "filter::ge::gswf");
});

test("registry CRUD create read query", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-registry-crud-"));
  try {
    let doc = loadMissionFactoryRegistryV1(tmp);
    const created = createMissionFactoryRegistryEntryV1({
      doc,
      now: FIXED_NOW,
      input: {
        mission_type: "EVIDENCE_SCALING",
        wedge: "refrigerator",
        priority: 3,
        target_family: "filter::whirlpool::edr2rxd1",
        target_slugs: ["whirlpool-wrs325sdhz"],
        source_reference: "scripts/lib/evidence-leverage-prioritization-v1.ts",
      },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    doc = created.doc;
    assert.equal(doc.missions.length, 1);
    assert.match(created.entry.mission_id, /^MF-2026-/);

    const read = getMissionFactoryRegistryEntryV1(doc, created.entry.mission_id);
    assert.ok(read);
    assert.equal(read!.state, "QUEUED");

    const queried = queryMissionFactoryRegistryEntriesV1(doc, {
      mission_type: "EVIDENCE_SCALING",
      active_only: true,
    });
    assert.equal(queried.length, 1);

    saveMissionFactoryRegistryV1(tmp, doc);
    const reloaded = loadMissionFactoryRegistryV1(tmp);
    assert.equal(reloaded.missions.length, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("state transition enforcement blocks invalid transitions", () => {
  withIsolatedRegistryRoot((registryRoot) => {
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const created = createMissionFactoryRegistryEntryV1({
    doc,
    now: FIXED_NOW,
    input: {
      mission_type: "WRONG_PART_RESEARCH",
      wedge: "refrigerator",
      priority: 1,
      target_family: "filter::whirlpool::edr4rxd1",
      target_slugs: [],
      source_reference: "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json",
    },
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  doc = created.doc;

  assert.equal(isMissionFactoryTransitionAllowedV1("QUEUED", "DISPATCH_READY"), true);
  assert.equal(isMissionFactoryTransitionAllowedV1("QUEUED", "CLOSED"), false);

  const bad = transitionMissionFactoryRegistryEntryV1({
    doc,
    mission_id: created.entry.mission_id,
    to_state: "CLOSED",
    actor: "owner",
    reason: "invalid_skip",
    now: FIXED_NOW,
  });
  assert.equal(bad.ok, false);

  const good = transitionMissionFactoryRegistryEntryV1({
    doc,
    mission_id: created.entry.mission_id,
    to_state: "DISPATCH_READY",
    actor: "orchestrator",
    reason: "pre_dispatch_gates_passed",
    now: FIXED_NOW,
  });
  assert.equal(good.ok, true);
  if (!good.ok) return;
  assert.equal(good.entry.state, "DISPATCH_READY");
  assert.equal(good.entry.state_history.length, 2);
  assert.equal(good.entry.state_history[1]!.from_state, "QUEUED");
  assert.equal(good.entry.state_history[1]!.to_state, "DISPATCH_READY");
  });
});

test("TTL expiration transitions QUEUED to EXPIRED and DISPATCH_READY to QUEUED", () => {
  withIsolatedRegistryRoot((registryRoot) => {
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const queued = createMissionFactoryRegistryEntryV1({
    doc,
    now: () => new Date("2026-06-01T00:00:00.000Z"),
    input: {
      mission_type: "EVIDENCE_SCALING",
      wedge: "refrigerator",
      priority: 3,
      target_family: "filter::ge::gswf",
      target_slugs: ["ge-gss25gshss"],
      source_reference: "scripts/lib/evidence-leverage-prioritization-v1.ts",
    },
  });
  assert.equal(queued.ok, true);
  if (!queued.ok) return;
  doc = queued.doc;

  const enforcedQueued = enforceMissionFactoryRegistryTtlV1({
    doc,
    now: () => new Date("2026-06-05T00:00:00.000Z"),
  });
  assert.equal(enforcedQueued.transitions.length, 1);
  assert.equal(enforcedQueued.transitions[0]!.to_state, "EXPIRED");
  doc = enforcedQueued.doc;

  const ready = createMissionFactoryRegistryEntryV1({
    doc,
    now: () => new Date("2026-06-09T00:00:00.000Z"),
    input: {
      mission_type: "FAMILY_RECONCILIATION",
      wedge: "refrigerator",
      priority: 2,
      target_family: "filter::samsung::haf-qin",
      target_slugs: [],
      source_reference: "scripts/lib/family-reconciliation-v1.ts",
    },
  });
  assert.equal(ready.ok, true);
  if (!ready.ok) return;
  doc = ready.doc;
  const toReady = transitionMissionFactoryRegistryEntryV1({
    doc,
    mission_id: ready.entry.mission_id,
    to_state: "DISPATCH_READY",
    actor: "orchestrator",
    reason: "gates_passed",
    now: () => new Date("2026-06-09T00:00:00.000Z"),
  });
  assert.equal(toReady.ok, true);
  if (!toReady.ok) return;
  doc = toReady.doc;

  const enforcedReady = enforceMissionFactoryRegistryTtlV1({
    doc,
    now: () => new Date("2026-06-10T01:00:00.000Z"),
  });
  const requeue = enforcedReady.transitions.find(
    (row) => row.from_state === "DISPATCH_READY" && row.to_state === "QUEUED",
  );
  assert.ok(requeue);
  });
});

test("deduplication rejects second active mission for same type+family+wedge", () => {
  withIsolatedRegistryRoot((registryRoot) => {
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const first = createMissionFactoryRegistryEntryV1({
    doc,
    now: FIXED_NOW,
    input: {
      mission_type: "SAFE_LINK_COVERAGE",
      wedge: "refrigerator",
      priority: 4,
      target_family: "filter::frigidaire::eptwfu01",
      target_slugs: [],
      source_reference: "scripts/lib/fridge-safe-link-batch-factory-v1.ts",
    },
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  doc = first.doc;

  const dedupKey = missionFactoryDedupKeyV1(first.entry);
  assert.equal(
    dedupKey,
    "SAFE_LINK_COVERAGE:refrigerator:filter::frigidaire::eptwfu01",
  );

  const second = createMissionFactoryRegistryEntryV1({
    doc,
    now: FIXED_NOW,
    input: {
      mission_type: "SAFE_LINK_COVERAGE",
      wedge: "refrigerator",
      priority: 4,
      target_family: "filter::frigidaire::eptwfu01",
      target_slugs: ["frigidaire-fghb2868pf"],
      source_reference: "scripts/lib/fridge-safe-link-batch-factory-v1.ts",
    },
  });
  assert.equal(second.ok, false);
  assert.match(second.error ?? "", /deduplication blocked/);
  });
});

test("mission history records multi-step lifecycle", () => {
  withIsolatedRegistryRoot((registryRoot) => {
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const created = createMissionFactoryRegistryEntryV1({
    doc,
    now: FIXED_NOW,
    input: {
      mission_type: "EVIDENCE_SCALING",
      wedge: "refrigerator",
      priority: 3,
      target_family: "filter::whirlpool::edr2rxd1",
      target_slugs: ["whirlpool-wrs325sdhz"],
      source_reference: "scripts/lib/evidence-leverage-prioritization-v1.ts",
    },
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  doc = created.doc;

  const steps: Array<{
    to:
      | "DISPATCH_READY"
      | "DISPATCHED"
      | "DISCOVERY_COMPLETE"
      | "INGEST_COMMITTED"
      | "CURSOR_VALIDATED"
      | "OWNER_REVIEWED"
      | "PROMOTED"
      | "CLOSED";
    actor: string;
  }> = [
    { to: "DISPATCH_READY", actor: "orchestrator" },
    { to: "DISPATCHED", actor: "orchestrator" },
    { to: "DISCOVERY_COMPLETE", actor: "hyperagent" },
    { to: "INGEST_COMMITTED", actor: "ops_agent" },
    { to: "CURSOR_VALIDATED", actor: "cursor" },
    { to: "OWNER_REVIEWED", actor: "audit_model" },
    { to: "PROMOTED", actor: "owner" },
    { to: "CLOSED", actor: "system" },
  ];

  for (const step of steps) {
    const moved = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: created.entry.mission_id,
      to_state: step.to,
      actor: step.actor,
      reason: `test_${step.to.toLowerCase()}`,
      now: FIXED_NOW,
      result:
        step.to === "CURSOR_VALIDATED"
          ? {
              validation_result: "PASS",
              models_researched: 10,
              evidence_entries_created: 8,
              conflicts_found: [],
              guard_candidates_created: [],
              owner_review_result: null,
            }
          : undefined,
    });
    assert.equal(moved.ok, true, step.to);
    if (!moved.ok) return;
    doc = moved.doc;
  }

  const finalMission = getMissionFactoryRegistryEntryV1(doc, created.entry.mission_id);
  assert.ok(finalMission);
  assert.equal(finalMission!.state_history.length, 9);
  assert.equal(finalMission!.state, "CLOSED");
  });
});

test("command center lane renders registry summary", () => {
  const lane = buildMissionFactoryRegistryCommandCenterLaneV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(lane.contract, MISSION_FACTORY_REGISTRY_COMMAND_CENTER_CONTRACT_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.mission_factory_registry_v1");
  assert.equal(lane.registry_rel_path, MISSION_FACTORY_REGISTRY_JSON_REL_V1);
  assert.ok(Array.isArray(lane.active_missions));
  assert.ok(lane.proven_facts.length > 0);
});

test("registry lib does not write product data paths", () => {
  const forbidden = [
    "data/compatibility_mappings.csv",
    "data/filters.csv",
    "data/fridge_models.csv",
    "data/retailer_links.csv",
    "supabase/",
    "data/manual-evidence/",
  ];
  for (const needle of forbidden) {
    assert.equal(LIB_SOURCE.includes(`writeFileSync(path.join(rootDir, "${needle}`), false);
  }
});

test("validateMissionFactoryRegistryDocumentV1 enforces schema", () => {
  const invalid = validateMissionFactoryRegistryDocumentV1({ contract: "wrong", missions: [] });
  assert.equal(invalid.ok, false);
});

test("report builds from committed registry", () => {
  const report = buildMissionFactoryRegistryReportV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.total_missions, 15);
  assert.equal(report.active_mission_count, 15);
  assert.equal(report.missions_by_state.DISCOVERY_COMPLETE, 1);
  const gswfMission = report.active_missions.find((row) => row.mission_id === "MF-2026-0003");
  assert.ok(gswfMission);
  assert.equal(gswfMission!.state, "DISCOVERY_COMPLETE");
  assert.equal(gswfMission!.target_family, "filter::ge::gswf");
});
