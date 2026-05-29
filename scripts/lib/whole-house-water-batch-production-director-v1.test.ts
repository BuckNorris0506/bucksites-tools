import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  filterRealBuyRetailerLinks,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";
import { buyerPathCandidateMayRecommendCsvMutationV1 } from "./whole-house-water-buyer-path-proof-result-v1";
import { WHW_AP811_BUYER_PATH_RESULT_REL_V1 } from "./whole-house-water-batch-buyer-path-proof-v1";
import {
  WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1,
} from "./whole-house-water-browser-truth-capture-result-v1";
import { WHW_AP810_FILTER_SLUG_V1 } from "./whole-house-water-safe-retailer-link-apply-plan-v1";
import {
  WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1,
  buildWholeHouseWaterBatchProductionDirectorV1,
  shouldExcludeWhwFilterFromActiveDiscoveryV1,
  shouldParkWhwBuyerPathRetryV1,
  whwSearchPlaceholderCannotBeSafeCtaV1,
} from "./whole-house-water-batch-production-director-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "data/whole-house-water/retailer_links.csv",
];

const FORBIDDEN_MUTATION_PATHS = [
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/whole-house-water/page.tsx",
  "data/whole-house-water/retailer_links.csv",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    map.set(rel, statSync(path.join(REPO_ROOT, rel)).mtimeMs);
  }
  return map;
}

function activeItems(
  report: ReturnType<typeof buildWholeHouseWaterBatchProductionDirectorV1>,
) {
  return [
    ...report.next_batch_items.founder_apply_review,
    ...report.next_batch_items.browser_truth_capture,
    ...report.next_batch_items.buyer_path_proof,
    ...report.next_batch_items.model_first_evidence,
  ];
}

test("report is read_only and data_mutation false", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, WHW_BATCH_PRODUCTION_DIRECTOR_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.founder_approval_required_for_csv_apply, true);
});

test("WHW public opening remains false", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  assert.equal(report.whw_public_opening_authorized, false);
  assert.equal(report.factory_rules.never_open_whw_from_single_safe_cta, true);
});

test("AP811 appears as browser_truth_capture current head before capture artifact", () => {
  if (!existsSync(path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1))) {
    return;
  }
  if (existsSync(path.join(REPO_ROOT, WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1))) {
    return;
  }
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.ok(report.current_batch_head);
  assert.equal(report.current_batch_head!.filter_slug, "3m-ap811");
  assert.equal(report.current_batch_head!.packet_kind, "browser_truth_capture");
  assert.equal(report.current_batch_head!.lane, "BROWSER_TRUTH_READY");
  assert.ok(
    report.next_batch_items.browser_truth_capture.some(
      (i) => i.filter_slug === "3m-ap811" && i.packet_kind === "browser_truth_capture",
    ),
  );
});

test("AP811 is parked in skip_for_now after founder CSV apply", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(
    report.next_batch_items.founder_apply_review.find((i) => i.filter_slug === "3m-ap811"),
    undefined,
  );
  const ap811Parked = report.next_batch_items.skip_for_now.find((i) => i.filter_slug === "3m-ap811");
  assert.ok(ap811Parked);
  assert.equal(ap811Parked!.packet_kind, "skip_for_now");
  assert.equal(ap811Parked!.workload, "parked");
  assert.equal(ap811Parked!.prior_attempt_parked, true);
  assert.equal(
    activeItems(report).find((i) => i.filter_slug === "3m-ap811"),
    undefined,
  );
  assert.equal(report.inspect_summary.ap811_is_founder_apply_head, false);
  assert.equal(report.inspect_summary.ap811_is_browser_truth_head, false);
  assert.equal(report.inspect_summary.ap811_browser_truth_capture_complete, true);
});

test("current batch head advances to model_first after AP811 CSV apply", () => {
  if (!existsSync(path.join(REPO_ROOT, WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1))) return;

  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.ok(report.current_batch_head);
  assert.notEqual(report.current_batch_head!.filter_slug, "3m-ap811");
  assert.equal(report.current_batch_head!.packet_kind, "model_first_evidence");
  assert.ok(report.next_batch_items.model_first_evidence.length >= 1);
  assert.equal(
    report.inspect_summary.active_filter_slugs.includes("3m-ap811"),
    false,
  );
});

test("AP810 is not re-grinded as model_first or buyer_path", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  const active = activeItems(report);
  assert.equal(
    active.find((i) => i.filter_slug === WHW_AP810_FILTER_SLUG_V1),
    undefined,
  );
  assert.ok(
    report.next_batch_items.skip_for_now.some((i) => i.filter_slug === WHW_AP810_FILTER_SLUG_V1) ||
      shouldExcludeWhwFilterFromActiveDiscoveryV1({
        filter_slug: WHW_AP810_FILTER_SLUG_V1,
        safe_cta_in_committed_csv: true,
        lane: "SKIP_FOR_NOW",
      }),
  );
});

test("batch contains multiple items not a single-filter plan", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.ok(report.active_batch_item_count >= 2);
  assert.ok(activeItems(report).length >= 2);
  const slugs = new Set(activeItems(report).map((i) => i.filter_slug));
  assert.ok(slugs.size >= 2);
  assert.ok(report.batch_strategy_summary.includes("not one-at-a-time"));
  assert.equal(report.grind_avoidance.do_not_grind_single_filter, true);
});

test("UNKNOWN and BLOCKED cases are parked not retried indefinitely", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.grind_avoidance.park_unknowns_and_advance, true);
  assert.equal(report.grind_avoidance.max_attempts_per_filter_in_batch, 1);
  assert.ok(report.next_batch_items.mapping_review.length > 0);
  assert.ok(report.next_batch_items.skip_for_now.length > 0);

  for (const item of report.next_batch_items.mapping_review) {
    assert.equal(item.workload, "parked");
    assert.equal(item.prior_attempt_parked, true);
    assert.ok(item.park_reason);
  }

  if (existsSync(path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1))) {
    assert.equal(
      activeItems(report).find((i) => i.filter_slug === "3m-ap811" && i.packet_kind === "buyer_path_proof"),
      undefined,
    );
    assert.ok(
      shouldParkWhwBuyerPathRetryV1({
        buyer_path_unknown_count: 4,
        artifact_refs: [WHW_AP811_BUYER_PATH_RESULT_REL_V1],
        lane: "BROWSER_TRUTH_READY",
      }),
    );
  }
});

test("search placeholders and compatible-only rows cannot become safe CTAs", () => {
  const searchUrl = "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP811";
  assert.ok(isManufacturerSiteSearchUrl(searchUrl));
  assert.ok(whwSearchPlaceholderCannotBeSafeCtaV1(searchUrl));
  assert.equal(
    isDirectBuyableSafeCtaRow({
      retailer_key: "oem-catalog",
      affiliate_url: searchUrl,
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
    }),
    false,
  );
  assert.equal(
    buyerPathCandidateMayRecommendCsvMutationV1({
      url: "https://example.com/compatible",
      retailer_or_source: "home_depot",
      listing_kind: "compatible_replacement",
      exact_token_proof: "compatible",
      buyability_proof: "add to cart",
      wrong_family_or_compatible_risk: "HIGH",
      buy_action_observed: true,
      browser_truth_direct_buyable_proven: true,
      passes_launch_buy_links_safe_cta_gate: true,
      status: "PASS",
    }),
    false,
  );

  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  for (const item of activeItems(report)) {
    assert.equal(item.safe_cta_claimed, false);
  }
});

test("no CSV Supabase public UI launch-state buy-gate dispatch-run or batch-review files are mutated", () => {
  const csvBefore = new Map(WHW_CSV_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const forbiddenBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
  const mtimesBefore = snapshotMtimes([
    ...WHW_CSV_PATHS,
    ...FORBIDDEN_MUTATION_PATHS,
    WHW_AP811_BUYER_PATH_RESULT_REL_V1,
    "data/whole-house-water/batch-production/agent-results-model-first-batch-v1/whw-model-first-batch-v1.results.json",
  ]);

  buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });

  for (const [p, content] of csvBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, content] of forbiddenBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, mtime] of mtimesBefore) {
    if (!existsSync(path.join(REPO_ROOT, p))) continue;
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});

test("output contains clear batch factory strategy", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.factory_rules.run_batches, true);
  assert.equal(report.factory_rules.promote_only_pass_evidence, true);
  assert.equal(report.factory_rules.park_unknown, true);
  assert.equal(report.factory_rules.fail_compatible_only_or_search_placeholders, true);
  assert.equal(report.factory_rules.never_treat_row_count_as_truth, true);
  assert.ok(report.factory_rules.rules.length >= 5);
  assert.ok(report.batch_strategy_summary.length > 20);

  if (existsSync(path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1))) {
    assert.ok(report.next_batch_items.model_first_evidence.length >= 1);
    for (const item of report.next_batch_items.model_first_evidence) {
      assert.equal(item.safe_cta_claimed, false);
      assert.equal(item.packet_kind, "model_first_evidence");
    }
  }
});

test("next_batch_size_requested 20 fills larger active batch than size 10", () => {
  const small = buildWholeHouseWaterBatchProductionDirectorV1({
    rootDir: REPO_ROOT,
    nextBatchSizeRequested: 10,
  });
  const large = buildWholeHouseWaterBatchProductionDirectorV1({
    rootDir: REPO_ROOT,
    nextBatchSizeRequested: 20,
  });
  assert.equal(small.next_batch_size_requested, 10);
  assert.equal(large.next_batch_size_requested, 20);
  assert.ok(large.active_batch_item_count >= small.active_batch_item_count);
});

test("inspect_summary provides jq-safe flat projection", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.ok(report.inspect_summary);
  assert.equal(report.inspect_summary.whw_public_opening_authorized, false);
  assert.equal(report.inspect_summary.csv_apply_authorized, false);
  assert.equal(report.inspect_summary.ap810_in_active_batch, false);
  assert.equal(
    report.inspect_summary.recommended_jq_paths.standalone_report,
    ".inspect_summary",
  );
  assert.ok(
    report.inspect_summary.next_batch_item_counts.browser_truth_capture >= 0,
  );
  assert.equal(
    typeof report.inspect_summary.next_batch_item_counts.model_first_evidence,
    "number",
  );
});

test("lane_summary_counts match expansion queue", () => {
  const report = buildWholeHouseWaterBatchProductionDirectorV1({ rootDir: REPO_ROOT });
  assert.equal(report.lane_summary_counts.APPLY_READY_FOUNDER_APPROVAL_REQUIRED, 0);
  assert.equal(report.lane_summary_counts.BROWSER_TRUTH_READY, 0);
  assert.equal(report.lane_summary_counts.MODEL_FIRST_READY, 20);
  assert.equal(report.lane_summary_counts.SKIP_FOR_NOW, 3);
});
