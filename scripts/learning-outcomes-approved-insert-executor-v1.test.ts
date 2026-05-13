import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvidenceToLearningOutcomesCandidateImportV1,
  EvidenceToLoImportCandidateV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesReadModelV1,
} from "./lib/buckparts-command-center-v2-types";
import type { LearningOutcomeInsertInput } from "./lib/learning-outcomes-writer";
import {
  runLearningOutcomesApprovedInsertExecutorV1,
  type LearningOutcomesApprovedInsertExecutorV1Report,
} from "./lib/learning-outcomes-approved-insert-executor-v1";

function baseImport(candidates: EvidenceToLoImportCandidateV1[]): EvidenceToLearningOutcomesCandidateImportV1 {
  return {
    contract: "evidence_to_learning_outcomes_candidate_import_v1",
    runtime_status: "OK",
    scanned_file_count: 1,
    parseable_file_count: 1,
    candidate_count: candidates.length,
    rejected_count: 0,
    candidates,
    candidates_evaluated_uncapped_v1: candidates,
    rejected_samples: [],
    proven_facts: [],
    unknown_facts: [],
    owner_approval_required: true,
    data_mutation: false,
  };
}

function liveWriterCand(args: {
  source_file: string;
  slug: string;
  candidate_url: string;
  confidence: "exact" | "likely" | "uncertain" | null;
  stub?: Record<string, unknown>;
  cta_status?: "live" | "not_live" | "blocked";
}): EvidenceToLoImportCandidateV1 {
  const cta = args.cta_status ?? "live";
  const missing = args.confidence === null ? (["confidence"] as const) : ([] as const);
  return {
    source_file: args.source_file,
    proposed_learning_outcome: {
      slug: args.slug,
      part_number: args.slug.toUpperCase(),
      model_number: null,
      candidate_url: args.candidate_url,
      retailer: "amazon",
      outcome: "pass",
      reason: "Fixture.",
      reason_detail: null,
      confidence: args.confidence,
      cta_status: cta,
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: args.stub ?? { fixture: true },
    },
    mapping_basis: [],
    missing_or_unknown_fields: [...missing],
    owner_approval_required: true,
  };
}

function loadedRegistry(
  valid: LearningOutcomesConfidenceApprovalsLoadedV1["valid_approvals"],
): LearningOutcomesConfidenceApprovalsLoadedV1 {
  return {
    registry_relative_path: "data/ops/learning-outcomes-confidence-approvals.json",
    runtime_status: "OK",
    valid_approvals: valid,
    invalid_entries: [],
    proven_facts: [],
    unknown_facts: [],
  };
}

function assertExecutorNoBannedClaims(r: LearningOutcomesApprovedInsertExecutorV1Report) {
  const blob = JSON.stringify(r);
  assert.ok(!/\bbuy[-\s]?ready\b/i.test(blob));
  assert.ok(!/\bfit\s+proof\b/i.test(blob));
  assert.ok(!/\brevenue\s+proof\b/i.test(blob));
  assert.ok(!/public\s+cta\s+approval/i.test(blob));
}

test("approved insert executor dry-run does not call insertLearningOutcome", async () => {
  const sf = "data/evidence/exec-dry-live-outcome.json";
  const slug = "dryslug1";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "https://www.amazon.com/dp/B00DRY099",
    confidence: null,
  });
  const loaded = loadedRegistry([
    {
      source_file: sf,
      slug,
      confidence: "exact",
      approved_by_owner: true,
      approval_reason: "Fixture dry run.",
    },
  ]);
  let calls = 0;
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loaded,
    deps: {
      insertLearningOutcome: async () => {
        calls += 1;
      },
      fetchReadModel: async () => {
        throw new Error("read model should not run in dry-run");
      },
    },
  });
  assert.equal(calls, 0);
  assert.equal(report.mode, "DRY_RUN");
  assert.equal(report.data_mutation, false);
  assert.equal(report.selected_count, 1);
  assert.equal(report.inserted_count, 0);
  assert.equal(report.inserted_or_planned_rows.length, 1);
  assert.ok(!("post_insert_read_model" in report));
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor mutate calls insertLearningOutcome exactly once when one approved row exists", async () => {
  const sf = "data/evidence/exec-mut-live-outcome.json";
  const slug = "mutslug1";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "https://www.amazon.com/dp/B00MUT099",
    confidence: null,
  });
  const loaded = loadedRegistry([
    {
      source_file: sf,
      slug,
      confidence: "likely",
      approved_by_owner: true,
      approval_reason: "Fixture mutate.",
    },
  ]);
  const payloads: LearningOutcomeInsertInput[] = [];
  const stubRead: LearningOutcomesReadModelV1 = {
    contract: "learning_outcomes_read_model_v1",
    runtime_status: "OK",
    total_outcomes: 1,
    recent_outcomes: 1,
    recent_window_days: 30,
    by_outcome: { pass: 1, fail: 0, blocked: 0, unknown: 0 },
    by_confidence: { exact: 0, likely: 1, uncertain: 0, unset: 0 },
    by_cta_status: { live: 1, not_live: 0, blocked: 0, unset: 0 },
    latest_outcomes: [],
    proven_facts: [],
    unknown_facts: [],
  };
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "MUTATE_APPROVED",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loaded,
    deps: {
      insertLearningOutcome: async (input) => {
        payloads.push(input);
      },
      fetchReadModel: async () => stubRead,
    },
  });
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].slug, slug);
  assert.equal(payloads[0].confidence, "likely");
  assert.equal(report.inserted_count, 1);
  assert.equal(report.data_mutation, true);
  assert.deepEqual(report.post_insert_read_model, stubRead);
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor skips rows without registry approval", async () => {
  const sf = "data/evidence/exec-noreg-live-outcome.json";
  const cand = liveWriterCand({
    source_file: sf,
    slug: "noreg",
    candidate_url: "https://www.amazon.com/dp/B00NOREG99",
    confidence: "exact",
  });
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([]),
    deps: {
      insertLearningOutcome: async () => assert.fail("no insert"),
      fetchReadModel: async () => assert.fail("no read"),
    },
  });
  assert.equal(report.selected_count, 0);
  assert.ok(report.skipped_reasons.some((s) => /no matching valid owner confidence registry/i.test(s)));
  assert.equal(report.owner_approval_required, true);
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor skips multipack staged rows", async () => {
  const sf = "data/evidence/stub-multipack-live-outcome.json";
  const slug = "mp1";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "https://www.amazon.com/dp/B00MP099",
    confidence: null,
    stub: { multipack: true },
  });
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([
      {
        source_file: sf,
        slug,
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "Should not apply to multipack path.",
      },
    ]),
    deps: {
      insertLearningOutcome: async () => assert.fail("no insert"),
      fetchReadModel: async () => assert.fail("no read"),
    },
  });
  assert.equal(report.selected_count, 0);
  assert.ok(report.skipped_reasons.some((s) => /multipack staged/i.test(s)));
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor skips non-https candidate_url", async () => {
  const sf = "data/evidence/exec-http-live-outcome.json";
  const slug = "httpbad";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "http://www.amazon.com/dp/B00HTTP99",
    confidence: null,
  });
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([
      {
        source_file: sf,
        slug,
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "Fixture.",
      },
    ]),
    deps: {
      insertLearningOutcome: async () => assert.fail("no insert"),
      fetchReadModel: async () => assert.fail("no read"),
    },
  });
  assert.equal(report.selected_count, 0);
  assert.ok(report.skipped_reasons.some((s) => /https URL/i.test(s)));
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor DRY_RUN never invokes insert even when a row is selected", async () => {
  const sf = "data/evidence/exec-noinsert-live-outcome.json";
  const slug = "noinsert1";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "https://www.amazon.com/dp/B00NINS99",
    confidence: null,
  });
  let calls = 0;
  await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([
      {
        source_file: sf,
        slug,
        confidence: "uncertain",
        approved_by_owner: true,
        approval_reason: "x",
      },
    ]),
    deps: {
      insertLearningOutcome: async () => {
        calls += 1;
      },
    },
  });
  assert.equal(calls, 0);
});

test("approved insert executor caps to one insert when two registry-approved writer-ready rows exist", async () => {
  const mk = (slug: string, sf: string) =>
    liveWriterCand({
      source_file: sf,
      slug,
      candidate_url: "https://www.amazon.com/dp/B00CAP2ROW",
      confidence: null,
    });
  const a = mk("capfirst", "data/evidence/exec-cap-a-live-outcome.json");
  const b = mk("capsecond", "data/evidence/exec-cap-b-live-outcome.json");
  const loaded = loadedRegistry([
    {
      source_file: a.source_file,
      slug: "capfirst",
      confidence: "exact",
      approved_by_owner: true,
      approval_reason: "a",
    },
    {
      source_file: b.source_file,
      slug: "capsecond",
      confidence: "exact",
      approved_by_owner: true,
      approval_reason: "b",
    },
  ]);
  const payloads: unknown[] = [];
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "MUTATE_APPROVED",
    evidenceImport: baseImport([a, b]),
    approvalsLoaded: loaded,
    deps: {
      insertLearningOutcome: async (input) => {
        payloads.push(input);
      },
      fetchReadModel: async () =>
        ({
          contract: "learning_outcomes_read_model_v1",
          runtime_status: "OK",
          total_outcomes: 2,
          recent_outcomes: 2,
          recent_window_days: 30,
          by_outcome: { pass: 2, fail: 0, blocked: 0, unknown: 0 },
          by_confidence: { exact: 2, likely: 0, uncertain: 0, unset: 0 },
          by_cta_status: { live: 2, not_live: 0, blocked: 0, unset: 0 },
          latest_outcomes: [],
          proven_facts: [],
          unknown_facts: [],
        }) satisfies LearningOutcomesReadModelV1,
    },
  });
  assert.equal(payloads.length, 1);
  assert.equal(report.inserted_count, 1);
  assert.equal(report.selected_count, 1);
  assert.ok(report.skipped_reasons.some((s) => /executor v1 cap/i.test(s)));
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor skips not_live cta rows", async () => {
  const sf = "data/evidence/exec-notlive-live-outcome.json";
  const slug = "notlive1";
  const cand = liveWriterCand({
    source_file: sf,
    slug,
    candidate_url: "https://www.amazon.com/dp/B00NTL99",
    confidence: "exact",
    cta_status: "not_live",
  });
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([
      {
        source_file: sf,
        slug,
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "Registry cannot bypass live CTA guard.",
      },
    ]),
    deps: {
      insertLearningOutcome: async () => assert.fail("no insert"),
      fetchReadModel: async () => assert.fail("no read"),
    },
  });
  assert.equal(report.selected_count, 0);
  assert.ok(report.skipped_reasons.some((s) => /cta_status must be live/i.test(s)));
  assertExecutorNoBannedClaims(report);
});

test("approved insert executor skips unknown outcome even if registry lists slug", async () => {
  const sf = "data/evidence/exec-unknown-live-outcome.json";
  const slug = "unkout";
  const cand: EvidenceToLoImportCandidateV1 = {
    source_file: sf,
    proposed_learning_outcome: {
      slug,
      part_number: "U",
      model_number: null,
      candidate_url: "https://www.amazon.com/dp/B00UNK099",
      retailer: "amazon",
      outcome: "unknown",
      reason: "Unknown fixture.",
      reason_detail: null,
      confidence: null,
      cta_status: "live",
      index_status: null,
      date_checked: "2026-05-10T12:00:00.000Z",
      next_action: null,
      evidence_jsonb_stub: { u: 1 },
    },
    mapping_basis: [],
    missing_or_unknown_fields: ["confidence"],
    owner_approval_required: true,
  };
  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: "DRY_RUN",
    evidenceImport: baseImport([cand]),
    approvalsLoaded: loadedRegistry([
      {
        source_file: sf,
        slug,
        confidence: "exact",
        approved_by_owner: true,
        approval_reason: "Registry alone must not elevate unknown outcome.",
      },
    ]),
    deps: {
      insertLearningOutcome: async () => assert.fail("no insert"),
      fetchReadModel: async () => assert.fail("no read"),
    },
  });
  assert.equal(report.selected_count, 0);
  assert.equal(report.inserted_or_planned_rows.length, 0);
  assertExecutorNoBannedClaims(report);
});
