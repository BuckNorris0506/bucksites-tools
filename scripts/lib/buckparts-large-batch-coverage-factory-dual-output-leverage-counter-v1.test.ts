import assert from "node:assert/strict";
import test from "node:test";

import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";
import type { LoadExaDiscoveryForFactoryResultV1 } from "@/lib/coverage/exa-discovery-factory-merge-v1";
import { resetFridgeAdapterAuditCacheV1 } from "@/lib/coverage-factory/adapters/fridge-coverage-factory-adapter-v1";
import { buildUcfDecisionAuthoritySnapshotV1 } from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";
import { isUcfPromotionDispositionV1 } from "@/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1";

import { buildTopCandidatesUcfDispositionV1 } from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";
import {
  buildGoatC1DualOutputLeverageCounterV1,
  emptyGoatC1DualOutputLeverageCounterV1,
  GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1,
  isClearlyBlockedExpansionFactoryStateV1,
  isExpansionLabelMisleadingWithoutUcfV1,
} from "./buckparts-large-batch-coverage-factory-dual-output-leverage-counter-v1";
import {
  buildLargeBatchCoverageFactorySummaryV1,
  UCF_DISPOSITION_AUTHORITY_V1,
} from "./buckparts-large-batch-coverage-factory-summary-v1";

const REPO_ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

function missingExaDiscoveryLoadResultV1(): LoadExaDiscoveryForFactoryResultV1 {
  return {
    manifest: null,
    candidates: [],
    source_summary: {
      status: "MISSING",
      path: null,
      manifest_path: "data/discovery/exa/fridge-water/manifest.v1.json",
      run_id: null,
      row_count: 0,
      merged_into_factory_count: 0,
      evidence_needed_count: 0,
      blocked_count: 0,
      omitted_live_slug_count: 0,
    },
  };
}

test("leverage counter contract is read-only and non-mutating", () => {
  const empty = emptyGoatC1DualOutputLeverageCounterV1();
  assert.equal(empty.contract, GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1);
  assert.equal(empty.read_only, true);
  assert.equal(empty.data_mutation, false);
  assert.equal(empty.measurable, false);
  assert.equal(empty.cohort_row_count, 0);

  const counter = buildGoatC1DualOutputLeverageCounterV1({
    topCandidates: [{ slug: "edr4rxd1", factory_state: "existing_live_product" }],
    ucfDispositionRows: [
      {
        slug: "edr4rxd1",
        ucf_registered: true,
        ucf_subject_id: "refrigerator_water:filter:edr4rxd1",
        ucf_core_disposition: "suppressed",
        ucf_adapter_state: "fixture",
        ucf_evidence_summary: null,
        ucf_truth_blockers: null,
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
        promotion_from_factory_state_alone: false,
      },
    ],
  });
  assert.equal(counter.read_only, true);
  assert.equal(counter.data_mutation, false);
});

test("blocked_do_not_publish never counts as misleading expansion label", () => {
  assert.ok(isClearlyBlockedExpansionFactoryStateV1("blocked_do_not_publish"));
  for (const disposition of [
    "suppressed",
    "research_identity",
    "ready_for_planning",
    "mapping_review",
  ] as const) {
    assert.equal(
      isExpansionLabelMisleadingWithoutUcfV1({
        factory_state: "blocked_do_not_publish",
        ucf_core_disposition: disposition,
        ucf_registered: true,
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
      }),
      false,
    );
  }

  const counter = buildGoatC1DualOutputLeverageCounterV1({
    topCandidates: [{ slug: "frozen-slug", factory_state: "blocked_do_not_publish" }],
    ucfDispositionRows: [
      {
        slug: "frozen-slug",
        ucf_registered: true,
        ucf_subject_id: "refrigerator_water:filter:frozen-slug",
        ucf_core_disposition: "suppressed",
        ucf_adapter_state: null,
        ucf_evidence_summary: null,
        ucf_truth_blockers: null,
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
        promotion_from_factory_state_alone: false,
      },
    ],
  });
  assert.equal(counter.expansion_label_would_mislead_count, 0);
  assert.deepEqual(counter.expansion_label_would_mislead_slugs, []);
});

test("publishable factory_state with UCF promotion does not count as promotion prevented", () => {
  const counter = buildGoatC1DualOutputLeverageCounterV1({
    topCandidates: [{ slug: "fixture", factory_state: "publishable_amazon_candidate" }],
    ucfDispositionRows: [
      {
        slug: "fixture",
        ucf_registered: true,
        ucf_subject_id: "refrigerator_water:filter:fixture",
        ucf_core_disposition: "ready_for_planning",
        ucf_adapter_state: null,
        ucf_evidence_summary: null,
        ucf_truth_blockers: null,
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
        promotion_from_factory_state_alone: false,
      },
    ],
  });
  assert.equal(counter.expansion_label_would_mislead_count, 0);
  assert.equal(counter.promotion_prevented_by_ucf_count, 0);
});

test("publishable factory_state with UCF research counts as misleading and promotion prevented", () => {
  const counter = buildGoatC1DualOutputLeverageCounterV1({
    topCandidates: [{ slug: "fixture", factory_state: "publishable_amazon_candidate" }],
    ucfDispositionRows: [
      {
        slug: "fixture",
        ucf_registered: true,
        ucf_subject_id: "refrigerator_water:filter:fixture",
        ucf_core_disposition: "research_buyer_path",
        ucf_adapter_state: null,
        ucf_evidence_summary: null,
        ucf_truth_blockers: null,
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
        promotion_from_factory_state_alone: false,
      },
    ],
  });
  assert.equal(counter.expansion_label_would_mislead_count, 1);
  assert.equal(counter.promotion_prevented_by_ucf_count, 1);
  assert.equal(counter.suppression_or_research_clarified_by_ucf_count, 1);
  assert.equal(counter.operator_review_simplification_count, 1);
});

test("live repo top cohort drives leverage counter slugs", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 5,
    loadExaDiscovery: () => missingExaDiscoveryLoadResultV1(),
  });
  const topCandidates = report.top_candidates.slice(0, 5).map((c) => ({
    slug: c.slug,
    factory_state: c.factory_state,
  }));
  assert.ok(topCandidates.length > 0, "repo must expose a live top cohort");

  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: REPO_ROOT, now: FIXED_NOW });
  const ucfDisposition = buildTopCandidatesUcfDispositionV1({
    topCandidates,
    snapshot,
  });
  const counter = buildGoatC1DualOutputLeverageCounterV1({
    topCandidates,
    ucfDispositionRows: ucfDisposition.rows,
  });

  assert.equal(counter.cohort_row_count, topCandidates.length);
  for (const slug of counter.expansion_label_would_mislead_slugs) {
    assert.ok(
      topCandidates.some((row) => row.slug === slug),
      `misleading slug ${slug} must be from live top cohort`,
    );
    assert.notEqual(slug, "fake-hardcoded-slug");
  }
});

test("summary embeds leverage counter aligned with live top cohort", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
    buildFactoryReport: (factoryDeps) =>
      buildLargeBatchCoverageFactoryReportV1({
        ...factoryDeps,
        loadExaDiscovery: () => missingExaDiscoveryLoadResultV1(),
      }),
  });
  const counter = summary.goat_c1_dual_output_leverage_counter_v1;
  assert.equal(counter.read_only, true);
  assert.equal(counter.data_mutation, false);
  assert.equal(counter.cohort_row_count, summary.top_5_candidates.length);
  assert.ok(
    summary.proven_facts.some((fact) =>
      fact.includes(GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1),
    ),
  );

  for (let i = 0; i < summary.top_5_candidates.length; i++) {
    const candidate = summary.top_5_candidates[i]!;
    const ucfRow = summary.top_5_candidates_ucf_disposition[i]!;
    if (!candidate.factory_state.startsWith("publishable_")) continue;
    if (ucfRow.ucf_core_disposition && isUcfPromotionDispositionV1(ucfRow.ucf_core_disposition)) {
      assert.equal(ucfRow.ucf_authority_source, UCF_DISPOSITION_AUTHORITY_V1);
    }
    assert.equal(ucfRow.promotion_from_factory_state_alone, false);
    if (
      counter.expansion_label_would_mislead_slugs.includes(candidate.slug) &&
      candidate.factory_state.startsWith("publishable_")
    ) {
      assert.ok(
        ucfRow.ucf_core_disposition && !isUcfPromotionDispositionV1(ucfRow.ucf_core_disposition),
      );
    }
  }
});

test("UCF snapshot failure keeps summary ATTENTION and non-throwing leverage counter", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
    buildFactoryReport: (factoryDeps) =>
      buildLargeBatchCoverageFactoryReportV1({
        ...factoryDeps,
        loadExaDiscovery: () => missingExaDiscoveryLoadResultV1(),
      }),
    buildUcfSnapshot: () => {
      throw new Error("fixture ucf snapshot failure");
    },
  });
  assert.equal(summary.runtime_status, "ATTENTION");
  const counter = summary.goat_c1_dual_output_leverage_counter_v1;
  assert.equal(counter.read_only, true);
  assert.equal(counter.measurable, false);
  assert.equal(counter.expansion_label_would_mislead_count, 0);
  assert.ok(
    summary.proven_facts.some((fact) =>
      fact.includes(`UNKNOWN: ${GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1}`),
    ),
  );
});
