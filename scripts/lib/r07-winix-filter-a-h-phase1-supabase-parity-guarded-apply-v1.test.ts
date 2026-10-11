import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  R07_PHASE1_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
  R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1,
  runR07Phase1SupabaseParityGuardedApplyV1,
  type R07Phase1ParityPlanV1,
} from "./r07-winix-filter-a-h-phase1-supabase-parity-guarded-apply-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-10-11T21:00:00.000Z");

function writeOwnerQueueSuperseded(root: string): void {
  const queueDir = path.join(root, "data/owner-decisions/queue/requests");
  mkdirSync(queueDir, { recursive: true });
  writeFileSync(
    path.join(root, "data/owner-decisions/queue/owner-decision-queue-v1.json"),
    `${JSON.stringify(
      {
        contract: "owner_decision_queue_v1",
        read_only: true,
        request_count: 0,
        pending_count: 0,
        request_artifact_paths: [],
        requests: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function writeTrustRegistry(root: string): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    readFileSync(path.join(ROOT, "data/truth-integrity/truth-integrity-registry-v1.json"), "utf8"),
    "utf8",
  );
}

function copyFixtureArtifacts(root: string): void {
  mkdirSync(path.join(root, "data/ops/site-integrity/production-integrity-baseline-2026-10-10"), {
    recursive: true,
  });
  mkdirSync(path.join(root, "data/owner-decisions"), { recursive: true });
  for (const rel of [
    R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    R07_PHASE1_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
  ]) {
    writeFileSync(path.join(root, rel), readFileSync(path.join(ROOT, rel), "utf8"), "utf8");
  }
}

test("R07 parity dry-run ready when trust, IO, approval, and plan gates pass", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "r07-parity-"));
  try {
    copyFixtureArtifacts(root);
    writeTrustRegistry(root);
    writeOwnerQueueSuperseded(root);
    const report = await runR07Phase1SupabaseParityGuardedApplyV1({
      rootDir: root,
      mode: "dry_run",
      now: FIXED_NOW,
      env: {
        BUCKPARTS_IO_CAPABILITY: "MUTATION",
        BUCKPARTS_R07_PHASE1_SUPABASE_PARITY_MUTATION_ENABLED: "1",
      },
    });
    assert.equal(report.apply_status, "DRY_RUN_READY");
    assert.equal(report.planned_operations.length, 6);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("R07 parity apply uses injected writer and does not call live Supabase in unit test", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "r07-parity-apply-"));
  try {
    copyFixtureArtifacts(root);
    writeTrustRegistry(root);
    writeOwnerQueueSuperseded(root);
    let called = false;
    const report = await runR07Phase1SupabaseParityGuardedApplyV1({
      rootDir: root,
      mode: "apply",
      now: FIXED_NOW,
      env: {
        BUCKPARTS_IO_CAPABILITY: "MUTATION",
        BUCKPARTS_R07_PHASE1_SUPABASE_PARITY_MUTATION_ENABLED: "1",
      },
      applyFn: async (plan: R07Phase1ParityPlanV1) => {
        called = true;
        assert.equal(plan.expected_operation_count, 6);
        return { ok: true, errors: [], applied: ["filter_update:winix-hepa-115115"] };
      },
    });
    assert.equal(called, true);
    assert.equal(report.apply_status, "APPLIED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
