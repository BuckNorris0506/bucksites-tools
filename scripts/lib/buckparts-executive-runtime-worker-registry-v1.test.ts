import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  DISPATCH_ALLOWLIST_ENTRIES_V1,
} from "./buckparts-command-center-dispatch-allowlist-v1";
import {
  EXECUTIVE_RUNTIME_WORKER_REGISTRY_CONTRACT_V1,
  buildExecutiveRuntimeWorkerRegistryV1,
  workerRegistrySucceededV1,
} from "./buckparts-executive-runtime-worker-registry-v1";

const LIB_ABS = fileURLToPath(import.meta.url).replace(/\.test\.ts$/, ".ts");
const CLI_ABS = path.resolve(
  path.dirname(LIB_ABS),
  "../run-buckparts-executive-runtime-worker-registry-v1.ts",
);
const REPO_ROOT = path.resolve(path.dirname(LIB_ABS), "../..");

test("dispatch-eligible workers are a 1:1 projection of the existing allowlist", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  assert.equal(workerRegistrySucceededV1(snapshot), true);
  assert.equal(snapshot.contract, EXECUTIVE_RUNTIME_WORKER_REGISTRY_CONTRACT_V1);
  assert.equal(snapshot.authority_source, false);
  assert.equal(snapshot.dispatch_eligible_count, DISPATCH_ALLOWLIST_ENTRIES_V1.length);
  const eligible = snapshot.workers.filter((row) => row.authority.dispatch_eligible);
  assert.equal(eligible.length, DISPATCH_ALLOWLIST_ENTRIES_V1.length);
  for (const entry of DISPATCH_ALLOWLIST_ENTRIES_V1) {
    assert.ok(
      eligible.some((row) => row.exact_command === entry.exact_command),
      `missing allowlist command ${entry.exact_command}`,
    );
  }
});

test("does not invent dispatch-eligible workers beyond the allowlist", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  const extra = snapshot.workers.filter(
    (row) =>
      row.authority.dispatch_eligible &&
      !DISPATCH_ALLOWLIST_ENTRIES_V1.some((entry) => entry.exact_command === row.exact_command),
  );
  assert.deepEqual(extra, []);
});

test("owner-review allowlist workers cannot run unattended", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  const ownerReview = snapshot.workers.filter(
    (row) => row.authority.dispatch_eligible && row.founder_gate,
  );
  assert.ok(ownerReview.length > 0);
  for (const row of ownerReview) {
    assert.equal(row.can_run_unattended, false);
    assert.equal(row.can_run_unattended_honesty, "PROVEN");
    assert.equal(row.authority.owner_review_required, true);
  }
});

test("agent contract template is registered and not dispatch-eligible", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  const agent = snapshot.workers.find(
    (row) => row.worker_id === "agent_contract:read_only_evidence_collection_v1",
  );
  assert.ok(agent);
  assert.equal(agent?.authority.dispatch_eligible, false);
  assert.equal(agent?.founder_gate, true);
  assert.equal(agent?.can_run_unattended, false);
  assert.equal(agent?.current_runtime_status, "IMPLEMENTED_NOT_DISPATCH_ELIGIBLE");
  assert.equal(agent?.authority.mutation_allowed, false);
});

test("guarded apply exists and is excluded from dispatch", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  const guarded = snapshot.workers.find(
    (row) => row.worker_id === "guarded_apply:excluded_from_dispatch",
  );
  assert.ok(guarded);
  assert.equal(
    guarded?.exact_command,
    BUCKPARTS_RETAILER_LINK_PARITY_GUARDED_APPLY_WRITE_COMMAND_V1,
  );
  assert.equal(guarded?.authority.dispatch_eligible, false);
  assert.equal(guarded?.founder_gate, true);
  assert.equal(guarded?.can_run_unattended, false);
  assert.ok(
    !DISPATCH_ALLOWLIST_ENTRIES_V1.some((entry) => entry.exact_command === guarded?.exact_command),
  );
});

test("estimated duration is UNKNOWN; no NBA/dispatch/mutation", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  assert.equal(snapshot.dispatch_invoked, false);
  assert.equal(snapshot.nba_authority, false);
  assert.equal(snapshot.dispatch_authority, false);
  assert.equal(snapshot.mutation_authorized, false);
  assert.equal(snapshot.selected_work, null);
  assert.equal(snapshot.recommended_action, null);
  for (const row of snapshot.workers) {
    assert.equal(row.estimated_duration, null);
    assert.equal(row.estimated_duration_honesty, "UNKNOWN");
    assert.equal(row.authority.mutation_allowed, false);
    assert.equal(row.authority.nba_authority, false);
    assert.equal(row.authority.this_registry_is_not_an_authority_source, true);
  }
});

test("missing package.json fails closed", () => {
  const root = mkdtempSync(path.join(tmpdir(), "worker-registry-"));
  try {
    const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: root });
    assert.equal(snapshot.cycle_status, "FAIL_CLOSED");
    assert.ok(snapshot.blocked_reasons.some((row) => row.includes("package.json")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("allowlisted tsx entrypoint missing is ENTRYPOINT_MISSING", () => {
  const root = mkdtempSync(path.join(tmpdir(), "worker-registry-ep-"));
  try {
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        scripts: {
          "buckparts:retailer-link-parity-correction": "tsx scripts/missing-parity.ts",
          lint: "echo lint",
          build: "echo build",
        },
      }),
      "utf8",
    );
    const snapshot = buildExecutiveRuntimeWorkerRegistryV1({
      rootDir: root,
      fileExists: () => false,
    });
    const detect = snapshot.workers.find(
      (row) => row.worker_id === "dispatch:retailer_link_parity:detect",
    );
    assert.equal(detect?.current_runtime_status, "ENTRYPOINT_MISSING");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source files do not dispatch, mutate, or claim NBA", () => {
  const lib = readFileSync(LIB_ABS, "utf8");
  const cli = readFileSync(CLI_ABS, "utf8");
  for (const src of [lib, cli]) {
    assert.equal(src.includes("writeFileSync"), false);
    assert.equal(src.includes("run-buckparts-command-center-dispatch"), false);
    assert.equal(src.includes("nba_authority: true"), false);
    assert.equal(src.includes("dispatch_invoked: true"), false);
  }
});

test("missing_workers notes HyperAgent/scheduler/mutation dispatch as absent", () => {
  const snapshot = buildExecutiveRuntimeWorkerRegistryV1({ rootDir: REPO_ROOT });
  const labels = snapshot.missing_workers.map((row) => row.label);
  assert.ok(labels.includes("hyperagent_named_worker"));
  assert.ok(labels.includes("wake_scheduler"));
  assert.ok(labels.includes("mutation_dispatch_worker"));
});
