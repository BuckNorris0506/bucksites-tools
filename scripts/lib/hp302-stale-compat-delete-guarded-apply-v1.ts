/**
 * Guarded delete of two stale HP302 compatibility rows.
 * Default dry-run. Apply requires a founder approval bound to this plan's sha256,
 * trust currency, IO MUTATION, and a session env flag.
 * The delete allowlist is fixed in code. The plan cannot add keys.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { BUCKPARTS_IO_CAPABILITY_ENV_V1 } from "./buckparts-supabase-mutation-gate-core-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  buildGuardedApplyTrustCurrencyPreflightV1,
  guardedApplyTrustCurrencyBlocksMutationV1,
} from "./guarded-apply-trust-currency-preflight-v1";

export const HP302_STALE_COMPAT_DELETE_CONTRACT_V1 =
  "hp302_stale_compat_delete_guarded_apply_v1" as const;

export const HP302_STALE_COMPAT_DELETE_PLAN_CONTRACT_V1 =
  "hp302_stale_compat_delete_plan_v1" as const;

export const HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1 =
  "data/ops/site-integrity/hp302-stale-compat-delete-2026-10-12/hp302-stale-compat-delete-plan-v1.json" as const;

export const HP302_STALE_COMPAT_DELETE_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/hp302-stale-compat-delete-owner-approval-v1.json" as const;

export const HP302_STALE_COMPAT_DELETE_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_HP302_STALE_COMPAT_DELETE_MUTATION_ENABLED" as const;

export const HP302_STALE_COMPAT_DELETE_SOURCE_COMMAND_V1 =
  "npm run buckparts:hp302-stale-compat-delete-guarded-apply" as const;

export const HP302_STALE_COMPAT_DELETE_FOUNDER_OPTION_ID_V1 =
  "approve_hp302_stale_compat_delete_plan" as const;

export const HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1 = 2 as const;

export const HP302_STALE_COMPAT_DELETE_KEYS_V1 = [
  {
    model_slug: "shark-hp302",
    model_id: "b48de95e-d482-4ea3-9328-b324f4d7aae8",
    filter_slug: "shark-hepa-hp400",
    filter_id: "872f09f1-f8d6-4eb2-8e82-898af41ec8cf",
  },
  {
    model_slug: "shark-hp302",
    model_id: "b48de95e-d482-4ea3-9328-b324f4d7aae8",
    filter_slug: "shark-carbon-foam",
    filter_id: "43e0608a-570b-4326-98e9-0827e7764465",
  },
] as const;

export const HP302_STALE_COMPAT_PROTECTED_ROWS_V1 = [
  { model_slug: "shark-hp300", filter_slug: "shark-hepa-he3fkp" },
  { model_slug: "shark-hp301", filter_slug: "shark-hepa-he3fkp" },
  { model_slug: "shark-hp302", filter_slug: "shark-hepa-he3fkp" },
  { model_slug: "shark-hp305", filter_slug: "shark-hepa-he3fkp" },
  { model_slug: "shark-hp401", filter_slug: "shark-hepa-hp400" },
  { model_slug: "shark-hp402", filter_slug: "shark-hepa-hp400" },
  { model_slug: "shark-hp452", filter_slug: "shark-hepa-hp400" },
  { model_slug: "shark-hp462", filter_slug: "shark-hepa-hp400" },
  { model_slug: "shark-hp602", filter_slug: "shark-hepa-hp400" },
  { model_slug: "shark-hp652", filter_slug: "shark-hepa-hp400" },
] as const;

export type Hp302StaleCompatDeleteKeyV1 = {
  model_slug: string;
  model_id: string;
  filter_slug: string;
  filter_id: string;
  oem_part_number?: string;
};

export type Hp302StaleCompatDeletePlanV1 = {
  contract: typeof HP302_STALE_COMPAT_DELETE_PLAN_CONTRACT_V1;
  table: "air_purifier_compatibility_mappings";
  expected_delete_count: number;
  compatibility_deletes: Hp302StaleCompatDeleteKeyV1[];
};

export type Hp302CompatReaderV1 = {
  resolveModelId(slug: string): Promise<string | null>;
  resolveFilterId(slug: string): Promise<string | null>;
  readMapping(
    modelId: string,
    filterId: string,
  ): Promise<{ is_recommended: boolean } | null>;
  deleteMapping(modelId: string, filterId: string): Promise<{ error: string | null }>;
};

export type Hp302StaleCompatPreflightV1 = {
  ok: boolean;
  blockers: string[];
  requested_delete_keys: string[];
  expected_delete_keys: string[];
  delete_targets_outside_approved_plan: number;
  stale_rows_present: string[];
  protected_rows_present: string[];
};

export type Hp302StaleCompatApplyStatusV1 =
  | "DRY_RUN_READY"
  | "PREFLIGHT_FAILED"
  | "APPLIED"
  | "BLOCKED";

export type Hp302StaleCompatDeleteReportV1 = {
  contract: typeof HP302_STALE_COMPAT_DELETE_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  apply_status: Hp302StaleCompatApplyStatusV1;
  blocked_reasons: string[];
  plan_rel_path: string;
  plan_sha256: string | null;
  owner_approval_decision_id: string | null;
  io_capability: string;
  mutation_flag_enabled: boolean;
  trust_currency_blockers: string[];
  founder_approval_required: true;
  preflight: Hp302StaleCompatPreflightV1 | null;
  applied_operations: string[];
  generated_at: string;
  source_command: typeof HP302_STALE_COMPAT_DELETE_SOURCE_COMMAND_V1;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  hp302_stale_compat_delete_owner_approval_context_v1?: {
    founder_option_id?: string;
    parity_plan_rel_path?: string;
    expected_delete_count?: number;
  };
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hp302DeleteKeyLabelV1(key: {
  model_slug: string;
  filter_slug: string;
  model_id: string;
  filter_id: string;
}): string {
  return `${key.model_slug}|${key.filter_slug}|${key.model_id}|${key.filter_id}`;
}

function sameDeleteKey(a: Hp302StaleCompatDeleteKeyV1, b: (typeof HP302_STALE_COMPAT_DELETE_KEYS_V1)[number]): boolean {
  return (
    a.model_slug === b.model_slug &&
    a.model_id === b.model_id &&
    a.filter_slug === b.filter_slug &&
    a.filter_id === b.filter_id
  );
}

export function loadHp302StaleCompatDeletePlanV1(
  rootDir: string,
  readText: (abs: string) => string = (abs) => readFileSync(abs, "utf8"),
): {
  plan: Hp302StaleCompatDeletePlanV1 | null;
  sha256: string | null;
  errors: string[];
  parsed_deletes: Hp302StaleCompatDeleteKeyV1[];
  outside_count: number;
} {
  const abs = path.join(rootDir, HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1);
  if (!existsSync(abs)) {
    return {
      plan: null,
      sha256: null,
      errors: [`plan missing: ${HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1}`],
      parsed_deletes: [],
      outside_count: 0,
    };
  }
  const text = readText(abs);
  const sha256 = sha256Text(text);
  const plan = JSON.parse(text) as Hp302StaleCompatDeletePlanV1;
  const errors: string[] = [];
  if (plan.contract !== HP302_STALE_COMPAT_DELETE_PLAN_CONTRACT_V1) {
    errors.push(`plan contract mismatch: ${String(plan.contract)}`);
  }
  if (plan.table !== "air_purifier_compatibility_mappings") {
    errors.push("plan table must be air_purifier_compatibility_mappings");
  }
  if (plan.expected_delete_count !== HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1) {
    errors.push(`expected_delete_count must be ${String(HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1)}`);
  }
  const deletes = plan.compatibility_deletes ?? [];
  if (deletes.length !== HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1) {
    errors.push(`compatibility_deletes length ${String(deletes.length)} !== 2`);
  }
  if (deletes.length > HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1) {
    errors.push("requested delete count exceeds 2");
  }
  const outside = deletes.filter(
    (key) => !HP302_STALE_COMPAT_DELETE_KEYS_V1.some((allowed) => sameDeleteKey(key, allowed)),
  );
  if (outside.length > 0) {
    errors.push(`delete targets outside approved plan: ${String(outside.length)}`);
  }
  for (const allowed of HP302_STALE_COMPAT_DELETE_KEYS_V1) {
    if (!deletes.some((key) => sameDeleteKey(key, allowed))) {
      errors.push(`approved key missing from plan: ${allowed.model_slug},${allowed.filter_slug}`);
    }
  }
  return {
    plan: errors.length ? null : plan,
    sha256,
    errors,
    parsed_deletes: deletes,
    outside_count: outside.length,
  };
}

function csvHasPair(csvText: string, modelSlug: string, filterSlug: string): boolean {
  return csvText.split(/\r?\n/).some((line) => {
    const [model, filter] = line.split(",");
    return model?.trim() === modelSlug && filter?.trim() === filterSlug;
  });
}

function findOwnerApproval(args: {
  rootDir: string;
  planSha256: string | null;
  referenceTimeIso: string;
  readText: (abs: string) => string;
}): { row: RawRegistryRowV1 | null; errors: string[] } {
  const errors: string[] = [];
  const abs = path.join(args.rootDir, HP302_STALE_COMPAT_DELETE_OWNER_APPROVAL_JSON_REL_V1);
  if (!existsSync(abs)) {
    return {
      row: null,
      errors: [`founder approval required: ${HP302_STALE_COMPAT_DELETE_OWNER_APPROVAL_JSON_REL_V1}`],
    };
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
    const ctx = row.hp302_stale_compat_delete_owner_approval_context_v1;
    if (ctx?.founder_option_id !== HP302_STALE_COMPAT_DELETE_FOUNDER_OPTION_ID_V1) continue;
    if (ctx.parity_plan_rel_path !== HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1) continue;
    if (ctx.expected_delete_count !== HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1) continue;
    const binding = (row.bound_artifacts_v1 ?? []).find(
      (item) => item.artifact_rel_path === HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1,
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
  errors.push("no matching HP302 stale compat delete owner approval row");
  return { row: null, errors };
}

export async function preflightHp302StaleCompatDeleteV1(args: {
  rootDir: string;
  reader: Hp302CompatReaderV1;
  readText?: (abs: string) => string;
}): Promise<Hp302StaleCompatPreflightV1> {
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const loaded = loadHp302StaleCompatDeletePlanV1(args.rootDir, readText);
  const blockers = [...loaded.errors];
  const expected = HP302_STALE_COMPAT_DELETE_KEYS_V1.map(hp302DeleteKeyLabelV1);
  const requested = loaded.parsed_deletes.map(hp302DeleteKeyLabelV1);
  const outside = loaded.outside_count;

  const csvAbs = path.join(args.rootDir, "data/air-purifier/compatibility_mappings.csv");
  const csvText = existsSync(csvAbs) ? readText(csvAbs) : "";
  if (!csvText) blockers.push("compatibility csv missing");
  for (const key of HP302_STALE_COMPAT_DELETE_KEYS_V1) {
    if (csvHasPair(csvText, key.model_slug, key.filter_slug)) {
      blockers.push(`csv still contains ${key.model_slug},${key.filter_slug}`);
    }
  }
  if (!csvHasPair(csvText, "shark-hp302", "shark-hepa-he3fkp")) {
    blockers.push("csv missing shark-hp302,shark-hepa-he3fkp");
  }

  const stalePresent: string[] = [];
  if (loaded.plan) {
    for (const key of loaded.plan.compatibility_deletes) {
      const modelId = await args.reader.resolveModelId(key.model_slug);
      const filterId = await args.reader.resolveFilterId(key.filter_slug);
      if (modelId !== key.model_id) blockers.push(`model id drift ${key.model_slug}`);
      if (filterId !== key.filter_id) blockers.push(`filter id drift ${key.filter_slug}`);
      const row =
        modelId && filterId ? await args.reader.readMapping(modelId, filterId) : null;
      if (!row) blockers.push(`stale row absent ${key.model_slug},${key.filter_slug}`);
      else stalePresent.push(hp302DeleteKeyLabelV1(key));
    }
  }

  const protectedPresent: string[] = [];
  for (const key of HP302_STALE_COMPAT_PROTECTED_ROWS_V1) {
    const modelId = await args.reader.resolveModelId(key.model_slug);
    const filterId = await args.reader.resolveFilterId(key.filter_slug);
    if (!modelId || !filterId) {
      blockers.push(`protected lookup failed ${key.model_slug},${key.filter_slug}`);
      continue;
    }
    const row = await args.reader.readMapping(modelId, filterId);
    if (!row) {
      blockers.push(`protected row absent ${key.model_slug},${key.filter_slug}`);
      continue;
    }
    if (row.is_recommended !== true) {
      blockers.push(`protected row not recommended ${key.model_slug},${key.filter_slug}`);
      continue;
    }
    protectedPresent.push(`${key.model_slug}|${key.filter_slug}`);
  }

  const hp302Id = await args.reader.resolveModelId("shark-hp302");
  const he3Id = await args.reader.resolveFilterId("shark-hepa-he3fkp");
  if (hp302Id && he3Id) {
    for (const key of HP302_STALE_COMPAT_DELETE_KEYS_V1) {
      if (key.model_id === hp302Id && key.filter_id === he3Id) {
        blockers.push("delete set includes HP302 → HE3FKPET");
      }
    }
  }

  return {
    ok: blockers.length === 0 && outside === 0,
    blockers,
    requested_delete_keys: requested,
    expected_delete_keys: expected,
    delete_targets_outside_approved_plan: outside,
    stale_rows_present: stalePresent,
    protected_rows_present: protectedPresent,
  };
}

async function defaultReader(): Promise<Hp302CompatReaderV1> {
  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();
  return {
    async resolveModelId(slug) {
      const { data, error } = await supabase
        .from("air_purifier_models")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data?.id) return null;
      return String(data.id);
    },
    async resolveFilterId(slug) {
      const { data, error } = await supabase
        .from("air_purifier_filters")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data?.id) return null;
      return String(data.id);
    },
    async readMapping(modelId, filterId) {
      const { data, error } = await supabase
        .from("air_purifier_compatibility_mappings")
        .select("is_recommended")
        .eq("air_purifier_model_id", modelId)
        .eq("air_purifier_filter_id", filterId)
        .maybeSingle();
      if (error || !data) return null;
      return { is_recommended: data.is_recommended === true };
    },
    async deleteMapping(modelId, filterId) {
      const { error } = await supabase
        .from("air_purifier_compatibility_mappings")
        .delete()
        .eq("air_purifier_model_id", modelId)
        .eq("air_purifier_filter_id", filterId);
      return { error: error ? error.message : null };
    },
  };
}

export function isHp302StaleCompatDeleteMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[HP302_STALE_COMPAT_DELETE_MUTATION_ENV_FLAG_V1] === "1";
}

export async function runHp302StaleCompatDeleteGuardedApplyV1(args: {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  readText?: (abs: string) => string;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
  reader?: Hp302CompatReaderV1;
}): Promise<Hp302StaleCompatDeleteReportV1> {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = args.env ?? process.env;
  const blocked: string[] = [];
  const ioRaw = env[BUCKPARTS_IO_CAPABILITY_ENV_V1]?.trim().toUpperCase();
  const io = ioRaw === "MUTATION" ? "MUTATION" : "READ_INDEX";
  const mutation_flag_enabled =
    typeof args.mutationEnabled === "boolean"
      ? args.mutationEnabled
      : isHp302StaleCompatDeleteMutationEnabledV1(env);

  const reader = args.reader ?? (await defaultReader());
  const preflight = await preflightHp302StaleCompatDeleteV1({
    rootDir: args.rootDir,
    reader,
    readText,
  });
  if (!preflight.ok) blocked.push(...preflight.blockers.map((item) => `preflight:${item}`));

  const trust = buildGuardedApplyTrustCurrencyPreflightV1({ rootDir: args.rootDir, now });
  if (args.mode === "apply" && guardedApplyTrustCurrencyBlocksMutationV1(trust)) {
    blocked.push(...trust.blockers.map((item) => `trust_currency:${item}`));
  }
  if (args.mode === "apply" && io !== "MUTATION") {
    blocked.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const loaded = loadHp302StaleCompatDeletePlanV1(args.rootDir, readText);
  const approval = findOwnerApproval({
    rootDir: args.rootDir,
    planSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });
  blocked.push(...approval.errors);

  const gatesClear = blocked.length === 0 && loaded.plan != null && approval.row != null && preflight.ok;
  let apply_status: Hp302StaleCompatApplyStatusV1 = "BLOCKED";
  let applied: string[] = [];
  let data_mutation = false;

  if (args.mode === "dry_run") {
    apply_status = gatesClear ? "DRY_RUN_READY" : preflight.ok ? "BLOCKED" : "PREFLIGHT_FAILED";
  } else if (!preflight.ok || !loaded.plan) {
    apply_status = "PREFLIGHT_FAILED";
  } else if (!gatesClear) {
    apply_status = "BLOCKED";
  } else if (!mutation_flag_enabled) {
    blocked.push(`${HP302_STALE_COMPAT_DELETE_MUTATION_ENV_FLAG_V1}_not_set`);
    apply_status = "BLOCKED";
  } else {
    data_mutation = true;
    let deleteFailed = false;
    for (const key of loaded.plan.compatibility_deletes) {
      if (key.filter_slug === "shark-hepa-he3fkp") {
        blocked.push("refusing to delete HP302 → HE3FKPET");
        deleteFailed = true;
        break;
      }
      const result = await reader.deleteMapping(key.model_id, key.filter_id);
      if (result.error) {
        blocked.push(`delete ${key.model_slug},${key.filter_slug}: ${result.error}`);
        deleteFailed = true;
        break;
      }
      applied.push(`compat_remove:${key.model_slug},${key.filter_slug}`);
    }
    if (deleteFailed) {
      apply_status = "BLOCKED";
    } else {
      const afterBlockers: string[] = [];
      for (const key of loaded.plan.compatibility_deletes) {
        const still = await reader.readMapping(key.model_id, key.filter_id);
        if (still) afterBlockers.push(`still present ${key.model_slug},${key.filter_slug}`);
      }
      for (const key of HP302_STALE_COMPAT_PROTECTED_ROWS_V1) {
        const modelId = await reader.resolveModelId(key.model_slug);
        const filterId = await reader.resolveFilterId(key.filter_slug);
        const row = modelId && filterId ? await reader.readMapping(modelId, filterId) : null;
        if (!row || row.is_recommended !== true) {
          afterBlockers.push(`protected row missing after delete ${key.model_slug},${key.filter_slug}`);
        }
      }
      if (afterBlockers.length > 0 || applied.length !== HP302_STALE_COMPAT_DELETE_EXPECTED_COUNT_V1) {
        blocked.push(...afterBlockers, "post-delete verification failed");
        apply_status = "BLOCKED";
      } else {
        apply_status = "APPLIED";
      }
    }
  }

  return {
    contract: HP302_STALE_COMPAT_DELETE_CONTRACT_V1,
    mode: args.mode,
    read_only: args.mode === "dry_run",
    data_mutation,
    supabase_mutation_authorized: gatesClear && mutation_flag_enabled && args.mode === "apply",
    apply_status,
    blocked_reasons: Array.from(new Set(blocked)),
    plan_rel_path: HP302_STALE_COMPAT_DELETE_PLAN_JSON_REL_V1,
    plan_sha256: loaded.sha256,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    io_capability: io,
    mutation_flag_enabled,
    trust_currency_blockers: trust.blockers,
    founder_approval_required: true,
    preflight,
    applied_operations: applied,
    generated_at: generatedAt,
    source_command: HP302_STALE_COMPAT_DELETE_SOURCE_COMMAND_V1,
  };
}
