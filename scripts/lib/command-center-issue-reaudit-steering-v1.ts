/**
 * Command Center next_best_action steering for DEPLOYED issues awaiting re-audit (read-only).
 */

import type { CommandCenterIssueReauditLaneV1 } from "./command-center-issue-reaudit-v1";

export type CommandCenterIssueReauditSteeringOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  mutation_block_reasons: string[];
};

export function buildIssueReauditNextBestActionV1(
  lane: CommandCenterIssueReauditLaneV1,
): string {
  const top = lane.top_reaudit_candidate!;
  return `ISSUE RE-AUDIT: ${top.issue_id} — ${top.title}. ${String(lane.total_deployed_awaiting_reaudit)} deployed issue(s) await live RE_AUDIT; run bounded re-audit per ${lane.recommended_jq_path}.top_reaudit_candidate.suggested_hyperagent_prompt. Do not mutate issue JSON or mark CLOSED_PROVEN without owner proof.`;
}

export function resolveCommandCenterIssueReauditSteeringOverrideV1(
  lane: CommandCenterIssueReauditLaneV1,
): CommandCenterIssueReauditSteeringOverrideV1 | null {
  if (lane.total_deployed_awaiting_reaudit === 0 || !lane.top_reaudit_candidate) {
    return null;
  }

  const top = lane.top_reaudit_candidate;
  return {
    next_best_action: buildIssueReauditNextBestActionV1(lane),
    why_this_action: `No steering-eligible repair issue exists; ${top.issue_id} is highest-priority DEPLOYED issue awaiting RE_AUDIT (${top.severity}, oldest TIER_0 first).`,
    next_move_command: `Copy suggested_hyperagent_prompt from ${lane.recommended_jq_path}.top_reaudit_candidate and execute read-only re-audit probes.`,
    mutation_block_reasons: [
      `ISSUE_REAUDIT_AWAITING:${top.issue_id}`,
      "ISSUE_JSON_MUTATION_NOT_AUTHORIZED_IN_REAUDIT_LANE",
    ],
  };
}
