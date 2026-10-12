/**
 * Guarded R04 GSWF/GSWF2 alias-trust Supabase parity — two filter_aliases deletes only.
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

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "r04_gswf_alias_trust_supabase_parity_guarded_apply_v1" as const;

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_JSON_REL_V1 =
  "data/ops/site-integrity/production-integrity-baseline-2026-10-10/r04-gswf-alias-trust-supabase-parity-plan-2026-10-12.json" as const;

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/r04-gswf-alias-trust-supabase-parity-owner-approval-v1.json" as const;

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_MUTATION_ENABLED" as const;

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:r04-gswf-alias-trust-supabase-parity-guarded-apply" as const;

export const R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_CONTRACT_V1 =
  "r04_gswf_alias_trust_supabase_parity_plan_v1" as const;

export const R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1 = 2 as const;

export type R04GswfAliasTrustParityPlanV1 = {
  contract: typeof R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_CONTRACT_V1;
  expected_operation_count: number;
  proposed_supabase_changes: {
    filter_alias_deletes: Array<{ filter_slug: string; alias: string }>;
  };
};

export type R04GswfAliasTrustApplyStatusV1 = "DRY_RUN_READY" | "ALREADY_IN_SYNC" | "APPLIED" | "BLOCKED";

export type R04GswfAliasTrustSupabaseParityReportV1 = {
  contract: typeof R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  apply_status: R04GswfAliasTrustApplyStatusV1;
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
  source_command: typeof R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_SOURCE_COMMAND_V1;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  r04_gswf_alias_trust_supabase_parity_owner_approval_context_v1?: {
    founder_option_id?: string;
    parity_plan_rel_path?: string;
    expected_operation_count?: number;
  };
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function isR04GswfAliasTrustSupabaseParityMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1] === "1";
}

function loadPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: R04GswfAliasTrustParityPlanV1 | null; sha256: string | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, sha256: null, errors: [`parity plan missing: ${relPath}`] };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as R04GswfAliasTrustParityPlanV1;
  const errors: string[] = [];
  if (plan.contract !== R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_CONTRACT_V1) {
    errors.push(`plan contract mismatch: ${String(plan.contract)}`);
  }
  if (plan.expected_operation_count !== R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `expected_operation_count must be ${String(R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1)}`,
    );
  }
  const deletes = plan.proposed_supabase_changes?.filter_alias_deletes ?? [];
  if (deletes.length !== R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1) {
    errors.push(
      `proposed delete count ${String(deletes.length)} !== ${String(R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1)}`,
    );
  }
  const allowed = new Set(["gswf,GSWF2", "gswf2,GSWF"]);
  for (const d of deletes) {
    const key = `${d.filter_slug},${d.alias}`;
    if (!allowed.has(key)) {
      errors.push(`unauthorized delete in plan: ${key}`);
    }
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
    const ctx = row.r04_gswf_alias_trust_supabase_parity_owner_approval_context_v1;
    if (ctx?.founder_option_id !== "approve_r04_gswf_alias_trust_supabase_parity_plan") {
      continue;
    }
    if (ctx.parity_plan_rel_path !== args.planRelPath) continue;
    if (ctx.expected_operation_count !== R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1) {
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
  errors.push("no matching R04 GSWF alias-trust supabase parity owner approval row");
  return { row: null, errors };
}

function plannedOperationKeys(plan: R04GswfAliasTrustParityPlanV1): string[] {
  return plan.proposed_supabase_changes.filter_alias_deletes
    .map((d) => `filter_alias_delete:${d.filter_slug},${d.alias}`)
    .sort();
}

async function resolveFilterId(
  supabase: { from: (t: string) => any },
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase.from("filters").select("id").eq("slug", slug).maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function inspectR04GswfAliasTrustFilterAliasesV1(): Promise<{
  gswf_filter_id: string | null;
  gswf2_filter_id: string | null;
  alias_rows: Array<{ filter_slug: string; filter_id: string; alias: string; id?: string }>;
}> {
  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();
  const gswfId = await resolveFilterId(supabase, "gswf");
  const gswf2Id = await resolveFilterId(supabase, "gswf2");
  const ids = [gswfId, gswf2Id].filter(Boolean) as string[];
  if (ids.length === 0) {
    return { gswf_filter_id: gswfId, gswf2_filter_id: gswf2Id, alias_rows: [] };
  }
  const { data, error } = await supabase
    .from("filter_aliases")
    .select("id, filter_id, alias")
    .in("filter_id", ids);
  if (error) {
    throw new Error(`filter_aliases inspect: ${error.message}`);
  }
  const slugById = new Map<string, string>();
  if (gswfId) slugById.set(gswfId, "gswf");
  if (gswf2Id) slugById.set(gswf2Id, "gswf2");
  const alias_rows = (data ?? []).map((r: { id: string; filter_id: string; alias: string }) => ({
    id: r.id,
    filter_id: r.filter_id,
    filter_slug: slugById.get(r.filter_id) ?? "unknown",
    alias: r.alias,
  }));
  return { gswf_filter_id: gswfId, gswf2_filter_id: gswf2Id, alias_rows };
}

export async function defaultApplyR04GswfAliasTrustSupabaseParityV1(
  plan: R04GswfAliasTrustParityPlanV1,
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

  for (const del of plan.proposed_supabase_changes.filter_alias_deletes) {
    const filterId = await resolveFilterId(supabase, del.filter_slug);
    if (!filterId) {
      errors.push(`filter lookup missing: ${del.filter_slug}`);
      continue;
    }

    const { data: before, error: readErr } = await supabase
      .from("filter_aliases")
      .select("id, filter_id, alias")
      .eq("filter_id", filterId)
      .eq("alias", del.alias)
      .maybeSingle();
    if (readErr) {
      errors.push(`alias pre-read ${del.filter_slug}/${del.alias}: ${readErr.message}`);
      continue;
    }
    before_after[`alias_${del.filter_slug}_${del.alias}`] = before ?? null;

    if (!before) {
      applied.push(`filter_alias_delete:${del.filter_slug},${del.alias},already_absent`);
      continue;
    }

    const { error: delErr } = await supabase
      .from("filter_aliases")
      .delete()
      .eq("filter_id", filterId)
      .eq("alias", del.alias);
    if (delErr) {
      errors.push(`alias delete ${del.filter_slug}/${del.alias}: ${delErr.message}`);
    } else {
      applied.push(`filter_alias_delete:${del.filter_slug},${del.alias}`);
    }
  }

  const afterInspect = await inspectR04GswfAliasTrustFilterAliasesV1();
  before_after.after_inspect = afterInspect;

  return { ok: errors.length === 0, errors, applied: applied.sort(), before_after };
}

export type RunR04GswfAliasTrustSupabaseParityDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  readText?: (absPath: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  applyFn?: (
    plan: R04GswfAliasTrustParityPlanV1,
  ) => Promise<{
    ok: boolean;
    errors: string[];
    applied: string[];
    before_after: Record<string, unknown>;
  }>;
};

export async function runR04GswfAliasTrustSupabaseParityGuardedApplyV1(
  deps: RunR04GswfAliasTrustSupabaseParityDepsV1,
): Promise<R04GswfAliasTrustSupabaseParityReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = deps.env ?? process.env;
  const blocked: string[] = [];
  const io = resolveIoCapabilityFromEnvV1(env);
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isR04GswfAliasTrustSupabaseParityMutationEnabledV1(env);

  const trust = buildGuardedApplyTrustCurrencyPreflightV1({ rootDir: deps.rootDir, now });
  if (deps.mode === "apply" && guardedApplyTrustCurrencyBlocksMutationV1(trust)) {
    blocked.push(...trust.blockers.map((b) => `trust_currency:${b}`));
  }
  if (deps.mode === "apply" && io !== "MUTATION") {
    blocked.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const loaded = loadPlan(
    deps.rootDir,
    R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_JSON_REL_V1,
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
    relPath: R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_OWNER_APPROVAL_JSON_REL_V1,
    planRelPath: R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    planSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });
  blocked.push(...approval.errors);

  let apply_status: R04GswfAliasTrustApplyStatusV1 = "BLOCKED";
  let applied_operations: string[] = [];
  let data_mutation = false;
  let before_after: Record<string, unknown> | undefined;

  const gatesClear =
    blocked.length === 0 &&
    plan != null &&
    approval.row != null &&
    planned_operations.length === R04_GSWF_ALIAS_TRUST_EXPECTED_OPERATION_COUNT_V1;

  if (deps.mode === "dry_run") {
    apply_status = gatesClear ? "DRY_RUN_READY" : "BLOCKED";
    try {
      const inspect = await inspectR04GswfAliasTrustFilterAliasesV1();
      before_after = { pre_apply_inspect: inspect };
    } catch (e) {
      blocked.push(`inspect_failed:${e instanceof Error ? e.message : String(e)}`);
      apply_status = "BLOCKED";
    }
  } else if (!gatesClear) {
    apply_status = "BLOCKED";
  } else if (!mutation_flag_enabled) {
    blocked.push(`${R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_MUTATION_ENV_FLAG_V1}_not_set`);
    apply_status = "BLOCKED";
  } else {
    const applyFn = deps.applyFn ?? defaultApplyR04GswfAliasTrustSupabaseParityV1;
    data_mutation = true;
    const result = await applyFn(plan!);
    applied_operations = result.applied;
    before_after = result.before_after;
    if (!result.ok) {
      blocked.push(...result.errors);
      apply_status = "BLOCKED";
    } else if (
      applied_operations.every((op) => op.includes("already_absent")) &&
      applied_operations.length > 0
    ) {
      apply_status = "ALREADY_IN_SYNC";
    } else if (applied_operations.length === 0) {
      apply_status = "ALREADY_IN_SYNC";
    } else {
      apply_status = "APPLIED";
    }
  }

  return {
    contract: R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: deps.mode === "dry_run",
    data_mutation,
    supabase_mutation_authorized: gatesClear && mutation_flag_enabled && deps.mode === "apply",
    apply_status,
    blocked_reasons: Array.from(new Set(blocked)),
    plan_rel_path: R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_PLAN_JSON_REL_V1,
    plan_sha256: loaded.sha256,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    io_capability: io,
    mutation_flag_enabled,
    planned_operations,
    applied_operations,
    before_after,
    generated_at: generatedAt,
    source_command: R04_GSWF_ALIAS_TRUST_SUPABASE_PARITY_SOURCE_COMMAND_V1,
  };
}
