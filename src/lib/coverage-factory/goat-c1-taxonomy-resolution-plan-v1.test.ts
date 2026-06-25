import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { LARGE_BATCH_COVERAGE_FACTORY_STATES_V1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

import { resetFridgeAdapterAuditCacheV1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildGoatC1LbcfUcfTaxonomyBridgeReportV1,
} from "./goat-c1-lbcf-ucf-taxonomy-bridge-v1";
import {
  assertGoatC1DualAuthorityResolvesBridgeV1,
  buildGoatC1TaxonomyResolutionPlanReportV1,
  GOAT_C1_INTERPRETATION_RECOMMENDATION_V1,
  GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1,
  GOAT_C1_TAXONOMY_RESOLUTION_TABLE_SEED_V1,
  lookupGoatC1TaxonomyResolutionRowV1,
} from "./goat-c1-taxonomy-resolution-plan-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("resolution seed covers every factory_state", () => {
  assert.equal(
    GOAT_C1_TAXONOMY_RESOLUTION_TABLE_SEED_V1.length,
    LARGE_BATCH_COVERAGE_FACTORY_STATES_V1.length,
  );
  for (const factoryState of LARGE_BATCH_COVERAGE_FACTORY_STATES_V1) {
    const row = lookupGoatC1TaxonomyResolutionRowV1(factoryState);
    assert.ok(row.smallest_safe_resolution.length > 0);
    assert.ok(row.resolution_strategies.length >= 1);
  }
});

test("not-bridgeable states resolve without merge or founder policy", () => {
  const bridge = buildGoatC1LbcfUcfTaxonomyBridgeReportV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const factoryState of bridge.states_not_bridgeable) {
    const row = lookupGoatC1TaxonomyResolutionRowV1(factoryState);
    assert.equal(row.requires_founder_approval, false);
    assert.ok(
      row.resolution_strategies.includes("preserve_lbcf_only_expansion_taxonomy") ||
        row.resolution_strategies.includes("reclassify_not_ucf_concern") ||
        row.resolution_strategies.includes("map_via_per_subject_ucf_adapter"),
    );
  }
});

test("existing_live_product resolves via dual authority not UCF merge", () => {
  const row = lookupGoatC1TaxonomyResolutionRowV1("existing_live_product");
  assert.equal(row.bridge_mapping_confidence, "UNKNOWN");
  assert.equal(row.ucf_authority_for_disposition, true);
  assert.equal(row.lbcf_retained_for_expansion, true);
  assert.ok(row.resolution_strategies.includes("reclassify_not_ucf_concern"));
  assert.ok(row.resolution_strategies.includes("map_via_per_subject_ucf_adapter"));
});

test("publishable cohort states retain LBCF and defer disposition to UCF", () => {
  const amazon = lookupGoatC1TaxonomyResolutionRowV1("publishable_amazon_candidate");
  const waterdrop = lookupGoatC1TaxonomyResolutionRowV1("publishable_waterdrop_candidate");
  const noBuy = lookupGoatC1TaxonomyResolutionRowV1("publishable_no_buy_page");

  for (const row of [amazon, waterdrop, noBuy]) {
    assert.equal(row.lbcf_retained_for_expansion, true);
    assert.equal(row.ucf_authority_for_disposition, true);
  }
  assert.ok(amazon.resolution_strategies.includes("preserve_lbcf_only_expansion_taxonomy"));
  assert.ok(waterdrop.resolution_strategies.includes("preserve_lbcf_only_expansion_taxonomy"));
  assert.ok(noBuy.resolution_strategies.includes("reclassify_not_ucf_concern"));
});

test("full plan report recommends SPLIT_DUAL_OUTPUT and resolves bridge", () => {
  const plan = buildGoatC1TaxonomyResolutionPlanReportV1({ rootDir: ROOT, now: FIXED_NOW });

  assert.equal(plan.contract, GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.bridge_readiness_verdict_before, "NOT_READY_TAXONOMY_INCOMPLETE");
  assert.equal(plan.bridge_readiness_verdict_after_resolution, "RESOLVED_DUAL_AUTHORITY");
  assert.equal(plan.goat_c1_interpretation.recommended, "SPLIT_DUAL_OUTPUT");
  assert.equal(
    GOAT_C1_INTERPRETATION_RECOMMENDATION_V1.rejected.includes("MERGE_LBCF_INTO_UCF"),
    true,
  );
  assert.equal(plan.smallest_next_build_slice.slice_id, GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1.slice_id);
  assert.equal(plan.safe_to_commit_verdict, "SAFE_TO_COMMIT");
  assertGoatC1DualAuthorityResolvesBridgeV1(plan);
  assert.ok(plan.risks.length >= 3);
  assert.deepEqual(plan.goat_c1_consumers, [
    "large_batch_coverage_factory_v1",
    "buckparts_large_batch_coverage_factory_summary_v1",
  ]);
});

test("unknown resolution lookup fails closed", () => {
  assert.throws(
    () => lookupGoatC1TaxonomyResolutionRowV1("not_a_state" as never),
    /fail closed/,
  );
});
