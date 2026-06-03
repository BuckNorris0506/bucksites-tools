/**
 * Command Center v1 projection for fridge buyer-path owner-review bridge (read-only).
 */

import {
  buildFridgeBuyerPathOwnerReviewBridgeV1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1,
  type BuildFridgeBuyerPathOwnerReviewBridgeDepsV1,
  type FridgeBuyerPathOwnerReviewBridgeReportV1,
} from "./fridge-buyer-path-owner-review-bridge-v1";

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_LANE_CONTRACT_V1 =
  FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_owner_review_bridge_v1" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-owner-review-bridge" as const;

export type FridgeBuyerPathOwnerReviewBridgeCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_COMMAND_V1;
  cohort_count: number;
  owner_review_ready_count: number;
  mutation_ready_count: 0;
  missing_evidence_count: number;
  formal_batch_exists: false;
  formal_batch_registry_path: string | null;
  top_cohort_slugs: string[];
  recommended_next_action: string;
  apply_authorization_present: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildBridgeReport?: (
    deps: BuildFridgeBuyerPathOwnerReviewBridgeDepsV1,
  ) => FridgeBuyerPathOwnerReviewBridgeReportV1;
};

export function buildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneFromReportV1(
  bridge: FridgeBuyerPathOwnerReviewBridgeReportV1,
): FridgeBuyerPathOwnerReviewBridgeCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_JQ_PATH_V1,
    generated_at: bridge.generated_at,
    source_command: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_COMMAND_V1,
    cohort_count: bridge.summary.cohort_count,
    owner_review_ready_count: bridge.summary.owner_review_ready_count,
    mutation_ready_count: 0,
    missing_evidence_count: bridge.summary.missing_evidence_count,
    formal_batch_exists: false,
    formal_batch_registry_path: bridge.summary.formal_batch_registry_path,
    top_cohort_slugs: bridge.rows.map((row) => row.slug),
    recommended_next_action: bridge.summary.recommended_next_action,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    proven_facts: [
      ...bridge.proven_facts,
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_JQ_PATH_V1} is read-only projection of ${bridge.report_name}.`,
      "PROVEN: All apply/mutation authorization fields are false — lane is owner-review visibility only.",
    ],
    unknown_facts: [...bridge.unknown_facts],
  };
}

export function buildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): FridgeBuyerPathOwnerReviewBridgeCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    source_command: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_COMMAND_V1,
    cohort_count: 0,
    owner_review_ready_count: 0,
    mutation_ready_count: 0,
    missing_evidence_count: 0,
    formal_batch_exists: false,
    formal_batch_registry_path: null,
    top_cohort_slugs: [],
    recommended_next_action:
      "Fridge buyer-path owner-review bridge did not build — restore repo CSV inputs (data/filters.csv, data/retailer_links.csv) or run npm run buckparts:fridge-buyer-path-owner-review-bridge locally. Lane is read-only; no CSV/Supabase mutation from Command Center.",
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    proven_facts: [
      "PROVEN: Command Center caught fridge_buyer_path_owner_review_bridge_v1 build failure without throwing.",
      "PROVEN: All apply/mutation authorization fields are false.",
    ],
    unknown_facts: [`UNKNOWN: fridge_buyer_path_owner_review_bridge_v1 failed: ${args.reason}`],
  };
}

export function buildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneDepsV1,
): FridgeBuyerPathOwnerReviewBridgeCommandCenterLaneV1 {
  const buildBridge =
    deps.buildBridgeReport ??
    ((bridgeDeps: BuildFridgeBuyerPathOwnerReviewBridgeDepsV1) =>
      buildFridgeBuyerPathOwnerReviewBridgeV1(bridgeDeps));
  const bridge = buildBridge({ rootDir: deps.rootDir, now: deps.now });
  return buildFridgeBuyerPathOwnerReviewBridgeCommandCenterLaneFromReportV1(bridge);
}
