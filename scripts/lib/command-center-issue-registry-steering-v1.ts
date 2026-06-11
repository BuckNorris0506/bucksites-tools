/**
 * Command Center next_best_action steering from open TIER_0 issue registry rows (read-only).
 */

import {
  selectHighestPrioritySteeringEligibleTier0IssueV1,
  type CommandCenterIssueRecordV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";
import type { CommandCenterIssueRegistryLaneV1 } from "./command-center-issue-registry-command-center-v1";
import type { IssueLifecycleAuditRowV1 } from "./command-center-issue-lifecycle-audit-v1";

export type CommandCenterIssueRegistrySteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  mutation_block_reasons: string[];
  issue: CommandCenterIssueRecordV1;
};

export function buildEffectiveIssueStatusMapV1(
  auditRows: IssueLifecycleAuditRowV1[],
): Map<string, CommandCenterIssueStatusV1> {
  return new Map(
    auditRows.map((row) => [row.issue_id, row.evidence_proven_max_status]),
  );
}

export function buildIssueRegistryNextBestActionV1(
  issue: CommandCenterIssueRecordV1,
  effectiveStatus: CommandCenterIssueStatusV1,
): string {
  return `ISSUE REGISTRY ${issue.severity}: ${issue.issue_id} — ${issue.title} (status: ${effectiveStatus}). Advance lifecycle toward live RE_AUDIT; verify exact model/part before any catalog mutation.`;
}

export function resolveCommandCenterIssueRegistrySteeringOverrideV1(
  lane: CommandCenterIssueRegistryLaneV1,
): CommandCenterIssueRegistrySteeringOverrideV1 | null {
  const effectiveStatusByIssueId = buildEffectiveIssueStatusMapV1(
    lane.lifecycle_audit_v1.rows,
  );
  const issue = selectHighestPrioritySteeringEligibleTier0IssueV1(
    lane.issues,
    effectiveStatusByIssueId,
  );
  if (!issue) return null;

  const effectiveStatus =
    effectiveStatusByIssueId.get(issue.issue_id) ?? issue.status;

  return {
    issue,
    next_best_action: buildIssueRegistryNextBestActionV1(issue, effectiveStatus),
    why_this_action: `Steering-eligible ${issue.severity} issue ${issue.issue_id} is highest-priority (status ${effectiveStatus} is before DEPLOYED, or RE_AUDITED regression).`,
    next_move_command: `Review ${lane.issues_dir_rel}/${issue.issue_id}.json and advance status only with proven re-audit/closure evidence.`,
    mutation_block_reasons: [
      `ISSUE_REGISTRY_OPEN_TIER_0:${issue.issue_id}`,
      "TRUST_GATE_STOP_THE_LINE_UNTIL_RE_AUDITED",
    ],
  };
}
