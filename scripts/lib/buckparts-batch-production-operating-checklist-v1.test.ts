import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AP_BATCH_V2_DIRECT_BUY_SLUGS_V1 } from "./air-purifier-apply-planner-batch-v2-v1";
import {
  BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1,
  BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1,
  BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1,
  buildBatchProductionOperatingChecklistV1,
  classifySlugSafetyV1,
  detectBatchProductionSetbacksV1,
} from "./buckparts-batch-production-operating-checklist-v1";
import { loadApRetailerLinksCsvV1 } from "./air-purifier-apply-planner-v1";
import { validateApSupabaseParityPlanV1 } from "./air-purifier-supabase-apply-parity-v1";

const REPO_ROOT = process.cwd();

test("checklist contract exposes all stage gates and setback catalog", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  assert.equal(checklist.contract, BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1);
  assert.equal(checklist.read_only, true);
  assert.equal(checklist.data_mutation, false);
  assert.equal(checklist.may_mutate, false);
  assert.equal(checklist.setback_detectors_catalog.length, 5);
  assert.deepEqual(
    checklist.runs[0]?.stages.map((s) => s.stage_id),
    [...BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1],
  );
});

test("AP batch-v2 proven run validates stages and teaches multi-path lesson", () => {
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir: REPO_ROOT });
  const run = checklist.runs.find((r) => r.run_id === "ap-batch-v2-2026-05-24");
  assert.ok(run, "proven run must load");

  const byId = new Map(run.stages.map((s) => [s.stage_id, s]));
  assert.equal(byId.get("lane_selected")?.status, "complete");
  assert.equal(byId.get("packets_generated")?.status, "complete");
  assert.equal(byId.get("evidence_collected")?.status, "complete");
  assert.equal(byId.get("aggregator_reviewed")?.status, "complete");
  assert.equal(byId.get("apply_plan_ready")?.status, "complete");
  assert.equal(byId.get("csv_apply_complete")?.status, "complete");
  assert.equal(byId.get("repo_validation_complete")?.status, "complete");
  assert.equal(byId.get("supabase_parity_dry_run_ready")?.status, "complete");
  assert.equal(byId.get("production_runtime_smoke_complete")?.status, "complete");
  assert.equal(byId.get("closeout_complete")?.status, "complete");

  assert.ok(run.operator_lessons.some((l) => l.includes("23 evidence rows")));
  assert.ok(
    run.operator_lessons.some((l) => l.includes("primary CTA") || l.includes("Amazon safe")),
  );

  assert.equal(run.safety_by_slug.length, 4);
  for (const slug of AP_BATCH_V2_DIRECT_BUY_SLUGS_V1) {
    const row = run.safety_by_slug.find((s) => s.filter_slug === slug);
    assert.ok(row, slug);
    assert.ok(row.classifications.includes("SAFE_PRIMARY_MATCH"));
  }
});

test("batch-v2 plan passes supabase parity — setback for report_name must not fire", () => {
  const plan = JSON.parse(
    readFileSync(
      `${REPO_ROOT}/data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json`,
      "utf8",
    ),
  );
  const reasons = validateApSupabaseParityPlanV1(plan);
  assert.equal(reasons.length, 0);

  const csvRows = loadApRetailerLinksCsvV1(REPO_ROOT);
  const setbacks = detectBatchProductionSetbacksV1({
    plan,
    csvRows,
    parityValidationReasons: reasons,
    supabaseParityApplyArtifactPresent: false,
  });
  const reportNameSetback = setbacks.find(
    (s) => s.detector_id === "supabase_parity_rejects_valid_report_name",
  );
  assert.equal(reportNameSetback?.fired, false);
});

test("post-apply spent plan fires planned_rows_spent and test-expectation setbacks", () => {
  const plan = JSON.parse(
    readFileSync(
      `${REPO_ROOT}/data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json`,
      "utf8",
    ),
  );
  const csvRows = loadApRetailerLinksCsvV1(REPO_ROOT);
  const setbacks = detectBatchProductionSetbacksV1({
    plan,
    csvRows,
    parityValidationReasons: [],
    supabaseParityApplyArtifactPresent: false,
  });
  assert.equal(
    setbacks.find((s) => s.detector_id === "planned_rows_spent_post_apply")?.fired,
    true,
  );
  assert.equal(
    setbacks.find((s) => s.detector_id === "tests_expect_pre_apply_after_apply")?.fired,
    true,
  );
});

test("slug with OEM direct_buyable plus Amazon row gets SAFE_MULTIPLE and primary-policy-unknown", () => {
  const synthetic = classifySlugSafetyV1("fixture-multi-path", [
    {
      filter_slug: "fixture-multi-path",
      retailer_name: "OEM",
      affiliate_url: "https://brand.example/pdp",
      is_primary: "true",
      retailer_key: "oem-catalog",
      retailer_slug: "oem-catalog",
      destination_url: "https://brand.example/pdp",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "",
      browser_truth_checked_at: "",
    },
    {
      filter_slug: "fixture-multi-path",
      retailer_name: "Amazon",
      affiliate_url: "https://www.amazon.com/dp/B000000000?tag=buckparts20-20",
      is_primary: "false",
      retailer_key: "amazon",
      retailer_slug: "amazon",
      destination_url: "https://www.amazon.com/dp/B000000000?tag=buckparts20-20",
      browser_truth_classification: "direct_buyable",
      browser_truth_notes: "",
      browser_truth_checked_at: "",
    },
  ]);
  assert.ok(synthetic.classifications.includes("SAFE_MULTIPLE_BUY_PATHS"));
  assert.ok(synthetic.classifications.includes("SAFE_BUT_PRIMARY_POLICY_UNKNOWN"));
});

test("checklist builder does not mutate CSV", () => {
  const before = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  buildBatchProductionOperatingChecklistV1({
    rootDir: REPO_ROOT,
    registryPaths: [BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1],
  });
  const after = readFileSync(`${REPO_ROOT}/data/air-purifier/retailer_links.csv`, "utf8");
  assert.equal(before, after);
});
