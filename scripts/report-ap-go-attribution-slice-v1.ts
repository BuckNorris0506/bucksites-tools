/**
 * Read-only AP `/go` attribution slice: groups air_purifier click_events by
 * page_type, page_slug, filter_slug (via link join), and retailer link id.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (+ Supabase URL). JSON to stdout only.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const PAGE = 2500;

type ClickRow = {
  page_type: string | null;
  page_slug: string | null;
  created_at: string;
  air_purifier_retailer_link_id: string | null;
};

type ApLinkMeta = {
  linkId: string;
  filterSlug: string;
  retailerKey: string;
};

type GroupKey = string;

type AttributionGroup = {
  page_type: string | null;
  page_slug: string | null;
  filter_slug: string;
  air_purifier_retailer_link_id: string;
  retailer_key: string;
  clicks: number;
};

function parseSinceDays(): number {
  const idx = process.argv.indexOf("--since-days");
  if (idx === -1) return 30;
  const n = Number.parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function groupKey(row: {
  page_type: string | null;
  page_slug: string | null;
  filter_slug: string;
  air_purifier_retailer_link_id: string;
}): GroupKey {
  return [
    row.page_type ?? "(null)",
    row.page_slug ?? "(null)",
    row.filter_slug,
    row.air_purifier_retailer_link_id,
  ].join("::");
}

async function verifyClickEventsAttributionColumns(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ supported: boolean; error_message: string | null }> {
  const { error } = await supabase.from("click_events").select("page_type, page_slug").limit(1);
  return { supported: !error, error_message: error?.message ?? null };
}

async function loadApLinkMeta(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<ApLinkMeta[]> {
  const list: ApLinkMeta[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("air_purifier_retailer_links")
      .select("id, retailer_key, air_purifier_filter_id")
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
    const partRows = new Map<string, string>();
    for (let i = 0; i < partIds.length; i += 100) {
      const slice = partIds.slice(i, i + 100);
      if (slice.length === 0) continue;
      const { data: prows, error: pErr } = await supabase
        .from("air_purifier_filters")
        .select("id, slug")
        .in("id", slice);
      if (pErr) throw pErr;
      for (const p of prows ?? []) {
        const row = p as { id: string; slug: string };
        partRows.set(row.id, row.slug);
      }
    }
    for (const r of chunk) {
      const row = r as {
        id: string;
        retailer_key: string;
        air_purifier_filter_id?: string;
      };
      list.push({
        linkId: row.id,
        retailerKey: row.retailer_key,
        filterSlug: partRows.get(row.air_purifier_filter_id ?? "") ?? "(unknown_filter)",
      });
    }
    if (chunk.length < PAGE) break;
  }
  return list;
}

export function buildApGoAttributionGroups(
  clicks: ClickRow[],
  linkMetaById: Map<string, ApLinkMeta>,
): AttributionGroup[] {
  const groups = new Map<GroupKey, AttributionGroup>();
  for (const row of clicks) {
    const linkId = row.air_purifier_retailer_link_id;
    if (!linkId) continue;
    const meta = linkMetaById.get(linkId);
    const filterSlug = meta?.filterSlug ?? "(unknown_filter)";
    const retailerKey = meta?.retailerKey ?? "(unknown_retailer)";
    const key = groupKey({
      page_type: row.page_type,
      page_slug: row.page_slug,
      filter_slug: filterSlug,
      air_purifier_retailer_link_id: linkId,
    });
    const prev = groups.get(key) ?? {
      page_type: row.page_type,
      page_slug: row.page_slug,
      filter_slug: filterSlug,
      air_purifier_retailer_link_id: linkId,
      retailer_key: retailerKey,
      clicks: 0,
    };
    prev.clicks += 1;
    groups.set(key, prev);
  }
  return [...groups.values()].sort((a, b) => b.clicks - a.clicks || groupKey(a).localeCompare(groupKey(b)));
}

async function main() {
  loadEnv();
  const sinceDays = parseSinceDays();
  const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const supabase = getSupabaseAdmin();

  const schema = await verifyClickEventsAttributionColumns(supabase);
  const apLinks = await loadApLinkMeta(supabase);
  const linkMetaById = new Map(apLinks.map((m) => [m.linkId, m]));

  const rawRows: ClickRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("click_events")
      .select("page_type, page_slug, created_at, air_purifier_retailer_link_id")
      .gte("created_at", sinceIso)
      .not("air_purifier_retailer_link_id", "is", null)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as ClickRow[];
    rawRows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const groups = buildApGoAttributionGroups(rawRows, linkMetaById);
  const withAttribution = rawRows.filter((r) => r.page_type && r.page_slug).length;
  const withoutAttribution = rawRows.length - withAttribution;

  const payload = {
    generated_at: new Date().toISOString(),
    read_only: true,
    scope: {
      wedge: "air_purifier",
      since_days: sinceDays,
      since_iso: sinceIso,
    },
    schema: {
      click_events_page_type_page_slug: schema.supported ? "PROVEN" : "UNKNOWN",
      error_message: schema.error_message,
    },
    summary: {
      ap_go_clicks_in_window: rawRows.length,
      clicks_with_page_attribution: withAttribution,
      clicks_without_page_attribution: withoutAttribution,
      distinct_attribution_groups: groups.length,
    },
    clicks_by_attribution: groups,
  };

  console.log(JSON.stringify(payload, null, 2));
}

const executedDirectly =
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (executedDirectly) {
  main().catch((e) => {
    console.error("[report-ap-go-attribution-slice-v1] failed", e);
    process.exit(1);
  });
}
