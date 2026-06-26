/**
 * Read-only BuckParts MCP truth lookup — replacement fit + safe buyer path.
 * Repo CSV + committed audit JSON only. No Supabase, no mutation, no broad search.
 */

import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

import {
  type BuckPartsMcpDepsV1,
  type BuckPartsMcpReplacementFitStatusV1,
  type BuckPartsMcpResolutionKindV1,
  type BuckPartsMcpSafeBuyerPathStatusV1,
  collapseSafeBuyerPathStatus,
  createBuckPartsMcpTruthContextV1,
  deriveDisposition,
  deriveReplacementFitStatus,
  getCensusRowForFilter,
  pickProvenFilterSlug,
  resolveExactToken,
  uniqueSorted,
  type BuckPartsMcpTruthContextV1,
} from "./buckparts-mcp-truth-context-v1";
import type {
  ModelFilterCorrectnessClassificationV1,
  ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import type { SafeBuyerPathPageClassificationV1 } from "./all-product-safe-buyer-path-census-v1";

export const BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1 =
  "buckparts_mcp_check_replacement_fit_v1" as const;

export type {
  BuckPartsMcpReplacementFitStatusV1,
  BuckPartsMcpResolutionKindV1,
  BuckPartsMcpSafeBuyerPathStatusV1,
};

export type CheckReplacementFitResultV1 = {
  contract: typeof BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  query: string;
  resolution: BuckPartsMcpResolutionKindV1;
  matched_slug: string | "UNKNOWN";
  wedge: import("@/lib/catalog/identity").HomekeepWedgeCatalog | "UNKNOWN";
  replacement_fit_status: BuckPartsMcpReplacementFitStatusV1;
  disposition: CoverageAssessmentDispositionV1 | "UNKNOWN";
  safe_buyer_path_status: BuckPartsMcpSafeBuyerPathStatusV1;
  evidence_paths: string[];
  safe_buyer_path_detail: SafeBuyerPathPageClassificationV1 | "UNKNOWN";
  fit_audit_classification: ModelFilterCorrectnessClassificationV1 | "UNKNOWN";
  mapped_filter_slugs: string[];
  repo_paths_read: string[];
  truth_note: string;
};

export type CheckReplacementFitDepsV1 = BuckPartsMcpDepsV1;

function unknownResult(query: string, note: string, repo_paths_read: string[]): CheckReplacementFitResultV1 {
  return {
    contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    query,
    resolution: "UNKNOWN",
    matched_slug: "UNKNOWN",
    wedge: "UNKNOWN",
    replacement_fit_status: "UNKNOWN",
    disposition: "UNKNOWN",
    safe_buyer_path_status: "UNKNOWN",
    evidence_paths: [],
    safe_buyer_path_detail: "UNKNOWN",
    fit_audit_classification: "UNKNOWN",
    mapped_filter_slugs: [],
    repo_paths_read,
    truth_note: note,
  };
}

export function checkReplacementFitFromContextV1(
  ctx: BuckPartsMcpTruthContextV1,
  modelOrPart: string,
): CheckReplacementFitResultV1 {
  const query = modelOrPart.trim();
  const resolved = resolveExactToken(ctx, query);
  if (!resolved) {
    return unknownResult(
      query,
      "No exact slug or unambiguous OEM/model-number match in committed repo CSV inventory. BuckParts returns UNKNOWN — no inferred fit.",
      ctx.repo_paths_read,
    );
  }

  if (resolved.kind === "filter") {
    const censusRow = getCensusRowForFilter(ctx, resolved.wedge, resolved.slug);
    const safeDetail = censusRow?.page_classification;
    const safeStatus = collapseSafeBuyerPathStatus(safeDetail);
    const evidence_paths = uniqueSorted(censusRow?.evidence_files ?? []);
    const disposition = deriveDisposition({
      replacement_fit_status: "UNKNOWN",
      safe_buyer_path_status: safeStatus,
      resolution: "filter",
    });

    return {
      contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      query,
      resolution: "filter",
      matched_slug: resolved.slug,
      wedge: resolved.wedge,
      replacement_fit_status: "UNKNOWN",
      disposition,
      safe_buyer_path_status: safeStatus,
      evidence_paths,
      safe_buyer_path_detail: safeDetail ?? "UNKNOWN",
      fit_audit_classification: "UNKNOWN",
      mapped_filter_slugs: [],
      repo_paths_read: ctx.repo_paths_read,
      truth_note:
        "Filter/part identity resolved from committed catalog CSV. Model→part fit is UNKNOWN unless proven by model-first audit evidence. Safe buyer path follows repo CSV + trust gates only.",
    };
  }

  const compat = ctx.compatByModelSlug.get(resolved.slug);
  const mapped_filter_slugs = uniqueSorted(compat?.edges.map((e) => e.filter_slug) ?? []);

  let audit: ModelFilterCorrectnessRowV1 | undefined;
  if (resolved.wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    audit = ctx.fridgeAuditByModelSlug.get(resolved.slug);
  }

  const provenFilterSlug = pickProvenFilterSlug(audit);
  const replacement_fit_status = deriveReplacementFitStatus({
    resolution: "model",
    wedge: resolved.wedge,
    auditClassification: audit?.classification,
    provenFilterSlug,
  });

  const primaryFilterSlug = provenFilterSlug ?? mapped_filter_slugs[0];
  const censusRow = primaryFilterSlug
    ? getCensusRowForFilter(ctx, resolved.wedge, primaryFilterSlug)
    : undefined;
  const safeDetail = censusRow?.page_classification;
  const safeStatus = collapseSafeBuyerPathStatus(safeDetail);

  const evidence_paths = uniqueSorted([
    ...(audit?.evidence_paths ?? []),
    ...(censusRow?.evidence_files ?? []),
  ]);

  const disposition = deriveDisposition({
    replacement_fit_status,
    safe_buyer_path_status: safeStatus,
    auditClassification: audit?.classification,
    resolution: "model",
  });

  const matched_slug = replacement_fit_status === "PROVEN" && provenFilterSlug ? provenFilterSlug : "UNKNOWN";

  let truth_note: string;
  if (resolved.wedge !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    truth_note =
      "Appliance model found in committed CSV. Replacement fit is UNKNOWN — no wedge-specific model-first fit audit artifact in repo. CSV compat rows are not promoted to fit claims.";
  } else if (replacement_fit_status === "PROVEN" && provenFilterSlug) {
    truth_note = `Refrigerator model fit PROVEN via committed model-filter-correctness audit for filter ${provenFilterSlug}. Safe buyer path is separate — check safe_buyer_path_status.`;
  } else if (replacement_fit_status === "SUPPRESSED" && audit) {
    truth_note = `Refrigerator compat mapping exists but fit is not proven (${audit.classification}). matched_slug remains UNKNOWN per BuckParts Truth Contract.`;
  } else {
    truth_note =
      "Refrigerator model in catalog without PROVEN_CORRECT audit classification. matched_slug is UNKNOWN — no unsafe fit claim.";
  }

  return {
    contract: BUCKPARTS_MCP_CHECK_REPLACEMENT_FIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    query,
    resolution: "model",
    matched_slug,
    wedge: resolved.wedge,
    replacement_fit_status,
    disposition,
    safe_buyer_path_status: safeStatus,
    evidence_paths,
    safe_buyer_path_detail: safeDetail ?? "UNKNOWN",
    fit_audit_classification: audit?.classification ?? "UNKNOWN",
    mapped_filter_slugs,
    repo_paths_read: ctx.repo_paths_read,
    truth_note,
  };
}

export function checkReplacementFitV1(
  deps: CheckReplacementFitDepsV1,
  modelOrPart: string,
): CheckReplacementFitResultV1 {
  const ctx = createBuckPartsMcpTruthContextV1(deps);
  return checkReplacementFitFromContextV1(ctx, modelOrPart);
}
