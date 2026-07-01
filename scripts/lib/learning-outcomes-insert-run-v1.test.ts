import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { runLearningOutcomesGatedInsertV1 } from "./learning-outcomes-insert-run-v1";
import {
  LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1,
  LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  LEARNING_OUTCOMES_PLAN_REL_V1,
} from "./learning-outcomes-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1, loadTruthLedgerAppendEntriesV1 } from "./truth-ledger-v1";

function validInput() {
  return {
    slug: "mwf-replacement-filter",
    part_number: "MWF",
    model_number: null,
    candidate_url: "https://example.com/product/mwf",
    outcome: "pass" as const,
    reason: "fixture",
    reason_detail: null,
    evidence: { fixture: true },
    confidence: "exact" as const,
    cta_status: "live" as const,
    index_status: null,
  };
}

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-lo-run-fixture",
    source_queue_row_id: "queue-lo-run-fixture",
    source_decision_packet_id: "packet-lo-run-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve learning outcomes insert.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not insert unbound learning outcomes."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loadedRow(args: {
  row: FounderDecisionRegistryRowV1;
}): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row: args.row,
    apply_context_target_slugs: [],
    apply_context_apply_plan_rel_paths: [LEARNING_OUTCOMES_PLAN_REL_V1],
  };
}

function writeTrustCurrencyClearFixture(root: string, referenceTime: Date): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    JSON.stringify({
      contract: "truth_integrity_registry_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      findings: [
        {
          finding_id: "fixture-truth-integrity",
          finding_code: "FIXTURE",
          title: "Fixture finding",
          status: "OPEN",
          severity: "high",
          truth_surface: "buy_path",
          summary: "fixture",
          proven_gap: "fixture",
          false_safety_risk: "fixture",
          smallest_safe_fix: "fixture",
          re_audit: {
            next_re_audit_after: nextReAudit,
            last_re_audit_at: referenceTime.toISOString(),
            cadence_days: 30,
            re_audit_owner: "test",
          },
          validation_commands: { prove_gap: ["npm test"] },
        },
      ],
    }),
  );
}

function writeArtifacts(root: string, evidenceRel: string) {
  mkdirSync(path.join(root, path.dirname(evidenceRel)), { recursive: true });
  mkdirSync(path.join(root, "data/ops"), { recursive: true });
  mkdirSync(path.dirname(path.join(root, LEARNING_OUTCOMES_PLAN_REL_V1)), { recursive: true });
  writeFileSync(path.join(root, evidenceRel), JSON.stringify({ fixture: true }), "utf8");
  writeFileSync(
    path.join(root, LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1),
    JSON.stringify({ approvals: [] }),
    "utf8",
  );
  writeFileSync(
    path.join(root, LEARNING_OUTCOMES_PLAN_REL_V1),
    'export const learningOutcomesLane = "fixture";\n',
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1,
        entry_type: "apply_plan",
      },
      { artifact_rel_path: evidenceRel, entry_type: "apply_plan" },
      { artifact_rel_path: LEARNING_OUTCOMES_PLAN_REL_V1, entry_type: "apply_plan" },
    ],
  });
}

describe("learning-outcomes-insert-run-v1", () => {
  test("write intent without authorization blocks insert and appends ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "lo-run-blocked-"));
    try {
      const evidenceRel = "data/evidence/lo-run-evidence.json";
      writeArtifacts(root, evidenceRel);
      let insertCalls = 0;
      const result = await runLearningOutcomesGatedInsertV1({
        rootDir: root,
        writeIntent: true,
        input: validInput(),
        evidenceSourceRel: evidenceRel,
        io_capability: "READ_INDEX",
        founderRows: [],
        deps: {
          performInsert: async () => {
            insertCalls += 1;
          },
        },
      });
      assert.equal(insertCalls, 0);
      assert.equal(result.apply_status, "BLOCKED");
      assert.ok(
        result.mutation_preflight_blockers.includes(
          LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
        ),
      );
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.apply_outcome, "blocked");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("authorized write intent inserts once and appends applied ledger", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "lo-run-applied-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const evidenceRel = "data/evidence/lo-run-evidence.json";
      const bound_artifacts_v1 = writeArtifacts(root, evidenceRel);
      const founderRows = [loadedRow({ row: approvedRow({ bound_artifacts_v1 }) })];
      let insertCalls = 0;
      const result = await runLearningOutcomesGatedInsertV1({
        rootDir: root,
        writeIntent: true,
        input: validInput(),
        evidenceSourceRel: evidenceRel,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
        deps: {
          performInsert: async () => {
            insertCalls += 1;
          },
        },
      });
      assert.equal(insertCalls, 1);
      assert.equal(result.apply_status, "APPLIED");
      assert.equal(result.inserted_count, 1);
      const entries = loadTruthLedgerAppendEntriesV1({ rootDir: root });
      assert.equal(entries[0]!.apply_outcome, "applied");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
