import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildCommandCenterBrainCoverageManifestV1 } from "./buckparts-brain-coverage-manifest-v1";

test("buildCommandCenterBrainCoverageManifestV1 enumerates buckparts scripts from package.json", () => {
  const rootDir = process.cwd();
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir,
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: existsSync,
    readTextFile: (p) => readFileSync(p, "utf8"),
  });
  assert.equal(manifest.contract, "command_center_brain_coverage_manifest_v1");
  const cc = manifest.entries.find(
    (e) =>
      e.system_id === "buckparts_command_center" ||
      e.npm_script_or_path.includes("buckparts:command-center"),
  );
  assert.ok(cc);
  assert.equal(cc!.verdict, "CONNECTED");
  assert.ok(manifest.entries.some((e) => e.system_id === "hq_handoff_doc"));
  assert.equal(manifest.read_only, true);
  assert.equal(manifest.data_mutation, false);
  assert.ok(manifest.verdict_counts);
  assert.ok(manifest.summary);
  assert.equal(manifest.summary.total_entries, manifest.total_entries);
  assert.deepEqual(manifest.summary.verdict_counts, manifest.verdict_counts);
  assert.deepEqual(manifest.summary_by_verdict, manifest.verdict_counts);
  for (const verdict of ["CONNECTED", "PARTIAL", "BYPASSING", "DUPLICATE", "DEPRECATED", "MISSING"] as const) {
    assert.equal(typeof manifest.verdict_counts[verdict], "number");
  }
  const total = Object.values(manifest.verdict_counts).reduce((a, b) => a + b, 0);
  assert.equal(total, manifest.entries.length);
});

test("buildCommandCenterBrainCoverageManifestV1 includes CONNECTED buckparts:command-center without package.json", () => {
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: process.cwd(),
    now: () => new Date("2026-05-18T12:00:00.000Z"),
    fileExists: () => false,
  });
  const cc = manifest.entries.find((e) => e.system_id === "buckparts_command_center");
  assert.ok(cc);
  assert.equal(cc!.verdict, "CONNECTED");
  assert.equal(cc!.blocks_lane_work, false);
  assert.ok(cc!.npm_script_or_path.includes("buckparts:command-center"));
});
