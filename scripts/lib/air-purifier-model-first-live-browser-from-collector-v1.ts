/**
 * Map the existing browser-proof collector onto the existing AP model-first
 * live-browser result contract. Grant-gated. No new runtime, queue, or dispatch.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import type { ApModelFirstEvidenceQueueReportV1 } from "./ap-model-first-evidence-queue-v1";
import {
  loadRatifiedModelFirstEvidenceResultWriteGrantRowV1,
  type ModelFirstEvidenceResultWriteBlockedReasonV1,
} from "./ap-model-first-evidence-result-write-from-queue-v1";
import {
  AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
  AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1,
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1,
  liveBrowserBuyerPathMayRecommendCsvMutationV1,
  loadAllRepoModelSlugsForAnchorFilterV1,
  loadModelFirstEvidenceResultV1,
  modelFirstLiveBrowserResultRelPathV1,
  validateModelFirstEvidenceResultV1,
  type AirPurifierModelFirstLiveBrowserEvidenceResultV1,
  type ModelFirstCandidateBuyerPathV1,
  type ModelFirstEvidenceRowStatusV1,
  type ModelFirstLiveBrowserModelRowV1,
} from "./air-purifier-model-first-evidence-result-v1";
import {
  runBrowserProofCollectorBatchV1,
  type BrowserProofCollectorCandidateResultV1,
  type BrowserProofCollectorDraftV1,
} from "./browser-proof-collector-v1";

export type ModelFirstLiveBrowserWriteBlockedReasonV1 =
  | ModelFirstEvidenceResultWriteBlockedReasonV1
  | "no_completed_candidate_missing_live_browser"
  | "filter_row_missing"
  | "no_seed_urls"
  | "collector_failed"
  | "live_browser_validation_failed"
  | "live_browser_path_not_allowed";

export type ModelFirstLiveBrowserWriteOutcomeV1 = {
  wrote: boolean;
  blocked_reason: ModelFirstLiveBrowserWriteBlockedReasonV1 | null;
  grant_active: boolean;
  grant_mutation_approval_active: false;
  allowed_next_scope: string | null;
  queue_status: ApModelFirstEvidenceQueueReportV1["queue_status"] | null;
  anchor_filter_slug: string | null;
  result_rel: string | null;
  packets_written: false;
  data_mutation: false;
  seed_urls: string[];
  discovery_tokens: string[];
  collector_error: string | null;
  evidence_status_pass_count: number | null;
};

type FilterCsvRow = {
  brand_slug: string;
  slug: string;
  oem_part_number?: string;
  name?: string;
  notes?: string;
};

type RetailerLinkRow = {
  filter_slug: string;
  affiliate_url?: string;
  destination_url?: string;
};

type ModelCsvRow = {
  slug: string;
  model_number?: string;
  title?: string;
  notes?: string;
};

type BatchV3FilterRow = {
  filter_slug?: string;
  candidate_url?: string;
};

export function parseApModelFirstEvidenceQueueReporterArgsV1(argv: readonly string[]): {
  live_browser_only: boolean;
} {
  return {
    live_browser_only: argv.includes("--live-browser-only"),
  };
}

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function readCsv<T extends Record<string, string>>(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
  fileExists: (p: string) => boolean,
): T[] {
  const abs = path.join(rootDir, relPath);
  if (!fileExists(abs)) return [];
  return parse(readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function emptyOutcome(
  partial: Partial<ModelFirstLiveBrowserWriteOutcomeV1> & {
    blocked_reason: ModelFirstLiveBrowserWriteBlockedReasonV1;
  },
): ModelFirstLiveBrowserWriteOutcomeV1 {
  return {
    wrote: false,
    grant_active: false,
    grant_mutation_approval_active: false,
    allowed_next_scope: null,
    queue_status: null,
    anchor_filter_slug: null,
    result_rel: null,
    packets_written: false,
    data_mutation: false,
    seed_urls: [],
    discovery_tokens: [],
    collector_error: null,
    evidence_status_pass_count: null,
    ...partial,
  };
}

function loadBatchV3CandidateUrl(args: {
  rootDir: string;
  filterSlug: string;
  readText: (p: string) => string;
  fileExists: (p: string) => boolean;
}): string | null {
  const rel =
    "data/air-purifier/batch-production/agent-results-batch-v3/ap-oem-search-placeholder-v1.results.json";
  const abs = path.join(args.rootDir, rel);
  if (!args.fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(args.readText(abs)) as {
      candidate_results?: BatchV3FilterRow[];
    };
    const row = parsed.candidate_results?.find((r) => r.filter_slug === args.filterSlug);
    const url = row?.candidate_url?.trim() ?? "";
    return url.length > 0 ? url : null;
  } catch {
    return null;
  }
}

const MAX_FIRST_PARTY_DISCOVERY_TOKENS_V1 = 2;
const SHARK_FIRST_PARTY_SEARCH_HOSTS_V1 = ["www.sharkclean.com", "www.sharkninja.com"] as const;

/**
 * Compact family tokens already in the selected slug (e.g. shark-hepa-hp200 → HP200).
 * Discovery queries only — never treated as catalog fit/buy proof.
 */
export function extractFamilyDiscoveryTokensFromSlugV1(slug: string): string[] {
  return slug
    .toUpperCase()
    .split(/[-_]/)
    .filter((part) => /^[A-Z]{1,4}\d{2,}$/.test(part));
}

/**
 * First-party SKUs recorded in repo notes (e.g. "SharkNinja first-party HE2FKBAS ...").
 * Discovery queries only — never treated as catalog fit/buy proof.
 */
export function extractFirstPartyDiscoveryTokensFromNotesV1(notes: string): string[] {
  const tokens = new Set<string>();
  const firstParty = notes.matchAll(/first-party\s+([A-Z0-9][A-Z0-9-]{3,})/gi);
  for (const match of firstParty) {
    const token = match[1]?.trim().toUpperCase();
    if (token) tokens.add(token);
  }
  const heSkus = notes.matchAll(/\bHE\d[A-Z0-9]{3,}\b/gi);
  for (const match of heSkus) {
    const token = match[0]?.trim().toUpperCase();
    if (token) tokens.add(token);
  }
  return [...tokens];
}

/** Reuse manufacturer-site /search?q= seeds; add documented sharkclean↔sharkninja host alias. */
export function buildFirstPartyDiscoverySearchUrlsV1(args: {
  seedUrls: readonly string[];
  discoveryTokens: readonly string[];
}): string[] {
  const tokens = args.discoveryTokens
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, MAX_FIRST_PARTY_DISCOVERY_TOKENS_V1);
  if (tokens.length === 0) return [];
  const seen = new Set(args.seedUrls.map((u) => u.trim()).filter(Boolean));
  const extra: string[] = [];
  const push = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    extra.push(url);
  };

  for (const seed of args.seedUrls) {
    let parsed: URL;
    try {
      parsed = new URL(seed);
    } catch {
      continue;
    }
    const isSearch =
      isManufacturerSiteSearchUrl(seed) || parsed.pathname.toLowerCase().includes("/search");
    if (!isSearch) continue;
    for (const token of tokens) {
      const next = new URL(parsed.toString());
      next.searchParams.set("q", token);
      push(next.toString());
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "sharkclean.com" || host === "sharkninja.com") {
        for (const aliasHost of SHARK_FIRST_PARTY_SEARCH_HOSTS_V1) {
          const aliased = new URL(next.toString());
          aliased.hostname = aliasHost;
          if (!aliased.pathname.toLowerCase().includes("/search")) {
            aliased.pathname = "/search";
          }
          push(aliased.toString());
        }
      }
    }
  }
  return extra;
}

function liveBrowserDiscoveryFailedV1(result: {
  evidence_status_counts: { PASS: number };
  candidate_buyer_paths?: unknown[];
}): boolean {
  if (result.evidence_status_counts.PASS > 0) return false;
  const paths = result.candidate_buyer_paths;
  return !Array.isArray(paths) || paths.length === 0;
}

export function selectCompletedCandidateMissingLiveBrowserFileV1(args: {
  queue: ApModelFirstEvidenceQueueReportV1;
  rootDir: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
}): { filter_slug: string; sample_model_slugs: string[] } | null {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  for (const candidate of args.queue.completed_no_mutation_candidates) {
    const slug = candidate.filter_slug?.trim();
    if (!slug) continue;
    const rel = modelFirstLiveBrowserResultRelPathV1(slug);
    const abs = path.join(args.rootDir, rel);
    if (!fileExists(abs)) {
      return {
        filter_slug: slug,
        sample_model_slugs: candidate.sample_model_slugs ?? [],
      };
    }
    const loaded = loadModelFirstEvidenceResultV1({
      rootDir: args.rootDir,
      relPath: rel,
      readText,
      fileExists,
    });
    if (!loaded) continue;
    if (loaded.evidence_collection_mode !== "live_browser_model_first_v1") continue;
    if (liveBrowserDiscoveryFailedV1(loaded)) {
      return {
        filter_slug: slug,
        sample_model_slugs: candidate.sample_model_slugs ?? [],
      };
    }
  }
  return null;
}

export function loadApModelFirstLiveBrowserSeedInputsV1(args: {
  rootDir: string;
  filterSlug: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}):
  | {
      ok: true;
      token: string;
      seed_urls: string[];
      discovery_tokens: string[];
      filter_name: string | null;
    }
  | { ok: false; blocked_reason: "filter_row_missing" | "no_seed_urls" } {
  const readText = args.readText ?? defaultReadText;
  const fileExists = args.fileExists ?? defaultFileExists;
  const filters = readCsv<FilterCsvRow>(
    args.rootDir,
    "data/air-purifier/filters.csv",
    readText,
    fileExists,
  );
  const filterRow = filters.find((f) => f.slug === args.filterSlug) ?? null;
  if (!filterRow) return { ok: false, blocked_reason: "filter_row_missing" };
  const token = filterRow.oem_part_number?.trim() || args.filterSlug;
  const links = readCsv<RetailerLinkRow>(
    args.rootDir,
    "data/air-purifier/retailer_links.csv",
    readText,
    fileExists,
  );
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | undefined) => {
    const url = raw?.trim() ?? "";
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };
  for (const row of links.filter((l) => l.filter_slug === args.filterSlug)) {
    push(row.destination_url);
    push(row.affiliate_url);
  }
  push(
    loadBatchV3CandidateUrl({
      rootDir: args.rootDir,
      filterSlug: args.filterSlug,
      readText,
      fileExists,
    }) ?? undefined,
  );
  if (urls.length === 0) return { ok: false, blocked_reason: "no_seed_urls" };

  const mappedModelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(
    args.rootDir,
    args.filterSlug,
    readText,
    fileExists,
  );
  const models = readCsv<ModelCsvRow>(
    args.rootDir,
    "data/air-purifier/models.csv",
    readText,
    fileExists,
  );
  const discoveryTokens = new Set<string>();
  for (const note of [filterRow.notes ?? ""]) {
    for (const t of extractFirstPartyDiscoveryTokensFromNotesV1(note)) {
      if (t !== token.toUpperCase()) discoveryTokens.add(t);
    }
  }
  for (const modelSlug of mappedModelSlugs) {
    const model = models.find((m) => m.slug === modelSlug);
    for (const t of extractFirstPartyDiscoveryTokensFromNotesV1(model?.notes ?? "")) {
      if (t !== token.toUpperCase()) discoveryTokens.add(t);
    }
  }
  for (const t of extractFamilyDiscoveryTokensFromSlugV1(args.filterSlug)) {
    if (t !== token.toUpperCase()) discoveryTokens.add(t);
  }
  const discovery_tokens = [...discoveryTokens].slice(0, MAX_FIRST_PARTY_DISCOVERY_TOKENS_V1);
  for (const extra of buildFirstPartyDiscoverySearchUrlsV1({
    seedUrls: urls,
    discoveryTokens: discovery_tokens,
  })) {
    push(extra);
  }

  return {
    ok: true,
    token,
    seed_urls: urls,
    discovery_tokens,
    filter_name: filterRow.name?.trim() || null,
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "unknown";
  }
}

function countStatuses(
  rows: Array<{ evidence_status: ModelFirstEvidenceRowStatusV1 }>,
): Record<ModelFirstEvidenceRowStatusV1, number> {
  const counts: Record<ModelFirstEvidenceRowStatusV1, number> = {
    PASS: 0,
    FAIL: 0,
    UNKNOWN: 0,
    BLOCKED: 0,
  };
  for (const row of rows) counts[row.evidence_status] += 1;
  return counts;
}

function modelNumberNeedles(modelSlug: string, modelNumber: string | null): string[] {
  const needles = new Set<string>();
  const push = (raw: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    needles.add(v.toUpperCase());
    const compact = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (compact) needles.add(compact);
  };
  push(modelNumber);
  const tail = modelSlug.split("-").slice(1).join("").toUpperCase();
  if (tail) needles.add(tail);
  return [...needles].filter((n) => n.length >= 4);
}

function blobMentionsNeedle(blob: string, needle: string): boolean {
  const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(blob);
}

export function mapCollectorCandidateToLiveBrowserBuyerPathV1(args: {
  candidate: BrowserProofCollectorCandidateResultV1;
  expectedToken: string;
}): ModelFirstCandidateBuyerPathV1 | null {
  const url = (args.candidate.facts.final_url || args.candidate.candidate_url).trim();
  if (!url) return null;
  if (isManufacturerSiteSearchUrl(url)) return null;
  if (args.candidate.facts.page_type === "search_page") return null;

  const exact_token_proof = args.candidate.facts.exact_expected_token_present
    ? `PROVEN: exact token ${args.expectedToken} visible on ${url}`
    : `UNKNOWN: exact token ${args.expectedToken} not visible on captured page`;
  const buySignals = args.candidate.facts.add_to_cart_or_subscription_signals;
  const buyability_proof =
    buySignals.length > 0
      ? `PROVEN: ${buySignals.join(", ")}`
      : args.candidate.facts.price_like_text_present ||
          args.candidate.facts.stock_or_buyability_signal_present
        ? "INFERRED: price or stock-like text present"
        : "UNKNOWN: no add-to-cart or buyability signal";
  const wrong_family_risk =
    args.candidate.facts.forbidden_tokens_present.length > 0
      ? `FORBIDDEN tokens present: ${args.candidate.facts.forbidden_tokens_present.join(",")}`
      : "UNKNOWN: family-mismatch risk not proven in this capture";

  const passDraft: ModelFirstCandidateBuyerPathV1 = {
    url,
    retailer_or_source: hostFromUrl(url),
    exact_token_proof,
    buyability_proof,
    wrong_family_risk,
    status: "PASS",
  };
  if (
    args.candidate.verdict === "PASS" &&
    liveBrowserBuyerPathMayRecommendCsvMutationV1(passDraft)
  ) {
    return passDraft;
  }

  let status: ModelFirstEvidenceRowStatusV1 = "UNKNOWN";
  if (args.candidate.facts.page_type === "product_pdp" && args.candidate.facts.capture_succeeded) {
    status = args.candidate.facts.exact_expected_token_present ? "UNKNOWN" : "FAIL";
  }
  if (!args.candidate.facts.capture_succeeded) status = "UNKNOWN";

  return {
    url,
    retailer_or_source: hostFromUrl(url),
    exact_token_proof,
    buyability_proof,
    wrong_family_risk,
    status,
  };
}

export function buildLiveBrowserEvidenceResultFromCollectorDraftV1(args: {
  draft: BrowserProofCollectorDraftV1;
  anchorFilterSlug: string;
  expectedToken: string;
  modelSlugs: string[];
  modelRows: ModelCsvRow[];
  filterName: string | null;
  seedUrls: readonly string[];
  discoveryTokens?: readonly string[];
  nowIso: string;
}): AirPurifierModelFirstLiveBrowserEvidenceResultV1 {
  const candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[] = [];
  const seenUrls = new Set<string>();
  for (const candidate of args.draft.candidates) {
    const mapped = mapCollectorCandidateToLiveBrowserBuyerPathV1({
      candidate,
      expectedToken: args.expectedToken,
    });
    if (!mapped) continue;
    if (seenUrls.has(mapped.url)) continue;
    seenUrls.add(mapped.url);
    candidate_buyer_paths.push(mapped);
  }

  const capturedOfficial = args.draft.candidates.filter(
    (c) =>
      c.facts.capture_succeeded &&
      c.facts.page_type !== "search_page" &&
      !isManufacturerSiteSearchUrl(c.facts.final_url || c.candidate_url),
  );

  const model_rows: ModelFirstLiveBrowserModelRowV1[] = args.modelSlugs.map((modelSlug) => {
    const model = args.modelRows.find((m) => m.slug === modelSlug);
    const modelNumber = model?.model_number?.trim() || null;
    const needles = modelNumberNeedles(modelSlug, modelNumber);
    const matching = capturedOfficial.filter((c) => {
      const blob = `${c.facts.title}\n${c.facts.h1}\n${c.facts.visible_text_snippet}\n${c.facts.final_url}`;
      return needles.some((n) => blobMentionsNeedle(blob, n));
    });
    const official_source_urls = [
      ...new Set(
        matching
          .map((c) => (c.facts.final_url || c.candidate_url).trim())
          .filter((u) => u.length > 0),
      ),
    ];
    const tokenOnMatching = matching.some((c) => c.facts.exact_expected_token_present);
    const evidence_status: ModelFirstEvidenceRowStatusV1 =
      official_source_urls.length > 0 && tokenOnMatching ? "PASS" : "UNKNOWN";
    const notes =
      evidence_status === "PASS"
        ? `PROVEN: Official captured page(s) mention ${modelNumber ?? modelSlug} and exact token ${args.expectedToken}.`
        : official_source_urls.length > 0
          ? `UNKNOWN: Official captured page(s) mention ${modelNumber ?? modelSlug} but exact catalog token ${args.expectedToken} was not visible. Filter-PDP capture alone does not authorize model-row PASS.`
          : `UNKNOWN: No captured official/model/support/PDP page in this run mentioned ${modelNumber ?? modelSlug}. Search URLs are omitted from candidate_buyer_paths.`;

    return {
      model_slug: modelSlug,
      model_number: modelNumber,
      official_source_urls,
      manual_urls: [],
      documented_filter_tokens: [args.expectedToken],
      evidence_status,
      buyer_path_status:
        evidence_status === "PASS"
          ? "OFFICIAL_PAGE_EXACT_TOKEN"
          : official_source_urls.length > 0
            ? "OFFICIAL_PAGE_NO_CATALOG_TOKEN"
            : "NO_OFFICIAL_UNIT_OR_FILTER_PAGE_MATCH",
      notes,
    };
  });

  const evidence_status_counts = countStatuses(model_rows);
  const safe_apply_authorized = evidence_status_counts.PASS > 0;
  const capturedCount = args.draft.candidates.filter((c) => c.facts.capture_succeeded).length;
  const source_status =
    capturedCount === 0 ? "UNKNOWN" : capturedOfficial.length > 0 ? "PARTIAL" : "PARTIAL";

  return {
    contract: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_CONTRACT_V1,
    report_name: AIR_PURIFIER_MODEL_FIRST_EVIDENCE_RESULT_REPORT_NAME_V1,
    packet_id: `ap-model-first-${args.anchorFilterSlug}-live-browser-v1`,
    run_id: `ap-model-first-${args.anchorFilterSlug}-live-browser-${args.nowIso.slice(0, 10)}`,
    queue_contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    anchor_filter_slug: args.anchorFilterSlug,
    filter_slug: args.anchorFilterSlug,
    read_only: true,
    data_mutation: false,
    generated_at: args.nowIso,
    checked_at: args.nowIso,
    source_status,
    evidence_collection_mode: "live_browser_model_first_v1",
    evidence_mode: "live_browser_model_first_v1",
    model_slugs_checked: model_rows.map((row) => row.model_slug),
    model_rows,
    candidate_buyer_paths,
    filter_first_cross_reference: null,
    evidence_status_counts,
    recommended_csv_mutation: null,
    safe_apply_authorized,
    proven_facts: [
      `PROVEN: Live-browser collector opened ${String(args.seedUrls.length)} first-party URL(s) for ${args.anchorFilterSlug} (no Jared --slug/--token/--url).`,
      `PROVEN: Discovery tokens used as search queries only (not fit/buy proof): ${
        (args.discoveryTokens ?? []).length > 0
          ? (args.discoveryTokens ?? []).join(", ")
          : "(none)"
      }. Catalog expected token remains ${args.expectedToken}.`,
      `PROVEN: Collector captured ${String(args.draft.candidates.length)} page(s); search URLs omitted from candidate_buyer_paths.`,
      `PROVEN: ${String(model_rows.length)} model row(s) checked; evidence_status_counts.PASS=${String(evidence_status_counts.PASS)}; safe_apply_authorized=${String(safe_apply_authorized)}.`,
      "PROVEN: recommended_csv_mutation=null; data_mutation=false; no CSV/Supabase/--apply.",
    ],
    inferred_facts: [],
    unknown_facts: [
      `UNKNOWN: Whether official pages document ${args.filterName ?? args.expectedToken} as the catalog token ${args.expectedToken} on each checked model.`,
      "UNKNOWN: Live purchase availability beyond signals captured on opened pages.",
    ],
  };
}

export async function writeCompletedCandidateLiveBrowserEvidenceIfGrantActiveV1(args: {
  rootDir: string;
  queue: ApModelFirstEvidenceQueueReportV1;
  now?: () => Date;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  runCollector?: typeof runBrowserProofCollectorBatchV1;
  writeResult?: boolean;
}): Promise<ModelFirstLiveBrowserWriteOutcomeV1> {
  const now = args.now ?? (() => new Date());
  const nowIso = now().toISOString();
  const readText = args.readText ?? defaultReadText;
  const fileExists = args.fileExists ?? defaultFileExists;
  const runCollector = args.runCollector ?? runBrowserProofCollectorBatchV1;
  const writeResult = args.writeResult !== false;

  const grant = loadRatifiedModelFirstEvidenceResultWriteGrantRowV1({
    rootDir: args.rootDir,
    nowIso,
    readText,
    fileExists,
  });
  if (!grant.active || !grant.row) {
    return emptyOutcome({
      blocked_reason: grant.blocked_reason ?? "grant_not_approved_or_inactive",
      allowed_next_scope: grant.row?.allowed_next_scope ?? null,
      queue_status: args.queue.queue_status,
    });
  }

  if (args.queue.queue_status !== "READY") {
    return emptyOutcome({
      blocked_reason: "queue_not_ready",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
    });
  }

  const selected = selectCompletedCandidateMissingLiveBrowserFileV1({
    queue: args.queue,
    rootDir: args.rootDir,
    fileExists,
  });
  if (!selected) {
    return emptyOutcome({
      blocked_reason: "no_completed_candidate_missing_live_browser",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
    });
  }

  const resultRel = modelFirstLiveBrowserResultRelPathV1(selected.filter_slug);
  if (!isAllowedModelFirstLiveBrowserEvidenceResultRelPathV1(resultRel)) {
    return emptyOutcome({
      blocked_reason: "live_browser_path_not_allowed",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: selected.filter_slug,
      result_rel: resultRel,
    });
  }

  const seeds = loadApModelFirstLiveBrowserSeedInputsV1({
    rootDir: args.rootDir,
    filterSlug: selected.filter_slug,
    readText,
    fileExists,
  });
  if (!seeds.ok) {
    return emptyOutcome({
      blocked_reason: seeds.blocked_reason,
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: selected.filter_slug,
      result_rel: resultRel,
    });
  }

  let draft: BrowserProofCollectorDraftV1;
  try {
    const collected = await runCollector({
      rootDir: args.rootDir,
      input: {
        slug: selected.filter_slug,
        expected_token: seeds.token,
        candidate_urls: seeds.seed_urls,
      },
      writeDrafts: false,
      collectAll: true,
      followSearchToProductLinks: true,
      followPreferTokens: seeds.discovery_tokens,
      now,
    });
    draft = collected.draft;
  } catch (err) {
    return emptyOutcome({
      blocked_reason: "collector_failed",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: selected.filter_slug,
      result_rel: resultRel,
      seed_urls: seeds.seed_urls,
      discovery_tokens: seeds.discovery_tokens,
      collector_error: err instanceof Error ? err.message : String(err),
    });
  }

  const allRepoModelSlugs = loadAllRepoModelSlugsForAnchorFilterV1(
    args.rootDir,
    selected.filter_slug,
    readText,
    fileExists,
  );
  const modelSlugs = allRepoModelSlugs.length > 0 ? allRepoModelSlugs : selected.sample_model_slugs;
  const modelRows = readCsv<ModelCsvRow>(
    args.rootDir,
    "data/air-purifier/models.csv",
    readText,
    fileExists,
  );

  const result = buildLiveBrowserEvidenceResultFromCollectorDraftV1({
    draft,
    anchorFilterSlug: selected.filter_slug,
    expectedToken: seeds.token,
    modelSlugs,
    modelRows,
    filterName: seeds.filter_name,
    seedUrls: seeds.seed_urls,
    discoveryTokens: seeds.discovery_tokens,
    nowIso,
  });

  if (!validateModelFirstEvidenceResultV1(result)) {
    return emptyOutcome({
      blocked_reason: "live_browser_validation_failed",
      grant_active: true,
      allowed_next_scope: grant.row.allowed_next_scope,
      queue_status: args.queue.queue_status,
      anchor_filter_slug: selected.filter_slug,
      result_rel: resultRel,
      seed_urls: seeds.seed_urls,
      discovery_tokens: seeds.discovery_tokens,
    });
  }

  if (writeResult) {
    const abs = path.join(args.rootDir, resultRel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  return {
    wrote: writeResult,
    blocked_reason: null,
    grant_active: true,
    grant_mutation_approval_active: false,
    allowed_next_scope: grant.row.allowed_next_scope,
    queue_status: args.queue.queue_status,
    anchor_filter_slug: selected.filter_slug,
    result_rel: resultRel,
    packets_written: false,
    data_mutation: false,
    seed_urls: seeds.seed_urls,
    discovery_tokens: seeds.discovery_tokens,
    collector_error: null,
    evidence_status_pass_count: result.evidence_status_counts.PASS,
  };
}
