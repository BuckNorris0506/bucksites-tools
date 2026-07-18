/**
 * Hermetic Waterdrop DA29-00020B next-best-action invariants.
 *
 * 1) Component-level: lane builder + resolveCommandCenterNextBestActionV1
 * 2) Full-report: real buildBuckpartsCommandCenterReport through final root NBA
 *
 * Full-report fixtures are fully synthetic under mkdtemp — no REPO_ROOT copies,
 * no live tracker/GSC/Supabase/environment truth.
 */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCustomerLanguageAndWaterdropResearchLaneV1 } from "../../src/lib/owner-dashboard/customer-language-and-waterdrop-research-lane-v1";
import {
  CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH,
  OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
  WATERDROP_DA29_00020B_EVIDENCE_REL_PATH,
  WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH,
  WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH,
} from "../../src/lib/copy/customer-language-doctrine";
import { unavailableClickSnapshot } from "./buckparts-click-events-snapshot";
import { resolveCommandCenterNextBestActionV1 } from "./buckparts-command-center-next-best-action-v1";
import { buildDemandToCoverageEngineV1FromRows } from "./demand-to-coverage-engine-v1";
import { degradedLearningOutcomesReadModelV1 } from "./learning-outcomes-read-model-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";

const WATERDROP_ROW_ID = "d4cbad0c-4bab-4854-89bf-59e6d6492c6b";
const EXACT_WATERDROP_MONITOR_NBA =
  `Monitor Waterdrop DA29-00020B live proof slice only (da29-00020b; no broad rollout); next operator queue: ${OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1}`;
const WATERDROP_MONITOR_NBA = /Monitor Waterdrop DA29-00020B live proof slice only/i;
const STALE_NON_AMAZON_NBA =
  /until at least one non-Amazon network lane reaches APPROVED/i;
const DEMAND_SELECTED_NBA = /^DEMAND-TO-COVERAGE \[START_NEW_DEMAND_SELECTED_BATCH\]:/i;

const ENV_KEYS_TO_CLEAR = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BUCKPARTS_IO_CAPABILITY",
  "NEXT_PUBLIC_SITE_URL",
  "URL",
  "DEPLOY_URL",
  "DEPLOY_PRIME_URL",
] as const;

const TRACKER_AMAZON_ONLY_PENDING = JSON.stringify([
  {
    id: "amazon-associates",
    network: "Amazon Associates",
    retailer: "Amazon",
    programUrl: null,
    status: "APPROVED",
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: null,
    nextAction: "Verify tag",
    nextActionDueAt: null,
    notes: null,
    tagVerified: true,
    tagVerifiedAt: null,
    tagValue: "buckparts20-20",
  },
  {
    id: "flexoffers",
    network: "FlexOffers",
    retailer: null,
    programUrl: null,
    status: "REJECTED",
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: null,
    nextAction: null,
    nextActionDueAt: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  },
  {
    id: "repairclinic",
    network: "UNKNOWN",
    retailer: "RepairClinic",
    programUrl: null,
    status: "DRAFTING",
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: null,
    nextAction: "Prepare",
    nextActionDueAt: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  },
]);

function liveEvidence(): Record<string, unknown> {
  return {
    report_name: "buckparts_waterdrop_da29_00020b_live_outcome_v1",
    read_only: true,
    data_mutation: false,
    mutation_ready: false,
    waterdrop_live_cta_status: "LIVE",
    verdict: "LIVE_OUTCOME_RECORDED",
    committed_live_row: { link_id: WATERDROP_ROW_ID },
  };
}

function writeJson(root: string, rel: string, value: unknown): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root: string, rel: string, value: string): void {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, value);
}

function writeMinimalWaterdropFixture(root: string, evidence: Record<string, unknown>): void {
  writeText(root, CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH, "# doctrine fixture\n");
  writeText(root, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH, "# draft fixture\n");
  writeText(root, WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH, "-- insert plan fixture\n");
  writeJson(root, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH, evidence);
}

/** Fully synthetic structural stubs — never copied from REPO_ROOT. */
function writeSyntheticControlGraphStubs(root: string): void {
  writeText(root, "data/fridge_models.csv", "brand_slug,slug,model_number,notes\n");
  writeText(root, "data/compatibility_mappings.csv", "fridge_slug,filter_slug\n");
  writeText(
    root,
    "data/filters.csv",
    "brand_slug,slug,oem_part_number,name,replacement_interval_months,notes\n",
  );
  writeText(
    root,
    "package.json",
    JSON.stringify({ name: "wd-hermetic-fixture", scripts: { "buckparts:command-center": "true" } }),
  );

  const auditBase = {
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: "2026-05-21T00:00:00.000Z",
    exact_repo_paths_read: [] as string[],
    proven_facts: [] as string[],
    unknown_facts: [] as string[],
  };

  writeJson(root, "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json", {
    ...auditBase,
    contract: "model_filter_correctness_audit_v1",
    total_models: 0,
    models_with_compat_mapping: 0,
    models_without_compat_mapping: 0,
    manual_evidence_fixture_count: 0,
    quarantined_model_count: 0,
    classification_counts: {
      PROVEN_CORRECT: 0,
      LIKELY_CORRECT_NEEDS_EVIDENCE: 0,
      WRONG_PART_RISK: 0,
      BLOCKED: 0,
      UNKNOWN: 0,
    },
    confusion_family_summary: {
      haf_qin_vs_haf_cin: 0,
      da29_vs_da97: 0,
      xwf_vs_xwfe: 0,
      fppwfu01_vs_fppwfu02: 0,
      lg_lt_generation_mixes: 0,
      ge_rpwfe_mixed_legacy: 0,
      wildcard_blocked_haf_cin: 0,
      wildcard_review_da29_conflict: 0,
    },
    factory_scaling: { safe: 0, needs_evidence: 0, dangerous: 0 },
    top_50_risk_pages: [],
    indexable_risk_pages: [],
    model_rows: [],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        classification_counts: ".classification_counts",
        top_50_risk_pages: ".top_50_risk_pages",
        indexable_risk_pages: ".indexable_risk_pages",
      },
      total_models: 0,
      classification_counts: {
        PROVEN_CORRECT: 0,
        LIKELY_CORRECT_NEEDS_EVIDENCE: 0,
        WRONG_PART_RISK: 0,
        BLOCKED: 0,
        UNKNOWN: 0,
      },
      factory_scaling: { safe: 0, needs_evidence: 0, dangerous: 0 },
      recommended_next_action: "hermetic stub",
    },
  });

  writeJson(
    root,
    "data/fridge/batch-production/page-factory/proven-cohort-manifest-v1/proven-cohort-page-factory-manifest-v1.json",
    {
      ...auditBase,
      contract: "proven_cohort_page_factory_manifest_v1",
      source_audit_contract: "model_filter_correctness_audit_v1",
      source_audit_path: "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json",
      clone_anchor_slug: "samsung-rf28r7351sr",
      proven_correct_slug_count: 0,
      eligible_for_owner_review_count: 0,
      already_registered_count: 0,
      cohort_rows: [],
      inspect_summary: {
        recommended_jq_paths: {
          standalone_report: ".inspect_summary",
          cohort_rows: ".cohort_rows",
          eligible_for_owner_review_count: ".eligible_for_owner_review_count",
        },
        recommended_next_action: "hermetic stub",
      },
    },
  );

  writeJson(root, "data/fridge/batch-production/audits/learned-failure-guards-v1.json", {
    ...auditBase,
    contract: "learned_failure_guards_v1",
    source_audit_contract: "model_filter_correctness_audit_v1",
    source_audit_path: "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json",
    source_remediation_plan_contract: "dangerous_mapping_remediation_plan_v1",
    source_remediation_plan_path:
      "data/fridge/batch-production/audits/dangerous-mapping-remediation-plan-v1.json",
    total_catalog_models: 0,
    per_slug_guards: [],
    confusion_family_block_count: {
      samsung_haf_qin_vs_haf_cin: 0,
      samsung_da29_da97_co_map: 0,
      samsung_wildcard_da29_conflict: 0,
      samsung_haf_cin_canonical: 0,
      lg_lt_generation_mix: 0,
      ge_xwf_xwfe_mix: 0,
      ge_rpwfe_legacy_mix: 0,
      frigidaire_fppwfu01_vs_fppwfu02: 0,
      frigidaire_ultrawf_vs_eptwfu01_mix: 0,
      frigidaire_eptwfu01_vs_wf3cb_mix: 0,
      frigidaire_proven_anchor_sibling_drift: 0,
      frigidaire_fppwfu01_prefix_family_contamination: 0,
    },
    dangerous_count_regression: {
      verdict: "PASS",
      dangerous_count: 0,
      expected_dangerous_count: 0,
      fixture_slug_count: 0,
      remediation_plan_slug_count: 0,
      fixture_matches_remediation_plan: true,
      detail: "hermetic stub",
    },
    dangerous_slugs_all_blocked: true,
    proven_correct_slugs_all_pass: true,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        per_slug_guards: ".per_slug_guards",
        confusion_family_block_count: ".confusion_family_block_count",
        dangerous_count_regression: ".dangerous_count_regression",
      },
      recommended_next_action: "hermetic stub",
    },
  });

  writeJson(root, "data/fridge/batch-production/audits/anchor-integrity-audit-v1.json", {
    ...auditBase,
    contract: "anchor_integrity_audit_v1",
    anchor_health_summary: {
      healthy_count: 0,
      watchlist_count: 0,
      disputed_count: 0,
      sibling_conflict_disputed_count: 0,
      total_anchor_count: 0,
    },
    highest_risk_anchors: [],
    anchor_rows: [],
    families_with_disputed_or_watchlist_primary_anchor: [],
    inspect_summary: {
      recommended_jq_paths: {
        anchor_health_summary: ".anchor_health_summary",
        highest_risk_anchors: ".highest_risk_anchors",
        anchor_rows: ".anchor_rows",
      },
      recommended_next_action: "hermetic stub",
    },
  });

  writeJson(root, "data/fridge/batch-production/audits/dangerous-mapping-remediation-plan-v1.json", {
    ...auditBase,
    contract: "dangerous_mapping_remediation_plan_v1",
    source_audit_contract: "model_filter_correctness_audit_v1",
    source_audit_path: "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json",
    dangerous_model_count: 0,
    indexable_risk_page_count: 0,
    root_cause_groups: [],
    smallest_safe_remediation_sequence: [],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        root_cause_groups: ".root_cause_groups",
        smallest_safe_remediation_sequence: ".smallest_safe_remediation_sequence",
      },
      recommended_next_action: "hermetic stub",
    },
  });

  writeJson(root, "data/fridge/batch-production/audits/bad-mapping-correction-batch-runner-v1.json", {
    ...auditBase,
    contract: "bad_mapping_correction_batch_runner_v1",
    source_remediation_plan_contract: "dangerous_mapping_remediation_plan_v1",
    source_remediation_plan_path:
      "data/fridge/batch-production/audits/dangerous-mapping-remediation-plan-v1.json",
    source_audit_contract: "model_filter_correctness_audit_v1",
    source_audit_path: "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json",
    dangerous_slug_count: 0,
    correction_packets: [],
    hyperagent_research_batch_groups: [],
    recommended_first_batch_slugs: [],
    post_hyperagent_validation_checklist: [],
    classification_promotion_criteria: [],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        correction_packets: ".correction_packets",
        hyperagent_research_batch_groups: ".hyperagent_research_batch_groups",
        recommended_first_batch_slugs: ".recommended_first_batch_slugs",
      },
      recommended_next_action: "hermetic stub",
    },
  });

  writeJson(root, "data/fridge/batch-production/audits/family-reconciliation-v1.json", {
    ...auditBase,
    contract: "family_reconciliation_v1",
    families_screened: 0,
    families_with_conflicts: 0,
    severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 },
    hyperagent_validation_packets_loaded: 0,
    ranked_reconciliation_backlog: [],
    owner_review_packets: [],
    family_rows: [],
    inferred_facts: [],
  });
}

function writeFullCcFixture(root: string, evidence: Record<string, unknown> | null): void {
  writeSyntheticControlGraphStubs(root);
  writeText(root, CUSTOMER_LANGUAGE_DOCTRINE_REL_PATH, "# doctrine fixture\n");
  writeText(root, WATERDROP_DA29_00020B_RESEARCH_DRAFT_REL_PATH, "# draft fixture\n");
  writeText(root, WATERDROP_DA29_00020B_INSERT_PLAN_REL_PATH, "-- insert plan fixture\n");
  writeText(root, "data/affiliate/affiliate-application-tracker.json", TRACKER_AMAZON_ONLY_PENDING);
  if (evidence) writeJson(root, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH, evidence);
}

function withClearedEnv<T>(fn: () => Promise<T>): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS_TO_CLEAR) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  return fn().finally(() => {
    for (const k of ENV_KEYS_TO_CLEAR) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
}

function resolveNbaFromLane(input: {
  waterdropLiveProofSlice: boolean;
  waterdropProductionRowId: string | null;
}): ReturnType<typeof resolveCommandCenterNextBestActionV1> {
  return resolveCommandCenterNextBestActionV1({
    preferAmazonFirstConversion: false,
    affiliateApprovalPending: true,
    nonAmazonApproved: false,
    waterdropLiveProofSlice: input.waterdropLiveProofSlice,
    waterdropProductionRowId: input.waterdropProductionRowId,
    pendingNetworkOrPrograms: ["flexoffers"],
    topMoneyQueue: [
      { exhausted: true, candidate_count: 0, recommended_action: "n/a" },
      { exhausted: true, candidate_count: 0, recommended_action: "n/a" },
      { exhausted: true, candidate_count: 0, recommended_action: "n/a" },
    ],
    amazonFirstTokenHint: "n/a",
    amazonUnknownEvidenceDeferredCount: 0,
    amazonDeferredUnknownTopTokens: "n/a",
    flexoffersMonetizationBlocked: true,
    blockedLinkRecommendedFirstAction: OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
  });
}

async function buildFullCcReport(root: string) {
  return withClearedEnv(() =>
    buildBuckpartsCommandCenterReport({
      rootDir: root,
      now: () => new Date("2026-05-21T00:00:00.000Z"),
      env: {},
      liveSiteMonitor: null,
      writeAuthorityHistory: false,
      demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
      learningOutcomesReadModelLoader: async () =>
        degradedLearningOutcomesReadModelV1("UNKNOWN", ["hermetic"]),
      evidenceToLearningOutcomesCandidateImportLoader: async () =>
        ({
          contract: "evidence_to_learning_outcomes_candidate_import_v1",
          read_only: true,
          data_mutation: false,
          runtime_status: "OK",
          candidates: [],
          known_unknowns: [],
        }) as never,
      learningOutcomesConfidenceApprovalsLoader: () =>
        ({
          registry_relative_path: "data/ops/learning-outcomes-confidence-approvals.json",
          runtime_status: "OK",
          valid_approvals: [],
          invalid_entries: [],
          proven_facts: [],
          unknown_facts: [],
        }) as never,
      pagePublishabilityTruthSummaryLoader: async () =>
        ({
          contract: "page_publishability_truth_summary_v1",
          runtime_status: "UNKNOWN",
          sample_rows: [],
          known_unknowns: ["hermetic"],
        }) as never,
      fileExists: existsSync,
      readDir: (p) => (existsSync(p) ? readdirSync(p) : []),
      readTextFile: (abs) => readFileSync(abs, "utf8"),
      providers: {
        commandSurface: async () =>
          ({
            system_health: { status: "WARNING", reasons: ["warning"] },
            recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
            trend: { overall_trend: "UNKNOWN" },
            known_unknowns: [],
          }) as never,
        affiliateTracker: () =>
          ({
            status_counts: {
              NOT_STARTED: 0,
              DRAFTING: 1,
              SUBMITTED: 0,
              IN_REVIEW: 0,
              APPROVED: 1,
              REJECTED: 1,
              REAPPLY_REQUIRED: 0,
              PAUSED_OR_INACTIVE: 0,
            },
            records_approved: ["amazon-associates"],
            known_unknowns: [],
          }) as never,
        blockedLinkQueue: async () =>
          ({
            report_name: "buckparts_blocked_link_money_queue_v1",
            total_blocked_links: 1,
            top_blocked_states: [],
            top_blocked_retailer_keys: [],
            recommended_first_action: OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
            known_unknowns: [],
          }) as never,
        oemNextMoneyCohort: async () =>
          ({
            report_name: "buckparts_oem_catalog_next_money_cohort_v1",
            total_remaining_rows: 0,
            recommended_next_cohort: "n/a",
            known_unknowns: [],
          }) as never,
        frigidaireDeadOem: async () =>
          ({
            all_resolved: true,
            targets: [],
            recommended_next_action: "n/a",
            known_unknowns: [],
          }) as never,
        frigidaireNextCandidates: async () =>
          ({
            report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
            runtime_status: "OK",
            candidates: [],
            recommended_next_action: "n/a",
            known_unknowns: [],
          }) as never,
        amazonFirstBlockedQueue: async () =>
          ({
            report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
            generated_at: "2026-05-01T00:00:00.000Z",
            read_only: true,
            data_mutation: false,
            selection_table: "retailer_links",
            total_pool_rows: 0,
            already_live_noop_count: 0,
            needs_amazon_search_count: 0,
            unknown_evidence_deferred_count: 0,
            unknown_evidence_deferred: [],
            top_candidates: [],
            known_unknowns: [],
          }) as never,
        clickEventsSnapshot: async () => unavailableClickSnapshot(["hermetic"]),
      },
    }),
  );
}

function assertNoWaterdropMonitor(nba: string): void {
  assert.notEqual(nba, EXACT_WATERDROP_MONITOR_NBA);
  assert.equal(WATERDROP_MONITOR_NBA.test(nba), false);
  assert.equal(DEMAND_SELECTED_NBA.test(nba), false);
}

// --- Component-level hermetic ---

test("Waterdrop LIVE hermetic fixture asserts exact monitor NBA; no demand-selected alternate", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-hermetic-live-"));
  try {
    writeMinimalWaterdropFixture(root, liveEvidence());
    const lane = buildCustomerLanguageAndWaterdropResearchLaneV1({
      rootDir: root,
      fileExists: existsSync,
    });
    assert.equal(lane.waterdrop_live_cta_status, "LIVE");
    assert.equal(lane.waterdrop_production_row_id, WATERDROP_ROW_ID);
    assert.equal(lane.mutation_authority, false);

    const nba = resolveNbaFromLane({
      waterdropLiveProofSlice: true,
      waterdropProductionRowId: lane.waterdrop_production_row_id,
    });
    assert.equal(nba.next_best_action, EXACT_WATERDROP_MONITOR_NBA);
    assert.equal(DEMAND_SELECTED_NBA.test(nba.next_best_action), false);
    assert.match(nba.why_this_action, /Waterdrop DA29-00020B proof slice is LIVE/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Waterdrop hermetic fixture fails exact invariant when LIVE evidence is removed", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-hermetic-rm-"));
  try {
    writeMinimalWaterdropFixture(root, liveEvidence());
    unlinkSync(path.join(root, WATERDROP_DA29_00020B_EVIDENCE_REL_PATH));
    const lane = buildCustomerLanguageAndWaterdropResearchLaneV1({
      rootDir: root,
      fileExists: existsSync,
    });
    assert.notEqual(lane.waterdrop_live_cta_status, "LIVE");

    const nba = resolveNbaFromLane({
      waterdropLiveProofSlice: false,
      waterdropProductionRowId: null,
    });
    assert.match(nba.next_best_action, STALE_NON_AMAZON_NBA);
    assertNoWaterdropMonitor(nba.next_best_action);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Waterdrop hermetic fixture fails exact invariant when LIVE evidence is contradicted", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-hermetic-contra-"));
  try {
    writeMinimalWaterdropFixture(root, {
      ...liveEvidence(),
      waterdrop_live_cta_status: "NOT_LIVE",
      insert_outcome: "NOT_COMMITTED",
    });
    const lane = buildCustomerLanguageAndWaterdropResearchLaneV1({
      rootDir: root,
      fileExists: existsSync,
    });
    assert.notEqual(lane.waterdrop_live_cta_status, "LIVE");

    const nba = resolveNbaFromLane({
      waterdropLiveProofSlice: false,
      waterdropProductionRowId: lane.waterdrop_production_row_id,
    });
    assert.match(nba.next_best_action, STALE_NON_AMAZON_NBA);
    assertNoWaterdropMonitor(nba.next_best_action);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Full Command Center integration (real buildBuckpartsCommandCenterReport) ---

test("full CC synthetic: Waterdrop LIVE reaches exact final root monitor NBA", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-full-cc-live-"));
  try {
    writeFullCcFixture(root, liveEvidence());
    const report = await buildFullCcReport(root);
    const wd = report.command_center_v2.customer_language_and_waterdrop_research_lane_v1;
    const steer = report.command_center_v2.customer_steering_comparison_v1?.factory_steering;

    assert.equal(wd.waterdrop_live_cta_status, "LIVE");
    assert.equal(wd.waterdrop_production_row_id, WATERDROP_ROW_ID);
    assert.equal(wd.mutation_authority, false);
    assert.equal(report.affiliate_readiness_summary.affiliate_approval_pending, true);
    assert.equal(report.command_center_v2.affiliate_readiness.status, "ATTENTION");
    assert.equal(steer?.steering_override_source, "root_resolve");
    assert.equal(report.next_best_action, EXACT_WATERDROP_MONITOR_NBA);
    assert.equal(DEMAND_SELECTED_NBA.test(report.next_best_action), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("full CC synthetic: missing Waterdrop evidence does not produce monitor NBA", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-full-cc-missing-"));
  try {
    writeFullCcFixture(root, null);
    const report = await buildFullCcReport(root);
    assert.notEqual(
      report.command_center_v2.customer_language_and_waterdrop_research_lane_v1.waterdrop_live_cta_status,
      "LIVE",
    );
    assertNoWaterdropMonitor(report.next_best_action);
    assert.match(report.next_best_action, STALE_NON_AMAZON_NBA);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("full CC synthetic: contradictory NOT_LIVE evidence does not produce monitor NBA", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "wd-full-cc-contra-"));
  try {
    writeFullCcFixture(root, {
      ...liveEvidence(),
      waterdrop_live_cta_status: "NOT_LIVE",
      insert_outcome: "NOT_COMMITTED",
    });
    const report = await buildFullCcReport(root);
    assert.notEqual(
      report.command_center_v2.customer_language_and_waterdrop_research_lane_v1.waterdrop_live_cta_status,
      "LIVE",
    );
    assertNoWaterdropMonitor(report.next_best_action);
    assert.match(report.next_best_action, STALE_NON_AMAZON_NBA);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
