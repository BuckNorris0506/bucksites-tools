import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuckpartsOperatingMapV1,
  countBuckpartsScriptsFromPackageJson,
  OPERATING_MAP_REPORT_NAME,
  OPERATING_MAP_SYSTEMS_V1,
  validateOperatingSystem,
} from "./lib/buckparts-operating-map-v1";
import { runReportBuckpartsOperatingMap } from "./report-buckparts-operating-map";

const SAMPLE_PKG = JSON.stringify({
  scripts: {
    "buckparts:a": "tsx a.ts",
    "buckparts:b": "tsx b.ts",
    "build": "next build",
  },
});

test("countBuckpartsScriptsFromPackageJson counts buckparts: prefix only", () => {
  assert.equal(countBuckpartsScriptsFromPackageJson(SAMPLE_PKG), 2);
  assert.equal(countBuckpartsScriptsFromPackageJson("not json"), "unknown");
});

test("buildBuckpartsOperatingMapV1 shape and mermaid prefix", () => {
  const map = buildBuckpartsOperatingMapV1({
    generated_at: "2026-01-01T00:00:00.000Z",
    packageJsonText: SAMPLE_PKG,
    repoRoot: process.cwd(),
  });
  assert.equal(map.report_name, OPERATING_MAP_REPORT_NAME);
  assert.equal(map.read_only, true);
  assert.equal(map.data_mutation, false);
  assert.equal(map.buckparts_npm_script_count, 2);
  assert.ok(Array.isArray(map.systems));
  assert.ok(map.systems.length >= 10);
  assert.ok(map.mermaid_graph.startsWith("flowchart TD"));
  assert.ok(map.mermaid_graph.includes("Founder / Jared"));
  assert.ok(typeof map.founder_burden_summary.systems_total === "number");
  assert.equal(map.founder_burden_summary.systems_total, map.systems.length);
  assert.ok(map.founder_burden_summary.top_5_copy_paste_sources.length === 5);
  assert.ok(map.recommended_next_move.includes("operator-proof"));
  for (const s of map.systems) {
    assert.deepEqual(validateOperatingSystem(s), []);
  }
});

test("all curated system ids are unique", () => {
  const ids = OPERATING_MAP_SYSTEMS_V1.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("runReportBuckpartsOperatingMap returns systems", () => {
  const m = runReportBuckpartsOperatingMap();
  assert.equal(m.report_name, OPERATING_MAP_REPORT_NAME);
  assert.ok(m.systems.length > 0);
});
