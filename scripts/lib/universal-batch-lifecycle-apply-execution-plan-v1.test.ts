import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  buildUniversalBatchLifecycleApplyExecutionPlanV1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/universal-batch-lifecycle-apply-execution-plan-v1.ts"),
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-universal-batch-lifecycle-apply-execution-plan-v1.ts"),
  "utf8",
);

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

function minimalApplyPlanDoc(plannedChanges: Record<string, unknown>[]): Record<string, unknown> {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    plan_status: "READY_FOR_OWNER_REVIEW",
    owner_review_status: "OWNER_REVIEW_READY",
    planned_change_count: plannedChanges.length,
    planned_changes: plannedChanges,
  };
}

function plannedChange(slug: string): Record<string, unknown> {
  return {
    slug,
    proposed_affiliate_url: "https://www.amazon.com/dp/B087PDLZL9?tag=buckparts20-20",
    proposed_retailer_key: "amazon",
    evidence_artifact_path: `data/evidence/amazon-${slug.toLowerCase()}-live-outcome.2026-05-04.json`,
    action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  };
}

function writeTempFixture(args: {
  slugs?: string[];
  applyPlanOverrides?: Record<string, unknown>;
  csvSlugs?: string[];
}) {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "apply-execution-plan-test-"));
  const slugs = args.slugs ?? SLUGS;
  const applyPlanRel = FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;
  const applyPlanAbs = path.join(tempRoot, applyPlanRel);
  mkdirSync(path.dirname(applyPlanAbs), { recursive: true });
  writeFileSync(
    applyPlanAbs,
    JSON.stringify(
      minimalApplyPlanDoc(
        slugs.map((slug) => ({
          ...plannedChange(slug),
          ...(args.applyPlanOverrides ?? {}),
        })),
      ),
    ),
  );

  const csvAbs = path.join(tempRoot, "data/retailer_links.csv");
  mkdirSync(path.dirname(csvAbs), { recursive: true });
  const header =
    "filter_slug,retailer_name,affiliate_url,is_primary,sort_order,retailer_key,browser_truth_classification,browser_truth_notes,browser_truth_checked_at\n";
  const csvSlugs = args.csvSlugs ?? slugs;
  const body = csvSlugs
    .map(
      (slug) =>
        `${slug},OEM parts catalog (keyword lookup),https://www.repairclinic.com/Search?SearchTerm=${slug},true,0,oem-parts-catalog,,,`,
    )
    .join("\n");
  writeFileSync(csvAbs, `${header}${body}\n`);

  return { tempRoot, cleanup: () => rmSync(tempRoot, { recursive: true, force: true }) };
}

describe("universal_batch_lifecycle_apply_execution_plan_v1", () => {
  test("report is read-only with mutation flags false", () => {
    const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-06-01T00:00:00.000Z"),
      applyReadiness: {
        apply_readiness_status: "BLOCKED",
        planned_change_count: 14,
        source_apply_plan_artifact_rel_path: "data/missing.json",
      },
      applyPlanArtifactRelPath: "data/missing.json",
      fileExists: () => false,
      readText: () => {
        throw new Error("should not read");
      },
    });
    assert.equal(report.contract, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.apply_mutation_authorized, false);
    assert.equal(report.csv_apply_authorized, false);
    assert.equal(report.evidence_write_authorized, false);
    assert.equal(report.netlify_api_authorized, false);
    assert.equal(report.apply_executor_available, false);
  });

  test("lib and report avoid forbidden write/mutation imports", () => {
    assert.doesNotMatch(LIB_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(REPORT_SOURCE, /@netlify|@supabase|insertLearningOutcome/);
    assert.doesNotMatch(LIB_SOURCE, /writeFileSync|writeFile\(|createWriteStream/);
    assert.match(REPORT_SOURCE, /--plan-out/);
    assert.match(REPORT_SOURCE, /apply-execution-plans/);
  });

  test("blocks if apply-readiness is not PROVEN", () => {
    const { tempRoot, cleanup } = writeTempFixture({});
    try {
      const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
        rootDir: tempRoot,
        now: () => new Date("2026-06-01T00:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "BLOCKED",
          planned_change_count: 14,
          source_apply_plan_artifact_rel_path:
            FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
        },
      });
      assert.equal(report.execution_plan_status, "BLOCKED");
      assert.ok(
        report.execution_plan_blockers.some((blocker) => blocker.startsWith("apply_readiness_not_proven:")),
      );
    } finally {
      cleanup();
    }
  });

  test("blocks if planned_change_count does not match apply-plan artifact", () => {
    const { tempRoot, cleanup } = writeTempFixture({ slugs: ["slug-a", "slug-b"] });
    try {
      const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
        rootDir: tempRoot,
        now: () => new Date("2026-06-01T00:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          planned_change_count: 14,
          source_apply_plan_artifact_rel_path:
            FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
        },
      });
      assert.equal(report.execution_plan_status, "BLOCKED");
      assert.ok(
        report.execution_plan_blockers.some((blocker) =>
          blocker.startsWith("planned_change_count_mismatch:"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("blocks if planned slugs do not match committed CSV slug rows", () => {
    const { tempRoot, cleanup } = writeTempFixture({
      slugs: SLUGS,
      csvSlugs: SLUGS.map((slug) => (slug === "4396710" ? "wrong-slug" : slug)),
    });
    try {
      const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
        rootDir: tempRoot,
        now: () => new Date("2026-06-01T00:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          planned_change_count: 14,
          source_apply_plan_artifact_rel_path:
            FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
        },
      });
      assert.equal(report.execution_plan_status, "BLOCKED");
      assert.ok(
        report.execution_plan_blockers.some((blocker) =>
          blocker.startsWith("csv_primary_row_missing: slug=4396710"),
        ),
      );
    } finally {
      cleanup();
    }
  });

  test("blocks if target CSV rows are missing", () => {
    const { tempRoot, cleanup } = writeTempFixture({ csvSlugs: SLUGS.slice(0, 13) });
    try {
      const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
        rootDir: tempRoot,
        now: () => new Date("2026-06-01T00:00:00.000Z"),
        applyReadiness: {
          apply_readiness_status: "PROVEN",
          planned_change_count: 14,
          source_apply_plan_artifact_rel_path:
            FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
        },
      });
      assert.equal(report.execution_plan_status, "BLOCKED");
      assert.ok(
        report.execution_plan_blockers.some((blocker) => blocker.startsWith("csv_primary_row_missing:")),
      );
    } finally {
      cleanup();
    }
  });

  test("row_patch_preview limited to approved apply-plan slugs on repo fixture", () => {
    const applyPlanAbs = path.join(
      REPO_ROOT,
      FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
    );
    if (!readFileSync(applyPlanAbs, "utf8")) return;

    const report = buildUniversalBatchLifecycleApplyExecutionPlanV1({
      rootDir: REPO_ROOT,
      now: () => new Date("2026-06-01T00:00:00.000Z"),
      applyReadiness: {
        apply_readiness_status: "PROVEN",
        planned_change_count: 14,
        source_apply_plan_artifact_rel_path:
          FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
      },
    });
    assert.equal(report.source_command, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1);
    assert.equal(report.target_file, "data/retailer_links.csv");
    assert.equal(report.execution_plan_status, "READY_FOR_MUTATION_AUTH_REVIEW");
    assert.equal(report.planned_change_count, 14);
    assert.equal(report.row_patch_preview.length, 14);
    assert.deepEqual(
      report.row_patch_preview.map((row) => row.slug).sort(),
      [...SLUGS].sort(),
    );
    for (const row of report.row_patch_preview) {
      assert.ok(row.before_row.affiliate_url);
      assert.match(row.after_row.affiliate_url ?? "", /tag=buckparts20-20/);
      assert.equal(row.after_row.retailer_key, "amazon");
      assert.ok(row.changed_fields.includes("affiliate_url"));
      assert.ok(row.changed_fields.includes("retailer_key"));
    }
    assert.equal(report.rollback_patch_preview.length, 14);
    assert.ok(report.validation_plan.length >= 3);
    assert.ok(report.closeout_requirements.length >= 2);
  });
});
