/**
 * Command Center v1 projection for ISSUE_REGISTRY (read-only report lane).
 */

import { buildCommandCenterIssueLifecycleAuditV1 } from "./command-center-issue-lifecycle-audit-v1";
import type { CommandCenterIssueLifecycleAuditV1 } from "./command-center-issue-lifecycle-audit-v1";
import { buildEffectiveIssueStatusMapV1 } from "./command-center-issue-registry-steering-v1";
import {
  COMMAND_CENTER_ISSUE_REGISTRY_CC_JQ_PATH_V1,
  COMMAND_CENTER_ISSUE_REGISTRY_CONTRACT_V1,
  COMMAND_CENTER_ISSUE_STATUSES_V1,
  compareCommandCenterIssueStatusOrderV1,
  countIssuesBySeverityV1,
  countIssuesByStatusV1,
  isCommandCenterIssueClosedV1,
  isCommandCenterIssueOpenV1,
  isIssueRegistrySteeringEligibleV1,
  loadCommandCenterIssuesV1,
  selectHighestPriorityOpenIssueV1,
  selectHighestPrioritySteeringEligibleTier0IssueV1,
  sortCommandCenterIssuesByPriorityV1,
  type CommandCenterIssueRecordV1,
  type CommandCenterIssueSeverityV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";

export const COMMAND_CENTER_ISSUE_REGISTRY_LANE_CONTRACT_V1 =
  "command_center_issue_registry_v1" as const;

export type CommandCenterIssueRegistryPreviewItemV1 = CommandCenterIssueRecordV1;

export type CommandCenterIssueRegistryLaneV1 = {
  contract: typeof COMMAND_CENTER_ISSUE_REGISTRY_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof COMMAND_CENTER_ISSUE_REGISTRY_CC_JQ_PATH_V1;
  generated_at: string;
  issues_dir_rel: string;
  issues_dir_exists: boolean;
  files_scanned: number;
  total_issues: number;
  total_open: number;
  total_closed: number;
  by_status: Record<CommandCenterIssueStatusV1, number>;
  by_severity: Record<CommandCenterIssueSeverityV1, number>;
  lifecycle_audit_v1: CommandCenterIssueLifecycleAuditV1;
  lifecycle_distribution: CommandCenterIssueLifecycleAuditV1["lifecycle_distribution"];
  oldest_open_issue: CommandCenterIssueRecordV1 | null;
  highest_priority_issue: CommandCenterIssueRecordV1 | null;
  highest_priority_steering_eligible_issue: CommandCenterIssueRecordV1 | null;
  steering_override_active: boolean;
  closed_proven_issue_ids: string[];
  closure_eligible_issue_ids: string[];
  issues: CommandCenterIssueRecordV1[];
  issues_preview: CommandCenterIssueRegistryPreviewItemV1[];
  parse_errors: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const ISSUES_PREVIEW_CAP_V1 = 10;

export function buildCommandCenterIssueRegistryCommandCenterLaneV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
  runValidationTests?: boolean;
}): CommandCenterIssueRegistryLaneV1 {
  const now = args.now ?? (() => new Date());
  const loaded = loadCommandCenterIssuesV1(args);
  const lifecycle_audit_v1 = buildCommandCenterIssueLifecycleAuditV1({
    issues: loaded.issues,
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    runValidationTests: args.runValidationTests ?? false,
  });
  const effectiveStatusByIssueId = buildEffectiveIssueStatusMapV1(lifecycle_audit_v1.rows);
  const openIssues = loaded.issues.filter((issue) => isCommandCenterIssueOpenV1(issue.status));
  const closedIssues = loaded.issues.filter((issue) => isCommandCenterIssueClosedV1(issue.status));
  const highest_priority_issue = selectHighestPriorityOpenIssueV1(loaded.issues);
  const highest_priority_steering_eligible_issue =
    selectHighestPrioritySteeringEligibleTier0IssueV1(
      loaded.issues,
      effectiveStatusByIssueId,
    );
  const steering_override_active = highest_priority_steering_eligible_issue != null;

  const closed_proven_issue_ids = loaded.issues
    .filter((issue) => isCommandCenterIssueClosedV1(issue.status))
    .map((issue) => issue.issue_id);
  const closure_eligible_issue_ids = lifecycle_audit_v1.rows
    .filter((row) => row.closed_proven_eligibility_v1.eligible)
    .map((row) => row.issue_id);

  const oldest_open_issue =
    openIssues.length === 0
      ? null
      : [...openIssues].sort((a, b) => Date.parse(a.detected_at) - Date.parse(b.detected_at))[0] ??
        null;

  const proven_facts = [
    `PROVEN: Issue registry lane is read-only at ${COMMAND_CENTER_ISSUE_REGISTRY_CC_JQ_PATH_V1}.`,
    `PROVEN: Scanned ${String(loaded.files_scanned)} JSON file(s) under ${loaded.issues_dir_rel}.`,
    `PROVEN: total_open=${String(openIssues.length)} total_closed=${String(closedIssues.length)}.`,
    ...lifecycle_audit_v1.proven_facts,
  ];
  if (highest_priority_issue) {
    proven_facts.push(
      `PROVEN: highest_priority_open_issue=${highest_priority_issue.issue_id} severity=${highest_priority_issue.severity} status=${highest_priority_issue.status}.`,
    );
  }
  if (closed_proven_issue_ids.length > 0) {
    proven_facts.push(
      `PROVEN: closed_proven_issue_ids=${closed_proven_issue_ids.join(",")} (excluded from open counts and steering).`,
    );
  }

  const inferred_facts = [...lifecycle_audit_v1.inferred_facts];
  if (steering_override_active) {
    inferred_facts.push(
      "INFERRED: Steering-eligible TIER_0 issue(s) before DEPLOYED may override Command Center next_best_action.",
    );
  } else if (
    openIssues.some(
      (issue) =>
        issue.severity === "TIER_0" &&
        !isIssueRegistrySteeringEligibleV1({
          status: effectiveStatusByIssueId.get(issue.issue_id) ?? issue.status,
          re_audit_outcome: issue.re_audit_outcome,
        }),
    )
  ) {
    inferred_facts.push(
      "INFERRED: DEPLOYED TIER_0 issues do not steer next_best_action until RE_AUDITED regression is recorded.",
    );
  }

  const unknown_facts = [...loaded.parse_errors, ...lifecycle_audit_v1.unknown_facts];
  if (!loaded.issues_dir_exists) {
    unknown_facts.push(`UNKNOWN: issues directory missing at ${loaded.issues_dir_rel}.`);
  }

  const by_status = countIssuesByStatusV1(loaded.issues);
  const by_severity = countIssuesBySeverityV1(loaded.issues);

  // Expose lifecycle ordering explicitly for consumers/tests.
  const status_order = [...COMMAND_CENTER_ISSUE_STATUSES_V1].sort(compareCommandCenterIssueStatusOrderV1);
  proven_facts.push(`PROVEN: status_order=${status_order.join(">")}.`);

  return {
    contract: COMMAND_CENTER_ISSUE_REGISTRY_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: COMMAND_CENTER_ISSUE_REGISTRY_CC_JQ_PATH_V1,
    generated_at: now().toISOString(),
    issues_dir_rel: loaded.issues_dir_rel,
    issues_dir_exists: loaded.issues_dir_exists,
    files_scanned: loaded.files_scanned,
    total_issues: loaded.issues.length,
    total_open: openIssues.length,
    total_closed: closedIssues.length,
    by_status,
    by_severity,
    lifecycle_audit_v1,
    lifecycle_distribution: lifecycle_audit_v1.lifecycle_distribution,
    oldest_open_issue,
    highest_priority_issue,
    highest_priority_steering_eligible_issue,
    steering_override_active,
    closed_proven_issue_ids,
    closure_eligible_issue_ids,
    issues: loaded.issues,
    issues_preview: loaded.issues.slice(0, ISSUES_PREVIEW_CAP_V1),
    parse_errors: loaded.parse_errors,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
