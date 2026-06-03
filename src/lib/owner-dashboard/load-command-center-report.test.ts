import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  loadCommandCenterReportForOwner,
  mapBatchProductionOwnerDecisionsLaneToNeuronConnectionLevel,
  mapSearchDemandAndGapsToNeuronConnectionLevel,
  mapClickVisibilityToNeuronConnectionLevel,
  mapAffiliateReadinessToNeuronConnectionLevel,
  mapCoverageHealthToNeuronConnectionLevel,
  mapPageStateNeuronConnectionLevelWithPublishabilityTruth,
  type AffiliateReadinessNeuronInput,
  type CtaCoverageHealthNeuronInput,
} from "@/lib/owner-dashboard/load-command-center-report";
import type {
  ClickVisibilitySnapshot,
  PagePublishabilityTruthSummaryV1,
} from "../../../scripts/lib/buckparts-command-center-v2-types";
import type { LargeBatchCoverageFactorySummaryV1 } from "../../../scripts/lib/buckparts-large-batch-coverage-factory-summary-v1";
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
import {
  buildSemiCruiseStatusSummaryV1,
  SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1,
} from "@/lib/owner-dashboard/semi-cruise-status-summary-v1";

function stubPublishabilityTruthSummary(
  overrides: Partial<PagePublishabilityTruthSummaryV1> = {},
): PagePublishabilityTruthSummaryV1 {
  return {
    contract: "page_publishability_truth_summary_v1",
    read_only: true,
    data_mutation: false,
    runtime_status: "ATTENTION",
    page_kind: "refrigerator_filter",
    total_candidate_pages: 57,
    computable_semantic_count: 57,
    unknown_join_count: 114,
    distribution_page_state: { INDEXABLE_INFO_ONLY: 30, INDEXABLE_BUY_READY: 27 },
    distribution_publishability_state: { PUBLISHABLE_INFO_READY: 30, PUBLISHABLE_BUY_READY: 27 },
    distribution_automation_allowed: {
      read_only_only: 28,
      never_auto_mutate: 2,
      owner_approval_required: 27,
    },
    top_unknown_join_reasons: [
      "per_page_click_not_joined_v1 (57 pages)",
      "per_page_demand_not_joined_v1 (57 pages)",
    ],
    sample_rows: [],
    proven_facts: ["fixture semantic lane"],
    unknown_facts: ["Per-page demand and click signals are UNKNOWN until search_gaps/click_events are joined by page key."],
    ...overrides,
  };
}

function stubLargeBatchCoverageFactorySummaryV1(
  overrides: Partial<LargeBatchCoverageFactorySummaryV1> = {},
): LargeBatchCoverageFactorySummaryV1 {
  return {
    report_name: "buckparts_large_batch_coverage_factory_summary_v1",
    contract: "large_batch_coverage_factory_summary_v1",
    read_only: true,
    data_mutation: false,
    mutation_ready: false,
    generated_at: "2026-05-19T00:00:00.000Z",
    runtime_status: "OK",
    source_command: "npm run buckparts:large-batch-coverage-factory",
    factory_report_name: "large_batch_coverage_factory_v1",
    candidate_count: 0,
    state_counts: {
      existing_live_product: 0,
      new_product_candidate: 0,
      alias_collision_candidate: 0,
      publishable_no_buy_page: 0,
      publishable_amazon_candidate: 0,
      publishable_waterdrop_candidate: 0,
      evidence_needed: 0,
      blocked_do_not_publish: 0,
    },
    blocked_counts: "UNKNOWN",
    top_5_candidates: [],
    next_owner_action: "fixture factory lane",
    next_agent_action: "fixture factory lane",
    expansion_blocker_summary: "fixture expansion blocker",
    factory_failure_reason: null,
    proven_facts: ["fixture large batch coverage factory summary"],
    unknown_facts: [],
    ...overrides,
  };
}

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

  it("upgrades semantic status to PROVEN when page_publishability_truth_summary_v1 has computable pages", () => {
    const lane = stubPublishabilityTruthSummary();
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
      pagePublishabilityTruth: lane,
    });
    const ps = neurons.neurons.find((n) => n.neuron_key === "page_state_distribution");
    assert.ok(ps);
    assert.equal(ps.connection_level, "DIM");
    assert.equal(ps.status, "PROVEN");
    assert.ok(ps.proven_facts.some((f) => f.includes("page_publishability_truth_summary_v1")));
    assert.ok(ps.proven_facts.some((f) => f.includes("Semantic PageState/PublishabilityState is computable")));
    assert.ok(
      !ps.unknown_facts.some((f) =>
        f.includes("Semantic PageState/PublishabilityState") && f.includes("is UNKNOWN in this neuron"),
      ),
    );
    assert.ok(ps.unknown_facts.some((f) => f.includes("unknown_join_count=114")));
    assert.ok(ps.unknown_facts.some((f) => f.includes("demand_signal and click_signal remain UNKNOWN")));
    assert.ok(ps.unknown_facts.some((f) => f.includes("Automation remains constrained")));
    assert.ok(
      !Object.keys(lane.distribution_automation_allowed).includes("auto_fix_allowed"),
    );
    assert.equal(
      mapPageStateNeuronConnectionLevelWithPublishabilityTruth({
        inventoryConnectionLevel: "BRIGHT",
        publishabilityTruth: lane,
      }),
      "DIM",
    );
  });

  it("omits stale per-page join UNKNOWN copy when unknown_join_count is 0", () => {
    const lane = stubPublishabilityTruthSummary({
      runtime_status: "OK",
      unknown_join_count: 0,
      top_unknown_join_reasons: [],
      unknown_facts: [
        "CTA join uses read-only retailer_links.filter_id grouped to filters.slug.",
        "Per-page click_signal is joined from the same click_events 30d fetch as revenue_snapshot.click_visibility.",
        "Per-page demand_signal is joined via exact OEM/alias match on actionable search_gaps only.",
      ],
    });
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
      pagePublishabilityTruth: lane,
    });
    const ps = neurons.neurons.find((n) => n.neuron_key === "page_state_distribution");
    assert.ok(ps);
    assert.equal(ps.status, "PROVEN");
    assert.equal(ps.connection_level, "BRIGHT");
    assert.ok(
      !ps.unknown_facts.some((f) => f.includes("demand_signal and click_signal remain UNKNOWN")),
    );
    assert.ok(
      ps.proven_facts.some((f) =>
        f.includes("Per-page click_signal is joined in page_publishability_truth_summary_v1"),
      ),
    );
    assert.ok(
      ps.proven_facts.some((f) =>
        f.includes("Per-page demand_signal is joined in page_publishability_truth_summary_v1"),
      ),
    );
    assert.ok(ps.unknown_facts.some((f) => f.includes("Automation remains constrained")));
    assert.ok(
      ps.unknown_facts.some((f) => f.includes("not proof of live Google indexing")),
    );
    assert.equal(
      mapPageStateNeuronConnectionLevelWithPublishabilityTruth({
        inventoryConnectionLevel: "BRIGHT",
        publishabilityTruth: lane,
      }),
      "BRIGHT",
    );
  });

  it("preserves UNKNOWN semantic status when publishability lane is absent", () => {
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
      pagePublishabilityTruth: null,
    });
    const ps = neurons.neurons.find((n) => n.neuron_key === "page_state_distribution");
    assert.ok(ps);
    assert.equal(ps.connection_level, "BRIGHT");
    assert.equal(ps.status, "UNKNOWN");
    assert.ok(
      ps.unknown_facts.some(
        (f) => f.includes("Semantic PageState/PublishabilityState") && f.includes("is UNKNOWN in this neuron"),
      ),
    );
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

describe("click_visibility neuron", () => {
  const emptyWedge = {
    refrigerator_water: 0,
    air_purifier: 0,
    whole_house_water: 0,
    vacuum: 0,
    humidifier: 0,
    appliance_air: 0,
    other_or_legacy: 0,
  } as const;

  const okClick: ClickVisibilitySnapshot = {
    runtime_status: "OK",
    generated_at: "2026-01-01T00:00:00.000Z",
    window_days: { short: 7, long: 30 },
    last_7_days_clicks: 2,
    last_30_days_clicks: 10,
    raw_last_7_days_clicks: 2,
    raw_last_30_days_clicks: 10,
    human_likely_last_7_days_clicks: 1,
    human_likely_last_30_days_clicks: 3,
    excluded_last_30_days_clicks: 7,
    excluded_by_category_30d: { KNOWN_BOT: 2 },
    newest_click_at: "2026-01-01T00:00:00.000Z",
    oldest_click_at_in_30d_window: "2025-12-01T00:00:00.000Z",
    click_freshness_status: "OK",
    click_freshness_reason: "Newest click within freshness window.",
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes: "No affiliate revenue feed connected in-repo.",
    clicks_by_wedge_30d: { ...emptyWedge },
  };

  it("appears in owner_command_center_neurons when Command Center click_visibility is passed", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      clickVisibility: okClick,
    });
    assert.equal(neurons.data_mutation, false);
    assert.equal(neurons.neurons.length, 4);
    const click = neurons.neurons.find((n) => n.neuron_key === "click_visibility");
    assert.ok(click);
    assert.equal(mapClickVisibilityToNeuronConnectionLevel(okClick), "BRIGHT");
    assert.equal(click.connection_level, "BRIGHT");
    assert.equal(click.status, "PROVEN");
    assert.ok(click.proven_facts.some((f) => f.includes("not revenue")));
    assert.ok(click.proven_facts.some((f) => f.includes("commission_or_revenue: NOT_CONNECTED")));
    assert.ok(click.proven_facts.some((f) => f.includes("human_likely_last_30_days_clicks: 3")));
    assert.ok(click.proven_facts.some((f) => f.includes("newest_click_at:")));
    assert.ok(
      neurons.generated_from.some((s) => s.includes("revenue_snapshot.click_visibility")),
    );
  });

  it("maps UNKNOWN_DB_UNAVAILABLE to DARK", () => {
    const unavailable: ClickVisibilitySnapshot = {
      ...okClick,
      runtime_status: "UNKNOWN_DB_UNAVAILABLE",
      click_freshness_status: "UNKNOWN",
      click_freshness_reason: "Missing SUPABASE_SERVICE_ROLE_KEY",
      last_30_days_clicks: "UNKNOWN",
      human_likely_last_30_days_clicks: "UNKNOWN",
      newest_click_at: "UNKNOWN",
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      clickVisibility: unavailable,
    });
    const click = neurons.neurons.find((n) => n.neuron_key === "click_visibility");
    assert.ok(click);
    assert.equal(click.connection_level, "DARK");
    assert.ok(
      click.unknown_facts.some((f) => f.includes("UNKNOWN_DB_UNAVAILABLE") || f.includes("not fully usable")),
    );
  });

  it("maps OK runtime with STALE freshness to DIM", () => {
    const stale: ClickVisibilitySnapshot = {
      ...okClick,
      click_freshness_status: "STALE",
      click_freshness_reason: "Newest click older than freshness threshold.",
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      clickVisibility: stale,
    });
    const click = neurons.neurons.find((n) => n.neuron_key === "click_visibility");
    assert.ok(click);
    assert.equal(mapClickVisibilityToNeuronConnectionLevel(stale), "DIM");
    assert.equal(click.connection_level, "DIM");
    assert.ok(click.unknown_facts.some((f) => f.includes("STALE")));
  });

  it("maps missing click_visibility to DARK when clickVisibility is null", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      clickVisibility: null,
    });
    const click = neurons.neurons.find((n) => n.neuron_key === "click_visibility");
    assert.ok(click);
    assert.equal(click.connection_level, "DARK");
    assert.ok(click.unknown_facts.some((f) => f.includes("missing")));
  });

  it("omits click neuron when clickVisibility arg is omitted", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    assert.equal(neurons.neurons.find((n) => n.neuron_key === "click_visibility"), undefined);
  });
});

describe("affiliate_readiness neuron", () => {
  const okAffiliate: AffiliateReadinessNeuronInput = {
    lane: {
      status: "OK",
      count: 0,
      blocker: null,
      next_agent_action:
        "Refresh affiliate tracker JSON read-only; no network submissions from this script.",
      next_owner_action:
        "Submit and track affiliate program approvals in operator workflow outside this repo task.",
    },
    summary: {
      approved_count: 2,
      pending_count: 1,
      pending_network_or_programs: ["flexoffers"],
      repairclinic_status: "APPROVED",
      affiliate_approval_pending: false,
    },
    commission_or_revenue: "NOT_CONNECTED",
  };

  it("appears in owner_command_center_neurons when Command Center affiliate readiness is passed", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      affiliateReadiness: okAffiliate,
    });
    assert.equal(neurons.data_mutation, false);
    assert.equal(neurons.neurons.length, 4);
    const affiliate = neurons.neurons.find((n) => n.neuron_key === "affiliate_readiness");
    assert.ok(affiliate);
    assert.equal(mapAffiliateReadinessToNeuronConnectionLevel(okAffiliate), "BRIGHT");
    assert.equal(affiliate.connection_level, "BRIGHT");
    assert.equal(affiliate.status, "PROVEN");
    assert.ok(affiliate.proven_facts.some((f) => f.includes("not revenue")));
    assert.ok(affiliate.proven_facts.some((f) => f.includes("commission_or_revenue: NOT_CONNECTED")));
    assert.ok(affiliate.proven_facts.some((f) => f.includes("approved_count: 2")));
    assert.ok(
      neurons.generated_from.some((s) => s.includes("affiliate_readiness")),
    );
  });

  it("maps affiliate_approval_pending to DIM when programs are still pending", () => {
    const pending: AffiliateReadinessNeuronInput = {
      ...okAffiliate,
      lane: {
        ...okAffiliate.lane,
        status: "ATTENTION",
        count: 1,
        blocker: "affiliate_approval_pending",
        top_items: ["pending_non_amazon_affiliate_programs"],
      },
      summary: {
        ...okAffiliate.summary,
        approved_count: 1,
        affiliate_approval_pending: true,
        pending_count: 2,
        pending_network_or_programs: ["flexoffers", "shareasale"],
      },
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      affiliateReadiness: pending,
    });
    const affiliate = neurons.neurons.find((n) => n.neuron_key === "affiliate_readiness");
    assert.ok(affiliate);
    assert.equal(mapAffiliateReadinessToNeuronConnectionLevel(pending), "DIM");
    assert.equal(affiliate.connection_level, "DIM");
    assert.ok(affiliate.unknown_facts.some((f) => f.includes("affiliate_approval_pending")));
  });

  it("maps missing affiliate readiness to DARK when affiliateReadiness is null", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      affiliateReadiness: null,
    });
    const affiliate = neurons.neurons.find((n) => n.neuron_key === "affiliate_readiness");
    assert.ok(affiliate);
    assert.equal(affiliate.connection_level, "DARK");
    assert.ok(affiliate.unknown_facts.some((f) => f.includes("missing")));
  });

  it("omits affiliate neuron when affiliateReadiness arg is omitted", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    assert.equal(neurons.neurons.find((n) => n.neuron_key === "affiliate_readiness"), undefined);
  });
});

describe("coverage_health neuron", () => {
  const okCoverage: CtaCoverageHealthNeuronInput = {
    coverageLane: {
      status: "OK",
      count: 0,
      blocker: null,
      next_agent_action:
        "Run buckparts:command-surface read-only; investigate metrics deltas before any DB mutation.",
      next_owner_action: "Decide whether WARNING/CRITICAL items block monetization expansion for the current sprint.",
    },
    ctaCoverage: {
      source: "supabase_retailer_links",
      runtime_status: "OK",
      total_retailer_links: 100,
      direct_buyable_links: 40,
      safe_cta_links: 55,
      blocked_or_unsafe_links: 20,
      missing_browser_truth_links: 5,
      retailer_counts: { amazon: 30, repairclinic: 25 },
    },
    blockedRemediation: {
      runtime_status: "OK",
      top_blocked_states: [{ state: "dead_link", count: 8 }],
      top_blocked_retailer_keys: [{ retailer_key: "oem", count: 5 }],
      recommended_next_action: "Review blocked retailer links queue.",
    },
  };

  it("appears in owner_command_center_neurons when Command Center coverage truth is passed", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: okCoverage,
    });
    assert.equal(neurons.data_mutation, false);
    assert.equal(neurons.neurons.length, 4);
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(mapCoverageHealthToNeuronConnectionLevel(okCoverage), "BRIGHT");
    assert.equal(coverage.connection_level, "BRIGHT");
    assert.equal(coverage.status, "PROVEN");
    assert.ok(coverage.proven_facts.some((f) => f.includes("not revenue")));
    assert.ok(coverage.proven_facts.some((f) => f.includes("safe_cta_links")));
    assert.ok(coverage.proven_facts.some((f) => f.includes("buyer-path")));
    assert.ok(
      neurons.generated_from.some((s) => s.includes("cta_coverage_metrics")),
    );
  });

  it("maps UNKNOWN_DB_UNAVAILABLE cta coverage to DARK", () => {
    const unavailable: CtaCoverageHealthNeuronInput = {
      ...okCoverage,
      ctaCoverage: {
        ...okCoverage.ctaCoverage,
        runtime_status: "UNKNOWN_DB_UNAVAILABLE",
        total_retailer_links: "UNKNOWN",
        safe_cta_links: "UNKNOWN",
        direct_buyable_links: "UNKNOWN",
        blocked_or_unsafe_links: "UNKNOWN",
        missing_browser_truth_links: "UNKNOWN",
        retailer_counts: "UNKNOWN",
      },
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: unavailable,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(coverage.connection_level, "DARK");
    assert.ok(
      coverage.unknown_facts.some((f) => f.includes("UNKNOWN_DB_UNAVAILABLE") || f.includes("not fully usable")),
    );
  });

  it("maps zero safe_cta_links to DIM when runtime is OK", () => {
    const zeroCta: CtaCoverageHealthNeuronInput = {
      ...okCoverage,
      ctaCoverage: {
        ...okCoverage.ctaCoverage,
        safe_cta_links: 0,
        blocked_or_unsafe_links: 80,
      },
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: zeroCta,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(mapCoverageHealthToNeuronConnectionLevel(zeroCta), "DIM");
    assert.equal(coverage.connection_level, "DIM");
    assert.ok(coverage.unknown_facts.some((f) => f.includes("safe_cta_links is 0")));
  });

  it("maps missing coverage input to DARK when ctaCoverageHealth is null", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: null,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(coverage.connection_level, "DARK");
    assert.ok(coverage.unknown_facts.some((f) => f.includes("missing")));
  });

  it("omits coverage neuron when ctaCoverageHealth arg is omitted", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
    });
    assert.equal(neurons.neurons.find((n) => n.neuron_key === "coverage_health"), undefined);
  });

  const sampleRemediationBuckets = {
    repairable_blocked_buy_paths: { count: 8, top_retailer_keys: [{ retailer_key: "amazon", count: 4 }] },
    intentionally_non_buyable_catalog_or_discovery_links: {
      count: 120,
      top_retailer_keys: [{ retailer_key: "oem-catalog", count: 90 }],
    },
    missing_browser_truth: { count: 1, top_retailer_keys: [] },
    unsafe_browser_truth: { count: 61, top_retailer_keys: [{ retailer_key: "repairclinic", count: 20 }] },
  };

  it("includes remediation_buckets in coverage_health neuron proven_facts", () => {
    const input: CtaCoverageHealthNeuronInput = {
      ...okCoverage,
      ctaCoverage: {
        ...okCoverage.ctaCoverage,
        safe_cta_links: 66,
        blocked_or_unsafe_links: 201,
      },
      blockedRemediation: {
        ...okCoverage.blockedRemediation!,
        remediation_buckets: sampleRemediationBuckets,
      },
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: input,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.ok(
      coverage.proven_facts.some((f) =>
        f.includes("remediation_buckets.intentionally_non_buyable_catalog_or_discovery_links: 120"),
      ),
    );
    assert.ok(
      coverage.proven_facts.some((f) =>
        f.includes("cta_coverage pressure summary: safe_cta_links=66, blocked_or_unsafe_links=201"),
      ),
    );
    assert.ok(
      coverage.proven_facts.some((f) => f.includes("decision-useful blocked buy-path rows")),
    );
  });

  it("coverage_health stays DIM when blocked_or_unsafe_links exceeds safe_cta_links despite OK coverage lane", () => {
    const input: CtaCoverageHealthNeuronInput = {
      ...okCoverage,
      coverageLane: {
        ...okCoverage.coverageLane,
        status: "OK",
        blocker: null,
      },
      ctaCoverage: {
        ...okCoverage.ctaCoverage,
        safe_cta_links: 66,
        blocked_or_unsafe_links: 201,
      },
      blockedRemediation: {
        ...okCoverage.blockedRemediation!,
        remediation_buckets: sampleRemediationBuckets,
      },
    };
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: input,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(coverage.connection_level, "DIM");
    assert.equal(coverage.status, "UNKNOWN");
    assert.ok(
      coverage.unknown_facts.some((f) =>
        f.includes("system_health_summary can be OK while coverage_health remains DIM"),
      ),
    );
  });

  it("coverage_health can remain BRIGHT when safe_cta_links exceeds blocked_or_unsafe_links", () => {
    const neurons = buildOwnerCommandCenterNeuronsReport({
      rootDir: process.cwd(),
      pageState: null,
      gscPresence: null,
      ctaCoverageHealth: okCoverage,
    });
    const coverage = neurons.neurons.find((n) => n.neuron_key === "coverage_health");
    assert.ok(coverage);
    assert.equal(coverage.connection_level, "BRIGHT");
    assert.equal(coverage.status, "PROVEN");
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

  it("owner dashboard renders semi_cruise_status_summary_v1 section from command_center_v2", () => {
    const src = readFileSync(join(process.cwd(), "src/app/ownerdashboard/[secret]/page.tsx"), "utf8");
    assert.ok(src.includes("function SemiCruiseStatusSection"));
    assert.ok(src.includes("semi_cruise_status_summary_v1"));
    assert.ok(src.includes('title="Semi-Cruise + Netlify conservation (read-only v1)"'));
    assert.ok(src.includes("does not authorize deploys, git push, or mutation"));
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

  it("semi_cruise_status_summary_v1 exposes owner-dashboard display fields", () => {
    const summary = buildSemiCruiseStatusSummaryV1({
      generated_at: "2026-05-19T00:00:00.000Z",
      read_only: true,
      data_mutation: false,
      operator_can_be_away_status: "READY_FOR_AUTONOMOUS_READ_ONLY",
      system_health_status: "OK",
      execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: true },
      command_center_v2: {
        external_measurement_freshness_v1: {
          contract: "external_measurement_freshness_v1",
          read_only: true,
          data_mutation: false,
          runtime_status: "OK",
          overall_status: "OK",
          gsc: {} as never,
          ga4: {} as never,
          recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"],
          proven_facts: [],
          unknown_facts: [],
        },
        page_publishability_truth_summary_v1: stubPublishabilityTruthSummary({ unknown_join_count: 0 }),
        large_batch_coverage_factory_summary_v1: stubLargeBatchCoverageFactorySummaryV1(),
        affiliate_readiness: { status: "OK", blocker: null },
        coverage_health: { status: "OK", blocker: null },
        amazon_rescue: {
          status: "OK",
          human_browser_required_tokens: [],
          blocker: null,
          next_owner_action: "",
        } as never,
        revenue_snapshot: {
          click_visibility: { commission_or_revenue: "NOT_CONNECTED" },
        } as never,
      },
      owner_command_center_neurons: null,
      spend_ledger_entries: [],
    });
    assert.equal(summary.contract, SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1);
    assert.equal(summary.mutation_semi_cruise_status, "NOT_PROVEN");
    assert.equal(summary.read_only, true);
    assert.equal(summary.data_mutation, false);
    assert.ok(summary.recommended_next_action.length > 0);
    assert.ok(summary.remaining_owner_gates.some((g) => g.includes("NOT_CONNECTED")));
  });
});

describe("loadCommandCenterReportForOwner partial repo root", () => {
  it("returns ok:true and degrades fridge buyer-path lanes when data/filters.csv is missing", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "bp-cc-partial-"));
    const affiliateDir = join(rootDir, "data/affiliate");
    mkdirSync(affiliateDir, { recursive: true });
    cpSync(
      join(process.cwd(), "data/affiliate/affiliate-application-tracker.json"),
      join(affiliateDir, "affiliate-application-tracker.json"),
    );
    assert.equal(existsSync(join(rootDir, "data/filters.csv")), false);

    const result = await loadCommandCenterReportForOwner(rootDir);
    assert.equal(result.ok, true, result.ok ? undefined : result.message);

    const cc = result.ok ? result.report.command_center_v2 : null;
    assert.ok(cc);

    const lanes = [
      cc!.fridge_buyer_path_owner_review_bridge_v1,
      cc!.fridge_buyer_path_owner_review_packet_v1,
      cc!.fridge_buyer_path_batch_proposal_v1,
      cc!.batch_run_registry_intake_v1,
    ];

    for (const lane of lanes) {
      assert.equal(lane.read_only, true);
      assert.equal(lane.data_mutation, false);
      const facts = [...lane.proven_facts, ...lane.unknown_facts].join(" ");
      assert.match(
        facts,
        /data\/filters\.csv|ENOENT/i,
        `expected lane ${lane.contract ?? "batch_run_registry_intake_v1"} to mention missing filters.csv or ENOENT`,
      );
    }

    assert.match(
      cc!.fridge_buyer_path_owner_review_bridge_v1.unknown_facts.join(" "),
      /fridge_buyer_path_owner_review_bridge_v1 failed/i,
    );
    assert.equal(cc!.large_batch_coverage_factory_summary_v1.runtime_status, "ATTENTION");
    assert.match(
      cc!.large_batch_coverage_factory_summary_v1.factory_failure_reason ?? "",
      /data\/filters\.csv|ENOENT/i,
    );
  });
});
