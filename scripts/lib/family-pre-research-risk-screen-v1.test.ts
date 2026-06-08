import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildFamilyPreResearchRiskScreenV1,
  FAMILY_PRE_RESEARCH_RISK_SCREEN_CONTRACT_V1,
  resolveDefaultFamilyKey,
} from "./family-pre-research-risk-screen-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/family-pre-research-risk-screen-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-family-pre-research-risk-screen-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-08T12:00:00.000Z");

test("contract and read-only flags", () => {
  const report = buildFamilyPreResearchRiskScreenV1({
    rootDir: ROOT,
    familyKey: "filter::frigidaire::wf2cb",
    now: FIXED_NOW,
  });
  assert.equal(report.contract, FAMILY_PRE_RESEARCH_RISK_SCREEN_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.mutation_blocked_until_owner_approval, true);
});

test("filter::frigidaire::eptwfu01 screens HIGH/FREEZE", () => {
  const report = buildFamilyPreResearchRiskScreenV1({
    rootDir: ROOT,
    familyKey: "filter::frigidaire::eptwfu01",
    now: FIXED_NOW,
  });
  assert.equal(report.contamination_risk, "HIGH");
  assert.equal(report.recommendation, "FREEZE_FAMILY");
  assert.equal(report.recommended_hyperagent_batch_size, 0);
  assert.deepEqual(report.exact_slug_batch_for_research, []);
  assert.ok(report.anchor_health_summary);
});

test("filter::frigidaire::fppwfu01 screens HIGH/FREEZE", () => {
  const report = buildFamilyPreResearchRiskScreenV1({
    rootDir: ROOT,
    familyKey: "filter::frigidaire::fppwfu01",
    now: FIXED_NOW,
  });
  assert.equal(report.contamination_risk, "HIGH");
  assert.equal(report.recommendation, "FREEZE_FAMILY");
  assert.equal(report.currently_proven_count, 0);
  assert.ok(report.sibling_conflict_count > 0 || report.learned_failure_block_count > 0);
  assert.equal(report.recommended_hyperagent_batch_size, 0);
});

test("filter::frigidaire::wf2cb returns concrete screen result, not assumed safe", () => {
  const report = buildFamilyPreResearchRiskScreenV1({
    rootDir: ROOT,
    familyKey: "filter::frigidaire::wf2cb",
    now: FIXED_NOW,
  });
  assert.equal(report.family_key, "filter::frigidaire::wf2cb");
  assert.equal(report.target_filter_slug, "wf2cb");
  assert.equal(report.currently_proven_count, 0);
  assert.equal(report.currently_unproven_count, 20);
  assert.equal(report.unlock_slugs.length, 20);
  assert.notEqual(report.recommendation, "SAFE_FOR_HYPERAGENT_EVIDENCE_BATCH");
  assert.equal(report.contamination_risk, "HIGH");
  assert.equal(report.recommendation, "NEEDS_REPO_RECONCILIATION_FIRST");
  assert.ok(report.sibling_conflict_count > 0);
  assert.ok(report.sibling_conflict_examples.length > 0);
  assert.ok(report.brand_prefix_clusters.length > 0);
  assert.ok(report.model_line_cluster_count >= 8);
});

test("screen emits exact_slug_batch_for_research", () => {
  const report = buildFamilyPreResearchRiskScreenV1({
    rootDir: ROOT,
    familyKey: "filter::frigidaire::wf2cb",
    now: FIXED_NOW,
  });
  assert.ok(Array.isArray(report.exact_slug_batch_for_research));
  assert.equal(
    report.recommended_hyperagent_batch_size,
    report.exact_slug_batch_for_research.length,
  );
  assert.ok(report.exact_slug_batch_for_research.length > 0);
  assert.ok(report.exact_slug_batch_for_research.length <= 5);
  for (const slug of report.exact_slug_batch_for_research) {
    assert.ok(report.unlock_slugs.includes(slug));
  }
});

test("default family resolves to Command Center highest safe non-frozen family", () => {
  const defaultKey = resolveDefaultFamilyKey({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(defaultKey, "filter::frigidaire::wf2cb");

  const report = buildFamilyPreResearchRiskScreenV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(report.selected_by, "command_center_highest_safe_non_frozen");
  assert.equal(report.family_key, "filter::frigidaire::wf2cb");
});

test("read-only guard blocks compat, evidence, Supabase, sitemap, robots, page, retailer, HQ handoff writes", () => {
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
  assert.equal(LIB_SOURCE.includes("readFileSync"), true);
  assert.equal(REPORT_SOURCE.includes("writeFileSync"), false);
});
