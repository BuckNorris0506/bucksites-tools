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
import type { CoverageEvidenceClaimStatusV1, CoverageEvidenceV1 } from "./coverage-evidence-v1";
import type { CoverageProvenanceRefV1 } from "./coverage-provenance-ref-v1";
import type { CoverageSubjectLinkKindV1, CoverageSubjectLinkV1 } from "./coverage-subject-link-v1";
import type { CoverageSubjectV1 } from "./coverage-subject-v1";

export const UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1 = "universal_coverage_factory_v1" as const;

const UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1 = "1.1.0" as const;

export const UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1 =
  "PLANNING_READY_FIT_BLOCKED" as const;

export const UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1 =
  "RESCUE_BUYER_PATH_READY_FIT_BLOCKED" as const;

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

export type UniversalCoverageFactoryEvidenceSummaryV1 = {
  identity: CoverageEvidenceClaimStatusV1;
  fit: CoverageEvidenceClaimStatusV1;
  buyer_path: CoverageEvidenceClaimStatusV1;
  demand: CoverageEvidenceClaimStatusV1;
  publication: CoverageEvidenceClaimStatusV1;
};

export type UniversalCoverageFactorySubjectLinkRefV1 = {
  from_subject_id: string;
  to_subject_id: string;
  link_kind: CoverageSubjectLinkKindV1;
};

export type UniversalCoverageFactoryProvenanceSummaryV1 = {
  provenance_ref_count: number;
  provenance_refs: CoverageProvenanceRefV1[];
};

export type UniversalCoverageFactorySubjectTruthBlockerV1 = {
  code: string;
  detail: string;
};

export type UniversalCoverageFactorySubjectRowV1 = {
  wedge: HomekeepWedgeCatalog;
  subject_id: string;
  disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  policy_apply_allowed: boolean;
  blockers: string[];
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  provenance_summary: UniversalCoverageFactoryProvenanceSummaryV1;
  subject_link_count: number;
  subject_link_refs: UniversalCoverageFactorySubjectLinkRefV1[];
  truth_blockers: UniversalCoverageFactorySubjectTruthBlockerV1[];
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
  subject_rows: UniversalCoverageFactorySubjectRowV1[];
  batch_heads: UniversalCoverageFactoryBatchHeadV1[];
  run_manifest: UniversalCoverageFactoryRunManifestV1;
};

type AdapterProjectionSliceV1 = {
  adapter_id: CommittedUcfAdapterIdV1;
  wedge: HomekeepWedgeCatalog;
  subjects: CoverageSubjectV1[];
  assessments: CoverageAssessmentV1[];
  evidence: CoverageEvidenceV1[];
  subject_links: CoverageSubjectLinkV1[];
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

export function buildEvidenceSummaryFromCoverageEvidenceV1(
  evidence: CoverageEvidenceV1,
): UniversalCoverageFactoryEvidenceSummaryV1 {
  return {
    identity: evidence.claims.identity.status,
    fit: evidence.claims.fit.status,
    buyer_path: evidence.claims.buyer_path.status,
    demand: evidence.claims.demand.status,
    publication: evidence.claims.publication.status,
  };
}

function provenanceRefKey(ref: CoverageProvenanceRefV1): string {
  if (ref.kind === "artifact_path_hash") {
    return `artifact:${ref.label}:${ref.hash}`;
  }
  if (ref.kind === "packet_id") {
    return `packet:${ref.packet_id}`;
  }
  return `contract:${ref.contract}:${ref.row_key}`;
}

export function buildProvenanceSummaryFromCoverageEvidenceV1(
  evidence: CoverageEvidenceV1,
): UniversalCoverageFactoryProvenanceSummaryV1 {
  const seen = new Set<string>();
  const provenance_refs: CoverageProvenanceRefV1[] = [];

  for (const dimension of ["identity", "fit", "buyer_path", "demand", "publication"] as const) {
    for (const ref of evidence.claims[dimension].provenance_refs) {
      const key = provenanceRefKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      provenance_refs.push(ref);
    }
  }

  provenance_refs.sort((left, right) => provenanceRefKey(left).localeCompare(provenanceRefKey(right)));

  return {
    provenance_ref_count: provenance_refs.length,
    provenance_refs,
  };
}

export function deriveFactorySubjectTruthBlockersV1(args: {
  disposition: CoverageAssessmentDispositionV1;
  evidence_summary: UniversalCoverageFactoryEvidenceSummaryV1;
  adapter_state: string;
  policy_apply_allowed: boolean;
}): UniversalCoverageFactorySubjectTruthBlockerV1[] {
  const blockers: UniversalCoverageFactorySubjectTruthBlockerV1[] = [];

  if (
    args.disposition === "ready_for_change_planning" &&
    args.evidence_summary.fit === "blocked"
  ) {
    blockers.push({
      code: UCF_SUBJECT_TRUTH_BLOCKER_PLANNING_READY_FIT_BLOCKED_V1,
      detail: `ready_for_change_planning with fit=blocked and adapter_state=${args.adapter_state}; planning work must not be treated as apply-ready.`,
    });
  }

  if (
    args.disposition === "mapping_review" &&
    args.evidence_summary.buyer_path === "proven" &&
    args.evidence_summary.fit === "blocked" &&
    args.adapter_state === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED"
  ) {
    blockers.push({
      code: UCF_SUBJECT_TRUTH_BLOCKER_RESCUE_BUYER_PATH_MAPPING_BLOCKED_V1,
      detail: `buyer_path=proven with fit=blocked and adapter_state=${args.adapter_state}; rescue buyer-path proof is ready but mapping safety remains blocked.`,
    });
  }

  if (args.disposition === "candidate_apply" && !args.policy_apply_allowed) {
    blockers.push({
      code: "CANDIDATE_APPLY_WITHOUT_POLICY",
      detail: "candidate_apply requires policy_apply_allowed=true.",
    });
  }

  return blockers;
}

function buildSubjectLinkRefsForSubject(
  subjectId: string,
  subjectLinks: CoverageSubjectLinkV1[],
): UniversalCoverageFactorySubjectLinkRefV1[] {
  const refs = subjectLinks
    .filter((link) => link.from_subject_id === subjectId || link.to_subject_id === subjectId)
    .map((link) => ({
      from_subject_id: link.from_subject_id,
      to_subject_id: link.to_subject_id,
      link_kind: link.link_kind,
    }));

  refs.sort((left, right) => {
    const leftKey = `${left.from_subject_id}|${left.link_kind}|${left.to_subject_id}`;
    const rightKey = `${right.from_subject_id}|${right.link_kind}|${right.to_subject_id}`;
    return leftKey.localeCompare(rightKey);
  });

  return refs;
}

function buildSubjectRows(slice: AdapterProjectionSliceV1): UniversalCoverageFactorySubjectRowV1[] {
  return slice.subjects.map((subject, index) => {
    const assessment = slice.assessments[index];
    const evidence = slice.evidence[index];
    if (!assessment || assessment.subject_id !== subject.subject_id) {
      throw new Error(
        `Assessment/subject mismatch for ${subject.subject_id} in adapter ${slice.adapter_id}`,
      );
    }
    if (!evidence || evidence.subject_id !== subject.subject_id) {
      throw new Error(
        `Evidence/subject mismatch for ${subject.subject_id} in adapter ${slice.adapter_id}`,
      );
    }
    if (!assessment.adapter_state) {
      throw new Error(`Missing adapter_state for ${subject.subject_id}`);
    }

    const evidence_summary = buildEvidenceSummaryFromCoverageEvidenceV1(evidence);
    const provenance_summary = buildProvenanceSummaryFromCoverageEvidenceV1(evidence);
    const subject_link_refs = buildSubjectLinkRefsForSubject(subject.subject_id, slice.subject_links);

    return {
      wedge: slice.wedge,
      subject_id: subject.subject_id,
      disposition: assessment.core_disposition,
      adapter_state: assessment.adapter_state,
      policy_apply_allowed: assessment.policy_apply_allowed,
      blockers: [...assessment.blockers],
      evidence_summary,
      provenance_summary,
      subject_link_count: subject_link_refs.length,
      subject_link_refs,
      truth_blockers: deriveFactorySubjectTruthBlockersV1({
        disposition: assessment.core_disposition,
        evidence_summary,
        adapter_state: assessment.adapter_state,
        policy_apply_allowed: assessment.policy_apply_allowed,
      }),
    };
  });
}

function batchHeadFromSubjectRow(row: UniversalCoverageFactorySubjectRowV1): UniversalCoverageFactoryBatchHeadV1 {
  return {
    wedge: row.wedge,
    subject_id: row.subject_id,
    disposition: row.disposition,
    adapter_state: row.adapter_state,
    policy_apply_allowed: row.policy_apply_allowed,
  };
}

function sortSubjectRowsDeterministic(
  rows: UniversalCoverageFactorySubjectRowV1[],
): UniversalCoverageFactorySubjectRowV1[] {
  return [...rows].sort((left, right) => {
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
  [AP_COVERAGE_FACTORY_ADAPTER_ID_V1]: [
    "vornado-md1-0022",
    "alen-b75-mp",
    "holmes-hapf30",
    "coway-airmega250-rf",
    "gg-flt4100",
    "gg-flt4825",
    "levoit-rf-rar029",
    "levoit-rf-rar040",
    "levoit-rf-rar060",
    "rabbit-carbon-minusa2",
    "shark-carbon-foam",
    "winix-carbon-116131",
  ],
  [WHW_COVERAGE_FACTORY_ADAPTER_ID_V1]: [
    "3m-ap810",
    "3m-ap811",
    "ge-fxhtc",
    "3m-ap910r",
    "3m-ap917hd-s",
    "culligan-cw5-bb",
    "ge-fxhsc",
    "ge-fxwpc",
    "pentek-dgd-5005",
    "pentek-p5-slim",
    "springwell-cf1-sediment",
    "watts-w50pehd",
    "whirlpool-whkf-gd05",
  ],
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
        evidence: projection.evidence,
        subject_links: projection.subject_links,
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
        evidence: projection.evidence,
        subject_links: projection.subject_links,
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
        evidence: projection.evidence,
        subject_links: projection.subject_links,
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

function batchHeadMatchesSubjectRow(
  head: UniversalCoverageFactoryBatchHeadV1,
  row: UniversalCoverageFactorySubjectRowV1,
): boolean {
  return (
    head.wedge === row.wedge &&
    head.subject_id === row.subject_id &&
    head.disposition === row.disposition &&
    head.adapter_state === row.adapter_state &&
    head.policy_apply_allowed === row.policy_apply_allowed
  );
}

export function universalCoverageFactoryInternalConsistencyErrorsV1(
  factory: UniversalCoverageFactoryV1,
): string[] {
  const errors: string[] = [];

  if (!Array.isArray(factory.subject_rows) || !Array.isArray(factory.batch_heads)) {
    errors.push("subject_rows and batch_heads must be arrays");
    return errors;
  }

  if (!factory.factory_totals || typeof factory.factory_totals !== "object") {
    errors.push("factory_totals must be present");
    return errors;
  }

  if (!factory.run_manifest || typeof factory.run_manifest !== "object") {
    errors.push("run_manifest must be present");
    return errors;
  }

  if (factory.subject_rows.length !== factory.batch_heads.length) {
    errors.push("subject_rows length must equal batch_heads length");
  }

  if (factory.factory_totals.total_subjects !== factory.subject_rows.length) {
    errors.push("factory_totals.total_subjects must equal subject_rows length");
  }

  if (factory.run_manifest.subject_count !== factory.subject_rows.length) {
    errors.push("run_manifest.subject_count must equal subject_rows length");
  }

  const subjectIds = factory.subject_rows.map((row) => row.subject_id);
  if (subjectIds.length !== new Set(subjectIds).size) {
    errors.push("subject_id values must be globally unique across adapters");
  }

  for (let index = 0; index < factory.subject_rows.length; index += 1) {
    const row = factory.subject_rows[index];
    const head = factory.batch_heads[index];
    if (!row || !head || !batchHeadMatchesSubjectRow(head, row)) {
      errors.push(`batch_heads[${index}] must match subject_rows[${index}] summary fields`);
    }
  }

  const sortedRows = sortSubjectRowsDeterministic(factory.subject_rows);
  for (let index = 0; index < factory.subject_rows.length; index += 1) {
    const row = factory.subject_rows[index];
    const expected = sortedRows[index];
    if (!row || !expected || row.subject_id !== expected.subject_id) {
      errors.push("subject_rows must be sorted by wedge then subject_id");
      break;
    }
  }

  for (const summary of factory.wedge_summary) {
    const rowsForWedge = factory.subject_rows.filter((row) => row.wedge === summary.wedge);
    if (rowsForWedge.length !== summary.subject_count) {
      errors.push(`wedge_summary subject_count mismatch for wedge ${summary.wedge}`);
    }
  }

  const totals = factory.factory_totals;
  if (
    totals.total_ready_for_change_planning !==
    factory.subject_rows.filter((row) => row.disposition === "ready_for_change_planning").length
  ) {
    errors.push("factory_totals.total_ready_for_change_planning must reconcile with subject_rows");
  }
  if (
    totals.total_suppressed !==
    factory.subject_rows.filter((row) => row.disposition === "suppressed").length
  ) {
    errors.push("factory_totals.total_suppressed must reconcile with subject_rows");
  }
  if (
    totals.total_mapping_review !==
    factory.subject_rows.filter((row) => row.disposition === "mapping_review").length
  ) {
    errors.push("factory_totals.total_mapping_review must reconcile with subject_rows");
  }
  if (
    totals.total_owner_review !==
    factory.subject_rows.filter((row) => row.disposition === "owner_review").length
  ) {
    errors.push("factory_totals.total_owner_review must reconcile with subject_rows");
  }

  return errors;
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
  if (!Array.isArray(candidate.subject_rows)) return false;
  if (!Array.isArray(candidate.batch_heads)) return false;
  if (!candidate.factory_totals || typeof candidate.factory_totals !== "object") return false;
  if (!candidate.run_manifest || typeof candidate.run_manifest !== "object") return false;
  if (candidate.run_manifest.read_only !== true) return false;
  if (candidate.run_manifest.mutation_authorized !== false) return false;
  if (candidate.run_manifest.production_mutation_authorized !== false) return false;

  for (const subjectRow of candidate.subject_rows) {
    if (!subjectRow || typeof subjectRow !== "object") return false;
    if (typeof subjectRow.subject_id !== "string") return false;
    if (!subjectRow.evidence_summary || typeof subjectRow.evidence_summary !== "object") {
      return false;
    }
    if (!subjectRow.provenance_summary || typeof subjectRow.provenance_summary !== "object") {
      return false;
    }
    if (!Array.isArray(subjectRow.blockers)) return false;
    if (!Array.isArray(subjectRow.truth_blockers)) return false;
    if (!Array.isArray(subjectRow.subject_link_refs)) return false;
    if (typeof subjectRow.subject_link_count !== "number") return false;
    if (subjectRow.subject_link_count !== subjectRow.subject_link_refs.length) return false;
  }

  return universalCoverageFactoryInternalConsistencyErrorsV1(candidate).length === 0;
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
  const subject_rows = sortSubjectRowsDeterministic(slices.flatMap(buildSubjectRows));
  const batch_heads = subject_rows.map(batchHeadFromSubjectRow);

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

  const factory: UniversalCoverageFactoryV1 = {
    contract: UNIVERSAL_COVERAGE_FACTORY_CONTRACT_V1,
    schema_version: UNIVERSAL_COVERAGE_FACTORY_SCHEMA_VERSION_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    wedge_summary: wedgeSummaries,
    factory_totals: factoryTotals,
    subject_rows,
    batch_heads,
    run_manifest,
  };

  const consistencyErrors = universalCoverageFactoryInternalConsistencyErrorsV1(factory);
  if (consistencyErrors.length > 0) {
    throw new Error(
      `Universal coverage factory internal consistency failed (fail closed): ${consistencyErrors.join("; ")}`,
    );
  }

  return factory;
}
