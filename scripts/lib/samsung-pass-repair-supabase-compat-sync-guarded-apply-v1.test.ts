import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1 } from "./samsung-pass-repair-apply-plan-v1";
import {
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1,
  writeSamsungPassRepairSupabaseCompatSyncGuardedDryRunArtifactsV1,
  type SamsungPassSupabaseCompatSyncWriteResultV1,
} from "./samsung-pass-repair-supabase-compat-sync-guarded-apply-v1";
import {
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1,
  type SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1,
} from "./samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/samsung-pass-repair-supabase-compat-sync-guarded-apply-v1.ts",
  "utf8",
);
const APPLY_SCRIPT_SOURCE = readFileSync(
  "scripts/apply-samsung-pass-repair-supabase-compat-sync-guarded-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-13T00:15:00.000Z");
const PLAN_REL = SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;

const LIVE_DIRTY = async (slug: string) => {
  const map: Record<string, string[]> = {
    "samsung-rf27t5201sr": ["da29-10105j"],
    "samsung-rf27t5501sr": ["da29-00012b", "da29-00020b"],
    "samsung-rf28r6301sr": ["da29-00019a"],
    "samsung-rf28t5101sr": ["da29-00019a"],
    "samsung-rs22t5201sg": ["da29-10105j"],
  };
  return { status: "CHECKED" as const, supabase_filter_slugs: map[slug] ?? [] };
};

const LIVE_IN_SYNC = async () =>
  ({ status: "CHECKED" as const, supabase_filter_slugs: ["da97-17376b"] });

function basePendingPlan(): SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1 {
  const removals = SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.map((row) => ({
    operation: "remove" as const,
    fridge_slug: row.fridge_slug,
    filter_slug: row.filter_slug,
    row_key: `${row.fridge_slug},${row.filter_slug}`,
  })).sort((a, b) => a.row_key.localeCompare(b.row_key));
  const additions = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1]
    .map((slug) => ({
      operation: "add" as const,
      fridge_slug: slug,
      filter_slug: "da97-17376b",
      row_key: `${slug},da97-17376b`,
    }))
    .sort((a, b) => a.row_key.localeCompare(b.row_key));

  return {
    contract: "samsung_pass_repair_supabase_compat_sync_plan_owner_review_v1",
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
    generated_at: "2026-07-13T00:00:00.000Z",
    source_command: "npm run buckparts:samsung-pass-repair-supabase-compat-sync-plan-owner-review",
    csv_apply_commit: "89bed80",
    csv_apply_plan_rel_path: "data/fridge/batch-production/drafts/samsung-pass-repair-apply-plan-v1.json",
    parity_artifact_rel_path:
      "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-parity-owner-review-v1.json",
    target_csv_rel_path: "data/compatibility_mappings.csv",
    target_filter_slug: "da97-17376b",
    plan_sync_state: "pending_sync",
    planned_slug_count: 5,
    planned_supabase_row_removals: 6,
    planned_supabase_row_additions: 5,
    planned_supabase_removals: removals,
    planned_supabase_additions: additions,
    allowed_removal_row_keys: removals.map((r) => r.row_key).sort(),
    classification_counts: {
      IN_SYNC: 0,
      SUPABASE_STILL_HAS_OLD_ROWS: 5,
      SUPABASE_MISSING_TARGET: 0,
      CONFLICT: 0,
      UNKNOWN_READ_FAILED: 0,
    },
    rows: [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map((slug) => ({
      fridge_slug: slug,
      classification: "SUPABASE_STILL_HAS_OLD_ROWS" as const,
      csv_intent_mappings: ["da97-17376b"],
      csv_current_mappings: ["da97-17376b"],
      csv_matches_intent: true,
      csv_old_rows_still_present: [],
      removed_filter_slugs_expected_absent: [],
      supabase_status: "CHECKED" as const,
      supabase_mappings: ["da29-10105j"],
      old_rows_still_in_supabase: ["da29-10105j"],
      missing_from_supabase: ["da97-17376b"],
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
  planMutator?: (plan: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1) => void;
}): void {
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });
  const plan = basePendingPlan();
  args.planMutator?.(plan);
  const planText = `${JSON.stringify(plan, null, 2)}\n`;
  writeFileSync(path.join(args.root, PLAN_REL), planText, "utf8");

  if (args.includeApproval) {
    const sha = createHash("sha256").update(planText, "utf8").digest("hex");
    writeFileSync(
      path.join(args.root, SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-samsung-pass-supabase-compat-sync-approve",
              source_queue_row_id: "queue-samsung-pass-supabase-compat-sync",
              source_decision_packet_id:
                "samsung_pass_repair_supabase_compat_sync_owner_approval_packet_v1",
              decided_at: "2026-07-13T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for Samsung PASS supabase compat sync only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              expires_at: "2027-07-13T12:00:00.000Z",
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv or buy CTA from this approval alone.",
              ],
              samsung_pass_repair_supabase_compat_sync_owner_approval_context_v1: {
                founder_option_id: "approve_supabase_compat_sync_plan",
                option_id: "approve_supabase_compat_sync_plan",
                sync_plan_rel_path: PLAN_REL,
                approved_slug_count: 5,
                approved_removals: 6,
                approved_additions: 5,
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
  fn: () => Promise<SamsungPassSupabaseCompatSyncWriteResultV1>;
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
        applied_removal_count: 6,
        applied_addition_count: 5,
        applied_row_keys: [],
      };
    },
  };
}

test("dry-run is read-only and DRY_RUN_READY for exact 5/6/5", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-dry-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
    assert.equal(report.planned_slug_count, 5);
    assert.equal(report.planned_removals, 6);
    assert.equal(report.planned_additions, 5);
    assert.equal(writer.calls, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("pending plan with live-in-sync Supabase reports ALREADY_APPLIED and never writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-live-sync-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
    assert.ok(
      report.proven_facts.some(
        (fact) => fact.includes("live Supabase") && fact.includes("da97-17376b-only"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without matching founder approval", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-no-approval-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
      report.blocked_reasons.some((reason) =>
        reason.includes("matching founder Samsung PASS supabase-compat-sync owner approval required"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without explicit mutation env flag", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-no-flag-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
        reason.includes(`${SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required`),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if scope is not exactly 5 PASS slugs", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-bad-scope-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.planned_slug_count = 4;
        plan.rows = plan.rows.slice(0, 4);
      },
    });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
          reason.includes("planned_slug_count expected 5") ||
          reason.includes("exactly the 5 Samsung PASS slugs"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if additions are not exactly 5 da97-17376b rows", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-bad-additions-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.planned_supabase_additions = plan.planned_supabase_additions.slice(0, 4);
        plan.planned_supabase_row_additions = 4;
      },
    });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
          reason.includes("planned_supabase_row_additions expected 5") ||
          reason.includes("exactly 5 da97-17376b"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if removals include anything outside proven old da29-* rows", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-bad-removals-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.planned_supabase_removals = [
          ...plan.planned_supabase_removals,
          {
            operation: "remove",
            fridge_slug: "samsung-rf27t5201sr",
            filter_slug: "gswf",
            row_key: "samsung-rf27t5201sr,gswf",
          },
        ];
        plan.planned_supabase_row_removals = plan.planned_supabase_removals.length;
      },
    });
    const writer = mockWriter();
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
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
          reason.includes("outside proven old da29-* allowlist") ||
          reason.includes("planned removals must be exactly") ||
          reason.includes("planned_supabase_row_removals expected 6"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write dry-run artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-sb-write-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    const report = await runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
    });
    const written = writeSamsungPassRepairSupabaseCompatSyncGuardedDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.deepEqual(
      [written.json_rel_path, written.md_rel_path],
      [...SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1],
    );
    assert.equal(
      existsSync(path.join(tmp, SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1)),
      true,
    );
    assert.equal(
      existsSync(path.join(tmp, SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1)),
      true,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("source forbids CSV/retailer/buy CTA/sitemap/robots/Product JSON-LD mutation", () => {
  assert.match(LIB_SOURCE, /csv_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /buy_cta_authorized: false/);
  assert.match(LIB_SOURCE, /retailer_links_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /sitemap_robots_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /product_json_ld_mutation_authorized: false/);
  assert.match(LIB_SOURCE, /ALREADY_APPLIED/);
  assert.match(APPLY_SCRIPT_SOURCE, /--apply/);
  assert.doesNotMatch(LIB_SOURCE, /BuckParts-HQ-HANDOFF/);
});
