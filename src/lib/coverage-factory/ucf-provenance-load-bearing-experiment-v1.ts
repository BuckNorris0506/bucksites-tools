/**
 * UCF provenance load-bearing experiment v1 — read-only falsification of Boardy's claim
 * that UCF authority/disposition survives removal of evidence provenance refs.
 * In-memory only; never mutates repo artifacts.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  buildApCoverageFactoryReferenceProjectionV1,
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./adapters/ap-coverage-factory-adapter-v1";
import {
  buildFridgeCoverageFactoryReferenceProjectionV1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  resetFridgeAdapterAuditCacheV1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildWhwCoverageFactoryReferenceProjectionV1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./adapters/whw-coverage-factory-adapter-v1";
import {
  coverageAssessmentPromotionAllowedV1,
  validateCoverageAssessmentWithEvidenceV1,
  type CoverageAssessmentDispositionV1,
  type CoverageAssessmentV1,
} from "./coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_DIMENSIONS_V1,
  validateCoverageEvidenceV1,
  type CoverageEvidenceDimensionV1,
  type CoverageEvidenceV1,
} from "./coverage-evidence-v1";
import type { CoverageWorkItemActionClassV1 } from "./coverage-work-item-v1";
import {
  buildProvenanceSummaryFromCoverageEvidenceV1,
  buildUniversalCoverageFactoryV1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  deriveFactorySubjectTruthBlockersV1,
  type UniversalCoverageFactoryProvenanceSummaryV1,
  type UniversalCoverageFactorySubjectRowV1,
  type UniversalCoverageFactorySubjectTruthBlockerV1,
  type UniversalCoverageFactoryV1,
  type UniversalCoverageFactoryEvidenceSummaryV1,
} from "./universal-coverage-factory-v1";

export const UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1 =
  "ucf_provenance_load_bearing_experiment_v1" as const;

export const UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_REPORT_NAME_V1 =
  "ucf_provenance_load_bearing_experiment_v1" as const;

export const UCF_PROVENANCE_FALSIFICATION_CLAIM_V1 =
  "If provenance is removed from evidence artifacts, UCF still produces the same authority/disposition." as const;

export type UcfProvenanceExperimentOutcomeV1 = "rejects" | "downgrades" | "unchanged";

export type UcfProvenanceExperimentVerdictV1 =
  | "PROVENANCE_LOAD_BEARING"
  | "PROVENANCE_DECORATIVE_RISK"
  | "MIXED";

export type UcfProvenanceSubjectProjectionV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  disposition: CoverageAssessmentDispositionV1;
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  provenance_summary: UniversalCoverageFactoryProvenanceSummaryV1;
  policy_apply_allowed: boolean;
  work_item_class: CoverageWorkItemActionClassV1;
  truth_blockers: UniversalCoverageFactorySubjectTruthBlockerV1[];
};

export type UcfProvenanceExperimentSubjectResultV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  selection_reason: string;
  baseline: UcfProvenanceSubjectProjectionV1;
  stripped: UcfProvenanceSubjectProjectionV1;
  stripped_evidence_valid: boolean;
  stripped_assessment_evidence_consistent: boolean;
  stripped_promotion_allowed: boolean;
  outcome: UcfProvenanceExperimentOutcomeV1;
};

export type UcfProvenanceLoadBearingExperimentReportV1 = {
  contract: typeof UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1;
  report_name: typeof UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  falsification_claim: typeof UCF_PROVENANCE_FALSIFICATION_CLAIM_V1;
  selected_subject_ids: readonly string[];
  subject_results: UcfProvenanceExperimentSubjectResultV1[];
  outcome_counts: Record<UcfProvenanceExperimentOutcomeV1, number>;
  verdict: UcfProvenanceExperimentVerdictV1;
  proven_facts: string[];
  unknown_facts: string[];
};

const EXPERIMENT_WEDGES_V1 = [
  "air_purifier",
  "whole_house_water",
  "refrigerator_water",
] as const satisfies readonly HomekeepWedgeCatalog[];

const PROMOTION_DISPOSITIONS_V1: readonly CoverageAssessmentDispositionV1[] = [
  "ready_for_change_planning",
  "candidate_apply",
];

export function workItemClassForDispositionV1(
  disposition: CoverageAssessmentDispositionV1,
): CoverageWorkItemActionClassV1 {
  if (disposition === "mapping_review") return "MAPPING_REVIEW";
  if (disposition === "owner_review") return "OWNER_REVIEW";
  if (disposition === "ready_for_change_planning") return "PLAN_CHANGE";
  return "READ_ONLY_RESEARCH";
}

export function stripProvenanceFromCoverageEvidenceV1(
  evidence: CoverageEvidenceV1,
): CoverageEvidenceV1 {
  const stripped: CoverageEvidenceV1 = {
    contract: evidence.contract,
    subject_id: evidence.subject_id,
    read_only: evidence.read_only,
    data_mutation: evidence.data_mutation,
    claims: {} as CoverageEvidenceV1["claims"],
  };

  for (const dimension of COVERAGE_EVIDENCE_DIMENSIONS_V1) {
    const claim = evidence.claims[dimension];
    stripped.claims[dimension] = {
      dimension: claim.dimension,
      status: claim.status,
      summary: claim.summary,
      provenance_refs: [],
    };
  }

  return stripped;
}

function failClosedEvidenceSummaryFromStrippedEvidenceV1(
  strippedEvidence: CoverageEvidenceV1,
): UniversalCoverageFactoryEvidenceSummaryV1 {
  const summary: UniversalCoverageFactoryEvidenceSummaryV1 = {
    identity: strippedEvidence.claims.identity.status,
    fit: strippedEvidence.claims.fit.status,
    buyer_path: strippedEvidence.claims.buyer_path.status,
    demand: strippedEvidence.claims.demand.status,
    publication: strippedEvidence.claims.publication.status,
  };

  for (const dimension of COVERAGE_EVIDENCE_DIMENSIONS_V1) {
    const claim = strippedEvidence.claims[dimension];
    if (claim.status === "proven" && claim.provenance_refs.length === 0) {
      summary[dimension] = "blocked";
    }
  }

  return summary;
}

function researchDispositionForDimensionV1(
  dimension: CoverageEvidenceDimensionV1,
): CoverageAssessmentDispositionV1 {
  if (dimension === "identity") return "research_identity";
  if (dimension === "fit") return "research_fit";
  if (dimension === "buyer_path") return "research_buyer_path";
  return "mapping_review";
}

export function deriveStrippedDispositionV1(args: {
  assessment: CoverageAssessmentV1;
  strippedEvidence: CoverageEvidenceV1;
}): CoverageAssessmentDispositionV1 {
  if (
    validateCoverageAssessmentWithEvidenceV1({
      assessment: args.assessment,
      evidence: args.strippedEvidence,
    })
  ) {
    return args.assessment.core_disposition;
  }

  for (const dimension of ["identity", "fit", "buyer_path"] as const) {
    const claim = args.strippedEvidence.claims[dimension];
    if (claim.status === "proven" && claim.provenance_refs.length === 0) {
      return researchDispositionForDimensionV1(dimension);
    }
  }

  return "mapping_review";
}

function projectionsEqualV1(
  baseline: UcfProvenanceSubjectProjectionV1,
  stripped: UcfProvenanceSubjectProjectionV1,
): boolean {
  return (
    baseline.disposition === stripped.disposition &&
    baseline.policy_apply_allowed === stripped.policy_apply_allowed &&
    baseline.work_item_class === stripped.work_item_class &&
    baseline.evidence_summary.identity === stripped.evidence_summary.identity &&
    baseline.evidence_summary.fit === stripped.evidence_summary.fit &&
    baseline.evidence_summary.buyer_path === stripped.evidence_summary.buyer_path &&
    baseline.evidence_summary.demand === stripped.evidence_summary.demand &&
    baseline.evidence_summary.publication === stripped.evidence_summary.publication &&
    baseline.provenance_summary.provenance_ref_count ===
      stripped.provenance_summary.provenance_ref_count
  );
}

export function classifyStrippedProvenanceOutcomeV1(args: {
  baseline: UcfProvenanceSubjectProjectionV1;
  stripped: UcfProvenanceSubjectProjectionV1;
  stripped_evidence_valid: boolean;
}): UcfProvenanceExperimentOutcomeV1 {
  if (!args.stripped_evidence_valid) return "rejects";
  if (projectionsEqualV1(args.baseline, args.stripped)) return "unchanged";
  return "downgrades";
}

export function classifyUcfProvenanceExperimentVerdictV1(
  results: readonly UcfProvenanceExperimentSubjectResultV1[],
): UcfProvenanceExperimentVerdictV1 {
  const outcomes = new Set(results.map((row) => row.outcome));
  const hasRejectOrDowngrade = outcomes.has("rejects") || outcomes.has("downgrades");
  const hasUnchanged = outcomes.has("unchanged");

  if (hasRejectOrDowngrade && hasUnchanged) return "MIXED";
  if (hasRejectOrDowngrade) return "PROVENANCE_LOAD_BEARING";
  return "PROVENANCE_DECORATIVE_RISK";
}

function subjectAuthorityScoreV1(row: UniversalCoverageFactorySubjectRowV1): number {
  let score = 0;
  if (PROMOTION_DISPOSITIONS_V1.includes(row.disposition)) score += 100;
  score += row.provenance_summary.provenance_ref_count;
  if (row.policy_apply_allowed) score += 10;
  return score;
}

export function selectUcfProvenanceExperimentSubjectsV1(
  factory: UniversalCoverageFactoryV1,
): UniversalCoverageFactorySubjectRowV1[] {
  const selected: UniversalCoverageFactorySubjectRowV1[] = [];

  for (const wedge of EXPERIMENT_WEDGES_V1) {
    const candidates = factory.subject_rows
      .filter((row) => row.wedge === wedge)
      .filter((row) => PROMOTION_DISPOSITIONS_V1.includes(row.disposition))
      .sort((left, right) => {
        const scoreCompare = subjectAuthorityScoreV1(right) - subjectAuthorityScoreV1(left);
        if (scoreCompare !== 0) return scoreCompare;
        return left.subject_id.localeCompare(right.subject_id);
      });

    const pick = candidates[0];
    if (!pick) {
      throw new Error(
        `ucf provenance experiment: no strong-authority subject for wedge ${wedge} (fail closed)`,
      );
    }
    selected.push(pick);
  }

  return selected;
}

type AdapterEvidenceBundleV1 = {
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
};

function loadAdapterEvidenceBundlesV1(rootDir: string): Map<string, AdapterEvidenceBundleV1> {
  resetFridgeAdapterAuditCacheV1();

  const projections = [
    buildApCoverageFactoryReferenceProjectionV1({
      rootDir,
      filterSlugs: [...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[AP_COVERAGE_FACTORY_ADAPTER_ID_V1]],
    }),
    buildWhwCoverageFactoryReferenceProjectionV1({
      rootDir,
      filterSlugs: [...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1]],
    }),
    buildFridgeCoverageFactoryReferenceProjectionV1({
      rootDir,
      filterSlugs: [
        ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1],
      ],
    }),
  ];

  const bundles = new Map<string, AdapterEvidenceBundleV1>();
  for (const projection of projections) {
    for (let index = 0; index < projection.subjects.length; index += 1) {
      const subject = projection.subjects[index]!;
      const assessment = projection.assessments[index]!;
      const evidence = projection.evidence[index]!;
      if (subject.subject_id !== assessment.subject_id || subject.subject_id !== evidence.subject_id) {
        throw new Error(`adapter bundle subject mismatch for ${subject.subject_id}`);
      }
      bundles.set(subject.subject_id, { assessment, evidence });
    }
  }

  return bundles;
}

function buildSubjectProjectionV1(args: {
  row: UniversalCoverageFactorySubjectRowV1;
  disposition: CoverageAssessmentDispositionV1;
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  provenance_summary: UniversalCoverageFactoryProvenanceSummaryV1;
  policy_apply_allowed: boolean;
  adapter_state: string;
}): UcfProvenanceSubjectProjectionV1 {
  const truth_blockers = deriveFactorySubjectTruthBlockersV1({
    disposition: args.disposition,
    evidence_summary: args.evidence_summary,
    adapter_state: args.adapter_state,
    policy_apply_allowed: args.policy_apply_allowed,
  });

  return {
    subject_id: args.row.subject_id,
    wedge: args.row.wedge,
    disposition: args.disposition,
    evidence_summary: args.evidence_summary,
    provenance_summary: args.provenance_summary,
    policy_apply_allowed: args.policy_apply_allowed,
    work_item_class: workItemClassForDispositionV1(args.disposition),
    truth_blockers,
  };
}

function buildBaselineProjectionV1(
  row: UniversalCoverageFactorySubjectRowV1,
): UcfProvenanceSubjectProjectionV1 {
  return buildSubjectProjectionV1({
    row,
    disposition: row.disposition,
    evidence_summary: row.evidence_summary,
    provenance_summary: row.provenance_summary,
    policy_apply_allowed: row.policy_apply_allowed,
    adapter_state: row.adapter_state,
  });
}

function buildStrippedProjectionV1(args: {
  row: UniversalCoverageFactorySubjectRowV1;
  assessment: CoverageAssessmentV1;
  strippedEvidence: CoverageEvidenceV1;
}): UcfProvenanceSubjectProjectionV1 {
  const disposition = deriveStrippedDispositionV1({
    assessment: args.assessment,
    strippedEvidence: args.strippedEvidence,
  });
  const evidence_summary = failClosedEvidenceSummaryFromStrippedEvidenceV1(args.strippedEvidence);
  const provenance_summary = buildProvenanceSummaryFromCoverageEvidenceV1(args.strippedEvidence);
  const policy_apply_allowed =
    disposition === "candidate_apply" ? args.assessment.policy_apply_allowed : false;

  return buildSubjectProjectionV1({
    row: args.row,
    disposition,
    evidence_summary,
    provenance_summary,
    policy_apply_allowed,
    adapter_state: args.row.adapter_state,
  });
}

export function runUcfProvenanceSubjectExperimentV1(args: {
  row: UniversalCoverageFactorySubjectRowV1;
  assessment: CoverageAssessmentV1;
  evidence: CoverageEvidenceV1;
}): UcfProvenanceExperimentSubjectResultV1 {
  const baseline = buildBaselineProjectionV1(args.row);
  const strippedEvidence = stripProvenanceFromCoverageEvidenceV1(args.evidence);
  const stripped = buildStrippedProjectionV1({
    row: args.row,
    assessment: args.assessment,
    strippedEvidence,
  });

  const stripped_evidence_valid = validateCoverageEvidenceV1(strippedEvidence);
  const stripped_assessment_evidence_consistent = validateCoverageAssessmentWithEvidenceV1({
    assessment: args.assessment,
    evidence: strippedEvidence,
  });
  const stripped_promotion_allowed =
    stripped_evidence_valid &&
    stripped_assessment_evidence_consistent &&
    coverageAssessmentPromotionAllowedV1({
      assessment: args.assessment,
      evidence: strippedEvidence,
    });

  const outcome = classifyStrippedProvenanceOutcomeV1({
    baseline,
    stripped,
    stripped_evidence_valid,
  });

  const promotionDims = (["identity", "fit", "buyer_path"] as const)
    .filter((dimension) => args.evidence.claims[dimension].status === "proven")
    .join(",");
  const selection_reason = `strong_authority disposition=${args.row.disposition} provenance_ref_count=${String(args.row.provenance_summary.provenance_ref_count)} promotion_dims=${promotionDims}`;

  return {
    subject_id: args.row.subject_id,
    wedge: args.row.wedge,
    selection_reason,
    baseline,
    stripped,
    stripped_evidence_valid,
    stripped_assessment_evidence_consistent,
    stripped_promotion_allowed,
    outcome,
  };
}

export function buildUcfProvenanceLoadBearingExperimentReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): UcfProvenanceLoadBearingExperimentReportV1 {
  const now = args.now ?? (() => new Date());
  const factory = buildUniversalCoverageFactoryV1({ rootDir: args.rootDir, now });
  const selectedRows = selectUcfProvenanceExperimentSubjectsV1(factory);
  const adapterBundles = loadAdapterEvidenceBundlesV1(args.rootDir);

  const subject_results = selectedRows.map((row) => {
    const bundle = adapterBundles.get(row.subject_id);
    if (!bundle) {
      throw new Error(`ucf provenance experiment: missing adapter evidence for ${row.subject_id}`);
    }
    return runUcfProvenanceSubjectExperimentV1({
      row,
      assessment: bundle.assessment,
      evidence: bundle.evidence,
    });
  });

  const outcome_counts: Record<UcfProvenanceExperimentOutcomeV1, number> = {
    rejects: subject_results.filter((row) => row.outcome === "rejects").length,
    downgrades: subject_results.filter((row) => row.outcome === "downgrades").length,
    unchanged: subject_results.filter((row) => row.outcome === "unchanged").length,
  };

  const verdict = classifyUcfProvenanceExperimentVerdictV1(subject_results);

  return {
    contract: UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1,
    report_name: UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    falsification_claim: UCF_PROVENANCE_FALSIFICATION_CLAIM_V1,
    selected_subject_ids: subject_results.map((row) => row.subject_id),
    subject_results,
    outcome_counts,
    verdict,
    proven_facts: [
      `PROVEN: ${UCF_PROVENANCE_LOAD_BEARING_EXPERIMENT_CONTRACT_V1} is read-only and performs in-memory provenance stripping only.`,
      `PROVEN: selected_subject_count=${String(subject_results.length)} (one per committed wedge: ${EXPERIMENT_WEDGES_V1.join(", ")}).`,
      `PROVEN: outcome_counts rejects=${String(outcome_counts.rejects)} downgrades=${String(outcome_counts.downgrades)} unchanged=${String(outcome_counts.unchanged)}.`,
      `PROVEN: falsification_verdict=${verdict}.`,
      ...subject_results.map(
        (row) =>
          `PROVEN: subject=${row.subject_id} baseline_disposition=${row.baseline.disposition} stripped_disposition=${row.stripped.disposition} outcome=${row.outcome}.`,
      ),
    ],
    unknown_facts: [
      "UNKNOWN: Experiment does not mutate repo evidence artifacts; production adapter inputs unchanged.",
      "UNKNOWN: Decorative provenance on non-selected subjects not exhaustively tested.",
    ],
  };
}

export function ucfProvenanceExperimentGrantsMutationAuthorityV1(): false {
  return false;
}
