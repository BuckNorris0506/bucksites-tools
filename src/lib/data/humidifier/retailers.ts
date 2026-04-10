import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getHumidifierRetailerLinkById(linkId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("humidifier_retailer_links")
    .select("id, affiliate_url")
    .eq("id", linkId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; affiliate_url: string } | null;
}
