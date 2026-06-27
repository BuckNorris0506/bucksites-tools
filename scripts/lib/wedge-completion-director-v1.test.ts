import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import type { WedgeCompletionEvaluatorReportV1 } from "./wedge-completion-evaluator-v1";
import {
  buildWedgeCompletionDirectorFromEvaluatorReportV1,
  buildWedgeCompletionDirectorReportV1,
  WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1,
} from "./wedge-completion-director-v1";

const REPO_ROOT = process.cwd();

describe("wedge completion director v1", () => {
  test("contract and read-only flags", async () => {
    const report = await buildWedgeCompletionDirectorReportV1({
      rootDir: REPO_ROOT,
      skipSearchIntent: true,
    });
    assert.equal(report.contract, WEDGE_COMPLETION_DIRECTOR_CONTRACT_V1);
    assert.equal(report.read_only, true);
    assert.equal(report.mutation_authorized, false);
    assert.equal(report.wedge, HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
    assert.ok(report.recommended_next_action.commands.length >= 1);
    assert.ok(report.ranked_action_candidates.length >= 1);
  });

  test("prefers referenceability over C3 when E3 and D2 fail", async () => {
    const mockEvaluator: WedgeCompletionEvaluatorReportV1 = {
      contract: "wedge_completion_evaluator_v1",
      audit_contract: "wedge_completion_audit_v1",
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      artifact_write_authorized: false,
      source_command: "npm run buckparts:wedge-completion-evaluator",
      standard_design_doc: "docs/BuckParts-WEDGE-COMPLETION-STANDARD-DESIGN.md",
      generated_at: "2026-06-27T12:00:00.000Z",
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      overall_status: "WEDGE_INCOMPLETE",
      blocking_dimensions: ["coverage", "customer_experience", "distribution"],
      blocking_criteria: [],
      recommended_next_action: "test",
      proven_facts: [],
      unknown_facts: [],
      dimensions: [
        {
          dimension_id: "coverage",
          label: "Coverage",
          status: "FAIL",
          metrics: {},
          criteria: [
            {
              criterion_id: "C3",
              label: "Proven buyer paths",
              status: "FAIL",
              pass_condition_summary: "test",
              evidence_paths: [],
              blocking_evidence: ["buyer_path_truth_status=MIXED"],
              metrics: { buyer_path_truth_status: "MIXED" },
              source_contracts: [],
            },
          ],
        },
        {
          dimension_id: "customer_experience",
          label: "CX",
          status: "FAIL",
          metrics: {},
          criteria: [
            {
              criterion_id: "E3",
              label: "UX debt",
              status: "FAIL",
              pass_condition_summary: "test",
              evidence_paths: [],
              blocking_evidence: ["rpwfe:OWNER_COPY_REVIEW:x"],
              metrics: { blocking_referenceability_work_items: 46 },
              source_contracts: [],
            },
          ],
        },
        {
          dimension_id: "distribution",
          label: "Distribution",
          status: "FAIL",
          metrics: {},
          criteria: [
            {
              criterion_id: "D2",
              label: "Internal links",
              status: "FAIL",
              pass_condition_summary: "test",
              evidence_paths: [],
              blocking_evidence: ["46-9002:summary"],
              metrics: { internal_link_plan_debt_count: 30 },
              source_contracts: [],
            },
          ],
        },
        {
          dimension_id: "measurement",
          label: "Measurement",
          status: "PASS",
          metrics: {},
          criteria: [],
        },
      ],
    };

    const report = buildWedgeCompletionDirectorFromEvaluatorReportV1({
      report: mockEvaluator,
      rootDir: REPO_ROOT,
      skipSprint: true,
    });

    assert.equal(
      report.recommended_next_action.action_id,
      "clear_proven_slug_referenceability_debt_v1",
    );
    assert.deepEqual(report.recommended_next_action.blocking_criterion_ids.sort(), ["D2", "E3"]);
    assert.equal(report.recommended_next_action.fail_criteria_addressed_count, 2);
  });

  test("live refrigerator_water ranks referenceability ahead of coverage mission", async () => {
    const report = await buildWedgeCompletionDirectorReportV1({
      rootDir: REPO_ROOT,
      skipSearchIntent: true,
    });
    if (report.overall_status !== "WEDGE_INCOMPLETE") return;
    const failIds = report.blocking_criteria_fail.map((c) => c.criterion_id);
    if (failIds.includes("E3") && failIds.includes("D2") && failIds.includes("C3")) {
      assert.equal(
        report.recommended_next_action.action_id,
        "clear_proven_slug_referenceability_debt_v1",
      );
      const c3Rank = report.ranked_action_candidates.find(
        (c) => c.action_id === "coverage_production_mission_c3_v1",
      )?.rank;
      const refRank = report.ranked_action_candidates.find(
        (c) => c.action_id === "clear_proven_slug_referenceability_debt_v1",
      )?.rank;
      assert.ok(refRank != null && c3Rank != null && refRank < c3Rank);
    }
  });
});
