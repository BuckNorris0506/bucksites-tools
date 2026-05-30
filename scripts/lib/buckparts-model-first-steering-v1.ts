/**
 * Command Center steering override — prefer model-first evidence over filter-first
 * batch-v3 aggregation when repo conditions are proven. Read-only; no mutation.
 */

import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  type ApModelFirstEvidenceQueueReportV1,
} from "./ap-model-first-evidence-queue-v1";
import type { AirPurifierWeakBuyerPathAuditReportV1 } from "./air-purifier-weak-buyer-path-audit-v1";
import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import { AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1 } from "./ap-batch-v3-run-instantiation-v1";

export type ModelFirstSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  demoted_subsystem: string;
  demoted_exact_command: string;
  mutation_block_reasons: string[];
};

export function resolveModelFirstSteeringOverrideV1(args: {
  queue: ApModelFirstEvidenceQueueReportV1;
  weakBuyerPathAudit: AirPurifierWeakBuyerPathAuditReportV1;
  dispatch: BatchProductionOperatingDispatchV1;
  brainStopTheLine: boolean;
}): ModelFirstSteeringOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (!args.queue.steering_primary_eligible) return null;
  if (args.queue.candidate_count === 0) return null;

  const top = args.queue.top_candidates[0];
  if (!top) return null;

  const demoted_subsystem = args.queue.demoted_batch_subsystem ?? "ap_batch_v3_aggregation_review";
  const demoted_exact_command =
    args.dispatch.selected_subsystem === "ap_batch_v3_aggregation_review"
      ? args.dispatch.exact_command
      : AP_BATCH_V3_AGENT_RESULTS_AGGREGATOR_COMMAND_V1;

  const anchorModels =
    top.sample_model_slugs.length > 0
      ? top.sample_model_slugs.slice(0, 3).join(", ")
      : "see queue top_candidates";

  return {
    next_best_action:
      `MODEL-FIRST STEERING [READY]: Collect read-only model-first evidence for ${top.filter_slug} (${top.brand_slug}, ${String(top.model_count_using_filter)} models) — start from ${anchorModels} official support pages, then map to filter SKU and verified buyer path. Demoted: ${demoted_subsystem} (filter-first batch-v3 aggregation is deprecated for new product addition — legacy read-only triage only).`,
    why_this_action: `${args.queue.why_model_first} ${args.queue.old_filter_first_drift_risk}`,
    next_move_command: AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1,
    demoted_subsystem,
    demoted_exact_command,
    mutation_block_reasons: [
      ...args.queue.forbidden_mutations.map((m) => `forbidden:${m}`),
      `demoted_not_removed:${demoted_subsystem}`,
      `evidence_artifacts_only:${AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}`,
    ],
  };
}
