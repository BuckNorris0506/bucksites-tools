import {
  R1_SHADOW_STALE_BROWSER_TRUTH_MAX_AGE_MS,
  summarizeStaleBrowserTruthShadowCounts,
  staleBrowserTruthShadowClassification,
  type StaleBrowserTruthShadowKind,
} from "@/lib/retailers/launch-buy-links";

export type StaleBrowserTruthShadowRow = {
  source_table: string;
  retailer_key: string | null;
  affiliate_url: string;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype?: string | null;
  browser_truth_checked_at: string | null;
};

export type StaleBrowserTruthShadowReport = {
  report_name: "buckparts_stale_browser_truth_shadow_v1";
  generated_at: string;
  read_only: true;
  data_mutation: false;
  enforce: false;
  max_age_ms: number;
  max_age_days: number;
  totals: ReturnType<typeof summarizeStaleBrowserTruthShadowCounts>;
  by_source_table: Record<
    string,
    ReturnType<typeof summarizeStaleBrowserTruthShadowCounts>
  >;
  by_shadow_kind: Record<StaleBrowserTruthShadowKind, number>;
};

function normalizeSourceTable(sourceTable: string): string {
  return sourceTable.trim();
}

export function buildBuckpartsStaleBrowserTruthShadowReportFromRows(
  rows: StaleBrowserTruthShadowRow[],
  now: () => Date,
  maxAgeMs: number = R1_SHADOW_STALE_BROWSER_TRUTH_MAX_AGE_MS,
): StaleBrowserTruthShadowReport {
  const options = { now: now(), maxAgeMs };
  const totals = summarizeStaleBrowserTruthShadowCounts(rows, options);

  const by_source_table: StaleBrowserTruthShadowReport["by_source_table"] = {};
  const by_shadow_kind: StaleBrowserTruthShadowReport["by_shadow_kind"] = {
    missing_browser_truth_checked_at: 0,
    stale_browser_truth_checked_at: 0,
  };

  for (const row of rows) {
    const shadow = staleBrowserTruthShadowClassification(row, options);
    if (shadow) {
      by_shadow_kind[shadow.shadow_kind] += 1;
    }
  }

  const sourceTables = [...new Set(rows.map((row) => normalizeSourceTable(row.source_table)))];
  for (const source of sourceTables) {
    const sourceRows = rows.filter(
      (row) => normalizeSourceTable(row.source_table) === source,
    );
    by_source_table[source] = summarizeStaleBrowserTruthShadowCounts(sourceRows, options);
  }

  return {
    report_name: "buckparts_stale_browser_truth_shadow_v1",
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    enforce: false,
    max_age_ms: maxAgeMs,
    max_age_days: maxAgeMs / (24 * 60 * 60 * 1000),
    totals,
    by_source_table,
    by_shadow_kind,
  };
}
