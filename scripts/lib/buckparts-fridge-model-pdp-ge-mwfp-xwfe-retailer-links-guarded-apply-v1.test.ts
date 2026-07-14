import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1,
  runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1,
  writeBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyArtifactsV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-07-14T19:45:00.000Z");

function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function seedApplyFixtureRoot(): string {
  const tmp = mkdtempSync(path.join(tmpdir(), "ge-mwfp-xwfe-guarded-"));
  const copy = (rel: string) => {
    const dest = path.join(tmp, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(ROOT, rel), dest);
  };
  copy(BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1);
  copy(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1);
  copy(BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1);
  copy("data/retailer_links.csv");
  return tmp;
}

test("dry-run is default-safe: no CSV mutation; exact 2 updates when gates pass", () => {
  const report = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
  });
  assert.equal(report.contract, BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1);
  assert.equal(report.mode, "dry_run");
  assert.equal(report.data_mutation, false);
  assert.equal(report.closeout_written, false);
  assert.equal(report.inserts_authorized, false);
  assert.equal(report.deletes_authorized, false);
  assert.equal(report.xwf_promotion_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.pages_claimed_closed, false);
  assert.equal(report.gates.all_gates_pass, true);
  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.planned_update_count, 2);
  assert.deepEqual(
    report.planned_updates.map((u) => u.filter_slug).sort(),
    ["smartwater-mwfp", "xwfe"],
  );
  assert.ok(!report.planned_updates.some((u) => u.filter_slug === "xwf"));
  for (const u of report.planned_updates) {
    assert.equal(u.change_kind, "update_existing_primary_row");
    assert.equal(u.after_retailer_name, "GE Appliance Parts");
    assert.equal(u.after_browser_truth_classification, "direct_buyable");
    assert.ok(u.before_was_search_placeholder);
    assert.match(u.after_affiliate_url, /\/store\/parts\/spec\//);
  }
});

test("approval hash mismatch fail-closes write and dry-run gates", () => {
  const tmp = seedApplyFixtureRoot();
  try {
    const planRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
    const planAbs = path.join(tmp, planRel);
    writeFileSync(planAbs, `${readFileSync(planAbs, "utf8")}\n`, "utf8");
    const report = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
      rootDir: tmp,
      mode: "write",
      now: FIXED_NOW,
    });
    assert.equal(report.gates.all_gates_pass, false);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(report.gates.blockers.includes("approval_plan_sha256_mismatch"));
    assert.equal(report.gates.plan_sha256_matches_binding, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write mode updates exactly 2 primaries, writes closeout, leaves xwf untouched", () => {
  const tmp = seedApplyFixtureRoot();
  try {
    const csvBefore = readFileSync(path.join(tmp, "data/retailer_links.csv"), "utf8");
    const xwfBefore = csvBefore
      .split(/\r?\n/)
      .find((line) => line.startsWith("xwf,"));
    assert.ok(xwfBefore);

    const report = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
      rootDir: tmp,
      mode: "write",
      now: FIXED_NOW,
    });
    assert.equal(report.gates.all_gates_pass, true);
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.data_mutation, true);
    assert.equal(report.closeout_written, true);
    assert.equal(report.planned_update_count, 2);

    const csvAfter = readFileSync(path.join(tmp, "data/retailer_links.csv"), "utf8");
    assert.ok(
      csvAfter.includes(
        "https://www.geapplianceparts.com/store/parts/spec/MWFP",
      ),
    );
    assert.ok(
      csvAfter.includes(
        "https://www.geapplianceparts.com/store/parts/spec/XWFE",
      ),
    );
    assert.ok(!csvAfter.includes("searchKeyword=MWFP"));
    assert.ok(!csvAfter.includes("searchKeyword=XWFE"));
    const xwfAfter = csvAfter.split(/\r?\n/).find((line) => line.startsWith("xwf,"));
    assert.equal(xwfAfter, xwfBefore);

    const beforeLines = csvBefore.split(/\r?\n/).filter(Boolean).length;
    const afterLines = csvAfter.split(/\r?\n/).filter(Boolean).length;
    assert.equal(afterLines, beforeLines);

    const closeoutAbs = path.join(
      tmp,
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
    );
    assert.ok(existsSync(closeoutAbs));
    const closeout = JSON.parse(readFileSync(closeoutAbs, "utf8")) as {
      pages_claimed_closed?: boolean;
      inserts?: number;
      deletes?: number;
      xwf_mutated?: boolean;
      rows_updated?: number;
    };
    assert.equal(closeout.pages_claimed_closed, false);
    assert.equal(closeout.inserts, 0);
    assert.equal(closeout.deletes, 0);
    assert.equal(closeout.xwf_mutated, false);
    assert.equal(closeout.rows_updated, 2);

    // Idempotent gate: second write should see rows already applied / before mismatch unless
    // we only require existing primary — current before URLs changed so before placeholder
    // checks are not required on re-write; re-run should still update fields (ok) or succeed.
    const dry = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
    });
    assert.equal(dry.gates.all_gates_pass, true);
    assert.equal(dry.data_mutation, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("artifacts writer emits dry-run report without mutating CSV", () => {
  const tmp = seedApplyFixtureRoot();
  try {
    const beforeSha = sha256(readFileSync(path.join(tmp, "data/retailer_links.csv")));
    const report = runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
    });
    writeBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(
      sha256(readFileSync(path.join(tmp, "data/retailer_links.csv"))),
      beforeSha,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
