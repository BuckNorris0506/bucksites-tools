/**
 * Executive Autonomy Backlog v1 — smallest changes that permanently reduce founder involvement.
 *
 * Consumes Work Discovery + Work Blockers. Not a product roadmap, engineering backlog,
 * or business ranking. Ranks only by proven autonomy gained (work items that would
 * become Executive-executable without founder). Does not dispatch, mutate, or invent.
 */

import type { EpistemicTagV1 } from "./buckparts-executive-command-eligibility-v1";
import {
  discoverExecutiveWorkBlockersV1,
  type ExecutiveAutonomyBlockerAggregateV1,
  type ExecutiveWorkBlockerClassV1,
  type ExecutiveWorkBlockersSnapshotV1,
} from "./buckparts-executive-work-blockers-v1";

export const EXECUTIVE_AUTONOMY_BACKLOG_CONTRACT_V1 =
  "buckparts_executive_autonomy_backlog_v1" as const;

export const EXECUTIVE_AUTONOMY_BACKLOG_REPORT_NAME_V1 =
  "buckparts_executive_autonomy_backlog_v1" as const;

export type ExecutiveAutonomyAuthorityRequiredV1 =
  | "dispatch_allowlist_edit"
  | "founder_owner_review_remains"
  | "prove_exact_command_then_allowlist"
  | "restore_named_artifact"
  | "restore_external_observation"
  | "unknown";

export type ExecutiveAutonomyCadenceV1 = "one_time" | "recurring" | "unknown";

export type ExecutiveAutonomyOpportunityV1 = {
  opportunity_id: string;
  affected_work_items: string[];
  blocker_class: ExecutiveWorkBlockerClassV1;
  current_founder_work: string;
  smallest_change: string;
  expected_manual_steps_removed: number | null;
  expected_manual_steps_removed_epistemic: EpistemicTagV1;
  recurring_or_one_time: ExecutiveAutonomyCadenceV1;
  authority_required: ExecutiveAutonomyAuthorityRequiredV1;
  evidence: string[];
  epistemic: EpistemicTagV1;
  blocker_fingerprint: string;
  source: "discovered_work" | "unobserved_detector";
};

export type ExecutiveAutonomyBacklogSnapshotV1 = {
  contract: typeof EXECUTIVE_AUTONOMY_BACKLOG_CONTRACT_V1;
  report_name: typeof EXECUTIVE_AUTONOMY_BACKLOG_REPORT_NAME_V1;
  generated_at: string;
  observation_kind: "autonomy_backlog";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  steering_authority: false;
  ranking_performed: true;
  ranking_kind: "autonomy_gained_only";
  business_opportunity_ranking_performed: false;
  engineering_effort_ranking_performed: false;
  revenue_ranking_performed: false;
  command_center_rebuilt: false;
  outcome_join_consulted: false;
  catalog_epistemic: "PROVEN";
  completeness_epistemic: "PROVEN";
  completeness_status: "INCOMPLETE";
  opportunities: ExecutiveAutonomyOpportunityV1[];
  aggregated_opportunities: ExecutiveAutonomyOpportunityV1[];
  highest_autonomy_opportunity: ExecutiveAutonomyOpportunityV1 | null;
  tied_highest_opportunities: ExecutiveAutonomyOpportunityV1[];
  autonomy_question: {
    question: "What single implemented change would allow BuckParts to run itself more than any other currently known change?";
    answer: string;
    epistemic: EpistemicTagV1;
  };
};

function parseFingerprintReasonV1(fingerprint: string): string {
  const parts = fingerprint.split("|");
  return parts[1] ?? "";
}

function opportunityIdV1(fingerprint: string): string {
  return `autonomy:${fingerprint}`;
}

/**
 * Closed map: autonomy fields from proven blocker fingerprints only.
 * expected_manual_steps_removed is PROVEN only when the smallest change would
 * make already-discovered work Executive-dispatchable without weakening founder gates.
 */
function autonomyFieldsFromAggregateV1(agg: ExecutiveAutonomyBlockerAggregateV1): {
  current_founder_work: string;
  expected_manual_steps_removed: number | null;
  expected_manual_steps_removed_epistemic: EpistemicTagV1;
  recurring_or_one_time: ExecutiveAutonomyCadenceV1;
  authority_required: ExecutiveAutonomyAuthorityRequiredV1;
  epistemic: EpistemicTagV1;
} {
  const reason = parseFingerprintReasonV1(agg.blocker_fingerprint);
  const count = agg.blocked_work_count;

  if (agg.source === "unobserved_detector") {
    if (agg.blocker_class === "external_dependency") {
      return {
        current_founder_work:
          "Founder must restore the external dependency so Work Discovery can observe whether work exists. Observation is not execution.",
        expected_manual_steps_removed: null,
        expected_manual_steps_removed_epistemic: "UNKNOWN",
        recurring_or_one_time: "one_time",
        authority_required: "restore_external_observation",
        epistemic: "UNKNOWN",
      };
    }
    return {
      current_founder_work:
        "Founder must supply the missing observation input so Work Discovery can observe whether work exists. Observation is not execution.",
      expected_manual_steps_removed: null,
      expected_manual_steps_removed_epistemic: "UNKNOWN",
      recurring_or_one_time: "one_time",
      authority_required: "restore_named_artifact",
      epistemic: "UNKNOWN",
    };
  }

  if (reason === "exact_command_not_on_dispatch_allowlist") {
    return {
      current_founder_work:
        "Founder must manually invoke the proven exact_command (or prompt an agent) because Executive dispatch cannot run a non-allowlisted command.",
      expected_manual_steps_removed: count,
      expected_manual_steps_removed_epistemic: "PROVEN",
      recurring_or_one_time: "one_time",
      authority_required: "dispatch_allowlist_edit",
      epistemic: "PROVEN",
    };
  }

  if (reason === "dispatch_runner_refuses_owner_review_required") {
    return {
      current_founder_work:
        "Founder must run the owner-review command; Executive dispatch refuses owner_review_required=true. The founder gate stays.",
      expected_manual_steps_removed: 0,
      expected_manual_steps_removed_epistemic: "PROVEN",
      recurring_or_one_time: "recurring",
      authority_required: "founder_owner_review_remains",
      epistemic: "PROVEN",
    };
  }

  if (reason === "no_proven_exact_command") {
    return {
      current_founder_work:
        "Founder must choose how to perform this work; Work Discovery bound no proven exact_command. This organ does not invent one.",
      expected_manual_steps_removed: null,
      expected_manual_steps_removed_epistemic: "UNKNOWN",
      recurring_or_one_time: "unknown",
      authority_required: "prove_exact_command_then_allowlist",
      epistemic: "UNKNOWN",
    };
  }

  if (reason === "entrypoint_missing") {
    return {
      current_founder_work:
        "Founder must restore or replace the missing entrypoint file before Executive dispatch can run the bound command.",
      expected_manual_steps_removed: count,
      expected_manual_steps_removed_epistemic: "PROVEN",
      recurring_or_one_time: "one_time",
      authority_required: "restore_named_artifact",
      epistemic: "PROVEN",
    };
  }

  if (reason === "required_plan_file_missing" || reason === "exact_command_has_unresolved_placeholder") {
    return {
      current_founder_work:
        "Founder must provide the plan/artifact path already named by the bound command.",
      expected_manual_steps_removed: count,
      expected_manual_steps_removed_epistemic: "PROVEN",
      recurring_or_one_time: "one_time",
      authority_required: "restore_named_artifact",
      epistemic: "PROVEN",
    };
  }

  if (
    reason === "exact_command_contains_apply_or_mutation_needle" ||
    reason === "guarded_apply_explicitly_excluded_from_dispatch_allowlist" ||
    reason === "allowlist_mutation_allowed_not_false"
  ) {
    return {
      current_founder_work:
        "Founder must run explicit apply outside Executive dispatch. This organ does not weaken mutation gates.",
      expected_manual_steps_removed: 0,
      expected_manual_steps_removed_epistemic: "PROVEN",
      recurring_or_one_time: "recurring",
      authority_required: "founder_owner_review_remains",
      epistemic: "PROVEN",
    };
  }

  return {
    current_founder_work: "UNKNOWN: no closed autonomy map for this blocker fingerprint",
    expected_manual_steps_removed: null,
    expected_manual_steps_removed_epistemic: "UNKNOWN",
    recurring_or_one_time: "unknown",
    authority_required: "unknown",
    epistemic: "UNKNOWN",
  };
}

export function opportunityFromBlockerAggregateV1(
  agg: ExecutiveAutonomyBlockerAggregateV1,
): ExecutiveAutonomyOpportunityV1 {
  const fields = autonomyFieldsFromAggregateV1(agg);
  return {
    opportunity_id: opportunityIdV1(agg.blocker_fingerprint),
    affected_work_items: [...agg.blocked_work_ids],
    blocker_class: agg.blocker_class,
    current_founder_work: fields.current_founder_work,
    smallest_change: agg.smallest_change_to_make_executable,
    expected_manual_steps_removed: fields.expected_manual_steps_removed,
    expected_manual_steps_removed_epistemic: fields.expected_manual_steps_removed_epistemic,
    recurring_or_one_time: fields.recurring_or_one_time,
    authority_required: fields.authority_required,
    evidence: [
      `blocker_fingerprint=${agg.blocker_fingerprint}`,
      `blocked_work_count=${String(agg.blocked_work_count)}`,
      `immediate_blocking_condition=${agg.immediate_blocking_condition}`,
      `source=${agg.source}`,
      `blocker_epistemic=${agg.epistemic}`,
      "expected_manual_steps_removed counts discovered work items that would become Executive-dispatchable; not hours, revenue, or engineering effort",
    ],
    epistemic: fields.epistemic,
    blocker_fingerprint: agg.blocker_fingerprint,
    source: agg.source,
  };
}

function compareAutonomyGainedV1(
  a: ExecutiveAutonomyOpportunityV1,
  b: ExecutiveAutonomyOpportunityV1,
): number {
  const aProven =
    a.expected_manual_steps_removed_epistemic === "PROVEN" && a.expected_manual_steps_removed !== null;
  const bProven =
    b.expected_manual_steps_removed_epistemic === "PROVEN" && b.expected_manual_steps_removed !== null;
  if (aProven && !bProven) return -1;
  if (!aProven && bProven) return 1;
  if (aProven && bProven) {
    return (b.expected_manual_steps_removed ?? 0) - (a.expected_manual_steps_removed ?? 0);
  }
  return 0;
}

export function buildExecutiveAutonomyBacklogFromBlockersV1(
  blockers: ExecutiveWorkBlockersSnapshotV1,
  nowIso: string = blockers.generated_at,
): ExecutiveAutonomyBacklogSnapshotV1 {
  const opportunities = blockers.autonomy_blocker_aggregates.map((agg) =>
    opportunityFromBlockerAggregateV1(agg),
  );
  const aggregated_opportunities = [...opportunities].sort(compareAutonomyGainedV1);

  const provenPositive = aggregated_opportunities.filter(
    (o) =>
      o.expected_manual_steps_removed_epistemic === "PROVEN" &&
      o.expected_manual_steps_removed !== null &&
      o.expected_manual_steps_removed > 0,
  );
  const max =
    provenPositive.length > 0
      ? Math.max(...provenPositive.map((o) => o.expected_manual_steps_removed as number))
      : null;
  const tied =
    max === null ? [] : provenPositive.filter((o) => o.expected_manual_steps_removed === max);
  const highest = tied.length === 1 ? tied[0] : null;

  let epistemic: EpistemicTagV1 = "UNKNOWN";
  let answer =
    "UNKNOWN: no proven autonomy gain among current blockers (no closed change that makes discovered work Executive-dispatchable without inventing a command or weakening a founder gate).";
  if (tied.length === 1 && highest) {
    epistemic = "PROVEN";
    answer = `PROVEN: implement ${JSON.stringify(highest.smallest_change)} This one-time change would remove ${String(highest.expected_manual_steps_removed)} founder manual step(s) across ${highest.affected_work_items.join(", ")}. Ranked by discovered work items unblocked, not revenue or effort. This organ does not apply the change.`;
  } else if (tied.length > 1) {
    epistemic = "INFERRED";
    answer = `INFERRED: ${String(tied.length)} opportunities each remove ${String(max)} proven founder step(s) (${tied.map((o) => o.opportunity_id).join("; ")}). Current evidence cannot break the tie: autonomy gained is equal, and this organ does not rank by revenue, engineering effort, or business value.`;
  } else if (
    aggregated_opportunities.some(
      (o) =>
        o.expected_manual_steps_removed_epistemic === "PROVEN" &&
        o.expected_manual_steps_removed === 0,
    )
  ) {
    epistemic = "PROVEN";
    answer =
      "PROVEN: no currently known change permanently reduces founder involvement without weakening a founder/mutation gate or inventing a missing command. Remaining blockers are founder_gate (expected_manual_steps_removed=0) or UNKNOWN observation/command gaps.";
  }

  return {
    contract: EXECUTIVE_AUTONOMY_BACKLOG_CONTRACT_V1,
    report_name: EXECUTIVE_AUTONOMY_BACKLOG_REPORT_NAME_V1,
    generated_at: nowIso,
    observation_kind: "autonomy_backlog",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: true,
    ranking_kind: "autonomy_gained_only",
    business_opportunity_ranking_performed: false,
    engineering_effort_ranking_performed: false,
    revenue_ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    opportunities,
    aggregated_opportunities,
    highest_autonomy_opportunity: highest,
    tied_highest_opportunities: tied.length > 1 ? tied : [],
    autonomy_question: {
      question:
        "What single implemented change would allow BuckParts to run itself more than any other currently known change?",
      answer,
      epistemic,
    },
  };
}

export async function discoverExecutiveAutonomyBacklogV1(args: {
  rootDir?: string;
  nowIso?: string;
  blockers_snapshot?: ExecutiveWorkBlockersSnapshotV1;
} = {}): Promise<ExecutiveAutonomyBacklogSnapshotV1> {
  const blockers =
    args.blockers_snapshot ??
    (await discoverExecutiveWorkBlockersV1({ rootDir: args.rootDir, nowIso: args.nowIso }));
  return buildExecutiveAutonomyBacklogFromBlockersV1(
    blockers,
    args.nowIso ?? blockers.generated_at,
  );
}
