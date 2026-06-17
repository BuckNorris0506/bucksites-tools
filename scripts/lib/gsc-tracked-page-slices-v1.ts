import { AP_HOMEOWNER_FILTER_PILOT_SLUGS } from "@/lib/air-purifier/ap-homeowner-framework-v1";
import type { GscTrackedPageSliceV1 } from "@/lib/owner-dashboard/gsc-api-artifact";

export const GSC_TRACKED_PAGE_SLICES_CONTRACT_V1 = "gsc_tracked_page_slices_v1" as const;

type FilteredApiRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  position?: number;
};

function asFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function resolveGscTrackedPagePublicOrigin(
  env: Record<string, string | undefined> = process.env,
  args?: { gscProperty?: string },
): string {
  const publicSite = (env.BUCKPARTS_PUBLIC_SITE_URL ?? "").trim();
  if (publicSite.length > 0) {
    return publicSite.replace(/\/$/, "");
  }

  const property = (args?.gscProperty ?? env.GSC_PROPERTY_SITE_URL ?? "").trim();
  if (property === "sc-domain:buckparts.com" || property === "https://buckparts.com/") {
    return "https://buckparts.com";
  }

  const raw = (env.NEXT_PUBLIC_SITE_URL ?? "https://buckparts.com").trim();
  return raw.replace(/\/$/, "");
}

export function buildApHomeownerPilotFilterPageUrl(slug: string, origin: string): string {
  const normalizedSlug = slug.trim().toLowerCase();
  return `${origin}/air-purifier/filter/${normalizedSlug}`;
}

export function apHomeownerPilotTrackedPageTargets(
  env: Record<string, string | undefined> = process.env,
  args?: { gscProperty?: string },
): Array<{ slug: string; page_url: string }> {
  const origin = resolveGscTrackedPagePublicOrigin(env, args);
  return AP_HOMEOWNER_FILTER_PILOT_SLUGS.map((slug) => ({
    slug,
    page_url: buildApHomeownerPilotFilterPageUrl(slug, origin),
  }));
}

export function buildTrackedPageSliceFromFilteredRows(args: {
  slug: string;
  page_url: string;
  rows: FilteredApiRow[];
}): GscTrackedPageSliceV1 {
  if (args.rows.length === 0) {
    return {
      slug: args.slug,
      page_url: args.page_url,
      match_status: "ZERO_IN_RANGE",
      impressions: 0,
      clicks: 0,
      ctr: "UNKNOWN",
      average_position: "UNKNOWN",
      gsc_page_key: "UNKNOWN",
    };
  }

  const row = args.rows[0];
  const key = Array.isArray(row.keys) ? row.keys[0] : null;
  const impressions = asFiniteNumber(row.impressions);
  const clicks = asFiniteNumber(row.clicks);
  const position = row.position;

  return {
    slug: args.slug,
    page_url: args.page_url,
    match_status: "FOUND",
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : "UNKNOWN",
    average_position:
      typeof position === "number" && Number.isFinite(position) ? position : "UNKNOWN",
    gsc_page_key: typeof key === "string" && key.length > 0 ? key : "UNKNOWN",
  };
}

export function buildQueryFailedTrackedPageSlice(args: {
  slug: string;
  page_url: string;
}): GscTrackedPageSliceV1 {
  return {
    slug: args.slug,
    page_url: args.page_url,
    match_status: "QUERY_FAILED",
    impressions: "UNKNOWN",
    clicks: "UNKNOWN",
    ctr: "UNKNOWN",
    average_position: "UNKNOWN",
    gsc_page_key: "UNKNOWN",
  };
}

export function buildNotFetchedTrackedPageSlice(args: {
  slug: string;
  page_url: string;
}): GscTrackedPageSliceV1 {
  return {
    slug: args.slug,
    page_url: args.page_url,
    match_status: "NOT_FETCHED",
    impressions: "UNKNOWN",
    clicks: "UNKNOWN",
    ctr: "UNKNOWN",
    average_position: "UNKNOWN",
    gsc_page_key: "UNKNOWN",
  };
}

export function buildNotFetchedApHomeownerPilotTrackedPageSlices(
  env: Record<string, string | undefined> = process.env,
  args?: { gscProperty?: string },
): GscTrackedPageSliceV1[] {
  return apHomeownerPilotTrackedPageTargets(env, args).map((target) =>
    buildNotFetchedTrackedPageSlice(target),
  );
}
