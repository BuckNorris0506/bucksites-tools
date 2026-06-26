/**
 * BuckParts Truth MCP v2 — canonical read-only tool surface.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import type { CoverageAssessmentDispositionV1 } from "@/lib/coverage-factory/coverage-assessment-v1";

import {
  AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1,
  loadApRepoRuntimeConvergenceAcceptanceV1,
} from "./ap-repo-runtime-convergence-acceptance-v1";
import type { CheckReplacementFitResultV1 } from "./buckparts-mcp-check-replacement-fit-v1";
import { checkReplacementFitFromContextV1 } from "./buckparts-mcp-check-replacement-fit-v1";
import {
  BUCKPARTS_MCP_TRUTH_CONTEXT_CONTRACT_V1,
  type BuckPartsMcpDepsV1,
  type BuckPartsMcpReplacementFitStatusV1,
  type BuckPartsMcpSafeBuyerPathStatusV1,
  collapseSafeBuyerPathStatus,
  countSafeGatedRetailerRows,
  createBuckPartsMcpTruthContextV1,
  deriveDisposition,
  filterCensusKey,
  getCensusRowForFilter,
  getFilterRow,
  pickProvenFilterSlug,
  resolveFilterByExactSlug,
  resolveModelByExactSlug,
  summarizePrimaryRetailer,
  uniqueSorted,
  type BuckPartsMcpTruthContextV1,
} from "./buckparts-mcp-truth-context-v1";
import { normalizeSearchCompact } from "@/lib/search/normalize";
import type {
  FilterProofStatusV1,
  ModelFilterCorrectnessClassificationV1,
} from "./model-filter-correctness-audit-v1";

export const BUCKPARTS_MCP_TOOLS_CONTRACT_V2 = "buckparts_mcp_tools_v2" as const;

export const AP_REPO_RUNTIME_CONVERGENCE_CLOSE_PACKET_REL_V1 =
  "data/air-purifier/batch-production/audits/ap-repo-runtime-convergence-close-packet-v1.json" as const;

const TRUTH_POLICY_DOC_PATHS = [
  "docs/BuckParts-CONSTITUTION.md",
  "docs/BuckParts-PRODUCT-ADDITION-MODEL-FIRST-CONTRACT.md",
  "docs/BuckParts-TRUTH-MAP.md",
] as const;

export type McpToolEnvelopeV2 = {
  contract: typeof BUCKPARTS_MCP_TOOLS_CONTRACT_V2;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
};

export type GetFilterResultV2 = McpToolEnvelopeV2 & {
  filter_slug: string;
  wedge: HomekeepWedgeCatalog | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  identity: {
    brand_slug: string | "UNKNOWN";
    name: string | "UNKNOWN";
    oem_part_number: string | "UNKNOWN";
    public_route: string | "UNKNOWN";
  };
  aliases: string[];
  replacement_interval_months: number | "UNKNOWN";
  compatible_model_count: number;
  safe_buyer_path_status: BuckPartsMcpSafeBuyerPathStatusV1;
  safe_buyer_path_detail: string | "UNKNOWN";
  disposition: CoverageAssessmentDispositionV1 | "UNKNOWN";
  evidence_paths: string[];
  repo_paths_read: string[];
  truth_note: string;
};

export type ModelCompatibleFilterV2 = {
  filter_slug: string;
  is_recommended: boolean | "UNKNOWN";
  fit_status: BuckPartsMcpReplacementFitStatusV1;
  proof_status: FilterProofStatusV1 | "UNKNOWN";
  oem_part_number: string | "UNKNOWN";
};

export type GetModelResultV2 = McpToolEnvelopeV2 & {
  model_slug: string;
  wedge: HomekeepWedgeCatalog | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  model_number: string | "UNKNOWN";
  title: string | "UNKNOWN";
  compatible_filters: ModelCompatibleFilterV2[];
  fit_confidence: "PROVEN" | "SUPPRESSED" | "UNKNOWN";
  fit_audit_classification: ModelFilterCorrectnessClassificationV1 | "UNKNOWN";
  evidence_paths: string[];
  repo_paths_read: string[];
  truth_note: string;
};

export type SearchPartsMatchV2 = {
  rank: number;
  match_kind: "filter_slug" | "model_slug" | "alias_exact" | "oem_exact" | "model_number_exact";
  wedge: HomekeepWedgeCatalog;
  slug: string;
  entity: "filter" | "model";
  label: string;
};

export type SearchPartsResultV2 = McpToolEnvelopeV2 & {
  query: string;
  matches: SearchPartsMatchV2[];
  repo_paths_read: string[];
  truth_note: string;
};

export type GetSafeBuyerPathResultV2 = McpToolEnvelopeV2 & {
  filter_slug: string;
  wedge: HomekeepWedgeCatalog | "UNKNOWN";
  truth_status: "PROVEN" | "UNKNOWN";
  safe_buyer_path_status: BuckPartsMcpSafeBuyerPathStatusV1;
  safe_buyer_path_detail: string | "UNKNOWN";
  primary_retailer: ReturnType<typeof summarizePrimaryRetailer>;
  safe_gated_row_count: number;
  total_retailer_row_count: number;
  evidence_paths: string[];
  owner_approval_required: boolean | "UNKNOWN";
  recommended_next_safe_action: string | "UNKNOWN";
  repo_paths_read: string[];
  truth_note: string;
};

export type GetCoverageMetricsResultV2 = McpToolEnvelopeV2 & {
  generated_at: string;
  wedge_coverage: Array<{
    wedge: HomekeepWedgeCatalog;
    product_page_count: number;
    safe_buyer_path_proven_count: number;
    suppressed_trust_count: number;
    noindex_unproven_count: number;
    unknown_count: number;
    csv_inventory_source: string;
  }>;
  classification_counts: Record<string, number>;
  repo_runtime_parity: {
    supabase_measurement_available: false;
    census_csv_vs_supabase: "UNKNOWN";
    air_purifier_convergence: {
      gate_state: string | "UNKNOWN";
      gap_size: number | "UNKNOWN";
      csv_safe_direct_buyable_count: number | "UNKNOWN";
      supabase_safe_direct_buyable_count: number | "UNKNOWN";
      artifact_paths: string[];
      measured_at: string | "UNKNOWN";
    };
  };
  census_summary: {
    total_products: number;
    proven_facts: string[];
    unknown_facts: string[];
    recommended_next_action: string;
  };
  repo_paths_read: string[];
  truth_note: string;
};

export type GetTruthPolicyResultV2 = McpToolEnvelopeV2 & {
  policy_name: "BuckParts Truth Contract";
  governing_documents: Array<{ path: string; status: "available" | "missing" }>;
  core_principles: string[];
  unknown_behavior: string[];
  mcp_guardrails: string[];
  repo_paths_read: string[];
};

function envelope(): McpToolEnvelopeV2 {
  return {
    contract: BUCKPARTS_MCP_TOOLS_CONTRACT_V2,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
  };
}

function getContext(deps: BuckPartsMcpDepsV1): BuckPartsMcpTruthContextV1 {
  return createBuckPartsMcpTruthContextV1(deps);
}

function mapProofToFitStatus(
  proof: FilterProofStatusV1 | undefined,
  auditClassification?: ModelFilterCorrectnessClassificationV1,
): BuckPartsMcpReplacementFitStatusV1 {
  if (proof === "PROVEN_ALIGNED") return "PROVEN";
  if (
    proof === "WRONG_FAMILY_RISK" ||
    auditClassification === "WRONG_PART_RISK" ||
    auditClassification === "BLOCKED"
  ) {
    return "SUPPRESSED";
  }
  if (proof === "NEEDS_EVIDENCE" || proof === "MISSING_CATALOG_ROW") return "UNKNOWN";
  return "UNKNOWN";
}

export function checkReplacementFitV1(
  deps: BuckPartsMcpDepsV1,
  modelOrPart: string,
): CheckReplacementFitResultV1 {
  const ctx = getContext(deps);
  return checkReplacementFitFromContextV1(ctx, modelOrPart);
}

export function getFilterV2(deps: BuckPartsMcpDepsV1, filterSlug: string): GetFilterResultV2 {
  const ctx = getContext(deps);
  const resolved = resolveFilterByExactSlug(ctx, filterSlug);
  if (!resolved) {
    return {
      ...envelope(),
      filter_slug: filterSlug.trim(),
      wedge: "UNKNOWN",
      truth_status: "UNKNOWN",
      identity: {
        brand_slug: "UNKNOWN",
        name: "UNKNOWN",
        oem_part_number: "UNKNOWN",
        public_route: "UNKNOWN",
      },
      aliases: [],
      replacement_interval_months: "UNKNOWN",
      compatible_model_count: 0,
      safe_buyer_path_status: "UNKNOWN",
      safe_buyer_path_detail: "UNKNOWN",
      disposition: "UNKNOWN",
      evidence_paths: [],
      repo_paths_read: ctx.repo_paths_read,
      truth_note: "Exact filter slug not found in committed catalog CSV. UNKNOWN — no inferred identity.",
    };
  }

  const { wedge, slug, row } = resolved;
  const key = filterCensusKey(wedge, slug);
  const censusRow = getCensusRowForFilter(ctx, wedge, slug);
  const safeStatus = collapseSafeBuyerPathStatus(censusRow?.page_classification);
  const disposition = deriveDisposition({
    replacement_fit_status: "UNKNOWN",
    safe_buyer_path_status: safeStatus,
    resolution: "filter",
  });

  return {
    ...envelope(),
    filter_slug: slug,
    wedge,
    truth_status: "PROVEN",
    identity: {
      brand_slug: row.brand_slug || "UNKNOWN",
      name: row.name || "UNKNOWN",
      oem_part_number: row.oem_part_number || "UNKNOWN",
      public_route: censusRow?.public_route ?? "UNKNOWN",
    },
    aliases: ctx.aliasesByFilterKey.get(key) ?? [],
    replacement_interval_months: row.replacement_interval_months,
    compatible_model_count: ctx.modelCountByFilterSlug.get(key) ?? 0,
    safe_buyer_path_status: safeStatus,
    safe_buyer_path_detail: censusRow?.page_classification ?? "UNKNOWN",
    disposition,
    evidence_paths: uniqueSorted(censusRow?.evidence_files ?? []),
    repo_paths_read: ctx.repo_paths_read,
    truth_note:
      "Filter identity PROVEN from committed catalog CSV. Model→part fit claims require getModel or checkReplacementFit — not inferred here.",
  };
}

export function getModelV2(deps: BuckPartsMcpDepsV1, modelSlug: string): GetModelResultV2 {
  const ctx = getContext(deps);
  const resolved = resolveModelByExactSlug(ctx, modelSlug);
  if (!resolved) {
    return {
      ...envelope(),
      model_slug: modelSlug.trim(),
      wedge: "UNKNOWN",
      truth_status: "UNKNOWN",
      model_number: "UNKNOWN",
      title: "UNKNOWN",
      compatible_filters: [],
      fit_confidence: "UNKNOWN",
      fit_audit_classification: "UNKNOWN",
      evidence_paths: [],
      repo_paths_read: ctx.repo_paths_read,
      truth_note: "Exact model slug not found in committed catalog CSV. UNKNOWN — no inferred fit.",
    };
  }

  const { wedge, slug, row } = resolved;
  const compat = ctx.compatByModelSlug.get(slug);
  const audit =
    wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water
      ? ctx.fridgeAuditByModelSlug.get(slug)
      : undefined;

  const compatible_filters: ModelCompatibleFilterV2[] = (compat?.edges ?? []).map((edge) => {
    const filterRow = getFilterRow(ctx, wedge, edge.filter_slug);
    const proof = audit?.per_filter_proof.find((p) => p.filter_slug === edge.filter_slug);
    return {
      filter_slug: edge.filter_slug,
      is_recommended: edge.is_recommended,
      fit_status: mapProofToFitStatus(proof?.proof_status, audit?.classification),
      proof_status: proof?.proof_status ?? "UNKNOWN",
      oem_part_number: filterRow?.oem_part_number ?? proof?.oem_part_number ?? "UNKNOWN",
    };
  });

  const provenFilter = pickProvenFilterSlug(audit);
  const fit_confidence: "PROVEN" | "SUPPRESSED" | "UNKNOWN" =
    audit?.classification === "PROVEN_CORRECT" && provenFilter
      ? "PROVEN"
      : audit && audit.classification !== "PROVEN_CORRECT" && audit.classification !== "UNKNOWN"
        ? "SUPPRESSED"
        : "UNKNOWN";

  let truth_note: string;
  if (wedge !== HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    truth_note =
      "Model identity PROVEN from committed CSV. Compatible filters listed from repo mappings only — fit_confidence UNKNOWN until wedge-specific model-first audit exists.";
  } else if (fit_confidence === "PROVEN") {
    truth_note = `Refrigerator fit PROVEN via model-filter-correctness audit. Proven filter: ${provenFilter}.`;
  } else if (fit_confidence === "SUPPRESSED") {
    truth_note = `Refrigerator compat exists but fit is not proven (${audit?.classification ?? "UNKNOWN"}). No unsafe fit claim.`;
  } else {
    truth_note =
      "Refrigerator model in catalog without PROVEN_CORRECT audit. fit_confidence UNKNOWN per Truth Contract.";
  }

  return {
    ...envelope(),
    model_slug: slug,
    wedge,
    truth_status: "PROVEN",
    model_number: row.model_number || "UNKNOWN",
    title: row.title || "UNKNOWN",
    compatible_filters,
    fit_confidence,
    fit_audit_classification: audit?.classification ?? "UNKNOWN",
    evidence_paths: uniqueSorted(audit?.evidence_paths ?? []),
    repo_paths_read: ctx.repo_paths_read,
    truth_note,
  };
}

export function searchPartsV2(deps: BuckPartsMcpDepsV1, query: string): SearchPartsResultV2 {
  const ctx = getContext(deps);
  const trimmed = query.trim();
  const slugKey = trimmed.toLowerCase();
  const compact = normalizeSearchCompact(trimmed);
  const matches: SearchPartsMatchV2[] = [];
  let rank = 1;

  const pushMatches = (
    match_kind: SearchPartsMatchV2["match_kind"],
    entity: "filter" | "model",
    items: Array<{ wedge: HomekeepWedgeCatalog; slug: string; label: string }>,
  ) => {
    for (const item of items.sort((a, b) => a.slug.localeCompare(b.slug))) {
      matches.push({
        rank,
        match_kind,
        wedge: item.wedge,
        slug: item.slug,
        entity,
        label: item.label,
      });
    }
    if (items.length > 0) rank += 1;
  };

  const filterSlugHit = ctx.filtersBySlug.get(slugKey);
  if (filterSlugHit) {
    pushMatches("filter_slug", "filter", [
      { wedge: filterSlugHit.wedge, slug: filterSlugHit.slug, label: filterSlugHit.name },
    ]);
  }

  const modelSlugHit = ctx.modelsBySlug.get(slugKey);
  if (modelSlugHit) {
    pushMatches("model_slug", "model", [
      { wedge: modelSlugHit.wedge, slug: modelSlugHit.slug, label: modelSlugHit.title },
    ]);
  }

  const aliasExactHits = dedupeFilters(ctx.filtersByAliasExact.get(slugKey) ?? []);
  if (aliasExactHits.length > 0) {
    pushMatches(
      "alias_exact",
      "filter",
      aliasExactHits.map((f) => ({ wedge: f.wedge, slug: f.slug, label: f.name })),
    );
  }

  const oemHits = dedupeFilters(ctx.filtersByOemCompact.get(compact) ?? []);
  if (oemHits.length > 0) {
    pushMatches(
      "oem_exact",
      "filter",
      oemHits.map((f) => ({ wedge: f.wedge, slug: f.slug, label: f.oem_part_number })),
    );
  }

  const aliasCompactHits = dedupeFilters(ctx.filtersByAliasCompact.get(compact) ?? []);
  if (aliasCompactHits.length > 0) {
    pushMatches(
      "alias_exact",
      "filter",
      aliasCompactHits.map((f) => ({ wedge: f.wedge, slug: f.slug, label: f.name })),
    );
  }

  const modelNumberHits = dedupeModels(ctx.modelsByModelNumberCompact.get(compact) ?? []);
  if (modelNumberHits.length > 0) {
    pushMatches(
      "model_number_exact",
      "model",
      modelNumberHits.map((m) => ({ wedge: m.wedge, slug: m.slug, label: m.model_number })),
    );
  }

  return {
    ...envelope(),
    query: trimmed,
    matches,
    repo_paths_read: ctx.repo_paths_read,
    truth_note:
      matches.length > 0
        ? "Exact-token matches only — ranked by match kind. No fuzzy or substring search. Ambiguous tokens are omitted unless uniquely resolved."
        : "No exact-token matches in committed repo catalog. UNKNOWN — BuckParts does not invent matches.",
  };
}

function dedupeFilters<T extends { wedge: HomekeepWedgeCatalog; slug: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((i) => [filterCensusKey(i.wedge, i.slug), i])).values());
}

function dedupeModels<T extends { wedge: HomekeepWedgeCatalog; slug: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((i) => [`${i.wedge}:${i.slug}`, i])).values());
}

export function getSafeBuyerPathV2(deps: BuckPartsMcpDepsV1, filterSlug: string): GetSafeBuyerPathResultV2 {
  const ctx = getContext(deps);
  const resolved = resolveFilterByExactSlug(ctx, filterSlug);
  if (!resolved) {
    return {
      ...envelope(),
      filter_slug: filterSlug.trim(),
      wedge: "UNKNOWN",
      truth_status: "UNKNOWN",
      safe_buyer_path_status: "UNKNOWN",
      safe_buyer_path_detail: "UNKNOWN",
      primary_retailer: summarizePrimaryRetailer([]),
      safe_gated_row_count: 0,
      total_retailer_row_count: 0,
      evidence_paths: [],
      owner_approval_required: "UNKNOWN",
      recommended_next_safe_action: "UNKNOWN",
      repo_paths_read: ctx.repo_paths_read,
      truth_note: "Exact filter slug not found. Safe buyer path UNKNOWN.",
    };
  }

  const { wedge, slug } = resolved;
  const key = filterCensusKey(wedge, slug);
  const retailerRows = ctx.retailerLinksByFilterKey.get(key) ?? [];
  const censusRow = getCensusRowForFilter(ctx, wedge, slug);
  const safeStatus = collapseSafeBuyerPathStatus(censusRow?.page_classification);

  return {
    ...envelope(),
    filter_slug: slug,
    wedge,
    truth_status: retailerRows.length > 0 || censusRow ? "PROVEN" : "UNKNOWN",
    safe_buyer_path_status: safeStatus,
    safe_buyer_path_detail: censusRow?.page_classification ?? "UNKNOWN",
    primary_retailer: summarizePrimaryRetailer(retailerRows),
    safe_gated_row_count: countSafeGatedRetailerRows(retailerRows),
    total_retailer_row_count: retailerRows.length,
    evidence_paths: uniqueSorted(censusRow?.evidence_files ?? []),
    owner_approval_required: censusRow?.owner_approval_required ?? "UNKNOWN",
    recommended_next_safe_action: censusRow?.recommended_next_safe_action ?? "UNKNOWN",
    repo_paths_read: ctx.repo_paths_read,
    truth_note:
      "Safe buyer path from committed retailer_links.csv + launch-buy-links gates. Repo truth only — live Supabase/runtime not queried by MCP.",
  };
}

export function getCoverageMetricsV2(deps: BuckPartsMcpDepsV1): GetCoverageMetricsResultV2 {
  const ctx = getContext(deps);
  const census = ctx.census;

  const closePacketPath = path.join(deps.rootDir, AP_REPO_RUNTIME_CONVERGENCE_CLOSE_PACKET_REL_V1);
  const acceptance = loadApRepoRuntimeConvergenceAcceptanceV1(deps.rootDir);

  let gate_state: string | "UNKNOWN" = "UNKNOWN";
  let gap_size: number | "UNKNOWN" = "UNKNOWN";
  let csv_safe: number | "UNKNOWN" = "UNKNOWN";
  let supabase_safe: number | "UNKNOWN" = "UNKNOWN";
  let measured_at: string | "UNKNOWN" = "UNKNOWN";
  const artifact_paths = [AP_REPO_RUNTIME_CONVERGENCE_ACCEPTANCE_REL_V1];

  if (existsSync(closePacketPath)) {
    artifact_paths.push(AP_REPO_RUNTIME_CONVERGENCE_CLOSE_PACKET_REL_V1);
    try {
      const packet = JSON.parse(readFileSync(closePacketPath, "utf8")) as {
        gate_state_at_packet_generation?: string;
        live_measurement?: {
          gap_size?: number;
          csv_safe_direct_buyable_count?: number;
          supabase_safe_direct_buyable_count?: number;
          measured_at?: string;
        };
      };
      gate_state = packet.gate_state_at_packet_generation ?? "UNKNOWN";
      gap_size = packet.live_measurement?.gap_size ?? "UNKNOWN";
      csv_safe = packet.live_measurement?.csv_safe_direct_buyable_count ?? "UNKNOWN";
      supabase_safe = packet.live_measurement?.supabase_safe_direct_buyable_count ?? "UNKNOWN";
      measured_at = packet.live_measurement?.measured_at ?? "UNKNOWN";
    } catch {
      gate_state = "UNKNOWN";
    }
  }

  if (acceptance.status === "loaded") {
    artifact_paths.push(acceptance.artifact_path);
  }

  return {
    ...envelope(),
    generated_at: census.generated_at,
    wedge_coverage: census.wedge_coverage.map((w) => ({
      wedge: w.wedge,
      product_page_count: w.product_page_count,
      safe_buyer_path_proven_count: w.safe_buyer_path_proven_count,
      suppressed_trust_count: w.suppressed_trust_count,
      noindex_unproven_count: w.noindex_unproven_count,
      unknown_count: w.unknown_count,
      csv_inventory_source: w.csv_inventory_source,
    })),
    classification_counts: census.classification_counts,
    repo_runtime_parity: {
      supabase_measurement_available: false,
      census_csv_vs_supabase: "UNKNOWN",
      air_purifier_convergence: {
        gate_state,
        gap_size,
        csv_safe_direct_buyable_count: csv_safe,
        supabase_safe_direct_buyable_count: supabase_safe,
        artifact_paths: uniqueSorted(artifact_paths),
        measured_at,
      },
    },
    census_summary: {
      total_products: census.products.length,
      proven_facts: census.proven_facts,
      unknown_facts: census.unknown_facts,
      recommended_next_action: census.recommended_next_action,
    },
    repo_paths_read: uniqueSorted([...ctx.repo_paths_read, ...artifact_paths]),
    truth_note:
      "Aggregate repo truth from all-product safe buyer path census + committed AP convergence artifacts. Live Supabase not queried — runtime parity UNKNOWN unless owner runs convergence gate with credentials.",
  };
}

export function getTruthPolicyV2(deps: BuckPartsMcpDepsV1): GetTruthPolicyResultV2 {
  const governing_documents = TRUTH_POLICY_DOC_PATHS.map((rel) => ({
    path: rel,
    status: existsSync(path.join(deps.rootDir, rel)) ? ("available" as const) : ("missing" as const),
  }));

  return {
    ...envelope(),
    policy_name: "BuckParts Truth Contract",
    governing_documents,
    core_principles: [
      "Reality outranks opinion; evidence outranks memory.",
      "Unknown is preferable to invented certainty.",
      "Claims must be traceable to committed repo evidence.",
      "No CSV, Supabase, retailer link, or production mutation from MCP tools.",
      "Model-first product addition: official replacement token before fit/buy-path promotion.",
      "CSV compatibility alone does not prove fit — refrigerator fit requires model-filter-correctness audit PROVEN_CORRECT.",
    ],
    unknown_behavior: [
      "When repo truth is missing, ambiguous, or unproven, tools return UNKNOWN — never 'probably fits'.",
      "Exact-token matching only for searchParts and slug lookups; no fuzzy catalog search.",
      "Safe buyer path and fit are separate dimensions — both must be proven independently.",
      "Runtime Supabase parity is UNKNOWN in MCP unless committed convergence artifacts exist.",
    ],
    mcp_guardrails: [
      `Context contract: ${BUCKPARTS_MCP_TRUTH_CONTEXT_CONTRACT_V1}`,
      "All tools set read_only: true, data_mutation: false, mutation_authorized: false.",
      "No write tools; no affiliate/click mutation; no browser automation side effects.",
    ],
    repo_paths_read: [...TRUTH_POLICY_DOC_PATHS],
  };
}

// Re-export context helper for tests
export { createBuckPartsMcpTruthContextV1, resolveExactToken };
