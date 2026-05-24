/**
 * Guarded AP Supabase apply parity v1 — updates public.air_purifier_retailer_links only
 * for rows in ap-apply-plan-v1.json. No insert path; update-by-id on approved slot only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

import { AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1 } from "./air-purifier-apply-planner-batch-v2-v1";
import type {
  AirPurifierApplyPlannerReportV1,
  ApPlannedChangeV1,
  ApRetailerLinkCsvRowV1,
} from "./air-purifier-apply-planner-v1";
import {
  AIR_PURIFIER_APPLY_PLANNER_REPORT_NAME_V1,
  AP_RETAILER_LINKS_CSV_REL_V1,
} from "./air-purifier-apply-planner-v1";

export const AIR_PURIFIER_SUPABASE_PARITY_REPORT_NAME_V1 =
  "air_purifier_supabase_apply_parity_v1" as const;

export const AP_SUPABASE_PARITY_DEFAULT_PLAN_PATH_V1 =
  "data/air-purifier/batch-production/apply-plans/ap-apply-plan-v1.json" as const;

export const AP_SUPABASE_PARITY_DEFAULT_BATCH_V2_PLAN_PATH_V1 =
  "data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json" as const;

export const AP_SUPABASE_PARITY_TARGET_TABLE_V1 = "air_purifier_retailer_links" as const;

export const AP_SUPABASE_PARITY_ACCEPTED_REPORT_NAMES_V1 = [
  AIR_PURIFIER_APPLY_PLANNER_REPORT_NAME_V1,
  AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
] as const;

export type ApSupabaseParityPlanContractV1 = Pick<
  AirPurifierApplyPlannerReportV1,
  | "report_name"
  | "plan_status"
  | "planned_change_count"
  | "planned_changes"
  | "owner_approval_required"
> & {
  target_csv_file?: string;
};

export const AP_SUPABASE_PARITY_REQUIRED_RETAILER_KEY_V1 = "oem-catalog" as const;

export const AP_SUPABASE_PARITY_UPDATE_FIELDS_V1 = [
  "affiliate_url",
  "destination_url",
  "retailer_name",
  "is_primary",
  "retailer_key",
  "retailer_slug",
  "browser_truth_classification",
  "browser_truth_notes",
  "browser_truth_checked_at",
] as const;

export type ApSupabaseParityModeV1 = "dry_run" | "apply";

export type ApSupabaseParityApplyStatusV1 =
  | "DRY_RUN_READY"
  | "APPLIED"
  | "ALREADY_APPLIED"
  | "BLOCKED";

export type ApDbRetailerLinkRowV1 = {
  id: string;
  air_purifier_filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  destination_url: string;
  retailer_slug: string;
  retailer_key: string;
  is_primary: boolean;
  status: string;
  browser_truth_classification: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type ApSupabaseParityRowMatchModeV1 = "before_row" | "after_row" | "none";

export type ApSupabaseParityRowReportV1 = {
  filter_slug: string;
  filter_id: string | null;
  retailer_key: string;
  link_id: string | null;
  match_mode: ApSupabaseParityRowMatchModeV1;
  before_db: Partial<ApDbRetailerLinkRowV1>;
  after_db_projected: Record<string, unknown>;
  gate_after_projected: string | null;
  would_update: boolean;
  updated: boolean;
};

export type AirPurifierSupabaseParityReportV1 = {
  report_name: typeof AIR_PURIFIER_SUPABASE_PARITY_REPORT_NAME_V1;
  generated_at: string;
  mode: ApSupabaseParityModeV1;
  data_mutation: boolean;
  source_plan_path: string;
  target_table: typeof AP_SUPABASE_PARITY_TARGET_TABLE_V1;
  apply_status: ApSupabaseParityApplyStatusV1;
  planned_change_count: number;
  applied_change_count: number;
  already_applied_count: number;
  blocked_reasons: string[];
  rows: ApSupabaseParityRowReportV1[];
  notes: string[];
};

export type ApSupabaseParityDepsV1 = {
  resolveFilterIdBySlug: (slug: string) => Promise<string | null>;
  fetchApprovedLinks: (
    filterId: string,
    retailerKey: string,
  ) => Promise<ApDbRetailerLinkRowV1[]>;
  /** Update-only path — no insert API is exposed by design. */
  updateApprovedLink: (id: string, patch: Record<string, unknown>) => Promise<void>;
};

function normEmpty(value: unknown): string {
  return String(value ?? "").trim();
}

export function csvIsPrimaryToBooleanV1(value: string | undefined): boolean {
  return normEmpty(value).toLowerCase() === "true";
}

export function dbRowMatchesBeforeRowForParityV1(
  db: ApDbRetailerLinkRowV1,
  before: ApRetailerLinkCsvRowV1,
): boolean {
  return (
    normEmpty(db.affiliate_url) === normEmpty(before.affiliate_url) &&
    normEmpty(db.destination_url) === normEmpty(before.destination_url) &&
    normEmpty(db.retailer_name) === normEmpty(before.retailer_name) &&
    normEmpty(db.retailer_key).toLowerCase() === normEmpty(before.retailer_key).toLowerCase() &&
    normEmpty(db.retailer_slug) === normEmpty(before.retailer_slug) &&
    db.is_primary === csvIsPrimaryToBooleanV1(before.is_primary)
  );
}

export function normalizeParityComparableValueV1(field: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (field.endsWith("_checked_at") || field === "browser_truth_checked_at") {
    const raw = String(value).trim();
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
    return raw;
  }
  return value;
}

function parityComparableEqualV1(field: string, left: unknown, right: unknown): boolean {
  return normalizeParityComparableValueV1(field, left) === normalizeParityComparableValueV1(field, right);
}

export function dbRowMatchesPlanSnapshotV1(
  db: ApDbRetailerLinkRowV1,
  snapshot: ApRetailerLinkCsvRowV1,
): boolean {
  return (
    normEmpty(db.affiliate_url) === normEmpty(snapshot.affiliate_url) &&
    normEmpty(db.destination_url) === normEmpty(snapshot.destination_url) &&
    normEmpty(db.retailer_name) === normEmpty(snapshot.retailer_name) &&
    normEmpty(db.retailer_key).toLowerCase() === normEmpty(snapshot.retailer_key).toLowerCase() &&
    normEmpty(db.retailer_slug) === normEmpty(snapshot.retailer_slug) &&
    db.is_primary === csvIsPrimaryToBooleanV1(snapshot.is_primary) &&
    normEmpty(db.browser_truth_classification) ===
      normEmpty(snapshot.browser_truth_classification) &&
    normEmpty(db.browser_truth_notes) === normEmpty(snapshot.browser_truth_notes) &&
    parityComparableEqualV1(
      "browser_truth_checked_at",
      db.browser_truth_checked_at,
      snapshot.browser_truth_checked_at,
    )
  );
}

export function buildSupabaseUpdatePatchFromAfterRowV1(
  after: ApRetailerLinkCsvRowV1,
): Record<string, unknown> {
  const classification = normEmpty(after.browser_truth_classification);
  const notes = normEmpty(after.browser_truth_notes);
  const checkedAt = normEmpty(after.browser_truth_checked_at);
  return {
    affiliate_url: normEmpty(after.affiliate_url),
    destination_url: normEmpty(after.destination_url),
    retailer_name: normEmpty(after.retailer_name) || null,
    is_primary: csvIsPrimaryToBooleanV1(after.is_primary),
    retailer_key: normEmpty(after.retailer_key),
    retailer_slug: normEmpty(after.retailer_slug),
    browser_truth_classification: classification || null,
    browser_truth_notes: notes || null,
    browser_truth_checked_at: checkedAt || null,
  };
}

export function planAllowedSlugsV1(plan: ApSupabaseParityPlanContractV1): string[] {
  return (plan.planned_changes ?? []).map((change) => change.filter_slug);
}

export function isSlugAllowedByParityPlanV1(
  plan: ApSupabaseParityPlanContractV1,
  slug: string,
): boolean {
  return planAllowedSlugsV1(plan).includes(slug);
}

export function validateApSupabaseParityPlanV1(plan: ApSupabaseParityPlanContractV1): string[] {
  const reasons: string[] = [];

  if (
    !AP_SUPABASE_PARITY_ACCEPTED_REPORT_NAMES_V1.includes(
      plan.report_name as (typeof AP_SUPABASE_PARITY_ACCEPTED_REPORT_NAMES_V1)[number],
    )
  ) {
    reasons.push(`unexpected plan report_name: ${plan.report_name}`);
    return reasons;
  }

  if (plan.plan_status !== "READY_FOR_OWNER_APPROVAL") {
    reasons.push(`plan_status must be READY_FOR_OWNER_APPROVAL (got ${plan.plan_status})`);
  }
  if (plan.owner_approval_required !== true) {
    reasons.push("owner_approval_required must be true");
  }
  if (plan.planned_change_count !== (plan.planned_changes?.length ?? 0)) {
    reasons.push(
      `planned_change_count ${plan.planned_change_count} !== planned_changes.length ${plan.planned_changes?.length ?? 0}`,
    );
  }

  if (plan.target_csv_file && plan.target_csv_file !== AP_RETAILER_LINKS_CSV_REL_V1) {
    reasons.push(
      `target_csv_file must be ${AP_RETAILER_LINKS_CSV_REL_V1} (got ${plan.target_csv_file})`,
    );
  }

  const planned = plan.planned_changes ?? [];
  if (planned.length === 0) {
    reasons.push("planned_changes must be non-empty");
  }

  const slugSeen = new Set<string>();
  for (const change of planned) {
    if (slugSeen.has(change.filter_slug)) {
      reasons.push(`${change.filter_slug}: duplicate planned target in plan`);
    }
    slugSeen.add(change.filter_slug);

    if (
      normEmpty(change.retailer_key).toLowerCase() !==
      AP_SUPABASE_PARITY_REQUIRED_RETAILER_KEY_V1
    ) {
      reasons.push(
        `${change.filter_slug}: retailer_key must be ${AP_SUPABASE_PARITY_REQUIRED_RETAILER_KEY_V1}`,
      );
    }
    if (!change.before_row || !change.after_row) {
      reasons.push(`${change.filter_slug}: missing before_row or after_row`);
      continue;
    }
    if (normEmpty(change.after_row.browser_truth_classification) !== "direct_buyable") {
      reasons.push(
        `${change.filter_slug}: after_row browser_truth_classification must be direct_buyable`,
      );
    }

    const gate = gateFailureForProjectedRowV1(
      buildSupabaseUpdatePatchFromAfterRowV1(change.after_row),
    );
    if (gate !== null) {
      reasons.push(`${change.filter_slug}: gate_after_projected ${gate}`);
    }
  }

  return reasons;
}

export function loadApSupabaseParityPlanV1(
  rootDir: string,
  planPath?: string,
  readText?: (absPath: string) => string,
): ApSupabaseParityPlanContractV1 & {
  planned_changes: ApPlannedChangeV1[];
  planned_change_count: number;
} {
  const rel = planPath?.trim() || AP_SUPABASE_PARITY_DEFAULT_PLAN_PATH_V1;
  const abs = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
  const read = readText ?? ((p) => readFileSync(p, "utf8"));
  if (!readText && !existsSync(abs)) {
    throw new Error(`Apply plan not found: ${rel}`);
  }
  return JSON.parse(read(abs)) as ApSupabaseParityPlanContractV1 & {
    planned_changes: ApPlannedChangeV1[];
    planned_change_count: number;
  };
}

export function gateFailureForProjectedRowV1(
  projected: Record<string, unknown>,
): string | null {
  return buyLinkGateFailureKind({
    retailer_key: (projected.retailer_key as string | null) ?? null,
    affiliate_url: (projected.affiliate_url as string) ?? "",
    browser_truth_classification:
      (projected.browser_truth_classification as string | null) ?? null,
    browser_truth_buyable_subtype: null,
  });
}

export async function runAirPurifierSupabaseParityV1(args: {
  rootDir: string;
  mode: ApSupabaseParityModeV1;
  planPath?: string;
  deps: ApSupabaseParityDepsV1;
  now?: () => Date;
  readText?: (absPath: string) => string;
}): Promise<AirPurifierSupabaseParityReportV1> {
  const generatedAt = (args.now ?? (() => new Date()))().toISOString();
  const relPlanPath = args.planPath?.trim() || AP_SUPABASE_PARITY_DEFAULT_PLAN_PATH_V1;
  const plan = loadApSupabaseParityPlanV1(args.rootDir, relPlanPath, args.readText);
  const blocked_reasons = validateApSupabaseParityPlanV1(plan);
  const planned = plan.planned_changes ?? [];
  const rows: ApSupabaseParityRowReportV1[] = [];
  let applied_change_count = 0;
  let already_applied_count = 0;

  for (const change of planned) {
    const rowReport = await resolveParityRowV1({
      change,
      deps: args.deps,
      mode: args.mode,
      blocked_reasons,
    });
    rows.push(rowReport);
    if (rowReport.updated) applied_change_count += 1;
    if (rowReport.match_mode === "after_row" && !rowReport.would_update) {
      already_applied_count += 1;
    }
  }

  let apply_status: ApSupabaseParityApplyStatusV1 = "BLOCKED";
  if (blocked_reasons.length === 0) {
    const pending = rows.filter((r) => r.would_update).length;
    if (args.mode === "dry_run") {
      apply_status =
        pending > 0 ? "DRY_RUN_READY" : already_applied_count === planned.length ? "ALREADY_APPLIED" : "BLOCKED";
    } else if (applied_change_count > 0) {
      apply_status = "APPLIED";
    } else if (already_applied_count === planned.length) {
      apply_status = "ALREADY_APPLIED";
    }
  }

  const notes = [
    "Updates public.air_purifier_retailer_links only — no insert path.",
    "Matches approved rows by air_purifier_filter_id + retailer_key (status=approved).",
    "Do not use npm run seed:import:air-purifier for this parity apply.",
  ];

  return {
    report_name: AIR_PURIFIER_SUPABASE_PARITY_REPORT_NAME_V1,
    generated_at: generatedAt,
    mode: args.mode,
    data_mutation: args.mode === "apply" && applied_change_count > 0,
    source_plan_path: relPlanPath.replace(/\\/g, "/"),
    target_table: AP_SUPABASE_PARITY_TARGET_TABLE_V1,
    apply_status,
    planned_change_count: plan.planned_change_count,
    applied_change_count,
    already_applied_count,
    blocked_reasons,
    rows,
    notes,
  };
}

async function resolveParityRowV1(args: {
  change: ApPlannedChangeV1;
  deps: ApSupabaseParityDepsV1;
  mode: ApSupabaseParityModeV1;
  blocked_reasons: string[];
}): Promise<ApSupabaseParityRowReportV1> {
  const slug = args.change.filter_slug;
  const retailerKey = args.change.retailer_key;
  const afterProjected = buildSupabaseUpdatePatchFromAfterRowV1(args.change.after_row);
  const gateAfterProjected = gateFailureForProjectedRowV1(afterProjected);
  if (gateAfterProjected !== null) {
    args.blocked_reasons.push(`${slug}: gate_after_projected ${gateAfterProjected}`);
  }

  const emptyRow: ApSupabaseParityRowReportV1 = {
    filter_slug: slug,
    filter_id: null,
    retailer_key: retailerKey,
    link_id: null,
    match_mode: "none",
    before_db: {},
    after_db_projected: afterProjected,
    gate_after_projected: gateAfterProjected,
    would_update: false,
    updated: false,
  };

  const filterId = await args.deps.resolveFilterIdBySlug(slug);
  if (!filterId) {
    args.blocked_reasons.push(`${slug}: air_purifier_filters.slug not found`);
    return emptyRow;
  }

  const links = await args.deps.fetchApprovedLinks(filterId, retailerKey);
  if (links.length === 0) {
    args.blocked_reasons.push(
      `${slug}: zero approved ${AP_SUPABASE_PARITY_TARGET_TABLE_V1} rows for filter_id + retailer_key=${retailerKey}`,
    );
    return { ...emptyRow, filter_id: filterId };
  }
  if (links.length > 1) {
    args.blocked_reasons.push(
      `${slug}: multiple approved rows (${links.length}) for filter_id + retailer_key=${retailerKey}`,
    );
    return { ...emptyRow, filter_id: filterId };
  }

  const link = links[0]!;
  const beforeDb: Partial<ApDbRetailerLinkRowV1> = {
    id: link.id,
    affiliate_url: link.affiliate_url,
    destination_url: link.destination_url,
    retailer_name: link.retailer_name,
    is_primary: link.is_primary,
    retailer_key: link.retailer_key,
    retailer_slug: link.retailer_slug,
    status: link.status,
    browser_truth_classification: link.browser_truth_classification,
    browser_truth_notes: link.browser_truth_notes,
    browser_truth_checked_at: link.browser_truth_checked_at,
  };

  let match_mode: ApSupabaseParityRowMatchModeV1 = "none";
  if (dbRowMatchesPlanSnapshotV1(link, args.change.after_row)) {
    match_mode = "after_row";
  } else if (dbRowMatchesBeforeRowForParityV1(link, args.change.before_row)) {
    match_mode = "before_row";
  } else {
    args.blocked_reasons.push(
      `${slug}: DB row does not match plan before_row or after_row (id=${link.id})`,
    );
  }

  const would_update = match_mode === "before_row" && gateAfterProjected === null;
  let updated = false;

  if (would_update && args.mode === "apply") {
    await args.deps.updateApprovedLink(link.id, afterProjected);
    updated = true;
  }

  return {
    filter_slug: slug,
    filter_id: filterId,
    retailer_key: retailerKey,
    link_id: link.id,
    match_mode,
    before_db: beforeDb,
    after_db_projected: afterProjected,
    gate_after_projected: gateAfterProjected,
    would_update,
    updated,
  };
}

export function parseApSupabaseParityCliArgsV1(argv: string[]): {
  apply: boolean;
  planPath: string | null;
} {
  const read = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1]?.trim() ?? null) : null;
  };
  return {
    apply: argv.includes("--apply"),
    planPath: read("--plan"),
  };
}

export function createApSupabaseParityLiveDepsV1(
  getSupabaseAdmin: () => import("@supabase/supabase-js").SupabaseClient,
): ApSupabaseParityDepsV1 {
  return {
    async resolveFilterIdBySlug(slug) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("air_purifier_filters")
        .select("id")
        .ilike("slug", slug.trim())
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string } | null)?.id ?? null;
    },
    async fetchApprovedLinks(filterId, retailerKey) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from(AP_SUPABASE_PARITY_TARGET_TABLE_V1)
        .select(
          "id, air_purifier_filter_id, retailer_name, affiliate_url, destination_url, retailer_slug, retailer_key, is_primary, status, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
        )
        .eq("air_purifier_filter_id", filterId)
        .eq("retailer_key", retailerKey)
        .eq("status", "approved");
      if (error) throw error;
      return (data ?? []) as ApDbRetailerLinkRowV1[];
    },
    async updateApprovedLink(id, patch) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from(AP_SUPABASE_PARITY_TARGET_TABLE_V1)
        .update(patch)
        .eq("id", id)
        .eq("status", "approved");
      if (error) throw error;
    },
  };
}
