import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildRefrigeratorTruthRepairOwnerReviewV1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1,
  REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1,
  FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1,
  SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
  WF2CB_CURSOR_VALIDATION_JSON_REL_V1,
  writeRefrigeratorTruthRepairOwnerReviewArtifactsV1,
} from "./refrigerator-truth-repair-owner-review-v1";

const ROOT = process.cwd();
const LIB_SOURCE = readFileSync(
  "scripts/lib/refrigerator-truth-repair-owner-review-v1.ts",
  "utf8",
);
const REPORT_SOURCE = readFileSync(
  "scripts/report-refrigerator-truth-repair-owner-review-v1.ts",
  "utf8",
);

const FIXED_NOW = () => new Date("2026-06-09T12:00:00.000Z");

const SAMSUNG_PASS_SLUGS = [
  "samsung-rf27t5201sr",
  "samsung-rf27t5501sr",
  "samsung-rf28r6301sr",
  "samsung-rf28t5101sr",
  "samsung-rs22t5201sg",
] as const;

function groupRows(
  packet: ReturnType<typeof buildRefrigeratorTruthRepairOwnerReviewV1>,
  repairGroup: string,
) {
  return (
    packet.repair_groups.find((group) => group.repair_group === repairGroup)?.slug_rows ?? []
  );
}

test("contract and read-only flags", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.contract, REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_CONTRACT_V1);
  assert.equal(packet.read_only, true);
  assert.equal(packet.data_mutation, false);
  assert.equal(packet.mutation_authorized, false);
  assert.equal(packet.owner_review_required, true);
  assert.equal(packet.repo_truth_closure_authorized, false);
  assert.equal(packet.truth_closure_authorized, false);
});

test("packet reads all three validation files", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.source_validation_packets.length, 3);
  assert.equal(
    packet.source_validation_packets[0]?.rel_path,
    SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1,
  );
  assert.equal(packet.source_validation_packets[1]?.rel_path, WF2CB_CURSOR_VALIDATION_JSON_REL_V1);
  assert.equal(
    packet.source_validation_packets[2]?.rel_path,
    FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1,
  );
  assert.equal(packet.summary.total_slug_rows, 24);
  assert.ok(packet.exact_repo_paths_read.includes(SAMSUNG_BAD_MAPPING_CURSOR_VALIDATION_JSON_REL_V1));
  assert.ok(packet.exact_repo_paths_read.includes(WF2CB_CURSOR_VALIDATION_JSON_REL_V1));
  assert.ok(packet.exact_repo_paths_read.includes(FRIG_242017801_CURSOR_VALIDATION_JSON_REL_V1));
});

test("Samsung 5 PASS rows become owner-review apply candidates", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const passRows = groupRows(packet, "samsung_pass_ready");
  assert.equal(passRows.length, 5);
  assert.equal(packet.summary.apply_candidate_count, 5);
  const passSlugs = passRows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(passSlugs, [...SAMSUNG_PASS_SLUGS].sort());
  for (const row of passRows) {
    assert.equal(row.validation_verdict, "VALIDATION_PASS_READY_FOR_OWNER_REVIEW");
    assert.equal(row.mutation_authorized, false);
    assert.ok(
      row.proposed_mutation_type === "replace_mapping" ||
        row.proposed_mutation_type === "split_mapping",
    );
    assert.ok(row.recommended_owner_action.includes("Owner-review apply candidate"));
  }
});

test("Samsung 10 PARTIAL rows stay browser-proof required", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const partialRows = groupRows(packet, "samsung_partial_needs_browser_proof");
  assert.equal(partialRows.length, 10);
  for (const row of partialRows) {
    assert.equal(row.validation_verdict, "VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW");
    assert.equal(row.proposed_mutation_type, "capture_manual_evidence");
    assert.ok(row.recommended_owner_action.includes("not apply-ready"));
    assert.equal(row.mutation_authorized, false);
  }
  assert.equal(packet.summary.browser_proof_required_count, 15);
});

test("WF2CB data-quality defect rows are not apply-ready", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const defectRows = groupRows(packet, "wf2cb_data_quality_defects");
  assert.equal(defectRows.length, 1);
  assert.equal(defectRows[0]?.fridge_slug, "frigidaire-frfs2623as");
  assert.equal(defectRows[0]?.validation_verdict, "VALIDATION_FAIL");
  assert.equal(defectRows[0]?.proposed_mutation_type, "catalog_reconcile_typo");
  assert.ok(defectRows[0]?.recommended_owner_action.includes("not apply-ready"));

  const phantomRows = groupRows(packet, "phantom_or_non_refrigerator_models");
  assert.equal(phantomRows.length, 1);
  assert.equal(phantomRows[0]?.fridge_slug, "frigidaire-cfse2333tb");
  assert.equal(phantomRows[0]?.proposed_mutation_type, "catalog_suppress_slug");

  const wf2cbPartial = groupRows(packet, "wf2cb_partial_needs_browser_proof");
  assert.equal(wf2cbPartial.length, 3);
  assert.ok(
    wf2cbPartial.every((row) => row.validation_verdict === "VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW"),
  );
  assert.ok(wf2cbPartial.every((row) => row.proposed_mutation_type === "owner_browser_proof"));
});

test("Frigidaire 242017801 PARTIAL and phantom rows stay owner-review only", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const partialRows = groupRows(packet, "frig_242017801_partial_needs_browser_proof");
  assert.equal(partialRows.length, 2);
  const partialSlugs = partialRows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(partialSlugs, ["frigidaire-fghd2365tf", "frigidaire-frfs2613as"]);
  for (const row of partialRows) {
    assert.equal(row.validation_verdict, "VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW");
    assert.equal(row.proposed_mutation_type, "owner_browser_proof");
    assert.ok(row.recommended_owner_action.includes("not apply-ready"));
    assert.equal(row.mutation_authorized, false);
  }

  const phantomRows = groupRows(packet, "frig_242017801_phantom_typo_models");
  assert.equal(phantomRows.length, 2);
  const phantomSlugs = phantomRows.map((row) => row.fridge_slug).sort();
  assert.deepEqual(phantomSlugs, ["frigidaire-grfs2633af", "frigidaire-grfs2833af"]);
  for (const row of phantomRows) {
    assert.equal(row.validation_verdict, "VALIDATION_FAIL");
    assert.equal(row.mutation_authorized, false);
    assert.ok(
      row.proposed_mutation_type === "catalog_suppress_slug" ||
        row.proposed_mutation_type === "catalog_reconcile_typo",
    );
  }

  assert.equal(packet.summary.phantom_or_suppression_review_count, 4);
  assert.equal(packet.summary.apply_candidate_count, 5);
});

test("242017801=ULTRAWF token identity surfaced as separate owner-review concern", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  assert.equal(packet.token_identity_owner_review_concerns.length, 1);
  const concern = packet.token_identity_owner_review_concerns[0];
  assert.equal(concern?.concern_id, "242017801_ultrawf_duplicate_token");
  assert.ok(concern?.claim.includes("242017801"));
  assert.equal(concern?.consolidation_authorized, false);
  assert.equal(concern?.consolidation_performed, false);
  assert.ok(concern?.recommended_owner_action.includes("do not merge"));
});

test("mutation_authorized=false everywhere", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  for (const group of packet.repair_groups) {
    for (const row of group.slug_rows) {
      assert.equal(row.mutation_authorized, false);
    }
  }
});

test("read-only guard blocks product/evidence/Supabase/page writes in build path", () => {
  const forbiddenWrites = [
    'writeFileSync(path.join(args.rootDir, "data/compatibility_mappings.csv")',
    'writeFileSync(path.join(args.rootDir, "data/filters.csv")',
    'writeFileSync(path.join(args.rootDir, "data/fridge_models.csv")',
    'writeFileSync(path.join(args.rootDir, "data/manual-evidence/refrigerator/',
    "supabase/",
    'writeFileSync(path.join(args.rootDir, "src/app/fridge/',
    'writeFileSync(path.join(args.rootDir, "public/robots',
    "docs/BuckParts-HQ-HANDOFF",
  ];
  for (const needle of forbiddenWrites) {
    assert.ok(!LIB_SOURCE.includes(needle), `build path must not write ${needle}`);
  }
});

test("write artifacts only to allowed draft paths", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "truth-repair-owner-review-"));
  try {
    const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
    const written = writeRefrigeratorTruthRepairOwnerReviewArtifactsV1({
      rootDir: tmp,
      packet,
    });
    assert.equal(written.json_rel_path, REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_JSON_REL_V1);
    assert.equal(written.md_rel_path, REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_MD_REL_V1);
    assert.ok(
      (REFRIGERATOR_TRUTH_REPAIR_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1 as readonly string[]).includes(
        written.json_rel_path,
      ),
    );
    assert.ok(existsSync(path.join(tmp, written.json_rel_path)));
    assert.ok(existsSync(path.join(tmp, written.md_rel_path)));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("report script supports --write-artifacts only for draft outputs", () => {
  assert.ok(REPORT_SOURCE.includes("--write-artifacts"));
  assert.ok(REPORT_SOURCE.includes("writeRefrigeratorTruthRepairOwnerReviewArtifactsV1"));
  assert.ok(!REPORT_SOURCE.includes("compatibility_mappings.csv"));
});

test("scoreboard impact estimate references baseline counts", () => {
  const packet = buildRefrigeratorTruthRepairOwnerReviewV1({ rootDir: ROOT, now: FIXED_NOW });
  const impact = packet.scoreboard_impact_estimate;
  assert.equal(impact.baseline_wrong_part_risk_count, 75);
  assert.equal(impact.estimated_wrong_part_risk_reduction_if_owner_approved, 5);
  assert.equal(impact.estimated_wrong_part_risk_count_after_apply, 70);
  assert.equal(impact.estimated_multi_mapped_reduction_if_owner_approved, 1);
  assert.equal(impact.estimated_phantom_model_reduction_if_owner_approved, 2);
  assert.equal(impact.phantom_or_suppression_review_slug_count, 4);
});
