import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isDirectBuyableSafeCtaRow, isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import { liveBrowserBuyerPathMayRecommendCsvMutationV1 } from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1,
  WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1,
  WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1,
  WHW_MODEL_FIRST_BATCH_SIZE_V1,
  batchCandidateMayAuthorizeCsvMutationV1,
  buildWhwModelFirstBatchEvidenceV1,
  computeBatchCandidateOutcomeV1,
  isAllowedWhwModelFirstBatchEvidenceResultRelPathV1,
  selectActiveBatchCandidatesFromQueueV1,
  validateWhwModelFirstBatchEvidenceResultV1,
  writeWhwModelFirstBatchEvidenceResultV1,
} from "./whole-house-water-model-first-batch-evidence-result-v1";
import { buildWholeHouseWaterModelFirstEasiestProofQueueV1 } from "./whole-house-water-model-first-easiest-proof-queue-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
];

test("batch artifact schema is valid", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  assert.equal(validateWhwModelFirstBatchEvidenceResultV1(result), true);
  assert.equal(result.contract, WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.evidence_mode, "live_browser_model_first_batch_v1");
  assert.equal(result.safe_apply_authorized, false);
  assert.deepEqual(result.recommended_csv_mutations, []);
});

test("artifact path is under allowed WHW model-first batch results dir", () => {
  assert.ok(isAllowedWhwModelFirstBatchEvidenceResultRelPathV1(WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1));
  assert.ok(WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1.startsWith(WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1));
});

test("default report is read-only and does not write unless --write", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  rmSync(targetAbs, { force: true });
  execSync("npx tsx scripts/report-whole-house-water-model-first-batch-evidence-v1.ts", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.equal(existsSync(targetAbs), false);
});

test("3m-ap810 is excluded from active batch when completed/waiting", () => {
  const queue = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  const selected = selectActiveBatchCandidatesFromQueueV1(queue);
  assert.ok(!selected.some((r) => r.filter_slug === "3m-ap810"));
  assert.ok(queue.completed_or_waiting_candidates.some((r) => r.filter_slug === "3m-ap810"));

  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT, queue });
  assert.ok(!result.candidates_checked.some((c) => c.filter_slug === "3m-ap810"));
  assert.ok(
    result.skipped_or_hard_cases.some(
      (r) => r.filter_slug === "3m-ap810" && r.classification === "BUYER_PATH_BROWSER_TRUTH_REQUIRED",
    ),
  );
});

test("batch includes the next 5 active WHW candidates with 3m-ap811 first", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  assert.equal(result.candidates_checked.length, WHW_MODEL_FIRST_BATCH_SIZE_V1);
  assert.equal(result.source_queue_head.filter_slug, "3m-ap811");
  assert.equal(result.candidates_checked[0]!.filter_slug, "3m-ap811");
  assert.equal(result.candidates_checked[0]!.anchor_model_slug, "3m-aquapure-ap802");

  const slugs = result.candidates_checked.map((c) => c.filter_slug);
  assert.deepEqual(slugs, [
    "3m-ap811",
    "3m-ap910r",
    "3m-ap917hd-s",
    "whirlpool-whkf-gd05",
    "ge-fxhtc",
  ]);
});

test("search pages cannot PASS", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  assert.ok(
    isManufacturerSiteSearchUrl(
      "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP811",
    ),
  );
  for (const row of result.candidates_checked) {
    for (const p of row.candidate_buyer_paths) {
      assert.ok(!isManufacturerSiteSearchUrl(p.url));
      assert.notEqual(p.status, "PASS");
    }
    assert.notEqual(row.buyer_path_status, "PASS");
  }
  assert.equal(result.evidence_status_counts.PASS, 0);
});

test("exact token proof required for buyer-path PASS and CSV mutation", () => {
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1({
      url: "https://example.com/pdp",
      retailer_or_source: "test",
      exact_token_proof: "UNKNOWN: token unclear",
      buyability_proof: "Add to cart",
      wrong_family_risk: "low",
      status: "PASS",
    }),
    false,
  );

  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  assert.equal(result.recommended_csv_mutations.length, 0);
  for (const row of result.candidates_checked) {
    assert.equal(batchCandidateMayAuthorizeCsvMutationV1(row), false);
  }
});

test("direct-buyable proof required for buyer-path PASS", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  for (const row of result.candidates_checked) {
    assert.notEqual(row.buyer_path_status, "PASS");
    assert.equal(
      computeBatchCandidateOutcomeV1({
        model_proof_status: "PASS",
        buyer_path_status: "UNKNOWN",
      }),
      "UNKNOWN",
    );
  }
  assert.equal(
    isDirectBuyableSafeCtaRow({
      retailer_key: "amazon",
      affiliate_url: "https://www.amazon.com/dp/example",
      browser_truth_classification: "direct_buyable",
    }),
    true,
  );
});

test("compatible products cannot PASS or be mislabeled official in batch buyer paths", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  for (const row of result.candidates_checked) {
    for (const p of row.candidate_buyer_paths) {
      if (p.status === "PASS") {
        assert.ok(!p.wrong_family_risk.toUpperCase().includes("COMPATIBLE-ONLY"));
        assert.ok(!p.exact_token_proof.toLowerCase().includes("compatible replacement"));
      }
    }
  }
});

test("no candidate authorizes CSV mutation without model proof PASS and buyer-path PASS", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  const ap811 = result.candidates_checked.find((c) => c.filter_slug === "3m-ap811")!;
  assert.equal(ap811.model_proof_status, "PASS");
  assert.equal(ap811.buyer_path_status, "UNKNOWN");
  assert.equal(ap811.candidate_outcome, "UNKNOWN");
  assert.equal(batchCandidateMayAuthorizeCsvMutationV1(ap811), false);

  assert.equal(
    computeBatchCandidateOutcomeV1({
      model_proof_status: "PASS",
      buyer_path_status: "PASS",
    }),
    "PASS",
  );
});

test("whole_house_water remains NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  assert.equal(result.do_not_open_public, true);
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

  buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });

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
});

test("--write creates valid artifact under allowed dir", () => {
  const result = buildWhwModelFirstBatchEvidenceV1({ rootDir: REPO_ROOT });
  const tmpRel = `${WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1}/whw-model-first-batch-v1-test-write.results.json`;
  const tmpAbs = path.join(REPO_ROOT, tmpRel);
  rmSync(tmpAbs, { force: true });
  writeWhwModelFirstBatchEvidenceResultV1({ rootDir: REPO_ROOT, result, relPath: tmpRel });
  assert.ok(existsSync(tmpAbs));
  const loaded = JSON.parse(readFileSync(tmpAbs, "utf8"));
  assert.equal(validateWhwModelFirstBatchEvidenceResultV1(loaded), true);
  rmSync(tmpAbs, { force: true });
});
