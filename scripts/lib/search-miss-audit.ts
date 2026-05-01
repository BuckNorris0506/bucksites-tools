import {
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
  type CatalogId,
} from "@/lib/catalog/constants";
import type { SearchHit } from "@/lib/data/search";

export type SearchMissAuditCatalog =
  | "refrigerator_water"
  | "air_purifier"
  | "whole_house_water";

export type ModelSeedRow = {
  catalog: SearchMissAuditCatalog;
  catalog_id: CatalogId;
  slug: string;
  model_number: string;
  model_number_norm: string | null;
  brand_name: string;
  brand_slug: string;
};

export type QueryVariantType =
  | "brand_model_prefix"
  | "brand_full_model"
  | "model_family_spacing"
  | "brand_compact_partial";

export type QueryVariant = {
  query_variant_type: QueryVariantType;
  query: string;
};

export type MissClassification =
  | "HIT_PRESENT_EXPECTED"
  | "MISS_ZERO_HIT_EXPECTED_MATCH"
  | "MISS_EXPECTED_NOT_IN_RESULTS"
  | "HIT_PRESENT_OTHER_ONLY"
  | "UNKNOWN_EXPECTATION";

export type SearchMissAuditRow = {
  catalog: SearchMissAuditCatalog;
  catalog_id: CatalogId;
  seed_slug: string;
  seed_model_number: string;
  seed_brand_slug: string;
  seed_brand_name: string;
  query_variant_type: QueryVariantType;
  query: string;
  expected_hit: { catalog_id: CatalogId; slug: string; kind: "fridge" | "model" };
  observed_hit_count: number;
  observed_expected_hit: boolean;
  observed_sample_hits: string[];
  classification: MissClassification;
  priority_score: number;
  suggested_small_fix: string;
};

export type PrioritizedFixGroup = {
  key: string;
  catalog: SearchMissAuditCatalog;
  classification: MissClassification;
  query_variant_type: QueryVariantType;
  miss_count: number;
  sample_queries: string[];
  sample_seed_models: string[];
  suggested_small_fix: string;
};

export type SearchMissAuditReport = {
  report_name: "buckparts_search_miss_audit_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  parameters: {
    per_catalog: number;
    concurrency: number;
    catalogs: SearchMissAuditCatalog[];
    variants: QueryVariantType[];
  };
  summary: {
    total_seed_models: number;
    total_rows: number;
    miss_rows: number;
    by_catalog: Record<SearchMissAuditCatalog, { rows: number; misses: number }>;
    by_classification: Partial<Record<MissClassification, number>>;
  };
  rows: SearchMissAuditRow[];
  prioritized_fix_list: PrioritizedFixGroup[];
};

export function resolveConcurrency(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 3;
  return Math.min(10, Math.floor(n));
}

function modelPrefixToken(modelNumber: string): string | null {
  const tokens = modelNumber
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const first = tokens[0]!;
  if (first.length >= 3) return first;
  return null;
}

function compactModelToken(modelNumber: string): string {
  return modelNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateQueryVariants(seed: ModelSeedRow): QueryVariant[] {
  const variants: QueryVariant[] = [];
  const seen = new Set<string>();
  const add = (query_variant_type: QueryVariantType, query: string) => {
    const q = query.trim().replace(/\s+/g, " ");
    if (q.length < 2) return;
    const key = `${query_variant_type}:${q.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    variants.push({ query_variant_type, query: q });
  };

  const prefix = modelPrefixToken(seed.model_number);
  if (prefix) {
    add("brand_model_prefix", `${seed.brand_slug} ${prefix}`);
  }

  add("brand_full_model", `${seed.brand_slug} ${seed.model_number.toLowerCase()}`);
  add("model_family_spacing", seed.model_number.toLowerCase().replace(/[-_/]+/g, " "));

  const compact = compactModelToken(seed.model_number);
  if (compact.length >= 6) {
    add("brand_compact_partial", `${seed.brand_slug} ${compact.slice(0, 6)}`);
  }

  return variants;
}

function expectedKindForCatalog(catalog: SearchMissAuditCatalog): "fridge" | "model" {
  return catalog === "refrigerator_water" ? "fridge" : "model";
}

function hitSignature(hit: SearchHit): string {
  if (hit.kind === "filter") {
    return `${hit.catalog}:filter:${hit.slug}:${hit.oem_part_number}`;
  }
  return `${hit.catalog}:${hit.kind}:${hit.slug}:${hit.model_number}`;
}

function suggestedFixForClassification(
  classification: MissClassification,
  variant: QueryVariantType,
): string {
  if (classification === "MISS_ZERO_HIT_EXPECTED_MATCH") {
    if (variant === "brand_model_prefix") {
      return "Add or tune brand+model-prefix fallback for this catalog search path.";
    }
    if (variant === "model_family_spacing") {
      return "Tune model token normalization for punctuation/spacing variants.";
    }
    return "Add targeted query token fallback before concluding no result.";
  }
  if (classification === "MISS_EXPECTED_NOT_IN_RESULTS") {
    return "Investigate ranking/dedup so expected model is not dropped by competing matches.";
  }
  if (classification === "HIT_PRESENT_OTHER_ONLY") {
    return "Review cross-catalog bleed; consider tighter catalog-intent interpretation.";
  }
  return "No fix needed from this row.";
}

export function classifyExpectedHit(args: {
  seed: ModelSeedRow;
  expectedKind: "fridge" | "model";
  hits: SearchHit[];
}): {
  classification: MissClassification;
  observed_expected_hit: boolean;
  observed_hit_count: number;
  observed_sample_hits: string[];
} {
  const { seed, expectedKind, hits } = args;
  const expected = hits.some(
    (h) => h.catalog === seed.catalog_id && h.kind === expectedKind && h.slug === seed.slug,
  );
  const sameCatalog = hits.some((h) => h.catalog === seed.catalog_id);
  const sample = hits.slice(0, 6).map(hitSignature);
  if (!seed.slug || !seed.catalog_id) {
    return {
      classification: "UNKNOWN_EXPECTATION",
      observed_expected_hit: false,
      observed_hit_count: hits.length,
      observed_sample_hits: sample,
    };
  }
  if (expected) {
    return {
      classification: "HIT_PRESENT_EXPECTED",
      observed_expected_hit: true,
      observed_hit_count: hits.length,
      observed_sample_hits: sample,
    };
  }
  if (hits.length === 0) {
    return {
      classification: "MISS_ZERO_HIT_EXPECTED_MATCH",
      observed_expected_hit: false,
      observed_hit_count: 0,
      observed_sample_hits: [],
    };
  }
  if (sameCatalog) {
    return {
      classification: "MISS_EXPECTED_NOT_IN_RESULTS",
      observed_expected_hit: false,
      observed_hit_count: hits.length,
      observed_sample_hits: sample,
    };
  }
  return {
    classification: "HIT_PRESENT_OTHER_ONLY",
    observed_expected_hit: false,
    observed_hit_count: hits.length,
    observed_sample_hits: sample,
  };
}

export function buildPrioritizedFixList(rows: SearchMissAuditRow[]): PrioritizedFixGroup[] {
  const misses = rows.filter((r) => r.classification !== "HIT_PRESENT_EXPECTED");
  const grouped = new Map<string, PrioritizedFixGroup>();
  for (const row of misses) {
    const key = `${row.catalog}|${row.classification}|${row.query_variant_type}`;
    const cur = grouped.get(key);
    if (!cur) {
      grouped.set(key, {
        key,
        catalog: row.catalog,
        classification: row.classification,
        query_variant_type: row.query_variant_type,
        miss_count: 1,
        sample_queries: [row.query],
        sample_seed_models: [row.seed_model_number],
        suggested_small_fix: row.suggested_small_fix,
      });
      continue;
    }
    cur.miss_count += 1;
    if (cur.sample_queries.length < 5 && !cur.sample_queries.includes(row.query)) {
      cur.sample_queries.push(row.query);
    }
    if (
      cur.sample_seed_models.length < 5 &&
      !cur.sample_seed_models.includes(row.seed_model_number)
    ) {
      cur.sample_seed_models.push(row.seed_model_number);
    }
  }
  return Array.from(grouped.values()).sort((a, b) => {
    if (b.miss_count !== a.miss_count) return b.miss_count - a.miss_count;
    if (a.catalog !== b.catalog) return a.catalog.localeCompare(b.catalog);
    return a.query_variant_type.localeCompare(b.query_variant_type);
  });
}

export async function buildSearchMissAuditReport(args: {
  seeds: ModelSeedRow[];
  perCatalog: number;
  concurrency?: number;
  variants?: QueryVariantType[];
  runSearch: (query: string) => Promise<SearchHit[]>;
  now?: () => Date;
}): Promise<SearchMissAuditReport> {
  const now = args.now ?? (() => new Date());
  const concurrency = resolveConcurrency(args.concurrency ?? 3);
  const allowedVariants =
    args.variants ??
    ([
      "brand_model_prefix",
      "brand_full_model",
      "model_family_spacing",
      "brand_compact_partial",
    ] as QueryVariantType[]);

  const tasks: Array<{
    seed: ModelSeedRow;
    expectedKind: "fridge" | "model";
    variant: QueryVariant;
  }> = [];
  for (const seed of args.seeds) {
    const expectedKind = expectedKindForCatalog(seed.catalog);
    const variants = generateQueryVariants(seed).filter((v) =>
      allowedVariants.includes(v.query_variant_type),
    );
    for (const variant of variants) {
      tasks.push({ seed, expectedKind, variant });
    }
  }

  const rows = new Array<SearchMissAuditRow>(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) return;
      const task = tasks[index]!;
      const hits = await args.runSearch(task.variant.query);
      const classified = classifyExpectedHit({
        seed: task.seed,
        expectedKind: task.expectedKind,
        hits,
      });
      const missWeight =
        classified.classification === "MISS_ZERO_HIT_EXPECTED_MATCH"
          ? 100
          : classified.classification === "MISS_EXPECTED_NOT_IN_RESULTS"
            ? 80
            : classified.classification === "HIT_PRESENT_OTHER_ONLY"
              ? 60
              : classified.classification === "UNKNOWN_EXPECTATION"
                ? 40
                : 0;
      rows[index] = {
        catalog: task.seed.catalog,
        catalog_id: task.seed.catalog_id,
        seed_slug: task.seed.slug,
        seed_model_number: task.seed.model_number,
        seed_brand_slug: task.seed.brand_slug,
        seed_brand_name: task.seed.brand_name,
        query_variant_type: task.variant.query_variant_type,
        query: task.variant.query,
        expected_hit: {
          catalog_id: task.seed.catalog_id,
          slug: task.seed.slug,
          kind: task.expectedKind,
        },
        observed_hit_count: classified.observed_hit_count,
        observed_expected_hit: classified.observed_expected_hit,
        observed_sample_hits: classified.observed_sample_hits,
        classification: classified.classification,
        priority_score:
          missWeight + (task.variant.query_variant_type === "brand_model_prefix" ? 5 : 0),
        suggested_small_fix: suggestedFixForClassification(
          classified.classification,
          task.variant.query_variant_type,
        ),
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length || 1) }, () => worker()));

  rows.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    if (a.catalog !== b.catalog) return a.catalog.localeCompare(b.catalog);
    if (a.seed_model_number !== b.seed_model_number) {
      return a.seed_model_number.localeCompare(b.seed_model_number);
    }
    return a.query_variant_type.localeCompare(b.query_variant_type);
  });

  const byCatalog: Record<SearchMissAuditCatalog, { rows: number; misses: number }> = {
    refrigerator_water: { rows: 0, misses: 0 },
    air_purifier: { rows: 0, misses: 0 },
    whole_house_water: { rows: 0, misses: 0 },
  };
  const byClassification: Partial<Record<MissClassification, number>> = {};
  for (const row of rows) {
    byCatalog[row.catalog].rows += 1;
    if (row.classification !== "HIT_PRESENT_EXPECTED") {
      byCatalog[row.catalog].misses += 1;
    }
    byClassification[row.classification] = (byClassification[row.classification] ?? 0) + 1;
  }

  return {
    report_name: "buckparts_search_miss_audit_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    parameters: {
      per_catalog: args.perCatalog,
      concurrency,
      catalogs: ["refrigerator_water", "air_purifier", "whole_house_water"],
      variants: allowedVariants,
    },
    summary: {
      total_seed_models: args.seeds.length,
      total_rows: rows.length,
      miss_rows: rows.filter((r) => r.classification !== "HIT_PRESENT_EXPECTED").length,
      by_catalog: byCatalog,
      by_classification: byClassification,
    },
    rows,
    prioritized_fix_list: buildPrioritizedFixList(rows),
  };
}

export const MODEL_SAMPLE_CATALOGS: ReadonlyArray<{
  catalog: SearchMissAuditCatalog;
  catalog_id: CatalogId;
  table: "fridge_models" | "air_purifier_models" | "whole_house_water_models";
}> = [
  {
    catalog: "refrigerator_water",
    catalog_id: CATALOG_REFRIGERATOR_WATER_FILTER,
    table: "fridge_models",
  },
  {
    catalog: "air_purifier",
    catalog_id: CATALOG_AIR_PURIFIER_FILTERS,
    table: "air_purifier_models",
  },
  {
    catalog: "whole_house_water",
    catalog_id: CATALOG_WHOLE_HOUSE_WATER_FILTERS,
    table: "whole_house_water_models",
  },
] as const;
