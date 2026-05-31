/**
 * Read-only fridge buyer-path batch proposal — owner approval gate derived from owner review packet.
 * PROVEN: does not authorize CSV apply, Supabase writes, or buy-link mutation.
 */

import { createHash } from "node:crypto";

import {
  FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1,
} from "./fridge-buyer-path-owner-review-bridge-v1";
import {
  FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_REPORT_NAME_V1,
  type BuildFridgeBuyerPathOwnerReviewPacketDepsV1,
  type FridgeBuyerPathOwnerReviewPacketReportV1,
  type FridgeBuyerPathOwnerReviewPacketRowV1,
} from "./fridge-buyer-path-owner-review-packet-v1";
import { buildFridgeBuyerPathOwnerReviewPacketV1 } from "./fridge-buyer-path-owner-review-packet-v1";

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1 =
  "fridge_buyer_path_batch_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_REPORT_NAME_V1 =
  "fridge_buyer_path_batch_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_RECOMMENDED_NEXT_ACTION_V1 =
  "Founder owner approval required before any fridge buyer-path batch run-registry, CSV apply plan, or retailer_links mutation. Review proposed_rows and record approval via founder decision registry — this proposal does not authorize apply." as const;

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_FORBIDDEN_MUTATIONS_V1 = [
  "product_csv_write",
  "retailer_links_csv_apply",
  "supabase_retailer_links_write",
  "public_ui_change",
  "buy_link_mutation",
  "evidence_artifact_write",
  "netlify_deploy_publish",
  "gsc_fetch",
] as const;

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_REQUIRED_PRE_APPLY_CHECKS_V1 = [
  "Founder owner approval recorded for this proposed_batch_id (founder_decision_registry or batch owner-review checklist).",
  "Fridge batch run-registry JSON created under data/fridge/batch-production/run-registry/ with owner-approved scope.",
  "CSV apply plan artifact exists with planned_changes limited to proposed_batch_rows slugs only.",
  "Repo post-apply validation contract defined before any CSV apply executor run.",
  "Supabase parity dry-run passes for planned slugs before any Supabase apply.",
  "Committed data/retailer_links.csv still shows SEARCH_PLACEHOLDER primary for proposed slugs — export/backfill plan must reconcile evidence vs CSV deliberately.",
] as const;

export type FridgeBuyerPathBatchProposalRowV1 = {
  proposal_rank: number;
  slug: string;
  oem_token: string;
  brand: string | null;
  evidence_artifact_path: string | null;
  destination_url: string;
  affiliate_url: string;
  retailer_key: string | null;
  retailer_name: string | null;
  browser_truth_classification: string | null;
  committed_buyer_path_status: string;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
};

export type FridgeBuyerPathBatchProposalReportV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
  report_name: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  wedge: "refrigerator_water";
  source_packet_report: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_REPORT_NAME_V1;
  source_packet_contract: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1;
  proposed_batch_id: string;
  proposed_run_id: string;
  proposed_row_count: number;
  proposed_rows: FridgeBuyerPathBatchProposalRowV1[];
  owner_approval_required: true;
  apply_authorization_present: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  formal_batch_exists: false;
  formal_batch_registry_path: string | null;
  required_pre_apply_checks: readonly string[];
  forbidden_mutations: readonly string[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathBatchProposalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildPacketReport?: (
    deps: BuildFridgeBuyerPathOwnerReviewPacketDepsV1,
  ) => FridgeBuyerPathOwnerReviewPacketReportV1;
};

export function isFridgeBuyerPathBatchProposalEligibleRowV1(
  row: FridgeBuyerPathOwnerReviewPacketRowV1,
): boolean {
  return (
    row.owner_review_ready === true &&
    row.row_review_status === "READY_FOR_OWNER_REVIEW" &&
    row.committed_live_row_present === true &&
    row.destination_url != null &&
    row.destination_url.trim().length > 0 &&
    row.affiliate_url != null &&
    row.affiliate_url.trim().length > 0
  );
}

export function buildDeterministicFridgeBuyerPathBatchProposalIdV1(slugs: string[]): string {
  const sorted = [...slugs].sort((a, b) => a.localeCompare(b));
  const digest = createHash("sha256").update(sorted.join("|")).digest("hex").slice(0, 12);
  return `fridge-buyer-path-batch-proposal-v1-${digest}`;
}

export function buildFridgeBuyerPathBatchProposalFromPacketV1(
  packet: FridgeBuyerPathOwnerReviewPacketReportV1,
): FridgeBuyerPathBatchProposalReportV1 {
  const eligible = packet.rows.filter(isFridgeBuyerPathBatchProposalEligibleRowV1);
  const proposed_rows: FridgeBuyerPathBatchProposalRowV1[] = eligible.map((row, index) => ({
    proposal_rank: index + 1,
    slug: row.slug,
    oem_token: row.oem_token,
    brand: row.brand,
    evidence_artifact_path: row.primary_evidence_artifact_path,
    destination_url: row.destination_url!,
    affiliate_url: row.affiliate_url!,
    retailer_key: row.retailer_key,
    retailer_name: row.retailer_name,
    browser_truth_classification: row.browser_truth_classification,
    committed_buyer_path_status: row.committed_buyer_path_status,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
  }));

  const proposedSlugs = proposed_rows.map((row) => row.slug);
  const proposed_batch_id = buildDeterministicFridgeBuyerPathBatchProposalIdV1(proposedSlugs);

  return {
    contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: packet.generated_at,
    wedge: "refrigerator_water",
    source_packet_report: packet.report_name,
    source_packet_contract: packet.contract,
    proposed_batch_id,
    proposed_run_id: proposed_batch_id,
    proposed_row_count: proposed_rows.length,
    proposed_rows,
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    formal_batch_registry_path: packet.summary.formal_batch_registry_path,
    required_pre_apply_checks: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_REQUIRED_PRE_APPLY_CHECKS_V1,
    forbidden_mutations: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_FORBIDDEN_MUTATIONS_V1,
    recommended_next_action: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_RECOMMENDED_NEXT_ACTION_V1,
    proven_facts: [
      `PROVEN: proposal built from ${packet.report_name} (${packet.contract}).`,
      `PROVEN: proposed_row_count=${String(proposed_rows.length)} from rows passing owner_review_ready + READY_FOR_OWNER_REVIEW + committed_live_row destination/affiliate URLs.`,
      `PROVEN: proposed_batch_id=${proposed_batch_id} is deterministic from sorted proposed slug set.`,
      "PROVEN: owner_approval_required=true; all apply/mutation authorization fields false.",
      `PROVEN: formal_batch_exists=false (no proven fridge batch run-registry at ${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}).`,
    ],
    unknown_facts: [
      ...packet.unknown_facts,
      "UNKNOWN: Whether founder has approved this proposed_batch_id in founder_decision_registry — proposal does not read registry.",
      "UNKNOWN: Whether evidence committed_live_row still matches live Supabase/public.retailer_links.",
    ],
  };
}

export function buildFridgeBuyerPathBatchProposalV1(
  deps: BuildFridgeBuyerPathBatchProposalDepsV1,
): FridgeBuyerPathBatchProposalReportV1 {
  const buildPacket =
    deps.buildPacketReport ??
    ((packetDeps: BuildFridgeBuyerPathOwnerReviewPacketDepsV1) =>
      buildFridgeBuyerPathOwnerReviewPacketV1(packetDeps));
  const packet = buildPacket({ rootDir: deps.rootDir, now: deps.now });
  return buildFridgeBuyerPathBatchProposalFromPacketV1(packet);
}
