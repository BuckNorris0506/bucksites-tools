/**
 * Tamper-evident Truth Ledger v1 — artifact sha256 binding for guarded apply.
 *
 * Scope (v1): hash verify at mutation choke points only. Append-only
 * `data/ops/truth-ledger-v1.jsonl` is DEFERRED — not required before guarded
 * apply in-repo; hash binding + founder row binding closes forgery at apply time.
 * UNKNOWN until jsonl: cross-mutation audit trail, offline tamper history, external
 * exposure attestation without re-reading all owner-decisions.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { FounderDecisionRegistryRowV1 } from "./founder-decision-registry-v1";

export const TRUTH_LEDGER_CONTRACT_V1 = "truth_ledger_v1" as const;

export const TRUTH_LEDGER_V1_SOURCE_SNAPSHOT_CHAIN_OF_CUSTODY_DEFERRED_V1 = {
  deferred: true as const,
  proven_today: [
    "artifact_rel_path + sha256_at_binding at guarded apply (tamper-evident committed file integrity)",
    "founder bound_artifacts_v1 hash verify before mutation",
  ],
  not_proven_today: [
    "source_url snapshot at retrieval time",
    "source_content_sha256 of live web page vs extracted claim",
    "archived snapshot reference binding extracted_claim → evidence_sha256 → downstream artifact",
  ],
  smallest_v1_design: {
    source_url: "string — URL retrieved for browser proof or evidence",
    retrieved_at: "ISO-8601 — when source was fetched",
    source_content_sha256: "sha256 of normalized page bytes OR archived snapshot rel path",
    extracted_claim: "human/machine claim derived from source",
    evidence_sha256: "sha256 of evidence JSON committed to repo",
    downstream_artifact_hash_binding: "truth_ledger bound_artifacts_v1 entry_type evidence",
  },
  should_fix_before_scale:
    "Source snapshot integrity is SHOULD_FIX_BEFORE_SCALE — does not block current public trust if browser_truth_checked_at gate and hash binding hold.",
} as const;

export const TRUTH_LEDGER_V1_APPEND_ONLY_JSONL_DEFERRED_V1 = {
  deferred: true as const,
  reason:
    "Hash binding at guarded apply + founder bound_artifacts_v1 is sufficient for in-repo mutation fail-closed v1.",
  remains_unknown_without_jsonl: [
    "append-only cross-mutation audit trail",
    "detecting post-apply artifact edits without re-running apply",
    "external exposure attestation bundle",
  ],
} as const;

export type TruthLedgerEntryTypeV1 =
  | "evidence"
  | "founder_approval"
  | "execution_plan"
  | "apply_plan"
  | "csv_mutation_closeout";

export type TruthLedgerBoundArtifactV1 = {
  artifact_rel_path: string;
  sha256_at_binding: string;
  entry_type: TruthLedgerEntryTypeV1;
};

export type FounderDecisionBoundArtifactsV1 = {
  bound_artifacts_v1: TruthLedgerBoundArtifactV1[];
};

export function computeArtifactSha256FromTextV1(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function computeArtifactSha256V1(args: {
  rootDir: string;
  artifact_rel_path: string;
  readText?: (abs: string) => string;
}): string | null {
  const abs = path.join(args.rootDir, args.artifact_rel_path);
  try {
    const text = args.readText ? args.readText(abs) : readFileSync(abs, "utf8");
    return computeArtifactSha256FromTextV1(text);
  } catch {
    return null;
  }
}

export function verifyArtifactSha256V1(args: {
  rootDir: string;
  artifact_rel_path: string;
  expected_sha256: string;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; reason: string; actual_sha256: string | null } {
  const actual = computeArtifactSha256V1({
    rootDir: args.rootDir,
    artifact_rel_path: args.artifact_rel_path,
    readText: args.readText,
  });
  if (actual === null) {
    return {
      ok: false,
      reason: `artifact_missing:${args.artifact_rel_path}`,
      actual_sha256: null,
    };
  }
  if (actual !== args.expected_sha256.trim().toLowerCase()) {
    return {
      ok: false,
      reason: `truth_ledger_hash_mismatch:${args.artifact_rel_path}`,
      actual_sha256: actual,
    };
  }
  return { ok: true };
}

export function extractBoundArtifactsFromFounderRowV1(
  row: FounderDecisionRegistryRowV1 & Partial<FounderDecisionBoundArtifactsV1>,
): TruthLedgerBoundArtifactV1[] {
  const bound = row.bound_artifacts_v1;
  if (!Array.isArray(bound)) return [];
  return bound.filter(
    (b) =>
      typeof b?.artifact_rel_path === "string" &&
      typeof b?.sha256_at_binding === "string" &&
      typeof b?.entry_type === "string",
  ) as TruthLedgerBoundArtifactV1[];
}

export function verifyFounderDecisionArtifactBindingsV1(args: {
  row: FounderDecisionRegistryRowV1 & Partial<FounderDecisionBoundArtifactsV1>;
  rootDir: string;
  readText?: (abs: string) => string;
}): { ok: true } | { ok: false; blockers: string[] } {
  const bindings = extractBoundArtifactsFromFounderRowV1(args.row);
  if (bindings.length === 0) {
    return {
      ok: false,
      blockers: ["founder_approval_unbound_artifacts_v1"],
    };
  }
  const blockers: string[] = [];
  for (const binding of bindings) {
    const result = verifyArtifactSha256V1({
      rootDir: args.rootDir,
      artifact_rel_path: binding.artifact_rel_path,
      expected_sha256: binding.sha256_at_binding,
      readText: args.readText,
    });
    if (!result.ok) {
      blockers.push(`${result.reason}:expected_type=${binding.entry_type}`);
    }
  }
  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true };
}

export function buildGuardedApplyTruthLedgerBlockersV1(args: {
  rootDir: string;
  artifacts: TruthLedgerBoundArtifactV1[];
  founderRow?: (FounderDecisionRegistryRowV1 & Partial<FounderDecisionBoundArtifactsV1>) | null;
  readText?: (abs: string) => string;
}): string[] {
  const blockers: string[] = [];
  for (const artifact of args.artifacts) {
    const result = verifyArtifactSha256V1({
      rootDir: args.rootDir,
      artifact_rel_path: artifact.artifact_rel_path,
      expected_sha256: artifact.sha256_at_binding,
      readText: args.readText,
    });
    if (!result.ok) blockers.push(result.reason);
  }
  if (args.founderRow) {
    const founderVerify = verifyFounderDecisionArtifactBindingsV1({
      row: args.founderRow,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!founderVerify.ok) blockers.push(...founderVerify.blockers);
  }
  return Array.from(new Set(blockers));
}

export function bindArtifactsAtHashesV1(args: {
  rootDir: string;
  artifacts: Array<{ artifact_rel_path: string; entry_type: TruthLedgerEntryTypeV1 }>;
  readText?: (abs: string) => string;
}): TruthLedgerBoundArtifactV1[] {
  const bound: TruthLedgerBoundArtifactV1[] = [];
  for (const artifact of args.artifacts) {
    const sha = computeArtifactSha256V1({
      rootDir: args.rootDir,
      artifact_rel_path: artifact.artifact_rel_path,
      readText: args.readText,
    });
    if (!sha) continue;
    bound.push({
      artifact_rel_path: artifact.artifact_rel_path,
      sha256_at_binding: sha,
      entry_type: artifact.entry_type,
    });
  }
  return bound;
}
