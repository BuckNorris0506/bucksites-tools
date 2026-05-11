import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildBuckpartsDemandWorkQueueReport,
  type BuckpartsDemandWorkQueueReport,
} from "./report-buckparts-demand-work-queue";
import type { BuckpartsDailyOperatorReport } from "./report-buckparts-daily-operator";

const fixedNow = () => new Date("2026-05-11T12:00:00.000Z");

function daily(overrides: Partial<BuckpartsDailyOperatorReport> = {}): BuckpartsDailyOperatorReport {
  return {
    contract: "buckparts_daily_operator_v1",
    generated_at: fixedNow().toISOString(),
    runtime_status: "ATTENTION",
    business_warning: { status: "CLEAR", issues: [] },
    demand_opportunities: {
      gsc_external_demand: {
        status: "OK",
        connection_level: "BRIGHT",
        total_impressions: 200,
        total_clicks: 3,
        average_ctr: 0.015,
        average_position: 17.89,
        high_impression_low_click_opportunities: "UNKNOWN",
      },
      internal_search_demand_gaps: {
        runtime_status: "OK",
        window_days: { short: 7, long: 30 },
        search_events: {
          last_7d: 1,
          last_30d: 27,
          zero_result_last_7d: 0,
          zero_result_last_30d: 3,
          zero_result_rate_last_7d: 0,
          zero_result_rate_last_30d: 0.111,
        },
        search_gaps_backlog: { open: 1, reviewing: 0, queued: 0, total_actionable: 1 },
        click_events: { last_7d: 38, last_30d: 1688 },
        known_unknowns: [],
      },
    },
    throughput_clicks_money: {
      go_clicks: { last_7d: 38, last_30d: 1688 },
      click_visibility: {
        runtime_status: "OK",
        generated_at: fixedNow().toISOString(),
        window_days: { short: 7, long: 30 },
        last_7_days_clicks: 38,
        last_30_days_clicks: 1688,
        raw_last_7_days_clicks: 38,
        raw_last_30_days_clicks: 1688,
        human_likely_last_7_days_clicks: 30,
        human_likely_last_30_days_clicks: 228,
        excluded_last_30_days_clicks: 1460,
        excluded_by_category_30d: { INTERNAL_AUDIT: 10 },
        newest_click_at: fixedNow().toISOString(),
        oldest_click_at_in_30d_window: fixedNow().toISOString(),
        click_freshness_status: "OK",
        click_freshness_reason: "recent",
        click_quality_notes: "Clicks are not buyer proof.",
        clicks_by_wedge_30d: {
          refrigerator_water: 1688,
          air_purifier: 0,
          whole_house_water: 0,
          vacuum: 0,
          humidifier: 0,
          appliance_air: 0,
          other_or_legacy: 0,
        },
        top_page_attribution_30d: [
          { page_type: "refrigerator_filter", page_slug: "gswf", clicks: 9 },
          { page_type: "refrigerator_filter", page_slug: "edr1rxd1", clicks: 4 },
        ],
        commission_or_revenue: "NOT_CONNECTED",
        commission_or_revenue_notes: "No revenue feed.",
      },
      ga4_trust_funnel: {
        status: "OK",
        source: "SUPABASE",
        event_totals: {
          fridge_model_view: 0,
          fridge_filter_chip_click: 0,
          fridge_filter_view: 0,
          fridge_help_opened: 0,
        },
        rates: {
          chip_clicks_per_model_view: "UNKNOWN",
          filter_views_per_chip_click: "UNKNOWN",
          help_opens_per_filter_view: "UNKNOWN",
        },
        zero_counts_are_failure: false,
        custom_dimension_breakdowns: "UNKNOWN",
      },
      revenue_conversions: {
        status: "UNKNOWN_NOT_CONNECTED",
        revenue: "UNKNOWN",
        conversions: "UNKNOWN",
        reason: "No real affiliate revenue/conversion feed is connected; clicks and GA4 events are not revenue.",
      },
    },
    site_health: {
      live_site_smoke: null,
      primary_target_base_url: "UNKNOWN",
      custom_domain_checked: "UNKNOWN",
      netlify_domain_checked: "UNKNOWN",
      deploy_sync_status: "UNKNOWN",
      route_health_status: "UNKNOWN",
    },
    top_of_game_checklist_status: {
      fit_correctness: "PARTIAL",
      buyer_path_safety: "PARTIAL",
      evidence_provenance: "PARTIAL",
      demand_capture: "BRIGHT",
      analytics_measurement: "PARTIAL",
      revenue_truth: "DARK",
      operations_automation: "PARTIAL",
      founder_dependency_reduction: "PARTIAL",
    },
    stale_or_missing_artifacts: [],
    blocked_jobs: [],
    non_authoritative_signals: excludedSignals(),
    decision_authority_policy: {
      decision_authoritative_signals: [],
      excluded_signals: excludedSignals(),
    },
    recommendation_authority: {
      owner_action: recommendationRecord("owner"),
      agent_action: recommendationRecord("agent"),
      evaluated_actions: [],
    },
    next_owner_action: "Owner action",
    next_agent_action: "Agent action",
    validation_status: {
      read_only: true,
      data_mutation: false,
      local_artifact_write: false,
      supabase_upsert: false,
      expensive_validation_commands_run: false,
      git: { head: "test", status_short: "" },
    },
    what_not_to_touch: [],
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function excludedSignals() {
  return [
    { signal: "affiliate revenue/conversions", reason: "No feed." },
    { signal: "valuation monitor", reason: "No revenue/profit." },
    { signal: "GA4 custom-dimension breakdowns", reason: "Not proven." },
    { signal: "semantic page-state by CTA/trust/quarantine/demand joins", reason: "Not proven." },
    { signal: "catalog-wide evidence coverage by brand/model", reason: "Not proven." },
    { signal: "deployed commit sync", reason: "Not proven." },
  ];
}

function recommendationRecord(source: string) {
  return {
    source,
    proposed_action: "n/a",
    action_type: "WARNING" as const,
    authority_level: "UNKNOWN" as const,
    authority_scope: "test",
    allowed_as_recommendation: false,
    reason: "test",
  };
}

async function buildReport(report: BuckpartsDailyOperatorReport): Promise<BuckpartsDemandWorkQueueReport> {
  return buildBuckpartsDemandWorkQueueReport({
    now: fixedNow,
    providers: {
      dailyOperator: async () => report,
      internalSearchGapDetails: async () => "UNKNOWN",
    },
  });
}

test("Demand-to-Work Queue report shape is stable", async () => {
  const report = await buildReport(daily());
  assert.equal(report.contract, "buckparts_demand_work_queue_v1");
  assert.equal(report.generated_at, fixedNow().toISOString());
  assert.ok(Array.isArray(report.items));
  assert.ok(Array.isArray(report.blocked_or_unknown_inputs));
  assert.ok(Array.isArray(report.excluded_signals));
  assert.ok(Array.isArray(report.proven_facts));
  assert.ok(Array.isArray(report.unknown_facts));
});

test("priority order is deterministic", async () => {
  const report = await buildBuckpartsDemandWorkQueueReport({
    now: fixedNow,
    providers: {
      dailyOperator: async () =>
        daily({
          demand_opportunities: {
            ...daily().demand_opportunities,
            gsc_external_demand: {
              ...daily().demand_opportunities.gsc_external_demand,
              high_impression_low_click_opportunities: [
                { key: "lower", impressions: 20, clicks: 0, ctr: 0 },
                { key: "higher", impressions: 100, clicks: 1, ctr: 0.01 },
              ],
            },
          },
        }),
      internalSearchGapDetails: async () => "UNKNOWN",
      publicLanguageIssues: async () => [
        {
          page: "/filter/gswf",
          term: "OEM",
          proof: "source contains customer-facing OEM",
          recommendation: "Replace with filter number.",
        },
      ],
    },
  });

  assert.deepEqual(
    report.items.map((item) => item.type),
    [
      "GSC_IMPRESSION_LOW_CLICK_REVIEW",
      "GSC_IMPRESSION_LOW_CLICK_REVIEW",
      "PAGE_WITH_CLICKS_NO_REVENUE_UNKNOWN",
      "PAGE_WITH_CLICKS_NO_REVENUE_UNKNOWN",
      "CUSTOMER_LANGUAGE_REVIEW",
    ],
  );
  assert.deepEqual(report.items.map((item) => item.priority_rank), [1, 2, 3, 4, 5]);
  assert.equal(report.items[0].id, "gsc-higher");
});

test("concrete internal search gap detail produces INTERNAL_ZERO_RESULT_GAP_REVIEW", async () => {
  const report = await buildBuckpartsDemandWorkQueueReport({
    now: fixedNow,
    providers: {
      dailyOperator: async () => daily(),
      internalSearchGapDetails: async () => [
        {
          id: 42,
          catalog: "refrigerator_water",
          normalized_query: "gswf filter",
          sample_raw_query: "GSWF filter",
          search_count: 4,
          zero_result_count: 3,
          status: "open",
          likely_entity_type: "filter_part",
          last_seen_at: fixedNow().toISOString(),
        },
      ],
    },
  });

  const item = report.items.find((candidate) => candidate.type === "INTERNAL_ZERO_RESULT_GAP_REVIEW");
  assert.ok(item);
  assert.equal(item.id, "internal-gap-42-gswf-filter");
  assert.equal(item.priority_rank, 1);
  assert.equal(item.authority_level, "BRIGHT");
  assert.equal(item.source, "search_gaps read-only detail query");
  assert.ok(item.proof.includes("query=GSWF filter"));
  assert.ok(item.proof.includes("zero_result_count=3"));
  assert.ok(item.excluded_assumptions.some((assumption) => /not revenue/i.test(assumption)));
  assert.ok(
    !report.blocked_or_unknown_inputs.some((input) => input.input === "internal_search_gap_details"),
  );
});

test("excluded signals cannot produce queue items", async () => {
  const report = await buildReport(daily());
  for (const item of report.items) {
    const authorityFields = [item.type, item.source].join("\n");
    assert.ok(!/valuation/i.test(authorityFields), authorityFields);
    assert.ok(!/GA4 custom-dimension/i.test(authorityFields), authorityFields);
    assert.ok(!/deployed commit/i.test(authorityFields), authorityFields);
  }
  assert.ok(report.excluded_signals.some((signal) => signal.signal === "valuation monitor"));
});

test("revenue and valuation do not appear as item proof", async () => {
  const report = await buildReport(daily());
  for (const item of report.items) {
    const proof = item.proof.join("\n");
    assert.ok(!/\brevenue\b/i.test(proof), proof);
    assert.ok(!/\bvaluation\b/i.test(proof), proof);
    assert.ok(!/\bconversion/i.test(proof), proof);
  }
});

test("click items are labeled as clicks only, not revenue or buyer intent", async () => {
  const report = await buildReport(daily());
  const clickItems = report.items.filter((item) => item.type === "PAGE_WITH_CLICKS_NO_REVENUE_UNKNOWN");
  assert.ok(clickItems.length > 0);
  for (const item of clickItems) {
    assert.match(item.scope, /click behavior only/i);
    assert.ok(item.proof.some((proof) => /^clicks_30d=/.test(proof)));
    assert.ok(item.excluded_assumptions.some((assumption) => /not revenue/i.test(assumption)));
    assert.ok(item.excluded_assumptions.some((assumption) => /not verified buyer intent/i.test(assumption)));
  }
});

test("UNKNOWN GSC opportunities do not produce fake GSC queue items", async () => {
  const report = await buildReport(daily());
  assert.equal(report.items.some((item) => item.type === "GSC_IMPRESSION_LOW_CLICK_REVIEW"), false);
  assert.ok(
    report.blocked_or_unknown_inputs.some(
      (input) => input.input === "gsc_high_impression_low_click_opportunities" && input.status === "DETAIL_MISSING",
    ),
  );
});

test("internal search counts without gap details produce blocked input, not fake item detail", async () => {
  const report = await buildReport(daily());
  assert.equal(report.items.some((item) => item.type === "INTERNAL_ZERO_RESULT_GAP_REVIEW"), false);
  assert.ok(
    report.blocked_or_unknown_inputs.some(
      (input) => input.input === "internal_search_gap_details" && input.status === "DETAIL_MISSING",
    ),
  );
});

test("report script does not import writer or mutation paths", () => {
  const source = readFileSync(path.resolve(process.cwd(), "scripts/report-buckparts-demand-work-queue.ts"), "utf8");
  assert.ok(!/\bwriteFileSync\b|\bappendFileSync\b|\bmkdirSync\b|\brmSync\b/.test(source));
  assert.ok(!/upsert|insert|update|delete|retailer_links|amazon-rescue-token-controls|apply|promote/i.test(source));
});
