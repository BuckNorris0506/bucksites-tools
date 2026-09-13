import type { BrowseFilterRow } from "@/lib/catalog/browse";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isLiveBuyerPathCtaEligibleV1 } from "@/lib/retailers/live-buyer-path-go-decision-v1";
import type { BuyLinkGateLinkV1 } from "@/lib/retailers/launch-buy-links";

export const FRIDGE_HOMEPAGE_STARTING_POINT_CAP_V1 = 6;

type RetailerLinkRow = BuyLinkGateLinkV1 & { filter_id: string };

/**
 * Homepage fridge sample: keep OEM order, but only filters that currently
 * have at least one live-eligible Verified Link. Do not backfill with
 * no-CTA pages (those send people to lookup pages with nothing to buy).
 */
export function selectFridgeHomepageStartingPointsV1(args: {
  browseFilters: BrowseFilterRow[];
  slugsWithLiveVerifiedLink: Iterable<string>;
  cap?: number;
}): BrowseFilterRow[] {
  const cap = args.cap ?? FRIDGE_HOMEPAGE_STARTING_POINT_CAP_V1;
  const allowed = new Set(
    [...args.slugsWithLiveVerifiedLink].map((slug) => slug.trim()).filter(Boolean),
  );
  if (allowed.size === 0 || cap <= 0) return [];
  const out: BrowseFilterRow[] = [];
  for (const row of args.browseFilters) {
    if (!allowed.has(row.slug)) continue;
    out.push(row);
    if (out.length >= cap) break;
  }
  return out;
}

export function slugsWithLiveVerifiedLinkFromRows(args: {
  slugByFilterId: Map<string, string>;
  links: RetailerLinkRow[];
  now?: Date;
}): Set<string> {
  const slugs = new Set<string>();
  for (const link of args.links) {
    const slug = args.slugByFilterId.get(link.filter_id);
    if (!slug || slugs.has(slug)) continue;
    if (isLiveBuyerPathCtaEligibleV1(link, { now: args.now })) {
      slugs.add(slug);
    }
  }
  return slugs;
}

async function loadFilterIdsBySlug(slugs: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const slugToId = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 100) {
    const chunk = slugs.slice(i, i + 100);
    const { data, error } = await supabase.from("filters").select("id, slug").in("slug", chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      const id = (row as { id: string }).id;
      const slug = (row as { slug: string }).slug;
      if (id && slug) slugToId.set(slug, id);
    }
  }
  return slugToId;
}

async function loadRetailerLinksForFilterIds(filterIds: string[]): Promise<RetailerLinkRow[]> {
  const supabase = getSupabaseServerClient();
  const links: RetailerLinkRow[] = [];
  for (let i = 0; i < filterIds.length; i += 100) {
    const chunk = filterIds.slice(i, i + 100);
    const { data, error } = await supabase
      .from("retailer_links")
      .select(
        "filter_id, retailer_key, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype, browser_truth_checked_at, browser_truth_notes",
      )
      .in("filter_id", chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      const filterId = (row as { filter_id: string }).filter_id;
      const affiliateUrl = (row as { affiliate_url: string | null }).affiliate_url;
      if (!filterId || typeof affiliateUrl !== "string" || affiliateUrl.trim() === "") continue;
      links.push({
        filter_id: filterId,
        retailer_key: (row as { retailer_key?: string | null }).retailer_key ?? null,
        affiliate_url: affiliateUrl,
        browser_truth_classification:
          (row as { browser_truth_classification?: string | null }).browser_truth_classification ??
          null,
        browser_truth_buyable_subtype:
          (row as { browser_truth_buyable_subtype?: string | null }).browser_truth_buyable_subtype ??
          null,
        browser_truth_checked_at:
          (row as { browser_truth_checked_at?: string | null }).browser_truth_checked_at ?? null,
        browser_truth_notes:
          (row as { browser_truth_notes?: string | null }).browser_truth_notes ?? null,
      });
    }
  }
  return links;
}

/** Fail closed to [] if retailer-link truth cannot be loaded. */
export async function listFridgeHomepageStartingPointsV1(
  browseFilters: BrowseFilterRow[],
  options?: { now?: Date; cap?: number },
): Promise<BrowseFilterRow[]> {
  if (browseFilters.length === 0) return [];
  try {
    const slugToId = await loadFilterIdsBySlug(browseFilters.map((row) => row.slug));
    const idToSlug = new Map<string, string>();
    for (const [slug, id] of slugToId) idToSlug.set(id, slug);
    const links = await loadRetailerLinksForFilterIds([...slugToId.values()]);
    const slugsWithLiveVerifiedLink = slugsWithLiveVerifiedLinkFromRows({
      slugByFilterId: idToSlug,
      links,
      now: options?.now,
    });
    return selectFridgeHomepageStartingPointsV1({
      browseFilters,
      slugsWithLiveVerifiedLink,
      cap: options?.cap,
    });
  } catch {
    return [];
  }
}
