/**
 * Guarded delete of the catalog-completeness mirror compatibility rows.
 *
 * Reuses the GSWF wrong-part pattern: default dry-run, exact
 * (fridge_model_id, filter_id) deletes, founder approval bound to the plan
 * sha256, and a mutation env flag. This is not a catalog sync and does not
 * wipe the fridge link graph.
 *
 * Apply stays fail-closed unless ALL of:
 *   - derived CSV diff still matches the persisted plan hash
 *   - production preflight matches the dry-run snapshot
 *   - every delete key is in the expected set and the count does not exceed it
 *   - founder approval passes founderRegistryRowPassesMutationApprovalGateV1
 *   - BUCKPARTS_IO_CAPABILITY=MUTATION
 *   - BUCKPARTS_CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENABLED=1
 *   - explicit --apply
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  buildSupabaseMutationGatePreflightV1,
  type SupabaseMutationGatePreflightV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import {
  CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_CONTRACT_V1,
  CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
  CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1,
  CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1,
  CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1,
  canonicalCatalogCompletenessMirrorRemovalPlanTextV1,
  deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1,
  sha256Utf8V1,
  type CatalogCompletenessMirrorCompatRemovalPlanV1,
} from "./catalog-completeness-mirror-compat-removal-v1";

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1 =
  "catalog_completeness_mirror_compat_removal_guarded_apply_v1" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/catalog-completeness-mirror-compat-removal-owner-approval-v1.json" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/catalog-completeness-mirror-compat-removal-guarded-dry-run-v1.json" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENABLED" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_SOURCE_COMMAND_V1 =
  "npx tsx scripts/apply-catalog-completeness-mirror-compat-removal-guarded-v1.ts" as const;

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

type SlugIdRowV1 = { slug: string; id: string };
type MappingRowV1 = { fridge_model_id: string; filter_id: string };

export type CatalogCompletenessMirrorDeleteTargetV1 = {
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
  fridge_model_id: string;
  filter_id: string;
  id_key: string;
};

export type CatalogCompletenessMirrorUnexpectedRowV1 = {
  fridge_model_id: string;
  filter_id: string;
  filter_slug: string | null;
  fridge_slug: string | null;
};

export type CatalogCompletenessMirrorProductionSnapshotV1 = {
  present_row_keys: string[];
  already_absent_row_keys: string[];
  unexpected_production_rows: CatalogCompletenessMirrorUnexpectedRowV1[];
  delete_targets: CatalogCompletenessMirrorDeleteTargetV1[];
  delete_targets_outside_expected_set: number;
  ambiguous_slug_errors: string[];
  control_counts: Record<string, number>;
};

type SupabaseQueryResultV1<T> = { data: T[] | null; error: { message: string } | null };

export type CatalogCompletenessMirrorSupabaseV1 = {
  from: (table: string) => {
    select: (columns: string) => CatalogCompletenessMirrorFilterQueryV1;
    delete: (options?: { count?: "exact" }) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (column: string, value: string) => Promise<SupabaseQueryResultV1<MappingRowV1> & { count: number | null }>;
      };
    };
  };
};

type CatalogCompletenessMirrorFilterQueryV1 = {
  eq: (column: string, value: string) => CatalogCompletenessMirrorFilterQueryV1;
  in: (column: string, values: string[]) => CatalogCompletenessMirrorFilterQueryV1;
  range: (from: number, to: number) => Promise<SupabaseQueryResultV1<SlugIdRowV1 | MappingRowV1>>;
};

export type CatalogCompletenessMirrorDeleteResultV1 = {
  ok: boolean;
  error: string | null;
  deleted_count: number;
};

type OwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  plan_rel_path?: string;
  approved_delete_count?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  catalog_completeness_mirror_compat_removal_owner_approval_context_v1?: OwnerApprovalContextV1;
};

export type CatalogCompletenessMirrorGuardedApplyReportV1 = {
  contract: typeof CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  supabase_mutation_authorized: boolean;
  mutation_authorized: boolean;
  mutationGateRef: typeof CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "ALREADY_ABSENT" | "BLOCKED" | "PARTIAL";
  blocked_reasons: string[];
  plan_rel_path: string;
  plan_sha256: string | null;
  expected_delete_count: number;
  production_match_count: number;
  already_absent_count: number;
  unexpected_production_rows: CatalogCompletenessMirrorUnexpectedRowV1[];
  delete_targets_outside_expected_set: number;
  present_row_keys: string[];
  already_absent_row_keys: string[];
  applied_row_keys: string[];
  post_write_targets_remaining: number | null;
  control_counts: Record<string, number>;
  control_counts_unchanged: boolean | null;
  owner_approval_present: boolean;
  owner_approval_valid: boolean;
  production_write_authority_status: "authorized" | "absent";
  io_capability_preflight: SupabaseMutationGatePreflightV1;
  generated_at: string;
};

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

export function isCatalogCompletenessMirrorRemovalMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENV_FLAG_V1] === "1";
}

function idKey(fridgeModelId: string, filterId: string): string {
  return `${fridgeModelId}::${filterId}`;
}

async function selectAllPages(
  build: (from: number, to: number) => Promise<SupabaseQueryResultV1<SlugIdRowV1 | MappingRowV1>>,
): Promise<{ rows: Array<SlugIdRowV1 | MappingRowV1>; error: string | null }> {
  const rows: Array<SlugIdRowV1 | MappingRowV1> = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const result = await build(from, to);
    if (result.error) return { rows: [], error: result.error.message };
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, error: null };
  }
  return { rows: [], error: "production_read_truncated" };
}

export async function readCatalogCompletenessMirrorProductionSnapshotV1(args: {
  supabase: CatalogCompletenessMirrorSupabaseV1;
  plan: CatalogCompletenessMirrorCompatRemovalPlanV1;
}): Promise<{ ok: true; snapshot: CatalogCompletenessMirrorProductionSnapshotV1 } | { ok: false; errors: string[] }> {
  const expectedFilters = [...CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1];
  const controlFilters = [...CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1];
  const fridgeSlugs = sortedUnique(args.plan.deletes.map((row) => row.fridge_slug));
  const slugLookup = sortedUnique([...expectedFilters, ...controlFilters, ...fridgeSlugs]);

  const filterRead = await selectAllPages((from, to) =>
    args.supabase.from("filters").select("id, slug").in("slug", slugLookup).range(from, to),
  );
  if (filterRead.error) return { ok: false, errors: [`filters lookup failed: ${filterRead.error}`] };
  const fridgeRead = await selectAllPages((from, to) =>
    args.supabase.from("fridge_models").select("id, slug").in("slug", fridgeSlugs).range(from, to),
  );
  if (fridgeRead.error) {
    return { ok: false, errors: [`fridge_models lookup failed: ${fridgeRead.error}`] };
  }

  const ambiguous: string[] = [];
  const filterIdBySlug = new Map<string, string>();
  const fridgeIdBySlug = new Map<string, string>();
  const filterSlugById = new Map<string, string>();
  const fridgeSlugById = new Map<string, string>();

  for (const row of filterRead.rows as SlugIdRowV1[]) {
    const slug = row.slug.trim().toLowerCase();
    const id = String(row.id);
    if (filterIdBySlug.has(slug) && filterIdBySlug.get(slug) !== id) {
      ambiguous.push(`filters slug ${slug} resolves to more than one id`);
    }
    filterIdBySlug.set(slug, id);
    filterSlugById.set(id, slug);
  }
  for (const row of fridgeRead.rows as SlugIdRowV1[]) {
    const slug = row.slug.trim().toLowerCase();
    const id = String(row.id);
    if (fridgeIdBySlug.has(slug) && fridgeIdBySlug.get(slug) !== id) {
      ambiguous.push(`fridge_models slug ${slug} resolves to more than one id`);
    }
    fridgeIdBySlug.set(slug, id);
    fridgeSlugById.set(id, slug);
  }
  if (ambiguous.length > 0) {
    return {
      ok: true,
      snapshot: {
        present_row_keys: [],
        already_absent_row_keys: [],
        unexpected_production_rows: [],
        delete_targets: [],
        delete_targets_outside_expected_set: 0,
        ambiguous_slug_errors: ambiguous,
        control_counts: {},
      },
    };
  }

  const expectedFilterIds = expectedFilters
    .map((slug) => filterIdBySlug.get(slug))
    .filter((id): id is string => Boolean(id));
  const controlIds = controlFilters
    .map((slug) => filterIdBySlug.get(slug))
    .filter((id): id is string => Boolean(id));
  const mappingFilterIds = sortedUnique([...expectedFilterIds, ...controlIds]);

  const mappingRead =
    mappingFilterIds.length === 0
      ? { rows: [], error: null }
      : await selectAllPages((from, to) =>
          args.supabase
            .from("compatibility_mappings")
            .select("fridge_model_id, filter_id")
            .in("filter_id", mappingFilterIds)
            .range(from, to),
        );
  if (mappingRead.error) {
    return { ok: false, errors: [`compatibility_mappings lookup failed: ${mappingRead.error}`] };
  }

  const expectedById = new Map<string, CatalogCompletenessMirrorDeleteTargetV1>();
  const alreadyAbsent: string[] = [];
  for (const row of args.plan.deletes) {
    const filterId = filterIdBySlug.get(row.filter_slug);
    const fridgeId = fridgeIdBySlug.get(row.fridge_slug);
    if (!filterId || !fridgeId) {
      alreadyAbsent.push(row.row_key);
      continue;
    }
    const key = idKey(fridgeId, filterId);
    if (expectedById.has(key)) {
      ambiguous.push(`slug pair collision on production id ${key}: ${row.row_key}`);
      continue;
    }
    expectedById.set(key, {
      ...row,
      fridge_model_id: fridgeId,
      filter_id: filterId,
      id_key: key,
    });
  }
  for (const slug of controlFilters) {
    if (!filterIdBySlug.has(slug)) {
      ambiguous.push(`control filter slug missing in production: ${slug}`);
    }
  }
  if (ambiguous.length > 0) {
    return {
      ok: true,
      snapshot: {
        present_row_keys: [],
        already_absent_row_keys: alreadyAbsent.sort(),
        unexpected_production_rows: [],
        delete_targets: [],
        delete_targets_outside_expected_set: 0,
        ambiguous_slug_errors: ambiguous,
        control_counts: {},
      },
    };
  }

  const seenId = new Set<string>();
  const present: string[] = [];
  const deleteTargets: CatalogCompletenessMirrorDeleteTargetV1[] = [];
  const unexpected: CatalogCompletenessMirrorUnexpectedRowV1[] = [];
  const controlCounts: Record<string, number> = {};
  for (const slug of controlFilters) controlCounts[slug] = 0;

  for (const raw of mappingRead.rows as MappingRowV1[]) {
    const fridge_model_id = String(raw.fridge_model_id);
    const filter_id = String(raw.filter_id);
    const key = idKey(fridge_model_id, filter_id);
    if (seenId.has(key)) {
      ambiguous.push(`duplicate compatibility_mappings row ${key}`);
      continue;
    }
    seenId.add(key);
    const filterSlug = filterSlugById.get(filter_id) ?? null;
    if (filterSlug && Object.prototype.hasOwnProperty.call(controlCounts, filterSlug)) {
      controlCounts[filterSlug] += 1;
    }
    const expected = expectedById.get(key);
    if (expected) {
      present.push(expected.row_key);
      deleteTargets.push(expected);
      continue;
    }
    if (filterSlug && expectedFilters.includes(filterSlug)) {
      unexpected.push({
        fridge_model_id,
        filter_id,
        filter_slug: filterSlug,
        fridge_slug: fridgeSlugById.get(fridge_model_id) ?? null,
      });
    }
  }

  for (const row of args.plan.deletes) {
    if (!present.includes(row.row_key) && !alreadyAbsent.includes(row.row_key)) {
      alreadyAbsent.push(row.row_key);
    }
  }

  const outside = deleteTargets.filter(
    (target) => !args.plan.deletes.some((row) => row.row_key === target.row_key),
  ).length;

  return {
    ok: true,
    snapshot: {
      present_row_keys: present.sort(),
      already_absent_row_keys: alreadyAbsent.sort(),
      unexpected_production_rows: unexpected,
      delete_targets: deleteTargets.sort((a, b) => a.row_key.localeCompare(b.row_key)),
      delete_targets_outside_expected_set: outside,
      ambiguous_slug_errors: ambiguous,
      control_counts: controlCounts,
    },
  };
}

/**
 * Deletes one compatibility row by exact composite primary key.
 * Refuses any id pair that is not in the proven expected-delete set.
 */
export async function deleteCatalogCompletenessMirrorCompatRowV1(args: {
  supabase: CatalogCompletenessMirrorSupabaseV1;
  fridge_model_id: string;
  filter_id: string;
  allowedIdKeys: ReadonlySet<string>;
}): Promise<CatalogCompletenessMirrorDeleteResultV1> {
  const key = idKey(args.fridge_model_id, args.filter_id);
  if (!args.allowedIdKeys.has(key)) {
    return { ok: false, error: "delete_target_outside_expected_set", deleted_count: 0 };
  }
  const before = await args.supabase
    .from("compatibility_mappings")
    .select("fridge_model_id, filter_id")
    .eq("fridge_model_id", args.fridge_model_id)
    .eq("filter_id", args.filter_id)
    .range(0, 10);
  if (before.error) {
    return { ok: false, error: `pre-delete lookup failed: ${before.error.message}`, deleted_count: 0 };
  }
  if ((before.data ?? []).length !== 1) {
    return {
      ok: false,
      error: `pre-delete row count ${(before.data ?? []).length} for ${key}`,
      deleted_count: 0,
    };
  }
  const removed = await args.supabase
    .from("compatibility_mappings")
    .delete({ count: "exact" })
    .eq("fridge_model_id", args.fridge_model_id)
    .eq("filter_id", args.filter_id);
  if (removed.error) {
    return { ok: false, error: `delete failed: ${removed.error.message}`, deleted_count: 0 };
  }
  const after = await args.supabase
    .from("compatibility_mappings")
    .select("fridge_model_id, filter_id")
    .eq("fridge_model_id", args.fridge_model_id)
    .eq("filter_id", args.filter_id)
    .range(0, 10);
  if (after.error) {
    return { ok: false, error: `post-delete lookup failed: ${after.error.message}`, deleted_count: 0 };
  }
  if ((after.data ?? []).length !== 0) {
    return { ok: false, error: `row still present after delete ${key}`, deleted_count: 0 };
  }
  return { ok: true, error: null, deleted_count: 1 };
}

function loadPersistedPlan(args: {
  rootDir: string;
  readText: (abs: string) => string;
  canonicalText: string;
  planSha256: string;
}): { errors: string[] } {
  const abs = path.join(args.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1);
  if (!existsSync(abs)) return { errors: [] };
  const existing = args.readText(abs);
  if (sha256Utf8V1(existing) !== args.planSha256 || existing !== args.canonicalText) {
    return { errors: ["expected plan hash changed; refusing to overwrite or apply a different delete set"] };
  }
  const parsed = JSON.parse(existing) as CatalogCompletenessMirrorCompatRemovalPlanV1;
  if (parsed.contract !== CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_CONTRACT_V1) {
    return { errors: ["persisted plan contract mismatch"] };
  }
  if (parsed.apply_authorized !== false || parsed.supabase_mutation_authorized !== false) {
    return { errors: ["persisted plan must not authorize mutation by itself"] };
  }
  return { errors: [] };
}

function findOwnerApproval(args: {
  rootDir: string;
  planSha256: string | null;
  referenceTimeIso: string;
  readText: (abs: string) => string;
}): { present: boolean; valid: boolean; errors: string[] } {
  const abs = path.join(args.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_OWNER_APPROVAL_JSON_REL_V1);
  if (!existsSync(abs)) {
    return { present: false, valid: false, errors: ["founder approval for this exact plan is absent"] };
  }
  const doc = JSON.parse(args.readText(abs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return { present: true, valid: false, errors: validated.errors };
  }
  const errors: string[] = [];
  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    const ctx = row.catalog_completeness_mirror_compat_removal_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_exact_catalog_completeness_mirror_compat_removal") continue;
    if (ctx?.plan_rel_path !== CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1) {
      errors.push("owner approval plan_rel_path mismatch");
      continue;
    }
    if (ctx?.approved_delete_count !== CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1) {
      errors.push("owner approval approved_delete_count mismatch");
      continue;
    }
    const binding = (row.bound_artifacts_v1 ?? []).find(
      (item) => item.artifact_rel_path === CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
    );
    if (!binding || binding.sha256_at_binding !== args.planSha256) {
      errors.push("owner approval plan sha mismatch");
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
    return { present: true, valid: true, errors: [] };
  }
  errors.push("no matching founder approval for this exact removal plan");
  return { present: true, valid: false, errors };
}

type DryRunSnapshotFileV1 = {
  plan_sha256: string;
  present_row_keys: string[];
  already_absent_row_keys: string[];
  unexpected_production_row_keys: string[];
  control_counts: Record<string, number>;
  delete_targets_outside_expected_set: number;
};

function unexpectedKey(row: CatalogCompletenessMirrorUnexpectedRowV1): string {
  return `${row.fridge_slug ?? "unresolved"}::${row.filter_slug ?? "unresolved"}::${row.fridge_model_id}::${row.filter_id}`;
}

export type RunCatalogCompletenessMirrorCompatRemovalDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  writeArtifacts?: boolean;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  readText?: (abs: string) => string;
  derivePlan?: typeof deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1;
  readSnapshot?: (
    plan: CatalogCompletenessMirrorCompatRemovalPlanV1,
  ) => Promise<
    { ok: true; snapshot: CatalogCompletenessMirrorProductionSnapshotV1 } | { ok: false; errors: string[] }
  >;
  deleteRow?: (target: CatalogCompletenessMirrorDeleteTargetV1) => Promise<CatalogCompletenessMirrorDeleteResultV1>;
};

export async function runCatalogCompletenessMirrorCompatRemovalGuardedApplyV1(
  deps: RunCatalogCompletenessMirrorCompatRemovalDepsV1,
): Promise<CatalogCompletenessMirrorGuardedApplyReportV1> {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const env = deps.env ?? process.env;
  const derive = deps.derivePlan ?? deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1;
  const blocked: string[] = [];

  const derived = derive(deps.rootDir);
  if (!derived.ok) {
    blocked.push(...derived.errors);
  }

  const plan = derived.ok ? derived.plan : null;
  const planSha = derived.ok ? derived.plan_sha256 : null;
  if (derived.ok) {
    blocked.push(
      ...loadPersistedPlan({
        rootDir: deps.rootDir,
        readText,
        canonicalText: derived.canonical_text,
        planSha256: derived.plan_sha256,
      }).errors,
    );
    if (
      deps.writeArtifacts &&
      !existsSync(path.join(deps.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1)) &&
      blocked.length === 0
    ) {
      const abs = path.join(deps.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, derived.canonical_text);
    }
  }

  const approval = findOwnerApproval({
    rootDir: deps.rootDir,
    planSha256: planSha,
    referenceTimeIso: generatedAt,
    readText,
  });

  let snapshot: CatalogCompletenessMirrorProductionSnapshotV1 | null = null;
  if (plan && blocked.length === 0) {
    const readSnapshot =
      deps.readSnapshot ??
      (async (current) => {
        const { loadEnv } = await import("./load-env");
        const { getSupabaseAdmin } = await import("./supabase-admin");
        loadEnv();
        return readCatalogCompletenessMirrorProductionSnapshotV1({
          supabase: getSupabaseAdmin() as unknown as CatalogCompletenessMirrorSupabaseV1,
          plan: current,
        });
      });
    const read = await readSnapshot(plan);
    if (!read.ok) blocked.push(...read.errors);
    else snapshot = read.snapshot;
  }

  if (snapshot) {
    blocked.push(...snapshot.ambiguous_slug_errors);
    if (snapshot.delete_targets_outside_expected_set !== 0) {
      blocked.push(
        `delete targets outside expected set: ${String(snapshot.delete_targets_outside_expected_set)}`,
      );
    }
    if (snapshot.delete_targets.length > CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1) {
      blocked.push("delete count exceeds expected set");
    }
    for (const target of snapshot.delete_targets) {
      if (!plan?.deletes.some((row) => row.row_key === target.row_key)) {
        blocked.push(`requested key outside allowlist: ${target.row_key}`);
      }
    }
  }

  const capabilityRaw = env.BUCKPARTS_IO_CAPABILITY?.trim().toUpperCase();
  const ioPreflight = buildSupabaseMutationGatePreflightV1({
    mode: "apply",
    io_capability: capabilityRaw === "MUTATION" ? "MUTATION" : "READ_INDEX",
  });
  const mutationFlag = isCatalogCompletenessMirrorRemovalMutationEnabledV1(env);

  if (
    deps.mode === "apply" &&
    !existsSync(path.join(deps.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1))
  ) {
    blocked.push("persisted plan missing; refusing apply");
  }

  if (deps.mode === "apply" && snapshot && blocked.length === 0) {
    const dryAbs = path.join(deps.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1);
    if (!existsSync(dryAbs)) {
      blocked.push("dry-run snapshot missing; refusing apply");
    } else {
      const prior = JSON.parse(readText(dryAbs)) as DryRunSnapshotFileV1;
      if (prior.plan_sha256 !== planSha) blocked.push("dry-run plan hash differs from current plan");
      if (!sameStringSet(prior.present_row_keys, snapshot.present_row_keys)) {
        blocked.push("production present keys differ from dry-run");
      }
      if (!sameStringSet(prior.already_absent_row_keys, snapshot.already_absent_row_keys)) {
        blocked.push("production already-absent keys differ from dry-run");
      }
      const unexpectedNow = snapshot.unexpected_production_rows.map(unexpectedKey).sort();
      if (!sameStringSet(prior.unexpected_production_row_keys, unexpectedNow)) {
        blocked.push("unexpected production rows differ from dry-run");
      }
      if (JSON.stringify(prior.control_counts) !== JSON.stringify(snapshot.control_counts)) {
        blocked.push("control counts differ from dry-run");
      }
      if (prior.delete_targets_outside_expected_set !== 0) {
        blocked.push("dry-run recorded delete targets outside the expected set");
      }
    }
    if (!mutationFlag) blocked.push(`${CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_MUTATION_ENV_FLAG_V1} is not 1`);
    if (!ioPreflight.mutation_authorized) blocked.push(...ioPreflight.blockers);
    if (!approval.valid) blocked.push(...approval.errors);
  }

  const applied: string[] = [];
  let dataMutation = false;
  const authorityOk =
    mutationFlag &&
    ioPreflight.mutation_authorized &&
    approval.valid &&
    snapshot != null &&
    snapshot.delete_targets_outside_expected_set === 0;

  if (deps.mode === "apply" && authorityOk && snapshot && blocked.length === 0 && snapshot.delete_targets.length > 0) {
    const allowed = new Set(snapshot.delete_targets.map((target) => target.id_key));
    const deleteRow =
      deps.deleteRow ??
      (async (target) => {
        const { loadEnv } = await import("./load-env");
        const { getSupabaseAdmin } = await import("./supabase-admin");
        loadEnv();
        return deleteCatalogCompletenessMirrorCompatRowV1({
          supabase: getSupabaseAdmin() as unknown as CatalogCompletenessMirrorSupabaseV1,
          fridge_model_id: target.fridge_model_id,
          filter_id: target.filter_id,
          allowedIdKeys: allowed,
        });
      });
    for (const target of snapshot.delete_targets) {
      if (!allowed.has(target.id_key) || applied.length >= CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1) {
        blocked.push(`refusing delete outside expected set: ${target.row_key}`);
        break;
      }
      const result = await deleteRow(target);
      if (!result.ok || result.deleted_count !== 1) {
        blocked.push(result.error ?? `delete failed for ${target.row_key}`);
        break;
      }
      applied.push(target.row_key);
      dataMutation = true;
    }
  }

  let postRemaining: number | null = null;
  let postControls: Record<string, number> | null = null;
  let controlsUnchanged: boolean | null = null;
  if (plan && snapshot && (deps.mode === "dry_run" || dataMutation || snapshot.delete_targets.length === 0)) {
    if (deps.mode === "apply" && dataMutation) {
      const readSnapshot =
        deps.readSnapshot ??
        (async (current) => {
          const { loadEnv } = await import("./load-env");
          const { getSupabaseAdmin } = await import("./supabase-admin");
          loadEnv();
          return readCatalogCompletenessMirrorProductionSnapshotV1({
            supabase: getSupabaseAdmin() as unknown as CatalogCompletenessMirrorSupabaseV1,
            plan: current,
          });
        });
      const after = await readSnapshot(plan);
      if (!after.ok) {
        blocked.push(...after.errors.map((error) => `post-write read failed: ${error}`));
      } else {
        postRemaining = after.snapshot.present_row_keys.length;
        postControls = after.snapshot.control_counts;
        controlsUnchanged =
          JSON.stringify(after.snapshot.control_counts) === JSON.stringify(snapshot.control_counts);
        if (postRemaining !== 0) blocked.push(`post-write targets remaining: ${String(postRemaining)}`);
        if (!controlsUnchanged) blocked.push("control counts changed during apply");
        if (after.snapshot.delete_targets_outside_expected_set !== 0) {
          blocked.push("post-write delete classification left the expected set");
        }
      }
    } else if (snapshot.delete_targets.length === 0) {
      postRemaining = 0;
      postControls = snapshot.control_counts;
      controlsUnchanged = true;
    }
  }

  let apply_status: CatalogCompletenessMirrorGuardedApplyReportV1["apply_status"] = "BLOCKED";
  if (deps.mode === "dry_run" && blocked.length === 0 && snapshot) apply_status = "DRY_RUN_READY";
  else if (deps.mode === "apply" && snapshot && snapshot.delete_targets.length === 0 && blocked.length === 0) {
    apply_status = "ALREADY_ABSENT";
  } else if (deps.mode === "apply" && dataMutation && postRemaining === 0 && controlsUnchanged === true && blocked.length === 0) {
    apply_status = "APPLIED";
  } else if (dataMutation) apply_status = "PARTIAL";

  const report: CatalogCompletenessMirrorGuardedApplyReportV1 = {
    contract: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: apply_status !== "APPLIED" && apply_status !== "PARTIAL",
    data_mutation: dataMutation,
    supabase_mutation_authorized: apply_status === "APPLIED",
    mutation_authorized: authorityOk && blocked.length === 0,
    mutationGateRef: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1,
    apply_status,
    blocked_reasons: apply_status === "APPLIED" || apply_status === "DRY_RUN_READY" || apply_status === "ALREADY_ABSENT" ? [] : blocked,
    plan_rel_path: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1,
    plan_sha256: planSha,
    expected_delete_count: plan?.expected_delete_count ?? 0,
    production_match_count: snapshot?.present_row_keys.length ?? 0,
    already_absent_count: snapshot?.already_absent_row_keys.length ?? 0,
    unexpected_production_rows: snapshot?.unexpected_production_rows ?? [],
    delete_targets_outside_expected_set: snapshot?.delete_targets_outside_expected_set ?? 0,
    present_row_keys: snapshot?.present_row_keys ?? [],
    already_absent_row_keys: snapshot?.already_absent_row_keys ?? [],
    applied_row_keys: applied,
    post_write_targets_remaining: postRemaining,
    control_counts: postControls ?? snapshot?.control_counts ?? {},
    control_counts_unchanged: controlsUnchanged,
    owner_approval_present: approval.present,
    owner_approval_valid: approval.valid,
    production_write_authority_status: approval.valid && mutationFlag && ioPreflight.mutation_authorized ? "authorized" : "absent",
    io_capability_preflight: ioPreflight,
    generated_at: generatedAt,
  };

  if (deps.writeArtifacts && snapshot && planSha && (deps.mode === "dry_run" || apply_status === "APPLIED" || apply_status === "ALREADY_ABSENT")) {
    const dry: DryRunSnapshotFileV1 & { contract: string; generated_at: string; apply_status: string } = {
      contract: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_APPLY_CONTRACT_V1,
      generated_at: generatedAt,
      apply_status,
      plan_sha256: planSha,
      present_row_keys: snapshot.present_row_keys,
      already_absent_row_keys: snapshot.already_absent_row_keys,
      unexpected_production_row_keys: snapshot.unexpected_production_rows.map(unexpectedKey).sort(),
      control_counts: snapshot.control_counts,
      delete_targets_outside_expected_set: snapshot.delete_targets_outside_expected_set,
    };
    const abs = path.join(deps.rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_GUARDED_DRY_RUN_JSON_REL_V1);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(dry, null, 2)}\n`);
  }

  return report;
}
