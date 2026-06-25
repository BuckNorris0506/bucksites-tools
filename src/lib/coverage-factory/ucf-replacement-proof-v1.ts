/**
 * UCF Replacement Proof v1 — formal proof that UCF can replace legacy coverage-decision
 * authority for registered subjects without externally observable behavior deltas.
 * Read-only simulation; no registry, adapter, disposition, or evidence derivation changes.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  buildApCoverageFactoryReferenceProjectionV1,
} from "./adapters/ap-coverage-factory-adapter-v1";
import {
  buildFridgeCoverageFactoryReferenceProjectionV1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  buildWhwCoverageFactoryReferenceProjectionV1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
} from "./adapters/whw-coverage-factory-adapter-v1";
import type { CoverageAssessmentDispositionV1 } from "./coverage-assessment-v1";
import type { CoverageWorkItemActionClassV1 } from "./coverage-work-item-v1";
import { assessUcfCanonicalReadinessV1 } from "./ucf-canonical-readiness-policy-v1";
import {
  buildUcfDecisionAuthoritySnapshotV1,
  committedUcfRegisteredSubjectCountV1,
  type BuildUcfDecisionAuthoritySnapshotArgsV1,
  type UcfDecisionAuthoritySnapshotV1,
} from "./ucf-decision-authority-cutover-v1";
import { UCF_GOAT_C1_CONSUMERS_V1 } from "./ucf-decision-authority-cutover-phase2-v1";
import { COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1 } from "./universal-coverage-factory-v1";

export const UCF_REPLACEMENT_PROOF_CONTRACT_V1 = "ucf_replacement_proof_v1" as const;

export const UCF_REPLACEMENT_PROOF_REPORT_NAME_V1 = "ucf_replacement_proof_v1" as const;

export type UcfReplacementBehaviorIdenticalVerdictV1 = "PROVEN" | "UNKNOWN";

export type UcfReplacementSimulationDimensionV1 =
  | "core_disposition"
  | "adapter_state"
  | "policy_apply_allowed"
  | "evidence_summary"
  | "adapter_work_item_action_class"
  | "suppression_work_item"
  | "planning_cohort_membership"
  | "suppressed_cohort_membership";

export type UcfReplacementSimulationDeltaV1 = {
  subject_id: string;
  wedge: HomekeepWedgeCatalog;
  dimension: UcfReplacementSimulationDimensionV1;
  legacy_value: unknown;
  ucf_value: unknown;
  severity: "critical" | "high" | "medium";
  evidence: string;
};

export type UcfLegacyCoverageDecisionSourceV1 = {
  source_id: string;
  decision_authority: string;
  consumers: readonly string[];
  runtime_path: string;
  replacement_status: "REPLACED_BY_UCF" | "UCF_NATIVE" | "SHADOW_RETAINED" | "BLOCKED" | "NOT_APPLICABLE";
  blocker: string | null;
};

export type UcfReplacementMatrixRowV1 = {
  legacy_component: string;
  current_authority: string;
  ucf_equivalent: string;
  behavior_identical: UcfReplacementBehaviorIdenticalVerdictV1;
  can_replace_today: boolean;
  blocking_reason: string | null;
  decision_authority: string;
  consumers: readonly string[];
  runtime_path: string;
  replacement_status: UcfLegacyCoverageDecisionSourceV1["replacement_status"];
};

export type UcfReplacementSimulationResultV1 = {
  registered_subject_count: number;
  subjects_compared: number;
  behavior_deltas: UcfReplacementSimulationDeltaV1[];
  critical_delta_count: number;
  registered_critical_delta_count: number;
  simulation_passed: boolean;
  dimensions_verified: readonly UcfReplacementSimulationDimensionV1[];
};

export type UcfReplacementProofReportV1 = {
  contract: typeof UCF_REPLACEMENT_PROOF_CONTRACT_V1;
  report_name: typeof UCF_REPLACEMENT_PROOF_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  legacy_source_inventory: UcfLegacyCoverageDecisionSourceV1[];
  replacement_matrix: UcfReplacementMatrixRowV1[];
  simulation: UcfReplacementSimulationResultV1;
  replacement_ready_components: string[];
  remaining_blockers: string[];
  goat_c1_dependencies: readonly string[];
  can_delete_legacy_today: boolean;
  delete_candidates: string[];
  delete_blockers: string[];
  can_replace_existing_decision_logic_today: boolean;
  canonical_readiness_verdict: string;
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "NOT_SAFE_TO_COMMIT";
  proven_facts: string[];
  validation_commands: string[];
};

const EVIDENCE_DIMS = ["identity", "fit", "buyer_path", "demand", "publication"] as const;

const SIMULATION_DIMENSIONS_V1: readonly UcfReplacementSimulationDimensionV1[] = [
  "core_disposition",
  "adapter_state",
  "policy_apply_allowed",
  "evidence_summary",
  "adapter_work_item_action_class",
  "suppression_work_item",
  "planning_cohort_membership",
  "suppressed_cohort_membership",
];

export const UCF_LEGACY_COVERAGE_DECISION_SOURCES_V1: UcfLegacyCoverageDecisionSourceV1[] = [
  {
    source_id: "ap_adapter_disposition_resolution_v1",
    decision_authority: "normalizeApDispositionV1 + mapApDispositionToUcfV1",
    consumers: [
      "ap_coverage_factory_adapter_v1",
      "universal_coverage_factory_v1",
      "ucf_parity_audit_v1",
    ],
    runtime_path: "src/lib/coverage-factory/adapters/ap-coverage-factory-adapter-v1.ts",
    replacement_status: "REPLACED_BY_UCF",
    blocker: null,
  },
  {
    source_id: "whw_adapter_disposition_resolution_v1",
    decision_authority: "resolveWhwDispositionV1 + mapWhwDispositionToUcfV1",
    consumers: [
      "whw_coverage_factory_adapter_v1",
      "universal_coverage_factory_v1",
      "ucf_parity_audit_v1",
    ],
    runtime_path: "src/lib/coverage-factory/adapters/whw-coverage-factory-adapter-v1.ts",
    replacement_status: "REPLACED_BY_UCF",
    blocker: null,
  },
  {
    source_id: "fridge_adapter_disposition_resolution_v1",
    decision_authority: "resolveFridgeDispositionV1 + mapFridgeDispositionToUcfV1",
    consumers: [
      "fridge_coverage_factory_adapter_v1",
      "universal_coverage_factory_v1",
      "ucf_parity_audit_v1",
    ],
    runtime_path: "src/lib/coverage-factory/adapters/fridge-coverage-factory-adapter-v1.ts",
    replacement_status: "REPLACED_BY_UCF",
    blocker: null,
  },
  {
    source_id: "adapter_reference_projection_work_items_v1",
    decision_authority: "adapter_lane_work_item_tables_v1",
    consumers: ["wedge_adapter_reference_projections_v1", "ucf_parity_audit_v1"],
    runtime_path: "src/lib/coverage-factory/adapters/*-coverage-factory-adapter-v1.ts",
    replacement_status: "REPLACED_BY_UCF",
    blocker: null,
  },
  {
    source_id: "universal_coverage_factory_decision_layer_v1",
    decision_authority: "universal_coverage_factory_decision_layer_v1",
    consumers: ["universal_coverage_factory_work_generator_v1", "ucf_decision_authority_snapshot_v1"],
    runtime_path: "src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.ts",
    replacement_status: "UCF_NATIVE",
    blocker: null,
  },
  {
    source_id: "universal_coverage_factory_work_generator_v1",
    decision_authority: "universal_coverage_factory_work_generator_v1",
    consumers: ["ucf_parity_audit_v1", "ucf_replacement_proof_v1"],
    runtime_path: "src/lib/coverage-factory/universal-coverage-factory-work-generator-v1.ts",
    replacement_status: "UCF_NATIVE",
    blocker: null,
  },
  {
    source_id: "large_batch_coverage_factory_state_classifier_v1",
    decision_authority: "inline_fridge_factory_state_classifier_v1",
    consumers: [
      "large_batch_coverage_factory_v1",
      "fridge_buyer_path_owner_review_bridge_v1",
      "buckparts_large_batch_coverage_factory_summary_v1",
    ],
    runtime_path: "src/lib/coverage/large-batch-coverage-factory-v1.ts",
    replacement_status: "BLOCKED",
    blocker: "GOAT C1: factory_state taxonomy has no UCF disposition equivalent",
  },
  {
    source_id: "ucf_parity_audit_adapter_shadow_v1",
    decision_authority: "adapter_resolve_disposition_v1",
    consumers: ["ucf_parity_audit_v1"],
    runtime_path: "src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    replacement_status: "SHADOW_RETAINED",
    blocker: "Shadow dual-authority lane required until GOAT C1 completes",
  },
  {
    source_id: "truth_spine_buyer_path_v1",
    decision_authority: "committed_csv_buyer_path_truth_v1",
    consumers: [
      "fridge_truth_spine_v1",
      "air_purifier_truth_spine_v1",
      "air_purifier_batch_coverage_director_v1",
    ],
    runtime_path: "scripts/lib/*-truth-spine-v1.ts",
    replacement_status: "NOT_APPLICABLE",
    blocker: "Buyer-path truth surface; not coverage disposition authority",
  },
];

function evidenceSnapshot(evidence: { claims: Record<string, { status: string }> }) {
  return Object.fromEntries(
    EVIDENCE_DIMS.map((dim) => [dim, evidence.claims[dim]?.status ?? "missing"]),
  );
}

function pushDelta(
  deltas: UcfReplacementSimulationDeltaV1[],
  delta: UcfReplacementSimulationDeltaV1,
): void {
  deltas.push(delta);
}

type AdapterReferenceProjectionV1 = {
  subjects: Array<{ subject_id: string; wedge: HomekeepWedgeCatalog }>;
  assessments: Array<{
    core_disposition: CoverageAssessmentDispositionV1;
    adapter_state: string | null;
    policy_apply_allowed: boolean;
  }>;
  evidence: Array<{ claims: Record<string, { status: string }> }>;
  work_items: Array<{ permitted_action_class: CoverageWorkItemActionClassV1 }>;
};

function compareRegisteredProjectionToUcf(args: {
  projection: AdapterReferenceProjectionV1;
  snapshot: UcfDecisionAuthoritySnapshotV1;
  deltas: UcfReplacementSimulationDeltaV1[];
}): number {
  const { projection, snapshot, deltas } = args;
  const { factory, decision_layer, work_generator } = snapshot;
  let compared = 0;

  for (let i = 0; i < projection.subjects.length; i++) {
    const subject = projection.subjects[i]!;
    const assessment = projection.assessments[i]!;
    const evidence = projection.evidence[i]!;
    const adapterWork = projection.work_items[i]!;
    const factoryRow = factory.subject_rows.find((row) => row.subject_id === subject.subject_id);
    const genWork = work_generator.work_items.find((w) => w.subject_ids[0] === subject.subject_id);
    compared += 1;

    if (!factoryRow) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "core_disposition",
        legacy_value: assessment.core_disposition,
        ucf_value: null,
        severity: "critical",
        evidence: "registered adapter subject missing from universal factory",
      });
      continue;
    }

    if (factoryRow.disposition !== assessment.core_disposition) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "core_disposition",
        legacy_value: assessment.core_disposition,
        ucf_value: factoryRow.disposition,
        severity: "critical",
        evidence: "factory subject_row disposition != adapter assessment",
      });
    }

    if (factoryRow.adapter_state !== (assessment.adapter_state ?? "")) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "adapter_state",
        legacy_value: assessment.adapter_state,
        ucf_value: factoryRow.adapter_state,
        severity: "critical",
        evidence: "factory adapter_state != adapter assessment adapter_state",
      });
    }

    if (factoryRow.policy_apply_allowed !== assessment.policy_apply_allowed) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "policy_apply_allowed",
        legacy_value: assessment.policy_apply_allowed,
        ucf_value: factoryRow.policy_apply_allowed,
        severity: "critical",
        evidence: "factory policy_apply_allowed != adapter assessment",
      });
    }

    const adapterEvidence = evidenceSnapshot(evidence);
    const factoryEvidence = factoryRow.evidence_summary;
    const evidenceKeys = Array.from(
      new Set([...Object.keys(adapterEvidence), ...Object.keys(factoryEvidence)]),
    );
    if (evidenceKeys.some((key) => adapterEvidence[key] !== factoryEvidence[key as keyof typeof factoryEvidence])) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "evidence_summary",
        legacy_value: adapterEvidence,
        ucf_value: factoryEvidence,
        severity: "high",
        evidence: "factory evidence_summary != adapter evidence claims",
      });
    }

    if (assessment.core_disposition === "suppressed" && genWork) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "suppression_work_item",
        legacy_value: "suppressed",
        ucf_value: genWork.permitted_action_class,
        severity: "critical",
        evidence: "work generator emitted item for suppressed subject",
      });
    }

    if (
      assessment.core_disposition !== "suppressed" &&
      adapterWork.permitted_action_class !== genWork?.permitted_action_class
    ) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "adapter_work_item_action_class",
        legacy_value: adapterWork.permitted_action_class,
        ucf_value: genWork?.permitted_action_class ?? null,
        severity: "medium",
        evidence: "adapter work item vs universal work generator",
      });
    }

    const inPlanningCohort = decision_layer.ready_for_change_planning_subjects.includes(
      subject.subject_id,
    );
    const expectsPlanning = factoryRow.disposition === "ready_for_change_planning";
    if (inPlanningCohort !== expectsPlanning) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "planning_cohort_membership",
        legacy_value: expectsPlanning,
        ucf_value: inPlanningCohort,
        severity: "critical",
        evidence: "decision_layer.ready_for_change_planning_subjects mismatch",
      });
    }

    const inSuppressedCohort = decision_layer.suppressed_subjects.includes(subject.subject_id);
    const expectsSuppressed = factoryRow.disposition === "suppressed";
    if (inSuppressedCohort !== expectsSuppressed) {
      pushDelta(deltas, {
        subject_id: subject.subject_id,
        wedge: subject.wedge,
        dimension: "suppressed_cohort_membership",
        legacy_value: expectsSuppressed,
        ucf_value: inSuppressedCohort,
        severity: "critical",
        evidence: "decision_layer.suppressed_subjects mismatch",
      });
    }
  }

  return compared;
}

export type RunUcfReplacementSimulationArgsV1 = BuildUcfDecisionAuthoritySnapshotArgsV1 & {
  snapshot?: UcfDecisionAuthoritySnapshotV1;
};

export function runUcfReplacementSimulationV1(
  args: RunUcfReplacementSimulationArgsV1,
): UcfReplacementSimulationResultV1 {
  const snapshot = args.snapshot ?? buildUcfDecisionAuthoritySnapshotV1(args);
  const deltas: UcfReplacementSimulationDeltaV1[] = [];

  const refAp = buildApCoverageFactoryReferenceProjectionV1({
    rootDir: args.rootDir,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[AP_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: args.now,
  });
  const refWhw = buildWhwCoverageFactoryReferenceProjectionV1({
    rootDir: args.rootDir,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[WHW_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: args.now,
  });
  const refFridge = buildFridgeCoverageFactoryReferenceProjectionV1({
    rootDir: args.rootDir,
    filterSlugs: [
      ...COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1],
    ],
    now: args.now,
  });

  const subjectsCompared =
    compareRegisteredProjectionToUcf({ projection: refAp, snapshot, deltas }) +
    compareRegisteredProjectionToUcf({ projection: refWhw, snapshot, deltas }) +
    compareRegisteredProjectionToUcf({ projection: refFridge, snapshot, deltas });

  const registeredSubjectCount = committedUcfRegisteredSubjectCountV1();
  const criticalDeltas = deltas.filter((delta) => delta.severity === "critical");

  return {
    registered_subject_count: registeredSubjectCount,
    subjects_compared: subjectsCompared,
    behavior_deltas: deltas,
    critical_delta_count: criticalDeltas.length,
    registered_critical_delta_count: criticalDeltas.length,
    simulation_passed: criticalDeltas.length === 0 && subjectsCompared === registeredSubjectCount,
    dimensions_verified: SIMULATION_DIMENSIONS_V1,
  };
}

function buildReplacementMatrix(
  simulation: UcfReplacementSimulationResultV1,
): UcfReplacementMatrixRowV1[] {
  const dispositionProven =
    simulation.simulation_passed &&
    !simulation.behavior_deltas.some((delta) => delta.dimension === "core_disposition");
  const workProven =
    simulation.simulation_passed &&
    !simulation.behavior_deltas.some(
      (delta) =>
        delta.dimension === "adapter_work_item_action_class" ||
        delta.dimension === "suppression_work_item",
    );
  const planningProven =
    simulation.simulation_passed &&
    !simulation.behavior_deltas.some(
      (delta) =>
        delta.dimension === "planning_cohort_membership" ||
        delta.dimension === "suppressed_cohort_membership",
    );
  const evidenceProven =
    simulation.simulation_passed &&
    !simulation.behavior_deltas.some((delta) => delta.dimension === "evidence_summary");

  return [
    {
      legacy_component: "ap_adapter_disposition_resolution_v1",
      current_authority: "normalizeApDispositionV1",
      ucf_equivalent: "universal_coverage_factory_v1.subject_rows[].disposition",
      behavior_identical: dispositionProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: dispositionProven,
      blocking_reason: dispositionProven ? null : "registered disposition simulation delta detected",
      decision_authority: "normalizeApDispositionV1 + mapApDispositionToUcfV1",
      consumers: ["ap_coverage_factory_adapter_v1", "universal_coverage_factory_v1"],
      runtime_path: "src/lib/coverage-factory/adapters/ap-coverage-factory-adapter-v1.ts",
      replacement_status: "REPLACED_BY_UCF",
    },
    {
      legacy_component: "whw_adapter_disposition_resolution_v1",
      current_authority: "resolveWhwDispositionV1",
      ucf_equivalent: "universal_coverage_factory_v1.subject_rows[].disposition",
      behavior_identical: dispositionProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: dispositionProven,
      blocking_reason: dispositionProven ? null : "registered disposition simulation delta detected",
      decision_authority: "resolveWhwDispositionV1 + mapWhwDispositionToUcfV1",
      consumers: ["whw_coverage_factory_adapter_v1", "universal_coverage_factory_v1"],
      runtime_path: "src/lib/coverage-factory/adapters/whw-coverage-factory-adapter-v1.ts",
      replacement_status: "REPLACED_BY_UCF",
    },
    {
      legacy_component: "fridge_adapter_disposition_resolution_v1",
      current_authority: "resolveFridgeDispositionV1",
      ucf_equivalent: "universal_coverage_factory_v1.subject_rows[].disposition",
      behavior_identical: dispositionProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: dispositionProven,
      blocking_reason: dispositionProven ? null : "registered disposition simulation delta detected",
      decision_authority: "resolveFridgeDispositionV1 + mapFridgeDispositionToUcfV1",
      consumers: ["fridge_coverage_factory_adapter_v1", "universal_coverage_factory_v1"],
      runtime_path: "src/lib/coverage-factory/adapters/fridge-coverage-factory-adapter-v1.ts",
      replacement_status: "REPLACED_BY_UCF",
    },
    {
      legacy_component: "adapter_reference_projection_work_items_v1",
      current_authority: "adapter_lane_work_item_tables_v1",
      ucf_equivalent: "universal_coverage_factory_work_generator_v1.work_items",
      behavior_identical: workProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: workProven,
      blocking_reason: workProven ? null : "work generation simulation delta detected",
      decision_authority: "adapter_lane_work_item_tables_v1",
      consumers: ["wedge_adapter_reference_projections_v1"],
      runtime_path: "src/lib/coverage-factory/adapters/*-coverage-factory-adapter-v1.ts",
      replacement_status: "REPLACED_BY_UCF",
    },
    {
      legacy_component: "adapter_reference_projection_evidence_summary_v1",
      current_authority: "adapter_evidence_projection_v1",
      ucf_equivalent: "universal_coverage_factory_v1.subject_rows[].evidence_summary",
      behavior_identical: evidenceProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: evidenceProven,
      blocking_reason: evidenceProven ? null : "evidence_summary simulation delta detected",
      decision_authority: "adapter_evidence_projection_v1",
      consumers: ["universal_coverage_factory_v1"],
      runtime_path: "src/lib/coverage-factory/adapters/*-coverage-factory-adapter-v1.ts",
      replacement_status: "REPLACED_BY_UCF",
    },
    {
      legacy_component: "universal_coverage_factory_decision_layer_v1",
      current_authority: "universal_coverage_factory_decision_layer_v1",
      ucf_equivalent: "universal_coverage_factory_decision_layer_v1",
      behavior_identical: planningProven ? "PROVEN" : "UNKNOWN",
      can_replace_today: true,
      blocking_reason: null,
      decision_authority: "universal_coverage_factory_decision_layer_v1",
      consumers: ["universal_coverage_factory_work_generator_v1"],
      runtime_path: "src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.ts",
      replacement_status: "UCF_NATIVE",
    },
    {
      legacy_component: "large_batch_coverage_factory_state_classifier_v1",
      current_authority: "inline_fridge_factory_state_classifier_v1",
      ucf_equivalent: "none (orthogonal factory_state taxonomy)",
      behavior_identical: "UNKNOWN",
      can_replace_today: false,
      blocking_reason: "GOAT C1: factory_state taxonomy differs from UCF disposition",
      decision_authority: "inline_fridge_factory_state_classifier_v1",
      consumers: ["large_batch_coverage_factory_v1", "fridge_buyer_path_owner_review_bridge_v1"],
      runtime_path: "src/lib/coverage/large-batch-coverage-factory-v1.ts",
      replacement_status: "BLOCKED",
    },
  ];
}

export function buildUcfReplacementProofReportV1(
  args: RunUcfReplacementSimulationArgsV1,
): UcfReplacementProofReportV1 {
  const now = args.now ?? (() => new Date());
  const snapshot = args.snapshot ?? buildUcfDecisionAuthoritySnapshotV1(args);
  const simulation = runUcfReplacementSimulationV1({ ...args, snapshot });
  const replacement_matrix = buildReplacementMatrix(simulation);

  const parityFindings = simulation.behavior_deltas.map((delta) => ({
    wedge: delta.wedge,
    subject_id: delta.subject_id,
    source_truth: { legacy: delta.legacy_value },
    ucf_truth: { ucf: delta.ucf_value },
    mismatch_type:
      delta.dimension === "evidence_summary" ? "ADAPTER_BUG" : "UCF_CONTRACT_INTERPRETATION",
    severity: delta.severity,
    evidence: `${delta.dimension}: ${delta.evidence}`,
  }));

  const canonicalReadiness = assessUcfCanonicalReadinessV1({
    findings: parityFindings,
    registered_subject_ids: snapshot.registered_subject_ids,
    scale_gap: snapshot.loadable_scale_gap,
    work_recommendation_diff_subject_count: simulation.behavior_deltas.filter(
      (delta) => delta.dimension === "adapter_work_item_action_class",
    ).length,
  });

  const replacement_ready_components = replacement_matrix
    .filter((row) => row.can_replace_today)
    .map((row) => row.legacy_component);

  const remaining_blockers = replacement_matrix
    .filter((row) => !row.can_replace_today)
    .map((row) => `${row.legacy_component}: ${row.blocking_reason ?? "UNKNOWN"}`);

  const delete_candidates = [
    "runtime_direct_adapter_disposition_reads",
    "consumer_facing_adapter_work_item_authority",
  ];

  const delete_blockers = [
    "universal_coverage_factory_v1 still invokes wedge adapter reference projections internally",
    "ucf_parity_audit_v1 requires adapter shadow path for loadable inventory",
    "GOAT C1 large_batch_coverage_factory_v1 factory_state taxonomy not merged",
  ];

  const can_delete_legacy_today = false;

  const validation_commands = [
    "npm run build",
    "node --import tsx --test src/lib/coverage-factory/ucf-replacement-proof-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/**/*.test.ts",
  ];

  const safe_to_commit_verdict =
    simulation.simulation_passed &&
    canonicalReadiness.registered_canonical_blocker_count === 0 &&
    snapshot.loadable_scale_gap === 0
      ? "SAFE_TO_COMMIT"
      : "NOT_SAFE_TO_COMMIT";

  return {
    contract: UCF_REPLACEMENT_PROOF_CONTRACT_V1,
    report_name: UCF_REPLACEMENT_PROOF_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    legacy_source_inventory: UCF_LEGACY_COVERAGE_DECISION_SOURCES_V1,
    replacement_matrix,
    simulation,
    replacement_ready_components,
    remaining_blockers,
    goat_c1_dependencies: [...UCF_GOAT_C1_CONSUMERS_V1],
    can_delete_legacy_today,
    delete_candidates,
    delete_blockers,
    can_replace_existing_decision_logic_today:
      canonicalReadiness.can_replace_existing_decision_logic_today,
    canonical_readiness_verdict: canonicalReadiness.verdict,
    safe_to_commit_verdict,
    proven_facts: [
      `PROVEN: ucf_replacement_proof_v1 compared ${String(simulation.subjects_compared)} registered subject(s) across ${String(simulation.dimensions_verified.length)} dimension(s).`,
      `PROVEN: simulation_passed=${String(simulation.simulation_passed)} critical_delta_count=${String(simulation.critical_delta_count)}.`,
      `PROVEN: replacement_ready_components=${replacement_ready_components.length} can_delete_legacy_today=${String(can_delete_legacy_today)}.`,
      `PROVEN: factory provenance_index_hash=${snapshot.factory.run_manifest.provenance_index_hash}.`,
    ],
    validation_commands,
  };
}

export function assertUcfReplacementSimulationPassedV1(
  simulation: UcfReplacementSimulationResultV1,
): void {
  if (!simulation.simulation_passed) {
    const critical = simulation.behavior_deltas.filter((delta) => delta.severity === "critical");
    throw new Error(
      `UCF replacement simulation failed (fail closed): ${JSON.stringify(critical.slice(0, 5))}`,
    );
  }
}
