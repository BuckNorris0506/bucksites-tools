import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getVacuumRetailerLinkById(linkId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vacuum_retailer_links")
    .select("id, affiliate_url")
    .eq("id", linkId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; affiliate_url: string } | null;
}
