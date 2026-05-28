import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, test } from "node:test";

import {
  buildApBatchV3RunInstantiationV1Report,
} from "./ap-batch-v3-run-instantiation-v1";
import { buildBatchProductionOperatingChecklistV1 } from "./buckparts-batch-production-operating-checklist-v1";
import { buildBatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import {
  buildApModelFirstEvidenceQueueV1Report,
} from "./ap-model-first-evidence-queue-v1";
import { buildAirPurifierModelFirstProductionLaneV1Report } from "./air-purifier-model-first-production-lane-v1";
import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./air-purifier-weak-buyer-path-audit-v1";
import {
  AGENT_PERMISSION_LEVELS_V1,
  assertAgentJobWritePolicyV1,
  buildBuckpartsAgentControlPlaneV1Report,
} from "./buckparts-agent-control-plane-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./demand-to-coverage-next-lane-v1";
import { buildBuckpartsMarketingIntelligenceEngineV1Report } from "./buckparts-marketing-intelligence-engine-v1";
import { buildExternalMeasurementFreshnessV1 } from "../../src/lib/owner-dashboard/external-measurement-freshness-v1";
import { buildBuckpartsCommandCenterReport } from "../report-buckparts-command-center";

const REPO_ROOT = process.cwd();

describe("buckparts-agent-control-plane-v1", () => {
  it("report is read_only with data_mutation false", async () => {
    const plane = await buildPlaneOnRepo();
    assert.equal(plane.read_only, true);
    assert.equal(plane.data_mutation, false);
    assert.equal(plane.contract, "agent_control_plane_v1");
  });

  it("AP batch-v3 with zero CSV mutations exposes no SAFE_APPLY_GATED job", async () => {
    const plane = await buildPlaneOnRepo();
    assert.equal(plane.ap_batch_v3_truth.safe_csv_mutation_count, 0);
    assert.ok(plane.ap_batch_v3_truth.result_files_complete);
    const safeApply = plane.all_jobs.filter((j) => j.permission_level === "SAFE_APPLY_GATED");
    assert.equal(safeApply.length, 0);
    assert.ok(
      plane.proven_facts.some((f) => f.includes("no SAFE_APPLY_GATED job")),
    );
  });

  it("Blueair catalog action yields OWNER_ONLY catalog job, not product CSV apply", async () => {
    const plane = await buildPlaneOnRepo();
    assert.ok(plane.ap_batch_v3_truth.catalog_owner_action_count >= 1);
    const catalogJob = plane.all_jobs.find((j) => j.agent_lane === "ap_batch_v3_catalog_task_review");
    assert.ok(catalogJob);
    assert.equal(catalogJob.permission_level, "OWNER_ONLY");
    assert.ok(catalogJob.owner_approval_required);
    assert.ok(
      catalogJob.allowed_write_paths.every(
        (p) => !p.includes("filters.csv") && !p.includes("retailer_links.csv"),
      ),
    );
  });

  it("every job defines allowed_write_paths and forbidden_write_paths", async () => {
    const plane = await buildPlaneOnRepo();
    for (const job of plane.all_jobs) {
      assert.ok(job.allowed_write_paths.length >= 1, job.job_id);
      assert.ok(job.forbidden_write_paths.length >= 1, job.job_id);
      assertAgentJobWritePolicyV1(job);
    }
  });

  it("non-gated permission levels cannot allow product CSV or Supabase writes", async () => {
    const plane = await buildPlaneOnRepo();
    for (const job of plane.all_jobs) {
      if (job.permission_level === "SAFE_APPLY_GATED" || job.permission_level === "DEPLOY_GATED") {
        continue;
      }
      for (const allowed of job.allowed_write_paths) {
        assert.ok(!allowed.includes("filters.csv"), job.job_id);
        assert.ok(!allowed.includes("retailer_links.csv"), job.job_id);
        assert.ok(!allowed.includes("supabase/"), job.job_id);
      }
    }
  });

  it("builder does not mutate product CSV, Supabase scripts, or run-registry", async () => {
    const csvBefore = readFileSync(
      path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"),
      "utf8",
    );
    const registryBefore = readFileSync(
      path.join(REPO_ROOT, "data/air-purifier/batch-production/run-registry/ap-batch-v3-proposed-run-v1.json"),
      "utf8",
    );
    await buildPlaneOnRepo();
    const csvAfter = readFileSync(
      path.join(REPO_ROOT, "data/air-purifier/retailer_links.csv"),
      "utf8",
    );
    const registryAfter = readFileSync(
      path.join(REPO_ROOT, "data/air-purifier/batch-production/run-registry/ap-batch-v3-proposed-run-v1.json"),
      "utf8",
    );
    assert.equal(csvBefore, csvAfter);
    assert.equal(registryBefore, registryAfter);
  });

  it("includes all supported permission levels and agent lanes", async () => {
    const plane = await buildPlaneOnRepo();
    assert.deepEqual(plane.permission_levels, AGENT_PERMISSION_LEVELS_V1);
    assert.equal(plane.supported_agent_lanes.length, 8);
    assert.ok(plane.supported_agent_lanes.includes("ap_model_first_evidence_v1"));
  });

  it("exposes ap_model_first_evidence_v1 when steering primary eligible", async () => {
    const plane = await buildPlaneOnRepo();
    const modelFirstJob = plane.all_jobs.find((j) => j.agent_lane === "ap_model_first_evidence_v1");
    assert.ok(modelFirstJob);
    assert.equal(modelFirstJob!.permission_level, "EVIDENCE_ARTIFACT_WRITE");
    assert.equal(modelFirstJob!.owner_approval_required, false);
    assert.ok(
      modelFirstJob!.allowed_write_paths.some((p) =>
        p.includes("agent-results-model-first-v1"),
      ),
    );
    if (plane.ap_batch_v3_truth.safe_csv_mutation_count === 0) {
      const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
      const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
      const queue = buildApModelFirstEvidenceQueueV1Report({
        modelFirstLane: lane,
        weakBuyerPathAudit: weak,
      });
      if (queue.steering_primary_eligible) {
        assert.equal(modelFirstJob!.eligible_now, true);
      }
    }
  });
});

test("command_center_v2 surfaces agent_control_plane_v1", async () => {
  const report = await buildBuckpartsCommandCenterReport({ rootDir: REPO_ROOT });
  const plane = report.command_center_v2.agent_control_plane_v1;
  assert.ok(plane);
  assert.equal(plane.read_only, true);
  assert.equal(plane.data_mutation, false);
  assert.equal(plane.ap_batch_v3_truth.result_file_count, 3);
});

async function buildPlaneOnRepo() {
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
  const marketing = await buildBuckpartsMarketingIntelligenceEngineV1Report({
    rootDir: REPO_ROOT,
    demandToCoverageNextLane: demand,
  });
  const measurement = await buildExternalMeasurementFreshnessV1({ rootDir: REPO_ROOT });
  const lane = buildAirPurifierModelFirstProductionLaneV1Report({ rootDir: REPO_ROOT });
  const weak = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir: REPO_ROOT });
  const queue = buildApModelFirstEvidenceQueueV1Report({
    modelFirstLane: lane,
    weakBuyerPathAudit: weak,
  });

  return buildBuckpartsAgentControlPlaneV1Report({
    rootDir: REPO_ROOT,
    generated_at: new Date().toISOString(),
    batch_production_operating_dispatch_v1: dispatch,
    ap_batch_v3_run_instantiation_v1: instantiation,
    ap_model_first_evidence_queue_v1: queue,
    air_purifier_weak_buyer_path_audit_v1: weak,
    demand_to_coverage_next_lane_v1: demand,
    marketing_intelligence_engine_v1: marketing,
    external_measurement_freshness_v1: measurement,
    evidence_to_learning_outcomes_candidate_import_v1: {
      contract: "evidence_to_learning_outcomes_candidate_import_v1",
      runtime_status: "OK",
      scanned_file_count: 0,
      parseable_file_count: 0,
      candidate_count: 0,
      rejected_count: 0,
      candidates: [],
      rejected_samples: [],
      proven_facts: [],
      unknown_facts: [],
      owner_approval_required: true,
      data_mutation: false,
    },
    batch_production_operating_checklist_v1: checklist,
  });
}
