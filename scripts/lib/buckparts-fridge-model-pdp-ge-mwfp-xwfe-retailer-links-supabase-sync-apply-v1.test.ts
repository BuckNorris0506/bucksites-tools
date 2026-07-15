import assert from "node:assert/strict";
import { execSync } from "node:child_process";
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
const PARITY_REL =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json";

function boundPreApplyParityText(): string {
  return execSync(`git show 1767762:${PARITY_REL}`, { encoding: "utf8" });
}

function stalePrimaryRow(
  filter: "smartwater-mwfp" | "xwfe",
  filterId: string,
): {
  id: string;
  filter_id: string;
  affiliate_url: string;
  retailer_name: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
  is_primary: boolean;
  retailer_key: string;
} {
  return {
    id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
      filter
    ],
    filter_id: filterId,
    affiliate_url:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
        filter
      ],
    retailer_name: "OEM parts catalog (keyword lookup)",
    browser_truth_classification: "",
    browser_truth_notes: "",
    browser_truth_checked_at: "",
    is_primary: true,
    retailer_key: "oem-parts-catalog",
  };
}

function mockedStaleSupabaseLoad() {
  return {
    status: "CHECKED" as const,
    by_slug: new Map([
      ["smartwater-mwfp", stalePrimaryRow("smartwater-mwfp", "f1")],
      ["xwfe", stalePrimaryRow("xwfe", "f2")],
    ]) as never,
    filter_id_by_slug: new Map([
      ["smartwater-mwfp", "f1"],
      ["xwfe", "f2"],
    ]) as never,
  };
}

function mockedPrimaryCountAdmin() {
  return {
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: [{ id: "1", is_primary: true }],
          error: null,
        }),
      }),
    }),
  };
}

function withBoundParityReadText(boundParity: string) {
  return (abs: string) => {
    if (abs.endsWith(PARITY_REL) || abs.includes(PARITY_REL)) return boundParity;
    return readFileSync(abs, "utf8");
  };
}

/** Deterministic READY write fixture: bound pre-apply parity + stale Supabase mocks. No live DB. */
async function buildDeterministicReadyWriteReport(args: {
  ioCapability?: "READ_INDEX" | "MUTATION";
  omitIoCapability?: boolean;
  loadSupabase?: () => ReturnType<typeof mockedStaleSupabaseLoad>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSupabaseAdmin?: () => any;
  readText?: (abs: string) => string;
  rootDir?: string;
}) {
  const boundParity = boundPreApplyParityText();
  const deps: Parameters<typeof buildGeMwfpXwfeSupabaseSyncApplyReportV1>[0] = {
    rootDir: args.rootDir ?? ROOT,
    mode: "write",
    readText: args.readText ?? withBoundParityReadText(boundParity),
    loadSupabase: (args.loadSupabase ?? mockedStaleSupabaseLoad) as never,
    getSupabaseAdmin: args.getSupabaseAdmin ?? mockedPrimaryCountAdmin,
    loadEnv: () => undefined,
  };
  if (!args.omitIoCapability) {
    deps.ioCapability = args.ioCapability ?? "MUTATION";
  }
  return buildGeMwfpXwfeSupabaseSyncApplyReportV1(deps);
}

test("CLI: dry-run default; refuses --apply alias; accepts --write", () => {
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1([]), {
    write: false,
    writeArtifacts: false,
  });
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--write-artifacts"]), {
    write: false,
    writeArtifacts: true,
  });
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--write"]), {
    write: true,
    writeArtifacts: false,
  });
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--write", "--write-artifacts"]), {
    write: true,
    writeArtifacts: true,
  });
  assert.throws(() => parseGeMwfpXwfeSupabaseSyncApplyArgvV1(["--apply"]), /--write/);
});

test("exact 2-filter scope; xwf excluded; inserts/deletes zero; pages not claimed", async () => {
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "dry_run",
    loadSupabase: mockedStaleSupabaseLoad as never,
    getSupabaseAdmin: mockedPrimaryCountAdmin,
    loadEnv: () => undefined,
    readText: withBoundParityReadText(boundPreApplyParityText()),
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

test("mocked stale primaries + approval yields READY dry-run scope", async () => {
  const boundParity = boundPreApplyParityText();
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "dry_run",
    readText: withBoundParityReadText(boundParity),
    loadSupabase: mockedStaleSupabaseLoad as never,
    getSupabaseAdmin: mockedPrimaryCountAdmin,
    loadEnv: () => undefined,
  });
  assert.equal(report.founder_approval_present, true);
  assert.equal(report.row_count_planned, 2);
  assert.equal(report.planned_updates, 2);
  assert.equal(report.blockers.length, 0);
  assert.ok(report.rows.every((r) => r.planned_action === "update"));
  for (const row of report.rows) {
    assert.equal(row.supabase_is_search_placeholder, true);
    assert.equal(row.stale_url_matches_expected, true);
    assert.equal(row.link_id_matches_approval, true);
    assert.equal(row.is_existing_primary, true);
    assert.ok(row.desired);
    assert.ok(geMwfpXwfeSupabaseSyncNotesAreSafeV1(row.desired!.browser_truth_notes));
    assert.equal(row.desired!.browser_truth_classification, "direct_buyable");
    assert.equal(row.desired!.retailer_name, "GE Appliance Parts");
    assert.equal(row.desired!.retailer_key, "oem-parts-catalog");
  }
});

test("deterministic: READ_INDEX cannot authorize mutation even when all other gates are READY", async () => {
  const report = await buildDeterministicReadyWriteReport({ ioCapability: "READ_INDEX" });
  assert.equal(report.supabase_truth_status, "CHECKED");
  assert.equal(report.row_count_planned, 2);
  assert.equal(report.mutation_authorized, false);
  assert.ok(report.blockers.some((b) => /MUTATION|io_capability/i.test(b)));
});

test("deterministic: missing ioCapability cannot authorize mutation", async () => {
  const prev = process.env.BUCKPARTS_IO_CAPABILITY;
  delete process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    const report = await buildDeterministicReadyWriteReport({ omitIoCapability: true });
    assert.equal(report.mutation_authorized, false);
    assert.ok(report.blockers.some((b) => /MUTATION|io_capability/i.test(b)));
  } finally {
    if (prev === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prev;
  }
});

test("deterministic: MUTATION authorizes only when every other gate is valid", async () => {
  const report = await buildDeterministicReadyWriteReport({ ioCapability: "MUTATION" });
  assert.equal(report.supabase_truth_status, "CHECKED");
  assert.equal(report.founder_approval_present, true);
  assert.equal(report.row_count_planned, 2);
  assert.equal(report.planned_updates, 2);
  assert.equal(report.mutation_authorized, true);
  assert.equal(report.blockers.length, 0);
});

test("deterministic: MUTATION does not bypass malformed approval filter scope (xwf extra)", async () => {
  const boundParity = boundPreApplyParityText();
  const approvalRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1;
  const report = await buildDeterministicReadyWriteReport({
    ioCapability: "MUTATION",
    readText: (abs) => {
      if (abs.endsWith(PARITY_REL) || abs.includes(PARITY_REL)) return boundParity;
      if (abs.endsWith(approvalRel) || abs.includes(approvalRel)) {
        const doc = JSON.parse(readFileSync(abs, "utf8")) as {
          rows?: Array<{
            allowed_next_scope?: string;
            buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1?: {
              approved_filter_slugs?: string[];
              xwf_promotion_authorized?: boolean;
            };
          }>;
        };
        const row = doc.rows?.[0];
        if (!row) throw new Error("fixture approval missing rows[0]");
        row.allowed_next_scope = "owner_mutation_approved";
        const ctx =
          row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1;
        if (!ctx) throw new Error("fixture approval missing sync context");
        // Tamper scope: inject xwf into approved_filter_slugs (exact lane forbids xwf).
        ctx.approved_filter_slugs = ["smartwater-mwfp", "xwfe", "xwf"];
        ctx.xwf_promotion_authorized = false;
        return JSON.stringify(doc);
      }
      return readFileSync(abs, "utf8");
    },
  });
  assert.equal(report.mutation_authorized, false);
  assert.ok(
    report.blockers.some((b) =>
      b.includes("founder_approval_filter_scope_mismatch:smartwater-mwfp,xwf,xwfe"),
    ),
    `expected filter_scope_mismatch, got: ${report.blockers.join(" | ")}`,
  );
  assert.ok(
    report.blockers.some((b) => b.includes("founder_approval_includes_xwf")),
    `expected founder_approval_includes_xwf, got: ${report.blockers.join(" | ")}`,
  );
});

test("deterministic: MUTATION does not bypass missing approval", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ge-sync-apply-no-appr-"));
  try {
    mkdirSync(path.join(root, "data"), { recursive: true });
    mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
    writeFileSync(
      path.join(root, "data/retailer_links.csv"),
      readFileSync(path.join(ROOT, "data/retailer_links.csv"), "utf8"),
    );
    for (const rel of [
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.json",
      "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json",
      PARITY_REL,
    ]) {
      writeFileSync(path.join(root, rel), readFileSync(path.join(ROOT, rel), "utf8"));
    }
    const report = await buildDeterministicReadyWriteReport({
      rootDir: root,
      ioCapability: "MUTATION",
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    assert.equal(report.mutation_authorized, false);
    assert.ok(
      report.blockers.some((b) =>
        b.includes(
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1,
        ),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("deterministic: MUTATION does not bypass unexpected URLs / missing / duplicate primaries", async () => {
  const report = await buildDeterministicReadyWriteReport({
    ioCapability: "MUTATION",
    loadSupabase: () =>
      ({
        status: "CHECKED" as const,
        by_slug: new Map([
          [
            "smartwater-mwfp",
            {
              ...stalePrimaryRow("smartwater-mwfp", "f1"),
              affiliate_url: "https://example.com/not-stale",
            },
          ],
          ["xwfe", null],
        ]) as never,
        filter_id_by_slug: new Map([
          ["smartwater-mwfp", "f1"],
          ["xwfe", "f2"],
        ]) as never,
      }) as never,
    getSupabaseAdmin: () => {
      let n = 0;
      return {
        from: () => ({
          select: () => ({
            eq: async () => {
              n += 1;
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
});

test("deterministic: MUTATION does not bypass founder parity binding mismatch at HEAD", async () => {
  // Post-apply HEAD parity body no longer matches founder-bound pre-apply hash 98dfcc….
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "write",
    ioCapability: "MUTATION",
    loadSupabase: mockedStaleSupabaseLoad as never,
    getSupabaseAdmin: mockedPrimaryCountAdmin,
    loadEnv: () => undefined,
  });
  assert.equal(report.mutation_authorized, false);
  assert.ok(report.blockers.some((b) => b.includes("founder_approval_bound_sha256_mismatch")));
});

test("deterministic: parallel ioCapability injections cannot affect one another via process.env", async () => {
  const poisoned = process.env.BUCKPARTS_IO_CAPABILITY;
  process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
  try {
    const reports = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        buildDeterministicReadyWriteReport({
          ioCapability: i % 2 === 0 ? "READ_INDEX" : "MUTATION",
        }),
      ),
    );
    for (let i = 0; i < reports.length; i++) {
      if (i % 2 === 0) {
        assert.equal(reports[i]!.mutation_authorized, false);
        assert.ok(reports[i]!.blockers.some((b) => /MUTATION|io_capability/i.test(b)));
      } else {
        assert.equal(reports[i]!.mutation_authorized, true);
      }
    }
  } finally {
    if (poisoned === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = poisoned;
  }
});

test("source forbids CSV/compat/HQ mutation surfaces; closeout under drafts", () => {
  assert.ok(!LIB.includes("compatibility_mappings"));
  assert.ok(!LIB.includes("BuckParts-HQ-HANDOFF"));
  assert.ok(!LIB.includes("data/retailer_links.csv\", \"w\""));
  assert.ok(
    LIB.includes(
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_JSON_REL_V1,
    ),
  );
  assert.ok(LIB.includes("data/fridge/batch-production/drafts/"));
  assert.ok(LIB.includes("pages_claimed_closed: false"));
  assert.ok(LIB.includes("ioCapability"));
});
