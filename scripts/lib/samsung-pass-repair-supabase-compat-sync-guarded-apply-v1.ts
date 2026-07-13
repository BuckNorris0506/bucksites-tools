/**
 * Guarded Samsung PASS 5 Supabase compatibility sync executor v1.
 * Default dry-run; real apply requires --apply, matching founder approval,
 * exact 5/6/5 plan shape, and BUCKPARTS_SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED=1.
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
import {
  tryLoadSupabaseCompatForModelV1,
  type SupabaseCompatLoadResultV1,
} from "./buckparts-page-factory-preflight-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
} from "./samsung-pass-repair-apply-plan-v1";
import { SAMSUNG_PASS_CSV_APPLY_COMMIT_V1 } from "./samsung-pass-repair-supabase-compat-parity-owner-review-v1";
import {
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1,
  samsungPassSupabaseCompatSyncAllowedRemovalKeysV1,
  type SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1,
  type SamsungPassSupabaseCompatSyncPlanSyncStateV1,
  type SamsungPassSupabaseCompatSyncPlannedChangeV1,
} from "./samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1";

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1 =
  "samsung_pass_repair_supabase_compat_sync_guarded_apply_v1" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/samsung-pass-repair-supabase-compat-sync-owner-approval-v1.json" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-sync-guarded-dry-run-v1.json" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-sync-guarded-dry-run-v1.md" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-supabase-compat-sync-guarded-apply" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENABLED" as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 = [
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
] as const;

export type SamsungPassSupabaseCompatSyncWriteResultV1 = {
  ok: boolean;
  errors: string[];
  applied_removal_count: number;
  applied_addition_count: number;
  applied_row_keys: string[];
};

export type ApplySamsungPassSupabaseCompatSyncDeltasFnV1 = (
  deltas: SamsungPassSupabaseCompatSyncPlannedChangeV1[],
) => Promise<SamsungPassSupabaseCompatSyncWriteResultV1>;

export type SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  mutation_flag_enabled: boolean;
  plan_sync_state: SamsungPassSupabaseCompatSyncPlanSyncStateV1 | "invalid";
  apply_status: "DRY_RUN_READY" | "ALREADY_APPLIED" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  sync_plan_rel_path: string;
  sync_plan_sha256: string | null;
  owner_approval_rel_path: string;
  owner_approval_present: boolean;
  owner_approval_valid: boolean;
  owner_approval_decision_id: string | null;
  owner_approval_required_for_apply: true;
  csv_apply_commit: typeof SAMSUNG_PASS_CSV_APPLY_COMMIT_V1;
  target_filter_slug: typeof SAMSUNG_PASS_TARGET_FILTER_SLUG_V1;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  planned_supabase_row_deltas: SamsungPassSupabaseCompatSyncPlannedChangeV1[];
  classification_counts: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null;
  applied_supabase_row_keys: string[];
  generated_at: string;
  source_command: typeof SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

type OwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  sync_plan_rel_path?: string;
  approved_slug_count?: number;
  approved_removals?: number;
  approved_additions?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  samsung_pass_repair_supabase_compat_sync_owner_approval_context_v1?: OwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

export function isSamsungPassSupabaseCompatSyncMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1] === "1";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadSyncPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): {
  plan: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1 | null;
  errors: string[];
  sha256: string | null;
} {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, errors: [`sync plan artifact missing: ${relPath}`], sha256: null };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1;
  if (plan.contract !== SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1) {
    return {
      plan: null,
      errors: [
        `sync plan contract mismatch: expected ${SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1}, got ${String((plan as { contract?: string }).contract)}`,
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
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { present: boolean; row: RawRegistryRowV1 | null; errors: string[] } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) {
    return {
      present: false,
      row: null,
      errors: [
        `matching founder Samsung PASS supabase-compat-sync owner approval required (${args.relPath})`,
      ],
    };
  }
  const doc = JSON.parse(args.readText(abs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return {
      present: true,
      row: null,
      errors: [`owner approval document invalid: ${validated.errors.join("; ")}`],
    };
  }

  const errors: string[] = [];
  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;

    const ctx = row.samsung_pass_repair_supabase_compat_sync_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_supabase_compat_sync_plan") continue;
    if (ctx?.sync_plan_rel_path !== args.syncPlanRelPath) {
      errors.push(
        `owner approval sync_plan_rel_path mismatch: expected ${args.syncPlanRelPath}, got ${ctx?.sync_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (
      ctx?.approved_slug_count !==
        SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count ||
      ctx?.approved_removals !==
        SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals ||
      ctx?.approved_additions !==
        SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions
    ) {
      errors.push(
        `owner approval counts must be slug=5 removals=6 additions=5 (got ${String(ctx?.approved_slug_count)}/${String(ctx?.approved_removals)}/${String(ctx?.approved_additions)})`,
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

    if (args.syncPlanSha256) {
      const bound = (row.bound_artifacts_v1 ?? []).find(
        (artifact) => artifact.artifact_rel_path === args.syncPlanRelPath,
      );
      if (!bound || bound.sha256_at_binding !== args.syncPlanSha256) {
        errors.push("owner approval bound sync-plan sha256 mismatch");
        continue;
      }
    }

    return { present: true, row, errors: [] };
  }

  errors.push("no matching Samsung PASS supabase-compat-sync owner approval row for this sync plan");
  return { present: true, row: null, errors };
}

function validatePlanShape(plan: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1): {
  errors: string[];
  removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[];
  additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[];
  plan_sync_state: SamsungPassSupabaseCompatSyncPlanSyncStateV1;
} {
  const errors: string[] = [];
  if (plan.read_only !== true) errors.push("sync plan read_only must be true");
  if (plan.data_mutation !== false) errors.push("sync plan data_mutation must be false");
  if (plan.supabase_mutation_authorized !== false) {
    errors.push("sync plan supabase_mutation_authorized must be false");
  }
  if (plan.csv_mutation_authorized !== false) {
    errors.push("sync plan csv_mutation_authorized must be false");
  }
  if (plan.buy_cta_authorized !== false) errors.push("sync plan buy_cta_authorized must be false");
  if (plan.retailer_links_mutation_authorized !== false) {
    errors.push("sync plan retailer_links_mutation_authorized must be false");
  }
  if (plan.sitemap_robots_mutation_authorized !== false) {
    errors.push("sync plan sitemap_robots_mutation_authorized must be false");
  }
  if (plan.product_json_ld_mutation_authorized !== false) {
    errors.push("sync plan product_json_ld_mutation_authorized must be false");
  }
  if (plan.target_filter_slug !== SAMSUNG_PASS_TARGET_FILTER_SLUG_V1) {
    errors.push(
      `target_filter_slug expected ${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}, got ${String(plan.target_filter_slug)}`,
    );
  }
  if (plan.csv_apply_commit !== SAMSUNG_PASS_CSV_APPLY_COMMIT_V1) {
    errors.push(
      `csv_apply_commit expected ${SAMSUNG_PASS_CSV_APPLY_COMMIT_V1}, got ${String(plan.csv_apply_commit)}`,
    );
  }
  if (
    plan.planned_slug_count !== SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count
  ) {
    errors.push(
      `planned_slug_count expected ${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_slug_count)}`,
    );
  }
  if ((plan.rows ?? []).length !== SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `plan.rows.length expected ${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String((plan.rows ?? []).length)}`,
    );
  }

  const plannedSlugs = sortedUnique((plan.rows ?? []).map((row) => row.fridge_slug));
  const expectedSlugs = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(plannedSlugs) !== JSON.stringify(expectedSlugs)) {
    errors.push(
      `planned slug set must be exactly the 5 Samsung PASS slugs — expected ${expectedSlugs.join(",")}, got ${plannedSlugs.join(",")}`,
    );
  }

  const allowedRemovalKeys = samsungPassSupabaseCompatSyncAllowedRemovalKeysV1();
  const allowedRemovalSet = new Set(allowedRemovalKeys);

  if (plan.plan_sync_state === "already_in_sync") {
    if (
      (plan.planned_supabase_removals?.length ?? 0) !== 0 ||
      plan.planned_supabase_row_removals !== 0 ||
      (plan.planned_supabase_additions?.length ?? 0) !== 0 ||
      plan.planned_supabase_row_additions !== 0
    ) {
      errors.push("already_in_sync plan must have zero planned removals and additions");
    }
    if (plan.classification_counts?.IN_SYNC !== 5) {
      errors.push("already_in_sync plan classification_counts.IN_SYNC must be 5");
    }
    return {
      errors,
      removals: [],
      additions: [],
      plan_sync_state: errors.length === 0 ? "already_in_sync" : "blocked_invalid",
    };
  }

  if (plan.plan_sync_state !== "pending_sync") {
    errors.push(
      `plan_sync_state must be pending_sync or already_in_sync, got ${String(plan.plan_sync_state)}`,
    );
    return { errors, removals: [], additions: [], plan_sync_state: "blocked_invalid" };
  }

  if (
    plan.planned_supabase_row_removals !==
    SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals
  ) {
    errors.push(
      `planned_supabase_row_removals expected ${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals)}, got ${String(plan.planned_supabase_row_removals)}`,
    );
  }
  if (
    plan.planned_supabase_row_additions !==
    SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions
  ) {
    errors.push(
      `planned_supabase_row_additions expected ${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions)}, got ${String(plan.planned_supabase_row_additions)}`,
    );
  }

  const removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
  for (const change of plan.planned_supabase_removals ?? []) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    const key = rowKey(fridge_slug, filter_slug);
    if (!allowedRemovalSet.has(key)) {
      errors.push(
        `planned supabase removal is outside proven old da29-* allowlist: ${key}`,
      );
    }
    if (!expectedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase removal for non-PASS slug: ${fridge_slug}`);
    }
    if (!filter_slug.startsWith("da29-")) {
      errors.push(`planned supabase removal must be da29-* only: ${key}`);
    }
    removals.push({
      operation: "remove",
      fridge_slug,
      filter_slug,
      row_key: key,
    });
  }

  const removalKeys = removals.map((r) => r.row_key).sort();
  if (JSON.stringify(removalKeys) !== JSON.stringify(allowedRemovalKeys)) {
    errors.push(
      `planned removals must be exactly ${allowedRemovalKeys.join(" | ")}, got ${removalKeys.join(" | ") || "(none)"}`,
    );
  }

  const additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
  for (const change of plan.planned_supabase_additions ?? []) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    if (!expectedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase addition for non-PASS slug: ${fridge_slug}`);
    }
    if (filter_slug !== SAMSUNG_PASS_TARGET_FILTER_SLUG_V1) {
      errors.push(
        `planned supabase addition must be ${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1} only: ${fridge_slug},${filter_slug}`,
      );
    }
    additions.push({
      operation: "add",
      fridge_slug,
      filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
      row_key: rowKey(fridge_slug, SAMSUNG_PASS_TARGET_FILTER_SLUG_V1),
    });
  }

  const expectedAdditionKeys = expectedSlugs
    .map((slug) => rowKey(slug, SAMSUNG_PASS_TARGET_FILTER_SLUG_V1))
    .sort();
  const additionKeys = additions.map((r) => r.row_key).sort();
  if (JSON.stringify(additionKeys) !== JSON.stringify(expectedAdditionKeys)) {
    errors.push(
      `planned additions must be exactly 5 da97-17376b rows for the PASS slugs, got ${additionKeys.join(" | ") || "(none)"}`,
    );
  }

  return {
    errors,
    removals: removals.sort((a, b) => a.row_key.localeCompare(b.row_key)),
    additions: additions.sort((a, b) => a.row_key.localeCompare(b.row_key)),
    plan_sync_state: errors.length === 0 ? "pending_sync" : "blocked_invalid",
  };
}

async function resolveFridgeModelId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fridgeSlug: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("fridge_models")
    .select("id")
    .eq("slug", normalizeSlug(fridgeSlug))
    .maybeSingle();
  if (error) return { id: null, error: `fridge_models lookup failed for ${fridgeSlug}: ${error.message}` };
  if (!data?.id) return { id: null, error: `fridge_models row not found for slug ${fridgeSlug}` };
  return { id: String(data.id), error: null };
}

async function resolveFilterId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  filterSlug: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("filters")
    .select("id")
    .eq("slug", normalizeSlug(filterSlug))
    .maybeSingle();
  if (error) return { id: null, error: `filters lookup failed for ${filterSlug}: ${error.message}` };
  if (!data?.id) return { id: null, error: `filters row not found for slug ${filterSlug}` };
  return { id: String(data.id), error: null };
}

/**
 * Live Supabase writer — only invoked after all apply gates pass.
 * Tests must inject a mock and must not call this against production.
 */
export async function defaultApplySamsungPassSupabaseCompatSyncDeltasV1(
  deltas: SamsungPassSupabaseCompatSyncPlannedChangeV1[],
): Promise<SamsungPassSupabaseCompatSyncWriteResultV1> {
  const errors: string[] = [];
  const applied_row_keys: string[] = [];
  let applied_removal_count = 0;
  let applied_addition_count = 0;

  if (
    deltas.length !== SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas
  ) {
    return {
      ok: false,
      errors: [
        `writer refused unexpected delta count ${String(deltas.length)} (expected ${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas)})`,
      ],
      applied_removal_count: 0,
      applied_addition_count: 0,
      applied_row_keys: [],
    };
  }

  const allowedRemovalKeys = new Set(samsungPassSupabaseCompatSyncAllowedRemovalKeysV1());
  const expectedSlugs = new Set(
    [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map((slug) => normalizeSlug(slug)),
  );

  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    for (const delta of deltas) {
      if (!expectedSlugs.has(normalizeSlug(delta.fridge_slug))) {
        errors.push(`writer refused non-PASS slug ${delta.fridge_slug}`);
        continue;
      }
      if (delta.operation === "remove" && !allowedRemovalKeys.has(delta.row_key)) {
        errors.push(`writer refused non-allowlisted removal ${delta.row_key}`);
        continue;
      }
      if (
        delta.operation === "add" &&
        normalizeSlug(delta.filter_slug) !== SAMSUNG_PASS_TARGET_FILTER_SLUG_V1
      ) {
        errors.push(`writer refused non-target addition ${delta.row_key}`);
        continue;
      }

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

export type RunSamsungPassSupabaseCompatSyncGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  syncPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applySupabaseCompatSyncDeltas?: ApplySamsungPassSupabaseCompatSyncDeltasFnV1;
  /** Injectable live Supabase loader — used to detect post-apply already-in-sync state. */
  loadSupabaseCompat?: (
    fridgeSlug: string,
  ) => Promise<SupabaseCompatLoadResultV1> | SupabaseCompatLoadResultV1;
};

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

function buildAlreadyAppliedReport(args: {
  mode: "dry_run" | "apply";
  mutation_flag_enabled: boolean;
  syncPlanRelPath: string;
  syncPlanSha256: string | null;
  ownerApprovalRelPath: string;
  approvalPresent: boolean;
  approvalValid: boolean;
  approvalDecisionId: string | null;
  generatedAt: string;
  liveSource: "plan_artifact" | "live_supabase";
  classification_counts: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null;
}): SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1 {
  const liveNote =
    args.liveSource === "live_supabase"
      ? "PROVEN: live Supabase mappings for all 5 PASS slugs are already da97-17376b-only (checked independently of stale plan artifact)."
      : "PROVEN: plan_sync_state=already_in_sync from sync-plan artifact.";
  return {
    contract: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1,
    mode: args.mode,
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    mutation_flag_enabled: args.mutation_flag_enabled,
    plan_sync_state: "already_in_sync",
    apply_status: "ALREADY_APPLIED",
    blocked_reasons: [],
    sync_plan_rel_path: args.syncPlanRelPath,
    sync_plan_sha256: args.syncPlanSha256,
    owner_approval_rel_path: args.ownerApprovalRelPath,
    owner_approval_present: args.approvalPresent,
    owner_approval_valid: args.approvalValid,
    owner_approval_decision_id: args.approvalDecisionId,
    owner_approval_required_for_apply: true,
    csv_apply_commit: SAMSUNG_PASS_CSV_APPLY_COMMIT_V1,
    target_filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
    planned_slug_count: SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count,
    planned_removals: 0,
    planned_additions: 0,
    planned_removal_row_keys: [],
    planned_addition_row_keys: [],
    planned_supabase_row_deltas: [],
    classification_counts: args.classification_counts,
    applied_supabase_row_keys: [],
    generated_at: args.generatedAt,
    source_command: SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1,
    proven_facts: [
      `PROVEN: mode=${args.mode}; apply_status=ALREADY_APPLIED; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=${String(args.mutation_flag_enabled)}.`,
      "PROVEN: plan_sync_state=already_in_sync; planned_removals=0; planned_additions=0.",
      liveNote,
      "PROVEN: no Supabase writes attempted — mappings already in sync.",
      "PROVEN: CSV / retailer_links / buy CTA / sitemap / robots / Product JSON-LD remain out of scope.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether future drift will reintroduce old da29-* rows for these 5 PASS slugs in Supabase.",
    ],
    risk_notes: [
      "Live Supabase (or already_in_sync plan) shows da97-17376b-only — executor will not re-apply historical 6/5 deltas.",
      "Do not mutate CSV, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this executor.",
    ],
  };
}

async function liveMappingsAlreadyInSync(
  loadSupabase: (
    fridgeSlug: string,
  ) => Promise<SupabaseCompatLoadResultV1> | SupabaseCompatLoadResultV1,
): Promise<boolean> {
  for (const slug of SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1) {
    const live = await loadSupabase(slug);
    if (live.status !== "CHECKED") return false;
    const mappings = sortedUnique(live.supabase_filter_slugs);
    if (
      mappings.length !== 1 ||
      mappings[0] !== SAMSUNG_PASS_TARGET_FILTER_SLUG_V1
    ) {
      return false;
    }
  }
  return true;
}

export async function runSamsungPassRepairSupabaseCompatSyncGuardedApplyV1(
  deps: RunSamsungPassSupabaseCompatSyncGuardedApplyDepsV1,
): Promise<SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const env = deps.env ?? process.env;
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isSamsungPassSupabaseCompatSyncMutationEnabledV1(env);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;

  const syncPlanRelPath =
    deps.syncPlanRelPath ?? SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];
  const loaded = loadSyncPlan(deps.rootDir, syncPlanRelPath, readText);
  blocked_reasons.push(...loaded.errors);

  let removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
  let additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
  let plan_sync_state: SamsungPassSupabaseCompatSyncPlanSyncStateV1 | "invalid" = "invalid";
  let classification_counts: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null =
    null;

  if (loaded.plan) {
    classification_counts = loaded.plan.classification_counts;
    const shape = validatePlanShape(loaded.plan);
    blocked_reasons.push(...shape.errors);
    removals = shape.removals;
    additions = shape.additions;
    plan_sync_state = shape.errors.length === 0 ? shape.plan_sync_state : "blocked_invalid";
  }

  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    syncPlanRelPath,
    syncPlanSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });

  if (plan_sync_state === "already_in_sync" && blocked_reasons.length === 0) {
    return buildAlreadyAppliedReport({
      mode: deps.mode,
      mutation_flag_enabled,
      syncPlanRelPath,
      syncPlanSha256: loaded.sha256,
      ownerApprovalRelPath,
      approvalPresent: approval.present,
      approvalValid: approval.row != null,
      approvalDecisionId: approval.row?.decision_id ?? null,
      generatedAt,
      liveSource: "plan_artifact",
      classification_counts,
    });
  }

  // Post-apply: stale pending plan must still yield ALREADY_APPLIED when live is in sync.
  if (plan_sync_state === "pending_sync" && blocked_reasons.length === 0) {
    const inSync = await liveMappingsAlreadyInSync(loadSupabase);
    if (inSync) {
      return buildAlreadyAppliedReport({
        mode: deps.mode,
        mutation_flag_enabled,
        syncPlanRelPath,
        syncPlanSha256: loaded.sha256,
        ownerApprovalRelPath,
        approvalPresent: approval.present,
        approvalValid: approval.row != null,
        approvalDecisionId: approval.row?.decision_id ?? null,
        generatedAt,
        liveSource: "live_supabase",
        classification_counts: {
          IN_SYNC: 5,
          SUPABASE_STILL_HAS_OLD_ROWS: 0,
          SUPABASE_MISSING_TARGET: 0,
          CONFLICT: 0,
          UNKNOWN_READ_FAILED: 0,
        },
      });
    }
  }

  if (deps.mode === "apply") {
    if (!approval.row) {
      blocked_reasons.push(...approval.errors);
      blocked_reasons.push(
        "apply mode blocked — matching founder Samsung PASS supabase-compat-sync owner approval required",
      );
    }
    if (!mutation_flag_enabled) {
      blocked_reasons.push(
        `apply mode blocked — mutation flag absent (${SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 required)`,
      );
    }
  }

  const planned_supabase_row_deltas = [...removals, ...additions].sort((a, b) =>
    a.row_key.localeCompare(b.row_key),
  );
  const planned_removal_row_keys = removals.map((row) => row.row_key).sort();
  const planned_addition_row_keys = additions.map((row) => row.row_key).sort();

  const supabase_mutation_authorized =
    deps.mode === "apply" &&
    blocked_reasons.length === 0 &&
    Boolean(approval.row) &&
    mutation_flag_enabled &&
    plan_sync_state === "pending_sync" &&
    removals.length === SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals &&
    additions.length === SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions &&
    planned_supabase_row_deltas.length ===
      SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_row_deltas;

  let apply_status: SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1["apply_status"] =
    "BLOCKED";
  let data_mutation = false;
  const applied_supabase_row_keys: string[] = [];

  if (deps.mode === "dry_run") {
    apply_status = blocked_reasons.length === 0 ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!supabase_mutation_authorized) {
    apply_status = "BLOCKED";
  } else {
    const writer =
      deps.applySupabaseCompatSyncDeltas ?? defaultApplySamsungPassSupabaseCompatSyncDeltasV1;
    const writeResult = await writer(planned_supabase_row_deltas);
    if (!writeResult.ok) {
      blocked_reasons.push(...writeResult.errors.map((e) => `supabase write failed: ${e}`));
      apply_status = "BLOCKED";
    } else if (
      writeResult.applied_removal_count !==
        SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals ||
      writeResult.applied_addition_count !==
        SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions
    ) {
      blocked_reasons.push(
        `supabase write count mismatch: removals=${String(writeResult.applied_removal_count)} additions=${String(writeResult.applied_addition_count)} (expected 6/5)`,
      );
      apply_status = "BLOCKED";
    } else {
      data_mutation = true;
      apply_status = "APPLIED";
      applied_supabase_row_keys.push(...sortedUnique(writeResult.applied_row_keys));
    }
  }

  const proven_facts = [
    `PROVEN: mode=${deps.mode}; apply_status=${apply_status}; data_mutation=${String(data_mutation)}; supabase_mutation_authorized=${String(supabase_mutation_authorized)}; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
    `PROVEN: sync_plan_rel_path=${syncPlanRelPath}.`,
    `PROVEN: plan_sync_state=${plan_sync_state}; planned_slug_count=${String(SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}; planned_removals=${String(removals.length)}; planned_additions=${String(additions.length)}.`,
    `PROVEN: owner_approval_present=${String(approval.present)}; owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}.`,
    `PROVEN: csv_apply_commit=${SAMSUNG_PASS_CSV_APPLY_COMMIT_V1}; target_filter_slug=${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}.`,
    `PROVEN: allowed_removal_row_keys=${samsungPassSupabaseCompatSyncAllowedRemovalKeysV1().join(" | ")}.`,
    "PROVEN: csv_mutation_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
  ];
  if (deps.mode === "dry_run" && !approval.present) {
    proven_facts.push(
      `PROVEN: no founder approval artifact at ${ownerApprovalRelPath} (expected for this dry-run lane).`,
    );
  }
  if (apply_status === "DRY_RUN_READY") {
    proven_facts.push(
      "PROVEN: sync plan shape verified (pending_sync; removals=6; additions=5; slug_count=5).",
    );
  }
  if (apply_status === "APPLIED") {
    proven_facts.push(
      `PROVEN: applied exactly ${String(applied_supabase_row_keys.length)} supabase compatibility_mappings row deltas.`,
    );
  }

  return {
    contract: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: !data_mutation,
    data_mutation,
    supabase_mutation_authorized,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    mutation_flag_enabled,
    plan_sync_state,
    apply_status,
    blocked_reasons,
    sync_plan_rel_path: syncPlanRelPath,
    sync_plan_sha256: loaded.sha256,
    owner_approval_rel_path: ownerApprovalRelPath,
    owner_approval_present: approval.present,
    owner_approval_valid: approval.row != null,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_required_for_apply: true,
    csv_apply_commit: SAMSUNG_PASS_CSV_APPLY_COMMIT_V1,
    target_filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
    planned_slug_count: SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count,
    planned_removals: removals.length,
    planned_additions: additions.length,
    planned_removal_row_keys,
    planned_addition_row_keys,
    planned_supabase_row_deltas,
    classification_counts,
    applied_supabase_row_keys,
    generated_at: generatedAt,
    source_command: SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1,
    proven_facts,
    unknown_facts: [
      "UNKNOWN: When founder will create samsung-pass-repair-supabase-compat-sync-owner-approval-v1.json.",
      `UNKNOWN: Whether a future founder session will set ${SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 for an authorized apply.`,
    ],
    risk_notes: [
      "Dry-run never mutates Supabase or CSV.",
      `Apply requires matching founder approval + ${SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_MUTATION_ENV_FLAG_V1}=1 + exact pending 5/6/5 sync plan.`,
      "Already-synced live mappings return ALREADY_APPLIED and do not re-apply deltas.",
      "Do not mutate retailer_links / buy CTA / sitemap / robots / Product JSON-LD / CSV from this executor.",
      "Do not include non-PASS, GTE18, or GSWF slugs in any Samsung PASS Supabase sync apply.",
    ],
  };
}

export function buildSamsungPassRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(
  report: SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair — Supabase compatibility sync guarded dry-run v1",
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
    `- target_filter_slug: \`${report.target_filter_slug}\``,
    "",
    "## Planned Supabase changes",
    "",
    `- planned_slug_count: ${String(report.planned_slug_count)}`,
    `- planned_removals: ${String(report.planned_removals)}`,
    `- planned_additions: ${String(report.planned_additions)}`,
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
  if (report.planned_supabase_row_deltas.length === 0) lines.push("- none");

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

export function writeSamsungPassRepairSupabaseCompatSyncGuardedDryRunArtifactsV1(args: {
  rootDir: string;
  report: SamsungPassRepairSupabaseCompatSyncGuardedApplyReportV1;
  jsonRelPath?: string;
  mdRelPath?: string;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = args.jsonRelPath ?? SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1;
  const mdRel = args.mdRelPath ?? SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildSamsungPassRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
