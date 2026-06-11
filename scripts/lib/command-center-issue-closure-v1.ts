/**
 * CLOSED_PROVEN eligibility — read-only closure gate after RE_AUDITED PASS + owner approval.
 */

import type { IssueLifecycleEvidenceGateV1 } from "./command-center-issue-lifecycle-audit-v1";
import type { CommandCenterIssueRecordV1 } from "./command-center-issue-registry-v1";

export const COMMAND_CENTER_ISSUE_CLOSURE_CONTRACT_V1 = "command_center_issue_closure_v1" as const;

export type IssueClosedProvenEligibilityV1 = {
  contract: typeof COMMAND_CENTER_ISSUE_CLOSURE_CONTRACT_V1;
  issue_id: string;
  eligible: boolean;
  declared_closed_proven: boolean;
  evidence_proven_closed: boolean;
  missing_requirements: string[];
  closure_reason: string | null;
  closure_evidence: string[];
  closed_at: string | null;
  closure_approved: boolean;
};

export function evaluateIssueClosedProvenEligibilityV1(args: {
  issue: CommandCenterIssueRecordV1;
  lifecycle_evidence: IssueLifecycleEvidenceGateV1;
}): IssueClosedProvenEligibilityV1 {
  const missing_requirements: string[] = [];
  const { issue, lifecycle_evidence } = args;

  if (!lifecycle_evidence.repair_commit_proven) {
    missing_requirements.push("repair_commit not proven on HEAD ancestry");
  }
  if (!lifecycle_evidence.deployed_proven) {
    missing_requirements.push("deploy not proven (repair_commit not on origin/main)");
  }
  if (!lifecycle_evidence.re_audit_pass_proven) {
    missing_requirements.push("re_audit_outcome PASS not recorded (PASS alone does not auto-close)");
  }
  if (!issue.closure_approved) {
    missing_requirements.push("owner closure_approved not true");
  }
  if (!issue.closed_at?.trim()) {
    missing_requirements.push("closed_at missing");
  }
  if (!issue.closure_reason?.trim()) {
    missing_requirements.push("closure_reason missing");
  }
  if (issue.closure_evidence.length === 0) {
    missing_requirements.push("closure_evidence empty");
  }

  const eligible = missing_requirements.length === 0;
  const declared_closed_proven = issue.status === "CLOSED_PROVEN";
  const evidence_proven_closed = eligible && lifecycle_evidence.closure_proven;

  return {
    contract: COMMAND_CENTER_ISSUE_CLOSURE_CONTRACT_V1,
    issue_id: issue.issue_id,
    eligible,
    declared_closed_proven,
    evidence_proven_closed,
    missing_requirements,
    closure_reason: issue.closure_reason,
    closure_evidence: issue.closure_evidence,
    closed_at: issue.closed_at,
    closure_approved: issue.closure_approved,
  };
}
