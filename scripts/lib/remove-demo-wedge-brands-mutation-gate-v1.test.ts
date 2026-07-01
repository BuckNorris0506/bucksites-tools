import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildRemoveDemoWedgeBrandsMutationPreflightV1,
  founderRowAuthorizesRemoveDemoWedgeBrandTargetSlugsV1,
  REMOVE_DEMO_FROZEN_SCRIPT_BLOCKED_V1,
  REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1,
  REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
  removeDemoWedgeBrandsMutationAuthorizedV1,
} from "./remove-demo-wedge-brands-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-remove-demo-fixture",
    source_queue_row_id: "queue-remove-demo-fixture",
    source_decision_packet_id: "packet-remove-demo-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve demo wedge brand removal.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not delete non-demo brands."],
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
    apply_context_target_slugs: args.target_slugs ?? ["purebrand", "poewat"],
    apply_context_apply_plan_rel_paths:
      args.apply_plan_rel_paths ?? [REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1],
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

function writeBoundRemoveDemoPlanFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1),
    'export const removeDemoLane = "fixture";\n',
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      {
        artifact_rel_path: REMOVE_DEMO_WEDGE_BRANDS_PLAN_REL_V1,
        entry_type: "apply_plan",
      },
    ],
  });
}

describe("remove-demo-wedge-brands-mutation-gate-v1", () => {
  test("dry_run does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-gate-"));
    try {
      const preflight = buildRemoveDemoWedgeBrandsMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(removeDemoWedgeBrandsMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, REMOVE_DEMO_WEDGE_BRANDS_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write without frozen env blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-gate-"));
    try {
      const preflight = buildRemoveDemoWedgeBrandsMutationPreflightV1({
        rootDir: root,
        mode: "write",
        allowFrozen: false,
        io_capability: "MUTATION",
      });
      assert.ok(preflight.blockers.includes(REMOVE_DEMO_FROZEN_SCRIPT_BLOCKED_V1));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-gate-"));
    try {
      const preflight = buildRemoveDemoWedgeBrandsMutationPreflightV1({
        rootDir: root,
        mode: "write",
        allowFrozen: true,
        io_capability: "READ_INDEX",
        founderRows: [],
      });
      assert.ok(
        preflight.blockers.includes(REMOVE_DEMO_WEDGE_BRANDS_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("missing target slug scope blocks founder match", () => {
    assert.equal(
      founderRowAuthorizesRemoveDemoWedgeBrandTargetSlugsV1({
        loaded: loadedRow({
          row: approvedRow(),
          target_slugs: ["purebrand"],
        }),
      }),
      false,
    );
  });

  test("valid MUTATION + trust + founder + slug scope authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "remove-demo-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeBoundRemoveDemoPlanFixture(root);
      const founderRows = [loadedRow({ row: approvedRow({ bound_artifacts_v1 }) })];
      const preflight = buildRemoveDemoWedgeBrandsMutationPreflightV1({
        rootDir: root,
        mode: "write",
        allowFrozen: true,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(
        removeDemoWedgeBrandsMutationAuthorizedV1(preflight),
        true,
        preflight.blockers.join(","),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
