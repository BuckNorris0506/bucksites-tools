/**
 * Codex next-execution-packet runner tests — mocks snapshot + subprocesses (never invokes real Codex).
 */

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { FounderExecutionPacketV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import { buildFounderExecutionPacketsV1 } from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import type { FounderActionQueueRowV1 } from "../src/lib/owner-dashboard/founder-action-queue-v1";
import type { NextExecutionPacketSnapshotV1 } from "./lib/buckparts-next-execution-packet";
import type { BuckpartsCodexReadonlySmokeDeps } from "./run-buckparts-codex-readonly-smoke.ts";
import {
  BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1,
  type BuckpartsCodexNextExecutionPacketDeps,
  buildCodexPromptForNextExecutionPacketV1,
  buildNoPacketSummaryV1,
  buildPassSummaryV1,
  runBuckpartsCodexNextExecutionPacketMain,
} from "./run-buckparts-codex-next-execution-packet.ts";

const PROHIB_FROM_PACKET = "Do not write to Supabase or run SQL that mutates database state.";

function mockPacket(overrides?: Partial<FounderExecutionPacketV1>): FounderExecutionPacketV1 {
  return {
    id: "execution_packet_v1:queue-test-row",
    source_queue_row_id: "queue-test-row",
    title: "Test read-only packet",
    recommended_actor: "agent",
    mutation_authority: "read_only",
    status: "agent_safe",
    packet_kind: "agent_read_only_delegate_v1",
    copy_paste_prompt: `## OBJECTIVE\nExecute scope.\n\n## PROHIBITED ACTIONS\n1. ${PROHIB_FROM_PACKET}\n`,
    validation_command: "npm run lint",
    acceptance_criteria: ["criterion"],
    prohibited_actions: [PROHIB_FROM_PACKET],
    evidence_basis: "mock",
    ...overrides,
  };
}

function minimalSnapshot(overrides: Partial<NextExecutionPacketSnapshotV1>): NextExecutionPacketSnapshotV1 {
  const base = {
    command_center_ok: true,
    generated_at: "2026-05-15T12:00:00.000Z",
    source: "buckparts-next-execution-packet",
    queue: { contract: "founder_action_queue_v1", rows: [] },
    execution: {
      contract: "founder_execution_packet_v1",
      read_only: true as const,
      data_mutation: false as const,
      packets: [],
      skipped_rows: [],
    },
    next_packet: null,
    first_needs_owner_title: null,
  } as unknown as NextExecutionPacketSnapshotV1;
  return { ...base, ...overrides };
}

function packetDeps(args: {
  repoRoot?: string;
  snapshot: NextExecutionPacketSnapshotV1 | Promise<NextExecutionPacketSnapshotV1>;
  capturedFiles?: Map<string, string>;
  spawnCalls?: Array<{ cmd: string; args: readonly string[] }>;
  handlers: Array<(cmd: string, args: readonly string[]) => { status: number | null; stdout: string; stderr: string }>;
}): BuckpartsCodexNextExecutionPacketDeps {
  const capturedFiles = args.capturedFiles ?? new Map<string, string>();
  let idx = 0;

  const spawnSync = (
    command: string,
    spawnArgs: readonly string[],
    _options?: { cwd?: string; encoding?: "utf8" },
  ) => {
    args.spawnCalls?.push({ cmd: command, args: [...spawnArgs] });
    const fn = args.handlers[idx];
    idx += 1;
    assert.ok(fn, `unexpected spawnSync call #${idx}: ${command} ${spawnArgs.join(" ")}`);
    return fn(command, spawnArgs);
  };

  const mockTmpRoot = "/tmp/buckparts-mock";

  const smokeDeps: BuckpartsCodexReadonlySmokeDeps = {
    spawnSync,
    mkdtempSync: () => path.join(mockTmpRoot, "buckparts-codex-next-execution-packet-XXXXXX"),
    join: path.join,
    tmpdir: () => mockTmpRoot,
    readFileSync: (p: string, enc?: BufferEncoding) => {
      const v = capturedFiles.get(p);
      if (typeof v !== "string") {
        throw new Error(`ENOENT mock readFileSync ${p}`);
      }
      return enc === "utf8" ? v : v;
    },
    writeFileSync: (p: string, data: string) => {
      capturedFiles.set(p, data);
    },
    cwd: () => args.repoRoot ?? "/mock/repo",
  };

  return {
    ...smokeDeps,
    buildSnapshot: async () => args.snapshot,
  };
}

const agentSafeRow: FounderActionQueueRowV1 = {
  id: "queue-amazon-agent",
  title: "Amazon rescue · read-only agent work",
  status: "agent_safe",
  owner_burden: "medium",
  recommended_actor: "agent",
  mutation_authority: "read_only",
  evidence_basis: "fixture",
  next_action: "Run read-only queue audit.",
};

function realPacketFromBuilder(): FounderExecutionPacketV1 {
  const m = buildFounderExecutionPacketsV1([agentSafeRow], { source: "codex_test" });
  assert.equal(m.packets.length, 1);
  return m.packets[0]!;
}

test("buildCodexPromptForNextExecutionPacketV1 includes wrapper constraints and packet copy_paste_prompt", () => {
  const p = mockPacket();
  const full = buildCodexPromptForNextExecutionPacketV1(p);
  assert.ok(full.includes("Do not create git commits."), "wrapper requires no commits");
  assert.ok(full.includes(PROHIB_FROM_PACKET), "includes prohibited line echoed from packet prompt");
  assert.ok(full.includes("## OBJECTIVE"), "includes packet body");
  assert.match(
    full,
    /Do \*\*not\*\* run writable validation commands inside this read-only sandbox/i,
    "wrapper bans lint/build/operator-proof inside sandbox",
  );
  const real = realPacketFromBuilder();
  const fullReal = buildCodexPromptForNextExecutionPacketV1(real);
  assert.match(fullReal, /EXTERNAL REPO VALIDATION BUNDLE/, "real packet embeds external validation section");
});

test("buildNoPacketSummaryV1 pins Layer 6 NOT_PROVEN", () => {
  const s = buildNoPacketSummaryV1();
  assert.equal(s.contract, BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1);
  assert.equal(s.overall_status, "NO_PACKET");
  assert.equal(s.codex_executed, false);
  assert.equal(s.layer_6_founder_only_approval, "NOT_PROVEN");
});

test("buildPassSummaryV1 pins Layer 6 NOT_PROVEN", () => {
  const p = mockPacket();
  const s = buildPassSummaryV1({
    packet: p,
    finalMessagePath: "/a/f.txt",
    jsonlPath: "/a/e.jsonl",
    eventCount: 3,
    firstEvent: "thread.started",
    lastEvent: "turn.completed",
    gitClean: true,
  });
  assert.equal(s.overall_status, "PASS");
  assert.equal(s.layer_6_founder_only_approval, "NOT_PROVEN");
});

test("NO_PACKET exits 0 with JSON and never calls Codex", async () => {
  const spawnCalls: Array<{ cmd: string; args: readonly string[] }> = [];
  const deps = packetDeps({
    snapshot: minimalSnapshot({ next_packet: null }),
    spawnCalls,
    handlers: [],
  });
  const { exitCode, stdout, stderr } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 0);
  assert.equal(stderr, "");
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  assert.equal(parsed.contract, BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1);
  assert.equal(parsed.overall_status, "NO_PACKET");
  assert.equal(parsed.codex_executed, false);
  assert.equal(parsed.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.deepEqual(spawnCalls, []);
});

test("command_center_ok false exits 1 without Codex", async () => {
  const spawnCalls: Array<{ cmd: string; args: readonly string[] }> = [];
  const deps = packetDeps({
    snapshot: minimalSnapshot({ command_center_ok: false, next_packet: mockPacket() }),
    spawnCalls,
    handlers: [],
  });
  const { exitCode, stderr } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 1);
  assert.ok(stderr.includes("Command Center"));
  assert.deepEqual(spawnCalls, []);
});

test("packet builder rejection exits 1", async () => {
  const deps: BuckpartsCodexNextExecutionPacketDeps = {
    ...packetDeps({
      snapshot: minimalSnapshot({}),
      handlers: [],
    }),
    buildSnapshot: async () => {
      throw new Error("snapshot boom");
    },
  };
  const { exitCode, stderr } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 1);
  assert.ok(stderr.includes("buildNextExecutionPacketSnapshotV1 threw"));
});

test("happy path executes Codex with packet prompt and PASS summary shape", async () => {
  const capturedFiles = new Map<string, string>();
  const spawnCalls: Array<{ cmd: string; args: readonly string[] }> = [];
  const repoRoot = "/mock/repo";
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-next-execution-packet-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");
  const jsonlPath = path.join(tmpDir, "events.jsonl");
  const pkt = mockPacket();
  const jsonlStdout = ['{"type":"thread.started"}', '{"type":"turn.completed"}'].join("\n");

  const deps = packetDeps({
    repoRoot,
    snapshot: minimalSnapshot({ next_packet: pkt }),
    capturedFiles,
    spawnCalls,
    handlers: [
      () => ({ status: 0, stdout: "codex-cli\n", stderr: "" }),
      () => ({ status: 0, stdout: "ok\n", stderr: "" }),
      (_cmd, args) => {
        const prompt = args[8];
        assert.ok(typeof prompt === "string");
        assert.ok(prompt.includes(PROHIB_FROM_PACKET), "Codex prompt carries packet prohibited line");
        assert.ok(prompt.includes("Do not create git commits."), "Codex prompt carries wrapper commit ban");
        assert.ok(prompt.includes(pkt.copy_paste_prompt), "Codex prompt embeds copy_paste_prompt");
        capturedFiles.set(finalMessagePath, "Structured findings OK.\n");
        return { status: 0, stdout: jsonlStdout, stderr: "" };
      },
      () => ({ status: 0, stdout: "", stderr: "" }),
    ],
  });

  const { exitCode, stdout, stderr } = await runBuckpartsCodexNextExecutionPacketMain(deps, { repoRoot });

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  assert.equal(parsed.contract, BUCKPARTS_CODEX_NEXT_EXECUTION_PACKET_CONTRACT_V1);
  assert.equal(parsed.overall_status, "PASS");
  assert.equal(parsed.codex_executed, true);
  assert.equal(parsed.external_agent_execution, "PROVEN_FOR_READ_ONLY_EXECUTION_PACKET");
  assert.equal(parsed.output_capture, "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE");
  assert.equal(parsed.source_packet_id, pkt.id);
  assert.equal(parsed.source_queue_row_id, pkt.source_queue_row_id);
  assert.equal(parsed.source_packet_title, pkt.title);
  assert.equal(parsed.layer_6_founder_only_approval, "NOT_PROVEN");
  assert.deepEqual(spawnCalls.map((c) => c.cmd), ["codex", "codex", "codex", "git"]);
});

test("missing codex exits nonzero when packet exists", async () => {
  const deps = packetDeps({
    snapshot: minimalSnapshot({ next_packet: mockPacket() }),
    handlers: [() => ({ status: 1, stdout: "", stderr: "no codex" })],
  });
  const { exitCode } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 127);
});

test("codex login failure exits nonzero when packet exists", async () => {
  const deps = packetDeps({
    snapshot: minimalSnapshot({ next_packet: mockPacket() }),
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 1, stdout: "", stderr: "auth" }),
    ],
  });
  const { exitCode } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 1);
});

test("codex exec failure exits nonzero when packet exists", async () => {
  const deps = packetDeps({
    snapshot: minimalSnapshot({ next_packet: mockPacket() }),
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 1, stdout: "", stderr: "exec died" }),
    ],
  });
  const { exitCode } = await runBuckpartsCodexNextExecutionPacketMain(deps);
  assert.equal(exitCode, 1);
});

test("dirty git after Codex exits nonzero when packet exists", async () => {
  const capturedFiles = new Map<string, string>();
  const repoRoot = "/mock/repo";
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-next-execution-packet-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");

  const deps = packetDeps({
    repoRoot,
    snapshot: minimalSnapshot({ next_packet: mockPacket() }),
    capturedFiles,
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => {
        capturedFiles.set(finalMessagePath, "ok\n");
        return { status: 0, stdout: '{"type":"thread.started"}\n', stderr: "" };
      },
      () => ({ status: 0, stdout: " M dirty\n", stderr: "" }),
    ],
  });

  const { exitCode } = await runBuckpartsCodexNextExecutionPacketMain(deps, { repoRoot });
  assert.equal(exitCode, 1);
});
