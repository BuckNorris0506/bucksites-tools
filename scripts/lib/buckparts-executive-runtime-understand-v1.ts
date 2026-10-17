/**
 * Executive Runtime v1 — UNDERSTAND (Runtime Contract §4.2).
 * Composes three conclusions from the existing Command Center report.
 * Does not write a second world model, dispatch, mutate, schedule, or mint NBA.
 */

export const EXECUTIVE_RUNTIME_UNDERSTAND_CONTRACT_V1 =
  "buckparts_executive_runtime_understand_v1" as const;

export const EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_CONTRACT_REL_V1 =
  "docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md" as const;

export const EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_COMMAND_V1 =
  "node --import tsx scripts/run-buckparts-executive-runtime-understand-v1.ts" as const;

export const EXECUTIVE_RUNTIME_UNDERSTAND_SLICE_V1 = "WAKE_OBSERVE_UNDERSTAND_STOP" as const;

export const EXECUTIVE_RUNTIME_UNDERSTAND_STAGE_V1 = "4.2" as const;

export const EXECUTIVE_RUNTIME_UNDERSTAND_WORLD_MODEL_JQ_PATH_V1 = ".command_center_v2" as const;

export type HonestyLabelV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type UnderstandCitedFieldV1 = {
  jq_path: string;
  observed: unknown;
  honesty: "PROVEN" | "UNKNOWN";
};

export type ExecutiveUnderstandConclusionIdV1 =
  | "current_constraint"
  | "current_highest_risk"
  | "current_highest_leverage_opportunity";

export type ExecutiveUnderstandConclusionV1 = {
  id: ExecutiveUnderstandConclusionIdV1;
  label: "Current Constraint" | "Current Highest Risk" | "Current Highest-Leverage Opportunity";
  statement: string | null;
  honesty: HonestyLabelV1;
  cited_fields: UnderstandCitedFieldV1[];
  conflicts: string[];
  unknown_reasons: string[];
};

export type ExecutiveRuntimeUnderstandSnapshotV1 = {
  contract: typeof EXECUTIVE_RUNTIME_UNDERSTAND_CONTRACT_V1;
  runtime_slice: typeof EXECUTIVE_RUNTIME_UNDERSTAND_SLICE_V1;
  source_contract: typeof EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_CONTRACT_REL_V1;
  source_stage: typeof EXECUTIVE_RUNTIME_UNDERSTAND_STAGE_V1;
  source_command: typeof EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_COMMAND_V1;
  generated_at: string;
  cycle_status: "UNDERSTOOD_STOP" | "FAIL_CLOSED";
  question: "What business am I currently running?";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  steering_authority: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  odr_created: false;
  selected_work: null;
  recommended_action: null;
  persistent_world_model_written: false;
  world_model: "existing_command_center_v2";
  world_model_jq_path: typeof EXECUTIVE_RUNTIME_UNDERSTAND_WORLD_MODEL_JQ_PATH_V1;
  observe: {
    cycle_status: "OBSERVED_STOP" | "FAIL_CLOSED" | "SKIPPED";
    blocked_reasons: string[];
  };
  conclusions: {
    current_constraint: ExecutiveUnderstandConclusionV1;
    current_highest_risk: ExecutiveUnderstandConclusionV1;
    current_highest_leverage_opportunity: ExecutiveUnderstandConclusionV1;
  };
  blocked_reasons: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cite(jq_path: string, observed: unknown, present: boolean): UnderstandCitedFieldV1 {
  return {
    jq_path,
    observed: present ? observed : null,
    honesty: present ? "PROVEN" : "UNKNOWN",
  };
}

function hasOwn(record: Record<string, unknown> | null, key: string): boolean {
  return Boolean(record && Object.prototype.hasOwnProperty.call(record, key));
}

function unknownConclusion(
  id: ExecutiveUnderstandConclusionIdV1,
  label: ExecutiveUnderstandConclusionV1["label"],
  cited_fields: UnderstandCitedFieldV1[],
  unknown_reasons: string[],
  conflicts: string[] = [],
): ExecutiveUnderstandConclusionV1 {
  return {
    id,
    label,
    statement: null,
    honesty: "UNKNOWN",
    cited_fields,
    conflicts,
    unknown_reasons,
  };
}

function stringifyObserved(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "UNKNOWN";
  }
}

function canonicalDispatchConflict(args: {
  dispatch_status: unknown;
  command_executable: unknown;
  owner_review_required: unknown;
}): string | null {
  const status = args.dispatch_status;
  const executable = args.command_executable;
  const ownerReview = args.owner_review_required;
  if (status === "READY" && executable === false) {
    return "CONFLICT: dispatch_status=READY while command_executable=false — cannot restated as a single constraint.";
  }
  if (status === "OWNER_REVIEW_REQUIRED" && executable === true) {
    return "CONFLICT: dispatch_status=OWNER_REVIEW_REQUIRED while command_executable=true — canonical bind is inconsistent.";
  }
  if (status === "READY" && ownerReview === true) {
    return "CONFLICT: dispatch_status=READY while owner_review_required=true — cannot restate as a single constraint.";
  }
  return null;
}

function issuePreview(issue: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!issue) return null;
  return {
    issue_id: issue.issue_id ?? null,
    severity: issue.severity ?? null,
    status: issue.status ?? null,
    title: issue.title ?? null,
  };
}

export function emptyUnderstandSnapshotV1(generated_at: string): ExecutiveRuntimeUnderstandSnapshotV1 {
  const missing = ["missing_required_source:command_center_v2"];
  return {
    contract: EXECUTIVE_RUNTIME_UNDERSTAND_CONTRACT_V1,
    runtime_slice: EXECUTIVE_RUNTIME_UNDERSTAND_SLICE_V1,
    source_contract: EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_CONTRACT_REL_V1,
    source_stage: EXECUTIVE_RUNTIME_UNDERSTAND_STAGE_V1,
    source_command: EXECUTIVE_RUNTIME_UNDERSTAND_SOURCE_COMMAND_V1,
    generated_at,
    cycle_status: "FAIL_CLOSED",
    question: "What business am I currently running?",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    steering_authority: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    odr_created: false,
    selected_work: null,
    recommended_action: null,
    persistent_world_model_written: false,
    world_model: "existing_command_center_v2",
    world_model_jq_path: EXECUTIVE_RUNTIME_UNDERSTAND_WORLD_MODEL_JQ_PATH_V1,
    observe: { cycle_status: "SKIPPED", blocked_reasons: [] },
    conclusions: {
      current_constraint: unknownConclusion(
        "current_constraint",
        "Current Constraint",
        [],
        missing,
      ),
      current_highest_risk: unknownConclusion(
        "current_highest_risk",
        "Current Highest Risk",
        [],
        missing,
      ),
      current_highest_leverage_opportunity: unknownConclusion(
        "current_highest_leverage_opportunity",
        "Current Highest-Leverage Opportunity",
        [],
        missing,
      ),
    },
    blocked_reasons: [...missing],
    proven_facts: [
      "PROVEN: v1 authority locks are false — no NBA, dispatch, mutation, or steering.",
      "PROVEN: selected_work=null; recommended_action=null; persistent_world_model_written=false.",
    ],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function buildConstraint(args: {
  canonical: Record<string, unknown> | null;
  canonicalPresent: boolean;
  odq: Record<string, unknown> | null;
  odqPresent: boolean;
  health: Record<string, unknown> | null;
  healthPresent: boolean;
}): ExecutiveUnderstandConclusionV1 {
  const cited: UnderstandCitedFieldV1[] = [
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.steering_override_source",
      args.canonical?.steering_override_source ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "steering_override_source"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.dispatch_status",
      args.canonical?.dispatch_status ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "dispatch_status"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.command_executable",
      args.canonical?.command_executable ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "command_executable"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.owner_review_required",
      args.canonical?.owner_review_required ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "owner_review_required"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.blockers",
      args.canonical?.blockers ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "blockers"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.operator_can_be_away_status",
      args.canonical?.operator_can_be_away_status ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "operator_can_be_away_status"),
    ),
    cite(
      ".command_center_v2.owner_decision_queue_v1.pending_count",
      args.odq?.pending_count ?? null,
      args.odqPresent && hasOwn(args.odq, "pending_count"),
    ),
    cite(
      ".system_health_summary.status",
      args.health?.status ?? null,
      args.healthPresent && hasOwn(args.health, "status"),
    ),
  ];

  if (!args.canonicalPresent) {
    return unknownConclusion(
      "current_constraint",
      "Current Constraint",
      cited,
      ["canonical_final_operating_decision_v1 is missing — cannot restate the current bind."],
    );
  }

  const dispatchPresent = hasOwn(args.canonical, "dispatch_status");
  const executablePresent = hasOwn(args.canonical, "command_executable");
  if (!dispatchPresent || !executablePresent) {
    return unknownConclusion(
      "current_constraint",
      "Current Constraint",
      cited,
      [
        "canonical dispatch_status and/or command_executable absent — Contract §4.2 treats dispatch as refused; no honest constraint restatement.",
      ],
    );
  }

  const conflict = canonicalDispatchConflict({
    dispatch_status: args.canonical?.dispatch_status,
    command_executable: args.canonical?.command_executable,
    owner_review_required: args.canonical?.owner_review_required,
  });
  if (conflict) {
    return unknownConclusion(
      "current_constraint",
      "Current Constraint",
      cited,
      ["canonical bind fields conflict; no single constraint restated."],
      [conflict],
    );
  }

  const statement =
    `Canonical steering_override_source=${stringifyObserved(args.canonical?.steering_override_source)}; ` +
    `dispatch_status=${stringifyObserved(args.canonical?.dispatch_status)}; ` +
    `command_executable=${stringifyObserved(args.canonical?.command_executable)}; ` +
    `owner_review_required=${stringifyObserved(args.canonical?.owner_review_required)}; ` +
    `ODQ pending_count=${stringifyObserved(args.odqPresent ? args.odq?.pending_count : null)}; ` +
    `system_health_summary.status=${stringifyObserved(args.healthPresent ? args.health?.status : null)}.`;

  return {
    id: "current_constraint",
    label: "Current Constraint",
    statement,
    honesty: "PROVEN",
    cited_fields: cited,
    conflicts: [],
    unknown_reasons: [],
  };
}

function buildHighestRisk(args: {
  outcome: Record<string, unknown> | null;
  outcomePresent: boolean;
  issues: Record<string, unknown> | null;
  issuesPresent: boolean;
}): ExecutiveUnderstandConclusionV1 {
  const highest = args.issuesPresent ? asRecord(args.issues?.highest_priority_issue) : null;
  const totalOpen = args.issuesPresent ? args.issues?.total_open : null;
  const openCount = typeof totalOpen === "number" ? totalOpen : null;
  const issueRiskPresent = Boolean(highest && openCount !== null && openCount > 0);

  const joinCount = args.outcomePresent ? args.outcome?.handoff_from_confident_buy_count : null;
  const joinUnknown = args.outcomePresent && joinCount === "UNKNOWN";
  const joinRuntime = args.outcomePresent ? args.outcome?.runtime_status : null;

  const cited: UnderstandCitedFieldV1[] = [
    cite(
      ".command_center_v2.command_center_issue_registry_v1.total_open",
      totalOpen ?? null,
      args.issuesPresent && hasOwn(args.issues, "total_open"),
    ),
    cite(
      ".command_center_v2.command_center_issue_registry_v1.highest_priority_issue",
      issuePreview(highest),
      args.issuesPresent && hasOwn(args.issues, "highest_priority_issue"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.handoff_from_confident_buy_count",
      joinCount ?? null,
      args.outcomePresent && hasOwn(args.outcome, "handoff_from_confident_buy_count"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.runtime_status",
      joinRuntime ?? null,
      args.outcomePresent && hasOwn(args.outcome, "runtime_status"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.nba_authority",
      args.outcomePresent ? args.outcome?.nba_authority ?? null : null,
      args.outcomePresent && hasOwn(args.outcome, "nba_authority"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.steering_authority",
      args.outcomePresent ? args.outcome?.steering_authority ?? null : null,
      args.outcomePresent && hasOwn(args.outcome, "steering_authority"),
    ),
  ];

  const observations: string[] = [];
  if (issueRiskPresent) {
    observations.push(
      `issue_registry highest_priority_issue=${stringifyObserved(highest?.issue_id)} severity=${stringifyObserved(highest?.severity)} status=${stringifyObserved(highest?.status)} total_open=${String(openCount)}`,
    );
  }
  if (joinUnknown) {
    observations.push(
      `Outcome Join handoff_from_confident_buy_count=UNKNOWN runtime_status=${stringifyObserved(joinRuntime)} nba_authority=${stringifyObserved(args.outcome?.nba_authority)}`,
    );
  }

  if (observations.length === 0) {
    return unknownConclusion(
      "current_highest_risk",
      "Current Highest Risk",
      cited,
      [
        "No unique risk-shaped Command Center field was populated (no open highest_priority_issue and Outcome Join BUY handoff is not UNKNOWN).",
      ],
    );
  }

  if (observations.length > 1) {
    return unknownConclusion(
      "current_highest_risk",
      "Current Highest Risk",
      cited,
      [
        "Multiple risk-shaped facts are present; naming one 'highest' would be bottleneck ranking (Runtime Contract §4.3, not implemented).",
      ],
      observations.map((row) => `CONFLICT: ${row}`),
    );
  }

  const only = observations[0] ?? "";
  if (issueRiskPresent) {
    return {
      id: "current_highest_risk",
      label: "Current Highest Risk",
      statement: `Only observed risk-shaped field: Command Center issue registry already names highest_priority_issue=${stringifyObserved(highest?.issue_id)} (severity=${stringifyObserved(highest?.severity)}, status=${stringifyObserved(highest?.status)}, total_open=${String(openCount)}).`,
      honesty: "PROVEN",
      cited_fields: cited,
      conflicts: [],
      unknown_reasons: [],
    };
  }

  return {
    id: "current_highest_risk",
    label: "Current Highest Risk",
    statement: `Only observed risk-shaped field: ${only}.`,
    honesty: "PROVEN",
    cited_fields: cited,
    conflicts: [],
    unknown_reasons: [],
  };
}

function buildHighestLeverageOpportunity(args: {
  outcome: Record<string, unknown> | null;
  outcomePresent: boolean;
  decision: Record<string, unknown> | null;
  decisionPresent: boolean;
}): ExecutiveUnderstandConclusionV1 {
  const joinCount = args.outcomePresent ? args.outcome?.handoff_from_confident_buy_count : null;
  const joinUnknown = args.outcomePresent && joinCount === "UNKNOWN";
  const joinNumeric = args.outcomePresent && typeof joinCount === "number";
  const buyCount = args.decisionPresent ? args.decision?.confident_buy_count : null;
  const buyNumeric = typeof buyCount === "number";

  const cited: UnderstandCitedFieldV1[] = [
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.handoff_from_confident_buy_count",
      joinCount ?? null,
      args.outcomePresent && hasOwn(args.outcome, "handoff_from_confident_buy_count"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.nba_authority",
      args.outcomePresent ? args.outcome?.nba_authority ?? null : null,
      args.outcomePresent && hasOwn(args.outcome, "nba_authority"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.steering_authority",
      args.outcomePresent ? args.outcome?.steering_authority ?? null : null,
      args.outcomePresent && hasOwn(args.outcome, "steering_authority"),
    ),
    cite(
      ".command_center_v2.phase4_decision_capture_v1.confident_buy_count",
      buyCount ?? null,
      args.decisionPresent && hasOwn(args.decision, "confident_buy_count"),
    ),
  ];

  if (!args.outcomePresent) {
    return unknownConclusion(
      "current_highest_leverage_opportunity",
      "Current Highest-Leverage Opportunity",
      cited,
      ["phase4_outcome_capture_v1 is missing — cannot observe unused sensory capacity."],
    );
  }

  if (joinNumeric) {
    return unknownConclusion(
      "current_highest_leverage_opportunity",
      "Current Highest-Leverage Opportunity",
      cited,
      [
        "Outcome Join BUY handoff count is numeric; no unique unused-capability field remains without ranking candidates.",
      ],
    );
  }

  if (!joinUnknown) {
    return unknownConclusion(
      "current_highest_leverage_opportunity",
      "Current Highest-Leverage Opportunity",
      cited,
      [
        "Outcome Join BUY handoff count is not UNKNOWN and not numeric — no unused-capability conclusion drawn.",
      ],
    );
  }

  if (buyNumeric && buyCount > 0) {
    return {
      id: "current_highest_leverage_opportunity",
      label: "Current Highest-Leverage Opportunity",
      statement:
        `Decision-Capture confident_buy_count=${String(buyCount)} while Outcome Join handoff_from_confident_buy_count=UNKNOWN ` +
        `(nba_authority=${stringifyObserved(args.outcome?.nba_authority)}, steering_authority=${stringifyObserved(args.outcome?.steering_authority)}). ` +
        `A decision universe exists without a proven BUY handoff measurement.`,
      honesty: "INFERRED",
      cited_fields: cited,
      conflicts: [],
      unknown_reasons: [],
    };
  }

  return {
    id: "current_highest_leverage_opportunity",
    label: "Current Highest-Leverage Opportunity",
    statement:
      `Outcome Join is present and non-steering (nba_authority=${stringifyObserved(args.outcome?.nba_authority)}, ` +
      `steering_authority=${stringifyObserved(args.outcome?.steering_authority)}); ` +
      `handoff_from_confident_buy_count=UNKNOWN — a shipped sensory path has no qualified BUY handoff measurement yet.`,
    honesty: "INFERRED",
    cited_fields: cited,
    conflicts: [],
    unknown_reasons: [],
  };
}

export function buildExecutiveRuntimeUnderstandV1(args: {
  commandCenter: unknown;
  generated_at?: string;
  observe?: ExecutiveRuntimeUnderstandSnapshotV1["observe"];
}): ExecutiveRuntimeUnderstandSnapshotV1 {
  const generated_at = args.generated_at ?? new Date().toISOString();
  const snapshot = emptyUnderstandSnapshotV1(generated_at);
  snapshot.observe = args.observe ?? { cycle_status: "SKIPPED", blocked_reasons: [] };
  const blocked: string[] = [];

  const root = asRecord(args.commandCenter);
  if (!root) {
    blocked.push("missing_required_source:command_center");
    snapshot.blocked_reasons = blocked;
    snapshot.unknown_facts = blocked.map((row) => `UNKNOWN: ${row}`);
    return snapshot;
  }

  const v2 = asRecord(root.command_center_v2);
  if (!v2) {
    blocked.push("missing_required_source:command_center_v2");
    snapshot.blocked_reasons = blocked;
    snapshot.unknown_facts = blocked.map((row) => `UNKNOWN: ${row}`);
    return snapshot;
  }

  const canonicalPresent = hasOwn(v2, "canonical_final_operating_decision_v1");
  const canonical = asRecord(v2.canonical_final_operating_decision_v1);
  if (!canonicalPresent || !canonical) {
    blocked.push("missing_required_source:canonical_final_operating_decision_v1");
  } else {
    if (!hasOwn(canonical, "dispatch_status") || !hasOwn(canonical, "command_executable")) {
      blocked.push(
        "canonical_dispatch_refused: dispatch_status and/or command_executable absent — Contract §4.2 STOP (dispatch treated as refused)",
      );
    }
  }

  const odqPresent = hasOwn(v2, "owner_decision_queue_v1");
  const odq = asRecord(v2.owner_decision_queue_v1);
  const healthPresent = hasOwn(root, "system_health_summary");
  const health = asRecord(root.system_health_summary);
  const outcomePresent = hasOwn(v2, "phase4_outcome_capture_v1");
  const outcome = asRecord(v2.phase4_outcome_capture_v1);
  const issuesPresent = hasOwn(v2, "command_center_issue_registry_v1");
  const issues = asRecord(v2.command_center_issue_registry_v1);
  const decisionPresent = hasOwn(v2, "phase4_decision_capture_v1");
  const decision = asRecord(v2.phase4_decision_capture_v1);

  if (args.observe?.cycle_status === "FAIL_CLOSED") {
    blocked.push("observe_fail_closed");
    blocked.push(...(args.observe.blocked_reasons ?? []));
  }

  snapshot.conclusions.current_constraint = buildConstraint({
    canonical,
    canonicalPresent: Boolean(canonicalPresent && canonical),
    odq,
    odqPresent: Boolean(odqPresent && odq),
    health,
    healthPresent: Boolean(healthPresent && health),
  });
  snapshot.conclusions.current_highest_risk = buildHighestRisk({
    outcome,
    outcomePresent: Boolean(outcomePresent && outcome),
    issues,
    issuesPresent: Boolean(issuesPresent && issues),
  });
  snapshot.conclusions.current_highest_leverage_opportunity = buildHighestLeverageOpportunity({
    outcome,
    outcomePresent: Boolean(outcomePresent && outcome),
    decision,
    decisionPresent: Boolean(decisionPresent && decision),
  });

  snapshot.blocked_reasons = blocked;
  snapshot.cycle_status = blocked.length === 0 ? "UNDERSTOOD_STOP" : "FAIL_CLOSED";

  const conclusions = [
    snapshot.conclusions.current_constraint,
    snapshot.conclusions.current_highest_risk,
    snapshot.conclusions.current_highest_leverage_opportunity,
  ];
  snapshot.proven_facts = [
    "PROVEN: v1 authority locks are false — no NBA, dispatch, mutation, or steering.",
    "PROVEN: selected_work=null; recommended_action=null; persistent_world_model_written=false.",
    "PROVEN: world model is the existing Command Center v2 object; this slice does not persist a copy.",
    ...conclusions
      .filter((row) => row.honesty === "PROVEN" && row.statement)
      .map((row) => `PROVEN: ${row.label}: ${row.statement}`),
  ];
  snapshot.inferred_facts = conclusions
    .filter((row) => row.honesty === "INFERRED" && row.statement)
    .map((row) => `INFERRED: ${row.label}: ${row.statement}`);
  snapshot.unknown_facts = [
    ...blocked.map((row) => `UNKNOWN: ${row}`),
    ...conclusions
      .filter((row) => row.honesty === "UNKNOWN")
      .flatMap((row) =>
        row.unknown_reasons.map((reason) => `UNKNOWN: ${row.label}: ${reason}`),
      ),
  ];

  return snapshot;
}

export function understandSucceededV1(snapshot: ExecutiveRuntimeUnderstandSnapshotV1): boolean {
  return snapshot.cycle_status === "UNDERSTOOD_STOP" && snapshot.blocked_reasons.length === 0;
}
