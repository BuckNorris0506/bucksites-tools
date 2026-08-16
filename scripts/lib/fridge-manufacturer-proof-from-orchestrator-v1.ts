/**
 * Extend the existing browser-proof collector so a flagless run:
 * selects the next refresh-orchestrator slug, seeds manufacturer URLs from
 * committed repo truth, captures, then runs the existing owner-review bridge.
 *
 * Not a new queue, runtime, selector, or dashboard.
 * Never writes owner-browser-proof-result, never grants PASS_BROWSER_PROOF,
 * never mutates CSV / Supabase / retailer_links / public UI.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  isManufacturerSiteSearchUrl,
  isOemCatalogSlotKey,
  isSearchEngineDiscoveryUrl,
} from "@/lib/retailers/launch-buy-links";

import {
  BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1,
  resolveForbiddenTokensV1,
  runBrowserProofCollectorBatchV1,
  type BrowserProofCollectorDraftV1,
} from "./browser-proof-collector-v1";
import { runBrowserProofCollectorOwnerReviewBridgeV1 } from "./browser-proof-collector-owner-review-bridge-v1";
import {
  loadManufacturerBrowserProofRefreshOrchestratorReportV1,
  type ManufacturerBrowserProofRefreshOrchestratorReportV1,
  type ManufacturerBrowserProofRefreshWorkItemV1,
} from "./manufacturer-browser-proof-refresh-orchestrator-v1";

export const BROWSER_PROOF_COLLECTOR_EXACT_COMMAND_V1 =
  "npm run buckparts:browser-proof-collector" as const;

export const RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

export type ManufacturerProofDiscoveryPathV1 =
  | "orchestrator_target_url"
  | "retailer_links_oem_catalog"
  | "orchestrator_target_url+retailer_links_oem_catalog";

export type ManufacturerProofRefreshBlockedReasonV1 =
  | "orchestrator_artifact_missing"
  | "no_eligible_orchestrator_slug"
  | "no_committed_manufacturer_seed"
  | "collector_failed"
  | "owner_review_bridge_blocked";

export type ManufacturerProofRefreshSelectionV1 = {
  work_item: ManufacturerBrowserProofRefreshWorkItemV1;
  seed_urls: string[];
  discovery_path: ManufacturerProofDiscoveryPathV1;
  follow_search_to_product_links: boolean;
};

export type ManufacturerProofRefreshOutcomeV1 = {
  mode: "orchestrator_refresh";
  wrote: boolean;
  selected_slug: string | null;
  oem_part_token: string | null;
  discovery_path: ManufacturerProofDiscoveryPathV1 | null;
  seed_urls: string[];
  follow_search_to_product_links: boolean;
  collector_draft_rel: string | null;
  collector_overall_verdict: BrowserProofCollectorDraftV1["overall_verdict"] | null;
  owner_review_packet_rel: string | null;
  owner_acceptance_status: "PENDING_OWNER_ACCEPTANCE" | null;
  blocked_reason: ManufacturerProofRefreshBlockedReasonV1 | null;
  collector_error: string | null;
  bridge_error: string | null;
  promotes_to_owner_browser_proof_result: false;
  activates_owner_browser_proof_result: false;
  mutation_authorized: false;
  data_mutation: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
};

type RetailerLinkCsvRow = {
  filter_slug?: string;
  affiliate_url?: string;
  retailer_key?: string;
};


function emptyOutcome(
  partial: Partial<ManufacturerProofRefreshOutcomeV1> & {
    blocked_reason: ManufacturerProofRefreshBlockedReasonV1 | null;
  },
): ManufacturerProofRefreshOutcomeV1 {
  return {
    mode: "orchestrator_refresh",
    wrote: false,
    selected_slug: null,
    oem_part_token: null,
    discovery_path: null,
    seed_urls: [],
    follow_search_to_product_links: false,
    collector_draft_rel: null,
    collector_overall_verdict: null,
    owner_review_packet_rel: null,
    owner_acceptance_status: null,
    collector_error: null,
    bridge_error: null,
    promotes_to_owner_browser_proof_result: false,
    activates_owner_browser_proof_result: false,
    mutation_authorized: false,
    data_mutation: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    ...partial,
  };
}

export function isBrowserProofCollectorOrchestratorRefreshArgvV1(args: {
  slug: string | null;
  token: string | null;
  urls: readonly string[];
  urls_file: string | null;
}): boolean {
  return !args.slug && !args.token && args.urls.length === 0 && !args.urls_file;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Marketplace / SERP hosts are not manufacturer seeds. */
export function isBlockedNonManufacturerSeedUrlV1(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (isSearchEngineDiscoveryUrl(trimmed)) return true;
  const host = hostnameOf(trimmed);
  if (!host) return true;
  if (host === "amazon.com" || host.endsWith(".amazon.com")) return true;
  if (host === "ebay.com" || host.endsWith(".ebay.com")) return true;
  if (host === "walmart.com" || host.endsWith(".walmart.com")) return true;
  return false;
}

export function isCommittedManufacturerSeedUrlV1(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    new URL(trimmed);
  } catch {
    return false;
  }
  return !isBlockedNonManufacturerSeedUrlV1(trimmed);
}

export function listRefreshOrchestratorWorkItemsInOrderV1(
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1,
): ManufacturerBrowserProofRefreshWorkItemV1[] {
  return report.manufacturer_refresh_batches.flatMap((batch) => batch.work_items);
}

export function collectorSlugDraftDirRelV1(slug: string): string {
  return `${BROWSER_PROOF_COLLECTOR_DRAFT_DIR_REL_V1}/${slug.trim().toLowerCase()}`;
}

export function slugHasCollectorBatchDraftV1(args: {
  rootDir: string;
  slug: string;
  fileExists?: (abs: string) => boolean;
  readDir?: (abs: string) => string[];
}): boolean {
  const fileExists = args.fileExists ?? existsSync;
  const readDir = args.readDir ?? ((abs: string) => readdirSync(abs));
  const abs = path.join(args.rootDir, collectorSlugDraftDirRelV1(args.slug));
  if (!fileExists(abs)) return false;
  try {
    return readDir(abs).some((name) => name.startsWith("browser-proof-collector-batch-"));
  } catch {
    return false;
  }
}

export function slugHasOwnerReviewPacketV1(args: {
  rootDir: string;
  slug: string;
  fileExists?: (abs: string) => boolean;
  readDir?: (abs: string) => string[];
}): boolean {
  const fileExists = args.fileExists ?? existsSync;
  const readDir = args.readDir ?? ((abs: string) => readdirSync(abs));
  const abs = path.join(args.rootDir, collectorSlugDraftDirRelV1(args.slug));
  if (!fileExists(abs)) return false;
  try {
    return readDir(abs).some((name) =>
      name.startsWith("browser-proof-collector-owner-review-packet-"),
    );
  } catch {
    return false;
  }
}

export function loadOemCatalogSeedUrlsFromRetailerLinksV1(args: {
  rootDir: string;
  filterSlug: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, RETAILER_LINKS_CSV_REL_V1);
  if (!fileExists(abs)) return [];
  const rows = parse(readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RetailerLinkCsvRow[];
  const slug = args.filterSlug.trim().toLowerCase();
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if ((row.filter_slug ?? "").trim().toLowerCase() !== slug) continue;
    if (!isOemCatalogSlotKey(row.retailer_key)) continue;
    const url = (row.affiliate_url ?? "").trim();
    if (!isCommittedManufacturerSeedUrlV1(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function loadManufacturerSeedUrlsForWorkItemV1(args: {
  rootDir: string;
  workItem: ManufacturerBrowserProofRefreshWorkItemV1;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): { seed_urls: string[]; discovery_path: ManufacturerProofDiscoveryPathV1 | null } {
  const target = (args.workItem.target_url ?? "").trim();
  const fromOrchestrator = isCommittedManufacturerSeedUrlV1(target) ? [target] : [];
  const fromCsv = loadOemCatalogSeedUrlsFromRetailerLinksV1({
    rootDir: args.rootDir,
    filterSlug: args.workItem.filter_slug,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  const seen = new Set<string>();
  const seed_urls: string[] = [];
  for (const url of [...fromOrchestrator, ...fromCsv]) {
    if (seen.has(url)) continue;
    seen.add(url);
    seed_urls.push(url);
  }
  if (seed_urls.length === 0) return { seed_urls: [], discovery_path: null };
  const hasTarget = fromOrchestrator.length > 0;
  const hasCsv = fromCsv.length > 0;
  const discovery_path: ManufacturerProofDiscoveryPathV1 = hasTarget && hasCsv
    ? "orchestrator_target_url+retailer_links_oem_catalog"
    : hasTarget
      ? "orchestrator_target_url"
      : "retailer_links_oem_catalog";
  return { seed_urls, discovery_path };
}

export function selectNextManufacturerProofRefreshWorkItemV1(args: {
  rootDir: string;
  report: ManufacturerBrowserProofRefreshOrchestratorReportV1;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  readDir?: (abs: string) => string[];
}): ManufacturerProofRefreshSelectionV1 | null {
  const fs = {
    fileExists: args.fileExists ?? existsSync,
    readText: args.readText ?? ((abs: string) => readFileSync(abs, "utf8")),
    readDir: args.readDir ?? ((abs: string) => readdirSync(abs)),
  };
  for (const work_item of listRefreshOrchestratorWorkItemsInOrderV1(args.report)) {
    if (
      slugHasCollectorBatchDraftV1({
        rootDir: args.rootDir,
        slug: work_item.filter_slug,
        fileExists: fs.fileExists,
        readDir: fs.readDir,
      })
    ) {
      continue;
    }
    if (
      slugHasOwnerReviewPacketV1({
        rootDir: args.rootDir,
        slug: work_item.filter_slug,
        fileExists: fs.fileExists,
        readDir: fs.readDir,
      })
    ) {
      continue;
    }
    const seeds = loadManufacturerSeedUrlsForWorkItemV1({
      rootDir: args.rootDir,
      workItem: work_item,
      fileExists: fs.fileExists,
      readText: fs.readText,
    });
    if (!seeds.discovery_path || seeds.seed_urls.length === 0) continue;
    return {
      work_item,
      seed_urls: seeds.seed_urls,
      discovery_path: seeds.discovery_path,
      follow_search_to_product_links: seeds.seed_urls.some((url) =>
        isManufacturerSiteSearchUrl(url),
      ),
    };
  }
  return null;
}

export async function runFridgeManufacturerProofFromOrchestratorV1(args: {
  rootDir: string;
  writeDrafts?: boolean;
  headed?: boolean;
  wait_ms?: number;
  timeout_ms?: number;
  user_agent?: string | null;
  collectAll?: boolean;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  readDir?: (abs: string) => string[];
  runCollector?: typeof runBrowserProofCollectorBatchV1;
  runBridge?: typeof runBrowserProofCollectorOwnerReviewBridgeV1;
}): Promise<ManufacturerProofRefreshOutcomeV1> {
  const fs = {
    fileExists: args.fileExists ?? existsSync,
    readText: args.readText ?? ((abs: string) => readFileSync(abs, "utf8")),
    readDir: args.readDir ?? ((abs: string) => readdirSync(abs)),
  };
  const runCollector = args.runCollector ?? runBrowserProofCollectorBatchV1;
  const runBridge = args.runBridge ?? runBrowserProofCollectorOwnerReviewBridgeV1;

  const report = loadManufacturerBrowserProofRefreshOrchestratorReportV1({
    rootDir: args.rootDir,
    fileExists: fs.fileExists,
    readText: fs.readText,
  });
  if (!report) {
    return emptyOutcome({ blocked_reason: "orchestrator_artifact_missing" });
  }

  const selected = selectNextManufacturerProofRefreshWorkItemV1({
    rootDir: args.rootDir,
    report,
    fileExists: fs.fileExists,
    readText: fs.readText,
    readDir: fs.readDir,
  });
  if (!selected) {
    return emptyOutcome({ blocked_reason: "no_eligible_orchestrator_slug" });
  }

  const slug = selected.work_item.filter_slug;
  const token = selected.work_item.oem_part_token;
  const writeDrafts = args.writeDrafts !== false;

  let draft: BrowserProofCollectorDraftV1;
  let draft_json_rel: string | null;
  try {
    const result = await runCollector({
      rootDir: args.rootDir,
      input: {
        slug,
        expected_token: token,
        candidate_urls: selected.seed_urls,
        forbidden_tokens: resolveForbiddenTokensV1(slug),
      },
      writeDrafts,
      collectAll: args.collectAll === true,
      followSearchToProductLinks: selected.follow_search_to_product_links,
      followPreferTokens: [token],
      now: args.now,
      captureOptions: {
        headed: args.headed === true,
        wait_ms: args.wait_ms,
        timeout_ms: args.timeout_ms,
        user_agent: args.user_agent ?? undefined,
      },
    });
    draft = result.draft;
    draft_json_rel = result.draft_json_rel;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return emptyOutcome({
      blocked_reason: "collector_failed",
      selected_slug: slug,
      oem_part_token: token,
      discovery_path: selected.discovery_path,
      seed_urls: selected.seed_urls,
      follow_search_to_product_links: selected.follow_search_to_product_links,
      collector_error: message,
    });
  }

  const base = emptyOutcome({
    blocked_reason: null,
    wrote: Boolean(draft_json_rel),
    selected_slug: slug,
    oem_part_token: token,
    discovery_path: selected.discovery_path,
    seed_urls: selected.seed_urls,
    follow_search_to_product_links: selected.follow_search_to_product_links,
    collector_draft_rel: draft_json_rel,
    collector_overall_verdict: draft.overall_verdict,
  });

  if (draft.promotes_to_owner_browser_proof_result !== false) {
    return {
      ...base,
      blocked_reason: "collector_failed",
      collector_error: "promotes_to_owner_browser_proof_result_must_stay_false",
    };
  }

  if (draft.overall_verdict !== "PASS" || !draft_json_rel) {
    return {
      ...base,
      blocked_reason: draft.overall_verdict === "PASS" ? "owner_review_bridge_blocked" : null,
    };
  }

  try {
    const bridged = runBridge({
      rootDir: args.rootDir,
      collectorDraftRelPath: draft_json_rel,
      writePacket: writeDrafts,
      now: args.now,
      readText: fs.readText,
    });
    return {
      ...base,
      owner_review_packet_rel: bridged.packet_rel_path,
      owner_acceptance_status: bridged.packet.owner_acceptance_status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      blocked_reason: "owner_review_bridge_blocked",
      bridge_error: message,
    };
  }
}
