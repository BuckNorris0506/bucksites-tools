/**
 * Read-only owner browser proof RESULT packet for MWFP / XWFE / XWF after Jared’s
 * screenshot review. Records classifications only — does not authorize apply, link
 * promotion, or CSV/Supabase/buy CTA mutation. XWF is SUPERSEDED_TO_XWFE_PROVEN
 * (not clean direct XWF buy PASS) and requires a separate supersession-safe lane.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1,
  type BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-collection-packet-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_owner_browser_proof_result_packet_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-owner-browser-proof-result-packet" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SLUGS_V1 = [
  ...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_SLUGS_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_FILTERS_V1 = [
  ...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_FILTERS_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1 =
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;

export type OwnerBrowserProofFilterClassificationV1 =
  | "OWNER_BROWSER_PASS"
  | "SUPERSEDED_TO_XWFE_PROVEN";

export type OwnerBrowserProofSlugClosureStatusV1 =
  | "POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF"
  | "BLOCKED_BY_XWF_SUPERSESSION_POLICY";

/** Jared-recorded owner browser observations (screenshots). Not an auto-PASS grant for apply. */
export const OWNER_BROWSER_PROOF_OBSERVATIONS_V1 = [
  {
    filter_slug: "smartwater-mwfp",
    oem_part_token: "MWFP",
    url_shown: "https://www.geapplianceparts.com/store/parts/spec/MWFP",
    official_ge_parts_page_visible: true,
    product_title_shown: "GE MWF Refrigerator Water Filter",
    part_shown: "MWFP",
    add_to_cart_visible: true,
    classification: "OWNER_BROWSER_PASS" as const,
    clean_direct_buy_pass: true,
    superseded_to_xwfe_proven: false,
    notes: [
      "Owner screenshot: official GE Appliance Parts spec PDP for MWFP with Add to Cart.",
      "Title shows GE MWF Refrigerator Water Filter; part identity shown as MWFP.",
    ],
  },
  {
    filter_slug: "xwfe",
    oem_part_token: "XWFE",
    url_shown: "https://www.geapplianceparts.com/store/parts/spec/XWFE",
    official_ge_parts_page_visible: true,
    product_title_shown: "GE XWFE Refrigerator Water Filter",
    part_shown: "XWFE",
    add_to_cart_visible: true,
    classification: "OWNER_BROWSER_PASS" as const,
    clean_direct_buy_pass: true,
    superseded_to_xwfe_proven: false,
    notes: [
      "Owner screenshot: official GE Appliance Parts spec PDP for XWFE with Add to Cart.",
      "Exact XWFE identity proven on official manufacturer path.",
    ],
  },
  {
    filter_slug: "xwf",
    oem_part_token: "XWF",
    url_shown: "https://www.geapplianceparts.com/store/parts/spec/XWF",
    official_ge_parts_page_visible: true,
    product_title_shown: "GE XWFE Refrigerator Water Filter",
    part_shown: "XWFE",
    add_to_cart_visible: true,
    classification: "SUPERSEDED_TO_XWFE_PROVEN" as const,
    clean_direct_buy_pass: false,
    superseded_to_xwfe_proven: true,
    supersession_message_proven:
      "Part XWF has been superseded to Part XWFE" as const,
    notes: [
      "Owner screenshot: /store/parts/spec/XWF page shows supersession of XWF → XWFE.",
      "Product title and Add to Cart are for XWFE, not a clean direct XWF buy PASS.",
      "Do not promote XWF as a direct XWF buy link.",
      "Requires a separate supersession-safe approval/apply lane before any public buyer-path promotion involving XWF.",
    ],
  },
] as const;

export type OwnerBrowserProofResultFilterRowV1 = {
  filter_slug: string;
  oem_part_token: string;
  classification: OwnerBrowserProofFilterClassificationV1;
  url_shown: string;
  official_ge_parts_page_visible: boolean;
  product_title_shown: string;
  part_shown: string;
  add_to_cart_visible: boolean;
  clean_direct_buy_pass: boolean;
  superseded_to_xwfe_proven: boolean;
  supersession_message_proven: string | null;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  link_promotion_authorized: false;
  buy_cta_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  owner_approval_authorized: false;
  supersession_safe_apply_lane_required: boolean;
  model_slugs_mapped: string[];
  notes: string[];
};

export type OwnerBrowserProofResultSlugRowV1 = {
  slug: string;
  mapped_filter_slugs: string[];
  mapped_filters_with_owner_browser_pass: string[];
  mapped_filters_superseded_to_xwfe: string[];
  has_xwf_mapping: boolean;
  closure_status: OwnerBrowserProofSlugClosureStatusV1;
  potentially_closable_via_mwfp_xwfe_proof: boolean;
  blocked_by_xwf_supersession_policy: boolean;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  buy_cta_authorized: false;
  link_promotion_authorized: false;
  notes: string[];
};

export type BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1;
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
  apply_authorized: false;
  xwf_direct_buy_promotion_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SOURCE_COMMAND_V1;
  source_artifacts: {
    owner_browser_proof_collection_packet_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1;
  };
  scope: {
    slug_count: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1;
    filter_count: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1;
    slugs: readonly string[];
    filters: readonly string[];
    excluded_remain_no_buy_slug: typeof BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1;
  };
  summary: {
    OWNER_BROWSER_PASS: number;
    SUPERSEDED_TO_XWFE_PROVEN: number;
    clean_direct_buy_pass_filters: number;
    potentially_closable_slugs: number;
    blocked_by_xwf_supersession_slugs: number;
  };
  filter_rows: OwnerBrowserProofResultFilterRowV1[];
  slug_rows: OwnerBrowserProofResultSlugRowV1[];
  potentially_closable_slugs: string[];
  blocked_by_xwf_supersession_slugs: string[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildOwnerBrowserProofResultDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadCollectionPacket?: () => BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1;
  evidenceExists?: (relPath: string) => boolean;
  readText?: (abs: string) => string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function defaultLoadCollection(
  rootDir: string,
  readText: (abs: string) => string,
): BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1 {
  const rel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) {
    throw new Error(`missing owner browser proof collection packet: ${rel}`);
  }
  return JSON.parse(
    readText(abs),
  ) as BuckpartsFridgeModelPdpOwnerBrowserProofCollectionPacketV1;
}

export function classifySlugClosureFromMwfpXwfeProofV1(args: {
  mapped_filter_slugs: string[];
}): {
  closure_status: OwnerBrowserProofSlugClosureStatusV1;
  potentially_closable_via_mwfp_xwfe_proof: boolean;
  blocked_by_xwf_supersession_policy: boolean;
  mapped_filters_with_owner_browser_pass: string[];
  mapped_filters_superseded_to_xwfe: string[];
  has_xwf_mapping: boolean;
  notes: string[];
} {
  const mapped = sortedUnique(args.mapped_filter_slugs);
  const has_xwf_mapping = mapped.includes("xwf");
  const passSet = new Set(
    OWNER_BROWSER_PROOF_OBSERVATIONS_V1.filter(
      (o) => o.classification === "OWNER_BROWSER_PASS",
    ).map((o) => o.filter_slug),
  );
  const supersededSet = new Set(
    OWNER_BROWSER_PROOF_OBSERVATIONS_V1.filter(
      (o) => o.classification === "SUPERSEDED_TO_XWFE_PROVEN",
    ).map((o) => o.filter_slug),
  );

  const mapped_filters_with_owner_browser_pass = mapped.filter((f) => passSet.has(f));
  const mapped_filters_superseded_to_xwfe = mapped.filter((f) => supersededSet.has(f));

  // Fail-closed: any XWF mapping blocks slug closure until supersession-safe lane,
  // even if XWFE also PASSed.
  if (has_xwf_mapping) {
    return {
      closure_status: "BLOCKED_BY_XWF_SUPERSESSION_POLICY",
      potentially_closable_via_mwfp_xwfe_proof: false,
      blocked_by_xwf_supersession_policy: true,
      mapped_filters_with_owner_browser_pass,
      mapped_filters_superseded_to_xwfe,
      has_xwf_mapping,
      notes: [
        "Fail-closed: mapped filter xwf requires supersession-safe approval/apply lane before public buyer-path promotion.",
        "XWFE OWNER_BROWSER_PASS alone does not clear XWF supersession policy for this slug.",
        "Do not promote XWF as a direct XWF buy link.",
      ],
    };
  }

  const nonPassMapped = mapped.filter((f) => !passSet.has(f));
  if (nonPassMapped.length > 0) {
    return {
      closure_status: "BLOCKED_BY_XWF_SUPERSESSION_POLICY",
      potentially_closable_via_mwfp_xwfe_proof: false,
      blocked_by_xwf_supersession_policy: true,
      mapped_filters_with_owner_browser_pass,
      mapped_filters_superseded_to_xwfe,
      has_xwf_mapping,
      notes: [
        `Fail-closed: mapped filters lacking OWNER_BROWSER_PASS: ${nonPassMapped.join(", ")}.`,
      ],
    };
  }

  return {
    closure_status: "POTENTIALLY_CLOSABLE_VIA_MWFP_XWFE_PROOF",
    potentially_closable_via_mwfp_xwfe_proof: true,
    blocked_by_xwf_supersession_policy: false,
    mapped_filters_with_owner_browser_pass,
    mapped_filters_superseded_to_xwfe,
    has_xwf_mapping,
    notes: [
      "All mapped filters in scope have OWNER_BROWSER_PASS (MWFP and/or XWFE).",
      "Potentially closable only after a separate founder-gated apply/approval lane — this result packet does not authorize apply.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1(
  deps: BuildOwnerBrowserProofResultDepsV1,
): BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1 {
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const evidenceExists =
    deps.evidenceExists ?? ((rel) => existsSync(path.join(deps.rootDir, rel)));
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();

  if (!evidenceExists(BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1)) {
    throw new Error(
      `missing collection packet: ${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1}`,
    );
  }

  const collection =
    deps.loadCollectionPacket?.() ?? defaultLoadCollection(deps.rootDir, readText);

  const expectedSlugs = new Set(
    BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SLUGS_V1.map(normalizeSlug),
  );
  const expectedFilters = new Set(
    BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_FILTERS_V1.map(normalizeSlug),
  );

  const slugMapped = new Map<string, string[]>();
  for (const row of collection.slug_rows ?? []) {
    const slug = normalizeSlug(row.slug);
    if (!expectedSlugs.has(slug)) continue;
    slugMapped.set(
      slug,
      sortedUnique(row.mapped_filter_slugs ?? []).filter((f) => expectedFilters.has(f)),
    );
  }
  for (const slug of expectedSlugs) {
    if (!slugMapped.has(slug)) {
      throw new Error(`collection packet missing expected slug ${slug}`);
    }
  }

  const filterToSlugs = new Map<string, string[]>();
  for (const [slug, filters] of slugMapped) {
    for (const f of filters) {
      const list = filterToSlugs.get(f) ?? [];
      list.push(slug);
      filterToSlugs.set(f, list);
    }
  }
  for (const [f, list] of filterToSlugs) {
    filterToSlugs.set(f, sortedUnique(list));
  }

  const obsByFilter = new Map(
    OWNER_BROWSER_PROOF_OBSERVATIONS_V1.map((o) => [o.filter_slug, o]),
  );

  const filter_rows: OwnerBrowserProofResultFilterRowV1[] = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_FILTERS_V1,
  ]
    .map((filter_slug) => {
      const obs = obsByFilter.get(filter_slug);
      if (!obs) {
        throw new Error(`missing owner observation for filter ${filter_slug}`);
      }
      const isSuperseded = obs.classification === "SUPERSEDED_TO_XWFE_PROVEN";
      return {
        filter_slug,
        oem_part_token: obs.oem_part_token,
        classification: obs.classification,
        url_shown: obs.url_shown,
        official_ge_parts_page_visible: obs.official_ge_parts_page_visible,
        product_title_shown: obs.product_title_shown,
        part_shown: obs.part_shown,
        add_to_cart_visible: obs.add_to_cart_visible,
        clean_direct_buy_pass: obs.clean_direct_buy_pass,
        superseded_to_xwfe_proven: obs.superseded_to_xwfe_proven,
        supersession_message_proven:
          "supersession_message_proven" in obs ? obs.supersession_message_proven : null,
        invent_link_authorized: false as const,
        auto_promote_authorized: false as const,
        link_promotion_authorized: false as const,
        buy_cta_authorized: false as const,
        csv_apply_authorized: false as const,
        retailer_links_mutation_authorized: false as const,
        owner_approval_authorized: false as const,
        supersession_safe_apply_lane_required: isSuperseded,
        model_slugs_mapped: filterToSlugs.get(filter_slug) ?? [],
        notes: [...obs.notes],
      };
    })
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const slug_rows: OwnerBrowserProofResultSlugRowV1[] = [...expectedSlugs]
    .sort()
    .map((slug) => {
      const mapped = slugMapped.get(slug) ?? [];
      const closure = classifySlugClosureFromMwfpXwfeProofV1({
        mapped_filter_slugs: mapped,
      });
      return {
        slug,
        mapped_filter_slugs: mapped,
        mapped_filters_with_owner_browser_pass: closure.mapped_filters_with_owner_browser_pass,
        mapped_filters_superseded_to_xwfe: closure.mapped_filters_superseded_to_xwfe,
        has_xwf_mapping: closure.has_xwf_mapping,
        closure_status: closure.closure_status,
        potentially_closable_via_mwfp_xwfe_proof:
          closure.potentially_closable_via_mwfp_xwfe_proof,
        blocked_by_xwf_supersession_policy: closure.blocked_by_xwf_supersession_policy,
        invent_link_authorized: false as const,
        auto_promote_authorized: false as const,
        buy_cta_authorized: false as const,
        link_promotion_authorized: false as const,
        notes: closure.notes,
      };
    });

  if (
    slug_rows.some(
      (r) =>
        r.slug ===
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    )
  ) {
    throw new Error("ge-gte18gsnrss remain-no-buy must stay excluded");
  }

  const potentially_closable_slugs = slug_rows
    .filter((r) => r.potentially_closable_via_mwfp_xwfe_proof)
    .map((r) => r.slug);
  const blocked_by_xwf_supersession_slugs = slug_rows
    .filter((r) => r.blocked_by_xwf_supersession_policy)
    .map((r) => r.slug);

  const summary = {
    OWNER_BROWSER_PASS: filter_rows.filter((f) => f.classification === "OWNER_BROWSER_PASS")
      .length,
    SUPERSEDED_TO_XWFE_PROVEN: filter_rows.filter(
      (f) => f.classification === "SUPERSEDED_TO_XWFE_PROVEN",
    ).length,
    clean_direct_buy_pass_filters: filter_rows.filter((f) => f.clean_direct_buy_pass).length,
    potentially_closable_slugs: potentially_closable_slugs.length,
    blocked_by_xwf_supersession_slugs: blocked_by_xwf_supersession_slugs.length,
  };

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
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
    apply_authorized: false,
    xwf_direct_buy_promotion_authorized: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SOURCE_COMMAND_V1,
    source_artifacts: {
      owner_browser_proof_collection_packet_rel:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_JSON_REL_V1,
    },
    scope: {
      slug_count: BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_SLUG_COUNT_V1,
      filter_count:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_COLLECTION_EXPECTED_FILTER_COUNT_V1,
      slugs: [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_SLUGS_V1],
      filters: [...BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_FILTERS_V1],
      excluded_remain_no_buy_slug:
        BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_EXCLUDED_REMAIN_NO_BUY_SLUG_V1,
    },
    summary,
    filter_rows,
    slug_rows,
    potentially_closable_slugs,
    blocked_by_xwf_supersession_slugs,
    proven_facts: [
      "PROVEN: read_only=true; apply_authorized=false; invent_link_authorized=false; link_promotion_authorized=false; xwf_direct_buy_promotion_authorized=false.",
      "PROVEN: smartwater-mwfp classification=OWNER_BROWSER_PASS (official GE /store/parts/spec/MWFP; Add to Cart visible).",
      "PROVEN: xwfe classification=OWNER_BROWSER_PASS (official GE /store/parts/spec/XWFE; Add to Cart visible).",
      "PROVEN: xwf classification=SUPERSEDED_TO_XWFE_PROVEN (not clean direct XWF buy PASS).",
      `PROVEN: potentially_closable_slugs=${JSON.stringify(potentially_closable_slugs)}.`,
      `PROVEN: blocked_by_xwf_supersession_slugs=${JSON.stringify(blocked_by_xwf_supersession_slugs)}.`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
    ],
    unknown_facts: [
      "UNKNOWN: future founder approval / apply outcomes for MWFP and XWFE retailer_links.",
      "UNKNOWN: supersession-safe XWF→XWFE public promotion policy until a separate lane exists.",
      "UNKNOWN: conversion/revenue impact (not claimed).",
    ],
    risk_notes: [
      "This packet records owner browser proof only — does not mutate Supabase, CSV, retailer_links, buy CTA, sitemap, robots, Product JSON-LD, owner decisions, or deploy config.",
      "Do not promote XWF as a direct XWF buy link.",
      "XWF requires a separate supersession-safe approval/apply lane before any public buyer-path promotion.",
      "ge-gte18gsnrss remains out of scope (remain-no-buy).",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpOwnerBrowserProofResultMarkdownV1(
  report: BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP owner browser proof result packet v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- apply_authorized: **false**`,
    `- invent_link_authorized: **false**`,
    `- link_promotion_authorized: **false**`,
    `- xwf_direct_buy_promotion_authorized: **false**`,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    `- filter_count: **${String(report.scope.filter_count)}**`,
    "",
    "## Summary",
    "",
    `- OWNER_BROWSER_PASS: ${String(report.summary.OWNER_BROWSER_PASS)}`,
    `- SUPERSEDED_TO_XWFE_PROVEN: ${String(report.summary.SUPERSEDED_TO_XWFE_PROVEN)}`,
    `- clean_direct_buy_pass_filters: ${String(report.summary.clean_direct_buy_pass_filters)}`,
    `- potentially_closable_slugs: ${String(report.summary.potentially_closable_slugs)}`,
    `- blocked_by_xwf_supersession_slugs: ${String(report.summary.blocked_by_xwf_supersession_slugs)}`,
    "",
    "## Per-filter classification",
    "",
  ];

  for (const f of report.filter_rows) {
    lines.push(`### \`${f.filter_slug}\` (${f.oem_part_token})`);
    lines.push("");
    lines.push(`- classification: **${f.classification}**`);
    lines.push(`- url_shown: \`${f.url_shown}\``);
    lines.push(`- product_title_shown: ${f.product_title_shown}`);
    lines.push(`- part_shown: **${f.part_shown}**`);
    lines.push(`- add_to_cart_visible: **${String(f.add_to_cart_visible)}**`);
    lines.push(`- clean_direct_buy_pass: **${String(f.clean_direct_buy_pass)}**`);
    lines.push(`- superseded_to_xwfe_proven: **${String(f.superseded_to_xwfe_proven)}**`);
    if (f.supersession_message_proven) {
      lines.push(`- supersession message: ${f.supersession_message_proven}`);
    }
    lines.push(
      `- supersession_safe_apply_lane_required: **${String(f.supersession_safe_apply_lane_required)}**`,
    );
    lines.push(`- link_promotion_authorized: **false**`);
    lines.push(`- mapped model slugs: ${f.model_slugs_mapped.join(", ") || "_none_"}`);
    for (const n of f.notes) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push("## Slug closure (fail-closed)");
  lines.push("");
  lines.push(
    `### Potentially closable via MWFP/XWFE proof (${String(report.potentially_closable_slugs.length)})`,
  );
  lines.push("");
  for (const slug of report.potentially_closable_slugs) lines.push(`- \`${slug}\``);
  lines.push("");
  lines.push(
    `### Still blocked by XWF supersession policy (${String(report.blocked_by_xwf_supersession_slugs.length)})`,
  );
  lines.push("");
  for (const slug of report.blocked_by_xwf_supersession_slugs) lines.push(`- \`${slug}\``);
  lines.push("");
  lines.push("| slug | mapped filters | closure_status |");
  lines.push("|---|---|---|");
  for (const s of report.slug_rows) {
    lines.push(
      `| ${s.slug} | ${s.mapped_filter_slugs.join(", ")} | ${s.closure_status} |`,
    );
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

export function writeBuckpartsFridgeModelPdpOwnerBrowserProofResultArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildBuckpartsFridgeModelPdpOwnerBrowserProofResultMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
