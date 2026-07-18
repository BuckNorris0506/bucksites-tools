/**
 * Deterministic adversarial tests for the Phase 1 baseline TAP verifier.
 * Each case must fail closed.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_PHASE1_BASELINE_COMMIT_V1,
  BUCKPARTS_PHASE1_BASELINE_EXPECTED_TEST_FAILURE_EXIT_CODE_V1,
  parseNodeTapReportV1,
  verifyPhase1BaselineNineFailuresV1,
  type Phase1BaselineSpecV1,
} from "./buckparts-phase1-tap-baseline-verifier-v1";
import {
  buildPhase1FingerprintV1,
  comparePhase1FingerprintsV1,
} from "./buckparts-phase1-fingerprint-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SPEC: Phase1BaselineSpecV1 = JSON.parse(
  readFileSync(path.join(ROOT, "scripts/lib/buckparts-phase1-baseline-nine-failures-v1.json"), "utf8"),
);

function diagFor(name: string): string {
  const t = SPEC.tests.find((x) => x.name === name);
  const sigs = t?.signature_all ?? ["actual: 'UNEXPECTED'", "expected: 'NONE'"];
  return [
    "duration_ms: 1",
    "type: 'test'",
    "failureType: 'testCodeFailure'",
    "error: |-",
    "  AssertionError",
    ...sigs.map((s) => `  ${s}`),
    "code: 'ERR_ASSERTION'",
    "name: 'AssertionError'",
  ].join("\n");
}

function buildTap(opts: {
  names?: string[];
  passNames?: Set<string>;
  mutateDiag?: (name: string, diag: string) => string;
  omitPlan?: boolean;
}): string {
  const names = opts.names ?? SPEC.tests.map((t) => t.name);
  const passNames = opts.passNames ?? new Set<string>();
  const parts: string[] = ["TAP version 13"];
  names.forEach((name, i) => {
    const ok = passNames.has(name);
    parts.push(`# Subtest: ${name}`);
    parts.push(`${ok ? "ok" : "not ok"} ${i + 1} - ${name}`);
    parts.push("  ---");
    const diag = opts.mutateDiag?.(name, diagFor(name)) ?? diagFor(name);
    for (const line of diag.split("\n")) parts.push(`  ${line}`);
    parts.push("  ...");
  });
  if (!opts.omitPlan) parts.push(`1..${names.length}`);
  const fail = names.filter((n) => !passNames.has(n)).length;
  const pass = names.length - fail;
  parts.push(`# tests ${names.length}`);
  parts.push("# suites 0");
  parts.push(`# pass ${pass}`);
  parts.push(`# fail ${fail}`);
  parts.push("# cancelled 0");
  parts.push("# skipped 0");
  parts.push("# todo 0");
  parts.push("# duration_ms 1");
  return parts.join("\n") + "\n";
}

function verify(tap: string, overrides: Partial<Parameters<typeof verifyPhase1BaselineNineFailuresV1>[0]> = {}) {
  return verifyPhase1BaselineNineFailuresV1({
    tap_text: tap,
    checkout_commit: BUCKPARTS_PHASE1_BASELINE_COMMIT_V1,
    child_exit_code: BUCKPARTS_PHASE1_BASELINE_EXPECTED_TEST_FAILURE_EXIT_CODE_V1,
    spec: SPEC,
    fingerprint_unchanged: true,
    timed_out: false,
    ...overrides,
  });
}

test("TAP parser extracts plan, summary, and YAML diagnostics", () => {
  const tap = buildTap({});
  const parsed = parseNodeTapReportV1(tap);
  assert.equal(parsed.plan_count, 9);
  assert.equal(parsed.summary.fail, 9);
  assert.equal(parsed.tests.length, 9);
  assert.equal(parsed.tests[0]!.ok, false);
  assert.ok(parsed.tests[0]!.diagnostic.includes("UNKNOWN_PARSE_ERROR"));
});

test("baseline verifier PASS on canonical synthetic TAP", () => {
  const r = verify(buildTap({}));
  assert.equal(r.ok, true, r.reasons.join("; "));
});

test("adversarial: one expected test passes → fail closed", () => {
  const passNames = new Set([SPEC.tests[0]!.name]);
  const r = verify(buildTap({ passNames }));
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("expected failure but test passed")));
});

test("adversarial: one test missing → fail closed", () => {
  const names = SPEC.tests.map((t) => t.name).slice(0, 8);
  const r = verify(buildTap({ names }));
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("missing expected test")));
});

test("adversarial: one extra test → fail closed", () => {
  const names = [...SPEC.tests.map((t) => t.name), "unexpected extra test"];
  const r = verify(buildTap({ names }));
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("unexpected/extra test")));
});

test("adversarial: changed diagnostic signature → fail closed", () => {
  const r = verify(
    buildTap({
      mutateDiag: (name, diag) =>
        name.includes("owner_decisions")
          ? diag.replace("UNKNOWN_PARSE_ERROR", "SOMETHING_ELSE")
          : diag,
    }),
  );
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("signature mismatch")));
});

test("adversarial: wrong baseline SHA → fail closed", () => {
  const r = verify(buildTap({}), { checkout_commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("checkout_commit=")));
});

test("adversarial: timeout result → fail closed", () => {
  const r = verify(buildTap({}), { timed_out: true, child_exit_code: 124 });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("timed out")));
});

test("adversarial: child crash / unexpected exit code → fail closed", () => {
  const r = verify(buildTap({}), { child_exit_code: 139 });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("child_exit_code=139")));
});

test("adversarial: fingerprint mismatch → fail closed", () => {
  const r = verify(buildTap({}), { fingerprint_unchanged: false });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("fingerprint mismatch")));
});

test("fingerprint helper hashes required surfaces deterministically", () => {
  const a = buildPhase1FingerprintV1(ROOT);
  const b = buildPhase1FingerprintV1(ROOT);
  assert.equal(a.porcelain_sha, b.porcelain_sha);
  assert.equal(a.execution_ledger_sha, b.execution_ledger_sha);
  assert.ok(a.surfaces["ignored:.next"]);
  assert.ok(a.surfaces["generated:data/command-center/dispatch-runs"]);
  const cmp = comparePhase1FingerprintsV1(a, b);
  assert.equal(cmp.unchanged, true);
});

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function withBinaryFingerprintRepo(
  fn: (repo: string, binaryRel: string) => void,
): void {
  const repo = mkdtempSync(path.join(tmpdir(), "bp-p1-fp-bin-"));
  try {
    git(repo, ["init"]);
    git(repo, ["config", "user.email", "fp-test@example.com"]);
    git(repo, ["config", "user.name", "fp-test"]);
    mkdirSync(path.join(repo, "bin"), { recursive: true });
    const binaryRel = "bin/sample.bin";
    // Non-text payload with NUL bytes (triggers binary diff handling).
    writeFileSync(path.join(repo, binaryRel), Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x00, 0x41]));
    writeFileSync(path.join(repo, "readme.txt"), "seed\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "seed"]);
    fn(repo, binaryRel);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

test("binary tracked-file modification changes tracked fingerprint", () => {
  withBinaryFingerprintRepo((repo, binaryRel) => {
    const before = buildPhase1FingerprintV1(repo);
    writeFileSync(
      path.join(repo, binaryRel),
      Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x00, 0x42, 0x99]),
    );
    const after = buildPhase1FingerprintV1(repo);
    assert.notEqual(after.tracked_diff_sha, before.tracked_diff_sha);
    assert.equal(after.staged_diff_sha, before.staged_diff_sha);
  });
});

test("binary staged-file modification changes staged fingerprint", () => {
  withBinaryFingerprintRepo((repo, binaryRel) => {
    const before = buildPhase1FingerprintV1(repo);
    writeFileSync(
      path.join(repo, binaryRel),
      Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x00, 0x43, 0xaa]),
    );
    git(repo, ["add", binaryRel]);
    const after = buildPhase1FingerprintV1(repo);
    assert.notEqual(after.staged_diff_sha, before.staged_diff_sha);
    // Staged binary change is also visible vs HEAD in --cached --binary.
    assert.ok(after.staged_diff_sha.length === 64);
  });
});

test("unchanged binary files produce identical fingerprints", () => {
  withBinaryFingerprintRepo((repo) => {
    const a = buildPhase1FingerprintV1(repo);
    const b = buildPhase1FingerprintV1(repo);
    assert.equal(a.tracked_diff_sha, b.tracked_diff_sha);
    assert.equal(a.staged_diff_sha, b.staged_diff_sha);
    assert.equal(comparePhase1FingerprintsV1(a, b).unchanged, true);
  });
});
