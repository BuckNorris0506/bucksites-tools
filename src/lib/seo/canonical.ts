import type { Metadata } from "next";

import type { PageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** True when page-state robots metadata allows indexing. */
export function isIndexablePageState(pageState: PageState): boolean {
  return getRobotsFromPageState(pageState).index;
}

/**
 * Self-referencing canonical for indexable routes only.
 * Noindex routes omit canonical — avoids pairing noindex with a canonical that
 * could send mixed consolidation signals; Next resolves alternates.canonical via metadataBase.
 */
export function canonicalAlternatesForIndexablePath(
  path: string,
  pageState: PageState,
): Pick<Metadata, "alternates"> | undefined {
  if (!isIndexablePageState(pageState)) {
    return undefined;
  }
  return { alternates: { canonical: normalizePath(path) } };
}

/** Self-referencing canonical for routes without page-state noindex gating. */
export function canonicalAlternatesForPath(path: string): Pick<Metadata, "alternates"> {
  return { alternates: { canonical: normalizePath(path) } };
}
