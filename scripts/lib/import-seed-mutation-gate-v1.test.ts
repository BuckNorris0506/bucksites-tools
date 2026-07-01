import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { FounderDecisionRegistryRowV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildImportSeedMutationPreflightV1,
  findActiveFounderDecisionForImportSeedV1,
  founderRowAuthorizesImportSeedPlanV1,
  IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1,
  IMPORT_SEED_MUTATION_GATE_REF_V1,
  IMPORT_SEED_PLAN_REL_V1,
  IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1,
  importSeedMutationAuthorizedV1,
} from "./import-seed-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import { importSeedCsvRelPathsV1 } from "./seed-import-csv-paths-v1";
import { bindArtifactsAtHashesV1 } from "./truth-ledger-v1";

function approvedImportRow(
  overrides: Partial<FounderDecisionRegistryRowV1> = {},
): FounderDecisionRegistryRowV1 {
  return {
    decision_id: "decision-import-seed-fixture",
    source_queue_row_id: "queue-import-fixture",
    source_decision_packet_id: "packet-import-fixture",
    decided_at: "2026-06-10T12:00:00.000Z",
    decision_status: "approved",
    owner_note: "Approve fridge seed import.",
    allowed_next_scope: "owner_mutation_approved",
    evidence_required_before_mutation: true,
    prohibited_actions_still_apply: ["Do not import unbound CSV pack."],
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

function writeFridgeCsvFixtures(root: string, useSample: boolean) {
  const suffix = useSample ? ".sample.csv" : ".csv";
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(path.join(root, `data/brands${suffix}`), "slug,name\nbrand-a,Brand A\n", "utf8");
  writeFileSync(
    path.join(root, `data/filters${suffix}`),
    "brand_slug,slug,oem_part_number\nbrand-a,filter-a,OA-1\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/fridge_models${suffix}`),
    "brand_slug,slug,model_number\nbrand-a,fridge-a,MODEL1\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/compatibility_mappings${suffix}`),
    "fridge_slug,filter_slug\nfridge-a,filter-a\n",
    "utf8",
  );
  writeFileSync(
    path.join(root, `data/retailer_links${suffix}`),
    "filter_slug,affiliate_url\nfilter-a,https://example.com/buy\n",
    "utf8",
  );
  const rels = importSeedCsvRelPathsV1({ rootDir: root, useSample });
  return bindArtifactsAtHashesV1({
    rootDir: root,
    artifacts: rels.map((artifact_rel_path) => ({
      artifact_rel_path,
      entry_type: "apply_plan" as const,
    })),
  });
}

describe("import-seed-mutation-gate-v1", () => {
  test("dry_run does not require authorization", () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-gate-"));
    try {
      const preflight = buildImportSeedMutationPreflightV1({
        rootDir: root,
        mode: "dry_run",
        useSample: true,
        pruneFridgeCatalog: false,
        io_capability: "READ_INDEX",
      });
      assert.equal(preflight.blockers.length, 0);
      assert.equal(importSeedMutationAuthorizedV1(preflight), false);
      assert.equal(preflight.mutationGateRef, IMPORT_SEED_MUTATION_GATE_REF_V1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with READ_INDEX blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-gate-"));
    try {
      writeFridgeCsvFixtures(root, true);
      const preflight = buildImportSeedMutationPreflightV1({
        rootDir: root,
        mode: "write",
        useSample: true,
        pruneFridgeCatalog: false,
        io_capability: "READ_INDEX",
        now: () => new Date("2026-06-10T12:00:00.000Z"),
        founderRows: [],
      });
      assert.equal(importSeedMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.includes(IMPORT_SEED_IO_READ_INDEX_SUPABASE_BLOCKER_V1));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("write with prune blocks even when other gates would pass", () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeFridgeCsvFixtures(root, false);
      const founderRows = [
        loadedRow({
          row: approvedImportRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [IMPORT_SEED_PLAN_REL_V1],
        }),
      ];
      const preflight = buildImportSeedMutationPreflightV1({
        rootDir: root,
        mode: "write",
        useSample: false,
        pruneFridgeCatalog: true,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(importSeedMutationAuthorizedV1(preflight), false);
      assert.ok(preflight.blockers.includes(IMPORT_SEED_PRUNE_FRIDGE_CATALOG_BLOCKED_V1));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("valid MUTATION + trust + founder + CSV pack authorizes", () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-gate-"));
    try {
      const referenceTime = new Date("2026-06-10T12:00:00.000Z");
      writeTrustCurrencyClearFixture(root, referenceTime);
      const bound_artifacts_v1 = writeFridgeCsvFixtures(root, true);
      const founderRows = [
        loadedRow({
          row: approvedImportRow({ bound_artifacts_v1 }),
          apply_plan_rel_paths: [IMPORT_SEED_PLAN_REL_V1],
        }),
      ];
      const active = findActiveFounderDecisionForImportSeedV1({
        rootDir: root,
        planRel: IMPORT_SEED_PLAN_REL_V1,
        csvRelPaths: importSeedCsvRelPathsV1({ rootDir: root, useSample: true }),
        nowIso: "2026-06-10T12:00:00.000Z",
        founderRows,
      });
      assert.equal(active?.decision_id, "decision-import-seed-fixture");

      const preflight = buildImportSeedMutationPreflightV1({
        rootDir: root,
        mode: "write",
        useSample: true,
        pruneFridgeCatalog: false,
        io_capability: "MUTATION",
        now: () => referenceTime,
        founderRows,
      });
      assert.equal(importSeedMutationAuthorizedV1(preflight), true);
      assert.equal(preflight.blockers.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("wrong apply plan rel path blocks", () => {
    const root = mkdtempSync(path.join(tmpdir(), "import-seed-gate-"));
    try {
      const bound_artifacts_v1 = writeFridgeCsvFixtures(root, true);
      assert.equal(
        founderRowAuthorizesImportSeedPlanV1({
          planRel: IMPORT_SEED_PLAN_REL_V1,
          loaded: loadedRow({
            row: approvedImportRow({ bound_artifacts_v1 }),
            apply_plan_rel_paths: ["scripts/other-import.ts"],
          }),
        }),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
