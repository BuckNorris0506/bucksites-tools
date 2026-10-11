/**
 * Guarded R07 Phase 1 Winix Filter A/H Supabase parity — bounded delete-capable apply.
 * Default dry-run. Apply requires founder approval, trust currency, IO MUTATION, and session env flag.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { resolveIoCapabilityFromEnvV1 } from "./buckparts-supabase-mutation-gate-core-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  guardedApplyTrustCurrencyBlocksMutationV1,
} from "./guarded-apply-trust-currency-preflight-v1";

export const R07_PHASE1_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "r07_winix_filter_a_h_phase1_supabase_parity_guarded_apply_v1" as const;

export const R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1 =
  "data/ops/site-integrity/production-integrity-baseline-2026-10-10/r07-phase1-supabase-parity-plan-2026-10-11.json" as const;

export const R07_PHASE1_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/r07-winix-filter-a-h-phase1-supabase-parity-owner-approval-v1.json" as const;

export const R07_PHASE1_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_R07_PHASE1_SUPABASE_PARITY_MUTATION_ENABLED" as const;

export const R07_PHASE1_SUPABASE_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:r07-winix-filter-a-h-phase1-supabase-parity-guarded-apply" as const;

export const R07_PHASE1_SUPABASE_PARITY_PLAN_CONTRACT_V1 =
  "r07_winix_filter_a_h_phase1_supabase_parity_plan_v1" as const;

export const R07_PHASE1_EXPECTED_OPERATION_COUNT_V1 = 6 as const;

export type R07Phase1ParityPlanV1 = {
  contract: typeof R07_PHASE1_SUPABASE_PARITY_PLAN_CONTRACT_V1;
  expected_operation_count: number;
  proposed_supabase_changes: {
    filter_updates: Array<{ filter_slug: string; name: string; notes: string }>;
    compatibility_removals: Array<{ model_slug: string; filter_slug: string }>;
    compatibility_upserts: Array<{
      model_slug: string;
      filter_slug: string;
      is_recommended: boolean;
    }>;
    model_alias_removals: Array<{ model_slug: string; alias: string }>;
  };
};

export type R07Phase1ApplyStatusV1 = "DRY_RUN_READY" | "ALREADY_IN_SYNC" | "APPLIED" | "BLOCKED";

export type R07Phase1SupabaseParityReportV1 = {
  contract: typeof R07_PHASE1_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  apply_status: R07Phase1ApplyStatusV1;
  blocked_reasons: string[];
  plan_rel_path: string;
  plan_sha256: string | null;
  owner_approval_decision_id: string | null;
  io_capability: string;
  mutation_flag_enabled: boolean;
  planned_operations: string[];
  applied_operations: string[];
  generated_at: string;
  source_command: typeof R07_PHASE1_SUPABASE_PARITY_SOURCE_COMMAND_V1;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  r07_winix_filter_a_h_phase1_supabase_parity_owner_approval_context_v1?: {
    founder_option_id?: string;
    parity_plan_rel_path?: string;
    expected_operation_count?: number;
  };
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function isR07Phase1SupabaseParityMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[R07_PHASE1_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1] === "1";
}

function loadPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: R07Phase1ParityPlanV1 | null; sha256: string | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, sha256: null, errors: [`parity plan missing: ${relPath}`] };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as R07Phase1ParityPlanV1;
  const errors: string[] = [];
  if (plan.contract !== R07_PHASE1_SUPABASE_PARITY_PLAN_CONTRACT_V1) {
    errors.push(`plan contract mismatch: ${String(plan.contract)}`);
  }
  if (plan.expected_operation_count !== R07_PHASE1_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `expected_operation_count must be ${String(R07_PHASE1_EXPECTED_OPERATION_COUNT_V1)}`,
    );
  }
  const c = plan.proposed_supabase_changes;
  const opCount =
    c.filter_updates.length +
    c.compatibility_removals.length +
    c.compatibility_upserts.length +
    c.model_alias_removals.length;
  if (opCount !== R07_PHASE1_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(`proposed operation count ${String(opCount)} !== ${String(R07_PHASE1_EXPECTED_OPERATION_COUNT_V1)}`);
  }
  return { plan: errors.length ? null : plan, sha256, errors };
}

function findOwnerApproval(args: {
  rootDir: string;
  relPath: string;
  planRelPath: string;
  planSha256: string | null;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { row: RawRegistryRowV1 | null; errors: string[] } {
  const errors: string[] = [];
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) {
    return { row: null, errors: [`owner approval missing: ${args.relPath}`] };
  }
  const doc = JSON.parse(args.readText(abs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return { row: null, errors: [`owner approval invalid: ${validated.errors.join("; ")}`] };
  }
  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    const ctx = row.r07_winix_filter_a_h_phase1_supabase_parity_owner_approval_context_v1;
    if (ctx?.founder_option_id !== "approve_r07_phase1_supabase_parity_plan") continue;
    if (ctx.parity_plan_rel_path !== args.planRelPath) continue;
    if (ctx.expected_operation_count !== R07_PHASE1_EXPECTED_OPERATION_COUNT_V1) continue;
    const binding = (row.bound_artifacts_v1 ?? []).find(
      (b) => b.artifact_rel_path === args.planRelPath,
    );
    if (!binding || binding.sha256_at_binding !== args.planSha256) {
      errors.push("owner approval plan sha256 binding mismatch");
      continue;
    }
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: rowValidation.row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) {
      errors.push(`owner approval gate: ${gate.blockers.join(",")}`);
      continue;
    }
    return { row, errors: [] };
  }
  errors.push("no matching R07 phase1 supabase parity owner approval row");
  return { row: null, errors };
}

function plannedOperationKeys(plan: R07Phase1ParityPlanV1): string[] {
  const c = plan.proposed_supabase_changes;
  const keys: string[] = [];
  for (const u of c.filter_updates) {
    keys.push(`filter_update:${u.filter_slug}`);
  }
  for (const r of c.compatibility_removals) {
    keys.push(`compat_remove:${r.model_slug},${r.filter_slug}`);
  }
  for (const u of c.compatibility_upserts) {
    keys.push(`compat_upsert:${u.model_slug},${u.filter_slug},rec=${String(u.is_recommended)}`);
  }
  for (const a of c.model_alias_removals) {
    keys.push(`alias_remove:${a.model_slug},${a.alias}`);
  }
  return keys.sort();
}

async function resolveModelId(
  supabase: { from: (t: string) => any },
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("air_purifier_models")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

async function resolveFilterId(
  supabase: { from: (t: string) => any },
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("air_purifier_filters")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function defaultApplyR07Phase1SupabaseParityV1(
  plan: R07Phase1ParityPlanV1,
): Promise<{ ok: boolean; errors: string[]; applied: string[] }> {
  const errors: string[] = [];
  const applied: string[] = [];
  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();
  const c = plan.proposed_supabase_changes;

  for (const upd of c.filter_updates) {
    const { error } = await supabase
      .from("air_purifier_filters")
      .update({ name: upd.name, notes: upd.notes })
      .eq("slug", upd.filter_slug);
    if (error) {
      errors.push(`filter update ${upd.filter_slug}: ${error.message}`);
    } else {
      applied.push(`filter_update:${upd.filter_slug}`);
    }
  }

  for (const rem of c.compatibility_removals) {
    const modelId = await resolveModelId(supabase, rem.model_slug);
    const filterId = await resolveFilterId(supabase, rem.filter_slug);
    if (!modelId || !filterId) {
      errors.push(`compat remove lookup failed ${rem.model_slug},${rem.filter_slug}`);
      continue;
    }
    const { error } = await supabase
      .from("air_purifier_compatibility_mappings")
      .delete()
      .eq("air_purifier_model_id", modelId)
      .eq("air_purifier_filter_id", filterId);
    if (error) {
      errors.push(`compat remove ${rem.model_slug},${rem.filter_slug}: ${error.message}`);
    } else {
      applied.push(`compat_remove:${rem.model_slug},${rem.filter_slug}`);
    }
  }

  for (const ups of c.compatibility_upserts) {
    const modelId = await resolveModelId(supabase, ups.model_slug);
    const filterId = await resolveFilterId(supabase, ups.filter_slug);
    if (!modelId || !filterId) {
      errors.push(`compat upsert lookup failed ${ups.model_slug},${ups.filter_slug}`);
      continue;
    }
    const { data: existing, error: exErr } = await supabase
      .from("air_purifier_compatibility_mappings")
      .select("air_purifier_model_id")
      .eq("air_purifier_model_id", modelId)
      .eq("air_purifier_filter_id", filterId)
      .limit(1);
    if (exErr) {
      errors.push(`compat upsert pre-read ${ups.model_slug},${ups.filter_slug}: ${exErr.message}`);
      continue;
    }
    if ((existing ?? []).length === 0) {
      const { error } = await supabase.from("air_purifier_compatibility_mappings").insert({
        air_purifier_model_id: modelId,
        air_purifier_filter_id: filterId,
        is_recommended: ups.is_recommended,
      });
      if (error) {
        errors.push(`compat insert ${ups.model_slug},${ups.filter_slug}: ${error.message}`);
        continue;
      }
    } else {
      const { error } = await supabase
        .from("air_purifier_compatibility_mappings")
        .update({ is_recommended: ups.is_recommended })
        .eq("air_purifier_model_id", modelId)
        .eq("air_purifier_filter_id", filterId);
      if (error) {
        errors.push(`compat update ${ups.model_slug},${ups.filter_slug}: ${error.message}`);
        continue;
      }
    }
    applied.push(`compat_upsert:${ups.model_slug},${ups.filter_slug},rec=${String(ups.is_recommended)}`);
  }

  for (const aliasRem of c.model_alias_removals) {
    const modelId = await resolveModelId(supabase, aliasRem.model_slug);
    if (!modelId) {
      errors.push(`alias remove lookup failed ${aliasRem.model_slug}`);
      continue;
    }
    const { error } = await supabase
      .from("air_purifier_model_aliases")
      .delete()
      .eq("air_purifier_model_id", modelId)
      .eq("alias", aliasRem.alias);
    if (error) {
      errors.push(`alias remove ${aliasRem.model_slug},${aliasRem.alias}: ${error.message}`);
    } else {
      applied.push(`alias_remove:${aliasRem.model_slug},${aliasRem.alias}`);
    }
  }

  return { ok: errors.length === 0, errors, applied: applied.sort() };
}

export type RunR07Phase1SupabaseParityDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applyFn?: (plan: R07Phase1ParityPlanV1) => Promise<{ ok: boolean; errors: string[]; applied: string[] }>;
};

export async function runR07Phase1SupabaseParityGuardedApplyV1(
  deps: RunR07Phase1SupabaseParityDepsV1,
): Promise<R07Phase1SupabaseParityReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = deps.env ?? process.env;
  const blocked: string[] = [];
  const io = resolveIoCapabilityFromEnvV1(env);
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isR07Phase1SupabaseParityMutationEnabledV1(env);

  const trust = buildGuardedApplyTrustCurrencyPreflightV1({ rootDir: deps.rootDir, now });
  if (deps.mode === "apply" && guardedApplyTrustCurrencyBlocksMutationV1(trust)) {
    blocked.push(...trust.blockers.map((b) => `trust_currency:${b}`));
  }
  if (deps.mode === "apply" && io !== "MUTATION") {
    blocked.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const loaded = loadPlan(deps.rootDir, R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1, readText);
  blocked.push(...loaded.errors);

  let plan = loaded.plan;
  let planned_operations: string[] = [];
  if (plan) {
    planned_operations = plannedOperationKeys(plan);
  }

  const approval = findOwnerApproval({
    rootDir: deps.rootDir,
    relPath: R07_PHASE1_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
    planRelPath: R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    planSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });
  blocked.push(...approval.errors);

  let apply_status: R07Phase1ApplyStatusV1 = "BLOCKED";
  let applied_operations: string[] = [];
  let data_mutation = false;

  const gatesClear =
    blocked.length === 0 && plan != null && approval.row != null && planned_operations.length === R07_PHASE1_EXPECTED_OPERATION_COUNT_V1;

  if (deps.mode === "dry_run") {
    apply_status = gatesClear ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!gatesClear) {
    apply_status = "BLOCKED";
  } else if (!mutation_flag_enabled) {
    blocked.push(`${R07_PHASE1_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1}_not_set`);
    apply_status = "BLOCKED";
  } else {
    const applyFn = deps.applyFn ?? defaultApplyR07Phase1SupabaseParityV1;
    data_mutation = true;
    const result = await applyFn(plan!);
    applied_operations = result.applied;
    if (!result.ok) {
      blocked.push(...result.errors);
      apply_status = "BLOCKED";
    } else if (applied_operations.length === 0) {
      apply_status = "ALREADY_IN_SYNC";
    } else {
      apply_status = "APPLIED";
    }
  }

  return {
    contract: R07_PHASE1_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: deps.mode === "dry_run",
    data_mutation,
    supabase_mutation_authorized: gatesClear && mutation_flag_enabled && deps.mode === "apply",
    apply_status,
    blocked_reasons: Array.from(new Set(blocked)),
    plan_rel_path: R07_PHASE1_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    plan_sha256: loaded.sha256,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    io_capability: io,
    mutation_flag_enabled,
    planned_operations,
    applied_operations,
    generated_at: generatedAt,
    source_command: R07_PHASE1_SUPABASE_PARITY_SOURCE_COMMAND_V1,
  };
}
