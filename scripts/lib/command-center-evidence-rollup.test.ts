import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { buildEvidenceInventoryV1, rollupEvidenceDirectory } from "./command-center-evidence-rollup";

test("rollupEvidenceDirectory recent_evidence_filenames are lexicographic descending by filename", () => {
  const evidenceDirAbs = path.resolve(process.cwd(), "data/evidence");
  const rollup = rollupEvidenceDirectory({
    evidenceDirAbs,
    fileExists: () => true,
    readDir: () => ["b-live-outcome.json", "a-unknown-outcome.json", "z-live-outcome.json"],
  });
  assert.deepEqual(rollup.recent_evidence_filenames, [
    "z-live-outcome.json",
    "b-live-outcome.json",
    "a-unknown-outcome.json",
  ]);
});

test("buildEvidenceInventoryV1 body mapping counts parse errors without throwing", () => {
  const rootDir = process.cwd();
  const inv = buildEvidenceInventoryV1({
    rootDir,
    fileExists: (p) => p.endsWith("data/evidence"),
    readDir: (p) => {
      if (p.endsWith("data/evidence")) return ["bad.json", "good.json"];
      return [];
    },
    readTextFile: (p) => {
      if (p.endsWith("bad.json")) return "not json";
      if (p.endsWith("good.json")) {
        return JSON.stringify({
          scope: "refrigerator_water",
          token: "ABC",
          filter_slug: "lt600p",
          generated_at: "2026-05-03",
        });
      }
      return "{}";
    },
  });
  assert.equal(inv.contract, "evidence_inventory_v1");
  assert.equal(inv.data_evidence.recent_ordering, "lexicographic_by_filename");
  assert.equal(inv.data_evidence.total_json_files, 2);
  assert.equal(inv.data_evidence.body_mapping.parse_error_count, 1);
  assert.equal(inv.data_evidence.body_mapping.parsed_ok_count, 1);
  assert.equal(inv.data_evidence.body_mapping.mapped_count, 1);
  assert.equal(inv.data_evidence.body_mapping.unmapped_count, 0);
  assert.equal(inv.data_evidence.body_mapping.by_scope["refrigerator_water"], 1);
  assert.equal(inv.data_evidence.body_mapping.by_token["ABC"], 1);
  assert.equal(inv.data_evidence.body_mapping.by_filter_slug.lt600p, 1);
  assert.ok(
    inv.data_evidence.unknown_facts.some((f) => f.toLowerCase().includes("lexicographic")),
    "unknown_facts must state filename ordering semantics",
  );
  assert.ok(
    inv.data_evidence.unknown_facts.some((f) => f.includes("Filename outcome")),
    "unknown_facts must state filename buckets are not verdicts",
  );
});

test("buildEvidenceInventoryV1 maps only declared safe keys — report_name alone stays unmapped", () => {
  const inv = buildEvidenceInventoryV1({
    rootDir: process.cwd(),
    fileExists: (p) => p.endsWith("data/evidence"),
    readDir: () => ["only-name.json"],
    readTextFile: () =>
      JSON.stringify({
        report_name: "x",
        generated_at: "2026-01-01",
        filter_id: "063a6122-c85f-4332-92c0-0d8e53dc5d4c",
      }),
  });
  assert.equal(inv.data_evidence.body_mapping.parsed_ok_count, 1);
  assert.equal(inv.data_evidence.body_mapping.mapped_count, 0);
  assert.equal(inv.data_evidence.body_mapping.unmapped_count, 1);
  assert.deepEqual(inv.data_evidence.body_mapping.by_scope, {});
  assert.deepEqual(inv.data_evidence.body_mapping.by_token, {});
  assert.deepEqual(inv.data_evidence.body_mapping.by_filter_slug, {});
});
