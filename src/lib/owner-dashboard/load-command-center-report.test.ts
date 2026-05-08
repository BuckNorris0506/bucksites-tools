import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  attachOwnerCommandCenterNeuronsReport,
  attachOwnerIntegritySentinelReport,
  attachOwnerQuarantinedFridgeModelsReport,
  buildOwnerCommandCenterNeuronsReport,
  buildOwnerIntegritySentinelReport,
  buildOwnerQuarantinedFridgeModelsSummary,
} from "@/lib/owner-dashboard/load-command-center-report";
import {
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";

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

  it("trust-funnel neuron no longer depends on runtime existsSync checks", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/owner-dashboard/load-command-center-report.ts"),
      "utf8",
    );
    assert.equal(
      src.includes("existsSync("),
      false,
      "trust-funnel production-safe contract should avoid runtime filesystem existence checks",
    );
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
    assert.ok(src.includes("14 · Integrity Sentinel"));
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

  it("public fridge page behavior wiring remains unchanged", () => {
    const src = readFileSync(join(process.cwd(), "src/app/fridge/[slug]/page.tsx"), "utf8");
    assert.ok(src.includes("const reviewOverride = getFridgeModelReviewOverride(params.slug);"));
    assert.ok(src.includes("const manualEvidence = reviewOverride"));
    assert.ok(src.includes("mappedFilterCount={reviewOverride ? 0 : fridge.filters.length}"));
    assert.ok(src.includes("quarantineMessage={reviewOverride?.public_message ?? null}"));
  });
});
