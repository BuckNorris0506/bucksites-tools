import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1,
  buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import { buildUniversalBatchLifecycleMutationAuthorizationReviewV1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-guarded-csv-apply-executor-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-universal-batch-lifecycle-guarded-csv-apply-executor-v1.ts"),
  "utf8",
);

const EXEC_PLAN_REL = UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1;
const APPLY_PLAN_REL =
  "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json";

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

function fixtureExecutionPlan(slugs: string[] = SLUGS): Record<string, unknown> {
  return {
    contract: "universal_batch_lifecycle_apply_execution_plan_v1",
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
    planned_change_count: slugs.length,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_preview: slugs.map((slug) => executionPlanRowPatch(slug)),
    rollback_patch_preview: slugs.map((slug) => executionPlanRowPatch(slug)),
  };
}

function writeTempFixture(args: { slugs?: string[]; csvRows?: string[]; execPlan?: Record<string, unknown> }) {
  const root = mkdtempSync(path.join(tmpdir(), "guarded-csv-apply-executor-"));
  const slugs = args.slugs ?? SLUGS;
  const execAbs = path.join(root, EXEC_PLAN_REL);
  mkdirSync(path.dirname(execAbs), { recursive: true });
  writeFileSync(execAbs, JSON.stringify(args.execPlan ?? fixtureExecutionPlan(slugs)), "utf8");

  const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const body = (args.csvRows ?? slugs.map(primaryCsvRow)).join("\n");
  writeFileSync(csvAbs, `${header}${body}\n`);

  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe("universal_batch_lifecycle_guarded_csv_apply_executor_v1", () => {
  test("default report is read-only with mutation flags false", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        now: () => new Date("2026-06-01T05:00:00.000Z"),
        mutationAuthorizationReview: {
          mutation_authorization_review_status: "BLOCKED",
          csv_apply_authorized: false,
          required_founder_decision_packet_id: `universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
          review_blockers: [
            `missing_active_owner_mutation_approval: source_decision_packet_id=universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
          ],
        },
      });
      assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1);
      assert.equal(report.read_only, true);
      assert.equal(report.data_mutation, false);
      assert.equal(report.mutation_authorized, false);
      assert.equal(report.executor_mode, "DRY_RUN");
      assert.equal(report.write_mode_available, false);
      assert.equal(report.csv_write_authorized, false);
      assert.equal(report.apply_mutation_authorized, false);
      assert.equal(report.source_command, UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1);
    } finally {
      cleanup();
    }
  });

  test("validates execution-plan artifact status READY_FOR_MUTATION_AUTH_REVIEW", () => {
    const { root, cleanup } = writeTempFixture({
      execPlan: { ...fixtureExecutionPlan(), execution_plan_status: "BLOCKED" },
    });
    try {
      const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
        rootDir: root,
      });
      assert.equal(readiness.apply_executor_ready, false);
      assert.ok(
        readiness.executor_blockers.some((blocker) =>
          blocker.startsWith("execution_plan_status_invalid:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("validates target_file is exactly data/retailer_links.csv", () => {
    const { root, cleanup } = writeTempFixture({
      execPlan: { ...fixtureExecutionPlan(), target_file: "data/other.csv" },
    });
    try {
      const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
        rootDir: root,
      });
      assert.equal(readiness.apply_executor_ready, false);
      assert.ok(
        readiness.executor_blockers.some((blocker) =>
          blocker.startsWith("execution_plan_target_file_invalid:"),
        ),
      );
      assert.equal(readiness.target_file, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
    } finally {
      cleanup();
    }
  });

  test("validates 14 row_patch_preview rows", () => {
    const { root, cleanup } = writeTempFixture({ slugs: SLUGS.slice(0, 13) });
    try {
      const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
        rootDir: root,
      });
      assert.equal(readiness.apply_executor_ready, false);
      assert.ok(
        readiness.executor_blockers.some((blocker) =>
          blocker.includes("row_patch_preview_count_invalid"),
        ),
      );
    } finally {
      cleanup();
    }
    assert.equal(UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1, 14);
  });

  test("validates CSV before rows match execution-plan before_row snapshots", () => {
    const { root, cleanup } = writeTempFixture({
      csvRows: SLUGS.map((slug) =>
        slug === "4396710"
          ? `${slug},Wrong retailer,https://example.com/wrong,true,0,oem-parts-catalog,,,`
          : primaryCsvRow(slug),
      ),
    });
    try {
      const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
        rootDir: root,
      });
      assert.equal(readiness.apply_executor_ready, false);
      assert.ok(
        readiness.executor_blockers.some((blocker) =>
          blocker.startsWith("csv_before_row_mismatch: slug=4396710"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("reports write blocked when owner mutation approval is absent", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        mutationAuthorizationReview: {
          mutation_authorization_review_status: "BLOCKED",
          csv_apply_authorized: false,
          required_founder_decision_packet_id: `universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
          review_blockers: [
            `missing_active_owner_mutation_approval: source_decision_packet_id=universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
          ],
        },
      });
      assert.equal(report.executor_status, "DRY_RUN_READY");
      assert.equal(report.apply_executor_ready, true);
      assert.equal(report.csv_write_authorized, false);
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("missing_active_owner_mutation_approval:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("repo fixture validates DRY_RUN readiness against committed execution plan and CSV", () => {
    const readiness = assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1({
      rootDir: REPO_ROOT,
    });
    assert.equal(readiness.apply_executor_ready, true);
    assert.equal(readiness.executor_status, "DRY_RUN_READY");
    assert.equal(readiness.row_patch_count, 14);
    assert.equal(readiness.target_file, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  });

  test("lib/report avoid forbidden write/mutation imports", () => {
    assert.doesNotMatch(LIB_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|appendFileSync|mkdirSync|createWriteStream/);
    assert.doesNotMatch(REPORT_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(REPORT_SOURCE, /writeFileSync|appendFileSync|mkdirSync|createWriteStream/);
  });
});

describe("mutation authorization review apply_executor_ready integration", () => {
  test("apply_executor_ready true when executor validates but mutation review remains BLOCKED without owner approval", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const review = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
        rootDir: root,
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
      assert.equal(review.apply_executor_ready, true);
      assert.equal(review.mutation_authorization_review_status, "BLOCKED");
      assert.equal(review.mutation_authorized, false);
      assert.equal(review.csv_apply_authorized, false);
      assert.ok(
        review.review_blockers.some((blocker) =>
          blocker.startsWith("missing_active_owner_mutation_approval:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("repo mutation authorization review reports apply_executor_ready with owner registry when present", () => {
    const ownerRegistryAbs = path.join(
      REPO_ROOT,
      "data/owner-decisions/lifecycle-mutation-authorization-review-v1.json",
    );
    const review = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
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
    assert.equal(review.apply_executor_ready, true);
    if (existsSync(ownerRegistryAbs)) {
      assert.equal(review.mutation_authorization_review_status, "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY");
      assert.equal(review.csv_apply_authorized, true);
    } else {
      assert.equal(review.mutation_authorization_review_status, "BLOCKED");
      assert.equal(review.csv_apply_authorized, false);
    }
  });
});
