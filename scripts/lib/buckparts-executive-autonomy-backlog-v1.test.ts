import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildExecutiveAutonomyBacklogFromBlockersV1,
  discoverExecutiveAutonomyBacklogV1,
  EXECUTIVE_AUTONOMY_BACKLOG_CONTRACT_V1,
} from "./buckparts-executive-autonomy-backlog-v1";
import { buildExecutiveWorkBlockersFromSnapshotV1 } from "./buckparts-executive-work-blockers-v1";
import {
  discoverExecutiveWorkV1,
  EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
  type ExecutiveDiscoveredWorkV1,
  type ExecutiveWorkDiscoverySnapshotV1,
} from "./buckparts-executive-work-discovery-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-executive-autonomy-backlog-v1.ts"),
  "utf8",
);

const AP_CMD = "npx tsx scripts/report-ap-model-first-evidence-queue-v1.ts";
const OTHER_CMD = "npx tsx scripts/report-batch-run-registry-intake-v1.ts";

function work(
  partial: Partial<ExecutiveDiscoveredWorkV1> & Pick<ExecutiveDiscoveredWorkV1, "work_id">,
): ExecutiveDiscoveredWorkV1 {
  return {
    business_objective: "fixture",
    executable: false,
    blocking_reason: "no_proven_exact_command",
    exact_command: null,
    authority_required: "none_no_proven_command",
    evidence: [],
    work_exists_epistemic: "PROVEN",
    executable_epistemic: "PROVEN",
    ...partial,
  };
}

function snapshot(args: {
  work?: ExecutiveDiscoveredWorkV1[];
  unobserved?: ExecutiveWorkDiscoverySnapshotV1["unobserved_detectors"];
}): ExecutiveWorkDiscoverySnapshotV1 {
  return {
    contract: EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
    report_name: "buckparts_executive_work_discovery_v1",
    generated_at: "2026-08-15T00:00:00.000Z",
    observation_kind: "business_work_set",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    executive_can_know_every_work_today: false,
    work: args.work ?? [],
    executable_work: (args.work ?? []).filter((w) => w.executable),
    unobserved_detectors: args.unobserved ?? [],
    missing_work_sources: [],
    scale_counts: {
      closed_detectors: 0,
      discovered_work: (args.work ?? []).length,
      executable_work: (args.work ?? []).filter((w) => w.executable).length,
      unobserved_detectors: (args.unobserved ?? []).length,
    },
  };
}

function backlogFromWork(args: {
  work?: ExecutiveDiscoveredWorkV1[];
  unobserved?: ExecutiveWorkDiscoverySnapshotV1["unobserved_detectors"];
}) {
  return buildExecutiveAutonomyBacklogFromBlockersV1(
    buildExecutiveWorkBlockersFromSnapshotV1(snapshot(args)),
  );
}

test("locks: autonomy ranking only; no dispatch, revenue, effort, or business ranking", () => {
  const out = backlogFromWork({ work: [] });
  assert.equal(out.contract, EXECUTIVE_AUTONOMY_BACKLOG_CONTRACT_V1);
  assert.equal(out.read_only, true);
  assert.equal(out.mutation_authorized, false);
  assert.equal(out.dispatch_invoked, false);
  assert.equal(out.ranking_kind, "autonomy_gained_only");
  assert.equal(out.business_opportunity_ranking_performed, false);
  assert.equal(out.engineering_effort_ranking_performed, false);
  assert.equal(out.revenue_ranking_performed, false);
});

test("does not import Command Center compose", () => {
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*report-buckparts-command-center/);
  assert.equal(LIB_SOURCE.includes("buildBuckpartsCommandCenter"), false);
});

test("allowlist gap is a one-time autonomy opportunity with proven steps = blocked work count", () => {
  const out = backlogFromWork({
    work: [
      work({
        work_id: "ap_model_first_evidence",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
      }),
      work({
        work_id: "ap_model_first_mapping_review",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
      }),
    ],
  });
  assert.equal(out.aggregated_opportunities.length, 1);
  const opp = out.aggregated_opportunities[0];
  assert.equal(opp?.expected_manual_steps_removed, 2);
  assert.equal(opp?.expected_manual_steps_removed_epistemic, "PROVEN");
  assert.equal(opp?.recurring_or_one_time, "one_time");
  assert.equal(opp?.authority_required, "dispatch_allowlist_edit");
  assert.equal(opp?.epistemic, "PROVEN");
  assert.deepEqual(opp?.affected_work_items, [
    "ap_model_first_evidence",
    "ap_model_first_mapping_review",
  ]);
  assert.equal(out.highest_autonomy_opportunity?.opportunity_id, opp?.opportunity_id);
  assert.equal(out.autonomy_question.epistemic, "PROVEN");
  assert.equal(out.tied_highest_opportunities.length, 0);
});

test("does not rank a unique high-revenue missing_command above a shared allowlist gap", () => {
  const out = backlogFromWork({
    work: [
      work({
        work_id: "ap_a",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
      }),
      work({
        work_id: "ap_b",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
      }),
      work({
        work_id: "safe_buyer_path_rescue",
        blocking_reason: "no_proven_exact_command",
        business_objective: "Close the highest-revenue rescue gap",
      }),
    ],
  });
  assert.equal(out.highest_autonomy_opportunity?.affected_work_items.includes("ap_a"), true);
  assert.equal(
    out.highest_autonomy_opportunity?.affected_work_items.includes("safe_buyer_path_rescue"),
    false,
  );
  const rescue = out.opportunities.find((o) =>
    o.affected_work_items.includes("safe_buyer_path_rescue"),
  );
  assert.equal(rescue?.expected_manual_steps_removed, null);
  assert.equal(rescue?.expected_manual_steps_removed_epistemic, "UNKNOWN");
});

test("founder_gate owner-review does not claim founder steps can be removed", () => {
  const out = backlogFromWork({
    work: [
      work({
        work_id: "ap_demand_selected_open_batch",
        blocking_reason: "dispatch_runner_refuses_owner_review_required",
        evidence: [`exact_command=${JSON.stringify("npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts")}`],
      }),
    ],
  });
  const opp = out.opportunities[0];
  assert.equal(opp?.expected_manual_steps_removed, 0);
  assert.equal(opp?.authority_required, "founder_owner_review_remains");
  assert.equal(opp?.recurring_or_one_time, "recurring");
  assert.equal(out.highest_autonomy_opportunity, null);
  assert.ok(out.autonomy_question.answer.includes("weakening"));
});

test("equal proven autonomy gain is a tie that cannot be broken", () => {
  const out = backlogFromWork({
    work: [
      work({
        work_id: "a",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
      }),
      work({
        work_id: "b",
        blocking_reason: "exact_command_not_on_dispatch_allowlist",
        evidence: [`exact_command=${JSON.stringify(OTHER_CMD)}`],
      }),
    ],
  });
  assert.equal(out.highest_autonomy_opportunity, null);
  assert.equal(out.tied_highest_opportunities.length, 2);
  assert.equal(out.autonomy_question.epistemic, "INFERRED");
  assert.ok(out.autonomy_question.answer.includes("cannot break the tie"));
  assert.ok(out.autonomy_question.answer.includes("does not rank by revenue"));
});

test("unobserved observation restore is UNKNOWN autonomy, not invented executable work", () => {
  const out = backlogFromWork({
    work: [],
    unobserved: [
      {
        detector_id: "retailer_link_parity_correction",
        epistemic: "UNKNOWN",
        reason: "cannot observe Supabase",
        evidence: ["supabase"],
      },
    ],
  });
  assert.equal(out.opportunities[0]?.expected_manual_steps_removed, null);
  assert.equal(out.opportunities[0]?.expected_manual_steps_removed_epistemic, "UNKNOWN");
  assert.equal(out.opportunities[0]?.authority_required, "restore_external_observation");
  assert.equal(out.highest_autonomy_opportunity, null);
});

test("live HEAD: AP allowlist opportunity tracks whether those work items are still blocked", async () => {
  const workSnap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const out = await discoverExecutiveAutonomyBacklogV1({ rootDir: REPO_ROOT });
  assert.equal(out.opportunities.length, out.aggregated_opportunities.length);
  const apWork = workSnap.work.filter(
    (w) => w.work_id === "ap_model_first_evidence" || w.work_id === "ap_model_first_mapping_review",
  );
  if (apWork.length === 2 && apWork.every((w) => w.executable === true)) {
    assert.equal(
      out.opportunities.some(
        (o) =>
          o.authority_required === "dispatch_allowlist_edit" &&
          o.affected_work_items.includes("ap_model_first_evidence"),
      ),
      false,
    );
  } else if (apWork.length === 2 && apWork.every((w) => w.executable === false)) {
    assert.equal(out.highest_autonomy_opportunity?.expected_manual_steps_removed, 2);
    assert.equal(out.highest_autonomy_opportunity?.authority_required, "dispatch_allowlist_edit");
    assert.equal(out.autonomy_question.epistemic, "PROVEN");
    assert.equal(out.tied_highest_opportunities.length, 0);
  }
});
