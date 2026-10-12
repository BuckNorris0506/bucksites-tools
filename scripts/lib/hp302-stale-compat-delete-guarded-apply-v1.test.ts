import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  HP302_STALE_COMPAT_DELETE_KEYS_V1,
  HP302_STALE_COMPAT_DELETE_OWNER_APPROVAL_JSON_REL_V1,
  HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1,
  HP302_STALE_COMPAT_PROTECTED_ROWS_V1,
  runHp302StaleCompatDeleteGuardedApplyV1,
  type Hp302CompatReaderV1,
} from "./hp302-stale-compat-delete-guarded-apply-v1";

const ROOT = process.cwd();
const FIXED_NOW = () => new Date("2026-10-11T21:00:00.000Z");
const HE3_FILTER_ID = "21c77a6d-b847-40fa-8387-d089cba3e8f4";

const MODEL_IDS: Record<string, string> = {
  "shark-hp300": "db70e52b-219b-4687-8c2c-32d6f58c1e0d",
  "shark-hp301": "9c9687c8-3a86-4436-bd07-e2c5b29ce07c",
  "shark-hp302": "b48de95e-d482-4ea3-9328-b324f4d7aae8",
  "shark-hp305": "fbcc5f85-7df4-4b5c-a72c-1537b1f0a048",
  "shark-hp401": "1eac95af-a81f-4afb-8e59-46b0db0c610b",
  "shark-hp402": "271d45ce-98e8-403c-9521-91ef0f7bfad9",
  "shark-hp452": "22193528-2c3e-43bd-9d43-2f94e66d8b58",
  "shark-hp462": "7fc0b438-2ca1-4d87-9868-15aba465efab",
  "shark-hp602": "c8272cf9-8b5e-45ea-861f-c5cf9e91a84c",
  "shark-hp652": "dfe83224-6998-48ef-a2b8-508004519adf",
};

const FILTER_IDS: Record<string, string> = {
  "shark-hepa-hp400": "872f09f1-f8d6-4eb2-8e82-898af41ec8cf",
  "shark-carbon-foam": "43e0608a-570b-4326-98e9-0827e7764465",
  "shark-hepa-he3fkp": HE3_FILTER_ID,
};

function writeTrustFixtures(root: string): void {
  const dir = path.join(root, "data/truth-integrity");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "truth-integrity-registry-v1.json"),
    readFileSync(path.join(ROOT, "data/truth-integrity/truth-integrity-registry-v1.json"), "utf8"),
    "utf8",
  );
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

function copyPlanAndCsv(root: string): void {
  const planAbs = path.join(root, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1);
  mkdirSync(path.dirname(planAbs), { recursive: true });
  writeFileSync(planAbs, readFileSync(path.join(ROOT, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1), "utf8"), "utf8");
  const csvRel = "data/air-purifier/compatibility_mappings.csv";
  mkdirSync(path.join(root, "data/air-purifier"), { recursive: true });
  writeFileSync(path.join(root, csvRel), readFileSync(path.join(ROOT, csvRel), "utf8"), "utf8");
}

function writeApproval(root: string): void {
  const planText = readFileSync(path.join(root, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1), "utf8");
  const sha = createHash("sha256").update(planText, "utf8").digest("hex");
  const abs = path.join(root, HP302_STALE_COMPAT_DELETE_OWNER_APPROVAL_JSON_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify(
      {
        contract: "founder_decision_registry_v1",
        read_only: true,
        data_mutation: false,
        rows: [
          {
            decision_id: "decision-2026-10-12-hp302-stale-compat-delete-approve",
            source_queue_row_id: "queue-hp302-stale-compat-delete",
            source_decision_packet_id: "hp302_stale_compat_delete_owner_approval_v1",
            decided_at: "2026-10-11T20:00:00.000Z",
            decision_status: "approved",
            owner_note:
              "I approve deletion of exactly two stale air_purifier_compatibility_mappings rows: shark-hp302 to shark-hepa-hp400 and shark-hp302 to shark-carbon-foam. Do not touch shark-hp302 to shark-hepa-he3fkp.",
            allowed_next_scope: "owner_mutation_approved",
            evidence_required_before_mutation: true,
            expires_at: "2026-10-19T20:00:00.000Z",
            prohibited_actions_still_apply: [
              "Do not delete shark-hp302 → shark-hepa-he3fkp.",
              "Do not delete any other compatibility row.",
              "Do not run a full air-purifier seed.",
              "Approval alone does not mutate Supabase.",
            ],
            hp302_stale_compat_delete_owner_approval_context_v1: {
              founder_option_id: "approve_hp302_stale_compat_delete_plan",
              parity_plan_rel_path: HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1,
              expected_delete_count: 2,
            },
            bound_artifacts_v1: [
              {
                artifact_rel_path: HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1,
                sha256_at_binding: sha,
                entry_type: "apply_plan",
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function memoryReader(options?: { driftModelId?: boolean }): {
  reader: Hp302CompatReaderV1;
  deleted: string[];
} {
  const mappings = new Set<string>();
  for (const key of HP302_STALE_COMPAT_DELETE_KEYS_V1) {
    mappings.add(`${key.model_id}|${key.filter_id}`);
  }
  for (const key of HP302_STALE_COMPAT_PROTECTED_ROWS_V1) {
    const modelId = MODEL_IDS[key.model_slug];
    const filterId = FILTER_IDS[key.filter_slug];
    mappings.add(`${modelId}|${filterId}`);
  }
  const deleted: string[] = [];
  const reader: Hp302CompatReaderV1 = {
    async resolveModelId(slug) {
      if (options?.driftModelId && slug === "shark-hp302") return "00000000-0000-0000-0000-000000000000";
      return MODEL_IDS[slug] ?? null;
    },
    async resolveFilterId(slug) {
      return FILTER_IDS[slug] ?? null;
    },
    async readMapping(modelId, filterId) {
      return mappings.has(`${modelId}|${filterId}`) ? { is_recommended: true } : null;
    },
    async deleteMapping(modelId, filterId) {
      deleted.push(`${modelId}|${filterId}`);
      mappings.delete(`${modelId}|${filterId}`);
      return { error: null };
    },
  };
  return { reader, deleted };
}

const mutationEnv = {
  BUCKPARTS_IO_CAPABILITY: "MUTATION",
  BUCKPARTS_HP302_STALE_COMPAT_DELETE_MUTATION_ENABLED: "1",
};

test("HP302 dry-run is blocked without a founder approval artifact", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "hp302-dry-"));
  try {
    copyPlanAndCsv(root);
    writeTrustFixtures(root);
    const { reader, deleted } = memoryReader();
    const report = await runHp302StaleCompatDeleteGuardedApplyV1({
      rootDir: root,
      mode: "dry_run",
      now: FIXED_NOW,
      env: mutationEnv,
      reader,
    });
    assert.equal(report.founder_approval_required, true);
    assert.equal(report.preflight?.ok, true);
    assert.equal(report.preflight?.delete_targets_outside_approved_plan, 0);
    assert.deepEqual(report.preflight?.requested_delete_keys, report.preflight?.expected_delete_keys);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(deleted.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HP302 apply deletes only the two approved keys", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "hp302-apply-"));
  try {
    copyPlanAndCsv(root);
    writeTrustFixtures(root);
    writeApproval(root);
    const { reader, deleted } = memoryReader();
    const report = await runHp302StaleCompatDeleteGuardedApplyV1({
      rootDir: root,
      mode: "apply",
      now: FIXED_NOW,
      env: mutationEnv,
      mutationEnabled: true,
      reader,
    });
    assert.equal(report.apply_status, "APPLIED");
    assert.deepEqual(deleted, [
      "b48de95e-d482-4ea3-9328-b324f4d7aae8|872f09f1-f8d6-4eb2-8e82-898af41ec8cf",
      "b48de95e-d482-4ea3-9328-b324f4d7aae8|43e0608a-570b-4326-98e9-0827e7764465",
    ]);
    assert.equal(deleted.some((key) => key.endsWith(HE3_FILTER_ID)), false);
    const he3 = await reader.readMapping(MODEL_IDS["shark-hp302"]!, HE3_FILTER_ID);
    assert.equal(he3?.is_recommended, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HP302 apply does not delete when the session flag is off", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "hp302-flag-"));
  try {
    copyPlanAndCsv(root);
    writeTrustFixtures(root);
    writeApproval(root);
    const { reader, deleted } = memoryReader();
    const report = await runHp302StaleCompatDeleteGuardedApplyV1({
      rootDir: root,
      mode: "apply",
      now: FIXED_NOW,
      env: { BUCKPARTS_IO_CAPABILITY: "MUTATION" },
      mutationEnabled: false,
      reader,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(deleted.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HP302 preflight stops when production model id drifts", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "hp302-drift-"));
  try {
    copyPlanAndCsv(root);
    writeTrustFixtures(root);
    writeApproval(root);
    const { reader, deleted } = memoryReader({ driftModelId: true });
    const report = await runHp302StaleCompatDeleteGuardedApplyV1({
      rootDir: root,
      mode: "apply",
      now: FIXED_NOW,
      env: mutationEnv,
      reader,
    });
    assert.equal(report.apply_status, "PREFLIGHT_FAILED");
    assert.equal(deleted.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HP302 plan with an extra delete key is outside the approved set", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "hp302-extra-"));
  try {
    copyPlanAndCsv(root);
    const plan = JSON.parse(readFileSync(path.join(root, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1), "utf8"));
    plan.expected_delete_count = 3;
    plan.compatibility_deletes.push({
      model_slug: "shark-hp302",
      model_id: "b48de95e-d482-4ea3-9328-b324f4d7aae8",
      filter_slug: "shark-hepa-he3fkp",
      filter_id: HE3_FILTER_ID,
    });
    writeFileSync(path.join(root, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1), `${JSON.stringify(plan, null, 2)}\n`);
    const { reader, deleted } = memoryReader();
    const report = await runHp302StaleCompatDeleteGuardedApplyV1({
      rootDir: root,
      mode: "dry_run",
      now: FIXED_NOW,
      env: mutationEnv,
      reader,
    });
    assert.equal(report.preflight?.delete_targets_outside_approved_plan, 1);
    assert.equal(report.apply_status, "PREFLIGHT_FAILED");
    assert.equal(deleted.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
