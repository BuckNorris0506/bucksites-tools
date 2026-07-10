import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1,
  GSWF_WRONG_PART_GUARDED_APPLY_ALLOWED_WRITE_REL_PATHS_V1,
  GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1,
  GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_MD_REL_V1,
  GSWF_WRONG_PART_OWNER_APPROVAL_JSON_REL_V1,
  runGswfWrongPartRepairGuardedApplyV1,
  writeGswfWrongPartRepairGuardedApplyDryRunArtifactsV1,
} from "./gswf-wrong-part-repair-guarded-apply-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync("scripts/lib/gswf-wrong-part-repair-guarded-apply-v1.ts", "utf8");
const APPLY_SCRIPT_SOURCE = readFileSync("scripts/apply-gswf-wrong-part-repair-guarded-v1.ts", "utf8");

const PLANNED_CSV_ROWS = [
  "ge-cwe23sshww,gswf",
  "ge-cwe23sshww,gswf2",
  "ge-gfe24jgkww,gswf",
  "ge-gfe24jgkww,gswf2",
  "ge-gfe24jgkww,smartwater-mwfp",
  "ge-gfe27jmkes,gswf",
  "ge-gfe27jmkes,gswf2",
  "ge-gfe28gmkbb,gswf",
  "ge-gfe28gmkbb,gswf2",
  "ge-gfe28gskes,gswf",
  "ge-gfe28gskes,gswf2",
  "ge-gfe28hskss,gswf",
  "ge-gfe28hskss,gswf2",
  "ge-gfe28hskss,smartwater-mwfp",
  "ge-gne25jmkww,gswf",
  "ge-gne25jmkww,gswf2",
  "ge-gne27jstss,gswf",
  "ge-gne27jstss,gswf2",
  "ge-gne27jstss,xwf",
  "ge-gse25hskss,gswf",
  "ge-gse25hskss,gswf2",
  "ge-gse25hskss,xwf",
  "ge-gye22gskww,gswf",
  "ge-gye22gskww,gswf2",
  "ge-pfe28kmkww,gswf",
  "ge-pfe28kmkww,gswf2",
  "ge-pfe28kmkww,xwf",
  "ge-pfe28kynbb,gswf",
  "ge-pfe28kynbb,gswf2",
  "ge-pvd28bymfs,gswf",
  "ge-pvd28bymfs,gswf2",
  // excluded rows — must remain untouched
  "ge-gfe28hmkww,gswf",
  "ge-gfe28hmkww,gswf2",
  "ge-gsc25frshss,gswf",
  "ge-gsc25frshss,gswf2",
  "ge-gse26gshess,gswf",
  "ge-gse26gshess,gswf2",
  "ge-gte18gsnrss,gswf",
  "ge-gte18gsnrss,gswf2",
  "ge-other-model,mwf",
] as const;

function writeFixture(args: {
  root: string;
  csvRows?: string[];
  includeApproval?: boolean;
}): void {
  const csvRows = args.csvRows ?? [...PLANNED_CSV_ROWS];
  mkdirSync(path.join(args.root, "data/fridge/batch-production/drafts"), { recursive: true });
  mkdirSync(path.join(args.root, "data/owner-decisions"), { recursive: true });

  writeFileSync(
    path.join(args.root, "data/compatibility_mappings.csv"),
    `fridge_slug,filter_slug\n${csvRows.join("\n")}\n`,
    "utf8",
  );

  writeFileSync(
    path.join(args.root, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1),
    readFileSync(path.join(ROOT, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1), "utf8"),
    "utf8",
  );

  if (args.includeApproval) {
    writeFileSync(
      path.join(args.root, GSWF_WRONG_PART_OWNER_APPROVAL_JSON_REL_V1),
      `${JSON.stringify(
        {
          contract: "founder_decision_registry_v1",
          read_only: true,
          data_mutation: false,
          rows: [
            {
              decision_id: "decision-test-gswf-wrong-part-approve_apply_plan",
              source_queue_row_id: "queue-gswf-wrong-part-repair-compat",
              source_decision_packet_id: "gswf_wrong_part_repair_owner_approval_packet_v1",
              decided_at: "2026-07-10T12:00:00.000Z",
              decision_status: "approved",
              owner_note: "Test fixture approval for guarded apply executor only.",
              allowed_next_scope: "owner_mutation_approved",
              evidence_required_before_mutation: true,
              prohibited_actions_still_apply: [
                "Do not mutate retailer_links.csv or buy CTA from this approval alone.",
              ],
              gswf_wrong_part_repair_owner_approval_context_v1: {
                founder_option_id: "approve_apply_plan",
                option_id: "approve_apply_plan",
                apply_plan_rel_path: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
                approved_slug_count: 13,
              },
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

test("dry-run on repo is safe and does not mutate compatibility_mappings.csv", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: ROOT, mode: "dry_run" });

  assert.equal(report.apply_status, "DRY_RUN_READY");
  assert.equal(report.mode, "dry_run");
  assert.equal(report.data_mutation, false);
  assert.equal(report.owner_approval_valid, false);
  assert.equal(report.owner_approval_required_for_apply, true);
  assert.equal(report.planned_slug_count, GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_slug_count);
  assert.equal(report.planned_removals, GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_removals);
  assert.equal(report.planned_additions, GSWF_WRONG_PART_EXPECTED_APPLY_COUNTS_V1.planned_additions);
  assert.equal(report.planned_removal_row_keys.length, 26);
  assert.equal(report.planned_addition_row_keys.length, 13);
  assert.equal(report.csv_row_count_after, report.csv_row_count_before - 13);
  assert.equal(readFileSync(csvPath, "utf8"), before);
  assert.ok(!("applied_removals" in report));
  assert.ok(!("applied_additions" in report));
  for (const row of report.row_results) {
    assert.equal(row.status, "planned");
  }

  for (const removal of report.planned_removal_row_keys) {
    const filter = removal.split(",")[1]!;
    assert.ok(
      (GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]).includes(filter),
      `unexpected removal ${removal}`,
    );
  }
  for (const addition of report.planned_addition_row_keys) {
    const filter = addition.split(",")[1]!;
    assert.ok(filter === "rpwfe" || filter === "xwfe", `unexpected addition ${addition}`);
  }

  const planned = new Set(report.before_after_diff.map((row) => row.fridge_slug));
  for (const slug of GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1) {
    assert.equal(planned.has(slug), false);
  }
  for (const slug of GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1) {
    assert.equal(planned.has(slug), false);
  }
  assert.deepEqual(
    report.excluded_slugs_untouched.sort(),
    [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1, ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1].sort(),
  );
  assert.deepEqual(
    report.before_after_diff.map((row) => row.fridge_slug).sort(),
    [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].sort(),
  );
});

test("apply is blocked without explicit owner approval and does not mutate CSV", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-guarded-apply-no-approval-"));
  try {
    writeFixture({ root: tmp, includeApproval: false });
    const csvPath = path.join(tmp, "data/compatibility_mappings.csv");
    const before = readFileSync(csvPath, "utf8");
    const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: tmp, mode: "apply" });
    assert.equal(report.apply_status, "BLOCKED");
    assert.equal(report.data_mutation, false);
    assert.equal(report.owner_approval_valid, false);
    assert.ok(report.blocked_reasons.some((reason) => reason.includes("owner approval")));
    assert.equal(readFileSync(csvPath, "utf8"), before);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("apply on repo without approval is blocked and leaves committed CSV untouched", () => {
  const csvPath = path.join(ROOT, "data/compatibility_mappings.csv");
  const before = readFileSync(csvPath, "utf8");
  const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: ROOT, mode: "apply" });
  assert.equal(report.apply_status, "BLOCKED");
  assert.equal(report.data_mutation, false);
  assert.equal(report.owner_approval_valid, false);
  assert.equal(readFileSync(csvPath, "utf8"), before);
});

test("blocks dry-run when before mappings mismatch apply plan", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-guarded-apply-mismatch-"));
  try {
    const badRows = [...PLANNED_CSV_ROWS];
    badRows[0] = "ge-cwe23sshww,mwf";
    writeFixture({ root: tmp, csvRows: badRows });
    const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: tmp, mode: "dry_run" });
    assert.equal(report.apply_status, "BLOCKED");
    assert.ok(
      report.blocked_reasons.some((reason) =>
        reason.includes("before_mappings mismatch for ge-cwe23sshww"),
      ),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("write dry-run artifacts only to allowed draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "gswf-guarded-apply-report-"));
  try {
    const report = runGswfWrongPartRepairGuardedApplyV1({ rootDir: ROOT, mode: "dry_run" });
    const written = writeGswfWrongPartRepairGuardedApplyDryRunArtifactsV1({
      rootDir: tmp,
      report,
    });
    assert.equal(written.json_rel_path, GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_JSON_REL_V1);
    assert.equal(written.md_rel_path, GSWF_WRONG_PART_GUARDED_APPLY_DRY_RUN_MD_REL_V1);
    assert.ok(
      (GSWF_WRONG_PART_GUARDED_APPLY_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
        written.json_rel_path,
      ),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
    const md = readFileSync(path.join(tmp, written.md_rel_path), "utf8");
    assert.match(md, /Exact CSV row deltas/);
    assert.match(md, /data_mutation: \*\*false\*\*/);
    const jsonText = readFileSync(path.join(tmp, written.json_rel_path), "utf8");
    assert.ok(!jsonText.includes('"applied_removals"'));
    assert.ok(!jsonText.includes('"applied_additions"'));
    assert.ok(jsonText.includes('"planned_removal_row_keys"'));
    assert.ok(jsonText.includes('"planned_addition_row_keys"'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("executor source does not write forbidden product paths; CLI defaults to dry-run", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/retailer_links.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `executor must not write ${needle}`);
  }
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--apply"));
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--dry-run") || APPLY_SCRIPT_SOURCE.includes('"dry_run"'));
  assert.ok(APPLY_SCRIPT_SOURCE.includes("--write-artifacts"));
  assert.match(
    APPLY_SCRIPT_SOURCE,
    /process\.argv\.includes\("--apply"\) \? "apply" : "dry_run"/,
  );
});
