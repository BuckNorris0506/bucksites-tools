import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildExaFridgeWaterDiscoveryFromMcpExport,
  flattenExaMcpExportInput,
  type ExaMcpExportInputV1,
} from "@/lib/discovery/exa-fridge-water-discovery-v1";
import {
  buildExaDiscoveryFactoryCandidatesV1,
  loadExaDiscoveryForFactoryV1,
} from "@/lib/coverage/exa-discovery-factory-merge-v1";
import { buildLargeBatchCoverageFactoryReportV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

const REPO_ROOT = process.cwd();
const FIXTURE_PATH = path.join(
  REPO_ROOT,
  "data/discovery/exa/fridge-water/fixtures/exa-fridge-water-sample.v1.json",
);

function loadFixture(): ExaMcpExportInputV1 {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as ExaMcpExportInputV1;
}

test("fixture flattens five MCP hits", () => {
  const hits = flattenExaMcpExportInput(loadFixture());
  assert.equal(hits.length, 5);
});

test("Exa candidates are read-only and never import-ready", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
    input_path: FIXTURE_PATH,
  });
  for (const c of built.candidates_file.candidates) {
    assert.equal(c.read_only, true);
    assert.equal(c.data_mutation, false);
    assert.equal(c.mutation_ready, false);
    assert.equal(c.catalog_import_ready, false);
    assert.notEqual(c.recommended_factory_state, "new_product_candidate" as string);
  }
});

test("manufacturer fetch row becomes evidence_needed", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const row = built.candidates_file.candidates.find((c) =>
    c.extracted_part_tokens.includes("ADQ99999001"),
  );
  assert.ok(row);
  assert.equal(row!.recommended_factory_state, "evidence_needed");
  assert.equal(row!.evidence_tier, "A_manufacturer_official");
  assert.equal(row!.omit_from_factory_merge, false);
});

test("marketplace-only row is blocked", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const row = built.candidates_file.candidates.find((c) => c.discovered_url.includes("amazon.com"));
  assert.ok(row);
  assert.equal(row!.recommended_factory_state, "blocked_do_not_publish");
  assert.ok(row!.rejection_flags.includes("marketplace_only"));
});

test("LT120F-style air filter row is blocked wrong wedge", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const row = built.candidates_file.candidates.find((c) =>
    c.extracted_part_tokens.some((t) => t === "LT120F"),
  );
  assert.ok(row);
  assert.equal(row!.recommended_factory_state, "blocked_do_not_publish");
  assert.ok(row!.rejection_flags.includes("wrong_wedge_air_filter"));
});

test("demoted registry slug 4396702 is blocked", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const row = built.candidates_file.candidates.find((c) => c.candidate_slug === "4396702");
  assert.ok(row);
  assert.ok(row!.rejection_flags.includes("demoted_registry_match"));
  assert.equal(row!.recommended_factory_state, "blocked_do_not_publish");
});

test("live slug lt1000p is omitted from factory merge", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "test-run",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const row = built.candidates_file.candidates.find((c) => c.candidate_slug === "lt1000p");
  assert.ok(row);
  assert.ok(row!.rejection_flags.includes("live_slug_exists"));
  assert.equal(row!.omit_from_factory_merge, true);
});

test("baseline factory without manifest keeps 57 candidates and zero new_product", () => {
  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
    loadExaDiscovery: () => ({
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
    }),
  });
  assert.equal(report.candidate_count, 57);
  assert.equal(report.state_counts.new_product_candidate, 0);
  assert.equal(report.source_summary.bulk_catalog.row_count, 57);
  assert.equal(report.source_summary.exa_fridge_water_discovery.status, "MISSING");
});

test("factory with Exa fixture merge keeps bulk 57 and new_product 0", () => {
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: loadFixture(),
    discovery_run_id: "fixture-factory-merge",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const merged = built.candidates_file.candidates.filter(
    (c) => !c.omit_from_factory_merge && c.candidate_slug,
  );
  const loadResult = {
    manifest: null,
    candidates: built.candidates_file.candidates,
    source_summary: {
      status: "PROVEN" as const,
      path: "data/discovery/exa/fridge-water/fixtures/candidates.json",
      manifest_path: "data/discovery/exa/fridge-water/manifest.v1.json",
      run_id: "fixture-factory-merge",
      row_count: built.candidates_file.candidates.length,
      merged_into_factory_count: merged.length,
      evidence_needed_count: merged.filter((c) => c.recommended_factory_state === "evidence_needed")
        .length,
      blocked_count: merged.filter((c) => c.recommended_factory_state === "blocked_do_not_publish")
        .length,
      omitted_live_slug_count: built.candidates_file.candidates.filter((c) =>
        c.rejection_flags.includes("live_slug_exists"),
      ).length,
    },
  };

  const report = buildLargeBatchCoverageFactoryReportV1({
    rootDir: REPO_ROOT,
    topCandidatesLimit: 500,
    loadExaDiscovery: () => loadResult,
  });

  assert.equal(report.source_summary.bulk_catalog.row_count, 57);
  assert.equal(report.state_counts.new_product_candidate, 0);
  assert.equal(report.candidate_count, 57 + merged.length);
  assert.ok(
    report.top_candidates.some(
      (c) => c.slug === "adq99999001" && c.factory_state === "evidence_needed",
    ),
  );
  assert.ok(
    report.top_candidates.some(
      (c) => c.slug === "4396702" && c.factory_state === "blocked_do_not_publish",
    ),
  );
  assert.equal(
    report.top_candidates.find((c) => c.slug === "lt1000p" && c.sources.some((s) => s.includes("discovery"))),
    undefined,
  );
  for (const c of report.top_candidates) {
    assert.notEqual(c.factory_state, "new_product_candidate");
  }
});
