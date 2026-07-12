import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuckpartsShipGuardReportV1,
  classifyNetlifyIgnoreDryRunBatch,
  defaultShipGuardGitProvider,
  parseShipGuardArgv,
  PROTECTED_RETAILER_LINKS_CSV_REL,
  recommendValidationCommands,
  retailerLinksDriftBlockers,
  type ShipGuardGitProviderV1,
} from "./buckparts-ship-guard-v1";

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

test("parseShipGuardArgv defaults to dry_run", () => {
  assert.equal(parseShipGuardArgv([]), "dry_run");
  assert.equal(parseShipGuardArgv(["--commit"]), "commit");
  assert.equal(parseShipGuardArgv(["--push"]), "push");
});

test("no protected-file blocker when git diff for retailer_links is empty despite hash mismatch", () => {
  const git = mockGit({
    filesChangedWorkingTree: () => ["scripts/lib/buckparts-ship-guard-v1.ts"],
    pathHasDiffWorkingTreeVsHead: () => false,
    pathHasDiffHeadVsOriginMain: () => false,
    showBlobHashAtRef: (ref) => (ref === "HEAD" ? "head-hash" : "origin-hash"),
  });

  const report = buildBuckpartsShipGuardReportV1({
    rootDir: process.cwd(),
    git,
  });

  assert.equal(report.protected_file_checks.retailer_links_csv.git_diff_working_tree_vs_head, false);
  assert.equal(
    report.protected_file_checks.retailer_links_csv.hash_check.working_tree_hash_differs_from_head_blob,
    true,
  );
  assert.equal(retailerLinksDriftBlockers(report.protected_file_checks.retailer_links_csv).length, 0);
  assert.ok(!report.blockers.some((b) => b.includes(PROTECTED_RETAILER_LINKS_CSV_REL)));
});

test("protected-file blocker when git diff for retailer_links is non-empty", () => {
  const git = mockGit({
    pathHasDiffWorkingTreeVsHead: (p) => (p === PROTECTED_RETAILER_LINKS_CSV_REL ? true : false),
    filesChangedWorkingTree: () => [PROTECTED_RETAILER_LINKS_CSV_REL],
  });

  const report = buildBuckpartsShipGuardReportV1({ rootDir: process.cwd(), git });

  assert.ok(report.blockers.includes(`${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_working_tree_vs_head`));
  assert.ok(report.blockers.includes(`${PROTECTED_RETAILER_LINKS_CSV_REL}:listed_in_changed_files`));
  assert.equal(report.push_assessment, "BLOCKED");
});

test("stable JSON fields are populated in normal dry-run report", () => {
  const git = mockGit({
    revParseHead: () => "111full",
    revParseOriginMain: () => "222full",
    commitsAheadOfOriginMain: () => 2,
    filesChangedAheadOfOriginMain: () => ["scripts/buckparts-ship-guard.ts"],
  });

  const report = buildBuckpartsShipGuardReportV1({ rootDir: process.cwd(), mode: "dry_run", git });

  assert.equal(report.current_head, "111full");
  assert.equal(report.origin_main, "222full");
  assert.equal(report.commits_ahead, 2);
  assert.ok(Array.isArray(report.changed_files));
  assert.ok(report.protected_file_checks?.retailer_links_csv);
  assert.ok(Array.isArray(report.recommended_validations));
  assert.ok(report.recommended_validations.length > 0);
  assert.ok(["SAFE", "BLOCKED", "UNKNOWN"].includes(report.push_assessment));
  assert.ok(Array.isArray(report.blockers));
});

test("ship guard dry-run is read-only with mutation flags false", () => {
  const report = buildBuckpartsShipGuardReportV1({
    rootDir: process.cwd(),
    git: mockGit({
      filesChangedAheadOfOriginMain: () => [PROTECTED_RETAILER_LINKS_CSV_REL],
      pathHasDiffHeadVsOriginMain: () => true,
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
      operator_line:
        "credit_control: posture=DEPLOY_HOLD_CREDITS_EXHAUSTED deploy_held=true production_deploy_recommended=false push_allowed=true credit_spend_authorized=false",
      push_with_deploy_hold_message:
        "Push may proceed for repo bookkeeping, but Netlify production deploy is held (DEPLOY_HOLD_CREDITS_EXHAUSTED); production_deploy_recommended=false.",
    },
  });

  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.push_authorized, false);
  assert.equal(report.netlify_api_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.evidence_write_authorized, false);
  assert.equal(report.buckparts_verified_link_authorized, false);
});

test("ship guard surfaces exhausted credits while still allowing SAFE push assessment", () => {
  const report = buildBuckpartsShipGuardReportV1({
    rootDir: process.cwd(),
    mode: "dry_run",
    git: mockGit({
      filesChangedAheadOfOriginMain: () => ["docs/BuckParts-HQ-HANDOFF.md"],
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
      operator_line:
        "credit_control: posture=DEPLOY_HOLD_CREDITS_EXHAUSTED deploy_held=true production_deploy_recommended=false push_allowed=true credit_spend_authorized=false",
      push_with_deploy_hold_message:
        "Push may proceed for repo bookkeeping, but Netlify production deploy is held (DEPLOY_HOLD_CREDITS_EXHAUSTED); production_deploy_recommended=false.",
    },
  });

  assert.equal(report.push_assessment, "SAFE");
  assert.equal(report.credit_control.deployment_posture, "DEPLOY_HOLD_CREDITS_EXHAUSTED");
  assert.equal(report.credit_control.deploy_held, true);
  assert.equal(report.credit_control.production_deploy_recommended, false);
  assert.equal(report.deploy_authorized, false);
  assert.match(report.recommended_next_action, /production deploy is held/);
  assert.ok(
    report.proven_facts.some((f) =>
      f.includes("DEPLOY_HOLD_CREDITS_EXHAUSTED") && f.includes("deploy_held=true"),
    ),
  );
});

test("recommendValidationCommands includes CC test when command center scripts change", () => {
  const cmds = recommendValidationCommands(["scripts/report-buckparts-command-center.ts"]);
  assert.ok(cmds.some((c) => c.includes("report-buckparts-command-center.test.ts")));
});

test("classifyNetlifyIgnoreDryRunBatch marks docs-only as SKIP_BUILD", () => {
  const result = classifyNetlifyIgnoreDryRunBatch({
    rootDir: process.cwd(),
    changedFiles: ["docs/BuckParts-HQ-HANDOFF.md"],
  });
  assert.equal(result.available, true);
  assert.equal(result.aggregate, "SKIP_BUILD");
});

test("defaultShipGuardGitProvider matches empty git diff for retailer_links on this repo", () => {
  const git = defaultShipGuardGitProvider(process.cwd());
  const workingDiff = git.pathHasDiffWorkingTreeVsHead(PROTECTED_RETAILER_LINKS_CSV_REL);
  const headVsOrigin = git.pathHasDiffHeadVsOriginMain(PROTECTED_RETAILER_LINKS_CSV_REL);
  assert.equal(workingDiff, false);
  assert.equal(headVsOrigin, false);
});
