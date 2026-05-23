/**
 * Read-only Air Purifier Batch Production Lane v1 — classifies live AP filter candidates[i] candidates into action buckets for agent batches without mutating CSVs.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  filterOfficialReferenceRetailerLinks,
  hasOfficialReferenceBrowserTruthProof,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
  OFFICIAL_REFERENCE_RETAILER_KEYS,
} from "@/lib/retailers/launch-buy-links";
import type { GscArtifactTopEntry } from "@/lib/owner-dashboard/gsc-api-artifact";

import {
  loadGscArtifactForNextLaneV1,
  wedgeFromPageUrl,
  wedgeFromQueryText,
  type GscArtifactLoadResultV1,
} from "./demand-to-coverage-next-lane-v1";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";

export const AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1 =
  "air_purifier_batch_production_lane_v1" as const;

export type ApBatchProductionLaneSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export const AP_BATCH_PRODUCTION_LANE_STATES_V1 = [
  "existing_direct_buyable",
  "existing_official_reference",
  "direct_buy_candidate",
  "reference_candidate",
  "search_placeholder_rescue_needed",
  "catalog_identity_gap",
  "alias_or_redirect_gap",
  "wrong_family_reject",
  "owner_review",
  "no_safe_path_yet",
] as const;

export type ApBatchProductionLaneStateV1 =
  (typeof AP_BATCH_PRODUCTION_LANE_STATES_V1)[number];

export type ApBatchCandidateV1 = {
  rank: number;
  filter_slug: string;
  brand_slug: string;
  oem_part_number: string;
  state: ApBatchProductionLaneStateV1;
  priority_score: number;
  gsc_impressions: number;
  gsc_queries: string[];
  compat_model_count: number;
  primary_retailer_key: string | null;
  primary_url: string | null;
  gate_failure: string | null;
  browser_truth_classification: string | null;
  pattern: string;
  rationale: string;
  proof_required: string;
  allowed_future_mutations: string[];
  reject_rules: string[];
};

export type ApCatalogIdentityGapV1 = {
  gap_id: string;
  gap_type: "gsc_slug_drift" | "compat_mismatch" | "missing_filter_row";
  demand_signal: string;
  catalog_slug: string | null;
  issue: string;
  safe_action: string;
  related_filter_slugs: string[];
};

export type ApAgentWorkPacketV1 = {
  packet_id: string;
  pattern: string;
  candidate_slugs: string[];
  max_rows: number;
  task_type: string;
  exact_proof_required: string;
  allowed_mutations: string[];
  reject_rules: string[];
  owner_review_required: boolean;
};

export type AirPurifierBatchProductionLaneReportV1 = {
  report_name: typeof AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: ApBatchProductionLaneSourceStatusV1;
  candidate_count: number;
  state_counts: Record<ApBatchProductionLaneStateV1, number>;
  top_candidates: ApBatchCandidateV1[];
  agent_work_packets: ApAgentWorkPacketV1[];
  catalog_identity_gaps: ApCatalogIdentityGapV1[];
  reference_link_candidates: ApBatchCandidateV1[];
  direct_buy_candidates: ApBatchCandidateV1[];
  blocked_or_rejected: ApBatchCandidateV1[];
  notes: string[];
};

type FilterRow = {
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
  replacement_interval_months?: string;
  notes?: string;
};

type RetailerLinkRow = {
  filter_slug: string;
  retailer_name?: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
  browser_truth_notes?: string;
  browser_truth_checked_at?: string;
  browser_truth_buyable_subtype?: string;
};

type CompatRow = {
  air_purifier_model_slug?: string;
  model_slug?: string;
  filter_slug: string;
};

export type BuildAirPurifierBatchProductionLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
  loadGscArtifact?: () => Promise<GscArtifactLoadResultV1>;
};

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function readCsv<T extends Record<string, string>>(
  rootDir: string,
  relPath: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): T[] {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return [];
  return parse(readTextFile(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function primaryLinkForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow | null {
  const rows = links.filter((l) => l.filter_slug === slug);
  if (rows.length === 0) return null;
  return rows.find((l) => isTruthyPrimary(l.is_primary)) ?? rows[0] ?? null;
}

function allLinksForSlug(links: RetailerLinkRow[], slug: string): RetailerLinkRow[] {
  return links.filter((l) => l.filter_slug === slug);
}

function isHoneywellStoreProductUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (
      stripWww(u.hostname).includes("honeywellstore.com") &&
      u.pathname.toLowerCase().includes("/store/products/")
    );
  } catch {
    return false;
  }
}

function stripWww(host: string): string {
  let h = host.toLowerCase();
  while (h.startsWith("www.")) h = h.slice(4);
  return h;
}

function isPdpLikeUrl(url: string): boolean {
  return isOfficialReferencePdpUrl(url) || isHoneywellStoreProductUrl(url);
}

/** Slugs with pilot-proven wrong-family Amazon or OEM mismatch — read-only fixtures. */
const WRONG_FAMILY_FILTER_SLUGS_V1 = new Set<string>(["levoit-rf-rar029"]);

/** Filter slugs where catalog identity is wrong before buyer-path rescue. */
const CATALOG_IDENTITY_FILTER_SLUGS_V1 = new Set<string>(["blueair-particle-411"]);

const KNOWN_CATALOG_IDENTITY_GAPS_V1: Omit<
  ApCatalogIdentityGapV1,
  "related_filter_slugs"
>[] = [
  {
    gap_id: "blueair-f4max-411-gsc-slug",
    gap_type: "gsc_slug_drift",
    demand_signal: "/air-purifier/filter/blueair-f4max-411 (GSC; ~10 impressions)",
    catalog_slug: null,
    issue:
      "GSC URL conflates F4MAX (411i Max / 411a Max filter) with 411-series naming; slug never existed in filters.csv; unsafe to alias to blueair-particle-411",
    safe_action:
      "Catalog task: add F4MAX filter row + compat fix for blueair-411a-max; then 301 redirect — not buyer-path alias",
  },
  {
    gap_id: "blueair-411a-max-compat-f4max",
    gap_type: "compat_mismatch",
    demand_signal: "blueair-411a-max model → blueair-particle-411 compat row",
    catalog_slug: "blueair-particle-411",
    issue:
      "OEM F4MAX filter serves 411a Max / 411i Max; PART411 filter serves 411/411+/411 Auto — distinct sellable filters",
    safe_action:
      "Owner-approved compat/catalog change before any blueair-particle-411 direct_buyable claim for Max owners",
  },
  {
    gap_id: "blueair-f4max-missing-filter-row",
    gap_type: "missing_filter_row",
    demand_signal: "F4MAX / 110036 official PDP exists on blueair.com",
    catalog_slug: null,
    issue: "No live filter slug for Blue Pure 411i Max / 411a Max F4MAX cartridge",
    safe_action:
      "Add filter row (e.g. blueair-f4max-411max) in approved catalog task — not retailer_links-only mutation",
  },
];

function inferSourcePattern(args: {
  brandSlug: string;
  retailerKey: string | null;
  url: string | null;
  state: ApBatchProductionLaneStateV1;
}): string {
  const { brandSlug, retailerKey, url, state } = args;
  if (state === "existing_direct_buyable" && brandSlug === "honeywell") {
    return "honeywell_store_direct_buy";
  }
  if (retailerKey === "shark-official") return "shark_official_reference";
  if (brandSlug === "blueair") return "blueair_catalog_identity";
  if (brandSlug === "levoit") return "levoit_oem_discovery";
  if (retailerKey === "amazon") return "amazon_secondary_verification";
  if (url && isManufacturerSiteSearchUrl(url)) return "oem_search_placeholder_discovery";
  if (retailerKey === "oem-catalog" && url && isHoneywellStoreProductUrl(url)) {
    return "honeywell_store_direct_buy";
  }
  return "oem_search_placeholder_discovery";
}

function buildGscDemandMaps(args: {
  gscResult: GscArtifactLoadResultV1 | null;
}): {
  pageImpressionsByFilterSlug: Map<string, number>;
  queryImpressionsByToken: Map<string, number>;
  aliasOrRedirectGaps: string[];
  sourceStatus: ApBatchProductionLaneSourceStatusV1;
} {
  const pageImpressionsByFilterSlug = new Map<string, number>();
  const queryImpressionsByToken = new Map<string, number>();
  const aliasOrRedirectGaps: string[] = [];

  if (!args.gscResult?.ok) {
    return { pageImpressionsByFilterSlug, queryImpressionsByToken, aliasOrRedirectGaps, sourceStatus: "PARTIAL" };
  }

  const pages = args.gscResult.artifact.top_pages_by_impressions ?? [];
  const queries = args.gscResult.artifact.top_queries_by_impressions ?? [];

  for (const entry of pages as GscArtifactTopEntry[]) {
    const page = entry.page ?? entry.url ?? "";
    if (wedgeFromPageUrl(page) !== HOMEKEEP_WEDGE_CATALOG.air_purifier) continue;
    const impressions = typeof entry.impressions === "number" ? entry.impressions : 0;
    const match = page.match(/\/air-purifier\/filter\/([^/?#]+)/i);
    if (match?.[1]) {
      const slug = match[1].toLowerCase();
      pageImpressionsByFilterSlug.set(slug, (pageImpressionsByFilterSlug.get(slug) ?? 0) + impressions);
    }
  }

  for (const entry of queries as GscArtifactTopEntry[]) {
    const query = (entry.query ?? "").trim();
    if (!query) continue;
    if (wedgeFromQueryText(query) !== HOMEKEEP_WEDGE_CATALOG.air_purifier) continue;
    const impressions = typeof entry.impressions === "number" ? entry.impressions : 0;
    queryImpressionsByToken.set(query.toLowerCase(), impressions);
  }

  // GSC pages that do not match any live catalog slug
  for (const [slug, imp] of pageImpressionsByFilterSlug) {
    if (slug === "blueair-f4max-411" && imp > 0) {
      aliasOrRedirectGaps.push(slug);
    }
  }

  return { pageImpressionsByFilterSlug, queryImpressionsByToken, aliasOrRedirectGaps, sourceStatus: "PROVEN" };
}

function gscQueriesForFilter(
  filter: FilterRow,
  queryImpressionsByToken: Map<string, number>,
): { queries: string[]; impressions: number } {
  const tokens = [
    filter.slug.toLowerCase(),
    filter.oem_part_number.toLowerCase(),
    filter.brand_slug.toLowerCase(),
  ];
  const compactOem = filter.oem_part_number.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (compactOem.length >= 4) tokens.push(compactOem);

  const matched: string[] = [];
  let impressions = 0;
  for (const [query, imp] of queryImpressionsByToken) {
    const hit = tokens.some(
      (t) => t.length >= 4 && (query.includes(t) || query.replace(/\s+/g, "").includes(t)),
    );
    if (hit) {
      matched.push(query);
      impressions += imp;
    }
  }
  return { queries: matched.slice(0, 5), impressions };
}

export function classifyApFilterCandidateV1(args: {
  filter: FilterRow;
  primaryLink: RetailerLinkRow | null;
  allLinks: RetailerLinkRow[];
  compatModelCount: number;
  gscPageImpressions: number;
  gscQueryImpressions: number;
  liveFilterSlugs: Set<string>;
  aliasOrRedirectGscSlugs: string[];
}): { state: ApBatchProductionLaneStateV1; rationale: string; proofRequired: string; rejectRules: string[]; allowedMutations: string[] } {
  const { filter, primaryLink, allLinks, aliasOrRedirectGscSlugs } = args;
  const slug = filter.slug;
  const rejectRules = [
    "Do not weaken buy gates or /go rules",
    "Do not add filter rows without approved catalog task",
    "Do not alias GSC slugs without product-token proof",
    "Do not mark direct_buyable without Add to Cart + exact token proof",
  ];
  const allowedMutations = [
    "data/air-purifier/retailer_links.csv primary row only after browser proof",
  ];

  if (!primaryLink) {
    return {
      state: "no_safe_path_yet",
      rationale: "No retailer link row in CSV",
      proofRequired: "Add retailer row in approved task",
      rejectRules: [...rejectRules, "Do not invent URLs without discovery"],
      allowedMutations: ["Approved retailer_links row add only"],
    };
  }

  const linkSignals = {
    retailer_key: primaryLink.retailer_key ?? null,
    affiliate_url: primaryLink.affiliate_url ?? "",
    browser_truth_classification: primaryLink.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: primaryLink.browser_truth_buyable_subtype ?? null,
  };

  if (isDirectBuyableSafeCtaRow(linkSignals)) {
    return {
      state: "existing_direct_buyable",
      rationale: "Primary row is direct_buyable with null buy gate",
      proofRequired: "None — maintain on deploy sync",
      rejectRules,
      allowedMutations: ["None unless re-verification needed"],
    };
  }

  if (filterOfficialReferenceRetailerLinks([primaryLink]).length > 0) {
    return {
      state: "existing_official_reference",
      rationale: "Primary row passes official reference filter (likely_valid + shark-official + proof fields)",
      proofRequired: "None — maintain reference notes/checked_at",
      rejectRules: [...rejectRules, "Do not mark direct_buyable without Add to Cart"],
      allowedMutations: ["browser_truth notes refresh only"],
    };
  }

  if (WRONG_FAMILY_FILTER_SLUGS_V1.has(slug)) {
    return {
      state: "wrong_family_reject",
      rationale:
        "Pilot proof: Amazon secondary / OEM mismatch — RAR029 token not on listing; Pet Care variant wrong family",
      proofRequired: "Exact OEM token on PDP before any Amazon-primary promotion",
      rejectRules: [...rejectRules, "Do not promote Amazon row without exact token on PDP"],
      allowedMutations: ["OEM PDP discovery on levoit.com first"],
    };
  }

  const gate = buyLinkGateFailureKind(linkSignals);
  const url = primaryLink.affiliate_url?.trim() ?? "";
  const retailerKey = primaryLink.retailer_key?.trim().toLowerCase() ?? "";
  const classification = primaryLink.browser_truth_classification?.trim() ?? "";

  // GSC slug drift pointing at non-catalog slug related to this filter
  if (
    CATALOG_IDENTITY_FILTER_SLUGS_V1.has(slug) ||
    aliasOrRedirectGscSlugs.some((g) => g.includes("f4max") && slug.includes("411"))
  ) {
    return {
      state: "catalog_identity_gap",
      rationale:
        "F4MAX vs PART411 identity split; GSC blueair-f4max-411 404; blueair-411a-max compat may map wrong filter — catalog task before buyer-path",
      proofRequired: "Resolve F4MAX catalog row + compat; do not alias GSC slug to this row",
      rejectRules: [
        ...rejectRules,
        "Do not alias blueair-f4max-411 to blueair-particle-411",
        "Do not direct_buyable until identity + token proof",
      ],
      allowedMutations: ["Catalog/compat in approved task only; then retailer_links on matching slug"],
    };
  }

  if (retailerKey === "shark-official" && isOfficialReferencePdpUrl(url)) {
    const hasProof = hasOfficialReferenceBrowserTruthProof(
      primaryLink.browser_truth_notes,
      primaryLink.browser_truth_checked_at,
    );
    if (classification === "likely_valid" && !hasProof) {
      return {
        state: "reference_candidate",
        rationale: "Shark official PDP URL present; likely_valid missing dated notes proof",
        proofRequired: "Playwright: exact token on PDP; Out of Stock vs Add to Cart; likely_valid notes",
        rejectRules: [...rejectRules, "Do not use /go for likely_valid"],
        allowedMutations: ["browser_truth likely_valid + notes + checked_at on existing row"],
      };
    }
    if (!classification) {
      return {
        state: "reference_candidate",
        rationale: "Shark official PDP in CSV without browser_truth_classification",
        proofRequired: "Same as shark_official_reference packet",
        rejectRules: [...rejectRules, "Do not mark direct_buyable without Add to Cart"],
        allowedMutations: ["likely_valid reference activation if non-buyable"],
      };
    }
  }

  if (
    gate !== "search_placeholder" &&
    isPdpLikeUrl(url) &&
    classification !== "likely_valid"
  ) {
    return {
      state: "direct_buy_candidate",
      rationale: `Product-page-shaped URL (${gate ?? "pending truth"}) — needs browser truth for direct_buyable`,
      proofRequired: "Playwright: exact OEM token in primary product area + Add to Cart",
      rejectRules,
      allowedMutations: ["browser_truth direct_buyable on existing primary row"],
    };
  }

  if (retailerKey === "shark-official" && classification === "likely_valid") {
    return {
      state: "reference_candidate",
      rationale: "Shark likely_valid but not yet passing official reference filter (allowlist/proof/PDP shape)",
      proofRequired: "Complete reference proof fields; confirm non-buyable if no Add to Cart",
      rejectRules: [...rejectRules, "Do not use /go"],
      allowedMutations: ["likely_valid + notes + checked_at"],
    };
  }

  const hasAmazonSecondary = allLinks.some(
    (l) => (l.retailer_key ?? "").toLowerCase() === "amazon" && l.affiliate_url.includes("/dp/"),
  );

  if (gate === "search_placeholder" && filter.oem_part_number.trim().length > 0) {
    if (hasAmazonSecondary) {
      return {
        state: "owner_review",
        rationale:
          "Primary OEM search placeholder with Amazon secondary — Amazon-primary vs OEM discovery policy decision",
        proofRequired: "Browser: Amazon exact token + buyability OR OEM PDP discovery",
        rejectRules: [...rejectRules, "Do not flip primary to Amazon without token proof"],
        allowedMutations: ["Primary promotion only after owner policy + browser proof"],
      };
    }
    return {
      state: "search_placeholder_rescue_needed",
      rationale: "Only manufacturer search URL; exact OEM token in CSV; needs PDP discovery",
      proofRequired: "Discover official PDP; exact token on page; Add to Cart for direct_buyable",
      rejectRules,
      allowedMutations: ["Replace search URL on existing primary row after proof"],
    };
  }

  if (hasAmazonSecondary && !isPdpLikeUrl(url)) {
    return {
      state: "owner_review",
      rationale: "Blocked primary with Amazon secondary — verify ASIN/token before batch promotion",
      proofRequired: "Amazon PDP exact token + purchase UI",
      rejectRules: [...rejectRules, "Wrong-family reject if token mismatch"],
      allowedMutations: ["Amazon row truth or OEM PDP on primary after review"],
    };
  }

  return {
    state: "no_safe_path_yet",
    rationale: `Gate=${gate ?? "unknown"}; no proven rescue pattern`,
    proofRequired: "Manual discovery + owner review",
    rejectRules,
    allowedMutations: ["None until pattern assigned"],
  };
}

function scoreCandidate(args: {
  state: ApBatchProductionLaneStateV1;
  gscPageImpressions: number;
  gscQueryImpressions: number;
  compatModelCount: number;
  gate: string | null;
  pdpLike: boolean;
  pattern: string;
}): number {
  let score = 0;
  score += args.gscPageImpressions * 10;
  score += args.gscQueryImpressions * 5;
  score += Math.min(args.compatModelCount, 30) * 2;
  if (args.gate) score += 4;
  if (args.pdpLike) score += 8;

  const patternBonus: Record<string, number> = {
    shark_official_reference: 40,
    honeywell_store_direct_buy: 35,
    blueair_catalog_identity: 30,
    levoit_oem_discovery: 20,
    amazon_secondary_verification: 15,
    oem_search_placeholder_discovery: 5,
  };
  score += patternBonus[args.pattern] ?? 0;

  const stateBonus: Record<ApBatchProductionLaneStateV1, number> = {
    existing_direct_buyable: -100,
    existing_official_reference: -100,
    direct_buy_candidate: 25,
    reference_candidate: 22,
    search_placeholder_rescue_needed: 12,
    catalog_identity_gap: 28,
    alias_or_redirect_gap: 26,
    wrong_family_reject: -20,
    owner_review: 8,
    no_safe_path_yet: 0,
  };
  score += stateBonus[args.state] ?? 0;
  return Math.round(score * 10) / 10;
}

function buildAgentWorkPackets(candidates: ApBatchCandidateV1[]): ApAgentWorkPacketV1[] {
  const byPattern = new Map<string, ApBatchCandidateV1[]>();
  for (const c of candidates) {
    if (c.state === "existing_direct_buyable" || c.state === "existing_official_reference") continue;
    const list = byPattern.get(c.pattern) ?? [];
    list.push(c);
    byPattern.set(c.pattern, list);
  }

  const sortByRank = (a: ApBatchCandidateV1, b: ApBatchCandidateV1) => a.rank - b.rank;

  const packets: ApAgentWorkPacketV1[] = [];

  const defs: Array<{
    pattern: string;
    packet_id: string;
    task_type: string;
    exact_proof: string;
    allowed: string[];
    reject: string[];
    owner: boolean;
    max: number;
  }> = [
    {
      pattern: "honeywell_store_direct_buy",
      packet_id: "ap-honeywell-store-direct-buy-v1",
      task_type: "direct_buy_rescue",
      exact_proof: "Honeywell Store PDP: exact HRF-R token + Add to Cart; wrong-family check",
      allowed: ["browser_truth direct_buyable on existing oem-catalog primary"],
      reject: ["No new rows", "No gate weakening"],
      owner: false,
      max: 3,
    },
    {
      pattern: "shark_official_reference",
      packet_id: "ap-shark-official-reference-v1",
      task_type: "official_reference_activation",
      exact_proof:
        "Official SharkNinja PDP; exact HE* token; stock state; likely_valid if no Add to Cart",
      allowed: ["likely_valid + notes + checked_at on shark-official primary; no /go"],
      reject: ["No direct_buyable without Add to Cart", "No blueair-style alias"],
      owner: false,
      max: 5,
    },
    {
      pattern: "blueair_catalog_identity",
      packet_id: "ap-blueair-catalog-identity-v1",
      task_type: "catalog_identity_review",
      exact_proof: "Prove F4MAX vs PART411; fix compat before any particle-411 buyer-path",
      allowed: ["Catalog/compat in approved task only"],
      reject: ["No alias blueair-f4max-411 → particle-411", "No retailer_links-only F4MAX fix"],
      owner: true,
      max: 3,
    },
    {
      pattern: "levoit_oem_discovery",
      packet_id: "ap-levoit-oem-discovery-v1",
      task_type: "oem_pdp_discovery",
      exact_proof: "levoit.com product PDP with exact RAR* / RF-* token; wrong-family check",
      allowed: ["Replace search URL on primary after proof"],
      reject: ["No Amazon-primary without exact token"],
      owner: false,
      max: 8,
    },
    {
      pattern: "amazon_secondary_verification",
      packet_id: "ap-amazon-secondary-v1",
      task_type: "amazon_secondary_verification",
      exact_proof: "Amazon /dp/ page: exact OEM token visible + purchase UI",
      allowed: ["Primary promotion or Amazon browser_truth after owner policy"],
      reject: ["No primary flip without token proof"],
      owner: true,
      max: 10,
    },
    {
      pattern: "oem_search_placeholder_discovery",
      packet_id: "ap-oem-search-placeholder-v1",
      task_type: "search_placeholder_rescue",
      exact_proof: "Official manufacturer PDP; exact token; Add to Cart for direct_buyable",
      allowed: ["Update existing primary URL + browser_truth"],
      reject: ["No new retailer rows without approval"],
      owner: false,
      max: 20,
    },
  ];

  for (const def of defs) {
    const group = (byPattern.get(def.pattern) ?? []).sort(sortByRank);
    if (group.length === 0 && def.pattern !== "blueair_catalog_identity") continue;
    const slugs =
      def.pattern === "blueair_catalog_identity"
        ? [
            ...new Set([
              ...group.map((c) => c.filter_slug),
              "blueair-particle-411",
              "blueair-f2-211",
            ]),
          ]
        : group.map((c) => c.filter_slug);
    packets.push({
      packet_id: def.packet_id,
      pattern: def.pattern,
      candidate_slugs: slugs.slice(0, def.max),
      max_rows: def.max,
      task_type: def.task_type,
      exact_proof_required: def.exact_proof,
      allowed_mutations: def.allowed,
      reject_rules: def.reject,
      owner_review_required: def.owner,
    });
  }

  return packets;
}

export async function buildAirPurifierBatchProductionLaneV1Report(
  deps: BuildAirPurifierBatchProductionLaneDepsV1,
): Promise<AirPurifierBatchProductionLaneReportV1> {
  const rootDir = deps.rootDir;
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readTextFile = deps.readTextFile ?? defaultReadText;
  const now = deps.now ?? (() => new Date());

  const filters = readCsv<FilterRow>(rootDir, "data/air-purifier/filters.csv", readTextFile, fileExists);
  const links = readCsv<RetailerLinkRow>(
    rootDir,
    "data/air-purifier/retailer_links.csv",
    readTextFile,
    fileExists,
  );
  const compat = readCsv<CompatRow>(
    rootDir,
    "data/air-purifier/compatibility_mappings.csv",
    readTextFile,
    fileExists,
  );

  const liveFilterSlugs = new Set(filters.map((f) => f.slug.toLowerCase()));
  const compatCountByFilter = new Map<string, number>();
  for (const row of compat) {
    const fs = row.filter_slug;
    if (!fs) continue;
    compatCountByFilter.set(fs, (compatCountByFilter.get(fs) ?? 0) + 1);
  }

  const gscResult = deps.loadGscArtifact
    ? await deps.loadGscArtifact()
    : await loadGscArtifactForNextLaneV1({ rootDir, readTextFile, fileExists });

  const gscMaps = buildGscDemandMaps({ gscResult: gscResult.ok ? gscResult : null });

  const stateCounts = Object.fromEntries(
    AP_BATCH_PRODUCTION_LANE_STATES_V1.map((s) => [s, 0]),
  ) as Record<ApBatchProductionLaneStateV1, number>;

  const candidates: ApBatchCandidateV1[] = [];

  for (const filter of filters) {
    const slug = filter.slug;
    const primary = primaryLinkForSlug(links, slug);
    const all = allLinksForSlug(links, slug);
    const gscPage =
      gscMaps.pageImpressionsByFilterSlug.get(slug.toLowerCase()) ??
      (slug === "blueair-particle-411"
        ? (gscMaps.pageImpressionsByFilterSlug.get("blueair-f4max-411") ?? 0)
        : 0);
    const { queries, impressions: gscQueryImp } = gscQueriesForFilter(
      filter,
      gscMaps.queryImpressionsByToken,
    );

    const classified = classifyApFilterCandidateV1({
      filter,
      primaryLink: primary,
      allLinks: all,
      compatModelCount: compatCountByFilter.get(slug) ?? 0,
      gscPageImpressions: gscPage,
      gscQueryImpressions: gscQueryImp,
      liveFilterSlugs,
      aliasOrRedirectGscSlugs: gscMaps.aliasOrRedirectGaps,
    });

    let state = classified.state;
    // Non-catalog GSC slugs that 404 — tracked as alias gap on related demand only
    if (
      gscMaps.aliasOrRedirectGaps.includes("blueair-f4max-411") &&
      slug === "blueair-particle-411" &&
      state === "catalog_identity_gap"
    ) {
      // keep catalog_identity_gap
    }

    const gate = primary
      ? buyLinkGateFailureKind({
          retailer_key: primary.retailer_key ?? null,
          affiliate_url: primary.affiliate_url ?? "",
          browser_truth_classification: primary.browser_truth_classification ?? null,
          browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype ?? null,
        })
      : null;

    const pattern = inferSourcePattern({
      brandSlug: filter.brand_slug,
      retailerKey: primary?.retailer_key ?? null,
      url: primary?.affiliate_url ?? null,
      state,
    });

    const priorityScore = scoreCandidate({
      state,
      gscPageImpressions: gscPage,
      gscQueryImpressions: gscQueryImp,
      compatModelCount: compatCountByFilter.get(slug) ?? 0,
      gate,
      pdpLike: primary ? isPdpLikeUrl(primary.affiliate_url) : false,
      pattern,
    });

    stateCounts[state] += 1;

    candidates.push({
      rank: 0,
      filter_slug: slug,
      brand_slug: filter.brand_slug,
      oem_part_number: filter.oem_part_number,
      state,
      priority_score: priorityScore,
      gsc_impressions: gscPage,
      gsc_queries: queries,
      compat_model_count: compatCountByFilter.get(slug) ?? 0,
      primary_retailer_key: primary?.retailer_key ?? null,
      primary_url: primary?.affiliate_url ?? null,
      gate_failure: gate,
      browser_truth_classification: primary?.browser_truth_classification ?? null,
      pattern,
      rationale: classified.rationale,
      proof_required: classified.proofRequired,
      allowed_future_mutations: classified.allowedMutations,
      reject_rules: classified.rejectRules,
    });
  }

  candidates.sort((a, b) => b.priority_score - a.priority_score || a.filter_slug.localeCompare(b.filter_slug));
  candidates.forEach((c, i) => {
    c.rank = i + 1;
  });

  const catalogIdentityGaps: ApCatalogIdentityGapV1[] = KNOWN_CATALOG_IDENTITY_GAPS_V1.map((g) => ({
    ...g,
    related_filter_slugs:
      g.gap_id.includes("f4max") || g.gap_id.includes("411a")
        ? ["blueair-particle-411"]
        : [],
  }));

  const aliasGap: ApCatalogIdentityGapV1 = {
    gap_id: "gsc-alias-blueair-f4max-411",
    gap_type: "gsc_slug_drift",
    demand_signal: "GSC /air-purifier/filter/blueair-f4max-411",
    catalog_slug: null,
    issue: "Demand URL does not resolve — no filter slug, no alias, no redirect",
    safe_action: "NEEDS_ROUTE_REDIRECT after catalog owns correct target slug",
    related_filter_slugs: [],
  };
  if (gscMaps.aliasOrRedirectGaps.length > 0 || gscMaps.pageImpressionsByFilterSlug.has("blueair-f4max-411")) {
    catalogIdentityGaps.push(aliasGap);
    stateCounts.alias_or_redirect_gap += 0; // gap is not a filter row
  }

  const referenceLinkCandidates = candidates.filter(
    (c) => c.state === "reference_candidate" || c.state === "existing_official_reference",
  );
  const directBuyCandidates = candidates.filter(
    (c) => c.state === "direct_buy_candidate" || c.state === "existing_direct_buyable",
  );
  const blockedOrRejected = candidates.filter((c) =>
    [
      "wrong_family_reject",
      "catalog_identity_gap",
      "no_safe_path_yet",
      "owner_review",
    ].includes(c.state),
  );

  const agentWorkPackets = buildAgentWorkPackets(candidates);

  let sourceStatus: ApBatchProductionLaneSourceStatusV1 = "PARTIAL";
  if (filters.length > 0 && links.length > 0 && gscMaps.sourceStatus === "PROVEN") {
    sourceStatus = "PROVEN";
  } else if (filters.length > 0 && links.length > 0) {
    sourceStatus = "PARTIAL";
  } else {
    sourceStatus = "UNKNOWN";
  }

  const notes: string[] = [
    "Read-only factory: classifies data/air-purifier/filters.csv slugs using retailer_links.csv gates.",
    "GSC demand merged when artifact available (Supabase or data/reports/buckparts-gsc-search-analytics.json).",
    "catalog_identity_gaps includes non-row GSC drift (blueair-f4max-411) — not counted in candidate_count state.",
    `Official reference allowlist: ${Array.from(OFFICIAL_REFERENCE_RETAILER_KEYS).join(", ")}.`,
    "Fridge batch and data/retailer_links.csv untouched by design.",
  ];

  return {
    report_name: AIR_PURIFIER_BATCH_PRODUCTION_LANE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status: sourceStatus,
    candidate_count: candidates.length,
    state_counts: stateCounts,
    top_candidates: candidates.slice(0, 20),
    agent_work_packets: agentWorkPackets,
    catalog_identity_gaps: catalogIdentityGaps,
    reference_link_candidates: referenceLinkCandidates,
    direct_buy_candidates: directBuyCandidates,
    blocked_or_rejected: blockedOrRejected,
    notes,
  };
}
