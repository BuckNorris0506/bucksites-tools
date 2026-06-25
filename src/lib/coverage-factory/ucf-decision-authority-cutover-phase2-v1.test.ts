import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildUcfDecisionAuthorityCutoverReportV1,
  buildUcfDecisionAuthoritySnapshotV1,
  resolveUcfCoverageDispositionForRegisteredSlugV1,
} from "./ucf-decision-authority-cutover-v1";
import {
  buildUcfDecisionAuthorityCutoverPhase2ReportV1,
  UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1,
  UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1,
  UCF_GOAT_C1_CONSUMERS_V1,
} from "./ucf-decision-authority-cutover-phase2-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("phase2 audit splits remaining consumers into four classifications", () => {
  const classifications = new Set(
    UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1.map((entry) => entry.phase2_classification),
  );
  assert.ok(classifications.has("READY_FOR_UCF_NOW"));
  assert.ok(classifications.has("SHADOW_REQUIRED"));
  assert.ok(classifications.has("REQUIRES_BEHAVIOR_CHANGE"));
  assert.ok(classifications.has("NOT_A_UCF_CONSUMER"));
  assert.equal(UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1.length, 10);
});

test("resolveUcfCoverageDispositionForRegisteredSlugV1 fails closed for missing registered rows", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: ROOT, now: FIXED_NOW });
  const row = resolveUcfCoverageDispositionForRegisteredSlugV1({
    snapshot,
    filterSlug: "rpwfe",
    wedge: "refrigerator_water",
  });
  assert.equal(row!.subject_id, "refrigerator_water:filter:rpwfe");

  const tampered = {
    ...snapshot,
    factory: {
      ...snapshot.factory,
      subject_rows: snapshot.factory.subject_rows.filter((r) => r.subject_id !== row!.subject_id),
    },
  };
  assert.throws(
    () =>
      resolveUcfCoverageDispositionForRegisteredSlugV1({
        snapshot: tampered,
        filterSlug: "rpwfe",
        wedge: "refrigerator_water",
      }),
    /fail-closed/i,
  );
});

test("phase2 report lists migrated consumers and GOAT C1 blockers", () => {
  const report = buildUcfDecisionAuthorityCutoverPhase2ReportV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(report.contract, UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.mutation_authorized, false);
  assert.ok(report.migrated_this_phase.includes("fridge_buyer_path_owner_review_bridge_v1"));
  assert.ok(report.migrated_this_phase.includes("ucf_parity_audit_v1"));
  assert.ok(report.migrated_prior_phases.includes("buckparts_large_batch_coverage_factory_summary_v1"));
  assert.deepEqual(report.goat_c1_consumers, [...UCF_GOAT_C1_CONSUMERS_V1]);
  assert.equal(report.runtime_migration_percentage, 100);
  assert.equal(report.cumulative_cutover_percentage, 100);
  assert.ok(
    report.remaining_blockers.some((blocker) => blocker.includes("large_batch_coverage_factory_v1")),
  );
  assert.equal(report.safe_to_commit_verdict, "SAFE_TO_COMMIT");
});

test("cumulative cutover report reaches 100% disposition-provenance lane migration", () => {
  const report = buildUcfDecisionAuthorityCutoverReportV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.cutover_percentage, 100);
  assert.ok(
    report.consumers_migrated.some(
      (row) => row.consumer === "fridge_buyer_path_owner_review_bridge_v1",
    ),
  );
  assert.ok(!report.remaining_legacy_consumers.includes("fridge_buyer_path_owner_review_bridge_v1"));
});
