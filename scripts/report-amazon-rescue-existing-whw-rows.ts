import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const TARGET_PART_IDS = [
  "3d4bfaa9-e47e-4d0f-8a70-30167f6b33da",
  "f6c835ee-8ac4-4a06-a0b3-efa03e4f0667",
] as const;
const TARGET_RETAILER_KEY = "amazon";

export type ExistingWhwAmazonRow = {
  id: string | null;
  whole_house_water_part_id: string | null;
  retailer_key: string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  status: string | null;
  browser_truth_classification: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type AmazonRescueExistingWhwRowsReport = {
  report_name: "buckparts_amazon_rescue_existing_whw_rows_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  target: {
    table: "public.whole_house_water_retailer_links";
    retailer_key: "amazon";
    whole_house_water_part_ids: string[];
  };
  rows: ExistingWhwAmazonRow[];
  summary: {
    total_rows: number;
    by_part_id: Record<string, number>;
    approved_rows: number;
  };
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchRows?: () => Promise<ExistingWhwAmazonRow[]>;
};

async function fetchRowsViaSupabase(): Promise<ExistingWhwAmazonRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whole_house_water_retailer_links")
    .select(
      "id,whole_house_water_part_id,retailer_key,destination_url,affiliate_url,status,browser_truth_classification,browser_truth_notes,browser_truth_checked_at",
    )
    .in("whole_house_water_part_id", [...TARGET_PART_IDS])
    .eq("retailer_key", TARGET_RETAILER_KEY)
    .order("whole_house_water_part_id", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExistingWhwAmazonRow[];
}

export async function buildAmazonRescueExistingWhwRowsReport(
  options: BuildOptions = {},
): Promise<AmazonRescueExistingWhwRowsReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchRows ?? fetchRowsViaSupabase;
  const knownUnknowns: string[] = [];

  let rows: ExistingWhwAmazonRow[] = [];
  try {
    rows = await fetchRows();
  } catch {
    knownUnknowns.push(
      "Failed to read whole_house_water_retailer_links for target part IDs and retailer_key=amazon.",
    );
  }

  const byPartId = Object.fromEntries(TARGET_PART_IDS.map((id) => [id, 0]));
  for (const row of rows) {
    const pid = row.whole_house_water_part_id;
    if (pid && pid in byPartId) byPartId[pid] += 1;
  }

  return {
    report_name: "buckparts_amazon_rescue_existing_whw_rows_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    target: {
      table: "public.whole_house_water_retailer_links",
      retailer_key: TARGET_RETAILER_KEY,
      whole_house_water_part_ids: [...TARGET_PART_IDS],
    },
    rows,
    summary: {
      total_rows: rows.length,
      by_part_id: byPartId,
      approved_rows: rows.filter((row) => (row.status ?? "").trim().toLowerCase() === "approved").length,
    },
    known_unknowns: knownUnknowns,
  };
}

export async function main(): Promise<void> {
  const report = await buildAmazonRescueExistingWhwRowsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-amazon-rescue-existing-whw-rows] failed", error);
    process.exit(1);
  });
}
