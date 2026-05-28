import assert from "node:assert/strict";
import test from "node:test";

import { buildApModelFirstEvidenceQueueV1Report } from "./ap-model-first-evidence-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./air-purifier-weak-buyer-path-audit-v1";
import { buildApBatchV3RunInstantiationV1Report } from "./ap-batch-v3-run-instantiation-v1";
import { buildBatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import { buildBatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import { resolveModelFirstSteeringOverrideV1 } from "./buckparts-model-first-steering-v1";

const REPO_ROOT = process.cwd();

test("resolveModelFirstSteeringOverrideV1 returns override when steering primary eligible", async () => {
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    rootDir: REPO_ROOT,
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const instantiation = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
    ap_batch_v3_run_instantiation: instantiation,
  });

  const override = resolveModelFirstSteeringOverrideV1({
    queue,
    weakBuyerPathAudit: weak,
    dispatch,
    brainStopTheLine: false,
  });

  if (queue.steering_primary_eligible) {
    assert.ok(override);
    assert.ok(override!.next_best_action.startsWith("MODEL-FIRST STEERING"));
    assert.ok(override!.next_move_command.includes("report-ap-model-first-evidence-queue-v1"));
    assert.equal(override!.demoted_subsystem, "ap_batch_v3_aggregation_review");
    assert.ok(
      override!.next_best_action.includes("winix-carbon-116131"),
      "steering should target next active candidate after holmes-hapf30 demotion",
    );
    assert.ok(!override!.next_best_action.includes("holmes-hapf30"));
  }
});

test("command center next_best_action prefers model-first over batch aggregation when eligible", async () => {
  const report = await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });
  const queue = report.command_center_v2.ap_model_first_evidence_queue_v1;
  const dispatch = report.command_center_v2.batch_production_operating_dispatch_v1;

  if (queue?.steering_primary_eligible) {
    assert.ok(report.next_best_action.startsWith("MODEL-FIRST STEERING"));
    assert.notEqual(report.next_best_action, `BATCH DISPATCH [READY]: ${dispatch.why_this_is_next}`);
    assert.equal(dispatch.selected_subsystem, "ap_batch_v3_aggregation_review");
    const aggJob = report.command_center_v2.agent_control_plane_v1?.all_jobs.find(
      (j) => j.agent_lane === "ap_batch_v3_aggregation_review",
    );
    assert.ok(aggJob);
    assert.equal(aggJob!.eligible_now, false);
    assert.ok(aggJob!.blocked_reasons.includes("demoted_model_first_steering_primary"));
  }
});
