/**
 * Read-only live / customer-visible proof readiness for the 21 SAFE_BUYER_PATH_PASS fridge PDPs.
 * Does not fetch production HTML, deploy, or mutate buyer paths / inventory / Product JSON-LD.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
  type BuckpartsFridgeCtaGoLinkProofSlugRowV1,
  type BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
} from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
  type BuckpartsFridgePdpRenderedTruthProofPackV1,
} from "./buckparts-fridge-model-pdp-rendered-truth-proof-pack-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_live_customer_visible_proof_readiness_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-live-customer-visible-proof-readiness" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_MD_REL_V1,
  ] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1 =
  21 as const;

/** Static code-path finding: fridge model PDP lacks FilterPdpRepoEvidenceSection. */
export const FRIDGE_MODEL_PDP_CUSTOMER_VISIBLE_PROOF_METADATA_SURFACE_V1 =
  "ABSENT_DEDICATED_MODEL_PDP_PROOF_BLOCK" as const;

/**
 * Proposed homeowner-visible trust metadata contract (copy only; not applied).
 * Avoids OEM overclaim; no Product offer invent; no unsafe CTA promotion.
 */
export const BUCKPARTS_FRIDGE_MODEL_PDP_PROPOSED_VISIBLE_TRUST_METADATA_CONTRACT_V1 = {
  contract_id: "fridge_model_pdp_visible_trust_metadata_v1_proposal",
  applied_to_production: false,
  fields_to_show_homeowners: [
    {
      field: "mapped_filter_numbers",
      homeowner_label: "Filter number(s) to compare",
      notes: "Show the part number(s) listed for this model; ask homeowner to compare to the cartridge they remove.",
    },
    {
      field: "proof_status",
      homeowner_label: "Link check status",
      notes: "Customer-facing status only; never raw enums like direct_buyable.",
    },
    {
      field: "freshness_stamp",
      homeowner_label: "Last checked",
      notes: "YYYY-MM-DD (UTC) from browser_truth_checked_at when present; omit if unknown.",
    },
    {
      field: "verified_link_gate_note",
      homeowner_label: "When a store link appears",
      notes: "Only when a gated safe Verified Link is eligible; never invent or promote unsafe CTAs.",
    },
  ],
  proof_status_format: {
    when_direct_product_page_checked:
      "We checked a direct store product page against this filter number.",
    when_search_placeholder_only:
      "We only found a store search page, not a direct product page, so we are not linking it yet.",
    when_unconfirmed: "We have not confirmed a safe store link yet.",
    forbidden_raw_enums: [
      "direct_buyable",
      "search_placeholder",
      "SAFE_BUYER_PATH_PASS",
      "browser_truth_classification",
    ],
  },
  freshness_stamp_format: {
    display: "Last checked YYYY-MM-DD",
    source: "browser_truth_checked_at ISO → UTC calendar date",
    omit_when_missing: true,
    do_not_claim: ["current price", "current stock", "same-day availability"],
  },
  exact_safe_language: {
    preferred_identity_labels: [
      "Original part",
      "Compatible replacement",
      "Part identity",
      "Original or compatible part",
    ],
    avoid_unless_proven: ["OEM", "genuine OEM", "factory original guaranteed"],
    compare_before_buy:
      "Compare this number to the text on your existing cartridge before you buy.",
    verified_link_when_shown:
      "Shown as a BuckParts Verified Link after we checked the product page against this filter number (YYYY-MM-DD).",
  },
  product_json_ld: {
    invent_offers_authorized: false,
    invent_review_authorized: false,
    invent_aggregate_rating_authorized: false,
    preferred_when_incomplete: "suppress Product JSON-LD rather than fabricate commerce fields",
  },
  buy_cta: {
    unsafe_cta_promotion_authorized: false,
    require_gated_safe_verified_link: true,
    search_placeholder_promotion_authorized: false,
  },
} as const;

export type BuckpartsFridgeLiveHtmlProofStatusV1 =
  | "PROVEN_LIVE_HTML"
  | "UNKNOWN";

export type BuckpartsFridgeVisibleProofMetadataStatusV1 =
  | "EXPOSED"
  | "PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY"
  | "ABSENT";

export type BuckpartsFridgeLiveCustomerVisibleProofReadinessRowV1 = {
  slug: string;
  mapped_filters: string[];
  safe_go_link_ids: string[];
  buyer_path_proof_source_artifact: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
  rendered_mapping_proof_source_artifact: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1;
  buyer_path_proof_generated_at: string | null;
  rendered_mapping_proof_generated_at: string | null;
  freshness_check_timestamp_available_from_proof: string | null;
  page_exposes_proof_metadata_visibly_to_homeowner: boolean;
  visible_proof_metadata_status: BuckpartsFridgeVisibleProofMetadataStatusV1;
  visible_metadata_gaps: string[];
  live_html_proof_status: BuckpartsFridgeLiveHtmlProofStatusV1;
  ready_for_future_production_live_proof_pass: boolean;
  notes: string[];
};

export type BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  owner_decisions_mutation_authorized: false;
  deploy_authorized: false;
  live_production_fetch_enabled: false;
  live_html_claimed: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_SOURCE_COMMAND_V1;
  cta_go_proof_pack_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
  rendered_truth_pack_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1;
  scope: {
    slug_count: number;
    slugs: string[];
    excluded_fail_slugs: string[];
    excluded_quarantined_slugs: string[];
    excluded_partial_slugs: readonly string[];
  };
  summary: {
    SAFE_BUYER_PATH_PASS_scoped: number;
    page_exposes_proof_metadata_visibly_count: number;
    live_html_proven_count: number;
    live_html_unknown_count: number;
    ready_for_future_live_proof_pass_count: number;
    visible_metadata_gap_count: number;
  };
  rows: BuckpartsFridgeLiveCustomerVisibleProofReadinessRowV1[];
  proposed_visible_trust_metadata_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_PROPOSED_VISIBLE_TRUST_METADATA_CONTRACT_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
  recommended_next_move: string;
};

export type BuildBuckpartsFridgeLiveCustomerVisibleProofReadinessDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadCtaGoProofPack?: () => BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
  loadRenderedTruthPack?: () => BuckpartsFridgePdpRenderedTruthProofPackV1;
  /** Override code inspection of model-PDP visible proof surface (tests). */
  modelPdpVisibleProofMetadataStatus?: BuckpartsFridgeVisibleProofMetadataStatusV1;
  /** Only set true when a live HTML proof artifact is supplied (never invent). */
  liveHtmlProofBySlug?: Record<string, BuckpartsFridgeLiveHtmlProofStatusV1>;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function loadCtaGoProofPackFromDiskV1(
  rootDir: string,
): BuckpartsFridgeModelPdpCtaGoLinkProofPackV1 {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing CTA/go proof pack: ${BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1}`);
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsFridgeModelPdpCtaGoLinkProofPackV1;
}

export function loadRenderedTruthPackFromDiskV1(
  rootDir: string,
): BuckpartsFridgePdpRenderedTruthProofPackV1 {
  const abs = path.join(rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(
      `missing rendered-truth pack: ${BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1}`,
    );
  }
  return JSON.parse(readFileSync(abs, "utf8")) as BuckpartsFridgePdpRenderedTruthProofPackV1;
}

export function loadSafeBuyerPathPassRowsFromCtaGoProofV1(
  pack: BuckpartsFridgeModelPdpCtaGoLinkProofPackV1,
): BuckpartsFridgeCtaGoLinkProofSlugRowV1[] {
  return pack.rows
    .filter((r) => r.verdict === "SAFE_BUYER_PATH_PASS")
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function classifyModelPdpVisibleProofMetadataFromCodeSurfaceV1(): BuckpartsFridgeVisibleProofMetadataStatusV1 {
  // Fridge model PDP uses TrustAwareBuySection / TieredBuyLinks footnote when
  // browser_truth_checked_at is present, but lacks FilterPdpRepoEvidenceSection
  // (filter PDP only). Dedicated customer-visible proof metadata block = absent;
  // footnote alone = partial.
  void FRIDGE_MODEL_PDP_CUSTOMER_VISIBLE_PROOF_METADATA_SURFACE_V1;
  return "PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY";
}

function visibleMetadataGapsForStatus(
  status: BuckpartsFridgeVisibleProofMetadataStatusV1,
): string[] {
  if (status === "EXPOSED") return [];
  const gaps = [
    "Fridge model PDP lacks a dedicated homeowner-facing proof metadata block (FilterPdpRepoEvidenceSection exists on filter PDPs only).",
    "Proposed trust fields not yet rendered on /fridge/[slug]: proof status line, explicit Last checked stamp block, compare-before-buy proof framing.",
  ];
  if (status === "PARTIAL_VERIFIED_LINK_FOOTNOTE_ONLY") {
    gaps.push(
      "Verified Link buy footnote may show a check date when browser_truth_checked_at is present, but that is not a full visible proof metadata surface.",
    );
  }
  return gaps;
}

export function buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1(
  deps: BuildBuckpartsFridgeLiveCustomerVisibleProofReadinessDepsV1,
): BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1 {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const ctaPack = deps.loadCtaGoProofPack
    ? deps.loadCtaGoProofPack()
    : loadCtaGoProofPackFromDiskV1(deps.rootDir);
  const renderedPack = deps.loadRenderedTruthPack
    ? deps.loadRenderedTruthPack()
    : loadRenderedTruthPackFromDiskV1(deps.rootDir);

  const passRows = loadSafeBuyerPathPassRowsFromCtaGoProofV1(ctaPack);
  if (passRows.length !== BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1) {
    throw new Error(
      `expected ${String(BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1)} SAFE_BUYER_PATH_PASS rows; got ${String(passRows.length)}`,
    );
  }

  const failSlugs = ctaPack.rows
    .filter((r) => r.verdict === "SAFE_BUYER_PATH_FAIL")
    .map((r) => r.slug)
    .sort();
  const quarantined = [...(ctaPack.scope.excluded_quarantined_slugs ?? [])]
    .map(normalizeSlug)
    .sort();
  const partial = [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1];

  const visibleStatus =
    deps.modelPdpVisibleProofMetadataStatus ??
    classifyModelPdpVisibleProofMetadataFromCodeSurfaceV1();
  const gaps = visibleMetadataGapsForStatus(visibleStatus);
  const exposesVisibly = visibleStatus === "EXPOSED";

  const liveBySlug = deps.liveHtmlProofBySlug ?? {};

  const rows: BuckpartsFridgeLiveCustomerVisibleProofReadinessRowV1[] = passRows.map((pass) => {
    const slug = normalizeSlug(pass.slug);
    if (failSlugs.includes(slug)) {
      throw new Error(`PASS scope leaked FAIL slug: ${slug}`);
    }
    if (quarantined.includes(slug)) {
      throw new Error(`PASS scope leaked quarantined slug: ${slug}`);
    }
    if (partial.includes(slug)) {
      throw new Error(`PASS scope leaked PARTIAL slug: ${slug}`);
    }

    const live_html_proof_status: BuckpartsFridgeLiveHtmlProofStatusV1 =
      liveBySlug[slug] === "PROVEN_LIVE_HTML" ? "PROVEN_LIVE_HTML" : "UNKNOWN";

    const freshness =
      ctaPack.generated_at ??
      renderedPack.generated_at ??
      null;

    const ready =
      pass.verdict === "SAFE_BUYER_PATH_PASS" &&
      pass.safe_go_link_ids.length > 0 &&
      pass.rendered_filter_slugs.length > 0 &&
      live_html_proof_status === "UNKNOWN";

    return {
      slug,
      mapped_filters: [...pass.rendered_filter_slugs],
      safe_go_link_ids: [...pass.safe_go_link_ids],
      buyer_path_proof_source_artifact: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
      rendered_mapping_proof_source_artifact:
        BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
      buyer_path_proof_generated_at: ctaPack.generated_at ?? null,
      rendered_mapping_proof_generated_at: renderedPack.generated_at ?? null,
      freshness_check_timestamp_available_from_proof: freshness,
      page_exposes_proof_metadata_visibly_to_homeowner: exposesVisibly,
      visible_proof_metadata_status: visibleStatus,
      visible_metadata_gaps: [...gaps],
      live_html_proof_status,
      ready_for_future_production_live_proof_pass: ready,
      notes: [
        "Backend SAFE_BUYER_PATH_PASS from CTA/go proof pack (local data-path).",
        "Live production HTML not fetched in this lane; live_html_proof_status remains UNKNOWN unless an external live proof artifact is supplied.",
        "Do not claim live HTML CTA or conversion from this readiness report.",
        ...pass.notes.filter((n) => n.includes("not live HTML")),
      ],
    };
  });

  const expectedSorted = rows.map((r) => r.slug);
  const summary = {
    SAFE_BUYER_PATH_PASS_scoped: rows.length,
    page_exposes_proof_metadata_visibly_count: rows.filter(
      (r) => r.page_exposes_proof_metadata_visibly_to_homeowner,
    ).length,
    live_html_proven_count: rows.filter((r) => r.live_html_proof_status === "PROVEN_LIVE_HTML")
      .length,
    live_html_unknown_count: rows.filter((r) => r.live_html_proof_status === "UNKNOWN").length,
    ready_for_future_live_proof_pass_count: rows.filter(
      (r) => r.ready_for_future_production_live_proof_pass,
    ).length,
    visible_metadata_gap_count: rows.filter((r) => r.visible_metadata_gaps.length > 0).length,
  };

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_decisions_mutation_authorized: false,
    deploy_authorized: false,
    live_production_fetch_enabled: false,
    live_html_claimed: false,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_SOURCE_COMMAND_V1,
    cta_go_proof_pack_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
    rendered_truth_pack_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_RENDERED_TRUTH_PROOF_JSON_REL_V1,
    scope: {
      slug_count: rows.length,
      slugs: expectedSorted,
      excluded_fail_slugs: failSlugs,
      excluded_quarantined_slugs: quarantined,
      excluded_partial_slugs: partial,
    },
    summary,
    rows,
    proposed_visible_trust_metadata_contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_PROPOSED_VISIBLE_TRUST_METADATA_CONTRACT_V1,
    proven_facts: [
      "PROVEN: read_only=true; deploy_authorized=false; live_production_fetch_enabled=false; live_html_claimed=false.",
      `PROVEN: exact scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_EXPECTED_SLUG_COUNT_V1)} SAFE_BUYER_PATH_PASS slugs from CTA/go proof pack.`,
      `PROVEN: excluded FAIL=${String(failSlugs.length)}; quarantined=${String(quarantined.length)}; PARTIAL=${String(partial.length)}.`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: fridge model PDP has no dedicated customer-visible proof metadata block equivalent to filter PDP FilterPdpRepoEvidenceSection (code surface).",
      "PROVEN: proposed visible trust metadata contract forbids Product JSON-LD offer invent and unsafe CTA promotion.",
    ],
    unknown_facts: [
      "UNKNOWN: Live production HTML for the 21 SAFE_BUYER_PATH_PASS fridge PDPs (no fetch in this lane).",
      "UNKNOWN: Homeowner-visible rendering of the proposed trust metadata block until a future UI + live HTML proof pass.",
    ],
    risk_notes: [
      "This readiness lane does not authorize deploy, Supabase/CSV/retailer_links mutation, buy CTA changes, sitemap/robots, Product JSON-LD, or owner-decision edits.",
      "Do not claim live HTML proof from backend SAFE_BUYER_PATH_PASS alone.",
      "Do not use 'OEM' in customer-visible trust copy unless identity is proven; prefer Original part / Compatible replacement labels.",
      "Do not invent Product offers, review, or aggregateRating.",
    ],
    recommended_next_move:
      "Owner-approved UI prototype of the proposed visible trust metadata block on fridge model PDPs (read-only language; no CTA expansion), then a guarded live HTML proof pass for the same 21 slugs that asserts visible metadata + gated Verified Link presence without claiming conversion.",
  };
}

export function buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessMarkdownV1(
  report: BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1,
): string {
  const c = report.proposed_visible_trust_metadata_contract;
  const lines: string[] = [
    "# BuckParts fridge model PDP live / customer-visible proof readiness v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- deploy_authorized: **false**`,
    `- live_production_fetch_enabled: **false**`,
    `- live_html_claimed: **false**`,
    `- slug_count: **${String(report.scope.slug_count)}** (SAFE_BUYER_PATH_PASS only)`,
    `- excluded FAIL: ${report.scope.excluded_fail_slugs.join(", ") || "(none)"}`,
    `- excluded quarantined: ${String(report.scope.excluded_quarantined_slugs.length)}`,
    `- excluded PARTIAL: ${report.scope.excluded_partial_slugs.join(", ")}`,
    "",
    "## Summary",
    "",
    `- SAFE_BUYER_PATH_PASS_scoped: ${String(report.summary.SAFE_BUYER_PATH_PASS_scoped)}`,
    `- page_exposes_proof_metadata_visibly_count: ${String(report.summary.page_exposes_proof_metadata_visibly_count)}`,
    `- live_html_proven_count: ${String(report.summary.live_html_proven_count)}`,
    `- live_html_unknown_count: ${String(report.summary.live_html_unknown_count)}`,
    `- ready_for_future_live_proof_pass_count: ${String(report.summary.ready_for_future_live_proof_pass_count)}`,
    `- visible_metadata_gap_count: ${String(report.summary.visible_metadata_gap_count)}`,
    "",
    "## Recommended next move",
    "",
    report.recommended_next_move,
    "",
    "## Proposed visible trust metadata contract (not applied)",
    "",
    `- applied_to_production: **${String(c.applied_to_production)}**`,
    `- invent_offers_authorized: **${String(c.product_json_ld.invent_offers_authorized)}**`,
    `- unsafe_cta_promotion_authorized: **${String(c.buy_cta.unsafe_cta_promotion_authorized)}**`,
    "",
    "### Fields",
    "",
  ];
  for (const f of c.fields_to_show_homeowners) {
    lines.push(`- **${f.homeowner_label}** (\`${f.field}\`): ${f.notes}`);
  }
  lines.push(
    "",
    "### Proof status language",
    "",
    `- direct product page: "${c.proof_status_format.when_direct_product_page_checked}"`,
    `- search only: "${c.proof_status_format.when_search_placeholder_only}"`,
    `- unconfirmed: "${c.proof_status_format.when_unconfirmed}"`,
    "",
    "### Freshness",
    "",
    `- format: \`${c.freshness_stamp_format.display}\``,
    `- source: ${c.freshness_stamp_format.source}`,
    "",
    "### Safe identity language",
    "",
    `- prefer: ${c.exact_safe_language.preferred_identity_labels.join(" / ")}`,
    `- avoid unless proven: ${c.exact_safe_language.avoid_unless_proven.join("; ")}`,
    "",
    "## Slugs (21)",
    "",
    "| slug | filters | safe go-link IDs | visible metadata | live HTML | ready future live |",
    "|---|---|---|---|---|---|",
  );
  for (const row of report.rows) {
    lines.push(
      `| ${row.slug} | ${row.mapped_filters.join(", ")} | ${row.safe_go_link_ids.join(", ")} | ${row.visible_proof_metadata_status} | ${row.live_html_proof_status} | ${String(row.ready_for_future_production_live_proof_pass)} |`,
    );
  }
  lines.push("", "## Proven facts", "");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("", "## Unknown facts", "");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("", "## Risk notes", "");
  for (const n of report.risk_notes) lines.push(`- ${n}`);
  lines.push("");
  return lines.join("\n");
}

export function writeBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("live customer-visible proof readiness write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildBuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
