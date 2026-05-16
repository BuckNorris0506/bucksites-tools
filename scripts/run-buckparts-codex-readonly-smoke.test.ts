/**
 * BuckParts Codex read-only smoke runner tests — mocks subprocess execution only (never invokes real Codex).
 */

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_CODEX_READONLY_SMOKE_CONTRACT_V1,
  type BuckpartsCodexReadonlySmokeDeps,
  buildCodexReadonlySmokeSummaryV1,
  isGitStatusShortClean,
  runBuckpartsCodexReadonlySmokeMain,
  summarizeCodexExecJsonlStdout,
} from "./run-buckparts-codex-readonly-smoke.ts";

function smokeDeps(args: {
  repoRoot?: string;
  capturedFiles?: Map<string, string>;
  spawnCalls?: Array<{ cmd: string; args: readonly string[] }>;
  handlers: Array<(cmd: string, args: readonly string[]) => { status: number | null; stdout: string; stderr: string }>;
}): BuckpartsCodexReadonlySmokeDeps {
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

  return {
    spawnSync,
    mkdtempSync: () => path.join(mockTmpRoot, "buckparts-codex-readonly-smoke-XXXXXX"),
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
}

test("summarizeCodexExecJsonlStdout parses `.type` lines", () => {
  const stdout = ['{"type":"thread.started"}', '{"type":"foo"}', '{"type":"turn.completed"}'].join("\n");
  assert.deepEqual(summarizeCodexExecJsonlStdout(stdout), {
    event_count: 3,
    first_event: "thread.started",
    last_event: "turn.completed",
  });
});

test("summarizeCodexExecJsonlStdout ignores blank lines", () => {
  assert.deepEqual(summarizeCodexExecJsonlStdout("\n\n"), {
    event_count: 0,
    first_event: null,
    last_event: null,
  });
});

test("isGitStatusShortClean requires empty trimmed stdout", () => {
  assert.equal(isGitStatusShortClean(""), true);
  assert.equal(isGitStatusShortClean("   "), true);
  assert.equal(isGitStatusShortClean(" M foo"), false);
});

test("buildCodexReadonlySmokeSummaryV1 always marks Layer 6 founder approval NOT_PROVEN", () => {
  const s = buildCodexReadonlySmokeSummaryV1({
    finalMessagePath: "/tmp/f.txt",
    jsonlPath: "/tmp/e.jsonl",
    eventCount: 1,
    firstEvent: "a",
    lastEvent: "b",
    gitClean: true,
  });
  assert.equal(s.layer_6_founder_only_approval, "NOT_PROVEN");
});

test("happy path prints bounded summary JSON shape", () => {
  const capturedFiles = new Map<string, string>();
  const spawnCalls: Array<{ cmd: string; args: readonly string[] }> = [];

  const repoRoot = "/mock/repo";
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-readonly-smoke-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");
  const jsonlPath = path.join(tmpDir, "events.jsonl");

  const jsonlStdout = ['{"type":"thread.started"}', '{"type":"turn.completed"}'].join("\n");

  const deps = smokeDeps({
    repoRoot,
    capturedFiles,
    spawnCalls,
    handlers: [
      () => ({ status: 0, stdout: "codex-cli 0.130.0\n", stderr: "" }),
      () => ({ status: 0, stdout: "logged in\n", stderr: "" }),
      (cmd, args) => {
        assert.equal(cmd, "codex");
        assert.deepEqual(args.slice(0, 6), ["exec", "--cd", repoRoot, "--sandbox", "read-only", "--json"]);
        assert.equal(args[6], "-o");
        assert.equal(args[7], finalMessagePath);
        assert.ok(typeof args[8] === "string" && args[8].includes("package.json"));
        capturedFiles.set(finalMessagePath, "PROVEN: inspected package.json.\n");
        return { status: 0, stdout: jsonlStdout, stderr: "" };
      },
      () => ({ status: 0, stdout: "", stderr: "" }),
    ],
  });

  const { exitCode, stdout, stderr } = runBuckpartsCodexReadonlySmokeMain(deps, { repoRoot });

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  assert.equal(parsed.contract, BUCKPARTS_CODEX_READONLY_SMOKE_CONTRACT_V1);
  assert.equal(parsed.external_agent, "codex");
  assert.equal(parsed.external_agent_execution, "PROVEN_FOR_READ_ONLY_SMOKE");
  assert.equal(parsed.output_capture, "PROVEN_FOR_CODEX_JSONL_AND_FINAL_MESSAGE");
  assert.equal(parsed.sandbox, "read-only");
  assert.equal(parsed.final_message_path, finalMessagePath);
  assert.equal(parsed.jsonl_path, jsonlPath);
  assert.equal(parsed.event_count, 2);
  assert.equal(parsed.first_event, "thread.started");
  assert.equal(parsed.last_event, "turn.completed");
  assert.equal(parsed.git_status_clean, true);
  assert.equal(parsed.layer_6_founder_only_approval, "NOT_PROVEN");

  assert.deepEqual(spawnCalls.map((c) => c.cmd), ["codex", "codex", "codex", "git"]);
  assert.deepEqual(spawnCalls[3].args, ["status", "--short"]);
  assert.equal(capturedFiles.get(jsonlPath), jsonlStdout);
});

test("missing codex exits nonzero", () => {
  const deps = smokeDeps({
    handlers: [() => ({ status: 1, stdout: "", stderr: "not found" })],
  });
  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps);
  assert.equal(exitCode, 127);
});

test("codex login status failure exits nonzero", () => {
  const deps = smokeDeps({
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 1, stdout: "", stderr: "not logged in" }),
    ],
  });
  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps);
  assert.equal(exitCode, 1);
});

test("codex exec failure exits nonzero", () => {
  const deps = smokeDeps({
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 1, stdout: "", stderr: "exec failed" }),
    ],
  });
  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps);
  assert.equal(exitCode, 1);
});

test("dirty git status after smoke exits nonzero", () => {
  const capturedFiles = new Map<string, string>();
  const repoRoot = "/mock/repo";
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-readonly-smoke-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");

  const jsonlStdout = '{"type":"thread.started"}\n';

  const deps = smokeDeps({
    repoRoot,
    capturedFiles,
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => {
        capturedFiles.set(finalMessagePath, "ok\n");
        return { status: 0, stdout: jsonlStdout, stderr: "" };
      },
      () => ({ status: 0, stdout: " M file\n", stderr: "" }),
    ],
  });

  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps, { repoRoot });
  assert.equal(exitCode, 1);
});

test("empty final message file exits nonzero", () => {
  const capturedFiles = new Map<string, string>();
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-readonly-smoke-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");

  const deps = smokeDeps({
    capturedFiles,
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => {
        capturedFiles.set(finalMessagePath, "   ");
        return { status: 0, stdout: '{"type":"x"}\n', stderr: "" };
      },
    ],
  });

  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps);
  assert.equal(exitCode, 1);
});

test("empty codex exec JSONL stdout exits nonzero", () => {
  const capturedFiles = new Map<string, string>();
  const tmpDir = "/tmp/buckparts-mock/buckparts-codex-readonly-smoke-XXXXXX";
  const finalMessagePath = path.join(tmpDir, "final-message.txt");

  const deps = smokeDeps({
    capturedFiles,
    handlers: [
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => ({ status: 0, stdout: "ok", stderr: "" }),
      () => {
        capturedFiles.set(finalMessagePath, "ok\n");
        return { status: 0, stdout: "\n\n", stderr: "" };
      },
    ],
  });

  const { exitCode } = runBuckpartsCodexReadonlySmokeMain(deps);
  assert.equal(exitCode, 1);
});
