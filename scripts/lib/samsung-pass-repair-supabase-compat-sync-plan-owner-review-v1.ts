/**
 * Read-only Samsung PASS 5 Supabase compatibility sync apply-plan owner review v1.
 * Plans exact live Supabase removals of proven old da29-* rows + additions of da97-17376b.
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
  SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
} from "./samsung-pass-repair-apply-plan-v1";
import {
  SAMSUNG_PASS_CSV_APPLY_COMMIT_V1,
  SAMSUNG_PASS_CSV_INTENT_MAPPINGS_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  classifySamsungPassSupabaseParitySlugV1,
  type SamsungPassSupabaseParityClassificationV1,
  type SamsungPassSupabaseParitySlugRowV1,
} from "./samsung-pass-repair-supabase-compat-parity-owner-review-v1";

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1 =
  "samsung_pass_repair_supabase_compat_sync_plan_owner_review_v1" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-sync-plan-owner-review-v1.md" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-supabase-compat-sync-plan-owner-review" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
] as const;

/** Proven old da29-* rows from committed Samsung PASS Supabase parity proof (exact allowlist). */
export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1 = [
  { fridge_slug: "samsung-rf27t5201sr", filter_slug: "da29-10105j" },
  { fridge_slug: "samsung-rf27t5501sr", filter_slug: "da29-00012b" },
  { fridge_slug: "samsung-rf27t5501sr", filter_slug: "da29-00020b" },
  { fridge_slug: "samsung-rf28r6301sr", filter_slug: "da29-00019a" },
  { fridge_slug: "samsung-rf28t5101sr", filter_slug: "da29-00019a" },
  { fridge_slug: "samsung-rs22t5201sg", filter_slug: "da29-10105j" },
] as const;

export const SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 5,
  planned_removals: 6,
  planned_additions: 5,
  planned_row_deltas: 11,
} as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type SamsungPassSupabaseCompatSyncPlanSyncStateV1 =
  | "pending_sync"
  | "already_in_sync"
  | "blocked_invalid";

export type SamsungPassSupabaseCompatSyncPlannedChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
};

export type SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1;
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
  source_command: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1;
  csv_apply_commit: typeof SAMSUNG_PASS_CSV_APPLY_COMMIT_V1;
  csv_apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  parity_artifact_rel_path: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  target_filter_slug: typeof SAMSUNG_PASS_TARGET_FILTER_SLUG_V1;
  plan_sync_state: SamsungPassSupabaseCompatSyncPlanSyncStateV1;
  planned_slug_count: number;
  planned_supabase_row_removals: number;
  planned_supabase_row_additions: number;
  planned_supabase_removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[];
  planned_supabase_additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[];
  allowed_removal_row_keys: string[];
  classification_counts: Record<SamsungPassSupabaseParityClassificationV1, number>;
  rows: SamsungPassSupabaseParitySlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildSamsungPassSupabaseCompatSyncPlanDepsV1 = {
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

export function samsungPassSupabaseCompatSyncAllowedRemovalKeysV1(): string[] {
  return SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1.map((row) =>
    rowKey(row.fridge_slug, row.filter_slug),
  ).sort();
}

function allowedRemovalsByFridge(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_ALLOWED_REMOVALS_V1) {
    const fridge = normalizeSlug(row.fridge_slug);
    const list = map.get(fridge) ?? [];
    list.push(normalizeSlug(row.filter_slug));
    map.set(fridge, list);
  }
  for (const [slug, filters] of map) {
    map.set(slug, sortedUnique(filters));
  }
  return map;
}

function readCsvByFridgeSlug(rootDir: string): Map<string, string[]> {
  const abs = path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing ${COMPATIBILITY_MAPPINGS_CSV_REL_V1}`);
  }
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
  for (const [slug, filters] of map) {
    map.set(slug, sortedUnique(filters));
  }
  return map;
}

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

function emptyClassificationCounts(): Record<SamsungPassSupabaseParityClassificationV1, number> {
  return {
    IN_SYNC: 0,
    SUPABASE_STILL_HAS_OLD_ROWS: 0,
    SUPABASE_MISSING_TARGET: 0,
    CONFLICT: 0,
    UNKNOWN_READ_FAILED: 0,
  };
}

export async function buildSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1(
  deps: BuildSamsungPassSupabaseCompatSyncPlanDepsV1,
): Promise<SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const csvBySlug = readCsvByFridgeSlug(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;
  const removedByFridge = allowedRemovalsByFridge();
  const expectedSlugs = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  const allowedRemovalKeys = samsungPassSupabaseCompatSyncAllowedRemovalKeysV1();

  const rows: SamsungPassSupabaseParitySlugRowV1[] = [];
  for (const slug of expectedSlugs) {
    const supabase = await loadSupabase(slug);
    rows.push(
      classifySamsungPassSupabaseParitySlugV1({
        fridge_slug: slug,
        csv_current_mappings: csvBySlug.get(slug) ?? [],
        removed_filter_slugs: removedByFridge.get(slug) ?? [],
        supabase,
      }),
    );
  }

  const classification_counts = emptyClassificationCounts();
  for (const row of rows) {
    classification_counts[row.classification] += 1;
  }

  let plan_sync_state: SamsungPassSupabaseCompatSyncPlanSyncStateV1 = "blocked_invalid";
  let planned_supabase_removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
  let planned_supabase_additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];

  const allInSync =
    classification_counts.IN_SYNC === SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count &&
    classification_counts.SUPABASE_STILL_HAS_OLD_ROWS === 0 &&
    classification_counts.SUPABASE_MISSING_TARGET === 0 &&
    classification_counts.CONFLICT === 0 &&
    classification_counts.UNKNOWN_READ_FAILED === 0;

  const allPendingOldRows =
    classification_counts.SUPABASE_STILL_HAS_OLD_ROWS ===
      SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count &&
    classification_counts.IN_SYNC === 0 &&
    classification_counts.SUPABASE_MISSING_TARGET === 0 &&
    classification_counts.CONFLICT === 0 &&
    classification_counts.UNKNOWN_READ_FAILED === 0 &&
    rows.every((row) => row.csv_matches_intent);

  if (allInSync) {
    plan_sync_state = "already_in_sync";
  } else if (allPendingOldRows) {
    const removals: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
    const additions: SamsungPassSupabaseCompatSyncPlannedChangeV1[] = [];
    let exactMatch = true;

    for (const row of rows) {
      const expectedOld = sortedUnique(removedByFridge.get(row.fridge_slug) ?? []);
      const liveOld = sortedUnique(row.old_rows_still_in_supabase);
      if (JSON.stringify(liveOld) !== JSON.stringify(expectedOld)) {
        exactMatch = false;
        break;
      }
      if (
        !row.missing_from_supabase.includes(SAMSUNG_PASS_TARGET_FILTER_SLUG_V1) ||
        row.missing_from_supabase.length !== 1
      ) {
        exactMatch = false;
        break;
      }
      if ((row.unexpected_in_supabase ?? []).length > 0) {
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
      additions.push({
        operation: "add",
        fridge_slug: row.fridge_slug,
        filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
        row_key: rowKey(row.fridge_slug, SAMSUNG_PASS_TARGET_FILTER_SLUG_V1),
      });
    }

    const removalKeys = removals.map((r) => r.row_key).sort();
    if (
      exactMatch &&
      JSON.stringify(removalKeys) === JSON.stringify(allowedRemovalKeys) &&
      additions.length === SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions &&
      removals.length === SAMSUNG_PASS_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals
    ) {
      plan_sync_state = "pending_sync";
      planned_supabase_removals = removals.sort((a, b) => a.row_key.localeCompare(b.row_key));
      planned_supabase_additions = additions.sort((a, b) => a.row_key.localeCompare(b.row_key));
    }
  }

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    `PROVEN: planned_slug_count=${String(expectedSlugs.length)}; target_filter_slug=${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}; csv_apply_commit=${SAMSUNG_PASS_CSV_APPLY_COMMIT_V1}.`,
    `PROVEN: csv_intent_mappings=${SAMSUNG_PASS_CSV_INTENT_MAPPINGS_V1.join("|")}.`,
    `PROVEN: classification_counts=${JSON.stringify(classification_counts)}; plan_sync_state=${plan_sync_state}.`,
    `PROVEN: planned_removals=${String(planned_supabase_removals.length)}; planned_additions=${String(planned_supabase_additions.length)} (plan only — not applied).`,
    `PROVEN: allowed_removal_row_keys=${allowedRemovalKeys.join(" | ")}.`,
    "PROVEN: non-PASS / GTE18 / GSWF slugs are out of scope for this plan.",
  ];

  const unknown_facts = [
    "UNKNOWN: Whether founder will create a matching samsung-pass supabase-compat-sync owner-approval artifact.",
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
    "Removals are limited to the proven old da29-* allowlist; additions are da97-17376b only.",
  ];
  if (plan_sync_state === "pending_sync") {
    risk_notes.unshift(
      `Pending exact sync: remove ${String(planned_supabase_removals.length)} old da29-* rows and add ${String(planned_supabase_additions.length)} da97-17376b rows.`,
    );
  }
  if (plan_sync_state === "blocked_invalid") {
    risk_notes.unshift(
      "Plan is blocked_invalid — do not apply until all 5 slugs are SUPABASE_STILL_HAS_OLD_ROWS with exact allowlisted da29-* rows (or already IN_SYNC).",
    );
  }

  return {
    contract: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
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
    source_command: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1,
    csv_apply_commit: SAMSUNG_PASS_CSV_APPLY_COMMIT_V1,
    csv_apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    parity_artifact_rel_path: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    target_filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
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

export function buildSamsungPassRepairSupabaseCompatSyncPlanMarkdownV1(
  plan: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Samsung PASS repair — Supabase compatibility sync plan (owner review)",
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
    `- target_filter_slug: \`${plan.target_filter_slug}\``,
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
  for (const row of plan.planned_supabase_removals) {
    lines.push(`- \`${row.row_key}\``);
  }
  if (plan.planned_supabase_removals.length === 0) lines.push("- none");
  lines.push("", "### Additions", "");
  for (const row of plan.planned_supabase_additions) {
    lines.push(`- \`${row.row_key}\``);
  }
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

export function writeSamsungPassRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1(args: {
  rootDir: string;
  plan: SamsungPassRepairSupabaseCompatSyncPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungPassRepairSupabaseCompatSyncPlanMarkdownV1(args.plan), "utf8");
  return {
    json_rel_path: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
    md_rel_path: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  };
}
