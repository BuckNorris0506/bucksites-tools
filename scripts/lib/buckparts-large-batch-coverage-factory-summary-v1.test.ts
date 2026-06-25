import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLargeBatchCoverageFactorySummaryV1,
  buildLargeBatchCoverageFactorySummaryV1FromReport,
  LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1,
} from "./buckparts-large-batch-coverage-factory-summary-v1";
import {
  buildLargeBatchCoverageFactoryReportV1,
  LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
  type LargeBatchCoverageFactoryReportV1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";
import type { LoadExaDiscoveryForFactoryResultV1 } from "@/lib/coverage/exa-discovery-factory-merge-v1";
import {
  buildUcfCoverageDispositionProvenanceFactsV1,
  buildUcfDecisionAuthoritySnapshotV1,
} from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";

const REPO_ROOT = process.cwd();

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

function sampleFactoryReport(): LargeBatchCoverageFactoryReportV1 {
  return {
    report_name: LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: "2026-05-21T00:00:00.000Z",
    candidate_count: 57,
    top_candidates_limit: 5,
    top_candidates: [
      {
        candidate_key: "lt700p",
        slug: "lt700p",
        oem_part_number: "LT700P",
        brand_slug: "lg",
        factory_state: "new_product_candidate",
        priority_score: 750,
        block_reason: null,
        rationale: [],
        sources: [],
        is_live_catalog_row: false,
        is_bulk_catalog_row: true,
        has_gated_buyable_link: false,
        has_search_placeholder_only_links: false,
        waterdrop_recommended: false,
        has_amazon_live_evidence: false,
      },
    ],
    state_counts: {
      existing_live_product: 50,
      new_product_candidate: 0,
      alias_collision_candidate: 1,
      publishable_no_buy_page: 2,
      publishable_amazon_candidate: 3,
      publishable_waterdrop_candidate: 0,
      evidence_needed: 0,
      blocked_do_not_publish: 1,
    },
    blocked_counts: { total: 1, by_reason: { frozen_amazon_rescue_token: 1 } },
    source_summary: {
      live_filters_csv: { status: "PROVEN", path: "data/filters.csv", row_count: 57 },
      filter_aliases_csv: { status: "PROVEN", path: "data/filter_aliases.csv", row_count: 97 },
      retailer_links_csv: { status: "PROVEN", path: "data/retailer_links.csv", row_count: 57 },
      bulk_catalog: {
        status: "PROVEN",
        module: "src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts",
        row_count: 57,
      },
      waterdrop_operator_input: {
        status: "UNKNOWN",
        path: null,
        entry_count: 0,
        recommended_slug_count: 0,
      },
      evidence_dir: { status: "PROVEN", path: "data/evidence", file_count: 37 },
      amazon_rescue_token_controls: {
        status: "PROVEN",
        path: "data/ops/amazon-rescue-token-controls.json",
        entry_count: 5,
      },
      exa_fridge_water_discovery: {
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
    },
    notes: [],
  };
}

test("summary from factory report is read-only and surfaces counts", () => {
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({
    rootDir: REPO_ROOT,
    now: () => new Date("2026-06-10T22:00:00.000Z"),
  });
  const ucfFacts = buildUcfCoverageDispositionProvenanceFactsV1({
    snapshot,
    filterSlugs: ["lt700p"],
    wedge: "refrigerator_water",
  });
  const summary = buildLargeBatchCoverageFactorySummaryV1FromReport(sampleFactoryReport(), {
    ucfCoverageDispositionProvenanceFacts: ucfFacts,
  });
  assert.equal(summary.report_name, LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1);
  assert.equal(summary.read_only, true);
  assert.equal(summary.data_mutation, false);
  assert.equal(summary.mutation_ready, false);
  assert.equal(summary.runtime_status, "OK");
  assert.equal(summary.candidate_count, 57);
  assert.equal(summary.state_counts.new_product_candidate, 0);
  assert.equal(summary.blocked_counts.total, 1);
  assert.equal(summary.top_5_candidates.length, 1);
  assert.ok(summary.expansion_blocker_summary.includes("new_product_candidate=0"));
});

test("repo summary cites UCF coverage disposition authority for registered top cohort slugs", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1({
    rootDir: REPO_ROOT,
    buildFactoryReport: (factoryDeps) =>
      buildLargeBatchCoverageFactoryReportV1({
        ...factoryDeps,
        loadExaDiscovery: () => missingExaDiscoveryLoadResultV1(),
      }),
  });
  if (summary.runtime_status !== "OK") {
    assert.fail(`expected OK runtime_status, got ${summary.runtime_status}`);
  }
  const registeredTopSlug = summary.top_5_candidates.find((candidate) =>
    summary.proven_facts.some(
      (fact) =>
        fact.includes(`filter_slug=${candidate.slug}`) &&
        fact.includes("coverage disposition authority=universal_coverage_factory_v1"),
    ),
  );
  if (registeredTopSlug) {
    assert.ok(
      summary.proven_facts.some((fact) => fact.includes("ucf_decision_authority_cutover_v1")),
    );
  }
});

test("factory build failure degrades to ATTENTION without throwing", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1({
    rootDir: "/nonexistent",
    now: () => new Date("2026-05-21T00:00:00.000Z"),
    buildFactoryReport: () => {
      throw new Error("fixture failure");
    },
  });
  assert.equal(summary.runtime_status, "ATTENTION");
  assert.equal(summary.candidate_count, "UNKNOWN");
  assert.equal(summary.state_counts, "UNKNOWN");
  assert.equal(summary.top_5_candidates.length, 0);
  assert.ok(summary.factory_failure_reason?.includes("fixture failure"));
});

test("next_agent_action stays read-only planning language", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1FromReport(sampleFactoryReport());
  assert.match(summary.next_agent_action, /read-only/i);
  assert.match(summary.next_agent_action, /do not mutate production/i);
  assert.doesNotMatch(summary.next_agent_action, /\bimport-seed\b/i);
  assert.doesNotMatch(summary.next_agent_action, /\bdeploy\b/i);
  assert.doesNotMatch(summary.next_agent_action, /\bpublish\b/i);
  assert.match(summary.next_owner_action, /Do not hand-edit/i);
});

test("repo summary without Exa manifest keeps 57 candidates and demoted expansion note", () => {
  const summary = buildLargeBatchCoverageFactorySummaryV1({
    rootDir: REPO_ROOT,
    buildFactoryReport: (factoryDeps) =>
      buildLargeBatchCoverageFactoryReportV1({
        ...factoryDeps,
        loadExaDiscovery: () => missingExaDiscoveryLoadResultV1(),
      }),
  });
  assert.equal(summary.read_only, true);
  assert.equal(summary.data_mutation, false);
  assert.equal(summary.mutation_ready, false);
  if (summary.runtime_status !== "OK") {
    assert.fail(`expected OK runtime_status, got ${summary.runtime_status}`);
  }
  assert.equal(summary.candidate_count, 57);
  assert.equal(summary.state_counts.new_product_candidate, 0);
  assert.ok(summary.expansion_blocker_summary.includes("new_product_candidate=0"));
  assert.ok(summary.expansion_blocker_summary.includes("first fridge expansion batch"));
  assert.ok(summary.expansion_blocker_summary.includes("stronger upstream source"));
  const openGrowth = summary.top_5_candidates.filter(
    (c) => c.factory_state === "new_product_candidate",
  );
  assert.equal(openGrowth.length, 0);
  for (const slug of [
    "4396702",
    "edr5rxd1",
    "adq73613404",
    "da29-00003b",
    "da97-15217b",
  ]) {
    assert.ok(
      !summary.top_5_candidates.some((c) => c.slug === slug),
      `${slug} must not appear in top_5_candidates`,
    );
  }
});

test("repo summary with active combined Exa manifest yields 60 and three evidence_needed", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
  });
  const summary = buildLargeBatchCoverageFactorySummaryV1FromReport(report);
  assert.equal(summary.runtime_status, "OK");
  assert.equal(summary.candidate_count, 60);
  assert.equal(summary.state_counts.new_product_candidate, 0);
  assert.equal(summary.state_counts.evidence_needed, 3);
  assert.ok(
    summary.expansion_blocker_summary.includes("Exa discovery merged 3 read-only row(s)"),
  );
  for (const slug of ["edr6rxd1", "mwfa", "gwf06"] as const) {
    const row = report.top_candidates.find((c) => c.slug === slug);
    assert.ok(row, `${slug} must appear when combined manifest is active`);
    assert.equal(row!.factory_state, "evidence_needed");
    assert.equal(row!.has_gated_buyable_link, false);
  }
});
