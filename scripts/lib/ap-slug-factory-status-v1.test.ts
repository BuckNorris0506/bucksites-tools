import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  AP_SLUG_FACTORY_STAGE_IDS_V1,
  AP_SLUG_FACTORY_STATUS_CONTRACT_V1,
  buildApSlugFactoryStatusV1,
} from "./ap-slug-factory-status-v1";

const REPO_ROOT = process.cwd();
const WINIX_SLUG = "winix-filter-h-116130";

const FORBIDDEN_MUTATION_PATHS = [
  "data/air-purifier/retailer_links.csv",
  "data/air-purifier/filters.csv",
  "data/air-purifier/filter_aliases.csv",
  "data/air-purifier/compatibility_mappings.csv",
];

function snapshotMtimes(paths: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const rel of paths) {
    const abs = path.join(REPO_ROOT, rel);
    if (existsSync(abs)) map.set(rel, statSync(abs).mtimeMs);
  }
  return map;
}

function stageById(
  report: ReturnType<typeof buildApSlugFactoryStatusV1>,
  stageId: (typeof AP_SLUG_FACTORY_STAGE_IDS_V1)[number],
) {
  const row = report.stage_statuses.find((s) => s.stage_id === stageId);
  assert.ok(row, `missing stage ${stageId}`);
  return row!;
}

test("ap_slug_factory_status_v1 is read-only and does not write files", () => {
  const before = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);
  const report = buildApSlugFactoryStatusV1({ rootDir: REPO_ROOT, slug: WINIX_SLUG });
  const after = snapshotMtimes(FORBIDDEN_MUTATION_PATHS);

  assert.equal(report.contract, AP_SLUG_FACTORY_STATUS_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);

  for (const rel of FORBIDDEN_MUTATION_PATHS) {
    if (before.has(rel)) assert.equal(after.get(rel), before.get(rel));
  }
});

test("winix-filter-h-116130 resolves through supabase parity with production smoke unknown", () => {
  const report = buildApSlugFactoryStatusV1({ rootDir: REPO_ROOT, slug: WINIX_SLUG });

  assert.equal(report.slug, WINIX_SLUG);
  assert.equal(stageById(report, "catalog_present").status, "complete");
  assert.equal(stageById(report, "discovery_validated").status, "complete");
  assert.equal(stageById(report, "canonical_evidence_present").status, "complete");
  assert.equal(stageById(report, "aggregator_auto_apply_eligible").status, "complete");
  assert.equal(stageById(report, "apply_plan_ready").status, "complete");
  assert.equal(stageById(report, "executor_dry_run_ready").status, "complete");
  assert.equal(stageById(report, "csv_apply_complete").status, "complete");
  assert.equal(stageById(report, "repo_validation_complete").status, "complete");
  assert.equal(stageById(report, "supabase_parity_applied").status, "complete");
  assert.equal(stageById(report, "production_smoke_complete").status, "unknown");

  assert.equal(report.next_unresolved_stage_id, "production_smoke_complete");
  assert.equal(report.current_stage_id, "production_smoke_complete");
  assert.equal(report.next_owner_gate, "production_smoke");
  assert.ok(report.artifact_paths.apply_plan_path?.includes(WINIX_SLUG));
  assert.ok(report.artifact_paths.supabase_commit_result_doc_path?.includes("WINIX"));
  assert.equal(report.artifact_paths.production_smoke_result_path, null);

  assert.equal(stageById(report, "supabase_parity_applied").proof_kind, "documented_only");
  assert.ok(
    report.documented_facts.some((f) =>
      f.startsWith("DOCUMENTED: supabase_parity_applied"),
    ),
  );
  assert.ok(
    !report.proven_facts.some((f) => f.includes("supabase_parity_applied")),
  );
  assert.ok(
    report.unknown_facts.some((f) => f.includes("production_smoke_complete")),
  );
});

test("unknown slug returns blocked catalog stage safely", () => {
  const report = buildApSlugFactoryStatusV1({
    rootDir: REPO_ROOT,
    slug: "definitely-not-a-real-filter-slug-zzzz",
  });

  assert.equal(stageById(report, "catalog_present").status, "blocked");
  assert.equal(report.next_unresolved_stage_id, "catalog_present");
  assert.equal(report.current_stage_id, "catalog_present");
  assert.equal(report.next_owner_gate, "catalog_ingest");
  assert.ok(stageById(report, "discovery_validated").status === "unknown");
  assert.equal(report.artifact_paths.evidence_result_path, null);
});

test("winix commit result doc is present in repo for parity stage proof", () => {
  const docPath = path.join(
    REPO_ROOT,
    "docs/air-purifier/AP-SUPABASE-SQL-COMMIT-RESULT-WINIX-FILTER-H-116130-v1.md",
  );
  assert.ok(existsSync(docPath));
  const body = readFileSync(docPath, "utf8");
  assert.ok(body.includes("ALREADY_APPLIED"));
  assert.ok(body.includes(WINIX_SLUG));
});

test("winix-hepa-115115 does not get false apply_plan_ready from spent batch plan", () => {
  const HEPA_SLUG = "winix-hepa-115115";
  const report = buildApSlugFactoryStatusV1({ rootDir: REPO_ROOT, slug: HEPA_SLUG });

  assert.equal(stageById(report, "catalog_present").status, "complete");
  assert.notEqual(stageById(report, "apply_plan_ready").status, "complete");
  assert.equal(stageById(report, "apply_plan_ready").proof_kind, "unknown");
  assert.ok(
    stageById(report, "apply_plan_ready").evidence.some((e) => e.includes("batch_only")),
  );
  assert.ok(
    stageById(report, "apply_plan_ready").blocker_reasons.some((b) =>
      b.includes("batch apply plan row spent"),
    ),
  );
  assert.equal(report.next_unresolved_stage_id, "discovery_validated");
});
