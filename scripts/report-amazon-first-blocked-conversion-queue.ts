import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { FRIGIDAIRE_DEAD_OEM_AFFILIATE_URLS } from "./report-frigidaire-dead-oem-link-ids";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import {
  mapSignalsToRetailerLinkState,
  RETAILER_LINK_STATES,
  type RetailerLinkState,
} from "@/lib/retailers/retailer-link-state";

const OEM_KEYS = new Set(["oem-catalog", "oem-parts-catalog"]);

const EXCLUDED_RESCUE_TOKENS = new Set(
  ["ADQ36006101", "DA29-00003G", "DA29-00019A", "DA29-00020A", "ADQ74793502"].map((t) =>
    t.toUpperCase(),
  ),
);

const FRIGIDAIRE_DEAD_URL_SET = new Set(
  FRIGIDAIRE_DEAD_OEM_AFFILIATE_URLS.map((u) => normalizeUrlForMatch(u)),
);

const LIVE_AMAZON_STATES: ReadonlySet<RetailerLinkState> = new Set([
  RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE,
  RETAILER_LINK_STATES.LIVE_LIKELY_VALID_NON_BUYABLE,
]);

export type AmazonFirstRecommendedNextAction =
  | "SEARCH_AMAZON_EXACT_TOKEN"
  | "HUMAN_BROWSER_VERIFICATION_REQUIRED"
  | "NOOP_ALREADY_HAS_LIVE_AMAZON"
  | "HOLD_AFFILIATE_NOT_READY"
  | "UNKNOWN_REVIEW_REQUIRED";

type RawRetailerLinkRow = {
  id: string | null;
  filter_id: string | null;
  retailer_key: string | null;
  affiliate_url: string | null;
  browser_truth_classification: string | null;
  is_primary: boolean | null;
};

type FilterRow = {
  id: string;
  slug: string | null;
  oem_part_number: string | null;
};

type BaseCandidate = {
  link_id: string;
  filter_id: string;
  filter_slug: string;
  retailer_key: string;
  blocked_url: string;
  token: string | "UNKNOWN";
  domain: string;
  domain_blocked_count: number;
};

export type AmazonFirstBlockedConversionCandidate = BaseCandidate & {
  current_live_amazon_slot_status: string | null;
  recommended_search_query: string;
  recommended_next_action: AmazonFirstRecommendedNextAction;
  evidence_unknown_committed?: true;
  evidence_unknown_file?: string;
  evidence_unknown_reason?: string;
};

export type AmazonFirstBlockedConversionQueueReport = {
  report_name: "buckparts_amazon_first_blocked_conversion_queue_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  selection_table: "retailer_links";
  total_pool_rows: number | "UNKNOWN";
  already_live_noop_count: number | "UNKNOWN";
  needs_amazon_search_count: number | "UNKNOWN";
  /** Rows with committed UNKNOWN evidence: still unresolved, not ordinary fresh exact-token search cohort. */
  unknown_evidence_deferred_count?: number;
  top_candidates: AmazonFirstBlockedConversionCandidate[] | "UNKNOWN";
  /** Full deferred cohort (not capped); may extend beyond `top_candidates` slice. */
  unknown_evidence_deferred?: AmazonFirstBlockedConversionCandidate[];
  known_unknowns: string[];
};

type TrackerRecord = {
  id?: string;
  status?: string;
  tagVerified?: boolean | null;
};

export type CommittedUnknownEvidenceMatch = {
  file: string;
  reason: string;
};

export type CommittedUnknownEvidenceIndex = {
  byToken: Map<string, CommittedUnknownEvidenceMatch>;
  byFilterId: Map<string, CommittedUnknownEvidenceMatch>;
};

type BuildInput = {
  links: RawRetailerLinkRow[];
  filters: FilterRow[];
  now: () => Date;
  amazonAffiliateReady: boolean;
  /** When omitted, loads `data/evidence/*unknown-outcome*.json` from cwd (sync). */
  committedUnknownIndex?: CommittedUnknownEvidenceIndex;
};

type BuildOptions = {
  now?: () => Date;
  fetchLinks?: () => Promise<RawRetailerLinkRow[]>;
  fetchFilters?: () => Promise<FilterRow[]>;
  readAffiliateTrackerText?: () => string;
};

const PAGE = 1000;
const TOP_LIMIT = 10;

function normalizeUrlForMatch(url: string): string {
  return url.trim();
}

function normalizeRetailerKey(key: string | null): string {
  return typeof key === "string" && key.trim().length > 0 ? key.trim().toLowerCase() : "";
}

function normalizeLinkId(id: string | null): string {
  return typeof id === "string" && id.trim().length > 0 ? id : "(missing_id)";
}

function normalizeUrl(url: string | null): string {
  return typeof url === "string" ? url : "";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "(invalid_url)";
  }
}

/** Mirrors OEM next-money cohort token extraction (query keys + trailing path segment). */
export function extractBlockedOemToken(url: string): string | "UNKNOWN" {
  try {
    const u = new URL(url);
    const queryEntries = Array.from(u.searchParams.entries());
    const queryKeys = ["q", "query", "searchterm", "searchkeyword", "keywords", "ntt"];
    for (const key of queryKeys) {
      const value = queryEntries.find(([k]) => k.toLowerCase() === key)?.[1];
      if (value && value.trim().length > 0) return value.trim().toUpperCase();
    }
    const pathToken = u.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => /^[a-z0-9-]{4,}$/i.test(segment))
      .at(-1);
    return pathToken ? pathToken.toUpperCase() : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function isFrigidaireDeadOemRow(affiliateUrl: string): boolean {
  return FRIGIDAIRE_DEAD_URL_SET.has(normalizeUrlForMatch(affiliateUrl));
}

function linkStateFromRow(row: RawRetailerLinkRow): RetailerLinkState {
  const affiliateUrl = normalizeUrl(row.affiliate_url);
  const gateFailureKind = buyLinkGateFailureKind({
    retailer_key: row.retailer_key,
    affiliate_url: affiliateUrl,
    browser_truth_classification: row.browser_truth_classification,
  });
  return mapSignalsToRetailerLinkState({
    browserTruthClassification: row.browser_truth_classification,
    gateFailureKind,
  });
}

function hasNoopLiveAmazonForFilter(args: {
  filterId: string;
  linksByFilterId: Map<string, RawRetailerLinkRow[]>;
}): boolean {
  const rows = args.linksByFilterId.get(args.filterId) ?? [];
  for (const row of rows) {
    if (normalizeRetailerKey(row.retailer_key) !== "amazon") continue;
    const affiliateUrl = normalizeUrl(row.affiliate_url);
    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: affiliateUrl,
      browser_truth_classification: row.browser_truth_classification,
    });
    if (gateFailureKind !== null) continue;
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    if (LIVE_AMAZON_STATES.has(state)) return true;
  }
  return false;
}

function amazonSlotStatusSummary(args: {
  filterId: string;
  linksByFilterId: Map<string, RawRetailerLinkRow[]>;
}): string | null {
  const rows = (args.linksByFilterId.get(args.filterId) ?? []).filter(
    (row) => normalizeRetailerKey(row.retailer_key) === "amazon",
  );
  if (rows.length === 0) return null;

  type Scored = { row: RawRetailerLinkRow; state: RetailerLinkState; gateOk: boolean };
  const scored: Scored[] = rows.map((row) => {
    const affiliateUrl = normalizeUrl(row.affiliate_url);
    const gateFailureKind = buyLinkGateFailureKind({
      retailer_key: row.retailer_key,
      affiliate_url: affiliateUrl,
      browser_truth_classification: row.browser_truth_classification,
    });
    const state = mapSignalsToRetailerLinkState({
      browserTruthClassification: row.browser_truth_classification,
      gateFailureKind,
    });
    return { row, state, gateOk: gateFailureKind === null };
  });

  const live = scored.filter((s) => s.gateOk && LIVE_AMAZON_STATES.has(s.state));
  const pick =
    live.find((s) => s.row.is_primary === true) ??
    live[0] ??
    scored.find((s) => s.gateOk) ??
    scored[0];
  if (!pick) return null;

  const primary = pick.row.is_primary === true ? ";is_primary=true" : "";
  return `${pick.state};gate_ok=${pick.gateOk}${primary}`;
}

function recommendedSearchQuery(filter: FilterRow | undefined, token: string | "UNKNOWN"): string {
  const oem = (filter?.oem_part_number ?? "").trim();
  if (oem.length > 0) return oem.toUpperCase();
  if (token === "UNKNOWN") return "";
  return token;
}

export function resolveRecommendedNextAction(args: {
  token: string | "UNKNOWN";
  noop: boolean;
  amazonAffiliateReady: boolean;
}): AmazonFirstRecommendedNextAction {
  if (args.noop) return "NOOP_ALREADY_HAS_LIVE_AMAZON";
  if (!args.amazonAffiliateReady) return "HOLD_AFFILIATE_NOT_READY";
  if (args.token === "UNKNOWN") return "UNKNOWN_REVIEW_REQUIRED";
  return "SEARCH_AMAZON_EXACT_TOKEN";
}

function actionSortPriority(action: AmazonFirstRecommendedNextAction): number {
  if (action === "SEARCH_AMAZON_EXACT_TOKEN") return 0;
  if (action === "UNKNOWN_REVIEW_REQUIRED") return 1;
  if (action === "HOLD_AFFILIATE_NOT_READY") return 2;
  if (action === "HUMAN_BROWSER_VERIFICATION_REQUIRED") return 3;
  return 99;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Load committed UNKNOWN outcome evidence files (basename contains `unknown-outcome`, case-insensitive).
 * Matches rows later by `filter_id` and/or uppercased `token` when verdict is UNKNOWN and mutation_ready is false.
 */
export function loadCommittedUnknownEvidenceIndex(evidenceDirAbs: string): CommittedUnknownEvidenceIndex {
  const byToken = new Map<string, CommittedUnknownEvidenceMatch>();
  const byFilterId = new Map<string, CommittedUnknownEvidenceMatch>();
  if (!existsSync(evidenceDirAbs)) return { byToken, byFilterId };
  let names: string[];
  try {
    names = readdirSync(evidenceDirAbs);
  } catch {
    return { byToken, byFilterId };
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    if (!name.toLowerCase().includes("unknown-outcome")) continue;
    const abs = path.join(evidenceDirAbs, name);
    let raw: string;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isJsonObject(parsed)) continue;
    if (parsed.verdict !== "UNKNOWN") continue;
    if (parsed.mutation_ready !== false) continue;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : typeof parsed.do_not_publish_reason === "string" && parsed.do_not_publish_reason.trim().length > 0
          ? parsed.do_not_publish_reason.trim()
          : "";
    const meta: CommittedUnknownEvidenceMatch = { file: name, reason };
    const tokenRaw = parsed.token;
    if (typeof tokenRaw === "string" && tokenRaw.trim().length > 0) {
      byToken.set(tokenRaw.trim().toUpperCase(), meta);
    }
    const filterIdRaw = parsed.filter_id;
    if (typeof filterIdRaw === "string" && filterIdRaw.trim().length > 0) {
      byFilterId.set(filterIdRaw.trim(), meta);
    }
  }
  return { byToken, byFilterId };
}

function readAmazonAffiliateReadyFromTrackerJson(text: string): boolean {
  try {
    const records = JSON.parse(text) as TrackerRecord[];
    if (!Array.isArray(records)) return false;
    const amazon = records.find((r) => r.id === "amazon-associates");
    if (!amazon) return false;
    const ok =
      typeof amazon.status === "string" && amazon.status.trim().toUpperCase() === "APPROVED";
    return ok && amazon.tagVerified === true;
  } catch {
    return false;
  }
}

export function buildAmazonFirstBlockedConversionQueueReportFromData(
  input: BuildInput,
): AmazonFirstBlockedConversionQueueReport {
  const unknownIndex =
    input.committedUnknownIndex ??
    loadCommittedUnknownEvidenceIndex(path.resolve(process.cwd(), "data/evidence"));

  const filterById = new Map<string, FilterRow>();
  for (const f of input.filters) {
    if (f.id) filterById.set(f.id, f);
  }

  const linksByFilterId = new Map<string, RawRetailerLinkRow[]>();
  for (const row of input.links) {
    if (!row.filter_id || typeof row.filter_id !== "string" || row.filter_id.trim() === "")
      continue;
    const fid = row.filter_id.trim();
    const list = linksByFilterId.get(fid);
    if (list) list.push(row);
    else linksByFilterId.set(fid, [row]);
  }

  const base: Omit<BaseCandidate, "domain_blocked_count">[] = [];
  for (const row of input.links) {
    const retailerKey = normalizeRetailerKey(row.retailer_key);
    if (!OEM_KEYS.has(retailerKey)) continue;
    const affiliateUrl = normalizeUrl(row.affiliate_url);
    if (!row.filter_id || row.filter_id.trim() === "") continue;

    const state = linkStateFromRow(row);
    if (state !== RETAILER_LINK_STATES.BLOCKED_SEARCH_OR_DISCOVERY) continue;
    if (isFrigidaireDeadOemRow(affiliateUrl)) continue;

    const token = extractBlockedOemToken(affiliateUrl);
    if (token !== "UNKNOWN" && EXCLUDED_RESCUE_TOKENS.has(token)) continue;

    const filter = filterById.get(row.filter_id.trim());
    const slug = (filter?.slug ?? "").trim() || "(missing_slug)";

    base.push({
      link_id: normalizeLinkId(row.id),
      filter_id: row.filter_id.trim(),
      filter_slug: slug,
      retailer_key: retailerKey,
      blocked_url: affiliateUrl,
      token,
      domain: extractDomain(affiliateUrl),
    });
  }

  const domainCounts = new Map<string, number>();
  for (const row of base) {
    domainCounts.set(row.domain, (domainCounts.get(row.domain) ?? 0) + 1);
  }

  const enriched: AmazonFirstBlockedConversionCandidate[] = base.map((row) => {
    const filter = filterById.get(row.filter_id);
    const noop = hasNoopLiveAmazonForFilter({
      filterId: row.filter_id,
      linksByFilterId,
    });
    let action = resolveRecommendedNextAction({
      token: row.token,
      noop,
      amazonAffiliateReady: input.amazonAffiliateReady,
    });
    let evidence_unknown_committed: true | undefined;
    let evidence_unknown_file: string | undefined;
    let evidence_unknown_reason: string | undefined;
    if (action === "SEARCH_AMAZON_EXACT_TOKEN") {
      const byFilter = unknownIndex.byFilterId.get(row.filter_id);
      const byTok = row.token !== "UNKNOWN" ? unknownIndex.byToken.get(row.token) : undefined;
      const ev = byFilter ?? byTok;
      if (ev) {
        action = "HUMAN_BROWSER_VERIFICATION_REQUIRED";
        evidence_unknown_committed = true;
        evidence_unknown_file = ev.file;
        if (ev.reason.length > 0) evidence_unknown_reason = ev.reason;
      }
    }
    const candidate: AmazonFirstBlockedConversionCandidate = {
      ...row,
      domain_blocked_count: domainCounts.get(row.domain) ?? 0,
      current_live_amazon_slot_status: amazonSlotStatusSummary({
        filterId: row.filter_id,
        linksByFilterId,
      }),
      recommended_search_query: recommendedSearchQuery(filter, row.token),
      recommended_next_action: action,
    };
    if (evidence_unknown_committed) {
      candidate.evidence_unknown_committed = true;
      candidate.evidence_unknown_file = evidence_unknown_file;
      if (evidence_unknown_reason) candidate.evidence_unknown_reason = evidence_unknown_reason;
    }
    return candidate;
  });

  const already_live_noop_count = enriched.filter(
    (r) => r.recommended_next_action === "NOOP_ALREADY_HAS_LIVE_AMAZON",
  ).length;
  const needs_amazon_search_count = enriched.filter(
    (r) => r.recommended_next_action === "SEARCH_AMAZON_EXACT_TOKEN",
  ).length;
  const unknown_evidence_deferred_count = enriched.filter(
    (r) => r.recommended_next_action === "HUMAN_BROWSER_VERIFICATION_REQUIRED",
  ).length;

  const actionable = enriched.filter(
    (r) => r.recommended_next_action !== "NOOP_ALREADY_HAS_LIVE_AMAZON",
  );
  actionable.sort((a, b) => {
    return (
      b.domain_blocked_count - a.domain_blocked_count ||
      actionSortPriority(a.recommended_next_action) -
        actionSortPriority(b.recommended_next_action) ||
      a.blocked_url.localeCompare(b.blocked_url)
    );
  });

  const unknown_evidence_deferred = actionable.filter(
    (r) => r.recommended_next_action === "HUMAN_BROWSER_VERIFICATION_REQUIRED",
  );

  return {
    report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
    generated_at: input.now().toISOString(),
    read_only: true,
    data_mutation: false,
    selection_table: "retailer_links",
    total_pool_rows: enriched.length,
    already_live_noop_count,
    needs_amazon_search_count,
    unknown_evidence_deferred_count,
    top_candidates: actionable.slice(0, TOP_LIMIT),
    unknown_evidence_deferred,
    known_unknowns: [],
  };
}

async function fetchRetailerLinksViaSupabase(): Promise<RawRetailerLinkRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const out: RawRetailerLinkRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("retailer_links")
      .select("id,filter_id,retailer_key,affiliate_url,browser_truth_classification,is_primary")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as RawRetailerLinkRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

async function fetchFiltersViaSupabase(): Promise<FilterRow[]> {
  loadEnv();
  const supabase = getSupabaseAdmin();
  const out: FilterRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("filters")
      .select("id,slug,oem_part_number")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as FilterRow[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

function defaultReadAffiliateTrackerText(): string {
  const p = path.resolve(process.cwd(), "data/affiliate/affiliate-application-tracker.json");
  return readFileSync(p, "utf8");
}

export async function buildAmazonFirstBlockedConversionQueueReport(
  options: BuildOptions = {},
): Promise<AmazonFirstBlockedConversionQueueReport> {
  const now = options.now ?? (() => new Date());
  const readTracker = options.readAffiliateTrackerText ?? defaultReadAffiliateTrackerText;
  try {
    const [links, filters] = await Promise.all([
      (options.fetchLinks ?? fetchRetailerLinksViaSupabase)(),
      (options.fetchFilters ?? fetchFiltersViaSupabase)(),
    ]);
    const amazonAffiliateReady = readAmazonAffiliateReadyFromTrackerJson(readTracker());
    return buildAmazonFirstBlockedConversionQueueReportFromData({
      links,
      filters,
      now,
      amazonAffiliateReady,
    });
  } catch {
    return {
      report_name: "buckparts_amazon_first_blocked_conversion_queue_v1",
      generated_at: now().toISOString(),
      read_only: true,
      data_mutation: false,
      selection_table: "retailer_links",
      total_pool_rows: "UNKNOWN",
      already_live_noop_count: "UNKNOWN",
      needs_amazon_search_count: "UNKNOWN",
      top_candidates: "UNKNOWN",
      known_unknowns: [
        "retailer_links/filters dataset or affiliate tracker unavailable; queue not derived.",
      ],
    };
  }
}

export async function main(): Promise<void> {
  const report = await buildAmazonFirstBlockedConversionQueueReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((error) => {
    console.error("[report-amazon-first-blocked-conversion-queue] failed", error);
    process.exit(1);
  });
}
