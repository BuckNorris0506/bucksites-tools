import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildDemandToCoverageEngineV1FromRows } from "./lib/demand-to-coverage-engine-v1";
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
        recommended_first_action: "Replace search/discovery URLs with direct PDP URLs for highest-volume retailer keys.",
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
        recommended_next_action: "Start with candidates already containing direct_buyable non-OEM links.",
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
  const report = await buildBuckpartsCommandCenterReport({
    providers: baseProviders(),
    fileExists: () => false,
    readDir: () => [],
    readTextFile: () => BASE_TRACKER,
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
  assert.equal(tog.owner_dashboard_ready, false);
  assert.equal(tog.lanes.reduce((s, l) => s + l.max_contribution, 0), 100);
  assert.equal(tog.goal_reached, tog.foundation_maturity_score_100 === 100 && tog.lanes.every((l) => l.status === "PROVEN"));
  assertFoundationScorecardNoBannedClaims(tog);
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

test("NBA prefers Amazon-first OEM rescue when Amazon verified, needs search, no other APPROVED affiliate", async () => {
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
  assert.match(report.next_best_action, /Amazon-first OEM blocked-search rescue/i);
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
  assert.equal(/Amazon-first OEM blocked-search rescue/i.test(report.next_best_action), false);
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
  assert.equal(/Amazon-first OEM blocked-search rescue/i.test(report.next_best_action), false);
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
});

test("command_center_v2 deploy lane OK when liveSiteMonitor artifact all routes ok", async () => {
  const mon: LiveSiteMonitorV1 = {
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
  };
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
    readTextFile: () => BASE_TRACKER,
  };
  const absent = await buildBuckpartsCommandCenterReport({
    ...common,
    fileExists: () => false,
  });
  const present = await buildBuckpartsCommandCenterReport(common);
  assert.equal(present.command_center_v2.public_trust_unification_backend_contract_v1.coverage_status, "PROVEN");
  const delta =
    present.command_center_v2.top_of_game_foundation_scorecard_v1.foundation_maturity_score_100 -
    absent.command_center_v2.top_of_game_foundation_scorecard_v1.foundation_maturity_score_100;
  assert.equal(delta, 8);
  const lane = present.command_center_v2.top_of_game_foundation_scorecard_v1.lanes.find(
    (l) => l.lane_id === "public_trust_unification_backend_contract",
  );
  assert.ok(lane);
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
  assert.equal(daily!.verdict, "BYPASSING");

  const demandQueue = findBrainManifestEntry(report, (r) =>
    r.npm_script_or_path.includes("buckparts:demand-work-queue"),
  );
  assert.ok(demandQueue);
  assert.equal(demandQueue!.verdict, "BYPASSING");

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
  assert.ok(plan.next_consolidation_slice.includes("owner_vertical_launch_policy"));
  const mutate = plan.do_not_integrate_entries.find((e) => e.system_id.includes("mutate"));
  assert.ok(mutate);
  assert.ok(!plan.high_priority_consolidation_targets.some((e) => e.system_id === "hq_handoff_doc"));
  assert.ok(plan.proven_facts.some((f) => f.includes(gate.brain_status)));
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
    assert.ok(report.why_this_action.includes("BRAIN_CAVEAT:"));
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

test("learning_outcomes_owner_confidence_assignment_plan_v1 row includes matching_owner_confidence_registry_entry (false without registry match)", () => {
  const imp = baseEvidenceImportForPlan({
    candidates: [confidenceAssignmentEligibleCand(0)],
  });
  const plan = buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(imp, createConfidenceApprovalLookup([]));
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.rows[0].matching_owner_confidence_registry_entry, false);
  assertConfidenceAssignmentPlanNoBannedClaims(plan);
});
