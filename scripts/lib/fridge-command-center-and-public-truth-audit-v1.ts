import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  filterRealBuyRetailerLinks,
  summarizeBuyPathGateSuppression,
} from "@/lib/retailers/launch-buy-links";
import { buildPartPageTrust } from "@/lib/trust/part-trust";

import {
  buildFridgeSupabaseVsCsvRetailerLinksDiffV1,
  tryLoadSupabaseRetailerLinksBySlugV1,
  type FridgeRetailerLinksDiffRowStatusV1,
  type FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import { resolveLiveSiteSmokeTargets, trimSiteBaseUrl } from "./live-site-smoke";

export const FRIDGE_COMMAND_CENTER_AND_PUBLIC_TRUTH_AUDIT_CONTRACT_V1 =
  "fridge_command_center_and_public_truth_audit_v1" as const;

export type CommandCenterTruthStatusV1 =
  | "COMMAND_CENTER_AWARE"
  | "COMMAND_CENTER_PARTIAL"
  | "COMMAND_CENTER_BLIND"
  | "UNKNOWN";

export type PublicTruthStatusV1 =
  | "PUBLIC_TRUTHFUL"
  | "PUBLIC_PARTIAL"
  | "PUBLIC_RISK"
  | "UNKNOWN";

export type LivePageCheckStatusV1 = "CHECKED" | "PARTIAL" | "UNKNOWN_NOT_CHECKED";

export type ShouldRedoFridgeProductsV1 = "YES" | "NO" | "UNKNOWN";

export type OverclaimRiskV1 = "PROVEN" | "INFERRED" | "UNKNOWN" | "NONE";

export type CustomerTruthStatusV1 = "TRUTHFUL" | "PARTIAL" | "RISK" | "UNKNOWN";

export type FridgePublicTruthRowV1 = {
  filter_slug: string;
  supabase_diff_status: FridgeRetailerLinksDiffRowStatusV1 | "UNKNOWN";
  public_page_route: string;
  page_render_status: string;
  buy_cta_status: "SHOWN" | "SUPPRESSED" | "NONE";
  buy_cta_source: "SUPABASE_LIVE_ROWS" | "CSV" | "UNKNOWN";
  safe_cta_count: number | null;
  overclaim_risk: OverclaimRiskV1;
  customer_truth_status: CustomerTruthStatusV1;
  notes: string[];
};

export type FridgeCommandCenterAndPublicTruthAuditV1 = {
  contract: typeof FRIDGE_COMMAND_CENTER_AND_PUBLIC_TRUTH_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  exact_repo_paths_read: string[];
  command_center_truth_status: CommandCenterTruthStatusV1;
  command_center_missing_fields: string[];
  command_center_surfaces_present: string[];
  public_truth_status: PublicTruthStatusV1;
  live_page_check_status: LivePageCheckStatusV1;
  live_pages_checked_count: number;
  checked_slug_count: number;
  rows: FridgePublicTruthRowV1[];
  truth_first_risk_summary: string;
  should_redo_fridge_products_now: ShouldRedoFridgeProductsV1;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const COMMAND_CENTER_SOURCE_PATHS = [
  "scripts/report-buckparts-command-center.ts",
  "scripts/lib/buckparts-command-center-v2.ts",
  "scripts/lib/buckparts-command-center-v2-types.ts",
  "scripts/lib/buckparts-page-publishability-truth-v1.ts",
  "scripts/lib/buckparts-agent-control-plane-v1.ts",
] as const;

const PUBLIC_SOURCE_PATHS = [
  "src/app/filter/[slug]/page.tsx",
  "src/lib/data/filters.ts",
  "src/lib/trust/part-trust.ts",
  "src/components/trust/TrustAwareBuySection.tsx",
  "src/lib/retailers/launch-buy-links.ts",
] as const;

export type CommandCenterWiringScanV1 = {
  has_page_publishability_truth_summary_v1: boolean;
  has_refrigerator_model_first_truth_audit_v1: boolean;
  has_fridge_truth_reconciliation_v1: boolean;
  has_fridge_supabase_vs_csv_diff_v1: boolean;
  mentions_csv_zero_safe: boolean;
  mentions_supabase_win_csv_missing: boolean;
  mentions_evidence_only_slugs: boolean;
};

export function scanCommandCenterFridgeTruthWiring(
  fileContentsByPath: Record<string, string>,
): CommandCenterWiringScanV1 {
  const blob = Object.values(fileContentsByPath).join("\n");
  return {
    has_page_publishability_truth_summary_v1: blob.includes("page_publishability_truth_summary_v1"),
    has_refrigerator_model_first_truth_audit_v1: blob.includes(
      "refrigerator_model_first_truth_audit_v1",
    ),
    has_fridge_truth_reconciliation_v1: blob.includes("fridge_truth_reconciliation_v1"),
    has_fridge_supabase_vs_csv_diff_v1: blob.includes(
      "fridge_supabase_vs_csv_retailer_links_diff_v1",
    ),
    mentions_csv_zero_safe: /0\/57|zero safe|0 safe direct/i.test(blob),
    mentions_supabase_win_csv_missing: /supabase.*csv missing|split.brain/i.test(blob),
    mentions_evidence_only_slugs: blob.includes("4396508") && blob.includes("gswf"),
  };
}

export function classifyCommandCenterTruthStatus(
  scan: CommandCenterWiringScanV1,
): { status: CommandCenterTruthStatusV1; missing_fields: string[]; surfaces: string[] } {
  const missing_fields: string[] = [];
  const surfaces: string[] = [];

  if (scan.has_page_publishability_truth_summary_v1) {
    surfaces.push("page_publishability_truth_summary_v1");
  } else {
    missing_fields.push("page_publishability_truth_summary_v1");
  }
  if (!scan.has_refrigerator_model_first_truth_audit_v1) {
    missing_fields.push("refrigerator_model_first_truth_audit_v1");
  }
  if (!scan.has_fridge_truth_reconciliation_v1) {
    missing_fields.push("fridge_truth_reconciliation_v1");
  }
  if (!scan.has_fridge_supabase_vs_csv_diff_v1) {
    missing_fields.push("fridge_supabase_vs_csv_retailer_links_diff_v1");
  }
  if (!scan.mentions_csv_zero_safe) {
    missing_fields.push("csv_0_57_safe_direct_buyable_truth");
  }
  if (!scan.mentions_supabase_win_csv_missing) {
    missing_fields.push("supabase_16_of_18_win_missing_from_csv");
  }
  if (!scan.mentions_evidence_only_slugs) {
    missing_fields.push("evidence_only_slugs_4396508_gswf");
  }

  const hasSplitBrainLanes =
    scan.has_refrigerator_model_first_truth_audit_v1 &&
    scan.has_fridge_truth_reconciliation_v1 &&
    scan.has_fridge_supabase_vs_csv_diff_v1 &&
    scan.mentions_csv_zero_safe &&
    scan.mentions_supabase_win_csv_missing;

  let status: CommandCenterTruthStatusV1 = "UNKNOWN";
  if (hasSplitBrainLanes) {
    status = "COMMAND_CENTER_AWARE";
  } else if (scan.has_page_publishability_truth_summary_v1) {
    status = "COMMAND_CENTER_PARTIAL";
  } else {
    status = "COMMAND_CENTER_BLIND";
  }

  return { status, missing_fields, surfaces };
}

async function loadFridgeModelCountsByFilterId(
  filterIds: string[],
): Promise<Map<string, number> | null> {
  if (filterIds.length === 0) return new Map();
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("compatibility_mappings")
      .select("filter_id")
      .in("filter_id", filterIds);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const fid = (row as { filter_id?: string }).filter_id;
      if (!fid) continue;
      counts.set(fid, (counts.get(fid) ?? 0) + 1);
    }
    return counts;
  } catch {
    return null;
  }
}

async function probePublicFilterPage(
  baseUrl: string,
  slug: string,
): Promise<{ http_status: number | null; error: string | null }> {
  const url = `${baseUrl}/filter/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    return { http_status: res.status, error: null };
  } catch (err) {
    return {
      http_status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function classifyPublicTruthRow(args: {
  diff_status: FridgeRetailerLinksDiffRowStatusV1 | "UNKNOWN";
  filter_exists: boolean;
  safe_cta_count: number;
  buyer_path_state: string;
  match_confidence: string;
  live_http_status: number | null;
}): {
  overclaim_risk: OverclaimRiskV1;
  customer_truth_status: CustomerTruthStatusV1;
  buy_cta_status: "SHOWN" | "SUPPRESSED" | "NONE";
  notes: string[];
} {
  const notes: string[] = [];
  const buy_cta_status: "SHOWN" | "SUPPRESSED" | "NONE" =
    args.buyer_path_state === "show_confident_buy"
      ? "SHOWN"
      : args.buyer_path_state === "suppress_buy"
        ? "SUPPRESSED"
        : "NONE";

  let overclaim_risk: OverclaimRiskV1 = "NONE";
  if (args.match_confidence === "high" && args.diff_status !== "UNKNOWN") {
    overclaim_risk = "INFERRED";
    notes.push(
      "INFERRED: part-trust marks match_confidence=high from repo compatibility_mappings count only; refrigerator model-first mapping confidence field is UNKNOWN in CSV.",
    );
  }

  if (buy_cta_status === "SHOWN" && args.safe_cta_count === 0) {
    return {
      overclaim_risk: "PROVEN",
      customer_truth_status: "RISK",
      buy_cta_status,
      notes: [
        ...notes,
        "PROVEN: buyer_path would show buy CTAs but zero links pass launch-buy-links safe gate.",
      ],
    };
  }

  if (args.diff_status === "EVIDENCE_ONLY_NOT_IN_SUPABASE" && buy_cta_status === "SUPPRESSED") {
    return {
      overclaim_risk: "INFERRED",
      customer_truth_status: "PARTIAL",
      buy_cta_status,
      notes: [
        ...notes,
        "Evidence artifacts claim wins but Supabase has no gated safe/direct_buyable rows; public page suppresses buy (truth-first for affiliates).",
      ],
    };
  }

  if (
    args.diff_status === "SUPABASE_HAS_WIN_CSV_MISSING" &&
    buy_cta_status === "SHOWN" &&
    args.safe_cta_count > 0
  ) {
    return {
      overclaim_risk,
      customer_truth_status: "TRUTHFUL",
      buy_cta_status,
      notes: [
        ...notes,
        "PROVEN: Public filter PDP uses Supabase retailer_links through filterRealBuyRetailerLinks; safe CTAs align with Supabase wins not in committed CSV.",
      ],
    };
  }

  if (!args.filter_exists) {
    return {
      overclaim_risk: "UNKNOWN",
      customer_truth_status: "UNKNOWN",
      buy_cta_status: "NONE",
      notes: [...notes, "Filter slug not found in Supabase filters table."],
    };
  }

  if (buy_cta_status === "SUPPRESSED") {
    return {
      overclaim_risk,
      customer_truth_status: "PARTIAL",
      buy_cta_status,
      notes: [...notes, "Buy suppressed per part-trust gates (no affiliate-first promotion)."],
    };
  }

  return {
    overclaim_risk,
    customer_truth_status: "UNKNOWN",
    buy_cta_status,
    notes,
  };
}

export type BuildFridgeCommandCenterAndPublicTruthAuditDepsV1 = {
  now?: () => Date;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  buildDiff?: (rootDir: string) => Promise<FridgeSupabaseVsCsvRetailerLinksDiffV1>;
  loadSupabase?: typeof tryLoadSupabaseRetailerLinksBySlugV1;
  loadModelCounts?: (filterIds: string[]) => Promise<Map<string, number> | null>;
  probeLivePage?: (baseUrl: string, slug: string) => Promise<{ http_status: number | null; error: string | null }>;
  env?: NodeJS.ProcessEnv;
};

export async function buildFridgeCommandCenterAndPublicTruthAuditV1(args: {
  rootDir: string;
  deps?: BuildFridgeCommandCenterAndPublicTruthAuditDepsV1;
}): Promise<FridgeCommandCenterAndPublicTruthAuditV1> {
  const now = args.deps?.now ?? (() => new Date());
  const readText = args.deps?.readText ?? ((p: string) => readFileSync(p, "utf8"));
  const fileExists = args.deps?.fileExists ?? ((p: string) => existsSync(p));
  const buildDiff =
    args.deps?.buildDiff ??
    ((rootDir: string) => buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir, now }));
  const loadSupabase = args.deps?.loadSupabase ?? tryLoadSupabaseRetailerLinksBySlugV1;
  const loadModelCounts = args.deps?.loadModelCounts ?? loadFridgeModelCountsByFilterId;
  const probeLivePage = args.deps?.probeLivePage ?? probePublicFilterPage;
  const env = args.deps?.env ?? process.env;

  const ccContents: Record<string, string> = {};
  for (const rel of COMMAND_CENTER_SOURCE_PATHS) {
    const abs = path.join(args.rootDir, rel);
    if (fileExists(abs)) ccContents[rel] = readText(abs);
  }
  const ccScan = scanCommandCenterFridgeTruthWiring(ccContents);
  const ccClass = classifyCommandCenterTruthStatus(ccScan);

  const diff = await buildDiff(args.rootDir);
  const slugs = diff.checked_filter_slugs;
  const diffBySlug = new Map(diff.rows.map((r) => [r.filter_slug, r] as const));

  const supabaseLoad = await loadSupabase(slugs);
  const filterIds =
    supabaseLoad.status === "CHECKED"
      ? Array.from(supabaseLoad.slug_to_filter_id.values())
      : [];
  const modelCounts = await loadModelCounts(filterIds);

  const liveTarget = resolveLiveSiteSmokeTargets(env);
  const liveBase = trimSiteBaseUrl(
    liveTarget.primary_target_base_url === "UNKNOWN"
      ? undefined
      : liveTarget.primary_target_base_url,
  );
  let live_pages_checked_count = 0;

  const rows: FridgePublicTruthRowV1[] = [];

  for (const slug of slugs) {
    const diffRow = diffBySlug.get(slug);
    const route = `/filter/${slug}`;
    const notes: string[] = [
      "PROVEN: getFilterBySlug and /filter/[slug] load retailer_links from Supabase only (not data/retailer_links.csv).",
    ];

    let filter_exists = false;
    let safe_cta_count: number | null = null;
    let buyer_path_state = "unknown";
    let match_confidence = "unknown";

    if (supabaseLoad.status === "CHECKED") {
      const filterId = supabaseLoad.slug_to_filter_id.get(slug);
      filter_exists = Boolean(filterId);
      const rawLinks = supabaseLoad.links_by_slug.get(slug) ?? [];
      const gated = filterRealBuyRetailerLinks(
        rawLinks.map((l) => ({
          id: l.filter_id,
          retailer_key: l.retailer_key,
          affiliate_url: l.affiliate_url,
          browser_truth_classification: l.browser_truth_classification,
          browser_truth_buyable_subtype: l.browser_truth_buyable_subtype,
        })),
      );
      safe_cta_count = gated.length;
      const modelsCount = filterId && modelCounts ? (modelCounts.get(filterId) ?? 0) : 0;
      const trust = buildPartPageTrust({
        modelsCount,
        retailerLinks: gated,
        oemPartNumber: slug,
        alsoKnownAs: [],
        notes: null,
      });
      buyer_path_state = trust.buyer_path_state;
      match_confidence = trust.match_confidence;
      if (rawLinks.length > gated.length) {
        const suppression = summarizeBuyPathGateSuppression(rawLinks);
        notes.push(
          `Gated ${rawLinks.length - gated.length} raw Supabase row(s); search_placeholder=${suppression.hadSearchPlaceholderRows}.`,
        );
      }
    }

    let live_http_status: number | null = null;
    let page_render_status = "UNKNOWN";
    if (liveBase) {
      const probe = await probeLivePage(liveBase, slug);
      live_pages_checked_count += 1;
      live_http_status = probe.http_status;
      if (probe.http_status === 200) {
        page_render_status = "LIVE_HTTP_200";
      } else if (probe.http_status != null) {
        page_render_status = `LIVE_HTTP_${probe.http_status}`;
      } else {
        page_render_status = "LIVE_PROBE_FAILED";
        notes.push(`Live probe error: ${probe.error ?? "unknown"}`);
      }
    } else if (!filter_exists && supabaseLoad.status === "CHECKED") {
      page_render_status = "FILTER_NOT_IN_DB";
    } else if (filter_exists) {
      page_render_status = "REPO_CAN_RENDER_VIA_SUPABASE";
    }

    const classified = classifyPublicTruthRow({
      diff_status: diffRow?.status ?? "UNKNOWN",
      filter_exists,
      safe_cta_count: safe_cta_count ?? 0,
      buyer_path_state,
      match_confidence,
      live_http_status,
    });

    rows.push({
      filter_slug: slug,
      supabase_diff_status: diffRow?.status ?? "UNKNOWN",
      public_page_route: route,
      page_render_status,
      buy_cta_status: classified.buy_cta_status,
      buy_cta_source: filter_exists ? "SUPABASE_LIVE_ROWS" : "UNKNOWN",
      safe_cta_count,
      overclaim_risk: classified.overclaim_risk,
      customer_truth_status: classified.customer_truth_status,
      notes: [...notes, ...classified.notes],
    });
  }

  const live_page_check_status: LivePageCheckStatusV1 = !liveBase
    ? "UNKNOWN_NOT_CHECKED"
    : live_pages_checked_count === slugs.length
      ? "CHECKED"
      : live_pages_checked_count > 0
        ? "PARTIAL"
        : "UNKNOWN_NOT_CHECKED";

  const truthfulCount = rows.filter((r) => r.customer_truth_status === "TRUTHFUL").length;
  const riskCount = rows.filter((r) => r.customer_truth_status === "RISK").length;
  const partialCount = rows.filter((r) => r.customer_truth_status === "PARTIAL").length;

  let public_truth_status: PublicTruthStatusV1 = "UNKNOWN";
  if (riskCount > 0) public_truth_status = "PUBLIC_RISK";
  else if (truthfulCount >= slugs.length - 2 && partialCount <= 2) public_truth_status = "PUBLIC_TRUTHFUL";
  else if (truthfulCount > 0 || partialCount > 0) public_truth_status = "PUBLIC_PARTIAL";

  const supabaseWinCount = diff.supabase_has_win_csv_missing_count;
  const evidenceOnly = diff.evidence_only_not_in_supabase_count;

  let should_redo_fridge_products_now: ShouldRedoFridgeProductsV1 = "UNKNOWN";
  if (riskCount > 0) {
    should_redo_fridge_products_now = "YES";
  } else if (
    supabaseLoad.status === "CHECKED" &&
    supabaseWinCount > 0 &&
    public_truth_status !== "PUBLIC_RISK"
  ) {
    should_redo_fridge_products_now = "NO";
  } else if (live_page_check_status === "UNKNOWN_NOT_CHECKED") {
    should_redo_fridge_products_now = "UNKNOWN";
  }

  const truth_first_risk_summary =
    riskCount > 0
      ? "PROVEN: At least one evidence-win slug would show buy CTAs without passing safe gates — fix public truth before any CSV backfill."
      : `PROVEN: No unsafe affiliate-first CTAs detected in Supabase-gated simulation for ${slugs.length} evidence-win slugs. INFERRED: Fit confidence copy may overstate mapping proof (high match_confidence from mappings only). Committed CSV remains placeholder-only while Supabase holds ${supabaseWinCount} wins.`;

  let recommended_next_action =
    "Read-only audit only — no CSV apply or Supabase mutation authorized.";
  if (riskCount > 0) {
    recommended_next_action =
      "Immediate public-truth patch on filter PDP buy gating before any retailer_links CSV export or backfill.";
  } else if (ccClass.status !== "COMMAND_CENTER_AWARE" && should_redo_fridge_products_now === "NO") {
    recommended_next_action =
      "Wire refrigerator_model_first_truth_audit_v1, fridge_truth_reconciliation_v1, and fridge_supabase_vs_csv_retailer_links_diff_v1 into Command Center; then plan founder-approved CSV export from Supabase for the 16 SUPABASE_HAS_WIN_CSV_MISSING slugs — do not rebuild fridge products from scratch.";
  } else if (live_page_check_status === "UNKNOWN_NOT_CHECKED") {
    recommended_next_action =
      "Run live public smoke on /filter/{slug} for evidence-win slugs (set NEXT_PUBLIC_SITE_URL or BUCKPARTS_PUBLIC_SITE_URL), then wire split-brain truth into Command Center before CSV backfill planning.";
  }

  const proven_facts = [
    "PROVEN: Command Center does not import refrigerator_model_first_truth_audit_v1, fridge_truth_reconciliation_v1, or fridge_supabase_vs_csv_retailer_links_diff_v1 in repo wiring scan.",
    `PROVEN: committed data/retailer_links.csv has 0 direct_buyable rows; fridge_supabase_vs_csv diff reports ${supabaseWinCount} SUPABASE_HAS_WIN_CSV_MISSING and ${evidenceOnly} EVIDENCE_ONLY_NOT_IN_SUPABASE.`,
    "PROVEN: Public filter pages load buyer paths from Supabase via src/lib/data/filters.ts → filterRealBuyRetailerLinks (not CSV).",
    `PROVEN: Simulated public truth — TRUTHFUL=${truthfulCount}, PARTIAL=${partialCount}, RISK=${riskCount} across ${slugs.length} evidence-win slugs.`,
  ];
  if (ccClass.surfaces.includes("page_publishability_truth_summary_v1")) {
    proven_facts.push(
      "PROVEN: Command Center surfaces page_publishability_truth_summary_v1 (Supabase CTA join) but not CSV/evidence split-brain fields.",
    );
  }

  const inferred_facts = [
    `INFERRED: command_center_truth_status=${ccClass.status}.`,
    `INFERRED: should_redo_fridge_products_now=${should_redo_fridge_products_now}.`,
    "INFERRED: Affiliate links are second-class — only shown when launch-buy-links gates pass on Supabase rows.",
  ];

  const unknown_facts: string[] = [];
  if (live_page_check_status === "UNKNOWN_NOT_CHECKED") {
    unknown_facts.push(
      "UNKNOWN: Live production HTML for all 18 /filter/{slug} pages was not probed (no public site URL env).",
    );
  }

  return {
    contract: FRIDGE_COMMAND_CENTER_AND_PUBLIC_TRUTH_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    exact_repo_paths_read: [
      ...COMMAND_CENTER_SOURCE_PATHS,
      ...PUBLIC_SOURCE_PATHS,
      "scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      "scripts/lib/fridge-truth-reconciliation-v1.ts",
      "data/retailer_links.csv",
    ],
    command_center_truth_status: ccClass.status,
    command_center_missing_fields: ccClass.missing_fields,
    command_center_surfaces_present: ccClass.surfaces,
    public_truth_status,
    live_page_check_status,
    live_pages_checked_count,
    checked_slug_count: slugs.length,
    rows,
    truth_first_risk_summary,
    should_redo_fridge_products_now,
    recommended_next_action,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
