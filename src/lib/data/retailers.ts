import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getRetailerLinkById(linkId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("retailer_links")
    .select("id, affiliate_url")
    .eq("id", linkId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; affiliate_url: string } | null;
}
