import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildVerifyOemRetailerLinksMutationPreflightV1,
  VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1,
  VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1,
  verifyOemRetailerLinksMutationAuthorizedV1,
} from "./verify-oem-retailer-links-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

const CSV_REL = "data/retailer_links.csv";

function approvedRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-oem-verify-fixture",
    source_queue_row_id: "queue-oem-verify-fixture",
    source_decision_packet_id: "packet-oem-verify-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve OEM verify write-db.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not write unbound CSV browser truth."],
    expires_at: "2027-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function loadedRow(row: FounderDecisionRegistryRowV1): FounderDecisionRowWithSlugCorrelationV1 {
  return {
    row,
    apply_context_target_slugs: [],
    apply_context_apply_plan_rel_paths: [VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1],
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

function writeCsvFixture(root: string) {
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(
    path.join(root, CSV_REL),
    "filter_slug,retailer_name,affiliate_url,retailer_key\nslug1,OEM,https://example.com/oem,oem_fixture\n",
    "utf8",
  );
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: [
      { artifact_rel_path: CSV_REL, entry_type: "apply_plan" },
      { artifact_rel_path: VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1, entry_type: "apply_plan" },
    ],
  });
}

function writeBoundVerifyOemPlanFixture(root: string): void {
  mkdirSync(path.dirname(path.join(root, VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1)), {
    recursive: true,
  });
  writeFileSync(
    path.join(root, VERIFY_OEM_RETAILER_LINKS_PLAN_REL_V1),
    'export const verifyOemLane = "fixture";\n',
    "utf8",
  );
}

describe("verify-oem-retailer-links-mutation-gate-v1", () => {
  test("dry_run does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "oem-verify-gate-"));
    try {
      const preflight = buildVerifyOemRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        csvRelPaths: [CSV_REL],
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(verifyOemRetailerLinksMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, VERIFY_OEM_RETAILER_LINKS_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "oem-verify-gate-"));
    try {
      writeCsvFixture(root);
      const preflight = buildVerifyOemRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        csvRelPaths: [CSV_REL],
        io_capability: "READ_INDEX",
        founderRows: [],
      });
      assert.ok(
        preflight.blockers.includes(VERIFY_OEM_RETAILER_LINKS_IO_READ_INDEX_SUPABASE_BLOCKER_V1),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("valid MUTATION + trust + founder + CSV binding authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "oem-verify-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      writeBoundVerifyOemPlanFixture(root);
      const bound_artifacts_v1 = writeCsvFixture(root);
      const founderRows = [loadedRow(approvedRow({ bound_artifacts_v1 }))];
      const preflight = buildVerifyOemRetailerLinksMutationPreflightV1({
        rootDir: root,
        mode: "write",
        csvRelPaths: [CSV_REL],
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(verifyOemRetailerLinksMutationAuthorizedV1(preflight), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
