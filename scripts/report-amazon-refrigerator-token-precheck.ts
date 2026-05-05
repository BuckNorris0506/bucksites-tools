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
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
const DEFAULT_TOKENS = ["EDR1RXD1", "EDR2RXD1", "EDR3RXD1", "EDR4RXD1", "UKF8001"] as const;

type LinkRow = {
  id: string;
  retailer_key: string | null;
  affiliate_url: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype?: string | null;
};

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key.trim().toLowerCase() : "";
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
}): string {
  if (!args.resolved) return "OWNER_REVIEW (no filter_id)";
  if (args.liveDirectBuyableAmazon > 0) return "SKIP (already has LIVE_DIRECT_BUYABLE Amazon row)";
  if (args.asinEvidenceFilesOtherThanSelf > 0) {
    return "OWNER_REVIEW (ASIN appears in other evidence files — policy / duplicate slot risk)";
  }
  return "INSERT_PLAN_POSSIBLE (subject to affiliate readiness + buy-link gate + owner approval)";
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
      if (!/^[A-Z0-9]{10}$/.test(asin)) continue;
      const files = asinIndex.get(asin) ?? [];
      asinCollision = Math.max(asinCollision, Math.max(0, files.length - 1));
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
      insert_plan_hint: insertPlanHint({
        resolved: true,
        liveDirectBuyableAmazon: liveDirect,
        asinEvidenceFilesOtherThanSelf: asinCollision,
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
