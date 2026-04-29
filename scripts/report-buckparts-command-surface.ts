import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import {
  AFFILIATE_APPLICATION_STATUSES,
  type AffiliateApplicationRecord,
  type AffiliateApplicationStatus,
  isValidAffiliateApplicationRecord,
} from "@/lib/affiliates/affiliate-application-status";
import { classifyPageState } from "@/lib/page-state/page-state";
import { classifyPublishabilityState } from "@/lib/page-state/publishability-state";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

type BoolMap = Record<string, boolean>;
type UnknownableNumber = number | "UNKNOWN";
type LearningOutcomesMetricsRow = {
  outcome: string | null;
  cta_status: string | null;
  confidence: string | null;
  date_checked: string | null;
};
type CtaCoverageRow = {
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
  gate_failure_kind?: string | null;
};

export type CommandSurfaceReport = {
  report_name: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  cleanup_progress: {
    status: "PINNED_MANUAL";
    completed_steps: 20;
    total_steps: 20;
    reason: "Manual Phase 1 cleanup counter; not auto-computed.";
  };
  source_files_checked: string[];
  contract_modules_present: {
    page_state: boolean;
    publishability_state: boolean;
    provenance_record: boolean;
    wrong_purchase_risk: boolean;
    replacement_chain: boolean;
    no_buy_reason: boolean;
    retailer_link_state: boolean;
  };
  docs_present: {
    operating_map: boolean;
    script_classification_manifest: boolean;
  };
  gsc_exports_present: {
    sitemap_xml: boolean;
    coverage_zip: boolean;
    performance_zip: boolean;
  };
  learning_outcomes_contract: {
    migration_present: boolean;
    table_runtime_status: "OK" | "UNKNOWN_NOT_QUERIED" | "UNKNOWN_DB_UNAVAILABLE";
  };
  learning_outcomes_metrics: {
    source: "public.learning_outcomes";
    runtime_status: "OK" | "UNKNOWN_NOT_QUERIED" | "UNKNOWN_DB_UNAVAILABLE";
    outcome_counts: {
      pass: UnknownableNumber;
      fail: UnknownableNumber;
      blocked: UnknownableNumber;
      unknown: UnknownableNumber;
    };
    cta_status_counts: {
      live: UnknownableNumber;
      not_live: UnknownableNumber;
      blocked: UnknownableNumber;
    };
    confidence_counts: {
      exact: UnknownableNumber;
      likely: UnknownableNumber;
      uncertain: UnknownableNumber;
    };
    recency: {
      max_days_since_checked: UnknownableNumber;
      median_days_since_checked: UnknownableNumber;
    };
  };
  cta_coverage_metrics: {
    source: "supabase_retailer_links";
    runtime_status: "OK" | "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED";
    total_retailer_links: number | "UNKNOWN";
    direct_buyable_links: number | "UNKNOWN";
    safe_cta_links: number | "UNKNOWN";
    blocked_or_unsafe_links: number | "UNKNOWN";
    missing_browser_truth_links: number | "UNKNOWN";
    retailer_counts: Record<string, number> | "UNKNOWN";
  };
  retailer_link_state_metrics: {
    source: "derived_from_cta_coverage_dataset";
    runtime_status: "OK" | "UNKNOWN";
    distribution: Record<string, number> | "UNKNOWN";
    total_links: number | "UNKNOWN";
  };
  blocked_retailer_link_remediation: {
    source: "derived_from_cta_coverage_dataset";
    runtime_status: "OK" | "UNKNOWN";
    top_blocked_states: Array<{ state: string; count: number }> | "UNKNOWN";
    top_blocked_retailer_keys: Array<{ retailer_key: string; count: number }> | "UNKNOWN";
    recommended_next_action: string;
  };
  state_system_metrics: {
    source: "local_contracts_and_available_local_data";
    runtime_status: "OK" | "PARTIAL" | "UNKNOWN_NO_DATA";
    page_state: {
      computable: boolean;
      distribution: Record<string, number> | "UNKNOWN";
      reason: string;
    };
    publishability_state: {
      computable: boolean;
      distribution: Record<string, number> | "UNKNOWN";
      reason: string;
    };
    retailer_link_state: {
      computable: boolean;
      distribution: Record<string, number> | "UNKNOWN";
      reason: string;
    };
    no_buy_reason: {
      computable: boolean;
      distribution: Record<string, number> | "UNKNOWN";
      reason: string;
    };
    wrong_purchase_risk: {
      computable: boolean;
      distribution: Record<string, number> | "UNKNOWN";
      reason: string;
    };
    replacement_safety: {
      computable: boolean;
      safe_count: number | "UNKNOWN";
      unsafe_count: number | "UNKNOWN";
      reason: string;
    };
  };
  affiliate_tracker: {
    tracker_present: boolean;
    record_count: number | null;
    status_counts: Record<AffiliateApplicationStatus, number> | null;
    reapply_required_count: number | null;
    approved_count: number | null;
    tag_verification: {
      verified_count: number;
      unverified_count: number;
      unknown_count: number;
      unverified_records: string[];
    } | null;
    known_unknowns: string[];
    health: {
      status: "OK" | "ACTION_REQUIRED" | "UNKNOWN";
      reason: string;
    };
  };
  trend: {
    comparison_basis: "previous_local_snapshot";
    previous_snapshot_present: boolean;
    delta_summary: {
      learning_outcomes_runtime_status_changed: boolean | "UNKNOWN";
      affiliate_health_changed: boolean | "UNKNOWN";
      reapply_required_delta: number | "UNKNOWN";
    };
    overall_trend: "IMPROVING" | "DEGRADING" | "FLAT" | "UNKNOWN";
    reason: string;
  };
  system_health: {
    status: "OK" | "WARNING" | "CRITICAL";
    reasons: string[];
  };
  snapshot_written: boolean;
  snapshot_path: "data/reports/buckparts-command-surface.json";
  known_unknowns: string[];
  recommended_next_step: string;
};

type BuildOptions = {
  rootDir?: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  now?: () => Date;
  fetchLearningOutcomesRows?: () => Promise<LearningOutcomesMetricsRow[]>;
  skipLearningOutcomesQuery?: boolean;
  fetchCtaCoverageRows?: () => Promise<CtaCoverageRow[]>;
  skipCtaCoverageQuery?: boolean;
};

type RunOptions = BuildOptions & {
  writeSnapshot?: boolean;
};

function resolvePaths(rootDir: string) {
  const rel = {
    page_state: "src/lib/page-state/page-state.ts",
    publishability_state: "src/lib/page-state/publishability-state.ts",
    provenance_record: "src/lib/provenance/provenance-record.ts",
    wrong_purchase_risk: "src/lib/risk/wrong-purchase-risk.ts",
    replacement_chain: "src/lib/replacement/replacement-chain.ts",
    no_buy_reason: "src/lib/no-buy/no-buy-reason.ts",
    retailer_link_state: "src/lib/retailers/retailer-link-state.ts",
    operating_map: "docs/buckparts-operating-map.md",
    script_classification_manifest: "docs/buckparts-script-classification-manifest.md",
    sitemap_xml: "data/gsc/sitemap.xml",
    coverage_zip: "data/gsc/buckparts.com-Coverage-2026-04-28.zip",
    performance_zip: "data/gsc/buckparts.com-Performance-on-Search-2026-04-28.zip",
    learning_outcomes_migration:
      "supabase/migrations/20260428200500_learning_outcomes.sql",
    affiliate_tracker_json: "data/affiliate/affiliate-application-tracker.json",
    previous_command_surface_snapshot:
      "data/reports/buckparts-command-surface.json",
  } as const;

  const abs = Object.fromEntries(
    Object.entries(rel).map(([k, v]) => [k, path.resolve(rootDir, v)]),
  ) as Record<keyof typeof rel, string>;

  return { rel, abs };
}

function pickMissing(obj: BoolMap, keys: string[]): string[] {
  return keys.filter((k) => !obj[k]);
}

function buildEmptyAffiliateStatusCounts(): Record<AffiliateApplicationStatus, number> {
  return {
    NOT_STARTED: 0,
    DRAFTING: 0,
    SUBMITTED: 0,
    IN_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    REAPPLY_REQUIRED: 0,
    PAUSED_OR_INACTIVE: 0,
  };
}

function parseAffiliateTracker(raw: string): AffiliateApplicationRecord[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Affiliate tracker must be an array.");
  }
  const out: AffiliateApplicationRecord[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const item = parsed[i];
    if (!isValidAffiliateApplicationRecord(item)) {
      throw new Error(`Invalid affiliate tracker record at index ${i}.`);
    }
    out.push(item);
  }
  return out;
}

function unknownLearningOutcomesMetrics(
  runtime_status: "UNKNOWN_NOT_QUERIED" | "UNKNOWN_DB_UNAVAILABLE",
): CommandSurfaceReport["learning_outcomes_metrics"] {
  return {
    source: "public.learning_outcomes",
    runtime_status,
    outcome_counts: {
      pass: "UNKNOWN",
      fail: "UNKNOWN",
      blocked: "UNKNOWN",
      unknown: "UNKNOWN",
    },
    cta_status_counts: {
      live: "UNKNOWN",
      not_live: "UNKNOWN",
      blocked: "UNKNOWN",
    },
    confidence_counts: {
      exact: "UNKNOWN",
      likely: "UNKNOWN",
      uncertain: "UNKNOWN",
    },
    recency: {
      max_days_since_checked: "UNKNOWN",
      median_days_since_checked: "UNKNOWN",
    },
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function buildLearningOutcomesMetricsFromRows(
  rows: LearningOutcomesMetricsRow[],
  nowDate: Date,
): CommandSurfaceReport["learning_outcomes_metrics"] {
  const outcomeCounts: CommandSurfaceReport["learning_outcomes_metrics"]["outcome_counts"] = {
    pass: 0,
    fail: 0,
    blocked: 0,
    unknown: 0,
  };
  const ctaStatusCounts: CommandSurfaceReport["learning_outcomes_metrics"]["cta_status_counts"] = {
    live: 0,
    not_live: 0,
    blocked: 0,
  };
  const confidenceCounts: CommandSurfaceReport["learning_outcomes_metrics"]["confidence_counts"] = {
    exact: 0,
    likely: 0,
    uncertain: 0,
  };
  const recencyDays: number[] = [];

  for (const row of rows) {
    if (row.outcome === "pass") outcomeCounts.pass += 1;
    else if (row.outcome === "fail") outcomeCounts.fail += 1;
    else if (row.outcome === "blocked") outcomeCounts.blocked += 1;
    else if (row.outcome === "unknown") outcomeCounts.unknown += 1;

    if (row.cta_status === "live") ctaStatusCounts.live += 1;
    else if (row.cta_status === "not_live") ctaStatusCounts.not_live += 1;
    else if (row.cta_status === "blocked") ctaStatusCounts.blocked += 1;

    if (row.confidence === "exact") confidenceCounts.exact += 1;
    else if (row.confidence === "likely") confidenceCounts.likely += 1;
    else if (row.confidence === "uncertain") confidenceCounts.uncertain += 1;

    if (typeof row.date_checked === "string") {
      const parsed = Date.parse(row.date_checked);
      if (!Number.isNaN(parsed)) {
        const days = Math.max(0, (nowDate.getTime() - parsed) / 86400000);
        recencyDays.push(days);
      }
    }
  }

  return {
    source: "public.learning_outcomes",
    runtime_status: "OK",
    outcome_counts: outcomeCounts,
    cta_status_counts: ctaStatusCounts,
    confidence_counts: confidenceCounts,
    recency: {
      max_days_since_checked: recencyDays.length ? Math.max(...recencyDays) : 0,
      median_days_since_checked: recencyDays.length ? median(recencyDays) : 0,
    },
  };
}

async function readLearningOutcomesRowsViaSupabase(): Promise<LearningOutcomesMetricsRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const rows: LearningOutcomesMetricsRow[] = [];
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("learning_outcomes")
      .select("outcome, cta_status, confidence, date_checked")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as LearningOutcomesMetricsRow[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return rows;
}

function unknownCtaCoverageMetrics(
  runtime_status: "UNKNOWN_DB_UNAVAILABLE" | "UNKNOWN_NOT_QUERIED",
): CommandSurfaceReport["cta_coverage_metrics"] {
  return {
    source: "supabase_retailer_links",
    runtime_status,
    total_retailer_links: "UNKNOWN",
    direct_buyable_links: "UNKNOWN",
    safe_cta_links: "UNKNOWN",
    blocked_or_unsafe_links: "UNKNOWN",
    missing_browser_truth_links: "UNKNOWN",
    retailer_counts: "UNKNOWN",
  };
}

function buildCtaCoverageMetricsFromRows(
  rows: CtaCoverageRow[],
): CommandSurfaceReport["cta_coverage_metrics"] {
  let directBuyable = 0;
  let safeCtaLinks = 0;
  let blockedOrUnsafe = 0;
  let missingBrowserTruth = 0;
  const retailerCounts: Record<string, number> = {};

  for (const row of rows) {
    const retailerKey =
      typeof row.retailer_key === "string" && row.retailer_key.trim().length > 0
        ? row.retailer_key
        : "(unknown_retailer)";
    retailerCounts[retailerKey] = (retailerCounts[retailerKey] ?? 0) + 1;

    const cls = row.browser_truth_classification;
    const classificationMissing =
      cls == null || (typeof cls === "string" && cls.trim().length === 0);
    if (classificationMissing) {
      missingBrowserTruth += 1;
    }

    const gateFailure = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });

    if (cls === "direct_buyable") {
      directBuyable += 1;
    }
    if (gateFailure === null) {
      safeCtaLinks += 1;
    } else {
      blockedOrUnsafe += 1;
    }
  }

  return {
    source: "supabase_retailer_links",
    runtime_status: "OK",
    total_retailer_links: rows.length,
    direct_buyable_links: directBuyable,
    safe_cta_links: safeCtaLinks,
    blocked_or_unsafe_links: blockedOrUnsafe,
    missing_browser_truth_links: missingBrowserTruth,
    retailer_counts: retailerCounts,
  };
}

function unknownRetailerLinkStateMetrics(): CommandSurfaceReport["retailer_link_state_metrics"] {
  return {
    source: "derived_from_cta_coverage_dataset",
    runtime_status: "UNKNOWN",
    distribution: "UNKNOWN",
    total_links: "UNKNOWN",
  };
}

function unknownBlockedRetailerLinkRemediation(): CommandSurfaceReport["blocked_retailer_link_remediation"] {
  return {
    source: "derived_from_cta_coverage_dataset",
    runtime_status: "UNKNOWN",
    top_blocked_states: "UNKNOWN",
    top_blocked_retailer_keys: "UNKNOWN",
    recommended_next_action:
      "CTA coverage dataset unavailable; blocked-state remediation queue cannot be derived.",
  };
}

function buildRetailerLinkStateMetricsFromRows(
  rows: CtaCoverageRow[],
): CommandSurfaceReport["retailer_link_state_metrics"] {
  const distribution: Record<string, number> = {};
  for (const row of rows) {
    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    distribution[state] = (distribution[state] ?? 0) + 1;
  }

  return {
    source: "derived_from_cta_coverage_dataset",
    runtime_status: "OK",
    distribution,
    total_links: rows.length,
  };
}

function sortCountsDescThenLexical(
  counts: Record<string, number>,
): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function recommendedBlockedRemediationAction(topState: string | null): string {
  if (topState === "BLOCKED_SEARCH_OR_DISCOVERY") {
    return "Replace search/discovery URLs with direct PDP URLs for highest-volume retailer keys.";
  }
  if (topState === "BLOCKED_BROWSER_TRUTH_UNSAFE") {
    return "Recheck browser-truth evidence for highest-volume unsafe retailer keys.";
  }
  if (topState === "BLOCKED_BROWSER_TRUTH_MISSING") {
    return "Collect browser-truth evidence for rows missing verification.";
  }
  return "Review highest-volume blocked retailer-link states.";
}

function buildBlockedRetailerLinkRemediationFromRows(
  rows: CtaCoverageRow[],
): CommandSurfaceReport["blocked_retailer_link_remediation"] {
  const blockedStateCounts: Record<string, number> = {};
  const blockedRetailerKeyCounts: Record<string, number> = {};

  for (const row of rows) {
    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    if (!state.startsWith("BLOCKED_")) {
      continue;
    }
    blockedStateCounts[state] = (blockedStateCounts[state] ?? 0) + 1;

    const retailerKey =
      typeof row.retailer_key === "string" && row.retailer_key.trim().length > 0
        ? row.retailer_key
        : "(unknown_retailer)";
    blockedRetailerKeyCounts[retailerKey] = (blockedRetailerKeyCounts[retailerKey] ?? 0) + 1;
  }

  const topBlockedStates = sortCountsDescThenLexical(blockedStateCounts).map((entry) => ({
    state: entry.key,
    count: entry.count,
  }));
  const topBlockedRetailerKeys = sortCountsDescThenLexical(blockedRetailerKeyCounts).map(
    (entry) => ({
      retailer_key: entry.key,
      count: entry.count,
    }),
  );

  return {
    source: "derived_from_cta_coverage_dataset",
    runtime_status: "OK",
    top_blocked_states: topBlockedStates,
    top_blocked_retailer_keys: topBlockedRetailerKeys,
    recommended_next_action: recommendedBlockedRemediationAction(
      topBlockedStates[0]?.state ?? null,
    ),
  };
}

async function readCtaCoverageRowsViaSupabase(): Promise<CtaCoverageRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: CtaCoverageRow[] = [];

  const readTable = async (table: string, approvedOnly: boolean) => {
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(table)
        .select(
          "retailer_key,affiliate_url,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
        )
        .range(from, from + pageSize - 1);
      if (approvedOnly) {
        query = query.eq("status", "approved");
      }
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as CtaCoverageRow[];
      rows.push(...chunk);
      if (chunk.length < pageSize) break;
    }
  };

  // Canonical runtime wedges currently covered by command surface and affiliate reports.
  await readTable("retailer_links", false);
  await readTable("air_purifier_retailer_links", true);
  await readTable("whole_house_water_retailer_links", true);
  return rows;
}

function unknownStateDistribution(reason: string) {
  return {
    computable: false,
    distribution: "UNKNOWN" as const,
    reason,
  };
}

function extractSitemapUrls(sitemapText: string): string[] {
  const matches = sitemapText.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) ?? [];
  return matches
    .map((line) => line.replace("<loc>", "").replace("</loc>", "").trim())
    .filter((url) => url.length > 0);
}

function computePageStateDistributionFromSitemap(
  sitemapText: string,
): { distribution: Record<string, number>; pageStates: string[]; urlCount: number } | null {
  const urls = extractSitemapUrls(sitemapText);
  if (urls.length === 0) return null;

  const distribution: Record<string, number> = {};
  const pageStates: string[] = [];
  for (const _url of urls) {
    const state = classifyPageState({
      isIndexable: true,
      validCtaCount: null,
      buyerPathState: null,
      hasDemandSignal: null,
    });
    pageStates.push(state);
    distribution[state] = (distribution[state] ?? 0) + 1;
  }
  return { distribution, pageStates, urlCount: urls.length };
}

function buildStateSystemMetrics(args: {
  checks: BoolMap;
  abs: Record<string, string>;
  readTextFile: (absolutePath: string) => string;
}): CommandSurfaceReport["state_system_metrics"] {
  let pageState = unknownStateDistribution(
    "No local sitemap/page dataset is available to compute PageState distribution.",
  );
  let derivedPageStates: string[] | null = null;
  if (args.checks.sitemap_xml) {
    try {
      const sitemapText = args.readTextFile(args.abs.sitemap_xml);
      const computed = computePageStateDistributionFromSitemap(sitemapText);
      if (computed) {
        derivedPageStates = computed.pageStates;
        pageState = {
          computable: true,
          distribution: computed.distribution,
          reason:
            `Computed from local sitemap URLs only (${computed.urlCount} URLs). ` +
            "Coverage excludes non-sitemap pages and lacks CTA/trust-demand signals, so only partial PageState coverage is represented.",
        };
      } else {
        pageState = unknownStateDistribution(
          "Local sitemap.xml is present but contains no parseable <loc> URLs for PageState computation.",
        );
      }
    } catch {
      pageState = unknownStateDistribution(
        "Local sitemap.xml could not be parsed for PageState computation.",
      );
    }
  }

  let publishabilityState = unknownStateDistribution(
    "No local publishability input dataset is available to compute PublishabilityState distribution.",
  );
  if (derivedPageStates && derivedPageStates.length > 0) {
    const distribution: Record<string, number> = {};
    for (const pageStateValue of derivedPageStates) {
      const publishability = classifyPublishabilityState({
        pageState: pageStateValue as Parameters<typeof classifyPublishabilityState>[0]["pageState"],
        isInfoPage: true,
        hasQualityIssue: null,
        isBlockedOrRetired: null,
      });
      distribution[publishability] = (distribution[publishability] ?? 0) + 1;
    }
    publishabilityState = {
      computable: true,
      distribution,
      reason:
        "Derived from locally computed sitemap-only PageState records. " +
        "Coverage excludes CTA/trust/replacement quality signals not present in sitemap parsing.",
    };
  }
  const retailerLinkState = unknownStateDistribution(
    "Local retailer files do not contain full gate/browser/operator inputs required for canonical RetailerLinkState mapping.",
  );
  const noBuyReason = unknownStateDistribution(
    "No local no-buy event dataset is available to compute NoBuyReason distribution.",
  );
  const wrongPurchaseRisk = unknownStateDistribution(
    "No local risk-signal dataset is available to compute WrongPurchaseRisk distribution.",
  );
  const replacementSafety = {
    computable: false,
    safe_count: "UNKNOWN" as const,
    unsafe_count: "UNKNOWN" as const,
    reason:
      "No local replacement-chain records are available to compute safe/unsafe replacement counts.",
  };

  const computableCount = [
    pageState.computable,
    publishabilityState.computable,
    retailerLinkState.computable,
    noBuyReason.computable,
    wrongPurchaseRisk.computable,
    replacementSafety.computable,
  ].filter(Boolean).length;

  const runtime_status: CommandSurfaceReport["state_system_metrics"]["runtime_status"] =
    computableCount === 0 ? "UNKNOWN_NO_DATA" : computableCount === 6 ? "OK" : "PARTIAL";

  return {
    source: "local_contracts_and_available_local_data",
    runtime_status,
    page_state: pageState,
    publishability_state: publishabilityState,
    retailer_link_state: retailerLinkState,
    no_buy_reason: noBuyReason,
    wrong_purchase_risk: wrongPurchaseRisk,
    replacement_safety: replacementSafety,
  };
}

function healthRank(value: "OK" | "ACTION_REQUIRED" | "UNKNOWN"): number {
  if (value === "OK") return 2;
  if (value === "ACTION_REQUIRED") return 1;
  return 0;
}

function buildUnknownTrend(
  previous_snapshot_present: boolean,
  reason: string,
): CommandSurfaceReport["trend"] {
  return {
    comparison_basis: "previous_local_snapshot",
    previous_snapshot_present,
    delta_summary: {
      learning_outcomes_runtime_status_changed: "UNKNOWN",
      affiliate_health_changed: "UNKNOWN",
      reapply_required_delta: "UNKNOWN",
    },
    overall_trend: "UNKNOWN",
    reason,
  };
}

function computeTrend(args: {
  previousSnapshotRaw: string | null;
  currentLearningRuntimeStatus: CommandSurfaceReport["learning_outcomes_metrics"]["runtime_status"];
  currentAffiliateHealth: CommandSurfaceReport["affiliate_tracker"]["health"]["status"];
  currentReapplyRequiredCount: number | null;
}): CommandSurfaceReport["trend"] {
  if (args.previousSnapshotRaw === null) {
    return buildUnknownTrend(false, "Previous snapshot not found.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(args.previousSnapshotRaw);
  } catch {
    return buildUnknownTrend(true, "Previous snapshot is malformed JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return buildUnknownTrend(true, "Previous snapshot has invalid shape.");
  }

  const prev = parsed as Record<string, unknown>;
  const prevLearning = (prev.learning_outcomes_metrics as Record<string, unknown> | undefined)
    ?.runtime_status;
  const prevAffiliateHealth = (
    (prev.affiliate_tracker as Record<string, unknown> | undefined)?.health as
      | Record<string, unknown>
      | undefined
  )?.status;
  const prevReapply = (prev.affiliate_tracker as Record<string, unknown> | undefined)
    ?.reapply_required_count;

  if (
    typeof prevLearning !== "string" ||
    typeof prevAffiliateHealth !== "string" ||
    typeof prevReapply !== "number" ||
    typeof args.currentReapplyRequiredCount !== "number"
  ) {
    return buildUnknownTrend(
      true,
      "Previous snapshot missing deterministic comparison fields.",
    );
  }

  const learningChanged = prevLearning !== args.currentLearningRuntimeStatus;
  const affiliateHealthChanged = prevAffiliateHealth !== args.currentAffiliateHealth;
  const reapplyDelta = args.currentReapplyRequiredCount - prevReapply;

  const currentLearningUnknown = args.currentLearningRuntimeStatus !== "OK";
  const previousLearningUnknown = prevLearning !== "OK";
  const currentAffiliateUnknown = args.currentAffiliateHealth === "UNKNOWN";
  const previousAffiliateUnknown = prevAffiliateHealth === "UNKNOWN";

  if (
    currentLearningUnknown ||
    previousLearningUnknown ||
    currentAffiliateUnknown ||
    previousAffiliateUnknown
  ) {
    return {
      comparison_basis: "previous_local_snapshot",
      previous_snapshot_present: true,
      delta_summary: {
        learning_outcomes_runtime_status_changed: learningChanged,
        affiliate_health_changed: affiliateHealthChanged,
        reapply_required_delta: reapplyDelta,
      },
      overall_trend: "UNKNOWN",
      reason: "At least one comparison field is UNKNOWN.",
    };
  }

  const affiliateRankDelta =
    healthRank(args.currentAffiliateHealth) -
    healthRank(prevAffiliateHealth as "OK" | "ACTION_REQUIRED");
  const improving = reapplyDelta < 0 || affiliateRankDelta > 0;
  const degrading = reapplyDelta > 0 || affiliateRankDelta < 0;

  let overallTrend: CommandSurfaceReport["trend"]["overall_trend"];
  let reason: string;
  if (improving && !degrading) {
    overallTrend = "IMPROVING";
    reason = "Reapply-required count decreased or affiliate health moved toward OK.";
  } else if (degrading && !improving) {
    overallTrend = "DEGRADING";
    reason = "Reapply-required count increased or affiliate health worsened.";
  } else if (!improving && !degrading && !learningChanged && !affiliateHealthChanged) {
    overallTrend = "FLAT";
    reason = "Deterministic comparison fields did not change.";
  } else if (!improving && !degrading) {
    overallTrend = "FLAT";
    reason = "No degrading or improving trend signal detected.";
  } else {
    overallTrend = "UNKNOWN";
    reason = "Trend signals conflict between reapply delta and health movement.";
  }

  return {
    comparison_basis: "previous_local_snapshot",
    previous_snapshot_present: true,
    delta_summary: {
      learning_outcomes_runtime_status_changed: learningChanged,
      affiliate_health_changed: affiliateHealthChanged,
      reapply_required_delta: reapplyDelta,
    },
    overall_trend: overallTrend,
    reason,
  };
}

type SystemHealthInputs = Pick<
  CommandSurfaceReport,
  | "affiliate_tracker"
  | "learning_outcomes_metrics"
  | "state_system_metrics"
  | "trend"
  | "gsc_exports_present"
  | "cta_coverage_metrics"
  | "retailer_link_state_metrics"
>;

export function computeSystemHealth(input: SystemHealthInputs): CommandSurfaceReport["system_health"] {
  const criticalReasons: string[] = [];
  const warningReasons: string[] = [];

  if (input.affiliate_tracker.health.status === "ACTION_REQUIRED") {
    criticalReasons.push("affiliate_tracker.health.status is ACTION_REQUIRED");
  }
  if (input.learning_outcomes_metrics.runtime_status.startsWith("UNKNOWN")) {
    criticalReasons.push("learning_outcomes_metrics.runtime_status is UNKNOWN");
  }
  if (input.state_system_metrics.runtime_status === "UNKNOWN_NO_DATA") {
    criticalReasons.push("state_system_metrics.runtime_status is UNKNOWN_NO_DATA");
  }
  if (input.cta_coverage_metrics.runtime_status.startsWith("UNKNOWN")) {
    criticalReasons.push("cta_coverage_metrics.runtime_status is UNKNOWN");
  }
  if (input.retailer_link_state_metrics.runtime_status === "UNKNOWN") {
    criticalReasons.push("retailer_link_state_metrics.runtime_status is UNKNOWN");
  }

  if (criticalReasons.length > 0) {
    return { status: "CRITICAL", reasons: criticalReasons };
  }

  if (input.trend.overall_trend === "DEGRADING") {
    warningReasons.push("trend.overall_trend is DEGRADING");
  }
  if (input.gsc_exports_present.sitemap_xml === false) {
    warningReasons.push("gsc_exports_present.sitemap_xml is false");
  }
  if (input.gsc_exports_present.coverage_zip === false) {
    warningReasons.push("gsc_exports_present.coverage_zip is false");
  }
  if (input.gsc_exports_present.performance_zip === false) {
    warningReasons.push("gsc_exports_present.performance_zip is false");
  }
  if (input.affiliate_tracker.approved_count === 0) {
    warningReasons.push("affiliate_tracker.approved_count is 0");
  }
  if ((input.affiliate_tracker.tag_verification?.unverified_count ?? 0) > 0) {
    warningReasons.push("affiliate_tracker.tag_verification has unverified tags");
  }
  if (
    input.cta_coverage_metrics.runtime_status === "OK" &&
    input.cta_coverage_metrics.safe_cta_links === 0
  ) {
    warningReasons.push("cta_coverage_metrics.safe_cta_links is 0");
  }
  if (
    input.retailer_link_state_metrics.runtime_status === "OK" &&
    typeof input.retailer_link_state_metrics.distribution === "object"
  ) {
    const dist = input.retailer_link_state_metrics.distribution;
    const blockedTotal = Object.entries(dist)
      .filter(([key]) => key.startsWith("BLOCKED_"))
      .reduce((sum, [, value]) => sum + value, 0);
    const liveTotal = Object.entries(dist)
      .filter(([key]) => key.startsWith("LIVE_"))
      .reduce((sum, [, value]) => sum + value, 0);
    if (blockedTotal > liveTotal) {
      warningReasons.push("retailer_link_state_metrics BLOCKED_* exceeds LIVE_*");
    }
  }

  if (warningReasons.length > 0) {
    return { status: "WARNING", reasons: warningReasons };
  }

  return { status: "OK", reasons: [] };
}

export async function buildBuckpartsCommandSurfaceReport(
  options: BuildOptions = {},
): Promise<CommandSurfaceReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const now = options.now ?? (() => new Date());
  const nowDate = now();
  const { rel, abs } = resolvePaths(rootDir);

  const checks: BoolMap = {};
  for (const key of Object.keys(abs)) {
    checks[key] = fileExists(abs[key as keyof typeof abs]);
  }

  const source_files_checked = Object.values(rel);
  const missingContracts = pickMissing(checks, [
    "page_state",
    "publishability_state",
    "provenance_record",
    "wrong_purchase_risk",
    "replacement_chain",
    "no_buy_reason",
    "retailer_link_state",
  ]);

  let affiliateTracker: CommandSurfaceReport["affiliate_tracker"] = {
    tracker_present: checks.affiliate_tracker_json,
    record_count: null,
    status_counts: null,
    reapply_required_count: null,
    approved_count: null,
    tag_verification: null,
    known_unknowns: [],
    health: {
      status: "UNKNOWN",
      reason: checks.affiliate_tracker_json
        ? "Affiliate tracker could not be validated."
        : "Affiliate tracker file is missing.",
    },
  };

  if (checks.affiliate_tracker_json) {
    try {
      const records = parseAffiliateTracker(readTextFile(abs.affiliate_tracker_json));
      const statusCounts = buildEmptyAffiliateStatusCounts();
      for (const record of records) {
        statusCounts[record.status] += 1;
      }
      const reapplyRequiredCount = statusCounts[AFFILIATE_APPLICATION_STATUSES.REAPPLY_REQUIRED];
      const approvedCount = statusCounts[AFFILIATE_APPLICATION_STATUSES.APPROVED];
      const affiliateKnownUnknowns = records
        .filter(
          (record) =>
            typeof record.notes === "string" &&
            record.notes.toUpperCase().includes("UNKNOWN"),
        )
        .map((record) => `${record.id}: notes include UNKNOWN`);
      const tagVerification = {
        verified_count: records.filter((record) => record.tagVerified === true).length,
        unverified_count: records.filter((record) => record.tagVerified === false).length,
        unknown_count: records.filter((record) => record.tagVerified === null).length,
        unverified_records: records
          .filter((record) => record.tagVerified === false)
          .map((record) => record.id),
      };

      affiliateTracker = {
        tracker_present: true,
        record_count: records.length,
        status_counts: statusCounts,
        reapply_required_count: reapplyRequiredCount,
        approved_count: approvedCount,
        tag_verification: tagVerification,
        known_unknowns: affiliateKnownUnknowns,
        health:
          reapplyRequiredCount > 0
            ? {
                status: "ACTION_REQUIRED",
                reason:
                  "One or more affiliate applications are in REAPPLY_REQUIRED status.",
              }
            : {
                status: "OK",
                reason:
                  "Affiliate tracker is valid and has no REAPPLY_REQUIRED applications.",
              },
      };
    } catch (error) {
      affiliateTracker = {
        tracker_present: true,
        record_count: null,
        status_counts: null,
        reapply_required_count: null,
        approved_count: null,
        tag_verification: null,
        known_unknowns: [],
        health: {
          status: "UNKNOWN",
          reason: `Affiliate tracker invalid: ${(error as Error).message}`,
        },
      };
    }
  }

  let learningOutcomesMetrics: CommandSurfaceReport["learning_outcomes_metrics"] =
    unknownLearningOutcomesMetrics("UNKNOWN_NOT_QUERIED");
  let learningOutcomesContractStatus: CommandSurfaceReport["learning_outcomes_contract"]["table_runtime_status"] =
    "UNKNOWN_NOT_QUERIED";
  const shouldQueryLearningOutcomes =
    checks.learning_outcomes_migration && options.skipLearningOutcomesQuery !== true;

  if (shouldQueryLearningOutcomes) {
    const fetchRows = options.fetchLearningOutcomesRows ?? readLearningOutcomesRowsViaSupabase;
    try {
      const rows = await fetchRows();
      learningOutcomesMetrics = buildLearningOutcomesMetricsFromRows(rows, nowDate);
      learningOutcomesContractStatus = "OK";
      if (rows.length === 0) {
        learningOutcomesMetrics = {
          ...learningOutcomesMetrics,
          recency: {
            max_days_since_checked: "UNKNOWN",
            median_days_since_checked: "UNKNOWN",
          },
        };
      }
    } catch {
      learningOutcomesMetrics = unknownLearningOutcomesMetrics("UNKNOWN_DB_UNAVAILABLE");
      learningOutcomesContractStatus = "UNKNOWN_DB_UNAVAILABLE";
    }
  } else if (checks.learning_outcomes_migration) {
    learningOutcomesMetrics = unknownLearningOutcomesMetrics("UNKNOWN_NOT_QUERIED");
    learningOutcomesContractStatus = "UNKNOWN_NOT_QUERIED";
  }

  let ctaCoverageMetrics: CommandSurfaceReport["cta_coverage_metrics"] =
    unknownCtaCoverageMetrics("UNKNOWN_NOT_QUERIED");
  let retailerLinkStateMetrics: CommandSurfaceReport["retailer_link_state_metrics"] =
    unknownRetailerLinkStateMetrics();
  let blockedRetailerLinkRemediation: CommandSurfaceReport["blocked_retailer_link_remediation"] =
    unknownBlockedRetailerLinkRemediation();
  const shouldQueryCtaCoverage = options.skipCtaCoverageQuery !== true;
  if (shouldQueryCtaCoverage) {
    const fetchCtaRows = options.fetchCtaCoverageRows ?? readCtaCoverageRowsViaSupabase;
    try {
      const rows = await fetchCtaRows();
      ctaCoverageMetrics = buildCtaCoverageMetricsFromRows(rows);
      retailerLinkStateMetrics = buildRetailerLinkStateMetricsFromRows(rows);
      blockedRetailerLinkRemediation = buildBlockedRetailerLinkRemediationFromRows(rows);
    } catch {
      ctaCoverageMetrics = unknownCtaCoverageMetrics("UNKNOWN_DB_UNAVAILABLE");
      retailerLinkStateMetrics = unknownRetailerLinkStateMetrics();
      blockedRetailerLinkRemediation = unknownBlockedRetailerLinkRemediation();
    }
  }
  const stateSystemMetrics = buildStateSystemMetrics({
    checks,
    abs,
    readTextFile,
  });
  let previousSnapshotRaw: string | null = null;
  if (checks.previous_command_surface_snapshot) {
    try {
      previousSnapshotRaw = readTextFile(abs.previous_command_surface_snapshot);
    } catch {
      previousSnapshotRaw = "{";
    }
  }
  const trend = computeTrend({
    previousSnapshotRaw,
    currentLearningRuntimeStatus: learningOutcomesMetrics.runtime_status,
    currentAffiliateHealth: affiliateTracker.health.status,
    currentReapplyRequiredCount: affiliateTracker.reapply_required_count,
  });
  const systemHealth = computeSystemHealth({
    affiliate_tracker: affiliateTracker,
    learning_outcomes_metrics: learningOutcomesMetrics,
    state_system_metrics: stateSystemMetrics,
    trend,
    cta_coverage_metrics: ctaCoverageMetrics,
    retailer_link_state_metrics: retailerLinkStateMetrics,
    gsc_exports_present: {
      sitemap_xml: checks.sitemap_xml,
      coverage_zip: checks.coverage_zip,
      performance_zip: checks.performance_zip,
    },
  });

  const known_unknowns = [
    "learning_outcomes runtime table status is UNKNOWN_NOT_QUERIED (DB intentionally not queried).",
    checks.coverage_zip
      ? null
      : "GSC coverage export zip missing locally; indexation breakdown remains unknown from this command.",
    checks.performance_zip
      ? null
      : "GSC performance export zip missing locally; traffic/index visibility trends remain unknown from this command.",
    checks.sitemap_xml
      ? null
      : "Local sitemap.xml export missing; sitemap parity cannot be verified in this command run.",
    missingContracts.length === 7
      ? "All contract modules are missing; policy-state health cannot be computed yet."
      : null,
    affiliateTracker.health.status === "UNKNOWN"
      ? `Affiliate tracker health UNKNOWN: ${affiliateTracker.health.reason}`
      : null,
    learningOutcomesMetrics.runtime_status !== "OK"
      ? `learning_outcomes_metrics ${learningOutcomesMetrics.runtime_status}: runtime metrics unavailable.`
      : null,
    ctaCoverageMetrics.runtime_status !== "OK"
      ? `cta_coverage_metrics ${ctaCoverageMetrics.runtime_status}: runtime metrics unavailable or ambiguous.`
      : null,
    retailerLinkStateMetrics.runtime_status !== "OK"
      ? "retailer_link_state_metrics UNKNOWN: insufficient CTA inputs for state mapping."
      : null,
    !stateSystemMetrics.page_state.computable
      ? `state_system_metrics.page_state non-computable: ${stateSystemMetrics.page_state.reason}`
      : null,
    !stateSystemMetrics.publishability_state.computable
      ? `state_system_metrics.publishability_state non-computable: ${stateSystemMetrics.publishability_state.reason}`
      : null,
    !stateSystemMetrics.retailer_link_state.computable
      ? `state_system_metrics.retailer_link_state non-computable: ${stateSystemMetrics.retailer_link_state.reason}`
      : null,
    !stateSystemMetrics.no_buy_reason.computable
      ? `state_system_metrics.no_buy_reason non-computable: ${stateSystemMetrics.no_buy_reason.reason}`
      : null,
    !stateSystemMetrics.wrong_purchase_risk.computable
      ? `state_system_metrics.wrong_purchase_risk non-computable: ${stateSystemMetrics.wrong_purchase_risk.reason}`
      : null,
    !stateSystemMetrics.replacement_safety.computable
      ? `state_system_metrics.replacement_safety non-computable: ${stateSystemMetrics.replacement_safety.reason}`
      : null,
    !trend.previous_snapshot_present
      ? "trend previous snapshot missing: data/reports/buckparts-command-surface.json not found."
      : null,
    trend.overall_trend === "UNKNOWN"
      ? `trend deltas UNKNOWN: ${trend.reason}`
      : null,
    ...affiliateTracker.known_unknowns.map((item) => `Affiliate tracker: ${item}`),
  ].filter((v): v is string => typeof v === "string");

  const recommended_next_step =
    systemHealth.status === "CRITICAL"
      ? "Resolve critical command-surface blockers before adding pages, wedges, or affiliate volume."
      : systemHealth.status === "WARNING"
        ? "Resolve warning-level command-surface issues before expanding."
        : affiliateTracker.health.status === "ACTION_REQUIRED"
          ? "Resolve affiliate reapply-required blockers before expanding monetized link volume."
          : "Step 13: Affiliate approval tracker";

  return {
    report_name: "buckparts_command_surface_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    cleanup_progress: {
      status: "PINNED_MANUAL",
      completed_steps: 20,
      total_steps: 20,
      reason: "Manual Phase 1 cleanup counter; not auto-computed.",
    },
    source_files_checked,
    contract_modules_present: {
      page_state: checks.page_state,
      publishability_state: checks.publishability_state,
      provenance_record: checks.provenance_record,
      wrong_purchase_risk: checks.wrong_purchase_risk,
      replacement_chain: checks.replacement_chain,
      no_buy_reason: checks.no_buy_reason,
      retailer_link_state: checks.retailer_link_state,
    },
    docs_present: {
      operating_map: checks.operating_map,
      script_classification_manifest: checks.script_classification_manifest,
    },
    gsc_exports_present: {
      sitemap_xml: checks.sitemap_xml,
      coverage_zip: checks.coverage_zip,
      performance_zip: checks.performance_zip,
    },
    learning_outcomes_contract: {
      migration_present: checks.learning_outcomes_migration,
      table_runtime_status: learningOutcomesContractStatus,
    },
    learning_outcomes_metrics: learningOutcomesMetrics,
    cta_coverage_metrics: ctaCoverageMetrics,
    retailer_link_state_metrics: retailerLinkStateMetrics,
    blocked_retailer_link_remediation: blockedRetailerLinkRemediation,
    state_system_metrics: stateSystemMetrics,
    affiliate_tracker: affiliateTracker,
    trend,
    system_health: systemHealth,
    snapshot_written: false,
    snapshot_path: "data/reports/buckparts-command-surface.json",
    known_unknowns,
    recommended_next_step,
  };
}

export async function runCommandSurfaceReport(
  options: RunOptions = {},
): Promise<CommandSurfaceReport> {
  const rootDir = options.rootDir ?? process.cwd();
  const writeSnapshot = options.writeSnapshot === true;
  const report = await buildBuckpartsCommandSurfaceReport(options);
  const snapshotPathRel = "data/reports/buckparts-command-surface.json" as const;

  if (!writeSnapshot) {
    return {
      ...report,
      snapshot_written: false,
      snapshot_path: snapshotPathRel,
    };
  }

  const snapshotAbsPath = path.resolve(rootDir, snapshotPathRel);
  mkdirSync(path.dirname(snapshotAbsPath), { recursive: true });
  writeFileSync(snapshotAbsPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    ...report,
    snapshot_written: true,
    snapshot_path: snapshotPathRel,
  };
}

export async function main(): Promise<void> {
  const writeSnapshot = process.argv.includes("--write-snapshot");
  const report = await runCommandSurfaceReport({ writeSnapshot });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-buckparts-command-surface] failed", error);
    process.exit(1);
  });
}
