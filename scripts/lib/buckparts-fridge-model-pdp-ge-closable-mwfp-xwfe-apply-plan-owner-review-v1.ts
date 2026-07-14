/**
 * Read-only founder-gated apply planning lane for the 4 GE model slugs potentially
 * closable from OWNER_BROWSER_PASS proof (MWFP + XWFE). Plans future retailer_links
 * parity/link promotion only — does not apply, promote XWF, or claim pages closed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
  type BuckpartsFridgeModelPdpBuyerPathResearchPacketV1,
} from "./buckparts-fridge-model-pdp-buyer-path-research-packet-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  type BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_closable_mwfp_xwfe_apply_plan_owner_review_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1 = [
  "ge-gfe24jgkww",
  "ge-gfe27jmkes",
  "ge-gne25jmkww",
  "ge-pvd28bymfs",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_XWF_SUPERSESSION_SLUGS_V1 = [
  "ge-gne27jstss",
  "ge-gse25hskss",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1 =
  "ge-gte18gsnrss" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_FILTERS_V1 = [
  "smartwater-mwfp",
  "xwfe",
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1 =
  "xwf" as const;

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const PROPOSED_RETAILER_NAME = "GE Appliance Parts" as const;
const PROPOSED_RETAILER_KEY = "oem-parts-catalog" as const;
const PROPOSED_BROWSER_TRUTH_CLASSIFICATION = "direct_buyable" as const;
const PROPOSED_CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const PROPOSED_LABEL_SUBTYPE = "official_manufacturer_official_ge" as const;

export type RetailerLinksDeltaKindV1 = "update_existing_primary_row" | "insert_primary_row" | "UNKNOWN";

export type GeClosableApplyPlanCsvRowV1 = {
  filter_slug: string;
  retailer_name: string | null;
  affiliate_url: string | null;
  is_primary: boolean | null;
  sort_order: string | null;
  retailer_key: string | null;
  browser_truth_classification: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type GeClosableApplyPlanPlannedChangeV1 = {
  model_slug: string;
  filter_slug: string;
  current_buyer_path_failure_reasons: string[];
  current_csv_search_placeholder_state: {
    csv_primary_url: string | null;
    csv_gate_failure_kind: string | null;
    search_placeholder_only: boolean;
    csv_row_present: boolean;
    browser_truth_classification: string | null;
  };
  owner_browser_proof_source: {
    result_packet_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
    classification: "OWNER_BROWSER_PASS";
    url_shown: string;
    product_title_shown: string;
    part_shown: string;
    add_to_cart_visible: true;
  };
  proposed_official_manufacturer_direct_buy_url: string;
  proposed_retailer_name: typeof PROPOSED_RETAILER_NAME;
  proposed_retailer_key: typeof PROPOSED_RETAILER_KEY;
  proposed_browser_truth_classification: typeof PROPOSED_BROWSER_TRUTH_CLASSIFICATION;
  proposed_browser_truth_checked_at: string;
  proposed_browser_truth_checked_at_source: string;
  proposed_customer_visible_label: typeof PROPOSED_CUSTOMER_LABEL;
  proposed_label_subtype: typeof PROPOSED_LABEL_SUBTYPE;
  retailer_links_delta: {
    target_csv_rel: typeof RETAILER_LINKS_CSV_REL;
    change_kind: RetailerLinksDeltaKindV1;
    current_primary_row: GeClosableApplyPlanCsvRowV1 | null;
    proposed_primary_row_preview: {
      filter_slug: string;
      retailer_name: typeof PROPOSED_RETAILER_NAME;
      affiliate_url: string;
      is_primary: true;
      sort_order: 0;
      retailer_key: typeof PROPOSED_RETAILER_KEY;
      browser_truth_classification: typeof PROPOSED_BROWSER_TRUTH_CLASSIFICATION;
      browser_truth_notes: string;
      browser_truth_checked_at: string;
    };
  };
  supabase_delta: {
        status: "UNKNOWN_PENDING_FOUNDER_GATED_PARITY_LANE";
    notes: string[];
  };
  pages_claimed_closed: false;
  founder_approval_fields_required: string[];
  invent_link_authorized: false;
  link_promotion_authorized: false;
  apply_authorized: false;
};

export type GeClosableUniqueRetailerLinksDeltaV1 = {
  filter_slug: string;
  change_kind: RetailerLinksDeltaKindV1;
  proposed_url: string;
  affected_model_slugs: string[];
  csv_row_present: boolean;
};

export type BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  apply_plan_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  retailer_links_mutation_authorized: false;
  buy_cta_authorized: false;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  link_promotion_authorized: false;
  xwf_promotion_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  owner_decision_mutation_authorized: false;
  deploy_config_mutation_authorized: false;
  pages_claimed_closed: false;
  buyer_path_claimed_closed: false;
  conversion_or_revenue: "UNKNOWN";
  conversion_claimed: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_SOURCE_COMMAND_V1;
  plan_status: "PROPOSED_OWNER_REVIEW_READY" | "NOT_READY_FAIL_CLOSED";
  source_artifacts: {
    owner_browser_proof_result_packet_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
    buyer_path_research_packet_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1;
    retailer_links_csv_rel: typeof RETAILER_LINKS_CSV_REL;
  };
  scope: {
    target_slug_count: 4;
    target_slugs: readonly string[];
    allowed_filters: readonly string[];
    forbidden_filter: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1;
    excluded_xwf_supersession_slugs: readonly string[];
    excluded_remain_no_buy_slug: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;
  };
  summary: {
    planned_model_filter_rows: number;
    unique_retailer_links_deltas: number;
    update_existing_primary_rows: number;
    insert_primary_rows: number;
    unknown_delta_kind_rows: number;
    excluded_slug_count: number;
  };
  planned_changes: GeClosableApplyPlanPlannedChangeV1[];
  unique_retailer_links_deltas: GeClosableUniqueRetailerLinksDeltaV1[];
  exclusions: Array<{
    slug: string;
    reason: string;
    included_in_plan: false;
  }>;
  founder_approval_fields_required: string[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildGeClosableApplyPlanDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadResultPacket?: () => BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1;
  loadResearchPacket?: () => BuckpartsFridgeModelPdpBuyerPathResearchPacketV1;
  evidenceExists?: (relPath: string) => boolean;
  readText?: (abs: string) => string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function loadJson<T>(rootDir: string, rel: string, readText: (abs: string) => string): T {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) throw new Error(`missing required artifact: ${rel}`);
  return JSON.parse(readText(abs)) as T;
}

function readPrimaryCsvRow(args: {
  rootDir: string;
  filter_slug: string;
  readText: (abs: string) => string;
}): GeClosableApplyPlanCsvRowV1 | null {
  const abs = path.join(args.rootDir, RETAILER_LINKS_CSV_REL);
  if (!existsSync(abs)) return null;
  const rows = parse(args.readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
  const match = rows.find(
    (r) =>
      normalizeSlug(r.filter_slug ?? "") === normalizeSlug(args.filter_slug) &&
      String(r.is_primary ?? "").trim().toLowerCase() === "true",
  );
  if (!match) {
    const any = rows.find(
      (r) => normalizeSlug(r.filter_slug ?? "") === normalizeSlug(args.filter_slug),
    );
    if (!any) return null;
    return {
      filter_slug: normalizeSlug(any.filter_slug ?? args.filter_slug),
      retailer_name: any.retailer_name?.trim() || null,
      affiliate_url: any.affiliate_url?.trim() || null,
      is_primary: String(any.is_primary ?? "").trim().toLowerCase() === "true",
      sort_order: any.sort_order?.trim() || null,
      retailer_key: any.retailer_key?.trim() || null,
      browser_truth_classification: any.browser_truth_classification?.trim() || null,
      browser_truth_notes: any.browser_truth_notes?.trim() || null,
      browser_truth_checked_at: any.browser_truth_checked_at?.trim() || null,
    };
  }
  return {
    filter_slug: normalizeSlug(match.filter_slug ?? args.filter_slug),
    retailer_name: match.retailer_name?.trim() || null,
    affiliate_url: match.affiliate_url?.trim() || null,
    is_primary: true,
    sort_order: match.sort_order?.trim() || null,
    retailer_key: match.retailer_key?.trim() || null,
    browser_truth_classification: match.browser_truth_classification?.trim() || null,
    browser_truth_notes: match.browser_truth_notes?.trim() || null,
    browser_truth_checked_at: match.browser_truth_checked_at?.trim() || null,
  };
}

function isSearchPlaceholderUrl(url: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes("search.jsp") ||
    u.includes("searchkeyword=") ||
    u.includes("/catalog/search") ||
    u.includes("?search=")
  );
}

function classifyDeltaKind(row: GeClosableApplyPlanCsvRowV1 | null): RetailerLinksDeltaKindV1 {
  if (!row) return "insert_primary_row";
  if (row.filter_slug) return "update_existing_primary_row";
  return "UNKNOWN";
}

const FOUNDER_APPROVAL_FIELDS = [
  "decision_id",
  "approved_at",
  "approved_by",
  "exact_plan_contract",
  "exact_target_slugs",
  "exact_allowed_filters",
  "exact_retailer_links_csv_deltas",
  "explicit_apply_authorization_for_session",
  "explicit_exclusion_ack_xwf_supersession_slugs",
  "explicit_exclusion_ack_ge_gte18gsnrss_remain_no_buy",
  "no_xwf_promotion_ack",
  "pages_not_claimed_closed_ack",
] as const;

export function buildBuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1(
  deps: BuildGeClosableApplyPlanDepsV1,
): BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1 {
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const evidenceExists =
    deps.evidenceExists ?? ((rel) => existsSync(path.join(deps.rootDir, rel)));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();

  if (!evidenceExists(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1)) {
    throw new Error(
      `fail-closed: missing owner browser proof result packet ${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1}`,
    );
  }
  if (!evidenceExists(BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1)) {
    throw new Error(
      `fail-closed: missing buyer-path research packet ${BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1}`,
    );
  }

  const result =
    deps.loadResultPacket?.() ??
    loadJson<BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1>(
      deps.rootDir,
      BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
      readText,
    );
  const research =
    deps.loadResearchPacket?.() ??
    loadJson<BuckpartsFridgeModelPdpBuyerPathResearchPacketV1>(
      deps.rootDir,
      BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
      readText,
    );

  const allowedFilters = new Set(
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_FILTERS_V1.map(normalizeSlug),
  );
  const targetSlugs = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1,
  ].map(normalizeSlug);
  const targetSet = new Set(targetSlugs);

  // Fail-closed: result packet must list these as potentially closable.
  const closableFromProof = new Set(
    (result.potentially_closable_slugs ?? []).map(normalizeSlug),
  );
  for (const slug of targetSlugs) {
    if (!closableFromProof.has(slug)) {
      throw new Error(
        `fail-closed: ${slug} is not POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF in result packet`,
      );
    }
  }

  const passByFilter = new Map(
    (result.filter_rows ?? [])
      .filter((f) => f.classification === "OWNER_BROWSER_PASS")
      .map((f) => [normalizeSlug(f.filter_slug), f]),
  );
  for (const filter of allowedFilters) {
    if (!passByFilter.has(filter)) {
      throw new Error(
        `fail-closed: required OWNER_BROWSER_PASS proof missing for filter ${filter}`,
      );
    }
  }
  if (passByFilter.has(BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1)) {
    throw new Error("fail-closed: xwf must not be planned for promotion from OWNER_BROWSER_PASS");
  }
  const xwfRow = (result.filter_rows ?? []).find(
    (f) =>
      normalizeSlug(f.filter_slug) ===
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
  );
  if (xwfRow && xwfRow.classification === "OWNER_BROWSER_PASS") {
    throw new Error("fail-closed: xwf OWNER_BROWSER_PASS would authorize forbidden promotion");
  }

  const researchBySlug = new Map(
    (research.rows ?? []).map((r) => [normalizeSlug(r.slug), r]),
  );
  const resultSlugBySlug = new Map(
    (result.slug_rows ?? []).map((r) => [normalizeSlug(r.slug), r]),
  );

  const checkedAt =
    result.generated_at?.trim() ||
    generated_at;
  const checkedAtSource =
    "owner_browser_proof_result_packet.generated_at (owner screenshot session recording timestamp in result packet; exact screenshot wall-clock otherwise UNKNOWN)";

  const planned_changes: GeClosableApplyPlanPlannedChangeV1[] = [];

  for (const model_slug of targetSlugs.sort()) {
    const resultSlug = resultSlugBySlug.get(model_slug);
    const researchRow = researchBySlug.get(model_slug);
    if (!resultSlug) {
      throw new Error(`fail-closed: missing result slug row for ${model_slug}`);
    }
    if (resultSlug.has_xwf_mapping || resultSlug.blocked_by_xwf_supersession_policy) {
      throw new Error(
        `fail-closed: ${model_slug} still blocked by XWF supersession policy — must stay excluded`,
      );
    }

    const mapped = sortedUnique(resultSlug.mapped_filter_slugs ?? []).filter((f) =>
      allowedFilters.has(f),
    );
    if (mapped.length === 0) {
      throw new Error(`fail-closed: ${model_slug} has no allowed MWFP/XWFE mappings`);
    }
    if (
      sortedUnique(resultSlug.mapped_filter_slugs ?? []).includes(
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
      )
    ) {
      throw new Error(`fail-closed: ${model_slug} maps xwf — excluded from this plan`);
    }

    const failureReasons = [
      ...(researchRow?.buyer_path_failure_reasons ?? [
        "no_go_resolvable_safe_retailer_link",
        "no_safe_direct_buyable_cta_after_gate",
        "trust_buyer_path_suppress_buy_for_all_mapped_filters",
      ]),
    ];

    for (const filter_slug of mapped) {
      const proof = passByFilter.get(filter_slug)!;
      const researchFilter = researchRow?.filters?.find(
        (f) => normalizeSlug(f.filter_slug) === filter_slug,
      );
      const csvRow = readPrimaryCsvRow({
        rootDir: deps.rootDir,
        filter_slug,
        readText,
      });
      const currentUrl =
        researchFilter?.csv_primary_url ?? csvRow?.affiliate_url ?? null;
      const gate =
        researchFilter?.csv_gate_failure_kind ??
        (isSearchPlaceholderUrl(currentUrl) ? "search_placeholder" : null);
      const change_kind = classifyDeltaKind(csvRow);
      const proposedUrl = proof.url_shown;
      if (!proposedUrl || isSearchPlaceholderUrl(proposedUrl)) {
        throw new Error(
          `fail-closed: proposed URL for ${filter_slug} is missing or still a search placeholder`,
        );
      }
      if (proof.classification !== "OWNER_BROWSER_PASS" || !proof.clean_direct_buy_pass) {
        throw new Error(`fail-closed: ${filter_slug} is not clean OWNER_BROWSER_PASS`);
      }

      const notes = [
        `Planned GE official manufacturer direct-buy for ${filter_slug} from owner browser OWNER_BROWSER_PASS.`,
        `Affected model slug ${model_slug} — page NOT claimed closed by this plan.`,
        "Founder approval + guarded apply required before retailer_links write.",
        `Customer label ${PROPOSED_CUSTOMER_LABEL} (${PROPOSED_LABEL_SUBTYPE}).`,
      ].join(" ");

      planned_changes.push({
        model_slug,
        filter_slug,
        current_buyer_path_failure_reasons: failureReasons,
        current_csv_search_placeholder_state: {
          csv_primary_url: currentUrl,
          csv_gate_failure_kind: gate,
          search_placeholder_only:
            researchFilter?.search_placeholder_only === true ||
            isSearchPlaceholderUrl(currentUrl),
          csv_row_present: csvRow !== null,
          browser_truth_classification: csvRow?.browser_truth_classification ?? null,
        },
        owner_browser_proof_source: {
          result_packet_rel: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
          classification: "OWNER_BROWSER_PASS",
          url_shown: proof.url_shown,
          product_title_shown: proof.product_title_shown,
          part_shown: proof.part_shown,
          add_to_cart_visible: true,
        },
        proposed_official_manufacturer_direct_buy_url: proposedUrl,
        proposed_retailer_name: PROPOSED_RETAILER_NAME,
        proposed_retailer_key: PROPOSED_RETAILER_KEY,
        proposed_browser_truth_classification: PROPOSED_BROWSER_TRUTH_CLASSIFICATION,
        proposed_browser_truth_checked_at: checkedAt,
        proposed_browser_truth_checked_at_source: checkedAtSource,
        proposed_customer_visible_label: PROPOSED_CUSTOMER_LABEL,
        proposed_label_subtype: PROPOSED_LABEL_SUBTYPE,
        retailer_links_delta: {
          target_csv_rel: RETAILER_LINKS_CSV_REL,
          change_kind,
          current_primary_row: csvRow,
          proposed_primary_row_preview: {
            filter_slug,
            retailer_name: PROPOSED_RETAILER_NAME,
            affiliate_url: proposedUrl,
            is_primary: true,
            sort_order: 0,
            retailer_key: PROPOSED_RETAILER_KEY,
            browser_truth_classification: PROPOSED_BROWSER_TRUTH_CLASSIFICATION,
            browser_truth_notes: notes,
            browser_truth_checked_at: checkedAt,
          },
        },
        supabase_delta: {
          status: "UNKNOWN_PENDING_FOUNDER_GATED_PARITY_LANE",
          notes: [
            "Live customer retailer_links are served from Supabase — CSV apply alone does not close production buyer paths.",
            "A separate founder-gated Supabase parity/apply lane is required after (or coordinated with) CSV apply.",
            "This plan does not authorize Supabase mutation.",
          ],
        },
        pages_claimed_closed: false,
        founder_approval_fields_required: [...FOUNDER_APPROVAL_FIELDS],
        invent_link_authorized: false,
        link_promotion_authorized: false,
        apply_authorized: false,
      });
    }
  }

  // Build unique retailer_links deltas (filter-level).
  const uniqueMap = new Map<string, GeClosableUniqueRetailerLinksDeltaV1>();
  for (const row of planned_changes) {
    const existing = uniqueMap.get(row.filter_slug);
    if (!existing) {
      uniqueMap.set(row.filter_slug, {
        filter_slug: row.filter_slug,
        change_kind: row.retailer_links_delta.change_kind,
        proposed_url: row.proposed_official_manufacturer_direct_buy_url,
        affected_model_slugs: [row.model_slug],
        csv_row_present: row.current_csv_search_placeholder_state.csv_row_present,
      });
    } else {
      existing.affected_model_slugs = sortedUnique([
        ...existing.affected_model_slugs,
        row.model_slug,
      ]);
    }
  }
  const unique_retailer_links_deltas = [...uniqueMap.values()].sort((a, b) =>
    a.filter_slug.localeCompare(b.filter_slug),
  );

  // Ensure XWF never appears in plan.
  if (
    planned_changes.some(
      (r) =>
        r.filter_slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
    ) ||
    unique_retailer_links_deltas.some(
      (r) =>
        r.filter_slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
    )
  ) {
    throw new Error("fail-closed: plan incorrectly includes xwf promotion");
  }
  if (planned_changes.some((r) => targetSet.has(r.model_slug) === false)) {
    throw new Error("fail-closed: planned change outside exact 4-slug scope");
  }

  const exclusions = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_XWF_SUPERSESSION_SLUGS_V1.map(
      (slug) => ({
        slug,
        reason:
          "Still blocked by XWF supersession-safe policy (SUPERSEDED_TO_XWFE_PROVEN is not clean XWF buy PASS; no XWF promotion).",
        included_in_plan: false as const,
      }),
    ),
    {
      slug: BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
      reason: "Remain no-buy / no filter mapping — out of buyer-path closable apply plan scope.",
      included_in_plan: false as const,
    },
  ];

  const summary = {
    planned_model_filter_rows: planned_changes.length,
    unique_retailer_links_deltas: unique_retailer_links_deltas.length,
    update_existing_primary_rows: unique_retailer_links_deltas.filter(
      (d) => d.change_kind === "update_existing_primary_row",
    ).length,
    insert_primary_rows: unique_retailer_links_deltas.filter(
      (d) => d.change_kind === "insert_primary_row",
    ).length,
    unknown_delta_kind_rows: unique_retailer_links_deltas.filter(
      (d) => d.change_kind === "UNKNOWN",
    ).length,
    excluded_slug_count: exclusions.length,
  };

  const plan_status =
    planned_changes.length > 0 && summary.unknown_delta_kind_rows === 0
      ? ("PROPOSED_OWNER_REVIEW_READY" as const)
      : ("NOT_READY_FAIL_CLOSED" as const);

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    apply_plan_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    retailer_links_mutation_authorized: false,
    buy_cta_authorized: false,
    invent_link_authorized: false,
    auto_promote_authorized: false,
    link_promotion_authorized: false,
    xwf_promotion_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_decision_mutation_authorized: false,
    deploy_config_mutation_authorized: false,
    pages_claimed_closed: false,
    buyer_path_claimed_closed: false,
    conversion_or_revenue: "UNKNOWN",
    conversion_claimed: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_SOURCE_COMMAND_V1,
    plan_status,
    source_artifacts: {
      owner_browser_proof_result_packet_rel:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
      buyer_path_research_packet_rel:
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
      retailer_links_csv_rel: RETAILER_LINKS_CSV_REL,
    },
    scope: {
      target_slug_count: 4,
      target_slugs: [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_TARGET_SLUGS_V1],
      allowed_filters: [...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_ALLOWED_FILTERS_V1],
      forbidden_filter: BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_FORBIDDEN_FILTER_V1,
      excluded_xwf_supersession_slugs: [
        ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_XWF_SUPERSESSION_SLUGS_V1,
      ],
      excluded_remain_no_buy_slug:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    },
    summary,
    planned_changes,
    unique_retailer_links_deltas,
    exclusions,
    founder_approval_fields_required: [...FOUNDER_APPROVAL_FIELDS],
    proven_facts: [
      "PROVEN: read_only=true; owner_approval_required=true; apply_authorized=false; pages_claimed_closed=false; buyer_path_claimed_closed=false.",
      "PROVEN: exact 4-slug scope; xwf promotion forbidden; 3 exclusions recorded.",
      "PROVEN: plan depends on OWNER_BROWSER_PASS for smartwater-mwfp and xwfe only.",
      `PROVEN: unique retailer_links deltas=${JSON.stringify(unique_retailer_links_deltas)}.`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: conversion_or_revenue=UNKNOWN; conversion_claimed=false.",
    ],
    unknown_facts: [
      "UNKNOWN: live Supabase retailer_links parity for MWFP/XWFE until a separate founder-gated parity lane runs.",
      "UNKNOWN: whether production model PDPs close after future approved apply (not claimed here).",
      "UNKNOWN: conversion/revenue impact.",
    ],
    risk_notes: [
      "Do not treat PROPOSED_OWNER_REVIEW_READY as authorization to write retailer_links or Supabase.",
      "Do not promote XWF or include XWF-supersession slugs.",
      "Do not claim the 4 model PDPs are buyer-path closed.",
      "CSV update for a shared filter (xwfe) affects all mapped models — founder must accept cross-slug blast radius.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpGeClosableApplyPlanMarkdownV1(
  report: BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP GE closable MWFP/XWFE apply-plan owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- plan_status: **${report.plan_status}**`,
    `- read_only: **true**`,
    `- owner_approval_required: **true**`,
    `- apply_authorized: **false**`,
    `- pages_claimed_closed: **false**`,
    `- buyer_path_claimed_closed: **false**`,
    `- xwf_promotion_authorized: **false**`,
    `- conversion_or_revenue: **UNKNOWN**`,
    "",
    "## Scope",
    "",
    `- target slugs (${String(report.scope.target_slug_count)}): ${report.scope.target_slugs.join(", ")}`,
    `- allowed filters: ${report.scope.allowed_filters.join(", ")}`,
    `- forbidden filter: \`${report.scope.forbidden_filter}\``,
    "",
    "## Exclusions",
    "",
  ];
  for (const ex of report.exclusions) {
    lines.push(`- \`${ex.slug}\` — ${ex.reason} (included_in_plan=false)`);
  }
  lines.push("");
  lines.push("## Unique retailer_links deltas (filter-level)");
  lines.push("");
  lines.push("| filter | change_kind | proposed_url | affected models |");
  lines.push("|---|---|---|---|");
  for (const d of report.unique_retailer_links_deltas) {
    lines.push(
      `| ${d.filter_slug} | ${d.change_kind} | \`${d.proposed_url}\` | ${d.affected_model_slugs.join(", ")} |`,
    );
  }
  lines.push("");
  lines.push("## Planned model×filter rows");
  lines.push("");
  for (const row of report.planned_changes) {
    lines.push(`### ${row.model_slug} × \`${row.filter_slug}\``);
    lines.push("");
    lines.push(`- failure reasons: ${row.current_buyer_path_failure_reasons.join("; ")}`);
    lines.push(
      `- current CSV URL: \`${row.current_csv_search_placeholder_state.csv_primary_url ?? "none"}\``,
    );
    lines.push(
      `- gate: \`${row.current_csv_search_placeholder_state.csv_gate_failure_kind ?? "UNKNOWN"}\` (search_placeholder_only=${String(row.current_csv_search_placeholder_state.search_placeholder_only)})`,
    );
    lines.push(
      `- proof: OWNER_BROWSER_PASS via \`${row.owner_browser_proof_source.result_packet_rel}\``,
    );
    lines.push(`- proposed URL: \`${row.proposed_official_manufacturer_direct_buy_url}\``);
    lines.push(`- proposed retailer_name: **${row.proposed_retailer_name}**`);
    lines.push(
      `- proposed browser_truth_classification: **${row.proposed_browser_truth_classification}**`,
    );
    lines.push(
      `- proposed browser_truth_checked_at: \`${row.proposed_browser_truth_checked_at}\` (${row.proposed_browser_truth_checked_at_source})`,
    );
    lines.push(`- CSV delta kind: **${row.retailer_links_delta.change_kind}**`);
    lines.push(`- Supabase delta: **${row.supabase_delta.status}**`);
    lines.push(`- pages_claimed_closed: **false**`);
    lines.push(`- apply_authorized: **false**`);
    lines.push("");
  }
  lines.push("## Founder approval fields required before any write");
  lines.push("");
  for (const f of report.founder_approval_fields_required) lines.push(`- \`${f}\``);
  lines.push("");
  lines.push("## Proven facts");
  lines.push("");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Unknown facts");
  lines.push("");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Risk notes");
  lines.push("");
  for (const f of report.risk_notes) lines.push(`- ${f}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeBuckpartsFridgeModelPdpGeClosableApplyPlanArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpGeClosableApplyPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_MD_REL_V1;
  mkdirSync(path.dirname(path.join(args.rootDir, jsonRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, jsonRel),
    `${JSON.stringify(args.report, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, mdRel),
    buildBuckpartsFridgeModelPdpGeClosableApplyPlanMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
