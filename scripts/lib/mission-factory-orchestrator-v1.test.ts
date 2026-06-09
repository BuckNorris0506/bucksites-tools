import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { HYPERAGENT_INGEST_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  buildMissionFactoryOrchestratorCommandCenterLaneV1,
  MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1,
} from "./mission-factory-orchestrator-command-center-v1";
import {
  HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1,
  HYPERAGENT_DISPATCH_EVENTS_REL_V1,
} from "./hyperagent-dispatch-registry-v1";
import {
  HYPERAGENT_ORCHESTRATOR_OUTBOX_REL_V0,
  loadOperatorDispatchEventsV0,
} from "./hyperagent-orchestrator-v0";
import {
  createMissionFactoryRegistryEntryV1,
  getMissionFactoryRegistryEntryV1,
  loadMissionFactoryRegistryV1,
  MISSION_FACTORY_REGISTRY_JSON_REL_V1,
  saveMissionFactoryRegistryV1,
  transitionMissionFactoryRegistryEntryV1,
} from "./mission-factory-registry-v1";
import {
  MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1,
  runMissionFactoryOrchestratorV1,
} from "./mission-factory-orchestrator-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/mission-factory-orchestrator-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-09T14:00:00.000Z");

function makeIsolatedOrchestratorPaths(): {
  tmp: string;
  registryRoot: string;
  dispatchAbsPath: string;
  outboxAbsPath: string;
  draftsAbsPath: string;
} {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-orchestrator-"));
  const registryRoot = path.join(tmp, "registry-root");
  mkdirSync(registryRoot, { recursive: true });
  saveMissionFactoryRegistryV1(registryRoot, loadMissionFactoryRegistryV1(registryRoot));

  const dispatchAbsPath = path.join(
    tmp,
    "data/fridge/batch-production/hyperagent/hyperagent-dispatch-events-v1.json",
  );
  const outboxAbsPath = path.join(tmp, "data/fridge/batch-production/hyperagent/outbox");
  const draftsAbsPath = path.join(tmp, "data/fridge/batch-production/drafts");
  mkdirSync(path.dirname(dispatchAbsPath), { recursive: true });
  mkdirSync(outboxAbsPath, { recursive: true });
  mkdirSync(draftsAbsPath, { recursive: true });
  writeFileSync(
    dispatchAbsPath,
    `${JSON.stringify({ contract: HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1, events: [] }, null, 2)}\n`,
    "utf8",
  );

  return { tmp, registryRoot, dispatchAbsPath, outboxAbsPath, draftsAbsPath };
}

function seedQueuedMission(registryRoot: string, targetFamily: string, slugs: string[]): string {
  let doc = loadMissionFactoryRegistryV1(registryRoot);
  const created = createMissionFactoryRegistryEntryV1({
    doc,
    now: FIXED_NOW,
    input: {
      mission_type: "SAFE_LINK_COVERAGE",
      wedge: "refrigerator",
      priority: 4,
      target_family: targetFamily,
      target_slugs: slugs,
      source_reference: "scripts/lib/fridge-safe-link-batch-factory-v1.ts",
    },
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error("seed failed");
  saveMissionFactoryRegistryV1(registryRoot, created.doc);
  return created.entry.mission_id;
}

test("orchestrator promotes QUEUED to DISPATCH_READY and dispatches with lifecycle audit trail", () => {
  const { tmp, registryRoot, dispatchAbsPath, outboxAbsPath } = makeIsolatedOrchestratorPaths();
  try {
    const missionId = seedQueuedMission(registryRoot, "filter::frigidaire::242017801", [
      "frig-242017801",
    ]);

    const { report } = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: true,
      now: FIXED_NOW,
      pathOverrides: {
        dispatchEventsAbsPath: dispatchAbsPath,
        outboxAbsPath,
        draftsAbsPath: path.join(tmp, "data/fridge/batch-production/drafts"),
      },
      operatorEvents: [],
    });

    assert.equal(report.dispatches_recorded, 1);
    assert.equal(report.dispatch_ready_promotions, 1);
    assert.equal(report.registry_write_performed, true);

    const entry = getMissionFactoryRegistryEntryV1(
      loadMissionFactoryRegistryV1(registryRoot),
      missionId,
    );
    assert.ok(entry);
    assert.equal(entry!.state, "DISPATCHED");
    assert.equal(entry!.current_actor, "hyperagent");

    const dispatchTransitions = entry!.state_history.filter(
      (row) => row.to_state === "DISPATCHED",
    );
    assert.equal(dispatchTransitions.length, 1);
    assert.equal(dispatchTransitions[0]!.actor, MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1);
    assert.equal(dispatchTransitions[0]!.from_state, "DISPATCH_READY");
    assert.ok(dispatchTransitions[0]!.reason.includes("hyperagent_dispatch"));

    const events = loadOperatorDispatchEventsV0(dispatchAbsPath);
    assert.equal(events.length, 1);
    assert.match(events[0]!.operator_note ?? "", /mission_factory:MF-/);
    assert.ok(readdirSync(outboxAbsPath).length >= 2);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("parallel cap enforcement allows only one dispatch when max_parallel_dispatches is 1", () => {
  const { tmp, registryRoot, dispatchAbsPath, outboxAbsPath } = makeIsolatedOrchestratorPaths();
  try {
    seedQueuedMission(registryRoot, "filter::test-orchestrator::parallel-a", ["test-slug-a"]);
    seedQueuedMission(registryRoot, "filter::test-orchestrator::parallel-b", ["test-slug-b"]);

    const { report } = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: true,
      maxParallelDispatches: 1,
      now: FIXED_NOW,
      pathOverrides: {
        dispatchEventsAbsPath: dispatchAbsPath,
        outboxAbsPath,
      },
      operatorEvents: [],
    });

    assert.equal(report.dispatches_recorded, 1);
    assert.equal(report.active_dispatch_count, 1);
    assert.equal(report.available_dispatch_slots, 0);
    const doc = loadMissionFactoryRegistryV1(registryRoot);
    assert.equal(
      doc.missions.filter((m) => m.state === "DISPATCHED").length,
      1,
    );
    assert.equal(
      doc.missions.filter((m) => m.state === "DISPATCH_READY").length,
      1,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("duplicate prevention blocks dispatch when hyperagent dedup key already dispatched", () => {
  const { tmp, registryRoot, dispatchAbsPath, outboxAbsPath } = makeIsolatedOrchestratorPaths();
  try {
    const targetFamily = "filter::frigidaire::242017801";
    seedQueuedMission(registryRoot, targetFamily, ["frig-242017801"]);

    let doc = loadMissionFactoryRegistryV1(registryRoot);
    const mission = doc.missions[0]!;
    const promoted = transitionMissionFactoryRegistryEntryV1({
      doc,
      mission_id: mission.mission_id,
      to_state: "DISPATCH_READY",
      actor: "test",
      reason: "test",
      now: FIXED_NOW,
    });
    assert.equal(promoted.ok, true);
    if (!promoted.ok) return;
    saveMissionFactoryRegistryV1(registryRoot, promoted.doc);

    const dedupKey = "EVIDENCE_CAPTURE:filter::frigidaire::242017801";
    writeFileSync(
      dispatchAbsPath,
      `${JSON.stringify(
        {
          contract: HYPERAGENT_DISPATCH_EVENTS_CONTRACT_V1,
          events: [
            {
              event_id: "prior-dispatch",
              dedup_key: dedupKey,
              queue_item_id: "abc",
              mission_type: "EVIDENCE_CAPTURE",
              scope_key: targetFamily,
              slug_batch_fingerprint: null,
              dispatched_at: "2026-06-08T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const { report } = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: true,
      now: FIXED_NOW,
      pathOverrides: { dispatchEventsAbsPath: dispatchAbsPath, outboxAbsPath },
    });

    assert.equal(report.dispatches_blocked, 1);
    assert.ok(
      report.blocked_dispatch_reasons.some((row) =>
        row.reasons.some((r) => r.includes("already_dispatched_dedup_key")),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("ingest detection transitions DISPATCHED to DISCOVERY_COMPLETE when ingest packet complete", () => {
  const { tmp, registryRoot, dispatchAbsPath, outboxAbsPath, draftsAbsPath } =
    makeIsolatedOrchestratorPaths();
  try {
    const missionId = seedQueuedMission(registryRoot, "filter::frigidaire::242294502", [
      "frig-242294502",
    ]);

    const first = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: true,
      now: FIXED_NOW,
      pathOverrides: {
        dispatchEventsAbsPath: dispatchAbsPath,
        outboxAbsPath,
        draftsAbsPath,
      },
      operatorEvents: [],
    });
    assert.equal(first.report.dispatches_recorded, 1);
    const hyperId = first.report.dispatch_records[0]!.hyperagent_mission_id;

    writeFileSync(
      path.join(draftsAbsPath, `${hyperId}-hyperagent-ingest-packet-v1.json`),
      `${JSON.stringify(
        {
          packet_type: HYPERAGENT_INGEST_PACKET_CONTRACT_V1,
          mission_id: hyperId,
          family_key: "filter::frigidaire::242294502",
          discovery_status: "DISCOVERY_COMPLETE",
          truth_closure_claimed: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const { report } = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: true,
      now: FIXED_NOW,
      pathOverrides: {
        dispatchEventsAbsPath: dispatchAbsPath,
        outboxAbsPath,
        draftsAbsPath,
      },
    });

    assert.equal(report.ingest_closeouts_detected, 1);
    const entry = getMissionFactoryRegistryEntryV1(
      loadMissionFactoryRegistryV1(registryRoot),
      missionId,
    );
    assert.equal(entry!.state, "DISCOVERY_COMPLETE");
    const closeout = entry!.state_history.find(
      (row) => row.reason === "ingest_packet_discovery_complete_detected",
    );
    assert.ok(closeout);
    assert.equal(closeout!.actor, MISSION_FACTORY_ORCHESTRATOR_ACTOR_V1);
    assert.equal(closeout!.metadata.ingest_received, true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("dry-run does not write registry dispatch events or outbox", () => {
  const { tmp, registryRoot, dispatchAbsPath, outboxAbsPath } = makeIsolatedOrchestratorPaths();
  try {
    seedQueuedMission(registryRoot, "filter::test-orchestrator::dry-run", ["test-slug-dry"]);
    const registryBefore = readFileSync(
      path.join(registryRoot, MISSION_FACTORY_REGISTRY_JSON_REL_V1),
      "utf8",
    );

    const { report } = runMissionFactoryOrchestratorV1({
      rootDir: ROOT,
      registryRootDir: registryRoot,
      confirmOrchestrate: false,
      now: FIXED_NOW,
      pathOverrides: { dispatchEventsAbsPath: dispatchAbsPath, outboxAbsPath },
      operatorEvents: [],
    });

    assert.equal(report.read_only, true);
    assert.equal(report.registry_write_performed, false);
    assert.equal(report.dispatches_recorded, 1);
    assert.equal(readFileSync(path.join(registryRoot, MISSION_FACTORY_REGISTRY_JSON_REL_V1), "utf8"), registryBefore);
    assert.equal(loadOperatorDispatchEventsV0(dispatchAbsPath).length, 0);
    assert.equal(readdirSync(outboxAbsPath).length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("command center orchestrator lane is read-only dry-run preview", () => {
  const lane = buildMissionFactoryOrchestratorCommandCenterLaneV1({
    rootDir: ROOT,
    now: FIXED_NOW,
  });
  assert.equal(lane.contract, MISSION_FACTORY_ORCHESTRATOR_COMMAND_CENTER_CONTRACT_V1);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.current_parallel_limit, 1);
  assert.ok(typeof lane.active_dispatch_count === "number");
  assert.ok(typeof lane.available_dispatch_slots === "number");
  assert.ok(lane.missions_by_lane);
  assert.equal(typeof lane.missions_by_lane.queued, "number");
  assert.equal(typeof lane.missions_by_lane.ingest_received, "number");
});

test("orchestrator lib does not write product data paths", () => {
  const forbidden = [
    "data/retailer_links.csv",
    "data/compatibility_mappings.csv",
    "supabase.from(",
  ];
  for (const needle of forbidden) {
    assert.ok(!LIB_SOURCE.includes(needle), `forbidden needle ${needle}`);
  }
});
