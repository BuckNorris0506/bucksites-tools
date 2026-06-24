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
import { UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1 } from "./universal-coverage-factory-v1";

export const UNIVERSAL_COVERAGE_FACTORY_WORK_GENERATOR_CONTRACT_V1 =
  "universal_coverage_factory_work_generator_v1" as const;

const WORK_GENERATOR_SCHEMA_VERSION_V1 = "1.1.0" as const;

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

function dispositionForSubjectRow(
  disposition: CoverageAssessmentDispositionV1,
): UniversalCoverageFactoryWorkGeneratorDispositionV1 {
  if (disposition === "suppressed") return "suppressed";
  if (disposition === "mapping_review") return "mapping_review";
  if (disposition === "owner_review") return "owner_review";
  if (disposition === "research_buyer_path") return "research_buyer_path";
  if (disposition === "research_identity") return "research_identity";
  if (disposition === "research_fit") return "research_fit";
  if (disposition === "ready_for_change_planning") return "ready_for_change_planning";
  throw new Error(`Disposition not supported by work generator (fail closed): ${disposition}`);
}

function inferDispositionForSubject(
  decision: UniversalCoverageFactoryDecisionLayerV1,
  subjectId: string,
): UniversalCoverageFactoryWorkGeneratorDispositionV1 {
  if (decision.suppressed_subjects.includes(subjectId)) {
    return "suppressed";
  }

  const row = decision.subject_rows.find((entry) => entry.subject_id === subjectId);
  if (!row) {
    throw new Error(`Missing subject row for ${subjectId} (fail closed)`);
  }

  return dispositionForSubjectRow(row.disposition);
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

function researchDispositionBlocker(
  disposition: UniversalCoverageFactoryWorkGeneratorDispositionV1,
): string {
  return `WORK_GENERATOR_RESEARCH_DISPOSITION:${disposition}`;
}

function provenanceBlockersFromDecision(
  decision: UniversalCoverageFactoryDecisionLayerV1,
  subjectId: string,
): string[] {
  const candidate = decision.candidate_work_items.find((item) => item.subject_ids[0] === subjectId);
  const row = decision.subject_rows.find((entry) => entry.subject_id === subjectId);
  const truth = decision.truth_blockers
    .filter((blocker) => blocker.subject_id === subjectId)
    .map((blocker) => `${blocker.code}:${blocker.detail}`);

  const provenance = [
    `source_provenance_index_hash:${decision.source_provenance_index_hash}`,
    ...(row?.blockers.map((blocker) => `ASSESSMENT_BLOCKER:${blocker}`) ?? []),
    ...(row
      ? [
          `evidence_summary:identity=${row.evidence_summary.identity}`,
          `evidence_summary:fit=${row.evidence_summary.fit}`,
          `evidence_summary:buyer_path=${row.evidence_summary.buyer_path}`,
          `provenance_ref_count:${row.provenance_summary.provenance_ref_count}`,
          `subject_link_count:${row.subject_link_count}`,
        ]
      : []),
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

  const row = decision.subject_rows.find((entry) => entry.subject_id === subjectId);
  const hasPlanningFitContradiction =
    row?.truth_blockers.some(
      (blocker) => blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
    ) ?? false;

  const blockers = [
    ...provenanceBlockersFromDecision(decision, subjectId),
    "WORK_GENERATOR_NO_APPLY_AUTHORITY:policy_apply_allowed remains false at work-generator layer",
  ];

  if (RESEARCH_DISPOSITIONS_V1.includes(disposition)) {
    blockers.push(researchDispositionBlocker(disposition));
  }

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

  if (hasPlanningFitContradiction) {
    blockers.push(
      `${UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1}:planning work is blocked from apply-ready interpretation`,
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
      (disposition === "ready_for_change_planning" &&
        (row?.policy_apply_allowed === false || hasPlanningFitContradiction)),
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
  return decision.subject_rows
    .filter((row) => row.disposition !== "suppressed")
    .map((row) => row.subject_id)
    .sort((left, right) => left.localeCompare(right));
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
      const row = decision.subject_rows.find((entry) => entry.subject_id === subjectId);
      const hasPlanningFitContradiction =
        row?.truth_blockers.some(
          (blocker) => blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
        ) ?? false;
      const planningOnlyEnvelope =
        row?.policy_apply_allowed === false || hasPlanningFitContradiction;

      if (planningOnlyEnvelope && item.requires_owner_review !== true) {
        throw new Error(
          `ready_for_change_planning requires owner_review_required=true for ${subjectId}`,
        );
      }
      if (
        !item.blockers.some((blocker) => blocker.includes("WORK_GENERATOR_NO_APPLY_AUTHORITY"))
      ) {
        throw new Error(`ready_for_change_planning must enforce no apply authority for ${subjectId}`);
      }
    }

    if (RESEARCH_DISPOSITIONS_V1.includes(disposition)) {
      if (!item.blockers.some((blocker) => blocker.includes(disposition))) {
        throw new Error(`research work item must preserve disposition ${disposition} for ${subjectId}`);
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
  return dispositionForSubjectRow(disposition);
}

export function expectedActionClassForWorkGeneratorDisposition(
  disposition: UniversalCoverageFactoryWorkGeneratorDispositionV1,
): CoverageWorkItemActionClassV1 | null {
  return actionClassForWorkGeneratorDisposition(disposition);
}
