import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  buildSearchIntentAlignmentExperimentReportV1,
  type SearchIntentAlignmentPageRowV1,
} from "./buckparts-search-intent-alignment-experiment-v1";
import {
  SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_CONTRACT_V1,
  buildSearchIntentFactoryProofExperimentReportV1,
  manufactureSearchIntentFactoryProofCandidatesV1,
  manufactureSearchIntentFactoryProofPageV1,
  resolveSearchIntentFactoryProofVerdictV1,
  validateSearchIntentFactoryProofWorkItemV1,
} from "./buckparts-search-intent-factory-proof-experiment-v1";

const REPO_ROOT = process.cwd();

function alignmentPage(overrides: Partial<SearchIntentAlignmentPageRowV1>): SearchIntentAlignmentPageRowV1 {
  return {
    selection_rank: 1,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    slug: "lt1000p",
    public_route: "/filter/lt1000p",
    source_artifacts: ["test"],
    homeowner_language_inventory: [
      { field: "oem_part_number", value: "LT1000P", source: "data/filters.csv" },
      { field: "filter_name", value: "LG LT1000P (common 2018+ French door)", source: "data/filters.csv" },
      { field: "visible_h1_pattern", value: "LT1000P (VisualReplacementMatchCard h1)", source: "template" },
      { field: "filter_aliases", value: "LT 1000 P | LG LT1000", source: "data/filter_aliases.csv" },
    ],
    proven_query_language: [
      {
        query: "lg lt1000p refrigerator water filter replacement",
        source: "gsc",
        impressions: 40,
        search_count: null,
      },
      {
        query: "how to replace lg refrigerator water filter lt1000p",
        source: "gsc",
        impressions: 12,
        search_count: null,
      },
    ],
    proven_query_language_status: "PROVEN",
    alignment: {
      classification: "LOW_ALIGNMENT",
      overlap_token_count: 2,
      page_token_count: 10,
      query_token_count: 12,
      alignment_ratio: 0.16,
      explanation: "test",
      evidence: ["overlap_tokens=2"],
      source: "gsc_test",
      truth_risk: "LOW",
      validation_path: "re-run alignment",
    },
    root_cause: "SEARCH_LANGUAGE_GAP",
    architectural_implication: "COMMAND_CENTER_PLUS_FACTORY",
    ...overrides,
  };
}

test("read-only flags and no mutation authority", async () => {
  const report = await buildSearchIntentFactoryProofExperimentReportV1({
    rootDir: REPO_ROOT,
    alignmentReport: {
      contract: "search_intent_alignment_experiment_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      artifact_write_authorized: false,
      supabase_writes: false,
      source_command: "npm run buckparts:search-intent-alignment:experiment",
      generated_at: "2026-06-10T00:00:00.000Z",
      falsification_hypothesis: "test",
      distribution_experiment_contract: "distribution_five_page_experiment_v1",
      gsc_available: false,
      gsc_source: null,
      search_gap_artifact_available: false,
      demand_to_coverage_lane_available: true,
      referenceability_factory_available: false,
      selected_pages: [alignmentPage({})],
      experiment_verdict: "UNKNOWN",
      verdict_rationale: [],
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
    },
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(report.contract, SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.artifact_write_authorized, false);
  assert.equal(report.supabase_writes, false);
});

test("uses same five pages as alignment experiment via live run", async () => {
  const loadGsc = async () => ({ ok: false as const, reason: "fixture" });
  const alignment = await buildSearchIntentAlignmentExperimentReportV1({
    rootDir: REPO_ROOT,
    loadGscArtifact: loadGsc,
    referenceabilityFactory: null,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  const proof = await buildSearchIntentFactoryProofExperimentReportV1({
    rootDir: REPO_ROOT,
    alignmentReport: alignment,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });

  assert.equal(proof.selected_pages.length, 5);
  assert.deepEqual(
    proof.selected_pages.map((p) => p.slug),
    alignment.selected_pages.map((p) => p.slug),
  );
});

test("manufactures work items with required five fields and no invention flag", () => {
  const page = alignmentPage({});
  const { work_items_manufactured } = manufactureSearchIntentFactoryProofPageV1(page);
  assert.ok(work_items_manufactured.length > 0);
  for (const item of work_items_manufactured) {
    assert.equal(item.content_invention_required, false);
    assert.ok(validateSearchIntentFactoryProofWorkItemV1(item));
    assert.ok(item.evidence.length > 0);
    assert.ok(item.source.length > 0);
    assert.ok(item.expected_customer_value.length > 0);
    assert.ok(item.validation_path.length > 0);
    assert.ok(item.truth_risk === "LOW" || item.truth_risk === "MEDIUM" || item.truth_risk === "HIGH");
  }
});

test("rejects GSC-dependent candidates when insufficient GSC data", () => {
  const page = alignmentPage({
    homeowner_language_inventory: [
      { field: "oem_part_number", value: "LT1000P", source: "data/filters.csv" },
      { field: "filter_name", value: "LG LT1000P", source: "data/filters.csv" },
      { field: "visible_h1_pattern", value: "LT1000P", source: "template" },
    ],
    proven_query_language: [],
    proven_query_language_status: "UNKNOWN",
    alignment: {
      classification: "UNKNOWN",
      overlap_token_count: 0,
      page_token_count: 5,
      query_token_count: 0,
      alignment_ratio: null,
      explanation: "no gsc",
      evidence: ["gsc_missing"],
      source: "unknown",
      truth_risk: "LOW",
      validation_path: "load gsc",
    },
    root_cause: "INSUFFICIENT_GSC_DATA",
  });
  const { work_items_manufactured, work_items_rejected } =
    manufactureSearchIntentFactoryProofPageV1(page);
  assert.equal(work_items_manufactured.length, 0);
  assert.equal(work_items_rejected.length, 0);
  const candidates = manufactureSearchIntentFactoryProofCandidatesV1(page);
  assert.equal(candidates.length, 0);
});

test("no copy generation in manufactured summaries", () => {
  const page = alignmentPage({});
  const candidates = manufactureSearchIntentFactoryProofCandidatesV1(page);
  for (const c of candidates) {
    const lower = c.summary.toLowerCase();
    assert.ok(!lower.includes("write copy"));
    assert.ok(!lower.includes("draft faq"));
    assert.ok(!lower.includes("meta description"));
  }
});

test("deterministic manufacturing for fixed alignment page", () => {
  const page = alignmentPage({});
  const a = manufactureSearchIntentFactoryProofPageV1(page);
  const b = manufactureSearchIntentFactoryProofPageV1(page);
  assert.deepEqual(
    a.work_items_manufactured.map((w) => w.work_item_id),
    b.work_items_manufactured.map((w) => w.work_item_id),
  );
});

test("FACTORY_PROVEN only when manufactured items valid and zero rejections", () => {
  const item = manufactureSearchIntentFactoryProofPageV1(alignmentPage({})).work_items_manufactured[0];
  assert.ok(item);
  const pages = [
    {
      selection_rank: 1,
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      slug: "lt1000p",
      public_route: "/filter/lt1000p",
      page_classification: "SAFE_BUYER_PATH_PROVEN" as const,
      alignment_classification: "LOW_ALIGNMENT" as const,
      root_cause: "SEARCH_LANGUAGE_GAP" as const,
      work_items_manufactured: [item],
      work_items_rejected: [],
      source_artifacts: [],
    },
  ];
  const proven = resolveSearchIntentFactoryProofVerdictV1({ pages, gscAvailable: true });
  assert.equal(proven.verdict, "FACTORY_PROVEN");

  const partial = resolveSearchIntentFactoryProofVerdictV1({
    pages: [{ ...pages[0], work_items_rejected: [{ work_item_class: "VOCABULARY_GAP", summary: "x", rejection_reason: "INSUFFICIENT_EVIDENCE", evidence: [] }] }],
    gscAvailable: true,
  });
  assert.equal(partial.verdict, "FACTORY_PARTIALLY_PROVEN");
});

test("UNKNOWN verdict when GSC unavailable on majority of pages", () => {
  const pages = Array.from({ length: 5 }, (_, i) => ({
    selection_rank: i + 1,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    slug: `s${i}`,
    public_route: `/filter/s${i}`,
    page_classification: "SAFE_BUYER_PATH_PROVEN" as const,
    alignment_classification: "UNKNOWN" as const,
    root_cause: "INSUFFICIENT_GSC_DATA" as const,
    work_items_manufactured: [],
    work_items_rejected: [],
    source_artifacts: [],
  }));
  const { verdict } = resolveSearchIntentFactoryProofVerdictV1({ pages, gscAvailable: false });
  assert.equal(verdict, "UNKNOWN");
});

test("does not mutate retailer_links.csv", async () => {
  const csvBefore = readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8");
  await buildSearchIntentFactoryProofExperimentReportV1({
    rootDir: REPO_ROOT,
    loadGscArtifact: async () => ({ ok: false, reason: "fixture" }),
    referenceabilityFactory: null,
    now: () => new Date("2026-06-10T12:00:00.000Z"),
  });
  assert.equal(readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"), csvBefore);
});

test("package script exists", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.ok(pkg.scripts["buckparts:search-intent-factory:proof-experiment"]);
});
