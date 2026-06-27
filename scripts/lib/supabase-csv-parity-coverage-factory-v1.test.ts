import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
  type FridgeTruthReconciliationV1,
} from "./fridge-truth-reconciliation-v1";
import type { FridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { buildFridgeSafeLinkUkf8001ApplyPlanProposalV1,
  FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
  FRIDGE_SAFE_LINK_UKF8001_PROVEN_ASIN_V1,
  FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
  FRIDGE_SAFE_LINK_UKF8001_WATERDROP_HARD_DO_NOT_USE_ASIN_V1,
} from "./fridge-safe-link-ukf8001-apply-plan-proposal-v1";
import {
  buildSupabaseCsvParityCoverageFactoryV1,
  buildSupabaseCsvParityCandidatePackageV1,
  buildSupabaseCsvParityReferencePackageForSlugV1,
  loadHardDoNotUseAsinSetV1,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  SUPABASE_CSV_PARITY_UKF8001_REFERENCE_SLUG_V1,
} from "./supabase-csv-parity-coverage-factory-v1";

const REPO_ROOT = process.cwd();

function minimalReconciliation(slugs: string[]): FridgeTruthReconciliationV1 {
  return {
    contract: FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: "2026-01-01T00:00:00.000Z",
    exact_repo_paths_read: [],
    csv_truth_summary: {
      source_contract: "refrigerator_model_first_truth_audit_v1",
      total_refrigerator_models: 500,
      unique_linked_filter_slugs: 57,
      linked_filters_with_safe_direct_buyable_primary: 0,
      safe_buyer_path_verdict: "PROVEN_TRUE",
      filters_with_direct_buyable_anywhere_count: 0,
      primary_weak_reason_counts: { SEARCH_PLACEHOLDER_PRIMARY: 57 },
      exact_repo_paths_read: [],
    },
    evidence_truth_summary: {
      evidence_directory: "data/evidence",
      total_json_files_scanned: 1,
      fridge_related_artifact_count: slugs.length,
      win_artifact_count: slugs.length,
      win_artifacts: slugs.map((slug) => ({
        evidence_file: `data/evidence/amazon-${slug}-live-outcome.test.json`,
        filter_slug: slug,
        token: slug.toUpperCase(),
        scope: "refrigerator_water",
        win_signal: "live_outcome" as const,
        claims_supabase_commit: true,
        classification: "PROVEN" as const,
      })),
      additional_evidence_paths_scanned: [],
    },
    prior_win_artifact_summary: {
      live_outcome_json_count: slugs.length,
      linked_filter_slugs_with_evidence_win: slugs,
      prior_report_script_paths: [],
      prior_doc_references: [],
    },
    csv_vs_evidence_mismatch_summary: {
      linked_slugs_with_evidence_win_count: slugs.length,
      linked_slugs_with_csv_direct_buyable_count: 0,
      mismatch_count: slugs.length,
      classification: "PROVEN",
      explanation: "test",
    },
    suspected_unapplied_evidence_rows: slugs.map((slug) => ({
      evidence_file: `data/evidence/amazon-${slug}-live-outcome.test.json`,
      filter_slug: slug,
      evidence_win_signal: "live_outcome",
      csv_has_direct_buyable_row: false,
      csv_primary_weak_reason: "SEARCH_PLACEHOLDER_PRIMARY",
      likely_hypothesis: "B_EVIDENCE_APPLIED_SUPABASE_ONLY",
      hypothesis_classification: "INFERRED",
    })),
    slugs_with_evidence_win_but_csv_placeholder: slugs,
    slugs_with_csv_safe_but_no_evidence: [],
    live_or_supabase_truth_status: "NOT_CHECKED",
    root_cause_hypothesis: "B_EVIDENCE_APPLIED_SUPABASE_ONLY",
    root_cause_summary: "test",
    recommended_next_action: "test",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function mockDiffForSlugs(
  slugs: Array<{ slug: string; evidence: string; status: "SUPABASE_HAS_WIN_CSV_MISSING" | "EVIDENCE_ONLY_NOT_IN_SUPABASE" }>,
): FridgeSupabaseVsCsvRetailerLinksDiffV1 {
  return {
    contract: "fridge_supabase_vs_csv_retailer_links_diff_v1",
    read_only: true,
    data_mutation: false,
    generated_at: "2026-01-01T00:00:00.000Z",
    exact_repo_paths_read: [],
    reconciliation_source_contract: FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
    checked_slug_count: slugs.length,
    checked_filter_slugs: slugs.map((s) => s.slug),
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    supabase_has_win_csv_missing_count: slugs.filter((s) => s.status === "SUPABASE_HAS_WIN_CSV_MISSING")
      .length,
    evidence_only_not_in_supabase_count: 0,
    csv_and_supabase_match_placeholder_count: 0,
    csv_has_win_supabase_missing_count: 0,
    unknown_status_count: 0,
    recommended_next_action: "test",
    rows: slugs.map((s) => ({
      filter_slug: s.slug,
      csv_has_direct_buyable: false,
      csv_primary_url: "https://example.com/search",
      csv_primary_retailer: "oem-parts-catalog",
      supabase_row_count: 1,
      supabase_direct_buyable_count: 1,
      supabase_safe_cta_count: 1,
      supabase_primary_url: "https://amazon.com/dp/TEST",
      evidence_win_artifacts: [s.evidence],
      status: s.status,
    })),
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

describe("supabase-csv-parity-coverage-factory-v1", () => {
  test("loadHardDoNotUseAsinSetV1 includes B087PDLZL9 from repo audit assist", () => {
    const blocked = loadHardDoNotUseAsinSetV1({ rootDir: REPO_ROOT });
    assert.ok(blocked.has("B087PDLZL9"));
  });

  test("ukf8001 reference package is READY_FOR_OWNER_REVIEW via factory", () => {
    const pkg = buildSupabaseCsvParityReferencePackageForSlugV1({
      rootDir: REPO_ROOT,
      filterSlug: SUPABASE_CSV_PARITY_UKF8001_REFERENCE_SLUG_V1,
      evidenceRelPath: FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
    });
    assert.equal(pkg.candidate_status, "READY_FOR_OWNER_REVIEW");
    assert.equal(pkg.apply_plan?.target_slug, "ukf8001");
    assert.match(pkg.apply_plan?.proposed_csv_row.affiliate_url ?? "", /B07C8C2VBH/);
    assert.equal(pkg.expected_census_delta?.safe_buyer_path_proven_count_delta, 1);
  });

  test("4396710 parity candidate blocked (HARD_DO_NOT_USE or missing CSV row)", () => {
    const blocked = loadHardDoNotUseAsinSetV1({ rootDir: REPO_ROOT });
    assert.ok(blocked.has("B087PDLZL9"));
    const pkg = buildSupabaseCsvParityCandidatePackageV1({
      rootDir: REPO_ROOT,
      diffRow: {
        filter_slug: "4396710",
        csv_has_direct_buyable: false,
        csv_primary_url: null,
        csv_primary_retailer: null,
        supabase_row_count: 1,
        supabase_direct_buyable_count: 1,
        supabase_safe_cta_count: 1,
        supabase_primary_url: null,
        evidence_win_artifacts: ["data/evidence/amazon-4396710-live-outcome.2026-05-04.json"],
        status: "SUPABASE_HAS_WIN_CSV_MISSING",
      },
    });
    assert.notEqual(pkg.candidate_status, "READY_FOR_OWNER_REVIEW");
    assert.ok(pkg.hard_do_not_use_blocked || pkg.blockers.some((b) => b.includes("4396710")));
  });

  test("factory discovers ukf8001 from mocked diff and computes batch delta", async () => {
    const report = await buildSupabaseCsvParityCoverageFactoryV1({
      rootDir: REPO_ROOT,
      slugFilter: "ukf8001",
      loadDiff: async () =>
        mockDiffForSlugs([
          {
            slug: "ukf8001",
            evidence: FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
            status: "SUPABASE_HAS_WIN_CSV_MISSING",
          },
        ]),
    });
    assert.equal(report.contract, SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1);
    assert.equal(report.parity_candidates_discovered, 1);
    assert.equal(report.ready_for_owner_review_count, 1);
    assert.equal(report.expected_safe_buyer_path_proven_batch_delta, 1);
  });

  test("ukf8001 legacy wrapper matches generic factory semantics", () => {
    const legacy = buildFridgeSafeLinkUkf8001ApplyPlanProposalV1({ rootDir: REPO_ROOT });
    const generic = buildSupabaseCsvParityReferencePackageForSlugV1({
      rootDir: REPO_ROOT,
      filterSlug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
      evidenceRelPath: FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
    }).apply_plan!;

    assert.equal(legacy.factory_contract, SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1);
    assert.equal(legacy.proposed_csv_row.affiliate_url, generic.proposed_csv_row.affiliate_url);
    assert.equal(legacy.proposed_csv_row.browser_truth_classification, "direct_buyable");
    assert.ok(
      !legacy.proposed_csv_row.affiliate_url.includes(
        FRIDGE_SAFE_LINK_UKF8001_WATERDROP_HARD_DO_NOT_USE_ASIN_V1,
      ),
    );
    assert.match(legacy.proposed_csv_row.affiliate_url, new RegExp(FRIDGE_SAFE_LINK_UKF8001_PROVEN_ASIN_V1));
    assert.equal(legacy.expected_census_delta?.safe_buyer_path_proven_count_delta, 1);
  });
});
