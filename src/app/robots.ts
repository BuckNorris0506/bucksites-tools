import type { MetadataRoute } from "next";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getRequiredSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
