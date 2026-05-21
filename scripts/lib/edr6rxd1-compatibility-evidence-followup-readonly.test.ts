import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

const REPO_ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  "data/evidence/edr6rxd1-compatibility-evidence-followup-readonly.2026-05-21.json",
);

test("edr6rxd1 follow-up evidence stays read-only and evidence_needed", () => {
  const raw = readFileSync(EVIDENCE_PATH, "utf8");
  assert.ok(!/data\/retailer_links\.csv/.test(raw));
  assert.ok(!/INSERT\s+INTO/i.test(raw));
  assert.ok(!raw.includes('"mutation_ready": true'));

  const doc = JSON.parse(raw) as {
    mutation_ready: boolean;
    catalog_import_ready: boolean;
    data_mutation: boolean;
    recommended_outcome: string;
    proven_model_numbers: string[];
    repo_model_matches: unknown[];
    verdicts: {
      compatible_refrigerator_models: { label: string };
      wf_nl120v_wf_l200v: { label: string };
    };
  };

  assert.equal(doc.mutation_ready, false);
  assert.equal(doc.data_mutation, false);
  assert.equal(doc.catalog_import_ready, false);
  assert.equal(doc.recommended_outcome, "evidence_needed");
  assert.equal(doc.proven_model_numbers.length, 0);
  assert.equal(doc.repo_model_matches.length, 0);
  assert.equal(doc.verdicts.compatible_refrigerator_models.label, "UNKNOWN");
  assert.match(doc.verdicts.wf_nl120v_wf_l200v.label, /PROVEN/);
  assert.notEqual(doc.recommended_outcome, "ready_for_catalog_import_plan");
  assert.notEqual(doc.recommended_outcome, "alias_collision_hold");
});

test("edr6rxd1 follow-up does not imply catalog CSV edits", () => {
  const filters = readFileSync(path.join(REPO_ROOT, "data/filters.csv"), "utf8");
  const compat = readFileSync(
    path.join(REPO_ROOT, "data/compatibility_mappings.csv"),
    "utf8",
  );

  assert.ok(!/^whirlpool,edr6rxd1,/m.test(filters));
  assert.ok(!/,(edr6rxd1|edr6d1)$/m.test(compat));
});

test("factory Exa merge still evidence_needed for edr6rxd1 with manifest", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });
  const row = report.top_candidates.find((c) => c.slug === "edr6rxd1");
  assert.ok(row);
  assert.equal(row!.factory_state, "evidence_needed");
});
