import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { buildCommandCenterBrainCoverageManifestV1 } from "./buckparts-brain-coverage-manifest-v1";
import {
  buildBrainIntegrityGateV1,
  DASHBOARD_DECISION_BRAIN_GAP_SYSTEM_IDS,
  MANIFEST_DEFAULT_BYPASS_REASON,
} from "./buckparts-brain-integrity-gate-v1";

test("buildBrainIntegrityGateV1 classifies live manifest as PROCEED_WITH_KNOWN_LIMITS", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });

  assert.equal(gate.contract, "brain_integrity_gate_v1");
  assert.equal(gate.read_only, true);
  assert.equal(gate.data_mutation, false);
  assert.equal(gate.runtime_status, "OK");
  assert.ok(
    gate.brain_status === "PROCEED_WITH_KNOWN_LIMITS" || gate.brain_status === "STOP_THE_LINE",
  );
  assert.equal(gate.brain_status, "PROCEED_WITH_KNOWN_LIMITS");
  assert.equal(gate.lane_work_allowed, true);
  assert.deepEqual(gate.verdict_counts, manifest.verdict_counts);
  assert.deepEqual(gate.brain_manifest_counts, manifest.verdict_counts);
  assert.ok(gate.missing_entries.some((e) => e.system_id === "github_actions_live_status"));
  assert.ok(gate.missing_entries.some((e) => e.system_id === "sentry_error_monitoring"));
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_integrity_sentinel"));
});

test("buildBrainIntegrityGateV1 excludes mutating executor from stop-the-line", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const mutate = manifest.entries.find((e) => e.npm_script_or_path.includes(":mutate"));
  assert.ok(mutate);
  assert.equal(mutate!.blocks_lane_work, true);

  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  assert.ok(!gate.stop_the_line_entries.some((e) => e.system_id === mutate!.system_id));
  assert.equal(gate.lane_work_allowed, true);
});

test("buildBrainIntegrityGateV1 STOP_THE_LINE when non-mutation blocks_lane_work", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: () => false,
  });
  manifest.entries.push({
    system_id: "test_blocking_surface",
    npm_script_or_path: "test:blocker",
    cc_json_path: null,
    dashboard_only: false,
    verdict: "BYPASSING",
    blocks_lane_work: true,
    validation_command: "true",
    reason: "Synthetic blocker for gate unit test.",
  });
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  assert.equal(gate.brain_status, "STOP_THE_LINE");
  assert.equal(gate.lane_work_allowed, false);
  assert.equal(gate.stop_the_line_entries.length, 1);
});

test("buildBrainIntegrityGateV1 PROCEED when no decision-useful gaps remain", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: () => false,
  });
  manifest.entries = manifest.entries.filter(
    (e) =>
      e.verdict === "CONNECTED" ||
      (e.verdict === "PARTIAL" && e.cc_json_path != null) ||
      e.verdict === "DUPLICATE",
  );
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  assert.equal(gate.brain_status, "PROCEED");
});

test("buildBrainIntegrityGateV1 lists dashboard decision gaps in partial_entries excluding CC-owned lanes", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: () => false,
  });
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  for (const id of DASHBOARD_DECISION_BRAIN_GAP_SYSTEM_IDS) {
    assert.ok(gate.partial_entries.some((e) => e.system_id === id), `expected partial brain gap ${id}`);
  }
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_integrity_sentinel"));
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_quarantined_fridge_models"));
});

test("buildBrainIntegrityGateV1 allowed_bypass uses default manifest bypass reason only", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  const gate = buildBrainIntegrityGateV1({ manifest, now: () => new Date("2026-05-18T12:00:00.000Z") });
  assert.ok(gate.allowed_bypass_entries.length > 0);
  assert.ok(
    gate.allowed_bypass_entries.every((e) => e.reason === MANIFEST_DEFAULT_BYPASS_REASON),
  );
});
