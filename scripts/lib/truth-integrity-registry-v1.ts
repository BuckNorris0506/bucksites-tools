/**
 * Truth Integrity Registry v1 — loads committed JSON; read-only; no mutation writers.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1 = "truth_integrity_registry_v1" as const;

export const TRUTH_INTEGRITY_REGISTRY_REL_V1 =
  "data/truth-integrity/truth-integrity-registry-v1.json" as const;

export const TRUTH_INTEGRITY_FINDING_STATUSES_V1 = [
  "OPEN",
  "SHADOWED",
  "MEASURED",
  "FIXED",
  "REJECTED",
] as const;

export type TruthIntegrityFindingStatusV1 = (typeof TRUTH_INTEGRITY_FINDING_STATUSES_V1)[number];

export const TRUTH_INTEGRITY_SEVERITIES_V1 = [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
] as const;

export type TruthIntegritySeverityV1 = (typeof TRUTH_INTEGRITY_SEVERITIES_V1)[number];

export type TruthIntegrityFindingV1 = {
  finding_id: string;
  finding_code: string;
  title: string;
  status: TruthIntegrityFindingStatusV1;
  severity: TruthIntegritySeverityV1;
  truth_surface: string;
  summary: string;
  proven_gap: string;
  false_safety_risk: string;
  smallest_safe_fix: string;
  re_audit: {
    next_re_audit_after: string;
    last_re_audit_at: string | null;
    cadence_days: number;
    re_audit_owner: string;
  };
  validation_commands: {
    prove_gap: string[];
    prove_mitigation?: string[];
    prove_fixed?: string[];
    prove_not_regressed?: string[];
  };
};

export type TruthIntegrityRegistryDocumentV1 = {
  contract: typeof TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  findings: TruthIntegrityFindingV1[];
};

const SEVERITY_RANK: Record<TruthIntegritySeverityV1, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  informational: 4,
};

const STATUS_PRIORITY_FOR_TOP_RISK: Record<TruthIntegrityFindingStatusV1, number> = {
  MEASURED: 0,
  OPEN: 1,
  SHADOWED: 2,
  FIXED: 99,
  REJECTED: 100,
};

export function isTruthIntegrityFindingUnfixedV1(status: TruthIntegrityFindingStatusV1): boolean {
  return status !== "FIXED" && status !== "REJECTED";
}

export function isTruthIntegrityHighSeverityV1(severity: TruthIntegritySeverityV1): boolean {
  return severity === "critical" || severity === "high";
}

function isStatus(value: unknown): value is TruthIntegrityFindingStatusV1 {
  return (
    typeof value === "string" &&
    (TRUTH_INTEGRITY_FINDING_STATUSES_V1 as readonly string[]).includes(value)
  );
}

function isSeverity(value: unknown): value is TruthIntegritySeverityV1 {
  return (
    typeof value === "string" &&
    (TRUTH_INTEGRITY_SEVERITIES_V1 as readonly string[]).includes(value)
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseFinding(raw: unknown, index: number): { finding: TruthIntegrityFindingV1 | null; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { finding: null, errors: [`findings[${index}]: not an object`] };
  }
  const row = raw as Record<string, unknown>;
  const finding_id = typeof row.finding_id === "string" ? row.finding_id.trim() : "";
  if (!finding_id) errors.push(`findings[${index}]: missing finding_id`);

  const status = isStatus(row.status) ? row.status : null;
  if (!status) errors.push(`findings[${index}]: invalid status`);

  const severity = isSeverity(row.severity) ? row.severity : null;
  if (!severity) errors.push(`findings[${index}]: invalid severity`);

  const reAuditRaw = row.re_audit;
  const reAudit =
    reAuditRaw && typeof reAuditRaw === "object"
      ? (reAuditRaw as Record<string, unknown>)
      : null;
  const next_re_audit_after =
    typeof reAudit?.next_re_audit_after === "string" ? reAudit.next_re_audit_after : "";
  if (!next_re_audit_after) errors.push(`findings[${index}]: missing re_audit.next_re_audit_after`);

  const validationRaw = row.validation_commands;
  const validation =
    validationRaw && typeof validationRaw === "object"
      ? (validationRaw as Record<string, unknown>)
      : null;
  const prove_gap = stringArray(validation?.prove_gap);
  if (prove_gap.length === 0) errors.push(`findings[${index}]: missing validation_commands.prove_gap`);

  if (errors.length > 0 || !status || !severity) {
    return { finding: null, errors };
  }

  return {
    finding: {
      finding_id,
      finding_code: typeof row.finding_code === "string" ? row.finding_code : "",
      title: typeof row.title === "string" ? row.title : "",
      status,
      severity,
      truth_surface: typeof row.truth_surface === "string" ? row.truth_surface : "unknown",
      summary: typeof row.summary === "string" ? row.summary : "",
      proven_gap: typeof row.proven_gap === "string" ? row.proven_gap : "",
      false_safety_risk: typeof row.false_safety_risk === "string" ? row.false_safety_risk : "",
      smallest_safe_fix: typeof row.smallest_safe_fix === "string" ? row.smallest_safe_fix : "",
      re_audit: {
        next_re_audit_after,
        last_re_audit_at:
          typeof reAudit?.last_re_audit_at === "string" || reAudit?.last_re_audit_at === null
            ? (reAudit.last_re_audit_at as string | null)
            : null,
        cadence_days: typeof reAudit?.cadence_days === "number" ? reAudit.cadence_days : 0,
        re_audit_owner:
          typeof reAudit?.re_audit_owner === "string" ? reAudit.re_audit_owner : "unknown",
      },
      validation_commands: {
        prove_gap,
        prove_mitigation: stringArray(validation?.prove_mitigation),
        prove_fixed: stringArray(validation?.prove_fixed),
        prove_not_regressed: stringArray(validation?.prove_not_regressed),
      },
    },
    errors,
  };
}

export function parseTruthIntegrityRegistryDocumentV1(
  raw: unknown,
): { document: TruthIntegrityRegistryDocumentV1 | null; parse_errors: string[] } {
  const parse_errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { document: null, parse_errors: ["registry: root is not an object"] };
  }
  const root = raw as Record<string, unknown>;
  if (root.contract !== TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1) {
    parse_errors.push(`registry: contract must be ${TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1}`);
  }
  if (!Array.isArray(root.findings)) {
    parse_errors.push("registry: findings must be an array");
    return { document: null, parse_errors };
  }

  const findings: TruthIntegrityFindingV1[] = [];
  root.findings.forEach((item, index) => {
    const parsed = parseFinding(item, index);
    parse_errors.push(...parsed.errors);
    if (parsed.finding) findings.push(parsed.finding);
  });

  if (parse_errors.length > 0) {
    return { document: null, parse_errors };
  }

  return {
    document: {
      contract: TRUTH_INTEGRITY_REGISTRY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      findings,
    },
    parse_errors: [],
  };
}

export type LoadTruthIntegrityRegistryResultV1 = {
  registry_rel: typeof TRUTH_INTEGRITY_REGISTRY_REL_V1;
  registry_exists: boolean;
  document: TruthIntegrityRegistryDocumentV1 | null;
  parse_errors: string[];
};

export function loadTruthIntegrityRegistryV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): LoadTruthIntegrityRegistryResultV1 {
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const abs = path.join(args.rootDir, ...TRUTH_INTEGRITY_REGISTRY_REL_V1.split("/"));
  const registry_exists = fileExists(abs);
  if (!registry_exists) {
    return {
      registry_rel: TRUTH_INTEGRITY_REGISTRY_REL_V1,
      registry_exists: false,
      document: null,
      parse_errors: [`registry file missing at ${TRUTH_INTEGRITY_REGISTRY_REL_V1}`],
    };
  }

  try {
    const parsed = parseTruthIntegrityRegistryDocumentV1(JSON.parse(readTextFile(abs)) as unknown);
    return {
      registry_rel: TRUTH_INTEGRITY_REGISTRY_REL_V1,
      registry_exists: true,
      document: parsed.document,
      parse_errors: parsed.parse_errors,
    };
  } catch (error) {
    return {
      registry_rel: TRUTH_INTEGRITY_REGISTRY_REL_V1,
      registry_exists: true,
      document: null,
      parse_errors: [
        `registry JSON parse failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

export type TruthIntegrityTopRiskV1 = {
  finding_id: string;
  finding_code: string;
  title: string;
  status: TruthIntegrityFindingStatusV1;
  severity: TruthIntegritySeverityV1;
  truth_surface: string;
  next_re_audit_after: string;
  re_audit_due: boolean;
};

export function compareTruthIntegrityFindingsForTopRiskV1(
  a: TruthIntegrityFindingV1,
  b: TruthIntegrityFindingV1,
): number {
  const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (severityDiff !== 0) return severityDiff;

  const statusDiff =
    STATUS_PRIORITY_FOR_TOP_RISK[a.status] - STATUS_PRIORITY_FOR_TOP_RISK[b.status];
  if (statusDiff !== 0) return statusDiff;

  const dueDiff = Date.parse(a.re_audit.next_re_audit_after) - Date.parse(b.re_audit.next_re_audit_after);
  if (Number.isFinite(dueDiff) && dueDiff !== 0) return dueDiff;

  return a.finding_id.localeCompare(b.finding_id);
}

export function selectTopTruthIntegrityRiskV1(
  findings: TruthIntegrityFindingV1[],
  now: Date,
): TruthIntegrityTopRiskV1 | null {
  const unfixed = findings.filter((finding) => isTruthIntegrityFindingUnfixedV1(finding.status));
  if (unfixed.length === 0) return null;

  const top = [...unfixed].sort(compareTruthIntegrityFindingsForTopRiskV1)[0];
  const dueMs = Date.parse(top.re_audit.next_re_audit_after);
  const re_audit_due = Number.isFinite(dueMs) && now.getTime() >= dueMs;

  return {
    finding_id: top.finding_id,
    finding_code: top.finding_code,
    title: top.title,
    status: top.status,
    severity: top.severity,
    truth_surface: top.truth_surface,
    next_re_audit_after: top.re_audit.next_re_audit_after,
    re_audit_due,
  };
}

export function countTruthIntegrityFindingsByStatusV1(
  findings: TruthIntegrityFindingV1[],
): Record<TruthIntegrityFindingStatusV1, number> {
  const counts = Object.fromEntries(
    TRUTH_INTEGRITY_FINDING_STATUSES_V1.map((status) => [status, 0]),
  ) as Record<TruthIntegrityFindingStatusV1, number>;
  for (const finding of findings) {
    counts[finding.status] += 1;
  }
  return counts;
}

export function buildRecommendedTruthIntegrityNextActionV1(args: {
  findings: TruthIntegrityFindingV1[];
  next_re_audit_due_count: number;
  top_risk: TruthIntegrityTopRiskV1 | null;
}): string {
  if (args.findings.length === 0) {
    return "No truth integrity findings in registry.";
  }
  if (!args.top_risk) {
    return "All truth integrity findings are FIXED or REJECTED.";
  }

  if (args.next_re_audit_due_count > 0 && args.top_risk.re_audit_due) {
    const topFinding = args.findings.find((f) => f.finding_id === args.top_risk?.finding_id);
    const proveGap = topFinding?.validation_commands.prove_gap[0];
    return `Re-audit due: ${args.top_risk.finding_id} (${args.top_risk.finding_code}) — run prove_gap validation from ${TRUTH_INTEGRITY_REGISTRY_REL_V1}${proveGap ? ` (e.g. ${proveGap})` : ""}.`;
  }

  const topFinding = args.findings.find((f) => f.finding_id === args.top_risk?.finding_id);
  if (topFinding?.smallest_safe_fix) {
    return topFinding.smallest_safe_fix;
  }

  return `Review truth integrity finding ${args.top_risk.finding_id} (${args.top_risk.finding_code}).`;
}
