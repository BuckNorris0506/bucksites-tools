import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
  loadApRepoRuntimeConvergenceAcceptanceV1,
  validateApRepoRuntimeConvergenceAcceptanceV1,
} from "./ap-repo-runtime-convergence-acceptance-v1";
import type { ApSupabaseVsCsvDiffReportV1 } from "./air-purifier-supabase-vs-csv-diff-v1";
import { AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1 } from "./air-purifier-supabase-vs-csv-diff-v1";
import {
  buildRepoRuntimeConvergenceGateReportV1,
  classifyRepoRuntimeConvergenceGateStateV1,
  extractApSafeCtaConvergenceFromDiffV1,
  REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1,
  repoRuntimeConvergenceGateGrantsMutationAuthorityV1,
  resolveRepoRuntimeConvergenceGateExitCodeV1,
} from "./repo-runtime-convergence-gate-v1";

const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

function minimalDiffReport(overrides: {
  csv_safe?: number;
  supabase_safe?: number;
  supabase_truth_status?: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
}): ApSupabaseVsCsvDiffReportV1 {
  const csv = overrides.csv_safe ?? 10;
  const supabase = overrides.supabase_safe ?? 10;
  const table = {
    csv_count: 0,
    supabase_count: 0,
    csv_only_count: 0,
    supabase_only_count: 0,
    shared_count: 0,
    field_drift_count: 0,
  };
  return {
    contract: AP_SUPABASE_VS_CSV_DIFF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: "2026-06-23T09:09:33.474Z",
    git_head_hint: null,
    exact_repo_paths_read: [],
    supabase_tables_queried: [],
    supabase_truth_status: overrides.supabase_truth_status ?? "CHECKED",
    supabase_unavailable_reason:
      overrides.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE" ? "fixture" : null,
    summary: {
      brands: table,
      air_purifier_filters: table,
      air_purifier_models: table,
      air_purifier_filter_aliases: table,
      air_purifier_model_aliases: table,
      air_purifier_compatibility_mappings: table,
      air_purifier_retailer_links: table,
      seed_import_blocker_count: 0,
      browser_truth_drift_count: 0,
      dangerous_db_only_slug_count: 0,
      csv_safe_direct_buyable_count: csv,
      supabase_safe_direct_buyable_count: supabase,
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
  };
}

function writeAcceptance(root: string, body: Record<string, unknown>): void {
  const rel = AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1;
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

test("gate report is read-only and grants no mutation authority", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-ro-")),
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({}),
    },
  });
  assert.equal(report.contract, REPO_RUNTIME_CONVERGENCE_GATE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.supabase_writes, false);
  assert.equal(repoRuntimeConvergenceGateGrantsMutationAuthorityV1(), false);
});

test("CONVERGED when aggregate safe CTA counts match", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-conv-")),
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 34 }),
    },
  });
  assert.equal(report.state, "CONVERGED");
  assert.equal(report.deploy_allowed, true);
  assert.equal(report.exit_code, 0);
  assert.equal(report.measurement.gap_size, 0);
});

test("BLOCKED under enforce when gap exists and acceptance missing", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-block-")),
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.deploy_allowed, false);
  assert.equal(report.exit_code, 1);
  assert.equal(report.measurement.gap_size, 6);
});

test("EXPLICITLY_DIVERGED when acceptance matches live gap", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rrcg-div-"));
  writeAcceptance(root, {
    contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    wedge: "air_purifier",
    accepted_at: "2026-06-23T12:00:00.000Z",
    accepted_by: "jared",
    reason: "parity apply pending",
    re_review_by: "2026-07-01T00:00:00.000Z",
    measured_gap: {
      csv_safe_direct_buyable_count: 34,
      supabase_safe_direct_buyable_count: 28,
      gap_size: 6,
      measured_at: "2026-06-23T09:09:33.474Z",
      supabase_truth_status: "CHECKED",
    },
  });

  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: root,
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "EXPLICITLY_DIVERGED");
  assert.equal(report.deploy_allowed, true);
  assert.equal(report.exit_code, 0);
});

test("BLOCKED when acceptance gap mismatches live measurement", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rrcg-mismatch-"));
  writeAcceptance(root, {
    contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    wedge: "air_purifier",
    accepted_at: "2026-06-23T12:00:00.000Z",
    accepted_by: "jared",
    reason: "stale",
    re_review_by: "2026-07-01T00:00:00.000Z",
    measured_gap: {
      csv_safe_direct_buyable_count: 34,
      supabase_safe_direct_buyable_count: 28,
      gap_size: 6,
      measured_at: "2026-06-23T09:09:33.474Z",
      supabase_truth_status: "CHECKED",
    },
  });

  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: root,
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 30 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.ok(report.acceptance_validation_errors.length > 0);
});

test("BLOCKED when acceptance expired", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rrcg-expired-"));
  writeAcceptance(root, {
    contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    wedge: "air_purifier",
    accepted_at: "2026-06-01T12:00:00.000Z",
    accepted_by: "jared",
    reason: "expired",
    re_review_by: "2026-06-05T00:00:00.000Z",
    measured_gap: {
      csv_safe_direct_buyable_count: 34,
      supabase_safe_direct_buyable_count: 28,
      gap_size: 6,
      measured_at: "2026-06-23T09:09:33.474Z",
      supabase_truth_status: "CHECKED",
    },
  });

  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: root,
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
});

test("BLOCKED when supabase truth status is not CHECKED", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-db-")),
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () =>
        minimalDiffReport({
          csv_safe: 34,
          supabase_safe: 28,
          supabase_truth_status: "UNKNOWN_DB_UNAVAILABLE",
        }),
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.exit_code, 1);
});

test("BLOCKED when measurement throws under enforce", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-throw-")),
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => {
        throw new Error("missing Supabase env");
      },
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.match(report.measurement.measurement_error ?? "", /missing Supabase env/);
  assert.equal(report.exit_code, 1);
});

test("audit mode exits 0 even when BLOCKED", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-audit-")),
    enforce: false,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.exit_code, 0);
});

test("invalid acceptance JSON is BLOCKED under enforce", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rrcg-badjson-"));
  const rel = AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1;
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, "{ not-json", "utf8");

  const load = loadApRepoRuntimeConvergenceAcceptanceV1(root);
  assert.equal(load.status, "invalid_json");

  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: root,
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
});

test("classify and exit-code mapping are deterministic", () => {
  const live = extractApSafeCtaConvergenceFromDiffV1(
    minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
  );
  const first = classifyRepoRuntimeConvergenceGateStateV1({
    live,
    measurement_error: null,
    acceptance_load: { status: "missing", artifact_path: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1 },
    acceptance_validation_errors: [],
  });
  const second = classifyRepoRuntimeConvergenceGateStateV1({
    live,
    measurement_error: null,
    acceptance_load: { status: "missing", artifact_path: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1 },
    acceptance_validation_errors: [],
  });
  assert.deepEqual(first, second);
  assert.equal(resolveRepoRuntimeConvergenceGateExitCodeV1({ state: "BLOCKED", enforce: true }), 1);
  assert.equal(resolveRepoRuntimeConvergenceGateExitCodeV1({ state: "BLOCKED", enforce: false }), 0);
  assert.equal(resolveRepoRuntimeConvergenceGateExitCodeV1({ state: "CONVERGED", enforce: true }), 0);
});

test("acceptance validation requires future re_review_by", () => {
  const validation = validateApRepoRuntimeConvergenceAcceptanceV1({
    acceptance: {
      contract: AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      wedge: "air_purifier",
      accepted_at: "2026-06-23T12:00:00.000Z",
      accepted_by: "jared",
      reason: "test",
      re_review_by: "2026-06-05T00:00:00.000Z",
      measured_gap: {
        csv_safe_direct_buyable_count: 34,
        supabase_safe_direct_buyable_count: 28,
        gap_size: 6,
        measured_at: "2026-06-23T09:09:33.474Z",
        supabase_truth_status: "CHECKED",
      },
    },
    live: {
      csv_safe_direct_buyable_count: 34,
      supabase_safe_direct_buyable_count: 28,
      gap_size: 6,
      supabase_truth_status: "CHECKED",
      measured_at: "2026-06-23T09:09:33.474Z",
    },
    now: FIXED_NOW(),
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes("future")));
});

test("gap with no acceptance artifact is BLOCKED under enforce", async () => {
  const report = await buildRepoRuntimeConvergenceGateReportV1({
    rootDir: mkdtempSync(path.join(tmpdir(), "rrcg-no-accept-")),
    enforce: true,
    deps: {
      now: FIXED_NOW,
      buildDiffReport: async () => minimalDiffReport({ csv_safe: 34, supabase_safe: 28 }),
    },
  });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.measurement.gap_size, 6);
});
