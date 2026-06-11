import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildDemandToCoverageEngineV1FromRows } from "./lib/demand-to-coverage-engine-v1";
import { buildRefrigeratorModelFirstTruthAuditV1 } from "./lib/refrigerator-model-first-truth-audit-v1";
import { buildEvidenceToLearningOutcomesCandidateImportV1 } from "./lib/evidence-to-learning-outcomes-candidate-import-v1";
import {
  buildLearningOutcomesInsertPlanV1,
  buildLearningOutcomesOwnerConfidenceAssignmentPlanV1,
  buildLearningOutcomesWriterReadyBatchReviewV1,
} from "./lib/learning-outcomes-insert-plan-v1";
import {
  buildLearningOutcomesConfidenceApprovalRegistryV1,
  createConfidenceApprovalLookup,
  loadLearningOutcomesConfidenceApprovalsRegistry,
} from "./lib/learning-outcomes-confidence-approvals-registry-v1";
import { evaluateOwnerDashboardTopOfGamePanelProofV1 } from "./lib/owner-dashboard-top-of-game-panel-readiness-v1";
import { TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1 } from "./lib/top-of-game-foundation-scorecard-v1";
import { degradedLearningOutcomesReadModelV1 } from "./lib/learning-outcomes-read-model-v1";
import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesConfidenceApprovalRegistryV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesInsertPlanV1,
  LearningOutcomesReadModelV1,
  LearningOutcomesOwnerConfidenceAssignmentPlanV1,
  LearningOutcomesWriterReadyBatchReviewV1,
  LiveSiteMonitorV1,
  ProposedLearningOutcomeRowV1,
  PublicTrustUnificationBackendContractV1,
  RevenueTruthLedgerContractV1,
  TopOfGameFoundationScorecardV1,
} from "./lib/buckparts-command-center-v2-types";
import {
  buildPublicTrustUnificationBackendContractV1,
  PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1,
} from "./lib/public-trust-unification-backend-contract-v1";
import {
  buildRevenueTruthLedgerContractV1,
  REVENUE_LEDGER_FILE_RELATIVE_V1,
} from "./lib/revenue-truth-ledger-contract-v1";
import { buildExternalMeasurementFreshnessV1 } from "../src/lib/owner-dashboard/external-measurement-freshness-v1";
import type { Ga4TrustFunnelArtifact } from "../src/lib/owner-dashboard/ga4-trust-funnel-artifact";
import {
  buildPagePublishabilityTruthSummaryV1,
} from "./lib/buckparts-page-publishability-truth-v1";
import { OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1 } from "../src/lib/copy/customer-language-doctrine";
import {
  buildBuckpartsCommandCenterReport,
  stripEvidenceUncappedCandidatesForStdout,
} from "./report-buckparts-command-center";

const BASE_TRACKER = JSON.stringify([
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
    id: "repairclinic",
    network: "UNKNOWN",
    retailer: "RepairClinic",
    programUrl: null,
    status: "DRAFTING",
    submittedAt: null,
    lastStatusAt: null,
    decisionAt: null,
    rejectionReason: null,
    nextAction: "Prepare submission",
    nextActionDueAt: null,
    notes: null,
    tagVerified: null,
    tagVerifiedAt: null,
    tagValue: null,
  },
]);

const MINIMAL_TOKEN_CONTROLS_JSON = JSON.stringify({
  schema_version: "1",
  entries: [
    {
      token: "LT1000P",
      status: "LIVE_OUTCOME_RECORDED",
      reason: "test fixture live",
      next_action: "NO_AUTOMATED_AMAZON_RESCUE_FOR_THIS_TOKEN",
      can_agent_advance: false,
      evidence_file: "amazon-lt1000p-live-outcome.2026-05-03.json",
    },
    {
      token: "4396508",
      status: "UNKNOWN_EVIDENCE_RECORDED",
      reason: "test fixture unknown",
      next_action: "HUMAN_BROWSER_VERIFICATION_OR_NEW_EVIDENCE_FILE",
      can_agent_advance: false,
      evidence_file: "amazon-4396508-unknown-outcome.2026-05-03.json",
    },
    {
      token: "ADQ75795101",
      status: "FROZEN_OPERATOR_HOLD",
      reason: "test fixture frozen",
      next_action: "OWNER_RELEASES_OR_REPOINTS_QUEUE_PRIORITY",
      can_agent_advance: false,
    },
  ],
});

function fileExistsTokenControlsOnly(abs: string) {
  return abs.endsWith("data/ops/amazon-rescue-token-controls.json");
}

function readTextFileTrackerOrControls(abs: string) {
  if (abs.endsWith("amazon-rescue-token-controls.json")) return MINIMAL_TOKEN_CONTROLS_JSON;
  if (abs.endsWith("affiliate-application-tracker.json")) return BASE_TRACKER;
  return "{}";
}

/** Tracker JSON mock for affiliate file; real repo bytes for data/CSV paths (AP model-first lane). */
function readTextFileTrackerOrRepoData(abs: string, trackerJson: string = BASE_TRACKER) {
  if (abs.endsWith("affiliate-application-tracker.json")) return trackerJson;
  if (!fs.existsSync(abs)) return "";
  return fs.readFileSync(abs, "utf8");
}

function refrigeratorModelFirstSteeringActive(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): boolean {
  return report.next_best_action.startsWith("REFRIGERATOR MODEL-FIRST [READY]:");
}

function issueRegistryTier0SteeringActive(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): boolean {
  return report.next_best_action.startsWith("ISSUE REGISTRY TIER_0:");
}

function issueReauditSteeringActive(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): boolean {
  return report.next_best_action.startsWith("ISSUE RE-AUDIT:");
}

function lifecycleOwnsOwnerFacingExecutionGuidance(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): boolean {
  return report.next_best_action.startsWith("LIFECYCLE [");
}

function assertLifecycleOwnedExecutionGuidanceBlocked(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): void {
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.ok(
    report.execution_guidance.mutating_block_reasons.some((reason) =>
      reason.includes("universal_batch_lifecycle_truth_table_v1:mutation_authorized=false"),
    ),
  );
  assert.doesNotMatch(
    report.execution_guidance.mutating_block_reasons.join("\n"),
    /fridge_buyer_path_batch_apply_plan/,
  );
}

function amazonQueueOkMock(overrides: Partial<{ needs: number; tokens: string[] }> = {}) {
  const needs = overrides.needs ?? 0;
  const tokens = overrides.tokens ?? [];
  const top = tokens.map((token, i) => ({
    link_id: `id-${i}`,
    filter_id: `f-${i}`,
    filter_slug: token.toLowerCase(),
    retailer_key: "oem-catalog",
    blocked_url: `https://example.com/search?q=${token}`,
    token,
    domain: "example.com",
    domain_blocked_count: 1,
    current_live_amazon_slot_status: null,
    recommended_search_query: token,
    recommended_next_action: "SEARCH_AMAZON_EXACT_TOKEN" as const,
  }));
  return async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: needs + top.length,
      already_live_noop_count: 0,
      needs_amazon_search_count: needs,
      unknown_evidence_deferred_count: 0,
      unknown_evidence_deferred: [],
      top_candidates: top,
      known_unknowns: [],
    }) as never;
}

function amazonQueueWithDeferredMock(args: { tokens: string[]; deferredTokens: string[] }) {
  const top = args.tokens.map((token, i) => ({
    link_id: `id-${i}`,
    filter_id: `f-${i}`,
    filter_slug: token.toLowerCase(),
    retailer_key: "oem-catalog",
    blocked_url: `https://example.com/search?q=${token}`,
    token,
    domain: "example.com",
    domain_blocked_count: 1,
    current_live_amazon_slot_status: null,
    recommended_search_query: token,
    recommended_next_action: "SEARCH_AMAZON_EXACT_TOKEN" as const,
  }));
  const deferred = args.deferredTokens.map((token, i) => ({
    link_id: `def-${i}`,
    filter_id: `df-${i}`,
    filter_slug: token.toLowerCase(),
    retailer_key: "oem-catalog",
    blocked_url: `https://example.com/search?q=${token}`,
    token,
    domain: "example.com",
    domain_blocked_count: 1,
    current_live_amazon_slot_status: null,
    recommended_search_query: token,
    recommended_next_action: "HUMAN_BROWSER_VERIFICATION_REQUIRED" as const,
  }));
  return async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: top.length + deferred.length,
      already_live_noop_count: 0,
      needs_amazon_search_count: top.length,
      unknown_evidence_deferred_count: deferred.length,
      unknown_evidence_deferred: deferred,
      top_candidates: top,
      known_unknowns: [],
    }) as never;
}

function amazonQueueUnknownMock() {
  return async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: "UNKNOWN",
      already_live_noop_count: "UNKNOWN",
      needs_amazon_search_count: "UNKNOWN",
      top_candidates: "UNKNOWN",
      known_unknowns: ["retailer_links/filters dataset unavailable"],
    }) as never;
}

function baseProviders() {
  return {
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
          REJECTED: 0,
          REAPPLY_REQUIRED: 0,
          PAUSED_OR_INACTIVE: 0,
        },
        records_approved: ["amazon-associates"],
        known_unknowns: [],
      }) as never,
    blockedLinkQueue: async () =>
      ({
        report_name: "buckparts_blocked_link_money_queue_v1",
        total_blocked_links: 5,
        top_blocked_states: [{ state: "BLOCKED_SEARCH_OR_DISCOVERY", count: 5 }],
        top_blocked_retailer_keys: [{ retailer_key: "oem-catalog", blocked_count: 5, inferred_importance_count: 5 }],
        recommended_first_action: OWNER_MANUFACTURER_CATALOG_SEARCH_REMEDIATION_V1,
        known_unknowns: [],
      }) as never,
    oemNextMoneyCohort: async () =>
      ({
        report_name: "buckparts_oem_catalog_next_money_cohort_v1",
        total_remaining_rows: 4,
        recommended_next_cohort: "Start with retailer_links rows on domain www.repairclinic.com.",
        known_unknowns: [],
      }) as never,
    frigidaireDeadOem: async () =>
      ({
        all_resolved: true,
        targets: [{ found: true }],
        recommended_next_action: "Use resolved link IDs.",
        known_unknowns: [],
      }) as never,
    frigidaireNextCandidates: async () =>
      ({
        report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
        runtime_status: "OK",
        candidates: [{ filter_slug: "foo" }],
        recommended_next_action:
          "Start with candidates already containing direct_buyable non-manufacturer-catalog links.",
        known_unknowns: [],
      }) as never,
    amazonFirstBlockedQueue: amazonQueueOkMock({ needs: 0, tokens: [] }),
    clickEventsSnapshot: async () => {
      const { clickSnapshotForTests } = await import("./lib/buckparts-click-events-snapshot");
      return clickSnapshotForTests();
    },
  };
}

test("command center is read_only true and data_mutation false", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrRepoData,
  });
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.command_center_v2.read_only, true);
  assert.equal(report.command_center_v2.data_mutation, false);
  assert.equal(report.command_center_v2.demand_to_coverage_engine_v1.contract, "demand_to_coverage_engine_v1");
  assert.equal(
    report.command_center_v2.learning_outcomes_read_model_v1.contract,
    "learning_outcomes_read_model_v1",
  );
  assert.equal(
    report.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1.contract,
    "evidence_to_learning_outcomes_candidate_import_v1",
  );
  assert.equal(report.command_center_v2.learning_outcomes_insert_plan_v1.contract, "learning_outcomes_insert_plan_v1");
  const batchLane = report.command_center_v2.batch_production_owner_decisions_lane_v1;
  assert.equal(batchLane.contract, "batch_production_owner_decisions_lane_v1");
  assert.equal(batchLane.may_mutate, false);
  assert.equal(batchLane.mutation_authority, false);
  assert.equal(batchLane.batch_size_20_status, "BLOCKED");
  const langLane = report.command_center_v2.customer_language_and_waterdrop_research_lane_v1;
  assert.equal(langLane.contract, "customer_language_and_waterdrop_research_lane_v1");
  assert.equal(langLane.read_only, true);
  assert.equal(langLane.data_mutation, false);
  assert.equal(langLane.mutation_authority, false);
  assert.equal(langLane.customer_language_doctrine_path, "docs/BuckParts-CUSTOMER-LANGUAGE-AND-DEFINITIONS.md");
  assert.match(langLane.no_oem_cold_rule, /must not use OEM unless defined/i);
  assert.equal(
    langLane.waterdrop_research_draft_path,
    "docs/drafts/waterdrop-da29-00020b-oem-vs-compatible-trust-module-v1.md",
  );
  assert.equal(langLane.waterdrop_live_cta_status, "LIVE");
  assert.equal(langLane.waterdrop_production_row_id, "d4cbad0c-4bab-4854-89bf-59e6d6492c6b");
  assert.equal(
    langLane.waterdrop_evidence_path,
    "data/evidence/waterdrop-da29-00020b-live-outcome.2026-05-20.json",
  );
  assert.equal(langLane.waterdrop_research_draft_published, false);
  assert.ok(langLane.first_verified_waterdrop_non_amazon_dtc_slice_note?.includes("proof slice"));
  const pt = report.command_center_v2.public_trust_unification_backend_contract_v1;
  assert.equal(pt.contract, "public_trust_unification_backend_contract_v1");
  assert.equal(pt.read_only, true);
  assert.equal(pt.data_mutation, false);
  assert.equal(pt.owner_approval_required, false);
  assertPublicTrustContractNoBannedClaims(pt);
  const ledger = report.command_center_v2.revenue_truth_ledger_contract_v1;
  assert.equal(ledger.contract, "revenue_truth_ledger_contract_v1");
  assert.equal(ledger.read_only, true);
  assert.equal(ledger.data_mutation, false);
  assert.equal(ledger.owner_approval_required, false);
  assertRevenueLedgerContractNoBannedClaims(ledger);
  const tog = report.command_center_v2.top_of_game_foundation_scorecard_v1;
  assert.equal(tog.contract, "top_of_game_foundation_scorecard_v1");
  assert.equal(tog.read_only, true);
  assert.equal(tog.data_mutation, false);
  assert.equal(tog.owner_dashboard_ready, true);
  assert.equal(tog.lanes.reduce((s, l) => s + l.max_contribution, 0), 100);
  assert.equal(tog.goal_reached, tog.foundation_maturity_score_100 === 100 && tog.lanes.every((l) => l.status === "PROVEN"));
  assertFoundationScorecardNoBannedClaims(tog);
  const crs = report.command_center_v2.customer_reality_scoreboard_v1;
  assert.equal(crs.contract, "customer_reality_scoreboard_v1");
  assert.equal(crs.read_only, true);
  assert.equal(crs.data_mutation, false);
  assert.equal(crs.mutation_authorized, false);
  assert.equal(crs.recommended_next_customer_action_dry_run.dry_run_only, true);
  assert.equal(crs.recommended_next_customer_action_dry_run.replaces_next_best_action, false);
  assert.ok(crs.verified_buyer_path_coverage.source_lanes.includes("all_product_safe_buyer_path_census_v1"));
  assert.ok(
    ["PROVEN", "INFERRED", "UNKNOWN"].includes(crs.verified_buyer_path_coverage.evidence_basis),
  );
  assert.ok(typeof report.next_best_action === "string" && report.next_best_action.length > 0);
  assert.notEqual(
    crs.recommended_next_customer_action_dry_run.action,
    report.next_best_action,
    "dry-run must not replace next_best_action string",
  );
  const csc = report.command_center_v2.customer_steering_comparison_v1;
  assert.equal(csc.contract, "customer_steering_comparison_v1");
  assert.equal(csc.read_only, true);
  assert.equal(csc.data_mutation, false);
  assert.equal(csc.mutation_authorized, false);
  assert.equal(csc.dry_run_only, true);
  assert.equal(csc.replaces_next_best_action, false);
  assert.equal(
    csc.next_customer_action_dry_run.action,
    crs.recommended_next_customer_action_dry_run.action,
  );
  assert.equal(csc.factory_steering.next_best_action, report.next_best_action);
  assert.equal(typeof csc.comparison.conflicts_with_next_best_action, "boolean");
  assert.ok(csc.source_lanes.includes("customer_reality_scoreboard_v1"));
  assert.ok(csc.source_lanes.includes("next_best_action"));
  const ccr = report.command_center_v2.customer_closure_report_v1;
  assert.equal(ccr.contract, "customer_closure_report_v1");
  assert.equal(ccr.read_only, true);
  assert.equal(ccr.data_mutation, false);
  assert.equal(ccr.mutation_authorized, false);
  assert.equal(typeof ccr.customer_visible_closures_count, "number");
  assert.equal(typeof ccr.promoted_missions_count, "number");
  assert.equal(typeof ccr.closure_candidates_count, "number");
  assert.ok(["PROVEN", "INFERRED", "UNKNOWN", "LOW"].includes(ccr.closure_confidence));
  assert.ok(ccr.source_lanes.includes("mission_factory_registry_v1"));
  assert.ok(ccr.source_lanes.includes("fridge_guarded_batch_closeout_learning_v1"));
  assert.ok(ccr.source_lanes.includes("all_product_safe_buyer_path_census_v1"));
  assert.ok(Array.isArray(ccr.customer_visible_shipments));
  const cas = report.command_center_v2.customer_authority_score_v1;
  assert.equal(cas.contract, "customer_authority_score_v1");
  assert.equal(cas.read_only, true);
  assert.equal(cas.data_mutation, false);
  assert.equal(cas.mutation_authorized, false);
  assert.equal(cas.replaces_next_best_action, false);
  assert.ok(["PROVEN", "INFERRED", "UNKNOWN"].includes(cas.evidence_basis));
  assert.ok(
    typeof cas.authority_score_100 === "number" || cas.authority_score_100 === "UNKNOWN",
  );
  assert.ok(
    ["VISIBILITY_ONLY", "ADVISORY_COMPARE", "AUTHORITY_GATED_ACTIVE"].includes(cas.authority_mode),
  );
  assert.equal(cas.retrospective.point_in_time_measurable, true);
  assert.equal(cas.retrospective.trend_measurable, false);
  assert.equal(cas.retrospective.steering_history_logged, false);
  assert.equal(cas.retrospective.closure_registry_present, false);
  assert.equal(cas.components.wrong_part_exposure.reduction_measurable, false);
  assert.equal(cas.components.customer_steering.source_lane, "customer_steering_comparison_v1");
  assert.equal(cas.components.closure_proof.source_lane, "customer_closure_report_v1");
  assert.notEqual(report.next_best_action, "");
  const cah = report.command_center_v2.customer_authority_history_status_v1;
  assert.equal(cah.contract, "customer_authority_history_status_v1");
  assert.equal(cah.read_only, true);
  assert.equal(cah.data_mutation, false);
  assert.equal(cah.mutation_authorized, false);
  assert.equal(typeof cah.snapshot_count, "number");
  assert.equal(typeof cah.trend_measurable, "boolean");
  assert.equal(typeof cah.steering_history_logged, "boolean");
  assert.equal(cah.last_append_attempt, null);
  const cao = report.command_center_v2.customer_authority_outcomes_v1;
  assert.equal(cao.contract, "customer_authority_outcomes_v1");
  assert.equal(cao.read_only, true);
  assert.equal(cao.data_mutation, false);
  assert.equal(cao.mutation_authorized, false);
  assert.equal(cao.recommended_jq_path, ".command_center_v2.customer_authority_outcomes_v1");
  assert.equal(typeof cao.snapshot_count, "number");
  assert.ok(cao.snapshot_count >= 1);
  assert.equal(typeof cao.outcome_window_days, "number");
  assert.ok(
    [
      "INSUFFICIENT_HISTORY",
      "CUSTOMER_STEERING_SIGNAL_POSITIVE",
      "CUSTOMER_STEERING_SIGNAL_NEGATIVE",
      "MIXED",
      "UNKNOWN",
    ].includes(cao.current_verdict),
  );
  assert.ok(Array.isArray(cao.evaluated_snapshots));
});

test("writeAuthorityHistory appends snapshot and surfaces last_append_attempt", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrRepoData,
    writeAuthorityHistory: true,
    now: () => new Date("2099-01-15T12:00:00.000Z"),
  });
  const cah = report.command_center_v2.customer_authority_history_status_v1;
  assert.equal(cah.last_append_attempt?.wrote, true);
  assert.equal(
    cah.last_append_attempt?.rel_path,
    "data/command-center/customer-authority-history/2099-01-15.json",
  );
  assert.equal(cah.steering_history_logged, true);
  const rel = cah.last_append_attempt?.rel_path;
  if (rel) {
    fs.rmSync(path.join(rootDir, rel), { force: true });
  }
});

test("owner_dashboard_top_of_game_panel_proof_v1 all_markers_present on this repo checkout", () => {
  const rootDir = path.resolve(__dirname, "..");
  const p = evaluateOwnerDashboardTopOfGamePanelProofV1({
    rootDir,
    fileExists: fs.existsSync,
    readTextFile: (abs) => fs.readFileSync(abs, "utf8"),
  });
  assert.equal(p.contract, "owner_dashboard_top_of_game_panel_proof_v1");
  assert.equal(p.runtime_status, "OK");
  assert.equal(p.all_markers_present, true);
});

test("owner_dashboard_top_of_game_panel_proof_v1 fails when dashboard source omits markers", () => {
  const rootDir = path.resolve(__dirname, "..");
  const p = evaluateOwnerDashboardTopOfGamePanelProofV1({
    rootDir,
    fileExists: () => true,
    readTextFile: () => `export default function Page() { return null; }`,
  });
  assert.equal(p.all_markers_present, false);
  assert.ok(p.unknown_facts.length > 0);
});

test("command_center_v2 top_of_game owner_dashboard_ready true with real fs readTextFile on this repo", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: (p) => fs.readFileSync(p, "utf8"),
  });
  assert.equal(report.command_center_v2.top_of_game_foundation_scorecard_v1.owner_dashboard_ready, true);
  assert.ok(
    report.command_center_v2.top_of_game_foundation_scorecard_v1.owner_dashboard_note.includes(
      "TopOfGameFoundationSection",
    ),
  );
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command_center_v2 top_of_game owner_dashboard_ready false when dashboard path reads stub without markers", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const dashAbs = path.join(rootDir, "src", "app", "ownerdashboard", "[secret]", "page.tsx");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: (p) => (p === dashAbs ? "// stub without panel markers" : fs.readFileSync(p, "utf8")),
  });
  assert.equal(report.command_center_v2.top_of_game_foundation_scorecard_v1.owner_dashboard_ready, false);
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command center surfaces search_and_click_intelligence_summary from command surface", async () => {
  const providers = baseProviders();
  providers.commandSurface = async () =>
    ({
      system_health: { status: "WARNING", reasons: ["warning"] },
      recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
      trend: { overall_trend: "UNKNOWN" },
      known_unknowns: [],
      search_and_click_intelligence_summary: {
        runtime_status: "OK",
        window_days: { short: 7, long: 30 },
        search_events: {
          last_7d: 12,
          last_30d: 50,
          zero_result_last_7d: 3,
          zero_result_last_30d: 7,
          zero_result_rate_last_7d: 0.25,
          zero_result_rate_last_30d: 0.14,
        },
        search_gaps_backlog: {
          open: 4,
          reviewing: 2,
          queued: 1,
          total_actionable: 7,
        },
        click_events: {
          last_7d: 20,
          last_30d: 77,
        },
        known_unknowns: [],
      },
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });

  assert.equal(report.search_and_click_intelligence_summary.runtime_status, "OK");
  assert.equal(report.search_and_click_intelligence_summary.search_events.last_7d, 12);
  assert.equal(report.search_and_click_intelligence_summary.search_gaps_backlog.total_actionable, 7);
  assert.equal(report.search_and_click_intelligence_summary.click_events.last_30d, 77);
});

test("command center surfaces money_funnel_summary from command surface", async () => {
  const providers = baseProviders();
  providers.commandSurface = async () =>
    ({
      system_health: { status: "WARNING", reasons: ["warning"] },
      recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
      trend: { overall_trend: "UNKNOWN" },
      known_unknowns: [],
      money_funnel_summary: {
        runtime_status: "OK",
        window_days: { short: 7, long: 30 },
        stages_30d: {
          search_events_total: 100,
          search_zero_result_total: 25,
          search_gap_actionable_total: 9,
          click_events_total: 30,
          safe_cta_links_total: 11,
        },
        derived_rates_30d: {
          zero_result_rate: 0.25,
          clicks_per_search_event: 0.3,
        },
        known_unknowns: [],
      },
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });

  assert.equal(report.money_funnel_summary.runtime_status, "OK");
  assert.equal(report.money_funnel_summary.stages_30d.search_events_total, 100);
  assert.equal(report.money_funnel_summary.stages_30d.safe_cta_links_total, 11);
  assert.equal(report.money_funnel_summary.derived_rates_30d.clicks_per_search_event, 0.3);
});

test("command center surfaces rescue_velocity_summary from command surface", async () => {
  const providers = baseProviders();
  providers.commandSurface = async () =>
    ({
      system_health: { status: "WARNING", reasons: ["warning"] },
      recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
      trend: { overall_trend: "UNKNOWN" },
      known_unknowns: [],
      rescue_velocity_summary: {
        runtime_status: "OK",
        window_days: { short: 7, long: 30 },
        current_backlog: {
          blocked_or_unsafe_links: 10,
          blocked_search_or_discovery: 8,
          search_gap_actionable_total: 3,
        },
        resolved_signals: {
          safe_cta_links_total: 5,
          direct_buyable_links_total: 4,
          learning_outcomes_total: 12,
        },
        derived_rates: {
          safe_cta_share_of_known_links: 0.25,
          blocked_to_safe_ratio: 2,
        },
        known_unknowns: [],
      },
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });

  assert.equal(report.rescue_velocity_summary.runtime_status, "OK");
  assert.equal(report.rescue_velocity_summary.current_backlog.blocked_search_or_discovery, 8);
  assert.equal(report.rescue_velocity_summary.resolved_signals.learning_outcomes_total, 12);
  assert.equal(report.rescue_velocity_summary.derived_rates.blocked_to_safe_ratio, 2);
});

test("command center surfaces rescue_delta_trend_summary from command surface", async () => {
  const providers = baseProviders();
  providers.commandSurface = async () =>
    ({
      system_health: { status: "WARNING", reasons: ["warning"] },
      recommended_next_step: "Resolve warning-level command-surface issues before expanding.",
      trend: { overall_trend: "UNKNOWN" },
      known_unknowns: [],
      rescue_delta_trend_summary: {
        runtime_status: "OK",
        window_days: { short: 7, long: 30 },
        current: {
          blocked_or_unsafe_links: 200,
          blocked_search_or_discovery: 140,
          safe_cta_links_total: 50,
          search_gap_actionable_total: 2,
        },
        deltas: {
          blocked_or_unsafe_links_delta: -1,
          blocked_search_or_discovery_delta: -2,
          safe_cta_links_delta: 1,
          search_gap_actionable_delta: -1,
        },
        net_rescue_direction: "IMPROVING",
        known_unknowns: [],
      },
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });

  assert.equal(report.rescue_delta_trend_summary.runtime_status, "OK");
  assert.equal(report.rescue_delta_trend_summary.current.blocked_search_or_discovery, 140);
  assert.equal(report.rescue_delta_trend_summary.deltas.safe_cta_links_delta, 1);
  assert.equal(report.rescue_delta_trend_summary.net_rescue_direction, "IMPROVING");
});

test("includes amazon_first_blocked_queue_summary with runtime OK when queue resolves", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({
    needs: 3,
    tokens: ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.amazon_first_blocked_queue_summary.runtime_status, "OK");
  assert.equal(report.amazon_first_blocked_queue_summary.needs_amazon_search_count, 3);
  assert.equal(report.amazon_first_blocked_queue_summary.unknown_evidence_deferred_count, 0);
  assert.deepEqual(report.amazon_first_blocked_queue_summary.deferred_unknown_top_tokens, []);
  assert.equal(report.amazon_first_blocked_queue_summary.top_candidate_count, 6);
  assert.deepEqual(report.amazon_first_blocked_queue_summary.top_5_tokens, [
    "AAA",
    "BBB",
    "CCC",
    "DDD",
    "EEE",
  ]);
  assert.equal(
    report.amazon_first_blocked_queue_summary.recommended_next_action.includes("SEARCH_AMAZON_EXACT_TOKEN"),
    true,
  );
});

test("NBA prefers Amazon-first rescue when Amazon verified, needs search, no other APPROVED affiliate", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({
    needs: 2,
    tokens: ["TOK1", "TOK2"],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  if (refrigeratorModelFirstSteeringActive(report)) return;
  if (report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_UNKNOWN]")) return;
  assert.match(report.next_best_action, /Amazon-first blocked-search rescue/i);
  assert.ok(!/\bOEM\b/.test(report.next_best_action));
  assert.match(report.next_best_action, /TOK1/);
  assert.equal(/Rerun affiliate tracker \+ command surface/i.test(report.next_best_action), false);
  assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
  assert.equal(
    report.execution_guidance.next_move_command,
    "npm run buckparts:amazon-first-blocked-queue",
  );
});

test("does not choose Amazon-first NBA when queue is UNKNOWN", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueUnknownMock();
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.amazon_first_blocked_queue_summary.runtime_status, "UNKNOWN");
  assert.equal(/Amazon-first blocked-search rescue/i.test(report.next_best_action), false);
});

test("execution_guidance block exists with required fields", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({ needs: 1, tokens: ["T1"] });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(typeof report.execution_guidance.next_move_command, "string");
  assert.equal(
    report.execution_guidance.next_move_mode === "READ_ONLY" ||
      report.execution_guidance.next_move_mode === "MUTATING",
    true,
  );
  assert.equal(typeof report.execution_guidance.mutating_blocked, "boolean");
  assert.equal(Array.isArray(report.execution_guidance.mutating_block_reasons), true);
  assert.equal(Array.isArray(report.execution_guidance.staleness_or_dirty_risk), true);
});

test("execution_guidance marks mutating blocked when queue is UNKNOWN/missing evidence inputs", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueUnknownMock();
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  if (lifecycleOwnsOwnerFacingExecutionGuidance(report)) {
    assertLifecycleOwnedExecutionGuidanceBlocked(report);
    return;
  }
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.equal(
    report.execution_guidance.mutating_block_reasons.some((r) =>
      r.includes("amazon_first_blocked_queue_summary runtime_status is UNKNOWN"),
    ),
    true,
  );
});

test("execution_guidance blocks mutation when command surface is CRITICAL", async () => {
  const providers = baseProviders();
  providers.commandSurface = async () =>
    ({
      system_health: { status: "CRITICAL", reasons: ["critical"] },
      recommended_next_step: "Resolve critical command-surface blockers before expanding.",
      trend: { overall_trend: "UNKNOWN" },
      known_unknowns: [],
    }) as never;
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  if (lifecycleOwnsOwnerFacingExecutionGuidance(report)) {
    assertLifecycleOwnedExecutionGuidanceBlocked(report);
    return;
  }
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.equal(
    report.execution_guidance.mutating_block_reasons.includes(
      "command_surface system_health is CRITICAL",
    ),
    true,
  );
});

test("execution_guidance blocks mutation when approved_count is zero", async () => {
  const providers = baseProviders();
  providers.affiliateTracker = () =>
    ({
      status_counts: {
        NOT_STARTED: 1,
        DRAFTING: 0,
        SUBMITTED: 0,
        IN_REVIEW: 0,
        APPROVED: 0,
        REJECTED: 0,
        REAPPLY_REQUIRED: 0,
        PAUSED_OR_INACTIVE: 0,
      },
      records_approved: [],
      known_unknowns: [],
    }) as never;
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  if (lifecycleOwnsOwnerFacingExecutionGuidance(report)) {
    assertLifecycleOwnedExecutionGuidanceBlocked(report);
    return;
  }
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.equal(
    report.execution_guidance.mutating_block_reasons.includes(
      "affiliate_readiness_summary approved_count is 0",
    ),
    true,
  );
});

test("execution_guidance safely represents missing flexoffers readiness file", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueUnknownMock();
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  if (lifecycleOwnsOwnerFacingExecutionGuidance(report)) {
    assertLifecycleOwnedExecutionGuidanceBlocked(report);
    return;
  }
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.equal(
    report.execution_guidance.mutating_block_reasons.some((reason) =>
      reason.includes("flexoffers_readiness_refrigerator_water report missing"),
    ),
    true,
  );
});

test("includes recent evidence/outcome files", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("data/evidence"),
    readDir: () => [
      "frigidaire-routing-outcome.2026-04-29.json",
      "frigidaire-oem-pdp-evidence.2026-04-29.json",
    ],
    readTextFile: (p) =>
      p.endsWith("affiliate-application-tracker.json")
        ? BASE_TRACKER
        : JSON.stringify({ kind: "evidence", value: 1 }),
  });
  assert.equal(report.recent_learning_outcomes.evidence_files.length, 2);
  assert.equal(
    report.recent_learning_outcomes.evidence_files.some((item) =>
      item.file.includes("frigidaire-routing-outcome"),
    ),
    true,
  );
});

test("does not recommend RepairClinic evidence if RepairClinic is NOT_STARTED/DRAFTING", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(/repairclinic evidence/i.test(report.next_best_action), false);
});

test("marks Frigidaire lane exhausted when candidate report has no candidates", async () => {
  const providers = baseProviders();
  providers.frigidaireNextCandidates = async () =>
    ({
      report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
      runtime_status: "OK",
      candidates: [],
      recommended_next_action: "No Frigidaire candidate with blocked OEM plus non-OEM link exists in current data.",
      known_unknowns: [],
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.top_money_queue.find((item) => item.lane === "frigidaire_next_monetizable");
  assert.equal(Boolean(lane), true);
  assert.equal(lane?.exhausted, true);
});

test("emits one concrete next_best_action", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(typeof report.next_best_action, "string");
  assert.equal(report.next_best_action.trim().length > 0, true);
});

test("Command Center JSON shape contract: root digest, v2 lanes, operator_digest_v1 mirror", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const v2 = report.command_center_v2;
  const mirror = v2.operator_digest_v1;

  assert.equal(typeof report.next_best_action, "string");
  assert.equal(report.next_best_action.trim().length > 0, true);

  assert.ok(mirror);
  assert.equal(mirror.contract, "operator_digest_v1");
  assert.equal(mirror.read_only, true);
  assert.equal(mirror.data_mutation, false);
  assert.equal(mirror.source, "buckparts_command_center_v1_root_digest");
  assert.equal(mirror.next_best_action, report.next_best_action);
  assert.equal(mirror.why_this_action, report.why_this_action);
  assert.deepEqual(mirror.execution_guidance, report.execution_guidance);

  assert.equal("next_best_action" in v2, false);
  assert.equal("command_surface" in report, false);
  assert.equal("command_surface" in v2, false);

  assert.ok(report.owner_command_center_neurons);
  assert.equal("owner_command_center_neurons" in v2, false);
});

test("next_best_action does not claim no non-Amazon APPROVED when Waterdrop LIVE evidence exists", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const tracker = fs.readFileSync(path.join(rootDir, "data/affiliate/affiliate-application-tracker.json"), "utf8");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: (abs) => {
      if (abs.includes("batch-production")) return false;
      return fs.existsSync(abs);
    },
    readDir: () => [],
    readTextFile: (abs) => readTextFileTrackerOrRepoData(abs, tracker),
  });
  const lang = report.command_center_v2.customer_language_and_waterdrop_research_lane_v1;
  assert.equal(lang.waterdrop_live_cta_status, "LIVE");
  assert.equal(lang.mutation_authority, false);
  assert.equal(report.affiliate_readiness_summary.affiliate_approval_pending, true);
  assert.equal(
    /until at least one non-Amazon network lane reaches APPROVED/i.test(report.next_best_action),
    false,
  );
  if (issueRegistryTier0SteeringActive(report)) {
    assert.match(report.next_best_action, /BP-000001/);
    return;
  }
  if (issueReauditSteeringActive(report)) {
    assert.match(report.next_best_action, /BP-000001/);
    assert.match(report.why_this_action, /re-audit|RE_AUDIT/i);
    return;
  }
  if (refrigeratorModelFirstSteeringActive(report)) {
    assert.match(report.why_this_action, /prioritize fridge official-manufacturer evidence over AP filter-first steering/i);
    return;
  }
  const modelFirstSteering = /^MODEL-FIRST STEERING \[READY\]:/i.test(report.next_best_action);
  if (modelFirstSteering) {
    assert.match(report.next_best_action, /Collect read-only model-first evidence/i);
  } else {
    assert.match(report.next_best_action, /Monitor Waterdrop DA29-00020B live proof slice only/i);
    assert.match(report.why_this_action, /Waterdrop DA29-00020B proof slice is LIVE/i);
    assert.match(report.why_this_action, /Other affiliate program approvals remain pending/i);
  }
  const affiliateLane = report.command_center_v2.affiliate_readiness;
  assert.equal(affiliateLane.status, "ATTENTION");
});

test("owner-facing next_best_action and blocked_link_summary avoid cold OEM wording", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const tracker = fs.readFileSync(path.join(rootDir, "data/affiliate/affiliate-application-tracker.json"), "utf8");
  const { affiliateTracker: _affiliateTrackerMock, ...providersWithoutTrackerMock } = baseProviders();
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: {
      ...providersWithoutTrackerMock,
      frigidaireNextCandidates: async () =>
        ({
          report_name: "buckparts_frigidaire_next_monetizable_candidates_v1",
          runtime_status: "OK",
          candidates: [],
          recommended_next_action:
            "No Frigidaire candidate with blocked manufacturer catalog plus alternate retailer link exists in current data.",
          known_unknowns: [],
        }) as never,
    },
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: (abs) => readTextFileTrackerOrRepoData(abs, tracker),
  });
  assert.ok(!/OEM catalog|OEM blocked-search|Amazon-first OEM/i.test(report.next_best_action));
  assert.match(
    report.blocked_link_summary.recommended_first_action,
    /manufacturer catalog\/search rows with verified direct product pages/i,
  );
  assert.equal(
    report.command_center_v2.customer_language_and_waterdrop_research_lane_v1.waterdrop_live_cta_status,
    "LIVE",
  );
  const flexLane = report.top_money_queue.find((lane) => lane.lane === "flexoffers_readiness_refrigerator_water");
  assert.ok(flexLane?.exhausted);
});

test("next_best_action does not recommend FlexOffers slot prep when tracker shows REJECTED", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const tracker = fs.readFileSync(path.join(rootDir, "data/affiliate/affiliate-application-tracker.json"), "utf8");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: fs.existsSync,
    readDir: () => [],
    readTextFile: (abs) => readTextFileTrackerOrRepoData(abs, tracker),
  });
  const flexLane = report.top_money_queue.find((lane) => lane.lane === "flexoffers_readiness_refrigerator_water");
  assert.ok(flexLane);
  assert.equal(flexLane!.exhausted, true);
  assert.equal(/Prepare pending FlexOffers slots/i.test(report.next_best_action), false);
});

test("skips Amazon-first NBA when another non-Amazon affiliate is APPROVED", async () => {
  const tracker = JSON.stringify([
    {
      id: "amazon-associates",
      status: "APPROVED",
      tagVerified: true,
    },
    {
      id: "cj",
      status: "APPROVED",
      tagVerified: null,
    },
  ]);
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({ needs: 5, tokens: ["X"] });
  providers.affiliateTracker = () =>
    ({
      status_counts: {
        NOT_STARTED: 0,
        DRAFTING: 0,
        SUBMITTED: 0,
        IN_REVIEW: 0,
        APPROVED: 2,
        REJECTED: 0,
        REAPPLY_REQUIRED: 0,
        PAUSED_OR_INACTIVE: 0,
      },
      records_approved: ["amazon-associates", "cj"],
      known_unknowns: [],
    }) as never;

  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => tracker,
  });
  assert.equal(/Amazon-first blocked-search rescue/i.test(report.next_best_action), false);
});

test("command_center_v2 loads token controls and excludes registry tokens from fresh_search_top_tokens", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({
    needs: 4,
    tokens: ["LT1000P", "4396508", "ZZZ-UNREG", "ADQ75795101"],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrControls,
  });
  const v2 = report.command_center_v2;
  assert.equal(v2.amazon_rescue.registry_load_error, null);
  assert.equal(v2.amazon_rescue.registry_entry_count, 3);
  assert.deepEqual(v2.amazon_rescue.fresh_search_top_tokens, ["ZZZ-UNREG"]);
  assert.equal(v2.amazon_rescue.next_allowed_agent_token, "ZZZ-UNREG");
  assert.ok(v2.amazon_rescue.live_outcome_recorded_tokens.includes("LT1000P"));
  assert.ok(v2.amazon_rescue.frozen_operator_hold_tokens.includes("ADQ75795101"));
  assert.ok(v2.amazon_rescue.do_not_touch?.includes("ADQ75795101"));
  assert.ok(v2.amazon_rescue.do_not_touch?.includes("LT1000P"));
  const authoritySources = v2.recommendation_authority.evaluated_actions.map((action) => action.source);
  assert.ok(authoritySources.includes("command_center_v2.amazon_rescue.frozen_operator_hold_tokens"));
  assert.ok(authoritySources.includes("command_center_v2.amazon_rescue.next_allowed_agent_token"));
  assert.ok(authoritySources.includes("command_center_v2.affiliate_readiness"));
  assert.ok(
    v2.recommendation_authority.evaluated_actions.every(
      (action) =>
        action.authority_level === "SCOPED_PARTIAL" &&
        action.allowed_as_recommendation === true &&
        action.authority_scope.length > 0,
    ),
  );
});

test("4396508 is human_browser_required / unknown lane, not fresh_search_top_tokens", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({
    needs: 2,
    tokens: ["4396508", "OTHER"],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrControls,
  });
  const ar = report.command_center_v2.amazon_rescue;
  assert.equal(ar.fresh_search_top_tokens.includes("4396508"), false);
  assert.ok(ar.human_browser_required_tokens.includes("4396508"));
  assert.ok(report.command_center_v2.unknown_or_human_review.top_items?.includes("4396508"));
  const humanBrowserAction = report.command_center_v2.recommendation_authority.evaluated_actions.find(
    (action) => action.source === "command_center_v2.unknown_or_human_review",
  );
  assert.ok(humanBrowserAction);
  assert.equal(humanBrowserAction.action_type, "BLOCKER");
  assert.ok(humanBrowserAction.authority_scope.includes("UNKNOWN evidence"));
});

test("owner-review exact PDP evidence removes registry UNKNOWN token from human-browser lane", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: 1,
      already_live_noop_count: 0,
      needs_amazon_search_count: 0,
      unknown_evidence_deferred_count: 0,
      unknown_evidence_deferred: [],
      top_candidates: [
        {
          link_id: "id-0",
          filter_id: "f-0",
          filter_slug: "4396508",
          retailer_key: "oem-catalog",
          blocked_url: "https://example.com/search?q=4396508",
          token: "4396508",
          domain: "example.com",
          domain_blocked_count: 1,
          current_live_amazon_slot_status: null,
          recommended_search_query: "4396508",
          recommended_next_action: "OWNER_REVIEW_EXACT_PDP_PROVEN",
          evidence_review_file: "amazon-4396508-owner-review-pdp-evidence.2026-05-10.json",
          evidence_review_verdict: "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT",
        },
      ],
      known_unknowns: [],
    }) as never;
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrControls,
  });
  assert.equal(report.command_center_v2.amazon_rescue.human_browser_required_tokens.includes("4396508"), false);
  assert.equal(report.command_center_v2.unknown_or_human_review.top_items?.includes("4396508"), false);
});

test("queue unknown_evidence_deferred merges into human_browser_required_tokens", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueWithDeferredMock({
    tokens: ["AAA"],
    deferredTokens: ["DEFERRED-TOK"],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.ok(report.command_center_v2.amazon_rescue.human_browser_required_tokens.includes("DEFERRED-TOK"));
});

test("ASIN collision review is an owner policy blocker, not a fresh agent token", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: 1,
      already_live_noop_count: 0,
      needs_amazon_search_count: 0,
      unknown_evidence_deferred_count: 1,
      unknown_evidence_deferred: [
        {
          link_id: "collision",
          filter_id: "filter-edr3",
          filter_slug: "edr3rxd1",
          retailer_key: "oem-catalog",
          blocked_url: "https://example.com/search?q=EDR3RXD1",
          token: "EDR3RXD1",
          domain: "example.com",
          domain_blocked_count: 1,
          current_live_amazon_slot_status: null,
          recommended_search_query: "EDR3RXD1",
          recommended_next_action: "ASIN_COLLISION_REVIEW_REQUIRED",
          asin_reuse_policy_classification: "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED",
        },
      ],
      top_candidates: [],
      known_unknowns: [],
    }) as never;
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrControls,
  });

  const rescue = report.command_center_v2.amazon_rescue;
  assert.ok(rescue.human_browser_required_tokens.includes("EDR3RXD1"));
  assert.ok(rescue.asin_collision_policy_review_tokens.includes("EDR3RXD1"));
  assert.equal(rescue.fresh_search_top_tokens.includes("EDR3RXD1"), false);
  assert.notEqual(report.command_center_v2.next_allowed_agent_token, "EDR3RXD1");
  const action = report.command_center_v2.recommendation_authority.evaluated_actions.find(
    (record) => record.source === "command_center_v2.amazon_rescue.asin_collision_policy_review",
  );
  assert.ok(action);
  assert.equal(action.action_type, "BLOCKER");
  assert.equal(action.allowed_as_recommendation, true);
  assert.match(action.authority_scope, /not permission to mutate retailer_links/);
});

test("shared-ASIN insert-plan eligible queue rows are not unresolved policy blockers", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = async () =>
    ({
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: "2026-05-01T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: 1,
      already_live_noop_count: 0,
      needs_amazon_search_count: 0,
      unknown_evidence_deferred_count: 0,
      unknown_evidence_deferred: [],
      top_candidates: [
        {
          link_id: "shared",
          filter_id: "filter-edr3",
          filter_slug: "edr3rxd1",
          retailer_key: "oem-catalog",
          blocked_url: "https://example.com/search?q=EDR3RXD1",
          token: "EDR3RXD1",
          domain: "example.com",
          domain_blocked_count: 1,
          current_live_amazon_slot_status: null,
          recommended_search_query: "EDR3RXD1",
          recommended_next_action: "SHARED_ASIN_INSERT_PLAN_ELIGIBLE",
          asin_reuse_policy_classification: "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE",
        },
      ],
      known_unknowns: [],
    }) as never;
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: readTextFileTrackerOrControls,
  });

  const rescue = report.command_center_v2.amazon_rescue;
  assert.equal(rescue.human_browser_required_tokens.includes("EDR3RXD1"), false);
  assert.equal(rescue.asin_collision_policy_review_tokens.includes("EDR3RXD1"), false);
  assert.equal(rescue.fresh_search_top_tokens.includes("EDR3RXD1"), false);
  const blocker = report.command_center_v2.recommendation_authority.evaluated_actions.find(
    (record) => record.source === "command_center_v2.amazon_rescue.asin_collision_policy_review",
  );
  assert.equal(blocker, undefined);
});

test("command_center_v2 recent_evidence includes evidence_rollup counts when evidence dir exists", async () => {
  const providers = baseProviders();
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: (p) => p.endsWith("data/evidence"),
    readDir: () => [
      "amazon-lt1000p-live-outcome.2026-05-03.json",
      "amazon-4396508-unknown-outcome.2026-05-03.json",
      "frigidaire-routing-outcome.2026-04-29.json",
    ],
    readTextFile: (p) =>
      p.endsWith("affiliate-application-tracker.json")
        ? BASE_TRACKER
        : JSON.stringify({ kind: "evidence", value: 1 }),
  });
  const rollup = report.command_center_v2.recent_evidence.evidence_rollup;
  assert.equal(rollup.live_outcome_count, 1);
  assert.equal(rollup.unknown_outcome_count, 1);
  assert.equal(rollup.unclassified_json_count, 1);
  assert.ok(rollup.recent_evidence_filenames.length >= 1);
  const inv = report.command_center_v2.recent_evidence.evidence_inventory;
  assert.equal(inv.contract, "evidence_inventory_v1");
  assert.equal(inv.data_evidence.recent_ordering, "lexicographic_by_filename");
  assert.equal(inv.data_evidence.total_json_files, 3);
  assert.equal(
    inv.data_evidence.filename_outcome_buckets.live_outcome_by_filename_substring,
    rollup.live_outcome_count,
  );
  assert.equal(
    inv.data_evidence.filename_outcome_buckets.unknown_outcome_by_filename_substring,
    rollup.unknown_outcome_count,
  );
  assert.ok(inv.refrigerator_manual_evidence.inventory_contract === "refrigerator_manual_evidence_files_v1");
  assert.ok(inv.fridge_form_factor_evidence.inventory_contract === "fridge_form_factor_evidence_files_v1");
});

test("command_center_v2 revenue_snapshot includes click_visibility when click snapshot is OK", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const rs = report.command_center_v2.revenue_snapshot;
  assert.equal(rs.status, "OK");
  assert.equal(rs.count, 3);
  assert.equal(rs.click_visibility?.runtime_status, "OK");
  assert.equal(rs.click_visibility?.last_30_days_clicks, 10);
  assert.equal(rs.click_visibility?.human_likely_last_30_days_clicks, 3);
  assert.equal(rs.click_visibility?.commission_or_revenue, "NOT_CONNECTED");
});

test("command_center_v2 revenue_snapshot is ATTENTION when click snapshot is unavailable", async () => {
  const providers = baseProviders();
  providers.clickEventsSnapshot = async () => {
    const { unavailableClickSnapshot } = await import("./lib/buckparts-click-events-snapshot");
    return unavailableClickSnapshot(["Missing SUPABASE_SERVICE_ROLE_KEY"]);
  };
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.command_center_v2.revenue_snapshot.status, "ATTENTION");
  assert.equal(
    report.command_center_v2.revenue_snapshot.click_visibility?.runtime_status,
    "UNKNOWN_DB_UNAVAILABLE",
  );
});

test("command_center_v2 deploy lane stays PLACEHOLDER when liveSiteMonitor is null", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const d = report.command_center_v2.deploy_live_site_status;
  assert.equal(d.status, "PLACEHOLDER");
  assert.equal(d.live_site_monitor, null);
  const lane = report.command_center_v2.deploy_live_site_monitor_v1;
  assert.equal(lane.contract, "deploy_live_site_monitor_v1");
  assert.equal(lane.inspect_summary.contract, "UNKNOWN");
  assert.equal(lane.inspect_summary.runtime_status, "UNKNOWN");
  assert.equal(lane.inspect_summary.route_http_status, "UNKNOWN");
  assert.equal(lane.inspect_summary.content_contract_status, "UNKNOWN");
  assert.equal(lane.inspect_summary.wrong_part_prevention, "UNKNOWN");
});

function liveSiteMonitorOkFixture(overrides: Partial<LiveSiteMonitorV1> = {}): LiveSiteMonitorV1 {
  return {
    contract: "live_site_monitor_v1",
    checked_at: "2026-05-09T00:00:00.000Z",
    source: "test",
    primary_target_base_url: "https://example.com",
    target_source: "NEXT_PUBLIC_SITE_URL",
    custom_domain_base_url: "UNKNOWN",
    custom_domain_checked: false,
    netlify_fallback_base_url: "UNKNOWN",
    netlify_domain_checked: "UNKNOWN",
    target_base_url: "https://example.com",
    route_http_status: "OK",
    content_contract_status: "OK",
    content_contracts: [
      {
        contract_id: "wrong_part_prevention_homeowner_v1",
        path: "/wrong-part-prevention",
        status_code: 200,
        http_ok: true,
        required_markers_ok: true,
        banned_phrases_absent: true,
        content_contract_ok: true,
        required_markers_found: [
          "how buckparts helps you avoid buying the wrong filter",
          "treasure hunt",
          "questionable part",
        ],
        required_markers_missing: [],
        banned_phrases_found: [],
      },
    ],
    runtime_status: "OK",
    routes: [
      { path: "/", status_code: 200, ok: true, latency_ms: 1, marker_found: true },
      { path: "/filter/adq36006101", status_code: 200, ok: true, latency_ms: 1, marker_found: true },
      { path: "/fridge/lg-lfxs26973s", status_code: 200, ok: true, latency_ms: 1, marker_found: true },
    ],
    local_head_commit: "aaa",
    origin_main_commit: "UNKNOWN",
    deployed_commit: "UNKNOWN",
    deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
    proven_facts: ["fixture"],
    unknown_facts: ["fixture unknown"],
    ...overrides,
  };
}

test("command_center_v2 deploy_live_site_monitor_v1 surfaces route, content, and deploy sync separately", async () => {
  const mon = liveSiteMonitorOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: mon,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.command_center_v2.deploy_live_site_monitor_v1;
  assert.equal(lane.contract, "deploy_live_site_monitor_v1");
  assert.equal(lane.inspect_summary.contract, "live_site_monitor_v1");
  assert.equal(lane.inspect_summary.runtime_status, "OK");
  assert.equal(lane.inspect_summary.route_http_status, "OK");
  assert.equal(lane.inspect_summary.content_contract_status, "OK");
  assert.equal(lane.inspect_summary.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
  assert.equal(lane.inspect_summary.target_base_url, "https://example.com");
  assert.equal(lane.inspect_summary.checked_at, "2026-05-09T00:00:00.000Z");
  assert.notEqual(lane.inspect_summary.wrong_part_prevention, "UNKNOWN");
  if (lane.inspect_summary.wrong_part_prevention !== "UNKNOWN") {
    assert.equal(lane.inspect_summary.wrong_part_prevention.path, "/wrong-part-prevention");
    assert.equal(lane.inspect_summary.wrong_part_prevention.content_contract_ok, true);
    assert.deepEqual(lane.inspect_summary.wrong_part_prevention.banned_phrases_found, []);
  }
});

test("command_center_v2 deploy_publish_queue_v1 defaults Netlify API unauthorized when live content OK", async () => {
  const mon = liveSiteMonitorOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: mon,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const queue = report.command_center_v2.deploy_publish_queue_v1;
  assert.equal(queue.contract, "deploy_publish_queue_v1");
  assert.equal(queue.read_only, true);
  assert.equal(queue.data_mutation, false);
  assert.equal(queue.netlify_api_call_authorized, false);
  assert.equal(queue.publish_required, false);
  assert.equal(queue.reason, "LIVE_CONTENT_OK");
  assert.equal(
    queue.recommended_jq_path,
    ".command_center_v2.deploy_publish_queue_v1",
  );
});

test("command_center_v2 deploy lane ATTENTION when route HTTP OK but content contract fails", async () => {
  const mon = liveSiteMonitorOkFixture({
    runtime_status: "ATTENTION",
    route_http_status: "OK",
    content_contract_status: "ATTENTION",
    content_contracts: [
      {
        contract_id: "wrong_part_prevention_homeowner_v1",
        path: "/wrong-part-prevention",
        status_code: 200,
        http_ok: true,
        required_markers_ok: false,
        banned_phrases_absent: false,
        content_contract_ok: false,
        required_markers_found: [],
        required_markers_missing: ["treasure hunt"],
        banned_phrases_found: ["structured data"],
      },
    ],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: mon,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.command_center_v2.deploy_live_site_status.status, "ATTENTION");
  assert.equal(report.command_center_v2.deploy_live_site_status.blocker, "live_site_content_contract_failed");
  assert.equal(report.command_center_v2.deploy_live_site_monitor_v1.inspect_summary.route_http_status, "OK");
  assert.equal(report.command_center_v2.deploy_live_site_monitor_v1.inspect_summary.content_contract_status, "ATTENTION");
  assert.equal(report.command_center_v2.deploy_live_site_monitor_v1.inspect_summary.runtime_status, "ATTENTION");
});

test("command_center_v2 deploy lane OK when liveSiteMonitor artifact all routes ok", async () => {
  const mon = liveSiteMonitorOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: mon,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const d = report.command_center_v2.deploy_live_site_status;
  assert.equal(d.status, "OK");
  assert.equal(d.live_site_monitor?.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
});

test("command_center_v2 surfaces next_owner_action and next_agent_action on lanes", async () => {
  const providers = baseProviders();
  providers.amazonFirstBlockedQueue = amazonQueueOkMock({ needs: 1, tokens: ["T1"] });
  const report = await buildBuckpartsCommandCenterReport({
    providers,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const v2 = report.command_center_v2;
  assert.equal(typeof v2.next_owner_action, "string");
  assert.ok(v2.next_owner_action.length > 0);
  assert.equal(typeof v2.amazon_rescue.next_agent_action, "string");
  assert.equal(typeof v2.amazon_rescue.next_owner_action, "string");
  assert.equal(typeof v2.deploy_live_site_status.next_owner_action, "string");
  assert.equal(typeof v2.revenue_snapshot.next_owner_action, "string");
});

function searchGapRowFixture(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 101,
    catalog: "refrigerator",
    normalized_query: "lt1000p-filter",
    sample_raw_query: "LT1000P filter",
    search_count: 4,
    zero_result_count: 3,
    last_seen_at: "2026-05-01T12:00:00.000Z",
    status: "open",
    likely_entity_type: "model",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T12:00:00.000Z",
    ...overrides,
  };
}

function assertDemandEngineNoBuyClaims(
  engine: import("./lib/buckparts-command-center-v2-types").DemandToCoverageEngineV1,
) {
  const blob = JSON.stringify(engine);
  assert.ok(!blob.includes("BUY_READY"));
  for (const row of engine.rows) {
    assert.equal(row.coverage_state, "UNKNOWN");
    assert.notEqual(row.coverage_state, "SCOPED_PARTIAL");
  }
}

test("command_center_v2 demand_to_coverage_engine_v1 attaches bounded search_gaps rows read-only", async () => {
  const engine = buildDemandToCoverageEngineV1FromRows(
    [
      searchGapRowFixture({ likely_entity_type: "compatibility_mapping" }),
      searchGapRowFixture({ id: 102, likely_entity_type: "unknown", normalized_query: "other" }),
    ],
    "OK",
    [],
  );
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => engine,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const d = report.command_center_v2.demand_to_coverage_engine_v1;
  assert.equal(d.contract, "demand_to_coverage_engine_v1");
  assert.equal(d.runtime_status, "OK");
  assert.equal(d.rows.length, 2);
  assert.equal(d.rows[0].demand.catalog, "refrigerator");
  assert.equal(d.rows[0].evidence_gap_kind, "ZERO_RESULT_GAP");
  assert.equal(d.rows[0].recommended_verification, "VERIFY_COMPATIBILITY_EVIDENCE");
  assert.equal(d.rows[1].evidence_gap_kind, "ENTITY_TYPE_UNKNOWN");
  assert.equal(d.rows[1].recommended_verification, "RESEARCH_CANDIDATE_ENTITY");
  assert.ok(d.rows[0].authority.some((a) => a.action_type === "AGENT_ACTION"));
  assert.ok(d.rows[0].authority.some((a) => a.action_type === "OWNER_ACTION"));
  assertDemandEngineNoBuyClaims(d);
});

test("command_center_v2 demand_to_coverage_engine_v1 tolerates empty rows and invalid gap payloads", async () => {
  const engine = buildDemandToCoverageEngineV1FromRows(
    [{ not_a_column: true }, searchGapRowFixture({ zero_result_count: 0, likely_entity_type: "model" })],
    "OK",
    [],
  );
  assert.equal(engine.rows.length, 1);
  assert.equal(engine.rows[0].evidence_gap_kind, "VERIFICATION_REQUIRED");
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => engine,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assertDemandEngineNoBuyClaims(report.command_center_v2.demand_to_coverage_engine_v1);
});

test("command_center_v2 demand_to_coverage_engine_v1 surfaces UNKNOWN_DB_UNAVAILABLE without throwing", async () => {
  const engine = buildDemandToCoverageEngineV1FromRows([], "UNKNOWN_DB_UNAVAILABLE", [
    "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) for import scripts.",
  ]);
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => engine,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const d = report.command_center_v2.demand_to_coverage_engine_v1;
  assert.equal(d.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(d.rows.length, 0);
  assert.ok(d.unknown_facts.some((s) => /supabase/i.test(s)));
  assertDemandEngineNoBuyClaims(d);
});

function learningOutcomesReadModelOkFixture(): LearningOutcomesReadModelV1 {
  return {
    contract: "learning_outcomes_read_model_v1",
    runtime_status: "OK",
    total_outcomes: 5,
    recent_outcomes: 2,
    recent_window_days: 30,
    by_outcome: { pass: 2, fail: 1, blocked: 1, unknown: 1 },
    by_confidence: { exact: 3, likely: 1, uncertain: 0, unset: 1 },
    by_cta_status: { live: 2, not_live: 2, blocked: 0, unset: 1 },
    latest_outcomes: [
      {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        slug: "fixture-slug",
        outcome: "pass",
        confidence: "exact",
        cta_status: "live",
        date_checked: "2026-05-10T00:00:00.000Z",
        created_at: "2026-05-09T00:00:00.000Z",
        retailer: "amazon",
        index_status: null,
        part_number: "PN-1",
        model_number: null,
      },
    ],
    proven_facts: ["Fixture: row counts and buckets are synthetic for Command Center test wiring only."],
    unknown_facts: [],
  };
}

function assertLearningReadModelNoFitBuyRevenueClaims(lo: LearningOutcomesReadModelV1) {
  const blob = JSON.stringify(lo);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

test("command_center_v2 learning_outcomes_read_model_v1 surfaces counts and latest rows read-only", async () => {
  const lo = learningOutcomesReadModelOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => lo,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const m = report.command_center_v2.learning_outcomes_read_model_v1;
  assert.equal(m.contract, "learning_outcomes_read_model_v1");
  assert.equal(m.runtime_status, "OK");
  assert.equal(m.total_outcomes, 5);
  assert.equal(m.recent_outcomes, 2);
  assert.equal(m.recent_window_days, 30);
  assert.deepEqual(m.by_outcome, { pass: 2, fail: 1, blocked: 1, unknown: 1 });
  assert.equal(m.latest_outcomes.length, 1);
  assert.equal(m.latest_outcomes[0].slug, "fixture-slug");
  assertLearningReadModelNoFitBuyRevenueClaims(m);
});

test("command_center_v2 learning_outcomes_read_model_v1 empty table shape", async () => {
  const lo: LearningOutcomesReadModelV1 = {
    contract: "learning_outcomes_read_model_v1",
    runtime_status: "OK",
    total_outcomes: 0,
    recent_outcomes: 0,
    recent_window_days: 30,
    by_outcome: { pass: 0, fail: 0, blocked: 0, unknown: 0 },
    by_confidence: { exact: 0, likely: 0, uncertain: 0, unset: 0 },
    by_cta_status: { live: 0, not_live: 0, blocked: 0, unset: 0 },
    latest_outcomes: [],
    proven_facts: ["Fixture: zero rows."],
    unknown_facts: [],
  };
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => lo,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const m = report.command_center_v2.learning_outcomes_read_model_v1;
  assert.equal(m.total_outcomes, 0);
  assert.deepEqual(m.by_outcome, { pass: 0, fail: 0, blocked: 0, unknown: 0 });
  assertLearningReadModelNoFitBuyRevenueClaims(m);
});

test("command_center_v2 learning_outcomes_read_model_v1 degraded when DB unavailable", async () => {
  const lo = degradedLearningOutcomesReadModelV1("UNKNOWN_DB_UNAVAILABLE", [
    "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) for import scripts.",
  ]);
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => lo,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const m = report.command_center_v2.learning_outcomes_read_model_v1;
  assert.equal(m.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
  assert.equal(m.total_outcomes, "UNKNOWN");
  assert.equal(m.latest_outcomes.length, 0);
  assert.ok(m.unknown_facts.some((s) => /supabase/i.test(s)));
  assertLearningReadModelNoFitBuyRevenueClaims(m);
});

function evidenceImportOkFixture(): EvidenceToLearningOutcomesCandidateImportV1 {
  const proposed = {
    slug: "fixture-token",
    part_number: "FIXTURE-TOKEN",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B000TEST000",
    retailer: "amazon",
    outcome: "unknown" as const,
    reason: "Fixture evidence-derived row for Command Center wiring only.",
    reason_detail: null,
    confidence: "exact" as const,
    cta_status: "not_live" as const,
    index_status: null,
    date_checked: "2026-05-10T00:00:00.000Z",
    next_action: "Owner reviews before insertLearningOutcome.",
    evidence_jsonb_stub: { import_contract: "evidence_to_learning_outcomes_candidate_import_v1", fixture: true },
  };
  const candidates = [
    {
      source_file: "data/evidence/fixture.json",
      proposed_learning_outcome: proposed,
      mapping_basis: ["Fixture candidate; not executed against Supabase."],
      missing_or_unknown_fields: ["Fixture marks confidence/cta as synthetic operator test data only."],
      owner_approval_required: true,
    },
  ];
  return {
    contract: "evidence_to_learning_outcomes_candidate_import_v1",
    runtime_status: "OK",
    scanned_file_count: 2,
    parseable_file_count: 2,
    candidate_count: 1,
    rejected_count: 0,
    candidates,
    candidates_evaluated_uncapped_v1: candidates,
    rejected_samples: [],
    proven_facts: ["Fixture-only import plan."],
    unknown_facts: [],
    owner_approval_required: true,
    data_mutation: false,
  };
}

function assertEvidenceImportNoFitBuyRevenueClaims(block: EvidenceToLearningOutcomesCandidateImportV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

test("command_center_v2 evidence_to_learning_outcomes_candidate_import_v1 surfaces fixture candidates read-only", async () => {
  const imp = evidenceImportOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const b = report.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1;
  assert.equal(b.contract, "evidence_to_learning_outcomes_candidate_import_v1");
  assert.equal(b.data_mutation, false);
  assert.equal(b.owner_approval_required, true);
  assert.equal(b.candidates.length, 1);
  assert.equal(b.candidates[0].owner_approval_required, true);
  assertEvidenceImportNoFitBuyRevenueClaims(b);
});

test("evidence_to_learning_outcomes_candidate_import_v1 maps verdict and rejects bad JSON", async () => {
  const rootDir = "/tmp/buckparts-evidence-import-test";
  const evidenceAbs = path.join(rootDir, "data", "evidence");
  const impOk = buildEvidenceToLearningOutcomesCandidateImportV1({
    rootDir,
    fileExists: (p) => path.normalize(p) === path.normalize(evidenceAbs),
    readDir: () => ["good.json", "bad.json", "array.json"],
    readTextFile: (p) => {
      if (p.endsWith("good.json")) {
        return JSON.stringify({
          filter_slug: "ab",
          token: "AB",
          verdict: "LIVE_OUTCOME_RECORDED",
          reason: "Recorded in evidence export.",
          generated_at: "2026-05-03T12:00:00.000Z",
          final_amazon_cta_state_proven: true,
        });
      }
      if (p.endsWith("bad.json")) return "{";
      return JSON.stringify([{ token: "x" }]);
    },
    now: () => new Date("2026-06-01T00:00:00.000Z"),
  });
  assert.equal(impOk.runtime_status, "OK");
  assert.equal(impOk.scanned_file_count, 3);
  assert.equal(impOk.parseable_file_count, 2);
  assert.ok(impOk.candidate_count >= 1);
  assert.ok(impOk.candidates_evaluated_uncapped_v1);
  assert.equal(impOk.candidates_evaluated_uncapped_v1!.length, impOk.candidate_count);
  assert.equal(impOk.candidates.length, Math.min(impOk.candidate_count, 20));
  const goodCand = impOk.candidates.find((c) => c.source_file.endsWith("good.json"));
  assert.ok(goodCand);
  assert.equal(goodCand!.proposed_learning_outcome.outcome, "pass");
  assert.equal(goodCand!.proposed_learning_outcome.slug, "ab");
  assert.ok(impOk.rejected_samples.some((r) => r.reject_reason.includes("JSON.parse")));
  assert.ok(impOk.rejected_samples.some((r) => r.reject_reason.includes("array")));
  assertEvidenceImportNoFitBuyRevenueClaims(impOk);
});

test("evidence_to_learning_outcomes_candidate_import_v1 rejects object without slug keys", async () => {
  const rootDir = "/tmp/buckparts-evidence-import-test-2";
  const evidenceAbs = path.join(rootDir, "data", "evidence");
  const imp = buildEvidenceToLearningOutcomesCandidateImportV1({
    rootDir,
    fileExists: (p) => path.normalize(p) === path.normalize(evidenceAbs),
    readDir: () => ["empty.json"],
    readTextFile: () => JSON.stringify({ report_name: "x", read_only: true }),
    now: () => new Date("2026-06-01T00:00:00.000Z"),
  });
  assert.equal(imp.candidate_count, 0);
  assert.ok(imp.rejected_samples.some((r) => r.reject_reason.includes("filter_slug")));
  assertEvidenceImportNoFitBuyRevenueClaims(imp);
});

function baseEvidenceImportForPlan(args: {
  candidates: EvidenceToLoImportCandidateV1[];
  candidateCount?: number;
  candidates_evaluated_uncapped_v1?: EvidenceToLoImportCandidateV1[];
}): EvidenceToLearningOutcomesCandidateImportV1 {
  const uncapped = args.candidates_evaluated_uncapped_v1 ?? args.candidates;
  return {
    contract: "evidence_to_learning_outcomes_candidate_import_v1",
    runtime_status: "OK",
    scanned_file_count: 1,
    parseable_file_count: 1,
    candidate_count: args.candidateCount ?? uncapped.length,
    rejected_count: 0,
    candidates: args.candidates,
    candidates_evaluated_uncapped_v1: uncapped,
    rejected_samples: [],
    proven_facts: [],
    unknown_facts: [],
    owner_approval_required: true,
    data_mutation: false,
  };
}

function assertInsertPlanNoBannedClaims(plan: LearningOutcomesInsertPlanV1) {
  const blob = JSON.stringify(plan);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertWriterReadyBatchReviewNoBannedClaims(block: LearningOutcomesWriterReadyBatchReviewV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertConfidenceAssignmentPlanNoBannedClaims(block: LearningOutcomesOwnerConfidenceAssignmentPlanV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertConfidenceRegistryBlockNoBannedClaims(block: LearningOutcomesConfidenceApprovalRegistryV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertFoundationScorecardNoBannedClaims(block: TopOfGameFoundationScorecardV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertPublicTrustContractNoBannedClaims(block: PublicTrustUnificationBackendContractV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function assertRevenueLedgerContractNoBannedClaims(block: RevenueTruthLedgerContractV1) {
  const blob = JSON.stringify(block);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

function insertPlanCountTestCandidate(i: number): EvidenceToLoImportCandidateV1 {
  return {
    source_file: `data/evidence/count-test-${String(i).padStart(2, "0")}.json`,
    proposed_learning_outcome: {
      slug: `ct${i}`,
      part_number: `CT${i}`,
      model_number: null,
      candidate_url: "https://www.example.com/item",
      retailer: null,
      outcome: "unknown",
      reason: "Insert plan cardinality fixture row.",
      reason_detail: null,
      confidence: null,
      cta_status: "not_live",
      index_status: null,
      date_checked: "2026-05-10T00:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { count_test_index: i },
    },
    mapping_basis: [],
    missing_or_unknown_fields: ["confidence"],
    owner_approval_required: true,
  };
}

function confidenceAssignmentEligibleCand(i: number): EvidenceToLoImportCandidateV1 {
  return {
    source_file: `data/evidence/live-outcome-assign-${String(i).padStart(2, "0")}.json`,
    proposed_learning_outcome: {
      slug: `ca${i}`,
      part_number: `CA${i}`,
      model_number: null,
      candidate_url: "https://www.amazon.com/dp/B00CA09099",
      retailer: "amazon",
      outcome: "pass",
      reason: "Eligible confidence assignment fixture.",
      reason_detail: null,
      confidence: null,
      cta_status: "live",
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { idx: i },
    },
    mapping_basis: [],
    missing_or_unknown_fields: ["confidence"],
    owner_approval_required: true,
  };
}

test("learning_outcomes_insert_plan_v1 marks live-prefer rows without confidence as owner_review not writer_ready", () => {
  const proposed: ProposedLearningOutcomeRowV1 = {
    slug: "z1",
    part_number: "Z1",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B00Z1TEST99",
    retailer: "amazon",
    outcome: "pass",
    reason: "Evidence export.",
    reason_detail: null,
    confidence: null,
    cta_status: "live",
    index_status: null,
    date_checked: "2026-05-10T00:00:00.000Z",
    next_action: "review",
    evidence_jsonb_stub: { stub: true },
  };
  const imp = baseEvidenceImportForPlan({
    candidates: [
      {
        source_file: "data/evidence/amazon-z1-live-outcome.json",
        proposed_learning_outcome: proposed,
        mapping_basis: [],
        missing_or_unknown_fields: ["confidence"],
        owner_approval_required: true,
      },
    ],
  });
  const plan = buildLearningOutcomesInsertPlanV1(imp);
  assert.equal(plan.writer_ready_count, 0);
  assert.equal(plan.owner_review_required_count, 1);
  assert.equal(plan.proposed_first_batch[0].disposition, "owner_review_required");
  assert.ok(
    plan.proposed_first_batch[0].proposed_owner_actions.includes("OWNER_SET_CONFIDENCE_OR_APPROVE_NULL_POLICY"),
  );
  assertInsertPlanNoBannedClaims(plan);
});

test("learning_outcomes_insert_plan_v1 marks writer_ready when insertLearningOutcome validation passes", () => {
  const proposed: ProposedLearningOutcomeRowV1 = {
    slug: "wr1",
    part_number: "WR1",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B00WR1TEST99",
    retailer: "amazon",
    outcome: "pass",
    reason: "Recorded.",
    reason_detail: null,
    confidence: "exact",
    cta_status: "live",
    index_status: null,
    date_checked: "2026-05-10T12:00:00.000Z",
    next_action: null,
    evidence_jsonb_stub: { stub: true },
  };
  const imp = baseEvidenceImportForPlan({
    candidates: [
      {
        source_file: "data/evidence/amazon-wr1-live-outcome.json",
        proposed_learning_outcome: proposed,
        mapping_basis: [],
        missing_or_unknown_fields: [],
        owner_approval_required: true,
      },
    ],
  });
  const plan = buildLearningOutcomesInsertPlanV1(imp);
  assert.equal(plan.writer_ready_count, 1);
  assert.equal(plan.proposed_first_batch[0].disposition, "writer_ready");
  assertInsertPlanNoBannedClaims(plan);
});

test("command_center_v2 learning_outcomes_insert_plan_v1 is read_only with owner_approval_required", async () => {
  const imp = evidenceImportOkFixture();
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const plan = report.command_center_v2.learning_outcomes_insert_plan_v1;
  assert.equal(plan.contract, "learning_outcomes_insert_plan_v1");
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.owner_approval_required, true);
  assertInsertPlanNoBannedClaims(plan);
});

test("learning_outcomes_insert_plan_v1 uses uncapped internal candidates when preview is shorter than candidate_count", () => {
  const all = Array.from({ length: 25 }, (_, i) => insertPlanCountTestCandidate(i));
  const imp = baseEvidenceImportForPlan({
    candidates: all.slice(0, 20),
    candidateCount: 25,
    candidates_evaluated_uncapped_v1: all,
  });
  const plan = buildLearningOutcomesInsertPlanV1(imp);
  assert.equal(plan.source_candidate_count, 25);
  assert.equal(plan.blocked_count, 25);
  assert.ok(!plan.unknown_facts.some((f) => /fell back to preview-only|cardinality mismatch/i.test(f)));
  assert.ok(plan.proven_facts.some((f) => /candidates_evaluated_uncapped_v1/i.test(f)));
  assert.ok(plan.proposed_first_batch.length <= 10);
  assert.ok(plan.blocked_or_needs_owner_review.length <= 20);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.owner_approval_required, true);
  assertInsertPlanNoBannedClaims(plan);
});

test("learning_outcomes_insert_plan_v1 warns when uncapped internal list is missing but candidate_count exceeds preview", () => {
  const all = Array.from({ length: 25 }, (_, i) => insertPlanCountTestCandidate(i));
  const imp: EvidenceToLearningOutcomesCandidateImportV1 = {
    contract: "evidence_to_learning_outcomes_candidate_import_v1",
    runtime_status: "OK",
    scanned_file_count: 1,
    parseable_file_count: 1,
    candidate_count: 25,
    rejected_count: 0,
    candidates: all.slice(0, 20),
    rejected_samples: [],
    proven_facts: [],
    unknown_facts: [],
    owner_approval_required: true,
    data_mutation: false,
  };
  const plan = buildLearningOutcomesInsertPlanV1(imp);
  assert.equal(plan.blocked_count, 20);
  assert.ok(plan.unknown_facts.some((f) => /fell back to preview-only rows/i.test(f)));
});

test("stripEvidenceUncappedCandidatesForStdout drops evidence import uncapped array before JSON", async () => {
  const all = Array.from({ length: 22 }, (_, i) => insertPlanCountTestCandidate(i));
  const imp = baseEvidenceImportForPlan({
    candidates: all.slice(0, 20),
    candidateCount: 22,
    candidates_evaluated_uncapped_v1: all,
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.ok(report.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1.candidates_evaluated_uncapped_v1);
  const stripped = stripEvidenceUncappedCandidatesForStdout(report);
  assert.ok(
    !("candidates_evaluated_uncapped_v1" in stripped.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1),
  );
  assert.equal(stripped.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1.candidates.length, 20);
});

test("learning_outcomes_writer_ready_batch_review_v1 exposes LearningOutcomeInsertInput payloads for writer_ready rows only", () => {
  const proposedWr: ProposedLearningOutcomeRowV1 = {
    slug: "wr1",
    part_number: "WR1",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B00WR1TEST99",
    retailer: "amazon",
    outcome: "pass",
    reason: "Recorded.",
    reason_detail: null,
    confidence: "exact",
    cta_status: "live",
    index_status: null,
    date_checked: "2026-05-10T12:00:00.000Z",
    next_action: null,
    evidence_jsonb_stub: { stub: true },
  };
  const proposedOr: ProposedLearningOutcomeRowV1 = {
    slug: "z1",
    part_number: "Z1",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B00Z1TEST99",
    retailer: "amazon",
    outcome: "pass",
    reason: "Evidence export.",
    reason_detail: null,
    confidence: null,
    cta_status: "live",
    index_status: null,
    date_checked: "2026-05-10T00:00:00.000Z",
    next_action: "review",
    evidence_jsonb_stub: { stub_or: true },
  };
  const imp = baseEvidenceImportForPlan({
    candidates: [
      {
        source_file: "data/evidence/amazon-or-live-outcome.json",
        proposed_learning_outcome: proposedOr,
        mapping_basis: [],
        missing_or_unknown_fields: ["confidence"],
        owner_approval_required: true,
      },
      {
        source_file: "data/evidence/amazon-wr1-live-outcome.json",
        proposed_learning_outcome: proposedWr,
        mapping_basis: [],
        missing_or_unknown_fields: [],
        owner_approval_required: true,
      },
    ],
  });
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(imp);
  assert.equal(review.contract, "learning_outcomes_writer_ready_batch_review_v1");
  assert.equal(review.source_writer_ready_count, 1);
  assert.equal(review.reviewed_row_count, 1);
  assert.equal(review.rows.length, 1);
  assert.equal(review.rows[0].source_file, "data/evidence/amazon-wr1-live-outcome.json");
  assert.equal(review.rows[0].approval_status, "PENDING_OWNER_REVIEW");
  assert.equal(review.rows[0].owner_approval_required, true);
  assert.equal(review.data_mutation, false);
  assert.equal(review.owner_approval_required, true);
  const p = review.rows[0].proposed_insert_payload;
  assert.equal(p.slug, "wr1");
  assert.equal(p.confidence, "exact");
  assert.equal(p.cta_status, "live");
  assert.deepEqual(p.evidence, { stub: true });
  assert.ok(Array.isArray(review.rows[0].validation_basis));
  assert.ok(review.rows[0].validation_basis.some((s) => /validateLearningOutcomeInput/i.test(s)));
  assertWriterReadyBatchReviewNoBannedClaims(review);
});

test("learning_outcomes_writer_ready_batch_review_v1 is empty when no writer_ready rows", () => {
  const all = Array.from({ length: 3 }, (_, i) => insertPlanCountTestCandidate(i));
  const imp = baseEvidenceImportForPlan({ candidates: all, candidateCount: 3 });
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(imp);
  assert.equal(review.source_writer_ready_count, 0);
  assert.equal(review.reviewed_row_count, 0);
  assert.equal(review.rows.length, 0);
  assert.equal(review.data_mutation, false);
  assertWriterReadyBatchReviewNoBannedClaims(review);
});

test("learning_outcomes_writer_ready_batch_review_v1 caps rows at 10 with unknown_fact when more writer_ready exist", () => {
  const all = Array.from({ length: 11 }, (_, i) => ({
    source_file: `data/evidence/cap-wr-${String(i).padStart(2, "0")}.json`,
    proposed_learning_outcome: {
      slug: `cap${i}`,
      part_number: `CAP${i}`,
      model_number: null,
      candidate_url: "https://www.amazon.com/dp/B00CAPTEST99",
      retailer: "amazon",
      outcome: "pass" as const,
      reason: "Cap test row.",
      reason_detail: null,
      confidence: "exact" as const,
      cta_status: "live" as const,
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { cap_index: i },
    },
    mapping_basis: [] as string[],
    missing_or_unknown_fields: [] as string[],
    owner_approval_required: true as const,
  }));
  const imp = baseEvidenceImportForPlan({ candidates: all, candidateCount: 11 });
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(imp);
  assert.equal(review.source_writer_ready_count, 11);
  assert.equal(review.rows.length, 10);
  assert.ok(review.unknown_facts.some((u) => /exceed review display cap/i.test(u)));
  assertWriterReadyBatchReviewNoBannedClaims(review);
});

test("command_center_v2 surfaces learning_outcomes_writer_ready_batch_review_v1 read_only", async () => {
  const proposedWr: ProposedLearningOutcomeRowV1 = {
    slug: "wr1",
    part_number: "WR1",
    model_number: null,
    candidate_url: "https://www.amazon.com/dp/B00WR1TEST99",
    retailer: "amazon",
    outcome: "pass",
    reason: "Recorded.",
    reason_detail: null,
    confidence: "exact",
    cta_status: "live",
    index_status: null,
    date_checked: "2026-05-10T12:00:00.000Z",
    next_action: null,
    evidence_jsonb_stub: { stub: true },
  };
  const imp = baseEvidenceImportForPlan({
    candidates: [
      {
        source_file: "data/evidence/amazon-wr1-live-outcome.json",
        proposed_learning_outcome: proposedWr,
        mapping_basis: [],
        missing_or_unknown_fields: [],
        owner_approval_required: true,
      },
    ],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const review = report.command_center_v2.learning_outcomes_writer_ready_batch_review_v1;
  assert.equal(review.contract, "learning_outcomes_writer_ready_batch_review_v1");
  assert.equal(review.data_mutation, false);
  assert.equal(review.owner_approval_required, true);
  assert.equal(review.rows.length, 1);
  assertWriterReadyBatchReviewNoBannedClaims(review);
});

test("learning_outcomes_owner_confidence_assignment_plan_v1 lists live-outcome Amazon pass rows missing confidence", () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [confidenceAssignmentEligibleCand(0)],
  });
  const plan = buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(imp);
  assert.equal(plan.contract, "learning_outcomes_owner_confidence_assignment_plan_v1");
  assert.equal(plan.source_candidate_count, 1);
  assert.equal(plan.assignment_candidate_count, 1);
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.rows[0].missing_field, "confidence");
  assert.deepEqual(plan.rows[0].allowed_confidence_values, ["exact", "likely", "uncertain"]);
  assert.equal(plan.rows[0].blocked_until_owner_sets_confidence, true);
  assert.equal(plan.rows[0].owner_approval_required, true);
  assert.equal(plan.rows[0].proposed_learning_outcome.confidence, null);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.owner_approval_required, true);
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});

test("learning_outcomes_owner_confidence_assignment_plan_v1 excludes multipack-style writer_ready rows without live-outcome gates", () => {
  const multipackWriterReady: EvidenceToLoImportCandidateV1 = {
    source_file: "data/evidence/amazon-multipack-conversion-batch.2026-04-30.json",
    proposed_learning_outcome: {
      slug: "mp",
      part_number: "MP",
      model_number: null,
      candidate_url: "https://www.amazon.com/dp/B00MP00999",
      retailer: "amazon",
      outcome: "unknown",
      reason: "Multipack fixture row.",
      reason_detail: null,
      confidence: "exact",
      cta_status: "not_live",
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { multipack: true },
    },
    mapping_basis: [],
    missing_or_unknown_fields: [],
    owner_approval_required: true,
  };
  const imp = baseEvidenceImportForPlan({
    candidates: [multipackWriterReady, confidenceAssignmentEligibleCand(0)],
  });
  const plan = buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(imp);
  assert.equal(plan.assignment_candidate_count, 1);
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.rows[0].proposed_learning_outcome.slug, "ca0");
  const wr = buildLearningOutcomesWriterReadyBatchReviewV1(imp);
  assert.equal(wr.source_writer_ready_count, 1);
  assert.equal(wr.rows[0].proposed_insert_payload.slug, "mp");
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});

test("learning_outcomes_owner_confidence_assignment_plan_v1 caps at 10 with unknown_fact", () => {
  const all = Array.from({ length: 11 }, (_, i) => confidenceAssignmentEligibleCand(i));
  const imp = baseEvidenceImportForPlan({ candidates: all, candidateCount: 11 });
  const plan = buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(imp);
  assert.equal(plan.assignment_candidate_count, 11);
  assert.equal(plan.rows.length, 10);
  assert.ok(plan.unknown_facts.some((u) => /exceed display cap/i.test(u)));
  assert.ok(plan.rows.every((r) => r.proposed_learning_outcome.confidence === null));
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});

test("command_center_v2 surfaces learning_outcomes_owner_confidence_assignment_plan_v1 read_only", async () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [confidenceAssignmentEligibleCand(0)],
  });
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const plan = report.command_center_v2.learning_outcomes_owner_confidence_assignment_plan_v1;
  assert.equal(plan.contract, "learning_outcomes_owner_confidence_assignment_plan_v1");
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.owner_approval_required, true);
  assert.equal(plan.rows.length, 1);
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});

function registryKeyedLiveOutcomeCand(args: {
  source_file: string;
  slug: string;
}): EvidenceToLoImportCandidateV1 {
  return {
    source_file: args.source_file,
    proposed_learning_outcome: {
      slug: args.slug,
      part_number: args.slug.toUpperCase(),
      model_number: null,
      candidate_url: "https://www.amazon.com/dp/B00REGKEY099",
      retailer: "amazon",
      outcome: "pass",
      reason: "Registry-keyed live outcome fixture.",
      reason_detail: null,
      confidence: null,
      cta_status: "live",
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { registry_keyed: true },
    },
    mapping_basis: [],
    missing_or_unknown_fields: ["confidence"],
    owner_approval_required: true,
  };
}

test("learning_outcomes_confidence_approvals_registry loader ignores invalid confidence rows", () => {
  const loaded = loadLearningOutcomesConfidenceApprovalsRegistry({
    rootDir: "/tmp",
    fileExists: () => true,
    readTextFile: () =>
      JSON.stringify({
        contract: "learning_outcomes_confidence_approvals_v1",
        owner_approved: true,
        data_mutation: false,
        approvals: [
          {
            source_file: "data/evidence/amazon-good-live-outcome.json",
            slug: "goodslug",
            confidence: "exact",
            approved_by_owner: true,
            approval_reason: "Valid row.",
          },
          {
            source_file: "data/evidence/amazon-bad-live-outcome.json",
            slug: "badslug",
            confidence: "invalid_literal",
            approved_by_owner: true,
            approval_reason: "Bad confidence literal.",
          },
        ],
      }),
  });
  assert.equal(loaded.runtime_status, "OK");
  assert.equal(loaded.valid_approvals.length, 1);
  assert.equal(loaded.valid_approvals[0].slug, "goodslug");
  assert.equal(loaded.invalid_entries.length, 1);
  assert.ok(loaded.invalid_entries[0].reasons.some((r) => /exact\|likely\|uncertain/i.test(r)));
});

test("owner confidence registry applies merged confidence only when source_file and slug align", () => {
  const sfApproved = "data/evidence/registry-key-alpha-live-outcome.json";
  const sfOther = "data/evidence/registry-key-beta-live-outcome.json";
  const slug = "regkey01";
  const lookup = createConfidenceApprovalLookup([
    {
      source_file: sfApproved,
      slug,
      confidence: "exact",
      approved_by_owner: true,
      approval_reason: "Scoped approval.",
    },
  ]);
  const imp = baseEvidenceImportForPlan({
    candidates: [
      registryKeyedLiveOutcomeCand({ source_file: sfApproved, slug }),
      registryKeyedLiveOutcomeCand({ source_file: sfOther, slug }),
    ],
  });
  const plan = buildLearningOutcomesInsertPlanV1(imp, lookup);
  assert.equal(plan.writer_ready_count, 1);
  assert.equal(plan.owner_review_required_count, 1);
  const w = plan.proposed_first_batch.find((r) => r.disposition === "writer_ready");
  assert.ok(w);
  assert.equal(w.source_file, sfApproved);
  assert.ok(
    w.reasons.some((x) => /learning-outcomes-confidence-approvals\.json/i.test(x)),
    "writer_ready row should cite owner registry when confidence merged",
  );
  assertInsertPlanNoBannedClaims(plan);
});

test("registry-approved confidence makes matching live Amazon candidate writer_ready and appears in writer-ready batch review", () => {
  const sf = "data/evidence/registry-writer-live-outcome.json";
  const slug = "wrreg01";
  const lookup = createConfidenceApprovalLookup([
    {
      source_file: sf,
      slug,
      confidence: "likely",
      approved_by_owner: true,
      approval_reason: "Fixture owner approval.",
    },
  ]);
  const imp = baseEvidenceImportForPlan({
    candidates: [registryKeyedLiveOutcomeCand({ source_file: sf, slug })],
  });
  const plan = buildLearningOutcomesInsertPlanV1(imp, lookup);
  assert.equal(plan.writer_ready_count, 1);
  assert.equal(plan.proposed_first_batch[0].proposed_learning_outcome.confidence, "likely");
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(imp, lookup);
  assert.equal(review.source_writer_ready_count, 1);
  assert.equal(review.rows[0].proposed_insert_payload.confidence, "likely");
  assert.equal(review.rows[0].proposed_insert_payload.slug, slug);
  assertWriterReadyBatchReviewNoBannedClaims(review);
});

test("learning_outcomes_confidence_approval_registry_v1 counts unapplied approvals when no candidate matches", () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [registryKeyedLiveOutcomeCand({ source_file: "data/evidence/orphan-live-outcome.json", slug: "orphan" })],
  });
  const loaded: LearningOutcomesConfidenceApprovalsLoadedV1 = {
    registry_relative_path: "data/ops/learning-outcomes-confidence-approvals.json",
    runtime_status: "OK",
    valid_approvals: [
      {
        source_file: "data/evidence/not-present-file-live-outcome.json",
        slug: "ghost",
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "No matching candidate in this import.",
      },
    ],
    invalid_entries: [],
    proven_facts: [],
    unknown_facts: [],
  };
  const reg = buildLearningOutcomesConfidenceApprovalRegistryV1(imp, loaded);
  assert.equal(reg.contract, "learning_outcomes_confidence_approval_registry_v1");
  assert.equal(reg.data_mutation, false);
  assert.equal(reg.owner_approval_required, true);
  assert.equal(reg.valid_approval_count, 1);
  assert.equal(reg.invalid_approval_count, 0);
  assert.equal(reg.applied_approval_count, 0);
  assert.equal(reg.unapplied_approval_count, 1);
  assertConfidenceRegistryBlockNoBannedClaims(reg);
});

test("empty owner confidence registry does not infer confidence for candidates", () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [registryKeyedLiveOutcomeCand({ source_file: "data/evidence/no-registry-live-outcome.json", slug: "noregl" })],
  });
  const emptyLookup = createConfidenceApprovalLookup([]);
  const plan = buildLearningOutcomesInsertPlanV1(imp, emptyLookup);
  assert.equal(plan.writer_ready_count, 0);
  assert.equal(plan.owner_review_required_count, 1);
  assert.equal(plan.proposed_first_batch[0].proposed_learning_outcome.confidence, null);
  assert.ok(
    !plan.proven_facts.some((f) => /registry merged confidence/i.test(f)),
    "must not claim registry merge when lookup is empty",
  );
  assertInsertPlanNoBannedClaims(plan);
});

test("command_center_v2 learning_outcomes_confidence_approval_registry_v1 is read_only with accurate counts", async () => {
  const sf = "data/evidence/cc-reg-live-outcome.json";
  const slug = "ccreg99";
  const imp = baseEvidenceImportForPlan({
    candidates: [registryKeyedLiveOutcomeCand({ source_file: sf, slug })],
  });
  const loaded: LearningOutcomesConfidenceApprovalsLoadedV1 = {
    registry_relative_path: "data/ops/learning-outcomes-confidence-approvals.json",
    runtime_status: "OK",
    valid_approvals: [
      {
        source_file: sf,
        slug,
        confidence: "uncertain",
        approved_by_owner: true,
        approval_reason: "CC fixture.",
      },
      {
        source_file: "data/evidence/unused-in-import-live-outcome.json",
        slug: "lonely",
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "Unmatched approval row.",
      },
    ],
    invalid_entries: [{ index: 2, reasons: ["approvals[2].confidence must be exact|likely|uncertain."] }],
    proven_facts: [],
    unknown_facts: [],
  };
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => imp,
    learningOutcomesConfidenceApprovalsLoader: () => loaded,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const reg = report.command_center_v2.learning_outcomes_confidence_approval_registry_v1;
  assert.equal(reg.contract, "learning_outcomes_confidence_approval_registry_v1");
  assert.equal(reg.runtime_status, "OK");
  assert.equal(reg.registry_path, "data/ops/learning-outcomes-confidence-approvals.json");
  assert.equal(reg.data_mutation, false);
  assert.equal(reg.owner_approval_required, true);
  assert.equal(reg.valid_approval_count, 2);
  assert.equal(reg.invalid_approval_count, 1);
  assert.equal(reg.applied_approval_count, 1);
  assert.equal(reg.unapplied_approval_count, 1);
  assert.ok(Array.isArray(reg.proven_facts));
  assert.ok(Array.isArray(reg.unknown_facts));
  assertConfidenceRegistryBlockNoBannedClaims(reg);

  const insertPlan = report.command_center_v2.learning_outcomes_insert_plan_v1;
  assert.equal(insertPlan.writer_ready_count, 1);
  assert.equal(insertPlan.data_mutation, false);
  assert.equal(insertPlan.owner_approval_required, true);
  assertInsertPlanNoBannedClaims(insertPlan);

  const assignPlan = report.command_center_v2.learning_outcomes_owner_confidence_assignment_plan_v1;
  assert.equal(assignPlan.assignment_candidate_count, 0);
  assert.equal(assignPlan.data_mutation, false);
  assertConfidenceAssignmentPlanNoBannedClaims(assignPlan);

  const wrBatch = report.command_center_v2.learning_outcomes_writer_ready_batch_review_v1;
  assert.equal(wrBatch.source_writer_ready_count, 1);
  assert.equal(wrBatch.rows[0].proposed_insert_payload.confidence, "uncertain");
  assertWriterReadyBatchReviewNoBannedClaims(wrBatch);
});

test("top_of_game_foundation_lane_weights_v1 sum to 100", () => {
  assert.equal(Object.values(TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1).reduce((a, b) => a + b, 0), 100);
});

test("command_center_v2 top_of_game durable_learning_write_proven is BLOCKED when total_outcomes is 0", async () => {
  const lo: LearningOutcomesReadModelV1 = {
    ...learningOutcomesReadModelOkFixture(),
    total_outcomes: 0,
    latest_outcomes: [],
  };
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => lo,
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "durable_learning_write_proven",
  );
  assert.ok(lane);
  assert.equal(lane.status, "BLOCKED");
  assert.equal(lane.score_contribution, 0);
  assert.equal(report.command_center_v2.top_of_game_foundation_scorecard_v1.goal_reached, false);
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command_center_v2 top_of_game durable_learning_write_proven is PROVEN when total_outcomes > 0", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "durable_learning_write_proven",
  );
  assert.ok(lane);
  assert.equal(lane.status, "PROVEN");
  assert.equal(lane.score_contribution, 10);
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command_center_v2 top_of_game live_site_smoke_truth is BLOCKED when deploy is PLACEHOLDER", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    liveSiteMonitor: null,
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.equal(report.command_center_v2.deploy_live_site_status.status, "PLACEHOLDER");
  const lane = report.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "live_site_smoke_truth",
  );
  assert.ok(lane);
  assert.equal(lane.status, "BLOCKED");
  assert.equal(lane.score_contribution, 0);
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command_center_v2 top_of_game revenue_truth_connection is not PROVEN when commission_or_revenue is NOT_CONNECTED", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "revenue_truth_connection",
  );
  assert.ok(lane);
  assert.notEqual(lane.status, "PROVEN");
  assert.equal(
    report.command_center_v2.revenue_snapshot.click_visibility?.commission_or_revenue,
    "NOT_CONNECTED",
  );
  assertFoundationScorecardNoBannedClaims(report.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("command_center_v2 top_of_game public_trust lane is not PROVEN when trust module paths are absent (fileExists false)", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const pt = report.command_center_v2.public_trust_unification_backend_contract_v1;
  assert.equal(pt.coverage_status, "UNKNOWN");
  assert.equal(pt.proven_signal_count, 0);
  assert.equal(pt.required_signals.length, PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1.length);
  assert.notEqual(pt.coverage_status, "PROVEN");
  const sc = report.command_center_v2.top_of_game_foundation_scorecard_v1;
  const lane = sc.lanes.find((l) => l.lane_id === "public_trust_unification_backend_contract");
  assert.ok(lane);
  assert.notEqual(lane.status, "PROVEN");
  assert.equal(lane.score_contribution, 0);
  assert.equal(sc.foundation_maturity_score_100 < 100, true);
  assert.equal(sc.goal_reached, false);
  assertPublicTrustContractNoBannedClaims(pt);
  assertFoundationScorecardNoBannedClaims(sc);
});

test("public_trust_unification_backend_contract_v1 is PROVEN against this repo checkout (file existence)", () => {
  const rootDir = path.resolve(__dirname, "..");
  const c = buildPublicTrustUnificationBackendContractV1({ rootDir, fileExists: fs.existsSync });
  assert.equal(c.coverage_status, "PROVEN");
  assert.equal(c.proven_signal_count, PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1.length);
  assert.equal(c.missing_signal_count, 0);
  assert.deepEqual([...c.required_signals].sort(), [...PUBLIC_TRUST_UNIFICATION_REQUIRED_SIGNALS_V1].sort());
  assertPublicTrustContractNoBannedClaims(c);
});

test("public_trust_unification_backend_contract_v1 is PARTIAL when one required module is hidden", () => {
  const rootDir = path.resolve(__dirname, "..");
  const c = buildPublicTrustUnificationBackendContractV1({
    rootDir,
    fileExists: (abs) => (abs.endsWith("part-trust.ts") ? false : fs.existsSync(abs)),
  });
  assert.equal(c.coverage_status, "PARTIAL");
  assert.ok(c.proven_signal_count > 0 && c.proven_signal_count < c.required_signals.length);
  assertPublicTrustContractNoBannedClaims(c);
});

test("command_center_v2 public_trust lane adds 8 vs masked trust paths when repo checkout is complete", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const common = {
    rootDir,
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    readDir: () => [],
    readTextFile: readTextFileTrackerOrRepoData,
  };
  const absent = await buildBuckpartsCommandCenterReport({
    ...common,
    fileExists: () => false,
  });
  const present = await buildBuckpartsCommandCenterReport(common);
  assert.equal(present.command_center_v2.public_trust_unification_backend_contract_v1.coverage_status, "PROVEN");
  const absentPublicTrustLane = absent.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "public_trust_unification_backend_contract",
  );
  const presentPublicTrustLane = present.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "public_trust_unification_backend_contract",
  );
  assert.ok(absentPublicTrustLane && presentPublicTrustLane);
  const publicTrustDelta =
    presentPublicTrustLane.score_contribution - absentPublicTrustLane.score_contribution;
  assert.equal(
    publicTrustDelta,
    TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1.public_trust_unification_backend_contract,
  );
  const lane = presentPublicTrustLane;
  assert.equal(lane.status, "PROVEN");
  assert.equal(lane.score_contribution, TOP_OF_GAME_FOUNDATION_LANE_WEIGHTS_V1.public_trust_unification_backend_contract);
  assertFoundationScorecardNoBannedClaims(present.command_center_v2.top_of_game_foundation_scorecard_v1);
  assertPublicTrustContractNoBannedClaims(present.command_center_v2.public_trust_unification_backend_contract_v1);
});

test("revenue_truth_ledger_contract_v1 loads committed empty ledger as PROVEN read-only", () => {
  const rootDir = path.resolve(__dirname, "..");
  const c = buildRevenueTruthLedgerContractV1({
    rootDir,
    fileExists: fs.existsSync,
    readTextFile: (p) => fs.readFileSync(p, "utf8"),
  });
  assert.equal(c.contract, "revenue_truth_ledger_contract_v1");
  assert.equal(c.ledger_file_relative_path, REVENUE_LEDGER_FILE_RELATIVE_V1);
  assert.equal(c.ledger_inner_contract, "revenue_ledger_v1");
  assert.equal(c.coverage_status, "PROVEN");
  assert.equal(c.runtime_status, "OK");
  assert.equal(c.valid_entry_count, 0);
  assert.equal(c.invalid_entry_count, 0);
  assert.equal(c.entries_evaluated_count, 0);
  assert.equal(c.total_reported_gross_usd, 0);
  assert.equal(c.read_only, true);
  assert.equal(c.data_mutation, false);
  assert.equal(c.owner_approval_required, false);
  assertRevenueLedgerContractNoBannedClaims(c);
});

test("revenue_truth_ledger_contract_v1 invalid entry rows yield PARTIAL without throwing", () => {
  const rootDir = path.resolve(__dirname, "..");
  const badJson = JSON.stringify({
    contract: "revenue_ledger_v1",
    entries: [{ id: "", recorded_at: "2026-01-01" }, { id: "e1", recorded_at: "2026-01-02", amount_usd: 12 }],
  });
  const c = buildRevenueTruthLedgerContractV1({
    rootDir,
    fileExists: () => true,
    readTextFile: () => badJson,
  });
  assert.equal(c.coverage_status, "PARTIAL");
  assert.equal(c.runtime_status, "PARTIAL_VALIDATION");
  assert.equal(c.invalid_entry_count, 1);
  assert.equal(c.valid_entry_count, 1);
  assert.ok(c.invalid_entry_samples.length > 0);
  assertRevenueLedgerContractNoBannedClaims(c);
});

test("command_center_v2 revenue_truth_connection adds 4 vs masked ledger file when click visibility is OK", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const common = {
    rootDir,
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    readDir: () => [],
    readTextFile: (abs: string) => fs.readFileSync(abs, "utf8"),
  };
  const absent = await buildBuckpartsCommandCenterReport({
    ...common,
    fileExists: (abs) => (abs.includes("revenue-ledger-v1.json") ? false : fs.existsSync(abs)),
  });
  const present = await buildBuckpartsCommandCenterReport({ ...common, fileExists: fs.existsSync });
  assert.equal(absent.command_center_v2.revenue_truth_ledger_contract_v1.coverage_status, "UNKNOWN");
  assert.equal(present.command_center_v2.revenue_truth_ledger_contract_v1.coverage_status, "PROVEN");
  const revPresent = present.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "revenue_truth_connection",
  );
  const revAbsent = absent.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "revenue_truth_connection",
  );
  assert.ok(revPresent && revAbsent);
  assert.equal(revPresent.status, "PROVEN");
  assert.equal(revAbsent.status, "PARTIAL");
  const delta =
    present.command_center_v2.top_of_game_foundation_scorecard_v1.foundation_maturity_score_100 -
    absent.command_center_v2.top_of_game_foundation_scorecard_v1.foundation_maturity_score_100;
  assert.equal(delta, 4);
  assertRevenueLedgerContractNoBannedClaims(present.command_center_v2.revenue_truth_ledger_contract_v1);
  assertFoundationScorecardNoBannedClaims(present.command_center_v2.top_of_game_foundation_scorecard_v1);
});

test("top_of_game_foundation_scorecard_v1 goal_reached matches score 100 and all lanes PROVEN", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    rootDir: path.resolve(__dirname, ".."),
    providers: baseProviders(),
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    readDir: () => [],
    readTextFile: (abs: string) => fs.readFileSync(abs, "utf8"),
    fileExists: fs.existsSync,
  });
  const s = report.command_center_v2.top_of_game_foundation_scorecard_v1;
  assert.equal(s.goal_reached, s.foundation_maturity_score_100 === 100 && s.lanes.every((l) => l.status === "PROVEN"));
  assert.ok(s.foundation_maturity_score_100 <= 100);
});

test("command_center_v2 batch_production_owner_decisions_lane_v1 with real registry export", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    rootDir: path.resolve(__dirname, ".."),
    providers: baseProviders(),
    readDir: () => [],
    readTextFile: (abs: string) => {
      if (abs.endsWith("affiliate-application-tracker.json")) return BASE_TRACKER;
      if (abs.endsWith("amazon-rescue-token-controls.json")) return MINIMAL_TOKEN_CONTROLS_JSON;
      return fs.readFileSync(abs, "utf8");
    },
    fileExists: (abs: string) => {
      if (abs.endsWith("affiliate-application-tracker.json")) return true;
      if (abs.endsWith("amazon-rescue-token-controls.json")) return true;
      return fs.existsSync(abs);
    },
  });
  const lane = report.command_center_v2.batch_production_owner_decisions_lane_v1;
  assert.equal(lane.runtime_status, "OK");
  assert.equal(lane.approved_for_planning_count, 3);
  assert.equal(lane.may_mutate, false);
  assert.equal(lane.mutation_authority, false);
  assert.equal(lane.automation_input, false);
  assert.equal(lane.layer_6_founder_only_production_mutation_approval, "NOT_PROVEN");
  assert.equal(lane.batch_size_20_status, "BLOCKED");
  assert.ok(lane.approved_rows.every((r) => r.allowed_next_scope === "read_only_agent"));
  assert.equal(
    lane.primary_source_registry_file,
    "data/owner-decisions/batch-non-amazon-pdp-owner-approval.json",
  );
});

const EXPECTED_OWNER_COMMAND_CENTER_NEURON_KEYS = [
  "page_state_distribution",
  "trust_funnel_measurement",
  "gsc_search_discovery",
  "search_demand_and_gaps",
  "click_visibility",
  "affiliate_readiness",
  "coverage_health",
  "batch_production_owner_decisions",
] as const;

function findBrainManifestEntry(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
  predicate: (row: {
    system_id: string;
    npm_script_or_path: string;
    verdict: string;
    dashboard_only: boolean;
  }) => boolean,
) {
  const manifest = report.command_center_v2.command_center_brain_coverage_manifest_v1;
  return manifest.entries.find(predicate);
}

test("command_center_v2.command_center_brain_coverage_manifest_v1 is read-only brain inventory", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const manifest = report.command_center_v2.command_center_brain_coverage_manifest_v1;
  assert.ok(manifest);
  assert.equal(manifest.contract, "command_center_brain_coverage_manifest_v1");
  assert.equal(manifest.read_only, true);
  assert.equal(manifest.data_mutation, false);
  assert.ok(manifest.entries.length > 0);
  assert.equal(manifest.total_entries, manifest.entries.length);
  assert.ok(manifest.verdict_counts);
  assert.ok(manifest.summary);
  assert.deepEqual(manifest.summary.verdict_counts, manifest.verdict_counts);
  assert.ok(manifest.verdict_counts.CONNECTED >= 1);
  assert.ok(manifest.summary_by_verdict.CONNECTED >= 1);
  assert.ok(manifest.proven_facts.some((f) => f.includes("buckparts:")));

  const ccScript = findBrainManifestEntry(
    report,
    (r) =>
      r.system_id === "buckparts_command_center" ||
      r.npm_script_or_path.includes("buckparts:command-center"),
  );
  assert.ok(ccScript);
  assert.equal(ccScript!.verdict, "CONNECTED");

  const daily = findBrainManifestEntry(report, (r) => r.npm_script_or_path.includes("buckparts:daily"));
  assert.ok(daily);
  assert.equal(daily!.verdict, "CONNECTED");
  assert.equal(daily!.cc_json_path, "command_center_v2.daily_operator_summary_v1");

  const demandQueue = findBrainManifestEntry(report, (r) =>
    r.npm_script_or_path.includes("buckparts:demand-work-queue"),
  );
  assert.ok(demandQueue);
  assert.equal(demandQueue!.verdict, "CONNECTED");
  assert.equal(demandQueue!.cc_json_path, "command_center_v2.demand_work_queue_summary_v1");

  const audit = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_audit");
  assert.ok(audit);
  assert.equal(audit!.verdict, "CONNECTED");
  assert.equal(audit!.cc_json_path, "command_center_v2.system_contract_audit_summary_v1");

  const founderRegistry = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_founder-decision-registry");
  assert.ok(founderRegistry);
  assert.equal(founderRegistry!.verdict, "CONNECTED");
  assert.equal(founderRegistry!.cc_json_path, "command_center_v2.founder_decision_registry_summary_v1");

  const nextPacket = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_next-execution-packet");
  assert.ok(nextPacket);
  assert.equal(nextPacket!.verdict, "CONNECTED");
  assert.equal(nextPacket!.cc_json_path, "command_center_v2.next_execution_packet_summary_v1");

  const operatingMap = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_operating-map");
  assert.ok(operatingMap);
  assert.equal(operatingMap!.verdict, "CONNECTED");
  assert.equal(operatingMap!.cc_json_path, "command_center_v2.operating_map_summary_v1");

  const hq = findBrainManifestEntry(report, (r) => r.system_id === "hq_handoff_doc");
  assert.ok(hq);
  assert.equal(hq!.verdict, "DEPRECATED");

  const sentinel = findBrainManifestEntry(report, (r) => r.system_id === "owner_integrity_sentinel");
  assert.ok(sentinel);
  assert.equal(sentinel!.dashboard_only, false);
  assert.equal(sentinel!.verdict, "CONNECTED");
  assert.equal(sentinel!.cc_json_path, "command_center_v2.owner_integrity_sentinel_v1");

  const sentry = findBrainManifestEntry(report, (r) => r.system_id === "sentry_error_monitoring");
  assert.ok(sentry);
  assert.equal(sentry!.verdict, "MISSING");

  const gh = findBrainManifestEntry(report, (r) => r.system_id === "github_actions_live_status");
  assert.ok(gh);
  assert.notEqual(gh!.verdict, "CONNECTED");
  assert.ok(gh!.verdict === "MISSING" || gh!.verdict === "PARTIAL");
});

test("command_center_v2.brain_consolidation_plan_v1 is read-only consolidation roadmap", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const plan = report.command_center_v2.brain_consolidation_plan_v1;
  const manifest = report.command_center_v2.command_center_brain_coverage_manifest_v1;
  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(plan);
  assert.equal(plan.contract, "brain_consolidation_plan_v1");
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.connected_count, manifest.verdict_counts.CONNECTED);
  assert.equal(plan.bypassing_count, manifest.verdict_counts.BYPASSING);
  assert.ok(plan.classification_counts);
  assert.equal(
    plan.skipped_standalone_count,
    plan.classification_counts.INTENTIONALLY_STANDALONE_DOWNSTREAM_VIEW +
      plan.classification_counts.INTENTIONALLY_STANDALONE_VALIDATION_HARNESS +
      plan.classification_counts.INTENTIONALLY_STANDALONE_ON_DEMAND_DEEP_PROOF,
  );
  for (const target of plan.high_priority_consolidation_targets) {
    assert.equal(target.consolidation_classification, "INTEGRATE_AS_CC_OPERATING_SUMMARY");
  }
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "owner_gsc_external_demand"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "owner_search_demand_and_gaps"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_daily"));
  assert.ok(!plan.next_consolidation_slice?.includes("daily_operator_summary_v1"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_demand-work-queue"));
  assert.ok(!plan.next_consolidation_slice?.includes("demand_work_queue_summary_v1"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_audit"));
  assert.ok(!plan.next_consolidation_slice?.includes("system_contract_audit_summary_v1"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_founder-decision-registry"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_next-execution-packet"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_operating-map"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_founder-digest"));
  assert.ok(!plan.next_consolidation_slice?.includes("founder_digest_summary_v1"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_gsc_external_demand"));
  assert.ok(!plan.next_consolidation_slice?.includes("owner_search_demand_and_gaps"));
  assert.ok(!plan.next_consolidation_slice?.includes("sentry_error_monitoring"));
  assert.ok(!plan.next_consolidation_slice?.includes("github_actions_live_status"));
  assert.ok(
    plan.intentionally_standalone_entries.some((e) => e.system_id === "buckparts_founder-digest"),
  );
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_founder-digest"));
  assert.equal(
    (report.command_center_v2 as { founder_digest_summary_v1?: unknown }).founder_digest_summary_v1,
    undefined,
  );
  assert.ok(!plan.next_consolidation_slice?.includes("precheck"));
  assert.ok(!plan.next_consolidation_slice?.includes("amazon-refrigerator-token"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_precheck_amazon-refrigerator-tokens"));
  assert.ok(
    plan.intentionally_standalone_entries.some(
      (e) => e.system_id === "buckparts_precheck_amazon-refrigerator-tokens",
    ),
  );
  assert.ok(
    !plan.high_priority_consolidation_targets.some(
      (e) => e.system_id === "buckparts_precheck_amazon-refrigerator-tokens",
    ),
  );
  assert.equal(
    (report.command_center_v2 as { amazon_refrigerator_token_precheck_summary_v1?: unknown })
      .amazon_refrigerator_token_precheck_summary_v1,
    undefined,
  );
  assert.ok(!plan.next_consolidation_slice?.includes("runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("buckparts_runner-step"));
  assert.ok(!plan.next_consolidation_slice?.includes("runner_step_summary_v1"));
  if (plan.next_consolidation_slice !== null) {
    assert.equal(
      plan.next_safe_integration_target?.consolidation_classification,
      "INTEGRATE_AS_CC_OPERATING_SUMMARY",
    );
  }
  assert.ok(plan.intentionally_standalone_entries.some((e) => e.system_id === "buckparts_runner-step"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_runner-step"));
  assert.equal(
    (report.command_center_v2 as { runner_step_summary_v1?: unknown }).runner_step_summary_v1,
    undefined,
  );
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_daily"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_demand-work-queue"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_audit"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_founder-decision-registry"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_next-execution-packet"));
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "buckparts_operating-map"));
  const mutate = plan.do_not_integrate_entries.find((e) => e.system_id.includes("mutate"));
  assert.ok(mutate);
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "hq_handoff_doc"));
  assert.ok(plan.proven_facts.some((f) => f.includes(gate.brain_status)));
});

test("command_center_v2.daily_operator_summary_v1 is read-only CC-owned daily operator lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.daily_operator_summary_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "daily_operator_summary_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.source_command, "npm run buckparts:daily");
  assert.ok(typeof lane.next_owner_action === "string" && lane.next_owner_action.length > 0);

  const manifestEntry = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_daily");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.dashboard_only, false);
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.daily_operator_summary_v1");

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  const bypassGaps = report.command_center_v2.command_center_brain_coverage_manifest_v1.entries.filter(
    (e) => e.verdict === "BYPASSING" && e.system_id === "buckparts_daily",
  );
  assert.equal(bypassGaps.length, 0);
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "buckparts_daily"));
});

test("command_center_v2 Mode B wave #1 summary lanes are read-only CC-owned", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lanes = [
    ["system_contract_audit_summary_v1", "npm run buckparts:audit", "buckparts_audit"],
    ["founder_decision_registry_summary_v1", "npm run buckparts:founder-decision-registry", "buckparts_founder-decision-registry"],
    ["next_execution_packet_summary_v1", "npm run buckparts:next-execution-packet", "buckparts_next-execution-packet"],
    ["operating_map_summary_v1", "npm run buckparts:operating-map", "buckparts_operating-map"],
  ] as const;
  for (const [contract, sourceCommand, systemId] of lanes) {
    const lane = report.command_center_v2[contract];
    assert.ok(lane, contract);
    assert.equal(lane.contract, contract);
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.source_command, sourceCommand);
    const manifestEntry = findBrainManifestEntry(report, (r) => r.system_id === systemId);
    assert.ok(manifestEntry, systemId);
    assert.equal(manifestEntry!.verdict, "CONNECTED");
    assert.equal(manifestEntry!.cc_json_path, `command_center_v2.${contract}`);
  }
  const gate = report.command_center_v2.brain_integrity_gate_v1;
  for (const [, , systemId] of lanes) {
    assert.ok(!gate.partial_entries.some((e) => e.system_id === systemId));
  }
});

test("command_center_v2.demand_work_queue_summary_v1 is read-only CC-owned demand queue lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.demand_work_queue_summary_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "demand_work_queue_summary_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.source_command, "npm run buckparts:demand-work-queue");
  assert.ok(lane.top_items.length <= 5);
  assert.ok(lane.blocked_or_unknown_inputs.length <= 3);

  const manifestEntry = findBrainManifestEntry(report, (r) => r.system_id === "buckparts_demand-work-queue");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.dashboard_only, false);
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.demand_work_queue_summary_v1");

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "buckparts_demand-work-queue"));
});

test("command_center_v2.large_batch_coverage_factory_summary_v1 is read-only Codex planning lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.large_batch_coverage_factory_summary_v1;
  assert.ok(lane);
  assert.equal(lane.report_name, "buckparts_large_batch_coverage_factory_summary_v1");
  assert.equal(lane.contract, "large_batch_coverage_factory_summary_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_ready, false);
  assert.equal(lane.source_command, "npm run buckparts:large-batch-coverage-factory");
  if (lane.runtime_status === "OK") {
    assert.equal(typeof lane.candidate_count, "number");
    assert.ok(lane.candidate_count > 0);
    assert.notEqual(lane.state_counts, "UNKNOWN");
    assert.ok(lane.top_5_candidates.length <= 5);
    assert.ok(lane.expansion_blocker_summary.includes("Factory currently classifies"));
  }
  assert.match(lane.next_agent_action, /read-only/i);
  assert.match(lane.next_agent_action, /do not mutate production/i);
  assert.doesNotMatch(lane.next_agent_action, /\bimport-seed\b/i);
  assert.doesNotMatch(lane.next_agent_action, /\bdeploy\b/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_large-batch-coverage-factory",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.large_batch_coverage_factory_summary_v1");

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "buckparts_large-batch-coverage-factory"));
});

test("command_center_v2.fridge_buyer_path_owner_review_bridge_v1 is read-only owner-review lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_owner_review_bridge_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_owner_review_bridge_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_owner_review_bridge_v1",
  );
  assert.equal(lane.cohort_count, 14);
  assert.equal(lane.owner_review_ready_count, 14);
  assert.equal(lane.mutation_ready_count, 0);
  assert.equal(lane.formal_batch_exists, false);
  assert.equal(lane.top_cohort_slugs[0], "4396710");
  assert.equal(lane.apply_mutation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.retailer_links_mutation_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.buy_link_mutation_authorized, false);
  assert.match(lane.recommended_next_action, /no CSV/i);
  assert.doesNotMatch(report.next_best_action, /fridge_buyer_path_owner_review_bridge/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-owner-review-bridge",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_owner_review_bridge_v1",
  );

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(
    !gate.partial_entries.some((e) => e.system_id === "buckparts_fridge-buyer-path-owner-review-bridge"),
  );
});

test("command_center_v2.universal_batch_lifecycle_truth_table_v1 is read-only lifecycle consolidation lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.universal_batch_lifecycle_truth_table_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "universal_batch_lifecycle_truth_table_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.universal_batch_lifecycle_truth_table_v1");
  assert.equal(lane.lifecycle_states.length, 12);

  const fridge = lane.current_wedge_states.find((row) => row.wedge === "refrigerator_water");
  assert.ok(fridge);
  assert.ok(
    fridge!.lifecycle_state === "closed" ||
      fridge!.lifecycle_state === "apply_plan_owner_approved" ||
      fridge!.lifecycle_state === "apply_readiness_ready" ||
      fridge!.lifecycle_state === "parity_verified" ||
      fridge!.alternate_lifecycle_states.includes("apply_readiness_unknown"),
  );
  assert.equal(fridge!.mutation_allowed, false);

  const ap = lane.current_wedge_states.find((row) => row.wedge === "air_purifier");
  assert.ok(ap);
  if (report.command_center_v2.batch_run_registry_intake_v1.ap_run_registry_status === "PROVEN_CLOSED") {
    assert.equal(ap!.lifecycle_state, "closed");
  }

  assert.ok(
    lane.redundant_lanes_to_fold.includes("command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1"),
  );
  assert.equal(lane.inherited_lifecycle_mutation_policy.mutation_allowed, false);

  const applyReadiness = report.command_center_v2.universal_batch_lifecycle_apply_readiness_v1;
  assert.ok(applyReadiness);
  assert.equal(applyReadiness.read_only, true);
  assert.equal(applyReadiness.data_mutation, false);
  assert.equal(applyReadiness.mutation_authorized, false);
  assert.equal(applyReadiness.source_command, "npm run buckparts:universal-batch-lifecycle-apply-readiness");

  const applyExecutionPlan = report.command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1;
  assert.ok(applyExecutionPlan);
  assert.equal(applyExecutionPlan.read_only, true);
  assert.equal(applyExecutionPlan.data_mutation, false);
  assert.equal(applyExecutionPlan.mutation_authorized, false);
  assert.equal(
    applyExecutionPlan.source_command,
    "npm run buckparts:universal-batch-lifecycle-apply-execution-plan",
  );
  const mutationAuthReview =
    report.command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1;
  assert.ok(mutationAuthReview);
  assert.equal(mutationAuthReview.read_only, true);
  assert.equal(mutationAuthReview.data_mutation, false);
  assert.equal(
    mutationAuthReview.source_command,
    "npm run buckparts:universal-batch-lifecycle-mutation-authorization-review",
  );

  if (
    fridge?.lifecycle_state === "apply_plan_owner_approved" &&
    fridge.alternate_lifecycle_states.includes("apply_readiness_unknown")
  ) {
    assert.ok(report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_UNKNOWN]:"));
    assert.match(report.next_best_action, /owner-approved planning for 14 apply-plan changes/i);
    assert.match(report.next_best_action, /apply readiness is not proven/i);
    assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
    assert.equal(report.execution_guidance.mutating_blocked, true);
    assert.equal(
      report.execution_guidance.next_move_command,
      "npm run buckparts:universal-batch-lifecycle-apply-readiness",
    );
    assert.doesNotMatch(report.execution_guidance.next_move_command, /UNKNOWN:/);
    assert.doesNotMatch(report.execution_guidance.next_move_command, /batch-apply-plan-approval/);
    assert.notEqual(applyReadiness.apply_readiness_status, "PROVEN");
  } else if (fridge?.lifecycle_state === "parity_verified") {
    assert.equal(lane.one_true_next_state_for_refrigerator_water, "parity_verified");
    assert.equal(
      mutationAuthReview.mutation_authorization_review_status,
      "APPLIED_PARITY_PROVEN",
    );
    assert.match(report.next_best_action, /APPLIED_PARITY_PROVEN/);
    assert.match(report.next_best_action, /Do not run write mode again/i);
    assert.equal(
      report.execution_guidance.next_move_command,
      "node --import tsx scripts/report-buckparts-command-center.ts",
    );
    assert.equal(mutationAuthReview.apply_executor_ready, false);
    assert.ok(
      !report.execution_guidance.mutating_block_reasons.includes(
        "mutation_authorization_review_v1:apply_executor_ready=false",
      ),
    );
  } else if (fridge?.lifecycle_state === "apply_readiness_ready") {
    assert.equal(applyReadiness.apply_readiness_status, "PROVEN");
    assert.ok(
      report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_READY]:") ||
        report.next_best_action.startsWith("LIFECYCLE [MUTATION_AUTHORIZED_FOR_GUARDED_APPLY]:"),
    );
    if (applyExecutionPlan.execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW") {
      assert.match(report.next_best_action, /execution plan is READY_FOR_MUTATION_AUTH_REVIEW/i);
      if (mutationAuthReview.mutation_authorization_review_status === "BLOCKED") {
        assert.equal(
          report.execution_guidance.next_move_command,
          "npm run buckparts:universal-batch-lifecycle-mutation-authorization-review",
        );
      } else if (
        mutationAuthReview.mutation_authorization_review_status ===
          "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
        mutationAuthReview.csv_apply_authorized === true
      ) {
        assert.equal(
          report.execution_guidance.next_move_command,
          "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor",
        );
        assert.doesNotMatch(report.next_best_action, /owner mutation approval still required/i);
      } else {
        assert.equal(
          report.execution_guidance.next_move_command,
          "npm run buckparts:universal-batch-lifecycle-apply-execution-plan",
        );
      }
      assert.equal(applyExecutionPlan.planned_change_count, 14);
      assert.equal(applyExecutionPlan.row_patch_preview.length, 14);
      assert.doesNotMatch(
        report.execution_guidance.mutating_block_reasons.join("\n"),
        /fridge_buyer_path_batch_apply_plan/,
      );
      if (mutationAuthReview.mutation_authorization_review_status === "BLOCKED") {
        assert.ok(
          report.execution_guidance.mutating_block_reasons.some((reason) =>
            reason.startsWith("mutation_authorization_review_v1:missing_active_owner_mutation_approval:"),
          ),
        );
        assert.equal(mutationAuthReview.apply_executor_ready, true);
        assert.ok(
          !report.execution_guidance.mutating_block_reasons.includes(
            "mutation_authorization_review_v1:apply_executor_ready=false",
          ),
        );
      }
    } else {
      assert.equal(
        report.execution_guidance.next_move_command,
        "npm run buckparts:universal-batch-lifecycle-apply-readiness",
      );
    }
  } else {
    assert.doesNotMatch(report.next_best_action, /^LIFECYCLE CONSOLIDATION \[/);
    assert.notEqual(report.next_best_action, lane.recommended_next_action);
  }

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "universal_batch_lifecycle_truth_table",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.universal_batch_lifecycle_truth_table_v1",
  );

  const applyReadinessManifest = findBrainManifestEntry(
    report,
    (r) => r.system_id === "universal_batch_lifecycle_apply_readiness",
  );
  assert.ok(applyReadinessManifest);
  assert.equal(applyReadinessManifest!.verdict, "CONNECTED");
  assert.equal(
    applyReadinessManifest!.cc_json_path,
    "command_center_v2.universal_batch_lifecycle_apply_readiness_v1",
  );

  const applyExecutionPlanManifest = findBrainManifestEntry(
    report,
    (r) => r.system_id === "universal_batch_lifecycle_apply_execution_plan",
  );
  assert.ok(applyExecutionPlanManifest);
  assert.equal(applyExecutionPlanManifest!.verdict, "CONNECTED");
  assert.equal(
    applyExecutionPlanManifest!.cc_json_path,
    "command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1",
  );
  const mutationAuthReviewManifest = findBrainManifestEntry(
    report,
    (r) => r.system_id === "universal_batch_lifecycle_mutation_authorization_review",
  );
  assert.ok(mutationAuthReviewManifest);
  assert.equal(mutationAuthReviewManifest!.verdict, "CONNECTED");
  assert.equal(
    mutationAuthReviewManifest!.cc_json_path,
    "command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1",
  );
});

test("command_center_v2.command_center_efficiency_truth_table_v1 is read-only efficiency audit lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.command_center_efficiency_truth_table_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "command_center_efficiency_truth_table_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.command_center_efficiency_truth_table_v1");
  assert.ok(lane.repeated_gate_count >= 1);
  assert.ok(lane.consolidation_candidates.length >= 1);
  const fridgeCandidate = lane.consolidation_candidates.find(
    (candidate) => candidate.pattern_id === "fridge_buyer_path_micro_lane_chain",
  );
  assert.ok(fridgeCandidate);
  assert.doesNotMatch(report.next_best_action, /command_center_efficiency_truth_table/i);
  assert.doesNotMatch(report.next_best_action, /^EFFICIENCY AUDIT \[/);
  assert.notEqual(report.next_best_action, lane.recommended_next_action);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "command_center_efficiency_truth_table",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.command_center_efficiency_truth_table_v1",
  );
});

test("command_center_v2.owner_drift_detector_v1 is read-only drift detector lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.owner_drift_detector_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "owner_drift_detector_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.owner_drift_detector_v1");
  assert.equal(lane.decision, "FINISH_CURRENT_FIRST");
  assert.equal(lane.mutation_authorized, false);
  assert.doesNotMatch(report.next_best_action, /owner_drift_detector/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_owner-drift-detector",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.owner_drift_detector_v1");
});

test("command_center_v2.batch_run_registry_intake_v1 is read-only universal run-registry intake lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.batch_run_registry_intake_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "batch_run_registry_intake_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.batch_run_registry_intake_v1");
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.ap_run_registry_status, "PROVEN_CLOSED");
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (fs.existsSync(fridgeRegistryAbs)) {
    const registry = JSON.parse(fs.readFileSync(fridgeRegistryAbs, "utf8")) as {
      closeout_complete?: boolean;
      contract?: string;
    };
    if (
      registry.closeout_complete === true ||
      registry.contract === "fridge_buyer_path_batch_closed_run_registry_v1"
    ) {
      assert.equal(lane.fridge_run_registry_status, "PROVEN_CLOSED");
    } else {
      assert.equal(lane.fridge_run_registry_status, "PROVEN_PLANNING_RUN_REGISTRY");
      assert.equal(lane.fridge_approval_status, "owner_approved_for_next_planning_only");
    }
  } else if (
    fs.existsSync(path.join(process.cwd(), "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json"))
  ) {
    assert.equal(lane.fridge_run_registry_status, "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING");
  }
  assert.doesNotMatch(report.next_best_action, /batch_run_registry_intake/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_batch-run-registry-intake",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.batch_run_registry_intake_v1");
});

test("command_center_v2.mission_factory_registry_v1 is read-only mission lifecycle registry lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.mission_factory_registry_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "mission_factory_registry_command_center_lane_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.mission_factory_registry_v1");
  assert.equal(lane.registry_rel_path, "data/mission-factory/mission-registry-v1.json");
  assert.ok(typeof lane.total_missions === "number");
  assert.ok(lane.missions_by_state);
  assert.ok(lane.missions_by_type);
  assert.ok(lane.missions_by_wedge);
  assert.ok(lane.queue_generator_v1);
  assert.equal(lane.queue_generator_v1.queue_depth_target_min, 15);
});

test("command_center_v2.mission_factory_orchestrator_v1 is read-only orchestrator lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.mission_factory_orchestrator_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "mission_factory_orchestrator_command_center_lane_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_authorized, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.mission_factory_orchestrator_v1");
  assert.equal(lane.current_parallel_limit, 1);
  assert.ok(typeof lane.active_dispatch_count === "number");
  assert.ok(typeof lane.available_dispatch_slots === "number");
  assert.ok(lane.missions_by_lane);
  assert.equal(typeof lane.missions_by_lane.queued, "number");
  assert.equal(typeof lane.missions_by_lane.dispatch_ready, "number");
  assert.equal(typeof lane.missions_by_lane.dispatched, "number");
  assert.equal(typeof lane.missions_by_lane.ingest_received, "number");
  assert.equal(typeof lane.missions_by_lane.blocked, "number");
  assert.equal(typeof lane.missions_by_lane.expired, "number");
});

test("command_center_v2 surfaces fridge guarded batch closeout learning lane read-only", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });

  const lane = report.command_center_v2.fridge_guarded_batch_closeout_learning_v1;
  assert.equal(lane.contract, "fridge_guarded_batch_closeout_learning_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.fridge_guarded_batch_closeout_learning_v1");
  assert.equal(lane.packet_count, 1);
  assert.equal(lane.latest_batch_digest, "0fec4a7b623a");
  assert.equal(lane.latest_post_apply_status, "APPLIED_PARITY_PROVEN");
  assert.equal(lane.latest_lifecycle_state, "parity_verified");
  assert.equal(lane.latest_repeat_write_lockout_status, "PROVEN");
  assert.equal(lane.latest_learning_lane_candidate, true);
  assert.equal(lane.latest_recommended_next_lifecycle_state, "closed");
  assert.ok(lane.captured_lessons.some((lesson) => lesson.includes("first-hop redirect only")));
  assert.equal(lane.candidate_count, 3);
  assert.equal(lane.latest_candidate_lesson, "Repeat guarded CSV writes must be blocked after post-apply parity is proven.");
  assert.ok(
    lane.candidate_learning_items.some((candidate) =>
      candidate.learning_type === "validation_methodology" &&
      candidate.lesson_text.includes("first-hop redirect only"),
    ),
  );
  assert.ok(lane.candidate_learning_items.every((candidate) => candidate.owner_approval_required === true));
  assert.ok(lane.candidate_learning_items.every((candidate) => candidate.write_authorized === false));
  assert.match(lane.next_agent_action, /do not create learning_outcomes rows/i);
  assert.doesNotMatch(JSON.stringify(lane), /insert into/i);
});

test("command_center_v2 surfaces fridge guarded batch lifecycle rule proposal lane read-only", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });

  const lane = report.command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1;
  assert.equal(lane.contract, "fridge_guarded_batch_lifecycle_rule_proposal_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.fridge_guarded_batch_lifecycle_rule_proposal_v1");
  assert.equal(lane.source_candidate_count, 3);
  assert.equal(lane.proposed_rule_count, 3);
  assert.deepEqual(
    lane.proposed_rules.map((rule) => rule.rule_id),
    [
      "go_first_hop_redirect_smoke_only",
      "applied_parity_proven_is_closeout_state",
      "block_repeat_guarded_csv_write_after_parity",
    ],
  );
  assert.ok(lane.proposed_rules.every((rule) => rule.active === false));
  assert.ok(lane.proposed_rules.every((rule) => rule.write_authorized === false));
  assert.ok(lane.proposed_rules.every((rule) => rule.owner_approval_required === true));
  assert.doesNotMatch(JSON.stringify(lane), /active\":true|write_authorized\":true/i);
});

test("command_center_v2 surfaces fridge guarded batch lifecycle rule promotion plan lane read-only", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });

  const lane = report.command_center_v2.fridge_guarded_batch_lifecycle_rule_promotion_plan_v1;
  assert.equal(lane.contract, "fridge_guarded_batch_lifecycle_rule_promotion_plan_command_center_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.fridge_guarded_batch_lifecycle_rule_promotion_plan_v1");
  assert.equal(lane.source_proposed_rule_count, 3);
  assert.equal(lane.promotion_candidate_count, 3);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.promotion_authorized, false);
  assert.equal(lane.active_rule_write_authorized, false);
  assert.deepEqual(
    lane.promotion_candidates.map((candidate) => candidate.rule_id),
    [
      "go_first_hop_redirect_smoke_only",
      "applied_parity_proven_is_closeout_state",
      "block_repeat_guarded_csv_write_after_parity",
    ],
  );
  assert.ok(lane.promotion_candidates.every((candidate) => candidate.proposed_active_state === true));
  assert.ok(lane.promotion_candidates.every((candidate) => candidate.active === false));
  assert.ok(lane.promotion_candidates.every((candidate) => candidate.write_authorized === false));
  assert.ok(lane.promotion_candidates.every((candidate) => candidate.promotion_authorized === false));
  assert.ok(lane.blockers.includes("missing_owner_rule_promotion_approval"));
  assert.ok(lane.blockers.includes("active_rule_registry_not_created"));
  assert.ok(lane.blockers.includes("enforcement_not_wired"));
  assert.doesNotMatch(JSON.stringify(lane), /active\":true|write_authorized\":true|promotion_authorized\":true/i);
});

test("command_center_v2.fridge_buyer_path_batch_approval_v1 is read-only approval bridge lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_batch_approval_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_batch_approval_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_batch_approval_v1",
  );
  assert.equal(lane.proposed_row_count, 14);
  const fridgeApprovalArtifact = path.join(
    process.cwd(),
    "data/owner-decisions/fridge-buyer-path-batch-approval-v1.json",
  );
  assert.equal(
    lane.approval_status,
    fs.existsSync(fridgeApprovalArtifact)
      ? "owner_approved_for_next_planning_only"
      : "awaiting_owner_approval",
  );
  assert.equal(lane.apply_mutation_authorized, false);
  assert.doesNotMatch(report.next_best_action, /fridge_buyer_path_batch_approval/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-batch-approval",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_batch_approval_v1",
  );
});

test("command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1 is read-only apply-plan approval lane", async () => {
  const applyPlanAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
  );
  if (!fs.existsSync(applyPlanAbs)) {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_batch_apply_plan_approval_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1",
  );
  assert.equal(lane.planned_change_count, 14);
  assert.equal(lane.plan_status, "READY_FOR_OWNER_REVIEW");
  assert.equal(lane.owner_review_status, "OWNER_REVIEW_READY");
  assert.ok(
    lane.approval_status === "awaiting_owner_approval" ||
      lane.approval_status === "owner_approved_for_next_planning_only",
  );
  assert.equal(lane.apply_mutation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  if (lane.approval_status === "awaiting_owner_approval") {
    assert.match(report.next_best_action, /requires owner approval/i);
    assert.equal(
      report.execution_guidance.next_move_command,
      "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
    );
  } else if (lane.approval_status === "owner_approved_for_next_planning_only") {
    if (refrigeratorModelFirstSteeringActive(report)) {
      return;
    }
    const lifecycleFridge =
      report.command_center_v2.universal_batch_lifecycle_truth_table_v1.current_wedge_states.find(
        (row) => row.wedge === "refrigerator_water",
      );
    if (
      lifecycleFridge?.lifecycle_state === "apply_plan_owner_approved" &&
      lifecycleFridge.alternate_lifecycle_states.includes("apply_readiness_unknown")
    ) {
      assert.ok(report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_UNKNOWN]:"));
      assert.match(report.next_best_action, /apply readiness is not proven/i);
      assert.equal(
        report.execution_guidance.next_move_command,
        "npm run buckparts:universal-batch-lifecycle-apply-readiness",
      );
      assert.doesNotMatch(report.execution_guidance.next_move_command, /UNKNOWN:/);
      assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
      assert.equal(report.execution_guidance.mutating_blocked, true);
    }
  }

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-batch-apply-plan-approval",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1",
  );
});

test("command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1 is read-only apply-plan proposal lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_batch_apply_plan_proposal_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1",
  );
  assert.equal(lane.apply_mutation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  const registryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (fs.existsSync(registryAbs)) {
    assert.equal(lane.proposed_batch_id, "fridge-buyer-path-batch-proposal-v1-0fec4a7b623a");
    assert.ok(lane.plan_status === "READY_FOR_OWNER_REVIEW" || lane.plan_status === "BLOCKED");
    if (lane.plan_status === "READY_FOR_OWNER_REVIEW") {
      assert.equal(lane.planned_change_count, 14);
      assert.equal(lane.missing_affiliate_tag_count, 0);
      assert.equal(lane.duplicate_destination_group_count, 2);
      assert.equal(
        lane.duplicate_destination_group_review_status,
        "ACCEPTABLE_SHARED_DESTINATION_PROVEN",
      );
      assert.equal(lane.owner_review_status, "OWNER_REVIEW_READY");
    }
  }
  assert.doesNotMatch(report.next_best_action, /fridge_buyer_path_batch_apply_plan_proposal/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-batch-apply-plan-proposal",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1",
  );
});

test("command_center_v2.fridge_buyer_path_batch_proposal_v1 is read-only batch proposal lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_batch_proposal_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_batch_proposal_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_batch_proposal_v1",
  );
  assert.equal(lane.proposed_row_count, 14);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.formal_batch_exists, false);
  assert.equal(lane.proposed_slugs[0], "4396710");
  assert.equal(lane.apply_mutation_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.retailer_links_mutation_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.buy_link_mutation_authorized, false);
  assert.doesNotMatch(report.next_best_action, /fridge_buyer_path_batch_proposal/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-batch-proposal",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_batch_proposal_v1",
  );
});

test("command_center_v2.fridge_buyer_path_owner_review_packet_v1 is read-only owner review packet lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const lane = report.command_center_v2.fridge_buyer_path_owner_review_packet_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "fridge_buyer_path_owner_review_packet_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.fridge_buyer_path_owner_review_packet_v1",
  );
  assert.equal(lane.cohort_count, 14);
  assert.equal(lane.row_review_ready_count, 14);
  assert.equal(lane.mutation_ready_count, 0);
  assert.equal(lane.formal_batch_exists, false);
  assert.equal(lane.top_cohort_slugs[0], "4396710");
  assert.equal(lane.apply_mutation_authorized, false);
  assert.doesNotMatch(report.next_best_action, /fridge_buyer_path_owner_review_packet/i);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "buckparts_fridge-buyer-path-owner-review-packet",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(
    manifestEntry!.cc_json_path,
    "command_center_v2.fridge_buyer_path_owner_review_packet_v1",
  );
});

test("command_center_v2.batch_production_operating_checklist_v1 is read-only batch director", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json") || p.includes("batch-production"),
    readDir: () => [],
    readTextFile: (p) => {
      if (p.endsWith("package.json")) return fs.readFileSync(p, "utf8");
      if (p.includes("ap-batch-v2-proven-run")) {
        return fs.readFileSync(
          path.join(process.cwd(), "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json"),
          "utf8",
        );
      }
      if (p.includes("ap-apply-plan-batch-v2.json")) {
        return fs.readFileSync(
          path.join(
            process.cwd(),
            "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
          ),
          "utf8",
        );
      }
      if (p.includes("ap-apply-run-batch-v2.json")) {
        return fs.readFileSync(
          path.join(
            process.cwd(),
            "data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-batch-v2.json",
          ),
          "utf8",
        );
      }
      if (p.includes("retailer_links.csv")) {
        return fs.readFileSync(path.join(process.cwd(), "data/air-purifier/retailer_links.csv"), "utf8");
      }
      return BASE_TRACKER;
    },
  });
  const lane = report.command_center_v2.batch_production_operating_checklist_v1;
  assert.equal(lane.contract, "batch_production_operating_checklist_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.may_mutate, false);
  assert.ok(lane.runs.length >= 1);
  assert.equal(lane.setback_detectors_catalog.length, 5);
  assert.ok(lane.stages.length >= 11);
  assert.ok(Array.isArray(lane.setbacks.fired));
  assert.ok(lane.setbacks.fired.length >= 1);
  assert.ok(lane.operating_decision);
  assert.ok(lane.expansion_readiness);
  assert.ok(report.command_center_v2.batch_production_operating_dispatch_v1);
  assert.equal(report.command_center_v2.batch_production_operating_dispatch_v1.contract, "batch_production_operating_dispatch_v1");
  assert.equal(
    report.command_center_v2.batch_production_operating_dispatch_v1.current_stage_id,
    lane.operating_decision.current_stage,
  );
  assert.equal(lane.operating_decision.mutation_allowed, false);
});

test("command center next_best_action prefers apply-plan approval over apply-plan proposal when approval is awaiting_owner_approval", async () => {
  const applyPlanAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
  );
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (!fs.existsSync(applyPlanAbs) || !fs.existsSync(fridgeRegistryAbs)) {
    return;
  }
  try {
    const registry = JSON.parse(fs.readFileSync(fridgeRegistryAbs, "utf8")) as {
      closeout_complete?: boolean;
      contract?: string;
    };
    if (
      registry.closeout_complete === true ||
      registry.contract === "fridge_buyer_path_batch_closed_run_registry_v1"
    ) {
      return;
    }
  } catch {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const approvalLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1;
  const planLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1;
  if (approvalLane.approval_status !== "awaiting_owner_approval") {
    return;
  }
  assert.equal(planLane.plan_status, "READY_FOR_OWNER_REVIEW");
  assert.equal(planLane.owner_review_status, "OWNER_REVIEW_READY");
  assert.equal(planLane.planned_change_count, 14);
  assert.equal(approvalLane.apply_mutation_authorized, false);

  if (refrigeratorModelFirstSteeringActive(report)) {
    return;
  }

  assert.ok(report.next_best_action.startsWith("BATCH APPLY-PLAN [OWNER_APPROVAL_REQUIRED]:"));
  assert.match(report.next_best_action, /requires owner approval/i);
  assert.match(report.next_best_action, /14 planned changes/i);
  assert.match(report.next_best_action, /does not authorize applying planned_changes/i);
  assert.match(report.next_best_action, /mutation unauthorized/i);
  assert.equal(
    report.execution_guidance.next_move_command,
    "npm run buckparts:fridge-buyer-path-batch-apply-plan-approval",
  );
  assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.ok(
    report.execution_guidance.mutating_block_reasons.some((reason) =>
      reason.includes("fridge_buyer_path_batch_apply_plan_approval_v1:apply_mutation_authorized=false"),
    ),
  );
});

test("command center next_best_action prefers approved apply-plan planning over proposal when approval is owner_approved_for_next_planning_only", async () => {
  const applyPlanAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
  );
  const applyPlanApprovalAbs = path.join(
    process.cwd(),
    "data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json",
  );
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (!fs.existsSync(applyPlanAbs) || !fs.existsSync(fridgeRegistryAbs)) {
    return;
  }
  try {
    const registry = JSON.parse(fs.readFileSync(fridgeRegistryAbs, "utf8")) as {
      closeout_complete?: boolean;
      contract?: string;
    };
    if (
      registry.closeout_complete === true ||
      registry.contract === "fridge_buyer_path_batch_closed_run_registry_v1"
    ) {
      return;
    }
  } catch {
    return;
  }
  if (!fs.existsSync(applyPlanApprovalAbs)) {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const approvalLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1;
  if (approvalLane.approval_status !== "owner_approved_for_next_planning_only") {
    return;
  }
  const planLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1;
  assert.equal(planLane.plan_status, "READY_FOR_OWNER_REVIEW");
  assert.equal(planLane.owner_review_status, "OWNER_REVIEW_READY");
  assert.equal(approvalLane.apply_mutation_authorized, false);

  if (refrigeratorModelFirstSteeringActive(report)) {
    return;
  }

  const applyReadiness = report.command_center_v2.universal_batch_lifecycle_apply_readiness_v1;
  const mutationAuthReview =
    report.command_center_v2.universal_batch_lifecycle_mutation_authorization_review_v1;
  if (applyReadiness.apply_readiness_status === "PROVEN") {
    assert.ok(
      report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_READY]:") ||
        report.next_best_action.startsWith("LIFECYCLE [MUTATION_AUTHORIZED_FOR_GUARDED_APPLY]:") ||
        report.next_best_action.startsWith("LIFECYCLE [APPLIED_PARITY_PROVEN]:"),
    );
    assert.match(report.next_best_action, /owner-approved planning for 14 apply-plan changes|apply-readiness is PROVEN|after_row parity proven/i);
    assert.doesNotMatch(report.next_best_action, /BATCH APPLY-PLAN \[APPROVED_FOR_PLANNING\]/);
    assert.equal(
      report.execution_guidance.next_move_command,
      mutationAuthReview.mutation_authorization_review_status === "BLOCKED"
        ? "npm run buckparts:universal-batch-lifecycle-mutation-authorization-review"
        : mutationAuthReview.mutation_authorization_review_status === "APPLIED_PARITY_PROVEN"
          ? "node --import tsx scripts/report-buckparts-command-center.ts"
        : mutationAuthReview.mutation_authorization_review_status ===
              "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
            mutationAuthReview.csv_apply_authorized === true
          ? "npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor"
          : report.command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1
                .execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW"
            ? "npm run buckparts:universal-batch-lifecycle-apply-execution-plan"
            : "npm run buckparts:universal-batch-lifecycle-apply-readiness",
    );
    if (
      mutationAuthReview.mutation_authorization_review_status ===
        "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
      mutationAuthReview.csv_apply_authorized === true
    ) {
      assert.doesNotMatch(report.next_best_action, /owner mutation approval still required/i);
    }
  } else {
    assert.ok(report.next_best_action.startsWith("LIFECYCLE [APPLY_READINESS_UNKNOWN]:"));
    assert.match(report.next_best_action, /owner-approved planning for 14 apply-plan changes/i);
    assert.match(report.next_best_action, /apply readiness is not proven/i);
    assert.doesNotMatch(report.next_best_action, /OWNER_REVIEW_READY/i);
    assert.doesNotMatch(report.next_best_action, /OWNER_APPROVAL_REQUIRED/i);
    assert.doesNotMatch(report.next_best_action, /BATCH APPLY-PLAN \[APPROVED_FOR_PLANNING\]/);
    assert.equal(
      report.execution_guidance.next_move_command,
      "npm run buckparts:universal-batch-lifecycle-apply-readiness",
    );
  }
  assert.doesNotMatch(report.execution_guidance.next_move_command, /UNKNOWN:/);
  assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.ok(
    report.execution_guidance.mutating_block_reasons.some((reason) =>
      reason.includes("universal_batch_lifecycle_truth_table_v1:mutation_authorized=false"),
    ),
  );
  if (applyReadiness.apply_readiness_status === "PROVEN") {
    assert.doesNotMatch(
      report.execution_guidance.mutating_block_reasons.join("\n"),
      /fridge_buyer_path_batch_apply_plan/,
    );
    if (mutationAuthReview.mutation_authorization_review_status === "APPLIED_PARITY_PROVEN") {
      assert.match(report.next_best_action, /APPLIED_PARITY_PROVEN/);
      assert.equal(mutationAuthReview.apply_executor_ready, false);
    } else if (mutationAuthReview.mutation_authorization_review_status === "BLOCKED") {
      assert.ok(
        report.execution_guidance.mutating_block_reasons.some((reason) =>
          reason.startsWith("mutation_authorization_review_v1:missing_active_owner_mutation_approval:"),
        ),
      );
      assert.equal(mutationAuthReview.apply_executor_ready, true);
      assert.ok(
        !report.execution_guidance.mutating_block_reasons.includes(
          "mutation_authorization_review_v1:apply_executor_ready=false",
        ),
      );
    }
  }
});

test("command center next_best_action prefers apply-plan proposal when approval lane is absent or not steering-relevant", async () => {
  const applyPlanAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json",
  );
  const applyPlanApprovalAbs = path.join(
    process.cwd(),
    "data/owner-decisions/fridge-buyer-path-batch-apply-plan-approval-v1.json",
  );
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (!fs.existsSync(applyPlanAbs) || !fs.existsSync(fridgeRegistryAbs)) {
    return;
  }
  if (!fs.existsSync(applyPlanApprovalAbs)) {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const approvalLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1;
  if (
    approvalLane.approval_status === "awaiting_owner_approval" ||
    approvalLane.approval_status === "owner_approved_for_next_planning_only"
  ) {
    return;
  }
  const planLane = report.command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1;
  if (planLane.plan_status !== "READY_FOR_OWNER_REVIEW") {
    return;
  }

  if (refrigeratorModelFirstSteeringActive(report)) {
    return;
  }

  assert.ok(report.next_best_action.startsWith("BATCH APPLY-PLAN [OWNER_REVIEW_READY]:"));
  assert.equal(
    report.execution_guidance.next_move_command,
    "npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal",
  );
  assert.equal(report.execution_guidance.mutating_blocked, true);
});

test("command center next_best_action prefers demand-selected batch when refrigerator_water lifecycle is closed", async () => {
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (!fs.existsSync(fridgeRegistryAbs)) {
    return;
  }
  let registry: { closeout_complete?: boolean; contract?: string };
  try {
    registry = JSON.parse(fs.readFileSync(fridgeRegistryAbs, "utf8")) as typeof registry;
  } catch {
    return;
  }
  if (
    registry.closeout_complete !== true &&
    registry.contract !== "fridge_buyer_path_batch_closed_run_registry_v1"
  ) {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
  });
  const intake = report.command_center_v2.batch_run_registry_intake_v1;
  const lifecycle = report.command_center_v2.universal_batch_lifecycle_truth_table_v1;
  const demand = report.command_center_v2.demand_to_coverage_next_lane_v1;
  const fridgeLifecycle = lifecycle.current_wedge_states.find(
    (row) => row.wedge === "refrigerator_water",
  );

  assert.equal(intake.fridge_run_registry_status, "PROVEN_CLOSED");
  assert.equal(fridgeLifecycle?.lifecycle_state, "closed");
  assert.equal(demand.runtime_status, "PROVEN");
  assert.equal(demand.recommendation_status, "START_NEW_DEMAND_SELECTED_BATCH");
  assert.equal(demand.recommended_wedge, "air_purifier");
  assert.equal(intake.mutation_authorized, false);
  assert.equal(report.execution_guidance.mutating_blocked, true);

  if (refrigeratorModelFirstSteeringActive(report)) {
    return;
  }
  if (issueRegistryTier0SteeringActive(report)) {
    assert.match(report.next_best_action, /BP-000001/);
    return;
  }
  if (issueReauditSteeringActive(report)) {
    assert.match(report.next_best_action, /BP-000001/);
    assert.match(report.why_this_action, /re-audit|RE_AUDIT/i);
    return;
  }

  assert.ok(
    report.next_best_action.startsWith("DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]:"),
  );
  assert.match(report.next_best_action, /refrigerator_water batch lifecycle is closed/i);
  assert.match(report.next_best_action, /air_purifier/i);
  assert.match(report.next_best_action, /mutation unauthorized/i);
  assert.doesNotMatch(report.next_best_action, /BATCH APPLY-PLAN \[APPROVED_FOR_PLANNING\]/);
  assert.doesNotMatch(report.next_best_action, /BATCH RUN-REGISTRY \[ACTIVE_PLANNING\]:.*refrigerator_water/i);
  assert.equal(
    report.execution_guidance.next_move_command,
    "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
  );
  assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
  assert.equal(
    report.command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1.apply_mutation_authorized,
    false,
  );
  assert.equal(
    report.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1.batch_start_authorized,
    false,
  );
  assert.equal(
    report.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1.csv_apply_authorized,
    false,
  );
});

test("command center next_best_action defers to batch dispatch when not UNKNOWN", async () => {
  const fridgeRegistryAbs = path.join(
    process.cwd(),
    "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
  );
  if (fs.existsSync(fridgeRegistryAbs)) {
    return;
  }

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) =>
      p.endsWith("package.json") || p.includes("air-purifier/batch-production"),
    readDir: () => [],
    readTextFile: (p) => {
      if (p.endsWith("package.json")) return fs.readFileSync(p, "utf8");
      if (p.includes("ap-batch-v2-proven-run")) {
        return fs.readFileSync(
          path.join(process.cwd(), "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json"),
          "utf8",
        );
      }
      if (p.includes("ap-apply-plan-batch-v2.json")) {
        return fs.readFileSync(
          path.join(
            process.cwd(),
            "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json",
          ),
          "utf8",
        );
      }
      if (p.includes("ap-apply-run-batch-v2.json")) {
        return fs.readFileSync(
          path.join(
            process.cwd(),
            "data/air-purifier/batch-production/apply-runs-batch-v2/ap-apply-run-batch-v2.json",
          ),
          "utf8",
        );
      }
      if (p.includes("retailer_links.csv")) {
        return fs.readFileSync(path.join(process.cwd(), "data/air-purifier/retailer_links.csv"), "utf8");
      }
      return BASE_TRACKER;
    },
  });
  const checklist = report.command_center_v2.batch_production_operating_checklist_v1;
  const dispatch = report.command_center_v2.batch_production_operating_dispatch_v1;
  assert.notEqual(dispatch.dispatch_status, "UNKNOWN");
  if (refrigeratorModelFirstSteeringActive(report)) {
    assert.ok(report.execution_guidance.next_move_command.includes("report-refrigerator-model-first-batch-resolver-v1"));
    return;
  }
  assert.ok(report.next_best_action.startsWith("BATCH DISPATCH ["));
  assert.equal(report.next_best_action, `BATCH DISPATCH [${dispatch.dispatch_status}]: ${dispatch.why_this_is_next}`);
  assert.equal(report.execution_guidance.next_move_command, dispatch.exact_command);
  assert.equal(report.command_center_v2.execution_guidance.next_move_command, dispatch.exact_command);
  assert.equal(report.execution_guidance.mutating_blocked, true);
  assert.equal(dispatch.current_stage_id, checklist.operating_decision.current_stage);
  assert.equal(dispatch.selected_subsystem, "supabase_parity_apply_proof");
  assert.equal(dispatch.expansion_blocked, true);
});

test("owner dashboard renders batch checklist operating decision marker", () => {
  const dashAbs = path.join(
    process.cwd(),
    "src/app/ownerdashboard/[secret]/page.tsx",
  );
  const src = fs.readFileSync(dashAbs, "utf8");
  assert.ok(src.includes('data-testid="batch-production-operating-checklist"'));
  assert.ok(src.includes('data-testid="batch-production-operating-decision"'));
  assert.ok(src.includes('data-testid="batch-production-stage-list"'));
  assert.ok(src.includes('data-testid="batch-production-setbacks"'));
  assert.ok(src.includes('data-testid="batch-production-expansion-readiness"'));
  assert.ok(src.includes("BatchProductionOperatingChecklistSection"));
  assert.ok(src.includes("expansion_readiness"));
  assert.ok(src.includes('data-testid="batch-production-operating-dispatch"'));
  assert.ok(src.includes("Command Center selected next action"));
  assert.ok(src.includes("dispatch={v2.batch_production_operating_dispatch_v1}"));
});

test("command_center_v2.owner_vertical_launch_policy_v1 is read-only CC-owned launch policy lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.owner_vertical_launch_policy_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "owner_vertical_launch_policy_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.ok(lane.rows.some((r) => r.vertical_slug === "refrigerator"));

  const manifestEntry = findBrainManifestEntry(report, (r) => r.system_id === "owner_vertical_launch_policy");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.dashboard_only, false);
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.owner_vertical_launch_policy_v1");

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_vertical_launch_policy"));
});

test("command_center_v2.owner_quarantined_fridge_models_v1 is read-only CC-owned quarantine lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.owner_quarantined_fridge_models_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "owner_quarantined_fridge_models_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.ok(Array.isArray(lane.models));

  const quarantineManifest = findBrainManifestEntry(
    report,
    (r) => r.system_id === "owner_quarantined_fridge_models",
  );
  assert.ok(quarantineManifest);
  assert.equal(quarantineManifest!.verdict, "CONNECTED");
  assert.equal(quarantineManifest!.dashboard_only, false);
  assert.equal(quarantineManifest!.cc_json_path, "command_center_v2.owner_quarantined_fridge_models_v1");

  const gate = report.command_center_v2.brain_integrity_gate_v1;
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_quarantined_fridge_models"));
});

test("command_center_v2.command_center_issue_reaudit_v1 surfaces deployed re-audit candidates", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: fs.existsSync,
    readDir: (p) => (fs.existsSync(p) ? fs.readdirSync(p) : []),
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const reaudit = report.command_center_v2.command_center_issue_reaudit_v1;
  assert.ok(reaudit);
  assert.equal(reaudit.contract, "command_center_issue_reaudit_v1");
  assert.equal(reaudit.read_only, true);
  assert.equal(reaudit.data_mutation, false);
  assert.equal(reaudit.recommended_jq_path, ".command_center_v2.command_center_issue_reaudit_v1");
  assert.equal(reaudit.total_deployed_awaiting_reaudit, 4);
  assert.equal(reaudit.top_reaudit_candidate?.issue_id, "BP-000001");
  assert.ok(reaudit.top_reaudit_candidate?.suggested_hyperagent_prompt.includes("BP-000001"));

  const registry = report.command_center_v2.command_center_issue_registry_v1;
  assert.equal(registry.steering_override_active, false);
  assert.match(report.next_best_action, /ISSUE RE-AUDIT: BP-000001/);
  assert.match(report.why_this_action, /re-audit|RE_AUDIT/i);
  assert.equal(
    report.command_center_v2.customer_steering_comparison_v1?.factory_steering.steering_override_source,
    "issue_registry_reaudit",
  );
});

test("command_center_v2.command_center_issue_registry_v1 is read-only and does not steer DEPLOYED TIER_0 repair NBA", async () => {
  const rootDir = path.resolve(__dirname, "..");
  const report = await buildBuckpartsCommandCenterReport({
    rootDir,
    providers: baseProviders(),
    fileExists: fs.existsSync,
    readDir: (p) => (fs.existsSync(p) ? fs.readdirSync(p) : []),
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.command_center_issue_registry_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "command_center_issue_registry_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.command_center_issue_registry_v1");
  assert.equal(lane.total_open, 4);
  assert.equal(lane.total_closed, 0);
  assert.equal(lane.lifecycle_distribution.aligned_count, 4);
  assert.equal(lane.lifecycle_distribution.evidence_proven_max_by_status.DEPLOYED, 4);
  assert.equal(lane.steering_override_active, false);
  assert.equal(lane.highest_priority_steering_eligible_issue, null);
  assert.equal(lane.highest_priority_issue?.issue_id, "BP-000001");
  assert.ok(lane.issues_preview.length >= 1);
  assert.equal(/ISSUE REGISTRY TIER_0:/.test(report.next_best_action), false);

  const manifestEntry = findBrainManifestEntry(
    report,
    (r) => r.system_id === "command_center_issue_registry",
  );
  assert.ok(manifestEntry);
  assert.equal(manifestEntry!.verdict, "CONNECTED");
  assert.equal(manifestEntry!.cc_json_path, "command_center_v2.command_center_issue_registry_v1");
});

test("command_center_v2.owner_integrity_sentinel_v1 is read-only CC-owned truth gate", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.owner_integrity_sentinel_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "owner_integrity_sentinel_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.ok(lane.providers.length >= 1);
  assert.ok(["PASS", "WARN", "FAIL", "UNKNOWN"].includes(lane.overall_status));
});

test("command_center_v2.brain_integrity_gate_v1 governs lane work from brain coverage manifest", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const gate = report.command_center_v2.brain_integrity_gate_v1;
  const manifest = report.command_center_v2.command_center_brain_coverage_manifest_v1;
  assert.ok(gate);
  assert.equal(gate.contract, "brain_integrity_gate_v1");
  assert.equal(gate.read_only, true);
  assert.equal(gate.data_mutation, false);
  assert.equal(gate.total_entries, manifest.entries.length);
  assert.deepEqual(gate.verdict_counts, manifest.verdict_counts);
  assert.deepEqual(gate.brain_manifest_counts, manifest.verdict_counts);
  assert.ok(
    gate.brain_status === "PROCEED_WITH_KNOWN_LIMITS" || gate.brain_status === "STOP_THE_LINE",
  );

  const mutate = manifest.entries.find((e) => e.npm_script_or_path.includes(":mutate"));
  assert.ok(mutate);
  assert.ok(!gate.stop_the_line_entries.some((e) => e.system_id === mutate!.system_id));

  assert.ok(gate.missing_entries.some((e) => e.system_id === "github_actions_live_status"));
  assert.ok(gate.missing_entries.some((e) => e.system_id === "sentry_error_monitoring"));
  assert.ok(!gate.partial_entries.some((e) => e.system_id === "owner_integrity_sentinel"));

  if (gate.brain_status === "STOP_THE_LINE") {
    assert.equal(report.next_best_action, gate.next_brain_action);
  } else if (gate.brain_status === "PROCEED_WITH_KNOWN_LIMITS") {
    assert.ok(gate.proven_facts.some((f) => f.startsWith("BRAIN_CAVEAT:")));
    const checklist = report.command_center_v2.batch_production_operating_checklist_v1;
    if (checklist.runtime_status === "OK") {
      assert.ok(report.why_this_action.includes("BRAIN_CAVEAT:"));
    } else {
      assert.ok(report.next_best_action.startsWith("BATCH CHECKLIST ["));
    }
  }
});

test("command_center_v2.external_measurement_freshness_v1 is read-only CC truth", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  const lane = report.command_center_v2.external_measurement_freshness_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "external_measurement_freshness_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.deepEqual(lane.recommended_commands, [
    "npm run buckparts:gsc:fetch",
    "npm run buckparts:ga4:fetch",
  ]);
  assert.ok(lane.proven_facts.some((f) => f.includes("does not fetch GSC/GA4")));
  assert.ok(["OK", "STALE", "UNKNOWN"].includes(lane.overall_status));
  assert.ok(["OK", "PARTIAL", "UNKNOWN"].includes(lane.runtime_status));
});

test("external_measurement_freshness_v1 reports UNKNOWN when GSC and GA4 artifacts are missing", async () => {
  const lane = await buildExternalMeasurementFreshnessV1({
    rootDir: process.cwd(),
    deps: {
      now: () => new Date("2026-05-16T12:00:00.000Z"),
      loadGa4: async () => ({ artifact: null, issue: null }),
      buildGsc: async () => ({
        neuron_key: "gsc_external_demand",
        connection_level: "DARK",
        source_class: "UNKNOWN",
        artifact_source: "NONE",
        fetched_at: "UNKNOWN",
        status: "UNKNOWN",
        freshness_method: "test",
        export_file_used: "UNKNOWN",
        export_date: "UNKNOWN",
        total_impressions: "UNKNOWN",
        total_clicks: "UNKNOWN",
        average_ctr: "UNKNOWN",
        average_position: "UNKNOWN",
        top_queries_by_impressions: "UNKNOWN",
        top_queries_by_clicks: "UNKNOWN",
        top_pages_by_impressions: "UNKNOWN",
        top_pages_by_clicks: "UNKNOWN",
        high_impression_low_click_opportunities: "UNKNOWN",
        proven_facts: [],
        unknown_facts: [],
        next_owner_action: "test",
      }),
    },
  });
  assert.equal(lane.overall_status, "UNKNOWN");
  assert.equal(lane.runtime_status, "UNKNOWN");
  assert.equal(lane.gsc.artifact_recency_status, "UNKNOWN");
  assert.equal(lane.gsc.measurement_usability_status, "UNKNOWN");
  assert.equal(lane.ga4.artifact_recency_status, "UNKNOWN");
  assert.equal(lane.ga4.measurement_usability_status, "UNKNOWN");
  assert.notEqual(lane.overall_status, "OK");
});

test("external_measurement_freshness_v1 does not treat GSC UNKNOWN_API_ERROR with recent fetched_at as usable OK", async () => {
  const lane = await buildExternalMeasurementFreshnessV1({
    rootDir: process.cwd(),
    deps: {
      now: () => new Date("2026-05-16T12:00:00.000Z"),
      loadGa4: async () => ({ artifact: null, issue: null }),
      buildGsc: async () => ({
        neuron_key: "gsc_external_demand",
        connection_level: "DARK",
        source_class: "ARTIFACT",
        artifact_source: "SUPABASE",
        fetched_at: "2026-05-15T12:00:00.000Z",
        status: "UNKNOWN_API_ERROR",
        freshness_method: "test",
        export_file_used: "supabase.owner_report_artifacts[gsc_search_analytics]",
        export_date: "UNKNOWN",
        total_impressions: "UNKNOWN",
        total_clicks: "UNKNOWN",
        average_ctr: "UNKNOWN",
        average_position: "UNKNOWN",
        top_queries_by_impressions: "UNKNOWN",
        top_queries_by_clicks: "UNKNOWN",
        top_pages_by_impressions: "UNKNOWN",
        top_pages_by_clicks: "UNKNOWN",
        high_impression_low_click_opportunities: "UNKNOWN",
        proven_facts: [],
        unknown_facts: [],
        next_owner_action: "test",
      }),
    },
  });
  assert.equal(lane.gsc.artifact_recency_status, "OK");
  assert.equal(lane.gsc.measurement_usability_status, "UNKNOWN");
  assert.equal(lane.overall_status, "UNKNOWN");
  assert.notEqual(lane.overall_status, "OK");
  assert.ok(
    lane.unknown_facts.some(
      (f) => f.includes("UNKNOWN_API_ERROR") && f.includes("not usable"),
    ),
  );
});

test("external_measurement_freshness_v1 does not treat GA4 UNKNOWN_API_ERROR with recent fetched_at as usable OK", async () => {
  const freshGa4: Ga4TrustFunnelArtifact = {
    status: "UNKNOWN_API_ERROR",
    fetched_at: "2026-05-15T12:00:00.000Z",
    property_id: "UNKNOWN",
    date_range: "UNKNOWN",
    event_totals: "UNKNOWN",
    rates: "UNKNOWN",
    dimension_breakdowns: {
      top_model_slugs: "UNKNOWN",
      top_filter_slugs: "UNKNOWN",
      quarantined_vs_normal: "UNKNOWN",
    },
    proven_facts: [],
    unknown_facts: [],
    provenance: {
      source: "google_analytics_data_api",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      writer: "test",
    },
  };
  const lane = await buildExternalMeasurementFreshnessV1({
    rootDir: process.cwd(),
    deps: {
      now: () => new Date("2026-05-16T12:00:00.000Z"),
      loadGa4: async () => ({
        artifact: { source: "SUPABASE", artifact: freshGa4 },
        issue: null,
      }),
      buildGsc: async () => ({
        neuron_key: "gsc_external_demand",
        connection_level: "DARK",
        source_class: "UNKNOWN",
        artifact_source: "NONE",
        fetched_at: "UNKNOWN",
        status: "UNKNOWN",
        freshness_method: "test",
        export_file_used: "UNKNOWN",
        export_date: "UNKNOWN",
        total_impressions: "UNKNOWN",
        total_clicks: "UNKNOWN",
        average_ctr: "UNKNOWN",
        average_position: "UNKNOWN",
        top_queries_by_impressions: "UNKNOWN",
        top_queries_by_clicks: "UNKNOWN",
        top_pages_by_impressions: "UNKNOWN",
        top_pages_by_clicks: "UNKNOWN",
        high_impression_low_click_opportunities: "UNKNOWN",
        proven_facts: [],
        unknown_facts: [],
        next_owner_action: "test",
      }),
    },
  });
  assert.equal(lane.ga4.artifact_recency_status, "OK");
  assert.equal(lane.ga4.measurement_usability_status, "UNKNOWN");
  assert.equal(lane.overall_status, "UNKNOWN");
  assert.notEqual(lane.overall_status, "OK");
  assert.ok(
    lane.unknown_facts.some(
      (f) => f.includes("UNKNOWN_API_ERROR") && f.includes("not usable"),
    ),
  );
});

test("external_measurement_freshness_v1 marks stale GA4 artifact timestamps as STALE", async () => {
  const staleGa4: Ga4TrustFunnelArtifact = {
    status: "OK",
    fetched_at: "2020-01-01T00:00:00.000Z",
    property_id: "UNKNOWN",
    date_range: "UNKNOWN",
    event_totals: "UNKNOWN",
    rates: "UNKNOWN",
    dimension_breakdowns: {
      top_model_slugs: "UNKNOWN",
      top_filter_slugs: "UNKNOWN",
      quarantined_vs_normal: "UNKNOWN",
    },
    proven_facts: [],
    unknown_facts: [],
    provenance: {
      source: "google_analytics_data_api",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      writer: "test",
    },
  };
  const lane = await buildExternalMeasurementFreshnessV1({
    rootDir: process.cwd(),
    deps: {
      now: () => new Date("2026-05-16T12:00:00.000Z"),
      loadGa4: async () => ({
        artifact: { source: "LOCAL_ARTIFACT", artifact: staleGa4 },
        issue: null,
      }),
      buildGsc: async () => ({
        neuron_key: "gsc_external_demand",
        connection_level: "CONNECTED",
        source_class: "ARTIFACT",
        artifact_source: "SUPABASE",
        fetched_at: "2026-05-15T12:00:00.000Z",
        status: "OK",
        freshness_method: "test",
        export_file_used: "supabase.owner_report_artifacts[gsc_search_analytics]",
        export_date: "2026-05-15",
        total_impressions: 1,
        total_clicks: 1,
        average_ctr: 1,
        average_position: 1,
        top_queries_by_impressions: [],
        top_queries_by_clicks: [],
        top_pages_by_impressions: [],
        top_pages_by_clicks: [],
        high_impression_low_click_opportunities: [],
        proven_facts: [],
        unknown_facts: [],
        next_owner_action: "test",
      }),
    },
  });
  assert.equal(lane.gsc.artifact_recency_status, "OK");
  assert.equal(lane.gsc.measurement_usability_status, "OK");
  assert.equal(lane.ga4.artifact_recency_status, "STALE");
  assert.equal(lane.ga4.measurement_usability_status, "OK");
  assert.equal(lane.ga4.freshness_status, "STALE");
  assert.equal(lane.overall_status, "STALE");
  assert.notEqual(lane.overall_status, "OK");
});

test("Command Center JSON includes owner_command_center_neurons from CC build (not dashboard-only)", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
  });
  assert.ok(report.owner_command_center_neurons);
  assert.equal(report.owner_command_center_neurons.data_mutation, false);
  const keys = report.owner_command_center_neurons.neurons.map((n) => n.neuron_key);
  assert.deepEqual([...keys].sort(), [...EXPECTED_OWNER_COMMAND_CENTER_NEURON_KEYS].sort());
  assert.equal(keys.length, EXPECTED_OWNER_COMMAND_CENTER_NEURON_KEYS.length);
});

test("page_state_distribution neuron reflects page_publishability_truth_summary_v1 when computable", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    rootDir: path.resolve(__dirname, ".."),
    providers: baseProviders(),
    fileExists: (p) =>
      p.endsWith("data/filters.csv") ||
      p.endsWith("data/compatibility_mappings.csv") ||
      fileExistsTokenControlsOnly(p),
    readDir: () => [],
    readTextFile: (p) => {
      if (p.endsWith("affiliate-application-tracker.json")) return BASE_TRACKER;
      if (p.endsWith("amazon-rescue-token-controls.json")) return MINIMAL_TOKEN_CONTROLS_JSON;
      return fs.readFileSync(p, "utf8");
    },
  });
  const lane = report.command_center_v2.page_publishability_truth_summary_v1;
  assert.ok(lane);
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  const ps = report.owner_command_center_neurons.neurons.find(
    (n) => n.neuron_key === "page_state_distribution",
  );
  assert.ok(ps);
  if (lane.computable_semantic_count > 0) {
    assert.equal(ps.status, "PROVEN");
    assert.ok(ps.proven_facts.some((f) => f.includes("page_publishability_truth_summary_v1")));
    assert.ok(
      !ps.unknown_facts.some(
        (f) => f.includes("Semantic PageState/PublishabilityState") && f.includes("is UNKNOWN in this neuron"),
      ),
    );
    if (lane.unknown_join_count > 0 && ps.proven_facts.some((f) => f.includes("Sitemap artifact inventory contract"))) {
      assert.equal(ps.connection_level, "DIM");
    }
    assert.ok(!Object.keys(lane.distribution_automation_allowed).includes("auto_fix_allowed"));
  }
});

test("command_center_v2.page_publishability_truth_summary_v1 v1.1 clears click and demand unknown reasons when joins supplied", async () => {
  const summary = buildPagePublishabilityTruthSummaryV1({
    generated_at: "2026-05-18T00:00:00.000Z",
    catalog_rows: [{ filter_slug: "mwf", oem_token: "MWF", brand_slug: "ge" }],
    evidence_inventory: {
      contract: "evidence_inventory_v1",
      proven_facts: [],
      unknown_facts: [],
      data_evidence: {
        directory_relative_path: "data/evidence",
        total_json_files: 0,
        filename_outcome_buckets: {
          live_outcome_by_filename_substring: 0,
          unknown_outcome_by_filename_substring: 0,
          fail_hold_outcome_by_filename_substring: 0,
          other_json_not_matching_filename_patterns: 0,
        },
        recent_filenames: [],
        recent_ordering: "lexicographic_by_filename",
        proven_facts: [],
        unknown_facts: [],
        body_mapping: {
          parsed_ok_count: 0,
          parse_error_count: 0,
          mapped_count: 0,
          unmapped_count: 0,
          by_scope: {},
          by_filter_slug: {},
          by_token: {},
        },
      },
      refrigerator_manual_evidence: {
        inventory_contract: "refrigerator_manual_evidence_files_v1",
        directory_relative_path: "data/manual-evidence/refrigerator",
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
      fridge_form_factor_evidence: {
        inventory_contract: "fridge_form_factor_evidence_files_v1",
        directory_relative_path: "data/fridge-form-factor-evidence",
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
    },
    filter_slug_to_model_slugs: new Map([["mwf", []]]),
    indexable_slugs: new Set(["mwf"]),
    cta_join_by_filter_slug: new Map([
      ["mwf", { safe_cta_link_count: 1, direct_buyable_link_count: 0, mapped_model_count: 0 }],
    ]),
    affiliate_approval_pending: false,
    commission_or_revenue: "NOT_CONNECTED",
    human_likely_clicks_by_filter_slug: new Map([["mwf", 2]]),
    click_visibility_runtime_status: "OK",
    demand_present_by_filter_slug: new Map([["mwf", true]]),
  });
  assert.ok(
    !summary.top_unknown_join_reasons.some((r) => r.includes("per_page_click_not_joined_v1")),
  );
  assert.ok(
    !summary.top_unknown_join_reasons.some((r) => r.includes("per_page_demand_not_joined_v1")),
  );
  assert.equal(summary.sample_rows[0]?.click_signal, "present");
  assert.equal(summary.sample_rows[0]?.demand_signal, "present");
});

test("command_center_v2.page_publishability_truth_summary_v1 is read-only semantic lane", async () => {
  const stubSummary = buildPagePublishabilityTruthSummaryV1({
    generated_at: "2026-05-18T00:00:00.000Z",
    catalog_rows: [{ filter_slug: "mwf", oem_token: "MWF", brand_slug: "ge" }],
    evidence_inventory: {
      contract: "evidence_inventory_v1",
      proven_facts: [],
      unknown_facts: [],
      data_evidence: {
        directory_relative_path: "data/evidence",
        total_json_files: 0,
        filename_outcome_buckets: {
          live_outcome_by_filename_substring: 0,
          unknown_outcome_by_filename_substring: 0,
          fail_hold_outcome_by_filename_substring: 0,
          other_json_not_matching_filename_patterns: 0,
        },
        recent_filenames: [],
        recent_ordering: "lexicographic_by_filename",
        proven_facts: [],
        unknown_facts: [],
        body_mapping: {
          parsed_ok_count: 0,
          parse_error_count: 0,
          mapped_count: 0,
          unmapped_count: 0,
          by_scope: {},
          by_filter_slug: {},
          by_token: {},
        },
      },
      refrigerator_manual_evidence: {
        inventory_contract: "refrigerator_manual_evidence_files_v1",
        directory_relative_path: "data/manual-evidence/refrigerator",
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
      fridge_form_factor_evidence: {
        inventory_contract: "fridge_form_factor_evidence_files_v1",
        directory_relative_path: "data/fridge-form-factor-evidence",
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
    },
    filter_slug_to_model_slugs: new Map(),
    indexable_slugs: null,
    cta_join_by_filter_slug: null,
    affiliate_approval_pending: true,
    commission_or_revenue: "NOT_CONNECTED",
    human_likely_clicks_by_filter_slug: null,
    click_visibility_runtime_status: null,
    demand_present_by_filter_slug: null,
  });

  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: fileExistsTokenControlsOnly,
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("affiliate-application-tracker.json") ? BASE_TRACKER : ""),
    pagePublishabilityTruthSummaryLoader: async () => stubSummary,
  });

  const lane = report.command_center_v2.page_publishability_truth_summary_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "page_publishability_truth_summary_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.page_kind, "refrigerator_filter");
  assert.ok(lane.unknown_join_count > 0);
  assert.ok(!Object.keys(lane.distribution_automation_allowed).includes("auto_fix_allowed"));
  assert.ok(lane.sample_rows.length <= 25);
});

test("command_center_v2.fridge_truth_spine_v1 is read-only refrigerator truth spine", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const spine = report.command_center_v2.fridge_truth_spine_v1;
  assert.ok(spine);
  assert.equal(spine.contract, "fridge_truth_spine_v1");
  assert.equal(spine.read_only, true);
  assert.equal(spine.data_mutation, false);
  const fridgeAudit = buildRefrigeratorModelFirstTruthAuditV1({ rootDir: process.cwd() });
  assert.equal(
    spine.csv_truth.linked_filters_with_safe_direct_buyable_primary,
    fridgeAudit.linked_filters_with_safe_direct_buyable_primary,
  );
  assert.equal(spine.csv_truth.safe_buyer_path_verdict, "UNKNOWN");
  assert.deepEqual(spine.supabase_csv_diff.evidence_only_slugs, ["4396508", "gswf"]);
  assert.equal(spine.public_truth.should_redo_fridge_products_now, "NO");
  assert.equal(spine.public_truth.public_truth_status, "PUBLIC_TRUTHFUL");
  if (spine.supabase_csv_diff.supabase_truth_status === "CHECKED") {
    // 4 = 4396710 + 4396841 (B087 CSV rows removed in 26a4d2a; Supabase wins remain) + da29-00020b + ukf8001.
    assert.equal(spine.supabase_csv_diff.supabase_has_win_csv_missing_count, 4);
    assert.equal(spine.supabase_csv_diff.evidence_only_not_in_supabase_count, 2);
  }
  assert.ok(spine.recommended_next_action.toLowerCase().includes("do not apply"));
  assert.ok(spine.proven_facts.some((f) => f.includes("does not authorize")));
  assert.ok(spine.truth_first_notes.some((n) => n.includes("Affiliate links remain second")));
});

test("command_center_v2.refrigerator_model_first_qa_approval_packet_v1 is read-only QA wrong-purchase prevention lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.refrigerator_model_first_qa_approval_packet_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "refrigerator_model_first_qa_approval_packet_v1");
  assert.equal(lane.packet_framing, "quality_assurance_wrong_purchase_prevention");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.apply_authorized, false);
  assert.equal(lane.founder_approval_required, true);
  assert.equal(lane.founder_approval_status, "pending");
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.equal(lane.buy_link_mutation_authorized, false);
  assert.equal(lane.public_page_change_authorized, false);
  assert.equal(lane.inspect_summary.mapping_review_model_count, 0);
  assert.equal(lane.inspect_summary.total_planned_removals, 0);
  assert.equal(lane.inspect_summary.total_planned_additions, 0);
  assert.equal(lane.inspect_summary.batch_qa_cleanup_applied, true);
  assert.equal(lane.inspect_summary.removals_applied, 53);
  assert.equal(lane.inspect_summary.additions_applied, 10);
  assert.equal(lane.inspect_summary.keeps_verified, 16);
  assert.equal(lane.inspect_summary.proven_model_count, 20);
  assert.equal(lane.inspect_summary.remaining_mapping_review_count, 0);
  assert.equal(lane.inspect_summary.samsung_marketing_token_cross_reference_resolved, true);
  assert.match(
    lane.inspect_summary.recommended_next_action,
    /All 20 batch models PROVEN including Samsung HAF-QIN\/HAF-CIN/i,
  );
  assert.ok(
    lane.inspect_summary.recommended_jq_paths.command_center.includes(
      "refrigerator_model_first_qa_approval_packet_v1",
    ),
  );
  assert.ok(
    lane.draft_markdown_path.includes(
      "data/fridge/batch-production/drafts/refrigerator-model-first-mapping-review-founder-approval-packet-v1.md",
    ),
  );
});

test("command_center_v2.refrigerator_model_first_batch_resolver_v1 is read-only model-first batch resolver", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.refrigerator_model_first_batch_resolver_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "refrigerator_model_first_batch_resolver_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.equal(lane.buy_link_mutation_authorized, false);
  assert.equal(lane.public_page_change_authorized, false);
  assert.equal(lane.inspect_summary.csv_apply_authorized, false);
  assert.equal(lane.inspect_summary.models_checked_count, 20);
  assert.equal(lane.inspect_summary.confidence_counts.MAPPING_REVIEW_REQUIRED, 0);
  assert.equal(lane.inspect_summary.confidence_counts.UNKNOWN, 0);
  assert.equal(lane.inspect_summary.confidence_counts.PROVEN, 20);
  assert.ok(
    lane.inspect_summary.recommended_jq_paths.command_center.includes(
      "refrigerator_model_first_batch_resolver_v1",
    ),
  );
});

test("command center next_best_action prefers refrigerator model-first over AP steering when fridge batch has open rows", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const fridgeLane = report.command_center_v2.refrigerator_model_first_batch_resolver_v1;
  const mappingReview = fridgeLane.inspect_summary.confidence_counts.MAPPING_REVIEW_REQUIRED;
  const unknown = fridgeLane.inspect_summary.confidence_counts.UNKNOWN;
  if (mappingReview > 0 || unknown > 0) {
    assert.ok(report.next_best_action.startsWith("REFRIGERATOR MODEL-FIRST [READY]:"));
    assert.match(report.next_best_action, /mapping-review model/i);
    assert.match(report.next_best_action, /unknown refrigerator model/i);
    assert.match(report.why_this_action, /prioritize fridge official-manufacturer evidence over AP filter-first steering/i);
    assert.equal(/^MODEL-FIRST STEERING \[READY\]:/i.test(report.next_best_action), false);
    assert.equal(report.execution_guidance.next_move_mode, "READ_ONLY");
    assert.ok(
      report.execution_guidance.next_move_command.includes(
        "report-refrigerator-model-first-batch-resolver-v1",
      ),
    );
  }
});

test("command_center_v2.air_purifier_truth_spine_v1 is read-only AP truth spine", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const spine = report.command_center_v2.air_purifier_truth_spine_v1;
  assert.ok(spine);
  assert.equal(spine.contract, "air_purifier_truth_spine_v1");
  assert.equal(spine.read_only, true);
  assert.equal(spine.data_mutation, false);
  assert.equal(spine.public_launch_state, "LIVE");
  assert.equal(spine.public_indexing_status, "INDEXABLE_LIVE");
  assert.equal(spine.formal_spine_status, "PROVEN");
  assert.equal(spine.ap_public_but_spine_gap_resolved, true);
  assert.equal(spine.all_filters_verified_claim, false);
  assert.equal(spine.buy_gate_boundary_status, "PROVEN");
  assert.ok(spine.safe_cta_count > 0);
  assert.ok(spine.proven_facts.some((f) => f.includes("does not authorize")));
  assert.ok(spine.truth_first_notes.some((n) => n.includes("Affiliate links remain second")));
});

test("command_center_v2.air_purifier_demand_selected_batch_owner_review_v1 is read-only owner packet", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.air_purifier_demand_selected_batch_owner_review_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "air_purifier_demand_selected_batch_owner_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.air_purifier_demand_selected_batch_owner_review_v1");
  assert.equal(lane.recommended_wedge, "air_purifier");
  assert.equal(lane.source_recommendation_status, "START_NEW_DEMAND_SELECTED_BATCH");
  assert.equal(lane.next_lane, "air_purifier_buyer_path_coverage");
  assert.equal(lane.next_wedge, "air_purifier");
  assert.equal(lane.next_batch_candidate, "air_purifier_demand_selected_batch_candidate");
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.batch_start_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(typeof lane.demand_proof.air_purifier_impressions, "number");
  assert.ok(lane.demand_proof.air_purifier_impressions > 0);
  assert.equal(typeof lane.demand_proof.air_purifier_priority_score, "number");
  assert.ok(lane.demand_proof.air_purifier_priority_score > 0);
  assert.equal(lane.candidate_rows_status, "PROVEN");
  assert.ok(lane.candidate_rows.length > 0);
  assert.ok(lane.blockers.includes("open_batch_not_proven"));
  assert.ok(lane.blockers.includes("owner_batch_start_approval_missing"));
  assert.ok(lane.blockers.includes("batch_run_registry_not_created"));
  assert.ok(lane.blockers.includes("evidence_collection_not_started"));
  assert.match(lane.next_agent_action, /do not start a batch/i);
});

test("command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1 is read-only owner packet", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "rpwfe_purchase_option_rescue_owner_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommended_jq_path, ".command_center_v2.rpwfe_purchase_option_rescue_owner_review_v1");
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.public_route, "/filter/rpwfe");
  assert.equal(lane.customer_visible_problem, true);
  if (lane.owner_review_phase === "POST_SUPABASE_PARITY_NOOP") {
    assert.equal(lane.current_public_state, "repo_and_supabase_direct_buyable");
    assert.equal(lane.existing_retailer_row_status, "REPO_DIRECT_BUYABLE_OFFICIAL_GE_APPLIED");
    assert.ok(!lane.blockers.includes("supabase_parity_not_applied"));
    assert.match(lane.next_owner_action, /live \/filter\/rpwfe/i);
  } else if (lane.owner_review_phase === "POST_CSV_APPLY_NOOP") {
    assert.equal(lane.current_public_state, "repo_csv_direct_buyable_supabase_parity_pending");
    assert.equal(lane.existing_retailer_row_status, "REPO_DIRECT_BUYABLE_OFFICIAL_GE_APPLIED");
    assert.equal(lane.official_ge_path_status, "PROVEN_IN_REPO_CSV_APPLIED");
    assert.ok(lane.blockers.includes("supabase_parity_not_applied"));
    assert.ok(!lane.blockers.includes("official_ge_direct_pdp_not_proven_or_not_applied"));
    assert.match(lane.next_owner_action, /Supabase parity/i);
  } else {
    assert.equal(lane.current_public_state, "no_buy_options");
    assert.equal(lane.existing_retailer_row_status, "SEARCH_PLACEHOLDER_BLOCKED");
    assert.equal(lane.official_ge_path_status, "PROVEN_IN_REPO_DOC_NOT_APPLIED");
    assert.ok(lane.blockers.includes("official_ge_direct_pdp_not_proven_or_not_applied"));
    assert.match(lane.next_agent_action, /do not add buy links/i);
  }
  assert.equal(lane.compatible_waterdrop_path_status, "UNPROVEN_UNAUTHORIZED");
  assert.equal(lane.candidate_waterdrop_product, "WD-F19C");
  assert.equal(typeof lane.compatible_model_count, "number");
  assert.ok(lane.compatible_model_count > 0);
  assert.equal(lane.safe_labeling_required, true);
  assert.equal(lane.official_label_authorized, false);
  assert.equal(lane.compatible_label_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.ok(lane.blockers.includes("csv_supabase_mutation_not_authorized"));
  if (
    lane.owner_review_phase !== "POST_CSV_APPLY_NOOP" &&
    lane.owner_review_phase !== "POST_SUPABASE_PARITY_NOOP"
  ) {
    assert.ok(lane.blockers.includes("official_ge_direct_pdp_not_proven_or_not_applied"));
    assert.match(lane.next_agent_action, /do not add buy links/i);
  }
});

test("command_center_v2.rpwfe_official_ge_supabase_parity_plan_v1 is read-only parity plan", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.rpwfe_official_ge_supabase_parity_plan_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "rpwfe_official_ge_supabase_parity_plan_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.waterdrop_in_plan, false);
  assert.equal(lane.amazon_in_plan, false);
  assert.equal(lane.compatible_replacement_in_plan, false);
  assert.ok(lane.blockers.includes("owner_supabase_apply_approval_missing"));
  assert.ok(lane.blockers.includes("supabase_apply_not_authorized"));
  assert.ok(lane.blockers.includes("live_page_not_revalidated_after_supabase_parity"));
  if (lane.repo_csv_status === "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP") {
    assert.equal(lane.proposed_url, "https://www.geapplianceparts.com/store/parts/spec/RPWFE");
    assert.equal(lane.proposed_browser_truth_classification, "direct_buyable");
    assert.equal(lane.proposed_retailer_name, "GE Appliance Parts");
  }
});

test("command_center_v2.rpwfe_official_ge_apply_plan_proposal_v1 is read-only apply plan", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.rpwfe_official_ge_apply_plan_proposal_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "rpwfe_official_ge_apply_plan_proposal_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.public_route, "/filter/rpwfe");
  assert.equal(lane.proposed_customer_label, "BuckParts Verified Link");
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.waterdrop_in_proposal, false);
  assert.equal(lane.compatible_replacement_in_proposal, false);
  assert.equal(lane.amazon_in_proposal, false);
  if (lane.plan_status === "ALREADY_APPLIED_REPO_DIRECT_BUYABLE") {
    assert.equal(lane.csv_apply_noop, true);
    assert.equal(lane.apply_plan_proposal_ready, false);
    if (lane.blockers.includes("supabase_parity_already_applied")) {
      assert.ok(!lane.blockers.includes("supabase_parity_not_applied"));
      assert.match(lane.next_recommended_action, /live \/filter\/rpwfe/i);
    } else {
      assert.ok(lane.blockers.includes("supabase_parity_not_applied"));
      assert.match(lane.next_recommended_action, /Supabase parity/i);
    }
  } else if (lane.plan_status === "PROPOSED_OWNER_REVIEW_READY") {
    assert.equal(lane.apply_plan_proposal_ready, true);
    assert.equal(lane.current_row_state, "existing_ge_catalog_search_placeholder_blocked");
    assert.ok(lane.planned_retailer_links_csv_change);
    assert.equal(lane.planned_retailer_links_csv_change!.proposed_row.waterdrop, false);
    assert.ok(lane.blockers.includes("owner_apply_approval_missing"));
    assert.ok(lane.blockers.includes("csv_apply_not_authorized"));
  } else {
    assert.equal(lane.apply_plan_proposal_ready, false);
    assert.equal(lane.planned_retailer_links_csv_change, null);
  }
});

test("command_center_v2.rpwfe_official_ge_browser_evidence_review_v1 is read-only browser evidence lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.rpwfe_official_ge_browser_evidence_review_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "rpwfe_official_ge_browser_evidence_review_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.filter_slug, "rpwfe");
  assert.equal(lane.emergency_classification, "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP");
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.waterdrop_in_scope, false);
  assert.equal(
    lane.artifact_path,
    "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json",
  );
  if (lane.browser_truth_status === "PASS") {
    assert.equal(lane.official_ge_verified_link_candidate_status, "BROWSER_PROVEN_OWNER_REVIEW_READY");
    assert.equal(lane.owner_review_ready, true);
    assert.equal(lane.buckparts_verified_link_authorized, false);
    assert.equal(lane.csv_apply_authorized, false);
  }
  if (lane.browser_truth_status === "FAIL" || lane.browser_truth_status === "UNKNOWN") {
    assert.equal(lane.apply_plan_proposal_ready, false);
  }
});

test("command_center_v2.rpwfe_verified_link_rescue_plan_v1 is read-only rescue evidence plan", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.rpwfe_verified_link_rescue_plan_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "rpwfe_verified_link_rescue_plan_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.owner_approval_required, true);
  assert.equal(lane.emergency_classification, "HIGH_DEMAND_NO_VERIFIED_LINK_TRUST_GAP");
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.official_ge_candidate.path_type, "OFFICIAL_GE_MANUFACTURER");
  assert.equal(lane.compatible_waterdrop_candidate.status, "UNPROVEN_UNAUTHORIZED");
  assert.equal(lane.compatible_waterdrop_candidate.product_sku, "WD-F19C");
  assert.equal(lane.visual_match_proof_needed.required, true);
  assert.match(lane.electronic_filter_risk_plain_language, /electronic piece inside/i);
  assert.ok(lane.prohibited_claims.some((c) => /official ge/i.test(c) && /waterdrop/i.test(c)));
  assert.match(lane.why_this_matters_to_certainty_engine, /Certainty Engine/i);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
});

test("command_center_v2.buckparts_certainty_engine_checklist_v1 is read-only north-star checklist", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.buckparts_certainty_engine_checklist_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "buckparts_certainty_engine_checklist_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(
    lane.recommended_jq_path,
    ".command_center_v2.buckparts_certainty_engine_checklist_v1",
  );
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_mutation_authorized, false);
  assert.equal(lane.evidence_write_authorized, false);
  assert.equal(lane.public_ui_mutation_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
  assert.equal(lane.buy_cta_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.ok(lane.checklist_item_count >= 39);
  const first = lane.checklist_items[0]!;
  assert.equal(first.id, "every_filter_has_buckparts_verified_link_or_safe_buyer_path");
  assert.notEqual(first.status, "PROVEN");
  assert.equal(lane.branded_term, "BuckParts Verified Link");
  assert.match(lane.branded_term_definition ?? "", /checked against the part/i);
  assert.match(lane.ai_vs_buckparts_positioning ?? "", /AI can suggest\. BuckParts verifies\./);
  assert.equal(lane.customer_facing_terminology.branded_term, "BuckParts Verified Link");
  assert.ok(lane.customer_facing_terminology.forbidden_customer_language.includes("buy button"));
  assert.ok(lane.checklist_items.some((item) => item.id === "visual_match_proof"));
  assert.ok(lane.checklist_items.some((item) => item.id === "label_photo_screenshot_upload"));
  assert.ok(lane.checklist_items.some((item) => item.id === "why_buckparts_beats_generic_ai"));
  assert.ok(
    lane.current_blockers.some((blocker) => blocker.startsWith("rpwfe:current_public_state=")),
  );
  const ids = lane.checklist_items.map((item) => item.id);
  assert.ok(ids.indexOf("buyer_path_coverage_scoreboard") < 5);
  assert.ok(ids.indexOf("high_demand_no_buy_emergency_lane") < 5);
  assert.ok(lane.marketing_plan.every_post_must_include_educational_component);
  assert.equal(lane.login_and_email_stance.forced_login_before_value, false);
  assert.ok(
    lane.checklist_items.some((item) => item.id === "buckparts_seal_of_confidence_future_goal"),
  );
});

test("command_center_v2.operator_process_compression_v1 is read-only ship guard lane", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.operator_process_compression_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "operator_process_compression_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.ship_guard_command, "npm run buckparts:ship-guard");
  assert.equal(lane.push_authorized, false);
  assert.equal(lane.buckparts_verified_link_authorized, false);
  assert.equal(lane.netlify_api_authorized, false);
});

test("command_center_v2.external_quality_signal_usefulness_v1 is read-only and not overstated", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    liveSiteMonitor: null,
    demandToCoverageEngineLoader: async () => buildDemandToCoverageEngineV1FromRows([], "OK", []),
    learningOutcomesReadModelLoader: async () => learningOutcomesReadModelOkFixture(),
    evidenceToLearningOutcomesCandidateImportLoader: async () => evidenceImportOkFixture(),
    fileExists: fs.existsSync,
    readDir: fs.readdirSync,
    readTextFile: readTextFileTrackerOrRepoData,
  });
  const lane = report.command_center_v2.external_quality_signal_usefulness_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "external_quality_signal_usefulness_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.external_quality_signals_affect_decisions, "NOT_PROVEN");
  assert.equal(lane.sentry_errors_feed_command_center, "NOT_PROVEN");
  assert.equal(lane.github_workflows_present, "PROVEN");
  assert.equal(lane.buckparts_verified_link_authorized, false);
});

test("command_center_v2.air_purifier_batch_coverage_director_v1 is read-only AP batch coverage director", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const director = report.command_center_v2.air_purifier_batch_coverage_director_v1;
  assert.ok(director);
  assert.equal(director.contract, "air_purifier_batch_coverage_director_v1");
  assert.equal(director.read_only, true);
  assert.equal(director.data_mutation, false);
  assert.equal(director.source_truth_spine_contract, "air_purifier_truth_spine_v1");
  assert.equal(director.inspect_summary.safe_cta_count, 10);
  assert.equal(director.inspect_summary.zero_safe_buy_path_count, 45);
  assert.equal(director.csv_apply_authorized, false);
  assert.equal(director.supabase_update_authorized, false);
  assert.equal(director.public_launch_change_authorized, false);
  assert.equal(director.all_filters_verified_claim, false);
  assert.ok(director.active_batch_item_count >= 2);
  assert.ok(director.proven_facts.some((f) => f.includes("csv_apply_authorized=false")));
});

test("command_center_v2.vacuum_bags_wedge_feasibility_v1 is read-only vacuum feasibility report", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.vacuum_bags_wedge_feasibility_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "vacuum_bags_wedge_feasibility_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommendation, "NEEDS_RESEARCH_FIRST");
  assert.equal(lane.all_vacuum_bags_verified_claim, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.equal(lane.public_launch_authorized, false);
  assert.ok(lane.inspect_summary.architecture_reuse_score >= 7);
  assert.ok(lane.furnace_filter_comparison.furnace_deferred_reason.includes("MERV"));
  assert.ok(lane.proven_facts.some((f) => f.includes("sample")));
});

test("command_center_v2.vacuum_bags_research_seed_packet_v1 is read-only vacuum seed packet", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.vacuum_bags_research_seed_packet_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "vacuum_bags_research_seed_packet_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommendation, "RESEARCH_SEED_PACKET_READY");
  assert.equal(lane.source_feasibility_contract, "vacuum_bags_wedge_feasibility_v1");
  assert.equal(lane.all_vacuum_bags_verified_claim, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.equal(lane.public_launch_authorized, false);
  assert.equal(lane.sitemap_change_authorized, false);
  assert.equal(lane.buy_gate_change_authorized, false);
  assert.ok(lane.first_seed_families.every((f) => f.planning_status === "candidate_only"));
  assert.ok(lane.furnace_filters_out_of_scope.deferred);
  assert.ok(lane.inspect_summary.next_action.length > 0);
});

test("command_center_v2.vacuum_bags_oem_research_evidence_packet_v1 is read-only OEM evidence packet", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.vacuum_bags_oem_research_evidence_packet_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "vacuum_bags_oem_research_evidence_packet_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.recommendation, "NEEDS_MORE_OEM_EVIDENCE");
  assert.equal(lane.source_seed_packet_contract, "vacuum_bags_research_seed_packet_v1");
  assert.equal(lane.all_vacuum_bags_verified_claim, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.equal(lane.public_launch_authorized, false);
  assert.equal(lane.sitemap_change_authorized, false);
  assert.equal(lane.buy_gate_change_authorized, false);
  assert.equal(lane.inspect_summary.families_checked_count, 4);
  assert.equal(lane.inspect_summary.families_ready_for_truth_spine_seed_count, 0);
  assert.ok(lane.family_evidence_rows.every((r) => r.evidence_status === "UNKNOWN"));
});

test("command_center_v2.whole_house_water_batch_production_director_v1 is read-only WHW batch director", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.whole_house_water_batch_production_director_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "whole_house_water_batch_production_director_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.whw_public_opening_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.inspect_summary.whw_public_opening_authorized, false);
  assert.equal(lane.inspect_summary.csv_apply_authorized, false);
  assert.equal(lane.inspect_summary.ap810_in_active_batch, false);
  const whwDirectorBatchSealed = fs.existsSync(
    path.join(
      process.cwd(),
      "data/whole-house-water/batch-production/agent-results-model-first-v1/whw-director-model-first-batch-v1.results.json",
    ),
  );
  if (whwDirectorBatchSealed) {
    assert.equal(lane.active_batch_item_count, 0);
    assert.equal(lane.current_batch_head, null);
    assert.equal(lane.inspect_summary.active_filter_slugs.length, 0);
  } else {
    assert.ok(lane.active_batch_item_count >= 2);
    assert.ok(lane.inspect_summary.active_filter_slugs.length >= 2);
  }
  assert.equal(lane.grind_avoidance.do_not_grind_single_filter, true);
  assert.equal(lane.grind_avoidance.park_unknowns_and_advance, true);
  assert.equal(lane.factory_rules.promote_only_pass_evidence, true);
  assert.equal(lane.factory_rules.never_open_whw_from_single_safe_cta, true);
  assert.equal(lane.factory_rules.never_treat_row_count_as_truth, true);
  assert.ok(lane.inspect_summary.recommended_jq_paths.command_center.includes("inspect_summary"));

  const ap811BuyerPathArtifact = path.join(
    process.cwd(),
    "data/whole-house-water/batch-production/agent-results-buyer-path-v1/whw-buyer-path-3m-ap811-batch-v1.results.json",
  );
  const ap811BrowserTruthArtifact = path.join(
    process.cwd(),
    "data/whole-house-water/batch-production/browser-truth-results-v1/whw-browser-truth-3m-ap811-v1.results.json",
  );
  if (fs.existsSync(ap811BuyerPathArtifact)) {
    if (fs.existsSync(ap811BrowserTruthArtifact)) {
      assert.equal(lane.inspect_summary.ap811_is_founder_apply_head, false);
      assert.equal(lane.inspect_summary.ap811_is_browser_truth_head, false);
      assert.equal(lane.inspect_summary.ap811_browser_truth_capture_complete, true);
      if (!whwDirectorBatchSealed) {
        assert.ok(lane.current_batch_head);
        assert.notEqual(lane.current_batch_head?.filter_slug, "3m-ap811");
        assert.equal(lane.current_batch_head?.packet_kind, "model_first_evidence");
      }
      assert.ok(
        lane.next_batch_items.skip_for_now.some((i) => i.filter_slug === "3m-ap811"),
      );
      assert.equal(
        lane.next_batch_items.founder_apply_review.find((i) => i.filter_slug === "3m-ap811"),
        undefined,
      );
    } else {
      assert.equal(lane.inspect_summary.ap811_is_browser_truth_head, true);
      assert.equal(lane.current_batch_head?.filter_slug, "3m-ap811");
      assert.equal(lane.current_batch_head?.packet_kind, "browser_truth_capture");
    }
    if (!fs.existsSync(ap811BrowserTruthArtifact)) {
      assert.equal(
        lane.inspect_summary.active_filter_slugs.includes("3m-ap811"),
        true,
      );
    } else {
      assert.equal(
        lane.inspect_summary.active_filter_slugs.includes("3m-ap811"),
        false,
      );
    }
    assert.equal(
      lane.inspect_summary.active_filter_slugs.includes("3m-ap810"),
      false,
    );
  }
  assert.equal(lane.inspect_summary.ap810_parked, true);
  if (whwDirectorBatchSealed) {
    assert.equal(lane.next_batch_items.model_first_evidence.length, 0);
  } else {
    assert.ok(lane.next_batch_items.model_first_evidence.length >= 1);
  }
  assert.ok(lane.proven_facts.some((f) => f.includes("csv_apply_authorized=false")));
});

test("command_center_v2.whole_house_water_director_model_first_batch_v1 is read-only director model-first batch", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.whole_house_water_director_model_first_batch_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "whole_house_water_director_model_first_batch_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.batch_size, 10);
  assert.equal(lane.source_batch_head_filter_slug, "3m-ap910r");
  assert.equal(lane.evidence_status_counts.PASS, 0);
  assert.equal(lane.whw_public_opening_authorized, false);
  assert.equal(lane.csv_apply_authorized, false);
  assert.equal(lane.supabase_update_authorized, false);
  assert.notEqual(lane.supabase_update_authorized, null);
  assert.ok(lane.filters_checked.length === 10);
  assert.ok(lane.proven_facts.some((f) => f.includes("does not authorize") || f.includes("csv_apply_authorized=false")));
});

test("command_center_v2.sitemap_indexability_audit_v1 is read-only sitemap inventory audit", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const audit = report.command_center_v2.sitemap_indexability_audit_v1;
  assert.ok(audit);
  assert.equal(audit.contract, "buckparts_sitemap_indexability_audit_v1");
  assert.equal(audit.read_only, true);
  assert.equal(audit.data_mutation, false);
  assert.ok(audit.live_wedges_indexable.includes("refrigerator_water"));
  assert.ok(audit.live_wedges_indexable.includes("air_purifier"));
  assert.ok(audit.excluded_wedges.includes("whole_house_water"));
  assert.equal(audit.gsc_indexed_count, "UNKNOWN");
  assert.equal(audit.gsc_discovered_count, "UNKNOWN");
  assert.notEqual(audit.first_campaign_indexability_status, "READY");
  assert.equal(audit.existing_public_routes_not_in_repo_sitemap.includes("/truth-policy"), true);
  assert.ok(audit.sitemap_generation_sources.some((s) => s.includes("sitemap.ts")));
  assert.ok(audit.proven_facts.some((f) => f.includes("does not authorize")));
});

test("command_center_v2.wedge_truth_spine_coverage_matrix_v1 is read-only wedge parity matrix", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const matrix = report.command_center_v2.wedge_truth_spine_coverage_matrix_v1;
  assert.ok(matrix);
  assert.equal(matrix.contract, "wedge_truth_spine_coverage_matrix_v1");
  assert.equal(matrix.read_only, true);
  assert.equal(matrix.data_mutation, false);
  assert.equal(matrix.inspect_summary.wedges_with_formal_spine_count, 2);
  assert.equal(matrix.inspect_summary.ap_truth_spine_gap_present, false);
  assert.ok(matrix.inspect_summary.whw_truth_spine_gap_present);
  assert.equal(
    matrix.inspect_summary.wedges_public_but_without_formal_spine.includes("air_purifier"),
    false,
  );
  assert.ok(
    matrix.inspect_summary.wedges_partial_operational_proof.includes("whole_house_water"),
  );

  const fridge = matrix.wedges.find((w) => w.wedge === "refrigerator_water");
  const ap = matrix.wedges.find((w) => w.wedge === "air_purifier");
  const whw = matrix.wedges.find((w) => w.wedge === "whole_house_water");
  assert.ok(fridge);
  assert.equal(fridge!.truth_coverage_status, "FORMAL_SPINE");
  assert.equal(fridge!.truth_spine_contract_name, "fridge_truth_spine_v1");
  assert.ok(ap);
  assert.equal(ap!.has_formal_truth_spine, true);
  assert.equal(ap!.truth_spine_contract_name, "air_purifier_truth_spine_v1");
  assert.equal(ap!.truth_coverage_status, "FORMAL_SPINE");
  assert.ok(whw);
  assert.equal(whw!.truth_coverage_status, "PARTIAL_OPERATIONAL_PROOF");
  assert.equal(whw!.current_public_opening_authorized, false);
  assert.ok(matrix.inspect_summary.recommended_jq_paths.command_center.includes("inspect_summary"));
});

test("command_center_v2.semi_cruise_status_summary_v1 is read-only and reports mutation NOT_PROVEN", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json") || p.includes("spend-ledger-v1.json"),
    readDir: () => [],
    readTextFile: (p) => {
      if (p.endsWith("package.json")) return fs.readFileSync(p, "utf8");
      if (p.includes("spend-ledger-v1.json")) {
        return fs.readFileSync(path.join(process.cwd(), "data/ops/spend-ledger-v1.json"), "utf8");
      }
      return BASE_TRACKER;
    },
  });
  const lane = report.command_center_v2.semi_cruise_status_summary_v1;
  assert.ok(lane);
  assert.equal(lane.contract, "semi_cruise_status_summary_v1");
  assert.equal(lane.read_only, true);
  assert.equal(lane.data_mutation, false);
  assert.equal(lane.mutation_semi_cruise_status, "NOT_PROVEN");
  assert.ok(
    lane.unknown_facts.some((f) => f.includes("Netlify Usage & billing dashboard")),
  );
  assert.ok(!lane.proven_facts.some((f) => /exact.*credit burn.*proven/i.test(f)));
});

test("semi_cruise_status_summary_v1 netlify publishing is UNKNOWN without durable lock proven_facts", async () => {
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: (p) => p.endsWith("package.json"),
    readDir: () => [],
    readTextFile: (p) => (p.endsWith("package.json") ? fs.readFileSync(p, "utf8") : BASE_TRACKER),
  });
  const lane = report.command_center_v2.semi_cruise_status_summary_v1;
  const ledgerHasLock = fs.existsSync(path.join(process.cwd(), "data/ops/spend-ledger-v1.json"))
    ? fs.readFileSync(path.join(process.cwd(), "data/ops/spend-ledger-v1.json"), "utf8").includes("PROVEN: Netlify publishing locked")
    : false;
  if (!ledgerHasLock) {
    assert.equal(lane.netlify_publishing_status, "UNKNOWN");
  }
});

test("learning_outcomes_owner_confidence_assignment_plan_v1 row includes matching_owner_confidence_registry_entry (false without registry match)", () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [confidenceAssignmentEligibleCand(0)],
  });
  const plan = buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(imp, createConfidenceApprovalLookup([]));
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.rows[0].matching_owner_confidence_registry_entry, false);
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});
