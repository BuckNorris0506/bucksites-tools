import path from "node:path";

import {
  HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER,
  type HomekeepMonetizationWedgeCatalog,
} from "@/lib/catalog/identity";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { loadEnv } from "./lib/load-env";
import { categoryDataCsvPath, dataCsvPath, readCsvFile, type CsvRow } from "./lib/csv";
import { getSupabaseAdmin } from "./lib/supabase-admin";

loadEnv();

type PriorityTier = "TIER 1" | "TIER 2" | "TIER 3" | "TIER 4";

type FilterCoverage = {
  wedge: HomekeepMonetizationWedgeCatalog;
  filter_slug: string;
  oem_part_number: string;
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
  tier: PriorityTier;
};

type WedgeConfig = {
  wedge: HomekeepMonetizationWedgeCatalog;
  filterTable: string;
  retailerLinksTable: string;
  filterFk: string;
  dataDir: string | null;
  hasStatus: boolean;
};

const WEDGE_CONFIG: Record<HomekeepMonetizationWedgeCatalog, WedgeConfig> = {
  refrigerator_water: {
    wedge: "refrigerator_water",
    filterTable: "filters",
    retailerLinksTable: "retailer_links",
    filterFk: "filter_id",
    dataDir: null,
    hasStatus: false,
  },
  whole_house_water: {
    wedge: "whole_house_water",
    filterTable: "whole_house_water_parts",
    retailerLinksTable: "whole_house_water_retailer_links",
    filterFk: "whole_house_water_part_id",
    dataDir: "whole-house-water",
    hasStatus: true,
  },
  air_purifier: {
    wedge: "air_purifier",
    filterTable: "air_purifier_filters",
    retailerLinksTable: "air_purifier_retailer_links",
    filterFk: "air_purifier_filter_id",
    dataDir: "air-purifier",
    hasStatus: true,
  },
};

const TIER_ORDER: Record<PriorityTier, number> = {
  "TIER 1": 1,
  "TIER 2": 2,
  "TIER 3": 3,
  "TIER 4": 4,
};

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function parseCsvBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function computeTier(c: {
  number_of_valid_links: number;
  number_of_direct_buyable_links: number;
  has_primary_amazon: boolean;
}): PriorityTier {
  if (c.number_of_direct_buyable_links === 0) return "TIER 1";
  if (c.number_of_direct_buyable_links === 1) return "TIER 2";
  if (c.number_of_valid_links >= 2 && !c.has_primary_amazon) return "TIER 3";
  return "TIER 4";
}

function sortCoverageRows(rows: FilterCoverage[]): FilterCoverage[] {
  const wedgeOrder = new Map(HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER.map((w, i) => [w, i]));
  return [...rows].sort((a, b) => {
    const tierDelta = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (tierDelta !== 0) return tierDelta;
    const wedgeDelta = (wedgeOrder.get(a.wedge) ?? 99) - (wedgeOrder.get(b.wedge) ?? 99);
    if (wedgeDelta !== 0) return wedgeDelta;
    const directDelta = a.number_of_direct_buyable_links - b.number_of_direct_buyable_links;
    if (directDelta !== 0) return directDelta;
    const validDelta = a.number_of_valid_links - b.number_of_valid_links;
    if (validDelta !== 0) return validDelta;
    return a.filter_slug.localeCompare(b.filter_slug);
  });
}

function fromCsv(cwd: string): FilterCoverage[] {
  const rows: FilterCoverage[] = [];
  for (const wedge of HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER) {
    const cfg = WEDGE_CONFIG[wedge];
    const filterFile =
      cfg.dataDir === null
        ? dataCsvPath(cwd, "filters", false)
        : categoryDataCsvPath(cwd, cfg.dataDir, "filters", false);
    const linksFile =
      cfg.dataDir === null
        ? dataCsvPath(cwd, "retailer_links", false)
        : categoryDataCsvPath(cwd, cfg.dataDir, "retailer_links", false);

    const filters = readCsvFile(filterFile, ["slug", "oem_part_number"]);
    const links = readCsvFile(linksFile, ["filter_slug", "affiliate_url"]);

    const linksByFilter = new Map<string, CsvRow[]>();
    for (const l of links) {
      const k = l.filter_slug.trim();
      if (!linksByFilter.has(k)) linksByFilter.set(k, []);
      linksByFilter.get(k)!.push(l);
    }

    for (const f of filters) {
      const filter_slug = f.slug.trim();
      const entries = linksByFilter.get(filter_slug) ?? [];
      let valid = 0;
      let direct = 0;
      let hasPrimaryAmazon = false;
      for (const e of entries) {
        const gate = buyLinkGateFailureKind({
          retailer_key: e.retailer_key,
          affiliate_url: e.affiliate_url,
          browser_truth_classification: e.browser_truth_classification,
        });
        if (gate !== null) continue;
        valid += 1;
        if ((e.browser_truth_classification ?? "").trim() === "direct_buyable") direct += 1;
        if ((e.retailer_key ?? "").trim().toLowerCase() === "amazon" && parseCsvBool(e.is_primary)) {
          hasPrimaryAmazon = true;
        }
      }
      const tier = computeTier({
        number_of_valid_links: valid,
        number_of_direct_buyable_links: direct,
        has_primary_amazon: hasPrimaryAmazon,
      });
      rows.push({
        wedge,
        filter_slug,
        oem_part_number: f.oem_part_number.trim(),
        number_of_valid_links: valid,
        number_of_direct_buyable_links: direct,
        has_primary_amazon: hasPrimaryAmazon,
        tier,
      });
    }
  }
  return rows;
}

async function fromDb(): Promise<FilterCoverage[]> {
  const supabase = getSupabaseAdmin();
  const rows: FilterCoverage[] = [];

  for (const wedge of HOMEKEEP_MONETIZATION_WEDGE_CATALOG_ORDER) {
    const cfg = WEDGE_CONFIG[wedge];
    const { data: filters, error: fErr } = await supabase
      .from(cfg.filterTable)
      .select("id, slug, oem_part_number");
    if (fErr) throw fErr;

    const { data: rawLinks, error: lErr } = await supabase
      .from(cfg.retailerLinksTable)
      .select(
        `${cfg.filterFk}, retailer_key, affiliate_url, is_primary, browser_truth_classification${cfg.hasStatus ? ", status" : ""}`,
      );
    if (lErr) throw lErr;

    const linksByFilterId = new Map<string, Array<Record<string, unknown>>>();
    for (const row of (rawLinks ?? []) as Array<Record<string, unknown>>) {
      if (cfg.hasStatus && String(row.status ?? "") !== "approved") continue;
      const filterId = String(row[cfg.filterFk] ?? "");
      if (!linksByFilterId.has(filterId)) linksByFilterId.set(filterId, []);
      linksByFilterId.get(filterId)!.push(row);
    }

    for (const f of (filters ?? []) as Array<Record<string, unknown>>) {
      const filterId = String(f.id ?? "");
      const entries = linksByFilterId.get(filterId) ?? [];
      let valid = 0;
      let direct = 0;
      let hasPrimaryAmazon = false;
      for (const e of entries) {
        const retailerKey = String(e.retailer_key ?? "");
        const affiliateUrl = String(e.affiliate_url ?? "");
        const classification = (e.browser_truth_classification as string | null | undefined) ?? null;
        const gate = buyLinkGateFailureKind({
          retailer_key: retailerKey,
          affiliate_url: affiliateUrl,
          browser_truth_classification: classification,
        });
        if (gate !== null) continue;
        valid += 1;
        if ((classification ?? "").trim() === "direct_buyable") direct += 1;
        if (retailerKey.trim().toLowerCase() === "amazon" && Boolean(e.is_primary)) {
          hasPrimaryAmazon = true;
        }
      }
      const tier = computeTier({
        number_of_valid_links: valid,
        number_of_direct_buyable_links: direct,
        has_primary_amazon: hasPrimaryAmazon,
      });
      rows.push({
        wedge,
        filter_slug: String(f.slug ?? ""),
        oem_part_number: String(f.oem_part_number ?? ""),
        number_of_valid_links: valid,
        number_of_direct_buyable_links: direct,
        has_primary_amazon: hasPrimaryAmazon,
        tier,
      });
    }
  }
  return rows;
}

async function main() {
  const sourceArg = (argValue("--source") ?? "auto").toLowerCase();
  const cwd = process.cwd();

  let sourceUsed: "db" | "csv";
  let allRows: FilterCoverage[];
  if (sourceArg === "db") {
    sourceUsed = "db";
    allRows = await fromDb();
  } else if (sourceArg === "csv") {
    sourceUsed = "csv";
    allRows = fromCsv(cwd);
  } else {
    try {
      allRows = await fromDb();
      sourceUsed = "db";
    } catch {
      allRows = fromCsv(cwd);
      sourceUsed = "csv";
    }
  }

  const prioritized = sortCoverageRows(allRows).filter((r) => r.tier !== "TIER 4");
  const next_batch = prioritized.slice(0, 10);
  const tierCounts = next_batch.reduce(
    (acc, row) => {
      acc[row.tier] += 1;
      return acc;
    },
    { "TIER 1": 0, "TIER 2": 0, "TIER 3": 0, "TIER 4": 0 } as Record<PriorityTier, number>,
  );
  const wedges = [...new Set(next_batch.map((r) => r.wedge))];

  const output = {
    next_batch,
    reasoning: `Selected top ${next_batch.length} filters from ${sourceUsed} truth with tier-first ordering (TIER1>TIER2>TIER3), grouped by wedge order (${wedges.join(", ")}). Tier counts: TIER 1=${tierCounts["TIER 1"]}, TIER 2=${tierCounts["TIER 2"]}, TIER 3=${tierCounts["TIER 3"]}.`,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[prioritize-coverage-next-batch] FAILED: ${message}`);
  process.exitCode = 1;
});
