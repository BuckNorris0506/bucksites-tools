/**
 * Read-only refrigerator model → filter mapping correctness audit v1.
 * Does not mutate compat CSV, Supabase, retailer links, sitemap, robots, or public pages.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  getFridgeModelReviewOverride,
  listFridgeModelReviewOverrides,
} from "@/lib/fridge/fridge-model-review-overrides";

import { hasModelSpecificPublicReadyEvidenceV1 } from "./buckparts-page-factory-evidence-clone-v1";
import {
  BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
  PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
  type PageQualityGateReportV1,
} from "./buckparts-page-quality-gate-v1";
import { legacyFilterSlugsMatchOfficialTokenV1 } from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_CANONICAL_FILTER_SLUG_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";

export const MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1 =
  "model_filter_correctness_audit_v1" as const;

export const MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1 =
  "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.json" as const;

export const MODEL_FILTER_CORRECTNESS_AUDIT_CSV_REL_V1 =
  "data/fridge/batch-production/audits/model-filter-correctness-audit-v1.csv" as const;

export const MODEL_FILTER_CORRECTNESS_AUDIT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/model-filter-correctness-audit-v1.md" as const;

export const MODEL_FILTER_CORRECTNESS_AUDIT_ALLOWED_WRITE_REL_PATHS_V1 = [
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_CSV_REL_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_MD_REL_V1,
] as const;

export const MODEL_FILTER_CORRECTNESS_CLASSIFICATIONS_V1 = [
  "PROVEN_CORRECT",
  "LIKELY_CORRECT_NEEDS_EVIDENCE",
  "WRONG_PART_RISK",
  "BLOCKED",
  "UNKNOWN",
] as const;

export type ModelFilterCorrectnessClassificationV1 =
  (typeof MODEL_FILTER_CORRECTNESS_CLASSIFICATIONS_V1)[number];

export type FilterProofStatusV1 =
  | "PROVEN_ALIGNED"
  | "NEEDS_EVIDENCE"
  | "WRONG_FAMILY_RISK"
  | "MISSING_CATALOG_ROW";

export type ModelFilterPerFilterProofV1 = {
  filter_slug: string;
  proof_status: FilterProofStatusV1;
  oem_part_number: string | null;
  notes: string[];
};

export type ModelFilterCorrectnessRowV1 = {
  fridge_slug: string;
  model_number: string;
  brand_slug: string;
  mapped_filter_slugs: string[];
  classification: ModelFilterCorrectnessClassificationV1;
  evidence_status: string;
  per_filter_proof: ModelFilterPerFilterProofV1[];
  evidence_paths: string[];
  blockers: string[];
  recommended_action: string;
  risk_score: number;
  quality_gate_artifact_path: string | null;
  quality_gate_recommended_robots_index: boolean | null;
  quality_gate_publication_authorized: boolean | null;
};

export type ConfusionFamilySummaryV1 = {
  haf_qin_vs_haf_cin: number;
  da29_vs_da97: number;
  xwf_vs_xwfe: number;
  fppwfu01_vs_fppwfu02: number;
  lg_lt_generation_mixes: number;
  ge_rpwfe_mixed_legacy: number;
  wildcard_blocked_haf_cin: number;
  wildcard_review_da29_conflict: number;
};

export type IndexableRiskPageV1 = {
  fridge_slug: string;
  model_number: string;
  classification: ModelFilterCorrectnessClassificationV1;
  quality_gate_artifact_path: string | null;
  recommended_robots_index: boolean | null;
  publication_authorized: boolean | null;
  blockers: string[];
};

export type ModelFilterCorrectnessAuditInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    classification_counts: ".classification_counts";
    top_50_risk_pages: ".top_50_risk_pages";
    indexable_risk_pages: ".indexable_risk_pages";
  };
  total_models: number;
  classification_counts: Record<ModelFilterCorrectnessClassificationV1, number>;
  factory_scaling: {
    safe: number;
    needs_evidence: number;
    dangerous: number;
  };
  recommended_next_action: string;
};

export type ModelFilterCorrectnessAuditV1 = {
  contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  total_models: number;
  models_with_compat_mapping: number;
  models_without_compat_mapping: number;
  manual_evidence_fixture_count: number;
  quarantined_model_count: number;
  classification_counts: Record<ModelFilterCorrectnessClassificationV1, number>;
  confusion_family_summary: ConfusionFamilySummaryV1;
  factory_scaling: {
    safe: number;
    needs_evidence: number;
    dangerous: number;
  };
  top_50_risk_pages: ModelFilterCorrectnessRowV1[];
  indexable_risk_pages: IndexableRiskPageV1[];
  model_rows: ModelFilterCorrectnessRowV1[];
  inspect_summary: ModelFilterCorrectnessAuditInspectSummaryV1;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type FridgeModelRow = { brand_slug: string; slug: string; model_number?: string };
type MappingRow = { fridge_slug: string; filter_slug: string };
type FilterRow = { brand_slug: string; slug: string; oem_part_number?: string };

type ManualEvidenceSourceV1 = {
  source_title?: string;
  evidence_role?: string;
};

type ManualEvidenceRecordV1 = {
  fridge_model_slug?: string;
  source_title?: string;
  sources?: ManualEvidenceSourceV1[];
};

type DiscrepancyEntryV1 = {
  fridge_slug: string;
  official_filter_token: string;
  repo_mapped_filter_slugs: string[];
};

type OfficialProofV1 = {
  official_filter_token: string;
  proof_source_kind:
    | "manual_evidence_filter_specification"
    | "manual_evidence_top_level_title"
    | "discrepancy_doc_official_lg"
    | "page_quality_gate_model_specific_plus_wildcard_haf_qin"
    | "page_quality_gate_model_specific_single_oem";
  evidence_paths: string[];
};

const CSV_PATHS_V1 = {
  fridge_models: "data/fridge_models.csv",
  compatibility_mappings: "data/compatibility_mappings.csv",
  filters: "data/filters.csv",
  filter_aliases: "data/filter_aliases.csv",
  fridge_model_aliases: "data/fridge_model_aliases.csv",
} as const;

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";
const DISCREPANCY_DOC_REL_V1 = "docs/fridge-model-filter-mapping-discrepancies.md";
const QUARANTINE_MODULE_REL_V1 = "src/lib/fridge/fridge-model-review-overrides.ts";

const OFFICIAL_FILTER_TITLE_PATTERNS_V1 = [
  /water filter\s+([A-Z0-9][A-Z0-9-]{2,})/i,
  /filter specification[:\s]+([A-Z0-9][A-Z0-9-]{2,})/i,
] as const;

const HAF_QIN_SLUGS_V1 = ["da97-17376a", "da97-17376b"] as const;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  return parse(readFileSync(path.join(rootDir, relPath), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function extractTokenFromTitle(title: string): string | null {
  for (const pattern of OFFICIAL_FILTER_TITLE_PATTERNS_V1) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim().toUpperCase();
  }
  return null;
}

function loadManualEvidenceBySlug(rootDir: string): Map<string, ManualEvidenceRecordV1> {
  const dir = path.join(rootDir, MANUAL_EVIDENCE_DIR_REL_V1);
  const out = new Map<string, ManualEvidenceRecordV1>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const record = JSON.parse(
        readFileSync(path.join(dir, file), "utf8"),
      ) as ManualEvidenceRecordV1;
      const slug = normalizeSlug(record.fridge_model_slug ?? file.replace(/\.json$/, ""));
      out.set(slug, record);
    } catch {
      // skip invalid fixtures
    }
  }
  return out;
}

function loadDiscrepancyEntries(rootDir: string): Map<string, DiscrepancyEntryV1> {
  const abs = path.join(rootDir, DISCREPANCY_DOC_REL_V1);
  if (!existsSync(abs)) return new Map();
  const text = readFileSync(abs, "utf8");
  const out = new Map<string, DiscrepancyEntryV1>();
  const sectionRe = /^##\s+([a-z0-9-]+)\s+\//gim;
  const sections: Array<{ slug: string; start: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRe.exec(text)) !== null) {
    sections.push({ slug: match[1]!.trim().toLowerCase(), start: match.index });
  }
  for (let i = 0; i < sections.length; i += 1) {
    const { slug, start } = sections[i]!;
    const end = sections[i + 1]?.start ?? text.length;
    const body = text.slice(start, end);
    const officialMatch = body.match(/Official LG product\/spec reported filter:\s*`([^`]+)`/i);
    if (!officialMatch?.[1]) continue;
    const repoMatch = body.match(/Repo mapped filters:\s*`([^`]+)`(?:,\s*`([^`]+)`)?/i);
    const repoSlugs: string[] = [];
    if (repoMatch?.[1]) repoSlugs.push(repoMatch[1].trim().toLowerCase());
    if (repoMatch?.[2]) repoSlugs.push(repoMatch[2].trim().toLowerCase());
    out.set(slug, {
      fridge_slug: slug,
      official_filter_token: officialMatch[1]!.trim().toUpperCase(),
      repo_mapped_filter_slugs: repoSlugs,
    });
  }
  return out;
}

function loadWildcardRows(rootDir: string): Map<string, CatalogSlugRowV1> {
  const abs = path.join(rootDir, HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1);
  if (!existsSync(abs)) return new Map();
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
    catalog_slug_rows?: CatalogSlugRowV1[];
  };
  return new Map((parsed.catalog_slug_rows ?? []).map((row) => [row.fridge_slug, row]));
}

function loadQualityGateArtifacts(rootDir: string): Map<string, PageQualityGateReportV1> {
  const dir = path.join(rootDir, PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1);
  const out = new Map<string, PageQualityGateReportV1>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith("-quality-gate-v1.json")) continue;
    const rel = `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${file}`;
    try {
      const parsed = JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as PageQualityGateReportV1;
      if (parsed.contract !== BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1) continue;
      out.set(normalizeSlug(parsed.fridge_slug), parsed);
    } catch {
      // skip invalid artifacts
    }
  }
  return out;
}

function officialProofFromManualEvidence(
  slug: string,
  record: ManualEvidenceRecordV1,
): OfficialProofV1 | null {
  const evidencePath = `${MANUAL_EVIDENCE_DIR_REL_V1}/${slug}.json`;
  for (const source of record.sources ?? []) {
    if (source.evidence_role !== "filter_specification") continue;
    const token = extractTokenFromTitle(source.source_title ?? "");
    if (!token) continue;
    return {
      official_filter_token: token,
      proof_source_kind: "manual_evidence_filter_specification",
      evidence_paths: [evidencePath],
    };
  }
  const topLevelToken = extractTokenFromTitle(record.source_title ?? "");
  if (topLevelToken) {
    return {
      official_filter_token: topLevelToken,
      proof_source_kind: "manual_evidence_top_level_title",
      evidence_paths: [evidencePath],
    };
  }
  return null;
}

function resolveOfficialProof(args: {
  rootDir: string;
  slug: string;
  brandSlug: string;
  modelNumber: string;
  mappedFilterSlugs: string[];
  manual: ManualEvidenceRecordV1 | undefined;
  discrepancy: DiscrepancyEntryV1 | undefined;
  wildcard: CatalogSlugRowV1 | undefined;
  filterOemBySlug: Map<string, string>;
}): OfficialProofV1 | null {
  if (args.manual) {
    const fromManual = officialProofFromManualEvidence(args.slug, args.manual);
    if (fromManual) return fromManual;
  }

  if (args.discrepancy) {
    return {
      official_filter_token: args.discrepancy.official_filter_token,
      proof_source_kind: "discrepancy_doc_official_lg",
      evidence_paths: [DISCREPANCY_DOC_REL_V1],
    };
  }

  if (
    hasModelSpecificPublicReadyEvidenceV1(args.rootDir, args.slug, args.modelNumber) &&
    args.wildcard?.legacy_slugs_match_haf_qin_family
  ) {
    return {
      official_filter_token: OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
      proof_source_kind: "page_quality_gate_model_specific_plus_wildcard_haf_qin",
      evidence_paths: [
        `${MANUAL_EVIDENCE_DIR_REL_V1}/${args.slug}.json`,
        HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
      ],
    };
  }

  if (
    hasModelSpecificPublicReadyEvidenceV1(args.rootDir, args.slug, args.modelNumber) &&
    args.mappedFilterSlugs.length === 1
  ) {
    const onlySlug = args.mappedFilterSlugs[0]!;
    const oem = args.filterOemBySlug.get(onlySlug) ?? onlySlug;
    return {
      official_filter_token: oem,
      proof_source_kind: "page_quality_gate_model_specific_single_oem",
      evidence_paths: [`${MANUAL_EVIDENCE_DIR_REL_V1}/${args.slug}.json`],
    };
  }

  return null;
}

function detectConfusionBlockers(mappedFilterSlugs: string[]): string[] {
  const slugs = mappedFilterSlugs.map(normalizeSlug);
  const blockers: string[] = [];
  const has = (arr: readonly string[]) => arr.some((slug) => slugs.includes(slug));

  if (has(HAF_QIN_SLUGS_V1) && has(HAF_CIN_CANONICAL_FILTER_SLUGS_V1)) {
    blockers.push("confusion:HAF-QIN (DA97) vs HAF-CIN (DA29)");
  }
  if (has(["xwf"]) && has(["xwfe"])) {
    blockers.push("confusion:XWF vs XWFE (GE RFID shell mismatch)");
  }
  if (has(["fppwfu01"]) && has(["fppwfu02"])) {
    blockers.push("confusion:FPPWFU01 vs FPPWFU02");
  }

  const da29 = slugs.filter((slug) => slug.startsWith("da29-"));
  const da97 = slugs.filter((slug) => slug.startsWith("da97-"));
  if (
    da29.length > 0 &&
    da97.length > 0 &&
    !(has(HAF_QIN_SLUGS_V1) && has(HAF_CIN_CANONICAL_FILTER_SLUGS_V1))
  ) {
    blockers.push(`confusion:Samsung DA29 (${da29.join(",")}) + DA97 (${da97.join(",")}) co-mapped`);
  }

  const ltGenerations = slugs.filter((slug) => /^lt\d/.test(slug));
  if (ltGenerations.length > 1) {
    blockers.push(`confusion:Multiple LG LT filter generations co-mapped: ${ltGenerations.join(",")}`);
  }

  if (
    slugs.includes("rpwfe") &&
    (slugs.includes("mwf") || slugs.includes("xwf") || slugs.includes("xwfe"))
  ) {
    blockers.push("confusion:GE RPWFE mixed with legacy MWF/XWF/XWFE family");
  }

  return blockers;
}

function hasWrongFamilyBlockers(blockers: string[]): boolean {
  return blockers.some(
    (blocker) =>
      blocker.startsWith("confusion:") ||
      blocker.startsWith("wildcard:BLOCKED_HAF_CIN") ||
      blocker.startsWith("wildcard:REVIEW_DA29") ||
      blocker.startsWith("wildcard:DA29_COMPAT") ||
      blocker.startsWith("samsung:HAF-QIN_and_HAF-CIN") ||
      blocker.startsWith("official_token_mismatch:"),
  );
}

function buildPerFilterProof(args: {
  mappedFilterSlugs: string[];
  filterOemBySlug: Map<string, string>;
  filterSlugs: Set<string>;
  officialProof: OfficialProofV1 | null;
  brandSlug: string;
  wrongFamilySlugs: Set<string>;
}): ModelFilterPerFilterProofV1[] {
  const provenAligned =
    args.officialProof != null &&
    legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug: args.brandSlug,
      officialToken: args.officialProof.official_filter_token,
      legacyFilterSlugs: args.mappedFilterSlugs,
      filterOemBySlug: args.filterOemBySlug,
    });

  return args.mappedFilterSlugs.map((filterSlug) => {
    const notes: string[] = [];
    let proof_status: FilterProofStatusV1 = "NEEDS_EVIDENCE";

    if (!args.filterSlugs.has(filterSlug)) {
      proof_status = "MISSING_CATALOG_ROW";
      notes.push("filter slug missing from data/filters.csv");
    } else if (args.wrongFamilySlugs.has(filterSlug)) {
      proof_status = "WRONG_FAMILY_RISK";
      notes.push("included in wrong-family / confusion-family blocker set");
    } else if (provenAligned) {
      proof_status = "PROVEN_ALIGNED";
      notes.push(`aligns with official token ${args.officialProof!.official_filter_token}`);
    }

    return {
      filter_slug: filterSlug,
      proof_status,
      oem_part_number: args.filterOemBySlug.get(filterSlug) ?? null,
      notes,
    };
  });
}

function wrongFamilySlugSet(mappedFilterSlugs: string[], blockers: string[]): Set<string> {
  const slugs = new Set(mappedFilterSlugs);
  const risky = new Set<string>();
  if (blockers.some((b) => b.includes("HAF-QIN (DA97) vs HAF-CIN (DA29)"))) {
    for (const slug of slugs) {
      if (
        HAF_QIN_SLUGS_V1.includes(slug as (typeof HAF_QIN_SLUGS_V1)[number]) ||
        HAF_CIN_CANONICAL_FILTER_SLUGS_V1.includes(slug as (typeof HAF_CIN_CANONICAL_FILTER_SLUGS_V1)[number])
      ) {
        risky.add(slug);
      }
    }
  }
  if (blockers.some((b) => b.includes("XWF vs XWFE"))) {
    if (slugs.has("xwf")) risky.add("xwf");
    if (slugs.has("xwfe")) risky.add("xwfe");
  }
  if (blockers.some((b) => b.includes("FPPWFU01 vs FPPWFU02"))) {
    if (slugs.has("fppwfu01")) risky.add("fppwfu01");
    if (slugs.has("fppwfu02")) risky.add("fppwfu02");
  }
  if (blockers.some((b) => b.includes("Multiple LG LT filter generations"))) {
    for (const slug of slugs) {
      if (/^lt\d/.test(slug)) risky.add(slug);
    }
  }
  if (blockers.some((b) => b.startsWith("confusion:Samsung DA29"))) {
    for (const slug of slugs) {
      if (slug.startsWith("da29-") || slug.startsWith("da97-")) risky.add(slug);
    }
  }
  if (blockers.some((b) => b.includes("GE RPWFE mixed"))) {
    for (const slug of ["rpwfe", "mwf", "xwf", "xwfe"] as const) {
      if (slugs.has(slug)) risky.add(slug);
    }
  }
  if (blockers.some((b) => b.startsWith("wildcard:BLOCKED_HAF_CIN"))) {
    for (const slug of HAF_CIN_CANONICAL_FILTER_SLUGS_V1) {
      if (slugs.has(slug)) risky.add(slug);
    }
  }
  return risky;
}

function computeRiskScore(args: {
  classification: ModelFilterCorrectnessClassificationV1;
  blockerCount: number;
  mappedFilterCount: number;
}): number {
  const base = {
    WRONG_PART_RISK: 100,
    BLOCKED: 90,
    UNKNOWN: 50,
    LIKELY_CORRECT_NEEDS_EVIDENCE: 30,
    PROVEN_CORRECT: 0,
  }[args.classification];
  return base + args.blockerCount * 5 + args.mappedFilterCount * 2;
}

function classifyModelRow(args: {
  rootDir: string;
  row: FridgeModelRow;
  mappedFilterSlugs: string[];
  manual: ManualEvidenceRecordV1 | undefined;
  discrepancy: DiscrepancyEntryV1 | undefined;
  wildcard: CatalogSlugRowV1 | undefined;
  qualityGate: PageQualityGateReportV1 | undefined;
  filterOemBySlug: Map<string, string>;
  filterSlugs: Set<string>;
}): ModelFilterCorrectnessRowV1 {
  const slug = normalizeSlug(args.row.slug);
  const brandSlug = normalizeSlug(args.row.brand_slug);
  const modelNumber = (args.row.model_number ?? "").trim();
  const mappedFilterSlugs = [...args.mappedFilterSlugs].sort();
  const blockers: string[] = [];
  const evidencePaths = new Set<string>();

  const quarantine = getFridgeModelReviewOverride(slug);
  if (quarantine) {
    blockers.push(`quarantine:${quarantine.reason}`);
    evidencePaths.add(QUARANTINE_MODULE_REL_V1);
    evidencePaths.add(quarantine.internal_evidence_doc);
  }

  if (mappedFilterSlugs.length === 0) {
    blockers.push("no_compat_mapping");
    return {
      fridge_slug: slug,
      model_number: modelNumber,
      brand_slug: brandSlug,
      mapped_filter_slugs: [],
      classification: "UNKNOWN",
      evidence_status: "NONE",
      per_filter_proof: [],
      evidence_paths: [...evidencePaths],
      blockers,
      recommended_action: "Add compatibility mapping after official manufacturer filter proof.",
      risk_score: computeRiskScore({
        classification: "UNKNOWN",
        blockerCount: blockers.length,
        mappedFilterCount: 0,
      }),
      quality_gate_artifact_path: args.qualityGate
        ? `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${slug}-quality-gate-v1.json`
        : null,
      quality_gate_recommended_robots_index: args.qualityGate?.recommended_robots.index ?? null,
      quality_gate_publication_authorized: args.qualityGate?.publication_authorized ?? null,
    };
  }

  for (const filterSlug of mappedFilterSlugs) {
    if (!args.filterSlugs.has(filterSlug)) {
      blockers.push(`missing_filter_slug:${filterSlug}`);
    }
  }

  if (args.manual) {
    evidencePaths.add(`${MANUAL_EVIDENCE_DIR_REL_V1}/${slug}.json`);
  }

  if (args.wildcard) {
    evidencePaths.add(HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1);
    if (args.wildcard.bucket === "BLOCKED_HAF_CIN_CANONICAL") {
      blockers.push("wildcard:BLOCKED_HAF_CIN_CANONICAL");
    }
    if (args.wildcard.bucket === "REVIEW_DA29_CONFLICT") {
      blockers.push("wildcard:REVIEW_DA29_CONFLICT");
    }
    if (args.wildcard.warnings?.includes("DA29_COMPAT_PRESENT")) {
      blockers.push("wildcard:DA29_COMPAT_PRESENT");
    }
  }

  blockers.push(...detectConfusionBlockers(mappedFilterSlugs));

  if (
    brandSlug === "samsung" &&
    HAF_CIN_CANONICAL_FILTER_SLUGS_V1.some((s) => mappedFilterSlugs.includes(s)) &&
    (mappedFilterSlugs.includes(HAF_QIN_CANONICAL_FILTER_SLUG_V1) ||
      mappedFilterSlugs.includes("da97-17376a"))
  ) {
    blockers.push("samsung:HAF-QIN_and_HAF-CIN_co_mapped");
  }

  const officialProof = resolveOfficialProof({
    rootDir: args.rootDir,
    slug,
    brandSlug,
    modelNumber,
    mappedFilterSlugs,
    manual: args.manual,
    discrepancy: args.discrepancy,
    wildcard: args.wildcard,
    filterOemBySlug: args.filterOemBySlug,
  });

  if (officialProof) {
    for (const p of officialProof.evidence_paths) evidencePaths.add(p);
  }

  let provenMatch = false;
  if (officialProof) {
    provenMatch = legacyFilterSlugsMatchOfficialTokenV1({
      brandSlug,
      officialToken: officialProof.official_filter_token,
      legacyFilterSlugs: mappedFilterSlugs,
      filterOemBySlug: args.filterOemBySlug,
    });
    if (!provenMatch) {
      blockers.push(
        `official_token_mismatch:${officialProof.official_filter_token}_vs_${mappedFilterSlugs.join("|")}`,
      );
    }
  }

  let evidenceStatus = "NONE";
  if (officialProof && provenMatch) {
    evidenceStatus =
      officialProof.proof_source_kind.startsWith("page_quality_gate")
        ? "PROVEN_PAGE_QUALITY_GATE_ALIGNED"
        : "PROVEN_MANUAL_EVIDENCE";
  } else if (officialProof) {
    evidenceStatus = "OFFICIAL_TOKEN_UNALIGNED";
  } else if (args.manual) {
    evidenceStatus = "MANUAL_EVIDENCE_NO_OFFICIAL_TOKEN";
  } else if (args.discrepancy) {
    evidenceStatus = "DISCREPANCY_DOC";
  } else if (args.wildcard) {
    evidenceStatus = `WILDCARD_${args.wildcard.bucket}`;
  }

  const wrongFamilySlugs = wrongFamilySlugSet(mappedFilterSlugs, blockers);
  const per_filter_proof = buildPerFilterProof({
    mappedFilterSlugs,
    filterOemBySlug: args.filterOemBySlug,
    filterSlugs: args.filterSlugs,
    officialProof,
    brandSlug,
    wrongFamilySlugs,
  });

  let classification: ModelFilterCorrectnessClassificationV1 = "UNKNOWN";
  let recommended_action = "Insufficient repo proof — run model-first evidence capture.";

  if (hasWrongFamilyBlockers(blockers)) {
    classification = "WRONG_PART_RISK";
    recommended_action =
      "Remove wrong-family compat rows or capture model-specific proof for the correct family only.";
  } else if (quarantine) {
    classification = "BLOCKED";
    recommended_action = "Resolve quarantine override before factory scaling.";
  } else if (provenMatch && officialProof) {
    classification = "PROVEN_CORRECT";
    recommended_action =
      "Safe for factory scaling subject to page quality gate and buy-path gates.";
  } else if (
    args.wildcard?.bucket === "COVERED" &&
    mappedFilterSlugs.includes(HAF_QIN_CANONICAL_FILTER_SLUG_V1)
  ) {
    classification = "LIKELY_CORRECT_NEEDS_EVIDENCE";
    recommended_action =
      "Wildcard COVERED with canonical HAF-QIN slug — add Tier-1 manual evidence before factory scaling.";
  } else if (!officialProof) {
    classification = "LIKELY_CORRECT_NEEDS_EVIDENCE";
    recommended_action =
      "Capture official manufacturer filter_specification evidence before scaling.";
  } else if (args.manual && !provenMatch) {
    classification = "WRONG_PART_RISK";
    recommended_action = "Manual evidence token does not match CSV mapping — reconcile.";
  }

  const qualityGateArtifactPath = args.qualityGate
    ? `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${slug}-quality-gate-v1.json`
    : null;
  if (qualityGateArtifactPath) {
    evidencePaths.add(qualityGateArtifactPath);
  }

  return {
    fridge_slug: slug,
    model_number: modelNumber,
    brand_slug: brandSlug,
    mapped_filter_slugs: mappedFilterSlugs,
    classification,
    evidence_status: evidenceStatus,
    per_filter_proof,
    evidence_paths: [...evidencePaths].sort(),
    blockers,
    recommended_action,
    risk_score: computeRiskScore({
      classification,
      blockerCount: blockers.length,
      mappedFilterCount: mappedFilterSlugs.length,
    }),
    quality_gate_artifact_path: qualityGateArtifactPath,
    quality_gate_recommended_robots_index: args.qualityGate?.recommended_robots.index ?? null,
    quality_gate_publication_authorized: args.qualityGate?.publication_authorized ?? null,
  };
}

function buildConfusionFamilySummary(
  rows: ModelFilterCorrectnessRowV1[],
): ConfusionFamilySummaryV1 {
  const hasBlocker = (needle: string) =>
    rows.filter((row) => row.blockers.some((blocker) => blocker.includes(needle))).length;

  return {
    haf_qin_vs_haf_cin: hasBlocker("HAF-QIN (DA97) vs HAF-CIN (DA29)"),
    da29_vs_da97: rows.filter((row) =>
      row.blockers.some((blocker) => blocker.startsWith("confusion:Samsung DA29")),
    ).length,
    xwf_vs_xwfe: hasBlocker("XWF vs XWFE"),
    fppwfu01_vs_fppwfu02: hasBlocker("FPPWFU01 vs FPPWFU02"),
    lg_lt_generation_mixes: hasBlocker("Multiple LG LT filter generations"),
    ge_rpwfe_mixed_legacy: hasBlocker("GE RPWFE mixed"),
    wildcard_blocked_haf_cin: rows.filter((row) =>
      row.blockers.includes("wildcard:BLOCKED_HAF_CIN_CANONICAL"),
    ).length,
    wildcard_review_da29_conflict: rows.filter((row) =>
      row.blockers.includes("wildcard:REVIEW_DA29_CONFLICT"),
    ).length,
  };
}

function buildIndexableRiskPages(rows: ModelFilterCorrectnessRowV1[]): IndexableRiskPageV1[] {
  const dangerous = new Set<ModelFilterCorrectnessClassificationV1>([
    "WRONG_PART_RISK",
    "BLOCKED",
    "UNKNOWN",
  ]);
  return rows
    .filter((row) => dangerous.has(row.classification))
    .filter(
      (row) =>
        row.quality_gate_recommended_robots_index === true ||
        row.quality_gate_publication_authorized === true,
    )
    .map((row) => ({
      fridge_slug: row.fridge_slug,
      model_number: row.model_number,
      classification: row.classification,
      quality_gate_artifact_path: row.quality_gate_artifact_path,
      recommended_robots_index: row.quality_gate_recommended_robots_index,
      publication_authorized: row.quality_gate_publication_authorized,
      blockers: row.blockers,
    }))
    .sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));
}

function emptyClassificationCounts(): Record<ModelFilterCorrectnessClassificationV1, number> {
  return {
    PROVEN_CORRECT: 0,
    LIKELY_CORRECT_NEEDS_EVIDENCE: 0,
    WRONG_PART_RISK: 0,
    BLOCKED: 0,
    UNKNOWN: 0,
  };
}

export function buildModelFilterCorrectnessAuditV1(args: {
  rootDir: string;
  now?: () => Date;
}): ModelFilterCorrectnessAuditV1 {
  const now = args.now ?? (() => new Date());
  const fridgeModels = readCsv<FridgeModelRow>(args.rootDir, CSV_PATHS_V1.fridge_models);
  const mappingsRaw = readCsv<MappingRow>(args.rootDir, CSV_PATHS_V1.compatibility_mappings);
  const filtersRaw = readCsv<FilterRow>(args.rootDir, CSV_PATHS_V1.filters);

  readCsv(args.rootDir, CSV_PATHS_V1.filter_aliases);
  readCsv(args.rootDir, CSV_PATHS_V1.fridge_model_aliases);

  const filterSlugs = new Set(filtersRaw.map((row) => normalizeSlug(row.slug)));
  const filterOemBySlug = new Map(
    filtersRaw.map(
      (row) => [normalizeSlug(row.slug), (row.oem_part_number ?? row.slug).trim()] as const,
    ),
  );

  const mappingByModel = new Map<string, string[]>();
  for (const row of mappingsRaw) {
    const modelSlug = normalizeSlug(row.fridge_slug);
    const filterSlug = normalizeSlug(row.filter_slug);
    if (!modelSlug || !filterSlug) continue;
    if (!mappingByModel.has(modelSlug)) mappingByModel.set(modelSlug, []);
    mappingByModel.get(modelSlug)!.push(filterSlug);
  }
  for (const [slug, slugs] of mappingByModel.entries()) {
    mappingByModel.set(slug, [...new Set(slugs)].sort());
  }

  const manualBySlug = loadManualEvidenceBySlug(args.rootDir);
  const discrepancyBySlug = loadDiscrepancyEntries(args.rootDir);
  const wildcardBySlug = loadWildcardRows(args.rootDir);
  const qualityGateBySlug = loadQualityGateArtifacts(args.rootDir);

  const model_rows = fridgeModels
    .map((row) => {
      const slug = normalizeSlug(row.slug);
      return classifyModelRow({
        rootDir: args.rootDir,
        row,
        mappedFilterSlugs: mappingByModel.get(slug) ?? [],
        manual: manualBySlug.get(slug),
        discrepancy: discrepancyBySlug.get(slug),
        wildcard: wildcardBySlug.get(slug),
        qualityGate: qualityGateBySlug.get(slug),
        filterOemBySlug,
        filterSlugs,
      });
    })
    .sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));

  const classification_counts = emptyClassificationCounts();
  for (const row of model_rows) {
    classification_counts[row.classification] += 1;
  }

  const models_with_compat_mapping = model_rows.filter((row) => row.mapped_filter_slugs.length > 0)
    .length;
  const factory_scaling = {
    safe: classification_counts.PROVEN_CORRECT,
    needs_evidence:
      classification_counts.LIKELY_CORRECT_NEEDS_EVIDENCE + classification_counts.UNKNOWN,
    dangerous: classification_counts.WRONG_PART_RISK + classification_counts.BLOCKED,
  };

  const top_50_risk_pages = [...model_rows]
    .sort(
      (a, b) => b.risk_score - a.risk_score || a.fridge_slug.localeCompare(b.fridge_slug),
    )
    .slice(0, 50);

  const confusion_family_summary = buildConfusionFamilySummary(model_rows);
  const indexable_risk_pages = buildIndexableRiskPages(model_rows);

  const exact_repo_paths_read = [
    ...Object.values(CSV_PATHS_V1),
    MANUAL_EVIDENCE_DIR_REL_V1,
    HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
    PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
    QUARANTINE_MODULE_REL_V1,
    DISCREPANCY_DOC_REL_V1,
    "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
    "scripts/lib/buckparts-page-factory-evidence-clone-v1.ts",
  ].sort();

  return {
    contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    total_models: model_rows.length,
    models_with_compat_mapping,
    models_without_compat_mapping: model_rows.length - models_with_compat_mapping,
    manual_evidence_fixture_count: manualBySlug.size,
    quarantined_model_count: listFridgeModelReviewOverrides().length,
    classification_counts,
    confusion_family_summary,
    factory_scaling,
    top_50_risk_pages,
    indexable_risk_pages,
    model_rows,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        classification_counts: ".classification_counts",
        top_50_risk_pages: ".top_50_risk_pages",
        indexable_risk_pages: ".indexable_risk_pages",
      },
      total_models: model_rows.length,
      classification_counts,
      factory_scaling,
      recommended_next_action:
        factory_scaling.dangerous > 0
          ? "Resolve WRONG_PART_RISK and BLOCKED models before batch page factory scaling; prioritize indexable_risk_pages with quality-gate index=true."
          : "Continue Tier-1 evidence capture for LIKELY_CORRECT_NEEDS_EVIDENCE cohort before scaling.",
    },
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: total_models=${String(model_rows.length)} from ${CSV_PATHS_V1.fridge_models}.`,
      `PROVEN: classification_counts=${JSON.stringify(classification_counts)}.`,
      `PROVEN: manual_evidence_fixture_count=${String(manualBySlug.size)}.`,
      `PROVEN: quarantined_model_count=${String(listFridgeModelReviewOverrides().length)}.`,
      "PROVEN: Read-only audit — no compat, Supabase, retailer link, sitemap, robots, or page mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase mapping rows vs committed CSV — audit is repo-file truth only.",
    ],
  };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function renderMarkdown(report: ModelFilterCorrectnessAuditV1): string {
  const lines = [
    "# Model filter correctness audit v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- total_models: **${String(report.total_models)}**`,
    `- factory_scaling.safe: **${String(report.factory_scaling.safe)}**`,
    `- factory_scaling.needs_evidence: **${String(report.factory_scaling.needs_evidence)}**`,
    `- factory_scaling.dangerous: **${String(report.factory_scaling.dangerous)}**`,
    "",
    "## Classification counts",
    "",
    "| Classification | Count |",
    "| --- | ---: |",
    ...MODEL_FILTER_CORRECTNESS_CLASSIFICATIONS_V1.map(
      (classification) =>
        `| ${classification} | ${String(report.classification_counts[classification])} |`,
    ),
    "",
    "## Confusion-family summary",
    "",
    "| Family | Models affected |",
    "| --- | ---: |",
    ...Object.entries(report.confusion_family_summary).map(
      ([family, count]) => `| ${family} | ${String(count)} |`,
    ),
    "",
    "## Indexable-risk pages",
    "",
  ];

  if (report.indexable_risk_pages.length === 0) {
    lines.push("_None — no dangerous classifications intersect quality-gate indexable artifacts._");
  } else {
    for (const row of report.indexable_risk_pages) {
      lines.push(
        `- \`${row.fridge_slug}\` (${row.classification}) — blockers: ${row.blockers.join("; ") || "none"}`,
      );
    }
  }

  lines.push("", "## Top 50 risk pages", "");
  for (const row of report.top_50_risk_pages) {
    lines.push(
      `- \`${row.fridge_slug}\` score=${String(row.risk_score)} ${row.classification} — ${row.blockers[0] ?? "no blockers"}`,
    );
  }

  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeModelFilterCorrectnessAuditArtifactsV1(args: {
  rootDir: string;
  report: ModelFilterCorrectnessAuditV1;
  includeCsv?: boolean;
}): {
  jsonRelPath: string;
  mdRelPath: string;
  csvRelPath: string | null;
} {
  const jsonAbs = path.join(args.rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });

  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");

  let csvRelPath: string | null = null;
  if (args.includeCsv !== false) {
    csvRelPath = MODEL_FILTER_CORRECTNESS_AUDIT_CSV_REL_V1;
    const header =
      "fridge_slug,model_number,mapped_filter_slugs,classification,evidence_paths,blockers,recommended_action";
    const rows = args.report.model_rows.map((row) =>
      [
        row.fridge_slug,
        row.model_number,
        csvEscape(row.mapped_filter_slugs.join("|")),
        row.classification,
        csvEscape(row.evidence_paths.join("|")),
        csvEscape(row.blockers.join("|")),
        csvEscape(row.recommended_action),
      ].join(","),
    );
    writeFileSync(
      path.join(args.rootDir, csvRelPath),
      `${[header, ...rows].join("\n")}\n`,
      "utf8",
    );
  }

  return {
    jsonRelPath: MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
    mdRelPath: MODEL_FILTER_CORRECTNESS_AUDIT_MD_REL_V1,
    csvRelPath,
  };
}
