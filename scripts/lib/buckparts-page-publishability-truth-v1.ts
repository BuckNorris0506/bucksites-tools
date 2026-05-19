/**
 * Read-only refrigerator filter page publishability truth for Command Center (Cruise diagnostics).
 * No I/O in pure build path — callers supply parsed catalog + optional join maps.
 */

import { PAGE_STATES, classifyPageState, type PageState } from "@/lib/page-state/page-state";
import {
  PUBLISHABILITY_STATES,
  classifyPublishabilityState,
  type PublishabilityState,
} from "@/lib/page-state/publishability-state";
import { listFridgeModelReviewOverrides } from "@/lib/fridge/fridge-model-review-overrides";
import type { EvidenceInventoryV1 } from "./buckparts-command-center-v2-types";

export const PAGE_PUBLISHABILITY_TRUTH_SUMMARY_CONTRACT_V1 = "page_publishability_truth_summary_v1" as const;

export type PagePublishabilityAutomationAllowedV1 =
  | "read_only_only"
  | "draft_allowed"
  | "auto_fix_allowed"
  | "owner_approval_required"
  | "never_auto_mutate";

export type PagePublishabilityCtaTruthV1 = {
  safe_cta_link_count: number | "UNKNOWN";
  buyer_path_state: "show_buy" | "suppress_buy" | "UNKNOWN";
  buy_allowed: "allowed" | "blocked" | "uncertain" | "owner_review_required" | "UNKNOWN";
};

export type PagePublishabilityTruthRowV1 = {
  page_key: string;
  page_kind: "refrigerator_filter";
  filter_slug: string;
  oem_token: string | null;
  exists_in_catalog: boolean;
  indexable: boolean | "UNKNOWN";
  page_state: PageState | "UNKNOWN";
  publishability_state: PublishabilityState | "UNKNOWN";
  cta: PagePublishabilityCtaTruthV1;
  demand_signal: "present" | "absent" | "UNKNOWN";
  click_signal: "present" | "absent" | "UNKNOWN";
  evidence_file_count: number;
  evidence_tokens: string[];
  quarantine: "none" | "affected_by_quarantined_model" | "UNKNOWN";
  affiliate_path: "known" | "pending" | "unknown";
  revenue_path: "connected" | "not_connected" | "UNKNOWN";
  automation_allowed: PagePublishabilityAutomationAllowedV1;
  next_safe_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type PagePublishabilityTruthSummaryV1 = {
  contract: typeof PAGE_PUBLISHABILITY_TRUTH_SUMMARY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  runtime_status: "OK" | "ATTENTION" | "UNKNOWN";
  page_kind: "refrigerator_filter";
  total_candidate_pages: number;
  computable_semantic_count: number;
  unknown_join_count: number;
  distribution_page_state: Record<string, number>;
  distribution_publishability_state: Record<string, number>;
  distribution_automation_allowed: Record<string, number>;
  top_unknown_join_reasons: string[];
  sample_rows: PagePublishabilityTruthRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type RefrigeratorFilterCatalogRowV1 = {
  filter_slug: string;
  oem_token: string;
  brand_slug: string;
};

export type RefrigeratorFilterCtaJoinV1 = {
  safe_cta_link_count: number;
  direct_buyable_link_count: number;
  mapped_model_count: number;
};

export type BuildPagePublishabilityTruthSummaryArgs = {
  generated_at: string;
  catalog_rows: RefrigeratorFilterCatalogRowV1[];
  evidence_inventory: EvidenceInventoryV1;
  /** filter_slug → models from compatibility_mappings.csv (repo file). */
  filter_slug_to_model_slugs: Map<string, string[]>;
  /** When null, indexable is UNKNOWN for all rows. */
  indexable_slugs: Set<string> | null;
  /** When null, per-page CTA counts are UNKNOWN (unknown_join_count increments). */
  cta_join_by_filter_slug: Map<string, RefrigeratorFilterCtaJoinV1> | null;
  affiliate_approval_pending: boolean;
  commission_or_revenue: "CONNECTED" | "NOT_CONNECTED" | "UNKNOWN";
  sample_row_cap?: number;
};

const SAMPLE_ROW_CAP_DEFAULT = 25 as const;

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function parseSimpleCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        fields.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

export function parseRefrigeratorFiltersCatalogCsv(csvText: string): RefrigeratorFilterCatalogRowV1[] {
  const rows = parseSimpleCsv(csvText);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim());
  const slugIdx = header.indexOf("slug");
  const oemIdx = header.indexOf("oem_part_number");
  const brandIdx = header.indexOf("brand_slug");
  if (slugIdx < 0 || oemIdx < 0 || brandIdx < 0) return [];
  const out: RefrigeratorFilterCatalogRowV1[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const filter_slug = (r[slugIdx] ?? "").trim().toLowerCase();
    const oem_token = (r[oemIdx] ?? "").trim().toUpperCase();
    const brand_slug = (r[brandIdx] ?? "").trim().toLowerCase();
    if (!filter_slug || !oem_token) continue;
    out.push({ filter_slug, oem_token, brand_slug });
  }
  return out;
}

export function parseFilterSlugToModelSlugsFromCompatibilityCsv(csvText: string): Map<string, string[]> {
  const rows = parseSimpleCsv(csvText);
  const map = new Map<string, string[]>();
  if (rows.length < 2) return map;
  const header = rows[0]!.map((h) => h.trim());
  const modelIdx = header.indexOf("fridge_slug");
  const filterIdx = header.indexOf("filter_slug");
  if (modelIdx < 0 || filterIdx < 0) return map;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const model = (r[modelIdx] ?? "").trim().toLowerCase();
    const filter = (r[filterIdx] ?? "").trim().toLowerCase();
    if (!model || !filter) continue;
    const list = map.get(filter) ?? [];
    if (!list.includes(model)) list.push(model);
    map.set(filter, list);
  }
  return map;
}

export function buildQuarantinedFilterSlugSet(args: {
  filter_slug_to_model_slugs: Map<string, string[]>;
  quarantined_model_slugs?: Set<string>;
}): Set<string> {
  const quarantinedModels =
    args.quarantined_model_slugs ??
    new Set(listFridgeModelReviewOverrides().map((o) => o.fridge_model_slug.toLowerCase()));
  const affected = new Set<string>();
  Array.from(args.filter_slug_to_model_slugs.keys()).forEach((filterSlug) => {
    const models = args.filter_slug_to_model_slugs.get(filterSlug) ?? [];
    if (models.some((m) => quarantinedModels.has(m.toLowerCase()))) {
      affected.add(filterSlug);
    }
  });
  return affected;
}

function evidenceForSlug(
  slug: string,
  oemToken: string,
  inventory: EvidenceInventoryV1,
): { evidence_file_count: number; evidence_tokens: string[] } {
  const bySlug = inventory.data_evidence.body_mapping.by_filter_slug;
  const byToken = inventory.data_evidence.body_mapping.by_token;
  const slugCount = bySlug[slug] ?? bySlug[slug.toLowerCase()] ?? 0;
  const tokenCount = byToken[oemToken] ?? byToken[oemToken.toUpperCase()] ?? 0;
  const evidence_file_count = Math.max(slugCount, tokenCount);
  const evidence_tokens: string[] = [];
  if (slugCount > 0) evidence_tokens.push(`filter_slug:${slug}`);
  if (tokenCount > 0) evidence_tokens.push(`token:${oemToken}`);
  return { evidence_file_count, evidence_tokens };
}

function deriveBuyerPathState(
  cta: RefrigeratorFilterCtaJoinV1 | null,
): "show_buy" | "suppress_buy" | "UNKNOWN" {
  if (!cta) return "UNKNOWN";
  if (cta.safe_cta_link_count > 0 && cta.mapped_model_count > 0) return "show_buy";
  if (cta.safe_cta_link_count === 0) return "suppress_buy";
  return "UNKNOWN";
}

function deriveBuyAllowed(cta: RefrigeratorFilterCtaJoinV1 | null): PagePublishabilityCtaTruthV1["buy_allowed"] {
  if (!cta) return "UNKNOWN";
  if (cta.safe_cta_link_count > 0) return "allowed";
  if (cta.mapped_model_count === 0) return "uncertain";
  return "blocked";
}

function isSemanticComputable(row: PagePublishabilityTruthRowV1): boolean {
  return row.page_state !== "UNKNOWN" && row.publishability_state !== "UNKNOWN";
}

function countUnknownJoins(row: PagePublishabilityTruthRowV1): number {
  let n = 0;
  if (row.indexable === "UNKNOWN") n += 1;
  if (row.cta.safe_cta_link_count === "UNKNOWN") n += 1;
  if (row.cta.buyer_path_state === "UNKNOWN") n += 1;
  if (row.cta.buy_allowed === "UNKNOWN") n += 1;
  if (row.demand_signal === "UNKNOWN") n += 1;
  if (row.click_signal === "UNKNOWN") n += 1;
  if (row.quarantine === "UNKNOWN") n += 1;
  return n;
}

function deriveAutomationAllowed(row: PagePublishabilityTruthRowV1): PagePublishabilityAutomationAllowedV1 {
  if (row.quarantine === "affected_by_quarantined_model") {
    return "never_auto_mutate";
  }
  if (row.publishability_state === PUBLISHABILITY_STATES.PUBLISHABLE_TRUST_GATED) {
    return "owner_approval_required";
  }
  if (row.evidence_file_count > 0 && row.cta.buy_allowed !== "allowed") {
    return "owner_approval_required";
  }
  if (countUnknownJoins(row) > 0) {
    return "read_only_only";
  }
  if (
    isSemanticComputable(row) &&
    row.page_state === PAGE_STATES.INDEXABLE_BUY_READY &&
    row.cta.buy_allowed === "allowed"
  ) {
    return "draft_allowed";
  }
  if (isSemanticComputable(row)) {
    return "read_only_only";
  }
  return "read_only_only";
}

function deriveNextSafeAction(row: PagePublishabilityTruthRowV1): string {
  if (row.quarantine === "affected_by_quarantined_model") {
    return "Resolve quarantined fridge model mapping conflict before any publish or CTA promotion for this filter page.";
  }
  if (row.cta.safe_cta_link_count === "UNKNOWN") {
    return "Establish read-only retailer_links filter_id join for this slug, then re-run Command Center page_publishability_truth_summary_v1.";
  }
  if (row.cta.buy_allowed === "allowed" && row.evidence_file_count === 0) {
    return "Run read-only browser evidence capture for this OEM token before insert or promotion work.";
  }
  if (row.publishability_state === PUBLISHABILITY_STATES.PUBLISHABLE_BUY_READY) {
    return "Page is semantically buy-ready in-repo; owner approves any retailer_links mutation separately.";
  }
  if (row.page_state === PAGE_STATES.INDEXABLE_INFO_ONLY) {
    return "Improve safe CTA coverage or compatibility mappings before treating this filter page as buy-ready.";
  }
  return "Continue read-only monitoring; no autonomous mutation on this page.";
}

export function buildPagePublishabilityTruthRowV1(args: {
  catalog: RefrigeratorFilterCatalogRowV1;
  evidence_inventory: EvidenceInventoryV1;
  filter_slug_to_model_slugs: Map<string, string[]>;
  quarantined_filter_slugs: Set<string>;
  indexable_slugs: Set<string> | null;
  cta_join_by_filter_slug: Map<string, RefrigeratorFilterCtaJoinV1> | null;
  affiliate_approval_pending: boolean;
  commission_or_revenue: "CONNECTED" | "NOT_CONNECTED" | "UNKNOWN";
}): PagePublishabilityTruthRowV1 {
  const { catalog } = args;
  const slug = catalog.filter_slug;
  const unknown_facts: string[] = [];
  const proven_facts: string[] = [
    `Catalog row exists in data/filters.csv for slug=${slug} oem=${catalog.oem_token}.`,
  ];

  const indexable: boolean | "UNKNOWN" =
    args.indexable_slugs === null
      ? "UNKNOWN"
      : args.indexable_slugs.has(slug);
  if (indexable === "UNKNOWN") {
    unknown_facts.push("Indexability join (useful filter id set) was not supplied.");
  } else {
    proven_facts.push(`Indexable via useful-filter set: ${indexable}.`);
  }

  const ctaJoin = args.cta_join_by_filter_slug?.get(slug) ?? null;
  if (!args.cta_join_by_filter_slug) {
    unknown_facts.push("Per-page CTA join (retailer_links.filter_id → filters.slug) was not supplied.");
  } else if (!ctaJoin) {
    unknown_facts.push("No retailer_links rows mapped to this filter_slug in CTA join.");
  }

  const cta: PagePublishabilityCtaTruthV1 = {
    safe_cta_link_count: ctaJoin ? ctaJoin.safe_cta_link_count : "UNKNOWN",
    buyer_path_state: deriveBuyerPathState(ctaJoin),
    buy_allowed: deriveBuyAllowed(ctaJoin),
  };

  const mappedModels = args.filter_slug_to_model_slugs.get(slug) ?? [];
  if (args.filter_slug_to_model_slugs.size === 0) {
    unknown_facts.push("compatibility_mappings.csv was empty or unparseable.");
  } else {
    proven_facts.push(`Mapped fridge model count for filter: ${mappedModels.length}.`);
  }

  const quarantine: PagePublishabilityTruthRowV1["quarantine"] =
    args.filter_slug_to_model_slugs.size === 0
      ? "UNKNOWN"
      : args.quarantined_filter_slugs.has(slug)
        ? "affected_by_quarantined_model"
        : "none";

  const { evidence_file_count, evidence_tokens } = evidenceForSlug(
    slug,
    catalog.oem_token,
    args.evidence_inventory,
  );
  if (evidence_file_count > 0) {
    proven_facts.push(`Evidence inventory references: ${evidence_tokens.join(", ")}.`);
  }

  const isIndexableBool =
    indexable === "UNKNOWN" ? null : indexable === true;
  const validCtaCount = typeof cta.safe_cta_link_count === "number" ? cta.safe_cta_link_count : null;
  const buyerPathState = cta.buyer_path_state === "UNKNOWN" ? null : cta.buyer_path_state;

  const page_state: PageState | "UNKNOWN" =
    isIndexableBool === null
      ? "UNKNOWN"
      : classifyPageState({
          isIndexable: isIndexableBool,
          validCtaCount,
          buyerPathState:
            buyerPathState === "show_buy"
              ? "show_buy"
              : buyerPathState === "suppress_buy"
                ? "suppress_buy"
                : null,
          hasDemandSignal: null,
        });

  const publishability_state: PublishabilityState | "UNKNOWN" =
    page_state === "UNKNOWN"
      ? "UNKNOWN"
      : classifyPublishabilityState({
          pageState: page_state,
          isInfoPage: page_state === PAGE_STATES.INDEXABLE_INFO_ONLY ? true : null,
          hasQualityIssue: null,
          isBlockedOrRetired: quarantine === "affected_by_quarantined_model" ? true : null,
        });

  const affiliate_path: PagePublishabilityTruthRowV1["affiliate_path"] = args.affiliate_approval_pending
    ? "pending"
    : cta.buy_allowed === "allowed"
      ? "known"
      : "unknown";

  const revenue_path: PagePublishabilityTruthRowV1["revenue_path"] =
    args.commission_or_revenue === "CONNECTED"
      ? "connected"
      : args.commission_or_revenue === "NOT_CONNECTED"
        ? "not_connected"
        : "UNKNOWN";

  const rowBase: PagePublishabilityTruthRowV1 = {
    page_key: `refrigerator_filter:${slug}`,
    page_kind: "refrigerator_filter",
    filter_slug: slug,
    oem_token: catalog.oem_token,
    exists_in_catalog: true,
    indexable,
    page_state,
    publishability_state,
    cta,
    demand_signal: "UNKNOWN",
    click_signal: "UNKNOWN",
    evidence_file_count,
    evidence_tokens,
    quarantine,
    affiliate_path,
    revenue_path,
    automation_allowed: "read_only_only",
    next_safe_action: "",
    proven_facts,
    unknown_facts,
  };

  rowBase.automation_allowed = deriveAutomationAllowed(rowBase);
  rowBase.next_safe_action = deriveNextSafeAction(rowBase);
  unknown_facts.push("Per-page demand_signal and click_signal joins are not proven in v1.");
  return rowBase;
}

export function buildPagePublishabilityTruthSummaryV1(
  args: BuildPagePublishabilityTruthSummaryArgs,
): PagePublishabilityTruthSummaryV1 {
  const cap = args.sample_row_cap ?? SAMPLE_ROW_CAP_DEFAULT;
  const quarantined_filter_slugs = buildQuarantinedFilterSlugSet({
    filter_slug_to_model_slugs: args.filter_slug_to_model_slugs,
  });

  const rows = args.catalog_rows.map((catalog) =>
    buildPagePublishabilityTruthRowV1({
      catalog,
      evidence_inventory: args.evidence_inventory,
      filter_slug_to_model_slugs: args.filter_slug_to_model_slugs,
      quarantined_filter_slugs,
      indexable_slugs: args.indexable_slugs,
      cta_join_by_filter_slug: args.cta_join_by_filter_slug,
      affiliate_approval_pending: args.affiliate_approval_pending,
      commission_or_revenue: args.commission_or_revenue,
    }),
  );

  const distribution_page_state: Record<string, number> = {};
  const distribution_publishability_state: Record<string, number> = {};
  const distribution_automation_allowed: Record<string, number> = {};
  const unknownReasonCounts = new Map<string, number>();

  let computable_semantic_count = 0;
  let unknown_join_count = 0;

  for (const row of rows) {
    bump(distribution_page_state, row.page_state);
    bump(distribution_publishability_state, row.publishability_state);
    bump(distribution_automation_allowed, row.automation_allowed);
    if (isSemanticComputable(row)) computable_semantic_count += 1;
    const u = countUnknownJoins(row);
    unknown_join_count += u;
    if (row.indexable === "UNKNOWN") {
      unknownReasonCounts.set(
        "indexable_join_missing",
        (unknownReasonCounts.get("indexable_join_missing") ?? 0) + 1,
      );
    }
    if (row.cta.safe_cta_link_count === "UNKNOWN") {
      unknownReasonCounts.set("cta_filter_slug_join_missing", (unknownReasonCounts.get("cta_filter_slug_join_missing") ?? 0) + 1);
    }
    if (row.demand_signal === "UNKNOWN") {
      unknownReasonCounts.set("per_page_demand_not_joined_v1", (unknownReasonCounts.get("per_page_demand_not_joined_v1") ?? 0) + 1);
    }
    if (row.click_signal === "UNKNOWN") {
      unknownReasonCounts.set("per_page_click_not_joined_v1", (unknownReasonCounts.get("per_page_click_not_joined_v1") ?? 0) + 1);
    }
    if (row.quarantine === "UNKNOWN") {
      unknownReasonCounts.set("quarantine_mapping_missing", (unknownReasonCounts.get("quarantine_mapping_missing") ?? 0) + 1);
    }
  }

  const top_unknown_join_reasons = Array.from(unknownReasonCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([reason, count]) => `${reason} (${count} pages)`);

  const runtime_status: PagePublishabilityTruthSummaryV1["runtime_status"] =
    rows.length === 0
      ? "UNKNOWN"
      : computable_semantic_count === 0
        ? "UNKNOWN"
        : unknown_join_count > 0
          ? "ATTENTION"
          : "OK";

  const proven_facts = [
    `page_publishability_truth_summary_v1 built at ${args.generated_at}.`,
    `Refrigerator filter catalog rows=${rows.length} from data/filters.csv.`,
    `CTA join supplied=${args.cta_join_by_filter_slug !== null}.`,
    `Indexable join supplied=${args.indexable_slugs !== null}.`,
    `Quarantine via compatibility_mappings.csv + fridge model review overrides.`,
    "v1 never emits auto_fix_allowed.",
  ];

  const unknown_facts = [
    "Per-page demand and click signals are UNKNOWN until search_gaps/click_events are joined by page key.",
    "Semantic page_state does not set hasDemandSignal (always null in classifier input).",
    args.cta_join_by_filter_slug === null
      ? "All pages missing proven CTA join; cta.safe_cta_link_count is UNKNOWN."
      : "CTA join uses read-only retailer_links.filter_id grouped to filters.slug.",
  ];

  const sample_rows = [...rows]
    .sort((a, b) => {
      const au = countUnknownJoins(b) - countUnknownJoins(a);
      if (au !== 0) return au;
      return a.filter_slug.localeCompare(b.filter_slug);
    })
    .slice(0, cap);

  return {
    contract: PAGE_PUBLISHABILITY_TRUTH_SUMMARY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    runtime_status,
    page_kind: "refrigerator_filter",
    total_candidate_pages: rows.length,
    computable_semantic_count,
    unknown_join_count,
    distribution_page_state,
    distribution_publishability_state,
    distribution_automation_allowed,
    top_unknown_join_reasons,
    sample_rows,
    proven_facts,
    unknown_facts,
  };
}

const SUPABASE_PAGE = 1000;

type RetailerLinkCtaRow = {
  filter_id: string;
  retailer_key: string | null;
  affiliate_url: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
};

/** Read-only Supabase join: useful filter slugs (compat or retailer_links). Returns null when env/DB unavailable. */
export async function tryLoadRefrigeratorUsefulFilterSlugsV1(): Promise<Set<string> | null> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const usefulIds = new Set<string>();
    for (const table of ["compatibility_mappings", "retailer_links"] as const) {
      for (let from = 0; ; from += SUPABASE_PAGE) {
        const { data, error } = await supabase
          .from(table)
          .select("filter_id")
          .range(from, from + SUPABASE_PAGE - 1);
        if (error) throw error;
        const chunk = data ?? [];
        for (const row of chunk) {
          const id = (row as { filter_id?: string }).filter_id;
          if (typeof id === "string" && id.length > 0) usefulIds.add(id);
        }
        if (chunk.length < SUPABASE_PAGE) break;
      }
    }
    if (usefulIds.size === 0) return new Set();

    const slugs = new Set<string>();
    const idArr = Array.from(usefulIds);
    for (let i = 0; i < idArr.length; i += 100) {
      const { data, error } = await supabase
        .from("filters")
        .select("slug")
        .in("id", idArr.slice(i, i + 100));
      if (error) throw error;
      for (const row of data ?? []) {
        const slug = (row as { slug?: string }).slug;
        if (typeof slug === "string" && slug.length > 0) slugs.add(slug.toLowerCase());
      }
    }
    return slugs;
  } catch {
    return null;
  }
}

/** Read-only per-slug safe CTA counts from retailer_links + filters.slug. Returns null when env/DB unavailable. */
export async function tryLoadRefrigeratorFilterCtaJoinBySlugV1(
  filterSlugToModelSlugs: Map<string, string[]>,
): Promise<Map<string, RefrigeratorFilterCtaJoinV1> | null> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    const { buyLinkGateFailureKind } = await import("@/lib/retailers/launch-buy-links");
    loadEnv();
    const supabase = getSupabaseAdmin();

    const idToSlug = new Map<string, string>();
    for (let from = 0; ; from += SUPABASE_PAGE) {
      const { data, error } = await supabase.from("filters").select("id, slug").range(from, from + SUPABASE_PAGE - 1);
      if (error) throw error;
      const chunk = data ?? [];
      for (const row of chunk) {
        const id = (row as { id?: string }).id;
        const slug = (row as { slug?: string }).slug;
        if (typeof id === "string" && typeof slug === "string" && slug.length > 0) {
          idToSlug.set(id, slug.toLowerCase());
        }
      }
      if (chunk.length < SUPABASE_PAGE) break;
    }

    const join = new Map<string, RefrigeratorFilterCtaJoinV1>();
    for (let from = 0; ; from += SUPABASE_PAGE) {
      const { data, error } = await supabase
        .from("retailer_links")
        .select(
          "filter_id, retailer_key, affiliate_url, browser_truth_classification, browser_truth_buyable_subtype",
        )
        .range(from, from + SUPABASE_PAGE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as RetailerLinkCtaRow[];
      for (const link of chunk) {
        const slug = idToSlug.get(link.filter_id);
        if (!slug) continue;
        const cur = join.get(slug) ?? {
          safe_cta_link_count: 0,
          direct_buyable_link_count: 0,
          mapped_model_count: filterSlugToModelSlugs.get(slug)?.length ?? 0,
        };
        const gate = buyLinkGateFailureKind({
          retailer_key: link.retailer_key,
          affiliate_url: link.affiliate_url ?? "",
          browser_truth_classification: link.browser_truth_classification,
          browser_truth_buyable_subtype: link.browser_truth_buyable_subtype,
        });
        if (gate === null) cur.safe_cta_link_count += 1;
        if (link.browser_truth_classification?.trim() === "direct_buyable") {
          cur.direct_buyable_link_count += 1;
        }
        join.set(slug, cur);
      }
      if (chunk.length < SUPABASE_PAGE) break;
    }

    Array.from(filterSlugToModelSlugs.keys()).forEach((slug) => {
      const models = filterSlugToModelSlugs.get(slug) ?? [];
      const cur = join.get(slug);
      if (cur) {
        cur.mapped_model_count = models.length;
      }
    });

    return join;
  } catch {
    return null;
  }
}
