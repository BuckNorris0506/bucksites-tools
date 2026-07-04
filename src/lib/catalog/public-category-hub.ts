import type { CatalogBrowseCategory } from "@/lib/catalog/browse";
import { HOMEKEEP_WEDGE_CATALOG_ORDER } from "@/lib/catalog/identity";
import {
  isVerticalLive,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";

/** All replacement-filter wedges with public route trees (shown on `/catalog`). */
export const PUBLIC_CATEGORY_HUB_ORDER = HOMEKEEP_WEDGE_CATALOG_ORDER;

const CATEGORY_TO_VERTICAL: Record<CatalogBrowseCategory, VerticalSlug> = {
  refrigerator_water: "refrigerator",
  air_purifier: "air-purifier",
  vacuum: "vacuum",
  humidifier: "humidifier",
  appliance_air: "appliance-air",
  whole_house_water: "whole-house-water",
};

type HubCardStatic = {
  href: string;
  title: string;
  description: string;
};

const HUB_CARD_STATIC: Record<CatalogBrowseCategory, HubCardStatic> = {
  refrigerator_water: {
    href: "/brand",
    title: "Refrigerator water filters",
    description: "Fridge models and filter numbers by brand and part number.",
  },
  air_purifier: {
    href: "/air-purifier",
    title: "Air purifier filters",
    description:
      "Air purifier filter lookup—buying options appear only where listing checks pass, not on every filter.",
  },
  whole_house_water: {
    href: "/whole-house-water",
    title: "Whole-house water filters",
    description: "System cartridges and housings by brand and part number.",
  },
  vacuum: {
    href: "/vacuum",
    title: "Vacuum filters",
    description: "Vacuum models and replacement filter numbers.",
  },
  humidifier: {
    href: "/humidifier",
    title: "Humidifier filters",
    description: "Humidifier models, wicks, pads, and cartridges.",
  },
  appliance_air: {
    href: "/appliance-air",
    title: "Appliance air filters",
    description: "Built-in appliance air filters by brand and part number.",
  },
};

export type PublicCategoryHubCard = HubCardStatic & {
  category: CatalogBrowseCategory;
  verticalSlug: VerticalSlug;
  isLive: boolean;
  statusLabel: string | null;
  statusNote: string | null;
};

/** Category-wide browse disclaimer (not a sales or popularity chart). */
export const PUBLIC_CATEGORY_HUB_BROWSE_DISCLAIMER =
  "Browse lists in each category come from our data—not a popularity ranking, sales chart, or bestseller list.";

export function buildPublicCategoryHubCards(): PublicCategoryHubCard[] {
  return PUBLIC_CATEGORY_HUB_ORDER.map((category) => {
    const verticalSlug = CATEGORY_TO_VERTICAL[category];
    const isLive = isVerticalLive(verticalSlug);
    const staticCard = HUB_CARD_STATIC[category];
    return {
      category,
      verticalSlug,
      ...staticCard,
      isLive,
      statusLabel: isLive ? null : "Browse preview",
      statusNote: isLive
        ? null
        : "Browse preview. Buying options appear only after part-page checks pass.",
    };
  });
}
