/**
 * Read-only owner summary: vertical launch state vs sitemap, layout robots, and public promo policy.
 * Derive from repo constants — do not duplicate launch truth manually.
 */
import { CATALOG_HUB_LAUNCH_CATEGORIES } from "@/lib/catalog/catalog-availability";
import { PUBLIC_CATEGORY_HUB_ORDER } from "@/lib/catalog/public-category-hub";
import type { CatalogId } from "@/lib/catalog/constants";
import {
  CATALOG_ID_TO_WEDGE,
  HOMEKEEP_WEDGE_CATALOG,
  type HomekeepWedgeCatalog,
} from "@/lib/catalog/identity";
import {
  VERTICAL_LAUNCH_STATES,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY,
  getVerticalLaunchState,
  isVerticalLive,
  type VerticalLaunchState,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";

/** Keep aligned with fridge-first homepage browse promo (`src/app/page.tsx`). */
export const FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS: readonly VerticalSlug[] = ["refrigerator"];

const VERTICAL_SLUG_TO_WEDGE: Record<VerticalSlug, HomekeepWedgeCatalog> = {
  refrigerator: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  "air-purifier": HOMEKEEP_WEDGE_CATALOG.air_purifier,
  "whole-house-water": HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  vacuum: HOMEKEEP_WEDGE_CATALOG.vacuum,
  humidifier: HOMEKEEP_WEDGE_CATALOG.humidifier,
  "appliance-air": HOMEKEEP_WEDGE_CATALOG.appliance_air,
};

const WEDGE_TO_PRIMARY_CATALOG_ID: Record<HomekeepWedgeCatalog, CatalogId> = (() => {
  const out = {} as Record<HomekeepWedgeCatalog, CatalogId>;
  for (const [catalogId, wedge] of Object.entries(CATALOG_ID_TO_WEDGE) as [CatalogId, HomekeepWedgeCatalog][]) {
    out[wedge] = catalogId;
  }
  return out;
})();

const CATALOG_HUB_LIVE_SET = new Set<HomekeepWedgeCatalog>(CATALOG_HUB_LAUNCH_CATEGORIES);
const PUBLIC_CATALOG_HUB_SET = new Set<HomekeepWedgeCatalog>(PUBLIC_CATEGORY_HUB_ORDER);

const GENERATED_FROM = [
  "src/lib/catalog/vertical-launch-state.ts",
  "src/lib/catalog/catalog-availability.ts",
  "src/lib/sitemap/wedge-indexable-urls.ts",
  "src/lib/catalog/non-live-wedge-robots.ts",
  "src/app/page.tsx (homepage browse promo; see FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS)",
] as const;

export type OwnerVerticalLaunchPolicyRow = {
  vertical_slug: VerticalSlug;
  wedge_catalog: HomekeepWedgeCatalog;
  primary_search_catalog_id: CatalogId;
  launch_state: VerticalLaunchState;
  is_live: boolean;
  /** True when this vertical should emit discovery URLs in `collectHomekeepWedgeSitemapUrls` (LIVE + in discovery list). */
  sitemap_discovery_urls_expected: boolean;
  /** True when `src/app/<vertical>/layout.tsx` applies `noindex,follow` (non-LIVE + segment layout). */
  layout_noindex_follow_expected: boolean;
  /** True when `/catalog` hub lists this wedge (see `PUBLIC_CATEGORY_HUB_ORDER`). */
  catalog_hub_promo_expected: boolean;
  /** True when wedge is LIVE on the public hub (see `CATALOG_HUB_LAUNCH_CATEGORIES`). */
  catalog_hub_live_promo_expected: boolean;
  /** True when homepage browse strip promotes this vertical (fridge-first list). */
  homepage_browse_promo_expected: boolean;
  owner_note: string | null;
};

export type OwnerVerticalLaunchPolicyReport = {
  data_mutation: false;
  generated_from: readonly string[];
  rows: OwnerVerticalLaunchPolicyRow[];
};

function segmentLayoutNoindexExpected(vertical: VerticalSlug): boolean {
  return (
    VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(vertical) && !isVerticalLive(vertical)
  );
}

function sitemapDiscoveryExpected(vertical: VerticalSlug): boolean {
  return (
    isVerticalLive(vertical) &&
    VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY.includes(vertical)
  );
}

function ownerNoteForRow(
  vertical: VerticalSlug,
  isLive: boolean,
): string | null {
  if (
    isLive &&
    !VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY.includes(vertical) &&
    VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(vertical)
  ) {
    return "LIVE but not in VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY — homekeep sitemap will omit discovery URLs unless wedge-indexable is extended.";
  }
  return null;
}

export function buildOwnerVerticalLaunchPolicyReport(): OwnerVerticalLaunchPolicyReport {
  const rows: OwnerVerticalLaunchPolicyRow[] = (
    Object.keys(VERTICAL_LAUNCH_STATES) as VerticalSlug[]
  )
    .sort((a, b) => a.localeCompare(b))
    .map((vertical) => {
      const wedge = VERTICAL_SLUG_TO_WEDGE[vertical];
      const launch_state = getVerticalLaunchState(vertical);
      const live = isVerticalLive(vertical);
      return {
        vertical_slug: vertical,
        wedge_catalog: wedge,
        primary_search_catalog_id: WEDGE_TO_PRIMARY_CATALOG_ID[wedge],
        launch_state,
        is_live: live,
        sitemap_discovery_urls_expected: sitemapDiscoveryExpected(vertical),
        layout_noindex_follow_expected: segmentLayoutNoindexExpected(vertical),
        catalog_hub_promo_expected: PUBLIC_CATALOG_HUB_SET.has(wedge),
        catalog_hub_live_promo_expected: CATALOG_HUB_LIVE_SET.has(wedge),
        homepage_browse_promo_expected: FRIDGE_FIRST_HOMEPAGE_BROWSE_PROMO_VERTICALS.includes(vertical),
        owner_note: ownerNoteForRow(vertical, live),
      };
    });

  return {
    data_mutation: false,
    generated_from: [...GENERATED_FROM],
    rows,
  };
}

export function attachOwnerVerticalLaunchPolicyReport<T extends object>(
  report: T,
  policy: OwnerVerticalLaunchPolicyReport,
): T & { owner_vertical_launch_policy: OwnerVerticalLaunchPolicyReport } {
  return {
    ...report,
    owner_vertical_launch_policy: policy,
  };
}
