import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "csv-parse/sync";
import test from "node:test";

import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1 } from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";
import {
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1,
  writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedDryRunArtifactsV1,
  type RefrigeratorModelFirstQaBatchSupabaseCompatSyncWriteResultV1,
} from "./refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply-v1";
import {
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  type RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1,
} from "./refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-apply-v1.ts",
  "utf8",
);
const APPLY_SCRIPT_SOURCE = readFileSync(
  "scripts/apply-refrigerator-model-first-qa-batch-supabase-compat-sync-guarded-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-14T04:15:00.000Z");
const PLAN_REL = REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;

function csvIntentBySlug(): Map<string, string[]> {
  const rows = parse(readFileSync(path.join(ROOT, "data/compatibility_mappings.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const map = new Map<string, string[]>();
  for (const slug of REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1) {
    map.set(
      slug,
      [
        ...new Set(
          rows
            .filter((r) => (r.fridge_slug ?? "").toLowerCase() === slug)
            .map((r) => (r.filter_slug ?? "").toLowerCase())
            .filter(Boolean),
        ),
      ].sort(),
    );
  }
  return map;
}

const CSV_INTENT = csvIntentBySlug();

const LIVE_DIRTY = async (slug: string) => {
  const csv = CSV_INTENT.get(slug) ?? [];
  const old = REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.filter(
    (r) => r.fridge_slug === slug,
  ).map((r) => r.filter_slug);
  return {
    status: "CHECKED" as const,
    supabase_filter_slugs: [...new Set([...csv, ...old])].sort(),
  };
};

const LIVE_IN_SYNC = async (slug: string) => ({
  status: "CHECKED" as const,
  supabase_filter_slugs: CSV_INTENT.get(slug) ?? [],
});

function basePendingPlan(): RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1 {
  const removals = REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.map(
    (row) => ({
      operation: "remove" as const,
      fridge_slug: row.fridge_slug,
      filter_slug: row.filter_slug,
      row_key: `${row.fridge_slug},${row.filter_slug}`,
    }),
  ).sort((a, b) => a.row_key.localeCompare(b.row_key));

  return {
    contract: "refrigerator_model_first_qa_batch_supabase_compat_sync_plan_owner_review_v1",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    apply_authorized: false,
    apply_plan_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_approval_required: true,
    generated_at: "2026-07-14T04:00:00.000Z",
    source_command:
      "npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review",
    csv_apply_commit: "a2b5bc7",
    manifest_rel_path: "data/fridge/batch-production/model-first-input-v1/fridge-models-batch-v1.json",
    parity_artifact_rel_path:
      "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.json",
    target_csv_rel_path: "data/compatibility_mappings.csv",
    target_mappings_basis: "csv_current_mappings_per_slug",
    plan_sync_state: "pending_sync",
    planned_slug_count: 20,
    planned_supabase_row_removals: 53,
    planned_supabase_row_additions: 0,
    planned_supabase_removals: removals,
    planned_supabase_additions: [],
    allowed_removal_row_keys: removals.map((r) => r.row_key).sort(),
    classification_counts: {
      IN_SYNC: 0,
      SUPABASE_STILL_HAS_OLD_ROWS: 20,
      SUPABASE_MISSING_TARGET: 0,
      CONFLICT: 0,
      UNKNOWN_READ_FAILED: 0,
    },
    rows: [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1].map((slug) => ({
      fridge_slug: slug,
      classification: "SUPABASE_STILL_HAS_OLD_ROWS" as const,
      csv_intent_mappings: CSV_INTENT.get(slug) ?? [],
      csv_current_mappings: CSV_INTENT.get(slug) ?? [],
      csv_matches_intent: true,
      supabase_status: "CHECKED" as const,
      supabase_mappings: [
        ...new Set([
          ...(CSV_INTENT.get(slug) ?? []),
          ...REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.filter(
            (r) => r.fridge_slug === slug,
          ).map((r) => r.filter_slug),
        ]),
      ].sort(),
      old_rows_still_in_supabase: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.filter(
        (r) => r.fridge_slug === slug,
      ).map((r) => r.filter_slug),
      missing_from_supabase: [],
      unexpected_in_supabase: [],
      read_error: null,
      supabase_mutation_authorized: false as const,
    })),
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

function seedFixtureRoot(args: {
  root: string;
  includeApproval?: boolean;
  planMutator?: (plan: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1) => void;
}): void {
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });
  mkdirSync(path.join(args.root, "data"), { recursive: true });
  copyFileSync(
    path.join(ROOT, "data/compatibility_mappings.csv"),
    path.join(args.root, "data/compatibility_mappings.csv"),
  );
  const plan = basePendingPlan();
  args.planMutator?.(plan);
  const planText = `${JSON.stringify(plan, null, 2)}\n`;
  writeFileSync(path.join(args.root, PLAN_REL), planText, "utf8");

  if (args.includeApproval) {
    const sha = createHash("sha256").update(planText, "utf8").digest("hex");
    writeFileSync(
      path.join(args.root, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-qa-batch-supabase-compat-sync-approve",
              source_queue_row_id: "queue-qa-batch-supabase-compat-sync",
              source_decision_packet_id:
                "refrigerator_model_first_qa_batch_supabase_compat_sync_owner_approval_packet_v1",
              decided_at: "2026-07-14T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for QA batch supabase compat sync only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              expires_at: "2027-07-14T12:00:00.000Z",
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv or buy CTA from this approval alone.",
              ],
              refrigerator_model_first_qa_batch_supabase_compat_sync_owner_approval_context_v1: {
                founder_option_id: "approve_refrigerator_qa_batch_supabase_compat_sync_plan",
                option_id: "approve_refrigerator_qa_batch_supabase_compat_sync_plan",
                sync_plan_rel_path: PLAN_REL,
                approved_slug_count: 20,
                approved_removals: 53,
                approved_additions: 0,
              },
              bound_artifacts_v1: [
                {
                  artifact_rel_path: PLAN_REL,
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
}

function mockWriter(): {
  calls: number;
  fn: () => Promise<RefrigeratorModelFirstQaBatchSupabaseCompatSyncWriteResultV1>;
} {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    fn: async () => {
      calls += 1;
      return {
        ok: true,
        errors: [],
        applied_removal_count: 53,
        applied_addition_count: 0,
        applied_row_keys: [],
      };
    },
  };
}

test("dry-run is read-only and DRY_RUN_READY for exact 20/53/0", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-dry-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const writer = mockWriter();
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseCompatSyncDeltas: writer.fn,
    });
    assert.equal(report.apply_status, "DRY_RUN_READY");
    assert.equal(report.plan_sync_state, "pending_sync");
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.sitemap_robots_mutation_authorized, false);
    assert.equal(report.product_json_ld_mutation_authorized, false);
    assert.equal(report.planned_slug_count, 20);
    assert.equal(report.planned_removals, 53);
    assert.equal(report.planned_additions, 0);
    assert.equal(writer.calls, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("pending plan with live-in-sync Supabase reports ALREADY_APPLIED and never writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-live-sync-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    const writer = mockWriter();
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_IN_SYNC,
      applySupabaseCompatSyncDeltas: writer.fn,
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.plan_sync_state, "already_in_sync");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.planned_removals, 0);
    assert.equal(report.planned_additions, 0);
    assert.equal(writer.calls, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without matching founder approval", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-no-approval-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const writer = mockWriter();
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseCompatSyncDeltas: writer.fn,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(writer.calls, 0);
    assert.ok(
      report.blocked_reasons.some((reason) => /owner approval required/i.test(reason)),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without explicit mutation env flag", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-no-flag-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    const writer = mockWriter();
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: false,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseCompatSyncDeltas: writer.fn,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.mutation_flag_enabled, false);
    assert.equal(writer.calls, 0);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes(`${REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required`),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if scope is not exactly 20 QA slugs", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-bad-scope-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.planned_slug_count = 19;
        plan.rows = plan.rows.slice(0, 19);
      },
    });
    const writer = mockWriter();
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseCompatSyncDeltas: writer.fn,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(writer.calls, 0);
    assert.ok(
      report.blocked_reasons.some(
        (reason) =>
          reason.includes("planned_slug_count expected 20") ||
          reason.includes("20 refrigerator QA batch slugs") ||
          reason.includes("exactly the 20"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("writes dry-run artifacts only to allowlisted paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "qa-sb-write-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const report = await runRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
    });
    const written = writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncGuardedDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1);
    assert.equal(written.md_rel_path, REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1);
    assert.deepEqual(
      [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1].sort(),
      [
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
      ].sort(),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("lib/scripts do not mutate CSV or retailer_links and require approval for apply", () => {
  assert.match(LIB_SOURCE, /csv_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /buy_cta_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /sitemap_robots_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /product_json_ld_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /ALREADY_APPLIED/);
  assert.doesNotMatch(LIB_SOURCE, /writeFileSync\([^)]*compatibility_mappings\.csv/);
  assert.doesNotMatch(LIB_SOURCE, /retailer_links\.csv/);
  assert.match(APPLY_SCRIPT_SOURCE, /--apply/);
  assert.match(APPLY_SCRIPT_SOURCE, /dry-run/);
});
