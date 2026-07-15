import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_CREDIT_CONTROL_ALLOWED_WRITE_REL_PATHS_V1,
  BUCKPARTS_CREDIT_CONTROL_CENTER_CONTRACT_V1,
  BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1,
  BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1,
  BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1,
  buildBuckpartsCreditControlCenterV1,
  buildCreditControlDeployAwarenessSummaryV1,
  classifyCreditDeploymentPostureV1,
  classifyCreditWorkClassV1,
  deriveCreditGovernanceFlagsV1,
  writeBuckpartsCreditControlCenterArtifactsV1,
  type BuckpartsNetlifyCreditStateV1,
} from "./buckparts-credit-control-center-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/buckparts-credit-control-center-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync("scripts/report-buckparts-credit-control-center-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-07-11T20:00:00.000Z");

function exhaustedEvidence(): BuckpartsNetlifyCreditStateV1 {
  return {
    contract: "buckparts_netlify_credit_state_v1",
    read_only: true,
    data_mutation: false,
    provider: "netlify",
    status: "exhausted",
    observed_at: "2026-07-11T18:00:00.000Z",
    reset_at: "2026-07-24T00:00:00.000Z",
    source: "owner_screenshot",
    production_deploy_posture: "skipped_or_disabled",
    latest_skipped_production_deploy: {
      branch: "main",
      at_or_after_commit: "853ee79",
    },
    notes: "test fixture",
    live_netlify_api_state: "UNKNOWN",
    netlify_api_call_authorized: false,
  };
}

function writeEvidence(root: string, evidence: BuckpartsNetlifyCreditStateV1 | null): void {
  mkdirSync(path.join(root, "data/ops/credit-control"), { recursive: true });
  if (evidence == null) return;
  writeFileSync(
    path.join(root, BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

test("exhausted credits => DEPLOY_HOLD_CREDITS_EXHAUSTED", () => {
  assert.equal(
    classifyCreditDeploymentPostureV1({
      creditStatus: "exhausted",
      creditEvidencePresent: true,
      creditEvidenceErrors: [],
      workClass: "clean",
    }),
    "DEPLOY_HOLD_CREDITS_EXHAUSTED",
  );

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-exhausted-"));
  try {
    writeEvidence(tmp, exhaustedEvidence());
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "959cdf8",
        origin_main_head: "959cdf8",
        git_status_clean: true,
        changed_paths: [],
      },
    });
    assert.equal(report.deployment_posture, "DEPLOY_HOLD_CREDITS_EXHAUSTED");
    assert.equal(report.deploy_held, true);
    assert.equal(report.production_deploy_recommended, false);
    assert.equal(report.credit_spend_authorized, false);
    assert.equal(report.netlify_api_call_authorized, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("dirty production-impacting files => deploy not recommended", () => {
  const work = classifyCreditWorkClassV1(["src/app/filter/[slug]/page.tsx", "package.json"]);
  assert.equal(work.work_class, "production_impacting");

  const flags = deriveCreditGovernanceFlagsV1({
    posture: "DEPLOY_ALLOWED_MANUAL_REVIEW",
    workClass: "production_impacting",
    gitStatusClean: false,
  });
  assert.equal(flags.production_deploy_recommended, false);
  assert.equal(flags.local_build_recommended, true);

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-dirty-prod-"));
  try {
    const available = exhaustedEvidence();
    available.status = "available";
    writeEvidence(tmp, available);
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "abc1234",
        origin_main_head: "abc1234",
        git_status_clean: false,
        changed_paths: ["src/app/page.tsx"],
      },
    });
    assert.equal(report.work_class, "production_impacting");
    assert.equal(report.deployment_posture, "DEPLOY_ALLOWED_MANUAL_REVIEW");
    assert.equal(report.production_deploy_recommended, false);
    assert.equal(report.local_build_recommended, true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs-only changes => local build optional unless explicitly requested", () => {
  const work = classifyCreditWorkClassV1(["docs/BuckParts-HQ-HANDOFF.md"]);
  assert.equal(work.work_class, "docs_only");

  const flags = deriveCreditGovernanceFlagsV1({
    posture: "DEPLOY_HOLD_CREDITS_EXHAUSTED",
    workClass: "docs_only",
    gitStatusClean: false,
  });
  assert.equal(flags.local_build_optional, true);
  assert.equal(flags.local_build_recommended, false);

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-docs-"));
  try {
    writeEvidence(tmp, exhaustedEvidence());
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "959cdf8",
        origin_main_head: "959cdf8",
        git_status_clean: false,
        changed_paths: ["docs/BuckParts-HQ-HANDOFF.md", "README.md"],
      },
    });
    assert.equal(report.work_class, "docs_only");
    assert.equal(report.local_build_optional, true);
    assert.equal(report.local_build_recommended, false);
    assert.equal(report.deploy_held, true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("clean repo + exhausted credits => push may be allowed, deploy held", () => {
  const flags = deriveCreditGovernanceFlagsV1({
    posture: "DEPLOY_HOLD_CREDITS_EXHAUSTED",
    workClass: "clean",
    gitStatusClean: true,
  });
  assert.equal(flags.push_allowed, true);
  assert.equal(flags.deploy_held, true);
  assert.equal(flags.production_deploy_recommended, false);

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-clean-hold-"));
  try {
    writeEvidence(tmp, exhaustedEvidence());
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "959cdf8",
        origin_main_head: "959cdf8",
        git_status_clean: true,
        changed_paths: [],
      },
    });
    assert.equal(report.deployment_posture, "DEPLOY_HOLD_CREDITS_EXHAUSTED");
    assert.equal(report.push_allowed, true);
    assert.equal(report.deploy_held, true);
    assert.equal(report.production_deploy_recommended, false);
    assert.ok(
      report.governance_recommendations.some((r) =>
        r.includes("Clean repo + credits exhausted"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("unknown credit evidence => UNKNOWN_CREDIT_STATE", () => {
  assert.equal(
    classifyCreditDeploymentPostureV1({
      creditStatus: null,
      creditEvidencePresent: false,
      creditEvidenceErrors: ["credit evidence missing"],
      workClass: "clean",
    }),
    "UNKNOWN_CREDIT_STATE",
  );

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-unknown-"));
  try {
    // No evidence file written.
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "959cdf8",
        origin_main_head: "959cdf8",
        git_status_clean: true,
        changed_paths: [],
      },
    });
    assert.equal(report.deployment_posture, "UNKNOWN_CREDIT_STATE");
    assert.equal(report.deploy_held, true);
    assert.equal(report.credit_evidence_present, false);
    assert.equal(report.production_deploy_recommended, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("repo evidence file + artifacts write allowlist", () => {
  assert.ok(existsSync(path.join(ROOT, BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1)));
  const evidence = JSON.parse(
    readFileSync(path.join(ROOT, BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1), "utf8"),
  ) as BuckpartsNetlifyCreditStateV1;
  // Current owner-reported credit evidence (67c5c70 / handoff b7900e2): available ≠ deploy auth.
  assert.equal(evidence.status, "available");
  assert.equal(evidence.source, "owner_reported_netlify_credits");
  assert.equal(evidence.available_credits, 1000);
  assert.equal(evidence.reset_at, "2026-07-24T00:00:00.000Z");
  assert.equal(evidence.latest_skipped_production_deploy?.at_or_after_commit, "853ee79");
  assert.equal(evidence.netlify_api_call_authorized, false);

  const tmp = mkdtempSync(path.join(tmpdir(), "credit-control-artifacts-"));
  try {
    // Exhausted fixture still proves write-allowlist + DEPLOY_HOLD path without mutating repo evidence.
    writeEvidence(tmp, exhaustedEvidence());
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: tmp,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "959cdf8",
        origin_main_head: "959cdf8",
        git_status_clean: true,
        changed_paths: [],
      },
    });
    assert.equal(report.contract, BUCKPARTS_CREDIT_CONTROL_CENTER_CONTRACT_V1);
    assert.equal(report.deployment_posture, "DEPLOY_HOLD_CREDITS_EXHAUSTED");
    const written = writeBuckpartsCreditControlCenterArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1);
    assert.equal(written.md_rel_path, BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1);
    assert.ok(
      (BUCKPARTS_CREDIT_CONTROL_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
        written.json_rel_path,
      ),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /DEPLOY_HOLD_CREDITS_EXHAUSTED/);
    assert.match(md, /deploy_held: \*\*true\*\*/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source does not call Netlify APIs or mutate production surfaces", () => {
  const forbidden = [
    "api.netlify.com",
    "NETLIFY_AUTH_TOKEN",
    "getSupabaseAdmin",
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    '.from("compatibility_mappings").delete',
    '.from("compatibility_mappings").insert',
  ];
  const combined = `${LIB_SOURCE}\n${REPORT_SOURCE}`;
  for (const needle of forbidden) {
    assert.ok(!combined.includes(needle), `must not include ${needle}`);
  }
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(LIB_SOURCE.includes("netlify_api_call_authorized: false"));
  assert.ok(LIB_SOURCE.includes("credit_spend_authorized: false"));
  assert.ok(LIB_SOURCE.includes("Does not call Netlify APIs"));
});

test("deploy awareness summary surfaces exhausted hold for pre-push/ship-guard consumers", () => {
  const summary = buildCreditControlDeployAwarenessSummaryV1({
    deployment_posture: "DEPLOY_HOLD_CREDITS_EXHAUSTED",
    deploy_held: true,
    production_deploy_recommended: false,
    push_allowed: true,
    credit_evidence: {
      contract: "buckparts_netlify_credit_state_v1",
      read_only: true,
      data_mutation: false,
      provider: "netlify",
      status: "exhausted",
      observed_at: "2026-07-11T18:00:00.000Z",
      reset_at: "2026-07-24T00:00:00.000Z",
      source: "owner_screenshot",
    },
  });
  assert.equal(summary.deployment_posture, "DEPLOY_HOLD_CREDITS_EXHAUSTED");
  assert.equal(summary.deploy_held, true);
  assert.equal(summary.production_deploy_recommended, false);
  assert.equal(summary.push_allowed, true);
  assert.match(summary.operator_line, /DEPLOY_HOLD_CREDITS_EXHAUSTED/);
  assert.match(summary.push_with_deploy_hold_message ?? "", /production deploy is held/);
});
