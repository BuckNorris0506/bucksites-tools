import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import {
  buildFridgeTruthReconciliationV1,
  type FridgeTruthReconciliationV1,
} from "./fridge-truth-reconciliation-v1";

export const FRIDGE_SUPABASE_VS_CSV_RETAILER_LINKS_DIFF_CONTRACT_V1 =
  "fridge_supabase_vs_csv_retailer_links_diff_v1" as const;

export type SupabaseTruthStatusV1 = "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";

export type FridgeRetailerLinksDiffRowStatusV1 =
  | "CSV_AND_SUPABASE_MATCH_PLACEHOLDER"
  | "SUPABASE_HAS_WIN_CSV_MISSING"
  | "CSV_HAS_WIN_SUPABASE_MISSING"
  | "EVIDENCE_ONLY_NOT_IN_SUPABASE"
  | "UNKNOWN";

export type FridgeRetailerLinksDiffRowV1 = {
  filter_slug: string;
  csv_has_direct_buyable: boolean;
  csv_primary_url: string | null;
  csv_primary_retailer: string | null;
  supabase_row_count: number | null;
  supabase_direct_buyable_count: number | null;
  supabase_safe_cta_count: number | null;
  supabase_primary_url: string | null;
  evidence_win_artifacts: string[];
  status: FridgeRetailerLinksDiffRowStatusV1;
};

export type FridgeSupabaseVsCsvRetailerLinksDiffV1 = {
  contract: typeof FRIDGE_SUPABASE_VS_CSV_RETAILER_LINKS_DIFF_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  exact_repo_paths_read: string[];
  reconciliation_source_contract: string;
  checked_slug_count: number;
  checked_filter_slugs: string[];
  supabase_truth_status: SupabaseTruthStatusV1;
  supabase_unavailable_reason: string | null;
  supabase_has_win_csv_missing_count: number;
  evidence_only_not_in_supabase_count: number;
  csv_and_supabase_match_placeholder_count: number;
  csv_has_win_supabase_missing_count: number;
  unknown_status_count: number;
  recommended_next_action: string;
  rows: FridgeRetailerLinksDiffRowV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type CsvRetailerLinkSliceV1 = {
  rows: Array<{
    filter_slug: string;
    retailer_key?: string;
    affiliate_url: string;
    is_primary?: string;
    browser_truth_classification?: string;
    browser_truth_buyable_subtype?: string;
  }>;
};

export type SupabaseRetailerLinkRowV1 = {
  filter_id: string;
  retailer_key?: string | null;
  affiliate_url: string;
  is_primary?: boolean | null;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

export type SupabaseLinksBySlugResultV1 =
  | {
      status: "CHECKED";
      slug_to_filter_id: Map<string, string>;
      links_by_slug: Map<string, SupabaseRetailerLinkRowV1[]>;
    }
  | {
      status: "UNKNOWN_DB_UNAVAILABLE";
      reason: string;
    };

type RetailerCsvRow = {
  filter_slug: string;
  retailer_key?: string;
  affiliate_url: string;
  is_primary?: string;
  browser_truth_classification?: string;
  browser_truth_buyable_subtype?: string;
};

function normalizeSlug(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v.length > 0 ? v : null;
}

function isTruthyPrimary(value: string | undefined): boolean {
  const n = (value ?? "").trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

function isTruthyPrimaryDb(value: boolean | null | undefined): boolean {
  return value === true;
}

export function targetEvidenceWinSlugsFromReconciliation(
  reconciliation: FridgeTruthReconciliationV1,
): string[] {
  const slugs = new Set(reconciliation.slugs_with_evidence_win_but_csv_placeholder);
  for (const row of reconciliation.suspected_unapplied_evidence_rows) {
    slugs.add(row.filter_slug);
  }
  return Array.from(slugs).sort();
}

export function evidenceWinArtifactsBySlug(
  reconciliation: FridgeTruthReconciliationV1,
): Map<string, string[]> {
  const bySlug = new Map<string, string[]>();
  for (const artifact of reconciliation.evidence_truth_summary.win_artifacts) {
    const slug = normalizeSlug(artifact.filter_slug);
    if (!slug) continue;
    const list = bySlug.get(slug) ?? [];
    list.push(artifact.evidence_file);
    bySlug.set(slug, list);
  }
  return bySlug;
}

export function readCsvRetailerLinksForSlugs(
  rootDir: string,
  slugs: Set<string>,
): Map<string, RetailerCsvRow[]> {
  const links = parse(readFileSync(path.join(rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RetailerCsvRow[];

  const bySlug = new Map<string, RetailerCsvRow[]>();
  for (const row of links) {
    const slug = normalizeSlug(row.filter_slug);
    if (!slug || !slugs.has(slug)) continue;
    const list = bySlug.get(slug) ?? [];
    list.push(row);
    bySlug.set(slug, list);
  }
  return bySlug;
}

function primaryCsvRow(rows: RetailerCsvRow[]): RetailerCsvRow | null {
  if (rows.length === 0) return null;
  return rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0] ?? null;
}

function primarySupabaseRow(rows: SupabaseRetailerLinkRowV1[]): SupabaseRetailerLinkRowV1 | null {
  if (rows.length === 0) return null;
  return rows.find((r) => isTruthyPrimaryDb(r.is_primary)) ?? rows[0] ?? null;
}

function summarizeCsvSlug(rows: RetailerCsvRow[]): {
  csv_has_direct_buyable: boolean;
  csv_primary_url: string | null;
  csv_primary_retailer: string | null;
  csv_primary_is_placeholder: boolean;
} {
  const primary = primaryCsvRow(rows);
  const csv_has_direct_buyable = rows.some(
    (r) => (r.browser_truth_classification ?? "").trim() === "direct_buyable",
  );
  const url = (primary?.affiliate_url ?? "").trim();
  const csv_primary_is_placeholder =
    !csv_has_direct_buyable &&
    (url.includes("Search?") || url.includes("searchKeyword") || url.includes("catalog.jsp"));
  return {
    csv_has_direct_buyable,
    csv_primary_url: url.length > 0 ? url : null,
    csv_primary_retailer: (primary?.retailer_key ?? "").trim() || null,
    csv_primary_is_placeholder,
  };
}

function summarizeSupabaseSlug(rows: SupabaseRetailerLinkRowV1[]): {
  supabase_row_count: number;
  supabase_direct_buyable_count: number;
  supabase_safe_cta_count: number;
  supabase_primary_url: string | null;
  supabase_has_direct_buyable: boolean;
} {
  let supabase_direct_buyable_count = 0;
  let supabase_safe_cta_count = 0;
  for (const link of rows) {
    if ((link.browser_truth_classification ?? "").trim() === "direct_buyable") {
      supabase_direct_buyable_count += 1;
    }
    if (
      buyLinkGateFailureKind({
        retailer_key: link.retailer_key,
        affiliate_url: link.affiliate_url ?? "",
        browser_truth_classification: link.browser_truth_classification,
        browser_truth_buyable_subtype: link.browser_truth_buyable_subtype,
      }) === null
    ) {
      supabase_safe_cta_count += 1;
    }
  }
  const primary = primarySupabaseRow(rows);
  const supabase_primary_url = (primary?.affiliate_url ?? "").trim() || null;
  return {
    supabase_row_count: rows.length,
    supabase_direct_buyable_count,
    supabase_safe_cta_count,
    supabase_primary_url,
    supabase_has_direct_buyable: supabase_direct_buyable_count > 0,
  };
}

export function classifyDiffRowStatus(args: {
  csv_has_direct_buyable: boolean;
  csv_primary_is_placeholder: boolean;
  supabase_checked: boolean;
  supabase_has_direct_buyable: boolean;
  evidence_win_artifacts: string[];
}): FridgeRetailerLinksDiffRowStatusV1 {
  if (!args.supabase_checked) return "UNKNOWN";
  if (args.csv_has_direct_buyable && !args.supabase_has_direct_buyable) {
    return "CSV_HAS_WIN_SUPABASE_MISSING";
  }
  if (!args.csv_has_direct_buyable && args.supabase_has_direct_buyable) {
    return "SUPABASE_HAS_WIN_CSV_MISSING";
  }
  if (
    !args.csv_has_direct_buyable &&
    !args.supabase_has_direct_buyable &&
    args.evidence_win_artifacts.length > 0
  ) {
    return "EVIDENCE_ONLY_NOT_IN_SUPABASE";
  }
  if (
    !args.csv_has_direct_buyable &&
    !args.supabase_has_direct_buyable &&
    args.csv_primary_is_placeholder
  ) {
    return "CSV_AND_SUPABASE_MATCH_PLACEHOLDER";
  }
  return "UNKNOWN";
}

export async function tryLoadSupabaseRetailerLinksBySlugV1(
  slugs: string[],
): Promise<SupabaseLinksBySlugResultV1> {
  if (slugs.length === 0) {
    return {
      status: "CHECKED",
      slug_to_filter_id: new Map(),
      links_by_slug: new Map(),
    };
  }
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    const slugList = slugs.map((s) => s.toLowerCase());
    const { data: filters, error: filterErr } = await supabase
      .from("filters")
      .select("id, slug")
      .in("slug", slugList);
    if (filterErr) throw filterErr;

    const slugToFilterId = new Map<string, string>();
    const filterIdToSlug = new Map<string, string>();
    for (const row of filters ?? []) {
      const id = (row as { id?: string }).id;
      const slug = normalizeSlug((row as { slug?: string }).slug);
      if (!id || !slug) continue;
      slugToFilterId.set(slug, id);
      filterIdToSlug.set(id, slug);
    }

    const filterIds = Array.from(filterIdToSlug.keys());
    const linksBySlug = new Map<string, SupabaseRetailerLinkRowV1[]>();
    for (const slug of slugList) {
      linksBySlug.set(slug, []);
    }

    if (filterIds.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from("retailer_links")
        .select(
          "filter_id, retailer_key, affiliate_url, is_primary, browser_truth_classification, browser_truth_buyable_subtype",
        )
        .in("filter_id", filterIds);
      if (linkErr) throw linkErr;
      for (const raw of links ?? []) {
        const filterId = (raw as { filter_id?: string }).filter_id;
        const slug = filterId ? filterIdToSlug.get(filterId) : undefined;
        if (!slug) continue;
        const list = linksBySlug.get(slug) ?? [];
        list.push({
          filter_id: filterId!,
          retailer_key: (raw as { retailer_key?: string | null }).retailer_key,
          affiliate_url: String((raw as { affiliate_url?: string }).affiliate_url ?? ""),
          is_primary: (raw as { is_primary?: boolean | null }).is_primary,
          browser_truth_classification: (raw as { browser_truth_classification?: string | null })
            .browser_truth_classification,
          browser_truth_buyable_subtype: (raw as { browser_truth_buyable_subtype?: string | null })
            .browser_truth_buyable_subtype,
        });
        linksBySlug.set(slug, list);
      }
    }

    return { status: "CHECKED", slug_to_filter_id: slugToFilterId, links_by_slug: linksBySlug };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { status: "UNKNOWN_DB_UNAVAILABLE", reason };
  }
}

export type BuildFridgeSupabaseVsCsvRetailerLinksDiffDepsV1 = {
  now?: () => Date;
  buildReconciliation?: (rootDir: string) => FridgeTruthReconciliationV1;
  loadSupabase?: (slugs: string[]) => Promise<SupabaseLinksBySlugResultV1>;
};

export async function buildFridgeSupabaseVsCsvRetailerLinksDiffV1(args: {
  rootDir: string;
  deps?: BuildFridgeSupabaseVsCsvRetailerLinksDiffDepsV1;
}): Promise<FridgeSupabaseVsCsvRetailerLinksDiffV1> {
  const now = args.deps?.now ?? (() => new Date());
  const buildReconciliation =
    args.deps?.buildReconciliation ??
    ((rootDir: string) => buildFridgeTruthReconciliationV1({ rootDir, now }));
  const loadSupabase = args.deps?.loadSupabase ?? tryLoadSupabaseRetailerLinksBySlugV1;

  const reconciliation = buildReconciliation(args.rootDir);
  const targetSlugs = targetEvidenceWinSlugsFromReconciliation(reconciliation);
  const slugSet = new Set(targetSlugs);
  const evidenceBySlug = evidenceWinArtifactsBySlug(reconciliation);
  const csvBySlug = readCsvRetailerLinksForSlugs(args.rootDir, slugSet);
  const supabaseLoad = await loadSupabase(targetSlugs);

  const supabaseChecked = supabaseLoad.status === "CHECKED";
  const rows: FridgeRetailerLinksDiffRowV1[] = [];

  for (const slug of targetSlugs) {
    const csvRows = csvBySlug.get(slug) ?? [];
    const csvSummary = summarizeCsvSlug(csvRows);
    const evidence_win_artifacts = (evidenceBySlug.get(slug) ?? []).sort();

    let supabase_row_count: number | null = null;
    let supabase_direct_buyable_count: number | null = null;
    let supabase_safe_cta_count: number | null = null;
    let supabase_primary_url: string | null = null;
    let supabase_has_direct_buyable = false;

    if (supabaseChecked) {
      const sbRows = supabaseLoad.links_by_slug.get(slug) ?? [];
      const sbSummary = summarizeSupabaseSlug(sbRows);
      supabase_row_count = sbSummary.supabase_row_count;
      supabase_direct_buyable_count = sbSummary.supabase_direct_buyable_count;
      supabase_safe_cta_count = sbSummary.supabase_safe_cta_count;
      supabase_primary_url = sbSummary.supabase_primary_url;
      supabase_has_direct_buyable = sbSummary.supabase_has_direct_buyable;
    }

    const status = classifyDiffRowStatus({
      csv_has_direct_buyable: csvSummary.csv_has_direct_buyable,
      csv_primary_is_placeholder: csvSummary.csv_primary_is_placeholder,
      supabase_checked: supabaseChecked,
      supabase_has_direct_buyable,
      evidence_win_artifacts,
    });

    rows.push({
      filter_slug: slug,
      csv_has_direct_buyable: csvSummary.csv_has_direct_buyable,
      csv_primary_url: csvSummary.csv_primary_url,
      csv_primary_retailer: csvSummary.csv_primary_retailer,
      supabase_row_count,
      supabase_direct_buyable_count,
      supabase_safe_cta_count,
      supabase_primary_url,
      evidence_win_artifacts,
      status,
    });
  }

  const supabase_has_win_csv_missing_count = rows.filter(
    (r) => r.status === "SUPABASE_HAS_WIN_CSV_MISSING",
  ).length;
  const evidence_only_not_in_supabase_count = rows.filter(
    (r) => r.status === "EVIDENCE_ONLY_NOT_IN_SUPABASE",
  ).length;
  const csv_and_supabase_match_placeholder_count = rows.filter(
    (r) => r.status === "CSV_AND_SUPABASE_MATCH_PLACEHOLDER",
  ).length;
  const csv_has_win_supabase_missing_count = rows.filter(
    (r) => r.status === "CSV_HAS_WIN_SUPABASE_MISSING",
  ).length;
  const unknown_status_count = rows.filter((r) => r.status === "UNKNOWN").length;

  const supabase_truth_status: SupabaseTruthStatusV1 = supabaseChecked
    ? "CHECKED"
    : "UNKNOWN_DB_UNAVAILABLE";

  let recommended_next_action =
    "Read-only diff complete. Founder must explicitly approve any retailer_links.csv export or Supabase mutation before apply work.";
  if (supabaseChecked && supabase_has_win_csv_missing_count > 0) {
    recommended_next_action =
      "Read-only: Supabase holds direct_buyable retailer_links for slug(s) missing from committed CSV. Founder approval required before any CSV export from production or retailer_links apply — this report does not authorize apply.";
  } else if (!supabaseChecked) {
    recommended_next_action =
      "Read-only: Supabase was not queried (UNKNOWN_DB_UNAVAILABLE). Re-run with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local for live comparison — no CSV apply.";
  } else if (evidence_only_not_in_supabase_count > 0) {
    recommended_next_action =
      "Read-only: Evidence documents wins but neither committed CSV nor Supabase (when checked) show direct_buyable rows — verify evidence staleness or filter_id mapping before any apply.";
  }

  const proven_facts: string[] = [
    `PROVEN: checked_slug_count=${targetSlugs.length} from fridge_truth_reconciliation_v1 slugs_with_evidence_win_but_csv_placeholder + suspected_unapplied_evidence_rows.`,
    `PROVEN: committed data/retailer_links.csv has csv_has_direct_buyable=false for all checked slugs in this repo snapshot.`,
    `PROVEN: supabase_truth_status=${supabase_truth_status}.`,
  ];
  if (supabaseChecked) {
    proven_facts.push(
      `PROVEN: supabase_has_win_csv_missing_count=${supabase_has_win_csv_missing_count}.`,
      `PROVEN: evidence_only_not_in_supabase_count=${evidence_only_not_in_supabase_count}.`,
      `PROVEN: csv_and_supabase_match_placeholder_count=${csv_and_supabase_match_placeholder_count}.`,
    );
  }

  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  if (supabaseChecked && supabase_has_win_csv_missing_count > 0) {
    inferred_facts.push(
      "INFERRED: Prior fridge buyer-path wins are present in Supabase public.retailer_links but absent from committed data/retailer_links.csv (hypothesis B from reconciliation).",
    );
  }
  if (!supabaseChecked) {
    unknown_facts.push(
      `UNKNOWN: Live Supabase retailer_links state — ${supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE" ? supabaseLoad.reason : "not queried"}.`,
    );
  }

  return {
    contract: FRIDGE_SUPABASE_VS_CSV_RETAILER_LINKS_DIFF_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    exact_repo_paths_read: [
      "data/retailer_links.csv",
      "data/evidence/",
      "scripts/lib/fridge-truth-reconciliation-v1.ts",
      "public.retailer_links",
      "public.filters",
    ],
    reconciliation_source_contract: reconciliation.contract,
    checked_slug_count: targetSlugs.length,
    checked_filter_slugs: targetSlugs,
    supabase_truth_status,
    supabase_unavailable_reason:
      supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE" ? supabaseLoad.reason : null,
    supabase_has_win_csv_missing_count,
    evidence_only_not_in_supabase_count,
    csv_and_supabase_match_placeholder_count,
    csv_has_win_supabase_missing_count,
    unknown_status_count,
    recommended_next_action,
    rows,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
