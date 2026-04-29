import type { MetadataRoute } from "next";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getRequiredSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/go/",
        "/air-purifier/go/",
        "/whole-house-water/go/",
        "/vacuum/go/",
        "/humidifier/go/",
        "/appliance-air/go/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
