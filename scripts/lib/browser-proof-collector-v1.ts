/**
 * Browser Proof Collector v1 — read-only automated candidate URL inspection.
 *
 * Writes draft collector artifacts + screenshots only.
 * Does NOT write owner-browser-proof-result, founder approvals, CSV, or Supabase.
 * Does NOT feed readiness/apply gates automatically.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

import {
  FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1,
  FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1,
} from "./manufacturer-safe-link-rescue-frigidaire-config-v1";

export const BROWSER_PROOF_COLLECTOR_CONTRACT_V1 = "browser_proof_collector_v1" as const;

export const BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1 =
  "data/fridge/batch-production/drafts/browser-proof-collector" as const;

const DEFAULT_GOTO_MS = 48_000;
const DEFAULT_WAIT_MS = 2_000;
const TEXT_SAMPLE_MAX = 12_000;

export const BROWSER_PROOF_COLLECTOR_UA_V1 =
  "BuckPartsBrowserProofCollector/1.0 (+https://buckparts.com; read-only evidence collection)" as const;

/** Realistic desktop Chrome UA — some OEM CDNs reject custom/bot UAs or HTTP/2 quirks under headless defaults. */
export const BROWSER_PROOF_DESKTOP_CHROME_UA_V1 =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" as const;

/** Launch args that may reduce net::ERR_HTTP2_PROTOCOL_ERROR on some hosts (repo-safe, no network mutation). */
export const BROWSER_PROOF_HTTP2_MITIGATION_ARGS_V1 = [
  "--disable-http2",
  "--disable-features=UseChromeOSDirectVideoDecoder",
] as const;

const PURCHASE_RE =
  /add to cart|add to bag|add to basket|buy now|checkout|shop now|purchase|add to order|add subscription|subscribe/i;
const PRICE_RE = /\$\s?\d+(?:[.,]\d{2})?|\bUSD\s?\d+/i;
const STOCK_RE = /\bin stock\b|\bavailable\b|\bpickup\b|\bships?\b|\bready to ship\b/i;
const UNAVAILABLE_RE =
  /\bout of stock\b|\bunavailable\b|\bdiscontinued\b|\bno longer available\b|\bnot available\b/i;
const NOT_FOUND_RE =
  /page not found|404|requested page is not available|we can't find|we could not find|this page isn't available/i;
const BLOCKED_RE = /access denied|captcha|are you a robot|cloudflare|blocked|permission denied/i;

export type BrowserProofCollectorVerdictV1 = "PASS" | "FAIL_AS_PROOF" | "UNKNOWN";

export type BrowserProofPageTypeV1 =
  | "product_pdp"
  | "search_page"
  | "category_page"
  | "not_found"
  | "blocked"
  | "unknown";

export type BrowserProofSourceClassV1 =
  | "official_manufacturer_pdp"
  | "authorized_parts_distributor_pdp"
  | "retailer_direct_pdp"
  | "authorized_dealer_pdp"
  | "search_or_catalog"
  | "unknown";

export type BrowserProofCollectorInputV1 = {
  slug: string;
  expected_token: string;
  candidate_url: string;
  forbidden_tokens?: readonly string[];
};

export type BrowserProofCollectorBatchInputV1 = {
  slug: string;
  expected_token: string;
  candidate_urls: readonly string[];
  forbidden_tokens?: readonly string[];
};

export type BrowserProofVisibleFactsV1 = {
  final_url: string;
  title: string;
  h1: string;
  visible_text_snippet: string;
  exact_expected_token_present: boolean;
  forbidden_tokens_present: string[];
  price_like_text_present: boolean;
  stock_or_buyability_signal_present: boolean;
  add_to_cart_or_subscription_signals: string[];
  unavailable_signal_present: boolean;
  page_type: BrowserProofPageTypeV1;
  source_class: BrowserProofSourceClassV1;
  capture_succeeded: boolean;
  navigation_error: string | null;
  extraction_uncertain: boolean;
};

export type BrowserProofWaitUntilV1 = "domcontentloaded" | "load" | "networkidle";

export type BrowserProofUserAgentModeV1 = "collector" | "desktop_chrome" | "custom";

export type BrowserProofCaptureAttemptV1 = {
  attempt_id: string;
  wait_until: BrowserProofWaitUntilV1;
  user_agent_mode: BrowserProofUserAgentModeV1;
  user_agent: string;
  headed: boolean;
  wait_ms: number;
  timeout_ms: number;
  launch_args: string[];
  success: boolean;
  error: string | null;
  final_url: string | null;
};

export type BrowserProofCaptureOptionsV1 = {
  headed?: boolean;
  wait_ms?: number;
  timeout_ms?: number;
  user_agent?: string;
};

export type BrowserProofCollectorCandidateResultV1 = {
  candidate_url: string;
  verdict: BrowserProofCollectorVerdictV1;
  blockers: string[];
  facts: BrowserProofVisibleFactsV1;
  screenshot_rel_path: string | null;
  assessment: string;
  capture_attempts: BrowserProofCaptureAttemptV1[];
  /** Same-host product hrefs observed on this page (search-follow input). */
  discovered_same_origin_product_urls?: string[];
};

export type BrowserProofCollectorDraftV1 = {
  contract: typeof BROWSER_PROOF_COLLECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  production_go_click_authorized: false;
  apply_plan_proposal_justified: false;
  promotes_to_owner_browser_proof_result: false;
  founder_approval_authorized: false;
  generated_at: string;
  capture_method: "playwright_headless" | "playwright_headed" | "fixture_only";
  capture_options: {
    headed: boolean;
    wait_ms: number;
    timeout_ms: number;
    user_agent_mode: BrowserProofUserAgentModeV1;
  };
  capture_attempts: BrowserProofCaptureAttemptV1[];
  batch_mode: boolean;
  collect_all: boolean;
  early_stop: {
    stopped: boolean;
    reason: string | null;
    stopped_after_candidate_url: string | null;
  };
  best_candidate_url: string | null;
  best_candidate_rank: number | null;
  slug: string;
  expected_token: string;
  forbidden_tokens: string[];
  confusion_family_owner_review_required: boolean;
  owner_review_required: true;
  candidates: BrowserProofCollectorCandidateResultV1[];
  overall_verdict: BrowserProofCollectorVerdictV1;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
  not_authorized: string[];
};

function normToken(token: string): string {
  return token.trim().toUpperCase();
}

function tokenWordBoundaryPresent(token: string, blob: string): boolean {
  const t = normToken(token);
  if (!t) return false;
  const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(blob);
}

export function defaultForbiddenTokensForSlugV1(slug: string): string[] {
  const key = slug.trim().toLowerCase();
  return [...(FRIGIDAIRE_WRONG_FAMILY_FORBIDDEN_TOKENS_V1[key] ?? [])];
}

export function confusionFamilyOwnerReviewRequiredV1(slug: string): boolean {
  return FRIGIDAIRE_CONFUSION_FAMILY_REVIEW_SLUGS_V1.has(slug.trim().toLowerCase());
}

export function resolveForbiddenTokensV1(
  slug: string,
  explicit?: readonly string[],
): string[] {
  if (explicit && explicit.length > 0) {
    return [...new Set(explicit.map(normToken).filter(Boolean))];
  }
  return defaultForbiddenTokensForSlugV1(slug);
}

export function inferBrowserProofPageTypeV1(args: {
  finalUrl: string;
  title: string;
  textSample: string;
}): BrowserProofPageTypeV1 {
  const u = args.finalUrl.trim().toLowerCase();
  const blob = `${args.title}\n${args.textSample}`.toLowerCase();

  if (
    !u ||
    u === "about:blank" ||
    u.startsWith("chrome-error:") ||
    u.includes("chromewebdata")
  ) {
    return "blocked";
  }
  if (BLOCKED_RE.test(blob)) return "blocked";
  if (NOT_FOUND_RE.test(blob)) return "not_found";

  if (/\/partdetail\//i.test(u)) return "product_pdp";
  if (/\/pd\//i.test(u)) return "product_pdp";
  if (/\/store\/parts\/spec\//i.test(u)) return "product_pdp";
  if (/\/products?\//i.test(u)) return "product_pdp";
  if (/frigidaire\.com/.test(u) && /\/en\/p\//.test(u) && !/catalogsearch/.test(u)) {
    return "product_pdp";
  }

  if (
    /catalogsearch|\/search\b|\/search\?|searchresults|search-results|\/search\//i.test(u) ||
    /[?&]q=/.test(u)
  ) {
    return "search_page";
  }
  if (/\/c\/|\/category\/|\/collections\//i.test(u)) return "category_page";

  if (
    /results for|search results|showing \d+ results|no products were found/i.test(blob) &&
    !/\/partdetail\/|\/pd\//i.test(u)
  ) {
    return "search_page";
  }

  return "unknown";
}

export function inferBrowserProofSourceClassV1(args: {
  finalUrl: string;
  pageType: BrowserProofPageTypeV1;
}): BrowserProofSourceClassV1 {
  if (args.pageType === "search_page" || args.pageType === "category_page") {
    return "search_or_catalog";
  }
  const u = args.finalUrl.trim().toLowerCase();
  if (!u) return "unknown";

  if (u.includes("frigidaireapplianceparts.com") && /\/partdetail\//i.test(u)) {
    return "authorized_parts_distributor_pdp";
  }
  if (u.includes("frigidaire.com") && !u.includes("frigidaireapplianceparts")) {
    return args.pageType === "product_pdp" ? "official_manufacturer_pdp" : "search_or_catalog";
  }
  if (u.includes("sharkclean.com")) {
    return args.pageType === "product_pdp" ? "official_manufacturer_pdp" : "search_or_catalog";
  }
  if (u.includes("geapplianceparts.com") && /\/parts\/spec\//i.test(u)) {
    return "official_manufacturer_pdp";
  }
  if (u.includes("lowes.com") || u.includes("homedepot.com") || u.includes("bestbuy.com")) {
    return "retailer_direct_pdp";
  }
  if (u.includes("warnersstellian") || u.includes("ajmadison") || u.includes("dealer")) {
    return "authorized_dealer_pdp";
  }
  return "unknown";
}

/** Max same-host product URLs followed from a search/category capture (AP live-browser only). */
export const BROWSER_PROOF_SEARCH_FOLLOW_MAX_V1 = 3 as const;

function stripWwwHostV1(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function pathLooksLikeSearchOrCatalogV1(pathname: string, search: string): boolean {
  const p = pathname.toLowerCase();
  const q = search.toLowerCase();
  if (p.includes("catalogsearch") || p.includes("/search")) return true;
  if (p.includes("/collections/") || p.includes("/category/") || /\/c\//.test(p)) return true;
  if (/[?&]q=/.test(q) || q.startsWith("?q=") || q.startsWith("&q=")) return true;
  return false;
}

function pathLooksLikeProductPdpV1(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.includes("/products/") || p.includes("/product/")) return true;
  if (p.includes("/partdetail/")) return true;
  if (p.includes("/pd/")) return true;
  if (p.includes("/store/parts/spec/")) return true;
  if (/\/en\/p\//.test(p)) return true;
  return false;
}

/**
 * Keep same-host product PDPs discovered on a captured page. Fridge batches must not
 * enable follow; this is a URL selector only (no extra navigation by itself).
 */
export function selectFollowOnProductUrlsFromHrefsV1(args: {
  pageUrl: string;
  hrefs: readonly string[];
  alreadyQueued?: ReadonlySet<string>;
  maxFollow?: number;
}): string[] {
  const maxFollow = args.maxFollow ?? BROWSER_PROOF_SEARCH_FOLLOW_MAX_V1;
  const already = args.alreadyQueued ?? new Set<string>();
  let page: URL;
  try {
    page = new URL(args.pageUrl);
  } catch {
    return [];
  }
  const pageHost = stripWwwHostV1(page.hostname);
  const selected: string[] = [];
  const seen = new Set<string>(already);

  for (const raw of args.hrefs) {
    if (selected.length >= maxFollow) break;
    let href: URL;
    try {
      href = new URL(raw, page);
    } catch {
      continue;
    }
    if (href.protocol !== "http:" && href.protocol !== "https:") continue;
    if (stripWwwHostV1(href.hostname) !== pageHost) continue;
    if (pathLooksLikeSearchOrCatalogV1(href.pathname, href.search)) continue;
    if (!pathLooksLikeProductPdpV1(href.pathname)) continue;
    const normalized = href.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    selected.push(normalized);
  }
  return selected;
}

export function extractBrowserProofVisibleFactsV1(args: {
  candidateUrl: string;
  finalUrl: string;
  title: string;
  h1: string;
  textSample: string;
  purchaseActions: string[];
  expectedToken: string;
  forbiddenTokens: readonly string[];
  captureSucceeded: boolean;
  navigationError: string | null;
}): BrowserProofVisibleFactsV1 {
  const identityBlob = `${args.title}\n${args.h1}\n${args.textSample}`;
  const page_type = inferBrowserProofPageTypeV1({
    finalUrl: args.finalUrl,
    title: args.title,
    textSample: args.textSample,
  });
  const source_class = inferBrowserProofSourceClassV1({
    finalUrl: args.finalUrl,
    pageType: page_type,
  });

  const forbidden_tokens_present = args.forbiddenTokens
    .map(normToken)
    .filter((t) => t && tokenWordBoundaryPresent(t, identityBlob));

  const extraction_uncertain =
    !args.captureSucceeded ||
    (!args.title.trim() && !args.h1.trim() && !args.textSample.trim());

  return {
    final_url: args.finalUrl || args.candidateUrl,
    title: args.title,
    h1: args.h1,
    visible_text_snippet: args.textSample.slice(0, 800),
    exact_expected_token_present: tokenWordBoundaryPresent(args.expectedToken, identityBlob),
    forbidden_tokens_present,
    price_like_text_present: PRICE_RE.test(identityBlob),
    stock_or_buyability_signal_present: STOCK_RE.test(identityBlob),
    add_to_cart_or_subscription_signals: args.purchaseActions,
    unavailable_signal_present: UNAVAILABLE_RE.test(identityBlob),
    page_type,
    source_class,
    capture_succeeded: args.captureSucceeded,
    navigation_error: args.navigationError,
    extraction_uncertain,
  };
}

/**
 * Pure classifier — PASS / FAIL_AS_PROOF / UNKNOWN.
 * Never auto-promotes to owner-browser-proof-result or mutation.
 */
export function classifyBrowserProofCandidateV1(
  facts: BrowserProofVisibleFactsV1,
): { verdict: BrowserProofCollectorVerdictV1; blockers: string[]; assessment: string } {
  const blockers: string[] = [];

  if (!facts.capture_succeeded) {
    blockers.push("browser_capture_not_completed");
  }
  if (facts.extraction_uncertain) {
    blockers.push("extraction_uncertain");
  }
  if (facts.navigation_error) {
    blockers.push(`navigation_error:${facts.navigation_error.slice(0, 120)}`);
  }
  if (facts.page_type === "blocked") {
    blockers.push("page_blocked");
  }
  if (facts.page_type === "not_found") {
    blockers.push("page_not_found");
  }
  if (facts.page_type === "search_page") {
    blockers.push("page_is_search_not_pdp");
  }
  if (facts.page_type === "category_page") {
    blockers.push("page_is_category_not_pdp");
  }
  if (facts.page_type === "unknown") {
    blockers.push("page_type_unknown");
  }
  if (!facts.exact_expected_token_present) {
    blockers.push("exact_expected_token_missing");
  }
  if (facts.forbidden_tokens_present.length > 0) {
    blockers.push(
      `forbidden_tokens_present:${facts.forbidden_tokens_present.join(",")}`,
    );
  }

  const buyabilitySignal =
    facts.price_like_text_present ||
    facts.stock_or_buyability_signal_present ||
    facts.add_to_cart_or_subscription_signals.length > 0;

  if (facts.page_type === "product_pdp" && !buyabilitySignal) {
    blockers.push("buyability_signal_ambiguous_or_missing");
  }
  if (facts.unavailable_signal_present && facts.add_to_cart_or_subscription_signals.length === 0) {
    blockers.push("unavailable_without_purchase_control");
  }

  const multipleIdentities =
    facts.exact_expected_token_present && facts.forbidden_tokens_present.length > 0;

  if (multipleIdentities) {
    blockers.push("multiple_product_identities");
  }

  // Hard FAIL_AS_PROOF surfaces
  if (
    facts.page_type === "search_page" ||
    facts.page_type === "category_page" ||
    facts.page_type === "not_found"
  ) {
    return {
      verdict: "FAIL_AS_PROOF",
      blockers,
      assessment: `FAIL_AS_PROOF: page_type=${facts.page_type} is not a product PDP proof surface.`,
    };
  }

  if (!facts.exact_expected_token_present && facts.capture_succeeded && !facts.extraction_uncertain) {
    return {
      verdict: "FAIL_AS_PROOF",
      blockers,
      assessment: "FAIL_AS_PROOF: exact expected token not visibly present.",
    };
  }

  if (facts.forbidden_tokens_present.length > 0 && !multipleIdentities) {
    return {
      verdict: "FAIL_AS_PROOF",
      blockers,
      assessment: `FAIL_AS_PROOF: forbidden token(s) present (${facts.forbidden_tokens_present.join(", ")}).`,
    };
  }

  // UNKNOWN surfaces
  if (
    !facts.capture_succeeded ||
    facts.extraction_uncertain ||
    facts.page_type === "blocked" ||
    facts.page_type === "unknown" ||
    multipleIdentities ||
    (facts.page_type === "product_pdp" && !buyabilitySignal)
  ) {
    return {
      verdict: "UNKNOWN",
      blockers,
      assessment:
        multipleIdentities
          ? "UNKNOWN: expected and forbidden tokens both visible — owner must resolve product identity."
          : "UNKNOWN: capture, page type, or buyability is ambiguous.",
    };
  }

  // PASS: product PDP + exact token + no forbidden + buyability signal
  if (
    facts.page_type === "product_pdp" &&
    facts.exact_expected_token_present &&
    facts.forbidden_tokens_present.length === 0 &&
    buyabilitySignal &&
    facts.capture_succeeded &&
    !facts.extraction_uncertain
  ) {
    return {
      verdict: "PASS",
      blockers: [],
      assessment:
        "PASS: product PDP with exact expected token visible and buyability signal; draft only — owner review still required.",
    };
  }

  return {
    verdict: "UNKNOWN",
    blockers,
    assessment: "UNKNOWN: did not meet PASS gates and did not hard-fail.",
  };
}

function overallVerdictV1(
  candidates: readonly BrowserProofCollectorCandidateResultV1[],
): BrowserProofCollectorVerdictV1 {
  if (candidates.length === 0) return "UNKNOWN";
  if (candidates.some((c) => c.verdict === "PASS")) return "PASS";
  if (candidates.every((c) => c.verdict === "FAIL_AS_PROOF")) return "FAIL_AS_PROOF";
  return "UNKNOWN";
}

/**
 * Rank: PASS official manufacturer > PASS authorized distributor > PASS retailer direct
 * > PASS other > UNKNOWN > FAIL_AS_PROOF. Lower is better.
 */
export function rankBrowserProofCandidateV1(
  candidate: Pick<BrowserProofCollectorCandidateResultV1, "verdict" | "facts">,
): number {
  if (candidate.verdict === "FAIL_AS_PROOF") return 100;
  if (candidate.verdict === "UNKNOWN") return 50;
  // PASS
  switch (candidate.facts.source_class) {
    case "official_manufacturer_pdp":
      return 0;
    case "authorized_parts_distributor_pdp":
      return 1;
    case "retailer_direct_pdp":
      return 2;
    case "authorized_dealer_pdp":
      return 3;
    default:
      return 4;
  }
}

/**
 * Early-stop only on official-pass class PASS (manufacturer or authorized parts distributor).
 * Retailer/dealer PASS alone is not safe to stop — continue looking for better proof.
 */
export function isSafeEarlyStopPassV1(
  candidate: Pick<BrowserProofCollectorCandidateResultV1, "verdict" | "facts">,
): boolean {
  if (candidate.verdict !== "PASS") return false;
  return (
    candidate.facts.source_class === "official_manufacturer_pdp" ||
    candidate.facts.source_class === "authorized_parts_distributor_pdp"
  );
}

export function selectBestBrowserProofCandidateV1(
  candidates: readonly BrowserProofCollectorCandidateResultV1[],
): BrowserProofCollectorCandidateResultV1 | null {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestRank = rankBrowserProofCandidateV1(best);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i]!;
    const r = rankBrowserProofCandidateV1(c);
    if (r < bestRank) {
      best = c;
      bestRank = r;
    }
  }
  return best;
}

export function buildCandidateResultFromFactsV1(args: {
  candidateUrl: string;
  facts: BrowserProofVisibleFactsV1;
  screenshotRelPath?: string | null;
  captureAttempts?: BrowserProofCaptureAttemptV1[];
  discoveredSameOriginProductUrls?: readonly string[];
}): BrowserProofCollectorCandidateResultV1 {
  const classified = classifyBrowserProofCandidateV1(args.facts);
  const verdict = enforceCaptureFailureNeverPassV1({
    facts: args.facts,
    verdict: classified.verdict,
  });
  const blockers =
    verdict === classified.verdict
      ? classified.blockers
      : [...classified.blockers, "capture_failure_forced_unknown"];
  const assessment =
    verdict === classified.verdict
      ? classified.assessment
      : "UNKNOWN: capture failure cannot produce PASS.";
  return {
    candidate_url: args.candidateUrl,
    verdict,
    blockers,
    facts: args.facts,
    screenshot_rel_path: args.screenshotRelPath ?? null,
    assessment,
    capture_attempts: args.captureAttempts ?? [],
    discovered_same_origin_product_urls: [...(args.discoveredSameOriginProductUrls ?? [])],
  };
}

export function isUsableCaptureFinalUrlV1(finalUrl: string | null | undefined): boolean {
  const u = (finalUrl ?? "").trim().toLowerCase();
  if (!u) return false;
  if (u === "about:blank") return false;
  if (u.startsWith("chrome-error:") || u.includes("chromewebdata")) return false;
  return true;
}

/**
 * Safety invariant: failed capture can never classify as PASS.
 */
export function enforceCaptureFailureNeverPassV1(args: {
  facts: BrowserProofVisibleFactsV1;
  verdict: BrowserProofCollectorVerdictV1;
}): BrowserProofCollectorVerdictV1 {
  if (!args.facts.capture_succeeded && args.verdict === "PASS") {
    return "UNKNOWN";
  }
  if (!isUsableCaptureFinalUrlV1(args.facts.final_url) && args.verdict === "PASS") {
    return "UNKNOWN";
  }
  return args.verdict;
}

export function buildCaptureAttemptPlanV1(
  options: BrowserProofCaptureOptionsV1 = {},
): Array<{
  attempt_id: string;
  wait_until: BrowserProofWaitUntilV1;
  user_agent_mode: BrowserProofUserAgentModeV1;
  user_agent: string;
  headed: boolean;
  wait_ms: number;
  timeout_ms: number;
  launch_args: string[];
}> {
  const headed = options.headed === true;
  const wait_ms = Math.max(0, options.wait_ms ?? DEFAULT_WAIT_MS);
  const timeout_ms = Math.max(5_000, options.timeout_ms ?? DEFAULT_GOTO_MS);
  const customUa = options.user_agent?.trim() || null;
  const customMode: BrowserProofUserAgentModeV1 = customUa ? "custom" : "desktop_chrome";
  const primaryUa = customUa ?? BROWSER_PROOF_DESKTOP_CHROME_UA_V1;
  const http2Args = [...BROWSER_PROOF_HTTP2_MITIGATION_ARGS_V1];

  const plan: Array<{
    attempt_id: string;
    wait_until: BrowserProofWaitUntilV1;
    user_agent_mode: BrowserProofUserAgentModeV1;
    user_agent: string;
    headed: boolean;
    wait_ms: number;
    timeout_ms: number;
    launch_args: string[];
  }> = [
    {
      attempt_id: "a1_domcontentloaded_collector_ua",
      wait_until: "domcontentloaded",
      user_agent_mode: "collector",
      user_agent: BROWSER_PROOF_COLLECTOR_UA_V1,
      headed,
      wait_ms,
      timeout_ms,
      launch_args: [],
    },
    {
      attempt_id: "a2_load_collector_ua",
      wait_until: "load",
      user_agent_mode: "collector",
      user_agent: BROWSER_PROOF_COLLECTOR_UA_V1,
      headed,
      wait_ms,
      timeout_ms,
      launch_args: [],
    },
    {
      attempt_id: "a3_load_desktop_chrome_ua",
      wait_until: "load",
      user_agent_mode: customMode,
      user_agent: primaryUa,
      headed,
      wait_ms,
      timeout_ms,
      launch_args: [],
    },
    {
      attempt_id: "a4_load_desktop_chrome_ua_disable_http2",
      wait_until: "load",
      user_agent_mode: customMode,
      user_agent: primaryUa,
      headed,
      wait_ms,
      timeout_ms,
      launch_args: http2Args,
    },
    {
      attempt_id: "a5_networkidle_desktop_chrome_ua_disable_http2",
      wait_until: "networkidle",
      user_agent_mode: customMode,
      user_agent: primaryUa,
      headed,
      wait_ms,
      timeout_ms,
      launch_args: http2Args,
    },
  ];

  return plan;
}

export function buildBrowserProofCollectorDraftFromCandidatesV1(args: {
  slug: string;
  expectedToken: string;
  forbiddenTokens?: readonly string[];
  candidates: readonly BrowserProofCollectorCandidateResultV1[];
  captureMethod?: "playwright_headless" | "playwright_headed" | "fixture_only";
  captureOptions?: BrowserProofCaptureOptionsV1;
  collectAll?: boolean;
  earlyStop?: {
    stopped: boolean;
    reason: string | null;
    stopped_after_candidate_url: string | null;
  };
  now?: () => Date;
}): BrowserProofCollectorDraftV1 {
  const now = args.now ?? (() => new Date());
  const forbidden = resolveForbiddenTokensV1(args.slug, args.forbiddenTokens);
  const candidates = [...args.candidates];
  const best = selectBestBrowserProofCandidateV1(candidates);
  const overall = overallVerdictV1(candidates);
  const confusion = confusionFamilyOwnerReviewRequiredV1(args.slug);
  const headed = args.captureOptions?.headed === true;
  const wait_ms = args.captureOptions?.wait_ms ?? DEFAULT_WAIT_MS;
  const timeout_ms = args.captureOptions?.timeout_ms ?? DEFAULT_GOTO_MS;
  const user_agent_mode: BrowserProofUserAgentModeV1 = args.captureOptions?.user_agent?.trim()
    ? "custom"
    : "desktop_chrome";
  const allAttempts = candidates.flatMap((c) => c.capture_attempts);
  const attemptErrors = allAttempts
    .filter((a) => !a.success)
    .map((a) => `${a.attempt_id}: ${a.error ?? "unknown_error"}`);
  const batch_mode = candidates.length > 1;
  const collect_all = args.collectAll === true;
  const early_stop = args.earlyStop ?? {
    stopped: false,
    reason: null,
    stopped_after_candidate_url: null,
  };
  const bestRank = best ? rankBrowserProofCandidateV1(best) : null;

  const bestNote =
    best && best.verdict === "PASS"
      ? ` Best candidate: ${best.candidate_url} (${best.facts.source_class}).`
      : "";

  return {
    contract: BROWSER_PROOF_COLLECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    production_go_click_authorized: false,
    apply_plan_proposal_justified: false,
    promotes_to_owner_browser_proof_result: false,
    founder_approval_authorized: false,
    generated_at: now().toISOString(),
    capture_method:
      args.captureMethod ??
      (headed ? "playwright_headed" : "playwright_headless"),
    capture_options: {
      headed,
      wait_ms,
      timeout_ms,
      user_agent_mode,
    },
    capture_attempts: allAttempts,
    batch_mode,
    collect_all,
    early_stop,
    best_candidate_url: best?.candidate_url ?? null,
    best_candidate_rank: bestRank,
    slug: args.slug.trim().toLowerCase(),
    expected_token: normToken(args.expectedToken),
    forbidden_tokens: forbidden,
    confusion_family_owner_review_required: confusion,
    owner_review_required: true,
    candidates,
    overall_verdict: overall,
    recommended_next_action:
      overall === "PASS"
        ? `Owner review draft collector output.${bestNote} If accepted, manually author owner-browser-proof-result + evidence; do not treat collector PASS as apply-ready.`
        : overall === "FAIL_AS_PROOF"
          ? "No candidate is usable as browser proof. Capture a product PDP (official manufacturer or authorized parts distributor PartDetail), not search/category."
          : attemptErrors.length > 0
            ? `Resolve UNKNOWN capture failure. Attempts: ${attemptErrors.slice(0, 5).join(" | ")}${attemptErrors.length > 5 ? " …" : ""}. Retry with --headed --wait-ms 3000 or owner browser checklist.`
            : "Resolve UNKNOWN (blocked page, ambiguous identity/buyability, or capture failure) before owner-browser-proof-result.",
    proven_facts: [
      "PROVEN: browser_proof_collector_v1 is draft-only; all mutation and approval flags false.",
      "PROVEN: collector does not write owner-browser-proof-result or founder approvals.",
      "PROVEN: capture failure can never produce PASS.",
      `PROVEN: overall_verdict=${overall}.`,
      `PROVEN: candidate_count=${String(candidates.length)} batch_mode=${String(batch_mode)}.`,
      `PROVEN: capture_attempts=${String(allAttempts.length)} success=${String(allAttempts.some((a) => a.success))}.`,
      ...(best
        ? [
            `PROVEN: best_candidate_rank=${String(bestRank)} source_class=${best.facts.source_class} verdict=${best.verdict}.`,
          ]
        : []),
      ...(early_stop.stopped
        ? [`PROVEN: early_stop after official-pass class PASS (${early_stop.reason}).`]
        : []),
      ...(confusion
        ? ["PROVEN: confusion-family slug — owner review remains required even on collector PASS."]
        : []),
    ],
    unknown_facts: [
      "UNKNOWN: owner acceptance of this draft as committed browser proof.",
      "UNKNOWN: readiness-gate eligibility until owner-browser-proof-result is authored separately.",
      ...(attemptErrors.length > 0 && candidates.every((c) => !c.facts.capture_succeeded)
        ? [`UNKNOWN: all capture attempts failed (${attemptErrors.length}).`]
        : []),
    ],
    not_authorized: [
      "retailer_links_csv_mutation",
      "supabase_mutation",
      "data/evidence_mutation",
      "owner_browser_proof_result_auto_write",
      "founder_approval_auto_create",
      "apply_plan_auto_create",
      "readiness_gate_auto_pass",
      "VALIDATION_PASS",
      "live_link_mutation",
    ],
  };
}

export function buildBrowserProofCollectorDraftFromFactsV1(args: {
  input: BrowserProofCollectorInputV1;
  facts: BrowserProofVisibleFactsV1;
  screenshotRelPath?: string | null;
  captureMethod?: "playwright_headless" | "playwright_headed" | "fixture_only";
  captureOptions?: BrowserProofCaptureOptionsV1;
  captureAttempts?: BrowserProofCaptureAttemptV1[];
  now?: () => Date;
}): BrowserProofCollectorDraftV1 {
  const candidate = buildCandidateResultFromFactsV1({
    candidateUrl: args.input.candidate_url,
    facts: args.facts,
    screenshotRelPath: args.screenshotRelPath,
    captureAttempts: args.captureAttempts,
  });
  return buildBrowserProofCollectorDraftFromCandidatesV1({
    slug: args.input.slug,
    expectedToken: args.input.expected_token,
    forbiddenTokens: args.input.forbidden_tokens,
    candidates: [candidate],
    captureMethod: args.captureMethod,
    captureOptions: args.captureOptions,
    collectAll: false,
    now: args.now,
  });
}

async function extractPurchaseActionsFromPageV1(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
): Promise<string[]> {
  const purchaseActions: string[] = [];
  const candidates = page.locator(
    'button, [role="button"], a, input[type="submit"], input[type="button"]',
  );
  const count = Math.min(await candidates.count().catch(() => 0), 200);
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const text = [
      await el.textContent().catch(() => ""),
      await el.getAttribute("aria-label").catch(() => ""),
      await el.getAttribute("title").catch(() => ""),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || !PURCHASE_RE.test(text) || seen.has(text)) continue;
    seen.add(text);
    purchaseActions.push(text);
    if (purchaseActions.length >= 6) break;
  }
  return purchaseActions;
}

async function runSingleCaptureAttemptV1(args: {
  url: string;
  attempt: ReturnType<typeof buildCaptureAttemptPlanV1>[number];
  rootDir: string;
  screenshotRel: string;
  writeScreenshot: boolean;
}): Promise<{
  attempt: BrowserProofCaptureAttemptV1;
  finalUrl: string;
  title: string;
  h1: string;
  textSample: string;
  purchaseActions: string[];
  captureSucceeded: boolean;
  sameOriginProductHrefs: string[];
}> {
  const plan = args.attempt;
  // networkidle can hang on chatty sites — cap it below other waitUntil modes.
  const gotoTimeoutMs =
    plan.wait_until === "networkidle"
      ? Math.min(plan.timeout_ms, 20_000)
      : plan.timeout_ms;
  const hardMs = gotoTimeoutMs + plan.wait_ms + 5_000;

  let finalUrl = "";
  let title = "";
  let h1 = "";
  let textSample = "";
  let purchaseActions: string[] = [];
  let sameOriginProductHrefs: string[] = [];
  let navigationError: string | null = null;
  let gotoFailed = false;
  let hardTimedOut = false;

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let page: any = null;

  try {
    browser = await chromium.launch({
      headless: !plan.headed,
      args: plan.launch_args,
    });
    const context = await browser.newContext({
      userAgent: plan.user_agent,
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    page = await context.newPage();

    const hardTimer = setTimeout(() => {
      hardTimedOut = true;
      void page?.close().catch(() => {});
    }, hardMs);

    try {
      try {
        await page.goto(args.url, {
          waitUntil: plan.wait_until,
          timeout: gotoTimeoutMs,
        });
        if (!hardTimedOut && plan.wait_ms > 0) await delay(plan.wait_ms);
      } catch (e) {
        gotoFailed = true;
        navigationError = e instanceof Error ? e.message : String(e);
      }

      if (!hardTimedOut && !page.isClosed()) {
        finalUrl = page.url();
        title = (await page.title().catch(() => "")) ?? "";
        h1 = (await page.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
        textSample = (
          await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")
        ).slice(0, TEXT_SAMPLE_MAX);
        purchaseActions = await extractPurchaseActionsFromPageV1(page);
        const rawHrefs: string[] = (
          await page
            .evaluate(() =>
              Array.from(document.querySelectorAll("a[href]")).map((el) => {
                const href = (el as HTMLAnchorElement).href;
                return typeof href === "string" ? href : "";
              }),
            )
            .catch(() => [])
        ) as string[];
        sameOriginProductHrefs = selectFollowOnProductUrlsFromHrefsV1({
          pageUrl: finalUrl || args.url,
          hrefs: rawHrefs,
          maxFollow: BROWSER_PROOF_SEARCH_FOLLOW_MAX_V1,
        });
      }
    } finally {
      clearTimeout(hardTimer);
    }

    const captureSucceeded =
      !gotoFailed &&
      !hardTimedOut &&
      isUsableCaptureFinalUrlV1(finalUrl) &&
      Boolean(title.trim() || h1.trim() || textSample.trim());

    if (captureSucceeded && args.writeScreenshot && page && !page.isClosed()) {
      const abs = path.join(args.rootDir, args.screenshotRel);
      mkdirSync(path.dirname(abs), { recursive: true });
      await page.screenshot({ path: abs, fullPage: false }).catch(() => {});
    }

    await context.close().catch(() => {});

    if (hardTimedOut && !navigationError) navigationError = "hard_timeout";
    if (!isUsableCaptureFinalUrlV1(finalUrl) && !navigationError) {
      navigationError = `unusable_final_url:${finalUrl || "(empty)"}`;
    }

    return {
      attempt: {
        attempt_id: plan.attempt_id,
        wait_until: plan.wait_until,
        user_agent_mode: plan.user_agent_mode,
        user_agent: plan.user_agent,
        headed: plan.headed,
        wait_ms: plan.wait_ms,
        timeout_ms: gotoTimeoutMs,
        launch_args: plan.launch_args,
        success: captureSucceeded,
        error: captureSucceeded ? null : navigationError,
        final_url: finalUrl || null,
      },
      finalUrl,
      title,
      h1,
      textSample,
      purchaseActions,
      captureSucceeded,
      sameOriginProductHrefs,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      attempt: {
        attempt_id: plan.attempt_id,
        wait_until: plan.wait_until,
        user_agent_mode: plan.user_agent_mode,
        user_agent: plan.user_agent,
        headed: plan.headed,
        wait_ms: plan.wait_ms,
        timeout_ms: gotoTimeoutMs,
        launch_args: plan.launch_args,
        success: false,
        error: err,
        final_url: finalUrl || null,
      },
      finalUrl,
      title,
      h1,
      textSample,
      purchaseActions,
      captureSucceeded: false,
      sameOriginProductHrefs,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function capturePageSignalsWithFallbacksV1(args: {
  url: string;
  rootDir: string;
  screenshotRel: string;
  writeScreenshot: boolean;
  options?: BrowserProofCaptureOptionsV1;
}): Promise<{
  finalUrl: string;
  title: string;
  h1: string;
  textSample: string;
  purchaseActions: string[];
  captureSucceeded: boolean;
  navigationError: string | null;
  attempts: BrowserProofCaptureAttemptV1[];
  sameOriginProductHrefs: string[];
}> {
  const plan = buildCaptureAttemptPlanV1(args.options ?? {});
  const attempts: BrowserProofCaptureAttemptV1[] = [];

  for (const step of plan) {
    const result = await runSingleCaptureAttemptV1({
      url: args.url,
      attempt: step,
      rootDir: args.rootDir,
      screenshotRel: args.screenshotRel,
      writeScreenshot: args.writeScreenshot,
    });
    attempts.push(result.attempt);
    if (result.captureSucceeded) {
      return {
        finalUrl: result.finalUrl,
        title: result.title,
        h1: result.h1,
        textSample: result.textSample,
        purchaseActions: result.purchaseActions,
        captureSucceeded: true,
        navigationError: null,
        attempts,
        sameOriginProductHrefs: result.sameOriginProductHrefs,
      };
    }
  }

  const errors = attempts
    .map((a) => a.error)
    .filter((e): e is string => Boolean(e));
  return {
    finalUrl: attempts[attempts.length - 1]?.final_url ?? "",
    title: "",
    h1: "",
    textSample: "",
    purchaseActions: [],
    captureSucceeded: false,
    navigationError: errors.length > 0 ? errors.join(" || ") : "all_capture_attempts_failed",
    attempts,
    sameOriginProductHrefs: [],
  };
}

export function browserProofCollectorArtifactPathsV1(args: {
  slug: string;
  candidateUrl: string;
  generatedAtIso: string;
}): { draftJsonRel: string; screenshotRel: string } {
  const slug = args.slug.trim().toLowerCase();
  const stamp = args.generatedAtIso.replace(/[:.]/g, "-");
  const urlHash = createHash("sha256").update(args.candidateUrl).digest("hex").slice(0, 12);
  const base = `${BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1}/${slug}`;
  return {
    draftJsonRel: `${base}/browser-proof-collector-${slug}-${urlHash}-${stamp}.json`,
    screenshotRel: `${base}/screenshots/browser-proof-collector-${slug}-${urlHash}-${stamp}.png`,
  };
}

export function browserProofCollectorBatchDraftPathV1(args: {
  slug: string;
  candidateUrls: readonly string[];
  generatedAtIso: string;
}): string {
  const slug = args.slug.trim().toLowerCase();
  const stamp = args.generatedAtIso.replace(/[:.]/g, "-");
  const batchHash = createHash("sha256")
    .update(args.candidateUrls.join("\n"))
    .digest("hex")
    .slice(0, 12);
  const base = `${BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1}/${slug}`;
  return `${base}/browser-proof-collector-batch-${slug}-${batchHash}-${stamp}.json`;
}

export function browserProofCollectorScreenshotPathV1(args: {
  slug: string;
  candidateUrl: string;
  generatedAtIso: string;
}): string {
  return browserProofCollectorArtifactPathsV1(args).screenshotRel;
}

export function writeBrowserProofCollectorDraftV1(args: {
  rootDir: string;
  draft: BrowserProofCollectorDraftV1;
  draftJsonRel: string;
}): string {
  const abs = path.join(args.rootDir, args.draftJsonRel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.draft, null, 2)}\n`, "utf8");
  return args.draftJsonRel;
}

async function captureOneCandidateV1(args: {
  rootDir: string;
  slug: string;
  expectedToken: string;
  forbiddenTokens: readonly string[];
  candidateUrl: string;
  generatedAtIso: string;
  writeDrafts: boolean;
  captureOptions: BrowserProofCaptureOptionsV1;
}): Promise<BrowserProofCollectorCandidateResultV1> {
  const screenshotRel = browserProofCollectorScreenshotPathV1({
    slug: args.slug,
    candidateUrl: args.candidateUrl,
    generatedAtIso: args.generatedAtIso,
  });

  try {
    const capture = await capturePageSignalsWithFallbacksV1({
      url: args.candidateUrl,
      rootDir: args.rootDir,
      screenshotRel,
      writeScreenshot: args.writeDrafts,
      options: args.captureOptions,
    });
    const facts = extractBrowserProofVisibleFactsV1({
      candidateUrl: args.candidateUrl,
      finalUrl: capture.finalUrl,
      title: capture.title,
      h1: capture.h1,
      textSample: capture.textSample,
      purchaseActions: capture.purchaseActions,
      expectedToken: args.expectedToken,
      forbiddenTokens: args.forbiddenTokens,
      captureSucceeded: capture.captureSucceeded,
      navigationError: capture.navigationError,
    });
    return buildCandidateResultFromFactsV1({
      candidateUrl: args.candidateUrl,
      facts,
      screenshotRelPath:
        args.writeDrafts && capture.captureSucceeded ? screenshotRel : null,
      captureAttempts: capture.attempts,
      discoveredSameOriginProductUrls: capture.sameOriginProductHrefs,
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    const attempts: BrowserProofCaptureAttemptV1[] = [
      {
        attempt_id: "fatal_capture_exception",
        wait_until: "domcontentloaded",
        user_agent_mode: "collector",
        user_agent: BROWSER_PROOF_COLLECTOR_UA_V1,
        headed: args.captureOptions.headed === true,
        wait_ms: args.captureOptions.wait_ms ?? DEFAULT_WAIT_MS,
        timeout_ms: args.captureOptions.timeout_ms ?? DEFAULT_GOTO_MS,
        launch_args: [],
        success: false,
        error: err,
        final_url: null,
      },
    ];
    const facts = extractBrowserProofVisibleFactsV1({
      candidateUrl: args.candidateUrl,
      finalUrl: "",
      title: "",
      h1: "",
      textSample: "",
      purchaseActions: [],
      expectedToken: args.expectedToken,
      forbiddenTokens: args.forbiddenTokens,
      captureSucceeded: false,
      navigationError: err,
    });
    return buildCandidateResultFromFactsV1({
      candidateUrl: args.candidateUrl,
      facts,
      screenshotRelPath: null,
      captureAttempts: attempts,
    });
  }
}

export async function runBrowserProofCollectorBatchV1(args: {
  rootDir: string;
  input: BrowserProofCollectorBatchInputV1;
  writeDrafts?: boolean;
  captureOptions?: BrowserProofCaptureOptionsV1;
  collectAll?: boolean;
  /** Default false. Fridge batches must leave this off. AP live-browser sets true. */
  followSearchToProductLinks?: boolean;
  maxSearchFollowProductLinks?: number;
  now?: () => Date;
}): Promise<{ draft: BrowserProofCollectorDraftV1; draft_json_rel: string | null }> {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const urls = [
    ...new Set(
      args.input.candidate_urls.map((u) => u.trim()).filter((u) => u.length > 0),
    ),
  ];
  if (urls.length === 0) {
    throw new Error("browser_proof_collector_batch_requires_at_least_one_url");
  }

  const forbidden = resolveForbiddenTokensV1(args.input.slug, args.input.forbidden_tokens);
  const writeDrafts = args.writeDrafts !== false;
  const captureOptions = args.captureOptions ?? {};
  const captureMethod =
    captureOptions.headed === true ? "playwright_headed" : "playwright_headless";
  const collectAll = args.collectAll === true;
  const followSearch = args.followSearchToProductLinks === true;
  const maxFollow = args.maxSearchFollowProductLinks ?? BROWSER_PROOF_SEARCH_FOLLOW_MAX_V1;

  const candidates: BrowserProofCollectorCandidateResultV1[] = [];
  let earlyStop: {
    stopped: boolean;
    reason: string | null;
    stopped_after_candidate_url: string | null;
  } = { stopped: false, reason: null, stopped_after_candidate_url: null };

  const captureOne = (url: string) =>
    captureOneCandidateV1({
      rootDir: args.rootDir,
      slug: args.input.slug,
      expectedToken: args.input.expected_token,
      forbiddenTokens: forbidden,
      candidateUrl: url,
      generatedAtIso: generatedAt,
      writeDrafts,
      captureOptions,
    });

  for (const url of urls) {
    const candidate = await captureOne(url);
    candidates.push(candidate);

    if (!collectAll && isSafeEarlyStopPassV1(candidate)) {
      earlyStop = {
        stopped: true,
        reason: `PASS_${candidate.facts.source_class}`,
        stopped_after_candidate_url: url,
      };
      break;
    }
  }

  if (followSearch && !earlyStop.stopped) {
    const queued = new Set(urls);
    const follow: string[] = [];
    for (const candidate of candidates) {
      if (
        candidate.facts.page_type !== "search_page" &&
        candidate.facts.page_type !== "category_page"
      ) {
        continue;
      }
      for (const href of candidate.discovered_same_origin_product_urls ?? []) {
        if (queued.has(href) || follow.includes(href)) continue;
        if (follow.length >= maxFollow) break;
        queued.add(href);
        follow.push(href);
      }
      if (follow.length >= maxFollow) break;
    }
    for (const url of follow) {
      candidates.push(await captureOne(url));
    }
  }

  const draft = buildBrowserProofCollectorDraftFromCandidatesV1({
    slug: args.input.slug,
    expectedToken: args.input.expected_token,
    forbiddenTokens: forbidden,
    candidates,
    captureMethod,
    captureOptions,
    collectAll,
    earlyStop,
    now,
  });

  const draftJsonRel =
    urls.length === 1
      ? browserProofCollectorArtifactPathsV1({
          slug: args.input.slug,
          candidateUrl: urls[0]!,
          generatedAtIso: generatedAt,
        }).draftJsonRel
      : browserProofCollectorBatchDraftPathV1({
          slug: args.input.slug,
          candidateUrls: urls,
          generatedAtIso: generatedAt,
        });

  const draft_json_rel = writeDrafts
    ? writeBrowserProofCollectorDraftV1({
        rootDir: args.rootDir,
        draft,
        draftJsonRel,
      })
    : null;

  return { draft, draft_json_rel };
}

export async function runBrowserProofCollectorV1(args: {
  rootDir: string;
  input: BrowserProofCollectorInputV1;
  writeDrafts?: boolean;
  captureOptions?: BrowserProofCaptureOptionsV1;
  collectAll?: boolean;
  now?: () => Date;
}): Promise<{ draft: BrowserProofCollectorDraftV1; draft_json_rel: string | null }> {
  return runBrowserProofCollectorBatchV1({
    rootDir: args.rootDir,
    input: {
      slug: args.input.slug,
      expected_token: args.input.expected_token,
      candidate_urls: [args.input.candidate_url],
      forbidden_tokens: args.input.forbidden_tokens,
    },
    writeDrafts: args.writeDrafts,
    captureOptions: args.captureOptions,
    collectAll: args.collectAll,
    now: args.now,
  });
}

export function loadBrowserProofCollectorUrlsFileV1(args: {
  rootDir: string;
  relPath: string;
  readText?: (abs: string) => string;
}): string[] {
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.isAbsolute(args.relPath)
    ? args.relPath
    : path.join(args.rootDir, args.relPath);
  return readText(abs)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export function parseBrowserProofCollectorCliArgsV1(argv: readonly string[]): {
  slug: string | null;
  token: string | null;
  urls: string[];
  urls_file: string | null;
  forbidden: string[];
  writeDrafts: boolean;
  headed: boolean;
  wait_ms: number | null;
  timeout_ms: number | null;
  user_agent: string | null;
  collect_all: boolean;
} {
  let slug: string | null = null;
  let token: string | null = null;
  const urls: string[] = [];
  let urls_file: string | null = null;
  let forbidden: string[] = [];
  let writeDrafts = true;
  let headed = false;
  let wait_ms: number | null = null;
  let timeout_ms: number | null = null;
  let user_agent: string | null = null;
  let collect_all = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--slug" && next) {
      slug = next;
      i++;
    } else if (a === "--token" && next) {
      token = next;
      i++;
    } else if (a === "--url" && next) {
      urls.push(next);
      i++;
    } else if (a === "--urls-file" && next) {
      urls_file = next;
      i++;
    } else if (a === "--forbidden" && next) {
      forbidden = next
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i++;
    } else if (a === "--no-write") {
      writeDrafts = false;
    } else if (a === "--headed") {
      headed = true;
    } else if (a === "--collect-all") {
      collect_all = true;
    } else if (a === "--wait-ms" && next) {
      wait_ms = Number(next);
      i++;
    } else if (a === "--timeout-ms" && next) {
      timeout_ms = Number(next);
      i++;
    } else if (a === "--user-agent" && next) {
      user_agent = next;
      i++;
    }
  }

  return {
    slug,
    token,
    urls,
    urls_file,
    forbidden,
    writeDrafts,
    headed,
    wait_ms: Number.isFinite(wait_ms) ? wait_ms : null,
    timeout_ms: Number.isFinite(timeout_ms) ? timeout_ms : null,
    user_agent,
    collect_all,
  };
}
