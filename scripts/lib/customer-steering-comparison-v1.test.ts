import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerSteeringComparisonV1,
  conflictsWithNextBestActionV1,
  factoryActionPrefixV1,
  recommendedPrimaryForFounderReviewV1,
} from "./customer-steering-comparison-v1";
import type { RecommendedNextCustomerActionDryRunV1 } from "./customer-reality-scoreboard-v1";

const GENERATED_AT = "2026-06-10T12:00:00.000Z";

function dryRun(overrides: Partial<RecommendedNextCustomerActionDryRunV1> = {}): RecommendedNextCustomerActionDryRunV1 {
  return {
    evidence_basis: "PROVEN",
    tier: 1,
    tier_label: "customer_rescue",
    action: "CUSTOMER RESCUE: Rescue ukf8001 with browser-proofed direct_buyable row.",
    blocks_discovery: true,
    closure_target_slug: "ukf8001",
    source_lanes: ["all_product_safe_buyer_path_census_v1"],
    why_not_discovery: "Zero PROMOTED missions — repair must outrank new discovery dispatch.",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    dry_run_only: true,
    replaces_next_best_action: false,
    ...overrides,
  };
}

test("conflictsWithNextBestActionV1 detects differing actions", () => {
  assert.equal(
    conflictsWithNextBestActionV1("LIFECYCLE [APPLY]", "CUSTOMER RESCUE: ukf8001"),
    true,
  );
  assert.equal(
    conflictsWithNextBestActionV1("Same action", "Same action"),
    false,
  );
  assert.equal(
    conflictsWithNextBestActionV1("  Same action  ", "Same action"),
    false,
  );
});

test("factoryActionPrefixV1 truncates long factory actions", () => {
  const long = "A".repeat(100);
  const prefix = factoryActionPrefixV1(long, 80);
  assert.equal(prefix.length, 83);
  assert.ok(prefix.endsWith("..."));
});

test("tier 0 dry-run recommends founder review customer", () => {
  const lane = buildCustomerSteeringComparisonV1({
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: dryRun({
      tier: 0,
      tier_label: "trust_stop_the_line",
      action: "TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure.",
      blocks_discovery: true,
      closure_target_slug: null,
    }),
    next_best_action: "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: air_purifier",
    why_this_action: "Factory batch planning.",
    steering_override_source: "demand_to_coverage",
  });

  assert.equal(lane.comparison.customer_tier, 0);
  assert.equal(lane.comparison.conflicts_with_next_best_action, true);
  assert.equal(lane.comparison.recommended_primary_for_founder_review, "customer");
  assert.equal(lane.dry_run_only, true);
  assert.equal(lane.replaces_next_best_action, false);
  assert.ok(lane.source_lanes.includes("customer_reality_scoreboard_v1"));
  assert.ok(lane.source_lanes.includes("next_best_action"));
});

test("tier 1 dry-run recommends founder review customer", () => {
  const lane = buildCustomerSteeringComparisonV1({
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: dryRun(),
    next_best_action: "LIFECYCLE [APPLY_READINESS_UNKNOWN]: owner-approved planning",
    why_this_action: "Batch lifecycle steering.",
    steering_override_source: "universal_batch_lifecycle",
  });

  assert.equal(lane.comparison.customer_tier, 1);
  assert.equal(lane.comparison.recommended_primary_for_founder_review, "customer");
  assert.equal(lane.comparison.blocks_discovery, true);
});

test("non-conflict tier 4 recommends factory primary", () => {
  const action = "CONTROLLED DISCOVERY: factory steering may proceed.";
  const lane = buildCustomerSteeringComparisonV1({
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: dryRun({
      tier: 4,
      tier_label: "controlled_discovery",
      action,
      blocks_discovery: false,
      why_not_discovery: null,
    }),
    next_best_action: action,
    why_this_action: "Aligned factory path.",
    steering_override_source: "root_resolve",
  });

  assert.equal(lane.comparison.conflicts_with_next_best_action, false);
  assert.equal(lane.comparison.recommended_primary_for_founder_review, "factory");
});

test("conflict tier 4 without blocks_discovery recommends compare_both", () => {
  const lane = buildCustomerSteeringComparisonV1({
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: dryRun({
      tier: 4,
      tier_label: "controlled_discovery",
      action: "CONTROLLED DISCOVERY: dry-run only.",
      blocks_discovery: false,
      why_not_discovery: null,
    }),
    next_best_action: "BATCH DISPATCH [READY]: refrigerator_water batch",
    why_this_action: "Batch dispatch override.",
    steering_override_source: "batch_dispatch",
  });

  assert.equal(lane.comparison.conflicts_with_next_best_action, true);
  assert.equal(lane.comparison.recommended_primary_for_founder_review, "compare_both");
});

test("recommendedPrimaryForFounderReviewV1 tier boundary", () => {
  assert.equal(
    recommendedPrimaryForFounderReviewV1({
      customer_tier: 2,
      blocks_discovery: false,
      conflicts_with_next_best_action: true,
    }),
    "compare_both",
  );
  assert.equal(
    recommendedPrimaryForFounderReviewV1({
      customer_tier: 2,
      blocks_discovery: true,
      conflicts_with_next_best_action: false,
    }),
    "customer",
  );
});
