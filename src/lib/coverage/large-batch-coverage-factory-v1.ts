/**
 * Large Batch Coverage Factory v1 — read-only candidate classification for refrigerator_water.
 * PROVEN: no Supabase writes, no retailer_links mutation, no production UI changes.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildExaDiscoveryFactoryCandidatesV1,
  loadExaDiscoveryForFactoryV1,
  type ExaFridgeWaterDiscoverySourceSummaryV1,
} from "@/lib/coverage/exa-discovery-factory-merge-v1";
import { listFridgeHomekeepBulkFilterRowsV1 } from "@/lib/coverage/fridge-homekeep-bulk-catalog-v1";
import {
  loadBuckpartsFridgeFilterIndexFromRepo,
  type BuckpartsFridgeFilterIndexV1,
} from "@/lib/retailers/buckparts-fridge-filter-index-v1";
import { BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 } from "@/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";
import {
  buyLinkGateFailureKind,
  type BuyLinkGateFailureKind,
} from "@/lib/retailers/launch-buy-links";
import { compactPartTokenKey } from "@/lib/retailers/waterdrop-linksynergy-parse-v1";
import {
  buildWaterdropProofSliceCandidate,
  sortWaterdropProofSliceCandidates,
  type WaterdropProofSliceCandidateV1,
} from "@/lib/retailers/waterdrop-proof-slice-candidate-v1";
import { WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 } from "@/lib/retailers/waterdrop-exact-proof-slice-v1";
import {
  loadWaterdropOperatorInputFromFile,
  normalizeWaterdropOperatorEntries,
  WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1,
} from "@/lib/retailers/waterdrop-operator-input-v1";

export const LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1 =
  "buckparts_large_batch_coverage_factory_v1" as const;

export const LARGE_BATCH_COVERAGE_FACTORY_STATES_V1 = [
  "existing_live_product",
  "new_product_candidate",
  "alias_collision_candidate",
  "publishable_no_buy_page",
  "publishable_amazon_candidate",
  "publishable_waterdrop_candidate",
  "evidence_needed",
  "blocked_do_not_publish",
] as const;

export type LargeBatchCoverageFactoryStateV1 =
  (typeof LARGE_BATCH_COVERAGE_FACTORY_STATES_V1)[number];

/** Frigidaire routing tokens excluded from OEM money cohort (repo-proven list). */
export const LARGE_BATCH_EXCLUDED_FRIGIDAIRE_TOKENS_V1 = [
  "242017801",
  "242086201",
  "242294502",
  "EPTWFU01",
  "FPPWFU01",
] as const;

export type RetailerLinkCsvRowV1 = {
  filter_slug: string;
  retailer_key: string;
  affiliate_url: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
};

export type AmazonRescueTokenControlV1 = {
  token: string;
  status: string;
  reason?: string;
};

export type LargeBatchCoverageCandidateV1 = {
  candidate_key: string;
  slug: string;
  oem_part_number: string;
  brand_slug: string | null;
  factory_state: LargeBatchCoverageFactoryStateV1;
  priority_score: number;
  block_reason: string | null;
  rationale: string[];
  sources: string[];
  is_live_catalog_row: boolean;
  is_bulk_catalog_row: boolean;
  has_gated_buyable_link: boolean;
  has_search_placeholder_only_links: boolean;
  waterdrop_recommended: boolean;
  has_amazon_live_evidence: boolean;
};

export type LargeBatchCoverageSourceSummaryV1 = {
  live_filters_csv: { status: "PROVEN"; path: string; row_count: number };
  filter_aliases_csv: { status: "PROVEN" | "MISSING"; path: string; row_count: number };
  retailer_links_csv: { status: "PROVEN" | "MISSING"; path: string; row_count: number };
  bulk_catalog: {
    status: "PROVEN";
    module: string;
    row_count: number;
  };
  waterdrop_operator_input: {
    status: "PROVEN" | "UNKNOWN" | "EMPTY";
    path: string | null;
    entry_count: number;
    recommended_slug_count: number;
  };
  evidence_dir: { status: "PROVEN" | "MISSING"; path: string; file_count: number };
  amazon_rescue_token_controls: {
    status: "PROVEN" | "MISSING";
    path: string;
    entry_count: number;
  };
  exa_fridge_water_discovery: ExaFridgeWaterDiscoverySourceSummaryV1;
};

export type LargeBatchCoverageFactoryReportV1 = {
  report_name: typeof LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  candidate_count: number;
  top_candidates_limit: number;
  top_candidates: LargeBatchCoverageCandidateV1[];
  state_counts: Record<LargeBatchCoverageFactoryStateV1, number>;
  blocked_counts: {
    total: number;
    by_reason: Record<string, number>;
  };
  source_summary: LargeBatchCoverageSourceSummaryV1;
  notes: string[];
};

export type BuildLargeBatchCoverageFactoryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  topCandidatesLimit?: number;
  /** When set, load operator Waterdrop JSON from this path only (tests). */
  waterdropOperatorInputPath?: string | null;
  readTextFile?: (absolutePath: string) => string;
  fileExists?: (absolutePath: string) => boolean;
  listEvidenceFilenames?: (absolutePath: string) => string[];
  loadFridgeIndex?: (rootDir: string) => BuckpartsFridgeFilterIndexV1;
  listBulkRows?: () => ReturnType<typeof listFridgeHomekeepBulkFilterRowsV1>;
  loadExaDiscovery?: (rootDir: string) => ReturnType<typeof loadExaDiscoveryForFactoryV1>;
};

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function defaultListEvidence(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

function emptyStateCounts(): Record<LargeBatchCoverageFactoryStateV1, number> {
  return {
    existing_live_product: 0,
    new_product_candidate: 0,
    alias_collision_candidate: 0,
    publishable_no_buy_page: 0,
    publishable_amazon_candidate: 0,
    publishable_waterdrop_candidate: 0,
    evidence_needed: 0,
    blocked_do_not_publish: 0,
  };
}

function parseRetailerLinksCsv(csvText: string): RetailerLinkCsvRowV1[] {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const out: RetailerLinkCsvRowV1[] = [];
  for (const row of rows) {
    const filter_slug = row.filter_slug?.trim().toLowerCase();
    const affiliate_url = row.affiliate_url?.trim();
    if (!filter_slug || !affiliate_url) continue;
    out.push({
      filter_slug,
      retailer_key: row.retailer_key?.trim().toLowerCase() ?? "",
      affiliate_url,
      browser_truth_classification: row.browser_truth_classification?.trim() || null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype?.trim() || null,
    });
  }
  return out;
}

function loadRetailerLinksBySlug(
  rootDir: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): Map<string, RetailerLinkCsvRowV1[]> {
  const p = path.join(rootDir, "data/retailer_links.csv");
  const map = new Map<string, RetailerLinkCsvRowV1[]>();
  if (!fileExists(p)) return map;
  for (const row of parseRetailerLinksCsv(readTextFile(p))) {
    const list = map.get(row.filter_slug) ?? [];
    list.push(row);
    map.set(row.filter_slug, list);
  }
  return map;
}

function loadAliasCollisionTokens(rootDir: string, readTextFile: (p: string) => string): Set<string> {
  const p = path.join(rootDir, "data/filter_aliases.csv");
  const byToken = new Map<string, Set<string>>();
  const rows = parse(readTextFile(p), { columns: true, skip_empty_lines: true }) as Array<{
    filter_slug?: string;
    alias?: string;
  }>;
  for (const row of rows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    const alias = row.alias?.trim();
    if (!slug || !alias) continue;
    const key = compactPartTokenKey(alias);
    const set = byToken.get(key) ?? new Set<string>();
    set.add(slug);
    byToken.set(key, set);
  }
  const collisions = new Set<string>();
  for (const [key, slugs] of Array.from(byToken.entries())) {
    if (slugs.size > 1) collisions.add(key);
  }
  return collisions;
}

function loadAmazonTokenControls(
  rootDir: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): Map<string, AmazonRescueTokenControlV1> {
  const p = path.join(rootDir, "data/ops/amazon-rescue-token-controls.json");
  const map = new Map<string, AmazonRescueTokenControlV1>();
  if (!fileExists(p)) return map;
  try {
    const doc = JSON.parse(readTextFile(p)) as { entries?: AmazonRescueTokenControlV1[] };
    for (const e of doc.entries ?? []) {
      if (e?.token) map.set(e.token.trim().toUpperCase(), e);
    }
  } catch {
    return map;
  }
  return map;
}

function isExcludedFrigidaireToken(oem: string): boolean {
  const upper = oem.trim().toUpperCase();
  return LARGE_BATCH_EXCLUDED_FRIGIDAIRE_TOKENS_V1.some((t) => upper.includes(t));
}

function hasAmazonLiveEvidence(slug: string, evidenceFilenames: string[]): boolean {
  const prefix = `amazon-${slug.toLowerCase()}-`;
  return evidenceFilenames.some((f) => {
    const lower = f.toLowerCase();
    return lower.startsWith(prefix) && (lower.includes("live-outcome") || lower.includes("live_outcome"));
  });
}

function hasWaterdropLiveEvidence(slug: string, evidenceFilenames: string[]): boolean {
  const lowerSlug = slug.toLowerCase();
  return evidenceFilenames.some((f) => {
    const lower = f.toLowerCase();
    return lower.startsWith(`waterdrop-${lowerSlug}-`) && lower.includes("owner-browser-proof");
  });
}

function isAmazonRescueCohortToken(oem: string): boolean {
  const key = oem.trim().toUpperCase();
  return (BATCH_AMAZON_RESCUE_DEFAULT_COHORT_TOKENS_V1 as readonly string[]).some(
    (t) => t.toUpperCase() === key,
  );
}

function summarizeLinks(links: RetailerLinkCsvRowV1[]): {
  has_gated_buyable_link: boolean;
  has_search_placeholder_only_links: boolean;
  gate_failures: BuyLinkGateFailureKind[];
} {
  if (links.length === 0) {
    return {
      has_gated_buyable_link: false,
      has_search_placeholder_only_links: false,
      gate_failures: [],
    };
  }
  const failures = links.map((l) => buyLinkGateFailureKind(l));
  const hasBuyable = failures.some((f) => f === null);
  const onlyPlaceholder =
    links.length > 0 &&
    failures.every((f) => f === "search_placeholder" || f === "missing_browser_truth");
  return {
    has_gated_buyable_link: hasBuyable,
    has_search_placeholder_only_links: onlyPlaceholder,
    gate_failures: failures.filter((f): f is BuyLinkGateFailureKind => f !== null),
  };
}

function loadWaterdropCandidatesBySlug(
  rootDir: string,
  index: BuckpartsFridgeFilterIndexV1,
  operatorPath: string | null | undefined,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): {
  bySlug: Map<string, WaterdropProofSliceCandidateV1>;
  sourceStatus: "PROVEN" | "UNKNOWN" | "EMPTY";
  path: string | null;
  entryCount: number;
} {
  const primary = path.join(rootDir, "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json");
  const resolved =
    operatorPath !== undefined
      ? operatorPath
      : fileExists(primary)
        ? primary
        : null;

  if (!resolved || !fileExists(resolved)) {
    return { bySlug: new Map(), sourceStatus: "UNKNOWN", path: null, entryCount: 0 };
  }

  let input;
  try {
    input = loadWaterdropOperatorInputFromFile(resolved);
  } catch {
    return { bySlug: new Map(), sourceStatus: "EMPTY", path: resolved, entryCount: 0 };
  }

  if (input.contract !== WATERDROP_RAKUTEN_OPERATOR_INPUT_CONTRACT_V1) {
    return { bySlug: new Map(), sourceStatus: "EMPTY", path: resolved, entryCount: 0 };
  }

  const entries = normalizeWaterdropOperatorEntries(input);
  const built = entries.map((e) =>
    buildWaterdropProofSliceCandidate({
      entry_id: e.entry_id,
      parsed: e.parsed,
      index,
      production_snapshot: "UNKNOWN",
    }),
  );
  const sorted = sortWaterdropProofSliceCandidates(built);
  const bySlug = new Map<string, WaterdropProofSliceCandidateV1>();
  for (const row of sorted) {
    if (!row.matched_slug) continue;
    if (!bySlug.has(row.matched_slug)) bySlug.set(row.matched_slug, row);
  }
  return {
    bySlug,
    sourceStatus: entries.length > 0 ? "PROVEN" : "EMPTY",
    path: resolved,
    entryCount: entries.length,
  };
}

function priorityScoreForState(
  state: LargeBatchCoverageFactoryStateV1,
  waterdropScore: number,
): number {
  switch (state) {
    case "publishable_waterdrop_candidate":
      return 900 + waterdropScore;
    case "publishable_amazon_candidate":
      return 850;
    case "new_product_candidate":
      return 750;
    case "evidence_needed":
      return 650;
    case "publishable_no_buy_page":
      return 550;
    case "alias_collision_candidate":
      return 450;
    case "existing_live_product":
      return 400;
    case "blocked_do_not_publish":
      return 0;
    default:
      return 0;
  }
}

export type ClassifyLargeBatchCandidateInputV1 = {
  slug: string;
  oem_part_number: string;
  brand_slug: string | null;
  is_live: boolean;
  is_bulk: boolean;
  alias_collision: boolean;
  links: RetailerLinkCsvRowV1[];
  waterdrop: WaterdropProofSliceCandidateV1 | null;
  amazon_control: AmazonRescueTokenControlV1 | null;
  evidence_filenames: string[];
};

export function classifyLargeBatchCandidateV1(
  input: ClassifyLargeBatchCandidateInputV1,
): {
  factory_state: LargeBatchCoverageFactoryStateV1;
  block_reason: string | null;
  rationale: string[];
  priority_score: number;
  signals: Pick<
    LargeBatchCoverageCandidateV1,
    | "has_gated_buyable_link"
    | "has_search_placeholder_only_links"
    | "waterdrop_recommended"
    | "has_amazon_live_evidence"
  >;
} {
  const rationale: string[] = [];
  const linkSummary = summarizeLinks(input.links);
  const waterdropRecommended = input.waterdrop?.recommended_for_owner_browser_proof === true;
  const amazonLiveEvidence = hasAmazonLiveEvidence(input.slug, input.evidence_filenames);
  const waterdropLiveEvidence = hasWaterdropLiveEvidence(input.slug, input.evidence_filenames);
  const liveWaterdropSlice = (WATERDROP_EXACT_PROOF_SLICE_SLUGS_V1 as readonly string[]).includes(
    input.slug,
  );

  if (isExcludedFrigidaireToken(input.oem_part_number)) {
    rationale.push("PROVEN: OEM token matches LARGE_BATCH_EXCLUDED_FRIGIDAIRE_TOKENS_V1.");
    return {
      factory_state: "blocked_do_not_publish",
      block_reason: "excluded_frigidaire_routing_token",
      rationale,
      priority_score: 0,
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (input.alias_collision) {
    rationale.push("PROVEN: alias token maps to multiple filter_slug values in filter_aliases.csv.");
    return {
      factory_state: "alias_collision_candidate",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("alias_collision_candidate", 0),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (input.amazon_control?.status === "FROZEN_OPERATOR_HOLD") {
    rationale.push(
      `PROVEN: data/ops/amazon-rescue-token-controls.json status=${input.amazon_control.status}.`,
    );
    return {
      factory_state: "blocked_do_not_publish",
      block_reason: "frozen_amazon_rescue_token",
      rationale,
      priority_score: 0,
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (
    linkSummary.has_search_placeholder_only_links &&
    !linkSummary.has_gated_buyable_link &&
    !waterdropRecommended &&
    !amazonLiveEvidence &&
    !input.is_live
  ) {
    rationale.push(
      "PROVEN: retailer_links rows are search-placeholder or missing browser_truth only; no live catalog row.",
    );
    return {
      factory_state: "blocked_do_not_publish",
      block_reason: "search_placeholder_only_no_catalog_row",
      rationale,
      priority_score: 0,
      signals: {
        has_gated_buyable_link: false,
        has_search_placeholder_only_links: true,
        waterdrop_recommended: false,
        has_amazon_live_evidence: false,
      },
    };
  }

  if (waterdropRecommended && !liveWaterdropSlice && !waterdropLiveEvidence) {
    rationale.push("PROVEN: Waterdrop proof-slice ranker recommended_for_owner_browser_proof.");
    if (input.waterdrop?.match_confidence) {
      rationale.push(`PROVEN: waterdrop match_confidence=${input.waterdrop.match_confidence}.`);
    }
    return {
      factory_state: "publishable_waterdrop_candidate",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState(
        "publishable_waterdrop_candidate",
        input.waterdrop?.ranking_score ?? 0,
      ),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: true,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (amazonLiveEvidence || (linkSummary.has_gated_buyable_link && input.links.some((l) => l.retailer_key === "amazon"))) {
    rationale.push(
      amazonLiveEvidence
        ? "PROVEN: data/evidence/amazon-*-live-outcome artifact present for slug."
        : "PROVEN: retailer_links.csv has gated buyable amazon row.",
    );
    return {
      factory_state: "publishable_amazon_candidate",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("publishable_amazon_candidate", 0),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (
    input.is_live &&
    !linkSummary.has_gated_buyable_link &&
    (linkSummary.has_search_placeholder_only_links || input.links.length === 0)
  ) {
    rationale.push(
      "PROVEN: live filters.csv row without gated buyable retailer_links — info-only publish path.",
    );
    return {
      factory_state: "publishable_no_buy_page",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("publishable_no_buy_page", 0),
      signals: {
        has_gated_buyable_link: false,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (
    isAmazonRescueCohortToken(input.oem_part_number) &&
    !amazonLiveEvidence &&
    input.is_live
  ) {
    rationale.push("PROVEN: amazon-rescue default cohort token; no committed live-outcome evidence file.");
    return {
      factory_state: "evidence_needed",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("evidence_needed", 0),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: false,
      },
    };
  }

  if (!input.is_live && input.is_bulk) {
    if (waterdropRecommended) {
      rationale.push("PROVEN: bulk catalog row with Waterdrop operator match (not live slug).");
      return {
        factory_state: "publishable_waterdrop_candidate",
        block_reason: null,
        rationale,
        priority_score: priorityScoreForState(
          "publishable_waterdrop_candidate",
          input.waterdrop?.ranking_score ?? 0,
        ),
        signals: {
          has_gated_buyable_link: linkSummary.has_gated_buyable_link,
          has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
          waterdrop_recommended: true,
          has_amazon_live_evidence: amazonLiveEvidence,
        },
      };
    }
    rationale.push("PROVEN: slug in fridge-homekeep-bulk-catalog-v1 but not in data/filters.csv.");
    return {
      factory_state: "new_product_candidate",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("new_product_candidate", 0),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  if (input.is_live) {
    if (liveWaterdropSlice || waterdropLiveEvidence) {
      rationale.push("PROVEN: slug in committed live filters.csv (Waterdrop proof slice or evidence on disk).");
    } else {
      rationale.push("PROVEN: slug in committed data/filters.csv.");
    }
    return {
      factory_state: "existing_live_product",
      block_reason: null,
      rationale,
      priority_score: priorityScoreForState("existing_live_product", 0),
      signals: {
        has_gated_buyable_link: linkSummary.has_gated_buyable_link,
        has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
        waterdrop_recommended: waterdropRecommended,
        has_amazon_live_evidence: amazonLiveEvidence,
      },
    };
  }

  rationale.push("INFERRED: insufficient signals — defaulting to evidence_needed (safer than buy CTA).");
  return {
    factory_state: "evidence_needed",
    block_reason: null,
    rationale,
    priority_score: priorityScoreForState("evidence_needed", 0),
    signals: {
      has_gated_buyable_link: linkSummary.has_gated_buyable_link,
      has_search_placeholder_only_links: linkSummary.has_search_placeholder_only_links,
      waterdrop_recommended: waterdropRecommended,
      has_amazon_live_evidence: amazonLiveEvidence,
    },
  };
}

export function buildLargeBatchCoverageFactoryReportV1(
  deps: BuildLargeBatchCoverageFactoryDepsV1,
): LargeBatchCoverageFactoryReportV1 {
  const rootDir = deps.rootDir;
  const readTextFile = deps.readTextFile ?? defaultReadText;
  const fileExists = deps.fileExists ?? defaultFileExists;
  const listEvidenceFilenames = deps.listEvidenceFilenames ?? defaultListEvidence;
  const loadFridgeIndex = deps.loadFridgeIndex ?? loadBuckpartsFridgeFilterIndexFromRepo;
  const listBulkRows = deps.listBulkRows ?? listFridgeHomekeepBulkFilterRowsV1;
  const topCandidatesLimit = deps.topCandidatesLimit ?? 25;
  const now = deps.now ?? (() => new Date());

  const index = loadFridgeIndex(rootDir);
  const bulkRows = listBulkRows();
  const bulkBySlug = new Map(bulkRows.map((r) => [r.slug, r]));
  const liveSlugs = new Set(index.filters.map((f) => f.slug));
  const aliasCollisions = loadAliasCollisionTokens(rootDir, readTextFile);
  const linksBySlug = loadRetailerLinksBySlug(rootDir, readTextFile, fileExists);
  const evidenceDir = path.join(rootDir, "data/evidence");
  const evidenceFilenames = listEvidenceFilenames(evidenceDir);
  const amazonControls = loadAmazonTokenControls(rootDir, readTextFile, fileExists);
  const waterdropLoad = loadWaterdropCandidatesBySlug(
    rootDir,
    index,
    deps.waterdropOperatorInputPath,
    readTextFile,
    fileExists,
  );

  const candidateSlugs = new Set<string>();
  for (const f of index.filters) candidateSlugs.add(f.slug);
  for (const b of bulkRows) candidateSlugs.add(b.slug);

  const candidates: LargeBatchCoverageCandidateV1[] = [];

  for (const slug of Array.from(candidateSlugs).sort()) {
    const live = index.by_slug.get(slug);
    const bulk = bulkBySlug.get(slug);
    const oem =
      live?.oem_part_number ?? bulk?.oem_part_number ?? slug.toUpperCase();
    const brand_slug = live?.brand_slug ?? bulk?.brand_slug ?? null;
    const oemKey = compactPartTokenKey(oem);
    let alias_collision = aliasCollisions.has(oemKey);
    if (!alias_collision && live) {
      for (const a of live.aliases) {
        if (aliasCollisions.has(compactPartTokenKey(a))) {
          alias_collision = true;
          break;
        }
      }
    }
    const links = linksBySlug.get(slug) ?? [];
    const waterdrop = waterdropLoad.bySlug.get(slug) ?? null;
    const amazon_control = amazonControls.get(oem.trim().toUpperCase()) ?? null;

    const classified = classifyLargeBatchCandidateV1({
      slug,
      oem_part_number: oem,
      brand_slug,
      is_live: liveSlugs.has(slug),
      is_bulk: bulkBySlug.has(slug),
      alias_collision,
      links,
      waterdrop,
      amazon_control,
      evidence_filenames: evidenceFilenames,
    });

    const sources: string[] = [];
    if (liveSlugs.has(slug)) sources.push("data/filters.csv");
    if (bulkBySlug.has(slug)) sources.push("src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts");
    if (waterdrop) sources.push("waterdrop_operator_input");
    if (links.length > 0) sources.push("data/retailer_links.csv");
    if (hasAmazonLiveEvidence(slug, evidenceFilenames)) sources.push("data/evidence");

    candidates.push({
      candidate_key: slug,
      slug,
      oem_part_number: oem,
      brand_slug,
      factory_state: classified.factory_state,
      priority_score: classified.priority_score,
      block_reason: classified.block_reason,
      rationale: classified.rationale,
      sources,
      is_live_catalog_row: liveSlugs.has(slug),
      is_bulk_catalog_row: bulkBySlug.has(slug),
      ...classified.signals,
    });
  }

  const exaLoad = (deps.loadExaDiscovery ?? loadExaDiscoveryForFactoryV1)(rootDir);
  const existingSlugs = new Set(candidates.map((c) => c.slug));
  const exaAdds = buildExaDiscoveryFactoryCandidatesV1(exaLoad, rootDir);
  for (const exaRow of exaAdds) {
    if (existingSlugs.has(exaRow.slug)) continue;
    existingSlugs.add(exaRow.slug);
    candidates.push(exaRow);
  }

  candidates.sort((a, b) => b.priority_score - a.priority_score || a.slug.localeCompare(b.slug));

  const state_counts = emptyStateCounts();
  const blocked_by_reason: Record<string, number> = {};
  for (const c of candidates) {
    state_counts[c.factory_state] += 1;
    if (c.factory_state === "blocked_do_not_publish" && c.block_reason) {
      blocked_by_reason[c.block_reason] = (blocked_by_reason[c.block_reason] ?? 0) + 1;
    }
  }

  const aliasesPath = path.join(rootDir, "data/filter_aliases.csv");
  const retailerLinksPath = path.join(rootDir, "data/retailer_links.csv");
  const tokenControlsPath = path.join(rootDir, "data/ops/amazon-rescue-token-controls.json");

  const waterdropRecommendedCount = Array.from(waterdropLoad.bySlug.values()).filter(
    (r) => r.recommended_for_owner_browser_proof,
  ).length;

  const notes = [
    "PROVEN: read-only classifier; no Supabase, retailer_links, evidence JSON, or UI mutation authority.",
    "PROVEN: bulk catalog sourced from src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts (shared with generate-fridge-homekeep-bulk-csv.ts).",
    "PROVEN: Waterdrop operator input uses data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json only when present; sample JSON is not used by default.",
    "INFERRED: top_candidates ordering is priority_score desc for operator review, not mutation approval.",
    ...(exaLoad.source_summary.status === "PROVEN"
      ? [
          `PROVEN: Exa fridge-water discovery merged ${exaLoad.source_summary.merged_into_factory_count} row(s) from ${exaLoad.source_summary.path} — never new_product_candidate.`,
        ]
      : []),
  ];

  return {
    report_name: LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    candidate_count: candidates.length,
    top_candidates_limit: topCandidatesLimit,
    top_candidates: candidates.slice(0, topCandidatesLimit),
    state_counts,
    blocked_counts: {
      total: state_counts.blocked_do_not_publish,
      by_reason: blocked_by_reason,
    },
    source_summary: {
      live_filters_csv: {
        status: "PROVEN",
        path: "data/filters.csv",
        row_count: index.filters.length,
      },
      filter_aliases_csv: {
        status: fileExists(aliasesPath) ? "PROVEN" : "MISSING",
        path: "data/filter_aliases.csv",
        row_count: fileExists(aliasesPath)
          ? (parse(readTextFile(aliasesPath), { columns: true, skip_empty_lines: true }) as unknown[])
              .length
          : 0,
      },
      retailer_links_csv: {
        status: fileExists(retailerLinksPath) ? "PROVEN" : "MISSING",
        path: "data/retailer_links.csv",
        row_count: Array.from(linksBySlug.values()).reduce((n, rows) => n + rows.length, 0),
      },
      bulk_catalog: {
        status: "PROVEN",
        module: "src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts",
        row_count: bulkRows.length,
      },
      waterdrop_operator_input: {
        status: waterdropLoad.sourceStatus,
        path: waterdropLoad.path
          ? path.relative(rootDir, waterdropLoad.path)
          : "data/waterdrop/operator-input/waterdrop-rakuten-links.v1.json",
        entry_count: waterdropLoad.entryCount,
        recommended_slug_count: waterdropRecommendedCount,
      },
      evidence_dir: {
        status: fileExists(evidenceDir) ? "PROVEN" : "MISSING",
        path: "data/evidence",
        file_count: evidenceFilenames.length,
      },
      amazon_rescue_token_controls: {
        status: fileExists(tokenControlsPath) ? "PROVEN" : "MISSING",
        path: "data/ops/amazon-rescue-token-controls.json",
        entry_count: amazonControls.size,
      },
      exa_fridge_water_discovery: exaLoad.source_summary,
    },
    notes,
  };
}
