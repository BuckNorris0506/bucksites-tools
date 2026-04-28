import { existsSync, readFileSync } from "node:fs";
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
    ...affiliateTracker.known_unknowns.map((item) => `Affiliate tracker: ${item}`),
  ].filter((v): v is string => typeof v === "string");

  const recommended_next_step =
    affiliateTracker.health.status === "ACTION_REQUIRED"
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
    affiliate_tracker: affiliateTracker,
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
