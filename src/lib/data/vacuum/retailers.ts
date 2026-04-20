import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";

export async function getVacuumRetailerLinkById(linkId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vacuum_retailer_links")
    .select(
      "id, affiliate_url, retailer_key, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
    )
    .eq("id", linkId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  const row = data as {
    id: string;
    affiliate_url: string;
    retailer_key: string;
    browser_truth_classification?: string | null;
    browser_truth_notes?: string | null;
    browser_truth_checked_at?: string | null;
  } | null;

  if (!row || isSearchPlaceholderBuyLink(row.retailer_key, row.affiliate_url)) {
    return null;
  }

  return {
    id: row.id,
    affiliate_url: row.affiliate_url,
    retailer_key: row.retailer_key,
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_notes: row.browser_truth_notes ?? null,
    browser_truth_checked_at: row.browser_truth_checked_at ?? null,
  };
}