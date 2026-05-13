import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesReadModelV1,
} from "./buckparts-command-center-v2-types";
import { candidateMatchesApproval, createConfidenceApprovalLookup } from "./learning-outcomes-confidence-approvals-registry-v1";
import { buildLearningOutcomesWriterReadyBatchReviewV1 } from "./learning-outcomes-insert-plan-v1";
import type { LearningOutcomeInsertInput } from "./learning-outcomes-writer";

const CONFIDENCE = new Set(["exact", "likely", "uncertain"]);
const EXECUTOR_CAP = 1 as const;
const WRITER_READY_REVIEW_CAP = 10;

export type LearningOutcomesApprovedInsertExecutorModeV1 = "DRY_RUN" | "MUTATE_APPROVED";

export type LearningOutcomesApprovedInsertExecutorPlannedRowV1 = {
  source_file: string;
  slug: string;
  part_number: string | null;
  confidence: "exact" | "likely" | "uncertain";
  outcome: "pass";
  cta_status: "live";
  /** False only when this row matched a valid registry approval entry (explicit owner confidence registry). */
  owner_approval_required: false;
  why_would_insert: string[];
};

export type LearningOutcomesApprovedInsertExecutorV1Report = {
  contract: "learning_outcomes_approved_insert_executor_v1";
  mode: LearningOutcomesApprovedInsertExecutorModeV1;
  selected_count: number;
  inserted_count: number;
  skipped_count: number;
  inserted_or_planned_rows: LearningOutcomesApprovedInsertExecutorPlannedRowV1[];
  skipped_reasons: string[];
  post_insert_read_model?: LearningOutcomesReadModelV1;
  /**
   * False when at least one registry-backed row is selected for insert/plan; true when nothing selected.
   */
  owner_approval_required: boolean;
  data_mutation: boolean;
  proven_facts: string[];
  unknown_facts: string[];
};

function isMultipackStagedCandidate(c: EvidenceToLoImportCandidateV1): boolean {
  const sf = c.source_file.toLowerCase();
  if (sf.includes("multipack-conversion")) return true;
  const stub = c.proposed_learning_outcome.evidence_jsonb_stub;
  if (stub && typeof stub === "object" && !Array.isArray(stub) && "multipack" in stub) {
    return true;
  }
  return false;
}

function hasRegistryApprovalForCandidate(
  c: EvidenceToLoImportCandidateV1,
  loaded: LearningOutcomesConfidenceApprovalsLoadedV1,
): boolean {
  return loaded.valid_approvals.some((a) => candidateMatchesApproval(c, a));
}

function passesExecutorGuards(payload: LearningOutcomeInsertInput, c: EvidenceToLoImportCandidateV1): string | null {
  if (isMultipackStagedCandidate(c)) {
    return "Excluded: multipack staged evidence path (filename or evidence_jsonb_stub.multipack).";
  }
  if (payload.outcome !== "pass") return "Excluded: outcome must be pass.";
  if (payload.cta_status !== "live") return "Excluded: cta_status must be live.";
  if (!CONFIDENCE.has(payload.confidence)) return "Excluded: confidence must be exact|likely|uncertain.";
  if (!payload.candidate_url || !/^https:\/\//i.test(payload.candidate_url)) {
    return "Excluded: candidate_url must be present https URL.";
  }
  return null;
}

function findCandidateForPayload(
  fullCandidates: EvidenceToLoImportCandidateV1[],
  source_file: string,
  slug: string,
): EvidenceToLoImportCandidateV1 | undefined {
  return fullCandidates.find(
    (c) => c.source_file === source_file && c.proposed_learning_outcome.slug === slug,
  );
}

export type LearningOutcomesApprovedInsertExecutorDepsV1 = {
  insertLearningOutcome: (input: LearningOutcomeInsertInput) => Promise<void>;
  fetchReadModel: () => Promise<LearningOutcomesReadModelV1>;
};

/**
 * Owner-guarded learning_outcomes insert executor v1: at most one row, only when a writer-ready candidate
 * matches an explicit valid registry approval. Uses insertLearningOutcome only; no raw SQL.
 */
export async function runLearningOutcomesApprovedInsertExecutorV1(args: {
  mode: LearningOutcomesApprovedInsertExecutorModeV1;
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1;
  approvalsLoaded: LearningOutcomesConfidenceApprovalsLoadedV1;
  deps?: Partial<LearningOutcomesApprovedInsertExecutorDepsV1>;
}): Promise<LearningOutcomesApprovedInsertExecutorV1Report> {
  const unknown_facts: string[] = [];
  const skipped_reasons: string[] = [];
  const proven_facts: string[] = [
    "learning_outcomes_approved_insert_executor_v1 selects at most one row from writer-ready batch review that also matches a valid entry in data/ops/learning-outcomes-confidence-approvals.json (candidateMatchesApproval on source_file + slug or token).",
    "Inserts use insertLearningOutcome from scripts/lib/learning-outcomes-writer.ts only — no raw SQL in this executor.",
    "Default mode is DRY_RUN (no insertLearningOutcome call). Mutation requires mode MUTATE_APPROVED (CLI: --mutate-approved-learning-outcome).",
    "Multipack conversion-batch evidence paths and evidence_jsonb_stub.multipack rows are excluded from selection.",
    "Selection enforces outcome pass, cta live, and https candidate_url in addition to writer-ready classification — not shelf fit, revenue, buy readiness, or public publish approval.",
  ];

  if (args.approvalsLoaded.runtime_status !== "OK") {
    unknown_facts.push(
      `Confidence registry runtime_status is ${args.approvalsLoaded.runtime_status} — valid_approvals may be empty; selection requires registry rows that validate for matching candidates.`,
    );
  }

  const lookup = createConfidenceApprovalLookup(args.approvalsLoaded.valid_approvals);
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(args.evidenceImport, lookup);
  const fullCandidates =
    args.evidenceImport.candidates_evaluated_uncapped_v1 ?? args.evidenceImport.candidates;

  if (args.evidenceImport.contract === "evidence_to_learning_outcomes_candidate_import_v1") {
    if (review.source_writer_ready_count > WRITER_READY_REVIEW_CAP && review.rows.length < review.source_writer_ready_count) {
      unknown_facts.push(
        `Writer-ready review lists at most ${WRITER_READY_REVIEW_CAP} rows; ${review.source_writer_ready_count} writer_ready candidates exist — executor only considers review.rows ordering; additional rows are not evaluated in v1.`,
      );
    }
  }

  type Eligible = {
    source_file: string;
    slug: string;
    payload: LearningOutcomeInsertInput;
  };

  const eligibleOrdered: Eligible[] = [];

  for (const row of review.rows) {
    const slug = row.proposed_insert_payload.slug;
    const label = `${row.source_file}::${slug}`;
    const cand = findCandidateForPayload(fullCandidates, row.source_file, slug);

    if (!cand) {
      skipped_reasons.push(`${label}: internal skip — no matching evidence candidate for review row.`);
      continue;
    }

    if (!hasRegistryApprovalForCandidate(cand, args.approvalsLoaded)) {
      skipped_reasons.push(`${label}: skipped — no matching valid owner confidence registry approval for this candidate.`);
      continue;
    }

    const guard = passesExecutorGuards(row.proposed_insert_payload, cand);
    if (guard) {
      skipped_reasons.push(`${label}: ${guard}`);
      continue;
    }

    eligibleOrdered.push({
      source_file: row.source_file,
      slug,
      payload: row.proposed_insert_payload,
    });
  }

  const chosen = eligibleOrdered.slice(0, EXECUTOR_CAP);
  for (let i = EXECUTOR_CAP; i < eligibleOrdered.length; i++) {
    const e = eligibleOrdered[i];
    skipped_reasons.push(`${e.source_file}::${e.slug}: skipped — executor v1 cap (${EXECUTOR_CAP}) after higher-priority row.`);
  }

  const inserted_or_planned_rows: LearningOutcomesApprovedInsertExecutorPlannedRowV1[] = chosen.map((e) => ({
    source_file: e.source_file,
    slug: e.slug,
    part_number: e.payload.part_number,
    confidence: e.payload.confidence,
    outcome: "pass",
    cta_status: "live",
    owner_approval_required: false,
    why_would_insert: [
      "Classified writer_ready by learning_outcomes_insert_plan_v1 mapping (validateLearningOutcomeInput).",
      "Matched explicit owner confidence registry approval (valid_approvals) for this source_file + slug/token.",
      "Passed executor guards: outcome pass, cta live, https candidate_url, not multipack staged path.",
    ],
  }));

  const selected_count = inserted_or_planned_rows.length;

  let inserted_count = 0;
  let post_insert_read_model: LearningOutcomesReadModelV1 | undefined;

  const insertFn =
    args.deps?.insertLearningOutcome ??
    (async (input: LearningOutcomeInsertInput) => {
      const { insertLearningOutcome } = await import("./learning-outcomes-writer");
      await insertLearningOutcome(input);
    });

  const readFn =
    args.deps?.fetchReadModel ??
    (async () => {
      const { fetchLearningOutcomesReadModelV1FromSupabase } = await import("./learning-outcomes-read-model-v1");
      return fetchLearningOutcomesReadModelV1FromSupabase();
    });

  if (args.mode === "MUTATE_APPROVED") {
    if (chosen.length > 0) {
      try {
        await insertFn(chosen[0].payload);
        inserted_count = 1;
      } catch (e) {
        unknown_facts.push(`insertLearningOutcome failed: ${e instanceof Error ? e.message : String(e)}`);
        inserted_count = 0;
      }
    }
    post_insert_read_model = await readFn();
  }

  const data_mutation = args.mode === "MUTATE_APPROVED" && inserted_count > 0;
  const owner_approval_required = selected_count === 0;

  return {
    contract: "learning_outcomes_approved_insert_executor_v1",
    mode: args.mode,
    selected_count,
    inserted_count,
    skipped_count: skipped_reasons.length,
    inserted_or_planned_rows,
    skipped_reasons,
    ...(args.mode === "MUTATE_APPROVED" ? { post_insert_read_model } : {}),
    owner_approval_required,
    data_mutation,
    proven_facts,
    unknown_facts,
  };
}
