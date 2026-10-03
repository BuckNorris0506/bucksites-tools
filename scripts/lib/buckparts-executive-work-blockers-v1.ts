/**
 * Executive Work Blockers v1 — why discovered work cannot execute.
 *
 * Ranks autonomy blockers only (shared fingerprints by count).
 * Does not rank business opportunities. Does not dispatch. Does not mutate.
 * Does not invent blockers: class and smallest-change come from a closed map
 * of Work Discovery blocking_reason values.
 */

import type { EpistemicTagV1 } from "./buckparts-executive-command-eligibility-v1";
import {
  discoverExecutiveWorkV1,
  type ExecutiveDiscoveredWorkV1,
  type ExecutiveWorkDiscoverySnapshotV1,
  type ExecutiveWorkUnobservedDetectorV1,
} from "./buckparts-executive-work-discovery-v1";

export const EXECUTIVE_WORK_BLOCKERS_CONTRACT_V1 =
  "buckparts_executive_work_blockers_v1" as const;

export const EXECUTIVE_WORK_BLOCKERS_REPORT_NAME_V1 =
  "buckparts_executive_work_blockers_v1" as const;

export type ExecutiveWorkBlockerClassV1 =
  | "authority"
  | "missing_worker"
  | "missing_command"
  | "missing_data"
  | "missing_observation"
  | "founder_gate"
  | "external_dependency"
  | "unknown";

export type ExecutiveWorkItemBlockerV1 = {
  work_id: string;
  executable: boolean;
  immediate_blocking_condition: string | null;
  blocker_class: ExecutiveWorkBlockerClassV1 | null;
  smallest_change_to_make_executable: string | null;
  evidence: string[];
  blocker_fingerprint: string | null;
  classification_epistemic: EpistemicTagV1;
};

export type ExecutiveAutonomyBlockerAggregateV1 = {
  blocker_fingerprint: string;
  blocker_class: ExecutiveWorkBlockerClassV1;
  immediate_blocking_condition: string;
  smallest_change_to_make_executable: string;
  blocked_work_ids: string[];
  blocked_work_count: number;
  source: "discovered_work" | "unobserved_detector";
  epistemic: EpistemicTagV1;
};

export type ExecutiveWorkBlockersSnapshotV1 = {
  contract: typeof EXECUTIVE_WORK_BLOCKERS_CONTRACT_V1;
  report_name: typeof EXECUTIVE_WORK_BLOCKERS_REPORT_NAME_V1;
  generated_at: string;
  observation_kind: "autonomy_blocker_set";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  steering_authority: false;
  ranking_performed: true;
  ranking_kind: "autonomy_blockers_only";
  business_opportunity_ranking_performed: false;
  command_center_rebuilt: false;
  outcome_join_consulted: false;
  catalog_epistemic: "PROVEN";
  completeness_epistemic: "PROVEN";
  completeness_status: "INCOMPLETE";
  work_blockers: ExecutiveWorkItemBlockerV1[];
  unobserved_blockers: ExecutiveWorkItemBlockerV1[];
  autonomy_blocker_aggregates: ExecutiveAutonomyBlockerAggregateV1[];
  highest_autonomy_blocker: ExecutiveAutonomyBlockerAggregateV1 | null;
  highest_autonomy_blocker_epistemic: EpistemicTagV1;
  autonomy_question: {
    question: "What single blocker, if removed, would increase BuckParts' autonomy the most?";
    answer: string;
    epistemic: EpistemicTagV1;
  };
};

function boundCommandFromWorkEvidenceV1(work: ExecutiveDiscoveredWorkV1): string | null {
  if (typeof work.exact_command === "string" && work.exact_command.trim().length > 0) {
    return work.exact_command;
  }
  for (const line of work.evidence) {
    const match = line.match(/^exact_command=(.+)$/);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      if (typeof parsed === "string" && parsed.trim().length > 0 && parsed !== "null") {
        return parsed;
      }
    } catch {
      return match[1];
    }
  }
  return null;
}

type ClosedBlockerMapRowV1 = {
  blocker_class: ExecutiveWorkBlockerClassV1;
  immediate_blocking_condition: (boundCommand: string | null) => string;
  smallest_change: (boundCommand: string | null) => string;
};

/**
 * Closed map: only proven Work Discovery / eligibility reasons.
 * Unmapped reasons classify as unknown (fail closed; do not invent).
 */
const BLOCKING_REASON_MAP_V1: Record<string, ClosedBlockerMapRowV1> = {
  no_proven_exact_command: {
    blocker_class: "missing_command",
    immediate_blocking_condition: () =>
      "Work Discovery bound no proven exact_command that performs this work",
    smallest_change: () =>
      "Prove an exact_command that performs this work and add it to DISPATCH_ALLOWLIST_ENTRIES_V1 with owner_review_required=false and mutation_allowed=false. This organ does not invent that command.",
  },
  exact_command_not_on_dispatch_allowlist: {
    blocker_class: "authority",
    immediate_blocking_condition: (cmd) =>
      cmd
        ? `DISPATCH_ALLOWLIST_ENTRIES_V1 does not include ${JSON.stringify(cmd)}`
        : "DISPATCH_ALLOWLIST_ENTRIES_V1 does not include the bound command",
    smallest_change: (cmd) =>
      cmd
        ? `Add proven exact_command ${JSON.stringify(cmd)} to DISPATCH_ALLOWLIST_ENTRIES_V1 with owner_review_required=false and mutation_allowed=false. This organ does not apply the allowlist edit.`
        : "Add the proven bound command to DISPATCH_ALLOWLIST_ENTRIES_V1 with owner_review_required=false and mutation_allowed=false. This organ does not apply the allowlist edit.",
  },
  dispatch_runner_refuses_owner_review_required: {
    blocker_class: "founder_gate",
    immediate_blocking_condition: (cmd) =>
      cmd
        ? `Dispatch runner refuses owner_review_required=true for ${JSON.stringify(cmd)}`
        : "Dispatch runner refuses owner_review_required=true subprocesses",
    smallest_change: (cmd) =>
      `Founder/operator must run the owner-review command${cmd ? ` ${JSON.stringify(cmd)}` : ""}; Executive dispatch will not subprocess owner_review_required=true. This organ does not weaken the founder gate.`,
  },
  exact_command_has_unresolved_placeholder: {
    blocker_class: "missing_data",
    immediate_blocking_condition: (cmd) =>
      `Bound command has an unresolved placeholder${cmd ? `: ${JSON.stringify(cmd)}` : ""}`,
    smallest_change: () =>
      "Replace placeholder tokens (for example <plan.json>) with a real artifact path. This organ does not invent the path.",
  },
  exact_command_contains_apply_or_mutation_needle: {
    blocker_class: "founder_gate",
    immediate_blocking_condition: (cmd) =>
      `Bound command contains a dispatch-forbidden mutation needle${cmd ? `: ${JSON.stringify(cmd)}` : ""}`,
    smallest_change: () =>
      "Founder-authorized explicit apply outside Executive dispatch. This organ does not run --apply and does not weaken mutation gates.",
  },
  guarded_apply_explicitly_excluded_from_dispatch_allowlist: {
    blocker_class: "founder_gate",
    immediate_blocking_condition: () =>
      "Guarded apply write command is explicitly excluded from DISPATCH_ALLOWLIST_ENTRIES_V1",
    smallest_change: () =>
      "Founder-authorized guarded apply outside Executive dispatch. This organ does not allowlist or run apply.",
  },
  entrypoint_missing: {
    blocker_class: "missing_command",
    immediate_blocking_condition: (cmd) =>
      `Entrypoint file for bound command is missing${cmd ? `: ${JSON.stringify(cmd)}` : ""}`,
    smallest_change: () => "Restore the missing entrypoint file proven by the bound command.",
  },
  required_plan_file_missing: {
    blocker_class: "missing_data",
    immediate_blocking_condition: (cmd) =>
      `Plan file referenced by bound command is missing${cmd ? `: ${JSON.stringify(cmd)}` : ""}`,
    smallest_change: () =>
      "Provide the referenced plan file at the path already named in the exact_command. This organ does not invent a plan.",
  },
  allowlist_mutation_allowed_not_false: {
    blocker_class: "founder_gate",
    immediate_blocking_condition: () =>
      "Allowlist mutation_posture.mutation_allowed is not false",
    smallest_change: () =>
      "Executive dispatch requires mutation_allowed=false. Founder-authorized mutation stays outside this organ.",
  },
};

export function classifyDiscoveredWorkBlockerV1(
  work: ExecutiveDiscoveredWorkV1,
): ExecutiveWorkItemBlockerV1 {
  if (work.executable === true) {
    return {
      work_id: work.work_id,
      executable: true,
      immediate_blocking_condition: null,
      blocker_class: null,
      smallest_change_to_make_executable: null,
      evidence: [...work.evidence, "executable=true; no autonomy blocker"],
      blocker_fingerprint: null,
      classification_epistemic: "PROVEN",
    };
  }

  const boundCommand = boundCommandFromWorkEvidenceV1(work);
  const reason = work.blocking_reason;
  const mapped = reason ? BLOCKING_REASON_MAP_V1[reason] : undefined;

  if (!mapped || !reason) {
    const condition = reason
      ? `Unmapped Work Discovery blocking_reason=${JSON.stringify(reason)}`
      : "Work is not executable and blocking_reason is null";
    return {
      work_id: work.work_id,
      executable: false,
      immediate_blocking_condition: condition,
      blocker_class: "unknown",
      smallest_change_to_make_executable:
        "UNKNOWN: no closed map row for this blocking_reason; do not invent a fix",
      evidence: [
        ...work.evidence,
        `blocking_reason=${JSON.stringify(reason)}`,
        boundCommand ? `bound_command=${JSON.stringify(boundCommand)}` : "bound_command=null",
      ],
      blocker_fingerprint: `unknown|${reason ?? "null"}|${boundCommand ?? ""}`,
      classification_epistemic: "UNKNOWN",
    };
  }

  const immediate = mapped.immediate_blocking_condition(boundCommand);
  const smallest = mapped.smallest_change(boundCommand);
  const fingerprint = `${mapped.blocker_class}|${reason}|${boundCommand ?? ""}`;
  return {
    work_id: work.work_id,
    executable: false,
    immediate_blocking_condition: immediate,
    blocker_class: mapped.blocker_class,
    smallest_change_to_make_executable: smallest,
    evidence: [
      ...work.evidence,
      `blocking_reason=${reason}`,
      `blocker_class=${mapped.blocker_class} mapped from closed BLOCKING_REASON_MAP_V1`,
      boundCommand ? `bound_command=${JSON.stringify(boundCommand)}` : "bound_command=null",
    ],
    blocker_fingerprint: fingerprint,
    classification_epistemic: "PROVEN",
  };
}

function classifyUnobservedDetectorV1(
  detector: ExecutiveWorkUnobservedDetectorV1,
): ExecutiveWorkItemBlockerV1 {
  const reasonLower = `${detector.reason} ${detector.evidence.join(" ")}`.toLowerCase();
  let blocker_class: ExecutiveWorkBlockerClassV1 = "missing_observation";
  let smallest =
    "Restore the detector's observation inputs so Work Discovery can emit a real work item if work exists. This organ does not invent that work.";
  let classification_epistemic: EpistemicTagV1 = "PROVEN";

  if (reasonLower.includes("supabase")) {
    blocker_class = "external_dependency";
    smallest =
      "Provide Supabase credentials/reachability so the retailer-link parity detector can observe. Observation restored ≠ work proven and ≠ apply authorized.";
  } else if (
    reasonLower.includes("gsc") ||
    reasonLower.includes("artifact") ||
    reasonLower.includes("manifest missing")
  ) {
    blocker_class = "missing_data";
    smallest =
      "Provide the missing local artifact named by the detector so observation can complete. Observation restored ≠ work proven.";
  } else if (detector.epistemic === "UNKNOWN" && detector.evidence.some((e) => e.includes("threw"))) {
    blocker_class = "unknown";
    classification_epistemic = "UNKNOWN";
    smallest = "UNKNOWN: detector threw; do not invent a fix from the exception";
  }

  const immediate = detector.reason;
  const fingerprint = `${blocker_class}|unobserved:${detector.detector_id}|`;
  return {
    work_id: detector.detector_id,
    executable: false,
    immediate_blocking_condition: immediate,
    blocker_class,
    smallest_change_to_make_executable: smallest,
    evidence: [
      ...detector.evidence,
      `unobserved_detector=${detector.detector_id}`,
      `detector_epistemic=${detector.epistemic}`,
      "not discovered work; observation blocker only",
    ],
    blocker_fingerprint: fingerprint,
    classification_epistemic,
  };
}

function aggregateBlockersV1(
  workBlockers: ExecutiveWorkItemBlockerV1[],
  unobservedBlockers: ExecutiveWorkItemBlockerV1[],
): ExecutiveAutonomyBlockerAggregateV1[] {
  type Bucket = {
    fingerprint: string;
    blocker_class: ExecutiveWorkBlockerClassV1;
    immediate_blocking_condition: string;
    smallest_change_to_make_executable: string;
    blocked_work_ids: string[];
    source: "discovered_work" | "unobserved_detector";
    epistemic: EpistemicTagV1;
  };
  const buckets = new Map<string, Bucket>();

  const ingest = (
    row: ExecutiveWorkItemBlockerV1,
    source: "discovered_work" | "unobserved_detector",
  ) => {
    if (row.executable || !row.blocker_fingerprint || !row.blocker_class || !row.immediate_blocking_condition) {
      return;
    }
    const existing = buckets.get(row.blocker_fingerprint);
    if (existing) {
      existing.blocked_work_ids.push(row.work_id);
      if (row.classification_epistemic === "UNKNOWN") existing.epistemic = "UNKNOWN";
      return;
    }
    buckets.set(row.blocker_fingerprint, {
      fingerprint: row.blocker_fingerprint,
      blocker_class: row.blocker_class,
      immediate_blocking_condition: row.immediate_blocking_condition,
      smallest_change_to_make_executable: row.smallest_change_to_make_executable ?? "UNKNOWN",
      blocked_work_ids: [row.work_id],
      source,
      epistemic: row.classification_epistemic,
    });
  };

  for (const row of workBlockers) ingest(row, "discovered_work");
  for (const row of unobservedBlockers) ingest(row, "unobserved_detector");

  const aggregates: ExecutiveAutonomyBlockerAggregateV1[] = [...buckets.values()].map((b) => ({
    blocker_fingerprint: b.fingerprint,
    blocker_class: b.blocker_class,
    immediate_blocking_condition: b.immediate_blocking_condition,
    smallest_change_to_make_executable: b.smallest_change_to_make_executable,
    blocked_work_ids: b.blocked_work_ids,
    blocked_work_count: b.blocked_work_ids.length,
    source: b.source,
    epistemic: b.epistemic,
  }));

  aggregates.sort((a, b) => {
    if (b.blocked_work_count !== a.blocked_work_count) {
      return b.blocked_work_count - a.blocked_work_count;
    }
    if (a.source !== b.source) {
      return a.source === "discovered_work" ? -1 : 1;
    }
    return a.blocker_fingerprint.localeCompare(b.blocker_fingerprint);
  });
  return aggregates;
}

export function buildExecutiveWorkBlockersFromSnapshotV1(
  snapshot: ExecutiveWorkDiscoverySnapshotV1,
  nowIso: string = snapshot.generated_at,
): ExecutiveWorkBlockersSnapshotV1 {
  const work_blockers = snapshot.work.map((w) => classifyDiscoveredWorkBlockerV1(w));
  const unobserved_blockers = snapshot.unobserved_detectors.map((d) =>
    classifyUnobservedDetectorV1(d),
  );
  const autonomy_blocker_aggregates = aggregateBlockersV1(work_blockers, unobserved_blockers);
  const discoveredAggregates = autonomy_blocker_aggregates.filter(
    (a) => a.source === "discovered_work",
  );
  const highest = discoveredAggregates[0] ?? autonomy_blocker_aggregates[0] ?? null;

  let highest_epistemic: EpistemicTagV1 = "UNKNOWN";
  let answer = "UNKNOWN: no classified blockers";
  if (highest) {
    const tied =
      autonomy_blocker_aggregates.filter(
        (a) =>
          a.source === highest.source && a.blocked_work_count === highest.blocked_work_count,
      ).length > 1;
    highest_epistemic = tied ? "INFERRED" : highest.epistemic;
    answer = tied
      ? `INFERRED tie on blocked_work_count=${String(highest.blocked_work_count)}; catalog-order fingerprint ${highest.blocker_fingerprint} selected. ${highest.immediate_blocking_condition}`
      : `PROVEN: removing ${highest.blocker_class} fingerprint ${JSON.stringify(highest.blocker_fingerprint)} would unblock ${String(highest.blocked_work_count)} item(s) (${highest.blocked_work_ids.join(", ")}). ${highest.smallest_change_to_make_executable}`;
  }

  return {
    contract: EXECUTIVE_WORK_BLOCKERS_CONTRACT_V1,
    report_name: EXECUTIVE_WORK_BLOCKERS_REPORT_NAME_V1,
    generated_at: nowIso,
    observation_kind: "autonomy_blocker_set",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: true,
    ranking_kind: "autonomy_blockers_only",
    business_opportunity_ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    work_blockers,
    unobserved_blockers,
    autonomy_blocker_aggregates,
    highest_autonomy_blocker: highest,
    highest_autonomy_blocker_epistemic: highest_epistemic,
    autonomy_question: {
      question: "What single blocker, if removed, would increase BuckParts' autonomy the most?",
      answer,
      epistemic: highest_epistemic,
    },
  };
}

export async function discoverExecutiveWorkBlockersV1(args: {
  rootDir?: string;
  nowIso?: string;
  work_snapshot?: ExecutiveWorkDiscoverySnapshotV1;
} = {}): Promise<ExecutiveWorkBlockersSnapshotV1> {
  const snapshot =
    args.work_snapshot ??
    (await discoverExecutiveWorkV1({ rootDir: args.rootDir, nowIso: args.nowIso }));
  return buildExecutiveWorkBlockersFromSnapshotV1(snapshot, args.nowIso ?? snapshot.generated_at);
}
