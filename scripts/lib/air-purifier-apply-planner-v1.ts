/**
 * Read-only AP Apply Planner v1 — consumes aggregator review JSON and emits owner-approval plan.
 * Does NOT mutate CSVs or apply changes.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import type {
  AirPurifierAgentResultsAggregatorReportV1,
  ApAggregatedReviewRowV1,
} from "./air-purifier-agent-results-aggregator-v1";

export const AIR_PURIFIER_APPLY_PLANNER_REPORT_NAME_V1 = "air_purifier_apply_planner_v1" as const;

export const AP_APPLY_PLAN_DEFAULT_REVIEW_PATH_V1 =
  "data/air-purifier/batch-production/batch-review/ap-agent-results-review-v1.json" as const;

export const AP_APPLY_PLAN_DEFAULT_OUT_JSON_V1 =
  "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json" as const;

export const AP_APPLY_PLAN_DEFAULT_OUT_MD_V1 =
  "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.md" as const;

export const AP_RETAILER_LINKS_CSV_REL_V1 = "data/air-purifier/retailer_links.csv" as const;

export type ApApplyPlanStatusV1 = "READY_FOR_OWNER_APPROVAL" | "BLOCKED" | "EMPTY";

export type ApRetailerLinkCsvRowV1 = Record<string, string>;

export type ApPlannedChangeV1 = {
  filter_slug: string;
  retailer_key: string;
  packet_id: string;
  final_url: string;
  before_row: ApRetailerLinkCsvRowV1;
  after_row: ApRetailerLinkCsvRowV1;
  changed_fields: string[];
  browser_truth_notes: string;
  browser_truth_checked_at: string;
  evidence_summary: string;
};

export type ApRefusedChangeV1 = {
  slug: string;
  retailer_key: string | null;
  review_group: string | null;
  reasons: string[];
  source: "review_group" | "planner_validation" | "csv_lookup";
};

export type AirPurifierApplyPlannerReportV1 = {
  report_name: typeof AIR_PURIFIER_APPLY_PLANNER_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_review_path: string;
  plan_status: ApApplyPlanStatusV1;
  planned_change_count: number;
  planned_changes: ApPlannedChangeV1[];
  refused_changes: ApRefusedChangeV1[];
  rollback_rows: ApRetailerLinkCsvRowV1[];
  projected_coverage_delta: {
    direct_buyable_plus: number;
    official_reference_plus: number;
    blocked_minus: number;
  };
  owner_approval_required: true;
  apply_executor_available: false;
  recommended_next_action: string;
  validation_checklist: string[];
  notes: string[];
};

function isPdpLikeUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (isManufacturerSiteSearchUrl(url)) return false;
  try {
    const u = new URL(url.trim());
    const p = u.pathname.toLowerCase();
    return (
      /\/products?\//.test(p) ||
      /\/store\/products?\//.test(p) ||
      /\/product\//.test(p) ||
      /\.html$/i.test(p)
    );
  } catch {
    return false;
  }
}

function pickUrlFromMutationFields(fields: Record<string, string>): string | null {
  return (
    fields.destination_url?.trim() ||
    fields.affiliate_url?.trim() ||
    fields.primary_url?.trim() ||
    null
  );
}

export function validateAutoApplyRowForPlannerV1(row: ApAggregatedReviewRowV1): string[] {
  const reasons: string[] = [];

  if (row.review_group !== "auto_apply_eligible") {
    reasons.push("not_auto_apply_eligible");
  }
  if (!row.slug?.trim()) reasons.push("missing_slug");
  if (row.browser_truth_classification?.trim() !== "direct_buyable") {
    reasons.push("browser_truth_not_direct_buyable");
  }
  if (row.buy_action_seen !== true) reasons.push("buy_action_not_seen");
  if (row.wrong_family_tokens_seen.length > 0) {
    reasons.push("wrong_family_tokens_present");
  }
  if (!isPdpLikeUrl(row.final_url)) {
    reasons.push("final_url_not_pdp_like");
  }

  const mutation = row.recommended_csv_mutation;
  if (!mutation) {
    reasons.push("missing_recommended_csv_mutation");
  } else {
    if (mutation.file !== AP_RETAILER_LINKS_CSV_REL_V1) {
      reasons.push("mutation_target_file_not_ap_retailer_links");
    }
    if (mutation.filter_slug !== row.slug) {
      reasons.push("mutation_filter_slug_mismatch");
    }
    if (!mutation.retailer_key?.trim()) {
      reasons.push("missing_mutation_retailer_key");
    }
    const url = pickUrlFromMutationFields(mutation.fields ?? {});
    if (!url || !isPdpLikeUrl(url)) {
      reasons.push("mutation_url/fields_url_not_pdp_like");
    }
  }

  return reasons;
}

export function loadApRetailerLinksCsvV1(
  rootDir: string,
  readText?: (absPath: string) => string,
): ApRetailerLinkCsvRowV1[] {
  const abs = path.join(rootDir, AP_RETAILER_LINKS_CSV_REL_V1);
  const text = (readText ?? ((p) => readFileSync(p, "utf8")))(abs);
  return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as ApRetailerLinkCsvRowV1[];
}

export function findUniqueCsvRowV1(args: {
  rows: ApRetailerLinkCsvRowV1[];
  filterSlug: string;
  retailerKey: string;
}): { ok: true; row: ApRetailerLinkCsvRowV1; index: number } | { ok: false; reason: string } {
  const matches = args.rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        row.filter_slug === args.filterSlug &&
        (row.retailer_key ?? "").trim().toLowerCase() === args.retailerKey.trim().toLowerCase(),
    );

  if (matches.length === 0) return { ok: false, reason: "csv_row_missing" };
  if (matches.length > 1) return { ok: false, reason: "multiple_csv_rows_match" };
  return { ok: true, row: { ...matches[0]!.row }, index: matches[0]!.index };
}

export function buildAfterRowFromPlanV1(args: {
  before: ApRetailerLinkCsvRowV1;
  reviewRow: ApAggregatedReviewRowV1;
  checkedAt: string;
}): { after: ApRetailerLinkCsvRowV1; changedFields: string[] } {
  const mutation = args.reviewRow.recommended_csv_mutation!;
  const fields = mutation.fields ?? {};
  const after: ApRetailerLinkCsvRowV1 = { ...args.before };
  const changedFields: string[] = [];

  const setField = (key: string, value: string) => {
    if (after[key] !== value) {
      after[key] = value;
      changedFields.push(key);
    }
  };

  const dest =
    fields.destination_url?.trim() ||
    args.reviewRow.final_url?.trim() ||
    fields.affiliate_url?.trim() ||
    "";
  const aff =
    fields.affiliate_url?.trim() ||
    fields.destination_url?.trim() ||
    args.reviewRow.final_url?.trim() ||
    "";

  if (dest) setField("destination_url", dest);
  if (aff) setField("affiliate_url", aff);

  const notes =
    args.reviewRow.evidence_notes?.trim() ||
    mutation.note?.trim() ||
    "AP apply planner v1: browser-proven direct_buyable PDP.";
  setField("browser_truth_classification", "direct_buyable");
  setField("browser_truth_notes", notes);
  setField("browser_truth_checked_at", args.checkedAt);

  return { after, changedFields };
}

export function buildAirPurifierApplyPlannerV1Report(args: {
  rootDir: string;
  reviewPath?: string;
  now?: () => Date;
  readText?: (absPath: string) => string;
}): AirPurifierApplyPlannerReportV1 {
  const rootDir = args.rootDir;
  const relReviewPath = args.reviewPath?.trim() || AP_APPLY_PLAN_DEFAULT_REVIEW_PATH_V1;
  const absReviewPath = path.isAbsolute(relReviewPath)
    ? relReviewPath
    : path.join(rootDir, relReviewPath);
  const readText = args.readText ?? ((p) => readFileSync(p, "utf8"));
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();

  if (!existsSync(absReviewPath)) {
    throw new Error(`Review JSON not found: ${relReviewPath}`);
  }

  const review = JSON.parse(readText(absReviewPath)) as AirPurifierAgentResultsAggregatorReportV1;
  const reviewGeneratedAt = review.generated_at ?? generatedAt;

  const csvRows = loadApRetailerLinksCsvV1(rootDir, readText);
  const planned_changes: ApPlannedChangeV1[] = [];
  const refused_changes: ApRefusedChangeV1[] = [];
  const rollback_rows: ApRetailerLinkCsvRowV1[] = [];

  const autoApply = review.review_groups?.auto_apply_eligible ?? [];

  for (const [groupKey, rows] of Object.entries(review.review_groups ?? {})) {
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

  for (const row of autoApply) {
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

    const checkedAt =
      row.recommended_csv_mutation!.fields?.browser_truth_checked_at?.trim() || reviewGeneratedAt;

    const { after, changedFields } = buildAfterRowFromPlanV1({
      before: lookup.row,
      reviewRow: row,
      checkedAt,
    });

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
    "No planned changes — resolve refused_changes or refresh agent review.";
  if (plan_status === "READY_FOR_OWNER_APPROVAL") {
    recommended_next_action = `Owner approve ${planned_changes.length} planned change(s), then run a future apply executor (not implemented). Do not edit CSV manually without this plan.`;
  } else if (plan_status === "BLOCKED") {
    recommended_next_action =
      "All auto_apply_eligible rows were refused by planner validation or CSV lookup — fix review/CSV before approval.";
  }

  const validation_checklist = [
    "Confirm owner approval for each planned slug before any apply executor runs.",
    "Re-run buyLinkGateFailureKind on after_row payloads — expect null for direct_buyable.",
    "Verify /air-purifier/go remains safe-only after apply (future executor step).",
    "Keep rollback_rows to revert data/air-purifier/retailer_links.csv if needed.",
    "npm run lint && npm run build after apply executor (future task).",
    "node --import tsx --test scripts/report-air-purifier-batch-production-lane-v1.test.ts",
    "npx tsx scripts/report-air-purifier-agent-results-aggregator-v1.ts",
  ];

  return {
    report_name: AIR_PURIFIER_APPLY_PLANNER_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: generatedAt,
    source_review_path: relReviewPath.replace(/\\/g, "/"),
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
    validation_checklist,
    notes: [
      "Read-only planner — no CSV writes in this step.",
      "Only review_groups.auto_apply_eligible rows are eligible for planned_changes.",
      "refused_changes includes all non-auto_apply review groups plus planner/CSV failures.",
      "apply_executor_available is false — owner must not expect automatic mutation from this script.",
    ],
  };
}

export function renderAirPurifierApplyPlannerMarkdownV1(
  report: AirPurifierApplyPlannerReportV1,
): string {
  const lines: string[] = [
    "# Air Purifier Apply Plan v1 — Owner Approval",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "**NO CSV CHANGED · Read-only plan · Apply executor not available**",
    "",
    "## Status",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Plan status | **${report.plan_status}** |`,
    `| Planned changes | ${report.planned_change_count} |`,
    `| Refused (total) | ${report.refused_changes.length} |`,
    `| Source review | \`${report.source_review_path}\` |`,
    "",
    "## Projected coverage delta (if approved + applied later)",
    "",
    `- Direct-buy safe CTA **+${report.projected_coverage_delta.direct_buyable_plus}**`,
    `- Blocked rows reduced (approx) **−${report.projected_coverage_delta.blocked_minus}**`,
    "",
    "## Planned changes",
    "",
  ];

  if (report.planned_changes.length === 0) {
    lines.push("_No planned changes._", "");
  } else {
    for (const c of report.planned_changes) {
      lines.push(`### ${c.filter_slug} (${c.retailer_key})`, "");
      lines.push(`- **Before URL:** ${c.before_row.affiliate_url ?? c.before_row.destination_url ?? "—"}`);
      lines.push(`- **After URL:** ${c.after_row.affiliate_url ?? c.after_row.destination_url ?? "—"}`);
      lines.push(`- **Classification:** ${c.before_row.browser_truth_classification || "(empty)"} → **direct_buyable**`);
      lines.push(`- **Changed fields:** ${c.changed_fields.join(", ")}`);
      lines.push(`- **Checked at:** ${c.browser_truth_checked_at}`);
      lines.push("");
    }
  }

  lines.push("## Refused changes (sample — not auto-eligible or failed validation)", "");
  const refusedSample = report.refused_changes.slice(0, 12);
  for (const r of refusedSample) {
    lines.push(`- **${r.slug}** (${r.review_group ?? "—"}): ${r.reasons.slice(0, 2).join("; ")}`);
  }
  if (report.refused_changes.length > 12) {
    lines.push(`- _…and ${report.refused_changes.length - 12} more in JSON_`);
  }
  lines.push("");

  lines.push("## Rollback", "");
  lines.push(
    `${report.rollback_rows.length} before_row snapshot(s) captured in plan JSON \`rollback_rows\` for revert if needed.`,
    "",
  );

  lines.push("## Validation checklist", "");
  for (const item of report.validation_checklist) {
    lines.push(`- ${item}`);
  }
  lines.push("");

  lines.push("## Next action", "", report.recommended_next_action, "");

  return `${lines.join("\n")}\n`;
}

export function parseAirPurifierApplyPlannerCliArgsV1(argv: string[]): {
  reviewPath: string | null;
  outPath: string | null;
  markdownOutPath: string | null;
} {
  const read = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1]?.trim() ?? null) : null;
  };
  return {
    reviewPath: read("--review"),
    outPath: read("--out"),
    markdownOutPath: read("--markdown-out"),
  };
}

export function assertApplyPlanOutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.isAbsolute(outPath) ? outPath : path.resolve(rootDir, outPath);
  const normalized = abs.replace(/\\/g, "/");
  if (!normalized.includes("/data/air-purifier/batch-production/")) {
    throw new Error(`--out must be under data/air-purifier/batch-production/ (got ${outPath})`);
  }
}

export function writeApplyPlanArtifactsV1(args: {
  report: AirPurifierApplyPlannerReportV1;
  outPath: string;
  markdownOutPath: string | null;
  rootDir: string;
}): { jsonPath: string; markdownPath: string | null } {
  const absJson = path.isAbsolute(args.outPath)
    ? args.outPath
    : path.resolve(args.rootDir, args.outPath);
  assertApplyPlanOutPathAllowedV1(absJson, args.rootDir);
  mkdirSync(path.dirname(absJson), { recursive: true });
  writeFileSync(absJson, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");

  let markdownPath: string | null = null;
  if (args.markdownOutPath) {
    const absMd = path.isAbsolute(args.markdownOutPath)
      ? args.markdownOutPath
      : path.resolve(args.rootDir, args.markdownOutPath);
    assertApplyPlanOutPathAllowedV1(absMd, args.rootDir);
    mkdirSync(path.dirname(absMd), { recursive: true });
    writeFileSync(absMd, renderAirPurifierApplyPlannerMarkdownV1(args.report), "utf8");
    markdownPath = absMd;
  }

  return { jsonPath: absJson, markdownPath };
}

export function readCsvContentForApplyPlannerTest(absPath: string): string {
  return readFileSync(absPath, "utf8");
}
