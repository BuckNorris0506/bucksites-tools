import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildFridgeCommandCenterAndPublicTruthAuditV1,
  classifyCommandCenterTruthStatus,
  classifyPublicTruthRow,
  scanCommandCenterFridgeTruthWiring,
} from "./fridge-command-center-and-public-truth-audit-v1";
import type { FridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";

const REPO_ROOT = process.cwd();

function mockDiff(slugs: string[]): FridgeSupabaseVsCsvRetailerLinksDiffV1 {
  return {
    contract: "fridge_supabase_vs_csv_retailer_links_diff_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-01-01T00:00:00.000Z",
    exact_repo_paths_read: [],
    reconciliation_source_contract: "fridge_truth_reconciliation_v1",
    checked_slug_count: slugs.length,
    checked_filter_slugs: slugs,
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    supabase_has_win_csv_missing_count: 1,
    evidence_only_not_in_supabase_count: 0,
    csv_and_supabase_match_placeholder_count: 0,
    csv_has_win_supabase_missing_count: 0,
    unknown_status_count: 0,
    recommended_next_action: "test",
    rows: slugs.map((slug) => ({
      filter_slug: slug,
      csv_has_direct_buyable: false,
      csv_primary_url: "https://example.com/Search?SearchTerm=x",
      csv_primary_retailer: "oem-parts-catalog",
      supabase_row_count: 2,
      supabase_direct_buyable_count: slug === "ukf8001" ? 1 : 0,
      supabase_safe_cta_count: slug === "ukf8001" ? 1 : 0,
      supabase_primary_url: null,
      evidence_win_artifacts: [`data/evidence/amazon-${slug}-live-outcome.json`],
      status:
        slug === "ukf8001"
          ? "SUPABASE_HAS_WIN_CSV_MISSING"
          : "EVIDENCE_ONLY_NOT_IN_SUPABASE",
    })),
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

test("report is read_only with data_mutation false", async () => {
  const report = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: REPO_ROOT,
    deps: {
      buildDiff: async () => mockDiff(["ukf8001"]),
      loadSupabase: async () => ({
        status: "CHECKED",
        slug_to_filter_id: new Map([["ukf8001", "fid"]]),
        links_by_slug: new Map([
          [
            "ukf8001",
            [
              {
                filter_id: "fid",
                retailer_key: "amazon",
                affiliate_url: "https://www.amazon.com/dp/B07",
                is_primary: false,
                browser_truth_classification: "direct_buyable",
              },
            ],
          ],
        ]),
      }),
      loadModelCounts: async () => new Map([["fid", 5]]),
      probeLivePage: async () => ({ http_status: null, error: "skipped" }),
      env: {},
    },
  });
  assert.equal(report.contract, "fridge_command_center_and_public_truth_audit_v1");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
});

test("Command Center blind/partial/aware classification from wiring scan", () => {
  const blind = classifyCommandCenterTruthStatus(
    scanCommandCenterFridgeTruthWiring({ "scripts/x.ts": "" }),
  );
  assert.equal(blind.status, "COMMAND_CENTER_BLIND");

  const partial = classifyCommandCenterTruthStatus(
    scanCommandCenterFridgeTruthWiring({
      "scripts/x.ts": "page_publishability_truth_summary_v1",
    }),
  );
  assert.equal(partial.status, "COMMAND_CENTER_PARTIAL");
  assert.ok(partial.missing_fields.includes("refrigerator_model_first_truth_audit_v1"));

  const aware = classifyCommandCenterTruthStatus(
    scanCommandCenterFridgeTruthWiring({
      "scripts/x.ts": [
        "page_publishability_truth_summary_v1",
        "refrigerator_model_first_truth_audit_v1",
        "fridge_truth_reconciliation_v1",
        "fridge_supabase_vs_csv_retailer_links_diff_v1",
        "0/57 safe",
        "supabase win csv missing",
        "4396508",
        "gswf",
      ].join("\n"),
    }),
  );
  assert.equal(aware.status, "COMMAND_CENTER_AWARE");
});

test("public row is not TRUTHFUL without safe gated proof", () => {
  const risky = classifyPublicTruthRow({
    diff_status: "SUPABASE_HAS_WIN_CSV_MISSING",
    filter_exists: true,
    safe_cta_count: 0,
    buyer_path_state: "show_confident_buy",
    match_confidence: "high",
    live_http_status: null,
  });
  assert.equal(risky.customer_truth_status, "RISK");
  assert.equal(risky.overclaim_risk, "PROVEN");

  const truthful = classifyPublicTruthRow({
    diff_status: "SUPABASE_HAS_WIN_CSV_MISSING",
    filter_exists: true,
    safe_cta_count: 1,
    buyer_path_state: "show_confident_buy",
    match_confidence: "high",
    live_http_status: 200,
  });
  assert.equal(truthful.customer_truth_status, "TRUTHFUL");
});

test("affiliate-safe simulation: suppressed when no gated links", () => {
  const row = classifyPublicTruthRow({
    diff_status: "EVIDENCE_ONLY_NOT_IN_SUPABASE",
    filter_exists: true,
    safe_cta_count: 0,
    buyer_path_state: "suppress_buy",
    match_confidence: "high",
    live_http_status: null,
  });
  assert.equal(row.buy_cta_status, "SUPPRESSED");
  assert.notEqual(row.customer_truth_status, "TRUTHFUL");
});

test("should_redo_fridge_products_now is NO when Supabase wins and no public RISK", async () => {
  const report = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: REPO_ROOT,
    deps: {
      buildDiff: async () => mockDiff(["ukf8001"]),
      loadSupabase: async () => ({
        status: "CHECKED",
        slug_to_filter_id: new Map([["ukf8001", "fid"]]),
        links_by_slug: new Map([
          [
            "ukf8001",
            [
              {
                filter_id: "fid",
                retailer_key: "amazon",
                affiliate_url: "https://www.amazon.com/dp/B07",
                is_primary: false,
                browser_truth_classification: "direct_buyable",
              },
            ],
          ],
        ]),
      }),
      loadModelCounts: async () => new Map([["fid", 3]]),
      probeLivePage: async () => ({ http_status: null, error: "skipped" }),
      env: {},
    },
  });
  assert.equal(report.should_redo_fridge_products_now, "NO");
  assert.ok(report.recommended_next_action.toLowerCase().includes("founder"));
  assert.equal(report.recommended_next_action.toLowerCase().includes("apply now"), false);
});

test("tolerates unavailable Supabase in integration path", async () => {
  const report = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: REPO_ROOT,
    deps: {
      buildDiff: async () => mockDiff(["ukf8001"]),
      loadSupabase: async () => ({
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: "missing key",
      }),
      loadModelCounts: async () => null,
      probeLivePage: async () => ({ http_status: null, error: "skipped" }),
      env: {},
    },
  });
  assert.equal(report.rows[0]!.safe_cta_count, null);
  assert.equal(report.rows[0]!.customer_truth_status, "UNKNOWN");
});

test("repo Command Center scan is PARTIAL not AWARE", async () => {
  const report = await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: REPO_ROOT,
    deps: {
      probeLivePage: async () => ({ http_status: null, error: "skipped" }),
      env: {},
    },
  });
  assert.equal(report.command_center_truth_status, "COMMAND_CENTER_PARTIAL");
  assert.ok(
    report.command_center_missing_fields.includes("refrigerator_model_first_truth_audit_v1"),
  );
});

test("read-only audit does not mutate product CSV Supabase dispatch batch-review or public UI files", async () => {
  const guardedPaths = [
    "data/filters.csv",
    "data/retailer_links.csv",
    "data/fridge_models.csv",
    "data/compatibility_mappings.csv",
    "supabase/schema.sql",
    "data/air-purifier/batch-production/run-registry/ap-batch-v3-proposed-run-v1.json",
    "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json",
    "src/app/page.tsx",
  ];
  const before = new Map(
    guardedPaths.map((p) => [p, readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );

  await buildFridgeCommandCenterAndPublicTruthAuditV1({
    rootDir: REPO_ROOT,
    deps: {
      probeLivePage: async () => ({ http_status: null, error: "skipped" }),
      env: {},
    },
  });

  for (const [p, content] of before.entries()) {
    assert.equal(readFileSync(path.join(REPO_ROOT, p), "utf8"), content);
  }
});
