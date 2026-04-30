import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import * as linksModuleNs from "@/lib/retailers/launch-buy-links";
import * as enrichmentModuleNs from "./lib/discovery-candidate-enrichment";

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
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  status?: string | null;
  retailer_name?: string | null;
};

type DbPresence = "PRESENT" | "ABSENT" | "UNKNOWN";
type FalseNegativeType =
  | "ABSENT_FROM_DB"
  | "PRESENT_BUT_BLOCKED"
  | "EVIDENCE_PIPELINE_MISSED"
  | "UNKNOWN";

type Finding = {
  token: string;
  canonical_dp_url: string;
  asin: string;
  db_presence: DbPresence;
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

function classifyFinding(args: {
  proof: ManualProof;
  canonicalDpUrl: string;
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
      current_state_if_present: null,
      false_negative_type: "UNKNOWN",
      recommended_fix: "Restore retailer-link read access and rerun audit before any rescue action.",
    };
  }

  if (args.dbRows.length === 0) {
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "ABSENT",
      current_state_if_present: null,
      false_negative_type: "ABSENT_FROM_DB",
      recommended_fix:
        "Backfill this canonical Amazon PDP into staging/evidence queue, then run normal review before any retailer_links mutation.",
    };
  }

  const row = args.dbRows[0]!;
  const gateFailure = buyLinkGateFailureKind({
    retailer_key: row.retailer_key,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification,
  });
  const blocked = gateFailure !== null;

  if (blocked) {
    return {
      token: args.proof.token,
      canonical_dp_url: args.canonicalDpUrl,
      asin,
      db_presence: "PRESENT",
      current_state_if_present:
        `table=${row.table}; retailer_key=${row.retailer_key ?? "UNKNOWN"}; ` +
        `browser_truth_classification=${row.browser_truth_classification ?? "NULL"}; gate_failure=${gateFailure}; exact_token_evidence=${titleEvidence}`,
      false_negative_type: "PRESENT_BUT_BLOCKED",
      recommended_fix:
        "Refresh browser-truth evidence and classification for this existing row; only promote after direct_buyable proof is confirmed.",
    };
  }

  return {
    token: args.proof.token,
    canonical_dp_url: args.canonicalDpUrl,
    asin,
    db_presence: "PRESENT",
    current_state_if_present:
      `table=${row.table}; retailer_key=${row.retailer_key ?? "UNKNOWN"}; ` +
      `browser_truth_classification=${row.browser_truth_classification ?? "NULL"}; gate_failure=NONE; exact_token_evidence=${titleEvidence}`,
    false_negative_type: "EVIDENCE_PIPELINE_MISSED",
    recommended_fix:
      "Add deterministic whole-house Amazon rescue queue so valid existing PDP rows are surfaced before manual operator discovery.",
  };
}

async function fetchRetailerRowsViaSupabase(): Promise<RetailerRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const tables: Array<{ table: string; approvedOnly: boolean }> = [
    { table: "retailer_links", approvedOnly: false },
    { table: "air_purifier_retailer_links", approvedOnly: true },
    { table: "whole_house_water_retailer_links", approvedOnly: true },
  ];

  const rows: RetailerRow[] = [];
  for (const source of tables) {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from(source.table)
        .select("id,retailer_key,affiliate_url,browser_truth_classification,status,retailer_name")
        .range(from, from + pageSize - 1);
      if (source.approvedOnly) query = query.eq("status", "approved");
      const { data, error } = await query;
      if (error) throw error;
      const chunk = (data ?? []) as Array<{
        id: string | null;
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
  const fetchTitleByCanonicalUrl = options.fetchTitleByCanonicalUrl ?? (async () => null);

  let allRows: RetailerRow[] | null = null;
  const knownUnknowns: string[] = [];
  try {
    allRows = await fetchRetailerRows();
  } catch {
    allRows = null;
    knownUnknowns.push("Retailer-link tables unavailable; DB presence is UNKNOWN.");
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
    const dbRows =
      allRows === null
        ? null
        : allRows.filter(
            (row) =>
              row.affiliate_url != null &&
              canonicalAmazonDpUrl(row.affiliate_url) === canonical,
          );
    findings.push(
      classifyFinding({
        proof,
        canonicalDpUrl: canonical,
        dbRows,
        title,
      }),
    );
  }

  const hasFalseNegative = findings.some(
    (item) =>
      item.false_negative_type === "ABSENT_FROM_DB" ||
      item.false_negative_type === "PRESENT_BUT_BLOCKED" ||
      item.false_negative_type === "EVIDENCE_PIPELINE_MISSED",
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
    } else if (item.false_negative_type === "EVIDENCE_PIPELINE_MISSED") {
      causeSet.add("discovery");
      causeSet.add("evidence_classification");
    } else if (item.false_negative_type === "UNKNOWN") {
      causeSet.add("unknown");
    }
  }

  const requiredSystemChange = hasFalseNegative
    ? "Add deterministic Amazon PDP rescue ingestion for whole-house tokens: canonical /dp/<ASIN> matching + exact-token/title evidence scoring + pre-mutation staging queue."
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

main().catch((error) => {
  console.error("[audit-amazon-false-negative-rescue] failed", error);
  process.exit(1);
});
