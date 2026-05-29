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
import { loadWhwRetailerLinksCsvV1 } from "./whole-house-water-safe-retailer-link-apply-plan-v1";
import { buyerPathCandidateMayRecommendCsvMutationV1 } from "./whole-house-water-buyer-path-proof-result-v1";
import { WHW_AP811_BUYER_PATH_RESULT_REL_V1 } from "./whole-house-water-batch-buyer-path-proof-v1";
import {
  WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1,
} from "./whole-house-water-browser-truth-capture-result-v1";
import { WHW_AP810_FILTER_SLUG_V1 } from "./whole-house-water-safe-retailer-link-apply-plan-v1";
import { WHW_AP811_FILTER_SLUG_V1 } from "./whole-house-water-batch-buyer-path-proof-v1";
import {
  WHW_SAFE_CTA_EXPANSION_QUEUE_CONTRACT_V1,
  buildWholeHouseWaterSafeCtaExpansionQueueV1,
  classifyWhwSafeCtaExpansionLaneV1,
  scoreWhwSafeCtaExpansionTargetV1,
} from "./whole-house-water-safe-cta-expansion-queue-v1";

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

test("report is read_only true and data_mutation false", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.contract, WHW_SAFE_CTA_EXPANSION_QUEUE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.whw_public_opening_authorized, false);
  assert.equal(report.founder_approval_required_for_csv_apply, true);
});

test("lane_summary_counts is populated at root and sums to mapped filter count", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.notEqual(report.lane_summary_counts, null);
  assert.notEqual(report.lane_summary_counts, undefined);

  const lanes = [
    "APPLY_READY_FOUNDER_APPROVAL_REQUIRED",
    "BROWSER_TRUTH_READY",
    "BUYER_PATH_DISCOVERY_READY",
    "MODEL_FIRST_READY",
    "MAPPING_REVIEW_REQUIRED",
    "SKIP_FOR_NOW",
  ] as const;

  for (const lane of lanes) {
    assert.equal(typeof report.lane_summary_counts[lane], "number");
    assert.equal(report.summary.lane_counts[lane], report.lane_summary_counts[lane]);
  }

  const laneSum = lanes.reduce((acc, lane) => acc + report.lane_summary_counts[lane], 0);
  assert.equal(laneSum, report.summary.mapped_filter_count);

  assert.equal(report.lane_summary_counts.APPLY_READY_FOUNDER_APPROVAL_REQUIRED, 0);
  assert.equal(report.lane_summary_counts.BROWSER_TRUTH_READY, 0);
  assert.equal(report.lane_summary_counts.BUYER_PATH_DISCOVERY_READY, 0);
  assert.equal(report.lane_summary_counts.MODEL_FIRST_READY, 20);
  assert.equal(report.lane_summary_counts.MAPPING_REVIEW_REQUIRED, 39);
  assert.equal(report.lane_summary_counts.SKIP_FOR_NOW, 3);
});

test("AP810 is not apply-ready after founder CSV apply", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  const ap810Apply = report.apply_ready_rows.find((r) => r.filter_slug === WHW_AP810_FILTER_SLUG_V1);
  assert.equal(ap810Apply, undefined);

  const ap810Rows = [...report.blocked_or_skip_rows, ...report.top_20_safe_cta_expansion_targets].filter(
    (r) => r.filter_slug === WHW_AP810_FILTER_SLUG_V1,
  );
  const ap810 = ap810Rows[0];
  assert.ok(ap810);
  assert.equal(ap810!.lane, "SKIP_FOR_NOW");
  assert.equal(ap810!.apply_row_in_committed_csv, true);
  assert.equal(ap810!.safe_cta_in_committed_csv, true);
  assert.equal(ap810!.browser_truth_pass_count, 1);

  const inTop20 = report.top_20_safe_cta_expansion_targets.find(
    (r) => r.filter_slug === WHW_AP810_FILTER_SLUG_V1,
  );
  assert.equal(inTop20, undefined);
});

test("AP810 has exactly one aquapure-dealer row and one safe CTA in committed CSV", () => {
  const csvRows = loadWhwRetailerLinksCsvV1(REPO_ROOT);
  const ap810Rows = csvRows.filter((r) => r.filter_slug?.trim() === WHW_AP810_FILTER_SLUG_V1);
  assert.equal(ap810Rows.length, 2);

  const aquapure = ap810Rows.filter(
    (r) => (r.retailer_key ?? "").trim().toLowerCase() === "aquapure-dealer",
  );
  assert.equal(aquapure.length, 1);
  assert.equal(aquapure[0]!.is_primary?.trim().toLowerCase(), "false");
  assert.equal(
    aquapure[0]!.destination_url,
    "https://www.aquapurefilters.com/products/aqua-pure-ap810-whole-house-water-filter",
  );

  const gated = filterRealBuyRetailerLinks(
    ap810Rows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? r.destination_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  assert.equal(gated.length, 1);
  assert.equal(gated[0]!.retailer_key, "aquapure-dealer");

  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.safe_cta_row_count_in_committed_csv, 2);
});

test("AP811 is not apply-ready after founder CSV apply", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  const ap811Apply = report.apply_ready_rows.find((r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1);
  assert.equal(ap811Apply, undefined);

  const ap811Rows = [...report.blocked_or_skip_rows, ...report.top_20_safe_cta_expansion_targets].filter(
    (r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1,
  );
  const ap811 = ap811Rows[0];
  assert.ok(ap811);
  assert.equal(ap811!.lane, "SKIP_FOR_NOW");
  assert.equal(ap811!.apply_row_in_committed_csv, true);
  assert.equal(ap811!.safe_cta_in_committed_csv, true);
  assert.equal(ap811!.browser_truth_pass_count, 1);

  const inTop20 = report.top_20_safe_cta_expansion_targets.find(
    (r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1,
  );
  assert.equal(inTop20, undefined);
});

test("AP811 has exactly one aquapure-dealer row and one safe CTA in committed CSV", () => {
  const csvRows = loadWhwRetailerLinksCsvV1(REPO_ROOT);
  const ap811Rows = csvRows.filter((r) => r.filter_slug?.trim() === WHW_AP811_FILTER_SLUG_V1);
  assert.equal(ap811Rows.length, 2);

  const aquapure = ap811Rows.filter(
    (r) => (r.retailer_key ?? "").trim().toLowerCase() === "aquapure-dealer",
  );
  assert.equal(aquapure.length, 1);
  assert.equal(aquapure[0]!.is_primary?.trim().toLowerCase(), "false");
  assert.equal(
    aquapure[0]!.destination_url,
    "https://www.aquapurefilters.com/products/aqua-pure-ap811-water-filter-whole-house-water-filter",
  );

  const gated = filterRealBuyRetailerLinks(
    ap811Rows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? r.destination_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  assert.equal(gated.length, 1);
  assert.equal(gated[0]!.retailer_key, "aquapure-dealer");
});

test("queue does not open WHW", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  assert.equal(report.summary.whole_house_water_public_launch_state, "NOINDEX_UNPROVEN");
  assert.equal(report.whw_public_opening_authorized, false);
});

test("queue does not authorize Supabase or CSV mutation", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.csv_apply_authorized, false);
  assert.equal(report.supabase_update_authorized, false);
  assert.equal(report.data_mutation, false);
});

test("row count alone does not outrank easier official/OEM proof", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.ok(report.top_20_safe_cta_expansion_targets.length >= 2);

  const top = report.top_20_safe_cta_expansion_targets[0]!;
  const pentekDgd = report.top_20_safe_cta_expansion_targets.find(
    (r) => r.filter_slug === "pentek-dgd-5005",
  );
  assert.ok(pentekDgd, "expected pentek-dgd-5005 in expansion targets");
  assert.notEqual(top.filter_slug, "pentek-dgd-5005");
  if (!existsSync(path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1))) {
    assert.ok(
      ["3m-ap811", "3m-ap910r", "3m-ap917hd-s", "whirlpool-whkf-gd05", "ge-fxhtc"].includes(
        top.filter_slug,
      ),
      `expected OEM-system filter at rank 1, got ${top.filter_slug}`,
    );
  } else if (existsSync(path.join(REPO_ROOT, WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1))) {
    const ap811Apply = report.apply_ready_rows.find((r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1);
    assert.equal(ap811Apply, undefined, "AP811 should not be apply-ready after CSV apply");
    const ap811Parked = report.blocked_or_skip_rows.find((r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1);
    assert.ok(ap811Parked, "expected 3m-ap811 parked after CSV apply");
    assert.equal(ap811Parked!.lane, "SKIP_FOR_NOW");
    assert.equal(
      report.top_20_safe_cta_expansion_targets.find((r) => r.filter_slug === WHW_AP811_FILTER_SLUG_V1),
      undefined,
    );
    assert.notEqual(top.filter_slug, WHW_AP811_FILTER_SLUG_V1);
    assert.ok(
      top.lane === "MODEL_FIRST_READY" ||
        top.lane === "BUYER_PATH_DISCOVERY_READY" ||
        top.lane === "BROWSER_TRUTH_READY",
      `expected discovery lane at rank 1, got ${top.lane} (${top.filter_slug})`,
    );
  } else {
    assert.equal(top.filter_slug, WHW_AP811_FILTER_SLUG_V1);
    assert.equal(top.lane, "BROWSER_TRUTH_READY");
  }
  assert.ok(top.expansion_score > pentekDgd!.expansion_score);
});

test("compatible-only listings cannot be treated as official safe CTA", () => {
  assert.equal(
    buyerPathCandidateMayRecommendCsvMutationV1({
      url: "https://www.homedepot.com/p/Waterdrop-AP810-Whole-House-Water-Filter-10-in-x-4-5-in-5-Micron-Replacement-for-3M-Aqua-Pure-AP810-Whirlpool-WHKF-GD25BB-B-WD-AP810-2/333084969",
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

  const lane = classifyWhwSafeCtaExpansionLaneV1({
    filterSlug: "3m-ap810",
    filter: { brand_slug: "3m", oem_part_number: "AP810" },
    queueDraft: null,
    batchCandidate: null,
    modelFirstFitPass: true,
    buyerPath: {
      evidence_status_counts: { PASS: 0, FAIL: 2, UNKNOWN: 0, BLOCKED: 0 },
      recommended_csv_mutation: null,
    } as never,
    browserTruth: null,
    applyPlan: null,
    safeCtaInCsv: false,
    applyRowInCsv: false,
    primaryBuyerPathStatus: "SEARCH_PLACEHOLDER_PRIMARY",
    hasRecommendedMapping: true,
    compatOnlyMapping: false,
  });
  assert.notEqual(lane, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
});

test("search placeholders cannot count as safe CTA", () => {
  const searchUrl = "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP811";
  assert.ok(isManufacturerSiteSearchUrl(searchUrl));
  assert.equal(
    isDirectBuyableSafeCtaRow({
      retailer_key: "oem-catalog",
      affiliate_url: searchUrl,
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
    }),
    false,
  );

  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.equal(report.summary.safe_cta_row_count_in_committed_csv, 2);
  for (const row of report.top_20_safe_cta_expansion_targets) {
    assert.notEqual(row.primary_buyer_path_status, "SAFE_GATED_DIRECT_BUYABLE");
  }
});

test("batch recommendation contains multiple discovery candidates and no AP810 or AP811 founder apply", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  assert.ok(report.recommended_next_batch.length >= 2);

  const kinds = new Set(report.recommended_next_batch.map((b) => b.packet_kind));
  assert.ok(
    kinds.has("browser_truth_capture") ||
      kinds.has("buyer_path_proof") ||
      kinds.has("model_first_evidence"),
  );
  assert.equal(
    report.recommended_next_batch.find((b) => b.filter_slug === WHW_AP810_FILTER_SLUG_V1),
    undefined,
  );
  assert.equal(
    report.recommended_next_batch.find(
      (b) =>
        b.filter_slug === WHW_AP811_FILTER_SLUG_V1 && b.packet_kind === "founder_apply_review",
    ),
    undefined,
  );
  if (!existsSync(path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1))) {
    assert.ok(
      report.recommended_next_batch.some(
        (b) => b.filter_slug === WHW_AP811_FILTER_SLUG_V1 && b.packet_kind === "buyer_path_proof",
      ),
    );
  } else if (!existsSync(path.join(REPO_ROOT, WHW_AP811_BROWSER_TRUTH_RESULT_REL_V1))) {
    assert.ok(
      report.recommended_next_batch.some(
        (b) => b.filter_slug === WHW_AP811_FILTER_SLUG_V1 && b.packet_kind === "browser_truth_capture",
      ),
    );
  }
});

test("founder_approval_required on apply-ready rows", () => {
  const report = buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });
  for (const row of report.apply_ready_rows) {
    assert.equal(row.founder_approval_required, true);
    assert.equal(row.lane, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
  }
});

test("read-only build does not mutate retailer_links.csv, Supabase, public UI, launch-state, buy-gate, dispatch-run, or batch-review files", () => {
  const csvBefore = new Map(WHW_CSV_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const forbiddenBefore = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
  const mtimesBefore = snapshotMtimes([
    ...WHW_CSV_PATHS,
    ...FORBIDDEN_MUTATION_PATHS,
    "data/whole-house-water/batch-production/apply-plans-v1/whw-ap810-retailer-link-apply-plan-v1.json",
    "data/whole-house-water/batch-production/browser-truth-results-v1/whw-browser-truth-3m-ap810-v1.results.json",
    "data/whole-house-water/batch-production/agent-results-model-first-batch-v1/whw-model-first-batch-v1.results.json",
  ]);

  buildWholeHouseWaterSafeCtaExpansionQueueV1({ rootDir: REPO_ROOT });

  for (const [p, content] of csvBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, content] of forbiddenBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
  for (const [p, mtime] of mtimesBefore) {
    assert.equal(statSync(path.join(REPO_ROOT, p)).mtimeMs, mtime, `${p} mtime changed`);
  }
});

test("classifyWhwSafeCtaExpansionLaneV1 marks AP811 APPLY_READY when browser_truth PASS and CSV row absent", () => {
  const lane = classifyWhwSafeCtaExpansionLaneV1({
    filterSlug: WHW_AP811_FILTER_SLUG_V1,
    filter: { brand_slug: "3m", oem_part_number: "AP811" },
    queueDraft: null,
    batchCandidate: null,
    modelFirstFitPass: true,
    buyerPath: {
      evidence_status_counts: { PASS: 1, FAIL: 0, UNKNOWN: 3, BLOCKED: 0 },
    } as never,
    browserTruth: {
      pass_count: 1,
      safe_apply_authorized: true,
    } as never,
    applyPlan: null,
    safeCtaInCsv: false,
    applyRowInCsv: false,
    primaryBuyerPathStatus: "SEARCH_PLACEHOLDER_PRIMARY",
    hasRecommendedMapping: true,
    compatOnlyMapping: false,
  });
  assert.equal(lane, "APPLY_READY_FOUNDER_APPROVAL_REQUIRED");
});

test("classifyWhwSafeCtaExpansionLaneV1 parks AP811 when safe CTA already in committed CSV", () => {
  const lane = classifyWhwSafeCtaExpansionLaneV1({
    filterSlug: WHW_AP811_FILTER_SLUG_V1,
    filter: { brand_slug: "3m", oem_part_number: "AP811" },
    queueDraft: null,
    batchCandidate: null,
    modelFirstFitPass: true,
    buyerPath: {
      evidence_status_counts: { PASS: 1, FAIL: 0, UNKNOWN: 3, BLOCKED: 0 },
    } as never,
    browserTruth: {
      pass_count: 1,
      safe_apply_authorized: true,
    } as never,
    applyPlan: null,
    safeCtaInCsv: true,
    applyRowInCsv: true,
    primaryBuyerPathStatus: "SEARCH_PLACEHOLDER_PRIMARY",
    hasRecommendedMapping: true,
    compatOnlyMapping: false,
  });
  assert.equal(lane, "SKIP_FOR_NOW");
});

test("scoreWhwSafeCtaExpansionTargetV1 penalizes compat-only mapping vs OEM model-first pass", () => {
  const oemScore = scoreWhwSafeCtaExpansionTargetV1({
    lane: "BUYER_PATH_DISCOVERY_READY",
    filter: { brand_slug: "3m", oem_part_number: "AP811" },
    queueDraft: null,
    modelCoverageCount: 1,
    modelFirstFitPass: false,
    buyerPathUnknownCount: 0,
    browserTruthPassCount: 0,
    batchModelProofPass: true,
  });
  const compatScore = scoreWhwSafeCtaExpansionTargetV1({
    lane: "MODEL_FIRST_READY",
    filter: { brand_slug: "pentek", oem_part_number: "DGD-5005" },
    queueDraft: {
      current_mapping_truth_status: "COMPAT_ONLY",
      easiest_proof_score: 40,
      model_coverage_count: 12,
    } as never,
    modelCoverageCount: 12,
    modelFirstFitPass: false,
    buyerPathUnknownCount: 0,
    browserTruthPassCount: 0,
    batchModelProofPass: false,
  });
  assert.ok(oemScore > compatScore);
});
