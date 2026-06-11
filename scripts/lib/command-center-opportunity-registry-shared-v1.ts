/**
 * Shared read-only opportunity registry foundation — planning-only; no mutation or automation.
 * Reuses Command Center issue lifecycle statuses for opportunity records.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  COMMAND_CENTER_ISSUE_STATUSES_V1,
  compareCommandCenterIssueStatusOrderV1,
  countIssuesBySeverityV1,
  countIssuesByStatusV1,
  isCommandCenterIssueClosedV1,
  isCommandCenterIssueOpenV1,
  sortCommandCenterIssuesByPriorityV1,
  type CommandCenterIssueRecordV1,
  type CommandCenterIssueSeverityV1,
  type CommandCenterIssueReAuditOutcomeV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";

export type OpportunityRegistryKindV1 = "seo" | "revenue" | "distribution";

export type CommandCenterOpportunityRecordBaseV1 = {
  opportunity_id: string;
  title: string;
  opportunity_type: string;
  registry_kind: OpportunityRegistryKindV1;
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
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  planning_only: true;
  automation_authorized: false;
};

export type OpportunityRegistryLaneV1<T extends CommandCenterOpportunityRecordBaseV1> = {
  contract: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  planning_only: true;
  automation_authorized: false;
  recommended_jq_path: string;
  generated_at: string;
  registry_kind: OpportunityRegistryKindV1;
  registry_dir_rel: string;
  registry_dir_exists: boolean;
  files_scanned: number;
  total_opportunities: number;
  total_open: number;
  total_closed: number;
  by_status: Record<CommandCenterIssueStatusV1, number>;
  by_severity: Record<CommandCenterIssueSeverityV1, number>;
  lifecycle_status_order: CommandCenterIssueStatusV1[];
  highest_priority_opportunity: T | null;
  oldest_open_opportunity: T | null;
  steering_override_active: false;
  opportunities: T[];
  opportunities_preview: T[];
  parse_errors: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type LoadOpportunityRegistryResultV1<T extends CommandCenterOpportunityRecordBaseV1> = {
  opportunities: T[];
  registry_dir_rel: string;
  registry_dir_exists: boolean;
  files_scanned: number;
  parse_errors: string[];
};

const OPPORTUNITIES_PREVIEW_CAP_V1 = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSeverity(value: unknown): value is CommandCenterIssueSeverityV1 {
  return (
    typeof value === "string" &&
    (["TIER_0", "TIER_1", "TIER_2", "TIER_3"] as readonly string[]).includes(value)
  );
}

function isStatus(value: unknown): value is CommandCenterIssueStatusV1 {
  return (
    typeof value === "string" &&
    (COMMAND_CENTER_ISSUE_STATUSES_V1 as readonly string[]).includes(value)
  );
}

function isReAuditOutcome(value: unknown): value is CommandCenterIssueReAuditOutcomeV1 {
  return typeof value === "string" && (["PASS", "STILL_OPEN", "REGRESSED"] as readonly string[]).includes(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function opportunityToIssuePriorityShape(
  opportunity: CommandCenterOpportunityRecordBaseV1,
): CommandCenterIssueRecordV1 {
  return {
    issue_id: opportunity.opportunity_id,
    title: opportunity.title,
    issue_type: opportunity.opportunity_type,
    severity: opportunity.severity,
    source_system: opportunity.source_system,
    detected_at: opportunity.detected_at,
    status: opportunity.status,
    assigned_to: opportunity.assigned_to,
    affected_routes: opportunity.affected_routes,
    evidence_files: opportunity.evidence_files,
    repair_commit: opportunity.repair_commit,
    deploy_commit: opportunity.deploy_commit,
    closed_at: opportunity.closed_at,
    re_audit_outcome: opportunity.re_audit_outcome,
    closure_reason: null,
    closure_evidence: [],
    closure_approved: false,
    proven_facts: opportunity.proven_facts,
    inferred_facts: opportunity.inferred_facts,
    unknown_facts: opportunity.unknown_facts,
  };
}

export function selectHighestPriorityOpenOpportunityV1<T extends CommandCenterOpportunityRecordBaseV1>(
  opportunities: T[],
): T | null {
  const open = opportunities.filter((row) => isCommandCenterIssueOpenV1(row.status));
  const sorted = sortCommandCenterIssuesByPriorityV1(open.map(opportunityToIssuePriorityShape));
  const topId = sorted[0]?.issue_id;
  return opportunities.find((row) => row.opportunity_id === topId) ?? null;
}

export function parseOpportunityRecordBaseV1(args: {
  raw: unknown;
  sourceFile: string;
  registry_kind: OpportunityRegistryKindV1;
  opportunity_id_prefix: string;
  parseDomainFields: (raw: Record<string, unknown>) => { fields: Record<string, unknown>; errors: string[] };
}): { base: CommandCenterOpportunityRecordBaseV1 | null; parse_errors: string[] } {
  const parse_errors: string[] = [];
  if (!isRecord(args.raw)) {
    return { base: null, parse_errors: [`${args.sourceFile}: root must be an object`] };
  }

  const opportunity_id = typeof args.raw.opportunity_id === "string" ? args.raw.opportunity_id.trim() : "";
  if (!opportunity_id) parse_errors.push(`${args.sourceFile}: missing opportunity_id`);
  if (opportunity_id && !opportunity_id.startsWith(args.opportunity_id_prefix)) {
    parse_errors.push(
      `${args.sourceFile}: opportunity_id must start with ${args.opportunity_id_prefix}`,
    );
  }

  const severity = args.raw.severity;
  if (!isSeverity(severity)) parse_errors.push(`${args.sourceFile}: invalid severity`);

  const status = args.raw.status;
  if (!isStatus(status)) parse_errors.push(`${args.sourceFile}: invalid status`);

  const registry_kind = args.raw.registry_kind;
  if (registry_kind !== args.registry_kind) {
    parse_errors.push(`${args.sourceFile}: registry_kind must be ${args.registry_kind}`);
  }

  if (parse_errors.length > 0 || !isSeverity(severity) || !isStatus(status)) {
    return { base: null, parse_errors };
  }

  return {
    base: {
      opportunity_id,
      title: typeof args.raw.title === "string" ? args.raw.title : "",
      opportunity_type: typeof args.raw.opportunity_type === "string" ? args.raw.opportunity_type : "",
      registry_kind: args.registry_kind,
      severity,
      source_system: typeof args.raw.source_system === "string" ? args.raw.source_system : "",
      detected_at: typeof args.raw.detected_at === "string" ? args.raw.detected_at : "",
      status,
      assigned_to: typeof args.raw.assigned_to === "string" ? args.raw.assigned_to : "",
      affected_routes: stringArray(args.raw.affected_routes),
      evidence_files: stringArray(args.raw.evidence_files),
      repair_commit: nullableString(args.raw.repair_commit),
      deploy_commit: nullableString(args.raw.deploy_commit),
      closed_at: nullableString(args.raw.closed_at),
      re_audit_outcome: isReAuditOutcome(args.raw.re_audit_outcome) ? args.raw.re_audit_outcome : null,
      proven_facts: stringArray(args.raw.proven_facts),
      inferred_facts: stringArray(args.raw.inferred_facts),
      unknown_facts: stringArray(args.raw.unknown_facts),
      planning_only: true,
      automation_authorized: false,
    },
    parse_errors,
  };
}

export function loadOpportunityRegistryV1<T extends CommandCenterOpportunityRecordBaseV1>(args: {
  rootDir: string;
  registry_dir_rel: string;
  parseRecord: (raw: unknown, sourceFile: string) => { opportunity: T | null; parse_errors: string[] };
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  listDir?: (absolutePath: string) => string[];
}): LoadOpportunityRegistryResultV1<T> {
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const listDir =
    args.listDir ??
    ((p: string) =>
      existsSync(p)
        ? readdirSync(p).filter((name) => name.endsWith(".json"))
        : []);

  const registryDirAbs = path.join(args.rootDir, ...args.registry_dir_rel.split("/"));
  const registry_dir_exists = fileExists(registryDirAbs);
  const fileNames = registry_dir_exists ? listDir(registryDirAbs) : [];
  const opportunities: T[] = [];
  const parse_errors: string[] = [];

  for (const fileName of fileNames.sort()) {
    const abs = path.join(registryDirAbs, fileName);
    try {
      const parsed = args.parseRecord(JSON.parse(readTextFile(abs)) as unknown, `${args.registry_dir_rel}/${fileName}`);
      if (parsed.opportunity) opportunities.push(parsed.opportunity);
      parse_errors.push(...parsed.parse_errors);
    } catch (error) {
      parse_errors.push(
        `${args.registry_dir_rel}/${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const sorted = sortCommandCenterIssuesByPriorityV1(
    opportunities.map(opportunityToIssuePriorityShape),
  ).map((issue) => opportunities.find((row) => row.opportunity_id === issue.issue_id)!);

  return {
    opportunities: sorted,
    registry_dir_rel: args.registry_dir_rel,
    registry_dir_exists,
    files_scanned: fileNames.length,
    parse_errors,
  };
}

export function buildOpportunityRegistryLaneV1<T extends CommandCenterOpportunityRecordBaseV1>(args: {
  contract: string;
  recommended_jq_path: string;
  registry_kind: OpportunityRegistryKindV1;
  loaded: LoadOpportunityRegistryResultV1<T>;
  now?: () => Date;
}): OpportunityRegistryLaneV1<T> {
  const now = args.now ?? (() => new Date());
  const openOpportunities = args.loaded.opportunities.filter((row) =>
    isCommandCenterIssueOpenV1(row.status),
  );
  const closedOpportunities = args.loaded.opportunities.filter((row) =>
    isCommandCenterIssueClosedV1(row.status),
  );
  const highest_priority_opportunity = selectHighestPriorityOpenOpportunityV1(args.loaded.opportunities);
  const oldest_open_opportunity =
    openOpportunities.length === 0
      ? null
      : [...openOpportunities].sort(
          (a, b) => Date.parse(a.detected_at) - Date.parse(b.detected_at),
        )[0] ?? null;

  const lifecycle_status_order = [...COMMAND_CENTER_ISSUE_STATUSES_V1].sort(
    compareCommandCenterIssueStatusOrderV1,
  );

  const proven_facts = [
    `PROVEN: Opportunity registry lane is read-only planning-only at ${args.recommended_jq_path}.`,
    `PROVEN: registry_kind=${args.registry_kind}; automation_authorized=false; mutation_authorized=false.`,
    `PROVEN: Scanned ${String(args.loaded.files_scanned)} JSON file(s) under ${args.loaded.registry_dir_rel}.`,
    `PROVEN: total_open=${String(openOpportunities.length)} total_closed=${String(closedOpportunities.length)}.`,
    `PROVEN: lifecycle_status_order=${lifecycle_status_order.join(">")}.`,
  ];
  if (highest_priority_opportunity) {
    proven_facts.push(
      `PROVEN: highest_priority_opportunity=${highest_priority_opportunity.opportunity_id} severity=${highest_priority_opportunity.severity} status=${highest_priority_opportunity.status}.`,
    );
  }

  const inferred_facts = [
    "INFERRED: Planning-only opportunity registries do not steer next_best_action or trigger automation.",
  ];

  const unknown_facts = [...args.loaded.parse_errors];
  if (!args.loaded.registry_dir_exists) {
    unknown_facts.push(`UNKNOWN: registry directory missing at ${args.loaded.registry_dir_rel}.`);
  }

  return {
    contract: args.contract,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    planning_only: true,
    automation_authorized: false,
    recommended_jq_path: args.recommended_jq_path,
    generated_at: now().toISOString(),
    registry_kind: args.registry_kind,
    registry_dir_rel: args.loaded.registry_dir_rel,
    registry_dir_exists: args.loaded.registry_dir_exists,
    files_scanned: args.loaded.files_scanned,
    total_opportunities: args.loaded.opportunities.length,
    total_open: openOpportunities.length,
    total_closed: closedOpportunities.length,
    by_status: countIssuesByStatusV1(args.loaded.opportunities.map(opportunityToIssuePriorityShape)),
    by_severity: countIssuesBySeverityV1(args.loaded.opportunities.map(opportunityToIssuePriorityShape)),
    lifecycle_status_order,
    highest_priority_opportunity,
    oldest_open_opportunity,
    steering_override_active: false,
    opportunities: args.loaded.opportunities,
    opportunities_preview: args.loaded.opportunities.slice(0, OPPORTUNITIES_PREVIEW_CAP_V1),
    parse_errors: args.loaded.parse_errors,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
