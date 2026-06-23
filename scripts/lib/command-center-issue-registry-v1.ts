/**
 * Command Center Issue Registry v1 — read-only truth lane for HyperAgent / Cursor / CC lifecycle.
 * Loads JSON issue records from data/command-center/issues/*.json; no mutation writers.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const COMMAND_CENTER_ISSUE_REGISTRY_CONTRACT_V1 = "command_center_issue_registry_v1" as const;

export const COMMAND_CENTER_ISSUES_DIR_REL_V1 = "data/command-center/issues" as const;

export const COMMAND_CENTER_ISSUE_REGISTRY_CC_JQ_PATH_V1 =
  ".command_center_v2.command_center_issue_registry_v1" as const;

export const COMMAND_CENTER_ISSUE_STATUSES_V1 = [
  "DISCOVERED",
  "PACKET_READY",
  "APPROVED",
  "REPAIR_IN_PROGRESS",
  "VALIDATED",
  "DEPLOYED",
  "RE_AUDITED",
  "CLOSED_PROVEN",
] as const;

export type CommandCenterIssueStatusV1 = (typeof COMMAND_CENTER_ISSUE_STATUSES_V1)[number];

export const COMMAND_CENTER_ISSUE_SEVERITIES_V1 = [
  "TIER_0",
  "TIER_1",
  "TIER_2",
  "TIER_3",
] as const;

export type CommandCenterIssueSeverityV1 = (typeof COMMAND_CENTER_ISSUE_SEVERITIES_V1)[number];

export const COMMAND_CENTER_ISSUE_RE_AUDIT_OUTCOMES_V1 = [
  "PASS",
  "STILL_OPEN",
  "REGRESSED",
] as const;

export type CommandCenterIssueReAuditOutcomeV1 =
  (typeof COMMAND_CENTER_ISSUE_RE_AUDIT_OUTCOMES_V1)[number];

export const COMMAND_CENTER_ISSUE_PACKET_CONTRACT_V1 = "command_center_issue_packet_v1" as const;

export type CommandCenterIssuePacketV1 = {
  contract: typeof COMMAND_CENTER_ISSUE_PACKET_CONTRACT_V1;
  read_only: true;
  filter_slug: string;
  wedge: "air_purifier";
  measurable_blocker: string;
  stalled_lane_contract: string;
  closure_criteria: string[];
  affected_artifacts: string[];
  affected_queues: string[];
  owner_review_implications: string[];
  future_batch_scope_rules: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type CommandCenterIssueRecordV1 = {
  issue_id: string;
  title: string;
  issue_type: string;
  severity: CommandCenterIssueSeverityV1;
  source_system: string;
  detected_at: string;
  status: CommandCenterIssueStatusV1;
  assigned_to: string;
  affected_routes: string[];
  evidence_files: string[];
  repair_commit: string | null;
  deploy_commit: string | null;
  closed_at: string | null;
  re_audit_outcome: CommandCenterIssueReAuditOutcomeV1 | null;
  closure_reason: string | null;
  closure_evidence: string[];
  closure_approved: boolean;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  issue_packet_v1?: CommandCenterIssuePacketV1 | null;
};

const SEVERITY_RANK: Record<CommandCenterIssueSeverityV1, number> = {
  TIER_0: 0,
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

export const COMMAND_CENTER_ISSUE_STATUS_RANK_V1: Record<CommandCenterIssueStatusV1, number> = {
  DISCOVERED: 0,
  PACKET_READY: 1,
  APPROVED: 2,
  REPAIR_IN_PROGRESS: 3,
  VALIDATED: 4,
  DEPLOYED: 5,
  RE_AUDITED: 6,
  CLOSED_PROVEN: 7,
};

export function isCommandCenterIssueClosedV1(status: CommandCenterIssueStatusV1): boolean {
  return status === "CLOSED_PROVEN";
}

export function isCommandCenterIssueOpenV1(status: CommandCenterIssueStatusV1): boolean {
  return !isCommandCenterIssueClosedV1(status);
}

function isReAuditOutcome(value: unknown): value is CommandCenterIssueReAuditOutcomeV1 {
  return (
    typeof value === "string" &&
    (COMMAND_CENTER_ISSUE_RE_AUDIT_OUTCOMES_V1 as readonly string[]).includes(value)
  );
}

/** TIER_0 registry steering applies only before DEPLOYED, or RE_AUDITED with regression. */
export function isIssueRegistrySteeringEligibleV1(args: {
  status: CommandCenterIssueStatusV1;
  re_audit_outcome?: CommandCenterIssueReAuditOutcomeV1 | null;
}): boolean {
  if (COMMAND_CENTER_ISSUE_STATUS_RANK_V1[args.status] < COMMAND_CENTER_ISSUE_STATUS_RANK_V1.DEPLOYED) {
    return true;
  }
  if (
    args.status === "RE_AUDITED" &&
    (args.re_audit_outcome === "STILL_OPEN" || args.re_audit_outcome === "REGRESSED")
  ) {
    return true;
  }
  return false;
}

export function selectHighestPrioritySteeringEligibleTier0IssueV1(
  issues: CommandCenterIssueRecordV1[],
  effectiveStatusByIssueId: ReadonlyMap<string, CommandCenterIssueStatusV1>,
): CommandCenterIssueRecordV1 | null {
  const eligible = issues.filter((issue) => {
    if (issue.severity !== "TIER_0") return false;
    const status = effectiveStatusByIssueId.get(issue.issue_id) ?? issue.status;
    return isIssueRegistrySteeringEligibleV1({
      status,
      re_audit_outcome: issue.re_audit_outcome,
    });
  });
  return sortCommandCenterIssuesByPriorityV1(eligible)[0] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSeverity(value: unknown): value is CommandCenterIssueSeverityV1 {
  return (
    typeof value === "string" &&
    (COMMAND_CENTER_ISSUE_SEVERITIES_V1 as readonly string[]).includes(value)
  );
}

function isStatus(value: unknown): value is CommandCenterIssueStatusV1 {
  return (
    typeof value === "string" &&
    (COMMAND_CENTER_ISSUE_STATUSES_V1 as readonly string[]).includes(value)
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseIssuePacketV1(
  raw: unknown,
  sourceFile: string,
): { packet: CommandCenterIssuePacketV1 | null; parse_errors: string[] } {
  const parse_errors: string[] = [];
  if (raw == null) return { packet: null, parse_errors };
  if (!isRecord(raw)) {
    return { packet: null, parse_errors: [`${sourceFile}: issue_packet_v1 must be an object`] };
  }
  if (raw.contract !== COMMAND_CENTER_ISSUE_PACKET_CONTRACT_V1) {
    parse_errors.push(`${sourceFile}: issue_packet_v1.contract must be ${COMMAND_CENTER_ISSUE_PACKET_CONTRACT_V1}`);
    return { packet: null, parse_errors };
  }
  const filter_slug = typeof raw.filter_slug === "string" ? raw.filter_slug.trim() : "";
  if (!filter_slug) parse_errors.push(`${sourceFile}: issue_packet_v1.filter_slug missing`);
  const measurable_blocker =
    typeof raw.measurable_blocker === "string" ? raw.measurable_blocker.trim() : "";
  const stalled_lane_contract =
    typeof raw.stalled_lane_contract === "string" ? raw.stalled_lane_contract.trim() : "";
  if (!measurable_blocker) {
    parse_errors.push(`${sourceFile}: issue_packet_v1.measurable_blocker missing`);
  }
  if (!stalled_lane_contract) {
    parse_errors.push(`${sourceFile}: issue_packet_v1.stalled_lane_contract missing`);
  }
  if (parse_errors.length > 0) return { packet: null, parse_errors };

  return {
    packet: {
      contract: COMMAND_CENTER_ISSUE_PACKET_CONTRACT_V1,
      read_only: true,
      filter_slug,
      wedge: "air_purifier",
      measurable_blocker,
      stalled_lane_contract,
      closure_criteria: stringArray(raw.closure_criteria),
      affected_artifacts: stringArray(raw.affected_artifacts),
      affected_queues: stringArray(raw.affected_queues),
      owner_review_implications: stringArray(raw.owner_review_implications),
      future_batch_scope_rules: stringArray(raw.future_batch_scope_rules),
      proven_facts: stringArray(raw.proven_facts),
      inferred_facts: stringArray(raw.inferred_facts),
      unknown_facts: stringArray(raw.unknown_facts),
    },
    parse_errors,
  };
}

export function parseCommandCenterIssueRecordV1(
  raw: unknown,
  sourceFile: string,
): { issue: CommandCenterIssueRecordV1 | null; parse_errors: string[] } {
  const parse_errors: string[] = [];
  if (!isRecord(raw)) {
    return { issue: null, parse_errors: [`${sourceFile}: root must be an object`] };
  }

  const issue_id = typeof raw.issue_id === "string" ? raw.issue_id.trim() : "";
  if (!issue_id) parse_errors.push(`${sourceFile}: missing issue_id`);

  const severity = raw.severity;
  if (!isSeverity(severity)) parse_errors.push(`${sourceFile}: invalid severity`);

  const status = raw.status;
  if (!isStatus(status)) parse_errors.push(`${sourceFile}: invalid status`);

  if (parse_errors.length > 0 || !isSeverity(severity) || !isStatus(status)) {
    return { issue: null, parse_errors };
  }

  const packetParsed = parseIssuePacketV1(raw.issue_packet_v1, sourceFile);
  parse_errors.push(...packetParsed.parse_errors);

  return {
    issue: {
      issue_id,
      title: typeof raw.title === "string" ? raw.title : "",
      issue_type: typeof raw.issue_type === "string" ? raw.issue_type : "",
      severity,
      source_system: typeof raw.source_system === "string" ? raw.source_system : "",
      detected_at: typeof raw.detected_at === "string" ? raw.detected_at : "",
      status,
      assigned_to: typeof raw.assigned_to === "string" ? raw.assigned_to : "",
      affected_routes: stringArray(raw.affected_routes),
      evidence_files: stringArray(raw.evidence_files),
      repair_commit: nullableString(raw.repair_commit),
      deploy_commit: nullableString(raw.deploy_commit),
      closed_at: nullableString(raw.closed_at),
      re_audit_outcome: isReAuditOutcome(raw.re_audit_outcome) ? raw.re_audit_outcome : null,
      closure_reason: nullableString(raw.closure_reason),
      closure_evidence: stringArray(raw.closure_evidence),
      closure_approved: raw.closure_approved === true,
      proven_facts: stringArray(raw.proven_facts),
      inferred_facts: stringArray(raw.inferred_facts),
      unknown_facts: stringArray(raw.unknown_facts),
      issue_packet_v1: packetParsed.packet,
    },
    parse_errors,
  };
}

export function compareCommandCenterIssuesByPriorityV1(
  a: CommandCenterIssueRecordV1,
  b: CommandCenterIssueRecordV1,
): number {
  const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (severityDiff !== 0) return severityDiff;

  const detectedDiff = Date.parse(a.detected_at) - Date.parse(b.detected_at);
  if (Number.isFinite(detectedDiff) && detectedDiff !== 0) return detectedDiff;

  return a.issue_id.localeCompare(b.issue_id);
}

export function sortCommandCenterIssuesByPriorityV1(
  issues: CommandCenterIssueRecordV1[],
): CommandCenterIssueRecordV1[] {
  return [...issues].sort(compareCommandCenterIssuesByPriorityV1);
}

export function selectHighestPriorityOpenIssueV1(
  issues: CommandCenterIssueRecordV1[],
): CommandCenterIssueRecordV1 | null {
  const open = issues.filter((issue) => isCommandCenterIssueOpenV1(issue.status));
  const sorted = sortCommandCenterIssuesByPriorityV1(open);
  return sorted[0] ?? null;
}

export function selectHighestPriorityOpenTier0IssueV1(
  issues: CommandCenterIssueRecordV1[],
): CommandCenterIssueRecordV1 | null {
  const tier0Open = issues.filter(
    (issue) => issue.severity === "TIER_0" && isCommandCenterIssueOpenV1(issue.status),
  );
  const sorted = sortCommandCenterIssuesByPriorityV1(tier0Open);
  return sorted[0] ?? null;
}

export function countIssuesByStatusV1(
  issues: CommandCenterIssueRecordV1[],
): Record<CommandCenterIssueStatusV1, number> {
  const counts = Object.fromEntries(
    COMMAND_CENTER_ISSUE_STATUSES_V1.map((status) => [status, 0]),
  ) as Record<CommandCenterIssueStatusV1, number>;
  for (const issue of issues) {
    counts[issue.status] += 1;
  }
  return counts;
}

export function countIssuesBySeverityV1(
  issues: CommandCenterIssueRecordV1[],
): Record<CommandCenterIssueSeverityV1, number> {
  const counts = Object.fromEntries(
    COMMAND_CENTER_ISSUE_SEVERITIES_V1.map((severity) => [severity, 0]),
  ) as Record<CommandCenterIssueSeverityV1, number>;
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return counts;
}

export type LoadCommandCenterIssuesResultV1 = {
  issues: CommandCenterIssueRecordV1[];
  issues_dir_rel: typeof COMMAND_CENTER_ISSUES_DIR_REL_V1;
  issues_dir_exists: boolean;
  files_scanned: number;
  parse_errors: string[];
};

export function loadCommandCenterIssuesV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}): LoadCommandCenterIssuesResultV1 {
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const listDir =
    args.listDir ??
    ((p: string) =>
      existsSync(p)
        ? readdirSync(p).filter((name) => name.endsWith(".json"))
        : []);

  const issuesDirAbs = path.join(args.rootDir, ...COMMAND_CENTER_ISSUES_DIR_REL_V1.split("/"));
  const issues_dir_exists = fileExists(issuesDirAbs);
  const fileNames = issues_dir_exists ? listDir(issuesDirAbs) : [];
  const issues: CommandCenterIssueRecordV1[] = [];
  const parse_errors: string[] = [];

  for (const fileName of fileNames.sort()) {
    const abs = path.join(issuesDirAbs, fileName);
    try {
      const parsed = parseCommandCenterIssueRecordV1(
        JSON.parse(readTextFile(abs)) as unknown,
        `${COMMAND_CENTER_ISSUES_DIR_REL_V1}/${fileName}`,
      );
      if (parsed.issue) {
        issues.push(parsed.issue);
      }
      parse_errors.push(...parsed.parse_errors);
    } catch (error) {
      parse_errors.push(
        `${COMMAND_CENTER_ISSUES_DIR_REL_V1}/${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    issues: sortCommandCenterIssuesByPriorityV1(issues),
    issues_dir_rel: COMMAND_CENTER_ISSUES_DIR_REL_V1,
    issues_dir_exists,
    files_scanned: fileNames.length,
    parse_errors,
  };
}

export function compareCommandCenterIssueStatusOrderV1(
  a: CommandCenterIssueStatusV1,
  b: CommandCenterIssueStatusV1,
): number {
  return COMMAND_CENTER_ISSUE_STATUS_RANK_V1[a] - COMMAND_CENTER_ISSUE_STATUS_RANK_V1[b];
}
