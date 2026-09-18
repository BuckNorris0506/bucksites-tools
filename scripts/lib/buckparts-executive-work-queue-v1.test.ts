import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AP_OWNER_REVIEW_EXACT_COMMAND_V1,
  DISPATCH_ALLOWLIST_ENTRIES_V1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import {
  discoverExecutiveWorkV1,
  EXECUTIVE_WORK_DISCOVERY_CONTRACT_V1,
  type ExecutiveDiscoveredWorkV1,
  type ExecutiveWorkDiscoverySnapshotV1,
} from "./buckparts-executive-work-discovery-v1";
import {
  buildExecutiveWorkQueueFromSnapshotV1,
  discoverExecutiveWorkQueueV1,
  EXECUTIVE_WORK_QUEUE_CONTRACT_V1,
  expectedCompletionArtifactV1,
} from "./buckparts-executive-work-queue-v1";

const REPO_ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-executive-work-queue-v1.ts"),
  "utf8",
);

const AP_EVIDENCE_CMD = "npx tsx scripts/report-ap-model-first-evidence-queue-v1.ts";
const PLAN_DRY_RUN =
  DISPATCH_ALLOWLIST_ENTRIES_V1.find((e) =>
    e.exact_command.includes("--plan-dry-run"),
  )?.exact_command ?? "npm run buckparts:retailer-link-parity-correction -- --plan-dry-run";
const CC_REPORT =
  DISPATCH_ALLOWLIST_ENTRIES_V1.find((e) =>
    e.exact_command.includes("report-buckparts-command-center"),
  )?.exact_command ?? "npx tsx scripts/report-buckparts-command-center.ts";

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
  const items = args.work ?? [];
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
    work: items,
    executable_work: items.filter((w) => w.executable),
    unobserved_detectors: args.unobserved ?? [],
    missing_work_sources: [],
    scale_counts: {
      closed_detectors: 0,
      discovered_work: items.length,
      executable_work: items.filter((w) => w.executable).length,
      unobserved_detectors: (args.unobserved ?? []).length,
    },
  };
}

test("locks: read-only, no ranking, no dispatch, no NBA, no CC rebuild", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(snapshot({ work: [] }));
  assert.equal(out.contract, EXECUTIVE_WORK_QUEUE_CONTRACT_V1);
  assert.equal(out.observation_kind, "now_or_not_yet_work_queue");
  assert.equal(out.read_only, true);
  assert.equal(out.data_mutation, false);
  assert.equal(out.mutation_authorized, false);
  assert.equal(out.nba_authority, false);
  assert.equal(out.dispatch_authority, false);
  assert.equal(out.dispatch_invoked, false);
  assert.equal(out.steering_authority, false);
  assert.equal(out.ranking_performed, false);
  assert.equal(out.command_center_rebuilt, false);
  assert.equal(out.outcome_join_consulted, false);
});

test("does not import Command Center compose, Outcome Join, or Autonomy Backlog", () => {
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*report-buckparts-command-center/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*buckparts-command-center-v2/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*phase4-outcome/);
  assert.doesNotMatch(LIB_SOURCE, /from ["'][^"']*buckparts-executive-autonomy-backlog/);
  assert.equal(LIB_SOURCE.includes("buildBuckpartsCommandCenter"), false);
  assert.equal(LIB_SOURCE.includes("ranking_performed: true"), false);
});

test("snapshot has no ranking, autonomy-score, or business-score fields", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(snapshot({ work: [] }));
  const keys = Object.keys(out);
  assert.equal(keys.includes("highest_autonomy_blocker"), false);
  assert.equal(keys.includes("highest_autonomy_opportunity"), false);
  assert.equal(keys.includes("autonomy_question"), false);
  assert.equal(keys.includes("ranking_kind"), false);
  assert.equal(keys.includes("tied_highest_opportunities"), false);
  assert.equal(JSON.stringify(out).includes("autonomy_score"), false);
  assert.equal(JSON.stringify(out).includes("business_score"), false);
  assert.equal(JSON.stringify(out).includes("engineering_score"), false);
});

test("splits discovered work by executable in catalog order; does not invent", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(
    snapshot({
      work: [
        work({
          work_id: "blocked_first",
          blocking_reason: "no_proven_exact_command",
        }),
        work({
          work_id: "executable_mid",
          executable: true,
          blocking_reason: null,
          exact_command: PLAN_DRY_RUN,
          authority_required: "dispatch_allowlist_metadata",
        }),
        work({
          work_id: "blocked_last",
          blocking_reason: "exact_command_not_on_dispatch_allowlist",
          authority_required: "canonical_source_command_constant",
          evidence: [`exact_command=${JSON.stringify(AP_EVIDENCE_CMD)}`],
        }),
      ],
    }),
  );
  assert.deepEqual(
    out.executable_work.map((row) => row.work_id),
    ["executable_mid"],
  );
  assert.deepEqual(
    out.blocked_work.map((row) => row.work_id),
    ["blocked_first", "blocked_last"],
  );
  assert.equal(out.executable_work[0]?.exact_command, PLAN_DRY_RUN);
  assert.equal(out.executable_work[0]?.authority, "dispatch_allowlist_metadata");
  assert.equal(out.empty_executable_queue_proof, null);
  assert.equal(out.scale_counts.discovered_work, 3);
  assert.equal(out.scale_counts.executable_work, 1);
  assert.equal(out.scale_counts.blocked_work, 2);
});

test("unobserved detectors are not placed in either set", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(
    snapshot({
      work: [
        work({ work_id: "safe_buyer_path_rescue" }),
      ],
      unobserved: [
        {
          detector_id: "retailer_link_parity_correction",
          epistemic: "UNKNOWN",
          reason: "Retailer-link parity detector cannot observe Supabase",
          evidence: ["unknown_or_db_unavailable"],
        },
      ],
    }),
  );
  assert.equal(
    out.executable_work.some((row) => row.work_id === "retailer_link_parity_correction"),
    false,
  );
  assert.equal(
    out.blocked_work.some((row) => row.work_id === "retailer_link_parity_correction"),
    false,
  );
  assert.equal(out.scale_counts.unobserved_detectors, 1);
  assert.equal(out.empty_executable_queue_proof?.unobserved_not_invented_as_executable, true);
});

test("empty EXECUTABLE WORK emits proof; blocked rows keep blocker_class and smallest_change", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(
    snapshot({
      work: [
        work({ work_id: "safe_buyer_path_rescue" }),
        work({
          work_id: "ap_model_first_evidence",
          blocking_reason: "exact_command_not_on_dispatch_allowlist",
          authority_required: "canonical_source_command_constant",
          evidence: [`exact_command=${JSON.stringify(AP_EVIDENCE_CMD)}`],
        }),
        work({
          work_id: "ap_demand_selected_open_batch",
          blocking_reason: "dispatch_runner_refuses_owner_review_required",
          authority_required: "dispatch_allowlist_metadata",
          evidence: [`exact_command=${JSON.stringify(AP_OWNER_REVIEW_EXACT_COMMAND_V1)}`],
        }),
      ],
    }),
  );
  assert.equal(out.executable_work.length, 0);
  assert.equal(out.blocked_work.length, 3);
  assert.ok(out.empty_executable_queue_proof);
  assert.equal(out.empty_executable_queue_proof?.epistemic, "PROVEN");
  assert.equal(out.empty_executable_queue_proof?.executable_work_count, 0);
  assert.equal(out.empty_executable_queue_proof?.discovered_work_count, 3);
  assert.equal(out.empty_executable_queue_proof?.allowlisted_non_work_not_invented_as_executable, true);
  assert.match(
    out.empty_executable_queue_proof?.why ?? "",
    /nothing it may lawfully execute/,
  );
  assert.equal(out.blocked_work[0]?.blocker_class, "missing_command");
  assert.equal(out.blocked_work[0]?.authority_required, "none_no_proven_command");
  assert.ok(out.blocked_work[0]?.smallest_change.includes("does not invent"));
  assert.equal(out.blocked_work[1]?.blocker_class, "authority");
  assert.ok(out.blocked_work[1]?.smallest_change.includes(AP_EVIDENCE_CMD));
  assert.equal(out.blocked_work[2]?.blocker_class, "founder_gate");
});

test("zero discovered work still proves empty EXECUTABLE WORK", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(snapshot({ work: [] }));
  assert.equal(out.executable_work.length, 0);
  assert.equal(out.blocked_work.length, 0);
  assert.equal(out.empty_executable_queue_proof?.discovered_work_count, 0);
  assert.match(
    out.empty_executable_queue_proof?.why ?? "",
    /0 discovered work items/,
  );
});

test("fail closed: executable=true with null exact_command is not EXECUTABLE WORK", () => {
  const out = buildExecutiveWorkQueueFromSnapshotV1(
    snapshot({
      work: [
        work({
          work_id: "broken_executable",
          executable: true,
          blocking_reason: null,
          exact_command: null,
          authority_required: "dispatch_allowlist_metadata",
        }),
      ],
    }),
  );
  assert.equal(out.executable_work.length, 0);
  assert.equal(out.blocked_work.length, 1);
  assert.equal(out.blocked_work[0]?.work_id, "broken_executable");
  assert.ok(out.empty_executable_queue_proof);
});

test("expected_completion_artifact: stdout JSON is PROVEN only when allowlist no_artifact_allowed=true", () => {
  const dry = expectedCompletionArtifactV1(PLAN_DRY_RUN);
  assert.equal(dry.expected_completion_artifact_epistemic, "PROVEN");
  assert.ok(dry.expected_completion_artifact?.includes("stdout JSON"));
  assert.equal(dry.expected_completion_artifact?.includes("/opt/cursor"), false);

  const evidence = expectedCompletionArtifactV1(AP_EVIDENCE_CMD);
  assert.equal(evidence.expected_completion_artifact_epistemic, "PROVEN");
  assert.ok(evidence.expected_completion_artifact?.includes("stdout JSON"));

  const required = expectedCompletionArtifactV1(CC_REPORT);
  assert.equal(required.expected_completion_artifact, null);
  assert.equal(required.expected_completion_artifact_epistemic, "UNKNOWN");

  const unknown = expectedCompletionArtifactV1(
    "npx tsx scripts/report-batch-run-registry-intake-v1.ts",
  );
  assert.equal(unknown.expected_completion_artifact, null);
  assert.equal(unknown.expected_completion_artifact_epistemic, "UNKNOWN");
});

test("live HEAD: queue splits discovery; empty executable set emits proof", async () => {
  const discovery = await discoverExecutiveWorkV1({ rootDir: REPO_ROOT });
  const queue = buildExecutiveWorkQueueFromSnapshotV1(discovery);
  assert.equal(queue.ranking_performed, false);
  assert.equal(queue.dispatch_invoked, false);
  assert.equal(queue.scale_counts.discovered_work, discovery.work.length);
  assert.equal(queue.executable_work.length, discovery.executable_work.length);
  assert.deepEqual(
    queue.blocked_work.map((row) => row.work_id),
    discovery.work.filter((row) => row.executable === false).map((row) => row.work_id),
  );
  if (queue.executable_work.length === 0) {
    assert.ok(queue.empty_executable_queue_proof);
    assert.equal(queue.empty_executable_queue_proof?.epistemic, "PROVEN");
    assert.deepEqual(
      queue.empty_executable_queue_proof?.per_item.map((row) => row.work_id),
      queue.blocked_work.map((row) => row.work_id),
    );
    for (const row of queue.blocked_work) {
      assert.equal(typeof row.blocker_class, "string");
      assert.equal(typeof row.smallest_change, "string");
      assert.equal(typeof row.authority_required, "string");
    }
  } else {
    assert.equal(queue.empty_executable_queue_proof, null);
    for (const row of queue.executable_work) {
      assert.ok(row.exact_command.length > 0);
      assert.equal(typeof row.authority, "string");
    }
    const first = queue.executable_work[0];
    if (discovery.work.some((w) => w.work_id === "ap_model_first_evidence" && w.executable)) {
      assert.equal(first?.work_id, "ap_model_first_evidence");
      assert.equal(first?.exact_command, AP_EVIDENCE_CMD);
    }
  }
});

test("discoverExecutiveWorkQueueV1 matches snapshot builder on live HEAD", async () => {
  const live = await discoverExecutiveWorkQueueV1({ rootDir: REPO_ROOT });
  assert.equal(live.contract, EXECUTIVE_WORK_QUEUE_CONTRACT_V1);
  assert.equal(live.read_only, true);
  assert.equal(live.ranking_performed, false);
});
