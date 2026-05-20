export type TopMoneyQueueLaneV1 = {
  lane?: string;
  exhausted: boolean;
  candidate_count: number | "UNKNOWN";
  recommended_action: string;
};

/** Read-only: FlexOffers publisher network cannot monetize (tracker REJECTED / paused). */
export const FLEXOFFERS_TRACKER_BLOCKED_ACTION =
  "BLOCKED: FlexOffers network REJECTED in affiliate tracker — flexoffers-readiness placeholder slots are archival only (no link insert, no monetization).";

export function flexoffersAffiliateTrackerStatus(rows: unknown[]): string | null {
  const row = rows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { id?: string }).id === "flexoffers",
  ) as { status?: string } | undefined;
  return typeof row?.status === "string" ? row.status.trim() : null;
}

export function isFlexoffersMonetizationBlocked(trackerStatus: string | null): boolean {
  if (!trackerStatus) return false;
  const normalized = trackerStatus.trim().toUpperCase();
  return normalized === "REJECTED" || normalized === "PAUSED_OR_INACTIVE";
}

export function isTopMoneyQueueLaneActionable(lane: TopMoneyQueueLaneV1 | undefined): boolean {
  if (!lane || lane.exhausted || lane.candidate_count === "UNKNOWN") return false;
  if (/^BLOCKED:/i.test(lane.recommended_action)) return false;
  return true;
}

export type ResolveNextBestActionInputV1 = {
  preferAmazonFirstConversion: boolean;
  affiliateApprovalPending: boolean;
  nonAmazonApproved: boolean;
  waterdropLiveProofSlice: boolean;
  waterdropProductionRowId: string | null;
  pendingNetworkOrPrograms: string[];
  topMoneyQueue: TopMoneyQueueLaneV1[];
  amazonFirstTokenHint: string;
  amazonUnknownEvidenceDeferredCount: number;
  amazonDeferredUnknownTopTokens: string;
  flexoffersMonetizationBlocked: boolean;
  blockedLinkRecommendedFirstAction?: string;
};

export type ResolveNextBestActionResultV1 = {
  next_best_action: string;
  why_this_action: string;
};

const STALE_NON_AMAZON_APPROVAL_NBA =
  "Rerun affiliate tracker + command surface and keep FlexOffers readiness queue current until at least one non-Amazon network lane reaches APPROVED.";

export function withWaterdropLiveMonitorPrefix(action: string, waterdropLiveProofSlice: boolean): string {
  if (!waterdropLiveProofSlice) return action;
  return `Monitor Waterdrop DA29-00020B live proof slice only (da29-00020b; no broad rollout); next operator queue: ${action}`;
}

/** Synthesizes Command Center root next_best_action / why_this_action (read-only policy text). */
export function resolveCommandCenterNextBestActionV1(
  input: ResolveNextBestActionInputV1,
): ResolveNextBestActionResultV1 {
  const staleAffiliateGate =
    input.affiliateApprovalPending &&
    !input.nonAmazonApproved &&
    !input.waterdropLiveProofSlice;

  let next_best_action = "";
  let why_this_action = "";

  if (input.preferAmazonFirstConversion) {
    next_best_action = `Prioritize Amazon-first blocked-search rescue: run exact-token Amazon product-page searches and verify buyability for queued refrigerator tokens (${input.amazonFirstTokenHint}).`;
    why_this_action =
      "Amazon Associates is APPROVED with verified tag, no other affiliate is APPROVED yet, and the Amazon-first queue reports rows needing SEARCH_AMAZON_EXACT_TOKEN.";
    if (input.amazonUnknownEvidenceDeferredCount > 0) {
      next_best_action += ` Do not treat ${input.amazonUnknownEvidenceDeferredCount} deferred token(s) as the same priority cohort until HUMAN_BROWSER_VERIFICATION_REQUIRED is satisfied (${input.amazonDeferredUnknownTopTokens}).`;
      why_this_action +=
        " Committed UNKNOWN evidence files demote those filters out of the ordinary exact-token search headline cohort.";
    }
  } else if (staleAffiliateGate) {
    next_best_action = STALE_NON_AMAZON_APPROVAL_NBA;
    why_this_action =
      "Affiliate approvals are still pending, so retailer-specific evidence work that cannot monetize now is deprioritized by policy.";
  } else if (isTopMoneyQueueLaneActionable(input.topMoneyQueue[0])) {
    next_best_action = withWaterdropLiveMonitorPrefix(
      input.topMoneyQueue[0]!.recommended_action,
      input.waterdropLiveProofSlice,
    );
    why_this_action =
      "Manufacturer catalog/search money cohort has concrete remaining blocked rows and is currently monetizable.";
  } else if (isTopMoneyQueueLaneActionable(input.topMoneyQueue[1])) {
    next_best_action = withWaterdropLiveMonitorPrefix(
      input.topMoneyQueue[1]!.recommended_action,
      input.waterdropLiveProofSlice,
    );
    why_this_action =
      "Frigidaire lane still has candidates after manufacturer catalog/search next-money cohort is exhausted.";
  } else if (isTopMoneyQueueLaneActionable(input.topMoneyQueue[2])) {
    next_best_action = withWaterdropLiveMonitorPrefix(
      input.topMoneyQueue[2]!.recommended_action,
      input.waterdropLiveProofSlice,
    );
    why_this_action =
      "Weak/zero-CTA placeholder readiness report remains available as a non-insert prep lane (not live monetization until a network is approved).";
  } else if (input.blockedLinkRecommendedFirstAction?.trim()) {
    next_best_action = withWaterdropLiveMonitorPrefix(
      input.blockedLinkRecommendedFirstAction.trim(),
      input.waterdropLiveProofSlice,
    );
    why_this_action =
      "Top money-queue lanes are exhausted or blocked; blocked-link money queue is the next actionable remediation path.";
  } else {
    next_best_action = "No actionable queue available; regenerate source reports and re-evaluate lane inputs.";
    why_this_action = "All current lanes are exhausted or unknown.";
  }

  if (input.flexoffersMonetizationBlocked && !why_this_action.includes("FlexOffers network REJECTED")) {
    why_this_action +=
      " FlexOffers publisher network is REJECTED in affiliate tracker — flexoffers-readiness placeholders are not an actionable monetization path.";
  }

  why_this_action = appendWaterdropAndAffiliatePendingWhy(why_this_action, {
    next_best_action,
    waterdropLiveProofSlice: input.waterdropLiveProofSlice,
    waterdropProductionRowId: input.waterdropProductionRowId,
    affiliateApprovalPending: input.affiliateApprovalPending,
    staleAffiliateGate,
    pendingNetworkOrPrograms: input.pendingNetworkOrPrograms,
  });

  return { next_best_action, why_this_action };
}

export function appendWaterdropAndAffiliatePendingWhy(
  why_this_action: string,
  input: {
    next_best_action: string;
    waterdropLiveProofSlice: boolean;
    waterdropProductionRowId: string | null;
    affiliateApprovalPending: boolean;
    staleAffiliateGate: boolean;
    pendingNetworkOrPrograms: string[];
  },
): string {
  let why = why_this_action;
  if (
    input.waterdropLiveProofSlice &&
    input.waterdropProductionRowId &&
    !why.includes("Waterdrop DA29-00020B proof slice is LIVE")
  ) {
    why += ` Waterdrop DA29-00020B proof slice is LIVE (production row ${input.waterdropProductionRowId}): monitor /filter/da29-00020b and /go clicks only — no broad Waterdrop rollout.`;
  }
  if (
    input.affiliateApprovalPending &&
    !input.staleAffiliateGate &&
    !/until at least one non-Amazon network lane reaches APPROVED/i.test(input.next_best_action) &&
    !why.includes("Other affiliate program approvals remain pending")
  ) {
    const pendingHint =
      input.pendingNetworkOrPrograms.length > 0
        ? input.pendingNetworkOrPrograms.join("; ")
        : "see affiliate tracker";
    why += ` Other affiliate program approvals remain pending (${pendingHint}) — background tracker hygiene only; commission/revenue NOT_CONNECTED.`;
  }
  return why;
}

export function affiliateTrackerPrimaryCommandPending(input: {
  affiliateApprovalPending: boolean;
  nonAmazonApproved: boolean;
  waterdropLiveProofSlice: boolean;
}): boolean {
  return (
    input.affiliateApprovalPending &&
    !input.nonAmazonApproved &&
    !input.waterdropLiveProofSlice
  );
}
