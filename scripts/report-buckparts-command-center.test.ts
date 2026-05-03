import assert from "node:assert/strict";
import test from "node:test";

import { buildBuckpartsCommandCenterReport } from "./report-buckparts-command-center";

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
