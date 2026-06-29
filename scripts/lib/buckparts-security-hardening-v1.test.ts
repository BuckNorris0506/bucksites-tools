import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  resolveDecisionPrecedenceV1,
  type DecisionSignalV1,
} from "./buckparts-decision-precedence-resolver-v1";
import {
  assertWriteAllowedForCapabilityV1,
  BuckpartsProtectedPathWriteError,
  createRepoIoV1,
  isProtectedMutationRelPathV1,
} from "./buckparts-io-capabilities-v1";
import {
  computeArtifactSha256FromTextV1,
  verifyArtifactSha256V1,
  verifyFounderDecisionArtifactBindingsV1,
  buildGuardedApplyTruthLedgerBlockersV1,
} from "./truth-ledger-v1";
import { buildGuardedCsvWriteModeBlockersV1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { resolveWinningRepoEvidenceVerdictV1 } from "./fridge-safe-link-evidence-precedence-v1";
import {
  BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
  writeBuckpartsExecutionLedgerArtifactsV1,
} from "./buckparts-execution-ledger-v1";
import { TRUTH_LEDGER_V1_APPEND_ONLY_JSONL_DEFERRED_V1 } from "../../src/lib/owner-dashboard/truth-ledger-v1";

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
    ...overrides,
  };
}

describe("security hardening v1", () => {
  test("decision precedence: DENY beats ALLOW", () => {
    const signals: DecisionSignalV1[] = [
      {
        dimension: "buy_link_gate",
        disposition: "ALLOW",
        source_contract: "test",
        reason: "csv_gate_pass",
      },
      {
        dimension: "evidence_freshness",
        disposition: "DENY",
        source_contract: "test",
        reason: "stale_evidence",
        homeowner_exposed: true,
      },
    ];
    const result = resolveDecisionPrecedenceV1(signals);
    assert.equal(result.effective_public_trust, "DENY");
    assert.equal(result.mutation_permitted, false);
    assert.equal(result.public_trust_current, false);
  });

  test("decision precedence: UNKNOWN fails closed for mutation", () => {
    const result = resolveDecisionPrecedenceV1([
      {
        dimension: "evidence_binding",
        disposition: "UNKNOWN",
        source_contract: "test",
        reason: "missing_winning_evidence",
      },
      {
        dimension: "buy_link_gate",
        disposition: "ALLOW",
        source_contract: "test",
        reason: "pass",
      },
    ]);
    assert.equal(result.effective_buyer_path_mutation, "UNKNOWN");
    assert.equal(result.mutation_permitted, false);
  });

  test("READ_INDEX cannot write protected retailer_links.csv", () => {
    assert.equal(isProtectedMutationRelPathV1("data/retailer_links.csv"), true);
    const root = mkdtempSync(path.join(tmpdir(), "bp-io-"));
    try {
      assert.throws(
        () =>
          assertWriteAllowedForCapabilityV1({
            capability: "READ_INDEX",
            relPath: path.join(root, "data/retailer_links.csv"),
            rootDir: root,
          }),
        BuckpartsProtectedPathWriteError,
      );
      const io = createRepoIoV1({ rootDir: root, capability: "READ_INDEX" });
      mkdirSync(path.join(root, "data/command-center"), { recursive: true });
      assert.doesNotThrow(() =>
        io.writeText("data/command-center/test.json", "{}\n"),
      );
      assert.throws(
        () => io.writeText("data/evidence/x.json", "{}\n"),
        BuckpartsProtectedPathWriteError,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("guarded apply write blockers include READ_INDEX capability", () => {
    const blockers = buildGuardedCsvWriteModeBlockersV1({
      writeCsvFlagPresent: true,
      readiness: { apply_executor_ready: true, executor_blockers: [] },
      beforeRowParityProven: true,
      writePlan: {
        ok: true,
        target_file: "data/retailer_links.csv",
        row_patches: [],
        rollback_patch_preview: [],
        target_row_indices: [],
      },
      io_capability: "READ_INDEX",
    });
    assert.ok(blockers.includes("io_capability_read_index_cannot_mutate_csv"));
  });

  test("truth ledger: artifact drift blocks verify", () => {
    const root = mkdtempSync(path.join(tmpdir(), "bp-tl-"));
    try {
      const rel = "data/evidence/test-evidence.json";
      mkdirSync(path.join(root, "data/evidence"), { recursive: true });
      writeFileSync(path.join(root, rel), '{"v":1}\n', "utf8");
      const hash = computeArtifactSha256FromTextV1('{"v":1}\n');
      assert.equal(
        verifyArtifactSha256V1({
          rootDir: root,
          artifact_rel_path: rel,
          expected_sha256: hash,
        }).ok,
        true,
      );
      writeFileSync(path.join(root, rel), '{"v":2}\n', "utf8");
      const drift = verifyArtifactSha256V1({
        rootDir: root,
        artifact_rel_path: rel,
        expected_sha256: hash,
      });
      assert.equal(drift.ok, false);
      if (!drift.ok) {
        assert.match(drift.reason, /truth_ledger_hash_mismatch/);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("founder approval without bound artifacts fails closed", () => {
    const row = minimalMutationApprovalRow();
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row,
      referenceTimeIso: "2026-06-10T00:00:00.000Z",
      rootDir: process.cwd(),
    });
    assert.equal(gate.ok, false);
    if (!gate.ok) {
      assert.ok(gate.blockers.includes("founder_approval_unbound_artifacts_v1"));
    }
  });

  test("founder approval with matching bound artifact passes gate", () => {
    const root = mkdtempSync(path.join(tmpdir(), "bp-founder-"));
    try {
      const rel = "data/fridge/batch-production/apply-plans/test-plan.json";
      const content = '{"plan":true}\n';
      mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      writeFileSync(path.join(root, rel), content, "utf8");
      const hash = computeArtifactSha256FromTextV1(content);
      const row = minimalMutationApprovalRow({
        bound_artifacts_v1: [
          {
            artifact_rel_path: rel,
            sha256_at_binding: hash,
            entry_type: "apply_plan",
          },
        ],
      });
      const gate = founderRegistryRowPassesMutationApprovalGateV1({
        row,
        referenceTimeIso: "2026-06-10T00:00:00.000Z",
        rootDir: root,
      });
      assert.equal(gate.ok, true);
      const blockers = buildGuardedApplyTruthLedgerBlockersV1({
        rootDir: root,
        artifacts: row.bound_artifacts_v1 ?? [],
        founderRow: row,
      });
      assert.equal(blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("evidence precedence excludes NO_SAFE before ranking", () => {
    const root = mkdtempSync(path.join(tmpdir(), "bp-ev-"));
    try {
      mkdirSync(path.join(root, "data/evidence"), { recursive: true });
      writeFileSync(
        path.join(root, "data/evidence/good.json"),
        JSON.stringify({
          verdict: "EXACT_PDP_PROVEN",
          generated_at: "2026-06-01",
        }),
        "utf8",
      );
      writeFileSync(
        path.join(root, "data/evidence/bad.json"),
        JSON.stringify({
          verdict: "NO_SAFE_PDP_FOUND",
          generated_at: "2026-06-10",
        }),
        "utf8",
      );
      const verdict = resolveWinningRepoEvidenceVerdictV1({
        rootDir: root,
        evidence_rel_paths: ["data/evidence/bad.json", "data/evidence/good.json"],
      });
      assert.equal(verdict.winning_rel_path, "data/evidence/good.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("truth ledger v1: append-only jsonl deferred with documented scope", () => {
    assert.equal(TRUTH_LEDGER_V1_APPEND_ONLY_JSONL_DEFERRED_V1.deferred, true);
    assert.ok(TRUTH_LEDGER_V1_APPEND_ONLY_JSONL_DEFERRED_V1.remains_unknown_without_jsonl.length > 0);
  });

  test("execution ledger write routes through READ_INDEX capability", () => {
    const root = mkdtempSync(path.join(tmpdir(), "bp-ledger-"));
    try {
      const { jsonRelPath } = writeBuckpartsExecutionLedgerArtifactsV1({
        rootDir: root,
        report: {
          contract: BUCKPARTS_EXECUTION_LEDGER_CONTRACT_V1,
          read_only: true,
          data_mutation: false,
          generated_at: "2026-06-01T00:00:00.000Z",
          source_command: "test",
          entries: [],
        } as never,
      });
      assert.ok(existsSync(path.join(root, jsonRelPath)));
      const io = createRepoIoV1({ rootDir: root, capability: "READ_INDEX" });
      assert.throws(
        () => io.writeText("data/retailer_links.csv", "x\n"),
        BuckpartsProtectedPathWriteError,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("mutation authorization sources use founder gate not active-approval-only check", () => {
    const repoRoot = process.cwd();
    const mutationFiles = [
      "scripts/lib/samsung-pass-repair-guarded-apply-v1.ts",
      "scripts/lib/universal-batch-lifecycle-mutation-authorization-review-v1.ts",
      "src/lib/owner-dashboard/owner-decision-queue-v1.ts",
    ];
    for (const rel of mutationFiles) {
      const text = readFileSync(path.join(repoRoot, rel), "utf8");
      assert.ok(
        text.includes("founderRegistryRowPassesMutationApprovalGateV1"),
        `${rel} must use founderRegistryRowPassesMutationApprovalGateV1`,
      );
      assert.equal(
        text.includes("isFounderRegistryRowActiveMutationApproval"),
        false,
        `${rel} must not authorize via isFounderRegistryRowActiveMutationApproval`,
      );
    }
  });
});
