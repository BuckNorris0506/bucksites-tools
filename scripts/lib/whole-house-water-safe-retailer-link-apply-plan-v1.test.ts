import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  BUYABLE_SUBTYPES,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";
import {
  WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
  buildWhw3mAp810BrowserTruthCaptureV1,
  type WhwBrowserTruthCaptureResultV1,
  loadWhwBrowserTruthCaptureResultV1,
  writeWhwBrowserTruthCaptureResultV1,
} from "./whole-house-water-browser-truth-capture-result-v1";
import {
  WHW_AP810_BUYER_PATH_RESULT_REL_V1,
  buildWhw3mAp810BuyerPathProofV1,
  loadWhwBuyerPathProofResultV1,
  writeWhwBuyerPathProofResultV1,
} from "./whole-house-water-buyer-path-proof-result-v1";
import {
  WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1,
  WHW_AP810_FILTER_SLUG_V1,
  WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1,
  WHW_APPLY_PLANS_DIR_REL_V1,
  WHW_RETAILER_LINKS_CSV_REL_V1,
  WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1,
  buildWhwAp810SafeRetailerLinkApplyPlanV1,
  findMatchingCommittedRowsV1,
  isAllowedWhwApplyPlanRelPathV1,
  isCompatibleMislabeledOfficialV1,
  isNonSearchPdpUrlV1,
  loadWhwRetailerLinksCsvV1,
  rowsMatchProposedRetailerLinkRowV1,
  validateWhwApplyPlanGatesFromArtifactV1,
  validateWhwSafeRetailerLinkApplyPlanV1,
  writeWhwSafeRetailerLinkApplyPlanV1,
} from "./whole-house-water-safe-retailer-link-apply-plan-v1";

const REPO_ROOT = process.cwd();

const WHW_CSV_PATHS = [WHW_RETAILER_LINKS_CSV_REL_V1];

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

function loadCommittedBrowserTruth(): WhwBrowserTruthCaptureResultV1 {
  ensureAp810BuyerPathSourceArtifact();
  const loaded = loadWhwBrowserTruthCaptureResultV1({
    rootDir: REPO_ROOT,
    relPath: WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
  });
  if (loaded) return loaded;
  const built = buildWhw3mAp810BrowserTruthCaptureV1({ rootDir: REPO_ROOT });
  writeWhwBrowserTruthCaptureResultV1({ rootDir: REPO_ROOT, result: built });
  return built;
}

loadCommittedBrowserTruth();

test("report is read_only true and data_mutation false", () => {
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: loadCommittedBrowserTruth(),
  });
  assert.equal(validateWhwSafeRetailerLinkApplyPlanV1(plan), true);
  assert.equal(plan.contract, WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
});

test("plan loads committed browser_truth artifact", () => {
  const artifact = loadCommittedBrowserTruth();
  assert.equal(artifact.anchor_filter_slug, WHW_AP810_FILTER_SLUG_V1);
  assert.equal(artifact.safe_apply_authorized, true);
  assert.equal(artifact.recommended_csv_mutations.length, 1);

  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: artifact,
  });
  assert.equal(plan.apply_authorized_by_artifact, true);
  assert.equal(plan.source_browser_truth_artifact, WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1);
});

test("plan refuses artifact without safe_apply_authorized=true", () => {
  const artifact = loadCommittedBrowserTruth();
  const blocked = { ...artifact, safe_apply_authorized: false };
  const refusals = validateWhwApplyPlanGatesFromArtifactV1(blocked);
  assert.ok(refusals.includes("artifact_safe_apply_authorized_false"));
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: blocked,
  });
  assert.equal(plan.ready_for_founder_approval, false);
});

test("plan refuses if recommended_csv_mutations is empty or more than one", () => {
  const artifact = loadCommittedBrowserTruth();
  const empty = { ...artifact, recommended_csv_mutations: [] };
  assert.ok(
    validateWhwApplyPlanGatesFromArtifactV1(empty).some((r) =>
      r.startsWith("recommended_csv_mutations_count_not_1"),
    ),
  );

  const two = {
    ...artifact,
    recommended_csv_mutations: [
      ...artifact.recommended_csv_mutations,
      { ...artifact.recommended_csv_mutations[0]! },
    ],
  };
  assert.ok(
    validateWhwApplyPlanGatesFromArtifactV1(two).some((r) =>
      r.startsWith("recommended_csv_mutations_count_not_1"),
    ),
  );
});

test("plan refuses search URLs", () => {
  assert.ok(isManufacturerSiteSearchUrl("https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810"));
  assert.equal(
    isNonSearchPdpUrlV1("https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810"),
    false,
  );

  const artifact = loadCommittedBrowserTruth();
  const bad = {
    ...artifact,
    recommended_csv_mutations: [
      {
        ...artifact.recommended_csv_mutations[0]!,
        destination_url: "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810",
      },
    ],
  };
  assert.ok(validateWhwApplyPlanGatesFromArtifactV1(bad).includes("mutation_destination_not_non_search_pdp"));
});

test("plan refuses compatible mislabeled official", () => {
  assert.equal(
    isCompatibleMislabeledOfficialV1({
      listingKind: "compatible_replacement",
      captureNotes: "compatible only",
      exactTokenProof: "compatible",
    }),
    true,
  );

  const artifact = loadCommittedBrowserTruth();
  const bad: WhwBrowserTruthCaptureResultV1 = {
    ...artifact,
    candidates_checked: artifact.candidates_checked.map((c) =>
      c.evidence_status === "PASS"
        ? { ...c, listing_kind: "compatible_replacement" as const }
        : c,
    ),
  };
  assert.ok(validateWhwApplyPlanGatesFromArtifactV1(bad).includes("pass_candidate_compatible_replacement"));
});

test("plan refuses missing direct_buyable classification", () => {
  const artifact = loadCommittedBrowserTruth();
  const bad = {
    ...artifact,
    recommended_csv_mutations: [
      {
        ...artifact.recommended_csv_mutations[0]!,
        browser_truth_classification: "likely_valid" as const,
      },
    ],
  };
  assert.ok(validateWhwApplyPlanGatesFromArtifactV1(bad).includes("mutation_not_direct_buyable"));
});

test("plan detects whether retailer_links.csv already contains the proposed row", () => {
  const artifact = loadCommittedBrowserTruth();
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: artifact,
  });
  assert.ok(plan.proposed_retailer_link_row);
  assert.equal(plan.row_already_exists_in_committed_csv, true);
  assert.equal(plan.matching_committed_csv_rows.length, 1);
  assert.equal(plan.ready_for_founder_approval, false);

  const csvRows = loadWhwRetailerLinksCsvV1(REPO_ROOT);
  const dup = rowsMatchProposedRetailerLinkRowV1(
    { ...plan.proposed_retailer_link_row!, is_primary: "false" },
    plan.proposed_retailer_link_row!,
  );
  assert.equal(dup, true);

  const existingOnlyOem = findMatchingCommittedRowsV1({
    rows: csvRows,
    proposed: {
      ...plan.proposed_retailer_link_row!,
      retailer_key: "oem-catalog",
      destination_url: "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP810",
    },
  });
  assert.equal(existingOnlyOem.length, 1);
});

test("founder_approval_required=true before any apply", () => {
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: loadCommittedBrowserTruth(),
  });
  assert.equal(plan.founder_approval_required, true);
  assert.equal(plan.data_mutation, false);
});

test("ready plan targets aquapurefilters authorized dealer", () => {
  const artifact = loadCommittedBrowserTruth();
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: artifact,
  });
  assert.equal(artifact.best_truthful_buyer_path?.retailer_or_source, WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1);
  assert.equal(plan.proposed_retailer_link_row?.retailer_key, "aquapure-dealer");
  assert.equal(
    artifact.recommended_csv_mutations[0]!.browser_truth_buyable_subtype,
    BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE,
  );
  assert.equal(plan.ready_for_founder_approval, false);
  assert.equal(plan.row_already_exists_in_committed_csv, true);
  assert.equal(plan.proposed_retailer_link_row?.browser_truth_classification, "direct_buyable");
  assert.ok(
    plan.proposed_retailer_link_row?.destination_url.includes("aquapurefilters.com/products"),
  );
});

test("whole_house_water remains NOINDEX_UNPROVEN", () => {
  assert.equal(getVerticalLaunchState("whole-house-water"), "NOINDEX_UNPROVEN");
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: loadCommittedBrowserTruth(),
  });
  assert.equal(plan.whw_public_opening_authorized, false);
  assert.ok(plan.why_whw_stays_closed.some((line) => line.includes("NOINDEX_UNPROVEN")));
});

test("read-only build does not mutate retailer_links.csv, Supabase, public UI, launch-state, or buy-gate files", () => {
  const csvBefore = readFileSync(path.join(REPO_ROOT, WHW_CSV_PATHS[0]!), "utf8");
  const launchBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/catalog/vertical-launch-state.ts"),
    "utf8",
  );
  const buyGateBefore = readFileSync(
    path.join(REPO_ROOT, "src/lib/retailers/launch-buy-links.ts"),
    "utf8",
  );

  buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: loadCommittedBrowserTruth(),
  });

  assert.equal(readFileSync(path.join(REPO_ROOT, WHW_CSV_PATHS[0]!), "utf8"), csvBefore);
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/lib/catalog/vertical-launch-state.ts"), "utf8"),
    launchBefore,
  );
  assert.equal(
    readFileSync(path.join(REPO_ROOT, "src/lib/retailers/launch-buy-links.ts"), "utf8"),
    buyGateBefore,
  );
});

test("artifact path is under allowed WHW apply-plans dir", () => {
  assert.ok(isAllowedWhwApplyPlanRelPathV1(WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1));
  assert.ok(WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1.startsWith(WHW_APPLY_PLANS_DIR_REL_V1));
});

test("default report is read-only and does not write unless --write", () => {
  const targetAbs = path.join(REPO_ROOT, WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1);
  const mtimeBefore = existsSync(targetAbs) ? statSync(targetAbs).mtimeMs : 0;
  const out = execSync("npx tsx scripts/report-whole-house-water-safe-retailer-link-apply-plan-v1.ts", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  const parsed = JSON.parse(out) as { write_requested: boolean };
  assert.equal(parsed.write_requested, false);
  if (existsSync(targetAbs)) {
    assert.equal(statSync(targetAbs).mtimeMs, mtimeBefore);
  }
});

test("--write creates valid apply plan under allowed dir", () => {
  const plan = buildWhwAp810SafeRetailerLinkApplyPlanV1({
    rootDir: REPO_ROOT,
    browserTruthArtifact: loadCommittedBrowserTruth(),
  });
  const tmpRel = `${WHW_APPLY_PLANS_DIR_REL_V1}/whw-ap810-retailer-link-apply-plan-test-write.json`;
  const tmpAbs = path.join(REPO_ROOT, tmpRel);
  writeWhwSafeRetailerLinkApplyPlanV1({ rootDir: REPO_ROOT, plan, relPath: tmpRel });
  assert.ok(existsSync(tmpAbs));
  const loaded = JSON.parse(readFileSync(tmpAbs, "utf8"));
  assert.equal(validateWhwSafeRetailerLinkApplyPlanV1(loaded), true);
  rmSync(tmpAbs, { force: true });
});
