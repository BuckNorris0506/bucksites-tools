/**
 * Read-only Samsung HAF-QIN wildcard expansion review v1.
 * Classifies existing fridge_models.csv Samsung rows matched by HyperAgent family patterns.
 * No CSV, Supabase, or catalog mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { legacyFilterSlugsMatchOfficialTokenV1 } from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

export const SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1 =
  "samsung_haf_qin_wildcard_expansion_review_v1" as const;

export const HAF_QIN_CANDIDATES_CSV_REL_V1 =
  "data/fridge/batch-production/hyperagent/haf-qin-candidates-v1.csv" as const;

export const HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/hyperagent/haf-qin-wildcard-expansion-review-v1.json" as const;

export const HAF_QIN_WILDCARD_EXPANSION_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/samsung-haf-qin-wildcard-expansion-review-v1.md" as const;

export const HAF_CIN_CANONICAL_FILTER_SLUGS_V1 = ["da29-00020b", "da29-00012b"] as const;

export const HAF_QIN_CANONICAL_FILTER_SLUG_V1 = "da97-17376b" as const;

export const OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1 = "HAF-QIN" as const;

export type WildcardExpansionReviewGateStatusV1 = "PASS" | "BLOCKED" | "UNKNOWN" | "WARN";

export type WildcardExpansionReviewGateV1 = {
  gate_id: string;
  status: WildcardExpansionReviewGateStatusV1;
  blockers: string[];
  proof_paths_read: string[];
  observed?: Record<string, unknown>;
};

export type WildcardExpansionReviewStatusV1 =
  | "READY_FOR_OWNER_REVIEW"
  | "BLOCKED_INPUT"
  | "UNKNOWN";

export type PatternBucketV1 = "WILDCARD_UNSUPPORTED" | "NO_CATALOG_MATCH" | "HAS_CATALOG_MATCH";

export type CatalogSlugBucketV1 =
  | "COVERED"
  | "CANDIDATE_REVIEW"
  | "REVIEW_DA29_CONFLICT"
  | "BLOCKED_HAF_CIN_CANONICAL";

export type CatalogSlugWarningV1 = "DA29_COMPAT_PRESENT";

export type HyperAgentCandidateRowV1 = {
  model_number: string;
  samsung_source_url: string;
  source_type: string;
  identifier_found: string;
  evidence_summary: string;
  confusion_identifier_found: string;
  classification: string;
  notes: string;
};

export type PatternRowV1 = {
  model_number_pattern: string;
  pattern_bucket: PatternBucketV1;
  expansion_rule: "suffix_double_star" | "unsupported";
  matched_catalog_slugs: string[];
  hyperagent_classification: string;
  source_type: string;
};

export type CatalogSlugRowV1 = {
  fridge_slug: string;
  model_number: string;
  bucket: CatalogSlugBucketV1;
  compat_filter_slugs: string[];
  matched_patterns: string[];
  page_factory_target: boolean;
  warnings: CatalogSlugWarningV1[];
  legacy_slugs_match_haf_qin_family: boolean;
};

export type WildcardExpansionInspectSummaryV1 = {
  candidate_pattern_count: number;
  unique_model_number_count: number;
  supported_pattern_count: number;
  wildcard_unsupported_pattern_count: number;
  no_catalog_match_pattern_count: number;
  has_catalog_match_pattern_count: number;
  matched_catalog_slug_count: number;
  catalog_slug_bucket_counts: Record<CatalogSlugBucketV1, number>;
  pattern_bucket_counts: Record<"WILDCARD_UNSUPPORTED" | "NO_CATALOG_MATCH" | "HAS_CATALOG_MATCH", number>;
  covered_with_da29_warning_count: number;
};

export type SamsungHafQinWildcardExpansionReviewReportV1 = {
  contract: typeof SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  catalog_row_creation_allowed: false;
  generated_at: string;
  review_status: WildcardExpansionReviewStatusV1;
  gates: WildcardExpansionReviewGateV1[];
  exact_repo_paths_read: string[];
  wildcard_expansion_rules_v1: {
    suffix_double_star_enabled: true;
    inline_star_supported: false;
    catalog_row_creation: false;
  };
  inspect_summary: WildcardExpansionInspectSummaryV1;
  pattern_rows: PatternRowV1[];
  catalog_slug_rows: CatalogSlugRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildSamsungHafQinWildcardExpansionReviewArgsV1 = {
  rootDir: string;
  candidatesCsvRelPath?: string;
  now?: () => Date;
};

type SamsungCatalogEntryV1 = {
  fridge_slug: string;
  model_number: string;
  model_number_normalized: string;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeModelNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
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
  status: WildcardExpansionReviewGateStatusV1,
  blockers: string[],
  proof_paths_read: string[],
  observed?: Record<string, unknown>,
): WildcardExpansionReviewGateV1 {
  return { gate_id, status, blockers, proof_paths_read, ...(observed ? { observed } : {}) };
}

export function isSupportedSuffixDoubleStarPatternV1(pattern: string): boolean {
  const trimmed = pattern.trim();
  return trimmed.endsWith("**") && !trimmed.slice(0, -2).includes("*");
}

export function suffixDoubleStarRegexV1(pattern: string): RegExp | null {
  if (!isSupportedSuffixDoubleStarPatternV1(pattern)) return null;
  const base = normalizeModelNumber(pattern.slice(0, -2));
  if (!base) return null;
  return new RegExp(`^${base}[A-Z0-9]{2}$`);
}

export function matchCatalogSlugsForPatternV1(
  pattern: string,
  catalog: SamsungCatalogEntryV1[],
): string[] {
  const rx = suffixDoubleStarRegexV1(pattern);
  if (!rx) return [];
  const hits = catalog.filter((entry) => rx.test(entry.model_number_normalized)).map((e) => e.fridge_slug);
  return Array.from(new Set(hits)).sort();
}

function classifyCatalogSlugBucketV1(args: {
  compatFilterSlugs: string[];
}): { bucket: CatalogSlugBucketV1; warnings: CatalogSlugWarningV1[] } {
  const slugs = args.compatFilterSlugs.map(normalizeSlug);
  const hasHafCinCanonical = HAF_CIN_CANONICAL_FILTER_SLUGS_V1.some((slug) => slugs.includes(slug));
  if (hasHafCinCanonical) {
    return { bucket: "BLOCKED_HAF_CIN_CANONICAL", warnings: [] };
  }

  const hasCanonicalHafQin = slugs.includes(HAF_QIN_CANONICAL_FILTER_SLUG_V1);
  const da29Slugs = slugs.filter((slug) => slug.startsWith("da29-"));

  if (hasCanonicalHafQin) {
    const warnings: CatalogSlugWarningV1[] = da29Slugs.length > 0 ? ["DA29_COMPAT_PRESENT"] : [];
    return { bucket: "COVERED", warnings };
  }

  if (da29Slugs.length > 0) {
    return { bucket: "REVIEW_DA29_CONFLICT", warnings: [] };
  }

  return { bucket: "CANDIDATE_REVIEW", warnings: [] };
}

function loadSamsungCatalogV1(rootDir: string): SamsungCatalogEntryV1[] {
  const rows = readCsv<{ brand_slug: string; slug: string; model_number: string }>(
    rootDir,
    "data/fridge_models.csv",
  );
  const aliasRows = readCsv<{ fridge_slug: string; alias: string }>(
    rootDir,
    "data/fridge_model_aliases.csv",
  );

  const bySlug = new Map<string, SamsungCatalogEntryV1>();
  for (const row of rows) {
    if (row.brand_slug.trim().toLowerCase() !== "samsung") continue;
    const fridge_slug = normalizeSlug(row.slug);
    const model_number = row.model_number.trim();
    bySlug.set(fridge_slug, {
      fridge_slug,
      model_number,
      model_number_normalized: normalizeModelNumber(model_number),
    });
  }

  for (const alias of aliasRows) {
    const fridge_slug = normalizeSlug(alias.fridge_slug);
    const existing = bySlug.get(fridge_slug);
    if (!existing) continue;
    const aliasNorm = normalizeModelNumber(alias.alias);
    if (aliasNorm && aliasNorm !== existing.model_number_normalized) {
      // Alias confirms same slug; normalized alias does not create a separate catalog row.
      continue;
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));
}

function loadCompatByFridgeSlugV1(rootDir: string): Map<string, string[]> {
  const rows = readCsv<{ fridge_slug: string; filter_slug: string }>(
    rootDir,
    "data/compatibility_mappings.csv",
  );
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const fridgeSlug = normalizeSlug(row.fridge_slug);
    if (!fridgeSlug.startsWith("samsung-")) continue;
    const filterSlug = normalizeSlug(row.filter_slug);
    const set = map.get(fridgeSlug) ?? new Set<string>();
    set.add(filterSlug);
    map.set(fridgeSlug, set);
  }
  const out = new Map<string, string[]>();
  for (const [slug, set] of Array.from(map)) {
    out.set(slug, Array.from(set).sort());
  }
  return out;
}

function loadFilterOemBySlugV1(rootDir: string): Map<string, string> {
  const rows = readCsv<{ slug: string; oem_part_number?: string }>(rootDir, "data/filters.csv");
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(normalizeSlug(row.slug), (row.oem_part_number ?? row.slug).trim());
  }
  return map;
}

function loadPageFactoryTargetSlugsV1(rootDir: string): Set<string> {
  const rows = readCsv<{ fridge_slug: string }>(
    rootDir,
    "data/fridge/batch-production/page-factory-targets-v1.csv",
  );
  return new Set(rows.map((row) => normalizeSlug(row.fridge_slug)));
}

function emptyCatalogBucketCountsV1(): Record<CatalogSlugBucketV1, number> {
  return {
    COVERED: 0,
    CANDIDATE_REVIEW: 0,
    REVIEW_DA29_CONFLICT: 0,
    BLOCKED_HAF_CIN_CANONICAL: 0,
  };
}

export function buildSamsungHafQinWildcardExpansionReviewV1(
  args: BuildSamsungHafQinWildcardExpansionReviewArgsV1,
): SamsungHafQinWildcardExpansionReviewReportV1 {
  const rootDir = args.rootDir;
  const candidatesRel = args.candidatesCsvRelPath ?? HAF_QIN_CANDIDATES_CSV_REL_V1;
  const generatedAt = (args.now ?? (() => new Date()))().toISOString();

  const exactRepoPathsRead = [
    candidatesRel,
    "data/fridge_models.csv",
    "data/fridge_model_aliases.csv",
    "data/compatibility_mappings.csv",
    "data/filters.csv",
    "data/fridge/batch-production/page-factory-targets-v1.csv",
    "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
  ];

  const gates: WildcardExpansionReviewGateV1[] = [];
  const blockers: string[] = [];

  const candidatesAbs = path.join(rootDir, candidatesRel);
  if (!existsSync(candidatesAbs)) {
    blockers.push(`missing file: ${candidatesRel}`);
    gates.push(
      gate("hyperagent_candidates_csv_readable", "BLOCKED", blockers, [candidatesRel], {
        candidate_row_count: 0,
      }),
    );
    return {
      contract: SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_blocked_until_owner_approval: true,
      mutation_authorized: false,
      catalog_row_creation_allowed: false,
      generated_at: generatedAt,
      review_status: "BLOCKED_INPUT",
      gates,
      exact_repo_paths_read: exactRepoPathsRead,
      wildcard_expansion_rules_v1: {
        suffix_double_star_enabled: true,
        inline_star_supported: false,
        catalog_row_creation: false,
      },
      inspect_summary: {
        candidate_pattern_count: 0,
        unique_model_number_count: 0,
        supported_pattern_count: 0,
        wildcard_unsupported_pattern_count: 0,
        no_catalog_match_pattern_count: 0,
        has_catalog_match_pattern_count: 0,
        matched_catalog_slug_count: 0,
        catalog_slug_bucket_counts: emptyCatalogBucketCountsV1(),
        pattern_bucket_counts: {
          WILDCARD_UNSUPPORTED: 0,
          NO_CATALOG_MATCH: 0,
          HAS_CATALOG_MATCH: 0,
        },
        covered_with_da29_warning_count: 0,
      },
      pattern_rows: [],
      catalog_slug_rows: [],
      proven_facts: [],
      unknown_facts: ["hyperagent_candidates_csv_missing"],
    };
  }

  const candidateRows = readCsv<HyperAgentCandidateRowV1>(rootDir, candidatesRel);
  gates.push(
    gate("hyperagent_candidates_csv_readable", "PASS", [], [candidatesRel], {
      candidate_row_count: candidateRows.length,
    }),
  );

  const catalog = loadSamsungCatalogV1(rootDir);
  if (catalog.length === 0) {
    blockers.push("no samsung rows in fridge_models.csv");
    gates.push(
      gate("samsung_catalog_loaded", "BLOCKED", blockers, ["data/fridge_models.csv"], {
        samsung_catalog_count: 0,
      }),
    );
  } else {
    gates.push(
      gate("samsung_catalog_loaded", "PASS", [], ["data/fridge_models.csv"], {
        samsung_catalog_count: catalog.length,
      }),
    );
  }

  const compatBySlug = loadCompatByFridgeSlugV1(rootDir);
  gates.push(
    gate("compat_mappings_loaded", "PASS", [], ["data/compatibility_mappings.csv"], {
      samsung_compat_slug_count: compatBySlug.size,
    }),
  );

  gates.push(
    gate("fridge_aliases_loaded", "PASS", [], ["data/fridge_model_aliases.csv"]),
  );

  const filterOemBySlug = loadFilterOemBySlugV1(rootDir);
  gates.push(gate("samsung_cross_reference_loaded", "PASS", [], ["data/filters.csv"]));

  gates.push(
    gate("wildcard_expansion_rules_applied", "PASS", [], [candidatesRel], {
      suffix_double_star_enabled: true,
      inline_star_supported: false,
    }),
  );

  gates.push(
    gate("catalog_mutation_disabled", "PASS", [], exactRepoPathsRead, {
      catalog_row_creation_allowed: false,
    }),
  );

  const pageFactoryTargets = loadPageFactoryTargetSlugsV1(rootDir);
  const catalogBySlug = new Map(catalog.map((entry) => [entry.fridge_slug, entry]));

  const patternRows: PatternRowV1[] = [];
  const slugToPatterns = new Map<string, Set<string>>();

  for (const row of candidateRows) {
    const pattern = row.model_number.trim();
    if (!isSupportedSuffixDoubleStarPatternV1(pattern)) {
      patternRows.push({
        model_number_pattern: pattern,
        pattern_bucket: "WILDCARD_UNSUPPORTED",
        expansion_rule: "unsupported",
        matched_catalog_slugs: [],
        hyperagent_classification: row.classification,
        source_type: row.source_type,
      });
      continue;
    }

    const matched = matchCatalogSlugsForPatternV1(pattern, catalog);
    for (const slug of matched) {
      const set = slugToPatterns.get(slug) ?? new Set<string>();
      set.add(pattern);
      slugToPatterns.set(slug, set);
    }

    patternRows.push({
      model_number_pattern: pattern,
      pattern_bucket: matched.length > 0 ? "HAS_CATALOG_MATCH" : "NO_CATALOG_MATCH",
      expansion_rule: "suffix_double_star",
      matched_catalog_slugs: matched,
      hyperagent_classification: row.classification,
      source_type: row.source_type,
    });
  }

  const catalogSlugRows: CatalogSlugRowV1[] = [];
  const catalogBucketCounts = emptyCatalogBucketCountsV1();

  for (const [fridge_slug, patterns] of Array.from(slugToPatterns.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const entry = catalogBySlug.get(fridge_slug);
    if (!entry) continue;
    const compatFilterSlugs = compatBySlug.get(fridge_slug) ?? [];
    const { bucket, warnings } = classifyCatalogSlugBucketV1({ compatFilterSlugs });
    catalogBucketCounts[bucket] += 1;

    catalogSlugRows.push({
      fridge_slug,
      model_number: entry.model_number,
      bucket,
      compat_filter_slugs: compatFilterSlugs,
      matched_patterns: Array.from(patterns).sort(),
      page_factory_target: pageFactoryTargets.has(fridge_slug),
      warnings,
      legacy_slugs_match_haf_qin_family: legacyFilterSlugsMatchOfficialTokenV1({
        brandSlug: "samsung",
        officialToken: OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
        legacyFilterSlugs: compatFilterSlugs,
        filterOemBySlug,
      }),
    });
  }

  const uniqueModelNumbers = new Set(candidateRows.map((row) => row.model_number.trim()));
  const patternBucketCounts = {
    WILDCARD_UNSUPPORTED: patternRows.filter((row) => row.pattern_bucket === "WILDCARD_UNSUPPORTED")
      .length,
    NO_CATALOG_MATCH: patternRows.filter((row) => row.pattern_bucket === "NO_CATALOG_MATCH").length,
    HAS_CATALOG_MATCH: patternRows.filter((row) => row.pattern_bucket === "HAS_CATALOG_MATCH")
      .length,
  };

  const inspectSummary: WildcardExpansionInspectSummaryV1 = {
    candidate_pattern_count: candidateRows.length,
    unique_model_number_count: uniqueModelNumbers.size,
    supported_pattern_count: patternRows.filter((row) => row.expansion_rule === "suffix_double_star")
      .length,
    wildcard_unsupported_pattern_count: patternBucketCounts.WILDCARD_UNSUPPORTED,
    no_catalog_match_pattern_count: patternBucketCounts.NO_CATALOG_MATCH,
    has_catalog_match_pattern_count: patternBucketCounts.HAS_CATALOG_MATCH,
    matched_catalog_slug_count: catalogSlugRows.length,
    catalog_slug_bucket_counts: catalogBucketCounts,
    pattern_bucket_counts: patternBucketCounts,
    covered_with_da29_warning_count: catalogSlugRows.filter(
      (row) => row.bucket === "COVERED" && row.warnings.includes("DA29_COMPAT_PRESENT"),
    ).length,
  };

  const provenFacts = [
    `hyperagent_candidate_rows=${candidateRows.length}`,
    `samsung_catalog_rows=${catalog.length}`,
    `matched_catalog_slug_rows=${catalogSlugRows.length}`,
    `catalog_row_creation_allowed=false`,
  ];

  return {
    contract: SAMSUNG_HAF_QIN_WILDCARD_EXPANSION_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    catalog_row_creation_allowed: false,
    generated_at: generatedAt,
    review_status: blockers.length > 0 ? "BLOCKED_INPUT" : "READY_FOR_OWNER_REVIEW",
    gates,
    exact_repo_paths_read: exactRepoPathsRead,
    wildcard_expansion_rules_v1: {
      suffix_double_star_enabled: true,
      inline_star_supported: false,
      catalog_row_creation: false,
    },
    inspect_summary: inspectSummary,
    pattern_rows: patternRows,
    catalog_slug_rows: catalogSlugRows,
    proven_facts: provenFacts,
    unknown_facts: [],
  };
}

export function buildSamsungHafQinWildcardExpansionReviewMarkdownV1(
  report: SamsungHafQinWildcardExpansionReviewReportV1,
): string {
  const lines: string[] = [
    "# Samsung HAF-QIN wildcard expansion review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Stop condition",
    "",
    "Read-only classification only. Does **not** authorize catalog mutation, compatibility mutation, Supabase writes, or Page Factory publish.",
    "",
    "## Summary",
    "",
    `- review_status: **${report.review_status}**`,
    `- candidate_pattern_count: **${report.inspect_summary.candidate_pattern_count}**`,
    `- matched_catalog_slug_count: **${report.inspect_summary.matched_catalog_slug_count}**`,
    `- wildcard_unsupported_pattern_count: **${report.inspect_summary.wildcard_unsupported_pattern_count}**`,
    `- no_catalog_match_pattern_count: **${report.inspect_summary.no_catalog_match_pattern_count}**`,
    "",
    "### Catalog slug buckets",
    "",
    "| Bucket | Count |",
    "|---|---:|",
  ];

  for (const [bucket, count] of Object.entries(report.inspect_summary.catalog_slug_bucket_counts)) {
    lines.push(`| ${bucket} | ${count} |`);
  }

  lines.push("", "### Catalog slug rows", "", "| fridge_slug | bucket | compat | warnings |", "|---|---|---|---|");
  for (const row of report.catalog_slug_rows) {
    lines.push(
      `| \`${row.fridge_slug}\` | ${row.bucket} | ${row.compat_filter_slugs.join(", ") || "—"} | ${row.warnings.join(", ") || "—"} |`,
    );
  }

  lines.push("", "### Unsupported wildcard patterns", "");
  for (const row of report.pattern_rows.filter((r) => r.pattern_bucket === "WILDCARD_UNSUPPORTED")) {
    lines.push(`- \`${row.model_number_pattern}\``);
  }

  return `${lines.join("\n")}\n`;
}

export function writeSamsungHafQinWildcardExpansionReviewArtifactsV1(args: {
  rootDir: string;
  report: SamsungHafQinWildcardExpansionReviewReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, HAF_QIN_WILDCARD_EXPANSION_REVIEW_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildSamsungHafQinWildcardExpansionReviewMarkdownV1(args.report), "utf8");
  return {
    jsonRelPath: HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
    mdRelPath: HAF_QIN_WILDCARD_EXPANSION_REVIEW_MD_REL_V1,
  };
}
