/**
 * Read-only GSWF wrong-part repair Supabase compatibility sync plan owner review v1.
 * Compares post-apply CSV intent (13 repaired fridge slugs) vs live Supabase compatibility_mappings.
 * Does not mutate Supabase, CSV, retailer_links, buy CTA, pages, sitemap, robots, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { tryLoadSupabaseCompatForModelV1 } from "./buckparts-page-factory-preflight-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
  type GswfWrongPartRepairApplyPlanOwnerReviewV1,
  type GswfWrongPartRepairPlannedRowV1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1 =
  "gswf_wrong_part_repair_supabase_compat_sync_plan_owner_review_v1" as const;

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.json" as const;

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1.md" as const;

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review" as const;

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
] as const;

export const GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1 = "8361fba" as const;

export type GswfSupabaseCompatSyncClassificationV1 =
  | "IN_SYNC"
  | "SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING"
  | "SUPABASE_MISSING_ADDED_ROWS_PENDING"
  | "CONFLICT_REQUIRES_REVIEW"
  | "UNKNOWN_READ_FAILED";

export type GswfSupabaseCompatLoadResultV1 =
  | { status: "CHECKED"; supabase_filter_slugs: string[] }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string };

export type GswfSupabaseCompatSyncSlugRowV1 = {
  fridge_slug: string;
  classification: GswfSupabaseCompatSyncClassificationV1;
  csv_intent_mappings: string[];
  csv_current_mappings: string[];
  supabase_mappings: string[] | null;
  wrong_family_still_in_supabase: string[];
  missing_from_supabase: string[];
  unexpected_in_supabase: string[];
  proposed_supabase_removals: Array<{ fridge_slug: string; filter_slug: string }>;
  proposed_supabase_additions: Array<{ fridge_slug: string; filter_slug: string }>;
  read_error: string | null;
  supabase_mutation_authorized: false;
};

export type GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1 = {
  contract: typeof GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  retailer_links_mutation_authorized: false;
  buy_cta_authorized: false;
  owner_approval_required_for_future_supabase_apply: true;
  apply_authorized: false;
  generated_at: string;
  source_command: typeof GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1;
  csv_apply_commit: typeof GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1;
  apply_plan_rel_path: typeof GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1;
  planned_slug_count: number;
  excluded_slugs_untouched: string[];
  classification_counts: Record<GswfSupabaseCompatSyncClassificationV1, number>;
  rows: GswfSupabaseCompatSyncSlugRowV1[];
  proposed_supabase_change_summary: {
    removals: Array<{ fridge_slug: string; filter_slug: string }>;
    additions: Array<{ fridge_slug: string; filter_slug: string }>;
    note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
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

function readCompatByFridgeSlug(rootDir: string): Map<string, string[]> {
  const abs = path.join(rootDir, "data/compatibility_mappings.csv");
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;
  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const fridge = normalizeSlug(row.fridge_slug ?? "");
    const filter = normalizeSlug(row.filter_slug ?? "");
    if (!fridge || !filter) continue;
    const existing = bySlug.get(fridge) ?? [];
    existing.push(filter);
    bySlug.set(fridge, existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, sortedUnique(filters));
  }
  return bySlug;
}

function loadApplyPlan(rootDir: string): GswfWrongPartRepairApplyPlanOwnerReviewV1 {
  const abs = path.join(rootDir, GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`apply plan missing: ${GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1}`);
  }
  const plan = JSON.parse(readFileSync(abs, "utf8")) as GswfWrongPartRepairApplyPlanOwnerReviewV1;
  if (plan.contract !== GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_CONTRACT_V1) {
    throw new Error("GSWF wrong-part apply plan contract mismatch");
  }
  return plan;
}

export function classifyGswfSupabaseCompatSyncSlugV1(args: {
  fridge_slug: string;
  csv_intent_mappings: string[];
  csv_current_mappings: string[];
  supabase: GswfSupabaseCompatLoadResultV1;
}): GswfSupabaseCompatSyncSlugRowV1 {
  const fridge_slug = normalizeSlug(args.fridge_slug);
  const csv_intent_mappings = sortedUnique(args.csv_intent_mappings);
  const csv_current_mappings = sortedUnique(args.csv_current_mappings);
  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);

  if (args.supabase.status === "UNKNOWN_DB_UNAVAILABLE") {
    return {
      fridge_slug,
      classification: "UNKNOWN_READ_FAILED",
      csv_intent_mappings,
      csv_current_mappings,
      supabase_mappings: null,
      wrong_family_still_in_supabase: [],
      missing_from_supabase: [],
      unexpected_in_supabase: [],
      proposed_supabase_removals: [],
      proposed_supabase_additions: [],
      read_error: args.supabase.reason,
      supabase_mutation_authorized: false,
    };
  }

  const supabase_mappings = sortedUnique(args.supabase.supabase_filter_slugs);
  const wrong_family_still_in_supabase = supabase_mappings.filter((f) => family.has(f));
  const missing_from_supabase = csv_intent_mappings.filter((f) => !supabase_mappings.includes(f));
  const unexpected_in_supabase = supabase_mappings.filter(
    (f) => !csv_intent_mappings.includes(f) && !family.has(f),
  );

  const proposed_supabase_removals = wrong_family_still_in_supabase.map((filter_slug) => ({
    fridge_slug,
    filter_slug,
  }));
  const proposed_supabase_additions = missing_from_supabase.map((filter_slug) => ({
    fridge_slug,
    filter_slug,
  }));

  let classification: GswfSupabaseCompatSyncClassificationV1;
  if (setsEqual(csv_intent_mappings, supabase_mappings)) {
    classification = "IN_SYNC";
  } else if (
    wrong_family_still_in_supabase.length > 0 &&
    missing_from_supabase.length === 0 &&
    unexpected_in_supabase.length === 0
  ) {
    // Only leftover gswf/gswf2 (possibly plus already-correct remaps).
    // If intent equals supabase minus wrong family, this is the remove-pending case.
    const withoutWrong = supabase_mappings.filter((f) => !family.has(f));
    classification = setsEqual(withoutWrong, csv_intent_mappings)
      ? "SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING"
      : "CONFLICT_REQUIRES_REVIEW";
  } else if (
    missing_from_supabase.length > 0 &&
    wrong_family_still_in_supabase.length === 0 &&
    unexpected_in_supabase.length === 0
  ) {
    classification = "SUPABASE_MISSING_ADDED_ROWS_PENDING";
  } else {
    classification = "CONFLICT_REQUIRES_REVIEW";
  }

  return {
    fridge_slug,
    classification,
    csv_intent_mappings,
    csv_current_mappings,
    supabase_mappings,
    wrong_family_still_in_supabase,
    missing_from_supabase,
    unexpected_in_supabase,
    proposed_supabase_removals:
      classification === "IN_SYNC" || classification === "UNKNOWN_READ_FAILED"
        ? []
        : proposed_supabase_removals,
    proposed_supabase_additions:
      classification === "IN_SYNC" || classification === "UNKNOWN_READ_FAILED"
        ? []
        : proposed_supabase_additions,
    read_error: null,
    supabase_mutation_authorized: false,
  };
}

export type BuildGswfWrongPartRepairSupabaseCompatSyncPlanDepsV1 = {
  rootDir: string;
  now?: () => Date;
  loadSupabaseCompat?: (
    fridgeSlug: string,
  ) => Promise<GswfSupabaseCompatLoadResultV1> | GswfSupabaseCompatLoadResultV1;
};

async function defaultLoadSupabaseCompat(
  fridgeSlug: string,
): Promise<GswfSupabaseCompatLoadResultV1> {
  const result = await tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
  if (result.status === "UNKNOWN_DB_UNAVAILABLE") {
    return { status: "UNKNOWN_DB_UNAVAILABLE", reason: result.reason };
  }
  return { status: "CHECKED", supabase_filter_slugs: result.supabase_filter_slugs };
}

export async function buildGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1(
  deps: BuildGswfWrongPartRepairSupabaseCompatSyncPlanDepsV1,
): Promise<GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const plan = loadApplyPlan(deps.rootDir);
  const csvBySlug = readCompatByFridgeSlug(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;

  const plannedBySlug = new Map<string, GswfWrongPartRepairPlannedRowV1>();
  for (const row of plan.planned_rows) {
    plannedBySlug.set(normalizeSlug(row.fridge_slug), row);
  }

  const expectedSlugs = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  const planSlugs = Array.from(plannedBySlug.keys()).sort();
  if (JSON.stringify(expectedSlugs) !== JSON.stringify(planSlugs)) {
    throw new Error(
      `apply plan slug set mismatch — expected ${expectedSlugs.join(",")}, got ${planSlugs.join(",")}`,
    );
  }

  const excluded_slugs_untouched = [
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ].map(normalizeSlug);

  const rows: GswfSupabaseCompatSyncSlugRowV1[] = [];
  for (const slug of expectedSlugs) {
    const planned = plannedBySlug.get(slug)!;
    const csv_intent_mappings = sortedUnique(planned.after_mappings);
    const csv_current_mappings = csvBySlug.get(slug) ?? [];
    const supabase = await loadSupabase(slug);
    rows.push(
      classifyGswfSupabaseCompatSyncSlugV1({
        fridge_slug: slug,
        csv_intent_mappings,
        csv_current_mappings,
        supabase,
      }),
    );
  }

  const classification_counts: Record<GswfSupabaseCompatSyncClassificationV1, number> = {
    IN_SYNC: 0,
    SUPABASE_HAS_REMOVED_WRONG_ROWS_PENDING: 0,
    SUPABASE_MISSING_ADDED_ROWS_PENDING: 0,
    CONFLICT_REQUIRES_REVIEW: 0,
    UNKNOWN_READ_FAILED: 0,
  };
  for (const row of rows) {
    classification_counts[row.classification] += 1;
  }

  const removals = rows.flatMap((row) => row.proposed_supabase_removals);
  const additions = rows.flatMap((row) => row.proposed_supabase_additions);

  const csvDrift = rows.filter(
    (row) => !setsEqual(row.csv_intent_mappings, row.csv_current_mappings),
  );

  const proven_facts = [
    `PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false.`,
    `PROVEN: planned_slug_count=${String(expectedSlugs.length)}; csv_apply_commit=${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}.`,
    `PROVEN: excluded_slugs_untouched=${excluded_slugs_untouched.join("|")}.`,
    `PROVEN: classification_counts=${JSON.stringify(classification_counts)}.`,
    `PROVEN: proposed_supabase_removals=${String(removals.length)}; proposed_supabase_additions=${String(additions.length)} (plan only — not applied).`,
  ];
  if (csvDrift.length === 0) {
    proven_facts.push(
      "PROVEN: committed CSV current mappings match apply-plan after_mappings for all 13 repaired slugs.",
    );
  }

  const unknown_facts = [
    "UNKNOWN: Whether founder will authorize a future guarded Supabase compatibility sync apply.",
    "UNKNOWN: Whether live public pages currently resolve filters from CSV, Supabase, or both after deploy.",
  ];
  if (classification_counts.UNKNOWN_READ_FAILED > 0) {
    unknown_facts.unshift(
      `UNKNOWN: Supabase read failed for ${String(classification_counts.UNKNOWN_READ_FAILED)} slug(s) — see row read_error.`,
    );
  }

  const risk_notes = [
    "This packet does not mutate Supabase or CSV.",
    "Do not run retailer_links / buy CTA / sitemap / robots changes from this packet.",
    "Do not include PARTIAL or no-filter excluded slugs in any future Supabase sync apply.",
    "Future Supabase apply requires a separate founder approval artifact + guarded executor.",
  ];
  if (csvDrift.length > 0) {
    risk_notes.unshift(
      `CSV drift vs apply-plan after_mappings on ${String(csvDrift.length)} slug(s) — resolve before any Supabase sync.`,
    );
  }

  return {
    contract: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    retailer_links_mutation_authorized: false,
    buy_cta_authorized: false,
    owner_approval_required_for_future_supabase_apply: true,
    apply_authorized: false,
    generated_at: now().toISOString(),
    source_command: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_SOURCE_COMMAND_V1,
    csv_apply_commit: GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
    apply_plan_rel_path: GSWF_WRONG_PART_REPAIR_APPLY_PLAN_OWNER_REVIEW_JSON_REL_V1,
    planned_slug_count: expectedSlugs.length,
    excluded_slugs_untouched,
    classification_counts,
    rows,
    proposed_supabase_change_summary: {
      removals,
      additions,
      note: "Future founder-gated apply plan only — this report does not mutate Supabase.",
    },
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildGswfWrongPartRepairSupabaseCompatSyncPlanMarkdownV1(
  report: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1,
): string {
  const lines: string[] = [
    "# GSWF wrong-part repair — Supabase compatibility sync plan (owner review)",
    "",
    `- contract: \`${report.contract}\``,
    `- generated_at: \`${report.generated_at}\``,
    `- csv_apply_commit: \`${report.csv_apply_commit}\``,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- supabase_mutation_authorized: **false**`,
    `- apply_authorized: **false**`,
    `- planned_slug_count: **${String(report.planned_slug_count)}**`,
    `- excluded_slugs_untouched: \`${report.excluded_slugs_untouched.join("|")}\``,
    "",
    "## Classification counts",
    "",
  ];
  for (const [key, value] of Object.entries(report.classification_counts)) {
    lines.push(`- **${key}**: ${String(value)}`);
  }
  lines.push(
    "",
    "## Proposed Supabase changes (NOT applied)",
    "",
    `- removals: **${String(report.proposed_supabase_change_summary.removals.length)}**`,
    `- additions: **${String(report.proposed_supabase_change_summary.additions.length)}**`,
    `- note: ${report.proposed_supabase_change_summary.note}`,
    "",
    "## Per-slug rows",
    "",
  );
  for (const row of report.rows) {
    lines.push(`### ${row.fridge_slug}`, "");
    lines.push(`- classification: **${row.classification}**`);
    lines.push(`- csv_intent: \`${row.csv_intent_mappings.join("|") || "none"}\``);
    lines.push(`- csv_current: \`${row.csv_current_mappings.join("|") || "none"}\``);
    lines.push(
      `- supabase: \`${row.supabase_mappings ? row.supabase_mappings.join("|") || "none" : "READ_FAILED"}\``,
    );
    lines.push(
      `- wrong_family_still_in_supabase: \`${row.wrong_family_still_in_supabase.join("|") || "none"}\``,
    );
    lines.push(`- missing_from_supabase: \`${row.missing_from_supabase.join("|") || "none"}\``);
    lines.push(
      `- unexpected_in_supabase: \`${row.unexpected_in_supabase.join("|") || "none"}\``,
    );
    if (row.read_error) lines.push(`- read_error: \`${row.read_error}\``);
    lines.push(`- supabase_mutation_authorized: **false**`, "");
  }
  lines.push("## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of report.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeGswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewArtifactsV1(args: {
  rootDir: string;
  report: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildGswfWrongPartRepairSupabaseCompatSyncPlanMarkdownV1(args.report),
    "utf8",
  );
  return {
    json_rel_path: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
    md_rel_path: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_MD_REL_V1,
  };
}
