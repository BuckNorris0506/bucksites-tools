import type { MetadataRoute } from "next";
import { collectHomekeepWedgeSitemapUrls } from "@/lib/sitemap/wedge-indexable-urls";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

/** Regenerate each request so new models/filters appear without a redeploy. */
export const dynamic = "force-dynamic";

// Explicit, named fallback so homepage-only sitemap behavior is detectable in audits/tests.
export function buildHomepageOnlySitemapFallback(
  error: unknown,
  now: () => Date = () => new Date(),
): MetadataRoute.Sitemap {
  console.error("[sitemap] generation failed; using homepage-only fallback", error);
  const base = getRequiredSiteUrl();
  return [{ url: base, lastModified: now() }];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await collectHomekeepWedgeSitemapUrls();
  } catch (error) {
    return buildHomepageOnlySitemapFallback(error);
  }
}
