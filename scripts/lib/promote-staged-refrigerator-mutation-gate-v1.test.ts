import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildPromoteStagedRefrigeratorMutationPreflightV1,
  findActiveFounderDecisionForPromoteStagedRefrigeratorPlanV1,
  founderRowAuthorizesPromoteStagedRefrigeratorPlanV1,
  PROMOTE_STAGED_REFRIGERATOR_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1,
  PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
  promoteStagedRefrigeratorMutationAuthorizedV1,
} from "./promote-staged-refrigerator-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function approvedPromoteRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-promote-staged-fixture",
    source_queue_row_id: "queue-promote-fixture",
    source_decision_packet_id: "packet-promote-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve promote staged refrigerator live catalog.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not promote other catalogs."],
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

function writeTrustCurrencyExpiredFixture(root: string): void {
  mkdirSync(path.join(root, "data/truth-integrity"), { recursive: true });
  writeFileSync(
    path.join(root, "data/truth-integrity/truth-integrity-registry-v1.json"),
    JSON.stringify({
      contract: "truth_integrity_registry_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      findings: [
        {
          finding_id: "test-finding",
          finding_code: "TEST",
          title: "Test",
          status: "OPEN",
          severity: "high",
          truth_surface: "buy_path",
          summary: "test",
          proven_gap: "test",
          false_safety_risk: "test",
          smallest_safe_fix: "test",
          re_audit: {
            next_re_audit_after: "2020-01-01T00:00:00.000Z",
            last_re_audit_at: null,
            cadence_days: 30,
            re_audit_owner: "test",
          },
          validation_commands: { prove_gap: ["npm test"] },
        },
      ],
    }),
  );
}

function writeBoundPromotePlanFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1),
    'export const promoteLane = "fixture";\n',
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
        entry_type: "apply_plan",
      },
    ],
  });
}

describe("promote-staged-refrigerator-mutation-gate-v1", () => {
  test("dry_run/default does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "write",
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes(PROMOTE_STAGED_REFRIGERATOR_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with MUTATION but no founder approval blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      writeTrustCurrencyClearFixture(root, new Date("2026-06-10T12:00:00.000Z"));
      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "write",
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with founder approval but failed trust blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      writeTrustCurrencyExpiredFixture(root);
      const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
      const founderRows = [
        loadedRow({
          row: approvedPromoteRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
        }),
      ];
      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "write",
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.some((b) => b.includes("trust_currency:")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("valid MUTATION + trust + founder fixture authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
      const founderRows = [
        loadedRow({
          row: approvedPromoteRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForPromoteStagedRefrigeratorPlanV1({
        rootDir: root,
        planRel: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-promote-staged-fixture");

      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "write",
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), true);
      assert.equal(preflight.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("wrong apply plan rel path blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      const active = findActiveFounderDecisionForPromoteStagedRefrigeratorPlanV1({
        rootDir: root,
        planRel: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows: [
          loadedRow({
            row: approvedPromoteRow(),
            apply_plan_rel_paths: ["scripts/other-promote.ts"],
          }),
        ],
      });
      assert.equal(active, null);
      assert.equal(
        founderRowAuthorizesPromoteStagedRefrigeratorPlanV1({
          planRel: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
          loaded: loadedRow({
            row: approvedPromoteRow(),
            apply_plan_rel_paths: ["scripts/other-promote.ts"],
          }),
        }),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("expired founder approval blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "promote-mutation-gate-"));
    try {
      writeTrustCurrencyClearFixture(root, new Date("2026-06-10T12:00:00.000Z"));
      const bound_artifacts_v1 = writeBoundPromotePlanFixture(root);
      const founderRows = [
        loadedRow({
          row: approvedPromoteRow({
            bound_artifacts_v1,
            expires_at: "2020-01-01T00:00:00.000Z",
          }),
          apply_plan_rel_paths: [PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForPromoteStagedRefrigeratorPlanV1({
        rootDir: root,
        planRel: PROMOTE_STAGED_REFRIGERATOR_PLAN_REL_V1,
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active, null);

      const preflight = buildPromoteStagedRefrigeratorMutationPreflightV1({
        rootDir: root,
        mode: "write",
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(promoteStagedRefrigeratorMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
