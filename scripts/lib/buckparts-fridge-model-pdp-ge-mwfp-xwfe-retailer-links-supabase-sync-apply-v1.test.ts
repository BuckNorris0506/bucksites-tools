import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1,
  buildGeMwfpXwfeSupabaseSyncApplyReportV1,
  geMwfpXwfeSupabaseSyncNotesAreSafeV1,
  parseGeMwfpXwfeSupabaseSyncApplyArgvV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1";

const ROOT = process.cwd();
const LIB = readFileSync(
  "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.ts",
  "utf8",
);

test("CLI: dry-run default; refuses --apply alias; accepts --write", () => {
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1([]), {
    write: false,
    writeArtifacts: true,
  });
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--write-artifacts"]), {
    write: false,
    writeArtifacts: true,
  });
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--write"]), {
    write: true,
    writeArtifacts: false,
  });
  assert.throws(() => parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--apply"]), /--write/);
});

test("exact 2-filter scope; xwf excluded; inserts/deletes zero; pages not claimed", async () => {
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "dry_run",
  });
  assert.deepEqual([...report.allowed_filter_slugs], ["smartwater-mwfp", "xwfe"]);
  assert.deepEqual([...report.excluded_filter_slugs], ["xwf"]);
  assert.equal(report.planned_inserts, 0);
  assert.equal(report.planned_deletes, 0);
  assert.equal(report.csv_mutation_authorized, false);
  assert.equal(report.pages_claimed_closed, false);
  assert.equal(report.conversion_claimed, false);
  assert.equal(report.rows.length, 2);
  assert.ok(!report.allowed_filter_slugs.includes("xwf" as never));
});

test("approval + stale-search-placeholder dry-run READY, or post-apply fail-closed when already synced", async () => {
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "dry_run",
  });
  if (report.supabase_truth_status !== "CHECKED") {
    assert.ok(report.blockers.some((b) => b.includes("supabase_unavailable")));
    return;
  }

  // Bound founder packet must still load for this lane.
  assert.ok(report.founder_decision_id);
  assert.equal(report.planned_inserts, 0);
  assert.equal(report.planned_deletes, 0);

  const alreadySynced = report.rows.every(
    (r) =>
      r.supabase_primary != null &&
      r.supabase_is_search_placeholder === false &&
      r.supabase_primary.affiliate_url ===
        (r.filter_slug === "smartwater-mwfp"
          ? "https://www.geapplianceparts.com/store/parts/spec/MWFP"
          : "https://www.geapplianceparts.com/store/parts/spec/XWFE"),
  );

  if (alreadySynced) {
    // Post-apply: refuse re-write because stale search-placeholder pretest fails closed.
    assert.equal(report.row_count_planned, 0);
    assert.equal(report.founder_approval_present, false);
    assert.ok(
      report.blockers.some(
        (b) =>
          b.includes("unexpected_current_url") ||
          b.includes("current_not_search_placeholder") ||
          b.includes("planned_updates_not_2") ||
          b.includes("founder_approval_bound_sha256_mismatch"),
      ),
    );
    return;
  }

  assert.equal(report.founder_approval_present, true);
  assert.equal(report.row_count_planned, 2);
  assert.equal(report.planned_updates, 2);
  assert.equal(report.blockers.length, 0);
  for (const row of report.rows) {
    assert.equal(row.planned_action, "update");
    assert.equal(row.supabase_is_search_placeholder, true);
    assert.equal(row.stale_url_matches_expected, true);
    assert.equal(row.link_id_matches_approval, true);
    assert.equal(row.is_existing_primary, true);
    assert.equal(
      row.expected_stale_affiliate_url,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
        row.filter_slug
      ],
    );
    assert.equal(
      row.expected_supabase_link_id,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
        row.filter_slug
      ],
    );
    assert.ok(row.desired);
    assert.ok(geMwfpXwfeSupabaseSyncNotesAreSafeV1(row.desired!.browser_truth_notes));
    assert.equal(row.desired!.browser_truth_classification, "direct_buyable");
    assert.equal(row.desired!.retailer_name, "GE Appliance Parts");
    assert.equal(row.desired!.retailer_key, "oem-parts-catalog");
  }
});

test("mocked stale primaries + approval yields READY dry-run scope", async () => {
  const { execSync } = await import("node:child_process");
  const parityRel =
    "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json";
  // Keep founder binding hashes stable even if working-tree parity was rewritten post-apply.
  const headParity = execSync(`git show HEAD:${parityRel}`, { encoding: "utf8" });
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "dry_run",
    readText: (abs) => {
      if (abs.endsWith(parityRel) || abs.includes(`${parityRel}`)) return headParity;
      return readFileSync(abs, "utf8");
    },
    loadSupabase: async () => ({
      status: "CHECKED",
      by_slug: new Map([
        [
          "smartwater-mwfp",
          {
            id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
              "smartwater-mwfp"
            ],
            filter_id: "f1",
            affiliate_url:
              BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
                "smartwater-mwfp"
              ],
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
            id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1
              .xwfe,
            filter_id: "f2",
            affiliate_url:
              BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1
                .xwfe,
            retailer_name: "OEM parts catalog (keyword lookup)",
            browser_truth_classification: "",
            browser_truth_notes: "",
            browser_truth_checked_at: "",
            is_primary: true,
            retailer_key: "oem-parts-catalog",
          },
        ],
      ]) as never,
      filter_id_by_slug: new Map([
        ["smartwater-mwfp", "f1"],
        ["xwfe", "f2"],
      ]) as never,
    }),
    getSupabaseAdmin: () => ({
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [{ id: "1", is_primary: true }],
            error: null,
          }),
        }),
      }),
    }),
    loadEnv: () => undefined,
  });
  assert.equal(report.founder_approval_present, true);
  assert.equal(report.row_count_planned, 2);
  assert.equal(report.blockers.length, 0);
  assert.ok(report.rows.every((r) => r.planned_action === "update"));
});

test("fail-closed: write without MUTATION cannot authorize", async () => {
  const prev = process.env.BUCKPARTS_IO_CAPABILITY;
  delete process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
      rootDir: ROOT,
      mode: "write",
    });
    assert.equal(report.mutation_authorized, false);
    assert.ok(report.blockers.some((b) => /MUTATION|io_capability/i.test(b)));
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prev;
  }
});

test("fail-closed: missing approval blocks write", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ge-sync-apply-no-appr-"));
  try {
    // Minimal mirror of required files for CSV selection + no approval.
    mkdirSync(path.join(root, "data"), { recursive: true });
    mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
    writeFileSync(
      path.join(root, "data/retailer_links.csv"),
      readFileSync(path.join(ROOT, "data/retailer_links.csv"), "utf8"),
    );
    // Copy bound artifacts so evaluate can still fail on missing approval first.
    for (const rel of [
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.json",
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json",
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json",
    ]) {
      writeFileSync(path.join(root, rel), readFileSync(path.join(ROOT, rel), "utf8"));
    }
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
      rootDir: root,
      mode: "write",
      loadSupabase: async () => ({
        status: "CHECKED",
        by_slug: new Map([
          [
            "smartwater-mwfp",
            {
              id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
                "smartwater-mwfp"
              ],
              filter_id: "f1",
              affiliate_url:
                BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
                  "smartwater-mwfp"
                ],
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
              id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1
                .xwfe,
              filter_id: "f2",
              affiliate_url:
                BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1
                  .xwfe,
              retailer_name: "OEM parts catalog (keyword lookup)",
              browser_truth_classification: "",
              browser_truth_notes: "",
              browser_truth_checked_at: "",
              is_primary: true,
              retailer_key: "oem-parts-catalog",
            },
          ],
        ]) as never,
        filter_id_by_slug: new Map([
          ["smartwater-mwfp", "f1"],
          ["xwfe", "f2"],
        ]) as never,
      }),
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: async () => ({
              data: [{ id: "1", is_primary: true }],
              error: null,
            }),
          }),
        }),
      }),
      loadEnv: () => undefined,
    });
    assert.equal(report.mutation_authorized, false);
    assert.ok(
      report.blockers.some((b) =>
        b.includes(BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1),
      ),
    );
  } finally {
    delete process.env.BUCKPARTS_IO_CAPABILITY;
    rmSync(root, { recursive: true, force: true });
  }
});

test("fail-closed: unexpected current URL / missing row / duplicate primary", async () => {
  process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
  try {
    const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
      rootDir: ROOT,
      mode: "write",
      loadSupabase: async () => ({
        status: "CHECKED",
        by_slug: new Map([
          [
            "smartwater-mwfp",
            {
              id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
                "smartwater-mwfp"
              ],
              filter_id: "f1",
              affiliate_url: "https://example.com/not-stale",
              retailer_name: "OEM",
              browser_truth_classification: "",
              browser_truth_notes: "",
              browser_truth_checked_at: "",
              is_primary: true,
              retailer_key: "oem-parts-catalog",
            },
          ],
          ["xwfe", null],
        ]) as never,
        filter_id_by_slug: new Map([
          ["smartwater-mwfp", "f1"],
          ["xwfe", "f2"],
        ]) as never,
      }),
      getSupabaseAdmin: () => {
        let n = 0;
        return {
          from: () => ({
            select: () => ({
              eq: async () => {
                n += 1;
                // first filter duplicate primaries; second missing
                if (n === 1) {
                  return {
                    data: [
                      { id: "a", is_primary: true },
                      { id: "b", is_primary: true },
                    ],
                    error: null,
                  };
                }
                return { data: [], error: null };
              },
            }),
          }),
        };
      },
      loadEnv: () => undefined,
    });
    assert.equal(report.mutation_authorized, false);
    assert.ok(report.blockers.some((b) => b.includes("unexpected_current_url:smartwater-mwfp")));
    assert.ok(
      report.blockers.some(
        (b) =>
          b.includes("supabase_primary_missing:xwfe") ||
          b.includes("supabase_primary_missing_count:xwfe"),
      ),
    );
    assert.ok(report.blockers.some((b) => b.includes("duplicate_primary_rows:smartwater-mwfp")));
  } finally {
    delete process.env.BUCKPARTS_IO_CAPABILITY;
  }
});

test("source forbids CSV/compat/HQ mutation surfaces; closeout under drafts", () => {
  assert.ok(!LIB.includes("compatibility_mappings"));
  assert.ok(!LIB.includes("BuckParts-HQ-HANDOFF"));
  assert.ok(!LIB.includes("data/retailer_links.csv\", \"w\""));
  assert.ok(
    LIB.includes(BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_JSON_REL_V1),
  );
  assert.ok(LIB.includes("data/fridge/batch-production/drafts/"));
  assert.ok(LIB.includes('pages_claimed_closed: false'));
});
