/**
 * Phase 2 — run-ID / resume-binding final repair + adversarial probes.
 */
import assert from "node:assert/strict";
import { spawnSync, execSync, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCanonicalFinalOperatingDecisionV1,
  bindCanonicalDispatchCommandV1,
} from "./buckparts-canonical-final-operating-decision-v1";
import {
  GE_OWNER_REVIEW_EXACT_COMMAND_V1,
  AP_OWNER_REVIEW_EXACT_COMMAND_V1,
  lookupDispatchAllowlistEntryV1,
  validateCanonicalAllowlistEqualityV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import {
  runBuckpartsCommandCenterDispatchRunnerV1,
} from "./buckparts-command-center-dispatch-runner-v1";
import {
  buildDispatchRunIdV1,
  extractDispatchRunIdMaterialV1,
} from "./buckparts-command-center-dispatch-recovery-v1";
import {
  applyGeMwfpXwfeSupabaseSyncWriteV1,
  buildGeMwfpXwfeSupabaseSyncApplyReportV1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1";
import { parseBuckpartsCommandCenterDispatchArgvV1 } from "../run-buckparts-command-center-dispatch-v1";

const DEMAND_CMD = "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";
const CLOSEOUT_CMD =
  "npx tsx scripts/report-air-purifier-demand-selected-batch-closeout-readiness-proof-v1.ts";
const ROOT = process.cwd();
const PARITY_REL =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json";

const BOUND = {
  provenance_status: "BOUND_TO_SOURCE_COMMIT" as const,
  base_commit: "deadbeef",
  source_commit: "deadbeef",
  worktree_clean: true,
};

function metaFor(cmd: string) {
  const m = lookupDispatchAllowlistEntryV1(cmd);
  assert.ok(m, `missing allowlist for ${cmd}`);
  return m!;
}

function matchingCanonical(cmd: string, overrides: Record<string, unknown> = {}) {
  const m = metaFor(cmd);
  return {
    command_executable: !m.owner_review_required,
    exact_command: cmd,
    selected_subsystem: m.selected_subsystem,
    dispatch_status: m.owner_review_required ? "OWNER_REVIEW_REQUIRED" : "READY",
    steering_override_source: "demand_to_coverage",
    owner_review_required: m.owner_review_required,
    command_kind: m.command_kind,
    artifact_write_behavior: m.artifact_write_behavior,
    no_artifact_allowed: m.no_artifact_allowed,
    mutation_posture: { ...m.mutation_posture },
    blockers: m.owner_review_required ? ["owner_review_required"] : [],
    next_best_action: "nba",
    ...overrides,
  };
}

function mockReport(cmd: string, overrides: Record<string, unknown> = {}) {
  return {
    report_name: "buckparts_command_center_v1",
    generated_at: "2026-07-18T00:00:00.000Z",
    read_only: true,
    data_mutation: false,
    command_center_v2: {
      canonical_final_operating_decision_v1: matchingCanonical(cmd, overrides),
    },
  };
}

function expectedRunId(
  cmd: string,
  source_commit: string,
  overrides: Record<string, unknown> = {},
): string {
  return buildDispatchRunIdV1(
    extractDispatchRunIdMaterialV1({
      source_commit,
      canonRaw: matchingCanonical(cmd, overrides),
    }),
  );
}

function bindingFields(cmd: string, source_commit: string, overrides: Record<string, unknown> = {}) {
  return extractDispatchRunIdMaterialV1({
    source_commit,
    canonRaw: matchingCanonical(cmd, overrides),
  });
}

function writeDurableRecord(args: {
  dir: string;
  cmd?: string;
  source_commit?: string;
  life: string;
  overrides?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}): { run_id: string; abs: string; body: string } {
  const cmd = args.cmd ?? DEMAND_CMD;
  const source_commit = args.source_commit ?? "deadbeef";
  const material = bindingFields(cmd, source_commit, args.overrides ?? {});
  const run_id = buildDispatchRunIdV1(material);
  const abs = path.join(args.dir, `dispatch-run-${run_id}.json`);
  const doc = {
    run_id,
    source_commit: material.source_commit,
    selected_subsystem: material.selected_subsystem,
    exact_command: material.exact_command,
    steering_override_source: material.steering_override_source,
    dispatch_status_before: material.dispatch_status,
    owner_review_required: material.owner_review_required,
    mutation_allowed: material.mutation_allowed,
    mutation_posture_classification: material.mutation_posture_classification,
    command_kind: material.command_kind,
    artifact_write_behavior: material.artifact_write_behavior,
    no_artifact_allowed: material.no_artifact_allowed,
    execution_lifecycle: args.life,
    execution_status: args.life === "EXECUTED" || args.life.startsWith("EXECUTED_") ? "EXECUTED" : "FAILED",
    subprocess_exit_code: 0,
    stdout_excerpt: "{}",
    stderr_excerpt: "",
    attempt_count: 1,
    blocked_reasons: [] as string[],
    ...args.extra,
  };
  const body = JSON.stringify(doc, null, 2) + "\n";
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
  return { run_id, abs, body };
}

// --- Metadata equality ---

test("mismatch selected_subsystem → blocked, exec=0, no journal", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2m-sub-"));
  let execCount = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { selected_subsystem: "wrong:subsystem" }) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((b) => b.includes("selected_subsystem")));
    assert.equal(res.artifact_abs_path, null);
    assert.ok(res.artifact.run_id.length === 32);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mismatch mutation_allowed=true when allowlist false → blocked, exec=0", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2m-mut-"));
  let execCount = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, {
          mutation_posture: { read_only: true, data_mutation: false, mutation_allowed: true },
        }) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(
      res.artifact.blocked_reasons.some((b) => b.includes("mutation_posture.mutation_allowed")),
    );
    assert.equal(res.artifact_abs_path, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("owner_review posture mismatch → blocked, exec=0", async () => {
  let execCount = 0;
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2m-or-"));
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { owner_review_required: true }) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(res.artifact.blocked_reasons.some((b) => b.includes("owner_review_required")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("artifact_write_behavior mismatch → blocked, exec=0", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2m-aw-"));
  let execCount = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { artifact_write_behavior: "required" }) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(res.artifact.blocked_reasons.some((b) => b.includes("artifact_write_behavior")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no_artifact_allowed mismatch → blocked, exec=0", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2m-na-"));
  let execCount = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { no_artifact_allowed: false }) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(res.artifact.blocked_reasons.some((b) => b.includes("no_artifact_allowed")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateCanonicalAllowlistEqualityV1 unit", () => {
  const m = metaFor(DEMAND_CMD);
  const ok = validateCanonicalAllowlistEqualityV1({
    exact_command: DEMAND_CMD,
    selected_subsystem: m.selected_subsystem,
    owner_review_required: m.owner_review_required,
    mutation_allowed: m.mutation_posture.mutation_allowed,
    command_kind: m.command_kind,
    artifact_write_behavior: m.artifact_write_behavior,
    no_artifact_allowed: m.no_artifact_allowed,
  });
  assert.equal(ok.ok, true);
});

// --- Production-runner tri-state run-ID collision matrix ---

type SafetyState = "true" | "false" | "missing" | "invalid";

function canonWithSafetyField(
  field: "owner_review_required" | "mutation_allowed" | "no_artifact_allowed",
  state: SafetyState,
): Record<string, unknown> {
  const base = matchingCanonical(DEMAND_CMD) as Record<string, unknown>;
  if (field === "owner_review_required") {
    if (state === "missing") delete base.owner_review_required;
    else if (state === "true") base.owner_review_required = true;
    else if (state === "false") base.owner_review_required = false;
    else base.owner_review_required = "yes";
    return base;
  }
  if (field === "no_artifact_allowed") {
    if (state === "missing") delete base.no_artifact_allowed;
    else if (state === "true") base.no_artifact_allowed = true;
    else if (state === "false") base.no_artifact_allowed = false;
    else base.no_artifact_allowed = 1;
    return base;
  }
  const posture = { ...(base.mutation_posture as Record<string, unknown>) };
  if (state === "missing") delete posture.mutation_allowed;
  else if (state === "true") posture.mutation_allowed = true;
  else if (state === "false") posture.mutation_allowed = false;
  else posture.mutation_allowed = "yes";
  base.mutation_posture = posture;
  return base;
}

async function runnerRunIdForCanon(canon: Record<string, unknown>): Promise<{
  run_id: string;
  execution_status: string;
  artifact_abs_path: string | null;
  blocked_reasons: string[];
}> {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-tri-"));
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        ({
          report_name: "buckparts_command_center_v1",
          generated_at: "2026-07-18T00:00:00.000Z",
          read_only: true,
          data_mutation: false,
          command_center_v2: { canonical_final_operating_decision_v1: canon },
        }) as any,
      exec: async () => {
        throw new Error("exec must not run for collision probes unless explicitly allowed");
      },
    });
    // Safe matching READY may try to exec — allow that path for true-safe baseline only.
    if (res.artifact.execution_status === "REFUSED" || res.artifact.execution_lifecycle === "FAILED") {
      return {
        run_id: res.artifact.run_id,
        execution_status: res.artifact.execution_status,
        artifact_abs_path: res.artifact_abs_path,
        blocked_reasons: res.artifact.blocked_reasons,
      };
    }
    return {
      run_id: res.artifact.run_id,
      execution_status: res.artifact.execution_status,
      artifact_abs_path: res.artifact_abs_path,
      blocked_reasons: res.artifact.blocked_reasons,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function runnerRunIdForCanonAllowExec(canon: Record<string, unknown>): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-tri-ok-"));
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        ({
          report_name: "buckparts_command_center_v1",
          generated_at: "2026-07-18T00:00:00.000Z",
          read_only: true,
          data_mutation: false,
          command_center_v2: { canonical_final_operating_decision_v1: canon },
        }) as any,
      exec: async () => ({ stdout: '{"ok":true}', stderr: "", exitCode: 0 }),
    });
    return res.artifact.run_id;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("runner-level tri-state collision matrix for all three safety fields", async () => {
  const fields = [
    "owner_review_required",
    "mutation_allowed",
    "no_artifact_allowed",
  ] as const;
  const pairs: Array<[SafetyState, SafetyState]> = [
    ["true", "false"],
    ["false", "missing"],
    ["true", "missing"],
    ["false", "invalid"],
    ["missing", "invalid"],
  ];
  // Demand allowlist: owner_review=false, mutation_allowed=false, no_artifact_allowed=true
  const allowlistMatchingState: Record<(typeof fields)[number], SafetyState> = {
    owner_review_required: "false",
    mutation_allowed: "false",
    no_artifact_allowed: "true",
  };

  for (const field of fields) {
    const ids: Partial<Record<SafetyState, string>> = {};
    for (const state of ["true", "false", "missing", "invalid"] as SafetyState[]) {
      const canon = canonWithSafetyField(field, state);
      const fromBuilder = buildDispatchRunIdV1(
        extractDispatchRunIdMaterialV1({ source_commit: "deadbeef", canonRaw: canon }),
      );
      let fromRunner: string;
      if (state === allowlistMatchingState[field]) {
        fromRunner = await runnerRunIdForCanonAllowExec(canon);
      } else {
        const res = await runnerRunIdForCanon(canon);
        fromRunner = res.run_id;
        assert.equal(res.execution_status, "REFUSED", `${field}/${state} must refuse`);
        assert.equal(res.artifact_abs_path, null, `${field}/${state} must create no journal`);
      }
      assert.equal(fromRunner, fromBuilder, `${field}/${state} runner vs builder`);
      ids[state] = fromRunner;
    }
    for (const [a, b] of pairs) {
      assert.notEqual(
        ids[a],
        ids[b],
        `${field}: ${a} vs ${b} must produce different run IDs (${ids[a]} === ${ids[b]})`,
      );
    }
  }
});

test("runner-level: subsystem / dispatch_status / owner_review posture collide separately", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-rid-multi-"));
  try {
    const base = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: path.join(dir, "a"),
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => ({ stdout: "{}", stderr: "", exitCode: 0 }),
    });
    const sub = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: path.join(dir, "b"),
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { selected_subsystem: "wrong:subsystem" }) as any,
      exec: async () => {
        throw new Error("no");
      },
    });
    const status = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: path.join(dir, "c"),
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { dispatch_status: "OWNER_REVIEW_REQUIRED", command_executable: false }) as any,
      exec: async () => {
        throw new Error("no");
      },
    });
    const owner = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: path.join(dir, "d"),
      provenanceResolver: () => BOUND,
      reportBuilder: async () =>
        mockReport(DEMAND_CMD, { owner_review_required: true }) as any,
      exec: async () => {
        throw new Error("no");
      },
    });
    assert.notEqual(base.artifact.run_id, sub.artifact.run_id);
    assert.notEqual(base.artifact.run_id, status.artifact.run_id);
    assert.notEqual(base.artifact.run_id, owner.artifact.run_id);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Wrong existing record / resume binding ---

test("existing wrong-record probes: command/subsystem/mutation/owner_review/source_commit", async () => {
  const cases: Array<{ name: string; bOverrides: Record<string, unknown>; sourceB?: string }> = [
    { name: "wrong command", bOverrides: {}, /* use different cmd below */ },
    { name: "wrong subsystem", bOverrides: { selected_subsystem: "wrong:subsystem" } },
    {
      name: "wrong mutation posture",
      bOverrides: {
        mutation_posture: { read_only: true, data_mutation: false, mutation_allowed: true },
      },
    },
    { name: "wrong owner-review posture", bOverrides: { owner_review_required: true } },
    { name: "wrong source commit", bOverrides: {}, sourceB: "cafebabe" },
  ];

  for (const c of cases) {
    const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-wrong-"));
    let execCount = 0;
    let refreshCalls = 0;
    let writeCalls = 0;
    try {
      // Decision A: valid FAILED durable record.
      const first = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: dir,
        dispatchRunsDirRel: dir,
        provenanceResolver: () => BOUND,
        reportBuilder: async () => mockReport(DEMAND_CMD) as any,
        exec: async () => {
          execCount += 1;
          return { stdout: "", stderr: "boom", exitCode: 9 };
        },
      });
      assert.equal(first.artifact.execution_lifecycle, "FAILED");
      const priorAbs = path.join(dir, `dispatch-run-${first.artifact.run_id}.json`);
      const before = readFileSync(priorAbs, "utf8");
      const execAfterCreate = execCount;

      const cmdB = c.name === "wrong command" ? CLOSEOUT_CMD : DEMAND_CMD;
      const provenanceB =
        c.sourceB != null
          ? {
              provenance_status: "BOUND_TO_SOURCE_COMMIT" as const,
              base_commit: c.sourceB,
              source_commit: c.sourceB,
              worktree_clean: true,
            }
          : BOUND;

      const res = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: dir,
        dispatchRunsDirRel: dir,
        resumeRunId: first.artifact.run_id,
        provenanceResolver: () => provenanceB,
        reportBuilder: async () => mockReport(cmdB, c.bOverrides) as any,
        exec: async () => {
          execCount += 1;
          throw new Error("no");
        },
        refreshExecutionLedger: () => {
          refreshCalls += 1;
        },
        writeText: () => {
          writeCalls += 1;
          throw new Error("must not write");
        },
      });
      assert.equal(execCount, execAfterCreate, c.name);
      assert.equal(refreshCalls, 0, c.name);
      assert.equal(writeCalls, 0, c.name);
      assert.equal(res.artifact.execution_status, "REFUSED", c.name);
      assert.ok(
        res.artifact.blocked_reasons.some(
          (b) => b.startsWith("resume_run_id_mismatch:") || b.startsWith("resume_record_mismatch:"),
        ),
        `${c.name}: ${res.artifact.blocked_reasons.join(" | ")}`,
      );
      assert.equal(readFileSync(priorAbs, "utf8"), before, c.name);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("table-driven stored-record tamper matrix (12 fields) + missing/malformed/duplicates", async () => {
  const expected = expectedRunId(DEMAND_CMD, "deadbeef");
  const tampers: Array<{ field: string; apply: (doc: Record<string, unknown>) => void }> = [
    { field: "run_id", apply: (d) => { d.run_id = "a".repeat(32); } },
    { field: "source_commit", apply: (d) => { d.source_commit = "cafebabe"; } },
    { field: "selected_subsystem", apply: (d) => { d.selected_subsystem = "wrong:subsystem"; } },
    { field: "exact_command", apply: (d) => { d.exact_command = "npx tsx scripts/tampered.ts"; } },
    {
      field: "steering_override_source",
      apply: (d) => {
        d.steering_override_source = "tampered_source";
      },
    },
    { field: "dispatch_status", apply: (d) => { d.dispatch_status_before = "OWNER_REVIEW_REQUIRED"; } },
    {
      field: "owner_review_required",
      apply: (d) => {
        d.owner_review_required = "BOOLEAN_TRUE";
      },
    },
    {
      field: "mutation_allowed",
      apply: (d) => {
        d.mutation_allowed = "BOOLEAN_TRUE";
      },
    },
    {
      field: "mutation_posture_classification",
      apply: (d) => {
        d.mutation_posture_classification = "tampered-classification";
      },
    },
    { field: "command_kind", apply: (d) => { d.command_kind = "owner_review"; } },
    {
      field: "artifact_write_behavior",
      apply: (d) => {
        d.artifact_write_behavior = "required";
      },
    },
    {
      field: "no_artifact_allowed",
      apply: (d) => {
        d.no_artifact_allowed = "BOOLEAN_FALSE";
      },
    },
  ];

  for (const t of tampers) {
    const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-tamper-"));
    let execCount = 0;
    let refreshCalls = 0;
    let writeCalls = 0;
    let renameCalls = 0;
    try {
      const { abs, body } = writeDurableRecord({ dir, life: "FAILED" });
      const doc = JSON.parse(body) as Record<string, unknown>;
      t.apply(doc);
      const tamperedBody = JSON.stringify(doc, null, 2) + "\n";
      writeFileSync(abs, tamperedBody);

      // Unrelated duplicate file must not be selected by stored run_id scan.
      writeFileSync(
        path.join(dir, `dispatch-run-${"b".repeat(32)}.json`),
        JSON.stringify({ run_id: expected, exact_command: "decoy" }) + "\n",
      );

      const res = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: dir,
        dispatchRunsDirRel: dir,
        resumeRunId: expected,
        provenanceResolver: () => BOUND,
        reportBuilder: async () => mockReport(DEMAND_CMD) as any,
        exec: async () => {
          execCount += 1;
          throw new Error("no");
        },
        refreshExecutionLedger: () => {
          refreshCalls += 1;
        },
        writeText: () => {
          writeCalls += 1;
          throw new Error("no");
        },
        rename: () => {
          renameCalls += 1;
          throw new Error("no");
        },
      });
      assert.equal(execCount, 0, t.field);
      assert.equal(refreshCalls, 0, t.field);
      assert.equal(writeCalls, 0, t.field);
      assert.equal(renameCalls, 0, t.field);
      assert.ok(
        res.artifact.blocked_reasons.some((b) => b.startsWith(`resume_record_mismatch:${t.field}`)),
        `${t.field}: ${res.artifact.blocked_reasons.join(" | ")}`,
      );
      assert.equal(readFileSync(abs, "utf8"), tamperedBody, t.field);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Canonical file absent
  {
    const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-absent-"));
    try {
      await assert.rejects(
        () =>
          runBuckpartsCommandCenterDispatchRunnerV1({
            rootDir: dir,
            dispatchRunsDirRel: dir,
            resumeRunId: expected,
            provenanceResolver: () => BOUND,
            reportBuilder: async () => mockReport(DEMAND_CMD) as any,
            exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
          }),
        /missing durable dispatch record/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Malformed JSON at canonical path
  {
    const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-badjson-"));
    let execCount = 0;
    let writeCalls = 0;
    try {
      const abs = path.join(dir, `dispatch-run-${expected}.json`);
      mkdirSync(dir, { recursive: true });
      const bad = "{not-json";
      writeFileSync(abs, bad);
      const res = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: dir,
        dispatchRunsDirRel: dir,
        resumeRunId: expected,
        provenanceResolver: () => BOUND,
        reportBuilder: async () => mockReport(DEMAND_CMD) as any,
        exec: async () => {
          execCount += 1;
          throw new Error("no");
        },
        writeText: () => {
          writeCalls += 1;
          throw new Error("no");
        },
      });
      assert.equal(execCount, 0);
      assert.equal(writeCalls, 0);
      assert.ok(
        res.artifact.blocked_reasons.some((b) => b.startsWith("resume_record_json_parse_failed")),
      );
      assert.equal(readFileSync(abs, "utf8"), bad);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Structurally invalid record (JSON array)
  {
    const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-struct-"));
    let execCount = 0;
    let writeCalls = 0;
    try {
      const abs = path.join(dir, `dispatch-run-${expected}.json`);
      mkdirSync(dir, { recursive: true });
      const bad = "[1,2,3]\n";
      writeFileSync(abs, bad);
      const res = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: dir,
        dispatchRunsDirRel: dir,
        resumeRunId: expected,
        provenanceResolver: () => BOUND,
        reportBuilder: async () => mockReport(DEMAND_CMD) as any,
        exec: async () => {
          execCount += 1;
          throw new Error("no");
        },
        writeText: () => {
          writeCalls += 1;
          throw new Error("no");
        },
      });
      assert.equal(execCount, 0);
      assert.equal(writeCalls, 0);
      assert.ok(
        res.artifact.blocked_reasons.some((b) => b === "resume_record_structurally_invalid"),
      );
      assert.equal(readFileSync(abs, "utf8"), bad);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

// --- Dirty / UNKNOWN provenance matrix (7 states) ---

async function dirtyOrUnknownResumeProbe(
  life: string,
  provenance_status: "DIRTY_WORKTREE" | "UNKNOWN",
) {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-dirty-"));
  let execCount = 0;
  let refreshCalls = 0;
  let writeCalls = 0;
  try {
    const { run_id, abs, body } = writeDurableRecord({
      dir,
      life,
      source_commit: "UNKNOWN",
    });
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      resumeRunId: run_id,
      provenanceResolver: () => ({
        provenance_status,
        base_commit: "abc",
        source_commit: null,
        worktree_clean: false,
      }),
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
      refreshExecutionLedger: () => {
        refreshCalls += 1;
      },
      writeText: () => {
        writeCalls += 1;
        throw new Error("must not write");
      },
    });
    assert.equal(execCount, 0, life);
    assert.equal(refreshCalls, 0, life);
    assert.equal(writeCalls, 0, life);
    assert.equal(res.artifact.execution_status, "REFUSED", life);
    assert.ok(
      res.artifact.blocked_reasons.some((b) => b.includes("dirty_or_unknown_provenance")),
      `${life}: ${res.artifact.blocked_reasons.join(" | ")}`,
    );
    assert.equal(readFileSync(abs, "utf8"), body, life);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("probe D: dirty/UNKNOWN provenance matrix for all seven lifecycles", async () => {
  for (const life of [
    "READY_TO_EXECUTE",
    "EXECUTION_IN_PROGRESS",
    "EXECUTION_OUTCOME_UNKNOWN",
    "FAILED",
    "EXECUTED_ARTIFACT_PENDING",
    "EXECUTED_LEDGER_PENDING",
    "EXECUTED",
  ]) {
    await dirtyOrUnknownResumeProbe(life, "DIRTY_WORKTREE");
    await dirtyOrUnknownResumeProbe(life, "UNKNOWN");
  }
});

// --- Uncertainty ---

test("probe E: post-success persistence failure → uncertain; total subprocess=1", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-unc-"));
  let execCount = 0;
  try {
    const writeText = (abs: string, contents: string) => {
      if (contents.includes('"execution_lifecycle": "EXECUTED_ARTIFACT_PENDING"')) {
        throw new Error("pending persist fail");
      }
      writeFileSync(abs, contents, "utf8");
    };
    const first = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      writeText,
      rename: (from, to) => {
        const body = readFileSync(from, "utf8");
        writeText(to, body);
        try {
          rmSync(from);
        } catch {
          /* ignore */
        }
      },
      exec: async () => {
        execCount += 1;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
    });
    assert.equal(execCount, 1);
    assert.ok(
      first.artifact.execution_lifecycle === "EXECUTION_IN_PROGRESS" ||
        first.artifact.execution_lifecycle === "EXECUTION_OUTCOME_UNKNOWN",
    );

    const second = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 1);
    assert.equal(second.artifact.execution_status, "FAILED");

    const parsed = parseBuckpartsCommandCenterDispatchArgvV1([
      `--resume-run-id=${first.artifact.run_id}`,
    ]);
    const resume = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      resumeRunId: parsed.resumeRunId,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 1);
    assert.ok(resume.artifact.blocked_reasons.some((b) => /uncertain|reconcil/i.test(b)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Production argv parser + production runner lifecycle integration ---
// (Not a full CLI-main end-to-end architecture claim.)

function initCleanGitRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-cli-git-"));
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "test"], { cwd: dir });
  writeFileSync(path.join(dir, "README"), "x\n");
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-m", "seed"], { cwd: dir });
  return dir;
}

test("production argv parser + runner lifecycle: FAILED/READY/uncertain/pending/EXECUTED/malformed/no-artifact", async () => {
  const gitRoot = initCleanGitRepo();
  const dir = path.join(gitRoot, "dispatch-runs");
  mkdirSync(dir, { recursive: true });
  let execCount = 0;
  let refreshCalls = 0;

  const run = async (argv: string[], lifeSetup?: () => void) => {
    lifeSetup?.();
    const parsed = parseBuckpartsCommandCenterDispatchArgvV1(argv);
    return runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: dir,
      noArtifact: parsed.noArtifact,
      resumeRunId: parsed.resumeRunId,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
      refreshExecutionLedger: () => {
        refreshCalls += 1;
      },
    });
  };

  try {
    // Seed FAILED via runner failure.
    execCount = 0;
    const failed = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        return { stdout: "", stderr: "x", exitCode: 2 };
      },
    });
    assert.equal(failed.artifact.execution_lifecycle, "FAILED");
    const failId = failed.artifact.run_id;
    const failExec = execCount;

    // FAILED + no resume → refuse
    const ordinary = await run([]);
    assert.equal(execCount, failExec);
    assert.ok(ordinary.artifact.blocked_reasons.some((b) => b.includes("explicit_resume_required")));

    // FAILED + matching resume → one retry
    const retry = await run([`--resume-run-id=${failId}`]);
    assert.equal(execCount, failExec + 1);
    assert.equal(retry.artifact.execution_lifecycle, "EXECUTED");

    // FAILED + wrong resume → refuse (fresh wrong id)
    const wrong = await run([`--resume-run-id=${"a".repeat(32)}`]);
    assert.equal(execCount, failExec + 1);
    assert.ok(wrong.artifact.blocked_reasons.some((b) => b.startsWith("resume_run_id_mismatch:")));

    // READY_TO_EXECUTE + no resume → refuse
    const readyDir = path.join(gitRoot, "ready");
    mkdirSync(readyDir, { recursive: true });
    const readyRec = writeDurableRecord({ dir: readyDir, life: "READY_TO_EXECUTE" });
    execCount = 0;
    const readyOrd = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: readyDir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(readyOrd.artifact.blocked_reasons.some((b) => b.includes("explicit_resume_required")));

    // EXECUTION_IN_PROGRESS + resume → reconcile, no subprocess
    const prog = writeDurableRecord({
      dir: path.join(gitRoot, "prog"),
      life: "EXECUTION_IN_PROGRESS",
    });
    mkdirSync(path.dirname(prog.abs), { recursive: true });
    execCount = 0;
    const progRes = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: path.dirname(prog.abs),
      resumeRunId: parseBuckpartsCommandCenterDispatchArgvV1([`--resume-run-id=${prog.run_id}`])
        .resumeRunId,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(progRes.artifact.blocked_reasons.some((b) => /uncertain|reconcil/i.test(b)));

    // EXECUTION_OUTCOME_UNKNOWN + resume
    const unk = writeDurableRecord({
      dir: path.join(gitRoot, "unk"),
      life: "EXECUTION_OUTCOME_UNKNOWN",
    });
    execCount = 0;
    const unkRes = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: path.dirname(unk.abs),
      resumeRunId: unk.run_id,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.ok(unkRes.artifact.blocked_reasons.some((b) => /uncertain|reconcil/i.test(b)));

    // EXECUTED_ARTIFACT_PENDING + matching resume → skip subprocess
    const artDir = path.join(gitRoot, "art");
    mkdirSync(artDir, { recursive: true });
    const art = writeDurableRecord({ dir: artDir, life: "EXECUTED_ARTIFACT_PENDING" });
    execCount = 0;
    refreshCalls = 0;
    const artRes = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: artDir,
      resumeRunId: art.run_id,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
      refreshExecutionLedger: () => {
        refreshCalls += 1;
      },
    });
    assert.equal(execCount, 0);
    assert.equal(artRes.artifact.execution_lifecycle, "EXECUTED");

    // EXECUTED_LEDGER_PENDING + matching resume → ledger once (default dir for refresh)
    const ledRoot = mkdtempSync(path.join(tmpdir(), "bp-p2-led-cli-"));
    try {
      const ledRel = "data/command-center/dispatch-runs";
      mkdirSync(path.join(ledRoot, ledRel), { recursive: true });
      const led = writeDurableRecord({
        dir: path.join(ledRoot, ledRel),
        life: "EXECUTED_LEDGER_PENDING",
        extra: { blocked_reasons: ["idempotent_skip: prior"] },
      });
      execCount = 0;
      refreshCalls = 0;
      let writeCalls = 0;
      let renameCalls = 0;
      const ledRes = await runBuckpartsCommandCenterDispatchRunnerV1({
        rootDir: ledRoot,
        resumeRunId: parseBuckpartsCommandCenterDispatchArgvV1([`--resume-run-id=${led.run_id}`])
          .resumeRunId,
        provenanceResolver: () => BOUND,
        reportBuilder: async () => mockReport(DEMAND_CMD) as any,
        exec: async () => {
          execCount += 1;
          throw new Error("no");
        },
        refreshExecutionLedger: () => {
          refreshCalls += 1;
        },
        writeText: (abs, contents) => {
          writeCalls += 1;
          writeFileSync(abs, contents, "utf8");
        },
        rename: (from, to) => {
          renameCalls += 1;
          renameSync(from, to);
        },
      });
      assert.equal(execCount, 0);
      assert.equal(refreshCalls, 1);
      assert.equal(writeCalls, 1);
      assert.equal(renameCalls, 1);
      assert.equal(ledRes.artifact.execution_lifecycle, "EXECUTED");
      assert.equal(ledRes.artifact.execution_status, "EXECUTED");
      assert.equal(ledRes.artifact.execution_allowed, false);
      assert.deepEqual(ledRes.artifact.blocked_reasons, []);
      assert.equal(
        existsSync(path.join(ledRoot, ledRel, `dispatch-run-${led.run_id}.json`)),
        true,
      );
    } finally {
      rmSync(ledRoot, { recursive: true, force: true });
    }

    // EXECUTED + matching resume → idempotent no-op
    const doneDir = path.join(gitRoot, "done");
    mkdirSync(doneDir, { recursive: true });
    const done = writeDurableRecord({ dir: doneDir, life: "EXECUTED" });
    const beforeDone = readFileSync(done.abs, "utf8");
    execCount = 0;
    const doneRes = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: gitRoot,
      dispatchRunsDirRel: doneDir,
      resumeRunId: done.run_id,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.equal(doneRes.artifact.execution_status, "ALREADY_EXECUTED");
    assert.equal(readFileSync(done.abs, "utf8"), beforeDone);

    // malformed resume ID → fail closed (parser)
    assert.throws(
      () => parseBuckpartsCommandCenterDispatchArgvV1(["--resume-run-id=not-hex"]),
      /malformed --resume-run-id/,
    );
    const malformedCli = spawnSync(
      "npx",
      ["tsx", "scripts/run-buckparts-command-center-dispatch-v1.ts", "--resume-run-id=zzz"],
      { cwd: ROOT, encoding: "utf8" },
    );
    assert.notEqual(malformedCli.status, 0);

    // resume + --no-artifact → fail closed
    assert.throws(
      () =>
        parseBuckpartsCommandCenterDispatchArgvV1([
          "--no-artifact",
          `--resume-run-id=${"c".repeat(32)}`,
        ]),
      /cannot combine/,
    );
    void readyRec;
  } finally {
    rmSync(gitRoot, { recursive: true, force: true });
  }
});

test("ledger PENDING exact call counts (refresh=1 write=1 rename=1 exec=0)", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "bp-p2-led-exact-"));
  let refreshCalls = 0;
  let execCount = 0;
  let writeCalls = 0;
  let renameCalls = 0;
  try {
    const ledRel = "data/command-center/dispatch-runs";
    mkdirSync(path.join(root, ledRel), { recursive: true });
    const { run_id } = writeDurableRecord({
      dir: path.join(root, ledRel),
      life: "EXECUTED_LEDGER_PENDING",
      extra: { blocked_reasons: ["idempotent_skip: prior"] },
    });
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: root,
      resumeRunId: run_id,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
      refreshExecutionLedger: () => {
        refreshCalls += 1;
      },
      writeText: (abs, contents) => {
        writeCalls += 1;
        writeFileSync(abs, contents, "utf8");
      },
      rename: (from, to) => {
        renameCalls += 1;
        renameSync(from, to);
      },
    });
    assert.equal(execCount, 0);
    assert.equal(refreshCalls, 1);
    assert.equal(writeCalls, 1);
    assert.equal(renameCalls, 1);
    assert.equal(res.artifact.execution_lifecycle, "EXECUTED");
    assert.equal(res.artifact.execution_status, "EXECUTED");
    assert.equal(res.artifact.execution_allowed, false);
    assert.deepEqual(res.artifact.blocked_reasons, []);
    assert.equal(existsSync(path.join(root, ledRel, `dispatch-run-${run_id}.json`)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Explicit FAILED retry (runner) ---

test("probe F: FAILED ordinary → exec=0; matching resume may run once", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-fail-"));
  let execCount = 0;
  try {
    const first = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        return { stdout: "", stderr: "boom", exitCode: 9 };
      },
    });
    assert.equal(execCount, 1);
    assert.equal(first.artifact.execution_lifecycle, "FAILED");

    const ordinary = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 1);
    assert.ok(ordinary.artifact.blocked_reasons.some((b) => b.includes("explicit_resume_required")));

    const resumed = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      resumeRunId: first.artifact.run_id,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
    });
    assert.equal(execCount, 2);
    assert.equal(resumed.artifact.execution_lifecycle, "EXECUTED");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mismatched resume ID refuses without throw; zero mutations", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-mismatch-"));
  let execCount = 0;
  let writeCalls = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      resumeRunId: "f".repeat(32),
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        throw new Error("no");
      },
      writeText: () => {
        writeCalls += 1;
        throw new Error("no");
      },
    });
    assert.equal(execCount, 0);
    assert.equal(writeCalls, 0);
    assert.equal(res.artifact.execution_status, "REFUSED");
    assert.ok(res.artifact.blocked_reasons.some((b) => b.startsWith("resume_run_id_mismatch:")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Strict founder-expiry pair ---

function boundParityText() {
  return execSync(`git show 1767762:${PARITY_REL}`, { encoding: "utf8" });
}

function stalePrimary(filter: "smartwater-mwfp" | "xwfe", filterId: string) {
  return {
    id: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[filter],
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

test("probe G: strict founder-expiry pair — only expires_at differs", async () => {
  const FIXED_NOW = new Date("2026-07-15T12:00:00.000Z");
  const boundParity = boundParityText();
  const approvalRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1;

  const loadSupabase = async () =>
    ({
      status: "CHECKED" as const,
      by_slug: new Map([
        ["smartwater-mwfp", stalePrimary("smartwater-mwfp", "f1")],
        ["xwfe", stalePrimary("xwfe", "f2")],
      ]) as never,
      filter_id_by_slug: new Map([
        ["smartwater-mwfp", "f1"],
        ["xwfe", "f2"],
      ]) as never,
    }) as never;

  const primaryAdmin = () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [{ id: "1", is_primary: true }], error: null }),
      }),
    }),
  });

  const readApproval = (expiresAtOverride?: string) => (abs: string) => {
    if (abs.includes(PARITY_REL)) return boundParity;
    if (expiresAtOverride && abs.includes(approvalRel)) {
      const doc = JSON.parse(readFileSync(abs, "utf8")) as {
        rows?: Array<{ expires_at?: string; review_after?: string | null }>;
      };
      if (doc.rows?.[0]) {
        doc.rows[0].expires_at = expiresAtOverride;
        // Keep review_after identical to control (null/unchanged).
      }
      return JSON.stringify(doc);
    }
    return readFileSync(abs, "utf8");
  };

  const valid = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "write",
    now: () => FIXED_NOW,
    ioCapability: "MUTATION",
    loadEnv: () => undefined,
    loadSupabase,
    getSupabaseAdmin: primaryAdmin,
    readText: readApproval(),
  });
  assert.equal(valid.mutation_authorized, true, `valid blockers=${valid.blockers.join(",")}`);
  assert.ok(!valid.blockers.includes("founder_approval_expired_or_unbounded"));

  let writerCalls = 0;
  const writerAdmin = () => ({
    from: () => ({
      update: () => {
        writerCalls += 1;
        return {
          eq: () => ({
            eq: () => ({
              eq: async () => ({ error: null, count: 1 }),
            }),
          }),
        };
      },
    }),
  });

  const tmp = mkdtempSync(path.join(tmpdir(), "bp-p2-ge-write-"));
  const prevIo = process.env.BUCKPARTS_IO_CAPABILITY;
  process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
  try {
    mkdirSync(path.join(tmp, "data/fridge/batch-production/drafts"), { recursive: true });
    try {
      await applyGeMwfpXwfeSupabaseSyncWriteV1({
        rootDir: tmp,
        report: valid,
        loadEnv: () => undefined,
        getSupabaseAdmin: writerAdmin as never,
      });
    } catch {
      /* closeout may fail in tmp */
    }
    assert.ok(writerCalls >= 1, `expected writer path, got writerCalls=${writerCalls}`);
  } finally {
    if (prevIo === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prevIo;
    rmSync(tmp, { recursive: true, force: true });
  }

  const expiredReady = await buildGeMwfpXwfeSupabaseSyncApplyReportV1({
    rootDir: ROOT,
    mode: "write",
    now: () => FIXED_NOW,
    ioCapability: "MUTATION",
    loadEnv: () => undefined,
    loadSupabase,
    getSupabaseAdmin: primaryAdmin,
    readText: readApproval("2026-01-01T00:00:00.000Z"),
  });
  assert.equal(expiredReady.mutation_authorized, false);
  assert.deepEqual(expiredReady.blockers, ["founder_approval_expired_or_unbounded"]);

  let expiredWriter = 0;
  const prevIoExpired = process.env.BUCKPARTS_IO_CAPABILITY;
  process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
  try {
    await assert.rejects(
      () =>
        applyGeMwfpXwfeSupabaseSyncWriteV1({
          rootDir: ROOT,
          report: expiredReady,
          loadEnv: () => undefined,
          getSupabaseAdmin: () => {
            expiredWriter += 1;
            throw new Error("no");
          },
        }),
      /MUTATION_NOT_AUTHORIZED/,
    );
  } finally {
    if (prevIoExpired === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = prevIoExpired;
  }
  assert.equal(expiredWriter, 0);
});

// --- Prior probes retained ---

test("probe A: GE owner-review fail-closed", () => {
  const bound = bindCanonicalDispatchCommandV1({
    exact_command: GE_OWNER_REVIEW_EXACT_COMMAND_V1,
    steering_override_source: "root_resolve",
  });
  assert.equal(bound.dispatch_status, "OWNER_REVIEW_REQUIRED");
  assert.equal(bound.command_executable, false);
  const d = buildCanonicalFinalOperatingDecisionV1({
    generated_at: "t",
    candidates: [
      {
        source: "root_resolve",
        next_best_action: "GE",
        why_this_action: "ge",
        exact_command: GE_OWNER_REVIEW_EXACT_COMMAND_V1,
        active: true,
      },
    ],
  });
  assert.equal(d.command_kind, "owner_review");
  assert.equal(d.selected_subsystem, metaFor(GE_OWNER_REVIEW_EXACT_COMMAND_V1).selected_subsystem);
});

test("AP owner-review metadata present", () => {
  assert.equal(metaFor(AP_OWNER_REVIEW_EXACT_COMMAND_V1).owner_review_required, true);
});

test("CLI rejects resume+no-artifact", () => {
  const res = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/run-buckparts-command-center-dispatch-v1.ts",
      "--no-artifact",
      `--resume-run-id=${"c".repeat(32)}`,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(res.status, 0);
  assert.match(res.stderr + res.stdout, /cannot combine/);
});

test("--no-artifact zero-write", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-na2-"));
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      noArtifact: true,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
      writeText: () => {
        throw new Error("no write");
      },
    });
    assert.equal(res.no_artifact, true);
    assert.equal(res.artifact_abs_path, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("matching canonical executes demand command", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bp-p2-ok-"));
  let execCount = 0;
  try {
    const res = await runBuckpartsCommandCenterDispatchRunnerV1({
      rootDir: dir,
      dispatchRunsDirRel: dir,
      provenanceResolver: () => BOUND,
      reportBuilder: async () => mockReport(DEMAND_CMD) as any,
      exec: async () => {
        execCount += 1;
        return { stdout: '{"ok":true}', stderr: "", exitCode: 0 };
      },
    });
    assert.equal(execCount, 1);
    assert.equal(res.artifact.execution_lifecycle, "EXECUTED");
    assert.equal(res.artifact.execution_allowed, false);
    assert.equal(res.artifact.mutation_allowed, "BOOLEAN_FALSE");
    assert.ok(existsSync(path.join(dir, `dispatch-run-${res.artifact.run_id}.json`)));
    assert.equal(res.artifact.run_id, expectedRunId(DEMAND_CMD, "deadbeef"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
