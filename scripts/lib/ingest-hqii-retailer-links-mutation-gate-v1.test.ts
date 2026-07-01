import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildIngestHqiiRetailerLinksMutationPreflightV1,
  findActiveFounderDecisionForIngestHqiiRetailerLinksV1,
  founderRowAuthorizesIngestHqiiRetailerLinksPlanV1,
  founderRowBindsInputArtifactV1,
  INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1,
  INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1,
  ingestHqiiRetailerLinksMutationAuthorizedV1,
} from "./ingest-hqii-retailer-links-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

const INPUT_REL_V1 = "fixtures/hqii-ingest-input-v1.json";

function approvedIngestRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-ingest-hqii-fixture",
    source_queue_row_id: "queue-ingest-fixture",
    source_decision_packet_id: "packet-ingest-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve HQII retailer link ingest.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not ingest unbound input JSON."],
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

function writeBoundIngestInputFixture(root: string): ReturnType<typeof bindArtifactsAtHashesV1> {
  mkdirSync(path.dirname(path.join(root, INPUT_REL_V1)), { recursive: true });
  writeFileSync(
    path.join(root, INPUT_REL_V1),
    JSON.stringify([
      {
        filter_slug: "test-filter",
        retailer_name: "Amazon",
        url: "https://www.amazon.com/dp/B00310NIU0",
      },
    ]),
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [{ artifact_rel_path: INPUT_REL_V1, entry_type: "apply_plan" }],
  });
}

describe("ingest-hqii-retailer-links-mutation-gate-v1", () => {
  test("dry_run does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      const preflight = buildIngestHqiiRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(ingestHqiiRetailerLinksMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      const preflight = buildIngestHqiiRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        inputRelPath: INPUT_REL_V1,
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(ingestHqiiRetailerLinksMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes(INGEST_HQII_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with MUTATION but no founder approval blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      writeTrustCurrencyClearFixture(root, new Date("2026-06-10T12:00:00.000Z"));
      writeBoundIngestInputFixture(root);
      const preflight = buildIngestHqiiRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        inputRelPath: INPUT_REL_V1,
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(ingestHqiiRetailerLinksMutationAuthorizedV1(preflight), false);
      assert.ok(
        preflight.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with founder approval but failed trust blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      writeTrustCurrencyExpiredFixture(root);
      const bound_artifacts_v1 = writeBoundIngestInputFixture(root);
      const founderRows = [
        loadedRow({
          row: approvedIngestRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1],
        }),
      ];
      const preflight = buildIngestHqiiRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        inputRelPath: INPUT_REL_V1,
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(ingestHqiiRetailerLinksMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.some((b) => b.includes("trust_currency:")));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("valid MUTATION + trust + founder + input artifact authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeBoundIngestInputFixture(root);
      const founderRows = [
        loadedRow({
          row: approvedIngestRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForIngestHqiiRetailerLinksV1({
        rootDir: root,
        planRel: INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1,
        inputRelPath: INPUT_REL_V1,
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-ingest-hqii-fixture");

      const preflight = buildIngestHqiiRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        inputRelPath: INPUT_REL_V1,
        io_capability: "MUTATION",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows,
      });
      assert.equal(ingestHqiiRetailerLinksMutationAuthorizedV1(preflight), true);
      assert.equal(preflight.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("wrong apply plan rel path blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      const bound_artifacts_v1 = writeBoundIngestInputFixture(root);
      assert.equal(
        founderRowAuthorizesIngestHqiiRetailerLinksPlanV1({
          planRel: INGEST_HQII_RETAILER_LINKS_PLAN_REL_V1,
          loaded: loadedRow({
            row: approvedIngestRow({ bound_artifacts_v1 }),
            apply_plan_rel_paths: ["scripts/other-ingest.ts"],
          }),
        }),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("unbound input artifact blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ingest-mutation-gate-"));
    try {
      writeBoundIngestInputFixture(root);
      const bound_artifacts_v1 = bindArtifactsAtHashesV1({
        rootDir: root,
        artifacts: [{ artifact_rel_path: "fixtures/other-input.json", entry_type: "apply_plan" }],
      });
      writeFileSync(path.join(root, "fixtures/other-input.json"), "[]", "utf8");
      const row = approvedIngestRow({ bound_artifacts_v1 });
      const bind = founderRowBindsInputArtifactV1({
        row,
        inputRelPath: INPUT_REL_V1,
        rootDir: root,
      });
      assert.equal(bind.ok, false);
      assert.ok(bind.blockers.includes("founder_input_artifact_unbound"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
