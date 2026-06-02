import assert from "node:assert/strict";
import test from "node:test";

import { RPWFE_OFFICIAL_GE_TARGET_URL_V1 } from "./rpwfe-official-ge-browser-capture-v1";
import {
  buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1,
  dbRowMatchesRepoCsvForParityV1,
  executeRpwfeOfficialGeSupabaseParityApplyV1,
  proposedPatchContainsForbiddenRetailerLanguageV1,
  validateRpwfeSupabaseParityApplyPreconditionsV1,
  type RpwfeSupabaseRetailerLinkRowV1,
} from "./rpwfe-official-ge-supabase-parity-apply-v1";
import type { SupabaseLinksBySlugResultV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import type { RetailerLinkCsvRowV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";

const goodRepoRow: RetailerLinkCsvRowV1 = {
  filter_slug: "rpwfe",
  retailer_name: "GE Appliance Parts",
  affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
  is_primary: "true",
  sort_order: "0",
  retailer_key: "oem-parts-catalog",
  browser_truth_classification: "direct_buyable",
  browser_truth_notes: "RPWFE official GE BuckParts Verified Link official_manufacturer_official_ge",
  browser_truth_checked_at: "2026-06-02T14:23:08.624Z",
};

const searchDbRow: RpwfeSupabaseRetailerLinkRowV1 = {
  id: "link-rpwfe-1",
  filter_id: "filter-rpwfe",
  retailer_name: "OEM parts catalog (keyword lookup)",
  affiliate_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  destination_url: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  retailer_key: "oem-parts-catalog",
  retailer_slug: "oem-parts-catalog",
  is_primary: true,
  browser_truth_classification: null,
  browser_truth_notes: null,
  browser_truth_checked_at: null,
};

function appliedDbRow(): RpwfeSupabaseRetailerLinkRowV1 {
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(goodRepoRow);
  return {
    id: "link-rpwfe-1",
    filter_id: "filter-rpwfe",
    retailer_name: String(patch.retailer_name),
    affiliate_url: String(patch.affiliate_url),
    destination_url: String(patch.destination_url),
    retailer_key: "oem-parts-catalog",
    retailer_slug: "oem-parts-catalog",
    is_primary: true,
    browser_truth_classification: String(patch.browser_truth_classification),
    browser_truth_notes: String(patch.browser_truth_notes),
    browser_truth_checked_at: String(patch.browser_truth_checked_at),
  };
}

const supabaseMatches: SupabaseLinksBySlugResultV1 = {
  status: "CHECKED",
  slug_to_filter_id: new Map([["rpwfe", "filter-rpwfe"]]),
  links_by_slug: new Map([
    [
      "rpwfe",
      [
        {
          filter_id: "filter-rpwfe",
          retailer_key: "oem-parts-catalog",
          affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
          is_primary: true,
          browser_truth_classification: "direct_buyable",
        },
      ],
    ],
  ]),
};

test("preconditions reject non-direct-buyable repo row", () => {
  const blockers = validateRpwfeSupabaseParityApplyPreconditionsV1({
    repoRow: { ...goodRepoRow, browser_truth_classification: "" },
    rpwfeRepoRowCount: 1,
  });
  assert.ok(blockers.includes("repo_csv_not_direct_buyable_official_ge_applied"));
});

test("patch excludes Waterdrop Amazon compatible language", () => {
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(goodRepoRow);
  assert.equal(proposedPatchContainsForbiddenRetailerLanguageV1(patch), false);
  assert.equal(
    proposedPatchContainsForbiddenRetailerLanguageV1({ browser_truth_notes: "Waterdrop WD-F19C" }),
    true,
  );
});

test("dry-run ready when supabase row drifts from repo csv", async () => {
  let updated = false;
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: false,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () =>
      `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n${Object.values(goodRepoRow).join(",")}\n`,
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [searchDbRow],
      updateRowById: async () => {
        updated = true;
      },
      loadSupabaseSnapshot: async () => supabaseMatches,
    },
  });

  assert.equal(run.apply_status, "DRY_RUN_READY");
  assert.equal(updated, false);
  assert.equal(run.rows_updated, 0);
});

test("apply updates exactly one row and proves parity", async () => {
  let updateCount = 0;
  let current = searchDbRow;
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: true,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () =>
      `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\nrpwfe,GE Appliance Parts,${RPWFE_OFFICIAL_GE_TARGET_URL_V1},true,0,oem-parts-catalog,direct_buyable,RPWFE official GE BuckParts Verified Link official_manufacturer_official_ge,2026-06-02T14:23:08.624Z\n`,
    writeTextFile: () => {},
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [current],
      updateRowById: async (_id, patch) => {
        updateCount += 1;
        current = {
          ...current,
          retailer_name: String(patch.retailer_name),
          affiliate_url: String(patch.affiliate_url),
          destination_url: String(patch.destination_url),
          browser_truth_classification: String(patch.browser_truth_classification),
          browser_truth_notes: String(patch.browser_truth_notes),
          browser_truth_checked_at: String(patch.browser_truth_checked_at),
        };
      },
      loadSupabaseSnapshot: async () => {
        if (dbRowMatchesRepoCsvForParityV1(current, goodRepoRow)) return supabaseMatches;
        return {
          status: "CHECKED",
          slug_to_filter_id: new Map([["rpwfe", "filter-rpwfe"]]),
          links_by_slug: new Map([["rpwfe", [current]]]),
        } as unknown as SupabaseLinksBySlugResultV1;
      },
    },
  });

  assert.equal(run.apply_status, "APPLIED");
  assert.equal(updateCount, 1);
  assert.equal(run.post_apply_parity_status, "SUPABASE_MATCHES_REPO_CSV");
  assert.equal(run.post_apply_is_direct_buyable_safe_cta, true);
});

test("already applied is noop", async () => {
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: true,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () =>
      `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\nrpwfe,GE Appliance Parts,${RPWFE_OFFICIAL_GE_TARGET_URL_V1},true,0,oem-parts-catalog,direct_buyable,notes,2026-06-02T14:23:08.624Z\n`,
    writeTextFile: () => {},
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [appliedDbRow()],
      updateRowById: async () => {
        throw new Error("should not update");
      },
      loadSupabaseSnapshot: async () => supabaseMatches,
    },
  });

  assert.equal(run.apply_status, "ALREADY_APPLIED");
  assert.equal(run.rows_updated, 0);
});

test("blocks when more than one supabase row would match", async () => {
  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir: "/tmp",
    apply: false,
    fileExists: (p) => p.includes("retailer_links"),
    readTextFile: () =>
      `filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\nrpwfe,GE Appliance Parts,${RPWFE_OFFICIAL_GE_TARGET_URL_V1},true,0,oem-parts-catalog,direct_buyable,notes,2026-06-02T14:23:08.624Z\n`,
    deps: {
      resolveFilterIdBySlug: async () => "filter-rpwfe",
      fetchPrimaryOemRow: async () => [searchDbRow, { ...searchDbRow, id: "link-2" }],
      updateRowById: async () => {},
      loadSupabaseSnapshot: async () => supabaseMatches,
    },
  });

  assert.equal(run.apply_status, "BLOCKED");
  assert.ok(run.blockers.some((b) => b.startsWith("supabase_primary_oem_row_count_gt_one")));
});
