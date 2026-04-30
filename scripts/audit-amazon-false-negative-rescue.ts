import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import * as linksModuleNs from "@/lib/retailers/launch-buy-links";
import * as enrichmentModuleNs from "./lib/discovery-candidate-enrichment";
import { fileURLToPath } from "node:url";
import path from "node:path";

const linksModule = (linksModuleNs as { default?: unknown }).default ?? linksModuleNs;
const enrichmentModule =
  (enrichmentModuleNs as { default?: unknown }).default ?? enrichmentModuleNs;
const { buyLinkGateFailureKind } = linksModule as {
  buyLinkGateFailureKind: typeof import("@/lib/retailers/launch-buy-links").buyLinkGateFailureKind;
};
const { canonicalAmazonDpUrl } = enrichmentModule as {
  canonicalAmazonDpUrl: typeof import("./lib/discovery-candidate-enrichment").canonicalAmazonDpUrl;
};

type ManualProof = {
  token: string;
  manual_url: string;
};

const MANUAL_PROOF_URLS: ManualProof[] = [
  {
    token: "EP-20BB",
    manual_url: "https://www.amazon.com/dp/B00310Y9KI",
  },
  {
    token: "RFC-BBSA",
    manual_url: "https://www.amazon.com/dp/B000BQN6MM",
  },
  {
    token: "AP810",
    manual_url: "https://www.amazon.com/dp/B000W0TTJQ",
  },
];

type RetailerRow = {
  table: string;
  id: string | null;
  whole_house_water_part_id?: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  status?: string | null;
  retailer_name?: string | null;
};

type PartRow = {
  id: string;
  slug: string | null;
  oem_part_number: string | null;
};

type DbPresence = "PRESENT" | "ABSENT" | "UNKNOWN";
type FalseNegativeType =
  | "EXACT_URL_PRESENT"
  | "SAME_PART_AMAZON_SLOT_PRESENT_DIRECT_BUYABLE"
  | "ABSENT_FROM_DB"
  | "PRESENT_BUT_BLOCKED"
  | "UNKNOWN";

type Finding = {
  token: string;
  canonical_dp_url: string;
  asin: string;
  db_presence: DbPresence;
  matched_part_id: string | null;
  alternate_manual_amazon_pdp: boolean;
  current_state_if_present: string | null;
  false_negative_type: FalseNegativeType;
  recommended_fix: string;
};

type AuditReport = {
  report_name: "buckparts_amazon_false_negative_rescue_audit_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  findings: Finding[];
  system_failure_summary: {
    did_system_miss_valid_amazon_pdps: boolean;
    miss_caused_by: Array<"discovery" | "evidence_classification" | "db_insertion" | "gating" | "unknown">;
    explanation: string;
  };
  required_system_change: string;
  known_unknowns: string[];
};

type BuildOptions = {
  now?: () => Date;
  fetchRetailerRows?: () => Promise<RetailerRow[]>;
  fetchWholeHouseParts?: () => Promise<PartRow[]>;
  fetchTitleByCanonicalUrl?: (url: string) => Promise<string | null>;
};

function compactToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractAsin(canonicalDpUrl: string): string {
  const match = canonicalDpUrl.match(/\/dp\/([A-Z0-9]{10})$/i);
  return match?.[1]?.toUpperCase() ?? "UNKNOWNASIN";
}

function assessExactTokenEvidence(args: {
  token: string;
  canonicalDpUrl: string;
  title: string | null;
}): "PASS" | "FAIL" | "UNKNOWN" {
  const tokenCompact = compactToken(args.token);
  const urlCompact = compactToken(args.canonicalDpUrl);
  if (urlCompact.includes(tokenCompact)) return "PASS";
  if (args.title == null) return "UNKNOWN";
  return compactToken(args.title).includes(tokenCompact) ? "PASS" : "FAIL";
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function matchesPartToken(part: PartRow, token: string): boolean {
  const t = normalizeToken(token);
  return normalizeToken(part.slug ?? "") === t || normalizeToken(part.oem_part_number ?? "") === t;
}

function classifyFinding(args: {
  proof: ManualProof;
  canonicalDpUrl: string;
  matchedPartId: string | null;
  dbRows: RetailerRow[] | null;
  title: string | null;
}): Finding {
  const asin = extractAsin(args.canonicalDpUrl);
  const titleEvidence = assessExactTokenEvidence({
    token: args.proof.token,
    canonicalDpUrl: args.canonicalDpUrl,
    title: args.title,
  });

  if (args.dbRows === null) {
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "UNKNOWN",
      matched_part_id: args.matchedPartId,
      alternate_manual_amazon_pdp: false,
      current_state_if_present: null,
      false_negative_type: "UNKNOWN",
      recommended_fix: "Restore retailer-link read access and rerun audit before any rescue action.",
    };
  }

  const rowsByCanonical = args.dbRows.filter(
    (row) => row.affiliate_url != null && canonicalAmazonDpUrl(row.affiliate_url) === args.canonicalDpUrl,
  );
  if (rowsByCanonical.length > 0) {
    const row = rowsByCanonical[0]!;
    const gateFailure = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    if (gateFailure === null) {
      return {
        token: args.proof.token,
        canonical_dp_url: args.canonicalDpUrl,
        asin,
        db_presence: "PRESENT",
        matched_part_id: args.matchedPartId,
        alternate_manual_amazon_pdp: false,
        current_state_if_present:
          `table=${row.table}; retailer_key=${row.retailer_key ?? "UNKNOWN"}; ` +
          `browser_truth_classification=${row.browser_truth_classification ?? "NULL"}; gate_failure=NONE; exact_token_evidence=${titleEvidence}`,
        false_negative_type: "EXACT_URL_PRESENT",
        recommended_fix: "No rescue mutation needed: exact canonical Amazon PDP already present and buy-gate eligible.",
      };
    }
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "PRESENT",
      matched_part_id: args.matchedPartId,
      alternate_manual_amazon_pdp: false,
      current_state_if_present:
        `table=${row.table}; retailer_key=${row.retailer_key ?? "UNKNOWN"}; ` +
        `browser_truth_classification=${row.browser_truth_classification ?? "NULL"}; gate_failure=${gateFailure}; exact_token_evidence=${titleEvidence}`,
      false_negative_type: "PRESENT_BUT_BLOCKED",
      recommended_fix:
        "Refresh browser-truth evidence and classification for this existing row; only promote after direct_buyable proof is confirmed.",
    };
  }

  const samePartRows =
    args.matchedPartId == null
      ? []
      : args.dbRows.filter((row) => row.whole_house_water_part_id === args.matchedPartId);
  const samePartDirectBuyable = samePartRows.find((row) => {
    const gateFailure = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    return gateFailure === null;
  });
  if (samePartDirectBuyable) {
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "PRESENT",
      matched_part_id: args.matchedPartId,
      alternate_manual_amazon_pdp: true,
      current_state_if_present:
        `table=${samePartDirectBuyable.table}; retailer_key=${samePartDirectBuyable.retailer_key ?? "UNKNOWN"}; ` +
        `existing_affiliate_url=${samePartDirectBuyable.affiliate_url ?? "NULL"}; ` +
        `browser_truth_classification=${samePartDirectBuyable.browser_truth_classification ?? "NULL"}; gate_failure=NONE; exact_token_evidence=${titleEvidence}`,
      false_negative_type: "SAME_PART_AMAZON_SLOT_PRESENT_DIRECT_BUYABLE",
      recommended_fix:
        "No rescue mutation needed: this part already has an approved direct-buyable Amazon slot. Track manual URL as alternate evidence only.",
    };
  }

  if (samePartRows.length > 0) {
    const row = samePartRows[0]!;
    const gateFailure = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification,
    });
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "PRESENT",
      matched_part_id: args.matchedPartId,
      alternate_manual_amazon_pdp: true,
      current_state_if_present:
        `table=${row.table}; retailer_key=${row.retailer_key ?? "UNKNOWN"}; ` +
        `existing_affiliate_url=${row.affiliate_url ?? "NULL"}; ` +
        `browser_truth_classification=${row.browser_truth_classification ?? "NULL"}; gate_failure=${gateFailure ?? "NONE"}; exact_token_evidence=${titleEvidence}`,
      false_negative_type: "PRESENT_BUT_BLOCKED",
      recommended_fix:
        "Same part has an Amazon slot but it fails buy-path gating. Repair existing slot; do not add parallel insert row.",
    };
  }

  if (args.dbRows.length === 0) {
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "ABSENT",
      matched_part_id: args.matchedPartId,
      alternate_manual_amazon_pdp: false,
      current_state_if_present: null,
      false_negative_type: "ABSENT_FROM_DB",
      recommended_fix:
        "No approved Amazon slot found for the matched part. Stage as insert candidate only after mapping and gate checks.",
    };
  }

  return {
    token: args.proof.token,
    canonical_dp_url: args.canonicalDpUrl,
    asin,
    db_presence: "ABSENT",
    matched_part_id: args.matchedPartId,
    alternate_manual_amazon_pdp: false,
    current_state_if_present: null,
    false_negative_type: "ABSENT_FROM_DB",
    recommended_fix:
      "No approved Amazon slot found for the matched part. Stage as insert candidate only after mapping and gate checks.",
  };
}

async function fetchWholeHousePartsViaSupabase(): Promise<PartRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: PartRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("whole_house_water_parts")
      .select("id,slug,oem_part_number")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as PartRow[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

async function fetchRetailerRowsViaSupabase(): Promise<RetailerRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const tables: Array<{ table: string; approvedOnly: boolean }> = [{ table: "whole_house_water_retailer_links", approvedOnly: true }];

  const rows: RetailerRow[] = [];
  for (const source of tables) {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(source.table)
        .select("id,whole_house_water_part_id,retailer_key,affiliate_url,browser_truth_classification,status,retailer_name")
        .range(from, from + pageSize - 1);
      if (source.approvedOnly) query = query.eq("status", "approved");
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as Array<{
        id: string | null;
        whole_house_water_part_id?: string | null;
        retailer_key: string | null;
        affiliate_url: string | null;
        browser_truth_classification: string | null;
        status?: string | null;
        retailer_name?: string | null;
      }>;
      for (const row of chunk) {
        rows.push({
          table: source.table,
          id: row.id,
          whole_house_water_part_id: row.whole_house_water_part_id ?? null,
          retailer_key: row.retailer_key,
          affiliate_url: row.affiliate_url,
          browser_truth_classification: row.browser_truth_classification,
          status: row.status ?? null,
          retailer_name: row.retailer_name ?? null,
        });
      }
      if (chunk.length < pageSize) break;
    }
  }
  return rows;
}

export async function buildAmazonFalseNegativeRescueAudit(
  options: BuildOptions = {},
): Promise<AuditReport> {
  const now = options.now ?? (() => new Date());
  const fetchRetailerRows = options.fetchRetailerRows ?? fetchRetailerRowsViaSupabase;
  const fetchWholeHouseParts = options.fetchWholeHouseParts ?? fetchWholeHousePartsViaSupabase;
  const fetchTitleByCanonicalUrl = options.fetchTitleByCanonicalUrl ?? (async () => null);

  let allRows: RetailerRow[] | null = null;
  let allParts: PartRow[] | null = null;
  const knownUnknowns: string[] = [];
  try {
    allRows = await fetchRetailerRows();
  } catch {
    allRows = null;
    knownUnknowns.push("Retailer-link tables unavailable; DB presence is UNKNOWN.");
  }
  try {
    allParts = await fetchWholeHouseParts();
  } catch {
    allParts = null;
    knownUnknowns.push("whole_house_water_parts unavailable; token-to-part mapping is UNKNOWN.");
  }

  const findings: Finding[] = [];
  for (const proof of MANUAL_PROOF_URLS) {
    const canonical = canonicalAmazonDpUrl(proof.manual_url);
    if (!canonical) {
      findings.push({
        token: proof.token,
        canonical_dp_url: "INVALID_CANONICAL_URL",
        asin: "UNKNOWNASIN",
        db_presence: "UNKNOWN",
        current_state_if_present: null,
        false_negative_type: "UNKNOWN",
        recommended_fix: "Fix canonical Amazon URL normalization before further rescue analysis.",
      });
      knownUnknowns.push(`Manual proof URL for token ${proof.token} failed canonicalization.`);
      continue;
    }
    const title = await fetchTitleByCanonicalUrl(canonical);
    const matchedPartId =
      allParts == null
        ? null
        : allParts.filter((part) => matchesPartToken(part, proof.token)).map((part) => part.id)[0] ?? null;
    const dbRows =
      allRows === null
        ? null
        : allRows.filter((row) => (row.retailer_key ?? "").trim().toLowerCase() === "amazon");
    findings.push(
      classifyFinding({
        proof,
        canonicalDpUrl: canonical,
        matchedPartId,
        dbRows,
        title,
      }),
    );
  }

  const hasFalseNegative = findings.some(
    (item) =>
      item.false_negative_type === "ABSENT_FROM_DB" ||
      item.false_negative_type === "PRESENT_BUT_BLOCKED",
  );
  const causeSet = new Set<
    "discovery" | "evidence_classification" | "db_insertion" | "gating" | "unknown"
  >();
  for (const item of findings) {
    if (item.false_negative_type === "ABSENT_FROM_DB") {
      causeSet.add("discovery");
      causeSet.add("db_insertion");
    } else if (item.false_negative_type === "PRESENT_BUT_BLOCKED") {
      causeSet.add("evidence_classification");
      causeSet.add("gating");
    } else if (item.false_negative_type === "UNKNOWN") {
      causeSet.add("unknown");
    }
  }

  const requiredSystemChange = hasFalseNegative
    ? "Fix Amazon false-negative definition to operate at part+amazon-slot level: detect existing approved direct_buyable slot rows (including alternate manual ASIN/PDP URLs) before labeling ABSENT_FROM_DB; do not rely on raw canonical URL equality alone."
    : "No critical false-negative path detected; keep current read-only monitoring.";

  return {
    report_name: "buckparts_amazon_false_negative_rescue_audit_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    findings,
    system_failure_summary: {
      did_system_miss_valid_amazon_pdps: hasFalseNegative,
      miss_caused_by: [...causeSet],
      explanation:
        "Manual Amazon PDPs were audited against retailer-link tables, canonicalization, and token-evidence assessment to separate discovery, classification, insertion, and gate failures.",
    },
    required_system_change: requiredSystemChange,
    known_unknowns: knownUnknowns,
  };
}

export async function main(): Promise<void> {
  const report = await buildAmazonFalseNegativeRescueAudit();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[audit-amazon-false-negative-rescue] failed", error);
    process.exit(1);
  });
}
