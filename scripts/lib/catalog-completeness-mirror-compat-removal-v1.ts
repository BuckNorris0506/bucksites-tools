/**
 * Exact compatibility rows removed from data/compatibility_mappings.csv
 * by the catalog-completeness mirror repair.
 *
 * The delete set is the key diff of HEAD versus the working CSV.
 * It is not "every row for these filters" and not "every row missing from the CSV".
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_CONTRACT_V1 =
  "catalog_completeness_mirror_compat_removal_plan_v1" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_CSV_REL_V1 =
  "data/compatibility_mappings.csv" as const;

export const CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/catalog-completeness-mirror-compat-removal-plan-v1.json" as const;

/** Known sweep-target filter slugs. Used only to prove the diff belongs to this class. */
export const CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1 = [
  "4396395",
  "4396508",
  "4396710",
  "8171413",
  "adq36006101",
  "adq74793502",
  "frig-242017801",
  "lt1000pc",
  "mdj64844601",
  "purepour",
  "wfcb",
] as const;

export const CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1 = 194 as const;

/** Read-only controls. Never delete targets. */
export const CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1 = [
  "edr1rxd1",
  "edr2rxd1",
  "edr4rxd1",
  "lt1000p",
  "wf3cb",
  "ukf8001",
  "frig-242086201",
  "frig-242294502",
  "gswf",
  "gswf2",
  "adq75795101",
  "da29-00012b",
  "da97-17376a",
  "4396842",
  "46-9002",
] as const;

export type CatalogCompletenessMirrorCompatKeyV1 = {
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
};

export type CatalogCompletenessMirrorCompatRemovalPlanV1 = {
  contract: typeof CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  supabase_mutation_authorized: false;
  apply_authorized: false;
  derivation: "git_diff_head_vs_working_tree:data/compatibility_mappings.csv";
  delete_scope: "exact_row_keys_present_in_head_csv_and_absent_from_working_csv";
  not_a_filter_wide_delete: true;
  not_a_missing_csv_reconciliation: true;
  head_csv_sha256: string;
  working_csv_sha256: string;
  expected_delete_count: typeof CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1;
  filter_slugs: string[];
  counts_by_filter: Record<string, number>;
  deletes: CatalogCompletenessMirrorCompatKeyV1[];
};

export function catalogCompletenessMirrorCompatRowKeyV1(
  fridgeSlug: string,
  filterSlug: string,
): string {
  return `${fridgeSlug}::${filterSlug}`;
}

export function sha256Utf8V1(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function parseCompatibilityMappingSlugPairsV1(
  csvText: string,
): { ok: true; pairs: Map<string, CatalogCompletenessMirrorCompatKeyV1> } | { ok: false; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { ok: false, errors: ["compatibility csv is empty"] };
  }
  const header = lines[0]!.trim().toLowerCase();
  if (header !== "fridge_slug,filter_slug") {
    return { ok: false, errors: [`compatibility csv header mismatch: ${header}`] };
  }
  const pairs = new Map<string, CatalogCompletenessMirrorCompatKeyV1>();
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    const parts = line.split(",");
    if (parts.length !== 2) {
      errors.push(`compatibility csv line ${String(i + 1)} is not fridge_slug,filter_slug`);
      continue;
    }
    const fridge_slug = normalizeSlug(parts[0] ?? "");
    const filter_slug = normalizeSlug(parts[1] ?? "");
    if (!fridge_slug || !filter_slug) {
      errors.push(`compatibility csv line ${String(i + 1)} has an empty slug`);
      continue;
    }
    const row_key = catalogCompletenessMirrorCompatRowKeyV1(fridge_slug, filter_slug);
    if (pairs.has(row_key)) {
      errors.push(`duplicate compatibility csv key ${row_key}`);
      continue;
    }
    pairs.set(row_key, { fridge_slug, filter_slug, row_key });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, pairs };
}

export function canonicalCatalogCompletenessMirrorRemovalPlanTextV1(
  plan: CatalogCompletenessMirrorCompatRemovalPlanV1,
): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function deriveCatalogCompletenessMirrorRemovalPlanFromCsvTextsV1(args: {
  headCsv: string;
  workingCsv: string;
}):
  | {
      ok: true;
      plan: CatalogCompletenessMirrorCompatRemovalPlanV1;
      canonical_text: string;
      plan_sha256: string;
    }
  | { ok: false; errors: string[] } {
  const head = parseCompatibilityMappingSlugPairsV1(args.headCsv);
  if (!head.ok) return head;
  const working = parseCompatibilityMappingSlugPairsV1(args.workingCsv);
  if (!working.ok) return working;

  const errors: string[] = [];
  const added: string[] = [];
  for (const key of working.pairs.keys()) {
    if (!head.pairs.has(key)) added.push(key);
  }
  if (added.length > 0) {
    errors.push(
      `working csv has ${String(added.length)} rows that are not in HEAD; refusing a mixed diff`,
    );
  }

  const deletes: CatalogCompletenessMirrorCompatKeyV1[] = [];
  for (const [key, row] of head.pairs) {
    if (!working.pairs.has(key)) deletes.push(row);
  }
  deletes.sort((a, b) => a.row_key.localeCompare(b.row_key));

  const allowedFilters = new Set<string>(CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1);
  const counts: Record<string, number> = {};
  for (const slug of CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1) counts[slug] = 0;
  for (const row of deletes) {
    if (!allowedFilters.has(row.filter_slug)) {
      errors.push(`deleted key is outside the mirror-defect class: ${row.row_key}`);
      continue;
    }
    counts[row.filter_slug] = (counts[row.filter_slug] ?? 0) + 1;
  }

  const filter_slugs = CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1.filter(
    (slug) => (counts[slug] ?? 0) > 0,
  );
  if (filter_slugs.length !== CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1.length) {
    const missing = CATALOG_COMPLETENESS_MIRROR_FILTER_SLUGS_V1.filter(
      (slug) => (counts[slug] ?? 0) === 0,
    );
    errors.push(`deleted keys do not cover the mirror-defect class: missing ${missing.join(",")}`);
  }
  if (deletes.length !== CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1) {
    errors.push(
      `expected delete count ${String(CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1)}, derived ${String(deletes.length)}`,
    );
  }

  const controlFilters = new Set<string>(CATALOG_COMPLETENESS_MIRROR_CONTROL_FILTER_SLUGS_V1);
  for (const row of deletes) {
    if (controlFilters.has(row.filter_slug)) {
      errors.push(`deleted key touches a control filter: ${row.row_key}`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const plan: CatalogCompletenessMirrorCompatRemovalPlanV1 = {
    contract: CATALOG_COMPLETENESS_MIRROR_COMPAT_REMOVAL_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    apply_authorized: false,
    derivation: "git_diff_head_vs_working_tree:data/compatibility_mappings.csv",
    delete_scope: "exact_row_keys_present_in_head_csv_and_absent_from_working_csv",
    not_a_filter_wide_delete: true,
    not_a_missing_csv_reconciliation: true,
    head_csv_sha256: sha256Utf8V1(args.headCsv),
    working_csv_sha256: sha256Utf8V1(args.workingCsv),
    expected_delete_count: CATALOG_COMPLETENESS_MIRROR_EXPECTED_DELETE_COUNT_V1,
    filter_slugs: [...filter_slugs],
    counts_by_filter: counts,
    deletes,
  };
  const canonical_text = canonicalCatalogCompletenessMirrorRemovalPlanTextV1(plan);
  return {
    ok: true,
    plan,
    canonical_text,
    plan_sha256: sha256Utf8V1(canonical_text),
  };
}

export function deriveCatalogCompletenessMirrorRemovalPlanFromRepoV1(rootDir: string):
  | {
      ok: true;
      plan: CatalogCompletenessMirrorCompatRemovalPlanV1;
      canonical_text: string;
      plan_sha256: string;
    }
  | { ok: false; errors: string[] } {
  const workingAbs = path.join(rootDir, CATALOG_COMPLETENESS_MIRROR_COMPAT_CSV_REL_V1);
  let workingCsv: string;
  let headCsv: string;
  try {
    workingCsv = readFileSync(workingAbs, "utf8");
    headCsv = execFileSync("git", ["show", `HEAD:${CATALOG_COMPLETENESS_MIRROR_COMPAT_CSV_REL_V1}`], {
      cwd: rootDir,
      encoding: "utf8",
    });
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
  return deriveCatalogCompletenessMirrorRemovalPlanFromCsvTextsV1({ headCsv, workingCsv });
}
