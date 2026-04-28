import { loadEnv } from "./load-env";
import { getSupabaseAdmin } from "./supabase-admin";

const OUTCOMES = new Set(["pass", "fail", "blocked", "unknown"]);
const CONFIDENCE = new Set(["exact", "likely", "uncertain"]);
const CTA_STATUS = new Set(["live", "not_live", "blocked"]);

export type LearningOutcomeInsertInput = {
  slug: string;
  part_number: string | null;
  model_number: string | null;
  candidate_url: string | null;
  outcome: "pass" | "fail" | "blocked" | "unknown";
  reason: string;
  reason_detail: string | null;
  evidence: Record<string, any>;
  confidence: "exact" | "likely" | "uncertain";
  cta_status: "live" | "not_live" | "blocked";
  index_status: string | null;
  date_checked?: string;
};

type WriterDeps = {
  now?: () => Date;
  supabase?: {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateLearningOutcomeInput(
  input: unknown,
): asserts input is LearningOutcomeInsertInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("learning_outcome input must be an object");
  }
  const value = input as Record<string, unknown>;

  if (!OUTCOMES.has(String(value.outcome ?? ""))) {
    throw new Error("outcome is required and must be pass|fail|blocked|unknown");
  }
  if (!isNonEmptyString(value.slug)) {
    throw new Error("slug is required");
  }
  if (!isNonEmptyString(value.reason)) {
    throw new Error("reason is required");
  }
  if (!CONFIDENCE.has(String(value.confidence ?? ""))) {
    throw new Error("confidence is required and must be exact|likely|uncertain");
  }
  if (!CTA_STATUS.has(String(value.cta_status ?? ""))) {
    throw new Error("cta_status is required and must be live|not_live|blocked");
  }

  if (!isNullableString(value.part_number)) throw new Error("part_number must be string|null");
  if (!isNullableString(value.model_number)) throw new Error("model_number must be string|null");
  if (!isNullableString(value.candidate_url)) throw new Error("candidate_url must be string|null");
  if (!isNullableString(value.reason_detail)) throw new Error("reason_detail must be string|null");
  if (!isNullableString(value.index_status)) throw new Error("index_status must be string|null");
  if (
    typeof value.evidence !== "object" ||
    value.evidence === null ||
    Array.isArray(value.evidence)
  ) {
    throw new Error("evidence must be a non-null object");
  }
  if (value.date_checked !== undefined && !isValidDateString(value.date_checked)) {
    throw new Error("date_checked must be a valid ISO date string when provided");
  }
}

export async function insertLearningOutcome(
  input: LearningOutcomeInsertInput,
  deps: WriterDeps = {},
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
