import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

const PAGE = 2000;
const TOP_LIMIT = 10;

type FilterRow = {
  id: string;
  slug: string | null;
  oem_part_number: string | null;
};

type CompatRow = {
  filter_id: string | null;
};

type RetailerLinkRow = {
  filter_id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  is_primary: boolean | null;
};

type CtaStatus = "ZERO_CTA" | "WEAK_CTA_NO_DIRECT" | "WEAK_CTA_NO_PRIMARY_AMAZON" | "STRONG";

type ReadinessRow = {
  filter_id: string;
  slug: string;
  oem_part_number: string;
  demand_compat_rows: number;
  cta_status: Exclude<CtaStatus, "STRONG">;
  valid_links: number;
  direct_buyable_links: number;
  has_primary_amazon: boolean;
  ready_for_insert: {
    table: "retailer_links";
    fields: string[];
    slot_template: {
      filter_id: string;
      retailer_key: "flexoffers-pending";
      retailer_name: "FlexOffers::<retailer>";
      affiliate_url: "PENDING_APPROVAL_DO_NOT_INSERT";
      is_primary: false;
      browser_truth_classification: null;
      source: "flexoffers_prepared_slot";
    };
  };
};

type FlexoffersReadinessReport = {
  report_name: "buckparts_flexoffers_readiness_refrigerator_water_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  selection_rule: string;
  targets: ReadinessRow[];
  normalized_retailer_key_mapping_slots: Array<{
    candidate: string;
    normalized_key: string;
  }>;
};

function classifyCtaStatus(args: {
  validLinks: number;
  directBuyableLinks: number;
  hasPrimaryAmazon: boolean;
}): CtaStatus {
  if (args.validLinks === 0) return "ZERO_CTA";
  if (args.directBuyableLinks === 0) return "WEAK_CTA_NO_DIRECT";
  if (args.directBuyableLinks === 1 && !args.hasPrimaryAmazon) {
    return "WEAK_CTA_NO_PRIMARY_AMAZON";
  }
  return "STRONG";
}

async function fetchFilters(): Promise<FilterRow[]> {
  const supabase = getSupabaseAdmin();
  const out: FilterRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("filters")
      .select("id,slug,oem_part_number")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as FilterRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function fetchCompatRows(): Promise<CompatRow[]> {
  const supabase = getSupabaseAdmin();
  const out: CompatRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("compatibility_mappings")
      .select("filter_id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as CompatRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function fetchRetailerLinks(): Promise<RetailerLinkRow[]> {
  const supabase = getSupabaseAdmin();
  const out: RetailerLinkRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("retailer_links")
      .select("filter_id,retailer_key,affiliate_url,browser_truth_classification,is_primary")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as RetailerLinkRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

export async function buildFlexoffersReadinessReport(): Promise<FlexoffersReadinessReport> {
  loadEnv();
  const [filters, compatRows, links] = await Promise.all([
    fetchFilters(),
    fetchCompatRows(),
    fetchRetailerLinks(),
  ]);

  const compatCountByFilterId = new Map<string, number>();
  for (const row of compatRows) {
    if (!row.filter_id) continue;
    compatCountByFilterId.set(
      row.filter_id,
      (compatCountByFilterId.get(row.filter_id) ?? 0) + 1,
    );
  }

  const linksByFilterId = new Map<string, RetailerLinkRow[]>();
  for (const row of links) {
    if (!row.filter_id) continue;
    const existing = linksByFilterId.get(row.filter_id);
    if (existing) existing.push(row);
    else linksByFilterId.set(row.filter_id, [row]);
  }

  const candidates: ReadinessRow[] = [];
  for (const filter of filters) {
    if (!filter.id || !filter.slug) continue;
    const filterLinks = linksByFilterId.get(filter.id) ?? [];

    let validLinks = 0;
    let directBuyableLinks = 0;
    let hasPrimaryAmazon = false;
    for (const link of filterLinks) {
      const gateFailureKind = buyLinkGateFailureKind({
        retailer_key: link.retailer_key,
        affiliate_url: link.affiliate_url ?? "",
        browser_truth_classification: link.browser_truth_classification,
      });
      if (gateFailureKind !== null) continue;
      validLinks += 1;
      if ((link.browser_truth_classification ?? "").trim() === "direct_buyable") {
        directBuyableLinks += 1;
      }
      if (
        (link.retailer_key ?? "").trim().toLowerCase() === "amazon" &&
        Boolean(link.is_primary)
      ) {
        hasPrimaryAmazon = true;
      }
    }

    const ctaStatus = classifyCtaStatus({
      validLinks,
      directBuyableLinks,
      hasPrimaryAmazon,
    });
    if (ctaStatus === "STRONG") continue;

    candidates.push({
      filter_id: filter.id,
      slug: filter.slug,
      oem_part_number: filter.oem_part_number ?? "",
      demand_compat_rows: compatCountByFilterId.get(filter.id) ?? 0,
      cta_status: ctaStatus,
      valid_links: validLinks,
      direct_buyable_links: directBuyableLinks,
      has_primary_amazon: hasPrimaryAmazon,
      ready_for_insert: {
        table: "retailer_links",
        fields: [
          "filter_id",
          "retailer_key",
          "retailer_name",
          "affiliate_url",
          "is_primary",
          "browser_truth_classification",
          "source",
        ],
        slot_template: {
          filter_id: filter.id,
          retailer_key: "flexoffers-pending",
          retailer_name: "FlexOffers::<retailer>",
          affiliate_url: "PENDING_APPROVAL_DO_NOT_INSERT",
          is_primary: false,
          browser_truth_classification: null,
          source: "flexoffers_prepared_slot",
        },
      },
    });
  }

  candidates.sort((a, b) => {
    return (
      b.demand_compat_rows - a.demand_compat_rows ||
      a.valid_links - b.valid_links ||
      a.slug.localeCompare(b.slug)
    );
  });

  return {
    report_name: "buckparts_flexoffers_readiness_refrigerator_water_v1",
    generated_at: new Date().toISOString(),
    read_only: true,
    data_mutation: false,
    selection_rule:
      "Top refrigerator-water filter slugs by compatibility-mapping demand where CTA is ZERO_CTA or WEAK_*.",
    targets: candidates.slice(0, TOP_LIMIT),
    normalized_retailer_key_mapping_slots: [
      { candidate: "appliancepartspros", normalized_key: "appliancepartspros" },
      { candidate: "repairclinic", normalized_key: "repairclinic" },
      { candidate: "partselect", normalized_key: "partselect" },
      { candidate: "filtersfast", normalized_key: "filtersfast" },
      { candidate: "discountfilters", normalized_key: "discountfilters" },
      { candidate: "flexoffers::<retailer>", normalized_key: "flexoffers-pending" },
    ],
  };
}

async function main(): Promise<void> {
  const report = await buildFlexoffersReadinessReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[report-flexoffers-readiness-fridge] failed", error);
  process.exit(1);
});
