import { SITE_DISPLAY_NAME } from "@/lib/site-brand";
import { SITE_SOCIAL_OG_DESCRIPTION } from "@/lib/site-social-metadata";
import { getRequiredSiteUrl } from "@/lib/site-url/get-required-site-url";

/** Keys forbidden in Phase 1 refrigerator SEO JSON-LD. */
export const FORBIDDEN_JSON_LD_KEYS = [
  "offers",
  "price",
  "priceValidUntil",
  "availability",
  "aggregateRating",
  "review",
  "seller",
  "offeredBy",
  "shippingDetails",
  "hasMerchantReturnPolicy",
  "isRelatedTo",
  "isSimilarTo",
] as const;

const ORGANIZATION_CONTACT_EMAIL = "admin@buckparts.com";
const SITE_LOGO_PATH = "/buckparts-logo-black-transparent.png";

export type JsonLdObject = Record<string, unknown>;

function absoluteUrl(path: string, siteUrl?: string): string {
  const base = (siteUrl ?? getRequiredSiteUrl()).replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function collectKeys(value: unknown, keys: Set<string>): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
}

export function jsonLdContainsForbiddenKeys(data: JsonLdObject | JsonLdObject[]): string[] {
  const keys = new Set<string>();
  collectKeys(data, keys);
  return FORBIDDEN_JSON_LD_KEYS.filter((key) => keys.has(key));
}

export function buildOrganizationJsonLd(siteUrl?: string): JsonLdObject {
  const url = siteUrl ?? getRequiredSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url.replace(/\/$/, "")}/#organization`,
    name: SITE_DISPLAY_NAME,
    url: url.replace(/\/$/, ""),
    logo: absoluteUrl(SITE_LOGO_PATH, url),
    description: SITE_SOCIAL_OG_DESCRIPTION,
    email: ORGANIZATION_CONTACT_EMAIL,
  };
}

export function buildWebSiteJsonLd(siteUrl?: string): JsonLdObject {
  const url = siteUrl ?? getRequiredSiteUrl();
  const base = url.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_DISPLAY_NAME,
    url: base,
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSiteWideJsonLdGraph(siteUrl?: string): JsonLdObject[] {
  return [buildOrganizationJsonLd(siteUrl), buildWebSiteJsonLd(siteUrl)];
}

export type RefrigeratorFilterProductJsonLdInput = {
  slug: string;
  oemPartNumber: string;
  name: string | null;
  brandName: string;
  description: string;
  siteUrl?: string;
};

/**
 * Minimal Product JSON-LD for refrigerator filter PDPs.
 * Omits `image` — `filters` has no repo-proven product image field.
 * Returns null when required proven fields are missing.
 */
export function buildRefrigeratorFilterProductJsonLd(
  input: RefrigeratorFilterProductJsonLdInput,
): JsonLdObject | null {
  const oem = input.oemPartNumber.trim();
  const brandName = input.brandName.trim();
  const description = input.description.trim();
  const slug = input.slug.trim();
  if (!oem || !brandName || !description || !slug) {
    return null;
  }

  const name = input.name?.trim() || oem;
  const pageUrl = absoluteUrl(`/filter/${slug}`, input.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${pageUrl}#product`,
    name,
    description,
    mpn: oem,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    url: pageUrl,
  };
}

export function refrigeratorFilterMetadataDescription(oemPartNumber: string): string {
  return `Part ${oemPartNumber} refrigerator water filter — compatible models and replacement timing.`;
}

export type AirPurifierFilterProductJsonLdInput = {
  slug: string;
  oemPartNumber: string;
  name: string | null;
  brandName: string;
  description: string;
  siteUrl?: string;
};

/**
 * Minimal Product JSON-LD for air purifier filter PDPs.
 * Omits `image` — `air_purifier_filters` has no repo-proven product image field.
 * Returns null when required proven fields are missing.
 */
export function buildAirPurifierFilterProductJsonLd(
  input: AirPurifierFilterProductJsonLdInput,
): JsonLdObject | null {
  const oem = input.oemPartNumber.trim();
  const brandName = input.brandName.trim();
  const description = input.description.trim();
  const slug = input.slug.trim();
  if (!oem || !brandName || !description || !slug) {
    return null;
  }

  const name = input.name?.trim() || oem;
  const pageUrl = absoluteUrl(`/air-purifier/filter/${slug}`, input.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${pageUrl}#product`,
    name,
    description,
    mpn: oem,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    url: pageUrl,
  };
}

export function airPurifierFilterMetadataDescription(oemPartNumber: string): string {
  return `Part ${oemPartNumber} air purifier filter — compatible models and replacement timing.`;
}
