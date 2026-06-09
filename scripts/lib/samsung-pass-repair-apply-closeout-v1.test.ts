import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSamsungPassRepairApplyCloseoutV1,
  SAMSUNG_PASS_APPLY_COMMIT_MESSAGE_NEEDLE_V1,
  SAMSUNG_PASS_EXPECTED_ADDED_ROW_KEYS_V1,
  SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1,
  SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_JSON_REL_V1,
  verifySamsungPassRepairCsvStateV1,
  writeSamsungPassRepairApplyCloseoutArtifactsV1,
} from "./samsung-pass-repair-apply-closeout-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/samsung-pass-repair-apply-closeout-v1.ts", "utf8");

test("closeout proves APPLIED execution and blocks re-apply on repo", () => {
  const closeout = buildSamsungPassRepairApplyCloseoutV1({ rootDir: ROOT });
  assert.equal(closeout.contract, SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_CONTRACT_V1);
  assert.equal(closeout.read_only, true);
  assert.equal(closeout.data_mutation, false);
  assert.equal(closeout.mutation_authorized, false);
  assert.equal(closeout.apply_execution_status, "APPLIED");
  assert.equal(closeout.closeout_verification_passed, true);
  assert.equal(closeout.rerun_apply_should_block, true);
  assert.equal(closeout.apply_plan_consumed, true);
  assert.equal(closeout.guarded_apply_report_apply_status, "BLOCKED");
  assert.ok(closeout.apply_execution_commit_sha);
  assert.ok(closeout.apply_execution_commit_message?.includes(SAMSUNG_PASS_APPLY_COMMIT_MESSAGE_NEEDLE_V1));
  assert.equal(closeout.owner_approval_valid, true);
  assert.equal(closeout.csv_verification.intended_da97_17376b_mappings_present, true);
  assert.equal(closeout.csv_verification.removed_mappings_absent, true);
  assert.deepEqual(
    closeout.csv_verification.present_da97_17376b_row_keys.sort(),
    [...SAMSUNG_PASS_EXPECTED_ADDED_ROW_KEYS_V1].sort(),
  );
  assert.equal(closeout.scoreboard_counts_after_refresh.multi_mapped_count, SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.multi_mapped_count);
  assert.equal(closeout.scoreboard_counts_after_refresh.phantom_model_count, SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.phantom_model_count);
  assert.equal(closeout.scoreboard_counts_after_refresh.wrong_part_risk_count, SAMSUNG_PASS_EXPECTED_SCOREBOARD_COUNTS_V1.wrong_part_risk_count);
  assert.equal(closeout.scoreboard_counts_after_refresh.matches_expected, true);
});

test("csv verification detects removed mappings still present", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-closeout-bad-"));
  try {
    const csv = readFileSync(path.join(ROOT, "data/compatibility_mappings.csv"), "utf8");
    const csvWithRemoved = `${csv.trim()}\n${SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1[0]}\n`;
    mkdirSync(path.join(tmp, "data"), { recursive: true });
    writeFileSync(path.join(tmp, "data/compatibility_mappings.csv"), csvWithRemoved, "utf8");

    const verification = verifySamsungPassRepairCsvStateV1(tmp, "data/compatibility_mappings.csv");
    assert.equal(verification.removed_mappings_absent, false);
    assert.ok(verification.still_present_removed_row_keys.includes(SAMSUNG_PASS_EXPECTED_REMOVED_ROW_KEYS_V1[0]));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("read-only guard blocks forbidden product writes", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    "supabase/",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `closeout must not write ${needle}`);
  }
});

test("write closeout artifacts to apply-execution-plans path", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "samsung-pass-closeout-write-"));
  try {
    const closeout = buildSamsungPassRepairApplyCloseoutV1({ rootDir: ROOT });
    const written = writeSamsungPassRepairApplyCloseoutArtifactsV1({ rootDir: tmp, closeout });
    assert.equal(written.json_rel_path, SAMSUNG_PASS_REPAIR_APPLY_CLOSEOUT_JSON_REL_V1);
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("build closeout does not mutate compatibility_mappings.csv", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  buildSamsungPassRepairApplyCloseoutV1({ rootDir: ROOT });
  assert.equal(readFileSync(csvPath, "utf8"), before);
});
