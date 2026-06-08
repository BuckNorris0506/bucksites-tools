/**
 * Read-only Proven Cohort Page Factory Manifest v1.
 * Selects PROVEN_CORRECT slugs from model_filter_correctness_audit_v1 for safe Page Factory candidacy.
 * Does not mutate compat, registry, Supabase, sitemap, robots, or public pages.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { getFridgeModelReviewOverride } from "@/lib/fridge/fridge-model-review-overrides";
import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
} from "@/lib/manuals/refrigerator-manual-evidence";

import {
  BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
  PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
  type PageQualityGateReportV1,
} from "./buckparts-page-quality-gate-v1";
import {
  loadPageFactoryTargetFromRegistryV1,
  PAGE_FACTORY_TARGETS_CSV_REL_V1,
  type PageFactoryTargetV1,
} from "./buckparts-page-factory-preflight-v1";
import {
  MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
  MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1,
  type ModelFilterCorrectnessAuditV1,
  type ModelFilterCorrectnessRowV1,
} from "./model-filter-correctness-audit-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_CANONICAL_FILTER_SLUG_V1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";

export const PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1 =
  "proven_cohort_page_factory_manifest_v1" as const;

export const PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1 =
  "data/fridge/batch-production/page-factory/proven-cohort-manifest-v1/proven-cohort-page-factory-manifest-v1.json" as const;

export const PROVEN_COHORT_PAGE_FACTORY_MANIFEST_MD_REL_V1 =
  "data/fridge/batch-production/drafts/proven-cohort-page-factory-manifest-v1.md" as const;

export const PROVEN_COHORT_PAGE_FACTORY_MANIFEST_ALLOWED_WRITE_REL_PATHS_V1 = [
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
  PROVEN_COHORT_PAGE_FACTORY_MANIFEST_MD_REL_V1,
] as const;

export const PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1 = "samsung-rf28r7351sr" as const;

const MANUAL_EVIDENCE_DIR_REL_V1 = "data/manual-evidence/refrigerator";

const HAF_QIN_FAMILY_SLUGS_V1 = ["da97-17376a", "da97-17376b"] as const;

export type RecommendedRegistryRowProposalV1 = {
  fridge_slug: string;
  expected_filter_slugs: string;
  forbidden_filter_slugs: string;
  official_marketing_token: string;
  draft_md_relpath: string;
  evidence_json_relpath: string;
};

export type QualityGateStatusSummaryV1 = {
  artifact_path: string;
  quality_classification: PageQualityGateReportV1["quality_classification"];
  publication_authorized: boolean;
  recommended_robots_index: boolean;
  recommended_sitemap_include: boolean;
};

export type ProvenCohortManifestRowV1 = {
  fridge_slug: string;
  model_number: string;
  brand_slug: string;
  audit_classification: "PROVEN_CORRECT";
  mapped_filter_slugs: string[];
  manual_evidence_path: string;
  manual_evidence_public_ready: boolean;
  already_in_page_factory_registry: boolean;
  registry_target: PageFactoryTargetV1 | null;
  recommended_registry_row_proposal: RecommendedRegistryRowProposalV1;
  quality_gate_status: QualityGateStatusSummaryV1 | null;
  eligible_for_owner_review: boolean;
  blockers: string[];
};

export type ProvenCohortPageFactoryManifestV1 = {
  contract: typeof PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  source_audit_contract: typeof MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1;
  source_audit_path: string;
  clone_anchor_slug: typeof PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1;
  proven_correct_slug_count: number;
  eligible_for_owner_review_count: number;
  already_registered_count: number;
  cohort_rows: ProvenCohortManifestRowV1[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      cohort_rows: ".cohort_rows";
      eligible_for_owner_review_count: ".eligible_for_owner_review_count";
    };
    recommended_next_action: string;
  };
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type FridgeModelRow = { brand_slug: string; slug: string; model_number?: string };
type FilterRow = { slug: string; oem_part_number?: string };

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

function manualEvidenceRelPath(slug: string): string {
  return `${MANUAL_EVIDENCE_DIR_REL_V1}/${slug}.json`;
}

function draftMdRelPath(slug: string): string {
  return `data/fridge/batch-production/drafts/${slug}-page-1-draft-v1.md`;
}

function qualityGateArtifactRelPath(slug: string): string {
  return `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${slug}-quality-gate-v1.json`;
}

function loadAuditReport(rootDir: string): ModelFilterCorrectnessAuditV1 {
  const abs = path.join(rootDir, MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1);
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as ModelFilterCorrectnessAuditV1;
  if (parsed.contract !== MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1) {
    throw new Error(
      `Audit contract mismatch: expected ${MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  return parsed;
}

function loadRegistrySlugs(rootDir: string): Set<string> {
  const rows = readCsv<{ fridge_slug: string }>(rootDir, PAGE_FACTORY_TARGETS_CSV_REL_V1);
  return new Set(rows.map((row) => normalizeSlug(row.fridge_slug)).filter(Boolean));
}

function tryLoadRegistryTarget(
  rootDir: string,
  slug: string,
): PageFactoryTargetV1 | null {
  try {
    return loadPageFactoryTargetFromRegistryV1({ rootDir, fridgeSlug: slug });
  } catch {
    return null;
  }
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

function primaryOemToken(
  mappedFilterSlugs: string[],
  filterOemBySlug: Map<string, string>,
): string {
  const primary = mappedFilterSlugs[0] ?? "";
  return (filterOemBySlug.get(primary) ?? primary).trim().toUpperCase();
}

function buildRegistryRowProposal(args: {
  slug: string;
  brandSlug: string;
  mappedFilterSlugs: string[];
  filterOemBySlug: Map<string, string>;
}): RecommendedRegistryRowProposalV1 {
  const mapped = [...args.mappedFilterSlugs].sort();
  const evidencePath = manualEvidenceRelPath(args.slug);

  if (args.brandSlug === "samsung") {
    const hasHafQin =
      mapped.includes(HAF_QIN_CANONICAL_FILTER_SLUG_V1) || mapped.includes("da97-17376a");
    const hasHafCin = HAF_CIN_CANONICAL_FILTER_SLUGS_V1.some((slug) => mapped.includes(slug));

    if (hasHafQin) {
      return {
        fridge_slug: args.slug,
        expected_filter_slugs: mapped.join("|"),
        forbidden_filter_slugs: [...HAF_CIN_CANONICAL_FILTER_SLUGS_V1].join("|"),
        official_marketing_token: "HAF-QIN",
        draft_md_relpath: draftMdRelPath(args.slug),
        evidence_json_relpath: evidencePath,
      };
    }

    if (hasHafCin) {
      return {
        fridge_slug: args.slug,
        expected_filter_slugs: mapped.join("|"),
        forbidden_filter_slugs: [...HAF_QIN_FAMILY_SLUGS_V1].join("|"),
        official_marketing_token: "HAF-CIN",
        draft_md_relpath: draftMdRelPath(args.slug),
        evidence_json_relpath: evidencePath,
      };
    }
  }

  const token = primaryOemToken(mapped, args.filterOemBySlug);
  return {
    fridge_slug: args.slug,
    expected_filter_slugs: mapped.join("|"),
    forbidden_filter_slugs: "",
    official_marketing_token: token,
    draft_md_relpath: draftMdRelPath(args.slug),
    evidence_json_relpath: evidencePath,
  };
}

function registryMatchesMapped(
  registry: PageFactoryTargetV1,
  mappedFilterSlugs: string[],
): boolean {
  const expected = [...registry.expected_filter_slugs].sort();
  const mapped = [...mappedFilterSlugs].sort();
  return JSON.stringify(expected) === JSON.stringify(mapped);
}

function buildCohortRow(args: {
  rootDir: string;
  auditRow: ModelFilterCorrectnessRowV1;
  modelBySlug: Map<string, FridgeModelRow>;
  filterOemBySlug: Map<string, string>;
  registrySlugs: Set<string>;
  qualityGateBySlug: Map<string, PageQualityGateReportV1>;
}): ProvenCohortManifestRowV1 {
  const slug = normalizeSlug(args.auditRow.fridge_slug);
  const model = args.modelBySlug.get(slug);
  const brandSlug = (model?.brand_slug ?? args.auditRow.brand_slug).trim().toLowerCase();
  const mappedFilterSlugs = [...args.auditRow.mapped_filter_slugs].sort();
  const manualEvidencePath = manualEvidenceRelPath(slug);
  const blockers: string[] = [];

  const quarantine = getFridgeModelReviewOverride(slug);
  if (quarantine) {
    blockers.push(`quarantine:${quarantine.reason}`);
  }

  if (!existsSync(path.join(args.rootDir, manualEvidencePath))) {
    blockers.push(`missing_manual_evidence:${manualEvidencePath}`);
  }

  let manualEvidencePublicReady = false;
  if (existsSync(path.join(args.rootDir, manualEvidencePath))) {
    try {
      const record = JSON.parse(
        readFileSync(path.join(args.rootDir, manualEvidencePath), "utf8"),
      ) as Partial<RefrigeratorManualEvidenceRecord>;
      const validation = validateRefrigeratorManualEvidencePublicReady(record);
      manualEvidencePublicReady = validation.ok;
      if (!validation.ok) {
        blockers.push(...validation.errors.map((error) => `manual_evidence:${error}`));
      }
      if (normalizeSlug(record.fridge_model_slug ?? "") !== slug) {
        blockers.push(`manual_evidence_slug_mismatch:expected ${slug}`);
      }
    } catch {
      blockers.push("manual_evidence:invalid_json");
    }
  }

  const registryTarget = tryLoadRegistryTarget(args.rootDir, slug);
  const alreadyInRegistry = args.registrySlugs.has(slug) || registryTarget != null;

  if (registryTarget && !registryMatchesMapped(registryTarget, mappedFilterSlugs)) {
    blockers.push(
      `registry_expected_filter_mismatch:registry=${registryTarget.expected_filter_slugs.join("|")} csv=${mappedFilterSlugs.join("|")}`,
    );
  }

  const recommended_registry_row_proposal = buildRegistryRowProposal({
    slug,
    brandSlug,
    mappedFilterSlugs,
    filterOemBySlug: args.filterOemBySlug,
  });

  const qualityGate = args.qualityGateBySlug.get(slug) ?? null;
  let quality_gate_status: QualityGateStatusSummaryV1 | null = null;
  if (qualityGate) {
    quality_gate_status = {
      artifact_path: qualityGateArtifactRelPath(slug),
      quality_classification: qualityGate.quality_classification,
      publication_authorized: qualityGate.publication_authorized,
      recommended_robots_index: qualityGate.recommended_robots.index,
      recommended_sitemap_include: qualityGate.recommended_sitemap_include,
    };
    if (qualityGate.quality_classification === "BLOCKED") {
      blockers.push(`quality_gate_blocked:${slug}`);
    }
  }

  if (args.auditRow.blockers.length > 0) {
    blockers.push(...args.auditRow.blockers.map((blocker) => `audit:${blocker}`));
  }

  const eligible_for_owner_review = blockers.length === 0;

  return {
    fridge_slug: slug,
    model_number: (model?.model_number ?? args.auditRow.model_number).trim(),
    brand_slug: brandSlug,
    audit_classification: "PROVEN_CORRECT",
    mapped_filter_slugs: mappedFilterSlugs,
    manual_evidence_path: manualEvidencePath,
    manual_evidence_public_ready: manualEvidencePublicReady,
    already_in_page_factory_registry: alreadyInRegistry,
    registry_target: registryTarget,
    recommended_registry_row_proposal,
    quality_gate_status,
    eligible_for_owner_review,
    blockers,
  };
}

export function buildProvenCohortPageFactoryManifestV1(args: {
  rootDir: string;
  auditJsonRelPath?: string;
  now?: () => Date;
}): ProvenCohortPageFactoryManifestV1 {
  const now = args.now ?? (() => new Date());
  const auditPath = args.auditJsonRelPath ?? MODEL_FILTER_CORRECTNESS_AUDIT_JSON_REL_V1;
  const audit = loadAuditReport(args.rootDir);

  const provenRows = audit.model_rows.filter((row) => row.classification === "PROVEN_CORRECT");
  if (provenRows.length !== audit.classification_counts.PROVEN_CORRECT) {
    throw new Error(
      `PROVEN_CORRECT row count mismatch: filtered=${String(provenRows.length)} summary=${String(audit.classification_counts.PROVEN_CORRECT)}`,
    );
  }

  const fridgeModels = readCsv<FridgeModelRow>(args.rootDir, "data/fridge_models.csv");
  const filtersRaw = readCsv<FilterRow>(args.rootDir, "data/filters.csv");
  readCsv(args.rootDir, "data/compatibility_mappings.csv");

  const modelBySlug = new Map(
    fridgeModels.map((row) => [normalizeSlug(row.slug), row] as const),
  );
  const filterOemBySlug = new Map(
    filtersRaw.map(
      (row) => [normalizeSlug(row.slug), (row.oem_part_number ?? row.slug).trim()] as const,
    ),
  );

  const registrySlugs = loadRegistrySlugs(args.rootDir);
  const qualityGateBySlug = loadQualityGateArtifacts(args.rootDir);

  const cohort_rows = provenRows
    .map((auditRow) =>
      buildCohortRow({
        rootDir: args.rootDir,
        auditRow,
        modelBySlug,
        filterOemBySlug,
        registrySlugs,
        qualityGateBySlug,
      }),
    )
    .sort((a, b) => a.fridge_slug.localeCompare(b.fridge_slug));

  const eligible_for_owner_review_count = cohort_rows.filter(
    (row) => row.eligible_for_owner_review,
  ).length;
  const already_registered_count = cohort_rows.filter(
    (row) => row.already_in_page_factory_registry,
  ).length;

  return {
    contract: PROVEN_COHORT_PAGE_FACTORY_MANIFEST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_audit_contract: MODEL_FILTER_CORRECTNESS_AUDIT_CONTRACT_V1,
    source_audit_path: auditPath,
    clone_anchor_slug: PROVEN_COHORT_CLONE_ANCHOR_SLUG_V1,
    proven_correct_slug_count: cohort_rows.length,
    eligible_for_owner_review_count,
    already_registered_count,
    cohort_rows,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        cohort_rows: ".cohort_rows",
        eligible_for_owner_review_count: ".eligible_for_owner_review_count",
      },
      recommended_next_action:
        eligible_for_owner_review_count > 0
          ? "Owner review: run read-only page-factory evidence-clone + quality-gate batch against proven-cohort manifest slugs before any registry CSV apply."
          : "Resolve cohort blockers before Page Factory owner review.",
    },
    exact_repo_paths_read: [
      auditPath,
      PAGE_FACTORY_TARGETS_CSV_REL_V1,
      MANUAL_EVIDENCE_DIR_REL_V1,
      PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1,
      "data/fridge_models.csv",
      "data/compatibility_mappings.csv",
      "data/filters.csv",
    ].sort(),
    proven_facts: [
      `PROVEN: proven_correct_slug_count=${String(cohort_rows.length)} sourced from ${auditPath}.`,
      `PROVEN: eligible_for_owner_review_count=${String(eligible_for_owner_review_count)}.`,
      `PROVEN: already_registered_count=${String(already_registered_count)} in ${PAGE_FACTORY_TARGETS_CSV_REL_V1}.`,
      "PROVEN: Read-only manifest — no compat, registry, Supabase, sitemap, robots, or page mutations.",
    ],
    unknown_facts: [
      "UNKNOWN: Live Supabase compat/registry rows vs committed CSV — manifest is repo-file truth only.",
    ],
  };
}

function renderMarkdown(report: ProvenCohortPageFactoryManifestV1): string {
  const lines = [
    "# Proven cohort Page Factory manifest v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- source_audit: **${report.source_audit_path}**`,
    `- proven_correct_slug_count: **${String(report.proven_correct_slug_count)}**`,
    `- eligible_for_owner_review_count: **${String(report.eligible_for_owner_review_count)}**`,
    `- already_registered_count: **${String(report.already_registered_count)}**`,
    `- clone_anchor_slug: **${report.clone_anchor_slug}**`,
    "",
    "## Cohort rows",
    "",
  ];

  for (const row of report.cohort_rows) {
    lines.push(
      `### ${row.fridge_slug}`,
      "",
      `- mapped_filter_slugs: \`${row.mapped_filter_slugs.join("|")}\``,
      `- manual_evidence_path: \`${row.manual_evidence_path}\``,
      `- already_in_page_factory_registry: **${String(row.already_in_page_factory_registry)}**`,
      `- eligible_for_owner_review: **${String(row.eligible_for_owner_review)}**`,
      `- blockers: ${row.blockers.length > 0 ? row.blockers.join("; ") : "none"}`,
      "",
    );
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action);
  return `${lines.join("\n")}\n`;
}

export function writeProvenCohortPageFactoryManifestArtifactsV1(args: {
  rootDir: string;
  report: ProvenCohortPageFactoryManifestV1;
}): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const jsonAbs = path.join(args.rootDir, PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, PROVEN_COHORT_PAGE_FACTORY_MANIFEST_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderMarkdown(args.report), "utf8");
  return {
    jsonRelPath: PROVEN_COHORT_PAGE_FACTORY_MANIFEST_JSON_REL_V1,
    mdRelPath: PROVEN_COHORT_PAGE_FACTORY_MANIFEST_MD_REL_V1,
  };
}
