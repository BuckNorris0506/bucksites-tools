import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const LIVE_TABLES = [
  "retailer_links",
  "air_purifier_retailer_links",
  "whole_house_water_retailer_links",
  "vacuum_retailer_links",
  "humidifier_retailer_links",
  "appliance_air_retailer_links",
] as const;

const REQUIRED_COLUMN = "browser_truth_buyable_subtype" as const;

export type BuyableSubtypeSchemaTableCheck = {
  table: (typeof LIVE_TABLES)[number];
  required_column: typeof REQUIRED_COLUMN;
  exists: boolean;
  error_summary: string | null;
};

export type BuyableSubtypeProductionSchemaPreflightReport = {
  report_name: "buckparts_buyable_subtype_production_schema_preflight_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  checks: BuyableSubtypeSchemaTableCheck[];
  all_tables_ready: boolean;
  subtype_row_updates_allowed_next: boolean;
  recommended_next_action: string;
};

type BuildOptions = {
  now?: () => Date;
  checkColumnExists?: (
    table: (typeof LIVE_TABLES)[number],
    column: typeof REQUIRED_COLUMN,
  ) => Promise<{ exists: boolean; error_summary: string | null }>;
};

async function checkColumnExistsViaSupabase(
  table: (typeof LIVE_TABLES)[number],
  column: typeof REQUIRED_COLUMN,
): Promise<{ exists: boolean; error_summary: string | null }> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return { exists: true, error_summary: null };
  return {
    exists: false,
    error_summary: error.message,
  };
}

export async function buildBuyableSubtypeProductionSchemaPreflightReport(
  options: BuildOptions = {},
): Promise<BuyableSubtypeProductionSchemaPreflightReport> {
  const now = options.now ?? (() => new Date());
  const checkColumnExists = options.checkColumnExists ?? checkColumnExistsViaSupabase;

  const checks: BuyableSubtypeSchemaTableCheck[] = [];
  for (const table of LIVE_TABLES) {
    const result = await checkColumnExists(table, REQUIRED_COLUMN);
    checks.push({
      table,
      required_column: REQUIRED_COLUMN,
      exists: result.exists,
      error_summary: result.error_summary,
    });
  }

  const allTablesReady = checks.every((c) => c.exists);
  const recommendedNextAction = allTablesReady
    ? "Schema is aligned. Multipack subtype row updates may proceed (still apply normal read/write controls)."
    : "Migration not fully applied in production. Do not continue to subtype row updates until all tables report browser_truth_buyable_subtype.";

  return {
    report_name: "buckparts_buyable_subtype_production_schema_preflight_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    checks,
    all_tables_ready: allTablesReady,
    subtype_row_updates_allowed_next: allTablesReady,
    recommended_next_action: recommendedNextAction,
  };
}

export async function main(): Promise<void> {
  const report = await buildBuyableSubtypeProductionSchemaPreflightReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.all_tables_ready) {
    process.exitCode = 1;
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[preflight-buyable-subtype-production-schema] failed", error);
    process.exit(1);
  });
}
