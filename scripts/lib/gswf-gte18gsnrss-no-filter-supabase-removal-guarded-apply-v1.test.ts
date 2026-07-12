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

import {
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_OWNER_APPROVAL_JSON_REL_V1,
  runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1,
  writeGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunArtifactsV1,
  type Gte18SupabaseRemovalWriteResultV1,
} from "./gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
  type GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1,
} from "./gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply-v1.ts",
  "utf8",
);
const APPLY_SCRIPT_SOURCE = readFileSync(
  "scripts/apply-gswf-gte18gsnrss-no-filter-supabase-removal-guarded-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-12T23:45:00.000Z");
const PLAN_REL = GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1;

const LIVE_DIRTY = async () =>
  ({ status: "CHECKED" as const, supabase_filter_slugs: ["gswf", "gswf2"] });
const LIVE_EMPTY = async () =>
  ({ status: "CHECKED" as const, supabase_filter_slugs: [] as string[] });

function basePendingPlan(): GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1 {
  return {
    contract: "gswf_gte18gsnrss_no_filter_supabase_removal_apply_plan_owner_review_v1",
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
    generated_at: "2026-07-12T23:00:00.000Z",
    source_command: "npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review",
    target_fridge_slug: "ge-gte18gsnrss",
    parity_artifact_rel_path:
      "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.json",
    target_csv_rel_path: "data/compatibility_mappings.csv",
    plan_sync_state: "pending_removal",
    classification: "SUPABASE_STILL_HAS_GSWF_FAMILY",
    planned_slug_count: 1,
    planned_supabase_row_removals: 2,
    planned_supabase_row_additions: 0,
    planned_supabase_removals: [
      {
        operation: "remove",
        fridge_slug: "ge-gte18gsnrss",
        filter_slug: "gswf",
        row_key: "ge-gte18gsnrss,gswf",
      },
      {
        operation: "remove",
        fridge_slug: "ge-gte18gsnrss",
        filter_slug: "gswf2",
        row_key: "ge-gte18gsnrss,gswf2",
      },
    ],
    planned_supabase_additions: [],
    csv_intent_mappings: [],
    csv_current_mappings: [],
    supabase_status: "CHECKED",
    supabase_mappings: ["gswf", "gswf2"],
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    proven_facts: [],
    unknown_facts: [],
    risk_notes: [],
  };
}

function seedFixtureRoot(args: {
  root: string;
  includeApproval?: boolean;
  planMutator?: (plan: GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1) => void;
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
      path.join(args.root, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-gte18-supabase-removal-approve",
              source_queue_row_id: "queue-gte18-supabase-removal",
              source_decision_packet_id:
                "gswf_gte18gsnrss_no_filter_supabase_removal_owner_approval_packet_v1",
              decided_at: "2026-07-12T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for GTE18 supabase removal only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              expires_at: "2027-07-12T12:00:00.000Z",
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv from this approval alone.",
              ],
              gswf_gte18gsnrss_no_filter_supabase_removal_owner_approval_context_v1: {
                founder_option_id: "approve_supabase_removal_plan",
                option_id: "approve_supabase_removal_plan",
                apply_plan_rel_path: PLAN_REL,
                approved_slug_count: 1,
                approved_removals: 2,
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

test("dry-run is read-only and DRY_RUN_READY for exact 2 removals", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-dry-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    let writerCalled = false;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async () => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 0, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "DRY_RUN_READY");
    assert.equal(report.plan_sync_state, "pending_removal");
    assert.equal(report.read_only, true);
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);
    assert.equal(report.planned_slug_count, 1);
    assert.equal(report.planned_removals, 2);
    assert.equal(report.planned_additions, 0);
    assert.deepEqual(report.planned_removal_row_keys, [
      "ge-gte18gsnrss,gswf",
      "ge-gte18gsnrss,gswf2",
    ]);
    assert.deepEqual(report.planned_addition_row_keys, []);
    assert.equal(writerCalled, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("pending plan with live-empty Supabase reports ALREADY_APPLIED and never writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-live-empty-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    let writerCalled = false;
    let liveCalls = 0;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: async () => {
        liveCalls += 1;
        return LIVE_EMPTY();
      },
      applySupabaseRemovalDeltas: async () => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 2, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.plan_sync_state, "already_applied");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(report.planned_removals, 0);
    assert.deepEqual(report.planned_removal_row_keys, []);
    assert.deepEqual(report.applied_supabase_row_keys, []);
    assert.equal(writerCalled, false);
    assert.ok(liveCalls >= 1);
    assert.ok(
      report.proven_facts.some(
        (fact) => fact.includes("live Supabase mappings") && fact.includes("empty"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply mode against pending plan + live-empty Supabase is ALREADY_APPLIED", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-apply-live-empty-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    let writerCalled = false;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_EMPTY,
      applySupabaseRemovalDeltas: async () => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 2, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.data_mutation, false);
    assert.equal(writerCalled, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without matching founder approval", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-no-approval-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false });
    let writerCalled = false;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async () => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 2, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.equal(writerCalled, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("matching founder GTE18 supabase-removal owner approval required"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without explicit mutation env flag", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-no-flag-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    let writerCalled = false;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: false,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async () => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 2, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.mutation_flag_enabled, false);
    assert.equal(report.data_mutation, false);
    assert.equal(writerCalled, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes(`${GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1}=1 required`),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if planned removals differ from exactly those 2 rows", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-bad-removals-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.planned_supabase_removals = [
          {
            operation: "remove",
            fridge_slug: "ge-gte18gsnrss",
            filter_slug: "gswf",
            row_key: "ge-gte18gsnrss,gswf",
          },
        ];
        plan.planned_supabase_row_removals = 1;
      },
    });
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async () => ({
        ok: true,
        errors: [],
        applied_removal_count: 0,
        applied_row_keys: [],
      }),
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(
      report.blocked_reasons.some(
        (reason) =>
          reason.includes("planned_supabase_row_removals expected 2") ||
          reason.includes("planned removals must be exactly"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if additions are nonzero", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-bad-additions-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        (plan as { planned_supabase_additions: unknown[] }).planned_supabase_additions = [
          { fridge_slug: "ge-gte18gsnrss", filter_slug: "mwf" },
        ];
        (plan as { planned_supabase_row_additions: number }).planned_supabase_row_additions = 1;
      },
    });
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async () => ({
        ok: true,
        errors: [],
        applied_removal_count: 0,
        applied_row_keys: [],
      }),
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(report.blocked_reasons.some((reason) => reason.includes("planned additions must be zero")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("already_applied plan reports ALREADY_APPLIED and never writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-already-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      planMutator: (plan) => {
        plan.plan_sync_state = "already_applied";
        plan.classification = "IN_SYNC";
        plan.planned_supabase_row_removals = 0;
        plan.planned_supabase_removals = [];
        plan.supabase_mappings = [];
      },
    });
    let writerCalled = false;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_EMPTY,
      applySupabaseRemovalDeltas: async (): Promise<Gte18SupabaseRemovalWriteResultV1> => {
        writerCalled = true;
        return { ok: true, errors: [], applied_removal_count: 2, applied_row_keys: [] };
      },
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.plan_sync_state, "already_applied");
    assert.equal(report.data_mutation, false);
    assert.equal(report.supabase_mutation_authorized, false);
    assert.deepEqual(report.applied_supabase_row_keys, []);
    assert.equal(writerCalled, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("PARTIAL / GSWF-13 excluded; source forbids CSV/retailer_links/HQ writes", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-scope-"));
  try {
    seedFixtureRoot({ root: tmp });
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
    });
    assert.deepEqual(report.excluded_partial_slugs, [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1]);
    assert.deepEqual(report.excluded_gswf_repaired_slugs, [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1]);
    assert.equal(report.csv_mutation_authorized, false);
    assert.equal(report.buy_cta_authorized, false);
    assert.equal(report.retailer_links_mutation_authorized, false);

    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")'));
    assert.ok(!LIB_SOURCE.includes('writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")'));
    assert.ok(!LIB_SOURCE.includes("docs/BuckParts-HQ-HANDOFF"));
    assert.ok(!APPLY_SCRIPT_SOURCE.includes("docs/BuckParts-HQ-HANDOFF"));
    assert.ok(LIB_SOURCE.includes("ALREADY_APPLIED"));
    assert.ok(LIB_SOURCE.includes("live_supabase"));
    assert.ok(LIB_SOURCE.includes(GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1));
    assert.ok(APPLY_SCRIPT_SOURCE.includes('process.argv.includes("--apply") ? "apply" : "dry_run"'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write dry-run artifacts only to allowlisted draft paths", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-art-"));
  try {
    seedFixtureRoot({ root: tmp });
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      loadSupabaseCompat: LIVE_DIRTY,
    });
    const written = writeGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(
      written.json_rel_path,
      GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
    );
    assert.equal(
      written.md_rel_path,
      GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1,
    );
    assert.ok(
      (
        GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("approved apply with mutation flag invokes writer exactly once for 2 removals", async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-sb-apply-ok-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true });
    let writerCalls = 0;
    const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
      loadSupabaseCompat: LIVE_DIRTY,
      applySupabaseRemovalDeltas: async (deltas) => {
        writerCalls += 1;
        assert.equal(deltas.length, 2);
        return {
          ok: true,
          errors: [],
          applied_removal_count: 2,
          applied_row_keys: deltas.map((d) => d.row_key),
        };
      },
    });
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.data_mutation, true);
    assert.equal(report.supabase_mutation_authorized, true);
    assert.equal(writerCalls, 1);
    assert.deepEqual(report.applied_supabase_row_keys, [
      "ge-gte18gsnrss,gswf",
      "ge-gte18gsnrss,gswf2",
    ]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("repo dry-run against committed plan uses live Supabase and stays non-mutating", async () => {
  if (!existsSync(path.join(ROOT, PLAN_REL))) {
    return;
  }
  const report = await runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
    applySupabaseRemovalDeltas: async () => {
      throw new Error("writer must not be called in dry-run");
    },
  });
  assert.ok(
    report.apply_status === "DRY_RUN_READY" ||
      report.apply_status === "ALREADY_APPLIED" ||
      report.apply_status === "BLOCKED",
  );
  if (report.apply_status === "ALREADY_APPLIED") {
    assert.equal(report.plan_sync_state, "already_applied");
    assert.equal(report.planned_removals, 0);
  }
  assert.equal(report.data_mutation, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.csv_mutation_authorized, false);
});
