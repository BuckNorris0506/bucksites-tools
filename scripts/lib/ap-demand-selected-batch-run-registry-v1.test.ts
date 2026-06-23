import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1,
  AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1,
  AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1,
  loadApDemandSelectedBatchRunRegistryV1,
  validateApDemandSelectedBatchRunRegistryDocumentV1,
} from "./ap-demand-selected-batch-run-registry-v1";

const REPO_ROOT = process.cwd();

function validApproval(runId = "ap-demand-selected-batch-run-v1-2026-06-23") {
  return {
    status: "approved",
    approved_at: "2026-06-23T18:00:00.000Z",
    approved_by: "founder",
    run_id: runId,
    scope: "read_only_browser_discovery_only",
    evidence_write_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    netlify_api_authorized: false,
    owner_approval_artifact_rel_path: AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1,
  };
}

function validRegistry(overrides: Record<string, unknown> = {}) {
  return {
    contract: "batch_production_proven_run_v1",
    read_only: true,
    data_mutation: false,
    run_id: "ap-demand-selected-batch-run-v1-2026-06-23",
    wedge: "air_purifier",
    closeout_complete: false,
    proposed_batch_id: AP_DEMAND_SELECTED_BATCH_CANDIDATE_ID_V1,
    proposed_slugs: ["holmes-hapf30", "vornado-md1-0023"],
    excluded_slugs: ["levoit-rf-meta-air"],
    stage: "evidence_collection_planned",
    batch_start_mode: "read_only_evidence_planning_only",
    created_at: "2026-06-23T16:05:00.000Z",
    ...overrides,
  };
}

test("validateApDemandSelectedBatchRunRegistryDocumentV1 accepts open demand-selected registry", () => {
  const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(validRegistry());
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.doc.proposed_slugs.length, 2);
    assert.equal(parsed.doc.excluded_slugs?.length, 1);
  }
});

test("validateApDemandSelectedBatchRunRegistryDocumentV1 rejects closed registry", () => {
  const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(
    validRegistry({ closeout_complete: true }),
  );
  assert.equal(parsed.ok, false);
});

test("validateApDemandSelectedBatchRunRegistryDocumentV1 rejects approval with mutation flags true", () => {
  const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(
    validRegistry({
      owner_read_only_evidence_collection_approval: {
        ...validApproval(),
        evidence_write_authorized: true,
      },
    }),
  );
  assert.equal(parsed.ok, false);
});

test("validateApDemandSelectedBatchRunRegistryDocumentV1 accepts owner read-only evidence approval", () => {
  const parsed = validateApDemandSelectedBatchRunRegistryDocumentV1(
    validRegistry({
      stage: "read_only_evidence_collection_authorized",
      owner_read_only_evidence_collection_approval: validApproval(),
    }),
  );
  assert.equal(parsed.ok, true);
});

test("loadApDemandSelectedBatchRunRegistryV1 returns PROVEN on repo checkout", () => {
  const loaded = loadApDemandSelectedBatchRunRegistryV1({ rootDir: REPO_ROOT });
  if (
    !existsSync(
      path.join(
        REPO_ROOT,
        "data/air-purifier/batch-production/run-registry/ap-demand-selected-batch-run-v1-2026-06-23.json",
      ),
    )
  ) {
    return;
  }
  assert.equal(loaded.status, "PROVEN");
  assert.equal(loaded.run_id, "ap-demand-selected-batch-run-v1-2026-06-23");
  assert.equal(loaded.stage, "read_only_evidence_collection_authorized");
  assert.equal(loaded.batch_start_mode, "read_only_browser_discovery_only");
  assert.equal(loaded.proposed_slug_count, 10);
  assert.equal(loaded.excluded_slug_count, 1);
  assert.equal(loaded.read_only_evidence_collection_authorized, true);
  assert.equal(
    loaded.owner_approval_artifact_rel_path,
    AP_DEMAND_SELECTED_OWNER_APPROVAL_ARTIFACT_REL_V1,
  );
  assert.equal(loaded.evidence_collection_started, false);
});

test("loadApDemandSelectedBatchRunRegistryV1 returns MISSING in empty temp dir", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ap-demand-selected-registry-"));
  const loaded = loadApDemandSelectedBatchRunRegistryV1({ rootDir: dir });
  assert.equal(loaded.status, "MISSING");
  assert.equal(loaded.run_id, null);
});

test("loadApDemandSelectedBatchRunRegistryV1 ignores closed AP registries", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ap-demand-selected-registry-"));
  const relDir = path.join(dir, AP_DEMAND_SELECTED_BATCH_RUN_REGISTRY_DIR_REL_V1);
  mkdirSync(relDir, { recursive: true });
  writeFileSync(
    path.join(relDir, "ap-batch-v2-proven-run-v1.json"),
    JSON.stringify({
      contract: "batch_production_proven_run_v1",
      read_only: true,
      data_mutation: false,
      run_id: "ap-batch-v2-2026-05-24",
      wedge: "air_purifier",
      closeout_complete: true,
    }),
    "utf8",
  );
  const loaded = loadApDemandSelectedBatchRunRegistryV1({ rootDir: dir });
  assert.equal(loaded.status, "MISSING");
});
