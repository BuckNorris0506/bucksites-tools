import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { HOMEKEEP_WEDGE_CATALOG, isHomekeepWedgeCatalog } from "@/lib/catalog/identity";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

type MonetizationWedge =
  | typeof HOMEKEEP_WEDGE_CATALOG.refrigerator_water
  | typeof HOMEKEEP_WEDGE_CATALOG.air_purifier
  | typeof HOMEKEEP_WEDGE_CATALOG.whole_house_water;

type WedgeCfg = {
  filtersTable: string;
  compatTable: string;
  retailerLinksTable: string;
  retailerFilterFk: string;
  retailerLinksApprovedOnly: boolean;
};

const WEDGE_CFG: Record<MonetizationWedge, WedgeCfg> = {
  [HOMEKEEP_WEDGE_CATALOG.refrigerator_water]: {
    filtersTable: "filters",
    compatTable: "compatibility_mappings",
    retailerLinksTable: "retailer_links",
    retailerFilterFk: "filter_id",
    retailerLinksApprovedOnly: false,
  },
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: {
    filtersTable: "air_purifier_filters",
    compatTable: "air_purifier_compatibility_mappings",
    retailerLinksTable: "air_purifier_retailer_links",
    retailerFilterFk: "air_purifier_filter_id",
    retailerLinksApprovedOnly: true,
  },
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: {
    filtersTable: "whole_house_water_parts",
    compatTable: "whole_house_water_compatibility_mappings",
    retailerLinksTable: "whole_house_water_retailer_links",
    retailerFilterFk: "whole_house_water_part_id",
    retailerLinksApprovedOnly: true,
  },
};

const PAGE = 2000;

type Args = {
  wedge: MonetizationWedge;
  family: string;
  limit: number;
  runId: string;
  slugInclude: Set<string>;
  slugExclude: Set<string>;
};

type FilterMeta = {
  id: string;
  slug: string;
  oem_part_number: string;
  brand_slug: string | null;
  brand_name: string | null;
};

type PlannedQueueRow = {
  run_id: string;
  wedge: MonetizationWedge;
  filter_slug: string;
  expected_tokens: string[];
  candidate_state_planned: "candidate_found";
};

type Ledger = {
  run_id: string;
  wedge: MonetizationWedge;
  family: string;
  dry_run: true;
  attempted_slugs: string[];
  planned_queue_rows: PlannedQueueRow[];
  skipped_slugs: Array<{ filter_slug: string; reason: string }>;
  blocked_reason: string | null;
};

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

export function expectedTokensFromSlug(filterSlug: string): string[] {
  const parts = filterSlug.trim().split("-").filter(Boolean);
  if (parts.length <= 1) return [];
  return [parts.slice(1).join("-").toUpperCase()];
}

function normalizeFamily(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function matchesFamily(meta: FilterMeta, family: string): boolean {
  const fam = normalizeFamily(family);
  if (!fam) return false;
  const brand = normalizeFamily(meta.brand_slug ?? meta.brand_name ?? "");
  if (brand === fam) return true;
  const oem = normalizeFamily(meta.oem_part_number);
  if (oem.includes(fam)) return true;
  const slug = normalizeFamily(meta.slug);
  return slug.includes(fam);
}

export function buildPlannedQueueRows(args: {
  runId: string;
  wedge: MonetizationWedge;
  selectedSlugs: string[];
}): PlannedQueueRow[] {
  return args.selectedSlugs.map((slug) => ({
    run_id: args.runId,
    wedge: args.wedge,
    filter_slug: slug,
    expected_tokens: expectedTokensFromSlug(slug),
    candidate_state_planned: "candidate_found",
  }));
}

function parseArgs(): Args {
  const wedgeRaw = argValue("--wedge");
  const family = argValue("--family")?.trim() ?? "";
  const limitRaw = argValue("--limit");
  const runId = argValue("--run-id")?.trim() ?? "";
  const slugInclude = new Set(
    (argValue("--slug-include") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const slugExclude = new Set(
    (argValue("--slug-exclude") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (!wedgeRaw) throw new Error("Missing required --wedge");
  if (!isHomekeepWedgeCatalog(wedgeRaw)) throw new Error(`Invalid --wedge "${wedgeRaw}"`);
  if (!(wedgeRaw in WEDGE_CFG)) {
    throw new Error(`Unsupported --wedge "${wedgeRaw}" for v0 (use refrigerator_water|air_purifier|whole_house_water)`);
  }
  if (!family) throw new Error("Missing required --family");
  if (!limitRaw) throw new Error("Missing required --limit");
  const limit = Number.parseInt(limitRaw, 10);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("Invalid --limit (must be > 0)");
  if (!runId) throw new Error("Missing required --run-id");
  return { wedge: wedgeRaw as MonetizationWedge, family, limit, runId, slugInclude, slugExclude };
}

type FilteringResult = {
  selected: FilterMeta[];
  skipped: Array<{ filter_slug: string; reason: string }>;
};

export function applySlugIncludeExclude(args: {
  eligible: FilterMeta[];
  limit: number;
  slugInclude: Set<string>;
  slugExclude: Set<string>;
}): FilteringResult {
  const eligibleBySlug = new Map(args.eligible.map((m) => [m.slug, m]));
  const skipped: Array<{ filter_slug: string; reason: string }> = [];

  for (const slug of args.slugInclude) {
    if (!eligibleBySlug.has(slug)) {
      skipped.push({ filter_slug: slug, reason: "included_but_not_eligible" });
    }
  }

  const base = args.slugInclude.size > 0
    ? args.eligible.filter((m) => args.slugInclude.has(m.slug))
    : [...args.eligible];

  const afterExclude: FilterMeta[] = [];
  for (const m of base) {
    if (args.slugExclude.has(m.slug)) {
      skipped.push({ filter_slug: m.slug, reason: "excluded_by_operator" });
      continue;
    }
    afterExclude.push(m);
  }

  const selected = afterExclude.slice(0, args.limit);
  for (const m of afterExclude.slice(args.limit)) {
    skipped.push({ filter_slug: m.slug, reason: `over_limit_${args.limit}` });
  }

  return { selected, skipped };
}

async function validateSchemaContract(wedge: MonetizationWedge): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const cfg = WEDGE_CFG[wedge];
  const checks: Array<{ table: string; select: string }> = [
    { table: cfg.filtersTable, select: "id,slug,oem_part_number,brand_id" },
    { table: cfg.compatTable, select: cfg.retailerFilterFk },
    {
      table: cfg.retailerLinksTable,
      select: `${cfg.retailerFilterFk},retailer_key,affiliate_url,browser_truth_classification${cfg.retailerLinksApprovedOnly ? ",status" : ""}`,
    },
    {
      table: "retailer_offer_candidates",
      select:
        "id,wedge,retailer_key,offer_url,source_kind,validation_status,candidate_state,token_required",
    },
  ];
  const failures: string[] = [];
  for (const c of checks) {
    const { error } = await supabase.from(c.table).select(c.select).limit(1);
    if (error) failures.push(`${c.table}: ${error.message}`);
  }
  return failures;
}

async function loadFilterMeta(wedge: MonetizationWedge): Promise<Map<string, FilterMeta>> {
  const supabase = getSupabaseAdmin();
  const cfg = WEDGE_CFG[wedge];
  const byId = new Map<string, FilterMeta>();
  const brandIdByFilterId = new Map<string, string>();
  const brandIds = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(cfg.filtersTable)
      .select("id,slug,oem_part_number,brand_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const id = String(row.id ?? "");
      if (!id) continue;
      byId.set(id, {
        id,
        slug: String(row.slug ?? ""),
        oem_part_number: String(row.oem_part_number ?? ""),
        brand_slug: null,
        brand_name: null,
      });
      const brandId = String(row.brand_id ?? "");
      if (brandId) {
        brandIdByFilterId.set(id, brandId);
        brandIds.add(brandId);
      }
    }
    if (chunk.length < PAGE) break;
  }
  const brandMeta = new Map<string, { slug: string | null; name: string | null }>();
  const ids = [...brandIds];
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100);
    const { data, error } = await supabase.from("brands").select("id,slug,name").in("id", slice);
    if (error) throw error;
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const id = String(row.id ?? "");
      brandMeta.set(id, {
        slug: typeof row.slug === "string" ? row.slug : null,
        name: typeof row.name === "string" ? row.name : null,
      });
    }
  }
  for (const [fid, bid] of brandIdByFilterId.entries()) {
    const meta = byId.get(fid);
    const b = brandMeta.get(bid);
    if (!meta || !b) continue;
    meta.brand_slug = b.slug;
    meta.brand_name = b.name;
  }
  return byId;
}

async function loadDiscoverableIds(wedge: MonetizationWedge): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const cfg = WEDGE_CFG[wedge];
  const out = new Set<string>();
  for (const table of [cfg.compatTable, cfg.retailerLinksTable]) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select(cfg.retailerFilterFk)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as Array<Record<string, unknown>>;
      for (const row of chunk) {
        const id = String(row[cfg.retailerFilterFk] ?? "");
        if (id) out.add(id);
      }
      if (chunk.length < PAGE) break;
    }
  }
  return out;
}

async function loadValidCtaIds(wedge: MonetizationWedge): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const cfg = WEDGE_CFG[wedge];
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from(cfg.retailerLinksTable)
      .select(`${cfg.retailerFilterFk},retailer_key,affiliate_url,browser_truth_classification${cfg.retailerLinksApprovedOnly ? ",status" : ""}`)
      .range(from, from + PAGE - 1);
    if (cfg.retailerLinksApprovedOnly) q = q.eq("status", "approved");
    const { data, error } = await q;
    if (error) throw error;
    const chunk = (data ?? []) as Array<Record<string, unknown>>;
    for (const row of chunk) {
      const filterId = String(row[cfg.retailerFilterFk] ?? "");
      if (!filterId) continue;
      const gate = buyLinkGateFailureKind({
        retailer_key: String(row.retailer_key ?? ""),
        affiliate_url: String(row.affiliate_url ?? ""),
        browser_truth_classification:
          (row.browser_truth_classification as string | null | undefined) ?? null,
      });
      if (gate === null) out.add(filterId);
    }
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const blocked: string[] = [];
  const failures = await validateSchemaContract(args.wedge);
  if (failures.length > 0) {
    const payload: Ledger = {
      run_id: args.runId,
      wedge: args.wedge,
      family: args.family,
      dry_run: true,
      attempted_slugs: [],
      planned_queue_rows: [],
      skipped_slugs: [],
      blocked_reason: `schema_contract_invalid: ${failures.join(" | ")}`,
    };
    console.log(JSON.stringify(payload, null, 2));
    process.exitCode = 1;
    return;
  }

  const [metaById, discoverableIds, validCtaIds] = await Promise.all([
    loadFilterMeta(args.wedge),
    loadDiscoverableIds(args.wedge),
    loadValidCtaIds(args.wedge),
  ]);

  const familyCandidates = [...discoverableIds]
    .map((id) => metaById.get(id))
    .filter((m): m is FilterMeta => Boolean(m))
    .filter((m) => matchesFamily(m, args.family));

  const zeroCta = familyCandidates.filter((m) => !validCtaIds.has(m.id));
  const filtered = applySlugIncludeExclude({
    eligible: zeroCta,
    limit: args.limit,
    slugInclude: args.slugInclude,
    slugExclude: args.slugExclude,
  });
  const selected = filtered.selected;
  const skipped = [...filtered.skipped];
  const noToken = selected.filter((m) => expectedTokensFromSlug(m.slug).length === 0);
  for (const m of noToken) {
    skipped.push({ filter_slug: m.slug, reason: "missing_expected_token_from_slug" });
  }
  const selectedWithToken = selected.filter((m) => expectedTokensFromSlug(m.slug).length > 0);
  if (familyCandidates.length === 0) blocked.push(`no_discoverable_slugs_for_family:${args.family}`);
  if (selectedWithToken.length === 0) blocked.push("no_zero_cta_candidates_selected");

  const plannedRows = buildPlannedQueueRows({
    runId: args.runId,
    wedge: args.wedge,
    selectedSlugs: selectedWithToken.map((m) => m.slug),
  });

  const payload: Ledger = {
    run_id: args.runId,
    wedge: args.wedge,
    family: args.family,
    dry_run: true,
    attempted_slugs: selectedWithToken.map((m) => m.slug),
    planned_queue_rows: plannedRows,
    skipped_slugs: skipped,
    blocked_reason: blocked.length > 0 ? blocked.join(" | ") : null,
  };
  console.log(JSON.stringify(payload, null, 2));
}

if (process.argv[1]?.endsWith("run-amazon-monetization-batch.ts")) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[run-amazon-monetization-batch] FAILED: ${message}`);
    process.exitCode = 1;
  });
}
