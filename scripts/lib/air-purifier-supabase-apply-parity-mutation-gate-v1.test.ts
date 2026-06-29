import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  AP_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  apSupabaseParityMutationAuthorizedV1,
  buildApSupabaseParityMutationPreflightV1,
  findActiveFounderDecisionForApSupabaseParityPlanV1,
  founderRowAuthorizesApSupabaseParityPlanV1,
  type ApSupabaseParityMutationGatePlanV1,
} from "./air-purifier-supabase-apply-parity-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

const FIXTURE_PLAN_REL =
  "data/air-purifier/batch-production/apply-plans/fixture/ap-apply-plan-fixture-v1.json";

function minimalApPlan(slug: string): ApSupabaseParityMutationGatePlanV1 {
  return {
    planned_changes: [
      {
        filter_slug: slug,
      },
    ],
  };
}

function approvedApRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-ap-supabase-fixture",
    source_queue_row_id: "queue-ap-fixture",
    source_decision_packet_id: "packet-ap-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve AP Supabase parity apply.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not apply other slugs."],
    ...overrides,
  };
}

function loadedRow(args: {
  row: FounderDecisionRegistryRowV1;
  target_slugs?: string[];
  apply_plan_rel_paths?: string[];
}): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row: args.row,
    apply_context_target_slugs: args.target_slugs ?? [],
    apply_context_apply_plan_rel_paths: args.apply_plan_rel_paths ?? [],
  };
}

describe("air-purifier-supabase-apply-parity-mutation-gate-v1", () => {
  test("apply without founder row is blocked", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
      const preflight = buildApSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(apSupabaseParityMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("founder row with wrong apply_plan_rel_path is rejected", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
      const active = findActiveFounderDecisionForApSupabaseParityPlanV1({
        rootDir: root,
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows: [
          loadedRow({
            row: approvedApRow(),
            target_slugs: ["other-slug"],
            apply_plan_rel_paths: ["data/other/plan.json"],
          }),
        ],
      });
      assert.equal(active, null);
      assert.equal(
        founderRowAuthorizesApSupabaseParityPlanV1({
          planRel: FIXTURE_PLAN_REL,
          planSlugs: ["levoit-rf-lv-h128"],
          loaded: loadedRow({
            row: approvedApRow(),
            target_slugs: ["other-slug"],
            apply_plan_rel_paths: ["data/other/plan.json"],
          }),
        }),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("authorized founder with bound apply-plan artifact passes gate", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      const truthDir = path.join(root, "data/truth-integrity");
      mkdirSync(truthDir, { recursive: true });
      const nextReAudit = new Date(referenceTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
      writeFileSync(
        path.join(truthDir, "truth-integrity-registry-v1.json"),
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
      mkdirSync(path.dirname(path.join(root, FIXTURE_PLAN_REL)), { recursive: true });
      writeFileSync(path.join(root, FIXTURE_PLAN_REL), '{"apply_plan":true}\n', "utf8");
      const bound_artifacts_v1 = bindArtifactsAtHashesV1({
        rootDir: root,
        artifacts: [{ artifact_rel_path: FIXTURE_PLAN_REL, entry_type: "apply_plan" }],
      });
      const founderRows = [
        loadedRow({
          row: approvedApRow({ bound_artifacts_v1 }),
          target_slugs: ["levoit-rf-lv-h128"],
          apply_plan_rel_paths: [FIXTURE_PLAN_REL],
        }),
      ];
      const active = findActiveFounderDecisionForApSupabaseParityPlanV1({
        rootDir: root,
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-ap-supabase-fixture");

      const preflight = buildApSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(apSupabaseParityMutationAuthorizedV1(preflight), true);
      assert.equal(preflight.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("expired revalidation cadence blocks apply", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
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
      const preflight = buildApSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(apSupabaseParityMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.some((b) => b.includes("trust_currency:")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("READ_INDEX + apply blocks with io_capability_read_index_cannot_mutate_supabase", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
      const preflight = buildApSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(apSupabaseParityMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes(AP_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("dry_run preflight does not require founder approval", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ap-mutation-gate-"));
    try {
      const preflight = buildApSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        planRel: FIXTURE_PLAN_REL,
        plan: minimalApPlan("levoit-rf-lv-h128"),
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(apSupabaseParityMutationAuthorizedV1(preflight), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
