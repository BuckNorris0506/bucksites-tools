import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isDirectBuyableSafeCtaRow, isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import {
  WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
  WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1,
  WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1,
  buildWhw3mAp810BrowserTruthCaptureV1,
  captureCandidateMayPassV1,
  captureCandidateMayRecommendCsvMutationV1,
  exactTokenProofIsProvenV1,
  isAllowedWhwBrowserTruthCaptureResultRelPathV1,
  selectUnknownBuyerPathCandidatesForCaptureV1,
  validateWhwBrowserTruthCaptureResultV1,
  writeWhwBrowserTruthCaptureResultV1,
} from "./whole-house-water-browser-truth-capture-result-v1";
import {
  WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  buildWhw3mAp810BuyerPathProofV1,
  loadWhwBuyerPathProofResultV1,
  writeWhwBuyerPathProofResultV1,
} from "./whole-house-water-buyer-path-proof-result-v1";

const REPO_ROOT = process.cwd();

function ensureAp810BuyerPathSourceArtifact(): void {
  const existing = loadWhwBuyerPathProofResultV1({
    rootDir: REPO_ROOT,
    relPath: WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  });
  if (existing) return;
  writeWhwBuyerPathProofResultV1({
    rootDir: REPO_ROOT,
    result: buildWhw3mAp810BuyerPathProofV1({ rootDir: REPO_ROOT }),
  });
}

ensureAp810BuyerPathSourceArtifact();

const WHW_CSV_PATHS = [
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/filters.csv",
];

test("browser_truth capture artifact schema is valid", () => {
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  assert.equal(validateWhwBrowserTruthCaptureResultV1(result), true);
  assert.equal(result.contract, WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.evidence_mode, "browser_truth_capture_v1");
  assert.equal(result.anchor_filter_slug, "3m-ap810");
});

test("artifact path is under allowed browser-truth results dir", () => {
  assert.ok(isAllowedWhwBrowserTruthCaptureResultRelPathV1(WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1));
  assert.ok(WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1.startsWith(WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1));
});

test("default report is read-only and does not write unless --write", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1);
  rmSync(targetAbs, { force: true });
  execSync("npx tsx scripts/report-whole-house-water-browser-truth-capture-3m-ap810-v1.ts", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.equal(existsSync(targetAbs), false);
});

test("source buyer-path artifact is required", () => {
  assert.throws(
    () =>
      buildWhw3mAp810BrowserTruthCaptureV1({
        rootDir: REPO_ROOT,
        source: null,
      }),
    /Missing required buyer-path artifact/,
  );
});

test("only UNKNOWN source candidates are evaluated", () => {
  const source = loadWhwBuyerPathProofResultV1({
    rootDir: REPO_ROOT,
    relPath: WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  });
  assert.ok(source);
  const unknown = selectUnknownBuyerPathCandidatesForCaptureV1(source!);
  assert.equal(unknown.length, 3);
  assert.ok(unknown.every((r) => r.status === "UNKNOWN"));

  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT, source: source! });
  assert.equal(result.candidates_checked.length, 3);
  assert.ok(!result.candidates_checked.some((c) => c.source_url.includes("solventum.com")));
  assert.ok(!result.candidates_checked.some((c) => c.listing_kind === "compatible_replacement"));
});

test("PASS requires exact token proof", () => {
  assert.equal(exactTokenProofIsProvenV1("UNKNOWN: unclear"), false);
  assert.equal(exactTokenProofIsProvenV1("PROVEN: AP810 5618902"), true);

  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  for (const row of result.candidates_checked) {
    if (row.evidence_status === "PASS") {
      assert.equal(row.exact_token_status, "PROVEN");
    }
  }
});

test("PASS requires direct-buy action", () => {
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  for (const row of result.candidates_checked) {
    if (row.evidence_status === "PASS") {
      assert.equal(row.buy_action_status, "PROVEN");
    }
    if (row.buy_action_status !== "PROVEN") {
      assert.notEqual(row.evidence_status, "PASS");
    }
  }
});

test("PASS cannot label compatible as official", () => {
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  assert.ok(result.candidates_checked.every((c) => c.listing_kind !== "compatible_replacement"));
  assert.ok(result.candidates_checked.every((c) => c.evidence_status !== "PASS" || c.wrong_family_status !== "HIGH"));
});

test("search pages cannot PASS", () => {
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  for (const row of result.candidates_checked) {
    assert.ok(!isManufacturerSiteSearchUrl(row.source_url));
    if (isManufacturerSiteSearchUrl(row.source_url)) {
      assert.notEqual(row.evidence_status, "PASS");
    }
  }
});

test("recommended_csv_mutations and safe_apply_authorized align with PASS", () => {
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  if (result.pass_count > 0) {
    assert.ok(result.recommended_csv_mutations.length > 0);
    assert.equal(result.safe_apply_authorized, true);
    assert.ok(result.best_truthful_buyer_path);
    for (const row of result.candidates_checked) {
      if (row.evidence_status === "PASS") {
        assert.equal(captureCandidateMayRecommendCsvMutationV1(row), true);
        assert.equal(captureCandidateMayPassV1(row), true);
        assert.ok(row.recommended_retailer_link_row);
        assert.equal(
          isDirectBuyableSafeCtaRow({
            retailer_key: row.recommended_retailer_link_row!.retailer_key,
            affiliate_url: row.source_url,
            browser_truth_classification: row.browser_truth_classification,
            browser_truth_buyable_subtype: row.browser_truth_buyable_subtype,
          }),
          true,
        );
      }
    }
  } else {
    assert.deepEqual(result.recommended_csv_mutations, []);
    assert.equal(result.safe_apply_authorized, false);
    assert.equal(result.best_truthful_buyer_path, null);
  }
});

test("whole_house_water remains NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
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

  buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });

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
  const result = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  const tmpRel = `${WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1}/whw-browser-truth-3m-ap810-test-write.results.json`;
  const tmpAbs = path.join(REPO_ROOT, tmpRel);
  rmSync(tmpAbs, { force: true });
  writeWhwBrowserTruthCaptureResultV1({ rootDir: REPO_ROOT, result, relPath: tmpRel });
  assert.ok(existsSync(tmpAbs));
  const loaded = JSON.parse(readFileSync(tmpAbs, "utf8"));
  assert.equal(validateWhwBrowserTruthCaptureResultV1(loaded), true);
  rmSync(tmpAbs, { force: true });
});

test("buyer-path source remains loadable after capture build", () => {
  buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  const source = loadWhwBuyerPathProofResultV1({
    rootDir: REPO_ROOT,
    relPath: WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  });
  assert.ok(source);
  assert.equal(source!.evidence_status_counts.UNKNOWN, 3);
});
