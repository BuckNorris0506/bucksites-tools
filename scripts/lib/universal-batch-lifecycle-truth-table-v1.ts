/**
 * Read-only Universal Batch Lifecycle Truth Table — consolidation blueprint only.
 * PROVEN: no CSV, retailer_links, Supabase, public UI, evidence, Netlify, or apply executor.
 */

import type { CommandCenterEfficiencyTruthTableV1 } from "./command-center-efficiency-truth-table-v1";
import { FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1 } from "./command-center-efficiency-truth-table-v1";
import type { BatchRunRegistryIntakeReportV1 } from "./batch-run-registry-intake-v1";
import type { UniversalBatchLifecycleApplyReadinessReportV1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import type { UniversalBatchLifecycleApplyExecutionPlanReportV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import type { UniversalBatchLifecycleMutationAuthorizationReviewReportV1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1 } from "./universal-batch-lifecycle-mutation-authorization-review-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CONTRACT_V1 =
  "universal_batch_lifecycle_truth_table_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_truth_table_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_truth_table_v1'" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_STATE_IDS_V1 = [
  "candidate_discovered",
  "evidence_collected",
  "owner_review_ready",
  "owner_planning_approved",
  "run_registry_created",
  "apply_plan_ready",
  "apply_plan_owner_approved",
  "apply_readiness_unknown",
  "apply_readiness_ready",
  "apply_executed",
  "parity_verified",
  "closed",
] as const;

export type UniversalBatchLifecycleStateIdV1 = (typeof UNIVERSAL_BATCH_LIFECYCLE_STATE_IDS_V1)[number];

export type UniversalBatchLifecycleStateDefV1 = {
  state_id: UniversalBatchLifecycleStateIdV1;
  purpose: string;
  required_inputs: string[];
  mutation_allowed: boolean;
  owner_required: boolean;
  evidence_required: boolean;
  next_if_pass: UniversalBatchLifecycleStateIdV1 | null;
  next_if_fail: UniversalBatchLifecycleStateIdV1 | null;
  next_if_unknown: UniversalBatchLifecycleStateIdV1 | null;
};

export type UniversalBatchWedgeCurrentStateV1 = {
  wedge: "refrigerator_water" | "air_purifier";
  lifecycle_state: UniversalBatchLifecycleStateIdV1;
  alternate_lifecycle_states: UniversalBatchLifecycleStateIdV1[];
  mutation_allowed: false;
  mapping_summary: string;
  proven_mapping_sources: string[];
};

export type UniversalBatchLifecycleStateTransitionV1 = {
  from_state: UniversalBatchLifecycleStateIdV1;
  to_state: UniversalBatchLifecycleStateIdV1;
  trigger: string;
  mutation_required: boolean;
  owner_required: boolean;
  blocked_by_unknown: string | null;
};

export type UniversalBatchLifecycleTruthTableV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_SOURCE_COMMAND_V1;
  lifecycle_states: UniversalBatchLifecycleStateDefV1[];
  current_wedge_states: UniversalBatchWedgeCurrentStateV1[];
  required_state_transitions: UniversalBatchLifecycleStateTransitionV1[];
  redundant_lanes_to_fold: string[];
  lanes_to_keep_as_fields: string[];
  lanes_to_keep_temporarily: string[];
  owner_steps_to_remove_or_demote: string[];
  inherited_lifecycle_mutation_policy: {
    mutation_allowed: false;
    csv_apply_authorized: false;
    retailer_links_mutation_authorized: false;
    supabase_mutation_authorized: false;
    public_ui_mutation_authorized: false;
    buy_link_mutation_authorized: false;
    evidence_write_authorized: false;
    netlify_api_authorized: false;
    owner_planning_approval_scope: "read_only_agent_planning_only";
  };
  one_true_next_state_for_refrigerator_water: UniversalBatchLifecycleStateIdV1;
  one_true_next_command_for_refrigerator_water: string;
  unknowns_blocking_mutation: string[];
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export const UNIVERSAL_BATCH_LIFECYCLE_STATE_DEFS_V1: UniversalBatchLifecycleStateDefV1[] = [
  {
    state_id: "candidate_discovered",
    purpose: "Batch candidate identified from demand/coverage gap — no formal batch artifact yet.",
    required_inputs: ["demand_signal", "coverage_gap_or_model_candidate"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: false,
    next_if_pass: "evidence_collected",
    next_if_fail: "candidate_discovered",
    next_if_unknown: "candidate_discovered",
  },
  {
    state_id: "evidence_collected",
    purpose: "Evidence packet or truth spine rows exist for candidate slugs/models.",
    required_inputs: ["evidence_or_truth_spine_rows"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: true,
    next_if_pass: "owner_review_ready",
    next_if_fail: "candidate_discovered",
    next_if_unknown: "evidence_collected",
  },
  {
    state_id: "owner_review_ready",
    purpose: "Owner review packet is ready; human review of committed live rows before batch proposal.",
    required_inputs: ["owner_review_packet", "normalized_committed_live_rows"],
    mutation_allowed: false,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "owner_planning_approved",
    next_if_fail: "evidence_collected",
    next_if_unknown: "owner_review_ready",
  },
  {
    state_id: "owner_planning_approved",
    purpose: "Owner approved batch scope for planning only — does not authorize production mutation.",
    required_inputs: ["batch_proposal", "owner_planning_approval_status"],
    mutation_allowed: false,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "run_registry_created",
    next_if_fail: "owner_review_ready",
    next_if_unknown: "owner_planning_approved",
  },
  {
    state_id: "run_registry_created",
    purpose: "Formal batch planning or proven run-registry artifact exists on disk.",
    required_inputs: ["run_registry_artifact_rel_path", "run_id"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: true,
    next_if_pass: "apply_plan_ready",
    next_if_fail: "owner_planning_approved",
    next_if_unknown: "run_registry_created",
  },
  {
    state_id: "apply_plan_ready",
    purpose: "Apply-plan proposal artifact is ready for owner review.",
    required_inputs: ["apply_plan_artifact", "planned_change_count", "owner_review_status"],
    mutation_allowed: false,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "apply_plan_owner_approved",
    next_if_fail: "run_registry_created",
    next_if_unknown: "apply_plan_ready",
  },
  {
    state_id: "apply_plan_owner_approved",
    purpose: "Owner approved apply-plan for next planning only — still not apply authority.",
    required_inputs: ["apply_plan_approval_status", "founder_decision_registry_row"],
    mutation_allowed: false,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "apply_readiness_ready",
    next_if_fail: "apply_plan_ready",
    next_if_unknown: "apply_readiness_unknown",
  },
  {
    state_id: "apply_readiness_unknown",
    purpose: "Post-approval apply-readiness is not proven; dedicated readiness command may be missing.",
    required_inputs: ["apply_plan_owner_approved", "apply_readiness_probe_or_command"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: true,
    next_if_pass: "apply_readiness_ready",
    next_if_fail: "apply_plan_owner_approved",
    next_if_unknown: "apply_readiness_unknown",
  },
  {
    state_id: "apply_readiness_ready",
    purpose: "All apply gates proven ready — still requires separate explicit apply authorization (not in this lane).",
    required_inputs: ["apply_readiness_checklist_pass", "mutation_authorization_explicit"],
    mutation_allowed: false,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "apply_executed",
    next_if_fail: "apply_readiness_unknown",
    next_if_unknown: "apply_readiness_unknown",
  },
  {
    state_id: "apply_executed",
    purpose: "Planned changes applied to product CSV / links / backend (not authorized by this diagnostic lane).",
    required_inputs: ["apply_executor_run_id", "planned_changes_applied_proof"],
    mutation_allowed: true,
    owner_required: true,
    evidence_required: true,
    next_if_pass: "parity_verified",
    next_if_fail: "apply_readiness_ready",
    next_if_unknown: "apply_executed",
  },
  {
    state_id: "parity_verified",
    purpose: "Post-apply parity checks pass across CSV, public UI, and truth spine.",
    required_inputs: ["parity_audit_pass"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: true,
    next_if_pass: "closed",
    next_if_fail: "apply_executed",
    next_if_unknown: "parity_verified",
  },
  {
    state_id: "closed",
    purpose: "Batch run-registry closeout_complete; wedge batch lifecycle finished.",
    required_inputs: ["run_registry_closeout_complete"],
    mutation_allowed: false,
    owner_required: false,
    evidence_required: true,
    next_if_pass: null,
    next_if_fail: "parity_verified",
    next_if_unknown: "closed",
  },
];

export const REDUNDANT_FRIDGE_MICRO_LANES_TO_FOLD_V1 = [
  "command_center_v2.fridge_buyer_path_batch_proposal_v1",
  "command_center_v2.fridge_buyer_path_batch_approval_v1",
  "command_center_v2.fridge_buyer_path_batch_apply_plan_proposal_v1",
  "command_center_v2.fridge_buyer_path_batch_apply_plan_approval_v1",
  "command_center_v2.batch_run_registry_intake_v1",
] as const;

export const LIFECYCLE_FIELDS_TO_KEEP_V1 = [
  "lifecycle_state",
  "wedge",
  "run_id",
  "proposed_batch_id",
  "approval_status",
  "plan_status",
  "owner_review_status",
  "planned_change_count",
  "source_apply_plan_artifact_rel_path",
  "run_registry_rel_path",
  "closeout_complete",
  "owner_planning_approval_status",
  "inherited_lifecycle_mutation_policy.mutation_allowed",
] as const;

export type BuildUniversalBatchLifecycleTruthTableInputV1 = {
  now: () => Date;
  efficiency_truth_table: Pick<
    CommandCenterEfficiencyTruthTableV1,
    | "consolidation_candidates"
    | "keep_as_truth_fields"
    | "remove_or_demote_candidates"
    | "unknown_facts"
    | "duplicate_steering_count"
  >;
  batch_run_registry_intake: Pick<
    BatchRunRegistryIntakeReportV1,
    | "ap_run_registry_status"
    | "ap_run_registry_rel_path"
    | "fridge_run_registry_status"
    | "fridge_approval_status"
    | "fridge_proposed_batch_id"
    | "wedges"
  >;
  fridge_apply_plan_proposal: {
    plan_status?: string;
    owner_review_status?: string;
    plan_artifact_rel_path?: string;
    planned_change_count?: number;
  } | null;
  fridge_apply_plan_approval: {
    approval_status?: string;
    plan_status?: string;
    owner_review_status?: string;
    source_apply_plan_artifact_rel_path?: string;
    planned_change_count?: number;
  } | null;
  apply_readiness?: Pick<
    UniversalBatchLifecycleApplyReadinessReportV1,
    "apply_readiness_status" | "apply_readiness_blockers" | "source_command"
  > | null;
  apply_execution_plan?: Pick<
    UniversalBatchLifecycleApplyExecutionPlanReportV1,
    "execution_plan_status" | "source_command" | "planned_change_count"
  > | null;
  mutation_authorization_review?: Pick<
    UniversalBatchLifecycleMutationAuthorizationReviewReportV1,
    "mutation_authorization_review_status" | "source_command"
  > | null;
  command_center_steering?: {
    next_best_action?: string;
    next_move_command?: string;
  };
  buckpartsScriptNames?: readonly string[];
};

function hasPostApprovalExecutionPlanScript(scriptNames: readonly string[]): boolean {
  return scriptNames.some((name) =>
    /apply-execution-plan|batch-apply-execution|lifecycle-apply-execution/i.test(name),
  );
}

function resolveOneTrueNextCommandForRefrigeratorWaterV1(args: {
  scriptNames: readonly string[];
  apply_readiness?: BuildUniversalBatchLifecycleTruthTableInputV1["apply_readiness"];
  apply_execution_plan?: BuildUniversalBatchLifecycleTruthTableInputV1["apply_execution_plan"];
  mutation_authorization_review?: BuildUniversalBatchLifecycleTruthTableInputV1["mutation_authorization_review"];
  fridgeState: UniversalBatchWedgeCurrentStateV1;
}): string {
  const hasReadinessScript =
    hasPostApprovalReadinessScript(args.scriptNames) ||
    args.apply_readiness?.source_command === UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1;
  const hasExecutionPlanScript =
    hasPostApprovalExecutionPlanScript(args.scriptNames) ||
    args.apply_execution_plan?.source_command ===
      UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1;

  if (args.fridgeState.lifecycle_state === "parity_verified") {
    return "node --import tsx scripts/report-buckparts-command-center.ts";
  }

  if (
    args.fridgeState.lifecycle_state === "apply_readiness_ready" &&
    args.apply_readiness?.apply_readiness_status === "PROVEN" &&
    args.mutation_authorization_review?.mutation_authorization_review_status !==
      "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY" &&
    args.mutation_authorization_review?.source_command ===
      UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1
  ) {
    return UNIVERSAL_BATCH_LIFECYCLE_MUTATION_AUTHORIZATION_REVIEW_SOURCE_COMMAND_V1;
  }

  if (
    args.fridgeState.lifecycle_state === "apply_readiness_ready" &&
    args.apply_readiness?.apply_readiness_status === "PROVEN" &&
    args.apply_execution_plan?.execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW" &&
    hasExecutionPlanScript
  ) {
    return UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1;
  }

  if (hasReadinessScript) {
    return UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1;
  }

  return "UNKNOWN: No dedicated post-approval apply-readiness npm command; read-only fallback: npm run buckparts:fridge-buyer-path-batch-apply-plan-approval";
}

function hasPostApprovalReadinessScript(scriptNames: readonly string[]): boolean {
  return scriptNames.some((name) =>
    /apply-readiness|post-approval-apply|batch-apply-readiness/i.test(name),
  );
}

function resolveRefrigeratorWaterState(
  input: BuildUniversalBatchLifecycleTruthTableInputV1,
): UniversalBatchWedgeCurrentStateV1 {
  const approval = input.fridge_apply_plan_approval;
  const proposal = input.fridge_apply_plan_proposal;
  const intake = input.batch_run_registry_intake;
  const proven_sources: string[] = [];

  if (approval?.approval_status) {
    proven_sources.push(
      `fridge_buyer_path_batch_apply_plan_approval_v1.approval_status=${approval.approval_status}`,
    );
  }
  if (proposal?.plan_status) {
    proven_sources.push(`fridge_buyer_path_batch_apply_plan_proposal_v1.plan_status=${proposal.plan_status}`);
  }
  proven_sources.push(`batch_run_registry_intake_v1.fridge_run_registry_status=${intake.fridge_run_registry_status}`);

  if (approval?.approval_status === "owner_approved_for_next_planning_only") {
    if (
      input.mutation_authorization_review?.mutation_authorization_review_status ===
      "APPLIED_PARITY_PROVEN"
    ) {
      proven_sources.push(
        "universal_batch_lifecycle_mutation_authorization_review_v1:mutation_authorization_review_status=APPLIED_PARITY_PROVEN",
      );
      return {
        wedge: "refrigerator_water",
        lifecycle_state: "parity_verified",
        alternate_lifecycle_states: ["closed"],
        mutation_allowed: false,
        mapping_summary:
          "Guarded CSV apply is already applied and target-row parity is proven. Repeat apply is blocked; next lifecycle work is read-only closeout validation.",
        proven_mapping_sources: proven_sources,
      };
    }

    if (input.apply_readiness?.apply_readiness_status === "PROVEN") {
      proven_sources.push(
        "universal_batch_lifecycle_apply_readiness_v1:apply_readiness_status=PROVEN",
      );
      return {
        wedge: "refrigerator_water",
        lifecycle_state: "apply_readiness_ready",
        alternate_lifecycle_states: [],
        mutation_allowed: false,
        mapping_summary:
          "Apply-readiness discovery PROVEN for committed apply-plan artifact. Mutation remains unauthorized until a separate future mutation authorization system exists.",
        proven_mapping_sources: proven_sources,
      };
    }

    const blockerSummary =
      input.apply_readiness?.apply_readiness_status === "BLOCKED"
        ? `Apply-readiness discovery BLOCKED (${String(input.apply_readiness.apply_readiness_blockers.length)} blockers).`
        : "Apply-plan owner approval recorded (planning-only). Effective next lifecycle gap is apply_readiness_unknown because post-approval readiness is not proven.";

    if (input.apply_readiness?.apply_readiness_status === "BLOCKED") {
      proven_sources.push(
        "universal_batch_lifecycle_apply_readiness_v1:apply_readiness_status=BLOCKED",
      );
    }

    return {
      wedge: "refrigerator_water",
      lifecycle_state: "apply_plan_owner_approved",
      alternate_lifecycle_states: ["apply_readiness_unknown"],
      mutation_allowed: false,
      mapping_summary: blockerSummary,
      proven_mapping_sources: proven_sources,
    };
  }

  if (
    proposal?.owner_review_status === "OWNER_REVIEW_READY" &&
    approval?.approval_status === "awaiting_owner_approval"
  ) {
    return {
      wedge: "refrigerator_water",
      lifecycle_state: "apply_plan_ready",
      alternate_lifecycle_states: [],
      mutation_allowed: false,
      mapping_summary: "Apply-plan proposal is OWNER_REVIEW_READY; owner approval still awaiting.",
      proven_mapping_sources: proven_sources,
    };
  }

  if (intake.fridge_run_registry_status === "PROVEN_PLANNING_RUN_REGISTRY") {
    return {
      wedge: "refrigerator_water",
      lifecycle_state: "run_registry_created",
      alternate_lifecycle_states: ["apply_plan_ready"],
      mutation_allowed: false,
      mapping_summary: "Fridge planning run-registry proven; apply-plan lane may be ahead of registry-only state.",
      proven_mapping_sources: proven_sources,
    };
  }

  return {
    wedge: "refrigerator_water",
    lifecycle_state: "owner_planning_approved",
    alternate_lifecycle_states: [],
    mutation_allowed: false,
    mapping_summary: "INFERRED: Fridge batch lifecycle before apply-plan owner approval based on intake/proposal signals.",
    proven_mapping_sources: proven_sources,
  };
}

function resolveAirPurifierState(
  input: BuildUniversalBatchLifecycleTruthTableInputV1,
): UniversalBatchWedgeCurrentStateV1 {
  const intake = input.batch_run_registry_intake;
  const apWedge = intake.wedges.find((row) => row.wedge === "air_purifier");
  const proven_sources = [
    `batch_run_registry_intake_v1.ap_run_registry_status=${intake.ap_run_registry_status}`,
  ];
  if (apWedge?.run_id) {
    proven_sources.push(`batch_run_registry_intake_v1.wedges[air_purifier].run_id=${apWedge.run_id}`);
  }

  if (intake.ap_run_registry_status === "PROVEN_CLOSED" && apWedge?.closeout_complete === true) {
    return {
      wedge: "air_purifier",
      lifecycle_state: "closed",
      alternate_lifecycle_states: [],
      mutation_allowed: false,
      mapping_summary: "AP batch-v2 proven run-registry is closed on disk (closeout_complete=true).",
      proven_mapping_sources: proven_sources,
    };
  }

  return {
    wedge: "air_purifier",
    lifecycle_state: "run_registry_created",
    alternate_lifecycle_states: [],
    mutation_allowed: false,
    mapping_summary: "INFERRED: AP run-registry present but not closed — not mapped to closed.",
    proven_mapping_sources: proven_sources,
  };
}

function buildRequiredTransitions(
  fridgeState: UniversalBatchWedgeCurrentStateV1,
): UniversalBatchLifecycleStateTransitionV1[] {
  const transitions: UniversalBatchLifecycleStateTransitionV1[] = [];
  const push = (transition: UniversalBatchLifecycleStateTransitionV1) => {
    transitions.push(transition);
  };

  if (
    fridgeState.lifecycle_state === "apply_plan_owner_approved" ||
    fridgeState.alternate_lifecycle_states.includes("apply_readiness_unknown")
  ) {
    push({
      from_state: "apply_plan_owner_approved",
      to_state: "apply_readiness_unknown",
      trigger: "owner_approved_for_next_planning_only without dedicated apply-readiness command",
      mutation_required: false,
      owner_required: false,
      blocked_by_unknown: "No dedicated post-approval apply-readiness npm command",
    });
    push({
      from_state: "apply_readiness_unknown",
      to_state: "apply_readiness_ready",
      trigger: "apply-readiness discovery proves all gates (read-only first)",
      mutation_required: false,
      owner_required: true,
      blocked_by_unknown: "apply-readiness probe contract not defined in repo",
    });
    push({
      from_state: "apply_readiness_ready",
      to_state: "apply_executed",
      trigger: "explicit separate apply authorization + executor (out of scope for this lane)",
      mutation_required: true,
      owner_required: true,
      blocked_by_unknown: "No apply executor authorized in Command Center",
    });
    push({
      from_state: "apply_executed",
      to_state: "parity_verified",
      trigger: "post-apply parity audit pass",
      mutation_required: false,
      owner_required: false,
      blocked_by_unknown: null,
    });
    push({
      from_state: "parity_verified",
      to_state: "closed",
      trigger: "run_registry closeout_complete",
      mutation_required: false,
      owner_required: false,
      blocked_by_unknown: null,
    });
  }

  return transitions;
}

export function buildUniversalBatchLifecycleTruthTableV1(
  input: BuildUniversalBatchLifecycleTruthTableInputV1,
): UniversalBatchLifecycleTruthTableV1 {
  const scriptNames = input.buckpartsScriptNames ?? [];
  const fridgeState = resolveRefrigeratorWaterState(input);
  const airPurifierState = resolveAirPurifierState(input);
  const current_wedge_states = [fridgeState, airPurifierState];

  const unknowns_blocking_mutation: string[] = [
    "lifecycle.inherited_lifecycle_mutation_policy.mutation_allowed=false until explicit out-of-band apply authorization",
  ];

  const hasReadinessScript =
    hasPostApprovalReadinessScript(scriptNames) ||
    input.apply_readiness?.source_command === UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1;
  if (!hasReadinessScript) {
    unknowns_blocking_mutation.push(
      "UNKNOWN: No dedicated post-approval apply-readiness npm command in package.json",
    );
  }
  if (
    fridgeState.alternate_lifecycle_states.includes("apply_readiness_unknown") &&
    input.apply_readiness?.apply_readiness_status !== "PROVEN"
  ) {
    unknowns_blocking_mutation.push(
      "apply_readiness_unknown: post-approval readiness not proven after owner_planning_approval",
    );
  }

  const one_true_next_state_for_refrigerator_water: UniversalBatchLifecycleStateIdV1 =
    fridgeState.lifecycle_state === "parity_verified"
      ? "parity_verified"
      : fridgeState.lifecycle_state === "apply_readiness_ready"
      ? "apply_readiness_ready"
      : fridgeState.alternate_lifecycle_states.includes("apply_readiness_unknown")
        ? "apply_readiness_unknown"
        : fridgeState.lifecycle_state;

  const one_true_next_command_for_refrigerator_water = resolveOneTrueNextCommandForRefrigeratorWaterV1({
    scriptNames,
    apply_readiness: input.apply_readiness,
    apply_execution_plan: input.apply_execution_plan,
    mutation_authorization_review: input.mutation_authorization_review,
    fridgeState,
  });

  const owner_steps_to_remove_or_demote = [
    "Separate owner step: npm run buckparts:fridge-buyer-path-batch-proposal (fold into lifecycle_state owner_planning_approved)",
    "Separate owner step: npm run buckparts:fridge-buyer-path-batch-approval (fold into owner_planning_approval_status field)",
    "Separate owner step: npm run buckparts:fridge-buyer-path-batch-run-registry (fold into run_registry_created state field)",
    "Separate owner step: npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal (fold into apply_plan_ready state field)",
    "Separate owner step: npm run buckparts:fridge-buyer-path-batch-apply-plan-approval (keep as read-only fallback only until apply_readiness_unknown resolved)",
    ...input.efficiency_truth_table.remove_or_demote_candidates,
  ];

  const lanes_to_keep_temporarily = [
    "command_center_v2.fridge_buyer_path_owner_review_bridge_v1",
    "command_center_v2.fridge_buyer_path_owner_review_packet_v1",
    "command_center_v2.batch_production_operating_checklist_v1",
    "command_center_v2.command_center_efficiency_truth_table_v1",
    "command_center_v2.brain_consolidation_plan_v1",
    ...FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1.filter(
      (key) =>
        key === "fridge_buyer_path_owner_review_bridge_v1" ||
        key === "fridge_buyer_path_owner_review_packet_v1",
    ).map((key) => `command_center_v2.${key}`),
  ];

  const proven_facts: string[] = [
    "PROVEN: universal_batch_lifecycle_truth_table_v1 is read-only consolidation blueprint; mutation_authorized=false.",
    "PROVEN: This lane does not participate in Command Center next_best_action steering priority.",
    `PROVEN: refrigerator_water lifecycle_state=${fridgeState.lifecycle_state}; mutation_allowed=false.`,
    `PROVEN: air_purifier lifecycle_state=${airPurifierState.lifecycle_state}; mutation_allowed=false.`,
  ];
  if (input.fridge_apply_plan_approval?.approval_status === "owner_approved_for_next_planning_only") {
    proven_facts.push(
      "PROVEN: fridge apply-plan approval artifact records owner_approved_for_next_planning_only.",
    );
  }
  if (input.batch_run_registry_intake.ap_run_registry_status === "PROVEN_CLOSED") {
    proven_facts.push("PROVEN: AP proven run-registry status is PROVEN_CLOSED.");
  }

  const inferred_facts: string[] = [
    "INFERRED: Fridge buyer-path micro-lanes should collapse into one universal_batch_lifecycle read model with lifecycle_state priority replacing stacked steering overrides.",
    `INFERRED: ${String(input.efficiency_truth_table.duplicate_steering_count)} steering correction modules should be replaced by lifecycle_state priority, not stacked overrides.`,
    "INFERRED: Repeated mutation=false flags across batch sub-lanes should inherit from inherited_lifecycle_mutation_policy once folded.",
    "INFERRED: Repeated planning-only owner approvals should become one generic owner_planning_approval_status field.",
  ];

  const unknown_facts: string[] = [...input.efficiency_truth_table.unknown_facts];
  if (!hasReadinessScript) {
    unknown_facts.push(
      "UNKNOWN: No buckparts:* post-approval apply-readiness npm script — one_true_next_command_for_refrigerator_water cannot name a dedicated readiness command.",
    );
  }

  const recommended_next_action =
    fridgeState.lifecycle_state === "parity_verified"
      ? "LIFECYCLE CONSOLIDATION [APPLIED_PARITY_PROVEN]: refrigerator_water guarded CSV apply is already applied with parity proven. Do not run write mode again; proceed with read-only post-apply closeout validation."
      : "LIFECYCLE CONSOLIDATION [READ_ONLY]: Use universal_batch_lifecycle_truth_table_v1 as blueprint to fold fridge micro-lanes into lifecycle_state fields; do not add operational gates. refrigerator_water next state is apply_readiness_unknown (mutation unauthorized). air_purifier reference state is closed.";

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_CC_JQ_PATH_V1,
    generated_at: input.now().toISOString(),
    source_command: UNIVERSAL_BATCH_LIFECYCLE_TRUTH_TABLE_SOURCE_COMMAND_V1,
    lifecycle_states: UNIVERSAL_BATCH_LIFECYCLE_STATE_DEFS_V1,
    current_wedge_states,
    required_state_transitions: buildRequiredTransitions(fridgeState),
    redundant_lanes_to_fold: [...REDUNDANT_FRIDGE_MICRO_LANES_TO_FOLD_V1],
    lanes_to_keep_as_fields: [...LIFECYCLE_FIELDS_TO_KEEP_V1],
    lanes_to_keep_temporarily,
    owner_steps_to_remove_or_demote,
    inherited_lifecycle_mutation_policy: {
      mutation_allowed: false,
      csv_apply_authorized: false,
      retailer_links_mutation_authorized: false,
      supabase_mutation_authorized: false,
      public_ui_mutation_authorized: false,
      buy_link_mutation_authorized: false,
      evidence_write_authorized: false,
      netlify_api_authorized: false,
      owner_planning_approval_scope: "read_only_agent_planning_only",
    },
    one_true_next_state_for_refrigerator_water,
    one_true_next_command_for_refrigerator_water,
    unknowns_blocking_mutation,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
