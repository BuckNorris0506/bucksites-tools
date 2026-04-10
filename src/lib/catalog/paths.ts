import type { CatalogId } from "./constants";
import {
  CATALOG_AIR_PURIFIER_FILTERS,
  CATALOG_APPLIANCE_AIR_FILTERS,
  CATALOG_HUMIDIFIER_FILTERS,
  CATALOG_REFRIGERATOR_WATER_FILTER,
  CATALOG_VACUUM_FILTERS,
  CATALOG_WHOLE_HOUSE_WATER_FILTERS,
} from "./constants";

export function catalogModelPath(catalog: CatalogId, slug: string): string {
  switch (catalog) {
    case CATALOG_REFRIGERATOR_WATER_FILTER:
      return `/fridge/${slug}`;
    case CATALOG_AIR_PURIFIER_FILTERS:
      return `/air-purifier/model/${slug}`;
    case CATALOG_VACUUM_FILTERS:
      return `/vacuum/model/${slug}`;
    case CATALOG_HUMIDIFIER_FILTERS:
      return `/humidifier/model/${slug}`;
    case CATALOG_APPLIANCE_AIR_FILTERS:
      return `/appliance-air/model/${slug}`;
    case CATALOG_WHOLE_HOUSE_WATER_FILTERS:
      return `/whole-house-water/model/${slug}`;
    default: {
      const _x: never = catalog;
      return _x;
    }
  }
}

export function catalogFilterPath(catalog: CatalogId, slug: string): string {
  switch (catalog) {
    case CATALOG_REFRIGERATOR_WATER_FILTER:
      return `/filter/${slug}`;
    case CATALOG_AIR_PURIFIER_FILTERS:
      return `/air-purifier/filter/${slug}`;
    case CATALOG_VACUUM_FILTERS:
      return `/vacuum/filter/${slug}`;
    case CATALOG_HUMIDIFIER_FILTERS:
      return `/humidifier/filter/${slug}`;
    case CATALOG_APPLIANCE_AIR_FILTERS:
      return `/appliance-air/filter/${slug}`;
    case CATALOG_WHOLE_HOUSE_WATER_FILTERS:
      return `/whole-house-water/filter/${slug}`;
    default: {
      const _x: never = catalog;
      return _x;
    }
  }
}
