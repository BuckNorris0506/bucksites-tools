/**
 * Guarded GSWF wrong-part repair Supabase compatibility sync executor v1.
 * Default dry-run; real apply requires --apply, matching founder approval,
 * exact 13/26/13 plan shape, and BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1.
 * Dry-run never mutates. Apply remains fail-closed unless all gates pass.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  type GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1,
} from "./gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1";

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1 =
  "gswf_wrong_part_repair_supabase_compat_sync_guarded_apply_v1" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-guarded-dry-run-v1.json" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-guarded-dry-run-v1.md" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 13,
  planned_removals: 26,
  planned_additions: 13,
  conflict_requires_review: 13,
  planned_row_deltas: 39,
} as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
] as const;

export type SupabaseCompatSyncPlannedChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
};

export type SupabaseCompatSyncWriteResultV1 = {
  ok: boolean;
  errors: string[];
  applied_removal_count: number;
  applied_addition_count: number;
  applied_row_keys: string[];
};

export type ApplySupabaseCompatSyncDeltasFnV1 = (
  deltas: SupabaseCompatSyncPlannedChangeV1[],
) => Promise<SupabaseCompatSyncWriteResultV1>;

export type GswfSupabaseCompatSyncPlanSyncStateV1 =
  | "pending_conflict_sync"
  | "already_in_sync"
  | "invalid";

export type GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1 = {
  contract: typeof GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  csv_mutation_authorized: false;
  mutation_flag_enabled: boolean;
  plan_sync_state: GswfSupabaseCompatSyncPlanSyncStateV1;
  apply_status: "DRY_RUN_READY" | "ALREADY_IN_SYNC" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  sync_plan_rel_path: string;
  sync_plan_sha256: string | null;
  owner_approval_rel_path: string;
  owner_approval_present: boolean;
  owner_approval_decision_id: string | null;
  owner_approval_valid: boolean;
  owner_approval_required_for_apply: true;
  csv_apply_commit: typeof GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  classification_counts: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null;
  excluded_slugs_untouched: string[];
  planned_supabase_row_deltas: SupabaseCompatSyncPlannedChangeV1[];
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  applied_supabase_row_keys: string[];
  generated_at: string;
  source_command: typeof GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

type SupabaseSyncOwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  sync_plan_rel_path?: string;
  approved_slug_count?: number;
  approved_removals?: number;
  approved_additions?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  gswf_wrong_part_repair_supabase_compat_sync_owner_approval_context_v1?: SupabaseSyncOwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

export function isGswfSupabaseCompatSyncMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1] === "1";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadSyncPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): {
  plan: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1 | null;
  errors: string[];
  sha256: string | null;
} {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, errors: [`sync plan artifact missing: ${relPath}`], sha256: null };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1;
  if (plan.contract !== GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1) {
    return {
      plan: null,
      errors: [
        `sync plan contract mismatch: expected ${GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1}, got ${String((plan as { contract?: string }).contract)}`,
      ],
      sha256,
    };
  }
  return { plan, errors: [], sha256 };
}

function findOwnerApprovalRow(args: {
  rootDir: string;
  relPath: string;
  syncPlanRelPath: string;
  syncPlanSha256: string | null;
  expectedSlugCount: number;
  expectedRemovals: number;
  expectedAdditions: number;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { present: boolean; row: RawRegistryRowV1 | null; errors: string[] } {
  const errors: string[] = [];
  const approvalAbs = path.join(args.rootDir, args.relPath);
  if (!existsSync(approvalAbs)) {
    return {
      present: false,
      row: null,
      errors: [`owner approval file missing: ${args.relPath}`],
    };
  }

  const doc = JSON.parse(args.readText(approvalAbs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return {
      present: true,
      row: null,
      errors: [`owner approval document invalid: ${validated.errors.join("; ")}`],
    };
  }

  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;

    const ctx = row.gswf_wrong_part_repair_supabase_compat_sync_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_supabase_compat_sync_plan") continue;
    if (ctx?.sync_plan_rel_path !== args.syncPlanRelPath) {
      errors.push(
        `owner approval sync_plan_rel_path mismatch: expected ${args.syncPlanRelPath}, got ${ctx?.sync_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (ctx?.approved_slug_count !== args.expectedSlugCount) {
      errors.push(
        `owner approval approved_slug_count mismatch: expected ${String(args.expectedSlugCount)}, got ${String(ctx?.approved_slug_count ?? "missing")}`,
      );
      continue;
    }
    if (ctx?.approved_removals !== args.expectedRemovals) {
      errors.push(
        `owner approval approved_removals mismatch: expected ${String(args.expectedRemovals)}, got ${String(ctx?.approved_removals ?? "missing")}`,
      );
      continue;
    }
    if (ctx?.approved_additions !== args.expectedAdditions) {
      errors.push(
        `owner approval approved_additions mismatch: expected ${String(args.expectedAdditions)}, got ${String(ctx?.approved_additions ?? "missing")}`,
      );
      continue;
    }

    const bound = row.bound_artifacts_v1 ?? [];
    const syncBinding = bound.find((b) => b.artifact_rel_path === args.syncPlanRelPath);
    if (!syncBinding) {
      errors.push(
        `owner approval missing bound_artifacts_v1 entry for sync plan ${args.syncPlanRelPath}`,
      );
      continue;
    }
    if (!args.syncPlanSha256 || syncBinding.sha256_at_binding !== args.syncPlanSha256) {
      errors.push(
        `owner approval bound sync plan sha mismatch: expected ${args.syncPlanSha256 ?? "missing"}, got ${syncBinding.sha256_at_binding}`,
      );
      continue;
    }

    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: rowValidation.row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) {
      errors.push(`owner approval row fails mutation approval gate: ${gate.blockers.join(",")}`);
      continue;
    }
    return { present: true, row, errors: [] };
  }

  errors.push(
    "no matching owner approval row with approve_supabase_compat_sync_plan for this sync plan",
  );
  return { present: true, row: null, errors };
}

function validatePlanShape(plan: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1): {
  errors: string[];
  removals: SupabaseCompatSyncPlannedChangeV1[];
  additions: SupabaseCompatSyncPlannedChangeV1[];
  excludedSlugs: string[];
  plan_sync_state: GswfSupabaseCompatSyncPlanSyncStateV1;
} {
  const errors: string[] = [];
  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);

  if (plan.read_only !== true) {
    errors.push("sync plan read_only must be true");
  }
  if (plan.data_mutation !== false) {
    errors.push("sync plan data_mutation must be false");
  }
  if (plan.supabase_mutation_authorized !== false) {
    errors.push("sync plan supabase_mutation_authorized must be false");
  }
  if (plan.apply_authorized !== false) {
    errors.push("sync plan apply_authorized must be false");
  }
  if (plan.csv_apply_commit !== GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1) {
    errors.push(
      `sync plan csv_apply_commit mismatch: expected ${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}, got ${String(plan.csv_apply_commit)}`,
    );
  }

  if (plan.planned_slug_count !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `planned_slug_count expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_slug_count)}`,
    );
  }
  if (plan.rows.length !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `plan.rows.length expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.rows.length)}`,
    );
  }

  const plannedSlugs = sortedUnique(plan.rows.map((row) => row.fridge_slug));
  const expectedSlugs = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(plannedSlugs) !== JSON.stringify(expectedSlugs)) {
    errors.push(
      `planned slug set mismatch — expected ${expectedSlugs.join(",")}, got ${plannedSlugs.join(",")}`,
    );
  }

  const expectedExcluded = sortedUnique([
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ]);
  const planExcluded = sortedUnique(plan.excluded_slugs_untouched ?? []);
  if (JSON.stringify(planExcluded) !== JSON.stringify(expectedExcluded)) {
    errors.push(
      `excluded_slugs_untouched mismatch — expected ${expectedExcluded.join("|")}, got ${planExcluded.join("|")}`,
    );
  }
  for (const slug of expectedExcluded) {
    if (plannedSlugs.includes(slug)) {
      errors.push(`excluded slug ${slug} appears in planned sync rows`);
    }
  }

  if (plan.classification_counts.UNKNOWN_READ_FAILED !== 0) {
    errors.push(
      `classification_counts.UNKNOWN_READ_FAILED expected 0, got ${String(plan.classification_counts.UNKNOWN_READ_FAILED)}`,
    );
  }

  const summaryRemovals = plan.proposed_supabase_change_summary?.removals ?? [];
  const summaryAdditions = plan.proposed_supabase_change_summary?.additions ?? [];
  const inSyncCount = plan.classification_counts.IN_SYNC;
  const conflictCount = plan.classification_counts.CONFLICT_REQUIRES_REVIEW;

  const looksAlreadyInSync =
    inSyncCount === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count &&
    conflictCount === 0 &&
    summaryRemovals.length === 0 &&
    summaryAdditions.length === 0;

  const looksPendingConflict =
    conflictCount === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.conflict_requires_review &&
    inSyncCount === 0 &&
    summaryRemovals.length === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals &&
    summaryAdditions.length === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions;

  if (!looksAlreadyInSync && !looksPendingConflict) {
    errors.push(
      `sync plan is neither pending 13/26/13 conflict sync nor already IN_SYNC=13 (IN_SYNC=${String(inSyncCount)}, CONFLICT=${String(conflictCount)}, removals=${String(summaryRemovals.length)}, additions=${String(summaryAdditions.length)})`,
    );
  }

  const removals: SupabaseCompatSyncPlannedChangeV1[] = [];
  const additions: SupabaseCompatSyncPlannedChangeV1[] = [];

  for (const change of summaryRemovals) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    if (!family.has(filter_slug)) {
      errors.push(`planned supabase removal is not gswf/gswf2: ${fridge_slug},${filter_slug}`);
    }
    if (expectedExcluded.includes(fridge_slug)) {
      errors.push(`planned supabase removal touches excluded slug: ${fridge_slug}`);
    }
    if (!plannedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase removal for non-planned slug: ${fridge_slug}`);
    }
    removals.push({
      operation: "remove",
      fridge_slug,
      filter_slug,
      row_key: rowKey(fridge_slug, filter_slug),
    });
  }

  for (const change of summaryAdditions) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    if (family.has(filter_slug)) {
      errors.push(`planned supabase addition must not re-add wrong family: ${fridge_slug},${filter_slug}`);
    }
    if (expectedExcluded.includes(fridge_slug)) {
      errors.push(`planned supabase addition touches excluded slug: ${fridge_slug}`);
    }
    if (!plannedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase addition for non-planned slug: ${fridge_slug}`);
    }
    additions.push({
      operation: "add",
      fridge_slug,
      filter_slug,
      row_key: rowKey(fridge_slug, filter_slug),
    });
  }

  const rowRemovals = plan.rows.flatMap((row) => row.proposed_supabase_removals ?? []);
  const rowAdditions = plan.rows.flatMap((row) => row.proposed_supabase_additions ?? []);
  if (rowRemovals.length !== summaryRemovals.length) {
    errors.push(
      `row proposed_supabase_removals (${String(rowRemovals.length)}) !== summary removals (${String(summaryRemovals.length)})`,
    );
  }
  if (rowAdditions.length !== summaryAdditions.length) {
    errors.push(
      `row proposed_supabase_additions (${String(rowAdditions.length)}) !== summary additions (${String(summaryAdditions.length)})`,
    );
  }

  if (looksPendingConflict) {
    const totalDeltas = removals.length + additions.length;
    if (totalDeltas !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas) {
      errors.push(
        `planned row deltas expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas)}, got ${String(totalDeltas)}`,
      );
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      removals,
      additions,
      excludedSlugs: expectedExcluded,
      plan_sync_state: "invalid",
    };
  }

  return {
    errors: [],
    removals,
    additions,
    excludedSlugs: expectedExcluded,
    plan_sync_state: looksAlreadyInSync ? "already_in_sync" : "pending_conflict_sync",
  };
}

async function resolveFridgeModelId(
  supabase: { from: (table: string) => any },
  fridgeSlug: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("fridge_models")
    .select("id")
    .eq("slug", fridgeSlug)
    .maybeSingle();
  if (error) return { id: null, error: `fridge_models lookup failed for ${fridgeSlug}: ${error.message}` };
  if (!data?.id) return { id: null, error: `fridge_models row not found for slug ${fridgeSlug}` };
  return { id: String(data.id), error: null };
}

async function resolveFilterId(
  supabase: { from: (table: string) => any },
  filterSlug: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("filters")
    .select("id")
    .eq("slug", filterSlug)
    .maybeSingle();
  if (error) return { id: null, error: `filters lookup failed for ${filterSlug}: ${error.message}` };
  if (!data?.id) return { id: null, error: `filters row not found for slug ${filterSlug}` };
  return { id: String(data.id), error: null };
}

/**
 * Live Supabase writer — only invoked after all apply gates pass.
 * Tests must inject a mock and must not call this against production.
 */
export async function defaultApplyGswfSupabaseCompatSyncDeltasV1(
  deltas: SupabaseCompatSyncPlannedChangeV1[],
): Promise<SupabaseCompatSyncWriteResultV1> {
  const errors: string[] = [];
  const applied_row_keys: string[] = [];
  let applied_removal_count = 0;
  let applied_addition_count = 0;

  if (deltas.length !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas) {
    return {
      ok: false,
      errors: [
        `writer refused unexpected delta count ${String(deltas.length)} (expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas)})`,
      ],
      applied_removal_count: 0,
      applied_addition_count: 0,
      applied_row_keys: [],
    };
  }

  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    for (const delta of deltas) {
      const fridge = await resolveFridgeModelId(supabase, delta.fridge_slug);
      if (fridge.error || !fridge.id) {
        errors.push(fridge.error ?? `missing fridge id for ${delta.fridge_slug}`);
        continue;
      }
      const filter = await resolveFilterId(supabase, delta.filter_slug);
      if (filter.error || !filter.id) {
        errors.push(filter.error ?? `missing filter id for ${delta.filter_slug}`);
        continue;
      }

      if (delta.operation === "remove") {
        const { error } = await supabase
          .from("compatibility_mappings")
          .delete()
          .eq("fridge_model_id", fridge.id)
          .eq("filter_id", filter.id);
        if (error) {
          errors.push(`delete failed for ${delta.row_key}: ${error.message}`);
          continue;
        }
        applied_removal_count += 1;
        applied_row_keys.push(delta.row_key);
      } else {
        const { data: existing, error: exErr } = await supabase
          .from("compatibility_mappings")
          .select("fridge_model_id")
          .eq("fridge_model_id", fridge.id)
          .eq("filter_id", filter.id)
          .limit(1);
        if (exErr) {
          errors.push(`pre-insert lookup failed for ${delta.row_key}: ${exErr.message}`);
          continue;
        }
        if ((existing ?? []).length === 0) {
          const { error } = await supabase.from("compatibility_mappings").insert({
            fridge_model_id: fridge.id,
            filter_id: filter.id,
          });
          if (error) {
            errors.push(`insert failed for ${delta.row_key}: ${error.message}`);
            continue;
          }
        }
        applied_addition_count += 1;
        applied_row_keys.push(delta.row_key);
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return {
    ok: errors.length === 0,
    errors,
    applied_removal_count,
    applied_addition_count,
    applied_row_keys,
  };
}

export type RunGswfWrongPartRepairSupabaseCompatSyncGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  syncPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applySupabaseCompatSyncDeltas?: ApplySupabaseCompatSyncDeltasFnV1;
};

export async function runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1(
  deps: RunGswfWrongPartRepairSupabaseCompatSyncGuardedApplyDepsV1,
): Promise<GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const fileExists = deps.fileExists ?? ((absPath: string) => existsSync(absPath));
  const env = deps.env ?? process.env;
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isGswfSupabaseCompatSyncMutationEnabledV1(env);

  const syncPlanRelPath =
    deps.syncPlanRelPath ?? GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];

  const loaded = loadSyncPlan(deps.rootDir, syncPlanRelPath, readText);
  blocked_reasons.push(...loaded.errors);

  let removals: SupabaseCompatSyncPlannedChangeV1[] = [];
  let additions: SupabaseCompatSyncPlannedChangeV1[] = [];
  let excludedSlugs = sortedUnique([
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ]);
  let classification_counts: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null =
    null;
  let planned_slug_count = 0;
  let plan_sync_state: GswfSupabaseCompatSyncPlanSyncStateV1 = "invalid";

  if (loaded.plan) {
    classification_counts = loaded.plan.classification_counts;
    planned_slug_count = loaded.plan.planned_slug_count;
    const shape = validatePlanShape(loaded.plan);
    blocked_reasons.push(...shape.errors);
    removals = shape.removals;
    additions = shape.additions;
    excludedSlugs = shape.excludedSlugs;
    plan_sync_state = shape.plan_sync_state;
  }

  const approvalAbs = path.join(deps.rootDir, ownerApprovalRelPath);
  const approvalFilePresent = fileExists(approvalAbs);
  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    syncPlanRelPath,
    syncPlanSha256: loaded.sha256,
    expectedSlugCount: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count,
    expectedRemovals: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals,
    expectedAdditions: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions,
    referenceTimeIso: generatedAt,
    readText,
  });

  const planned_supabase_row_deltas = [...removals, ...additions].sort((a, b) =>
    a.row_key.localeCompare(b.row_key),
  );

  // Post-apply / already-synced plan: never re-apply deltas; report explicit ALREADY_IN_SYNC.
  if (plan_sync_state === "already_in_sync" && blocked_reasons.length === 0) {
    const proven_facts = [
      `PROVEN: mode=${deps.mode}; apply_status=ALREADY_IN_SYNC; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
      `PROVEN: sync_plan_rel_path=${syncPlanRelPath}.`,
      `PROVEN: plan_sync_state=already_in_sync; IN_SYNC=13; CONFLICT_REQUIRES_REVIEW=0; planned_removals=0; planned_additions=0.`,
      `PROVEN: owner_approval_present=${String(approvalFilePresent)}; owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}.`,
      `PROVEN: excluded_slugs_untouched=${excludedSlugs.join("|")}.`,
      `PROVEN: csv_apply_commit=${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}.`,
      "PROVEN: no Supabase writes attempted — plan already in sync.",
    ];
    return {
      contract: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1,
      mode: deps.mode,
      read_only: true,
      data_mutation: false,
      supabase_mutation_authorized: false,
      csv_mutation_authorized: false,
      mutation_flag_enabled,
      plan_sync_state,
      apply_status: "ALREADY_IN_SYNC",
      blocked_reasons: [],
      sync_plan_rel_path: syncPlanRelPath,
      sync_plan_sha256: loaded.sha256,
      owner_approval_rel_path: ownerApprovalRelPath,
      owner_approval_present: approvalFilePresent,
      owner_approval_decision_id: approval.row?.decision_id ?? null,
      owner_approval_valid: approval.row != null,
      owner_approval_required_for_apply: true,
      csv_apply_commit: GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
      planned_slug_count,
      planned_removals: 0,
      planned_additions: 0,
      classification_counts,
      excluded_slugs_untouched: excludedSlugs,
      planned_supabase_row_deltas: [],
      planned_removal_row_keys: [],
      planned_addition_row_keys: [],
      applied_supabase_row_keys: [],
      generated_at: generatedAt,
      source_command: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1,
      proven_facts,
      unknown_facts: [
        "UNKNOWN: Whether future drift will reopen CONFLICT_REQUIRES_REVIEW for these 13 slugs.",
      ],
      risk_notes: [
        "Plan is already IN_SYNC — executor will not re-apply historical 26/13 deltas.",
        "Do not mutate retailer_links / buy CTA / sitemap / robots / Product JSON-LD / CSV from this executor.",
      ],
    };
  }

  if (deps.mode === "apply") {
    if (!approval.row) {
      blocked_reasons.push(...approval.errors);
      blocked_reasons.push(
        "apply mode blocked — matching founder supabase compat sync owner approval required",
      );
    }
    if (!mutation_flag_enabled) {
      blocked_reasons.push(
        `apply mode blocked — mutation flag absent (${GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required)`,
      );
    }
  }

  const gates_pass_for_apply =
    deps.mode === "apply" &&
    blocked_reasons.length === 0 &&
    approval.row != null &&
    mutation_flag_enabled &&
    plan_sync_state === "pending_conflict_sync" &&
    removals.length === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals &&
    additions.length === GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions &&
    planned_supabase_row_deltas.length ===
      GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas;

  const supabase_mutation_authorized = gates_pass_for_apply;

  let data_mutation = false;
  let apply_status: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1["apply_status"] =
    "BLOCKED";
  let applied_supabase_row_keys: string[] = [];

  if (deps.mode === "dry_run") {
    apply_status = blocked_reasons.length === 0 ? "DRY_RUN_READY" : "BLOCKED";
  } else if (gates_pass_for_apply) {
    const writer = deps.applySupabaseCompatSyncDeltas ?? defaultApplyGswfSupabaseCompatSyncDeltasV1;
    const writeResult = await writer(planned_supabase_row_deltas);
    if (!writeResult.ok) {
      blocked_reasons.push(...writeResult.errors.map((e) => `supabase write failed: ${e}`));
      apply_status = "BLOCKED";
      data_mutation = false;
    } else if (
      writeResult.applied_removal_count !==
        GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals ||
      writeResult.applied_addition_count !==
        GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions
    ) {
      blocked_reasons.push(
        `supabase write count mismatch: removals=${String(writeResult.applied_removal_count)} additions=${String(writeResult.applied_addition_count)} (expected 26/13)`,
      );
      apply_status = "BLOCKED";
      data_mutation = false;
    } else {
      data_mutation = true;
      apply_status = "APPLIED";
      applied_supabase_row_keys = [...writeResult.applied_row_keys].sort();
    }
  } else {
    apply_status = "BLOCKED";
    data_mutation = false;
  }

  const proven_facts = [
    `PROVEN: mode=${deps.mode}; apply_status=${apply_status}; data_mutation=${String(data_mutation)}; supabase_mutation_authorized=${String(supabase_mutation_authorized)}; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
    `PROVEN: sync_plan_rel_path=${syncPlanRelPath}.`,
    `PROVEN: plan_sync_state=${plan_sync_state}; planned_slug_count=${String(planned_slug_count)}; planned_removals=${String(removals.length)}; planned_additions=${String(additions.length)}.`,
    `PROVEN: owner_approval_present=${String(approvalFilePresent)}; owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}.`,
    `PROVEN: excluded_slugs_untouched=${excludedSlugs.join("|")}.`,
    `PROVEN: csv_apply_commit=${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}.`,
  ];
  if (deps.mode === "dry_run" && !approvalFilePresent) {
    proven_facts.push(
      `PROVEN: no founder approval artifact at ${ownerApprovalRelPath} (expected for this dry-run lane).`,
    );
  }
  if (apply_status === "DRY_RUN_READY") {
    proven_facts.push(
      "PROVEN: sync plan shape verified (pending_conflict_sync; removals=26; additions=13; CONFLICT_REQUIRES_REVIEW=13).",
    );
  }
  if (apply_status === "APPLIED") {
    proven_facts.push(
      `PROVEN: applied exactly ${String(applied_supabase_row_keys.length)} supabase compatibility_mappings row deltas.`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: When founder will create gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json.",
    "UNKNOWN: Whether a future founder session will set BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 for an authorized apply.",
  ];

  const risk_notes = [
    "Dry-run never mutates Supabase or CSV.",
    "Apply requires matching founder approval + BUCKPARTS_GSWF_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1 + exact pending 13/26/13 conflict plan.",
    "Already-synced IN_SYNC=13 plans return ALREADY_IN_SYNC and do not re-apply deltas.",
    "Do not run retailer_links / buy CTA / sitemap / robots / Product JSON-LD changes from this executor.",
    "Do not include PARTIAL or no-filter excluded slugs in any Supabase sync apply.",
    "Do not mutate data/compatibility_mappings.csv from this executor.",
  ];

  return {
    contract: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: !data_mutation,
    data_mutation,
    supabase_mutation_authorized,
    csv_mutation_authorized: false,
    mutation_flag_enabled,
    plan_sync_state,
    apply_status,
    blocked_reasons,
    sync_plan_rel_path: syncPlanRelPath,
    sync_plan_sha256: loaded.sha256,
    owner_approval_rel_path: ownerApprovalRelPath,
    owner_approval_present: approvalFilePresent,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_valid: approval.row != null,
    owner_approval_required_for_apply: true,
    csv_apply_commit: GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
    planned_slug_count,
    planned_removals: removals.length,
    planned_additions: additions.length,
    classification_counts,
    excluded_slugs_untouched: excludedSlugs,
    planned_supabase_row_deltas,
    planned_removal_row_keys: removals.map((row) => row.row_key).sort(),
    planned_addition_row_keys: additions.map((row) => row.row_key).sort(),
    applied_supabase_row_keys,
    generated_at: generatedAt,
    source_command: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(
  report: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1,
): string {
  const lines: string[] = [
    "# GSWF wrong-part repair — Supabase compatibility sync guarded dry-run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- supabase_mutation_authorized: **${String(report.supabase_mutation_authorized)}**`,
    `- mutation_flag_enabled: **${String(report.mutation_flag_enabled)}**`,
    `- plan_sync_state: **${report.plan_sync_state}**`,
    `- owner_approval_present: **${String(report.owner_approval_present)}**`,
    `- owner_approval_valid: **${String(report.owner_approval_valid)}**`,
    `- owner_approval_required_for_apply: **true**`,
    `- owner_approval_decision_id: \`${report.owner_approval_decision_id ?? "none"}\``,
    "",
    "## Sources",
    "",
    `- sync_plan: \`${report.sync_plan_rel_path}\``,
    `- sync_plan_sha256: \`${report.sync_plan_sha256 ?? "none"}\``,
    `- owner_approval: \`${report.owner_approval_rel_path}\``,
    `- csv_apply_commit: \`${report.csv_apply_commit}\``,
    "",
    "## Planned Supabase changes",
    "",
    `- planned_slug_count: ${String(report.planned_slug_count)}`,
    `- planned_removals: ${String(report.planned_removals)}`,
    `- planned_additions: ${String(report.planned_additions)}`,
    `- excluded_slugs_untouched: \`${report.excluded_slugs_untouched.join("|")}\``,
    "",
  ];

  if (report.classification_counts) {
    lines.push("## Classification counts (from sync plan)", "");
    for (const [key, value] of Object.entries(report.classification_counts)) {
      lines.push(`- **${key}**: ${String(value)}`);
    }
    lines.push("");
  }

  lines.push("## Exact Supabase row deltas", "");
  for (const delta of report.planned_supabase_row_deltas) {
    lines.push(`- **${delta.operation}** \`${delta.row_key}\``);
  }

  if (report.applied_supabase_row_keys.length > 0) {
    lines.push("", "## Applied Supabase row keys", "");
    for (const key of report.applied_supabase_row_keys) {
      lines.push(`- \`${key}\``);
    }
  }

  if (report.blocked_reasons.length > 0) {
    lines.push("", "## Blocked reasons", "", ...report.blocked_reasons.map((r) => `- ${r}`));
  }

  lines.push("", "## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of report.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1(args: {
  rootDir: string;
  report: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1;
  jsonRelPath?: string;
  mdRelPath?: string;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = args.jsonRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1;
  const mdRel = args.mdRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
