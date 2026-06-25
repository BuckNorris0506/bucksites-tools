import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  LARGE_BATCH_COVERAGE_FACTORY_STATES_V1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  assertGoatC1LbcfUcfTaxonomyBridgeSafetyInvariantsV1,
  assertLbcfBridgeKnownV1,
  buildGoatC1LbcfUcfTaxonomyBridgeReportV1,
  compareLbcfUcfOverlappingFridgeSubjectsV1,
  GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1,
  LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1,
  lbcfBridgePermitsUcfDispositionV1,
  lookupLbcfUcfTaxonomyBridgeRowV1,
} from "./goat-c1-lbcf-ucf-taxonomy-bridge-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("bridge matrix inventories every LBCF factory_state", () => {
  assert.equal(LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1.length, LARGE_BATCH_COVERAGE_FACTORY_STATES_V1.length);
  for (const factoryState of LARGE_BATCH_COVERAGE_FACTORY_STATES_V1) {
    assertLbcfBridgeKnownV1(factoryState);
    const row = lookupLbcfUcfTaxonomyBridgeRowV1(factoryState);
    assert.ok(row.current_meaning.length > 0);
    assert.ok(row.ucf_core_disposition_equivalent.length > 0);
  }
});

test("unknown factory_state mappings fail closed", () => {
  assert.throws(() => lookupLbcfUcfTaxonomyBridgeRowV1("not_a_state" as never), /fail closed/);
  assert.equal(
    lbcfBridgePermitsUcfDispositionV1({
      factory_state: "existing_live_product",
      ucf_core_disposition: "ready_for_change_planning",
    }),
    null,
  );
  assert.equal(
    lbcfBridgePermitsUcfDispositionV1({
      factory_state: "blocked_do_not_publish",
      ucf_core_disposition: "ready_for_change_planning",
    }),
    false,
  );
});

test("proven blocked state only permits suppressed disposition", () => {
  const bridge = lookupLbcfUcfTaxonomyBridgeRowV1("blocked_do_not_publish");
  assert.equal(bridge.mapping_confidence, "PROVEN");
  assert.deepEqual(bridge.allowed_ucf_dispositions, ["suppressed"]);
  assert.equal(bridge.forbids_promotion_from_state_alone, true);
});

test("overlap comparison satisfies safety invariants on registered fridge subjects", () => {
  const comparison = compareLbcfUcfOverlappingFridgeSubjectsV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(comparison.overlapping_slug_count, 29);
  assert.equal(comparison.compared_row_count, 29);
  assertGoatC1LbcfUcfTaxonomyBridgeSafetyInvariantsV1(comparison);
  assert.equal(comparison.promotion_from_state_alone_violation_count, 0);
  assert.equal(comparison.suppressed_became_actionable_count, 0);
  assert.equal(comparison.planning_lost_owner_review_count, 0);
});

test("no wrong promotion from LBCF state to UCF disposition on forbidding states", () => {
  const comparison = compareLbcfUcfOverlappingFridgeSubjectsV1({ rootDir: ROOT, now: FIXED_NOW });
  const forbiddingStates = LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1.filter(
    (row) => row.forbids_promotion_from_state_alone,
  ).map((row) => row.factory_state);

  for (const row of comparison.rows) {
    if (row.lbcf_factory_state === "MISSING_FROM_LBCF") continue;
    if (!forbiddingStates.includes(row.lbcf_factory_state)) continue;
    assert.ok(
      !["ready_for_change_planning", "candidate_apply", "covered"].includes(row.ucf_core_disposition),
      `${row.slug}: ${row.lbcf_factory_state} must not promote to ${row.ucf_core_disposition}`,
    );
  }
});

test("planning and owner-review subjects retain requires_owner_review", () => {
  const comparison = compareLbcfUcfOverlappingFridgeSubjectsV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const row of comparison.rows) {
    if (
      row.ucf_core_disposition !== "ready_for_change_planning" &&
      row.ucf_core_disposition !== "owner_review"
    ) {
      continue;
    }
    assert.equal(
      row.ucf_requires_owner_review,
      true,
      `${row.slug} (${row.ucf_core_disposition}) must require owner review`,
    );
  }
});

test("full bridge report is read-only with GOAT C1 taxonomy verdict", () => {
  const report = buildGoatC1LbcfUcfTaxonomyBridgeReportV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(report.contract, GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.can_merge_lbcf_factory_state_into_ucf_today, false);
  assert.equal(report.safe_to_commit_verdict, "SAFE_TO_COMMIT");
  assert.ok(report.states_proven_bridgeable.includes("blocked_do_not_publish"));
  assert.ok(report.states_proven_bridgeable.includes("evidence_needed"));
  assert.ok(report.states_not_bridgeable.includes("existing_live_product"));
  assert.equal(report.goat_c1_readiness_verdict, "NOT_READY_TAXONOMY_INCOMPLETE");
  assert.equal(report.overlap_comparison.violation_count, 0);
});
