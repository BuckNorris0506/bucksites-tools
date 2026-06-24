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
  UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
  validateUniversalCoverageFactoryV1,
  type UniversalCoverageFactorySubjectRowV1,
  type UniversalCoverageFactoryV1,
} from "./universal-coverage-factory-v1";

export const UNIVERSAL_COVERAGE_FACTORY_DECISION_LAYER_CONTRACT_V1 =
  "universal_coverage_factory_decision_layer_v1" as const;

const DECISION_LAYER_SCHEMA_VERSION_V1 = "1.1.0" as const;

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
  subject_rows: UniversalCoverageFactorySubjectRowV1[];
  truth_blockers: UniversalCoverageFactoryTruthBlockerV1[];
  candidate_work_items: CoverageWorkItemV1[];
  highest_priority_subject: string | null;
  highest_priority_wedge: HomekeepWedgeCatalog | null;
  safe_coverage_gain_estimate: number;
  suppressed_subjects: string[];
  research_required_subjects: string[];
  research_identity_subjects: string[];
  research_fit_subjects: string[];
  research_buyer_path_subjects: string[];
  ready_for_change_planning_subjects: string[];
};

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

function compareSubjectRowsForPriority(
  left: UniversalCoverageFactorySubjectRowV1,
  right: UniversalCoverageFactorySubjectRowV1,
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
  if (disposition === "owner_review") return "OWNER_REVIEW";
  if (disposition === "ready_for_change_planning") return "PLAN_CHANGE";
  return "READ_ONLY_RESEARCH";
}

function mapFactoryTruthBlockers(
  row: UniversalCoverageFactorySubjectRowV1,
): UniversalCoverageFactoryTruthBlockerV1[] {
  return row.truth_blockers.map((blocker) => ({
    subject_id: row.subject_id,
    wedge: row.wedge,
    code: blocker.code,
    detail: blocker.detail,
  }));
}

function deriveDecisionTruthBlockers(
  row: UniversalCoverageFactorySubjectRowV1,
): UniversalCoverageFactoryTruthBlockerV1[] {
  const blockers: UniversalCoverageFactoryTruthBlockerV1[] = [
    ...mapFactoryTruthBlockers(row),
  ];

  blockers.push({
    subject_id: row.subject_id,
    wedge: row.wedge,
    code: "DECISION_LAYER_NO_APPLY_AUTHORITY",
    detail: "Universal Coverage Factory decision layer never recommends apply or grants mutation.",
  });

  if (row.policy_apply_allowed) {
    blockers.push({
      subject_id: row.subject_id,
      wedge: row.wedge,
      code: "ADAPTER_POLICY_APPLY_NOT_DECISION_AUTHORIZED",
      detail: `Adapter reports policy_apply_allowed=true for adapter_state=${row.adapter_state}; decision layer does not authorize apply.`,
    });
  }

  if (row.disposition === "candidate_apply") {
    blockers.push({
      subject_id: row.subject_id,
      wedge: row.wedge,
      code: "CANDIDATE_APPLY_FAIL_CLOSED",
      detail: "candidate_apply disposition is never promoted by the decision layer.",
    });
  }

  if (row.disposition === "suppressed") {
    blockers.push({
      subject_id: row.subject_id,
      wedge: row.wedge,
      code: "SUPPRESSED_ADAPTER_STATE",
      detail: `Subject suppressed with adapter_state=${row.adapter_state}.`,
    });
  }

  if (row.disposition === "ready_for_change_planning" && row.policy_apply_allowed === false) {
    blockers.push({
      subject_id: row.subject_id,
      wedge: row.wedge,
      code: "PLANNING_ONLY_NO_APPLY",
      detail: `ready_for_change_planning with adapter_state=${row.adapter_state}; planning envelope only.`,
    });
  }

  for (const assessmentBlocker of row.blockers) {
    blockers.push({
      subject_id: row.subject_id,
      wedge: row.wedge,
      code: "ASSESSMENT_BLOCKER",
      detail: assessmentBlocker,
    });
  }

  return blockers;
}

function buildCandidateWorkItem(row: UniversalCoverageFactorySubjectRowV1): CoverageWorkItemV1 {
  const truthBlockers = deriveDecisionTruthBlockers(row);
  const workItemBlockers = truthBlockers.map((blocker) => `${blocker.code}:${blocker.detail}`);

  const hasPlanningFitContradiction = row.truth_blockers.some(
    (blocker) => blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
  );

  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `ucf-decision-${row.subject_id.replaceAll(":", "-")}`,
    subject_ids: [row.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: actionClassForDisposition(row.disposition),
    requires_owner_review:
      row.disposition === "owner_review" ||
      row.disposition === "mapping_review" ||
      (row.disposition === "ready_for_change_planning" &&
        (row.policy_apply_allowed === false || hasPlanningFitContradiction)),
    priority_score: 100 - dispositionPriority(row.disposition),
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

function filterSubjectsByDisposition(
  rows: UniversalCoverageFactorySubjectRowV1[],
  disposition: CoverageAssessmentDispositionV1,
): string[] {
  return sortSubjectIdsDeterministic(
    rows.filter((row) => row.disposition === disposition).map((row) => row.subject_id),
  );
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
  if (!Array.isArray(candidate.subject_rows)) return false;
  if (!Array.isArray(candidate.truth_blockers)) return false;
  if (!Array.isArray(candidate.candidate_work_items)) return false;
  if (!Array.isArray(candidate.suppressed_subjects)) return false;
  if (!Array.isArray(candidate.research_required_subjects)) return false;
  if (!Array.isArray(candidate.research_identity_subjects)) return false;
  if (!Array.isArray(candidate.research_fit_subjects)) return false;
  if (!Array.isArray(candidate.research_buyer_path_subjects)) return false;
  if (!Array.isArray(candidate.ready_for_change_planning_subjects)) return false;
  if (typeof candidate.safe_coverage_gain_estimate !== "number") return false;

  const suppressedSet = new Set(candidate.suppressed_subjects);
  if (
    candidate.candidate_work_items.some((item) =>
      item.subject_ids.some((subjectId) => suppressedSet.has(subjectId)),
    )
  ) {
    return false;
  }

  const researchUnion = new Set([
    ...candidate.research_identity_subjects,
    ...candidate.research_fit_subjects,
    ...candidate.research_buyer_path_subjects,
  ]);
  if (researchUnion.size !== candidate.research_required_subjects.length) {
    return false;
  }
  for (const subjectId of candidate.research_required_subjects) {
    if (!researchUnion.has(subjectId)) return false;
  }

  return true;
}

export function universalCoverageFactoryDecisionLayerGrantsMutationAuthorityV1(): false {
  return false;
}

export function buildUniversalCoverageFactoryDecisionLayerV1(
  factory: UniversalCoverageFactoryV1,
): UniversalCoverageFactoryDecisionLayerV1 {
  assertReadOnlyFactoryInput(factory);

  const subject_rows = factory.subject_rows;
  const orderedRows = [...subject_rows].sort(compareSubjectRowsForPriority);
  const highestRow = orderedRows[0] ?? null;

  const truth_blockers = subject_rows.flatMap(deriveDecisionTruthBlockers);
  const candidate_work_items = subject_rows
    .filter((row) => row.disposition !== "suppressed")
    .map(buildCandidateWorkItem);

  const suppressed_subjects = filterSubjectsByDisposition(subject_rows, "suppressed");
  const research_identity_subjects = filterSubjectsByDisposition(subject_rows, "research_identity");
  const research_fit_subjects = filterSubjectsByDisposition(subject_rows, "research_fit");
  const research_buyer_path_subjects = filterSubjectsByDisposition(
    subject_rows,
    "research_buyer_path",
  );
  const research_required_subjects = sortSubjectIdsDeterministic([
    ...research_identity_subjects,
    ...research_fit_subjects,
    ...research_buyer_path_subjects,
  ]);
  const ready_for_change_planning_subjects = filterSubjectsByDisposition(
    subject_rows,
    "ready_for_change_planning",
  );

  const safe_coverage_gain_estimate = ready_for_change_planning_subjects.filter((subjectId) => {
    const row = subject_rows.find((entry) => entry.subject_id === subjectId);
    return (
      row !== undefined &&
      row.policy_apply_allowed === false &&
      !row.truth_blockers.some(
        (blocker) => blocker.code === UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
      )
    );
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
    subject_rows,
    truth_blockers,
    candidate_work_items,
    highest_priority_subject: highestRow?.subject_id ?? null,
    highest_priority_wedge: highestRow?.wedge ?? null,
    safe_coverage_gain_estimate,
    suppressed_subjects,
    research_required_subjects,
    research_identity_subjects,
    research_fit_subjects,
    research_buyer_path_subjects,
    ready_for_change_planning_subjects,
  };
}
