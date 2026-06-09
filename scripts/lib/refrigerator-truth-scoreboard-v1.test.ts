import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRefrigeratorTruthScoreboardV1,
  CURSOR_VALIDATED_CORRECT_VERDICT_V1,
  PHANTOM_FILTER_SLUGS_V1,
  REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1,
} from "./refrigerator-truth-scoreboard-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/refrigerator-truth-scoreboard-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync(
  "scripts/report-refrigerator-truth-scoreboard-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

test("contract and read-only flags", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, REFRIGERATOR_TRUTH_SCOREBOARD_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
});

test("lib and report sources stay read-only", () => {
  assert.ok(!LIB_SOURCE.includes("writeFileSync"));
  assert.ok(!LIB_SOURCE.includes("mkdirSync"));
  assert.ok(!REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(!REPORT_SOURCE.includes("writeFileSync"));
});

test("total model count is 500", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.counts.total_refrigerator_model_count, 500);
});

test("classification counts align with model_filter_correctness_audit_v1 artifact", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.counts.proven_correct_count, 15);
  assert.equal(report.counts.needs_evidence_count, 409);
  assert.equal(report.counts.wrong_part_risk_count, 75);
});

test("validated_correct_count comes from cursor validation PASS rows", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.counts.validated_correct_count, 5);
  assert.deepEqual(report.hyperagent_validation_summary.validated_correct_slugs, [
    "samsung-rf27t5201sr",
    "samsung-rf27t5501sr",
    "samsung-rf28r6301sr",
    "samsung-rf28t5101sr",
    "samsung-rs22t5201sg",
  ]);
  for (const slug of report.hyperagent_validation_summary.validated_correct_slugs) {
    assert.ok(slug.startsWith("samsung-"), slug);
  }
  assert.equal(CURSOR_VALIDATED_CORRECT_VERDICT_V1, "VALIDATION_PASS_READY_FOR_OWNER_REVIEW");
});

test("phantom_model_count tracks da29-10105j mapped slugs", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(PHANTOM_FILTER_SLUGS_V1[0], "da29-10105j");
  assert.equal(report.counts.phantom_model_count, 15);
});

test("multi_mapped_count is positive", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.counts.multi_mapped_count > 0);
});

test("owner_review_required_count unions bad-mapping and reconciliation signals", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.counts.owner_review_required_count >= 76);
  assert.ok(report.hyperagent_validation_summary.cursor_validation_packets_loaded >= 5);
});

test("top_25_highest_risk_families ranked from family_reconciliation_v1", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.top_25_highest_risk_families.length, 25);
  assert.equal(
    report.top_25_highest_risk_families[0]?.family_key,
    "filter::frigidaire::eptwfu01",
  );
  assert.equal(report.top_25_highest_risk_families[0]?.severity, "CRITICAL");
  assert.ok(
    report.top_25_highest_risk_families[0]!.reconciliation_score >=
      report.top_25_highest_risk_families[1]!.reconciliation_score,
  );
});

test("top_25_highest_leverage_families ranked from evidence_leverage_prioritization_v1", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.top_25_highest_leverage_families.length, 25);
  assert.equal(
    report.top_25_highest_leverage_families[0]?.family_key,
    "filter::frigidaire::eptwfu01",
  );
  assert.equal(report.top_25_highest_leverage_families[0]?.estimated_factory_unlock_score, 2110);
  assert.ok(
    report.top_25_highest_leverage_families[0]!.estimated_factory_unlock_score >=
      report.top_25_highest_leverage_families[1]!.estimated_factory_unlock_score,
  );
});

test("deterministic output across repeated builds", () => {
  const first = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  const second = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.deepEqual(second.counts, first.counts);
  assert.deepEqual(
    second.top_25_highest_risk_families.map((row) => row.family_key),
    first.top_25_highest_risk_families.map((row) => row.family_key),
  );
  assert.deepEqual(
    second.top_25_highest_leverage_families.map((row) => row.family_key),
    first.top_25_highest_leverage_families.map((row) => row.family_key),
  );
});

test("proven_facts and unknown_facts are populated", () => {
  const report = buildRefrigeratorTruthScoreboardV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(report.proven_facts.length >= 6);
  assert.ok(report.unknown_facts.length >= 2);
  assert.ok(report.proven_facts.some((fact) => fact.startsWith("PROVEN:")));
  assert.ok(report.unknown_facts.some((fact) => fact.startsWith("UNKNOWN:")));
});
