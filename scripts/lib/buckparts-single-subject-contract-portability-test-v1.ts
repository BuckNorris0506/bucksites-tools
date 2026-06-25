/**
 * Read-only Single Subject Contract Portability Test v1 — falsify whether one humidifier
 * sample subject can be represented using existing UCF core contracts without modifying
 * the contract layer. Does not implement the wedge or collect new evidence.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import {
  assessHumidifierContractFitV1,
  buildHumidifierCoverageFactoryReferenceProjectionV1,
  HUMIDIFIER_DATA_DIR_REL_V1,
  loadHumidifierArtifactsForSubjectSlugV1,
  resolveHumidifierDispositionV1,
} from "@/lib/coverage-factory/adapters/humidifier-coverage-factory-adapter-v1";
import {
  artifactHashRefFromPath,
  loadSampleCsvWedgeBundleV1,
  type SampleCsvFilterRowV1,
} from "@/lib/coverage-factory/adapters/sample-csv-wedge-coverage-loader-v1";
import {
  COVERAGE_ASSESSMENT_DISPOSITIONS_V1,
  validateCoverageAssessmentV1,
  validateCoverageAssessmentWithEvidenceV1,
  type CoverageAssessmentDispositionV1,
  type CoverageAssessmentV1,
} from "@/lib/coverage-factory/coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_CLAIM_STATUSES_V1,
  validateCoverageEvidenceV1,
  type CoverageEvidenceV1,
} from "@/lib/coverage-factory/coverage-evidence-v1";
import type { CoverageProvenanceRefV1 } from "@/lib/coverage-factory/coverage-provenance-ref-v1";
import {
  COVERAGE_SUBJECT_KINDS_V1,
  validateCoverageSubjectV1,
  type CoverageSubjectKindV1,
  type CoverageSubjectV1,
} from "@/lib/coverage-factory/coverage-subject-v1";
import {
  COVERAGE_WORK_ITEM_ACTION_CLASSES_V1,
  coverageWorkItemGrantsMutationAuthorityV1,
  validateCoverageWorkItemV1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "@/lib/coverage-factory/coverage-work-item-v1";
import {
  buildEvidenceSummaryFromCoverageEvidenceV1,
  buildProvenanceSummaryFromCoverageEvidenceV1,
  deriveFactorySubjectTruthBlockersV1,
  type UniversalCoverageFactoryEvidenceSummaryV1,
  type UniversalCoverageFactorySubjectTruthBlockerV1,
} from "@/lib/coverage-factory/universal-coverage-factory-v1";
import { workItemClassForDispositionV1 } from "@/lib/coverage-factory/ucf-provenance-load-bearing-experiment-v1";

export const SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1 =
  "single_subject_contract_portability_test_v1" as const;

export const SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_SOURCE_COMMAND_V1 =
  "npm run buckparts:single-subject-contract-portability-test" as const;

export const SINGLE_SUBJECT_CONTRACT_PORTABILITY_HYPOTHESIS_V1 =
  "A new/immature wedge can create a valid UCF-style subject, assessment/disposition, provenance reference, and work item using existing core contracts without modifying the contract layer." as const;

export const SINGLE_SUBJECT_CONTRACT_PORTABILITY_PRIOR_WEDGE_SPEED_CLAIM_V1 =
  "Prior wedge_speed_test_v1 measured operational onboarding maturity (truth spine, buyer-path proof, guardrails), not whether core UCF contracts accept a humidifier subject." as const;

export type ContractPortabilityVerdictV1 =
  | "PORTABLE_WITH_EXISTING_CONTRACTS"
  | "REQUIRES_CORE_CONTRACT_CHANGE"
  | "INSUFFICIENT_SAMPLE_DATA"
  | "UNKNOWN";

export type SelectedHumidifierSampleSubjectV1 = {
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.humidifier;
  subject_slug: string;
  subject_kind: "filter" | "model";
  selection_score: number;
  selection_reasons: string[];
  source_rows: {
    filter_row: SampleCsvFilterRowV1 | null;
    model_slug: string | null;
    retailer_link_count: number;
    compatibility_mapping_count: number;
  };
};

export type PortabilitySubjectIdentityPacketV1 = {
  canonical_subject_id: string;
  wedge: typeof HOMEKEEP_WEDGE_CATALOG.humidifier;
  subject_type: CoverageSubjectKindV1;
  slug: string;
  source_row: {
    artifact: string;
    row_key: string;
    oem_part_number: string | null;
    name: string | null;
  };
};

export type PortabilityAssessmentPacketV1 = {
  disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  truth_blockers: UniversalCoverageFactorySubjectTruthBlockerV1[];
  assessment_blockers: string[];
  policy_apply_allowed: false;
  humidifier_disposition: string;
};

export type PortabilityProvenancePacketV1 = {
  provenance_ref_count: number;
  provenance_refs: CoverageProvenanceRefV1[];
  source_artifact_paths: string[];
  invented_external_evidence: false;
};

export type PortabilityWorkItemPacketV1 = {
  work_item: CoverageWorkItemV1;
  permitted_action_class: CoverageWorkItemActionClassV1;
  validation_path: string[];
  mutation_authority_granted: false;
  artifact_write_authorized: false;
};

export type ContractValidationResultV1 = {
  subject_valid: boolean;
  evidence_valid: boolean;
  assessment_valid: boolean;
  assessment_evidence_consistent: boolean;
  work_item_valid: boolean;
  disposition_in_core_enum: boolean;
  evidence_statuses_in_core_enum: boolean;
  action_class_in_core_enum: boolean;
  proven_contract_gap_count: number;
  adapter_only_gap_count: number;
};

export type SingleSubjectContractPortabilityTestReportV1 = {
  contract: typeof SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  supabase_writes: false;
  source_command: typeof SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_SOURCE_COMMAND_V1;
  generated_at: string;
  hypothesis: typeof SINGLE_SUBJECT_CONTRACT_PORTABILITY_HYPOTHESIS_V1;
  selected_subject: SelectedHumidifierSampleSubjectV1;
  subject_identity: PortabilitySubjectIdentityPacketV1;
  assessment: PortabilityAssessmentPacketV1;
  provenance: PortabilityProvenancePacketV1;
  work_item_packet: PortabilityWorkItemPacketV1;
  contract_validation: ContractValidationResultV1;
  contract_portability_verdict: ContractPortabilityVerdictV1;
  verdict_rationale: string[];
  wedge_speed_test_reinterpretation: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildSingleSubjectContractPortabilityTestDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  /** Test-only: simulate a core contract gap to falsify verdict logic. */
  inject_core_contract_gap?: boolean;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function scoreHumidifierFilterSlug(args: {
  slug: string;
  bundle: ReturnType<typeof loadSampleCsvWedgeBundleV1>;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const filter = args.bundle.filters.find((row) => row.slug === args.slug);
  if (!filter) return { score: -1, reasons: ["not_a_filter_slug"] };

  score += 20;
  reasons.push("filter_subject_preferred_for_identity_plus_replacement_part");

  if (filter.oem_part_number.trim().length > 0) {
    score += 15;
    reasons.push("oem_part_number_present");
  }
  if (filter.name.trim().length > 0) {
    score += 5;
    reasons.push("filter_name_present");
  }

  const mappingCount = args.bundle.compatibility_mappings.filter(
    (row) => row.filter_slug === args.slug,
  ).length;
  if (mappingCount > 0) {
    score += 10;
    reasons.push(`compatibility_mappings=${mappingCount}`);
  }

  const retailerCount = args.bundle.retailer_links.filter(
    (row) => row.filter_slug === args.slug,
  ).length;
  if (retailerCount > 0) {
    score += 8;
    reasons.push(`retailer_links=${retailerCount}`);
  }

  return { score, reasons };
}

export function selectHumidifierSampleSubjectV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
}): SelectedHumidifierSampleSubjectV1 | null {
  const fileExists = args.fileExists ?? defaultFileExists;
  const dataDirAbs = path.join(args.rootDir, HUMIDIFIER_DATA_DIR_REL_V1);
  if (!fileExists(dataDirAbs)) return null;

  const bundle = loadSampleCsvWedgeBundleV1({
    rootDir: args.rootDir,
    wedgeDataDirRel: HUMIDIFIER_DATA_DIR_REL_V1,
  });

  if (bundle.filters.length === 0) return null;

  const ranked = bundle.filters
    .map((filter) => {
      const { score, reasons } = scoreHumidifierFilterSlug({ slug: filter.slug, bundle });
      const mappingCount = bundle.compatibility_mappings.filter(
        (row) => row.filter_slug === filter.slug,
      ).length;
      const retailerCount = bundle.retailer_links.filter(
        (row) => row.filter_slug === filter.slug,
      ).length;
      const linkedModel =
        bundle.compatibility_mappings.find((row) => row.filter_slug === filter.slug)?.model_slug ??
        null;

      return {
        wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
        subject_slug: filter.slug,
        subject_kind: "filter" as const,
        selection_score: score,
        selection_reasons: reasons,
        source_rows: {
          filter_row: filter,
          model_slug: linkedModel,
          retailer_link_count: retailerCount,
          compatibility_mapping_count: mappingCount,
        },
      };
    })
    .filter((row) => row.selection_score >= 0)
    .sort(
      (a, b) =>
        b.selection_score - a.selection_score || a.subject_slug.localeCompare(b.subject_slug),
    );

  return ranked[0] ?? null;
}

function evidenceStatusesInCoreEnum(evidence: CoverageEvidenceV1): boolean {
  return Object.values(evidence.claims).every((claim) =>
    (COVERAGE_EVIDENCE_CLAIM_STATUSES_V1 as readonly string[]).includes(claim.status),
  );
}

export function validatePortabilityCoreContractsV1(args: {
  subject: CoverageSubjectV1;
  evidence: CoverageEvidenceV1;
  assessment: CoverageAssessmentV1;
  work_item: CoverageWorkItemV1;
  inject_core_contract_gap?: boolean;
}): ContractValidationResultV1 {
  const contractFitGaps = assessHumidifierContractFitV1();
  const proven_contract_gap_count = args.inject_core_contract_gap
    ? 1
    : contractFitGaps.filter((gap) => gap.kind === "PROVEN_CONTRACT_GAP").length;

  return {
    subject_valid: validateCoverageSubjectV1(args.subject),
    evidence_valid: validateCoverageEvidenceV1(args.evidence),
    assessment_valid: validateCoverageAssessmentV1(args.assessment),
    assessment_evidence_consistent: validateCoverageAssessmentWithEvidenceV1({
      assessment: args.assessment,
      evidence: args.evidence,
    }),
    work_item_valid: validateCoverageWorkItemV1(args.work_item),
    disposition_in_core_enum: (COVERAGE_ASSESSMENT_DISPOSITIONS_V1 as readonly string[]).includes(
      args.assessment.core_disposition,
    ),
    evidence_statuses_in_core_enum: evidenceStatusesInCoreEnum(args.evidence),
    action_class_in_core_enum: (
      COVERAGE_WORK_ITEM_ACTION_CLASSES_V1 as readonly string[]
    ).includes(args.work_item.permitted_action_class),
    proven_contract_gap_count,
    adapter_only_gap_count: contractFitGaps.filter((gap) => gap.kind === "ADAPTER_ONLY").length,
  };
}

export function resolveContractPortabilityVerdictV1(args: {
  selected: SelectedHumidifierSampleSubjectV1 | null;
  validation: ContractValidationResultV1;
  subject: CoverageSubjectV1 | null;
}): { verdict: ContractPortabilityVerdictV1; rationale: string[] } {
  const rationale: string[] = [];

  if (!args.selected || !args.subject) {
    rationale.push("no_humidifier_sample_subject_with_filter_identity");
    return { verdict: "INSUFFICIENT_SAMPLE_DATA", rationale };
  }

  if (args.validation.proven_contract_gap_count > 0) {
    rationale.push(
      `proven_contract_gap_count=${args.validation.proven_contract_gap_count} — core contract layer change required`,
    );
    return { verdict: "REQUIRES_CORE_CONTRACT_CHANGE", rationale };
  }

  const coreChecks = [
    args.validation.subject_valid,
    args.validation.evidence_valid,
    args.validation.assessment_valid,
    args.validation.work_item_valid,
    args.validation.disposition_in_core_enum,
    args.validation.evidence_statuses_in_core_enum,
    args.validation.action_class_in_core_enum,
  ];

  if (!coreChecks.every(Boolean)) {
    rationale.push("one_or_more_core_contract_validators_failed");
    if (!args.validation.subject_valid) rationale.push("subject_invalid");
    if (!args.validation.evidence_valid) rationale.push("evidence_invalid");
    if (!args.validation.assessment_valid) rationale.push("assessment_invalid");
    if (!args.validation.work_item_valid) rationale.push("work_item_invalid");
    if (!args.validation.disposition_in_core_enum) rationale.push("disposition_not_in_core_enum");
    if (!args.validation.evidence_statuses_in_core_enum) {
      rationale.push("evidence_status_not_in_core_enum");
    }
    if (!args.validation.action_class_in_core_enum) {
      rationale.push("action_class_not_in_core_enum");
    }
    return { verdict: "UNKNOWN", rationale };
  }

  if (
    !args.selected.source_rows.filter_row ||
    !args.selected.source_rows.filter_row.oem_part_number.trim()
  ) {
    rationale.push("sample_filter_missing_oem_identity");
    return { verdict: "INSUFFICIENT_SAMPLE_DATA", rationale };
  }

  if (!(COVERAGE_SUBJECT_KINDS_V1 as readonly string[]).includes(args.subject.kind)) {
    rationale.push(`subject_kind_not_in_core_enum:${args.subject.kind}`);
    return { verdict: "REQUIRES_CORE_CONTRACT_CHANGE", rationale };
  }

  rationale.push("all_core_contract_validators_passed");
  rationale.push(`adapter_only_gaps=${args.validation.adapter_only_gap_count} (no core enum changes)`);
  rationale.push("humidifier_reference_projection_uses_existing_UCF_contracts_only");
  return { verdict: "PORTABLE_WITH_EXISTING_CONTRACTS", rationale };
}

function buildWedgeSpeedReinterpretation(verdict: ContractPortabilityVerdictV1): string {
  if (verdict === "PORTABLE_WITH_EXISTING_CONTRACTS") {
    return [
      SINGLE_SUBJECT_CONTRACT_PORTABILITY_PRIOR_WEDGE_SPEED_CLAIM_V1,
      "Reinterpretation: wedge_speed_test_v1 DOMAIN_SPECIFIC_SIGNAL reflected missing operational lanes (buyer-path proof, truth spine, guardrails), not failure of UCF core contracts.",
      "The favorable zero core_contract_change_count signal from wedge_speed_test_v1 is confirmed at single-subject granularity.",
    ].join(" ");
  }
  if (verdict === "REQUIRES_CORE_CONTRACT_CHANGE") {
    return [
      SINGLE_SUBJECT_CONTRACT_PORTABILITY_PRIOR_WEDGE_SPEED_CLAIM_V1,
      "Reinterpretation: wedge_speed_test_v1 zero core_contract_change_count would be contradicted — core contracts cannot represent this subject without enum/model changes.",
    ].join(" ");
  }
  return [
    SINGLE_SUBJECT_CONTRACT_PORTABILITY_PRIOR_WEDGE_SPEED_CLAIM_V1,
    "Reinterpretation: inconclusive — portability test could not confirm or falsify architectural reuse from sample data alone.",
  ].join(" ");
}

export function buildSingleSubjectContractPortabilityTestReportV1(
  args: BuildSingleSubjectContractPortabilityTestDepsV1,
): SingleSubjectContractPortabilityTestReportV1 {
  const now = args.now ?? (() => new Date());
  const selected = selectHumidifierSampleSubjectV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
  });

  if (!selected) {
    const emptyValidation: ContractValidationResultV1 = {
      subject_valid: false,
      evidence_valid: false,
      assessment_valid: false,
      assessment_evidence_consistent: false,
      work_item_valid: false,
      disposition_in_core_enum: false,
      evidence_statuses_in_core_enum: false,
      action_class_in_core_enum: false,
      proven_contract_gap_count: args.inject_core_contract_gap ? 1 : 0,
      adapter_only_gap_count: 0,
    };
    const { verdict, rationale } = resolveContractPortabilityVerdictV1({
      selected: null,
      validation: emptyValidation,
      subject: null,
    });

    return {
      contract: SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      artifact_write_authorized: false,
      supabase_writes: false,
      source_command: SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_SOURCE_COMMAND_V1,
      generated_at: now().toISOString(),
      hypothesis: SINGLE_SUBJECT_CONTRACT_PORTABILITY_HYPOTHESIS_V1,
      selected_subject: {
        wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
        subject_slug: "UNKNOWN",
        subject_kind: "filter",
        selection_score: 0,
        selection_reasons: ["insufficient_sample_data"],
        source_rows: {
          filter_row: null,
          model_slug: null,
          retailer_link_count: 0,
          compatibility_mapping_count: 0,
        },
      },
      subject_identity: {
        canonical_subject_id: "UNKNOWN",
        wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
        subject_type: "replacement_part",
        slug: "UNKNOWN",
        source_row: {
          artifact: HUMIDIFIER_DATA_DIR_REL_V1,
          row_key: "UNKNOWN",
          oem_part_number: null,
          name: null,
        },
      },
      assessment: {
        disposition: "owner_review",
        adapter_state: "UNKNOWN",
        evidence_summary: {
          identity: "unknown",
          fit: "unknown",
          buyer_path: "unknown",
          demand: "not_applicable",
          publication: "blocked",
        },
        truth_blockers: [],
        assessment_blockers: [],
        policy_apply_allowed: false,
        humidifier_disposition: "UNKNOWN",
      },
      provenance: {
        provenance_ref_count: 0,
        provenance_refs: [],
        source_artifact_paths: [],
        invented_external_evidence: false,
      },
      work_item_packet: {
        work_item: {
          contract: "coverage_work_item_v1",
          work_item_id: "UNKNOWN",
          subject_ids: ["UNKNOWN"],
          required_evidence_checks: [],
          permitted_action_class: "READ_ONLY_RESEARCH",
          requires_owner_review: true,
          priority_score: null,
          blockers: [],
          read_only: true,
          data_mutation: false,
          mutation_authorized: false,
          production_mutation_authorized: false,
          artifact_write_authorized: false,
        },
        permitted_action_class: "READ_ONLY_RESEARCH",
        validation_path: ["validateCoverageWorkItemV1"],
        mutation_authority_granted: false,
        artifact_write_authorized: false,
      },
      contract_validation: emptyValidation,
      contract_portability_verdict: verdict,
      verdict_rationale: rationale,
      wedge_speed_test_reinterpretation: buildWedgeSpeedReinterpretation(verdict),
      proven_facts: [
        "PROVEN: read_only=true data_mutation=false mutation_authorized=false supabase_writes=false",
        "PROVEN: no humidifier sample subject selected",
      ],
      inferred_facts: [],
      unknown_facts: ["UNKNOWN: humidifier sample CSV inventory missing or empty"],
    };
  }

  const projection = buildHumidifierCoverageFactoryReferenceProjectionV1({
    rootDir: args.rootDir,
    subjectSlugs: [selected.subject_slug],
    now,
  });

  const subject = projection.subjects[0];
  const evidence = projection.evidence[0];
  const assessment = projection.assessments[0];
  const work_item = projection.work_items[0];

  if (!subject || !evidence || !assessment || !work_item) {
    throw new Error(
      `Humidifier projection missing rows for slug ${selected.subject_slug} (fail closed)`,
    );
  }

  const loaded = loadHumidifierArtifactsForSubjectSlugV1(args.rootDir, selected.subject_slug);
  const humidifierDisposition = resolveHumidifierDispositionV1(loaded);
  const evidence_summary = buildEvidenceSummaryFromCoverageEvidenceV1(evidence);
  const claimProvenance = buildProvenanceSummaryFromCoverageEvidenceV1(evidence);
  const sampleArtifactRefs = projection.source_artifact_paths
    .map((relPath) => artifactHashRefFromPath(args.rootDir, relPath))
    .filter((ref): ref is CoverageProvenanceRefV1 => ref !== null);
  const provenance_refs = [...claimProvenance.provenance_refs];
  const seen = new Set(provenance_refs.map((ref) => JSON.stringify(ref)));
  for (const ref of sampleArtifactRefs) {
    const key = JSON.stringify(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    provenance_refs.push(ref);
  }
  const truth_blockers = deriveFactorySubjectTruthBlockersV1({
    disposition: assessment.core_disposition,
    evidence_summary,
    adapter_state: assessment.adapter_state ?? humidifierDisposition,
    policy_apply_allowed: assessment.policy_apply_allowed,
  });

  const validation = validatePortabilityCoreContractsV1({
    subject,
    evidence,
    assessment,
    work_item,
    inject_core_contract_gap: args.inject_core_contract_gap,
  });

  const { verdict, rationale } = resolveContractPortabilityVerdictV1({
    selected,
    validation,
    subject,
  });

  const filterRow = selected.source_rows.filter_row;
  const sourceArtifact = `${HUMIDIFIER_DATA_DIR_REL_V1}/filters.sample.csv`;

  return {
    contract: SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    supabase_writes: false,
    source_command: SINGLE_SUBJECT_CONTRACT_PORTABILITY_TEST_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    hypothesis: SINGLE_SUBJECT_CONTRACT_PORTABILITY_HYPOTHESIS_V1,
    selected_subject: selected,
    subject_identity: {
      canonical_subject_id: subject.subject_id,
      wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
      subject_type: subject.kind,
      slug: selected.subject_slug,
      source_row: {
        artifact: sourceArtifact,
        row_key: selected.subject_slug,
        oem_part_number: filterRow?.oem_part_number ?? null,
        name: filterRow?.name ?? null,
      },
    },
    assessment: {
      disposition: assessment.core_disposition,
      adapter_state: assessment.adapter_state ?? humidifierDisposition,
      evidence_summary,
      truth_blockers,
      assessment_blockers: [...assessment.blockers],
      policy_apply_allowed: false,
      humidifier_disposition: humidifierDisposition,
    },
    provenance: {
      provenance_ref_count: provenance_refs.length,
      provenance_refs,
      source_artifact_paths: projection.source_artifact_paths,
      invented_external_evidence: false,
    },
    work_item_packet: {
      work_item,
      permitted_action_class: work_item.permitted_action_class,
      validation_path: [
        "validateCoverageWorkItemV1",
        "coverageWorkItemGrantsMutationAuthorityV1 === false",
        `workItemClassForDispositionV1(${assessment.core_disposition}) === ${workItemClassForDispositionV1(assessment.core_disposition)}`,
        "validateCoverageAssessmentWithEvidenceV1",
      ],
      mutation_authority_granted: coverageWorkItemGrantsMutationAuthorityV1(work_item),
      artifact_write_authorized: false,
    },
    contract_validation: validation,
    contract_portability_verdict: verdict,
    verdict_rationale: rationale,
    wedge_speed_test_reinterpretation: buildWedgeSpeedReinterpretation(verdict),
    proven_facts: [
      "PROVEN: read_only=true data_mutation=false mutation_authorized=false supabase_writes=false",
      `PROVEN: selected_subject_slug=${selected.subject_slug}`,
      `PROVEN: canonical_subject_id=${subject.subject_id}`,
      `PROVEN: core_disposition=${assessment.core_disposition}`,
      `PROVEN: policy_apply_allowed=false`,
      `PROVEN: humidifier_disposition=${humidifierDisposition}`,
      `PROVEN: proven_contract_gap_count=${validation.proven_contract_gap_count}`,
      `PROVEN: contract_portability_verdict=${verdict}`,
    ],
    inferred_facts: [
      `INFERRED: work_item_action_class=${work_item.permitted_action_class} from existing disposition mapping.`,
      `INFERRED: truth_blocker_count=${truth_blockers.length} from deriveFactorySubjectTruthBlockersV1.`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether committed (non-sample) humidifier inventory would change disposition without core contract changes.",
      "UNKNOWN: Safe CTA / buyer-path proof intentionally out of scope for this portability test.",
    ],
  };
}

/** Read-only guard for tests: confirms sample CSV bytes unchanged after report build. */
export function assertHumidifierSampleCsvUnchangedV1(args: {
  rootDir: string;
  relPath?: string;
  before: string;
}): boolean {
  const rel = args.relPath ?? `${HUMIDIFIER_DATA_DIR_REL_V1}/filters.sample.csv`;
  const after = readFileSync(path.join(args.rootDir, rel), "utf8");
  return after === args.before;
}
