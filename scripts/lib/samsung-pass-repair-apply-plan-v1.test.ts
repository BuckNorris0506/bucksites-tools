import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSamsungPassRepairApplyPlanV1,
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1,
  SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
  writeSamsungPassRepairApplyPlanArtifactsV1,
} from "./samsung-pass-repair-apply-plan-v1";
import { CURSOR_VALIDATED_CORRECT_VERDICT_V1 } from "./refrigerator-truth-scoreboard-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/samsung-pass-repair-apply-plan-v1.ts", "utf8");
const REPORT_SOURCE = readFileSync("scripts/report-samsung-pass-repair-apply-plan-v1.ts", "utf8");
const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

const EXPECTED_PLANS: Record<
  string,
  { before: string[]; after: string[]; remove: string[]; add: string[]; operation: string }
> = {
  "samsung-rf27t5201sr": {
    before: ["da29-10105j"],
    after: ["da97-17376b"],
    remove: ["da29-10105j"],
    add: ["da97-17376b"],
    operation: "replace_mapping",
  },
  "samsung-rf27t5501sr": {
    before: ["da29-00012b", "da29-00020b"],
    after: ["da97-17376b"],
    remove: ["da29-00012b", "da29-00020b"],
    add: ["da97-17376b"],
    operation: "split_mapping",
  },
  "samsung-rf28r6301sr": {
    before: ["da29-00019a"],
    after: ["da97-17376b"],
    remove: ["da29-00019a"],
    add: ["da97-17376b"],
    operation: "replace_mapping",
  },
  "samsung-rf28t5101sr": {
    before: ["da29-00019a"],
    after: ["da97-17376b"],
    remove: ["da29-00019a"],
    add: ["da97-17376b"],
    operation: "replace_mapping",
  },
  "samsung-rs22t5201sg": {
    before: ["da29-10105j"],
    after: ["da97-17376b"],
    remove: ["da29-10105j"],
    add: ["da97-17376b"],
    operation: "replace_mapping",
  },
};

test("contract and read-only flags", () => {
  const plan = buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(plan.contract, SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1);
  assert.equal(plan.read_only, true);
  assert.equal(plan.data_mutation, false);
  assert.equal(plan.mutation_authorized, false);
  assert.equal(plan.owner_approval_required, true);
  assert.equal(plan.apply_authorized, false);
  assert.equal(plan.csv_apply_authorized, false);
  assert.equal(plan.supabase_mutation_authorized, false);
});

test("plans exactly 5 samsung_pass_ready rows with expected mapping deltas", () => {
  const plan = buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(plan.planned_rows.length, 5);
  assert.equal(plan.source_owner_review_packet.repair_group, "samsung_pass_ready");
  assert.equal(plan.source_owner_review_packet.slug_count, 5);

  const slugs = plan.planned_rows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(slugs, [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].sort());

  for (const row of plan.planned_rows) {
    const expected = EXPECTED_PLANS[row.fridge_slug];
    assert.ok(expected, `missing expected plan for ${row.fridge_slug}`);
    assert.deepEqual(row.before_mappings, expected.before);
    assert.deepEqual(row.after_mappings, expected.after);
    assert.deepEqual(row.removed_filter_slugs, expected.remove);
    assert.deepEqual(row.added_filter_slugs, expected.add);
    assert.equal(row.operation, expected.operation);
    assert.equal(row.target_filter_slug, SAMSUNG_PASS_TARGET_FILTER_SLUG_V1);
    assert.equal(row.mutation_authorized, false);
    assert.equal(row.not_applied, true);
    assert.equal(row.validation_basis.cursor_verdict, CURSOR_VALIDATED_CORRECT_VERDICT_V1);
  }

  assert.deepEqual(plan.removed_filter_slugs.sort(), [
    "da29-00012b",
    "da29-00019a",
    "da29-00020b",
    "da29-10105j",
  ]);
  assert.deepEqual(plan.added_filter_slugs, [SAMSUNG_PASS_TARGET_FILTER_SLUG_V1]);
  assert.equal(plan.expected_scoreboard_delta.planned_compat_row_removals, 6);
  assert.equal(plan.expected_scoreboard_delta.planned_compat_row_additions, 5);
});

test("expected scoreboard delta matches owner-review impact estimate", () => {
  const plan = buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  const delta = plan.expected_scoreboard_delta;
  assert.equal(delta.estimated_wrong_part_risk_reduction_if_owner_approved, 5);
  assert.equal(delta.estimated_wrong_part_risk_count_after_apply, 70);
  assert.equal(delta.estimated_multi_mapped_reduction_if_owner_approved, 1);
  assert.equal(delta.estimated_phantom_model_reduction_if_owner_approved, 2);
});

test("mutation_authorized=false everywhere and build path does not write product data", () => {
  const plan = buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const row of plan.planned_rows) {
    assert.equal(row.mutation_authorized, false);
  }

  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `build path must not write ${needle}`);
  }
});

test("write artifacts only to allowed draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-apply-plan-"));
  try {
    const plan = buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeSamsungPassRepairApplyPlanArtifactsV1({ rootDir: tmp, plan });
    assert.equal(written.json_rel_path, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1);
    assert.equal(written.md_rel_path, SAMSUNG_PASS_REPAIR_APPLY_PLAN_MD_REL_V1);
    assert.ok(
      (SAMSUNG_PASS_REPAIR_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
        written.json_rel_path,
      ),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("build plan does not mutate compatibility_mappings.csv", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildSamsungPassRepairApplyPlanV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(readFileSync(csvPath, "utf8"), before);
});

test("report script supports --write-artifacts only for draft outputs", () => {
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(REPORT_SOURCE.includes("writeSamsungPassRepairApplyPlanArtifactsV1"));
  assert.ok(!REPORT_SOURCE.includes("compatibility_mappings.csv"));
});
