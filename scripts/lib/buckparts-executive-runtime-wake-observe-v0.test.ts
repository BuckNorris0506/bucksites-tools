import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXECUTIVE_RUNTIME_WAKE_OBSERVE_CONTRACT_V0,
  EXECUTIVE_RUNTIME_WAKE_OBSERVE_SLICE_V0,
  extractHqStoppingPointHeadingV0,
  runExecutiveRuntimeWakeObserveV0,
} from "./buckparts-executive-runtime-wake-observe-v0";

const LIB_ABS = fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts");
const CLI_ABS = path.resolve(path.dirname(LIB_ABS), "../run-buckparts-executive-runtime-wake-observe-v0.ts");
const NOW = () => new Date("2026-08-14T02:00:00.000Z");
const HEAD_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function withTempRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), "exec-runtime-v0-"));
  return run(root).finally(() => rmSync(root, { recursive: true, force: true }));
}

function writeRequiredDocs(root: string, hqHeading = "## Current stopping point — Executive OS execution (`9944e32`)"): void {
  mkdirSync(path.join(root, "docs"), { recursive: true });
  writeFileSync(
    path.join(root, "docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md"),
    "# BuckParts Executive Runtime Contract v1\n\nWAKE OBSERVE STOP\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, "docs/BuckParts-HQ-HANDOFF.md"),
    `# BuckParts HQ\n\n${hqHeading}\n\nOperate from this section.\n`,
    "utf8",
  );
}

function commandCenterFixture(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    generated_at: "2026-08-14T01:00:00.000Z",
    next_best_action: "Feed the sensory path with real customer activity.",
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      mutating_blocked: true,
      mutating_block_reasons: ["v0_observe_only"],
    },
    command_center_v2: {
      next_owner_action: "Jared: no v0 selection.",
      amazon_rescue: {
        next_agent_action: "read-only audit",
        next_owner_action: "",
        human_browser_required_tokens: [],
        status: "OK",
      },
      affiliate_readiness: { status: "OK", next_owner_action: "", next_agent_action: "" },
      deploy_live_site_status: { status: "OK", live_site_monitor: null },
      unknown_or_human_review: { status: "OK", next_owner_action: "", blocker: null },
      canonical_final_operating_decision_v1: {
        dispatch_status: "READY",
        command_executable: true,
        exact_command: "npx tsx scripts/report-buckparts-command-center.ts",
        next_best_action: "Feed the sensory path with real customer activity.",
      },
      phase4_outcome_capture_v1: {
        contract: "phase4_outcome_capture_v1",
        steering_authority: false,
        nba_authority: false,
        handoff_from_confident_buy_count: "UNKNOWN",
        runtime_status: "ATTENTION",
        blockers: ["phase4_outcome_capture_handoff_join_key_unqualified"],
      },
      ...(overrides?.command_center_v2 && typeof overrides.command_center_v2 === "object"
        ? (overrides.command_center_v2 as Record<string, unknown>)
        : {}),
    },
    ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([key]) => key !== "command_center_v2")),
  };
}

async function wake(args: {
  root: string;
  sha?: string;
  cc?: unknown;
  loadCommandCenter?: () => unknown;
  readGitHead?: () => { sha: string; statusShort: string };
}) {
  return runExecutiveRuntimeWakeObserveV0({
    rootDir: args.root,
    now: NOW,
    readGitHead:
      args.readGitHead ??
      (() => ({ sha: args.sha ?? HEAD_A, statusShort: "" })),
    loadCommandCenter: args.loadCommandCenter ?? (async () => args.cc ?? commandCenterFixture()),
  });
}

test("extracts HQ stopping-point heading", () => {
  const heading = extractHqStoppingPointHeadingV0(
    "# HQ\n\n## Current stopping point — Executive OS execution (`9944e32`)\n\nbody\n",
  );
  assert.equal(heading, "## Current stopping point — Executive OS execution (`9944e32`)");
});

test("wake succeeds when required sources are available", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { ok, snapshot } = await wake({ root });
    assert.equal(ok, true);
    assert.equal(snapshot.cycle_status, "OBSERVED_STOP");
    assert.equal(snapshot.contract, EXECUTIVE_RUNTIME_WAKE_OBSERVE_CONTRACT_V0);
    assert.equal(snapshot.runtime_slice, EXECUTIVE_RUNTIME_WAKE_OBSERVE_SLICE_V0);
    assert.equal(snapshot.head.sha, HEAD_A);
    assert.equal(snapshot.head.honesty, "PROVEN");
    assert.equal(snapshot.sources.hq_handoff.honesty, "PROVEN");
    assert.equal(snapshot.sources.command_center.honesty, "PROVEN");
    assert.equal(snapshot.sources.outcome_join.observed, true);
    assert.equal(snapshot.sources.outcome_join.honesty, "PROVEN");
    assert.equal(snapshot.sources.founder_action_queue.honesty, "PROVEN");
    assert.equal(snapshot.sources.owner_decision_queue.honesty, "PROVEN");
    assert.equal(snapshot.sources.oar.honesty, "PROVEN");
    assert.equal(snapshot.blocked_reasons.length, 0);
  });
});

test("missing HQ file fails closed", async () => {
  await withTempRoot(async (root) => {
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(
      path.join(root, "docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md"),
      "# contract\n",
      "utf8",
    );
    const { ok, snapshot } = await wake({ root });
    assert.equal(ok, false);
    assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
    assert.ok(snapshot.blocked_reasons.some((reason) => reason.includes("HQ-HANDOFF")));
  });
});

test("missing runtime contract file fails closed", async () => {
  await withTempRoot(async (root) => {
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(
      path.join(root, "docs/BuckParts-HQ-HANDOFF.md"),
      "## Current stopping point — x (`9944e32`)\n",
      "utf8",
    );
    const { ok, snapshot } = await wake({ root });
    assert.equal(ok, false);
    assert.ok(snapshot.blocked_reasons.some((reason) => reason.includes("EXECUTIVE-RUNTIME-CONTRACT")));
  });
});

test("missing Command Center fails closed", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { ok, snapshot } = await wake({
      root,
      loadCommandCenter: async () => {
        throw new Error("cc_unavailable");
      },
    });
    assert.equal(ok, false);
    assert.ok(snapshot.blocked_reasons.some((reason) => reason.includes("command_center")));
    assert.equal(snapshot.sources.outcome_join.observed, false);
  });
});

test("missing Outcome Join path fails closed", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const cc = commandCenterFixture();
    const v2 = cc.command_center_v2 as Record<string, unknown>;
    delete v2.phase4_outcome_capture_v1;
    const { ok, snapshot } = await wake({ root, cc });
    assert.equal(ok, false);
    assert.ok(snapshot.blocked_reasons.some((reason) => reason.includes("phase4_outcome_capture_v1")));
    assert.equal(snapshot.sources.outcome_join.observed, false);
  });
});

test("unreadable git HEAD fails closed", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { ok, snapshot } = await wake({
      root,
      readGitHead: () => {
        throw new Error("git missing");
      },
    });
    assert.equal(ok, false);
    assert.ok(snapshot.blocked_reasons.some((reason) => reason.includes("git_HEAD")));
    assert.equal(snapshot.head.honesty, "UNKNOWN");
  });
});

test("no dispatch occurs even when canonical dispatch_status is READY", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { snapshot } = await wake({ root });
    assert.equal(snapshot.sources.command_center.observed_canonical_dispatch_status, "READY");
    assert.equal(snapshot.dispatch_invoked, false);
    assert.equal(snapshot.dispatch_authority, false);
    assert.equal(snapshot.selected_work, null);
  });
});

test("no mutation occurs and no ODR is created", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { snapshot } = await wake({ root });
    assert.equal(snapshot.data_mutation, false);
    assert.equal(snapshot.mutation_authorized, false);
    assert.equal(snapshot.odr_created, false);
    assert.equal(snapshot.read_only, true);
  });
});

test("no NBA or steering authority exists", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { snapshot } = await wake({ root });
    assert.equal(snapshot.nba_authority, false);
    assert.equal(snapshot.steering_authority, false);
  });
});

test("Outcome Join is observed but cannot steer", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { snapshot } = await wake({ root });
    assert.equal(snapshot.sources.outcome_join.observed, true);
    assert.equal(snapshot.sources.outcome_join.cannot_steer, true);
    assert.equal(snapshot.sources.outcome_join.observed_steering_authority, false);
    assert.equal(snapshot.sources.outcome_join.observed_nba_authority, false);
    assert.equal(snapshot.sources.outcome_join.observed_handoff_from_confident_buy_count, "UNKNOWN");
    assert.equal(snapshot.selected_work, null);
    assert.equal(snapshot.nba_authority, false);
  });
});

test("current HEAD is recorded from git, not conversation memory", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const first = await wake({ root, sha: HEAD_A });
    const second = await wake({ root, sha: HEAD_B });
    assert.equal(first.snapshot.head.sha, HEAD_A);
    assert.equal(second.snapshot.head.sha, HEAD_B);
    assert.equal(first.snapshot.conversation_memory_used, false);
    assert.equal(second.snapshot.memory_is_not_head, true);
    assert.notEqual(first.snapshot.head.sha, second.snapshot.head.sha);
  });
});

test("HEAD vs HQ commit mismatch is recorded without inventing either", async () => {
  await withTempRoot(async (root) => {
    writeRequiredDocs(root);
    const { ok, snapshot } = await wake({ root, sha: HEAD_A });
    assert.equal(ok, true);
    assert.equal(snapshot.head_vs_hq.match, false);
    assert.equal(snapshot.head.sha, HEAD_A);
    assert.equal(snapshot.sources.hq_handoff.hq_recorded_commit_in_heading, "9944e32");
  });
});

test("source files do not dispatch, mutate, or upsert ODRs", () => {
  const lib = readFileSync(LIB_ABS, "utf8");
  const cli = readFileSync(CLI_ABS, "utf8");
  for (const src of [lib, cli]) {
    assert.equal(src.includes("writeFileSync"), false);
    assert.equal(src.includes("run-buckparts-command-center-dispatch"), false);
    assert.equal(src.includes("upsertOwnerDecisionRequest"), false);
    assert.equal(src.includes("nba_authority: true"), false);
    assert.equal(src.includes("steering_authority: true"), false);
  }
});
