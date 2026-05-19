import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
import { loadAmazonRescueTokenControls } from "./lib/amazon-rescue-token-controls";
import { buildCommandCenterV2Report } from "./lib/buckparts-command-center-v2";
import type {
  CommandCenterV2Report,
  DemandToCoverageEngineV1,
  EvidenceToLearningOutcomesCandidateImportV1,
  LearningOutcomesConfidenceApprovalsLoadedV1,
  LearningOutcomesReadModelV1,
  LiveSiteMonitorV1,
} from "./lib/buckparts-command-center-v2-types";
import { loadLiveSiteMonitorForCommandCenter } from "./lib/load-live-site-monitor-artifact";
import { buildEvidenceInventoryV1, rollupEvidenceDirectory } from "./lib/command-center-evidence-rollup";
import {
  createConfidenceApprovalLookup,
  loadLearningOutcomesConfidenceApprovalsRegistry,
} from "./lib/learning-outcomes-confidence-approvals-registry-v1";
import { buildExternalMeasurementFreshnessV1 } from "../src/lib/owner-dashboard/external-measurement-freshness-v1";
import { buildOwnerIntegritySentinelV1 } from "../src/lib/owner-dashboard/owner-integrity-sentinel-v1";
import { buildOwnerQuarantinedFridgeModelsV1 } from "../src/lib/owner-dashboard/owner-quarantined-fridge-models-v1";
import { buildOwnerVerticalLaunchPolicyV1 } from "../src/lib/owner-dashboard/owner-vertical-launch-policy-v1";
import { buildDailyOperatorSummaryV1FromReport } from "./lib/buckparts-daily-operator-summary-v1";
import { buildDemandWorkQueueSummaryV1FromReport } from "./lib/buckparts-demand-work-queue-summary-v1";
import { buildFounderDecisionRegistrySummaryV1FromReport } from "./lib/buckparts-founder-decision-registry-summary-v1";
import { buildNextExecutionPacketSummaryV1FromCommandCenterJson } from "./lib/buckparts-next-execution-packet-summary-v1";
import { buildOperatingMapSummaryV1FromReport } from "./lib/buckparts-operating-map-summary-v1";
import { buildSystemContractAuditSummaryV1FromReport } from "./lib/buckparts-system-contract-audit-summary-v1";
import {
  buildPagePublishabilityTruthSummaryV1,
  parseFilterSlugToModelSlugsFromCompatibilityCsv,
  parseRefrigeratorFiltersCatalogCsv,
  tryLoadRefrigeratorFilterCtaJoinBySlugV1,
  tryLoadRefrigeratorUsefulFilterSlugsV1,
  type PagePublishabilityTruthSummaryV1,
} from "./lib/buckparts-page-publishability-truth-v1";
import { runBuckpartsSystemContractAudit } from "./audit-buckparts-system-contracts";
import { runReportFounderDecisionRegistryV1 } from "./report-founder-decision-registry";
import { runReportBuckpartsOperatingMap } from "./report-buckparts-operating-map";
import {
  buildOwnerCommandCenterNeuronsForReport,
  type OwnerCommandCenterNeuronsReport,
} from "../src/lib/owner-dashboard/owner-command-center-neurons-v1";

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
  money_funnel_summary: {
    runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    window_days: { short: 7; long: 30 };
    stages_30d: {
      search_events_total: number | "UNKNOWN";
      search_zero_result_total: number | "UNKNOWN";
      search_gap_actionable_total: number | "UNKNOWN";
      click_events_total: number | "UNKNOWN";
      safe_cta_links_total: number | "UNKNOWN";
    };
    derived_rates_30d: {
      zero_result_rate: number | "UNKNOWN";
      clicks_per_search_event: number | "UNKNOWN";
    };
    known_unknowns: string[];
  };
  rescue_velocity_summary: {
    runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    window_days: { short: 7; long: 30 };
    current_backlog: {
      blocked_or_unsafe_links: number | "UNKNOWN";
      blocked_search_or_discovery: number | "UNKNOWN";
      search_gap_actionable_total: number | "UNKNOWN";
    };
    resolved_signals: {
      safe_cta_links_total: number | "UNKNOWN";
      direct_buyable_links_total: number | "UNKNOWN";
      learning_outcomes_total: number | "UNKNOWN";
    };
    derived_rates: {
      safe_cta_share_of_known_links: number | "UNKNOWN";
      blocked_to_safe_ratio: number | "UNKNOWN";
    };
    known_unknowns: string[];
  };
  rescue_delta_trend_summary: {
    runtime_status: "OK" | "UNKNOWN_SNAPSHOT_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    window_days: { short: 7; long: 30 };
    current: {
      blocked_or_unsafe_links: number | "UNKNOWN";
      blocked_search_or_discovery: number | "UNKNOWN";
      safe_cta_links_total: number | "UNKNOWN";
      search_gap_actionable_total: number | "UNKNOWN";
    };
    deltas: {
      blocked_or_unsafe_links_delta: number | "UNKNOWN";
      blocked_search_or_discovery_delta: number | "UNKNOWN";
      safe_cta_links_delta: number | "UNKNOWN";
      search_gap_actionable_delta: number | "UNKNOWN";
    };
    net_rescue_direction: "IMPROVING" | "FLAT" | "DEGRADING" | "UNKNOWN";
    known_unknowns: string[];
  };
  amazon_first_blocked_queue_summary: {
    runtime_status: "OK" | "UNKNOWN";
    source_report: string;
    top_candidate_count: number | "UNKNOWN";
    needs_amazon_search_count: number | "UNKNOWN";
    already_live_noop_count: number | "UNKNOWN";
    /** Committed UNKNOWN evidence cohort; ordinary `needs_amazon_search_count` excludes these. */
    unknown_evidence_deferred_count: number;
    /** Up to five tokens from `unknown_evidence_deferred` for quick scanning. */
    deferred_unknown_top_tokens: string[];
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
  /** Owner/operator decision surface (lanes, token controls, evidence rollup). Read-only. */
  command_center_v2: CommandCenterV2Report;
  owner_command_center_neurons: OwnerCommandCenterNeuronsReport;
};

type BuildOptions = {
  rootDir?: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  readDir?: (absolutePath: string) => string[];
  /** When set, skips disk/Supabase live-site monitor load (tests). */
  liveSiteMonitor?: LiveSiteMonitorV1 | null;
  /** When set, skips live `search_gaps` read (tests). */
  demandToCoverageEngineLoader?: () => Promise<DemandToCoverageEngineV1>;
  /** When set, skips live `learning_outcomes` read (tests). */
  learningOutcomesReadModelLoader?: () => Promise<LearningOutcomesReadModelV1>;
  /** When set, skips disk scan for evidence→learning_outcomes candidate import (tests). */
  evidenceToLearningOutcomesCandidateImportLoader?: () => Promise<EvidenceToLearningOutcomesCandidateImportV1>;
  /** When set, skips disk load of confidence approvals registry (tests). */
  learningOutcomesConfidenceApprovalsLoader?: () => LearningOutcomesConfidenceApprovalsLoadedV1;
  /** When set, skips catalog/Supabase joins for page publishability truth (tests). */
  pagePublishabilityTruthSummaryLoader?: () => Promise<PagePublishabilityTruthSummaryV1>;
  providers?: {
    commandSurface?: typeof buildBuckpartsCommandSurfaceReport;
    affiliateTracker?: typeof buildBuckpartsAffiliateTrackerReport;
    blockedLinkQueue?: typeof buildBuckpartsBlockedLinkMoneyQueueReport;
    oemNextMoneyCohort?: typeof buildOemCatalogNextMoneyCohortReport;
    frigidaireDeadOem?: typeof buildFrigidaireDeadOemLinkIdsReport;
    frigidaireNextCandidates?: typeof buildFrigidaireNextMonetizableCandidatesReport;
    amazonFirstBlockedQueue?: typeof buildAmazonFirstBlockedConversionQueueReport;
    clickEventsSnapshot?: () => Promise<import("./lib/buckparts-command-center-v2-types").ClickVisibilitySnapshot>;
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
    unknown_evidence_deferred_count: 0,
    deferred_unknown_top_tokens: [],
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

  const unknownEvidenceDeferredCount =
    typeof report.unknown_evidence_deferred_count === "number" ? report.unknown_evidence_deferred_count : 0;
  const deferredRows = Array.isArray(report.unknown_evidence_deferred) ? report.unknown_evidence_deferred : [];
  const deferredTopTokens = deferredRows
    .slice(0, 5)
    .map((row) => (typeof row.token === "string" ? row.token : String(row.token)))
    .filter((t) => t !== "UNKNOWN");

  const firstSearch = topList.find((row) => row.recommended_next_action === "SEARCH_AMAZON_EXACT_TOKEN");
  let recommended =
    firstSearch != null
      ? `SEARCH_AMAZON_EXACT_TOKEN starting with ${firstSearch.recommended_search_query || firstSearch.token} (then work down the top cohort).`
      : topList.length === 0 && report.needs_amazon_search_count > 0
        ? "Pool has SEARCH work but top cohort is empty after filters; rerun queue report or inspect HOLD/UNKNOWN rows."
        : "Review top cohort actions (may be HOLD_AFFILIATE_NOT_READY or UNKNOWN_REVIEW_REQUIRED).";

  if (unknownEvidenceDeferredCount > 0) {
    const dHint =
      deferredTopTokens.length > 0 ? deferredTopTokens.join(", ") : "see queue unknown_evidence_deferred";
    recommended += ` Separately: ${unknownEvidenceDeferredCount} row(s) have committed review evidence — not ordinary fresh exact-token search targets (HUMAN_BROWSER_VERIFICATION_REQUIRED or NO_SAFE_PDP_FOUND); example tokens: ${dHint}.`;
  }

  return {
    runtime_status: "OK",
    source_report: report.report_name,
    top_candidate_count: topList.length,
    needs_amazon_search_count: report.needs_amazon_search_count,
    already_live_noop_count: report.already_live_noop_count,
    unknown_evidence_deferred_count: unknownEvidenceDeferredCount,
    deferred_unknown_top_tokens: deferredTopTokens,
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

  const clickEventsSnapshotRunner =
    options.providers?.clickEventsSnapshot ??
    (async () => {
      try {
        const { loadEnv } = await import("./lib/load-env");
        const { getSupabaseAdmin } = await import("./lib/supabase-admin");
        const { queryBuckpartsClickEventsSnapshot } = await import("./lib/buckparts-click-events-snapshot");
        loadEnv();
        const supabase = getSupabaseAdmin();
        return await queryBuckpartsClickEventsSnapshot(supabase, now().getTime());
      } catch (e) {
        const { unavailableClickSnapshot } = await import("./lib/buckparts-click-events-snapshot");
        return unavailableClickSnapshot([e instanceof Error ? e.message : "UNKNOWN"]);
      }
    });

  const demandToCoverageLoader =
    options.demandToCoverageEngineLoader ??
    (async () => {
      const { fetchDemandToCoverageEngineV1FromSupabase } = await import("./lib/demand-to-coverage-engine-v1");
      return fetchDemandToCoverageEngineV1FromSupabase();
    });

  const learningOutcomesReadModelLoader =
    options.learningOutcomesReadModelLoader ??
    (async () => {
      const { fetchLearningOutcomesReadModelV1FromSupabase } = await import("./lib/learning-outcomes-read-model-v1");
      return fetchLearningOutcomesReadModelV1FromSupabase({ now });
    });

  const evidenceToLoCandidateLoader =
    options.evidenceToLearningOutcomesCandidateImportLoader ??
    (async () => {
      const { buildEvidenceToLearningOutcomesCandidateImportV1 } = await import(
        "./lib/evidence-to-learning-outcomes-candidate-import-v1"
      );
      return buildEvidenceToLearningOutcomesCandidateImportV1({ rootDir, fileExists, readDir, readTextFile, now });
    });

  const [
    commandSurface,
    affiliateTracker,
    blockedQueue,
    oemNextMoney,
    frigidaireDeadOem,
    frigidaireNextCandidates,
    amazonFirstBlocked,
    clickVisibility,
    liveSiteMonitor,
    demandToCoverageEngine,
    learningOutcomesReadModel,
    evidenceToLearningOutcomesCandidateImport,
  ] = await Promise.all([
    commandSurfaceBuilder({ rootDir }),
    Promise.resolve(affiliateTrackerBuilder({ rootDir })),
    blockedQueueBuilder(),
    oemNextBuilder(),
    frigidaireDeadBuilder(),
    frigidaireNextBuilder(),
    amazonFirstBuilder(),
    clickEventsSnapshotRunner(),
    options.liveSiteMonitor !== undefined
      ? Promise.resolve(options.liveSiteMonitor)
      : loadLiveSiteMonitorForCommandCenter({ rootDir, fileExists, readTextFile }),
    demandToCoverageLoader(),
    learningOutcomesReadModelLoader(),
    evidenceToLoCandidateLoader(),
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
  const fallbackMoneyFunnelSummary: CommandCenterReport["money_funnel_summary"] = {
    runtime_status: "UNKNOWN_NOT_QUERIED",
    window_days: { short: 7, long: 30 },
    stages_30d: {
      search_events_total: "UNKNOWN",
      search_zero_result_total: "UNKNOWN",
      search_gap_actionable_total: "UNKNOWN",
      click_events_total: "UNKNOWN",
      safe_cta_links_total: "UNKNOWN",
    },
    derived_rates_30d: {
      zero_result_rate: "UNKNOWN",
      clicks_per_search_event: "UNKNOWN",
    },
    known_unknowns: [
      "money_funnel_summary unavailable from command_surface provider.",
    ],
  };
  const moneyFunnelSummary =
    commandSurface &&
    typeof commandSurface === "object" &&
    "money_funnel_summary" in commandSurface
      ? (commandSurface as { money_funnel_summary: CommandCenterReport["money_funnel_summary"] })
          .money_funnel_summary
      : fallbackMoneyFunnelSummary;
  const fallbackRescueVelocitySummary: CommandCenterReport["rescue_velocity_summary"] = {
    runtime_status: "UNKNOWN_NOT_QUERIED",
    window_days: { short: 7, long: 30 },
    current_backlog: {
      blocked_or_unsafe_links: "UNKNOWN",
      blocked_search_or_discovery: "UNKNOWN",
      search_gap_actionable_total: "UNKNOWN",
    },
    resolved_signals: {
      safe_cta_links_total: "UNKNOWN",
      direct_buyable_links_total: "UNKNOWN",
      learning_outcomes_total: "UNKNOWN",
    },
    derived_rates: {
      safe_cta_share_of_known_links: "UNKNOWN",
      blocked_to_safe_ratio: "UNKNOWN",
    },
    known_unknowns: [
      "rescue_velocity_summary unavailable from command_surface provider.",
    ],
  };
  const rescueVelocitySummary =
    commandSurface &&
    typeof commandSurface === "object" &&
    "rescue_velocity_summary" in commandSurface
      ? (commandSurface as { rescue_velocity_summary: CommandCenterReport["rescue_velocity_summary"] })
          .rescue_velocity_summary
      : fallbackRescueVelocitySummary;
  const fallbackRescueDeltaTrendSummary: CommandCenterReport["rescue_delta_trend_summary"] = {
    runtime_status: "UNKNOWN_NOT_QUERIED",
    window_days: { short: 7, long: 30 },
    current: {
      blocked_or_unsafe_links: "UNKNOWN",
      blocked_search_or_discovery: "UNKNOWN",
      safe_cta_links_total: "UNKNOWN",
      search_gap_actionable_total: "UNKNOWN",
    },
    deltas: {
      blocked_or_unsafe_links_delta: "UNKNOWN",
      blocked_search_or_discovery_delta: "UNKNOWN",
      safe_cta_links_delta: "UNKNOWN",
      search_gap_actionable_delta: "UNKNOWN",
    },
    net_rescue_direction: "UNKNOWN",
    known_unknowns: [
      "rescue_delta_trend_summary unavailable from command_surface provider.",
    ],
  };
  const rescueDeltaTrendSummary =
    commandSurface &&
    typeof commandSurface === "object" &&
    "rescue_delta_trend_summary" in commandSurface
      ? (commandSurface as { rescue_delta_trend_summary: CommandCenterReport["rescue_delta_trend_summary"] })
          .rescue_delta_trend_summary
      : fallbackRescueDeltaTrendSummary;

  const evidenceDirAbs = path.resolve(rootDir, "data/evidence");
  const evidenceFiles = listEvidenceSummaries({
    evidenceDirAbs,
    fileExists,
    readDir,
    readTextFile,
  });
  const tokenControlsAbs = path.resolve(rootDir, "data/ops/amazon-rescue-token-controls.json");
  const { entries: tokenRegistryEntries, load_error: tokenRegistryLoadError } = loadAmazonRescueTokenControls({
    absolutePath: tokenControlsAbs,
    fileExists,
    readTextFile,
  });
  const evidenceRollupForV2 = rollupEvidenceDirectory({
    evidenceDirAbs,
    fileExists,
    readDir,
  });
  const evidenceInventoryForV2 = buildEvidenceInventoryV1({
    rootDir,
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
    if (amazonFirstSummary.unknown_evidence_deferred_count > 0) {
      const dTok =
        amazonFirstSummary.deferred_unknown_top_tokens.length > 0
          ? amazonFirstSummary.deferred_unknown_top_tokens.join(", ")
          : "see buckparts:amazon-first-blocked-queue unknown_evidence_deferred";
      nextBestAction += ` Do not treat ${amazonFirstSummary.unknown_evidence_deferred_count} deferred token(s) as the same priority cohort until HUMAN_BROWSER_VERIFICATION_REQUIRED is satisfied (${dTok}).`;
      whyThisAction +=
        " Committed UNKNOWN evidence files demote those filters out of the ordinary exact-token search headline cohort.";
    }
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
    ...moneyFunnelSummary.known_unknowns.map((item) => `Money funnel: ${item}`),
    ...rescueVelocitySummary.known_unknowns.map((item) => `Rescue velocity: ${item}`),
    ...rescueDeltaTrendSummary.known_unknowns.map((item) => `Rescue delta trend: ${item}`),
    flexoffersReadiness === null
      ? "FlexOffers readiness report missing: data/reports/flexoffers-readiness-refrigerator-water.json"
      : null,
    tokenRegistryLoadError != null
      ? `Amazon rescue token controls: ${tokenRegistryLoadError}`
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

  const learningOutcomesConfidenceApprovals =
    options.learningOutcomesConfidenceApprovalsLoader?.() ??
    loadLearningOutcomesConfidenceApprovalsRegistry({ rootDir, fileExists, readTextFile });
  const confidenceApprovalLookup = createConfidenceApprovalLookup(learningOutcomesConfidenceApprovals.valid_approvals);

  const [command_center_v2_base, external_measurement_freshness_v1] = await Promise.all([
    Promise.resolve(
      buildCommandCenterV2Report({
        now,
        rootDir,
        fileExists,
        readTextFile,
        registryPath: path.relative(rootDir, tokenControlsAbs) || "data/ops/amazon-rescue-token-controls.json",
        registryEntries: tokenRegistryEntries,
        registryLoadError: tokenRegistryLoadError,
        evidenceRollup: evidenceRollupForV2,
        evidenceInventory: evidenceInventoryForV2,
        amazonFirstBlocked,
        commandSurfaceHealthStatus: commandSurface.system_health.status,
        commandSurfaceReasons: commandSurface.system_health.reasons,
        affiliateApprovalPending,
        affiliateApprovedCount: affiliateTracker.records_approved.length,
        clickVisibility,
        liveSiteMonitor,
        demandToCoverageEngine,
        learningOutcomesReadModel,
        evidenceToLearningOutcomesCandidateImport,
        learningOutcomesConfidenceApprovals,
        confidenceApprovalLookup,
      }),
    ),
    buildExternalMeasurementFreshnessV1({ rootDir, deps: { now } }),
  ]);
  const command_center_v2_core: Omit<
    CommandCenterV2Report,
    | "owner_integrity_sentinel_v1"
    | "owner_quarantined_fridge_models_v1"
    | "owner_vertical_launch_policy_v1"
    | "daily_operator_summary_v1"
    | "demand_work_queue_summary_v1"
    | "system_contract_audit_summary_v1"
    | "founder_decision_registry_summary_v1"
    | "next_execution_packet_summary_v1"
    | "operating_map_summary_v1"
    | "page_publishability_truth_summary_v1"
  > = {
    ...command_center_v2_base,
    external_measurement_freshness_v1,
    command_center_brain_coverage_manifest_v1: command_center_v2_base.command_center_brain_coverage_manifest_v1,
    brain_integrity_gate_v1: command_center_v2_base.brain_integrity_gate_v1,
  };

  const owner_quarantined_fridge_models_v1 = await buildOwnerQuarantinedFridgeModelsV1();
  const owner_vertical_launch_policy_v1 = buildOwnerVerticalLaunchPolicyV1();

  const owner_integrity_sentinel_v1 = buildOwnerIntegritySentinelV1({
    report: {
      generated_at: now().toISOString(),
      system_health_summary: {
        status: commandSurface.system_health.status,
      },
      affiliate_readiness_summary: {
        approved_count: affiliateTracker.records_approved.length,
        pending_count: pendingNetworkOrPrograms.length,
        repairclinic_status: repairclinicStatus,
      },
      search_and_click_intelligence_summary: searchAndClickSummary,
      money_funnel_summary: moneyFunnelSummary,
      rescue_velocity_summary: rescueVelocitySummary,
      rescue_delta_trend_summary: rescueDeltaTrendSummary,
      amazon_first_blocked_queue_summary: amazonFirstSummary,
      command_center_v2: command_center_v2_core,
    },
    commandSurface: {
      generated_at: commandSurface.generated_at,
      known_unknowns: commandSurface.known_unknowns,
    },
  });

  const filtersCsvPath = path.resolve(rootDir, "data/filters.csv");
  const compatCsvPath = path.resolve(rootDir, "data/compatibility_mappings.csv");
  const refrigeratorCatalogRows = fileExists(filtersCsvPath)
    ? parseRefrigeratorFiltersCatalogCsv(readTextFile(filtersCsvPath))
    : [];
  const refrigeratorFilterSlugToModels = fileExists(compatCsvPath)
    ? parseFilterSlugToModelSlugsFromCompatibilityCsv(readTextFile(compatCsvPath))
    : new Map<string, string[]>();

  const pagePublishabilityTruthLoader =
    options.pagePublishabilityTruthSummaryLoader ??
    (async () => {
      const [indexable_slugs, cta_join_by_filter_slug] = await Promise.all([
        tryLoadRefrigeratorUsefulFilterSlugsV1(),
        tryLoadRefrigeratorFilterCtaJoinBySlugV1(refrigeratorFilterSlugToModels),
      ]);
      return buildPagePublishabilityTruthSummaryV1({
        generated_at: now().toISOString(),
        catalog_rows: refrigeratorCatalogRows,
        evidence_inventory: command_center_v2_core.recent_evidence.evidence_inventory,
        filter_slug_to_model_slugs: refrigeratorFilterSlugToModels,
        indexable_slugs,
        cta_join_by_filter_slug,
        affiliate_approval_pending: affiliateApprovalPending,
        commission_or_revenue: "NOT_CONNECTED",
      });
    });

  const page_publishability_truth_summary_v1 = await pagePublishabilityTruthLoader();

  const command_center_v2_before_daily: Omit<
    CommandCenterV2Report,
    | "daily_operator_summary_v1"
    | "demand_work_queue_summary_v1"
    | "system_contract_audit_summary_v1"
    | "founder_decision_registry_summary_v1"
    | "next_execution_packet_summary_v1"
    | "operating_map_summary_v1"
  > = {
    ...command_center_v2_core,
    owner_quarantined_fridge_models_v1,
    owner_vertical_launch_policy_v1,
    owner_integrity_sentinel_v1,
    page_publishability_truth_summary_v1,
  };

  const commandCenterShellForDaily = {
    report_name: "buckparts_command_center_v1" as const,
    generated_at: now().toISOString(),
    read_only: true as const,
    data_mutation: false as const,
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
    money_funnel_summary: moneyFunnelSummary,
    rescue_velocity_summary: rescueVelocitySummary,
    rescue_delta_trend_summary: rescueDeltaTrendSummary,
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
    command_center_v2: command_center_v2_before_daily,
    owner_command_center_neurons: null as unknown,
  };

  const { buildBuckpartsDailyOperatorReport } = await import("./report-buckparts-daily-operator");
  const dailyOperatorFull = await buildBuckpartsDailyOperatorReport({
    rootDir,
    now,
    providers: {
      commandCenter: async () =>
        commandCenterShellForDaily as Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
      commandSurface: async () => commandSurface,
      liveSiteSmokeCheck: async () => {
        if (liveSiteMonitor) return liveSiteMonitor;
        throw new Error(
          "Live-site monitor artifact unavailable during Command Center build; daily operator live-site signal is UNKNOWN.",
        );
      },
    },
  });
  const daily_operator_summary_v1 = buildDailyOperatorSummaryV1FromReport(dailyOperatorFull);

  const command_center_v2_before_demand: Omit<
    CommandCenterV2Report,
    | "demand_work_queue_summary_v1"
    | "system_contract_audit_summary_v1"
    | "founder_decision_registry_summary_v1"
    | "next_execution_packet_summary_v1"
    | "operating_map_summary_v1"
  > = {
    ...command_center_v2_before_daily,
    daily_operator_summary_v1,
  };

  const { buildBuckpartsDemandWorkQueueReport } = await import("./report-buckparts-demand-work-queue");
  const demandWorkQueueFull = await buildBuckpartsDemandWorkQueueReport({
    rootDir,
    now,
    providers: {
      dailyOperator: async () => dailyOperatorFull,
    },
  });
  const demand_work_queue_summary_v1 = buildDemandWorkQueueSummaryV1FromReport(demandWorkQueueFull);

  const systemContractAuditFull = runBuckpartsSystemContractAudit({ rootDir });
  const system_contract_audit_summary_v1 = buildSystemContractAuditSummaryV1FromReport(systemContractAuditFull, {
    generated_at: now().toISOString(),
  });

  const founderDecisionRegistryFull = runReportFounderDecisionRegistryV1(rootDir);
  const founder_decision_registry_summary_v1 =
    buildFounderDecisionRegistrySummaryV1FromReport(founderDecisionRegistryFull);

  const operatingMapFull = runReportBuckpartsOperatingMap();
  const operating_map_summary_v1 = buildOperatingMapSummaryV1FromReport(operatingMapFull);

  const command_center_v2_before_next_packet: Omit<CommandCenterV2Report, "next_execution_packet_summary_v1"> = {
    ...command_center_v2_before_demand,
    daily_operator_summary_v1,
    demand_work_queue_summary_v1,
    system_contract_audit_summary_v1,
    founder_decision_registry_summary_v1,
    operating_map_summary_v1,
  };

  const commandCenterShellForNextPacket = {
    ...commandCenterShellForDaily,
    command_center_v2: command_center_v2_before_next_packet,
  };

  const next_execution_packet_summary_v1 = buildNextExecutionPacketSummaryV1FromCommandCenterJson({
    commandCenterJson: commandCenterShellForNextPacket,
    command_center_ok: true,
    now,
  });

  const command_center_v2: CommandCenterV2Report = {
    ...command_center_v2_before_next_packet,
    next_execution_packet_summary_v1,
  };

  const brainGate = command_center_v2.brain_integrity_gate_v1;
  if (brainGate.brain_status === "STOP_THE_LINE") {
    nextBestAction = brainGate.next_brain_action;
    whyThisAction = brainGate.lane_work_allowed_reason;
  } else if (brainGate.brain_status === "PROCEED_WITH_KNOWN_LIMITS") {
    const brainCaveat = brainGate.proven_facts.find((f) => f.startsWith("BRAIN_CAVEAT:"));
    if (brainCaveat) {
      whyThisAction = `${whyThisAction} ${brainCaveat}`;
    }
  }

  const owner_command_center_neurons = await buildOwnerCommandCenterNeuronsForReport({
    rootDir,
    pageState: commandSurface?.state_system_metrics?.page_state ?? null,
    gscPresence: commandSurface?.gsc_exports_present ?? null,
    searchAndClickIntelligenceSummary: searchAndClickSummary,
    clickVisibility: command_center_v2.revenue_snapshot.click_visibility ?? null,
    affiliateReadiness: {
      lane: command_center_v2.affiliate_readiness,
      summary: {
        approved_count: affiliateTracker.records_approved.length,
        pending_count: pendingNetworkOrPrograms.length,
        pending_network_or_programs: pendingNetworkOrPrograms,
        repairclinic_status: repairclinicStatus,
        affiliate_approval_pending: affiliateApprovalPending,
      },
      commission_or_revenue:
        command_center_v2.revenue_snapshot.click_visibility?.commission_or_revenue ?? "NOT_CONNECTED",
    },
    ctaCoverageHealth:
      commandSurface?.cta_coverage_metrics != null
        ? {
            coverageLane: command_center_v2.coverage_health,
            ctaCoverage: commandSurface.cta_coverage_metrics,
            blockedRemediation: commandSurface.blocked_retailer_link_remediation,
          }
        : null,
    batchProductionOwnerDecisionsLane: command_center_v2.batch_production_owner_decisions_lane_v1,
  });

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
    money_funnel_summary: moneyFunnelSummary,
    rescue_velocity_summary: rescueVelocitySummary,
    rescue_delta_trend_summary: rescueDeltaTrendSummary,
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
    command_center_v2,
    owner_command_center_neurons,
  };
}

/** Omits internal-only full candidate list from JSON stdout so artifacts stay display-capped; insert plan already evaluated in-process. */
export function stripEvidenceUncappedCandidatesForStdout(
  report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>>,
): Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>> {
  const imp = report.command_center_v2.evidence_to_learning_outcomes_candidate_import_v1;
  if (imp.candidates_evaluated_uncapped_v1 === undefined) return report;
  const { candidates_evaluated_uncapped_v1: _omit, ...restImp } = imp;
  return {
    ...report,
    command_center_v2: {
      ...report.command_center_v2,
      evidence_to_learning_outcomes_candidate_import_v1: restImp,
    },
  };
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsCommandCenterReport();
  process.stdout.write(`${JSON.stringify(stripEvidenceUncappedCandidatesForStdout(report), null, 2)}\n`);
}

const entryHref = pathToFileURL(path.resolve(process.argv[1] ?? "")).href;
if (import.meta.url === entryHref) {
  main().catch((error) => {
    console.error("[report-buckparts-command-center] failed", error);
    process.exit(1);
  });
}
