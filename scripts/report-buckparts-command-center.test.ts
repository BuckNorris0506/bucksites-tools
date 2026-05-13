import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { buildDemandToCoverageEngineV1FromRows } from "./lib/demand-to-coverage-engine-v1";
import { buildEvidenceToLearningOutcomesCandidateImportV1 } from "./lib/evidence-to-learning-outcomes-candidate-import-v1";
import { buildLearningOutcomesInsertPlanV1, buildLearningOutcomesWriterReadyBatchReviewV1 } from "./lib/learning-outcomes-insert-plan-v1";
import { degradedLearningOutcomesReadModelV1 } from "./lib/learning-outcomes-read-model-v1";
import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesInsertPlanV1,
  LearningOutcomesReadModelV1,
  LearningOutcomesWriterReadyBatchReviewV1,
  LiveSiteMonitorV1,
  ProposedLearningOutcomeRowV1,
} from "./lib/buckparts-command-center-v2-types";
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
