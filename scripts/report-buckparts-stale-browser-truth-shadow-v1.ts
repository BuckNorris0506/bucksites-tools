import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  buildBuckpartsStaleBrowserTruthShadowReportFromRows,
  type StaleBrowserTruthShadowRow,
} from "./lib/buckparts-stale-browser-truth-shadow-report-v1";

const PAGE_SIZE = 1000;

type RetailerLinkRow = {
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_checked_at: string | null;
};

async function fetchAllRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
): Promise<StaleBrowserTruthShadowRow[]> {
  const rows: StaleBrowserTruthShadowRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(
        "retailer_key, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at",
      )
      .eq("status", "approved")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;

    for (const row of data as RetailerLinkRow[]) {
      rows.push({
        source_table: table,
        retailer_key: row.retailer_key,
        affiliate_url: row.affiliate_url ?? "",
        browser_truth_classification: row.browser_truth_classification,
        browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
        browser_truth_checked_at: row.browser_truth_checked_at,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function buildBuckpartsStaleBrowserTruthShadowReport(options?: {
  fetchRows?: () => Promise<StaleBrowserTruthShadowRow[]>;
  now?: () => Date;
}) {
  const fetchRows =
    options?.fetchRows ??
    (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        );
      }

      const supabase = createClient(url, key);
      const tables = [
        "retailer_links",
        "air_purifier_retailer_links",
        "whole_house_water_retailer_links",
      ] as const;

      const chunks = await Promise.all(
        tables.map((table) => fetchAllRows(supabase, table)),
      );
      return chunks.flat();
    });

  const rows = await fetchRows();
  return buildBuckpartsStaleBrowserTruthShadowReportFromRows(
    rows,
    options?.now ?? (() => new Date()),
  );
}

async function main() {
  const report = await buildBuckpartsStaleBrowserTruthShadowReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error: unknown) => {
    console.error("[report-buckparts-stale-browser-truth-shadow-v1] failed", error);
    process.exit(1);
  });
}
