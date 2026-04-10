import { loadEnv } from "./lib/load-env";
import {
  buildBrandCandidates,
  compactAlnum,
  extractPayloadInferredBrand,
  extractPayloadSourceQuery,
  needsBrandResolution,
  type BrandRow,
  type FilterAliasRow,
  type FilterWithBrand,
} from "./lib/refrigerator-filter-brand-candidates";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const CATALOG = HOMEKEEP_WEDGE_CATALOG.refrigerator_water;

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function selectPaged<T>(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  columns: string,
  pageSize: number,
): Promise<T[]> {
  const acc: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = (data ?? []) as T[];
    acc.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return acc;
}

async function main() {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const limit = parseArgNumber("--limit", 200);
  const top = parseArgNumber("--top", 8);
  const pageSize = parseArgNumber("--page-size", 1500);

  const { data: stagedRaw, error: stagedErr } = await supabase
    .from("staged_filter_part_additions")
    .select(
      "id, status, catalog, normalized_query, proposed_oem_part_number, proposed_brand_id, proposed_brand_slug, target_part_id, proposed_alias, payload_json, search_gap_candidate_id, created_at",
    )
    .eq("catalog", CATALOG)
    .in("status", ["queued", "reviewing"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (stagedErr) throw stagedErr;

  const stagedRows = (stagedRaw ?? []) as Array<{
    id: number;
    status: string;
    normalized_query: string;
    proposed_oem_part_number: string | null;
    proposed_brand_id: string | null;
    proposed_brand_slug: string | null;
    target_part_id: string | null;
    proposed_alias: string | null;
    payload_json: Record<string, unknown>;
    search_gap_candidate_id: number;
    created_at: string;
  }>;

  const [brands, filters, aliases] = await Promise.all([
    selectPaged<BrandRow>(supabase, "brands", "id, slug, name", pageSize),
    selectPaged<FilterWithBrand>(
      supabase,
      "filters",
      "id, slug, oem_part_number, brands:brand_id(slug, name)",
      pageSize,
    ),
    selectPaged<FilterAliasRow>(supabase, "filter_aliases", "filter_id, alias", pageSize),
  ]);

  const brandById = new Map(brands.map((b) => [b.id, b] as const));
  const brandSlugLower = new Set(brands.map((b) => b.slug.toLowerCase()));

  const candIds = Array.from(new Set(stagedRows.map((r) => r.search_gap_candidate_id)));
  const gapByCand = new Map<
    number,
    { candidate_normalized: string; gap_sample_raw: string; gap_normalized: string; search_gap_id: number }
  >();

  if (candIds.length > 0) {
    const { data: cands, error: cErr } = await supabase
      .from("search_gap_candidates")
      .select("id, search_gap_id, normalized_query")
      .in("id", candIds);
    if (cErr) throw cErr;
    const gapIds = Array.from(
      new Set((cands ?? []).map((c) => (c as { search_gap_id: number }).search_gap_id)),
    );
    const { data: gaps, error: gErr } = await supabase
      .from("search_gaps")
      .select("id, sample_raw_query, normalized_query")
      .in("id", gapIds);
    if (gErr) throw gErr;
    const gapMap = new Map(
      (gaps ?? []).map((g) => {
        const row = g as { id: number; sample_raw_query: string; normalized_query: string };
        return [row.id, row] as const;
      }),
    );
    for (const c of cands ?? []) {
      const row = c as { id: number; search_gap_id: number; normalized_query: string };
      const g = gapMap.get(row.search_gap_id);
      gapByCand.set(row.id, {
        candidate_normalized: row.normalized_query,
        gap_sample_raw: g?.sample_raw_query ?? "",
        gap_normalized: g?.normalized_query ?? "",
        search_gap_id: row.search_gap_id,
      });
    }
  }

  const rows = [];
  for (const s of stagedRows) {
    if (!needsBrandResolution(s.proposed_brand_id, s.proposed_brand_slug, brandById, brandSlugLower)) {
      continue;
    }

    const gap = gapByCand.get(s.search_gap_candidate_id);
    const sampleRaw = gap?.gap_sample_raw ?? "";
    const gapNorm = gap?.gap_normalized ?? "";
    const candNorm = gap?.candidate_normalized ?? "";

    const payloadSource = extractPayloadSourceQuery(s.payload_json);
    const payloadInferred = extractPayloadInferredBrand(s.payload_json);

    const tokens = Array.from(
      new Set(
        [s.proposed_oem_part_number, s.proposed_alias, sampleRaw, gapNorm, candNorm, s.normalized_query, payloadSource]
          .filter(Boolean)
          .flatMap((t) =>
            String(t)
              .toUpperCase()
              .split(/[^A-Z0-9/-]+/)
              .map((x) => x.trim())
              .filter((x) => x.length >= 4),
          ),
      ),
    );

    const candidatesFull = buildBrandCandidates({
      proposedOem: s.proposed_oem_part_number,
      sampleRawQuery: sampleRaw,
      normalizedQuery: gapNorm || candNorm,
      stagedNormalizedQuery: s.normalized_query,
      payloadJson: s.payload_json,
      filters,
      aliases,
      brands,
    });

    rows.push({
      staged_filter_part_addition_id: s.id,
      status: s.status,
      created_at: s.created_at,
      proposed_oem_part_number: s.proposed_oem_part_number,
      proposed_brand_id: s.proposed_brand_id,
      proposed_brand_slug: s.proposed_brand_slug,
      proposed_alias: s.proposed_alias,
      target_part_id: s.target_part_id,
      search_gap_candidate_id: s.search_gap_candidate_id,
      search_gap_id: gap?.search_gap_id ?? null,
      source_queries: {
        search_gap_sample_raw_query: sampleRaw || null,
        search_gap_normalized_query: gapNorm || null,
        candidate_normalized_query: candNorm || null,
        staged_normalized_query: s.normalized_query,
        payload_source_query: payloadSource || null,
      },
      payload_inferred_brand_slug: payloadInferred,
      normalized_token_hints: tokens.slice(0, 24),
      query_compact_for_matching: compactAlnum(
        Array.from(
          new Set(
            [sampleRaw, gapNorm, candNorm, s.normalized_query, payloadSource]
              .filter(Boolean)
              .map((t) => String(t).trim().toLowerCase()),
          ),
        ).join(" "),
      ),
      brand_candidates: candidatesFull.slice(0, top),
    });
  }

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scope: CATALOG,
        read_only: true,
        statuses: ["queued", "reviewing"],
        filter: "proposed_brand_slug null/unknown OR proposed_brand_id not resolving to brands.id",
        staged_rows_fetched: stagedRows.length,
        rows_needing_brand: rows.length,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[review-staged-filter-brand-refrigerator] failed", err);
  process.exit(1);
});
