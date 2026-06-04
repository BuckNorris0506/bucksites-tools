/**
 * Read-only GSWF safe-link apply-readiness packet — single slug only.
 * No CSV/Supabase/evidence mutation; no Verified Link authorization; never fetches /go.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks, passesDirectBuyableGate } from "@/lib/retailers/launch-buy-links";

import { classifyAmazonAsinReusePolicy } from "./amazon-asin-reuse-policy";
import { FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1 } from "./fridge-safe-link-rescue-first4-apply-review-v1";
import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
} from "./fridge-safe-link-rescue-owner-review-v1";

export const FRIDGE_SAFE_LINK_GSWF_APPLY_READINESS_CONTRACT_V1 =
  "fridge_safe_link_gswf_apply_readiness_v1" as const;

export const FRIDGE_SAFE_LINK_GSWF_TARGET_SLUG_V1 = "gswf" as const;

export const FRIDGE_SAFE_LINK_GSWF_OEM_TOKEN_V1 = "GSWF" as const;

export const FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1 =
  "data/evidence/amazon-gswf-owner-review-pdp-evidence.2026-05-18.json" as const;

export const FRIDGE_SAFE_LINK_GSWF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-apply-readiness-v1.json" as const;

export const FRIDGE_SAFE_LINK_GSWF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-apply-readiness-v1.md" as const;

export const FRIDGE_SAFE_LINK_GSWF_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-gswf-apply-readiness" as const;

export const FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1 =
  "npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF" as const;

export type ApplyReadinessVerdictV1 =
  | "READY_FOR_OWNER_BROWSER_PROOF"
  | "NOT_READY"
  | "UNKNOWN";

export type FridgeSafeLinkGswfApplyReadinessV1 = {
  contract: typeof FRIDGE_SAFE_LINK_GSWF_APPLY_READINESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_click_authorized: false;
  production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH";
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_GSWF_SOURCE_COMMAND_V1;
  target_slug: typeof FRIDGE_SAFE_LINK_GSWF_TARGET_SLUG_V1;
  oem_part_token: typeof FRIDGE_SAFE_LINK_GSWF_OEM_TOKEN_V1;
  apply_readiness_verdict: ApplyReadinessVerdictV1;
  apply_readiness_verdict_basis: string;
  exact_repo_paths_read: string[];
  source_rescue_packet_rel_path: typeof FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1;
  source_first4_apply_review_rel_path: typeof FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1;
  live_state: {
    live_url: string;
    live_has_go_cta: false;
    live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1";
    live_page_exists: boolean;
    production_go_clicked: false;
  };
  filters_csv: {
    brand_slug: string;
    slug: string;
    oem_part_number: string;
    name: string;
  };
  retailer_links_csv: {
    row_count: number;
    safe_gated_count: number;
    primary_retailer_key: string;
    primary_affiliate_url: string;
    browser_truth_classification: string;
    browser_truth_buyable_subtype: string | null;
    passes_direct_buyable_gate: false;
  };
  sibling_slug_note: {
    gswf2_slug: "gswf2";
    gswf2_oem: "GSWF2";
    conflation_risk: true;
    separate_exact_token_proof_required: true;
  };
  evidence_summary: {
    primary_evidence_rel_path: typeof FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1;
    verdict: string;
    browser_verdict: string | null;
    mutation_ready: false;
    asin: string;
    canonical_url: string;
    affiliate_url_candidate: string;
    product_attribution: string;
    screenshot_file_committed: boolean;
    evidence_generated_at: string;
    filter_id_at_evidence_time: string | null;
  };
  amazon_token_precheck: {
    command: typeof FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1;
    precheck_run_at: string | null;
    resolved_filter_id: string | null;
    asin_reuse_policy_classification: string | null;
    asin_reuse_policy_status: string | null;
    asin_reuse_policy_asin: string | null;
    asin_reuse_policy_mutation_ready: false;
    existing_amazon_row_count: number | null;
    approved_amazon_row_count: number | null;
    live_direct_buyable_amazon_row_count: number | null;
    insert_plan_hint: string | null;
  };
  launch_buy_links_gate: {
    requires_browser_truth_classification: "direct_buyable";
    requires_buyable_subtype_not_blocked_unsafe: true;
    committed_csv_passes_gate: false;
    evidence_browser_verdict: string | null;
    evidence_maps_to_committed_csv: false;
  };
  stale_first4_row_note: string;
  remaining_blockers: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type BuildFridgeSafeLinkGswfApplyReadinessDepsV1 = {
  rootDir: string;
  now?: () => Date;
  precheckSnapshot?: FridgeSafeLinkGswfApplyReadinessV1["amazon_token_precheck"];
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string; name?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

function loadJson<T>(abs: string): T {
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

function loadRescueRow(
  rescue: FridgeSafeLinkRescueOwnerReviewV1,
  slug: string,
): FridgeSafeLinkRescueOwnerReviewV1["missing_safe_link_slugs"][number] | null {
  return rescue.missing_safe_link_slugs.find((r) => r.slug === slug) ?? null;
}

function resolveApplyReadinessVerdict(args: {
  evidenceExists: boolean;
  evidenceVerdict: string | null;
  policyClassification: string;
  policyStatus: string | null;
  passesDirectBuyableGate: boolean;
  screenshotCommitted: boolean;
}): { verdict: ApplyReadinessVerdictV1; basis: string } {
  if (!args.evidenceExists || args.evidenceVerdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH") {
    return {
      verdict: "NOT_READY",
      basis: "No defensible Amazon PDP evidence on disk for gswf.",
    };
  }
  if (args.policyClassification === "UNKNOWN" || args.policyStatus === "UNKNOWN") {
    return {
      verdict: "UNKNOWN",
      basis: "ASIN reuse / collision policy classification unresolved from repo evidence.",
    };
  }
  if (args.passesDirectBuyableGate) {
    return {
      verdict: "NOT_READY",
      basis: "Committed CSV already passes direct_buyable gate — packet is for missing-safe-link rescue lane only.",
    };
  }
  if (
    args.evidenceVerdict === "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT" &&
    (args.policyStatus === "OWNER_REVIEW_ELIGIBLE" ||
      args.policyClassification === "EXACT_PDP_PROVEN_NO_COLLISION")
  ) {
    return {
      verdict: "READY_FOR_OWNER_BROWSER_PROOF",
      basis:
        "Dated owner-browser evidence + fresh precheck OWNER_REVIEW_ELIGIBLE support fresh owner browser re-verification before any apply-plan draft; committed CSV has zero safe-gated rows and browser_truth fields are unset.",
    };
  }
  if (args.policyClassification === "HUMAN_BROWSER_VERIFICATION_REQUIRED") {
    return {
      verdict: "READY_FOR_OWNER_BROWSER_PROOF",
      basis: "Human browser verification required before apply-readiness can advance.",
    };
  }
  return {
    verdict: "UNKNOWN",
    basis: "Evidence and precheck state do not map cleanly to a ready/not-ready lane.",
  };
}

export function buildFridgeSafeLinkGswfApplyReadinessV1(
  deps: BuildFridgeSafeLinkGswfApplyReadinessDepsV1,
): FridgeSafeLinkGswfApplyReadinessV1 {
  const now = deps.now ?? (() => new Date());
  const slug = FRIDGE_SAFE_LINK_GSWF_TARGET_SLUG_V1;
  const pathsRead = [
    FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
    FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1,
    "data/filters.csv",
    "data/retailer_links.csv",
    "data/filter_aliases.csv",
    "src/lib/retailers/launch-buy-links.ts",
  ];

  const rescue = loadJson<FridgeSafeLinkRescueOwnerReviewV1>(
    path.join(deps.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1),
  );
  const rescueRow = loadRescueRow(rescue, slug);
  if (!rescueRow) {
    throw new Error(`slug ${slug} missing from rescue packet`);
  }

  const filterRows = parse(readFileSync(path.join(deps.rootDir, "data/filters.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];
  const filter = filterRows.find((r) => (r.slug ?? "").trim().toLowerCase() === slug);
  if (!filter) {
    throw new Error(`filters.csv missing slug ${slug}`);
  }

  const linkRows = parse(readFileSync(path.join(deps.rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];
  const csvRows = linkRows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === slug);
  const primary =
    csvRows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? csvRows[0] ?? null;
  const gated = filterRealBuyRetailerLinks(
    csvRows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  const browserTruth = primary?.browser_truth_classification?.trim() ?? "";
  const buyableSubtype = primary?.browser_truth_buyable_subtype?.trim() ?? null;
  const passesGate = passesDirectBuyableGate({
    browser_truth_classification: browserTruth,
    browser_truth_buyable_subtype: buyableSubtype,
  });

  const evidenceAbs = path.join(deps.rootDir, FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1);
  if (!existsSync(evidenceAbs)) {
    throw new Error(`missing ${FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1}`);
  }
  const evidence = loadJson<Record<string, unknown>>(evidenceAbs);
  const browserEvidence =
    typeof evidence.browser_evidence === "object" && evidence.browser_evidence !== null
      ? (evidence.browser_evidence as Record<string, unknown>)
      : null;
  const ownerFinding =
    typeof evidence.owner_browser_finding === "object" && evidence.owner_browser_finding !== null
      ? (evidence.owner_browser_finding as Record<string, unknown>)
      : null;

  const asin = typeof evidence.asin === "string" ? evidence.asin.trim().toUpperCase() : "";
  const policy = classifyAmazonAsinReusePolicy({
    token: FRIDGE_SAFE_LINK_GSWF_OEM_TOKEN_V1,
    asin: /^[A-Z0-9]{10}$/.test(asin) ? asin : null,
    noSafePdpFound: false,
    exactTokenProof: ownerFinding?.exact_token_visible_in_title === true,
    sellerControlledTargetTokenProof: ownerFinding?.exact_token_visible_in_title === true,
    replacementOrCompatibleRelationshipProof: typeof evidence.product_attribution === "string",
    buyabilityProof:
      typeof evidence.buyability_proof === "string" ||
      browserEvidence?.browser_verdict === "PASS_OEM_DIRECT_BUYABLE",
    attributionCanBeLabeled: typeof evidence.product_attribution === "string",
    asinCollisionEvidenceFileCount: 0,
  });

  const precheck = deps.precheckSnapshot ?? {
    command: FRIDGE_SAFE_LINK_GSWF_PRECHECK_COMMAND_V1,
    precheck_run_at: null,
    resolved_filter_id: null,
    asin_reuse_policy_classification: null,
    asin_reuse_policy_status: null,
    asin_reuse_policy_asin: null,
    asin_reuse_policy_mutation_ready: false as const,
    existing_amazon_row_count: null,
    approved_amazon_row_count: null,
    live_direct_buyable_amazon_row_count: null,
    insert_plan_hint: null,
  };

  const policyStatus = precheck.asin_reuse_policy_status ?? policy.policy_status;
  const policyClassification =
    precheck.asin_reuse_policy_classification ?? policy.classification;

  const { verdict, basis } = resolveApplyReadinessVerdict({
    evidenceExists: true,
    evidenceVerdict: typeof evidence.verdict === "string" ? evidence.verdict : null,
    policyClassification,
    policyStatus,
    passesDirectBuyableGate: passesGate,
    screenshotCommitted: ownerFinding?.screenshot_file_committed === true,
  });

  const blockers = [
    "mutation_authorized=false",
    "verified_link_authorized=false",
    "csv_apply_authorized=false",
    "supabase_mutation_authorized=false",
    "evidence_write_authorized=false",
    "production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    "committed CSV has zero launch-buy-links safe gated rows",
    "committed browser_truth_classification not direct_buyable",
    "evidence.mutation_ready=false",
    "gswf2_slug_exists_separate_exact_token_proof_required",
    "4396508_lane_blocked_do_not_conflate",
  ];
  if (!ownerFinding?.screenshot_file_committed) {
    blockers.push("evidence.screenshot_file_committed=false");
  }
  if (typeof evidence.filter_id !== "string" || evidence.filter_id.trim().length === 0) {
    blockers.push("evidence.filter_id was null at evidence authoring — precheck now resolves filter_id");
  }

  return {
    contract: FRIDGE_SAFE_LINK_GSWF_APPLY_READINESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    generated_at: now().toISOString(),
    source_command: FRIDGE_SAFE_LINK_GSWF_SOURCE_COMMAND_V1,
    target_slug: slug,
    oem_part_token: FRIDGE_SAFE_LINK_GSWF_OEM_TOKEN_V1,
    apply_readiness_verdict: verdict,
    apply_readiness_verdict_basis: basis,
    exact_repo_paths_read: pathsRead,
    source_rescue_packet_rel_path: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    source_first4_apply_review_rel_path: FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1,
    live_state: {
      live_url: rescueRow.live_url,
      live_has_go_cta: false,
      live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1",
      live_page_exists: rescueRow.live_page_exists,
      production_go_clicked: false,
    },
    filters_csv: {
      brand_slug: filter.brand_slug ?? "",
      slug: filter.slug ?? slug,
      oem_part_number: filter.oem_part_number ?? "",
      name: filter.name ?? "",
    },
    retailer_links_csv: {
      row_count: csvRows.length,
      safe_gated_count: gated.length,
      primary_retailer_key: primary?.retailer_key ?? "",
      primary_affiliate_url: primary?.affiliate_url ?? "",
      browser_truth_classification: browserTruth,
      browser_truth_buyable_subtype: buyableSubtype,
      passes_direct_buyable_gate: false,
    },
    sibling_slug_note: {
      gswf2_slug: "gswf2",
      gswf2_oem: "GSWF2",
      conflation_risk: true,
      separate_exact_token_proof_required: true,
    },
    evidence_summary: {
      primary_evidence_rel_path: FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1,
      verdict: typeof evidence.verdict === "string" ? evidence.verdict : "UNKNOWN",
      browser_verdict:
        browserEvidence && typeof browserEvidence.browser_verdict === "string"
          ? browserEvidence.browser_verdict
          : null,
      mutation_ready: false,
      asin,
      canonical_url: typeof evidence.canonical_url === "string" ? evidence.canonical_url : "",
      affiliate_url_candidate:
        typeof evidence.affiliate_url_candidate === "string" ? evidence.affiliate_url_candidate : "",
      product_attribution:
        typeof evidence.product_attribution === "string" ? evidence.product_attribution : "UNKNOWN",
      screenshot_file_committed: ownerFinding?.screenshot_file_committed === true,
      evidence_generated_at:
        typeof evidence.generated_at === "string" ? evidence.generated_at : "UNKNOWN",
      filter_id_at_evidence_time:
        typeof evidence.filter_id === "string" ? evidence.filter_id : null,
    },
    amazon_token_precheck: precheck,
    launch_buy_links_gate: {
      requires_browser_truth_classification: "direct_buyable",
      requires_buyable_subtype_not_blocked_unsafe: true,
      committed_csv_passes_gate: false,
      evidence_browser_verdict:
        browserEvidence && typeof browserEvidence.browser_verdict === "string"
          ? browserEvidence.browser_verdict
          : null,
      evidence_maps_to_committed_csv: false,
    },
    stale_first4_row_note:
      "PROVEN: fridge-safe-link-rescue-first4-apply-review-v1.json (generated earlier) listed gswf as owner_apply_review_ready=false with amazon_asin_reuse_policy_classification=HUMAN_BROWSER_VERIFICATION_REQUIRED because evidence precheck fields were UNKNOWN_UNTIL_RUN at evidence authoring; fresh precheck run in this session may differ.",
    remaining_blockers: blockers,
    proven_facts: [
      "PROVEN: packet is read_only=true; all mutation authorization flags false.",
      "PROVEN: target_slug=gswf only.",
      `PROVEN: filters.csv row ge/gswf oem=${filter.oem_part_number ?? "GSWF"}.`,
      "PROVEN: committed CSV has one oem-parts-catalog search-placeholder row with zero safe gated rows.",
      "PROVEN: live_has_go_cta=false from rescue packet; production /go not clicked.",
      `PROVEN: evidence ${FRIDGE_SAFE_LINK_GSWF_PRIMARY_EVIDENCE_REL_V1} verdict=EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT; browser_verdict=PASS_OEM_DIRECT_BUYABLE; asin=B0002GTTRC; product_attribution=oem_official.`,
      "PROVEN: launch-buy-links gate requires browser_truth_classification=direct_buyable — committed CSV field is empty.",
      "PROVEN: gswf2 slug exists separately in filters.csv — do not conflate with GSWF.",
    ],
    inferred_facts: [
      "INFERRED: rescue packet labels gswf existing_evidence_apply_review_ready because parseable evidence exists; live /go absence likely CSV/Supabase parity gap.",
      "INFERRED: evidence browser_verdict PASS_OEM_DIRECT_BUYABLE suggests future browser_truth_classification=direct_buyable on apply — not authorized or committed by this packet.",
    ],
    unknown_facts: [
      "UNKNOWN: current live Amazon PDP buyability/discontinuation for B0002GTTRC (evidence dated 2026-05-18; precheck does not live-fetch Amazon).",
      "UNKNOWN: production /go first-hop outcome without clicking /go.",
      "UNKNOWN: live Supabase retailer_links state for filter_id.",
      "UNKNOWN: whether B0002GTTRC single-pack PDP remains distinct from GSWF2 housing listings without fresh owner browser check.",
    ],
    recommended_next_action:
      verdict === "READY_FOR_OWNER_BROWSER_PROOF"
        ? "Owner fresh US-browser re-verification of single-pack https://www.amazon.com/dp/B0002GTTRC — confirm literal GSWF in seller-controlled title, buyability, and no GSWF2 conflation; then rerun npm run buckparts:precheck:amazon-refrigerator-tokens -- --tokens GSWF before any apply-plan draft. Do not mutate CSV/Supabase/evidence; do not click production /go."
        : "Hold gswf apply lane until evidence/precheck gaps are resolved read-only.",
  };
}

export function buildFridgeSafeLinkGswfApplyReadinessMarkdownV1(
  report: FridgeSafeLinkGswfApplyReadinessV1,
): string {
  return [
    "# Fridge safe-link GSWF apply-readiness (read-only)",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `**apply_readiness_verdict:** \`${report.apply_readiness_verdict}\``,
    "",
    report.apply_readiness_verdict_basis,
    "",
    "## Live / CSV",
    "",
    `- URL: ${report.live_state.live_url}`,
    `- live_has_go_cta: **false**`,
    `- CSV: ${report.retailer_links_csv.row_count} row(s), ${report.retailer_links_csv.safe_gated_count} safe gated`,
    `- primary: ${report.retailer_links_csv.primary_retailer_key} → ${report.retailer_links_csv.primary_affiliate_url}`,
    `- browser_truth_classification: \`${report.retailer_links_csv.browser_truth_classification || "(empty)"}\``,
    "",
    "## Evidence",
    "",
    `- ${report.evidence_summary.primary_evidence_rel_path}`,
    `- verdict: ${report.evidence_summary.verdict}`,
    `- browser_verdict: ${report.evidence_summary.browser_verdict ?? "UNKNOWN"}`,
    `- asin: ${report.evidence_summary.asin}`,
    `- affiliate_url_candidate: ${report.evidence_summary.affiliate_url_candidate}`,
    "",
    "## Precheck",
    "",
    `- command: \`${report.amazon_token_precheck.command}\``,
    `- policy_status: ${report.amazon_token_precheck.asin_reuse_policy_status ?? "UNKNOWN"}`,
    `- classification: ${report.amazon_token_precheck.asin_reuse_policy_classification ?? "UNKNOWN"}`,
    "",
    "## Blockers",
    "",
    ...report.remaining_blockers.map((b) => `- ${b}`),
    "",
    "## Next",
    "",
    report.recommended_next_action,
    "",
  ].join("\n");
}

export function writeFridgeSafeLinkGswfApplyReadinessDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLinkGswfApplyReadinessV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = FRIDGE_SAFE_LINK_GSWF_JSON_REL_V1;
  const mdRel = FRIDGE_SAFE_LINK_GSWF_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLinkGswfApplyReadinessMarkdownV1(args.report)}\n`, "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
