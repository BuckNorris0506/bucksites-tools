import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

import {
  buildBuckpartsCreditControlCenterV1,
  classifyCreditEvidenceFreshnessV1,
  BUCKPARTS_CREDIT_EVIDENCE_STALE_DAYS_V1,
  BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1,
} from "./buckparts-credit-control-center-v1";
import {
  buildBuckpartsShipGuardReportV1,
  parseShipGuardArgv,
  shipGuardEnforceExitCodeV1,
} from "./buckparts-ship-guard-v1";
import {
  buildCommandCenterDispatchHistoryV1,
  buildCommandCenterRepositoryProvenanceV1,
  buildGscGa4FreshnessBlockersV1,
  buildPhase1OperatingCircuitV1,
} from "./buckparts-phase1-operating-circuit-v1";
import {
  COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
  runBuckpartsCommandCenterDispatchRunnerV1,
} from "./buckparts-command-center-dispatch-runner-v1";
import { buildGeMwfpXwfeSupabaseSyncApplyReportV1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1";
import { resolveArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import type { ExternalMeasurementFreshnessV1 } from "../../src/lib/owner-dashboard/external-measurement-freshness-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-07-15T12:00:00.000Z");

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function initTempGit(): { dir: string; head: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "p1-git-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p1@example.com"]);
  git(dir, ["config", "user.name", "p1"]);
  writeFileSync(path.join(dir, "README.md"), "init\n");
  git(dir, ["add", "README.md"]);
  git(dir, ["commit", "-m", "init"]);
  return { dir, head: git(dir, ["rev-parse", "--short", "HEAD"]) };
}

function emptyFreshness(overrides?: Partial<ExternalMeasurementFreshnessV1>): ExternalMeasurementFreshnessV1 {
  return {
    contract: "external_measurement_freshness_v1",
    read_only: true,
    data_mutation: false,
    runtime_status: "UNKNOWN",
    overall_status: "UNKNOWN",
    gsc: {
      runtime_status: "UNKNOWN",
      connection_level: "UNKNOWN",
      artifact_source: "NONE",
      fetched_at_or_export_date: "UNKNOWN",
      artifact_recency_status: "UNKNOWN",
      measurement_usability_status: "UNKNOWN",
      freshness_status: "UNKNOWN",
      top_level_note: "missing",
    },
    ga4: {
      runtime_status: "UNKNOWN",
      artifact_source: "NONE",
      fetched_at: "UNKNOWN",
      artifact_recency_status: "UNKNOWN",
      measurement_usability_status: "UNKNOWN",
      freshness_status: "UNKNOWN",
      top_level_note: "missing",
    },
    recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"],
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

test("parseShipGuardArgv: --enforce mode", () => {
  assert.equal(parseShipGuardArgv(["--enforce"]), "enforce");
  assert.equal(parseShipGuardArgv([]), "dry_run");
});

test("ship guard enforce exit: SAFE=0; BLOCKED/UNKNOWN=1", () => {
  assert.equal(shipGuardEnforceExitCodeV1({ mode: "enforce", push_assessment: "SAFE" }), 0);
  assert.equal(shipGuardEnforceExitCodeV1({ mode: "enforce", push_assessment: "BLOCKED" }), 1);
  assert.equal(shipGuardEnforceExitCodeV1({ mode: "enforce", push_assessment: "UNKNOWN" }), 1);
  assert.equal(shipGuardEnforceExitCodeV1({ mode: "dry_run", push_assessment: "UNKNOWN" }), 0);
});

test("ship guard enforce PASS on clean mocked git (no recursive validations)", () => {
  const report = buildBuckpartsShipGuardReportV1({
    rootDir: ROOT,
    mode: "enforce",
    runValidations: false,
    git: {
      revParseHead: () => "04a1fdb",
      revParseOriginMain: () => "04a1fdb",
      currentBranch: () => "main",
      commitsAheadOfOriginMain: () => 0,
      filesChangedAheadOfOriginMain: () => [],
      filesChangedWorkingTree: () => [],
      filesStaged: () => [],
      filesUntracked: () => [],
      pathHasDiffWorkingTreeVsHead: () => false,
      pathHasDiffHeadVsOriginMain: () => false,
      showBlobHashAtRef: () => null,
    },
    creditControl: {
      source_command: "npm run buckparts:credit-control",
      deployment_posture: "REPO_ONLY_SAFE",
      deploy_held: false,
      production_deploy_recommended: false,
      push_allowed: true,
      credit_spend_authorized: false,
      netlify_api_call_authorized: false,
      credit_status: "available",
      operator_line: "ok",
      push_with_deploy_hold_message: null,
    },
  });
  assert.equal(report.mode, "enforce");
  assert.equal(report.push_assessment, "SAFE");
  assert.equal(report.deploy_authorized, false);
  assert.equal(report.validation_results.length, 0);
  assert.equal(shipGuardEnforceExitCodeV1(report), 0);
});

test("ship guard enforce BLOCKED when protected retailer_links dirty", () => {
  const report = buildBuckpartsShipGuardReportV1({
    rootDir: ROOT,
    mode: "enforce",
    runValidations: false,
    git: {
      revParseHead: () => "04a1fdb",
      revParseOriginMain: () => "04a1fdb",
      currentBranch: () => "main",
      commitsAheadOfOriginMain: () => 0,
      filesChangedAheadOfOriginMain: () => [],
      filesChangedWorkingTree: () => ["data/retailer_links.csv"],
      filesStaged: () => [],
      filesUntracked: () => [],
      pathHasDiffWorkingTreeVsHead: (p) => p === "data/retailer_links.csv",
      pathHasDiffHeadVsOriginMain: () => false,
      showBlobHashAtRef: () => null,
    },
    creditControl: {
      source_command: "npm run buckparts:credit-control",
      deployment_posture: "REPO_ONLY_SAFE",
      deploy_held: false,
      production_deploy_recommended: false,
      push_allowed: true,
      credit_spend_authorized: false,
      netlify_api_call_authorized: false,
      credit_status: "available",
      operator_line: "ok",
      push_with_deploy_hold_message: null,
    },
  });
  assert.equal(report.push_assessment, "BLOCKED");
  assert.ok(report.blockers.length > 0);
  assert.equal(shipGuardEnforceExitCodeV1(report), 1);
});

test("no recursive preflight invocation in ship guard / phase1 circuit sources", () => {
  const shipSrc = readFileSync("scripts/lib/buckparts-ship-guard-v1.ts", "utf8");
  const phase1Src = readFileSync("scripts/lib/buckparts-phase1-operating-circuit-v1.ts", "utf8");
  assert.ok(!shipSrc.includes("buckparts:deploy:preflight"));
  assert.ok(!phase1Src.includes("buckparts:deploy:preflight"));
  assert.ok(phase1Src.includes("recursive_preflight_invocation: false"));
});

test("credit evidence freshness: fresh / stale / missing / invalid", () => {
  const now = FIXED_NOW();
  assert.equal(
    classifyCreditEvidenceFreshnessV1({
      evidence: null,
      present: false,
      errors: ["missing"],
      now,
    }).freshness,
    "UNKNOWN",
  );
  assert.equal(
    classifyCreditEvidenceFreshnessV1({
      evidence: {
        contract: BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        provider: "netlify",
        status: "available",
        observed_at: "not-a-date",
        reset_at: null,
        source: "test",
      },
      present: true,
      errors: [],
      now,
    }).freshness,
    "UNKNOWN",
  );
  const fresh = classifyCreditEvidenceFreshnessV1({
    evidence: {
      contract: BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      provider: "netlify",
      status: "available",
      observed_at: "2026-07-14T12:00:00.000Z",
      reset_at: null,
      source: "test",
    },
    present: true,
    errors: [],
    now,
  });
  assert.equal(fresh.freshness, "FRESH");
  const stale = classifyCreditEvidenceFreshnessV1({
    evidence: {
      contract: BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      provider: "netlify",
      status: "available",
      observed_at: "2026-06-01T12:00:00.000Z",
      reset_at: null,
      source: "test",
    },
    present: true,
    errors: [],
    now,
  });
  assert.equal(stale.freshness, "STALE");
  assert.ok((stale.age_days ?? 0) > BUCKPARTS_CREDIT_EVIDENCE_STALE_DAYS_V1);
});

test("credit control: stale evidence fails closed for production_deploy_recommended", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cc-stale-"));
  try {
    mkdirSync(path.join(root, "data/ops/credit-control"), { recursive: true });
    writeFileSync(
      path.join(root, "data/ops/credit-control/netlify-credit-state-v1.json"),
      JSON.stringify({
        contract: BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1,
        read_only: true,
        data_mutation: false,
        provider: "netlify",
        status: "available",
        observed_at: "2026-01-01T00:00:00.000Z",
        reset_at: null,
        source: "test",
        netlify_api_call_authorized: false,
        available_credits: 1000,
      }),
    );
    const report = buildBuckpartsCreditControlCenterV1({
      rootDir: root,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "abc",
        origin_main_head: "abc",
        git_status_clean: true,
        changed_paths: ["src/app/page.tsx"],
      },
    });
    assert.equal(report.credit_evidence_freshness, "STALE");
    assert.equal(report.production_deploy_recommended, false);
    assert.equal(report.credit_spend_authorized, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("phase1 circuit consumes canonical credit control result", () => {
  const circuit = buildPhase1OperatingCircuitV1({
    rootDir: ROOT,
    now: FIXED_NOW,
    externalMeasurementFreshness: emptyFreshness(),
    shipGuardReport: {
      mode: "enforce",
      push_assessment: "SAFE",
      blockers: [],
      credit_control: {
        deploy_held: false,
      },
      deploy_authorized: false,
    } as never,
    creditControlReport: buildBuckpartsCreditControlCenterV1({
      rootDir: ROOT,
      now: FIXED_NOW,
      gitSnapshot: {
        repo_head: "04a1fdb",
        origin_main_head: "04a1fdb",
        git_status_clean: true,
        changed_paths: [],
      },
    }),
  });
  assert.equal(circuit.credit_control_canonical_v1.source, "buckparts_credit_control_center_v1");
  assert.equal(circuit.credit_control_canonical_v1.credits_available_equals_deploy_authorization, false);
  assert.equal(circuit.ship_guard_enforcement_v1.recursive_preflight_invocation, false);
});

function writeDispatchRun(
  dir: string,
  name: string,
  overrides: Record<string, unknown>,
): void {
  writeFileSync(
    path.join(dir, name),
    JSON.stringify({
      report_name: COMMAND_CENTER_DISPATCH_RUN_REPORT_NAME_V1,
      generated_at: "2026-07-14T00:00:00.000Z",
      source_commit: "abc",
      dispatch_status_before: "READY",
      selected_subsystem: "demand",
      exact_command: "npm run lint",
      execution_allowed: true,
      execution_status: "EXECUTED",
      stdout_excerpt: "",
      stderr_excerpt: "",
      parsed_json_summary: null,
      blocked_reasons: [],
      next_expected_state: "ok",
      read_only: true,
      data_mutation: false,
      ...overrides,
    }),
  );
}

test("dispatch history: latest successful / refusal / missing", () => {
  const root = mkdtempSync(path.join(tmpdir(), "disp-hist-"));
  try {
    const dir = path.join(root, "data/command-center/dispatch-runs");
    mkdirSync(dir, { recursive: true });
    writeDispatchRun(dir, "dispatch-run-a.json", {
      generated_at: "2026-07-10T00:00:00.000Z",
      source_commit: "aaa",
    });
    writeDispatchRun(dir, "dispatch-run-b.json", {
      generated_at: "2026-07-14T00:00:00.000Z",
      source_commit: "bbb",
      selected_subsystem: "ge_sync",
      exact_command: "bad",
      execution_allowed: false,
      execution_status: "REFUSED",
      blocked_reasons: ["Refused: exact_command is not allowlisted for v1."],
      next_expected_state: "blocked",
    });
    const hist = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(hist.latest_run_id, "dispatch-run-b.json");
    assert.equal(hist.latest_execution_status, "REFUSED");
    assert.equal(hist.refusal_count, 1);
    assert.ok(hist.latest_refusal_reason?.includes("allowlisted"));
    assert.equal(hist.freshness_status, "FRESH");

    const missing = buildCommandCenterDispatchHistoryV1({
      rootDir: path.join(root, "empty"),
      now: FIXED_NOW,
    });
    assert.equal(missing.freshness_status, "MISSING");
    assert.ok(missing.blockers.some((b) => b.includes("missing")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dispatch history freshness: fresh / stale / malformed / future / missing timestamp", () => {
  const root = mkdtempSync(path.join(tmpdir(), "disp-fresh-"));
  try {
    const dir = path.join(root, "data/command-center/dispatch-runs");
    mkdirSync(dir, { recursive: true });

    writeDispatchRun(dir, "fresh.json", { generated_at: "2026-07-14T00:00:00.000Z" });
    const fresh = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(fresh.freshness_status, "FRESH");
    assert.ok(fresh.age_days != null && fresh.age_days >= 0 && fresh.age_days <= 7);
    assert.equal(fresh.blockers.includes("dispatch_timestamp_in_future"), false);

    rmSync(path.join(dir, "fresh.json"));
    writeDispatchRun(dir, "stale.json", { generated_at: "2026-06-01T00:00:00.000Z" });
    const stale = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(stale.freshness_status, "STALE");
    assert.ok(stale.age_days != null && stale.age_days > 7);

    rmSync(path.join(dir, "stale.json"));
    writeDispatchRun(dir, "malformed.json", { generated_at: "not-a-timestamp" });
    const malformed = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(malformed.freshness_status, "UNKNOWN");
    assert.equal(malformed.age_days, null);
    assert.ok(malformed.blockers.includes("dispatch_latest_generated_at_invalid"));

    rmSync(path.join(dir, "malformed.json"));
    writeDispatchRun(dir, "future.json", { generated_at: "2026-07-20T00:00:00.000Z" });
    const future = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(future.freshness_status, "UNKNOWN");
    assert.ok(future.age_days != null && future.age_days < 0);
    assert.ok(future.blockers.includes("dispatch_timestamp_in_future"));

    rmSync(path.join(dir, "future.json"));
    writeDispatchRun(dir, "missing-ts.json", { generated_at: "" });
    const missingTs = buildCommandCenterDispatchHistoryV1({ rootDir: root, now: FIXED_NOW });
    assert.equal(missingTs.freshness_status, "UNKNOWN");
    assert.equal(missingTs.age_days, null);
    assert.ok(missingTs.blockers.includes("dispatch_latest_generated_at_invalid"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Command Center provenance: clean and dirty temp git; production cannot inject overrides", () => {
  const { dir, head } = initTempGit();
  try {
    const clean = buildCommandCenterRepositoryProvenanceV1({ rootDir: dir });
    assert.equal(clean.provenance_status, "BOUND_TO_SOURCE_COMMIT");
    assert.equal(clean.source_commit, head);
    assert.equal(clean.worktree_clean, true);

    writeFileSync(path.join(dir, "dirty.txt"), "x\n");
    const dirty = buildCommandCenterRepositoryProvenanceV1({ rootDir: dir });
    assert.equal(dirty.provenance_status, "DIRTY_WORKTREE");
    assert.equal(dirty.source_commit, null);
    assert.equal(dirty.worktree_clean, false);

    const ctaSrc = readFileSync(
      "scripts/lib/buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1.ts",
      "utf8",
    );
    const paritySrc = readFileSync(
      "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.ts",
      "utf8",
    );
    assert.ok(ctaSrc.includes("ForTests"));
    assert.ok(paritySrc.includes("ForTests"));
    assert.ok(!/export type BuildBuckpartsFridgeModelPdpCtaGoLinkProofDepsV1 = \{[^}]*worktreeClean/s.test(ctaSrc));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("adversarial: production CTA/GE builders ignore forged worktreeClean/baseCommit", async () => {
  const { buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1, buildBuckpartsFridgeModelPdpCtaGoLinkProofPackForTestsV1 } =
    await import("./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1");
  const {
    buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1,
    buildGeMwfpXwfeRetailerLinksSupabaseParityProofForTestsV1,
  } = await import("./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1");

  const { dir, head } = initTempGit();
  try {
    writeFileSync(path.join(dir, "dirty.txt"), "forged-attempt\n");

    const renderedPack = {
      contract: "buckparts_fridge_model_pdp_rendered_truth_proof_pack_v1",
      rows: Array.from({ length: 28 }, (_, i) => ({
        slug: `fixture-slug-${String(i + 1).padStart(2, "0")}`,
        cohort: "fixture",
        classification: "MATCH",
        frontend_safe_promoted: true,
        rendered_filter_slugs: ["fixture-filter"],
      })),
    };

    const loadFridge = () =>
      ({ status: "UNKNOWN", reason: "fixture_no_live_load" }) as const;
    const resolveQuarantine = () => ({ quarantine: false, reason: null });

    const ctaForged = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackV1({
      rootDir: dir,
      loadRenderedTruthPack: () => renderedPack as never,
      loadFridge,
      resolveQuarantine,
      // Runtime forgery via JS extra props / as any — must be ignored.
      ...({ worktreeClean: true, baseCommit: "forged01" } as object),
    } as never);

    assert.equal(ctaForged.provenance_status, "DIRTY_WORKTREE");
    assert.equal(ctaForged.worktree_clean, false);
    assert.equal(ctaForged.source_commit, null);
    assert.equal(ctaForged.base_commit, head);

    const ctaTest = await buildBuckpartsFridgeModelPdpCtaGoLinkProofPackForTestsV1({
      rootDir: dir,
      loadRenderedTruthPack: () => renderedPack as never,
      loadFridge,
      resolveQuarantine,
      worktreeClean: true,
      baseCommit: "forged01",
    });
    assert.equal(ctaTest.provenance_status, "BOUND_TO_SOURCE_COMMIT");
    assert.equal(ctaTest.source_commit, "forged01");
    assert.equal(ctaTest.worktree_clean, true);

    const geLoadUnavailable = async () =>
      ({
        status: "UNKNOWN_DB_UNAVAILABLE" as const,
        reason: "test",
      }) as const;
    const emptyCsv =
      "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";

    const geForged = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1({
      rootDir: dir,
      readText: () => emptyCsv,
      loadSupabase: geLoadUnavailable as never,
      ...({ worktreeClean: true, baseCommit: "forged01" } as object),
    } as never);
    assert.equal(geForged.provenance_status, "DIRTY_WORKTREE");
    assert.equal(geForged.worktree_clean, false);
    assert.equal(geForged.source_commit, null);
    assert.equal(geForged.base_commit, head);

    const geTest = await buildGeMwfpXwfeRetailerLinksSupabaseParityProofForTestsV1({
      rootDir: dir,
      readText: () => emptyCsv,
      loadSupabase: geLoadUnavailable as never,
      worktreeClean: true,
      baseCommit: "forged01",
    });
    assert.equal(geTest.provenance_status, "BOUND_TO_SOURCE_COMMIT");
    assert.equal(geTest.source_commit, "forged01");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deterministic: Supabase unavailable GE apply fails closed without write", async () => {
  let supabaseWriteCalls = 0;
  const report = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "write",
    ioCapability: "MUTATION",
    loadSupabase: async () => ({
      status: "UNKNOWN_DB_UNAVAILABLE",
      reason: "fixture_unavailable",
    }),
    loadEnv: () => undefined,
    getSupabaseAdmin: () => {
      throw new Error("getSupabaseAdmin must not be called when DB unavailable");
    },
  });
  assert.equal(report.supabase_truth_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.ok(
    report.blockers.includes("supabase_unavailable:fixture_unavailable"),
    `expected exact blocker supabase_unavailable:fixture_unavailable; got ${JSON.stringify(report.blockers)}`,
  );
  assert.ok(
    report.rows.every(
      (r) =>
        r.blockers.length === 1 && r.blockers[0] === "supabase_unavailable:fixture_unavailable",
    ),
  );
  assert.equal(report.planned_updates, 0);
  assert.equal(supabaseWriteCalls, 0);
});

test("dispatch --no-artifact preserves refusals and writes nothing", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "no-art-"));
  const dispatchDir = path.join(root, "runs");
  mkdirSync(dispatchDir, { recursive: true });
  try {
    const result = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: root,
      noArtifact: true,
      dispatchRunsDirRel: dispatchDir,
      reportBuilder: async () =>
        ({
          read_only: true,
          data_mutation: false,
          command_center_v2: {
            batch_production_operating_dispatch_v1: {
              dispatch_status: "NOT_READY",
              exact_command: "npm run lint",
              command_surface: "terminal",
              mutation_allowed: false,
              selected_subsystem: "test",
            },
          },
        }) as never,
      exec: async () => {
        throw new Error("exec must not run when refused");
      },
    });
    assert.equal(result.no_artifact, true);
    assert.equal(result.artifact_abs_path, null);
    assert.equal(result.artifact.execution_status, "REFUSED");
    assert.ok(result.artifact.blocked_reasons.length > 0);
    assert.deepEqual(readdirSync(dispatchDir), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dispatch --no-artifact refuses allowlisted write-artifacts / build commands", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "no-art-forbid-"));
  const dispatchDir = path.join(root, "runs");
  mkdirSync(dispatchDir, { recursive: true });
  try {
    for (const exact_command of [
      "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts",
      "npm run build",
    ]) {
      const result = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: root,
        noArtifact: true,
        dispatchRunsDirRel: dispatchDir,
        reportBuilder: async () =>
          ({
            read_only: true,
            data_mutation: false,
            command_center_v2: {
              batch_production_operating_dispatch_v1: {
                dispatch_status: "READY",
                exact_command,
                command_surface: "terminal",
                mutation_allowed: false,
                selected_subsystem: "test",
              },
            },
          }) as never,
        exec: async () => {
          throw new Error("exec must not run for forbidden --no-artifact command");
        },
      });
      assert.equal(result.artifact.execution_status, "REFUSED");
      assert.ok(
        result.artifact.blocked_reasons.some((b) => b.includes("--no-artifact forbids")),
        exact_command,
      );
      assert.deepEqual(readdirSync(dispatchDir), []);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dispatch --no-artifact successful stdout-only path leaves isolated temp-repo fingerprints unchanged", async () => {
  const { createHash } = await import("node:crypto");
  const { existsSync } = await import("node:fs");
  const { dir } = initTempGit();
  const ledgerRel = "data/command-center/execution-ledger-v1.json";
  const ledgerAbs = path.join(dir, ledgerRel);
  const dispatchDirRel = "data/command-center/dispatch-runs";
  const dispatchDir = path.join(dir, dispatchDirRel);
  mkdirSync(path.dirname(ledgerAbs), { recursive: true });
  mkdirSync(dispatchDir, { recursive: true });
  writeFileSync(
    ledgerAbs,
    `${JSON.stringify({ contract: "buckparts_execution_ledger_v1", entries: [] }, null, 2)}\n`,
  );
  writeFileSync(path.join(dispatchDir, "dispatch-run-seed.json"), "{}\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "seed ledger+dispatch"]);

  const hashFile = (abs: string): string => {
    if (!existsSync(abs)) return "MISSING";
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  };
  const fingerprint = () => ({
    porcelain: execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" }),
    tracked: execFileSync("git", ["diff", "--stat"], { cwd: dir, encoding: "utf8" }),
    ledger: hashFile(ledgerAbs),
    dispatchListing: readdirSync(dispatchDir)
      .filter((n) => n.startsWith("dispatch-run-"))
      .sort()
      .join("|"),
  });

  const before = fingerprint();
  let ledgerRefreshCalls = 0;
  const result = await runBuckpartsCommandCenterDispatchRunnerV1({
    rootDir: dir,
    noArtifact: true,
    dispatchRunsDirRel: dispatchDirRel,
    reportBuilder: async () =>
      ({
        read_only: true,
        data_mutation: false,
        command_center_v2: {
          batch_production_operating_dispatch_v1: {
            dispatch_status: "READY",
            exact_command:
              "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts",
            command_surface: "terminal",
            mutation_allowed: false,
            selected_subsystem: "air_purifier_demand_selected_batch_closeout_readiness_proof",
            success_transition: "ok",
            failure_transition: "fail",
          },
        },
      }) as never,
    exec: async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        contract: "ap_demand_selected_batch_closeout_readiness_proof_v1",
        read_only: true,
        data_mutation: false,
      }),
      stderr: "",
    }),
    refreshExecutionLedger: () => {
      ledgerRefreshCalls += 1;
    },
  });
  const after = fingerprint();

  assert.equal(result.no_artifact, true);
  assert.equal(result.artifact_abs_path, null);
  assert.equal(result.artifact.execution_status, "EXECUTED");
  assert.ok(result.artifact.parsed_json_summary != null);
  assert.equal(
    (result.artifact.parsed_json_summary as { contract?: string }).contract,
    "ap_demand_selected_batch_closeout_readiness_proof_v1",
  );
  assert.equal(ledgerRefreshCalls, 0);
  assert.equal(after.porcelain, before.porcelain);
  assert.equal(after.tracked, before.tracked);
  assert.equal(after.ledger, before.ledger);
  assert.equal(after.dispatchListing, before.dispatchListing);
  // Must never fingerprint or mutate the shared working repository in this concurrent unit test.
  assert.notEqual(dir, ROOT);
  rmSync(dir, { recursive: true, force: true });
});

test("GSC/GA4 freshness blockers: missing / stale / fresh", () => {
  const missing = buildGscGa4FreshnessBlockersV1({
    freshness: emptyFreshness(),
    now: FIXED_NOW,
  });
  assert.ok(missing.blockers.includes("gsc_artifact_missing"));
  assert.ok(missing.blockers.includes("ga4_artifact_missing"));

  const fresh = buildGscGa4FreshnessBlockersV1({
    freshness: emptyFreshness({
      gsc: {
        runtime_status: "OK",
        connection_level: "BRIGHT",
        artifact_source: "LOCAL_ARTIFACT",
        fetched_at_or_export_date: "2026-07-14T00:00:00.000Z",
        artifact_recency_status: "OK",
        measurement_usability_status: "OK",
        freshness_status: "OK",
        top_level_note: "ok",
      },
      ga4: {
        runtime_status: "OK",
        artifact_source: "LOCAL_ARTIFACT",
        fetched_at: "2026-07-14T00:00:00.000Z",
        artifact_recency_status: "OK",
        measurement_usability_status: "OK",
        freshness_status: "OK",
        top_level_note: "ok",
      },
    }),
    now: FIXED_NOW,
  });
  assert.equal(fresh.gsc.freshness_status, "FRESH");
  assert.equal(fresh.ga4.freshness_status, "FRESH");
  assert.equal(fresh.blockers.length, 0);

  const stale = buildGscGa4FreshnessBlockersV1({
    freshness: emptyFreshness({
      gsc: {
        runtime_status: "OK",
        connection_level: "BRIGHT",
        artifact_source: "LOCAL_ARTIFACT",
        fetched_at_or_export_date: "2026-01-01T00:00:00.000Z",
        artifact_recency_status: "STALE",
        measurement_usability_status: "OK",
        freshness_status: "STALE",
        top_level_note: "stale",
      },
      ga4: {
        runtime_status: "OK",
        artifact_source: "LOCAL_ARTIFACT",
        fetched_at: "2026-01-01T00:00:00.000Z",
        artifact_recency_status: "STALE",
        measurement_usability_status: "OK",
        freshness_status: "STALE",
        top_level_note: "stale",
      },
    }),
    now: FIXED_NOW,
  });
  assert.equal(stale.gsc.freshness_status, "STALE");
  assert.ok(stale.blockers.some((b) => b.startsWith("gsc_artifact_stale")));
  assert.ok(stale.blockers.some((b) => b.startsWith("ga4_artifact_stale")));
});

test("resolveArtifactProvenance live resolver still used by production path", () => {
  const { dir, head } = initTempGit();
  try {
    const p = resolveArtifactProvenanceV1({ rootDir: dir });
    assert.equal(p.source_commit, head);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
