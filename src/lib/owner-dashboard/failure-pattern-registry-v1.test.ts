import assert from "node:assert/strict";
import test from "node:test";

import {
  FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1,
  FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1,
  buildFailurePatternRegistryReadModelFromSeededV1,
  buildFailurePatternRegistryReadModelV1,
  formatFailurePatternRegistryDigestMarkdownV1,
  formatFailurePatternRegistryInformationalLineV1,
  validateFailurePatternRegistryRowV1,
} from "./failure-pattern-registry-v1";

const minimalValid = {
  failure_id: "fixture_ok_row",
  title: "Fixture",
  status: "observed" as const,
  first_seen_context: "PROVEN: test fixture.",
  last_seen_at: "2026-05-08T12:00:00.000Z",
  observed_examples: ["PROVEN: example"],
  root_cause: "PROVEN: cause",
  correct_pattern: "PROVEN: fix",
  guardrail_paths: [],
  proof_status: "UNKNOWN" as const,
  remaining_risk: "UNKNOWN: residual.",
};

test("validateFailurePatternRegistryRowV1 accepts a minimal valid row", () => {
  const r = validateFailurePatternRegistryRowV1(minimalValid);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.row.failure_id, "fixture_ok_row");
});

test("validateFailurePatternRegistryRowV1 rejects invalid failure_id", () => {
  const r = validateFailurePatternRegistryRowV1({ ...minimalValid, failure_id: "Bad-Id" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.join(" "), /failure_id/);
});

test("validateFailurePatternRegistryRowV1 rejects guarded + PROVEN without guardrails", () => {
  const r = validateFailurePatternRegistryRowV1({
    ...minimalValid,
    status: "guarded",
    proof_status: "PROVEN",
    guardrail_paths: [],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.join(" "), /guardrail_paths/);
});

test("buildFailurePatternRegistryReadModelV1 counts statuses and unknown_guardrail", () => {
  const m = buildFailurePatternRegistryReadModelV1(
    [
      {
        ...minimalValid,
        failure_id: "a_observed",
        status: "observed",
        proof_status: "UNKNOWN",
        guardrail_paths: [],
      },
      {
        ...minimalValid,
        failure_id: "b_guarded",
        status: "guarded",
        proof_status: "PROVEN",
        guardrail_paths: ["docs/x.md"],
      },
      {
        ...minimalValid,
        failure_id: "c_recurring",
        status: "recurring",
        proof_status: "INFERRED",
        guardrail_paths: ["scripts/y.ts"],
      },
      {
        ...minimalValid,
        failure_id: "d_retired",
        status: "retired",
        proof_status: "PROVEN",
        guardrail_paths: [],
      },
      { not: "a row" },
      {
        ...minimalValid,
        failure_id: "dup",
        status: "observed",
        proof_status: "UNKNOWN",
        guardrail_paths: [],
      },
      {
        ...minimalValid,
        failure_id: "dup",
        status: "observed",
        proof_status: "UNKNOWN",
        guardrail_paths: [],
      },
    ],
    { generated_at: "2026-05-08T00:00:00.000Z" },
  );
  assert.equal(m.contract, FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1);
  assert.equal(m.read_only, true);
  assert.equal(m.data_mutation, false);
  assert.equal(m.informational_only, true);
  assert.equal(m.automation_input, false);
  assert.equal(m.guarded_count, 1);
  assert.equal(m.unguarded_count, 2);
  assert.equal(m.recurring_count, 1);
  assert.equal(m.unknown_guardrail_count, 2);
  assert.equal(m.rows.length, 5);
  assert.ok(m.proven_facts.some((f) => /failed validation/i.test(f)));
  assert.ok(m.proven_facts.some((f) => /Duplicate failure_id/i.test(f)));
});

test("seeded rows validate and npm_run_json_stdout_parse is guarded + PROVEN", () => {
  for (const row of FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1) {
    const v = validateFailurePatternRegistryRowV1(row);
    assert.equal(v.ok, true, v.ok ? "" : v.errors.join("; "));
  }
  const npm = FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1.find((r) => r.failure_id === "npm_run_json_stdout_parse");
  assert.ok(npm);
  assert.equal(npm!.status, "guarded");
  assert.equal(npm!.proof_status, "PROVEN");
  assert.deepEqual(npm!.guardrail_paths, [
    "docs/BuckParts-JSON-STDOUT-CONTRACT.md",
    "scripts/json-stdout-contract.test.ts",
  ]);
});

test("buildFailurePatternRegistryReadModelFromSeededV1 marks all seeded rows guarded with zero unknown_guardrail", () => {
  const m = buildFailurePatternRegistryReadModelFromSeededV1("2026-05-08T00:00:00.000Z");
  assert.equal(m.rows.length, FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1.length);
  assert.equal(m.guarded_count, FAILURE_PATTERN_REGISTRY_SEEDED_ROWS_V1.length);
  assert.equal(m.unguarded_count, 0);
  assert.equal(m.recurring_count, 0);
  assert.equal(m.unknown_guardrail_count, 0);
});

test("formatFailurePatternRegistryInformationalLineV1 includes guarded and unguarded phrase", () => {
  const m = buildFailurePatternRegistryReadModelFromSeededV1("t");
  const line = formatFailurePatternRegistryInformationalLineV1(m);
  assert.match(line, /Failure Pattern Registry: \d+ guarded, \d+ unguarded; informational only\./);
});

test("formatFailurePatternRegistryDigestMarkdownV1 cites contract and seeded ids", () => {
  const md = formatFailurePatternRegistryDigestMarkdownV1(buildFailurePatternRegistryReadModelFromSeededV1("t"));
  assert.match(md, new RegExp(FAILURE_PATTERN_REGISTRY_READ_MODEL_CONTRACT_V1));
  assert.match(md, /npm_run_json_stdout_parse/);
  assert.match(md, /informational only/i);
});
