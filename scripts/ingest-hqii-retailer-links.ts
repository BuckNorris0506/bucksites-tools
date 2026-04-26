import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { HOMEKEEP_WEDGE_CATALOG, isHomekeepWedgeCatalog } from "@/lib/catalog/identity";
import {
  filterRealBuyRetailerLinks,
  isKnownBrokenUrl,
  isKnownIndirectDiscoveryUrl,
  isManufacturerSiteSearchUrl,
  isSearchEngineDiscoveryUrl,
  selectBestVerifiedBuyLink,
} from "@/lib/retailers/launch-buy-links";
import { normalizeRetailerName } from "@/lib/retailers/retailer-normalization";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

loadEnv();

type HqIIRawDiscovery = {
  filter_slug: string;
  retailer_name: string;
  url: string;
  notes?: string;
};

type DiscoveryClassification = "direct_buyable" | "likely_valid";

type AcceptedRow = {
  input: HqIIRawDiscovery;
  filter_slug: string;
  filter_id: string;
  retailer_name: string;
  retailer_key: string;
  retailer_slug: string;
  affiliate_url: string;
  classification: DiscoveryClassification;
  notes: string | null;
};

type RejectedRow = {
  input: HqIIRawDiscovery;
  reason:
    | "missing_filter_slug"
    | "missing_retailer_name"
    | "missing_url"
    | "invalid_url"
    | "search_or_discovery_url"
    | "known_broken_or_indirect"
    | "not_product_level_url"
    | "unknown_retailer_name"
    | "unknown_filter_slug";
  detail: string;
};

type TableConfig = {
  wedge: string;
  filtersTable: string;
  retailerLinksTable: string;
  retailerFilterFk: string;
  hasStatusAndSource: boolean;
};

const TABLES: Record<string, TableConfig> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    filtersTable: "filters",
    retailerLinksTable: "retailer_links",
    retailerFilterFk: "filter_id",
    hasStatusAndSource: false,
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    filtersTable: "air_purifier_filters",
    retailerLinksTable: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    hasStatusAndSource: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.vacuum,
    filtersTable: "vacuum_filters",
    retailerLinksTable: "vacuum_retailer_links",
    retailerFilterFk: "vacuum_filter_id",
    hasStatusAndSource: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.humidifier,
    filtersTable: "humidifier_filters",
    retailerLinksTable: "humidifier_retailer_links",
    retailerFilterFk: "humidifier_filter_id",
    hasStatusAndSource: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.appliance_air,
    filtersTable: "appliance_air_parts",
    retailerLinksTable: "appliance_air_retailer_links",
    retailerFilterFk: "appliance_air_part_id",
    hasStatusAndSource: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    filtersTable: "whole_house_water_parts",
    retailerLinksTable: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    hasStatusAndSource: true,
  },
};

const BIG_BOX_KEYS = new Set([
  "walmart",
  "target",
  "home-depot",
  "lowes",
  "best-buy",
  "costco",
  "ebay",
]);

const TRACKING_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "ref",
  "ref_",
  "tag",
]);

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function slugify(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "store";
}

function canonicalAmazonDpUrl(u: URL): URL | null {
  const m = u.pathname.match(/\/dp\/([a-z0-9]{10})/i);
  if (!m) return null;
  const asin = m[1].toUpperCase();
  return new URL(`https://www.amazon.com/dp/${asin}`);
}

function normalizeUrl(raw: string): string | null {
  const input = raw.trim();
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.hash = "";
  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (TRACKING_QUERY_KEYS.has(lower) || lower.startsWith("utm_")) {
      u.searchParams.delete(key);
    }
  }
  const amazonDp = canonicalAmazonDpUrl(u);
  if (amazonDp) return amazonDp.toString();
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.toString();
}

function inferRetailerKey(retailerName: string, normalizedUrl: string): string {
  const named = normalizeRetailerName(retailerName);
  if (named) return named;
  try {
    const host = new URL(normalizedUrl).hostname.toLowerCase();
    if (host === "amazon.com" || host.endsWith(".amazon.com")) return "amazon";
  } catch {
    // no-op
  }
  return slugify(retailerName);
}

function urlLooksLikeProductLevel(normalizedUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(normalizedUrl);
  } catch {
    return false;
  }
  const pathLower = u.pathname.toLowerCase();
  const hostLower = u.hostname.toLowerCase();
  if (pathLower === "/" || pathLower === "") return false;
  if (canonicalAmazonDpUrl(u)) return true;
  if (
    hostLower.endsWith("appliancepartspros.com") &&
    pathLower.endsWith(".html") &&
    !pathLower.includes("/search") &&
    !pathLower.includes("/category")
  ) {
    return true;
  }
  if (
    pathLower === "/search" ||
    pathLower.startsWith("/search/") ||
    pathLower.includes("/collections/") ||
    pathLower.includes("/category/") ||
    pathLower.endsWith("/collections") ||
    pathLower.endsWith("/category")
  ) {
    return false;
  }
  return (
    pathLower.includes("/products/") ||
    pathLower.includes("/product/") ||
    pathLower.includes("/dp/") ||
    pathLower.includes("/gp/product/") ||
    pathLower.includes("/item/") ||
    pathLower.includes("/parts/") ||
    pathLower.includes("/sku/")
  );
}

function hasExactTokenEvidence(notes: string | null): boolean {
  if (!notes) return false;
  return /\bexact token\b/i.test(notes) && /\bpresent\b/i.test(notes);
}

function classifyDiscovery(
  retailerKey: string,
  normalizedUrl: string,
  notes: string | null,
): DiscoveryClassification {
  if (retailerKey === "amazon") return "direct_buyable";
  if (retailerKey.endsWith("-official") || retailerKey.startsWith("oem-")) {
    return "direct_buyable";
  }
  if (
    retailerKey === "appliancepartspros" &&
    urlLooksLikeProductLevel(normalizedUrl) &&
    hasExactTokenEvidence(notes)
  ) {
    return "direct_buyable";
  }
  if (BIG_BOX_KEYS.has(retailerKey)) return "likely_valid";
  return "likely_valid";
}

export const __testables = {
  canonicalAmazonDpUrl,
  normalizeUrl,
  urlLooksLikeProductLevel,
  classifyDiscovery,
};

function parseInputJson(jsonPath: string): HqIIRawDiscovery[] {
  const abs = path.resolve(process.cwd(), jsonPath);
  const body = fs.readFileSync(abs, "utf8");
  const parsed = JSON.parse(body) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Input JSON must be an array of discovery rows");
  }
  return parsed.map((row) => row as HqIIRawDiscovery);
}

async function main() {
  const inputPath = argValue("--input");
  if (!inputPath) {
    throw new Error("Missing --input <path-to-json>");
  }
  const wedgeArg = argValue("--wedge") ?? HOMEKEEP_WEDGE_CATALOG.air_purifier;
  const allowUnknownRetailers = process.argv.includes("--allow-unknown-retailer");
  if (!isHomekeepWedgeCatalog(wedgeArg)) {
    throw new Error(`Invalid --wedge "${wedgeArg}"`);
  }
  const cfg = TABLES[wedgeArg];
  if (!cfg) throw new Error(`Unsupported wedge "${wedgeArg}"`);

  const raw = parseInputJson(inputPath);
  const rejected: RejectedRow[] = [];
  const pending: Omit<AcceptedRow, "filter_id">[] = [];
  const unknownRetailerInputs = new Set<string>();

  for (const row of raw) {
    const filter_slug = row.filter_slug?.trim() ?? "";
    const retailer_name = row.retailer_name?.trim() ?? "";
    const urlRaw = row.url?.trim() ?? "";
    if (!filter_slug) {
      rejected.push({ input: row, reason: "missing_filter_slug", detail: "filter_slug is required" });
      continue;
    }
    if (!retailer_name) {
      rejected.push({
        input: row,
        reason: "missing_retailer_name",
        detail: "retailer_name is required",
      });
      continue;
    }
    if (!urlRaw) {
      rejected.push({ input: row, reason: "missing_url", detail: "url is required" });
      continue;
    }
    const normalized = normalizeUrl(urlRaw);
    if (!normalized) {
      rejected.push({ input: row, reason: "invalid_url", detail: "url is not a valid http(s) URL" });
      continue;
    }
    if (isSearchEngineDiscoveryUrl(normalized) || isManufacturerSiteSearchUrl(normalized)) {
      rejected.push({
        input: row,
        reason: "search_or_discovery_url",
        detail: "search/discovery URL shape is blocked",
      });
      continue;
    }
    if (isKnownBrokenUrl(normalized) || isKnownIndirectDiscoveryUrl(normalized)) {
      rejected.push({
        input: row,
        reason: "known_broken_or_indirect",
        detail: "known broken or indirect destination",
      });
      continue;
    }
    if (!urlLooksLikeProductLevel(normalized)) {
      rejected.push({
        input: row,
        reason: "not_product_level_url",
        detail: "URL does not look product-level",
      });
      continue;
    }
    const canonicalRetailer = normalizeRetailerName(retailer_name);
    if (!canonicalRetailer && !allowUnknownRetailers) {
      unknownRetailerInputs.add(retailer_name);
      rejected.push({
        input: row,
        reason: "unknown_retailer_name",
        detail:
          `retailer_name "${retailer_name}" is not in canonical mapping. ` +
          "Use a mapped retailer name or pass --allow-unknown-retailer.",
      });
      continue;
    }
    const retailer_key = canonicalRetailer ?? inferRetailerKey(retailer_name, normalized);
    pending.push({
      input: row,
      filter_slug,
      retailer_name,
      retailer_key,
      retailer_slug: retailer_key,
      affiliate_url: normalized,
      classification: classifyDiscovery(retailer_key, normalized, row.notes?.trim() || null),
      notes: row.notes?.trim() || null,
    });
  }

  const supabase = getSupabaseAdmin();
  const filterSlugs = [...new Set(pending.map((p) => p.filter_slug))];
  const { data: filters, error: filterErr } = await supabase
    .from(cfg.filtersTable)
    .select("id, slug")
    .in("slug", filterSlugs);
  if (filterErr) throw filterErr;
  const filterBySlug = new Map((filters ?? []).map((f) => [String(f.slug), String(f.id)]));

  const accepted: AcceptedRow[] = [];
  for (const row of pending) {
    const filter_id = filterBySlug.get(row.filter_slug);
    if (!filter_id) {
      rejected.push({
        input: row.input,
        reason: "unknown_filter_slug",
        detail: `filter slug "${row.filter_slug}" not found in ${cfg.filtersTable}`,
      });
      continue;
    }
    accepted.push({ ...row, filter_id });
  }

  // Enforce uniqueness by (filter, retailer_key), last row wins.
  const uniqueBySlot = new Map<string, AcceptedRow>();
  for (const row of accepted) {
    uniqueBySlot.set(`${row.filter_id}\u0000${row.retailer_key}`, row);
  }
  const dedupedAccepted = [...uniqueBySlot.values()];

  const filterIds = [...new Set(dedupedAccepted.map((r) => r.filter_id))];
  const retailerKeys = [...new Set(dedupedAccepted.map((r) => r.retailer_key))];

  const { data: existingRows, error: existingErr } = await supabase
    .from(cfg.retailerLinksTable)
    .select(`id, ${cfg.retailerFilterFk}, retailer_key`)
    .in(cfg.retailerFilterFk, filterIds)
    .in("retailer_key", retailerKeys);
  if (existingErr) throw existingErr;

  const existingBySlot = new Map<string, string>();
  for (const row of existingRows ?? []) {
    const filterId = String((row as Record<string, unknown>)[cfg.retailerFilterFk] ?? "");
    const retailerKey = String((row as Record<string, unknown>).retailer_key ?? "");
    const id = String((row as Record<string, unknown>).id ?? "");
    existingBySlot.set(`${filterId}\u0000${retailerKey}`, id);
  }

  const nowIso = new Date().toISOString();
  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];
  let insertedEstimate = 0;
  let updatedEstimate = 0;
  for (const row of dedupedAccepted) {
    const slot = `${row.filter_id}\u0000${row.retailer_key}`;
    const existingId = existingBySlot.get(slot);
    const exists = !!existingId;
    if (exists) updatedEstimate += 1;
    else insertedEstimate += 1;
    const payload: Record<string, unknown> = {
      [cfg.retailerFilterFk]: row.filter_id,
      retailer_name: row.retailer_name,
      affiliate_url: row.affiliate_url,
      destination_url: row.affiliate_url,
      is_primary: false,
      retailer_key: row.retailer_key,
      retailer_slug: row.retailer_slug,
      browser_truth_classification: row.classification,
      browser_truth_notes: row.notes,
      browser_truth_checked_at: nowIso,
    };
    if (cfg.hasStatusAndSource) {
      payload.status = "approved";
      payload.source = "manual";
    }
    if (existingId) {
      toUpdate.push({ id: existingId, ...payload });
    } else {
      toInsert.push(payload);
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from(cfg.retailerLinksTable).insert(toInsert, {
      defaultToNull: false,
    });
    if (insertErr) throw insertErr;
  }

  if (toUpdate.length > 0) {
    const { error: upsertErr } = await supabase.from(cfg.retailerLinksTable).upsert(toUpdate, {
      onConflict: "id",
      ignoreDuplicates: false,
      defaultToNull: false,
    });
    if (upsertErr) throw upsertErr;
  }

  const { data: postRows, error: postErr } = await supabase
    .from(cfg.retailerLinksTable)
    .select(
      `${cfg.retailerFilterFk}, id, retailer_name, retailer_key, affiliate_url, browser_truth_classification, browser_truth_checked_at`,
    )
    .in(cfg.retailerFilterFk, filterIds);
  if (postErr) throw postErr;

  const byFilter = new Map<string, Array<Record<string, unknown>>>();
  for (const row of (postRows ?? []) as Array<Record<string, unknown>>) {
    const filterId = String(row[cfg.retailerFilterFk] ?? "");
    if (!byFilter.has(filterId)) byFilter.set(filterId, []);
    byFilter.get(filterId)!.push(row);
  }

  const winners: Array<{
    filter_slug: string;
    filter_id: string;
    winner: { id: string; retailer_key: string | null; affiliate_url: string } | null;
    surviving_link_count: number;
  }> = [];

  for (const [slug, filterId] of filterBySlug.entries()) {
    if (!filterIds.includes(filterId)) continue;
    const rawLinks = (byFilter.get(filterId) ?? []).map((r) => ({
      id: String(r.id),
      retailer_name: (r.retailer_name as string | null) ?? null,
      retailer_key: (r.retailer_key as string | null) ?? null,
      affiliate_url: String(r.affiliate_url ?? ""),
      browser_truth_classification: (r.browser_truth_classification as string | null) ?? null,
      browser_truth_checked_at: (r.browser_truth_checked_at as string | null) ?? null,
    }));
    const surviving = filterRealBuyRetailerLinks(rawLinks);
    const winner = selectBestVerifiedBuyLink(surviving);
    winners.push({
      filter_slug: slug,
      filter_id: filterId,
      winner: winner
        ? {
            id: winner.id,
            retailer_key: winner.retailer_key ?? null,
            affiliate_url: winner.affiliate_url,
          }
        : null,
      surviving_link_count: surviving.length,
    });
  }

  const failedPostInsert = winners.filter((w) => w.surviving_link_count < 1).map((w) => ({
    filter_slug: w.filter_slug,
    reason: "no_live_buyable_link_after_gate",
  }));

  if (unknownRetailerInputs.size > 0) {
    console.warn(
      `[ingest-hqii-retailer-links] unknown retailer_name inputs: ${[...unknownRetailerInputs].join(", ")}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        wedge: cfg.wedge,
        input_count: raw.length,
        accepted_count: dedupedAccepted.length,
        inserted_estimate: insertedEstimate,
        updated_estimate: updatedEstimate,
        inserted_links: dedupedAccepted.map((r) => ({
          filter_slug: r.filter_slug,
          retailer_key: r.retailer_key,
          affiliate_url: r.affiliate_url,
          classification: r.classification,
        })),
        rejected_links: rejected,
        post_insert_failures: failedPostInsert,
        final_cta_winner: winners,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    if (err instanceof Error) {
      console.error(`[ingest-hqii-retailer-links] FAILED: ${err.message}`);
      if (err.stack) console.error(err.stack);
    } else {
      console.error("[ingest-hqii-retailer-links] FAILED (non-Error):", err);
    }
    process.exitCode = 1;
  });
}
