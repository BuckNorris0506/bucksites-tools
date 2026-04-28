import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AFFILIATE_APPLICATION_STATUSES,
  type AffiliateApplicationRecord,
  type AffiliateApplicationStatus,
  isValidAffiliateApplicationRecord,
} from "@/lib/affiliates/affiliate-application-status";

type BoolMap = Record<string, boolean>;
type UnknownableNumber = number | "UNKNOWN";
type LearningOutcomesMetricsRow = {
  outcome: string | null;
  cta_status: string | null;
  confidence: string | null;
  date_checked: string | null;
};

export type CommandSurfaceReport = {
  report_name: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  completed_cleanup_steps: 11;
  total_cleanup_steps: 20;
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
    table_runtime_status: "UNKNOWN_NOT_QUERIED";
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
  known_unknowns: string[];
  recommended_next_step: string;
};

type BuildOptions = {
  rootDir?: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  now?: () => Date;
  fetchLearningOutcomesRows?: () => Promise<LearningOutcomesMetricsRow[]>;
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
  throw new Error("Network/DB reads are disabled for this command surface step.");
}

function unknownStateDistribution(reason: string) {
  return {
    computable: false,
    distribution: "UNKNOWN" as const,
    reason,
  };
}

function buildStateSystemMetrics(): CommandSurfaceReport["state_system_metrics"] {
  const pageState = unknownStateDistribution(
    "No local page-level signal dataset is available to compute PageState distribution.",
  );
  const publishabilityState = unknownStateDistribution(
    "No local publishability input dataset is available to compute PublishabilityState distribution.",
  );
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

  return {
    source: "local_contracts_and_available_local_data",
    runtime_status: "UNKNOWN_NO_DATA",
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
  "affiliate_tracker" | "learning_outcomes_metrics" | "state_system_metrics" | "trend" | "gsc_exports_present"
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

      affiliateTracker = {
        tracker_present: true,
        record_count: records.length,
        status_counts: statusCounts,
        reapply_required_count: reapplyRequiredCount,
        approved_count: approvedCount,
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
  if (checks.learning_outcomes_migration) {
    const fetchRows = options.fetchLearningOutcomesRows ?? readLearningOutcomesRowsViaSupabase;
    try {
      const rows = await fetchRows();
      learningOutcomesMetrics = buildLearningOutcomesMetricsFromRows(rows, nowDate);
    } catch {
      learningOutcomesMetrics = unknownLearningOutcomesMetrics("UNKNOWN_DB_UNAVAILABLE");
    }
  }
  const stateSystemMetrics = buildStateSystemMetrics();
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
    completed_cleanup_steps: 11,
    total_cleanup_steps: 20,
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
      table_runtime_status: "UNKNOWN_NOT_QUERIED",
    },
    learning_outcomes_metrics: learningOutcomesMetrics,
    state_system_metrics: stateSystemMetrics,
    affiliate_tracker: affiliateTracker,
    trend,
    system_health: systemHealth,
    known_unknowns,
    recommended_next_step,
  };
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsCommandSurfaceReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-buckparts-command-surface] failed", error);
    process.exit(1);
  });
}
