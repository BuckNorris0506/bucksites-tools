/**
 * Read-only Waterdrop catalog intelligence report builder (v1).
 * No retailer_links mutation; exact/alias token mapping only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  compactPartTokenKey,
  inferTokenCandidatesFromWaterdropText,
} from "@/lib/retailers/waterdrop-linksynergy-parse-v1";
import {
  loadBuckpartsFridgeFilterIndexFromRepo,
  matchInferredTokensToBuckpartsSlug,
  type BuckpartsFridgeFilterIndexV1,
  type TokenMatchConfidenceV1,
} from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "@/lib/retailers/waterdrop-exact-proof-slice-v1";
import { parseLinkSynergyAffiliateUrl } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";
import {
  entryToParsedWaterdropAnchor,
  loadWaterdropOperatorInputFromFile,
  normalizeWaterdropOperatorEntries,
  WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
  type WaterdropRakutenOperatorEntryV1,
  type WaterdropRakutenOperatorInputV1,
} from "@/lib/retailers/waterdrop-operator-input-v1";
import {
  buildWaterdropProofSliceCandidate,
  classifyWaterdropPdpSpecificity,
} from "@/lib/retailers/waterdrop-proof-slice-candidate-v1";

export const WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME = "waterdrop_catalog_intelligence_v1";

export const RPWFE_FEED_SEARCH_TOKENS = ["RPWFE", "RPWF", "WD-F19C", "F19C"] as const;

const CONFLICT_PRIMARY_TOKENS = ["XWFE", "MWF", "MWFP"] as const;

export type WaterdropCatalogSourceStatusV1 = "PROVEN" | "SAMPLE" | "MISSING" | "ERROR";

export type WaterdropCatalogIntelligenceReportV1 = {
  report_name: typeof WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  source_path: string | null;
  source_status: WaterdropCatalogSourceStatusV1;
  source_contract: string | null;
  product_count: number;
  mapped_count: number;
  unmapped_count: number;
  unique_mapped_slug_count: number;
  exact_match_count: number;
  alias_match_count: number;
  rpwfe_status: {
    searched_tokens: readonly string[];
    present_in_feed: boolean;
    mapped_slug: string | null;
    status: "PROVEN_PRESENT" | "PROVEN_ABSENT" | "UNKNOWN";
    reason: string;
  };
  proof_slice_status: {
    known_slice_slugs: readonly string[];
    mapped_slice_slugs: string[];
    missing_slice_slugs: string[];
  };
  by_slug: Record<
    string,
    {
      buckparts_slug: string;
      official_oem_token: string;
      match_types: string[];
      entry_ids: string[];
      waterdrop_skus: string[];
    }
  >;
  review_queue: WaterdropCatalogReviewRowV1[];
  blocked_examples: WaterdropCatalogBlockedExampleV1[];
  notes: string[];
};

export type WaterdropCatalogReviewRowV1 = {
  rank: number;
  buckparts_slug: string;
  official_oem_token: string;
  waterdrop_title: string | null;
  waterdrop_sku_or_id: string | null;
  affiliate_url: string;
  image_url: string | null;
  match_type: "exact" | "alias" | "inferred";
  matched_tokens: string[];
  recommended_route_label: "Compatible replacement";
  current_buckparts_cta_state: string;
  next_required_proof: string;
  is_official_oem: false;
};

export type WaterdropCatalogBlockedExampleV1 = {
  entry_id: string;
  visible_title: string | null;
  reason: string;
  inferred_token_candidates: string[];
  attempted_slug: string | null;
};

type OperatorEntryMetaV1 = {
  source?: string;
  linkid?: string;
  sku?: string;
  category_primary?: string;
  createdon?: string;
};

type ResolvedInputV1 = {
  source_path: string | null;
  source_status: WaterdropCatalogSourceStatusV1;
  source_contract: string | null;
  input: WaterdropRakutenOperatorInputV1 | null;
  notes: string[];
};

export function resolveWaterdropCatalogInputPath(
  rootDir: string,
  cliInput: string | null,
): { absolutePath: string | null; relativePath: string | null; isSample: boolean } {
  if (cliInput) {
    const absolutePath = path.isAbsolute(cliInput) ? cliInput : path.join(rootDir, cliInput);
    const relativePath = path.relative(rootDir, absolutePath);
    const isSample = relativePath.includes("waterdrop-rakuten-links.v1.sample.json");
    return { absolutePath, relativePath, isSample };
  }

  const candidates: { rel: string; isSample: boolean }[] = [
    {
      rel: "data/waterdrop/operator-input/local/waterdrop-rakuten-productsearch.v1.json",
      isSample: false,
    },
    {
      rel: "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json",
      isSample: false,
    },
    {
      rel: "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.sample.json",
      isSample: true,
    },
  ];

  for (const c of candidates) {
    const absolutePath = path.join(rootDir, c.rel);
    if (existsSync(absolutePath)) {
      return { absolutePath, relativePath: c.rel, isSample: c.isSample };
    }
  }

  return { absolutePath: null, relativePath: null, isSample: false };
}

export function loadWaterdropCatalogInput(resolved: {
  absolutePath: string | null;
  relativePath: string | null;
  isSample: boolean;
}): ResolvedInputV1 {
  const notes: string[] = [];

  if (!resolved.absolutePath) {
    return {
      source_path: null,
      source_status: "MISSING",
      source_contract: null,
      input: null,
      notes: [
        "No Waterdrop operator input found. Expected one of: local/waterdrop-rakuten-productsearch.v1.json, waterdrop-rakuten-links.v1.json, or sample.",
      ],
    };
  }

  try {
    const input = loadWaterdropOperatorInputFromFile(resolved.absolutePath);
    const source_status: WaterdropCatalogSourceStatusV1 = resolved.isSample ? "SAMPLE" : "PROVEN";
    if (resolved.isSample) {
      notes.push("Only sample operator input is present; full Rakuten ProductSearch export is not on disk.");
    }
    return {
      source_path: resolved.relativePath,
      source_status,
      source_contract: input.contract,
      input,
      notes,
    };
  } catch (err) {
    return {
      source_path: resolved.relativePath,
      source_status: "ERROR",
      source_contract: WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
      input: null,
      notes: [`Failed to parse operator input: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/** Exact OEM/alias token scan for catalog mapping (includes short tokens like XWFE, MWF). */
export function inferCatalogTokenCandidates(
  index: BuckpartsFridgeFilterIndexV1,
  args: {
    destination_pdp_url?: string | null;
    visible_title?: string | null;
    extra_text?: string | null;
  },
): string[] {
  const base = inferTokenCandidatesFromWaterdropText(args);
  const blob = [args.destination_pdp_url, args.visible_title, args.extra_text]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ")
    .toUpperCase();
  const seen = new Set(base.map((t) => compactPartTokenKey(t)));
  const out = [...base];

  for (const row of index.filters) {
    const tokens = [row.oem_part_number, ...row.aliases];
    for (const raw of tokens) {
      const token = raw.trim().toUpperCase();
      if (token.length < 3) continue;
      if (!blob.includes(token)) continue;
      const key = compactPartTokenKey(token);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(token);
    }
  }

  return out;
}

export function inferPackCountFromTitle(title: string | null): number | null {
  if (!title?.trim()) return null;
  const t = title.trim();
  const patterns = [
    /\b(\d+)\s*[-\s]?\s*pack\b/i,
    /\b(\d+)\s*pack\b/i,
    /\bpack\s*of\s*(\d+)\b/i,
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 12) return n;
    }
  }
  return null;
}

export function inferWaterdropSkuFromText(title: string | null, url: string | null): string | null {
  const blob = [title, url].filter(Boolean).join(" ");
  const wd = /\b(WD-[A-Z0-9]{2,}(?:-[A-Z0-9]+)*)\b/i.exec(blob);
  if (wd?.[1]) return wd[1].toUpperCase();
  const wdp = /\b(WDP-[A-Z0-9]{2,}(?:-[A-Z0-9]+)*)\b/i.exec(blob);
  if (wdp?.[1]) return wdp[1].toUpperCase();
  const bare = /\b([A-Z]{1,3}\d{2,}[A-Z0-9-]{0,6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = bare.exec(blob)) !== null) {
    const token = m[1]!.toUpperCase();
    if (/^F\d{2}[A-Z]/.test(token) || /^F19C/.test(token)) return token.startsWith("WD-") ? token : `WD-${token}`;
  }
  return null;
}

function entryMetadata(entry: WaterdropRakutenOperatorEntryV1): OperatorEntryMetaV1 | null {
  const raw = entry as WaterdropRakutenOperatorEntryV1 & { metadata?: OperatorEntryMetaV1 };
  return raw.metadata ?? null;
}

function matchTypeLabel(confidence: TokenMatchConfidenceV1): "exact" | "alias" | "inferred" | null {
  if (confidence === "EXACT_OEM_PART_NUMBER") return "exact";
  if (confidence === "ALIAS_TOKEN") return "alias";
  if (confidence === "URL_OR_TITLE_INFERRED") return "inferred";
  return null;
}

function feedBlobForEntry(entry: WaterdropRakutenOperatorEntryV1): string {
  const meta = entryMetadata(entry);
  return [
    entry.visible_title,
    entry.affiliate_url,
    entry.image_url,
    meta?.sku,
    meta?.linkid,
    meta?.category_primary,
  ]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join(" ");
}

export function feedContainsRpwfeRelatedTokens(entries: WaterdropRakutenOperatorEntryV1[]): boolean {
  for (const entry of entries) {
    const blob = feedBlobForEntry(entry).toUpperCase();
    for (const token of RPWFE_FEED_SEARCH_TOKENS) {
      const compact = token.replace(/-/g, "");
      if (token.includes("-")) {
        if (blob.includes(token) || blob.includes(compact)) return true;
      } else if (new RegExp(`\\b${token}\\b`, "i").test(blob)) {
        return true;
      }
    }
  }
  return false;
}

function primaryConflictTokenIndex(title: string, token: string): number {
  const upper = title.toUpperCase();
  const idx = upper.indexOf(token);
  return idx >= 0 ? idx : Number.POSITIVE_INFINITY;
}

/** Block RPWFE slug when a conflicting GE family token appears before RPWFE/RPWF in title. */
export function shouldBlockRpwfeCrossFamilyMatch(
  visibleTitle: string | null,
  matchedSlug: string | null,
  matchedToken: string | null,
): boolean {
  if (matchedSlug !== "rpwfe" || !visibleTitle?.trim()) return false;
  const title = visibleTitle.trim();
  const rpwfeIdx = Math.min(
    primaryConflictTokenIndex(title, "RPWFE"),
    primaryConflictTokenIndex(title, "RPWF"),
  );
  for (const conflict of CONFLICT_PRIMARY_TOKENS) {
    const conflictIdx = primaryConflictTokenIndex(title, conflict);
    if (conflictIdx < rpwfeIdx) return true;
  }
  const driving = matchedToken?.toUpperCase() ?? "";
  if (CONFLICT_PRIMARY_TOKENS.includes(driving as (typeof CONFLICT_PRIMARY_TOKENS)[number])) {
    return true;
  }
  return false;
}

function loadRetailerLinksCtaBySlug(rootDir: string): Map<string, string> {
  const csvPath = path.join(rootDir, "data/retailer_links.csv");
  if (!existsSync(csvPath)) return new Map();
  const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();

  const bySlug = new Map<
    string,
    { has_waterdrop: boolean; has_direct_buyable: boolean; has_search_only: boolean; row_count: number }
  >();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const slug = cols[0]?.trim().toLowerCase();
    if (!slug) continue;
    const retailerKey = cols[5]?.trim().toLowerCase() ?? "";
    const classification = cols[6]?.trim().toLowerCase() ?? "";
    const url = cols[2]?.trim().toLowerCase() ?? "";
    const snap = bySlug.get(slug) ?? {
      has_waterdrop: false,
      has_direct_buyable: false,
      has_search_only: false,
      row_count: 0,
    };
    snap.row_count += 1;
    if (retailerKey === "waterdrop") snap.has_waterdrop = true;
    if (classification === "direct_buyable") snap.has_direct_buyable = true;
    if (url.includes("search") || classification === "search_placeholder") snap.has_search_only = true;
    bySlug.set(slug, snap);
  }

  const out = new Map<string, string>();
  for (const [slug, snap] of bySlug) {
    if (snap.has_waterdrop && snap.has_direct_buyable) out.set(slug, "LIVE_WATERDROP_DIRECT_BUYABLE");
    else if (snap.has_waterdrop) out.set(slug, "WATERDROP_ROW_PRESENT");
    else if (snap.has_direct_buyable) out.set(slug, "LIVE_NON_WATERDROP_BUYABLE");
    else if (snap.has_search_only) out.set(slug, "BLOCKED_SEARCH_OR_DISCOVERY");
    else if (snap.row_count > 0) out.set(slug, "RETAILER_LINKS_PRESENT_NO_BUY");
    else out.set(slug, "UNKNOWN");
  }
  return out;
}

function nextRequiredProof(args: {
  slug: string;
  pdpSpecificity: string;
  inProofSlice: boolean;
  hasAffiliate: boolean;
}): string {
  if (args.inProofSlice) return "committed_proof_slice_evidence_on_disk";
  if (!args.hasAffiliate) return "linksynergy_affiliate_url";
  if (args.pdpSpecificity === "VARIANT_PDP" || args.pdpSpecificity === "PRODUCT_PDP") {
    return "owner_browser_proof_pdp";
  }
  return "owner_browser_proof_pdp";
}

export function buildWaterdropCatalogIntelligenceReport(args: {
  rootDir: string;
  resolved: ResolvedInputV1;
  reviewQueueLimit?: number | null;
}): WaterdropCatalogIntelligenceReportV1 {
  const generated_at = new Date().toISOString();
  const notes = [...args.resolved.notes];
  const known_slice_slugs = [...WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1];
  const ctaBySlug = loadRetailerLinksCtaBySlug(args.rootDir);

  if (!args.resolved.input || args.resolved.source_status === "MISSING") {
    return {
      report_name: WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME,
      generated_at,
      read_only: true,
      data_mutation: false,
      source_path: args.resolved.source_path,
      source_status: args.resolved.source_status,
      source_contract: args.resolved.source_contract,
      product_count: 0,
      mapped_count: 0,
      unmapped_count: 0,
      unique_mapped_slug_count: 0,
      exact_match_count: 0,
      alias_match_count: 0,
      rpwfe_status: {
        searched_tokens: [...RPWFE_FEED_SEARCH_TOKENS],
        present_in_feed: false,
        mapped_slug: null,
        status: "UNKNOWN",
        reason: "No operator input loaded.",
      },
      proof_slice_status: {
        known_slice_slugs,
        mapped_slice_slugs: [],
        missing_slice_slugs: [...known_slice_slugs],
      },
      by_slug: {},
      review_queue: [],
      blocked_examples: [],
      notes,
    };
  }

  if (args.resolved.source_status === "ERROR") {
    return {
      report_name: WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME,
      generated_at,
      read_only: true,
      data_mutation: false,
      source_path: args.resolved.source_path,
      source_status: "ERROR",
      source_contract: args.resolved.source_contract,
      product_count: 0,
      mapped_count: 0,
      unmapped_count: 0,
      unique_mapped_slug_count: 0,
      exact_match_count: 0,
      alias_match_count: 0,
      rpwfe_status: {
        searched_tokens: [...RPWFE_FEED_SEARCH_TOKENS],
        present_in_feed: false,
        mapped_slug: null,
        status: "UNKNOWN",
        reason: "Operator input parse error.",
      },
      proof_slice_status: {
        known_slice_slugs,
        mapped_slice_slugs: [],
        missing_slice_slugs: [...known_slice_slugs],
      },
      by_slug: {},
      review_queue: [],
      blocked_examples: [],
      notes,
    };
  }

  const index = loadBuckpartsFridgeFilterIndexFromRepo(args.rootDir);
  const entries = args.resolved.input.entries;
  const product_count = entries.length;
  const presentInFeed = feedContainsRpwfeRelatedTokens(entries);

  const normalized = normalizeWaterdropOperatorEntries(args.resolved.input);
  const normalizedById = new Map(normalized.map((n) => [n.entry_id, n]));

  let mapped_count = 0;
  let unmapped_count = 0;
  let exact_match_count = 0;
  let alias_match_count = 0;
  const blocked_examples: WaterdropCatalogBlockedExampleV1[] = [];
  const reviewCandidates: Array<{
    entry_id: string;
    slug: string;
    oem: string;
    match_type: "exact" | "alias" | "inferred";
    matched_tokens: string[];
    affiliate_url: string;
    image_url: string | null;
    visible_title: string | null;
    waterdrop_sku_or_id: string | null;
    ranking_score: number;
    excluded: boolean;
  }> = [];

  for (const entry of entries) {
    const id = entry.id?.trim();
    if (!id) continue;
    const norm = normalizedById.get(id);
    const parsed =
      norm?.parsed ??
      entryToParsedWaterdropAnchor(entry) ??
      ({
        affiliate_url: entry.affiliate_url ?? "",
        destination_pdp_url: null,
        visible_title: entry.visible_title ?? null,
        image_url: entry.image_url ?? null,
        image_alt: null,
        inferred_token_candidates: inferCatalogTokenCandidates(index, {
          destination_pdp_url: null,
          visible_title: entry.visible_title ?? null,
        }),
        parse_notes: [],
      } as const);

    const linkParsed = entry.affiliate_url
      ? parseLinkSynergyAffiliateUrl(entry.affiliate_url)
      : null;
    const meta = entryMetadata(entry);
    const inferred_token_candidates = inferCatalogTokenCandidates(index, {
      destination_pdp_url: linkParsed?.destination_pdp_url ?? parsed.destination_pdp_url,
      visible_title: entry.visible_title ?? parsed.visible_title,
      extra_text: meta?.sku ?? null,
    });

    const waterdrop_sku_or_id =
      inferWaterdropSkuFromText(entry.visible_title ?? null, linkParsed?.destination_pdp_url ?? null) ??
      meta?.sku ??
      meta?.linkid ??
      id;

    const match = matchInferredTokensToBuckpartsSlug(index, inferred_token_candidates);
    const matchLabel = matchTypeLabel(match.match_confidence);

    if (!match.matched_slug || !matchLabel) {
      unmapped_count += 1;
      continue;
    }

    if (shouldBlockRpwfeCrossFamilyMatch(entry.visible_title ?? null, match.matched_slug, match.matched_token)) {
      blocked_examples.push({
        entry_id: id,
        visible_title: entry.visible_title ?? null,
        reason: "cross_family_token_primary_not_rpwfe",
        inferred_token_candidates,
        attempted_slug: match.matched_slug,
      });
      unmapped_count += 1;
      continue;
    }

    mapped_count += 1;
    if (matchLabel === "exact") exact_match_count += 1;
    if (matchLabel === "alias") alias_match_count += 1;

    const candidate = buildWaterdropProofSliceCandidate({
      entry_id: id,
      parsed,
      index,
      production_snapshot: "UNKNOWN",
    });

    reviewCandidates.push({
      entry_id: id,
      slug: match.matched_slug,
      oem: match.matched_oem_part_number ?? index.by_slug.get(match.matched_slug)?.oem_part_number ?? "",
      match_type: matchLabel,
      matched_tokens: inferred_token_candidates,
      affiliate_url: parsed.affiliate_url,
      image_url: parsed.image_url,
      visible_title: parsed.visible_title,
      waterdrop_sku_or_id,
      ranking_score: candidate.ranking_score,
      excluded: candidate.excluded_from_recommendation,
    });
  }

  const slugSet = new Set(reviewCandidates.map((r) => r.slug));
  const unique_mapped_slug_count = slugSet.size;

  const mapped_slice_slugs = known_slice_slugs.filter((s) => slugSet.has(s));
  const missing_slice_slugs = known_slice_slugs.filter((s) => !slugSet.has(s));

  const rpwfeMapped = reviewCandidates.some((r) => r.slug === "rpwfe");
  const rpwfe_status = {
    searched_tokens: [...RPWFE_FEED_SEARCH_TOKENS],
    present_in_feed: presentInFeed,
    mapped_slug: rpwfeMapped ? ("rpwfe" as const) : null,
    status: presentInFeed
      ? rpwfeMapped
        ? ("PROVEN_PRESENT" as const)
        : ("UNKNOWN" as const)
      : ("PROVEN_ABSENT" as const),
    reason: presentInFeed
      ? rpwfeMapped
        ? "RPWFE-related tokens appear in feed and map to live slug rpwfe."
        : "RPWFE-related tokens appear in feed but did not map to slug rpwfe (check blocked_examples)."
      : "No RPWFE, RPWF, WD-F19C, or F19C tokens in operator feed text fields.",
  };

  const by_slug: WaterdropCatalogIntelligenceReportV1["by_slug"] = {};
  for (const row of reviewCandidates) {
    const existing = by_slug[row.slug];
    if (!existing) {
      by_slug[row.slug] = {
        buckparts_slug: row.slug,
        official_oem_token: row.oem,
        match_types: [row.match_type],
        entry_ids: [row.entry_id],
        waterdrop_skus: row.waterdrop_sku_or_id ? [row.waterdrop_sku_or_id] : [],
      };
    } else {
      if (!existing.match_types.includes(row.match_type)) existing.match_types.push(row.match_type);
      existing.entry_ids.push(row.entry_id);
      if (row.waterdrop_sku_or_id && !existing.waterdrop_skus.includes(row.waterdrop_sku_or_id)) {
        existing.waterdrop_skus.push(row.waterdrop_sku_or_id);
      }
    }
  }

  const eligible = reviewCandidates
    .filter((r) => !r.excluded)
    .sort((a, b) => b.ranking_score - a.ranking_score);

  const limit = args.reviewQueueLimit ?? null;
  const queueSource =
    limit != null && limit > 0 ? eligible.slice(0, limit) : eligible;

  const review_queue: WaterdropCatalogReviewRowV1[] = queueSource.map((r, i) => {
    const pdp = classifyWaterdropPdpSpecificity(
      parseLinkSynergyAffiliateUrl(r.affiliate_url)?.destination_pdp_url ?? null,
    );
    const inSlice = (known_slice_slugs as readonly string[]).includes(r.slug);
    return {
      rank: i + 1,
      buckparts_slug: r.slug,
      official_oem_token: r.oem,
      waterdrop_title: r.visible_title,
      waterdrop_sku_or_id: r.waterdrop_sku_or_id,
      affiliate_url: r.affiliate_url,
      image_url: r.image_url,
      match_type: r.match_type,
      matched_tokens: r.matched_tokens,
      recommended_route_label: "Compatible replacement",
      current_buckparts_cta_state: ctaBySlug.get(r.slug) ?? "UNKNOWN",
      next_required_proof: nextRequiredProof({
        slug: r.slug,
        pdpSpecificity: pdp,
        inProofSlice: inSlice,
        hasAffiliate: r.affiliate_url.includes("linksynergy.com"),
      }),
      is_official_oem: false,
    };
  });

  notes.push("Read-only report; no retailer_links or Supabase mutation.");
  notes.push("Waterdrop is a compatible replacement supplier, not official/OEM.");
  if (args.resolved.source_status === "SAMPLE") {
    notes.push("Sample input only — run against local ProductSearch JSON for full queue.");
  }
  if (rpwfe_status.status === "PROVEN_ABSENT") {
    notes.push(
      "RPWFE/WD-F19C absent from Rakuten feed; use retailer PDP discovery lane (docs/WATERDROP-CATALOG-INTELLIGENCE-V1.md).",
    );
  }

  return {
    report_name: WATERDROP_CATALOG_INTELLIGENCE_REPORT_NAME,
    generated_at,
    read_only: true,
    data_mutation: false,
    source_path: args.resolved.source_path,
    source_status: args.resolved.source_status,
    source_contract: args.resolved.source_contract,
    product_count,
    mapped_count,
    unmapped_count,
    unique_mapped_slug_count,
    exact_match_count,
    alias_match_count,
    rpwfe_status,
    proof_slice_status: {
      known_slice_slugs,
      mapped_slice_slugs,
      missing_slice_slugs,
    },
    by_slug,
    review_queue,
    blocked_examples: blocked_examples.slice(0, 20),
    notes,
  };
}
