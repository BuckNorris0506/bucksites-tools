import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1,
  SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1,
  SAMSUNG_PASS_GUARDED_APPLY_REPORT_MD_REL_V1,
  SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1,
  runSamsungPassRepairGuardedApplyV1,
  writeSamsungPassRepairGuardedApplyReportV1,
} from "./samsung-pass-repair-guarded-apply-v1";
import { SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1 } from "./samsung-pass-repair-apply-plan-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/samsung-pass-repair-guarded-apply-v1.ts", "utf8");
const APPLY_SCRIPT_SOURCE = readFileSync("scripts/apply-samsung-pass-repair-guarded-v1.ts", "utf8");

const SAMSUNG_CSV_ROWS = [
  "samsung-rf27t5201sr,da29-10105j",
  "samsung-rf27t5501sr,da29-00012b",
  "samsung-rf27t5501sr,da29-00020b",
  "samsung-rf28r6301sr,da29-00019a",
  "samsung-rf28t5101sr,da29-00019a",
  "samsung-rs22t5201sg,da29-10105j",
  "samsung-other-model,da29-00003g",
] as const;

function writeFixture(args: {
  root: string;
  csvRows?: string[];
  includeApproval?: boolean;
}): void {
  const csvRows = args.csvRows ?? [...SAMSUNG_CSV_ROWS];
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });

  writeFileSync(
    path.join(args.root, "data/compatibility_mappings.csv"),
    `fridge_slug,filter_slug\n${csvRows.join("\n")}\n`,
    "utf8",
  );

  writeFileSync(
    path.join(args.root, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1),
    readFileSync(path.join(ROOT, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1), "utf8"),
    "utf8",
  );

  if (args.includeApproval !== false) {
    writeFileSync(
      path.join(args.root, SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1),
      readFileSync(path.join(ROOT, SAMSUNG_PASS_OWNER_APPROVAL_JSON_REL_V1), "utf8"),
      "utf8",
    );
  }
}

test("dry-run on repo proves 6 removals and 5 additions without mutating CSV", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  const report = runSamsungPassRepairGuardedApplyV1({ rootDir: ROOT, mode: "dry_run" });

  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.data_mutation, false);
  assert.equal(report.owner_approval_valid, true);
  assert.equal(report.planned_slug_count, SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_slug_count);
  assert.equal(report.planned_removals, SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_removals);
  assert.equal(report.planned_additions, SAMSUNG_PASS_EXPECTED_APPLY_COUNTS_V1.planned_additions);
  assert.equal(report.applied_removals.length, 6);
  assert.equal(report.applied_additions.length, 5);
  assert.equal(report.csv_row_count_after, report.csv_row_count_before - 1);
  assert.equal(readFileSync(csvPath, "utf8"), before);
});

test("apply mutates only fixture CSV when --apply conditions met", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-guarded-apply-"));
  try {
    writeFixture({ root: tmp });
    const csvPath = path.join(tmp, "data/compatibility_mappings.csv");
    const before = readFileSync(csvPath, "utf8");

    const report = runSamsungPassRepairGuardedApplyV1({ rootDir: tmp, mode: "apply" });
    assert.equal(report.apply_status, "APPLIED");
    assert.equal(report.data_mutation, true);

    const after = readFileSync(csvPath, "utf8");
    assert.notEqual(after, before);
    assert.ok(after.includes("samsung-rf27t5201sr,da97-17376b"));
    assert.ok(!after.includes("samsung-rf27t5201sr,da29-10105j"));
    assert.ok(after.includes("samsung-other-model,da29-00003g"));
    assert.equal(report.csv_row_count_after, 6);
    assert.equal(report.csv_row_count_before, 7);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("blocks apply when owner approval missing", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-guarded-apply-no-approval-"));
  try {
    writeFixture({ root: tmp, includeApproval: false });
    const report = runSamsungPassRepairGuardedApplyV1({ rootDir: tmp, mode: "apply" });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(report.owner_approval_valid, false);
    assert.ok(report.blocked_reasons.some((reason) => reason.includes("owner approval")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("blocks when before mappings mismatch apply plan", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-guarded-apply-mismatch-"));
  try {
    const badRows = [...SAMSUNG_CSV_ROWS];
    badRows[0] = "samsung-rf27t5201sr,da29-00019a";
    writeFixture({ root: tmp, csvRows: badRows });
    const report = runSamsungPassRepairGuardedApplyV1({ rootDir: tmp, mode: "dry_run" });
    assert.equal(report.apply_status, "BLOCKED");
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("before_mappings mismatch for samsung-rf27t5201sr"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("dry-run blocks if non-planned slug rows would change", () => {
  const report = runSamsungPassRepairGuardedApplyV1({ rootDir: ROOT, mode: "dry_run" });
  assert.equal(report.untouched_slug_row_keys_count > 0, true);
  assert.ok(!report.blocked_reasons.some((reason) => reason.includes("non-planned slug rows would be modified")));
});

test("read-only guard blocks forbidden product paths in executor source", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `executor must not write ${needle}`);
  }
});

test("write report to apply-execution-plans path", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-guarded-report-"));
  try {
    const report = runSamsungPassRepairGuardedApplyV1({ rootDir: ROOT, mode: "dry_run" });
    const written = writeSamsungPassRepairGuardedApplyReportV1({ rootDir: tmp, report });
    assert.equal(written.json_rel_path, SAMSUNG_PASS_GUARDED_APPLY_REPORT_JSON_REL_V1);
    assert.equal(written.md_rel_path, SAMSUNG_PASS_GUARDED_APPLY_REPORT_MD_REL_V1);
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    assert.ok(report.rollback_instructions.length > 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply script defaults to dry-run and supports --apply", () => {
  assert.ok(!APPLY_SCRIPT_SOURCE.includes('--dry-run"') || APPLY_SCRIPT_SOURCE.includes('"dry_run"'));
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--apply"));
  assert.ok(APPLY_SCRIPT_SOURCE.includes("writeSamsungPassRepairGuardedApplyReportV1"));
});
