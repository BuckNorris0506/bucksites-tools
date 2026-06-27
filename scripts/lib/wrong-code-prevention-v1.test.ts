import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildWrongCodePreventionRepoBaselineArtifactV1,
  loadWrongCodePreventionArtifactV1,
  validateWrongCodePreventionArtifactV1,
  WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
  WRONG_CODE_PREVENTION_CONTRACT_V1,
  WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1,
} from "./wrong-code-prevention-v1";

const FIXED_NOW = () => new Date("2026-06-26T18:00:00.000Z");

function writeArtifact(root: string, body: Record<string, unknown>): void {
  const abs = path.join(root, WRONG_CODE_PREVENTION_ARTIFACT_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

function validArtifactBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contract: WRONG_CODE_PREVENTION_CONTRACT_V1,
    read_only: true,
    generated_at: "2026-06-26T17:00:00.000Z",
    git_head_hint: "abc123def456",
    overall_status: "WARN",
    stale_direct_buyable_count: 2,
    dangerous_db_only_slug_count: 13,
    handoff_head_drift_commits: 3,
    sql_plan_safety_status: "WARN",
    deprecated_slug_reference_count: 0,
    checks: [
      {
        check_id: "dangerous_db_only_slugs",
        status: "WARN",
        notes: "fixture",
      },
    ],
    blockers: [],
    warnings: ["handoff_head_drift_commits=3"],
    recommended_next_action: "Review warnings before apply.",
    ...overrides,
  };
}

test("validateWrongCodePreventionArtifactV1 accepts contract shape", () => {
  const result = validateWrongCodePreventionArtifactV1(validArtifactBody());
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.artifact.contract, WRONG_CODE_PREVENTION_CONTRACT_V1);
    assert.equal(result.artifact.read_only, true);
  }
});

test("validateWrongCodePreventionArtifactV1 rejects wrong contract", () => {
  const result = validateWrongCodePreventionArtifactV1(
    validArtifactBody({ contract: "wrong_contract_v0" }),
  );
  assert.equal(result.valid, false);
});

test("loadWrongCodePreventionArtifactV1 missing returns missing status", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-missing-"));
  const loaded = loadWrongCodePreventionArtifactV1({ rootDir: root, now: FIXED_NOW });
  assert.equal(loaded.status, "missing");
});

test("loadWrongCodePreventionArtifactV1 loaded FRESH when within stale window", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-fresh-"));
  writeArtifact(root, validArtifactBody({ generated_at: "2026-06-26T17:30:00.000Z" }));
  const loaded = loadWrongCodePreventionArtifactV1({ rootDir: root, now: FIXED_NOW });
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") {
    assert.equal(loaded.freshness.freshness_status, "FRESH");
    assert.equal(loaded.artifact.overall_status, "WARN");
  }
});

test("loadWrongCodePreventionArtifactV1 loaded STALE when older than stale window", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-stale-"));
  writeArtifact(root, validArtifactBody({ generated_at: "2026-06-20T00:00:00.000Z" }));
  const loaded = loadWrongCodePreventionArtifactV1({ rootDir: root, now: FIXED_NOW });
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") {
    assert.equal(loaded.freshness.freshness_status, "STALE");
  }
  assert.ok(WRONG_CODE_PREVENTION_STALE_AFTER_MS_V1 > 0);
});

test("repo baseline artifact is read-only and includes hyperagent write guard check", () => {
  const root = mkdtempSync(path.join(tmpdir(), "wcp-baseline-"));
  const artifact = buildWrongCodePreventionRepoBaselineArtifactV1({
    rootDir: root,
    deps: {
      now: FIXED_NOW,
      gitHeadHint: () => "deadbeef1234",
      handoffHeadDriftCommits: () => 0,
    },
  });
  assert.equal(artifact.contract, WRONG_CODE_PREVENTION_CONTRACT_V1);
  assert.equal(artifact.read_only, true);
  assert.ok(
    artifact.checks.some((c) => c.check_id === "hyperagent_write_path_not_enabled" && c.status === "PASS"),
  );
  const validated = validateWrongCodePreventionArtifactV1(artifact);
  assert.equal(validated.valid, true);
});
