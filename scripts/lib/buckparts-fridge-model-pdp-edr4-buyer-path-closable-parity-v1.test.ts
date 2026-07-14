import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertOnlyEdr4BuyerPathClosableParitySlugV1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1,
  buildEdr4BuyerPathClosableParityReportV1,
  planEdr4BuyerPathClosableParityWriteOpsV1,
  selectEdr4BuyerPathClosableParityCsvPrimaryRowsV1,
  type BuckpartsEdr4BuyerPathClosableParityFilterSlugV1,
} from "./buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_CONTRACT_V1,
  buildEdr4BuyerPathClosableParityOwnerReviewV1,
  writeEdr4BuyerPathClosableParityOwnerReviewArtifactsV1,
} from "./buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review-v1";
import type { FridgeRetailerLinksScopedParityReportV1 } from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-v1.ts",
  "utf8",
);
const OWNER_SOURCE = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review-v1.ts",
  "utf8",
);

const EDR4_URL =
  "https://www.whirlpool.com/accessories/kitchen-accessories/refrigerator/p.ice-and-water-refrigerator-filter-4.edr4rxd1.html";

test("allowlist is exactly edr4rxd1; context models are the closable duo only", () => {
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1],
    ["edr4rxd1"],
  );
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1].sort(),
    ["whirlpool-wrf540cwhz", "whirlpool-wrx735sdhz"].sort(),
  );
  assert.equal(assertOnlyEdr4BuyerPathClosableParitySlugV1(["edr4rxd1"]).ok, true);
  assert.equal(assertOnlyEdr4BuyerPathClosableParitySlugV1(["edr4rxd1", "xwfe"]).ok, false);
  assert.ok(
    assertOnlyEdr4BuyerPathClosableParitySlugV1(["xwfe"]).blockers.some((b) =>
      b.includes("slug_not_in_lane_allowlist"),
    ),
  );
});

test("CSV select returns only edr4rxd1 primary and ignores unrelated slugs", () => {
  const rows = selectEdr4BuyerPathClosableParityCsvPrimaryRowsV1({ rootDir: REPO_ROOT });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.filter_slug, "edr4rxd1");
  assert.equal(rows[0]?.affiliate_url, EDR4_URL);
  assert.equal(rows[0]?.browser_truth_classification, "direct_buyable");

  const root = mkdtempSync(path.join(tmpdir(), "edr4-closable-csv-"));
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/retailer_links.csv"),
    [
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
      `edr4rxd1,Whirlpool,${EDR4_URL},true,0,oem-parts-catalog,direct_buyable,notes,2026-06-26T12:00:00.000Z`,
      "xwfe,GE,https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE,true,0,oem-parts-catalog,,,",
      "ultrawf,Frigidaire,https://example.com/ultra,true,0,oem-parts-catalog,direct_buyable,notes,2026-07-03T17:13:04.000Z",
    ].join("\n"),
    "utf8",
  );
  const scoped = selectEdr4BuyerPathClosableParityCsvPrimaryRowsV1({ rootDir: root });
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0]?.filter_slug, "edr4rxd1");
});

test("plan write ops at most one edr4rxd1 op; never invents unrelated filters", () => {
  const report = {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    mode: "dry_run",
    generated_at: "2026-07-14T00:00:00.000Z",
    allowed_slugs: ["edr4rxd1"] as const,
    allowed_supabase_table: "public.retailer_links",
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    row_count_planned: 1,
    rows: [
      {
        filter_slug: "edr4rxd1" as BuckpartsEdr4BuyerPathClosableParityFilterSlugV1,
        status: "CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE",
        filter_id: "filter-id-1",
        csv_primary: {
          filter_slug: "edr4rxd1" as BuckpartsEdr4BuyerPathClosableParityFilterSlugV1,
          affiliate_url: EDR4_URL,
          retailer_name: "Whirlpool",
          browser_truth_classification: "direct_buyable",
          browser_truth_notes: "notes",
          browser_truth_checked_at: "2026-06-26T12:00:00.000Z",
          is_primary: true,
          retailer_key: "oem-parts-catalog",
        },
        supabase_primary: {
          id: "link-id-1",
          filter_id: "filter-id-1",
          affiliate_url: "https://example.com/stale",
          retailer_name: "Whirlpool",
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
  } satisfies FridgeRetailerLinksScopedParityReportV1<BuckpartsEdr4BuyerPathClosableParityFilterSlugV1>;

  const ops = planEdr4BuyerPathClosableParityWriteOpsV1(report);
  assert.equal(ops.length, 1);
  assert.equal(ops[0]?.filter_slug, "edr4rxd1");
  assert.equal(ops[0]?.desired.affiliate_url, EDR4_URL);
});

test("write without MUTATION is blocked; CSV-only approval never authorizes Supabase parity write", async () => {
  const prev = process.env.BUCKPARTS_IO_CAPABILITY;
  delete process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const report = await buildEdr4BuyerPathClosableParityReportV1({
      rootDir: REPO_ROOT,
      mode: "write",
      loadSupabase: async () => ({
        status: "CHECKED",
        filter_id_by_slug: new Map([["edr4rxd1", "fid-edr4"]]),
        by_slug: new Map([
          [
            "edr4rxd1",
            {
              id: "link-1",
              filter_id: "fid-edr4",
              affiliate_url: "https://example.com/stale",
              retailer_name: "Whirlpool",
              browser_truth_classification: "direct_buyable",
              browser_truth_notes: "stale",
              browser_truth_checked_at: "2026-01-01T00:00:00.000Z",
              is_primary: true,
              retailer_key: "oem-parts-catalog",
            },
          ],
        ]),
      }),
    });
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.invent_link_authorized, false);
    assert.ok(
      report.blockers.some((b) => b.includes("io_capability_read_index_cannot_mutate_supabase")),
    );
    assert.ok(
      report.blockers.some((b) =>
        b.includes("founder_supabase_parity_approval_missing_for_lane"),
      ),
    );
    assert.ok(
      report.blockers.some((b) =>
        b.includes(BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1),
      ),
    );
    assert.equal(report.csv_only_approval_blocked, true);
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prev;
  }
});

test("write with MUTATION but without new supabase-parity founder approval remains blocked", async () => {
  const prev = process.env.BUCKPARTS_IO_CAPABILITY;
  process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
  try {
    const report = await buildEdr4BuyerPathClosableParityReportV1({
      rootDir: REPO_ROOT,
      mode: "write",
      loadSupabase: async () => ({
        status: "CHECKED",
        filter_id_by_slug: new Map([["edr4rxd1", "fid-edr4"]]),
        by_slug: new Map([
          [
            "edr4rxd1",
            {
              id: "link-1",
              filter_id: "fid-edr4",
              affiliate_url: "https://example.com/stale",
              retailer_name: "Whirlpool",
              browser_truth_classification: "direct_buyable",
              browser_truth_notes: "stale",
              browser_truth_checked_at: "2026-01-01T00:00:00.000Z",
              is_primary: true,
              retailer_key: "oem-parts-catalog",
            },
          ],
        ]),
      }),
    });
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.supabase_parity_founder_approval_present, false);
    assert.ok(
      report.blockers.some((b) =>
        b.includes("founder_supabase_parity_approval_missing_for_lane"),
      ),
    );
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prev;
  }
});

test("owner-review is exact 2-model scope, read-only, existing evidence only", () => {
  const report = buildEdr4BuyerPathClosableParityOwnerReviewV1({ rootDir: REPO_ROOT });
  assert.equal(
    report.contract,
    BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_CONTRACT_V1,
  );
  assert.equal(report.read_only, true);
  assert.equal(report.apply_authorized, false);
  assert.equal(report.founder_approval_created, false);
  assert.equal(report.invent_link_authorized, false);
  assert.equal(report.auto_promote_authorized, false);
  assert.deepEqual(
    [...report.scope.context_model_slugs].sort(),
    ["whirlpool-wrf540cwhz", "whirlpool-wrx735sdhz"].sort(),
  );
  assert.deepEqual([...report.scope.allowed_filter_slugs], ["edr4rxd1"]);
  assert.equal(report.scope.max_planned_retailer_links_rows, 1);
  assert.equal(report.evidence.csv_direct_buyable_safe, true);
  assert.equal(report.evidence.csv_go_resolvable, true);
  assert.equal(report.evidence.csv_primary?.affiliate_url, EDR4_URL);
  assert.equal(report.planned_delta.filter_slug, "edr4rxd1");
  assert.equal(
    report.blocked_reuse.csv_only_approval_decision_id,
    BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1,
  );

  const tmp = mkdtempSync(path.join(tmpdir(), "edr4-owner-review-"));
  const written = writeEdr4BuyerPathClosableParityOwnerReviewArtifactsV1({
    rootDir: tmp,
    report,
  });
  assert.ok(written.json_rel_path.endsWith("owner-review-v1.json"));
});

test("libs remain read-only by default and do not invent links or mutate CSV", () => {
  assert.match(LIB_SOURCE, /invent_link_authorized: false/);
  assert.match(LIB_SOURCE, /csv_only_approval/);
  assert.match(OWNER_SOURCE, /apply_authorized: false/);
  assert.match(OWNER_SOURCE, /founder_approval_created: false/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*retailer_links\.csv/);
  assert.doesNotMatch(OWNER_SOURCE, /writeFileSync\([^)]*retailer_links\.csv/);
  assert.doesNotMatch(OWNER_SOURCE, /getSupabaseAdmin/);
});
