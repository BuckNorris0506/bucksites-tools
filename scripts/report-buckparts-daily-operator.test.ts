import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBuckpartsDailyOperatorReport,
  renderBuckpartsDailyOperatorOutput,
} from "./report-buckparts-daily-operator";
import type { CommandSurfaceReport } from "./report-buckparts-command-surface";
import type { OwnerGscExternalDemandNeuron } from "@/lib/owner-dashboard/gsc-external-demand";
import type { Ga4TrustFunnelArtifact } from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
import type { LiveSiteMonitorV1 } from "./lib/buckparts-command-center-v2-types";

const fixedNow = () => new Date("2026-05-09T12:00:00.000Z");

function commandSurface(overrides: Partial<CommandSurfaceReport> = {}): CommandSurfaceReport {
  return {
    report_name: "buckparts_command_surface_v1",
    generated_at: fixedNow().toISOString(),
    read_only: true,
    data_mutation: false,
    cleanup_progress: {
      status: "PINNED_MANUAL",
      completed_steps: 20,
      total_steps: 20,
      reason: "Manual Phase 1 cleanup counter; not auto-computed.",
    },
    source_files_checked: [],
    contract_modules_present: {
      page_state: true,
      publishability_state: true,
      provenance_record: true,
      wrong_purchase_risk: true,
      replacement_chain: true,
      no_buy_reason: true,
      retailer_link_state: true,
    },
    docs_present: { operating_map: true, script_classification_manifest: true },
    gsc_exports_present: { sitemap_xml: true, coverage_zip: true, performance_zip: true },
    learning_outcomes_contract: { migration_present: true, table_runtime_status: "OK" },
    learning_outcomes_metrics: {
      source: "public.learning_outcomes",
      runtime_status: "OK",
      outcome_counts: { pass: 1, fail: 0, blocked: 0, unknown: 0 },
      cta_status_counts: { live: 1, not_live: 0, blocked: 0 },
      confidence_counts: { exact: 1, likely: 0, uncertain: 0 },
      recency: { max_days_since_checked: 1, median_days_since_checked: 1 },
    },
    cta_coverage_metrics: {
      source: "supabase_retailer_links",
      runtime_status: "OK",
      total_retailer_links: 10,
      direct_buyable_links: 3,
      safe_cta_links: 3,
      blocked_or_unsafe_links: 1,
      missing_browser_truth_links: 0,
      retailer_counts: { amazon: 3 },
    },
    retailer_link_state_metrics: {
      source: "derived_from_cta_coverage_dataset",
      runtime_status: "OK",
      distribution: { LIVE_VERIFIED: 3 },
      total_links: 10,
    },
    blocked_retailer_link_remediation: {
      source: "derived_from_cta_coverage_dataset",
      runtime_status: "OK",
      top_blocked_states: [],
      top_blocked_retailer_keys: [],
      recommended_next_action: "No blocked links dominate.",
    },
    search_and_click_intelligence_summary: searchSummary(),
    money_funnel_summary: {
      runtime_status: "OK",
      window_days: { short: 7, long: 30 },
      stages_30d: {
        search_events_total: 22,
        search_zero_result_total: 4,
        search_gap_actionable_total: 2,
        click_events_total: 5,
        safe_cta_links_total: 3,
      },
      derived_rates_30d: { zero_result_rate: 0.18, clicks_per_search_event: 0.22 },
      known_unknowns: [],
    },
    rescue_velocity_summary: {
      runtime_status: "OK",
      window_days: { short: 7, long: 30 },
      current_backlog: { blocked_or_unsafe_links: 1, blocked_search_or_discovery: 1, search_gap_actionable_total: 2 },
      resolved_signals: { safe_cta_links_total: 3, direct_buyable_links_total: 3, learning_outcomes_total: 1 },
      derived_rates: { safe_cta_share_of_known_links: 0.3, blocked_to_safe_ratio: 0.33 },
      known_unknowns: [],
    },
    rescue_delta_trend_summary: {
      runtime_status: "OK",
      window_days: { short: 7, long: 30 },
      current: { blocked_or_unsafe_links: 1, blocked_search_or_discovery: 1, safe_cta_links_total: 3, search_gap_actionable_total: 2 },
      deltas: {
        blocked_or_unsafe_links_delta: 0,
        blocked_search_or_discovery_delta: 0,
        safe_cta_links_delta: 0,
        search_gap_actionable_delta: 0,
      },
      net_rescue_direction: "FLAT",
      known_unknowns: [],
    },
    state_system_metrics: {
      source: "local_contracts_and_available_local_data",
      runtime_status: "OK",
      page_state: {
        computable: true,
        distribution: { VERTICAL_POLICY_LIVE: 10 },
        reason: "sitemap inventory",
        contract: "sitemap_artifact_inventory_v1",
        artifact_relative_path: "data/gsc/sitemap.xml",
        url_count: 10,
      },
      publishability_state: { computable: false, distribution: "UNKNOWN", reason: "semantic joins absent" },
      retailer_link_state: { computable: true, distribution: { LIVE_VERIFIED: 3 }, reason: "derived from CTA dataset" },
      no_buy_reason: { computable: false, distribution: "UNKNOWN", reason: "not joined" },
      wrong_purchase_risk: { computable: false, distribution: "UNKNOWN", reason: "not joined" },
      replacement_safety: { computable: false, safe_count: "UNKNOWN", unsafe_count: "UNKNOWN", reason: "not joined" },
    },
    affiliate_tracker: {
      tracker_present: true,
      record_count: 1,
      status_counts: null,
      reapply_required_count: 0,
      approved_count: 1,
      tag_verification: null,
      known_unknowns: [],
      health: { status: "OK", reason: "ok" },
    },
    trend: {
      comparison_basis: "previous_local_snapshot",
      previous_snapshot_present: true,
      delta_summary: {
        learning_outcomes_runtime_status_changed: false,
        affiliate_health_changed: false,
        reapply_required_delta: 0,
      },
      overall_trend: "FLAT",
      reason: "flat",
    },
    system_health: { status: "OK", reasons: [] },
    snapshot_written: false,
    snapshot_path: "data/reports/buckparts-command-surface.json",
    known_unknowns: [],
    recommended_next_step: "Step 13: Affiliate approval tracker",
    ...overrides,
  };
}

function searchSummary() {
  return {
    runtime_status: "OK" as const,
    window_days: { short: 7 as const, long: 30 as const },
    search_events: {
      last_7d: 7,
      last_30d: 22,
      zero_result_last_7d: 1,
      zero_result_last_30d: 4,
      zero_result_rate_last_7d: 0.14,
      zero_result_rate_last_30d: 0.18,
    },
    search_gaps_backlog: { open: 1, reviewing: 1, queued: 0, total_actionable: 2 },
    click_events: { last_7d: 2, last_30d: 5 },
    known_unknowns: [],
  };
}

function commandCenter() {
  return {
    report_name: "buckparts_command_center_v1",
    generated_at: fixedNow().toISOString(),
    read_only: true,
    data_mutation: false,
    search_and_click_intelligence_summary: searchSummary(),
    known_unknowns: [],
    execution_guidance: {
      next_move_mode: "READ_ONLY",
      next_move_command: "npm run buckparts:command-center",
      mutating_blocked: false,
      mutating_block_reasons: [],
      staleness_or_dirty_risk: [],
    },
    command_center_v2: {
      next_owner_action: "Continue read-only monitoring.",
      revenue_snapshot: {
        status: "OK",
        blocker: null,
        next_agent_action: "read clicks",
        next_owner_action: "clicks are not revenue",
        click_visibility: {
          runtime_status: "OK",
          generated_at: fixedNow().toISOString(),
          window_days: { short: 7, long: 30 },
          last_7_days_clicks: 2,
          last_30_days_clicks: 5,
          raw_last_7_days_clicks: 2,
          raw_last_30_days_clicks: 5,
          human_likely_last_7_days_clicks: 1,
          human_likely_last_30_days_clicks: 3,
          excluded_last_30_days_clicks: 2,
          excluded_by_category_30d: { INTERNAL_AUDIT: 1, KNOWN_BOT: 1 },
          top_user_agent_families_30d: [{ user_agent: "RawAgent/1.0", clicks: 2, category: "HUMAN_LIKELY" }],
          newest_click_at: fixedNow().toISOString(),
          oldest_click_at_in_30d_window: fixedNow().toISOString(),
          click_freshness_status: "OK",
          click_freshness_reason: "recent",
          clicks_by_wedge_30d: {
            refrigerator_water: 5,
            air_purifier: 0,
            whole_house_water: 0,
            vacuum: 0,
            humidifier: 0,
            appliance_air: 0,
            other_or_legacy: 0,
          },
          commission_or_revenue: "NOT_CONNECTED",
          commission_or_revenue_notes: "No commission feed.",
        },
      },
      recent_evidence: {
        status: "OK",
        blocker: null,
        next_agent_action: "use inventory",
        next_owner_action: "inventory only",
        evidence_rollup: {
          live_outcome_count: 1,
          unknown_outcome_count: 0,
          fail_hold_outcome_count: 0,
          unclassified_json_count: 0,
          recent_evidence_filenames: ["2026-05-09-live.json"],
        },
        evidence_inventory: {
          contract: "evidence_inventory_v1",
          proven_facts: ["inventory only"],
          unknown_facts: ["No catalog-wide brand/model join."],
          data_evidence: {
            directory_relative_path: "data/evidence",
            total_json_files: 1,
            filename_outcome_buckets: {
              live_outcome_by_filename_substring: 1,
              unknown_outcome_by_filename_substring: 0,
              fail_hold_outcome_by_filename_substring: 0,
              other_json_not_matching_filename_patterns: 0,
            },
            recent_filenames: ["2026-05-09-live.json"],
            recent_ordering: "lexicographic_by_filename",
            proven_facts: [],
            unknown_facts: [],
            body_mapping: {
              parsed_ok_count: 1,
              parse_error_count: 0,
              mapped_count: 1,
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
      },
    },
  } as Awaited<ReturnType<typeof import("./report-buckparts-command-center").buildBuckpartsCommandCenterReport>>;
}

function liveSite(overrides: Partial<LiveSiteMonitorV1> = {}): LiveSiteMonitorV1 {
  return {
    contract: "live_site_monitor_v1",
    checked_at: fixedNow().toISOString(),
    source: "scripts/live-site-smoke-check.ts",
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
    local_head_commit: "localsha",
    origin_main_commit: "originsha",
    deployed_commit: "UNKNOWN",
    deploy_sync_status: "UNKNOWN_DEPLOY_COMMIT",
    proven_facts: ["deployed_commit: UNKNOWN (LIVE_SITE_DEPLOY_COMMIT not set)."],
    unknown_facts: ["Deploy sync cannot be proven against production without LIVE_SITE_DEPLOY_COMMIT."],
    ...overrides,
  };
}

function gsc(overrides: Partial<OwnerGscExternalDemandNeuron> = {}): OwnerGscExternalDemandNeuron {
  return {
    neuron_key: "gsc_external_demand",
    connection_level: "BRIGHT",
    source_class: "ARTIFACT",
    artifact_source: "SUPABASE",
    fetched_at: fixedNow().toISOString(),
    status: "OK",
    freshness_method: "durable artifact",
    export_file_used: "UNKNOWN",
    export_date: "UNKNOWN",
    total_impressions: 100,
    total_clicks: 4,
    average_ctr: 0.04,
    average_position: 8,
    top_queries_by_impressions: [],
    top_queries_by_clicks: [],
    top_pages_by_impressions: [],
    top_pages_by_clicks: [],
    high_impression_low_click_opportunities: [{ key: "lg filter", impressions: 100, clicks: 0, ctr: 0 }],
    proven_facts: ["GSC durable artifact metrics are present."],
    unknown_facts: [],
    next_owner_action: "Use GSC demand opportunities.",
    ...overrides,
  };
}

function ga4(eventTotals: Ga4TrustFunnelArtifact["event_totals"] = {
  fridge_model_view: 0,
  fridge_filter_chip_click: 0,
  fridge_filter_detail_click_from_model: 0,
  fridge_filter_view: 0,
  fridge_help_opened: 0,
}) {
  return {
    status: "OK" as const,
    source: "SUPABASE" as const,
    issue: null,
    artifact: {
      status: "OK",
      fetched_at: fixedNow().toISOString(),
      property_id: "UNKNOWN",
      date_range: { start_date: "2026-05-01", end_date: "2026-05-09" },
      event_totals: eventTotals,
      rates: {
        chip_clicks_per_model_view: "UNKNOWN",
        filter_views_per_chip_click: "UNKNOWN",
        help_opens_per_filter_view: "UNKNOWN",
      },
      dimension_breakdowns: {
        top_model_slugs: "UNKNOWN",
        top_filter_slugs: "UNKNOWN",
        quarantined_vs_normal: "UNKNOWN",
      },
      proven_facts: ["GA4 aggregate artifact loaded."],
      unknown_facts: ["Custom dimensions remain UNKNOWN."],
      provenance: {
        source: "google_analytics_data_api",
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        writer: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
      },
    } satisfies Ga4TrustFunnelArtifact,
  };
}

function providers(overrides: Parameters<typeof buildBuckpartsDailyOperatorReport>[0]["providers"] = {}) {
  return {
    commandCenter: async () => commandCenter(),
    commandSurface: async () => commandSurface(),
    liveSiteSmokeCheck: async () => liveSite(),
    gscExternalDemand: async () => gsc(),
    ga4TrustFunnel: async () => ga4(),
    ...overrides,
  };
}

test("Daily Operator command/report shape is stable", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  assert.equal(report.contract, "buckparts_daily_operator_v1");
  assert.equal(report.generated_at, "2026-05-09T12:00:00.000Z");
  for (const key of [
    "business_warning",
    "demand_opportunities",
    "throughput_clicks_money",
    "site_health",
    "top_of_game_checklist_status",
    "stale_or_missing_artifacts",
    "blocked_jobs",
    "non_authoritative_signals",
    "next_owner_action",
    "next_agent_action",
    "validation_status",
    "what_not_to_touch",
    "proven_facts",
    "unknown_facts",
    "decision_authority_policy",
  ]) {
    assert.ok(key in report);
  }
});

test("default Daily Operator output is owner-readable with main section headings", async () => {
  const report = await buildBuckpartsDailyOperatorReport({
    now: fixedNow,
    providers: providers({
      liveSiteSmokeCheck: async () =>
        liveSite({
          primary_target_base_url: "https://buckparts.netlify.app",
          target_base_url: "https://buckparts.netlify.app",
          target_source: "NEXT_PUBLIC_SITE_URL",
          netlify_fallback_base_url: "https://buckparts.netlify.app",
          netlify_domain_checked: true,
          custom_domain_checked: false,
        }),
    }),
  });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.ok(output.startsWith("BUCKPARTS DAILY OPERATOR\n"));
  for (const heading of [
    "STOP-THE-LINE",
    "DEMAND",
    "TRAFFIC / CLICKS / MONEY",
    "SITE HEALTH",
    "TOP-OF-GAME CHECKLIST",
    "NEXT ACTION",
    "DO NOT TOUCH",
  ]) {
    assert.ok(output.includes(`\n${heading}\n`));
  }
  assert.ok(output.includes("Live-site smoke target is https://buckparts.netlify.app"));
  assert.ok(output.includes("production custom domain check (https://buckparts.com) is UNKNOWN"));
});

test("Daily Operator surfaces concise Top-of-Game Checklist statuses", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.deepEqual(report.top_of_game_checklist_status, {
    fit_correctness: "PARTIAL",
    buyer_path_safety: "PARTIAL",
    evidence_provenance: "PARTIAL",
    demand_capture: "BRIGHT",
    analytics_measurement: "PARTIAL",
    revenue_truth: "DARK",
    operations_automation: "PARTIAL",
    founder_dependency_reduction: "PARTIAL",
  });
  assert.ok(output.includes("\nTOP-OF-GAME CHECKLIST\n"));
  assert.ok(output.includes("- Fit correctness: PARTIAL"));
  assert.ok(output.includes("- Revenue truth: DARK"));
});

test("Daily Operator reports custom domain checked when configured", async () => {
  const report = await buildBuckpartsDailyOperatorReport({
    now: fixedNow,
    providers: providers({
      liveSiteSmokeCheck: async () =>
        liveSite({
          primary_target_base_url: "https://buckparts.com",
          target_base_url: "https://buckparts.com",
          target_source: "LIVE_SITE_SMOKE_TARGET_URL",
          custom_domain_base_url: "https://buckparts.com",
          custom_domain_checked: true,
          netlify_fallback_base_url: "https://buckparts.netlify.app",
          netlify_domain_checked: false,
        }),
    }),
  });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.equal(report.site_health.primary_target_base_url, "https://buckparts.com");
  assert.equal(report.site_health.custom_domain_checked, true);
  assert.ok(output.includes("Primary target: https://buckparts.com."));
  assert.ok(output.includes("Custom domain checked: true; Netlify domain checked: false."));
  assert.equal(output.includes("production custom domain check (https://buckparts.com) is UNKNOWN"), false);
});

test("--json Daily Operator output is parseable JSON contract", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  const parsed = JSON.parse(renderBuckpartsDailyOperatorOutput(report, { json: true }));
  assert.equal(parsed.contract, "buckparts_daily_operator_v1");
  assert.equal(parsed.throughput_clicks_money.click_visibility.top_user_agent_families_30d[0].user_agent, "RawAgent/1.0");
});

test("Daily Operator GSC reader uses exported lane-16 neuron builder", () => {
  const source = readFileSync(path.resolve(process.cwd(), "scripts/report-buckparts-daily-operator.ts"), "utf8");
  assert.equal(source.includes("buildOwnerGscExternalDemandReport"), false);
  assert.equal(source.includes("buildOwnerGscExternalDemandNeuron"), true);
});

test("Daily Operator does not call writer scripts or write artifacts", async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "buckparts-daily-"));
  try {
    const report = await buildBuckpartsDailyOperatorReport({ rootDir: tmpDir, now: fixedNow, providers: providers() });
    assert.equal(report.validation_status.local_artifact_write, false);
    assert.equal(report.validation_status.supabase_upsert, false);
    assert.equal(existsSync(path.join(tmpDir, "data/reports/buckparts-daily-operator.json")), false);
    const source = readFileSync(path.resolve(process.cwd(), "scripts/report-buckparts-daily-operator.ts"), "utf8");
    assert.equal(source.includes("writeFileSync"), false);
    assert.equal(source.includes("writeOwnerArtifactToSupabase"), false);
    assert.equal(source.includes(".upsert("), false);
    assert.equal(source.includes("buckparts:gsc:fetch"), false);
    assert.equal(source.includes("buckparts:ga4:fetch"), false);
    assert.equal(source.includes("buckparts:live-site-smoke\""), false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("human output does not include raw top_user_agent_families details", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.equal(output.includes("top_user_agent_families_30d"), false);
  assert.equal(output.includes("RawAgent/1.0"), false);
  assert.ok(output.includes("Human-likely clicks: 1 last 7d / 3 last 30d."));
});

test("Daily Operator includes read-only live-site smoke result and does not infer deployed commit from HEAD", async () => {
  const report = await buildBuckpartsDailyOperatorReport({
    now: fixedNow,
    providers: providers({
      liveSiteSmokeCheck: async () => liveSite({ local_head_commit: "abcdef", deployed_commit: "UNKNOWN" }),
    }),
  });
  assert.equal(report.site_health.live_site_smoke?.source, "scripts/live-site-smoke-check.ts");
  assert.equal(report.site_health.live_site_smoke?.local_head_commit, "abcdef");
  assert.equal(report.site_health.live_site_smoke?.deployed_commit, "UNKNOWN");
  assert.equal(report.site_health.deploy_sync_status, "UNKNOWN_DEPLOY_COMMIT");
  assert.ok(report.blocked_jobs.some((j) => j.job_or_signal === "deploy_sync_status"));
});

test("Daily Operator marks revenue/conversions UNKNOWN and excludes valuation from authority", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.equal(report.throughput_clicks_money.revenue_conversions.status, "UNKNOWN_NOT_CONNECTED");
  assert.equal(report.throughput_clicks_money.revenue_conversions.revenue, "UNKNOWN");
  assert.equal(report.top_of_game_checklist_status.revenue_truth, "DARK");
  assert.ok(report.decision_authority_policy.excluded_signals.some((s) => s.signal === "valuation monitor"));
  assert.ok(!report.decision_authority_policy.decision_authoritative_signals.some((s) => /valuation/i.test(s.signal)));
  assert.equal(JSON.stringify(report.top_of_game_checklist_status).includes("valuation"), false);
  assert.equal(output.includes("Valuation"), false);
});

test("human output keeps revenue/conversions UNKNOWN and GA4 zero counts non-failure", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  const output = renderBuckpartsDailyOperatorOutput(report);
  assert.ok(output.includes("Revenue/conversions: UNKNOWN_NOT_CONNECTED"));
  assert.ok(output.includes("Zero counts are not failure by themselves."));
});

test("Daily Operator does not treat GA4 zero counts as failure by itself", async () => {
  const report = await buildBuckpartsDailyOperatorReport({
    now: fixedNow,
    providers: providers({ ga4TrustFunnel: async () => ga4() }),
  });
  assert.equal(report.throughput_clicks_money.ga4_trust_funnel.zero_counts_are_failure, false);
  assert.deepEqual(report.throughput_clicks_money.ga4_trust_funnel.event_totals, {
    fridge_model_view: 0,
    fridge_filter_chip_click: 0,
    fridge_filter_detail_click_from_model: 0,
    fridge_filter_view: 0,
    fridge_help_opened: 0,
  });
  assert.ok(!report.blocked_jobs.some((j) => j.job_or_signal === "ga4_trust_funnel"));
});

test("Daily Operator excludes semantic page-state and catalog-wide evidence coverage from authority", async () => {
  const report = await buildBuckpartsDailyOperatorReport({ now: fixedNow, providers: providers() });
  assert.ok(
    report.decision_authority_policy.excluded_signals.some((s) =>
      s.signal.includes("semantic page-state"),
    ),
  );
  assert.ok(
    report.decision_authority_policy.excluded_signals.some((s) =>
      s.signal.includes("catalog-wide evidence coverage"),
    ),
  );
  assert.ok(
    report.decision_authority_policy.decision_authoritative_signals.some(
      (s) => s.signal === "page-state inventory/policy" && s.scope.includes("Sitemap inventory"),
    ),
  );
  assert.ok(
    report.decision_authority_policy.decision_authoritative_signals.some(
      (s) => s.signal === "evidence inventory/body mapping" && s.scope.includes("inventory"),
    ),
  );
});

test("Daily Operator emits UNKNOWN/blocked facts when required inputs are missing", async () => {
  const report = await buildBuckpartsDailyOperatorReport({
    now: fixedNow,
    providers: providers({
      commandCenter: async () => {
        throw new Error("fixture command center missing");
      },
      liveSiteSmokeCheck: async () => {
        throw new Error("fixture live smoke missing");
      },
      ga4TrustFunnel: async () => ({
        status: "UNKNOWN",
        source: "NONE",
        artifact: null,
        issue: "fixture GA4 missing",
      }),
    }),
  });
  assert.equal(report.runtime_status, "ATTENTION");
  assert.ok(report.blocked_jobs.some((j) => j.job_or_signal === "command_center"));
  assert.ok(report.blocked_jobs.some((j) => j.job_or_signal === "live_site_smoke_check"));
  assert.ok(report.blocked_jobs.some((j) => j.job_or_signal === "ga4_trust_funnel"));
  assert.ok(report.unknown_facts.some((fact) => fact.includes("Command Center report unavailable")));
  assert.equal(report.site_health.live_site_smoke, null);
  assert.equal(report.site_health.route_health_status, "UNKNOWN");
});
