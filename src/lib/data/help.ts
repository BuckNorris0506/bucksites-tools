import type { HelpPage, ResetInstruction } from "@/lib/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export async function getHelpPageBySlug(slug: string): Promise<HelpPage | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("help_pages")
    .select("id, slug, title, body, meta_description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as HelpPage | null;
}

export async function listHelpPages(): Promise<
  Pick<HelpPage, "slug" | "title" | "meta_description">[]
> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("help_pages")
    .select("slug, title, meta_description")
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<HelpPage, "slug" | "title" | "meta_description">[];
}

export async function getResetInstructionsForBrandSlug(brandSlug: string) {
  const supabase = getSupabaseServerClient();

  const { data: brand, error: bErr } = await supabase
    .from("brands")
    .select("id, slug, name")
    .eq("slug", brandSlug)
    .maybeSingle();

  if (bErr) throw bErr;
  if (!brand) return null;

  const { data: instructions, error: iErr } = await supabase
    .from("reset_instructions")
    .select("id, title, body_markdown")
    .eq("brand_id", brand.id)
    .order("title", { ascending: true });

  if (iErr) throw iErr;

  return {
    brand: brand as { id: string; slug: string; name: string },
    instructions: (instructions ?? []) as Pick<
      ResetInstruction,
      "id" | "title" | "body_markdown"
    >[],
  };
}
