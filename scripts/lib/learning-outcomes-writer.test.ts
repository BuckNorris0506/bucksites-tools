import assert from "node:assert/strict";
import test from "node:test";

import {
  insertLearningOutcome,
  validateLearningOutcomeInput,
} from "./learning-outcomes-writer";

function validInput() {
  return {
    slug: "mwf-replacement-filter",
    part_number: "MWF",
    model_number: "GSS25GSHSS",
    candidate_url: "https://example.com/product/mwf",
    outcome: "pass" as const,
    reason: "browser truth confirms direct buyable listing",
    reason_detail: null,
    evidence: { verifier_class: "direct_buyable" },
    confidence: "exact" as const,
    cta_status: "live" as const,
    index_status: null,
  };
}

test("valid insert payload passes validation", () => {
  assert.doesNotThrow(() => validateLearningOutcomeInput(validInput()));
});

test("missing required fields fails", () => {
  const input = { ...validInput(), reason: "" };
  assert.throws(() => validateLearningOutcomeInput(input), /reason is required/);
});

test("slug is required", () => {
  const input = { ...validInput(), slug: "" };
  assert.throws(() => validateLearningOutcomeInput(input), /slug is required/);
});

test("invalid enum values fail", () => {
  const input = { ...validInput(), confidence: "unknown" };
  assert.throws(
    () => validateLearningOutcomeInput(input),
    /confidence is required and must be exact\|likely\|uncertain/,
  );
});

test("date defaults to now when missing", async () => {
  let inserted: Record<string, unknown> | null = null;
  const fixedNow = new Date("2026-04-28T12:00:00.000Z");
  const mockSupabase = {
    from: (_table: string) => ({
      insert: async (payload: Record<string, unknown>) => {
        inserted = payload;
        return { error: null };
      },
    }),
  };

  await insertLearningOutcome(validInput(), {
    now: () => fixedNow,
    supabase: mockSupabase,
  });

  assert.equal(inserted?.date_checked, "2026-04-28T12:00:00.000Z");
});

test("insert function calls supabase with correct payload shape (mock client)", async () => {
  let tableName: string | null = null;
  let inserted: Record<string, unknown> | null = null;
  const mockSupabase = {
    from: (table: string) => {
      tableName = table;
      return {
        insert: async (payload: Record<string, unknown>) => {
          inserted = payload;
          return { error: null };
        },
      };
    },
  };

  const input = validInput();
  await insertLearningOutcome(input, { supabase: mockSupabase });

  assert.equal(tableName, "learning_outcomes");
  assert.equal(inserted?.outcome, input.outcome);
  assert.equal(inserted?.slug, input.slug);
  assert.equal(inserted?.reason, input.reason);
  assert.equal(inserted?.confidence, input.confidence);
  assert.equal(inserted?.cta_status, input.cta_status);
  assert.equal(typeof inserted?.date_checked, "string");
});
