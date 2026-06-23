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
  generated_at: "2026-06-23T20:00:00.000Z",
  executive_summary: {
    "vornado-md1-0023": { verdict: "issue_track_and_split_before_progression" },
    "renpho-rp-ap003": { verdict: "exclude_from_future_batch_progression" },
  },
  slug_assessments: [
    {
      filter_slug: "vornado-md1-0023",
      correctness_risks: [{ severity: "high" }, { severity: "high" }, { severity: "medium" }],
    },
    {
      filter_slug: "renpho-rp-ap003",
      correctness_risks: [{ severity: "high" }, { severity: "high" }, { severity: "medium" }],
    },
  ],
  recommended_next_steps_read_only: [
    "Create Command Center issue packet(s) for vornado HEPA/carbon identity split and renpho model/filter collision — planning only.",
    "Remove renpho-rp-ap003 from future demand-selected batch candidate scopes until exclusion criteria met.",
  ],
} as const;

describe("air_purifier_demand_selected_correctness_risks_v1", () => {
  test("projectApDemandSelectedCorrectnessRisksFromAuditV1 projects required fields only", () => {
    const projection = projectApDemandSelectedCorrectnessRisksFromAuditV1(SAMPLE_AUDIT);
    assert.equal(projection.risk_count, 6);
    assert.equal(projection.high_risk_slug_count, 2);
    assert.equal(projection.vornado_md1_0023_status, "issue_track_and_split_before_progression");
    assert.equal(projection.renpho_rp_ap003_status, "exclude_from_future_batch_progression");
    assert.equal(projection.generated_at, "2026-06-23T20:00:00.000Z");
    assert.match(projection.recommended_action, /issue packet/i);
    assert.match(projection.recommended_action, /renpho-rp-ap003/i);
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
    assert.equal(lane.risk_count, 6);
    assert.equal(lane.high_risk_slug_count, 2);
    assert.equal(lane.vornado_md1_0023_status, "issue_track_and_split_before_progression");
    assert.equal(lane.renpho_rp_ap003_status, "exclude_from_future_batch_progression");
    assert.equal(lane.generated_at, "2026-06-23T20:00:00.000Z");
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
