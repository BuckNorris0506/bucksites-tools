/**
 * Read-only lifecycle evidence audit for Command Center issue registry rows.
 * Status gates require PROVEN evidence — not commit narrative alone.
 *
 * Evidence-based highest status:
 * - repair_commit in git history (reachable from HEAD) → VALIDATED
 * - repair_commit ancestor of origin/main → DEPLOYED
 * - live/public re-audit artifact → RE_AUDITED
 * - issue-specific closure probe → CLOSED_PROVEN
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  COMMAND_CENTER_ISSUE_STATUSES_V1,
  compareCommandCenterIssueStatusOrderV1,
  type CommandCenterIssueRecordV1,
  type CommandCenterIssueStatusV1,
} from "./command-center-issue-registry-v1";

export const COMMAND_CENTER_ISSUE_LIFECYCLE_AUDIT_CONTRACT_V1 =
  "command_center_issue_lifecycle_audit_v1" as const;

export type IssueLifecycleEvidenceGateV1 = {
  repair_commit_proven: boolean;
  validation_proven: boolean;
  pushed_to_origin_proven: boolean;
  deployed_proven: boolean;
  re_audit_proven: boolean;
  closure_proven: boolean;
};

export type IssueLifecycleEvidenceBasisV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type IssueLifecycleGateDetailV1 = {
  gate: keyof IssueLifecycleEvidenceGateV1;
  basis: IssueLifecycleEvidenceBasisV1;
  detail: string;
};

export type IssueLifecycleAuditRowV1 = {
  issue_id: string;
  declared_status: CommandCenterIssueStatusV1;
  evidence_proven_max_status: CommandCenterIssueStatusV1;
  status_alignment: "ALIGNED" | "OVERSTATED" | "UNDERSTATED";
  lifecycle_evidence: IssueLifecycleEvidenceGateV1;
  gate_details: IssueLifecycleGateDetailV1[];
  recommended_status: CommandCenterIssueStatusV1;
  validation_test_files: string[];
};

export type IssueLifecycleDistributionV1 = {
  declared_by_status: Record<CommandCenterIssueStatusV1, number>;
  evidence_proven_max_by_status: Record<CommandCenterIssueStatusV1, number>;
  aligned_count: number;
  overstated_count: number;
  understated_count: number;
};

export type CommandCenterIssueLifecycleAuditV1 = {
  contract: typeof COMMAND_CENTER_ISSUE_LIFECYCLE_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  issues_audited: number;
  lifecycle_distribution: IssueLifecycleDistributionV1;
  rows: IssueLifecycleAuditRowV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const SEEDED_VALIDATION_TEST_FILES_V1: Record<string, string[]> = {
  "BP-000001": ["src/lib/fridge/fridge-learned-failure-customer-guard-v1.test.ts"],
  "BP-000002": ["src/lib/fridge/fridge-filter-pdp-customer-safety-v1.test.ts"],
  "BP-000003": ["src/lib/fridge/fridge-filter-pdp-customer-safety-v1.test.ts"],
  "BP-000004": ["src/lib/fridge/fridge-model-pdp-customer-safety-v1.test.ts"],
};

const ALL_SEEDED_VALIDATION_TEST_FILES_V1 = Array.from(
  new Set(Object.values(SEEDED_VALIDATION_TEST_FILES_V1).flat()),
);

function emptyStatusCounts(): Record<CommandCenterIssueStatusV1, number> {
  return Object.fromEntries(
    COMMAND_CENTER_ISSUE_STATUSES_V1.map((status) => [status, 0]),
  ) as Record<CommandCenterIssueStatusV1, number>;
}

function gitExec(rootDir: string, args: string[]): string | null {
  try {
    return execSync(["git", ...args].join(" "), {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function commitExists(rootDir: string, sha: string | null | undefined): boolean {
  if (!sha?.trim()) return false;
  return gitExec(rootDir, ["cat-file", "-t", sha.trim()]) === "commit";
}

function commitIsAncestorOfRef(
  rootDir: string,
  sha: string | null | undefined,
  ref: string,
): boolean {
  if (!sha?.trim()) return false;
  try {
    execSync(`git merge-base --is-ancestor ${sha.trim()} ${ref}`, {
      cwd: rootDir,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function commitIsAncestorOfHead(rootDir: string, sha: string | null | undefined): boolean {
  return commitIsAncestorOfRef(rootDir, sha, "HEAD");
}

function commitIsAncestorOfOriginMain(rootDir: string, sha: string | null | undefined): boolean {
  if (!gitExec(rootDir, ["rev-parse", "origin/main"])) return false;
  return commitIsAncestorOfRef(rootDir, sha, "origin/main");
}

function evidenceFilesExist(rootDir: string, files: string[]): boolean {
  return files.length > 0 && files.every((rel) => existsSync(path.join(rootDir, rel)));
}

function validationTestFilesForIssue(issue: CommandCenterIssueRecordV1): string[] {
  const seeded = SEEDED_VALIDATION_TEST_FILES_V1[issue.issue_id];
  if (seeded) return seeded;
  return issue.evidence_files.filter((file) => file.endsWith(".test.ts"));
}

export function runSeededIssueValidationTestsV1(rootDir: string): boolean {
  try {
    for (const rel of ALL_SEEDED_VALIDATION_TEST_FILES_V1) {
      execSync(`node --import tsx --test ${rel}`, {
        cwd: rootDir,
        stdio: "ignore",
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function evidenceProvenMaxStatusV1(
  gates: IssueLifecycleEvidenceGateV1,
  evidenceFilesPresent: boolean,
): CommandCenterIssueStatusV1 {
  if (!gates.repair_commit_proven) {
    return evidenceFilesPresent ? "PACKET_READY" : "DISCOVERED";
  }
  if (!gates.pushed_to_origin_proven) return "VALIDATED";
  if (!gates.re_audit_proven) return "DEPLOYED";
  if (!gates.closure_proven) return "RE_AUDITED";
  return "CLOSED_PROVEN";
}

export function compareDeclaredVsProvenStatusV1(
  declared: CommandCenterIssueStatusV1,
  provenMax: CommandCenterIssueStatusV1,
): IssueLifecycleAuditRowV1["status_alignment"] {
  const declaredRank = COMMAND_CENTER_ISSUE_STATUSES_V1.indexOf(declared);
  const provenRank = COMMAND_CENTER_ISSUE_STATUSES_V1.indexOf(provenMax);
  if (declaredRank === provenRank) return "ALIGNED";
  if (declaredRank > provenRank) return "OVERSTATED";
  return "UNDERSTATED";
}

export function auditCommandCenterIssueLifecycleV1(args: {
  issue: CommandCenterIssueRecordV1;
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  validationTestsPassed?: boolean;
}): IssueLifecycleAuditRowV1 {
  const rootDir = args.rootDir;
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));

  const validation_test_files = validationTestFilesForIssue(args.issue);
  const validationFilesPresent =
    validation_test_files.length > 0 &&
    validation_test_files.every((rel) => fileExists(path.join(rootDir, rel)));

  const repairSha = args.issue.repair_commit;
  const repair_commit_proven =
    commitExists(rootDir, repairSha) && commitIsAncestorOfHead(rootDir, repairSha);

  const validation_proven =
    repair_commit_proven && validationFilesPresent && args.validationTestsPassed === true;

  const pushed_to_origin_proven =
    repair_commit_proven && commitIsAncestorOfOriginMain(rootDir, repairSha);

  const deployed_proven = pushed_to_origin_proven;

  const re_audit_proven = args.issue.re_audit_outcome === "PASS";
  const closure_proven =
    args.issue.status === "CLOSED_PROVEN" &&
    Boolean(args.issue.closed_at) &&
    repair_commit_proven &&
    pushed_to_origin_proven &&
    re_audit_proven;

  const lifecycle_evidence: IssueLifecycleEvidenceGateV1 = {
    repair_commit_proven,
    validation_proven,
    pushed_to_origin_proven,
    deployed_proven,
    re_audit_proven,
    closure_proven,
  };

  const gate_details: IssueLifecycleGateDetailV1[] = [
    {
      gate: "repair_commit_proven",
      basis: repair_commit_proven ? "PROVEN" : "UNKNOWN",
      detail: repair_commit_proven
        ? `repair_commit ${repairSha} exists in git history and is ancestor of HEAD.`
        : repairSha
          ? `repair_commit ${repairSha} not proven on HEAD ancestry.`
          : "repair_commit missing.",
    },
    {
      gate: "validation_proven",
      basis: validation_proven ? "PROVEN" : validationFilesPresent ? "INFERRED" : "UNKNOWN",
      detail: validation_proven
        ? `Validation tests passed for ${validation_test_files.join(", ")}.`
        : validationFilesPresent
          ? "Validation test files present; supplemental only — not a lifecycle gate."
          : "No validation test files found for issue.",
    },
    {
      gate: "pushed_to_origin_proven",
      basis: pushed_to_origin_proven ? "PROVEN" : "UNKNOWN",
      detail: pushed_to_origin_proven
        ? `repair_commit ${repairSha} is ancestor of origin/main.`
        : "repair_commit not proven on origin/main ancestry.",
    },
    {
      gate: "deployed_proven",
      basis: deployed_proven ? "PROVEN" : "UNKNOWN",
      detail: deployed_proven
        ? "Repair pushed to origin/main — DEPLOYED (live re-audit not yet proven)."
        : "Repair not proven on origin/main.",
    },
    {
      gate: "re_audit_proven",
      basis: re_audit_proven ? "PROVEN" : "UNKNOWN",
      detail: re_audit_proven
        ? `re_audit_outcome=${args.issue.re_audit_outcome}.`
        : "No live/public RE_AUDITED artifact (re_audit_outcome PASS) recorded.",
    },
    {
      gate: "closure_proven",
      basis: closure_proven ? "PROVEN" : "UNKNOWN",
      detail: closure_proven
        ? "closed_at present with deploy + re-audit proof."
        : "CLOSED_PROVEN requires closure probe plus RE_AUDITED proof.",
    },
  ];

  const evidence_proven_max_status = evidenceProvenMaxStatusV1(
    lifecycle_evidence,
    evidenceFilesExist(rootDir, args.issue.evidence_files),
  );

  return {
    issue_id: args.issue.issue_id,
    declared_status: args.issue.status,
    evidence_proven_max_status,
    status_alignment: compareDeclaredVsProvenStatusV1(
      args.issue.status,
      evidence_proven_max_status,
    ),
    lifecycle_evidence,
    gate_details,
    recommended_status: evidence_proven_max_status,
    validation_test_files,
  };
}

export function buildCommandCenterIssueLifecycleAuditV1(args: {
  issues: CommandCenterIssueRecordV1[];
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  runValidationTests?: boolean;
}): CommandCenterIssueLifecycleAuditV1 {
  const validationTestsPassed = args.runValidationTests
    ? runSeededIssueValidationTestsV1(args.rootDir)
    : false;

  const rows = args.issues.map((issue) =>
    auditCommandCenterIssueLifecycleV1({
      issue,
      rootDir: args.rootDir,
      fileExists: args.fileExists,
      validationTestsPassed,
    }),
  );

  const lifecycle_distribution: IssueLifecycleDistributionV1 = {
    declared_by_status: emptyStatusCounts(),
    evidence_proven_max_by_status: emptyStatusCounts(),
    aligned_count: 0,
    overstated_count: 0,
    understated_count: 0,
  };

  for (const row of rows) {
    lifecycle_distribution.declared_by_status[row.declared_status] += 1;
    lifecycle_distribution.evidence_proven_max_by_status[row.evidence_proven_max_status] += 1;
    if (row.status_alignment === "ALIGNED") lifecycle_distribution.aligned_count += 1;
    if (row.status_alignment === "OVERSTATED") lifecycle_distribution.overstated_count += 1;
    if (row.status_alignment === "UNDERSTATED") lifecycle_distribution.understated_count += 1;
  }

  const proven_facts = [
    `PROVEN: lifecycle audit contract ${COMMAND_CENTER_ISSUE_LIFECYCLE_AUDIT_CONTRACT_V1} is read-only.`,
    `PROVEN: audited ${String(rows.length)} issue row(s).`,
    `PROVEN: lifecycle status order ${[...COMMAND_CENTER_ISSUE_STATUSES_V1].sort(compareCommandCenterIssueStatusOrderV1).join(">")}.`,
    `PROVEN: VALIDATED=repair in git; DEPLOYED=repair on origin/main; RE_AUDITED=re_audit_outcome PASS.`,
  ];

  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  for (const row of rows) {
    if (row.status_alignment === "OVERSTATED") {
      unknown_facts.push(
        `UNKNOWN: ${row.issue_id} declared_status=${row.declared_status} exceeds evidence_proven_max_status=${row.evidence_proven_max_status}.`,
      );
    }
    if (row.status_alignment === "UNDERSTATED") {
      unknown_facts.push(
        `UNKNOWN: ${row.issue_id} declared_status=${row.declared_status} is below evidence_proven_max_status=${row.evidence_proven_max_status}.`,
      );
    }
    if (row.evidence_proven_max_status === "DEPLOYED" && !row.lifecycle_evidence.re_audit_proven) {
      unknown_facts.push(`UNKNOWN: ${row.issue_id} live-site RE_AUDITED not proven.`);
    }
  }

  return {
    contract: COMMAND_CENTER_ISSUE_LIFECYCLE_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    issues_audited: rows.length,
    lifecycle_distribution,
    rows,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
