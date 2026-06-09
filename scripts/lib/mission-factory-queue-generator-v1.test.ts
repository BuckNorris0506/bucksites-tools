import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildMissionFactoryRegistryCommandCenterLaneV1 } from "./mission-factory-registry-command-center-v1";
import {
  compareMissionFactoryQueueCandidatesV1,
  generateEvidenceScalingQueueCandidatesV1,
  generateSafeLinkCoverageQueueCandidatesV1,
  markQueueCandidatesAgainstRegistryV1,
  MISSION_FACTORY_QUEUE_MAX_DEPTH_V1,
  MISSION_FACTORY_QUEUE_MIN_DEPTH_V1,
  MISSION_FACTORY_QUEUE_PRIORITY_BY_TYPE_V1,
  runMissionFactoryQueueGeneratorV1,
  sortMissionFactoryQueueCandidatesV1,
} from "./mission-factory-queue-generator-v1";
import {
  createMissionFactoryRegistryEntryV1,
  loadMissionFactoryRegistryV1,
  MISSION_FACTORY_REGISTRY_JSON_REL_V1,
  saveMissionFactoryRegistryV1,
} from "./mission-factory-registry-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/mission-factory-queue-generator-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

function seedRegistry(tmp: string): void {
  const src = path.join(ROOT, MISSION_FACTORY_REGISTRY_JSON_REL_V1);
  const dest = path.join(tmp, MISSION_FACTORY_REGISTRY_JSON_REL_V1);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, readFileSync(src, "utf8"), "utf8");
}

test("generates evidence scaling candidates from control graph + leverage", () => {
  const candidates = generateEvidenceScalingQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(candidates.length >= 1);
  assert.ok(candidates.every((c) => c.mission_type === "EVIDENCE_SCALING"));
  assert.ok(candidates.every((c) => c.priority === MISSION_FACTORY_QUEUE_PRIORITY_BY_TYPE_V1.EVIDENCE_SCALING));
  assert.ok(candidates.some((c) => c.target_family === "filter::whirlpool::edr2rxd1"));
});

test("generates safe link coverage candidates grouped by filter family", () => {
  const candidates = generateSafeLinkCoverageQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(candidates.length >= 1);
  assert.ok(candidates.every((c) => c.mission_type === "SAFE_LINK_COVERAGE"));
  assert.ok(candidates.every((c) => c.target_family.startsWith("filter::")));
});

test("priority ordering ranks evidence scaling before safe link coverage", () => {
  const evidence = generateEvidenceScalingQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
  const safeLink = generateSafeLinkCoverageQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
  const doc = loadMissionFactoryRegistryV1(ROOT);
  const ordered = sortMissionFactoryQueueCandidatesV1([...safeLink.slice(0, 3), ...evidence.slice(0, 3)], doc, FIXED_NOW().toISOString());
  const firstEvidenceIdx = ordered.findIndex((c) => c.mission_type === "EVIDENCE_SCALING");
  const firstSafeIdx = ordered.findIndex((c) => c.mission_type === "SAFE_LINK_COVERAGE");
  assert.ok(firstEvidenceIdx >= 0 && firstSafeIdx >= 0);
  assert.ok(firstEvidenceIdx < firstSafeIdx);
});

test("deduplication blocks second active mission with same type+family+wedge", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-queue-dedup-"));
  try {
    seedRegistry(tmp);
    let doc = loadMissionFactoryRegistryV1(tmp);
    const evidence = generateEvidenceScalingQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
    const first = evidence[0]!;
    const created = createMissionFactoryRegistryEntryV1({
      doc,
      now: FIXED_NOW,
      input: {
        mission_type: first.mission_type,
        wedge: first.wedge,
        priority: first.priority,
        target_family: first.target_family,
        target_slugs: first.target_slugs,
        source_reference: first.source_reference,
      },
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    doc = created.doc;
    saveMissionFactoryRegistryV1(tmp, doc);

    const marked = markQueueCandidatesAgainstRegistryV1({ candidates: evidence, doc });
    const blocked = marked.find((c) => c.target_family === first.target_family);
    assert.ok(blocked?.blocked_by_active_mission);
    assert.ok(blocked?.blocked_mission_id);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("queue depth management fills to min depth 15 on empty registry dry-run", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-queue-depth-"));
  try {
    seedRegistry(tmp);
    const { report } = runMissionFactoryQueueGeneratorV1({
      rootDir: ROOT,
      registryRootDir: tmp,
      now: FIXED_NOW,
      writeRegistry: false,
    });
    assert.equal(report.queue_depth_before, 0);
    assert.equal(report.generation_mode, "filling_to_min_depth");
    assert.equal(report.missions_added, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);
    assert.equal(report.queue_depth_after, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);
    assert.ok(report.queue_depth_after <= MISSION_FACTORY_QUEUE_MAX_DEPTH_V1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("queue depth management pauses at max depth 25", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-queue-max-"));
  try {
    seedRegistry(tmp);
    let doc = loadMissionFactoryRegistryV1(tmp);
    const evidence = generateEvidenceScalingQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
    const safeLink = generateSafeLinkCoverageQueueCandidatesV1({ rootDir: ROOT, now: FIXED_NOW });
    const candidates = [...evidence, ...safeLink];

    for (let i = 0; i < MISSION_FACTORY_QUEUE_MAX_DEPTH_V1; i += 1) {
      const candidate = candidates[i % candidates.length]!;
      const created = createMissionFactoryRegistryEntryV1({
        doc,
        now: FIXED_NOW,
        input: {
          mission_type: candidate.mission_type,
          wedge: candidate.wedge,
          priority: candidate.priority,
          target_family: `${candidate.target_family}::seed-${String(i)}`,
          target_slugs: candidate.target_slugs,
          source_reference: candidate.source_reference,
        },
      });
      if (!created.ok) continue;
      doc = created.doc;
    }
    saveMissionFactoryRegistryV1(tmp, doc);

    const { report } = runMissionFactoryQueueGeneratorV1({
      rootDir: ROOT,
      registryRootDir: tmp,
      now: FIXED_NOW,
      writeRegistry: false,
    });
    assert.equal(report.queue_depth_before, MISSION_FACTORY_QUEUE_MAX_DEPTH_V1);
    assert.equal(report.generation_mode, "paused_at_max_depth");
    assert.equal(report.missions_added, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("TTL expiration marks stale QUEUED missions before generation", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-queue-ttl-"));
  try {
    seedRegistry(tmp);
    let doc = loadMissionFactoryRegistryV1(tmp);
    const created = createMissionFactoryRegistryEntryV1({
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
    assert.equal(created.ok, true);
    if (!created.ok) return;
    saveMissionFactoryRegistryV1(tmp, created.doc);

    const { report } = runMissionFactoryQueueGeneratorV1({
      rootDir: ROOT,
      registryRootDir: tmp,
      now: () => new Date("2026-06-05T00:00:00.000Z"),
      writeRegistry: true,
    });
    assert.ok(report.ttl_transitions_applied >= 1);

    const reloaded = loadMissionFactoryRegistryV1(tmp);
    const expired = reloaded.missions.find((m) => m.target_family === "filter::ge::gswf");
    assert.equal(expired?.state, "EXPIRED");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write-registry persists generated QUEUED missions", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "mf-queue-write-"));
  try {
    seedRegistry(tmp);
    const { report } = runMissionFactoryQueueGeneratorV1({
      rootDir: ROOT,
      registryRootDir: tmp,
      now: FIXED_NOW,
      writeRegistry: true,
    });
    assert.equal(report.registry_write_performed, true);
    assert.equal(report.missions_added, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);

    const reloaded = loadMissionFactoryRegistryV1(tmp);
    const queued = reloaded.missions.filter((m) => m.state === "QUEUED");
    assert.equal(queued.length, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("command center lane includes queue generator preview", () => {
  const lane = buildMissionFactoryRegistryCommandCenterLaneV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(lane.queue_generator_v1);
  assert.equal(lane.queue_generator_v1.queue_depth_target_min, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);
  assert.equal(lane.queue_generator_v1.queue_depth_target_max, MISSION_FACTORY_QUEUE_MAX_DEPTH_V1);
  assert.equal(lane.queue_generator_v1.missions_added_preview, MISSION_FACTORY_QUEUE_MIN_DEPTH_V1);
  assert.equal(lane.queue_generator_v1.generation_mode, "filling_to_min_depth");
});

test("queue generator does not write product data paths", () => {
  const forbidden = [
    "data/compatibility_mappings.csv",
    "data/filters.csv",
    "data/fridge_models.csv",
    "data/retailer_links.csv",
    "supabase/",
    "data/manual-evidence/",
  ];
  for (const needle of forbidden) {
    assert.equal(LIB_SOURCE.includes(`writeFileSync(path.join(args.rootDir, "${needle}`), false);
  }
});

test("compareMissionFactoryQueueCandidatesV1 uses priority then unlock_score", () => {
  const doc = loadMissionFactoryRegistryV1(ROOT);
  const a = {
    mission_type: "EVIDENCE_SCALING" as const,
    wedge: "refrigerator" as const,
    priority: 3,
    target_family: "a",
    target_slugs: [],
    source_reference: "x",
    unlock_score: 100,
    family_size: 1,
    dedup_key: "a",
    blocked_by_active_mission: false,
    blocked_mission_id: null,
  };
  const b = { ...a, priority: 4, target_family: "b", dedup_key: "b", unlock_score: 9999 };
  assert.ok(compareMissionFactoryQueueCandidatesV1(a, b, doc, FIXED_NOW().toISOString()) < 0);
});
