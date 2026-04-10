import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";

export async function getAirPurifierRetailerLinkById(linkId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("air_purifier_retailer_links")
    .select("id, affiliate_url, retailer_key")
    .eq("id", linkId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  const row = data as {
    id: string;
    affiliate_url: string;
    retailer_key: string;
  } | null;
  if (!row || isSearchPlaceholderBuyLink(row.retailer_key, row.affiliate_url)) {
    return null;
  }
  return { id: row.id, affiliate_url: row.affiliate_url };
}
