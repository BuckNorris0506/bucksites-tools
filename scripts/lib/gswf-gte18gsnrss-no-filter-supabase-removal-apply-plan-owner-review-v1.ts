/**
 * Read-only ge-gte18gsnrss no-filter Supabase removal apply-plan owner review v1.
 * Plans exact live Supabase removals of gswf + gswf2 for one slug after CSV suppression.
 * Does not mutate Supabase, CSV, retailer_links, buy CTA, pages, sitemap, robots, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  tryLoadSupabaseCompatForModelV1,
  type SupabaseCompatLoadResultV1,
} from "./buckparts-page-factory-preflight-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1,
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  classifyGte18NoFilterSupabaseParityV1,
  type Gte18NoFilterSupabaseParityClassificationV1,
} from "./gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1 =
  "gswf_gte18gsnrss_no_filter_supabase_removal_apply_plan_owner_review_v1" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review-v1.md" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-removal-apply-plan-owner-review" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_MD_REL_V1,
] as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 1,
  planned_removals: 2,
  planned_additions: 0,
} as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type Gte18SupabaseRemovalPlanSyncStateV1 =
  | "pending_removal"
  | "already_applied"
  | "blocked_invalid";

export type Gte18SupabaseRemovalPlannedChangeV1 = {
  operation: "remove";
  fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  filter_slug: "gswf" | "gswf2";
  row_key: string;
};

export type GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1 = {
  contract: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  apply_authorized: false;
  apply_plan_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  owner_approval_required: true;
  generated_at: string;
  source_command: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_SOURCE_COMMAND_V1;
  target_fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  parity_artifact_rel_path: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  plan_sync_state: Gte18SupabaseRemovalPlanSyncStateV1;
  classification: Gte18NoFilterSupabaseParityClassificationV1;
  planned_slug_count: number;
  planned_supabase_row_removals: number;
  planned_supabase_row_additions: 0;
  planned_supabase_removals: Gte18SupabaseRemovalPlannedChangeV1[];
  planned_supabase_additions: [];
  csv_intent_mappings: [];
  csv_current_mappings: string[];
  supabase_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_mappings: string[] | null;
  excluded_partial_slugs: string[];
  excluded_gswf_repaired_slugs: string[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildGte18SupabaseRemovalApplyPlanDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadSupabaseCompat?: (
    fridgeSlug: string,
  ) => Promise<SupabaseCompatLoadResultV1> | SupabaseCompatLoadResultV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function readCsvCurrentMappings(rootDir: string, fridgeSlug: string): string[] {
  const abs = path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing ${COMPATIBILITY_MAPPINGS_CSV_REL_V1}`);
  }
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug: string; filter_slug: string }>;
  return sortedUnique(
    rows
      .filter((row) => normalizeSlug(row.fridge_slug) === normalizeSlug(fridgeSlug))
      .map((row) => row.filter_slug),
  );
}

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

export async function buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1(
  deps: BuildGte18SupabaseRemovalApplyPlanDepsV1,
): Promise<GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const target = GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  const csv_current_mappings = readCsvCurrentMappings(deps.rootDir, target);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;
  const supabase = await loadSupabase(target);
  const classified = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings,
    supabase,
  });

  const expectedRemovalKeys = GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map(
    (row) => `${row.fridge_slug},${row.filter_slug}`,
  ).sort();

  let plan_sync_state: Gte18SupabaseRemovalPlanSyncStateV1 = "blocked_invalid";
  let planned_supabase_removals: Gte18SupabaseRemovalPlannedChangeV1[] = [];

  if (classified.classification === "IN_SYNC") {
    plan_sync_state = "already_applied";
    planned_supabase_removals = [];
  } else if (
    classified.classification === "SUPABASE_STILL_HAS_GSWF_FAMILY" &&
    csv_current_mappings.length === 0 &&
    JSON.stringify(classified.gswf_family_still_in_supabase) === JSON.stringify(["gswf", "gswf2"]) &&
    (classified.unexpected_in_supabase?.length ?? 0) === 0
  ) {
    plan_sync_state = "pending_removal";
    planned_supabase_removals = GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map((row) => ({
      operation: "remove" as const,
      fridge_slug: row.fridge_slug,
      filter_slug: row.filter_slug,
      row_key: `${row.fridge_slug},${row.filter_slug}`,
    })).sort((a, b) => a.row_key.localeCompare(b.row_key));
  }

  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);
  for (const removal of planned_supabase_removals) {
    if (removal.fridge_slug !== target || !family.has(removal.filter_slug)) {
      plan_sync_state = "blocked_invalid";
      planned_supabase_removals = [];
      break;
    }
  }

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    `PROVEN: target_fridge_slug=${target}; planned_slug_count=1; planned_additions=0.`,
    `PROVEN: csv_current_mappings=${csv_current_mappings.join("|") || "(none)"}; csv_intent_mappings=(none).`,
    `PROVEN: classification=${classified.classification}; plan_sync_state=${plan_sync_state}.`,
    `PROVEN: planned_supabase_removals=${planned_supabase_removals.map((r) => r.row_key).join(" | ") || "(none)"}.`,
    "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are out of scope for this plan.",
  ];
  if (classified.supabase_mappings) {
    proven_facts.push(
      `PROVEN: supabase_mappings=${classified.supabase_mappings.join("|") || "(none)"}.`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: Whether founder will create a matching supabase-removal owner-approval artifact.",
    "UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.",
  ];
  if (classified.classification === "UNKNOWN_READ_FAILED") {
    unknown_facts.unshift(
      `UNKNOWN: Supabase read failed — ${classified.read_error ?? "no reason"}.`,
    );
  }

  const risk_notes = [
    "This packet does not mutate Supabase or CSV.",
    "Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.",
    "Do not include PARTIAL or GSWF-13 repaired slugs.",
    "Future Supabase apply requires a separate founder approval artifact + guarded executor + env flag.",
  ];
  if (plan_sync_state === "pending_removal") {
    risk_notes.unshift(
      `Pending exact removals ${expectedRemovalKeys.join(" + ")} from live Supabase only.`,
    );
  }
  if (plan_sync_state === "blocked_invalid") {
    risk_notes.unshift(
      "Plan is blocked_invalid — do not apply until classification is SUPABASE_STILL_HAS_GSWF_FAMILY with exactly gswf|gswf2 or IN_SYNC.",
    );
  }

  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    apply_authorized: false,
    apply_plan_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_approval_required: true,
    generated_at,
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_SOURCE_COMMAND_V1,
    target_fridge_slug: target,
    parity_artifact_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    plan_sync_state,
    classification: classified.classification,
    planned_slug_count: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_EXPECTED_COUNTS_V1.planned_slug_count,
    planned_supabase_row_removals: planned_supabase_removals.length,
    planned_supabase_row_additions: 0,
    planned_supabase_removals,
    planned_supabase_additions: [],
    csv_intent_mappings: [],
    csv_current_mappings,
    supabase_status: classified.supabase_status,
    supabase_mappings: classified.supabase_mappings,
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanMarkdownV1(
  plan: GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1,
): string {
  return [
    "# GSWF ge-gte18gsnrss no-filter Supabase removal apply-plan owner review v1",
    "",
    `Generated: ${plan.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${plan.contract}\``,
    `- read_only: **${String(plan.read_only)}**`,
    `- data_mutation: **${String(plan.data_mutation)}**`,
    `- supabase_mutation_authorized: **${String(plan.supabase_mutation_authorized)}**`,
    `- plan_sync_state: **${plan.plan_sync_state}**`,
    `- classification: **${plan.classification}**`,
    "",
    "## Scope",
    "",
    `- target_fridge_slug: \`${plan.target_fridge_slug}\``,
    `- planned_removals: **${String(plan.planned_supabase_row_removals)}**`,
    `- planned_additions: **${String(plan.planned_supabase_row_additions)}**`,
    `- csv_current_mappings: \`${plan.csv_current_mappings.join("|") || "(none)"}\``,
    `- supabase_mappings: \`${(plan.supabase_mappings ?? []).join("|") || (plan.supabase_mappings == null ? "(unread)" : "(none)")}\``,
    "",
    "### Planned Supabase removal keys",
    "",
    ...(plan.planned_supabase_removals.length
      ? plan.planned_supabase_removals.map((row) => `- \`${row.row_key}\``)
      : ["- none"]),
    "",
    "## Risk notes",
    "",
    ...plan.risk_notes.map((note) => `- ${note}`),
    "",
  ].join("\n");
}

export function writeGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanArtifactsV1(args: {
  rootDir: string;
  plan: GswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
  );
  const mdAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_MD_REL_V1,
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildGswfGte18gsnrssNoFilterSupabaseRemovalApplyPlanMarkdownV1(args.plan)}\n`,
    "utf8",
  );
  return {
    json_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_JSON_REL_V1,
    md_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_REMOVAL_APPLY_PLAN_MD_REL_V1,
  };
}
