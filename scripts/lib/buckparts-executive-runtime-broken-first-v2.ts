/**
 * Executive Runtime v2 — BROKEN-FIRST / binding-constraint adjudication.
 * Read-only. Does not dispatch, mutate, schedule, mint NBA, or write a world model.
 *
 * Founder rule: a material break outranks ordinary growth work.
 * A CRITICAL label is not itself a material break. UNKNOWN is never converted
 * into a break or into healthy.
 */

export const EXECUTIVE_RUNTIME_BROKEN_FIRST_CONTRACT_V2 =
  "buckparts_executive_runtime_broken_first_v2" as const;

export const EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_CONTRACT_REL_V2 =
  "docs/BuckParts-EXECUTIVE-RUNTIME-CONTRACT-V1.md" as const;

export const EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_COMMAND_V2 =
  "node --import tsx scripts/run-buckparts-executive-runtime-broken-first-v2.ts" as const;

export const EXECUTIVE_RUNTIME_BROKEN_FIRST_SLICE_V2 =
  "WAKE_OBSERVE_UNDERSTAND_BROKEN_FIRST_STOP" as const;

export type HonestyLabelV2 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type BrokenClassificationV2 =
  | "HARD_BREAK"
  | "SENSOR_BREAK"
  | "DEGRADED"
  | "NOT_BROKEN"
  | "UNKNOWN";

export type CitedFieldV2 = {
  jq_path: string;
  observed: unknown;
  honesty: "PROVEN" | "UNKNOWN";
};

export type CriticalReasonClassificationV2 = {
  reason: string;
  classification: BrokenClassificationV2;
  basis: string;
};

export type BrokenStateV2 = {
  classification: BrokenClassificationV2;
  statement: string | null;
  cited_fields: CitedFieldV2[];
  conflicts: string[];
  unknown_reasons: string[];
  critical_reason_classifications: CriticalReasonClassificationV2[];
};

export type BindingConstraintV2 = {
  statement: string | null;
  honesty: HonestyLabelV2;
  cited_fields: CitedFieldV2[];
  unknown_reasons: string[];
};

export type ExecutiveRuntimeBrokenFirstSnapshotV2 = {
  contract: typeof EXECUTIVE_RUNTIME_BROKEN_FIRST_CONTRACT_V2;
  runtime_slice: typeof EXECUTIVE_RUNTIME_BROKEN_FIRST_SLICE_V2;
  source_contract: typeof EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_CONTRACT_REL_V2;
  source_command: typeof EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_COMMAND_V2;
  generated_at: string;
  cycle_status: "ADJUDICATED_STOP" | "FAIL_CLOSED";
  question: "Is BuckParts materially broken right now, and if so, what exactly is broken?";
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
  observe: {
    cycle_status: "OBSERVED_STOP" | "FAIL_CLOSED" | "SKIPPED";
    blocked_reasons: string[];
  };
  understand: {
    cycle_status: "UNDERSTOOD_STOP" | "FAIL_CLOSED" | "SKIPPED";
    blocked_reasons: string[];
  };
  adjudication: {
    neither_side_assumed: true;
    canonical_dispatch_status: unknown;
    canonical_command_executable: unknown;
    system_health_status: unknown;
    note: string;
  };
  broken_state: BrokenStateV2;
  binding_constraint: BindingConstraintV2;
  blocked_reasons: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const CRITICAL_REASON_TABLE: Record<
  string,
  { classification: BrokenClassificationV2; basis: string }
> = {
  "affiliate_tracker.health.status is ACTION_REQUIRED": {
    classification: "DEGRADED",
    basis: "Affiliate reapply is monetization (Constitution §4 item 5); not a proven trust/public-guidance failure.",
  },
  "learning_outcomes_metrics.runtime_status is UNKNOWN": {
    classification: "DEGRADED",
    basis: "UNKNOWN metric is never converted into a HARD_BREAK or into healthy; learning_outcomes is not a required Executive sensor for public buy-path truth.",
  },
  "cta_coverage_metrics.runtime_status is UNKNOWN": {
    classification: "SENSOR_BREAK",
    basis: "CTA coverage runtime UNKNOWN — Executive cannot observe public buy-path coverage. UNKNOWN is not a proven HARD_BREAK.",
  },
  "retailer_link_state_metrics.runtime_status is UNKNOWN": {
    classification: "SENSOR_BREAK",
    basis: "Retailer-link state runtime UNKNOWN — Executive cannot observe retailer-link integrity. UNKNOWN is not a proven HARD_BREAK.",
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasOwn(record: Record<string, unknown> | null, key: string): boolean {
  return Boolean(record && Object.prototype.hasOwnProperty.call(record, key));
}

function cite(jq_path: string, observed: unknown, present: boolean): CitedFieldV2 {
  return { jq_path, observed: present ? observed : null, honesty: present ? "PROVEN" : "UNKNOWN" };
}

function stringifyObserved(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "UNKNOWN";
  }
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

function rank(classification: BrokenClassificationV2): number {
  switch (classification) {
    case "HARD_BREAK":
      return 4;
    case "SENSOR_BREAK":
      return 3;
    case "DEGRADED":
      return 2;
    case "NOT_BROKEN":
      return 1;
    default:
      return 0;
  }
}

function classifyCriticalReason(reason: string): CriticalReasonClassificationV2 {
  const mapped = CRITICAL_REASON_TABLE[reason];
  if (mapped) {
    return { reason, classification: mapped.classification, basis: mapped.basis };
  }
  return {
    reason,
    classification: "UNKNOWN",
    basis: "Unrecognized system_health_summary.reason — cannot treat as HARD_BREAK or as healthy.",
  };
}

export function emptyBrokenFirstSnapshotV2(generated_at: string): ExecutiveRuntimeBrokenFirstSnapshotV2 {
  const missing = ["missing_required_source:command_center"];
  return {
    contract: EXECUTIVE_RUNTIME_BROKEN_FIRST_CONTRACT_V2,
    runtime_slice: EXECUTIVE_RUNTIME_BROKEN_FIRST_SLICE_V2,
    source_contract: EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_CONTRACT_REL_V2,
    source_command: EXECUTIVE_RUNTIME_BROKEN_FIRST_SOURCE_COMMAND_V2,
    generated_at,
    cycle_status: "FAIL_CLOSED",
    question: "Is BuckParts materially broken right now, and if so, what exactly is broken?",
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
    observe: { cycle_status: "SKIPPED", blocked_reasons: [] },
    understand: { cycle_status: "SKIPPED", blocked_reasons: [] },
    adjudication: {
      neither_side_assumed: true,
      canonical_dispatch_status: null,
      canonical_command_executable: null,
      system_health_status: null,
      note: "canonical dispatch_status=READY and system_health_summary.status=CRITICAL are labels; neither wins a priori.",
    },
    broken_state: {
      classification: "UNKNOWN",
      statement: null,
      cited_fields: [],
      conflicts: [],
      unknown_reasons: missing,
      critical_reason_classifications: [],
    },
    binding_constraint: {
      statement: null,
      honesty: "UNKNOWN",
      cited_fields: [],
      unknown_reasons: missing,
    },
    blocked_reasons: [...missing],
    proven_facts: [
      "PROVEN: v2 authority locks are false — no NBA, dispatch, mutation, or steering.",
      "PROVEN: selected_work=null; recommended_action=null; persistent_world_model_written=false.",
    ],
    inferred_facts: [],
    unknown_facts: [],
  };
}

function buildBindingConstraint(args: {
  hardBreak: boolean;
  brokenUnknown: boolean;
  canonical: Record<string, unknown> | null;
  canonicalPresent: boolean;
  odq: Record<string, unknown> | null;
  odqPresent: boolean;
  health: Record<string, unknown> | null;
  healthPresent: boolean;
  brokenClassification: BrokenClassificationV2;
  reasonClasses: CriticalReasonClassificationV2[];
}): BindingConstraintV2 {
  const cited: CitedFieldV2[] = [
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
      ".command_center_v2.canonical_final_operating_decision_v1.steering_override_source",
      args.canonical?.steering_override_source ?? null,
      args.canonicalPresent && hasOwn(args.canonical, "steering_override_source"),
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

  if (args.hardBreak) {
    return {
      statement: null,
      honesty: "UNKNOWN",
      cited_fields: cited,
      unknown_reasons: [
        "constraint analysis stopped because a HARD_BREAK is proven — ordinary growth/constraint ranking is outranked.",
      ],
    };
  }
  if (args.brokenUnknown) {
    return {
      statement: null,
      honesty: "UNKNOWN",
      cited_fields: cited,
      unknown_reasons: [
        "broken_state is UNKNOWN — cannot establish a binding constraint without inventing that the company is not materially broken.",
      ],
    };
  }
  if (!args.canonicalPresent) {
    return {
      statement: null,
      honesty: "UNKNOWN",
      cited_fields: cited,
      unknown_reasons: ["canonical_final_operating_decision_v1 missing — no constraint restatement."],
    };
  }

  const pending = args.odqPresent ? args.odq?.pending_count : null;
  const founderGate =
    args.canonical?.owner_review_required === true ||
    args.canonical?.dispatch_status === "OWNER_REVIEW_REQUIRED" ||
    (typeof pending === "number" && pending > 0);
  const executableHalt =
    args.canonical?.command_executable === false ||
    (typeof args.canonical?.dispatch_status === "string" &&
      args.canonical.dispatch_status !== "READY" &&
      args.canonical.dispatch_status !== "OWNER_REVIEW_REQUIRED");

  const reasonSummary =
    args.reasonClasses.length > 0
      ? args.reasonClasses
          .map((row) => `${row.reason}=>${row.classification}`)
          .join("; ")
      : "none";

  if (founderGate) {
    return {
      statement:
        `Founder-gate bind: owner_review_required=${stringifyObserved(args.canonical?.owner_review_required)}; ` +
        `dispatch_status=${stringifyObserved(args.canonical?.dispatch_status)}; ` +
        `ODQ pending_count=${stringifyObserved(pending)}. ` +
        `system_health_summary.status=${stringifyObserved(args.health?.status)} underlying=${reasonSummary}.`,
      honesty: "PROVEN",
      cited_fields: cited,
      unknown_reasons: [],
    };
  }
  if (executableHalt) {
    return {
      statement:
        `Execution halt bind: dispatch_status=${stringifyObserved(args.canonical?.dispatch_status)}; ` +
        `command_executable=${stringifyObserved(args.canonical?.command_executable)}; ` +
        `steering_override_source=${stringifyObserved(args.canonical?.steering_override_source)}.`,
      honesty: "PROVEN",
      cited_fields: cited,
      unknown_reasons: [],
    };
  }

  return {
    statement:
      `No founder-gate or execution halt is proven. ` +
      `Canonical steering_override_source=${stringifyObserved(args.canonical?.steering_override_source)}; ` +
      `dispatch_status=${stringifyObserved(args.canonical?.dispatch_status)}; ` +
      `command_executable=${stringifyObserved(args.canonical?.command_executable)}. ` +
      `system_health_summary.status=${stringifyObserved(args.health?.status)} does not qualify as HARD_BREAK ` +
      `(underlying=${reasonSummary}; broken_state=${args.brokenClassification}).`,
    honesty: "PROVEN",
    cited_fields: cited,
    unknown_reasons: [],
  };
}

export function buildExecutiveRuntimeBrokenFirstV2(args: {
  commandCenter: unknown;
  generated_at?: string;
  observe?: ExecutiveRuntimeBrokenFirstSnapshotV2["observe"];
  understand?: ExecutiveRuntimeBrokenFirstSnapshotV2["understand"];
}): ExecutiveRuntimeBrokenFirstSnapshotV2 {
  const generated_at = args.generated_at ?? new Date().toISOString();
  const snapshot = emptyBrokenFirstSnapshotV2(generated_at);
  snapshot.observe = args.observe ?? { cycle_status: "SKIPPED", blocked_reasons: [] };
  snapshot.understand = args.understand ?? { cycle_status: "SKIPPED", blocked_reasons: [] };
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
  } else if (!hasOwn(canonical, "dispatch_status") || !hasOwn(canonical, "command_executable")) {
    blocked.push(
      "canonical_dispatch_refused: dispatch_status and/or command_executable absent — dispatch treated as refused",
    );
  }

  const healthPresent = hasOwn(root, "system_health_summary");
  const health = asRecord(root.system_health_summary);
  const odqPresent = hasOwn(v2, "owner_decision_queue_v1");
  const odq = asRecord(v2.owner_decision_queue_v1);
  const issuesPresent = hasOwn(v2, "command_center_issue_registry_v1");
  const issues = asRecord(v2.command_center_issue_registry_v1);
  const outcomePresent = hasOwn(v2, "phase4_outcome_capture_v1");
  const outcome = asRecord(v2.phase4_outcome_capture_v1);

  if (args.observe?.cycle_status === "FAIL_CLOSED") {
    blocked.push("observe_fail_closed");
    blocked.push(...(args.observe.blocked_reasons ?? []));
  }

  snapshot.adjudication = {
    neither_side_assumed: true,
    canonical_dispatch_status: canonicalPresent ? canonical?.dispatch_status ?? null : null,
    canonical_command_executable: canonicalPresent ? canonical?.command_executable ?? null : null,
    system_health_status: healthPresent ? health?.status ?? null : null,
    note: "canonical dispatch_status=READY and system_health_summary.status=CRITICAL are labels; neither wins a priori. Underlying fields decide.",
  };

  const reasonsRaw = healthPresent && Array.isArray(health?.reasons) ? health.reasons : null;
  const reasons = (reasonsRaw ?? []).filter((row): row is string => typeof row === "string");
  const reasonClasses = reasons.map(classifyCriticalReason);

  const cited: CitedFieldV2[] = [
    cite(
      ".system_health_summary.status",
      health?.status ?? null,
      healthPresent && hasOwn(health, "status"),
    ),
    cite(
      ".system_health_summary.reasons",
      reasonsRaw,
      healthPresent && hasOwn(health, "reasons"),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.dispatch_status",
      canonical?.dispatch_status ?? null,
      Boolean(canonicalPresent && canonical && hasOwn(canonical, "dispatch_status")),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.command_executable",
      canonical?.command_executable ?? null,
      Boolean(canonicalPresent && canonical && hasOwn(canonical, "command_executable")),
    ),
    cite(
      ".command_center_v2.canonical_final_operating_decision_v1.steering_override_source",
      canonical?.steering_override_source ?? null,
      Boolean(canonicalPresent && canonical && hasOwn(canonical, "steering_override_source")),
    ),
    cite(
      ".command_center_v2.command_center_issue_registry_v1.steering_override_active",
      issues?.steering_override_active ?? null,
      issuesPresent && hasOwn(issues, "steering_override_active"),
    ),
    cite(
      ".command_center_v2.command_center_issue_registry_v1.highest_priority_steering_eligible_issue",
      issuePreview(issuesPresent ? asRecord(issues?.highest_priority_steering_eligible_issue) : null),
      issuesPresent && hasOwn(issues, "highest_priority_steering_eligible_issue"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.handoff_from_confident_buy_count",
      outcome?.handoff_from_confident_buy_count ?? null,
      outcomePresent && hasOwn(outcome, "handoff_from_confident_buy_count"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.nba_authority",
      outcome?.nba_authority ?? null,
      outcomePresent && hasOwn(outcome, "nba_authority"),
    ),
    cite(
      ".command_center_v2.phase4_outcome_capture_v1.steering_authority",
      outcome?.steering_authority ?? null,
      outcomePresent && hasOwn(outcome, "steering_authority"),
    ),
  ];

  const findings: Array<{ classification: BrokenClassificationV2; statement: string }> = [];
  const conflicts: string[] = [];
  const unknown_reasons: string[] = [];

  const steeringIssue = issuesPresent ? asRecord(issues?.highest_priority_steering_eligible_issue) : null;
  const tier0Steering =
    issues?.steering_override_active === true ||
    (steeringIssue != null && steeringIssue.severity === "TIER_0");
  if (tier0Steering) {
    findings.push({
      classification: "HARD_BREAK",
      statement:
        `Issue registry steering-eligible TIER_0 is active ` +
        `(steering_override_active=${stringifyObserved(issues?.steering_override_active)}, ` +
        `highest_priority_steering_eligible_issue=${stringifyObserved(steeringIssue?.issue_id)}). ` +
        `This is a proven trust/correctness stop-the-line and outranks ordinary READY work.`,
    });
  }
  if (canonicalPresent && canonical?.steering_override_source === "brain_stop_the_line") {
    findings.push({
      classification: "HARD_BREAK",
      statement:
        "Canonical steering_override_source=brain_stop_the_line — proven stop-the-line bind; outranks ordinary READY work.",
    });
  }

  for (const row of reasonClasses) {
    if (row.classification === "UNKNOWN") {
      unknown_reasons.push(`Unrecognized CRITICAL reason: ${row.reason}`);
    } else if (row.classification !== "NOT_BROKEN") {
      findings.push({
        classification: row.classification,
        statement: `${row.reason} classified ${row.classification}: ${row.basis}`,
      });
    }
  }

  if (healthPresent && health?.status === "CRITICAL" && reasonsRaw === null) {
    unknown_reasons.push(
      "system_health_summary.status=CRITICAL but reasons are missing — a CRITICAL label is not proof of a material break.",
    );
  }

  const joinUnknown =
    outcomePresent && outcome?.handoff_from_confident_buy_count === "UNKNOWN";
  if (joinUnknown) {
    findings.push({
      classification: "SENSOR_BREAK",
      statement:
        "Outcome Join handoff_from_confident_buy_count=UNKNOWN — Executive cannot observe BUY handoffs. " +
        "Join remains non-steering (nba_authority/steering_authority are not used to select work).",
    });
  }

  const unclassifiableCritical =
    healthPresent && health?.status === "CRITICAL" && reasonClasses.some((row) => row.classification === "UNKNOWN");

  let classification: BrokenClassificationV2 = "NOT_BROKEN";
  if (blocked.length > 0 && !canonicalPresent) {
    classification = "UNKNOWN";
  } else if (unclassifiableCritical && !findings.some((row) => row.classification === "HARD_BREAK")) {
    classification = "UNKNOWN";
    conflicts.push(
      "CONFLICT: system_health_summary.status=CRITICAL includes an unrecognized reason; cannot rank it against READY without inventing a break class.",
    );
  } else if (findings.length === 0) {
    classification = "NOT_BROKEN";
  } else {
    classification = findings.reduce((best, row) => (rank(row.classification) > rank(best) ? row.classification : best), findings[0]!.classification);
  }

  const hardBreak = classification === "HARD_BREAK";
  const brokenUnknown = classification === "UNKNOWN";

  let statement: string | null = null;
  if (classification === "UNKNOWN") {
    statement = null;
  } else if (classification === "NOT_BROKEN") {
    statement =
      "No material HARD_BREAK, SENSOR_BREAK, or DEGRADED condition is proven from underlying Command Center fields. " +
      `Canonical dispatch_status=${stringifyObserved(canonical?.dispatch_status)}; ` +
      `system_health_summary.status=${stringifyObserved(health?.status)}.`;
  } else {
    const matching = findings.filter((row) => row.classification === classification);
    statement = matching.map((row) => row.statement).join(" ");
    if (
      canonical?.dispatch_status === "READY" &&
      canonical?.command_executable === true &&
      health?.status === "CRITICAL"
    ) {
      statement +=
        " Adjudication: dispatch_status=READY and system_health_summary.status=CRITICAL were both observed; neither label was assumed to win.";
    }
  }

  snapshot.broken_state = {
    classification,
    statement,
    cited_fields: cited,
    conflicts,
    unknown_reasons,
    critical_reason_classifications: reasonClasses,
  };
  snapshot.binding_constraint = buildBindingConstraint({
    hardBreak,
    brokenUnknown,
    canonical,
    canonicalPresent: Boolean(canonicalPresent && canonical),
    odq,
    odqPresent: Boolean(odqPresent && odq),
    health,
    healthPresent: Boolean(healthPresent && health),
    brokenClassification: classification,
    reasonClasses,
  });

  snapshot.blocked_reasons = blocked;
  snapshot.cycle_status = blocked.length === 0 ? "ADJUDICATED_STOP" : "FAIL_CLOSED";
  snapshot.proven_facts = [
    "PROVEN: v2 authority locks are false — no NBA, dispatch, mutation, or steering.",
    "PROVEN: selected_work=null; recommended_action=null; persistent_world_model_written=false.",
    "PROVEN: a CRITICAL label is not itself a HARD_BREAK; underlying reasons are classified individually.",
    "PROVEN: Outcome Join is observed as a sensor only; nba_authority and steering_authority are not used to select work.",
    ...(snapshot.broken_state.classification !== "UNKNOWN" && snapshot.broken_state.statement
      ? [`PROVEN: broken_state=${snapshot.broken_state.classification}.`]
      : []),
  ];
  snapshot.inferred_facts = [];
  snapshot.unknown_facts = [
    ...blocked.map((row) => `UNKNOWN: ${row}`),
    ...unknown_reasons.map((row) => `UNKNOWN: ${row}`),
    ...(snapshot.binding_constraint.honesty === "UNKNOWN"
      ? snapshot.binding_constraint.unknown_reasons.map((row) => `UNKNOWN: binding_constraint: ${row}`)
      : []),
  ];

  return snapshot;
}

export function brokenFirstSucceededV2(snapshot: ExecutiveRuntimeBrokenFirstSnapshotV2): boolean {
  return snapshot.cycle_status === "ADJUDICATED_STOP" && snapshot.blocked_reasons.length === 0;
}
