/**
 * Whole House Water reference adapter v1 — read-only projection into UCF contracts.
 * Composes committed model-first, buyer-path, and browser-truth artifacts only.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

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

export const COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1 = "1.0.0" as const;

export const WHW_COVERAGE_FACTORY_ADAPTER_ID_V1 = "whw_coverage_factory_reference_adapter_v1" as const;

export const WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1 =
  "whole_house_water_model_first_evidence_result_v1" as const;

export const WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1 =
  "whole_house_water_buyer_path_proof_result_v1" as const;

export const WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1 =
  "whole_house_water_batch_buyer_path_proof_result_v1" as const;

export const WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1 =
  "whole_house_water_browser_truth_capture_result_v1" as const;

export const WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1 =
  "whole_house_water_model_first_batch_evidence_result_v1" as const;

export const WHW_MODEL_FIRST_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-model-first-v1" as const;

export const WHW_BUYER_PATH_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-buyer-path-v1" as const;

export const WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/browser-truth-results-v1" as const;

export const WHW_MODEL_FIRST_BATCH_RESULT_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-model-first-batch-v1/whw-model-first-batch-v1.results.json" as const;

/** WHW lane labels from committed queue / director / batch artifacts. */
export const WHW_COVERAGE_DISPOSITIONS_V1 = [
  "APPLY_READY_FOUNDER_APPROVAL_REQUIRED",
  "BUYER_PATH_BROWSER_TRUTH_REQUIRED",
  "MODEL_FIRST_DONE_BUYER_PATH_PENDING",
  "COMPLETED_NO_SAFE_BUYER_PATH_YET",
  "SKIP_FAST_NO_SAFE_PATH",
  "MAPPING_REVIEW_REQUIRED",
  "BLOCKED",
] as const;

export type WhwCoverageDispositionV1 = (typeof WHW_COVERAGE_DISPOSITIONS_V1)[number];

export type WhwCoverageDispositionMappingV1 = {
  whw_disposition: WhwCoverageDispositionV1;
  core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_dimension_hints: CoverageLegacyMapEntryV1["evidence_dimension_hints"];
};

export const WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1: readonly WhwCoverageDispositionMappingV1[] = [
  {
    whw_disposition: "APPLY_READY_FOUNDER_APPROVAL_REQUIRED",
    core_disposition: "ready_for_change_planning",
    adapter_state: "APPLY_READY_FOUNDER_APPROVAL_REQUIRED",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "proven",
    },
  },
  {
    whw_disposition: "BUYER_PATH_BROWSER_TRUTH_REQUIRED",
    core_disposition: "research_buyer_path",
    adapter_state: "BUYER_PATH_BROWSER_TRUTH_REQUIRED",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "unknown",
    },
  },
  {
    whw_disposition: "MODEL_FIRST_DONE_BUYER_PATH_PENDING",
    core_disposition: "research_buyer_path",
    adapter_state: "MODEL_FIRST_DONE_BUYER_PATH_PENDING",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "unknown",
    },
  },
  {
    whw_disposition: "COMPLETED_NO_SAFE_BUYER_PATH_YET",
    core_disposition: "suppressed",
    adapter_state: "COMPLETED_NO_SAFE_BUYER_PATH_YET",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "proven",
      buyer_path: "blocked",
    },
  },
  {
    whw_disposition: "SKIP_FAST_NO_SAFE_PATH",
    core_disposition: "suppressed",
    adapter_state: "SKIP_FAST_NO_SAFE_PATH",
    evidence_dimension_hints: {
      identity: "unknown",
      fit: "unknown",
      buyer_path: "unknown",
    },
  },
  {
    whw_disposition: "MAPPING_REVIEW_REQUIRED",
    core_disposition: "mapping_review",
    adapter_state: "MAPPING_REVIEW_REQUIRED",
    evidence_dimension_hints: {
      identity: "unknown",
      fit: "unknown",
      buyer_path: "unknown",
    },
  },
  {
    whw_disposition: "BLOCKED",
    core_disposition: "suppressed",
    adapter_state: "BLOCKED",
    evidence_dimension_hints: {
      identity: "proven",
      fit: "blocked",
      buyer_path: "unknown",
    },
  },
] as const;

export const WHW_COVERAGE_LEGACY_MAP_V1: CoverageLegacyMapV1 = {
  contract: "coverage_legacy_map_v1",
  schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1,
  entries: WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.map((row) => ({
    legacy_label: row.whw_disposition,
    core_disposition: row.core_disposition,
    adapter_state: row.adapter_state,
    evidence_dimension_hints: row.evidence_dimension_hints,
  })),
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  production_mutation_authorized: false,
};

export type WhwModelFirstArtifactV1 = {
  contract: typeof WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1;
  packet_id: string;
  run_id: string;
  anchor_filter_slug: string;
  filter_slug?: string;
  anchor_model_slug?: string;
  read_only?: true;
  data_mutation?: false;
  generated_at: string;
  model_rows?: Array<{
    model_slug: string;
    model_number?: string | null;
    evidence_status?: string;
    buyer_path_status?: string;
    documented_filter_tokens?: string[];
  }>;
  proven_facts?: string[];
};

export type WhwBuyerPathArtifactV1 = {
  contract:
    | typeof WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1
    | typeof WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1;
  packet_id: string;
  anchor_filter_slug: string;
  model_first_fit_status?: string;
  evidence_status_counts?: {
    PASS?: number;
    FAIL?: number;
    UNKNOWN?: number;
    BLOCKED?: number;
  };
  safe_apply_authorized?: boolean;
  proven_facts?: string[];
};

export type WhwBrowserTruthArtifactV1 = {
  contract: typeof WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1;
  packet_id: string;
  anchor_filter_slug: string;
  safe_apply_authorized?: boolean;
  pass_count?: number;
  proven_facts?: string[];
};

export type WhwBatchCandidateRowV1 = {
  filter_slug: string;
  anchor_model_slug?: string;
  model_or_system_slugs?: string[];
  oem_part_number?: string;
  model_proof_status?: string;
  candidate_outcome?: string;
  skip_fast_reason?: string | null;
  documented_filter_tokens?: string[];
};

export type WhwLoadedArtifactsV1 = {
  filter_slug: string;
  source_artifact_paths: string[];
  model_first: WhwModelFirstArtifactV1 | null;
  buyer_path: WhwBuyerPathArtifactV1 | null;
  browser_truth: WhwBrowserTruthArtifactV1 | null;
  batch_candidate: WhwBatchCandidateRowV1 | null;
  blockers: string[];
  safe_apply_authorized: boolean;
  publication_noindex_unproven: boolean;
};

export type WhwCoverageFactoryProjectionV1 = {
  adapter_id: typeof WHW_COVERAGE_FACTORY_ADAPTER_ID_V1;
  schema_version: typeof COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1;
  read_only: true;
  data_mutation: false;
  subjects: CoverageSubjectV1[];
  evidence: CoverageEvidenceV1[];
  assessments: CoverageAssessmentV1[];
  work_items: CoverageWorkItemV1[];
  subject_links: CoverageSubjectLinkV1[];
  run_manifest: CoverageRunManifestV1;
  disposition_mappings: readonly WhwCoverageDispositionMappingV1[];
  source_artifact_paths: string[];
};

export type WhwProjectionReportRowV1 = {
  filter_slug: string;
  source_artifacts: string[];
  whw_disposition: WhwCoverageDispositionV1;
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

export type WhwContractFitGapKindV1 =
  | "PROVEN_CONTRACT_GAP"
  | "ADAPTER_ONLY"
  | "LEGACY_DATA_ISSUE";

export type WhwContractFitGapV1 = {
  kind: WhwContractFitGapKindV1;
  topic: string;
  detail: string;
};

function packetRef(packetId: string): CoverageProvenanceRefV1 {
  return { kind: "packet_id", packet_id: packetId };
}

function artifactHashRef(label: string, absolutePath: string): CoverageProvenanceRefV1 {
  const content = readFileSync(absolutePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return { kind: "artifact_path_hash", label, hash: `sha256:${hash}` };
}

function readJsonFile<T>(absolutePath: string): T | null {
  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function mapWhwDispositionToUcfV1(
  whwDisposition: WhwCoverageDispositionV1,
): WhwCoverageDispositionMappingV1 {
  const row = WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
    (entry) => entry.whw_disposition === whwDisposition,
  );
  if (!row) {
    throw new Error(`Unknown WHW disposition: ${whwDisposition}`);
  }
  return row;
}

export function resolveWhwDispositionV1(loaded: WhwLoadedArtifactsV1): WhwCoverageDispositionV1 {
  if (loaded.batch_candidate?.candidate_outcome === "BLOCKED") {
    return "BLOCKED";
  }
  if (loaded.batch_candidate?.model_proof_status === "BLOCKED") {
    return "BLOCKED";
  }
  if (loaded.browser_truth?.safe_apply_authorized === true) {
    return "APPLY_READY_FOUNDER_APPROVAL_REQUIRED";
  }
  if (loaded.buyer_path?.safe_apply_authorized === true) {
    return "APPLY_READY_FOUNDER_APPROVAL_REQUIRED";
  }

  const modelFirstPass =
    loaded.model_first?.model_rows?.some((row) => row.evidence_status === "PASS") ||
    loaded.buyer_path?.model_first_fit_status === "PASS" ||
    loaded.batch_candidate?.model_proof_status === "PASS";

  const buyerCounts = loaded.buyer_path?.evidence_status_counts;
  if (buyerCounts) {
    if ((buyerCounts.UNKNOWN ?? 0) > 0 && modelFirstPass) {
      return "BUYER_PATH_BROWSER_TRUTH_REQUIRED";
    }
    if ((buyerCounts.PASS ?? 0) === 0 && (buyerCounts.UNKNOWN ?? 0) === 0 && (buyerCounts.FAIL ?? 0) > 0) {
      return "COMPLETED_NO_SAFE_BUYER_PATH_YET";
    }
  }

  if (modelFirstPass && !loaded.buyer_path && !loaded.browser_truth) {
    return "MODEL_FIRST_DONE_BUYER_PATH_PENDING";
  }

  if (loaded.batch_candidate?.skip_fast_reason) {
    return "SKIP_FAST_NO_SAFE_PATH";
  }

  return "BUYER_PATH_BROWSER_TRUTH_REQUIRED";
}

function modelSlugsFromLoaded(loaded: WhwLoadedArtifactsV1): string[] {
  if (loaded.model_first?.model_rows?.length) {
    return loaded.model_first.model_rows.map((row) => row.model_slug);
  }
  if (loaded.batch_candidate?.model_or_system_slugs?.length) {
    return loaded.batch_candidate.model_or_system_slugs;
  }
  if (loaded.batch_candidate?.anchor_model_slug) {
    return [loaded.batch_candidate.anchor_model_slug];
  }
  if (loaded.model_first?.anchor_model_slug) {
    return [loaded.model_first.anchor_model_slug];
  }
  return [];
}

function documentedTokensFromLoaded(loaded: WhwLoadedArtifactsV1): string[] {
  const fromModelFirst =
    loaded.model_first?.model_rows?.flatMap((row) => row.documented_filter_tokens ?? []) ?? [];
  const fromBatch = loaded.batch_candidate?.documented_filter_tokens ?? [];
  return Array.from(new Set([...fromModelFirst, ...fromBatch]));
}

function deriveEvidenceStatuses(
  loaded: WhwLoadedArtifactsV1,
  mapping: WhwCoverageDispositionMappingV1,
): Record<
  "identity" | "fit" | "buyer_path" | "demand" | "publication",
  CoverageEvidenceClaimStatusV1
> {
  const tokens = documentedTokensFromLoaded(loaded);
  const modelFirstPass =
    loaded.model_first?.model_rows?.some((row) => row.evidence_status === "PASS") ||
    loaded.buyer_path?.model_first_fit_status === "PASS" ||
    loaded.batch_candidate?.model_proof_status === "PASS";
  const modelFirstBlocked = loaded.batch_candidate?.model_proof_status === "BLOCKED";

  let identity: CoverageEvidenceClaimStatusV1 = mapping.evidence_dimension_hints.identity ?? "unknown";
  if (tokens.length > 0 || modelFirstPass) identity = "proven";

  let fit: CoverageEvidenceClaimStatusV1 = mapping.evidence_dimension_hints.fit ?? "unknown";
  if (modelFirstPass) fit = "proven";
  if (modelFirstBlocked) fit = "blocked";

  let buyer_path: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.buyer_path ?? "unknown";
  if (loaded.safe_apply_authorized) {
    buyer_path = "proven";
  } else if (loaded.buyer_path?.evidence_status_counts) {
    const counts = loaded.buyer_path.evidence_status_counts;
    if ((counts.PASS ?? 0) > 0) buyer_path = "proven";
    else if ((counts.UNKNOWN ?? 0) > 0) buyer_path = "unknown";
    else if ((counts.FAIL ?? 0) > 0 && (counts.UNKNOWN ?? 0) === 0) buyer_path = "blocked";
  }

  const publication: CoverageEvidenceClaimStatusV1 = loaded.publication_noindex_unproven
    ? "blocked"
    : "not_applicable";

  return {
    identity,
    fit,
    buyer_path,
    demand: "not_applicable",
    publication,
  };
}

function provenanceRefsFromLoaded(loaded: WhwLoadedArtifactsV1): CoverageProvenanceRefV1[] {
  const refs: CoverageProvenanceRefV1[] = [];
  if (loaded.model_first?.packet_id) refs.push(packetRef(loaded.model_first.packet_id));
  if (loaded.buyer_path?.packet_id) refs.push(packetRef(loaded.buyer_path.packet_id));
  if (loaded.browser_truth?.packet_id) refs.push(packetRef(loaded.browser_truth.packet_id));
  if (loaded.batch_candidate) {
    refs.push({
      kind: "contract_row",
      contract: WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1,
      row_key: loaded.batch_candidate.filter_slug,
    });
  }
  return refs;
}

function buildSubjectForWhwFilter(loaded: WhwLoadedArtifactsV1): CoverageSubjectV1 {
  const tokens = documentedTokensFromLoaded(loaded);
  return {
    contract: COVERAGE_SUBJECT_CONTRACT_V1,
    subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      kind_segment: "filter",
      local_key: loaded.filter_slug,
    }),
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    kind: "replacement_part",
    internal_slug_labels: [loaded.filter_slug],
    official_model_token: loaded.batch_candidate?.anchor_model_slug ?? loaded.model_first?.anchor_model_slug ?? null,
    official_replacement_token: tokens[0] ?? loaded.batch_candidate?.oem_part_number ?? null,
    official_replacement_name: null,
    read_only: true,
    data_mutation: false,
  };
}

function buildEvidenceForWhwSubject(
  subject: CoverageSubjectV1,
  loaded: WhwLoadedArtifactsV1,
  mapping: WhwCoverageDispositionMappingV1,
): CoverageEvidenceV1 {
  const statuses = deriveEvidenceStatuses(loaded, mapping);
  const refs = provenanceRefsFromLoaded(loaded);

  const claims = {
    identity: {
      dimension: "identity" as const,
      status: statuses.identity,
      provenance_refs: statuses.identity === "proven" ? refs.slice(0, 1) : [],
      summary: null,
    },
    fit: {
      dimension: "fit" as const,
      status: statuses.fit,
      provenance_refs: statuses.fit === "proven" ? refs.slice(0, 1) : [],
      summary: null,
    },
    buyer_path: {
      dimension: "buyer_path" as const,
      status: statuses.buyer_path,
      provenance_refs: statuses.buyer_path === "proven" ? refs : [],
      summary: null,
    },
    demand: {
      dimension: "demand" as const,
      status: statuses.demand,
      provenance_refs: [],
      summary: null,
    },
    publication: {
      dimension: "publication" as const,
      status: statuses.publication,
      provenance_refs: [],
      summary: null,
    },
  };

  return {
    contract: COVERAGE_EVIDENCE_CONTRACT_V1,
    subject_id: subject.subject_id,
    claims,
    read_only: true,
    data_mutation: false,
  };
}

function buildAssessmentForWhwSubject(
  subject: CoverageSubjectV1,
  loaded: WhwLoadedArtifactsV1,
  mapping: WhwCoverageDispositionMappingV1,
): CoverageAssessmentV1 {
  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subject.subject_id,
    core_disposition: mapping.core_disposition,
    adapter_state: mapping.adapter_state,
    policy_apply_allowed: loaded.safe_apply_authorized,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

function workItemActionForWhwDisposition(
  disposition: WhwCoverageDispositionV1,
): CoverageWorkItemActionClassV1 {
  if (disposition === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED") return "PLAN_CHANGE";
  if (disposition === "MAPPING_REVIEW_REQUIRED") return "MAPPING_REVIEW";
  if (disposition === "BLOCKED" || disposition === "SKIP_FAST_NO_SAFE_PATH") return "OWNER_REVIEW";
  return "READ_ONLY_RESEARCH";
}

function buildWorkItemForWhwSubject(
  subject: CoverageSubjectV1,
  loaded: WhwLoadedArtifactsV1,
  disposition: WhwCoverageDispositionV1,
): CoverageWorkItemV1 {
  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `whw-ucf-${subject.internal_slug_labels[0]}`,
    subject_ids: [subject.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: workItemActionForWhwDisposition(disposition),
    requires_owner_review: disposition === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED",
    priority_score: disposition === "APPLY_READY_FOUNDER_APPROVAL_REQUIRED" ? 100 : 10,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function buildSubjectLinksForWhw(
  filterSubject: CoverageSubjectV1,
  loaded: WhwLoadedArtifactsV1,
): CoverageSubjectLinkV1[] {
  return modelSlugsFromLoaded(loaded).map((modelSlug) => ({
    contract: COVERAGE_SUBJECT_LINK_CONTRACT_V1,
    from_subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
      kind_segment: "model",
      local_key: modelSlug,
    }),
    to_subject_id: filterSubject.subject_id,
    link_kind: "fits",
    read_only: true,
    data_mutation: false,
  }));
}

function publicationNoindexFromFacts(facts: string[] | undefined): boolean {
  if (!facts) return false;
  return facts.some((fact) => /NOINDEX_UNPROVEN/i.test(fact));
}

function blockersFromLoaded(loaded: WhwLoadedArtifactsV1): string[] {
  const blockers: string[] = [];
  if (loaded.batch_candidate?.skip_fast_reason) {
    blockers.push(loaded.batch_candidate.skip_fast_reason);
  }
  if (loaded.publication_noindex_unproven) {
    blockers.push("whole-house-water launch state remains NOINDEX_UNPROVEN");
  }
  if (blockers.length === 0 && loaded.browser_truth?.safe_apply_authorized) {
    blockers.push("Founder approval required before any CSV apply despite safe_apply_authorized=true");
  }
  return blockers;
}

export function loadWhwBatchCandidateRowV1(
  rootDir: string,
  filterSlug: string,
): { row: WhwBatchCandidateRowV1; sourceArtifactPath: string } | null {
  const relPath = WHW_MODEL_FIRST_BATCH_RESULT_REL_V1;
  const absolutePath = path.join(rootDir, relPath);
  const batch = readJsonFile<{ candidates_checked?: WhwBatchCandidateRowV1[] }>(absolutePath);
  if (!batch?.candidates_checked) return null;
  const row = batch.candidates_checked.find((candidate) => candidate.filter_slug === filterSlug);
  if (!row) return null;
  return { row, sourceArtifactPath: relPath };
}

function findArtifactFile(
  rootDir: string,
  dirRel: string,
  filterSlug: string,
  suffixes: string[],
): { absolutePath: string; relPath: string } | null {
  const dir = path.join(rootDir, dirRel);
  let files: string[] = [];
  try {
    files = readdirSync(dir);
  } catch {
    return null;
  }

  for (const suffix of suffixes) {
    const match = files.find(
      (file) =>
        file.includes(filterSlug) &&
        file.endsWith(suffix) &&
        !file.includes("batch-test-write"),
    );
    if (match) {
      return {
        absolutePath: path.join(dir, match),
        relPath: path.join(dirRel, match),
      };
    }
  }
  return null;
}

export function loadWhwArtifactsForFilterSlugV1(
  rootDir: string,
  filterSlug: string,
): WhwLoadedArtifactsV1 {
  const source_artifact_paths: string[] = [];
  let model_first: WhwModelFirstArtifactV1 | null = null;
  let buyer_path: WhwBuyerPathArtifactV1 | null = null;
  let browser_truth: WhwBrowserTruthArtifactV1 | null = null;
  let batch_candidate: WhwBatchCandidateRowV1 | null = null;

  const modelFirstFile = findArtifactFile(rootDir, WHW_MODEL_FIRST_RESULTS_DIR_REL_V1, filterSlug, [
    ".results.json",
  ]);
  if (modelFirstFile) {
    const raw = readJsonFile<WhwModelFirstArtifactV1>(modelFirstFile.absolutePath);
    if (raw?.contract === WHW_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1) {
      model_first = raw;
      source_artifact_paths.push(modelFirstFile.relPath);
    }
  }

  const buyerPathFile = findArtifactFile(rootDir, WHW_BUYER_PATH_RESULTS_DIR_REL_V1, filterSlug, [
    ".results.json",
  ]);
  if (buyerPathFile) {
    const raw = readJsonFile<WhwBuyerPathArtifactV1>(buyerPathFile.absolutePath);
    if (
      raw?.contract === WHW_BUYER_PATH_PROOF_RESULT_CONTRACT_V1 ||
      raw?.contract === WHW_BATCH_BUYER_PATH_PROOF_RESULT_CONTRACT_V1
    ) {
      buyer_path = raw;
      source_artifact_paths.push(buyerPathFile.relPath);
    }
  }

  const browserTruthFile = findArtifactFile(
    rootDir,
    WHW_BROWSER_TRUTH_RESULTS_DIR_REL_V1,
    filterSlug,
    [".results.json"],
  );
  if (browserTruthFile) {
    const raw = readJsonFile<WhwBrowserTruthArtifactV1>(browserTruthFile.absolutePath);
    if (raw?.contract === WHW_BROWSER_TRUTH_CAPTURE_RESULT_CONTRACT_V1) {
      browser_truth = raw;
      source_artifact_paths.push(browserTruthFile.relPath);
    }
  }

  const batchLoaded = loadWhwBatchCandidateRowV1(rootDir, filterSlug);
  if (batchLoaded) {
    batch_candidate = batchLoaded.row;
    if (!source_artifact_paths.includes(batchLoaded.sourceArtifactPath)) {
      source_artifact_paths.push(batchLoaded.sourceArtifactPath);
    }
  }

  const provenFacts = [
    ...(model_first?.proven_facts ?? []),
    ...(buyer_path?.proven_facts ?? []),
    ...(browser_truth?.proven_facts ?? []),
  ];
  const publication_noindex_unproven = publicationNoindexFromFacts(provenFacts);

  const loaded: WhwLoadedArtifactsV1 = {
    filter_slug: filterSlug,
    source_artifact_paths,
    model_first,
    buyer_path,
    browser_truth,
    batch_candidate,
    blockers: [],
    safe_apply_authorized:
      browser_truth?.safe_apply_authorized === true || buyer_path?.safe_apply_authorized === true,
    publication_noindex_unproven,
  };
  loaded.blockers = blockersFromLoaded(loaded);
  return loaded;
}

export function projectWhwLoadedArtifactsV1(
  loaded: WhwLoadedArtifactsV1,
): Omit<
  WhwCoverageFactoryProjectionV1,
  "run_manifest" | "disposition_mappings" | "source_artifact_paths"
> {
  if (loaded.source_artifact_paths.length === 0) {
    throw new Error(`No committed WHW artifacts found for ${loaded.filter_slug}`);
  }

  const whwDisposition = resolveWhwDispositionV1(loaded);
  const mapping = mapWhwDispositionToUcfV1(whwDisposition);
  const subject = buildSubjectForWhwFilter(loaded);

  return {
    adapter_id: WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects: [subject],
    evidence: [buildEvidenceForWhwSubject(subject, loaded, mapping)],
    assessments: [buildAssessmentForWhwSubject(subject, loaded, mapping)],
    work_items: [buildWorkItemForWhwSubject(subject, loaded, whwDisposition)],
    subject_links: buildSubjectLinksForWhw(subject, loaded),
  };
}

export function buildWhwCoverageFactoryReferenceProjectionV1(args: {
  rootDir: string;
  filterSlugs: string[];
  now?: () => Date;
}): WhwCoverageFactoryProjectionV1 {
  const now = args.now ?? (() => new Date());
  const subjects: CoverageSubjectV1[] = [];
  const evidence: CoverageEvidenceV1[] = [];
  const assessments: CoverageAssessmentV1[] = [];
  const work_items: CoverageWorkItemV1[] = [];
  const subject_links: CoverageSubjectLinkV1[] = [];
  const source_artifact_paths: string[] = [];
  const assessment_counts: Record<string, number> = {};

  for (const filterSlug of args.filterSlugs) {
    const loaded = loadWhwArtifactsForFilterSlugV1(args.rootDir, filterSlug);
    const partial = projectWhwLoadedArtifactsV1(loaded);

    subjects.push(...partial.subjects);
    evidence.push(...partial.evidence);
    assessments.push(...partial.assessments);
    work_items.push(...partial.work_items);
    subject_links.push(...partial.subject_links);

    for (const relPath of loaded.source_artifact_paths) {
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
    const absolutePath = path.join(args.rootDir, relPath);
    const ref = artifactHashRef(relPath, absolutePath);
    if (ref.kind === "artifact_path_hash") {
      input_artifact_hashes[ref.label] = ref.hash;
    }
  }

  const provenance_index_hash = createHash("sha256")
    .update(JSON.stringify(evidence.map((row) => row.claims)))
    .digest("hex");

  const run_manifest: CoverageRunManifestV1 = {
    contract: COVERAGE_RUN_MANIFEST_CONTRACT_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1,
    run_id: `whw-ucf-reference-${now().toISOString().slice(0, 10)}`,
    adapter_id: WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
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
    adapter_id: WHW_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_WHW_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects,
    evidence,
    assessments,
    work_items,
    subject_links,
    run_manifest,
    disposition_mappings: WHW_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
    source_artifact_paths,
  };
}

export function buildWhwProjectionReportV1(
  projection: WhwCoverageFactoryProjectionV1,
  rootDir?: string,
): WhwProjectionReportRowV1[] {
  return projection.subjects.map((subject, index) => {
    const assessment = projection.assessments[index];
    const evidence = projection.evidence[index];
    const whwDisposition = projection.disposition_mappings.find(
      (row) => row.adapter_state === assessment.adapter_state,
    )?.whw_disposition;

    if (!whwDisposition) {
      throw new Error(`Missing WHW disposition for adapter_state ${assessment.adapter_state}`);
    }
    if (!assessment.adapter_state) {
      throw new Error(`Missing adapter_state for subject ${subject.subject_id}`);
    }

    const source_artifacts =
      rootDir !== undefined
        ? loadWhwArtifactsForFilterSlugV1(rootDir, subject.internal_slug_labels[0])
            .source_artifact_paths
        : projection.source_artifact_paths.filter((artifactPath) =>
            artifactPath.includes(subject.internal_slug_labels[0]),
          );

    return {
      filter_slug: subject.internal_slug_labels[0],
      source_artifacts,
      whw_disposition: whwDisposition,
      ucf_core_disposition: assessment.core_disposition,
      adapter_state: assessment.adapter_state,
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

export function assessWhwContractFitV1(): WhwContractFitGapV1[] {
  return [
    {
      kind: "ADAPTER_ONLY",
      topic: "multi_lane_artifact_composition",
      detail:
        "WHW truth is split across model-first, buyer-path, and browser-truth committed JSON lanes; the adapter merges them without new UCF contract types.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "whw_lane_vocabulary",
      detail:
        "WHW queue/director labels (BUYER_PATH_BROWSER_TRUTH_REQUIRED, APPLY_READY_FOUNDER_APPROVAL_REQUIRED, etc.) are preserved in adapter_state while mapping to core UCF dispositions.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "batch_candidate_rows",
      detail:
        "whw-model-first-batch-v1 candidate rows are projected via contract_row provenance refs; no batch-specific UCF subject kind is required.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "publication_noindex",
      detail:
        "Committed WHW artifacts cite NOINDEX_UNPROVEN launch state; adapter maps publication claim to blocked while demand stays not_applicable.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "test_write_artifact",
      detail:
        "whw-buyer-path-3m-ap811-batch-test-write.results.json is excluded from adapter loads; not canonical committed proof.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "browser_truth_recommended_csv_mutations",
      detail:
        "Browser-truth artifacts may list recommended_csv_mutations arrays; UCF uses policy_apply_allowed boolean only — adapter does not invent apply rows.",
    },
  ];
}

export function whwCoverageDispositionMeaningPreservedV1(args: {
  whwDisposition: WhwCoverageDispositionV1;
  assessment: CoverageAssessmentV1;
}): boolean {
  const mapping = mapWhwDispositionToUcfV1(args.whwDisposition);
  return (
    args.assessment.core_disposition === mapping.core_disposition &&
    args.assessment.adapter_state === mapping.adapter_state
  );
}
