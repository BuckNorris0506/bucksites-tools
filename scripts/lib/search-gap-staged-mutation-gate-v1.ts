/**
 * Mutation gate for staged search-gap pipeline service-role writes.
 * P1 lane: MUTATION IO capability required; no buyer-path plan binding.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  type SupabaseMutationGateModeV1,
  type SupabaseMutationGatePreflightV1,
} from "./buckparts-supabase-mutation-gate-core-v1";

export const SEARCH_GAP_STAGED_MUTATION_GATE_CONTRACT_V1 =
  "search_gap_staged_mutation_gate_v1" as const;

/** Inventory/static-audit marker — scripts importing this gate satisfy mutationGateRef checks. */
export const SEARCH_GAP_STAGED_MUTATION_GATE_REF_V1 =
  "search_gap_staged_mutation_gate_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_CANDIDATES_GENERATE_V1 =
  "search_gap_candidates_generate_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_CANDIDATES_APPLY_V1 =
  "search_gap_candidates_apply_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_RESOLVE_REFRIGERATOR_V1 =
  "staged_compat_resolve_refrigerator_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_REPROCESS_REFRIGERATOR_V1 =
  "staged_compat_reprocess_refrigerator_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_PART_CHOICE_REFRIGERATOR_V1 =
  "staged_compat_part_choice_refrigerator_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STAGED_FILTER_BRAND_REFRIGERATOR_V1 =
  "staged_filter_brand_refrigerator_v1" as const;

export type SearchGapStagedMutationOperationV1 =
  | "candidate_generate"
  | "candidate_apply_stage"
  | "staged_compat_resolve"
  | "staged_compat_reprocess"
  | "staged_compat_part_choice"
  | "staged_filter_brand_apply";

export type SearchGapStagedCatalogScopeV1 = HomekeepWedgeCatalog | "multi_catalog";

export type SearchGapStagedMutationPreflightV1 = SupabaseMutationGatePreflightV1 & {
  lane_contract: typeof SEARCH_GAP_STAGED_MUTATION_GATE_CONTRACT_V1;
  mutation_lane: string;
  catalog_scope: SearchGapStagedCatalogScopeV1;
  operation: SearchGapStagedMutationOperationV1;
  mutationGateRef: typeof SEARCH_GAP_STAGED_MUTATION_GATE_REF_V1;
};

export function mutationLaneForSearchGapStagedOperationV1(
  operation: SearchGapStagedMutationOperationV1,
): string {
  switch (operation) {
    case "candidate_generate":
      return SEARCH_GAP_MUTATION_LANE_CANDIDATES_GENERATE_V1;
    case "candidate_apply_stage":
      return SEARCH_GAP_MUTATION_LANE_CANDIDATES_APPLY_V1;
    case "staged_compat_resolve":
      return SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_RESOLVE_REFRIGERATOR_V1;
    case "staged_compat_reprocess":
      return SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_REPROCESS_REFRIGERATOR_V1;
    case "staged_compat_part_choice":
      return SEARCH_GAP_MUTATION_LANE_STAGED_COMPAT_PART_CHOICE_REFRIGERATOR_V1;
    case "staged_filter_brand_apply":
      return SEARCH_GAP_MUTATION_LANE_STAGED_FILTER_BRAND_REFRIGERATOR_V1;
    default:
      return `search_gap_staged_${operation}_v1`;
  }
}

export function buildSearchGapStagedMutationPreflightV1(args: {
  mode: SupabaseMutationGateModeV1;
  operation: SearchGapStagedMutationOperationV1;
  catalog_scope: SearchGapStagedCatalogScopeV1;
  io_capability?: BuckpartsIoCapabilityV1;
}): SearchGapStagedMutationPreflightV1 {
  const core = buildSupabaseMutationGatePreflightV1({
    mode: args.mode,
    io_capability: args.io_capability,
  });

  return {
    ...core,
    lane_contract: SEARCH_GAP_STAGED_MUTATION_GATE_CONTRACT_V1,
    mutation_lane: mutationLaneForSearchGapStagedOperationV1(args.operation),
    catalog_scope: args.catalog_scope,
    operation: args.operation,
    mutationGateRef: SEARCH_GAP_STAGED_MUTATION_GATE_REF_V1,
  };
}

export function searchGapStagedSupabaseMutationAuthorizedV1(
  preflight: SearchGapStagedMutationPreflightV1,
): boolean {
  return preflight.mutation_authorized;
}

export function assertSearchGapStagedSupabaseWriteAuthorizedV1(
  preflight: SearchGapStagedMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
