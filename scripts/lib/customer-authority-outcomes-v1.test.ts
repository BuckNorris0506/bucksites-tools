import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerAuthorityScoreV1 } from "./customer-authority-score-v1";
import type { CustomerRealityScoreboardV1 } from "./customer-reality-scoreboard-v1";
import type { CustomerAuthorityHistorySnapshotV1 } from "./customer-authority-history-v1";
import { CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1 } from "./customer-authority-history-v1";
import {
  buildCustomerAuthorityOutcomesV1,
  CUSTOMER_AUTHORITY_OUTCOME_WINDOW_DAYS_V1,
  evaluateCustomerAuthoritySnapshotOutcomeV1,
} from "./customer-authority-outcomes-v1";

const GENERATED_AT = "2026-06-20T12:00:00.000Z";
const FACTORY_NBA = "DEMAND-TO-COVERAGE: factory planning.";

function snapshot(overrides: Partial<CustomerAuthorityHistorySnapshotV1> = {}): CustomerAuthorityHistorySnapshotV1 {
  return {
    contract: "customer_authority_history_snapshot_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    snapshot_generated_at: "2026-06-03T10:00:00.000Z",
    snapshot_date_utc: "2026-06-03",
    source_command: "npm run buckparts:command-center -- --write-authority-history",
    source_lanes: [
      "customer_authority_score_v1",
      "customer_steering_comparison_v1",
      "customer_closure_report_v1",
      "next_best_action",
    ],
    captures: {
      authority_score_100: 64,
      authority_mode: "AUTHORITY_GATED_ACTIVE",
      authority_claim_permitted: true,
      customer_action: "CUSTOMER RESCUE: Fix ukf8001 buyer path.",
      customer_tier: 1,
      blocks_discovery: true,
      factory_next_best_action: FACTORY_NBA,
      conflicts_with_factory: true,
      customer_visible_closures_count: 10,
      closure_confidence: "PROVEN",
      all_wedge_coverage_percent: 18,
      marketing_high_risk_opportunity_count: 17,
      closure_target_slug: "ukf8001",
    },
    proven_facts: [],
    unknown_facts: [],
    ...overrides,
  };
}

function closureWithSlug(slug: string, visible: boolean): CustomerClosureReportV1 {
  return {
    contract: "customer_closure_report_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_closure_report_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    customer_visible_closures_count: visible ? 1 : 0,
    promoted_missions_count: 0,
    closure_candidates_count: 1,
    pages_upgraded_this_week_status: { status: "UNKNOWN", count: "UNKNOWN", summary: "No 7d proof." },
    discovery_without_closure_ratio: "INFINITE",
    closure_confidence: "PROVEN",
    customer_visible_shipments: [
      {
        slug,
        customer_visible: visible,
        evidence_basis: visible ? "PROVEN" : "UNKNOWN",
        proof_kinds: visible ? ["closeout_artifact"] : [],
        census_classification: visible ? "SAFE_BUYER_PATH_PROVEN" : "UNKNOWN",
        publishability_state: "PUBLISHABLE_BUY_READY",
        closed_at: visible ? "2026-06-15T00:00:00.000Z" : null,
        source_artifact_path: null,
        proof_chain: [],
      },
    ],
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function writeSnapshotFile(rootDir: string, snap: CustomerAuthorityHistorySnapshotV1): void {
  const dir = path.join(rootDir, CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${snap.snapshot_date_utc}.json`), `${JSON.stringify(snap, null, 2)}\n`);
}

test("one snapshot only -> INSUFFICIENT_HISTORY", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "bp-auth-out-"));
  try {
    writeSnapshotFile(rootDir, snapshot());
    const lane = buildCustomerAuthorityOutcomesV1({
      generated_at: GENERATED_AT,
      rootDir,
      authorityScore: null,
      steering: null,
      closure: null,
      scoreboard: null,
    });
    assert.equal(lane.current_verdict, "INSUFFICIENT_HISTORY");
    assert.equal(lane.snapshot_count, 1);
    assert.equal(lane.evaluable_snapshot_count, 0);
    assert.equal(lane.trend_measurable, false);
    assert.equal(lane.evaluated_snapshots[0]?.customer_steering_prediction, "NOT_EVALUABLE");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("two snapshots but no target/outcome link -> NOT_EVALUABLE", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "bp-auth-out-"));
  try {
    writeSnapshotFile(
      rootDir,
      snapshot({
        snapshot_date_utc: "2026-06-03",
        captures: {
          ...snapshot().captures,
          closure_target_slug: null,
          customer_action: "TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure.",
          customer_tier: 0,
        },
      }),
    );
    writeSnapshotFile(
      rootDir,
      snapshot({
        snapshot_date_utc: "2026-06-04",
        snapshot_generated_at: "2026-06-04T10:00:00.000Z",
        captures: {
          ...snapshot().captures,
          closure_target_slug: null,
          customer_action: "TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure.",
          customer_tier: 0,
        },
      }),
    );
    const lane = buildCustomerAuthorityOutcomesV1({
      generated_at: GENERATED_AT,
      rootDir,
      authorityScore: null,
      steering: null,
      closure: closureWithSlug("ukf8001", false),
      scoreboard: null,
      outcome_window_days: CUSTOMER_AUTHORITY_OUTCOME_WINDOW_DAYS_V1,
    });
    assert.equal(lane.snapshot_count, 2);
    assert.equal(lane.evaluable_snapshot_count, 0);
    assert.equal(lane.unevaluable_snapshot_count, 2);
    assert.ok(lane.evaluated_snapshots.every((row) => row.customer_steering_prediction === "NOT_EVALUABLE"));
    assert.equal(lane.current_verdict, "UNKNOWN");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("later closure for target slug -> CORRECT", () => {
  const evaluated = evaluateCustomerAuthoritySnapshotOutcomeV1({
    snapshot: snapshot(),
    rel_path: `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/2026-06-03.json`,
    generated_at: GENERATED_AT,
    insufficient_history: false,
    outcome_window_days: 7,
    steering: null,
    closure: closureWithSlug("ukf8001", true),
    scoreboard: null,
    authorityScore: null,
  });
  assert.equal(evaluated.customer_steering_prediction, "CORRECT");
  assert.equal(evaluated.prediction_basis, "PROVEN");
  assert.equal(evaluated.later_evidence?.closure_evidence_for_target, true);
});

test("later no improvement after window -> INCORRECT", () => {
  const evaluated = evaluateCustomerAuthoritySnapshotOutcomeV1({
    snapshot: snapshot(),
    rel_path: `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/2026-06-03.json`,
    generated_at: GENERATED_AT,
    insufficient_history: false,
    outcome_window_days: 7,
    steering: null,
    closure: closureWithSlug("ukf8001", false),
    scoreboard: {
      contract: "customer_reality_scoreboard_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      recommended_jq_path: ".command_center_v2.customer_reality_scoreboard_v1",
      source_command: "npm run buckparts:command-center",
      generated_at: GENERATED_AT,
      verified_buyer_path_coverage: {
        evidence_basis: "PROVEN",
        all_wedge_coverage_percent: 18,
        source_lanes: [],
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      certainty_visibility_status: {
        evidence_basis: "UNKNOWN",
        proven_count: 0,
        not_proven_count: 0,
        blocked_count: 0,
        partial_count: 0,
        pass_rate_percent: 0,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      wrong_part_exposure_status: {
        evidence_basis: "PROVEN",
        marketing_high_risk_opportunity_count: 17,
        suppressed_trust_page_count: 91,
        top_high_risk_opportunity_ids: [],
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      repair_closure_status: {
        evidence_basis: "UNKNOWN",
        net_rescue_direction: "UNKNOWN",
        missions_promoted_count: 0,
        missions_dispatch_ready_count: 0,
        safe_cta_links_delta_7d: 0,
        discovery_without_closure_ratio: "INFINITE",
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      search_failure_status: {
        evidence_basis: "UNKNOWN",
        zero_result_rate_last_30d: 0,
        zero_result_count_last_30d: 0,
        search_events_last_30d: 0,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      search_gap_status: {
        evidence_basis: "UNKNOWN",
        actionable_open: 0,
        actionable_reviewing: 0,
        actionable_queued: 0,
        actionable_total: 0,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      customer_journey_completion_status: {
        evidence_basis: "UNKNOWN",
        clicks_per_search_event_30d: 0,
        click_events_last_30d: 0,
        search_events_last_30d: 0,
        full_journey_measured: false,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      high_demand_no_buy_status: {
        evidence_basis: "UNKNOWN",
        certainty_checklist_high_demand_no_buy_status: "UNKNOWN",
        rpwfe_customer_visible_problem: false,
        rpwfe_public_route: "/filter/rpwfe",
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      trust_surface_compliance_status: {
        evidence_basis: "UNKNOWN",
        trust_contract_coverage_status: "UNKNOWN",
        proven_signal_count: 0,
        missing_signal_count: 0,
        live_site_monitor_runtime_status: "UNKNOWN",
        route_http_ok: false,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      commission_truth_status: {
        evidence_basis: "UNKNOWN",
        revenue_ledger_valid_entry_count: 0,
        click_events_last_30d: 0,
        commission_or_revenue: "UNKNOWN",
        clicks_without_commission_entries: false,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
      },
      recommended_next_customer_action_dry_run: {
        evidence_basis: "PROVEN",
        tier: 1,
        tier_label: "customer_rescue",
        action: "CUSTOMER RESCUE: Fix ukf8001 buyer path.",
        blocks_discovery: true,
        closure_target_slug: "ukf8001",
        source_lanes: [],
        why_not_discovery: null,
        proven_facts: [],
        inferred_facts: [],
        unknown_facts: [],
        dry_run_only: true,
        replaces_next_best_action: false,
      },
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
    } satisfies CustomerRealityScoreboardV1,
    authorityScore: null,
  });
  assert.equal(evaluated.customer_steering_prediction, "INCORRECT");
  assert.equal(evaluated.prediction_basis, "PROVEN");
});

test("lane contract and read_only flags", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "bp-auth-out-"));
  try {
    const lane = buildCustomerAuthorityOutcomesV1({
      generated_at: GENERATED_AT,
      rootDir,
      authorityScore: {
        contract: "customer_authority_score_v1",
      } as CustomerAuthorityScoreV1,
      steering: {
        contract: "customer_steering_comparison_v1",
      } as CustomerSteeringComparisonV1,
      closure: null,
      scoreboard: null,
    });
    assert.equal(lane.contract, "customer_authority_outcomes_v1");
    assert.equal(lane.read_only, true);
    assert.equal(lane.data_mutation, false);
    assert.equal(lane.mutation_authorized, false);
    assert.equal(
      lane.recommended_jq_path,
      ".command_center_v2.customer_authority_outcomes_v1",
    );
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
