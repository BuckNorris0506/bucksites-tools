/**
 * Owner screenshot → structured Amazon evidence review packet v1 (pure builder + validator).
 * PROVEN: no I/O, no Supabase, no retailer_links mutations, no affiliate URL writes.
 * INFERRED: Committed JSON under `data/evidence/amazon-{canonical_slug}-*.json` is ingested by
 * `scripts/report-amazon-refrigerator-token-precheck.ts` when Jared saves owner-approved files.
 */

import {
  classifyAmazonAsinReusePolicy,
  type AmazonAsinReusePolicyInput,
  type AmazonAsinReusePolicyResult,
} from "./amazon-asin-reuse-policy";

export const AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1 =
  "buckparts_amazon_owner_screenshot_evidence_v1" as const;

export type AmazonOwnerScreenshotPageKindV1 =
  | "product_detail_page"
  | "search_results_page"
  | "other"
  | "unknown";

export type AmazonOwnerScreenshotOemOrAftermarketV1 =
  | "oem_official"
  | "compatible_aftermarket"
  | "unknown"
  | "blocked_unsafe";

export type AmazonOwnerScreenshotOwnerVerdictV1 =
  | "DIRECT_BUYABLE_EXACT_TOKEN_OEM"
  | "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET"
  | "EXACT_TOKEN_VISIBLE_NOT_BUYABLE"
  | "SEARCH_PAGE_ONLY"
  | "TOKEN_NOT_IN_TITLE"
  | "NO_SAFE_PDP_FOUND"
  | "BLOCKED_UNSAFE"
  | "INCOMPLETE_SCREENSHOT_FACTS";

/** Structured facts Jared (or an import step) supplies from screenshot review — not raw image bytes. */
export type AmazonOwnerScreenshotFactsV1 = {
  token: string;
  filter_slug?: string | null;
  filter_id?: string | null;
  generated_at?: string;
  screenshot_sources: Array<{
    label: string;
    /** Repo-relative path when committed; null when external/chat-only. */
    path?: string | null;
    committed_to_repo: boolean;
    captured_at_iso?: string | null;
  }>;
  page_kind: AmazonOwnerScreenshotPageKindV1;
  token_visible_in_pdp_title: boolean;
  token_visible_elsewhere_on_page: boolean;
  seller_controlled_pdp_identity: boolean | "UNKNOWN";
  buy_path_visible: boolean;
  stock_status?: "in_stock" | "out_of_stock" | "unknown" | string;
  price_visible_usd?: number | null;
  sold_by?: string | null;
  fulfilled_by?: string | null;
  brand_visible?: string | null;
  oem_or_aftermarket: AmazonOwnerScreenshotOemOrAftermarketV1;
  relationship_notes?: string | null;
  /** 10-char ASIN when visible on PDP screenshot; null when not captured. */
  asin?: string | null;
  canonical_url?: string | null;
  seller_title_visible?: string | null;
};

export type AmazonOwnerScreenshotEvidenceV1 = {
  report_name: typeof AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  scope: "owner_screenshot_browser_evidence_review_packet";
  token: string;
  filter_slug: string | null;
  filter_id: string | null;
  mutation_ready: false;
  mutation_ready_basis: string;
  /** True when observation fields satisfy review checklist — still does not authorize mutation. */
  all_safety_conditions_for_review_met: boolean;
  owner_verdict: AmazonOwnerScreenshotOwnerVerdictV1;
  verdict: string;
  exact_token_proof: string;
  buyability_proof: string;
  product_attribution: string;
  asin: string | null;
  canonical_url: string | null;
  screenshot_sources: AmazonOwnerScreenshotFactsV1["screenshot_sources"];
  page_observation: {
    page_kind: AmazonOwnerScreenshotPageKindV1;
    token_visible_in_pdp_title: boolean;
    token_visible_elsewhere_on_page: boolean;
    seller_controlled_pdp_identity: boolean | "UNKNOWN";
  };
  buyability_observation: {
    buy_path_visible: boolean;
    stock_status: string;
    price_visible_usd: number | null;
  };
  seller_observation: {
    sold_by: string | null;
    fulfilled_by: string | null;
    brand_visible: string | null;
  };
  product_relationship: {
    oem_or_aftermarket: AmazonOwnerScreenshotOemOrAftermarketV1;
    notes: string | null;
  };
  browser_evidence: {
    token_searched: string;
    amazon_pdp_url_canonical: string | null;
    asin: string | null;
    seller_title_visible: string | null;
    token_visible_in_pdp_title: boolean;
    token_visible_elsewhere_on_page: boolean;
    brand_store: string | null;
    sold_by: string | null;
    fulfilled_by: string | null;
    oem_or_aftermarket: string;
    buy_path_visible: string | null;
    price_visible_usd: number | null;
    browser_verdict: string;
  };
  owner_browser_finding: {
    source: "owner_screenshot_observation";
    screenshot_file_committed: boolean;
    page_kind: AmazonOwnerScreenshotPageKindV1;
    exact_token_visible_in_title: boolean;
    token_visible_elsewhere_on_page: boolean;
  };
  asin_reuse_policy_preview: AmazonAsinReusePolicyResult;
  required_next_action: string;
  do_not_publish_reason: string | null;
  suggested_commit_path: string | null;
  notes: string[];
};

const ASIN_RE = /^[A-Z0-9]{10}$/;

function normalizeToken(token: string): string {
  return token.trim().toUpperCase();
}

function normalizeAsin(asin: string | null | undefined): string | null {
  if (asin == null || asin === "") return null;
  const u = asin.trim().toUpperCase();
  return ASIN_RE.test(u) ? u : null;
}

function oemOrAftermarketLabel(v: AmazonOwnerScreenshotOemOrAftermarketV1): string {
  switch (v) {
    case "oem_official":
      return "OEM / official manufacturer listing";
    case "compatible_aftermarket":
      return "compatible aftermarket / replacement (not OEM)";
    case "blocked_unsafe":
      return "blocked unsafe — do not publish";
    default:
      return "UNKNOWN";
  }
}

function browserVerdictFromFacts(facts: AmazonOwnerScreenshotFactsV1): string {
  if (facts.page_kind === "search_results_page") return "SEARCH_RESULTS_ONLY";
  if (facts.oem_or_aftermarket === "blocked_unsafe") return "BLOCKED_UNSAFE";
  if (!facts.token_visible_in_pdp_title && !facts.token_visible_elsewhere_on_page) {
    return "TOKEN_NOT_VISIBLE";
  }
  if (!facts.token_visible_in_pdp_title && facts.token_visible_elsewhere_on_page) {
    return "TOKEN_ONLY_OUTSIDE_TITLE";
  }
  if (!facts.buy_path_visible) return "EXACT_TOKEN_NOT_BUYABLE";
  if (facts.oem_or_aftermarket === "oem_official") return "PASS_OEM_DIRECT_BUYABLE";
  if (facts.oem_or_aftermarket === "compatible_aftermarket") {
    return "PASS_AS_AFTERMARKET_COMPATIBLE_DIRECT_BUYABLE";
  }
  return "HUMAN_BROWSER_VERIFICATION_REQUIRED";
}

export function deriveOwnerVerdictFromScreenshotFactsV1(
  facts: AmazonOwnerScreenshotFactsV1,
): AmazonOwnerScreenshotOwnerVerdictV1 {
  if (facts.oem_or_aftermarket === "blocked_unsafe") return "BLOCKED_UNSAFE";
  if (facts.page_kind === "search_results_page") return "SEARCH_PAGE_ONLY";
  if (facts.page_kind === "unknown" || facts.page_kind === "other") {
    return "INCOMPLETE_SCREENSHOT_FACTS";
  }
  if (!facts.token_visible_in_pdp_title && !facts.token_visible_elsewhere_on_page) {
    return "NO_SAFE_PDP_FOUND";
  }
  if (!facts.token_visible_in_pdp_title && facts.token_visible_elsewhere_on_page) {
    return "TOKEN_NOT_IN_TITLE";
  }
  if (!facts.buy_path_visible) return "EXACT_TOKEN_VISIBLE_NOT_BUYABLE";
  if (facts.oem_or_aftermarket === "compatible_aftermarket") {
    return "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET";
  }
  if (facts.oem_or_aftermarket === "oem_official") {
    return "DIRECT_BUYABLE_EXACT_TOKEN_OEM";
  }
  return "INCOMPLETE_SCREENSHOT_FACTS";
}

export type ScreenshotEvidenceRetailContextV1 = "amazon" | "non_amazon";

const SCREENSHOT_COMMIT_BLOCKER_V1 =
  "at least one screenshot_sources[].committed_to_repo should be true before durable evidence commit";

const ASIN_CAPTURE_BLOCKER_V1 =
  "10-char ASIN not captured from screenshot (precheck policy stays UNKNOWN until ASIN present)";

/** Full checklist including Amazon ASIN + repo screenshot commit (production / mutation gates). */
export function computeScreenshotEvidenceSafetyChecklistV1(facts: AmazonOwnerScreenshotFactsV1): {
  all_safety_conditions_for_review_met: boolean;
  unmet: string[];
} {
  const ownerReview = listOwnerReviewBlockersFromScreenshotFactsV1(facts, "amazon");
  const production = listProductionEvidenceCommitBlockersFromScreenshotFactsV1(facts, "amazon");
  const unmet = [...ownerReview, ...production];
  return { all_safety_conditions_for_review_met: unmet.length === 0, unmet };
}

/** Blockers for durable evidence commit / mutation paths — not owner-review gates. */
export function listProductionEvidenceCommitBlockersFromScreenshotFactsV1(
  facts: AmazonOwnerScreenshotFactsV1,
  context: ScreenshotEvidenceRetailContextV1,
): string[] {
  const unmet: string[] = [];
  const anyCommitted = facts.screenshot_sources.some((s) => s.committed_to_repo);
  if (!anyCommitted) unmet.push(SCREENSHOT_COMMIT_BLOCKER_V1);
  if (context === "amazon" && normalizeAsin(facts.asin) === null) {
    unmet.push(ASIN_CAPTURE_BLOCKER_V1);
  }
  return unmet;
}

/**
 * Founder review readiness — agent-filled facts structurally usable for review.
 * Non-Amazon: no ASIN; token in title OR seller-controlled identity; canonical URL + notes required.
 * Amazon: same PDP checklist as production except screenshot commit (ASIN still required).
 */
export function listOwnerReviewBlockersFromScreenshotFactsV1(
  facts: AmazonOwnerScreenshotFactsV1,
  context: ScreenshotEvidenceRetailContextV1,
): string[] {
  if (context === "amazon") {
    return listAmazonOwnerReviewBlockersFromScreenshotFactsV1(facts);
  }
  return listNonAmazonOwnerReviewBlockersFromScreenshotFactsV1(facts);
}

function listAmazonOwnerReviewBlockersFromScreenshotFactsV1(
  facts: AmazonOwnerScreenshotFactsV1,
): string[] {
  const unmet: string[] = [];
  if (facts.page_kind !== "product_detail_page") {
    unmet.push("page_kind must be product_detail_page (not search/SERP)");
  }
  if (!facts.token_visible_in_pdp_title) {
    unmet.push("token_visible_in_pdp_title must be true for seller-controlled exact-token PDP proof");
  }
  if (!facts.buy_path_visible) unmet.push("buy_path_visible must be true");
  if (facts.oem_or_aftermarket === "unknown") {
    unmet.push("oem_or_aftermarket must be labeled oem_official or compatible_aftermarket");
  }
  if (facts.oem_or_aftermarket === "blocked_unsafe") {
    unmet.push("blocked_unsafe listings cannot pass review checklist");
  }
  if (normalizeAsin(facts.asin) === null) unmet.push(ASIN_CAPTURE_BLOCKER_V1);
  return unmet;
}

function listNonAmazonOwnerReviewBlockersFromScreenshotFactsV1(
  facts: AmazonOwnerScreenshotFactsV1,
): string[] {
  const unmet: string[] = [];
  if (facts.page_kind !== "product_detail_page") {
    unmet.push("page_kind must be product_detail_page (not search/SERP)");
  }
  const sellerIdentity = facts.seller_controlled_pdp_identity === true;
  const tokenProof = facts.token_visible_in_pdp_title || sellerIdentity;
  if (!tokenProof) {
    unmet.push(
      "exact token must be visible in PDP title or seller_controlled_pdp_identity must be proven true",
    );
  }
  if (!facts.buy_path_visible) unmet.push("buy_path_visible must be true");
  if (facts.oem_or_aftermarket === "unknown") {
    unmet.push("oem_or_aftermarket must be labeled oem_official or compatible_aftermarket");
  }
  if (facts.oem_or_aftermarket === "blocked_unsafe") {
    unmet.push("blocked_unsafe listings cannot pass owner review");
  }
  if (!facts.canonical_url?.trim()) {
    unmet.push("canonical_url required for non-Amazon owner review");
  }
  if (!facts.relationship_notes?.trim()) {
    unmet.push("relationship_notes required for founder review (agent observation summary)");
  }
  return unmet;
}

/**
 * PROVEN: `mutation_ready` is always false — BuckParts ASIN reuse policy and insert gates
 * never grant mutation from screenshot packets alone.
 */
export function computeScreenshotEvidenceMutationReadyV1(facts: AmazonOwnerScreenshotFactsV1): {
  mutation_ready: false;
  mutation_ready_basis: string;
} {
  const { all_safety_conditions_for_review_met, unmet } = computeScreenshotEvidenceSafetyChecklistV1(facts);
  if (!all_safety_conditions_for_review_met) {
    return {
      mutation_ready: false,
      mutation_ready_basis: `mutation_ready=false: screenshot review checklist incomplete (${unmet.join("; ")}).`,
    };
  }
  return {
    mutation_ready: false,
    mutation_ready_basis:
      "mutation_ready=false: observation checklist met for owner review only — retailer_links insert still requires owner-approved insert plan, affiliate readiness, buy-link gate, and explicit mutation workflow (classifyAmazonAsinReusePolicy always returns mutation_ready=false).",
  };
}

export function buildAsinReusePolicyInputFromScreenshotEvidenceV1(
  doc: Pick<
    AmazonOwnerScreenshotEvidenceV1,
    "token" | "asin" | "owner_verdict" | "page_observation" | "product_relationship" | "buyability_observation"
  >,
): AmazonAsinReusePolicyInput {
  const noSafe =
    doc.owner_verdict === "NO_SAFE_PDP_FOUND" ||
    doc.owner_verdict === "BLOCKED_UNSAFE" ||
    doc.owner_verdict === "SEARCH_PAGE_ONLY";
  const exactInTitle = doc.page_observation.token_visible_in_pdp_title;
  const attributionLabeled = doc.product_relationship.oem_or_aftermarket !== "unknown";
  return {
    token: doc.token,
    asin: doc.asin,
    noSafePdpFound: noSafe,
    exactTokenProof: exactInTitle,
    sellerControlledTargetTokenProof: exactInTitle,
    replacementOrCompatibleRelationshipProof:
      attributionLabeled &&
      (doc.product_relationship.oem_or_aftermarket === "compatible_aftermarket" ||
        doc.product_relationship.oem_or_aftermarket === "oem_official"),
    buyabilityProof: doc.buyability_observation.buy_path_visible,
    attributionCanBeLabeled: attributionLabeled,
    asinCollisionEvidenceFileCount: 0,
    liveAsinReuseCount: 0,
  };
}

export function suggestedOwnerScreenshotEvidencePathV1(args: {
  canonical_slug: string;
  suffix?: string;
}): string {
  const slug = args.canonical_slug.trim().toLowerCase();
  const suffix = (args.suffix ?? "owner-screenshot-review").replace(/[^a-z0-9-]/gi, "-");
  const date = new Date().toISOString().slice(0, 10);
  return `data/evidence/amazon-${slug}-${suffix}.${date}.json`;
}

export function buildAmazonOwnerScreenshotEvidenceV1(
  facts: AmazonOwnerScreenshotFactsV1,
): AmazonOwnerScreenshotEvidenceV1 {
  const token = normalizeToken(facts.token);
  const asin = normalizeAsin(facts.asin);
  const owner_verdict = deriveOwnerVerdictFromScreenshotFactsV1(facts);
  const { mutation_ready, mutation_ready_basis } = computeScreenshotEvidenceMutationReadyV1(facts);
  const { all_safety_conditions_for_review_met } = computeScreenshotEvidenceSafetyChecklistV1(facts);
  const filter_slug = facts.filter_slug?.trim().toLowerCase() ?? null;
  const browser_verdict = browserVerdictFromFacts(facts);
  const stock = facts.stock_status?.trim() || "unknown";
  const buyPathLabel = facts.buy_path_visible
    ? `${stock === "in_stock" ? "In Stock" : stock}, Add to Cart, Buy Now`
    : null;

  const browser_evidence = {
    token_searched: token,
    amazon_pdp_url_canonical: facts.canonical_url ?? (asin ? `https://www.amazon.com/dp/${asin}` : null),
    asin,
    seller_title_visible: facts.seller_title_visible ?? null,
    token_visible_in_pdp_title: facts.token_visible_in_pdp_title,
    token_visible_elsewhere_on_page: facts.token_visible_elsewhere_on_page,
    brand_store: facts.brand_visible ?? null,
    sold_by: facts.sold_by ?? null,
    fulfilled_by: facts.fulfilled_by ?? null,
    oem_or_aftermarket: oemOrAftermarketLabel(facts.oem_or_aftermarket),
    buy_path_visible: buyPathLabel,
    price_visible_usd: facts.price_visible_usd ?? null,
    browser_verdict,
  };

  const exact_token_proof = facts.token_visible_in_pdp_title
    ? `Seller-controlled PDP title includes literal ${token}.`
    : facts.token_visible_elsewhere_on_page
      ? `Token ${token} visible on page but not in seller-controlled PDP title (insufficient for exact-token PDP proof).`
      : `Exact token ${token} not established in seller-controlled PDP identity.`;

  const buyability_proof = facts.buy_path_visible
    ? `${buyPathLabel ?? "Buy path"} visible in owner screenshot observation.`
    : "NOT_PROVEN";

  const product_attribution =
    facts.oem_or_aftermarket === "oem_official"
      ? "oem_official"
      : facts.oem_or_aftermarket === "compatible_aftermarket"
        ? "aftermarket_compatible"
        : "UNKNOWN";

  const verdict =
    owner_verdict === "NO_SAFE_PDP_FOUND" || owner_verdict === "BLOCKED_UNSAFE"
      ? owner_verdict === "NO_SAFE_PDP_FOUND"
        ? "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH"
        : "BLOCKED_UNSAFE"
      : "OWNER_SCREENSHOT_REVIEW_RECORDED";

  const draft: Omit<AmazonOwnerScreenshotEvidenceV1, "asin_reuse_policy_preview"> = {
    report_name: AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1,
    generated_at: facts.generated_at ?? new Date().toISOString(),
    read_only: true,
    data_mutation: false,
    scope: "owner_screenshot_browser_evidence_review_packet",
    token,
    filter_slug,
    filter_id: facts.filter_id ?? null,
    mutation_ready,
    mutation_ready_basis,
    all_safety_conditions_for_review_met,
    owner_verdict,
    verdict,
    exact_token_proof,
    buyability_proof,
    product_attribution,
    asin,
    canonical_url: facts.canonical_url ?? browser_evidence.amazon_pdp_url_canonical,
    screenshot_sources: facts.screenshot_sources,
    page_observation: {
      page_kind: facts.page_kind,
      token_visible_in_pdp_title: facts.token_visible_in_pdp_title,
      token_visible_elsewhere_on_page: facts.token_visible_elsewhere_on_page,
      seller_controlled_pdp_identity: facts.seller_controlled_pdp_identity,
    },
    buyability_observation: {
      buy_path_visible: facts.buy_path_visible,
      stock_status: stock,
      price_visible_usd: facts.price_visible_usd ?? null,
    },
    seller_observation: {
      sold_by: facts.sold_by ?? null,
      fulfilled_by: facts.fulfilled_by ?? null,
      brand_visible: facts.brand_visible ?? null,
    },
    product_relationship: {
      oem_or_aftermarket: facts.oem_or_aftermarket,
      notes: facts.relationship_notes ?? null,
    },
    browser_evidence,
    owner_browser_finding: {
      source: "owner_screenshot_observation",
      screenshot_file_committed: facts.screenshot_sources.some((s) => s.committed_to_repo),
      page_kind: facts.page_kind,
      exact_token_visible_in_title: facts.token_visible_in_pdp_title,
      token_visible_elsewhere_on_page: facts.token_visible_elsewhere_on_page,
    },
    required_next_action:
      owner_verdict === "DIRECT_BUYABLE_EXACT_TOKEN_COMPATIBLE_AFTERMARKET" ||
      owner_verdict === "DIRECT_BUYABLE_EXACT_TOKEN_OEM"
        ? "OWNER_COMMITS_READ_ONLY_JSON_UNDER data/evidence/amazon-{slug}-* THEN_RE_RUN buckparts:precheck:amazon-refrigerator-tokens; no retailer_links mutation from this packet."
        : "OWNER_SUPPLIES_ADDITIONAL_SCREENSHOT_OR_MARKS_NO_SAFE_PDP; do not promote CTA or insert links.",
    do_not_publish_reason:
      all_safety_conditions_for_review_met && asin
        ? null
        : "Screenshot packet incomplete for publish/insert (missing ASIN, repo screenshot commit, and/or PDP checklist). mutation_ready=false.",
    suggested_commit_path: filter_slug
      ? suggestedOwnerScreenshotEvidencePathV1({ canonical_slug: filter_slug })
      : null,
    notes: [
      "Evidence review packet only. No DB writes, no retailer_links mutations, no affiliate URL changes, and no CTA promotion implied.",
      facts.oem_or_aftermarket === "compatible_aftermarket"
        ? "PROVEN: Listing labeled compatible aftermarket — do not classify or market as OEM Whirlpool."
        : "INFERRED: Confirm oem_or_aftermarket from visible PDP copy before any OEM attribution.",
      "INFERRED: Screenshot bytes remain external until Jared commits image + JSON under data/evidence/.",
    ],
  };

  const asin_reuse_policy_preview = classifyAmazonAsinReusePolicy(
    buildAsinReusePolicyInputFromScreenshotEvidenceV1(draft),
  );

  return { ...draft, asin_reuse_policy_preview };
}

export function validateAmazonOwnerScreenshotEvidenceV1(
  doc: unknown,
): { ok: true; doc: AmazonOwnerScreenshotEvidenceV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: ["document must be a non-null object"] };
  }
  const o = doc as Record<string, unknown>;
  if (o.report_name !== AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1) {
    errors.push(`report_name must be ${AMAZON_OWNER_SCREENSHOT_EVIDENCE_CONTRACT_V1}`);
  }
  if (o.read_only !== true) errors.push("read_only must be true");
  if (o.data_mutation !== false) errors.push("data_mutation must be false");
  if (o.mutation_ready !== false) errors.push("mutation_ready must be false");
  if (typeof o.token !== "string" || !o.token.trim()) errors.push("token required");
  if (!o.browser_evidence || typeof o.browser_evidence !== "object") {
    errors.push("browser_evidence required");
  }
  if (!Array.isArray(o.screenshot_sources)) errors.push("screenshot_sources must be an array");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, doc: doc as AmazonOwnerScreenshotEvidenceV1 };
}
