import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { CatalogBrowseCategory } from "@/lib/catalog/browse";

/** Catalog hub (/catalog) lists only launch wedges — not vacuum / humidifier / appliance-air. */
const CATALOG_HUB_LAUNCH_ONLY = new Set<CatalogBrowseCategory>([
  "refrigerator_water",
  "air_purifier",
  "whole_house_water",
]);
import { loadRefrigeratorUsefulFilterIds } from "@/lib/data/refrigerator-filter-usefulness";
import { loadAirPurifierUsefulFilterIds } from "@/lib/data/air-purifier-filter-usefulness";
import { loadWholeHouseWaterUsefulFilterIds } from "@/lib/data/whole-house-water-filter-usefulness";

const TABLES: Record<
  CatalogBrowseCategory,
  { models: string; filters: string }
> = {
  refrigerator_water: { models: "fridge_models", filters: "filters" },
  air_purifier: {
    models: "air_purifier_models",
    filters: "air_purifier_filters",
  },
  vacuum: { models: "vacuum_models", filters: "vacuum_filters" },
  humidifier: { models: "humidifier_models", filters: "humidifier_filters" },
  appliance_air: { models: "appliance_air_models", filters: "appliance_air_parts" },
  whole_house_water: {
    models: "whole_house_water_models",
    filters: "whole_house_water_parts",
  },
};

export type CategoryInventoryCounts = {
  modelCount: number;
  filterCount: number;
};

export async function getCategoryInventoryCounts(
  category: CatalogBrowseCategory,
): Promise<CategoryInventoryCounts> {
  const supabase = getSupabaseServerClient();
  const { models, filters } = TABLES[category];
  const mRes = await supabase.from(models).select("id", { count: "exact", head: true });
  if (mRes.error) throw mRes.error;
  let filterCount = 0;
  if (category === "refrigerator_water") {
    const useful = await loadRefrigeratorUsefulFilterIds();
    filterCount = useful.size;
  } else if (category === "air_purifier") {
    const useful = await loadAirPurifierUsefulFilterIds();
    filterCount = useful.size;
  } else if (category === "whole_house_water") {
    const useful = await loadWholeHouseWaterUsefulFilterIds();
    filterCount = useful.size;
  } else {
    const fRes = await supabase.from(filters).select("id", { count: "exact", head: true });
    if (fRes.error) throw fRes.error;
    filterCount = fRes.count ?? 0;
  }
  return {
    modelCount: mRes.count ?? 0,
    filterCount,
  };
}

export function categoryHasInventory(counts: CategoryInventoryCounts): boolean {
  return counts.modelCount > 0 || counts.filterCount > 0;
}

export type CatalogCardDef = {
  category: CatalogBrowseCategory;
  href: string;
  title: string;
  description: string;
};

const CATALOG_CARD_DEFS_ALL: CatalogCardDef[] = [
  {
    category: "refrigerator_water",
    href: "/",
    title: "Refrigerator water filters",
    description: "Fridge models and OEM cartridges by brand and part number.",
  },
  {
    category: "air_purifier",
    href: "/air-purifier",
    title: "Air purifiers",
    description: "Replacement filters for room air purifiers.",
  },
  {
    category: "vacuum",
    href: "/vacuum",
    title: "Vacuum",
    description: "Filters for vacuums and similar units.",
  },
  {
    category: "humidifier",
    href: "/humidifier",
    title: "Humidifiers",
    description: "Wicks, pads, and cartridges for humidifiers.",
  },
  {
    category: "appliance_air",
    href: "/appliance-air",
    title: "Appliance air",
    description: "Air filters built into appliances.",
  },
  {
    category: "whole_house_water",
    href: "/whole-house-water",
    title: "Whole-house water",
    description: "System cartridges and housings.",
  },
];

const CATALOG_CARD_DEFS = CATALOG_CARD_DEFS_ALL.filter((def) =>
  CATALOG_HUB_LAUNCH_ONLY.has(def.category),
);

/** Categories that have at least one model or filter row (safe to surface in nav/catalog). */
export async function listPopulatedCatalogCards(): Promise<CatalogCardDef[]> {
  const results = await Promise.all(
    CATALOG_CARD_DEFS.map(async (def) => {
      try {
        const counts = await getCategoryInventoryCounts(def.category);
        return categoryHasInventory(counts) ? def : null;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((x): x is CatalogCardDef => x !== null);
}

export async function catalogHasAnyPopulatedCategory(): Promise<boolean> {
  const cards = await listPopulatedCatalogCards();
  return cards.length > 0;
}
