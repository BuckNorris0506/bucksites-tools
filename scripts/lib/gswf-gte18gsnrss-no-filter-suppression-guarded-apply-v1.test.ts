import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_OWNER_APPROVAL_JSON_REL_V1,
  runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1,
  writeGswfGte18gsnrssNoFilterSuppressionGuardedDryRunArtifactsV1,
} from "./gswf-gte18gsnrss-no-filter-suppression-guarded-apply-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1,
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/gswf-gte18gsnrss-no-filter-suppression-guarded-apply-v1.ts",
  "utf8",
);
const APPLY_SCRIPT_SOURCE = readFileSync(
  "scripts/apply-gswf-gte18gsnrss-no-filter-suppression-guarded-v1.ts",
  "utf8",
);
const FIXED_NOW = () => new Date("2026-07-12T21:00:00.000Z");
const COMPAT_REL = "data/compatibility_mappings.csv";
const PLAN_REL = GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1;

/** Pre-apply CSV from HEAD — independent of working-tree post-apply suppressions. */
function readHeadCompatCsv(): string {
  return execFileSync("git", ["show", `HEAD:${COMPAT_REL}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function seedFixtureRoot(args: {
  root: string;
  includeApproval?: boolean;
  csvSource?: "head_pre_apply" | "working_tree";
  planMutator?: (plan: Record<string, unknown>) => void;
}): void {
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });
  mkdirSync(path.join(args.root, "data"), { recursive: true });
  const csvText =
    args.csvSource === "working_tree"
      ? readFileSync(path.join(ROOT, COMPAT_REL), "utf8")
      : readHeadCompatCsv();
  writeFileSync(path.join(args.root, COMPAT_REL), csvText);

  const plan = JSON.parse(readFileSync(path.join(ROOT, PLAN_REL), "utf8")) as Record<string, unknown>;
  args.planMutator?.(plan);
  const planText = `${JSON.stringify(plan, null, 2)}\n`;
  writeFileSync(path.join(args.root, PLAN_REL), planText, "utf8");

  if (args.includeApproval) {
    const sha = createHash("sha256").update(planText, "utf8").digest("hex");
    writeFileSync(
      path.join(args.root, GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-gte18-no-filter-approve",
              source_queue_row_id: "queue-gte18-no-filter",
              source_decision_packet_id: "gswf_gte18gsnrss_no_filter_suppression_owner_approval_packet_v1",
              decided_at: "2026-07-12T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for GTE18 no-filter suppression only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              expires_at: "2027-07-12T12:00:00.000Z",
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv from this approval alone.",
              ],
              gswf_gte18gsnrss_no_filter_suppression_owner_approval_context_v1: {
                founder_option_id: "approve_no_filter_suppression_plan",
                option_id: "approve_no_filter_suppression_plan",
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

test("post-apply repo dry-run reports ALREADY_APPLIED and does not mutate", () => {
  let wroteCsv = false;
  const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
    writeText: (absPath, content) => {
      if (absPath.endsWith("compatibility_mappings.csv")) {
        wroteCsv = true;
      }
      writeFileSync(absPath, content, "utf8");
    },
  });
  assert.equal(report.apply_status, "ALREADY_APPLIED");
  assert.equal(report.csv_sync_state, "already_applied");
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.csv_mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.buy_cta_authorized, false);
  assert.equal(report.retailer_links_mutation_authorized, false);
  assert.equal(report.planned_slug_count, 1);
  assert.equal(report.planned_removals, 2);
  assert.equal(report.planned_additions, 0);
  assert.deepEqual(report.planned_removal_row_keys, [
    "ge-gte18gsnrss,gswf",
    "ge-gte18gsnrss,gswf2",
  ]);
  assert.deepEqual(report.before_mappings, []);
  assert.deepEqual(report.after_mappings, []);
  assert.equal(wroteCsv, false);
  if (report.owner_approval_present) {
    assert.equal(report.owner_approval_valid, true);
  }
});

test("pre-apply fixture dry-run is DRY_RUN_READY for exact 2 removals", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-pre-apply-dry-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false, csvSource: "head_pre_apply" });
    let wroteCsv = false;
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "dry_run",
      now: FIXED_NOW,
      writeText: (absPath, content) => {
        if (absPath.endsWith("compatibility_mappings.csv")) {
          wroteCsv = true;
        }
        writeFileSync(absPath, content, "utf8");
      },
    });
    assert.equal(report.apply_status, "DRY_RUN_READY");
    assert.equal(report.csv_sync_state, "pending_suppression");
    assert.equal(report.data_mutation, false);
    assert.deepEqual(report.before_mappings, ["gswf", "gswf2"]);
    assert.deepEqual(report.after_mappings, []);
    assert.deepEqual(report.planned_removal_row_keys, [
      "ge-gte18gsnrss,gswf",
      "ge-gte18gsnrss,gswf2",
    ]);
    assert.equal(wroteCsv, false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply mode against already-applied CSV is ALREADY_APPLIED and never writes", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-already-applied-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      csvSource: "working_tree",
    });
    const before = readFileSync(path.join(tmp, COMPAT_REL), "utf8");
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    assert.equal(report.csv_sync_state, "already_applied");
    assert.equal(report.data_mutation, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.deepEqual(report.applied_removal_row_keys, []);
    assert.equal(readFileSync(path.join(tmp, COMPAT_REL), "utf8"), before);
    assert.ok(!before.split("\n").some((line) => line.startsWith("ge-gte18gsnrss,")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without matching founder approval", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-no-approval-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: false, csvSource: "head_pre_apply" });
    const before = readFileSync(path.join(tmp, COMPAT_REL), "utf8");
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.csv_sync_state, "pending_suppression");
    assert.equal(report.data_mutation, false);
    assert.equal(report.csv_mutation_authorized, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("matching founder GTE18 no-filter suppression owner approval required"),
      ),
    );
    assert.equal(readFileSync(path.join(tmp, COMPAT_REL), "utf8"), before);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked without explicit mutation env flag", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-no-flag-"));
  try {
    seedFixtureRoot({ root: tmp, includeApproval: true, csvSource: "head_pre_apply" });
    const before = readFileSync(path.join(tmp, COMPAT_REL), "utf8");
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: false,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.owner_approval_valid, true);
    assert.equal(report.mutation_flag_enabled, false);
    assert.equal(report.data_mutation, false);
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes(`${GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1}=1 required`),
      ),
    );
    assert.equal(readFileSync(path.join(tmp, COMPAT_REL), "utf8"), before);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if planned removals differ from exactly those 2 rows", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-bad-removals-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      csvSource: "head_pre_apply",
      planMutator: (plan) => {
        plan.planned_csv_removals = [
          { fridge_slug: "ge-gte18gsnrss", filter_slug: "gswf", row_key: "ge-gte18gsnrss,gswf" },
        ];
        plan.planned_compat_row_removals = 1;
      },
    });
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(
      report.blocked_reasons.some(
        (reason) =>
          reason.includes("planned_compat_row_removals expected 2") ||
          reason.includes("planned removals must be exactly"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply is blocked if additions are nonzero", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-bad-additions-"));
  try {
    seedFixtureRoot({
      root: tmp,
      includeApproval: true,
      csvSource: "head_pre_apply",
      planMutator: (plan) => {
        plan.planned_csv_additions = [
          { fridge_slug: "ge-gte18gsnrss", filter_slug: "mwf", row_key: "ge-gte18gsnrss,mwf" },
        ];
        plan.planned_compat_row_additions = 1;
      },
    });
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: tmp,
      mode: "apply",
      now: FIXED_NOW,
      mutationEnabled: true,
    });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.ok(report.blocked_reasons.some((reason) => reason.includes("planned additions must be zero")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply cannot touch PARTIAL / GSWF-13 / other scopes; source forbids forbidden writes", () => {
  const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
    rootDir: ROOT,
    mode: "dry_run",
    now: FIXED_NOW,
  });
  assert.equal(report.apply_status, "ALREADY_APPLIED");
  assert.deepEqual(report.excluded_partial_slugs, [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1]);
  assert.deepEqual(report.excluded_gswf_repaired_slugs, [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1]);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.buy_cta_authorized, false);
  assert.equal(report.retailer_links_mutation_authorized, false);

  for (const needle of [
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    "docs/BuckParts-HQ-HANDOFF",
  ]) {
    assert.ok(!LIB_SOURCE.includes(needle), `must not write ${needle}`);
    assert.ok(!APPLY_SCRIPT_SOURCE.includes(needle), `apply script must not write ${needle}`);
  }
  assert.ok(LIB_SOURCE.includes("ALREADY_APPLIED"));
  assert.ok(LIB_SOURCE.includes(GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1));
  assert.ok(APPLY_SCRIPT_SOURCE.includes('process.argv.includes("--apply") ? "apply" : "dry_run"'));
});

test("write dry-run artifacts only to allowlisted draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gte18-artifacts-"));
  try {
    const report = runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1({
      rootDir: ROOT,
      mode: "dry_run",
      now: FIXED_NOW,
    });
    assert.equal(report.apply_status, "ALREADY_APPLIED");
    const written = writeGswfGte18gsnrssNoFilterSuppressionGuardedDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(
      written.json_rel_path,
      GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1,
    );
    assert.equal(
      written.md_rel_path,
      GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1,
    );
    assert.ok(
      (
        GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]
      ).includes(written.json_rel_path),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /ALREADY_APPLIED/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
