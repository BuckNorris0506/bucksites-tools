import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1,
  GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
} from "./buckparts-ship-guard-ge-mwfp-xwfe-retailer-links-allowance-v1";
import {
  applyGeMwfpXwfeRetailerLinksAllowanceToBlockersV1,
  buildBuckpartsShipGuardReportV1,
  PROTECTED_RETAILER_LINKS_CSV_REL,
  type ShipGuardGitProviderV1,
} from "./buckparts-ship-guard-v1";

const REPO_ROOT = path.resolve(process.cwd());

function mockGit(overrides: Partial<ShipGuardGitProviderV1>): ShipGuardGitProviderV1 {
  return {
    revParseHead: () => "abc123",
    revParseOriginMain: () => "def456",
    currentBranch: () => "main",
    commitsAheadOfOriginMain: () => 0,
    filesChangedAheadOfOriginMain: () => [],
    filesChangedWorkingTree: () => [],
    filesStaged: () => [],
    filesUntracked: () => [],
    pathHasDiffWorkingTreeVsHead: () => false,
    pathHasDiffHeadVsOriginMain: () => false,
    showBlobHashAtRef: () => "hash-a",
    ...overrides,
  };
}

test("allowance NOT_APPLICABLE when retailer_links not dirty", () => {
  const a = assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1({
    rootDir: REPO_ROOT,
    retailerLinksDirty: false,
  });
  assert.equal(a.contract, GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1);
  assert.equal(a.status, "NOT_APPLICABLE");
  assert.equal(a.pages_claimed_closed, false);
  assert.equal(a.conversion_claimed, false);
});

test("allowance BLOCKED when dirty but closeout missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ship-guard-ge-allow-"));
  const a = assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1({
    rootDir: dir,
    retailerLinksDirty: true,
    headCsvText: "filter_slug,retailer_name\nxwfe,Old\n",
    workingCsvText: "filter_slug,retailer_name\nxwfe,New\n",
  });
  assert.equal(a.status, "BLOCKED");
  assert.ok(a.blockers.includes("ge_mwfp_xwfe_closeout_missing"));
  assert.ok(a.blockers.includes("ge_mwfp_xwfe_approval_missing"));
});

test("allowance BLOCKED when CSV changes a third filter", () => {
  const head = spawnSync("git", ["show", "HEAD:data/retailer_links.csv"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(head.status, 0);
  const working = head.stdout.replace(
    "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWF",
    "https://example.com/tampered-xwf",
  );
  const a = assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1({
    rootDir: REPO_ROOT,
    retailerLinksDirty: true,
    headCsvText: head.stdout,
    workingCsvText: working,
  });
  assert.equal(a.status, "BLOCKED");
  assert.ok(
    a.blockers.some(
      (b) => b.includes("ge_mwfp_xwfe_csv_xwf_changed") || b.includes("changed_filters"),
    ),
  );
});

test("repo closeout + exact MWFP/XWFE CSV diff yields ALLOWED", () => {
  const head = spawnSync("git", ["show", "HEAD:data/retailer_links.csv"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(head.status, 0);
  const working = readFileSync(path.join(REPO_ROOT, PROTECTED_RETAILER_LINKS_CSV_REL), "utf8");
  const a = assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1({
    rootDir: REPO_ROOT,
    retailerLinksDirty: true,
    headCsvText: head.stdout,
    workingCsvText: working,
  });
  assert.equal(a.status, "ALLOWED", JSON.stringify(a.blockers));
  assert.equal(a.pages_claimed_closed, false);
  assert.equal(a.conversion_claimed, false);
  assert.deepEqual([...a.allowed_filters], ["smartwater-mwfp", "xwfe"]);
});

test("applyGeMwfpXwfeAllowance suppresses retailer_links drift only when ALLOWED", () => {
  const drift = [
    `${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_working_tree_vs_head`,
    `${PROTECTED_RETAILER_LINKS_CSV_REL}:listed_in_changed_files`,
  ];
  const allowed = applyGeMwfpXwfeRetailerLinksAllowanceToBlockersV1({
    driftBlockers: drift,
    allowance: {
      contract: GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
      status: "ALLOWED",
      retailer_links_dirty: true,
      closeout_present: true,
      approval_present: true,
      blockers: [],
      proven_facts: [],
      allowed_filters: ["smartwater-mwfp", "xwfe"],
      pages_claimed_closed: false,
      conversion_claimed: false,
    },
  });
  assert.deepEqual(allowed, []);

  const blocked = applyGeMwfpXwfeRetailerLinksAllowanceToBlockersV1({
    driftBlockers: drift,
    allowance: {
      contract: GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
      status: "BLOCKED",
      retailer_links_dirty: true,
      closeout_present: false,
      approval_present: false,
      blockers: ["ge_mwfp_xwfe_closeout_missing"],
      proven_facts: [],
      allowed_filters: ["smartwater-mwfp", "xwfe"],
      pages_claimed_closed: false,
      conversion_claimed: false,
    },
  });
  assert.ok(blocked.includes(`${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_working_tree_vs_head`));
  assert.ok(blocked.includes("ge_mwfp_xwfe_allowance:ge_mwfp_xwfe_closeout_missing"));
});

test("ship guard keeps retailer_links blockers when dirty without closeout evidence", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ship-guard-no-closeout-"));
  mkdirSync(path.join(dir, "data"), { recursive: true });
  writeFileSync(
    path.join(dir, PROTECTED_RETAILER_LINKS_CSV_REL),
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n",
  );

  const report = buildBuckpartsShipGuardReportV1({
    rootDir: dir,
    git: mockGit({
      pathHasDiffWorkingTreeVsHead: (p) => p === PROTECTED_RETAILER_LINKS_CSV_REL,
      filesChangedWorkingTree: () => [PROTECTED_RETAILER_LINKS_CSV_REL],
    }),
    creditControl: {
      source_command: "npm run buckparts:credit-control",
      deployment_posture: "DEPLOY_HOLD_CREDITS_EXHAUSTED",
      deploy_held: true,
      production_deploy_recommended: false,
      push_allowed: true,
      credit_spend_authorized: false,
      netlify_api_call_authorized: false,
      credit_status: "exhausted",
      operator_line: "credit_control: test",
      push_with_deploy_hold_message: "held",
    },
  });

  assert.equal(report.ge_mwfp_xwfe_retailer_links_approved_closeout_allowance.status, "BLOCKED");
  assert.ok(report.blockers.includes(`${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_working_tree_vs_head`));
  assert.equal(report.push_assessment, "BLOCKED");
});

test("ship guard allows exact founder-approved GE MWFP/XWFE retailer_links closeout on this repo", () => {
  const report = buildBuckpartsShipGuardReportV1({
    rootDir: REPO_ROOT,
    git: mockGit({
      pathHasDiffWorkingTreeVsHead: (p) => p === PROTECTED_RETAILER_LINKS_CSV_REL,
      filesChangedWorkingTree: () => [PROTECTED_RETAILER_LINKS_CSV_REL],
      revParseHead: () => "e660630",
      revParseOriginMain: () => "e660630",
    }),
    creditControl: {
      source_command: "npm run buckparts:credit-control",
      deployment_posture: "DEPLOY_HOLD_CREDITS_EXHAUSTED",
      deploy_held: true,
      production_deploy_recommended: false,
      push_allowed: true,
      credit_spend_authorized: false,
      netlify_api_call_authorized: false,
      credit_status: "exhausted",
      operator_line: "credit_control: test",
      push_with_deploy_hold_message: "held",
    },
  });

  assert.equal(
    report.ge_mwfp_xwfe_retailer_links_approved_closeout_allowance.status,
    "ALLOWED",
    JSON.stringify(report.ge_mwfp_xwfe_retailer_links_approved_closeout_allowance.blockers),
  );
  assert.ok(!report.blockers.some((b) => b.startsWith(`${PROTECTED_RETAILER_LINKS_CSV_REL}:`)));
  assert.equal(report.ge_mwfp_xwfe_retailer_links_approved_closeout_allowance.pages_claimed_closed, false);
  assert.equal(report.ge_mwfp_xwfe_retailer_links_approved_closeout_allowance.conversion_claimed, false);
});
