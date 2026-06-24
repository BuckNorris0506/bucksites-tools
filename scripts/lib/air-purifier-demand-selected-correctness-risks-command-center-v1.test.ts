import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1,
  AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1,
  buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1,
  buildAirPurifierDemandSelectedCorrectnessRisksLaneV1,
  projectApDemandSelectedCorrectnessRisksFromAuditV1,
} from "./air-purifier-demand-selected-correctness-risks-command-center-v1";

const SAMPLE_AUDIT = {
  contract: "ap_demand_selected_correctness_risks_v1",
  generated_at: "2026-06-24T00:39:22.000Z",
  executive_summary: {
    "vornado-md1-0023": { verdict: "catalog_identity_repaired_csv_f3c2141" },
    "renpho-rp-ap003": { verdict: "catalog_suppressed_no_safe_path" },
  },
  slug_assessments: [
    {
      filter_slug: "vornado-md1-0023",
      correctness_risks: [],
    },
    {
      filter_slug: "renpho-rp-ap003",
      correctness_risks: [],
    },
  ],
  recommended_next_steps_read_only: [
    "Demand-selected correctness risks cleared — resume read-only demand_to_coverage batch planning unless other steering layers block.",
  ],
} as const;

describe("air_purifier_demand_selected_correctness_risks_v1", () => {
  test("projectApDemandSelectedCorrectnessRisksFromAuditV1 projects required fields only", () => {
    const projection = projectApDemandSelectedCorrectnessRisksFromAuditV1(SAMPLE_AUDIT);
    assert.equal(projection.risk_count, 0);
    assert.equal(projection.high_risk_slug_count, 0);
    assert.equal(projection.vornado_md1_0023_status, "catalog_identity_repaired_csv_f3c2141");
    assert.equal(projection.renpho_rp_ap003_status, "catalog_suppressed_no_safe_path");
    assert.equal(projection.generated_at, "2026-06-24T00:39:22.000Z");
    assert.match(projection.recommended_action, /demand_to_coverage|demand-selected correctness risks cleared/i);
  });

  test("buildAirPurifierDemandSelectedCorrectnessRisksLaneV1 returns UNKNOWN when audit missing", () => {
    const lane = buildAirPurifierDemandSelectedCorrectnessRisksLaneV1({
      rootDir: "/tmp/missing-audit-root",
      fileExists: () => false,
    });
    assert.equal(lane.contract, AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CONTRACT_V1);
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.source_status, "UNKNOWN");
    assert.equal(lane.risk_count, "UNKNOWN");
    assert.equal(lane.high_risk_slug_count, "UNKNOWN");
    assert.equal(lane.vornado_md1_0023_status, "UNKNOWN");
    assert.equal(lane.renpho_rp_ap003_status, "UNKNOWN");
    assert.equal(lane.generated_at, "UNKNOWN");
    assert.equal(lane.recommended_jq_path, AIR_PURIFIER_DEMAND_SELECTED_CORRECTNESS_RISKS_CC_JQ_PATH_V1);
  });

  test("buildAirPurifierDemandSelectedCorrectnessRisksLaneV1 loads committed audit shape", () => {
    const lane = buildAirPurifierDemandSelectedCorrectnessRisksLaneV1({
      rootDir: "/repo",
      fileExists: (p) => p.endsWith("ap-demand-selected-correctness-risks-v1.json"),
      readTextFile: () => JSON.stringify(SAMPLE_AUDIT),
    });
    assert.equal(lane.source_status, "PROVEN");
    assert.equal(lane.risk_count, 0);
    assert.equal(lane.high_risk_slug_count, 0);
    assert.equal(lane.vornado_md1_0023_status, "catalog_identity_repaired_csv_f3c2141");
    assert.equal(lane.renpho_rp_ap003_status, "catalog_suppressed_no_safe_path");
    assert.equal(lane.generated_at, "2026-06-24T00:39:22.000Z");
  });

  test("buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1 stays read-only", () => {
    const lane = buildAirPurifierDemandSelectedCorrectnessRisksLaneUnknownV1({
      reason: "audit missing",
    });
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.recommended_action, "audit missing");
  });
});
