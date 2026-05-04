import type { AmazonFirstBlockedConversionQueueReport } from "../report-amazon-first-blocked-conversion-queue";
import type {
  AmazonRescueTokenControlEntry,
  ClickVisibilitySnapshot,
  CommandCenterV2Report,
  DecisionLane,
  EvidenceRollup,
  RevenueSnapshotLane,
} from "./buckparts-command-center-v2-types";

export type { CommandCenterV2Report } from "./buckparts-command-center-v2-types";

function uniqueSorted(tokens: string[]): string[] {
  return Array.from(new Set(tokens.map((t) => t.trim().toUpperCase()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function buildRevenueSnapshotLane(click: ClickVisibilitySnapshot): RevenueSnapshotLane {
  const baseNotes =
    click.commission_or_revenue === "NOT_CONNECTED"
      ? click.commission_or_revenue_notes
      : "Commission / revenue not modeled in-repo.";
  const qualityHint =
    typeof click.human_likely_last_30_days_clicks === "number" &&
    typeof click.raw_last_30_days_clicks === "number"
      ? ` Raw last_30_days_clicks=${click.raw_last_30_days_clicks}; human_likely_last_30_days_clicks=${click.human_likely_last_30_days_clicks} (conservative UA filter, not buyer proof). Freshness: ${click.click_freshness_status}.`
      : "";

  if (click.runtime_status === "OK") {
    return {
      status: "OK",
      count:
        typeof click.human_likely_last_30_days_clicks === "number"
          ? click.human_likely_last_30_days_clicks
          : typeof click.last_30_days_clicks === "number"
            ? click.last_30_days_clicks
            : undefined,
      top_items: (() => {
        if (click.excluded_by_category_30d === "UNKNOWN" || !click.excluded_by_category_30d) return undefined;
        const ex = Object.entries(click.excluded_by_category_30d)
          .filter(([, n]) => typeof n === "number" && n > 0)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 5)
          .map(([k, n]) => `${k}:${n}`);
        return ex.length > 0 ? ex : undefined;
      })(),
      blocker: null,
      next_agent_action:
        "click_events read-only snapshot is attached under revenue_snapshot.click_visibility; raw counts include bots/crawlers/internal audit traffic—use human_likely_* and excluded_* for a conservative quality view. No retailer_links mutations originate from this lane.",
      next_owner_action: `${baseNotes}${qualityHint} ${click.click_quality_notes ?? ""}`.trim(),
      click_visibility: click,
    };
  }

  if (click.runtime_status === "UNKNOWN_SCHEMA") {
    return {
      status: "ATTENTION",
      count: typeof click.last_30_days_clicks === "number" ? click.last_30_days_clicks : undefined,
      top_items: click.aggregation_notes?.slice(0, 3),
      blocker: "click_events_projection_or_schema_mismatch",
      next_agent_action:
        "Compare live click_events columns to scripts/lib/buckparts-click-events-snapshot.ts SELECT list and migrations; keep reads read-only.",
      next_owner_action: baseNotes,
      click_visibility: click,
    };
  }

  return {
    status: "ATTENTION",
    blocker: "click_events_unavailable_or_admin_env_missing",
    next_agent_action:
      "Restore the same Supabase URL + SUPABASE_SERVICE_ROLE_KEY contract used by buckparts:command-surface for read-only click counts.",
    next_owner_action: baseNotes,
    click_visibility: click,
  };
}

export function buildCommandCenterV2Report(input: {
  now: () => Date;
  registryPath: string;
  registryEntries: AmazonRescueTokenControlEntry[];
  registryLoadError: string | null;
  evidenceRollup: EvidenceRollup;
  amazonFirstBlocked: AmazonFirstBlockedConversionQueueReport;
  commandSurfaceHealthStatus: string;
  commandSurfaceReasons: string[];
  affiliateApprovalPending: boolean;
  affiliateApprovedCount: number;
  clickVisibility: ClickVisibilitySnapshot;
}): CommandCenterV2Report {
  const registryByToken = new Map<string, AmazonRescueTokenControlEntry>();
  for (const e of input.registryEntries) {
    registryByToken.set(e.token.toUpperCase(), e);
  }

  const frozenTokens = input.registryEntries
    .filter((e) => e.status === "FROZEN_OPERATOR_HOLD")
    .map((e) => e.token);
  const liveTokens = input.registryEntries
    .filter((e) => e.status === "LIVE_OUTCOME_RECORDED")
    .map((e) => e.token);
  const unknownRecordedTokens = input.registryEntries
    .filter((e) => e.status === "UNKNOWN_EVIDENCE_RECORDED")
    .map((e) => e.token);
  const operatorDecisionTokens = input.registryEntries
    .filter((e) => e.status === "OPERATOR_DECISION_REQUIRED")
    .map((e) => e.token);

  const deferredFromQueue: string[] = [];
  if (
    input.amazonFirstBlocked.top_candidates !== "UNKNOWN" &&
    Array.isArray(input.amazonFirstBlocked.unknown_evidence_deferred)
  ) {
    for (const row of input.amazonFirstBlocked.unknown_evidence_deferred) {
      if (typeof row.token === "string" && row.token !== "UNKNOWN") deferredFromQueue.push(row.token);
    }
  }

  const human_browser_required_tokens = uniqueSorted([...unknownRecordedTokens, ...deferredFromQueue]);

  const queueSearchTokens: string[] = [];
  if (input.amazonFirstBlocked.top_candidates !== "UNKNOWN" && Array.isArray(input.amazonFirstBlocked.top_candidates)) {
    for (const row of input.amazonFirstBlocked.top_candidates) {
      if (row.recommended_next_action === "SEARCH_AMAZON_EXACT_TOKEN" && typeof row.token === "string") {
        queueSearchTokens.push(row.token);
      }
    }
  }

  /** Registry rows are authoritative do-not-touch for autonomous fresh rescue on those tokens. */
  const registryControlled = new Set(input.registryEntries.map((e) => e.token.toUpperCase()));
  const fresh_search_top_tokens = uniqueSorted(
    queueSearchTokens.filter((t) => !registryControlled.has(t.toUpperCase())),
  );

  const next_allowed_agent_token = fresh_search_top_tokens[0] ?? null;

  const doNotTouchRegistry = uniqueSorted(
    input.registryEntries.filter((e) => e.can_agent_advance === false).map((e) => e.token),
  );

  const needsSearch =
    typeof input.amazonFirstBlocked.needs_amazon_search_count === "number"
      ? input.amazonFirstBlocked.needs_amazon_search_count
      : 0;
  const unknownDeferredCount =
    typeof input.amazonFirstBlocked.unknown_evidence_deferred_count === "number"
      ? input.amazonFirstBlocked.unknown_evidence_deferred_count
      : 0;

  const amazonStatus: "OK" | "ATTENTION" | "BLOCKED" | "PLACEHOLDER" | "UNKNOWN" =
    human_browser_required_tokens.length > 0 || needsSearch > 0 || unknownDeferredCount > 0
      ? "ATTENTION"
      : "OK";

  const amazonBlocker =
    input.registryLoadError ??
    (input.commandSurfaceHealthStatus === "CRITICAL" ? "command_surface_critical" : null);

  const amazonRescue = {
    status: amazonStatus,
    count: needsSearch + unknownDeferredCount,
    top_items: fresh_search_top_tokens.slice(0, 8),
    blocker: amazonBlocker,
    next_agent_action:
      next_allowed_agent_token != null
        ? `Run read-only amazon-first queue + exact-token PDP verification for ${next_allowed_agent_token} and cohort; do not mutate retailer_links without owner-approved insert plan.`
        : "No registry-cleared fresh SEARCH tokens in top cohort; run queue report and refresh token controls before agent rescue.",
    next_owner_action:
      "Maintain data/ops/amazon-rescue-token-controls.json when changing operator holds or LIVE/UNKNOWN evidence; evidence JSON remains outcome source of truth.",
    do_not_touch: doNotTouchRegistry.length > 0 ? doNotTouchRegistry : undefined,
    registry_path: input.registryPath,
    registry_load_error: input.registryLoadError,
    registry_entry_count: input.registryEntries.length,
    fresh_search_top_tokens,
    human_browser_required_tokens,
    frozen_operator_hold_tokens: uniqueSorted(frozenTokens),
    live_outcome_recorded_tokens: uniqueSorted(liveTokens),
    operator_decision_required_tokens: uniqueSorted(operatorDecisionTokens),
    next_allowed_agent_token,
  };

  const unknownLane: DecisionLane = {
    status: human_browser_required_tokens.length > 0 ? "ATTENTION" : "OK",
    count: human_browser_required_tokens.length,
    top_items: human_browser_required_tokens.slice(0, 8),
    blocker: human_browser_required_tokens.length > 0 ? "UNKNOWN_evidence_requires_human_browser_or_new_file" : null,
    next_agent_action:
      "Keep read-only evidence reports current; do not promote UNKNOWN cohort to fresh SEARCH without new proof.",
    next_owner_action:
      "Perform US-browser PDP verification or author a superseding evidence JSON before asking an agent to repeat blind exact-token search.",
    do_not_touch: human_browser_required_tokens.length > 0 ? [...human_browser_required_tokens] : undefined,
  };

  const affiliateLane: DecisionLane = {
    status: input.affiliateApprovalPending ? "ATTENTION" : "OK",
    count: input.affiliateApprovalPending ? 1 : 0,
    top_items: input.affiliateApprovalPending ? ["pending_non_amazon_affiliate_programs"] : undefined,
    blocker: input.affiliateApprovalPending ? "affiliate_approval_pending" : null,
    next_agent_action: "Refresh affiliate tracker JSON read-only; no network submissions from this script.",
    next_owner_action: "Submit and track affiliate program approvals in operator workflow outside this repo task.",
    do_not_touch: undefined,
  };

  const coverageStatus: DecisionLane["status"] =
    input.commandSurfaceHealthStatus === "CRITICAL"
      ? "BLOCKED"
      : input.commandSurfaceHealthStatus === "WARNING"
        ? "ATTENTION"
        : "OK";

  const coverageLane: DecisionLane = {
    status: coverageStatus,
    count: input.commandSurfaceReasons.length,
    top_items: input.commandSurfaceReasons.slice(0, 5),
    blocker: coverageStatus !== "OK" ? input.commandSurfaceReasons[0] ?? "command_surface_health" : null,
    next_agent_action: "Run buckparts:command-surface read-only; investigate metrics deltas before any DB mutation.",
    next_owner_action: "Decide whether WARNING/CRITICAL items block monetization expansion for the current sprint.",
  };

  const recentLane: DecisionLane & { evidence_rollup: EvidenceRollup } = {
    status: "OK",
    count:
      input.evidenceRollup.live_outcome_count +
      input.evidenceRollup.unknown_outcome_count +
      input.evidenceRollup.fail_hold_outcome_count +
      input.evidenceRollup.unclassified_json_count,
    top_items: input.evidenceRollup.recent_evidence_filenames.slice(0, 10),
    blocker: null,
    next_agent_action: "Classify new evidence JSON by filename conventions; avoid over-claiming from unknown shapes.",
    next_owner_action: "Archive superseded evidence with clear filenames; keep UNKNOWN vs LIVE distinction strict.",
    evidence_rollup: input.evidenceRollup,
  };

  const deployLane: DecisionLane = {
    status: "PLACEHOLDER",
    blocker: "not_implemented_in_repo_yet",
    next_agent_action: "No deploy automation in this read-only report path.",
    next_owner_action: "Wire deploy/live-site checks when CI or Netlify contract exists in repo.",
  };

  const revenueLane = buildRevenueSnapshotLane(input.clickVisibility);

  const ownerParts: string[] = [];
  if (human_browser_required_tokens.length > 0) {
    ownerParts.push(
      "Resolve UNKNOWN / human-browser cohort (see unknown_or_human_review) before expanding agent Amazon rescue.",
    );
  }
  if (frozenTokens.length > 0) {
    ownerParts.push("Review frozen_operator_hold tokens in amazon_rescue lane and registry before releasing overlapping agent work.");
  }
  if (input.affiliateApprovalPending) {
    ownerParts.push("Unblock affiliate_readiness for non-Amazon monetization when programs leave pending states.");
  }
  if (coverageStatus === "BLOCKED") {
    ownerParts.push("Address coverage_health CRITICAL before any mutating rescue.");
  }

  const next_owner_action =
    ownerParts.length > 0
      ? ownerParts.join(" ")
      : "No Command Center v2 owner-blocking heuristics fired; continue read-only monitoring.";

  return {
    schema_version: "1",
    generated_at: input.now().toISOString(),
    read_only: true,
    data_mutation: false,
    amazon_rescue: amazonRescue,
    unknown_or_human_review: unknownLane,
    affiliate_readiness: affiliateLane,
    coverage_health: coverageLane,
    recent_evidence: recentLane,
    deploy_live_site_status: deployLane,
    revenue_snapshot: revenueLane,
    next_allowed_agent_token,
    next_owner_action,
  };
}
