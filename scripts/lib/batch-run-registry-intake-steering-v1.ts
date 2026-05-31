/**
 * Command Center steering — prefer proven active planning run-registries over
 * generic closed-batch dispatch when universal intake proves an open wedge batch.
 * Read-only; no mutation authorization.
 */

import {
  BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1,
} from "./batch-run-registry-intake-command-center-v1";
import type {
  BatchRunRegistryIntakeReportV1,
  BatchRunRegistryIntakeWedgeRowV1,
} from "./batch-run-registry-intake-v1";
import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import { BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1 } from "./buckparts-batch-production-operating-checklist-v1";

export const BATCH_RUN_REGISTRY_INTAKE_STEERING_STATUS_V1 = "ACTIVE_PLANNING" as const;

export type BatchRunRegistryIntakeSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  active_planning_wedges: BatchRunRegistryIntakeWedgeRowV1[];
  demoted_subsystem: string;
  demoted_exact_command: string;
  mutation_block_reasons: string[];
};

export function listActivePlanningRunRegistryWedgesV1(
  intake: Pick<BatchRunRegistryIntakeReportV1, "wedges">,
): BatchRunRegistryIntakeWedgeRowV1[] {
  return intake.wedges.filter(
    (row) =>
      row.run_registry_status === "PROVEN_PLANNING_RUN_REGISTRY" && row.closeout_complete === false,
  );
}

function summarizeClosedRunRegistryWedgesV1(
  intake: Pick<BatchRunRegistryIntakeReportV1, "wedges">,
): string[] {
  return intake.wedges
    .filter(
      (row) =>
        row.run_registry_status === "PROVEN_CLOSED" ||
        row.closeout_complete === true ||
        row.run_registry_status === "PROVEN_PRESENT_NOT_CLOSED",
    )
    .map((row) => {
      const closeout =
        row.closeout_complete === true
          ? "closeout_complete=true"
          : row.closeout_complete === false
            ? "closeout_complete=false"
            : "closeout_complete=UNKNOWN";
      return `${row.wedge} ${row.run_registry_status} (${closeout})`;
    });
}

function formatActivePlanningWedgePhraseV1(row: BatchRunRegistryIntakeWedgeRowV1): string {
  const runId = row.run_id ?? "UNKNOWN";
  const path = row.run_registry_rel_path ?? "UNKNOWN";
  return `${row.wedge} proven planning run-registry (run_id=${runId}; path=${path})`;
}

export function resolveBatchRunRegistryIntakeSteeringOverrideV1(args: {
  intake: Pick<
    BatchRunRegistryIntakeReportV1,
    "wedges" | "mutation_authorized" | "recommended_next_action" | "ap_run_registry_status"
  >;
  dispatch: BatchProductionOperatingDispatchV1;
  brainStopTheLine: boolean;
}): BatchRunRegistryIntakeSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;

  const activePlanningWedges = listActivePlanningRunRegistryWedgesV1(args.intake);
  if (activePlanningWedges.length === 0) return null;
  if (args.intake.mutation_authorized !== false) return null;

  const activePhrase = activePlanningWedges.map(formatActivePlanningWedgePhraseV1).join("; ");
  const closedSummaries = summarizeClosedRunRegistryWedgesV1(args.intake);
  const closedPhrase =
    closedSummaries.length > 0 ? closedSummaries.join("; ") : "no other wedge run-registry closeout proven on intake";

  const demoted_subsystem = args.dispatch.selected_subsystem;
  const demoted_exact_command = args.dispatch.exact_command;

  return {
    next_best_action:
      `BATCH RUN-REGISTRY [${BATCH_RUN_REGISTRY_INTAKE_STEERING_STATUS_V1}]: ${activePhrase} — ` +
      `${closedPhrase}. Continue read-only batch checklist / apply-plan discovery; mutation unauthorized. ` +
      `Verify ${BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1}.`,
    why_this_action: args.intake.recommended_next_action,
    next_move_command: BATCH_RUN_REGISTRY_INTAKE_SOURCE_COMMAND_V1,
    active_planning_wedges: activePlanningWedges,
    demoted_subsystem,
    demoted_exact_command,
    mutation_block_reasons: [
      "batch_run_registry_intake_v1:mutation_authorized=false",
      "active_planning_run_registry:closeout_complete=false",
      `demoted_closed_batch_dispatch:${args.dispatch.dispatch_status}`,
      `checklist_inspect_read_only:${BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1}`,
    ],
  };
}
