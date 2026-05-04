/**
 * Read-only aggregates over `public.click_events` for Command Center v2 / owner dashboard.
 * Column set matches `scripts/report-homekeep-affiliate-clicks.ts` plus wedge FK columns from migrations.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClickVisibilitySnapshot } from "./buckparts-command-center-v2-types";

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
    clicks_by_wedge_30d: emptyWedge(),
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes:
      "No in-repo commission or payout feed is wired; this snapshot is outbound click visibility only.",
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
      last_7_days_clicks: c7.count,
      last_30_days_clicks: c30.count,
      clicks_by_wedge_30d: emptyWedge(),
      commission_or_revenue: "NOT_CONNECTED",
      commission_or_revenue_notes:
        "No in-repo commission or payout feed is wired; wedge breakdown failed (column or RLS mismatch).",
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
  const other_or_legacy = Math.max(0, c30.count - sumWedges);

  const aggRows: ClickEventAggRow[] = [];
  let from = 0;
  while (aggRows.length < MAX_ROWS_FOR_TOP_LISTS) {
    const take = Math.min(PAGE, MAX_ROWS_FOR_TOP_LISTS - aggRows.length);
    const { data, error } = await supabase
      .from("click_events")
      .select(SELECT_AGG_COLUMNS)
      .gte("created_at", last30)
      .order("created_at", { ascending: true })
      .range(from, from + take - 1);
    if (error) {
      return {
        runtime_status: "UNKNOWN_SCHEMA",
        generated_at: new Date(nowMs).toISOString(),
        window_days: { short: 7, long: 30 },
        last_7_days_clicks: c7.count,
        last_30_days_clicks: c30.count,
        clicks_by_wedge_30d: { ...wedgeCounts, other_or_legacy },
        commission_or_revenue: "NOT_CONNECTED",
        commission_or_revenue_notes:
          "No in-repo commission or payout feed is wired; top-list scan failed against click_events projection.",
        aggregation_notes: [error.message],
      };
    }
    const chunk = (data ?? []) as unknown as ClickEventAggRow[];
    aggRows.push(...chunk);
    if (chunk.length === 0) break;
    from += chunk.length;
  }

  const tops = aggregateClickRowsForTopLists(aggRows);
  const notes: string[] = [];
  if (c30.count > aggRows.length) {
    notes.push(
      `Top retailer/page/link lists computed from first ${aggRows.length} rows in the 30d window (oldest-first scan); total window clicks=${c30.count}.`,
    );
  }

  return {
    runtime_status: "OK",
    generated_at: new Date(nowMs).toISOString(),
    window_days: { short: 7, long: 30 },
    last_7_days_clicks: c7.count,
    last_30_days_clicks: c30.count,
    clicks_by_wedge_30d: { ...wedgeCounts, other_or_legacy },
    ...tops,
    commission_or_revenue: "NOT_CONNECTED",
    commission_or_revenue_notes:
      "No in-repo commission, order, or payout API is attached; treat outbound clicks as operational visibility only.",
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
    commission_or_revenue_notes: "test fixture",
  };
  return { ...base, ...overrides };
}
