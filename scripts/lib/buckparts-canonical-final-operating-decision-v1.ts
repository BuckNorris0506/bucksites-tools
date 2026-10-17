/**
 * Phase 2 — Canonical final operating decision.
 *
 * Single owner-facing authority for next_best_action + dispatch binding.
 * Precedence is explicit and tested (do not reorder silently).
 *
 * Precedence (first match wins among active candidates):
 *  0. brain_stop_the_line          — highest; cannot be overwritten
 *  1. issue_registry_tier_0
 *  2. issue_registry_reaudit
 *  3. refrigerator_model_first
 *  4. model_first
 *  5. demand_selected_correctness_risks
 *  6. demand_to_coverage
 *  7. universal_batch_lifecycle
 *  8. fridge_apply_plan_approval
 *  9. fridge_apply_plan_approved_planning
 * 10. fridge_apply_plan_proposal
 * 11. batch_run_registry_intake
 * 12. batch_dispatch
 * 13. repairclinic_affiliate_suppression  — baseline rewrite of root_resolve
 * 14. root_resolve                        — only when it produced the final NBA
 *
 * Command binding: the winning candidate owns exact_command. Allowlist metadata
 * is the authority for owner_review_required (never regex). OWNER_REVIEW_REQUIRED
 * is never normalized to READY; command_executable=false when owner review required.
 */

import type { FactorySteeringOverrideSourceV1 } from "./customer-steering-comparison-v1";
import {
  ALLOWLIST_EXACT_COMMANDS_V1,
  lookupDispatchAllowlistEntryV1,
  type DispatchCommandKindV1,
} from "./buckparts-command-center-dispatch-allowlist-v1";

export const CANONICAL_FINAL_OPERATING_DECISION_CONTRACT_V1 =
  "canonical_final_operating_decision_v1" as const;

export const CANONICAL_FINAL_OPERATING_DECISION_CC_JQ_PATH_V1 =
  ".command_center_v2.canonical_final_operating_decision_v1" as const;

export type CanonicalSteeringSourceV1 =
  | FactorySteeringOverrideSourceV1
  | "brain_stop_the_line"
  | "repairclinic_affiliate_suppression";

export const CANONICAL_STEERING_PRECEDENCE_V1: readonly CanonicalSteeringSourceV1[] = [
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
] as const;

export type CanonicalDispatchStatusV1 =
  | "READY"
  | "OWNER_REVIEW_REQUIRED"
  | "REFUSE_NO_EXECUTABLE"
  | "BLOCKED"
  | "UNKNOWN";

export type CompetingSteeringCandidateV1 = {
  source: CanonicalSteeringSourceV1;
  next_best_action: string;
  why_this_action: string;
  exact_command: string;
  selected_subsystem: string;
  dispatch_status: CanonicalDispatchStatusV1;
  owner_review_required: boolean;
  blockers: string[];
  active: boolean;
  precedence_rank: number;
  selected: boolean;
};

export type CompetingSteeringCandidatesV1 = {
  contract: "competing_steering_candidates_v1";
  read_only: true;
  data_mutation: false;
  precedence_policy: "documented_canonical_steering_precedence_v1";
  candidates: CompetingSteeringCandidateV1[];
  selected_source: CanonicalSteeringSourceV1;
};

export type CanonicalFinalOperatingDecisionV1 = {
  contract: typeof CANONICAL_FINAL_OPERATING_DECISION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CANONICAL_FINAL_OPERATING_DECISION_CC_JQ_PATH_V1;
  generated_at: string;
  next_best_action: string;
  why_this_action: string;
  steering_override_source: CanonicalSteeringSourceV1;
  selected_subsystem: string;
  exact_command: string;
  command_executable: boolean;
  dispatch_status: CanonicalDispatchStatusV1;
  owner_review_required: boolean;
  command_kind: DispatchCommandKindV1 | "none";
  artifact_write_behavior: "required" | "optional" | "forbidden_with_no_artifact" | "none";
  no_artifact_allowed: boolean;
  mutation_posture: {
    read_only: true;
    data_mutation: false;
    mutation_allowed: false;
  };
  blockers: string[];
  competing_steering_candidates_v1: CompetingSteeringCandidatesV1;
  operator_can_be_away_status: "NOT_READY" | "READY_FOR_AUTONOMOUS_READ_ONLY";
  allowlisted_commands: readonly string[];
};

/** Candidate owns its command fields; no post-selection next_move_command splice. */
export type SteeringCandidateInputV1 = {
  source: CanonicalSteeringSourceV1;
  next_best_action: string;
  why_this_action: string;
  exact_command?: string;
  /** @deprecated use exact_command — kept for transitional call sites */
  next_move_command?: string;
  selected_subsystem?: string;
  blockers?: string[];
  active: boolean;
};

/**
 * Closed map: executable Work Queue items may activate an EXISTING source only.
 * Unmapped work_ids are not candidates. This is not a second selector.
 */
const WORK_QUEUE_EXISTING_SOURCE_V1: Readonly<Record<string, CanonicalSteeringSourceV1>> = {
  ap_model_first_evidence: "model_first",
  ap_model_first_mapping_review: "model_first",
};

export function existingCanonicalSourceForWorkQueueItemV1(
  work_id: string,
): CanonicalSteeringSourceV1 | null {
  return WORK_QUEUE_EXISTING_SOURCE_V1[work_id] ?? null;
}

export function workQueueItemMayBecomeCanonicalCandidateV1(args: {
  work_id: string;
  executable: boolean;
  exact_command: string | null;
}): boolean {
  if (args.executable !== true) return false;
  const cmd = (args.exact_command ?? "").trim();
  if (!cmd) return false;
  if (existingCanonicalSourceForWorkQueueItemV1(args.work_id) === null) return false;
  return lookupDispatchAllowlistEntryV1(cmd) !== null;
}

function rankOf(source: CanonicalSteeringSourceV1): number {
  const i = CANONICAL_STEERING_PRECEDENCE_V1.indexOf(source);
  return i === -1 ? 999 : i;
}

function candidateExactCommand(c: SteeringCandidateInputV1): string {
  return (c.exact_command ?? c.next_move_command ?? "").trim();
}

/**
 * Bind the winning candidate's exact_command through allowlist metadata.
 * owner_review_required ⇒ command_executable=false, dispatch_status=OWNER_REVIEW_REQUIRED.
 * Never normalizes OWNER_REVIEW_REQUIRED / BLOCKED / UNKNOWN / REFUSED → READY.
 */
export function bindCanonicalDispatchCommandV1(args: {
  exact_command: string;
  steering_override_source: CanonicalSteeringSourceV1;
  selected_subsystem_hint?: string;
  blockers?: string[];
}): {
  exact_command: string;
  command_executable: boolean;
  dispatch_status: CanonicalDispatchStatusV1;
  selected_subsystem: string;
  owner_review_required: boolean;
  command_kind: DispatchCommandKindV1 | "none";
  artifact_write_behavior: "required" | "optional" | "forbidden_with_no_artifact" | "none";
  no_artifact_allowed: boolean;
  blockers: string[];
} {
  const blockers = [...(args.blockers ?? [])];
  const cmd = (args.exact_command ?? "").trim();
  const meta = cmd ? lookupDispatchAllowlistEntryV1(cmd) : null;
  const owner_review_required = meta?.owner_review_required === true;
  const selected_subsystem =
    meta?.selected_subsystem ??
    args.selected_subsystem_hint ??
    `steering:${args.steering_override_source}`;

  if (!cmd) {
    blockers.push("no_executable_command: winning candidate has empty exact_command");
    return {
      exact_command: "",
      command_executable: false,
      dispatch_status: "REFUSE_NO_EXECUTABLE",
      selected_subsystem,
      owner_review_required: false,
      command_kind: "none",
      artifact_write_behavior: "none",
      no_artifact_allowed: false,
      blockers,
    };
  }

  if (!meta) {
    blockers.push(
      "no_executable_command: exact_command is not allowlisted for dispatch (refuse; do not substitute another lane)",
    );
    return {
      exact_command: cmd,
      command_executable: false,
      dispatch_status: "REFUSE_NO_EXECUTABLE",
      selected_subsystem,
      owner_review_required: false,
      command_kind: "none",
      artifact_write_behavior: "none",
      no_artifact_allowed: false,
      blockers,
    };
  }

  if (owner_review_required) {
    blockers.push(
      "owner_review_required: allowlist metadata forbids autonomous dispatch execution",
    );
    return {
      exact_command: cmd,
      command_executable: false,
      dispatch_status: "OWNER_REVIEW_REQUIRED",
      selected_subsystem,
      owner_review_required: true,
      command_kind: meta.command_kind,
      artifact_write_behavior: meta.artifact_write_behavior,
      no_artifact_allowed: meta.no_artifact_allowed,
      blockers,
    };
  }

  return {
    exact_command: cmd,
    command_executable: true,
    dispatch_status: "READY",
    selected_subsystem,
    owner_review_required: false,
    command_kind: meta.command_kind,
    artifact_write_behavior: meta.artifact_write_behavior,
    no_artifact_allowed: meta.no_artifact_allowed,
    blockers,
  };
}

export function selectCanonicalSteeringWinnerV1(inputs: SteeringCandidateInputV1[]): {
  winner: SteeringCandidateInputV1;
  competing: CompetingSteeringCandidatesV1;
} {
  const active = inputs.filter((c) => c.active && c.next_best_action.trim().length > 0);
  const sorted = [...active].sort((a, b) => rankOf(a.source) - rankOf(b.source));
  const winner =
    sorted[0] ??
    ({
      source: "root_resolve" as const,
      next_best_action: "",
      why_this_action: "No actionable queue.",
      exact_command: "",
      active: true,
    } satisfies SteeringCandidateInputV1);

  const candidates: CompetingSteeringCandidateV1[] = inputs.map((c) => {
    const exact = candidateExactCommand(c);
    const bound = bindCanonicalDispatchCommandV1({
      exact_command: exact,
      steering_override_source: c.source,
      selected_subsystem_hint: c.selected_subsystem,
      blockers: c.blockers,
    });
    return {
      source: c.source,
      next_best_action: c.next_best_action,
      why_this_action: c.why_this_action,
      exact_command: bound.exact_command,
      selected_subsystem: bound.selected_subsystem,
      dispatch_status: bound.dispatch_status,
      owner_review_required: bound.owner_review_required,
      blockers: bound.blockers,
      active: c.active,
      precedence_rank: rankOf(c.source),
      selected: false,
    };
  });

  let sawSelected = false;
  for (const c of candidates) {
    if (
      !sawSelected &&
      c.active &&
      c.source === winner.source &&
      c.next_best_action === winner.next_best_action
    ) {
      c.selected = true;
      sawSelected = true;
    } else {
      c.selected = false;
    }
  }

  return {
    winner,
    competing: {
      contract: "competing_steering_candidates_v1",
      read_only: true,
      data_mutation: false,
      precedence_policy: "documented_canonical_steering_precedence_v1",
      candidates: candidates.sort((a, b) => a.precedence_rank - b.precedence_rank),
      selected_source: winner.source,
    },
  };
}

export function buildCanonicalFinalOperatingDecisionV1(args: {
  generated_at: string;
  candidates: SteeringCandidateInputV1[];
  mutating_block_reasons?: string[];
  allowlisted_commands?: readonly string[];
}): CanonicalFinalOperatingDecisionV1 {
  const { winner, competing } = selectCanonicalSteeringWinnerV1(args.candidates);
  const exact = candidateExactCommand(winner);
  const bound = bindCanonicalDispatchCommandV1({
    exact_command: exact,
    steering_override_source: winner.source,
    selected_subsystem_hint: winner.selected_subsystem,
    blockers: [...(winner.blockers ?? []), ...(args.mutating_block_reasons ?? [])],
  });

  const next_best_action = winner.next_best_action;
  const operator_can_be_away_status: CanonicalFinalOperatingDecisionV1["operator_can_be_away_status"] =
    next_best_action.length === 0 ? "NOT_READY" : "READY_FOR_AUTONOMOUS_READ_ONLY";

  // Preserve bound.dispatch_status exactly — never coerce to READY.
  return {
    contract: CANONICAL_FINAL_OPERATING_DECISION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CANONICAL_FINAL_OPERATING_DECISION_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    next_best_action,
    why_this_action: winner.why_this_action,
    steering_override_source: winner.source,
    selected_subsystem: bound.selected_subsystem,
    exact_command: bound.exact_command,
    command_executable: bound.command_executable,
    dispatch_status: bound.dispatch_status,
    owner_review_required: bound.owner_review_required,
    command_kind: bound.command_kind,
    artifact_write_behavior: bound.artifact_write_behavior,
    no_artifact_allowed: bound.no_artifact_allowed,
    mutation_posture: {
      read_only: true,
      data_mutation: false,
      mutation_allowed: false,
    },
    blockers: bound.blockers,
    competing_steering_candidates_v1: competing,
    operator_can_be_away_status,
    allowlisted_commands: args.allowlisted_commands ?? ALLOWLIST_EXACT_COMMANDS_V1,
  };
}

export function demoteAdvisoryBrainV1<T extends Record<string, unknown>>(args: {
  payload: T;
  canonical_source: string;
  reason: string;
}): T & {
  advisory_only: true;
  non_authoritative: true;
  canonical_source: string;
  demotion_reason: string;
} {
  return {
    ...args.payload,
    advisory_only: true as const,
    non_authoritative: true as const,
    canonical_source: args.canonical_source,
    demotion_reason: args.reason,
  };
}
