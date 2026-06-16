import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

import {
  CORE_400S_CONFUSABLE_SERIES,
  CORE_400S_STANDARD_FILTER_SLUG,
  deriveCore400sConfusableFamilies,
  sortCore400sModels,
  type Core400sConfusableCandidate,
  type Core400sConfusableFamily,
  type Core400sModelSummary,
} from "@/lib/air-purifier/core-400s-flagship-v1";
import type { AirPurifierModelWithFilters } from "./models";

export type Core400sFlagshipBundle = {
  familyModels: Core400sModelSummary[];
  alsoFitsModels: Core400sModelSummary[];
  confusableFamilies: Core400sConfusableFamily[];
};

type CsvModelRow = {
  brand_slug: string;
  slug: string;
  model_number: string;
  title: string;
  series: string;
  notes: string;
};

type CsvFilterRow = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
  replacement_interval_months: string;
  notes: string;
};

type CsvCompatibilityRow = {
  model_slug: string;
  filter_slug: string;
  is_recommended: string;
};

type Core400sRepoRows = {
  models: CsvModelRow[];
  filters: CsvFilterRow[];
  compatibilityMappings: CsvCompatibilityRow[];
};

export async function getCore400sFlagshipBundle(
  model: AirPurifierModelWithFilters,
): Promise<Core400sFlagshipBundle> {
  return buildCore400sFlagshipBundleFromRepoRows(model, loadCore400sRepoRows());
}

export function buildCore400sFlagshipBundleFromRepoRows(
  model: AirPurifierModelWithFilters,
  rows: Core400sRepoRows,
): Core400sFlagshipBundle {
  const primaryFilter =
    model.filters.find((filter) => filter.slug === CORE_400S_STANDARD_FILTER_SLUG) ??
    model.filters[0] ??
    null;
  const brandSlug = model.brand.slug;
  const brandName = model.brand.name;
  const targetFilterSlug = primaryFilter?.slug ?? CORE_400S_STANDARD_FILTER_SLUG;

  const familyModels = rows.models
    .filter((row) => row.brand_slug === brandSlug && row.series === model.series)
    .map((row) => toModelSummary(row, brandName));

  const alsoFitsModelSlugs = new Set(
    rows.compatibilityMappings
      .filter((row) => row.filter_slug === targetFilterSlug)
      .map((row) => row.model_slug),
  );
  const alsoFitsModels = rows.models
    .filter((row) => alsoFitsModelSlugs.has(row.slug))
    .map((row) => toModelSummary(row, brandName));

  const filtersBySlug = new Map(rows.filters.map((row) => [row.slug, row]));
  const mappingsByModelSlug = new Map<string, CsvCompatibilityRow[]>();
  for (const mapping of rows.compatibilityMappings) {
    const list = mappingsByModelSlug.get(mapping.model_slug) ?? [];
    list.push(mapping);
    mappingsByModelSlug.set(mapping.model_slug, list);
  }
  const confusableCandidates: Core400sConfusableCandidate[] = rows.models
    .filter(
      (row) =>
        row.brand_slug === brandSlug &&
        CORE_400S_CONFUSABLE_SERIES.some((series) => series === row.series) &&
        isClearlyNamedConfusableCoreFamily(row),
    )
    .map((row) => ({
      ...toModelSummary(row, brandName),
      filters: (mappingsByModelSlug.get(row.slug) ?? [])
        .map((mapping) => filtersBySlug.get(mapping.filter_slug))
        .filter((filter): filter is CsvFilterRow => Boolean(filter))
        .map((filter) => ({
          slug: filter.slug,
          oem_part_number: filter.oem_part_number,
          name: filter.name,
        })),
    }));

  return {
    familyModels: sortCore400sModels(familyModels),
    alsoFitsModels: sortCore400sModels(alsoFitsModels),
    confusableFamilies: deriveCore400sConfusableFamilies(confusableCandidates),
  };
}

function loadCore400sRepoRows(): Core400sRepoRows {
  return {
    models: loadCsv<CsvModelRow>("data/air-purifier/models.csv"),
    filters: loadCsv<CsvFilterRow>("data/air-purifier/filters.csv"),
    compatibilityMappings: loadCsv<CsvCompatibilityRow>(
      "data/air-purifier/compatibility_mappings.csv",
    ),
  };
}

function loadCsv<T>(relativePath: string): T[] {
  const absolutePath = path.join(process.cwd(), relativePath);
  return parse(readFileSync(absolutePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
}

function isClearlyNamedConfusableCoreFamily(row: CsvModelRow): boolean {
  const modelNumber = row.model_number.trim().toLowerCase();
  return CORE_400S_CONFUSABLE_SERIES.some(
    (series) => row.series === series && modelNumber.startsWith(series.toLowerCase()),
  );
}

function toModelSummary(row: CsvModelRow, brandName: string): Core400sModelSummary {
  return {
    id: row.slug,
    slug: row.slug,
    model_number: row.model_number,
    title: row.title,
    series: row.series,
    brand: { slug: row.brand_slug, name: brandName },
  };
}
