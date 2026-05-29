import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import {
  WHW_AP811_ANCHOR_MODEL_SLUG_V1,
  WHW_AP811_BUYER_PATH_RESULT_REL_V1,
  WHW_AP811_COMMITTED_SEARCH_URL_V1,
  WHW_AP811_FILTER_SLUG_V1,
  WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
  buildWhw3mAp811BatchBuyerPathProofV1,
  isAllowedWhwBatchBuyerPathProofResultRelPathV1,
  loadWhwBatchBuyerPathProofResultV1,
  validateWhwBatchBuyerPathProofResultV1,
  writeWhwBatchBuyerPathProofResultV1,
} from "./whole-house-water-batch-buyer-path-proof-v1";
import {
  WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1,
  buyerPathCandidateMayRecommendCsvMutationV1,
} from "./whole-house-water-buyer-path-proof-result-v1";
import { WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1 } from "./whole-house-water-model-first-batch-evidence-result-v1";

const REPO_ROOT = process.cwd();

const FORBIDDEN_MUTATION_PATHS = [
  "data/whole-house-water/retailer_links.csv",
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/retailers/launch-buy-links.ts",
  "src/app/whole-house-water/page.tsx",
];

test("batch buyer-path artifact schema is valid", () => {
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(validateWhwBatchBuyerPathProofResultV1(result), true);
  assert.equal(result.contract, WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.anchor_filter_slug, WHW_AP811_FILTER_SLUG_V1);
  assert.equal(result.anchor_model_slug, WHW_AP811_ANCHOR_MODEL_SLUG_V1);
  assert.equal(result.source_model_first_batch_artifact, WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1);
  assert.equal(result.model_first_fit_status, "PASS");
  assert.equal(result.safe_apply_authorized, false);
  assert.equal(result.whw_public_opening_authorized, false);
  assert.equal(result.recommended_csv_mutation, null);
});

test("artifact path is under allowed WHW buyer-path results dir", () => {
  assert.ok(isAllowedWhwBatchBuyerPathProofResultRelPathV1(WHW_AP811_BUYER_PATH_RESULT_REL_V1));
  assert.ok(WHW_AP811_BUYER_PATH_RESULT_REL_V1.startsWith(WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1));
});

test("default report is read-only and does not write unless --write", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_AP811_BUYER_PATH_RESULT_REL_V1);
  const mtimeBefore = existsSync(targetAbs) ? statSync(targetAbs).mtimeMs : 0;
  const out = execSync("npx tsx scripts/report-whole-house-water-buyer-path-proof-3m-ap811-v1.ts", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(out) as { write_requested: boolean };
  assert.equal(parsed.write_requested, false);
  if (existsSync(targetAbs)) {
    assert.equal(statSync(targetAbs).mtimeMs, mtimeBefore);
  }
});

test("committed search placeholder is excluded from candidates", () => {
  assert.ok(isManufacturerSiteSearchUrl(WHW_AP811_COMMITTED_SEARCH_URL_V1));
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.ok(result.buyer_path_candidates.every((c) => !isManufacturerSiteSearchUrl(c.url)));
  assert.ok(result.buyer_path_candidates.every((c) => c.status !== "PASS"));
});

test("compatible-only listings cannot PASS", () => {
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  const kleen = result.buyer_path_candidates.find((c) => c.retailer_or_source === "kleenwater");
  assert.ok(kleen);
  assert.equal(kleen!.listing_kind, "compatible_replacement");
  assert.equal(kleen!.status, "FAIL");
  assert.equal(buyerPathCandidateMayRecommendCsvMutationV1(kleen!), false);
});

test("no PASS without browser_truth direct_buyable in this lane", () => {
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.best_truthful_buyer_path, null);
  assert.equal(result.safe_apply_authorized, false);
  assert.ok(result.evidence_status_counts.UNKNOWN > 0);
  assert.ok(result.evidence_status_counts.FAIL > 0);
});

test("WHW remains closed", () => {
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  assert.equal(result.whw_public_opening_authorized, false);
  assert.equal(result.do_not_open_public, true);
});

test("read-only build does not mutate forbidden paths", () => {
  const before = new Map(
    FORBIDDEN_MUTATION_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
  buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  for (const [p, content] of before) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content, `${p} mutated`);
  }
});

test("--write creates valid artifact under allowed dir", () => {
  const result = buildWhw3mAp811BatchBuyerPathProofV1({ rootDir: REPO_ROOT });
  const tmpRel = `${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/whw-buyer-path-3m-ap811-batch-test-write.results.json`;
  const written = writeWhwBatchBuyerPathProofResultV1({
    rootDir: REPO_ROOT,
    result,
    relPath: tmpRel,
  });
  assert.equal(written, tmpRel);
  const loaded = loadWhwBatchBuyerPathProofResultV1({ rootDir: REPO_ROOT, relPath: tmpRel });
  assert.ok(loaded);
  assert.equal(validateWhwBatchBuyerPathProofResultV1(loaded), true);
});
