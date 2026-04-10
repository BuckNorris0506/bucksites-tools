/**
 * BuckParts catalog identity: wedge / search-intelligence strings stored in
 * `search_gaps.catalog`, `search_events.catalog`, and wedge operator tooling.
 *
 * These differ from `CatalogId` in `./constants` (e.g. `refrigerator_water_filter`),
 * which labels unified search hits. Use `wedgeCatalogForCatalogId` when logging
 * telemetry or writing gap-related code from a hit catalog.
 */
import type { CatalogId } from "./constants";
import {
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_APPLIANCE_AIR_FILTERS,
  CATALOG_HUMIDIFIER_FILTERS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_VACUUM_FILTERS,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
} from "./constants";

/** Global unified `/search` bucket (not a browse wedge). */
export const HOMEKEEP_GLOBAL_SEARCH_CATALOG = "all_catalogs" as const;

/** Canonical wedge keys: browse category, telemetry, and search_gaps for vertical searches. */
export const HOMEKEEP_WEDGE_CATALOG = {
  refrigerator_water: "refrigerator_water",
  air_purifier: "air_purifier",
  vacuum: "vacuum",
  humidifier: "humidifier",
  appliance_air: "appliance_air",
  whole_house_water: "whole_house_water",
} as const;

export type HomekeepWedgeCatalog =
  (typeof HOMEKEEP_WEDGE_CATALOG)[keyof typeof HOMEKEEP_WEDGE_CATALOG];

/** Display / iteration order aligned with `ALL_CATALOGS` in `./constants`. */
export const HOMEKEEP_WEDGE_CATALOG_ORDER = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.vacuum,
  HOMEKEEP_WEDGE_CATALOG.humidifier,
  HOMEKEEP_WEDGE_CATALOG.appliance_air,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
] as const satisfies readonly HomekeepWedgeCatalog[];

export type HomekeepSearchIntelligenceCatalog =
  | HomekeepWedgeCatalog
  | typeof HOMEKEEP_GLOBAL_SEARCH_CATALOG;

/** Subset covered by monetization / cross-wedge ops reports. */
export const HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
] as const;

export type HomekeepMonetizationWedgeCatalog =
  (typeof HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER)[number];

/** Map unified-search hit catalog → wedge / DB `catalog` column for that vertical. */
export const CATALOG_ID_TO_WEDGE: Record<CatalogId, HomekeepWedgeCatalog> = {
  [CATALOG_REFRIGERATOR_WATER_FILTER]: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  [CATALOG_AIR_PURIFIER_FILTERS]: HOMEKEEP_WEDGE_CATALOG.air_purifier,
  [CATALOG_VACUUM_FILTERS]: HOMEKEEP_WEDGE_CATALOG.vacuum,
  [CATALOG_HUMIDIFIER_FILTERS]: HOMEKEEP_WEDGE_CATALOG.humidifier,
  [CATALOG_APPLIANCE_AIR_FILTERS]: HOMEKEEP_WEDGE_CATALOG.appliance_air,
  [CATALOG_WHOLE_HOUSE_WATER_FILTERS]: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
};

export function wedgeCatalogForCatalogId(catalog: CatalogId): HomekeepWedgeCatalog {
  return CATALOG_ID_TO_WEDGE[catalog];
}

export function wedgeCatalogsForGapQuery(
  wedge: HomekeepWedgeCatalog,
): [HomekeepWedgeCatalog, typeof HOMEKEEP_GLOBAL_SEARCH_CATALOG] {
  return [wedge, HOMEKEEP_GLOBAL_SEARCH_CATALOG];
}

/** Runtime check without casting DB `catalog` text through nominal types. */
export function wedgeAllowsSearchGapCatalog(
  wedge: HomekeepWedgeCatalog,
  catalog: string,
): boolean {
  return catalog === wedge || catalog === HOMEKEEP_GLOBAL_SEARCH_CATALOG;
}

export function monetizationWedgeGapCatalogsWithGlobal(): readonly (
  | HomekeepMonetizationWedgeCatalog
  | typeof HOMEKEEP_GLOBAL_SEARCH_CATALOG
)[] {
  return [...HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER, HOMEKEEP_GLOBAL_SEARCH_CATALOG];
}

export function monetizationWedgeGapCatalogsOnly(): readonly HomekeepMonetizationWedgeCatalog[] {
  return [...HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER];
}

export function isHomekeepWedgeCatalog(s: string): s is HomekeepWedgeCatalog {
  return (Object.values(HOMEKEEP_WEDGE_CATALOG) as string[]).includes(s);
}

export function isHomekeepSearchIntelligenceCatalog(
  s: string,
): s is HomekeepSearchIntelligenceCatalog {
  return s === HOMEKEEP_GLOBAL_SEARCH_CATALOG || isHomekeepWedgeCatalog(s);
}
