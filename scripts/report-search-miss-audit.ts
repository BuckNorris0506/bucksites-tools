import { searchCatalog } from "@/lib/data/search";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import {
  MODEL_SAMPLE_CATALOGS,
  buildSearchMissAuditReport,
  resolveConcurrency,
  type ModelSeedRow,
} from "./lib/search-miss-audit";

function parseArgNumber(flag: string, fallback: number): number {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const raw = process.argv[idx + 1];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function loadModelSeeds(perCatalog: number): Promise<ModelSeedRow[]> {
  const supabase = getSupabaseAdmin();
  const seeds: ModelSeedRow[] = [];
  for (const cfg of MODEL_SAMPLE_CATALOGS) {
    const { data, error } = await supabase
      .from(cfg.table)
      .select("slug, model_number, model_number_norm, brands:brand_id(name, slug)")
      .order("model_number", { ascending: true })
      .limit(perCatalog);
    if (error) throw error;
    for (const row of data ?? []) {
      const rec = row as unknown as {
        slug: string;
        model_number: string;
        model_number_norm: string | null;
        brands?: { name: string; slug: string } | null;
      };
      if (!rec.slug || !rec.model_number || !rec.brands?.slug || !rec.brands?.name) continue;
      seeds.push({
        catalog: cfg.catalog,
        catalog_id: cfg.catalog_id,
        slug: rec.slug,
        model_number: rec.model_number,
        model_number_norm: rec.model_number_norm,
        brand_name: rec.brands.name,
        brand_slug: rec.brands.slug,
      });
    }
  }
  return seeds;
}

async function main() {
  loadEnv();
  const perCatalog = parseArgNumber("--per-catalog", 25);
  const concurrencyIdx = process.argv.indexOf("--concurrency");
  const concurrencyRaw = concurrencyIdx === -1 ? 3 : (process.argv[concurrencyIdx + 1] ?? "");
  const concurrency = resolveConcurrency(concurrencyRaw);
  const seeds = await loadModelSeeds(perCatalog);

  const report = await buildSearchMissAuditReport({
    seeds,
    perCatalog,
    concurrency,
    runSearch: (query) => searchCatalog(query, { skipTelemetry: true }),
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("[report-search-miss-audit] failed", err);
  process.exit(1);
});
