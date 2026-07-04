/**
 * Coverage Batch A — scoped fridge retailer_links CSV ↔ Supabase parity + sync.
 * Only edr3rxd1 and ultrawf primary rows. Dry-run default. Write requires MUTATION.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  resolveIoCapabilityFromEnvV1,
  type SupabaseMutationGateModeV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import {
  founderDecisionRowMatchesSlugIdentityV1,
  loadFounderDecisionRowsWithSlugCorrelationV1,
} from "./founder-decision-slug-correlation-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";

export const COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1 =
  "coverage_batch_a_fridge_retailer_links_supabase_parity_v1" as const;

export const COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1 = [
  "edr3rxd1",
  "ultrawf",
] as const;

export type CoverageBatchAFridgeRetailerLinksSlugV1 =
  (typeof COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1)[number];

export const COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1 = [
  "affiliate_url",
  "retailer_name",
  "browser_truth_classification",
  "browser_truth_notes",
  "browser_truth_checked_at",
  "is_primary",
  "retailer_key",
] as const;

export type CoverageBatchAFridgeRetailerLinksCompareFieldV1 =
  (typeof COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1)[number];

export const COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CSV_REL_V1 =
  "data/retailer_links.csv" as const;

export const COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CLOSEOUT_REL_V1 =
  "data/fridge/batch-production/closeout/coverage-batch-a-fridge-retailer-links-supabase-parity-closeout-v1.json" as const;

export type CoverageBatchACsvPrimaryRowV1 = {
  filter_slug: CoverageBatchAFridgeRetailerLinksSlugV1;
  affiliate_url: string;
  retailer_name: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
  is_primary: boolean;
  retailer_key: string;
};

export type CoverageBatchASupabasePrimaryRowV1 = {
  id: string | null;
  filter_id: string;
  affiliate_url: string;
  retailer_name: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
  is_primary: boolean;
  retailer_key: string;
};

export type CoverageBatchAFieldParityV1 = {
  field: CoverageBatchAFridgeRetailerLinksCompareFieldV1;
  csv_value: string;
  supabase_value: string | null;
  match: boolean;
};

export type CoverageBatchASlugParityV1 = {
  filter_slug: CoverageBatchAFridgeRetailerLinksSlugV1;
  status:
    | "CSV_AND_SUPABASE_MATCH"
    | "CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE"
    | "CSV_PRIMARY_MISSING"
    | "SUPABASE_FILTER_MISSING"
    | "UNKNOWN_DB_UNAVAILABLE";
  filter_id: string | null;
  csv_primary: CoverageBatchACsvPrimaryRowV1 | null;
  supabase_primary: CoverageBatchASupabasePrimaryRowV1 | null;
  field_parity: CoverageBatchAFieldParityV1[];
  mismatched_fields: CoverageBatchAFridgeRetailerLinksCompareFieldV1[];
  planned_action: "none" | "insert" | "update";
};

export type CoverageBatchAParityReportV1 = {
  contract: typeof COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  mode: "dry_run" | "write";
  generated_at: string;
  allowed_slugs: readonly CoverageBatchAFridgeRetailerLinksSlugV1[];
  supabase_truth_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_unavailable_reason: string | null;
  row_count_planned: number;
  rows: CoverageBatchASlugParityV1[];
  all_in_parity: boolean;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

function normalizeSlug(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isAllowedSlug(slug: string): slug is CoverageBatchAFridgeRetailerLinksSlugV1 {
  return (COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1 as readonly string[]).includes(
    slug,
  );
}

function isTruthyPrimary(value: string | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  const n = String(value ?? "")
    .trim()
    .toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

function normField(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "").trim();
}

/**
 * Normalize ISO-8601 instants for parity compare.
 * PROVEN: Postgres/Supabase often returns `+00:00` while CSV stores `.000Z` for the same UTC instant.
 */
export function normalizeUtcInstantForParityV1(
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return raw;
  return new Date(ms).toISOString();
}

export function coverageBatchAFieldValuesMatchV1(
  field: CoverageBatchAFridgeRetailerLinksCompareFieldV1,
  csvValue: string | boolean | null | undefined,
  supabaseValue: string | boolean | null | undefined,
): boolean {
  if (field === "browser_truth_checked_at") {
    const csvNorm = normalizeUtcInstantForParityV1(
      typeof csvValue === "boolean" ? String(csvValue) : csvValue,
    );
    const supabaseNorm = normalizeUtcInstantForParityV1(
      typeof supabaseValue === "boolean" ? String(supabaseValue) : supabaseValue,
    );
    if (csvNorm == null && supabaseNorm == null) return true;
    if (csvNorm == null || supabaseNorm == null) return false;
    return csvNorm === supabaseNorm;
  }
  const csv = field === "is_primary" ? (isTruthyPrimary(csvValue) ? "true" : "false") : normField(csvValue);
  const supabase =
    field === "is_primary"
      ? isTruthyPrimary(supabaseValue)
        ? "true"
        : "false"
      : normField(supabaseValue);
  return csv === supabase;
}

export function assertOnlyCoverageBatchASlugsV1(slugs: readonly string[]): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  for (const slug of slugs) {
    const n = normalizeSlug(slug);
    if (!isAllowedSlug(n)) {
      blockers.push(`slug_not_in_coverage_batch_a_allowlist:${n || "(empty)"}`);
    }
  }
  const unique = new Set(slugs.map(normalizeSlug));
  for (const allowed of COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1) {
    if (!unique.has(allowed)) {
      blockers.push(`coverage_batch_a_slug_missing_from_selection:${allowed}`);
    }
  }
  if (unique.size !== COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1.length) {
    blockers.push(
      `coverage_batch_a_slug_count_invalid: count=${String(unique.size)} expected=${String(COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1.length)}`,
    );
  }
  return { ok: blockers.length === 0, blockers: Array.from(new Set(blockers)) };
}

export function selectCoverageBatchACsvPrimaryRowsV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}): CoverageBatchACsvPrimaryRowV1[] {
  const readText =
    args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  const rows = parse(readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const bySlug = new Map<CoverageBatchAFridgeRetailerLinksSlugV1, CoverageBatchACsvPrimaryRowV1>();
  for (const row of rows) {
    const slug = normalizeSlug(row.filter_slug);
    if (!isAllowedSlug(slug)) continue;
    if (!isTruthyPrimary(row.is_primary)) continue;
    bySlug.set(slug, {
      filter_slug: slug,
      affiliate_url: normField(row.affiliate_url),
      retailer_name: normField(row.retailer_name),
      browser_truth_classification: normField(row.browser_truth_classification),
      browser_truth_notes: normField(row.browser_truth_notes),
      browser_truth_checked_at: normField(row.browser_truth_checked_at),
      is_primary: true,
      retailer_key: normField(row.retailer_key),
    });
  }

  const selected = COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1.map(
    (slug) => bySlug.get(slug),
  ).filter((row): row is CoverageBatchACsvPrimaryRowV1 => row != null);

  const guard = assertOnlyCoverageBatchASlugsV1(selected.map((r) => r.filter_slug));
  if (!guard.ok && selected.length === COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1.length) {
    // allowlist size matches; guard only fails on extras
  }
  const extras = selected.filter((r) => !isAllowedSlug(r.filter_slug));
  if (extras.length > 0) {
    throw new Error(
      `Coverage Batch A CSV selection leaked non-allowlist slugs: ${extras.map((e) => e.filter_slug).join(",")}`,
    );
  }
  return selected;
}

export function buildCoverageBatchAFieldParityV1(args: {
  csv: CoverageBatchACsvPrimaryRowV1;
  supabase: CoverageBatchASupabasePrimaryRowV1 | null;
}): CoverageBatchAFieldParityV1[] {
  return COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1.map((field) => {
    const csv_value =
      field === "is_primary" ? (args.csv.is_primary ? "true" : "false") : normField(args.csv[field]);
    const supabase_value =
      args.supabase == null
        ? null
        : field === "is_primary"
          ? args.supabase.is_primary
            ? "true"
            : "false"
          : normField(args.supabase[field]);
    const match =
      args.supabase != null &&
      coverageBatchAFieldValuesMatchV1(field, args.csv[field], args.supabase[field]);
    return {
      field,
      csv_value,
      supabase_value,
      match,
    };
  });
}

function csvSha256V1(rootDir: string, readText?: (abs: string) => string): string {
  const read = readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(rootDir, COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  return createHash("sha256").update(read(abs), "utf8").digest("hex");
}

export async function loadCoverageBatchASupabasePrimariesV1(args: {
  slugs: readonly CoverageBatchAFridgeRetailerLinksSlugV1[];
  loadEnv?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSupabaseAdmin?: () => any;
}): Promise<
  | {
      status: "CHECKED";
      by_slug: Map<CoverageBatchAFridgeRetailerLinksSlugV1, CoverageBatchASupabasePrimaryRowV1 | null>;
      filter_id_by_slug: Map<CoverageBatchAFridgeRetailerLinksSlugV1, string | null>;
    }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string }
> {
  try {
    const loadEnv = args.loadEnv ?? (await import("./load-env")).loadEnv;
    const getSupabaseAdmin =
      args.getSupabaseAdmin ?? (await import("./supabase-admin")).getSupabaseAdmin;
    loadEnv();
    const supabase = getSupabaseAdmin();

    const slugList = [...args.slugs];
    const { data: filters, error: filterErr } = await supabase
      .from("filters")
      .select("id, slug")
      .in("slug", slugList);
    if (filterErr) throw new Error(filterErr.message);

    const filterIdBySlug = new Map<CoverageBatchAFridgeRetailerLinksSlugV1, string | null>();
    for (const slug of slugList) filterIdBySlug.set(slug, null);
    for (const row of filters ?? []) {
      const id = String((row as { id?: string }).id ?? "");
      const slug = normalizeSlug((row as { slug?: string }).slug);
      if (!id || !isAllowedSlug(slug)) continue;
      filterIdBySlug.set(slug, id);
    }

    const bySlug = new Map<
      CoverageBatchAFridgeRetailerLinksSlugV1,
      CoverageBatchASupabasePrimaryRowV1 | null
    >();

    for (const slug of slugList) {
      const filterId = filterIdBySlug.get(slug);
      if (!filterId) {
        bySlug.set(slug, null);
        continue;
      }
      const { data: links, error: linkErr } = await supabase
        .from("retailer_links")
        .select(
          "id, filter_id, retailer_key, retailer_name, affiliate_url, is_primary, browser_truth_classification, browser_truth_notes, browser_truth_checked_at",
        )
        .eq("filter_id", filterId)
        .order("is_primary", { ascending: false })
        .order("retailer_name", { ascending: true });
      if (linkErr) throw new Error(linkErr.message);

      const rows = (links ?? []) as Array<Record<string, unknown>>;
      const primary =
        rows.find((r) => isTruthyPrimary(r.is_primary as boolean | null)) ?? rows[0] ?? null;
      if (!primary) {
        bySlug.set(slug, null);
        continue;
      }
      bySlug.set(slug, {
        id: primary.id ? String(primary.id) : null,
        filter_id: filterId,
        affiliate_url: normField(primary.affiliate_url as string),
        retailer_name: normField(primary.retailer_name as string),
        browser_truth_classification: normField(primary.browser_truth_classification as string),
        browser_truth_notes: normField(primary.browser_truth_notes as string),
        browser_truth_checked_at: normField(primary.browser_truth_checked_at as string),
        is_primary: isTruthyPrimary(primary.is_primary as boolean | null),
        retailer_key: normField(primary.retailer_key as string),
      });
    }

    return { status: "CHECKED", by_slug: bySlug, filter_id_by_slug: filterIdBySlug };
  } catch (err) {
    return {
      status: "UNKNOWN_DB_UNAVAILABLE",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function founderApprovalsCoverBatchASlugsV1(args: {
  rootDir: string;
  nowIso: string;
  readText?: (abs: string) => string;
}): { ok: boolean; blockers: string[]; decision_ids: string[] } {
  const loaded = loadFounderDecisionRowsWithSlugCorrelationV1(args.rootDir);
  const decision_ids: string[] = [];
  const blockers: string[] = [];

  for (const slug of COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1) {
    let found = false;
    for (const entry of loaded) {
      if (entry.row.decision_status !== "approved") continue;
      if (entry.row.allowed_next_scope !== "owner_mutation_approved") continue;
      const gate = founderRegistryRowPassesMutationApprovalGateV1({
        row: entry.row,
        referenceTimeIso: args.nowIso,
        rootDir: args.rootDir,
        readText: args.readText,
      });
      if (!gate.ok) continue;
      if (
        !founderDecisionRowMatchesSlugIdentityV1({
          slug,
          applyPlanRel: `data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-${slug}-v1.json`,
          loaded: entry,
        })
      ) {
        continue;
      }
      found = true;
      decision_ids.push(entry.row.decision_id);
      break;
    }
    if (!found) {
      blockers.push(`founder_owner_mutation_approved_missing_for_slug:${slug}`);
    }
  }
  return { ok: blockers.length === 0, blockers, decision_ids };
}

export async function buildCoverageBatchAFridgeRetailerLinksParityReportV1(args: {
  rootDir: string;
  mode?: "dry_run" | "write";
  now?: () => Date;
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadCoverageBatchASupabasePrimariesV1;
}): Promise<CoverageBatchAParityReportV1> {
  const now = args.now ?? (() => new Date());
  const mode = args.mode ?? "dry_run";
  const csvRows = selectCoverageBatchACsvPrimaryRowsV1({
    rootDir: args.rootDir,
    readText: args.readText,
  });
  const csvBySlug = new Map(csvRows.map((r) => [r.filter_slug, r]));

  const selectionGuard = assertOnlyCoverageBatchASlugsV1(
    COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
  );

  const loadSupabase = args.loadSupabase ?? loadCoverageBatchASupabasePrimariesV1;
  const supabaseLoad = await loadSupabase({
    slugs: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
  });

  const rows: CoverageBatchASlugParityV1[] = [];
  const blockers = [...selectionGuard.blockers];

  if (supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE") {
    for (const slug of COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1) {
      const csv = csvBySlug.get(slug) ?? null;
      rows.push({
        filter_slug: slug,
        status: "UNKNOWN_DB_UNAVAILABLE",
        filter_id: null,
        csv_primary: csv,
        supabase_primary: null,
        field_parity: csv
          ? buildCoverageBatchAFieldParityV1({ csv, supabase: null })
          : [],
        mismatched_fields: csv
          ? [...COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1]
          : [],
        planned_action: "none",
      });
    }
    return {
      contract: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      mode,
      generated_at: now().toISOString(),
      allowed_slugs: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
      supabase_truth_status: "UNKNOWN_DB_UNAVAILABLE",
      supabase_unavailable_reason: supabaseLoad.reason,
      row_count_planned: 0,
      rows,
      all_in_parity: false,
      blockers: [...blockers, `supabase_unavailable:${supabaseLoad.reason}`],
      proven_facts: [
        "PROVEN: Coverage Batch A allowlist is exactly edr3rxd1 and ultrawf.",
        "PROVEN: live filter PDP reads Supabase public.retailer_links, not data/retailer_links.csv.",
      ],
      unknown_facts: ["UNKNOWN: Supabase retailer_links not readable in this environment."],
      recommended_next_action:
        "Configure service-role env and re-run dry-run parity before any scoped write.",
    };
  }

  for (const slug of COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1) {
    const csv = csvBySlug.get(slug) ?? null;
    const filterId = supabaseLoad.filter_id_by_slug.get(slug) ?? null;
    const supabase = supabaseLoad.by_slug.get(slug) ?? null;

    if (!csv) {
      rows.push({
        filter_slug: slug,
        status: "CSV_PRIMARY_MISSING",
        filter_id: filterId,
        csv_primary: null,
        supabase_primary: supabase,
        field_parity: [],
        mismatched_fields: [],
        planned_action: "none",
      });
      blockers.push(`csv_primary_missing:${slug}`);
      continue;
    }
    if (!filterId) {
      rows.push({
        filter_slug: slug,
        status: "SUPABASE_FILTER_MISSING",
        filter_id: null,
        csv_primary: csv,
        supabase_primary: null,
        field_parity: buildCoverageBatchAFieldParityV1({ csv, supabase: null }),
        mismatched_fields: [...COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_COMPARE_FIELDS_V1],
        planned_action: "none",
      });
      blockers.push(`supabase_filter_missing:${slug}`);
      continue;
    }

    const field_parity = buildCoverageBatchAFieldParityV1({ csv, supabase });
    const mismatched_fields = field_parity
      .filter((f) => !f.match)
      .map((f) => f.field);
    const inParity = mismatched_fields.length === 0 && supabase != null;
    rows.push({
      filter_slug: slug,
      status: inParity ? "CSV_AND_SUPABASE_MATCH" : "CSV_HAS_WIN_SUPABASE_MISSING_OR_STALE",
      filter_id: filterId,
      csv_primary: csv,
      supabase_primary: supabase,
      field_parity,
      mismatched_fields,
      planned_action: inParity ? "none" : supabase?.id ? "update" : "insert",
    });
  }

  const row_count_planned = rows.filter((r) => r.planned_action !== "none").length;
  const all_in_parity = rows.every((r) => r.status === "CSV_AND_SUPABASE_MATCH");

  const mutationGate = buildSupabaseMutationGatePreflightV1({
    mode: mode === "write" ? "write" : "dry_run",
    io_capability: resolveIoCapabilityFromEnvV1(),
  });
  const founder = founderApprovalsCoverBatchASlugsV1({
    rootDir: args.rootDir,
    nowIso: now().toISOString(),
    readText: args.readText,
  });

  const writeBlockers: string[] = [];
  if (mode === "write") {
    writeBlockers.push(...blockers);
    writeBlockers.push(...mutationGate.blockers);
    writeBlockers.push(...founder.blockers);
    if (row_count_planned === 0) {
      writeBlockers.push("no_parity_gap_to_apply");
    }
    if (
      rows.some(
        (r) => r.status === "SUPABASE_FILTER_MISSING" || r.status === "CSV_PRIMARY_MISSING",
      )
    ) {
      writeBlockers.push("cannot_write_with_missing_filter_or_csv_primary");
    }
  }

  const mutation_authorized = mode === "write" && writeBlockers.length === 0;

  return {
    contract: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_PARITY_CONTRACT_V1,
    read_only: mode !== "write",
    data_mutation: false,
    mutation_authorized,
    mode,
    generated_at: now().toISOString(),
    allowed_slugs: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    row_count_planned,
    rows,
    all_in_parity,
    blockers: mode === "write" ? Array.from(new Set(writeBlockers)) : blockers,
    proven_facts: [
      "PROVEN: Coverage Batch A allowlist is exactly edr3rxd1 and ultrawf.",
      "PROVEN: live /filter/[slug] reads Supabase public.retailer_links via getFilterBySlug.",
      `PROVEN: csv_sha256=${csvSha256V1(args.rootDir, args.readText)}`,
      `PROVEN: row_count_planned=${String(row_count_planned)} (max 2).`,
      ...(founder.decision_ids.length > 0
        ? [`PROVEN: founder decisions considered: ${founder.decision_ids.join(", ")}.`]
        : []),
    ],
    unknown_facts: all_in_parity
      ? []
      : ["UNKNOWN: live PDP verified links until scoped Supabase write succeeds."],
    recommended_next_action: all_in_parity
      ? "Parity already holds — no scoped write required."
      : mode === "dry_run"
        ? "Review field mismatches, then run scoped write with BUCKPARTS_IO_CAPABILITY=MUTATION and --write."
        : mutation_authorized
          ? "Mutation authorized — apply scoped retailer_links upsert for Batch A only."
          : "Resolve write blockers (MUTATION capability, founder approvals, filter presence) before apply.",
  };
}

export type CoverageBatchAWriteOpV1 = {
  filter_slug: CoverageBatchAFridgeRetailerLinksSlugV1;
  action: "insert" | "update";
  filter_id: string;
  existing_id: string | null;
  desired: CoverageBatchACsvPrimaryRowV1;
};

export function planCoverageBatchAWriteOpsV1(
  report: CoverageBatchAParityReportV1,
): CoverageBatchAWriteOpV1[] {
  const ops: CoverageBatchAWriteOpV1[] = [];
  for (const row of report.rows) {
    if (row.planned_action === "none" || !row.csv_primary) continue;
    const filterId = row.filter_id;
    if (!filterId) continue;
    if (!isAllowedSlug(row.filter_slug)) {
      throw new Error(`refusing write op for non-allowlist slug ${row.filter_slug}`);
    }
    ops.push({
      filter_slug: row.filter_slug,
      action: row.planned_action,
      filter_id: filterId,
      existing_id: row.supabase_primary?.id ?? null,
      desired: row.csv_primary,
    });
  }
  const guard = assertOnlyCoverageBatchASlugsV1(ops.map((o) => o.filter_slug));
  // ops may be a subset when one slug already matches
  for (const op of ops) {
    if (!isAllowedSlug(op.filter_slug)) {
      throw new Error(`refusing write op for non-allowlist slug ${op.filter_slug}`);
    }
  }
  if (ops.length > COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1.length) {
    throw new Error(`refusing write op count ${ops.length}`);
  }
  void guard;
  return ops;
}

export async function applyCoverageBatchAFridgeRetailerLinksWriteV1(args: {
  rootDir: string;
  report: CoverageBatchAParityReportV1;
  now?: () => Date;
}): Promise<{
  applied: boolean;
  inserted: number;
  updated: number;
  closeout_rel: typeof COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CLOSEOUT_REL_V1;
  closeout: Record<string, unknown>;
}> {
  const now = args.now ?? (() => new Date());
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "write",
    io_capability: resolveIoCapabilityFromEnvV1(),
  });
  assertSupabaseMutationAuthorizedV1(preflight);
  if (!args.report.mutation_authorized) {
    throw new Error("COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_MUTATION_NOT_AUTHORIZED");
  }

  const ops = planCoverageBatchAWriteOpsV1(args.report);
  for (const op of ops) {
    if (!isAllowedSlug(op.filter_slug)) {
      throw new Error(`refusing mutation for non-allowlist slug ${op.filter_slug}`);
    }
  }

  const { loadEnv } = await import("./load-env");
  const { getSupabaseAdmin } = await import("./supabase-admin");
  loadEnv();
  const supabase = getSupabaseAdmin();

  let inserted = 0;
  let updated = 0;
  const before = args.report.rows.map((r) => ({
    filter_slug: r.filter_slug,
    status: r.status,
    supabase_primary: r.supabase_primary,
    mismatched_fields: r.mismatched_fields,
  }));

  for (const op of ops) {
    const payload = {
      filter_id: op.filter_id,
      affiliate_url: op.desired.affiliate_url,
      retailer_name: op.desired.retailer_name,
      retailer_key: op.desired.retailer_key,
      is_primary: true,
      browser_truth_classification: op.desired.browser_truth_classification,
      browser_truth_notes: op.desired.browser_truth_notes,
      browser_truth_checked_at: op.desired.browser_truth_checked_at,
      destination_url: op.desired.affiliate_url,
    };

    if (op.action === "update" && op.existing_id) {
      const { error } = await supabase
        .from("retailer_links")
        .update(payload)
        .eq("id", op.existing_id)
        .eq("filter_id", op.filter_id);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      const { error } = await supabase.from("retailer_links").insert(payload);
      if (error) throw new Error(error.message);
      inserted += 1;
    }
  }

  const closeout = {
    contract: "coverage_batch_a_fridge_retailer_links_supabase_parity_closeout_v1",
    read_only: true,
    data_mutation: true,
    mutation_authorized: true,
    generated_at: now().toISOString(),
    allowed_slugs: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_ALLOWED_SLUGS_V1,
    row_count_applied: ops.length,
    inserted,
    updated,
    before,
    ops: ops.map((o) => ({
      filter_slug: o.filter_slug,
      action: o.action,
      filter_id: o.filter_id,
      existing_id: o.existing_id,
      affiliate_url: o.desired.affiliate_url,
    })),
    proven_facts: [
      `PROVEN: applied ${String(ops.length)} retailer_links row(s) for Coverage Batch A only.`,
      `PROVEN: inserted=${String(inserted)} updated=${String(updated)}.`,
      "PROVEN: brands/filters/models/aliases/compatibility_mappings were not written.",
    ],
  };

  const closeoutAbs = path.join(args.rootDir, COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CLOSEOUT_REL_V1);
  mkdirSync(path.dirname(closeoutAbs), { recursive: true });
  writeFileSync(closeoutAbs, `${JSON.stringify(closeout, null, 2)}\n`, "utf8");

  return {
    applied: true,
    inserted,
    updated,
    closeout_rel: COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CLOSEOUT_REL_V1,
    closeout,
  };
}

export function parseCoverageBatchAFridgeRetailerLinksCliArgsV1(argv: readonly string[]): {
  write: boolean;
} {
  return { write: argv.includes("--write") };
}

export function coverageBatchAFridgeRetailerLinksDryRunCommandV1(): string {
  return "npm run buckparts:coverage-batch-a-fridge-retailer-links-supabase-parity";
}

export function coverageBatchAFridgeRetailerLinksWriteCommandV1(): string {
  return "BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:coverage-batch-a-fridge-retailer-links-supabase-parity -- --write";
}

export function writeCoverageBatchAParityReportArtifactV1(args: {
  rootDir: string;
  report: CoverageBatchAParityReportV1;
}): string {
  const rel =
    "data/fridge/batch-production/drafts/coverage-batch-a-fridge-retailer-links-supabase-parity-v1.json";
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  return rel;
}

export function coverageBatchACloseoutExistsV1(rootDir: string): boolean {
  return existsSync(path.join(rootDir, COVERAGE_BATCH_A_FRIDGE_RETAILER_LINKS_CLOSEOUT_REL_V1));
}
