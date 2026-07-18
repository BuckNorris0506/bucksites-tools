/**
 * Deterministic sentinel-contract tests for Phase 1 Round 2 bounded validator.
 * Uses test-only BUCKPARTS_PHASE1_BOUNDED_INJECT seams; does not mutate review tree.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDATOR = path.join(ROOT, "scripts/validate-buckparts-phase1-round2-bounded-v1.sh");

const PASS = "PHASE1_ROUND2_BOUNDED_PASS";
const FAIL = "PHASE1_ROUND2_BOUNDED_FAIL";

function runInject(inject: string): {
  status: number | null;
  stdout: string;
  stderr: string;
  lines: string[];
} {
  const res = spawnSync("bash", [VALIDATOR], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      BUCKPARTS_PHASE1_BOUNDED_INJECT: inject,
    },
    timeout: 120_000,
  });
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
  // drop trailing empty line from final newline
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return {
    status: res.status,
    stdout,
    stderr,
    lines,
  };
}

function countExact(lines: string[], token: string): number {
  return lines.filter((l) => l === token).length;
}

test("sentinel success_short: exit 0, final PASS once", () => {
  const r = runInject("success_short");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.equal(r.lines[r.lines.length - 1], PASS);
  assert.equal(countExact(r.lines, PASS), 1);
  assert.equal(countExact(r.lines, FAIL), 0);
});

test("sentinel pre_group_failure: nonzero, final FAIL once", () => {
  const r = runInject("pre_group_failure");
  assert.notEqual(r.status, 0);
  assert.ok((r.status ?? 0) > 0);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*unexpected command failure/);
});

test("sentinel group_timeout: nonzero, final FAIL once", () => {
  const r = runInject("group_timeout");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*timed out/);
});

test("sentinel cleanup_failure: original fail preserved, FAIL last once", () => {
  const r = runInject("cleanup_failure");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*injected failure before cleanup/);
  // Cleanup must not append text after the sentinel.
  assert.ok(!r.stdout.includes(`${FAIL}\n`) || r.stdout.trimEnd().endsWith(FAIL));
});
