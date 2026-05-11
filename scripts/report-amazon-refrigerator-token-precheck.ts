/**
 * Read-only: resolve Command Center / queue OEM tokens to `public.filters` rows and
 * summarize Amazon `retailer_links` + evidence ASIN collisions (fridge wedge).
 *
 *   npx tsx scripts/report-amazon-refrigerator-token-precheck.ts
 *   npx tsx scripts/report-amazon-refrigerator-token-precheck.ts --tokens EDR1RXD1,UKF8001
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import {
  mapSignalsToRetailerLinkState,
  RETAILER_LINK_STATES,
} from "@/lib/retailers/retailer-link-state";
import { resolveRefrigeratorFilterRowFromQueueToken } from "@/lib/data/resolve-refrigerator-filter-from-queue-token";
import {
  classifyAmazonAsinReusePolicy,
  type AmazonAsinReusePolicyClassification,
  type AmazonAsinReusePolicyResult,
  type AmazonAsinReusePolicyStatus,
} from "./lib/amazon-asin-reuse-policy";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
const DEFAULT_TOKENS = ["EDR1RXD1", "EDR2RXD1", "EDR3RXD1", "EDR4RXD1", "UKF8001"] as const;

type LinkRow = {
  id: string;
  filter_id?: string | null;
  retailer_key: string | null;
  affiliate_url: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype?: string | null;
  status?: string | null;
  is_primary?: boolean | null;
};

type LiveAsinReuseFact = {
  id: string;
  filter_id: string | null;
  retailer_key: string | null;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype?: string | null;
  status?: string | null;
  is_primary?: boolean | null;
};

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key.trim().toLowerCase() : "";
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringProof(value: unknown): boolean | "UNKNOWN" {
  if (typeof value !== "string") return "UNKNOWN";
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || normalized === "UNKNOWN") return "UNKNOWN";
  if (normalized === "NOT_PROVEN" || normalized === "FALSE") return false;
  return true;
}

function boolProof(value: unknown): boolean | "UNKNOWN" {
  return typeof value === "boolean" ? value : "UNKNOWN";
}

function evidenceBoolProof(parsed: Record<string, unknown>, keys: string[]): boolean | "UNKNOWN" {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) return boolProof(parsed[key]);
  }
  return "UNKNOWN";
}

function evidenceNestedBoolProof(
  parsed: Record<string, unknown>,
  objectKey: string,
  keys: string[],
): boolean | "UNKNOWN" {
  const nested = parsed[objectKey];
  if (!isJsonObject(nested)) return "UNKNOWN";
  return evidenceBoolProof(nested, keys);
}

function evidenceAttributionCanBeLabeled(parsed: Record<string, unknown>): boolean | "UNKNOWN" {
  const attribution = typeof parsed.product_attribution === "string" ? parsed.product_attribution.trim() : "";
  if (attribution.length > 0 && attribution.toUpperCase() !== "UNKNOWN") return true;
  const browserEvidence = parsed.browser_evidence;
  if (!isJsonObject(browserEvidence)) return "UNKNOWN";
  return stringProof(browserEvidence.oem_or_aftermarket);
}

function evidenceRelationshipProof(parsed: Record<string, unknown>): boolean | "UNKNOWN" {
  if (evidenceAttributionCanBeLabeled(parsed) === true) return true;
  const browserEvidence = parsed.browser_evidence;
  if (!isJsonObject(browserEvidence)) return "UNKNOWN";
  return stringProof(browserEvidence.seller_title_visible);
}

function evidenceBuyabilityProof(parsed: Record<string, unknown>): boolean | "UNKNOWN" {
  const direct = stringProof(parsed.buyability_proof);
  if (direct !== "UNKNOWN") return direct;
  const browserEvidence = parsed.browser_evidence;
  if (!isJsonObject(browserEvidence)) return "UNKNOWN";
  const buyPath = stringProof(browserEvidence.buy_path_visible);
  if (buyPath !== "UNKNOWN") return buyPath;
  return stringProof(browserEvidence.browser_verdict);
}

function loadEvidenceAsinIndex(evidenceDir: string): Map<string, string[]> {
  const byAsin = new Map<string, string[]>();
  if (!existsSync(evidenceDir)) return byAsin;
  for (const name of readdirSync(evidenceDir)) {
    if (!name.endsWith(".json") || !name.toLowerCase().startsWith("amazon-")) continue;
    const abs = path.join(evidenceDir, name);
    let raw: string;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isJsonObject(parsed)) continue;
    const asinRaw = parsed.asin;
    const asin = typeof asinRaw === "string" ? asinRaw.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{10}$/.test(asin)) continue;
    const list = byAsin.get(asin) ?? [];
    list.push(name);
    byAsin.set(asin, list);
  }
  return byAsin;
}

function parseTokensArg(): string[] {
  const idx = process.argv.indexOf("--tokens");
  if (idx === -1 || !process.argv[idx + 1]) return [...DEFAULT_TOKENS];
  return process.argv[idx + 1]!
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function insertPlanHint(args: {
  resolved: boolean;
  liveDirectBuyableAmazon: number;
  asinEvidenceFilesOtherThanSelf: number;
  asinReusePolicyClassification?: AmazonAsinReusePolicyClassification | "UNKNOWN";
  asinReusePolicyStatus?: AmazonAsinReusePolicyStatus | "UNKNOWN";
}): string {
  if (!args.resolved) return "OWNER_REVIEW (no filter_id)";
  if (args.liveDirectBuyableAmazon > 0) return "SKIP (already has LIVE_DIRECT_BUYABLE Amazon row)";
  if (args.asinReusePolicyClassification === "NO_SAFE_PDP_FOUND") {
    return "BLOCKED (NO_SAFE_PDP_FOUND; mutation_ready=false)";
  }
  if (args.asinReusePolicyClassification === "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE") {
    return "OWNER_REVIEW (owner-approved shared-ASIN insert-plan eligible; mutation_ready=false)";
  }
  if (args.asinReusePolicyClassification === "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED") {
    return "OWNER_REVIEW (ASIN reuse/collision policy review required; mutation_ready=false)";
  }
  if (args.asinReusePolicyClassification === "EXACT_PDP_PROVEN_NO_COLLISION") {
    return "OWNER_REVIEW (exact PDP proof present; mutation still requires owner-approved insert plan + runtime gates)";
  }
  if (args.asinReusePolicyStatus === "BLOCKED") return "BLOCKED (ASIN reuse policy proof incomplete)";
  if (args.asinEvidenceFilesOtherThanSelf > 0) {
    return "OWNER_REVIEW (ASIN appears in other evidence files — policy / duplicate slot risk)";
  }
  return "INSERT_PLAN_POSSIBLE (subject to affiliate readiness + buy-link gate + owner approval)";
}

function policyRank(policy: AmazonAsinReusePolicyResult): number {
  if (policy.classification === "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE") return 55;
  if (policy.classification === "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED") return 50;
  if (policy.classification === "EXACT_PDP_PROVEN_NO_COLLISION") return 40;
  if (policy.classification === "NO_SAFE_PDP_FOUND") return 35;
  if (policy.classification === "HUMAN_BROWSER_VERIFICATION_REQUIRED") return 20;
  return 0;
}

async function loadLiveAsinReuseFacts(args: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  asin: string;
  selfFilterId: string;
}): Promise<{
  liveAsinReuseCount: number;
  approvedDirectBuyableReuseCount: number;
  otherRows: LiveAsinReuseFact[];
}> {
  const { data, error } = await args.supabase
    .from("retailer_links")
    .select(
      "id,filter_id,retailer_key,affiliate_url,browser_truth_classification,browser_truth_buyable_subtype,status,is_primary",
    )
    .ilike("affiliate_url", `%${args.asin}%`);
  if (error) throw error;

  const otherRows = ((data ?? []) as LinkRow[])
    .filter((row) => row.filter_id !== args.selfFilterId)
    .filter((row) => normalizeRetailerKey(row.retailer_key) === "amazon")
    .map((row) => ({
      id: row.id,
      filter_id: row.filter_id ?? null,
      retailer_key: row.retailer_key,
      browser_truth_classification: row.browser_truth_classification,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
      status: row.status ?? null,
      is_primary: row.is_primary ?? null,
    }));

  let approvedDirectBuyableReuseCount = 0;
  for (const row of otherRows) {
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: `https://www.amazon.com/dp/${args.asin}`,
      browser_truth_classification: row.browser_truth_classification,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind: gate,
    });
    if (gate === null && state === RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE) {
      approvedDirectBuyableReuseCount += 1;
    }
  }

  return {
    liveAsinReuseCount: otherRows.length,
    approvedDirectBuyableReuseCount,
    otherRows,
  };
}

export async function runAmazonRefrigeratorTokenPrecheck(tokens: string[] = [...DEFAULT_TOKENS]): Promise<unknown> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const evidenceDir = path.resolve(process.cwd(), "data/evidence");
  const asinIndex = loadEvidenceAsinIndex(evidenceDir);

  const rows: unknown[] = [];
  for (const token of tokens) {
    const resolved = await resolveRefrigeratorFilterRowFromQueueToken(supabase, token);
    if (!resolved.ok) {
      rows.push({
        token,
        resolved_filter_id: null,
        canonical_slug: null,
        resolution_via: null,
        resolution_error: resolved.reason === "ambiguous" ? resolved.detail : resolved.detail ?? resolved.reason,
        existing_amazon_row_count: "UNKNOWN",
        approved_amazon_row_count: "UNKNOWN",
        live_direct_buyable_amazon_row_count: "UNKNOWN",
        asin_collision_evidence_file_count: "UNKNOWN",
        insert_plan_hint: insertPlanHint({
          resolved: false,
          liveDirectBuyableAmazon: 0,
          asinEvidenceFilesOtherThanSelf: 0,
        }),
        asin_reuse_policy_classification: "UNKNOWN",
        asin_reuse_policy_status: "UNKNOWN",
        asin_reuse_policy_reason: "filter resolution failed; ASIN reuse policy cannot be evaluated",
        asin_reuse_policy_mutation_ready: false,
      });
      continue;
    }

    const { data: linkData, error: linkErr } = await supabase
      .from("retailer_links")
      .select("id,retailer_key,affiliate_url,browser_truth_classification,browser_truth_buyable_subtype")
      .eq("filter_id", resolved.row.id);
    if (linkErr) throw linkErr;

    const amazonRows = ((linkData ?? []) as LinkRow[]).filter(
      (r) => normalizeRetailerKey(r.retailer_key) === "amazon",
    );

    let approved = 0;
    let liveDirect = 0;
    for (const r of amazonRows) {
      const gate = buyLinkGateFailureKind({
        retailer_key: r.retailer_key,
        affiliate_url: r.affiliate_url,
        browser_truth_classification: r.browser_truth_classification,
        browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
      });
      if (gate === null) approved += 1;
      const st = mapSignalsToRetailerLinkState({
        browserTruthClassification: r.browser_truth_classification,
        gateFailureKind: gate,
      });
      if (st === RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE) liveDirect += 1;
    }

    const slugLower = resolved.row.slug.toLowerCase();
    const selfEvidenceFiles = existsSync(evidenceDir)
      ? readdirSync(evidenceDir).filter(
          (n) => n.endsWith(".json") && n.toLowerCase().startsWith(`amazon-${slugLower}-`),
        )
      : [];
    let asinCollision = 0;
    let bestPolicy: AmazonAsinReusePolicyResult | null = null;
    let bestPolicyEvidenceFile: string | null = null;
    let bestPolicyAsin: string | null = null;
    let bestLiveAsinReuseCount = 0;
    let bestLiveAsinApprovedDirectBuyableReuseCount = 0;
    let bestLiveAsinReuseRows: LiveAsinReuseFact[] = [];
    for (const evName of selfEvidenceFiles) {
      const abs = path.join(evidenceDir, evName);
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(abs, "utf8"));
      } catch {
        continue;
      }
      if (!isJsonObject(parsed)) continue;
      const asin = typeof parsed.asin === "string" ? parsed.asin.trim().toUpperCase() : "";
      const validAsin = /^[A-Z0-9]{10}$/.test(asin);
      const files = validAsin ? asinIndex.get(asin) ?? [] : [];
      const evidenceCollision = validAsin ? Math.max(0, files.length - 1) : 0;
      asinCollision = Math.max(asinCollision, evidenceCollision);

      const ownerBrowserFinding = parsed.owner_browser_finding;
      const exactTokenProof =
        evidenceNestedBoolProof(parsed, "browser_evidence", ["token_visible_in_pdp_title"]) === true ||
        (isJsonObject(ownerBrowserFinding) && ownerBrowserFinding.exact_token_visible_in_title === true) ||
        stringProof(parsed.exact_token_proof) === true;
      const sellerControlledTargetTokenProof =
        evidenceNestedBoolProof(parsed, "browser_evidence", ["token_visible_in_pdp_title"]) === true ||
        (isJsonObject(ownerBrowserFinding) && ownerBrowserFinding.exact_token_visible_in_title === true);
      const noSafePdpFound = parsed.verdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH";
      const liveReuse = validAsin
        ? await loadLiveAsinReuseFacts({
            supabase,
            asin,
            selfFilterId: resolved.row.id,
          })
        : { liveAsinReuseCount: 0, approvedDirectBuyableReuseCount: 0, otherRows: [] };

      const policy = classifyAmazonAsinReusePolicy({
        token,
        asin: validAsin ? asin : null,
        noSafePdpFound,
        exactTokenProof,
        sellerControlledTargetTokenProof,
        replacementOrCompatibleRelationshipProof: evidenceRelationshipProof(parsed),
        buyabilityProof: evidenceBuyabilityProof(parsed),
        attributionCanBeLabeled: evidenceAttributionCanBeLabeled(parsed),
        asinCollisionEvidenceFileCount: evidenceCollision,
        liveAsinReuseCount: liveReuse.liveAsinReuseCount,
      });
      if (!bestPolicy || policyRank(policy) > policyRank(bestPolicy)) {
        bestPolicy = policy;
        bestPolicyEvidenceFile = evName;
        bestPolicyAsin = validAsin ? asin : null;
        bestLiveAsinReuseCount = liveReuse.liveAsinReuseCount;
        bestLiveAsinApprovedDirectBuyableReuseCount = liveReuse.approvedDirectBuyableReuseCount;
        bestLiveAsinReuseRows = liveReuse.otherRows;
      }
    }

    rows.push({
      token,
      resolved_filter_id: resolved.row.id,
      canonical_slug: resolved.row.slug,
      resolution_via: resolved.via,
      resolution_error: null,
      existing_amazon_row_count: amazonRows.length,
      approved_amazon_row_count: approved,
      live_direct_buyable_amazon_row_count: liveDirect,
      asin_collision_evidence_file_count: asinCollision,
      live_asin_reuse_other_filter_count: bestLiveAsinReuseCount,
      live_asin_reuse_approved_direct_buyable_other_filter_count: bestLiveAsinApprovedDirectBuyableReuseCount,
      live_asin_reuse_other_filter_rows: bestLiveAsinReuseRows,
      asin_reuse_policy_classification: bestPolicy?.classification ?? "UNKNOWN",
      asin_reuse_policy_status: bestPolicy?.policy_status ?? "UNKNOWN",
      asin_reuse_policy_reason: bestPolicy?.reason ?? "No Amazon evidence file with policy-classifiable ASIN proof was found.",
      asin_reuse_policy_mutation_ready: false,
      asin_reuse_policy_evidence_file: bestPolicyEvidenceFile,
      asin_reuse_policy_asin: bestPolicyAsin,
      insert_plan_hint: insertPlanHint({
        resolved: true,
        liveDirectBuyableAmazon: liveDirect,
        asinEvidenceFilesOtherThanSelf: asinCollision,
        asinReusePolicyClassification: bestPolicy?.classification ?? "UNKNOWN",
        asinReusePolicyStatus: bestPolicy?.policy_status ?? "UNKNOWN",
      }),
    });
  }

  return {
    report_name: "buckparts_amazon_refrigerator_token_precheck_v1",
    generated_at: new Date().toISOString(),
    read_only: true,
    data_mutation: false,
    tokens,
    rows,
  };
}

async function main() {
  const tokens = parseTokensArg();
  const report = await runAmazonRefrigeratorTokenPrecheck(tokens);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
