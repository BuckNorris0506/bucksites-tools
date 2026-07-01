import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesReadModelV1,
} from "./buckparts-command-center-v2-types";
import { candidateMatchesApproval, createConfidenceApprovalLookup } from "./learning-outcomes-confidence-approvals-registry-v1";
import { buildLearningOutcomesWriterReadyBatchReviewV1 } from "./learning-outcomes-insert-plan-v1";
import type { LearningOutcomeInsertInput } from "./learning-outcomes-writer";
import type { LearningOutcomesInsertApplyStatusV1 } from "./learning-outcomes-insert-run-v1";
import { runLearningOutcomesGatedInsertV1 } from "./learning-outcomes-insert-run-v1";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";

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
  apply_status?: LearningOutcomesInsertApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
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
export type ApprovedInsertExecutorChosenRowV1 = {
  source_file: string;
  slug: string;
  payload: LearningOutcomeInsertInput;
};

export type ApprovedInsertExecutorSelectionV1 = {
  selected_count: number;
  chosen: ApprovedInsertExecutorChosenRowV1[];
  skipped_reasons: string[];
  unknown_facts: string[];
};

/**
 * Sync selection logic shared with dry-run / scorecard (no Supabase; no insertLearningOutcome).
 */
export function computeApprovedInsertExecutorSelectionV1(
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1,
  approvalsLoaded: LearningOutcomesConfidenceApprovalsLoadedV1,
): ApprovedInsertExecutorSelectionV1 {
  const unknown_facts: string[] = [];
  const skipped_reasons: string[] = [];

  if (approvalsLoaded.runtime_status !== "OK") {
    unknown_facts.push(
      `Confidence registry runtime_status is ${approvalsLoaded.runtime_status} — valid_approvals may be empty; selection requires registry rows that validate for matching candidates.`,
    );
  }

  const lookup = createConfidenceApprovalLookup(approvalsLoaded.valid_approvals);
  const review = buildLearningOutcomesWriterReadyBatchReviewV1(evidenceImport, lookup);
  const fullCandidates = evidenceImport.candidates_evaluated_uncapped_v1 ?? evidenceImport.candidates;

  if (evidenceImport.contract === "evidence_to_learning_outcomes_candidate_import_v1") {
    if (review.source_writer_ready_count > WRITER_READY_REVIEW_CAP && review.rows.length < review.source_writer_ready_count) {
      unknown_facts.push(
        `Writer-ready review lists at most ${WRITER_READY_REVIEW_CAP} rows; ${review.source_writer_ready_count} writer_ready candidates exist — executor only considers review.rows ordering; additional rows are not evaluated in v1.`,
      );
    }
  }

  const eligibleOrdered: ApprovedInsertExecutorChosenRowV1[] = [];

  for (const row of review.rows) {
    const slug = row.proposed_insert_payload.slug;
    const label = `${row.source_file}::${slug}`;
    const cand = findCandidateForPayload(fullCandidates, row.source_file, slug);

    if (!cand) {
      skipped_reasons.push(`${label}: internal skip — no matching evidence candidate for review row.`);
      continue;
    }

    if (!hasRegistryApprovalForCandidate(cand, approvalsLoaded)) {
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

  return {
    selected_count: chosen.length,
    chosen,
    skipped_reasons,
    unknown_facts,
  };
}

export async function runLearningOutcomesApprovedInsertExecutorV1(args: {
  mode: LearningOutcomesApprovedInsertExecutorModeV1;
  evidenceImport: EvidenceToLearningOutcomesCandidateImportV1;
  approvalsLoaded: LearningOutcomesConfidenceApprovalsLoadedV1;
  rootDir?: string;
  io_capability?: BuckpartsIoCapabilityV1;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  deps?: Partial<LearningOutcomesApprovedInsertExecutorDepsV1>;
}): Promise<LearningOutcomesApprovedInsertExecutorV1Report> {
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [
    "learning_outcomes_approved_insert_executor_v1 selects at most one row from writer-ready batch review that also matches a valid entry in data/ops/learning-outcomes-confidence-approvals.json (candidateMatchesApproval on source_file + slug or token).",
    "Inserts use performInsertLearningOutcomeV1 from scripts/lib/learning-outcomes-insert-run-v1.ts (gated) — no raw SQL in this executor.",
    "Default mode is DRY_RUN (no insertLearningOutcome call). Mutation requires mode MUTATE_APPROVED (CLI: --mutate-approved-learning-outcome).",
    "Multipack conversion-batch evidence paths and evidence_jsonb_stub.multipack rows are excluded from selection.",
    "Selection enforces outcome pass, cta live, and https candidate_url in addition to writer-ready classification — not shelf fit, revenue, buy readiness, or public publish approval.",
  ];

  const selection = computeApprovedInsertExecutorSelectionV1(args.evidenceImport, args.approvalsLoaded);
  unknown_facts.push(...selection.unknown_facts);
  const skipped_reasons = selection.skipped_reasons;
  const chosen = selection.chosen;

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

  const readFn =
    args.deps?.fetchReadModel ??
    (async () => {
      const { fetchLearningOutcomesReadModelV1FromSupabase } = await import("./learning-outcomes-read-model-v1");
      return fetchLearningOutcomesReadModelV1FromSupabase();
    });

  let apply_status: LearningOutcomesInsertApplyStatusV1 | undefined;
  let mutation_authorized: boolean | undefined;
  let mutation_preflight_blockers: string[] | undefined;
  let founder_decision_id: string | null | undefined;

  if (args.mode === "MUTATE_APPROVED") {
    const rootDir = args.rootDir ?? process.cwd();
    const gated = await runLearningOutcomesGatedInsertV1({
      rootDir,
      writeIntent: true,
      input: chosen.length > 0 ? chosen[0].payload : null,
      evidenceSourceRel: chosen.length > 0 ? chosen[0].source_file : null,
      io_capability: args.io_capability,
      founderRows: args.founderRows,
      deps: args.deps?.insertLearningOutcome
        ? { performInsert: args.deps.insertLearningOutcome }
        : undefined,
    });
    inserted_count = gated.inserted_count;
    apply_status = gated.apply_status;
    mutation_authorized = gated.mutation_authorized;
    mutation_preflight_blockers = gated.mutation_preflight_blockers;
    founder_decision_id = gated.founder_decision_id;
    if (gated.apply_status === "BLOCKED" && gated.mutation_preflight_blockers.length > 0) {
      unknown_facts.push(
        `mutation gate blocked: ${gated.mutation_preflight_blockers.join(", ")}`,
      );
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
    ...(args.mode === "MUTATE_APPROVED"
      ? {
          post_insert_read_model,
          apply_status,
          mutation_authorized,
          mutation_preflight_blockers,
          founder_decision_id,
        }
      : {}),
    owner_approval_required,
    data_mutation,
    proven_facts,
    unknown_facts,
  };
}
