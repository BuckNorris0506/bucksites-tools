export const VERTICAL_LAUNCH_STATES = {
  refrigerator: "LIVE",
  "air-purifier": "LIVE",
  "whole-house-water": "LIVE",
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

