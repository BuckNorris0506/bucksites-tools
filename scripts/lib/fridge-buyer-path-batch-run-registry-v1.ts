/**
 * Read-only fridge buyer-path batch planning run-registry v1 — formal batch record without mutation authority.
 * PROVEN: does not authorize CSV apply, Supabase writes, or buy-link mutation.
 */

import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  FRIDGE_BUYER_PATH_BATCH_APPROVAL_DEFAULT_REGISTRY_REL_V1,
  type FridgeBuyerPathBatchApprovalReportV1,
} from "./fridge-buyer-path-batch-approval-v1";
import {
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchProposalDepsV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";
import { FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1 } from "./fridge-buyer-path-owner-review-bridge-v1";

export function buildFridgeRunRegistryArtifactRelPathV1(proposedBatchId: string): string {
  const trimmed = proposedBatchId.trim();
  const base = trimmed.startsWith("fridge-buyer-path-batch-proposal-")
    ? trimmed.replace(/^fridge-buyer-path-batch-proposal-/, "fridge-buyer-path-batch-run-")
    : `fridge-buyer-path-batch-run-${trimmed}`;
  return `${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}/${base}.json`;
}

export const FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1 =
  "fridge_buyer_path_batch_planning_run_registry_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1 =
  "planning_run_registry_created" as const;

export const FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_DEFAULT_REL_V1 =
  buildFridgeRunRegistryArtifactRelPathV1("fridge-buyer-path-batch-proposal-v1-0fec4a7b623a");

const MUTATION_FLAG_KEYS = [
  "apply_mutation_authorized",
  "csv_apply_authorized",
  "retailer_links_mutation_authorized",
  "supabase_mutation_authorized",
  "public_ui_mutation_authorized",
  "buy_link_mutation_authorized",
  "evidence_write_authorized",
  "netlify_api_authorized",
] as const;

export type FridgeBuyerPathBatchPlanningRunRegistryMutationFlagsV1 = {
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type FridgeBuyerPathBatchPlanningRunRegistryDocumentV1 =
  FridgeBuyerPathBatchPlanningRunRegistryMutationFlagsV1 & {
    contract: typeof FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1;
    read_only: true;
    data_mutation: false;
    run_id: string;
    wedge: "refrigerator_water";
    stage: typeof FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1;
    closeout_complete: false;
    proposed_batch_id: string;
    proposed_row_count: number;
    proposed_slugs: string[];
    owner_approval_artifact_rel_path: string;
    source_proposal_contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
    created_at: string;
  };

export type BuildFridgeBuyerPathBatchPlanningRunRegistryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildProposal?: (deps: BuildFridgeBuyerPathBatchProposalDepsV1) => FridgeBuyerPathBatchProposalReportV1;
  buildApproval?: (deps: { rootDir: string; now?: () => Date }) => FridgeBuyerPathBatchApprovalReportV1;
  ownerApprovalArtifactRelPath?: string;
};

function planningMutationFlagsFalse(): FridgeBuyerPathBatchPlanningRunRegistryMutationFlagsV1 {
  return {
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}

export function buildFridgePlanningRunIdFromProposalBatchIdV1(proposedBatchId: string): string {
  const trimmed = proposedBatchId.trim();
  if (trimmed.startsWith("fridge-buyer-path-batch-proposal-")) {
    return trimmed.replace(/^fridge-buyer-path-batch-proposal-/, "fridge-buyer-path-batch-run-");
  }
  return `fridge-buyer-path-batch-run-${trimmed}`;
}

export function validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(
  input: unknown,
): { ok: true; doc: FridgeBuyerPathBatchPlanningRunRegistryDocumentV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = input as Record<string, unknown>;
  if (o.contract !== FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1) {
    errors.push(
      `contract must be "${FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1}"`,
    );
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (o.closeout_complete !== false) {
    errors.push("closeout_complete must be false for planning run-registry (batch is not closed)");
  }
  if (o.stage !== FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1) {
    errors.push(`stage must be "${FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1}"`);
  }
  if (o.wedge !== "refrigerator_water") errors.push('wedge must be "refrigerator_water"');
  if (typeof o.run_id !== "string" || !o.run_id.trim()) errors.push("run_id must be a non-empty string");
  if (typeof o.proposed_batch_id !== "string" || !o.proposed_batch_id.trim()) {
    errors.push("proposed_batch_id must be a non-empty string");
  }
  if (typeof o.proposed_row_count !== "number" || !Number.isFinite(o.proposed_row_count) || o.proposed_row_count < 1) {
    errors.push("proposed_row_count must be a positive number");
  }
  if (!Array.isArray(o.proposed_slugs) || o.proposed_slugs.length === 0) {
    errors.push("proposed_slugs must be a non-empty array");
  } else if (!o.proposed_slugs.every((s) => typeof s === "string" && s.trim().length > 0)) {
    errors.push("proposed_slugs entries must be non-empty strings");
  }
  if (typeof o.owner_approval_artifact_rel_path !== "string" || !o.owner_approval_artifact_rel_path.trim()) {
    errors.push("owner_approval_artifact_rel_path must be a non-empty string");
  }
  if (o.source_proposal_contract !== FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1) {
    errors.push(`source_proposal_contract must be "${FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1}"`);
  }
  if (typeof o.created_at !== "string" || Number.isNaN(Date.parse(o.created_at))) {
    errors.push("created_at must be a parseable ISO 8601 string");
  }
  for (const key of MUTATION_FLAG_KEYS) {
    if (o[key] !== false) {
      errors.push(`${key} must be false`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const doc = o as unknown as FridgeBuyerPathBatchPlanningRunRegistryDocumentV1;
  return { ok: true, doc };
}

export function buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(
  deps: BuildFridgeBuyerPathBatchPlanningRunRegistryDepsV1,
):
  | { ok: true; doc: FridgeBuyerPathBatchPlanningRunRegistryDocumentV1; registry_rel_path: string }
  | { ok: false; errors: string[] } {
  const now = deps.now ?? (() => new Date());
  const buildProposal = deps.buildProposal ?? buildFridgeBuyerPathBatchProposalV1;
  const buildApproval = deps.buildApproval ?? buildFridgeBuyerPathBatchApprovalReportV1;
  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  const approval = buildApproval({ rootDir: deps.rootDir, now: deps.now });
  const ownerApprovalArtifactRelPath =
    deps.ownerApprovalArtifactRelPath ?? FRIDGE_BUYER_PATH_BATCH_APPROVAL_DEFAULT_REGISTRY_REL_V1;

  const errors: string[] = [];
  if (proposal.proposed_row_count === 0) {
    errors.push("proposal has zero proposed rows — cannot author planning run-registry");
  }
  if (approval.approval_status !== "owner_approved_for_next_planning_only") {
    errors.push(
      `approval_status must be owner_approved_for_next_planning_only (got ${approval.approval_status})`,
    );
  }

  const proposedSlugs = proposal.proposed_rows.map((row) => row.slug);
  if (proposedSlugs.length !== proposal.proposed_row_count) {
    errors.push("proposed_slugs length must match proposed_row_count");
  }

  if (errors.length > 0) return { ok: false, errors };

  const proposedBatchId = proposal.proposed_batch_id;
  const doc: FridgeBuyerPathBatchPlanningRunRegistryDocumentV1 = {
    contract: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    run_id: buildFridgePlanningRunIdFromProposalBatchIdV1(proposedBatchId),
    wedge: "refrigerator_water",
    stage: FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_STAGE_V1,
    closeout_complete: false,
    proposed_batch_id: proposedBatchId,
    proposed_row_count: proposal.proposed_row_count,
    proposed_slugs: proposedSlugs,
    owner_approval_artifact_rel_path: ownerApprovalArtifactRelPath,
    source_proposal_contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    created_at: now().toISOString(),
    ...planningMutationFlagsFalse(),
  };

  const validated = validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(doc);
  if (!validated.ok) return { ok: false, errors: validated.errors };

  return {
    ok: true,
    doc: validated.doc,
    registry_rel_path: buildFridgeRunRegistryArtifactRelPathV1(proposedBatchId),
  };
}
