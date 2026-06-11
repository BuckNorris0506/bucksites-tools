import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildDistributionOpportunityRegistryLaneV1 } from "./command-center-distribution-opportunity-registry-v1";
import { buildRevenueOpportunityRegistryLaneV1 } from "./command-center-revenue-opportunity-registry-v1";
import { buildSeoOpportunityRegistryLaneV1 } from "./command-center-seo-opportunity-registry-v1";
import { COMMAND_CENTER_ISSUE_STATUSES_V1 } from "./command-center-issue-registry-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("seo_opportunity_registry_v1 loads seeded planning records", () => {
  const lane = buildSeoOpportunityRegistryLaneV1({ rootDir: ROOT });
  assert.equal(lane.contract, "seo_opportunity_registry_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.planning_only, true);
  assert.equal(lane.automation_authorized, false);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.total_opportunities, 2);
  assert.equal(lane.highest_priority_opportunity?.opportunity_id, "SEO-000001");
  assert.deepEqual(lane.lifecycle_status_order, [...COMMAND_CENTER_ISSUE_STATUSES_V1]);
});

test("revenue_opportunity_registry_v1 loads seeded planning records", () => {
  const lane = buildRevenueOpportunityRegistryLaneV1({ rootDir: ROOT });
  assert.equal(lane.contract, "revenue_opportunity_registry_v1");
  assert.equal(lane.planning_only, true);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.total_opportunities, 2);
  assert.equal(lane.highest_priority_opportunity?.opportunity_id, "REV-000001");
});

test("distribution_opportunity_registry_v1 loads seeded planning records", () => {
  const lane = buildDistributionOpportunityRegistryLaneV1({ rootDir: ROOT });
  assert.equal(lane.contract, "distribution_opportunity_registry_v1");
  assert.equal(lane.planning_only, true);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.total_opportunities, 2);
  assert.equal(lane.highest_priority_opportunity?.opportunity_id, "DIST-000001");
});

test("opportunity registries reject wrong registry_kind prefix at parse time", () => {
  const lane = buildSeoOpportunityRegistryLaneV1({
    rootDir: ROOT,
    listDir: () => ["BAD-000001.json"],
    readTextFile: () =>
      JSON.stringify({
        opportunity_id: "REV-000099",
        title: "bad",
        opportunity_type: "indexability_gap",
        registry_kind: "revenue",
        severity: "TIER_2",
        detected_at: "2026-06-11T00:00:00.000Z",
        status: "DISCOVERED",
        source_system: "test",
        assigned_to: "test",
        seo_surface: "organic",
        target_queries: [],
        indexability_hypothesis: "",
      }),
  });
  assert.equal(lane.total_opportunities, 0);
  assert.ok(lane.parse_errors.some((err) => /registry_kind|opportunity_id must start/i.test(err)));
});
