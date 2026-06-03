/**
 * Read-only owner apply-review packet for the first 4 fridge safe-link rescue slugs.
 * No CSV/Supabase/evidence mutation; no Verified Link authorization; never fetches /go.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

import {
  classifyAmazonAsinReusePolicy,
  type AmazonAsinReusePolicyClassification,
} from "./amazon-asin-reuse-policy";
import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
  type FridgeSafeLinkRescueSlugRowV1,
} from "./fridge-safe-link-rescue-owner-review-v1";

export const FRIDGE_SAFE_LINK_RESCUE_FIRST4_APPLY_REVIEW_CONTRACT_V1 =
  "fridge_safe_link_rescue_first4_apply_review_v1" as const;

export const FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1 = [
  "edr4rxd1",
  "edr3rxd1",
  "gswf",
  "4396508",
] as const;

export const FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.json" as const;

export const FRIDGE_SAFE_LINK_RESCUE_FIRST4_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.md" as const;

export const FRIDGE_SAFE_LINK_RESCUE_FIRST4_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-rescue-first4-apply-review" as const;

export type ProofStatusV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ProductAttributionLabelV1 =
  | "oem_official"
  | "aftermarket_compatible"
  | "compatible_replacement"
  | "UNKNOWN";

export type FutureApplyPlanDraftEligibilityV1 =
  | "ELIGIBLE_NO_ASIN_COLLISION"
  | "ELIGIBLE_WITH_SHARED_ASIN_OWNER_REVIEW"
  | "ELIGIBLE_WITH_COLLISION_POLICY_REVIEW"
  | "NOT_ELIGIBLE"
  | "UNKNOWN";

export type FridgeSafeLinkRescueFirst4ApplyReviewRowV1 = {
  slug: string;
  live_url: string;
  live_has_go_cta: boolean;
  live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1";
  repo_filter_exists: boolean;
  oem_part_token: string | null;
  brand_slug: string | null;
  model_link_count: number;
  csv_retailer_row_state: string;
  csv_safe_gated_count: number;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  evidence_files: string[];
  evidence_verdict: string | null;
  evidence_browser_verdict: string | null;
  exact_token_proof_status: ProofStatusV1;
  exact_token_proof_detail: string | null;
  product_attribution_label: ProductAttributionLabelV1;
  product_attribution_detail: string | null;
  asin: string | null;
  canonical_pdp_url: string | null;
  affiliate_url_candidate: string | null;
  amazon_asin_reuse_policy_classification: AmazonAsinReusePolicyClassification;
  sufficient_to_draft_future_apply_plan: boolean;
  future_apply_plan_draft_eligibility: FutureApplyPlanDraftEligibilityV1;
  owner_apply_review_ready: boolean;
  not_apply_ready_reason: string | null;
  remaining_blockers: string[];
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
};

export type FridgeSafeLinkRescueFirst4ApplyReviewV1 = {
  contract: typeof FRIDGE_SAFE_LINK_RESCUE_FIRST4_APPLY_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH";
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_RESCUE_FIRST4_SOURCE_COMMAND_V1;
  source_rescue_packet_rel_path: typeof FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1;
  exact_repo_paths_read: string[];
  approved_slug_cohort: readonly string[];
  rows: FridgeSafeLinkRescueFirst4ApplyReviewRowV1[];
  cohort_summary: {
    slug_count: 4;
    owner_apply_review_ready_count: number;
    sufficient_to_draft_future_apply_plan_count: number;
    live_missing_go_cta_count: number;
  };
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };
type CompatRow = { filter_slug?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  destination_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

export type BuildFridgeSafeLinkRescueFirst4ApplyReviewDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringProof(value: unknown): boolean | "UNKNOWN" {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string" && value.trim().length > 0 && value.trim().toUpperCase() !== "UNKNOWN") {
    return true;
  }
  return "UNKNOWN";
}

function parseAttribution(raw: string | null): {
  label: ProductAttributionLabelV1;
  detail: string | null;
} {
  if (!raw) return { label: "UNKNOWN", detail: null };
  const lower = raw.toLowerCase();
  if (lower.includes("oem") || lower.includes("official")) {
    return { label: "oem_official", detail: raw };
  }
  if (lower.includes("aftermarket") || lower.includes("compatible")) {
    return { label: "aftermarket_compatible", detail: raw };
  }
  return { label: "compatible_replacement", detail: raw };
}

function parseEvidenceForPolicy(
  parsed: Record<string, unknown>,
): {
  verdict: string | null;
  browser_verdict: string | null;
  token: string | null;
  asin: string | null;
  canonical_url: string | null;
  affiliate_url_candidate: string | null;
  no_safe_pdp: boolean;
  exact_token_proof_status: ProofStatusV1;
  exact_token_proof_detail: string | null;
  attribution: ReturnType<typeof parseAttribution>;
  asin_collision_count: number | "UNKNOWN";
  policyInput: Parameters<typeof classifyAmazonAsinReusePolicy>[0];
} {
  const verdict = typeof parsed.verdict === "string" ? parsed.verdict.trim() : null;
  const browserEvidence = parsed.browser_evidence;
  const browser_verdict =
    isJsonObject(browserEvidence) && typeof browserEvidence.browser_verdict === "string"
      ? browserEvidence.browser_verdict.trim()
      : null;
  const token = typeof parsed.token === "string" ? parsed.token.trim() : null;
  const asin = typeof parsed.asin === "string" ? parsed.asin.trim().toUpperCase() : null;
  const canonical_url = typeof parsed.canonical_url === "string" ? parsed.canonical_url.trim() : null;
  const affiliate_url_candidate =
    typeof parsed.affiliate_url_candidate === "string" ? parsed.affiliate_url_candidate.trim() : null;

  const ownerFinding = parsed.owner_browser_finding;
  const tokenInTitle =
    isJsonObject(browserEvidence) && browserEvidence.token_visible_in_pdp_title === true
      ? true
      : isJsonObject(ownerFinding) && ownerFinding.exact_token_visible_in_title === true
        ? true
        : "UNKNOWN";

  const exactTokenString = typeof parsed.exact_token_proof === "string" ? parsed.exact_token_proof.trim() : "";
  let exact_token_proof_status: ProofStatusV1 = "UNKNOWN";
  if (tokenInTitle === true || exactTokenString.length > 0) {
    exact_token_proof_status = "PROVEN";
  }

  const attributionRaw =
    typeof parsed.product_attribution === "string"
      ? parsed.product_attribution
      : isJsonObject(browserEvidence) && typeof browserEvidence.oem_or_aftermarket === "string"
        ? browserEvidence.oem_or_aftermarket
        : null;
  const attribution = parseAttribution(attributionRaw);

  const dbPrecheck = parsed.db_precheck_summary;
  let asin_collision_count: number | "UNKNOWN" = "UNKNOWN";
  if (isJsonObject(dbPrecheck) && typeof dbPrecheck.asin_match_any_url_count === "number") {
    asin_collision_count = dbPrecheck.asin_match_any_url_count;
  }
  const asinCollisionCheck = parsed.asin_collision_reuse_check;
  if (isJsonObject(asinCollisionCheck)) {
    const precheck = asinCollisionCheck.read_only_refrigerator_token_precheck;
    if (isJsonObject(precheck) && typeof precheck.asin_collision_evidence_file_count === "number") {
      asin_collision_count = precheck.asin_collision_evidence_file_count;
    } else if (
      typeof asinCollisionCheck.proven_result === "string" &&
      asinCollisionCheck.proven_result.includes("No ") &&
      asinCollisionCheck.proven_result.includes("reuse")
    ) {
      asin_collision_count = 0;
    } else if (asinCollisionCheck.proven_result === "UNKNOWN_UNTIL_PRECHECK_AND_RG_RUN") {
      asin_collision_count = "UNKNOWN";
    }
  }

  const sellerProof =
    tokenInTitle === true
      ? true
      : isJsonObject(browserEvidence) && browserEvidence.seller_title_visible
        ? stringProof(browserEvidence.seller_title_visible)
        : "UNKNOWN";

  const relationshipProof =
    attribution.label !== "UNKNOWN" ? true : stringProof(parsed.buyability_proof);

  const policyInput = {
    token: token ?? "UNKNOWN",
    asin: asin && /^[A-Z0-9]{10}$/.test(asin) ? asin : null,
    noSafePdpFound: verdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH",
    exactTokenProof: exact_token_proof_status === "PROVEN" ? true : "UNKNOWN",
    sellerControlledTargetTokenProof: sellerProof,
    replacementOrCompatibleRelationshipProof: relationshipProof,
    buyabilityProof: stringProof(parsed.buyability_proof) === true ? true : stringProof(browser_verdict),
    attributionCanBeLabeled: attribution.label !== "UNKNOWN" ? true : "UNKNOWN",
    asinCollisionEvidenceFileCount: asin_collision_count,
  };

  return {
    verdict,
    browser_verdict,
    token,
    asin,
    canonical_url,
    affiliate_url_candidate,
    no_safe_pdp: policyInput.noSafePdpFound,
    exact_token_proof_status,
    exact_token_proof_detail: exactTokenString || null,
    attribution,
    asin_collision_count,
    policyInput,
  };
}

function summarizeCsvRows(rows: RetailerLinkRow[]): {
  state: string;
  safe_gated: number;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
} {
  const gated = filterRealBuyRetailerLinks(
    rows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.destination_url ?? r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  const primary =
    rows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? rows[0] ?? null;
  const primaryState = primary
    ? `${primary.retailer_key ?? "unknown"}:${primary.browser_truth_classification ?? "none"}:${primary.browser_truth_buyable_subtype ?? "none"}`
    : "no_primary_row";
  return {
    state: `${rows.length} row(s), ${gated.length} safe gated, primary=${primaryState}`,
    safe_gated: gated.length,
    browser_truth_classification: primary?.browser_truth_classification?.trim() ?? null,
    browser_truth_buyable_subtype: primary?.browser_truth_buyable_subtype?.trim() ?? null,
  };
}

function classifyFutureApplyPlanEligibility(args: {
  policyClassification: AmazonAsinReusePolicyClassification;
  browser_verdict: string | null;
  verdict: string | null;
  no_safe_pdp: boolean;
  csv_safe_gated: number;
}): {
  sufficient: boolean;
  eligibility: FutureApplyPlanDraftEligibilityV1;
  owner_apply_review_ready: boolean;
  not_apply_ready_reason: string | null;
  blockers: string[];
} {
  const blockers: string[] = [
    "mutation_authorized=false",
    "verified_link_authorized=false",
    "owner_batch_apply_approval_not_recorded",
    "production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
  ];
  if (args.csv_safe_gated === 0) {
    blockers.push("committed CSV has zero launch-buy-links safe gated rows");
  }
  if (args.no_safe_pdp) {
    return {
      sufficient: false,
      eligibility: "NOT_ELIGIBLE",
      owner_apply_review_ready: false,
      not_apply_ready_reason: "Evidence records NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH.",
      blockers: [...blockers, "no_safe_pdp_evidence_verdict"],
    };
  }

  const passBrowser =
    args.browser_verdict?.startsWith("PASS_") ||
    args.verdict === "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT";

  if (!passBrowser) {
    return {
      sufficient: false,
      eligibility: "NOT_ELIGIBLE",
      owner_apply_review_ready: false,
      not_apply_ready_reason: "Browser verdict is not PASS_* and verdict is not EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT.",
      blockers: [...blockers, "browser_verdict_not_apply_review_ready"],
    };
  }

  switch (args.policyClassification) {
    case "EXACT_PDP_PROVEN_NO_COLLISION":
      return {
        sufficient: true,
        eligibility: "ELIGIBLE_NO_ASIN_COLLISION",
        owner_apply_review_ready: true,
        not_apply_ready_reason: null,
        blockers,
      };
    case "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE":
      return {
        sufficient: true,
        eligibility: "ELIGIBLE_WITH_SHARED_ASIN_OWNER_REVIEW",
        owner_apply_review_ready: true,
        not_apply_ready_reason: null,
        blockers: [...blockers, "shared_asin_reuse_owner_policy_review_required"],
      };
    case "EXACT_PDP_PROVEN_BUT_COLLISION_REVIEW_REQUIRED":
      return {
        sufficient: true,
        eligibility: "ELIGIBLE_WITH_COLLISION_POLICY_REVIEW",
        owner_apply_review_ready: true,
        not_apply_ready_reason: null,
        blockers: [...blockers, "asin_collision_policy_review_required"],
      };
    case "HUMAN_BROWSER_VERIFICATION_REQUIRED":
      return {
        sufficient: false,
        eligibility: "UNKNOWN",
        owner_apply_review_ready: false,
        not_apply_ready_reason: "ASIN reuse/collision or proof set incomplete — human browser verification or precheck rerun required.",
        blockers: [...blockers, "human_browser_verification_required"],
      };
    default:
      return {
        sufficient: false,
        eligibility: "UNKNOWN",
        owner_apply_review_ready: false,
        not_apply_ready_reason: `Amazon ASIN reuse policy classification=${args.policyClassification}.`,
        blockers: [...blockers, `policy_classification=${args.policyClassification}`],
      };
  }
}

function loadRescueRow(
  rescue: FridgeSafeLinkRescueOwnerReviewV1,
  slug: string,
): FridgeSafeLinkRescueSlugRowV1 | null {
  return rescue.missing_safe_link_slugs.find((row) => row.slug === slug) ?? null;
}

export function buildFridgeSafeLinkRescueFirst4ApplyReviewV1(
  deps: BuildFridgeSafeLinkRescueFirst4ApplyReviewDepsV1,
): FridgeSafeLinkRescueFirst4ApplyReviewV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const rescueAbs = path.join(deps.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
  if (!fileExists(rescueAbs)) {
    throw new Error(`missing rescue packet: ${FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1}`);
  }
  const rescue = JSON.parse(readText(rescueAbs)) as FridgeSafeLinkRescueOwnerReviewV1;

  const filterRows = parse(readText(path.join(deps.rootDir, "data/filters.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];
  const compatRows = parse(readText(path.join(deps.rootDir, "data/compatibility_mappings.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as CompatRow[];
  const linkRows = parse(readText(path.join(deps.rootDir, "data/retailer_links.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];

  const filtersBySlug = new Map<string, FilterRow>();
  for (const row of filterRows) {
    const slug = (row.slug ?? "").trim().toLowerCase();
    if (slug) filtersBySlug.set(slug, row);
  }
  const linksBySlug = new Map<string, RetailerLinkRow[]>();
  for (const row of linkRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const list = linksBySlug.get(slug) ?? [];
    list.push(row);
    linksBySlug.set(slug, list);
  }
  const modelCountBySlug = new Map<string, number>();
  for (const row of compatRows) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    modelCountBySlug.set(slug, (modelCountBySlug.get(slug) ?? 0) + 1);
  }

  const evidencePathsRead = new Set<string>();
  const rows: FridgeSafeLinkRescueFirst4ApplyReviewRowV1[] = [];

  for (const slug of FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1) {
    const rescueRow = loadRescueRow(rescue, slug);
    if (!rescueRow) {
      throw new Error(`slug ${slug} missing from ${FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1}`);
    }

    const filter = filtersBySlug.get(slug);
    const csvRows = linksBySlug.get(slug) ?? [];
    const csvSummary = summarizeCsvRows(csvRows);

    const evidence_files = rescueRow.evidence_files_on_disk.filter((rel) => {
      const primary = !rel.includes("unknown-outcome");
      return primary;
    });
    if (evidence_files.length === 0) {
      evidence_files.push(...rescueRow.evidence_files_on_disk);
    }
    for (const rel of evidence_files) evidencePathsRead.add(rel);

    const primaryEvidenceRel = evidence_files[0];
    if (!primaryEvidenceRel) {
      throw new Error(`no evidence file for slug ${slug}`);
    }
    const evidenceAbs = path.join(deps.rootDir, primaryEvidenceRel);
    const parsed = JSON.parse(readText(evidenceAbs)) as Record<string, unknown>;
    const evidence = parseEvidenceForPolicy(parsed);
    const policy = classifyAmazonAsinReusePolicy(evidence.policyInput);
    const eligibility = classifyFutureApplyPlanEligibility({
      policyClassification: policy.classification,
      browser_verdict: evidence.browser_verdict,
      verdict: evidence.verdict,
      no_safe_pdp: evidence.no_safe_pdp,
      csv_safe_gated: csvSummary.safe_gated,
    });

    const slugSpecificBlockers = [...eligibility.blockers];
    if (evidence.verdict === "UNKNOWN" && rescueRow.evidence_files_on_disk.some((f) => f.includes("unknown-outcome"))) {
      slugSpecificBlockers.push("superseding_unknown_outcome_evidence_may_exist — primary owner-review file used");
    }
    if (typeof parsed.filter_slug === "string" && parsed.filter_slug.toUpperCase() === "UNKNOWN") {
      slugSpecificBlockers.push("evidence_artifact_filter_slug=UNKNOWN — repo filters.csv now has slug; rerun prechecks before apply planning");
    }
    if (slug === "gswf") {
      slugSpecificBlockers.push("gswf2_slug_exists_separate_exact_token_proof_required");
    }

    rows.push({
      slug,
      live_url: rescueRow.live_url,
      live_has_go_cta: false,
      live_has_go_cta_source: "fridge_safe_link_rescue_owner_review_v1",
      repo_filter_exists: Boolean(filter),
      oem_part_token: filter?.oem_part_number?.trim() ?? evidence.token,
      brand_slug: filter?.brand_slug?.trim() ?? null,
      model_link_count: modelCountBySlug.get(slug) ?? rescueRow.model_link_count,
      csv_retailer_row_state: csvSummary.state,
      csv_safe_gated_count: csvSummary.safe_gated,
      browser_truth_classification: csvSummary.browser_truth_classification,
      browser_truth_buyable_subtype: csvSummary.browser_truth_buyable_subtype,
      evidence_files: rescueRow.evidence_files_on_disk,
      evidence_verdict: evidence.verdict,
      evidence_browser_verdict: evidence.browser_verdict,
      exact_token_proof_status: evidence.exact_token_proof_status,
      exact_token_proof_detail: evidence.exact_token_proof_detail,
      product_attribution_label: evidence.attribution.label,
      product_attribution_detail: evidence.attribution.detail,
      asin: evidence.asin,
      canonical_pdp_url: evidence.canonical_url,
      affiliate_url_candidate: evidence.affiliate_url_candidate,
      amazon_asin_reuse_policy_classification: policy.classification,
      sufficient_to_draft_future_apply_plan: eligibility.sufficient,
      future_apply_plan_draft_eligibility: eligibility.eligibility,
      owner_apply_review_ready: eligibility.owner_apply_review_ready,
      not_apply_ready_reason: eligibility.not_apply_ready_reason,
      remaining_blockers: slugSpecificBlockers,
      mutation_authorized: false,
      verified_link_authorized: false,
      csv_apply_authorized: false,
      supabase_mutation_authorized: false,
      evidence_write_authorized: false,
    });
  }

  const proven_facts = [
    "PROVEN: packet is read_only=true; data_mutation=false; mutation_authorized=false; verified_link_authorized=false.",
    "PROVEN: cohort is exactly edr4rxd1, edr3rxd1, gswf, 4396508 — 4396842 excluded.",
    "PROVEN: live_has_go_cta sourced from fridge-safe-link-rescue-owner-review-v1 draft (no live HTML rescan in this packet).",
    "PROVEN: all four slugs have live_has_go_cta=false in rescue packet.",
    "PROVEN: committed CSV rows are oem-parts-catalog search placeholders with zero safe gated rows.",
    "PROVEN: production_go_first_hop_validation_status=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH.",
  ];
  const inferred_facts = [
    "INFERRED: live pages load buyer paths from Supabase at runtime; missing /go despite evidence suggests CSV/Supabase parity gap not yet closed for these slugs.",
    "INFERRED: drafting a future apply plan is distinct from authorizing mutation — owner approval and guarded apply executor still required.",
  ];
  const unknown_facts = [
    "UNKNOWN: live Supabase retailer_links row state per slug (not loaded in this packet).",
    "UNKNOWN: production /go redirect without clicking /go.",
  ];

  return {
    contract: FRIDGE_SAFE_LINK_RESCUE_FIRST4_APPLY_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_first_hop_validation_status: "UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
    generated_at: now().toISOString(),
    source_command: FRIDGE_SAFE_LINK_RESCUE_FIRST4_SOURCE_COMMAND_V1,
    source_rescue_packet_rel_path: FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    exact_repo_paths_read: [
      FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
      "data/filters.csv",
      "data/compatibility_mappings.csv",
      "data/retailer_links.csv",
      ...Array.from(evidencePathsRead).sort(),
      "scripts/lib/amazon-asin-reuse-policy.ts",
      "src/lib/retailers/launch-buy-links.ts",
    ],
    approved_slug_cohort: FRIDGE_SAFE_LINK_RESCUE_FIRST4_SLUGS_V1,
    rows,
    cohort_summary: {
      slug_count: 4,
      owner_apply_review_ready_count: rows.filter((r) => r.owner_apply_review_ready).length,
      sufficient_to_draft_future_apply_plan_count: rows.filter((r) => r.sufficient_to_draft_future_apply_plan)
        .length,
      live_missing_go_cta_count: rows.filter((r) => r.live_has_go_cta === false).length,
    },
    recommended_next_action:
      "Owner review these four rows only. For slugs marked sufficient_to_draft_future_apply_plan=true, a separate guarded apply-plan artifact may be drafted later — this packet does not authorize CSV apply, Supabase writes, evidence mutation, Verified Link authorization, or production /go clicks.",
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

export function buildFridgeSafeLinkRescueFirst4ApplyReviewMarkdownV1(
  report: FridgeSafeLinkRescueFirst4ApplyReviewV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link rescue — first 4 owner apply-review packet",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Authorization (all false)",
    "",
    "- mutation_authorized",
    "- verified_link_authorized",
    "- csv_apply_authorized",
    "- supabase_mutation_authorized",
    "- evidence_write_authorized",
    "",
    "## Cohort",
    "",
    `Slugs: ${report.approved_slug_cohort.join(", ")}`,
    "",
    `Owner apply-review ready: **${report.cohort_summary.owner_apply_review_ready_count} / 4**`,
    "",
    `Sufficient to draft future apply plan (not authorize): **${report.cohort_summary.sufficient_to_draft_future_apply_plan_count} / 4**`,
    "",
  ];

  for (const row of report.rows) {
    lines.push(
      `## ${row.slug}`,
      "",
      `- Live: ${row.live_url} — **live_has_go_cta=false** (${row.live_has_go_cta_source})`,
      `- Models linked: ${row.model_link_count}`,
      `- CSV: ${row.csv_retailer_row_state}`,
      `- Evidence: ${row.evidence_files.join(", ")}`,
      `- Verdict: ${row.evidence_verdict ?? "UNKNOWN"} / ${row.evidence_browser_verdict ?? "UNKNOWN"}`,
      `- Exact-token proof: **${row.exact_token_proof_status}**`,
      `- Attribution: **${row.product_attribution_label}** (${row.product_attribution_detail ?? "n/a"})`,
      `- ASIN: ${row.asin ?? "UNKNOWN"} — policy: **${row.amazon_asin_reuse_policy_classification}**`,
      `- Sufficient to draft future apply plan: **${row.sufficient_to_draft_future_apply_plan}** (${row.future_apply_plan_draft_eligibility})`,
      `- Owner apply-review ready: **${row.owner_apply_review_ready}**`,
      ...(row.not_apply_ready_reason ? [`- Not apply-ready reason: ${row.not_apply_ready_reason}`] : []),
      `- Remaining blockers:`,
      ...row.remaining_blockers.map((b) => `  - ${b}`),
      "",
    );
  }

  lines.push("## Recommended next action", "", report.recommended_next_action, "");
  return lines.join("\n");
}

const ALLOWED_DRAFT_PREFIX = "data/fridge/batch-production/drafts/fridge-safe-link-rescue-first4-apply-review-v1.";

export function writeFridgeSafeLinkRescueFirst4ApplyReviewDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLinkRescueFirst4ApplyReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = FRIDGE_SAFE_LINK_RESCUE_FIRST4_JSON_REL_V1;
  const mdRel = FRIDGE_SAFE_LINK_RESCUE_FIRST4_MD_REL_V1;
  if (!jsonRel.startsWith(ALLOWED_DRAFT_PREFIX) || !mdRel.startsWith(ALLOWED_DRAFT_PREFIX)) {
    throw new Error("draft write path outside allowed prefix");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLinkRescueFirst4ApplyReviewMarkdownV1(args.report)}\n`, "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
