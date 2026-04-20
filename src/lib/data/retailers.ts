import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";

export type RetailerLinkForGoRoute = {
  id: string;
  affiliate_url: string;
  filter_id: string;
  retailer_key: string;
  filter_slug: string | null;
  browser_truth_classification?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

/**
 * Resolves a fridge `retailer_links` row for `/go/[linkId]` redirect + legacy click logging
 * (`click_events.filter_id`, `retailer_slug`, `page_slug`).
 */
export async function getRetailerLinkById(linkId: string): Promise<RetailerLinkForGoRoute | null> {
  const supabase = getSupabaseServerClient();
  const { data: link, error } = await supabase
    .from("retailer_links")
    .select(
      "id, affiliate_url, filter_id, retailer_key, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
    )
    .eq("id", linkId)
    .maybeSingle();

  if (error) throw error;
  if (!link) return null;

  const row = link as {
    id: string;
    affiliate_url: string;
    filter_id: string;
    retailer_key: string;
    browser_truth_classification?: string | null;
    browser_truth_notes?: string | null;
    browser_truth_checked_at?: string | null;
  };

  if (isSearchPlaceholderBuyLink(row.retailer_key, row.affiliate_url)) {
    return null;
  }

  const { data: fil, error: fErr } = await supabase
    .from("filters")
    .select("slug, oem_part_number")
    .eq("id", row.filter_id)
    .maybeSingle();

  if (fErr) throw fErr;

  return {
    id: row.id,
    affiliate_url: row.affiliate_url,
    filter_id: row.filter_id,
    retailer_key: row.retailer_key,
    filter_slug: (fil as { slug?: string } | null)?.slug ?? null,
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_notes: row.browser_truth_notes ?? null,
    browser_truth_checked_at: row.browser_truth_checked_at ?? null,
  };
}
