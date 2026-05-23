/**
 * Guarded AP Apply Executor v1 — applies ONLY an approved apply plan to data/air-purifier/retailer_links.csv.
 * Default mode is dry-run; mutation requires explicit --apply.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
} from "@/lib/retailers/launch-buy-links";
import {
  mapSignalsToRetailerLinkState,
  RETAILER_LINK_STATES,
} from "@/lib/retailers/retailer-link-state";

import type { AirPurifierApplyPlannerReportV1, ApPlannedChangeV1, ApRetailerLinkCsvRowV1 } from "./air-purifier-apply-planner-v1";
import {
  AP_RETAILER_LINKS_CSV_REL_V1,
  findUniqueCsvRowV1,
  loadApRetailerLinksCsvV1,
} from "./air-purifier-apply-planner-v1";

export const AIR_PURIFIER_APPLY_EXECUTOR_REPORT_NAME_V1 = "air_purifier_apply_executor_v1" as const;

export const AP_APPLY_PLAN_DEFAULT_PATH_V1 =
  "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json" as const;

export const AP_APPLY_RUN_DEFAULT_JSON_V1 =
  "data/air-purifier/batch-production/apply-runs/ap-apply-run-v1.json" as const;

export const AP_APPLY_RUN_DEFAULT_MD_V1 =
  "data/air-purifier/batch-production/apply-runs/ap-apply-run-v1.md" as const;

export type ApApplyExecutorModeV1 = "dry_run" | "apply";

export type ApApplyExecutorStatusV1 = "DRY_RUN_READY" | "APPLIED" | "BLOCKED";

export type ApApplyExecutorPreflightV1 = {
  plan_status: string;
  planned_change_count: number;
  owner_approval_required: boolean;
  csv_row_count: number;
  before_row_match_count: number;
  validation_errors: string[];
  duplicate_targets: string[];
};

export type ApApplyExecutorPostValidationV1 = {
  changed_row_count: number;
  target_slugs: string[];
  only_target_slugs_changed: boolean;
  all_direct_buyable: boolean;
  no_search_urls_on_targets: boolean;
  gate_by_slug: Record<
    string,
    { gate_failure_kind: string | null; retailer_link_state: string }
  >;
  ap_safe_cta_count_before: number | null;
  ap_safe_cta_count_after: number | null;
  ap_safe_cta_delta: number | null;
};

export type AirPurifierApplyExecutorReportV1 = {
  report_name: typeof AIR_PURIFIER_APPLY_EXECUTOR_REPORT_NAME_V1;
  generated_at: string;
  mode: ApApplyExecutorModeV1;
  data_mutation: boolean;
  source_plan_path: string;
  apply_status: ApApplyExecutorStatusV1;
  planned_change_count: number;
  applied_change_count: number;
  changed_slugs: string[];
  blocked_reasons: string[];
  preflight: ApApplyExecutorPreflightV1;
  post_apply_validation: ApApplyExecutorPostValidationV1 | null;
  rollback_rows: ApRetailerLinkCsvRowV1[];
  notes: string[];
};

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function parseCsvHeadersFromTextV1(csvText: string): string[] {
  const firstLine = csvText.split(/\r?\n/)[0] ?? "";
  return firstLine.split(",").map((h) => h.trim());
}

export function serializeRetailerLinksCsvV1(headers: string[], rows: ApRetailerLinkCsvRowV1[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function applyPlannedChangesToCsvTextV1(args: {
  csvText: string;
  headers: string[];
  rows: ApRetailerLinkCsvRowV1[];
  changedIndices: Set<number>;
}): string {
  const rawLines = args.csvText.split(/\r?\n/);
  const headerLine = rawLines[0] ?? args.headers.join(",");
  const dataLines = rawLines.slice(1).filter((line) => line.length > 0);

  if (dataLines.length !== args.rows.length) {
    return serializeRetailerLinksCsvV1(args.headers, args.rows);
  }

  const outLines = [headerLine];
  for (let i = 0; i < args.rows.length; i++) {
    if (args.changedIndices.has(i)) {
      outLines.push(
        args.headers.map((h) => escapeCsvField(args.rows[i]![h] ?? "")).join(","),
      );
    } else {
      outLines.push(dataLines[i]!);
    }
  }
  return `${outLines.join("\n")}\n`;
}

export function rowMatchesSnapshotV1(
  current: ApRetailerLinkCsvRowV1,
  snapshot: ApRetailerLinkCsvRowV1,
): boolean {
  for (const [key, expected] of Object.entries(snapshot)) {
    if ((current[key] ?? "") !== (expected ?? "")) return false;
  }
  return true;
}

function isSearchOrCategoryUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  if (isManufacturerSiteSearchUrl(url)) return true;
  try {
    const u = new URL(url.trim());
    const p = u.pathname.toLowerCase();
    if (p.includes("/search") || p.includes("/catalogsearch")) return true;
    if (p.includes("/category") || p.includes("/collections")) return true;
  } catch {
    return true;
  }
  return false;
}

function validateAfterRowForApplyV1(after: ApRetailerLinkCsvRowV1, slug: string): string[] {
  const reasons: string[] = [];
  if (after.browser_truth_classification?.trim() !== "direct_buyable") {
    reasons.push(`${slug}: after_row browser_truth_classification is not direct_buyable`);
  }
  const dest = after.destination_url?.trim() ?? "";
  const aff = after.affiliate_url?.trim() ?? "";
  if (isSearchOrCategoryUrl(dest)) {
    reasons.push(`${slug}: after_row destination_url is search/category`);
  }
  if (isSearchOrCategoryUrl(aff)) {
    reasons.push(`${slug}: after_row affiliate_url is search/category`);
  }
  if (!isOfficialReferencePdpUrl(dest) && !isOfficialReferencePdpUrl(aff)) {
    reasons.push(`${slug}: after_row URLs are not PDP-like`);
  }
  return reasons;
}

function validatePlannedChangeStructureV1(change: ApPlannedChangeV1): string[] {
  const reasons: string[] = [];
  if (!change.filter_slug?.trim()) reasons.push("planned_change missing filter_slug");
  if (!change.retailer_key?.trim()) reasons.push("planned_change missing retailer_key");
  if (!change.before_row || Object.keys(change.before_row).length === 0) {
    reasons.push(`${change.filter_slug ?? "?"}: missing before_row`);
  }
  if (!change.after_row || Object.keys(change.after_row).length === 0) {
    reasons.push(`${change.filter_slug ?? "?"}: missing after_row`);
  }
  if (change.before_row?.filter_slug && change.before_row.filter_slug !== change.filter_slug) {
    reasons.push(`${change.filter_slug}: before_row filter_slug mismatch`);
  }
  if (
    change.before_row?.retailer_key &&
    change.before_row.retailer_key.toLowerCase() !== change.retailer_key.toLowerCase()
  ) {
    reasons.push(`${change.filter_slug}: before_row retailer_key mismatch`);
  }
  reasons.push(...validateAfterRowForApplyV1(change.after_row ?? {}, change.filter_slug));
  return reasons;
}

function findDuplicatePlannedTargetsV1(changes: ApPlannedChangeV1[]): string[] {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const c of changes) {
    const key = `${c.filter_slug}::${c.retailer_key}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) dupes.push(key);
  }
  return dupes;
}

export function countApSafeCtaFromRowsV1(rows: ApRetailerLinkCsvRowV1[]): number {
  let safe = 0;
  for (const row of rows) {
    const gate = buyLinkGateFailureKind({
      retailer_key: row.retailer_key ?? null,
      affiliate_url: row.affiliate_url ?? "",
      browser_truth_classification: row.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
    });
    if (gate === null && row.browser_truth_classification?.trim() === "direct_buyable") {
      safe += 1;
    }
  }
  return safe;
}

function gateProofForRowV1(row: ApRetailerLinkCsvRowV1): {
  gate_failure_kind: string | null;
  retailer_link_state: string;
} {
  const gate = buyLinkGateFailureKind({
    retailer_key: row.retailer_key ?? null,
    affiliate_url: row.affiliate_url ?? "",
    browser_truth_classification: row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: row.browser_truth_buyable_subtype ?? null,
  });
  const state = mapSignalsToRetailerLinkState({
    browserTruthClassification: row.browser_truth_classification ?? null,
    gateFailureKind: gate,
  });
  return { gate_failure_kind: gate, retailer_link_state: state };
}

export function buildPostApplyValidationV1(args: {
  rowsAfter: ApRetailerLinkCsvRowV1[];
  plannedChanges: ApPlannedChangeV1[];
  rowsBefore: ApRetailerLinkCsvRowV1[];
  safeCtaBefore: number | null;
  safeCtaAfter: number | null;
}): ApApplyExecutorPostValidationV1 {
  const targetSlugs = args.plannedChanges.map((c) => c.filter_slug);
  const changedIndices = new Set<number>();

  for (const change of args.plannedChanges) {
    const lookup = findUniqueCsvRowV1({
      rows: args.rowsAfter,
      filterSlug: change.filter_slug,
      retailerKey: change.retailer_key,
    });
    if (!lookup.ok) continue;
    if (!rowMatchesSnapshotV1(lookup.row, change.after_row)) continue;
    changedIndices.add(lookup.index);
  }

  const gate_by_slug: ApApplyExecutorPostValidationV1["gate_by_slug"] = {};
  let allDirectBuyable = true;
  let noSearchUrls = true;

  for (const change of args.plannedChanges) {
    const lookup = findUniqueCsvRowV1({
      rows: args.rowsAfter,
      filterSlug: change.filter_slug,
      retailerKey: change.retailer_key,
    });
    if (!lookup.ok) {
      allDirectBuyable = false;
      noSearchUrls = false;
      continue;
    }
    const proof = gateProofForRowV1(lookup.row);
    gate_by_slug[change.filter_slug] = proof;
    if (lookup.row.browser_truth_classification?.trim() !== "direct_buyable") {
      allDirectBuyable = false;
    }
    if (
      isSearchOrCategoryUrl(lookup.row.affiliate_url) ||
      isSearchOrCategoryUrl(lookup.row.destination_url)
    ) {
      noSearchUrls = false;
    }
    if (proof.gate_failure_kind !== null) allDirectBuyable = false;
    if (proof.retailer_link_state !== RETAILER_LINK_STATES.LIVE_DIRECT_BUYABLE) {
      allDirectBuyable = false;
    }
  }

  let onlyTargetsChanged = true;
  for (let i = 0; i < args.rowsBefore.length; i++) {
    const before = args.rowsBefore[i]!;
    const after = args.rowsAfter[i]!;
    const changed = Object.keys(before).some((k) => (before[k] ?? "") !== (after[k] ?? ""));
    if (changed && !changedIndices.has(i)) {
      onlyTargetsChanged = false;
      break;
    }
  }

  const safeBefore = args.safeCtaBefore;
  const safeAfter = args.safeCtaAfter;
  const delta =
    safeBefore !== null && safeAfter !== null ? safeAfter - safeBefore : null;

  return {
    changed_row_count: changedIndices.size,
    target_slugs: targetSlugs,
    only_target_slugs_changed: onlyTargetsChanged,
    all_direct_buyable: allDirectBuyable,
    no_search_urls_on_targets: noSearchUrls,
    gate_by_slug,
    ap_safe_cta_count_before: safeBefore,
    ap_safe_cta_count_after: safeAfter,
    ap_safe_cta_delta: delta,
  };
}

export function loadAirPurifierApplyPlanV1(
  rootDir: string,
  planPath?: string,
  readText?: (absPath: string) => string,
): AirPurifierApplyPlannerReportV1 {
  const rel = planPath?.trim() || AP_APPLY_PLAN_DEFAULT_PATH_V1;
  const abs = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
  const read = readText ?? ((p) => readFileSync(p, "utf8"));
  if (!existsSync(abs)) {
    throw new Error(`Apply plan not found: ${rel}`);
  }
  return JSON.parse(read(abs)) as AirPurifierApplyPlannerReportV1;
}

export function runAirPurifierApplyExecutorV1(args: {
  rootDir: string;
  mode: ApApplyExecutorModeV1;
  planPath?: string;
  now?: () => Date;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
}): AirPurifierApplyExecutorReportV1 {
  const rootDir = args.rootDir;
  const readText = args.readText ?? ((p) => readFileSync(p, "utf8"));
  const writeText = args.writeText ?? ((p, c) => writeFileSync(p, c, "utf8"));
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const relPlanPath = args.planPath?.trim() || AP_APPLY_PLAN_DEFAULT_PATH_V1;
  const absPlanPath = path.isAbsolute(relPlanPath)
    ? relPlanPath
    : path.join(rootDir, relPlanPath);
  const absCsvPath = path.join(rootDir, AP_RETAILER_LINKS_CSV_REL_V1);

  const plan = loadAirPurifierApplyPlanV1(rootDir, relPlanPath, readText);
  const blocked_reasons: string[] = [];
  const validation_errors: string[] = [];
  const notes: string[] = [
    "Executor v1 mutates ONLY data/air-purifier/retailer_links.csv when --apply is set.",
    "planned_changes only — refused_changes and other review groups are never applied.",
  ];

  if (plan.report_name !== "air_purifier_apply_planner_v1") {
    blocked_reasons.push(`unexpected plan report_name: ${plan.report_name}`);
  }

  const planTargetFile = (plan as AirPurifierApplyPlannerReportV1 & { target_csv_file?: string })
    .target_csv_file;
  if (planTargetFile && planTargetFile !== AP_RETAILER_LINKS_CSV_REL_V1) {
    blocked_reasons.push(
      `target_csv_file must be ${AP_RETAILER_LINKS_CSV_REL_V1} (got ${planTargetFile})`,
    );
  }

  const planned = plan.planned_changes ?? [];
  const rollback_rows = plan.rollback_rows ?? [];

  if (args.mode === "apply") {
    if (plan.plan_status !== "READY_FOR_OWNER_APPROVAL") {
      blocked_reasons.push(`plan_status must be READY_FOR_OWNER_APPROVAL (got ${plan.plan_status})`);
    }
    if (plan.planned_change_count <= 0) {
      blocked_reasons.push("planned_change_count must be > 0");
    }
    if (plan.owner_approval_required !== true) {
      blocked_reasons.push("owner_approval_required must be true");
    }
  }

  const duplicate_targets = findDuplicatePlannedTargetsV1(planned);
  if (duplicate_targets.length > 0) {
    blocked_reasons.push(`duplicate planned targets: ${duplicate_targets.join(", ")}`);
  }

  for (const change of planned) {
    validation_errors.push(...validatePlannedChangeStructureV1(change));
  }

  const refusedSlugs = new Set((plan.refused_changes ?? []).map((r) => r.slug));
  for (const change of planned) {
    if (refusedSlugs.has(change.filter_slug)) {
      blocked_reasons.push(
        `${change.filter_slug}: slug also appears in refused_changes — cannot apply`,
      );
    }
  }

  const csvText = readText(absCsvPath);
  const headers = parseCsvHeadersFromTextV1(csvText);
  const rowsBefore = loadApRetailerLinksCsvV1(rootDir, readText);
  const safeCtaBefore = countApSafeCtaFromRowsV1(rowsBefore);

  let before_row_match_count = 0;
  const applyIndices: { index: number; change: ApPlannedChangeV1 }[] = [];

  for (const change of planned) {
    const lookup = findUniqueCsvRowV1({
      rows: rowsBefore,
      filterSlug: change.filter_slug,
      retailerKey: change.retailer_key,
    });
    if (!lookup.ok) {
      validation_errors.push(`${change.filter_slug}: csv lookup ${lookup.reason}`);
      continue;
    }
    if (!rowMatchesSnapshotV1(lookup.row, change.before_row)) {
      validation_errors.push(
        `${change.filter_slug}: current CSV row does not match plan before_row`,
      );
      continue;
    }
    before_row_match_count += 1;
    applyIndices.push({ index: lookup.index, change });
  }

  if (validation_errors.length > 0) {
    blocked_reasons.push(...validation_errors);
  }

  const preflight: ApApplyExecutorPreflightV1 = {
    plan_status: plan.plan_status,
    planned_change_count: plan.planned_change_count,
    owner_approval_required: plan.owner_approval_required,
    csv_row_count: rowsBefore.length,
    before_row_match_count,
    validation_errors,
    duplicate_targets,
  };

  const applyBlocked = blocked_reasons.length > 0 || applyIndices.length !== planned.length;

  if (args.mode === "dry_run") {
    const dryReady = !applyBlocked && planned.length > 0;
    return {
      report_name: AIR_PURIFIER_APPLY_EXECUTOR_REPORT_NAME_V1,
      generated_at: generatedAt,
      mode: "dry_run",
      data_mutation: false,
      source_plan_path: relPlanPath.replace(/\\/g, "/"),
      apply_status: dryReady ? "DRY_RUN_READY" : "BLOCKED",
      planned_change_count: plan.planned_change_count,
      applied_change_count: 0,
      changed_slugs: [],
      blocked_reasons,
      preflight,
      post_apply_validation: null,
      rollback_rows,
      notes: [
        ...notes,
        "Dry-run only — no CSV written. Pass --apply to mutate after owner approval.",
      ],
    };
  }

  if (applyBlocked) {
    return {
      report_name: AIR_PURIFIER_APPLY_EXECUTOR_REPORT_NAME_V1,
      generated_at: generatedAt,
      mode: "apply",
      data_mutation: false,
      source_plan_path: relPlanPath.replace(/\\/g, "/"),
      apply_status: "BLOCKED",
      planned_change_count: plan.planned_change_count,
      applied_change_count: 0,
      changed_slugs: [],
      blocked_reasons,
      preflight,
      post_apply_validation: null,
      rollback_rows,
      notes: [...notes, "Apply blocked — CSV not modified."],
    };
  }

  const rowsAfter = rowsBefore.map((r) => ({ ...r }));
  for (const { index, change } of applyIndices) {
    rowsAfter[index] = { ...rowsAfter[index], ...change.after_row };
  }

  const changedIndexSet = new Set(applyIndices.map(({ index }) => index));
  const serialized = applyPlannedChangesToCsvTextV1({
    csvText,
    headers,
    rows: rowsAfter,
    changedIndices: changedIndexSet,
  });
  writeText(absCsvPath, serialized);

  const safeCtaAfter = countApSafeCtaFromRowsV1(rowsAfter);
  const post_apply_validation = buildPostApplyValidationV1({
    rowsAfter,
    plannedChanges: planned,
    rowsBefore,
    safeCtaBefore,
    safeCtaAfter,
  });

  if (post_apply_validation.changed_row_count !== planned.length) {
    blocked_reasons.push(
      `post_apply changed_row_count ${post_apply_validation.changed_row_count} !== planned ${planned.length}`,
    );
  }
  if (!post_apply_validation.only_target_slugs_changed) {
    blocked_reasons.push("post_apply: non-target rows changed");
  }
  if (!post_apply_validation.all_direct_buyable) {
    blocked_reasons.push("post_apply: not all targets direct_buyable with null gate");
  }
  if (!post_apply_validation.no_search_urls_on_targets) {
    blocked_reasons.push("post_apply: target rows still have search URLs");
  }
  if (
    post_apply_validation.ap_safe_cta_delta !== null &&
    post_apply_validation.ap_safe_cta_delta !== planned.length
  ) {
    blocked_reasons.push(
      `post_apply: ap_safe_cta_delta ${post_apply_validation.ap_safe_cta_delta} expected ${planned.length}`,
    );
  }

  const finalStatus: ApApplyExecutorStatusV1 =
    blocked_reasons.length > 0 ? "BLOCKED" : "APPLIED";

  return {
    report_name: AIR_PURIFIER_APPLY_EXECUTOR_REPORT_NAME_V1,
    generated_at: generatedAt,
    mode: "apply",
    data_mutation: finalStatus === "APPLIED",
    source_plan_path: relPlanPath.replace(/\\/g, "/"),
    apply_status: finalStatus,
    planned_change_count: plan.planned_change_count,
    applied_change_count: finalStatus === "APPLIED" ? planned.length : 0,
    changed_slugs: finalStatus === "APPLIED" ? planned.map((c) => c.filter_slug) : [],
    blocked_reasons,
    preflight,
    post_apply_validation,
    rollback_rows,
    notes: [
      ...notes,
      finalStatus === "APPLIED"
        ? `Applied ${planned.length} row(s) to ${AP_RETAILER_LINKS_CSV_REL_V1}.`
        : "Apply completed with post-validation failures — review blocked_reasons.",
    ],
  };
}

export function renderAirPurifierApplyExecutorMarkdownV1(
  report: AirPurifierApplyExecutorReportV1,
): string {
  const lines: string[] = [
    "# Air Purifier Apply Run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Mode | **${report.mode}** |`,
    `| Apply status | **${report.apply_status}** |`,
    `| Data mutation | ${report.data_mutation} |`,
    `| Planned | ${report.planned_change_count} |`,
    `| Applied | ${report.applied_change_count} |`,
    `| Source plan | \`${report.source_plan_path}\` |`,
    "",
  ];

  if (report.changed_slugs.length > 0) {
    lines.push("## Changed slugs", "", report.changed_slugs.map((s) => `- ${s}`).join("\n"), "");
  }

  if (report.blocked_reasons.length > 0) {
    lines.push("## Blocked reasons", "");
    for (const r of report.blocked_reasons) lines.push(`- ${r}`);
    lines.push("");
  }

  if (report.post_apply_validation) {
    const p = report.post_apply_validation;
    lines.push("## Post-apply validation", "");
    lines.push(`- Changed rows: ${p.changed_row_count}`);
    lines.push(`- Only targets changed: ${p.only_target_slugs_changed}`);
    lines.push(`- All direct_buyable: ${p.all_direct_buyable}`);
    lines.push(`- No search URLs on targets: ${p.no_search_urls_on_targets}`);
    lines.push(
      `- AP safe_cta: ${p.ap_safe_cta_count_before} → ${p.ap_safe_cta_count_after} (Δ ${p.ap_safe_cta_delta})`,
    );
    lines.push("", "### Gate / link state", "");
    for (const [slug, proof] of Object.entries(p.gate_by_slug)) {
      lines.push(
        `- **${slug}**: gate=${proof.gate_failure_kind ?? "null"}, state=${proof.retailer_link_state}`,
      );
    }
    lines.push("");
  }

  lines.push("## Rollback", "");
  lines.push(
    `${report.rollback_rows.length} rollback row(s) from plan — restore before_row snapshots if reverting.`,
    "",
  );

  lines.push("## Notes", "");
  for (const n of report.notes) lines.push(`- ${n}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function parseAirPurifierApplyExecutorCliArgsV1(argv: string[]): {
  apply: boolean;
  planPath: string | null;
  outPath: string | null;
  markdownOutPath: string | null;
} {
  const read = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1]?.trim() ?? null) : null;
  };
  return {
    apply: argv.includes("--apply"),
    planPath: read("--plan"),
    outPath: read("--out"),
    markdownOutPath: read("--markdown-out"),
  };
}

export function assertApplyRunOutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.isAbsolute(outPath) ? outPath : path.resolve(rootDir, outPath);
  const normalized = abs.replace(/\\/g, "/");
  if (!normalized.includes("/data/air-purifier/batch-production/")) {
    throw new Error(`--out must be under data/air-purifier/batch-production/ (got ${outPath})`);
  }
}

export function writeApplyRunArtifactsV1(args: {
  report: AirPurifierApplyExecutorReportV1;
  outPath: string;
  markdownOutPath: string | null;
  rootDir: string;
}): { jsonPath: string; markdownPath: string | null } {
  const absJson = path.isAbsolute(args.outPath)
    ? args.outPath
    : path.resolve(args.rootDir, args.outPath);
  assertApplyRunOutPathAllowedV1(absJson, args.rootDir);
  mkdirSync(path.dirname(absJson), { recursive: true });
  writeFileSync(absJson, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");

  let markdownPath: string | null = null;
  if (args.markdownOutPath) {
    const absMd = path.isAbsolute(args.markdownOutPath)
      ? args.markdownOutPath
      : path.resolve(args.rootDir, args.markdownOutPath);
    assertApplyRunOutPathAllowedV1(absMd, args.rootDir);
    mkdirSync(path.dirname(absMd), { recursive: true });
    writeFileSync(absMd, renderAirPurifierApplyExecutorMarkdownV1(args.report), "utf8");
    markdownPath = absMd;
  }

  return { jsonPath: absJson, markdownPath };
}
