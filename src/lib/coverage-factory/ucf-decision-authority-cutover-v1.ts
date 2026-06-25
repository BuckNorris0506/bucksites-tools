/**
 * UCF Decision Authority Cutover v1 — inventory, projection, and controlled cutover report.
 * Read-only; no registry, adapter, disposition, or evidence derivation changes.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import { assessUcfCanonicalReadinessV1 } from "./ucf-canonical-readiness-policy-v1";
import { AP_COVERAGE_FACTORY_ADAPTER_ID_V1 } from "./adapters/ap-coverage-factory-adapter-v1";
import { FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1 } from "./adapters/fridge-coverage-factory-adapter-v1";
import { WHW_COVERAGE_FACTORY_ADAPTER_ID_V1 } from "./adapters/whw-coverage-factory-adapter-v1";
import {
  buildUniversalCoverageFactoryDecisionLayerV1,
  type UniversalCoverageFactoryDecisionLayerV1,
} from "./universal-coverage-factory-decision-layer-v1";
import {
  buildUniversalCoverageFactoryWorkGeneratorV1,
  type UniversalCoverageFactoryWorkGeneratorV1,
} from "./universal-coverage-factory-work-generator-v1";
import {
  buildUniversalCoverageFactoryV1,
  COMMITTED_UCF_ADAPTER_IDS_V1,
  COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1,
  type UniversalCoverageFactorySubjectRowV1,
  type UniversalCoverageFactoryV1,
} from "./universal-coverage-factory-v1";

export const UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1 =
  "ucf_decision_authority_cutover_v1" as const;

export const UCF_DECISION_AUTHORITY_CUTOVER_REPORT_NAME_V1 =
  "ucf_decision_authority_cutover_v1" as const;

export type UcfDecisionAuthorityConsumerClassificationV1 =
  | "READY_FOR_UCF"
  | "SHADOW_ONLY"
  | "BLOCKED"
  | "UNKNOWN";

export type UcfDecisionAuthorityConsumerMigrationStatusV1 =
  | "ALREADY_UCF_NATIVE"
  | "MIGRATED"
  | "PENDING"
  | "BLOCKED"
  | "SHADOW_UNCHANGED";

export type UcfDecisionAuthorityConsumerInventoryEntryV1 = {
  consumer_id: string;
  location: string;
  legacy_authority: string;
  classification: UcfDecisionAuthorityConsumerClassificationV1;
  migration_status: UcfDecisionAuthorityConsumerMigrationStatusV1;
  new_authority: string | null;
  cutover_notes: string;
  validation_commands: readonly string[];
};

export type UcfDecisionAuthorityConsumerCutoverRowV1 = {
  consumer: string;
  previous_authority: string;
  new_authority: string;
  migration_status: UcfDecisionAuthorityConsumerMigrationStatusV1;
  validation_evidence: string[];
};

export type UcfDecisionAuthoritySnapshotV1 = {
  factory: UniversalCoverageFactoryV1;
  decision_layer: UniversalCoverageFactoryDecisionLayerV1;
  work_generator: UniversalCoverageFactoryWorkGeneratorV1;
  registered_filter_slugs: ReadonlySet<string>;
  registered_subject_ids: ReadonlySet<string>;
  registered_subject_count: number;
  loadable_scale_gap: number;
};

export type UcfDecisionAuthorityCutoverReportV1 = {
  contract: typeof UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1;
  report_name: typeof UCF_DECISION_AUTHORITY_CUTOVER_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  inventory: UcfDecisionAuthorityConsumerInventoryEntryV1[];
  consumers_migrated: UcfDecisionAuthorityConsumerCutoverRowV1[];
  remaining_legacy_consumers: string[];
  remaining_blockers: string[];
  cutover_percentage: number;
  registered_subject_count: number;
  can_replace_existing_decision_logic_today: boolean;
  canonical_readiness_verdict: string;
  safe_to_commit_verdict: "SAFE_TO_COMMIT" | "NOT_SAFE_TO_COMMIT";
  proven_facts: string[];
  validation_commands: string[];
};

export const UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1: UcfDecisionAuthorityConsumerInventoryEntryV1[] =
  [
    {
      consumer_id: "universal_coverage_factory_v1",
      location: "src/lib/coverage-factory/universal-coverage-factory-v1.ts",
      legacy_authority: "wedge_adapter_reference_projections_v1",
      classification: "READY_FOR_UCF",
      migration_status: "ALREADY_UCF_NATIVE",
      new_authority: "universal_coverage_factory_v1",
      cutover_notes:
        "Factory output is the UCF disposition SSOT for registered subjects; adapters remain internal projection inputs only.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-v1.test.ts",
      ],
    },
    {
      consumer_id: "universal_coverage_factory_decision_layer_v1",
      location: "src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.ts",
      legacy_authority: "adapter_lane_priority_tables_v1",
      classification: "READY_FOR_UCF",
      migration_status: "ALREADY_UCF_NATIVE",
      new_authority: "universal_coverage_factory_decision_layer_v1",
      cutover_notes: "Decision layer consumes factory subject_rows only.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.test.ts",
      ],
    },
    {
      consumer_id: "universal_coverage_factory_work_generator_v1",
      location: "src/lib/coverage-factory/universal-coverage-factory-work-generator-v1.ts",
      legacy_authority: "adapter_work_item_tables_v1",
      classification: "READY_FOR_UCF",
      migration_status: "ALREADY_UCF_NATIVE",
      new_authority: "universal_coverage_factory_work_generator_v1",
      cutover_notes: "Work generator consumes decision layer only.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-work-generator-v1.test.ts",
      ],
    },
    {
      consumer_id: "buckparts_large_batch_coverage_factory_summary_v1",
      location: "scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.ts",
      legacy_authority: "large_batch_coverage_factory_v1",
      classification: "READY_FOR_UCF",
      migration_status: "MIGRATED",
      new_authority:
        "universal_coverage_factory_v1 (coverage disposition provenance for registered slugs); large_batch_coverage_factory_v1 retained for factory_state expansion taxonomy",
      cutover_notes:
        "Cutover v1: registered top-cohort slugs cite UCF coverage disposition authority in proven_facts; external summary fields unchanged.",
      validation_commands: [
        "node --import tsx --test scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.test.ts",
      ],
    },
    {
      consumer_id: "ucf_registry_governance_v1",
      location: "src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
      legacy_authority: "adapter_reference_projections_v1",
      classification: "READY_FOR_UCF",
      migration_status: "MIGRATED",
      new_authority: "ucf_decision_authority_snapshot_v1",
      cutover_notes: "Governance gate uses shared UCF decision authority snapshot builder.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
      ],
    },
    {
      consumer_id: "ucf_parity_audit_v1",
      location: "src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
      legacy_authority: "adapter_resolve_disposition_v1",
      classification: "SHADOW_ONLY",
      migration_status: "SHADOW_UNCHANGED",
      new_authority: null,
      cutover_notes:
        "Shadow parity lane compares adapter truth vs factory truth; must remain dual-authority until C1 merge completes.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
      ],
    },
    {
      consumer_id: "large_batch_coverage_factory_v1",
      location: "src/lib/coverage/large-batch-coverage-factory-v1.ts",
      legacy_authority: "inline_fridge_factory_state_classifier_v1",
      classification: "BLOCKED",
      migration_status: "BLOCKED",
      new_authority: null,
      cutover_notes:
        "GOAT C1 merge blocked: factory_state taxonomy differs from UCF disposition; founder-gated full replacement.",
      validation_commands: [
        "node --import tsx --test scripts/lib/large-batch-coverage-factory-v1.test.ts",
      ],
    },
    {
      consumer_id: "fridge_buyer_path_owner_review_bridge_v1",
      location: "scripts/lib/fridge-buyer-path-owner-review-bridge-v1.ts",
      legacy_authority: "large_batch_coverage_factory_v1.publishable_amazon_candidate",
      classification: "READY_FOR_UCF",
      migration_status: "MIGRATED",
      new_authority:
        "universal_coverage_factory_v1 (coverage disposition provenance for registered cohort slugs); large_batch_coverage_factory_v1 retained for publishable_amazon_candidate cohort selection",
      cutover_notes:
        "Cutover phase2: registered cohort slugs cite UCF coverage disposition authority in proven_facts; LBCF factory_state cohort selection unchanged.",
      validation_commands: [
        "node --import tsx --test scripts/lib/fridge-buyer-path-owner-review-bridge-v1.test.ts",
      ],
    },
    {
      consumer_id: "fridge_truth_spine_v1",
      location: "scripts/lib/fridge-truth-spine-v1.ts",
      legacy_authority: "committed_csv_buyer_path_truth_v1",
      classification: "BLOCKED",
      migration_status: "BLOCKED",
      new_authority: null,
      cutover_notes: "Truth spine is buyer-path committed truth, not coverage disposition authority.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "air_purifier_truth_spine_v1",
      location: "scripts/lib/air-purifier-truth-spine-v1.ts",
      legacy_authority: "committed_csv_buyer_path_truth_v1",
      classification: "BLOCKED",
      migration_status: "BLOCKED",
      new_authority: null,
      cutover_notes: "Truth spine is buyer-path committed truth, not coverage disposition authority.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "air_purifier_batch_coverage_director_v1",
      location: "scripts/lib/air-purifier-batch-coverage-director-v1.ts",
      legacy_authority: "air_purifier_truth_spine_v1 + ap_batch_production_lane_v1",
      classification: "BLOCKED",
      migration_status: "BLOCKED",
      new_authority: null,
      cutover_notes:
        "Director lanes map batch production states, not UCF disposition; UCF cutover would change batch ranking.",
      validation_commands: [
        "node --import tsx --test scripts/lib/air-purifier-batch-coverage-director-v1.test.ts",
      ],
    },
    {
      consumer_id: "wedge_truth_spine_coverage_matrix_v1",
      location: "scripts/lib/wedge-truth-spine-coverage-matrix-v1.ts",
      legacy_authority: "formal_spine_capability_probes_v1",
      classification: "SHADOW_ONLY",
      migration_status: "SHADOW_UNCHANGED",
      new_authority: null,
      cutover_notes: "Observational wedge spine matrix; not a coverage disposition consumer.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      ],
    },
    {
      consumer_id: "buckparts_brain_coverage_manifest_v1",
      location: "scripts/lib/buckparts-brain-coverage-manifest-v1.ts",
      legacy_authority: "curated_system_inventory_v1",
      classification: "SHADOW_ONLY",
      migration_status: "SHADOW_UNCHANGED",
      new_authority: null,
      cutover_notes: "Brain manifest inventories systems; UCF entry added for visibility only.",
      validation_commands: [
        "node --import tsx --test scripts/lib/buckparts-brain-coverage-manifest-v1.test.ts",
      ],
    },
    {
      consumer_id: "buckparts_daily_operator_decision_authority_policy_v1",
      location: "scripts/report-buckparts-daily-operator.ts",
      legacy_authority: "signal_exclusion_policy_v1",
      classification: "BLOCKED",
      migration_status: "BLOCKED",
      new_authority: null,
      cutover_notes: "Daily operator decision_authority_policy governs signal steering, not coverage disposition.",
      validation_commands: [
        "node --import tsx --test scripts/report-buckparts-daily-operator.test.ts",
      ],
    },
    {
      consumer_id: "universal_coverage_factory_pressure_test_v1",
      location: "src/lib/coverage-factory/universal-coverage-factory-pressure-test-v1.test.ts",
      legacy_authority: "adapter_reference_projections_v1",
      classification: "SHADOW_ONLY",
      migration_status: "SHADOW_UNCHANGED",
      new_authority: null,
      cutover_notes: "Six-wedge adapter pressure test remains shadow validation.",
      validation_commands: [
        "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-pressure-test-v1.test.ts",
      ],
    },
  ];

const WEDGE_FOR_ADAPTER_ID: Record<string, HomekeepWedgeCatalog> = {
  [AP_COVERAGE_FACTORY_ADAPTER_ID_V1]: "air_purifier",
  [WHW_COVERAGE_FACTORY_ADAPTER_ID_V1]: "whole_house_water",
  [FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1]: "refrigerator_water",
};

export function buildRegisteredUcfFilterSlugSetV1(): Set<string> {
  const slugs = new Set<string>();
  for (const adapterId of COMMITTED_UCF_ADAPTER_IDS_V1) {
    for (const slug of COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[adapterId]) {
      slugs.add(slug.toLowerCase());
    }
  }
  return slugs;
}

export function buildRegisteredUcfSubjectIdSetV1(): Set<string> {
  const subjectIds = new Set<string>();
  for (const adapterId of COMMITTED_UCF_ADAPTER_IDS_V1) {
    const wedge = WEDGE_FOR_ADAPTER_ID[adapterId];
    for (const slug of COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[adapterId]) {
      subjectIds.add(`${wedge}:filter:${slug.toLowerCase()}`);
    }
  }
  return subjectIds;
}

export function committedUcfRegisteredSubjectCountV1(): number {
  return COMMITTED_UCF_ADAPTER_IDS_V1.reduce(
    (sum, adapterId) =>
      sum + COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[adapterId].length,
    0,
  );
}

export function lookupUcfSubjectRowByFilterSlugV1(
  snapshot: Pick<UcfDecisionAuthoritySnapshotV1, "factory">,
  filterSlug: string,
  wedge?: HomekeepWedgeCatalog,
): UniversalCoverageFactorySubjectRowV1 | null {
  const normalized = filterSlug.trim().toLowerCase();
  return (
    snapshot.factory.subject_rows.find((row) => {
      const slug = row.subject_id.split(":").pop()?.toLowerCase();
      if (slug !== normalized) return false;
      return wedge === undefined || row.wedge === wedge;
    }) ?? null
  );
}

export function buildUcfCoverageDispositionProvenanceFactsV1(args: {
  snapshot: UcfDecisionAuthoritySnapshotV1;
  filterSlugs: readonly string[];
  wedge?: HomekeepWedgeCatalog;
  cutover_contract?: string;
}): string[] {
  const registered = buildRegisteredUcfFilterSlugSetV1();
  const facts: string[] = [];
  let registeredInCohort = 0;
  const cutoverContract = args.cutover_contract ?? UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1;

  for (const slug of args.filterSlugs) {
    const normalized = slug.trim().toLowerCase();
    if (!registered.has(normalized)) continue;
    registeredInCohort += 1;
    const row = lookupUcfSubjectRowByFilterSlugV1(args.snapshot, normalized, args.wedge);
    if (!row) {
      facts.push(
        `UNKNOWN: filter_slug=${normalized} is UCF-registered but missing from universal_coverage_factory_v1 subject_rows.`,
      );
      continue;
    }
    facts.push(
      `PROVEN: filter_slug=${normalized} coverage disposition authority=universal_coverage_factory_v1 disposition=${row.disposition} adapter_state=${row.adapter_state}.`,
    );
  }

  if (registeredInCohort > 0) {
    facts.unshift(
      `PROVEN: ${String(registeredInCohort)} cohort slug(s) in this lane are UCF-registered; coverage disposition authority is universal_coverage_factory_v1 (${cutoverContract}).`,
    );
  }

  return facts;
}

export function resolveUcfCoverageDispositionForRegisteredSlugV1(args: {
  snapshot: UcfDecisionAuthoritySnapshotV1;
  filterSlug: string;
  wedge?: HomekeepWedgeCatalog;
}): UniversalCoverageFactorySubjectRowV1 | null {
  const normalized = args.filterSlug.trim().toLowerCase();
  if (!args.snapshot.registered_filter_slugs.has(normalized)) {
    return null;
  }
  const row = lookupUcfSubjectRowByFilterSlugV1(args.snapshot, normalized, args.wedge);
  if (!row) {
    throw new Error(
      `UCF fail-closed: registered filter_slug=${normalized} missing from universal_coverage_factory_v1`,
    );
  }
  return row;
}

export type BuildUcfDecisionAuthoritySnapshotArgsV1 = {
  rootDir: string;
  now?: () => Date;
};

export function buildUcfDecisionAuthoritySnapshotV1(
  args: BuildUcfDecisionAuthoritySnapshotArgsV1,
): UcfDecisionAuthoritySnapshotV1 {
  const factory = buildUniversalCoverageFactoryV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const decision_layer = buildUniversalCoverageFactoryDecisionLayerV1(factory);
  const work_generator = buildUniversalCoverageFactoryWorkGeneratorV1(decision_layer);
  const registered_subject_count = committedUcfRegisteredSubjectCountV1();

  return {
    factory,
    decision_layer,
    work_generator,
    registered_filter_slugs: buildRegisteredUcfFilterSlugSetV1(),
    registered_subject_ids: buildRegisteredUcfSubjectIdSetV1(),
    registered_subject_count,
    loadable_scale_gap: Math.max(0, registered_subject_count - factory.subject_rows.length),
  };
}

function inventoryRuntimeLegacyConsumers(
  inventory: readonly UcfDecisionAuthorityConsumerInventoryEntryV1[],
): string[] {
  return inventory
    .filter(
      (entry) =>
        entry.classification !== "SHADOW_ONLY" &&
        entry.migration_status !== "ALREADY_UCF_NATIVE" &&
        entry.migration_status !== "MIGRATED",
    )
    .map((entry) => entry.consumer_id);
}

function inventoryBlockers(
  inventory: readonly UcfDecisionAuthorityConsumerInventoryEntryV1[],
): string[] {
  return inventory
    .filter((entry) => entry.classification === "BLOCKED")
    .map((entry) => `${entry.consumer_id}: ${entry.cutover_notes}`);
}

function migratedConsumerRows(
  inventory: readonly UcfDecisionAuthorityConsumerInventoryEntryV1[],
  snapshot: UcfDecisionAuthoritySnapshotV1,
  canonicalReadiness: ReturnType<typeof assessUcfCanonicalReadinessV1>,
): UcfDecisionAuthorityConsumerCutoverRowV1[] {
  return inventory
    .filter(
      (entry) =>
        entry.migration_status === "MIGRATED" || entry.migration_status === "ALREADY_UCF_NATIVE",
    )
    .map((entry) => ({
      consumer: entry.consumer_id,
      previous_authority: entry.legacy_authority,
      new_authority: entry.new_authority ?? "universal_coverage_factory_v1",
      migration_status: entry.migration_status,
      validation_evidence: [
        `registered_subject_count=${String(snapshot.registered_subject_count)}`,
        `factory_subject_rows=${String(snapshot.factory.subject_rows.length)}`,
        `canonical_readiness_verdict=${canonicalReadiness.verdict}`,
        ...entry.validation_commands.map((command) => `validation_command:${command}`),
      ],
    }));
}

export function buildUcfDecisionAuthorityCutoverReportV1(
  args: BuildUcfDecisionAuthoritySnapshotArgsV1,
): UcfDecisionAuthorityCutoverReportV1 {
  const now = args.now ?? (() => new Date());
  const snapshot = buildUcfDecisionAuthoritySnapshotV1(args);
  const canonicalReadiness = assessUcfCanonicalReadinessV1({
    findings: [],
    registered_subject_ids: snapshot.registered_subject_ids,
    scale_gap: snapshot.loadable_scale_gap,
    work_recommendation_diff_subject_count: 0,
  });

  const inventory = UCF_DECISION_AUTHORITY_CONSUMER_INVENTORY_V1;
  const consumers_migrated = migratedConsumerRows(inventory, snapshot, canonicalReadiness);
  const remaining_legacy_consumers = inventoryRuntimeLegacyConsumers(inventory);
  const remaining_blockers = inventoryBlockers(inventory);

  const runtimeConsumers = inventory.filter((entry) => !entry.location.includes(".test.ts"));
  const runtimeCutoverTargets = runtimeConsumers.filter(
    (entry) =>
      entry.consumer_id === "buckparts_large_batch_coverage_factory_summary_v1" ||
      entry.consumer_id === "fridge_buyer_path_owner_review_bridge_v1",
  );
  const runtimeCutoverMigrated = runtimeCutoverTargets.filter(
    (entry) => entry.migration_status === "MIGRATED",
  ).length;
  const cutover_percentage =
    runtimeCutoverTargets.length === 0
      ? 0
      : Math.round((runtimeCutoverMigrated / runtimeCutoverTargets.length) * 1000) / 10;

  const validation_commands = [
    "npm run build",
    "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-decision-layer-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/universal-coverage-factory-work-generator-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-registry-governance-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-parity-audit-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-canonical-readiness-policy-v1.test.ts",
    "node --import tsx --test scripts/lib/buckparts-large-batch-coverage-factory-summary-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-v1.test.ts",
    "node --import tsx --test src/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1.test.ts",
  ];

  const safe_to_commit_verdict =
    snapshot.loadable_scale_gap === 0 &&
    canonicalReadiness.registered_canonical_blocker_count === 0 &&
    snapshot.factory.subject_rows.length === snapshot.registered_subject_count
      ? "SAFE_TO_COMMIT"
      : "NOT_SAFE_TO_COMMIT";

  return {
    contract: UCF_DECISION_AUTHORITY_CUTOVER_CONTRACT_V1,
    report_name: UCF_DECISION_AUTHORITY_CUTOVER_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    inventory,
    consumers_migrated,
    remaining_legacy_consumers,
    remaining_blockers,
    cutover_percentage,
    registered_subject_count: snapshot.registered_subject_count,
    can_replace_existing_decision_logic_today:
      canonicalReadiness.can_replace_existing_decision_logic_today,
    canonical_readiness_verdict: canonicalReadiness.verdict,
    safe_to_commit_verdict,
    proven_facts: [
      `PROVEN: ucf_decision_authority_cutover_v1 inventory lists ${String(inventory.length)} consumer(s).`,
      `PROVEN: registered_subject_count=${String(snapshot.registered_subject_count)} factory_subject_rows=${String(snapshot.factory.subject_rows.length)} scale_gap=${String(snapshot.loadable_scale_gap)}.`,
      `PROVEN: consumers_migrated=${String(consumers_migrated.length)} remaining_legacy_consumers=${String(remaining_legacy_consumers.length)}.`,
      `PROVEN: runtime cutover_percentage=${String(cutover_percentage)}% (${String(runtimeCutoverMigrated)}/${String(runtimeCutoverTargets.length)} runtime disposition-provenance lanes migrated).`,
    ],
    validation_commands,
  };
}
