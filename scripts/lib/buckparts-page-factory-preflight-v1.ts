/**
 * Read-only Page Factory preflight v0.1 — repo-provable gates only.
 * Does not mutate CSV, Supabase, quarantine, buyer-path, or /go logic.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  getFridgeModelReviewOverride,
  isFridgeModelUnderOwnerReview,
} from "@/lib/fridge/fridge-model-review-overrides";
import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";
import {
  buyLinkGateFailureKind,
  filterRealBuyRetailerLinks,
} from "@/lib/retailers/launch-buy-links";

import { legacyFilterSlugsMatchOfficialTokenV1 } from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

export const BUCKPARTS_PAGE_FACTORY_PREFLIGHT_CONTRACT_V1 =
  "buckparts_page_factory_preflight_v1" as const;

export const PAGE_FACTORY_TARGETS_CSV_REL_V1 =
  "data/fridge/batch-production/page-factory-targets-v1.csv" as const;

export type PageFactoryPreflightGateStatusV1 = "PASS" | "BLOCKED" | "UNKNOWN" | "WARN";

export type PageFactoryPreflightGateV1 = {
  gate_id: string;
  status: PageFactoryPreflightGateStatusV1;
  blockers: string[];
  proof_paths_read: string[];
  observed?: Record<string, unknown>;
};

export type PageFactoryTargetV1 = {
  fridge_slug: string;
  expected_filter_slugs: string[];
  forbidden_filter_slugs: string[];
  official_marketing_token: string;
  draft_md_relpath: string;
  evidence_json_relpath: string;
};

export type PageFactoryPreflightReportV1 = {
  contract: typeof BUCKPARTS_PAGE_FACTORY_PREFLIGHT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  generated_at: string;
  fridge_slug: string;
  registry_source: string;
  preflight_status: "READY_FOR_OWNER_REVIEW" | "BLOCKED" | "UNKNOWN";
  mutation_authorized: false;
  gates: PageFactoryPreflightGateV1[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildPageFactoryPreflightArgsV1 = {
  rootDir: string;
  fridgeSlug: string;
  registryRelPath?: string;
  checkSupabase?: boolean;
  baseUrl?: string | null;
  liveBaseUrl?: string | null;
  now?: () => Date;
  loadSupabaseCompat?: (
    fridgeSlug: string,
    expectedFilterSlugs: string[],
  ) => Promise<SupabaseCompatLoadResultV1>;
};

export type SupabaseCompatLoadResultV1 =
  | { status: "CHECKED"; supabase_filter_slugs: string[] }
  | { status: "UNKNOWN_DB_UNAVAILABLE"; reason: string };

type FridgeModelRow = { brand_slug: string; slug: string };
type MappingRow = { fridge_slug: string; filter_slug: string };
type FilterRow = { slug: string; oem_part_number?: string };
type RetailerRow = {
  filter_slug: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
  browser_truth_buyable_subtype?: string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function splitPipeList(value: string): string[] {
  return value
    .split("|")
    .map((s) => normalizeSlug(s))
    .filter(Boolean);
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  const abs = path.join(rootDir, relPath);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function gate(
  gate_id: string,
  status: PageFactoryPreflightGateStatusV1,
  blockers: string[],
  proof_paths_read: string[],
  observed?: Record<string, unknown>,
): PageFactoryPreflightGateV1 {
  return { gate_id, status, blockers, proof_paths_read, ...(observed ? { observed } : {}) };
}

export function loadPageFactoryTargetFromRegistryV1(args: {
  rootDir: string;
  fridgeSlug: string;
  registryRelPath?: string;
}): PageFactoryTargetV1 {
  const registryRel = args.registryRelPath ?? PAGE_FACTORY_TARGETS_CSV_REL_V1;
  const rows = readCsv<{
    fridge_slug: string;
    expected_filter_slugs: string;
    forbidden_filter_slugs: string;
    official_marketing_token: string;
    draft_md_relpath: string;
    evidence_json_relpath: string;
  }>(args.rootDir, registryRel);

  const slug = normalizeSlug(args.fridgeSlug);
  const row = rows.find((r) => normalizeSlug(r.fridge_slug) === slug);
  if (!row) {
    throw new Error(`page_factory_target_not_found: ${args.fridgeSlug}`);
  }

  return {
    fridge_slug: slug,
    expected_filter_slugs: splitPipeList(row.expected_filter_slugs),
    forbidden_filter_slugs: splitPipeList(row.forbidden_filter_slugs),
    official_marketing_token: row.official_marketing_token.trim(),
    draft_md_relpath: row.draft_md_relpath.trim(),
    evidence_json_relpath: row.evidence_json_relpath.trim(),
  };
}

function compatSlugsForModel(rootDir: string, fridgeSlug: string): string[] {
  const mappings = readCsv<MappingRow>(rootDir, "data/compatibility_mappings.csv");
  return mappings
    .filter((r) => normalizeSlug(r.fridge_slug) === fridgeSlug)
    .map((r) => normalizeSlug(r.filter_slug))
    .sort();
}

function evaluateRepoEvidenceReady(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageFactoryPreflightGateV1 {
  const paths = [
    args.target.draft_md_relpath,
    args.target.evidence_json_relpath,
    "data/fridge_models.csv",
  ];
  const blockers: string[] = [];

  for (const rel of [args.target.draft_md_relpath, args.target.evidence_json_relpath]) {
    if (!existsSync(path.join(args.rootDir, rel))) {
      blockers.push(`missing file: ${rel}`);
    }
  }

  const fridgeModels = readCsv<FridgeModelRow>(args.rootDir, "data/fridge_models.csv");
  const modelRow = fridgeModels.find((r) => normalizeSlug(r.slug) === args.target.fridge_slug);
  if (!modelRow) {
    blockers.push(`missing fridge_models.csv row for ${args.target.fridge_slug}`);
  }

  if (blockers.length === 0) {
    const raw = readFileSync(path.join(args.rootDir, args.target.evidence_json_relpath), "utf8");
    const record = JSON.parse(raw) as Partial<RefrigeratorManualEvidenceRecord>;
    const validation = validateRefrigeratorManualEvidencePublicReady(record);
    if (!validation.ok) {
      blockers.push(...validation.errors.map((e) => `evidence: ${e}`));
    }
    if (normalizeSlug(record.fridge_model_slug ?? "") !== args.target.fridge_slug) {
      blockers.push(
        `evidence fridge_model_slug mismatch: expected ${args.target.fridge_slug}`,
      );
    }
  }

  return gate(
    "repo_evidence_ready",
    blockers.length === 0 ? "PASS" : "BLOCKED",
    blockers,
    paths,
    modelRow ? { brand_slug: modelRow.brand_slug.trim().toLowerCase() } : undefined,
  );
}

function evaluateCompatCsvExactMapping(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageFactoryPreflightGateV1 {
  const proof = ["data/compatibility_mappings.csv", "data/filters.csv"];
  const actual = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  const expected = [...args.target.expected_filter_slugs].sort();
  const blockers: string[] = [];

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    blockers.push(`csv compat slugs ${JSON.stringify(actual)} !== expected ${JSON.stringify(expected)}`);
  }

  const filters = readCsv<FilterRow>(args.rootDir, "data/filters.csv");
  const filterSlugs = new Set(filters.map((r) => normalizeSlug(r.slug)));
  for (const slug of expected) {
    if (!filterSlugs.has(slug)) {
      blockers.push(`expected filter slug missing from filters.csv: ${slug}`);
    }
  }

  return gate(
    "compat_csv_exact_mapping",
    blockers.length === 0 ? "PASS" : "BLOCKED",
    blockers,
    proof,
    { actual_filter_slugs: actual, expected_filter_slugs: expected },
  );
}

function evaluateCompatCsvForbiddenAbsent(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageFactoryPreflightGateV1 {
  const actual = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  const blockers = args.target.forbidden_filter_slugs
    .filter((slug) => actual.includes(slug))
    .map((slug) => `forbidden filter still mapped in CSV: ${slug}`);

  return gate(
    "compat_csv_forbidden_absent",
    blockers.length === 0 ? "PASS" : "BLOCKED",
    blockers,
    ["data/compatibility_mappings.csv"],
    { forbidden_filter_slugs: args.target.forbidden_filter_slugs, actual_filter_slugs: actual },
  );
}

function evaluateExactTokenAlignment(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
  brandSlug: string | null;
}): PageFactoryPreflightGateV1 {
  const proof = ["data/filters.csv", PAGE_FACTORY_TARGETS_CSV_REL_V1];
  const blockers: string[] = [];

  if (!args.target.official_marketing_token) {
    blockers.push("registry official_marketing_token is empty");
  }
  if (!args.brandSlug) {
    blockers.push("brand_slug unavailable from fridge_models.csv");
  }

  const filters = readCsv<FilterRow>(args.rootDir, "data/filters.csv");
  const filterOemBySlug = new Map(
    filters.map((r) => [normalizeSlug(r.slug), (r.oem_part_number ?? r.slug).trim()] as const),
  );

  const legacySlugs = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  let aligned = false;
  if (args.brandSlug && args.target.official_marketing_token) {
    aligned = legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: args.brandSlug,
      officialToken: args.target.official_marketing_token,
      legacyFilterSlugs: legacySlugs,
      filterOemBySlug,
    });
    if (!aligned) {
      blockers.push(
        `legacy filter slugs ${JSON.stringify(legacySlugs)} do not align with official_marketing_token ${args.target.official_marketing_token}`,
      );
    }
  }

  return gate(
    "exact_token_alignment",
    blockers.length === 0 ? "PASS" : "BLOCKED",
    blockers,
    proof,
    {
      brand_slug: args.brandSlug,
      official_marketing_token: args.target.official_marketing_token,
      legacy_filter_slugs: legacySlugs,
      aligned,
    },
  );
}

function evaluateQuarantineStateObserved(args: {
  target: PageFactoryTargetV1;
}): PageFactoryPreflightGateV1 {
  const override = getFridgeModelReviewOverride(args.target.fridge_slug);
  const underReview = isFridgeModelUnderOwnerReview(args.target.fridge_slug);

  return gate(
    "quarantine_state_observed",
    "PASS",
    [],
    ["src/lib/fridge/fridge-model-review-overrides.ts"],
    {
      under_owner_review: underReview,
      override_present: override !== null,
      override_reason: override?.reason ?? null,
    },
  );
}

function isPrimary(value: string | undefined): boolean {
  const n = (value ?? "").trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

function evaluateRetailerLinkCsvGatesObserved(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageFactoryPreflightGateV1 {
  const proof = ["data/retailer_links.csv"];
  const links = readCsv<RetailerRow>(args.rootDir, "data/retailer_links.csv");
  const byFilter = new Map<string, RetailerRow[]>();
  for (const row of links) {
    const slug = normalizeSlug(row.filter_slug);
    const list = byFilter.get(slug) ?? [];
    list.push(row);
    byFilter.set(slug, list);
  }

  const observations: Record<string, unknown>[] = [];
  const blockers: string[] = [];

  for (const filterSlug of args.target.expected_filter_slugs) {
    const rows = byFilter.get(filterSlug) ?? [];
    if (rows.length === 0) {
      blockers.push(`no retailer_links.csv rows for expected filter ${filterSlug}`);
      observations.push({ filter_slug: filterSlug, row_count: 0 });
      continue;
    }

    const primary = rows.find((r) => isPrimary(r.is_primary)) ?? rows[0] ?? null;
    const realBuyRows = filterRealBuyRetailerLinks(rows);
    const primaryGateFailure = primary
      ? buyLinkGateFailureKind({
          retailer_key: primary.retailer_key,
          affiliate_url: primary.affiliate_url ?? "",
          browser_truth_classification: primary.browser_truth_classification,
          browser_truth_buyable_subtype: primary.browser_truth_buyable_subtype,
        })
      : "missing_primary";

    observations.push({
      filter_slug: filterSlug,
      row_count: rows.length,
      primary_retailer_key: primary?.retailer_key ?? null,
      primary_gate_failure_kind: primaryGateFailure,
      filter_real_buy_row_count: realBuyRows.length,
      has_direct_buyable_anywhere: rows.some(
        (r) => (r.browser_truth_classification ?? "").trim() === "direct_buyable",
      ),
    });
  }

  const status: PageFactoryPreflightGateStatusV1 =
    blockers.length > 0 ? "BLOCKED" : observations.some((o) => o.primary_gate_failure_kind) ? "WARN" : "PASS";

  return gate(
    "retailer_link_csv_gates_observed",
    blockers.length > 0 ? "BLOCKED" : status === "WARN" ? "WARN" : "PASS",
    blockers,
    proof,
    { filters: observations },
  );
}

export async function tryLoadSupabaseCompatForModelV1(
  fridgeSlug: string,
  _expectedFilterSlugs: string[],
): Promise<SupabaseCompatLoadResultV1> {
  try {
    const { loadEnv } = await import("./load-env");
    const { getSupabaseAdmin } = await import("./supabase-admin");
    loadEnv();
    const supabase = getSupabaseAdmin();
    const slug = normalizeSlug(fridgeSlug);

    const { data: fridge, error: fridgeErr } = await supabase
      .from("fridge_models")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (fridgeErr) throw fridgeErr;
    if (!fridge) {
      return {
        status: "UNKNOWN_DB_UNAVAILABLE",
        reason: `fridge_models row not found for slug ${slug}`,
      };
    }

    const fridgeModelId = (fridge as { id: string }).id;
    const { data: maps, error: mapErr } = await supabase
      .from("compatibility_mappings")
      .select("filter_id")
      .eq("fridge_model_id", fridgeModelId);
    if (mapErr) throw mapErr;

    const filterIds = Array.from(
      new Set((maps ?? []).map((m) => (m as { filter_id: string }).filter_id)),
    );
    if (filterIds.length === 0) {
      return { status: "CHECKED", supabase_filter_slugs: [] };
    }

    const { data: filters, error: filterErr } = await supabase
      .from("filters")
      .select("id, slug")
      .in("id", filterIds);
    if (filterErr) throw filterErr;

    const supabase_filter_slugs = (filters ?? [])
      .map((f) => normalizeSlug((f as { slug: string }).slug))
      .filter(Boolean)
      .sort();

    return { status: "CHECKED", supabase_filter_slugs };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { status: "UNKNOWN_DB_UNAVAILABLE", reason };
  }
}

async function evaluateSupabaseCompatParity(args: {
  target: PageFactoryTargetV1;
  checkSupabase: boolean;
  loadSupabaseCompat?: BuildPageFactoryPreflightArgsV1["loadSupabaseCompat"];
}): Promise<PageFactoryPreflightGateV1> {
  if (!args.checkSupabase) {
    return gate(
      "supabase_compat_parity",
      "UNKNOWN",
      [],
      [],
      { check_supabase: false, reason: "pass --check-supabase to evaluate" },
    );
  }

  const loader = args.loadSupabaseCompat ?? tryLoadSupabaseCompatForModelV1;
  const result = await loader(args.target.fridge_slug, args.target.expected_filter_slugs);
  const expected = [...args.target.expected_filter_slugs].sort();

  if (result.status === "UNKNOWN_DB_UNAVAILABLE") {
    return gate(
      "supabase_compat_parity",
      "UNKNOWN",
      [result.reason],
      ["scripts/lib/load-env.ts", "scripts/lib/supabase-admin.ts"],
      { check_supabase: true, db_status: result.status },
    );
  }

  const actual = [...result.supabase_filter_slugs].sort();
  const blockers: string[] = [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    blockers.push(
      `supabase compat slugs ${JSON.stringify(actual)} !== expected ${JSON.stringify(expected)}`,
    );
  }

  return gate(
    "supabase_compat_parity",
    blockers.length === 0 ? "PASS" : "BLOCKED",
    blockers,
    ["data/compatibility_mappings.csv"],
    {
      check_supabase: true,
      expected_filter_slugs: expected,
      supabase_filter_slugs: actual,
    },
  );
}

function evaluatePageProofGate(args: {
  gate_id: "local_page_proof" | "live_page_proof";
  baseUrl: string | null | undefined;
}): PageFactoryPreflightGateV1 {
  if (!args.baseUrl) {
    return gate(
      args.gate_id,
      "UNKNOWN",
      [],
      [],
      {
        reason:
          args.gate_id === "local_page_proof"
            ? "pass --base-url to evaluate"
            : "pass --live-base-url to evaluate",
      },
    );
  }

  return gate(
    args.gate_id,
    "UNKNOWN",
    [],
    [],
    {
      base_url: args.baseUrl,
      reason: "v0.1: page curl proof not implemented yet",
    },
  );
}

function derivePreflightStatus(gates: PageFactoryPreflightGateV1[]): PageFactoryPreflightReportV1["preflight_status"] {
  if (gates.some((g) => g.status === "BLOCKED")) return "BLOCKED";
  const checkedUnknown = gates.filter(
    (g) =>
      g.status === "UNKNOWN" &&
      (g.gate_id === "supabase_compat_parity" ||
        g.gate_id === "local_page_proof" ||
        g.gate_id === "live_page_proof") &&
      (g.observed?.check_supabase === true ||
        g.observed?.base_url != null),
  );
  if (checkedUnknown.length > 0) return "UNKNOWN";
  return "READY_FOR_OWNER_REVIEW";
}

export async function buildPageFactoryPreflightReportV1(
  args: BuildPageFactoryPreflightArgsV1,
): Promise<PageFactoryPreflightReportV1> {
  const now = args.now ?? (() => new Date());
  const registryRel = args.registryRelPath ?? PAGE_FACTORY_TARGETS_CSV_REL_V1;
  const target = loadPageFactoryTargetFromRegistryV1({
    rootDir: args.rootDir,
    fridgeSlug: args.fridgeSlug,
    registryRelPath: registryRel,
  });

  const evidenceGate = evaluateRepoEvidenceReady({ rootDir: args.rootDir, target });
  const brandSlug =
    typeof evidenceGate.observed?.brand_slug === "string"
      ? evidenceGate.observed.brand_slug
      : null;

  const gates: PageFactoryPreflightGateV1[] = [
    evidenceGate,
    evaluateCompatCsvExactMapping({ rootDir: args.rootDir, target }),
    evaluateCompatCsvForbiddenAbsent({ rootDir: args.rootDir, target }),
    evaluateExactTokenAlignment({ rootDir: args.rootDir, target, brandSlug }),
    evaluateQuarantineStateObserved({ target }),
    evaluateRetailerLinkCsvGatesObserved({ rootDir: args.rootDir, target }),
    await evaluateSupabaseCompatParity({
      target,
      checkSupabase: args.checkSupabase === true,
      loadSupabaseCompat: args.loadSupabaseCompat,
    }),
    evaluatePageProofGate({ gate_id: "local_page_proof", baseUrl: args.baseUrl }),
    evaluatePageProofGate({ gate_id: "live_page_proof", baseUrl: args.liveBaseUrl }),
  ];

  const exact_repo_paths_read = Array.from(
    new Set([
      registryRel,
      "data/compatibility_mappings.csv",
      "data/filters.csv",
      "data/fridge_models.csv",
      "data/retailer_links.csv",
      target.draft_md_relpath,
      target.evidence_json_relpath,
      "src/lib/fridge/fridge-model-review-overrides.ts",
      ...gates.flatMap((g) => g.proof_paths_read),
    ]),
  ).sort();

  const proven_facts = [
    `PROVEN: read-only preflight for ${target.fridge_slug} from ${registryRel}.`,
    `PROVEN: mutation_blocked_until_owner_approval=true; mutation_authorized=false.`,
  ];
  const unknown_facts = gates
    .filter((g) => g.status === "UNKNOWN")
    .map((g) => `UNKNOWN: ${g.gate_id}${g.observed?.reason ? ` — ${String(g.observed.reason)}` : ""}`);

  return {
    contract: BUCKPARTS_PAGE_FACTORY_PREFLIGHT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    generated_at: now().toISOString(),
    fridge_slug: target.fridge_slug,
    registry_source: registryRel,
    preflight_status: derivePreflightStatus(gates),
    mutation_authorized: false,
    gates,
    exact_repo_paths_read,
    proven_facts,
    unknown_facts,
  };
}
