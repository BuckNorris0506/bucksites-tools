/**
 * Stable catalog ids for global search hits and data attribution.
 * Wedge / `search_gaps` / `search_events` strings live in `./identity` (`HomekeepWedgeCatalog`).
 */

export const CATALOG_REFRIGERATOR_WATER_FILTER =
  "refrigerator_water_filter" as const;
export const CATALOG_AIR_PURIFIER_FILTERS = "air_purifier_filters" as const;
export const CATALOG_VACUUM_FILTERS = "vacuum_filters" as const;
export const CATALOG_HUMIDIFIER_FILTERS = "humidifier_filters" as const;
export const CATALOG_APPLIANCE_AIR_FILTERS = "appliance_air_filters" as const;
export const CATALOG_WHOLE_HOUSE_WATER_FILTERS =
  "whole_house_water_filters" as const;

export type CatalogId =
  | typeof CATALOG_REFRIGERATOR_WATER_FILTER
  | typeof CATALOG_AIR_PURIFIER_FILTERS
  | typeof CATALOG_VACUUM_FILTERS
  | typeof CATALOG_HUMIDIFIER_FILTERS
  | typeof CATALOG_APPLIANCE_AIR_FILTERS
  | typeof CATALOG_WHOLE_HOUSE_WATER_FILTERS;

/** Display order on global /search */
export const ALL_CATALOGS: CatalogId[] = [
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_VACUUM_FILTERS,
  CATALOG_HUMIDIFIER_FILTERS,
  CATALOG_APPLIANCE_AIR_FILTERS,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
];

export const CATALOG_LABELS: Record<CatalogId, string> = {
  [CATALOG_REFRIGERATOR_WATER_FILTER]: "Refrigerator water filter",
  [CATALOG_AIR_PURIFIER_FILTERS]: "Air purifier filter",
  [CATALOG_VACUUM_FILTERS]: "Vacuum filter",
  [CATALOG_HUMIDIFIER_FILTERS]: "Humidifier filter",
  [CATALOG_APPLIANCE_AIR_FILTERS]: "Appliance air filter",
  [CATALOG_WHOLE_HOUSE_WATER_FILTERS]: "Whole-house water filter",
};
