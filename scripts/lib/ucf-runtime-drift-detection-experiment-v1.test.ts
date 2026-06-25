import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1 } from "./air-purifier-supabase-vs-csv-diff-v1";
import {
  buildUcfRuntimeDriftDetectionExperimentReportV1,
  classifyUcfRuntimeDriftDetectionVerdictV1,
  extractSafeCtaCountsFromDiffV1,
  inventoryApSafeCtaDriftArtifactsV1,
  ucfRuntimeDriftDetectionExperimentGrantsMutationAuthorityV1,
  UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1,
} from "./ucf-runtime-drift-detection-experiment-v1";

const REPO_ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

test("runtime drift experiment report is read-only and performs no Supabase writes", () => {
  const report = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.contract, UCF_RUNTIME_DRIFT_DETECTION_EXPERIMENT_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.supabase_writes, false);
  assert.equal(ucfRuntimeDriftDetectionExperimentGrantsMutationAuthorityV1(), false);
});

test("classification is deterministic from committed diff artifact", () => {
  const first = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });
  const second = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });

  assert.equal(first.verdict, second.verdict);
  assert.deepEqual(first.safe_cta_counts, second.safe_cta_counts);
  assert.deepEqual(
    first.drift_timeline.map((event) => event.event),
    second.drift_timeline.map((event) => event.event),
  );
});

test("repo truth documents 34-vs-28 safe CTA gap in committed diff", () => {
  const report = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: REPO_ROOT,
    now: FIXED_NOW,
  });

  assert.equal(report.safe_cta_counts.csv_safe_direct_buyable_count, 34);
  assert.equal(report.safe_cta_counts.supabase_safe_direct_buyable_count, 28);
  assert.equal(report.safe_cta_counts.gap_size, 6);
  assert.equal(report.verdict, "DRIFT_DETECTION_OBSERVATIONAL");
  assert.equal(report.pre_discovery_scheduled_reaudit_catch, false);
  assert.equal(report.drift_onset_timing_provable, false);
});

test("UNKNOWN verdict when aggregate safe CTA counts cannot be loaded", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ucf-drift-exp-"));
  const verdict = classifyUcfRuntimeDriftDetectionVerdictV1({
    safe_cta_counts: extractSafeCtaCountsFromDiffV1(null),
    drift_onset_timing_provable: false,
    pre_discovery_scheduled_reaudit_catch: false,
    observational_detectors_present: false,
    enforced_aggregate_detector_present: false,
  });
  assert.equal(verdict, "UNKNOWN");

  const report = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: root,
    now: FIXED_NOW,
  });
  assert.equal(report.verdict, "UNKNOWN");
  assert.equal(report.safe_cta_counts.gap_size, null);
});

test("inventory marks referenced convergence artifacts missing from repo", () => {
  const inventory = inventoryApSafeCtaDriftArtifactsV1(REPO_ROOT);
  const missing = inventory.filter((row) => row.role === "referenced_missing");
  assert.ok(missing.length >= 1);
  assert.ok(missing.some((row) => row.relative_path.includes("ap-runtime-convergence-gap-v1.json")));
});

test("fixture with only diff still classifies observational not enforced", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ucf-drift-exp-fixture-"));
  const auditsDir = path.join(root, "data/air-purifier/batch-production/audits");
  mkdirSync(auditsDir, { recursive: true });
  writeFileSync(
    path.join(auditsDir, "ap-supabase-vs-csv-diff-v1.json"),
    JSON.stringify({
      contract: AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      generated_at: "2026-06-23T09:09:33.474Z",
      exact_repo_paths_read: [],
      supabase_tables_queried: [],
      supabase_truth_status: "CHECKED",
      supabase_unavailable_reason: null,
      summary: {
        brands: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_filters: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_models: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_filter_aliases: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_model_aliases: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_compatibility_mappings: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        air_purifier_retailer_links: {
          csv_count: 0,
          supabase_count: 0,
          csv_only_count: 0,
          supabase_only_count: 0,
          shared_count: 0,
          field_drift_count: 0,
        },
        seed_import_blocker_count: 0,
        browser_truth_drift_count: 0,
        dangerous_db_only_slug_count: 0,
        csv_safe_direct_buyable_count: 10,
        supabase_safe_direct_buyable_count: 7,
      },
      brands: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_filters: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_models: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_filter_aliases: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_model_aliases: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_compatibility_mappings: { csv_only: [], supabase_only: [], field_drift: [] },
      air_purifier_retailer_links: {
        csv_only: [],
        supabase_only: [],
        field_drift: [],
        browser_truth_drift: [],
      },
      seed_import_blockers: [],
      dangerous_db_only_slugs: [],
      authorization_recommendations: {
        backup_export: "HOLD",
        oem_pre_alignment_sql: "HOLD",
        seed_import: "HOLD",
        browser_truth_parity_apply: "HOLD",
        stale_db_delete_packet: "HOLD",
        rationale: [],
      },
      recommended_next_action: "fixture",
      proven_facts: [],
      inferred_facts: [],
      unknown_facts: [],
    }),
    "utf8",
  );

  const report = buildUcfRuntimeDriftDetectionExperimentReportV1({
    rootDir: root,
    now: FIXED_NOW,
  });
  assert.equal(report.safe_cta_counts.gap_size, 3);
  assert.equal(report.verdict, "DRIFT_DETECTION_OBSERVATIONAL");
});
