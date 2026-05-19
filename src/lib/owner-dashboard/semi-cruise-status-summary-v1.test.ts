import assert from "node:assert/strict";
import test from "node:test";

import type { SpendLedgerEntryV1 } from "../../../scripts/lib/buckparts-spend-ledger-contract-v1";
import {
  buildSemiCruiseStatusSummaryV1,
  resolveNetlifyPublishingStatusFromSpendLedgerV1,
  SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1,
} from "./semi-cruise-status-summary-v1";

function baseV2() {
  return {
    external_measurement_freshness_v1: {
      contract: "external_measurement_freshness_v1" as const,
      read_only: true as const,
      data_mutation: false as const,
      runtime_status: "OK" as const,
      overall_status: "OK" as const,
      gsc: {} as never,
      ga4: {} as never,
      recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"] as const,
      proven_facts: [],
      unknown_facts: [],
    },
    page_publishability_truth_summary_v1: {
      contract: "page_publishability_truth_summary_v1" as const,
      read_only: true as const,
      data_mutation: false as const,
      unknown_join_count: 0,
    } as never,
    affiliate_readiness: { status: "OK" as const, blocker: null },
    coverage_health: { status: "OK" as const, blocker: null },
    amazon_rescue: {
      status: "OK" as const,
      human_browser_required_tokens: [] as string[],
      blocker: null,
      next_owner_action: "",
    },
    revenue_snapshot: {
      click_visibility: { commission_or_revenue: "NOT_CONNECTED" as const },
    } as never,
  };
}

test("buildSemiCruiseStatusSummaryV1 marks read-only operational when CC facts align", () => {
  const summary = buildSemiCruiseStatusSummaryV1({
    generated_at: "2026-05-19T00:00:00.000Z",
    read_only: true,
    data_mutation: false,
    operator_can_be_away_status: "READY_FOR_AUTONOMOUS_READ_ONLY",
    system_health_status: "OK",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: true },
    command_center_v2: baseV2(),
    owner_command_center_neurons: {
      data_mutation: false,
      generated_from: ["test"],
      neurons: [
        { neuron_key: "click_visibility", connection_level: "BRIGHT" } as never,
        { neuron_key: "affiliate_readiness", connection_level: "DIM" } as never,
      ],
    },
    spend_ledger_entries: [],
  });

  assert.equal(summary.contract, SEMI_CRUISE_STATUS_SUMMARY_CONTRACT_V1);
  assert.equal(summary.read_only, true);
  assert.equal(summary.data_mutation, false);
  assert.equal(summary.read_only_semi_cruise_status, "PROVEN_OPERATIONAL");
  assert.equal(summary.mutation_semi_cruise_status, "NOT_PROVEN");
  assert.equal(summary.bright_neuron_count, 1);
  assert.equal(summary.dim_neuron_count, 1);
});

test("buildSemiCruiseStatusSummaryV1 does not mark deploy credit burn exact without ledger proof", () => {
  const entry: SpendLedgerEntryV1 = {
    id: "x",
    recorded_at: "t",
    provider: "netlify",
    unit_type: "netlify_credits",
    amount: 15,
    amount_unit: "credits",
    exact_cost_proven: false,
    estimated_cost_usd: null,
    source_surface: "git:push-origin-main-inferred",
    task_id: null,
    session_id: null,
    related_commit: "abc",
    related_branch: "main",
    purpose: "production_deploy",
    outcome: "success",
    useful_output: true,
    deploy_triggered: true,
    mutation_triggered: false,
    proven_facts: [],
    unknown_facts: ["UNKNOWN: Netlify dashboard was not checked."],
    notes: null,
  };
  const summary = buildSemiCruiseStatusSummaryV1({
    generated_at: "t",
    read_only: true,
    data_mutation: false,
    operator_can_be_away_status: "READY_FOR_AUTONOMOUS_READ_ONLY",
    system_health_status: "OK",
    execution_guidance: { next_move_mode: "READ_ONLY", mutating_blocked: true },
    command_center_v2: baseV2(),
    owner_command_center_neurons: null,
    spend_ledger_entries: [entry],
  });
  assert.equal(summary.deploy_credit_risk_status, "HIGH_RISK");
  assert.ok(
    summary.unknown_facts.some((f) => f.includes("Netlify Usage & billing dashboard")),
  );
  assert.ok(!summary.proven_facts.some((f) => /exact.*credit burn.*proven/i.test(f)));
});

test("resolveNetlifyPublishingStatusFromSpendLedgerV1 respects OPERATOR_REPORTED vs PROVEN lock", () => {
  const operatorOnly = resolveNetlifyPublishingStatusFromSpendLedgerV1([
    {
      proven_facts: ["OPERATOR_REPORTED: Netlify publishing locked after credit limit."],
    } as SpendLedgerEntryV1,
  ]);
  assert.equal(operatorOnly.status, "OPERATOR_REPORTED");

  const provenLock = resolveNetlifyPublishingStatusFromSpendLedgerV1([
    {
      proven_facts: ["PROVEN: Netlify publishing locked in team dashboard on 2026-05-19."],
    } as SpendLedgerEntryV1,
  ]);
  assert.equal(provenLock.status, "LOCKED");

  const none = resolveNetlifyPublishingStatusFromSpendLedgerV1([]);
  assert.equal(none.status, "UNKNOWN");
});
