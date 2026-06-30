import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  appendTruthLedgerMutationEntryV1,
  buildGuardedApplyTruthLedgerBlockersV1,
  computeArtifactSha256FromTextV1,
  loadTruthLedgerAppendEntriesV1,
  recordTruthLedgerMutationOutcomeV1,
  TRUTH_LEDGER_CONTRACT_V1,
  TRUTH_LEDGER_V1_JSONL_REL_V1,
  verifyFounderDecisionArtifactBindingsV1,
  verifySourceSnapshotChainForEvidenceTextV1,
} from "./truth-ledger-v1";
import type { FounderDecisionRegistryRowV1 } from "./founder-decision-registry-v1";

function minimalMutationApprovalRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-test",
    source_queue_row_id: "q1",
    source_decision_packet_id: "decision_packet_v1:q1",
    decided_at: "2026-06-01T00:00:00.000Z",
    decision_status: "approved",
    owner_note: "test approval",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not mutate without evidence."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("truth-ledger-v1", () => {
  it("appendTruthLedgerMutationEntryV1 appends one JSONL line in temp dir", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tl-append-"));
    try {
      const result = appendTruthLedgerMutationEntryV1({
        rootDir: root,
        io_capability: "MUTATION",
        entry: {
          contract: TRUTH_LEDGER_CONTRACT_V1,
          entry_kind: "mutation_apply_outcome_v1",
          recorded_at: "2026-06-10T12:00:00.000Z",
          mutation_lane: "test_lane",
          founder_decision_id: "decision-test",
          apply_outcome: "applied",
          blockers: [],
          bound_artifacts_v1: [],
        },
      });
      assert.equal(result.ok, true);
      assert.ok(existsSync(path.join(root, TRUTH_LEDGER_V1_JSONL_REL_V1)));
      const lines = readFileSync(path.join(root, TRUTH_LEDGER_V1_JSONL_REL_V1), "utf8")
        .trim()
        .split("\n");
      assert.equal(lines.length, 1);
      const parsed = JSON.parse(lines[0]!);
      assert.equal(parsed.mutation_lane, "test_lane");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("READ_INDEX append fails closed", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tl-read-index-"));
    try {
      const result = appendTruthLedgerMutationEntryV1({
        rootDir: root,
        io_capability: "READ_INDEX",
        entry: {
          contract: TRUTH_LEDGER_CONTRACT_V1,
          entry_kind: "mutation_apply_outcome_v1",
          recorded_at: "2026-06-10T12:00:00.000Z",
          mutation_lane: "test_lane",
          founder_decision_id: null,
          apply_outcome: "blocked",
          blockers: ["test"],
          bound_artifacts_v1: [],
        },
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(result.blockers.includes("truth_ledger_append_requires_mutation_capability"));
      }
      assert.equal(existsSync(path.join(root, TRUTH_LEDGER_V1_JSONL_REL_V1)), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("second append adds line and loadTruthLedgerAppendEntriesV1 returns both", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tl-load-"));
    try {
      const base = {
        contract: TRUTH_LEDGER_CONTRACT_V1 as const,
        entry_kind: "mutation_apply_outcome_v1" as const,
        mutation_lane: "test_lane",
        founder_decision_id: null,
        blockers: [] as string[],
        bound_artifacts_v1: [] as [],
      };
      appendTruthLedgerMutationEntryV1({
        rootDir: root,
        io_capability: "MUTATION",
        entry: { ...base, recorded_at: "2026-06-10T12:00:00.000Z", apply_outcome: "applied" },
      });
      appendTruthLedgerMutationEntryV1({
        rootDir: root,
        io_capability: "MUTATION",
        entry: { ...base, recorded_at: "2026-06-10T12:01:00.000Z", apply_outcome: "blocked" },
      });
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries.length, 2);
      assert.equal(entries[0]!.apply_outcome, "applied");
      assert.equal(entries[1]!.apply_outcome, "blocked");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("verifySourceSnapshotChainForEvidenceTextV1 absent source_snapshot_v1 is OK", () => {
    const hash = computeArtifactSha256FromTextV1('{"claim":"fixture"}\n');
    const result = verifySourceSnapshotChainForEvidenceTextV1({
      evidenceText: '{"claim":"fixture"}\n',
      boundEvidenceSha256: hash,
    });
    assert.equal(result.ok, true);
  });

  it("verifySourceSnapshotChainForEvidenceTextV1 broken evidence_sha256 fails closed", () => {
    const evidenceText =
      '{"source_snapshot_v1":{"source_url":"https://example.com","retrieved_at":"2026-06-01T00:00:00.000Z","evidence_sha256":"deadbeef"}}\n';
    const hash = computeArtifactSha256FromTextV1(evidenceText);
    const result = verifySourceSnapshotChainForEvidenceTextV1({
      evidenceText,
      boundEvidenceSha256: hash,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.blockers.includes("truth_ledger_source_snapshot_chain_mismatch"));
    }
  });

  it("verifySourceSnapshotChainForEvidenceTextV1 matching chain is OK", () => {
    const bound = computeArtifactSha256FromTextV1('{"claim":"fixture"}\n');
    const evidenceText =
      JSON.stringify({
        claim: "fixture",
        source_snapshot_v1: {
          source_url: "https://example.com",
          retrieved_at: "2026-06-01T00:00:00.000Z",
          evidence_sha256: bound,
        },
      }) + "\n";
    const result = verifySourceSnapshotChainForEvidenceTextV1({
      evidenceText,
      boundEvidenceSha256: bound,
    });
    assert.equal(result.ok, true);
  });

  it("broken source_snapshot chain fails closed in founder binding verify", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tl-snapshot-"));
    try {
      const rel = "data/evidence/test-evidence.json";
      mkdirSync(path.join(root, "data/evidence"), { recursive: true });
      const evidenceText =
        '{"source_snapshot_v1":{"source_url":"https://example.com","retrieved_at":"2026-06-01T00:00:00.000Z","evidence_sha256":"deadbeef"}}\n';
      writeFileSync(path.join(root, rel), evidenceText, "utf8");
      const hash = computeArtifactSha256FromTextV1(evidenceText);
      const row = minimalMutationApprovalRow({
        bound_artifacts_v1: [
          { artifact_rel_path: rel, sha256_at_binding: hash, entry_type: "evidence" },
        ],
      });
      const verify = verifyFounderDecisionArtifactBindingsV1({ row, rootDir: root });
      assert.equal(verify.ok, false);
      if (!verify.ok) {
        assert.ok(
          verify.blockers.some((b) => b.includes("truth_ledger_source_snapshot_chain_mismatch")),
        );
      }
      const blockers = buildGuardedApplyTruthLedgerBlockersV1({
        rootDir: root,
        artifacts: row.bound_artifacts_v1!,
      });
      assert.ok(
        blockers.some((b) => b.includes("truth_ledger_source_snapshot_chain_mismatch")),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("recordTruthLedgerMutationOutcomeV1 writes apply outcome entry", () => {
    const root = mkdtempSync(path.join(tmpdir(), "tl-record-"));
    try {
      const result = recordTruthLedgerMutationOutcomeV1({
        rootDir: root,
        io_capability: "MUTATION",
        mutation_lane: "test_lane",
        founder_decision_id: "decision-test",
        apply_outcome: "applied",
        blockers: [],
        now: () => new Date("2026-06-10T12:00:00.000Z"),
      });
      assert.equal(result.ok, true);
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.apply_outcome, "applied");
      assert.equal(entries[0]!.recorded_at, "2026-06-10T12:00:00.000Z");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
