import type { MetadataRoute } from "next";
import { collectHomekeepWedgeSitemapUrls } from "@/lib/sitemap/wedge-indexable-urls";

/** Regenerate each request so new models/filters appear without a redeploy. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await collectHomekeepWedgeSitemapUrls();
  } catch {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return [{ url: base, lastModified: new Date() }];
  }
}
