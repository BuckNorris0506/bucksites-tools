import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AIR_PURIFIER_MODEL_FIRST_PRODUCTION_LANE_REPORT_NAME_V1,
  AP_BATCH_V3_RESULTS_DIR_REL_V1,
  buildAirPurifierModelFirstProductionLaneV1Report,
} from "./air-purifier-model-first-production-lane-v1";
import { BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 } from "./buckparts-batch-production-operating-checklist-v1";

const REPO_ROOT = process.cwd();

test("model-first lane report is read-only", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  assert.equal(report.contract, AIR_PURIFIER_MODEL_FIRST_PRODUCTION_LANE_REPORT_NAME_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("model and filter counts are derived from repo CSV files", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  assert.ok(report.model_count > 0);
  assert.equal(
    report.model_with_filter_count + report.model_without_filter_count,
    report.model_count,
  );
  assert.ok(report.linked_filter_count > 0);
  assert.ok(
    report.proven_facts.some((f) => f.includes("models.csv")),
  );
});

test("candidate rows do not claim SAFE without PROVEN buyer_path_status", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  for (const row of report.candidate_rows) {
    assert.notEqual(row.buyer_path_status, "SAFE_DIRECT_BUYABLE");
    if (row.confidence === "PROVEN" && row.buyer_path_status === "UNKNOWN") {
      assert.fail("UNKNOWN buyer path cannot be PROVEN confidence");
    }
  }
});

test("AP batch-v3 comparison uses committed result artifacts", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const cmp = report.comparison_to_filter_first_batch_v3;
  assert.equal(cmp.results_dir, AP_BATCH_V3_RESULTS_DIR_REL_V1);
  assert.equal(cmp.filter_first_candidates_checked, 17);
  assert.equal(cmp.safe_csv_mutations, 0);
  assert.ok(cmp.evidence_status_counts.UNKNOWN >= 1);
  assert.ok(cmp.dominant_packet_patterns.includes("oem_search_placeholder_rescue"));
  assert.ok(["PROMISING", "UNKNOWN", "NOT_PROVEN"].includes(cmp.model_first_verdict));
});

test("report produces recommended next action", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  assert.ok(report.recommended_next_action.length > 20);
  assert.ok(report.model_first_candidate_count === report.candidate_rows.length);
});

test("read-only build does not mutate product CSV retailer_links dispatch-runs", () => {
  const csvBefore = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  const linksBefore = readFileSync(`${REPO_ROOT}/data/air-purifier/filters.csv`, "utf8");
  const dispatchDir = path.join(REPO_ROOT, BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1);
  const dispatchBefore = new Map<string, string>();
  for (const name of readdirSync(dispatchDir)) {
    if (name.endsWith(".json")) {
      dispatchBefore.set(name, readFileSync(path.join(dispatchDir, name), "utf8"));
    }
  }

  buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });

  assert.equal(readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8"), csvBefore);
  assert.equal(readFileSync(`${REPO_ROOT}/data/air-purifier/filters.csv`, "utf8"), linksBefore);
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content);
  }
});

test("brand summary ranks opportunity", () => {
  const report = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  assert.ok(report.brand_summary.length >= 1);
  assert.ok(report.brand_summary[0]!.model_first_opportunity_score >= 0);
});
