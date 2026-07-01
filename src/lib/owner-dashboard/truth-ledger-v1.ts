/**
 * Tamper-evident Truth Ledger v1 — artifact sha256 binding for guarded apply.
 *
 * Scope (v1): hash verify at mutation choke points; optional source_snapshot_v1
 * chain on evidence artifacts; append-only `data/ops/truth-ledger-v1.jsonl` for
 * mutation apply outcomes on high-risk Supabase parity and promote-staged lanes.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import type { FounderDecisionRegistryRowV1 } from "./founder-decision-registry-v1";

export const TRUTH_LEDGER_CONTRACT_V1 = "truth_ledger_v1" as const;

export const TRUTH_LEDGER_V1_JSONL_REL_V1 = "data/ops/truth-ledger-v1.jsonl" as const;

export const TRUTH_LEDGER_V1_SOURCE_SNAPSHOT_CHAIN_OF_CUSTODY_DEFERRED_V1 = {
  deferred: false as const,
  proven_today: [
    "artifact_rel_path + sha256_at_binding at guarded apply (tamper-evident committed file integrity)",
    "founder bound_artifacts_v1 hash verify before mutation",
    "optional source_snapshot_v1 chain verify when evidence artifact opts in",
  ],
  not_proven_today: [
    "source_content_sha256 of live web page vs extracted claim (when not archived)",
    "requiring source_snapshot_v1 on all committed evidence (backward compat: absent is OK)",
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
    "Full live-web source_content_sha256 enforcement is SHOULD_FIX_BEFORE_SCALE — optional source_snapshot_v1 on evidence only.",
} as const;

export const TRUTH_LEDGER_V1_APPEND_ONLY_JSONL_DEFERRED_V1 = {
  deferred: false as const,
  jsonl_rel_path: TRUTH_LEDGER_V1_JSONL_REL_V1,
  reason:
    "Append-only mutation apply outcome recording is proven for AP, RPWFE Supabase parity, promote-staged-refrigerator, HQII retailer-link ingest, seed import, learning-outcomes insert, remove-demo-wedge-brands, and verify-oem write-db lanes.",
  proven_today: [
    "appendTruthLedgerMutationEntryV1 requires MUTATION io_capability",
    "loadTruthLedgerAppendEntriesV1 reads append-only JSONL history",
    "recordTruthLedgerMutationOutcomeV1 on AP and RPWFE apply paths",
    "recordTruthLedgerMutationOutcomeV1 on promote-staged-refrigerator write path",
    "recordTruthLedgerMutationOutcomeV1 on ingest-hqii-retailer-links write path",
    "recordTruthLedgerMutationOutcomeV1 on hqii-candidate-queue-upsert write path",
    "recordTruthLedgerMutationOutcomeV1 on import-seed write path",
    "recordTruthLedgerMutationOutcomeV1 on vertical-seed write path",
    "recordTruthLedgerMutationOutcomeV1 on learning-outcomes insert write path",
    "recordTruthLedgerMutationOutcomeV1 on remove-demo-wedge-brands write path",
    "recordTruthLedgerMutationOutcomeV1 on verify-oem-retailer-links write-db path",
  ],
  remains_unknown_without_full_lane_coverage: [
    "universal-batch-lifecycle CSV executor append",
    "manufacturer-rescue apply append",
    "search_gaps and staged pipeline capability-only service-role lanes",
    "detecting post-apply artifact edits without re-running apply",
  ],
} as const;

export type TruthLedgerIoCapabilityV1 = "READ_INDEX" | "MUTATION";

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

export type TruthLedgerSourceSnapshotV1 = {
  source_url: string;
  retrieved_at: string;
  extracted_claim?: string;
  evidence_sha256: string;
  source_content_sha256?: string;
  archived_snapshot_rel_path?: string;
};

export type TruthLedgerMutationApplyOutcomeV1 = "applied" | "blocked";

export type TruthLedgerMutationAppendEntryV1 = {
  contract: typeof TRUTH_LEDGER_CONTRACT_V1;
  entry_kind: "mutation_apply_outcome_v1";
  recorded_at: string;
  mutation_lane: string;
  founder_decision_id: string | null;
  apply_outcome: TruthLedgerMutationApplyOutcomeV1;
  blockers: string[];
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

export function verifySourceSnapshotChainForEvidenceTextV1(args: {
  evidenceText: string;
  boundEvidenceSha256: string;
}): { ok: true } | { ok: false; blockers: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.evidenceText);
  } catch {
    return { ok: true };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: true };
  }
  const snapshot = (parsed as Record<string, unknown>).source_snapshot_v1;
  if (snapshot === undefined || snapshot === null) {
    return { ok: true };
  }
  if (typeof snapshot !== "object" || snapshot === null) {
    return { ok: false, blockers: ["truth_ledger_source_snapshot_invalid"] };
  }

  const s = snapshot as Record<string, unknown>;
  const sourceUrl = typeof s.source_url === "string" ? s.source_url.trim() : "";
  const retrievedAt = typeof s.retrieved_at === "string" ? s.retrieved_at.trim() : "";
  const evidenceSha256 =
    typeof s.evidence_sha256 === "string" ? s.evidence_sha256.trim().toLowerCase() : "";
  const bound = args.boundEvidenceSha256.trim().toLowerCase();

  const blockers: string[] = [];
  if (!sourceUrl) blockers.push("truth_ledger_source_snapshot_missing_source_url");
  if (!retrievedAt) {
    blockers.push("truth_ledger_source_snapshot_missing_retrieved_at");
  } else if (Number.isNaN(Date.parse(retrievedAt))) {
    blockers.push("truth_ledger_source_snapshot_invalid_retrieved_at");
  }
  if (!evidenceSha256) {
    blockers.push("truth_ledger_source_snapshot_missing_evidence_sha256");
  } else if (evidenceSha256 !== bound) {
    blockers.push("truth_ledger_source_snapshot_chain_mismatch");
  }

  if (blockers.length > 0) return { ok: false, blockers };
  return { ok: true };
}

function verifySourceSnapshotForEvidenceBindingV1(args: {
  rootDir: string;
  binding: TruthLedgerBoundArtifactV1;
  readText?: (abs: string) => string;
}): string[] {
  if (args.binding.entry_type !== "evidence") return [];
  const abs = path.join(args.rootDir, args.binding.artifact_rel_path);
  let evidenceText: string;
  try {
    evidenceText = args.readText ? args.readText(abs) : readFileSync(abs, "utf8");
  } catch {
    return [`artifact_missing:${args.binding.artifact_rel_path}`];
  }
  const result = verifySourceSnapshotChainForEvidenceTextV1({
    evidenceText,
    boundEvidenceSha256: args.binding.sha256_at_binding,
  });
  if (result.ok) return [];
  return result.blockers.map((b) => `${b}:expected_type=${args.binding.entry_type}`);
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
      continue;
    }
    blockers.push(
      ...verifySourceSnapshotForEvidenceBindingV1({
        rootDir: args.rootDir,
        binding,
        readText: args.readText,
      }),
    );
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
    if (!result.ok) {
      blockers.push(result.reason);
      continue;
    }
    blockers.push(
      ...verifySourceSnapshotForEvidenceBindingV1({
        rootDir: args.rootDir,
        binding: artifact,
        readText: args.readText,
      }),
    );
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

export function loadTruthLedgerAppendEntriesV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}): TruthLedgerMutationAppendEntryV1[] {
  const abs = path.join(args.rootDir, TRUTH_LEDGER_V1_JSONL_REL_V1);
  let text: string;
  try {
    text = args.readText ? args.readText(abs) : readFileSync(abs, "utf8");
  } catch {
    return [];
  }
  const entries: TruthLedgerMutationAppendEntryV1[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as TruthLedgerMutationAppendEntryV1;
      if (
        parsed?.contract === TRUTH_LEDGER_CONTRACT_V1 &&
        parsed?.entry_kind === "mutation_apply_outcome_v1"
      ) {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

export function appendTruthLedgerMutationEntryV1(args: {
  rootDir: string;
  entry: TruthLedgerMutationAppendEntryV1;
  io_capability: TruthLedgerIoCapabilityV1;
  appendText?: (absPath: string, line: string) => void;
  mkdir?: (dirAbs: string) => void;
}): { ok: true } | { ok: false; blockers: string[] } {
  if (args.io_capability !== "MUTATION") {
    return { ok: false, blockers: ["truth_ledger_append_requires_mutation_capability"] };
  }
  const abs = path.join(args.rootDir, TRUTH_LEDGER_V1_JSONL_REL_V1);
  const mkdirFn = args.mkdir ?? ((dir: string) => mkdirSync(dir, { recursive: true }));
  const appendFn =
    args.appendText ?? ((filePath: string, line: string) => appendFileSync(filePath, line, "utf8"));
  try {
    mkdirFn(path.dirname(abs));
    appendFn(abs, `${JSON.stringify(args.entry)}\n`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, blockers: [`truth_ledger_append_failed:${msg}`] };
  }
}

export function recordTruthLedgerMutationOutcomeV1(args: {
  rootDir: string;
  io_capability: TruthLedgerIoCapabilityV1;
  mutation_lane: string;
  founder_decision_id: string | null;
  apply_outcome: TruthLedgerMutationApplyOutcomeV1;
  blockers: string[];
  bound_artifacts_v1?: TruthLedgerBoundArtifactV1[];
  now?: () => Date;
  appendText?: (absPath: string, line: string) => void;
  mkdir?: (dirAbs: string) => void;
}): { ok: true } | { ok: false; blockers: string[] } {
  const entry: TruthLedgerMutationAppendEntryV1 = {
    contract: TRUTH_LEDGER_CONTRACT_V1,
    entry_kind: "mutation_apply_outcome_v1",
    recorded_at: (args.now ?? (() => new Date()))().toISOString(),
    mutation_lane: args.mutation_lane,
    founder_decision_id: args.founder_decision_id,
    apply_outcome: args.apply_outcome,
    blockers: args.blockers,
    bound_artifacts_v1: args.bound_artifacts_v1 ?? [],
  };
  return appendTruthLedgerMutationEntryV1({
    rootDir: args.rootDir,
    entry,
    io_capability: args.io_capability,
    appendText: args.appendText,
    mkdir: args.mkdir,
  });
}
