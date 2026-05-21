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
const V3_OPERATOR_INPUT_PATH = path.join(
  REPO_ROOT,
  "data/discovery/exa/fridge-water/operator-input/exa-fridge-water-v3-netnew.2026-05-21.json",
);
const V2_OPERATOR_INPUT_PATH = path.join(
  REPO_ROOT,
  "data/discovery/exa/fridge-water/operator-input/exa-fridge-water-v2-netnew.2026-05-21.json",
);
const COMBINED_REVIEW_CANDIDATES_PATH = path.join(
  REPO_ROOT,
  "data/discovery/exa/fridge-water/runs/2026-05-21-combined-review/candidates.json",
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

function findCandidateByUrlFragment(
  candidates: ReturnType<typeof buildExaFridgeWaterDiscoveryFromMcpExport>["candidates_file"]["candidates"],
  fragment: string,
) {
  return candidates.find(
    (c) => c.discovered_url.includes(fragment) || c.discovered_title.toUpperCase().includes(fragment),
  );
}

test("v3 manufacturer rows extract MWFA FPPWFU01 GWF06 with safe classification", () => {
  const input = JSON.parse(readFileSync(V3_OPERATOR_INPUT_PATH, "utf8")) as ExaMcpExportInputV1;
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input,
    discovery_run_id: "2026-05-21-v3-netnew",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T22:00:00.000Z",
    input_path: V3_OPERATOR_INPUT_PATH,
  });

  const mwfa = findCandidateByUrlFragment(built.candidates_file.candidates, "MWFA");
  assert.ok(mwfa, "MWFA GE PDP row");
  assert.deepEqual(mwfa!.extracted_part_tokens, ["MWFA"]);
  assert.equal(mwfa!.candidate_slug, "mwfa");
  assert.equal(mwfa!.recommended_factory_state, "evidence_needed");
  assert.ok(!mwfa!.rejection_flags.includes("no_oem_token"));
  assert.equal(mwfa!.omit_from_factory_merge, false);
  assert.equal(mwfa!.catalog_import_ready, false);
  assert.equal(mwfa!.mutation_ready, false);

  const fpp = findCandidateByUrlFragment(built.candidates_file.candidates, "FPPWFU01");
  assert.ok(fpp, "FPPWFU01 Frigidaire PDP row");
  assert.deepEqual(fpp!.extracted_part_tokens, ["FPPWFU01"]);
  assert.equal(fpp!.candidate_slug, "fppwfu01");
  assert.equal(fpp!.recommended_factory_state, "blocked_do_not_publish");
  assert.ok(fpp!.rejection_flags.includes("live_slug_exists"));
  assert.equal(fpp!.omit_from_factory_merge, true);

  const gwf06 = findCandidateByUrlFragment(built.candidates_file.candidates, "GWF06");
  assert.ok(gwf06, "GWF06 GE PDP row");
  assert.deepEqual(gwf06!.extracted_part_tokens, ["GWF06"]);
  assert.equal(gwf06!.candidate_slug, "gwf06");
  assert.equal(gwf06!.recommended_factory_state, "evidence_needed");
  assert.ok(!gwf06!.rejection_flags.includes("no_oem_token"));
  assert.equal(gwf06!.omit_from_factory_merge, false);
});

test("combined review run merges v2 edr6rxd1 and v3-refresh mwfa gwf06", () => {
  const file = JSON.parse(readFileSync(COMBINED_REVIEW_CANDIDATES_PATH, "utf8")) as {
    discovery_run_id: string;
    candidates: Array<{
      candidate_slug: string | null;
      recommended_factory_state: string;
      omit_from_factory_merge: boolean;
      mutation_ready: boolean;
      catalog_import_ready: boolean;
      discovery_run_id: string;
      discovered_url: string;
    }>;
  };
  assert.equal(file.discovery_run_id, "2026-05-21-combined-review");
  assert.equal(file.candidates.length, 3);
  const slugs = file.candidates.map((c) => c.candidate_slug).sort();
  assert.deepEqual(slugs, ["edr6rxd1", "gwf06", "mwfa"]);
  for (const row of file.candidates) {
    assert.equal(row.recommended_factory_state, "evidence_needed");
    assert.equal(row.omit_from_factory_merge, false);
    assert.equal(row.mutation_ready, false);
    assert.equal(row.catalog_import_ready, false);
  }
  const edr6 = file.candidates.find((c) => c.candidate_slug === "edr6rxd1");
  assert.equal(edr6!.discovery_run_id, "2026-05-21-v2-netnew");
  assert.ok(edr6!.discovered_url.includes("EDR6RXD1"));
  const mwfa = file.candidates.find((c) => c.candidate_slug === "mwfa");
  assert.equal(mwfa!.discovery_run_id, "2026-05-21-v3-netnew-refresh");
  const gwf06 = file.candidates.find((c) => c.candidate_slug === "gwf06");
  assert.equal(gwf06!.discovery_run_id, "2026-05-21-v3-netnew-refresh");
});

test("v2 EDR6D1 manufacturer PDP extracts token as evidence_needed not live slug", () => {
  const input = JSON.parse(readFileSync(V2_OPERATOR_INPUT_PATH, "utf8")) as ExaMcpExportInputV1;
  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input,
    discovery_run_id: "2026-05-21-v2-netnew",
    rootDir: REPO_ROOT,
    generated_at: "2026-05-21T12:00:00.000Z",
  });
  const edr6d1 = built.candidates_file.candidates.find((c) =>
    c.discovered_url.toLowerCase().includes("edr6d1"),
  );
  assert.ok(edr6d1);
  assert.deepEqual(edr6d1!.extracted_part_tokens, ["EDR6D1"]);
  assert.equal(edr6d1!.candidate_slug, "edr6d1");
  assert.equal(edr6d1!.recommended_factory_state, "evidence_needed");
  assert.ok(!edr6d1!.rejection_flags.includes("no_oem_token"));
  assert.ok(!edr6d1!.rejection_flags.includes("live_slug_exists"));
  assert.equal(edr6d1!.omit_from_factory_merge, false);
  assert.equal(edr6d1!.catalog_import_ready, false);
});
