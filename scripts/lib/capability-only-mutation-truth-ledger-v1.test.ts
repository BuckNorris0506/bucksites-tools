import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CAPABILITY_ONLY_TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
  recordCapabilityOnlyMutationTruthLedgerOutcomeV1,
} from "./capability-only-mutation-truth-ledger-v1";
import { TRUTH_LEDGER_V1_JSONL_REL_V1 } from "./truth-ledger-v1";

test("recordCapabilityOnlyMutationTruthLedgerOutcomeV1 appends capability-only blocked outcome", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cap-only-tl-"));
  const lines: string[] = [];
  try {
    const result = recordCapabilityOnlyMutationTruthLedgerOutcomeV1({
      rootDir: root,
      mutation_lane: "search_gaps_classify_v1",
      apply_outcome: "blocked",
      blockers: ["io_capability_read_index_cannot_mutate_supabase"],
      appendText: (_abs, line) => lines.push(line),
      mkdir: () => undefined,
    });
    assert.equal(result.ok, true);
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]!);
    assert.equal(parsed.mutation_lane, "search_gaps_classify_v1");
    assert.equal(parsed.founder_decision_id, null);
    assert.equal(parsed.apply_outcome, "blocked");
    assert.deepEqual(parsed.bound_artifacts_v1, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordCapabilityOnlyMutationTruthLedgerOutcomeV1 uses MUTATION io on write-intent", () => {
  assert.equal(CAPABILITY_ONLY_TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1, "MUTATION");
  const root = mkdtempSync(path.join(tmpdir(), "cap-only-tl-applied-"));
  try {
    const result = recordCapabilityOnlyMutationTruthLedgerOutcomeV1({
      rootDir: root,
      mutation_lane: "search_gap_candidates_generate_v1",
      apply_outcome: "applied",
      blockers: [],
    });
    assert.equal(result.ok, true);
    const text = readFileSync(path.join(root, TRUTH_LEDGER_V1_JSONL_REL_V1), "utf8").trim();
    const parsed = JSON.parse(text);
    assert.equal(parsed.apply_outcome, "applied");
    assert.equal(parsed.founder_decision_id, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("READ_INDEX injected recorder fails closed", () => {
  const root = mkdtempSync(path.join(tmpdir(), "cap-only-tl-read-index-"));
  try {
    const result = recordCapabilityOnlyMutationTruthLedgerOutcomeV1({
      rootDir: root,
      mutation_lane: "search_gaps_classify_v1",
      apply_outcome: "blocked",
      blockers: ["io_capability_read_index_cannot_mutate_supabase"],
      recordTruthLedger: (args) =>
        args.io_capability === "MUTATION"
          ? { ok: true }
          : { ok: false, blockers: ["truth_ledger_append_requires_mutation_capability"] },
    });
    assert.equal(result.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
