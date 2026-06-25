import assert from "node:assert/strict";
import test from "node:test";

import { AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1 } from "./ap-repo-runtime-convergence-acceptance-v1";
import {
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1,
  buildApRepoRuntimeConvergenceAcceptancePlanV1,
  buildApSafeCtaGapInventoryV1,
  classifyApSafeCtaGapRowV1,
  resolveApRepoRuntimeConvergenceAcceptancePlanPathV1,
} from "./ap-repo-runtime-convergence-acceptance-plan-v1";
import { AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1 } from "./air-purifier-supabase-vs-csv-diff-v1";

const FIXED_NOW = () => new Date("2026-06-25T08:00:00.000Z");

function tableSummary() {
  return {
    csv_count: 0,
    supabase_count: 0,
    csv_only_count: 0,
    supabase_only_count: 0,
    shared_count: 0,
    field_drift_count: 0,
  };
}

function minimalDiff(overrides?: {
  csv_safe?: number;
  supabase_safe?: number;
  seed_import?: "HOLD" | "READY_FOR_OWNER_APPROVAL";
  blockers?: Array<{ blocker_kind: "filter_slug_oem_collision"; key: string; detail: string }>;
}) {
  return {
    contract: AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    generated_at: "2026-06-25T07:30:58.320Z",
    git_head_hint: null,
    exact_repo_paths_read: [],
    supabase_tables_queried: [],
    supabase_truth_status: "CHECKED" as const,
    supabase_unavailable_reason: null,
    summary: {
      brands: tableSummary(),
      air_purifier_filters: tableSummary(),
      air_purifier_models: tableSummary(),
      air_purifier_filter_aliases: tableSummary(),
      air_purifier_model_aliases: tableSummary(),
      air_purifier_compatibility_mappings: tableSummary(),
      air_purifier_retailer_links: tableSummary(),
      seed_import_blocker_count: overrides?.blockers?.length ?? 0,
      browser_truth_drift_count: 0,
      dangerous_db_only_slug_count: 0,
      csv_safe_direct_buyable_count: overrides?.csv_safe ?? 34,
      supabase_safe_direct_buyable_count: overrides?.supabase_safe ?? 28,
    },
    brands: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_filters: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_models: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_filter_aliases: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_model_aliases: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_compatibility_mappings: { csv_only: [], supabase_only: [], field_drift: [] },
    air_purifier_retailer_links: {
      csv_only: [],
      supabase_only: [],
      field_drift: [],
      browser_truth_drift: [],
    },
    seed_import_blockers: overrides?.blockers ?? [],
    dangerous_db_only_slugs: [],
    authorization_recommendations: {
      backup_export: "HOLD" as const,
      oem_pre_alignment_sql: "HOLD" as const,
      seed_import: overrides?.seed_import ?? ("HOLD" as const),
      browser_truth_parity_apply: "HOLD" as const,
      stale_db_delete_packet: "HOLD" as const,
      rationale: [],
    },
    recommended_next_action: "fixture",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

test("plan is read-only with no mutation authority", async () => {
  const plan = await buildApRepoRuntimeConvergenceAcceptancePlanV1({
    rootDir: process.cwd(),
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiff(),
      loadSupabaseSnapshot: async () => ({
        status: "CHECKED",
        data: {
          brands: [],
          filters: [],
          models: [],
          filterAliases: [],
          modelAliases: [],
          compat: [],
          retailerLinks: [],
        },
      }),
      readRetailerLinksCsv: () => [],
    },
  });
  assert.equal(plan.contract, AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.supabase_writes, false);
  assert.equal(plan.acceptance_artifact_committed, false);
});

test("classify oem collision as unsafe_blocked", () => {
  const result = classifyApSafeCtaGapRowV1({
    row: {
      filter_slug: "levoit-rf-rar029",
      csv_primary_retailer_key: "oem-catalog",
      csv_browser_truth_classification: "direct_buyable",
      csv_primary_affiliate_url: "https://example.com",
      supabase_retailer_link_count: 2,
      supabase_primary_retailer_key: "oem-catalog",
      supabase_browser_truth_classification: "likely_search_results",
      supabase_primary_affiliate_url: "https://example.com/search",
    },
    seed_import_blockers: [
      {
        blocker_kind: "filter_slug_oem_collision",
        key: "levoit-rf-rar029",
        detail: "collision",
      },
    ],
  });
  assert.equal(result.classification, "unsafe_blocked");
});

test("resolve ACCEPT_TEMPORARY_DIVERGENCE when seed_import HOLD and gap rows blocked", () => {
  const resolution = resolveApRepoRuntimeConvergenceAcceptancePlanPathV1({
    gate_gap_size: 6,
    diff: minimalDiff({ seed_import: "HOLD" }),
    gap_inventory: [
      {
        filter_slug: "levoit-rf-rar029",
        csv_primary_retailer_key: "oem-catalog",
        csv_browser_truth_classification: "direct_buyable",
        csv_primary_affiliate_url: "x",
        supabase_retailer_link_count: 2,
        supabase_primary_retailer_key: "oem-catalog",
        supabase_browser_truth_classification: "likely_search_results",
        supabase_primary_affiliate_url: "y",
        classification: "unsafe_blocked",
        classification_rationale: [],
        related_seed_import_blockers: [],
      },
    ],
  });
  assert.equal(resolution.recommended_path, "ACCEPT_TEMPORARY_DIVERGENCE");
  assert.equal(resolution.parity_closeable_safely_today, false);
});

test("gap inventory finds csv-safe slug missing supabase safe primary", () => {
  const inventory = buildApSafeCtaGapInventoryV1({
    rootDir: process.cwd(),
    diff: minimalDiff(),
    supabaseLinks: [],
    readRetailerLinksCsv: () => [
      {
        filter_slug: "blueair-f4max-411max",
        affiliate_url: "https://www.blueair.com/products/f4max",
        destination_url: "https://www.blueair.com/products/f4max",
        is_primary: "true",
        retailer_key: "oem-catalog",
        browser_truth_classification: "direct_buyable",
      },
    ],
  });
  assert.equal(inventory.length, 1);
  assert.equal(inventory[0]?.filter_slug, "blueair-f4max-411max");
  assert.equal(inventory[0]?.classification, "requires_owner_review");
});

test("proposed acceptance artifact uses ap_repo_runtime_convergence_acceptance_v1 contract", async () => {
  const plan = await buildApRepoRuntimeConvergenceAcceptancePlanV1({
    rootDir: process.cwd(),
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiff({ seed_import: "HOLD" }),
      loadSupabaseSnapshot: async () => ({
        status: "CHECKED",
        data: {
          brands: [],
          filters: [],
          models: [],
          filterAliases: [],
          modelAliases: [],
          compat: [],
          retailerLinks: [
            {
              filter_slug: "honeywell-hrf-r2",
              affiliate_url: "https://www.amazon.com/dp/B00BWYO0CM",
              destination_url: "https://www.amazon.com/dp/B00BWYO0CM",
              is_primary: true,
              retailer_key: "amazon",
              browser_truth_classification: "timeout",
              browser_truth_notes: null,
              browser_truth_checked_at: null,
            },
          ],
        },
      }),
      readRetailerLinksCsv: () => [
        {
          filter_slug: "honeywell-hrf-r2",
          affiliate_url: "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-2-pack-hrf-r2.htm",
          destination_url: "https://www.honeywellstore.com/store/products/true-hepa-replacement-filter-r-2-pack-hrf-r2.htm",
          is_primary: "true",
          retailer_key: "oem-catalog",
          browser_truth_classification: "direct_buyable",
        },
      ],
    },
  });
  assert.equal(plan.recommended_path, "ACCEPT_TEMPORARY_DIVERGENCE");
  assert.ok(plan.proposed_acceptance_artifact);
  assert.equal(
    plan.proposed_acceptance_artifact?.contract,
    AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
  );
  assert.equal(plan.proposed_acceptance_artifact?.accepted_by, "jared");
  assert.equal(plan.proposed_acceptance_artifact?.measured_gap.gap_size, 6);
});
