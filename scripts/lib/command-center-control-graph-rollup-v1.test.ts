import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCommandCenterControlGraphRollupV1,
  COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CONTRACT_V1,
  COMMAND_CENTER_CONTROL_GRAPH_ROLLUP_CC_JQ_PATH_V1,
} from "./command-center-control-graph-rollup-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/command-center-control-graph-rollup-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync("scripts/report-buckparts-command-center.ts", "utf8");

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

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

  const safeRank = rollup.next_best_action_ranked.find((item) => item.safety_tier === "SAFE_EVIDENCE");
  assert.ok(safeRank);
  assert.notEqual(safeRank!.family_key, "filter::frigidaire::fppwfu01");
  assert.notEqual(safeRank!.family_key, "filter::frigidaire::wf2cb");
  assert.equal(
    safeRank!.family_key,
    rollup.pre_research_risk_screen_summary.highest_safe_screened_family_key,
  );
});

test("pre-research risk screen blocks wf2cb from SAFE_EVIDENCE and surfaces summary", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.ok(rollup.pre_research_risk_screen_summary.screened_family_count > 0);
  assert.ok(rollup.pre_research_risk_screen_summary.blocked_family_count > 0);

  const wf2cbBlocked = rollup.pre_research_risk_screen_summary.top_blocked_families.find(
    (row) => row.family_key === "filter::frigidaire::wf2cb",
  );
  assert.ok(wf2cbBlocked);
  assert.equal(wf2cbBlocked!.contamination_risk, "HIGH");
  assert.equal(wf2cbBlocked!.recommendation, "NEEDS_REPO_RECONCILIATION_FIRST");

  const safeRank = rollup.next_best_action_ranked.find((item) => item.safety_tier === "SAFE_EVIDENCE");
  assert.ok(safeRank);
  assert.notEqual(safeRank!.family_key, "filter::frigidaire::wf2cb");

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

test("next_best_action does not recommend full-family HyperAgent dispatch for HIGH-risk families", () => {
  const rollup = buildCommandCenterControlGraphRollupV1({ rootDir: ROOT, now: FIXED_NOW });
  const safeRank = rollup.next_best_action_ranked.find((item) => item.safety_tier === "SAFE_EVIDENCE");
  assert.ok(safeRank);

  for (const blocked of rollup.pre_research_risk_screen_summary.top_blocked_families) {
    if (blocked.contamination_risk !== "HIGH") continue;
    assert.notEqual(safeRank!.family_key, blocked.family_key);
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
