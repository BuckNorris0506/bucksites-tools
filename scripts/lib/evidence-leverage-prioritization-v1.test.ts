import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  EVIDENCE_LEVERAGE_PRIORITIZATION_ALLOWED_WRITE_REL_PATHS_V1,
  EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1,
  buildEvidenceLeveragePrioritizationV1,
  writeEvidenceLeveragePrioritizationArtifactsV1,
} from "./evidence-leverage-prioritization-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/evidence-leverage-prioritization-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-evidence-leverage-prioritization-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

test("contract and read-only flags", () => {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.contract, EVIDENCE_LEVERAGE_PRIORITIZATION_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
  assert.equal(report.mutation_authorized, false);
});

test("deterministic ranking across repeated builds", () => {
  const first = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  const second = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });

  const firstKeys = first.top_50_highest_leverage_evidence_targets.map((row) => row.target_key);
  const secondKeys = second.top_50_highest_leverage_evidence_targets.map((row) => row.target_key);
  assert.deepEqual(secondKeys, firstKeys);

  const firstScores = first.top_50_highest_leverage_evidence_targets.map(
    (row) => row.estimated_factory_unlock_score,
  );
  const secondScores = second.top_50_highest_leverage_evidence_targets.map(
    (row) => row.estimated_factory_unlock_score,
  );
  assert.deepEqual(secondScores, firstScores);
});

test("top unlock targets reproducible", () => {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  const top3 = report.top_50_highest_leverage_evidence_targets.slice(0, 3);

  assert.equal(top3[0]?.family_key, "filter::frigidaire::eptwfu01");
  assert.equal(top3[0]?.models_unlocked_if_completed, 21);
  assert.equal(top3[0]?.estimated_factory_unlock_score, 2110);
  assert.equal(top3[0]?.evidence_gap_type, "EVIDENCE_CLONE_FROM_FAMILY_ANCHOR");

  const fppwfu01 = report.filter_families.find(
    (row) => row.family_key === "filter::frigidaire::fppwfu01",
  );
  assert.ok(fppwfu01);
  assert.equal(fppwfu01!.currently_proven_count, 0);
  assert.ok(fppwfu01!.prefix_contamination_count > 0);
  assert.equal(fppwfu01!.zero_proven_anchor_penalty_applied, true);
  assert.ok(fppwfu01!.estimated_factory_unlock_score < 2000);

  assert.equal(top3[1]?.family_key, "filter::frigidaire::wf2cb");
  assert.equal(top3[1]?.models_unlocked_if_completed, 20);
  assert.equal(top3[1]?.estimated_factory_unlock_score, 2000);

  assert.equal(top3[2]?.family_key, "filter::frigidaire::frig-242017801");
  assert.equal(top3[2]?.models_unlocked_if_completed, 19);
  assert.equal(top3[2]?.estimated_factory_unlock_score, 1900);

  assert.equal(report.top_20_filters_by_page_unlock_potential[0]?.family_key, "filter::frigidaire::eptwfu01");
  assert.equal(report.top_20_model_families_by_page_unlock_potential[0]?.family_key, "model::samsung::RF28");
});

test("filter::frigidaire::fppwfu01 is not highest safe non-frozen family after contamination penalty", () => {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  const fppwfu01 = report.filter_families.find(
    (row) => row.family_key === "filter::frigidaire::fppwfu01",
  );
  assert.ok(fppwfu01);
  assert.ok(fppwfu01!.prefix_contamination_count >= 8);
  assert.equal(fppwfu01!.zero_proven_anchor_penalty_applied, true);

  const safeTargets = report.top_50_highest_leverage_evidence_targets.filter(
    (row) =>
      row.wrong_part_risk_count === 0 &&
      row.blocked_count === 0 &&
      !(row.currently_proven_count === 0 && row.prefix_contamination_count > 0),
  );
  assert.notEqual(safeTargets[0]?.family_key, "filter::frigidaire::fppwfu01");
});

test("cumulative unlock counts valid", () => {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  const curve = report.cumulative_unlock_curve;

  assert.equal(curve.length, 4);
  assert.deepEqual(
    curve.map((point) => point.top_n),
    [1, 5, 10, 25],
  );

  for (let index = 1; index < curve.length; index += 1) {
    assert.ok(
      curve[index]!.cumulative_unique_models_unlocked >=
        curve[index - 1]!.cumulative_unique_models_unlocked,
      "cumulative unlock curve must be monotonic",
    );
  }

  const top25 = curve.find((point) => point.top_n === 25);
  assert.ok(top25);
  assert.ok(top25.cumulative_unique_models_unlocked <= report.total_unlockable_model_count);
  assert.ok(top25.cumulative_unique_models_unlocked > 0);

  const top1 = curve.find((point) => point.top_n === 1);
  assert.ok(top1);
  assert.equal(
    top1.cumulative_unique_models_unlocked,
    report.top_50_highest_leverage_evidence_targets[0]?.models_unlocked_if_completed,
  );
});

test("read-only guard", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge/batch-production/page-factory-targets-v1.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
    assert.equal(REPORT_SOURCE.includes(needle), false, `report must not write ${needle}`);
  }

  for (const allowed of EVIDENCE_LEVERAGE_PRIORITIZATION_ALLOWED_WRITE_REL_PATHS_V1) {
    assert.ok(LIB_SOURCE.includes(allowed), `lib must reference allowed write path ${allowed}`);
  }
});

test("write-artifacts only writes allowed audit paths", () => {
  const report = buildEvidenceLeveragePrioritizationV1({ rootDir: ROOT, now: FIXED_NOW });
  const paths = writeEvidenceLeveragePrioritizationArtifactsV1({ rootDir: ROOT, report });
  assert.ok(existsSync(path.join(ROOT, paths.jsonRelPath)));
  assert.ok(existsSync(path.join(ROOT, paths.mdRelPath)));
});
