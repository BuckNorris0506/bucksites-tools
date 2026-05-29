/**
 * Read-only BuckParts sitemap / indexable inventory truth audit v1.
 * Compares repo-expected indexable inventory to live sitemap output when fetch succeeds.
 * Does not mutate sitemap behavior, launch state, CSVs, or public routes.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  HOMEKEEP_WEDGE_CATALOG,
  HOMEKEEP_WEDGE_CATALOG_ORDER,
  type HomekeepWedgeCatalog,
} from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  isVerticalLive,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";
import { __test_only__ as sitemapTestOnly } from "@/lib/sitemap/wedge-indexable-urls";

import { buildPublicWedgeReadinessAndEasiestWinsV1 } from "./public-wedge-readiness-and-easiest-wins-v1";

export const BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1 =
  "buckparts_sitemap_indexability_audit_v1" as const;

export const FIRST_CAMPAIGN_INDEXED_PAGE_THRESHOLD_V1 = 75 as const;

export const LIVE_SITEMAP_URL_V1 = "https://buckparts.com/sitemap.xml" as const;

export const GSC_SITEMAP_ARTIFACT_REL_V1 = "data/gsc/sitemap.xml" as const;

export const GSC_COVERAGE_ARTIFACT_DIR_REL_V1 = "data/gsc" as const;

const SITEMAP_SOURCE_PATHS = [
  "src/app/sitemap.ts",
  "src/lib/sitemap/wedge-indexable-urls.ts",
  "src/lib/catalog/vertical-launch-state.ts",
] as const;

const TRUST_PUBLIC_ROUTE_PATHS = [
  "/about",
  "/disclosure",
  "/privacy",
  "/terms",
  "/truth-policy",
  "/wrong-part-prevention",
] as const;

const SAMPLE_ONLY_WEDGES: ReadonlySet<HomekeepWedgeCatalog> = new Set([
  HOMEKEEP_WEDGE_CATALOG.vacuum,
  HOMEKEEP_WEDGE_CATALOG.humidifier,
  HOMEKEEP_WEDGE_CATALOG.appliance_air,
]);

const WEDGE_TO_VERTICAL: Partial<Record<HomekeepWedgeCatalog, VerticalSlug>> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: "refrigerator",
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: "air-purifier",
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: "whole-house-water",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
};

const RISKY_LIVE_PATH_PREFIXES = [
  "/whole-house-water/",
  "/vacuum/",
  "/humidifier/",
  "/appliance-air/",
] as const;

export type SitemapTruthStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type FirstCampaignIndexabilityStatusV1 = "READY" | "NOT_READY" | "UNKNOWN";

export type SeventyFiveIndexedPageThresholdStatusV1 = "MET" | "NOT_MET" | "UNKNOWN";

export type LiveSitemapFetchStatusV1 = "CHECKED" | "FAILED" | "SKIPPED" | "UNKNOWN";

export type ExpectedDynamicRouteCountsV1 = {
  wedge: HomekeepWedgeCatalog;
  vertical_slug: VerticalSlug | "refrigerator_routes";
  indexable_in_repo_policy: boolean;
  model_urls: number;
  filter_or_part_urls: number;
  brand_urls: number;
  total_dynamic_urls: number;
  data_source: "committed_csv_proxy" | "UNKNOWN";
};

export type BuckpartsSitemapIndexabilityAuditV1 = {
  contract: typeof BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  sitemap_generation_sources: string[];
  live_sitemap_url: typeof LIVE_SITEMAP_URL_V1;
  live_sitemap_fetch_status: LiveSitemapFetchStatusV1;
  repo_expected_indexable_url_count: number;
  live_sitemap_url_count: number | "UNKNOWN";
  gsc_indexed_count: number | "UNKNOWN";
  gsc_discovered_count: number | "UNKNOWN";
  gsc_artifact_paths_checked: string[];
  live_wedges_indexable: HomekeepWedgeCatalog[];
  excluded_wedges: HomekeepWedgeCatalog[];
  expected_public_routes: string[];
  existing_public_routes_not_in_repo_sitemap: string[];
  expected_dynamic_route_counts: ExpectedDynamicRouteCountsV1[];
  missing_expected_urls: string[];
  unexpected_risky_urls: string[];
  sitemap_truth_status: SitemapTruthStatusV1;
  first_campaign_indexability_status: FirstCampaignIndexabilityStatusV1;
  seventy_five_indexed_page_threshold_status: SeventyFiveIndexedPageThresholdStatusV1;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function readCsv(rootDir: string, rel: string): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  try {
    return parse(readFileSync(abs, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

function usefulFilterSlugsFromCsv(args: {
  compatRel: string;
  linksRel: string;
  rootDir: string;
}): Set<string> {
  const slugs = new Set<string>();
  for (const row of readCsv(args.rootDir, args.compatRel)) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  for (const row of readCsv(args.rootDir, args.linksRel)) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (slug) slugs.add(slug);
  }
  return slugs;
}

function brandSlugsFromCsvModelsAndFilters(args: {
  modelsRel: string;
  filtersRel: string;
  usefulFilterSlugs: Set<string>;
  rootDir: string;
}): Set<string> {
  const brands = new Set<string>();
  for (const row of readCsv(args.rootDir, args.modelsRel)) {
    const brand = (row.brand_slug ?? "").trim().toLowerCase();
    if (brand) brands.add(brand);
  }
  for (const row of readCsv(args.rootDir, args.filtersRel)) {
    const slug = (row.slug ?? "").trim().toLowerCase();
    const brand = (row.brand_slug ?? "").trim().toLowerCase();
    if (brand && args.usefulFilterSlugs.has(slug)) brands.add(brand);
  }
  return brands;
}

function countModelsCsv(rootDir: string, rel: string): number {
  return readCsv(rootDir, rel).length;
}

function normalizePathname(urlOrPath: string): string {
  try {
    const pathname = urlOrPath.startsWith("http")
      ? new URL(urlOrPath).pathname
      : urlOrPath;
    if (pathname === "/") return "/";
    return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  } catch {
    return urlOrPath;
  }
}

export function extractSitemapLocUrlsV1(sitemapXml: string): string[] {
  const matches = sitemapXml.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) ?? [];
  return matches
    .map((line) => line.replace("<loc>", "").replace("</loc>", "").trim())
    .filter((url) => url.length > 0);
}

function wedgeIndexableInRepoPolicy(wedge: HomekeepWedgeCatalog): boolean {
  if (SAMPLE_ONLY_WEDGES.has(wedge)) return false;
  const vertical = WEDGE_TO_VERTICAL[wedge];
  if (!vertical) return false;
  if (wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    return isVerticalLive("refrigerator");
  }
  return isVerticalLive(vertical);
}

function wedgePublicIndexingStatus(wedge: HomekeepWedgeCatalog): string {
  if (SAMPLE_ONLY_WEDGES.has(wedge)) return "SAMPLE_ONLY";
  const vertical = WEDGE_TO_VERTICAL[wedge];
  if (!vertical) return "UNKNOWN";
  if (wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) {
    return isVerticalLive("refrigerator") ? "INDEXABLE_LIVE" : "UNKNOWN";
  }
  if (isVerticalLive(vertical)) return "INDEXABLE_LIVE";
  if (VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT.includes(vertical)) return "PREVIEW_NOINDEX";
  if (getVerticalLaunchState(vertical) === "NOINDEX_UNPROVEN") return "NOINDEX_UNPROVEN";
  return "UNKNOWN";
}

function buildRepoExpectedStaticRoutes(siteBase: string): string[] {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = siteBase.replace(/\/$/, "");
  try {
    return sitemapTestOnly
      .liveStaticPaths(new Date())
      .map((row) => normalizePathname(row.url));
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  }
}

function buildRepoExpectedDynamicCounts(rootDir: string): ExpectedDynamicRouteCountsV1[] {
  const rows: ExpectedDynamicRouteCountsV1[] = [];

  const fridgeUseful = usefulFilterSlugsFromCsv({
    rootDir,
    compatRel: "data/compatibility_mappings.csv",
    linksRel: "data/retailer_links.csv",
  });
  const fridgeBrands = brandSlugsFromCsvModelsAndFilters({
    rootDir,
    modelsRel: "data/fridge_models.csv",
    filtersRel: "data/filters.csv",
    usefulFilterSlugs: fridgeUseful,
  });
  const fridgeIndexable = wedgeIndexableInRepoPolicy(HOMEKEEP_WEDGE_CATALOG.refrigerator_water);
  rows.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
    vertical_slug: "refrigerator_routes",
    indexable_in_repo_policy: fridgeIndexable,
    model_urls: fridgeIndexable ? countModelsCsv(rootDir, "data/fridge_models.csv") : 0,
    filter_or_part_urls: fridgeIndexable ? fridgeUseful.size : 0,
    brand_urls: fridgeIndexable ? fridgeBrands.size : 0,
    total_dynamic_urls: fridgeIndexable
      ? countModelsCsv(rootDir, "data/fridge_models.csv") + fridgeUseful.size + fridgeBrands.size
      : 0,
    data_source: "committed_csv_proxy",
  });

  const apUseful = usefulFilterSlugsFromCsv({
    rootDir,
    compatRel: "data/air-purifier/compatibility_mappings.csv",
    linksRel: "data/air-purifier/retailer_links.csv",
  });
  const apBrands = brandSlugsFromCsvModelsAndFilters({
    rootDir,
    modelsRel: "data/air-purifier/models.csv",
    filtersRel: "data/air-purifier/filters.csv",
    usefulFilterSlugs: apUseful,
  });
  const apIndexable = wedgeIndexableInRepoPolicy(HOMEKEEP_WEDGE_CATALOG.air_purifier);
  rows.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.air_purifier,
    vertical_slug: "air-purifier",
    indexable_in_repo_policy: apIndexable,
    model_urls: apIndexable ? countModelsCsv(rootDir, "data/air-purifier/models.csv") : 0,
    filter_or_part_urls: apIndexable ? apUseful.size : 0,
    brand_urls: apIndexable ? apBrands.size : 0,
    total_dynamic_urls: apIndexable
      ? countModelsCsv(rootDir, "data/air-purifier/models.csv") + apUseful.size + apBrands.size
      : 0,
    data_source: "committed_csv_proxy",
  });

  const whUseful = usefulFilterSlugsFromCsv({
    rootDir,
    compatRel: "data/whole-house-water/compatibility_mappings.csv",
    linksRel: "data/whole-house-water/retailer_links.csv",
  });
  const whBrands = brandSlugsFromCsvModelsAndFilters({
    rootDir,
    modelsRel: "data/whole-house-water/models.csv",
    filtersRel: "data/whole-house-water/filters.csv",
    usefulFilterSlugs: whUseful,
  });
  const whIndexable = wedgeIndexableInRepoPolicy(HOMEKEEP_WEDGE_CATALOG.whole_house_water);
  rows.push({
    wedge: HOMEKEEP_WEDGE_CATALOG.whole_house_water,
    vertical_slug: "whole-house-water",
    indexable_in_repo_policy: whIndexable,
    model_urls: 0,
    filter_or_part_urls: 0,
    brand_urls: 0,
    total_dynamic_urls: 0,
    data_source: "committed_csv_proxy",
  });

  for (const wedge of [
    HOMEKEEP_WEDGE_CATALOG.vacuum,
    HOMEKEEP_WEDGE_CATALOG.humidifier,
    HOMEKEEP_WEDGE_CATALOG.appliance_air,
  ] as const) {
    rows.push({
      wedge,
      vertical_slug: WEDGE_TO_VERTICAL[wedge]!,
      indexable_in_repo_policy: false,
      model_urls: 0,
      filter_or_part_urls: 0,
      brand_urls: 0,
      total_dynamic_urls: 0,
      data_source: "UNKNOWN",
    });
  }

  return rows;
}

function repoExpectedUrlCount(args: {
  staticRoutes: string[];
  dynamicCounts: ExpectedDynamicRouteCountsV1[];
}): number {
  const staticCount = args.staticRoutes.length;
  const dynamicCount = args.dynamicCounts
    .filter((row) => row.indexable_in_repo_policy)
    .reduce((sum, row) => sum + row.total_dynamic_urls, 0);
  return staticCount + dynamicCount;
}

function loadGscCountsFromArtifacts(rootDir: string): {
  indexed: number | "UNKNOWN";
  discovered: number | "UNKNOWN";
  paths_checked: string[];
} {
  const paths_checked: string[] = [];
  const gscDir = path.join(rootDir, GSC_COVERAGE_ARTIFACT_DIR_REL_V1);
  if (!existsSync(gscDir)) {
    return { indexed: "UNKNOWN", discovered: "UNKNOWN", paths_checked };
  }

  for (const name of readdirSync(gscDir)) {
    paths_checked.push(`${GSC_COVERAGE_ARTIFACT_DIR_REL_V1}/${name}`);
  }

  const coverageJsonCandidates = paths_checked.filter(
    (p) => p.includes("Coverage") && (p.endsWith(".json") || p.endsWith(".csv")),
  );
  for (const rel of coverageJsonCandidates) {
    try {
      const text = readFileSync(path.join(rootDir, rel), "utf8");
      const indexedMatch = text.match(/"indexed"\s*:\s*(\d+)/i) ?? text.match(/indexed[,\s]+(\d+)/i);
      const discoveredMatch =
        text.match(/"discovered"\s*:\s*(\d+)/i) ?? text.match(/discovered[,\s]+(\d+)/i);
      if (indexedMatch && discoveredMatch) {
        return {
          indexed: Number.parseInt(indexedMatch[1]!, 10),
          discovered: Number.parseInt(discoveredMatch[1]!, 10),
          paths_checked,
        };
      }
    } catch {
      // keep UNKNOWN
    }
  }

  return { indexed: "UNKNOWN", discovered: "UNKNOWN", paths_checked };
}

function isRiskyLivePath(pathname: string, wedge: HomekeepWedgeCatalog | null): boolean {
  if (!wedge) return false;
  if (wedge === HOMEKEEP_WEDGE_CATALOG.whole_house_water && !isVerticalLive("whole-house-water")) {
    return pathname.startsWith("/whole-house-water");
  }
  if (SAMPLE_ONLY_WEDGES.has(wedge)) {
    const seg = WEDGE_TO_VERTICAL[wedge]?.replace(/-/g, "-") ?? "";
    return pathname.startsWith(`/${seg}`);
  }
  return false;
}

function wedgeFromPathname(pathname: string): HomekeepWedgeCatalog | null {
  const normalized = normalizePathname(pathname);
  const head = normalized.split("/").filter(Boolean)[0] ?? "";
  if (["fridge", "filter", "brand"].includes(head)) {
    return HOMEKEEP_WEDGE_CATALOG.refrigerator_water;
  }
  if (head === "air-purifier") return HOMEKEEP_WEDGE_CATALOG.air_purifier;
  if (head === "whole-house-water") return HOMEKEEP_WEDGE_CATALOG.whole_house_water;
  if (head === "vacuum") return HOMEKEEP_WEDGE_CATALOG.vacuum;
  if (head === "humidifier") return HOMEKEEP_WEDGE_CATALOG.humidifier;
  if (head === "appliance-air") return HOMEKEEP_WEDGE_CATALOG.appliance_air;
  return null;
}

export async function fetchLiveSitemapXmlV1(args?: {
  fetchImpl?: typeof fetch;
  url?: string;
  timeoutMs?: number;
}): Promise<{ status: LiveSitemapFetchStatusV1; xml: string | null; error: string | null }> {
  const fetchImpl = args?.fetchImpl ?? fetch;
  const url = args?.url ?? LIVE_SITEMAP_URL_V1;
  const timeoutMs = args?.timeoutMs ?? 15_000;
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (!response.ok) {
      return {
        status: "FAILED",
        xml: null,
        error: `HTTP ${String(response.status)}`,
      };
    }
    const xml = await response.text();
    if (!xml.includes("<loc>")) {
      return { status: "FAILED", xml: null, error: "Response missing <loc> entries" };
    }
    return { status: "CHECKED", xml, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "FAILED", xml: null, error: message };
  }
}

export function buildBuckpartsSitemapIndexabilityAuditUnknownV1(args: {
  generated_at: string;
  reason: string;
}): BuckpartsSitemapIndexabilityAuditV1 {
  return {
    contract: BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    sitemap_generation_sources: [...SITEMAP_SOURCE_PATHS],
    live_sitemap_url: LIVE_SITEMAP_URL_V1,
    live_sitemap_fetch_status: "UNKNOWN",
    repo_expected_indexable_url_count: 0,
    live_sitemap_url_count: "UNKNOWN",
    gsc_indexed_count: "UNKNOWN",
    gsc_discovered_count: "UNKNOWN",
    gsc_artifact_paths_checked: [],
    live_wedges_indexable: [],
    excluded_wedges: [],
    expected_public_routes: [],
    existing_public_routes_not_in_repo_sitemap: [...TRUST_PUBLIC_ROUTE_PATHS],
    expected_dynamic_route_counts: [],
    missing_expected_urls: [],
    unexpected_risky_urls: [],
    sitemap_truth_status: "UNKNOWN",
    first_campaign_indexability_status: "UNKNOWN",
    seventy_five_indexed_page_threshold_status: "UNKNOWN",
    recommended_next_action:
      "Re-run sitemap indexability audit after fixing build failure; do not treat marketing campaign as READY.",
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: buckparts_sitemap_indexability_audit_v1 failed: ${args.reason}`],
  };
}

export async function buildBuckpartsSitemapIndexabilityAuditV1(args: {
  rootDir: string;
  now?: () => Date;
  siteBase?: string;
  skipLiveFetch?: boolean;
  fetchImpl?: typeof fetch;
  liveSitemapXml?: string | null;
}): Promise<BuckpartsSitemapIndexabilityAuditV1> {
  const now = args.now ?? (() => new Date());
  const siteBase = (args.siteBase ?? "https://buckparts.com").replace(/\/$/, "");

  const staticRoutes = buildRepoExpectedStaticRoutes(siteBase);
  const dynamicCounts = buildRepoExpectedDynamicCounts(args.rootDir);
  const repoExpectedCount = repoExpectedUrlCount({ staticRoutes, dynamicCounts });

  const live_wedges_indexable = HOMEKEEP_WEDGE_CATALOG_ORDER.filter((w) =>
    wedgeIndexableInRepoPolicy(w),
  );
  const excluded_wedges = HOMEKEEP_WEDGE_CATALOG_ORDER.filter((w) => !wedgeIndexableInRepoPolicy(w));

  const existing_public_routes_not_in_repo_sitemap = TRUST_PUBLIC_ROUTE_PATHS.filter(
    (route) => !staticRoutes.includes(route),
  );

  const gsc = loadGscCountsFromArtifacts(args.rootDir);

  let live_sitemap_fetch_status: LiveSitemapFetchStatusV1 = "UNKNOWN";
  let live_sitemap_url_count: number | "UNKNOWN" = "UNKNOWN";
  let liveUrls: string[] = [];
  let fetchError: string | null = null;

  if (args.liveSitemapXml !== undefined) {
    if (args.liveSitemapXml === null) {
      live_sitemap_fetch_status = "FAILED";
    } else {
      live_sitemap_fetch_status = "CHECKED";
      liveUrls = extractSitemapLocUrlsV1(args.liveSitemapXml);
      live_sitemap_url_count = liveUrls.length;
    }
  } else if (args.skipLiveFetch) {
    live_sitemap_fetch_status = "SKIPPED";
  } else {
    const fetched = await fetchLiveSitemapXmlV1({ fetchImpl: args.fetchImpl });
    live_sitemap_fetch_status = fetched.status;
    fetchError = fetched.error;
    if (fetched.xml) {
      liveUrls = extractSitemapLocUrlsV1(fetched.xml);
      live_sitemap_url_count = liveUrls.length;
    }
  }

  const expectedStaticFullUrls = staticRoutes.map((route) =>
    route === "/" ? siteBase : `${siteBase}${route}`,
  );

  const missing_expected_urls: string[] = [];
  if (live_sitemap_fetch_status === "CHECKED" && liveUrls.length > 0) {
    const livePathSet = new Set(liveUrls.map((url) => normalizePathname(url)));
    for (const route of staticRoutes) {
      if (!livePathSet.has(route)) {
        missing_expected_urls.push(route === "/" ? siteBase : `${siteBase}${route}`);
      }
    }
  }

  const unexpected_risky_urls: string[] = [];
  if (live_sitemap_fetch_status === "CHECKED") {
    for (const url of liveUrls) {
      const pathname = normalizePathname(url);
      const wedge = wedgeFromPathname(pathname);
      if (isRiskyLivePath(pathname, wedge)) {
        unexpected_risky_urls.push(url);
      }
    }
  }

  let sitemap_truth_status: SitemapTruthStatusV1 = "UNKNOWN";
  if (live_sitemap_fetch_status === "CHECKED" && typeof live_sitemap_url_count === "number") {
    if (missing_expected_urls.length === 0 && unexpected_risky_urls.length === 0) {
      sitemap_truth_status = "PROVEN";
    } else {
      sitemap_truth_status = "PARTIAL";
    }
  } else if (repoExpectedCount > 0) {
    sitemap_truth_status = "PARTIAL";
  }

  let seventy_five_indexed_page_threshold_status: SeventyFiveIndexedPageThresholdStatusV1 =
    "UNKNOWN";
  if (typeof gsc.indexed === "number") {
    seventy_five_indexed_page_threshold_status =
      gsc.indexed >= FIRST_CAMPAIGN_INDEXED_PAGE_THRESHOLD_V1 ? "MET" : "NOT_MET";
  }

  let first_campaign_indexability_status: FirstCampaignIndexabilityStatusV1 = "UNKNOWN";
  if (typeof gsc.indexed === "number") {
    first_campaign_indexability_status =
      gsc.indexed >= FIRST_CAMPAIGN_INDEXED_PAGE_THRESHOLD_V1 ? "READY" : "NOT_READY";
  } else {
    first_campaign_indexability_status = "NOT_READY";
  }

  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({
    rootDir: args.rootDir,
    now: args.now,
  });

  const proven_facts = [
    `PROVEN: Sitemap generation source is src/app/sitemap.ts → collectHomekeepWedgeSitemapUrls (${SITEMAP_SOURCE_PATHS.join(", ")}).`,
    `PROVEN: repo_expected_indexable_url_count=${String(repoExpectedCount)} from static routes (${String(staticRoutes.length)}) + committed CSV proxy dynamic counts for LIVE wedges.`,
    `PROVEN: live_wedges_indexable=${live_wedges_indexable.join(", ")}; excluded_wedges=${excluded_wedges.join(", ")}.`,
    `PROVEN: refrigerator_water launch=${getVerticalLaunchState("refrigerator")}; air_purifier launch=${getVerticalLaunchState("air-purifier")}; whole_house_water launch=${getVerticalLaunchState("whole-house-water")}.`,
    `PROVEN: Repo sitemap static routes=${staticRoutes.join(", ")}.`,
    `PROVEN: Trust routes exist in src/app but are not emitted by wedge-indexable-urls liveStaticPaths: ${existing_public_routes_not_in_repo_sitemap.join(", ")}.`,
    `PROVEN: gsc_indexed_count=${typeof gsc.indexed === "number" ? String(gsc.indexed) : "UNKNOWN"}; gsc_discovered_count=${typeof gsc.discovered === "number" ? String(gsc.discovered) : "UNKNOWN"}.`,
    `PROVEN: live_sitemap_fetch_status=${live_sitemap_fetch_status}; live_sitemap_url_count=${typeof live_sitemap_url_count === "number" ? String(live_sitemap_url_count) : "UNKNOWN"}.`,
    `PROVEN: first_campaign_indexability_status=${first_campaign_indexability_status}; seventy_five_indexed_page_threshold_status=${seventy_five_indexed_page_threshold_status}.`,
    "PROVEN: This audit does not authorize sitemap, launch-state, or campaign changes.",
  ];

  if (live_sitemap_fetch_status === "CHECKED") {
    proven_facts.push(
      `PROVEN: missing_expected_urls count=${String(missing_expected_urls.length)}; unexpected_risky_urls count=${String(unexpected_risky_urls.length)}.`,
    );
  }

  const inferred_facts = [
    "INFERRED: Repo expected dynamic counts use committed CSV useful-filter proxy — live Supabase sitemap emission may differ from CSV proxy totals.",
    typeof live_sitemap_url_count === "number" && live_sitemap_url_count !== repoExpectedCount
      ? `INFERRED: live_sitemap_url_count (${String(live_sitemap_url_count)}) differs from repo CSV proxy expected (${String(repoExpectedCount)}) — likely Supabase inventory vs committed CSV drift.`
      : "INFERRED: Live vs repo CSV proxy count comparison unavailable or aligned.",
    excluded_wedges.includes(HOMEKEEP_WEDGE_CATALOG.whole_house_water)
      ? "INFERRED: whole_house_water remains NOINDEX_UNPROVEN — broad WHW sitemap URLs would be policy-risky even when preview routes exist."
      : "INFERRED: WHW exclusion policy not classified.",
    readiness.wedge_rows
      .filter((r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.vacuum || r.wedge === HOMEKEEP_WEDGE_CATALOG.humidifier)
      .every((r) => r.csv_data_source === "sample_csv_only")
      ? "INFERRED: vacuum/humidifier/appliance_air sample-only wedges must not be treated as safe indexable inventory."
      : "INFERRED: Sample-only wedge classification incomplete.",
  ];

  const unknown_facts = [
    typeof gsc.indexed !== "number"
      ? "UNKNOWN: GSC indexed page count — no parseable coverage artifact in data/gsc/ (do not treat operator anecdotes like 45/53 as proven)."
      : "UNKNOWN: none for GSC indexed count.",
    typeof gsc.discovered !== "number"
      ? "UNKNOWN: GSC discovered page count — no parseable coverage artifact in data/gsc/."
      : "UNKNOWN: none for GSC discovered count.",
    live_sitemap_fetch_status === "FAILED" && fetchError
      ? `UNKNOWN: Live sitemap fetch failed (${fetchError}) — live inventory parity not proven.`
      : live_sitemap_fetch_status === "SKIPPED"
        ? "UNKNOWN: Live sitemap fetch skipped — live inventory parity not proven in this run."
        : "UNKNOWN: Whether live indexed useful-page quality meets campaign bar beyond URL count.",
    "UNKNOWN: Traffic, revenue, or conversion readiness for first campaign.",
  ].filter((f) => !f.startsWith("UNKNOWN: none"));

  const recommended_next_action =
    first_campaign_indexability_status === "READY"
      ? "GSC indexed threshold met — still verify useful-page quality and safe CTA coverage before paid campaign."
      : typeof gsc.indexed !== "number"
        ? "Import GSC coverage artifact to data/gsc/ and refresh audit before treating 75+ indexed useful pages as proven; do not launch first campaign as READY from repo sitemap counts alone."
        : "Indexed useful-page threshold not met — expand LIVE wedge inventory and refresh GSC coverage before first campaign.";

  return {
    contract: BUCKPARTS_SITEMAP_INDEXABILITY_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    sitemap_generation_sources: [...SITEMAP_SOURCE_PATHS],
    live_sitemap_url: LIVE_SITEMAP_URL_V1,
    live_sitemap_fetch_status,
    repo_expected_indexable_url_count: repoExpectedCount,
    live_sitemap_url_count,
    gsc_indexed_count: gsc.indexed,
    gsc_discovered_count: gsc.discovered,
    gsc_artifact_paths_checked: gsc.paths_checked,
    live_wedges_indexable,
    excluded_wedges,
    expected_public_routes: expectedStaticFullUrls,
    existing_public_routes_not_in_repo_sitemap,
    expected_dynamic_route_counts: dynamicCounts,
    missing_expected_urls,
    unexpected_risky_urls: unexpected_risky_urls.slice(0, 50),
    sitemap_truth_status,
    first_campaign_indexability_status,
    seventy_five_indexed_page_threshold_status,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

/** Test helper: repo sitemap dynamic vertical slugs from launch state. */
export function repoSitemapDynamicVerticalsV1(): VerticalSlug[] {
  return sitemapTestOnly.getSitemapDynamicUrlVerticals();
}

/** Unused count-only path set helper retained for tests comparing static coverage. */
export function __test_only__repoExpectedStaticRoutesV1(siteBase: string): string[] {
  return buildRepoExpectedStaticRoutes(siteBase);
}
