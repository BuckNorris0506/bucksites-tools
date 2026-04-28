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

export function buildBuckpartsCommandSurfaceReport(
  options: BuildOptions = {},
): CommandSurfaceReport {
  const rootDir = options.rootDir ?? process.cwd();
  const fileExists = options.fileExists ?? existsSync;
  const readTextFile = options.readTextFile ?? ((absolutePath: string) => readFileSync(absolutePath, "utf8"));
  const now = options.now ?? (() => new Date());
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
    affiliate_tracker: affiliateTracker,
    known_unknowns,
    recommended_next_step,
  };
}

export function main(): void {
  const report = buildBuckpartsCommandSurfaceReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
