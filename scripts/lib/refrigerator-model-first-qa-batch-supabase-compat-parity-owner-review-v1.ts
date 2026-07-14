/**
 * Read-only refrigerator model-first QA batch Supabase compatibility parity owner review v1.
 * Compares post-CSV-apply QA batch mappings (20 slugs) vs live Supabase.
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
  REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
  REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1,
  type RefrigeratorModelFirstInputManifestV1,
} from "./refrigerator-model-first-batch-resolver-v1";
import { REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1 } from "./refrigerator-model-first-qa-batch-post-apply-v1";

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_CONTRACT_V1 =
  "refrigerator_model_first_qa_batch_supabase_compat_parity_owner_review_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.json" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review-v1.md" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:refrigerator-model-first-qa-batch-supabase-compat-parity-owner-review" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 = [
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1,
] as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1 = "a2b5bc7" as const;

export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_FOUNDER_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/refrigerator-model-first-mapping-review-founder-approval-packet-v1.md" as const;

/** Exact 20 QA-batch fridge slugs from fridge-models-batch-v1 (sorted for stable reports). */
export const REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1 = [
  "frigidaire-ffhb2740ps",
  "frigidaire-fghb2868pf",
  "frigidaire-fgsc2335tf",
  "ge-gfe28gmkes",
  "ge-gfe28gskss",
  "ge-gfe28gynfs",
  "lg-lfxc22596s",
  "lg-lfxs26973s",
  "lg-lfxs28968s",
  "lg-lmxs28626s",
  "lg-lrfvs3006s",
  "lg-lrfxs3106s",
  "samsung-rf263beaesr",
  "samsung-rf28nhedbsr",
  "samsung-rf28r7201sr",
  "samsung-rf28r7351sg",
  "whirlpool-wrf540cwhz",
  "whirlpool-wrs325sdhz",
  "whirlpool-wrx735sdhz",
  "whirlpool-wrx986sihz",
] as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1 =
  | "IN_SYNC"
  | "SUPABASE_STILL_HAS_OLD_ROWS"
  | "SUPABASE_MISSING_TARGET"
  | "CONFLICT"
  | "UNKNOWN_READ_FAILED";

export type RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1 = {
  fridge_slug: string;
  classification: RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1;
  csv_intent_mappings: string[];
  csv_current_mappings: string[];
  csv_matches_intent: boolean;
  supabase_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_mappings: string[] | null;
  old_rows_still_in_supabase: string[];
  missing_from_supabase: string[];
  unexpected_in_supabase: string[];
  read_error: string | null;
  supabase_mutation_authorized: false;
};

export type RefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_CONTRACT_V1;
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
  source_command: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1;
  csv_apply_commit: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1;
  manifest_rel_path: typeof REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1;
  founder_packet_rel_path: typeof REFRIGERATOR_MODEL_FIRST_QA_BATCH_FOUNDER_PACKET_MD_REL_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  planned_slug_count: number;
  classification_counts: Record<RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1, number>;
  rows: RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildRefrigeratorModelFirstQaBatchSupabaseCompatParityDepsV1 = {
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

function loadAndValidateManifestSlugs(rootDir: string): string[] {
  const abs = path.join(rootDir, REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1);
  if (!existsSync(abs)) {
    throw new Error(`missing manifest ${REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1}`);
  }
  const manifest = JSON.parse(readFileSync(abs, "utf8")) as RefrigeratorModelFirstInputManifestV1;
  if (manifest.contract !== REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1) {
    throw new Error(
      `manifest contract mismatch: expected ${REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1}, got ${String(manifest.contract)}`,
    );
  }
  const manifestSlugs = sortedUnique((manifest.models ?? []).map((row) => row.fridge_slug));
  const expectedSlugs = [...REFRIGERATOR_MODEL_FIRST_QA_BATCH_FRIDGE_SLUGS_V1];
  if (JSON.stringify(manifestSlugs) !== JSON.stringify(expectedSlugs)) {
    throw new Error(
      `manifest slug set mismatch — expected ${expectedSlugs.join(",")}, got ${manifestSlugs.join(",")}`,
    );
  }
  if (manifestSlugs.length !== REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count) {
    throw new Error(
      `manifest slug count expected ${String(REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count)}, got ${String(manifestSlugs.length)}`,
    );
  }
  return expectedSlugs;
}

/**
 * CSV post-apply mappings are the intent. Supabase extras = old leftover rows;
 * CSV filters absent from Supabase = missing targets.
 */
export function classifyRefrigeratorModelFirstQaBatchSupabaseParitySlugV1(args: {
  fridge_slug: string;
  csv_current_mappings: string[];
  supabase: SupabaseCompatLoadResultV1;
}): RefrigeratorModelFirstQaBatchSupabaseParitySlugRowV1 {
  const fridge_slug = normalizeSlug(args.fridge_slug);
  const csv_current_mappings = sortedUnique(args.csv_current_mappings);
  const csv_intent_mappings = [...csv_current_mappings];
  const csv_matches_intent = true;

  if (args.supabase.status === "UNKNOWN_DB_UNAVAILABLE") {
    return {
      fridge_slug,
      classification: "UNKNOWN_READ_FAILED",
      csv_intent_mappings,
      csv_current_mappings,
      csv_matches_intent,
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
  const csvSet = new Set(csv_intent_mappings);
  const old_rows_still_in_supabase = supabase_mappings.filter((f) => !csvSet.has(f));
  const missing_from_supabase = csv_intent_mappings.filter((f) => !supabase_mappings.includes(f));
  // With CSV-as-intent, any non-CSV Supabase row is an "old leftover" — no separate unexpected bucket.
  const unexpected_in_supabase: string[] = [];

  let classification: RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1;
  if (old_rows_still_in_supabase.length > 0 && missing_from_supabase.length > 0) {
    classification = "CONFLICT";
  } else if (old_rows_still_in_supabase.length > 0) {
    classification = "SUPABASE_STILL_HAS_OLD_ROWS";
  } else if (missing_from_supabase.length > 0) {
    classification = "SUPABASE_MISSING_TARGET";
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

export async function buildRefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1(
  deps: BuildRefrigeratorModelFirstQaBatchSupabaseCompatParityDepsV1,
): Promise<RefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const expectedSlugs = loadAndValidateManifestSlugs(deps.rootDir);
  const csvBySlug = readCsvByFridgeSlug(deps.rootDir);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;

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

  const classification_counts: Record<
    RefrigeratorModelFirstQaBatchSupabaseParityClassificationV1,
    number
  > = {
    IN_SYNC: 0,
    SUPABASE_STILL_HAS_OLD_ROWS: 0,
    SUPABASE_MISSING_TARGET: 0,
    CONFLICT: 0,
    UNKNOWN_READ_FAILED: 0,
  };
  for (const row of rows) {
    classification_counts[row.classification] += 1;
  }

  const emptyCsv = rows.filter((row) => row.csv_current_mappings.length === 0);

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    `PROVEN: planned_slug_count=${String(expectedSlugs.length)}; csv_apply_commit=${REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1}.`,
    `PROVEN: manifest=${REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1}; batch_model_count=${String(REFRIGERATOR_MODEL_FIRST_QA_BATCH_APPLIED_COUNTS_V1.batch_model_count)}.`,
    `PROVEN: classification_counts=${JSON.stringify(classification_counts)}.`,
    "PROVEN: CSV current mappings are treated as post-apply intent for each of the 20 QA-batch slugs.",
  ];

  const unknown_facts = [
    "UNKNOWN: Whether founder will authorize a future guarded Supabase compat sync apply for these 20 slugs.",
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
  if (emptyCsv.length > 0) {
    risk_notes.unshift(
      `CSV has zero mappings for ${String(emptyCsv.length)} slug(s) — confirm post-apply state before any Supabase sync.`,
    );
  }
  if (classification_counts.SUPABASE_STILL_HAS_OLD_ROWS > 0) {
    risk_notes.unshift(
      `Live Supabase still has non-CSV leftover rows on ${String(classification_counts.SUPABASE_STILL_HAS_OLD_ROWS)} slug(s).`,
    );
  }
  if (classification_counts.SUPABASE_MISSING_TARGET > 0) {
    risk_notes.unshift(
      `Live Supabase missing CSV target filter(s) on ${String(classification_counts.SUPABASE_MISSING_TARGET)} slug(s).`,
    );
  }
  if (classification_counts.CONFLICT > 0) {
    risk_notes.unshift(
      `Live Supabase conflicts with CSV on ${String(classification_counts.CONFLICT)} slug(s) (extras and missing targets).`,
    );
  }

  return {
    contract: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_CONTRACT_V1,
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
    source_command: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1,
    csv_apply_commit: REFRIGERATOR_MODEL_FIRST_QA_BATCH_CSV_APPLY_COMMIT_V1,
    manifest_rel_path: REFRIGERATOR_MODEL_FIRST_DEFAULT_MANIFEST_REL_V1,
    founder_packet_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_FOUNDER_PACKET_MD_REL_V1,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    planned_slug_count: expectedSlugs.length,
    classification_counts,
    rows,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildRefrigeratorModelFirstQaBatchSupabaseCompatParityMarkdownV1(
  report: RefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1,
): string {
  const lines: string[] = [
    "# Refrigerator model-first QA batch — Supabase compatibility parity owner review v1",
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
    `- csv_apply_commit: \`${report.csv_apply_commit}\``,
    `- manifest: \`${report.manifest_rel_path}\``,
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
    lines.push(`- csv_intent/current: \`${row.csv_current_mappings.join("|") || "(none)"}\``);
    lines.push(
      `- supabase: \`${row.supabase_mappings ? row.supabase_mappings.join("|") || "(none)" : "(unread)"}\``,
    );
    lines.push(
      `- old_rows_still_in_supabase: \`${row.old_rows_still_in_supabase.join("|") || "(none)"}\``,
    );
    lines.push(`- missing_from_supabase: \`${row.missing_from_supabase.join("|") || "(none)"}\``);
    if (row.read_error) lines.push(`- read_error: ${row.read_error}`);
    lines.push("");
  }
  lines.push("## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of report.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return lines.join("\n");
}

export function writeRefrigeratorModelFirstQaBatchSupabaseCompatParityArtifactsV1(args: {
  rootDir: string;
  report: RefrigeratorModelFirstQaBatchSupabaseCompatParityOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(
    args.rootDir,
    REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  );
  const mdAbs = path.join(
    args.rootDir,
    REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildRefrigeratorModelFirstQaBatchSupabaseCompatParityMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    json_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    md_rel_path: REFRIGERATOR_MODEL_FIRST_QA_BATCH_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  };
}
