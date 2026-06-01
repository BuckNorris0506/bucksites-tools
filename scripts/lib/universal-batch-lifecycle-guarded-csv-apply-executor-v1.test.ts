import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  assessUniversalBatchLifecycleGuardedCsvApplyExecutorReadinessV1,
  buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1,
  parseGuardedCsvApplyExecutorCliArgsV1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CANONICAL_EXECUTION_PLAN_REL_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_EXPECTED_ROW_PATCH_COUNT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import {
  applyGuardedCsvWritePlanToCsvTextV1,
  rowMatchesSnapshotV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";
import { buildUniversalBatchLifecycleMutationAuthorizationReviewV1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-guarded-csv-apply-executor-v1.ts"),
  "utf8",
);
const WRITE_LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-guarded-csv-apply-executor-write-v1.ts"),
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

function authorizedMutationReview(overrides?: {
  mutation_authorization_review_status?: "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" | "BLOCKED";
  csv_apply_authorized?: boolean;
  mutation_authorized?: boolean;
  evidence_sufficiency_status?: "PROVEN" | "BLOCKED";
  apply_executor_ready?: boolean;
  review_blockers?: string[];
}) {
  return {
    mutation_authorization_review_status:
      overrides?.mutation_authorization_review_status ?? "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY",
    csv_apply_authorized: overrides?.csv_apply_authorized ?? true,
    mutation_authorized: overrides?.mutation_authorized ?? true,
    evidence_sufficiency_status: overrides?.evidence_sufficiency_status ?? "PROVEN",
    apply_executor_ready: overrides?.apply_executor_ready ?? true,
    required_founder_decision_packet_id: `universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
    review_blockers: overrides?.review_blockers ?? [],
  };
}

function blockedOwnerMutationReview() {
  return authorizedMutationReview({
    mutation_authorization_review_status: "BLOCKED",
    csv_apply_authorized: false,
    mutation_authorized: false,
    review_blockers: [
      `missing_active_owner_mutation_approval: source_decision_packet_id=universal_batch_lifecycle_mutation_authorization_review_v1:${EXEC_PLAN_REL}`,
    ],
  });
}

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

function writeTempFixture(args: {
  slugs?: string[];
  csvRows?: string[];
  execPlan?: Record<string, unknown>;
  extraCsvRows?: string[];
}) {
  const root = mkdtempSync(path.join(tmpdir(), "guarded-csv-apply-executor-"));
  const slugs = args.slugs ?? SLUGS;
  const execAbs = path.join(root, EXEC_PLAN_REL);
  mkdirSync(path.dirname(execAbs), { recursive: true });
  writeFileSync(execAbs, JSON.stringify(args.execPlan ?? fixtureExecutionPlan(slugs)), "utf8");

  const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const body = [
    ...(args.csvRows ?? slugs.map(primaryCsvRow)),
    ...(args.extraCsvRows ?? []),
  ].join("\n");
  writeFileSync(csvAbs, `${header}${body}\n`);

  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe("universal_batch_lifecycle_guarded_csv_apply_executor_v1", () => {
  test("parseGuardedCsvApplyExecutorCliArgsV1 requires explicit --write-csv", () => {
    assert.deepEqual(parseGuardedCsvApplyExecutorCliArgsV1([]), { writeCsv: false });
    assert.deepEqual(parseGuardedCsvApplyExecutorCliArgsV1(["--dry-run"]), { writeCsv: false });
    assert.deepEqual(
      parseGuardedCsvApplyExecutorCliArgsV1([UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_CSV_FLAG_V1]),
      { writeCsv: true },
    );
  });

  test("default report is read-only with mutation flags false", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        now: () => new Date("2026-06-01T05:00:00.000Z"),
        mutationAuthorizationReview: blockedOwnerMutationReview(),
      });
      assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1);
      assert.equal(report.read_only, true);
      assert.equal(report.data_mutation, false);
      assert.equal(report.mutation_authorized, false);
      assert.equal(report.executor_mode, "DRY_RUN");
      assert.equal(report.write_mode_cli_flag_present, false);
      assert.equal(report.write_mode_invoked, false);
      assert.equal(report.write_mode_status, "NOT_INVOKED");
      assert.equal(report.write_mode_available, false);
      assert.equal(report.csv_write_authorized, false);
      assert.equal(report.apply_mutation_authorized, false);
      assert.equal(report.source_command, UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_SOURCE_COMMAND_V1);
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("write_mode_cli_flag_missing:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("default DRY_RUN does not call writeText even when lifecycle authorizes write preconditions", () => {
    const { root, cleanup } = writeTempFixture({});
    let writeCalls = 0;
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: false,
        mutationAuthorizationReview: authorizedMutationReview(),
        writeText: () => {
          writeCalls += 1;
        },
      });
      assert.equal(writeCalls, 0);
      assert.equal(report.data_mutation, false);
      assert.equal(report.write_mode_available, true);
      assert.equal(report.write_mode_invoked, false);
    } finally {
      cleanup();
    }
  });

  test("write mode without --write-csv flag is blocked even with owner approval", () => {
    const { root, cleanup } = writeTempFixture({});
    let writeCalls = 0;
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: false,
        mutationAuthorizationReview: authorizedMutationReview(),
        writeText: () => {
          writeCalls += 1;
        },
      });
      assert.equal(writeCalls, 0);
      assert.equal(report.data_mutation, false);
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("write_mode_cli_flag_missing:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("write mode refuses without owner mutation approval", () => {
    const { root, cleanup } = writeTempFixture({});
    let writeCalls = 0;
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: true,
        mutationAuthorizationReview: blockedOwnerMutationReview(),
        writeText: () => {
          writeCalls += 1;
        },
      });
      assert.equal(writeCalls, 0);
      assert.equal(report.data_mutation, false);
      assert.equal(report.write_mode_status, "BLOCKED");
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("missing_active_owner_mutation_approval:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("write mode refuses on before_row mismatch", () => {
    const { root, cleanup } = writeTempFixture({
      csvRows: SLUGS.map((slug) =>
        slug === "4396710"
          ? `${slug},Wrong retailer,https://example.com/wrong,true,0,oem-parts-catalog,,,`
          : primaryCsvRow(slug),
      ),
    });
    let writeCalls = 0;
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: true,
        mutationAuthorizationReview: authorizedMutationReview(),
        writeText: () => {
          writeCalls += 1;
        },
      });
      assert.equal(writeCalls, 0);
      assert.equal(report.data_mutation, false);
      assert.equal(report.apply_executor_ready, false);
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("apply_executor_not_ready:csv_before_row_mismatch: slug=4396710"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("write mode patches exactly 14 primary rows and leaves non-target rows unchanged in temp fixture", () => {
    const { root, cleanup } = writeTempFixture({
      extraCsvRows: [
        "untouched-slug,Keep retailer,https://example.com/keep,true,0,keep-key,,,",
        "4396710,Non-primary duplicate,https://example.com/dup,false,1,oem-parts-catalog,,,",
      ],
    });
    const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
    const beforeText = readFileSync(csvAbs, "utf8");
    const writes: { path: string; content: string }[] = [];
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: true,
        mutationAuthorizationReview: authorizedMutationReview(),
        writeText: (absPath, content) => {
          writes.push({ path: absPath, content });
          writeFileSync(absPath, content, "utf8");
        },
      });
      assert.equal(report.data_mutation, true);
      assert.equal(report.write_mode_invoked, true);
      assert.equal(report.write_mode_status, "APPLIED");
      assert.equal(writes.length, 1);
      assert.equal(writes[0]!.path, csvAbs);

      const afterText = readFileSync(csvAbs, "utf8");
      assert.notEqual(afterText, beforeText);
      assert.match(afterText, /untouched-slug,Keep retailer/);
      assert.match(afterText, /4396710,Non-primary duplicate/);
      assert.equal(report.row_patch_count, 14);
      assert.equal(report.rollback_patch_preview.length, 14);
      assert.equal(report.post_write_validation?.validation_status, "PROVEN");
      assert.equal(report.post_write_validation?.non_target_rows_unchanged, true);

      for (const patch of report.rollback_patch_preview) {
        const slug = patch.slug;
        const planPatch = fixtureExecutionPlan().row_patch_preview.find(
          (row) => (row as { slug: string }).slug === slug,
        ) as { after_row: Record<string, string> };
        assert.match(afterText, new RegExp(`${slug},Amazon`));
        assert.doesNotMatch(afterText, new RegExp(`${slug},OEM parts catalog \\(keyword lookup\\)`));
        assert.ok(rowMatchesSnapshotV1(patch.rollback_row, patch.before_row));
        assert.ok(
          rowMatchesSnapshotV1(patch.before_row, planPatch.after_row as never) === false ||
            slug === "4396710",
        );
      }
    } finally {
      cleanup();
    }
  });

  test("rollback preview restores exactly before_row values in temp fixture", () => {
    const { root, cleanup } = writeTempFixture({});
    const csvAbs = path.join(root, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
    const beforeText = readFileSync(csvAbs, "utf8");
    try {
      const dryRun = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        mutationAuthorizationReview: authorizedMutationReview(),
      });
      assert.equal(dryRun.rollback_patch_preview.length, 14);

      const headers = [
        "filter_slug",
        "retailer_name",
        "affiliate_url",
        "is_primary",
        "sort_order",
        "retailer_key",
        "browser_truth_classification",
        "browser_truth_notes",
        "browser_truth_checked_at",
      ] as const;

      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        writeCsv: true,
        mutationAuthorizationReview: authorizedMutationReview(),
        writeText: (absPath, content) => writeFileSync(absPath, content, "utf8"),
      });
      assert.equal(report.data_mutation, true);

      const rolledBackRows = dryRun.rollback_patch_preview.map((patch) => patch.rollback_row);
      const targetIndices = dryRun.rollback_patch_preview.map((patch) => patch.row_index);
      const currentRows = readFileSync(csvAbs, "utf8")
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(",");
          return Object.fromEntries(headers.map((h, i) => [h, parts[i] ?? ""]));
        });

      for (let i = 0; i < rolledBackRows.length; i++) {
        const patch = dryRun.rollback_patch_preview[i]!;
        currentRows[patch.row_index] = { ...patch.rollback_row };
      }
      const restoredCsv = applyGuardedCsvWritePlanToCsvTextV1({
        csvText: readFileSync(csvAbs, "utf8"),
        headers,
        rows: currentRows as never,
        targetRowIndices: targetIndices,
      });
      assert.equal(restoredCsv, beforeText);
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
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({ rootDir: root });
      assert.ok(report.before_row_parity.some((row) => row.slug === "4396710" && row.parity_status === "BLOCKED"));
      assert.ok(report.before_row_parity.every((row) => row.parity_status === "PROVEN" || row.slug === "4396710"));
    } finally {
      cleanup();
    }
  });

  test("before_row_parity uses PROVEN status when rows match", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        mutationAuthorizationReview: authorizedMutationReview(),
      });
      assert.equal(report.before_row_parity.length, 14);
      assert.ok(report.before_row_parity.every((row) => row.parity_status === "PROVEN"));
    } finally {
      cleanup();
    }
  });

  test("reports write blocked when owner mutation approval is absent", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        mutationAuthorizationReview: blockedOwnerMutationReview(),
      });
      assert.equal(report.executor_status, "DRY_RUN_READY");
      assert.equal(report.apply_executor_ready, true);
      assert.equal(report.csv_write_authorized, false);
      assert.equal(report.write_mode_available, false);
      assert.ok(
        report.write_mode_blockers.some((blocker) =>
          blocker.startsWith("missing_active_owner_mutation_approval:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("authorized DRY_RUN exposes write command constant without mutating", () => {
    const { root, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
        rootDir: root,
        mutationAuthorizationReview: authorizedMutationReview(),
      });
      assert.equal(report.write_mode_available, true);
      assert.match(report.recommended_next_action, /No CSV mutation applied/i);
      assert.equal(
        UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_WRITE_SOURCE_COMMAND_V1,
        "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor -- --write-csv",
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
    for (const source of [LIB_SOURCE, WRITE_LIB_SOURCE, REPORT_SOURCE]) {
      assert.doesNotMatch(source, /@netlify|@supabase|insertLearningOutcome/);
    }
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|appendFileSync|createWriteStream/);
    assert.doesNotMatch(REPORT_SOURCE, /writeFileSync|appendFileSync|createWriteStream/);
    assert.doesNotMatch(LIB_SOURCE, /from ["']@supabase/);
    assert.doesNotMatch(WRITE_LIB_SOURCE, /from ["']@supabase/);
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
