import { existsSync, readFileSync } from "node:fs";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AP_HOMEOWNER_FILTER_PILOT_SLUGS } from "@/lib/air-purifier/ap-homeowner-framework-v1";
import type {
  GscArtifactDateRange,
  GscSearchAnalyticsArtifact,
  GscTrackedPageSliceMatchStatusV1,
  GscTrackedPageSliceV1,
} from "@/lib/owner-dashboard/gsc-api-artifact";
import { apHomeownerPilotTrackedPageTargets } from "./gsc-tracked-page-slices-v1";
import {
  loadGscArtifactForNextLaneV1,
  type GscArtifactLoadResultV1,
} from "./demand-to-coverage-next-lane-v1";
import type { ClickEventReadRow } from "./buckparts-click-events-snapshot";

export const AP_HOMEOWNER_PILOT_SCORECARD_CONTRACT_V1 = "ap_homeowner_pilot_scorecard_v1" as const;

export type ApHomeownerPilotScorecardInterpretationV1 =
  | "HANDOFFS_WITHOUT_PROVEN_GSC_DEMAND"
  | "DEMAND_AND_HANDOFFS_PROVEN"
  | "NO_HANDOFFS_IN_WINDOW"
  | "MEASUREMENT_INCOMPLETE";

export type ApHomeownerPilotHandoffStatusV1 = "PROVEN_ZERO" | "PROVEN_NONZERO" | "UNKNOWN";

export type ApHomeownerPilotScorecardRowV1 = {
  slug: string;
  page_url: string;
  gsc_match_status: GscTrackedPageSliceMatchStatusV1 | "UNKNOWN";
  gsc_impressions_30d: number | "UNKNOWN";
  gsc_clicks_30d: number | "UNKNOWN";
  gsc_ctr: number | "UNKNOWN";
  gsc_average_position: number | "UNKNOWN";
  handoff_clicks_30d: number | "UNKNOWN";
  handoff_status: ApHomeownerPilotHandoffStatusV1;
  revenue_status: "NOT_CONNECTED";
  interpretation: ApHomeownerPilotScorecardInterpretationV1;
};

export type ApHomeownerPilotScorecardV1 = {
  contract: typeof AP_HOMEOWNER_PILOT_SCORECARD_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  runtime_status: "OK" | "PARTIAL" | "UNKNOWN";
  window_days: 30;
  gsc_artifact_source: string | "UNKNOWN";
  gsc_date_range: GscArtifactDateRange | "UNKNOWN";
  click_query_status: "OK" | "UNKNOWN";
  rows: ApHomeownerPilotScorecardRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

const PAGE = 2000;

export function isGscMeasurementIncompleteForScorecard(
  matchStatus: GscTrackedPageSliceMatchStatusV1 | "UNKNOWN",
): boolean {
  return matchStatus === "QUERY_FAILED" || matchStatus === "NOT_FETCHED" || matchStatus === "UNKNOWN";
}

export function interpretApHomeownerPilotScorecardRow(args: {
  gsc_match_status: GscTrackedPageSliceMatchStatusV1 | "UNKNOWN";
  gsc_impressions_30d: number | "UNKNOWN";
  handoff_status: ApHomeownerPilotHandoffStatusV1;
  handoff_clicks_30d: number | "UNKNOWN";
}): ApHomeownerPilotScorecardInterpretationV1 {
  if (isGscMeasurementIncompleteForScorecard(args.gsc_match_status) || args.handoff_status === "UNKNOWN") {
    return "MEASUREMENT_INCOMPLETE";
  }

  const handoffCount = typeof args.handoff_clicks_30d === "number" ? args.handoff_clicks_30d : 0;

  if (args.gsc_match_status === "ZERO_IN_RANGE" && handoffCount > 0) {
    return "HANDOFFS_WITHOUT_PROVEN_GSC_DEMAND";
  }

  if (
    args.gsc_match_status === "FOUND" &&
    typeof args.gsc_impressions_30d === "number" &&
    args.gsc_impressions_30d > 0 &&
    handoffCount > 0
  ) {
    return "DEMAND_AND_HANDOFFS_PROVEN";
  }

  if (
    (args.gsc_match_status === "FOUND" || args.gsc_match_status === "ZERO_IN_RANGE") &&
    handoffCount === 0
  ) {
    return "NO_HANDOFFS_IN_WINDOW";
  }

  if (handoffCount > 0) {
    return "HANDOFFS_WITHOUT_PROVEN_GSC_DEMAND";
  }

  return "MEASUREMENT_INCOMPLETE";
}

export function countApHomeownerPilotHandoffClicksBySlug30d(args: {
  clickRows: ClickEventReadRow[];
  linkIdToFilterSlug: Map<string, string>;
  pilotSlugs?: readonly string[];
}): Map<string, number> {
  const pilotSet = new Set(
    (args.pilotSlugs ?? AP_HOMEOWNER_FILTER_PILOT_SLUGS).map((slug) => slug.trim().toLowerCase()),
  );
  const counts = new Map<string, number>();
  for (const slug of Array.from(pilotSet)) {
    counts.set(slug, 0);
  }

  for (const row of args.clickRows) {
    const linkId = row.air_purifier_retailer_link_id?.trim();
    if (!linkId) continue;
    const filterSlug = args.linkIdToFilterSlug.get(linkId)?.trim().toLowerCase();
    if (!filterSlug || !pilotSet.has(filterSlug)) continue;
    counts.set(filterSlug, (counts.get(filterSlug) ?? 0) + 1);
  }

  return counts;
}

export async function loadApRetailerLinkIdToFilterSlugMap(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("air_purifier_retailer_links")
      .select("id, air_purifier_filter_id")
      .eq("status", "approved")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    const partIds = Array.from(
      new Set(
        chunk
          .map((row) => (row as { air_purifier_filter_id?: string }).air_purifier_filter_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );
    const partRows = new Map<string, string>();
    for (let i = 0; i < partIds.length; i += 100) {
      const slice = partIds.slice(i, i + 100);
      if (slice.length === 0) continue;
      const { data: filters, error: filterError } = await supabase
        .from("air_purifier_filters")
        .select("id, slug")
        .in("id", slice);
      if (filterError) throw filterError;
      for (const filter of filters ?? []) {
        const row = filter as { id: string; slug: string };
        partRows.set(row.id, row.slug);
      }
    }
    for (const row of chunk) {
      const link = row as { id: string; air_purifier_filter_id: string };
      const slug = partRows.get(link.air_purifier_filter_id);
      if (slug) {
        map.set(link.id, slug);
      }
    }
    if (chunk.length < PAGE) break;
  }
  return map;
}

function resolveGscSliceForSlug(
  slug: string,
  slices: GscTrackedPageSliceV1[] | undefined,
): GscTrackedPageSliceV1 | null {
  if (!slices) return null;
  const normalized = slug.trim().toLowerCase();
  return slices.find((slice) => slice.slug.trim().toLowerCase() === normalized) ?? null;
}

function gscFieldsFromSlice(
  slice: GscTrackedPageSliceV1 | null,
  fallbackPageUrl: string,
): Pick<
  ApHomeownerPilotScorecardRowV1,
  | "page_url"
  | "gsc_match_status"
  | "gsc_impressions_30d"
  | "gsc_clicks_30d"
  | "gsc_ctr"
  | "gsc_average_position"
> {
  if (!slice) {
    return {
      page_url: fallbackPageUrl,
      gsc_match_status: "NOT_FETCHED",
      gsc_impressions_30d: "UNKNOWN",
      gsc_clicks_30d: "UNKNOWN",
      gsc_ctr: "UNKNOWN",
      gsc_average_position: "UNKNOWN",
    };
  }
  return {
    page_url: slice.page_url,
    gsc_match_status: slice.match_status,
    gsc_impressions_30d: slice.impressions,
    gsc_clicks_30d: slice.clicks,
    gsc_ctr: slice.ctr,
    gsc_average_position: slice.average_position,
  };
}

export function buildApHomeownerPilotScorecardRows(args: {
  tracked_page_slices_v1?: GscTrackedPageSliceV1[];
  handoffClicksBySlug: Map<string, number> | null;
  clickQueryStatus: "OK" | "UNKNOWN";
  pageTargets?: Array<{ slug: string; page_url: string }>;
}): ApHomeownerPilotScorecardRowV1[] {
  const targets = args.pageTargets ?? apHomeownerPilotTrackedPageTargets();
  const handoffKnown = args.clickQueryStatus === "OK" && args.handoffClicksBySlug !== null;

  return targets.map((target) => {
    const slug = target.slug.trim().toLowerCase();
    const slice = resolveGscSliceForSlug(slug, args.tracked_page_slices_v1);
    const gsc = gscFieldsFromSlice(slice, target.page_url);

    let handoff_clicks_30d: number | "UNKNOWN" = "UNKNOWN";
    let handoff_status: ApHomeownerPilotHandoffStatusV1 = "UNKNOWN";
    if (handoffKnown) {
      const count = args.handoffClicksBySlug!.get(slug) ?? 0;
      handoff_clicks_30d = count;
      handoff_status = count > 0 ? "PROVEN_NONZERO" : "PROVEN_ZERO";
    }

    return {
      slug,
      ...gsc,
      handoff_clicks_30d,
      handoff_status,
      revenue_status: "NOT_CONNECTED",
      interpretation: interpretApHomeownerPilotScorecardRow({
        gsc_match_status: gsc.gsc_match_status,
        gsc_impressions_30d: gsc.gsc_impressions_30d,
        handoff_status,
        handoff_clicks_30d,
      }),
    };
  });
}

export function buildApHomeownerPilotScorecardUnknownV1(args: {
  now?: () => Date;
  reason?: string;
}): ApHomeownerPilotScorecardV1 {
  const now = args.now ?? (() => new Date());
  const rows = buildApHomeownerPilotScorecardRows({
    tracked_page_slices_v1: undefined,
    handoffClicksBySlug: null,
    clickQueryStatus: "UNKNOWN",
  });
  return {
    contract: AP_HOMEOWNER_PILOT_SCORECARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    runtime_status: "UNKNOWN",
    window_days: 30,
    gsc_artifact_source: "UNKNOWN",
    gsc_date_range: "UNKNOWN",
    click_query_status: "UNKNOWN",
    rows,
    proven_facts: [
      "ap_homeowner_pilot_scorecard_v1 is read_only=true and data_mutation=false.",
      "Outbound handoff clicks are not revenue.",
    ],
    unknown_facts: [args.reason ?? "ap_homeowner_pilot_scorecard_v1 build failed."],
  };
}

export type BuildApHomeownerPilotScorecardDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (p: string) => boolean;
  readTextFile?: (p: string) => string;
  clickRows30d: ClickEventReadRow[] | null;
  clickQueryStatus: "OK" | "UNKNOWN";
  loadGscArtifact?: () => Promise<GscArtifactLoadResultV1>;
  loadLinkIdToFilterSlug?: () => Promise<Map<string, string>>;
};

export async function buildApHomeownerPilotScorecardV1Report(
  deps: BuildApHomeownerPilotScorecardDepsV1,
): Promise<ApHomeownerPilotScorecardV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? ((p: string) => existsSync(p));
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const proven_facts: string[] = [
    "ap_homeowner_pilot_scorecard_v1 is read_only=true and data_mutation=false.",
    `Pilot slug count=${AP_HOMEOWNER_FILTER_PILOT_SLUGS.length} from AP_HOMEOWNER_FILTER_PILOT_SLUGS.`,
    "GSC demand uses tracked_page_slices_v1 exact-page filtered slices only (not top-10 inference).",
    "Handoff clicks join click_events.air_purifier_retailer_link_id to air_purifier_filters.slug.",
    "revenue_status=NOT_CONNECTED on every row; clicks are not revenue.",
  ];
  const unknown_facts: string[] = [];

  const gscResult =
    deps.loadGscArtifact?.() ??
    loadGscArtifactForNextLaneV1({ rootDir: deps.rootDir, readTextFile, fileExists });

  const gscResolved = await gscResult;
  let tracked_page_slices_v1: GscTrackedPageSliceV1[] | undefined;
  let gsc_artifact_source: string | "UNKNOWN" = "UNKNOWN";
  let gsc_date_range: GscArtifactDateRange | "UNKNOWN" = "UNKNOWN";

  if (gscResolved.ok) {
    const artifact: GscSearchAnalyticsArtifact = gscResolved.artifact;
    gsc_artifact_source = gscResolved.source;
    gsc_date_range = artifact.date_range === "UNKNOWN" ? "UNKNOWN" : artifact.date_range;
    tracked_page_slices_v1 = artifact.tracked_page_slices_v1;
    proven_facts.push(`GSC artifact source=${gscResolved.source}.`);
    if (artifact.tracked_page_slices_v1?.length) {
      proven_facts.push(`tracked_page_slices_v1 count=${artifact.tracked_page_slices_v1.length}.`);
    } else {
      unknown_facts.push("GSC artifact OK but tracked_page_slices_v1 is missing (older artifact shape).");
    }
  } else {
    unknown_facts.push(gscResolved.reason);
  }

  let handoffClicksBySlug: Map<string, number> | null = null;
  if (deps.clickQueryStatus === "OK" && deps.clickRows30d !== null) {
    try {
      const linkIdToFilterSlug =
        deps.loadLinkIdToFilterSlug?.() ??
        (async () => {
          const { loadEnv } = await import("./load-env");
          const { getSupabaseAdmin } = await import("./supabase-admin");
          loadEnv();
          return loadApRetailerLinkIdToFilterSlugMap(getSupabaseAdmin());
        })();
      const linkMap = await linkIdToFilterSlug;
      handoffClicksBySlug = countApHomeownerPilotHandoffClicksBySlug30d({
        clickRows: deps.clickRows30d,
        linkIdToFilterSlug: linkMap,
      });
      proven_facts.push("Handoff click counts joined from 30d click_events via air_purifier_retailer_links.");
    } catch (error) {
      unknown_facts.push(
        `Handoff click join failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    unknown_facts.push("30d click_events rows unavailable; handoff_status=UNKNOWN.");
  }

  const rows = buildApHomeownerPilotScorecardRows({
    tracked_page_slices_v1,
    handoffClicksBySlug,
    clickQueryStatus:
      deps.clickQueryStatus === "OK" && handoffClicksBySlug !== null ? "OK" : "UNKNOWN",
  });

  const runtime_status: ApHomeownerPilotScorecardV1["runtime_status"] =
    gscResolved.ok && handoffClicksBySlug !== null
      ? "OK"
      : gscResolved.ok || handoffClicksBySlug !== null
        ? "PARTIAL"
        : "UNKNOWN";

  return {
    contract: AP_HOMEOWNER_PILOT_SCORECARD_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    runtime_status,
    window_days: 30,
    gsc_artifact_source,
    gsc_date_range,
    click_query_status:
      deps.clickQueryStatus === "OK" && handoffClicksBySlug !== null ? "OK" : "UNKNOWN",
    rows,
    proven_facts,
    unknown_facts,
  };
}
