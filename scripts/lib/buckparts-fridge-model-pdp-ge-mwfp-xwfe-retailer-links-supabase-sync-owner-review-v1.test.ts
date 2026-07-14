import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
  buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1,
  parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1,
  writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";

const REPO_ROOT = process.cwd();
const MWFP = "https://www.geapplianceparts.com/store/parts/spec/MWFP";
const XWFE = "https://www.geapplianceparts.com/store/parts/spec/XWFE";

test("exact 2-filter scope; xwf excluded; 4 affected slugs; hard-stop flags", () => {
  const report = buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1({ rootDir: REPO_ROOT });
  assert.deepEqual([...report.scope.filter_slugs], ["smartwater-mwfp", "xwfe"]);
  assert.deepEqual([...report.scope.excluded_filter_slugs], ["xwf"]);
  assert.deepEqual(
    [...report.scope.affected_model_slugs],
    ["ge-gfe24jgkww", "ge-gfe27jmkes", "ge-gne25jmkww", "ge-pvd28bymfs"],
  );
  assert.equal(report.planned_updates.length, 2);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.apply_authorized, false);
  assert.equal(report.founder_approval_created, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.csv_mutation_authorized, false);
  assert.equal(report.pages_claimed_closed, false);
  assert.equal(report.conversion_claimed, false);
  assert.equal(report.hard_stop.supabase_write_authorized, false);
  assert.equal(report.hard_stop.founder_approval_required_before_write, true);
  assert.equal(
    report.exact_command,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
  );
  assert.ok(!report.scope.filter_slugs.includes("xwf" as never));
});

test("planned updates require official GE PDP URLs and direct_buyable", () => {
  const report = buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1({ rootDir: REPO_ROOT });
  const by = new Map(report.planned_updates.map((u) => [u.filter_slug, u]));
  assert.equal(by.get("smartwater-mwfp")?.after_affiliate_url, MWFP);
  assert.equal(by.get("xwfe")?.after_affiliate_url, XWFE);
  assert.equal(by.get("smartwater-mwfp")?.after_browser_truth_classification, "direct_buyable");
  assert.equal(by.get("xwfe")?.after_retailer_name, "GE Appliance Parts");
});

test("CLI refuses --write/--apply; accepts --write-artifacts", () => {
  assert.deepEqual(parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1(["--write-artifacts"]), {
    writeArtifacts: true,
  });
  assert.throws(() => parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1(["--write"]), /read-only/);
  assert.throws(() => parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1(["--apply"]), /read-only/);
});

test("fail-closed when parity is not DRIFTED", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ge-sync-or-"));
  mkdirSync(path.join(root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, "data/retailer_links.csv"),
    readFileSync(path.join(REPO_ROOT, "data/retailer_links.csv"), "utf8"),
  );
  writeFileSync(
    path.join(root, BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1),
    JSON.stringify({
      contract: "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1",
      overall_sync_status: "IN_SYNC",
      filter_rows: [],
    }),
    "utf8",
  );
  assert.throws(
    () => buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1({ rootDir: root }),
    /DRIFTED/,
  );
});

test("artifact write is allowlisted drafts only and idempotent overwrite", () => {
  const report = buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1({ rootDir: REPO_ROOT });
  const root = mkdtempSync(path.join(tmpdir(), "ge-sync-write-"));
  const first = writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1({
    rootDir: root,
    report,
  });
  const second = writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1({
    rootDir: root,
    report,
  });
  assert.deepEqual(
    [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1],
    [first.json_rel_path, first.md_rel_path],
  );
  assert.deepEqual(first, second);
  const body = readFileSync(path.join(root, first.json_rel_path), "utf8");
  assert.ok(body.includes("DRIFTED"));
  assert.ok(body.includes("supabase_mutation_authorized\": false"));
});

test("source lib/CLI forbid Supabase apply helpers", () => {
  const lib = readFileSync(
    path.join(
      REPO_ROOT,
      "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.ts",
    ),
    "utf8",
  );
  assert.ok(!lib.includes("applyScopedFridgeRetailerLinksWriteV1"));
  assert.ok(!lib.includes("BUCKPARTS_IO_CAPABILITY=MUTATION"));
});
