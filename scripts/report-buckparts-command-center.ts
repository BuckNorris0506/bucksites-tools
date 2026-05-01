import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildBuckpartsAffiliateTrackerReport } from "./report-buckparts-affiliate-tracker";
import { buildBuckpartsBlockedLinkMoneyQueueReport } from "./report-buckparts-blocked-link-money-queue";
import { buildBuckpartsCommandSurfaceReport } from "./report-buckparts-command-surface";
import { buildFrigidaireDeadOemLinkIdsReport } from "./report-frigidaire-dead-oem-link-ids";
import { buildFrigidaireNextMonetizableCandidatesReport } from "./report-frigidaire-next-monetizable-candidates";
import { buildOemCatalogNextMoneyCohortReport } from "./report-oem-catalog-next-money-cohort";
import {
  buildAmazonFirstBlockedConversionQueueReport,
  type AmazonFirstBlockedConversionQueueReport,
} from "./report-amazon-first-blocked-conversion-queue";

type FlexoffersReadinessReport = {
  report_name: string;
  targets?: Array<{
    slug?: string;
    cta_status?: string;
    demand_compat_rows?: number;
  }>;
};

type EvidenceSummary = {
  file: string;
  top_level_keys: string[];
};

type CommandCenterReport = {
  report_name: "buckparts_command_center_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  system_health_summary: {
    status: "OK" | "WARNING" | "CRITICAL";
    reasons: string[];
    recommended_next_step: string;
  };
  affiliate_readiness_summary: {
    approved_count: number;
    pending_count: number;
    pending_network_or_programs: string[];
    repairclinic_status: string | "UNKNOWN";
    affiliate_approval_pending: boolean;
  };
  top_money_queue: Array<{
    lane: string;
    exhausted: boolean;
    candidate_count: number | "UNKNOWN";
    source_report: string;
    recommended_action: string;
  }>;
  recent_learning_outcomes: {
    frigidaire_dead_oem_outcome: {
      all_resolved: boolean;
      unresolved_count: number;
      recommended_next_action: string;
    };
    evidence_files: EvidenceSummary[];
  };
  blocked_link_summary: {
    total_blocked_links: number | "UNKNOWN";
    top_blocked_state: string | "UNKNOWN";
    top_blocked_retailer_key: string | "UNKNOWN";
    recommended_first_action: string;
  };
  search_and_click_intelligence_summary: {
    runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    window_days: { short: 7; long: 30 };
    search_events: {
      last_7d: number | "UNKNOWN";
      last_30d: number | "UNKNOWN";
      zero_result_last_7d: number | "UNKNOWN";
      zero_result_last_30d: number | "UNKNOWN";
      zero_result_rate_last_7d: number | "UNKNOWN";
      zero_result_rate_last_30d: number | "UNKNOWN";
    };
    search_gaps_backlog: {
      open: number | "UNKNOWN";
      reviewing: number | "UNKNOWN";
      queued: number | "UNKNOWN";
      total_actionable: number | "UNKNOWN";
    };
    click_events: {
      last_7d: number | "UNKNOWN";
      last_30d: number | "UNKNOWN";
    };
    known_unknowns: string[];
  };
  amazon_first_blocked_queue_summary: {
    runtime_status: "OK" | "UNKNOWN";
    source_report: string;
    top_candidate_count: number | "UNKNOWN";
    needs_amazon_search_count: number | "UNKNOWN";
    already_live_noop_count: number | "UNKNOWN";
    top_5_tokens: string[];
    recommended_next_action: string;
  };
  execution_guidance: {
    next_move_mode: "READ_ONLY" | "MUTATING";
    next_move_command: string;
    mutating_blocked: boolean;
    mutating_block_reasons: string[];
    staleness_or_dirty_risk: string[];
  };
  next_best_action: string;
  why_this_action: string;
  operator_can_be_away_status:
    | "NOT_READY"
    | "READY_FOR_ASYNC_REVIEW"
    | "READY_FOR_AUTONOMOUS_READ_ONLY";
  known_unknowns: string[];
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  readDir?: (absolutePath: string) => string[];
  providers?: {
    commandSurface?: typeof buildBuckpartsCommandSurfaceReport;
    affiliateTracker?: typeof buildBuckpartsAffiliateTrackerReport;
    blockedLinkQueue?: typeof buildBuckpartsBlockedLinkMoneyQueueReport;
    oemNextMoneyCohort?: typeof buildOemCatalogNextMoneyCohortReport;
    frigidaireDeadOem?: typeof buildFrigidaireDeadOemLinkIdsReport;
    frigidaireNextCandidates?: typeof buildFrigidaireNextMonetizableCandidatesReport;
    amazonFirstBlockedQueue?: typeof buildAmazonFirstBlockedConversionQueueReport;
  };
};

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function listEvidenceSummaries(args: {
  evidenceDirAbs: string;
  fileExists: (absolutePath: string) => boolean;
  readDir: (absolutePath: string) => string[];
  readTextFile: (absolutePath: string) => string;
}): EvidenceSummary[] {
  if (!args.fileExists(args.evidenceDirAbs)) return [];
  const files = args.readDir(args.evidenceDirAbs).filter((name) => name.endsWith(".json")).sort();
  return files.map((file) => {
    const abs = path.resolve(args.evidenceDirAbs, file);
    const parsed = safeJsonParse(args.readTextFile(abs));
    const topLevelKeys =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed as Record<string, unknown>).sort()
        : [];
    return {
      file,
      top_level_keys: topLevelKeys,
    };
  });
}

function getFlexoffersReadiness(args: {
  reportAbsPath: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): FlexoffersReadinessReport | null {
  if (!args.fileExists(args.reportAbsPath)) return null;
  const parsed = safeJsonParse(args.readTextFile(args.reportAbsPath));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as FlexoffersReadinessReport;
}

function trackerRowsFromText(text: string): unknown[] {
  const parsed = safeJsonParse(text);
  return Array.isArray(parsed) ? parsed : [];
}

function amazonAssociatesTagVerified(rows: unknown[]): boolean {
  const amazon = rows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { id?: string }).id === "amazon-associates",
  ) as { status?: string; tagVerified?: boolean | null } | undefined;
  return (
    typeof amazon?.status === "string" &&
    amazon.status.trim().toUpperCase() === "APPROVED" &&
    amazon.tagVerified === true
  );
}

function hasNonAmazonApprovedAffiliate(rows: unknown[]): boolean {
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const r = item as { id?: string; status?: string };
    if (r.id === "amazon-associates") continue;
    if (typeof r.status === "string" && r.status.trim().toUpperCase() === "APPROVED") return true;
  }
  return false;
}

function buildAmazonFirstBlockedQueueSummary(
  report: AmazonFirstBlockedConversionQueueReport,
): CommandCenterReport["amazon_first_blocked_queue_summary"] {
  const unknown: CommandCenterReport["amazon_first_blocked_queue_summary"] = {
    runtime_status: "UNKNOWN",
    source_report: report.report_name,
    top_candidate_count: "UNKNOWN",
    needs_amazon_search_count: "UNKNOWN",
    already_live_noop_count: "UNKNOWN",
    top_5_tokens: [],
    recommended_next_action:
      "Amazon-first queue unavailable; restore Supabase read access and rerun buckparts:amazon-first-blocked-queue.",
  };

  if (
    report.total_pool_rows === "UNKNOWN" ||
    report.top_candidates === "UNKNOWN" ||
    report.needs_amazon_search_count === "UNKNOWN"
  ) {
    return unknown;
  }

  const topList = report.top_candidates;
  const top5 = topList
    .slice(0, 5)
    .map((row) => (typeof row.token === "string" ? row.token : String(row.token)))
    .filter((t) => t !== "UNKNOWN");

  const firstSearch = topList.find((row) => row.recommended_next_action === "SEARCH_AMAZON_EXACT_TOKEN");
  const recommended =
    firstSearch != null
      ? `SEARCH_AMAZON_EXACT_TOKEN starting with ${firstSearch.recommended_search_query || firstSearch.token} (then work down the top cohort).`
      : topList.length === 0 && report.needs_amazon_search_count > 0
        ? "Pool has SEARCH work but top cohort is empty after filters; rerun queue report or inspect HOLD/UNKNOWN rows."
        : "Review top cohort actions (may be HOLD_AFFILIATE_NOT_READY or UNKNOWN_REVIEW_REQUIRED).";

  return {
    runtime_status: "OK",
    source_report: report.report_name,
    top_candidate_count: topList.length,
    needs_amazon_search_count: report.needs_amazon_search_count,
    already_live_noop_count: report.already_live_noop_count,
    top_5_tokens: top5,
    recommended_next_action: recommended,
  };
}

export async function buildBuckpartsCommandCenterReport(
  options: BuildOptions = {},
): Promise<CommandCenterReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const readDir = options.readDir ?? readdirSync;
  const providers = options.providers ?? {};

  const commandSurfaceBuilder = providers.commandSurface ?? buildBuckpartsCommandSurfaceReport;
  const affiliateTrackerBuilder = providers.affiliateTracker ?? buildBuckpartsAffiliateTrackerReport;
  const blockedQueueBuilder = providers.blockedLinkQueue ?? buildBuckpartsBlockedLinkMoneyQueueReport;
  const oemNextBuilder = providers.oemNextMoneyCohort ?? buildOemCatalogNextMoneyCohortReport;
  const frigidaireDeadBuilder = providers.frigidaireDeadOem ?? buildFrigidaireDeadOemLinkIdsReport;
  const frigidaireNextBuilder =
    providers.frigidaireNextCandidates ?? buildFrigidaireNextMonetizableCandidatesReport;
  const amazonFirstBuilder = providers.amazonFirstBlockedQueue ?? buildAmazonFirstBlockedConversionQueueReport;

  const trackerText = readTextFile(path.resolve(rootDir, "data/affiliate/affiliate-application-tracker.json"));
  const trackerRows = trackerRowsFromText(trackerText);

  const [
    commandSurface,
    affiliateTracker,
    blockedQueue,
    oemNextMoney,
    frigidaireDeadOem,
    frigidaireNextCandidates,
    amazonFirstBlocked,
  ] = await Promise.all([
    commandSurfaceBuilder({ rootDir }),
    Promise.resolve(affiliateTrackerBuilder({ rootDir })),
    blockedQueueBuilder(),
    oemNextBuilder(),
    frigidaireDeadBuilder(),
    frigidaireNextBuilder(),
    amazonFirstBuilder(),
  ]);

  const amazonFirstSummary = buildAmazonFirstBlockedQueueSummary(amazonFirstBlocked);
  const fallbackSearchAndClickSummary: CommandCenterReport["search_and_click_intelligence_summary"] = {
    runtime_status: "UNKNOWN_NOT_QUERIED",
    window_days: { short: 7, long: 30 },
    search_events: {
      last_7d: "UNKNOWN",
      last_30d: "UNKNOWN",
      zero_result_last_7d: "UNKNOWN",
      zero_result_last_30d: "UNKNOWN",
      zero_result_rate_last_7d: "UNKNOWN",
      zero_result_rate_last_30d: "UNKNOWN",
    },
    search_gaps_backlog: {
      open: "UNKNOWN",
      reviewing: "UNKNOWN",
      queued: "UNKNOWN",
      total_actionable: "UNKNOWN",
    },
    click_events: {
      last_7d: "UNKNOWN",
      last_30d: "UNKNOWN",
    },
    known_unknowns: [
      "search_and_click_intelligence_summary unavailable from command_surface provider.",
    ],
  };
  const searchAndClickSummary =
    commandSurface &&
    typeof commandSurface === "object" &&
    "search_and_click_intelligence_summary" in commandSurface
      ? (commandSurface as { search_and_click_intelligence_summary: CommandCenterReport["search_and_click_intelligence_summary"] })
          .search_and_click_intelligence_summary
      : fallbackSearchAndClickSummary;

  const evidenceDirAbs = path.resolve(rootDir, "data/evidence");
  const evidenceFiles = listEvidenceSummaries({
    evidenceDirAbs,
    fileExists,
    readDir,
    readTextFile,
  });
  const flexoffersReadiness = getFlexoffersReadiness({
    reportAbsPath: path.resolve(rootDir, "data/reports/flexoffers-readiness-refrigerator-water.json"),
    fileExists,
    readTextFile,
  });

  const pendingStatuses = new Set(["NOT_STARTED", "DRAFTING", "SUBMITTED", "IN_REVIEW", "REAPPLY_REQUIRED"]);
  const pendingNetworkOrPrograms: string[] = [];
  for (const [status, count] of Object.entries(affiliateTracker.status_counts)) {
    if (pendingStatuses.has(status) && count > 0) {
      pendingNetworkOrPrograms.push(`${status}:${count}`);
    }
  }
  let repairclinicStatus: string | "UNKNOWN" = "UNKNOWN";
  const record = trackerRows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { id?: string }).id === "repairclinic",
  ) as { status?: string } | undefined;
  if (record?.status) repairclinicStatus = record.status;

  const affiliateApprovalPending = pendingNetworkOrPrograms.length > 0;
  const frigidaireLaneExhausted =
    frigidaireNextCandidates.runtime_status === "OK" &&
    frigidaireNextCandidates.candidates.length === 0;

  const topMoneyQueue: CommandCenterReport["top_money_queue"] = [
    {
      lane: "oem_catalog_next_money",
      exhausted:
        oemNextMoney.total_remaining_rows !== "UNKNOWN" &&
        oemNextMoney.total_remaining_rows === 0,
      candidate_count: oemNextMoney.total_remaining_rows,
      source_report: oemNextMoney.report_name,
      recommended_action: oemNextMoney.recommended_next_cohort,
    },
    {
      lane: "frigidaire_next_monetizable",
      exhausted: frigidaireLaneExhausted,
      candidate_count:
        frigidaireNextCandidates.runtime_status === "OK"
          ? frigidaireNextCandidates.candidates.length
          : "UNKNOWN",
      source_report: frigidaireNextCandidates.report_name,
      recommended_action: frigidaireNextCandidates.recommended_next_action,
    },
    {
      lane: "flexoffers_readiness_refrigerator_water",
      exhausted:
        flexoffersReadiness !== null &&
        Array.isArray(flexoffersReadiness.targets) &&
        flexoffersReadiness.targets.length === 0,
      candidate_count:
        flexoffersReadiness !== null && Array.isArray(flexoffersReadiness.targets)
          ? flexoffersReadiness.targets.length
          : "UNKNOWN",
      source_report: flexoffersReadiness?.report_name ?? "flexoffers_readiness_report_missing",
      recommended_action:
        flexoffersReadiness !== null
          ? "Prepare pending FlexOffers slots for listed weak/zero-CTA slugs (no link insert)."
          : "Generate FlexOffers readiness report for refrigerator-water weak/zero-CTA demand slugs.",
    },
  ];

  const amazonReady = amazonAssociatesTagVerified(trackerRows);
  const nonAmazonApproved = hasNonAmazonApprovedAffiliate(trackerRows);
  const needsAmazonSearchCount =
    amazonFirstSummary.needs_amazon_search_count !== "UNKNOWN"
      ? amazonFirstSummary.needs_amazon_search_count
      : 0;
  const preferAmazonFirstConversion =
    amazonFirstSummary.runtime_status === "OK" &&
    amazonReady &&
    needsAmazonSearchCount > 0 &&
    !nonAmazonApproved;

  let nextBestAction = "";
  let whyThisAction = "";
  if (preferAmazonFirstConversion) {
    const tokenHint =
      amazonFirstSummary.top_5_tokens.length > 0
        ? amazonFirstSummary.top_5_tokens.join(", ")
        : "see buckparts:amazon-first-blocked-queue";
    nextBestAction = `Prioritize Amazon-first OEM blocked-search rescue: run exact-token Amazon PDP searches and verify buyability for queued refrigerator tokens (${tokenHint}).`;
    whyThisAction =
      "Amazon Associates is APPROVED with verified tag, no other affiliate is APPROVED yet, and the Amazon-first queue reports rows needing SEARCH_AMAZON_EXACT_TOKEN.";
  } else if (affiliateApprovalPending) {
    nextBestAction =
      "Rerun affiliate tracker + command surface and keep FlexOffers readiness queue current until at least one non-Amazon network lane reaches APPROVED.";
    whyThisAction =
      "Affiliate approvals are still pending, so retailer-specific evidence work that cannot monetize now is deprioritized by policy.";
  } else if (!topMoneyQueue[0].exhausted && topMoneyQueue[0].candidate_count !== "UNKNOWN") {
    nextBestAction = topMoneyQueue[0].recommended_action;
    whyThisAction = "OEM catalog money cohort has concrete remaining blocked rows and is currently monetizable.";
  } else if (!topMoneyQueue[1].exhausted) {
    nextBestAction = topMoneyQueue[1].recommended_action;
    whyThisAction = "Frigidaire lane still has candidates after OEM next-money cohort is exhausted.";
  } else if (!topMoneyQueue[2].exhausted) {
    nextBestAction = topMoneyQueue[2].recommended_action;
    whyThisAction = "FlexOffers readiness queue remains available as the next monetization-prep lane.";
  } else {
    nextBestAction = "No actionable queue available; regenerate source reports and re-evaluate lane inputs.";
    whyThisAction = "All current lanes are exhausted or unknown.";
  }

  // Explicit safeguard: never recommend RepairClinic evidence when affiliate is not launch-ready.
  if (
    (repairclinicStatus === "NOT_STARTED" || repairclinicStatus === "DRAFTING") &&
    /repairclinic/i.test(nextBestAction)
  ) {
    nextBestAction =
      "Advance non-RepairClinic queues only (OEM cohort, FlexOffers readiness, and affiliate approvals) until RepairClinic status is submit/review approved.";
    whyThisAction =
      "RepairClinic affiliate lane is not approval-ready, so RepairClinic evidence work is intentionally suppressed.";
  }

  const operatorAwayStatus: CommandCenterReport["operator_can_be_away_status"] =
    nextBestAction.length === 0
      ? "NOT_READY"
      : "READY_FOR_AUTONOMOUS_READ_ONLY";

  const knownUnknowns = [
    ...commandSurface.known_unknowns,
    ...affiliateTracker.known_unknowns.map((item) => `Affiliate tracker: ${item}`),
    ...blockedQueue.known_unknowns.map((item) => `Blocked queue: ${item}`),
    ...oemNextMoney.known_unknowns.map((item) => `OEM next money: ${item}`),
    ...frigidaireNextCandidates.known_unknowns.map((item) => `Frigidaire next candidates: ${item}`),
    ...frigidaireDeadOem.known_unknowns.map((item) => `Frigidaire dead OEM: ${item}`),
    ...amazonFirstBlocked.known_unknowns.map((item) => `Amazon-first blocked queue: ${item}`),
    ...searchAndClickSummary.known_unknowns.map(
      (item) => `Search/click intelligence: ${item}`,
    ),
    flexoffersReadiness === null
      ? "FlexOffers readiness report missing: data/reports/flexoffers-readiness-refrigerator-water.json"
      : null,
  ].filter((value): value is string => typeof value === "string");

  const mutatingBlockedReasons: string[] = [];
  if (commandSurface.system_health.status === "CRITICAL") {
    mutatingBlockedReasons.push("command_surface system_health is CRITICAL");
  }
  if (amazonFirstSummary.runtime_status === "UNKNOWN") {
    mutatingBlockedReasons.push("amazon_first_blocked_queue_summary runtime_status is UNKNOWN");
  }
  if (oemNextMoney.total_remaining_rows === "UNKNOWN") {
    mutatingBlockedReasons.push("oem_catalog_next_money total_remaining_rows is UNKNOWN");
  }
  if (blockedQueue.total_blocked_links === "UNKNOWN") {
    mutatingBlockedReasons.push("blocked_link_summary total_blocked_links is UNKNOWN");
  }
  if (affiliateTracker.records_approved.length === 0) {
    mutatingBlockedReasons.push("affiliate_readiness_summary approved_count is 0");
  }
  if (flexoffersReadiness === null) {
    mutatingBlockedReasons.push(
      "flexoffers_readiness_refrigerator_water report missing (data/reports/flexoffers-readiness-refrigerator-water.json)",
    );
  }
  const mutatingBlocked = mutatingBlockedReasons.length > 0;

  const stalenessOrDirtyRisk: string[] = [];
  if (commandSurface.trend.overall_trend === "UNKNOWN") {
    stalenessOrDirtyRisk.push("trend is UNKNOWN; snapshot comparison is not fully deterministic");
  }
  if (
    commandSurface.known_unknowns.some((item) =>
      item.includes("learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED"),
    )
  ) {
    stalenessOrDirtyRisk.push("learning_outcomes known_unknowns includes UNKNOWN_NOT_QUERIED note");
  }
  if (affiliateTracker.known_unknowns.length > 0) {
    stalenessOrDirtyRisk.push(
      `affiliate tracker has ${affiliateTracker.known_unknowns.length} known_unknown note(s)`,
    );
  }
  if (evidenceFiles.length === 0) {
    stalenessOrDirtyRisk.push("data/evidence has no JSON files for recent outcomes");
  }

  const nextMoveMode: CommandCenterReport["execution_guidance"]["next_move_mode"] =
    /\b(insert|apply|promote|commit|write|update db|mutation)\b/i.test(nextBestAction)
      ? "MUTATING"
      : "READ_ONLY";

  const nextMoveCommand =
    nextMoveMode === "READ_ONLY"
      ? preferAmazonFirstConversion
        ? "npm run buckparts:amazon-first-blocked-queue"
        : affiliateApprovalPending
          ? "npm run buckparts:affiliate-tracker && npm run buckparts:command-surface && npm run buckparts:command-center"
          : !topMoneyQueue[0].exhausted
            ? "npm run buckparts:oem-next-money-cohort"
            : !topMoneyQueue[1].exhausted
              ? "npm run buckparts:frigidaire-next-candidates"
              : "npm run buckparts:command-center"
      : "UNKNOWN";

  return {
    report_name: "buckparts_command_center_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    system_health_summary: {
      status: commandSurface.system_health.status,
      reasons: commandSurface.system_health.reasons,
      recommended_next_step: commandSurface.recommended_next_step,
    },
    affiliate_readiness_summary: {
      approved_count: affiliateTracker.records_approved.length,
      pending_count: pendingNetworkOrPrograms.length,
      pending_network_or_programs: pendingNetworkOrPrograms,
      repairclinic_status: repairclinicStatus,
      affiliate_approval_pending: affiliateApprovalPending,
    },
    top_money_queue: topMoneyQueue,
    recent_learning_outcomes: {
      frigidaire_dead_oem_outcome: {
        all_resolved: frigidaireDeadOem.all_resolved,
        unresolved_count: frigidaireDeadOem.targets.filter((target) => !target.found).length,
        recommended_next_action: frigidaireDeadOem.recommended_next_action,
      },
      evidence_files: evidenceFiles,
    },
    blocked_link_summary: {
      total_blocked_links: blockedQueue.total_blocked_links,
      top_blocked_state:
        blockedQueue.top_blocked_states === "UNKNOWN"
          ? "UNKNOWN"
          : (blockedQueue.top_blocked_states[0]?.state ?? "UNKNOWN"),
      top_blocked_retailer_key:
        blockedQueue.top_blocked_retailer_keys === "UNKNOWN"
          ? "UNKNOWN"
          : (blockedQueue.top_blocked_retailer_keys[0]?.retailer_key ?? "UNKNOWN"),
      recommended_first_action: blockedQueue.recommended_first_action,
    },
    search_and_click_intelligence_summary: searchAndClickSummary,
    amazon_first_blocked_queue_summary: amazonFirstSummary,
    execution_guidance: {
      next_move_mode: nextMoveMode,
      next_move_command: nextMoveCommand,
      mutating_blocked: mutatingBlocked,
      mutating_block_reasons: mutatingBlockedReasons,
      staleness_or_dirty_risk: stalenessOrDirtyRisk,
    },
    next_best_action: nextBestAction,
    why_this_action: whyThisAction,
    operator_can_be_away_status: operatorAwayStatus,
    known_unknowns: knownUnknowns,
  };
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsCommandCenterReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[report-buckparts-command-center] failed", error);
  process.exit(1);
});
