import type { Metadata } from "next";

/**
 * Layout `metadata.robots` for product verticals where `VERTICAL_LAUNCH_STATES[slug] !== "LIVE"`.
 * Routes stay available for humans and QA (`follow`); crawlers should not index until the wedge is LIVE.
 */
export const NON_LIVE_WEDGE_ROBOTS: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: true },
};
