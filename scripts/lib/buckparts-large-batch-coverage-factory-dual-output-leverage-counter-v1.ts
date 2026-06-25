/**
 * GOAT C1 dual-output leverage counter v1 — read-only business leverage metrics for LBCF summary.
 */

import type { LargeBatchCoverageFactoryStateV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";
import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";
import {
  isUcfPromotionDispositionV1,
} from "@/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1";

import type { LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1 } from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";
import { UCF_DISPOSITION_AUTHORITY_V1 } from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";

export const GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1 =
  "goat_c1_dual_output_leverage_counter_v1" as const;

export type GoatC1DualOutputLeverageCounterV1 = {
  contract: typeof GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  cohort_row_count: number;
  measurable: boolean;
  expansion_label_would_mislead_count: number;
  expansion_label_would_mislead_slugs: readonly string[];
  promotion_prevented_by_ucf_count: number;
  suppression_or_research_clarified_by_ucf_count: number;
  operator_review_simplification_count: number;
};

const PUBLISHABLE_FACTORY_STATES_V1: readonly LargeBatchCoverageFactoryStateV1[] = [
  "publishable_amazon_candidate",
  "publishable_waterdrop_candidate",
  "publishable_no_buy_page",
];

const AMBIGUOUS_EXPANSION_FACTORY_STATES_V1: readonly LargeBatchCoverageFactoryStateV1[] = [
  "existing_live_product",
  "alias_collision_candidate",
  "evidence_needed",
];

const RESEARCH_OR_SUPPRESSION_DISPOSITIONS_V1: readonly CoverageAssessmentDispositionV1[] = [
  "suppressed",
  "mapping_review",
  "owner_review",
  "research_identity",
  "research_fit",
  "research_buyer_path",
];

export function isClearlyBlockedExpansionFactoryStateV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): boolean {
  return factoryState === "blocked_do_not_publish";
}

export function isNaivelyPublishablePlanningOrActionableFactoryStateV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): boolean {
  return (
    PUBLISHABLE_FACTORY_STATES_V1.includes(factoryState) ||
    factoryState === "new_product_candidate"
  );
}

export function isAmbiguousExpansionFactoryStateV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): boolean {
  return AMBIGUOUS_EXPANSION_FACTORY_STATES_V1.includes(factoryState);
}

export function factoryStateHasNaiveExpansionReadRiskV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): boolean {
  if (isClearlyBlockedExpansionFactoryStateV1(factoryState)) return false;
  return (
    isNaivelyPublishablePlanningOrActionableFactoryStateV1(factoryState) ||
    isAmbiguousExpansionFactoryStateV1(factoryState)
  );
}

export function ucfDispositionContradictsNaiveExpansionReadV1(
  disposition: CoverageAssessmentDispositionV1,
): boolean {
  return RESEARCH_OR_SUPPRESSION_DISPOSITIONS_V1.includes(disposition);
}

export function isExpansionLabelMisleadingWithoutUcfV1(args: {
  factory_state: LargeBatchCoverageFactoryStateV1;
  ucf_core_disposition: CoverageAssessmentDispositionV1 | null;
  ucf_registered: boolean;
  ucf_authority_source: typeof UCF_DISPOSITION_AUTHORITY_V1 | null;
}): boolean {
  if (!factoryStateHasNaiveExpansionReadRiskV1(args.factory_state)) return false;
  if (!args.ucf_registered || args.ucf_core_disposition === null) return false;
  if (args.ucf_authority_source !== UCF_DISPOSITION_AUTHORITY_V1) return false;
  return ucfDispositionContradictsNaiveExpansionReadV1(args.ucf_core_disposition);
}

export function emptyGoatC1DualOutputLeverageCounterV1(): GoatC1DualOutputLeverageCounterV1 {
  return {
    contract: GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    cohort_row_count: 0,
    measurable: false,
    expansion_label_would_mislead_count: 0,
    expansion_label_would_mislead_slugs: [],
    promotion_prevented_by_ucf_count: 0,
    suppression_or_research_clarified_by_ucf_count: 0,
    operator_review_simplification_count: 0,
  };
}

export function buildGoatC1DualOutputLeverageCounterV1(args: {
  topCandidates: readonly { slug: string; factory_state: LargeBatchCoverageFactoryStateV1 }[];
  ucfDispositionRows: readonly LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1[];
}): GoatC1DualOutputLeverageCounterV1 {
  if (args.topCandidates.length !== args.ucfDispositionRows.length) {
    throw new Error("leverage counter: top candidate and UCF disposition row counts must match");
  }

  const expansion_label_would_mislead_slugs: string[] = [];
  let promotion_prevented_by_ucf_count = 0;
  let suppression_or_research_clarified_by_ucf_count = 0;

  for (let i = 0; i < args.topCandidates.length; i++) {
    const candidate = args.topCandidates[i]!;
    const ucfRow = args.ucfDispositionRows[i]!;
    if (candidate.slug !== ucfRow.slug) {
      throw new Error(`leverage counter: slug mismatch at index ${String(i)}`);
    }

    const misleading = isExpansionLabelMisleadingWithoutUcfV1({
      factory_state: candidate.factory_state,
      ucf_core_disposition: ucfRow.ucf_core_disposition,
      ucf_registered: ucfRow.ucf_registered,
      ucf_authority_source: ucfRow.ucf_authority_source,
    });
    if (!misleading || ucfRow.ucf_core_disposition === null) continue;

    expansion_label_would_mislead_slugs.push(candidate.slug);

    const naivePublishableOrActionable =
      isNaivelyPublishablePlanningOrActionableFactoryStateV1(candidate.factory_state);
    if (
      naivePublishableOrActionable &&
      !isUcfPromotionDispositionV1(ucfRow.ucf_core_disposition)
    ) {
      promotion_prevented_by_ucf_count += 1;
    }

    if (ucfDispositionContradictsNaiveExpansionReadV1(ucfRow.ucf_core_disposition)) {
      suppression_or_research_clarified_by_ucf_count += 1;
    }
  }

  const measurable = args.topCandidates.some((_, i) => {
    const ucfRow = args.ucfDispositionRows[i]!;
    return ucfRow.ucf_registered && ucfRow.ucf_core_disposition !== null;
  });

  return {
    contract: GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    cohort_row_count: args.topCandidates.length,
    measurable,
    expansion_label_would_mislead_count: expansion_label_would_mislead_slugs.length,
    expansion_label_would_mislead_slugs,
    promotion_prevented_by_ucf_count,
    suppression_or_research_clarified_by_ucf_count,
    operator_review_simplification_count: expansion_label_would_mislead_slugs.length,
  };
}

export function dualOutputLeverageCounterProvenanceFactV1(
  counter: GoatC1DualOutputLeverageCounterV1,
): string {
  if (!counter.measurable) {
    return `UNKNOWN: ${GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1} not measurable — UCF disposition unavailable for top cohort.`;
  }
  return `PROVEN: ${GOAT_C1_DUAL_OUTPUT_LEVERAGE_COUNTER_CONTRACT_V1} expansion_label_would_mislead_count=${String(counter.expansion_label_would_mislead_count)} promotion_prevented_by_ucf_count=${String(counter.promotion_prevented_by_ucf_count)} suppression_or_research_clarified_by_ucf_count=${String(counter.suppression_or_research_clarified_by_ucf_count)} operator_review_simplification_count=${String(counter.operator_review_simplification_count)}.`;
}
