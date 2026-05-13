import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesInsertPlanV1,
  LearningOutcomesOwnerConfidenceAssignmentPlanV1,
  LearningOutcomesWriterReadyBatchReviewV1,
  ProposedLearningOutcomeRowV1,
} from "./buckparts-command-center-v2-types";
import type { LearningOutcomeInsertInput } from "./learning-outcomes-writer";
import { validateLearningOutcomeInput } from "./learning-outcomes-writer";
import {
  createConfidenceApprovalLookup,
  type ConfidenceApprovalLookup,
} from "./learning-outcomes-confidence-approvals-registry-v1";

const FIRST_BATCH_CAP = 10;
const OWNER_OR_BLOCKED_CAP = 20;
const WRITER_READY_REVIEW_CAP = 10;
const CONFIDENCE_ASSIGNMENT_CAP = 10;

type Disposition = "writer_ready" | "owner_review_required" | "blocked_from_writer_batch";

type ClassifiedRow = {
  source_file: string;
  proposed: ProposedLearningOutcomeRowV1;
  disposition: Disposition;
  reasons: string[];
  proposed_owner_actions: string[];
  prefer_live_amazon: boolean;
};

function matchesLiveAmazonPrefer(c: EvidenceToLoImportCandidateV1): boolean {
  const p = c.proposed_learning_outcome;
  if (p.outcome !== "pass") return false;
  if (!p.retailer || p.retailer.trim().toLowerCase() !== "amazon") return false;
  if (!p.candidate_url || !/^https:\/\//i.test(p.candidate_url)) return false;
  if (p.cta_status !== "live") return false;
  if (!c.source_file.toLowerCase().includes("live-outcome")) return false;
  return true;
}

function toWriterInput(p: ProposedLearningOutcomeRowV1): LearningOutcomeInsertInput | null {
  if (p.confidence === null || p.cta_status === null) return null;
  return {
    slug: p.slug,
    part_number: p.part_number,
    model_number: p.model_number,
    candidate_url: p.candidate_url,
    outcome: p.outcome,
    reason: p.reason,
    reason_detail: p.reason_detail,
    evidence: p.evidence_jsonb_stub as Record<string, any>,
    confidence: p.confidence,
    cta_status: p.cta_status,
    index_status: p.index_status,
    date_checked: p.date_checked,
  };
}

/** Internal probe only: confirms other fields satisfy validateLearningOutcomeInput when any allowed literal is present — not an assignment. */
function passesWriterValidationIfConfidenceWereLiteral(
  p: ProposedLearningOutcomeRowV1,
  literal: "exact" | "likely" | "uncertain",
): boolean {
  const probe: ProposedLearningOutcomeRowV1 = { ...p, confidence: literal };
  const input = toWriterInput(probe);
  if (!input) return false;
  try {
    validateLearningOutcomeInput(input);
    return true;
  } catch {
    return false;
  }
}

function validateWriterOrError(p: ProposedLearningOutcomeRowV1): { ok: true } | { ok: false; message: string } {
  const input = toWriterInput(p);
  if (!input) {
    if (p.confidence === null && p.cta_status === null) {
      return { ok: false, message: "insertLearningOutcome requires non-null confidence and cta_status (learning-outcomes-writer.ts)." };
    }
    if (p.confidence === null) {
      return { ok: false, message: "insertLearningOutcome requires confidence exact|likely|uncertain; value is null — do not guess." };
    }
    return { ok: false, message: "insertLearningOutcome requires cta_status live|not_live|blocked; value is null." };
  }
  try {
    validateLearningOutcomeInput(input);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function classifyCandidate(c: EvidenceToLoImportCandidateV1, confidenceLookup: ConfidenceApprovalLookup): ClassifiedRow {
  const { proposed: p, registry_applied: registry_applied } = confidenceLookup.mergeCandidate(c);
  const cForPrefer: EvidenceToLoImportCandidateV1 = { ...c, proposed_learning_outcome: p };
  const prefer = matchesLiveAmazonPrefer(cForPrefer);
  const vr = validateWriterOrError(p);
  const reasons: string[] = [];
  const actions: string[] = [];

  if (vr.ok) {
    reasons.push("Passes validateLearningOutcomeInput from learning-outcomes-writer.ts (read-only gate for writer-ready).");
    if (registry_applied) {
      reasons.push(
        "Confidence literal applied from data/ops/learning-outcomes-confidence-approvals.json for matching source_file + slug or token — owner-approved registry row only; not inferred from evidence JSON.",
      );
    }
    if (prefer) {
      reasons.push("Matches live Amazon + live-outcome filename preference (ordering hint only; not purchase or shelf-fit claims).");
    }
    return {
      source_file: c.source_file,
      proposed: p,
      disposition: "writer_ready",
      reasons,
      proposed_owner_actions: [],
      prefer_live_amazon: prefer,
    };
  }

  reasons.push(`Writer validation failed: ${vr.message}`);
  if (p.confidence === null) {
    actions.push("OWNER_SET_CONFIDENCE_OR_APPROVE_NULL_POLICY");
    reasons.push(
      "Confidence is absent on candidate — insertLearningOutcome currently requires confidence; owner must set a proven literal (exact|likely|uncertain) or approve a repo policy change for nullable inserts.",
    );
  }

  if (prefer) {
    return {
      source_file: c.source_file,
      proposed: p,
      disposition: "owner_review_required",
      reasons,
      proposed_owner_actions: actions,
      prefer_live_amazon: true,
    };
  }

  return {
    source_file: c.source_file,
    proposed: p,
    disposition: "blocked_from_writer_batch",
    reasons,
    proposed_owner_actions: actions,
    prefer_live_amazon: false,
  };
}

function rowKey(c: ClassifiedRow): string {
  return `${c.source_file}::${c.proposed.slug}`;
}

export function buildLearningOutcomesInsertPlanV1(
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1,
  confidenceLookup: ConfidenceApprovalLookup | null = null,
): LearningOutcomesInsertPlanV1 {
  const unknown_facts: string[] = [];
  const l = confidenceLookup ?? createConfidenceApprovalLookup([]);
  if (evidenceImport.contract !== "evidence_to_learning_outcomes_candidate_import_v1") {
    return {
      contract: "learning_outcomes_insert_plan_v1",
      runtime_status: "UNKNOWN_INPUT",
      source_candidate_count: 0,
      writer_ready_count: 0,
      owner_review_required_count: 0,
      blocked_count: 0,
      proposed_first_batch: [],
      blocked_or_needs_owner_review: [],
      proven_facts: ["Insert plan requires evidence_to_learning_outcomes_candidate_import_v1 input contract."],
      unknown_facts: ["evidence import contract mismatch — plan not built."],
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  const runtime_status: "OK" | "UNKNOWN_INPUT" =
    evidenceImport.runtime_status === "OK" ? "OK" : "UNKNOWN_INPUT";

  const fullCandidates =
    evidenceImport.candidates_evaluated_uncapped_v1 ?? evidenceImport.candidates;
  const classified = fullCandidates.map((c) => classifyCandidate(c, l));
  const writer_ready_count = classified.filter((r) => r.disposition === "writer_ready").length;
  const owner_review_required_count = classified.filter((r) => r.disposition === "owner_review_required").length;
  const blocked_count = classified.filter((r) => r.disposition === "blocked_from_writer_batch").length;

  if (fullCandidates.length !== evidenceImport.candidate_count) {
    unknown_facts.push(
      `Insert plan evaluated ${fullCandidates.length} candidate row(s) but evidence import candidate_count is ${evidenceImport.candidate_count} — cardinality mismatch; counts may diverge from scan truth.`,
    );
  }
  if (!evidenceImport.candidates_evaluated_uncapped_v1 && evidenceImport.candidates.length < evidenceImport.candidate_count) {
    unknown_facts.push(
      `evidence import omitted candidates_evaluated_uncapped_v1 and candidates preview length (${evidenceImport.candidates.length}) is below candidate_count (${evidenceImport.candidate_count}) — insert plan fell back to preview-only rows.`,
    );
  }

  const forBatch = classified
    .filter((r) => r.disposition === "writer_ready" || r.disposition === "owner_review_required")
    .sort((a, b) => {
      const pa = a.prefer_live_amazon ? 0 : 1;
      const pb = b.prefer_live_amazon ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const wa = a.disposition === "writer_ready" ? 0 : 1;
      const wb = b.disposition === "writer_ready" ? 0 : 1;
      if (wa !== wb) return wa - wb;
      return a.source_file.localeCompare(b.source_file);
    });

  const proposed_first_batch = forBatch.slice(0, FIRST_BATCH_CAP).map((r) => ({
    source_file: r.source_file,
    disposition: r.disposition,
    proposed_learning_outcome: r.proposed,
    reasons: r.reasons,
    proposed_owner_actions: r.proposed_owner_actions,
  }));

  const inBatch = new Set(proposed_first_batch.map((b) => `${b.source_file}::${b.proposed_learning_outcome.slug}`));

  const ownerOrBlocked = classified
    .filter((r) => r.disposition === "owner_review_required" || r.disposition === "blocked_from_writer_batch")
    .filter((r) => !inBatch.has(rowKey(r)))
    .sort((a, b) => a.source_file.localeCompare(b.source_file))
    .slice(0, OWNER_OR_BLOCKED_CAP)
    .map((r) => ({
      source_file: r.source_file,
      disposition: r.disposition as "owner_review_required" | "blocked_from_writer_batch",
      reasons: r.reasons,
      proposed_owner_actions: r.proposed_owner_actions,
    }));

  const proven_facts: string[] = [
    "learning_outcomes_insert_plan_v1 is derived only from evidence_to_learning_outcomes_candidate_import_v1 plus validateLearningOutcomeInput from scripts/lib/learning-outcomes-writer.ts.",
    "No Supabase calls, no insertLearningOutcome execution, no SQL generation.",
    "writer_ready means validateLearningOutcomeInput succeeds on a payload built only from proposed_learning_outcome (confidence and cta_status must be non-null literals).",
    "Preference for live Amazon + live-outcome filename does not assert buy readiness, shelf-compatibility claims, revenue, or shopper-facing publish approval.",
    "Disposition counts and batch ordering use candidates_evaluated_uncapped_v1 when provided (full internal set); proposed_first_batch and blocked_or_needs_owner_review remain capped arrays.",
  ];
  if (l.validApprovalKeys.size > 0) {
    proven_facts.push(
      "Owner registry data/ops/learning-outcomes-confidence-approvals.json may supply explicit confidence only for matching source_file + slug or token rows — merged read-only before validation; never inferred from evidence bodies.",
    );
  }

  return {
    contract: "learning_outcomes_insert_plan_v1",
    runtime_status,
    source_candidate_count: evidenceImport.candidate_count,
    writer_ready_count,
    owner_review_required_count,
    blocked_count,
    proposed_first_batch,
    blocked_or_needs_owner_review: ownerOrBlocked,
    proven_facts,
    unknown_facts,
    owner_approval_required: true,
    data_mutation: false,
  };
}

function writerReadyValidationBasis(classifiedRow: ClassifiedRow): string[] {
  return [
    ...classifiedRow.reasons,
    "Structured validation: slug and reason are non-empty strings; outcome is pass|fail|blocked|unknown; confidence is exact|likely|uncertain; cta_status is live|not_live|blocked; nullable string fields and evidence object shape meet validateLearningOutcomeInput in scripts/lib/learning-outcomes-writer.ts (schema-only — not a listing-quality or site-publish approval).",
  ];
}

/**
 * Read-only: exact `insertLearningOutcome` input payloads for owner sign-off. Same writer_ready classification
 * as learning_outcomes_insert_plan_v1; rows array capped; no Supabase.
 */
export function buildLearningOutcomesWriterReadyBatchReviewV1(
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1,
  confidenceLookup: ConfidenceApprovalLookup | null = null,
): LearningOutcomesWriterReadyBatchReviewV1 {
  if (evidenceImport.contract !== "evidence_to_learning_outcomes_candidate_import_v1") {
    return {
      contract: "learning_outcomes_writer_ready_batch_review_v1",
      runtime_status: "UNKNOWN_INPUT",
      source_writer_ready_count: 0,
      reviewed_row_count: 0,
      rows: [],
      proven_facts: ["Writer-ready review requires evidence_to_learning_outcomes_candidate_import_v1 input contract."],
      unknown_facts: ["evidence import contract mismatch — review block not built."],
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  const runtime_status: "OK" | "UNKNOWN_INPUT" =
    evidenceImport.runtime_status === "OK" ? "OK" : "UNKNOWN_INPUT";

  const l = confidenceLookup ?? createConfidenceApprovalLookup([]);
  const fullCandidates =
    evidenceImport.candidates_evaluated_uncapped_v1 ?? evidenceImport.candidates;
  const classified = fullCandidates.map((c) => classifyCandidate(c, l));
  const writerReady = classified.filter((r) => r.disposition === "writer_ready");
  const source_writer_ready_count = writerReady.length;

  writerReady.sort((a, b) => {
    const pa = a.prefer_live_amazon ? 0 : 1;
    const pb = b.prefer_live_amazon ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.source_file.localeCompare(b.source_file);
  });

  const unknown_facts: string[] = [];
  if (source_writer_ready_count > WRITER_READY_REVIEW_CAP) {
    unknown_facts.push(
      `writer_ready rows (${source_writer_ready_count}) exceed review display cap (${WRITER_READY_REVIEW_CAP}); rows array is the first ${WRITER_READY_REVIEW_CAP} after live-Amazon preference ordering.`,
    );
  }

  const rows = writerReady.slice(0, WRITER_READY_REVIEW_CAP).flatMap((r) => {
    const payload = toWriterInput(r.proposed);
    if (!payload) {
      unknown_facts.push(
        `Internal inconsistency: ${r.source_file} marked writer_ready but proposed_learning_outcome did not serialize to a writer input — row omitted from review list.`,
      );
      return [];
    }
    return [
      {
        source_file: r.source_file,
        proposed_insert_payload: payload,
        validation_basis: writerReadyValidationBasis(r),
        owner_approval_required: true as const,
        approval_status: "PENDING_OWNER_REVIEW" as const,
      },
    ];
  });

  const proven_facts: string[] = [
    "learning_outcomes_writer_ready_batch_review_v1 includes only candidates classified writer_ready by the same mapping as learning_outcomes_insert_plan_v1.",
    "insertLearningOutcome is not invoked; proposed_insert_payload mirrors LearningOutcomeInsertInput for owner inspection.",
    "Evidence field uses only the bounded evidence_jsonb_stub from evidence mapping — no raw evidence file bodies expanded here.",
    "Validation_basis describes schema checks only — not shelf listing merit, revenue, commission, or shopper-site publish approval.",
  ];

  return {
    contract: "learning_outcomes_writer_ready_batch_review_v1",
    runtime_status,
    source_writer_ready_count,
    reviewed_row_count: rows.length,
    rows,
    proven_facts,
    unknown_facts,
    owner_approval_required: true,
    data_mutation: false,
  };
}

export function buildLearningOutcomesOwnerConfidenceAssignmentPlanV1(
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1,
  confidenceLookup: ConfidenceApprovalLookup | null = null,
): LearningOutcomesOwnerConfidenceAssignmentPlanV1 {
  if (evidenceImport.contract !== "evidence_to_learning_outcomes_candidate_import_v1") {
    return {
      contract: "learning_outcomes_owner_confidence_assignment_plan_v1",
      runtime_status: "UNKNOWN_INPUT",
      source_candidate_count: 0,
      assignment_candidate_count: 0,
      rows: [],
      proven_facts: [
        "Owner confidence assignment plan requires evidence_to_learning_outcomes_candidate_import_v1 input contract.",
      ],
      unknown_facts: ["evidence import contract mismatch — plan not built."],
      owner_approval_required: true,
      data_mutation: false,
    };
  }

  const runtime_status: "OK" | "UNKNOWN_INPUT" =
    evidenceImport.runtime_status === "OK" ? "OK" : "UNKNOWN_INPUT";

  const l = confidenceLookup ?? createConfidenceApprovalLookup([]);
  const fullCandidates =
    evidenceImport.candidates_evaluated_uncapped_v1 ?? evidenceImport.candidates;
  const classified = fullCandidates.map((c) => classifyCandidate(c, l));

  const eligible = classified.filter(
    (r) =>
      r.disposition === "owner_review_required" &&
      r.prefer_live_amazon &&
      r.proposed.confidence === null &&
      passesWriterValidationIfConfidenceWereLiteral(r.proposed, "exact"),
  );
  eligible.sort((a, b) => a.source_file.localeCompare(b.source_file));

  const assignment_candidate_count = eligible.length;
  const unknown_facts: string[] = [];
  if (assignment_candidate_count > CONFIDENCE_ASSIGNMENT_CAP) {
    unknown_facts.push(
      `Confidence assignment candidates (${assignment_candidate_count}) exceed display cap (${CONFIDENCE_ASSIGNMENT_CAP}); rows array lists the first ${CONFIDENCE_ASSIGNMENT_CAP} after source_file ordering.`,
    );
  }

  const rows = eligible.slice(0, CONFIDENCE_ASSIGNMENT_CAP).map((r) => {
    const orig = fullCandidates.find(
      (x) => x.source_file === r.source_file && x.proposed_learning_outcome.slug === r.proposed.slug,
    );
    return {
      source_file: r.source_file,
      proposed_learning_outcome: r.proposed,
      missing_field: "confidence" as const,
      allowed_confidence_values: ["exact", "likely", "uncertain"] as const,
      recommended_owner_question: `Choose explicit confidence (exact, likely, or uncertain) for slug "${r.proposed.slug}" from ${r.source_file} using operator judgment — this plan does not assign or infer a value from evidence JSON.`,
      blocked_until_owner_sets_confidence: true as const,
      owner_approval_required: true as const,
      matching_owner_confidence_registry_entry: orig ? l.hasRegistryEntryForCandidate(orig) : false,
    };
  });

  const proven_facts: string[] = [
    "learning_outcomes_owner_confidence_assignment_plan_v1 lists live-outcome Amazon pass rows classified owner_review_required solely because confidence is null and validateLearningOutcomeInput succeeds when any allowed literal is supplied internally — no literal is chosen or persisted here.",
    "Rows match insert-plan preference (live Amazon CTA, https candidate_url, live-outcome filename); staged multipack unknown/not_live paths are excluded by those gates.",
    "No Supabase calls; confidence is never auto-filled from evidence JSON in this block.",
    "matching_owner_confidence_registry_entry is true when the confidence registry lists this source_file + slug/token pair even if confidence is still null on the candidate (for example path normalization mismatch).",
  ];

  return {
    contract: "learning_outcomes_owner_confidence_assignment_plan_v1",
    runtime_status,
    source_candidate_count: evidenceImport.candidate_count,
    assignment_candidate_count,
    rows,
    proven_facts,
    unknown_facts,
    owner_approval_required: true,
    data_mutation: false,
  };
}
