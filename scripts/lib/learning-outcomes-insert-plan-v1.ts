import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesInsertPlanV1,
  ProposedLearningOutcomeRowV1,
} from "./buckparts-command-center-v2-types";
import type { LearningOutcomeInsertInput } from "./learning-outcomes-writer";
import { validateLearningOutcomeInput } from "./learning-outcomes-writer";

const FIRST_BATCH_CAP = 10;
const OWNER_OR_BLOCKED_CAP = 20;

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

function classifyCandidate(c: EvidenceToLoImportCandidateV1): ClassifiedRow {
  const p = c.proposed_learning_outcome;
  const prefer = matchesLiveAmazonPrefer(c);
  const vr = validateWriterOrError(p);
  const reasons: string[] = [];
  const actions: string[] = [];

  if (vr.ok) {
    reasons.push("Passes validateLearningOutcomeInput from learning-outcomes-writer.ts (read-only gate for writer-ready).");
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
): LearningOutcomesInsertPlanV1 {
  const unknown_facts: string[] = [];
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

  const classified = evidenceImport.candidates.map(classifyCandidate);
  const writer_ready_count = classified.filter((r) => r.disposition === "writer_ready").length;
  const owner_review_required_count = classified.filter((r) => r.disposition === "owner_review_required").length;
  const blocked_count = classified.filter((r) => r.disposition === "blocked_from_writer_batch").length;

  if (evidenceImport.candidates.length < evidenceImport.candidate_count) {
    unknown_facts.push(
      `evidence import candidates array is capped (${evidenceImport.candidates.length}) below candidate_count (${evidenceImport.candidate_count}) — insert plan counts only visible candidates.`,
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
  ];

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
