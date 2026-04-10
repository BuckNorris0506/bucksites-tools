/**
 * Read-only affiliate click report for refrigerator_water, air_purifier, whole_house_water.
 * Matches live `click_events` schema:
 * - Fridge: filter_id + retailer_slug + page_type/page_slug (no retailer_link_id)
 * - AP: air_purifier_retailer_link_id
 * - WH: whole_house_water_retailer_link_id
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (+ Supabase URL). JSON to stdout only.
 */
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const PAGE = 2500;

type Wedge = "refrigerator_water" | "air_purifier" | "whole_house_water";

type FridgeLinkMeta = {
  wedge: "refrigerator_water";
  linkId: string;
  filterId: string;
  retailerKey: string;
  retailerName: string | null;
  partSlug: string;
  oemPartNumber: string;
};

type WedgeLinkMeta = {
  wedge: "air_purifier" | "whole_house_water";
  linkId: string;
  retailerKey: string;
  retailerName: string | null;
  partSlug: string;
  oemPartNumber: string;
};

type EnrichedClick = {
  wedge: Wedge;
  retailerKey: string;
  partSlug: string;
  oemPartNumber: string;
  /** AP/WH only; fridge legacy rows have no link id on the event */
  linkId: string | null;
  referrerHost: string;
  day: string;
};

function parseSinceDays(): number {
  const idx = process.argv.indexOf("--since-days");
  if (idx === -1) return 30;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function referrerHost(ref: string | null): string {
  if (!ref || !ref.trim()) return "(none)";
  try {
    return new URL(ref).hostname || "(invalid)";
  } catch {
    return "(unparseable)";
  }
}

function dayUtc(iso: string): string {
  return iso.slice(0, 10);
}

function fridgeComposite(filterId: string, retailerSlug: string): string {
  return `${filterId}::${retailerSlug.trim()}`;
}

async function loadFridgeLinks(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<FridgeLinkMeta[]> {
  const list: FridgeLinkMeta[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("retailer_links")
      .select("id, retailer_key, retailer_name, filter_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    const filterIds = Array.from(
      new Set(
        chunk
          .map((r) => (r as { filter_id?: string }).filter_id)
          .filter((x): x is string => typeof x === "string"),
      ),
    );
    const filterRows = new Map<string, { slug: string; oem_part_number: string }>();
    for (let i = 0; i < filterIds.length; i += 100) {
      const slice = filterIds.slice(i, i + 100);
      if (slice.length === 0) continue;
      const { data: frows, error: fErr } = await supabase
        .from("filters")
        .select("id, slug, oem_part_number")
        .in("id", slice);
      if (fErr) throw fErr;
      for (const f of frows ?? []) {
        const row = f as { id: string; slug: string; oem_part_number: string };
        filterRows.set(row.id, { slug: row.slug, oem_part_number: row.oem_part_number });
      }
    }
    for (const r of chunk) {
      const row = r as {
        id: string;
        retailer_key: string;
        retailer_name: string | null;
        filter_id: string;
      };
      const f = filterRows.get(row.filter_id);
      if (!f) continue;
      list.push({
        wedge: "refrigerator_water",
        linkId: row.id,
        filterId: row.filter_id,
        retailerKey: row.retailer_key,
        retailerName: row.retailer_name,
        partSlug: f.slug,
        oemPartNumber: f.oem_part_number,
      });
    }
    if (chunk.length < PAGE) break;
  }
  return list;
}

async function loadApLinks(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<WedgeLinkMeta[]> {
  const list: WedgeLinkMeta[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("air_purifier_retailer_links")
      .select("id, retailer_key, retailer_name, air_purifier_filter_id")
      .eq("status", "approved")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    const partIds = Array.from(
      new Set(
        chunk
          .map((r) => (r as { air_purifier_filter_id?: string }).air_purifier_filter_id)
          .filter((x): x is string => typeof x === "string"),
      ),
    );
    const partRows = new Map<string, { slug: string; oem_part_number: string }>();
    for (let i = 0; i < partIds.length; i += 100) {
      const slice = partIds.slice(i, i + 100);
      if (slice.length === 0) continue;
      const { data: prows, error: pErr } = await supabase
        .from("air_purifier_filters")
        .select("id, slug, oem_part_number")
        .in("id", slice);
      if (pErr) throw pErr;
      for (const p of prows ?? []) {
        const row = p as { id: string; slug: string; oem_part_number: string };
        partRows.set(row.id, { slug: row.slug, oem_part_number: row.oem_part_number });
      }
    }
    for (const r of chunk) {
      const row = r as {
        id: string;
        retailer_key: string;
        retailer_name: string | null;
        air_purifier_filter_id: string;
      };
      const p = partRows.get(row.air_purifier_filter_id);
      if (!p) continue;
      list.push({
        wedge: "air_purifier",
        linkId: row.id,
        retailerKey: row.retailer_key,
        retailerName: row.retailer_name,
        partSlug: p.slug,
        oemPartNumber: p.oem_part_number,
      });
    }
    if (chunk.length < PAGE) break;
  }
  return list;
}

async function loadWhLinks(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<WedgeLinkMeta[]> {
  const list: WedgeLinkMeta[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("whole_house_water_retailer_links")
      .select("id, retailer_key, retailer_name, whole_house_water_part_id")
      .eq("status", "approved")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    const partIds = Array.from(
      new Set(
        chunk
          .map((r) => (r as { whole_house_water_part_id?: string }).whole_house_water_part_id)
          .filter((x): x is string => typeof x === "string"),
      ),
    );
    const partRows = new Map<string, { slug: string; oem_part_number: string }>();
    for (let i = 0; i < partIds.length; i += 100) {
      const slice = partIds.slice(i, i + 100);
      if (slice.length === 0) continue;
      const { data: prows, error: pErr } = await supabase
        .from("whole_house_water_parts")
        .select("id, slug, oem_part_number")
        .in("id", slice);
      if (pErr) throw pErr;
      for (const p of prows ?? []) {
        const row = p as { id: string; slug: string; oem_part_number: string };
        partRows.set(row.id, { slug: row.slug, oem_part_number: row.oem_part_number });
      }
    }
    for (const r of chunk) {
      const row = r as {
        id: string;
        retailer_key: string;
        retailer_name: string | null;
        whole_house_water_part_id: string;
      };
      const p = partRows.get(row.whole_house_water_part_id);
      if (!p) continue;
      list.push({
        wedge: "whole_house_water",
        linkId: row.id,
        retailerKey: row.retailer_key,
        retailerName: row.retailer_name,
        partSlug: p.slug,
        oemPartNumber: p.oem_part_number,
      });
    }
    if (chunk.length < PAGE) break;
  }
  return list;
}

type ClickEventRow = {
  filter_id: string | null;
  retailer_slug: string | null;
  page_type: string | null;
  page_slug: string | null;
  referrer: string | null;
  created_at: string;
  air_purifier_retailer_link_id: string | null;
  whole_house_water_retailer_link_id: string | null;
};

async function main() {
  loadEnv();
  const sinceDays = parseSinceDays();
  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const supabase = getSupabaseAdmin();

  const [fridgeLinks, apLinks, whLinks] = await Promise.all([
    loadFridgeLinks(supabase),
    loadApLinks(supabase),
    loadWhLinks(supabase),
  ]);

  const apByLinkId = new Map(apLinks.map((m) => [m.linkId, m]));
  const whByLinkId = new Map(whLinks.map((m) => [m.linkId, m]));

  const rawRows: ClickEventRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("click_events")
      .select(
        "filter_id, retailer_slug, page_type, page_slug, referrer, created_at, air_purifier_retailer_link_id, whole_house_water_retailer_link_id",
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as ClickEventRow[];
    rawRows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const fridgeFilterIds = new Set<string>();
  for (const row of rawRows) {
    if (
      row.air_purifier_retailer_link_id ||
      row.whole_house_water_retailer_link_id ||
      !row.filter_id
    ) {
      continue;
    }
    fridgeFilterIds.add(row.filter_id);
  }

  const filterById = new Map<string, { slug: string; oem_part_number: string }>();
  const idList = Array.from(fridgeFilterIds);
  for (let i = 0; i < idList.length; i += 100) {
    const slice = idList.slice(i, i + 100);
    if (slice.length === 0) continue;
    const { data: frows, error: fErr } = await supabase
      .from("filters")
      .select("id, slug, oem_part_number")
      .in("id", slice);
    if (fErr) throw fErr;
    for (const f of frows ?? []) {
      const row = f as { id: string; slug: string; oem_part_number: string };
      filterById.set(row.id, { slug: row.slug, oem_part_number: row.oem_part_number });
    }
  }

  const enriched: EnrichedClick[] = [];
  const fridgeCompositesHit = new Set<string>();
  const apLinkIdsHit = new Set<string>();
  const whLinkIdsHit = new Set<string>();

  for (const row of rawRows) {
    if (row.air_purifier_retailer_link_id) {
      const id = row.air_purifier_retailer_link_id;
      const m = apByLinkId.get(id);
      enriched.push({
        wedge: "air_purifier",
        retailerKey: m?.retailerKey ?? "(unknown_link)",
        partSlug: m?.partSlug ?? "(unknown_link)",
        oemPartNumber: m?.oemPartNumber ?? "(unknown_link)",
        linkId: id,
        referrerHost: referrerHost(row.referrer),
        day: dayUtc(row.created_at),
      });
      apLinkIdsHit.add(id);
      continue;
    }
    if (row.whole_house_water_retailer_link_id) {
      const id = row.whole_house_water_retailer_link_id;
      const m = whByLinkId.get(id);
      enriched.push({
        wedge: "whole_house_water",
        retailerKey: m?.retailerKey ?? "(unknown_link)",
        partSlug: m?.partSlug ?? "(unknown_link)",
        oemPartNumber: m?.oemPartNumber ?? "(unknown_link)",
        linkId: id,
        referrerHost: referrerHost(row.referrer),
        day: dayUtc(row.created_at),
      });
      whLinkIdsHit.add(id);
      continue;
    }
    if (row.filter_id) {
      const slug = filterById.get(row.filter_id)?.slug ?? row.page_slug ?? "(unknown_filter)";
      const oem =
        filterById.get(row.filter_id)?.oem_part_number ?? "(unknown_filter)";
      const rslug = row.retailer_slug?.trim() || "(unknown_retailer)";
      enriched.push({
        wedge: "refrigerator_water",
        retailerKey: rslug,
        partSlug: slug,
        oemPartNumber: oem,
        linkId: null,
        referrerHost: referrerHost(row.referrer),
        day: dayUtc(row.created_at),
      });
      fridgeCompositesHit.add(fridgeComposite(row.filter_id, rslug));
    }
  }

  const byWedge: Record<Wedge, number> = {
    refrigerator_water: 0,
    air_purifier: 0,
    whole_house_water: 0,
  };
  const byDay = new Map<string, number>();
  const byRetailer = new Map<string, { wedge: Wedge; retailerKey: string; clicks: number }>();
  const byPart = new Map<
    string,
    { wedge: Wedge; partSlug: string; oemPartNumber: string; clicks: number }
  >();
  const byReferrer = new Map<string, number>();

  for (const c of enriched) {
    byWedge[c.wedge] += 1;
    byDay.set(c.day, (byDay.get(c.day) ?? 0) + 1);
    const rk = `${c.wedge}::${c.retailerKey}`;
    const rprev = byRetailer.get(rk) ?? {
      wedge: c.wedge,
      retailerKey: c.retailerKey,
      clicks: 0,
    };
    rprev.clicks += 1;
    byRetailer.set(rk, rprev);
    const pk = `${c.wedge}::${c.partSlug}`;
    const pprev = byPart.get(pk) ?? {
      wedge: c.wedge,
      partSlug: c.partSlug,
      oemPartNumber: c.oemPartNumber,
      clicks: 0,
    };
    pprev.clicks += 1;
    byPart.set(pk, pprev);
    byReferrer.set(c.referrerHost, (byReferrer.get(c.referrerHost) ?? 0) + 1);
  }

  const zeroFridge = fridgeLinks.filter(
    (L) => !fridgeCompositesHit.has(fridgeComposite(L.filterId, L.retailerKey)),
  );
  const zeroAp = apLinks.filter((L) => !apLinkIdsHit.has(L.linkId));
  const zeroWh = whLinks.filter((L) => !whLinkIdsHit.has(L.linkId));

  const zeroSorted = [...zeroFridge, ...zeroAp, ...zeroWh].sort((a, b) => {
    const w = a.wedge.localeCompare(b.wedge);
    if (w !== 0) return w;
    return a.oemPartNumber.localeCompare(b.oemPartNumber);
  });

  const byDaySorted = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, n]) => ({ day, clicks: n }));

  const byRetailerSorted = [...byRetailer.values()].sort((a, b) => b.clicks - a.clicks);

  const byPartSorted = [...byPart.values()].sort((a, b) => b.clicks - a.clicks);

  const byReferrerSorted = [...byReferrer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([referrer_host, n]) => ({ referrer_host, clicks: n }));

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    scope: {
      wedges: ["refrigerator_water", "air_purifier", "whole_house_water"] as const,
      since_days: sinceDays,
      since_iso: sinceIso,
      schema_note:
        "Fridge: click_events.filter_id + retailer_slug (+ page_type/page_slug on write). AP/WH: wedge retailer_link_id FKs. No retailer_link_id column.",
    },
    summary: {
      raw_click_events_in_window: rawRows.length,
      clicks_attributed_in_scope: enriched.length,
      clicks_by_wedge: byWedge,
      live_retailer_links_indexed: fridgeLinks.length + apLinks.length + whLinks.length,
      live_links_with_zero_clicks_in_window: zeroSorted.length,
    },
    clicks_by_day: byDaySorted,
    clicks_by_retailer_key: byRetailerSorted,
    clicks_by_filter_part: byPartSorted,
    top_referrer_hosts: byReferrerSorted,
    retailer_links_with_zero_clicks_in_window: zeroSorted.map((m) =>
      m.wedge === "refrigerator_water"
        ? {
            wedge: m.wedge,
            retailer_link_id: m.linkId,
            filter_id: m.filterId,
            retailer_key: m.retailerKey,
            retailer_name: m.retailerName,
            part_slug: m.partSlug,
            oem_part_number: m.oemPartNumber,
          }
        : {
            wedge: m.wedge,
            link_id: m.linkId,
            retailer_key: m.retailerKey,
            retailer_name: m.retailerName,
            part_slug: m.partSlug,
            oem_part_number: m.oemPartNumber,
          },
    ),
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("[report-homekeep-affiliate-clicks] failed", e);
  process.exit(1);
});
