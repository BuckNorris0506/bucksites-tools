/**
 * GOAT C1 LBCF↔UCF dual-output authority helpers for summary projection (read-only).
 */

import type { LargeBatchCoverageFactoryStateV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";
import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";
import {
  buildRegisteredUcfFilterSlugSetV1,
  lookupUcfSubjectRowByFilterSlugV1,
  type UcfDecisionAuthoritySnapshotV1,
} from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";
import { UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1 } from "@/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1";
import {
  isUcfPromotionDispositionV1,
  lbcfFactoryStateForbidsPromotionAloneV1,
} from "@/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1";
import type {
  UniversalCoverageFactoryEvidenceSummaryV1,
  UniversalCoverageFactorySubjectTruthBlockerV1,
} from "@/lib/coverage-factory/universal-coverage-factory-v1";

export const GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1 =
  "goat_c1_lbcf_ucf_dual_output_authority_v1" as const;

export const LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1 = "large_batch_coverage_factory_v1" as const;

export const UCF_DISPOSITION_AUTHORITY_V1 = "universal_coverage_factory_v1" as const;

export const GOAT_C1_SPLIT_DUAL_OUTPUT_INTERPRETATION_V1 = "SPLIT_DUAL_OUTPUT" as const;

export type LargeBatchCoverageFactorySummaryDualAuthorityV1 = {
  contract: typeof GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1;
  expansion_taxonomy_authority: typeof LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1;
  disposition_authority: typeof UCF_DISPOSITION_AUTHORITY_V1;
  goat_c1_interpretation: typeof GOAT_C1_SPLIT_DUAL_OUTPUT_INTERPRETATION_V1;
  factory_state_implies_promotion_authority: false;
};

export type LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1 = {
  slug: string;
  ucf_registered: boolean;
  ucf_subject_id: string | null;
  ucf_core_disposition: CoverageAssessmentDispositionV1 | null;
  ucf_adapter_state: string | null;
  ucf_evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1 | null;
  ucf_truth_blockers: readonly UniversalCoverageFactorySubjectTruthBlockerV1[] | null;
  ucf_authority_source: typeof UCF_DISPOSITION_AUTHORITY_V1 | null;
  promotion_from_factory_state_alone: false;
};

export type BuildTopCandidatesUcfDispositionResultV1 = {
  rows: LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1[];
  unknown_facts: string[];
  attention_required: boolean;
};

export function buildLargeBatchCoverageFactorySummaryDualAuthorityV1(): LargeBatchCoverageFactorySummaryDualAuthorityV1 {
  return {
    contract: GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1,
    expansion_taxonomy_authority: LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1,
    disposition_authority: UCF_DISPOSITION_AUTHORITY_V1,
    goat_c1_interpretation: GOAT_C1_SPLIT_DUAL_OUTPUT_INTERPRETATION_V1,
    factory_state_implies_promotion_authority: false,
  };
}

export function buildTopCandidatesUcfDispositionV1(args: {
  topCandidates: readonly {
    slug: string;
    factory_state: LargeBatchCoverageFactoryStateV1;
  }[];
  snapshot: UcfDecisionAuthoritySnapshotV1 | null;
  wedge?: "refrigerator_water";
}): BuildTopCandidatesUcfDispositionResultV1 {
  const wedge = args.wedge ?? "refrigerator_water";
  const registered = args.snapshot
    ? args.snapshot.registered_filter_slugs
    : buildRegisteredUcfFilterSlugSetV1();
  const unknown_facts: string[] = [];
  let attention_required = false;

  const rows: LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1[] =
    args.topCandidates.map((candidate) => {
      const slug = candidate.slug.trim().toLowerCase();
      const ucf_registered = registered.has(slug);

      if (!ucf_registered) {
        return {
          slug: candidate.slug,
          ucf_registered: false,
          ucf_subject_id: null,
          ucf_core_disposition: null,
          ucf_adapter_state: null,
          ucf_evidence_summary: null,
          ucf_truth_blockers: null,
          ucf_authority_source: null,
          promotion_from_factory_state_alone: false,
        };
      }

      if (!args.snapshot) {
        attention_required = true;
        unknown_facts.push(
          `UNKNOWN: filter_slug=${slug} is UCF-registered but disposition snapshot is unavailable.`,
        );
        return {
          slug: candidate.slug,
          ucf_registered: true,
          ucf_subject_id: null,
          ucf_core_disposition: null,
          ucf_adapter_state: null,
          ucf_evidence_summary: null,
          ucf_truth_blockers: null,
          ucf_authority_source: null,
          promotion_from_factory_state_alone: false,
        };
      }

      const row = lookupUcfSubjectRowByFilterSlugV1(args.snapshot, slug, wedge);
      if (!row) {
        attention_required = true;
        unknown_facts.push(
          `UNKNOWN: filter_slug=${slug} is UCF-registered but missing from universal_coverage_factory_v1 subject_rows.`,
        );
        return {
          slug: candidate.slug,
          ucf_registered: true,
          ucf_subject_id: null,
          ucf_core_disposition: null,
          ucf_adapter_state: null,
          ucf_evidence_summary: null,
          ucf_truth_blockers: null,
          ucf_authority_source: null,
          promotion_from_factory_state_alone: false,
        };
      }

      return {
        slug: candidate.slug,
        ucf_registered: true,
        ucf_subject_id: row.subject_id,
        ucf_core_disposition: row.disposition,
        ucf_adapter_state: row.adapter_state,
        ucf_evidence_summary: { ...row.evidence_summary },
        ucf_truth_blockers: [...row.truth_blockers],
        ucf_authority_source: UCF_DISPOSITION_AUTHORITY_V1,
        promotion_from_factory_state_alone: false,
      };
    });

  assertDualOutputPromotionInvariantsV1({
    topCandidates: args.topCandidates,
    ucfDispositionRows: rows,
  });

  return { rows, unknown_facts, attention_required };
}

export function assertDualOutputPromotionInvariantsV1(args: {
  topCandidates: readonly { slug: string; factory_state: LargeBatchCoverageFactoryStateV1 }[];
  ucfDispositionRows: readonly LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1[];
}): void {
  if (args.topCandidates.length !== args.ucfDispositionRows.length) {
    throw new Error("dual-output invariant: top candidate and UCF disposition row counts must match");
  }

  for (let i = 0; i < args.topCandidates.length; i++) {
    const candidate = args.topCandidates[i]!;
    const ucfRow = args.ucfDispositionRows[i]!;
    if (candidate.slug !== ucfRow.slug) {
      throw new Error(`dual-output invariant: slug mismatch at index ${String(i)}`);
    }
    if (ucfRow.promotion_from_factory_state_alone !== false) {
      throw new Error("dual-output invariant: promotion_from_factory_state_alone must be false");
    }

    if (
      lbcfFactoryStateForbidsPromotionAloneV1(candidate.factory_state) &&
      ucfRow.ucf_core_disposition !== null &&
      isUcfPromotionDispositionV1(ucfRow.ucf_core_disposition) &&
      ucfRow.ucf_authority_source !== UCF_DISPOSITION_AUTHORITY_V1
    ) {
      throw new Error(
        `dual-output invariant: publishable/forbid-promotion factory_state=${candidate.factory_state} cannot imply promotion without UCF authority`,
      );
    }
  }
}

export function dualOutputAuthorityProvenanceFactV1(): string {
  return `PROVEN: ${GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1} expansion_taxonomy_authority=${LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1} disposition_authority=${UCF_DISPOSITION_AUTHORITY_V1} (${UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1}).`;
}
