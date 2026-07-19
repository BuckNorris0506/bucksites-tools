/**
 * Deterministic sentinel-contract tests for Phase 2 operating-coherence validator.
 * Uses test-only BUCKPARTS_PHASE2_COHERENCE_INJECT seams; does not mutate review tree.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VALIDATOR = path.join(ROOT, "scripts/validate-buckparts-phase2-operating-coherence-v1.sh");

const PASS = "PHASE2_OPERATING_COHERENCE_PASS";
const FAIL = "PHASE2_OPERATING_COHERENCE_FAIL";

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
      BUCKPARTS_PHASE2_COHERENCE_INJECT: inject,
    },
    timeout: 120_000,
  });
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
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

test("sentinel pre_fingerprint_failure: nonzero, final FAIL once", () => {
  const r = runInject("pre_fingerprint_failure");
  assert.notEqual(r.status, 0);
  assert.ok((r.status ?? 0) > 0);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*unexpected command failure/);
});

test("sentinel focused_group_timeout: nonzero, final FAIL once", () => {
  const r = runInject("focused_group_timeout");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*timed out/);
});

test("sentinel nested_phase1_failure: nonzero, final FAIL once", () => {
  const r = runInject("nested_phase1_failure");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*nested phase1_bounded/);
});

test("sentinel final_fingerprint_failure: nonzero, final FAIL once", () => {
  const r = runInject("final_fingerprint_failure");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*final fingerprint verification failed/);
});

test("sentinel cleanup_failure: original fail preserved, FAIL last once", () => {
  const r = runInject("cleanup_failure");
  assert.equal(r.status, 1);
  assert.equal(r.lines[r.lines.length - 1], FAIL);
  assert.equal(countExact(r.lines, FAIL), 1);
  assert.equal(countExact(r.lines, PASS), 0);
  assert.match(r.stderr, /FAIL_REASON:.*injected failure before cleanup/);
  assert.ok(!r.stdout.includes(`${FAIL}\n`) || r.stdout.trimEnd().endsWith(FAIL));
});
