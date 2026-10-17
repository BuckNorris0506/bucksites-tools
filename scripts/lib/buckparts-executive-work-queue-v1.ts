/**
 * Executive Work Queue v1 — now / not-yet split of discovered work.
 *
 * Answers only:
 *   "What can BuckParts do right now?"
 *   "What cannot BuckParts do yet?"
 *
 * Does not rank, dispatch, mutate, recommend, or invent work.
 * Consumes Executive Work Discovery. Classifies blockers via the closed
 * Work Blockers map. Does not import Autonomy Backlog (that organ ranks).
 */

import { lookupDispatchAllowlistEntryV1 } from "./buckparts-command-center-dispatch-allowlist-v1";
import type { EpistemicTagV1 } from "./buckparts-executive-command-eligibility-v1";
import {
  classifyDiscoveredWorkBlockerV1,
  type ExecutiveWorkBlockerClassV1,
} from "./buckparts-executive-work-blockers-v1";
import {
  discoverExecutiveWorkV1,
  type ExecutiveDiscoveredWorkV1,
  type ExecutiveWorkAuthorityRequiredV1,
  type ExecutiveWorkDiscoverySnapshotV1,
} from "./buckparts-executive-work-discovery-v1";

export const EXECUTIVE_WORK_QUEUE_CONTRACT_V1 =
  "buckparts_executive_work_queue_v1" as const;

export const EXECUTIVE_WORK_QUEUE_REPORT_NAME_V1 =
  "buckparts_executive_work_queue_v1" as const;

export type ExecutiveWorkQueueExecutableItemV1 = {
  work_id: string;
  exact_command: string;
  authority: ExecutiveWorkAuthorityRequiredV1;
  expected_completion_artifact: string | null;
  expected_completion_artifact_epistemic: EpistemicTagV1;
  work_exists_epistemic: EpistemicTagV1;
  executable_epistemic: EpistemicTagV1;
  evidence: string[];
};

export type ExecutiveWorkQueueBlockedItemV1 = {
  work_id: string;
  blocker_class: ExecutiveWorkBlockerClassV1;
  smallest_change: string;
  authority_required: ExecutiveWorkAuthorityRequiredV1;
  blocking_reason: string | null;
  classification_epistemic: EpistemicTagV1;
  work_exists_epistemic: EpistemicTagV1;
  evidence: string[];
};

export type EmptyExecutableQueueProofItemV1 = {
  work_id: string;
  executable: false;
  blocking_reason: string | null;
  blocker_class: ExecutiveWorkBlockerClassV1;
  classification_epistemic: EpistemicTagV1;
};

export type EmptyExecutableQueueProofV1 = {
  epistemic: "PROVEN";
  discovered_work_count: number;
  executable_work_count: 0;
  blocked_work_count: number;
  unobserved_detector_count: number;
  unobserved_not_invented_as_executable: true;
  allowlisted_non_work_not_invented_as_executable: true;
  per_item: EmptyExecutableQueueProofItemV1[];
  why: string;
};

export type ExecutiveWorkQueueSnapshotV1 = {
  contract: typeof EXECUTIVE_WORK_QUEUE_CONTRACT_V1;
  report_name: typeof EXECUTIVE_WORK_QUEUE_REPORT_NAME_V1;
  generated_at: string;
  observation_kind: "now_or_not_yet_work_queue";
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  nba_authority: false;
  dispatch_authority: false;
  dispatch_invoked: false;
  steering_authority: false;
  ranking_performed: false;
  command_center_rebuilt: false;
  outcome_join_consulted: false;
  catalog_epistemic: "PROVEN";
  completeness_epistemic: "PROVEN";
  completeness_status: "INCOMPLETE";
  /** Answers: "What can BuckParts do right now?" Catalog order. Not ranked. */
  executable_work: ExecutiveWorkQueueExecutableItemV1[];
  /** Answers: "What cannot BuckParts do yet?" Catalog order. Not ranked. */
  blocked_work: ExecutiveWorkQueueBlockedItemV1[];
  empty_executable_queue_proof: EmptyExecutableQueueProofV1 | null;
  scale_counts: {
    discovered_work: number;
    executable_work: number;
    blocked_work: number;
    unobserved_detectors: number;
  };
};

/**
 * Closed expected-artifact rule from proven allowlist metadata only.
 * Does not invent on-disk paths. Does not claim a dispatch-run artifact
 * (this organ does not dispatch).
 */
export function expectedCompletionArtifactV1(exact_command: string): {
  expected_completion_artifact: string | null;
  expected_completion_artifact_epistemic: EpistemicTagV1;
  evidence: string[];
} {
  const entry = lookupDispatchAllowlistEntryV1(exact_command);
  if (!entry) {
    return {
      expected_completion_artifact: null,
      expected_completion_artifact_epistemic: "UNKNOWN",
      evidence: [
        `exact_command=${JSON.stringify(exact_command)}`,
        "UNKNOWN: exact_command is not on DISPATCH_ALLOWLIST_ENTRIES_V1; do not invent a completion artifact",
      ],
    };
  }
  if (entry.no_artifact_allowed === true) {
    return {
      expected_completion_artifact: `stdout JSON from ${exact_command} (allowlist no_artifact_allowed=true; this organ does not dispatch and does not claim a run artifact)`,
      expected_completion_artifact_epistemic: "PROVEN",
      evidence: [
        `exact_command=${JSON.stringify(exact_command)}`,
        "allowlist.no_artifact_allowed=true",
        `allowlist.artifact_write_behavior=${entry.artifact_write_behavior}`,
      ],
    };
  }
  return {
    expected_completion_artifact: null,
    expected_completion_artifact_epistemic: "UNKNOWN",
    evidence: [
      `exact_command=${JSON.stringify(exact_command)}`,
      "allowlist.no_artifact_allowed=false",
      `allowlist.artifact_write_behavior=${entry.artifact_write_behavior}`,
      "UNKNOWN: allowlist requires an artifact but no closed map names the on-disk path; do not invent",
    ],
  };
}

function toBlockedItemV1(
  work: ExecutiveDiscoveredWorkV1,
): ExecutiveWorkQueueBlockedItemV1 {
  const classified = classifyDiscoveredWorkBlockerV1(work);
  return {
    work_id: work.work_id,
    blocker_class: classified.blocker_class ?? "unknown",
    smallest_change:
      classified.smallest_change_to_make_executable ??
      "UNKNOWN: no closed map row; do not invent a fix",
    authority_required: work.authority_required,
    blocking_reason: work.blocking_reason,
    classification_epistemic: classified.classification_epistemic,
    work_exists_epistemic: work.work_exists_epistemic,
    evidence: classified.evidence,
  };
}

function toExecutableItemV1(
  work: ExecutiveDiscoveredWorkV1,
  exact_command: string,
): ExecutiveWorkQueueExecutableItemV1 {
  const artifact = expectedCompletionArtifactV1(exact_command);
  return {
    work_id: work.work_id,
    exact_command,
    authority: work.authority_required,
    expected_completion_artifact: artifact.expected_completion_artifact,
    expected_completion_artifact_epistemic: artifact.expected_completion_artifact_epistemic,
    work_exists_epistemic: work.work_exists_epistemic,
    executable_epistemic: work.executable_epistemic,
    evidence: [...work.evidence, ...artifact.evidence],
  };
}

function buildEmptyExecutableQueueProofV1(args: {
  discovered: ExecutiveDiscoveredWorkV1[];
  blocked: ExecutiveWorkQueueBlockedItemV1[];
  unobserved_detector_count: number;
}): EmptyExecutableQueueProofV1 {
  const per_item: EmptyExecutableQueueProofItemV1[] = args.blocked.map((row) => ({
    work_id: row.work_id,
    executable: false,
    blocking_reason: row.blocking_reason,
    blocker_class: row.blocker_class,
    classification_epistemic: row.classification_epistemic,
  }));
  const why =
    args.discovered.length === 0
      ? "Work Discovery emitted 0 discovered work items on this HEAD. Unobserved detectors were not invented as executable work. Allowlisted lint/build/command-center commands are not business work. Therefore the Executive currently has nothing it may lawfully execute."
      : `Work Discovery emitted ${String(args.discovered.length)} discovered work item(s) and 0 executable item(s). Every discovered item has executable=false with a classified blocking_reason. Unobserved detectors were not invented as executable work. Allowlisted lint/build/command-center commands are not business work. Therefore the Executive currently has nothing it may lawfully execute.`;
  return {
    epistemic: "PROVEN",
    discovered_work_count: args.discovered.length,
    executable_work_count: 0,
    blocked_work_count: args.blocked.length,
    unobserved_detector_count: args.unobserved_detector_count,
    unobserved_not_invented_as_executable: true,
    allowlisted_non_work_not_invented_as_executable: true,
    per_item,
    why,
  };
}

export function buildExecutiveWorkQueueFromSnapshotV1(
  snapshot: ExecutiveWorkDiscoverySnapshotV1,
): ExecutiveWorkQueueSnapshotV1 {
  const executable_work: ExecutiveWorkQueueExecutableItemV1[] = [];
  const blocked_work: ExecutiveWorkQueueBlockedItemV1[] = [];

  for (const item of snapshot.work) {
    const command =
      typeof item.exact_command === "string" && item.exact_command.trim().length > 0
        ? item.exact_command
        : null;
    if (item.executable === true && command) {
      executable_work.push(toExecutableItemV1(item, command));
      continue;
    }
    if (item.executable === true && !command) {
      blocked_work.push(
        toBlockedItemV1({
          ...item,
          executable: false,
          blocking_reason: item.blocking_reason ?? "no_proven_exact_command",
          evidence: [
            ...item.evidence,
            "fail_closed: executable=true but exact_command is null; not placed on EXECUTABLE WORK",
          ],
        }),
      );
      continue;
    }
    blocked_work.push(toBlockedItemV1(item));
  }

  const empty_executable_queue_proof =
    executable_work.length === 0
      ? buildEmptyExecutableQueueProofV1({
          discovered: snapshot.work,
          blocked: blocked_work,
          unobserved_detector_count: snapshot.unobserved_detectors.length,
        })
      : null;

  return {
    contract: EXECUTIVE_WORK_QUEUE_CONTRACT_V1,
    report_name: EXECUTIVE_WORK_QUEUE_REPORT_NAME_V1,
    generated_at: snapshot.generated_at,
    observation_kind: "now_or_not_yet_work_queue",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    nba_authority: false,
    dispatch_authority: false,
    dispatch_invoked: false,
    steering_authority: false,
    ranking_performed: false,
    command_center_rebuilt: false,
    outcome_join_consulted: false,
    catalog_epistemic: "PROVEN",
    completeness_epistemic: "PROVEN",
    completeness_status: "INCOMPLETE",
    executable_work,
    blocked_work,
    empty_executable_queue_proof,
    scale_counts: {
      discovered_work: snapshot.work.length,
      executable_work: executable_work.length,
      blocked_work: blocked_work.length,
      unobserved_detectors: snapshot.unobserved_detectors.length,
    },
  };
}

export async function discoverExecutiveWorkQueueV1(args: {
  rootDir?: string;
  nowIso?: string;
} = {}): Promise<ExecutiveWorkQueueSnapshotV1> {
  const discovery = await discoverExecutiveWorkV1(args);
  return buildExecutiveWorkQueueFromSnapshotV1(discovery);
}
