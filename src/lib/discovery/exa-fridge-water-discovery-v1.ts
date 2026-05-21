/**
 * Exa refrigerator-water discovery v1 — read-only candidate normalization.
 * Operator/MCP export in; no production runtime Exa calls; no catalog mutation authority.
 */

import { FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1 } from "@/lib/coverage/fridge-homekeep-bulk-catalog-v1";
import {
  loadBuckpartsFridgeFilterIndexFromRepo,
  type BuckpartsFridgeFilterIndexV1,
} from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import { compactPartTokenKey } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";

export const EXA_FRIDGE_WATER_DISCOVERY_CONTRACT_V1 = "exa_fridge_water_discovery_v1" as const;
export const EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1 = "exa_fridge_water_discovery_manifest_v1" as const;
export const EXA_MCP_EXPORT_INPUT_CONTRACT_V1 = "exa_mcp_export_fridge_water_v1" as const;

export const EXA_FRIDGE_WATER_EVIDENCE_TIERS_V1 = [
  "A_manufacturer_official",
  "B_manufacturer_support",
  "C_authorized_parts_lookup",
  "D_retailer_pdp",
  "E_marketplace_weak",
  "F_unknown",
] as const;

export type ExaFridgeWaterEvidenceTierV1 = (typeof EXA_FRIDGE_WATER_EVIDENCE_TIERS_V1)[number];

export const EXA_FRIDGE_WATER_SOURCE_TYPES_V1 = [
  "manufacturer_pdp",
  "manufacturer_compat_chart",
  "parts_distributor",
  "retailer_pdp",
  "marketplace",
  "editorial",
  "unknown",
] as const;

export type ExaFridgeWaterSourceTypeV1 = (typeof EXA_FRIDGE_WATER_SOURCE_TYPES_V1)[number];

export const EXA_FRIDGE_WATER_REJECTION_FLAGS_V1 = [
  "demoted_registry_match",
  "live_slug_exists",
  "alias_family_hold",
  "wrong_wedge_air_filter",
  "marketplace_only",
  "search_results_page",
  "revision_sibling_unproven",
  "snippet_only_no_fetch",
  "seo_title_only",
  "no_oem_token",
] as const;

export type ExaFridgeWaterRejectionFlagV1 = (typeof EXA_FRIDGE_WATER_REJECTION_FLAGS_V1)[number];

export type ExaFridgeWaterRecommendedFactoryStateV1 = "evidence_needed" | "blocked_do_not_publish";

export type ExaFridgeWaterRepoChecksV1 = {
  in_live_filters_csv: boolean;
  in_bulk_catalog: boolean;
  in_demoted_registry: boolean;
  alias_collision: boolean;
  live_family_slug: string | null;
};

export type ExaFridgeWaterDiscoveryCandidateV1 = {
  discovery_source: "exa_web_discovery";
  discovery_run_id: string;
  query: string;
  discovered_url: string;
  discovered_title: string;
  discovered_snippet: string;
  fetch_status: "not_fetched" | "fetched_ok" | "fetch_failed";
  fetch_excerpt: string | null;
  extracted_part_tokens: string[];
  extracted_model_tokens: string[];
  brand_guess: string;
  candidate_slug: string | null;
  candidate_oem_part_number: string | null;
  wedge_guess: "refrigerator_water" | "refrigerator_air" | "unknown";
  evidence_tier: ExaFridgeWaterEvidenceTierV1;
  source_type: ExaFridgeWaterSourceTypeV1;
  proof_claims: Array<{ claim: string; status: "PROVEN" | "INFERRED" | "UNKNOWN" }>;
  rejection_flags: ExaFridgeWaterRejectionFlagV1[];
  evidence_gaps: string[];
  repo_checks: ExaFridgeWaterRepoChecksV1;
  recommended_factory_state: ExaFridgeWaterRecommendedFactoryStateV1;
  recommended_block_reason: string | null;
  catalog_import_ready: false;
  mutation_ready: false;
  read_only: true;
  data_mutation: false;
  omit_from_factory_merge: boolean;
};

export type ExaFridgeWaterDiscoveryRunMetaV1 = {
  contract: typeof EXA_FRIDGE_WATER_DISCOVERY_CONTRACT_V1;
  discovery_run_id: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  wedge: "refrigerator_water";
  input_path: string | null;
  query_count: number;
  raw_hit_count: number;
  candidate_count: number;
  notes: string[];
};

export type ExaFridgeWaterDiscoveryCandidatesFileV1 = {
  contract: typeof EXA_FRIDGE_WATER_DISCOVERY_CONTRACT_V1;
  discovery_run_id: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  candidates: ExaFridgeWaterDiscoveryCandidateV1[];
};

export type ExaFridgeWaterDiscoveryManifestV1 = {
  contract: typeof EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  wedge: "refrigerator_water";
  latest_run_id: string;
  latest_candidates_path: string;
  demoted_slug_blocklist_source: string;
};

/** One search hit from operator MCP / Exa export JSON. */
export type ExaMcpSearchHitInputV1 = {
  query: string;
  url: string;
  title?: string;
  snippet?: string;
  fetch_excerpt?: string | null;
  fetch_status?: "not_fetched" | "fetched_ok" | "fetch_failed";
};

export type ExaMcpExportInputV1 = {
  contract?: string;
  discovery_run_id?: string;
  queries?: Array<{
    query: string;
    results?: Array<{
      url?: string;
      title?: string;
      snippet?: string;
      text?: string;
      fetch_excerpt?: string | null;
    }>;
  }>;
  results?: Array<{
    query?: string;
    url?: string;
    title?: string;
    snippet?: string;
    text?: string;
    fetch_excerpt?: string | null;
  }>;
};

const DEMOTED_SLUGS = new Set(FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1.map((r) => r.slug));
const DEMOTED_OEM_KEYS = new Set(
  FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1.map((r) => compactPartTokenKey(r.oem)),
);

const MARKETPLACE_HOST_FRAGMENTS = ["amazon.", "ebay.", "walmart.", "target.com", "homedepot.com"];
const PARTS_LOOKUP_HOST_FRAGMENTS = ["repairclinic.com", "appliancepartspros.com", "partselect.com"];
const MANUFACTURER_HOST_RULES: Array<{
  brand: string;
  hosts: string[];
  tier: ExaFridgeWaterEvidenceTierV1;
  source_type: ExaFridgeWaterSourceTypeV1;
}> = [
  {
    brand: "whirlpool",
    hosts: ["whirlpool.com", "everydrop.com"],
    tier: "A_manufacturer_official",
    source_type: "manufacturer_pdp",
  },
  {
    brand: "lg",
    hosts: ["lg.com"],
    tier: "A_manufacturer_official",
    source_type: "manufacturer_pdp",
  },
  {
    brand: "samsung",
    hosts: ["samsung.com"],
    tier: "A_manufacturer_official",
    source_type: "manufacturer_pdp",
  },
  {
    brand: "ge",
    hosts: ["geappliances.com", "geapplianceparts.com"],
    tier: "A_manufacturer_official",
    source_type: "manufacturer_pdp",
  },
  {
    brand: "frigidaire",
    hosts: ["frigidaire.com", "electrolux.com"],
    tier: "A_manufacturer_official",
    source_type: "manufacturer_pdp",
  },
];

const OEM_TOKEN_REGEX =
  /\b(?:EDR[1-6]RXD1|LT\d{3,4}[A-Z]{1,2}|ADQ\d{8,11}|DA\d{2,3}-[\dA-Z]{5,12}|DA97-[\dA-Z]{5,12}|MWF|MSWF|RPWFE|XWFE|XWF|GSWF2?|WF3CB|ULTRAWF|UKF8001|W10413645A|439\d{4}|46-9002|8171413)\b/gi;

const MODEL_TOKEN_REGEX =
  /\b(?:RF\d{2}[A-Z0-9]{6,12}|LR[A-Z]{3,4}\d{4,8}[A-Z]?|LFX[A-Z0-9]{6,12}|WR[FXS][A-Z0-9]{4,10})\b/gi;

const AIR_WEDGE_PHRASES = [
  "refrigerator air filter",
  "fresh air filter",
  "air purification filter",
  "lt120f",
];
const WATER_WEDGE_PHRASES = ["water filter", "refrigerator water", "everydrop", "smartwater"];

function slugifyPartToken(token: string): string {
  return token.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function extractTokens(text: string): { part: string[]; model: string[] } {
  const part = uniqueStrings((text.match(OEM_TOKEN_REGEX) ?? []).map((t) => t.toUpperCase()));
  const model = uniqueStrings((text.match(MODEL_TOKEN_REGEX) ?? []).map((t) => t.toUpperCase()));
  return { part, model };
}

function parseHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isSearchResultsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const blocked = ["/search", "search?", "/catalogsearch/", "/category/", "/result?"];
  return blocked.some((f) => lower.includes(f));
}

function classifyUrlTier(url: string): {
  evidence_tier: ExaFridgeWaterEvidenceTierV1;
  source_type: ExaFridgeWaterSourceTypeV1;
  brand_guess: string;
} {
  const host = parseHostname(url);
  if (!host) {
    return { evidence_tier: "F_unknown", source_type: "unknown", brand_guess: "unknown" };
  }
  if (MARKETPLACE_HOST_FRAGMENTS.some((f) => host.includes(f))) {
    return { evidence_tier: "E_marketplace_weak", source_type: "marketplace", brand_guess: "unknown" };
  }
  for (const rule of MANUFACTURER_HOST_RULES) {
    if (rule.hosts.some((h) => host.includes(h))) {
      return {
        evidence_tier: rule.tier,
        source_type: rule.source_type,
        brand_guess: rule.brand,
      };
    }
  }
  if (PARTS_LOOKUP_HOST_FRAGMENTS.some((f) => host.includes(f))) {
    return {
      evidence_tier: "C_authorized_parts_lookup",
      source_type: "parts_distributor",
      brand_guess: "unknown",
    };
  }
  if (host.includes("bestbuy.") || host.includes("lowes.") || host.includes("homedepot.")) {
    return { evidence_tier: "D_retailer_pdp", source_type: "retailer_pdp", brand_guess: "unknown" };
  }
  return { evidence_tier: "F_unknown", source_type: "unknown", brand_guess: "unknown" };
}

function inferWedgeGuess(text: string): "refrigerator_water" | "refrigerator_air" | "unknown" {
  const lower = text.toLowerCase();
  const negatesWater =
    lower.includes("not a water filter") ||
    lower.includes("not a refrigerator water") ||
    lower.includes("not a water filter cartridge");
  const air =
    AIR_WEDGE_PHRASES.some((p) => lower.includes(p)) || /\blt120f\b/.test(lower);
  const water =
    !negatesWater && WATER_WEDGE_PHRASES.some((p) => lower.includes(p));
  if (air && !water) return "refrigerator_air";
  if (water && !air) return "refrigerator_water";
  if (water && air) return "unknown";
  return "unknown";
}

function findRevisionSiblingLiveSlug(
  candidateSlug: string,
  liveSlugs: Set<string>,
): string | null {
  const parts = candidateSlug.split("-");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1]!;
  if (last.length < 2) return null;
  const prefix = parts.slice(0, -1).join("-");
  const revisionChar = last[last.length - 1];
  for (const live of Array.from(liveSlugs)) {
    if (!live.startsWith(prefix + "-")) continue;
    const liveLast = live.split("-").pop() ?? "";
    if (liveLast.length < 2) continue;
    if (liveLast.slice(0, -1) === last.slice(0, -1) && liveLast[liveLast.length - 1] !== revisionChar) {
      return live;
    }
  }
  return null;
}

export function flattenExaMcpExportInput(input: ExaMcpExportInputV1): ExaMcpSearchHitInputV1[] {
  const out: ExaMcpSearchHitInputV1[] = [];
  if (Array.isArray(input.queries)) {
    for (const q of input.queries) {
      const query = String(q.query ?? "");
      for (const r of q.results ?? []) {
        const url = String(r.url ?? "").trim();
        if (!url) continue;
        out.push({
          query,
          url,
          title: String(r.title ?? ""),
          snippet: String(r.snippet ?? r.text ?? ""),
          fetch_excerpt: r.fetch_excerpt ?? null,
          fetch_status: r.fetch_excerpt ? "fetched_ok" : "not_fetched",
        });
      }
    }
  }
  if (Array.isArray(input.results)) {
    for (const r of input.results) {
      const url = String(r.url ?? "").trim();
      if (!url) continue;
      out.push({
        query: String(r.query ?? ""),
        url,
        title: String(r.title ?? ""),
        snippet: String(r.snippet ?? r.text ?? ""),
        fetch_excerpt: r.fetch_excerpt ?? null,
        fetch_status: r.fetch_excerpt ? "fetched_ok" : "not_fetched",
      });
    }
  }
  return out;
}

export type BuildExaDiscoveryRepoContextV1 = {
  index: BuckpartsFridgeFilterIndexV1;
  liveSlugs: Set<string>;
  demotedSlugs: Set<string>;
  demotedOemKeys: Set<string>;
  aliasCollisionTokens: Set<string>;
};

export function buildExaDiscoveryRepoContext(rootDir: string): BuildExaDiscoveryRepoContextV1 {
  const index = loadBuckpartsFridgeFilterIndexFromRepo(rootDir);
  const aliasCollisionTokens = new Set<string>();
  const byToken = new Map<string, Set<string>>();
  for (const f of index.filters) {
    const oemKey = compactPartTokenKey(f.oem_part_number);
    const set = byToken.get(oemKey) ?? new Set<string>();
    set.add(f.slug);
    byToken.set(oemKey, set);
    for (const a of f.aliases) {
      const aKey = compactPartTokenKey(a);
      const aSet = byToken.get(aKey) ?? new Set<string>();
      aSet.add(f.slug);
      byToken.set(aKey, aSet);
    }
  }
  for (const [key, slugs] of Array.from(byToken.entries())) {
    if (slugs.size > 1) aliasCollisionTokens.add(key);
  }
  return {
    index,
    liveSlugs: new Set(index.filters.map((f) => f.slug)),
    demotedSlugs: DEMOTED_SLUGS,
    demotedOemKeys: DEMOTED_OEM_KEYS,
    aliasCollisionTokens,
  };
}

export function buildExaFridgeWaterDiscoveryCandidate(args: {
  hit: ExaMcpSearchHitInputV1;
  discovery_run_id: string;
  repo: BuildExaDiscoveryRepoContextV1;
}): ExaFridgeWaterDiscoveryCandidateV1 {
  const { hit, discovery_run_id, repo } = args;
  const title = String(hit.title ?? "");
  const snippet = String(hit.snippet ?? "");
  const fetchExcerpt = hit.fetch_excerpt ?? null;
  const fetchStatus = hit.fetch_status ?? (fetchExcerpt ? "fetched_ok" : "not_fetched");
  const combinedEarly = `${title} ${snippet}`;
  const urlTier = classifyUrlTier(hit.url);
  const tokensFromSnippet = extractTokens(combinedEarly);
  const tokensFromFetch = fetchExcerpt ? extractTokens(fetchExcerpt) : { part: [], model: [] };
  const extracted_part_tokens = uniqueStrings([
    ...tokensFromSnippet.part,
    ...tokensFromFetch.part,
  ]);
  const extracted_model_tokens = uniqueStrings([
    ...tokensFromSnippet.model,
    ...tokensFromFetch.model,
  ]);
  const combinedAll = `${combinedEarly} ${fetchExcerpt ?? ""}`;
  const wedge_guess = inferWedgeGuess(combinedAll);
  const primaryToken = extracted_part_tokens[0] ?? null;
  const candidate_slug = primaryToken ? slugifyPartToken(primaryToken) : null;
  const candidate_oem_part_number = primaryToken;

  const rejection_flags: ExaFridgeWaterRejectionFlagV1[] = [];
  const evidence_gaps: string[] = [];

  if (!primaryToken) {
    rejection_flags.push("no_oem_token");
    evidence_gaps.push("no_extractable_oem_part_token");
  }
  if (isSearchResultsUrl(hit.url)) rejection_flags.push("search_results_page");
  if (urlTier.evidence_tier === "E_marketplace_weak") rejection_flags.push("marketplace_only");
  if (wedge_guess === "refrigerator_air") rejection_flags.push("wrong_wedge_air_filter");
  if (fetchStatus !== "fetched_ok") rejection_flags.push("snippet_only_no_fetch");
  if (
    primaryToken &&
    tokensFromSnippet.part.includes(primaryToken) &&
    fetchStatus === "fetched_ok" &&
    !tokensFromFetch.part.includes(primaryToken)
  ) {
    rejection_flags.push("seo_title_only");
  }

  const in_live_filters_csv = candidate_slug ? repo.liveSlugs.has(candidate_slug) : false;
  const in_demoted_registry = Boolean(
    (candidate_slug && repo.demotedSlugs.has(candidate_slug)) ||
      (primaryToken && repo.demotedOemKeys.has(compactPartTokenKey(primaryToken))),
  );
  if (in_live_filters_csv) rejection_flags.push("live_slug_exists");
  if (in_demoted_registry) rejection_flags.push("demoted_registry_match");

  let live_family_slug: string | null = null;
  let alias_collision = false;
  if (primaryToken) {
    const tokenKey = compactPartTokenKey(primaryToken);
    alias_collision = repo.aliasCollisionTokens.has(tokenKey);
    const match = repo.index.by_compact_token.get(tokenKey);
    if (match && candidate_slug && match.slug !== candidate_slug) {
      live_family_slug = match.slug;
      rejection_flags.push("alias_family_hold");
    }
    const revisionSibling = candidate_slug
      ? findRevisionSiblingLiveSlug(candidate_slug, repo.liveSlugs)
      : null;
    if (revisionSibling && revisionSibling !== candidate_slug) {
      live_family_slug = live_family_slug ?? revisionSibling;
      rejection_flags.push("revision_sibling_unproven");
    }
  }

  const repo_checks: ExaFridgeWaterRepoChecksV1 = {
    in_live_filters_csv,
    in_bulk_catalog: false,
    in_demoted_registry,
    alias_collision,
    live_family_slug,
  };

  if (!fetchExcerpt) evidence_gaps.push("no_fetch_excerpt");
  if (extracted_model_tokens.length === 0) {
    evidence_gaps.push("no_explicit_model_compatibility_list");
  }
  evidence_gaps.push("no_committed_evidence_json");
  evidence_gaps.push("no_repo_collision_check_pass");

  const proof_claims: Array<{ claim: string; status: "PROVEN" | "INFERRED" | "UNKNOWN" }> = [];
  if (primaryToken && fetchStatus === "fetched_ok" && tokensFromFetch.part.includes(primaryToken)) {
    proof_claims.push({
      claim: `OEM token ${primaryToken} appears in fetch excerpt`,
      status: "PROVEN",
    });
  } else if (primaryToken && tokensFromSnippet.part.includes(primaryToken)) {
    proof_claims.push({
      claim: `OEM token ${primaryToken} appears in search snippet/title only`,
      status: "INFERRED",
    });
  }
  if (urlTier.evidence_tier === "A_manufacturer_official") {
    proof_claims.push({
      claim: "URL host classified as manufacturer official",
      status: "PROVEN",
    });
  }

  const hardBlock = rejection_flags.some((f) =>
    [
      "demoted_registry_match",
      "live_slug_exists",
      "alias_family_hold",
      "wrong_wedge_air_filter",
      "marketplace_only",
      "search_results_page",
      "revision_sibling_unproven",
      "no_oem_token",
    ].includes(f),
  );

  let recommended_factory_state: ExaFridgeWaterRecommendedFactoryStateV1 = "evidence_needed";
  let recommended_block_reason: string | null = "exa_discovery_unverified";

  if (hardBlock) {
    recommended_factory_state = "blocked_do_not_publish";
    recommended_block_reason = rejection_flags[0] ?? "exa_discovery_blocked";
  } else if (urlTier.evidence_tier === "C_authorized_parts_lookup" || urlTier.evidence_tier === "D_retailer_pdp") {
    recommended_block_reason = "exa_identity_only_no_compat";
  } else if (fetchStatus !== "fetched_ok") {
    recommended_block_reason = "exa_discovery_unverified";
  }

  const omit_from_factory_merge = in_live_filters_csv || !candidate_slug;

  return {
    discovery_source: "exa_web_discovery",
    discovery_run_id,
    query: hit.query,
    discovered_url: hit.url,
    discovered_title: title,
    discovered_snippet: snippet,
    fetch_status: fetchStatus,
    fetch_excerpt: fetchExcerpt,
    extracted_part_tokens,
    extracted_model_tokens,
    brand_guess: urlTier.brand_guess,
    candidate_slug,
    candidate_oem_part_number,
    wedge_guess,
    evidence_tier: urlTier.evidence_tier,
    source_type: urlTier.source_type,
    proof_claims,
    rejection_flags: Array.from(new Set(rejection_flags)),
    evidence_gaps,
    repo_checks,
    recommended_factory_state,
    recommended_block_reason,
    catalog_import_ready: false,
    mutation_ready: false,
    read_only: true,
    data_mutation: false,
    omit_from_factory_merge,
  };
}

export function buildExaFridgeWaterDiscoveryFromMcpExport(args: {
  input: ExaMcpExportInputV1;
  discovery_run_id: string;
  rootDir: string;
  generated_at: string;
  input_path?: string | null;
}): {
  run_meta: ExaFridgeWaterDiscoveryRunMetaV1;
  candidates_file: ExaFridgeWaterDiscoveryCandidatesFileV1;
} {
  const repo = buildExaDiscoveryRepoContext(args.rootDir);
  const hits = flattenExaMcpExportInput(args.input);
  const candidates = hits.map((hit) =>
    buildExaFridgeWaterDiscoveryCandidate({
      hit,
      discovery_run_id: args.discovery_run_id,
      repo,
    }),
  );

  return {
    run_meta: {
      contract: EXA_FRIDGE_WATER_DISCOVERY_CONTRACT_V1,
      discovery_run_id: args.discovery_run_id,
      generated_at: args.generated_at,
      read_only: true,
      data_mutation: false,
      wedge: "refrigerator_water",
      input_path: args.input_path ?? null,
      query_count: new Set(hits.map((h) => h.query)).size,
      raw_hit_count: hits.length,
      candidate_count: candidates.length,
      notes: [
        "PROVEN: Exa discovery is candidate input only — not compatibility truth.",
        "PROVEN: mutation_ready and catalog_import_ready are false for all rows.",
      ],
    },
    candidates_file: {
      contract: EXA_FRIDGE_WATER_DISCOVERY_CONTRACT_V1,
      discovery_run_id: args.discovery_run_id,
      generated_at: args.generated_at,
      read_only: true,
      data_mutation: false,
      candidates,
    },
  };
}
