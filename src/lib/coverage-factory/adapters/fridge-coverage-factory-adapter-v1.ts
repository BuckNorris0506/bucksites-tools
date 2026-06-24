/**
 * Refrigerator water reference adapter v1 — read-only projection into UCF contracts.
 * Composes committed safe-link, audit, browser-proof, buyer-path, and rescue artifacts only.
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

export const COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1 = "1.0.0" as const;

export const FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1 =
  "fridge_coverage_factory_reference_adapter_v1" as const;

export const FRIDGE_MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1 =
  "model_filter_correctness_audit_v1" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_CONTRACT_V1 = "fridge_safe_link_batch_factory_v1" as const;

export const FRIDGE_SAFE_LINK_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 =
  "fridge_safe_link_owner_browser_proof_result_v1" as const;

export const FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1 =
  "fridge_safe_link_gswf_ge_official_owner_browser_proof_v1" as const;

export const FRIDGE_SAFE_LINK_APPLY_READINESS_CONTRACT_V1 = "fridge_safe_link_gswf_apply_readiness_v1" as const;

export const FRIDGE_RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1 =
  "rpwfe_official_ge_browser_evidence_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_CONTRACT_V1 =
  "fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_OWNER_REVIEW_PACKET_CONTRACT_V1 = "edr4rxd1_owner_review_packet_v1" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json" as const;

export const FRIDGE_MODEL_FILTER_AUDIT_REL_V1 =
  "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json" as const;

export const FRIDGE_BUYER_PATH_APPLY_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-plans/fridge-buyer-path-batch-apply-plan-v1-0fec4a7b623a.json" as const;

export const FRIDGE_DRAFTS_DIR_REL_V1 = "data/fridge/batch-production/drafts" as const;

export const FRIDGE_RPWFE_BROWSER_EVIDENCE_REL_V1 =
  "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-browser-evidence-v1.json" as const;

/** Refrigerator lane labels from committed artifacts (batch factory, audit, browser proof, buyer path, rescue). */
export const FRIDGE_COVERAGE_DISPOSITIONS_V1 = [
  "APPLY_READY_AFTER_OWNER_BROWSER_PROOF",
  "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
  "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
  "RESCUE_BROWSER_PROOF_READY",
  "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED",
  "BUYER_PATH_SEARCH_PLACEHOLDER_PENDING",
  "READY_FOR_OWNER_BROWSER_PROOF",
  "CONFLICT_REQUIRES_RECONCILIATION",
  "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
  "FAMILY_RECONCILIATION_OWNER_REVIEW",
  "BAD_MAPPING_REMEDIATION_REQUIRED",
  "AUDIT_PROVEN_CORRECT",
  "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE",
  "AUDIT_WRONG_PART_RISK",
  "DO_NOT_USE_WRONG_PART_RISK",
  "AUDIT_BLOCKED",
  "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
  "PUBLICATION_NOINDEX_REVIEW",
  "PUBLICATION_INDEXABLE_NO_BUY_LINK",
] as const;

export type FridgeCoverageDispositionV1 = (typeof FRIDGE_COVERAGE_DISPOSITIONS_V1)[number];

export type FridgeCoverageDispositionMappingV1 = {
  fridge_disposition: FridgeCoverageDispositionV1;
  core_disposition: CoverageAssessmentDispositionV1;
  adapter_state: string;
  evidence_dimension_hints: CoverageLegacyMapEntryV1["evidence_dimension_hints"];
};

export const FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1: readonly FridgeCoverageDispositionMappingV1[] =
  [
    {
      fridge_disposition: "APPLY_READY_AFTER_OWNER_BROWSER_PROOF",
      core_disposition: "ready_for_change_planning",
      adapter_state: "APPLY_READY_AFTER_OWNER_BROWSER_PROOF",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "proven",
      },
    },
    {
      fridge_disposition: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
      core_disposition: "research_buyer_path",
      adapter_state: "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
      core_disposition: "research_buyer_path",
      adapter_state: "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "RESCUE_BROWSER_PROOF_READY",
      core_disposition: "ready_for_change_planning",
      adapter_state: "RESCUE_BROWSER_PROOF_READY",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "proven",
      },
    },
    {
      fridge_disposition: "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED",
      core_disposition: "mapping_review",
      adapter_state: "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "blocked",
        buyer_path: "proven",
      },
    },
    {
      fridge_disposition: "BUYER_PATH_SEARCH_PLACEHOLDER_PENDING",
      core_disposition: "research_buyer_path",
      adapter_state: "BUYER_PATH_SEARCH_PLACEHOLDER_PENDING",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "READY_FOR_OWNER_BROWSER_PROOF",
      core_disposition: "research_buyer_path",
      adapter_state: "READY_FOR_OWNER_BROWSER_PROOF",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "CONFLICT_REQUIRES_RECONCILIATION",
      core_disposition: "mapping_review",
      adapter_state: "CONFLICT_REQUIRES_RECONCILIATION",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
      core_disposition: "mapping_review",
      adapter_state: "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "FAMILY_RECONCILIATION_OWNER_REVIEW",
      core_disposition: "owner_review",
      adapter_state: "FAMILY_RECONCILIATION_OWNER_REVIEW",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "BAD_MAPPING_REMEDIATION_REQUIRED",
      core_disposition: "mapping_review",
      adapter_state: "BAD_MAPPING_REMEDIATION_REQUIRED",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "blocked",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "AUDIT_PROVEN_CORRECT",
      core_disposition: "ready_for_change_planning",
      adapter_state: "AUDIT_PROVEN_CORRECT",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE",
      core_disposition: "research_buyer_path",
      adapter_state: "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "unknown",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "AUDIT_WRONG_PART_RISK",
      core_disposition: "suppressed",
      adapter_state: "AUDIT_WRONG_PART_RISK",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "blocked",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "DO_NOT_USE_WRONG_PART_RISK",
      core_disposition: "suppressed",
      adapter_state: "DO_NOT_USE_WRONG_PART_RISK",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "blocked",
        buyer_path: "blocked",
      },
    },
    {
      fridge_disposition: "AUDIT_BLOCKED",
      core_disposition: "suppressed",
      adapter_state: "AUDIT_BLOCKED",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "blocked",
        buyer_path: "unknown",
      },
    },
    {
      fridge_disposition: "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
      core_disposition: "suppressed",
      adapter_state: "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
      evidence_dimension_hints: {
        identity: "unknown",
        fit: "unknown",
        buyer_path: "blocked",
      },
    },
    {
      fridge_disposition: "PUBLICATION_NOINDEX_REVIEW",
      core_disposition: "owner_review",
      adapter_state: "PUBLICATION_NOINDEX_REVIEW",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "unknown",
        publication: "blocked",
      },
    },
    {
      fridge_disposition: "PUBLICATION_INDEXABLE_NO_BUY_LINK",
      core_disposition: "research_buyer_path",
      adapter_state: "PUBLICATION_INDEXABLE_NO_BUY_LINK",
      evidence_dimension_hints: {
        identity: "proven",
        fit: "proven",
        buyer_path: "blocked",
        publication: "proven",
      },
    },
  ] as const;

export const FRIDGE_COVERAGE_LEGACY_MAP_V1: CoverageLegacyMapV1 = {
  contract: "coverage_legacy_map_v1",
  schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1,
  entries: FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.map((row) => ({
    legacy_label: row.fridge_disposition,
    core_disposition: row.core_disposition,
    adapter_state: row.adapter_state,
    evidence_dimension_hints: row.evidence_dimension_hints,
  })),
  read_only: true,
  data_mutation: false,
  mutation_authorized: false,
  production_mutation_authorized: false,
};


type FridgeBatchFactoryRowV1 = {
  slug: string;
  oem_part_token?: string;
  batch_factory_state?: string;
  exact_blockers?: string[];
  wrong_part_risk?: string | null;
};

type FridgeAuditModelRowV1 = {
  fridge_slug: string;
  mapped_filter_slugs: string[];
  classification: string;
  blockers?: string[];
  per_filter_proof?: Array<{
    filter_slug: string;
    proof_status: string;
  }>;
  quality_gate_recommended_robots_index?: boolean | null;
  quality_gate_publication_authorized?: boolean | null;
};

type FridgeOwnerBrowserProofV1 = {
  contract: typeof FRIDGE_SAFE_LINK_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1;
  slug: string;
  oem_part_token?: string;
  verdict?: string;
  read_only?: true;
  data_mutation?: false;
  csv_apply_authorized?: boolean;
  proven_facts?: string[];
};

type FridgeGswfOfficialBrowserProofV1 = {
  contract: typeof FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1;
  filter_slug: string;
  browser_truth_status?: string;
  captured_signals?: { classification?: string };
  read_only?: true;
  data_mutation?: false;
  proven_facts?: string[];
};

type FridgeApplyReadinessV1 = {
  contract: typeof FRIDGE_SAFE_LINK_APPLY_READINESS_CONTRACT_V1;
  target_slug: string;
  apply_readiness_verdict?: string;
  read_only?: true;
  data_mutation?: false;
};

type FridgeRescueBrowserEvidenceV1 = {
  contract: typeof FRIDGE_RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1;
  filter_slug: string;
  browser_truth_status?: string;
  captured_signals?: { classification?: string };
  read_only?: true;
  data_mutation?: false;
  csv_apply_authorized?: boolean;
  owner_review_ready?: boolean;
  apply_plan_proposal_ready?: boolean;
  blockers?: string[];
};

type FridgeBuyerPathPlanRowV1 = {
  slug: string;
  current_committed_buyer_path_status?: string;
  mutation_authorized?: boolean;
};

type FridgeOwnerReviewPacketV1 = {
  contract: string;
  family_reconciliation_severity?: string;
  owner_review_required?: boolean;
  command_center_action_scope?: string;
  read_only?: true;
  data_mutation?: false;
};

export type FridgeLoadedArtifactsV1 = {
  filter_slug: string;
  source_artifact_paths: string[];
  batch_factory_row: FridgeBatchFactoryRowV1 | null;
  audit_summary: {
    worst_classification: string;
    blockers: string[];
    has_proven_correct: boolean;
    has_noindex_review: boolean;
    has_indexable_no_buy_link: boolean;
  } | null;
  owner_browser_proof: FridgeOwnerBrowserProofV1 | null;
  gswf_official_browser_proof: FridgeGswfOfficialBrowserProofV1 | null;
  apply_readiness: FridgeApplyReadinessV1 | null;
  rescue_browser_evidence: FridgeRescueBrowserEvidenceV1 | null;
  buyer_path_plan_row: FridgeBuyerPathPlanRowV1 | null;
  owner_review_packet: FridgeOwnerReviewPacketV1 | null;
  blockers: string[];
  policy_apply_allowed: boolean;
};

export type FridgeCoverageFactoryProjectionV1 = {
  adapter_id: typeof FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1;
  schema_version: typeof COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1;
  read_only: true;
  data_mutation: false;
  subjects: CoverageSubjectV1[];
  evidence: CoverageEvidenceV1[];
  assessments: CoverageAssessmentV1[];
  work_items: CoverageWorkItemV1[];
  subject_links: CoverageSubjectLinkV1[];
  run_manifest: CoverageRunManifestV1;
  disposition_mappings: readonly FridgeCoverageDispositionMappingV1[];
  source_artifact_paths: string[];
};

export type FridgeProjectionReportRowV1 = {
  filter_slug: string;
  source_artifacts: string[];
  fridge_disposition: FridgeCoverageDispositionV1;
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

export type FridgeContractFitGapKindV1 =
  | "PROVEN_CONTRACT_GAP"
  | "ADAPTER_ONLY"
  | "LEGACY_DATA_ISSUE";

export type FridgeContractFitGapV1 = {
  kind: FridgeContractFitGapKindV1;
  topic: string;
  detail: string;
};

const AUDIT_CLASSIFICATION_RANK: Record<string, number> = {
  WRONG_PART_RISK: 5,
  BLOCKED: 4,
  LIKELY_CORRECT_NEEDS_EVIDENCE: 2,
  PROVEN_CORRECT: 1,
  UNKNOWN: 0,
};

function readReadOnlyJsonFile<T>(absolutePath: string): T | null {
  try {
    const raw = JSON.parse(readFileSync(absolutePath, "utf8")) as T & { data_mutation?: boolean };
    if (raw.data_mutation === true) return null;
    return raw;
  } catch {
    return null;
  }
}

function artifactHashRef(label: string, absolutePath: string): CoverageProvenanceRefV1 {
  const content = readFileSync(absolutePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return { kind: "artifact_path_hash", label, hash: `sha256:${hash}` };
}

export function mapFridgeDispositionToUcfV1(
  fridgeDisposition: FridgeCoverageDispositionV1,
): FridgeCoverageDispositionMappingV1 {
  const row = FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1.find(
    (entry) => entry.fridge_disposition === fridgeDisposition,
  );
  if (!row) {
    throw new Error(`Unknown refrigerator disposition: ${fridgeDisposition}`);
  }
  return row;
}

function aggregateAuditForFilter(
  modelRows: FridgeAuditModelRowV1[],
  filterSlug: string,
): FridgeLoadedArtifactsV1["audit_summary"] {
  const relevant = modelRows.filter((row) => row.mapped_filter_slugs.includes(filterSlug));
  if (relevant.length === 0) return null;

  let worst_classification = "UNKNOWN";
  let worst_rank = -1;
  const blockers: string[] = [];
  let has_proven_correct = false;
  let has_noindex_review = false;

  for (const row of relevant) {
    const rank = AUDIT_CLASSIFICATION_RANK[row.classification] ?? 0;
    if (rank > worst_rank) {
      worst_rank = rank;
      worst_classification = row.classification;
    }
    if (row.classification === "PROVEN_CORRECT") has_proven_correct = true;
    if (row.blockers) blockers.push(...row.blockers);
    const filterProof = row.per_filter_proof?.find((proof) => proof.filter_slug === filterSlug);
    if (filterProof?.proof_status === "WRONG_FAMILY_RISK") {
      worst_rank = Math.max(worst_rank, AUDIT_CLASSIFICATION_RANK.WRONG_PART_RISK);
      worst_classification = "WRONG_PART_RISK";
      blockers.push(`per_filter_proof:WRONG_FAMILY_RISK for ${filterSlug}`);
    }
    if (row.quality_gate_recommended_robots_index === false) has_noindex_review = true;
    if (row.quality_gate_publication_authorized === false) has_noindex_review = true;
  }

  return {
    worst_classification,
    blockers: Array.from(new Set(blockers)),
    has_proven_correct,
    has_noindex_review,
    has_indexable_no_buy_link: false,
  };
}

function findDraftArtifact(
  rootDir: string,
  filterSlug: string,
  filenameIncludes: string[],
): { relPath: string; absolutePath: string } | null {
  const dir = path.join(rootDir, FRIDGE_DRAFTS_DIR_REL_V1);
  const matches = readdirSync(dir).filter(
    (file) =>
      file.includes(filterSlug) &&
      filenameIncludes.every((part) => file.includes(part)) &&
      file.endsWith(".json"),
  );
  if (matches.length === 0) return null;
  const match = matches.sort().at(-1);
  if (!match) return null;
  return {
    relPath: path.join(FRIDGE_DRAFTS_DIR_REL_V1, match),
    absolutePath: path.join(dir, match),
  };
}

function mappingFitBlockedByAuditV1(loaded: FridgeLoadedArtifactsV1): boolean {
  return (
    loaded.audit_summary?.worst_classification === "WRONG_PART_RISK" ||
    loaded.batch_factory_row?.batch_factory_state === "DO_NOT_USE_WRONG_PART_RISK"
  );
}

export function resolveFridgeDispositionV1(loaded: FridgeLoadedArtifactsV1): FridgeCoverageDispositionV1 {
  const batchState = loaded.batch_factory_row?.batch_factory_state;

  if (batchState === "DO_NOT_USE_WRONG_PART_RISK") {
    return "DO_NOT_USE_WRONG_PART_RISK";
  }

  if (loaded.owner_browser_proof?.verdict === "PASS_BROWSER_PROOF") {
    return "APPLY_READY_AFTER_OWNER_BROWSER_PROOF";
  }

  if (
    loaded.rescue_browser_evidence?.browser_truth_status === "PASS" &&
    loaded.rescue_browser_evidence.captured_signals?.classification === "direct_buyable"
  ) {
    if (mappingFitBlockedByAuditV1(loaded)) {
      return "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED";
    }
    return "RESCUE_BROWSER_PROOF_READY";
  }

  if (loaded.audit_summary?.worst_classification === "WRONG_PART_RISK") {
    return "AUDIT_WRONG_PART_RISK";
  }

  if (loaded.audit_summary?.worst_classification === "BLOCKED") {
    return "AUDIT_BLOCKED";
  }

  if (
    loaded.gswf_official_browser_proof?.browser_truth_status === "PASS" &&
    loaded.gswf_official_browser_proof.captured_signals?.classification === "direct_buyable" &&
    batchState === "CONFLICT_REQUIRES_RECONCILIATION"
  ) {
    return "CONFLICT_REQUIRES_RECONCILIATION";
  }

  if (batchState === "CONFLICT_REQUIRES_RECONCILIATION") {
    return "CONFLICT_REQUIRES_RECONCILIATION";
  }

  if (batchState === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL") {
    return "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL";
  }

  if (batchState === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED") {
    return "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED";
  }

  if (batchState === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF") {
    return "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF";
  }

  if (
    loaded.buyer_path_plan_row?.current_committed_buyer_path_status === "SEARCH_PLACEHOLDER"
  ) {
    return "BUYER_PATH_SEARCH_PLACEHOLDER_PENDING";
  }

  if (loaded.apply_readiness?.apply_readiness_verdict === "READY_FOR_OWNER_BROWSER_PROOF") {
    return "READY_FOR_OWNER_BROWSER_PROOF";
  }

  if (
    loaded.owner_review_packet?.owner_review_required === true &&
    ["CRITICAL", "HIGH"].includes(loaded.owner_review_packet.family_reconciliation_severity ?? "")
  ) {
    return "FAMILY_RECONCILIATION_OWNER_REVIEW";
  }

  if (loaded.audit_summary?.has_noindex_review) {
    return "PUBLICATION_NOINDEX_REVIEW";
  }

  if (loaded.audit_summary?.has_proven_correct) {
    return "AUDIT_PROVEN_CORRECT";
  }

  if (loaded.audit_summary?.worst_classification === "LIKELY_CORRECT_NEEDS_EVIDENCE") {
    return "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE";
  }

  if (batchState === "APPLY_ELIGIBLE_WITH_EXISTING_PROOF") {
    return "APPLY_ELIGIBLE_WITH_EXISTING_PROOF";
  }

  return "AUDIT_LIKELY_CORRECT_NEEDS_EVIDENCE";
}

function blockersFromLoaded(loaded: FridgeLoadedArtifactsV1): string[] {
  const blockers: string[] = [...(loaded.audit_summary?.blockers ?? [])];

  if (loaded.batch_factory_row?.exact_blockers?.length) {
    blockers.push(...loaded.batch_factory_row.exact_blockers.slice(0, 3));
  }

  if (loaded.rescue_browser_evidence?.blockers?.length) {
    blockers.push(...loaded.rescue_browser_evidence.blockers);
  }

  const disposition = resolveFridgeDispositionV1(loaded);
  if (
    disposition === "APPLY_READY_AFTER_OWNER_BROWSER_PROOF" ||
    disposition === "RESCUE_BROWSER_PROOF_READY"
  ) {
    blockers.push("Founder approval required before any CSV apply from read-only UCF projection");
  }

  if (disposition === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED") {
    blockers.push(
      "Rescue buyer-path proof is ready; model-fit mapping safety remains blocked pending owner or mapping review",
    );
  }

  if (
    (disposition === "AUDIT_WRONG_PART_RISK" ||
      disposition === "DO_NOT_USE_WRONG_PART_RISK" ||
      disposition === "AUDIT_BLOCKED" ||
      disposition === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED") &&
    blockers.length === 0
  ) {
    blockers.push(`refrigerator disposition ${disposition} requires owner remediation`);
  }

  return Array.from(new Set(blockers));
}

function deriveEvidenceStatuses(
  loaded: FridgeLoadedArtifactsV1,
  mapping: FridgeCoverageDispositionMappingV1,
): Record<
  "identity" | "fit" | "buyer_path" | "demand" | "publication",
  CoverageEvidenceClaimStatusV1
> {
  const browserProven =
    loaded.owner_browser_proof?.verdict === "PASS_BROWSER_PROOF" ||
    loaded.rescue_browser_evidence?.browser_truth_status === "PASS" ||
    loaded.gswf_official_browser_proof?.browser_truth_status === "PASS";

  let identity: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.identity ?? "unknown";
  if (
    browserProven ||
    loaded.batch_factory_row?.oem_part_token ||
    loaded.audit_summary?.worst_classification
  ) {
    identity = "proven";
  }

  let fit: CoverageEvidenceClaimStatusV1 = mapping.evidence_dimension_hints.fit ?? "unknown";
  if (loaded.audit_summary?.worst_classification === "PROVEN_CORRECT") fit = "proven";
  if (
    loaded.audit_summary?.worst_classification === "WRONG_PART_RISK" ||
    loaded.batch_factory_row?.batch_factory_state === "DO_NOT_USE_WRONG_PART_RISK"
  ) {
    fit = "blocked";
  }

  let buyer_path: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.buyer_path ?? "unknown";
  if (
    loaded.owner_browser_proof?.verdict === "PASS_BROWSER_PROOF" ||
    (loaded.rescue_browser_evidence?.captured_signals?.classification === "direct_buyable" &&
      loaded.rescue_browser_evidence.browser_truth_status === "PASS")
  ) {
    buyer_path = "proven";
  } else if (loaded.buyer_path_plan_row?.current_committed_buyer_path_status === "SEARCH_PLACEHOLDER") {
    buyer_path = "unknown";
  } else if (
    loaded.batch_factory_row?.batch_factory_state === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED"
  ) {
    buyer_path = "blocked";
  }

  const publication: CoverageEvidenceClaimStatusV1 =
    mapping.evidence_dimension_hints.publication ??
    (loaded.audit_summary?.has_noindex_review ? "blocked" : "not_applicable");

  return {
    identity,
    fit,
    buyer_path,
    demand: "not_applicable",
    publication,
  };
}

function provenanceRefsFromLoaded(
  loaded: FridgeLoadedArtifactsV1,
  rootDir: string,
): CoverageProvenanceRefV1[] {
  const refs: CoverageProvenanceRefV1[] = [];
  for (const relPath of loaded.source_artifact_paths) {
    refs.push(artifactHashRef(relPath, path.join(rootDir, relPath)));
  }
  return refs;
}

function buildSubjectForFridgeFilter(loaded: FridgeLoadedArtifactsV1): CoverageSubjectV1 {
  const token =
    loaded.batch_factory_row?.oem_part_token ??
    loaded.owner_browser_proof?.oem_part_token ??
    loaded.rescue_browser_evidence?.filter_slug.toUpperCase() ??
    null;

  return {
    contract: COVERAGE_SUBJECT_CONTRACT_V1,
    subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      kind_segment: "filter",
      local_key: loaded.filter_slug,
    }),
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    kind: "replacement_part",
    internal_slug_labels: [loaded.filter_slug],
    official_model_token: null,
    official_replacement_token: token,
    official_replacement_name: null,
    read_only: true,
    data_mutation: false,
  };
}

function buildEvidenceForFridgeSubject(
  subject: CoverageSubjectV1,
  loaded: FridgeLoadedArtifactsV1,
  mapping: FridgeCoverageDispositionMappingV1,
  rootDir: string,
): CoverageEvidenceV1 {
  const statuses = deriveEvidenceStatuses(loaded, mapping);
  const refs = provenanceRefsFromLoaded(loaded, rootDir);

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

function buildAssessmentForFridgeSubject(
  subject: CoverageSubjectV1,
  loaded: FridgeLoadedArtifactsV1,
  mapping: FridgeCoverageDispositionMappingV1,
): CoverageAssessmentV1 {
  return {
    contract: COVERAGE_ASSESSMENT_CONTRACT_V1,
    subject_id: subject.subject_id,
    core_disposition: mapping.core_disposition,
    adapter_state: mapping.adapter_state,
    policy_apply_allowed: loaded.policy_apply_allowed,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
  };
}

function workItemActionForFridgeDisposition(
  disposition: FridgeCoverageDispositionV1,
): CoverageWorkItemActionClassV1 {
  if (
    disposition === "APPLY_READY_AFTER_OWNER_BROWSER_PROOF" ||
    disposition === "RESCUE_BROWSER_PROOF_READY" ||
    disposition === "AUDIT_PROVEN_CORRECT"
  ) {
    return "PLAN_CHANGE";
  }
  if (
    disposition === "CONFLICT_REQUIRES_RECONCILIATION" ||
    disposition === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL" ||
    disposition === "BAD_MAPPING_REMEDIATION_REQUIRED" ||
    disposition === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED"
  ) {
    return "MAPPING_REVIEW";
  }
  if (
    disposition === "AUDIT_WRONG_PART_RISK" ||
    disposition === "DO_NOT_USE_WRONG_PART_RISK" ||
    disposition === "AUDIT_BLOCKED" ||
    disposition === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED"
  ) {
    return "OWNER_REVIEW";
  }
  if (
    disposition === "FAMILY_RECONCILIATION_OWNER_REVIEW" ||
    disposition === "PUBLICATION_NOINDEX_REVIEW"
  ) {
    return "OWNER_REVIEW";
  }
  return "READ_ONLY_RESEARCH";
}

function buildWorkItemForFridgeSubject(
  subject: CoverageSubjectV1,
  loaded: FridgeLoadedArtifactsV1,
  disposition: FridgeCoverageDispositionV1,
): CoverageWorkItemV1 {
  return {
    contract: COVERAGE_WORK_ITEM_CONTRACT_V1,
    work_item_id: `fridge-ucf-${subject.internal_slug_labels[0]}`,
    subject_ids: [subject.subject_id],
    required_evidence_checks: [...DEFAULT_COVERAGE_EVIDENCE_REQUIREMENTS_V1.promotion_dimensions],
    permitted_action_class: workItemActionForFridgeDisposition(disposition),
    requires_owner_review:
      disposition === "APPLY_READY_AFTER_OWNER_BROWSER_PROOF" ||
      disposition === "RESCUE_BROWSER_PROOF_READY" ||
      disposition === "RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED" ||
      disposition === "FAMILY_RECONCILIATION_OWNER_REVIEW",
    priority_score:
      disposition === "APPLY_READY_AFTER_OWNER_BROWSER_PROOF" ||
      disposition === "RESCUE_BROWSER_PROOF_READY"
        ? 100
        : 10,
    blockers: loaded.blockers,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    production_mutation_authorized: false,
    artifact_write_authorized: false,
  };
}

function buildSubjectLinksForFridge(
  filterSubject: CoverageSubjectV1,
  auditModelRows: FridgeAuditModelRowV1[],
  filterSlug: string,
): CoverageSubjectLinkV1[] {
  const modelSlugs = auditModelRows
    .filter((row) => row.mapped_filter_slugs.includes(filterSlug))
    .map((row) => row.fridge_slug)
    .slice(0, 5);

  return modelSlugs.map((modelSlug) => ({
    contract: COVERAGE_SUBJECT_LINK_CONTRACT_V1,
    from_subject_id: buildCoverageSubjectIdV1({
      wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      kind_segment: "model",
      local_key: modelSlug,
    }),
    to_subject_id: filterSubject.subject_id,
    link_kind: "fits",
    read_only: true,
    data_mutation: false,
  }));
}

let cachedAuditModelRows: FridgeAuditModelRowV1[] | null = null;

function loadAuditModelRows(rootDir: string): FridgeAuditModelRowV1[] {
  if (cachedAuditModelRows) return cachedAuditModelRows;
  const audit = readReadOnlyJsonFile<{ model_rows?: FridgeAuditModelRowV1[] }>(
    path.join(rootDir, FRIDGE_MODEL_FILTER_AUDIT_REL_V1),
  );
  cachedAuditModelRows = audit?.model_rows ?? [];
  return cachedAuditModelRows;
}

export function loadFridgeArtifactsForFilterSlugV1(
  rootDir: string,
  filterSlug: string,
): FridgeLoadedArtifactsV1 {
  const source_artifact_paths: string[] = [];
  let batch_factory_row: FridgeBatchFactoryRowV1 | null = null;
  let owner_browser_proof: FridgeOwnerBrowserProofV1 | null = null;
  let gswf_official_browser_proof: FridgeGswfOfficialBrowserProofV1 | null = null;
  let apply_readiness: FridgeApplyReadinessV1 | null = null;
  let rescue_browser_evidence: FridgeRescueBrowserEvidenceV1 | null = null;
  let buyer_path_plan_row: FridgeBuyerPathPlanRowV1 | null = null;
  let owner_review_packet: FridgeOwnerReviewPacketV1 | null = null;

  const batchFactory = readReadOnlyJsonFile<{
    contract: string;
    rows?: FridgeBatchFactoryRowV1[];
  }>(path.join(rootDir, FRIDGE_SAFE_LINK_BATCH_FACTORY_REL_V1));
  if (batchFactory?.contract === FRIDGE_SAFE_LINK_BATCH_FACTORY_CONTRACT_V1 && batchFactory.rows) {
    const matches = batchFactory.rows.filter((row) => row.slug === filterSlug);
    if (matches.length > 0) {
      batch_factory_row = matches[matches.length - 1];
      if (!source_artifact_paths.includes(FRIDGE_SAFE_LINK_BATCH_FACTORY_REL_V1)) {
        source_artifact_paths.push(FRIDGE_SAFE_LINK_BATCH_FACTORY_REL_V1);
      }
    }
  }

  const auditModelRows = loadAuditModelRows(rootDir);
  const audit_summary = aggregateAuditForFilter(auditModelRows, filterSlug);
  if (audit_summary) {
    if (!source_artifact_paths.includes(FRIDGE_MODEL_FILTER_AUDIT_REL_V1)) {
      source_artifact_paths.push(FRIDGE_MODEL_FILTER_AUDIT_REL_V1);
    }
  }

  const browserProofFile = findDraftArtifact(rootDir, filterSlug, [
    "fridge-safe-link-owner-browser-proof-result",
  ]);
  if (browserProofFile) {
    const raw = readReadOnlyJsonFile<FridgeOwnerBrowserProofV1>(browserProofFile.absolutePath);
    if (raw?.contract === FRIDGE_SAFE_LINK_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
      owner_browser_proof = raw;
      source_artifact_paths.push(browserProofFile.relPath);
    }
  }

  if (filterSlug === "gswf") {
    const gswfRel = path.join(
      FRIDGE_DRAFTS_DIR_REL_V1,
      "fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json",
    );
    const raw = readReadOnlyJsonFile<FridgeGswfOfficialBrowserProofV1>(
      path.join(rootDir, gswfRel),
    );
    if (raw?.contract === FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_OWNER_BROWSER_PROOF_CONTRACT_V1) {
      gswf_official_browser_proof = raw;
      source_artifact_paths.push(gswfRel);
    }

    const readinessRel = path.join(
      FRIDGE_DRAFTS_DIR_REL_V1,
      "fridge-safe-link-gswf-apply-readiness-v1.json",
    );
    const readiness = readReadOnlyJsonFile<FridgeApplyReadinessV1>(path.join(rootDir, readinessRel));
    if (readiness?.contract === FRIDGE_SAFE_LINK_APPLY_READINESS_CONTRACT_V1) {
      apply_readiness = readiness;
      source_artifact_paths.push(readinessRel);
    }
  }

  if (filterSlug === "rpwfe") {
    const raw = readReadOnlyJsonFile<FridgeRescueBrowserEvidenceV1>(
      path.join(rootDir, FRIDGE_RPWFE_BROWSER_EVIDENCE_REL_V1),
    );
    if (raw?.contract === FRIDGE_RPWFE_OFFICIAL_GE_BROWSER_EVIDENCE_CONTRACT_V1) {
      rescue_browser_evidence = raw;
      source_artifact_paths.push(FRIDGE_RPWFE_BROWSER_EVIDENCE_REL_V1);
    }
  }

  const buyerPathPlan = readReadOnlyJsonFile<{
    contract: string;
    planned_changes?: FridgeBuyerPathPlanRowV1[];
  }>(path.join(rootDir, FRIDGE_BUYER_PATH_APPLY_PLAN_REL_V1));
  if (buyerPathPlan?.contract === FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_CONTRACT_V1) {
    const row = buyerPathPlan.planned_changes?.find((entry) => entry.slug === filterSlug);
    if (row) {
      buyer_path_plan_row = row;
      if (!source_artifact_paths.includes(FRIDGE_BUYER_PATH_APPLY_PLAN_REL_V1)) {
        source_artifact_paths.push(FRIDGE_BUYER_PATH_APPLY_PLAN_REL_V1);
      }
    }
  }

  const ownerReviewFile = findDraftArtifact(rootDir, filterSlug, ["owner-review-packet"]);
  if (ownerReviewFile) {
    const raw = readReadOnlyJsonFile<FridgeOwnerReviewPacketV1>(ownerReviewFile.absolutePath);
    if (raw?.contract?.includes("owner_review_packet")) {
      owner_review_packet = raw;
      source_artifact_paths.push(ownerReviewFile.relPath);
    }
  }

  const policy_apply_allowed =
    owner_browser_proof?.csv_apply_authorized === true ||
    rescue_browser_evidence?.csv_apply_authorized === true;

  const loaded: FridgeLoadedArtifactsV1 = {
    filter_slug: filterSlug,
    source_artifact_paths,
    batch_factory_row,
    audit_summary,
    owner_browser_proof,
    gswf_official_browser_proof,
    apply_readiness,
    rescue_browser_evidence,
    buyer_path_plan_row,
    owner_review_packet,
    blockers: [],
    policy_apply_allowed,
  };
  loaded.blockers = blockersFromLoaded(loaded);
  return loaded;
}

export function projectFridgeLoadedArtifactsV1(
  loaded: FridgeLoadedArtifactsV1,
  rootDir: string,
  auditModelRows: FridgeAuditModelRowV1[],
): Omit<
  FridgeCoverageFactoryProjectionV1,
  "run_manifest" | "disposition_mappings" | "source_artifact_paths"
> {
  if (loaded.source_artifact_paths.length === 0) {
    throw new Error(`No committed refrigerator artifacts found for ${loaded.filter_slug}`);
  }

  const fridgeDisposition = resolveFridgeDispositionV1(loaded);
  const mapping = mapFridgeDispositionToUcfV1(fridgeDisposition);
  const subject = buildSubjectForFridgeFilter(loaded);

  return {
    adapter_id: FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects: [subject],
    evidence: [buildEvidenceForFridgeSubject(subject, loaded, mapping, rootDir)],
    assessments: [buildAssessmentForFridgeSubject(subject, loaded, mapping)],
    work_items: [buildWorkItemForFridgeSubject(subject, loaded, fridgeDisposition)],
    subject_links: buildSubjectLinksForFridge(subject, auditModelRows, loaded.filter_slug),
  };
}

export function buildFridgeCoverageFactoryReferenceProjectionV1(args: {
  rootDir: string;
  filterSlugs: string[];
  now?: () => Date;
}): FridgeCoverageFactoryProjectionV1 {
  const now = args.now ?? (() => new Date());
  const subjects: CoverageSubjectV1[] = [];
  const evidence: CoverageEvidenceV1[] = [];
  const assessments: CoverageAssessmentV1[] = [];
  const work_items: CoverageWorkItemV1[] = [];
  const subject_links: CoverageSubjectLinkV1[] = [];
  const source_artifact_paths: string[] = [];
  const assessment_counts: Record<string, number> = {};
  const auditModelRows = loadAuditModelRows(args.rootDir);

  for (const filterSlug of args.filterSlugs) {
    const loaded = loadFridgeArtifactsForFilterSlugV1(args.rootDir, filterSlug);
    const partial = projectFridgeLoadedArtifactsV1(loaded, args.rootDir, auditModelRows);

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
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1,
    run_id: `fridge-ucf-reference-${now().toISOString().slice(0, 10)}`,
    adapter_id: FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
    adapter_version: "1.0.0",
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
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
    adapter_id: FRIDGE_COVERAGE_FACTORY_ADAPTER_ID_V1,
    schema_version: COVERAGE_FACTORY_SCHEMA_VERSION_FRIDGE_ADAPTER_V1,
    read_only: true,
    data_mutation: false,
    subjects,
    evidence,
    assessments,
    work_items,
    subject_links,
    run_manifest,
    disposition_mappings: FRIDGE_COVERAGE_DISPOSITION_MAPPING_TABLE_V1,
    source_artifact_paths,
  };
}

export function buildFridgeProjectionReportV1(
  projection: FridgeCoverageFactoryProjectionV1,
  rootDir?: string,
): FridgeProjectionReportRowV1[] {
  return projection.subjects.map((subject, index) => {
    const assessment = projection.assessments[index];
    const evidence = projection.evidence[index];
    const fridgeDisposition = projection.disposition_mappings.find(
      (row) => row.adapter_state === assessment.adapter_state,
    )?.fridge_disposition;

    if (!fridgeDisposition) {
      throw new Error(`Missing refrigerator disposition for adapter_state ${assessment.adapter_state}`);
    }
    if (!assessment.adapter_state) {
      throw new Error(`Missing adapter_state for subject ${subject.subject_id}`);
    }

    const source_artifacts =
      rootDir !== undefined
        ? loadFridgeArtifactsForFilterSlugV1(rootDir, subject.internal_slug_labels[0])
            .source_artifact_paths
        : projection.source_artifact_paths.filter((artifactPath) =>
            artifactPath.includes(subject.internal_slug_labels[0]),
          );

    return {
      filter_slug: subject.internal_slug_labels[0],
      source_artifacts,
      fridge_disposition: fridgeDisposition,
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

export function assessFridgeContractFitV1(): FridgeContractFitGapV1[] {
  return [
    {
      kind: "ADAPTER_ONLY",
      topic: "multi_lane_artifact_composition",
      detail:
        "Refrigerator truth spans safe-link batch factory, model-filter audit, owner browser proof, buyer-path apply plans, and rescue evidence; the adapter merges them without new UCF contract types.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "fridge_lane_vocabulary",
      detail:
        "Refrigerator labels (APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF, CONFLICT_REQUIRES_RECONCILIATION, AUDIT_WRONG_PART_RISK, etc.) are preserved in adapter_state while mapping to core UCF dispositions.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "audit_model_row_aggregation",
      detail:
        "model_filter_correctness_audit_v1 model_rows are aggregated per filter_slug worst-classification; no filter-level audit contract row type is required.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "model_subject_links",
      detail:
        "Audit model_rows provide fits links from refrigerator model subjects to filter subjects; capped at five models per filter in reference projection.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "publication_quality_gates",
      detail:
        "Page-factory quality gates are model-centric; adapter surfaces publication hints via audit quality_gate fields on mapped model_rows.",
    },
    {
      kind: "ADAPTER_ONLY",
      topic: "rescue_evidence_precedence",
      detail:
        "Read-only rescue browser evidence (rpwfe-official-ge-browser-evidence-v1) preserves buyer-path proof when direct_buyable, but WRONG_PART_RISK audit aggregate routes to RESCUE_BROWSER_PROOF_READY_MAPPING_BLOCKED instead of planning-ready.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "rpwfe_apply_run_mutation_artifact",
      detail:
        "rpwfe-official-ge-retailer-links-apply-run-v1.json has data_mutation=true; adapter uses read-only browser evidence only and excludes apply-run artifacts.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "batch_factory_duplicate_rows",
      detail:
        "fridge-safe-link-batch-factory-v1.json may contain duplicate slug rows; adapter uses the last committed row for disposition resolution.",
    },
    {
      kind: "LEGACY_DATA_ISSUE",
      topic: "buyer_path_execution_plan_preview",
      detail:
        "apply-execution-plans contain not-applied browser_truth previews; adapter uses read-only apply-plan proposal rows only.",
    },
  ];
}

export function fridgeCoverageDispositionMeaningPreservedV1(args: {
  fridgeDisposition: FridgeCoverageDispositionV1;
  assessment: CoverageAssessmentV1;
}): boolean {
  const mapping = mapFridgeDispositionToUcfV1(args.fridgeDisposition);
  return (
    args.assessment.core_disposition === mapping.core_disposition &&
    args.assessment.adapter_state === mapping.adapter_state
  );
}

/** Reset cached audit rows (test isolation). */
export function resetFridgeAdapterAuditCacheV1(): void {
  cachedAuditModelRows = null;
}
