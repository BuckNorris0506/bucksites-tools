/**
 * ApplianceAir reference adapter v1 — read-only projection into UCF contracts.
 * Projects committed sample CSV inventory + wedge posture only (no batch-production lanes).
 */

import { createHash } from "node:crypto";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  COVERAGE_ASSESSMENT_CONTRACT_V1,
  type CoverageAssessmentDispositionV1,
  type CoverageAssessmentV1,
} from "../coverage-assessment-v1";
import {
  COVERAGE_EVIDENCE_CONTRACT_V1,
  type CoverageEvidenceClaimStatusV1,
  type CoverageEvidenceV1,
} from "../coverage-evidence-v1";
import { DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1 } from "../coverage-evidence-requirements-v1";
import type { CoverageLegacyMapEntryV1, CoverageLegacyMapV1 } from "../coverage-legacy-map-v1";
import type { CoverageProvenanceRefV1 } from "../coverage-provenance-ref-v1";
import { COVERAGE_RUN_MANIFEST_CONTRACT_V1, type CoverageRunManifestV1 } from "../coverage-run-manifest-v1";
import { COVERAGE_SUBJECT_CONTRACT_V1, type CoverageSubjectV1 } from "../coverage-subject-v1";
import { buildCoverageSubjectIdV1 } from "../coverage-subject-id-v1";
import { COVERAGE_SUBJECT_LINK_CONTRACT_V1, type CoverageSubjectLinkV1 } from "../coverage-subject-link-v1";
import {
  COVERAGE_WORK_ITEM_CONTRACT_V1,
  type CoverageWorkItemActionClassV1,
  type CoverageWorkItemV1,
} from "../coverage-work-item-v1";
import {
  artifactHashRefFromPath,
  loadSampleCsvWedgeBundleV1,
  retailerLinkIsDemoUnverified,
  type SampleCsvFilterRowV1,
  type SampleCsvModelRowV1,
  type SampleCsvWedgeBundleV1,
} from "./sample-csv-wedge-coverage-loader-v1";

export const COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1 = "1.0.0" as const;

export const APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1 =
  "appliance_air_coverage_factory_reference_adapter_v1" as const;

export const APPLIANCE_AIR_DATA_DIR_REL_V1 = "data/appliance-air" as const;

export const APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1 = {
  truth_coverage_status: "SAMPLE_ONLY",
  public_indexing_status: "NOINDEX_UNPROVEN",
  formal_spine_contract: null,
  batch_production_lanes_committed: false,
  feasibility_recommendation: "NEEDS_RESEARCH_FIRST",
} as const;

export const APPLIANCE_AIR_COVERAGE_DISPOSITIONS_V1 = [
  "NEEDS_RESEARCH_FIRST_NO_BATCH_LANES",
  "SAMPLE_FILTER_DEMO_INVENTORY",
  "SAMPLE_MODEL_DEMO_INVENTORY",
  "DEMO_RETAILER_LINK_UNVERIFIED",
  "SAMPLE_CATALOG_NOT_COMMITTED",
] as const;

export type ApplianceAirCoverageDispositionV1 = (typeof APPLIANCE_AIR_COVERAGE_DISPOSITIONS_V1)[number];

export type ApplianceAirCoverageDispositionMappingV1 = {
  appliance_air_disposition: ApplianceAirCoverageDispositionV1;
  core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_dimension_hints: CoverageLegacyMapEntryV1["evidence_dimension_hints"];
};

export const APPLIANCE_AIR_COVERAGE_DISPOSITION_MAPPING_TABLE_V1: readonly ApplianceAirCoverageDispositionMappingV1[] =
  [
    {
      appliance_air_disposition: "NEEDS_RESEARCH_FIRST_NO_BATCH_LANES",
      core_disposition: "owner_review",
      adapter_state: "NEEDS_RESEARCH_FIRST_NO_BATCH_LANES",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "unknown",
        publication: "blocked",
      },
    },
    {
      appliance_air_disposition: "SAMPLE_FILTER_DEMO_INVENTORY",
      core_disposition: "owner_review",
      adapter_state: "SAMPLE_FILTER_DEMO_INVENTORY",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "unknown",
        publication: "blocked",
      },
    },
    {
      appliance_air_disposition: "SAMPLE_MODEL_DEMO_INVENTORY",
      core_disposition: "research_fit",
      adapter_state: "SAMPLE_MODEL_DEMO_INVENTORY",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "not_applicable",
        publication: "blocked",
      },
    },
    {
      appliance_air_disposition: "DEMO_RETAILER_LINK_UNVERIFIED",
      core_disposition: "research_buyer_path",
      adapter_state: "DEMO_RETAILER_LINK_UNVERIFIED",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "unknown",
        publication: "blocked",
      },
    },
    {
      appliance_air_disposition: "SAMPLE_CATALOG_NOT_COMMITTED",
      core_disposition: "research_identity",
      adapter_state: "SAMPLE_CATALOG_NOT_COMMITTED",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "unknown",
        publication: "blocked",
      },
    },
  ] as const;

export const APPLIANCE_AIR_COVERAGE_LEGACY_MAP_V1: CoverageLegacyMapV1 = {
  contract: "coverage_legacy_map_v1",
  schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1,
  entries: APPLIANCE_AIR_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.map((row) => ({
    legacy_label: row.appliance_air_disposition,
    core_disposition: row.core_disposition,
    adapter_state: row.adapter_state,
    evidence_dimension_hints: row.evidence_dimension_hints,
  })),
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  production_mutation_authorized: false,
};

export type ApplianceAirLoadedSubjectArtifactsV1 = {
  subject_slug: string;
  subject_kind: "filter" | "model";
  bundle: SampleCsvWedgeBundleV1;
  filter_row: SampleCsvFilterRowV1 | null;
  model_row: SampleCsvModelRowV1 | null;
  linked_model_slugs: string[];
  linked_filter_slugs: string[];
  retailer_links: SampleCsvWedgeBundleV1["retailer_links"];
  blockers: string[];
};

export type ApplianceAirCoverageFactoryProjectionV1 = {
  adapter_id: typeof APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1;
  schema_version: typeof COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1;
  read_only: true;
  data_mutation: false;
  subjects: CoverageSubjectV1[];
  evidence: CoverageEvidenceV1[];
  assessments: CoverageAssessmentV1[];
  work_items: CoverageWorkItemV1[];
  subject_links: CoverageSubjectLinkV1[];
  run_manifest: CoverageRunManifestV1;
  disposition_mappings: readonly ApplianceAirCoverageDispositionMappingV1[];
  source_artifact_paths: string[];
};

export type ApplianceAirProjectionReportRowV1 = {
  subject_slug: string;
  subject_kind: "filter" | "model";
  source_artifacts: string[];
  appliance_air_disposition: ApplianceAirCoverageDispositionV1;
  ucf_core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_dimensions: {
    identity: CoverageEvidenceClaimStatusV1;
    fit: CoverageEvidenceClaimStatusV1;
    buyer_path: CoverageEvidenceClaimStatusV1;
    demand: CoverageEvidenceClaimStatusV1;
    publication: CoverageEvidenceClaimStatusV1;
  };
  policy_apply_allowed: boolean;
};

export type ApplianceAirContractFitGapKindV1 =
  | "PROVEN_CONTRACT_GAP"
  | "ADAPTER_ONLY"
  | "LEGACY_DATA_ISSUE";

export type ApplianceAirContractFitGapV1 = {
  kind: ApplianceAirContractFitGapKindV1;
  topic: string;
  detail: string;
};

export function mapApplianceAirDispositionToUcfV1(
  applianceAirDisposition: ApplianceAirCoverageDispositionV1,
): ApplianceAirCoverageDispositionMappingV1 {
  const row = APPLIANCE_AIR_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
    (entry) => entry.appliance_air_disposition === applianceAirDisposition,
  );
  if (!row) {
    throw new Error(`Unknown appliance_air disposition: ${applianceAirDisposition}`);
  }
  return row;
}

function postureContractRowRef(): CoverageProvenanceRefV1 {
  return {
    kind: "contract_row",
    contract: "appliance_air_wedge_posture_snapshot_v1",
    row_key: APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.feasibility_recommendation,
  };
}

function provenanceRefsFromBundle(
  rootDir: string,
  bundle: SampleCsvWedgeBundleV1,
): CoverageProvenanceRefV1[] {
  const refs: CoverageProvenanceRefV1[] = [postureContractRowRef()];
  for (const relPath of bundle.source_artifact_paths) {
    const ref = artifactHashRefFromPath(rootDir, relPath);
    if (ref) refs.push(ref);
  }
  return refs;
}

export function resolveApplianceAirDispositionV1(
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
): ApplianceAirCoverageDispositionV1 {
  if (loaded.subject_kind === "model") {
    return "SAMPLE_MODEL_DEMO_INVENTORY";
  }

  if (
    loaded.retailer_links.some(retailerLinkIsDemoUnverified) &&
    APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.feasibility_recommendation === "NEEDS_RESEARCH_FIRST"
  ) {
    return "DEMO_RETAILER_LINK_UNVERIFIED";
  }

  if (!APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.batch_production_lanes_committed) {
    return "NEEDS_RESEARCH_FIRST_NO_BATCH_LANES";
  }

  return "SAMPLE_FILTER_DEMO_INVENTORY";
}

function blockersFromLoaded(loaded: ApplianceAirLoadedSubjectArtifactsV1): string[] {
  const blockers = [
    "sample_csv_only:not_committed_catalog",
    `wedge_posture:${APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.truth_coverage_status}`,
    `public_indexing:${APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.public_indexing_status}`,
    `feasibility:${APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.feasibility_recommendation}`,
  ];

  if (!APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.batch_production_lanes_committed) {
    blockers.push("no_batch_production_lanes_committed");
  }

  if (loaded.retailer_links.some(retailerLinkIsDemoUnverified)) {
    blockers.push("demo_retailer_link_unverified");
  }

  if (loaded.subject_kind === "model" && loaded.linked_filter_slugs.length === 0) {
    blockers.push("model_without_compatibility_mapping");
  }

  return blockers;
}

function deriveEvidenceStatuses(
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
  mapping: ApplianceAirCoverageDispositionMappingV1,
): Record<
  "identity" | "fit" | "buyer_path" | "demand" | "publication",
  CoverageEvidenceClaimStatusV1
> {
  let identity: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.identity ?? "unknown";
  let fit: CoverageEvidenceClaimStatusV1 = mapping.evidence_dimension_hints.fit ?? "unknown";
  let buyer_path: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.buyer_path ?? "unknown";

  if (loaded.filter_row?.oem_part_number) {
    identity = "unknown";
  }
  if (loaded.linked_model_slugs.length > 0 || loaded.linked_filter_slugs.length > 0) {
    fit = "unknown";
  }
  if (loaded.retailer_links.some(retailerLinkIsDemoUnverified)) {
    buyer_path = "unknown";
  }

  return {
    identity,
    fit,
    buyer_path,
    demand: "not_applicable",
    publication: "blocked",
  };
}

function buildSubjectForApplianceAir(loaded: ApplianceAirLoadedSubjectArtifactsV1): CoverageSubjectV1 {
  if (loaded.subject_kind === "model" && loaded.model_row) {
    return {
      contract: COVERAGE_SUBJECT_CONTRACT_V1,
      subject_id: buildCoverageSubjectIdV1({
        wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
        kind_segment: "model",
        local_key: loaded.model_row.slug,
      }),
      wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
      kind: "model",
      internal_slug_labels: [loaded.model_row.slug],
      official_model_token: loaded.model_row.model_number,
      official_replacement_token: null,
      official_replacement_name: null,
      read_only: true,
      data_mutation: false,
    };
  }

  if (!loaded.filter_row) {
    throw new Error(`Missing appliance_air filter row for ${loaded.subject_slug}`);
  }

  return {
    contract: COVERAGE_SUBJECT_CONTRACT_V1,
    subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
      kind_segment: "filter",
      local_key: loaded.filter_row.slug,
    }),
    wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
    kind: "replacement_part",
    internal_slug_labels: [loaded.filter_row.slug],
    official_model_token: null,
    official_replacement_token: loaded.filter_row.oem_part_number,
    official_replacement_name: loaded.filter_row.name,
    read_only: true,
    data_mutation: false,
  };
}

function buildEvidenceForApplianceAirSubject(
  subject: CoverageSubjectV1,
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
  mapping: ApplianceAirCoverageDispositionMappingV1,
  provenance_refs: CoverageProvenanceRefV1[],
): CoverageEvidenceV1 {
  const statuses = deriveEvidenceStatuses(loaded, mapping);

  const claim = (
    dimension: keyof typeof statuses,
    summary: string | null,
  ): CoverageEvidenceV1["claims"]["identity"] => ({
    dimension,
    status: statuses[dimension],
    provenance_refs: statuses[dimension] === "proven" ? provenance_refs.slice(0, 1) : [],
    summary,
  });

  return {
    contract: COVERAGE_EVIDENCE_CONTRACT_V1,
    subject_id: subject.subject_id,
    claims: {
      identity: claim("identity", loaded.filter_row?.oem_part_number ?? loaded.model_row?.model_number ?? null),
      fit: claim(
        "fit",
        loaded.linked_model_slugs.length > 0 || loaded.linked_filter_slugs.length > 0
          ? "sample_compatibility_mapping_unproven"
          : null,
      ),
      buyer_path: claim(
        "buyer_path",
        loaded.retailer_links[0]?.affiliate_url ?? null,
      ),
      demand: claim("demand", null),
      publication: claim("publication", APPLIANCE_AIR_WEDGE_POSTURE_SNAPSHOT_V1.public_indexing_status),
    },
    read_only: true,
    data_mutation: false,
  };
}

function buildAssessmentForApplianceAirSubject(
  subject: CoverageSubjectV1,
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
  mapping: ApplianceAirCoverageDispositionMappingV1,
): CoverageAssessmentV1 {
  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subject.subject_id,
    core_disposition: mapping.core_disposition,
    adapter_state: mapping.adapter_state,
    policy_apply_allowed: false,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

function workItemActionForDisposition(
  mapping: ApplianceAirCoverageDispositionMappingV1,
): CoverageWorkItemActionClassV1 {
  if (mapping.core_disposition === "owner_review") return "OWNER_REVIEW";
  return "READ_ONLY_RESEARCH";
}

function buildWorkItemForApplianceAirSubject(
  subject: CoverageSubjectV1,
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
  mapping: ApplianceAirCoverageDispositionMappingV1,
): CoverageWorkItemV1 {
  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `appliance_air-ucf-${subject.internal_slug_labels[0]}`,
    subject_ids: [subject.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: workItemActionForDisposition(mapping),
    requires_owner_review: mapping.core_disposition === "owner_review",
    priority_score: 10,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function buildSubjectLinksForApplianceAir(
  bundle: SampleCsvWedgeBundleV1,
): CoverageSubjectLinkV1[] {
  return bundle.compatibility_mappings.map((mapping) => ({
    contract: COVERAGE_SUBJECT_LINK_CONTRACT_V1,
    from_subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
      kind_segment: "model",
      local_key: mapping.model_slug,
    }),
    to_subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
      kind_segment: "filter",
      local_key: mapping.filter_slug,
    }),
    link_kind: "fits",
    read_only: true,
    data_mutation: false,
  }));
}

export function loadApplianceAirArtifactsForSubjectSlugV1(
  rootDir: string,
  subjectSlug: string,
): ApplianceAirLoadedSubjectArtifactsV1 {
  const bundle = loadSampleCsvWedgeBundleV1({
    rootDir,
    wedgeDataDirRel: APPLIANCE_AIR_DATA_DIR_REL_V1,
  });

  const filter_row = bundle.filters.find((row) => row.slug === subjectSlug) ?? null;
  const model_row = bundle.models.find((row) => row.slug === subjectSlug) ?? null;

  if (!filter_row && !model_row) {
    throw new Error(`No committed appliance_air sample CSV artifacts found for ${subjectSlug}`);
  }

  const subject_kind = model_row ? "model" : "filter";
  const linked_model_slugs = bundle.compatibility_mappings
    .filter((row) => row.filter_slug === subjectSlug)
    .map((row) => row.model_slug);
  const linked_filter_slugs = bundle.compatibility_mappings
    .filter((row) => row.model_slug === subjectSlug)
    .map((row) => row.filter_slug);
  const retailer_links = bundle.retailer_links.filter((row) => row.filter_slug === subjectSlug);

  const loaded: ApplianceAirLoadedSubjectArtifactsV1 = {
    subject_slug: subjectSlug,
    subject_kind,
    bundle,
    filter_row,
    model_row,
    linked_model_slugs,
    linked_filter_slugs,
    retailer_links,
    blockers: [],
  };
  loaded.blockers = blockersFromLoaded(loaded);
  return loaded;
}

export function projectApplianceAirLoadedArtifactsV1(
  rootDir: string,
  loaded: ApplianceAirLoadedSubjectArtifactsV1,
): Omit<
  ApplianceAirCoverageFactoryProjectionV1,
  "run_manifest" | "disposition_mappings" | "source_artifact_paths"
> {
  const applianceAirDisposition = resolveApplianceAirDispositionV1(loaded);
  const mapping = mapApplianceAirDispositionToUcfV1(applianceAirDisposition);
  const subject = buildSubjectForApplianceAir(loaded);
  const provenance_refs = provenanceRefsFromBundle(rootDir, loaded.bundle);

  return {
    adapter_id: APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects: [subject],
    evidence: [buildEvidenceForApplianceAirSubject(subject, loaded, mapping, provenance_refs)],
    assessments: [buildAssessmentForApplianceAirSubject(subject, loaded, mapping)],
    work_items: [buildWorkItemForApplianceAirSubject(subject, loaded, mapping)],
    subject_links: buildSubjectLinksForApplianceAir(loaded.bundle).filter(
      (link) =>
        link.from_subject_id === subject.subject_id || link.to_subject_id === subject.subject_id,
    ),
  };
}

export function buildApplianceAirCoverageFactoryReferenceProjectionV1(args: {
  rootDir: string;
  subjectSlugs: string[];
  now?: () => Date;
}): ApplianceAirCoverageFactoryProjectionV1 {
  const now = args.now ?? (() => new Date());
  const subjects: CoverageSubjectV1[] = [];
  const evidence: CoverageEvidenceV1[] = [];
  const assessments: CoverageAssessmentV1[] = [];
  const work_items: CoverageWorkItemV1[] = [];
  const subject_links: CoverageSubjectLinkV1[] = [];
  const source_artifact_paths: string[] = [];
  const assessment_counts: Record<string, number> = {};

  const bundle = loadSampleCsvWedgeBundleV1({
    rootDir: args.rootDir,
    wedgeDataDirRel: APPLIANCE_AIR_DATA_DIR_REL_V1,
  });
  subject_links.push(...buildSubjectLinksForApplianceAir(bundle));

  for (const subjectSlug of args.subjectSlugs) {
    const loaded = loadApplianceAirArtifactsForSubjectSlugV1(args.rootDir, subjectSlug);
    const partial = projectApplianceAirLoadedArtifactsV1(args.rootDir, loaded);

    subjects.push(...partial.subjects);
    evidence.push(...partial.evidence);
    assessments.push(...partial.assessments);
    work_items.push(...partial.work_items);

    for (const relPath of loaded.bundle.source_artifact_paths) {
      if (!source_artifact_paths.includes(relPath)) {
        source_artifact_paths.push(relPath);
      }
    }

    for (const assessment of partial.assessments) {
      assessment_counts[assessment.core_disposition] =
        (assessment_counts[assessment.core_disposition] ?? 0) + 1;
    }
  }

  const input_artifact_hashes: Record<string, string> = {};
  for (const relPath of source_artifact_paths) {
    const ref = artifactHashRefFromPath(args.rootDir, relPath);
    if (ref?.kind === "artifact_path_hash") {
      input_artifact_hashes[ref.label] = ref.hash;
    }
  }

  const provenance_index_hash = createHash("sha256")
    .update(JSON.stringify(evidence.map((row) => row.claims)))
    .digest("hex");

  const run_manifest: CoverageRunManifestV1 = {
    contract: COVERAGE_RUN_MANIFEST_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1,
    run_id: `appliance_air-ucf-reference-${now().toISOString().slice(0, 10)}`,
    adapter_id: APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1,
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
    generated_at: now().toISOString(),
    input_artifact_hashes,
    assessment_counts: assessment_counts as CoverageRunManifestV1["assessment_counts"],
    subject_count: subjects.length,
    provenance_index_hash: `sha256:${provenance_index_hash}`,
    prior_run_id: null,
    immutable: true,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };

  return {
    adapter_id: APPLIANCE_AIR_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_APPLIANCE_AIR_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects,
    evidence,
    assessments,
    work_items,
    subject_links,
    run_manifest,
    disposition_mappings: APPLIANCE_AIR_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
    source_artifact_paths,
  };
}

export function buildApplianceAirProjectionReportV1(
  projection: ApplianceAirCoverageFactoryProjectionV1,
  rootDir?: string,
): ApplianceAirProjectionReportRowV1[] {
  return projection.subjects.map((subject, index) => {
    const assessment = projection.assessments[index];
    const evidence = projection.evidence[index];
    if (!assessment || !evidence) {
      throw new Error(`Projection row mismatch for ${subject.subject_id}`);
    }

    const slug = subject.internal_slug_labels[0] ?? "";
    const loaded = rootDir
      ? loadApplianceAirArtifactsForSubjectSlugV1(rootDir, slug)
      : null;
    const appliance_airDisposition = loaded
      ? resolveApplianceAirDispositionV1(loaded)
      : (assessment.adapter_state as ApplianceAirCoverageDispositionV1);

    return {
      subject_slug: slug,
      subject_kind: subject.kind === "model" ? "model" : "filter",
      source_artifacts: projection.source_artifact_paths,
      appliance_air_disposition: appliance_airDisposition,
      ucf_core_disposition: assessment.core_disposition,
      adapter_state: assessment.adapter_state ?? "",
      evidence_dimensions: {
        identity: evidence.claims.identity.status,
        fit: evidence.claims.fit.status,
        buyer_path: evidence.claims.buyer_path.status,
        demand: evidence.claims.demand.status,
        publication: evidence.claims.publication.status,
      },
      policy_apply_allowed: assessment.policy_apply_allowed,
    };
  });
}

export function assessApplianceAirContractFitV1(): ApplianceAirContractFitGapV1[] {
  return [
    {
      kind: "ADAPTER_ONLY",
      topic: "sample_csv_only_inventory",
      detail:
        "ApplianceAir has no committed batch-production JSON lanes; adapter projects sample CSV rows plus inlined wedge posture snapshot.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "appliance_air_parts_vocabulary",
      detail:
        "Appliance-air uses parts/grease-filter sample inventory; wedge-specific part taxonomies are preserved in adapter_state only.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "wedge_posture_snapshot",
      detail:
        "NEEDS_RESEARCH_FIRST / SAMPLE_ONLY / NOINDEX_UNPROVEN posture is synthesized from repo audit scripts and stored as contract_row provenance — not a committed JSON artifact path.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "replacement_interval_months",
      detail:
        "ApplianceAir-style replacement_interval_months from CSV cannot be stored on CoverageSubjectV1; adapter omits or uses evidence summary only.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "demo_retailer_links",
      detail:
        "Sample retailer_links use example.com URLs; buyer_path remains unknown and disposition may read DEMO_RETAILER_LINK_UNVERIFIED.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "single_demo_slug_inventory",
      detail:
        "Only range-gf10 / range-rmv1 sample rows exist; pressure test cannot sample multi-slug batch-factory behavior.",
    },
  ];
}

export function applianceAirCoverageDispositionMeaningPreservedV1(args: {
  applianceAirDisposition: ApplianceAirCoverageDispositionV1;
  assessment: CoverageAssessmentV1;
}): boolean {
  const mapping = mapApplianceAirDispositionToUcfV1(args.applianceAirDisposition);
  return (
    args.assessment.core_disposition === mapping.core_disposition &&
    args.assessment.adapter_state === mapping.adapter_state
  );
}
