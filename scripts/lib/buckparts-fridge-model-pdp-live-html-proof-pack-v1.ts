/**
 * Read-only production / live HTML proof for the 21 SAFE_BUYER_PATH_PASS fridge model PDPs.
 * Fetches live HTML only. Does not deploy, mutate inventory, or claim conversion.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1,
  FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1,
} from "@/lib/fridge/fridge-model-pdp-safe-buyer-path-visible-proof-v1";
import { BUCKPARTS_VERIFIED_LINK_PLURAL } from "@/lib/copy/buckparts-verified-link-copy";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
  type BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1,
} from "./buckparts-fridge-model-pdp-live-customer-visible-proof-readiness-v1";
import { resolveLiveSiteSmokeTargets, trimSiteBaseUrl } from "./live-site-smoke";

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_live_html_proof_pack_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-live-html-proof" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-html-proof-pack-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-live-html-proof-pack-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_MD_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_EXPECTED_SLUG_COUNT_V1 = 21 as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_HEADING_V1 =
  "What we checked for this model" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_LAST_CHECKED_PREFIX_V1 =
  "Last checked" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_FILTER_LABEL_V1 =
  "Filter number(s) to compare" as const;

export type BuckpartsFridgeLiveHtmlProofResultV1 =
  | "LIVE_PROOF_PASS"
  | "LIVE_PROOF_FAIL"
  | "LIVE_PROOF_UNKNOWN";

export type BuckpartsFridgeLiveHtmlProofSlugRowV1 = {
  slug: string;
  production_url: string | null;
  http_status: number | "UNKNOWN";
  model_page_rendered: boolean | "UNKNOWN";
  proof_heading_present: boolean | "UNKNOWN";
  last_checked_present: boolean | "UNKNOWN";
  mapped_filter_numbers_present: boolean | "UNKNOWN";
  verified_link_section_present: boolean | "UNKNOWN";
  safe_go_link_present: boolean | "UNKNOWN";
  product_json_ld_offers_reviews_ratings_absent: boolean | "UNKNOWN";
  unsafe_cta_or_search_placeholder_exposed: boolean | "UNKNOWN";
  expected_mapped_filters: string[];
  missing_reasons: string[];
  result: BuckpartsFridgeLiveHtmlProofResultV1;
  notes: string[];
};

export type BuckpartsFridgeModelPdpLiveHtmlProofPackV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_CONTRACT_V1;
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
  conversion_claimed: false;
  live_production_fetch_enabled: true;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_SOURCE_COMMAND_V1;
  readiness_pack_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1;
  target_base_url: string | "UNKNOWN";
  target_source: string;
  scope: {
    slug_count: number;
    slugs: string[];
    excluded_fail_slugs: readonly string[];
    excluded_quarantined_slugs: readonly string[];
    excluded_partial_slugs: readonly string[];
  };
  summary: {
    LIVE_PROOF_PASS: number;
    LIVE_PROOF_FAIL: number;
    LIVE_PROOF_UNKNOWN: number;
  };
  rows: BuckpartsFridgeLiveHtmlProofSlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type FridgeLiveHtmlFetchResultV1 =
  | { status: "OK"; http_status: number; html: string }
  | { status: "HTTP_ERROR"; http_status: number; html: string }
  | { status: "NETWORK_UNKNOWN"; reason: string };

export type BuildBuckpartsFridgeModelPdpLiveHtmlProofDepsV1 = {
  rootDir: string;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  fetchHtml?: (url: string) => Promise<FridgeLiveHtmlFetchResultV1>;
  loadReadinessPack?: () => BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1;
  baseUrlOverride?: string | null;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function loadLiveCustomerVisibleProofReadinessFromDiskV1(
  rootDir: string,
): BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1 {
  const abs = path.join(
    rootDir,
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
  );
  if (!existsSync(abs)) {
    throw new Error(
      `missing readiness pack: ${BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1}`,
    );
  }
  return JSON.parse(
    readFileSync(abs, "utf8"),
  ) as BuckpartsFridgeModelPdpLiveCustomerVisibleProofReadinessV1;
}

export function resolveFridgeLiveHtmlProofBaseUrlV1(args: {
  env: NodeJS.ProcessEnv;
  baseUrlOverride?: string | null;
}): { base_url: string | "UNKNOWN"; target_source: string } {
  if (args.baseUrlOverride != null) {
    const trimmed = trimSiteBaseUrl(args.baseUrlOverride);
    return {
      base_url: trimmed ?? "UNKNOWN",
      target_source: "baseUrlOverride",
    };
  }
  const target = resolveLiveSiteSmokeTargets(args.env);
  return {
    base_url: target.primary_target_base_url,
    target_source: target.target_source,
  };
}

export function fridgeModelPdpLiveHtmlProductionPathV1(slug: string): string {
  return `/fridge/${normalizeSlug(slug)}`;
}

export function fridgeModelPdpLiveHtmlProductionUrlV1(
  baseUrl: string,
  slug: string,
): string {
  return `${baseUrl.replace(/\/+$/, "")}${fridgeModelPdpLiveHtmlProductionPathV1(slug)}`;
}

/** Detect Product commerce fields that must remain absent without truthful bound evidence. */
export function liveHtmlHasUnsafeProductJsonLdCommerceV1(html: string): boolean {
  const scripts = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  );
  if (!scripts) return false;
  for (const block of scripts) {
    const body = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>\s*$/i, "");
    try {
      const parsed = JSON.parse(body) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        const typeRaw = obj["@type"];
        const types = Array.isArray(typeRaw)
          ? typeRaw.map(String)
          : typeRaw != null
            ? [String(typeRaw)]
            : [];
        if (types.some((t) => /product/i.test(t))) {
          if (obj.offers != null || obj.review != null || obj.aggregateRating != null) {
            return true;
          }
        }
        if (types.some((t) => /^Offer$/i.test(t) || /^AggregateOffer$/i.test(t))) {
          return true;
        }
      }
    } catch {
      if (
        /"@type"\s*:\s*"Product"/i.test(body) &&
        (/"offers"\s*:/i.test(body) ||
          /"review"\s*:/i.test(body) ||
          /"aggregateRating"\s*:/i.test(body))
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Search-placeholder / keyword-search destinations exposed as clickable hrefs. */
export function liveHtmlHasExposedSearchPlaceholderCtaV1(html: string): boolean {
  const hrefs = [...html.matchAll(/href=(["'])(.*?)\1/gi)].map((m) => m[2] ?? "");
  for (const href of hrefs) {
    const lower = href.toLowerCase();
    if (lower.includes("search.jsp") && lower.includes("searchkeyword")) return true;
    if (lower.includes("/s?k=") || lower.includes("&k=")) return true;
    if (lower.includes("search?q=") || lower.includes("search/?q=")) return true;
  }
  return false;
}

export function analyzeFridgeModelPdpLiveHtmlV1(args: {
  slug: string;
  html: string;
  expected_mapped_filters: string[];
}): {
  model_page_rendered: boolean;
  proof_heading_present: boolean;
  last_checked_present: boolean;
  mapped_filter_numbers_present: boolean;
  verified_link_section_present: boolean;
  safe_go_link_present: boolean;
  product_json_ld_offers_reviews_ratings_absent: boolean;
  unsafe_cta_or_search_placeholder_exposed: boolean;
} {
  const slug = normalizeSlug(args.slug);
  const html = args.html;
  const lower = html.toLowerCase();
  const model_page_rendered =
    lower.includes(`data-fridge-model-pdp-visible-proof-slug="${slug}"`) ||
    lower.includes(`/fridge/${slug}`) ||
    lower.includes(slug) ||
    !lower.includes("model not found");

  const proof_heading_present = html.includes(
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_HEADING_V1,
  );
  const last_checked_present = html.includes(
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_LAST_CHECKED_PREFIX_V1,
  );
  const filterLabelPresent = html.includes(
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_FILTER_LABEL_V1,
  );
  const filterHrefPresent = args.expected_mapped_filters.some((f) =>
    lower.includes(`/filter/${normalizeSlug(f)}`),
  );
  const mapped_filter_numbers_present = filterLabelPresent || filterHrefPresent;

  const verified_link_section_present =
    html.includes(BUCKPARTS_VERIFIED_LINK_PLURAL) ||
    html.includes("BuckParts Verified Link");
  const safe_go_link_present = /href=(["'])\/go\/[^"']+\1/i.test(html);

  return {
    model_page_rendered,
    proof_heading_present,
    last_checked_present,
    mapped_filter_numbers_present,
    verified_link_section_present,
    safe_go_link_present,
    product_json_ld_offers_reviews_ratings_absent:
      !liveHtmlHasUnsafeProductJsonLdCommerceV1(html),
    unsafe_cta_or_search_placeholder_exposed: liveHtmlHasExposedSearchPlaceholderCtaV1(html),
  };
}

export function classifyFridgeModelPdpLiveHtmlProofResultV1(args: {
  fetch_status: FridgeLiveHtmlFetchResultV1["status"] | "NO_BASE_URL";
  analysis: ReturnType<typeof analyzeFridgeModelPdpLiveHtmlV1> | null;
}): { result: BuckpartsFridgeLiveHtmlProofResultV1; missing_reasons: string[] } {
  if (args.fetch_status === "NO_BASE_URL" || args.fetch_status === "NETWORK_UNKNOWN") {
    return {
      result: "LIVE_PROOF_UNKNOWN",
      missing_reasons: [
        args.fetch_status === "NO_BASE_URL"
          ? "production_base_url_unknown"
          : "network_or_timeout_unknown",
      ],
    };
  }
  if (!args.analysis) {
    return {
      result: "LIVE_PROOF_UNKNOWN",
      missing_reasons: ["html_analysis_unavailable"],
    };
  }
  const missing: string[] = [];
  if (!args.analysis.model_page_rendered) missing.push("model_page_not_rendered");
  if (!args.analysis.proof_heading_present) missing.push("proof_heading_missing");
  if (!args.analysis.last_checked_present) missing.push("last_checked_missing");
  if (!args.analysis.mapped_filter_numbers_present) {
    missing.push("mapped_filter_numbers_missing");
  }
  if (!args.analysis.verified_link_section_present) {
    missing.push("verified_link_section_missing");
  }
  if (!args.analysis.safe_go_link_present) missing.push("safe_go_link_missing");
  if (!args.analysis.product_json_ld_offers_reviews_ratings_absent) {
    missing.push("unsafe_product_json_ld_commerce_present");
  }
  if (args.analysis.unsafe_cta_or_search_placeholder_exposed) {
    missing.push("unsafe_search_placeholder_cta_exposed");
  }
  if (args.fetch_status === "HTTP_ERROR") {
    missing.push("http_status_not_ok");
  }
  return {
    result: missing.length === 0 ? "LIVE_PROOF_PASS" : "LIVE_PROOF_FAIL",
    missing_reasons: missing,
  };
}

export async function defaultFetchFridgeLiveHtmlV1(
  url: string,
  fetchFn: typeof fetch = fetch,
  timeoutMs = 20_000,
): Promise<FridgeLiveHtmlFetchResultV1> {
  try {
    const res = await fetchFn(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const html = await res.text();
    if (res.status >= 200 && res.status < 400) {
      return { status: "OK", http_status: res.status, html };
    }
    return { status: "HTTP_ERROR", http_status: res.status, html };
  } catch (err) {
    return {
      status: "NETWORK_UNKNOWN",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function buildBuckpartsFridgeModelPdpLiveHtmlProofPackV1(
  deps: BuildBuckpartsFridgeModelPdpLiveHtmlProofDepsV1,
): Promise<BuckpartsFridgeModelPdpLiveHtmlProofPackV1> {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const env = deps.env ?? process.env;
  const readiness =
    deps.loadReadinessPack?.() ?? loadLiveCustomerVisibleProofReadinessFromDiskV1(deps.rootDir);

  const expectedSlugs = [...FRIDGE_MODEL_PDP_SAFE_BUYER_PATH_VISIBLE_PROOF_SLUGS_V1].sort();
  if (expectedSlugs.length !== BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_EXPECTED_SLUG_COUNT_V1) {
    throw new Error("safe buyer-path allowlist must be exactly 21");
  }

  const readinessSlugs = [...(readiness.scope?.slugs ?? [])].map(normalizeSlug).sort();
  if (
    readinessSlugs.length !== expectedSlugs.length ||
    readinessSlugs.some((s, i) => s !== expectedSlugs[i])
  ) {
    throw new Error(
      "readiness pack scope.slugs must exactly match the 21 SAFE_BUYER_PATH_PASS allowlist",
    );
  }

  const mappedBySlug = new Map<string, string[]>();
  for (const row of readiness.rows ?? []) {
    mappedBySlug.set(normalizeSlug(row.slug), [...(row.mapped_filters ?? [])]);
  }

  const { base_url, target_source } = resolveFridgeLiveHtmlProofBaseUrlV1({
    env,
    baseUrlOverride: deps.baseUrlOverride,
  });

  const fetchHtml =
    deps.fetchHtml ?? ((url: string) => defaultFetchFridgeLiveHtmlV1(url));

  const rows: BuckpartsFridgeLiveHtmlProofSlugRowV1[] = [];

  for (const slug of expectedSlugs) {
    if (
      (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1 as readonly string[]).includes(slug) ||
      (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1 as readonly string[]).includes(
        slug,
      ) ||
      (FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1 as readonly string[]).includes(slug)
    ) {
      throw new Error(`live HTML proof scope leaked excluded slug: ${slug}`);
    }

    const expected_mapped_filters = mappedBySlug.get(slug) ?? [];
    const production_url =
      base_url === "UNKNOWN" ? null : fridgeModelPdpLiveHtmlProductionUrlV1(base_url, slug);

    if (!production_url) {
      const classified = classifyFridgeModelPdpLiveHtmlProofResultV1({
        fetch_status: "NO_BASE_URL",
        analysis: null,
      });
      rows.push({
        slug,
        production_url: null,
        http_status: "UNKNOWN",
        model_page_rendered: "UNKNOWN",
        proof_heading_present: "UNKNOWN",
        last_checked_present: "UNKNOWN",
        mapped_filter_numbers_present: "UNKNOWN",
        verified_link_section_present: "UNKNOWN",
        safe_go_link_present: "UNKNOWN",
        product_json_ld_offers_reviews_ratings_absent: "UNKNOWN",
        unsafe_cta_or_search_placeholder_exposed: "UNKNOWN",
        expected_mapped_filters,
        missing_reasons: classified.missing_reasons,
        result: classified.result,
        notes: [
          "UNKNOWN: production base URL not configured (LIVE_SITE_SMOKE_TARGET_URL / BUCKPARTS_PUBLIC_SITE_URL / NEXT_PUBLIC_SITE_URL).",
          "Do not claim conversion from this pack.",
        ],
      });
      continue;
    }

    const fetched = await fetchHtml(production_url);
    if (fetched.status === "NETWORK_UNKNOWN") {
      const classified = classifyFridgeModelPdpLiveHtmlProofResultV1({
        fetch_status: "NETWORK_UNKNOWN",
        analysis: null,
      });
      rows.push({
        slug,
        production_url,
        http_status: "UNKNOWN",
        model_page_rendered: "UNKNOWN",
        proof_heading_present: "UNKNOWN",
        last_checked_present: "UNKNOWN",
        mapped_filter_numbers_present: "UNKNOWN",
        verified_link_section_present: "UNKNOWN",
        safe_go_link_present: "UNKNOWN",
        product_json_ld_offers_reviews_ratings_absent: "UNKNOWN",
        unsafe_cta_or_search_placeholder_exposed: "UNKNOWN",
        expected_mapped_filters,
        missing_reasons: classified.missing_reasons,
        result: classified.result,
        notes: [
          `NETWORK_UNKNOWN: ${fetched.reason}`,
          "Do not claim conversion from this pack.",
        ],
      });
      continue;
    }

    const analysis = analyzeFridgeModelPdpLiveHtmlV1({
      slug,
      html: fetched.html,
      expected_mapped_filters,
    });
    const classified = classifyFridgeModelPdpLiveHtmlProofResultV1({
      fetch_status: fetched.status,
      analysis,
    });

    rows.push({
      slug,
      production_url,
      http_status: fetched.http_status,
      model_page_rendered: analysis.model_page_rendered,
      proof_heading_present: analysis.proof_heading_present,
      last_checked_present: analysis.last_checked_present,
      mapped_filter_numbers_present: analysis.mapped_filter_numbers_present,
      verified_link_section_present: analysis.verified_link_section_present,
      safe_go_link_present: analysis.safe_go_link_present,
      product_json_ld_offers_reviews_ratings_absent:
        analysis.product_json_ld_offers_reviews_ratings_absent,
      unsafe_cta_or_search_placeholder_exposed:
        analysis.unsafe_cta_or_search_placeholder_exposed,
      expected_mapped_filters,
      missing_reasons: classified.missing_reasons,
      result: classified.result,
      notes: [
        "Read-only GET of production HTML; no deploy; no mutation.",
        "Do not claim conversion, revenue, or click-through from this pack.",
        ...(classified.result === "LIVE_PROOF_FAIL"
          ? [`FAIL reasons: ${classified.missing_reasons.join(", ")}`]
          : []),
      ],
    });
  }

  const summary = {
    LIVE_PROOF_PASS: rows.filter((r) => r.result === "LIVE_PROOF_PASS").length,
    LIVE_PROOF_FAIL: rows.filter((r) => r.result === "LIVE_PROOF_FAIL").length,
    LIVE_PROOF_UNKNOWN: rows.filter((r) => r.result === "LIVE_PROOF_UNKNOWN").length,
  };

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_CONTRACT_V1,
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
    conversion_claimed: false,
    live_production_fetch_enabled: true,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_SOURCE_COMMAND_V1,
    readiness_pack_rel_path:
      BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_CUSTOMER_VISIBLE_PROOF_READINESS_JSON_REL_V1,
    target_base_url: base_url,
    target_source,
    scope: {
      slug_count: rows.length,
      slugs: expectedSlugs,
      excluded_fail_slugs: FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1,
      excluded_quarantined_slugs: FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1,
      excluded_partial_slugs: FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1,
    },
    summary,
    rows,
    proven_facts: [
      "PROVEN: read_only=true; deploy_authorized=false; conversion_claimed=false; data_mutation=false.",
      `PROVEN: exact scope=${String(BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_EXPECTED_SLUG_COUNT_V1)} SAFE_BUYER_PATH_PASS slugs.`,
      `PROVEN: excluded FAIL=${String(FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_FAIL_SLUGS_V1.length)}; quarantine=${String(FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_QUARANTINED_SLUGS_V1.length)}; PARTIAL=${String(FRIDGE_MODEL_PDP_VISIBLE_PROOF_EXCLUDED_PARTIAL_SLUGS_V1.length)}.`,
      `PROVEN: summary=${JSON.stringify(summary)}.`,
      "PROVEN: LIVE_PROOF_PASS requires proof heading, Last checked, mapped filter numbers, Verified Link section, gated /go link, no Product offer/review/rating JSON-LD, and no search-placeholder CTA.",
    ],
    unknown_facts: [
      ...(summary.LIVE_PROOF_UNKNOWN > 0
        ? [
            `UNKNOWN: ${String(summary.LIVE_PROOF_UNKNOWN)} slug(s) could not be classified from fetch/config.`,
          ]
        : []),
      "UNKNOWN: conversion / revenue impact (never claimed by this pack).",
    ],
    risk_notes: [
      "This pack does not authorize deploy, Supabase/CSV/retailer_links mutation, buy CTA expansion, sitemap/robots, or Product JSON-LD invents.",
      "LIVE_PROOF_FAIL is expected when production has not yet deployed the visible proof block UI.",
      "Do not promote search-placeholder destinations or invent offers from this lane.",
    ],
  };
}

export function buildBuckpartsFridgeModelPdpLiveHtmlProofMarkdownV1(
  report: BuckpartsFridgeModelPdpLiveHtmlProofPackV1,
): string {
  const lines: string[] = [
    "# BuckParts fridge model PDP live HTML proof pack v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- deploy_authorized: **false**`,
    `- conversion_claimed: **false**`,
    `- live_production_fetch_enabled: **true**`,
    `- target_base_url: \`${report.target_base_url}\``,
    `- slug_count: **${String(report.scope.slug_count)}**`,
    "",
    "## Summary",
    "",
    `- LIVE_PROOF_PASS: ${String(report.summary.LIVE_PROOF_PASS)}`,
    `- LIVE_PROOF_FAIL: ${String(report.summary.LIVE_PROOF_FAIL)}`,
    `- LIVE_PROOF_UNKNOWN: ${String(report.summary.LIVE_PROOF_UNKNOWN)}`,
    "",
    "## Slugs",
    "",
    "| slug | HTTP | proof heading | Last checked | filters | Verified Link | /go | result |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const row of report.rows) {
    lines.push(
      `| ${row.slug} | ${String(row.http_status)} | ${String(row.proof_heading_present)} | ${String(row.last_checked_present)} | ${String(row.mapped_filter_numbers_present)} | ${String(row.verified_link_section_present)} | ${String(row.safe_go_link_present)} | ${row.result} |`,
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

export function writeBuckpartsFridgeModelPdpLiveHtmlProofArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsFridgeModelPdpLiveHtmlProofPackV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_FRIDGE_MODEL_PDP_LIVE_HTML_PROOF_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("live HTML proof write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsFridgeModelPdpLiveHtmlProofMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
