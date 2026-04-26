import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import {
  buildReviewPacket,
  ctaStatusFromRetailerRows,
  DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES,
  type ReviewPacket,
} from "./lib/non-amazon-review-packets";

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseSlugArg(): string[] | null {
  const raw = argValue("--slugs");
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLimit(): number {
  const raw = argValue("--limit");
  if (!raw) return 10;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid --limit "${raw}" (must be > 0).`);
  }
  return n;
}

type FridgeCoverageRow = {
  slug: string;
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
};

function computeTier(c: {
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
}): 1 | 2 | 3 | 4 {
  if (c.number_of_direct_buyable_links === 0) return 1;
  if (c.number_of_direct_buyable_links === 1) return 2;
  if (c.number_of_valid_links >= 2 && !c.has_primary_amazon) return 3;
  return 4;
}

export function rankFridgeCoverageRows(rows: FridgeCoverageRow[]): FridgeCoverageRow[] {
  return [...rows].sort((a, b) => {
    const tierDelta =
      computeTier({
        number_of_valid_links: a.number_of_valid_links,
        number_of_direct_buyable_links: a.number_of_direct_buyable_links,
        has_primary_amazon: a.has_primary_amazon,
      }) -
      computeTier({
        number_of_valid_links: b.number_of_valid_links,
        number_of_direct_buyable_links: b.number_of_direct_buyable_links,
        has_primary_amazon: b.has_primary_amazon,
      });
    if (tierDelta !== 0) return tierDelta;
    const directDelta = a.number_of_direct_buyable_links - b.number_of_direct_buyable_links;
    if (directDelta !== 0) return directDelta;
    const validDelta = a.number_of_valid_links - b.number_of_valid_links;
    if (validDelta !== 0) return validDelta;
    return a.slug.localeCompare(b.slug);
  });
}

async function loadCurrentCtaStatusBySlug(slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (slugs.length === 0) return out;

  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase
    .from("filters")
    .select("id,slug")
    .in("slug", slugs);
  if (filterErr) throw filterErr;

  const idBySlug = new Map<string, string>();
  const slugsById = new Map<string, string>();
  for (const row of (filters ?? []) as Array<{ id: string; slug: string }>) {
    idBySlug.set(row.slug, row.id);
    slugsById.set(row.id, row.slug);
  }

  const filterIds = [...slugsById.keys()];
  if (filterIds.length === 0) return out;

  const { data: links, error: linksErr } = await supabase
    .from("retailer_links")
    .select("filter_id,retailer_key,affiliate_url,browser_truth_classification")
    .in("filter_id", filterIds);
  if (linksErr) throw linksErr;

  const linksBySlug = new Map<
    string,
    Array<{ retailer_key: string; affiliate_url: string; browser_truth_classification: string | null }>
  >();
  for (const row of (links ?? []) as Array<{
    filter_id: string;
    retailer_key: string;
    affiliate_url: string;
    browser_truth_classification: string | null;
  }>) {
    const slug = slugsById.get(row.filter_id);
    if (!slug) continue;
    if (!linksBySlug.has(slug)) linksBySlug.set(slug, []);
    linksBySlug.get(slug)!.push({
      retailer_key: row.retailer_key ?? "",
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
    });
  }

  for (const slug of slugs) {
    out.set(slug, ctaStatusFromRetailerRows(linksBySlug.get(slug) ?? []));
  }

  return out;
}

async function loadTopFridgeBatchSlugs(limit: number, includeMonetized: boolean): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data: filters, error: filterErr } = await supabase.from("filters").select("id,slug");
  if (filterErr) throw filterErr;

  const slugById = new Map<string, string>();
  for (const row of (filters ?? []) as Array<{ id: string; slug: string }>) {
    if (!row.id || !row.slug) continue;
    slugById.set(row.id, row.slug);
  }

  const { data: links, error: linksErr } = await supabase
    .from("retailer_links")
    .select("filter_id,retailer_key,affiliate_url,browser_truth_classification,is_primary");
  if (linksErr) throw linksErr;

  const bySlug = new Map<string, FridgeCoverageRow>();
  for (const slug of slugById.values()) {
    bySlug.set(slug, {
      slug,
      number_of_valid_links: 0,
      number_of_direct_buyable_links: 0,
      has_primary_amazon: false,
    });
  }

  for (const row of (links ?? []) as Array<{
    filter_id: string;
    retailer_key: string;
    affiliate_url: string;
    browser_truth_classification: string | null;
    is_primary: boolean | null;
  }>) {
    const slug = slugById.get(row.filter_id);
    if (!slug) continue;
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? "",
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
    });
    if (gate !== null) continue;
    const acc = bySlug.get(slug);
    if (!acc) continue;
    acc.number_of_valid_links += 1;
    if ((row.browser_truth_classification ?? "").trim() === "direct_buyable") {
      acc.number_of_direct_buyable_links += 1;
    }
    if ((row.retailer_key ?? "").trim().toLowerCase() === "amazon" && Boolean(row.is_primary)) {
      acc.has_primary_amazon = true;
    }
  }

  const ranked = rankFridgeCoverageRows([...bySlug.values()]);
  const filtered = includeMonetized
    ? ranked
    : ranked.filter((row) => row.number_of_valid_links === 0);
  return filtered.slice(0, limit).map((row) => row.slug);
}

export async function generateFridgeNonAmazonReviewPackets(slugs: string[]): Promise<ReviewPacket[]> {
  const ctaStatusBySlug = await loadCurrentCtaStatusBySlug(slugs);
  const packets: ReviewPacket[] = [];

  for (const slug of slugs) {
    const evidence = DEFAULT_REFRIGERATOR_REVIEW_CANDIDATES[slug];
    if (!evidence) {
      packets.push({
        filter_slug: slug,
        family_gap_source: "money_scoreboard_v1:refrigerator_water:unknown",
        current_cta_status: ctaStatusBySlug.get(slug) ?? "unknown_slug",
        retailer: "UNKNOWN",
        pdp_url: "",
        exact_token_or_alias_proof: "No candidate packet evidence available for this slug.",
        buyability_evidence: "No candidate packet evidence available for this slug.",
        substitution_or_discontinued_warning_present: "unknown",
        part_label: "Unknown",
        risk_label: "high",
        decision: "UNKNOWN",
        recommended_next_action:
          "Run manual non-Amazon discovery and capture direct on-page token + buyability evidence.",
      });
      continue;
    }

    packets.push(
      buildReviewPacket({
        filter_slug: slug,
        current_cta_status: ctaStatusBySlug.get(slug) ?? "unknown_slug",
        evidence,
      }),
    );
  }

  return packets;
}

async function main() {
  loadEnv();
  const wedgeArg = argValue("--wedge") ?? "refrigerator_water";
  if (wedgeArg !== "refrigerator_water") {
    throw new Error(`Unsupported --wedge "${wedgeArg}". This generator is refrigerator_water-only.`);
  }

  const explicitSlugs = parseSlugArg();
  const limit = parseLimit();
  const includeMonetized = hasFlag("--include-monetized");

  let slugs: string[];
  if (explicitSlugs && explicitSlugs.length > 0) {
    slugs = explicitSlugs;
  } else {
    slugs = await loadTopFridgeBatchSlugs(limit, includeMonetized);
  }
  const packets = await generateFridgeNonAmazonReviewPackets(slugs);
  const output = {
    wedge: "refrigerator_water",
    read_only: true,
    non_amazon_only: true,
    auto_approve: false,
    include_monetized: includeMonetized,
    packet_count: packets.length,
    packets,
  };
  console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1]?.endsWith("generate-fridge-non-amazon-review-packets.ts")) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-fridge-non-amazon-review-packets] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
