import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildLearningOutcomesMutationPreflightV1,
  findActiveFounderDecisionForLearningOutcomesInsertV1,
  founderRowAuthorizesLearningOutcomesPlanV1,
  LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1,
  LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  LEARNING_OUTCOMES_MUTATION_GATE_REF_V1,
  LEARNING_OUTCOMES_PLAN_REL_V1,
  learningOutcomesMutationAuthorizedV1,
} from "./learning-outcomes-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-lo-fixture",
    source_queue_row_id: "queue-lo-fixture",
    source_decision_packet_id: "packet-lo-fixture",
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
  apply_plan_rel_paths?: string[];
}): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row: args.row,
    apply_context_target_slugs: [],
    apply_context_apply_plan_rel_paths: args.apply_plan_rel_paths ?? [],
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

function writeLearningOutcomesArtifacts(root: string, evidenceRel: string) {
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

describe("learning-outcomes-mutation-gate-v1", () => {
  test("dry_run does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "lo-gate-"));
    try {
      const preflight = buildLearningOutcomesMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(learningOutcomesMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, LEARNING_OUTCOMES_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "lo-gate-"));
    try {
      const evidenceRel = "data/evidence/lo-gate-evidence.json";
      writeLearningOutcomesArtifacts(root, evidenceRel);
      const preflight = buildLearningOutcomesMutationPreflightV1({
        rootDir: root,
        mode: "write",
        evidenceSourceRel: evidenceRel,
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(learningOutcomesMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.includes(LEARNING_OUTCOMES_IO_READ_INDEX_SUPABASE_BLOCKER_V1));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("valid MUTATION + trust + founder + artifacts authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "lo-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const evidenceRel = "data/evidence/lo-gate-evidence.json";
      const bound_artifacts_v1 = writeLearningOutcomesArtifacts(root, evidenceRel);
      const founderRows = [
        loadedRow({
          row: approvedRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [LEARNING_OUTCOMES_PLAN_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForLearningOutcomesInsertV1({
        rootDir: root,
        planRel: LEARNING_OUTCOMES_PLAN_REL_V1,
        artifactRelPaths: [LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1, evidenceRel],
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-lo-fixture");

      const preflight = buildLearningOutcomesMutationPreflightV1({
        rootDir: root,
        mode: "write",
        evidenceSourceRel: evidenceRel,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(learningOutcomesMutationAuthorizedV1(preflight), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("wrong apply plan rel path blocks", () => {
    const bound = bindArtifactsAtHashesV1({
      rootDir: mkdtempSync(path.join(tmpdir(), "lo-gate-plan-")),
      artifacts: [
        {
          artifact_rel_path: LEARNING_OUTCOMES_CONFIDENCE_APPROVALS_REL_V1,
          entry_type: "apply_plan",
        },
      ],
    });
    const root = mkdtempSync(path.join(tmpdir(), "lo-gate-plan2-"));
    try {
      assert.equal(
        founderRowAuthorizesLearningOutcomesPlanV1({
          planRel: LEARNING_OUTCOMES_PLAN_REL_V1,
          loaded: loadedRow({
            row: approvedRow({ bound_artifacts_v1: bound }),
            apply_plan_rel_paths: ["scripts/other.ts"],
          }),
        }),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
