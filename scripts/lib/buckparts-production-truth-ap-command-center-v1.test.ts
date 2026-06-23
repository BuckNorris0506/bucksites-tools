import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBuckpartsProductionTruthApCommandCenterLaneUnknownV1,
  resolveBuckpartsProductionTruthApRuntimeStatusV1,
} from "./buckparts-production-truth-ap-command-center-v1";

describe("resolveBuckpartsProductionTruthApRuntimeStatusV1", () => {
  it("returns UNKNOWN when Supabase is not configured", () => {
    assert.equal(
      resolveBuckpartsProductionTruthApRuntimeStatusV1({
        supabase_configured: false,
        summary: {
          total_cases: 4,
          pass: 0,
          fail: 0,
          pass_with_inventory_warnings: 0,
          inventory_warning_count: 0,
          skip: 4,
          unknown: 0,
        },
      }),
      "UNKNOWN",
    );
  });

  it("returns BLOCKED when blocking fail count is positive", () => {
    assert.equal(
      resolveBuckpartsProductionTruthApRuntimeStatusV1({
        supabase_configured: true,
        summary: {
          total_cases: 4,
          pass: 3,
          fail: 1,
          pass_with_inventory_warnings: 0,
          inventory_warning_count: 1,
          skip: 0,
          unknown: 0,
        },
      }),
      "BLOCKED",
    );
  });

  it("returns ATTENTION when only inventory warnings remain", () => {
    assert.equal(
      resolveBuckpartsProductionTruthApRuntimeStatusV1({
        supabase_configured: true,
        summary: {
          total_cases: 4,
          pass: 4,
          fail: 0,
          pass_with_inventory_warnings: 1,
          inventory_warning_count: 1,
          skip: 0,
          unknown: 0,
        },
      }),
      "ATTENTION",
    );
  });

  it("returns OK when configured with no blocking fails or inventory warnings", () => {
    assert.equal(
      resolveBuckpartsProductionTruthApRuntimeStatusV1({
        supabase_configured: true,
        summary: {
          total_cases: 4,
          pass: 4,
          fail: 0,
          pass_with_inventory_warnings: 0,
          inventory_warning_count: 0,
          skip: 0,
          unknown: 0,
        },
      }),
      "OK",
    );
  });
});

describe("buildBuckpartsProductionTruthApCommandCenterLaneUnknownV1", () => {
  it("returns read-only UNKNOWN lane stub", () => {
    const lane = buildBuckpartsProductionTruthApCommandCenterLaneUnknownV1({
      generated_at: "2026-06-23T12:00:00.000Z",
      reason: "test failure",
    });
    assert.equal(lane.contract, "buckparts_production_truth_ap_v1");
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.runtime_status, "UNKNOWN");
    assert.equal(lane.npm_script, "buckparts:production-truth:ap");
    assert.equal(lane.summary.skip, lane.cases.length);
    assert.ok(lane.unknown_facts.some((f) => f.includes("test failure")));
  });
});
