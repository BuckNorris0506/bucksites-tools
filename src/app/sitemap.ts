import type { MetadataRoute } from "next";
import { collectHomekeepWedgeSitemapUrls } from "@/lib/sitemap/wedge-indexable-urls";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

/** Regenerate each request so new models/filters appear without a redeploy. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await collectHomekeepWedgeSitemapUrls();
  } catch {
    const base = getRequiredSiteUrl();
    return [{ url: base, lastModified: new Date() }];
  }
}
