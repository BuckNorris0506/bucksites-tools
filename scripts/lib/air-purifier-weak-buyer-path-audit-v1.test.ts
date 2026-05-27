import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AIR_PURIFIER_WEAK_BUYER_PATH_AUDIT_CONTRACT_V1,
  buildAirPurifierWeakBuyerPathAuditV1Report,
} from "./air-purifier-weak-buyer-path-audit-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 } from "./buckparts-batch-production-operating-checklist-v1";

const REPO_ROOT = process.cwd();

test("weak buyer path audit is read-only", () => {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  assert.equal(report.contract, AIR_PURIFIER_WEAK_BUYER_PATH_AUDIT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.are_weak_filters_proven_unavailable, "UNKNOWN");
});

test("linked filter counts align with model-first lane", () => {
  const audit = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  assert.equal(audit.linked_filter_count, lane.linked_filter_count);
  assert.equal(audit.safe_direct_buyable_filter_count, lane.linked_filter_safe_cta_count);
  assert.equal(audit.weak_linked_filter_count, lane.linked_filter_blocked_or_unknown_count);
  assert.equal(
    audit.safe_direct_buyable_filter_count + audit.weak_linked_filter_count,
    audit.linked_filter_count,
  );
});

test("weak filter rows do not claim unavailability and do not claim SAFE", () => {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  for (const row of report.weak_linked_filters) {
    assert.equal(row.do_not_claim_unavailable, true);
    assert.notEqual(row.buyer_path_weakness_class, "SAFE_DIRECT_BUYABLE" as never);
    assert.ok(row.why_not_safe_direct_buyable.length > 10);
  }
});

test("weakness classes are derived from repo retailer_links and batch-v3", () => {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  assert.ok(report.search_placeholder_primary_count > 0);
  assert.ok(
    report.proven_facts.some((f) => f.includes("SEARCH_PLACEHOLDER_PRIMARY") || f.includes("search-placeholder")),
  );
  const batchBacked = report.weak_linked_filters.filter((r) => r.batch_v3_evidence_status != null);
  assert.ok(batchBacked.length >= 1);
});

test("report produces recommended next action and top 10 lists", () => {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  assert.ok(report.recommended_next_action.length > 40);
  assert.equal(report.top_10_weak_filters_by_model_coverage.length, 10);
  assert.equal(report.top_10_weak_filters_by_evidence_priority.length, 10);
  assert.ok(report.weak_model_coverage_count > 0);
});

test("read-only build does not mutate CSVs or dispatch-runs", () => {
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

  buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content);
  }
});

test("safe filters are excluded from weak_linked_filters", () => {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const weakSlugs = new Set(report.weak_linked_filters.map((r) => r.filter_slug));
  for (const slug of report.safe_direct_buyable_filters) {
    assert.ok(!weakSlugs.has(slug), `safe slug ${slug} must not appear in weak list`);
  }
});
