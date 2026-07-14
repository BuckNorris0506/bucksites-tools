/**
 * Read-only owner browser proof collection packet for the 6 GE buyer-path FAIL models
 * (filters: xwfe / xwf / smartwater-mwfp). Prepares Jared's checklist before any link
 * approval/apply lane. Does not invent URLs, promote links, grant PASS, or mutate data.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_FILTERS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_KNOWN_PROOF_RELS_BY_FILTER_V1,
  type BuckpartsFridgeModelPdpBuyerPathResearchPacketV1,
} from "./buckparts-fridge-model-pdp-buyer-path-research-packet-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_owner_browser_proof_collection_packet_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-owner-browser-proof-collection-packet" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1 =
  6 as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1 =
  3 as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1 = [
  ...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_SLUGS_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1 = [
  ...BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_FILTERS_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1 =
  BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;

/** Committed GE rescue adapter draft that already lists discovered /store/parts/spec/{TOKEN} URLs. */
export const GE_REFRIGERATOR_RESCUE_ADAPTER_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/ge-refrigerator-rescue-adapter-v1.json" as const;

export const MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-browser-proof-factory-v1.json" as const;

export type OwnerBrowserCandidateUrlProvenanceV1 =
  | "repo_discovered_ge_rescue_adapter"
  | "repo_discovered_manufacturer_factory"
  | "none";

export type OwnerBrowserCandidateUrlStatusV1 =
  | "NEEDS_OWNER_VERIFICATION"
  | "REPO_PROVEN_OWNER_PASS"
  | "ABSENT";

export type OwnerBrowserProofCollectionCandidateUrlV1 = {
  url: string;
  provenance: OwnerBrowserCandidateUrlProvenanceV1;
  status: OwnerBrowserCandidateUrlStatusV1;
  notes: string;
};

export type OwnerBrowserProofCollectionChecklistV1 = {
  exact_url_to_open: string | null;
  exact_part_number_to_confirm: string;
  confirm_page_is_direct_buyable: true;
  confirm_page_is_official_manufacturer_source: true;
  screenshot_evidence_fields_needed: string[];
  pass_rules: string[];
  fail_rules: string[];
  unknown_rules: string[];
};

export type OwnerBrowserProofCollectionFilterRowV1 = {
  filter_slug: string;
  oem_part_token: string;
  current_search_placeholder_url: string | null;
  current_csv_gate_failure_kind: string | null;
  search_placeholder_only: boolean;
  approved_safe_direct_buy_evidence_present: false;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  owner_approval_authorized: false;
  link_promotion_authorized: false;
  exact_missing_proof: string[];
  proposed_official_manufacturer_pdp_candidates: OwnerBrowserProofCollectionCandidateUrlV1[];
  candidate_urls_repo_proven: false;
  candidate_urls_need_owner_verification: boolean;
  wrong_family_forbidden_tokens: string[];
  supersession_review_required: boolean;
  manufacturer_proof_packet_rel: string | null;
  manufacturer_proof_packet_present: boolean;
  expected_browser_evidence_rel: string | null;
  expected_browser_evidence_present: boolean;
  owner_browser_checklist: OwnerBrowserProofCollectionChecklistV1;
  model_slugs_helped_if_proof_passes: string[];
  remains_blocked_if_proof_fails: string[];
  collection_status: "READY_FOR_OWNER_BROWSER";
};

export type OwnerBrowserProofCollectionSlugRowV1 = {
  slug: string;
  mapped_filter_slugs: string[];
  buyer_path_failure_reasons: string[];
  filters_awaiting_owner_proof: string[];
  invent_link_authorized: false;
  auto_promote_authorized: false;
  owner_approval_authorized: false;
};

export type BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  owner_approval_authorized: false;
  link_promotion_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  owner_decision_mutation_authorized: false;
  deploy_config_mutation_authorized: false;
  pass_verdict_authorized: false;
  live_production_fetch_enabled: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SOURCE_COMMAND_V1;
  source_artifacts: {
    buyer_path_research_packet_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1;
    cta_go_link_proof_pack_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
    ge_refrigerator_rescue_adapter_rel: typeof GE_REFRIGERATOR_RESCUE_ADAPTER_JSON_REL_V1;
    manufacturer_browser_proof_factory_rel: typeof MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1;
  };
  scope: {
    slug_count: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1;
    filter_count: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1;
    slugs: readonly string[];
    filters: readonly string[];
    excluded_remain_no_buy_slug: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;
  };
  summary: {
    filters_ready_for_owner_browser: number;
    filters_with_repo_proven_official_pdp: number;
    filters_with_candidate_needing_owner_verification: number;
    filters_still_search_placeholder_only: number;
    slugs_in_scope: number;
  };
  filter_rows: OwnerBrowserProofCollectionFilterRowV1[];
  slug_rows: OwnerBrowserProofCollectionSlugRowV1[];
  verdict_rules: {
    PASS: string[];
    FAIL: string[];
    UNKNOWN: string[];
  };
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildOwnerBrowserProofCollectionDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadResearchPacket?: () => BuckpartsFridgeModelPdpBuyerPathResearchPacketV1;
  evidenceExists?: (relPath: string) => boolean;
  readText?: (abs: string) => string;
};

type GeRescueAdapterRowV1 = {
  filter_slug?: string;
  oem_part_token?: string;
  current_primary_affiliate_url?: string | null;
  discovered_spec_pdp_url?: string | null;
  wrong_family_forbidden_tokens?: string[];
  supersession_review_required?: boolean;
  browser_evidence_artifact_rel_path?: string | null;
  csv_primary_is_search_placeholder?: boolean;
};

type GeRescueAdapterDocV1 = {
  rows?: GeRescueAdapterRowV1[];
};

type ManufacturerFactoryAssessmentV1 = {
  filter_slug?: string;
  oem_part_token?: string;
  target_url?: string | null;
  adapter_discovery_url?: string | null;
  official_pass?: boolean;
  owner_proof_artifact_rel?: string | null;
};

type ManufacturerFactoryDocV1 = {
  slug_assessments?: ManufacturerFactoryAssessmentV1[];
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function defaultLoadResearchPacket(
  rootDir: string,
  readText: (abs: string) => string,
): BuckpartsFridgeModelPdpBuyerPathResearchPacketV1 {
  const rel = BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) {
    throw new Error(`missing research packet: ${rel}`);
  }
  return JSON.parse(readText(abs)) as BuckpartsFridgeModelPdpBuyerPathResearchPacketV1;
}

function loadJsonOptional<T>(
  rootDir: string,
  rel: string,
  evidenceExists: (rel: string) => boolean,
  readText: (abs: string) => string,
): T | null {
  if (!evidenceExists(rel)) return null;
  try {
    return JSON.parse(readText(path.join(rootDir, rel))) as T;
  } catch {
    return null;
  }
}

function buildVerdictRulesV1(args: {
  oem_part_token: string;
  wrong_family_forbidden_tokens: string[];
}): {
  PASS: string[];
  FAIL: string[];
  UNKNOWN: string[];
} {
  const token = args.oem_part_token.toUpperCase();
  const forbidden = args.wrong_family_forbidden_tokens.map((t) => t.toUpperCase());
  return {
    PASS: [
      `Final URL is official GE Appliance Parts PDP at /store/parts/spec/${token} (not catalog/search.jsp).`,
      `Exact OEM part token ${token} is visible in product title/H1 identity (not adjacent-only).`,
      "Page is official manufacturer source (geapplianceparts.com official path).",
      "Page is direct-buyable (visible Add to Cart / equivalent purchase control for the exact token).",
      "No wrong-family primary identity; no search-results or category landing as the proven destination.",
      "Owner records screenshot + final URL + checked_at — still no CSV/retailer_links/buy CTA apply from this packet alone.",
    ],
    FAIL: [
      "Final URL remains search.jsp / searchKeyword / catalog search, or redirects away from the exact-token spec PDP.",
      `Exact token ${token} is absent from primary product identity.`,
      forbidden.length > 0
        ? `Wrong-family token detected as primary identity (${forbidden.join(", ")}).`
        : "Wrong-family / adjacent filter presented as the primary buy destination.",
      "No direct-buy purchase control (not direct_buyable).",
      "404 / discontinued / blocked error page for the candidate PDP.",
    ],
    UNKNOWN: [
      "Captcha, soft-block, region gate, or page load failure prevents classification.",
      "Ambiguous multi-SKU / kit / multipack presentation where exact single-pack identity is unclear.",
      "Purchase control visibility cannot be confirmed (loading/JS/partial capture).",
      "Supersession messaging present without clear exact-token direct-buy PDP confirmation.",
    ],
  };
}

function buildScreenshotFieldsV1(token: string): string[] {
  return [
    `full_page_or_pdp_hero showing exact token ${token}`,
    "address_bar_final_url (must show /store/parts/spec/{TOKEN}, not search.jsp)",
    "purchase_control_visible (Add to Cart or equivalent)",
    "part_number_identity_in_title_or_h1",
    "optional_wrong_family_absence_note",
    "owner_checked_at_iso8601",
  ];
}

export function buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1(
  deps: BuildOwnerBrowserProofCollectionDepsV1,
): BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1 {
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const evidenceExists =
    deps.evidenceExists ?? ((rel) => existsSync(path.join(deps.rootDir, rel)));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const research =
    deps.loadResearchPacket?.() ?? defaultLoadResearchPacket(deps.rootDir, readText);

  const expectedSlugs = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1,
  ].map(normalizeSlug);
  const expectedFilters = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1,
  ].map(normalizeSlug);

  const researchSlugs = sortedUnique(research.scope?.slugs ?? []);
  if (
    researchSlugs.length !== expectedSlugs.length ||
    expectedSlugs.some((s, i) => researchSlugs[i] !== s)
  ) {
    // allow unsorted: compare sets
    const a = new Set(researchSlugs);
    const b = new Set(expectedSlugs);
    if (a.size !== b.size || expectedSlugs.some((s) => !a.has(s))) {
      throw new Error(
        `research packet slug scope mismatch; expected exact ${expectedSlugs.join(",")}`,
      );
    }
  }

  const adapter = loadJsonOptional<GeRescueAdapterDocV1>(
    deps.rootDir,
    GE_REFRIGERATOR_RESCUE_ADAPTER_JSON_REL_V1,
    evidenceExists,
    readText,
  );
  const factory = loadJsonOptional<ManufacturerFactoryDocV1>(
    deps.rootDir,
    MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    evidenceExists,
    readText,
  );

  const adapterByFilter = new Map(
    (adapter?.rows ?? [])
      .filter((r) => r.filter_slug)
      .map((r) => [normalizeSlug(r.filter_slug!), r]),
  );
  const factoryByFilter = new Map(
    (factory?.slug_assessments ?? [])
      .filter((r) => r.filter_slug)
      .map((r) => [normalizeSlug(r.filter_slug!), r]),
  );

  const researchFilterBySlug = new Map(
    (research.unique_filter_findings ?? []).map((f) => [normalizeSlug(f.filter_slug), f]),
  );

  const slug_rows: OwnerBrowserProofCollectionSlugRowV1[] = (research.rows ?? [])
    .filter((row) => expectedSlugs.includes(normalizeSlug(row.slug)))
    .map((row) => {
      const mapped = sortedUnique(row.mapped_filter_slugs ?? []).filter((f) =>
        expectedFilters.includes(f),
      );
      return {
        slug: normalizeSlug(row.slug),
        mapped_filter_slugs: mapped,
        buyer_path_failure_reasons: [...(row.buyer_path_failure_reasons ?? [])],
        filters_awaiting_owner_proof: mapped,
        invent_link_authorized: false as const,
        auto_promote_authorized: false as const,
        owner_approval_authorized: false as const,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (slug_rows.length !== BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `expected ${String(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1)} slug rows, got ${String(slug_rows.length)}`,
    );
  }
  if (
    slug_rows.some(
      (r) =>
        r.slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    )
  ) {
    throw new Error("ge-gte18gsnrss remain-no-buy must stay excluded");
  }

  const filter_rows: OwnerBrowserProofCollectionFilterRowV1[] = expectedFilters.map(
    (filter_slug) => {
      const researchFilter = researchFilterBySlug.get(filter_slug);
      if (!researchFilter) {
        throw new Error(`missing research filter finding for ${filter_slug}`);
      }
      const rescue = adapterByFilter.get(filter_slug);
      const factoryRow = factoryByFilter.get(filter_slug);
      const oem_part_token = (
        rescue?.oem_part_token ||
        factoryRow?.oem_part_token ||
        filter_slug.replace(/^smartwater-/, "").replace(/-/g, "")
      ).toUpperCase();

      const wrong_family_forbidden_tokens = [
        ...(rescue?.wrong_family_forbidden_tokens ?? []),
      ].map((t) => t.toUpperCase());
      const supersession_review_required = Boolean(rescue?.supersession_review_required);

      const discoveredFromAdapter = rescue?.discovered_spec_pdp_url?.trim() || null;
      const discoveredFromFactory =
        factoryRow?.target_url?.trim() ||
        factoryRow?.adapter_discovery_url?.trim() ||
        null;

      const candidates: OwnerBrowserProofCollectionCandidateUrlV1[] = [];
      const seen = new Set<string>();
      const pushCandidate = (
        url: string | null,
        provenance: OwnerBrowserCandidateUrlProvenanceV1,
        notes: string,
      ) => {
        if (!url) return;
        const key = url.trim();
        if (!key || seen.has(key.toLowerCase())) return;
        seen.add(key.toLowerCase());
        // Never mark official PDP as repo-proven from discovery alone.
        candidates.push({
          url: key,
          provenance,
          status: "NEEDS_OWNER_VERIFICATION",
          notes,
        });
      };

      pushCandidate(
        discoveredFromAdapter,
        "repo_discovered_ge_rescue_adapter",
        "Present in committed ge-refrigerator-rescue-adapter-v1.json as discovered_spec_pdp_url — NOT owner-proven; do not promote.",
      );
      if (
        discoveredFromFactory &&
        discoveredFromFactory.toLowerCase() !== (discoveredFromAdapter ?? "").toLowerCase()
      ) {
        pushCandidate(
          discoveredFromFactory,
          "repo_discovered_manufacturer_factory",
          "Present in manufacturer-browser-proof-factory-v1.json discovery fields — NOT owner-proven; do not promote.",
        );
      }

      const expected_browser_evidence_rel =
        rescue?.browser_evidence_artifact_rel_path?.trim() || null;
      const expected_browser_evidence_present = Boolean(
        expected_browser_evidence_rel && evidenceExists(expected_browser_evidence_rel),
      );
      const manufacturer_proof_packet_rel =
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_KNOWN_PROOF_RELS_BY_FILTER_V1[
          filter_slug
        ] ?? null;
      const manufacturer_proof_packet_present = Boolean(
        manufacturer_proof_packet_rel && evidenceExists(manufacturer_proof_packet_rel),
      );

      const exact_url_to_open =
        candidates[0]?.url ??
        // Prefer opening discovered candidate; if absent, open current search placeholder for
        // discovery only (explicitly not an official PDP candidate).
        null;

      const model_slugs_helped_if_proof_passes = slug_rows
        .filter((s) => s.mapped_filter_slugs.includes(filter_slug))
        .map((s) => s.slug);

      const remains_blocked_if_proof_fails = [
        ...model_slugs_helped_if_proof_passes.map(
          (slug) =>
            `${slug}: remains SAFE_BUYER_PATH_FAIL for mapped filter ${filter_slug} (search-placeholder / no direct_buyable /go).`,
        ),
        "No retailer_links promotion, Verified Link, or buy CTA authorization from a FAIL/UNKNOWN result.",
        "This collection packet still does not authorize CSV/Supabase/owner-decision mutation.",
      ];

      const verdict_rules = buildVerdictRulesV1({
        oem_part_token,
        wrong_family_forbidden_tokens,
      });

      const exact_missing_proof = [
        `Owner browser PASS on official manufacturer PDP for exact token ${oem_part_token} (not search.jsp).`,
        "browser_truth_classification=direct_buyable with fresh owner checked_at.",
        "Committed owner browser proof / GE rescue browser evidence artifact for this filter.",
        "Founder-gated retailer_links review/apply remains a separate lane — not authorized here.",
        ...(supersession_review_required
          ? [
              "XWF/XWFE supersession owner compatibility review still required before any future apply.",
            ]
          : []),
        ...(wrong_family_forbidden_tokens.length > 0
          ? [
              `Wrong-family tokens must not be primary identity: ${wrong_family_forbidden_tokens.join(", ")}.`,
            ]
          : []),
      ];

      return {
        filter_slug,
        oem_part_token,
        current_search_placeholder_url: researchFilter.csv_primary_url,
        current_csv_gate_failure_kind: researchFilter.csv_gate_failure_kind,
        search_placeholder_only: researchFilter.search_placeholder_only === true,
        approved_safe_direct_buy_evidence_present: false as const,
        invent_link_authorized: false as const,
        auto_promote_authorized: false as const,
        owner_approval_authorized: false as const,
        link_promotion_authorized: false as const,
        exact_missing_proof,
        proposed_official_manufacturer_pdp_candidates: candidates,
        candidate_urls_repo_proven: false as const,
        candidate_urls_need_owner_verification: candidates.length > 0,
        wrong_family_forbidden_tokens,
        supersession_review_required,
        manufacturer_proof_packet_rel,
        manufacturer_proof_packet_present,
        expected_browser_evidence_rel,
        expected_browser_evidence_present,
        owner_browser_checklist: {
          exact_url_to_open:
            exact_url_to_open ?? researchFilter.csv_primary_url /* fallback: placeholder only */,
          exact_part_number_to_confirm: oem_part_token,
          confirm_page_is_direct_buyable: true,
          confirm_page_is_official_manufacturer_source: true,
          screenshot_evidence_fields_needed: buildScreenshotFieldsV1(oem_part_token),
          pass_rules: verdict_rules.PASS,
          fail_rules: verdict_rules.FAIL,
          unknown_rules: verdict_rules.UNKNOWN,
        },
        model_slugs_helped_if_proof_passes,
        remains_blocked_if_proof_fails,
        collection_status: "READY_FOR_OWNER_BROWSER",
      };
    },
  );

  // Prefer opening the discovered candidate URL when present; annotate placeholder separately.
  for (const row of filter_rows) {
    const candidate = row.proposed_official_manufacturer_pdp_candidates[0]?.url ?? null;
    if (candidate) {
      row.owner_browser_checklist.exact_url_to_open = candidate;
    }
  }

  const sharedVerdict = buildVerdictRulesV1({
    oem_part_token: "TOKEN",
    wrong_family_forbidden_tokens: [],
  });

  const summary = {
    filters_ready_for_owner_browser: filter_rows.length,
    filters_with_repo_proven_official_pdp: filter_rows.filter((f) => f.candidate_urls_repo_proven)
      .length,
    filters_with_candidate_needing_owner_verification: filter_rows.filter(
      (f) => f.candidate_urls_need_owner_verification,
    ).length,
    filters_still_search_placeholder_only: filter_rows.filter((f) => f.search_placeholder_only)
      .length,
    slugs_in_scope: slug_rows.length,
  };

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    invent_link_authorized: false,
    auto_promote_authorized: false,
    owner_approval_authorized: false,
    link_promotion_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_decision_mutation_authorized: false,
    deploy_config_mutation_authorized: false,
    pass_verdict_authorized: false,
    live_production_fetch_enabled: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SOURCE_COMMAND_V1,
    source_artifacts: {
      buyer_path_research_packet_rel:
        BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_RESEARCH_PACKET_JSON_REL_V1,
      cta_go_link_proof_pack_rel: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
      ge_refrigerator_rescue_adapter_rel: GE_REFRIGERATOR_RESCUE_ADAPTER_JSON_REL_V1,
      manufacturer_browser_proof_factory_rel: MANUFACTURER_BROWSER_PROOF_FACTORY_JSON_REL_V1,
    },
    scope: {
      slug_count: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1,
      filter_count:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1,
      slugs: [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1],
      filters: [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1],
      excluded_remain_no_buy_slug:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    },
    summary,
    filter_rows,
    slug_rows,
    verdict_rules: {
      PASS: [
        "Official GE Appliance Parts /store/parts/spec/{TOKEN} final URL.",
        "Exact OEM token proven in primary identity.",
        "Official manufacturer source + direct_buyable purchase control.",
        "No wrong-family primary; owner evidence fields recorded.",
        "PASS here means browser proof only — still no link promotion/apply.",
      ],
      FAIL: sharedVerdict.FAIL.map((r) => r.replace("TOKEN", "{TOKEN}")),
      UNKNOWN: sharedVerdict.UNKNOWN,
    },
    proven_facts: [
      "PROVEN: read_only=true; invent_link_authorized=false; auto_promote_authorized=false; owner_approval_authorized=false; link_promotion_authorized=false; pass_verdict_authorized=false.",
      `PROVEN: exact slug scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1)} (${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1.join(", ")}).`,
      `PROVEN: exact filter scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1)} (${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1.join(", ")}).`,
      "PROVEN: ge-gte18gsnrss excluded as remain-no-buy.",
      "PROVEN: CSV primaries for xwfe/xwf/smartwater-mwfp remain search placeholders without direct_buyable.",
      "PROVEN: proposed /store/parts/spec/{TOKEN} candidates come from committed GE rescue/factory drafts only — status NEEDS_OWNER_VERIFICATION (not REPO_PROVEN_OWNER_PASS).",
      `PROVEN: summary=${JSON.stringify(summary)}.`,
    ],
    unknown_facts: [
      "UNKNOWN: whether discovered GE /store/parts/spec/{TOKEN} pages are live direct-buyable until owner browser PASS.",
      "UNKNOWN: conversion/revenue impact of any future approved buyer path (not claimed).",
    ],
    risk_notes: [
      "Do not promote search placeholders or discovered candidates from this packet.",
      "Do not mutate Supabase, CSV, retailer_links, buy CTA, sitemap, robots, Product JSON-LD, owner decisions, or deploy config.",
      "XWF/XWFE supersession remains an owner compatibility gate before any future apply.",
      "ge-gte18gsnrss remains no-buy and is out of scope.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionMarkdownV1(
  report: BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP owner browser proof collection packet v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- invent_link_authorized: **false**`,
    `- auto_promote_authorized: **false**`,
    `- owner_approval_authorized: **false**`,
    `- link_promotion_authorized: **false**`,
    `- pass_verdict_authorized: **false**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- filter_count: **${String(report.scope.filter_count)}**`,
    `- excluded remain-no-buy: \`${report.scope.excluded_remain_no_buy_slug}\``,
    "",
    "## Summary",
    "",
    `- filters_ready_for_owner_browser: ${String(report.summary.filters_ready_for_owner_browser)}`,
    `- filters_with_repo_proven_official_pdp: ${String(report.summary.filters_with_repo_proven_official_pdp)}`,
    `- filters_with_candidate_needing_owner_verification: ${String(report.summary.filters_with_candidate_needing_owner_verification)}`,
    `- filters_still_search_placeholder_only: ${String(report.summary.filters_still_search_placeholder_only)}`,
    `- slugs_in_scope: ${String(report.summary.slugs_in_scope)}`,
    "",
    "## Per-filter owner proof checklist",
    "",
  ];

  for (const f of report.filter_rows) {
    lines.push(`### \`${f.filter_slug}\` (${f.oem_part_token})`);
    lines.push("");
    lines.push(
      `- current search-placeholder URL: \`${f.current_search_placeholder_url ?? "none"}\``,
    );
    lines.push(`- gate: \`${f.current_csv_gate_failure_kind ?? "UNKNOWN"}\``);
    lines.push(`- search_placeholder_only: **${String(f.search_placeholder_only)}**`);
    lines.push(
      `- candidate official PDP URL(s): ${
        f.proposed_official_manufacturer_pdp_candidates.length === 0
          ? "_none in repo — do not invent_"
          : f.proposed_official_manufacturer_pdp_candidates
              .map(
                (c) =>
                  `\`${c.url}\` (${c.status}; provenance=${c.provenance}; repo_proven=false)`,
              )
              .join("; ")
      }`,
    );
    lines.push(`- exact URL to open: \`${f.owner_browser_checklist.exact_url_to_open ?? "UNKNOWN"}\``);
    lines.push(
      `- exact part number to confirm: **${f.owner_browser_checklist.exact_part_number_to_confirm}**`,
    );
    lines.push(`- confirm direct-buyable: **required**`);
    lines.push(`- confirm official manufacturer source: **required**`);
    lines.push(
      `- wrong-family forbidden: ${
        f.wrong_family_forbidden_tokens.length
          ? f.wrong_family_forbidden_tokens.map((t) => `\`${t}\``).join(", ")
          : "_none listed_"
      }`,
    );
    lines.push(`- supersession_review_required: **${String(f.supersession_review_required)}**`);
    lines.push(`- model slugs helped if PASS: ${f.model_slugs_helped_if_proof_passes.join(", ")}`);
    lines.push("");
    lines.push("Missing proof:");
    for (const item of f.exact_missing_proof) lines.push(`- ${item}`);
    lines.push("");
    lines.push("Screenshot / evidence fields:");
    for (const item of f.owner_browser_checklist.screenshot_evidence_fields_needed) {
      lines.push(`- ${item}`);
    }
    lines.push("");
    lines.push("PASS rules:");
    for (const item of f.owner_browser_checklist.pass_rules) lines.push(`- ${item}`);
    lines.push("");
    lines.push("FAIL rules:");
    for (const item of f.owner_browser_checklist.fail_rules) lines.push(`- ${item}`);
    lines.push("");
    lines.push("UNKNOWN rules:");
    for (const item of f.owner_browser_checklist.unknown_rules) lines.push(`- ${item}`);
    lines.push("");
    lines.push("If proof fails / UNKNOWN, remains blocked:");
    for (const item of f.remains_blocked_if_proof_fails) lines.push(`- ${item}`);
    lines.push("");
  }

  lines.push("## Slugs in scope");
  lines.push("");
  lines.push("| slug | filters awaiting owner proof |");
  lines.push("|---|---|");
  for (const s of report.slug_rows) {
    lines.push(`| ${s.slug} | ${s.filters_awaiting_owner_proof.join(", ")} |`);
  }
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

export function writeBuckpartsFridgeModelPdpOwnerBrowserProofCollectionArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildBuckpartsFridgeModelPdpOwnerBrowserProofCollectionMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
