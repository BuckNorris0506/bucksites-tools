import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";
import {
  ABOUT_FOUNDER_EMAIL,
  ABOUT_GENERAL_EMAIL,
  ABOUT_ORG_DESCRIPTION,
} from "@/lib/about/about-content-v1";
import { type JsonLdObject } from "@/lib/seo/structured-data";

import {
  BUCKPARTS_HORIZONTAL_LOGO_PATH,
} from "@/lib/brand/buckparts-brand-assets-v1";

function absoluteUrl(path: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function aboutPageFounderPersonId(siteUrl?: string): string {
  const base = (siteUrl ?? getRequiredSiteUrl()).replace(/\/$/, "");
  return `${base}/about#jared-buckman`;
}

/** About-page Organization + Person graph — same Organization @id as site-wide JSON-LD. */
export function buildAboutPageJsonLdGraphV1(siteUrl?: string): JsonLdObject[] {
  const url = (siteUrl ?? getRequiredSiteUrl()).replace(/\/$/, "");
  const orgId = `${url}/#organization`;
  const personId = aboutPageFounderPersonId(url);

  const person: JsonLdObject = {
    "@type": "Person",
    "@id": personId,
    name: "Jared Buckman",
    jobTitle: "Founder, BuckParts",
    description: "Founder of BuckParts and an AP Statistics teacher.",
    email: ABOUT_FOUNDER_EMAIL,
  };

  const organization: JsonLdObject = {
    "@type": "Organization",
    "@id": orgId,
    name: SITE_DISPLAY_NAME,
    url,
    logo: absoluteUrl(BUCKPARTS_HORIZONTAL_LOGO_PATH, url),
    description: ABOUT_ORG_DESCRIPTION,
    email: ABOUT_GENERAL_EMAIL,
    founder: { "@id": personId },
  };

  return [
    { "@context": "https://schema.org", ...person },
    { "@context": "https://schema.org", ...organization },
  ];
}
