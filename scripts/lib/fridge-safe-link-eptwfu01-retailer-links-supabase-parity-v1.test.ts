import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertOnlyEptwfu01SlugV1,
  FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_ALLOWED_SLUGS_V1,
  normalizeUtcInstantForParityV1,
  planEptwfu01WriteOpsV1,
  selectEptwfu01CsvPrimaryRowsV1,
  type FridgeSafeLinkEptwfu01SlugV1,
} from "./fridge-safe-link-eptwfu01-retailer-links-supabase-parity-v1";
import type { FridgeRetailerLinksScopedParityReportV1 } from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

const REPO_ROOT = process.cwd();

const EPTWFU01_URL =
  "https://www.frigidaireapplianceparts.com/PartDetail/Water-Filter/EPTWFU01/3516084";

test("allowlist is exactly eptwfu01", () => {
  assert.deepEqual([...FRIDGE_SAFE_LINK_EPTWFU01_RETAILER_LINKS_ALLOWED_SLUGS_V1], ["eptwfu01"]);
});

test("assertOnlyEptwfu01SlugV1 rejects extras and incomplete sets", () => {
  assert.equal(assertOnlyEptwfu01SlugV1(["eptwfu01"]).ok, true);
  assert.equal(assertOnlyEptwfu01SlugV1([]).ok, false);
  assert.ok(
    assertOnlyEptwfu01SlugV1(["eptwfu01", "ultrawf"]).blockers.some((b) =>
      b.includes("slug_not_in_lane_allowlist"),
    ),
  );
});

test("selectEptwfu01CsvPrimaryRowsV1 returns only eptwfu01 primary from live CSV", () => {
  const rows = selectEptwfu01CsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.filter_slug, "eptwfu01");
  assert.equal(rows[0]?.affiliate_url, EPTWFU01_URL);
  assert.equal(rows[0]?.browser_truth_classification, "direct_buyable");
  assert.equal(rows[0]?.is_primary, true);
});

test("selectEptwfu01CsvPrimaryRowsV1 ignores non-allowlist CSV rows", () => {
  const root = mkdtempSync(path.join(tmpdir(), "eptwfu01-csv-"));
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/retailer_links.csv"),
    [
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
      `eptwfu01,Frigidaire,${EPTWFU01_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-07-04T01:21:44.000Z`,
      "ultrawf,Frigidaire,https://example.com/ultra,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z",
      "wf3cb,OEM,https://example.com/wf3cb,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z",
    ].join("\n"),
    "utf8",
  );
  const rows = selectEptwfu01CsvPrimaryRowsV1({ rootDir: root });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.filter_slug, "eptwfu01");
});

test("normalizeUtcInstantForParityV1 equates Z and +00:00 forms", () => {
  assert.equal(
    normalizeUtcInstantForParityV1("2026-07-04T01:21:44.000Z"),
    normalizeUtcInstantForParityV1("2026-07-04T01:21:44+00:00"),
  );
});

test("planEptwfu01WriteOpsV1 plans at most one op for eptwfu01", () => {
  const report = {
    contract: "fridge_safe_link_eptwfu01_retailer_links_supabase_parity_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    mode: "dry_run",
    generated_at: "2026-07-04T00:00:00.000Z",
    allowed_slugs: ["eptwfu01"] as const,
    allowed_supabase_table: "public.retailer_links",
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    row_count_planned: 1,
    rows: [
      {
        filter_slug: "eptwfu01" as FridgeSafeLinkEptwfu01SlugV1,
        status: "CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE",
        filter_id: "filter-id-1",
        csv_primary: {
          filter_slug: "eptwfu01" as FridgeSafeLinkEptwfu01SlugV1,
          affiliate_url: EPTWFU01_URL,
          retailer_name: "Frigidaire",
          browser_truth_classification: "direct_buyable",
          browser_truth_notes: "notes",
          browser_truth_checked_at: "2026-07-04T01:21:44.000Z",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
        },
        supabase_primary: {
          id: "link-id-1",
          filter_id: "filter-id-1",
          affiliate_url: "https://example.com/stale",
          retailer_name: "Frigidaire",
          browser_truth_classification: "direct_buyable",
          browser_truth_notes: "stale",
          browser_truth_checked_at: "2026-01-01T00:00:00.000Z",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
        },
        field_parity: [],
        mismatched_fields: ["affiliate_url"],
        planned_action: "update",
      },
    ],
    all_in_parity: false,
    blockers: [],
    proven_facts: [],
    unknown_facts: [],
    recommended_next_action: "",
  } satisfies FridgeRetailerLinksScopedParityReportV1<FridgeSafeLinkEptwfu01SlugV1>;

  const ops = planEptwfu01WriteOpsV1(report);
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.filter_slug, "eptwfu01");
  assert.equal(ops[0]?.action, "update");
});
