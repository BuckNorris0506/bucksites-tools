/**
 * GOAT C1 — LBCF factory_state ↔ UCF disposition/work/evidence taxonomy bridge v1.
 * Read-only analysis; no registry, classifier, adapter, or production behavior changes.
 */

import {
  buildLargeBatchCoverageFactoryReportV1,
  LARGE_BATCH_COVERAGE_FACTORY_STATES_V1,
  type LargeBatchCoverageFactoryStateV1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";

import {
  buildFridgeCoverageFactoryReferenceProjectionV1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
import type { CoverageAssessmentDispositionV1 } from "./coverage-assessment-v1";
import type { CoverageEvidenceClaimStatusV1 } from "./coverage-evidence-v1";
import { DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1 } from "./coverage-evidence-requirements-v1";
import { buildCoverageSubjectIdV1 } from "./coverage-subject-id-v1";
import type { CoverageWorkItemActionClassV1 } from "./coverage-work-item-v1";
import { buildUcfDecisionAuthoritySnapshotV1 } from "./ucf-decision-authority-cutover-v1";
import { COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1 } from "./universal-coverage-factory-v1";

export const GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1 =
  "goat_c1_lbcf_ucf_taxonomy_bridge_v1" as const;

export const GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_REPORT_NAME_V1 =
  "goat_c1_lbcf_ucf_taxonomy_bridge_v1" as const;

export const LBCF_UCF_TAXONOMY_BRIDGE_MAPPING_CONFIDENCE_V1 = [
  "PROVEN",
  "INFERRED",
  "UNKNOWN",
] as const;

export type LbcfUcfTaxonomyBridgeMappingConfidenceV1 =
  (typeof LBCF_UCF_TAXONOMY_BRIDGE_MAPPING_CONFIDENCE_V1)[number];

export const LBCF_UCF_TAXONOMY_BRIDGE_BEHAVIOR_IDENTICAL_V1 = [
  "PROVEN",
  "INFERRED",
  "UNKNOWN",
  "FALSE",
] as const;

export type LbcfUcfTaxonomyBridgeBehaviorIdenticalV1 =
  (typeof LBCF_UCF_TAXONOMY_BRIDGE_BEHAVIOR_IDENTICAL_V1)[number];

export const GOAT_C1_READINESS_VERDICTS_V1 = [
  "NOT_READY_TAXONOMY_INCOMPLETE",
  "NOT_READY_BEHAVIOR_GAP",
  "CONDITIONALLY_READY_PROVEN_STATES_ONLY",
  "NOT_READY",
] as const;

export type GoatC1ReadinessVerdictV1 = (typeof GOAT_C1_READINESS_VERDICTS_V1)[number];

export type LbcfUcfTaxonomyBridgeMatrixRowV1 = {
  factory_state: LargeBatchCoverageFactoryStateV1;
  current_meaning: string;
  ucf_core_disposition_equivalent: string;
  ucf_adapter_state_hint: string | null;
  ucf_evidence_requirements: Partial<
    Record<(typeof DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions)[number], CoverageEvidenceClaimStatusV1>
  >;
  ucf_work_item_class: CoverageWorkItemActionClassV1 | "NONE";
  mapping_confidence: LbcfUcfTaxonomyBridgeMappingConfidenceV1;
  behavior_identical: LbcfUcfTaxonomyBridgeBehaviorIdenticalV1;
  forbids_promotion_from_state_alone: boolean;
  allowed_ucf_dispositions: readonly CoverageAssessmentDispositionV1[] | "UNKNOWN";
  blocking_gap: string | null;
};

export type LbcfUcfOverlapComparisonRowV1 = {
  slug: string;
  subject_id: string;
  lbcf_factory_state: LargeBatchCoverageFactoryStateV1 | "MISSING_FROM_LBCF";
  ucf_core_disposition: CoverageAssessmentDispositionV1;
  ucf_adapter_state: string | null;
  ucf_work_item_action_class: CoverageWorkItemActionClassV1 | null;
  ucf_requires_owner_review: boolean;
  bridge_mapping_confidence: LbcfUcfTaxonomyBridgeMappingConfidenceV1 | "MISSING_FROM_LBCF";
  bridge_permits_observed_ucf: boolean | null;
  violations: string[];
};

export type LbcfUcfTaxonomyBridgeComparisonV1 = {
  overlapping_slug_count: number;
  compared_row_count: number;
  rows: LbcfUcfOverlapComparisonRowV1[];
  violation_count: number;
  unknown_mapping_row_count: number;
  promotion_from_state_alone_violation_count: number;
  suppressed_became_actionable_count: number;
  planning_lost_owner_review_count: number;
};

export type GoatC1LbcfUcfTaxonomyBridgeReportV1 = {
  contract: typeof GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1;
  report_name: typeof GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  factory_state_inventory: readonly LargeBatchCoverageFactoryStateV1[];
  bridge_matrix: readonly LbcfUcfTaxonomyBridgeMatrixRowV1[];
  overlap_comparison: LbcfUcfTaxonomyBridgeComparisonV1;
  states_proven_bridgeable: readonly LargeBatchCoverageFactoryStateV1[];
  states_inferred_bridgeable: readonly LargeBatchCoverageFactoryStateV1[];
  states_not_bridgeable: readonly LargeBatchCoverageFactoryStateV1[];
  goat_c1_readiness_verdict: GoatC1ReadinessVerdictV1;
  can_merge_lbcf_factory_state_into_ucf_today: false;
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "NOT_SAFE_TO_COMMIT";
  proven_facts: string[];
  validation_commands: string[];
};

const UCF_PROMOTION_DISPOSITIONS_V1: readonly CoverageAssessmentDispositionV1[] = [
  "ready_for_change_planning",
  "candidate_apply",
  "covered",
];

const RESEARCH_DISPOSITIONS_V1: readonly CoverageAssessmentDispositionV1[] = [
  "research_identity",
  "research_fit",
  "research_buyer_path",
];

export const LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1: readonly LbcfUcfTaxonomyBridgeMatrixRowV1[] = [
  {
    factory_state: "blocked_do_not_publish",
    current_meaning:
      "Frozen amazon-rescue token, excluded Frigidaire routing token, alias placeholder without catalog row, or search-placeholder-only without live filters.csv row.",
    ucf_core_disposition_equivalent: "suppressed",
    ucf_adapter_state_hint: "AUDIT_BLOCKED | DO_NOT_USE_WRONG_PART_RISK | NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
    ucf_evidence_requirements: { identity: "unknown", fit: "blocked", buyer_path: "blocked" },
    ucf_work_item_class: "NONE",
    mapping_confidence: "PROVEN",
    behavior_identical: "PROVEN",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: ["suppressed"],
    blocking_gap: null,
  },
  {
    factory_state: "alias_collision_candidate",
    current_meaning: "Alias token maps to multiple filter_slug values in filter_aliases.csv.",
    ucf_core_disposition_equivalent: "mapping_review",
    ucf_adapter_state_hint: "CONFLICT_REQUIRES_RECONCILIATION",
    ucf_evidence_requirements: { identity: "proven", fit: "unknown", buyer_path: "unknown" },
    ucf_work_item_class: "MAPPING_REVIEW",
    mapping_confidence: "PROVEN",
    behavior_identical: "INFERRED",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: ["mapping_review", "owner_review"],
    blocking_gap: "LBCF cohort priority differs from fridge adapter conflict resolution lane.",
  },
  {
    factory_state: "evidence_needed",
    current_meaning:
      "Amazon-rescue default cohort token on live slug without committed amazon-*-live-outcome evidence artifact.",
    ucf_core_disposition_equivalent: "research_buyer_path",
    ucf_adapter_state_hint: "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE | READY_FOR_OWNER_BROWSER_PROOF",
    ucf_evidence_requirements: { identity: "proven", fit: "unknown", buyer_path: "unknown" },
    ucf_work_item_class: "READ_ONLY_RESEARCH",
    mapping_confidence: "PROVEN",
    behavior_identical: "INFERRED",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: [
      ...RESEARCH_DISPOSITIONS_V1,
      "mapping_review",
      "owner_review",
      "suppressed",
    ],
    blocking_gap: null,
  },
  {
    factory_state: "publishable_no_buy_page",
    current_meaning:
      "Live filters.csv row without gated buyable retailer_links — info-only publication path.",
    ucf_core_disposition_equivalent: "research_buyer_path",
    ucf_adapter_state_hint: "PUBLICATION_INDEXABLE_NO_BUY_LINK",
    ucf_evidence_requirements: { identity: "proven", fit: "proven", buyer_path: "blocked" },
    ucf_work_item_class: "READ_ONLY_RESEARCH",
    mapping_confidence: "INFERRED",
    behavior_identical: "INFERRED",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: [
      "research_buyer_path",
      "owner_review",
      "mapping_review",
      "suppressed",
    ],
    blocking_gap: "LBCF publishable cohort label is expansion-oriented; UCF uses audit/browser-proof dispositions.",
  },
  {
    factory_state: "publishable_amazon_candidate",
    current_meaning:
      "Amazon live-outcome evidence and/or gated buyable amazon retailer_links row on live or bulk slug.",
    ucf_core_disposition_equivalent:
      "research_buyer_path → ready_for_change_planning (requires adapter/browser-proof evidence)",
    ucf_adapter_state_hint:
      "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF | APPLY_READY_AFTER_OWNER_BROWSER_PROOF | RESCUE_BROWSER_PROOF_READY",
    ucf_evidence_requirements: { identity: "proven", fit: "proven", buyer_path: "unknown" },
    ucf_work_item_class: "OWNER_REVIEW",
    mapping_confidence: "INFERRED",
    behavior_identical: "UNKNOWN",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: [
      ...RESEARCH_DISPOSITIONS_V1,
      "owner_review",
      "mapping_review",
      "ready_for_change_planning",
      "suppressed",
    ],
    blocking_gap:
      "factory_state alone overstates planning readiness; fridge_buyer_path_owner_review_bridge_v1 still selects cohort by LBCF state.",
  },
  {
    factory_state: "publishable_waterdrop_candidate",
    current_meaning:
      "Waterdrop operator feed recommended_for_owner_browser_proof without committed live-outcome evidence.",
    ucf_core_disposition_equivalent: "research_buyer_path",
    ucf_adapter_state_hint: "READY_FOR_OWNER_BROWSER_PROOF",
    ucf_evidence_requirements: { identity: "proven", fit: "unknown", buyer_path: "unknown" },
    ucf_work_item_class: "OWNER_REVIEW",
    mapping_confidence: "INFERRED",
    behavior_identical: "UNKNOWN",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: [
      ...RESEARCH_DISPOSITIONS_V1,
      "owner_review",
      "mapping_review",
      "suppressed",
    ],
    blocking_gap: "Waterdrop proof-slice ranking is LBCF-specific; UCF uses committed artifact graph.",
  },
  {
    factory_state: "existing_live_product",
    current_meaning:
      "Slug in committed data/filters.csv without a stronger publish/monetization factory signal.",
    ucf_core_disposition_equivalent: "UNKNOWN — depends on fridge adapter audit/browser-proof graph",
    ucf_adapter_state_hint: null,
    ucf_evidence_requirements: {},
    ucf_work_item_class: "READ_ONLY_RESEARCH",
    mapping_confidence: "UNKNOWN",
    behavior_identical: "UNKNOWN",
    forbids_promotion_from_state_alone: false,
    allowed_ucf_dispositions: "UNKNOWN",
    blocking_gap:
      "Dominant LBCF state on registered fridge subjects; cannot deterministically bridge without per-subject adapter disposition.",
  },
  {
    factory_state: "new_product_candidate",
    current_meaning: "Slug in fridge-homekeep-bulk-catalog-v1 but not in committed data/filters.csv.",
    ucf_core_disposition_equivalent: "research_identity | research_buyer_path",
    ucf_adapter_state_hint: null,
    ucf_evidence_requirements: { identity: "unknown", fit: "unknown", buyer_path: "unknown" },
    ucf_work_item_class: "READ_ONLY_RESEARCH",
    mapping_confidence: "UNKNOWN",
    behavior_identical: "UNKNOWN",
    forbids_promotion_from_state_alone: true,
    allowed_ucf_dispositions: "UNKNOWN",
    blocking_gap:
      "Bulk-only expansion rows are not registered UCF subjects; overlap comparison typically empty.",
  },
] as const;

const BRIDGE_MATRIX_BY_STATE_V1 = new Map(
  LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1.map((row) => [row.factory_state, row]),
);

export function lookupLbcfUcfTaxonomyBridgeRowV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): LbcfUcfTaxonomyBridgeMatrixRowV1 {
  const row = BRIDGE_MATRIX_BY_STATE_V1.get(factoryState);
  if (!row) {
    throw new Error(`Unknown LBCF factory_state (fail closed): ${factoryState}`);
  }
  return row;
}

export function assertLbcfBridgeKnownV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): asserts factoryState is LargeBatchCoverageFactoryStateV1 {
  if (!BRIDGE_MATRIX_BY_STATE_V1.has(factoryState)) {
    throw new Error(`Unknown LBCF factory_state (fail closed): ${factoryState}`);
  }
}

export function lbcfBridgePermitsUcfDispositionV1(args: {
  factory_state: LargeBatchCoverageFactoryStateV1;
  ucf_core_disposition: CoverageAssessmentDispositionV1;
}): boolean | null {
  const bridge = lookupLbcfUcfTaxonomyBridgeRowV1(args.factory_state);
  if (bridge.allowed_ucf_dispositions === "UNKNOWN") return null;
  return (bridge.allowed_ucf_dispositions as readonly string[]).includes(args.ucf_core_disposition);
}

export function lbcfFactoryStateForbidsPromotionAloneV1(
  factoryState: LargeBatchCoverageFactoryStateV1,
): boolean {
  return lookupLbcfUcfTaxonomyBridgeRowV1(factoryState).forbids_promotion_from_state_alone;
}

export function isUcfPromotionDispositionV1(
  disposition: CoverageAssessmentDispositionV1,
): boolean {
  return (UCF_PROMOTION_DISPOSITIONS_V1 as readonly string[]).includes(disposition);
}

export type CompareLbcfUcfOverlappingFridgeSubjectsArgsV1 = {
  rootDir: string;
  now?: () => Date;
};

export function compareLbcfUcfOverlappingFridgeSubjectsV1(
  args: CompareLbcfUcfOverlappingFridgeSubjectsArgsV1,
): LbcfUcfTaxonomyBridgeComparisonV1 {
  const now = args.now ?? (() => new Date());
  const registeredSlugs = [
    ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1],
  ];
  const lbcfReport = buildLargeBatchCoverageFactoryReportV1({ rootDir: args.rootDir, now });
  const lbcfBySlug = new Map(
    lbcfReport.top_candidates.map((candidate) => [candidate.slug.toLowerCase(), candidate]),
  );

  const fridgeProjection = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: args.rootDir,
    filterSlugs: registeredSlugs,
    now,
  });
  const snapshot = buildUcfDecisionAuthoritySnapshotV1({ rootDir: args.rootDir, now });

  const rows: LbcfUcfOverlapComparisonRowV1[] = [];
  let violation_count = 0;
  let unknown_mapping_row_count = 0;
  let promotion_from_state_alone_violation_count = 0;
  let suppressed_became_actionable_count = 0;
  let planning_lost_owner_review_count = 0;

  for (let i = 0; i < fridgeProjection.subjects.length; i++) {
    const subject = fridgeProjection.subjects[i]!;
    const assessment = fridgeProjection.assessments[i]!;
    const adapterWork = fridgeProjection.work_items[i]!;
    const slug = registeredSlugs[i]!.toLowerCase();
    const lbcfCandidate = lbcfBySlug.get(slug);
    const factoryState = lbcfCandidate?.factory_state ?? "MISSING_FROM_LBCF";
    const bridge =
      factoryState === "MISSING_FROM_LBCF"
        ? null
        : lookupLbcfUcfTaxonomyBridgeRowV1(factoryState);

    const genWork = snapshot.work_generator.work_items.find((item) =>
      item.subject_ids.includes(subject.subject_id),
    );
    const workItem = genWork ?? adapterWork;
    const violations: string[] = [];

    const mappingConfidence =
      factoryState === "MISSING_FROM_LBCF" ? "MISSING_FROM_LBCF" : bridge!.mapping_confidence;

    if (mappingConfidence === "UNKNOWN") {
      unknown_mapping_row_count += 1;
    }

    if (factoryState !== "MISSING_FROM_LBCF" && bridge!.forbids_promotion_from_state_alone) {
      if (isUcfPromotionDispositionV1(assessment.core_disposition)) {
        violations.push(
          `factory_state=${factoryState} forbids promotion but ucf_core_disposition=${assessment.core_disposition}`,
        );
        promotion_from_state_alone_violation_count += 1;
      }
    }

    const permits =
      factoryState === "MISSING_FROM_LBCF"
        ? null
        : lbcfBridgePermitsUcfDispositionV1({
            factory_state: factoryState,
            ucf_core_disposition: assessment.core_disposition,
          });

    if (permits === false) {
      violations.push(
        `observed ucf_core_disposition=${assessment.core_disposition} not in allowed set for factory_state=${factoryState}`,
      );
    }

    if (assessment.core_disposition === "suppressed") {
      if (workItem.permitted_action_class === "PLAN_CHANGE") {
        violations.push("suppressed subject has PLAN_CHANGE work item");
        suppressed_became_actionable_count += 1;
      }
      if (genWork) {
        violations.push("work generator emitted item for suppressed subject");
        suppressed_became_actionable_count += 1;
      }
    }

    const planningDisposition =
      assessment.core_disposition === "ready_for_change_planning" ||
      assessment.core_disposition === "owner_review";
    if (planningDisposition && !workItem.requires_owner_review) {
      violations.push(
        `planning/owner-review disposition ${assessment.core_disposition} missing requires_owner_review on work item`,
      );
      planning_lost_owner_review_count += 1;
    }

    if (violations.length > 0) violation_count += 1;

    rows.push({
      slug,
      subject_id: subject.subject_id,
      lbcf_factory_state: factoryState,
      ucf_core_disposition: assessment.core_disposition,
      ucf_adapter_state: assessment.adapter_state,
      ucf_work_item_action_class: workItem.permitted_action_class,
      ucf_requires_owner_review: workItem.requires_owner_review,
      bridge_mapping_confidence: mappingConfidence,
      bridge_permits_observed_ucf: permits,
      violations,
    });
  }

  return {
    overlapping_slug_count: registeredSlugs.length,
    compared_row_count: rows.length,
    rows,
    violation_count,
    unknown_mapping_row_count,
    promotion_from_state_alone_violation_count,
    suppressed_became_actionable_count,
    planning_lost_owner_review_count,
  };
}

function classifyBridgeableStates(): {
  states_proven_bridgeable: LargeBatchCoverageFactoryStateV1[];
  states_inferred_bridgeable: LargeBatchCoverageFactoryStateV1[];
  states_not_bridgeable: LargeBatchCoverageFactoryStateV1[];
} {
  const states_proven_bridgeable: LargeBatchCoverageFactoryStateV1[] = [];
  const states_inferred_bridgeable: LargeBatchCoverageFactoryStateV1[] = [];
  const states_not_bridgeable: LargeBatchCoverageFactoryStateV1[] = [];

  for (const row of LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1) {
    if (row.mapping_confidence === "UNKNOWN" || row.behavior_identical === "UNKNOWN") {
      states_not_bridgeable.push(row.factory_state);
    } else if (row.mapping_confidence === "PROVEN") {
      states_proven_bridgeable.push(row.factory_state);
    } else {
      states_inferred_bridgeable.push(row.factory_state);
    }
  }

  return { states_proven_bridgeable, states_inferred_bridgeable, states_not_bridgeable };
}

function resolveGoatC1ReadinessVerdict(args: {
  comparison: LbcfUcfTaxonomyBridgeComparisonV1;
  states_not_bridgeable: readonly LargeBatchCoverageFactoryStateV1[];
}): GoatC1ReadinessVerdictV1 {
  if (args.comparison.violation_count > 0) return "NOT_READY_BEHAVIOR_GAP";
  if (args.states_not_bridgeable.includes("existing_live_product")) {
    return "NOT_READY_TAXONOMY_INCOMPLETE";
  }
  if (args.states_not_bridgeable.length > 0) return "NOT_READY_TAXONOMY_INCOMPLETE";
  return "CONDITIONALLY_READY_PROVEN_STATES_ONLY";
}

export type BuildGoatC1LbcfUcfTaxonomyBridgeReportArgsV1 = CompareLbcfUcfOverlappingFridgeSubjectsArgsV1;

export function buildGoatC1LbcfUcfTaxonomyBridgeReportV1(
  args: BuildGoatC1LbcfUcfTaxonomyBridgeReportArgsV1,
): GoatC1LbcfUcfTaxonomyBridgeReportV1 {
  const now = args.now ?? (() => new Date());
  const overlap_comparison = compareLbcfUcfOverlappingFridgeSubjectsV1(args);
  const { states_proven_bridgeable, states_inferred_bridgeable, states_not_bridgeable } =
    classifyBridgeableStates();
  const goat_c1_readiness_verdict = resolveGoatC1ReadinessVerdict({
    comparison: overlap_comparison,
    states_not_bridgeable,
  });

  const validation_commands = [
    "npm run build",
    "node --import tsx --test src/lib/coverage-factory/goat-c1-lbcf-ucf-taxonomy-bridge-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-replacement-proof-v1.test.ts",
    "node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts",
  ];

  return {
    contract: GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1,
    report_name: GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    factory_state_inventory: [...LARGE_BATCH_COVERAGE_FACTORY_STATES_V1],
    bridge_matrix: [...LBCF_UCF_TAXONOMY_BRIDGE_MATRIX_V1],
    overlap_comparison,
    states_proven_bridgeable,
    states_inferred_bridgeable,
    states_not_bridgeable,
    goat_c1_readiness_verdict,
    can_merge_lbcf_factory_state_into_ucf_today: false,
    safe_to_commit_verdict: "SAFE_TO_COMMIT",
    proven_facts: [
      `PROVEN: ${GOAT_C1_LBCF_UCF_TAXONOMY_BRIDGE_CONTRACT_V1} inventories ${String(LARGE_BATCH_COVERAGE_FACTORY_STATES_V1.length)} factory_state values.`,
      `PROVEN: overlap_comparison compared ${String(overlap_comparison.compared_row_count)} registered fridge slug(s); violations=${String(overlap_comparison.violation_count)}.`,
      `PROVEN: states_proven_bridgeable=${states_proven_bridgeable.join(", ") || "none"}.`,
      `PROVEN: states_not_bridgeable=${states_not_bridgeable.join(", ")}.`,
      `PROVEN: goat_c1_readiness_verdict=${goat_c1_readiness_verdict}.`,
      `PROVEN: can_merge_lbcf_factory_state_into_ucf_today=false (read-only bridge; no retirement).`,
    ],
    validation_commands,
  };
}

export function assertGoatC1LbcfUcfTaxonomyBridgeSafetyInvariantsV1(
  comparison: LbcfUcfTaxonomyBridgeComparisonV1,
): void {
  if (comparison.promotion_from_state_alone_violation_count > 0) {
    throw new Error(
      `LBCF→UCF promotion invariant failed: ${String(comparison.promotion_from_state_alone_violation_count)} violation(s)`,
    );
  }
  if (comparison.suppressed_became_actionable_count > 0) {
    throw new Error(
      `suppressed→actionable invariant failed: ${String(comparison.suppressed_became_actionable_count)} violation(s)`,
    );
  }
  if (comparison.planning_lost_owner_review_count > 0) {
    throw new Error(
      `planning owner-review invariant failed: ${String(comparison.planning_lost_owner_review_count)} violation(s)`,
    );
  }
}

export function registeredFridgeUcfSubjectIdForSlugV1(slug: string): string {
  return buildCoverageSubjectIdV1({
    wedge: "refrigerator_water",
    kind_segment: "filter",
    local_key: slug,
  });
}
