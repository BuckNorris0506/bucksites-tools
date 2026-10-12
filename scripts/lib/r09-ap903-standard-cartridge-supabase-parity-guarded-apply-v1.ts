/**
 * Guarded R09 AP903 standard-cartridge Supabase parity — bounded updates + upserts.
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

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "r09_ap903_standard_cartridge_supabase_parity_guarded_apply_v1" as const;

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_JSON_REL_V1 =
  "data/ops/site-integrity/production-integrity-baseline-2026-10-10/r09-ap903-standard-cartridge-supabase-parity-plan-2026-10-12.json" as const;

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/r09-ap903-standard-cartridge-supabase-parity-owner-approval-v1.json" as const;

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_MUTATION_ENABLED" as const;

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:r09-ap903-standard-cartridge-supabase-parity-guarded-apply" as const;

export const R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_CONTRACT_V1 =
  "r09_ap903_standard_cartridge_supabase_parity_plan_v1" as const;

export const R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1 = 7 as const;

export type R09Ap903StandardCartridgeParityPlanV1 = {
  contract: typeof R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_CONTRACT_V1;
  expected_operation_count: number;
  proposed_supabase_changes: {
    model_notes_updates: Array<{ model_slug: string; notes: string }>;
    part_updates: Array<{
      part_slug: string;
      oem_part_number: string;
      name: string;
      notes: string;
      replacement_interval_months: number;
    }>;
    part_upserts: Array<{
      part_slug: string;
      brand_slug: string;
      oem_part_number: string;
      name: string;
      notes: string;
      replacement_interval_months: number;
    }>;
    compatibility_mapping_deletes: Array<{ model_slug: string; filter_slug: string }>;
    compatibility_mapping_upserts: Array<{
      model_slug: string;
      filter_slug: string;
      is_recommended: boolean;
    }>;
  };
};

export type R09Ap903ApplyStatusV1 = "DRY_RUN_READY" | "ALREADY_IN_SYNC" | "APPLIED" | "BLOCKED";

export type R09Ap903SupabaseParityReportV1 = {
  contract: typeof R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  apply_status: R09Ap903ApplyStatusV1;
  blocked_reasons: string[];
  plan_rel_path: string;
  plan_sha256: string | null;
  owner_approval_decision_id: string | null;
  io_capability: string;
  mutation_flag_enabled: boolean;
  planned_operations: string[];
  applied_operations: string[];
  before_after?: Record<string, unknown>;
  generated_at: string;
  source_command: typeof R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_SOURCE_COMMAND_V1;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  r09_ap903_standard_cartridge_supabase_parity_owner_approval_context_v1?: {
    founder_option_id?: string;
    parity_plan_rel_path?: string;
    expected_operation_count?: number;
  };
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function isR09Ap903StandardCartridgeSupabaseParityMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1] === "1";
}

function loadPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: R09Ap903StandardCartridgeParityPlanV1 | null; sha256: string | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, sha256: null, errors: [`parity plan missing: ${relPath}`] };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as R09Ap903StandardCartridgeParityPlanV1;
  const errors: string[] = [];
  if (plan.contract !== R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_CONTRACT_V1) {
    errors.push(`plan contract mismatch: ${String(plan.contract)}`);
  }
  if (plan.expected_operation_count !== R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `expected_operation_count must be ${String(R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1)}`,
    );
  }
  const c = plan.proposed_supabase_changes;
  const opCount =
    c.model_notes_updates.length +
    c.part_updates.length +
    c.part_upserts.length +
    c.compatibility_mapping_deletes.length +
    c.compatibility_mapping_upserts.length;
  if (opCount !== R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `proposed operation count ${String(opCount)} !== ${String(R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1)}`,
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
    const ctx = row.r09_ap903_standard_cartridge_supabase_parity_owner_approval_context_v1;
    if (ctx?.founder_option_id !== "approve_r09_ap903_standard_cartridge_supabase_parity_plan") {
      continue;
    }
    if (ctx.parity_plan_rel_path !== args.planRelPath) continue;
    if (ctx.expected_operation_count !== R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1) {
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
  errors.push("no matching R09 AP903 standard cartridge supabase parity owner approval row");
  return { row: null, errors };
}

function plannedOperationKeys(plan: R09Ap903StandardCartridgeParityPlanV1): string[] {
  const c = plan.proposed_supabase_changes;
  const keys: string[] = [];
  for (const u of c.model_notes_updates) {
    keys.push(`model_notes_update:${u.model_slug}`);
  }
  for (const u of c.part_updates) {
    keys.push(`part_update:${u.part_slug}`);
  }
  for (const u of c.part_upserts) {
    keys.push(`part_upsert:${u.part_slug}`);
  }
  for (const d of c.compatibility_mapping_deletes) {
    keys.push(`compat_delete:${d.model_slug},${d.filter_slug}`);
  }
  for (const u of c.compatibility_mapping_upserts) {
    keys.push(
      `compat_upsert:${u.model_slug},${u.filter_slug},rec=${String(u.is_recommended)}`,
    );
  }
  return keys.sort();
}

async function resolveModelId(
  supabase: { from: (t: string) => any },
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("whole_house_water_models")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

async function resolvePartId(
  supabase: { from: (t: string) => any },
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("whole_house_water_parts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function defaultApplyR09Ap903StandardCartridgeSupabaseParityV1(
  plan: R09Ap903StandardCartridgeParityPlanV1,
): Promise<{
  ok: boolean;
  errors: string[];
  applied: string[];
  before_after: Record<string, unknown>;
}> {
  const errors: string[] = [];
  const applied: string[] = [];
  const before_after: Record<string, unknown> = {};

  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();
  const c = plan.proposed_supabase_changes;

  for (const upd of c.model_notes_updates) {
    const { data: before, error: readErr } = await supabase
      .from("whole_house_water_models")
      .select("notes")
      .eq("slug", upd.model_slug)
      .maybeSingle();
    if (readErr) {
      errors.push(`model pre-read ${upd.model_slug}: ${readErr.message}`);
      continue;
    }
    before_after[`model_${upd.model_slug}_notes`] = before?.notes ?? null;

    const { error } = await supabase
      .from("whole_house_water_models")
      .update({ notes: upd.notes })
      .eq("slug", upd.model_slug);
    if (error) {
      errors.push(`model notes update ${upd.model_slug}: ${error.message}`);
    } else {
      applied.push(`model_notes_update:${upd.model_slug}`);
    }
  }

  for (const upd of c.part_updates) {
    const { data: before, error: readErr } = await supabase
      .from("whole_house_water_parts")
      .select("slug, name, notes, replacement_interval_months, oem_part_number")
      .eq("slug", upd.part_slug)
      .maybeSingle();
    if (readErr) {
      errors.push(`part pre-read ${upd.part_slug}: ${readErr.message}`);
      continue;
    }
    before_after[`part_${upd.part_slug}`] = before ?? null;

    const { error } = await supabase
      .from("whole_house_water_parts")
      .update({
        name: upd.name,
        notes: upd.notes,
        replacement_interval_months: upd.replacement_interval_months,
        oem_part_number: upd.oem_part_number,
      })
      .eq("slug", upd.part_slug);
    if (error) {
      errors.push(`part update ${upd.part_slug}: ${error.message}`);
    } else {
      applied.push(`part_update:${upd.part_slug}`);
    }
  }

  for (const ins of c.part_upserts) {
    const { data: before, error: readErr } = await supabase
      .from("whole_house_water_parts")
      .select("slug, name, notes, replacement_interval_months, oem_part_number")
      .eq("slug", ins.part_slug)
      .maybeSingle();
    if (readErr) {
      errors.push(`part upsert pre-read ${ins.part_slug}: ${readErr.message}`);
      continue;
    }
    before_after[`part_${ins.part_slug}`] = before ?? null;

    const { data: brandRow, error: brandErr } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", ins.brand_slug)
      .maybeSingle();
    if (brandErr || !brandRow?.id) {
      errors.push(`brand lookup ${ins.brand_slug}: ${brandErr?.message ?? "not found"}`);
      continue;
    }

    const payload = {
      brand_id: brandRow.id,
      slug: ins.part_slug,
      oem_part_number: ins.oem_part_number,
      name: ins.name,
      notes: ins.notes,
      replacement_interval_months: ins.replacement_interval_months,
    };

    if (before) {
      const { error } = await supabase
        .from("whole_house_water_parts")
        .update({
          name: ins.name,
          notes: ins.notes,
          replacement_interval_months: ins.replacement_interval_months,
          oem_part_number: ins.oem_part_number,
        })
        .eq("slug", ins.part_slug);
      if (error) {
        errors.push(`part upsert update ${ins.part_slug}: ${error.message}`);
      } else {
        applied.push(`part_upsert:${ins.part_slug}`);
      }
    } else {
      const { error } = await supabase.from("whole_house_water_parts").insert(payload);
      if (error) {
        errors.push(`part upsert insert ${ins.part_slug}: ${error.message}`);
      } else {
        applied.push(`part_upsert:${ins.part_slug}`);
      }
    }
  }

  for (const del of c.compatibility_mapping_deletes) {
    const modelId = await resolveModelId(supabase, del.model_slug);
    const partId = await resolvePartId(supabase, del.filter_slug);
    if (!modelId || !partId) {
      applied.push(`compat_delete:${del.model_slug},${del.filter_slug},already_absent`);
      continue;
    }
    const { data: beforeMap, error: mapReadErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .select("is_recommended")
      .eq("whole_house_water_model_id", modelId)
      .eq("whole_house_water_part_id", partId)
      .maybeSingle();
    if (mapReadErr) {
      errors.push(`compat pre-read ${del.model_slug}/${del.filter_slug}: ${mapReadErr.message}`);
      continue;
    }
    before_after[`compat_${del.model_slug}_${del.filter_slug}`] = beforeMap ?? null;

    if (!beforeMap) {
      applied.push(`compat_delete:${del.model_slug},${del.filter_slug},already_absent`);
      continue;
    }

    const { error: delErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .delete()
      .eq("whole_house_water_model_id", modelId)
      .eq("whole_house_water_part_id", partId);
    if (delErr) {
      errors.push(`compat delete ${del.model_slug}/${del.filter_slug}: ${delErr.message}`);
    } else {
      applied.push(`compat_delete:${del.model_slug},${del.filter_slug}`);
    }
  }

  for (const ups of c.compatibility_mapping_upserts) {
    const modelId = await resolveModelId(supabase, ups.model_slug);
    let partId = await resolvePartId(supabase, ups.filter_slug);
    if (!modelId) {
      errors.push(`compat upsert model lookup ${ups.model_slug}`);
      continue;
    }
    if (!partId) {
      errors.push(`compat upsert part lookup ${ups.filter_slug} (run part upsert first)`);
      continue;
    }

    const { data: beforeMap, error: mapReadErr } = await supabase
      .from("whole_house_water_compatibility_mappings")
      .select("is_recommended")
      .eq("whole_house_water_model_id", modelId)
      .eq("whole_house_water_part_id", partId)
      .maybeSingle();
    if (mapReadErr) {
      errors.push(`compat upsert pre-read: ${mapReadErr.message}`);
      continue;
    }
    before_after[`compat_${ups.model_slug}_${ups.filter_slug}_after`] = beforeMap ?? null;

    if (beforeMap) {
      const { error } = await supabase
        .from("whole_house_water_compatibility_mappings")
        .update({ is_recommended: ups.is_recommended })
        .eq("whole_house_water_model_id", modelId)
        .eq("whole_house_water_part_id", partId);
      if (error) {
        errors.push(`compat upsert update: ${error.message}`);
      } else {
        applied.push(
          `compat_upsert:${ups.model_slug},${ups.filter_slug},rec=${String(ups.is_recommended)}`,
        );
      }
    } else {
      const { error } = await supabase.from("whole_house_water_compatibility_mappings").insert({
        whole_house_water_model_id: modelId,
        whole_house_water_part_id: partId,
        is_recommended: ups.is_recommended,
      });
      if (error) {
        errors.push(`compat upsert insert: ${error.message}`);
      } else {
        applied.push(
          `compat_upsert:${ups.model_slug},${ups.filter_slug},rec=${String(ups.is_recommended)}`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, applied: applied.sort(), before_after };
}

export type RunR09Ap903StandardCartridgeSupabaseParityDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applyFn?: (
    plan: R09Ap903StandardCartridgeParityPlanV1,
  ) => Promise<{
    ok: boolean;
    errors: string[];
    applied: string[];
    before_after: Record<string, unknown>;
  }>;
};

export async function runR09Ap903StandardCartridgeSupabaseParityGuardedApplyV1(
  deps: RunR09Ap903StandardCartridgeSupabaseParityDepsV1,
): Promise<R09Ap903SupabaseParityReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = deps.env ?? process.env;
  const blocked: string[] = [];
  const io = resolveIoCapabilityFromEnvV1(env);
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isR09Ap903StandardCartridgeSupabaseParityMutationEnabledV1(env);

  const trust = buildGuardedApplyTrustCurrencyPreflightV1({ rootDir: deps.rootDir, now });
  if (deps.mode === "apply" && guardedApplyTrustCurrencyBlocksMutationV1(trust)) {
    blocked.push(...trust.blockers.map((b) => `trust_currency:${b}`));
  }
  if (deps.mode === "apply" && io !== "MUTATION") {
    blocked.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const loaded = loadPlan(
    deps.rootDir,
    R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_JSON_REL_V1,
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
    relPath: R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
    planRelPath: R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    planSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });
  blocked.push(...approval.errors);

  let apply_status: R09Ap903ApplyStatusV1 = "BLOCKED";
  let applied_operations: string[] = [];
  let data_mutation = false;
  let before_after: Record<string, unknown> | undefined;

  const gatesClear =
    blocked.length === 0 &&
    plan != null &&
    approval.row != null &&
    planned_operations.length === R09_AP903_STANDARD_CARTRIDGE_EXPECTED_OPERATION_COUNT_V1;

  if (deps.mode === "dry_run") {
    apply_status = gatesClear ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!gatesClear) {
    apply_status = "BLOCKED";
  } else if (!mutation_flag_enabled) {
    blocked.push(`${R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1}_not_set`);
    apply_status = "BLOCKED";
  } else {
    const applyFn = deps.applyFn ?? defaultApplyR09Ap903StandardCartridgeSupabaseParityV1;
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
    contract: R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: deps.mode === "dry_run",
    data_mutation,
    supabase_mutation_authorized: gatesClear && mutation_flag_enabled && deps.mode === "apply",
    apply_status,
    blocked_reasons: Array.from(new Set(blocked)),
    plan_rel_path: R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    plan_sha256: loaded.sha256,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    io_capability: io,
    mutation_flag_enabled,
    planned_operations,
    applied_operations,
    before_after,
    generated_at: generatedAt,
    source_command: R09_AP903_STANDARD_CARTRIDGE_SUPABASE_PARITY_SOURCE_COMMAND_V1,
  };
}
