/**
 * Read-only: join GSC external demand to wedge launch state and repo buyer-path coverage signals.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { HOMEKEEP_WEDGE_CATALOG, type HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import {
  getVerticalLaunchState,
  VERTICAL_LAUNCH_STATES,
  VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT,
  type VerticalLaunchState,
  type VerticalSlug,
} from "@/lib/catalog/vertical-launch-state";
import {
  parseGscSearchAnalyticsArtifact,
  type GscArtifactTopEntry,
  type GscSearchAnalyticsArtifact,
} from "@/lib/owner-dashboard/gsc-api-artifact";
import { readGscArtifactFromSupabase } from "@/lib/owner-dashboard/gsc-durable-artifact-store";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  isApDemandSelectedOpenBatchRegistryProvenOpenV1,
  loadApDemandSelectedBatchRunRegistryV1,
  type ApDemandSelectedBatchRunRegistryVisibilityV1,
} from "./ap-demand-selected-batch-run-registry-v1";

export const DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1 = "demand_to_coverage_next_lane_v1" as const;
export const DEMAND_TO_COVERAGE_NEXT_LANE_CONTRACT_V1 = "demand_to_coverage_next_lane_v1" as const;

export type DemandToCoverageSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";
export type DemandToCoverageRecommendationStatusV1 =
  | "RECOMMEND_REOPEN"
  | "CONTINUE_CURRENT_BATCH"
  | "START_NEW_DEMAND_SELECTED_BATCH"
  | "UNKNOWN";

export type DemandToCoverageNextLaneWedgeRowV1 = {
  wedge: HomekeepWedgeCatalog;
  vertical_slug: VerticalSlug | "refrigerator_routes";
  impressions: number | "UNKNOWN";
  clicks: number | "UNKNOWN";
  top_pages: string[];
  launch_state: VerticalLaunchState | "UNKNOWN";
  sitemap_url_count: number | "UNKNOWN";
  live_filter_count: number | "UNKNOWN";
  retailer_link_count: number | "UNKNOWN";
  blocked_link_count: number | "UNKNOWN";
  safe_cta_count: number | "UNKNOWN";
  coverage_gap_summary: string;
  recommended_action: string;
  priority_score: number | "UNKNOWN";
};

export type DemandToCoverageNextLaneReportV1 = {
  contract: typeof DEMAND_TO_COVERAGE_NEXT_LANE_CONTRACT_V1;
  report_name: typeof DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: DemandToCoverageSourceStatusV1;
  source_status: DemandToCoverageSourceStatusV1;
  recommended_wedge: HomekeepWedgeCatalog | "UNKNOWN";
  recommendation_status: DemandToCoverageRecommendationStatusV1;
  recommended_next_action: string;
  next_lane: string | null;
  next_wedge: HomekeepWedgeCatalog | "UNKNOWN";
  next_batch_candidate: string | null;
  blockers: string[];
  proof_sources: string[];
  wedge_rows: DemandToCoverageNextLaneWedgeRowV1[];
  top_pages: GscArtifactTopEntry[];
  top_queries: GscArtifactTopEntry[];
  coverage_gap: {
    highest_demand_wedge: HomekeepWedgeCatalog | "UNKNOWN";
    highest_blocked_wedge: HomekeepWedgeCatalog | "UNKNOWN";
    active_batch_wedge: HomekeepWedgeCatalog;
    gap_rationale: string;
  };
  next_action: string;
  notes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const FRIDGE_WEDGE_ROOT_SEGMENTS = new Set(["fridge", "filter", "brand"]);
const SITEMAP_ARTIFACT_RELATIVE_PATH = "data/gsc/sitemap.xml";
const LOCAL_GSC_ARTIFACT_RELATIVE_PATH = "data/reports/buckparts-gsc-search-analytics.json";

const WEDGE_ORDER: HomekeepWedgeCatalog[] = [
  HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
  HOMEKEEP_WEDGE_CATALOG.air_purifier,
  HOMEKEEP_WEDGE_CATALOG.whole_house_water,
  HOMEKEEP_WEDGE_CATALOG.vacuum,
  HOMEKEEP_WEDGE_CATALOG.humidifier,
  HOMEKEEP_WEDGE_CATALOG.appliance_air,
];

const VERTICAL_BY_WEDGE: Record<HomekeepWedgeCatalog, VerticalSlug | "refrigerator_routes"> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: "refrigerator_routes",
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: "air-purifier",
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: "whole-house-water",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
};

const WEDGE_REPO_PATHS: Record<
  HomekeepWedgeCatalog,
  { filters: string | null; retailer_links: string | null }
> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    filters: "data/filters.csv",
    retailer_links: "data/retailer_links.csv",
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    filters: "data/air-purifier/filters.csv",
    retailer_links: "data/air-purifier/retailer_links.csv",
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    filters: "data/whole-house-water/filters.csv",
    retailer_links: "data/whole-house-water/retailer_links.csv",
  },
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: {
    filters: null,
    retailer_links: null,
  },
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: {
    filters: null,
    retailer_links: null,
  },
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: {
    filters: null,
    retailer_links: null,
  },
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

export type GscArtifactLoadResultV1 =
  | { ok: true; artifact: GscSearchAnalyticsArtifact; source: string }
  | { ok: false; reason: string };

export type BuildDemandToCoverageNextLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  loadGscArtifact?: () => Promise<GscArtifactLoadResultV1>;
  loadSitemapText?: () => string | null;
  loadApDemandSelectedRunRegistry?: (deps: {
    rootDir: string;
    fileExists: (absolutePath: string) => boolean;
    readText: (absolutePath: string) => string;
  }) => ApDemandSelectedBatchRunRegistryVisibilityV1;
};

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function extractSitemapUrls(sitemapText: string): string[] {
  const matches = sitemapText.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) ?? [];
  return matches
    .map((line) => line.replace("<loc>", "").replace("</loc>", "").trim())
    .filter((url) => url.length > 0);
}

export function wedgeFromPageUrl(url: string): HomekeepWedgeCatalog | null {
  let pathname: string;
  try {
    pathname = new URL(url.trim()).pathname || "/";
  } catch {
    return null;
  }
  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const head = normalized.split("/").filter(Boolean)[0];
  if (!head) return null;
  if (FRIDGE_WEDGE_ROOT_SEGMENTS.has(head)) {
    return HOMEKEEP_WEDGE_CATALOG.refrigerator_water;
  }
  if ((VERTICAL_SLUGS_WITH_APP_SEGMENT_LAYOUT as readonly string[]).includes(head)) {
    if (head === "air-purifier") return HOMEKEEP_WEDGE_CATALOG.air_purifier;
    if (head === "whole-house-water") return HOMEKEEP_WEDGE_CATALOG.whole_house_water;
    if (head === "vacuum") return HOMEKEEP_WEDGE_CATALOG.vacuum;
    if (head === "humidifier") return HOMEKEEP_WEDGE_CATALOG.humidifier;
    if (head === "appliance-air") return HOMEKEEP_WEDGE_CATALOG.appliance_air;
  }
  return null;
}

export function wedgeFromQueryText(query: string): HomekeepWedgeCatalog | null {
  const q = query.toLowerCase();
  if (/\bair\s*purifier\b/.test(q)) return HOMEKEEP_WEDGE_CATALOG.air_purifier;
  if (/\bwhole\s*house\s*water\b/.test(q)) return HOMEKEEP_WEDGE_CATALOG.whole_house_water;
  if (/\bvacuum\b/.test(q) && /\bfilter\b/.test(q)) return HOMEKEEP_WEDGE_CATALOG.vacuum;
  if (/\bhumidifier\b/.test(q)) return HOMEKEEP_WEDGE_CATALOG.humidifier;
  if (/\brefrigerator\b/.test(q) || /\bfridge\b/.test(q) || /\bwater\s*filter\b/.test(q)) {
    return HOMEKEEP_WEDGE_CATALOG.refrigerator_water;
  }
  return null;
}

function launchStateForWedge(wedge: HomekeepWedgeCatalog): VerticalLaunchState | "UNKNOWN" {
  const vertical = VERTICAL_BY_WEDGE[wedge];
  if (vertical === "refrigerator_routes") {
    return getVerticalLaunchState("refrigerator");
  }
  return getVerticalLaunchState(vertical);
}

function countCsvDataRows(relPath: string, readTextFile: (p: string) => string, fileExists: (p: string) => boolean): number {
  const abs = path.resolve(relPath);
  if (!fileExists(abs)) return 0;
  try {
    const rows = parse(readTextFile(abs), { columns: true, skip_empty_lines: true }) as Record<string, unknown>[];
    return rows.length;
  } catch {
    return 0;
  }
}

function summarizeRetailerLinks(
  relPath: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): { retailer_link_count: number; blocked_link_count: number; safe_cta_count: number } {
  const abs = path.resolve(relPath);
  if (!fileExists(abs)) {
    return { retailer_link_count: 0, blocked_link_count: 0, safe_cta_count: 0 };
  }
  let rows: RetailerLinkRow[] = [];
  try {
    rows = parse(readTextFile(abs), { columns: true, skip_empty_lines: true }) as RetailerLinkRow[];
  } catch {
    return { retailer_link_count: 0, blocked_link_count: 0, safe_cta_count: 0 };
  }
  let blocked = 0;
  let safe = 0;
  for (const row of rows) {
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? null,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification ?? null,
      gateFailureKind: gate,
    });
    if (gate !== null || state === "BLOCKED_SEARCH_OR_DISCOVERY") blocked += 1;
    if (gate === null && row.browser_truth_classification === "direct_buyable") safe += 1;
  }
  return { retailer_link_count: rows.length, blocked_link_count: blocked, safe_cta_count: safe };
}

export async function loadGscArtifactForNextLaneV1(args: {
  rootDir: string;
  readTextFile: (p: string) => string;
  fileExists: (p: string) => boolean;
}): Promise<GscArtifactLoadResultV1> {
  const supabase = await readGscArtifactFromSupabase();
  if (supabase.ok) {
    const parsed = parseGscSearchAnalyticsArtifact(JSON.stringify(supabase.artifact));
    if (parsed.ok && parsed.artifact.status === "OK") {
      return { ok: true, artifact: parsed.artifact, source: "supabase.owner_report_artifacts[gsc_search_analytics]" };
    }
  }

  const localPath = path.join(args.rootDir, LOCAL_GSC_ARTIFACT_RELATIVE_PATH);
  if (args.fileExists(localPath)) {
    try {
      const parsed = parseGscSearchAnalyticsArtifact(args.readTextFile(localPath));
      if (parsed.ok && parsed.artifact.status === "OK") {
        return {
          ok: true,
          artifact: parsed.artifact,
          source: LOCAL_GSC_ARTIFACT_RELATIVE_PATH,
        };
      }
    } catch {
      /* fall through */
    }
  }

  return {
    ok: false,
    reason:
      supabase.ok === false
        ? `GSC artifact unavailable (${supabase.reason}) and local artifact missing or invalid.`
        : "GSC artifact missing or invalid.",
  };
}

function aggregateGscDemand(artifact: GscArtifactLoadResultV1 & { ok: true }): {
  impressionsByWedge: Map<HomekeepWedgeCatalog, number>;
  clicksByWedge: Map<HomekeepWedgeCatalog, number>;
  topPagesByWedge: Map<HomekeepWedgeCatalog, string[]>;
} {
  const impressionsByWedge = new Map<HomekeepWedgeCatalog, number>();
  const clicksByWedge = new Map<HomekeepWedgeCatalog, number>();
  const topPagesByWedge = new Map<HomekeepWedgeCatalog, string[]>();

  const add = (
    wedge: HomekeepWedgeCatalog,
    impressions: number,
    clicks: number,
    page?: string,
  ) => {
    impressionsByWedge.set(wedge, (impressionsByWedge.get(wedge) ?? 0) + impressions);
    clicksByWedge.set(wedge, (clicksByWedge.get(wedge) ?? 0) + clicks);
    if (page) {
      const list = topPagesByWedge.get(wedge) ?? [];
      if (!list.includes(page)) list.push(page);
      topPagesByWedge.set(wedge, list);
    }
  };

  const pages = artifact.artifact.top_pages_by_impressions;
  if (Array.isArray(pages)) {
    for (const entry of pages) {
      const wedge = wedgeFromPageUrl(entry.key);
      if (wedge) add(wedge, entry.impressions, entry.clicks, entry.key);
    }
  }

  const queries = artifact.artifact.top_queries_by_impressions;
  if (Array.isArray(queries)) {
    for (const entry of queries) {
      const wedge = wedgeFromQueryText(entry.key);
      if (wedge) add(wedge, entry.impressions, entry.clicks);
    }
  }

  return { impressionsByWedge, clicksByWedge, topPagesByWedge };
}

function sitemapCountsByWedge(
  sitemapText: string | null,
): Map<HomekeepWedgeCatalog, number> {
  const counts = new Map<HomekeepWedgeCatalog, number>();
  if (!sitemapText) return counts;
  for (const url of extractSitemapUrls(sitemapText)) {
    const wedge = wedgeFromPageUrl(url);
    if (!wedge) continue;
    counts.set(wedge, (counts.get(wedge) ?? 0) + 1);
  }
  return counts;
}

function coverageGapSummary(args: {
  launch_state: VerticalLaunchState | "UNKNOWN";
  blocked_link_count: number;
  safe_cta_count: number;
  sitemap_url_count: number;
  impressions: number;
}): string {
  const parts: string[] = [];
  if (args.launch_state !== "LIVE") {
    parts.push(`vertical ${args.launch_state} (not LIVE)`);
  }
  if (args.blocked_link_count >= 10) {
    parts.push(`${args.blocked_link_count} blocked/search-placeholder retailer links`);
  } else if (args.blocked_link_count > 0) {
    parts.push(`${args.blocked_link_count} blocked retailer links`);
  }
  if (args.safe_cta_count === 0) {
    parts.push("no direct_buyable safe CTAs in repo retailer_links");
  } else if (args.safe_cta_count < 3) {
    parts.push(`only ${args.safe_cta_count} direct_buyable safe CTA(s)`);
  }
  if (args.sitemap_url_count > 0 && args.sitemap_url_count < 10) {
    parts.push(`thin sitemap inventory (${args.sitemap_url_count} URLs)`);
  }
  if (args.impressions >= 50 && args.launch_state !== "LIVE") {
    parts.push("GSC impressions exceed typical noindex wedge exposure");
  }
  return parts.length > 0 ? parts.join("; ") : "coverage signals within expected LIVE-wedge band";
}

function priorityScoreForWedge(row: {
  impressions: number;
  launch_state: VerticalLaunchState | "UNKNOWN";
  blocked_link_count: number;
  safe_cta_count: number;
  sitemap_url_count: number;
}): number {
  const launchMultiplier = row.launch_state === "LIVE" ? 0.35 : 1;
  const demand = row.impressions * launchMultiplier;
  const blockedBoost = Math.min(row.blocked_link_count, 80) * 2.5;
  const ctaGap = Math.max(0, 6 - row.safe_cta_count) * 3;
  const thinInventory = row.sitemap_url_count > 0 && row.sitemap_url_count < 12 ? 12 : 0;
  return demand + blockedBoost + ctaGap + thinInventory;
}

function recommendedActionForWedge(
  wedge: HomekeepWedgeCatalog,
  launch_state: VerticalLaunchState | "UNKNOWN",
): string {
  if (wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier && launch_state !== "LIVE") {
    return "Return to the air_purifier closed-batch expansion loop: produce an air purifier buyer-path coverage snapshot and top-20 queue before any new batch decision.";
  }
  if (launch_state !== "LIVE") {
    return `Run wedge buyer-path coverage snapshot for ${wedge} (launch ${launch_state}) and queue top blocked OEM/search rows.`;
  }
  return `Continue ${wedge} buyer-path coverage loop only if an open ${wedge} batch is proven; otherwise use demand score to choose the next batch candidate.`;
}

function nextLaneForWedge(wedge: HomekeepWedgeCatalog | "UNKNOWN"): string | null {
  if (wedge === "UNKNOWN") return null;
  if (wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier) return "air_purifier_buyer_path_coverage";
  if (wedge === HOMEKEEP_WEDGE_CATALOG.refrigerator_water) return "refrigerator_water_buyer_path_coverage";
  return `${wedge}_buyer_path_coverage`;
}

export function buildDemandToCoverageNextLaneUnknownV1(args: {
  now?: () => Date;
  reason?: string;
}): DemandToCoverageNextLaneReportV1 {
  const now = args.now ?? (() => new Date());
  return {
    contract: DEMAND_TO_COVERAGE_NEXT_LANE_CONTRACT_V1,
    report_name: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    runtime_status: "UNKNOWN",
    source_status: "UNKNOWN",
    recommended_wedge: "UNKNOWN",
    recommendation_status: "UNKNOWN",
    recommended_next_action: "Refresh GSC artifact (buckparts:gsc:fetch) and re-run demand-to-coverage next-lane report.",
    next_lane: null,
    next_wedge: "UNKNOWN",
    next_batch_candidate: null,
    blockers: [args.reason ?? "demand_to_coverage_next_lane_v1 build failed"],
    proof_sources: [],
    wedge_rows: [],
    top_pages: [],
    top_queries: [],
    coverage_gap: {
      highest_demand_wedge: "UNKNOWN",
      highest_blocked_wedge: "UNKNOWN",
      active_batch_wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      gap_rationale: args.reason ?? "demand_to_coverage_next_lane_v1 build failed",
    },
    next_action: "Refresh GSC artifact (buckparts:gsc:fetch) and re-run demand-to-coverage next-lane report.",
    notes: [args.reason ?? "UNKNOWN"],
    proven_facts: [
      "demand_to_coverage_next_lane_v1 is read_only=true and data_mutation=false.",
    ],
    inferred_facts: [],
    unknown_facts: [args.reason ?? "UNKNOWN"],
  };
}

export async function buildDemandToCoverageNextLaneV1Report(
  deps: BuildDemandToCoverageNextLaneDepsV1,
): Promise<DemandToCoverageNextLaneReportV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readTextFile = deps.readTextFile ?? defaultReadText;
  const rootDir = deps.rootDir;

  const proof_sources: string[] = [
    "src/lib/catalog/vertical-launch-state.ts",
    "src/lib/owner-dashboard/gsc-api-artifact.ts",
    "data/gsc/sitemap.xml (inventory buckets)",
    "data/*/filters.csv and data/*/retailer_links.csv (repo buyer-path)",
  ];

  const gsc =
    deps.loadGscArtifact?.() ??
    loadGscArtifactForNextLaneV1({ rootDir, readTextFile, fileExists });

  const gscResult = await gsc;
  const notes: string[] = [];

  const sitemapText =
    deps.loadSitemapText?.() ??
    (fileExists(path.join(rootDir, SITEMAP_ARTIFACT_RELATIVE_PATH))
      ? readTextFile(path.join(rootDir, SITEMAP_ARTIFACT_RELATIVE_PATH))
      : null);

  const sitemapByWedge = sitemapCountsByWedge(sitemapText);
  if (sitemapText) proof_sources.push(SITEMAP_ARTIFACT_RELATIVE_PATH);

  let source_status: DemandToCoverageSourceStatusV1 = "UNKNOWN";
  let top_pages: GscArtifactTopEntry[] = [];
  let top_queries: GscArtifactTopEntry[] = [];
  let impressionsByWedge = new Map<HomekeepWedgeCatalog, number>();
  let clicksByWedge = new Map<HomekeepWedgeCatalog, number>();
  let topPagesByWedge = new Map<HomekeepWedgeCatalog, string[]>();

  if (gscResult.ok) {
    proof_sources.push(gscResult.source);
    source_status = sitemapText ? "PROVEN" : "PARTIAL";
    top_pages = Array.isArray(gscResult.artifact.top_pages_by_impressions)
      ? gscResult.artifact.top_pages_by_impressions.slice(0, 15)
      : [];
    top_queries = Array.isArray(gscResult.artifact.top_queries_by_impressions)
      ? gscResult.artifact.top_queries_by_impressions.slice(0, 15)
      : [];
    const agg = aggregateGscDemand(gscResult);
    impressionsByWedge = agg.impressionsByWedge;
    clicksByWedge = agg.clicksByWedge;
    topPagesByWedge = agg.topPagesByWedge;
  } else {
    notes.push(gscResult.reason);
  }

  const wedge_rows: DemandToCoverageNextLaneWedgeRowV1[] = [];

  for (const wedge of WEDGE_ORDER) {
    const paths = WEDGE_REPO_PATHS[wedge];
    const filtersRel = paths.filters ? path.join(rootDir, paths.filters) : null;
    const linksRel = paths.retailer_links ? path.join(rootDir, paths.retailer_links) : null;

    const linkSummary = linksRel
      ? summarizeRetailerLinks(linksRel, readTextFile, fileExists)
      : { retailer_link_count: 0, blocked_link_count: 0, safe_cta_count: 0 };

    const launch_state = launchStateForWedge(wedge);
    const impressions = gscResult.ok
      ? (impressionsByWedge.get(wedge) ?? 0)
      : ("UNKNOWN" as const);
    const clicks = gscResult.ok ? (clicksByWedge.get(wedge) ?? 0) : ("UNKNOWN" as const);
    const sitemap_url_count = sitemapText ? (sitemapByWedge.get(wedge) ?? 0) : ("UNKNOWN" as const);

    const row: DemandToCoverageNextLaneWedgeRowV1 = {
      wedge,
      vertical_slug: VERTICAL_BY_WEDGE[wedge],
      impressions,
      clicks,
      top_pages: topPagesByWedge.get(wedge) ?? [],
      launch_state,
      sitemap_url_count,
      live_filter_count: filtersRel ? countCsvDataRows(filtersRel, readTextFile, fileExists) : 0,
      retailer_link_count: linkSummary.retailer_link_count,
      blocked_link_count: linkSummary.blocked_link_count,
      safe_cta_count: linkSummary.safe_cta_count,
      coverage_gap_summary: coverageGapSummary({
        launch_state,
        blocked_link_count: linkSummary.blocked_link_count,
        safe_cta_count: linkSummary.safe_cta_count,
        sitemap_url_count: typeof sitemap_url_count === "number" ? sitemap_url_count : 0,
        impressions: typeof impressions === "number" ? impressions : 0,
      }),
      recommended_action: recommendedActionForWedge(wedge, launch_state),
      priority_score:
        gscResult.ok && typeof impressions === "number"
          ? priorityScoreForWedge({
              impressions,
              launch_state,
              blocked_link_count: linkSummary.blocked_link_count,
              safe_cta_count: linkSummary.safe_cta_count,
              sitemap_url_count: typeof sitemap_url_count === "number" ? sitemap_url_count : 0,
            })
          : "UNKNOWN",
    };
    wedge_rows.push(row);
  }

  const scored = wedge_rows.filter(
    (r): r is DemandToCoverageNextLaneWedgeRowV1 & { priority_score: number } =>
      typeof r.priority_score === "number",
  );
  const ranked = [...scored].sort((a, b) => b.priority_score - a.priority_score);
  const winner = ranked[0] ?? null;

  const highest_demand = gscResult.ok
    ? [...wedge_rows]
        .filter((r): r is DemandToCoverageNextLaneWedgeRowV1 & { impressions: number } =>
          typeof r.impressions === "number",
        )
        .sort((a, b) => b.impressions - a.impressions)[0]?.wedge ?? "UNKNOWN"
    : "UNKNOWN";

  const highest_blocked = [...wedge_rows]
    .filter((r): r is DemandToCoverageNextLaneWedgeRowV1 & { blocked_link_count: number } =>
      typeof r.blocked_link_count === "number",
    )
    .sort((a, b) => b.blocked_link_count - a.blocked_link_count)[0]?.wedge ?? "UNKNOWN";

  let recommendation_status: DemandToCoverageRecommendationStatusV1 = "UNKNOWN";
  let recommended_wedge: HomekeepWedgeCatalog | "UNKNOWN" = "UNKNOWN";
  let next_action =
    "Refresh GSC artifact and re-run npx tsx scripts/report-buckparts-demand-to-coverage-next-lane.ts";
  const blockers: string[] = [];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];
  let apOpenBatchExistenceProven = false;
  let apOpenBatchRegistry: ApDemandSelectedBatchRunRegistryVisibilityV1 | null = null;

  if (winner && gscResult.ok) {
    recommended_wedge = winner.wedge;
    const winnerLive = winner.launch_state === "LIVE";
    if (!winnerLive && typeof winner.impressions === "number" && winner.impressions > 0) {
      recommendation_status = "RECOMMEND_REOPEN";
      next_action = winner.recommended_action;
      inferred_facts.push(
        `${winner.wedge} is the highest priority scored wedge and is not LIVE; recommendation returns to a closed/paused expansion loop rather than continuing a different wedge.`,
      );
    } else if (winnerLive) {
      recommendation_status = "START_NEW_DEMAND_SELECTED_BATCH";
      if (winner.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier) {
        apOpenBatchRegistry =
          deps.loadApDemandSelectedRunRegistry?.({ rootDir, fileExists, readText: readTextFile }) ??
          loadApDemandSelectedBatchRunRegistryV1({ rootDir, fileExists, readText: readTextFile });
        apOpenBatchExistenceProven = isApDemandSelectedOpenBatchRegistryProvenOpenV1(apOpenBatchRegistry);
      }
      if (apOpenBatchExistenceProven && apOpenBatchRegistry) {
        next_action = `Demand-selected ${winner.wedge} open batch is proven read-only (run_id=${String(apOpenBatchRegistry.run_id)}); batch closeout and apply readiness are not proven.`;
      } else {
        next_action =
          `Start a demand-selected ${winner.wedge} buyer-path batch candidate only after owner approval; no open batch is proven by this report.`;
        blockers.push("open_batch_not_proven");
        if (winner.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier && apOpenBatchRegistry?.status === "PROVEN") {
          unknown_facts.push(
            "AP demand-selected run registry is PROVEN_OPEN but evidence_collection_started=false; open batch existence is not proven for blocker reconciliation.",
          );
        } else {
          unknown_facts.push("No active/open batch registry is read by demand_to_coverage_next_lane_v1.");
        }
      }
    } else {
      recommendation_status = "RECOMMEND_REOPEN";
      next_action = winner.recommended_action;
    }
  } else {
    blockers.push("scored_wedge_unavailable");
    unknown_facts.push("No scored wedge winner was available from the current demand/coverage inputs.");
  }

  if (gscResult.ok) {
    notes.push(
      `GSC totals: impressions=${String(gscResult.artifact.total_impressions)}, clicks=${String(gscResult.artifact.total_clicks)}.`,
    );
  }
  notes.push(
    `Vertical launch states: ${(Object.keys(VERTICAL_LAUNCH_STATES) as VerticalSlug[])
      .map((v) => `${v}=${VERTICAL_LAUNCH_STATES[v]}`)
      .join(", ")}.`,
  );
  if (!gscResult.ok) {
    blockers.push("gsc_artifact_unavailable");
    unknown_facts.push(gscResult.reason);
  }

  const recommended_next_action = next_action;
  const next_wedge = recommended_wedge;
  const next_lane = nextLaneForWedge(recommended_wedge);
  const next_batch_candidate =
    recommended_wedge === "UNKNOWN" ? null : `${recommended_wedge}_demand_selected_batch_candidate`;
  const proven_facts = [
    "demand_to_coverage_next_lane_v1 is read_only=true and data_mutation=false.",
    `Recommended wedge is ${recommended_wedge}.`,
    `Recommendation status is ${recommendation_status}.`,
  ];
  if (winner) {
    proven_facts.push(
      `Winner row: ${winner.wedge} priority_score=${String(winner.priority_score)}; launch_state=${winner.launch_state}.`,
    );
  }
  if (apOpenBatchExistenceProven && apOpenBatchRegistry) {
    proven_facts.push(
      `PROVEN: AP demand-selected run registry ${String(apOpenBatchRegistry.run_registry_rel_path)} proves open batch existence (evidence_collection_started=true).`,
      "PROVEN: batch closeout is NOT_PROVEN (closeout_complete remains false on open demand-selected registry).",
      "PROVEN: apply readiness is NOT_PROVEN; this lane does not authorize batch start, CSV apply, or evidence writes.",
    );
  }

  return {
    contract: DEMAND_TO_COVERAGE_NEXT_LANE_CONTRACT_V1,
    report_name: DEMAND_TO_COVERAGE_NEXT_LANE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    runtime_status: source_status,
    source_status,
    recommended_wedge,
    recommendation_status,
    recommended_next_action,
    next_lane,
    next_wedge,
    next_batch_candidate,
    blockers,
    proof_sources,
    wedge_rows,
    top_pages,
    top_queries,
    coverage_gap: {
      highest_demand_wedge: highest_demand,
      highest_blocked_wedge: highest_blocked,
      active_batch_wedge: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      gap_rationale:
        winner != null
          ? `${winner.wedge} priority_score=${winner.priority_score}: ${winner.coverage_gap_summary}`
          : "No scored wedge rows",
    },
    next_action,
    notes,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
