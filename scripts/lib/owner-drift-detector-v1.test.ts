import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildOwnerDriftExecutionContextV1,
  classifyOwnerDriftIdeaV1,
  isOwnerDriftHarmfulIdeaV1,
  isOwnerDriftSideToolIdeaV1,
  isOwnerDriftVagueIdeaV1,
  OWNER_DRIFT_DETECTOR_CONTRACT_V1,
  OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
  OWNER_DRIFT_DETECTOR_SELF_IDEA_V1,
  type OwnerDriftExecutionContextV1,
} from "./owner-drift-detector-v1";

const REPO_ROOT = process.cwd();
const GENERATED_AT = "2026-05-31T12:00:00.000Z";

const REPORT_SCRIPT_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/report-owner-drift-detector-v1.ts"),
  "utf8",
);

const LIB_SOURCE = readFileSync(
  path.join(REPO_ROOT, "scripts/lib/owner-drift-detector-v1.ts"),
  "utf8",
);

function openFridgeContext(
  partial: Partial<OwnerDriftExecutionContextV1> = {},
): OwnerDriftExecutionContextV1 {
  return {
    next_best_action: "npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts",
    fridge_batch_proposal_open: true,
    fridge_proposed_row_count: 14,
    fridge_owner_approval_required: true,
    fridge_formal_batch_exists: false,
    fridge_proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-test",
    fridge_owner_review_ready_count: 14,
    batch_dispatch_status: "OWNER_REVIEW_REQUIRED",
    batch_dispatch_selected_subsystem: "apply_plan_owner_review",
    any_cc_lane_mutation_authorized: false,
    brain_connected_count: 40,
    ...partial,
  };
}

function closedContext(): OwnerDriftExecutionContextV1 {
  return openFridgeContext({
    fridge_batch_proposal_open: false,
    fridge_proposed_row_count: 0,
    fridge_owner_approval_required: false,
    fridge_proposed_batch_id: null,
    fridge_owner_review_ready_count: 0,
  });
}

test("owner drift detector report is read-only", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
    GENERATED_AT,
  );
  assert.equal(report.contract, OWNER_DRIFT_DETECTOR_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
});

test("sources avoid forbidden write/mutation imports", () => {
  for (const source of [REPORT_SCRIPT_SOURCE, LIB_SOURCE]) {
    assert.ok(!source.includes("writeFileSync"));
    assert.ok(!source.includes("mkdirSync"));
    assert.ok(!/from ["'].*supabase/i.test(source));
    assert.ok(!source.includes("@netlify"));
  }
});

test("FINISH_CURRENT_FIRST: vault idea with open fridge batch proposal", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
    GENERATED_AT,
  );
  assert.equal(report.decision, "FINISH_CURRENT_FIRST");
  assert.ok(isOwnerDriftSideToolIdeaV1(report.idea));
  assert.ok(report.must_finish_first.some((item) => item.includes("fridge_buyer_path_batch_proposal_v1")));
  assert.equal(report.mutation_authorized, false);
});

test("INSTALL_NOW_FOUNDATION: drift detector self idea", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    OWNER_DRIFT_DETECTOR_SELF_IDEA_V1,
    GENERATED_AT,
  );
  assert.equal(report.decision, "INSTALL_NOW_FOUNDATION");
  assert.equal(report.mutation_authorized, false);
});

test("QUEUE_FOR_LATER: useful wedge idea while batch loop open", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    "Expand vacuum bags research wedge with read-only OEM evidence packet.",
    GENERATED_AT,
  );
  assert.equal(report.decision, "QUEUE_FOR_LATER");
});

test("QUEUE_FOR_LATER: side tool when no open batch loop", () => {
  const report = classifyOwnerDriftIdeaV1(
    closedContext(),
    OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
    GENERATED_AT,
  );
  assert.equal(report.decision, "QUEUE_FOR_LATER");
});

test("REJECT_HARMFUL: bypass owner approval idea", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    "Bypass owner approval and force CSV apply for all fridge slugs tonight.",
    GENERATED_AT,
  );
  assert.equal(report.decision, "REJECT_HARMFUL");
  assert.ok(isOwnerDriftHarmfulIdeaV1(report.idea));
});

test("UNKNOWN_NEEDS_PROOF: vague idea", () => {
  const report = classifyOwnerDriftIdeaV1(closedContext(), "maybe something cool", GENERATED_AT);
  assert.equal(report.decision, "UNKNOWN_NEEDS_PROOF");
  assert.ok(isOwnerDriftVagueIdeaV1(report.idea));
});

test("FINISH_CURRENT_FIRST: unrelated build while batch proposal open", () => {
  const report = classifyOwnerDriftIdeaV1(
    openFridgeContext(),
    "Build a new React admin dashboard for affiliate analytics.",
    GENERATED_AT,
  );
  assert.equal(report.decision, "FINISH_CURRENT_FIRST");
});

test("buildOwnerDriftExecutionContextV1 detects open proposal from lane inputs", () => {
  const context = buildOwnerDriftExecutionContextV1({
    next_best_action: "fixture",
    fridge_batch_proposal: {
      owner_approval_required: true,
      proposed_row_count: 14,
      formal_batch_exists: false,
      proposed_batch_id: "fridge-buyer-path-batch-proposal-v1-abc",
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
      retailer_links_mutation_authorized: false,
      supabase_mutation_authorized: false,
      public_ui_mutation_authorized: false,
      buy_link_mutation_authorized: false,
    },
  });
  assert.equal(context.fridge_batch_proposal_open, true);
  assert.equal(context.any_cc_lane_mutation_authorized, false);
});

test("repo truth: default vault idea classifies FINISH_CURRENT_FIRST at HEAD", async () => {
  const { buildOwnerDriftDetectorReportV1 } = await import("./owner-drift-detector-v1");
  const { buildFridgeBuyerPathBatchProposalCommandCenterLaneV1 } = await import(
    "./fridge-buyer-path-batch-proposal-command-center-v1"
  );
  const proposal = buildFridgeBuyerPathBatchProposalCommandCenterLaneV1({ rootDir: REPO_ROOT });
  const report = buildOwnerDriftDetectorReportV1({
    rootDir: REPO_ROOT,
    next_best_action: "fixture nba",
    fridge_batch_proposal: proposal,
    idea: OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1,
  });
  assert.equal(proposal.proposed_row_count, 14);
  assert.equal(report.decision, "FINISH_CURRENT_FIRST");
});
