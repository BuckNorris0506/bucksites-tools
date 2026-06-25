import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
  checkReplacementFitV1,
} from "./buckparts-mcp-check-replacement-fit-v1";

const REPO_ROOT = process.cwd();

test("contract flags are read-only", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  assert.equal(result.contract, BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.mutation_authorized, false);
});

test("unknown query returns exact UNKNOWN without fit claims", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "not-a-real-buckparts-slug-xyz");
  assert.equal(result.resolution, "UNKNOWN");
  assert.equal(result.matched_slug, "UNKNOWN");
  assert.equal(result.replacement_fit_status, "UNKNOWN");
  assert.equal(result.safe_buyer_path_status, "UNKNOWN");
  assert.equal(result.disposition, "UNKNOWN");
  assert.deepEqual(result.evidence_paths, []);
});

test("proven refrigerator model returns proven filter slug and evidence", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  assert.equal(result.resolution, "model");
  assert.equal(result.wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(result.replacement_fit_status, "PROVEN");
  assert.equal(result.matched_slug, "da97-17376b");
  assert.equal(result.fit_audit_classification, "PROVEN_CORRECT");
  assert.ok(result.evidence_paths.some((p) => p.includes("samsung-rf28r7351sr")));
  assert.ok(result.mapped_filter_slugs.includes("da97-17376b"));
});

test("model number compact match resolves when unambiguous", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "RF28R7351SR");
  assert.equal(result.resolution, "model");
  assert.equal(result.replacement_fit_status, "PROVEN");
  assert.equal(result.matched_slug, "da97-17376b");
});

test("filter slug with safe buyer path returns SAFE_BUYER_PATH_PROVEN", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  assert.equal(result.resolution, "filter");
  assert.equal(result.matched_slug, "edr1rxd1");
  assert.equal(result.wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  assert.equal(result.replacement_fit_status, "UNKNOWN");
  assert.equal(result.safe_buyer_path_status, "SAFE_BUYER_PATH_PROVEN");
  assert.equal(result.disposition, "covered");
  assert.ok(result.evidence_paths.length > 0);
});

test("air purifier model returns UNKNOWN fit (no audit artifact)", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "levoit-core-300");
  assert.equal(result.resolution, "model");
  assert.equal(result.wedge, HOMEKEEP_WEDGE_CATALOG.air_purifier);
  assert.equal(result.replacement_fit_status, "UNKNOWN");
  assert.equal(result.matched_slug, "UNKNOWN");
  assert.ok(result.mapped_filter_slugs.includes("levoit-rf-rar029"));
});

test("wrong-part-risk fridge model suppresses fit and keeps matched_slug UNKNOWN", () => {
  const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, "samsung-rf28r7351sw");
  assert.equal(result.resolution, "model");
  assert.equal(result.replacement_fit_status, "SUPPRESSED");
  assert.equal(result.matched_slug, "UNKNOWN");
  assert.equal(result.fit_audit_classification, "WRONG_PART_RISK");
  assert.equal(result.disposition, "mapping_review");
});

test("lookup does not mutate retailer_links.csv", () => {
  const csvPath = path.join(REPO_ROOT, "data/retailer_links.csv");
  const before = readFileSync(csvPath, "utf8");
  checkReplacementFitV1({ rootDir: REPO_ROOT }, "edr1rxd1");
  checkReplacementFitV1({ rootDir: REPO_ROOT }, "samsung-rf28r7351sr");
  assert.equal(readFileSync(csvPath, "utf8"), before);
});
