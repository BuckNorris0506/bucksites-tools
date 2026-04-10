import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

type StagedStatus = "ready" | "promoted";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(table: "fridge_models" | "filters", base: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const root = base || "item";
  for (let i = 0; i < 1000; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data, error } = await supabase.from(table).select("slug").eq("slug", candidate).limit(1);
    if (error) throw error;
    if ((data ?? []).length === 0) return candidate;
  }
  throw new Error(`unable to allocate unique slug for ${table}:${base}`);
}

async function markStagedPromoted(table: string, id: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(table)
    .update({ status: "promoted" satisfies StagedStatus })
    .eq("id", id)
    .eq("status", "ready");
  if (error) throw error;
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : `${w[0]!.toUpperCase()}${w.slice(1)}`))
    .join(" ");
}

async function resolveBrandInfo(
  proposedBrandId: string | null,
  proposedBrandSlug: string | null,
): Promise<{ id: string; slug: string | null; name: string | null } | null> {
  const supabase = getSupabaseAdmin();
  if (proposedBrandId) {
    const { data, error } = await supabase
      .from("brands")
      .select("id, slug, name")
      .eq("id", proposedBrandId)
      .limit(1);
    if (error) throw error;
    const b = (data ?? [])[0] as { id: string; slug: string; name: string } | undefined;
    return b ? { id: b.id, slug: b.slug, name: b.name } : null;
  }
  if (!proposedBrandSlug) return null;
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name")
    .eq("slug", proposedBrandSlug)
    .limit(1);
  if (error) throw error;
  const b = (data ?? [])[0] as { id: string; slug: string; name: string } | undefined;
  return b ? { id: b.id, slug: b.slug, name: b.name } : null;
}

async function promoteModels(limit: number, write: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staged_model_additions")
    .select("id, catalog, proposed_model_number, proposed_brand_id, proposed_brand_slug, payload_json")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      proposed_model_number: string;
      proposed_brand_id: string | null;
      proposed_brand_slug: string | null;
      payload_json: Record<string, unknown> | null;
    };
    const brand = await resolveBrandInfo(r.proposed_brand_id, r.proposed_brand_slug);
    if (!brand) {
      console.log(`[promote] skip staged_model_additions id=${r.id} reason=missing_brand`);
      continue;
    }
    const modelNumber = r.proposed_model_number.trim();
    const payloadTitle =
      typeof r.payload_json?.title === "string" && r.payload_json.title.trim().length > 0
        ? r.payload_json.title.trim()
        : null;
    const brandDisplay =
      brand.name?.trim() ||
      (brand.slug ? humanizeSlug(brand.slug) : r.proposed_brand_slug ? humanizeSlug(r.proposed_brand_slug) : null) ||
      "Unknown Brand";
    const title = payloadTitle ?? `${brandDisplay} ${modelNumber} Refrigerator`;
    const { data: existing, error: exErr } = await supabase
      .from("fridge_models")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("model_number", modelNumber)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const slug = await uniqueSlug("fridge_models", slugify(modelNumber));
      const { error: insErr } = await supabase.from("fridge_models").insert({
        brand_id: brand.id,
        model_number: modelNumber,
        slug,
        title,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted("staged_model_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteFilters(limit: number, write: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staged_filter_part_additions")
    .select("id, catalog, proposed_oem_part_number, proposed_brand_id, proposed_brand_slug, payload_json")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      proposed_oem_part_number: string | null;
      proposed_brand_id: string | null;
      proposed_brand_slug: string | null;
      payload_json: Record<string, unknown> | null;
    };
    if (!r.proposed_oem_part_number) {
      console.log(`[promote] skip staged_filter_part_additions id=${r.id} reason=missing_part_number`);
      continue;
    }
    const brand = await resolveBrandInfo(r.proposed_brand_id, r.proposed_brand_slug);
    if (!brand) {
      console.log(`[promote] skip staged_filter_part_additions id=${r.id} reason=missing_brand`);
      continue;
    }
    const partNumber = r.proposed_oem_part_number.trim();
    const payloadName =
      typeof r.payload_json?.name === "string" && r.payload_json.name.trim().length > 0
        ? r.payload_json.name.trim()
        : null;
    const brandDisplay =
      brand.name?.trim() ||
      (brand.slug ? humanizeSlug(brand.slug) : r.proposed_brand_slug ? humanizeSlug(r.proposed_brand_slug) : null) ||
      "Unknown Brand";
    const name = payloadName ?? `${brandDisplay} ${partNumber}`;
    const { data: existing, error: exErr } = await supabase
      .from("filters")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("oem_part_number", partNumber)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const slug = await uniqueSlug("filters", slugify(partNumber));
      const { error: insErr } = await supabase.from("filters").insert({
        brand_id: brand.id,
        oem_part_number: partNumber,
        name,
        slug,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted("staged_filter_part_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteCompat(limit: number, write: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, catalog, compat_table, model_id, part_id")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      compat_table: string;
      model_id: string;
      part_id: string;
    };
    if (r.compat_table !== "compatibility_mappings") {
      console.log(`[promote] skip staged_compatibility_mapping_additions id=${r.id} reason=unsupported_table`);
      continue;
    }
    const { data: existing, error: exErr } = await supabase
      .from("compatibility_mappings")
      .select("fridge_model_id")
      .eq("fridge_model_id", r.model_id)
      .eq("filter_id", r.part_id)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const { error: insErr } = await supabase.from("compatibility_mappings").insert({
        fridge_model_id: r.model_id,
        filter_id: r.part_id,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted("staged_compatibility_mapping_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteAliases(limit: number, write: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("staged_alias_additions")
    .select("id, catalog, target_kind, target_record_id, proposed_alias")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      target_kind: "model" | "filter_part";
      target_record_id: string | null;
      proposed_alias: string;
    };
    if (!r.target_record_id) {
      console.log(`[promote] skip staged_alias_additions id=${r.id} reason=missing_target_record_id`);
      continue;
    }
    const alias = r.proposed_alias.trim();
    if (!alias) {
      console.log(`[promote] skip staged_alias_additions id=${r.id} reason=empty_alias`);
      continue;
    }
    if (write) {
      if (r.target_kind === "model") {
        const { error: insErr } = await supabase.from("fridge_model_aliases").upsert(
          { fridge_model_id: r.target_record_id, alias },
          { onConflict: "fridge_model_id,alias", ignoreDuplicates: true },
        );
        if (insErr) throw insErr;
      } else {
        const { error: insErr } = await supabase.from("filter_aliases").upsert(
          { filter_id: r.target_record_id, alias },
          { onConflict: "filter_id,alias", ignoreDuplicates: true },
        );
        if (insErr) throw insErr;
      }
      await markStagedPromoted("staged_alias_additions", r.id);
    }
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function main() {
  loadEnv();
  const write = process.argv.includes("--write");
  const limit = parseArgNumber("--limit", 200);

  const models = await promoteModels(limit, write);
  const filters = await promoteFilters(limit, write);
  const compat = await promoteCompat(limit, write);
  const aliases = await promoteAliases(limit, write);

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dry_run: !write,
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        staged_status_required: "ready",
        results: {
          models,
          filters,
          compatibility_mappings: compat,
          aliases,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[promote-staged-refrigerator] failed", err);
  process.exit(1);
});
