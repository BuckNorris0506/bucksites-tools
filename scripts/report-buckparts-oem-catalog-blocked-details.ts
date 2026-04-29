import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

type RawRetailerLinkRow = {
  id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

type DetailRow = {
  table: string;
  link_id: string;
  retailer_key: string;
  affiliate_url: string;
  browser_truth_classification: string | null;
  blocked_state: string;
  gate_failure_kind: string | null;
};

type PrioritizedRow = DetailRow & {
  priority_rank: number;
  priority_reason: string;
};

type FetchResult = {
  table: string;
  rows: RawRetailerLinkRow[];
};

export type OemCatalogBlockedDetailsReport = {
  report_name: "buckparts_oem_catalog_blocked_details_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  total_rows: number | "UNKNOWN";
  rows_by_table: Record<string, number> | "UNKNOWN";
  rows_by_blocked_state: Record<string, number> | "UNKNOWN";
  sample_rows: DetailRow[] | "UNKNOWN";
  prioritized_rows: PrioritizedRow[] | "UNKNOWN";
  recommended_next_action: "Replace OEM catalog/search-style rows with verified direct PDPs only where exact-token proof exists.";
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchRows?: () => Promise<FetchResult[]>;
};

const OEM_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);
const REPORT_ACTION =
  "Replace OEM catalog/search-style rows with verified direct PDPs only where exact-token proof exists.";
const SAMPLE_LIMIT = 25;
const PRIORITIZED_LIMIT = 25;

function tablePriority(table: string): number {
  if (table === "retailer_links") return 0;
  if (table === "whole_house_water_retailer_links") return 1;
  if (table === "air_purifier_retailer_links") return 2;
  return 99;
}

function blockedStatePriority(state: string): number {
  if (state === "BLOCKED_SEARCH_OR_DISCOVERY") return 0;
  if (state === "BLOCKED_BROWSER_TRUTH_UNSAFE") return 1;
  return 2;
}

function buildPriorityReason(row: DetailRow): string {
  const tableReason =
    row.table === "retailer_links"
      ? "refrigerator table prioritized"
      : row.table === "whole_house_water_retailer_links"
        ? "whole-house-water table prioritized after refrigerator"
        : row.table === "air_purifier_retailer_links"
          ? "air-purifier table prioritized after whole-house-water"
          : "table priority fallback";
  const stateReason =
    row.blocked_state === "BLOCKED_SEARCH_OR_DISCOVERY"
      ? "search/discovery block prioritized"
      : row.blocked_state === "BLOCKED_BROWSER_TRUTH_UNSAFE"
        ? "unsafe browser-truth block prioritized after search/discovery"
        : "other blocked-state priority fallback";
  return `${tableReason}; ${stateReason}.`;
}

function buildPrioritizedRows(rows: DetailRow[]): PrioritizedRow[] {
  const sorted = [...rows].sort((a, b) => {
    return (
      tablePriority(a.table) - tablePriority(b.table) ||
      blockedStatePriority(a.blocked_state) - blockedStatePriority(b.blocked_state) ||
      a.affiliate_url.localeCompare(b.affiliate_url)
    );
  });

  return sorted.slice(0, PRIORITIZED_LIMIT).map((row, idx) => ({
    ...row,
    priority_rank: idx + 1,
    priority_reason: buildPriorityReason(row),
  }));
}

async function fetchRowsViaSupabase(): Promise<FetchResult[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const tables: Array<{ name: string; approvedOnly: boolean }> = [
    { name: "retailer_links", approvedOnly: false },
    { name: "air_purifier_retailer_links", approvedOnly: true },
    { name: "whole_house_water_retailer_links", approvedOnly: true },
  ];

  const out: FetchResult[] = [];
  for (const table of tables) {
    const rows: RawRetailerLinkRow[] = [];
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(table.name)
        .select("id,retailer_key,affiliate_url,browser_truth_classification")
        .range(from, from + pageSize - 1);
      if (table.approvedOnly) {
        query = query.eq("status", "approved");
      }
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as RawRetailerLinkRow[];
      rows.push(...chunk);
      if (chunk.length < pageSize) break;
    }
    out.push({ table: table.name, rows });
  }
  return out;
}

function normalizeLinkId(id: string | null): string {
  return typeof id === "string" && id.trim().length > 0 ? id : "(missing_id)";
}

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key : "(unknown_retailer)";
}

function normalizeUrl(url: string | null): string {
  return typeof url === "string" ? url : "";
}

function buildDetailRows(results: FetchResult[]): DetailRow[] {
  const out: DetailRow[] = [];
  for (const result of results) {
    for (const row of result.rows) {
      const retailerKey = normalizeRetailerKey(row.retailer_key);
      if (!OEM_KEYS.has(retailerKey)) continue;

      const affiliateUrl = normalizeUrl(row.affiliate_url);
      const gateFailureKind = buyLinkGateFailureKind({
        retailer_key: row.retailer_key,
        affiliate_url: affiliateUrl,
        browser_truth_classification: row.browser_truth_classification,
      });
      const blockedState = mapSignalsToRetailerLinkState({
        browserTruthClassification: row.browser_truth_classification,
        gateFailureKind,
      });
      if (!blockedState.startsWith("BLOCKED_")) continue;

      out.push({
        table: result.table,
        link_id: normalizeLinkId(row.id),
        retailer_key: retailerKey,
        affiliate_url: affiliateUrl,
        browser_truth_classification: row.browser_truth_classification,
        blocked_state: blockedState,
        gate_failure_kind: gateFailureKind,
      });
    }
  }
  return out;
}

function countsBy<T extends string>(rows: DetailRow[], key: (row: DetailRow) => T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export async function buildBuckpartsOemCatalogBlockedDetailsReport(
  options: BuildOptions = {},
): Promise<OemCatalogBlockedDetailsReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchRows ?? fetchRowsViaSupabase;

  try {
    const fetched = await fetchRows();
    const detailRows = buildDetailRows(fetched);
    return {
      report_name: "buckparts_oem_catalog_blocked_details_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_rows: detailRows.length,
      rows_by_table: countsBy(detailRows, (row) => row.table),
      rows_by_blocked_state: countsBy(detailRows, (row) => row.blocked_state),
      sample_rows: detailRows.slice(0, SAMPLE_LIMIT),
      prioritized_rows: buildPrioritizedRows(detailRows),
      recommended_next_action: REPORT_ACTION,
      known_unknowns: [],
    };
  } catch {
    return {
      report_name: "buckparts_oem_catalog_blocked_details_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_rows: "UNKNOWN",
      rows_by_table: "UNKNOWN",
      rows_by_blocked_state: "UNKNOWN",
      sample_rows: "UNKNOWN",
      prioritized_rows: "UNKNOWN",
      recommended_next_action: REPORT_ACTION,
      known_unknowns: ["Retailer-link dataset unavailable; OEM blocked detail rows are UNKNOWN."],
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsOemCatalogBlockedDetailsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-buckparts-oem-catalog-blocked-details] failed", error);
    process.exit(1);
  });
}

