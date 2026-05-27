import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AP_BATCH_V2_DIRECT_BUY_SLUGS_V1 } from "./air-purifier-apply-planner-batch-v2-v1";
import {
  AP_BATCH_V3_PACKETS_DIR_REL_V1,
  AP_BATCH_V3_PACKETS_MANIFEST_REL_V1,
  AP_BATCH_V3_REGISTRY_REL_V1,
  AP_BATCH_V3_RUN_INSTANTIATION_CONTRACT_V1,
  AP_BATCH_V3_SOURCE_PROVEN_RUN_ID_V1,
  buildApBatchV3RunInstantiationV1Report,
  isApBatchV3RunRegistryPacketMisplacementV1,
  loadApBatchV3CommittedRunArtifactV1,
  resolveApBatchV3ArtifactPathsV1,
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

test("Command Center dispatch advances past packet generation when committed packets exist", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const instantiation = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.equal(instantiation.packets_stage_complete, true);
  assert.equal(instantiation.active_run_id_source, "committed_registry");
  assert.notEqual(instantiation.run_id, "UNKNOWN");

  const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
    ap_batch_v3_run_instantiation: instantiation,
  });
  assert.equal(dispatch.selected_subsystem, "ap_batch_v3_aggregation_review");
  assert.equal(dispatch.current_stage_id, "evidence_collected");
  assert.equal(dispatch.dispatch_status, "READY");
  assert.equal(dispatch.expansion_blocked, false);
  assert.notEqual(dispatch.selected_subsystem, "ap_batch_v3_run_instantiation");
});

test("committed run id wins over regenerated daily proposed id", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    now: () => new Date("2099-01-01T12:00:00.000Z"),
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.equal(report.active_run_id_source, "committed_registry");
  assert.equal(report.run_id, "ap-batch-v3-proposed-2026-05-26");
  assert.notEqual(report.run_id, "ap-batch-v3-proposed-2099-01-01");
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

test("write flag writes registry and packets to separate sandbox subdirs", async () => {
  const outRoot = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-write-"));
  try {
    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const report = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      demandToCoverageNextLane: demand,
      checklist,
      write: true,
      writePackets: true,
      outDir: outRoot,
    });

    const paths = resolveApBatchV3ArtifactPathsV1({ rootDir: REPO_ROOT, sandboxRoot: outRoot });
    assert.ok(report.files_written.includes(paths.registryAbs));
    assert.ok(report.files_written.includes(paths.manifestAbs));
    assert.ok(report.files_written.every((p) => p.startsWith(outRoot)));

    const registryDir = path.join(outRoot, "run-registry");
    const registryFiles = readdirSync(registryDir);
    assert.ok(registryFiles.includes("ap-batch-v3-proposed-run-v1.json"));
    for (const name of registryFiles) {
      assert.equal(
        isApBatchV3RunRegistryPacketMisplacementV1(name),
        false,
        `run-registry must not contain packet-source file: ${name}`,
      );
    }

    const packetDir = path.join(outRoot, "agent-packets-batch-v3");
    assert.ok(existsSync(path.join(packetDir, "manifest.json")));
    const packetFiles = readdirSync(packetDir).filter((n) => n.endsWith(".json") && n !== "manifest.json");
    assert.ok(packetFiles.length >= 1);
    for (const packetId of report.packets_grouped_by_task.buyer_path
      .concat(report.packets_grouped_by_task.catalog_review)
      .map((p) => p.packet_id)) {
      assert.ok(packetFiles.includes(`${packetId}.json`), `missing packet ${packetId}`);
    }
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});

test("repo run-registry contains only run descriptors — packets live under agent-packets-batch-v3", () => {
  const registryDir = path.join(REPO_ROOT, path.dirname(AP_BATCH_V3_REGISTRY_REL_V1));
  for (const name of readdirSync(registryDir)) {
    if (!name.endsWith(".json")) continue;
    assert.equal(
      isApBatchV3RunRegistryPacketMisplacementV1(name),
      false,
      `misplaced packet artifact in run-registry: ${name}`,
    );
  }
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_PACKETS_MANIFEST_REL_V1)));
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_PACKETS_DIR_REL_V1)));
});

function copyRepoBatchFileToSandbox(sandboxRoot: string, rel: string): string {
  const dst = path.join(sandboxRoot, rel);
  mkdirSync(path.dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(path.join(REPO_ROOT, rel), "utf8"), "utf8");
  return dst;
}

test("missing packet manifest keeps dispatch on ap_batch_v3_run_instantiation", async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-missing-manifest-"));
  try {
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_REGISTRY_REL_V1);

    const committed = loadApBatchV3CommittedRunArtifactV1({
      rootDir: sandbox,
      fileExists: (p) => existsSync(p),
      readTextFile: (p) => readFileSync(p, "utf8"),
    });
    assert.equal(committed.packet_stage_status, "MISSING_MANIFEST");

    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const instantiation = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      artifactRootDir: sandbox,
      demandToCoverageNextLane: demand,
      checklist,
    });
    assert.equal(instantiation.packets_stage_complete, false);
    assert.equal(instantiation.packet_stage_status, "MISSING_MANIFEST");
    assert.equal(instantiation.may_proceed_to_packet_write, true);

    const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
      ap_batch_v3_run_instantiation: instantiation,
    });
    assert.equal(dispatch.selected_subsystem, "ap_batch_v3_run_instantiation");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("result stage incomplete when one expected file is missing", async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-missing-result-"));
  try {
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_REGISTRY_REL_V1);
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_PACKETS_MANIFEST_REL_V1);
    for (const packet of [
      "ap-levoit-oem-discovery-v1",
      "ap-oem-search-placeholder-v1",
      "ap-blueair-catalog-identity-v1",
    ]) {
      copyRepoBatchFileToSandbox(sandbox, `${AP_BATCH_V3_PACKETS_DIR_REL_V1}/${packet}.json`);
    }
    copyRepoBatchFileToSandbox(
      sandbox,
      "data/air-purifier/batch-production/agent-results-batch-v3/ap-levoit-oem-discovery-v1.results.json",
    );
    copyRepoBatchFileToSandbox(
      sandbox,
      "data/air-purifier/batch-production/agent-results-batch-v3/ap-blueair-catalog-identity-v1.results.json",
    );

    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const report = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      artifactRootDir: sandbox,
      demandToCoverageNextLane: demand,
      checklist,
    });
    assert.equal(report.packets_stage_complete, true);
    assert.equal(report.result_stage_complete, false);
    assert.equal(report.result_stage_status, "MISSING_RESULT_FILES");
    assert.ok(report.missing_result_files_rel.some((p) => p.includes("ap-oem-search-placeholder-v1")));
    const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
      ap_batch_v3_run_instantiation: report,
    });
    assert.equal(dispatch.selected_subsystem, "ap_batch_v3_agent_evidence_required");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("result stage complete when all expected result files exist", async () => {
  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
    checklist,
  });
  assert.equal(report.packets_stage_complete, true);
  assert.equal(report.result_stage_complete, true);
  assert.equal(report.result_stage_status, "COMPLETE");
  assert.equal(report.ready_result_files_rel.length, 3);
});

test("invalid result file with wrong run_id or data_mutation true does not advance", async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-invalid-result-"));
  try {
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_REGISTRY_REL_V1);
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_PACKETS_MANIFEST_REL_V1);
    for (const packet of [
      "ap-levoit-oem-discovery-v1",
      "ap-oem-search-placeholder-v1",
      "ap-blueair-catalog-identity-v1",
    ]) {
      copyRepoBatchFileToSandbox(sandbox, `${AP_BATCH_V3_PACKETS_DIR_REL_V1}/${packet}.json`);
      copyRepoBatchFileToSandbox(
        sandbox,
        `data/air-purifier/batch-production/agent-results-batch-v3/${packet}.results.json`,
      );
    }
    const invalidPath = path.join(
      sandbox,
      "data/air-purifier/batch-production/agent-results-batch-v3/ap-oem-search-placeholder-v1.results.json",
    );
    const invalid = JSON.parse(readFileSync(invalidPath, "utf8")) as Record<string, unknown>;
    invalid.run_id = "ap-batch-v3-proposed-2099-01-01";
    invalid.data_mutation = true;
    writeFileSync(invalidPath, `${JSON.stringify(invalid, null, 2)}\n`, "utf8");

    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const instantiation = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      artifactRootDir: sandbox,
      demandToCoverageNextLane: demand,
      checklist,
    });
    assert.equal(instantiation.result_stage_complete, false);
    assert.equal(instantiation.result_stage_status, "INVALID_RESULT_FILE");
    const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
      ap_batch_v3_run_instantiation: instantiation,
    });
    assert.equal(dispatch.selected_subsystem, "ap_batch_v3_agent_evidence_required");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("missing packet file blocks advancement and lists missing file", async () => {
  const sandbox = mkdtempSync(path.join(tmpdir(), "ap-batch-v3-missing-packet-"));
  try {
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_REGISTRY_REL_V1);
    copyRepoBatchFileToSandbox(sandbox, AP_BATCH_V3_PACKETS_MANIFEST_REL_V1);
    copyRepoBatchFileToSandbox(
      sandbox,
      `${AP_BATCH_V3_PACKETS_DIR_REL_V1}/ap-levoit-oem-discovery-v1.json`,
    );

    const committed = loadApBatchV3CommittedRunArtifactV1({
      rootDir: sandbox,
      fileExists: (p) => existsSync(p),
      readTextFile: (p) => readFileSync(p, "utf8"),
    });
    assert.equal(committed.packet_stage_status, "MISSING_PACKET_FILES");
    assert.ok(committed.missing_packet_files_rel.length > 0);

    const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir: REPO_ROOT });
    const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
    const instantiation = await buildApBatchV3RunInstantiationV1Report({
      rootDir: REPO_ROOT,
      artifactRootDir: sandbox,
      demandToCoverageNextLane: demand,
      checklist,
    });
    assert.equal(instantiation.packet_stage_status, "MISSING_PACKET_FILES");
    assert.equal(instantiation.may_proceed_to_packet_write, true);
    const dispatch = buildBatchProductionOperatingDispatchV1(checklist, {
      ap_batch_v3_run_instantiation: instantiation,
    });
    assert.equal(dispatch.selected_subsystem, "ap_batch_v3_run_instantiation");
    assert.equal(dispatch.dispatch_status, "OWNER_REVIEW_REQUIRED");
    assert.ok(
      dispatch.blocked_reasons.some((r) => r.startsWith("missing_packet_file:")),
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("Command Center dispatch expected_artifact_paths exist when packets stage complete", async () => {
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
  assert.equal(dispatch.selected_subsystem, "ap_batch_v3_aggregation_review");
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_REGISTRY_REL_V1)));
  assert.ok(existsSync(path.join(REPO_ROOT, AP_BATCH_V3_PACKETS_MANIFEST_REL_V1)));
  for (const rel of instantiation.ready_packet_files_rel) {
    assert.ok(existsSync(path.join(REPO_ROOT, rel)), `packet file missing: ${rel}`);
  }
});

test("write flag writes registry only to explicit out-dir when writePackets false", async () => {
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
    assert.ok(!existsSync(path.join(outRoot, "agent-packets-batch-v3", "manifest.json")));
  } finally {
    rmSync(outRoot, { recursive: true, force: true });
  }
});
