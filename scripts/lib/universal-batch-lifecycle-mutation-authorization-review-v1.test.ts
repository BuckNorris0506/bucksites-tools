import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  buildUniversalBatchLifecycleMutationAuthorizationReviewV1,
  UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-mutation-authorization-review-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-mutation-authorization-review-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(
    REPO_ROOT,
    "scripts/report-universal-batch-lifecycle-mutation-authorization-review-v1.ts",
  ),
  "utf8",
);

const APPLY_PLAN_REL =
  "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json";
const EXEC_PLAN_REL =
  "data/fridge/batch-production/apply-execution-plans/fridge-buyer-path-batch-apply-execution-plan-v1-0fec4a7b623a.json";

function fixtureExecutionPlan(): Record<string, unknown> {
  return {
    contract: "universal_batch_lifecycle_apply_execution_plan_v1",
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
    planned_change_count: 14,
    row_patch_preview: Array.from({ length: 14 }, (_, i) => ({ slug: `slug-${String(i)}` })),
    rollback_patch_preview: Array.from({ length: 14 }, (_, i) => ({ slug: `slug-${String(i)}` })),
  };
}

function fixtureRegistryRow(ownerScope: "read_only_agent" | "owner_mutation_approved"): Record<string, unknown> {
  return {
    decision_id: `decision-${ownerScope}`,
    source_queue_row_id: "queue-lifecycle-mutation-auth-review-v1",
    source_decision_packet_id: `universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
    decided_at: "2026-06-01T03:00:00.000Z",
    decision_status: ownerScope === "owner_mutation_approved" ? "approved" : "approved",
    owner_note: "Mutation authorization decision for lifecycle path.",
    allowed_next_scope: ownerScope,
    evidence_required_before_mutation: ownerScope === "owner_mutation_approved",
    prohibited_actions_still_apply: [
      "No Supabase writes in this review layer.",
      "No deploy in this review layer.",
    ],
  };
}

function withTempFixture(args: { ownerScope?: "read_only_agent" | "owner_mutation_approved" }) {
  const root = mkdtempSync(path.join(tmpdir(), "lifecycle-mutation-auth-review-"));
  const execAbs = path.join(root, EXEC_PLAN_REL);
  mkdirSync(path.dirname(execAbs), { recursive: true });
  writeFileSync(execAbs, JSON.stringify(fixtureExecutionPlan()), "utf8");

  const registryAbs = path.join(root, "data/owner-decisions/lifecycle-mutation-auth-v1.json");
  mkdirSync(path.dirname(registryAbs), { recursive: true });
  const rows = args.ownerScope ? [fixtureRegistryRow(args.ownerScope)] : [];
  writeFileSync(
    registryAbs,
    JSON.stringify({ contract: "founder_decision_registry_v1", read_only: true, data_mutation: false, rows }),
    "utf8",
  );

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("universal_batch_lifecycle_mutation_authorization_review_v1", () => {
  test("report is read-only and blocked without explicit owner_mutation_approved row", () => {
    const { root, cleanup } = withTempFixture({ ownerScope: "read_only_agent" });
    try {
      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_CONTRACT_V1);
      assert.equal(report.read_only, true);
      assert.equal(report.data_mutation, false);
      assert.equal(report.mutation_authorized, false);
      assert.equal(report.mutation_authorization_review_status, "BLOCKED");
      assert.equal(report.csv_apply_authorized, false);
      assert.ok(
        report.review_blockers.some((b) => b.startsWith("missing_active_owner_mutation_approval:")),
      );
    } finally {
      cleanup();
    }
  });

  test("authorizes only when active owner_mutation_approved row exists", () => {
    const { root, cleanup } = withTempFixture({ ownerScope: "owner_mutation_approved" });
    try {
      const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
        now: () => new Date("2026-06-01T04:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
        applyExecutionPlan: {
          execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
          source_apply_plan_artifact_rel_path: APPLY_PLAN_REL,
          planned_change_count: 14,
        },
      });
      assert.equal(report.mutation_authorization_review_status, "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY");
      assert.equal(report.mutation_authorized, true);
      assert.equal(report.apply_mutation_authorized, true);
      assert.equal(report.csv_apply_authorized, true);
      assert.equal(
        report.source_command,
        UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1,
      );
      assert.equal(report.review_blockers.length, 0);
      assert.ok(report.authorized_decision_id);
    } finally {
      cleanup();
    }
  });

  test("lib/report avoid forbidden write/mutation imports", () => {
    assert.doesNotMatch(LIB_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
    assert.doesNotMatch(REPORT_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
  });
});
