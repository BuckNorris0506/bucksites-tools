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
import type {
  ClickVisibilitySnapshot,
  EvidenceInventoryV1,
} from "./buckparts-command-center-v2-types";

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
  /** When null, click_signal is UNKNOWN for all rows. */
  human_likely_clicks_by_filter_slug: Map<string, number> | null;
  /** Required to distinguish absent vs UNKNOWN for click_signal when human_likely_clicks map is set. */
  click_visibility_runtime_status: ClickVisibilitySnapshot["runtime_status"] | null;
  /** When null, demand_signal is UNKNOWN for all rows (true=present, false=absent when map is set). */
  demand_present_by_filter_slug: Map<string, boolean> | null;
  sample_row_cap?: number;
};

const REFRIGERATOR_WATER_SEARCH_GAPS_CATALOG = "refrigerator_water" as const;
const ACTIONABLE_SEARCH_GAP_STATUSES = ["open", "reviewing", "queued"] as const;

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

function normalizeExactDemandQueryKey(value: string): string {
  return value.trim().toLowerCase();
}

export function parseFilterAliasesCsv(csvText: string): Map<string, string> {
  const rows = parseSimpleCsv(csvText);
  const map = new Map<string, string>();
  if (rows.length < 2) return map;
  const header = rows[0]!.map((h) => h.trim());
  const slugIdx = header.indexOf("filter_slug");
  const aliasIdx = header.indexOf("alias");
  if (slugIdx < 0 || aliasIdx < 0) return map;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const filter_slug = (r[slugIdx] ?? "").trim().toLowerCase();
    const alias = (r[aliasIdx] ?? "").trim().toLowerCase();
    if (!filter_slug || !alias) continue;
    map.set(alias, filter_slug);
  }
  return map;
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

function deriveClickSignal(args: {
  filter_slug: string;
  human_likely_clicks_by_filter_slug: Map<string, number> | null;
  click_visibility_runtime_status: ClickVisibilitySnapshot["runtime_status"] | null;
}): PagePublishabilityTruthRowV1["click_signal"] {
  if (
    args.human_likely_clicks_by_filter_slug === null ||
    args.click_visibility_runtime_status !== "OK"
  ) {
    return "UNKNOWN";
  }
  const count = args.human_likely_clicks_by_filter_slug.get(args.filter_slug) ?? 0;
  return count > 0 ? "present" : "absent";
}

function deriveDemandSignal(
  filter_slug: string,
  demand_present_by_filter_slug: Map<string, boolean> | null,
): PagePublishabilityTruthRowV1["demand_signal"] {
  if (demand_present_by_filter_slug === null) return "UNKNOWN";
  return demand_present_by_filter_slug.get(filter_slug) === true ? "present" : "absent";
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
  human_likely_clicks_by_filter_slug: Map<string, number> | null;
  click_visibility_runtime_status: ClickVisibilitySnapshot["runtime_status"] | null;
  demand_present_by_filter_slug: Map<string, boolean> | null;
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

  const click_signal = deriveClickSignal({
    filter_slug: slug,
    human_likely_clicks_by_filter_slug: args.human_likely_clicks_by_filter_slug,
    click_visibility_runtime_status: args.click_visibility_runtime_status,
  });
  const demand_signal = deriveDemandSignal(slug, args.demand_present_by_filter_slug);

  if (args.human_likely_clicks_by_filter_slug !== null && args.click_visibility_runtime_status === "OK") {
    const humanLikelyClicks = args.human_likely_clicks_by_filter_slug.get(slug) ?? 0;
    proven_facts.push(
      `click_signal: ${click_signal} (${humanLikelyClicks} human-likely refrigerator_filter click_events in 30d window for page_slug=${slug}; operational visibility only, not revenue or buyer proof).`,
    );
  } else if (args.human_likely_clicks_by_filter_slug === null) {
    unknown_facts.push("Per-page click_signal join (click_events 30d rows) was not supplied.");
  } else {
    unknown_facts.push(
      `click_visibility runtime_status=${args.click_visibility_runtime_status ?? "UNKNOWN"}; per-page click_signal is UNKNOWN.`,
    );
  }

  if (args.demand_present_by_filter_slug !== null) {
    proven_facts.push(
      `demand_signal: ${demand_signal} (exact normalized_query match on search_gaps catalog=${REFRIGERATOR_WATER_SEARCH_GAPS_CATALOG} for OEM token or filter_aliases.csv alias; search demand only, not fit or buy proof).`,
    );
  } else {
    unknown_facts.push("Per-page demand_signal join (search_gaps exact match) was not supplied.");
  }

  const isIndexableBool =
    indexable === "UNKNOWN" ? null : indexable === true;
  const validCtaCount = typeof cta.safe_cta_link_count === "number" ? cta.safe_cta_link_count : null;
  const buyerPathState = cta.buyer_path_state === "UNKNOWN" ? null : cta.buyer_path_state;
  const hasDemandSignal =
    demand_signal === "present" ? true : demand_signal === "absent" ? false : null;

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
          hasDemandSignal,
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
    demand_signal,
    click_signal,
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
      human_likely_clicks_by_filter_slug: args.human_likely_clicks_by_filter_slug,
      click_visibility_runtime_status: args.click_visibility_runtime_status,
      demand_present_by_filter_slug: args.demand_present_by_filter_slug,
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
    `Click join supplied=${args.human_likely_clicks_by_filter_slug !== null && args.click_visibility_runtime_status === "OK"}.`,
    `Demand join supplied=${args.demand_present_by_filter_slug !== null}.`,
    `Quarantine via compatibility_mappings.csv + fridge model review overrides.`,
    "v1.1 never emits auto_fix_allowed.",
    "click_signal uses human-likely click_events for page_type=refrigerator_filter + page_slug only; not revenue or conversion proof.",
    "demand_signal uses exact normalized_query match on search_gaps (refrigerator_water) plus data/filter_aliases.csv; no fuzzy matching.",
  ];

  const unknown_facts = [
    args.cta_join_by_filter_slug === null
      ? "All pages missing proven CTA join; cta.safe_cta_link_count is UNKNOWN."
      : "CTA join uses read-only retailer_links.filter_id grouped to filters.slug.",
    args.human_likely_clicks_by_filter_slug === null || args.click_visibility_runtime_status !== "OK"
      ? "Per-page click_signal remains UNKNOWN when click_events 30d join or click_visibility runtime is unavailable."
      : "Per-page click_signal is joined from the same click_events 30d fetch as revenue_snapshot.click_visibility.",
    args.demand_present_by_filter_slug === null
      ? "Per-page demand_signal remains UNKNOWN when search_gaps read fails."
      : "Per-page demand_signal is joined via exact OEM/alias match on actionable search_gaps only.",
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

type SearchGapDemandRow = {
  normalized_query: string;
  search_count: number;
};

/** Read-only exact-match demand join: OEM token or filter_aliases.csv alias → filter_slug. */
export async function tryLoadRefrigeratorFilterDemandPresentBySlugV1(args: {
  catalog_rows: RefrigeratorFilterCatalogRowV1[];
  alias_to_filter_slug: Map<string, string>;
}): Promise<Map<string, boolean> | null> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    const present = new Map<string, boolean>();
    const slugQueryKeys = new Map<string, Set<string>>();
    for (const catalog of args.catalog_rows) {
      present.set(catalog.filter_slug, false);
      const keys = new Set<string>();
      keys.add(normalizeExactDemandQueryKey(catalog.oem_token));
      Array.from(args.alias_to_filter_slug.entries()).forEach(([alias, slug]) => {
        if (slug === catalog.filter_slug) keys.add(normalizeExactDemandQueryKey(alias));
      });
      slugQueryKeys.set(catalog.filter_slug, keys);
    }

    for (let from = 0; ; from += SUPABASE_PAGE) {
      const { data, error } = await supabase
        .from("search_gaps")
        .select("normalized_query, search_count")
        .eq("catalog", REFRIGERATOR_WATER_SEARCH_GAPS_CATALOG)
        .in("status", [...ACTIONABLE_SEARCH_GAP_STATUSES])
        .range(from, from + SUPABASE_PAGE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as SearchGapDemandRow[];
      for (const gap of chunk) {
        if (gap.search_count <= 0) continue;
        const nq = normalizeExactDemandQueryKey(gap.normalized_query);
        Array.from(slugQueryKeys.keys()).forEach((filterSlug) => {
          const keys = slugQueryKeys.get(filterSlug);
          if (keys?.has(nq)) present.set(filterSlug, true);
        });
      }
      if (chunk.length < SUPABASE_PAGE) break;
    }

    return present;
  } catch {
    return null;
  }
}
