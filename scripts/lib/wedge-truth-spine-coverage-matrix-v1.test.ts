import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1 } from "./air-purifier-truth-spine-v1";
import { FRIDGE_TRUTH_SPINE_CONTRACT_V1 } from "./fridge-truth-spine-v1";
import {
  WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1,
  buildWedgeTruthSpineCoverageMatrixV1,
} from "./wedge-truth-spine-coverage-matrix-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/retailer_links.csv",
  "data/air-purifier/retailer_links.csv",
  "data/whole-house-water/retailer_links.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "data/whole-house-water/batch-production/agent-results-buyer-path-v1/whw-buyer-path-3m-ap811-batch-v1.results.json",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

test("report is read_only true and data_mutation false", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, WEDGE_TRUTH_SPINE_COVERAGE_MATRIX_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("fridge is detected as having fridge_truth_spine_v1", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  const fridge = report.wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.ok(fridge);
  assert.equal(fridge!.has_formal_truth_spine, true);
  assert.equal(fridge!.truth_spine_contract_name, FRIDGE_TRUTH_SPINE_CONTRACT_V1);
  assert.equal(fridge!.truth_coverage_status, "FORMAL_SPINE");
  assert.ok(fridge!.proven_lane_refs.some((r) => r.includes("fridge-truth-spine-v1")));
});

test("AP has air_purifier_truth_spine_v1 formal spine not fridge contract", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  const ap = report.wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.ok(ap);
  assert.equal(ap!.has_formal_truth_spine, true);
  assert.equal(ap!.truth_spine_contract_name, AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1);
  assert.notEqual(ap!.truth_spine_contract_name, FRIDGE_TRUTH_SPINE_CONTRACT_V1);
  assert.equal(ap!.truth_coverage_status, "FORMAL_SPINE");
  assert.equal(getVerticalLaunchState("air-purifier"), "LIVE");
  assert.ok(ap!.has_safe_cta_queue_or_batch_director);
  assert.ok(ap!.has_model_first_evidence_lane);
  assert.ok(ap!.proven_lane_refs.some((r) => r.includes("air-purifier-truth-spine-v1")));
});

test("WHW director and evidence lanes are partial operational proof not formal spine", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  const whw = report.wedges.find((w) => w.wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water);
  assert.ok(whw);
  assert.equal(whw!.has_formal_truth_spine, false);
  assert.equal(whw!.truth_spine_contract_name, "UNKNOWN");
  assert.equal(whw!.truth_coverage_status, "PARTIAL_OPERATIONAL_PROOF");
  assert.equal(whw!.has_safe_cta_queue_or_batch_director, true);
  assert.equal(whw!.has_buyer_path_proof_lane, true);
  assert.equal(whw!.has_browser_truth_lane, true);
  assert.equal(whw!.has_model_first_evidence_lane, true);
  assert.equal(whw!.has_apply_plan_lane, true);
  assert.equal(whw!.current_public_opening_authorized, false);
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
});

test("sample-only wedges remain SAMPLE_ONLY", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  for (const wedge of [
    HOMEKEEP_WEDGE_CATALOG.vacuum,
    HOMEKEEP_WEDGE_CATALOG.humidifier,
    HOMEKEEP_WEDGE_CATALOG.appliance_air,
  ] as const) {
    const row = report.wedges.find((w) => w.wedge === wedge);
    assert.ok(row, wedge);
    assert.equal(row!.truth_coverage_status, "SAMPLE_ONLY");
    assert.equal(row!.safe_cta_count_from_committed_csv, "UNKNOWN");
    assert.equal(row!.has_formal_truth_spine, false);
    assert.equal(row!.current_public_opening_authorized, false);
  }
});

test("inspect_summary exposes WHW truth spine gap and AP formal spine", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  const s = report.inspect_summary;
  assert.equal(s.wedges_with_formal_spine_count, 2);
  assert.equal(s.ap_truth_spine_gap_present, false);
  assert.ok(s.whw_truth_spine_gap_present);
  assert.equal(
    s.wedges_public_but_without_formal_spine.includes(HOMEKEEP_WEDGE_CATALOG.air_purifier),
    false,
  );
  assert.ok(s.wedges_partial_operational_proof.includes(HOMEKEEP_WEDGE_CATALOG.whole_house_water));
  assert.ok(s.wedges_preview_or_sample_only.length >= 3);
  assert.ok(s.recommended_next_action.length > 20);
  assert.ok(s.recommended_jq_paths.command_center.includes("inspect_summary"));
});

test("matrix does not claim all wedges equally proven", () => {
  const report = buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });
  const statuses = new Set(report.wedges.map((w) => w.truth_coverage_status));
  assert.ok(statuses.size >= 3);
  assert.ok(
    report.inferred_facts.some(
      (f) =>
        f.includes("WHW batch director") ||
        f.includes("Sample-only wedges") ||
        f.includes("PUBLIC_BUT_SPINE_GAP"),
    ),
  );
  assert.ok(report.proven_facts.some((f) => f.includes("wedges_with_formal_spine_count=2")));
});

test("read-only build does not mutate forbidden paths", () => {
  const csvBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => p.endsWith(".csv")).map((p) => [
      p,
      readFileSync(path.join(REPO_ROOT, p), "utf8"),
    ]),
  );
  const mtimesBefore = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);

  buildWedgeTruthSpineCoverageMatrixV1({ rootDir: REPO_ROOT });

  for (const [p, content] of csvBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});
