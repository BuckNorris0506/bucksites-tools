import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buyLinkGateFailureKind, isDirectBuyableSafeCtaRow } from "@/lib/retailers/launch-buy-links";

import {
  executeRpwfeOfficialGeRetailerLinksApplyV1,
  validateRpwfeOfficialGeRetailerLinksApplyState,
} from "./rpwfe-official-ge-retailer-links-apply-v1";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const EVIDENCE_REL = "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json";
const CSV_REL = "data/retailer_links.csv";

test("repo RPWFE row is direct-buyable safe CTA after guarded apply", () => {
  const state = validateRpwfeOfficialGeRetailerLinksApplyState({ rootDir: REPO_ROOT });
  assert.equal(state.rpwfe_row_count, 1, "exactly one rpwfe row");
  assert.equal(state.has_waterdrop, false);
  assert.equal(state.has_amazon, false);
  assert.equal(
    state.affiliate_url,
    "https://www.geapplianceparts.com/store/parts/spec/RPWFE",
  );
  assert.equal(state.gate_failure_kind, null);
  assert.equal(state.is_direct_buyable_safe_cta, true);
});

test("guarded apply dry-run blocks when before row already applied", () => {
  const root = mkdtempSync(path.join(tmpdir(), "rpwfe-apply-dry-"));
  const evidence = JSON.parse(readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8"));
  mkdirSync(path.dirname(path.join(root, EVIDENCE_REL)), { recursive: true });
  writeFileSync(path.join(root, EVIDENCE_REL), JSON.stringify(evidence));
  const csvHeader = readFileSync(path.join(REPO_ROOT, CSV_REL), "utf8").split("\n")[0]!;
  const appliedLine =
    "rpwfe,GE Appliance Parts,https://www.geapplianceparts.com/store/parts/spec/RPWFE,true,0,oem-parts-catalog,direct_buyable,note,2026-06-02T14:23:08.624Z";
  writeFileSync(path.join(root, CSV_REL), `${csvHeader}\n${appliedLine}\n`);
  const run = executeRpwfeOfficialGeRetailerLinksApplyV1({ rootDir: root, apply: false });
  assert.equal(run.apply_status, "BLOCKED");
  assert.ok(run.blockers.includes("before_row_url_not_expected_blocked_search_placeholder"));
});

test("guarded apply mutates only target row in temp fixture", () => {
  const root = mkdtempSync(path.join(tmpdir(), "rpwfe-apply-fix-"));
  const evidence = JSON.parse(readFileSync(path.join(REPO_ROOT, EVIDENCE_REL), "utf8"));
  mkdirSync(path.dirname(path.join(root, EVIDENCE_REL)), { recursive: true });
  writeFileSync(path.join(root, EVIDENCE_REL), JSON.stringify(evidence));
  const repoCsv = readFileSync(path.join(REPO_ROOT, CSV_REL), "utf8");
  const beforeSearchCsv = repoCsv.replace(
    /rpwfe,GE Appliance Parts,https:\/\/www\.geapplianceparts\.com\/store\/parts\/spec\/RPWFE/,
    "rpwfe,OEM parts catalog (keyword lookup),https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE",
  ).replace(
    /,direct_buyable,RPWFE official GE guarded CSV apply v1[^,]*,2026-06-02T14:23:08\.624Z/,
    ",,,",
  );
  writeFileSync(path.join(root, CSV_REL), beforeSearchCsv);
  const beforeNonRpwfeHash = executeRpwfeOfficialGeRetailerLinksApplyV1({
    rootDir: root,
    apply: false,
  }).non_rpwfe_row_hash_before;

  const run = executeRpwfeOfficialGeRetailerLinksApplyV1({ rootDir: root, apply: true });
  assert.equal(run.apply_status, "APPLIED");
  assert.equal(run.target_changed_count, 1);
  assert.equal(run.non_target_rows_unchanged, true);
  assert.equal(run.before_url_was_blocked_search_placeholder, true);
  assert.equal(run.after_url_is_official_ge_spec_pdp, true);
  assert.equal(run.waterdrop_row_added, false);
  assert.equal(run.amazon_row_added, false);
  assert.equal(run.compatible_replacement_row_added, false);
  assert.equal(run.non_rpwfe_row_hash_before, beforeNonRpwfeHash);

  const state = validateRpwfeOfficialGeRetailerLinksApplyState({ rootDir: root });
  assert.equal(state.rpwfe_row_count, 1);
  assert.equal(state.is_direct_buyable_safe_cta, true);

  const rows = run.after_row!;
  assert.equal(buyLinkGateFailureKind(rows), null);
  assert.equal(isDirectBuyableSafeCtaRow(rows), true);
});
