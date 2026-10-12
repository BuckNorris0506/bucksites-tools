/**
 * Guarded R08 sibling FXHTC/GXWH20S Supabase parity — bounded update + compat delete.
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

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "r08_sibling_fxhtc_gxwh20s_supabase_parity_guarded_apply_v1" as const;

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_JSON_REL_V1 =
  "data/ops/site-integrity/production-integrity-baseline-2026-10-10/r08-sibling-fxhtc-gxwh20s-supabase-parity-plan-2026-10-12.json" as const;

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/r08-sibling-fxhtc-gxwh20s-supabase-parity-owner-approval-v1.json" as const;

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_MUTATION_ENABLED" as const;

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:r08-sibling-fxhtc-gxwh20s-supabase-parity-guarded-apply" as const;

export const R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_CONTRACT_V1 =
  "r08_sibling_fxhtc_gxwh20s_supabase_parity_plan_v1" as const;

export const R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1 = 2 as const;

export type R08SiblingFxhtcGxwh20sParityPlanV1 = {
  contract: typeof R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_CONTRACT_V1;
  expected_operation_count: number;
  proposed_supabase_changes: {
    part_updates: Array<{
      part_slug: string;
      name: string;
      notes: string;
      replacement_interval_months: number;
    }>;
    compatibility_mapping_deletes: Array<{
      model_slug: string;
      filter_slug: string;
    }>;
  };
};

export type R08SiblingFxhtcGxwh20sApplyStatusV1 =
  | "DRY_RUN_READY"
  | "ALREADY_IN_SYNC"
  | "APPLIED"
  | "BLOCKED";

export type R08SiblingFxhtcGxwh20sSupabaseParityReportV1 = {
  contract: typeof R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  apply_status: R08SiblingFxhtcGxwh20sApplyStatusV1;
  blocked_reasons: string[];
  plan_rel_path: string;
  plan_sha256: string | null;
  owner_approval_decision_id: string | null;
  io_capability: string;
  mutation_flag_enabled: boolean;
  planned_operations: string[];
  applied_operations: string[];
  before_after?: {
    part_ge_fxhtc?: Record<string, unknown> | null;
    compat_gxwh20s_fxhtc?: Record<string, unknown> | null;
  };
  generated_at: string;
  source_command: typeof R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_SOURCE_COMMAND_V1;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  r08_sibling_fxhtc_gxwh20s_supabase_parity_owner_approval_context_v1?: {
    founder_option_id?: string;
    parity_plan_rel_path?: string;
    expected_operation_count?: number;
  };
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function isR08SiblingFxhtcGxwh20sSupabaseParityMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1] === "1";
}

function loadPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: R08SiblingFxhtcGxwh20sParityPlanV1 | null; sha256: string | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, sha256: null, errors: [`parity plan missing: ${relPath}`] };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as R08SiblingFxhtcGxwh20sParityPlanV1;
  const errors: string[] = [];
  if (plan.contract !== R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_CONTRACT_V1) {
    errors.push(`plan contract mismatch: ${String(plan.contract)}`);
  }
  if (plan.expected_operation_count !== R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `expected_operation_count must be ${String(R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1)}`,
    );
  }
  const c = plan.proposed_supabase_changes;
  const opCount = c.part_updates.length + c.compatibility_mapping_deletes.length;
  if (opCount !== R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `proposed operation count ${String(opCount)} !== ${String(R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1)}`,
    );
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
    const ctx = row.r08_sibling_fxhtc_gxwh20s_supabase_parity_owner_approval_context_v1;
    if (ctx?.founder_option_id !== "approve_r08_sibling_fxhtc_gxwh20s_supabase_parity_plan") {
      continue;
    }
    if (ctx.parity_plan_rel_path !== args.planRelPath) continue;
    if (ctx.expected_operation_count !== R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1) {
      continue;
    }
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
  errors.push("no matching R08 sibling FXHTC/GXWH20S supabase parity owner approval row");
  return { row: null, errors };
}

function plannedOperationKeys(plan: R08SiblingFxhtcGxwh20sParityPlanV1): string[] {
  const c = plan.proposed_supabase_changes;
  const keys: string[] = [];
  for (const u of c.part_updates) {
    keys.push(
      `part_update:${u.part_slug},interval=${String(u.replacement_interval_months)}`,
    );
  }
  for (const d of c.compatibility_mapping_deletes) {
    keys.push(`compat_delete:${d.model_slug},${d.filter_slug}`);
  }
  return keys.sort();
}

export async function defaultApplyR08SiblingFxhtcGxwh20sSupabaseParityV1(
  plan: R08SiblingFxhtcGxwh20sParityPlanV1,
): Promise<{
  ok: boolean;
  errors: string[];
  applied: string[];
  before_after: R08SiblingFxhtcGxwh20sSupabaseParityReportV1["before_after"];
}> {
  const errors: string[] = [];
  const applied: string[] = [];
  const before_after: R08SiblingFxhtcGxwh20sSupabaseParityReportV1["before_after"] = {};

  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();
  const c = plan.proposed_supabase_changes;

  for (const upd of c.part_updates) {
    const { data: before, error: readErr } = await supabase
      .from("whole_house_water_parts")
      .select("slug, name, notes, replacement_interval_months")
      .eq("slug", upd.part_slug)
      .maybeSingle();
    if (readErr) {
      errors.push(`part pre-read ${upd.part_slug}: ${readErr.message}`);
      continue;
    }
    before_after.part_ge_fxhtc = before ?? null;

    const { error } = await supabase
      .from("whole_house_water_parts")
      .update({
        name: upd.name,
        notes: upd.notes,
        replacement_interval_months: upd.replacement_interval_months,
      })
      .eq("slug", upd.part_slug);
    if (error) {
      errors.push(`part update ${upd.part_slug}: ${error.message}`);
    } else {
      applied.push(
        `part_update:${upd.part_slug},interval=${String(upd.replacement_interval_months)}`,
      );
    }
  }

  for (const del of c.compatibility_mapping_deletes) {
    const { data: modelRow, error: modelErr } = await supabase
      .from("whole_house_water_models")
      .select("id, slug")
      .eq("slug", del.model_slug)
      .maybeSingle();
    if (modelErr || !modelRow) {
      errors.push(`model lookup ${del.model_slug}: ${modelErr?.message ?? "not found"}`);
      continue;
    }
    const { data: partRow, error: partErr } = await supabase
      .from("whole_house_water_parts")
      .select("id, slug")
      .eq("slug", del.filter_slug)
      .maybeSingle();
    if (partErr || !partRow) {
      errors.push(`part lookup ${del.filter_slug}: ${partErr?.message ?? "not found"}`);
      continue;
    }

    const { data: beforeMap, error: mapReadErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .select("whole_house_water_model_id, whole_house_water_part_id, is_recommended")
      .eq("whole_house_water_model_id", modelRow.id)
      .eq("whole_house_water_part_id", partRow.id)
      .maybeSingle();
    if (mapReadErr) {
      errors.push(`compat pre-read ${del.model_slug}/${del.filter_slug}: ${mapReadErr.message}`);
      continue;
    }
    before_after.compat_gxwh20s_fxhtc = beforeMap ?? null;

    if (!beforeMap) {
      applied.push(`compat_delete:${del.model_slug},${del.filter_slug},already_absent`);
      continue;
    }

    const { error: delErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .delete()
      .eq("whole_house_water_model_id", modelRow.id)
      .eq("whole_house_water_part_id", partRow.id);
    if (delErr) {
      errors.push(`compat delete ${del.model_slug}/${del.filter_slug}: ${delErr.message}`);
    } else {
      applied.push(`compat_delete:${del.model_slug},${del.filter_slug}`);
    }
  }

  return { ok: errors.length === 0, errors, applied: applied.sort(), before_after };
}

export type RunR08SiblingFxhtcGxwh20sSupabaseParityDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applyFn?: (
    plan: R08SiblingFxhtcGxwh20sParityPlanV1,
  ) => Promise<{
    ok: boolean;
    errors: string[];
    applied: string[];
    before_after: R08SiblingFxhtcGxwh20sSupabaseParityReportV1["before_after"];
  }>;
};

export async function runR08SiblingFxhtcGxwh20sSupabaseParityGuardedApplyV1(
  deps: RunR08SiblingFxhtcGxwh20sSupabaseParityDepsV1,
): Promise<R08SiblingFxhtcGxwh20sSupabaseParityReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = deps.env ?? process.env;
  const blocked: string[] = [];
  const io = resolveIoCapabilityFromEnvV1(env);
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isR08SiblingFxhtcGxwh20sSupabaseParityMutationEnabledV1(env);

  const trust = buildGuardedApplyTrustCurrencyPreflightV1({ rootDir: deps.rootDir, now });
  if (deps.mode === "apply" && guardedApplyTrustCurrencyBlocksMutationV1(trust)) {
    blocked.push(...trust.blockers.map((b) => `trust_currency:${b}`));
  }
  if (deps.mode === "apply" && io !== "MUTATION") {
    blocked.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const loaded = loadPlan(
    deps.rootDir,
    R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    readText,
  );
  blocked.push(...loaded.errors);

  let plan = loaded.plan;
  let planned_operations: string[] = [];
  if (plan) {
    planned_operations = plannedOperationKeys(plan);
  }

  const approval = findOwnerApproval({
    rootDir: deps.rootDir,
    relPath: R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
    planRelPath: R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    planSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });
  blocked.push(...approval.errors);

  let apply_status: R08SiblingFxhtcGxwh20sApplyStatusV1 = "BLOCKED";
  let applied_operations: string[] = [];
  let data_mutation = false;
  let before_after: R08SiblingFxhtcGxwh20sSupabaseParityReportV1["before_after"];

  const gatesClear =
    blocked.length === 0 &&
    plan != null &&
    approval.row != null &&
    planned_operations.length === R08_SIBLING_FXHTC_GXWH20S_EXPECTED_OPERATION_COUNT_V1;

  if (deps.mode === "dry_run") {
    apply_status = gatesClear ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!gatesClear) {
    apply_status = "BLOCKED";
  } else if (!mutation_flag_enabled) {
    blocked.push(`${R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1}_not_set`);
    apply_status = "BLOCKED";
  } else {
    const applyFn = deps.applyFn ?? defaultApplyR08SiblingFxhtcGxwh20sSupabaseParityV1;
    data_mutation = true;
    const result = await applyFn(plan!);
    applied_operations = result.applied;
    before_after = result.before_after;
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
    contract: R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: deps.mode === "dry_run",
    data_mutation,
    supabase_mutation_authorized: gatesClear && mutation_flag_enabled && deps.mode === "apply",
    apply_status,
    blocked_reasons: Array.from(new Set(blocked)),
    plan_rel_path: R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    plan_sha256: loaded.sha256,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    io_capability: io,
    mutation_flag_enabled,
    planned_operations,
    applied_operations,
    before_after,
    generated_at: generatedAt,
    source_command: R08_SIBLING_FXHTC_GXWH20S_SUPABASE_PARITY_SOURCE_COMMAND_V1,
  };
}
