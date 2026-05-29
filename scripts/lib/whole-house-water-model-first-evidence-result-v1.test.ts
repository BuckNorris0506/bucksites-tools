import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";
import { liveBrowserBuyerPathMayRecommendCsvMutationV1 } from "./air-purifier-model-first-evidence-result-v1";
import { buildWholeHouseWaterModelFirstEasiestProofQueueV1 } from "./whole-house-water-model-first-easiest-proof-queue-v1";
import {
  WHW_AP810_LIVE_BROWSER_RESULT_REL_V1,
  WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
  WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  buildWhw3mAp810LiveBrowserEvidenceV1,
  isAllowedWhwModelFirstEvidenceResultRelPathV1,
  loadWhwModelFirstEvidenceResultV1,
  validateWhwModelFirstEvidenceResultV1,
  writeWhwModelFirstEvidenceResultV1,
} from "./whole-house-water-model-first-evidence-result-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [
  "data/whole-house-water/models.csv",
  "data/whole-house-water/filters.csv",
  "data/whole-house-water/compatibility_mappings.csv",
  "data/whole-house-water/retailer_links.csv",
];

test("WHW model-first evidence artifact schema is valid", () => {
  const result = buildWhw3mAp810LiveBrowserEvidenceV1();
  assert.equal(validateWhwModelFirstEvidenceResultV1(result), true);
  assert.equal(result.contract, WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1);
  assert.equal(result.read_only, true);
  assert.equal(result.data_mutation, false);
  assert.equal(result.do_not_open_public, true);
  assert.equal(result.anchor_model_slug, "3m-aquapure-ap801");
  assert.equal(result.anchor_filter_slug, "3m-ap810");
  assert.equal(result.recommended_csv_mutation, null);
});

test("artifact path is under allowed WHW model-first results dir", () => {
  assert.ok(isAllowedWhwModelFirstEvidenceResultRelPathV1(WHW_AP810_LIVE_BROWSER_RESULT_REL_V1));
  assert.ok(WHW_AP810_LIVE_BROWSER_RESULT_REL_V1.startsWith(WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1));
  assert.equal(isAllowedWhwModelFirstEvidenceResultRelPathV1("data/whole-house-water/filters.csv"), false);
});

test("default report run is read-only and does not write artifact", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_AP810_LIVE_BROWSER_RESULT_REL_V1);
  rmSync(targetAbs, { force: true });
  execSync("npx tsx scripts/report-whole-house-water-model-first-evidence-3m-ap810-v1.ts", {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.equal(existsSync(targetAbs), false);
});

test("PASS buyer path cannot validate without exact token proof and non-search URL", () => {
  const bad = buildWhw3mAp810LiveBrowserEvidenceV1();
  const searchPass = {
    ...bad,
    candidate_buyer_paths: [
      {
        url: "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810",
        retailer_or_source: "3m_search",
        exact_token_proof: "PROVEN: AP810",
        buyability_proof: "Add to Cart",
        wrong_family_risk: "low",
        status: "PASS" as const,
      },
    ],
  };
  assert.equal(validateWhwModelFirstEvidenceResultV1(searchPass), false);
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1(searchPass.candidate_buyer_paths[0]!),
    false,
  );
  assert.ok(isManufacturerSiteSearchUrl(searchPass.candidate_buyer_paths[0]!.url));
});

test("PASS buyer path cannot validate without safe direct-buyable proof", () => {
  assert.equal(
    liveBrowserBuyerPathMayRecommendCsvMutationV1({
      url: "https://www.aquapurefilters.com/products/aqua-pure-ap810-whole-house-water-filter",
      retailer_or_source: "dealer",
      exact_token_proof: "UNKNOWN: token not verified",
      buyability_proof: "Add to cart seen",
      wrong_family_risk: "low",
      status: "PASS",
    }),
    false,
  );
});

test("model PASS requires documented AP810 token on official sources", () => {
  const result = buildWhw3mAp810LiveBrowserEvidenceV1();
  const row = result.model_rows[0]!;
  assert.equal(row.evidence_status, "PASS");
  assert.ok(row.documented_filter_tokens.includes("AP810"));
  assert.ok(row.official_source_urls.some((u) => u.includes("multimedia.3m.com")));
  assert.equal(result.evidence_status_counts.PASS, 1);
  assert.equal(
    result.candidate_buyer_paths.every((p) => p.status !== "PASS"),
    true,
    "no safe buyer PASS in this packet",
  );
});

test("compatible replacement cannot be mislabeled official in buyer path PASS", () => {
  const result = buildWhw3mAp810LiveBrowserEvidenceV1();
  for (const p of result.candidate_buyer_paths) {
    if (p.status === "PASS") {
      assert.ok(!p.exact_token_proof.toLowerCase().includes("compatible-only"));
      assert.ok(!p.wrong_family_risk.toLowerCase().includes("compatible replacement official"));
    }
  }
  const dealer = result.candidate_buyer_paths.find((p) => p.retailer_or_source.includes("dealer"))!;
  assert.equal(dealer.status, "UNKNOWN");
  assert.match(dealer.wrong_family_risk, /do not label compatible/i);
});

test("whole_house_water remains NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const result = buildWhw3mAp810LiveBrowserEvidenceV1();
  assert.equal(result.do_not_open_public, true);
  assert.ok(result.proven_facts.some((f) => f.includes("NOINDEX_UNPROVEN")));
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
  const whwPageBefore = readFileSync(
    path.join(REPO_ROOT, "src/app/whole-house-water/page.tsx"),
    "utf8",
  );

  buildWhw3mAp810LiveBrowserEvidenceV1();
  buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });

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
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/app/whole-house-water/page.tsx"), "utf8"),
    whwPageBefore,
  );
});

test("--write creates valid artifact under allowed dir", () => {
  const tmpRel = `${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/whw-model-first-test-write-v1.results.json`;
  const tmpAbs = path.join(REPO_ROOT, tmpRel);
  rmSync(tmpAbs, { force: true });
  try {
    const result = buildWhw3mAp810LiveBrowserEvidenceV1();
    writeWhwModelFirstEvidenceResultV1({ rootDir: REPO_ROOT, result, relPath: tmpRel });
    assert.ok(existsSync(tmpAbs));
    const loaded = loadWhwModelFirstEvidenceResultV1({ rootDir: REPO_ROOT, relPath: tmpRel });
    assert.ok(loaded);
    assert.equal(loaded!.packet_id, "whw-model-first-3m-ap810-v1");
  } finally {
    rmSync(tmpAbs, { force: true });
  }
});

test("queue still recommends AP801 anchor after evidence packet shape", () => {
  const queue = buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir: REPO_ROOT });
  assert.equal(queue.recommended_next_action?.anchor_model_slug, "3m-aquapure-ap801");
  assert.equal(queue.recommended_next_action?.anchor_filter_slug, "3m-ap810");
  const names = readdirSync(path.join(REPO_ROOT, "data/whole-house-water"));
  assert.ok(names.includes("models.csv"));
});
