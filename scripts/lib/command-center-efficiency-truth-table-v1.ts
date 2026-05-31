/**
 * Read-only Command Center efficiency / SOP truth table — diagnostic consolidation
 * guidance only. Does not authorize mutation or block active steering.
 */

export const COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CONTRACT_V1 =
  "command_center_efficiency_truth_table_v1" as const;

export const COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CC_JQ_PATH_V1 =
  ".command_center_v2.command_center_efficiency_truth_table_v1" as const;

export const COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.command_center_efficiency_truth_table_v1'" as const;

export const FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1 = [
  "fridge_buyer_path_owner_review_bridge_v1",
  "fridge_buyer_path_owner_review_packet_v1",
  "fridge_buyer_path_batch_proposal_v1",
  "fridge_buyer_path_batch_approval_v1",
  "fridge_buyer_path_batch_apply_plan_proposal_v1",
  "fridge_buyer_path_batch_apply_plan_approval_v1",
  "batch_run_registry_intake_v1",
] as const;

export const KNOWN_STEERING_CORRECTION_LAYERS_V1 = [
  {
    layer_id: "fridge_buyer_path_batch_apply_plan_approval_steering_v1",
    corrects: "apply-plan proposal vs approval priority (awaiting + approved-planning overrides)",
  },
  {
    layer_id: "fridge_buyer_path_batch_apply_plan_steering_v1",
    corrects: "apply-plan proposal OWNER_REVIEW_READY vs batch dispatch",
  },
  {
    layer_id: "batch_run_registry_intake_steering_v1",
    corrects: "batch dispatch vs run-registry intake priority",
  },
] as const;

export const PROPOSED_UNIVERSAL_BATCH_LIFECYCLE_STATES_V1 = [
  "run_registry_intake",
  "owner_review_packet",
  "batch_proposal_review",
  "batch_owner_approval_planning_only",
  "apply_plan_proposal_review",
  "apply_plan_owner_approval_planning_only",
  "apply_readiness_discovery_unknown",
  "closed_or_dispatch",
] as const;

const MUTATION_FLAG_KEYS_V1 = [
  "apply_mutation_authorized",
  "csv_apply_authorized",
  "retailer_links_mutation_authorized",
  "supabase_mutation_authorized",
  "public_ui_mutation_authorized",
  "buy_link_mutation_authorized",
  "evidence_write_authorized",
  "netlify_api_authorized",
  "mutation_authorized",
] as const;

export type CommandCenterEfficiencyConsolidationClassificationV1 =
  | "repeated_mutation_gate"
  | "duplicate_steering"
  | "read_only_approval_only"
  | "micro_lane_collapse"
  | "field_not_owner_step"
  | "unknown_next_command";

export type CommandCenterEfficiencyConsolidationCandidateV1 = {
  pattern_id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  affected_lanes: string[];
  classification: CommandCenterEfficiencyConsolidationClassificationV1;
  summary: string;
  recommended_action:
    | "collapse_into_universal_batch_lifecycle"
    | "demote_to_cc_field"
    | "merge_steering_priority"
    | "document_unknown"
    | "keep_monitoring";
};

export type CommandCenterEfficiencyStatusV1 =
  | "CLUTTER_ACCUMULATING"
  | "MODERATE_OVERHEAD"
  | "ACCEPTABLE";

export type CommandCenterEfficiencyTruthTableV1 = {
  contract: typeof COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_SOURCE_COMMAND_V1;
  current_system_efficiency_status: CommandCenterEfficiencyStatusV1;
  repeated_gate_count: number;
  duplicate_steering_count: number;
  consolidation_candidates: CommandCenterEfficiencyConsolidationCandidateV1[];
  keep_as_truth_fields: string[];
  remove_or_demote_candidates: string[];
  proposed_universal_batch_lifecycle_states: readonly string[];
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type LaneSnapshotV1 = Record<string, unknown>;

export type BuildCommandCenterEfficiencyTruthTableInputV1 = {
  now: () => Date;
  lanes: Record<string, LaneSnapshotV1 | null | undefined>;
  buckpartsScriptNames?: readonly string[];
};

function lanePath(key: string): string {
  return `command_center_v2.${key}`;
}

function presentMutationFlags(lane: LaneSnapshotV1): string[] {
  return MUTATION_FLAG_KEYS_V1.filter(
    (key) => key in lane && typeof lane[key] === "boolean",
  );
}

function laneHasAllMutationFlagsFalse(lane: LaneSnapshotV1): boolean {
  const present = presentMutationFlags(lane);
  return present.length > 0 && present.every((key) => lane[key] === false);
}

function laneIsReadOnlyApprovalGate(lane: LaneSnapshotV1): boolean {
  return (
    lane.owner_approval_required === true &&
    lane.apply_mutation_authorized === false &&
    lane.read_only === true &&
    lane.data_mutation === false
  );
}

function resolveEfficiencyStatus(args: {
  repeated_gate_count: number;
  duplicate_steering_count: number;
  consolidation_candidate_count: number;
}): CommandCenterEfficiencyStatusV1 {
  if (
    args.repeated_gate_count >= 4 &&
    args.duplicate_steering_count >= 2 &&
    args.consolidation_candidate_count >= 4
  ) {
    return "CLUTTER_ACCUMULATING";
  }
  if (args.repeated_gate_count >= 2 || args.consolidation_candidate_count >= 2) {
    return "MODERATE_OVERHEAD";
  }
  return "ACCEPTABLE";
}

export function buildCommandCenterEfficiencyTruthTableV1(
  input: BuildCommandCenterEfficiencyTruthTableInputV1,
): CommandCenterEfficiencyTruthTableV1 {
  const consolidation_candidates: CommandCenterEfficiencyConsolidationCandidateV1[] = [];
  const proven_facts: string[] = [
    "PROVEN: command_center_efficiency_truth_table_v1 is read-only diagnostic guidance; mutation_authorized=false.",
    "PROVEN: This lane does not participate in Command Center next_best_action steering priority.",
  ];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const mutationGateLanes: string[] = [];
  const readOnlyApprovalLanes: string[] = [];

  for (const [key, lane] of Object.entries(input.lanes)) {
    if (!lane || typeof lane !== "object") continue;
    if (laneHasAllMutationFlagsFalse(lane)) {
      mutationGateLanes.push(lanePath(key));
    }
    if (laneIsReadOnlyApprovalGate(lane)) {
      readOnlyApprovalLanes.push(lanePath(key));
    }
  }

  const repeated_gate_count = mutationGateLanes.length;

  if (repeated_gate_count >= 2) {
    consolidation_candidates.push({
      pattern_id: "repeated_mutation_false_flags",
      severity: repeated_gate_count >= 5 ? "HIGH" : "MEDIUM",
      affected_lanes: mutationGateLanes,
      classification: "repeated_mutation_gate",
      summary: `${String(repeated_gate_count)} Command Center lanes repeat the same mutation_authorized=false / apply_mutation_authorized=false gate bundle instead of one universal batch lifecycle truth row.`,
      recommended_action: "collapse_into_universal_batch_lifecycle",
    });
    proven_facts.push(
      `PROVEN: ${String(repeated_gate_count)} lanes expose all-present mutation flags as false.`,
    );
  }

  if (readOnlyApprovalLanes.length >= 2) {
    consolidation_candidates.push({
      pattern_id: "repeated_owner_approval_planning_only_gates",
      severity: "HIGH",
      affected_lanes: readOnlyApprovalLanes,
      classification: "read_only_approval_only",
      summary: `${String(readOnlyApprovalLanes.length)} approval bridges repeat owner_approval_required=true with apply_mutation_authorized=false (planning/read-only only).`,
      recommended_action: "demote_to_cc_field",
    });
    inferred_facts.push(
      "INFERRED: Multiple owner approval bridges teach the same rule — owner approval does not authorize mutation — as separate owner steps.",
    );
  }

  const fridgeMicroLanes = FRIDGE_BUYER_PATH_MICRO_LANE_KEYS_V1.filter((key) => {
    const lane = input.lanes[key];
    return lane != null && typeof lane === "object";
  }).map((key) => lanePath(key));

  if (fridgeMicroLanes.length >= 5) {
    consolidation_candidates.push({
      pattern_id: "fridge_buyer_path_micro_lane_chain",
      severity: "HIGH",
      affected_lanes: fridgeMicroLanes,
      classification: "micro_lane_collapse",
      summary: `Fridge buyer-path flow spans ${String(fridgeMicroLanes.length)} separate Command Center micro-lanes (bridge → packet → batch proposal → batch approval → apply-plan proposal → apply-plan approval → run-registry intake).`,
      recommended_action: "collapse_into_universal_batch_lifecycle",
    });
    proven_facts.push(
      `PROVEN: Fridge buyer-path chain includes ${String(fridgeMicroLanes.length)} CC lanes: ${fridgeMicroLanes.join(", ")}.`,
    );
  }

  const steeringLayers = [...KNOWN_STEERING_CORRECTION_LAYERS_V1];
  const duplicate_steering_count = steeringLayers.length;

  consolidation_candidates.push({
    pattern_id: "steering_priority_correction_layers",
    severity: "MEDIUM",
    affected_lanes: steeringLayers.map((layer) => layer.layer_id),
    classification: "duplicate_steering",
    summary: `${String(duplicate_steering_count)} steering override modules exist primarily to correct earlier steering priority among batch/apply-plan lanes.`,
    recommended_action: "merge_steering_priority",
  });
  inferred_facts.push(
    "INFERRED: Steering override layers are compensating controls for micro-lane proliferation rather than primary lifecycle truth.",
  );

  const fieldNotOwnerStepLanes = [
    lanePath("fridge_buyer_path_batch_apply_plan_proposal_v1"),
    lanePath("fridge_buyer_path_batch_apply_plan_approval_v1"),
    lanePath("fridge_buyer_path_batch_proposal_v1"),
    lanePath("fridge_buyer_path_batch_approval_v1"),
  ].filter((pathValue) =>
    Object.values(input.lanes).some((lane) => lane != null),
  );

  consolidation_candidates.push({
    pattern_id: "useful_fields_harmful_owner_steps",
    severity: "MEDIUM",
    affected_lanes: fieldNotOwnerStepLanes,
    classification: "field_not_owner_step",
    summary:
      "plan_status, owner_review_status, approval_status, and planned_change_count are useful as CC truth fields but currently surface as separate owner-facing steps.",
    recommended_action: "demote_to_cc_field",
  });

  const applyPlanApprovalLane = input.lanes.fridge_buyer_path_batch_apply_plan_approval_v1;
  const scriptNames = input.buckpartsScriptNames ?? [];
  const hasPostApprovalReadinessScript = scriptNames.some((name) =>
    /apply-readiness|post-approval-apply|batch-apply-readiness/i.test(name),
  );

  if (
    applyPlanApprovalLane &&
    applyPlanApprovalLane.approval_status === "owner_approved_for_next_planning_only"
  ) {
    consolidation_candidates.push({
      pattern_id: "unknown_post_approval_apply_readiness_command",
      severity: "HIGH",
      affected_lanes: [lanePath("fridge_buyer_path_batch_apply_plan_approval_v1")],
      classification: "unknown_next_command",
      summary:
        "Apply-plan approval is owner_approved_for_next_planning_only but no dedicated post-approval apply-readiness npm command exists; CC falls back to read-only approval report.",
      recommended_action: "document_unknown",
    });
    proven_facts.push(
      "PROVEN: fridge_buyer_path_batch_apply_plan_approval_v1.approval_status=owner_approved_for_next_planning_only.",
    );
    if (!hasPostApprovalReadinessScript) {
      unknown_facts.push(
        "UNKNOWN: No dedicated post-approval apply-readiness npm script in package.json; next command is read-only fallback only.",
      );
    }
  } else if (!hasPostApprovalReadinessScript) {
    unknown_facts.push(
      "UNKNOWN: package.json has no buckparts:* post-approval apply-readiness command (pattern apply-readiness|post-approval-apply|batch-apply-readiness).",
    );
  }

  const keep_as_truth_fields = [
    "approval_status",
    "plan_status",
    "owner_review_status",
    "planned_change_count",
    "source_apply_plan_artifact_rel_path",
    "proposed_batch_id",
    "run_id",
    "apply_mutation_authorized",
    "csv_apply_authorized",
    "retailer_links_mutation_authorized",
    "supabase_mutation_authorized",
    "public_ui_mutation_authorized",
    "buy_link_mutation_authorized",
    "evidence_write_authorized",
    "netlify_api_authorized",
  ];

  const remove_or_demote_candidates = [
    "Separate owner step per fridge buyer-path micro-bridge when universal batch lifecycle row exists",
    "Duplicate steering override modules once lifecycle priority is encoded in one state machine",
    "Owner-facing checklist npm commands that only restate read_only planning scope",
    "Repeated mutation=false flag blocks on every batch sub-lane",
  ];

  const current_system_efficiency_status = resolveEfficiencyStatus({
    repeated_gate_count,
    duplicate_steering_count,
    consolidation_candidate_count: consolidation_candidates.length,
  });

  const recommended_next_action =
    current_system_efficiency_status === "CLUTTER_ACCUMULATING"
      ? "EFFICIENCY AUDIT [CLUTTER_ACCUMULATING]: Collapse fridge buyer-path micro-lanes into one universal batch lifecycle truth table; demote repeated read-only approval gates to fields; merge steering priority layers. Diagnostic only — do not add another operational gate or authorize mutation."
      : current_system_efficiency_status === "MODERATE_OVERHEAD"
        ? "EFFICIENCY AUDIT [MODERATE_OVERHEAD]: Review consolidation_candidates and keep_as_truth_fields before adding new batch micro-lanes. Diagnostic only — mutation unauthorized."
        : "EFFICIENCY AUDIT [ACCEPTABLE]: Monitor consolidation_candidates; prefer universal batch lifecycle fields over new owner steps. Diagnostic only — mutation unauthorized.";

  return {
    contract: COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_CC_JQ_PATH_V1,
    generated_at: input.now().toISOString(),
    source_command: COMMAND_CENTER_EFFICIENCY_TRUTH_TABLE_SOURCE_COMMAND_V1,
    current_system_efficiency_status,
    repeated_gate_count,
    duplicate_steering_count,
    consolidation_candidates,
    keep_as_truth_fields,
    remove_or_demote_candidates,
    proposed_universal_batch_lifecycle_states: PROPOSED_UNIVERSAL_BATCH_LIFECYCLE_STATES_V1,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
