import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { WHW_AP810_LIVE_BROWSER_RESULT_REL_V1 } from "./whole-house-water-model-first-evidence-result-v1";
import { WHW_AP810_BUYER_PATH_RESULT_REL_V1 } from "./whole-house-water-buyer-path-proof-result-v1";
import {
  WHW_BUYER_PATH_BROWSER_TRUTH_RETRY_HINT_V1,
  WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
  buildWholeHouseWaterModelFirstEasiestProofQueueV1,
} from "./whole-house-water-model-first-easiest-proof-queue-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "data/whole-house-water/retailer_links.csv",
];

const FORBIDDEN_MUTATION_PREFIXES = [
  "src/app/",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
];

test("report is read_only true and data_mutation false", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("no candidate is marked safe without safe gated buyer path proof", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.safe_cta_row_count, 0);
  assert.equal(report.summary.mapped_filters_with_safe_gated_direct_buyable, 0);

  for (const row of report.top_10_easiest_candidates) {
    assert.notEqual(row.current_buyer_path_status, "SAFE_GATED_DIRECT_BUYABLE");
    assert.notEqual(row.recommended_action, "BUYER_PATH_REVIEW_REQUIRED");
  }
});

test("search-placeholder-only primaries are not treated as safe", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.ok(report.summary.search_placeholder_primary_count > 0);
  assert.match(report.summary.why_safe_cta_count_is_zero, /direct_buyable|search-placeholder|filterRealBuyRetailerLinks/i);

  for (const row of report.top_10_easiest_candidates) {
    if (row.current_buyer_path_status === "SEARCH_PLACEHOLDER_PRIMARY") {
      assert.notEqual(row.recommended_action, "BUYER_PATH_REVIEW_REQUIRED");
    }
  }
});

test("row count alone cannot create top ranking — generic pentek BB fan-out loses to OEM system filters", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.ok(report.top_10_easiest_candidates.length >= 2);

  const top = report.top_10_easiest_candidates[0]!;
  const pentekDgd = report.top_10_easiest_candidates.find((r) => r.filter_slug === "pentek-dgd-5005");
  assert.ok(pentekDgd, "expected pentek-dgd-5005 in candidate set");
  assert.ok(
    pentekDgd!.model_coverage_count >= top.model_coverage_count,
    "pentek-dgd-5005 should have higher model fan-out than top ranked candidate",
  );
  assert.notEqual(top.filter_slug, "pentek-dgd-5005");
  assert.notEqual(top.filter_slug, "3m-ap810");
  assert.ok(
    ["ge-fxhtc", "ge-fxwpc", "3m-ap811", "whirlpool-whkf-gd05"].includes(top.filter_slug),
    `expected OEM-system filter at rank 1 after AP810 demotion, got ${top.filter_slug}`,
  );
});

test("committed 3m-ap810 artifacts are loaded into result_history", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.ok(
    readFileSync(path.join(REPO_ROOT, WHW_AP810_LIVE_BROWSER_RESULT_REL_V1), "utf8").includes(
      '"anchor_filter_slug": "3m-ap810"',
    ),
  );
  assert.ok(
    readFileSync(path.join(REPO_ROOT, WHW_AP810_BUYER_PATH_RESULT_REL_V1), "utf8").includes(
      '"anchor_filter_slug": "3m-ap810"',
    ),
  );
  assert.ok(report.result_history.completed_model_first_filter_slugs.includes("3m-ap810"));
  assert.ok(report.result_history.buyer_path_checked_filter_slugs.includes("3m-ap810"));
  assert.ok(report.result_history.no_mutation_filter_slugs.includes("3m-ap810"));
  assert.ok(report.result_history.buyer_path_unknown_filter_slugs.includes("3m-ap810"));
  assert.equal(report.result_history.invalid_result_files.length, 0);
});

test("3m-ap810 is demoted from active top retry after buyer-path artifact exists", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const ap810Active = report.top_10_easiest_candidates.find((r) => r.filter_slug === "3m-ap810");
  assert.equal(ap810Active, undefined);
  assert.notEqual(report.recommended_next_action?.anchor_filter_slug, "3m-ap810");
  assert.notEqual(report.top_10_easiest_candidates[0]?.filter_slug, "3m-ap810");
});

test("3m-ap810 appears in completed_or_waiting with browser_truth_required classification", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const waiting = report.completed_or_waiting_candidates.find((r) => r.filter_slug === "3m-ap810");
  assert.ok(waiting);
  assert.equal(waiting!.classification, "BUYER_PATH_BROWSER_TRUTH_REQUIRED");
  assert.equal(waiting!.model_first_fit_status, "PASS");
  assert.equal(waiting!.buyer_path_pass_count, 0);
  assert.ok(waiting!.buyer_path_unknown_count > 0);
  assert.equal(waiting!.recommended_csv_mutation, null);
  assert.equal(waiting!.retry_hint, WHW_BUYER_PATH_BROWSER_TRUTH_RETRY_HINT_V1);
  assert.ok(waiting!.model_first_artifact_rel?.includes("whw-model-first-3m-ap810"));
  assert.ok(waiting!.buyer_path_artifact_rel?.includes("whw-buyer-path-3m-ap810"));
});

test("next active candidate advances past completed 3m-ap810", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const top = report.top_10_easiest_candidates[0]!;
  assert.ok(top);
  assert.notEqual(top.filter_slug, "3m-ap810");
  assert.equal(top.recommended_action, "RUN_MODEL_FIRST_EVIDENCE");
  assert.equal(report.recommended_next_action?.anchor_filter_slug, top.filter_slug);
});

test("queue recommends no CSV mutation", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.recommended_csv_mutation, null);
  for (const row of report.completed_or_waiting_candidates) {
    assert.equal(row.recommended_csv_mutation, null);
  }
});

test("hard cases get skip/classification instead of blocking the queue", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const kinetico = report.skipped_or_hard_cases.find((r) => r.filter_slug === "kinetico-reference-system");
  assert.ok(kinetico);
  assert.equal(kinetico!.recommended_action, "DO_NOT_USE");
  assert.ok(report.top_10_easiest_candidates.length >= 1);
  assert.ok(report.recommended_next_action);
});

test("report recommends one bounded next evidence packet", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.ok(report.recommended_next_action);
  assert.equal(report.recommended_next_action!.read_only, true);
  assert.equal(report.recommended_next_action!.artifacts_not_written_yet, true);
  assert.ok(report.recommended_next_action!.anchor_model_slug.length > 0);
  assert.ok(report.recommended_next_action!.anchor_filter_slug.length > 0);
  assert.equal(
    report.recommended_next_action!.anchor_filter_slug,
    report.top_10_easiest_candidates[0]!.filter_slug,
  );
});

test("whole_house_water is not opened publicly", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  assert.equal(report.summary.whole_house_water_public_launch_state, "NOINDEX_UNPROVEN");
});

test("read-only build does not mutate CSV, public UI, launch-state, or buy-gate files", () => {
  const csvBefore = new Map(WHW_CSV_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const launchBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/catalog/vertical-launch-state.ts"),
    "utf8",
  );
  const buyGateBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/retailers/launch-buy-links.ts"),
    "utf8",
  );
  const appWhwBefore = readFileSync(
    path.join(REPO_ROOT, "src/app/whole-house-water/page.tsx"),
    "utf8",
  );

  buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });

  for (const [p, content] of csvBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/lib/catalog/vertical-launch-state.ts"), "utf8"),
    launchBefore,
  );
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/lib/retailers/launch-buy-links.ts"), "utf8"),
    buyGateBefore,
  );
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/app/whole-house-water/page.tsx"), "utf8"),
    appWhwBefore,
  );

  const changedUnderApp = readdirSync(path.join(REPO_ROOT, "src/app/whole-house-water"));
  assert.ok(changedUnderApp.length > 0);
  for (const prefix of FORBIDDEN_MUTATION_PREFIXES) {
    if (prefix.endsWith(".ts")) continue;
    assert.ok(prefix.startsWith("src/app/"));
  }
});

test("summary counts match committed CSV row totals", () => {
  const report = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const modelLines = readFileSync(path.join(REPO_ROOT, WHW_CSV_PATHS[0]!), "utf8").trim().split("\n");
  const filterLines = readFileSync(path.join(REPO_ROOT, WHW_CSV_PATHS[1]!), "utf8").trim().split("\n");
  const mappingLines = readFileSync(path.join(REPO_ROOT, WHW_CSV_PATHS[2]!), "utf8").trim().split("\n");

  assert.equal(report.summary.model_count, modelLines.length - 1);
  assert.equal(report.summary.filter_count, filterLines.length - 1);
  assert.equal(report.summary.compatibility_mapping_count, mappingLines.length - 1);
  assert.equal(report.summary.direct_buyable_classification_row_count, 0);
});
