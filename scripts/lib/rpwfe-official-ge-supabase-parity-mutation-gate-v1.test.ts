import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildRpwfeOfficialGeSupabaseParityMutationPreflightV1,
  findActiveFounderDecisionForRpwfeOfficialGeSupabaseParityPlanV1,
  founderRowAuthorizesRpwfeOfficialGeSupabaseParityPlanV1,
  RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  rpwfeOfficialGeSupabaseParityMutationAuthorizedV1,
} from "./rpwfe-official-ge-supabase-parity-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function approvedRpwfeRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-rpwfe-supabase-fixture",
    source_queue_row_id: "queue-rpwfe-fixture",
    source_decision_packet_id: "packet-rpwfe-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve RPWFE official GE Supabase parity apply.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not apply other slugs."],
    expires_at: "2027-06-01T00:00:00.000Z",
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

describe("rpwfe-official-ge-supabase-parity-mutation-gate-v1", () => {
  test("apply without founder row is blocked", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rpwfe-mutation-gate-"));
    try {
      const preflight = buildRpwfeOfficialGeSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("founder row with wrong apply_plan_rel_path is rejected", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rpwfe-mutation-gate-"));
    try {
      const wrongRow = approvedRpwfeRow({
        decision_id: "decision-other-fixture",
        source_queue_row_id: "queue-other-fixture",
        source_decision_packet_id: "packet-other-fixture",
      });
      const active = findActiveFounderDecisionForRpwfeOfficialGeSupabaseParityPlanV1({
        rootDir: root,
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows: [
          loadedRow({
            row: wrongRow,
            target_slugs: ["other-slug"],
            apply_plan_rel_paths: ["data/other/plan.json"],
          }),
        ],
      });
      assert.equal(active, null);
      assert.equal(
        founderRowAuthorizesRpwfeOfficialGeSupabaseParityPlanV1({
          planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
          planSlug: "rpwfe",
          loaded: loadedRow({
            row: wrongRow,
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

  test("authorized founder with bound apply artifact passes gate", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rpwfe-mutation-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      mkdirSync(path.dirname(path.join(root, RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1)), {
        recursive: true,
      });
      writeFileSync(
        path.join(root, RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1),
        '{"csv_apply":true}\n',
        "utf8",
      );
      const bound_artifacts_v1 = bindArtifactsAtHashesV1({
        rootDir: root,
        artifacts: [
          {
            artifact_rel_path: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
            entry_type: "apply_plan",
          },
        ],
      });
      const founderRows = [
        loadedRow({
          row: approvedRpwfeRow({ bound_artifacts_v1 }),
          target_slugs: ["rpwfe"],
          apply_plan_rel_paths: [RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForRpwfeOfficialGeSupabaseParityPlanV1({
        rootDir: root,
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-rpwfe-supabase-fixture");

      const preflight = buildRpwfeOfficialGeSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(preflight), true);
      assert.equal(preflight.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("READ_INDEX + apply blocks with io_capability_read_index_cannot_mutate_supabase", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rpwfe-mutation-gate-"));
    try {
      const preflight = buildRpwfeOfficialGeSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "apply",
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes(RPWFE_OFFICIAL_GE_SUPABASE_PARITY_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("dry_run preflight does not require founder approval", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rpwfe-mutation-gate-"));
    try {
      const preflight = buildRpwfeOfficialGeSupabaseParityMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: "rpwfe" },
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(preflight), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("readonly capability audit covers mutation gate file", () => {
    const auditPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../audit-buckparts-readonly-capability-v1.ts",
    );
    const auditText = readFileSync(auditPath, "utf8");
    assert.ok(
      auditText.includes("scripts/lib/rpwfe-official-ge-supabase-parity-mutation-gate-v1.ts"),
      "audit MUTATION_AUTHORIZATION_SOURCE_FILES must include RPWFE mutation gate",
    );
  });
});
