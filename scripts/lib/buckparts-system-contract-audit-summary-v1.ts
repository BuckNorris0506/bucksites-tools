/**
 * Command Center v1 summary lane for system contract audit (read-only projection).
 */

import type { BuckpartsSystemContractAudit } from "../audit-buckparts-system-contracts";

const MAX_FAILURES = 3;

type RuntimeStatus = "OK" | "ATTENTION" | "UNKNOWN";

export type SystemContractAuditSummaryFailureV1 = {
  id: string;
  severity: BuckpartsSystemContractAudit["failures"][number]["severity"];
  system: string;
};

export type SystemContractAuditSummaryV1 = {
  contract: "system_contract_audit_summary_v1";
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: RuntimeStatus;
  audit_status: BuckpartsSystemContractAudit["status"];
  blocking: boolean;
  summary: BuckpartsSystemContractAudit["summary"];
  failure_count: number;
  top_failures: SystemContractAuditSummaryFailureV1[];
  source_command: "npm run buckparts:audit";
  proven_facts: string[];
  unknown_facts: string[];
};

function runtimeStatusFromAudit(audit: BuckpartsSystemContractAudit): RuntimeStatus {
  if (audit.blocking) return "ATTENTION";
  if (audit.status === "PASS") return "OK";
  return "ATTENTION";
}

export function buildSystemContractAuditSummaryV1FromReport(
  audit: BuckpartsSystemContractAudit,
  args: { generated_at: string },
): SystemContractAuditSummaryV1 {
  const top_failures = audit.failures.slice(0, MAX_FAILURES).map((failure) => ({
    id: failure.id,
    severity: failure.severity,
    system: failure.system,
  }));
  return {
    contract: "system_contract_audit_summary_v1",
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    runtime_status: runtimeStatusFromAudit(audit),
    audit_status: audit.status,
    blocking: audit.blocking,
    summary: audit.summary,
    failure_count: audit.failures.length,
    top_failures,
    source_command: "npm run buckparts:audit",
    proven_facts: [
      `System contract audit status=${audit.status}; blocking=${String(audit.blocking)}; failures=${audit.failures.length}.`,
      `Severity counts critical=${audit.summary.critical} high=${audit.summary.high} medium=${audit.summary.medium}.`,
      "system_contract_audit_summary_v1 is a read-only projection of buckparts_system_contract_audit_v1 for Command Center JSON.",
    ],
    unknown_facts: audit.blocking
      ? audit.failures.map((f) => `${f.id}: ${f.message}`)
      : [],
  };
}
