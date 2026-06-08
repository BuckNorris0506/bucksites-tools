/**
 * Read-only Page Factory evidence clone v1 — owner-review packet only.
 * Proposes inherit plan from proven source slug to target slug within a family key.
 * Does not mutate evidence, drafts, compat, registry, Supabase, or buyer-path data.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
  type RefrigeratorManualEvidenceSource,
} from "@/lib/manuals/refrigerator-manual-evidence";

import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_CANONICAL_FILTER_SLUG_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
  type CatalogSlugBucketV1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";
import {
  SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

export const BUCKPARTS_PAGE_FACTORY_EVIDENCE_CLONE_CONTRACT_V1 =
  "buckparts_page_factory_evidence_clone_v1" as const;

export const PAGE_FACTORY_EVIDENCE_CLONE_ARTIFACT_DIR_REL_V1 =
  "data/fridge/batch-production/page-factory/evidence-clone-v1" as const;

export const SUPPORTED_FAMILY_KEYS_V1 = ["samsung::HAFQIN"] as const;

export type SupportedFamilyKeyV1 = (typeof SUPPORTED_FAMILY_KEYS_V1)[number];

export type PageFactoryEvidenceCloneStatusV1 =
  | "READY_TO_DRAFT"
  | "NEEDS_TARGET_EVIDENCE"
  | "BLOCKED";

export type EvidenceReadinessStatusV1 = "PASS" | "BLOCKED" | "UNKNOWN";

export type CatalogPresenceStatusV1 = "PASS" | "BLOCKED" | "UNKNOWN";

export type WildcardReviewLinkStatusV1 = "PASS" | "WARN" | "BLOCKED" | "UNKNOWN";

export type FamilyContractV1 = {
  family_key: SupportedFamilyKeyV1;
  official_marketing_token: string;
  canonical_filter_slug: string;
  allowed_filter_slugs: readonly string[];
  forbidden_filter_slugs: readonly string[];
  cross_reference_module: string;
};

export type InheritPlanItemV1 = {
  source_slug: string;
  source_evidence_relpath: string;
  source_url: string;
  source_title: string;
  evidence_role: RefrigeratorManualEvidenceSource["evidence_role"];
  inheritability: "INHERIT_FAMILY_LEVEL" | "NOT_INHERITABLE_AS_TARGET_FILTER_SPECIFICATION";
  rationale: string;
};

export type RequiredTargetProofItemV1 = {
  proof_id: string;
  description: string;
  required: true;
};

export type CompatObservedV1 = {
  target_compat_filter_slugs: string[];
  canonical_filter_slug: string;
  has_canonical_mapping: boolean;
  has_forbidden_haf_cin_mapping: boolean;
  legacy_mapping_note: string;
};

export type PageFactoryEvidenceCloneReportV1 = {
  contract: typeof BUCKPARTS_PAGE_FACTORY_EVIDENCE_CLONE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  clone_status: PageFactoryEvidenceCloneStatusV1;
  source_slug: string;
  target_slug: string;
  family_key: string;
  family_contract: FamilyContractV1 | null;
  source_evidence_status: EvidenceReadinessStatusV1;
  target_catalog_status: CatalogPresenceStatusV1;
  wildcard_review_status: WildcardReviewLinkStatusV1;
  compat_observed: CompatObservedV1 | null;
  inherit_plan: InheritPlanItemV1[];
  required_target_proof: RequiredTargetProofItemV1[];
  blockers: string[];
  warnings: string[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildPageFactoryEvidenceCloneArgsV1 = {
  rootDir: string;
  sourceSlug: string;
  targetSlug: string;
  familyKey: string;
  wildcardReviewJsonRelPath?: string;
  secondarySiblingSlug?: string;
  now?: () => Date;
};

export const PAGE_FACTORY_EVIDENCE_CLONE_ALLOWED_WRITE_REL_PATHS_V1 = [
  `${PAGE_FACTORY_EVIDENCE_CLONE_ARTIFACT_DIR_REL_V1}/*-owner-review-packet-v1.json`,
  "data/fridge/batch-production/drafts/page-factory-evidence-clone-*-v1.md",
] as const;

const MANUAL_EVIDENCE_DIR_REL = "data/manual-evidence/refrigerator";

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function manualEvidenceRelPath(slug: string): string {
  return `${MANUAL_EVIDENCE_DIR_REL}/${slug}.json`;
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  const abs = path.join(rootDir, relPath);
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  const abs = path.join(rootDir, relPath);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

export function resolveFamilyContractV1(
  familyKey: string,
): { contract: FamilyContractV1 | null; blocker: string | null } {
  const normalized = familyKey.trim();
  if (normalized !== "samsung::HAFQIN") {
    return {
      contract: null,
      blocker: `unsupported family_key: ${familyKey} (v1 supports samsung::HAFQIN only)`,
    };
  }
  const family = SAMSUNG_REFRIGERATOR_MARKETING_TOKEN_FAMILIES_V1.HAFQIN;
  return {
    contract: {
      family_key: "samsung::HAFQIN",
      official_marketing_token: family.marketing_token,
      canonical_filter_slug: family.canonical_filter_slug,
      allowed_filter_slugs: family.allowed_filter_slugs,
      forbidden_filter_slugs: [...HAF_CIN_CANONICAL_FILTER_SLUGS_V1],
      cross_reference_module:
        "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
    },
    blocker: null,
  };
}

function loadManualEvidenceRecord(
  rootDir: string,
  slug: string,
): { relPath: string; record: RefrigeratorManualEvidenceRecord | null; blocker: string | null } {
  const relPath = manualEvidenceRelPath(slug);
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return {
      relPath,
      record: null,
      blocker: `missing source evidence file: ${relPath}`,
    };
  }
  const record = readJsonFile<RefrigeratorManualEvidenceRecord>(rootDir, relPath);
  return { relPath, record, blocker: null };
}

function normalizedEvidenceSources(
  record: RefrigeratorManualEvidenceRecord,
): RefrigeratorManualEvidenceSource[] {
  if (Array.isArray(record.sources) && record.sources.length > 0) return record.sources;
  return [
    {
      source_type: record.source_type,
      source_url: record.source_url,
      source_title: record.source_title,
      source_host: record.source_host,
      evidence_role: "replacement_process_guidance",
    },
  ];
}

function isFamilyLevelInheritableSource(source: RefrigeratorManualEvidenceSource): boolean {
  const url = source.source_url.toLowerCase();
  const title = source.source_title.toLowerCase();
  if (url.includes("haf-qin-refrigerator-water-filter")) return true;
  if (url.includes("water-filters/find-your-water-filter")) return true;
  if (url.includes("/support/answer/ans10005090")) return true;
  if (source.evidence_role === "replacement_process_guidance") return true;
  if (title.includes("haf-qin") && source.evidence_role === "model_support_context") return true;
  return false;
}

function buildInheritPlanForRecord(args: {
  sourceSlug: string;
  evidenceRelPath: string;
  record: RefrigeratorManualEvidenceRecord;
  targetModelNumber: string;
}): InheritPlanItemV1[] {
  const items: InheritPlanItemV1[] = [];
  for (const source of normalizedEvidenceSources(args.record)) {
    const titleUpper = source.source_title.toUpperCase();
    const isSourceModelSpecificFilterSpec =
      source.evidence_role === "filter_specification" &&
      !titleUpper.includes(args.targetModelNumber.toUpperCase());

    if (isSourceModelSpecificFilterSpec) {
      items.push({
        source_slug: args.sourceSlug,
        source_evidence_relpath: args.evidenceRelPath,
        source_url: source.source_url,
        source_title: source.source_title,
        evidence_role: source.evidence_role,
        inheritability: "NOT_INHERITABLE_AS_TARGET_FILTER_SPECIFICATION",
        rationale:
          "Source filter_specification names a different finish/model; cannot serve as WW Tier-1 filter_specification without target-specific proof.",
      });
      continue;
    }

    if (isFamilyLevelInheritableSource(source)) {
      items.push({
        source_slug: args.sourceSlug,
        source_evidence_relpath: args.evidenceRelPath,
        source_url: source.source_url,
        source_title: source.source_title,
        evidence_role: source.evidence_role,
        inheritability: "INHERIT_FAMILY_LEVEL",
        rationale: "Family-level Samsung HAF-QIN support source shared across finish variants.",
      });
    }
  }
  return items;
}

function dedupeInheritPlan(items: InheritPlanItemV1[]): InheritPlanItemV1[] {
  const seen = new Set<string>();
  const out: InheritPlanItemV1[] = [];
  for (const item of items) {
    const key = `${item.source_url}|${item.inheritability}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function loadTargetCatalogRow(
  rootDir: string,
  targetSlug: string,
): { model_number: string | null; blocker: string | null } {
  const rows = readCsv<{ brand_slug: string; slug: string; model_number: string }>(
    rootDir,
    "data/fridge_models.csv",
  );
  const row = rows.find((entry) => normalizeSlug(entry.slug) === targetSlug);
  if (!row) {
    return { model_number: null, blocker: `target slug not found in fridge_models.csv: ${targetSlug}` };
  }
  return { model_number: row.model_number.trim(), blocker: null };
}

function loadTargetCompatSlugs(rootDir: string, targetSlug: string): string[] {
  const rows = readCsv<{ fridge_slug: string; filter_slug: string }>(
    rootDir,
    "data/compatibility_mappings.csv",
  );
  return rows
    .filter((row) => normalizeSlug(row.fridge_slug) === targetSlug)
    .map((row) => normalizeSlug(row.filter_slug))
    .sort();
}

function loadWildcardTargetRow(
  rootDir: string,
  targetSlug: string,
  reviewRelPath: string,
): { row: CatalogSlugRowV1 | null; blocker: string | null; status: WildcardReviewLinkStatusV1 } {
  const abs = path.join(rootDir, reviewRelPath);
  if (!existsSync(abs)) {
    return {
      row: null,
      blocker: null,
      status: "UNKNOWN",
    };
  }
  const review = readJsonFile<{ catalog_slug_rows: CatalogSlugRowV1[] }>(rootDir, reviewRelPath);
  const row = review.catalog_slug_rows.find((entry) => entry.fridge_slug === targetSlug) ?? null;
  if (!row) {
    return {
      row: null,
      blocker: null,
      status: "WARN",
    };
  }
  return { row, blocker: null, status: "PASS" };
}

function buildRequiredTargetProof(targetModelNumber: string): RequiredTargetProofItemV1[] {
  return [
    {
      proof_id: "tier1_filter_specification_target_model",
      description: `Tier-1 manufacturer filter_specification naming ${targetModelNumber} with HAF-QIN / DA97-17376B (not SR/SG finish-only proof).`,
      required: true,
    },
    {
      proof_id: "public_ready_target_evidence_json",
      description: `Public-ready manual evidence JSON at ${MANUAL_EVIDENCE_DIR_REL}/{target-slug}.json with fridge_model_slug matching target.`,
      required: true,
    },
    {
      proof_id: "owner_finish_variant_confirmation",
      description:
        "Owner confirmation that finish suffix shares HAF-QIN cartridge family, or WW-specific Samsung spec/Filter Finder line captured.",
      required: true,
    },
  ];
}

export function hasModelSpecificPublicReadyEvidenceV1(
  rootDir: string,
  targetSlug: string,
  targetModelNumber: string,
): boolean {
  const relPath = manualEvidenceRelPath(targetSlug);
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) return false;
  const record = readJsonFile<RefrigeratorManualEvidenceRecord>(rootDir, relPath);
  const readiness = validateRefrigeratorManualEvidencePublicReady(record);
  if (!readiness.ok) return false;
  return normalizedEvidenceSources(record).some(
    (source) =>
      source.evidence_role === "filter_specification" &&
      source.source_title.toUpperCase().includes(targetModelNumber.toUpperCase()),
  );
}

export function buildPageFactoryEvidenceCloneReportV1(
  args: BuildPageFactoryEvidenceCloneArgsV1,
): PageFactoryEvidenceCloneReportV1 {
  const rootDir = args.rootDir;
  const sourceSlug = normalizeSlug(args.sourceSlug);
  const targetSlug = normalizeSlug(args.targetSlug);
  const generatedAt = (args.now ?? (() => new Date()))().toISOString();
  const wildcardReviewRel =
    args.wildcardReviewJsonRelPath ?? HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1;

  const exactRepoPathsRead = new Set<string>([
    "data/fridge_models.csv",
    "data/compatibility_mappings.csv",
    wildcardReviewRel,
    "scripts/lib/refrigerator-model-first-samsung-marketing-token-cross-reference-v1.ts",
    manualEvidenceRelPath(sourceSlug),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const provenFacts: string[] = [];
  const unknownFacts: string[] = [];

  const { contract: familyContract, blocker: familyBlocker } = resolveFamilyContractV1(
    args.familyKey,
  );
  if (familyBlocker) blockers.push(familyBlocker);

  const sourceEvidence = loadManualEvidenceRecord(rootDir, sourceSlug);
  exactRepoPathsRead.add(sourceEvidence.relPath);

  let sourceEvidenceStatus: EvidenceReadinessStatusV1 = "UNKNOWN";
  if (sourceEvidence.blocker) {
    blockers.push(sourceEvidence.blocker);
    sourceEvidenceStatus = "BLOCKED";
  } else if (sourceEvidence.record) {
    const readiness = validateRefrigeratorManualEvidencePublicReady(sourceEvidence.record);
    if (readiness.ok) {
      sourceEvidenceStatus = "PASS";
      provenFacts.push(`source_evidence_public_ready=${sourceSlug}`);
    } else {
      sourceEvidenceStatus = "BLOCKED";
      blockers.push(
        `source evidence not public-ready: ${readiness.errors.join("; ")}`,
      );
    }
  }

  const targetCatalog = loadTargetCatalogRow(rootDir, targetSlug);
  let targetCatalogStatus: CatalogPresenceStatusV1 = "UNKNOWN";
  if (targetCatalog.blocker) {
    blockers.push(targetCatalog.blocker);
    targetCatalogStatus = "BLOCKED";
  } else {
    targetCatalogStatus = "PASS";
    provenFacts.push(`target_catalog_present=${targetSlug}`);
  }

  const wildcard = loadWildcardTargetRow(rootDir, targetSlug, wildcardReviewRel);
  exactRepoPathsRead.add(wildcardReviewRel);
  let wildcardReviewStatus = wildcard.status;
  if (wildcard.row) {
    provenFacts.push(`wildcard_review_bucket=${wildcard.row.bucket}`);
    if (wildcard.row.bucket === "BLOCKED_HAF_CIN_CANONICAL") {
      blockers.push(
        `target wildcard review bucket is BLOCKED_HAF_CIN_CANONICAL (${targetSlug})`,
      );
      wildcardReviewStatus = "BLOCKED";
    }
  } else if (wildcardReviewStatus === "WARN") {
    warnings.push(`target slug not found in wildcard review JSON: ${targetSlug}`);
  } else if (wildcardReviewStatus === "UNKNOWN") {
    unknownFacts.push(`wildcard review JSON missing: ${wildcardReviewRel}`);
  }

  const targetCompat = loadTargetCompatSlugs(rootDir, targetSlug);
  const hasForbidden = HAF_CIN_CANONICAL_FILTER_SLUGS_V1.some((slug) =>
    targetCompat.includes(slug),
  );
  const hasCanonical = targetCompat.includes(HAF_QIN_CANONICAL_FILTER_SLUG_V1);
  if (hasForbidden) {
    blockers.push(
      `target compat includes HAF-CIN canonical slug(s): ${HAF_CIN_CANONICAL_FILTER_SLUGS_V1.filter((s) => targetCompat.includes(s)).join(", ")}`,
    );
  }

  const compatObserved: CompatObservedV1 | null = familyContract
    ? {
        target_compat_filter_slugs: targetCompat,
        canonical_filter_slug: familyContract.canonical_filter_slug,
        has_canonical_mapping: hasCanonical,
        has_forbidden_haf_cin_mapping: hasForbidden,
        legacy_mapping_note: hasCanonical
          ? "Target has canonical HAF-QIN mapping in compat CSV."
          : `Target lacks ${familyContract.canonical_filter_slug}; observed legacy slugs only.`,
      }
    : null;

  if (compatObserved && !compatObserved.has_canonical_mapping) {
    warnings.push(
      `target compat does not include canonical ${HAF_QIN_CANONICAL_FILTER_SLUG_V1}; compat reconciliation remains a separate owner-approved step`,
    );
  }

  const inheritPlan: InheritPlanItemV1[] = [];
  if (sourceEvidence.record && sourceEvidenceStatus === "PASS" && targetCatalog.model_number) {
    inheritPlan.push(
      ...buildInheritPlanForRecord({
        sourceSlug,
        evidenceRelPath: sourceEvidence.relPath,
        record: sourceEvidence.record,
        targetModelNumber: targetCatalog.model_number,
      }),
    );
  }

  const secondarySlug = args.secondarySiblingSlug
    ? normalizeSlug(args.secondarySiblingSlug)
    : sourceSlug.endsWith("sr")
      ? sourceSlug.replace(/sr$/, "sg")
      : null;
  if (secondarySlug && secondarySlug !== sourceSlug) {
    const siblingEvidence = loadManualEvidenceRecord(rootDir, secondarySlug);
    exactRepoPathsRead.add(siblingEvidence.relPath);
    if (siblingEvidence.record && !siblingEvidence.blocker) {
      const siblingReady = validateRefrigeratorManualEvidencePublicReady(siblingEvidence.record);
      if (siblingReady.ok && targetCatalog.model_number) {
        inheritPlan.push(
          ...buildInheritPlanForRecord({
            sourceSlug: secondarySlug,
            evidenceRelPath: siblingEvidence.relPath,
            record: siblingEvidence.record,
            targetModelNumber: targetCatalog.model_number,
          }),
        );
        provenFacts.push(`secondary_sibling_evidence_included=${secondarySlug}`);
      }
    }
  }

  const dedupedInheritPlan = dedupeInheritPlan(inheritPlan);
  const requiredTargetProof = targetCatalog.model_number
    ? buildRequiredTargetProof(targetCatalog.model_number)
    : [];

  let cloneStatus: PageFactoryEvidenceCloneStatusV1 = "NEEDS_TARGET_EVIDENCE";
  if (blockers.length > 0) {
    cloneStatus = "BLOCKED";
  } else if (
    targetCatalog.model_number &&
    hasModelSpecificPublicReadyEvidenceV1(rootDir, targetSlug, targetCatalog.model_number)
  ) {
    cloneStatus = "READY_TO_DRAFT";
  } else {
    cloneStatus = "NEEDS_TARGET_EVIDENCE";
  }

  if (sourceEvidenceStatus === "UNKNOWN") {
    unknownFacts.push("source_evidence_status unresolved");
  }

  return {
    contract: BUCKPARTS_PAGE_FACTORY_EVIDENCE_CLONE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: generatedAt,
    clone_status: cloneStatus,
    source_slug: sourceSlug,
    target_slug: targetSlug,
    family_key: args.familyKey.trim(),
    family_contract: familyContract,
    source_evidence_status: sourceEvidenceStatus,
    target_catalog_status: targetCatalogStatus,
    wildcard_review_status: wildcardReviewStatus,
    compat_observed: compatObserved,
    inherit_plan: dedupedInheritPlan,
    required_target_proof: requiredTargetProof,
    blockers,
    warnings,
    exact_repo_paths_read: [...exactRepoPathsRead].sort(),
    proven_facts: provenFacts,
    unknown_facts: unknownFacts,
  };
}

export function evidenceCloneArtifactRelPathsV1(targetSlug: string): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const slug = normalizeSlug(targetSlug);
  return {
    jsonRelPath: `${PAGE_FACTORY_EVIDENCE_CLONE_ARTIFACT_DIR_REL_V1}/${slug}-owner-review-packet-v1.json`,
    mdRelPath: `data/fridge/batch-production/drafts/page-factory-evidence-clone-${slug}-v1.md`,
  };
}

export function buildPageFactoryEvidenceCloneMarkdownV1(
  report: PageFactoryEvidenceCloneReportV1,
): string {
  const lines = [
    "# Page Factory evidence clone owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Stop condition",
    "",
    "Read-only clone packet only. Does **not** write manual evidence, Page 1 drafts, compat CSV, registry rows, Supabase, or buyer-path data.",
    "",
    "## Summary",
    "",
    `- clone_status: **${report.clone_status}**`,
    `- source_slug: \`${report.source_slug}\``,
    `- target_slug: \`${report.target_slug}\``,
    `- family_key: \`${report.family_key}\``,
    `- source_evidence_status: **${report.source_evidence_status}**`,
    `- target_catalog_status: **${report.target_catalog_status}**`,
    `- wildcard_review_status: **${report.wildcard_review_status}**`,
    "",
  ];

  if (report.compat_observed) {
    lines.push(
      "### Compat observed",
      "",
      `- target_compat_filter_slugs: ${report.compat_observed.target_compat_filter_slugs.join(", ") || "—"}`,
      `- has_canonical_mapping: **${report.compat_observed.has_canonical_mapping}**`,
      `- has_forbidden_haf_cin_mapping: **${report.compat_observed.has_forbidden_haf_cin_mapping}**`,
      "",
    );
  }

  if (report.blockers.length > 0) {
    lines.push("### Blockers", "");
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
    lines.push("");
  }

  lines.push("### Inherit plan", "", "| inheritability | source | title |", "|---|---|---|");
  for (const item of report.inherit_plan) {
    lines.push(
      `| ${item.inheritability} | \`${item.source_slug}\` | ${item.source_title} |`,
    );
  }

  lines.push("", "### Required target proof", "");
  for (const item of report.required_target_proof) {
    lines.push(`- **${item.proof_id}:** ${item.description}`);
  }

  return `${lines.join("\n")}\n`;
}

export function writePageFactoryEvidenceCloneArtifactsV1(args: {
  rootDir: string;
  report: PageFactoryEvidenceCloneReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const paths = evidenceCloneArtifactRelPathsV1(args.report.target_slug);
  const jsonAbs = path.join(args.rootDir, paths.jsonRelPath);
  const mdAbs = path.join(args.rootDir, paths.mdRelPath);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildPageFactoryEvidenceCloneMarkdownV1(args.report), "utf8");
  return paths;
}
