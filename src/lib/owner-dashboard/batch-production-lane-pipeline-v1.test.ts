import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1 } from "./batch-production-non-amazon-pdp-source-v1";
import {
  BATCH_PLANNING_DRAFT_AWAITING_AGENT_FACTS_V1,
  resolveBatchDraftReviewForOwnerApprovalV1,
} from "./batch-production-lane-pipeline-v1";
import { buildBatchOwnerApprovalChecklistMarkdownV1 } from "./batch-owner-approval-v1";

const REPO_ROOT = process.cwd();

const NON_AMAZON_ROW_IDS = [
  "da97-08006b",
  "da97-15217d",
  "da29-00012b",
  "adq75795101",
  "rpwfe",
] as const;

const DEPS = {
  readTextFile: (p: string) => readFileSync(p, "utf8"),
  listEvidenceFilenames: (dir: string) => {
    try {
      return readdirSync(dir);
    } catch {
      return [];
    }
  },
};

test("resolve planning draft from non-amazon source yields 5 rows without manual JSON", () => {
  const { draftReview, from_planning_seed, artifacts } = resolveBatchDraftReviewForOwnerApprovalV1({
    source: BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
    repoRoot: REPO_ROOT,
    deps: DEPS,
    generated_at: "2026-05-17T12:00:00.000Z",
  });

  assert.equal(from_planning_seed, true);
  assert.equal(draftReview.rows.length, 5);
  assert.equal(artifacts.capture_packet.may_mutate, false);
  assert.equal(artifacts.capture_packet.packet_row_count, 5);

  for (const row_id of NON_AMAZON_ROW_IDS) {
    const row = draftReview.rows.find((r) => r.row_id === row_id);
    assert.ok(row, row_id);
    assert.equal(row.draft_ready_for_owner_review, false);
    assert.equal(row.may_mutate, false);
    assert.equal(row.may_write_production_evidence, false);
    assert.ok(row.planning_review_candidate_url?.startsWith("http"));
    assert.deepEqual(row.missing_owner_facts, [BATCH_PLANNING_DRAFT_AWAITING_AGENT_FACTS_V1]);
  }
});

test("planning checklist markdown includes 5 cohort rows and no mutation authority", () => {
  const { draftReview } = resolveBatchDraftReviewForOwnerApprovalV1({
    source: BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
    repoRoot: REPO_ROOT,
    deps: DEPS,
    generated_at: "2026-05-17T12:00:00.000Z",
  });

  const md = buildBatchOwnerApprovalChecklistMarkdownV1(draftReview, {
    include_planning_cohort_rows: true,
  });

  assert.equal((md.match(/^## [a-z0-9-]+ -/gm) ?? []).length, 5);
  assert.match(md, /may_mutate.*false/);
  assert.match(md, /does \*\*not\*\* authorize Supabase/);
  assert.match(md, /rejected at compile/);
  assert.match(md, /Awaiting agent facts: \*\*5\*\*/);
  assert.match(md, /Blocked \/ not owner-review-ready: \*\*0\*\*/);
  for (const row_id of NON_AMAZON_ROW_IDS) {
    assert.match(md, new RegExp(row_id));
  }
});
