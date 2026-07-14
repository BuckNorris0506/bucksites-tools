/**
 * Read-only refrigerator model-first QA batch Supabase compatibility sync plan owner review v1.
 * Plans exact live Supabase removals of proven old leftover rows so mappings equal current CSV intent.
 * Does not mutate Supabase, CSV, retailer_links, buy CTA, pages, sitemap, robots, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  tryLoadSupabaseCompatForModelV1,
  type SupabaseCompatLoadResultV1,
} from "./buckparts-page-factory-preflight-v1";
import { REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1 } from "./refrigerator-model-first-batch-resolver-v1";
import {
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1,
  type RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1,
  type RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1,
} from "./refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1";

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1 =
  "refrigerator_model_first_qa_batch_supabase_compat_sync_plan_owner_review_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1.json" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review-v1.md" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-sync-plan-owner-review" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
] as const;

/** Proven old leftover rows from committed QA Supabase parity proof (exact allowlist). */
export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1 = [
  { fridge_slug: "frigidaire-ffhb2740ps", filter_slug: "frig-242086201" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "frig-242017801" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "frig-242086201" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "purepour" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "ultrawf" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "wf3cb" },
  { fridge_slug: "frigidaire-fghb2868pf", filter_slug: "wfcb" },
  { fridge_slug: "frigidaire-fgsc2335tf", filter_slug: "frig-242294502" },
  { fridge_slug: "ge-gfe28gmkes", filter_slug: "mswf" },
  { fridge_slug: "ge-gfe28gskss", filter_slug: "mswf" },
  { fridge_slug: "ge-gfe28gskss", filter_slug: "mwf" },
  { fridge_slug: "ge-gfe28gynfs", filter_slug: "xwfe" },
  { fridge_slug: "lg-lfxc22596s", filter_slug: "adq36006101" },
  { fridge_slug: "lg-lfxc22596s", filter_slug: "adq74793502" },
  { fridge_slug: "lg-lfxc22596s", filter_slug: "mdj64844601" },
  { fridge_slug: "lg-lfxs26973s", filter_slug: "adq36006101" },
  { fridge_slug: "lg-lfxs26973s", filter_slug: "adq74793502" },
  { fridge_slug: "lg-lfxs26973s", filter_slug: "lt700p" },
  { fridge_slug: "lg-lfxs26973s", filter_slug: "mdj64844601" },
  { fridge_slug: "lg-lfxs28968s", filter_slug: "adq36006101" },
  { fridge_slug: "lg-lfxs28968s", filter_slug: "adq74793502" },
  { fridge_slug: "lg-lfxs28968s", filter_slug: "lt700p" },
  { fridge_slug: "lg-lfxs28968s", filter_slug: "mdj64844601" },
  { fridge_slug: "lg-lmxs28626s", filter_slug: "adq36006101" },
  { fridge_slug: "lg-lmxs28626s", filter_slug: "adq74793502" },
  { fridge_slug: "lg-lmxs28626s", filter_slug: "mdj64844601" },
  { fridge_slug: "lg-lrfvs3006s", filter_slug: "adq36006101" },
  { fridge_slug: "lg-lrfvs3006s", filter_slug: "adq74793502" },
  { fridge_slug: "lg-lrfvs3006s", filter_slug: "lt700p" },
  { fridge_slug: "lg-lrfvs3006s", filter_slug: "mdj64844601" },
  { fridge_slug: "lg-lrfxs3106s", filter_slug: "lt600p" },
  { fridge_slug: "lg-lrfxs3106s", filter_slug: "lt800p" },
  { fridge_slug: "samsung-rf263beaesr", filter_slug: "da97-17376a" },
  { fridge_slug: "samsung-rf263beaesr", filter_slug: "da97-17376b" },
  { fridge_slug: "samsung-rf28nhedbsr", filter_slug: "da29-10105j" },
  { fridge_slug: "samsung-rf28nhedbsr", filter_slug: "da97-19467c" },
  { fridge_slug: "samsung-rf28r7201sr", filter_slug: "da29-00012b" },
  { fridge_slug: "samsung-rf28r7201sr", filter_slug: "da29-00020b" },
  { fridge_slug: "samsung-rf28r7351sg", filter_slug: "da29-00012b" },
  { fridge_slug: "samsung-rf28r7351sg", filter_slug: "da29-00020b" },
  { fridge_slug: "whirlpool-wrf540cwhz", filter_slug: "4396841" },
  { fridge_slug: "whirlpool-wrf540cwhz", filter_slug: "4396842" },
  { fridge_slug: "whirlpool-wrf540cwhz", filter_slug: "w10413645a" },
  { fridge_slug: "whirlpool-wrs325sdhz", filter_slug: "edr3rxd1" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "4396395" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "4396508" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "4396710" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "46-9002" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "8171413" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "edr1rxd1" },
  { fridge_slug: "whirlpool-wrx735sdhz", filter_slug: "edr2rxd1" },
  { fridge_slug: "whirlpool-wrx986sihz", filter_slug: "edr4rxd1" },
  { fridge_slug: "whirlpool-wrx986sihz", filter_slug: "ukf8001" },
] as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 20,
  planned_removals: 53,
  planned_additions: 0,
  planned_row_deltas: 53,
} as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanSyncStateV1 =
  | "pending_sync"
  | "already_in_sync"
  | "blocked_invalid";

export type RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
};

export type RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1;
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
  source_command: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1;
  csv_apply_commit: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1;
  manifest_rel_path: typeof REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  parity_artifact_rel_path: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  target_mappings_basis: "csv_current_mappings_per_slug";
  plan_sync_state: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanSyncStateV1;
  planned_slug_count: number;
  planned_supabase_row_removals: number;
  planned_supabase_row_additions: number;
  planned_supabase_removals: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[];
  planned_supabase_additions: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[];
  allowed_removal_row_keys: string[];
  classification_counts: Record<RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1, number>;
  rows: RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanDepsV1 = {
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

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

export function refrigeratorModelFirstQaBatchSupabaseCompatSyncAllowedRemovalKeysV1(): string[] {
  return REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.map((row) =>
    rowKey(row.fridge_slug, row.filter_slug),
  ).sort();
}

function allowedRemovalsByFridge(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1) {
    const fridge = normalizeSlug(row.fridge_slug);
    const list = map.get(fridge) ?? [];
    list.push(normalizeSlug(row.filter_slug));
    map.set(fridge, list);
  }
  for (const [slug, filters] of map) map.set(slug, sortedUnique(filters));
  return map;
}

function readCsvByFridgeSlug(rootDir: string): Map<string, string[]> {
  const abs = path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  if (!existsSync(abs)) throw new Error(`missing ${COMPATIBILITY_MAPPINGS_CSV_REL_V1}`);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const fridge = normalizeSlug(row.fridge_slug ?? "");
    const filter = normalizeSlug(row.filter_slug ?? "");
    if (!fridge || !filter) continue;
    const list = map.get(fridge) ?? [];
    list.push(filter);
    map.set(fridge, list);
  }
  for (const [slug, filters] of map) map.set(slug, sortedUnique(filters));
  return map;
}

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

function emptyClassificationCounts(): Record<
  RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1,
  number
> {
  return {
    IN_SYNC: 0,
    SUPABASE_STILL_HAS_OLD_ROWS: 0,
    SUPABASE_MISSING_TARGET: 0,
    CONFLICT: 0,
    UNKNOWN_READ_FAILED: 0,
  };
}

export async function buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1(
  deps: BuildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanDepsV1,
): Promise<RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const csvBySlug = readCsvByFridgeSlug(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;
  const removedByFridge = allowedRemovalsByFridge();
  const expectedSlugs = [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1].map(normalizeSlug);
  const allowedRemovalKeys = refrigeratorModelFirstQaBatchSupabaseCompatSyncAllowedRemovalKeysV1();

  const rows: RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1[] = [];
  for (const slug of expectedSlugs) {
    const supabase = await loadSupabase(slug);
    rows.push(
      classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1({
        fridge_slug: slug,
        csv_current_mappings: csvBySlug.get(slug) ?? [],
        supabase,
      }),
    );
  }

  const classification_counts = emptyClassificationCounts();
  for (const row of rows) classification_counts[row.classification] += 1;

  let plan_sync_state: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanSyncStateV1 =
    "blocked_invalid";
  let planned_supabase_removals: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[] =
    [];
  let planned_supabase_additions: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[] =
    [];

  const allInSync =
    classification_counts.IN_SYNC ===
      REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count &&
    classification_counts.SUPABASE_STILL_HAS_OLD_ROWS === 0 &&
    classification_counts.SUPABASE_MISSING_TARGET === 0 &&
    classification_counts.CONFLICT === 0 &&
    classification_counts.UNKNOWN_READ_FAILED === 0;

  const allPendingOldRows =
    classification_counts.SUPABASE_STILL_HAS_OLD_ROWS ===
      REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count &&
    classification_counts.IN_SYNC === 0 &&
    classification_counts.SUPABASE_MISSING_TARGET === 0 &&
    classification_counts.CONFLICT === 0 &&
    classification_counts.UNKNOWN_READ_FAILED === 0 &&
    rows.every((row) => row.csv_matches_intent);

  if (allInSync) {
    plan_sync_state = "already_in_sync";
  } else if (allPendingOldRows) {
    const removals: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[] = [];
    const additions: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlannedChangeV1[] = [];
    let exactMatch = true;

    for (const row of rows) {
      const expectedOld = sortedUnique(removedByFridge.get(row.fridge_slug) ?? []);
      const liveOld = sortedUnique(row.old_rows_still_in_supabase);
      if (JSON.stringify(liveOld) !== JSON.stringify(expectedOld)) {
        exactMatch = false;
        break;
      }
      if (row.missing_from_supabase.length !== 0) {
        exactMatch = false;
        break;
      }
      for (const filter_slug of liveOld) {
        removals.push({
          operation: "remove",
          fridge_slug: row.fridge_slug,
          filter_slug,
          row_key: rowKey(row.fridge_slug, filter_slug),
        });
      }
      for (const filter_slug of row.missing_from_supabase) {
        additions.push({
          operation: "add",
          fridge_slug: row.fridge_slug,
          filter_slug,
          row_key: rowKey(row.fridge_slug, filter_slug),
        });
      }
    }

    const removalKeys = removals.map((r) => r.row_key).sort();
    if (
      exactMatch &&
      JSON.stringify(removalKeys) === JSON.stringify(allowedRemovalKeys) &&
      removals.length ===
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals &&
      additions.length ===
        REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions
    ) {
      plan_sync_state = "pending_sync";
      planned_supabase_removals = removals.sort((a, b) => a.row_key.localeCompare(b.row_key));
      planned_supabase_additions = additions.sort((a, b) => a.row_key.localeCompare(b.row_key));
    }
  }

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false; sitemap_robots_mutation_authorized=false; product_json_ld_mutation_authorized=false.",
    `PROVEN: planned_slug_count=${String(expectedSlugs.length)}; csv_apply_commit=${REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1}; target_mappings_basis=csv_current_mappings_per_slug.`,
    `PROVEN: classification_counts=${JSON.stringify(classification_counts)}; plan_sync_state=${plan_sync_state}.`,
    `PROVEN: planned_removals=${String(planned_supabase_removals.length)}; planned_additions=${String(planned_supabase_additions.length)} (plan only — not applied).`,
    `PROVEN: allowed_removal_row_keys count=${String(allowedRemovalKeys.length)}.`,
    "PROVEN: removals limited to proven old Supabase leftovers not present in CSV; additions limited to CSV mappings missing from Supabase.",
  ];

  const unknown_facts = [
    "UNKNOWN: Whether founder will create a matching refrigerator QA batch supabase-compat-sync owner-approval artifact.",
    "UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.",
  ];
  if (classification_counts.UNKNOWN_READ_FAILED > 0) {
    unknown_facts.unshift(
      `UNKNOWN: Supabase read failed for ${String(classification_counts.UNKNOWN_READ_FAILED)} slug(s).`,
    );
  }

  const risk_notes = [
    "This packet does not mutate Supabase or CSV.",
    "Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.",
    "Future Supabase apply requires a separate founder approval artifact + guarded executor + env flag.",
    "Removals are limited to the proven QA parity old-row allowlist; additions expected empty while CSV targets already exist in Supabase.",
  ];
  if (plan_sync_state === "pending_sync") {
    risk_notes.unshift(
      `Pending exact sync: remove ${String(planned_supabase_removals.length)} old Supabase leftover rows (additions=${String(planned_supabase_additions.length)}).`,
    );
  }
  if (plan_sync_state === "blocked_invalid") {
    risk_notes.unshift(
      "Plan is blocked_invalid — do not apply until all 20 QA slugs are SUPABASE_STILL_HAS_OLD_ROWS with exact allowlisted leftovers (or already IN_SYNC).",
    );
  }

  return {
    contract: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
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
    source_command: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1,
    csv_apply_commit: REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1,
    manifest_rel_path: REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
    parity_artifact_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    target_mappings_basis: "csv_current_mappings_per_slug",
    plan_sync_state,
    planned_slug_count: expectedSlugs.length,
    planned_supabase_row_removals: planned_supabase_removals.length,
    planned_supabase_row_additions: planned_supabase_additions.length,
    planned_supabase_removals,
    planned_supabase_additions,
    allowed_removal_row_keys: allowedRemovalKeys,
    classification_counts,
    rows,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanMarkdownV1(
  plan: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Refrigerator model-first QA batch — Supabase compatibility sync plan (owner review)",
    "",
    `- contract: \`${plan.contract}\``,
    `- generated_at: \`${plan.generated_at}\``,
    `- csv_apply_commit: \`${plan.csv_apply_commit}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- supabase_mutation_authorized: **false**`,
    `- apply_authorized: **false**`,
    `- plan_sync_state: **${plan.plan_sync_state}**`,
    `- planned_slug_count: **${String(plan.planned_slug_count)}**`,
    `- target_mappings_basis: \`${plan.target_mappings_basis}\``,
    "",
    "## Classification counts",
    "",
  ];
  for (const [key, value] of Object.entries(plan.classification_counts)) {
    lines.push(`- **${key}**: ${String(value)}`);
  }
  lines.push(
    "",
    "## Planned Supabase changes (NOT applied)",
    "",
    `- removals: **${String(plan.planned_supabase_row_removals)}**`,
    `- additions: **${String(plan.planned_supabase_row_additions)}**`,
    "",
    "### Removals",
    "",
  );
  for (const row of plan.planned_supabase_removals) lines.push(`- \`${row.row_key}\``);
  if (plan.planned_supabase_removals.length === 0) lines.push("- none");
  lines.push("", "### Additions", "");
  for (const row of plan.planned_supabase_additions) lines.push(`- \`${row.row_key}\``);
  if (plan.planned_supabase_additions.length === 0) lines.push("- none");
  lines.push("", "## Per-slug rows", "");
  for (const row of plan.rows) {
    lines.push(`### ${row.fridge_slug}`, "");
    lines.push(`- classification: **${row.classification}**`);
    lines.push(`- csv_current: \`${row.csv_current_mappings.join("|") || "(none)"}\``);
    lines.push(
      `- supabase: \`${row.supabase_mappings ? row.supabase_mappings.join("|") || "(none)" : "READ_FAILED"}\``,
    );
    lines.push(
      `- old_rows_still_in_supabase: \`${row.old_rows_still_in_supabase.join("|") || "(none)"}\``,
    );
    lines.push(`- missing_from_supabase: \`${row.missing_from_supabase.join("|") || "(none)"}\``);
    lines.push("");
  }
  lines.push("## Proven facts", "");
  for (const fact of plan.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of plan.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of plan.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewArtifactsV1(args: {
  rootDir: string;
  plan: RefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(
    args.rootDir,
    REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  );
  const mdAbs = path.join(
    args.rootDir,
    REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildRefrigeratorModelFirstQaBatchSupabaseCompatSyncPlanMarkdownV1(args.plan),
    "utf8",
  );
  return {
    json_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
    md_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  };
}
