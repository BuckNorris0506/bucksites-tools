import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { resetFridgeAdapterAuditCacheV1 } from "@/lib/coverage-factory/adapters/fridge-coverage-factory-adapter-v1";

import {
  BUCKPARTS_OS_MILESTONE_CATEGORIES_V1,
  BUCKPARTS_OS_MILESTONE_SEED_V1,
  BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1,
  buildBuckPartsOsMilestoneTrackerReportV1,
} from "./buckparts-os-milestone-tracker-v1";

const REPO_ROOT = process.cwd();

test.before(() => {
  resetFridgeAdapterAuditCacheV1();
});

test("milestone seed covers UCF and company categories", () => {
  const ids = BUCKPARTS_OS_MILESTONE_SEED_V1.map((milestone) => milestone.milestone_id);
  assert.ok(ids.includes("ucf_registry_60_of_60_v1"));
  assert.ok(ids.includes("ucf_replacement_proof_v1"));
  assert.ok(ids.includes("strategic_identity_codified_v1"));
  assert.equal(new Set(ids).size, ids.length);

  for (const category of BUCKPARTS_OS_MILESTONE_CATEGORIES_V1) {
    assert.ok(BUCKPARTS_OS_MILESTONE_SEED_V1.some((milestone) => milestone.category === category));
  }
});

test("report is read-only and lists chronological completed milestones", () => {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });

  assert.equal(report.contract, BUCKPARTS_OS_MILESTONE_TRACKER_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.milestone_inventory.length, BUCKPARTS_OS_MILESTONE_SEED_V1.length);

  const chronological = report.chronological_completed_milestones;
  assert.ok(chronological.length >= 10);
  for (let i = 1; i < chronological.length; i++) {
    assert.ok(
      chronological[i - 1]!.completed_at!.localeCompare(chronological[i]!.completed_at!) <= 0,
    );
  }
  assert.equal(chronological.at(-1)?.milestone_id, "production_truth_ap_alarm_v1");
});

test("report verifies UCF runtime evidence for completed engineering milestones", () => {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });

  assert.equal(report.runtime_verification.ucf_registered_subject_count, 60);
  assert.equal(report.runtime_verification.ucf_registry_full, true);
  assert.equal(report.runtime_verification.ucf_replacement_simulation_passed, true);

  const ucfMilestone = report.milestone_inventory.find(
    (milestone) => milestone.milestone_id === "ucf_registry_60_of_60_v1",
  );
  assert.equal(ucfMilestone?.status, "completed");
  assert.equal(ucfMilestone?.celebration_level, "company");
});

test("next unlocked milestone is GOAT C1 after replacement proof", () => {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });

  assert.equal(report.next_unlocked_milestone?.milestone_id, "goat_c1_lbcf_ucf_merge_v1");
  assert.equal(report.next_company_milestone?.milestone_id, "catalog_contamination_buyer_test_v1");
  assert.ok(report.distance_to_first_company_celebration.pending_company_milestones_count >= 2);
  assert.ok(
    report.distance_to_first_company_celebration.estimated_summary.includes(
      "catalog_contamination_buyer_test_v1",
    ),
  );
});

test("completed milestones reference existing repo evidence paths", () => {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });
  const engineeringCompleted = report.chronological_completed_milestones.filter(
    (milestone) => milestone.category === "Engineering",
  );
  assert.ok(engineeringCompleted.length >= 5);

  for (const milestone of engineeringCompleted) {
    const existingPath = milestone.repo_evidence.find((rel) => existsSync(path.join(REPO_ROOT, rel)));
    assert.ok(existingPath, `expected repo evidence for ${milestone.milestone_id}`);
  }
});

test("engineering and company milestones are separately categorized", () => {
  const report = buildBuckPartsOsMilestoneTrackerReportV1({ rootDir: REPO_ROOT });
  assert.ok(report.counts_by_category.Engineering.completed >= 6);
  assert.ok(report.counts_by_category.Company.completed >= 1);
  assert.ok(report.counts_by_category.Revenue.pending >= 1);

  const companyCompleted = report.milestone_inventory.filter(
    (milestone) => milestone.category === "Company" && milestone.status === "completed",
  );
  const engineeringCompleted = report.milestone_inventory.filter(
    (milestone) => milestone.category === "Engineering" && milestone.status === "completed",
  );
  assert.ok(companyCompleted.every((m) => m.milestone_id !== "ucf_registry_60_of_60_v1"));
  assert.ok(engineeringCompleted.some((m) => m.milestone_id === "ucf_registry_60_of_60_v1"));
});
