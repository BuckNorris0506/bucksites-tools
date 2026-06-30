/**
 * Wedge-aware mutation gate for search_gaps status/classification service-role writes.
 * P2 lane: MUTATION IO capability required; no buyer-path plan binding.
 */

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";

import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  type SupabaseMutationGateModeV1,
  type SupabaseMutationGatePreflightV1,
} from "./buckparts-supabase-mutation-gate-core-v1";

export const SEARCH_GAP_STATUS_MUTATION_GATE_CONTRACT_V1 =
  "search_gap_status_mutation_gate_v1" as const;

/** Inventory/static-audit marker — scripts importing this gate satisfy mutationGateRef checks. */
export const SEARCH_GAP_STATUS_MUTATION_GATE_REF_V1 =
  "search_gap_status_mutation_gate_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STATUS_REFRIGERATOR_V1 =
  "search_gap_status_refrigerator_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STATUS_AIR_PURIFIER_V1 =
  "search_gap_status_air_purifier_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_STATUS_WHOLE_HOUSE_WATER_V1 =
  "search_gap_status_whole_house_water_v1" as const;

export const SEARCH_GAP_MUTATION_LANE_CLASSIFY_V1 = "search_gaps_classify_v1" as const;

export type SearchGapMutationOperationV1 = "status_update" | "classify_likely_entity_type";

export type SearchGapStatusMutationPreflightV1 = SupabaseMutationGatePreflightV1 & {
  lane_contract: typeof SEARCH_GAP_STATUS_MUTATION_GATE_CONTRACT_V1;
  mutation_lane: string;
  wedge: HomekeepWedgeCatalog | "all_wedges";
  operation: SearchGapMutationOperationV1;
  mutationGateRef: typeof SEARCH_GAP_STATUS_MUTATION_GATE_REF_V1;
};

export function mutationLaneForSearchGapWedgeV1(
  wedge: HomekeepWedgeCatalog,
  operation: SearchGapMutationOperationV1,
): string {
  if (operation === "classify_likely_entity_type") {
    return SEARCH_GAP_MUTATION_LANE_CLASSIFY_V1;
  }
  switch (wedge) {
    case "refrigerator_water":
      return SEARCH_GAP_MUTATION_LANE_STATUS_REFRIGERATOR_V1;
    case "air_purifier":
      return SEARCH_GAP_MUTATION_LANE_STATUS_AIR_PURIFIER_V1;
    case "whole_house_water":
      return SEARCH_GAP_MUTATION_LANE_STATUS_WHOLE_HOUSE_WATER_V1;
    default:
      return `search_gap_status_${wedge}_v1`;
  }
}

export function buildSearchGapStatusMutationPreflightV1(args: {
  mode: SupabaseMutationGateModeV1;
  wedge: HomekeepWedgeCatalog | "all_wedges";
  operation: SearchGapMutationOperationV1;
  io_capability?: BuckpartsIoCapabilityV1;
}): SearchGapStatusMutationPreflightV1 {
  const mutation_lane =
    args.wedge === "all_wedges"
      ? SEARCH_GAP_MUTATION_LANE_CLASSIFY_V1
      : mutationLaneForSearchGapWedgeV1(args.wedge, args.operation);

  const core = buildSupabaseMutationGatePreflightV1({
    mode: args.mode,
    io_capability: args.io_capability,
  });

  return {
    ...core,
    lane_contract: SEARCH_GAP_STATUS_MUTATION_GATE_CONTRACT_V1,
    mutation_lane,
    wedge: args.wedge,
    operation: args.operation,
    mutationGateRef: SEARCH_GAP_STATUS_MUTATION_GATE_REF_V1,
  };
}

export function searchGapSupabaseMutationAuthorizedV1(
  preflight: SearchGapStatusMutationPreflightV1,
): boolean {
  return preflight.mutation_authorized;
}

export function assertSearchGapSupabaseWriteAuthorizedV1(
  preflight: SearchGapStatusMutationPreflightV1,
): void {
  assertSupabaseMutationAuthorizedV1(preflight);
}
