/**
 * Universal Coverage Factory Decision Layer v1 — read-only prioritization over factory output.
 * Consumes universal_coverage_factory_v1 only; never recommends apply or grants mutation.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import type { CoverageAssessmentDispositionV1 } from "./coverage-assessment-v1";
import { DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1 } from "./coverage-evidence-requirements-v1";
import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "./coverage-work-item-v1";
import {
  UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
  validateUniversalCoverageFactoryV1,
  type UniversalCoverageFactoryBatchHeadV1,
  type UniversalCoverageFactoryV1,
} from "./universal-coverage-factory-v1";

export const UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1 =
  "universal_coverage_factory_decision_layer_v1" as const;

const DECISION_LAYER_SCHEMA_VERSION_V1 = "1.0.0" as const;

export type UniversalCoverageFactoryTruthBlockerV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  code: string;
  detail: string;
};

export type UniversalCoverageFactoryDecisionLayerV1 = {
  contract: typeof UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1;
  schema_version: typeof DECISION_LAYER_SCHEMA_VERSION_V1;
  source_contract: typeof UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1;
  source_provenance_index_hash: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
  truth_blockers: UniversalCoverageFactoryTruthBlockerV1[];
  candidate_work_items: CoverageWorkItemV1[];
  highest_priority_subject: string | null;
  highest_priority_wedge: HomekeepWedgeCatalog | null;
  safe_coverage_gain_estimate: number;
  suppressed_subjects: string[];
  research_required_subjects: string[];
  ready_for_change_planning_subjects: string[];
};

const RESEARCH_DISPOSITIONS_V1: readonly CoverageAssessmentDispositionV1[] = [
  "research_buyer_path",
  "research_identity",
  "research_fit",
];

/** Lower rank = higher decision priority (fail-closed ordering). */
const DECISION_DISPOSITION_PRIORITY_V1: Partial<Record<CoverageAssessmentDispositionV1, number>> = {
  mapping_review: 1,
  owner_review: 2,
  research_buyer_path: 3,
  research_identity: 3,
  research_fit: 3,
  ready_for_change_planning: 4,
  suppressed: 5,
  candidate_apply: 6,
  covered: 7,
};

function assertReadOnlyFactoryInput(factory: UniversalCoverageFactoryV1): void {
  if (!validateUniversalCoverageFactoryV1(factory)) {
    throw new Error("Invalid universal_coverage_factory_v1 input (fail closed)");
  }
  if (factory.mutation_authorized !== false || factory.production_mutation_authorized !== false) {
    throw new Error("Factory input grants mutation authority (fail closed)");
  }
  if (factory.run_manifest.mutation_authorized !== false) {
    throw new Error("Factory run_manifest grants mutation authority (fail closed)");
  }
}

function dispositionPriority(disposition: CoverageAssessmentDispositionV1): number {
  const priority = DECISION_DISPOSITION_PRIORITY_V1[disposition];
  if (priority === undefined) {
    throw new Error(`Unknown disposition for decision priority (fail closed): ${disposition}`);
  }
  return priority;
}

function compareBatchHeadsForPriority(
  left: UniversalCoverageFactoryBatchHeadV1,
  right: UniversalCoverageFactoryBatchHeadV1,
): number {
  const priorityCompare = dispositionPriority(left.disposition) - dispositionPriority(right.disposition);
  if (priorityCompare !== 0) return priorityCompare;
  const wedgeCompare = left.wedge.localeCompare(right.wedge);
  if (wedgeCompare !== 0) return wedgeCompare;
  return left.subject_id.localeCompare(right.subject_id);
}

function actionClassForDisposition(
  disposition: CoverageAssessmentDispositionV1,
): CoverageWorkItemActionClassV1 {
  if (disposition === "mapping_review") return "MAPPING_REVIEW";
  if (disposition === "owner_review" || disposition === "suppressed") return "OWNER_REVIEW";
  if (disposition === "ready_for_change_planning") return "PLAN_CHANGE";
  return "READ_ONLY_RESEARCH";
}

function deriveTruthBlockers(
  head: UniversalCoverageFactoryBatchHeadV1,
): UniversalCoverageFactoryTruthBlockerV1[] {
  const blockers: UniversalCoverageFactoryTruthBlockerV1[] = [];

  blockers.push({
    subject_id: head.subject_id,
    wedge: head.wedge,
    code: "DECISION_LAYER_NO_APPLY_AUTHORITY",
    detail: "Universal Coverage Factory decision layer never recommends apply or grants mutation.",
  });

  if (head.policy_apply_allowed) {
    blockers.push({
      subject_id: head.subject_id,
      wedge: head.wedge,
      code: "ADAPTER_POLICY_APPLY_NOT_DECISION_AUTHORIZED",
      detail: `Adapter reports policy_apply_allowed=true for adapter_state=${head.adapter_state}; decision layer does not authorize apply.`,
    });
  }

  if (head.disposition === "candidate_apply") {
    blockers.push({
      subject_id: head.subject_id,
      wedge: head.wedge,
      code: "CANDIDATE_APPLY_FAIL_CLOSED",
      detail: "candidate_apply disposition is never promoted by the decision layer.",
    });
  }

  if (head.disposition === "suppressed") {
    blockers.push({
      subject_id: head.subject_id,
      wedge: head.wedge,
      code: "SUPPRESSED_ADAPTER_STATE",
      detail: `Subject suppressed with adapter_state=${head.adapter_state}.`,
    });
  }

  if (
    head.disposition === "ready_for_change_planning" &&
    head.policy_apply_allowed === false
  ) {
    blockers.push({
      subject_id: head.subject_id,
      wedge: head.wedge,
      code: "PLANNING_ONLY_NO_APPLY",
      detail: `ready_for_change_planning with adapter_state=${head.adapter_state}; planning envelope only.`,
    });
  }

  return blockers;
}

function buildCandidateWorkItem(head: UniversalCoverageFactoryBatchHeadV1): CoverageWorkItemV1 {
  const truthBlockers = deriveTruthBlockers(head);
  const workItemBlockers = truthBlockers.map((blocker) => `${blocker.code}:${blocker.detail}`);

  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `ucf-decision-${head.subject_id.replaceAll(":", "-")}`,
    subject_ids: [head.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: actionClassForDisposition(head.disposition),
    requires_owner_review:
      head.disposition === "owner_review" ||
      head.disposition === "suppressed" ||
      head.disposition === "mapping_review" ||
      (head.disposition === "ready_for_change_planning" && head.policy_apply_allowed === false),
    priority_score: 100 - dispositionPriority(head.disposition),
    blockers: workItemBlockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function sortSubjectIdsDeterministic(subjectIds: string[]): string[] {
  return [...subjectIds].sort((left, right) => left.localeCompare(right));
}

export function validateUniversalCoverageFactoryDecisionLayerV1(
  row: unknown,
): row is UniversalCoverageFactoryDecisionLayerV1 {
  if (!row || typeof row !== "object") return false;
  const candidate = row as UniversalCoverageFactoryDecisionLayerV1;
  if (candidate.contract !== UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1) return false;
  if (candidate.read_only !== true) return false;
  if (candidate.data_mutation !== false) return false;
  if (candidate.mutation_authorized !== false) return false;
  if (candidate.production_mutation_authorized !== false) return false;
  if (candidate.source_contract !== UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1) return false;
  if (!Array.isArray(candidate.truth_blockers)) return false;
  if (!Array.isArray(candidate.candidate_work_items)) return false;
  if (!Array.isArray(candidate.suppressed_subjects)) return false;
  if (!Array.isArray(candidate.research_required_subjects)) return false;
  if (!Array.isArray(candidate.ready_for_change_planning_subjects)) return false;
  if (typeof candidate.safe_coverage_gain_estimate !== "number") return false;
  return true;
}

export function universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1(): false {
  return false;
}

export function buildUniversalCoverageFactoryDecisionLayerV1(
  factory: UniversalCoverageFactoryV1,
): UniversalCoverageFactoryDecisionLayerV1 {
  assertReadOnlyFactoryInput(factory);

  const orderedHeads = [...factory.batch_heads].sort(compareBatchHeadsForPriority);
  const highestHead = orderedHeads[0] ?? null;

  const truth_blockers = factory.batch_heads.flatMap(deriveTruthBlockers);
  const candidate_work_items = factory.batch_heads.map(buildCandidateWorkItem);

  const suppressed_subjects = sortSubjectIdsDeterministic(
    factory.batch_heads
      .filter((head) => head.disposition === "suppressed")
      .map((head) => head.subject_id),
  );

  const research_required_subjects = sortSubjectIdsDeterministic(
    factory.batch_heads
      .filter((head) => RESEARCH_DISPOSITIONS_V1.includes(head.disposition))
      .map((head) => head.subject_id),
  );

  const ready_for_change_planning_subjects = sortSubjectIdsDeterministic(
    factory.batch_heads
      .filter((head) => head.disposition === "ready_for_change_planning")
      .map((head) => head.subject_id),
  );

  const safe_coverage_gain_estimate = ready_for_change_planning_subjects.filter((subjectId) => {
    const head = factory.batch_heads.find((row) => row.subject_id === subjectId);
    return head !== undefined && head.policy_apply_allowed === false;
  }).length;

  return {
    contract: UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1,
    schema_version: DECISION_LAYER_SCHEMA_VERSION_V1,
    source_contract: UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
    source_provenance_index_hash: factory.run_manifest.provenance_index_hash,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    truth_blockers,
    candidate_work_items,
    highest_priority_subject: highestHead?.subject_id ?? null,
    highest_priority_wedge: highestHead?.wedge ?? null,
    safe_coverage_gain_estimate,
    suppressed_subjects,
    research_required_subjects,
    ready_for_change_planning_subjects,
  };
}
