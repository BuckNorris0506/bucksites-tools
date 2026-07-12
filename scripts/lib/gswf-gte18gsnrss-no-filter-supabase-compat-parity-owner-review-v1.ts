/**
 * Read-only ge-gte18gsnrss no-filter Supabase compatibility parity owner review v1.
 * Compares post-CSV-suppression intent (empty mappings) vs live Supabase for one slug.
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
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";
import { GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 } from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_CONTRACT_V1 =
  "gswf_gte18gsnrss_no_filter_supabase_compat_parity_owner_review_v1" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review-v1.md" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-gte18gsnrss-no-filter-supabase-compat-parity-owner-review" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1,
] as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type Gte18NoFilterSupabaseParityClassificationV1 =
  | "IN_SYNC"
  | "SUPABASE_STILL_HAS_GSWF_FAMILY"
  | "CONFLICT"
  | "UNKNOWN_READ_FAILED";

export type GswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1 = {
  contract: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_CONTRACT_V1;
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
  source_command: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1;
  target_fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  target_csv_rel_path: typeof COMPATIBILITY_MAPPINGS_CSV_REL_V1;
  csv_intent_mappings: string[];
  csv_current_mappings: string[];
  supabase_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_mappings: string[] | null;
  classification: Gte18NoFilterSupabaseParityClassificationV1;
  gswf_family_still_in_supabase: string[];
  unexpected_in_supabase: string[];
  read_error: string | null;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildGte18NoFilterSupabaseCompatParityDepsV1 = {
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

export function classifyGte18NoFilterSupabaseParityV1(args: {
  csv_current_mappings: string[];
  supabase: SupabaseCompatLoadResultV1;
}): {
  classification: Gte18NoFilterSupabaseParityClassificationV1;
  supabase_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_mappings: string[] | null;
  gswf_family_still_in_supabase: string[];
  unexpected_in_supabase: string[];
  read_error: string | null;
} {
  if (args.supabase.status === "UNKNOWN_DB_UNAVAILABLE") {
    return {
      classification: "UNKNOWN_READ_FAILED",
      supabase_status: "UNKNOWN_DB_UNAVAILABLE",
      supabase_mappings: null,
      gswf_family_still_in_supabase: [],
      unexpected_in_supabase: [],
      read_error: args.supabase.reason,
    };
  }

  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);
  const supabase_mappings = sortedUnique(args.supabase.supabase_filter_slugs);
  const gswf_family_still_in_supabase = supabase_mappings.filter((f) => family.has(f));
  const unexpected_in_supabase = supabase_mappings.filter((f) => !family.has(f));

  let classification: Gte18NoFilterSupabaseParityClassificationV1;
  if (supabase_mappings.length === 0) {
    classification = "IN_SYNC";
  } else if (gswf_family_still_in_supabase.length > 0) {
    classification = "SUPABASE_STILL_HAS_GSWF_FAMILY";
  } else {
    classification = "CONFLICT";
  }

  return {
    classification,
    supabase_status: "CHECKED",
    supabase_mappings,
    gswf_family_still_in_supabase,
    unexpected_in_supabase,
    read_error: null,
  };
}

async function defaultLoadSupabaseCompat(fridgeSlug: string): Promise<SupabaseCompatLoadResultV1> {
  return tryLoadSupabaseCompatForModelV1(fridgeSlug, []);
}

export async function buildGswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1(
  deps: BuildGte18NoFilterSupabaseCompatParityDepsV1,
): Promise<GswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1> {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const target = GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  const csv_intent_mappings: string[] = [];
  const csv_current_mappings = readCsvCurrentMappings(deps.rootDir, target);
  const loadSupabase = deps.loadSupabaseCompat ?? defaultLoadSupabaseCompat;
  const supabase = await loadSupabase(target);
  const classified = classifyGte18NoFilterSupabaseParityV1({
    csv_current_mappings,
    supabase,
  });

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; supabase_mutation_authorized=false; csv_mutation_authorized=false.",
    "PROVEN: buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    `PROVEN: target_fridge_slug=${target}; csv_intent_mappings=(none).`,
    `PROVEN: csv_current_mappings=${csv_current_mappings.join("|") || "(none)"}.`,
    `PROVEN: classification=${classified.classification}; supabase_status=${classified.supabase_status}.`,
  ];
  if (classified.supabase_mappings) {
    proven_facts.push(
      `PROVEN: supabase_mappings=${classified.supabase_mappings.join("|") || "(none)"}.`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: Whether founder will authorize a future guarded Supabase suppression apply for this slug.",
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
    "Future Supabase apply requires a separate founder approval artifact + guarded executor.",
  ];
  if (csv_current_mappings.length > 0) {
    risk_notes.unshift(
      `CSV still has mappings for ${target} (${csv_current_mappings.join("|")}) — CSV suppression parity incomplete.`,
    );
  }
  if (classified.classification === "SUPABASE_STILL_HAS_GSWF_FAMILY") {
    risk_notes.unshift(
      `Live Supabase still maps gswf/gswf2 for ${target}: ${classified.gswf_family_still_in_supabase.join("|")}.`,
    );
  }
  if (classified.classification === "CONFLICT") {
    risk_notes.unshift(
      `Live Supabase has unexpected non-gswf mappings for ${target}: ${classified.unexpected_in_supabase.join("|")}.`,
    );
  }

  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_CONTRACT_V1,
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
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_SOURCE_COMMAND_V1,
    target_fridge_slug: target,
    target_csv_rel_path: COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    csv_intent_mappings,
    csv_current_mappings,
    supabase_status: classified.supabase_status,
    supabase_mappings: classified.supabase_mappings,
    classification: classified.classification,
    gswf_family_still_in_supabase: classified.gswf_family_still_in_supabase,
    unexpected_in_supabase: classified.unexpected_in_supabase,
    read_error: classified.read_error,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildGswfGte18gsnrssNoFilterSupabaseCompatParityMarkdownV1(
  report: GswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1,
): string {
  return [
    "# GSWF ge-gte18gsnrss no-filter Supabase compat parity owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- supabase_mutation_authorized: **${String(report.supabase_mutation_authorized)}**`,
    `- classification: **${report.classification}**`,
    `- supabase_status: **${report.supabase_status}**`,
    "",
    "## Scope",
    "",
    `- target_fridge_slug: \`${report.target_fridge_slug}\``,
    `- csv_intent_mappings: \`${report.csv_intent_mappings.join("|") || "(none)"}\``,
    `- csv_current_mappings: \`${report.csv_current_mappings.join("|") || "(none)"}\``,
    `- supabase_mappings: \`${(report.supabase_mappings ?? []).join("|") || (report.supabase_mappings == null ? "(unread)" : "(none)")}\``,
    `- gswf_family_still_in_supabase: \`${report.gswf_family_still_in_supabase.join("|") || "(none)"}\``,
    `- unexpected_in_supabase: \`${report.unexpected_in_supabase.join("|") || "(none)"}\``,
    ...(report.read_error ? [`- read_error: ${report.read_error}`] : []),
    "",
    "## Proven facts",
    "",
    ...report.proven_facts.map((fact) => `- ${fact}`),
    "",
    "## Risk notes",
    "",
    ...report.risk_notes.map((note) => `- ${note}`),
    "",
  ].join("\n");
}

export function writeGswfGte18gsnrssNoFilterSupabaseCompatParityArtifactsV1(args: {
  rootDir: string;
  report: GswfGte18gsnrssNoFilterSupabaseCompatParityOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildGswfGte18gsnrssNoFilterSupabaseCompatParityMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    json_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_JSON_REL_V1,
    md_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPABASE_COMPAT_PARITY_MD_REL_V1,
  };
}
