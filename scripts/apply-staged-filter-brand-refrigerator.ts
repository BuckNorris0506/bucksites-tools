import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { needsBrandResolution } from "./lib/refrigerator-filter-brand-candidates";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.refrigerator_water;

function parseArgNumber(flag: string): number | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseArgString(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  return v && v.trim().length > 0 ? v.trim() : null;
}

function reportBeforeToAfter(
  r: {
    status: string;
    proposed_brand_id: string | null;
    proposed_brand_slug: string | null;
  },
  p: Record<string, unknown>,
): Record<string, string | null> {
  return {
    status: (p.status as string | undefined) ?? r.status,
    proposed_brand_id: (p.proposed_brand_id as string | undefined) ?? r.proposed_brand_id ?? null,
    proposed_brand_slug: (p.proposed_brand_slug as string | undefined) ?? r.proposed_brand_slug ?? null,
  };
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();

  const stagedId = parseArgNumber("--id");
  const brandSlugArg = parseArgString("--brand-slug");
  const write = process.argv.includes("--write");
  const markReady = process.argv.includes("--mark-ready");

  if (!stagedId) {
    throw new Error("Missing required --id <staged_filter_part_additions.id>");
  }
  if (!brandSlugArg && !markReady) {
    throw new Error("Provide --brand-slug <slug> and/or --mark-ready (manual promotion step)");
  }

  const { data: stagedRaw, error: fetchErr } = await supabase
    .from("staged_filter_part_additions")
    .select(
      "id, status, catalog, proposed_oem_part_number, proposed_brand_id, proposed_brand_slug, search_gap_candidate_id",
    )
    .eq("id", stagedId)
    .limit(1);
  if (fetchErr) throw fetchErr;
  const row = (stagedRaw ?? [])[0] as
    | {
        id: number;
        status: string;
        catalog: string;
        proposed_oem_part_number: string | null;
        proposed_brand_id: string | null;
        proposed_brand_slug: string | null;
        search_gap_candidate_id: number;
      }
    | undefined;
  if (!row) {
    throw new Error(`staged_filter_part_additions id=${stagedId} not found`);
  }
  if (row.catalog !== CATALOG) {
    throw new Error(`Row id=${stagedId} catalog=${row.catalog} (expected ${CATALOG})`);
  }
  if (!["queued", "reviewing", "ready"].includes(row.status)) {
    throw new Error(`Row id=${stagedId} status=${row.status} — only queued/reviewing/ready are supported`);
  }

  const { data: brands, error: bErr } = await supabase.from("brands").select("id, slug, name");
  if (bErr) throw bErr;
  const brandList = (brands ?? []) as Array<{ id: string; slug: string; name: string }>;
  const brandById = new Map(brandList.map((b) => [b.id, b] as const));
  const brandSlugLower = new Set(brandList.map((b) => b.slug.toLowerCase()));

  const unresolved = needsBrandResolution(
    row.proposed_brand_id,
    row.proposed_brand_slug,
    brandById,
    brandSlugLower,
  );

  let resolvedBrand: { id: string; slug: string; name: string } | null = null;
  if (brandSlugArg) {
    const want = brandSlugArg.toLowerCase();
    resolvedBrand = brandList.find((b) => b.slug.toLowerCase() === want) ?? null;
    if (!resolvedBrand) {
      throw new Error(
        `Unknown --brand-slug "${brandSlugArg}". Known slugs include: ${brandList
          .map((b) => b.slug)
          .sort()
          .join(", ")}`,
      );
    }
  }

  if (markReady && unresolved && !resolvedBrand) {
    throw new Error(
      `Row id=${stagedId} still needs a resolved brand; run with --brand-slug before --mark-ready, or fix data.`,
    );
  }

  const patch: Record<string, unknown> = {};

  if (resolvedBrand) {
    const sameSlug =
      row.proposed_brand_slug?.toLowerCase() === resolvedBrand.slug.toLowerCase();
    const sameId = row.proposed_brand_id === resolvedBrand.id;
    if (!sameSlug) patch.proposed_brand_slug = resolvedBrand.slug;
    if (!sameId) patch.proposed_brand_id = resolvedBrand.id;
  }

  if (markReady && row.status !== "ready") {
    patch.status = "ready";
  }

  const wouldChange = Object.keys(patch).length > 0;

  const report = {
    generated_at: new Date().toISOString(),
    scope: CATALOG,
    staged_filter_part_addition_id: stagedId,
    write,
    dry_run: !write,
    before: {
      status: row.status,
      proposed_brand_id: row.proposed_brand_id,
      proposed_brand_slug: row.proposed_brand_slug,
      proposed_oem_part_number: row.proposed_oem_part_number,
    },
    patch: wouldChange ? patch : {},
    idempotent_noop: !wouldChange,
    after: wouldChange ? reportBeforeToAfter(row, patch) : undefined,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!write) {
    console.error(
      "[apply-staged-filter-brand-refrigerator] dry-run only (omit changes). Re-run with --write to apply.",
    );
    return;
  }

  if (!wouldChange) {
    console.error("[apply-staged-filter-brand-refrigerator] nothing to update (already idempotent state).");
    return;
  }

  const { data: updated, error: upErr } = await supabase
    .from("staged_filter_part_additions")
    .update(patch)
    .eq("id", stagedId)
    .eq("catalog", CATALOG)
    .in("status", ["queued", "reviewing", "ready"])
    .select("id, status, proposed_brand_id, proposed_brand_slug");
  if (upErr) throw upErr;
  if (!updated?.length) {
    throw new Error("Update matched 0 rows (concurrent status change?). Re-fetch and retry.");
  }

  console.error(`[apply-staged-filter-brand-refrigerator] updated id=${stagedId} ok`);
}

main().catch((err) => {
  console.error("[apply-staged-filter-brand-refrigerator] failed", err);
  process.exit(1);
});
