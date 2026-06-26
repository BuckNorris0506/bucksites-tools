import assert from "node:assert/strict";
import test from "node:test";

import {
  BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1,
  manufacturerBrowserProofStatusV1,
  manufacturerRescueCohortV1,
  manufacturerRescueStatusV1,
  normalizeManufacturerKeyV1,
  resolveManufacturerKeyForSlugV1,
} from "./buckparts-mcp-manufacturer-rescue-v1";
import { BUCKPARTS_MCP_TOOLS_CONTRACT_V2 } from "./buckparts-mcp-tools-v2";
import { GE_RESCUE_COHORT_SLUGS_V1 } from "./ge-refrigerator-rescue-adapter-v1";
import { EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1 } from "./fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";
import { FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1 } from "./frigidaire-refrigerator-rescue-adapter-v1";

const REPO_ROOT = process.cwd();
const deps = { rootDir: REPO_ROOT };

function assertReadOnlyEnvelope(result: {
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  contract: string;
}) {
  assert.equal(result.contract, BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.mutation_authorized, false);
}

test("normalizeManufacturerKeyV1 accepts aliases", () => {
  assert.equal(normalizeManufacturerKeyV1("ge"), "ge_appliance_parts");
  assert.equal(normalizeManufacturerKeyV1("everydrop"), "everydrop_whirlpool");
  assert.equal(normalizeManufacturerKeyV1("whirlpool"), "everydrop_whirlpool");
  assert.equal(normalizeManufacturerKeyV1("frigidaire"), "frigidaire");
  assert.equal(normalizeManufacturerKeyV1("not-a-brand"), "UNKNOWN");
});

test("resolveManufacturerKeyForSlugV1 maps cohort slugs", () => {
  assert.equal(resolveManufacturerKeyForSlugV1("mwf"), "ge_appliance_parts");
  assert.equal(resolveManufacturerKeyForSlugV1("edr3rxd1"), "everydrop_whirlpool");
  assert.equal(resolveManufacturerKeyForSlugV1("wf3cb"), "frigidaire");
  assert.equal(resolveManufacturerKeyForSlugV1("not-in-cohort"), "UNKNOWN");
});

test("manufacturer_rescue_status unknown slug returns UNKNOWN", () => {
  const result = manufacturerRescueStatusV1(deps, "not-a-real-buckparts-slug-xyz");
  assertReadOnlyEnvelope(result);
  assert.equal(result.tool, "manufacturer_rescue_status");
  assert.equal(result.manufacturer_key, "UNKNOWN");
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.direct_buyable_proven, false);
  assert.equal(result.repo_proven_official_pdp_url, null);
  assert.equal(result.adapter_discovery_url, null);
});

test("manufacturer_rescue_status GE search placeholder never proves direct_buyable", () => {
  const result = manufacturerRescueStatusV1(deps, "mwf");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "ge_appliance_parts");
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.direct_buyable_proven, false);
  assert.equal(result.repo_proven_official_pdp_url, null);
  assert.ok(
    result.direct_buyable_detail.includes("search placeholder") ||
      result.direct_buyable_detail.includes("NOT_PROVEN"),
  );
});

test("manufacturer_rescue_status GE reference rpwfe may prove CSV direct_buyable only", () => {
  const result = manufacturerRescueStatusV1(deps, "rpwfe");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "ge_appliance_parts");
  if (result.direct_buyable_proven) {
    assert.ok(result.repo_proven_official_pdp_url?.includes("geapplianceparts.com"));
    assert.equal(result.adapter_discovery_url, null);
  }
});

test("manufacturer_rescue_status Frigidaire wf3cb uses repo-proven PDP only when adapter has it", () => {
  const result = manufacturerRescueStatusV1(deps, "wf3cb");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "frigidaire");
  assert.equal(result.adapter_discovery_url, null);
  assert.equal(result.direct_buyable_proven, false);
  if (result.repo_proven_official_pdp_url) {
    assert.ok(result.repo_proven_official_pdp_url.includes("frigidaire"));
  }
});

test("manufacturer_rescue_cohort unknown manufacturer", () => {
  const result = manufacturerRescueCohortV1(deps, "acme");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "UNKNOWN");
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.rows.length, 0);
});

test("manufacturer_rescue_cohort GE returns committed cohort size", () => {
  const result = manufacturerRescueCohortV1(deps, "ge_appliance_parts");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "ge_appliance_parts");
  assert.equal(result.truth_status, "PROVEN");
  assert.equal(result.rows.length, GE_RESCUE_COHORT_SLUGS_V1.length);
  assert.equal(result.coverage_unlocked, false);
  for (const row of result.rows) {
    if (row.cohort_lane !== "REFERENCE_ALREADY_APPLIED") {
      assert.equal(row.repo_proven_official_pdp_url, null);
    }
  }
});

test("manufacturer_rescue_cohort EveryDrop returns seven slugs", () => {
  const result = manufacturerRescueCohortV1(deps, "everydrop_whirlpool");
  assertReadOnlyEnvelope(result);
  assert.equal(result.rows.length, EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.length);
  assert.equal(result.cohort_summary.pdp_pattern_guessed_slug_count, 0);
});

test("manufacturer_rescue_cohort Frigidaire returns ten slugs", () => {
  const result = manufacturerRescueCohortV1(deps, "frigidaire");
  assertReadOnlyEnvelope(result);
  assert.equal(result.rows.length, FRIGIDAIRE_RESCUE_SEARCH_PLACEHOLDER_SLUGS_V1.length);
});

test("manufacturer_browser_proof_status wf3cb reads committed artifact when present", () => {
  const result = manufacturerBrowserProofStatusV1(deps, "wf3cb");
  assertReadOnlyEnvelope(result);
  assert.equal(result.manufacturer_key, "frigidaire");
  assert.ok(result.owner_proof_artifact_rel_path?.includes("wf3cb"));
  if (result.truth_status === "PROVEN") {
    assert.equal(result.verdict, "PASS_BROWSER_PROOF");
    assert.ok(result.proof_urls.length > 0);
  }
});

test("manufacturer_browser_proof_status slug without artifact is UNKNOWN", () => {
  const result = manufacturerBrowserProofStatusV1(deps, "mwf");
  assertReadOnlyEnvelope(result);
  assert.equal(result.truth_status, "UNKNOWN");
  assert.equal(result.direct_buyable_proven, false);
  assert.equal(result.proof_urls.length, 0);
});

test("v2 re-export envelope includes base MCP tools contract on sibling tools only", () => {
  const filter = manufacturerRescueStatusV1(deps, "mwf");
  assert.equal(filter.contract, BUCKPARTS_MCP_MANUFACTURER_RESCUE_CONTRACT_V1);
  assert.notEqual(filter.contract, BUCKPARTS_MCP_TOOLS_CONTRACT_V2);
});
