/**
 * Promote staged refrigerator — run orchestration with truth-ledger outcome recording.
 */

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildPromoteStagedRefrigeratorMutationPreflightV1,
  PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1,
  PROMOTE_STAGED_REFRIGERATOR_MUTATION_LANE_V1,
  promoteStagedRefrigeratorMutationAuthorizedV1,
  type PromoteStagedRefrigeratorMutationPreflightV1,
} from "./promote-staged-refrigerator-mutation-gate-v1";
import type { FounderDecisionRowWithSlugCorrelationV1 } from "./founder-decision-slug-correlation-v1";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";

type StagedStatus = "ready" | "promoted";

export type PromoteStagedRefrigeratorPhaseResultV1 = {
  seen: number;
  promoted: number;
};

export type PromoteStagedRefrigeratorResultsV1 = {
  models: PromoteStagedRefrigeratorPhaseResultV1;
  filters: PromoteStagedRefrigeratorPhaseResultV1;
  compatibility_mappings: PromoteStagedRefrigeratorPhaseResultV1;
  aliases: PromoteStagedRefrigeratorPhaseResultV1;
};

export type PromoteStagedRefrigeratorApplyStatusV1 = "BLOCKED" | "APPLIED";

export type PromoteStagedRefrigeratorReportV1 = {
  generated_at: string;
  dry_run: boolean;
  scope: typeof HOMEKEEP_WEDGE_CATALOG.refrigerator_water;
  staged_status_required: "ready";
  results: PromoteStagedRefrigeratorResultsV1;
  apply_status?: PromoteStagedRefrigeratorApplyStatusV1;
  mutation_authorized?: boolean;
  mutation_preflight_blockers?: string[];
  founder_decision_id?: string | null;
};

export type PromoteStagedRefrigeratorRunResultV1 = {
  report: PromoteStagedRefrigeratorReportV1;
  exit_code: 0 | 1;
};

export type PromoteStagedRefrigeratorDepsV1 = {
  getSupabaseAdmin: () => SupabaseClient;
  log?: (message: string) => void;
};

/** Inventory/static-audit marker — run module satisfies mutationGateRef checks. */
const mutationGateRef = PROMOTE_STAGED_REFRIGERATOR_MUTATION_GATE_REF_V1;
void mutationGateRef;

const EMPTY_RESULTS_V1: PromoteStagedRefrigeratorResultsV1 = {
  models: { seen: 0, promoted: 0 },
  filters: { seen: 0, promoted: 0 },
  compatibility_mappings: { seen: 0, promoted: 0 },
  aliases: { seen: 0, promoted: 0 },
};

/** Write-intent ledger append uses MUTATION (parity with AP/RPWFE apply CLI). */
const TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1 = "MUTATION" as const;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : `${w[0]!.toUpperCase()}${w.slice(1)}`))
    .join(" ");
}

async function uniqueSlug(
  deps: PromoteStagedRefrigeratorDepsV1,
  table: "fridge_models" | "filters",
  base: string,
): Promise<string> {
  const supabase = deps.getSupabaseAdmin();
  const root = base || "item";
  for (let i = 0; i < 1000; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data, error } = await supabase
      .from(table)
      .select("slug")
      .eq("slug", candidate)
      .limit(1);
    if (error) throw error;
    if ((data ?? []).length === 0) return candidate;
  }
  throw new Error(`unable to allocate unique slug for ${table}:${base}`);
}

async function markStagedPromoted(
  deps: PromoteStagedRefrigeratorDepsV1,
  table: string,
  id: number,
): Promise<void> {
  const supabase = deps.getSupabaseAdmin();
  const { error } = await supabase
    .from(table)
    .update({ status: "promoted" satisfies StagedStatus })
    .eq("id", id)
    .eq("status", "ready");
  if (error) throw error;
}

async function resolveBrandInfo(
  deps: PromoteStagedRefrigeratorDepsV1,
  proposedBrandId: string | null,
  proposedBrandSlug: string | null,
): Promise<{ id: string; slug: string | null; name: string | null } | null> {
  const supabase = deps.getSupabaseAdmin();
  if (proposedBrandId) {
    const { data, error } = await supabase
      .from("brands")
      .select("id, slug, name")
      .eq("id", proposedBrandId)
      .limit(1);
    if (error) throw error;
    const b = (data ?? [])[0] as { id: string; slug: string; name: string } | undefined;
    return b ? { id: b.id, slug: b.slug, name: b.name } : null;
  }
  if (!proposedBrandSlug) return null;
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug, name")
    .eq("slug", proposedBrandSlug)
    .limit(1);
  if (error) throw error;
  const b = (data ?? [])[0] as { id: string; slug: string; name: string } | undefined;
  return b ? { id: b.id, slug: b.slug, name: b.name } : null;
}

async function promoteModels(
  deps: PromoteStagedRefrigeratorDepsV1,
  limit: number,
  write: boolean,
): Promise<PromoteStagedRefrigeratorPhaseResultV1> {
  const supabase = deps.getSupabaseAdmin();
  const log = deps.log ?? console.log;
  const { data, error } = await supabase
    .from("staged_model_additions")
    .select("id, catalog, proposed_model_number, proposed_brand_id, proposed_brand_slug, payload_json")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      proposed_model_number: string;
      proposed_brand_id: string | null;
      proposed_brand_slug: string | null;
      payload_json: Record<string, unknown> | null;
    };
    const brand = await resolveBrandInfo(deps, r.proposed_brand_id, r.proposed_brand_slug);
    if (!brand) {
      log(`[promote] skip staged_model_additions id=${r.id} reason=missing_brand`);
      continue;
    }
    const modelNumber = r.proposed_model_number.trim();
    const payloadTitle =
      typeof r.payload_json?.title === "string" && r.payload_json.title.trim().length > 0
        ? r.payload_json.title.trim()
        : null;
    const brandDisplay =
      brand.name?.trim() ||
      (brand.slug ? humanizeSlug(brand.slug) : r.proposed_brand_slug ? humanizeSlug(r.proposed_brand_slug) : null) ||
      "Unknown Brand";
    const title = payloadTitle ?? `${brandDisplay} ${modelNumber} Refrigerator`;
    const { data: existing, error: exErr } = await supabase
      .from("fridge_models")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("model_number", modelNumber)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const slug = await uniqueSlug(deps, "fridge_models", slugify(modelNumber));
      const { error: insErr } = await supabase.from("fridge_models").insert({
        brand_id: brand.id,
        model_number: modelNumber,
        slug,
        title,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted(deps, "staged_model_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteFilters(
  deps: PromoteStagedRefrigeratorDepsV1,
  limit: number,
  write: boolean,
): Promise<PromoteStagedRefrigeratorPhaseResultV1> {
  const supabase = deps.getSupabaseAdmin();
  const log = deps.log ?? console.log;
  const { data, error } = await supabase
    .from("staged_filter_part_additions")
    .select("id, catalog, proposed_oem_part_number, proposed_brand_id, proposed_brand_slug, payload_json")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      proposed_oem_part_number: string | null;
      proposed_brand_id: string | null;
      proposed_brand_slug: string | null;
      payload_json: Record<string, unknown> | null;
    };
    if (!r.proposed_oem_part_number) {
      log(`[promote] skip staged_filter_part_additions id=${r.id} reason=missing_part_number`);
      continue;
    }
    const brand = await resolveBrandInfo(deps, r.proposed_brand_id, r.proposed_brand_slug);
    if (!brand) {
      log(`[promote] skip staged_filter_part_additions id=${r.id} reason=missing_brand`);
      continue;
    }
    const partNumber = r.proposed_oem_part_number.trim();
    const payloadName =
      typeof r.payload_json?.name === "string" && r.payload_json.name.trim().length > 0
        ? r.payload_json.name.trim()
        : null;
    const brandDisplay =
      brand.name?.trim() ||
      (brand.slug ? humanizeSlug(brand.slug) : r.proposed_brand_slug ? humanizeSlug(r.proposed_brand_slug) : null) ||
      "Unknown Brand";
    const name = payloadName ?? `${brandDisplay} ${partNumber}`;
    const { data: existing, error: exErr } = await supabase
      .from("filters")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("oem_part_number", partNumber)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const slug = await uniqueSlug(deps, "filters", slugify(partNumber));
      const { error: insErr } = await supabase.from("filters").insert({
        brand_id: brand.id,
        oem_part_number: partNumber,
        name,
        slug,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted(deps, "staged_filter_part_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteCompat(
  deps: PromoteStagedRefrigeratorDepsV1,
  limit: number,
  write: boolean,
): Promise<PromoteStagedRefrigeratorPhaseResultV1> {
  const supabase = deps.getSupabaseAdmin();
  const log = deps.log ?? console.log;
  const { data, error } = await supabase
    .from("staged_compatibility_mapping_additions")
    .select("id, catalog, compat_table, model_id, part_id")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      compat_table: string;
      model_id: string;
      part_id: string;
    };
    if (r.compat_table !== "compatibility_mappings") {
      log(`[promote] skip staged_compatibility_mapping_additions id=${r.id} reason=unsupported_table`);
      continue;
    }
    const { data: existing, error: exErr } = await supabase
      .from("compatibility_mappings")
      .select("fridge_model_id")
      .eq("fridge_model_id", r.model_id)
      .eq("filter_id", r.part_id)
      .limit(1);
    if (exErr) throw exErr;

    if (write && (existing ?? []).length === 0) {
      const { error: insErr } = await supabase.from("compatibility_mappings").insert({
        fridge_model_id: r.model_id,
        filter_id: r.part_id,
      });
      if (insErr) throw insErr;
    }
    if (write) await markStagedPromoted(deps, "staged_compatibility_mapping_additions", r.id);
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function promoteAliases(
  deps: PromoteStagedRefrigeratorDepsV1,
  limit: number,
  write: boolean,
): Promise<PromoteStagedRefrigeratorPhaseResultV1> {
  const supabase = deps.getSupabaseAdmin();
  const log = deps.log ?? console.log;
  const { data, error } = await supabase
    .from("staged_alias_additions")
    .select("id, catalog, target_kind, target_record_id, proposed_alias")
    .eq("status", "ready")
    .eq("catalog", HOMEKEEP_WEDGE_CATALOG.refrigerator_water)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let promoted = 0;
  for (const row of data ?? []) {
    const r = row as {
      id: number;
      target_kind: "model" | "filter_part";
      target_record_id: string | null;
      proposed_alias: string;
    };
    if (!r.target_record_id) {
      log(`[promote] skip staged_alias_additions id=${r.id} reason=missing_target_record_id`);
      continue;
    }
    const alias = r.proposed_alias.trim();
    if (!alias) {
      log(`[promote] skip staged_alias_additions id=${r.id} reason=empty_alias`);
      continue;
    }
    if (write) {
      if (r.target_kind === "model") {
        const { error: insErr } = await supabase.from("fridge_model_aliases").upsert(
          { fridge_model_id: r.target_record_id, alias },
          { onConflict: "fridge_model_id,alias", ignoreDuplicates: true },
        );
        if (insErr) throw insErr;
      } else {
        const { error: insErr } = await supabase.from("filter_aliases").upsert(
          { filter_id: r.target_record_id, alias },
          { onConflict: "filter_id,alias", ignoreDuplicates: true },
        );
        if (insErr) throw insErr;
      }
      await markStagedPromoted(deps, "staged_alias_additions", r.id);
    }
    promoted += 1;
  }
  return { seen: (data ?? []).length, promoted };
}

async function executePromotionPhasesV1(
  deps: PromoteStagedRefrigeratorDepsV1,
  limit: number,
  write: boolean,
): Promise<PromoteStagedRefrigeratorResultsV1> {
  const models = await promoteModels(deps, limit, write);
  const filters = await promoteFilters(deps, limit, write);
  const compat = await promoteCompat(deps, limit, write);
  const aliases = await promoteAliases(deps, limit, write);
  return {
    models,
    filters,
    compatibility_mappings: compat,
    aliases,
  };
}

export function parsePromoteStagedRefrigeratorCliArgsV1(argv: readonly string[]): {
  write: boolean;
  limit: number;
} {
  const write = argv.includes("--write");
  const idx = argv.indexOf("--limit");
  let limit = 200;
  if (idx !== -1) {
    const raw = argv[idx + 1];
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(n) && n > 0) limit = n;
  }
  return { write, limit };
}

export function createPromoteStagedRefrigeratorLiveDepsV1(
  getSupabaseAdmin: () => SupabaseClient,
): PromoteStagedRefrigeratorDepsV1 {
  return { getSupabaseAdmin };
}

export async function runPromoteStagedRefrigeratorV1(args: {
  rootDir: string;
  write: boolean;
  limit: number;
  deps: PromoteStagedRefrigeratorDepsV1;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  readText?: (abs: string) => string;
  founderRows?: readonly FounderDecisionRowWithSlugCorrelationV1[];
  recordTruthLedger?: typeof recordTruthLedgerMutationOutcomeV1;
}): Promise<PromoteStagedRefrigeratorRunResultV1> {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const recordTruthLedger = args.recordTruthLedger ?? recordTruthLedgerMutationOutcomeV1;

  if (!args.write) {
    const results = await executePromotionPhasesV1(args.deps, args.limit, false);
    return {
      report: {
        generated_at: generatedAt,
        dry_run: true,
        scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
        staged_status_required: "ready",
        results,
      },
      exit_code: 0,
    };
  }

  const preflight: PromoteStagedRefrigeratorMutationPreflightV1 =
    buildPromoteStagedRefrigeratorMutationPreflightV1({
      rootDir: args.rootDir,
      mode: "write",
      io_capability: args.io_capability,
      now: args.now,
      readText: args.readText,
      founderRows: args.founderRows,
    });
  const mutation_authorized = promoteStagedRefrigeratorMutationAuthorizedV1(preflight);
  const blockers = [...preflight.blockers];

  let results = EMPTY_RESULTS_V1;
  if (mutation_authorized) {
    results = await executePromotionPhasesV1(args.deps, args.limit, true);
  }

  let apply_status: PromoteStagedRefrigeratorApplyStatusV1 =
    blockers.length > 0 ? "BLOCKED" : "APPLIED";

  const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
    apply_status === "BLOCKED" ? "blocked" : "applied";
  const record = recordTruthLedger({
    rootDir: args.rootDir,
    io_capability: TRUTH_LEDGER_IO_ON_WRITE_INTENT_V1,
    mutation_lane: PROMOTE_STAGED_REFRIGERATOR_MUTATION_LANE_V1,
    founder_decision_id: preflight.founder_decision_id,
    apply_outcome: applyOutcome,
    blockers,
    now: args.now,
  });
  if (!record.ok) {
    blockers.push(...record.blockers);
    apply_status = "BLOCKED";
  }

  return {
    report: {
      generated_at: generatedAt,
      dry_run: false,
      scope: HOMEKEEP_WEDGE_CATALOG.refrigerator_water,
      staged_status_required: "ready",
      results,
      apply_status,
      mutation_authorized: mutation_authorized && apply_status === "APPLIED",
      mutation_preflight_blockers: blockers,
      founder_decision_id: preflight.founder_decision_id,
    },
    exit_code: apply_status === "BLOCKED" ? 1 : 0,
  };
}
