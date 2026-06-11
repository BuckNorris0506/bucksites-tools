import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { CustomerClosureReportV1 } from "./customer-closure-report-v1";
import type { CustomerSteeringComparisonV1 } from "./customer-steering-comparison-v1";
import type { CustomerAuthorityScoreV1 } from "./customer-authority-score-v1";
import {
  appendCustomerAuthorityHistorySnapshotV1,
  buildCustomerAuthorityHistorySnapshotV1,
  buildCustomerAuthorityHistoryStatusV1,
  CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1,
  listCustomerAuthorityHistorySnapshotsV1,
  snapshotDateUtcFromIsoV1,
} from "./customer-authority-history-v1";

const GENERATED_AT = "2026-06-10T14:30:00.000Z";
const FACTORY_NBA = "DEMAND-TO-COVERAGE [START_NEW_DEMAND_SELECTED_BATCH]: air_purifier planning.";

function authorityScore(): CustomerAuthorityScoreV1 {
  return {
    contract: "customer_authority_score_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_authority_score_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    authority_score_100: 64,
    evidence_basis: "PROVEN",
    authority_mode: "AUTHORITY_GATED_ACTIVE",
    authority_claim_permitted: true,
    authority_gate_reasons: [],
    components: {
      customer_steering: {
        tier: 0,
        blocks_discovery: true,
        action_prefix: "TRUST STOP-THE-LINE",
        conflicts_with_factory: true,
        recommended_primary: "customer",
        source_lane: "customer_steering_comparison_v1",
      },
      factory_steering: {
        next_best_action_prefix: "DEMAND-TO-COVERAGE",
        steering_override_source: "demand_to_coverage",
        control_graph_nba_differs: true,
        source_lanes: [
          "next_best_action",
          "customer_steering_comparison_v1",
          "command_center_control_graph_rollup_v1",
        ],
      },
      closure_proof: {
        customer_visible_closures_count: 12,
        closure_confidence: "PROVEN",
        pages_upgraded_7d_status: "UNKNOWN",
        source_lane: "customer_closure_report_v1",
      },
      wrong_part_exposure: {
        high_risk_opportunity_count: 17,
        suppressed_trust_page_count: 91,
        reduction_measurable: false,
        source_lane: "customer_reality_scoreboard_v1.wrong_part_exposure_status",
      },
      buyer_path_coverage: {
        all_wedge_coverage_percent: 20.2,
        safe_cta_links_delta_7d: 24,
        net_rescue_direction: "UNKNOWN",
        improvement_measurable: true,
        source_lanes: [
          "customer_reality_scoreboard_v1.verified_buyer_path_coverage",
          "customer_reality_scoreboard_v1.repair_closure_status",
        ],
      },
    },
    retrospective: {
      point_in_time_measurable: true,
      trend_measurable: false,
      steering_history_logged: false,
      closure_registry_present: false,
      missing_for_full_retrospective: [],
    },
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    replaces_next_best_action: false,
  };
}

function steering(): CustomerSteeringComparisonV1 {
  return {
    contract: "customer_steering_comparison_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_steering_comparison_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    next_customer_action_dry_run: {
      evidence_basis: "PROVEN",
      tier: 0,
      tier_label: "trust_stop_the_line",
      action: "TRUST STOP-THE-LINE: Resolve HIGH wrong-part-risk exposure.",
      blocks_discovery: true,
      closure_target_slug: null,
      source_lanes: [],
      why_not_discovery: "Tier 0",
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
      dry_run_only: true,
      replaces_next_best_action: false,
    },
    factory_steering: {
      next_best_action: FACTORY_NBA,
      why_this_action: "Factory batch planning.",
      steering_override_source: "demand_to_coverage",
    },
    comparison: {
      conflicts_with_next_best_action: true,
      customer_tier: 0,
      factory_action_prefix: "DEMAND-TO-COVERAGE",
      why_factory_differs: "Tier 0",
      blocks_discovery: true,
      recommended_primary_for_founder_review: "customer",
    },
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
    dry_run_only: true,
    replaces_next_best_action: false,
  };
}

function closure(): CustomerClosureReportV1 {
  return {
    contract: "customer_closure_report_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: ".command_center_v2.customer_closure_report_v1",
    source_command: "npm run buckparts:command-center",
    generated_at: GENERATED_AT,
    customer_visible_closures_count: 12,
    promoted_missions_count: 0,
    closure_candidates_count: 23,
    pages_upgraded_this_week_status: {
      status: "UNKNOWN",
      count: "UNKNOWN",
      summary: "No 7d proof.",
    },
    discovery_without_closure_ratio: "INFINITE",
    closure_confidence: "PROVEN",
    customer_visible_shipments: [],
    source_lanes: [],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [],
  };
}

test("snapshotDateUtcFromIsoV1 extracts UTC date", () => {
  assert.equal(snapshotDateUtcFromIsoV1("2026-06-10T14:30:00.000Z"), "2026-06-10");
});

test("buildCustomerAuthorityHistorySnapshotV1 captures lane fields", () => {
  const snapshot = buildCustomerAuthorityHistorySnapshotV1({
    generated_at: GENERATED_AT,
    authorityScore: authorityScore(),
    steering: steering(),
    closure: closure(),
    root_next_best_action: FACTORY_NBA,
  });

  assert.equal(snapshot.contract, "customer_authority_history_snapshot_v1");
  assert.equal(snapshot.snapshot_date_utc, "2026-06-10");
  assert.equal(snapshot.captures.authority_score_100, 64);
  assert.equal(snapshot.captures.authority_claim_permitted, true);
  assert.equal(snapshot.captures.conflicts_with_factory, true);
  assert.equal(snapshot.captures.customer_visible_closures_count, 12);
  assert.equal(snapshot.captures.all_wedge_coverage_percent, 20.2);
  assert.equal(snapshot.captures.marketing_high_risk_opportunity_count, 17);
  assert.equal(snapshot.captures.closure_target_slug, null);
});

test("append is skip-on-duplicate-date and status reflects history", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "bp-auth-hist-"));
  try {
    const snapshot = buildCustomerAuthorityHistorySnapshotV1({
      generated_at: GENERATED_AT,
      authorityScore: authorityScore(),
      steering: steering(),
      closure: closure(),
      root_next_best_action: FACTORY_NBA,
    });

    const first = appendCustomerAuthorityHistorySnapshotV1({ rootDir, snapshot });
    assert.equal(first.wrote, true);
    assert.equal(first.rel_path, `${CUSTOMER_AUTHORITY_HISTORY_DIR_REL_V1}/2026-06-10.json`);

    const second = appendCustomerAuthorityHistorySnapshotV1({ rootDir, snapshot });
    assert.equal(second.wrote, false);
    assert.match(second.skipped_reason ?? "", /append-only/i);

    const status = buildCustomerAuthorityHistoryStatusV1({
      generated_at: GENERATED_AT,
      rootDir,
      last_append_attempt: second,
    });
    assert.equal(status.snapshot_count, 1);
    assert.equal(status.steering_history_logged, true);
    assert.equal(status.trend_measurable, false);
    assert.equal(status.newest_snapshot?.snapshot_date_utc, "2026-06-10");

    const listed = listCustomerAuthorityHistorySnapshotsV1({ rootDir });
    assert.equal(listed.length, 1);
    assert.ok(existsSync(path.join(rootDir, first.rel_path!)));
    const onDisk = JSON.parse(readFileSync(path.join(rootDir, first.rel_path!), "utf8"));
    assert.equal(onDisk.contract, "customer_authority_history_snapshot_v1");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("trend_measurable true with two snapshot dates", () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "bp-auth-hist-"));
  try {
    const fs = {
      fileExists: existsSync,
      readDir: readdirSync,
      readTextFile: (abs: string) => readFileSync(abs, "utf8"),
      writeTextFile: (abs: string, contents: string) => {
        mkdirSync(path.dirname(abs), { recursive: true });
        writeFileSync(abs, contents, "utf8");
      },
      mkdirp: (abs: string) => mkdirSync(abs, { recursive: true }),
    };

    appendCustomerAuthorityHistorySnapshotV1({
      rootDir,
      snapshot: buildCustomerAuthorityHistorySnapshotV1({
        generated_at: "2026-06-09T12:00:00.000Z",
        authorityScore: authorityScore(),
        steering: steering(),
        closure: closure(),
        root_next_best_action: FACTORY_NBA,
      }),
      fs,
    });
    appendCustomerAuthorityHistorySnapshotV1({
      rootDir,
      snapshot: buildCustomerAuthorityHistorySnapshotV1({
        generated_at: "2026-06-10T12:00:00.000Z",
        authorityScore: authorityScore(),
        steering: steering(),
        closure: closure(),
        root_next_best_action: FACTORY_NBA,
      }),
      fs,
    });

    const status = buildCustomerAuthorityHistoryStatusV1({
      generated_at: GENERATED_AT,
      rootDir,
      fs,
    });
    assert.equal(status.snapshot_count, 2);
    assert.equal(status.trend_measurable, true);
    assert.equal(status.steering_history_logged, true);
    assert.equal(status.oldest_snapshot?.snapshot_date_utc, "2026-06-09");
    assert.equal(status.newest_snapshot?.snapshot_date_utc, "2026-06-10");
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
