import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildExecutiveWorkBlockersFromSnapshotV1,
  classifyDiscoveredWorkBlockerV1,
  discoverExecutiveWorkBlockersV1,
  EXECUTIVE_WORK_BLOCKERS_CONTRACT_V1,
} from "./buckparts-executive-work-blockers-v1";
import {
  discoverExecutiveWorkV1,
  EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
  type ExecutiveDiscoveredWorkV1,
  type ExecutiveWorkDiscoverySnapshotV1,
} from "./buckparts-executive-work-discovery-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-executive-work-blockers-v1.ts"),
  "utf8",
);

const AP_CMD = "npx tsx scripts/report-ap-model-first-evidence-queue-v1.ts";
const OTHER_CMD = "npx tsx scripts/report-batch-run-registry-intake-v1.ts";

function work(partial: Partial<ExecutiveDiscoveredWorkV1> & Pick<ExecutiveDiscoveredWorkV1, "work_id">): ExecutiveDiscoveredWorkV1 {
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

test("locks: read-only, autonomy ranking only, no dispatch, no business ranking", () => {
  const out = buildExecutiveWorkBlockersFromSnapshotV1(snapshot({ work: [] }));
  assert.equal(out.contract, EXECUTIVE_WORK_BLOCKERS_CONTRACT_V1);
  assert.equal(out.read_only, true);
  assert.equal(out.data_mutation, false);
  assert.equal(out.mutation_authorized, false);
  assert.equal(out.dispatch_invoked, false);
  assert.equal(out.nba_authority, false);
  assert.equal(out.ranking_performed, true);
  assert.equal(out.ranking_kind, "autonomy_blockers_only");
  assert.equal(out.business_opportunity_ranking_performed, false);
  assert.equal(out.command_center_rebuilt, false);
});

test("does not import Command Center compose", () => {
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*report-buckparts-command-center/);
  assert.equal(LIB_SOURCE.includes("buildBuckpartsCommandCenter"), false);
});

test("closed map: no_proven_exact_command → missing_command", () => {
  const row = classifyDiscoveredWorkBlockerV1(
    work({ work_id: "safe_buyer_path_rescue", blocking_reason: "no_proven_exact_command" }),
  );
  assert.equal(row.executable, false);
  assert.equal(row.blocker_class, "missing_command");
  assert.equal(row.classification_epistemic, "PROVEN");
  assert.ok(row.smallest_change_to_make_executable?.includes("does not invent"));
});

test("closed map: exact_command_not_on_dispatch_allowlist → authority", () => {
  const row = classifyDiscoveredWorkBlockerV1(
    work({
      work_id: "ap_model_first_evidence",
      blocking_reason: "exact_command_not_on_dispatch_allowlist",
      authority_required: "canonical_source_command_constant",
      evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
    }),
  );
  assert.equal(row.blocker_class, "authority");
  assert.ok(row.immediate_blocking_condition?.includes(AP_CMD));
  assert.ok(row.smallest_change_to_make_executable?.includes(AP_CMD));
  assert.ok(row.smallest_change_to_make_executable?.includes("does not apply the allowlist"));
});

test("closed map: owner_review_required → founder_gate; does not recommend weakening the gate", () => {
  const row = classifyDiscoveredWorkBlockerV1(
    work({
      work_id: "ap_demand_selected_open_batch",
      blocking_reason: "dispatch_runner_refuses_owner_review_required",
      authority_required: "dispatch_allowlist_metadata",
      evidence: [`exact_command=${JSON.stringify("npx tsx scripts/report-air-purifier-demand-selected-batch-owner-review-v1.ts")}`],
    }),
  );
  assert.equal(row.blocker_class, "founder_gate");
  assert.ok(row.smallest_change_to_make_executable?.includes("does not weaken the founder gate"));
});

test("executable work has no blocker class", () => {
  const row = classifyDiscoveredWorkBlockerV1(
    work({
      work_id: "already_runnable",
      executable: true,
      blocking_reason: null,
      exact_command: "npx tsx scripts/report-buckparts-command-center.ts",
    }),
  );
  assert.equal(row.executable, true);
  assert.equal(row.blocker_class, null);
  assert.equal(row.blocker_fingerprint, null);
});

test("unmapped blocking_reason is unknown, not invented", () => {
  const row = classifyDiscoveredWorkBlockerV1(
    work({ work_id: "mystery", blocking_reason: "invented_reason_not_in_map" }),
  );
  assert.equal(row.blocker_class, "unknown");
  assert.equal(row.classification_epistemic, "UNKNOWN");
});

test("ranks autonomy fingerprints by blocked count, not business objective", () => {
  const out = buildExecutiveWorkBlockersFromSnapshotV1(
    snapshot({
      work: [
        work({
          work_id: "low_value_but_shared_a",
          blocking_reason: "exact_command_not_on_dispatch_allowlist",
          evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
        }),
        work({
          work_id: "low_value_but_shared_b",
          blocking_reason: "exact_command_not_on_dispatch_allowlist",
          evidence: [`exact_command=${JSON.stringify(AP_CMD)}`],
        }),
        work({
          work_id: "high_revenue_unique",
          blocking_reason: "no_proven_exact_command",
          business_objective: "Close the highest-revenue rescue gap",
        }),
      ],
    }),
  );
  assert.equal(out.highest_autonomy_blocker?.blocked_work_count, 2);
  assert.deepEqual(out.highest_autonomy_blocker?.blocked_work_ids, [
    "low_value_but_shared_a",
    "low_value_but_shared_b",
  ]);
  assert.equal(out.highest_autonomy_blocker?.blocker_class, "authority");
  assert.equal(out.autonomy_question.epistemic, "PROVEN");
  assert.equal(out.business_opportunity_ranking_performed, false);
  assert.ok(out.autonomy_blocker_aggregates[0]?.blocked_work_count >= out.autonomy_blocker_aggregates[1]?.blocked_work_count);
});

test("different bound commands with the same class are distinct autonomy fingerprints", () => {
  const out = buildExecutiveWorkBlockersFromSnapshotV1(
    snapshot({
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
    }),
  );
  assert.equal(out.autonomy_blocker_aggregates.length, 2);
  assert.equal(out.highest_autonomy_blocker_epistemic, "INFERRED");
  assert.ok(out.autonomy_question.answer.startsWith("INFERRED tie"));
});

test("unobserved supabase is external_dependency; not invented as discovered work", () => {
  const out = buildExecutiveWorkBlockersFromSnapshotV1(
    snapshot({
      work: [],
      unobserved: [
        {
          detector_id: "retailer_link_parity_correction",
          epistemic: "UNKNOWN",
          reason: "Retailer-link parity detector cannot observe Supabase",
          evidence: ["unknown_or_db_unavailable:detector:missing_url"],
        },
      ],
    }),
  );
  assert.equal(out.work_blockers.length, 0);
  assert.equal(out.unobserved_blockers[0]?.blocker_class, "external_dependency");
  assert.equal(out.highest_autonomy_blocker?.source, "unobserved_detector");
});

test("prefers discovered-work fingerprints over unobserved when answering the autonomy question", () => {
  const out = buildExecutiveWorkBlockersFromSnapshotV1(
    snapshot({
      work: [
        work({ work_id: "only_discovered", blocking_reason: "no_proven_exact_command" }),
      ],
      unobserved: [
        {
          detector_id: "retailer_link_parity_correction",
          epistemic: "UNKNOWN",
          reason: "cannot observe Supabase",
          evidence: ["supabase"],
        },
        {
          detector_id: "demand_to_coverage_next_wedge",
          epistemic: "UNKNOWN",
          reason: "GSC artifact missing",
          evidence: ["gsc"],
        },
      ],
    }),
  );
  assert.equal(out.highest_autonomy_blocker?.source, "discovered_work");
  assert.equal(out.highest_autonomy_blocker?.blocked_work_ids[0], "only_discovered");
});

test("live HEAD: every discovered work item has required blocker fields; AP allowlist gap aggregates if both present", async () => {
  const workSnap = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const out = await discoverExecutiveWorkBlockersV1({
    rootDir: REPO_ROOT,
    work_snapshot: workSnap,
  });
  assert.equal(out.work_blockers.length, workSnap.work.length);
  for (const row of out.work_blockers) {
    assert.ok(row.work_id.length > 0);
    if (row.executable) {
      assert.equal(row.blocker_class, null);
      assert.equal(row.immediate_blocking_condition, null);
    } else {
      assert.ok(row.blocker_class);
      assert.ok(row.immediate_blocking_condition);
      assert.ok(row.smallest_change_to_make_executable);
    }
  }
  const apEvidence = out.work_blockers.find((w) => w.work_id === "ap_model_first_evidence");
  const apMapping = out.work_blockers.find((w) => w.work_id === "ap_model_first_mapping_review");
  if (apEvidence && apMapping) {
    assert.equal(apEvidence.blocker_fingerprint, apMapping.blocker_fingerprint);
    assert.equal(out.highest_autonomy_blocker?.blocker_fingerprint, apEvidence.blocker_fingerprint);
    assert.ok((out.highest_autonomy_blocker?.blocked_work_count ?? 0) >= 2);
    assert.equal(out.highest_autonomy_blocker?.blocker_class, "authority");
  }
});
