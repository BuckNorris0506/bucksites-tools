import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

const OEM_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);
const TARGET_DOMAIN = "www.repairclinic.com";
const SAMPLE_LIMIT = 25;

type RawRow = {
  id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
};

type DetailRow = {
  link_id: string;
  affiliate_url: string;
  retailer_key: string;
  detected_token: string | "UNKNOWN";
  browser_truth_classification: string | null;
  gate_failure_kind: string | null;
  blocked_state: "BLOCKED_SEARCH_OR_DISCOVERY";
};

export type RepairClinicRefrigeratorBlockedDetailsReport = {
  report_name: "buckparts_repairclinic_refrigerator_blocked_details_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  total_rows: number | "UNKNOWN";
  sample_rows: DetailRow[] | "UNKNOWN";
  recommended_next_action: string;
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchRows?: () => Promise<RawRow[]>;
};

function normalizeLinkId(id: string | null): string {
  return typeof id === "string" && id.trim().length > 0 ? id : "(missing_id)";
}

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key : "(unknown_retailer)";
}

function normalizeUrl(url: string | null): string {
  return typeof url === "string" ? url : "";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "(invalid_url)";
  }
}

function extractDetectedToken(url: string): string | "UNKNOWN" {
  try {
    const u = new URL(url);
    const queryEntries = Array.from(u.searchParams.entries());
    const queryKeys = ["q", "query", "searchterm", "searchkeyword", "keywords", "ntt"];
    for (const key of queryKeys) {
      const value = queryEntries.find(([k]) => k.toLowerCase() === key)?.[1];
      if (value && value.trim().length > 0) return value.trim().toUpperCase();
    }
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

async function fetchRowsViaSupabase(): Promise<RawRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: RawRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("retailer_links")
      .select("id,retailer_key,affiliate_url,browser_truth_classification")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as RawRow[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

function toDetailRows(rows: RawRow[]): DetailRow[] {
  const out: DetailRow[] = [];
  for (const row of rows) {
    const retailerKey = normalizeRetailerKey(row.retailer_key);
    if (!OEM_KEYS.has(retailerKey)) continue;
    const affiliateUrl = normalizeUrl(row.affiliate_url);
    if (extractDomain(affiliateUrl) !== TARGET_DOMAIN) continue;
    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: affiliateUrl,
      browser_truth_classification: row.browser_truth_classification,
    });
    const blockedState = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    if (blockedState !== "BLOCKED_SEARCH_OR_DISCOVERY") continue;
    out.push({
      link_id: normalizeLinkId(row.id),
      affiliate_url: affiliateUrl,
      retailer_key: retailerKey,
      detected_token: extractDetectedToken(affiliateUrl),
      browser_truth_classification: row.browser_truth_classification,
      gate_failure_kind: gateFailureKind,
      blocked_state: "BLOCKED_SEARCH_OR_DISCOVERY",
    });
  }
  return out;
}

export async function buildRepairClinicRefrigeratorBlockedDetailsReport(
  options: BuildOptions = {},
): Promise<RepairClinicRefrigeratorBlockedDetailsReport> {
  const now = options.now ?? (() => new Date());
  const fetchRows = options.fetchRows ?? fetchRowsViaSupabase;
  try {
    const detailRows = toDetailRows(await fetchRows());
    return {
      report_name: "buckparts_repairclinic_refrigerator_blocked_details_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_rows: detailRows.length,
      sample_rows: detailRows.slice(0, SAMPLE_LIMIT),
      recommended_next_action:
        "Manually verify RepairClinic refrigerator search rows for direct PDP evidence (token match + buyability) before any DB mutation.",
      known_unknowns: [],
    };
  } catch {
    return {
      report_name: "buckparts_repairclinic_refrigerator_blocked_details_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      total_rows: "UNKNOWN",
      sample_rows: "UNKNOWN",
      recommended_next_action:
        "RepairClinic refrigerator blocked detail query unavailable; restore data access and rerun before evidence collection.",
      known_unknowns: ["retailer_links dataset unavailable for RepairClinic refrigerator blocked detail extraction."],
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildRepairClinicRefrigeratorBlockedDetailsReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-repairclinic-refrigerator-blocked-details] failed", error);
    process.exit(1);
  });
}

