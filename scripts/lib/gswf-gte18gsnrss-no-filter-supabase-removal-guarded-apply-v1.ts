/**
 * Guarded ge-gte18gsnrss no-filter Supabase removal executor v1.
 * Default dry-run; real apply requires --apply, matching founder approval,
 * exact 1/2/0 plan shape, and BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENABLED=1.
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
  GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1,
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_EXPECTED_COUNTS_V1,
  type GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1,
  type Gte18SupabaseRemovalPlannedChangeV1,
  type Gte18SupabaseRemovalPlanSyncStateV1,
} from "./gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_APPLY_CONTRACT_V1 =
  "gswf_gte18gsnrss_no_filter_supabase_removal_guarded_apply_v1" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/gswf-gte18gsnrss-no-filter-supabase-removal-owner-approval-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-removal-guarded-dry-run-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-removal-guarded-dry-run-v1.md" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-guarded-apply" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENABLED" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1,
] as const;

export type Gte18SupabaseRemovalWriteResultV1 = {
  ok: boolean;
  errors: string[];
  applied_removal_count: number;
  applied_row_keys: string[];
};

export type ApplyGte18SupabaseRemovalDeltasFnV1 = (
  deltas: Gte18SupabaseRemovalPlannedChangeV1[],
) => Promise<Gte18SupabaseRemovalWriteResultV1>;

export type GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1 = {
  contract: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  mutation_flag_enabled: boolean;
  plan_sync_state: Gte18SupabaseRemovalPlanSyncStateV1 | "invalid";
  apply_status: "DRY_RUN_READY" | "ALREADY_APPLIED" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  apply_plan_rel_path: string;
  apply_plan_sha256: string | null;
  owner_approval_rel_path: string;
  owner_approval_present: boolean;
  owner_approval_valid: boolean;
  owner_approval_decision_id: string | null;
  owner_approval_required_for_apply: true;
  target_fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  planned_supabase_row_deltas: Gte18SupabaseRemovalPlannedChangeV1[];
  excluded_partial_slugs: string[];
  excluded_gswf_repaired_slugs: string[];
  applied_supabase_row_keys: string[];
  generated_at: string;
  source_command: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_SOURCE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

type OwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  apply_plan_rel_path?: string;
  approved_slug_count?: number;
  approved_removals?: number;
  approved_additions?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  gswf_gte18gsnrss_no_filter_supabase_removal_owner_approval_context_v1?: OwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

export function isGte18NoFilterSupabaseRemovalMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1] === "1";
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadApplyPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): {
  plan: GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1 | null;
  errors: string[];
  sha256: string | null;
} {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, errors: [`apply plan artifact missing: ${relPath}`], sha256: null };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1;
  if (plan.contract !== GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1) {
    return {
      plan: null,
      errors: [
        `apply plan contract mismatch: expected ${GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1}, got ${String((plan as { contract?: string }).contract)}`,
      ],
      sha256,
    };
  }
  return { plan, errors: [], sha256 };
}

function findOwnerApprovalRow(args: {
  rootDir: string;
  relPath: string;
  applyPlanRelPath: string;
  applyPlanSha256: string | null;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { present: boolean; row: RawRegistryRowV1 | null; errors: string[] } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) {
    return {
      present: false,
      row: null,
      errors: [`matching founder GTE18 supabase-removal owner approval required (${args.relPath})`],
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

    const ctx = row.gswf_gte18gsnrss_no_filter_supabase_removal_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_supabase_removal_plan" && optionId !== "approve_apply_plan") {
      continue;
    }
    if (ctx?.apply_plan_rel_path !== args.applyPlanRelPath) {
      errors.push(
        `owner approval apply_plan_rel_path mismatch: expected ${args.applyPlanRelPath}, got ${ctx?.apply_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (
      ctx?.approved_slug_count !== 1 ||
      ctx?.approved_removals !== 2 ||
      ctx?.approved_additions !== 0
    ) {
      errors.push(
        `owner approval counts must be slug=1 removals=2 additions=0 (got ${String(ctx?.approved_slug_count)}/${String(ctx?.approved_removals)}/${String(ctx?.approved_additions)})`,
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

    if (args.applyPlanSha256) {
      const bound = (row.bound_artifacts_v1 ?? []).find(
        (artifact) => artifact.artifact_rel_path === args.applyPlanRelPath,
      );
      if (!bound || bound.sha256_at_binding !== args.applyPlanSha256) {
        errors.push("owner approval bound apply-plan sha256 mismatch");
        continue;
      }
    }

    return { present: true, row, errors: [] };
  }

  errors.push("no matching GTE18 supabase-removal owner approval row for this apply plan");
  return { present: true, row: null, errors };
}

function validatePlanShape(plan: GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1): {
  errors: string[];
  removals: Gte18SupabaseRemovalPlannedChangeV1[];
  plan_sync_state: Gte18SupabaseRemovalPlanSyncStateV1;
} {
  const errors: string[] = [];
  if (plan.read_only !== true) errors.push("apply plan read_only must be true");
  if (plan.data_mutation !== false) errors.push("apply plan data_mutation must be false");
  if (plan.supabase_mutation_authorized !== false) {
    errors.push("apply plan supabase_mutation_authorized must be false");
  }
  if (plan.csv_mutation_authorized !== false) {
    errors.push("apply plan csv_mutation_authorized must be false");
  }
  if (plan.buy_cta_authorized !== false) errors.push("apply plan buy_cta_authorized must be false");
  if (plan.retailer_links_mutation_authorized !== false) {
    errors.push("apply plan retailer_links_mutation_authorized must be false");
  }
  if (plan.target_fridge_slug !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1) {
    errors.push(
      `target_fridge_slug expected ${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}, got ${plan.target_fridge_slug}`,
    );
  }
  if (plan.planned_slug_count !== 1) {
    errors.push(`planned_slug_count expected 1, got ${String(plan.planned_slug_count)}`);
  }
  if ((plan.planned_supabase_additions?.length ?? 0) !== 0 || plan.planned_supabase_row_additions !== 0) {
    errors.push("planned additions must be zero");
  }

  const expectedExcludedPartial = [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1];
  const expectedExcludedGswf13 = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1];
  if (JSON.stringify(plan.excluded_partial_slugs ?? []) !== JSON.stringify(expectedExcludedPartial)) {
    errors.push("excluded_partial_slugs mismatch");
  }
  if (
    JSON.stringify(plan.excluded_gswf_repaired_slugs ?? []) !== JSON.stringify(expectedExcludedGswf13)
  ) {
    errors.push("excluded_gswf_repaired_slugs mismatch");
  }

  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);
  const expectedKeys = GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map(
    (row) => `${row.fridge_slug},${row.filter_slug}`,
  ).sort();

  if (plan.plan_sync_state === "already_applied") {
    if ((plan.planned_supabase_removals?.length ?? 0) !== 0 || plan.planned_supabase_row_removals !== 0) {
      errors.push("already_applied plan must have zero planned removals");
    }
    if (plan.classification !== "IN_SYNC") {
      errors.push("already_applied plan classification must be IN_SYNC");
    }
    return { errors, removals: [], plan_sync_state: "already_applied" };
  }

  if (plan.plan_sync_state !== "pending_removal") {
    errors.push(`plan_sync_state must be pending_removal or already_applied, got ${plan.plan_sync_state}`);
    return { errors, removals: [], plan_sync_state: "blocked_invalid" };
  }

  if (plan.planned_supabase_row_removals !== 2) {
    errors.push(
      `planned_supabase_row_removals expected 2, got ${String(plan.planned_supabase_row_removals)}`,
    );
  }

  const actualKeys = (plan.planned_supabase_removals ?? [])
    .map((row) => normalizeSlug(row.row_key || `${row.fridge_slug},${row.filter_slug}`))
    .sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    errors.push(
      `planned removals must be exactly ${expectedKeys.join(" | ")}, got ${actualKeys.join(" | ") || "(none)"}`,
    );
  }

  const removals: Gte18SupabaseRemovalPlannedChangeV1[] = [];
  for (const row of plan.planned_supabase_removals ?? []) {
    const fridge_slug = normalizeSlug(row.fridge_slug);
    const filter_slug = normalizeSlug(row.filter_slug);
    if (fridge_slug !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1) {
      errors.push(`planned removal touches non-target slug: ${fridge_slug}`);
    }
    if (!family.has(filter_slug)) {
      errors.push(`planned removal filter must be gswf/gswf2: ${filter_slug}`);
    }
    if ((GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 as readonly string[]).includes(fridge_slug)) {
      errors.push(`planned removal touches PARTIAL slug: ${fridge_slug}`);
    }
    if ((GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1 as readonly string[]).includes(fridge_slug)) {
      errors.push(`planned removal touches GSWF-13 repaired slug: ${fridge_slug}`);
    }
    if (filter_slug !== "gswf" && filter_slug !== "gswf2") {
      errors.push(`invalid removal filter_slug: ${filter_slug}`);
      continue;
    }
    removals.push({
      operation: "remove",
      fridge_slug: GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
      filter_slug,
      row_key: `${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1},${filter_slug}`,
    });
  }

  return {
    errors,
    removals: removals.sort((a, b) => a.row_key.localeCompare(b.row_key)),
    plan_sync_state: errors.length === 0 ? "pending_removal" : "blocked_invalid",
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
export async function defaultApplyGte18NoFilterSupabaseRemovalDeltasV1(
  deltas: Gte18SupabaseRemovalPlannedChangeV1[],
): Promise<Gte18SupabaseRemovalWriteResultV1> {
  const errors: string[] = [];
  const applied_row_keys: string[] = [];
  let applied_removal_count = 0;

  if (deltas.length !== GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_EXPECTED_COUNTS_V1.planned_removals) {
    return {
      ok: false,
      errors: [
        `writer refused unexpected delta count ${String(deltas.length)} (expected ${String(GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_EXPECTED_COUNTS_V1.planned_removals)})`,
      ],
      applied_removal_count: 0,
      applied_row_keys: [],
    };
  }

  const expectedKeys = GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map(
    (row) => `${row.fridge_slug},${row.filter_slug}`,
  ).sort();
  const actualKeys = deltas.map((d) => d.row_key).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    return {
      ok: false,
      errors: [`writer refused unexpected removal keys: ${actualKeys.join(" | ")}`],
      applied_removal_count: 0,
      applied_row_keys: [],
    };
  }

  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();

    for (const delta of deltas) {
      if (delta.operation !== "remove") {
        errors.push(`writer refused non-remove operation for ${delta.row_key}`);
        continue;
      }
      if (delta.fridge_slug !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1) {
        errors.push(`writer refused non-target slug ${delta.fridge_slug}`);
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
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return {
    ok: errors.length === 0,
    errors,
    applied_removal_count,
    applied_row_keys,
  };
}

export type RunGte18NoFilterSupabaseRemovalGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  applyPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applySupabaseRemovalDeltas?: ApplyGte18SupabaseRemovalDeltasFnV1;
  /** Injectable live Supabase loader — used to detect post-apply already-empty state. */
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
  applyPlanRelPath: string;
  applyPlanSha256: string | null;
  ownerApprovalRelPath: string;
  approvalPresent: boolean;
  approvalValid: boolean;
  approvalDecisionId: string | null;
  generatedAt: string;
  liveSource: "plan_artifact" | "live_supabase";
  liveMappings: string[];
}): GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1 {
  const liveNote =
    args.liveSource === "live_supabase"
      ? `PROVEN: live Supabase mappings for ${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1} are empty (checked independently of stale plan artifact).`
      : "PROVEN: plan_sync_state=already_applied from apply-plan artifact.";
  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_APPLY_CONTRACT_V1,
    mode: args.mode,
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    mutation_flag_enabled: args.mutation_flag_enabled,
    plan_sync_state: "already_applied",
    apply_status: "ALREADY_APPLIED",
    blocked_reasons: [],
    apply_plan_rel_path: args.applyPlanRelPath,
    apply_plan_sha256: args.applyPlanSha256,
    owner_approval_rel_path: args.ownerApprovalRelPath,
    owner_approval_present: args.approvalPresent,
    owner_approval_valid: args.approvalValid,
    owner_approval_decision_id: args.approvalDecisionId,
    owner_approval_required_for_apply: true,
    target_fridge_slug: GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
    planned_slug_count: 1,
    planned_removals: 0,
    planned_additions: 0,
    planned_removal_row_keys: [],
    planned_addition_row_keys: [],
    planned_supabase_row_deltas: [],
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    applied_supabase_row_keys: [],
    generated_at: args.generatedAt,
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_SOURCE_COMMAND_V1,
    proven_facts: [
      `PROVEN: mode=${args.mode}; apply_status=ALREADY_APPLIED; data_mutation=false; supabase_mutation_authorized=false; mutation_flag_enabled=${String(args.mutation_flag_enabled)}.`,
      `PROVEN: plan_sync_state=already_applied; planned_removals=0; planned_additions=0.`,
      liveNote,
      `PROVEN: live_supabase_mappings=${args.liveMappings.join("|") || "(none)"}.`,
      "PROVEN: no Supabase writes attempted — mappings already empty / in sync.",
      "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are out of scope for this executor.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether future drift will reintroduce gswf/gswf2 for ge-gte18gsnrss in Supabase.",
    ],
    risk_notes: [
      "Live Supabase (or already_applied plan) shows empty mappings — executor will not re-remove historical gswf/gswf2 rows.",
      "Do not mutate CSV, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this executor.",
    ],
  };
}

export async function runGswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyV1(
  deps: RunGte18NoFilterSupabaseRemovalGuardedApplyDepsV1,
): Promise<GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const env = deps.env ?? process.env;
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isGte18NoFilterSupabaseRemovalMutationEnabledV1(env);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;

  const applyPlanRelPath =
    deps.applyPlanRelPath ?? GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];
  const loaded = loadApplyPlan(deps.rootDir, applyPlanRelPath, readText);
  blocked_reasons.push(...loaded.errors);

  let removals: Gte18SupabaseRemovalPlannedChangeV1[] = [];
  let plan_sync_state: Gte18SupabaseRemovalPlanSyncStateV1 | "invalid" = "invalid";

  if (loaded.plan) {
    const shape = validatePlanShape(loaded.plan);
    blocked_reasons.push(...shape.errors);
    removals = shape.removals;
    plan_sync_state = shape.errors.length === 0 ? shape.plan_sync_state : "blocked_invalid";
  }

  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    applyPlanRelPath,
    applyPlanSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });

  // Plan artifact already marks applied.
  if (plan_sync_state === "already_applied" && blocked_reasons.length === 0) {
    return buildAlreadyAppliedReport({
      mode: deps.mode,
      mutation_flag_enabled,
      applyPlanRelPath,
      applyPlanSha256: loaded.sha256,
      ownerApprovalRelPath,
      approvalPresent: approval.present,
      approvalValid: approval.row != null,
      approvalDecisionId: approval.row?.decision_id ?? null,
      generatedAt,
      liveSource: "plan_artifact",
      liveMappings: [],
    });
  }

  // Post-apply: stale pending plan must still yield ALREADY_APPLIED when live Supabase is empty.
  // Do not rewrite Supabase; do not trust plan.supabase_mappings alone.
  if (plan_sync_state === "pending_removal" && blocked_reasons.length === 0) {
    const live = await loadSupabase(GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1);
    if (live.status === "CHECKED") {
      const liveMappings = sortedUnique(live.supabase_filter_slugs);
      if (liveMappings.length === 0) {
        return buildAlreadyAppliedReport({
          mode: deps.mode,
          mutation_flag_enabled,
          applyPlanRelPath,
          applyPlanSha256: loaded.sha256,
          ownerApprovalRelPath,
          approvalPresent: approval.present,
          approvalValid: approval.row != null,
          approvalDecisionId: approval.row?.decision_id ?? null,
          generatedAt,
          liveSource: "live_supabase",
          liveMappings,
        });
      }
    }
  }

  if (deps.mode === "apply") {
    if (!approval.row) {
      blocked_reasons.push(...approval.errors);
      blocked_reasons.push(
        "apply mode blocked — matching founder GTE18 supabase-removal owner approval required",
      );
    }
    if (!mutation_flag_enabled) {
      blocked_reasons.push(
        `apply mode blocked — mutation flag absent (${GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENV_FLAG_V1}=1 required)`,
      );
    }
  }

  const planned_removal_row_keys = removals.map((row) => row.row_key).sort();
  const supabase_mutation_authorized =
    deps.mode === "apply" &&
    blocked_reasons.length === 0 &&
    Boolean(approval.row) &&
    mutation_flag_enabled &&
    plan_sync_state === "pending_removal" &&
    removals.length === 2;

  let apply_status: GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1["apply_status"] =
    "BLOCKED";
  let data_mutation = false;
  const applied_supabase_row_keys: string[] = [];

  if (deps.mode === "dry_run") {
    apply_status = blocked_reasons.length === 0 ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!supabase_mutation_authorized) {
    apply_status = "BLOCKED";
  } else {
    const writer = deps.applySupabaseRemovalDeltas ?? defaultApplyGte18NoFilterSupabaseRemovalDeltasV1;
    const writeResult = await writer(removals);
    if (!writeResult.ok) {
      blocked_reasons.push(...writeResult.errors);
      apply_status = "BLOCKED";
    } else {
      data_mutation = true;
      apply_status = "APPLIED";
      applied_supabase_row_keys.push(...sortedUnique(writeResult.applied_row_keys));
    }
  }

  const proven_facts = [
    `PROVEN: mode=${deps.mode}; apply_status=${apply_status}; data_mutation=${String(data_mutation)}; supabase_mutation_authorized=${String(supabase_mutation_authorized)}; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
    `PROVEN: target_fridge_slug=${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}; planned_removals=${String(removals.length)}; planned_additions=0; plan_sync_state=${plan_sync_state}.`,
    `PROVEN: owner_approval_present=${String(approval.present)}; owner_approval_valid=${String(approval.row != null)}.`,
    "PROVEN: csv_mutation_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are out of scope for this executor.",
  ];
  if (apply_status === "DRY_RUN_READY") {
    proven_facts.push(
      "PROVEN: dry-run verified exact Supabase removals ge-gte18gsnrss,gswf + ge-gte18gsnrss,gswf2 with zero additions.",
    );
  }
  if (apply_status === "APPLIED") {
    proven_facts.push(
      `PROVEN: applied exactly ${String(applied_supabase_row_keys.length)} Supabase row removals for ge-gte18gsnrss.`,
    );
  }

  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: !data_mutation,
    data_mutation,
    supabase_mutation_authorized,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    mutation_flag_enabled,
    plan_sync_state,
    apply_status,
    blocked_reasons,
    apply_plan_rel_path: applyPlanRelPath,
    apply_plan_sha256: loaded.sha256,
    owner_approval_rel_path: ownerApprovalRelPath,
    owner_approval_present: approval.present,
    owner_approval_valid: approval.row != null,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_required_for_apply: true,
    target_fridge_slug: GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
    planned_slug_count: 1,
    planned_removals: removals.length,
    planned_additions: 0,
    planned_removal_row_keys,
    planned_addition_row_keys: [],
    planned_supabase_row_deltas: [...removals],
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    applied_supabase_row_keys,
    generated_at: generatedAt,
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_SOURCE_COMMAND_V1,
    proven_facts,
    unknown_facts: [
      "UNKNOWN: Whether founder will create gswf-gte18gsnrss-no-filter-supabase-removal-owner-approval-v1.json.",
      "UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.",
    ],
    risk_notes: [
      "Dry-run never mutates Supabase or CSV.",
      "Apply requires matching founder approval + BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_MUTATION_ENABLED=1 + exact 2 removals / 0 additions.",
      "Already-applied plans and live-empty Supabase return ALREADY_APPLIED and do not re-remove rows.",
      "Do not mutate CSV, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this executor.",
      "Do not include PARTIAL or GSWF-13 repaired slugs.",
    ],
  };
}

export function buildGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunMarkdownV1(
  report: GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1,
): string {
  return [
    "# GSWF ge-gte18gsnrss no-filter Supabase removal guarded dry-run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- plan_sync_state: **${report.plan_sync_state}**`,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- supabase_mutation_authorized: **${String(report.supabase_mutation_authorized)}**`,
    `- mutation_flag_enabled: **${String(report.mutation_flag_enabled)}**`,
    `- owner_approval_present: **${String(report.owner_approval_present)}**`,
    `- owner_approval_valid: **${String(report.owner_approval_valid)}**`,
    "",
    "## Scope",
    "",
    `- target_fridge_slug: \`${report.target_fridge_slug}\``,
    `- planned_removals: **${String(report.planned_removals)}**`,
    `- planned_additions: **${String(report.planned_additions)}**`,
    "",
    "### Planned removal keys",
    "",
    ...(report.planned_removal_row_keys.length
      ? report.planned_removal_row_keys.map((key) => `- \`${key}\``)
      : ["- none"]),
    "",
    "## Blocked reasons",
    "",
    ...(report.blocked_reasons.length
      ? report.blocked_reasons.map((reason) => `- ${reason}`)
      : ["- none"]),
    "",
  ].join("\n");
}

export function writeGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunArtifactsV1(args: {
  rootDir: string;
  report: GswfGte18gsnrssNoFilterSupabaseRemovalGuardedApplyReportV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
  );
  const mdAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1,
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildGswfGte18gsnrssNoFilterSupabaseRemovalGuardedDryRunMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    json_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1,
    md_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_GUARDED_DRY_RUN_MD_REL_V1,
  };
}
