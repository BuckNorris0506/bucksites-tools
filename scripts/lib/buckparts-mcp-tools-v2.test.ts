import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
  checkReplacementFitV1,
} from "./buckparts-mcp-check-replacement-fit-v1";
import {
  BUCKPARTS_MCP_TOOLS_CONTRACT_V2,
  checkReplacementFitV1 as checkReplacementFitV2,
  getCoverageMetricsV2,
  getFilterV2,
  getModelV2,
  getSafeBuyerPathV2,
  getTruthPolicyV2,
  searchPartsV2,
} from "./buckparts-mcp-tools-v2";

const REPO_ROOT = process.cwd();

function assertReadOnlyEnvelope(result: { read_only: boolean; data_mutation: boolean; mutation_authorized: boolean }) {
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.mutation_authorized, false);
}

// --- checkReplacementFit (v1 + v2 alias) ---

test("checkReplacementFit contract flags are read-only", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  assert.equal(result.contract, BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1);
  assertReadOnlyEnvelope(result);
});

test("checkReplacementFit v2 re-export matches v1", () => {
  const v1 = checkReplacementFitV1({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  const v2 = checkReplacementFitV2({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  assert.deepEqual(v2, v1);
});

test("checkReplacementFit unknown query returns exact UNKNOWN", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "not-a-real-buckparts-slug-xyz");
  assert.equal(result.resolution, "UNKNOWN");
  assert.equal(result.matched_slug, "UNKNOWN");
  assert.equal(result.replacement_fit_status, "UNKNOWN");
});

test("checkReplacementFit proven refrigerator model", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  assert.equal(result.replacement_fit_status, "PROVEN");
  assert.equal(result.matched_slug, "da97-17376b");
});

test("checkReplacementFit filter slug safe buyer path", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  assert.equal(result.safe_buyer_path_status, "SAFE_BUYER_PATH_PROVEN");
});

test("checkReplacementFit AP model fit UNKNOWN", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "levoit-core-300");
  assert.equal(result.replacement_fit_status, "UNKNOWN");
  assert.equal(result.matched_slug, "UNKNOWN");
});

// --- getFilter ---

test("getFilter returns proven identity for known slug", () => {
  const result = getFilterV2({ rootDir: REPO_ROOT }, "edr1rxd1");
  assert.equal(result.contract, BUCKPARTS_MCP_TOOLS_CONTRACT_V2);
  assertReadOnlyEnvelope(result);
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(result.identity.oem_part_number, "EDR1RXD1");
  assert.ok(result.aliases.includes("EDR1RXD1"));
  assert.equal(result.safe_buyer_path_status, "SAFE_BUYER_PATH_PROVEN");
  assert.ok(result.evidence_paths.length > 0);
});

test("getFilter unknown slug returns UNKNOWN", () => {
  const result = getFilterV2({ rootDir: REPO_ROOT }, "fake-filter-slug-xyz");
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.wedge, "UNKNOWN");
  assert.equal(result.identity.name, "UNKNOWN");
});

// --- getModel ---

test("getModel proven fridge fit", () => {
  const result = getModelV2({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  assertReadOnlyEnvelope(result);
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.fit_confidence, "PROVEN");
  assert.equal(result.fit_audit_classification, "PROVEN_CORRECT");
  assert.ok(result.compatible_filters.some((f) => f.filter_slug === "da97-17376b"));
  assert.ok(result.evidence_paths.length > 0);
});

test("getModel AP model fit UNKNOWN with compat listed", () => {
  const result = getModelV2({ rootDir: REPO_ROOT }, "levoit-core-300");
  assert.equal(result.wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(result.fit_confidence, "UNKNOWN");
  assert.ok(result.compatible_filters.some((f) => f.filter_slug === "levoit-rf-rar029"));
  assert.equal(result.compatible_filters[0]?.fit_status, "UNKNOWN");
});

test("getModel wrong-part-risk suppressed", () => {
  const result = getModelV2({ rootDir: REPO_ROOT }, "samsung-rf28r7351sw");
  assert.equal(result.fit_confidence, "SUPPRESSED");
  assert.equal(result.fit_audit_classification, "WRONG_PART_RISK");
});

test("getModel unknown slug", () => {
  const result = getModelV2({ rootDir: REPO_ROOT }, "fake-model-slug");
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.fit_confidence, "UNKNOWN");
});

// --- searchParts ---

test("searchParts exact filter slug match", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "edr1rxd1");
  assertReadOnlyEnvelope(result);
  assert.ok(result.matches.some((m) => m.slug === "edr1rxd1" && m.match_kind === "filter_slug"));
});

test("searchParts exact alias match", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "EveryDrop 1");
  assert.ok(result.matches.some((m) => m.slug === "edr1rxd1" && m.match_kind === "alias_exact"));
});

test("searchParts exact OEM compact match", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "EDR1RXD1");
  assert.ok(result.matches.some((m) => m.slug === "edr1rxd1"));
});

test("searchParts exact model number match", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "RF28R7351SR");
  assert.ok(result.matches.some((m) => m.slug === "samsung-rf28r7351sr" && m.entity === "model"));
});

test("searchParts no fuzzy matches for partial token", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "edr1");
  assert.equal(result.matches.length, 0);
});

test("searchParts unknown token empty matches", () => {
  const result = searchPartsV2({ rootDir: REPO_ROOT }, "totally-unknown-token-xyz");
  assert.deepEqual(result.matches, []);
});

// --- getSafeBuyerPath ---

test("getSafeBuyerPath edr1rxd1 direct_buyable primary", () => {
  const result = getSafeBuyerPathV2({ rootDir: REPO_ROOT }, "edr1rxd1");
  assertReadOnlyEnvelope(result);
  assert.equal(result.safe_buyer_path_status, "SAFE_BUYER_PATH_PROVEN");
  assert.equal(result.primary_retailer.direct_buyable, true);
  assert.equal(result.primary_retailer.browser_truth_classification, "direct_buyable");
  assert.ok(result.safe_gated_row_count >= 1);
  assert.ok(result.evidence_paths.length > 0);
});

test("getSafeBuyerPath unknown slug", () => {
  const result = getSafeBuyerPathV2({ rootDir: REPO_ROOT }, "fake-filter");
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.safe_buyer_path_status, "UNKNOWN");
});

// --- getCoverageMetrics ---

test("getCoverageMetrics returns census aggregates", () => {
  const result = getCoverageMetricsV2({ rootDir: REPO_ROOT });
  assertReadOnlyEnvelope(result);
  assert.ok(result.wedge_coverage.length > 0);
  assert.ok(result.census_summary.total_products > 0);
  assert.ok(result.classification_counts.SAFE_BUYER_PATH_PROVEN > 0);
  assert.equal(result.repo_runtime_parity.supabase_measurement_available, false);
  assert.equal(result.repo_runtime_parity.census_csv_vs_supabase, "UNKNOWN");
});

test("getCoverageMetrics includes AP convergence artifact when present", () => {
  const result = getCoverageMetricsV2({ rootDir: REPO_ROOT });
  const ap = result.repo_runtime_parity.air_purifier_convergence;
  if (ap.artifact_paths.length > 0) {
    assert.notEqual(ap.gate_state, "UNKNOWN");
  }
});

// --- getTruthPolicy ---

test("getTruthPolicy returns governing docs and UNKNOWN behavior", () => {
  const result = getTruthPolicyV2({ rootDir: REPO_ROOT });
  assertReadOnlyEnvelope(result);
  assert.equal(result.policy_name, "BuckParts Truth Contract");
  assert.ok(result.governing_documents.some((d) => d.path.includes("CONSTITUTION")));
  assert.ok(result.unknown_behavior.length > 0);
  assert.ok(result.mcp_guardrails.some((g) => g.includes("read_only")));
});

// --- mutation safety ---

test("MCP tools do not mutate retailer_links.csv", () => {
  const csvPath = path.join(REPO_ROOT, "data/retailer_links.csv");
  const before = readFileSync(csvPath, "utf8");
  checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  getFilterV2({ rootDir: REPO_ROOT }, "edr1rxd1");
  getModelV2({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  searchPartsV2({ rootDir: REPO_ROOT }, "EDR1RXD1");
  getSafeBuyerPathV2({ rootDir: REPO_ROOT }, "edr1rxd1");
  getCoverageMetricsV2({ rootDir: REPO_ROOT });
  getTruthPolicyV2({ rootDir: REPO_ROOT });
  assert.equal(readFileSync(csvPath, "utf8"), before);
});
