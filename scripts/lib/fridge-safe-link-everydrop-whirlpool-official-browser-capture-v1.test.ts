import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  buildEverydropWhirlpoolOfficialCohortProofV1,
  buildEverydropWhirlpoolOfficialCohortProofMarkdownV1,
  buildOwnerBrowserChecklistOnlyProofForSlugV1,
  deriveEverydropWhirlpoolOfficialProofSignals,
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1,
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_JSON_REL_V1,
  FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_MD_REL_V1,
  isWhirlpoolOfficialAccessoryPdpUrl,
  isWhirlpoolPartsSearchPlaceholderUrl,
  loadRepoProvenOfficialTargetUrlV1,
  writeEverydropWhirlpoolOfficialProofDraftsV1,
} from "./fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";

const REPO_ROOT = process.cwd();

describe("fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1", () => {
  test("cohort is exactly seven whirlpoolparts search-placeholder slugs", () => {
    assert.equal(EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.length, 7);
    assert.deepEqual(EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1, [
      "edr3rxd1",
      "edr4rxd1",
      "ukf8001",
      "w10413645a",
      "4396508",
      "4396395",
      "4396842",
    ]);
  });

  test("whirlpoolparts catalog search URL is search placeholder", () => {
    assert.equal(
      isWhirlpoolPartsSearchPlaceholderUrl(
        "oem-parts-catalog",
        "https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR3RXD1",
      ),
      true,
    );
  });

  test("owner proof official whirlpool accessory URL pattern", () => {
    assert.equal(
      isWhirlpoolOfficialAccessoryPdpUrl(
        "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html",
      ),
      true,
    );
    assert.equal(
      isWhirlpoolOfficialAccessoryPdpUrl("https://www.whirlpoolparts.com/catalog.jsp?searchKeyword=EDR3RXD1"),
      false,
    );
  });

  test("repo proven target URL only for edr3/edr4 owner proof artifacts", () => {
    const edr3 = loadRepoProvenOfficialTargetUrlV1({ rootDir: REPO_ROOT, slug: "edr3rxd1" });
    const edr4 = loadRepoProvenOfficialTargetUrlV1({ rootDir: REPO_ROOT, slug: "edr4rxd1" });
    const ukf = loadRepoProvenOfficialTargetUrlV1({ rootDir: REPO_ROOT, slug: "ukf8001" });

    assert.ok(edr3.url?.includes("whirlpool.com"));
    assert.equal(edr3.source, "owner_browser_proof_result");
    assert.ok(edr4.url?.includes("whirlpool.com"));
    assert.equal(ukf.url, null);
    assert.equal(ukf.source, null);
  });

  test("deriveEverydropWhirlpoolOfficialProofSignals PASS for proven whirlpool PDP shape", () => {
    const target =
      "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-3.edr3rxd1.html";
    const d = deriveEverydropWhirlpoolOfficialProofSignals({
      slug: "edr3rxd1",
      oemToken: "EDR3RXD1",
      targetUrl: target,
      finalUrl: target,
      title: "everydrop Refrigerator Water Filter 3 - EDR3RXD1 (Pack of 1)",
      h1Text: "everydrop Refrigerator Water Filter 3 - EDR3RXD1",
      textSample: "EDR3RXD1 Add To Cart Genuine Filter",
      purchaseActions: ["Add To Cart"],
      classification: "direct_buyable",
      captureSucceeded: true,
    });
    assert.equal(d.browser_truth_status, "PASS");
    assert.equal(d.whirlpool_official_pdp_proof_result, "PROVEN");
    assert.equal(d.exact_token_proven, true);
  });

  test("checklist-only row is UNKNOWN with no coverage unlock", () => {
    const row = buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug: "4396508",
      oemToken: "4396508",
      brandSlug: "whirlpool",
      csvPrimaryUrl:
        "https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=4396508",
      repoProvenTargetUrl: null,
    });
    assert.equal(row.read_only, true);
    assert.equal(row.mutation_authorized, false);
    assert.equal(row.coverage_unlocked, false);
    assert.equal(row.whirlpool_official_pdp_proof_result, "UNKNOWN");
    assert.equal(row.browser_truth_status, "UNKNOWN");
    assert.equal(row.repo_proven_official_target_url, null);
    assert.equal(row.apply_plan_proposal_justified, false);
  });

  test("default cohort build leaves all seven slugs checklist-only UNKNOWN", async () => {
    const report = await buildEverydropWhirlpoolOfficialCohortProofV1({
      rootDir: REPO_ROOT,
      runPlaywright: false,
    });
    assert.equal(report.cohort_slug_count, 7);
    assert.equal(report.coverage_unlocked, false);
    assert.equal(report.browser_pass_count, 0);
    assert.equal(report.checklist_only_count, 7);
    for (const row of report.rows) {
      assert.equal(row.capture_method, "owner_browser_checklist_only");
      assert.equal(row.browser_truth_status, "UNKNOWN");
      assert.equal(row.whirlpool_official_pdp_proof_result, "UNKNOWN");
      assert.equal(row.coverage_unlocked, false);
    }
    assert.equal(report.repo_proven_target_url_count, 2);
    const edr3 = report.rows.find((r) => r.filter_slug === "edr3rxd1")!;
    const ukf = report.rows.find((r) => r.filter_slug === "ukf8001")!;
    assert.ok(edr3.repo_proven_official_target_url?.includes("whirlpool.com"));
    assert.equal(ukf.repo_proven_official_target_url, null);
  });

  test("writeEverydropWhirlpoolOfficialProofDraftsV1 writes only allowed draft paths", async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "everydrop-whirlpool-proof-"));
    try {
      const report = await buildEverydropWhirlpoolOfficialCohortProofV1({
        rootDir: REPO_ROOT,
        runPlaywright: false,
      });
      const written = writeEverydropWhirlpoolOfficialProofDraftsV1({ rootDir: tempRoot, report });
      assert.equal(written.json_rel_path, FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_JSON_REL_V1);
      assert.equal(written.md_rel_path, FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_MD_REL_V1);
      assert.ok(
        FRIDGE_SAFE_LINK_EVERYDROP_WHIRLPOOL_OFFICIAL_PROOF_ALLOWED_WRITE_REL_PATHS_V1.includes(
          written.json_rel_path,
        ),
      );
      const json = JSON.parse(
        readFileSync(path.join(tempRoot, written.json_rel_path), "utf8"),
      ) as { coverage_unlocked: boolean; rows: Array<{ verified_link_authorized: boolean }> };
      assert.equal(json.coverage_unlocked, false);
      assert.ok(json.rows.every((r) => r.verified_link_authorized === false));
      const md = readFileSync(path.join(tempRoot, written.md_rel_path), "utf8");
      assert.ok(md.includes("coverage_unlocked"));
      assert.ok(buildEverydropWhirlpoolOfficialCohortProofMarkdownV1(report).includes("edr3rxd1"));
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
