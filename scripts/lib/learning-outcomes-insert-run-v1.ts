/**
 * Learning outcomes insert — run orchestration with truth-ledger outcome recording.
 */

import { loadEnv } from "./load-env";
import { getSupabaseAdmin } from "./supabase-admin";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildLearningOutcomesMutationPreflightV1,
  LEARNING_OUTCOMES_MUTATION_GATE_REF_V1,
  LEARNING_OUTCOMES_MUTATION_LANE_V1,
  learningOutcomesMutationAuthorizedV1,
  type LearningOutcomesMutationPreflightV1,
} from "./learning-outcomes-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";
import {
  validateLearningOutcomeInput,
  type LearningOutcomeInsertInput,
} from "./learning-outcomes-writer";

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = LEARNING_OUTCOMES_MUTATION_GATE_REF_V1;
void mutationGateRef;

const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

export type LearningOutcomesInsertApplyStatusV1 = "BLOCKED" | "APPLIED";

export type LearningOutcomesGatedInsertResultV1 = {
  inserted_count: 0 | 1;
  apply_status: LearningOutcomesInsertApplyStatusV1;
  mutation_authorized: boolean;
  mutation_preflight_blockers: string[];
  founder_decision_id: string | null;
};

export type LearningOutcomesInsertDepsV1 = {
  now?: () => Date;
  performInsert?: (input: LearningOutcomeInsertInput) => Promise<void>;
  supabase?: {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function performInsertLearningOutcomeV1(
  input: LearningOutcomeInsertInput,
  deps: LearningOutcomesInsertDepsV1 = {},
): Promise<void> {
  validateLearningOutcomeInput(input);

  const now = deps.now ?? (() => new Date());
  const supabase =
    deps.supabase ??
    (() => {
      loadEnv();
      return getSupabaseAdmin();
    })();

  const payload: Record<string, unknown> = {
    slug: input.slug,
    part_number: input.part_number,
    model_number: input.model_number,
    candidate_url: input.candidate_url,
    outcome: input.outcome,
    reason: input.reason,
    reason_detail: input.reason_detail,
    evidence: input.evidence,
    confidence: input.confidence,
    cta_status: input.cta_status,
    index_status: input.index_status,
    date_checked: input.date_checked ?? now().toISOString(),
  };

  const { error } = await supabase.from("learning_outcomes").insert(payload);
  if (error) {
    throw new Error(`failed to insert learning_outcomes: ${error.message}`);
  }
}

export async function runLearningOutcomesGatedInsertV1(args: {
  rootDir: string;
  writeIntent: boolean;
  input: LearningOutcomeInsertInput | null;
  evidenceSourceRel: string | null;
  io_capability?: BuckpartsIoCapabilityV1;
  now?: () => Date;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  fileExists?: (abs: string) => boolean;
  deps?: LearningOutcomesInsertDepsV1;
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
}): Promise<LearningOutcomesGatedInsertResultV1> {
  if (!args.writeIntent) {
    return {
      inserted_count: 0,
      apply_status: "APPLIED",
      mutation_authorized: false,
      mutation_preflight_blockers: [],
      founder_decision_id: null,
    };
  }

  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;
  const preflight: LearningOutcomesMutationPreflightV1 = buildLearningOutcomesMutationPreflightV1({
    rootDir: args.rootDir,
    mode: "write",
    evidenceSourceRel: args.evidenceSourceRel,
    io_capability: args.io_capability,
    now: args.now,
    readText: args.readText,
    founderRows: args.founderRows,
    fileExists: args.fileExists,
  });
  const mutation_authorized = learningOutcomesMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  let inserted_count: 0 | 1 = 0;
  if (mutation_authorized && args.input != null) {
    try {
      if (args.deps?.performInsert) {
        await args.deps.performInsert(args.input);
      } else {
        await performInsertLearningOutcomeV1(args.input, args.deps);
      }
      inserted_count = 1;
    } catch (e) {
      blockers.push(
        `insert_failed:${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  let apply_status: LearningOutcomesInsertApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: LEARNING_OUTCOMES_MUTATION_LANE_V1,
    founder_decision_id: preflight.founder_decision_id,
    apply_outcome: applyOutcome,
    blockers,
    now: args.now,
  });
  if (!record.ok) {
    blockers.push(...record.blockers);
    apply_status = "BLOCKED";
  }

  return {
    inserted_count: apply_status === "BLOCKED" ? 0 : inserted_count,
    apply_status,
    mutation_authorized: mutation_authorized && apply_status === "APPLIED",
    mutation_preflight_blockers: blockers,
    founder_decision_id: preflight.founder_decision_id,
  };
}
