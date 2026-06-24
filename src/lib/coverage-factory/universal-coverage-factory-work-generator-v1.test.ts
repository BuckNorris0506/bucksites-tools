import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  coverageFactoryContractsGrantProductionMutationAuthorityV1,
  UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
  UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1,
  validateCoverageWorkItemV1,
} from "./index";

import { buildUniversalCoverageFactoryV1 } from "./universal-coverage-factory-v1";
import { buildUniversalCoverageFactoryDecisionLayerV1 } from "./universal-coverage-factory-decision-layer-v1";
import type { UniversalCoverageFactoryDecisionLayerV1 } from "./universal-coverage-factory-decision-layer-v1";
import {
  buildUniversalCoverageFactoryWorkGeneratorV1,
  dispositionForCoverageAssessmentV1,
  expectedActionClassForWorkGeneratorDisposition,
  stableUcfWorkItemIdV1,
  universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1,
  validateUniversalCoverageFactoryWorkGeneratorV1,
} from "./universal-coverage-factory-work-generator-v1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXED_NOW = () => new Date("2026-06-10T22:00:00.000Z");

function buildFixtureWorkGenerator() {
  const factory = buildUniversalCoverageFactoryV1({ rootDir: ROOT, now: FIXED_NOW });
  const decision = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  const generated = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  return { factory, decision, generated };
}

function minimalDecisionLayer(
  overrides: Partial<UniversalCoverageFactoryDecisionLayerV1> = {},
): UniversalCoverageFactoryDecisionLayerV1 {
  return {
    contract: "universal_coverage_factory_decision_layer_v1",
    schema_version: "1.1.0",
    source_contract: "universal_coverage_factory_v1",
    source_provenance_index_hash: "sha256:test",
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    subject_rows: [],
    truth_blockers: [],
    candidate_work_items: [],
    highest_priority_subject: null,
    highest_priority_wedge: null,
    safe_coverage_gain_estimate: 0,
    suppressed_subjects: [],
    research_required_subjects: [],
    research_identity_subjects: [],
    research_fit_subjects: [],
    research_buyer_path_subjects: [],
    ready_for_change_planning_subjects: [],
    ...overrides,
  };
}

function subjectRow(args: {
  subjectId: string;
  disposition:
    | "mapping_review"
    | "owner_review"
    | "research_buyer_path"
    | "research_identity"
    | "research_fit"
    | "ready_for_change_planning"
    | "suppressed";
  wedge?: "air_purifier" | "whole_house_water" | "refrigerator_water";
}): UniversalCoverageFactoryDecisionLayerV1["subject_rows"][number] {
  return {
    wedge: args.wedge ?? "air_purifier",
    subject_id: args.subjectId,
    disposition: args.disposition,
    adapter_state: "TEST_STATE",
    policy_apply_allowed: false,
    blockers: args.disposition === "suppressed" ? ["owner_policy_hold"] : [],
    evidence_summary: {
      identity: "unknown",
      fit: "unknown",
      buyer_path: "unknown",
      demand: "not_applicable",
      publication: "not_applicable",
    },
    provenance_summary: {
      provenance_ref_count: 0,
      provenance_refs: [],
    },
    subject_link_count: 0,
    subject_link_refs: [],
    truth_blockers: [],
  };
}

function candidateItem(args: {
  subjectId: string;
  actionClass: "MAPPING_REVIEW" | "OWNER_REVIEW" | "READ_ONLY_RESEARCH" | "PLAN_CHANGE";
}): UniversalCoverageFactoryDecisionLayerV1["candidate_work_items"][number] {
  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `ucf-decision-${args.subjectId.replaceAll(":", "-")}`,
    subject_ids: [args.subjectId],
    required_evidence_checks: ["identity", "fit", "buyer_path"],
    permitted_action_class: args.actionClass,
    requires_owner_review: false,
    priority_score: 10,
    blockers: [],
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

test("all disposition classes generate correct work types from committed reference pipeline", () => {
  const { factory, generated } = buildFixtureWorkGenerator();

  assert.ok(validateUniversalCoverageFactoryWorkGeneratorV1(generated));
  assert.equal(generated.generated_work_item_count, 8);
  assert.equal(generated.suppressed_subject_count, 3);

  const gswf = generated.work_items.find((item) => item.subject_ids[0]?.includes("gswf"));
  assert.ok(gswf);
  assert.equal(gswf.permitted_action_class, "MAPPING_REVIEW");
  assert.equal(gswf.work_item_id, stableUcfWorkItemIdV1("refrigerator_water:filter:gswf"));

  const edr2 = generated.work_items.find((item) => item.subject_ids[0]?.includes("edr2rxd1"));
  assert.ok(edr2);
  assert.equal(edr2.permitted_action_class, "READ_ONLY_RESEARCH");
  assert.ok(edr2.blockers.some((blocker) => blocker.includes("research_buyer_path")));

  const edr4 = generated.work_items.find((item) => item.subject_ids[0]?.includes("edr4rxd1"));
  assert.ok(edr4);
  assert.equal(edr4.permitted_action_class, "PLAN_CHANGE");
  assert.equal(edr4.requires_owner_review, true);

  const rpwfe = generated.work_items.find((item) => item.subject_ids[0]?.includes("rpwfe"));
  assert.ok(rpwfe);
  assert.equal(rpwfe.permitted_action_class, "MAPPING_REVIEW");
  assert.equal(rpwfe.requires_owner_review, true);
  assert.ok(
    rpwfe.blockers.some((blocker) =>
      blocker.includes(UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1),
    ),
  );
  assert.equal(
    rpwfe.blockers.some((blocker) =>
      blocker.includes(UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1),
    ),
    false,
  );

  for (const subjectId of factory.subject_rows
    .filter((head) => head.disposition === "suppressed")
    .map((head) => head.subject_id)) {
    assert.equal(
      generated.work_items.some((item) => item.subject_ids[0] === subjectId),
      false,
    );
  }
});

test("disposition to action class mapping covers all generator dispositions", () => {
  const cases: Array<{
    disposition: ReturnType<typeof dispositionForCoverageAssessmentV1>;
    expected: string | null;
  }> = [
    { disposition: "mapping_review", expected: "MAPPING_REVIEW" },
    { disposition: "owner_review", expected: "OWNER_REVIEW" },
    { disposition: "research_buyer_path", expected: "READ_ONLY_RESEARCH" },
    { disposition: "research_identity", expected: "READ_ONLY_RESEARCH" },
    { disposition: "research_fit", expected: "READ_ONLY_RESEARCH" },
    { disposition: "ready_for_change_planning", expected: "PLAN_CHANGE" },
    { disposition: "suppressed", expected: null },
  ];

  for (const { disposition, expected } of cases) {
    assert.equal(expectedActionClassForWorkGeneratorDisposition(disposition), expected);
  }

  assert.equal(dispositionForCoverageAssessmentV1("mapping_review"), "mapping_review");
  assert.equal(dispositionForCoverageAssessmentV1("research_fit"), "research_fit");
});

test("research_identity, research_fit, and research_buyer_path stay distinct in work items", () => {
  const identityId = "air_purifier:filter:research-identity";
  const fitId = "air_purifier:filter:research-fit";
  const buyerId = "air_purifier:filter:research-buyer";

  const decision = minimalDecisionLayer({
    subject_rows: [
      subjectRow({ subjectId: identityId, disposition: "research_identity" }),
      subjectRow({ subjectId: fitId, disposition: "research_fit" }),
      subjectRow({ subjectId: buyerId, disposition: "research_buyer_path" }),
    ],
    research_identity_subjects: [identityId],
    research_fit_subjects: [fitId],
    research_buyer_path_subjects: [buyerId],
    research_required_subjects: [buyerId, fitId, identityId].sort((a, b) => a.localeCompare(b)),
    candidate_work_items: [
      candidateItem({ subjectId: identityId, actionClass: "READ_ONLY_RESEARCH" }),
      candidateItem({ subjectId: fitId, actionClass: "READ_ONLY_RESEARCH" }),
      candidateItem({ subjectId: buyerId, actionClass: "READ_ONLY_RESEARCH" }),
    ],
  });

  const generated = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  assert.equal(generated.work_items.length, 3);

  const identityItem = generated.work_items.find((item) => item.subject_ids[0] === identityId);
  const fitItem = generated.work_items.find((item) => item.subject_ids[0] === fitId);
  const buyerItem = generated.work_items.find((item) => item.subject_ids[0] === buyerId);
  assert.ok(identityItem && fitItem && buyerItem);

  assert.ok(identityItem.blockers.some((blocker) => blocker.includes("research_identity")));
  assert.ok(fitItem.blockers.some((blocker) => blocker.includes("research_fit")));
  assert.ok(buyerItem.blockers.some((blocker) => blocker.includes("research_buyer_path")));
});

test("suppressed generates no work items", () => {
  const subjectId = "air_purifier:filter:blocked";
  const decision = minimalDecisionLayer({
    suppressed_subjects: [subjectId],
    subject_rows: [subjectRow({ subjectId, disposition: "suppressed" })],
  });

  const generated = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  assert.equal(generated.work_items.length, 0);
  assert.equal(generated.suppressed_subject_count, 1);
});

test("owner_review generates OWNER_REVIEW work item", () => {
  const subjectId = "vacuum:filter:owner-case";
  const decision = minimalDecisionLayer({
    subject_rows: [subjectRow({ subjectId, disposition: "owner_review", wedge: "whole_house_water" })],
    candidate_work_items: [
      candidateItem({ subjectId, actionClass: "OWNER_REVIEW" }),
    ],
  });

  const generated = buildUniversalCoverageFactoryWorkGeneratorV1(decision);
  assert.equal(generated.work_items.length, 1);
  assert.equal(generated.work_items[0]?.permitted_action_class, "OWNER_REVIEW");
});

test("evidence and blockers survive decision layer into work generator", () => {
  const { decision, generated } = buildFixtureWorkGenerator();
  const edr4 = decision.subject_rows.find((row) => row.subject_id.includes("edr4rxd1"));
  assert.ok(edr4);

  const workItem = generated.work_items.find((item) => item.subject_ids[0] === edr4.subject_id);
  assert.ok(workItem);
  assert.ok(workItem.blockers.some((blocker) => blocker.includes("evidence_summary:identity=")));
  assert.ok(workItem.blockers.some((blocker) => blocker.includes("provenance_ref_count:")));
});

test("deterministic output and no duplicate work items", () => {
  const first = buildFixtureWorkGenerator().generated;
  const second = buildFixtureWorkGenerator().generated;

  assert.deepEqual(first.work_items, second.work_items);
  assert.deepEqual(
    first.work_items.map((item) => item.work_item_id),
    [...first.work_items.map((item) => item.work_item_id)].sort((a, b) => a.localeCompare(b)),
  );
  assert.equal(
    first.work_items.length,
    new Set(first.work_items.map((item) => item.work_item_id)).size,
  );
});

test("no production mutation authority and provenance preserved", () => {
  const { decision, generated } = buildFixtureWorkGenerator();

  assert.equal(generated.mutation_authorized, false);
  assert.equal(generated.production_mutation_authorized, false);
  assert.equal(universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1(), false);
  assert.equal(coverageFactoryContractsGrantProductionMutationAuthorityV1(), false);
  assert.equal(generated.source_provenance_index_hash, decision.source_provenance_index_hash);

  for (const workItem of generated.work_items) {
    assert.ok(validateCoverageWorkItemV1(workItem));
    assert.equal(workItem.artifact_write_authorized, false);
    assert.ok(
      workItem.blockers.some((blocker) => blocker.includes(decision.source_provenance_index_hash)),
    );
  }
});

test("fail closed on invalid decision layer input", () => {
  assert.throws(
    () => buildUniversalCoverageFactoryWorkGeneratorV1({} as never),
    /fail closed/,
  );
});

test("planning-only work items cannot apply", () => {
  const { generated } = buildFixtureWorkGenerator();

  for (const workItem of generated.work_items) {
    assert.ok(
      workItem.blockers.some((blocker) => blocker.includes("WORK_GENERATOR_NO_APPLY_AUTHORITY")),
    );
    assert.equal(workItem.mutation_authorized, false);
    assert.equal(workItem.production_mutation_authorized, false);
    assert.equal(workItem.artifact_write_authorized, false);
  }
});
