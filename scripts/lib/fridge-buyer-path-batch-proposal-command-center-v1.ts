/**
 * Command Center v1 projection for fridge buyer-path batch proposal (read-only).
 */

import {
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchProposalDepsV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CC_JQ_PATH_V1 =
  ".command_center_v2.fridge_buyer_path_batch_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_PROPOSAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-buyer-path-batch-proposal" as const;

export type FridgeBuyerPathBatchProposalCommandCenterLaneV1 = {
  contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CC_JQ_PATH_V1;
  generated_at: string;
  source_command: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_SOURCE_COMMAND_V1;
  proposed_batch_id: string;
  proposed_run_id: string;
  proposed_row_count: number;
  proposed_slugs: string[];
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

export type BuildFridgeBuyerPathBatchProposalCommandCenterLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildProposalReport?: (
    deps: BuildFridgeBuyerPathBatchProposalDepsV1,
  ) => FridgeBuyerPathBatchProposalReportV1;
};

export function buildFridgeBuyerPathBatchProposalCommandCenterLaneFromReportV1(
  proposal: FridgeBuyerPathBatchProposalReportV1,
): FridgeBuyerPathBatchProposalCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CC_JQ_PATH_V1,
    generated_at: proposal.generated_at,
    source_command: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_SOURCE_COMMAND_V1,
    proposed_batch_id: proposal.proposed_batch_id,
    proposed_run_id: proposal.proposed_run_id,
    proposed_row_count: proposal.proposed_row_count,
    proposed_slugs: proposal.proposed_rows.map((row) => row.slug),
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    formal_batch_registry_path: proposal.formal_batch_registry_path,
    required_pre_apply_checks: proposal.required_pre_apply_checks,
    forbidden_mutations: proposal.forbidden_mutations,
    recommended_next_action: proposal.recommended_next_action,
    proven_facts: [
      ...proposal.proven_facts,
      `PROVEN: Command Center lane ${FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CC_JQ_PATH_V1} is read-only summary projection of ${proposal.report_name}.`,
      "PROVEN: Full proposed_rows remain on npm run buckparts:fridge-buyer-path-batch-proposal stdout JSON.",
    ],
    unknown_facts: [...proposal.unknown_facts],
  };
}

export function buildFridgeBuyerPathBatchProposalCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): FridgeBuyerPathBatchProposalCommandCenterLaneV1 {
  return {
    contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    source_command: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_SOURCE_COMMAND_V1,
    proposed_batch_id: "UNKNOWN",
    proposed_run_id: "UNKNOWN",
    proposed_row_count: 0,
    proposed_slugs: [],
    owner_approval_required: true,
    apply_authorization_present: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    formal_batch_exists: false,
    formal_batch_registry_path: null,
    required_pre_apply_checks: [],
    forbidden_mutations: [],
    recommended_next_action:
      "Fridge buyer-path batch proposal did not build — restore repo CSV inputs or run npm run buckparts:fridge-buyer-path-batch-proposal locally. Lane is read-only.",
    proven_facts: [
      "PROVEN: Command Center caught fridge_buyer_path_batch_proposal_v1 build failure without throwing.",
    ],
    unknown_facts: [`UNKNOWN: fridge_buyer_path_batch_proposal_v1 failed: ${args.reason}`],
  };
}

export function buildFridgeBuyerPathBatchProposalCommandCenterLaneV1(
  deps: BuildFridgeBuyerPathBatchProposalCommandCenterLaneDepsV1,
): FridgeBuyerPathBatchProposalCommandCenterLaneV1 {
  const buildProposal =
    deps.buildProposalReport ??
    ((proposalDeps: BuildFridgeBuyerPathBatchProposalDepsV1) =>
      buildFridgeBuyerPathBatchProposalV1(proposalDeps));
  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  return buildFridgeBuyerPathBatchProposalCommandCenterLaneFromReportV1(proposal);
}
