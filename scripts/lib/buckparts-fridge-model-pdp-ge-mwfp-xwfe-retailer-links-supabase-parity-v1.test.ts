import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertGeMwfpXwfeParityFilterScopeV1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
  buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1,
  classifyGeMwfpXwfeFilterParityRowV1,
  classifyOverallGeMwfpXwfeParitySyncStatusV1,
  parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1,
  selectGeMwfpXwfeParityCsvPrimaryRowsV1,
  writeGeMwfpXwfeRetailerLinksSupabaseParityArtifactsV1,
  type GeMwfpXwfeFilterParityRowV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import type { FridgeRetailerLinksScopedSlugParityV1 } from "./fridge-retailer-links-scoped-supabase-parity-core-v1";
import type { GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";

const REPO_ROOT = process.cwd();

const MWFP_URL = "https://www.geapplianceparts.com/store/parts/spec/MWFP";
const XWFE_URL = "https://www.geapplianceparts.com/store/parts/spec/XWFE";
const STALE_MWFP =
  "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWFP";
const STALE_XWFE =
  "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE";

test("exact 2-filter scope and exact 4 affected model slugs", () => {
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1],
    ["smartwater-mwfp", "xwfe"],
  );
  assert.deepEqual(
    [
      ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1,
    ],
    ["ge-gfe24jgkww", "ge-gfe27jmkes", "ge-gne25jmkww", "ge-pvd28bymfs"],
  );
  assert.equal(assertGeMwfpXwfeParityFilterScopeV1(["smartwater-mwfp", "xwfe"]).ok, true);
  assert.equal(assertGeMwfpXwfeParityFilterScopeV1(["smartwater-mwfp"]).ok, false);
  assert.ok(
    assertGeMwfpXwfeParityFilterScopeV1(["smartwater-mwfp", "xwfe", "xwf"]).blockers.some((b) =>
      b.includes("slug_not_in_lane_allowlist:xwf"),
    ),
  );
});

test("CSV selection returns only MWFP + XWFE primaries from live CSV", () => {
  const rows = selectGeMwfpXwfeParityCsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.filter_slug).sort(),
    ["smartwater-mwfp", "xwfe"],
  );
  const bySlug = new Map(rows.map((r) => [r.filter_slug, r]));
  assert.equal(bySlug.get("smartwater-mwfp")?.affiliate_url, MWFP_URL);
  assert.equal(bySlug.get("xwfe")?.affiliate_url, XWFE_URL);
  assert.equal(bySlug.get("smartwater-mwfp")?.browser_truth_classification, "direct_buyable");
  assert.equal(bySlug.get("xwfe")?.browser_truth_classification, "direct_buyable");
  assert.equal(bySlug.get("smartwater-mwfp")?.retailer_name, "GE Appliance Parts");
  assert.equal(bySlug.get("xwfe")?.retailer_key, "oem-parts-catalog");
});

test("fail-closed: stale Supabase search placeholder classifies DRIFTED", () => {
  const coreRow = {
    filter_slug: "xwfe" as GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1,
    status: "CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE" as const,
    filter_id: "fid",
    csv_primary: {
      filter_slug: "xwfe" as const,
      affiliate_url: XWFE_URL,
      retailer_name: "GE Appliance Parts",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "csv",
      browser_truth_checked_at: "2026-07-14T17:40:40.135Z",
      is_primary: true,
      retailer_key: "oem-parts-catalog",
    },
    supabase_primary: {
      id: "sid",
      filter_id: "fid",
      affiliate_url: STALE_XWFE,
      retailer_name: "OEM parts catalog (keyword lookup)",
      browser_truth_classification: "",
      browser_truth_notes: "",
      browser_truth_checked_at: "",
      is_primary: true,
      retailer_key: "oem-parts-catalog",
    },
    field_parity: [],
    mismatched_fields: ["affiliate_url", "retailer_name", "browser_truth_classification"],
    planned_action: "update" as const,
  } satisfies FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>;

  const row = classifyGeMwfpXwfeFilterParityRowV1(coreRow);
  assert.equal(row.sync_status, "DRIFTED");
  assert.equal(row.csv_is_search_placeholder, false);
  assert.equal(row.supabase_is_search_placeholder, true);
  assert.equal(row.csv_direct_buyable, true);
  assert.equal(row.supabase_direct_buyable, false);
});

test("overall classification fail-closed: any DRIFTED or UNKNOWN wins", () => {
  const drifted = {
    sync_status: "DRIFTED",
  } as GeMwfpXwfeFilterParityRowV1;
  const synced = {
    sync_status: "IN_SYNC",
  } as GeMwfpXwfeFilterParityRowV1;
  const unknown = {
    sync_status: "UNKNOWN",
  } as GeMwfpXwfeFilterParityRowV1;

  assert.equal(classifyOverallGeMwfpXwfeParitySyncStatusV1([synced, synced]), "IN_SYNC");
  assert.equal(classifyOverallGeMwfpXwfeParitySyncStatusV1([synced, drifted]), "DRIFTED");
  assert.equal(classifyOverallGeMwfpXwfeParitySyncStatusV1([synced, unknown]), "UNKNOWN");
  assert.equal(classifyOverallGeMwfpXwfeParitySyncStatusV1([drifted, unknown]), "UNKNOWN");
});

test("CLI rejects --write/--apply; accepts --write-artifacts", () => {
  assert.deepEqual(parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1(["--write-artifacts"]), {
    writeArtifacts: true,
  });
  assert.throws(
    () => parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1(["--write"]),
    /read-only/,
  );
  assert.throws(
    () => parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1(["--apply"]),
    /read-only/,
  );
});

test("proof is read-only with mutation flags false; writes only allowlisted drafts", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ge-mwfp-parity-"));
  mkdirSync(path.join(root, "data"), { recursive: true });
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  writeFileSync(
    path.join(root, "data/retailer_links.csv"),
    [
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
      `smartwater-mwfp,GE Appliance Parts,${MWFP_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-07-14T17:40:40.135Z`,
      `xwfe,GE Appliance Parts,${XWFE_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-07-14T17:40:40.135Z`,
      `xwf,OEM,https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWF,true,0,oem-parts-catalog,,,`,
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(
      root,
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.json",
    ),
    JSON.stringify({
      summary: { SAFE_BUYER_PATH_PASS: 21, SAFE_BUYER_PATH_FAIL: 7 },
      rows: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1.map(
        (slug) => ({
          slug,
          verdict: "SAFE_BUYER_PATH_FAIL",
          missing_reasons: [
            "no_safe_direct_buyable_cta_after_gate",
            "no_go_resolvable_safe_retailer_link",
          ],
          safe_cta_count: 0,
          go_resolvable_count: 0,
          mapped_filter_count: 1,
          buyer_path_state: "suppress_buy",
        }),
      ),
    }),
    "utf8",
  );

  const report = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1({
    rootDir: root,
    loadSupabase: async () => ({
      status: "CHECKED",
      by_slug: new Map([
        [
          "smartwater-mwfp",
          {
            id: "1",
            filter_id: "f1",
            affiliate_url: STALE_MWFP,
            retailer_name: "OEM parts catalog (keyword lookup)",
            browser_truth_classification: "",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
        [
          "xwfe",
          {
            id: "2",
            filter_id: "f2",
            affiliate_url: STALE_XWFE,
            retailer_name: "OEM parts catalog (keyword lookup)",
            browser_truth_classification: "",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
      ]),
      filter_id_by_slug: new Map([
        ["smartwater-mwfp", "f1"],
        ["xwfe", "f2"],
      ]),
    }),
  });

  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.csv_mutation_authorized, false);
  assert.equal(report.apply_lane_authorized, false);
  assert.equal(report.pages_claimed_closed, false);
  assert.equal(report.conversion_claimed, false);
  assert.equal(report.overall_sync_status, "DRIFTED");
  assert.equal(report.drifted_filter_count, 2);
  assert.equal(report.any_supabase_search_placeholder, true);
  assert.equal(
    report.cta_go_failure_cause,
    "SUPABASE_STALE_OR_SEARCH_PLACEHOLDER_BLOCKS_RUNTIME_CTA",
  );
  assert.ok(report.recommended_next_action.includes("Founder-gated scoped Supabase"));
  assert.ok(report.recommended_next_action.includes("Do not claim 4 pages closed yet"));
  assert.equal(report.pages_claimed_closed, false);

  const written = writeGeMwfpXwfeRetailerLinksSupabaseParityArtifactsV1({
    rootDir: root,
    report,
  });
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_ALLOWED_WRITE_REL_PATHS_V1],
    [written.json_rel_path, written.md_rel_path],
  );
  assert.ok(
    readFileSync(path.join(root, BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1), "utf8").includes(
      "DRIFTED",
    ),
  );

  // Lib source must not call write apply helpers.
  const src = readFileSync(
    path.join(
      REPO_ROOT,
      "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.ts",
    ),
    "utf8",
  );
  assert.ok(!src.includes("applyScopedFridgeRetailerLinksWriteV1"));
  assert.ok(!src.includes("planScopedWriteOpsV1"));
});

test("source forbids mutation surfaces in CLI", () => {
  const cli = readFileSync(
    path.join(
      REPO_ROOT,
      "scripts/report-buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.ts",
    ),
    "utf8",
  );
  assert.ok(cli.includes("--write-artifacts"));
  assert.ok(!cli.includes("BUCKPARTS_IO_CAPABILITY=MUTATION"));
  assert.ok(!cli.includes("applyScoped"));
});
