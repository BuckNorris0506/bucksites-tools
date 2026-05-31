/**
 * Read-only owner drift detector — classifies new ideas against current Command Center execution state.
 * PROVEN: does not authorize mutation, deploy, or side-tool building.
 */

import type { BatchProductionOperatingDispatchV1 } from "./buckparts-batch-production-operating-dispatch-v1";
import type { CommandCenterBrainCoverageManifestV1 } from "./buckparts-command-center-v2-types";
import type { FridgeBuyerPathBatchProposalCommandCenterLaneV1 } from "./fridge-buyer-path-batch-proposal-command-center-v1";
import type { FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1 } from "./fridge-buyer-path-owner-review-packet-command-center-v1";

export const OWNER_DRIFT_DETECTOR_CONTRACT_V1 = "owner_drift_detector_v1" as const;

export const OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1 =
  "Build an Obsidian/N8N/Claude-style vault that talks back for BuckParts." as const;

export const OWNER_DRIFT_DETECTOR_SELF_IDEA_V1 =
  "Build owner_drift_detector_v1 read-only Command Center lane to classify new ideas before they hijack current BuckParts execution." as const;

export type OwnerDriftDecisionV1 =
  | "FINISH_CURRENT_FIRST"
  | "INSTALL_NOW_FOUNDATION"
  | "QUEUE_FOR_LATER"
  | "REJECT_HARMFUL"
  | "UNKNOWN_NEEDS_PROOF";

export type OwnerDriftExecutionContextV1 = {
  next_best_action: string;
  fridge_batch_proposal_open: boolean;
  fridge_proposed_row_count: number;
  fridge_owner_approval_required: boolean;
  fridge_formal_batch_exists: boolean;
  fridge_proposed_batch_id: string | null;
  fridge_owner_review_ready_count: number;
  batch_dispatch_status: string | null;
  batch_dispatch_selected_subsystem: string | null;
  any_cc_lane_mutation_authorized: boolean;
  brain_connected_count: number | null;
};

export type OwnerDriftDetectorReportV1 = {
  contract: typeof OWNER_DRIFT_DETECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  idea: string;
  decision: OwnerDriftDecisionV1;
  current_lane_status: string;
  must_finish_first: string[];
  why: string[];
  risk_if_started_now: string[];
  safe_next_action: string;
  mutation_authorized: false;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildOwnerDriftExecutionContextInputV1 = {
  next_best_action: string;
  fridge_batch_proposal?: Pick<
    FridgeBuyerPathBatchProposalCommandCenterLaneV1,
    | "owner_approval_required"
    | "proposed_row_count"
    | "formal_batch_exists"
    | "proposed_batch_id"
    | "apply_mutation_authorized"
    | "csv_apply_authorized"
    | "retailer_links_mutation_authorized"
    | "supabase_mutation_authorized"
    | "public_ui_mutation_authorized"
    | "buy_link_mutation_authorized"
  > | null;
  fridge_owner_review_packet?: Pick<
    FridgeBuyerPathOwnerReviewPacketCommandCenterLaneV1,
    "owner_review_ready_count" | "apply_mutation_authorized"
  > | null;
  batch_dispatch?: Pick<
    BatchProductionOperatingDispatchV1,
    "dispatch_status" | "selected_subsystem" | "exact_command"
  > | null;
  brain_manifest?: Pick<CommandCenterBrainCoverageManifestV1, "entries"> | null;
  extra_lane_mutation_flags?: boolean[];
};

export function buildOwnerDriftExecutionContextV1(
  input: BuildOwnerDriftExecutionContextInputV1,
): OwnerDriftExecutionContextV1 {
  const proposal = input.fridge_batch_proposal;
  const proposalOpen =
    proposal != null &&
    proposal.owner_approval_required === true &&
    proposal.formal_batch_exists === false &&
    proposal.proposed_row_count > 0;

  const mutationFlag = (value: boolean | false | undefined): boolean => value === true;

  const laneMutationFlags = [
    mutationFlag(proposal?.apply_mutation_authorized as boolean | false | undefined),
    mutationFlag(proposal?.csv_apply_authorized as boolean | false | undefined),
    mutationFlag(proposal?.retailer_links_mutation_authorized as boolean | false | undefined),
    mutationFlag(proposal?.supabase_mutation_authorized as boolean | false | undefined),
    mutationFlag(proposal?.public_ui_mutation_authorized as boolean | false | undefined),
    mutationFlag(proposal?.buy_link_mutation_authorized as boolean | false | undefined),
    mutationFlag(
      input.fridge_owner_review_packet?.apply_mutation_authorized as boolean | false | undefined,
    ),
    ...(input.extra_lane_mutation_flags ?? []),
  ];

  return {
    next_best_action: input.next_best_action,
    fridge_batch_proposal_open: proposalOpen,
    fridge_proposed_row_count: proposal?.proposed_row_count ?? 0,
    fridge_owner_approval_required: proposal?.owner_approval_required === true,
    fridge_formal_batch_exists: proposal?.formal_batch_exists === false ? false : proposal?.formal_batch_exists === true,
    fridge_proposed_batch_id: proposal?.proposed_batch_id ?? null,
    fridge_owner_review_ready_count: input.fridge_owner_review_packet?.owner_review_ready_count ?? 0,
    batch_dispatch_status: input.batch_dispatch?.dispatch_status ?? null,
    batch_dispatch_selected_subsystem: input.batch_dispatch?.selected_subsystem ?? null,
    any_cc_lane_mutation_authorized: laneMutationFlags.some(Boolean),
    brain_connected_count:
      input.brain_manifest?.entries.filter((entry) => entry.verdict === "CONNECTED").length ?? null,
  };
}

export function isOwnerDriftDetectorSelfIdeaV1(idea: string): boolean {
  const normalized = idea.toLowerCase();
  return (
    normalized.includes("owner_drift_detector") ||
    normalized.includes("drift detector") ||
    normalized.includes("drift_detector_v1") ||
    (normalized.includes("classify new ideas") && normalized.includes("hijack"))
  );
}

export function isOwnerDriftHarmfulIdeaV1(idea: string): boolean {
  const normalized = idea.toLowerCase();
  const harmfulPatterns = [
    "bypass owner approval",
    "skip validation",
    "skip owner approval",
    "force apply",
    "mutate retailer_links without",
    "mutate csv directly",
    "deploy netlify now",
    "disable truth contract",
    "ignore brain gate",
    "ignore truth contract",
    "hardcode buyer path",
    "force csv apply",
    "publish without owner",
    "auto-apply csv",
  ];
  return harmfulPatterns.some((pattern) => normalized.includes(pattern));
}

export function isOwnerDriftVagueIdeaV1(idea: string): boolean {
  const trimmed = idea.trim();
  if (trimmed.length < 12) return true;
  if (/^(maybe|what if|something|idk|not sure|hmm|ideas?\??)$/i.test(trimmed)) return true;
  const words = trimmed.split(/\s+/);
  const hasRepoAnchor =
    /buckparts|command center|batch|fridge|retailer_links|truth contract|brain|owner review/i.test(trimmed);
  return words.length < 4 && !hasRepoAnchor;
}

export function isOwnerDriftSideToolIdeaV1(idea: string): boolean {
  const normalized = idea.toLowerCase();
  const sideToolPatterns = [
    "obsidian",
    "n8n",
    "zapier",
    "second brain",
    "talk back",
    "talks back",
    "parallel command center",
    "greenfield app",
    "notion workspace",
    "personal vault",
    "claude-style vault",
  ];
  return sideToolPatterns.some((pattern) => normalized.includes(pattern));
}

export function isOwnerDriftUniversalFoundationIdeaV1(idea: string): boolean {
  const normalized = idea.toLowerCase();
  if (isOwnerDriftDetectorSelfIdeaV1(idea)) return true;
  const foundationPatterns = [
    "read-only integrity gate",
    "truth contract enforcement",
    "brain integrity gate",
    "drift detector",
    "owner drift",
    "classify new ideas before",
  ];
  return foundationPatterns.some((pattern) => normalized.includes(pattern));
}

export function isOwnerDriftUsefulLaterIdeaV1(idea: string): boolean {
  const normalized = idea.toLowerCase();
  const laterPatterns = [
    "vacuum bags",
    "marketing intelligence",
    "research wedge",
    "documentation pass",
    "founder digest polish",
    "whole house water expansion",
  ];
  return laterPatterns.some((pattern) => normalized.includes(pattern));
}

function buildCurrentLaneStatusV1(context: OwnerDriftExecutionContextV1): string {
  if (context.fridge_batch_proposal_open) {
    return `OPEN: fridge_buyer_path_batch_proposal_v1 awaiting founder owner approval (${String(context.fridge_proposed_row_count)} proposed rows; formal_batch_exists=false).`;
  }
  if (context.fridge_owner_review_ready_count > 0) {
    return `OPEN: fridge buyer-path owner review packet has ${String(context.fridge_owner_review_ready_count)} owner-review-ready rows without closed apply loop.`;
  }
  if (context.batch_dispatch_status != null && context.batch_dispatch_status !== "READY") {
    return `ACTIVE: batch_production_operating_dispatch_v1 status=${context.batch_dispatch_status} subsystem=${context.batch_dispatch_selected_subsystem ?? "UNKNOWN"}.`;
  }
  return "NO_PROVEN_OPEN_FRIDGE_BATCH_APPLY_LOOP: execution follows Command Center next_best_action.";
}

function buildMustFinishFirstV1(context: OwnerDriftExecutionContextV1): string[] {
  const items: string[] = [];
  if (context.fridge_batch_proposal_open) {
    items.push(
      `fridge_buyer_path_batch_proposal_v1 founder owner approval for ${context.fridge_proposed_batch_id ?? "proposed_batch"}`,
    );
    items.push("fridge batch run-registry JSON under data/fridge/batch-production/run-registry/ (not proven at repo HEAD)");
    items.push("CSV apply plan + post-apply validation before any retailer_links mutation");
  }
  if (context.next_best_action.trim().length > 0) {
    items.push(`Command Center next_best_action: ${context.next_best_action}`);
  }
  return items;
}

export function classifyOwnerDriftIdeaV1(
  context: OwnerDriftExecutionContextV1,
  idea: string,
  generatedAt: string,
): OwnerDriftDetectorReportV1 {
  const trimmedIdea = idea.trim();
  const current_lane_status = buildCurrentLaneStatusV1(context);
  const must_finish_first = buildMustFinishFirstV1(context);
  const proven_facts: string[] = [
    "PROVEN: owner_drift_detector_v1 is read-only and sets mutation_authorized=false.",
    `PROVEN: Command Center next_best_action present (${context.next_best_action.length > 0 ? "non-empty" : "empty"}).`,
  ];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [
    "UNKNOWN: Whether founder has already approved the open fridge batch proposal in founder_decision_registry.",
    "UNKNOWN: Whether a side tool would reduce operator time without increasing truth drift.",
  ];

  if (context.fridge_batch_proposal_open) {
    proven_facts.push(
      `PROVEN: fridge_buyer_path_batch_proposal_v1 is open (proposed_row_count=${String(context.fridge_proposed_row_count)}, formal_batch_exists=false, owner_approval_required=true).`,
    );
  }
  if (context.any_cc_lane_mutation_authorized) {
    proven_facts.push("PROVEN: at least one supplied Command Center lane reports mutation authorization true.");
  } else {
    proven_facts.push("PROVEN: supplied Command Center lanes report no mutation authorization.");
  }

  let decision: OwnerDriftDecisionV1;
  let why: string[];
  let risk_if_started_now: string[];
  let safe_next_action: string;

  if (isOwnerDriftDetectorSelfIdeaV1(trimmedIdea)) {
    decision = "INSTALL_NOW_FOUNDATION";
    why = [
      "This read-only drift classifier protects current execution by gating new work before it hijacks the active lane.",
      "It reduces drift for every future step without authorizing CSV, Supabase, UI, or buy-link mutation.",
    ];
    risk_if_started_now = [];
    safe_next_action =
      "Install and wire owner_drift_detector_v1 in Command Center; run npm run buckparts:owner-drift-detector -- --idea \"<proposal>\" before starting unrelated builds.";
    inferred_facts.push(
      "INFERRED: Drift detector is foundational governance — safe to install even while fridge batch proposal awaits owner approval.",
    );
  } else if (isOwnerDriftHarmfulIdeaV1(trimmedIdea)) {
    decision = "REJECT_HARMFUL";
    why = [
      "Idea text matches harmful bypass/force-mutation patterns that violate BuckParts truth contract.",
      "Owner approval, validation, and read-only gates must not be skipped.",
    ];
    risk_if_started_now = [
      "Truth contract violation and buyer-path corruption risk.",
      "Owner burden from rollback and incident response.",
      "Complexity debt that blocks batch production closeout.",
    ];
    safe_next_action = "Reject idea; continue read-only Command Center next_best_action without mutation.";
  } else if (isOwnerDriftVagueIdeaV1(trimmedIdea)) {
    decision = "UNKNOWN_NEEDS_PROOF";
    why = [
      "Idea is too vague to classify against repo execution state.",
      "Need concrete scope, repo touchpoints, and read-only proof plan before scheduling.",
    ];
    risk_if_started_now = [
      "Scope creep without truth contract alignment.",
      "Accidental parallel build that diverges from Command Center next_best_action.",
    ];
    safe_next_action =
      "Write a read-only proof artifact: which lanes it touches, mutation flags, and finish-first dependencies.";
  } else if (
    isOwnerDriftUniversalFoundationIdeaV1(trimmedIdea) &&
    !isOwnerDriftSideToolIdeaV1(trimmedIdea)
  ) {
    decision = "INSTALL_NOW_FOUNDATION";
    why = [
      "Idea is read-only governance that reduces drift across future execution steps.",
      "Does not appear to be a parallel side-tool or mutation path.",
    ];
    risk_if_started_now = [];
    safe_next_action =
      "Implement as read-only Command Center lane with tests; verify mutation_authorized stays false.";
    inferred_facts.push("INFERRED: Foundation idea may proceed without waiting for fridge batch closeout.");
  } else if (context.fridge_batch_proposal_open) {
    if (isOwnerDriftSideToolIdeaV1(trimmedIdea)) {
      decision = "FINISH_CURRENT_FIRST";
      why = [
        "Fridge buyer-path batch proposal/approval loop is open and does not authorize apply yet.",
        "Side-tool / parallel knowledge-system ideas do not reduce drift for every remaining batch step.",
      ];
      risk_if_started_now = [
        "Hijacks founder attention from owner approval and batch run-registry creation.",
        "Builds parallel operating surface that diverges from Command Center truth.",
        "Does not authorize apply — side vault would not close the 14-row SEARCH_PLACEHOLDER gap.",
      ];
      safe_next_action =
        "Finish fridge_buyer_path_batch_proposal_v1 owner approval loop first; re-run drift detector afterward.";
    } else if (isOwnerDriftUsefulLaterIdeaV1(trimmedIdea)) {
      decision = "QUEUE_FOR_LATER";
      why = [
        "Idea may be useful but is not required to close the open fridge buyer-path batch proposal loop.",
        "Current Command Center next_best_action and batch approval gate take precedence.",
      ];
      risk_if_started_now = [
        "Splits focus while owner_review_ready rows await formal batch closeout.",
      ];
      safe_next_action = "Queue idea in founder backlog; execute after fridge batch proposal loop closes.";
    } else {
      decision = "FINISH_CURRENT_FIRST";
      why = [
        "Open fridge batch proposal/approval loop must close before unrelated new builds.",
        "Idea does not provenly reduce drift for every future execution step.",
      ];
      risk_if_started_now = [
        "Execution drift away from fridge buyer-path owner approval and apply planning.",
        "New surface area before formal_batch_exists and run-registry are proven.",
      ];
      safe_next_action =
        "Complete founder owner approval + run-registry + apply plan for fridge_buyer_path_batch_proposal_v1 first.";
    }
  } else if (isOwnerDriftSideToolIdeaV1(trimmedIdea)) {
    decision = "QUEUE_FOR_LATER";
    why = [
      "Side-tool ideas are not proven foundational for current BuckParts truth spine.",
      "No open fridge batch loop — but parallel vault/automation still adds operator complexity.",
    ];
    risk_if_started_now = [
      "Duplicate Command Center truth in a second system.",
      "Maintenance burden without proven buyer-path or revenue impact.",
    ];
    safe_next_action =
      "Defer until current Command Center next_best_action queue is empty or idea has read-only proof of drift reduction.";
  } else if (isOwnerDriftUsefulLaterIdeaV1(trimmedIdea)) {
    decision = "QUEUE_FOR_LATER";
    why = ["Idea is plausibly useful but not blocking current execution."];
    risk_if_started_now = ["Low priority distraction from next_best_action."];
    safe_next_action = "Add to backlog; pick up after current batch lane completes.";
  } else {
    decision = "UNKNOWN_NEEDS_PROOF";
    why = [
      "Idea is specific enough to evaluate but lacks proven repo anchors for foundation vs deferral.",
    ];
    risk_if_started_now = ["Unclassified scope may duplicate or conflict with existing brain coverage."];
    safe_next_action =
      "Produce read-only proof: brain manifest touchpoint, mutation flags, and dependency on open batch loops.";
  }

  return {
    contract: OWNER_DRIFT_DETECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: generatedAt,
    idea: trimmedIdea,
    decision,
    current_lane_status,
    must_finish_first,
    why,
    risk_if_started_now,
    safe_next_action,
    mutation_authorized: false,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export type BuildOwnerDriftDetectorReportDepsV1 = {
  rootDir: string;
  idea?: string;
  now?: () => Date;
  next_best_action?: string;
  execution_context?: OwnerDriftExecutionContextV1;
  buildExecutionContext?: (
    input: BuildOwnerDriftExecutionContextInputV1,
  ) => OwnerDriftExecutionContextV1;
};

export function buildOwnerDriftDetectorReportV1(
  deps: BuildOwnerDriftDetectorReportDepsV1 & BuildOwnerDriftExecutionContextInputV1,
): OwnerDriftDetectorReportV1 {
  const now = deps.now ?? (() => new Date());
  const buildContext = deps.buildExecutionContext ?? buildOwnerDriftExecutionContextV1;
  const context =
    deps.execution_context ??
    buildContext({
      next_best_action: deps.next_best_action ?? "",
      fridge_batch_proposal: deps.fridge_batch_proposal,
      fridge_owner_review_packet: deps.fridge_owner_review_packet,
      batch_dispatch: deps.batch_dispatch,
      brain_manifest: deps.brain_manifest,
      extra_lane_mutation_flags: deps.extra_lane_mutation_flags,
    });
  const idea = deps.idea ?? OWNER_DRIFT_DETECTOR_DEFAULT_VAULT_IDEA_V1;
  return classifyOwnerDriftIdeaV1(context, idea, now().toISOString());
}
