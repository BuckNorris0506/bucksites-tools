import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  attachOwnerCommandCenterNeuronsReport,
  attachOwnerGscExternalDemandReport,
  attachOwnerIntegritySentinelReport,
  attachOwnerSearchDemandAndGapsReport,
  attachOwnerQuarantinedFridgeModelsReport,
  buildOwnerCommandCenterNeuronsReport,
  buildOwnerGscExternalDemandReport,
  buildOwnerIntegritySentinelReport,
  buildOwnerSearchDemandAndGapsReport,
  buildOwnerQuarantinedFridgeModelsSummary,
  mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel,
  mapSearchDemandAndGapsToNeuronConnectionLevel,
} from "@/lib/owner-dashboard/load-command-center-report";
import { buildBatchProductionOwnerDecisionsLaneV1 } from "@/lib/owner-dashboard/batch-production-owner-decisions-lane-v1";
import {
  buildOwnerGscExternalDemandNeuron,
  parseGscPerformanceCsv,
  type OwnerGscExternalDemandNeuron,
} from "@/lib/owner-dashboard/gsc-external-demand";

const STALE_GSC_AGGREGATES_PHRASE_SNIPPET =
  "Parsed impressions/clicks aggregates are UNKNOWN in owner dashboard unless explicit parser outputs";
import {
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";
import { evaluateOwnerDashboardTopOfGamePanelProofV1 } from "../../../scripts/lib/owner-dashboard-top-of-game-panel-readiness-v1";

describe("page_state_distribution neuron", () => {
  it("is BRIGHT for sitemap artifact inventory contract but UNKNOWN semantic PageState status", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: {
        computable: true,
        contract: "sitemap_artifact_inventory_v1",
        artifact_relative_path: "data/gsc/sitemap.xml",
        url_count: 2,
        distribution: { VERTICAL_POLICY_LIVE_refrigerator: 2 },
        reason: "fixture inventory note",
      },
      gscPresence: null,
    });
    const ps = neurons.neurons.find((n) => n.neuron_key === "page_state_distribution");
    assert.ok(ps);
    assert.equal(ps.connection_level, "BRIGHT");
    assert.equal(ps.status, "UNKNOWN");
    assert.ok(ps.proven_facts.some((f) => f.includes("Sitemap artifact inventory contract")));
    assert.ok(ps.unknown_facts.some((f) => f.includes("Per-page CTA availability")));
    assert.ok(ps.unknown_facts.some((f) => f.includes("Buy-gate")));
    assert.ok(ps.unknown_facts.some((f) => f.includes("Quarantine")));
    assert.ok(ps.unknown_facts.some((f) => f.toLowerCase().includes("demand")));
  });

  it("treats numeric page_state without inventory contract as DIM with UNKNOWN semantic status", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: {
        computable: true,
        distribution: { READY: 12, NEEDS_WORK: 3 },
        reason: "legacy snapshot shape without contract",
      },
      gscPresence: null,
    });
    const ps = neurons.neurons.find((n) => n.neuron_key === "page_state_distribution");
    assert.ok(ps);
    assert.equal(ps.connection_level, "DIM");
    assert.equal(ps.status, "UNKNOWN");
  });
});

describe("owner quarantined fridge summary", () => {
  it("includes lg-lrfxs3106s in owner quarantine summary with required contract fields", async () => {
    const summary = await buildOwnerQuarantinedFridgeModelsSummary({
      resolveModelStats: async (slug) => {
        if (slug === "lg-lrfxs3106s") {
          return { mapped_filter_count: 2, safe_cta_count: 2 };
        }
        return null;
      },
    });
    assert.ok(summary.some((r) => r.fridge_model_slug === "lg-lrfxs3106s"));
    const row = summary.find((r) => r.fridge_model_slug === "lg-lrfxs3106s");
    assert.ok(row);
    assert.equal(row.reason, "FILTER_MAPPING_CONFLICT");
    assert.equal(row.public_status, "owner_review_required");
    assert.equal(row.internal_evidence_doc, "docs/fridge-model-filter-mapping-discrepancies.md");
    assert.equal(row.owner_action_required, true);
    assert.ok(
      row.mapped_filter_count === 2 || row.mapped_filter_count === "UNKNOWN",
      "mapped_filter_count must be populated or UNKNOWN",
    );
    assert.ok(
      row.safe_cta_count === 2 || row.safe_cta_count === "UNKNOWN",
      "safe_cta_count must be populated or UNKNOWN",
    );
  });

  it("does not include non-quarantined model slugs", async () => {
    const summary = await buildOwnerQuarantinedFridgeModelsSummary({
      resolveModelStats: async () => ({ mapped_filter_count: 0, safe_cta_count: 0 }),
    });
    assert.equal(summary.some((r) => r.fridge_model_slug === "lg-lfxs26973s"), false);
  });

  it("owner report object includes quarantined fridge lane and read-only flag", () => {
    const report = attachOwnerQuarantinedFridgeModelsReport(
      { report_name: "test" },
      [
        {
          fridge_model_slug: "lg-lrfxs3106s",
          reason: "FILTER_MAPPING_CONFLICT",
          public_status: "owner_review_required",
          internal_evidence_doc: "docs/fridge-model-filter-mapping-discrepancies.md",
          mapped_filter_count: "UNKNOWN",
          safe_cta_count: "UNKNOWN",
          owner_action_required: true,
        },
      ],
    );
    assert.ok("owner_quarantined_fridge_models" in report);
    assert.equal(report.owner_quarantined_fridge_models.data_mutation, false);
    assert.ok(report.owner_quarantined_fridge_models.models.length >= 1);
  });

  it("attach chain can add vertical launch policy lane with data_mutation false", () => {
    const policy = buildOwnerVerticalLaunchPolicyReport();
    const report = attachOwnerVerticalLaunchPolicyReport(
      attachOwnerQuarantinedFridgeModelsReport({ report_name: "x" }, []),
      policy,
    );
    assert.ok("owner_vertical_launch_policy" in report);
    assert.equal(report.owner_vertical_launch_policy.data_mutation, false);
    assert.ok(report.owner_vertical_launch_policy.rows.some((r) => r.vertical_slug === "refrigerator"));
  });

  it("builds command-center neurons with proven trust emitters and unknown ingest", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: {
        computable: true,
        distribution: { READY: 12, NEEDS_WORK: 3 },
        reason: "Computed from command-surface sitemap pass.",
      },
      gscPresence: {
        sitemap_xml: true,
        coverage_zip: false,
        performance_zip: false,
      },
    });
    assert.equal(neurons.data_mutation, false);
    assert.equal(neurons.neurons.length, 3);
    const trust = neurons.neurons.find((n) => n.neuron_key === "trust_funnel_measurement");
    assert.ok(trust);
    assert.equal(trust.status, "PROVEN");
    assert.equal(trust.connection_level, "DIM");
    assert.equal(
      trust.unknown_facts.some((f) => f.includes("Missing trust-funnel emitter files")),
      false,
      "trust funnel neuron should not report missing emitters when files exist",
    );
    assert.ok(
      trust.unknown_facts.some((f) => f.includes("Dashboard aggregate ingest")),
      "trust funnel neuron must not claim dashboard ingest is connected",
    );
  });

  it("trust-funnel emitter contract no longer depends on per-emitter runtime existsSync checks", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/owner-dashboard/load-command-center-report.ts"),
      "utf8",
    );
    assert.equal(
      src.includes("TRUST_FUNNEL_EMITTER_MODULES.some("),
      false,
      "trust-funnel production-safe emitter contract should avoid per-emitter runtime filesystem discovery",
    );
  });

  it("trust-funnel neuron prefers durable aggregate artifact when provided", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      trustFunnelAggregateArtifact: {
        source: "SUPABASE",
        artifact: {
          status: "OK",
          fetched_at: "2026-05-08T20:00:00.000Z",
          property_id: "123456",
          date_range: { start_date: "2026-04-01", end_date: "2026-04-30" },
          event_totals: {
            fridge_model_view: 10,
            fridge_filter_chip_click: 5,
            fridge_filter_detail_click_from_model: 3,
            fridge_filter_view: 4,
            fridge_help_opened: 1,
          },
          rates: {
            chip_clicks_per_model_view: 0.5,
            filter_views_per_chip_click: 0.8,
            help_opens_per_filter_view: 0.25,
          },
          dimension_breakdowns: {
            top_model_slugs: "UNKNOWN",
            top_filter_slugs: "UNKNOWN",
            quarantined_vs_normal: "UNKNOWN",
          },
          proven_facts: ["durable artifact"],
          unknown_facts: [],
          provenance: {
            source: "google_analytics_data_api",
            scope: "https://www.googleapis.com/auth/analytics.readonly",
            writer: "scripts/fetch-buckparts-ga4-trust-funnel-artifact.ts",
          },
        },
      },
    });
    const trust = neurons.neurons.find((n) => n.neuron_key === "trust_funnel_measurement");
    assert.ok(trust);
    assert.equal(trust.connection_level, "BRIGHT");
    assert.equal(trust.trust_funnel_aggregate?.artifact_source, "SUPABASE");
    assert.equal(trust.trust_funnel_aggregate?.status, "OK");
    assert.equal(trust.trust_funnel_aggregate?.event_totals === "UNKNOWN", false);
  });

  it("trust-funnel emitter-contract fallback remains when durable aggregate missing", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    const trust = neurons.neurons.find((n) => n.neuron_key === "trust_funnel_measurement");
    assert.ok(trust);
    assert.equal(trust.connection_level, "DIM");
    assert.equal(trust.trust_funnel_aggregate?.artifact_source, "EMITTER_CONTRACT_ONLY");
    assert.equal(trust.trust_funnel_aggregate?.event_totals, "UNKNOWN");
  });

  it("owner-dashboard trust-funnel lane still has no live GA4 API call in request path", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/owner-dashboard/load-command-center-report.ts"),
      "utf8",
    );
    assert.equal(src.includes("analyticsdata.googleapis.com"), false);
  });

  it("simulated missing-contract case still reports missing emitters honestly", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      trustFunnelEmitterContractOverride: {
        all_emitters_present: false,
        missing_emitter_files: [
          "src/lib/analytics/fridge-trust-funnel.ts",
          "src/components/analytics/FridgeTrustFunnelViewTracker.tsx",
        ],
      },
    });
    const trust = neurons.neurons.find((n) => n.neuron_key === "trust_funnel_measurement");
    assert.ok(trust);
    assert.equal(trust.status, "UNKNOWN");
    assert.equal(trust.connection_level, "DARK");
    assert.ok(
      trust.unknown_facts.some((f) =>
        f.includes(
          "Missing trust-funnel emitter files: src/lib/analytics/fridge-trust-funnel.ts, src/components/analytics/FridgeTrustFunnelViewTracker.tsx",
        ),
      ),
      "simulated contract failure should still surface explicit missing file list",
    );
    assert.ok(
      trust.unknown_facts.some((f) => f.includes("Dashboard aggregate ingest")),
      "aggregate ingest must remain UNKNOWN/not connected",
    );
  });

  it("attach chain can add command-center neurons lane with data_mutation false", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    const report = attachOwnerCommandCenterNeuronsReport({ report_name: "x" }, neurons);
    assert.ok("owner_command_center_neurons" in report);
    assert.equal(report.owner_command_center_neurons.data_mutation, false);
    assert.equal(report.owner_command_center_neurons.neurons.length, 3);
  });

  it("gsc_search_discovery reconciles BRIGHT/PROVEN when owner_gsc_external_demand is BRIGHT with numeric totals", () => {
    const bright: OwnerGscExternalDemandNeuron = {
      neuron_key: "gsc_external_demand",
      connection_level: "BRIGHT",
      source_class: "ARTIFACT",
      artifact_source: "SUPABASE",
      fetched_at: "2026-05-08T20:00:00.000Z",
      status: "OK",
      freshness_method: "Reads durable Supabase artifact.",
      export_file_used: "supabase.owner_report_artifacts[gsc_search_analytics]",
      export_date: "2026-05-06",
      total_impressions: 1000,
      total_clicks: 40,
      average_ctr: 0.04,
      average_position: 12,
      top_queries_by_impressions: [],
      top_queries_by_clicks: [],
      top_pages_by_impressions: [],
      top_pages_by_clicks: [],
      high_impression_low_click_opportunities: [],
      proven_facts: ["GSC artifact row OK."],
      unknown_facts: [],
      next_owner_action: "Keep refreshing artifact.",
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      gscExternalDemand: bright,
    });
    const gsc = neurons.neurons.find((n) => n.neuron_key === "gsc_search_discovery");
    assert.ok(gsc);
    assert.equal(gsc.connection_level, "BRIGHT");
    assert.equal(gsc.status, "PROVEN");
    assert.ok(gsc.proven_facts.some((f) => f.includes("owner_gsc_external_demand")));
    assert.equal(gsc.unknown_facts.some((f) => f.includes(STALE_GSC_AGGREGATES_PHRASE_SNIPPET)), false);
    assert.equal(gsc.next_owner_action, "Keep refreshing artifact.");
    assert.ok(neurons.generated_from.some((s) => s.includes("gsc-external-demand.ts")));
  });

  it("gsc_search_discovery keeps legacy stale aggregates note when gscExternalDemand is omitted", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: { sitemap_xml: true, coverage_zip: false, performance_zip: false },
    });
    const gsc = neurons.neurons.find((n) => n.neuron_key === "gsc_search_discovery");
    assert.ok(gsc);
    assert.ok(gsc.unknown_facts.some((f) => f.includes(STALE_GSC_AGGREGATES_PHRASE_SNIPPET)));
    assert.equal(gsc.connection_level, "DIM");
  });

  it("gsc_search_discovery stays DIM without stale aggregates phrase when external demand is DIM without totals", () => {
    const dim: OwnerGscExternalDemandNeuron = {
      neuron_key: "gsc_external_demand",
      connection_level: "DIM",
      source_class: "MANUAL",
      artifact_source: "MANUAL_EXPORT",
      fetched_at: "2026-05-08T12:00:00.000Z",
      status: "UNKNOWN",
      freshness_method: "Performance export parsed but rows lack complete clicks/impressions values.",
      export_file_used: "data/gsc/x.csv",
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
      proven_facts: ["Parsed 3 rows from performance export."],
      unknown_facts: ["No rows contain both clicks and impressions values."],
      next_owner_action:
        "Regenerate export with complete numeric clicks/impressions columns and re-run owner dashboard.",
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      gscExternalDemand: dim,
    });
    const gsc = neurons.neurons.find((n) => n.neuron_key === "gsc_search_discovery");
    assert.ok(gsc);
    assert.equal(gsc.connection_level, "DIM");
    assert.equal(gsc.status, "UNKNOWN");
    assert.equal(gsc.unknown_facts.some((f) => f.includes(STALE_GSC_AGGREGATES_PHRASE_SNIPPET)), false);
    assert.ok(gsc.next_owner_action.includes("Regenerate export"));
  });
});

describe("batch_production_owner_decisions neuron", () => {
  it("appears in owner_command_center_neurons when v2 batch lane is passed", () => {
    const lane = buildBatchProductionOwnerDecisionsLaneV1({ rootDir: process.cwd() });
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      batchProductionOwnerDecisionsLane: lane,
    });
    assert.equal(neurons.neurons.length, 4);
    const batch = neurons.neurons.find((n) => n.neuron_key === "batch_production_owner_decisions");
    assert.ok(batch);
    assert.equal(
      mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel(lane),
      "BRIGHT",
    );
    assert.equal(batch.connection_level, "BRIGHT");
    assert.equal(batch.status, "PROVEN");
    assert.ok(
      batch.proven_facts.some((f) => f.includes("approved_for_planning_count: 3")),
    );
    assert.ok(batch.proven_facts.some((f) => f.includes("may_mutate: false")));
    assert.ok(batch.proven_facts.some((f) => f.includes("batch_size_20_status: BLOCKED")));
    assert.ok(batch.proven_facts.some((f) => f.includes("row_id=da97-08006b")));
    assert.ok(
      neurons.generated_from.some((s) =>
        s.includes("batch_production_owner_decisions_lane_v1"),
      ),
    );
  });

  it("maps missing lane to DARK when batchProductionOwnerDecisionsLane is null", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      batchProductionOwnerDecisionsLane: null,
    });
    assert.equal(neurons.neurons.length, 4);
    const batch = neurons.neurons.find((n) => n.neuron_key === "batch_production_owner_decisions");
    assert.ok(batch);
    assert.equal(batch.connection_level, "DARK");
    assert.ok(
      batch.unknown_facts.some((f) => f.includes("batch_production_owner_decisions_lane_v1 is missing")),
    );
  });

  it("omits batch neuron when batch lane arg is omitted (legacy three-neuron tests)", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    assert.equal(neurons.neurons.length, 3);
    assert.equal(
      neurons.neurons.find((n) => n.neuron_key === "batch_production_owner_decisions"),
      undefined,
    );
  });
});

describe("search_demand_and_gaps neuron", () => {
  const brightSearchReport = {
    search_and_click_intelligence_summary: {
      runtime_status: "OK",
      window_days: { short: 7, long: 30 },
      search_events: {
        last_7d: 7,
        last_30d: 70,
        zero_result_last_7d: 3,
        zero_result_last_30d: 25,
        zero_result_rate_last_7d: 0.4,
        zero_result_rate_last_30d: 0.35,
      },
      search_gaps_backlog: {
        open: 1,
        reviewing: 0,
        queued: 0,
        total_actionable: 2,
      },
      click_events: { last_7d: 4, last_30d: 12 },
      known_unknowns: [],
    },
  } as never;

  it("appears in owner_command_center_neurons when existing search report is passed", () => {
    const search = buildOwnerSearchDemandAndGapsReport({ report: brightSearchReport }).search_demand_and_gaps;
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      searchDemandAndGaps: search,
    });
    assert.equal(neurons.data_mutation, false);
    assert.equal(neurons.neurons.length, 4);
    const demand = neurons.neurons.find((n) => n.neuron_key === "search_demand_and_gaps");
    assert.ok(demand);
    assert.equal(mapSearchDemandAndGapsToNeuronConnectionLevel(search), "BRIGHT");
    assert.equal(demand.connection_level, "BRIGHT");
    assert.equal(demand.status, "PROVEN");
    assert.ok(demand.proven_facts.some((f) => f.includes("data_mutation: false")));
    assert.ok(demand.proven_facts.some((f) => f.includes("runtime_status: OK")));
    assert.ok(demand.proven_facts.some((f) => f.includes("actionable_search_gaps: 2")));
    assert.ok(demand.proven_facts.some((f) => f.includes("source_class: LIVE")));
    assert.ok(
      neurons.generated_from.some((s) => s.includes("buildOwnerSearchDemandAndGapsReport")),
    );
  });

  it("connection_level is DARK when search runtime is UNKNOWN_DB_UNAVAILABLE", () => {
    const search = buildOwnerSearchDemandAndGapsReport({
      report: {
        search_and_click_intelligence_summary: {
          runtime_status: "UNKNOWN_DB_UNAVAILABLE",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: "UNKNOWN",
            last_30d: "UNKNOWN",
            zero_result_last_7d: "UNKNOWN",
            zero_result_last_30d: "UNKNOWN",
            zero_result_rate_last_7d: "UNKNOWN",
            zero_result_rate_last_30d: "UNKNOWN",
          },
          search_gaps_backlog: {
            open: "UNKNOWN",
            reviewing: "UNKNOWN",
            queued: "UNKNOWN",
            total_actionable: "UNKNOWN",
          },
          click_events: { last_7d: "UNKNOWN", last_30d: "UNKNOWN" },
          known_unknowns: [],
        },
      } as never,
    }).search_demand_and_gaps;
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      searchDemandAndGaps: search,
    });
    const demand = neurons.neurons.find((n) => n.neuron_key === "search_demand_and_gaps");
    assert.ok(demand);
    assert.equal(search.connection_level, "DARK");
    assert.equal(demand.connection_level, "DARK");
    assert.ok(
      demand.unknown_facts.some((f) => f.includes("UNKNOWN_DB_UNAVAILABLE") || f.includes("not fully usable")),
    );
  });

  it("maps missing search report to DARK when searchDemandAndGaps is null", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      searchDemandAndGaps: null,
    });
    assert.equal(neurons.neurons.length, 4);
    const demand = neurons.neurons.find((n) => n.neuron_key === "search_demand_and_gaps");
    assert.ok(demand);
    assert.equal(demand.connection_level, "DARK");
    assert.ok(demand.unknown_facts.some((f) => f.includes("missing")));
  });

  it("omits search neuron when searchDemandAndGaps arg is omitted", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    assert.equal(
      neurons.neurons.find((n) => n.neuron_key === "search_demand_and_gaps"),
      undefined,
    );
  });

  it("includes both search and batch neurons when both optional args are passed", () => {
    const search = buildOwnerSearchDemandAndGapsReport({ report: brightSearchReport }).search_demand_and_gaps;
    const lane = buildBatchProductionOwnerDecisionsLaneV1({ rootDir: process.cwd() });
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      searchDemandAndGaps: search,
      batchProductionOwnerDecisionsLane: lane,
    });
    assert.equal(neurons.neurons.length, 5);
    assert.ok(neurons.neurons.some((n) => n.neuron_key === "search_demand_and_gaps"));
    assert.ok(neurons.neurons.some((n) => n.neuron_key === "batch_production_owner_decisions"));
  });
});

describe("owner integrity sentinel", () => {
  it("fallback_active true triggers CAUTION_INCOMPLETE_INPUTS", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "UNKNOWN_DB_UNAVAILABLE" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "UNKNOWN" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "ATTENTION",
            click_visibility: {
              runtime_status: "UNKNOWN_DB_UNAVAILABLE",
              click_freshness_status: "UNKNOWN",
              click_freshness_reason: "UNKNOWN",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const commandSurfaceProvider = sentinel.providers.find((p) => p.provider_key === "command_surface_summary");
    assert.ok(commandSurfaceProvider);
    assert.equal(commandSurfaceProvider.fallback_active, true);
    assert.equal(commandSurfaceProvider.action_safety, "CAUTION_INCOMPLETE_INPUTS");
  });

  it("evidence_rollup_token_controls unknown_facts include catalog and brand honesty when evidence_inventory is present", () => {
    const evidence_inventory = {
      contract: "evidence_inventory_v1" as const,
      proven_facts: ["inv-root"],
      unknown_facts: ["inv-root-unknown"],
      data_evidence: {
        directory_relative_path: "data/evidence" as const,
        total_json_files: 1,
        filename_outcome_buckets: {
          live_outcome_by_filename_substring: 1,
          unknown_outcome_by_filename_substring: 0,
          fail_hold_outcome_by_filename_substring: 0,
          other_json_not_matching_filename_patterns: 0,
        },
        recent_filenames: ["x.json"],
        recent_ordering: "lexicographic_by_filename" as const,
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
        inventory_contract: "refrigerator_manual_evidence_files_v1" as const,
        directory_relative_path: "data/manual-evidence/refrigerator" as const,
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
      fridge_form_factor_evidence: {
        inventory_contract: "fridge_form_factor_evidence_files_v1" as const,
        directory_relative_path: "data/fridge-form-factor-evidence" as const,
        valid_record_count: 0,
        invalid_or_unreadable_count: 0,
        validated_model_slugs: [],
        proven_facts: [],
        unknown_facts: [],
      },
    };
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "Fresh",
            },
          },
          recent_evidence: {
            evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 },
            evidence_inventory: evidence_inventory,
          },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const evidence = sentinel.providers.find((p) => p.provider_key === "evidence_rollup_token_controls");
    assert.ok(evidence);
    assert.ok(evidence.proven_facts.some((f) => f.includes("evidence_inventory_v1")));
    assert.ok(evidence.unknown_facts.some((f) => f.includes("No catalog-wide")));
    assert.ok(evidence.unknown_facts.some((f) => f.includes("Brand coverage remains UNKNOWN")));
    assert.ok(evidence.unknown_facts.some((f) => f.includes("lexicographic")));
  });

  it("artifact/manual source without freshness triggers CAUTION_INCOMPLETE_INPUTS", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "Fresh",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const affiliate = sentinel.providers.find((p) => p.provider_key === "affiliate_tracker");
    const evidence = sentinel.providers.find((p) => p.provider_key === "evidence_rollup_token_controls");
    assert.ok(affiliate);
    assert.ok(evidence);
    assert.equal(affiliate.source_class, "MANUAL");
    assert.equal(affiliate.freshness_signal_present, false);
    assert.equal(affiliate.action_safety, "CAUTION_INCOMPLETE_INPUTS");
    assert.equal(evidence.source_class, "ARTIFACT");
    assert.equal(evidence.freshness_signal_present, false);
    assert.equal(evidence.action_safety, "CAUTION_INCOMPLETE_INPUTS");
  });

  it("unknown/fallback not surfaced triggers unknown_honesty FAIL", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "Fresh",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
      providerOverrides: {
        command_surface_summary: {
          fallback_active: true,
          unknown_facts: [],
          has_unknown_condition: true,
        },
      },
    });
    const provider = sentinel.providers.find((p) => p.provider_key === "command_surface_summary");
    assert.ok(provider);
    assert.equal(provider.unknown_honesty, "FAIL");
  });

  it("click snapshot with freshness reason is classified more safely than artifact/manual providers", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "At least one event in 7d.",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const click = sentinel.providers.find((p) => p.provider_key === "click_visibility_snapshot");
    const artifact = sentinel.providers.find((p) => p.provider_key === "evidence_rollup_token_controls");
    assert.ok(click);
    assert.ok(artifact);
    assert.equal(click.action_safety, "SAFE_TO_RECOMMEND");
    assert.equal(artifact.action_safety, "CAUTION_INCOMPLETE_INPUTS");
  });

  it("simulated all-green provider set can produce SAFE_TO_RECOMMEND", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "At least one event in 7d.",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
      providerOverrides: {
        affiliate_tracker: { source_class: "LIVE", freshness_signal_present: true, fallback_active: false },
        evidence_rollup_token_controls: {
          source_class: "LIVE",
          freshness_signal_present: true,
          fallback_active: false,
        },
      },
    });
    assert.equal(sentinel.overall_status, "PASS");
    assert.equal(sentinel.action_confidence, "SAFE_TO_RECOMMEND");
  });

  it("rendered owner-dashboard output includes Integrity Sentinel and sentinel contract includes all five provider names", () => {
    const src = readFileSync(join(process.cwd(), "src/app/ownerdashboard/[secret]/page.tsx"), "utf8");
    assert.ok(src.includes("Top-of-Game Foundation"));
    assert.ok(src.includes("top_of_game_foundation_scorecard_v1"));
    assert.ok(src.includes("TopOfGameFoundationSection"));
    assert.ok(src.includes("14 · Integrity Sentinel"));
    assert.ok(src.includes('label="overall_status"'));
    assert.ok(src.includes('label="action_confidence"'));
    assert.ok(src.includes('label="owner_note"'));
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "Fresh",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const keys = sentinel.providers.map((p) => p.provider_key);
    assert.deepEqual(keys, [
      "command_surface_summary",
      "affiliate_tracker",
      "amazon_first_queue",
      "click_visibility_snapshot",
      "evidence_rollup_token_controls",
    ]);
  });

  it("attach chain can add integrity sentinel lane with data_mutation false", () => {
    const sentinel = buildOwnerIntegritySentinelReport({
      report: {
        generated_at: "2026-01-01T00:00:00.000Z",
        system_health_summary: { status: "OK", reasons: [], recommended_next_step: "x" },
        search_and_click_intelligence_summary: { runtime_status: "OK" },
        money_funnel_summary: { runtime_status: "OK" },
        rescue_velocity_summary: { runtime_status: "OK" },
        rescue_delta_trend_summary: { runtime_status: "OK" },
        affiliate_readiness_summary: { approved_count: 1, pending_count: 0, repairclinic_status: "DRAFTING" },
        amazon_first_blocked_queue_summary: {
          runtime_status: "OK",
          source_report: "x",
          top_candidate_count: 1,
        },
        command_center_v2: {
          revenue_snapshot: {
            status: "OK",
            click_visibility: {
              runtime_status: "OK",
              click_freshness_status: "OK",
              click_freshness_reason: "Fresh",
            },
          },
          recent_evidence: { evidence_rollup: { live_outcome_count: 0, unknown_outcome_count: 0 } },
          amazon_rescue: { registry_path: "x", registry_load_error: null },
        },
      } as never,
      commandSurface: {
        generated_at: "2026-01-01T00:00:00.000Z",
        known_unknowns: [],
      } as never,
    });
    const report = attachOwnerIntegritySentinelReport({ report_name: "x" }, sentinel);
    assert.ok("owner_integrity_sentinel" in report);
    assert.equal(report.owner_integrity_sentinel.data_mutation, false);
    assert.equal(report.owner_integrity_sentinel.providers.length, 5);
  });

  it("search demand runtime_status non-OK yields dark/unknown-safe action", () => {
    const lane = buildOwnerSearchDemandAndGapsReport({
      report: {
        search_and_click_intelligence_summary: {
          runtime_status: "UNKNOWN_DB_UNAVAILABLE",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: "UNKNOWN",
            last_30d: "UNKNOWN",
            zero_result_last_7d: "UNKNOWN",
            zero_result_last_30d: "UNKNOWN",
            zero_result_rate_last_7d: "UNKNOWN",
            zero_result_rate_last_30d: "UNKNOWN",
          },
          search_gaps_backlog: {
            open: "UNKNOWN",
            reviewing: "UNKNOWN",
            queued: "UNKNOWN",
            total_actionable: "UNKNOWN",
          },
          click_events: { last_7d: "UNKNOWN", last_30d: "UNKNOWN" },
          known_unknowns: [],
        },
      } as never,
    }).search_demand_and_gaps;
    assert.equal(lane.runtime_status, "UNKNOWN_DB_UNAVAILABLE");
    assert.equal(lane.connection_level, "DARK");
    assert.ok(lane.next_owner_action.includes("Restore command-surface search runtime availability"));
  });

  it("search demand missing metrics appear in unknown_facts", () => {
    const lane = buildOwnerSearchDemandAndGapsReport({
      report: {
        search_and_click_intelligence_summary: {
          runtime_status: "OK",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: 10,
            last_30d: "UNKNOWN",
            zero_result_last_7d: 1,
            zero_result_last_30d: "UNKNOWN",
            zero_result_rate_last_7d: 0.1,
            zero_result_rate_last_30d: "UNKNOWN",
          },
          search_gaps_backlog: {
            open: 1,
            reviewing: 0,
            queued: 0,
            total_actionable: "UNKNOWN",
          },
          click_events: { last_7d: 4, last_30d: 12 },
          known_unknowns: [],
        },
      } as never,
    }).search_demand_and_gaps;
    assert.ok(lane.unknown_facts.some((f) => f.includes("search_events_last_30d is UNKNOWN")));
    assert.ok(lane.unknown_facts.some((f) => f.includes("zero_result_last_30d is UNKNOWN")));
    assert.ok(lane.unknown_facts.some((f) => f.includes("actionable_search_gaps is UNKNOWN")));
  });

  it("search demand available metrics and actionable gap count render in report", () => {
    const lane = buildOwnerSearchDemandAndGapsReport({
      report: {
        search_and_click_intelligence_summary: {
          runtime_status: "OK",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: 7,
            last_30d: 70,
            zero_result_last_7d: 3,
            zero_result_last_30d: 25,
            zero_result_rate_last_7d: 0.4,
            zero_result_rate_last_30d: 0.35,
          },
          search_gaps_backlog: {
            open: 1,
            reviewing: 0,
            queued: 0,
            total_actionable: 1,
          },
          click_events: { last_7d: 10, last_30d: 100 },
          known_unknowns: [],
        },
      } as never,
    }).search_demand_and_gaps;
    assert.equal(lane.search_events_last_7d, 7);
    assert.equal(lane.search_events_last_30d, 70);
    assert.equal(lane.zero_result_last_7d, 3);
    assert.equal(lane.zero_result_last_30d, 25);
    assert.equal(lane.actionable_search_gaps, 1);
    assert.ok(lane.proven_facts.some((f) => f.includes("search_events_last_7d=7")));
  });

  it("owner dashboard renders search_demand_and_gaps section", () => {
    const src = readFileSync(join(process.cwd(), "src/app/ownerdashboard/[secret]/page.tsx"), "utf8");
    assert.ok(src.includes("Search Demand & gaps"));
    assert.ok(src.includes('label="neuron_key"'));
    assert.ok(src.includes('label="search_events_last_7d"'));
    assert.ok(src.includes('label="zero_result_last_30d"'));
    assert.ok(src.includes('label="actionable_search_gaps"'));
  });

  it("attach chain can add search demand and gaps lane with data_mutation false", () => {
    const lane = buildOwnerSearchDemandAndGapsReport({
      report: {
        search_and_click_intelligence_summary: {
          runtime_status: "OK",
          window_days: { short: 7, long: 30 },
          search_events: {
            last_7d: 1,
            last_30d: 2,
            zero_result_last_7d: 0,
            zero_result_last_30d: 1,
            zero_result_rate_last_7d: 0,
            zero_result_rate_last_30d: 0.5,
          },
          search_gaps_backlog: {
            open: 0,
            reviewing: 0,
            queued: 0,
            total_actionable: 0,
          },
          click_events: { last_7d: 1, last_30d: 2 },
          known_unknowns: [],
        },
      } as never,
    });
    const report = attachOwnerSearchDemandAndGapsReport({ report_name: "x" }, lane);
    assert.ok("owner_search_demand_and_gaps" in report);
    assert.equal(report.owner_search_demand_and_gaps.data_mutation, false);
    assert.equal(report.owner_search_demand_and_gaps.search_demand_and_gaps.neuron_key, "search_demand_and_gaps");
  });

  it("gsc parser handles performance CSV shape with query/page/clicks/impressions", () => {
    const parsed = parseGscPerformanceCsv(`Query,Page,Clicks,Impressions,CTR\nwater filter,/filter/adq36006101,12,1200,1.0%\n`);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].query, "water filter");
    assert.equal(parsed.rows[0].page, "/filter/adq36006101");
    assert.equal(parsed.rows[0].clicks, 12);
    assert.equal(parsed.rows[0].impressions, 1200);
  });

  it("gsc missing export yields DARK with unknown_facts", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: false, reason: "NOT_FOUND", details: [] }),
        fileExists: () => false,
        listFiles: () => [".gitkeep"],
      },
    });
    assert.equal(lane.connection_level, "DARK");
    assert.equal(lane.total_impressions, "UNKNOWN");
    assert.ok(lane.unknown_facts.some((f) => f.includes("No GSC performance export file")));
  });

  it("gsc unparseable export yields UNKNOWN with unknown_facts", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: false, reason: "NOT_FOUND", details: [] }),
        listFiles: () => ["buckparts.com-Performance-on-Search-2026-04-28.csv"],
        readTextFile: () => "not,a,supported,header\nx,y,z\n",
        getMtimeIso: () => "2026-05-08T00:00:00.000Z",
      },
    });
    assert.equal(lane.connection_level, "UNKNOWN");
    assert.equal(lane.source_class, "MANUAL");
    assert.ok(lane.unknown_facts.some((f) => f.includes("CSV headers unsupported")));
  });

  it("gsc malformed api artifact falls back to manual export parser", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: false, reason: "NOT_FOUND", details: [] }),
        fileExists: (absPath) => absPath.endsWith("data/reports/buckparts-gsc-search-analytics.json"),
        readTextFile: (absPath) => {
          if (absPath.endsWith("data/reports/buckparts-gsc-search-analytics.json")) {
            return "{bad-json";
          }
          return [
            "Query,Page,Clicks,Impressions",
            "lt1000p,/filter/lt1000p,30,1000",
            "adq36006101,/filter/adq36006101,10,900",
          ].join("\n");
        },
        listFiles: () => ["buckparts.com-Performance-on-Search-2026-04-28.csv"],
        getMtimeIso: () => "2026-05-08T00:00:00.000Z",
      },
    });
    assert.equal(lane.connection_level, "BRIGHT");
    assert.equal(lane.total_impressions, 1900);
    assert.ok(lane.unknown_facts.some((fact) => fact.includes("artifact")));
  });

  it("gsc malformed api artifact with no manual fallback returns UNKNOWN safely", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: false, reason: "NOT_FOUND", details: [] }),
        fileExists: (absPath) => absPath.endsWith("data/reports/buckparts-gsc-search-analytics.json"),
        readTextFile: () => "{bad-json",
        listFiles: () => [".gitkeep"],
      },
    });
    assert.equal(lane.connection_level, "UNKNOWN");
    assert.equal(lane.total_impressions, "UNKNOWN");
    assert.ok(lane.unknown_facts.some((fact) => fact.includes("artifact")));
  });

  it("gsc valid supabase durable artifact is preferred over local/manual sources", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({
          ok: true,
          fetchedAt: "2026-05-08T14:00:00.000Z",
          artifactText: JSON.stringify({
            status: "OK",
            fetched_at: "2026-05-08T14:00:00.000Z",
            property: "sc-domain:buckparts.com",
            date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
            total_clicks: 100,
            total_impressions: 2000,
            average_ctr: 0.05,
            average_position: 12.3,
            top_queries_by_clicks: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
            top_queries_by_impressions: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
            top_pages_by_clicks: [{ key: "/filter/mwf", clicks: 60, impressions: 700, ctr: 0.085 }],
            top_pages_by_impressions: [{ key: "/filter/mwf", clicks: 60, impressions: 700, ctr: 0.085 }],
            high_impression_low_click_opportunities: "UNKNOWN",
            proven_facts: ["artifact present"],
            unknown_facts: [],
            provenance: {
              source: "google_search_console_api",
              scope: "https://www.googleapis.com/auth/webmasters.readonly",
              writer: "scripts/fetch-buckparts-gsc-artifact.ts",
            },
          }),
        }),
        listFiles: () => ["buckparts.com-Performance-on-Search-2026-04-28.csv"],
        fileExists: () => false,
      },
    });
    assert.equal(lane.connection_level, "BRIGHT");
    assert.equal(lane.artifact_source, "SUPABASE");
    assert.equal(lane.export_file_used, "supabase.owner_report_artifacts[gsc_search_analytics]");
    assert.equal(lane.total_impressions, 2000);
    assert.equal(lane.total_clicks, 100);
  });

  it("gsc db missing falls back to local api artifact", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: false, reason: "NOT_FOUND", details: ["no row"] }),
        fileExists: (absPath) => absPath.endsWith("data/reports/buckparts-gsc-search-analytics.json"),
        readTextFile: (absPath) =>
          absPath.endsWith("data/reports/buckparts-gsc-search-analytics.json")
            ? JSON.stringify({
                status: "OK",
                fetched_at: "2026-05-08T14:00:00.000Z",
                property: "sc-domain:buckparts.com",
                date_range: { start_date: "2026-04-05", end_date: "2026-05-04" },
                total_clicks: 100,
                total_impressions: 2000,
                average_ctr: 0.05,
                average_position: 12.3,
                top_queries_by_clicks: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
                top_queries_by_impressions: [{ key: "mwf", clicks: 50, impressions: 500, ctr: 0.1 }],
                top_pages_by_clicks: [{ key: "/filter/mwf", clicks: 60, impressions: 700, ctr: 0.085 }],
                top_pages_by_impressions: [{ key: "/filter/mwf", clicks: 60, impressions: 700, ctr: 0.085 }],
                high_impression_low_click_opportunities: "UNKNOWN",
                proven_facts: ["artifact present"],
                unknown_facts: [],
                provenance: {
                  source: "google_search_console_api",
                  scope: "https://www.googleapis.com/auth/webmasters.readonly",
                  writer: "scripts/fetch-buckparts-gsc-artifact.ts",
                },
              })
            : "",
        listFiles: () => ["buckparts.com-Performance-on-Search-2026-04-28.csv"],
      },
    });
    assert.equal(lane.connection_level, "BRIGHT");
    assert.equal(lane.artifact_source, "LOCAL_ARTIFACT");
    assert.equal(lane.total_impressions, 2000);
  });

  it("gsc db malformed falls back to manual parser", async () => {
    const lane = await buildOwnerGscExternalDemandNeuron({
      rootDir: process.cwd(),
      deps: {
        readSupabaseArtifact: async () => ({ ok: true, fetchedAt: "2026-05-08T00:00:00.000Z", artifactText: "{bad-json" }),
        listFiles: () => ["buckparts.com-Performance-on-Search-2026-04-28.csv"],
        readTextFile: () =>
          [
            "Query,Page,Clicks,Impressions",
            "lt1000p,/filter/lt1000p,30,1000",
            "adq36006101,/filter/adq36006101,10,900",
          ].join("\n"),
        getMtimeIso: () => "2026-05-08T00:00:00.000Z",
      },
    });
    assert.equal(lane.connection_level, "BRIGHT");
    assert.equal(lane.artifact_source, "MANUAL_EXPORT");
    assert.equal(lane.total_impressions, 1900);
    assert.equal(lane.total_clicks, 40);
    assert.ok(lane.top_queries_by_impressions !== "UNKNOWN");
    assert.ok(lane.top_pages_by_clicks !== "UNKNOWN");
  });

  it("owner dashboard renders gsc_external_demand lane fields", () => {
    const src = readFileSync(join(process.cwd(), "src/app/ownerdashboard/[secret]/page.tsx"), "utf8");
    assert.ok(src.includes("16 · GSC external demand"));
    assert.ok(src.includes('label="total_impressions"'));
    assert.ok(src.includes('label="total_clicks"'));
    assert.ok(src.includes('label="top_queries_by_impressions"'));
    assert.ok(src.includes('label="high_impression_low_click_opportunities"'));
  });

  it("attach chain can add gsc external demand report with data_mutation false", async () => {
    const lane = await buildOwnerGscExternalDemandReport({ rootDir: process.cwd() });
    const report = attachOwnerGscExternalDemandReport({ report_name: "x" }, lane);
    assert.ok("owner_gsc_external_demand" in report);
    assert.equal(report.owner_gsc_external_demand.data_mutation, false);
    assert.equal(report.owner_gsc_external_demand.gsc_external_demand.neuron_key, "gsc_external_demand");
  });

  it("owner dashboard compression renders three executive sections and drilldown details groups", () => {
    const src = readFileSync(join(process.cwd(), "src/app/ownerdashboard/[secret]/page.tsx"), "utf8");
    assert.ok(src.includes('title="Stop-the-line"'));
    assert.ok(src.includes('title="Demand"'));
    assert.ok(src.includes('title="Throughput & monetization"'));
    assert.ok(src.includes("Operational drilldowns (collapsed by default)"));
    assert.ok(src.includes("function DrilldownGroup"));
    assert.ok(src.includes("<details"));
    assert.ok(src.includes('href="#demand-drilldown"'));
    assert.ok(src.includes("Open demand drilldown"));
    assert.ok(src.includes("Click visibility snapshot: UNKNOWN (missing)."));
    assert.ok(src.includes("no automatic stop-the-line escalation"));
    assert.ok(src.includes("Integrity action confidence:"));
    assert.ok(src.includes("System status"));
  });

  it("owner_dashboard_top_of_game_panel_proof_v1 matches this repo checkout", () => {
    const proof = evaluateOwnerDashboardTopOfGamePanelProofV1({
      rootDir: process.cwd(),
      fileExists: existsSync,
      readTextFile: (p) => readFileSync(p, "utf8"),
    });
    assert.equal(proof.all_markers_present, true);
    assert.equal(proof.runtime_status, "OK");
  });

  it("public fridge page behavior wiring remains unchanged", () => {
    const src = readFileSync(join(process.cwd(), "src/app/fridge/[slug]/page.tsx"), "utf8");
    assert.ok(src.includes("const reviewOverride = getFridgeModelReviewOverride(params.slug);"));
    assert.ok(src.includes("const manualEvidence = reviewOverride"));
    assert.ok(src.includes("mappedFilterCount={reviewOverride ? 0 : fridge.filters.length}"));
    assert.ok(src.includes("quarantineMessage={reviewOverride?.public_message ?? null}"));
  });
});
