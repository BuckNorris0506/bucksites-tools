/**
 * Read-only aggregates over `public.click_events` for Command Center v2 / owner dashboard.
 * Column set matches `scripts/report-homekeep-affiliate-clicks.ts` plus wedge FK columns from migrations.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ClickFreshnessStatus,
  ClickUserAgentCategory,
  ClickVisibilitySnapshot,
} from "./buckparts-command-center-v2-types";

const PAGE = 2000;
const MAX_ROWS_FOR_TOP_LISTS = 8000;

/** Row shape for `/go` logging (see `buildGoClickEventInsertRow` + wedge routes). */
export type ClickEventAggRow = {
  filter_id: string | null;
  retailer_slug: string | null;
  page_type: string | null;
  page_slug: string | null;
  air_purifier_retailer_link_id: string | null;
  vacuum_retailer_link_id: string | null;
  humidifier_retailer_link_id: string | null;
  whole_house_water_retailer_link_id: string | null;
  appliance_air_retailer_link_id: string | null;
};

export type ClickEventReadRow = ClickEventAggRow & {
  created_at: string;
  user_agent: string | null;
};

const SELECT_AGG_COLUMNS = [
  "filter_id",
  "retailer_slug",
  "page_type",
  "page_slug",
  "air_purifier_retailer_link_id",
  "vacuum_retailer_link_id",
  "humidifier_retailer_link_id",
  "whole_house_water_retailer_link_id",
  "appliance_air_retailer_link_id",
].join(", ");

const SELECT_READ_COLUMNS = `${SELECT_AGG_COLUMNS},created_at,user_agent`;

/**
 * Conservative outbound-click UA bucket. `HUMAN_LIKELY` is not proof of purchase intent.
 * Order: internal audit → known bots/crawlers → scripted HTTP clients → browser-like heuristic → unknown.
 */
export function classifyClickUserAgent(userAgent: string | null | undefined): ClickUserAgentCategory {
  const ua = typeof userAgent === "string" ? userAgent.trim() : "";
  if (ua.length === 0) return "UNKNOWN";

  if (ua.includes("BuckPartsAudit")) return "INTERNAL_AUDIT";

  const lower = ua.toLowerCase();

  if (
    lower.includes("claudebot") ||
    lower.includes("anthropic.com") ||
    lower.includes("meta-externalagent") ||
    lower.includes("mj12bot") ||
    lower.includes("googlebot") ||
    lower.includes("bingbot") ||
    lower.includes("petalbot") ||
    lower.includes("ahrefsbot") ||
    lower.includes("semrushbot") ||
    lower.includes("facebookexternalhit") ||
    lower.includes("slackbot") ||
    lower.includes("discordbot") ||
    lower.includes("twitterbot") ||
    lower.includes("linkedinbot")
  ) {
    return "KNOWN_BOT";
  }

  const s = lower.trim();
  if (s === "node" || s.startsWith("node ") || lower.startsWith("curl/")) return "SCRIPTED_CLIENT";

  const browserLike =
    lower.includes("mozilla/") ||
    lower.includes("applewebkit") ||
    lower.includes("chrome/") ||
    lower.includes("safari/") ||
    lower.includes("firefox/") ||
    lower.includes("edg/");

  if (browserLike) return "HUMAN_LIKELY";

  return "UNKNOWN";
}

export function computeClickQualityFromRows(
  rows: ClickEventReadRow[],
  args: { last7Iso: string; raw7: number; raw30: number },
): Pick<
  ClickVisibilitySnapshot,
  | "human_likely_last_7_days_clicks"
  | "human_likely_last_30_days_clicks"
  | "excluded_last_30_days_clicks"
  | "excluded_by_category_30d"
  | "top_user_agent_families_30d"
  | "newest_click_at"
  | "oldest_click_at_in_30d_window"
  | "click_freshness_status"
  | "click_freshness_reason"
> {
  let human7 = 0;
  let human30 = 0;
  const excludedCat: Partial<Record<Exclude<ClickUserAgentCategory, "HUMAN_LIKELY">, number>> = {};
  const bump = (c: Exclude<ClickUserAgentCategory, "HUMAN_LIKELY">) => {
    excludedCat[c] = (excludedCat[c] ?? 0) + 1;
  };

  const uaKey = new Map<string, { clicks: number; category: ClickUserAgentCategory }>();

  let newest = "";
  let oldest = "";

  for (const r of rows) {
    const ts = r.created_at;
    if (!newest || ts > newest) newest = ts;
    if (!oldest || ts < oldest) oldest = ts;

    const cat = classifyClickUserAgent(r.user_agent);
    if (cat === "HUMAN_LIKELY") {
      human30 += 1;
      if (ts >= args.last7Iso) human7 += 1;
    } else {
      bump(cat);
    }

    const key = (r.user_agent ?? "(null)").slice(0, 140);
    const prev = uaKey.get(key);
    if (prev) prev.clicks += 1;
    else uaKey.set(key, { clicks: 1, category: cat });
  }

  const excluded30 = rows.length - human30;

  let click_freshness_status: ClickFreshnessStatus;
  let click_freshness_reason: string;
  if (args.raw30 === 0) {
    click_freshness_status = "NO_RECENT_EVENTS";
    click_freshness_reason = "No click_events rows in the rolling 30d window.";
  } else if (newest.length > 0 && newest >= args.last7Iso) {
    click_freshness_status = "OK";
    click_freshness_reason = "At least one click_event has created_at within the rolling 7d window.";
  } else if (newest.length > 0) {
    click_freshness_status = "STALE";
    click_freshness_reason =
      "click_events exist in the 30d window but none in the rolling 7d window (newest click is older than 7d).";
  } else {
    click_freshness_status = "UNKNOWN";
    click_freshness_reason = "Could not determine newest click timestamp from fetched rows.";
  }

  const top_user_agent_families_30d = Array.from(uaKey.entries())
    .map(([user_agent, v]) => ({ user_agent, clicks: v.clicks, category: v.category }))
    .sort((a, b) => b.clicks - a.clicks || a.user_agent.localeCompare(b.user_agent))
    .slice(0, 20);

  return {
    human_likely_last_7_days_clicks: human7,
    human_likely_last_30_days_clicks: human30,
    excluded_last_30_days_clicks: excluded30,
    excluded_by_category_30d: excludedCat,
    top_user_agent_families_30d,
    newest_click_at: newest || "UNKNOWN",
    oldest_click_at_in_30d_window: oldest || "UNKNOWN",
    click_freshness_status,
    click_freshness_reason,
  };
}

export function isFridgeWaterClickRow(row: ClickEventAggRow): boolean {
  return (
    typeof row.filter_id === "string" &&
    row.filter_id.trim().length > 0 &&
    !row.air_purifier_retailer_link_id &&
    !row.whole_house_water_retailer_link_id &&
    !row.vacuum_retailer_link_id &&
    !row.humidifier_retailer_link_id &&
    !row.appliance_air_retailer_link_id
  );
}

export function aggregateClickRowsForTopLists(rows: ClickEventAggRow[]): Pick<
  ClickVisibilitySnapshot,
  "top_retailer_slugs_30d" | "top_page_attribution_30d" | "top_wedge_link_ids_30d"
> {
  const retailerMap = new Map<string, number>();
  const pageMap = new Map<string, { page_type: string | null; page_slug: string | null; clicks: number }>();
  const linkMap = new Map<string, { wedge: string; link_id: string; clicks: number }>();

  for (const row of rows) {
    if (isFridgeWaterClickRow(row)) {
      const slug = (row.retailer_slug ?? "").trim() || "(unknown_retailer)";
      retailerMap.set(slug, (retailerMap.get(slug) ?? 0) + 1);
      const pk = `${row.page_type ?? ""}\t${row.page_slug ?? ""}`;
      const prev = pageMap.get(pk);
      if (prev) prev.clicks += 1;
      else pageMap.set(pk, { page_type: row.page_type, page_slug: row.page_slug, clicks: 1 });
    }

    if (row.air_purifier_retailer_link_id) {
      const id = row.air_purifier_retailer_link_id;
      const k = `air_purifier:${id}`;
      const prev = linkMap.get(k);
      if (prev) prev.clicks += 1;
      else linkMap.set(k, { wedge: "air_purifier", link_id: id, clicks: 1 });
    }
    if (row.whole_house_water_retailer_link_id) {
      const id = row.whole_house_water_retailer_link_id;
      const k = `whole_house_water:${id}`;
      const prev = linkMap.get(k);
      if (prev) prev.clicks += 1;
      else linkMap.set(k, { wedge: "whole_house_water", link_id: id, clicks: 1 });
    }
    if (row.vacuum_retailer_link_id) {
      const id = row.vacuum_retailer_link_id;
      const k = `vacuum:${id}`;
      const prev = linkMap.get(k);
      if (prev) prev.clicks += 1;
      else linkMap.set(k, { wedge: "vacuum", link_id: id, clicks: 1 });
    }
    if (row.humidifier_retailer_link_id) {
      const id = row.humidifier_retailer_link_id;
      const k = `humidifier:${id}`;
      const prev = linkMap.get(k);
      if (prev) prev.clicks += 1;
      else linkMap.set(k, { wedge: "humidifier", link_id: id, clicks: 1 });
    }
    if (row.appliance_air_retailer_link_id) {
      const id = row.appliance_air_retailer_link_id;
      const k = `appliance_air:${id}`;
      const prev = linkMap.get(k);
      if (prev) prev.clicks += 1;
      else linkMap.set(k, { wedge: "appliance_air", link_id: id, clicks: 1 });
    }
  }

  const top_retailer_slugs_30d = Array.from(retailerMap.entries())
    .map(([retailer_slug, clicks]) => ({ retailer_slug, clicks }))
    .sort((a, b) => b.clicks - a.clicks || a.retailer_slug.localeCompare(b.retailer_slug))
    .slice(0, 8);

  const top_page_attribution_30d = Array.from(pageMap.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);

  const top_wedge_link_ids_30d = Array.from(linkMap.values())
    .sort((a, b) => b.clicks - a.clicks || a.link_id.localeCompare(b.link_id))
    .slice(0, 8);

  return { top_retailer_slugs_30d, top_page_attribution_30d, top_wedge_link_ids_30d };
}

function emptyWedge(): ClickVisibilitySnapshot["clicks_by_wedge_30d"] {
  return {
    refrigerator_water: "UNKNOWN",
    air_purifier: "UNKNOWN",
    whole_house_water: "UNKNOWN",
    vacuum: "UNKNOWN",
    humidifier: "UNKNOWN",
    appliance_air: "UNKNOWN",
    other_or_legacy: "UNKNOWN",
  };
}

function unknownQualityBlock(): Pick<
  ClickVisibilitySnapshot,
  | "raw_last_7_days_clicks"
  | "raw_last_30_days_clicks"
  | "human_likely_last_7_days_clicks"
  | "human_likely_last_30_days_clicks"
  | "excluded_last_30_days_clicks"
  | "excluded_by_category_30d"
  | "newest_click_at"
  | "oldest_click_at_in_30d_window"
  | "click_freshness_status"
  | "click_freshness_reason"
> {
  const u = "UNKNOWN" as const;
  return {
    raw_last_7_days_clicks: u,
    raw_last_30_days_clicks: u,
    human_likely_last_7_days_clicks: u,
    human_likely_last_30_days_clicks: u,
    excluded_last_30_days_clicks: u,
    excluded_by_category_30d: "UNKNOWN",
    newest_click_at: u,
    oldest_click_at_in_30d_window: u,
    click_freshness_status: "UNKNOWN",
    click_freshness_reason: "click_events quality metrics unavailable for this snapshot.",
  };
}

const COMMISSION_NOT_CONNECTED =
  "No in-repo commission, order, or payout API is attached. Raw click_events counts are not revenue and do not imply buyer intent.";

const CLICK_QUALITY_NOTES =
  "Human-likely counts use a conservative user_agent heuristic (browser-like strings excluding known bots, internal BuckPartsAudit, and curl/node); they are not verified human shoppers.";

/** When `SUPABASE_SERVICE_ROLE_KEY` is missing or any click query throws (same contract as other import scripts). */
export function unavailableClickSnapshot(errors: string[]): ClickVisibilitySnapshot {
  return unknownSnapshot("UNKNOWN_DB_UNAVAILABLE", errors);
}

function unknownSnapshot(
  status: ClickVisibilitySnapshot["runtime_status"],
  notes: string[],
): ClickVisibilitySnapshot {
  return {
    runtime_status: status,
    generated_at: new Date(0).toISOString(),
    window_days: { short: 7, long: 30 },
    last_7_days_clicks: "UNKNOWN",
    last_30_days_clicks: "UNKNOWN",
    ...unknownQualityBlock(),
    clicks_by_wedge_30d: emptyWedge(),
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes: COMMISSION_NOT_CONNECTED,
    click_quality_notes: CLICK_QUALITY_NOTES,
    aggregation_notes: notes.length > 0 ? notes : undefined,
  };
}

async function headCount(
  supabase: SupabaseClient,
  sinceIso: string,
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from("click_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) return { count: 0, error: new Error(error.message) };
  return { count: count ?? 0, error: null };
}

async function fetchAllClickRowsIn30d(
  supabase: SupabaseClient,
  last30Iso: string,
): Promise<{ rows: ClickEventReadRow[]; error: Error | null }> {
  const rows: ClickEventReadRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("click_events")
      .select(SELECT_READ_COLUMNS)
      .gte("created_at", last30Iso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { rows, error: new Error(error.message) };
    const chunk = (data ?? []) as unknown as ClickEventReadRow[];
    if (chunk.length === 0) break;
    rows.push(...chunk);
    from += chunk.length;
  }
  return { rows, error: null };
}

export async function queryBuckpartsClickEventsSnapshot(
  supabase: SupabaseClient,
  nowMs: number,
): Promise<ClickVisibilitySnapshot> {
  const last7 = new Date(nowMs - 7 * 86400000).toISOString();
  const last30 = new Date(nowMs - 30 * 86400000).toISOString();

  const [c7, c30] = await Promise.all([headCount(supabase, last7), headCount(supabase, last30)]);

  if (c7.error || c30.error) {
    return unknownSnapshot("UNKNOWN_DB_UNAVAILABLE", [
      c7.error?.message ?? "",
      c30.error?.message ?? "",
    ].filter(Boolean));
  }

  const raw7 = c7.count;
  const raw30 = c30.count;

  const [
    rv,
    ap,
    wh,
    vac,
    hum,
    aa,
  ] = await Promise.all([
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("filter_id", "is", null)
      .is("air_purifier_retailer_link_id", null)
      .is("whole_house_water_retailer_link_id", null)
      .is("vacuum_retailer_link_id", null)
      .is("humidifier_retailer_link_id", null)
      .is("appliance_air_retailer_link_id", null),
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("air_purifier_retailer_link_id", "is", null),
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("whole_house_water_retailer_link_id", "is", null),
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("vacuum_retailer_link_id", "is", null),
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("humidifier_retailer_link_id", "is", null),
    supabase
      .from("click_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", last30)
      .not("appliance_air_retailer_link_id", "is", null),
  ]);

  const wedgeErrors = [rv.error, ap.error, wh.error, vac.error, hum.error, aa.error].filter(Boolean) as {
    message: string;
  }[];

  if (wedgeErrors.length > 0) {
    return {
      runtime_status: "UNKNOWN_SCHEMA",
      generated_at: new Date(nowMs).toISOString(),
      window_days: { short: 7, long: 30 },
      ...unknownQualityBlock(),
      last_7_days_clicks: raw7,
      last_30_days_clicks: raw30,
      raw_last_7_days_clicks: raw7,
      raw_last_30_days_clicks: raw30,
      clicks_by_wedge_30d: emptyWedge(),
      commission_or_revenue: "NOT_CONNECTED",
      commission_or_revenue_notes: COMMISSION_NOT_CONNECTED,
      click_quality_notes: CLICK_QUALITY_NOTES,
      aggregation_notes: wedgeErrors.map((e) => e.message),
    };
  }

  const wedgeCounts = {
    refrigerator_water: rv.count ?? 0,
    air_purifier: ap.count ?? 0,
    whole_house_water: wh.count ?? 0,
    vacuum: vac.count ?? 0,
    humidifier: hum.count ?? 0,
    appliance_air: aa.count ?? 0,
  };

  const sumWedges =
    wedgeCounts.refrigerator_water +
    wedgeCounts.air_purifier +
    wedgeCounts.whole_house_water +
    wedgeCounts.vacuum +
    wedgeCounts.humidifier +
    wedgeCounts.appliance_air;
  const other_or_legacy = Math.max(0, raw30 - sumWedges);

  const { rows: allRows, error: fetchErr } = await fetchAllClickRowsIn30d(supabase, last30);
  if (fetchErr) {
    return {
      runtime_status: "UNKNOWN_SCHEMA",
      generated_at: new Date(nowMs).toISOString(),
      window_days: { short: 7, long: 30 },
      ...unknownQualityBlock(),
      last_7_days_clicks: raw7,
      last_30_days_clicks: raw30,
      raw_last_7_days_clicks: raw7,
      raw_last_30_days_clicks: raw30,
      clicks_by_wedge_30d: { ...wedgeCounts, other_or_legacy },
      commission_or_revenue: "NOT_CONNECTED",
      commission_or_revenue_notes: COMMISSION_NOT_CONNECTED,
      click_quality_notes: CLICK_QUALITY_NOTES,
      aggregation_notes: [fetchErr.message],
    };
  }

  const quality = computeClickQualityFromRows(allRows, { last7Iso: last7, raw7, raw30 });

  const rowsForTopLists = allRows.length > MAX_ROWS_FOR_TOP_LISTS ? allRows.slice(0, MAX_ROWS_FOR_TOP_LISTS) : allRows;
  const tops = aggregateClickRowsForTopLists(rowsForTopLists);

  const notes: string[] = [];
  if (raw30 > allRows.length) {
    notes.push(
      `Fetched ${allRows.length} click_events rows in the 30d window but head count reported raw_last_30_days_clicks=${raw30}; quality metrics may be incomplete.`,
    );
  }
  if (raw30 > MAX_ROWS_FOR_TOP_LISTS) {
    notes.push(
      `Top retailer/page/link lists use only the first ${MAX_ROWS_FOR_TOP_LISTS} rows (oldest-first); total window clicks=${raw30}.`,
    );
  }

  return {
    runtime_status: "OK",
    generated_at: new Date(nowMs).toISOString(),
    window_days: { short: 7, long: 30 },
    last_7_days_clicks: raw7,
    last_30_days_clicks: raw30,
    raw_last_7_days_clicks: raw7,
    raw_last_30_days_clicks: raw30,
    human_likely_last_7_days_clicks: quality.human_likely_last_7_days_clicks,
    human_likely_last_30_days_clicks: quality.human_likely_last_30_days_clicks,
    excluded_last_30_days_clicks: quality.excluded_last_30_days_clicks,
    excluded_by_category_30d: quality.excluded_by_category_30d,
    top_user_agent_families_30d: quality.top_user_agent_families_30d,
    newest_click_at: quality.newest_click_at,
    oldest_click_at_in_30d_window: quality.oldest_click_at_in_30d_window,
    click_freshness_status: quality.click_freshness_status,
    click_freshness_reason: quality.click_freshness_reason,
    click_quality_notes: CLICK_QUALITY_NOTES,
    clicks_by_wedge_30d: { ...wedgeCounts, other_or_legacy },
    ...tops,
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes: COMMISSION_NOT_CONNECTED,
    aggregation_notes: notes.length > 0 ? notes : undefined,
  };
}

export function clickSnapshotForTests(overrides: Partial<ClickVisibilitySnapshot> = {}): ClickVisibilitySnapshot {
  const base: ClickVisibilitySnapshot = {
    runtime_status: "OK",
    generated_at: "2026-05-01T00:00:00.000Z",
    window_days: { short: 7, long: 30 },
    last_7_days_clicks: 1,
    last_30_days_clicks: 10,
    raw_last_7_days_clicks: 1,
    raw_last_30_days_clicks: 10,
    human_likely_last_7_days_clicks: 1,
    human_likely_last_30_days_clicks: 3,
    excluded_last_30_days_clicks: 7,
    excluded_by_category_30d: { KNOWN_BOT: 5, INTERNAL_AUDIT: 2 },
    top_user_agent_families_30d: [
      { user_agent: "Mozilla/5.0 (bot)", clicks: 5, category: "KNOWN_BOT" },
      { user_agent: "Mozilla/5.0 BuckPartsAudit/1.0", clicks: 2, category: "INTERNAL_AUDIT" },
    ],
    newest_click_at: "2026-05-01T12:00:00.000Z",
    oldest_click_at_in_30d_window: "2026-04-25T00:00:00.000Z",
    click_freshness_status: "OK",
    click_freshness_reason: "Fixture: newest within 7d window.",
    click_quality_notes: CLICK_QUALITY_NOTES,
    clicks_by_wedge_30d: {
      refrigerator_water: 8,
      air_purifier: 1,
      whole_house_water: 1,
      vacuum: 0,
      humidifier: 0,
      appliance_air: 0,
      other_or_legacy: 0,
    },
    top_retailer_slugs_30d: [{ retailer_slug: "amazon", clicks: 5 }],
    top_page_attribution_30d: [{ page_type: "refrigerator_filter", page_slug: "lt1000p", clicks: 5 }],
    top_wedge_link_ids_30d: [{ wedge: "air_purifier", link_id: "00000000-0000-4000-8000-000000000001", clicks: 1 }],
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes: COMMISSION_NOT_CONNECTED,
  };
  return { ...base, ...overrides };
}
