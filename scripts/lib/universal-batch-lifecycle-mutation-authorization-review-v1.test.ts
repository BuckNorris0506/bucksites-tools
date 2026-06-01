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

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";

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

const SLUGS = [
  "4396710",
  "4396841",
  "46-9002",
  "8171413",
  "da29-00019a",
  "da97-15217d",
  "edr1rxd1",
  "edr2rxd1",
  "lt1000p",
  "lt1000pc",
  "lt600p",
  "lt700p",
  "lt800p",
  "mdj64844601",
];

function primaryCsvRow(slug: string): string {
  return `${slug},OEM parts catalog (keyword lookup),https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${slug},true,0,oem-parts-catalog,,,`;
}

function executionPlanRowPatch(slug: string): Record<string, unknown> {
  return {
    slug,
    filter_slug: slug,
    action: "propose_replace_search_placeholder_with_verified_direct_buyable",
    before_row: {
      filter_slug: slug,
      retailer_name: "OEM parts catalog (keyword lookup)",
      affiliate_url: `https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=${slug}`,
      is_primary: "true",
      sort_order: "0",
      retailer_key: "oem-parts-catalog",
      browser_truth_classification: "",
      browser_truth_notes: "",
      browser_truth_checked_at: "",
    },
    after_row: {
      filter_slug: slug,
      retailer_name: "Amazon",
      affiliate_url: "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
      is_primary: "true",
      sort_order: "0",
      retailer_key: "amazon",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "preview",
      browser_truth_checked_at: "2026-05-04T12:00:00.000Z",
    },
    changed_fields: ["affiliate_url", "retailer_name", "retailer_key"],
  };
}

function fixtureExecutionPlan(): Record<string, unknown> {
  return {
    contract: "universal_batch_lifecycle_apply_execution_plan_v1",
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
    planned_change_count: 14,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_preview: SLUGS.map((slug) => executionPlanRowPatch(slug)),
    rollback_patch_preview: SLUGS.map((slug) => executionPlanRowPatch(slug)),
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

  const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const body = SLUGS.map(primaryCsvRow).join("\n");
  writeFileSync(csvAbs, `${header}${body}\n`);

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
      assert.equal(report.apply_executor_ready, true);
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
      assert.equal(report.apply_executor_ready, true);
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

  test("repo reports apply_executor_ready true while mutation authorization remains BLOCKED", () => {
    const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-06-01T05:00:00.000Z"),
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
    assert.equal(report.apply_executor_ready, true);
    assert.equal(report.mutation_authorization_review_status, "BLOCKED");
    assert.equal(report.mutation_authorized, false);
  });
});
