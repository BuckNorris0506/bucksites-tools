import type { Brand } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as Brand | null;
}

export async function listBrandsForNav(): Promise<Pick<Brand, "slug" | "name">[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("brands")
    .select("slug, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<Brand, "slug" | "name">[];
}
