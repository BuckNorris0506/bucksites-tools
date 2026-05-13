import path from "node:path";

import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesConfidenceApprovalEntryV1,
  LearningOutcomesConfidenceApprovalRegistryV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  ProposedLearningOutcomeRowV1,
} from "./buckparts-command-center-v2-types";

const REGISTRY_REL = "data/ops/learning-outcomes-confidence-approvals.json" as const;
const CONFIDENCE_OK = new Set(["exact", "likely", "uncertain"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function normalizeRegistrySourceFile(rel: string): string {
  return path.normalize(rel.trim()).replace(/\\/g, "/");
}

/** Stable key: normalized relative source_file + lowercase slug or token. */
export function confidenceApprovalKey(source_file: string, slugOrToken: string): string {
  return `${normalizeRegistrySourceFile(source_file)}::${slugOrToken.trim().toLowerCase()}`;
}

export type ConfidenceApprovalLookup = {
  mergeCandidate(c: EvidenceToLoImportCandidateV1): {
    proposed: ProposedLearningOutcomeRowV1;
    registry_applied: boolean;
  };
  hasRegistryEntryForCandidate(c: EvidenceToLoImportCandidateV1): boolean;
  validApprovalKeys: ReadonlySet<string>;
};

export function candidateMatchesApproval(
  c: EvidenceToLoImportCandidateV1,
  a: LearningOutcomesConfidenceApprovalEntryV1,
): boolean {
  if (normalizeRegistrySourceFile(c.source_file) !== normalizeRegistrySourceFile(a.source_file)) return false;
  const regSlug = a.slug.trim().toLowerCase();
  const p = c.proposed_learning_outcome;
  if (p.slug.trim().toLowerCase() === regSlug) return true;
  if (typeof p.part_number === "string" && p.part_number.trim().toLowerCase() === regSlug) return true;
  return false;
}

export function buildLearningOutcomesConfidenceApprovalRegistryV1(
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1,
  loaded: LearningOutcomesConfidenceApprovalsLoadedV1,
): LearningOutcomesConfidenceApprovalRegistryV1 {
  if (evidenceImport.contract !== "evidence_to_learning_outcomes_candidate_import_v1") {
    return {
      contract: "learning_outcomes_confidence_approval_registry_v1",
      runtime_status: "UNKNOWN_INPUT",
      registry_path: loaded.registry_relative_path,
      valid_approval_count: 0,
      invalid_approval_count: 0,
      applied_approval_count: 0,
      unapplied_approval_count: 0,
      proven_facts: ["Registry summary requires evidence_to_learning_outcomes_candidate_import_v1."],
      unknown_facts: ["evidence import contract mismatch — registry summary not aligned to candidates."],
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  const fullCandidates =
    evidenceImport.candidates_evaluated_uncapped_v1 ?? evidenceImport.candidates;

  let applied_approval_count = 0;
  let unapplied_approval_count = 0;
  for (const a of loaded.valid_approvals) {
    const hit = fullCandidates.some((c) => candidateMatchesApproval(c, a));
    if (hit) applied_approval_count += 1;
    else unapplied_approval_count += 1;
  }

  const rs: LearningOutcomesConfidenceApprovalRegistryV1["runtime_status"] =
    loaded.runtime_status === "OK" ? "OK" : loaded.runtime_status;

  const proven_facts: string[] = [
    ...loaded.proven_facts,
    "applied_approval_count is the number of valid registry rows that match at least one current evidence candidate (normalized source_file + slug or part_number to registry slug); unapplied_approval_count is valid rows with no candidate match in this import.",
  ];

  return {
    contract: "learning_outcomes_confidence_approval_registry_v1",
    runtime_status: rs,
    registry_path: loaded.registry_relative_path,
    valid_approval_count: loaded.valid_approvals.length,
    invalid_approval_count: loaded.invalid_entries.length,
    applied_approval_count,
    unapplied_approval_count,
    proven_facts,
    unknown_facts: [...loaded.unknown_facts],
    owner_approval_required: true,
    data_mutation: false,
  };
}

function validateApprovalObject(
  raw: unknown,
  index: number,
): { ok: true; entry: LearningOutcomesConfidenceApprovalEntryV1 } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, reasons: [`approvals[${index}] is not an object.`] };
  }
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.source_file)) reasons.push(`approvals[${index}].source_file must be a non-empty string.`);
  if (!isNonEmptyString(o.slug)) reasons.push(`approvals[${index}].slug must be a non-empty string.`);
  const conf = typeof o.confidence === "string" ? o.confidence.trim().toLowerCase() : "";
  if (!CONFIDENCE_OK.has(conf)) {
    reasons.push(`approvals[${index}].confidence must be exact|likely|uncertain.`);
  }
  if (o.approved_by_owner !== true) {
    reasons.push(`approvals[${index}].approved_by_owner must be true.`);
  }
  if (!isNonEmptyString(o.approval_reason)) {
    reasons.push(`approvals[${index}].approval_reason must be a non-empty string.`);
  }
  if (reasons.length > 0) return { ok: false, reasons };

  return {
    ok: true,
    entry: {
      source_file: (o.source_file as string).trim(),
      slug: (o.slug as string).trim(),
      confidence: conf as "exact" | "likely" | "uncertain",
      approved_by_owner: true,
      approval_reason: (o.approval_reason as string).trim(),
    },
  };
}

export function createConfidenceApprovalLookup(
  validApprovals: readonly LearningOutcomesConfidenceApprovalEntryV1[],
): ConfidenceApprovalLookup {
  const byKey = new Map<string, "exact" | "likely" | "uncertain">();
  for (const a of validApprovals) {
    const k = confidenceApprovalKey(a.source_file, a.slug);
    if (!byKey.has(k)) {
      byKey.set(k, a.confidence);
    }
  }

  const validApprovalKeys = new Set(byKey.keys());

  function resolveConfidence(c: EvidenceToLoImportCandidateV1): "exact" | "likely" | "uncertain" | null {
    const sf = c.source_file;
    const p = c.proposed_learning_outcome;
    const slugKey = confidenceApprovalKey(sf, p.slug);
    const hitSlug = byKey.get(slugKey);
    if (hitSlug) return hitSlug;
    if (typeof p.part_number === "string" && p.part_number.trim().length > 0) {
      const tokenKey = confidenceApprovalKey(sf, p.part_number);
      return byKey.get(tokenKey) ?? null;
    }
    return null;
  }

  return {
    validApprovalKeys,
    hasRegistryEntryForCandidate(c: EvidenceToLoImportCandidateV1): boolean {
      return resolveConfidence(c) !== null;
    },
    mergeCandidate(c: EvidenceToLoImportCandidateV1): {
      proposed: ProposedLearningOutcomeRowV1;
      registry_applied: boolean;
    } {
      const conf = resolveConfidence(c);
      if (conf === null) {
        return { proposed: c.proposed_learning_outcome, registry_applied: false };
      }
      return {
        proposed: { ...c.proposed_learning_outcome, confidence: conf },
        registry_applied: true,
      };
    },
  };
}

export function loadLearningOutcomesConfidenceApprovalsRegistry(args: {
  rootDir: string;
  fileExists: (p: string) => boolean;
  readTextFile: (p: string) => string;
}): LearningOutcomesConfidenceApprovalsLoadedV1 {
  const registry_relative_path = REGISTRY_REL;
  const abs = path.resolve(args.rootDir, REGISTRY_REL);
  const proven_facts: string[] = [
    "learning_outcomes_confidence_approvals_v1 is read from disk only; Command Center does not write this file.",
    "Confidence literals apply only when source_file + slug (or part_number token match to registry slug) align with a valid approval row — no inference from evidence JSON bodies.",
  ];
  const unknown_facts: string[] = [];

  if (!args.fileExists(abs)) {
    return {
      registry_relative_path,
      runtime_status: "MISSING_FILE",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: [`Registry file missing at ${REGISTRY_REL} — no owner-approved confidence merges.`],
    };
  }

  let rawText: string;
  try {
    rawText = args.readTextFile(abs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return {
      registry_relative_path,
      runtime_status: "INVALID_JSON",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: [`Failed to read registry: ${msg}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      registry_relative_path,
      runtime_status: "INVALID_JSON",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ["Registry JSON.parse failed."],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      registry_relative_path,
      runtime_status: "INVALID_SCHEMA",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ["Registry root must be an object."],
    };
  }

  const root = parsed as Record<string, unknown>;
  if (root.contract !== "learning_outcomes_confidence_approvals_v1") {
    return {
      registry_relative_path,
      runtime_status: "INVALID_SCHEMA",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ['Registry contract must be "learning_outcomes_confidence_approvals_v1".'],
    };
  }
  if (root.owner_approved !== true) {
    return {
      registry_relative_path,
      runtime_status: "INVALID_SCHEMA",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ["Registry owner_approved must be true."],
    };
  }
  if (root.data_mutation !== false) {
    return {
      registry_relative_path,
      runtime_status: "INVALID_SCHEMA",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ["Registry data_mutation must be false."],
    };
  }

  const rawApprovals = root.approvals;
  if (!Array.isArray(rawApprovals)) {
    return {
      registry_relative_path,
      runtime_status: "INVALID_SCHEMA",
      valid_approvals: [],
      invalid_entries: [],
      proven_facts,
      unknown_facts: ["Registry approvals must be an array."],
    };
  }

  const valid_approvals: LearningOutcomesConfidenceApprovalEntryV1[] = [];
  const invalid_entries: Array<{ index: number; reasons: string[] }> = [];

  for (let i = 0; i < rawApprovals.length; i++) {
    const vr = validateApprovalObject(rawApprovals[i], i);
    if (vr.ok) {
      valid_approvals.push(vr.entry);
    } else {
      invalid_entries.push({ index: i, reasons: vr.reasons });
    }
  }

  if (invalid_entries.length > 0) {
    unknown_facts.push(
      `${invalid_entries.length} registry approval row(s) ignored due to validation failures (see invalid_entries in loader output).`,
    );
  }

  return {
    registry_relative_path,
    runtime_status: "OK",
    valid_approvals,
    invalid_entries,
    proven_facts,
    unknown_facts,
  };
}
