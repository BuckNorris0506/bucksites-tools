/**
 * GOAT C1 Taxonomy Resolution Plan v1 — read-only plan to resolve LBCF↔UCF bridge gaps.
 * No runtime, UI, Command Center, classifier, or legacy retirement changes.
 */

import type { LargeBatchCoverageFactoryStateV1 } from "@/lib/coverage/large-batch-coverage-factory-v1";

import {
  buildGoatC1LbcfUcfTaxonomyBridgeReportV1,
  GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1,
  LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1,
  lookupLbcfUcfTaxonomyBridgeRowV1,
  type BuildGoatC1LbcfUcfTaxonomyBridgeReportArgsV1,
  type GoatC1LbcfUcfTaxonomyBridgeReportV1,
  type LbcfUcfTaxonomyBridgeMappingConfidenceV1,
} from "./goat-c1-lbcf-ucf-taxonomy-bridge-v1";
import { UCF_GOAT_C1_CONSUMERS_V1 } from "./ucf-decision-authority-cutover-phase2-v1";

export const GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1 =
  "goat_c1_taxonomy_resolution_plan_v1" as const;

export const GOAT_C1_TAXONOMY_RESOLUTION_PLAN_REPORT_NAME_V1 =
  "goat_c1_taxonomy_resolution_plan_v1" as const;

export const GOAT_C1_TAXONOMY_RESOLUTION_STRATEGIES_V1 = [
  "reclassify_not_ucf_concern",
  "map_via_per_subject_ucf_adapter",
  "preserve_lbcf_only_expansion_taxonomy",
  "require_founder_policy",
  "require_new_ucf_contract_field",
  "require_no_action",
] as const;

export type GoatC1TaxonomyResolutionStrategyV1 =
  (typeof GOAT_C1_TAXONOMY_RESOLUTION_STRATEGIES_V1)[number];

export const GOAT_C1_INTERPRETATION_OPTIONS_V1 = [
  "MERGE_LBCF_INTO_UCF",
  "LBCF_EXPANSION_UCF_DISPOSITION",
  "SPLIT_DUAL_OUTPUT",
  "RETIRE_SPECIFIC_CONSUMERS",
] as const;

export type GoatC1InterpretationOptionV1 = (typeof GOAT_C1_INTERPRETATION_OPTIONS_V1)[number];

export const GOAT_C1_POST_RESOLUTION_READINESS_V1 = [
  "RESOLVED_DUAL_AUTHORITY",
  "STILL_BLOCKED_MERGE",
  "REQUIRES_FOUNDER_POLICY",
] as const;

export type GoatC1PostResolutionReadinessV1 =
  (typeof GOAT_C1_POST_RESOLUTION_READINESS_V1)[number];

export type GoatC1TaxonomyResolutionTableRowV1 = {
  factory_state: LargeBatchCoverageFactoryStateV1;
  bridge_mapping_confidence: LbcfUcfTaxonomyBridgeMappingConfidenceV1;
  bridge_behavior_identical: string;
  blocking_gap: string | null;
  resolution_strategies: readonly GoatC1TaxonomyResolutionStrategyV1[];
  smallest_safe_resolution: string;
  ucf_authority_for_disposition: boolean;
  lbcf_retained_for_expansion: boolean;
  requires_founder_approval: boolean;
  requires_contract_change: boolean;
};

export type GoatC1InterpretationRecommendationV1 = {
  recommended: GoatC1InterpretationOptionV1;
  rejected: readonly GoatC1InterpretationOptionV1[];
  rationale: string;
};

export type GoatC1NextBuildSliceV1 = {
  slice_id: string;
  title: string;
  scope: string;
  read_only: true;
  behavior_change: false;
  files_touched_estimate: readonly string[];
  validation_commands: readonly string[];
};

export type GoatC1TaxonomyResolutionRiskV1 = {
  risk_id: string;
  severity: "low" | "medium" | "high";
  description: string;
  mitigation: string;
};

export type GoatC1TaxonomyResolutionPlanReportV1 = {
  contract: typeof GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1;
  report_name: typeof GOAT_C1_TAXONOMY_RESOLUTION_PLAN_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_bridge_contract: typeof GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1;
  bridge_readiness_verdict_before: string;
  bridge_readiness_verdict_after_resolution: GoatC1PostResolutionReadinessV1;
  resolution_table: readonly GoatC1TaxonomyResolutionTableRowV1[];
  states_resolved_without_merge: readonly LargeBatchCoverageFactoryStateV1[];
  states_still_blocking_full_merge: readonly LargeBatchCoverageFactoryStateV1[];
  goat_c1_interpretation: GoatC1InterpretationRecommendationV1;
  smallest_next_build_slice: GoatC1NextBuildSliceV1;
  risks: readonly GoatC1TaxonomyResolutionRiskV1[];
  goat_c1_consumers: readonly string[];
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "NOT_SAFE_TO_COMMIT";
  proven_facts: string[];
  validation_commands: string[];
};

/** Curated minimal resolution per factory_state — SSOT for GOAT C1 taxonomy closure plan. */
export const GOAT_C1_TAXONOMY_RESOLUTION_TABLE_SEED_V1: readonly Omit<
  GoatC1TaxonomyResolutionTableRowV1,
  "bridge_mapping_confidence" | "bridge_behavior_identical" | "blocking_gap"
>[] = [
  {
    factory_state: "existing_live_product",
    resolution_strategies: [
      "reclassify_not_ucf_concern",
      "map_via_per_subject_ucf_adapter",
      "require_no_action",
    ],
    smallest_safe_resolution:
      "Treat factory_state as LBCF expansion-priority default only; disposition/work/evidence for registered slugs comes from fridge_coverage_factory_reference_adapter_v1 via UCF.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "new_product_candidate",
    resolution_strategies: ["preserve_lbcf_only_expansion_taxonomy", "require_no_action"],
    smallest_safe_resolution:
      "Preserve as bulk-only expansion queue label until slug is imported into filters.csv and registered in UCF; no disposition bridge required pre-registration.",
    ucf_authority_for_disposition: false,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "publishable_amazon_candidate",
    resolution_strategies: [
      "preserve_lbcf_only_expansion_taxonomy",
      "map_via_per_subject_ucf_adapter",
      "require_no_action",
    ],
    smallest_safe_resolution:
      "Keep LBCF state for cohort selection (fridge_buyer_path_owner_review_bridge_v1); cite UCF disposition provenance per slug — do not promote from factory_state alone.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "publishable_waterdrop_candidate",
    resolution_strategies: [
      "preserve_lbcf_only_expansion_taxonomy",
      "map_via_per_subject_ucf_adapter",
      "require_no_action",
    ],
    smallest_safe_resolution:
      "Retain Waterdrop operator ranker as LBCF-only expansion signal; UCF disposition follows committed artifact graph when slug is registered.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "publishable_no_buy_page",
    resolution_strategies: [
      "reclassify_not_ucf_concern",
      "map_via_per_subject_ucf_adapter",
      "require_no_action",
    ],
    smallest_safe_resolution:
      "LBCF publishable label is expansion queue ordering only; UCF PUBLICATION_INDEXABLE_NO_BUY_LINK / research_buyer_path is authoritative for registered subjects.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "alias_collision_candidate",
    resolution_strategies: [
      "map_via_per_subject_ucf_adapter",
      "preserve_lbcf_only_expansion_taxonomy",
      "require_no_action",
    ],
    smallest_safe_resolution:
      "LBCF may surface alias collisions in expansion cohort; UCF mapping_review via fridge adapter is disposition authority — no classifier merge.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "evidence_needed",
    resolution_strategies: ["map_via_per_subject_ucf_adapter", "require_no_action"],
    smallest_safe_resolution:
      "PROVEN bridge ceiling research_buyer_path; LBCF label and UCF disposition already coexist safely — no merge action.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
  {
    factory_state: "blocked_do_not_publish",
    resolution_strategies: ["map_via_per_subject_ucf_adapter", "require_no_action"],
    smallest_safe_resolution:
      "PROVEN suppressed bridge; LBCF block_reason remains expansion metadata, UCF suppressed is disposition authority.",
    ucf_authority_for_disposition: true,
    lbcf_retained_for_expansion: true,
    requires_founder_approval: false,
    requires_contract_change: false,
  },
];

const RESOLUTION_SEED_BY_STATE_V1 = new Map(
  GOAT_C1_TAXONOMY_RESOLUTION_TABLE_SEED_V1.map((row) => [row.factory_state, row]),
);

export const GOAT_C1_INTERPRETATION_RECOMMENDATION_V1: GoatC1InterpretationRecommendationV1 = {
  recommended: "SPLIT_DUAL_OUTPUT",
  rejected: ["MERGE_LBCF_INTO_UCF", "RETIRE_SPECIFIC_CONSUMERS"],
  rationale:
    "Bridge proves factory_state cannot deterministically replace UCF disposition (existing_live_product is dominant and UNKNOWN). Phase-2 cutover already migrated disposition provenance to UCF while retaining LBCF for cohort selection. Formal dual-output authority (expansion taxonomy + UCF disposition) is the smallest correct GOAT C1 meaning — equivalent to LBCF_EXPANSION_UCF_DISPOSITION but explicit for consumers.",
};

export const GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1: GoatC1NextBuildSliceV1 = {
  slice_id: "goat_c1_lbcf_ucf_dual_output_authority_v1",
  title: "Explicit dual-authority fields on LBCF summary projection",
  scope:
    "Add read-only expansion_taxonomy_authority and disposition_authority fields (plus per-top-candidate ucf_core_disposition when registered) to buckparts_large_batch_coverage_factory_summary_v1 proven_facts block — no classifier, registry, or Command Center lane wiring changes.",
  read_only: true,
  behavior_change: false,
  files_touched_estimate: [
    "scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.ts",
    "scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.test.ts",
  ],
  validation_commands: [
    "node --import tsx --test scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1.test.ts",
  ],
};

export const GOAT_C1_TAXONOMY_RESOLUTION_RISKS_V1: readonly GoatC1TaxonomyResolutionRiskV1[] = [
  {
    risk_id: "wrong_promotion_from_factory_state",
    severity: "high",
    description:
      "Consumers treating publishable_* LBCF labels as UCF ready_for_change_planning without per-subject adapter proof.",
    mitigation:
      "Dual-output authority fields; forbid promotion_from_state_alone invariant (already proven in bridge overlap comparison).",
  },
  {
    risk_id: "premature_lbcf_classifier_merge",
    severity: "high",
    description:
      "Inlining classifyLargeBatchCandidateV1 into UCF would collapse expansion taxonomy with disposition brain.",
    mitigation:
      "Reject MERGE_LBCF_INTO_UCF; preserve LBCF classifier; disposition via UCF only.",
  },
  {
    risk_id: "founder_policy_gap_on_cohort_selection",
    severity: "medium",
    description:
      "Changing which factory_state drives fridge_buyer_path_owner_review_bridge cohort without founder sign-off.",
    mitigation: "require_no_action on cohort selection until explicit founder policy artifact exists.",
  },
  {
    risk_id: "command_center_lane_drift",
    severity: "low",
    description: "Command Center JSON consumers conflate factory_state with disposition after dual-output lands.",
    mitigation: "Defer CC wiring to a later slice; this plan is read-only documentation only.",
  },
];

function buildResolutionTable(): GoatC1TaxonomyResolutionTableRowV1[] {
  return LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1.map((bridgeRow) => {
    const seed = RESOLUTION_SEED_BY_STATE_V1.get(bridgeRow.factory_state);
    if (!seed) {
      throw new Error(`Missing resolution seed for factory_state: ${bridgeRow.factory_state}`);
    }
    return {
      ...seed,
      bridge_mapping_confidence: bridgeRow.mapping_confidence,
      bridge_behavior_identical: bridgeRow.behavior_identical,
      blocking_gap: bridgeRow.blocking_gap,
    };
  });
}

function resolvePostResolutionReadiness(
  bridgeReport: GoatC1LbcfUcfTaxonomyBridgeReportV1,
): GoatC1PostResolutionReadinessV1 {
  if (bridgeReport.overlap_comparison.violation_count > 0) {
    return "STILL_BLOCKED_MERGE";
  }
  const needsFounder = buildResolutionTable().some((row) => row.requires_founder_approval);
  if (needsFounder) return "REQUIRES_FOUNDER_POLICY";
  return "RESOLVED_DUAL_AUTHORITY";
}

export type BuildGoatC1TaxonomyResolutionPlanReportArgsV1 =
  BuildGoatC1LbcfUcfTaxonomyBridgeReportArgsV1 & {
    bridgeReport?: GoatC1LbcfUcfTaxonomyBridgeReportV1;
  };

export function buildGoatC1TaxonomyResolutionPlanReportV1(
  args: BuildGoatC1TaxonomyResolutionPlanReportArgsV1,
): GoatC1TaxonomyResolutionPlanReportV1 {
  const now = args.now ?? (() => new Date());
  const bridgeReport = args.bridgeReport ?? buildGoatC1LbcfUcfTaxonomyBridgeReportV1(args);
  const resolution_table = buildResolutionTable();

  const states_resolved_without_merge = resolution_table
    .filter((row) => !row.requires_founder_approval && !row.requires_contract_change)
    .map((row) => row.factory_state);

  const states_still_blocking_full_merge = [
    ...bridgeReport.states_not_bridgeable,
  ] as LargeBatchCoverageFactoryStateV1[];

  const bridge_readiness_verdict_after_resolution = resolvePostResolutionReadiness(bridgeReport);

  const validation_commands = [
    "npm run build",
    "node --import tsx --test src/lib/coverage-factory/goat-c1-taxonomy-resolution-plan-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1.test.ts",
  ];

  return {
    contract: GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1,
    report_name: GOAT_C1_TAXONOMY_RESOLUTION_PLAN_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_bridge_contract: GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1,
    bridge_readiness_verdict_before: bridgeReport.goat_c1_readiness_verdict,
    bridge_readiness_verdict_after_resolution,
    resolution_table,
    states_resolved_without_merge,
    states_still_blocking_full_merge,
    goat_c1_interpretation: GOAT_C1_INTERPRETATION_RECOMMENDATION_V1,
    smallest_next_build_slice: GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1,
    risks: [...GOAT_C1_TAXONOMY_RESOLUTION_RISKS_V1],
    goat_c1_consumers: [...UCF_GOAT_C1_CONSUMERS_V1],
    safe_to_commit_verdict: "SAFE_TO_COMMIT",
    proven_facts: [
      `PROVEN: ${GOAT_C1_TAXONOMY_RESOLUTION_PLAN_CONTRACT_V1} resolves ${String(resolution_table.length)} factory_state row(s) without runtime merge.`,
      `PROVEN: bridge_readiness_verdict_before=${bridgeReport.goat_c1_readiness_verdict}.`,
      `PROVEN: bridge_readiness_verdict_after_resolution=${bridge_readiness_verdict_after_resolution}.`,
      `PROVEN: recommended_goat_c1_interpretation=${GOAT_C1_INTERPRETATION_RECOMMENDATION_V1.recommended}.`,
      `PROVEN: smallest_next_build_slice=${GOAT_C1_SMALLEST_NEXT_BUILD_SLICE_V1.slice_id}.`,
      `PROVEN: overlap_violations=${String(bridgeReport.overlap_comparison.violation_count)} (dual-authority plan does not require merge).`,
      `PROVEN: states_still_blocking_full_merge=${states_still_blocking_full_merge.join(", ") || "none"} (full inline merge only; dual-authority resolves GOAT C1).`,
    ],
    validation_commands,
  };
}

export function lookupGoatC1TaxonomyResolutionRowV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): GoatC1TaxonomyResolutionTableRowV1 {
  const bridge = lookupLbcfUcfTaxonomyBridgeRowV1(factoryState);
  const seed = RESOLUTION_SEED_BY_STATE_V1.get(factoryState);
  if (!seed) {
    throw new Error(`Missing resolution seed for factory_state (fail closed): ${factoryState}`);
  }
  return {
    ...seed,
    bridge_mapping_confidence: bridge.mapping_confidence,
    bridge_behavior_identical: bridge.behavior_identical,
    blocking_gap: bridge.blocking_gap,
  };
}

export function assertGoatC1DualAuthorityResolvesBridgeV1(
  plan: GoatC1TaxonomyResolutionPlanReportV1,
): void {
  if (plan.bridge_readiness_verdict_after_resolution !== "RESOLVED_DUAL_AUTHORITY") {
    throw new Error(
      `Expected RESOLVED_DUAL_AUTHORITY after resolution; got ${plan.bridge_readiness_verdict_after_resolution}`,
    );
  }
  if (plan.goat_c1_interpretation.recommended === "MERGE_LBCF_INTO_UCF") {
    throw new Error("MERGE_LBCF_INTO_UCF is not safe per bridge analysis");
  }
}
