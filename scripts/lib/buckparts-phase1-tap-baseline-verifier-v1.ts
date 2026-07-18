/**
 * Structured TAP parser + baseline nine-failure verifier for Phase 1 acceptance.
 * Parses Node --test-reporter=tap output only (not Unicode spec reporter).
 */

export const BUCKPARTS_PHASE1_BASELINE_COMMIT_V1 =
  "04a1fdb40fc03ae30e8b1332c91e20f797e9d14f" as const;

/** Node test runner exits 1 when one or more tests fail (not crash/timeout). */
export const BUCKPARTS_PHASE1_BASELINE_EXPECTED_TEST_FAILURE_EXIT_CODE_V1 = 1 as const;

export type Phase1BaselineExpectedTestV1 = {
  id: string;
  name: string;
  /** Tokens that must all appear inside that test's TAP YAML diagnostic block. */
  signature_all: string[];
  note?: string;
};

export type Phase1BaselineSpecV1 = {
  contract: "buckparts_phase1_baseline_nine_failures_v1";
  baseline_commit: string;
  note?: string;
  tests: Phase1BaselineExpectedTestV1[];
};

export type TapSubtestResultV1 = {
  index: number;
  name: string;
  ok: boolean;
  diagnostic: string;
};

export type TapParseResultV1 = {
  tap_version: string | null;
  plan: string | null;
  plan_count: number | null;
  tests: TapSubtestResultV1[];
  summary: {
    tests: number | null;
    pass: number | null;
    fail: number | null;
    cancelled: number | null;
    skipped: number | null;
    todo: number | null;
  };
};

export type Phase1BaselineVerifyInputV1 = {
  tap_text: string;
  checkout_commit: string;
  child_exit_code: number;
  spec: Phase1BaselineSpecV1;
  /** When set, must equal BUCKPARTS_PHASE1_BASELINE_COMMIT_V1 / spec.baseline_commit. */
  expected_baseline_commit?: string;
  timed_out?: boolean;
  fingerprint_unchanged?: boolean;
};

export type Phase1BaselineVerifyResultV1 = {
  ok: boolean;
  reasons: string[];
  parsed: TapParseResultV1;
  checkout_commit: string;
  child_exit_code: number;
};

function parseSummaryCount(tap: string, label: string): number | null {
  const re = new RegExp(`^# ${label} (\\d+)\\s*$`, "m");
  const m = tap.match(re);
  return m ? Number(m[1]) : null;
}

/** Parse Node --test-reporter=tap text into structured subtests + summary. */
export function parseNodeTapReportV1(tapText: string): TapParseResultV1 {
  const lines = tapText.replace(/\r\n/g, "\n").split("\n");
  const tap_version = (lines.find((l) => /^TAP version\b/.test(l)) ?? null)?.replace(
    /^TAP version\s+/,
    "",
  ) ?? null;
  const planLine = lines.find((l) => /^1\.\.\d+\s*$/.test(l.trim())) ?? null;
  const plan = planLine?.trim() ?? null;
  const plan_count = plan ? Number(plan.slice(3)) : null;

  const tests: TapSubtestResultV1[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const m = line.match(/^(ok|not ok) (\d+) - (.*)$/);
    if (!m) {
      i += 1;
      continue;
    }
    const ok = m[1] === "ok";
    const index = Number(m[2]);
    const name = m[3]!.trim();
    i += 1;
    let diagnostic = "";
    if (i < lines.length && lines[i]!.trim() === "---") {
      i += 1;
      const diag: string[] = [];
      while (i < lines.length && lines[i]!.trim() !== "...") {
        diag.push(lines[i]!);
        i += 1;
      }
      if (i < lines.length && lines[i]!.trim() === "...") i += 1;
      diagnostic = diag.join("\n");
    }
    tests.push({ index, name, ok, diagnostic });
  }

  return {
    tap_version,
    plan,
    plan_count,
    tests,
    summary: {
      tests: parseSummaryCount(tapText, "tests"),
      pass: parseSummaryCount(tapText, "pass"),
      fail: parseSummaryCount(tapText, "fail"),
      cancelled: parseSummaryCount(tapText, "cancelled"),
      skipped: parseSummaryCount(tapText, "skipped"),
      todo: parseSummaryCount(tapText, "todo"),
    },
  };
}

export function verifyPhase1BaselineNineFailuresV1(
  input: Phase1BaselineVerifyInputV1,
): Phase1BaselineVerifyResultV1 {
  const reasons: string[] = [];
  const expectedCommit =
    input.expected_baseline_commit ??
    input.spec.baseline_commit ??
    BUCKPARTS_PHASE1_BASELINE_COMMIT_V1;
  const parsed = parseNodeTapReportV1(input.tap_text);

  if (input.timed_out === true) {
    reasons.push("baseline timed out");
  }
  if (input.fingerprint_unchanged === false) {
    reasons.push("fingerprint mismatch");
  }
  if (input.checkout_commit !== expectedCommit) {
    reasons.push(
      `checkout_commit=${input.checkout_commit} != expected=${expectedCommit}`,
    );
  }
  if (input.spec.baseline_commit !== expectedCommit) {
    reasons.push("baseline spec commit mismatch");
  }

  if (input.timed_out !== true) {
    if (input.child_exit_code !== BUCKPARTS_PHASE1_BASELINE_EXPECTED_TEST_FAILURE_EXIT_CODE_V1) {
      reasons.push(
        `child_exit_code=${String(input.child_exit_code)} want exactly ${String(BUCKPARTS_PHASE1_BASELINE_EXPECTED_TEST_FAILURE_EXIT_CODE_V1)} (test failures); other nonzero treated as crash`,
      );
    }
  }

  const wantN = input.spec.tests.length;
  if (parsed.plan_count !== wantN) {
    reasons.push(`TAP plan_count=${String(parsed.plan_count)} want ${String(wantN)}`);
  }
  const s = parsed.summary;
  const expectSummary: Array<[keyof typeof s, number]> = [
    ["tests", wantN],
    ["pass", 0],
    ["fail", wantN],
    ["cancelled", 0],
    ["skipped", 0],
    ["todo", 0],
  ];
  for (const [label, want] of expectSummary) {
    if (s[label] !== want) {
      reasons.push(`summary ${label}=${String(s[label])} want ${String(want)}`);
    }
  }

  if (parsed.tests.length !== wantN) {
    reasons.push(`parsed subtest count=${String(parsed.tests.length)} want ${String(wantN)}`);
  }

  const expectedNames = input.spec.tests.map((t) => t.name);
  const seenNames = parsed.tests.map((t) => t.name);
  const nameCounts = new Map<string, number>();
  for (const n of seenNames) nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);

  for (const n of seenNames) {
    if (!expectedNames.includes(n)) {
      reasons.push(`unexpected/extra test: ${n}`);
    }
  }
  for (const n of expectedNames) {
    const c = nameCounts.get(n) ?? 0;
    if (c === 0) reasons.push(`missing expected test: ${n}`);
    if (c > 1) reasons.push(`expected test appeared ${String(c)} times: ${n}`);
  }

  for (const t of parsed.tests) {
    if (t.ok) {
      reasons.push(`expected failure but test passed: ${t.name}`);
    }
  }

  for (const expected of input.spec.tests) {
    const hit = parsed.tests.find((t) => t.name === expected.name);
    if (!hit) continue;
    const diag = hit.diagnostic;
    for (const tok of expected.signature_all) {
      if (!diag.includes(tok)) {
        reasons.push(
          `signature mismatch for ${expected.id} (${expected.name}): missing ${JSON.stringify(tok)} in YAML diagnostic`,
        );
      }
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    parsed,
    checkout_commit: input.checkout_commit,
    child_exit_code: input.child_exit_code,
  };
}
