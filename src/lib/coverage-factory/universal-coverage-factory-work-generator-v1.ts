/**
 * Universal Coverage Factory Work Generator v1 — deterministic work items from decision layer.
 * Consumes universal_coverage_factory_decision_layer_v1 only; never grants mutation or apply authority.
 */

import type { CoverageAssessmentDispositionV1 } from "./coverage-assessment-v1";
import { DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1 } from "./coverage-evidence-requirements-v1";
import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "./coverage-work-item-v1";
import {
  UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1,
  validateUniversalCoverageFactoryDecisionLayerV1,
  type UniversalCoverageFactoryDecisionLayerV1,
} from "./universal-coverage-factory-decision-layer-v1";

export const UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1 =
  "universal_coverage_factory_work_generator_v1" as const;

const WORK_GENERATOR_SCHEMA_VERSION_V1 = "1.0.0" as const;

export type UniversalCoverageFactoryWorkGeneratorDispositionV1 =
  | "mapping_review"
  | "owner_review"
  | "research_buyer_path"
  | "research_identity"
  | "research_fit"
  | "ready_for_change_planning"
  | "suppressed";

export type UniversalCoverageFactoryWorkGeneratorV1 = {
  contract: typeof UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1;
  schema_version: typeof WORK_GENERATOR_SCHEMA_VERSION_V1;
  source_contract: typeof UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1;
  source_provenance_index_hash: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
  work_items: CoverageWorkItemV1[];
  suppressed_subject_count: number;
  generated_work_item_count: number;
};

const RESEARCH_DISPOSITIONS_V1: readonly UniversalCoverageFactoryWorkGeneratorDispositionV1[] = [
  "research_buyer_path",
  "research_identity",
  "research_fit",
];

function assertReadOnlyDecisionLayerInput(
  decision: UniversalCoverageFactoryDecisionLayerV1,
): void {
  if (!validateUniversalCoverageFactoryDecisionLayerV1(decision)) {
    throw new Error("Invalid universal_coverage_factory_decision_layer_v1 input (fail closed)");
  }
  if (decision.mutation_authorized !== false || decision.production_mutation_authorized !== false) {
    throw new Error("Decision layer input grants mutation authority (fail closed)");
  }
}

export function stableUcfWorkItemIdV1(subjectId: string): string {
  return `ucf-work-v1-${subjectId.replaceAll(":", "-")}`;
}

function inferDispositionForSubject(
  decision: UniversalCoverageFactoryDecisionLayerV1,
  subjectId: string,
): UniversalCoverageFactoryWorkGeneratorDispositionV1 {
  if (decision.suppressed_subjects.includes(subjectId)) {
    return "suppressed";
  }
  if (decision.ready_for_change_planning_subjects.includes(subjectId)) {
    return "ready_for_change_planning";
  }
  if (decision.research_required_subjects.includes(subjectId)) {
    const candidate = decision.candidate_work_items.find((item) => item.subject_ids[0] === subjectId);
    if (candidate?.permitted_action_class === "READ_ONLY_RESEARCH") {
      return "research_buyer_path";
    }
    return "research_buyer_path";
  }

  const candidate = decision.candidate_work_items.find((item) => item.subject_ids[0] === subjectId);
  if (!candidate) {
    throw new Error(`Missing candidate work item for subject ${subjectId} (fail closed)`);
  }

  if (candidate.permitted_action_class === "MAPPING_REVIEW") {
    return "mapping_review";
  }
  if (candidate.permitted_action_class === "OWNER_REVIEW") {
    return "owner_review";
  }
  if (candidate.permitted_action_class === "PLAN_CHANGE") {
    return "ready_for_change_planning";
  }
  if (candidate.permitted_action_class === "READ_ONLY_RESEARCH") {
    return "research_buyer_path";
  }

  throw new Error(
    `Unknown permitted_action_class for subject ${subjectId} (fail closed): ${candidate.permitted_action_class}`,
  );
}

function actionClassForWorkGeneratorDisposition(
  disposition: UniversalCoverageFactoryWorkGeneratorDispositionV1,
): CoverageWorkItemActionClassV1 | null {
  if (disposition === "suppressed") return null;
  if (disposition === "mapping_review") return "MAPPING_REVIEW";
  if (disposition === "owner_review") return "OWNER_REVIEW";
  if (RESEARCH_DISPOSITIONS_V1.includes(disposition)) return "READ_ONLY_RESEARCH";
  if (disposition === "ready_for_change_planning") return "PLAN_CHANGE";
  return null;
}

function provenanceBlockersFromDecision(
  decision: UniversalCoverageFactoryDecisionLayerV1,
  subjectId: string,
): string[] {
  const candidate = decision.candidate_work_items.find((item) => item.subject_ids[0] === subjectId);
  const truth = decision.truth_blockers
    .filter((blocker) => blocker.subject_id === subjectId)
    .map((blocker) => `${blocker.code}:${blocker.detail}`);

  const provenance = [
    `source_provenance_index_hash:${decision.source_provenance_index_hash}`,
    ...(candidate?.blockers ?? []),
    ...truth,
  ];

  return Array.from(new Set(provenance));
}

function buildGeneratedWorkItem(
  decision: UniversalCoverageFactoryDecisionLayerV1,
  subjectId: string,
  disposition: UniversalCoverageFactoryWorkGeneratorDispositionV1,
): CoverageWorkItemV1 {
  const actionClass = actionClassForWorkGeneratorDisposition(disposition);
  if (!actionClass) {
    throw new Error(`Cannot build work item for suppressed subject ${subjectId}`);
  }

  const blockers = [
    ...provenanceBlockersFromDecision(decision, subjectId),
    "WORK_GENERATOR_NO_APPLY_AUTHORITY:policy_apply_allowed remains false at work-generator layer",
  ];

  const candidate = decision.candidate_work_items.find((item) => item.subject_ids[0] === subjectId);
  const hasAdapterPolicyApply =
    decision.truth_blockers.some(
      (blocker) =>
        blocker.subject_id === subjectId &&
        blocker.code === "ADAPTER_POLICY_APPLY_NOT_DECISION_AUTHORIZED",
    ) ?? false;

  if (hasAdapterPolicyApply) {
    blockers.push(
      "WORK_GENERATOR_POLICY_APPLY_ENFORCED_FALSE:adapter policy_apply_allowed ignored; no apply authority",
    );
  }

  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: stableUcfWorkItemIdV1(subjectId),
    subject_ids: [subjectId],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: actionClass,
    requires_owner_review:
      disposition === "owner_review" ||
      disposition === "mapping_review" ||
      disposition === "ready_for_change_planning",
    priority_score: candidate?.priority_score ?? null,
    blockers: Array.from(new Set(blockers)),
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function collectSubjectIds(decision: UniversalCoverageFactoryDecisionLayerV1): string[] {
  const subjectIds = new Set<string>();
  for (const item of decision.candidate_work_items) {
    for (const subjectId of item.subject_ids) {
      subjectIds.add(subjectId);
    }
  }
  return Array.from(subjectIds).sort((left, right) => left.localeCompare(right));
}

export function validateUniversalCoverageFactoryWorkGeneratorV1(
  row: unknown,
): row is UniversalCoverageFactoryWorkGeneratorV1 {
  if (!row || typeof row !== "object") return false;
  const candidate = row as UniversalCoverageFactoryWorkGeneratorV1;
  if (candidate.contract !== UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1) return false;
  if (candidate.read_only !== true) return false;
  if (candidate.data_mutation !== false) return false;
  if (candidate.mutation_authorized !== false) return false;
  if (candidate.production_mutation_authorized !== false) return false;
  if (candidate.source_contract !== UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1) return false;
  if (!Array.isArray(candidate.work_items)) return false;
  if (typeof candidate.suppressed_subject_count !== "number") return false;
  if (typeof candidate.generated_work_item_count !== "number") return false;
  return true;
}

export function universalCoverageFactoryWorkGeneratorGrantsMutationAuthorityV1(): false {
  return false;
}

export function buildUniversalCoverageFactoryWorkGeneratorV1(
  decision: UniversalCoverageFactoryDecisionLayerV1,
): UniversalCoverageFactoryWorkGeneratorV1 {
  assertReadOnlyDecisionLayerInput(decision);

  const work_items: CoverageWorkItemV1[] = [];

  for (const subjectId of collectSubjectIds(decision)) {
    const disposition = inferDispositionForSubject(decision, subjectId);
    if (disposition === "suppressed") {
      continue;
    }

    const actionClass = actionClassForWorkGeneratorDisposition(disposition);
    if (!actionClass) {
      throw new Error(`Fail closed: suppressed disposition leaked for ${subjectId}`);
    }

    const item = buildGeneratedWorkItem(decision, subjectId, disposition);

    if (disposition === "ready_for_change_planning") {
      if (item.requires_owner_review !== true) {
        throw new Error(
          `ready_for_change_planning requires owner_review_required=true for ${subjectId}`,
        );
      }
      if (
        !item.blockers.some((blocker) => blocker.includes("WORK_GENERATOR_NO_APPLY_AUTHORITY"))
      ) {
        throw new Error(`ready_for_change_planning must enforce policy_apply_allowed false`);
      }
    }

    work_items.push(item);
  }

  work_items.sort((left, right) => left.work_item_id.localeCompare(right.work_item_id));

  const workItemIds = work_items.map((item) => item.work_item_id);
  if (workItemIds.length !== new Set(workItemIds).size) {
    throw new Error("Duplicate work_item_id detected (fail closed)");
  }

  return {
    contract: UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1,
    schema_version: WORK_GENERATOR_SCHEMA_VERSION_V1,
    source_contract: UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1,
    source_provenance_index_hash: decision.source_provenance_index_hash,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    work_items,
    suppressed_subject_count: decision.suppressed_subjects.length,
    generated_work_item_count: work_items.length,
  };
}

export function dispositionForCoverageAssessmentV1(
  disposition: CoverageAssessmentDispositionV1,
): UniversalCoverageFactoryWorkGeneratorDispositionV1 | "suppressed" {
  if (disposition === "suppressed") return "suppressed";
  if (disposition === "mapping_review") return "mapping_review";
  if (disposition === "owner_review") return "owner_review";
  if (disposition === "research_buyer_path") return "research_buyer_path";
  if (disposition === "research_identity") return "research_identity";
  if (disposition === "research_fit") return "research_fit";
  if (disposition === "ready_for_change_planning") return "ready_for_change_planning";
  throw new Error(`Disposition not supported by work generator (fail closed): ${disposition}`);
}

export function expectedActionClassForWorkGeneratorDisposition(
  disposition: UniversalCoverageFactoryWorkGeneratorDispositionV1,
): CoverageWorkItemActionClassV1 | null {
  return actionClassForWorkGeneratorDisposition(disposition);
}
