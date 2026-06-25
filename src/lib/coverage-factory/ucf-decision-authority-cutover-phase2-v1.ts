/**
 * UCF Decision Authority Cutover Phase 2 v1 — refined audit and phase-2 migration report.
 * Read-only; no registry, adapter, disposition, or evidence derivation changes.
 */

import { assessUcfCanonicalReadinessV1 } from "./ucf-canonical-readiness-policy-v1";
import {
  buildUcfDecisionAuthorityCutoverReportV1,
  buildUcfDecisionAuthoritySnapshotV1,
  UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1,
  UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1,
  type BuildUcfDecisionAuthoritySnapshotArgsV1,
  type UcfDecisionAuthorityConsumerInventoryEntryV1,
} from "./ucf-decision-authority-cutover-v1";

export const UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1 =
  "ucf_decision_authority_cutover_phase2_v1" as const;

export const UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_REPORT_NAME_V1 =
  "ucf_decision_authority_cutover_phase2_v1" as const;

export type UcfDecisionAuthorityPhase2AuditClassificationV1 =
  | "READY_FOR_UCF_NOW"
  | "SHADOW_REQUIRED"
  | "REQUIRES_BEHAVIOR_CHANGE"
  | "NOT_A_UCF_CONSUMER";

export type UcfDecisionAuthorityPhase2AuditEntryV1 = {
  consumer_id: string;
  location: string;
  phase1_classification: string;
  phase2_classification: UcfDecisionAuthorityPhase2AuditClassificationV1;
  legacy_authority: string;
  new_authority: string | null;
  migration_status: "MIGRATED_THIS_PHASE" | "MIGRATED_PRIOR_PHASE" | "UNCHANGED" | "BLOCKED";
  cutover_notes: string;
  validation_commands: readonly string[];
};

export type UcfDecisionAuthorityCutoverPhase2ReportV1 = {
  contract: typeof UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1;
  report_name: typeof UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  phase2_audit: UcfDecisionAuthorityPhase2AuditEntryV1[];
  migrated_this_phase: string[];
  migrated_prior_phases: string[];
  remaining_blockers: string[];
  goat_c1_consumers: string[];
  runtime_migration_percentage: number;
  cumulative_cutover_percentage: number;
  registered_subject_count: number;
  can_replace_existing_decision_logic_today: boolean;
  canonical_readiness_verdict: string;
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "NOT_SAFE_TO_COMMIT";
  proven_facts: string[];
  validation_commands: string[];
};

export const UCF_GOAT_C1_CONSUMERS_V1 = [
  "large_batch_coverage_factory_v1",
  "buckparts_large_batch_coverage_factory_summary_v1",
] as const;

export const UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1: UcfDecisionAuthorityPhase2AuditEntryV1[] =
  [
    {
      consumer_id: "ucf_parity_audit_v1",
      location: "src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
      phase1_classification: "SHADOW_ONLY",
      phase2_classification: "SHADOW_REQUIRED",
      legacy_authority: "adapter_resolve_disposition_v1",
      new_authority: "universal_coverage_factory_v1 (ucf side via snapshot); adapter shadow retained",
      migration_status: "MIGRATED_THIS_PHASE",
      cutover_notes:
        "Phase2: UCF authority path consolidated to buildUcfDecisionAuthoritySnapshotV1; adapter resolve*Disposition remains shadow source_truth.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
      ],
    },
    {
      consumer_id: "universal_coverage_factory_pressure_test_v1",
      location: "src/lib/coverage-factory/universal-coverage-factory-pressure-test-v1.test.ts",
      phase1_classification: "SHADOW_ONLY",
      phase2_classification: "SHADOW_REQUIRED",
      legacy_authority: "adapter_reference_projections_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Six-wedge adapter contract pressure test must remain shadow validation.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-pressure-test-v1.test.ts",
      ],
    },
    {
      consumer_id: "large_batch_coverage_factory_v1",
      location: "src/lib/coverage/large-batch-coverage-factory-v1.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "REQUIRES_BEHAVIOR_CHANGE",
      legacy_authority: "inline_fridge_factory_state_classifier_v1",
      new_authority: null,
      migration_status: "BLOCKED",
      cutover_notes: "GOAT C1: factory_state taxonomy merge requires founder approval and parity proof.",
      validation_commands: [
        "node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts",
      ],
    },
    {
      consumer_id: "fridge_buyer_path_owner_review_bridge_v1",
      location: "scripts/lib/fridge-buyer-path-owner-review-bridge-v1.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "READY_FOR_UCF_NOW",
      legacy_authority: "large_batch_coverage_factory_v1.publishable_amazon_candidate",
      new_authority:
        "universal_coverage_factory_v1 (coverage disposition provenance); LBCF retained for cohort selection",
      migration_status: "MIGRATED_THIS_PHASE",
      cutover_notes:
        "Cohort selection unchanged; registered slugs derive coverage disposition provenance from UCF.",
      validation_commands: [
        "node --import tsx --test scripts/lib/fridge-buyer-path-owner-review-bridge-v1.test.ts",
      ],
    },
    {
      consumer_id: "fridge_truth_spine_v1",
      location: "scripts/lib/fridge-truth-spine-v1.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "committed_csv_buyer_path_truth_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Buyer-path committed truth lane; does not read coverage disposition.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "air_purifier_truth_spine_v1",
      location: "scripts/lib/air-purifier-truth-spine-v1.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "committed_csv_buyer_path_truth_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Buyer-path committed truth lane; does not read coverage disposition.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "air_purifier_batch_coverage_director_v1",
      location: "scripts/lib/air-purifier-batch-coverage-director-v1.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "air_purifier_truth_spine_v1 + ap_batch_production_lane_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Batch production lane taxonomy; not UCF coverage disposition.",
      validation_commands: [
        "node --import tsx --test scripts/lib/air-purifier-batch-coverage-director-v1.test.ts",
      ],
    },
    {
      consumer_id: "wedge_truth_spine_coverage_matrix_v1",
      location: "scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts",
      phase1_classification: "SHADOW_ONLY",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "formal_spine_capability_probes_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Formal spine capability matrix; observational only.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "buckparts_brain_coverage_manifest_v1",
      location: "scripts/lib/buckparts-brain-coverage-manifest-v1.ts",
      phase1_classification: "SHADOW_ONLY",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "curated_system_inventory_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "System inventory metadata; UCF visibility entry only.",
      validation_commands: [
        "node --import tsx --test scripts/lib/buckparts-brain-coverage-manifest-v1.test.ts",
      ],
    },
    {
      consumer_id: "buckparts_daily_operator_decision_authority_policy_v1",
      location: "scripts/report-buckparts-daily-operator.ts",
      phase1_classification: "BLOCKED",
      phase2_classification: "NOT_A_UCF_CONSUMER",
      legacy_authority: "signal_exclusion_policy_v1",
      new_authority: null,
      migration_status: "UNCHANGED",
      cutover_notes: "Daily operator signal steering policy; unrelated to coverage disposition.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-daily-operator.test.ts",
      ],
    },
  ];

function phase2RemainingBlockers(
  audit: readonly UcfDecisionAuthorityPhase2AuditEntryV1[],
): string[] {
  return audit
    .filter(
      (entry) =>
        entry.phase2_classification === "REQUIRES_BEHAVIOR_CHANGE" ||
        entry.migration_status === "BLOCKED",
    )
    .map((entry) => `${entry.consumer_id}: ${entry.cutover_notes}`);
}

function runtimeDispositionProvenanceLanes(
  inventory: readonly UcfDecisionAuthorityConsumerInventoryEntryV1[],
): UcfDecisionAuthorityConsumerInventoryEntryV1[] {
  return inventory.filter(
    (entry) =>
      entry.consumer_id === "buckparts_large_batch_coverage_factory_summary_v1" ||
      entry.consumer_id === "fridge_buyer_path_owner_review_bridge_v1",
  );
}

export function buildUcfDecisionAuthorityCutoverPhase2ReportV1(
  args: BuildUcfDecisionAuthoritySnapshotArgsV1,
): UcfDecisionAuthorityCutoverPhase2ReportV1 {
  const now = args.now ?? (() => new Date());
  const snapshot = buildUcfDecisionAuthoritySnapshotV1(args);
  const cumulativeReport = buildUcfDecisionAuthorityCutoverReportV1(args);
  const audit = UCF_DECISION_AUTHORITY_PHASE2_CONSUMER_AUDIT_V1;

  const migrated_this_phase = audit
    .filter((entry) => entry.migration_status === "MIGRATED_THIS_PHASE")
    .map((entry) => entry.consumer_id);

  const migrated_prior_phases = [
    "buckparts_large_batch_coverage_factory_summary_v1",
    "ucf_registry_governance_v1",
  ];

  const dispositionLanes = runtimeDispositionProvenanceLanes(
    UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1,
  );
  const migratedLanes = dispositionLanes.filter((entry) => entry.migration_status === "MIGRATED");
  const runtime_migration_percentage =
    dispositionLanes.length === 0
      ? 0
      : Math.round((migratedLanes.length / dispositionLanes.length) * 1000) / 10;

  const canonicalReadiness = assessUcfCanonicalReadinessV1({
    findings: [],
    registered_subject_ids: snapshot.registered_subject_ids,
    scale_gap: snapshot.loadable_scale_gap,
    work_recommendation_diff_subject_count: 0,
  });

  const validation_commands = [
    "npm run build",
    "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
    "node --import tsx --test scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.test.ts",
    "node --import tsx --test scripts/lib/fridge-buyer-path-owner-review-bridge-v1.test.ts",
  ];

  const safe_to_commit_verdict =
    snapshot.loadable_scale_gap === 0 &&
    canonicalReadiness.registered_canonical_blocker_count === 0 &&
    snapshot.factory.subject_rows.length === snapshot.registered_subject_count
      ? "SAFE_TO_COMMIT"
      : "NOT_SAFE_TO_COMMIT";

  return {
    contract: UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1,
    report_name: UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    phase2_audit: audit,
    migrated_this_phase,
    migrated_prior_phases,
    remaining_blockers: phase2RemainingBlockers(audit),
    goat_c1_consumers: [...UCF_GOAT_C1_CONSUMERS_V1],
    runtime_migration_percentage,
    cumulative_cutover_percentage: cumulativeReport.cutover_percentage,
    registered_subject_count: snapshot.registered_subject_count,
    can_replace_existing_decision_logic_today:
      canonicalReadiness.can_replace_existing_decision_logic_today,
    canonical_readiness_verdict: canonicalReadiness.verdict,
    safe_to_commit_verdict,
    proven_facts: [
      `PROVEN: ${UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1} audited ${String(audit.length)} remaining phase1 BLOCKED/SHADOW consumers.`,
      `PROVEN: migrated_this_phase=${migrated_this_phase.join(",") || "none"}.`,
      `PROVEN: runtime_migration_percentage=${String(runtime_migration_percentage)}% (${String(migratedLanes.length)}/${String(dispositionLanes.length)} disposition-provenance lanes).`,
      `PROVEN: GOAT C1 consumers remain: ${UCF_GOAT_C1_CONSUMERS_V1.join(", ")}.`,
      `PROVEN: cumulative ${UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1} cutover_percentage=${String(cumulativeReport.cutover_percentage)}%.`,
    ],
    validation_commands,
  };
}
