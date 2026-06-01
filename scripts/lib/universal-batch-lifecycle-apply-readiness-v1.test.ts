import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  buildUniversalBatchLifecycleApplyReadinessV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-apply-readiness-v1";
import { buildUniversalBatchLifecycleTruthTableV1 } from "./universal-batch-lifecycle-truth-table-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-apply-readiness-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-universal-batch-lifecycle-apply-readiness-v1.ts"),
  "utf8",
);

function minimalApplyPlanDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    source_apply_plan_artifact_rel_path: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
    source_run_registry_rel_path:
      "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: 14,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    blocked_rows: [],
    planned_changes: Array.from({ length: 14 }, (_, index) => ({
      slug: `slug-${String(index)}`,
      proposed_affiliate_url: "https://www.amazon.com/dp/B000000000?tag=buckparts20-20",
      evidence_artifact_path: `data/evidence/slug-${String(index)}.json`,
      mutation_authorized: false,
    })),
    ...overrides,
  };
}

function minimalRunRegistryDoc(slugs: string[]): Record<string, unknown> {
  return {
    contract: "fridge_buyer_path_batch_planning_run_registry_v1",
    read_only: true,
    data_mutation: false,
    closeout_complete: false,
    stage: "planning_run_registry_created",
    wedge: "refrigerator_water",
    run_id: "fridge-buyer-path-batch-run-v1-test",
    proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-test",
    proposed_row_count: slugs.length,
    proposed_slugs: slugs,
  };
}

function founderRegistryWithApproval(): Record<string, unknown> {
  return {
    contract: "founder_decision_registry_v1",
    rows: [
      {
        decision_status: "approved",
        fridge_buyer_path_batch_apply_plan_approval_context_v1: {
          founder_option_id: "approve_for_next_planning_only",
          source_apply_plan_artifact_rel_path:
            FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
          planned_change_count: 14,
        },
      },
    ],
  };
}

function mockFs(files: Record<string, string>) {
  return {
    fileExists: (absPath: string) => Object.prototype.hasOwnProperty.call(files, absPath),
    readText: (absPath: string) => {
      if (!Object.prototype.hasOwnProperty.call(files, absPath)) {
        throw new Error(`missing mock file: ${absPath}`);
      }
      return files[absPath]!;
    },
  };
}

describe("universal_batch_lifecycle_apply_readiness_v1", () => {
  test("report is read-only with mutation flags false", () => {
    const report = buildUniversalBatchLifecycleApplyReadinessV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      applyPlanArtifactRelPath: "data/missing-apply-plan.json",
      fileExists: () => false,
      readText: () => {
        throw new Error("should not read");
      },
    });
    assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.apply_mutation_authorized, false);
    assert.equal(report.csv_apply_authorized, false);
    assert.equal(report.evidence_write_authorized, false);
    assert.equal(report.netlify_api_authorized, false);
  });

  test("lib and report avoid forbidden write/mutation imports", () => {
    assert.doesNotMatch(LIB_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
    assert.doesNotMatch(REPORT_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
  });

  test("missing apply-plan artifact blocks readiness", () => {
    const report = buildUniversalBatchLifecycleApplyReadinessV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      applyPlanArtifactRelPath: "data/missing-apply-plan.json",
      fileExists: () => false,
      readText: () => {
        throw new Error("should not read");
      },
    });
    assert.notEqual(report.apply_readiness_status, "PROVEN");
    assert.ok(
      report.apply_readiness_blockers.some((blocker) => blocker.startsWith("apply_plan_artifact_valid:")),
    );
  });

  test("missing owner planning approval blocks readiness", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "apply-readiness-test-"));
    try {
      const applyPlanRel = FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;
      const runRegistryRel =
        "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json";
      const slugs = Array.from({ length: 14 }, (_, index) => `slug-${String(index)}`);
      const applyPlanAbs = path.join(tempRoot, applyPlanRel);
      const runRegistryAbs = path.join(tempRoot, runRegistryRel);
      const registryAbs = path.join(
        tempRoot,
        "data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json",
      );
      mkdirSync(path.dirname(applyPlanAbs), { recursive: true });
      mkdirSync(path.dirname(runRegistryAbs), { recursive: true });
      mkdirSync(path.dirname(registryAbs), { recursive: true });
      writeFileSync(applyPlanAbs, JSON.stringify(minimalApplyPlanDoc()));
      writeFileSync(runRegistryAbs, JSON.stringify(minimalRunRegistryDoc(slugs)));
      writeFileSync(registryAbs, JSON.stringify({ contract: "founder_decision_registry_v1", rows: [] }));
      for (let index = 0; index < slugs.length; index += 1) {
        const evidenceAbs = path.join(tempRoot, `data/evidence/slug-${String(index)}.json`);
        mkdirSync(path.dirname(evidenceAbs), { recursive: true });
        writeFileSync(evidenceAbs, "{}");
      }
      const report = buildUniversalBatchLifecycleApplyReadinessV1({
        rootDir: tempRoot,
        now: () => new Date("2026-05-28T00:00:00.000Z"),
      });
      assert.equal(report.apply_readiness_status, "BLOCKED");
      assert.ok(
        report.apply_readiness_blockers.some((blocker) =>
          blocker.startsWith("owner_planning_approval_recorded:"),
        ),
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("planned slug mismatch blocks readiness", () => {
    const applyPlanPath = path.join(
      REPO_ROOT,
      FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
    );
    const runRegistryPath = path.join(
      REPO_ROOT,
      "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
    );
    const plannedSlugs = Array.from({ length: 14 }, (_, index) => `planned-${String(index)}`);
    const approvedSlugs = Array.from({ length: 14 }, (_, index) => `approved-${String(index)}`);
    const applyPlan = minimalApplyPlanDoc({
      planned_changes: plannedSlugs.map((slug) => ({
        slug,
        proposed_affiliate_url: "https://www.amazon.com/dp/B000000000?tag=buckparts20-20",
        evidence_artifact_path: `data/evidence/${slug}.json`,
        mutation_authorized: false,
      })),
    });
    const files: Record<string, string> = {
      [applyPlanPath]: JSON.stringify(applyPlan),
      [runRegistryPath]: JSON.stringify(minimalRunRegistryDoc(approvedSlugs)),
      [path.join(REPO_ROOT, "data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json")]:
        JSON.stringify(founderRegistryWithApproval()),
    };
    for (const slug of plannedSlugs) {
      files[path.join(REPO_ROOT, `data/evidence/${slug}.json`)] = "{}";
    }
    const fs = mockFs(files);
    const report = buildUniversalBatchLifecycleApplyReadinessV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      fileExists: fs.fileExists,
      readText: fs.readText,
    });
    assert.equal(report.apply_readiness_status, "BLOCKED");
    assert.ok(
      report.apply_readiness_blockers.some((blocker) =>
        blocker.startsWith("planned_slug_set_matches_run_registry:"),
      ),
    );
  });

  test("committed repo maps refrigerator_water to blocked apply-readiness from repo facts", () => {
    const applyPlanAbs = path.join(
      REPO_ROOT,
      FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
    );
    if (!readFileSync(applyPlanAbs, "utf8")) return;

    const readiness = buildUniversalBatchLifecycleApplyReadinessV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-05-28T00:00:00.000Z"),
    });
    assert.equal(readiness.source_command, UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1);
    assert.notEqual(readiness.apply_readiness_status, "PROVEN");

    const table = buildUniversalBatchLifecycleTruthTableV1({
      now: () => new Date("2026-05-28T00:00:00.000Z"),
      efficiency_truth_table: {
        consolidation_candidates: [],
        keep_as_truth_fields: [],
        remove_or_demote_candidates: [],
        unknown_facts: [],
        duplicate_steering_count: 0,
      },
      batch_run_registry_intake: {
        ap_run_registry_status: "PROVEN_CLOSED",
        fridge_run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
        wedges: [
          { wedge: "refrigerator_water", run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY" },
        ],
      } as never,
      fridge_apply_plan_approval: {
        approval_status: "owner_approved_for_next_planning_only",
      },
      apply_readiness: readiness,
      buckpartsScriptNames: ["buckparts:universal-batch-lifecycle-apply-readiness"],
    });
    const fridge = table.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
    assert.ok(fridge);
    assert.equal(fridge!.lifecycle_state, "apply_plan_owner_approved");
    assert.ok(fridge!.alternate_lifecycle_states.includes("apply_readiness_unknown"));
    assert.equal(table.one_true_next_state_for_refrigerator_water, "apply_readiness_unknown");
    assert.equal(
      table.one_true_next_command_for_refrigerator_water,
      UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
    );
  });
});
