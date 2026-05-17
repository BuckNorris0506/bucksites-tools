/**
 * Read-only non-Amazon retailer PDP candidate source for Batch Production Lane v1.
 * PROVEN: no writes; rows from data/filters.csv, data/retailer_links.csv, and seeded PDP URLs only.
 */

import { buildFridgeNonAmazonCandidates } from "../../../scripts/lib/fridge-non-amazon-candidate-generator";
import {
  isKnownBrokenUrl,
  isSearchPlaceholderBuyLink,
} from "@/lib/retailers/launch-buy-links";
import {
  BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
  type BatchProductionLaneInputRowV1,
} from "./batch-production-lane-v1";
import { parseCsvRowsV1 } from "./batch-production-amazon-rescue-source-v1";

export const BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1 =
  "non-amazon-pdp-candidates" as const;

export const BATCH_NON_AMAZON_PDP_SOURCE_MAX_ROWS_V1 = 5;

export const BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1 = "queue-non-amazon-pdp-agent";

/** Slugs prioritized for v1 (seeded PDP + high-intent filter pages in retailer_links). */
export const BATCH_NON_AMAZON_PDP_V1_PRIORITY_SLUGS_V1 = [
  "da97-08006b",
  "da97-15217d",
  "da29-00012b",
  "adq75795101",
  "rpwfe",
] as const;

type FilterRow = { slug: string; oem_part_number: string; name: string };

type RetailerLinkRow = {
  slug: string;
  retailer_name: string;
  affiliate_url: string;
  retailer_key: string;
};

export type BuildNonAmazonPdpSourceDepsV1 = {
  readTextFile: (absolutePath: string) => string;
  maxRows?: number;
  prioritySlugs?: readonly string[];
};

export type BuildNonAmazonPdpSourceResultV1 = {
  source: typeof BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1;
  read_only: true;
  data_mutation: false;
  rows: BatchProductionLaneInputRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

function loadFilters(csvText: string): Map<string, FilterRow> {
  const parsed = parseCsvRowsV1(csvText);
  const header = parsed[0];
  if (!header) return new Map();
  const slugIdx = header.indexOf("slug");
  const oemIdx = header.indexOf("oem_part_number");
  const nameIdx = header.indexOf("name");
  if (slugIdx < 0 || oemIdx < 0) return new Map();

  const map = new Map<string, FilterRow>();
  for (const row of parsed.slice(1)) {
    const slug = row[slugIdx]?.trim().toLowerCase();
    const oem = row[oemIdx]?.trim();
    if (!slug || !oem) continue;
    map.set(slug, {
      slug,
      oem_part_number: oem,
      name: nameIdx >= 0 ? (row[nameIdx]?.trim() ?? oem) : oem,
    });
  }
  return map;
}

function loadRetailerLinks(csvText: string): Map<string, RetailerLinkRow[]> {
  const parsed = parseCsvRowsV1(csvText);
  const header = parsed[0];
  if (!header) return new Map();
  const slugIdx = header.indexOf("filter_slug");
  const nameIdx = header.indexOf("retailer_name");
  const urlIdx = header.indexOf("affiliate_url");
  const keyIdx = header.indexOf("retailer_key");
  if (slugIdx < 0 || urlIdx < 0) return new Map();

  const map = new Map<string, RetailerLinkRow[]>();
  for (const row of parsed.slice(1)) {
    const slug = row[slugIdx]?.trim().toLowerCase();
    const affiliate_url = row[urlIdx]?.trim();
    if (!slug || !affiliate_url) continue;
    const entry: RetailerLinkRow = {
      slug,
      retailer_name: nameIdx >= 0 ? (row[nameIdx]?.trim() ?? "") : "",
      affiliate_url,
      retailer_key: keyIdx >= 0 ? (row[keyIdx]?.trim().toLowerCase() ?? "") : "",
    };
    const list = map.get(slug) ?? [];
    list.push(entry);
    map.set(slug, list);
  }
  return map;
}

export function isAmazonAffiliateUrlV1(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("amazon.") || host === "amazon.com" || host.endsWith(".amazon.com");
  } catch {
    return false;
  }
}

/** True when URL path resembles a retailer product detail page (not search/SERP). */
export function looksLikeRetailerPdpUrlV1(url: string, retailerKey: string | null): boolean {
  if (!url.trim()) return false;
  if (isAmazonAffiliateUrlV1(url)) return false;
  if (isSearchPlaceholderBuyLink(retailerKey, url)) return false;
  if (isKnownBrokenUrl(url)) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.includes("/partdetail/")) return true;
    if (path.includes("/parts/spec/")) return true;
    if (u.hostname.includes("appliancepartspros.com") && path.endsWith(".html") && path.length > 6) {
      return true;
    }
    if (u.hostname.includes("allfilters.com") && path.includes("/refrigeratorfilters/")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** INFERRED: GE Parts spec PDP shape from launch-buy-links known URL pattern (skip known-broken tokens). */
export function inferGeAppliancePartsSpecUrlV1(oemToken: string): string | null {
  const token = oemToken.trim().toUpperCase();
  if (!token) return null;
  const url = `https://www.geapplianceparts.com/store/parts/spec/${token}`;
  if (isKnownBrokenUrl(url)) return null;
  return url;
}

type ResolvedPdpUrl = {
  url: string;
  retailer_key: string | null;
  retailer_name: string | null;
  provenance: "PROVEN_CSV_PDP" | "PROVEN_SEEDED_PDP" | "INFERRED_GE_SPEC" | "INFERRED_FRIDGE_CANDIDATE";
};

function resolvePdpUrlForSlug(
  slug: string,
  filter: FilterRow,
  links: RetailerLinkRow[],
): ResolvedPdpUrl | null {
  for (const link of links) {
    if (looksLikeRetailerPdpUrlV1(link.affiliate_url, link.retailer_key)) {
      return {
        url: link.affiliate_url,
        retailer_key: link.retailer_key,
        retailer_name: link.retailer_name,
        provenance: "PROVEN_CSV_PDP",
      };
    }
  }

  const seeded = buildFridgeNonAmazonCandidates(slug)[0];
  if (seeded && looksLikeRetailerPdpUrlV1(seeded.url, seeded.retailer_key)) {
    return {
      url: seeded.url,
      retailer_key: seeded.retailer_key,
      retailer_name: seeded.retailer,
      provenance: "PROVEN_SEEDED_PDP",
    };
  }

  const hasGeLink = links.some((l) => l.affiliate_url.includes("geapplianceparts.com"));
  if (hasGeLink) {
    const inferred = inferGeAppliancePartsSpecUrlV1(filter.oem_part_number);
    if (inferred) {
      return {
        url: inferred,
        retailer_key: "oem-parts-catalog",
        retailer_name: "GE Appliance Parts (inferred spec PDP)",
        provenance: "INFERRED_GE_SPEC",
      };
    }
  }

  if (seeded?.url && !isAmazonAffiliateUrlV1(seeded.url) && !isSearchPlaceholderBuyLink(seeded.retailer_key, seeded.url)) {
    return {
      url: seeded.url,
      retailer_key: seeded.retailer_key,
      retailer_name: seeded.retailer,
      provenance: "INFERRED_FRIDGE_CANDIDATE",
    };
  }

  return null;
}

function buildReadOnlyRationaleV1(input: {
  slug: string;
  token: string;
  resolved: ResolvedPdpUrl;
  hadSearchOnlyCsvLink: boolean;
}): string {
  const parts = [
    "PROVEN: source=non-amazon-pdp-candidates (read-only batch lane; not Amazon rescue).",
    `PROVEN: source_queue_row_id=${BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1}.`,
    `PROVEN: filter_slug=${input.slug} from data/filters.csv.`,
    `${input.resolved.provenance}: candidate_url=${input.resolved.url}.`,
    "INFERRED: Agent should browser-inspect this non-Amazon PDP URL and fill lane draft facts JSON; owner reviews only.",
    "UNKNOWN: buyer_path_safety and wrong_purchase_risk until agent observation + founder review.",
  ];
  if (input.hadSearchOnlyCsvLink) {
    parts.push(
      "PROVEN: data/retailer_links.csv row for this slug is OEM catalog search (excluded as PDP); using seeded/inferred PDP URL instead.",
    );
  }
  if (input.resolved.provenance === "INFERRED_FRIDGE_CANDIDATE") {
    parts.push(
      "UNKNOWN: URL from fridge-non-amazon-candidate-generator unverified_url_guess — agent must verify page loads as PDP.",
    );
  }
  return parts.join(" ");
}

export function buildBatchProductionRowsFromNonAmazonPdpCandidatesV1(
  repoRoot: string,
  deps: BuildNonAmazonPdpSourceDepsV1,
): BuildNonAmazonPdpSourceResultV1 {
  const maxRows = Math.min(
    deps.maxRows ?? BATCH_NON_AMAZON_PDP_SOURCE_MAX_ROWS_V1,
    BATCH_PRODUCTION_V1_BATCH_SIZE_CAP,
  );
  const prioritySlugs = deps.prioritySlugs ?? BATCH_NON_AMAZON_PDP_V1_PRIORITY_SLUGS_V1;

  const filters = loadFilters(deps.readTextFile(`${repoRoot}/data/filters.csv`));
  const linksBySlug = loadRetailerLinks(deps.readTextFile(`${repoRoot}/data/retailer_links.csv`));

  const rows: BatchProductionLaneInputRowV1[] = [];

  for (const slug of prioritySlugs) {
    if (rows.length >= maxRows) break;
    const filter = filters.get(slug);
    if (!filter) continue;
    const links = linksBySlug.get(slug) ?? [];
    if (links.length === 0) continue;

    const hadSearchOnlyCsvLink = links.every((l) =>
      isSearchPlaceholderBuyLink(l.retailer_key, l.affiliate_url),
    );
    const resolved = resolvePdpUrlForSlug(slug, filter, links);
    if (!resolved) continue;

    rows.push({
      row_id: slug,
      token: filter.oem_part_number,
      slug,
      url: resolved.url,
      source_queue_row_id: BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1,
      title: filter.name,
      candidate_kind: "product",
      buyer_path_safety: "unknown",
      wrong_purchase_risk: "unknown",
      read_only_rationale: buildReadOnlyRationaleV1({
        slug,
        token: filter.oem_part_number,
        resolved,
        hadSearchOnlyCsvLink,
      }),
    });
  }

  return {
    source: BATCH_PRODUCTION_SOURCE_NON_AMAZON_PDP_CANDIDATES_V1,
    read_only: true,
    data_mutation: false,
    rows,
    proven_facts: [
      "PROVEN: Rows built read-only from data/filters.csv, data/retailer_links.csv, and scripts/lib/fridge-non-amazon-candidate-generator.ts seeded PDP URLs.",
      `PROVEN: Cohort cap=${rows.length} (maxRows=${maxRows}).`,
      "PROVEN: Excludes Amazon hosts and search-placeholder URLs from retailer_links.csv as PDP targets.",
    ],
    unknown_facts: [
      "UNKNOWN: Live PDP buyability/OEM-vs-aftermarket until agent browser capture + founder review.",
      "INFERRED: Some URLs are spec-path or seeded PDP guesses — agent must confirm page_kind=product_detail_page.",
    ],
  };
}
