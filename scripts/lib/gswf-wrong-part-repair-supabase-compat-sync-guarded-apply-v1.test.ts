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
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1,
  writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
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

test("repo dry-run is DRY_RUN_READY for committed sync plan and does not mutate Supabase", () => {
  const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
  });

  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.mode, "dry_run");
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.read_only, true);
  assert.equal(report.owner_approval_present, false);
  assert.equal(report.owner_approval_valid, false);
  assert.equal(report.planned_removals, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals);
  assert.equal(report.planned_additions, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions);
  assert.equal(report.planned_slug_count, 13);
  assert.equal(report.classification_counts?.CONFLICT_REQUIRES_REVIEW, 13);
  assert.deepEqual(
    report.excluded_slugs_untouched.sort(),
    [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1, ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1]
      .map((s) => s.toLowerCase())
      .sort(),
  );
  assert.equal(report.blocked_reasons.length, 0);
  assert.ok(
    report.proven_facts.some((fact) =>
      fact.includes("no founder approval artifact"),
    ),
  );
});

test("apply mode without approval is BLOCKED and never mutates", () => {
  const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
    rootDir: ROOT,
    mode: "apply",
    now: FIXED_NOW,
  });
  assert.equal(report.apply_status, "BLOCKED");
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.ok(
    report.blocked_reasons.some((reason) =>
      reason.includes("matching founder supabase compat sync owner approval required"),
    ),
  );
  assert.ok(
    report.blocked_reasons.some((reason) =>
      reason.includes("supabase mutation surface is disabled"),
    ),
  );
});

test("apply mode with matching approval still BLOCKED — mutation surface disabled", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-guarded-"));
  try {
    writeFixture({ root: tmp, includeApproval: true });
    const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
    });
    assert.equal(report.owner_approval_present, true);
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("supabase mutation surface is disabled"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("dry-run blocks when plan removals/additions do not match 26/13", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-bad-plan-"));
  try {
    writeFixture({ root: tmp, mutatePlan: true });
    const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
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

test("write artifacts only to allowlisted draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-supabase-sync-artifacts-"));
  try {
    const report = runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1({
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

test("source does not mutate CSV/Supabase/retailer_links and defaults dry-run", () => {
  const forbidden = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    '.from("compatibility_mappings").delete',
    '.from("compatibility_mappings").insert',
    '.from("compatibility_mappings").upsert',
    "getSupabaseAdmin",
  ];
  for (const needle of forbidden) {
    assert.ok(!LIB_SOURCE.includes(needle), `lib must not include ${needle}`);
    assert.ok(!APPLY_SCRIPT_SOURCE.includes(needle), `apply script must not include ${needle}`);
  }
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--write-artifacts"));
  assert.ok(APPLY_SCRIPT_SOURCE.includes('process.argv.includes("--apply") ? "apply" : "dry_run"'));
  assert.ok(LIB_SOURCE.includes("supabase_mutation_authorized: false"));
  assert.ok(!existsSync(path.join(ROOT, GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1)));
});
