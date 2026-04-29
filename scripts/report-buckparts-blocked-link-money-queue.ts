import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

type CtaCoverageRow = {
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

export type BlockedLinkMoneyQueueReport = {
  report_name: "buckparts_blocked_link_money_queue_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  total_blocked_links: number | "UNKNOWN";
  top_blocked_states: Array<{ state: string; count: number }> | "UNKNOWN";
  top_blocked_retailer_keys:
    | Array<{ retailer_key: string; blocked_count: number; inferred_importance_count: number }>
    | "UNKNOWN";
  recommended_first_action: string;
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchCtaCoverageRows?: () => Promise<CtaCoverageRow[]>;
};

async function readCtaCoverageRowsViaSupabase(): Promise<CtaCoverageRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: CtaCoverageRow[] = [];

  const readTable = async (table: string, approvedOnly: boolean) => {
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(table)
        .select("retailer_key,affiliate_url,browser_truth_classification")
        .range(from, from + pageSize - 1);
      if (approvedOnly) query = query.eq("status", "approved");
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as CtaCoverageRow[];
      rows.push(...chunk);
      if (chunk.length < pageSize) break;
    }
  };

  await readTable("retailer_links", false);
  await readTable("air_purifier_retailer_links", true);
  await readTable("whole_house_water_retailer_links", true);
  return rows;
}

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key : "(unknown_retailer)";
}

function stateSort(
  a: { state: string; count: number },
  b: { state: string; count: number },
): number {
  return b.count - a.count || a.state.localeCompare(b.state);
}

function retailerSort(
  a: { retailer_key: string; blocked_count: number; inferred_importance_count: number },
  b: { retailer_key: string; blocked_count: number; inferred_importance_count: number },
): number {
  return (
    b.blocked_count - a.blocked_count ||
    b.inferred_importance_count - a.inferred_importance_count ||
    a.retailer_key.localeCompare(b.retailer_key)
  );
}

function buildRecommendedFirstAction(topState: string | null, topRetailerKey: string | null): string {
  if (topRetailerKey === "oem-catalog" || topRetailerKey === "oem-parts-catalog") {
    return "Replace OEM catalog/search-style rows with verified direct PDPs where exact-token proof exists.";
  }
  if (topState === "BLOCKED_BROWSER_TRUTH_UNSAFE") {
    return "Recheck browser-truth evidence for unsafe rows before promoting.";
  }
  if (topState === "BLOCKED_BROWSER_TRUTH_MISSING") {
    return "Collect browser-truth evidence before CTA eligibility.";
  }
  return "Review highest-volume blocked retailer-link states.";
}

export function buildBuckpartsBlockedLinkMoneyQueueReportFromRows(
  rows: CtaCoverageRow[],
  now: () => Date,
): BlockedLinkMoneyQueueReport {
  const blockedStateCounts: Record<string, number> = {};
  const blockedRetailerCounts: Record<string, number> = {};
  const totalRetailerCounts: Record<string, number> = {};
  let totalBlockedLinks = 0;

  for (const row of rows) {
    const retailerKey = normalizeRetailerKey(row.retailer_key);
    totalRetailerCounts[retailerKey] = (totalRetailerCounts[retailerKey] ?? 0) + 1;

    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    if (!state.startsWith("BLOCKED_")) continue;

    totalBlockedLinks += 1;
    blockedStateCounts[state] = (blockedStateCounts[state] ?? 0) + 1;
    blockedRetailerCounts[retailerKey] = (blockedRetailerCounts[retailerKey] ?? 0) + 1;
  }

  const topBlockedStates = Object.entries(blockedStateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort(stateSort);
  const topBlockedRetailerKeys = Object.entries(blockedRetailerCounts)
    .map(([retailer_key, blocked_count]) => ({
      retailer_key,
      blocked_count,
      inferred_importance_count: totalRetailerCounts[retailer_key] ?? 0,
    }))
    .sort(retailerSort);

  return {
    report_name: "buckparts_blocked_link_money_queue_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    total_blocked_links: totalBlockedLinks,
    top_blocked_states: topBlockedStates,
    top_blocked_retailer_keys: topBlockedRetailerKeys,
    recommended_first_action: buildRecommendedFirstAction(
      topBlockedStates[0]?.state ?? null,
      topBlockedRetailerKeys[0]?.retailer_key ?? null,
    ),
    known_unknowns: [],
  };
}

export async function buildBuckpartsBlockedLinkMoneyQueueReport(
  options: BuildOptions = {},
): Promise<BlockedLinkMoneyQueueReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchCtaCoverageRows ?? readCtaCoverageRowsViaSupabase;
  try {
    const rows = await fetchRows();
    return buildBuckpartsBlockedLinkMoneyQueueReportFromRows(rows, now);
  } catch {
    return {
      report_name: "buckparts_blocked_link_money_queue_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_blocked_links: "UNKNOWN",
      top_blocked_states: "UNKNOWN",
      top_blocked_retailer_keys: "UNKNOWN",
      recommended_first_action: "Unable to derive queue because CTA coverage data is unavailable.",
      known_unknowns: ["CTA coverage dataset unavailable; blocked link money queue unresolved."],
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildBuckpartsBlockedLinkMoneyQueueReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-buckparts-blocked-link-money-queue] failed", error);
    process.exit(1);
  });
}

