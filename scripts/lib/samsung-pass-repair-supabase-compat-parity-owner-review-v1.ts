/**
 * Read-only Samsung PASS 5 Supabase compatibility parity owner review v1.
 * Compares post-CSV-repair intent (da97-17376b only) vs live Supabase for 5 slugs.
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
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1,
  SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
  SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
  type SamsungPassRepairPlannedRowV1,
} from "./samsung-pass-repair-apply-plan-v1";

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_CONTRACT_V1 =
  "samsung_pass_repair_supabase_compat_parity_owner_review_v1" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-parity-owner-review-v1.json" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-pass-repair-supabase-compat-parity-owner-review-v1.md" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:samsung-pass-repair-supabase-compat-parity-owner-review" as const;

export const SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 = [
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1,
] as const;

export const SAMSUNG_PASS_CSV_INTENT_MAPPINGS_V1 = [SAMSUNG_PASS_TARGET_FILTER_SLUG_V1] as const;

export const SAMSUNG_PASS_CSV_APPLY_COMMIT_V1 = "89bed80" as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type SamsungPassSupabaseParityClassificationV1 =
  | "IN_SYNC"
  | "SUPABASE_STILL_HAS_OLD_ROWS"
  | "SUPABASE_MISSING_TARGET"
  | "CONFLICT"
  | "UNKNOWN_READ_FAILED";

export type SamsungPassSupabaseParitySlugRowV1 = {
  fridge_slug: string;
  classification: SamsungPassSupabaseParityClassificationV1;
  csv_intent_mappings: string[];
  csv_current_mappings: string[];
  csv_matches_intent: boolean;
  csv_old_rows_still_present: string[];
  removed_filter_slugs_expected_absent: string[];
  supabase_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_mappings: string[] | null;
  old_rows_still_in_supabase: string[];
  missing_from_supabase: string[];
  unexpected_in_supabase: string[];
  read_error: string | null;
  supabase_mutation_authorized: false;
};

export type SamsungPassRepairSupabaseCompatParityOwnerReviewV1 = {
  contract: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  sitemap_robots_mutation_authorized: false;
  product_json_ld_mutation_authorized: false;
  owner_approval_required_for_future_supabase_apply: true;
  apply_authorized: false;
  generated_at: string;
  source_command: typeof SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1;
  apply_plan_rel_path: typeof SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1;
  csv_apply_commit: typeof SAMSUNG_PASS_CSV_APPLY_COMMIT_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  target_filter_slug: typeof SAMSUNG_PASS_TARGET_FILTER_SLUG_V1;
  planned_slug_count: number;
  classification_counts: Record<SamsungPassSupabaseParityClassificationV1, number>;
  rows: SamsungPassSupabaseParitySlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildSamsungPassSupabaseCompatParityDepsV1 = {
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

function setsEqual(a: string[], b: string[]): boolean {
  return JSON.stringify(sortedUnique(a)) === JSON.stringify(sortedUnique(b));
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
  }) as Array<{ fridge_slug: string; filter_slug: string }>;
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const fridge = normalizeSlug(row.fridge_slug);
    const filter = normalizeSlug(row.filter_slug);
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

function loadApplyPlanRows(rootDir: string): Map<string, SamsungPassRepairPlannedRowV1> {
  const abs = path.join(rootDir, SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing apply plan ${SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1}`);
  }
  const plan = JSON.parse(readFileSync(abs, "utf8")) as {
    contract?: string;
    planned_rows?: SamsungPassRepairPlannedRowV1[];
  };
  if (plan.contract !== SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1) {
    throw new Error(
      `apply plan contract mismatch: expected ${SAMSUNG_PASS_REPAIR_APPLY_PLAN_CONTRACT_V1}, got ${String(plan.contract)}`,
    );
  }
  const map = new Map<string, SamsungPassRepairPlannedRowV1>();
  for (const row of plan.planned_rows ?? []) {
    map.set(normalizeSlug(row.fridge_slug), row);
  }
  return map;
}

export function classifySamsungPassSupabaseParitySlugV1(args: {
  fridge_slug: string;
  csv_current_mappings: string[];
  removed_filter_slugs: string[];
  supabase: SupabaseCompatLoadResultV1;
}): SamsungPassSupabaseParitySlugRowV1 {
  const fridge_slug = normalizeSlug(args.fridge_slug);
  const csv_intent_mappings = [...SAMSUNG_PASS_CSV_INTENT_MAPPINGS_V1];
  const csv_current_mappings = sortedUnique(args.csv_current_mappings);
  const removed_filter_slugs_expected_absent = sortedUnique(args.removed_filter_slugs);
  const oldSet = new Set(removed_filter_slugs_expected_absent);
  const csv_old_rows_still_present = csv_current_mappings.filter((f) => oldSet.has(f));
  const csv_matches_intent = setsEqual(csv_current_mappings, csv_intent_mappings);

  if (args.supabase.status === "UNKNOWN_DB_UNAVAILABLE") {
    return {
      fridge_slug,
      classification: "UNKNOWN_READ_FAILED",
      csv_intent_mappings,
      csv_current_mappings,
      csv_matches_intent,
      csv_old_rows_still_present,
      removed_filter_slugs_expected_absent,
      supabase_status: "UNKNOWN_DB_UNAVAILABLE",
      supabase_mappings: null,
      old_rows_still_in_supabase: [],
      missing_from_supabase: [],
      unexpected_in_supabase: [],
      read_error: args.supabase.reason,
      supabase_mutation_authorized: false,
    };
  }

  const supabase_mappings = sortedUnique(args.supabase.supabase_filter_slugs);
  const old_rows_still_in_supabase = supabase_mappings.filter((f) => oldSet.has(f));
  const missing_from_supabase = csv_intent_mappings.filter((f) => !supabase_mappings.includes(f));
  const unexpected_in_supabase = supabase_mappings.filter(
    (f) => !csv_intent_mappings.includes(f) && !oldSet.has(f),
  );

  let classification: SamsungPassSupabaseParityClassificationV1;
  if (old_rows_still_in_supabase.length > 0) {
    classification = "SUPABASE_STILL_HAS_OLD_ROWS";
  } else if (missing_from_supabase.length > 0) {
    classification = "SUPABASE_MISSING_TARGET";
  } else if (unexpected_in_supabase.length > 0) {
    classification = "CONFLICT";
  } else if (setsEqual(supabase_mappings, csv_intent_mappings)) {
    classification = "IN_SYNC";
  } else {
    classification = "CONFLICT";
  }

  return {
    fridge_slug,
    classification,
    csv_intent_mappings,
    csv_current_mappings,
    csv_matches_intent,
    csv_old_rows_still_present,
    removed_filter_slugs_expected_absent,
    supabase_status: "CHECKED",
    supabase_mappings,
    old_rows_still_in_supabase,
    missing_from_supabase,
    unexpected_in_supabase,
    read_error: null,
    supabase_mutation_authorized: false,
  };
}

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

export async function buildSamsungPassRepairSupabaseCompatParityOwnerReviewV1(
  deps: BuildSamsungPassSupabaseCompatParityDepsV1,
): Promise<SamsungPassRepairSupabaseCompatParityOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const csvBySlug = readCsvByFridgeSlug(deps.rootDir);
  const planBySlug = loadApplyPlanRows(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;

  const expectedSlugs = [...SAMSUNG_PASS_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  const planSlugs = Array.from(planBySlug.keys()).sort();
  if (JSON.stringify(expectedSlugs) !== JSON.stringify(planSlugs)) {
    throw new Error(
      `apply plan slug set mismatch — expected ${expectedSlugs.join(",")}, got ${planSlugs.join(",")}`,
    );
  }

  const rows: SamsungPassSupabaseParitySlugRowV1[] = [];
  for (const slug of expectedSlugs) {
    const planned = planBySlug.get(slug)!;
    const removed = sortedUnique(planned.removed_filter_slugs ?? planned.before_mappings ?? []);
    const supabase = await loadSupabase(slug);
    rows.push(
      classifySamsungPassSupabaseParitySlugV1({
        fridge_slug: slug,
        csv_current_mappings: csvBySlug.get(slug) ?? [],
        removed_filter_slugs: removed,
        supabase,
      }),
    );
  }

  const classification_counts: Record<SamsungPassSupabaseParityClassificationV1, number> = {
    IN_SYNC: 0,
    SUPABASE_STILL_HAS_OLD_ROWS: 0,
    SUPABASE_MISSING_TARGET: 0,
    CONFLICT: 0,
    UNKNOWN_READ_FAILED: 0,
  };
  for (const row of rows) {
    classification_counts[row.classification] += 1;
  }

  const csvDrift = rows.filter((row) => !row.csv_matches_intent || row.csv_old_rows_still_present.length > 0);

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    `PROVEN: planned_slug_count=${String(expectedSlugs.length)}; target_filter_slug=${SAMSUNG_PASS_TARGET_FILTER_SLUG_V1}; csv_apply_commit=${SAMSUNG_PASS_CSV_APPLY_COMMIT_V1}.`,
    `PROVEN: classification_counts=${JSON.stringify(classification_counts)}.`,
  ];
  if (csvDrift.length === 0) {
    proven_facts.push(
      "PROVEN: CSV current mappings match intent da97-17376b-only and old da29-* removals are absent for all 5 slugs.",
    );
  }

  const unknown_facts = [
    "UNKNOWN: Whether founder will authorize a future guarded Supabase compat sync apply for these 5 slugs.",
    "UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.",
  ];
  if (classification_counts.UNKNOWN_READ_FAILED > 0) {
    unknown_facts.unshift(
      `UNKNOWN: Supabase read failed for ${String(classification_counts.UNKNOWN_READ_FAILED)} slug(s) — see row read_error.`,
    );
  }

  const risk_notes = [
    "This packet does not mutate Supabase or CSV.",
    "Do not mutate retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this packet.",
    "Future Supabase apply requires a separate founder approval artifact + guarded executor.",
  ];
  if (csvDrift.length > 0) {
    risk_notes.unshift(
      `CSV drift vs intent on ${String(csvDrift.length)} slug(s) — resolve before any Supabase sync.`,
    );
  }
  if (classification_counts.SUPABASE_STILL_HAS_OLD_ROWS > 0) {
    risk_notes.unshift(
      `Live Supabase still has old da29-* rows on ${String(classification_counts.SUPABASE_STILL_HAS_OLD_ROWS)} slug(s).`,
    );
  }
  if (classification_counts.SUPABASE_MISSING_TARGET > 0) {
    risk_notes.unshift(
      `Live Supabase missing da97-17376b on ${String(classification_counts.SUPABASE_MISSING_TARGET)} slug(s).`,
    );
  }

  return {
    contract: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    sitemap_robots_mutation_authorized: false,
    product_json_ld_mutation_authorized: false,
    owner_approval_required_for_future_supabase_apply: true,
    apply_authorized: false,
    generated_at,
    source_command: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1,
    apply_plan_rel_path: SAMSUNG_PASS_REPAIR_APPLY_PLAN_JSON_REL_V1,
    csv_apply_commit: SAMSUNG_PASS_CSV_APPLY_COMMIT_V1,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    target_filter_slug: SAMSUNG_PASS_TARGET_FILTER_SLUG_V1,
    planned_slug_count: expectedSlugs.length,
    classification_counts,
    rows,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildSamsungPassRepairSupabaseCompatParityMarkdownV1(
  report: SamsungPassRepairSupabaseCompatParityOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Samsung PASS 5 — Supabase compatibility parity owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- supabase_mutation_authorized: **${String(report.supabase_mutation_authorized)}**`,
    `- planned_slug_count: **${String(report.planned_slug_count)}**`,
    `- target_filter_slug: \`${report.target_filter_slug}\``,
    `- csv_apply_commit: \`${report.csv_apply_commit}\``,
    "",
    "## Classification counts",
    "",
  ];
  for (const [key, value] of Object.entries(report.classification_counts)) {
    lines.push(`- **${key}**: ${String(value)}`);
  }
  lines.push("", "## Per-slug rows", "");
  for (const row of report.rows) {
    lines.push(`### ${row.fridge_slug}`, "");
    lines.push(`- classification: **${row.classification}**`);
    lines.push(`- csv_intent: \`${row.csv_intent_mappings.join("|") || "(none)"}\``);
    lines.push(`- csv_current: \`${row.csv_current_mappings.join("|") || "(none)"}\``);
    lines.push(`- csv_matches_intent: **${String(row.csv_matches_intent)}**`);
    lines.push(
      `- csv_old_rows_still_present: \`${row.csv_old_rows_still_present.join("|") || "(none)"}\``,
    );
    lines.push(
      `- supabase: \`${row.supabase_mappings ? row.supabase_mappings.join("|") || "(none)" : "(unread)"}\``,
    );
    lines.push(
      `- old_rows_still_in_supabase: \`${row.old_rows_still_in_supabase.join("|") || "(none)"}\``,
    );
    lines.push(`- missing_from_supabase: \`${row.missing_from_supabase.join("|") || "(none)"}\``);
    lines.push(
      `- unexpected_in_supabase: \`${row.unexpected_in_supabase.join("|") || "(none)"}\``,
    );
    if (row.read_error) lines.push(`- read_error: ${row.read_error}`);
    lines.push("");
  }
  lines.push("## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return lines.join("\n");
}

export function writeSamsungPassRepairSupabaseCompatParityArtifactsV1(args: {
  rootDir: string;
  report: SamsungPassRepairSupabaseCompatParityOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildSamsungPassRepairSupabaseCompatParityMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    json_rel_path: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    md_rel_path: SAMSUNG_PASS_REPAIR_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  };
}
