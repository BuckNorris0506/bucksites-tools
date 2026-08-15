import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 } from "./ap-model-first-evidence-queue-v1";
import {
  buildCanonicalFinalOperatingDecisionV1,
  CANONICAL_STEERING_PRECEDENCE_V1,
  existingCanonicalSourceForWorkQueueItemV1,
  selectCanonicalSteeringWinnerV1,
  workQueueItemMayBecomeCanonicalCandidateV1,
  type SteeringCandidateInputV1,
} from "./buckparts-canonical-final-operating-decision-v1";
import { lookupDispatchAllowlistEntryV1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import { discoverExecutiveWorkQueueV1 } from "./buckparts-executive-work-queue-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";

const REPO_ROOT = process.cwd();
const CANONICAL_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-canonical-final-operating-decision-v1.ts"),
  "utf8",
);
const CC_SOURCE = readFileSync(path.join(REPO_ROOT, "scripts/report-buckparts-command-center.ts"), "utf8");
const STEERING_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/buckparts-model-first-steering-v1.ts"),
  "utf8",
);

const AP_CMD = AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1;
const DEMAND_CMD = "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";

const PRECEDENCE_FROZEN: readonly string[] = [
  "brain_stop_the_line",
  "issue_registry_tier_0",
  "issue_registry_reaudit",
  "refrigerator_model_first",
  "model_first",
  "demand_selected_correctness_risks",
  "demand_to_coverage",
  "universal_batch_lifecycle",
  "fridge_apply_plan_approval",
  "fridge_apply_plan_approved_planning",
  "fridge_apply_plan_proposal",
  "batch_run_registry_intake",
  "batch_dispatch",
  "repairclinic_affiliate_suppression",
  "root_resolve",
];

function modelFirstFromWorkQueue(): SteeringCandidateInputV1 {
  return {
    source: "model_first",
    next_best_action: "MODEL-FIRST STEERING [READY]: work-queue fixture",
    why_this_action: "executable Work Queue item ap_model_first_evidence",
    exact_command: AP_CMD,
    active: true,
  };
}

test("precedence list is unchanged — no second selector source", () => {
  assert.deepEqual([...CANONICAL_STEERING_PRECEDENCE_V1], [...PRECEDENCE_FROZEN]);
  assert.equal(CANONICAL_STEERING_PRECEDENCE_V1.includes("work_queue" as never), false);
  assert.equal(CANONICAL_STEERING_PRECEDENCE_V1.includes("executive_work_queue" as never), false);
});

test("no Outcome Join steering in bind path", () => {
  assert.equal(CANONICAL_SOURCE.includes("phase4_outcome"), false);
  assert.equal(CANONICAL_SOURCE.includes("outcome_join"), false);
  assert.equal(STEERING_SOURCE.includes("phase4_outcome"), false);
  assert.equal(STEERING_SOURCE.includes("outcome_join"), false);
  assert.doesNotMatch(CC_SOURCE, /workQueue.*phase4_outcome|phase4_outcome.*workQueue/);
});

test("no mutation / no dispatch authority in canonical builder", () => {
  const d = buildCanonicalFinalOperatingDecisionV1({
    generated_at: "2026-08-15T00:00:00.000Z",
    candidates: [modelFirstFromWorkQueue()],
  });
  assert.equal(d.read_only, true);
  assert.equal(d.data_mutation, false);
  assert.equal(d.mutation_authorized, false);
  assert.equal(d.mutation_posture.mutation_allowed, false);
});

test("non-executable work never becomes a candidate", () => {
  assert.equal(
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: "ap_model_first_evidence",
      executable: false,
      exact_command: AP_CMD,
    }),
    false,
  );
  assert.equal(
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: "safe_buyer_path_rescue",
      executable: false,
      exact_command: null,
    }),
    false,
  );
  assert.equal(existingCanonicalSourceForWorkQueueItemV1("safe_buyer_path_rescue"), null);
  assert.equal(existingCanonicalSourceForWorkQueueItemV1("ap_demand_selected_open_batch"), null);
});

test("unmapped work_id does not invent a canonical source", () => {
  assert.equal(existingCanonicalSourceForWorkQueueItemV1("invented_work"), null);
  assert.equal(
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: "invented_work",
      executable: true,
      exact_command: AP_CMD,
    }),
    false,
  );
});

test("executable mapped work may become a canonical candidate when allowlisted", () => {
  assert.equal(existingCanonicalSourceForWorkQueueItemV1("ap_model_first_evidence"), "model_first");
  assert.equal(existingCanonicalSourceForWorkQueueItemV1("ap_model_first_mapping_review"), "model_first");
  assert.ok(lookupDispatchAllowlistEntryV1(AP_CMD));
  assert.equal(
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: "ap_model_first_evidence",
      executable: true,
      exact_command: AP_CMD,
    }),
    true,
  );
  const d = buildCanonicalFinalOperatingDecisionV1({
    generated_at: "2026-08-15T00:00:00.000Z",
    candidates: [
      {
        source: "batch_dispatch",
        next_best_action: "BATCH DISPATCH [READY]: fixture",
        why_this_action: "lower precedence",
        exact_command: DEMAND_CMD,
        active: true,
      },
      modelFirstFromWorkQueue(),
    ],
  });
  assert.equal(d.steering_override_source, "model_first");
  assert.equal(d.exact_command, AP_CMD);
  assert.equal(d.command_executable, true);
  assert.equal(d.dispatch_status, "READY");
  assert.ok(lookupDispatchAllowlistEntryV1(d.exact_command));
});

test("Work Queue cannot bypass canonical selector — higher-precedence existing work still wins", () => {
  const { winner, competing } = selectCanonicalSteeringWinnerV1([
    {
      source: "brain_stop_the_line",
      next_best_action: "STOP THE LINE",
      why_this_action: "brain",
      exact_command: "",
      active: true,
    },
    modelFirstFromWorkQueue(),
  ]);
  assert.equal(winner.source, "brain_stop_the_line");
  assert.equal(competing.selected_source, "brain_stop_the_line");
  assert.equal(
    competing.candidates.find((c) => c.source === "model_first")?.selected,
    false,
  );

  const fridgeWins = buildCanonicalFinalOperatingDecisionV1({
    generated_at: "2026-08-15T00:00:00.000Z",
    candidates: [
      {
        source: "refrigerator_model_first",
        next_best_action: "REFRIGERATOR MODEL-FIRST [READY]: fixture",
        why_this_action: "fridge outranks AP",
        exact_command: "npx tsx scripts/report-refrigerator-model-first-batch-resolver-v1.ts",
        active: true,
      },
      modelFirstFromWorkQueue(),
    ],
  });
  assert.equal(fridgeWins.steering_override_source, "refrigerator_model_first");
  assert.notEqual(fridgeWins.exact_command, AP_CMD);
});

test("canonical command must remain allowlisted — non-allowlisted Work Queue command refuses", () => {
  const d = buildCanonicalFinalOperatingDecisionV1({
    generated_at: "2026-08-15T00:00:00.000Z",
    candidates: [
      {
        source: "model_first",
        next_best_action: "MODEL-FIRST STEERING [READY]: bad command",
        why_this_action: "fixture",
        exact_command: "npx tsx scripts/not-allowlisted-work-queue.ts",
        active: true,
      },
    ],
  });
  assert.equal(d.command_executable, false);
  assert.equal(d.dispatch_status, "REFUSE_NO_EXECUTABLE");
  assert.ok(d.blockers.some((b) => b.includes("not allowlisted")));
  assert.equal(
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: "ap_model_first_evidence",
      executable: true,
      exact_command: "npx tsx scripts/not-allowlisted-work-queue.ts",
    }),
    false,
  );
});

test("Work Queue is not a competing source in the candidate list", () => {
  const { competing } = selectCanonicalSteeringWinnerV1([modelFirstFromWorkQueue()]);
  assert.equal(
    competing.candidates.some((c) => String(c.source).includes("work_queue")),
    false,
  );
});

test("live HEAD: executable Work Queue may enter existing model_first; cannot outrank higher sources", async () => {
  const queue = await discoverExecutiveWorkQueueV1({ rootDir: REPO_ROOT });
  const first = queue.executable_work[0];
  const report = await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });
  const canon = report.command_center_v2.canonical_final_operating_decision_v1;
  assert.ok(canon);
  assert.equal(canon.read_only, true);
  assert.equal(canon.data_mutation, false);
  assert.equal(canon.mutation_authorized, false);
  const selected = canon.steering_override_source;
  const selectedRank = CANONICAL_STEERING_PRECEDENCE_V1.indexOf(selected);
  const modelFirstRank = CANONICAL_STEERING_PRECEDENCE_V1.indexOf("model_first");
  if (
    first &&
    workQueueItemMayBecomeCanonicalCandidateV1({
      work_id: first.work_id,
      executable: true,
      exact_command: first.exact_command,
    })
  ) {
    const modelFirst = canon.competing_steering_candidates_v1.candidates.find(
      (c) => c.source === "model_first" && c.active,
    );
    assert.ok(modelFirst);
    assert.equal(modelFirst?.exact_command, AP_CMD);
    assert.ok(lookupDispatchAllowlistEntryV1(modelFirst?.exact_command ?? ""));
    if (selected === "model_first") {
      assert.equal(canon.exact_command, AP_CMD);
      assert.equal(canon.command_executable, true);
      assert.equal(canon.dispatch_status, "READY");
    } else {
      assert.ok(selectedRank >= 0 && selectedRank < modelFirstRank);
    }
  }
});
