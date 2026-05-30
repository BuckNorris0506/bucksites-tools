import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState, isVerticalLive } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import {
  AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
  buildAirPurifierTruthSpineV1,
} from "./air-purifier-truth-spine-v1";
import {
  AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1,
  apSearchPlaceholderCannotBeSafeCtaV1,
  buildAirPurifierBatchCoverageDirectorV1,
} from "./air-purifier-batch-coverage-director-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/air-purifier/retailer_links.csv",
  "data/air-purifier/filters.csv",
  "data/air-purifier/compatibility_mappings.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/air-purifier/page.tsx",
  "data/whole-house-water/batch-production/agent-results-model-first-v1/whw-director-model-first-batch-v1.results.json",
];

function activeItems(report: ReturnType<typeof buildAirPurifierBatchCoverageDirectorV1>) {
  return [
    ...report.next_batch_items.founder_apply_review,
    ...report.next_batch_items.browser_truth_ready,
    ...report.next_batch_items.buyer_path_discovery_ready,
  ];
}

test("director is read_only true and data_mutation false", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, AP_BATCH_COVERAGE_DIRECTOR_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.source_truth_spine_contract, AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1);
});

test("AP remains LIVE but no launch-state mutation is authorized", () => {
  assert.equal(getVerticalLaunchState("air-purifier"), "LIVE");
  assert.equal(isVerticalLive("air-purifier"), true);
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.inspect_summary.public_launch_state, "LIVE");
  assert.equal(report.public_launch_change_authorized, false);
  assert.equal(report.inspect_summary.public_launch_change_authorized, false);
});

test("director uses air_purifier_truth_spine_v1 as source truth", () => {
  const spine = buildAirPurifierTruthSpineV1({ rootDir: REPO_ROOT });
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT, spine });
  assert.equal(report.inspect_summary.safe_cta_count, spine.safe_cta_count);
  assert.equal(report.inspect_summary.zero_safe_buy_path_count, spine.filters_with_zero_safe_buy_path_count);
  assert.equal(spine.safe_cta_count, 10);
  assert.equal(spine.filters_with_zero_safe_buy_path_count, 45);
  assert.ok(report.proven_facts.some((f) => f.includes(AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1)));
});

test("batch contains multiple AP filters not a one-filter plan", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  assert.ok(report.active_batch_item_count >= 2);
  assert.ok(activeItems(report).length >= 2);
  const slugs = new Set(activeItems(report).map((i) => i.filter_slug));
  assert.ok(slugs.size >= 2);
});

test("safe CTA rows are not invented from search placeholders", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  for (const item of activeItems(report)) {
    assert.equal(item.safe_cta_claimed, false);
  }
  assert.ok(apSearchPlaceholderCannotBeSafeCtaV1("https://www.winixamerica.com/search?q=115115"));
  assert.equal(
    isManufacturerSiteSearchUrl("https://www.winixamerica.com/search?q=115115"),
    true,
  );
  assert.ok(
    report.proven_facts.some((f) => f.includes("Search-placeholder") || f.includes("search")),
  );
});

test("compatible-only or ambiguous rows cannot become safe CTAs", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.all_filters_verified_claim, false);
  assert.equal(report.inspect_summary.all_filters_verified_claim, false);
  for (const item of report.next_batch_items.model_first_or_mapping_review) {
    assert.equal(item.workload, "parked");
    assert.equal(item.prior_attempt_parked, true);
  }
  assert.ok(report.factory_rules.fail_compatible_only_as_safe_cta);
});

test("UNKNOWN and BLOCKED rows are parked not retried indefinitely", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  for (const item of report.next_batch_items.skip_for_now) {
    assert.equal(item.workload, "parked");
    assert.equal(item.prior_attempt_parked, true);
    assert.ok(item.park_reason);
  }
  assert.equal(report.grind_avoidance.park_unknowns_and_advance, true);
  assert.equal(report.grind_avoidance.max_attempts_per_filter_in_batch, 1);
});

test("no CSV Supabase public UI launch-state buy-gate or WHW artifact mutation", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      readFileSync(path.join(REPO_ROOT, p), "utf8"),
    ]),
  );
  const mtimesBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.filter((p) => existsSync(path.join(REPO_ROOT, p))).map((p) => [
      p,
      statSync(path.join(REPO_ROOT, p)).mtimeMs,
    ]),
  );

  buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });

  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtimesBefore.get(p));
  }
});

test("inspect_summary exposes authorization gates as explicit false", () => {
  const report = buildAirPurifierBatchCoverageDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.inspect_summary.csv_apply_authorized, false);
  assert.equal(report.inspect_summary.supabase_update_authorized, false);
  assert.notEqual(report.supabase_update_authorized, null);
});
