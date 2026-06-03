/**
 * Command Center v1 projection for fridge buyer-path owner review packet (read-only).
 */

import {
  buildFridgeBuyerPathOwnerReviewPacketV1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
  type BuildFridgeBuyerPathOwnerReviewPacketDepsV1,
  type FridgeBuyerPathOwnerReviewPacketReportV1,
} from "./fridge-buyer-path-owner-review-packet-v1";

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_owner_review_packet_v1" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-owner-review-packet" as const;

export type FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1;
  cohort_count: number;
  owner_review_ready_count: number;
  row_review_ready_count: number;
  missing_committed_live_row_count: number;
  missing_destination_url_count: number;
  missing_affiliate_url_count: number;
  mutation_ready_count: 0;
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

export type BuildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildPacketReport?: (
    deps: BuildFridgeBuyerPathOwnerReviewPacketDepsV1,
  ) => FridgeBuyerPathOwnerReviewPacketReportV1;
};

export function buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneFromReportV1(
  packet: FridgeBuyerPathOwnerReviewPacketReportV1,
): FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CC_JQ_PATH_V1,
    generated_at: packet.generated_at,
    source_command: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1,
    cohort_count: packet.summary.cohort_count,
    owner_review_ready_count: packet.summary.owner_review_ready_count,
    row_review_ready_count: packet.summary.row_review_ready_count,
    missing_committed_live_row_count: packet.summary.missing_committed_live_row_count,
    missing_destination_url_count: packet.summary.missing_destination_url_count,
    missing_affiliate_url_count: packet.summary.missing_affiliate_url_count,
    mutation_ready_count: 0,
    formal_batch_exists: false,
    formal_batch_registry_path: packet.summary.formal_batch_registry_path,
    top_cohort_slugs: packet.rows.map((row) => row.slug),
    recommended_next_action: packet.summary.recommended_next_action,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    proven_facts: [
      ...packet.proven_facts,
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CC_JQ_PATH_V1} is read-only summary projection of ${packet.report_name}.`,
      "PROVEN: Full normalized rows remain on npm run buckparts:fridge-buyer-path-owner-review-packet stdout JSON.",
    ],
    unknown_facts: [...packet.unknown_facts],
  };
}

export function buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    source_command: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_SOURCE_COMMAND_V1,
    cohort_count: 0,
    owner_review_ready_count: 0,
    row_review_ready_count: 0,
    missing_committed_live_row_count: 0,
    missing_destination_url_count: 0,
    missing_affiliate_url_count: 0,
    mutation_ready_count: 0,
    formal_batch_exists: false,
    formal_batch_registry_path: null,
    top_cohort_slugs: [],
    recommended_next_action:
      "Fridge buyer-path owner-review packet did not build — restore repo CSV inputs or run npm run buckparts:fridge-buyer-path-owner-review-packet locally. Lane is read-only.",
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    proven_facts: [
      "PROVEN: Command Center caught fridge_buyer_path_owner_review_packet_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: fridge_buyer_path_owner_review_packet_v1 failed: ${args.reason}`],
  };
}

export function buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneDepsV1,
): FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 {
  const buildPacket =
    deps.buildPacketReport ??
    ((packetDeps: BuildFridgeBuyerPathOwnerReviewPacketDepsV1) =>
      buildFridgeBuyerPathOwnerReviewPacketV1(packetDeps));
  const packet = buildPacket({ rootDir: deps.rootDir, now: deps.now });
  return buildFridgeBuyerPathOwnerReviewPacketCommandCenterLaneFromReportV1(packet);
}
