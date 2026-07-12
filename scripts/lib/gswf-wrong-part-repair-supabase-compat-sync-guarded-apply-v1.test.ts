import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1,
  writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
  type SupabaseCompatSyncPlannedChangeV1,
  type SupabaseCompatSyncWriteResultV1,
} from "./gswf-wrong-part-repair-supabase-compat-sync-guarded-apply-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import { GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1 } from "./gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-wrong-part-repair-supabase-compat-sync-guarded-apply-v1.ts",
  "utf8",
);
const APPLY_SCRIPT_SOURCE = readFileSync(
  "scripts/apply-gswf-wrong-part-repair-supabase-compat-sync-guarded-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-11T23:30:00.000Z");

function writeFixture(args: { root: string; includeApproval?: boolean; mutatePlan?: boolean }): void {
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });

  const planText = readFileSync(
    path.join(ROOT, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1),
    "utf8",
  );
  let planOut = planText;
  if (args.mutatePlan) {
    const plan = JSON.parse(planText) as {
      proposed_supabase_change_summary: { removals: unknown[]; additions: unknown[] };
    };
    plan.proposed_supabase_change_summary.removals = [];
    planOut = `${JSON.stringify(plan, null, 2)}\n`;
  }
  writeFileSync(
    path.join(args.root, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1),
    planOut,
    "utf8",
  );

  if (args.includeApproval) {
    const syncPlanRel = GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;
    const syncPlanSha = createHash("sha256")
      .update(readFileSync(path.join(args.root, syncPlanRel), "utf8"), "utf8")
      .digest("hex");
    writeFileSync(
      path.join(args.root, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-gswf-supabase-compat-sync-approve",
              source_queue_row_id: "queue-gswf-supabase-compat-sync",
              source_decision_packet_id: "gswf_wrong_part_repair_supabase_compat_sync_owner_approval_packet_v1",
              decided_at: "2026-07-11T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for supabase compat sync guarded executor only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              expires_at: "2027-07-11T12:00:00.000Z",
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv or buy CTA from this approval alone.",
              ],
              gswf_wrong_part_repair_supabase_compat_sync_owner_approval_context_v1: {
                founder_option_id: "approve_supabase_compat_sync_plan",
                option_id: "approve_supabase_compat_sync_plan",
                sync_plan_rel_path: syncPlanRel,
                approved_slug_count: 13,
                approved_removals: 26,
                approved_additions: 13,
              },
              bound_artifacts_v1: [
                {
                  artifact_rel_path: syncPlanRel,
                  sha256_at_binding: syncPlanSha,
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
}

function mockSuccessfulWriter(): {
  calls: SupabaseCompatSyncPlannedChangeV1[][];
  fn: (deltas: SupabaseCompatSyncPlannedChangeV1[]) => Promise<SupabaseCompatSyncWriteResultV1>;
} {
  const calls: SupabaseCompatSyncPlannedChangeV1[][] = [];
  return {
    calls,
    fn: async (deltas) => {
      calls.push(deltas);
      const removals = deltas.filter((d) => d.operation === "remove");
      const additions = deltas.filter((d) => d.operation === "add");
      return {
        ok: true,
        errors: [],
        applied_removal_count: removals.length,
        applied_addition_count: additions.length,
        applied_row_keys: deltas.map((d) => d.row_key),
      };
    },
  };
}

test("repo dry-run is DRY_RUN_READY even with approval present and does not mutate Supabase", async () => {
  let writerCalled = false;
  const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
    mutationEnabled: true,
    applySupabaseCompatSyncDeltas: async () => {
      writerCalled = true;
      return {
        ok: true,
        errors: [],
        applied_removal_count: 0,
        applied_addition_count: 0,
        applied_row_keys: [],
      };
    },
  });

  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.mode, "dry_run");
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.read_only, true);
  // Real repo may include founder approval; dry-run must still not authorize writes either way.
  const approvalOnDisk = existsSync(
    path.join(ROOT, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1),
  );
  assert.equal(report.owner_approval_present, approvalOnDisk);
  if (approvalOnDisk) {
    assert.equal(report.owner_approval_valid, true);
  }
  assert.equal(report.planned_removals, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals);
  assert.equal(report.planned_additions, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions);
  assert.equal(report.planned_slug_count, 13);
  assert.equal(report.planned_supabase_row_deltas.length, 39);
  assert.equal(report.classification_counts?.CONFLICT_REQUIRES_REVIEW, 13);
  assert.deepEqual(
    report.excluded_slugs_untouched.sort(),
    [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1, ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1]
      .map((s) => s.toLowerCase())
      .sort(),
  );
  assert.equal(report.blocked_reasons.length, 0);
  assert.equal(writerCalled, false);
  assert.equal(report.applied_supabase_row_keys.length, 0);
});

test("apply mode without approval is BLOCKED and never mutates", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-no-approval-"));
  try {
    // Isolated fixture: plan present, approval intentionally absent.
    writeFixture({ root: tmp, includeApproval: false });
    let writerCalled = false;
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      applySupabaseCompatSyncDeltas: async () => {
        writerCalled = true;
        return {
          ok: true,
          errors: [],
          applied_removal_count: 26,
          applied_addition_count: 13,
          applied_row_keys: [],
        };
      },
    });
    assert.equal(report.owner_approval_present, false);
    assert.equal(report.owner_approval_valid, false);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(writerCalled, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("matching founder supabase compat sync owner approval required"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply mode with matching approval but mutation flag absent is BLOCKED", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-guarded-"));
  try {
    writeFixture({ root: tmp, includeApproval: true });
    let writerCalled = false;
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: false,
      applySupabaseCompatSyncDeltas: async () => {
        writerCalled = true;
        return {
          ok: true,
          errors: [],
          applied_removal_count: 26,
          applied_addition_count: 13,
          applied_row_keys: [],
        };
      },
    });
    assert.equal(report.owner_approval_present, true);
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.mutation_flag_enabled, false);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(writerCalled, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes(`${GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required`),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply mode with approval + mutation flag authorizes and applies exact 39 mocked deltas", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-apply-ok-"));
  try {
    writeFixture({ root: tmp, includeApproval: true });
    const mock = mockSuccessfulWriter();
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      applySupabaseCompatSyncDeltas: mock.fn,
    });
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.mutation_flag_enabled, true);
    assert.equal(report.supabase_mutation_authorized, true);
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.data_mutation, true);
    assert.equal(report.read_only, false);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0]?.length, 39);
    assert.equal(
      mock.calls[0]?.filter((d) => d.operation === "remove").length,
      26,
    );
    assert.equal(
      mock.calls[0]?.filter((d) => d.operation === "add").length,
      13,
    );
    assert.equal(report.applied_supabase_row_keys.length, 39);
    for (const slug of [
      ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
      ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
    ]) {
      assert.ok(
        !report.planned_supabase_row_deltas.some((d) => d.fridge_slug === slug.toLowerCase()),
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply mode with approval + flag but writer failure stays BLOCKED with no data_mutation", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-apply-fail-"));
  try {
    writeFixture({ root: tmp, includeApproval: true });
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      applySupabaseCompatSyncDeltas: async () => ({
        ok: false,
        errors: ["mock write refused"],
        applied_removal_count: 0,
        applied_addition_count: 0,
        applied_row_keys: [],
      }),
    });
    assert.equal(report.supabase_mutation_authorized, true);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(report.blocked_reasons.some((r) => r.includes("mock write refused")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("dry-run blocks when plan removals/additions do not match 26/13", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-bad-plan-"));
  try {
    writeFixture({ root: tmp, mutatePlan: true });
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.ok(report.blocked_reasons.some((reason) => reason.includes("proposed removals expected 26")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-artifacts-"));
  try {
    const report = await runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: ROOT,
      mode: "dry_run",
      now: FIXED_NOW,
    });
    const written = writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1);
    assert.ok(
      (
        GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /supabase_mutation_authorized: \*\*false\*\*/);
    assert.match(md, /DRY_RUN_READY/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source stays fail-closed by default and does not mutate CSV/retailer_links", () => {
  const forbidden = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
  ];
  for (const needle of forbidden) {
    assert.ok(!LIB_SOURCE.includes(needle), `lib must not include ${needle}`);
    assert.ok(!APPLY_SCRIPT_SOURCE.includes(needle), `apply script must not include ${needle}`);
  }
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--write-artifacts"));
  assert.ok(APPLY_SCRIPT_SOURCE.includes('process.argv.includes("--apply") ? "apply" : "dry_run"'));
  assert.ok(LIB_SOURCE.includes(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1));
  assert.ok(LIB_SOURCE.includes("defaultApplyGswfSupabaseCompatSyncDeltasV1"));
  assert.ok(LIB_SOURCE.includes('.from("compatibility_mappings")'));
  assert.ok(LIB_SOURCE.includes(".delete()"));
  assert.ok(LIB_SOURCE.includes(".insert({"));
  // Approval may exist in the real repo; static safety must not require its absence.
  assert.ok(
    LIB_SOURCE.includes("apply mode blocked — mutation flag absent") ||
      LIB_SOURCE.includes(`${GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required`),
  );
  assert.ok(LIB_SOURCE.includes("matching founder supabase compat sync owner approval required"));
});
