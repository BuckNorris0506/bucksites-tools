import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  listActivePlanningRunRegistryWedgesV1,
  resolveBatchRunRegistryIntakeSteeringOverrideV1,
} from "./batch-run-registry-intake-steering-v1";
import type { BatchRunRegistryIntakeReportV1 } from "./batch-run-registry-intake-v1";
import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";

function dispatchFixture(): BatchProductionOperatingDispatchV1 {
  return {
    contract: "batch_production_operating_dispatch_v1",
    read_only: true,
    data_mutation: false,
    runtime_status: "OK",
    dispatch_status: "READY",
    current_stage_id: null,
    next_stage_id: "lane_selected",
    selected_subsystem: "demand_to_coverage_next_lane",
    exact_command: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
    command_surface: "cursor_agent",
    allowed_mutations: ["batch_planning_read_only"],
    forbidden_mutations: ["csv_apply"],
    owner_approval_required: false,
    mutation_allowed: false,
    proof_required_before_execution: "read-only",
    expected_artifact_paths: [],
    success_transition: "ok",
    failure_transition: "blocked",
    why_this_is_next:
      "Closed batch with full apply/parity/closeout proof — return to demand-to-coverage for the next wedge or batch candidate (read-only planning first).",
    blocked_reasons: [],
    expansion_blocked: false,
    derived_from_checklist_contract: "batch_production_operating_checklist_v1",
  };
}

function intakeFixture(
  overrides: Partial<BatchRunRegistryIntakeReportV1> = {},
): Pick<
  BatchRunRegistryIntakeReportV1,
  "wedges" | "mutation_authorized" | "recommended_next_action" | "ap_run_registry_status"
> {
  return {
    ap_run_registry_status: "PROVEN_CLOSED",
    mutation_authorized: false,
    recommended_next_action: "Fridge buyer-path planning run-registry is on disk and validated.",
    wedges: [
      {
        wedge: "air_purifier",
        run_registry_rel_path: "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
        run_registry_status: "PROVEN_CLOSED",
        closeout_complete: true,
        run_id: "ap-batch-v2-2026-05-24",
      },
      {
        wedge: "refrigerator_water",
        run_registry_rel_path:
          "data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json",
        run_registry_status: "PROVEN_PLANNING_RUN_REGISTRY",
        closeout_complete: false,
        run_id: "fridge-buyer-path-batch-run-v1-0fec4a7b623a",
      },
    ],
    ...overrides,
  };
}

describe("batch run-registry intake steering", () => {
  test("listActivePlanningRunRegistryWedgesV1 finds non-closed planning wedges", () => {
    const active = listActivePlanningRunRegistryWedgesV1(intakeFixture());
    assert.equal(active.length, 1);
    assert.equal(active[0]!.wedge, "refrigerator_water");
  });

  test("resolveBatchRunRegistryIntakeSteeringOverrideV1 demotes closed-batch dispatch", () => {
    const override = resolveBatchRunRegistryIntakeSteeringOverrideV1({
      intake: intakeFixture(),
      dispatch: dispatchFixture(),
      brainStopTheLine: false,
    });
    assert.ok(override);
    assert.ok(override!.next_best_action.startsWith("BATCH RUN-REGISTRY [ACTIVE_PLANNING]:"));
    assert.match(override!.next_best_action, /refrigerator_water proven planning run-registry/i);
    assert.match(override!.next_best_action, /air_purifier PROVEN_CLOSED/i);
    assert.match(override!.next_best_action, /mutation unauthorized/i);
    assert.equal(override!.next_move_command, "npm run buckparts:batch-run-registry-intake");
    assert.equal(
      override!.next_best_action.includes("Closed batch with full apply/parity/closeout proof"),
      false,
    );
  });

  test("returns null when no active planning wedge", () => {
    const override = resolveBatchRunRegistryIntakeSteeringOverrideV1({
      intake: intakeFixture({
        wedges: [
          {
            wedge: "air_purifier",
            run_registry_rel_path: "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json",
            run_registry_status: "PROVEN_CLOSED",
            closeout_complete: true,
            run_id: "ap-batch-v2-2026-05-24",
          },
          {
            wedge: "refrigerator_water",
            run_registry_rel_path: null,
            run_registry_status: "APPROVED_FOR_PLANNING_BUT_RUN_REGISTRY_MISSING",
            closeout_complete: null,
            run_id: null,
          },
        ],
      }),
      dispatch: dispatchFixture(),
      brainStopTheLine: false,
    });
    assert.equal(override, null);
  });

  test("returns null on brain stop-the-line", () => {
    const override = resolveBatchRunRegistryIntakeSteeringOverrideV1({
      intake: intakeFixture(),
      dispatch: dispatchFixture(),
      brainStopTheLine: true,
    });
    assert.equal(override, null);
  });
});
