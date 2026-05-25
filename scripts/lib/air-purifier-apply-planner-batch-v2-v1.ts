/**
 * Batch-v2 AP Apply Planner bridge — aggregates batch-v2 evidence and plans direct-buy
 * CSV changes for auto_apply_eligible rows only. Synthesizes recommended_csv_mutation
 * from browser-proven final_url when evidence rows have null mutations.
 * Read-only: does NOT mutate CSVs or Supabase.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buyLinkGateFailureKind, isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import {
  buildAirPurifierAgentResultsAggregatorV1Report,
  type AirPurifierAgentResultsAggregatorReportV1,
  type ApAggregatedReviewRowV1,
} from "./air-purifier-agent-results-aggregator-v1";
import type { ApAgentEvidenceCsvMutationV1 } from "./air-purifier-agent-packets-v1";
import {
  AP_RETAILER_LINKS_CSV_REL_V1,
  buildAfterRowFromPlanV1,
  findUniqueCsvRowV1,
  loadApRetailerLinksCsvV1,
  renderAirPurifierApplyPlannerMarkdownV1,
  validateAutoApplyRowForPlannerV1,
  type AirPurifierApplyPlannerReportV1,
  type ApApplyPlanStatusV1,
  type ApPlannedChangeV1,
  type ApRefusedChangeV1,
  type ApRetailerLinkCsvRowV1,
} from "./air-purifier-apply-planner-v1";

export const AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1 =
  "air_purifier_apply_planner_batch_v2_v1" as const;

export const AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1 =
  "data/air-purifier/batch-production/agent-results-batch-v2" as const;

export const AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_JSON_V1 =
  "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json" as const;

export const AP_APPLY_PLAN_BATCH_V2_DEFAULT_OUT_MD_V1 =
  "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.md" as const;

export const AP_FRIDGE_RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

/** PROVEN auto-apply direct-buy slugs from batch-v2 aggregator (2026-05-24). */
export const AP_BATCH_V2_DIRECT_BUY_SLUGS_V1 = [
  "winix-hepa-115115",
  "gg-flt5000",
  "coway-max2-hepa",
  "rabbit-biogs-minusa2",
] as const;

export type AirPurifierApplyPlannerBatchV2ReportV1 = Omit<
  AirPurifierApplyPlannerReportV1,
  "report_name" | "source_review_path"
> & {
  report_name: typeof AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1;
  source_results_dir: string;
  source_aggregator_generated_at: string;
  synthesized_mutation_slugs: string[];
};

export function synthesizeOemCatalogMutationFromBatchV2EvidenceV1(
  row: ApAggregatedReviewRowV1,
): ApAgentEvidenceCsvMutationV1 {
  const finalUrl = row.final_url!.trim();
  return {
    file: AP_RETAILER_LINKS_CSV_REL_V1,
    filter_slug: row.slug,
    retailer_key: "oem-catalog",
    fields: {
      destination_url: finalUrl,
      affiliate_url: finalUrl,
    },
    note:
      "Batch-v2 bridge: synthesized oem-catalog mutation from browser-proven final_url (evidence recommended_csv_mutation was null).",
  };
}

export function validateBatchV2BeforeRowV1(before: ApRetailerLinkCsvRowV1): string[] {
  const reasons: string[] = [];
  if ((before.is_primary ?? "").trim().toLowerCase() !== "true") {
    reasons.push("before_row_not_primary");
  }
  if ((before.retailer_key ?? "").trim().toLowerCase() !== "oem-catalog") {
    reasons.push("before_row_not_oem_catalog");
  }
  const url = (before.affiliate_url ?? before.destination_url ?? "").trim();
  if (!url) {
    reasons.push("before_row_missing_url");
  } else if (!isManufacturerSiteSearchUrl(url)) {
    reasons.push("before_row_not_search_placeholder");
  }
  if (before.browser_truth_classification?.trim()) {
    reasons.push("before_row_already_has_browser_truth");
  }
  return reasons;
}

export function validateAfterRowPassesDirectBuyableGateV1(
  after: ApRetailerLinkCsvRowV1,
): string[] {
  const reasons: string[] = [];
  if (after.browser_truth_classification?.trim() !== "direct_buyable") {
    reasons.push("after_row_not_direct_buyable");
  }
  const gate = buyLinkGateFailureKind({
    retailer_key: after.retailer_key,
    affiliate_url: after.affiliate_url ?? "",
    browser_truth_classification: after.browser_truth_classification,
    browser_truth_buyable_subtype: null,
  });
  if (gate !== null) {
    reasons.push(`after_row_gate_failure:${gate}`);
  }
  return reasons;
}

export function withSynthesizedMutationV1(
  row: ApAggregatedReviewRowV1,
): ApAggregatedReviewRowV1 {
  if (row.recommended_csv_mutation) return row;
  return {
    ...row,
    recommended_csv_mutation: synthesizeOemCatalogMutationFromBatchV2EvidenceV1(row),
  };
}

export function buildAirPurifierApplyPlannerBatchV2V1Report(args: {
  rootDir: string;
  resultsDir?: string;
  now?: () => Date;
  readText?: (absPath: string) => string;
}): AirPurifierApplyPlannerBatchV2ReportV1 {
  const rootDir = args.rootDir;
  const relResultsDir = args.resultsDir?.trim() || AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1;
  const readText = args.readText ?? ((p) => readFileSync(p, "utf8"));
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  const aggregator = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir,
    resultsDir: relResultsDir,
    now: args.now,
    readFile: readText,
  });

  const csvRows = loadApRetailerLinksCsvV1(rootDir, readText);
  const planned_changes: ApPlannedChangeV1[] = [];
  const refused_changes: ApRefusedChangeV1[] = [];
  const rollback_rows: ApRetailerLinkCsvRowV1[] = [];
  const synthesized_mutation_slugs: string[] = [];

  for (const [groupKey, rows] of Object.entries(aggregator.review_groups ?? {})) {
    if (groupKey === "auto_apply_eligible") continue;
    for (const row of rows as ApAggregatedReviewRowV1[]) {
      refused_changes.push({
        slug: row.slug,
        retailer_key: row.recommended_csv_mutation?.retailer_key ?? null,
        review_group: groupKey,
        reasons: [`not_auto_apply_eligible: review_group=${groupKey}`, ...row.review_reasons],
        source: "review_group",
      });
    }
  }

  const autoApply = aggregator.review_groups.auto_apply_eligible ?? [];

  for (const rawRow of autoApply) {
    const hadMutation = !!rawRow.recommended_csv_mutation;
    const row = withSynthesizedMutationV1(rawRow);
    if (!hadMutation) synthesized_mutation_slugs.push(row.slug);

    const validationReasons = validateAutoApplyRowForPlannerV1(row);
    if (validationReasons.length > 0) {
      refused_changes.push({
        slug: row.slug,
        retailer_key: row.recommended_csv_mutation?.retailer_key ?? null,
        review_group: row.review_group,
        reasons: validationReasons.map((r) => `planner_validation:${r}`),
        source: "planner_validation",
      });
      continue;
    }

    const retailerKey = row.recommended_csv_mutation!.retailer_key!.trim();
    const lookup = findUniqueCsvRowV1({
      rows: csvRows,
      filterSlug: row.slug,
      retailerKey,
    });

    if (!lookup.ok) {
      refused_changes.push({
        slug: row.slug,
        retailer_key: retailerKey,
        review_group: row.review_group,
        reasons: [`csv_lookup:${lookup.reason}`],
        source: "csv_lookup",
      });
      continue;
    }

    const beforeReasons = validateBatchV2BeforeRowV1(lookup.row);
    if (beforeReasons.length > 0) {
      refused_changes.push({
        slug: row.slug,
        retailer_key: retailerKey,
        review_group: row.review_group,
        reasons: beforeReasons.map((r) => `before_row_validation:${r}`),
        source: "planner_validation",
      });
      continue;
    }

    const checkedAt =
      row.recommended_csv_mutation!.fields?.browser_truth_checked_at?.trim() ||
      aggregator.generated_at ||
      generatedAt;

    const { after, changedFields } = buildAfterRowFromPlanV1({
      before: lookup.row,
      reviewRow: row,
      checkedAt,
    });

    const afterReasons = validateAfterRowPassesDirectBuyableGateV1(after);
    if (afterReasons.length > 0) {
      refused_changes.push({
        slug: row.slug,
        retailer_key: retailerKey,
        review_group: row.review_group,
        reasons: afterReasons.map((r) => `after_row_validation:${r}`),
        source: "planner_validation",
      });
      continue;
    }

    rollback_rows.push({ ...lookup.row });

    planned_changes.push({
      filter_slug: row.slug,
      retailer_key: retailerKey,
      packet_id: row.packet_id,
      final_url: row.final_url!,
      before_row: lookup.row,
      after_row: after,
      changed_fields: changedFields,
      browser_truth_notes: after.browser_truth_notes ?? "",
      browser_truth_checked_at: checkedAt,
      evidence_summary: row.evidence_notes,
    });
  }

  let plan_status: ApApplyPlanStatusV1 = "EMPTY";
  if (autoApply.length === 0) {
    plan_status = "EMPTY";
  } else if (planned_changes.length === 0) {
    plan_status = "BLOCKED";
  } else {
    plan_status = "READY_FOR_OWNER_APPROVAL";
  }

  const direct_buyable_plus = planned_changes.length;

  let recommended_next_action =
    "No batch-v2 direct-buy planned changes — resolve refused_changes or refresh batch-v2 evidence.";
  if (plan_status === "READY_FOR_OWNER_APPROVAL") {
    recommended_next_action = `Owner approve ${planned_changes.length} batch-v2 planned change(s), then run apply executor with --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json (not run in this step).`;
  } else if (plan_status === "BLOCKED") {
    recommended_next_action =
      "All batch-v2 auto_apply_eligible rows were refused — fix evidence/CSV before approval.";
  }

  return {
    report_name: AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: generatedAt,
    source_results_dir: relResultsDir.replace(/\\/g, "/"),
    source_aggregator_generated_at: aggregator.generated_at,
    synthesized_mutation_slugs,
    plan_status,
    planned_change_count: planned_changes.length,
    planned_changes,
    refused_changes,
    rollback_rows,
    projected_coverage_delta: {
      direct_buyable_plus,
      official_reference_plus: 0,
      blocked_minus: direct_buyable_plus,
    },
    owner_approval_required: true,
    apply_executor_available: false,
    recommended_next_action,
    validation_checklist: [
      "Confirm owner approval for each of the 4 batch-v2 direct-buy slugs before apply.",
      "Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.",
      "Verify /air-purifier/go remains safe-only after apply (future executor step).",
      "Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.",
      "Do not edit data/retailer_links.csv (fridge batch).",
      "npm run lint && npm run build after apply executor (future task).",
    ],
    notes: [
      "Batch-v2 bridge — read-only plan; no CSV writes in this step.",
      "Only aggregator review_groups.auto_apply_eligible rows are eligible (PASS_DIRECT_BUYABLE with strict validation).",
      "recommended_csv_mutation synthesized from final_url when evidence rows had null mutations.",
      "PASS_REFERENCE, NEEDS_OWNER_REVIEW, NO_SAFE_PATH, REJECT_*, and CATALOG_GAP rows are in refused_changes.",
    ],
  };
}

export function renderAirPurifierApplyPlannerBatchV2MarkdownV1(
  report: AirPurifierApplyPlannerBatchV2ReportV1,
): string {
  const base = renderAirPurifierApplyPlannerMarkdownV1({
    ...report,
    report_name: "air_purifier_apply_planner_v1",
    source_review_path: report.source_results_dir,
  });
  const header = [
    "# Air Purifier Apply Plan — Batch v2 (Owner Approval)",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `**Source results:** \`${report.source_results_dir}\``,
    `**Synthesized mutations:** ${report.synthesized_mutation_slugs.join(", ") || "none"}`,
    "",
    "**NO CSV CHANGED · Read-only plan · Apply not run**",
    "",
  ].join("\n");
  return header + base.replace(/^# Air Purifier Apply Plan v1[^\n]*\n[\s\S]*?\*\*NO CSV CHANGED[^\n]*\n\n/, "");
}

export function parseAirPurifierApplyPlannerBatchV2CliArgsV1(argv: string[]): {
  resultsDir: string | null;
  outPath: string | null;
  markdownOutPath: string | null;
} {
  const read = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1]?.trim() ?? null) : null;
  };
  return {
    resultsDir: read("--results-dir"),
    outPath: read("--out"),
    markdownOutPath: read("--markdown-out"),
  };
}

export function assertApplyPlanBatchV2OutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.isAbsolute(outPath) ? outPath : path.resolve(rootDir, outPath);
  const normalized = abs.replace(/\\/g, "/");
  if (!normalized.includes("/data/air-purifier/batch-production/apply-plans-batch-v2/")) {
    throw new Error(
      `--out must be under data/air-purifier/batch-production/apply-plans-batch-v2/ (got ${outPath})`,
    );
  }
}

export function writeApplyPlanBatchV2ArtifactsV1(args: {
  report: AirPurifierApplyPlannerBatchV2ReportV1;
  outPath: string;
  markdownOutPath: string | null;
  rootDir: string;
}): { jsonPath: string; markdownPath: string | null } {
  const absJson = path.isAbsolute(args.outPath)
    ? args.outPath
    : path.resolve(args.rootDir, args.outPath);
  assertApplyPlanBatchV2OutPathAllowedV1(absJson, args.rootDir);
  mkdirSync(path.dirname(absJson), { recursive: true });
  writeFileSync(absJson, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");

  let markdownPath: string | null = null;
  if (args.markdownOutPath) {
    const absMd = path.isAbsolute(args.markdownOutPath)
      ? args.markdownOutPath
      : path.resolve(args.rootDir, args.markdownOutPath);
    assertApplyPlanBatchV2OutPathAllowedV1(absMd, args.rootDir);
    mkdirSync(path.dirname(absMd), { recursive: true });
    writeFileSync(absMd, renderAirPurifierApplyPlannerBatchV2MarkdownV1(args.report), "utf8");
    markdownPath = absMd;
  }

  return { jsonPath: absJson, markdownPath };
}

/** Prove v1 planner cannot plan batch-v2 without mutation synthesis. */
export function proveV1PlannerBlockedOnBatchV2EvidenceV1(args: {
  rootDir: string;
  resultsDir?: string;
}): {
  auto_apply_count: number;
  v1_planned_count: number;
  v1_blocked: boolean;
  missing_mutation_refusals: number;
} {
  const aggregator = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir: args.rootDir,
    resultsDir: args.resultsDir ?? AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1,
  });

  const autoCount = aggregator.review_groups.auto_apply_eligible.length;
  let v1Planned = 0;
  let missingMutationRefusals = 0;

  for (const row of aggregator.review_groups.auto_apply_eligible) {
    const reasons = validateAutoApplyRowForPlannerV1(row);
    if (reasons.length === 0) v1Planned += 1;
    if (reasons.includes("missing_recommended_csv_mutation")) missingMutationRefusals += 1;
  }

  return {
    auto_apply_count: autoCount,
    v1_planned_count: v1Planned,
    v1_blocked: autoCount > 0 && v1Planned === 0,
    missing_mutation_refusals: missingMutationRefusals,
  };
}

export type { AirPurifierAgentResultsAggregatorReportV1 };
