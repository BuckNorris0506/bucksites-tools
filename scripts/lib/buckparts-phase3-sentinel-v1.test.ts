import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  lookupDispatchAllowlistEntryV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import { runBuckpartsCommandCenterDispatchRunnerV1 } from "./buckparts-command-center-dispatch-runner-v1";
import { buildCommandCenterBrainCoverageManifestV1 } from "./buckparts-brain-coverage-manifest-v1";
import { demoteAdvisoryBrainV1 } from "./buckparts-canonical-final-operating-decision-v1";
import { buildRetailerLinkParityCorrectionCommandCenterLaneV1 } from "../report-buckparts-command-center";
import {
  buildRetailerLinkParityIssueIdV1,
  type BuckpartsRetailerLinkParityIssueIntakeReportV1,
} from "./buckparts-retailer-link-parity-issue-intake-v1";
import {
  BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1,
  buildRetailerLinkParityCorrectionPlanV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";
import {
  deriveRetailerLinkParityCorrectionProjectionV1,
  parseRetailerLinkParityCorrectionArgvV1,
  runRetailerLinkParityCorrectionReportV1,
} from "../report-buckparts-retailer-link-parity-correction-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDATOR = path.join(ROOT, "scripts/validate-buckparts-phase3-self-correction-v1.sh");
const PASS = "PHASE3_SELF_CORRECTION_PASS";
const FAIL = "PHASE3_SELF_CORRECTION_FAIL";

function runInjectedValidator(inject: string) {
  const result = spawnSync("bash", [VALIDATOR], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, BUCKPARTS_PHASE3_SELF_CORRECTION_INJECT: inject },
    timeout: 120_000,
  });
  const lines = (result.stdout ?? "").trimEnd().split("\n");
  return { ...result, lines };
}

test("phase3 validator success_short emits one final PASS", () => {
  const result = runInjectedValidator("success_short");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.lines.at(-1), PASS);
  assert.equal(result.lines.filter((line) => line === PASS).length, 1);
});

test("phase3 validator rejects child missing or failing Phase 2 sentinel", () => {
  for (const inject of ["nested_phase2_missing_pass", "nested_phase2_failure"]) {
    const result = runInjectedValidator(inject);
    assert.notEqual(result.status, 0);
    assert.equal(result.lines.at(-1), FAIL);
    assert.equal(result.lines.filter((line) => line === FAIL).length, 1);
  }
});

test("guarded apply is absent from allowlist and runner refuses without subprocess", async () => {
  assert.equal(
    lookupDispatchAllowlistEntryV1(BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1),
    null,
  );
  let subprocess_calls = 0;
  const result = await runBuckpartsCommandCenterDispatchRunnerV1({
    rootDir: ROOT,
    noArtifact: true,
    provenanceResolver: () => ({
      provenance_status: "BOUND_TO_SOURCE_COMMIT",
      base_commit: "abc1234",
      source_commit: "abc1234",
      worktree_clean: true,
    }),
    reportBuilder: async () =>
      ({
        read_only: true,
        data_mutation: false,
        command_center_v2: {
          canonical_final_operating_decision_v1: {
            command_executable: true,
            exact_command: BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
            selected_subsystem: "retailer_link_parity:guarded_apply",
            dispatch_status: "READY",
            steering_override_source: "test",
            owner_review_required: false,
            command_kind: "read_only_report",
            artifact_write_behavior: "optional",
            no_artifact_allowed: true,
            mutation_posture: { mutation_allowed: false },
            blockers: [],
          },
        },
      }) as never,
    exec: async () => {
      subprocess_calls += 1;
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  });
  assert.equal(subprocess_calls, 0);
  assert.equal(result.artifact.execution_status, "REFUSED");
  assert.ok(result.artifact.blocked_reasons.some((reason) => reason.includes("not allowlisted")));
});

test("parity owner-review command is non-executable by allowlist metadata", () => {
  const meta = lookupDispatchAllowlistEntryV1(
    "npm run buckparts:retailer-link-parity-correction -- --owner-review",
  );
  assert.ok(meta);
  assert.equal(meta.owner_review_required, true);
  assert.equal(meta.command_kind, "owner_review");
  assert.equal(meta.mutation_posture.mutation_allowed, false);
});

test("parity projection fails closed without injected intake", () => {
  const lane = buildRetailerLinkParityCorrectionCommandCenterLaneV1({
    unavailable_reason: "test_no_db",
  });
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.runtime_status, "NOT_PROVEN");
  assert.match(lane.blockers.join("\n"), /test_no_db/);
  assert.match(lane.steering_note, /issue_registry remains steering/);
});

test("advisory brains retain explicit demotion and manifest authority flags", () => {
  const demoted = demoteAdvisoryBrainV1({
    payload: { status: "OK" },
    canonical_source: ".command_center_v2.canonical_final_operating_decision_v1",
    reason: "test",
  });
  assert.equal(demoted.advisory_only, true);
  assert.equal(demoted.non_authoritative, true);
  const manifest = buildCommandCenterBrainCoverageManifestV1({
    rootDir: ROOT,
    now: () => new Date("2026-07-19T00:00:00.000Z"),
  });
  for (const system_id of ["semi_cruise", "control_graph"]) {
    const entry = manifest.entries.find((row) => row.system_id === system_id);
    assert.ok(entry);
    assert.equal(entry.steering_authority, false);
    assert.match(entry.notes ?? "", /advisory_only=true; non_authoritative=true/);
  }
});

test("Codex probes: table-sensitive IDs, single-row cap, no-op ARMED_AND_IDLE, CC lifecycle", async () => {
  const id = buildRetailerLinkParityIssueIdV1({
      defect_class: "CSV_HAS_WIN_SUPABASE_MISSING",
      table: "public.retailer_links",
      wedge: "refrigerator_water",
      filter_slug: "slug-a",
      link_id: "link-a",
    });
  const rejected = buildRetailerLinkParityIssueIdV1({
      defect_class: "CSV_HAS_WIN_SUPABASE_MISSING",
      table: "public.other_table",
      wedge: "refrigerator_water",
      filter_slug: "slug-a",
      link_id: "link-a",
    });
  assert.equal(id.ok, true);
  assert.equal(rejected.ok, false);
  assert.equal(BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1, 1);

  const intake: BuckpartsRetailerLinkParityIssueIntakeReportV1 = {
    contract: "buckparts_retailer_link_parity_issue_intake_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: "2026-07-19T12:00:00.000Z",
    detected_count: 4,
    correctable_count: 1,
    unknown_count: 0,
    non_correctable_count: 3,
    blocked_count: 0,
    candidates: [
      {
        issue_id: "issue-noop",
        lifecycle: "DISCOVERED",
        defect_class: "CSV_HAS_WIN_SUPABASE_MISSING",
        wedge: "refrigerator_water",
        table: "public.retailer_links",
        filter_slug: "filter-a",
        existing_row: {
          filter_slug: "filter-a",
          filter_id: "filter-id-a",
          supabase_link_id: "link-id-a",
          is_primary: true,
          current_affiliate_url: "https://same.example/a",
          current_retailer_key: "same",
          current_retailer_name: "Same",
          current_browser_truth_classification: "direct_buyable",
        },
        evidence_win_artifacts: ["data/evidence/a.json"],
        csv_primary_url: "https://same.example/a",
        csv_primary_retailer: "same",
        detector_status: "CSV_HAS_WIN_SUPABASE_MISSING",
        operation: "UPDATE",
        insert_delete_posture: "forbidden",
      },
    ],
    blockers: ["intake_note_preserved", "zero_row_plan_refused"],
    proof_sources: [],
    recommended_next_action: "should be overridden for no-op",
  };
  const plan = buildRetailerLinkParityCorrectionPlanV1({
    intake,
    now: () => new Date("2026-07-19T12:00:00.000Z"),
  });
  assert.equal(plan.row_count, 0);
  assert.ok(plan.blockers.includes("zero_row_plan_refused"));
  assert.ok(plan.blockers.some((b) => b.startsWith("no_op_update_refused:")));

  const report = await runRetailerLinkParityCorrectionReportV1({
    rootDir: ROOT,
    mode: "plan_dry_run",
    builders: {
      buildIntake: async () => intake,
      buildPostDiff: async () => {
        throw new Error("postDiff unused");
      },
    },
  });
  assert.equal(report.posture, "ARMED_AND_IDLE");
  assert.equal(
    report.next_action,
    "No apply-ready parity correction exists. Continue read-only monitoring.",
  );
  assert.equal(report.counts.planned, 0);
  assert.equal(report.counts.awaiting_approval, 0);
  assert.equal(report.counts.failed_or_reconciliation, 0);
  assert.equal(report.counts.applied, 0);
  assert.equal(report.counts.verified, 0);

  const lane = buildRetailerLinkParityCorrectionCommandCenterLaneV1({
    intake,
    plan,
    approvalPresent: false,
  });
  assert.equal(lane.runtime_status, "ARMED_AND_IDLE");
  assert.equal(lane.detected_count, 4);
  assert.equal(lane.discovered_count, 1);
  assert.equal(lane.planned_count, 0);
  assert.equal(lane.awaiting_approval_count, 0);
  assert.equal(lane.approved_ready_count, 0);
  assert.equal(lane.applied_count, 0);
  assert.equal(lane.verified_count, 0);
  assert.equal(lane.failed_or_reconciliation_count, 0);
  assert.equal(lane.owner_action_count, 0);
  assert.equal(lane.cohorts.length, 1);
  assert.equal(lane.cohorts[0]?.status, "DISCOVERED");
  assert.ok(!lane.cohorts.some((c) => c.status === "AWAITING_APPROVAL"));
  // Synthetic no-op: intake + plan blockers merged, deduped, sorted; no rewrite.
  assert.ok(lane.blockers.includes("intake_note_preserved"));
  assert.ok(lane.blockers.includes("zero_row_plan_refused"));
  assert.ok(lane.blockers.some((b) => b.startsWith("no_op_update_refused:")));
  assert.deepEqual(lane.blockers, [...lane.blockers].sort());
  assert.equal(lane.blockers.length, new Set(lane.blockers).size);
  assert.equal(
    lane.blockers.filter((b) => b === "zero_row_plan_refused").length,
    1,
    "duplicate zero_row_plan_refused must be deduplicated",
  );

  // Real integration path must pass derived plan (intake-only must not inflate awaiting approval).
  const liveDerived = await deriveRetailerLinkParityCorrectionProjectionV1({ rootDir: ROOT });
  const liveLane = buildRetailerLinkParityCorrectionCommandCenterLaneV1({
    intake: liveDerived.intake,
    plan: liveDerived.plan,
  });
  assert.equal(liveLane.runtime_status, "ARMED_AND_IDLE");
  assert.equal(liveLane.detected_count, 4);
  assert.equal(liveLane.discovered_count, 1);
  assert.equal(liveLane.planned_count, 0);
  assert.equal(liveLane.awaiting_approval_count, 0);
  assert.equal(liveLane.approved_ready_count, 0);
  assert.equal(liveLane.applied_count, 0);
  assert.equal(liveLane.verified_count, 0);
  assert.equal(liveLane.failed_or_reconciliation_count, 0);
  assert.equal(liveLane.owner_action_count, 0);
  assert.ok(liveLane.blockers.length > 0);
  assert.ok(liveLane.blockers.includes("zero_row_plan_refused"));
  assert.equal(
    liveLane.blockers.filter((b) => b.startsWith("no_op_update_refused:")).length,
    1,
  );
  assert.deepEqual(liveLane.blockers, [...liveLane.blockers].sort());

  assert.equal(parseRetailerLinkParityCorrectionArgvV1([]), "detect");
  assert.throws(() => parseRetailerLinkParityCorrectionArgvV1(["--apply"]));
});

test("guarded apply CLI refuses write without plan and is not import-side-effecting", () => {
  const cli = path.join(ROOT, "scripts/lib/buckparts-retailer-link-parity-guarded-apply-v1.ts");
  const dry = spawnSync("npx", ["tsx", cli], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /"mutation_authorized": false/);
  assert.match(dry.stdout, /plan_file_required_for_write/);

  const write = spawnSync(
    "npx",
    ["tsx", cli, "--write"],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, BUCKPARTS_IO_CAPABILITY: "READ_INDEX" },
      timeout: 30_000,
    },
  );
  assert.notEqual(write.status, 0);
  assert.match(write.stdout, /mutation_capability_required|plan_file_required/);
  assert.match(write.stdout, /"writer_calls": 0/);
});

test("parity command-center lifecycle precedence is mutually exclusive", () => {
  const intake = {
    detected_count: 1,
    correctable_count: 1,
    non_correctable_count: 0,
    blocked_count: 0,
    candidates: [{ issue_id: "issue-a" }],
    blockers: [],
    proof_sources: [],
    recommended_next_action: "test",
  } as BuckpartsRetailerLinkParityIssueIntakeReportV1;
  const plan = {
    row_count: 1,
    blockers: [],
    rows: [{ issue_id: "issue-a" }],
  } as never;
  const lane = (overrides: Record<string, unknown> = {}) =>
    buildRetailerLinkParityCorrectionCommandCenterLaneV1({
      intake, plan, ...overrides,
    } as never);
  const states = [
    ["APPROVED_READY", lane({ approvalPresent: true })],
    ["AWAITING_APPROVAL", lane({ approvalPresent: false })],
    ["PLANNED", lane({ approvalPresent: false, awaitingOwnerReview: false })],
    ["APPLIED", lane({ executionReceipt: { execution_id: "run-a", apply_status: "APPLIED" } })],
    ["FAILED_RECONCILIATION", lane({ executionReceipt: { execution_id: "run-a", apply_status: "APPLIED" }, closeout: { closeout_status: "NOT_PROVEN" } })],
    ["VERIFIED", lane({ executionReceipt: { execution_id: "run-a", apply_status: "APPLIED" }, closeout: { closeout_status: "VERIFIED" } })],
    ["DISCOVERED", buildRetailerLinkParityCorrectionCommandCenterLaneV1({ intake })],
  ] as const;
  const counterFor = {
    DISCOVERED: "discovered_count",
    PLANNED: "planned_count",
    AWAITING_APPROVAL: "awaiting_approval_count",
    APPROVED_READY: "approved_ready_count",
    APPLIED: "applied_count",
    VERIFIED: "verified_count",
    FAILED_RECONCILIATION: "failed_or_reconciliation_count",
  } as const;
  for (const [status, result] of states) {
    assert.equal(result.cohorts[0]?.status, status);
    for (const counter of Object.values(counterFor)) {
      assert.equal(result[counter], counter === counterFor[status] ? 1 : 0, `${status}:${counter}`);
    }
    assert.equal(result.owner_action_count, status === "AWAITING_APPROVAL" ? 1 : 0, status);
  }
});
