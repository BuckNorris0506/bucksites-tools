import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1,
  BUCKPARTS_MARKETING_MOTTO_V1,
  buildBuckpartsMarketingIntelligenceEngineUnknownV1,
  buildBuckpartsMarketingIntelligenceEngineV1Report,
} from "./buckparts-marketing-intelligence-engine-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 } from "./buckparts-batch-production-operating-checklist-v1";

const REPO_ROOT = process.cwd();

const PRODUCT_CSV_PATHS = [
  "data/retailer_links.csv",
  "data/filters.csv",
  "data/air-purifier/retailer_links.csv",
  "data/air-purifier/filters.csv",
  "data/whole-house-water/retailer_links.csv",
  "data/whole-house-water/filters.csv",
] as const;

function snapshotMtimes(): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of PRODUCT_CSV_PATHS) {
    const abs = path.join(REPO_ROOT, rel);
    try {
      map.set(rel, readFileSync(abs).length);
    } catch {
      map.set(rel, -1);
    }
  }
  return map;
}

test("marketing intelligence engine contract is read-only", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const report = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  assert.equal(report.contract, BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.motto, BUCKPARTS_MARKETING_MOTTO_V1);
  assert.match(report.motto, /Wrong Part Prevention Department/);
});

test("marketing intelligence does not mutate product CSVs or dispatch-run artifacts", async () => {
  const before = snapshotMtimes();
  const dispatchDir = path.join(REPO_ROOT, BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1);
  const dispatchBefore = new Map<string, string>();
  for (const name of readdirSync(dispatchDir)) {
    if (name.endsWith(".json")) {
      dispatchBefore.set(name, readFileSync(path.join(dispatchDir, name), "utf8"));
    }
  }

  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });

  const after = snapshotMtimes();
  for (const rel of PRODUCT_CSV_PATHS) {
    assert.equal(after.get(rel), before.get(rel), `product CSV mutated: ${rel}`);
  }
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content, `mutated ${name}`);
  }
});

test("opportunities are evidence-backed not generic-only", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const report = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  assert.ok(report.opportunity_count > 0, "expected at least one opportunity from repo evidence");
  for (const opp of report.opportunities) {
    assert.ok(opp.evidence_keys.length > 0, `missing evidence_keys: ${opp.opportunity_id}`);
    assert.ok(opp.source_truth_paths.length > 0, `missing source_truth_paths: ${opp.opportunity_id}`);
    const hasConcreteHook = opp.sarcastic_hooks.some(
      (h) =>
        opp.evidence_keys.some((k) => h.includes(k.replace(/^slug:/, ""))) ||
        h.includes(opp.wedge) ||
        /\d+/.test(h) ||
        h.includes("Wrong Part Prevention"),
    );
    assert.ok(
      hasConcreteHook || opp.plain_english_explanation.length > 20,
      `opportunity ${opp.opportunity_id} looks generic-only`,
    );
  }
});

test("publishability_status blocks weak no-proof opportunities", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const report = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  const wrongFamily = report.opportunities.filter((o) => o.opportunity_class === "wrong_family_reject");
  assert.ok(wrongFamily.length > 0, "expected wrong_family_reject from AP lane fixtures");
  for (const o of wrongFamily) {
    assert.notEqual(o.publishability_status, "READY_TO_DRAFT");
    assert.ok(o.blocked_reasons.length > 0);
  }
  const catalogGaps = report.opportunities.filter((o) => o.opportunity_class === "catalog_identity_confusion");
  for (const o of catalogGaps) {
    assert.notEqual(o.publishability_status, "READY_TO_DRAFT");
  }
});

test("safe CTA wins can be READY_TO_DRAFT or NEEDS_OWNER_TASTE_REVIEW", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const report = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  const wins = report.opportunities.filter((o) => o.opportunity_class === "safe_cta_win");
  assert.ok(wins.length > 0, "expected safe_cta_win from existing_direct_buyable rows");
  const allowed = new Set(["READY_TO_DRAFT", "NEEDS_OWNER_TASTE_REVIEW"]);
  for (const o of wins) {
    assert.ok(allowed.has(o.publishability_status), o.publishability_status);
  }
});

test("Command Center surfaces marketing_intelligence_engine_v1", async () => {
  const report = await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });
  const mkt = report.command_center_v2.marketing_intelligence_engine_v1;
  assert.ok(mkt);
  assert.equal(mkt.contract, BUCKPARTS_MARKETING_INTELLIGENCE_ENGINE_CONTRACT_V1);
  assert.equal(mkt.read_only, true);
  assert.equal(mkt.data_mutation, false);
  assert.equal(mkt.motto, BUCKPARTS_MARKETING_MOTTO_V1);
});

test("unknown builder preserves motto and read-only contract", () => {
  const unknown = buildBuckpartsMarketingIntelligenceEngineUnknownV1({
    generated_at: new Date().toISOString(),
    reason: "test",
  });
  assert.equal(unknown.motto, BUCKPARTS_MARKETING_MOTTO_V1);
  assert.equal(unknown.read_only, true);
  assert.equal(unknown.data_mutation, false);
});
