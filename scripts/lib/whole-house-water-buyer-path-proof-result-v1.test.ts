import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import {
  WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1,
  WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1,
  buildWhw3mAp810BuyerPathProofV1,
  buyerPathCandidateMayRecommendCsvMutationV1,
  isAllowedWhwBuyerPathProofResultRelPathV1,
  loadWhwBuyerPathProofResultV1,
  passesLaunchBuyLinksSafeCtaGateForCandidateV1,
  validateWhwBuyerPathProofResultV1,
  writeWhwBuyerPathProofResultV1,
} from "./whole-house-water-buyer-path-proof-result-v1";
import { WHW_AP810_LIVE_BROWSER_RESULT_REL_V1 } from "./whole-house-water-model-first-evidence-result-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/filters.csv",
];

test("buyer-path proof artifact schema is valid", () => {
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(validateWhwBuyerPathProofResultV1(result), true);
  assert.equal(result.contract, WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.anchor_filter_slug, "3m-ap810");
  assert.equal(result.recommended_csv_mutation, null);
});

test("artifact path is under allowed WHW buyer-path results dir", () => {
  assert.ok(isAllowedWhwBuyerPathProofResultRelPathV1(WHW_AP810_BUYER_PATH_RESULT_REL_V1));
  assert.ok(WHW_AP810_BUYER_PATH_RESULT_REL_V1.startsWith(WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1));
});

test("default report run is read-only and does not write artifact", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_AP810_BUYER_PATH_RESULT_REL_V1);
  const mtimeBefore = existsSync(targetAbs) ? statSync(targetAbs).mtimeMs : 0;
  const out = execSync("npx tsx scripts/report-whole-house-water-buyer-path-proof-3m-ap810-v1.ts", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(out) as { write_requested: boolean };
  assert.equal(parsed.write_requested, false);
  if (existsSync(targetAbs)) {
    assert.equal(statSync(targetAbs).mtimeMs, mtimeBefore);
  }
});

test("search pages cannot PASS", () => {
  assert.ok(
    isManufacturerSiteSearchUrl("https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810"),
  );
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.ok(result.buyer_path_candidates.every((c) => !isManufacturerSiteSearchUrl(c.url)));
  assert.ok(result.buyer_path_candidates.every((c) => c.status !== "PASS"));
});

test("exact token proof required for PASS recommendation", () => {
  assert.equal(
    buyerPathCandidateMayRecommendCsvMutationV1({
      url: "https://example.com/pdp",
      retailer_or_source: "test",
      listing_kind: "official_oem",
      exact_token_proof: "UNKNOWN: token unclear",
      buyability_proof: "Add to cart",
      wrong_family_or_compatible_risk: "low",
      buy_action_observed: true,
      browser_truth_direct_buyable_proven: true,
      passes_launch_buy_links_safe_cta_gate: true,
      status: "PASS",
    }),
    false,
  );
});

test("direct-buyable gate required for PASS and CSV mutation", () => {
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(result.evidence_status_counts.PASS, 0);
  assert.equal(result.recommended_csv_mutation, null);
  assert.equal(result.best_truthful_buyer_path, null);

  for (const c of result.buyer_path_candidates) {
    if (c.buy_action_observed && c.listing_kind !== "compatible_replacement") {
      assert.equal(c.browser_truth_direct_buyable_proven, false);
      assert.equal(c.passes_launch_buy_links_safe_cta_gate, false);
      assert.notEqual(c.status, "PASS");
    }
  }

  assert.equal(
    passesLaunchBuyLinksSafeCtaGateForCandidateV1({
      url: "https://www.amazon.com/dp/example",
      retailer_key: "amazon",
      browser_truth_classification: "direct_buyable",
    }),
    true,
  );
});

test("compatible products cannot PASS or be labeled official", () => {
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
  const compat = result.buyer_path_candidates.filter(
    (c) => c.listing_kind === "compatible_replacement",
  );
  assert.ok(compat.length >= 2);
  for (const c of compat) {
    assert.equal(c.status, "FAIL");
    assert.match(c.wrong_family_or_compatible_risk, /compatible|wrong-family|HIGH/i);
    assert.match(c.exact_token_proof, /compatible|Compatible|not OEM/i);
  }
});

test("whole_house_water remains NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
  assert.equal(result.do_not_open_public, true);
});

test("read-only build does not mutate CSV Supabase public UI launch-state or buy-gate files", () => {
  const csvBefore = new Map(WHW_CSV_PATHS.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]));
  const launchBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/catalog/vertical-launch-state.ts"),
    "utf8",
  );
  const buyGateBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/retailers/launch-buy-links.ts"),
    "utf8",
  );

  buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });

  for (const [p, content] of csvBefore) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
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

test("--write creates valid artifact when model-first artifact exists", () => {
  const tmpRel = `${WHW_BUYER_PATH_PROOF_RESULTS_DIR_REL_V1}/whw-buyer-path-test-write-v1.results.json`;
  const tmpAbs = path.join(REPO_ROOT, tmpRel);
  rmSync(tmpAbs, { force: true });
  try {
    const result = buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT });
    writeWhwBuyerPathProofResultV1({ rootDir: REPO_ROOT, result, relPath: tmpRel });
    const loaded = loadWhwBuyerPathProofResultV1({ rootDir: REPO_ROOT, relPath: tmpRel });
    assert.ok(loaded);
    if (existsSync(path.join(REPO_ROOT, WHW_AP810_LIVE_BROWSER_RESULT_REL_V1))) {
      assert.equal(loaded!.model_first_fit_status, "PASS");
    } else {
      assert.equal(loaded!.model_first_fit_status, "UNKNOWN");
    }
  } finally {
    rmSync(tmpAbs, { force: true });
  }
});
