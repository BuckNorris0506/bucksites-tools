import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AP_BATCH_V2_DIRECT_BUY_SLUGS_V1 } from "./air-purifier-apply-planner-batch-v2-v1";
import {
  AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1,
  AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1,
  buildApBatchV3RunInstantiationV1Report,
} from "./ap-batch-v3-run-instantiation-v1";
import { buildBatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import {
  buildBatchProductionOperatingDispatchV1,
} from "./buckparts-batch-production-operating-dispatch-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";
import { BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 } from "./buckparts-batch-production-operating-checklist-v1";

const REPO_ROOT = process.cwd();

test("ap-batch-v3 run instantiation is read-only", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.equal(report.contract, AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.files_written.length, 0);
});

test("ap-batch-v3 selected only when demand-to-coverage recommends air_purifier reopen", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  assert.equal(demand.recommended_wedge, "air_purifier");
  assert.equal(demand.recommendation_status, "RECOMMEND_REOPEN");

  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.equal(report.source_recommendation_proof.recommended_wedge, "air_purifier");
  assert.equal(report.source_recommendation_proof.recommendation_status, "RECOMMEND_REOPEN");
  assert.equal(report.source_proven_run_id, AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1);
});

test("ap-batch-v3 excludes existing_direct_buyable and ap-batch-v2 applied slugs", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });

  const buyerSlugs = new Set(report.candidates_by_task.buyer_path.map((c) => c.filter_slug));
  for (const slug of AP_BATCH_V2_DIRECT_BUY_SLUGS_V1) {
    assert.equal(buyerSlugs.has(slug), false, `v2 applied slug must be excluded: ${slug}`);
  }

  assert.ok(
    report.candidates_by_task.excluded.some(
      (e) => e.state === "existing_direct_buyable" || e.reason.includes("direct_buyable"),
    ),
  );
});

test("wrong_family_reject excluded from buyer-path packets", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });

  const buyerSlugs = report.candidates_by_task.buyer_path.map((c) => c.filter_slug);
  assert.equal(buyerSlugs.includes("levoit-rf-rar029"), false);
  assert.ok(
    report.candidates_by_task.excluded.some(
      (e) => e.filter_slug === "levoit-rf-rar029" && e.state === "wrong_family_reject",
    ),
  );
  for (const packet of report.packets_grouped_by_task.buyer_path) {
    assert.equal(packet.candidate_slugs.includes("levoit-rf-rar029"), false);
  }
});

test("catalog_identity_gap routed to catalog-review only", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });

  const buyerSlugs = new Set(report.candidates_by_task.buyer_path.map((c) => c.filter_slug));
  assert.equal(buyerSlugs.has("blueair-particle-411"), false);
  assert.ok(
    report.candidates_by_task.catalog_review.some((c) => c.filter_slug === "blueair-particle-411"),
  );
  assert.ok(report.packets_grouped_by_task.catalog_review.some((p) => p.packet_id.includes("blueair")));
  for (const packet of report.packets_grouped_by_task.buyer_path) {
    assert.equal(packet.candidate_slugs.includes("blueair-particle-411"), false);
  }
});

test("ap-batch-v3 generates more than 4 buyer-path candidates when lane backlog exists", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.ok(report.buyer_path_candidate_count > 4);
  assert.equal(report.may_proceed_to_packet_write, true);
});

test("Command Center dispatch surfaces ap-batch-v3 run instantiation", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const instantiation = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
    ap_batch_v3_run_instantiation: instantiation,
  });
  assert.equal(dispatch.selected_subsystem, "ap_batch_v3_run_instantiation");
  assert.equal(dispatch.dispatch_status, "READY");
  assert.equal(dispatch.expansion_blocked, false);
});

test("read-only report paths do not mutate CSV Supabase or dispatch-run artifacts", async () => {
  const csvBefore = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  const dispatchDir = path.join(REPO_ROOT, BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1);
  const dispatchBefore = new Map<string, string>();
  for (const name of readdirSync(dispatchDir)) {
    if (name.endsWith(".json")) {
      dispatchBefore.set(name, readFileSync(path.join(dispatchDir, name), "utf8"));
    }
  }

  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });

  const csvAfter = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  assert.equal(csvBefore, csvAfter);
  for (const [name, content] of dispatchBefore) {
    assert.equal(readFileSync(path.join(dispatchDir, name), "utf8"), content, `mutated ${name}`);
  }
});

test("write flag writes only to explicit out-dir", async () => {
  const outRoot = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-write-"));
  try {
    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const report = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      demandToCoverageNextLane: demand,
      checklist,
      write: true,
      outDir: outRoot,
    });
    assert.ok(report.files_written.length >= 1);
    assert.ok(report.files_written.every((p) => p.startsWith(outRoot)));
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});
