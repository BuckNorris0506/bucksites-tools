import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCommandCenterControlGraphRollupV1,
  COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1,
  COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1,
  MAX_PARALLEL_EVIDENCE_TARGETS_V1,
  type ControlGraphNextBestActionRankedItemV1,
} from "./command-center-control-graph-rollup-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/command-center-control-graph-rollup-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync("scripts/report-buckparts-command-center.ts", "utf8");

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");
const EDR4RXD1_FAMILY = "filter::whirlpool::edr4rxd1";

function findEvidenceRanks(
  ranked: ControlGraphNextBestActionRankedItemV1[],
): ControlGraphNextBestActionRankedItemV1[] {
  return ranked.filter(
    (item) =>
      item.safety_tier === "BOUNDED_EVIDENCE_RESEARCH" ||
      item.safety_tier === "SAFE_EVIDENCE",
  );
}

function findEvidenceRank(
  ranked: ControlGraphNextBestActionRankedItemV1[],
): ControlGraphNextBestActionRankedItemV1 | undefined {
  return findEvidenceRanks(ranked)[0];
}

test("next_best_action_ranked surfaces up to MAX_PARALLEL_EVIDENCE_TARGETS safe/bounded evidence families", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  const evidenceRanks = findEvidenceRanks(rollup.next_best_action_ranked);

  assert.ok(evidenceRanks.length > 1, "expected multiple parallel evidence targets");
  assert.equal(evidenceRanks.length, MAX_PARALLEL_EVIDENCE_TARGETS_V1);
  assert.equal(MAX_PARALLEL_EVIDENCE_TARGETS_V1, 5);

  const familyKeys = evidenceRanks.map((item) => item.family_key);
  assert.equal(new Set(familyKeys).size, familyKeys.length, "evidence families must be unique");

  assert.equal(
    evidenceRanks[0]!.family_key,
    rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key,
  );

  for (const item of evidenceRanks) {
    assert.ok(item.family_key);
    assert.notEqual(item.family_key, "filter::frigidaire::fppwfu01");
    assert.notEqual(item.family_key, "filter::frigidaire::eptwfu01");
    assert.notEqual(item.family_key, "filter::frigidaire::wf2cb");
  }

  for (let index = 1; index < evidenceRanks.length; index += 1) {
    assert.ok(
      evidenceRanks[index - 1]!.leverage_score >= evidenceRanks[index]!.leverage_score,
      "evidence targets should remain leverage-ordered",
    );
  }
});

test("frozen families remain excluded from parallel evidence ranks", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  const frozenKeys = rollup.frozen_family_summary.frozen_families.map((row) => row.family_key);
  const evidenceRanks = findEvidenceRanks(rollup.next_best_action_ranked);

  for (const frozenKey of frozenKeys) {
    assert.ok(
      !evidenceRanks.some((item) => item.family_key === frozenKey),
      `${frozenKey} must not appear in evidence ranks`,
    );
  }
});

test("contract and read-only flags", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(rollup.contract, COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1);
  assert.equal(rollup.read_only, true);
  assert.equal(rollup.data_mutation, false);
  assert.equal(rollup.mutation_authorized, false);
  assert.equal(rollup.mutation_blocked_until_owner_approval, true);
  assert.equal(rollup.recommended_jq_path, COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1);
});

test("frozen family summary includes eptwfu01 anchor freeze and fppwfu01 contamination freeze", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  const frozenKeys = rollup.frozen_family_summary.frozen_families.map((row) => row.family_key);
  assert.deepEqual(frozenKeys, [
    "filter::frigidaire::eptwfu01",
    "filter::frigidaire::fppwfu01",
  ]);
  assert.equal(rollup.frozen_family_summary.frozen_family_count, 2);

  const fppwfu01Freeze = rollup.frozen_family_summary.frozen_families.find(
    (row) => row.family_key === "filter::frigidaire::fppwfu01",
  );
  assert.equal(fppwfu01Freeze?.freeze_reason, "prefix_contamination_zero_proven_anchor");
  assert.ok((fppwfu01Freeze?.prefix_contamination_count ?? 0) > 0);
});

test("next_best_action freezes contaminated families and does not recommend FPPWFU01 as safe evidence", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.match(rollup.next_best_action, /filter::frigidaire::eptwfu01/);
  assert.match(rollup.next_best_action, /anchor integrity is resolved/i);
  assert.notEqual(
    rollup.evidence_leverage_summary.highest_safe_non_frozen_family_key,
    "filter::frigidaire::fppwfu01",
  );
  assert.equal(
    rollup.evidence_leverage_summary.highest_safe_non_frozen_family_key,
    "filter::frigidaire::wf2cb",
  );
  assert.doesNotMatch(rollup.next_best_action, /filter::frigidaire::fppwfu01.*highest safe/i);

  const freezeRanks = rollup.next_best_action_ranked.filter((item) => item.safety_tier === "FREEZE");
  assert.ok(freezeRanks.some((item) => item.family_key === "filter::frigidaire::eptwfu01"));
  assert.ok(freezeRanks.some((item) => item.family_key === "filter::frigidaire::fppwfu01"));

  const evidenceRank = findEvidenceRank(rollup.next_best_action_ranked);
  assert.ok(evidenceRank);
  assert.notEqual(evidenceRank!.family_key, "filter::frigidaire::fppwfu01");
  assert.notEqual(evidenceRank!.family_key, "filter::frigidaire::wf2cb");
  assert.equal(
    evidenceRank!.family_key,
    rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key,
  );
});

test("pre-research risk screen blocks wf2cb from bounded evidence research rank and surfaces summary", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(rollup.pre_research_risk_screen_summary.screened_family_count > 0);
  assert.ok(rollup.pre_research_risk_screen_summary.blocked_family_count > 0);

  const wf2cbBlocked = rollup.pre_research_risk_screen_summary.top_blocked_families.find(
    (row) => row.family_key === "filter::frigidaire::wf2cb",
  );
  assert.ok(wf2cbBlocked);
  assert.equal(wf2cbBlocked!.contamination_risk, "HIGH");
  assert.equal(wf2cbBlocked!.recommendation, "NEEDS_REPO_RECONCILIATION_FIRST");

  const evidenceRank = findEvidenceRank(rollup.next_best_action_ranked);
  assert.ok(evidenceRank);
  assert.notEqual(evidenceRank!.family_key, "filter::frigidaire::wf2cb");

  const wf2cbReconciliation = rollup.next_best_action_ranked.find(
    (item) =>
      item.safety_tier === "PRE_RESEARCH_RECONCILIATION" &&
      item.family_key === "filter::frigidaire::wf2cb",
  );
  assert.ok(wf2cbReconciliation);
  assert.match(wf2cbReconciliation!.action, /not full-family scaling/i);
  assert.doesNotMatch(
    rollup.next_best_action,
    /prioritize `filter::frigidaire::wf2cb`.*highest safe/i,
  );
});

test("EDR4RXD1 is bounded evidence research only — not safe for scaling", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(
    rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key,
    EDR4RXD1_FAMILY,
  );

  const edr4Rank = rollup.next_best_action_ranked.find(
    (item) => item.family_key === EDR4RXD1_FAMILY,
  );
  assert.ok(edr4Rank);
  assert.equal(edr4Rank!.safety_tier, "BOUNDED_EVIDENCE_RESEARCH");
  assert.equal(edr4Rank!.recommended_action_scope, "BOUNDED_RESEARCH_ONLY");
  assert.equal(edr4Rank!.requires_owner_review_before_mutation, true);
  assert.equal(edr4Rank!.safe_for_scaling, false);
  assert.equal(edr4Rank!.safe_for_bounded_research, true);
  assert.equal(edr4Rank!.family_reconciliation_severity, "MEDIUM");
  assert.match(edr4Rank!.why, /pre-research LOW, but family reconciliation MEDIUM and HyperAgent validation partial/i);
  assert.match(edr4Rank!.action, /bounded evidence research only/i);
  assert.match(edr4Rank!.action, /not full-family scaling/i);
  assert.match(edr4Rank!.action, /no compat mutation/i);
  assert.match(edr4Rank!.action, /no evidence promotion without owner-reviewed manual evidence/i);
  assert.match(edr4Rank!.action, /family reconciliation remains MEDIUM/i);

  assert.match(rollup.next_best_action, /bounded evidence research only/i);
  assert.match(rollup.next_best_action, /filter::whirlpool::edr4rxd1/);
  assert.doesNotMatch(rollup.next_best_action, /highest safe pre-research-screened evidence-leverage family/i);
  assert.doesNotMatch(
    rollup.next_best_action,
    /prioritize `filter::whirlpool::edr4rxd1`.*full-family scaling/i,
  );
});

test("next_best_action does not recommend full-family HyperAgent dispatch for HIGH-risk families", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  const evidenceRank = findEvidenceRank(rollup.next_best_action_ranked);
  assert.ok(evidenceRank);

  for (const blocked of rollup.pre_research_risk_screen_summary.top_blocked_families) {
    if (blocked.contamination_risk !== "HIGH") continue;
    assert.notEqual(evidenceRank!.family_key, blocked.family_key);
    const reconciliation = rollup.next_best_action_ranked.find(
      (item) =>
        item.safety_tier === "PRE_RESEARCH_RECONCILIATION" &&
        item.family_key === blocked.family_key,
    );
    assert.ok(reconciliation, `${blocked.family_key} must have reconciliation rank`);
    assert.match(reconciliation!.action, /Block full-family HyperAgent dispatch/i);
  }
});

test("summaries reflect committed audit artifacts", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(rollup.dangerous_mapping_summary.dangerous_model_count, 76);
  assert.equal(rollup.learned_failure_guard_summary.dangerous_count, 76);
  assert.equal(rollup.learned_failure_guard_summary.dangerous_count_regression_verdict, "PASS");
  assert.equal(rollup.anchor_integrity_summary.sibling_conflict_disputed_count, 1);
  assert.equal(rollup.evidence_leverage_summary.total_unlockable_model_count, 416);
  assert.equal(rollup.page_factory_quality_summary.quality_gate_artifact_count, 2);
  assert.equal(rollup.page_factory_quality_summary.batch_qa_director_artifact_count, 1);
  assert.equal(rollup.education_opportunity_summary, null);
});

test("read-only guard blocks compat, evidence, Supabase, sitemap, robots, page, HQ handoff writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    'writeFileSync(path.join(args.rootDir, "public/sitemap',
    "docs/BuckParts-HQ-HANDOFF",
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
  ];

  for (const needle of forbiddenWrites) {
    assert.equal(LIB_SOURCE.includes(needle), false, `lib must not write ${needle}`);
  }

  assert.equal(LIB_SOURCE.includes("data/compatibility_mappings.csv"), true);
  assert.ok(LIB_SOURCE.includes("readFileSync"));
});

test("command center report wires control graph rollup lane", () => {
  assert.ok(REPORT_SOURCE.includes("buildCommandCenterControlGraphRollupV1"));
  assert.ok(REPORT_SOURCE.includes("command_center_control_graph_rollup_v1"));
});
