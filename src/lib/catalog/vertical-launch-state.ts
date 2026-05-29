export const VERTICAL_LAUNCH_STATES = {
  refrigerator: "LIVE",
  "air-purifier": "LIVE",
  "whole-house-water": "NOINDEX_UNPROVEN",
  vacuum: "NOINDEX_UNPROVEN",
  humidifier: "NOINDEX_UNPROVEN",
  "appliance-air": "NOINDEX_UNPROVEN",
} as const;

export type VerticalSlug = keyof typeof VERTICAL_LAUNCH_STATES;
export type VerticalLaunchState = (typeof VERTICAL_LAUNCH_STATES)[VerticalSlug];

export function getVerticalLaunchState(vertical: VerticalSlug): VerticalLaunchState {
  return VERTICAL_LAUNCH_STATES[vertical];
}

export function isVerticalLive(vertical: VerticalSlug): boolean {
  return getVerticalLaunchState(vertical) === "LIVE";
}

export function getSitemapLaunchVerticals(): VerticalSlug[] {
  return (Object.keys(VERTICAL_LAUNCH_STATES) as VerticalSlug[]).filter((vertical) =>
    isVerticalLive(vertical),
  );
}

/**
 * Verticals for which `collectHomekeepWedgeSitemapUrls` emits brand/model/part discovery URLs
 * when `isVerticalLive(vertical)` (see `src/lib/sitemap/wedge-indexable-urls.ts`).
 */
export const VERTICAL_SLUGS_WITH_HOMEKEEP_SITEMAP_DISCOVERY: readonly VerticalSlug[] = [
  "refrigerator",
  "air-purifier",
  "whole-house-water",
];

/** Route segments with `src/app/<slug>/layout.tsx` noindex policy (excludes fridge `/fridge` tree). */
export const VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT: readonly VerticalSlug[] = [
  "air-purifier",
  "whole-house-water",
  "vacuum",
  "humidifier",
  "appliance-air",
];

