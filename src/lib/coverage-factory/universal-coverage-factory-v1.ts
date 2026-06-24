/**
 * Universal Coverage Factory v1 — read-only cross-wedge projector.
 * Consumes committed wedge adapters only; never reads wedge-specific artifacts directly.
 */

import { createHash } from "node:crypto";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import {
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  buildApCoverageFactoryReferenceProjectionV1,
} from "./adapters/ap-coverage-factory-adapter-v1";
import {
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
  buildFridgeCoverageFactoryReferenceProjectionV1,
  resetFridgeAdapterAuditCacheV1,
} from "./adapters/fridge-coverage-factory-adapter-v1";
import {
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
  buildWhwCoverageFactoryReferenceProjectionV1,
} from "./adapters/whw-coverage-factory-adapter-v1";
import type { CoverageAssessmentDispositionV1, CoverageAssessmentV1 } from "./coverage-assessment-v1";
import type { CoverageSubjectV1 } from "./coverage-subject-v1";

export const UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1 = "universal_coverage_factory_v1" as const;

const UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1 = "1.0.0" as const;

export const COMMITTED_UCF_ADAPTER_IDS_V1 = [
  AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
  WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
  FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
] as const;

export type CommittedUcfAdapterIdV1 = (typeof COMMITTED_UCF_ADAPTER_IDS_V1)[number];

export type UniversalCoverageFactoryWedgeSummaryV1 = {
  wedge: HomekeepWedgeCatalog;
  subject_count: number;
  disposition_counts: Partial<Record<CoverageAssessmentDispositionV1, number>>;
  ready_for_change_planning_count: number;
  suppressed_count: number;
  mapping_review_count: number;
  owner_review_count: number;
};

export type UniversalCoverageFactoryTotalsV1 = {
  total_subjects: number;
  total_ready_for_change_planning: number;
  total_suppressed: number;
  total_mapping_review: number;
  total_owner_review: number;
};

export type UniversalCoverageFactoryBatchHeadV1 = {
  wedge: HomekeepWedgeCatalog;
  subject_id: string;
  disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  policy_apply_allowed: boolean;
};

export type UniversalCoverageFactoryRunManifestV1 = {
  schema_version: string;
  subject_count: number;
  provenance_index_hash: string;
  run_id: string;
  generated_at: string;
  adapter_ids: readonly CommittedUcfAdapterIdV1[];
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
};

export type UniversalCoverageFactoryV1 = {
  contract: typeof UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1;
  schema_version: typeof UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  production_mutation_authorized: false;
  wedge_summary: UniversalCoverageFactoryWedgeSummaryV1[];
  factory_totals: UniversalCoverageFactoryTotalsV1;
  batch_heads: UniversalCoverageFactoryBatchHeadV1[];
  run_manifest: UniversalCoverageFactoryRunManifestV1;
};

type AdapterProjectionSliceV1 = {
  adapter_id: CommittedUcfAdapterIdV1;
  wedge: HomekeepWedgeCatalog;
  subjects: CoverageSubjectV1[];
  assessments: CoverageAssessmentV1[];
  provenance_index_hash: string;
};

type CommittedAdapterConfigV1 = {
  adapter_id: CommittedUcfAdapterIdV1;
  wedge: HomekeepWedgeCatalog;
  reference_filter_slugs: readonly string[];
  project: (args: {
    rootDir: string;
    filterSlugs: readonly string[];
    now: () => Date;
  }) => AdapterProjectionSliceV1;
};

function countDisposition(
  assessments: CoverageAssessmentV1[],
  disposition: CoverageAssessmentDispositionV1,
): number {
  return assessments.filter((assessment) => assessment.core_disposition === disposition).length;
}

function buildDispositionCounts(
  assessments: CoverageAssessmentV1[],
): Partial<Record<CoverageAssessmentDispositionV1, number>> {
  const counts: Partial<Record<CoverageAssessmentDispositionV1, number>> = {};
  for (const assessment of assessments) {
    counts[assessment.core_disposition] = (counts[assessment.core_disposition] ?? 0) + 1;
  }
  return counts;
}

function buildWedgeSummary(slice: AdapterProjectionSliceV1): UniversalCoverageFactoryWedgeSummaryV1 {
  return {
    wedge: slice.wedge,
    subject_count: slice.subjects.length,
    disposition_counts: buildDispositionCounts(slice.assessments),
    ready_for_change_planning_count: countDisposition(slice.assessments, "ready_for_change_planning"),
    suppressed_count: countDisposition(slice.assessments, "suppressed"),
    mapping_review_count: countDisposition(slice.assessments, "mapping_review"),
    owner_review_count: countDisposition(slice.assessments, "owner_review"),
  };
}

function buildBatchHeads(
  slice: AdapterProjectionSliceV1,
): UniversalCoverageFactoryBatchHeadV1[] {
  return slice.subjects.map((subject, index) => {
    const assessment = slice.assessments[index];
    if (!assessment || assessment.subject_id !== subject.subject_id) {
      throw new Error(
        `Assessment/subject mismatch for ${subject.subject_id} in adapter ${slice.adapter_id}`,
      );
    }
    if (!assessment.adapter_state) {
      throw new Error(`Missing adapter_state for ${subject.subject_id}`);
    }

    return {
      wedge: slice.wedge,
      subject_id: subject.subject_id,
      disposition: assessment.core_disposition,
      adapter_state: assessment.adapter_state,
      policy_apply_allowed: assessment.policy_apply_allowed,
    };
  });
}

function sortBatchHeadsDeterministic(
  batchHeads: UniversalCoverageFactoryBatchHeadV1[],
): UniversalCoverageFactoryBatchHeadV1[] {
  return [...batchHeads].sort((left, right) => {
    const wedgeCompare = left.wedge.localeCompare(right.wedge);
    if (wedgeCompare !== 0) return wedgeCompare;
    return left.subject_id.localeCompare(right.subject_id);
  });
}

function combineProvenanceIndexHash(slices: AdapterProjectionSliceV1[]): string {
  const combined = slices
    .map((slice) => `${slice.adapter_id}:${slice.provenance_index_hash}`)
    .sort()
    .join("|");
  const hash = createHash("sha256").update(combined).digest("hex");
  return `sha256:${hash}`;
}

export const COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1: Readonly<
  Record<CommittedUcfAdapterIdV1, readonly string[]>
> = {
  [AP_COVERAGE_FACTORY_ADAPTER_ID_V1]: ["vornado-md1-0022", "alen-b75-mp", "holmes-hapf30"],
  [WHW_COVERAGE_FACTORY_ADAPTER_ID_V1]: ["3m-ap810", "3m-ap811", "ge-fxhtc"],
  [FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1]: [
    "edr4rxd1",
    "gswf",
    "rpwfe",
    "adq36006101",
    "edr2rxd1",
  ],
};

const COMMITTED_UCF_ADAPTER_REGISTRY_V1: readonly CommittedAdapterConfigV1[] = [
  {
    adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    reference_filter_slugs: COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[
      AP_COVERAGE_FACTORY_ADAPTER_ID_V1
    ],
    project: ({ rootDir, filterSlugs, now }) => {
      const projection = buildApCoverageFactoryReferenceProjectionV1({
        rootDir,
        filterSlugs: [...filterSlugs],
        now,
      });
      return {
        adapter_id: AP_COVERAGE_FACTORY_ADAPTER_ID_V1,
        wedge: projection.run_manifest.wedge,
        subjects: projection.subjects,
        assessments: projection.assessments,
        provenance_index_hash: projection.run_manifest.provenance_index_hash,
      };
    },
  },
  {
    adapter_id: WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    reference_filter_slugs: COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[
      WHW_COVERAGE_FACTORY_ADAPTER_ID_V1
    ],
    project: ({ rootDir, filterSlugs, now }) => {
      const projection = buildWhwCoverageFactoryReferenceProjectionV1({
        rootDir,
        filterSlugs: [...filterSlugs],
        now,
      });
      return {
        adapter_id: WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
        wedge: projection.run_manifest.wedge,
        subjects: projection.subjects,
        assessments: projection.assessments,
        provenance_index_hash: projection.run_manifest.provenance_index_hash,
      };
    },
  },
  {
    adapter_id: FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    reference_filter_slugs: COMMITTED_UCF_ADAPTER_REFERENCE_FILTER_SLUGS_V1[
      FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1
    ],
    project: ({ rootDir, filterSlugs, now }) => {
      resetFridgeAdapterAuditCacheV1();
      const projection = buildFridgeCoverageFactoryReferenceProjectionV1({
        rootDir,
        filterSlugs: [...filterSlugs],
        now,
      });
      return {
        adapter_id: FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
        wedge: projection.run_manifest.wedge,
        subjects: projection.subjects,
        assessments: projection.assessments,
        provenance_index_hash: projection.run_manifest.provenance_index_hash,
      };
    },
  },
] as const;

export function isCommittedUcfAdapterIdV1(value: string): value is CommittedUcfAdapterIdV1 {
  return (COMMITTED_UCF_ADAPTER_IDS_V1 as readonly string[]).includes(value);
}

function resolveAdapterConfigs(
  adapterIds: readonly CommittedUcfAdapterIdV1[],
): CommittedAdapterConfigV1[] {
  const configs: CommittedAdapterConfigV1[] = [];
  for (const adapterId of adapterIds) {
    if (!isCommittedUcfAdapterIdV1(adapterId)) {
      throw new Error(`Unknown UCF adapter_id (fail closed): ${adapterId}`);
    }
    const config = COMMITTED_UCF_ADAPTER_REGISTRY_V1.find((entry) => entry.adapter_id === adapterId);
    if (!config) {
      throw new Error(`Committed adapter_id has no registry entry (fail closed): ${adapterId}`);
    }
    configs.push(config);
  }
  return configs;
}

function buildFactoryTotals(
  wedgeSummaries: UniversalCoverageFactoryWedgeSummaryV1[],
): UniversalCoverageFactoryTotalsV1 {
  return {
    total_subjects: wedgeSummaries.reduce((sum, row) => sum + row.subject_count, 0),
    total_ready_for_change_planning: wedgeSummaries.reduce(
      (sum, row) => sum + row.ready_for_change_planning_count,
      0,
    ),
    total_suppressed: wedgeSummaries.reduce((sum, row) => sum + row.suppressed_count, 0),
    total_mapping_review: wedgeSummaries.reduce((sum, row) => sum + row.mapping_review_count, 0),
    total_owner_review: wedgeSummaries.reduce((sum, row) => sum + row.owner_review_count, 0),
  };
}

export function validateUniversalCoverageFactoryV1(row: unknown): row is UniversalCoverageFactoryV1 {
  if (!row || typeof row !== "object") return false;
  const candidate = row as UniversalCoverageFactoryV1;
  if (candidate.contract !== UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1) return false;
  if (candidate.read_only !== true) return false;
  if (candidate.data_mutation !== false) return false;
  if (candidate.mutation_authorized !== false) return false;
  if (candidate.production_mutation_authorized !== false) return false;
  if (!Array.isArray(candidate.wedge_summary)) return false;
  if (!Array.isArray(candidate.batch_heads)) return false;
  if (!candidate.factory_totals || typeof candidate.factory_totals !== "object") return false;
  if (!candidate.run_manifest || typeof candidate.run_manifest !== "object") return false;
  if (candidate.run_manifest.read_only !== true) return false;
  if (candidate.run_manifest.mutation_authorized !== false) return false;
  if (candidate.run_manifest.production_mutation_authorized !== false) return false;
  return true;
}

export function universalCoverageFactoryGrantsMutationAuthorityV1(): false {
  return false;
}

export function buildUniversalCoverageFactoryV1(args: {
  rootDir: string;
  adapter_ids?: readonly CommittedUcfAdapterIdV1[];
  now?: () => Date;
}): UniversalCoverageFactoryV1 {
  const now = args.now ?? (() => new Date());
  const adapterIds = args.adapter_ids ?? COMMITTED_UCF_ADAPTER_IDS_V1;
  const configs = resolveAdapterConfigs(adapterIds);

  const slices = configs.map((config) =>
    config.project({
      rootDir: args.rootDir,
      filterSlugs: config.reference_filter_slugs,
      now,
    }),
  );

  const wedgeSummaries = slices.map(buildWedgeSummary);
  const factoryTotals = buildFactoryTotals(wedgeSummaries);
  const batchHeads = sortBatchHeadsDeterministic(slices.flatMap(buildBatchHeads));

  const run_manifest: UniversalCoverageFactoryRunManifestV1 = {
    schema_version: UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    subject_count: factoryTotals.total_subjects,
    provenance_index_hash: combineProvenanceIndexHash(slices),
    run_id: `ucf-universal-${now().toISOString().slice(0, 10)}`,
    generated_at: now().toISOString(),
    adapter_ids: adapterIds,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };

  return {
    contract: UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
    schema_version: UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    wedge_summary: wedgeSummaries,
    factory_totals: factoryTotals,
    batch_heads: batchHeads,
    run_manifest,
  };
}
