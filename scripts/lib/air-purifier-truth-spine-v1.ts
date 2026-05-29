/**
 * Read-only Air Purifier truth spine v1 — committed CSV inventory, safe CTA gates, and public copy bounds.
 * Does not authorize CSV/Supabase mutation or claim all AP filters are verified.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  getVerticalLaunchState,
  isVerticalLive,
} from "@/lib/catalog/vertical-launch-state";
import {
  filterRealBuyRetailerLinks,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";

import {
  buildPublicWedgeReadinessAndEasiestWinsV1,
  PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1,
} from "./public-wedge-readiness-and-easiest-wins-v1";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

export const AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1 = "air_purifier_truth_spine_v1" as const;

export const AP_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1 =
  "Continue AP batch production under truth gates; expand safe buyer paths via model-first and batch lanes — do not claim all filters verified or fridge-level Supabase/CSV parity without separate proof." as const;

export const AP_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1 = [
  "Affiliate links remain second to truth.",
  "Safe CTAs require direct_buyable browser_truth and launch-buy-links gates.",
  "Committed CSV safe CTA rows are not the same as live Supabase buyer paths on public pages.",
  "Formal AP truth spine does not imply fridge-parity or all-filters-verified claims.",
] as const;

const AP_CSV_PATHS = {
  models: "data/air-purifier/models.csv",
  filters: "data/air-purifier/filters.csv",
  compatibility: "data/air-purifier/compatibility_mappings.csv",
  retailer_links: "data/air-purifier/retailer_links.csv",
} as const;

const AP_BUY_GATE_SOURCES = [
  "src/lib/data/air-purifier/filters.ts",
  "src/lib/data/air-purifier/models.ts",
] as const;

const AP_PUBLIC_COPY_SOURCES = [
  "src/app/air-purifier/page.tsx",
] as const;

const OVERCLAIM_PHRASES = [
  /\ball filters are verified\b/i,
  /\bevery filter is verified\b/i,
  /\ball filters verified\b/i,
  /\bguaranteed savings\b/i,
  /\bwe verify every\b/i,
  /\ball parts are safe to buy\b/i,
];

const QUALIFYING_COPY_PHRASES = [
  /\bnot on every filter\b/i,
  /\bonly where listing checks pass\b/i,
  /\bcompare the part number\b/i,
];

export type ApPublicIndexingStatusV1 =
  | "INDEXABLE_LIVE"
  | "PREVIEW_NOINDEX"
  | "NOINDEX_UNPROVEN"
  | "UNKNOWN";

export type ApBuyGateBoundaryStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type ApPublicOverclaimRiskV1 = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type ApFormalSpineStatusV1 = "PROVEN" | "UNKNOWN";

export type AirPurifierTruthSpineV1 = {
  contract: typeof AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_paths: string[];
  public_launch_state: ReturnType<typeof getVerticalLaunchState>;
  public_indexing_status: ApPublicIndexingStatusV1;
  catalog_counts: {
    model_count: number;
    filter_count: number;
    compatibility_mapping_count: number;
    retailer_link_row_count: number;
    mapped_filter_slug_count: number;
  };
  safe_cta_count: number;
  safe_filter_slug_count: number;
  safe_filter_slugs: string[];
  unsafe_or_unknown_filter_slugs: string[] | "UNKNOWN";
  filters_with_zero_safe_buy_path_count: number;
  buy_gate_boundary_status: ApBuyGateBoundaryStatusV1;
  buy_gate_boundary_sources: string[];
  truth_coverage_status: "FORMAL_SPINE";
  public_overclaim_risk: ApPublicOverclaimRiskV1;
  public_copy_notes: string[];
  formal_spine_status: ApFormalSpineStatusV1;
  ap_public_but_spine_gap_resolved: boolean;
  all_filters_verified_claim: false;
  recommended_next_action: string;
  truth_first_notes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  destination_url?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

function readCsv(rootDir: string, rel: string): Record<string, string>[] {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return [];
  try {
    return parse(readFileSync(abs, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

function gateRow(row: RetailerLinkRow) {
  return {
    retailer_key: row.retailer_key ?? null,
    affiliate_url: (row.affiliate_url ?? row.destination_url ?? "").trim(),
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  };
}

function analyzeCommittedCsvTruth(rootDir: string): {
  safe_cta_count: number;
  safe_filter_slugs: string[];
  unsafe_or_unknown_filter_slugs: string[];
  mapped_filter_slug_count: number;
  catalog_counts: AirPurifierTruthSpineV1["catalog_counts"];
} {
  const models = readCsv(rootDir, AP_CSV_PATHS.models);
  const filters = readCsv(rootDir, AP_CSV_PATHS.filters);
  const compat = readCsv(rootDir, AP_CSV_PATHS.compatibility);
  const links = readCsv(rootDir, AP_CSV_PATHS.retailer_links) as RetailerLinkRow[];

  const mappedFilterSlugs = new Set<string>();
  for (const row of compat) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (slug) mappedFilterSlugs.add(slug);
  }

  const safeFilterSlugs = new Set<string>();
  let safeCtaCount = 0;

  for (const row of links) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const gated = gateRow(row);
    if (isDirectBuyableSafeCtaRow(gated)) {
      safeCtaCount += 1;
      safeFilterSlugs.add(slug);
    }
  }

  const unsafeOrUnknown: string[] = [];
  for (const slug of Array.from(mappedFilterSlugs).sort()) {
    if (!safeFilterSlugs.has(slug)) unsafeOrUnknown.push(slug);
  }

  return {
    safe_cta_count: safeCtaCount,
    safe_filter_slugs: Array.from(safeFilterSlugs).sort(),
    unsafe_or_unknown_filter_slugs: unsafeOrUnknown,
    mapped_filter_slug_count: mappedFilterSlugs.size,
    catalog_counts: {
      model_count: models.length,
      filter_count: filters.length,
      compatibility_mapping_count: compat.length,
      retailer_link_row_count: links.length,
      mapped_filter_slug_count: mappedFilterSlugs.size,
    },
  };
}

function verifyApBuyGateBoundary(rootDir: string): {
  status: ApBuyGateBoundaryStatusV1;
  sources: string[];
  notes: string[];
} {
  const sources: string[] = [];
  const failures: string[] = [];

  for (const rel of AP_BUY_GATE_SOURCES) {
    const abs = path.join(rootDir, rel);
    if (!existsSync(abs)) {
      failures.push(`${rel}: missing`);
      continue;
    }
    const src = readFileSync(abs, "utf8");
    if (!src.includes("filterRealBuyRetailerLinks")) {
      failures.push(`${rel}: missing filterRealBuyRetailerLinks reference`);
      continue;
    }
    if (!/\bfilterRealBuyRetailerLinks\s*\(/.test(src)) {
      failures.push(`${rel}: missing filterRealBuyRetailerLinks(`);
      continue;
    }
    if (!src.includes("@/lib/retailers/launch-buy-links")) {
      failures.push(`${rel}: missing launch-buy-links import`);
      continue;
    }
    sources.push(rel);
  }

  if (sources.length === AP_BUY_GATE_SOURCES.length) {
    return {
      status: "PROVEN",
      sources: [...sources],
      notes: [
        "PROVEN: src/lib/data/air-purifier/filters.ts and models.ts call filterRealBuyRetailerLinks before exposing retailer_links to pages.",
      ],
    };
  }
  if (sources.length > 0) {
    return {
      status: "PARTIAL",
      sources,
      notes: failures,
    };
  }
  return { status: "UNKNOWN", sources: [], notes: failures };
}

function assessPublicOverclaimRisk(rootDir: string): {
  risk: ApPublicOverclaimRiskV1;
  notes: string[];
} {
  const notes: string[] = [];
  let overclaimHits = 0;
  let qualifyingHits = 0;

  for (const rel of AP_PUBLIC_COPY_SOURCES) {
    const abs = path.join(rootDir, rel);
    if (!existsSync(abs)) {
      notes.push(`UNKNOWN: missing public copy source ${rel}`);
      return { risk: "UNKNOWN", notes };
    }
    const text = readFileSync(abs, "utf8");
    for (const re of OVERCLAIM_PHRASES) {
      if (re.test(text)) {
        overclaimHits += 1;
        notes.push(`OVERCLAIM pattern ${String(re)} in ${rel}`);
      }
    }
    for (const re of QUALIFYING_COPY_PHRASES) {
      if (re.test(text)) qualifyingHits += 1;
    }
  }

  if (overclaimHits > 0) return { risk: "HIGH", notes };
  if (qualifyingHits >= 2) {
    notes.push("PROVEN: AP hub copy qualifies buying options (not on every filter; listing checks).");
    return { risk: "LOW", notes };
  }
  if (qualifyingHits >= 1) return { risk: "MEDIUM", notes };
  return { risk: "MEDIUM", notes: ["INFERRED: AP hub copy lacks explicit not-on-every-filter qualifier."] };
}

function publicIndexingStatus(): ApPublicIndexingStatusV1 {
  if (isVerticalLive("air-purifier")) return "INDEXABLE_LIVE";
  if (getVerticalLaunchState("air-purifier") === "NOINDEX_UNPROVEN") return "NOINDEX_UNPROVEN";
  return "UNKNOWN";
}

export function buildAirPurifierTruthSpineUnknownV1(args: {
  generated_at: string;
  reason: string;
}): AirPurifierTruthSpineV1 {
  return {
    contract: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.generated_at,
    source_paths: [],
    public_launch_state: getVerticalLaunchState("air-purifier"),
    public_indexing_status: "UNKNOWN",
    catalog_counts: {
      model_count: 0,
      filter_count: 0,
      compatibility_mapping_count: 0,
      retailer_link_row_count: 0,
      mapped_filter_slug_count: 0,
    },
    safe_cta_count: 0,
    safe_filter_slug_count: 0,
    safe_filter_slugs: [],
    unsafe_or_unknown_filter_slugs: "UNKNOWN",
    filters_with_zero_safe_buy_path_count: 0,
    buy_gate_boundary_status: "UNKNOWN",
    buy_gate_boundary_sources: [],
    truth_coverage_status: "FORMAL_SPINE",
    public_overclaim_risk: "UNKNOWN",
    public_copy_notes: [],
    formal_spine_status: "UNKNOWN",
    ap_public_but_spine_gap_resolved: false,
    all_filters_verified_claim: false,
    recommended_next_action: AP_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
    truth_first_notes: [...AP_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts: [],
    inferred_facts: [],
    unknown_facts: [`UNKNOWN: air_purifier_truth_spine_v1 failed: ${args.reason}`],
  };
}

export function buildAirPurifierTruthSpineV1(args: {
  rootDir: string;
  now?: () => Date;
}): AirPurifierTruthSpineV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();

  const csvTruth = analyzeCommittedCsvTruth(args.rootDir);
  const buyGate = verifyApBuyGateBoundary(args.rootDir);
  const overclaim = assessPublicOverclaimRisk(args.rootDir);

  const readiness = buildPublicWedgeReadinessAndEasiestWinsV1({
    rootDir: args.rootDir,
    now: args.now,
  });
  const apReadiness = readiness.wedge_rows.find(
    (r) => r.wedge === HOMEKEEP_WEDGE_CATALOG.air_purifier,
  );

  const unsafeOrUnknown: string[] | "UNKNOWN" =
    csvTruth.mapped_filter_slug_count > 0
      ? csvTruth.unsafe_or_unknown_filter_slugs
      : "UNKNOWN";

  const proven_facts = [
    `PROVEN: VERTICAL_LAUNCH_STATES air-purifier=${getVerticalLaunchState("air-purifier")}; public_indexing_status=${publicIndexingStatus()}.`,
    `PROVEN: Committed CSV safe_cta_count=${String(csvTruth.safe_cta_count)} across ${String(csvTruth.safe_filter_slugs.length)} filter slug(s); mapped_filter_slug_count=${String(csvTruth.mapped_filter_slug_count)}.`,
    `PROVEN: buy_gate_boundary_status=${buyGate.status}; sources=${buyGate.sources.join(", ") || "none"}.`,
    `PROVEN: all_filters_verified_claim=false; formal_spine_status=PROVEN; ap_public_but_spine_gap_resolved=true.`,
    "PROVEN: This lane does not authorize CSV apply, Supabase mutation, or public launch changes.",
  ];

  if (apReadiness) {
    proven_facts.push(
      `PROVEN: ${PUBLIC_WEDGE_READINESS_AND_EASIEST_WINS_CONTRACT_V1} reports air_purifier safe_cta_count=${String(apReadiness.safe_cta_count)} (cross-check committed CSV gate).`,
    );
  }

  const zeroSafeCount = Array.isArray(unsafeOrUnknown) ? unsafeOrUnknown.length : 0;
  const inferred_facts = [
    "INFERRED: Live AP filter/model pages load retailer_links from Supabase through filterRealBuyRetailerLinks — committed CSV counts are inventory truth, not live runtime parity proof.",
    `INFERRED: ${String(zeroSafeCount)} mapped filter slug(s) lack any committed safe direct_buyable row.`,
  ];

  const unknown_facts: string[] = [];
  if (unsafeOrUnknown === "UNKNOWN") {
    unknown_facts.push("UNKNOWN: No compatibility_mappings rows — cannot derive unsafe_or_unknown_filter_slugs.");
  }
  if (buyGate.status !== "PROVEN") {
    unknown_facts.push(
      `UNKNOWN: buy_gate_boundary incomplete — ${buyGate.notes.join("; ") || "no sources verified"}.`,
    );
  }

  return {
    contract: AIR_PURIFIER_TRUTH_SPINE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    source_paths: [...Object.values(AP_CSV_PATHS), ...AP_BUY_GATE_SOURCES],
    public_launch_state: getVerticalLaunchState("air-purifier"),
    public_indexing_status: publicIndexingStatus(),
    catalog_counts: csvTruth.catalog_counts,
    safe_cta_count: csvTruth.safe_cta_count,
    safe_filter_slug_count: csvTruth.safe_filter_slugs.length,
    safe_filter_slugs: csvTruth.safe_filter_slugs,
    unsafe_or_unknown_filter_slugs: unsafeOrUnknown,
    filters_with_zero_safe_buy_path_count: Array.isArray(unsafeOrUnknown)
      ? unsafeOrUnknown.length
      : 0,
    buy_gate_boundary_status: buyGate.status,
    buy_gate_boundary_sources: buyGate.sources,
    truth_coverage_status: "FORMAL_SPINE",
    public_overclaim_risk: overclaim.risk,
    public_copy_notes: overclaim.notes,
    formal_spine_status: "PROVEN",
    ap_public_but_spine_gap_resolved: true,
    all_filters_verified_claim: false,
    recommended_next_action: AP_TRUTH_SPINE_RECOMMENDED_NEXT_ACTION_V1,
    truth_first_notes: [...AP_TRUTH_SPINE_TRUTH_FIRST_NOTES_V1],
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}

/** Cross-check: filterRealBuyRetailerLinks on CSV rows matches safe slug set from isDirectBuyableSafeCtaRow. */
export function apCommittedCsvSafeFilterSlugsViaGatesV1(rootDir: string): string[] {
  const links = readCsv(rootDir, AP_CSV_PATHS.retailer_links) as RetailerLinkRow[];
  const byFilter = new Map<string, RetailerLinkRow[]>();
  for (const row of links) {
    const slug = (row.filter_slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    const list = byFilter.get(slug) ?? [];
    list.push(row);
    byFilter.set(slug, list);
  }
  const safe: string[] = [];
  for (const [slug, rows] of Array.from(byFilter.entries())) {
    const gated = filterRealBuyRetailerLinks(rows.map((r) => gateRow(r)));
    if (gated.length > 0) safe.push(slug);
  }
  return safe.sort();
}
