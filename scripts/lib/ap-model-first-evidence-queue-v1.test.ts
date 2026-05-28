import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  buildApModelFirstEvidenceQueueV1Report,
  isModelFirstSteeringPrimaryEligibleV1,
} from "./ap-model-first-evidence-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./air-purifier-weak-buyer-path-audit-v1";
import { BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 } from "./buckparts-batch-production-operating-checklist-v1";

const REPO_ROOT = process.cwd();

test("model-first evidence queue is read-only", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  assert.equal(report.contract, AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("holmes-hapf30 demoted after committed live-browser no-mutation result", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  assert.ok(
    report.result_history.no_mutation_completed_filter_slugs.includes("holmes-hapf30"),
    "expected holmes-hapf30 in no_mutation_completed_filter_slugs",
  );
  assert.ok(
    report.completed_no_mutation_candidates.some((c) => c.filter_slug === "holmes-hapf30"),
  );
  const holmesCompleted = report.completed_no_mutation_candidates.find(
    (c) => c.filter_slug === "holmes-hapf30",
  );
  assert.equal(holmesCompleted!.completion_reason, "completed_model_first_no_mutation");
  assert.ok(
    !report.top_candidates.some((c) => c.filter_slug === "holmes-hapf30"),
    "holmes-hapf30 must not appear in active top_candidates",
  );
});

test("top active candidate advances past completed holmes-hapf30", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  assert.ok(report.top_candidates.length >= 1);
  const topQueue = report.top_candidates[0]!;
  assert.notEqual(topQueue.filter_slug, "holmes-hapf30");
  assert.ok(!report.result_history.no_mutation_completed_filter_slugs.includes(topQueue.filter_slug));

  const excluded = new Set(report.result_history.no_mutation_completed_filter_slugs);
  const expectedFirstActive = weak.top_10_weak_filters_by_evidence_priority.find(
    (r) => !excluded.has(r.filter_slug),
  );
  assert.ok(expectedFirstActive);
  assert.equal(topQueue.filter_slug, expectedFirstActive!.filter_slug);
  assert.equal(topQueue.brand_slug, expectedFirstActive!.brand_slug);
  assert.equal(topQueue.model_count_using_filter, expectedFirstActive!.model_count_using_filter);
});

test("result history summary reflects committed artifacts", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  assert.ok(report.result_history.completed_result_count >= 1);
  assert.ok(report.result_history.completed_filter_slugs.includes("holmes-hapf30"));
  assert.ok(report.result_history.completed_filter_slugs.includes("winix-carbon-116131"));
  assert.ok(report.result_history.no_mutation_completed_filter_slugs.includes("winix-carbon-116131"));
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("winix completed artifact is demoted but preserved as mapping review opportunity", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  assert.ok(report.result_history.no_mutation_completed_filter_slugs.includes("winix-carbon-116131"));
  assert.ok(
    !report.top_candidates.some((c) => c.filter_slug === "winix-carbon-116131"),
    "winix-carbon-116131 should not be retried as active model-first evidence",
  );
  assert.ok(report.result_history.mapping_review_required_filter_slugs.includes("winix-carbon-116131"));
  const opp = report.mapping_review_opportunities.find((o) => o.filter_slug === "winix-carbon-116131");
  assert.ok(opp);
  assert.equal(opp!.classification, "MODEL_FILTER_MAPPING_REVIEW_REQUIRED");
  assert.ok(opp!.result_artifact_rel.includes("ap-model-first-winix-carbon-116131-live-browser-v1.results.json"));
});

test("queue does not claim products unavailable or CSV mutation safety", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  for (const row of report.top_candidates) {
    assert.equal(row.do_not_claim_unavailable, true);
  }
  assert.ok(
    report.forbidden_mutations.some((m) => m.includes("csv") || m.includes("product_csv")),
  );
  assert.ok(!report.proven_facts.some((f) => f.toLowerCase().includes("safe to apply csv")));
  if (report.recommended_packet) {
    assert.equal(report.recommended_packet.artifacts_not_written_yet, true);
  }
});

test("steering primary eligible under repo dominance condition", () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const report = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  assert.equal(
    isModelFirstSteeringPrimaryEligibleV1({
      weakBuyerPathAudit: weak,
      candidateCount: report.candidate_count,
      apBatchV3SafeCsvMutationCount: lane.comparison_to_filter_first_batch_v3.safe_csv_mutations,
    }),
    report.steering_primary_eligible,
  );
  if (weak.search_placeholder_primary_count >= 30 && report.candidate_count > 0) {
    assert.equal(lane.comparison_to_filter_first_batch_v3.safe_csv_mutations, 0);
    assert.equal(report.steering_primary_eligible, true);
  }
});

test("read-only build does not mutate CSV Supabase dispatch-run batch-review", () => {
  const csvPaths = [
    "data/air-purifier/retailer_links.csv",
    "data/air-purifier/filters.csv",
    "data/air-purifier/models.csv",
    "data/air-purifier/compatibility_mappings.csv",
  ];
  const before = new Map(csvPaths.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const dispatchDir = path.join(REPO_ROOT, BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1);
  const dispatchBefore = new Map<string, string>();
  for (const name of readdirSync(dispatchDir)) {
    if (name.endsWith(".json")) {
      dispatchBefore.set(name, readFileSync(path.join(dispatchDir, name), "utf8"));
    }
  }
  const reviewPath = path.join(
    REPO_ROOT,
    "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
  );
  const reviewBefore = readFileSync(reviewPath, "utf8");

  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content);
  }
  assert.equal(readFileSync(reviewPath, "utf8"), reviewBefore);
});
