import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1, type FridgeSafeLink4396508ApplyPlanProposalV1 } from "./fridge-safe-link-4396508-apply-plan-proposal-v1";
import { runSupabaseCsvParityGuardedApplyV1 } from "./supabase-csv-parity-guarded-apply-v1";
import {
  buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1,
  buildOwnerReviewInsertPlanProposedCsvRow4396508V1,
  csvSnapshotFromFridgeProposedFieldsV1,
  FRIDGE_SAFE_LINK_4396508_EXECUTION_PLAN_REL_V1,
  isOwnerReviewEvidenceDocumentV1,
  isOwnerReviewEvidenceRelPathV1,
  resolveSupabaseCsvParityOwnerReviewInsertPlanConfigV1,
} from "./supabase-csv-parity-owner-review-insert-plan-v1";

const REPO_ROOT = process.cwd();

describe("supabase-csv-parity-owner-review-insert-plan-v1", () => {
  test("4396508 registry resolves and evidence is owner-review not live-outcome", () => {
    const config = resolveSupabaseCsvParityOwnerReviewInsertPlanConfigV1("4396508");
    assert.ok(config);
    assert.equal(config?.target_slug, FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1);
    assert.ok(isOwnerReviewEvidenceRelPathV1(config!.primary_evidence_rel_path));
    assert.equal(resolveSupabaseCsvParityOwnerReviewInsertPlanConfigV1("ukf8001"), null);

    const evidence = JSON.parse(
      readFileSync(`${REPO_ROOT}/${config!.primary_evidence_rel_path}`, "utf8"),
    ) as Record<string, unknown>;
    assert.equal(isOwnerReviewEvidenceDocumentV1(evidence), true);
    assert.equal("committed_live_row" in evidence, false);
  });

  test("raw proposal snapshot keeps browser_truth empty without owner draft overlay", () => {
    const fridgeProposal = JSON.parse(
      readFileSync(
        `${REPO_ROOT}/data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json`,
        "utf8",
      ),
    ) as {
      proposed_retailer_link_row_fields: Array<{
        field: string;
        proposed_value: string | boolean | number | null;
      }>;
    };
    const snapshot = csvSnapshotFromFridgeProposedFieldsV1({
      slug: "4396508",
      fields: fridgeProposal.proposed_retailer_link_row_fields,
    });
    assert.equal(snapshot.browser_truth_classification, "");
    assert.ok(snapshot.affiliate_url.includes("B00NXPKBQ2"));
  });

  test("execution plan row_patch differs before/after and rollback restores OEM placeholder", () => {
    const pkg = buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1({
      rootDir: REPO_ROOT,
      slug: "4396508",
      fileExists: existsSync,
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    assert.ok(pkg?.execution_plan);
    const patch = pkg!.execution_plan!.row_patch_preview[0]!;
    const rollback = pkg!.execution_plan!.rollback_patch_preview[0]!;
    assert.match(patch.before_row.affiliate_url, /whirlpoolparts\.com/);
    assert.match(patch.after_row.affiliate_url, /amazon\.com\/dp\/B00NXPKBQ2/);
    assert.equal(patch.after_row.retailer_name, "Amazon");
    assert.equal(patch.after_row.retailer_key, "amazon");
    assert.equal(patch.after_row.browser_truth_classification, "direct_buyable");
    assert.equal(patch.after_row.browser_truth_checked_at, "2026-05-10");
    assert.notDeepEqual(patch.before_row, patch.after_row);
    assert.deepEqual(rollback.before_row, patch.after_row);
    assert.deepEqual(rollback.after_row, patch.before_row);
    assert.equal(pkg!.expected_census_delta?.safe_buyer_path_proven_count_delta, 1);
  });

  test("buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1 produces execution plan", () => {
    const pkg = buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1({
      rootDir: REPO_ROOT,
      slug: "4396508",
      fileExists: existsSync,
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    assert.ok(pkg);
    assert.equal(pkg!.candidate_status, "READY_FOR_OWNER_REVIEW");
    assert.equal(pkg!.parity_diff_row, null);
    assert.equal(pkg!.apply_plan?.parity_diff_status, "INFERRED_FROM_REPO_EVIDENCE");
    assert.equal(pkg!.apply_plan?.proposed_csv_row.browser_truth_classification, "direct_buyable");
    assert.equal(pkg!.execution_plan_rel_path, FRIDGE_SAFE_LINK_4396508_EXECUTION_PLAN_REL_V1);
    assert.equal(pkg!.execution_plan?.planned_change_count, 1);
  });

  test("owner draft overlay sources direct_buyable without inferring from live-outcome", () => {
    const fridgeProposal = JSON.parse(
      readFileSync(
        `${REPO_ROOT}/data/fridge/batch-production/drafts/fridge-safe-link-4396508-apply-plan-proposal-v1.json`,
        "utf8",
      ),
    ) as {
      proposed_retailer_link_row_fields: FridgeSafeLink4396508ApplyPlanProposalV1["proposed_retailer_link_row_fields"];
    };
    const built = buildOwnerReviewInsertPlanProposedCsvRow4396508V1({
      rootDir: REPO_ROOT,
      slug: "4396508",
      fields: fridgeProposal.proposed_retailer_link_row_fields,
      fileExists: existsSync,
      readText: (abs) => readFileSync(abs, "utf8"),
    });
    assert.equal(built.proposed_csv_row.browser_truth_classification, "direct_buyable");
    assert.equal(built.pending_owner_browser_truth?.blocked_until_founder_approval, true);
  });

  test("guarded apply dry-run resolves 4396508 and blocks write-csv without founder approval", async () => {
    const dryRun = await runSupabaseCsvParityGuardedApplyV1({
      rootDir: REPO_ROOT,
      slug: "4396508",
      writeCsv: false,
    });
    assert.equal(dryRun.bridge_status, "DRY_RUN_READY");
    assert.equal(dryRun.founder_decision_missing, true);
    assert.equal(dryRun.write_csv_blocked_until_founder_approval, true);
    assert.ok(
      dryRun.blockers.some((b) => b.includes("founder_owner_mutation_approved_missing_or_inactive")) ===
        false,
      "dry-run should not add founder blocker when writeCsv=false",
    );

    const writeAttempt = await runSupabaseCsvParityGuardedApplyV1({
      rootDir: REPO_ROOT,
      slug: "4396508",
      writeCsv: true,
    });
    assert.equal(writeAttempt.write_csv_applied, false);
    assert.equal(writeAttempt.founder_decision_missing, true);
    assert.ok(
      writeAttempt.blockers.includes("founder_owner_mutation_approved_missing_or_inactive"),
    );
  });
});
