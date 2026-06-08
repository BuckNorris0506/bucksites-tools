/**
 * Read-only Page Quality Gate v1 — publication classification before batch page publish.
 * Does not mutate compat, Supabase, retailer links, sitemap, robots, or public pages.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  getFridgeModelReviewOverride,
  isFridgeModelUnderOwnerReview,
} from "@/lib/fridge/fridge-model-review-overrides";
import {
  manualSourcePublicTier,
  validateRefrigeratorManualEvidencePublicReady,
  type RefrigeratorManualEvidenceRecord,
  type RefrigeratorManualEvidenceSource,
} from "@/lib/manuals/refrigerator-manual-evidence";
import { classifyPageState, PAGE_STATES, type PageState } from "@/lib/page-state/page-state";
import { getRobotsFromPageState } from "@/lib/page-state/page-state-meta";
import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

import {
  buildPageFactoryEvidenceCloneReportV1,
  hasModelSpecificPublicReadyEvidenceV1,
  type PageFactoryEvidenceCloneReportV1,
} from "./buckparts-page-factory-evidence-clone-v1";
import {
  buildPageFactoryPreflightReportV1,
  loadPageFactoryTargetFromRegistryV1,
  PAGE_FACTORY_TARGETS_CSV_REL_V1,
  type PageFactoryPreflightGateV1,
  type PageFactoryTargetV1,
} from "./buckparts-page-factory-preflight-v1";
import { legacyFilterSlugsMatchOfficialTokenV1 } from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";
import {
  HAF_CIN_CANONICAL_FILTER_SLUGS_V1,
  HAF_QIN_CANONICAL_FILTER_SLUG_V1,
  HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
  OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
  type CatalogSlugRowV1,
} from "./samsung-haf-qin-wildcard-expansion-review-v1";

export const BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1 = "buckparts_page_quality_gate_v1" as const;

export const PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1 =
  "data/fridge/batch-production/page-factory/quality-gate-v1" as const;

export const PAGE_FACTORY_EVIDENCE_CLONE_BATCH_MANIFEST_DIR_REL_V1 =
  "data/fridge/batch-production/page-factory/evidence-clone-batch-v1" as const;

export type PageQualityClassificationV1 =
  | "INDEXABLE_VERIFIED"
  | "INDEXABLE_NO_BUY_LINK"
  | "NOINDEX_REVIEW"
  | "BLOCKED";

export type PageQualityGateStatusV1 = "PASS" | "BLOCKED" | "UNKNOWN" | "WARN";

export type PageQualityGateV1 = {
  gate_id: string;
  status: PageQualityGateStatusV1;
  blockers: string[];
  proof_paths_read: string[];
  observed?: Record<string, unknown>;
};

export type PageQualityGateInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: ".command_center_v2.buckparts_page_quality_gate_v1.inspect_summary";
  };
  fridge_slug: string;
  quality_classification: PageQualityClassificationV1;
  publication_authorized: boolean;
  recommended_page_state: PageState;
  recommended_robots: { index: boolean; follow: true };
  recommended_sitemap_include: boolean;
  clone_status: string | null;
  preflight_status: string | null;
  verified_buy_link_count: number;
  quality_gate_status_counts: Record<PageQualityGateStatusV1, number>;
  top_blockers: string[];
  recommended_next_action: string;
};

export type PageQualityGateReportV1 = {
  contract: typeof BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  fridge_slug: string;
  target_source: "page_factory_registry" | "inferred_catalog_wildcard";
  registry_source: string | null;
  quality_classification: PageQualityClassificationV1;
  publication_authorized: boolean;
  recommended_page_state: PageState;
  recommended_robots: { index: boolean; follow: true };
  recommended_sitemap_include: boolean;
  gates: PageQualityGateV1[];
  inspect_summary: PageQualityGateInspectSummaryV1;
  clone_packet: PageFactoryEvidenceCloneReportV1 | null;
  preflight_gates: PageFactoryPreflightGateV1[] | null;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type PageQualityGateBatchManifestPairV1 = {
  target_slug: string;
  source_slug?: string;
  family_key?: string;
  pair_status?: string;
};

export type PageQualityGateBatchManifestV1 = {
  batch_id: string;
  pairs: PageQualityGateBatchManifestPairV1[];
};

export type PageQualityGateBatchReportV1 = {
  contract: typeof BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_blocked_until_owner_approval: true;
  mutation_authorized: false;
  generated_at: string;
  batch_id: string;
  manifest_path: string;
  review_status: "READY_FOR_OWNER_REVIEW" | "BLOCKED_INPUT";
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      command_center: ".command_center_v2.buckparts_page_quality_gate_batch_v1.inspect_summary";
    };
    batch_id: string;
    pair_count: number;
    quality_classification_counts: Record<PageQualityClassificationV1, number>;
    publication_authorized_count: number;
    recommended_sitemap_include_count: number;
    top_blockers: string[];
    recommended_next_action: string;
  };
  pair_reports: PageQualityGateReportV1[];
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildPageQualityGateArgsV1 = {
  rootDir: string;
  fridgeSlug: string;
  registryRelPath?: string;
  wildcardReviewJsonRelPath?: string;
  clonePacketJsonRelPath?: string;
  cloneSourceSlug?: string;
  cloneFamilyKey?: string;
  checkSupabase?: boolean;
  now?: () => Date;
};

export const PAGE_QUALITY_GATE_ALLOWED_WRITE_REL_PATHS_V1 = [
  `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/*`,
  "data/fridge/batch-production/drafts/page-factory-quality-gate-*-v1.md",
] as const;

const MANUAL_EVIDENCE_DIR_REL = "data/manual-evidence/refrigerator";

type FridgeModelRow = { brand_slug: string; slug: string; model_number: string };
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

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  const abs = path.join(rootDir, relPath);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function readJsonFile<T>(rootDir: string, relPath: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, relPath), "utf8")) as T;
}

function gate(
  gate_id: string,
  status: PageQualityGateStatusV1,
  blockers: string[],
  proof_paths_read: string[],
  observed?: Record<string, unknown>,
): PageQualityGateV1 {
  return { gate_id, status, blockers, proof_paths_read, ...(observed ? { observed } : {}) };
}

function manualEvidenceRelPath(slug: string): string {
  return `${MANUAL_EVIDENCE_DIR_REL}/${slug}.json`;
}

function normalizedEvidenceSources(
  record: Partial<RefrigeratorManualEvidenceRecord>,
): RefrigeratorManualEvidenceSource[] {
  if (Array.isArray(record.sources) && record.sources.length > 0) return record.sources;
  if (
    typeof record.source_type === "string" &&
    typeof record.source_url === "string" &&
    typeof record.source_title === "string" &&
    typeof record.source_host === "string"
  ) {
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
  return [];
}

function compatSlugsForModel(rootDir: string, fridgeSlug: string): string[] {
  const mappings = readCsv<MappingRow>(rootDir, "data/compatibility_mappings.csv");
  return mappings
    .filter((r) => normalizeSlug(r.fridge_slug) === fridgeSlug)
    .map((r) => normalizeSlug(r.filter_slug))
    .sort();
}

function loadCatalogRow(
  rootDir: string,
  fridgeSlug: string,
): { row: FridgeModelRow | null; blocker: string | null } {
  const rows = readCsv<FridgeModelRow>(rootDir, "data/fridge_models.csv");
  const row = rows.find((entry) => normalizeSlug(entry.slug) === fridgeSlug) ?? null;
  if (!row) {
    return { row: null, blocker: `missing fridge_models.csv row for ${fridgeSlug}` };
  }
  return { row, blocker: null };
}

function loadWildcardRow(
  rootDir: string,
  fridgeSlug: string,
  reviewRelPath: string,
): CatalogSlugRowV1 | null {
  const abs = path.join(rootDir, reviewRelPath);
  if (!existsSync(abs)) return null;
  const review = readJsonFile<{ catalog_slug_rows: CatalogSlugRowV1[] }>(rootDir, reviewRelPath);
  return review.catalog_slug_rows.find((entry) => entry.fridge_slug === fridgeSlug) ?? null;
}

export function tryLoadPageFactoryTargetFromRegistryV1(args: {
  rootDir: string;
  fridgeSlug: string;
  registryRelPath?: string;
}): PageFactoryTargetV1 | null {
  try {
    return loadPageFactoryTargetFromRegistryV1(args);
  } catch {
    return null;
  }
}

export function inferPageFactoryTargetFromCatalogWildcardV1(args: {
  rootDir: string;
  fridgeSlug: string;
  wildcardReviewJsonRelPath?: string;
}): { target: PageFactoryTargetV1 | null; blocker: string | null } {
  const slug = normalizeSlug(args.fridgeSlug);
  const catalog = loadCatalogRow(args.rootDir, slug);
  if (catalog.blocker || !catalog.row) {
    return { target: null, blocker: catalog.blocker };
  }

  const reviewRel = args.wildcardReviewJsonRelPath ?? HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1;
  const wildcardRow = loadWildcardRow(args.rootDir, slug, reviewRel);

  return {
    target: {
      fridge_slug: slug,
      expected_filter_slugs: [HAF_QIN_CANONICAL_FILTER_SLUG_V1],
      forbidden_filter_slugs: [...HAF_CIN_CANONICAL_FILTER_SLUGS_V1],
      official_marketing_token: OFFICIAL_MARKETING_TOKEN_HAF_QIN_V1,
      draft_md_relpath: `data/fridge/batch-production/drafts/${slug}-page-1-draft-v1.md`,
      evidence_json_relpath: manualEvidenceRelPath(slug),
    },
    blocker: null,
  };
}

export function resolvePageFactoryTargetForQualityGateV1(args: {
  rootDir: string;
  fridgeSlug: string;
  registryRelPath?: string;
  wildcardReviewJsonRelPath?: string;
}): {
  target: PageFactoryTargetV1;
  target_source: "page_factory_registry" | "inferred_catalog_wildcard";
  registry_source: string | null;
  wildcard_row: CatalogSlugRowV1 | null;
  catalog_row: FridgeModelRow;
} {
  const registryRel = args.registryRelPath ?? PAGE_FACTORY_TARGETS_CSV_REL_V1;
  const reviewRel = args.wildcardReviewJsonRelPath ?? HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1;
  const slug = normalizeSlug(args.fridgeSlug);

  const registryTarget = tryLoadPageFactoryTargetFromRegistryV1({
    rootDir: args.rootDir,
    fridgeSlug: slug,
    registryRelPath: registryRel,
  });
  const catalog = loadCatalogRow(args.rootDir, slug);
  if (catalog.blocker || !catalog.row) {
    throw new Error(catalog.blocker ?? `missing catalog row for ${slug}`);
  }

  const wildcardRow = loadWildcardRow(args.rootDir, slug, reviewRel);

  if (registryTarget) {
    return {
      target: registryTarget,
      target_source: "page_factory_registry",
      registry_source: registryRel,
      wildcard_row: wildcardRow,
      catalog_row: catalog.row,
    };
  }

  const inferred = inferPageFactoryTargetFromCatalogWildcardV1({
    rootDir: args.rootDir,
    fridgeSlug: slug,
    wildcardReviewJsonRelPath: reviewRel,
  });
  if (!inferred.target) {
    throw new Error(inferred.blocker ?? `unable to infer target for ${slug}`);
  }

  return {
    target: inferred.target,
    target_source: "inferred_catalog_wildcard",
    registry_source: null,
    wildcard_row: wildcardRow,
    catalog_row: catalog.row,
  };
}

function loadEvidenceRecord(
  rootDir: string,
  relPath: string,
): { record: RefrigeratorManualEvidenceRecord | null; blocker: string | null } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { record: null, blocker: `missing evidence file: ${relPath}` };
  }
  return { record: readJsonFile<RefrigeratorManualEvidenceRecord>(rootDir, relPath), blocker: null };
}

function evaluateModelExistenceConfirmed(args: {
  target: PageFactoryTargetV1;
  catalog_row: FridgeModelRow;
  wildcard_row: CatalogSlugRowV1 | null;
  target_source: "page_factory_registry" | "inferred_catalog_wildcard";
  rootDir: string;
}): PageQualityGateV1 {
  const proof = [
    "data/fridge_models.csv",
    args.target_source === "page_factory_registry"
      ? PAGE_FACTORY_TARGETS_CSV_REL_V1
      : HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1,
    args.target.evidence_json_relpath,
  ];

  const modelNumber = args.catalog_row.model_number.trim();
  const registryRecognized = args.target_source === "page_factory_registry";
  const pageFactoryFlag = args.wildcard_row?.page_factory_target === true;
  const hasModelSpecificEvidence = hasModelSpecificPublicReadyEvidenceV1(
    args.rootDir,
    args.target.fridge_slug,
    modelNumber,
  );

  const blockers: string[] = [];
  let status: PageQualityGateStatusV1 = "PASS";

  if (registryRecognized || pageFactoryFlag || hasModelSpecificEvidence) {
    return gate("model_existence_confirmed", "PASS", [], proof, {
      recognition_path: registryRecognized
        ? "page_factory_registry"
        : pageFactoryFlag
          ? "wildcard_page_factory_target"
          : "model_specific_tier1_evidence",
      model_number: modelNumber,
      has_model_specific_evidence: hasModelSpecificEvidence,
    });
  }

  if (args.wildcard_row?.bucket === "BLOCKED_HAF_CIN_CANONICAL") {
    blockers.push(
      `manufacturer recognition blocked: wildcard bucket BLOCKED_HAF_CIN_CANONICAL for ${args.target.fridge_slug}`,
    );
    status = "BLOCKED";
  } else if (args.wildcard_row) {
    blockers.push(
      `no official manufacturer recognition or model-specific Tier-1 evidence for ${modelNumber}; wildcard ${args.wildcard_row.bucket} alone is insufficient`,
    );
    status = "WARN";
  } else {
    blockers.push(
      `no official manufacturer recognition or model-specific Tier-1 evidence for ${modelNumber}`,
    );
    status = "WARN";
  }

  return gate("model_existence_confirmed", status, blockers, proof, {
    recognition_path: "none",
    model_number: modelNumber,
    wildcard_bucket: args.wildcard_row?.bucket ?? null,
    has_model_specific_evidence: hasModelSpecificEvidence,
  });
}

function evaluateModelSpecificEvidence(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
  model_number: string;
}): PageQualityGateV1 {
  const relPath = args.target.evidence_json_relpath;
  const loaded = loadEvidenceRecord(args.rootDir, relPath);
  const blockers: string[] = [];

  if (loaded.blocker) {
    blockers.push(loaded.blocker);
    return gate("model_specific_evidence", "WARN", blockers, [relPath], {
      public_ready: false,
      model_specific_filter_specification: false,
    });
  }

  const record = loaded.record!;
  const readiness = validateRefrigeratorManualEvidencePublicReady(record);
  if (!readiness.ok) {
    blockers.push(...readiness.errors.map((e) => `evidence: ${e}`));
    return gate("model_specific_evidence", "BLOCKED", blockers, [relPath]);
  }

  if (normalizeSlug(record.fridge_model_slug ?? "") !== args.target.fridge_slug) {
    blockers.push(`evidence fridge_model_slug mismatch: expected ${args.target.fridge_slug}`);
    return gate("model_specific_evidence", "BLOCKED", blockers, [relPath]);
  }

  const hasModelSpec = hasModelSpecificPublicReadyEvidenceV1(
    args.rootDir,
    args.target.fridge_slug,
    args.model_number,
  );
  if (!hasModelSpec) {
    blockers.push(
      `missing Tier-1 filter_specification naming target model ${args.model_number}`,
    );
    return gate("model_specific_evidence", "WARN", blockers, [relPath], {
      public_ready: true,
      model_specific_filter_specification: false,
    });
  }

  return gate("model_specific_evidence", "PASS", [], [relPath], {
    public_ready: true,
    model_specific_filter_specification: true,
  });
}

function evaluateCompatProof(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
  brand_slug: string;
  strict: boolean;
}): PageQualityGateV1[] {
  const actual = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  const expected = [...args.target.expected_filter_slugs].sort();
  const proof = ["data/compatibility_mappings.csv", "data/filters.csv"];

  const exactBlockers: string[] = [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    exactBlockers.push(
      `csv compat slugs ${JSON.stringify(actual)} !== expected ${JSON.stringify(expected)}`,
    );
  }

  const forbiddenBlockers = args.target.forbidden_filter_slugs
    .filter((slug) => actual.includes(slug))
    .map((slug) => `forbidden filter still mapped in CSV: ${slug}`);

  const filters = readCsv<FilterRow>(args.rootDir, "data/filters.csv");
  const filterSlugs = new Set(filters.map((r) => normalizeSlug(r.slug)));
  for (const slug of expected) {
    if (!filterSlugs.has(slug)) {
      exactBlockers.push(`expected filter slug missing from filters.csv: ${slug}`);
    }
  }

  const filterOemBySlug = new Map(
    filters.map((r) => [normalizeSlug(r.slug), (r.oem_part_number ?? r.slug).trim()] as const),
  );
  const tokenAligned = legacyFilterSlugsMatchOfficialTokenV1({
    brandSlug: args.brand_slug,
    officialToken: args.target.official_marketing_token,
    legacyFilterSlugs: actual,
    filterOemBySlug,
  });
  const tokenBlockers: string[] = [];
  if (!tokenAligned) {
    tokenBlockers.push(
      `legacy filter slugs ${JSON.stringify(actual)} do not align with official_marketing_token ${args.target.official_marketing_token}`,
    );
  }

  const exactStatus: PageQualityGateStatusV1 =
    exactBlockers.length === 0 ? "PASS" : args.strict ? "BLOCKED" : "WARN";
  const tokenStatus: PageQualityGateStatusV1 =
    tokenBlockers.length === 0 ? "PASS" : args.strict ? "BLOCKED" : "WARN";

  return [
    gate("compat_proof_exact_mapping", exactStatus, exactBlockers, proof, {
      actual_filter_slugs: actual,
      expected_filter_slugs: expected,
      strict: args.strict,
    }),
    gate(
      "compat_proof_forbidden_absent",
      forbiddenBlockers.length === 0 ? "PASS" : "BLOCKED",
      forbiddenBlockers,
      proof,
      { forbidden_filter_slugs: args.target.forbidden_filter_slugs, actual_filter_slugs: actual },
    ),
    gate("compat_proof_token_alignment", tokenStatus, tokenBlockers, proof, {
      brand_slug: args.brand_slug,
      official_marketing_token: args.target.official_marketing_token,
      legacy_filter_slugs: actual,
      aligned: tokenAligned,
      strict: args.strict,
    }),
  ];
}

function evaluateWrongPartRisk(args: {
  target: PageFactoryTargetV1;
  wildcard_row: CatalogSlugRowV1 | null;
  rootDir: string;
}): PageQualityGateV1 {
  const actual = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  const proof = ["data/compatibility_mappings.csv", HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1];
  const blockers: string[] = [];

  if (args.wildcard_row?.bucket === "BLOCKED_HAF_CIN_CANONICAL") {
    blockers.push(`wildcard bucket BLOCKED_HAF_CIN_CANONICAL for ${args.target.fridge_slug}`);
  }

  const forbiddenPresent = HAF_CIN_CANONICAL_FILTER_SLUGS_V1.filter((slug) =>
    actual.includes(slug),
  );
  if (forbiddenPresent.length > 0) {
    blockers.push(`HAF-CIN wrong-family compat present: ${forbiddenPresent.join(", ")}`);
  }

  const status: PageQualityGateStatusV1 = blockers.length > 0 ? "BLOCKED" : "PASS";
  return gate("wrong_part_risk", status, blockers, proof, {
    wildcard_bucket: args.wildcard_row?.bucket ?? null,
    actual_filter_slugs: actual,
    forbidden_haf_cin_present: forbiddenPresent.length > 0,
  });
}

function evaluateSourceTransparency(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageQualityGateV1 {
  const relPath = args.target.evidence_json_relpath;
  const loaded = loadEvidenceRecord(args.rootDir, relPath);
  if (loaded.blocker || !loaded.record) {
    return gate("source_transparency", "WARN", [loaded.blocker ?? "missing evidence"], [relPath]);
  }

  const sources = normalizedEvidenceSources(loaded.record);
  const blockers: string[] = [];
  const tier1 = sources.filter((s) => manualSourcePublicTier(s.source_type) === 1);

  if (tier1.length === 0) {
    blockers.push("no Tier-1 manufacturer sources in evidence bundle");
  }
  if (loaded.record.operator_reviewed !== true) {
    blockers.push("operator_reviewed must be true");
  }
  if (loaded.record.confidence !== "high" && loaded.record.confidence !== "medium") {
    blockers.push("confidence must be high or medium");
  }

  const status: PageQualityGateStatusV1 =
    blockers.length > 0 ? "BLOCKED" : sources.length >= 2 ? "PASS" : "WARN";

  if (sources.length < 2 && blockers.length === 0) {
    blockers.push("fewer than two distinct evidence sources — limited source transparency");
  }

  return gate("source_transparency", status, blockers, [relPath], {
    source_count: sources.length,
    tier1_source_count: tier1.length,
    source_urls: sources.map((s) => s.source_url),
  });
}

function evaluateBuyerPath(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageQualityGateV1 {
  const proof = ["data/retailer_links.csv"];
  const links = readCsv<RetailerRow>(args.rootDir, "data/retailer_links.csv");
  let verifiedBuyCount = 0;
  const observations: Record<string, unknown>[] = [];

  for (const filterSlug of args.target.expected_filter_slugs) {
    const rows = links.filter((r) => normalizeSlug(r.filter_slug) === filterSlug);
    const realBuyRows = filterRealBuyRetailerLinks(rows);
    verifiedBuyCount += realBuyRows.length;
    observations.push({
      filter_slug: filterSlug,
      row_count: rows.length,
      verified_buy_count: realBuyRows.length,
    });
  }

  const buyerPathState = verifiedBuyCount > 0 ? "show_buy" : "suppress_buy";
  return gate("buyer_path", verifiedBuyCount > 0 ? "PASS" : "WARN", [], proof, {
    verified_buy_link_count: verifiedBuyCount,
    buyer_path_state: buyerPathState,
    filters: observations,
  });
}

function evaluateHomeownerGuidance(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
}): PageQualityGateV1 {
  const relPath = args.target.evidence_json_relpath;
  const loaded = loadEvidenceRecord(args.rootDir, relPath);
  if (loaded.blocker || !loaded.record) {
    return gate("homeowner_guidance", "WARN", [loaded.blocker ?? "missing evidence"], [relPath]);
  }

  const readiness = validateRefrigeratorManualEvidencePublicReady(loaded.record);
  if (!readiness.ok) {
    return gate(
      "homeowner_guidance",
      "BLOCKED",
      readiness.errors.map((e) => `evidence: ${e}`),
      [relPath],
    );
  }

  const hasLocation = (loaded.record.filter_location_text ?? "").trim().length > 0;
  const hasSteps = (loaded.record.replacement_steps_summary ?? "").trim().length > 0;
  const hasCautions = (loaded.record.cautions ?? "").trim().length > 0;

  return gate("homeowner_guidance", "PASS", [], [relPath], {
    has_filter_location_text: hasLocation,
    has_replacement_steps_summary: hasSteps,
    has_cautions: hasCautions,
  });
}

function evidenceFingerprint(record: RefrigeratorManualEvidenceRecord | null): string | null {
  if (!record) return null;
  const sources = normalizedEvidenceSources(record);
  const payload = sources
    .map((s) => `${s.source_url}|${s.evidence_role}`)
    .sort()
    .join(";");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function evaluateDuplicateThinContent(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
  model_number: string;
  wildcard_row: CatalogSlugRowV1 | null;
  wildcardReviewJsonRelPath: string;
}): PageQualityGateV1 {
  const proof = [args.wildcardReviewJsonRelPath, args.target.evidence_json_relpath];
  const loaded = loadEvidenceRecord(args.rootDir, args.target.evidence_json_relpath);
  const fingerprint = evidenceFingerprint(loaded.record);
  const hasModelSpec = hasModelSpecificPublicReadyEvidenceV1(
    args.rootDir,
    args.target.fridge_slug,
    args.model_number,
  );

  if (!args.wildcard_row || !fingerprint) {
    const blockers: string[] = [];
    if (!hasModelSpec) {
      blockers.push("no model-specific evidence — finish-variant thin-content risk");
    }
    return gate(
      "duplicate_thin_content",
      hasModelSpec ? "PASS" : "WARN",
      blockers,
      proof,
      { evidence_fingerprint: fingerprint, sibling_matches: [] },
    );
  }

  const review = readJsonFile<{ catalog_slug_rows: CatalogSlugRowV1[] }>(
    args.rootDir,
    args.wildcardReviewJsonRelPath,
  );
  const siblings = review.catalog_slug_rows.filter(
    (row) =>
      row.fridge_slug !== args.target.fridge_slug &&
      row.matched_patterns.some((p) => args.wildcard_row!.matched_patterns.includes(p)),
  );

  const siblingMatches: string[] = [];
  for (const sibling of siblings) {
    const siblingEvidence = loadEvidenceRecord(
      args.rootDir,
      manualEvidenceRelPath(sibling.fridge_slug),
    );
    const siblingFingerprint = evidenceFingerprint(siblingEvidence.record);
    if (siblingFingerprint && siblingFingerprint === fingerprint) {
      siblingMatches.push(sibling.fridge_slug);
    }
  }

  const blockers: string[] = [];
  let status: PageQualityGateStatusV1 = "PASS";
  if (!hasModelSpec) {
    blockers.push("only family-level or missing model-specific proof — thin doorway risk");
    status = "WARN";
  }
  if (siblingMatches.length > 0 && !hasModelSpec) {
    blockers.push(
      `identical evidence fingerprint shared with pattern siblings: ${siblingMatches.join(", ")}`,
    );
    status = "WARN";
  }

  return gate("duplicate_thin_content", status, blockers, proof, {
    evidence_fingerprint: fingerprint,
    sibling_matches: siblingMatches,
    has_model_specific_evidence: hasModelSpec,
  });
}

function evaluateInternalLinkContext(args: {
  rootDir: string;
  target: PageFactoryTargetV1;
  brand_slug: string;
}): PageQualityGateV1 {
  const proof = ["data/fridge_models.csv", "data/filters.csv", "data/compatibility_mappings.csv"];
  const actual = compatSlugsForModel(args.rootDir, args.target.fridge_slug);
  const filters = readCsv<FilterRow>(args.rootDir, "data/filters.csv");
  const filterSlugs = new Set(filters.map((r) => normalizeSlug(r.slug)));
  const blockers: string[] = [];

  if (actual.length === 0) {
    blockers.push("no mapped filter slugs for internal /filter links");
  }
  for (const slug of actual) {
    if (!filterSlugs.has(slug)) {
      blockers.push(`mapped filter slug missing from filters.csv: ${slug}`);
    }
  }

  const status: PageQualityGateStatusV1 = blockers.length === 0 ? "PASS" : "BLOCKED";
  return gate("internal_link_context", status, blockers, proof, {
    brand_slug: args.brand_slug,
    mapped_filter_slugs: actual,
    fridge_route: `/fridge/${args.target.fridge_slug}`,
    filter_routes: actual.map((s) => `/filter/${s}`),
    reset_help_route: `/help/reset-water-filter-light/${args.brand_slug}`,
  });
}

function evaluateQuarantine(args: { target: PageFactoryTargetV1 }): PageQualityGateV1 {
  const override = getFridgeModelReviewOverride(args.target.fridge_slug);
  const underReview = isFridgeModelUnderOwnerReview(args.target.fridge_slug);
  const blockers =
    underReview && override
      ? [`model under owner review quarantine: ${override.reason}`]
      : [];

  return gate(
    "quarantine_state",
    blockers.length > 0 ? "BLOCKED" : "PASS",
    blockers,
    ["src/lib/fridge/fridge-model-review-overrides.ts"],
    {
      under_owner_review: underReview,
      override_reason: override?.reason ?? null,
    },
  );
}

function resolveAutoCloneSourceSlug(args: {
  rootDir: string;
  fridgeSlug: string;
  wildcardReviewJsonRelPath: string;
}): string | null {
  const wildcardRow = loadWildcardRow(args.rootDir, args.fridgeSlug, args.wildcardReviewJsonRelPath);
  if (!wildcardRow) return null;
  const review = readJsonFile<{ catalog_slug_rows: CatalogSlugRowV1[] }>(
    args.rootDir,
    args.wildcardReviewJsonRelPath,
  );
  const sibling = review.catalog_slug_rows.find(
    (row) =>
      row.fridge_slug !== args.fridgeSlug &&
      row.page_factory_target &&
      row.matched_patterns.some((p) => wildcardRow.matched_patterns.includes(p)),
  );
  return sibling?.fridge_slug ?? null;
}

function loadClonePacket(args: {
  rootDir: string;
  fridgeSlug: string;
  wildcardReviewJsonRelPath: string;
  clonePacketJsonRelPath?: string;
  cloneSourceSlug?: string;
  cloneFamilyKey?: string;
}): PageFactoryEvidenceCloneReportV1 | null {
  if (args.clonePacketJsonRelPath) {
    const abs = path.join(args.rootDir, args.clonePacketJsonRelPath);
    if (existsSync(abs)) {
      return readJsonFile<PageFactoryEvidenceCloneReportV1>(args.rootDir, args.clonePacketJsonRelPath);
    }
  }

  const sourceSlug =
    args.cloneSourceSlug ??
    resolveAutoCloneSourceSlug({
      rootDir: args.rootDir,
      fridgeSlug: args.fridgeSlug,
      wildcardReviewJsonRelPath: args.wildcardReviewJsonRelPath,
    });

  if (sourceSlug) {
    return buildPageFactoryEvidenceCloneReportV1({
      rootDir: args.rootDir,
      sourceSlug,
      targetSlug: args.fridgeSlug,
      familyKey: args.cloneFamilyKey ?? "samsung::HAFQIN",
    });
  }

  return null;
}

function gateStatusCounts(gates: PageQualityGateV1[]): Record<PageQualityGateStatusV1, number> {
  const counts: Record<PageQualityGateStatusV1, number> = {
    PASS: 0,
    WARN: 0,
    BLOCKED: 0,
    UNKNOWN: 0,
  };
  for (const g of gates) counts[g.status] += 1;
  return counts;
}

export function classifyPageQualityV1(input: {
  gates: PageQualityGateV1[];
  clone_status: PageFactoryEvidenceCloneReportV1["clone_status"] | null;
  verified_buy_link_count: number;
}): PageQualityClassificationV1 {
  const blockedGate = input.gates.some((g) => g.status === "BLOCKED");
  const modelExistence = input.gates.find((g) => g.gate_id === "model_existence_confirmed");
  const modelEvidence = input.gates.find((g) => g.gate_id === "model_specific_evidence");
  const wrongPart = input.gates.find((g) => g.gate_id === "wrong_part_risk");
  const quarantine = input.gates.find((g) => g.gate_id === "quarantine_state");

  if (
    blockedGate ||
    wrongPart?.status === "BLOCKED" ||
    quarantine?.status === "BLOCKED" ||
    input.clone_status === "BLOCKED"
  ) {
    return "BLOCKED";
  }

  if (
    input.clone_status === "NEEDS_TARGET_EVIDENCE" ||
    modelExistence?.status !== "PASS" ||
    modelEvidence?.status !== "PASS"
  ) {
    return "NOINDEX_REVIEW";
  }

  const indexableGates = [
    "compat_proof_exact_mapping",
    "compat_proof_forbidden_absent",
    "compat_proof_token_alignment",
    "source_transparency",
    "homeowner_guidance",
    "internal_link_context",
  ];
  const anyIndexGateBlocked = input.gates
    .filter((g) => indexableGates.includes(g.gate_id))
    .some((g) => g.status === "BLOCKED");

  if (anyIndexGateBlocked) {
    return "NOINDEX_REVIEW";
  }

  if (input.verified_buy_link_count > 0) {
    return "INDEXABLE_VERIFIED";
  }

  return "INDEXABLE_NO_BUY_LINK";
}

export function deriveQualityIndexRecommendations(args: {
  classification: PageQualityClassificationV1;
  verified_buy_link_count: number;
}): {
  recommended_page_state: PageState;
  recommended_robots: { index: boolean; follow: true };
  recommended_sitemap_include: boolean;
  publication_authorized: boolean;
} {
  const indexable =
    args.classification === "INDEXABLE_VERIFIED" ||
    args.classification === "INDEXABLE_NO_BUY_LINK";

  if (!indexable) {
    return {
      recommended_page_state: PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL,
      recommended_robots: getRobotsFromPageState(PAGE_STATES.SITEMAP_EXCLUDED_LOW_SIGNAL),
      recommended_sitemap_include: false,
      publication_authorized: false,
    };
  }

  const pageState = classifyPageState({
    isIndexable: true,
    validCtaCount: args.verified_buy_link_count,
    buyerPathState: args.verified_buy_link_count > 0 ? "show_buy" : "suppress_buy",
    hasDemandSignal: null,
  });

  return {
    recommended_page_state: pageState,
    recommended_robots: getRobotsFromPageState(pageState),
    recommended_sitemap_include: true,
    publication_authorized: true,
  };
}

function recommendedNextAction(classification: PageQualityClassificationV1, blockers: string[]): string {
  if (classification === "INDEXABLE_VERIFIED") {
    return "Owner may proceed to publication with verified buy path; run live proof before deploy.";
  }
  if (classification === "INDEXABLE_NO_BUY_LINK") {
    return "Owner may publish trust-gated indexable page without buy CTA; keep wrong-family warnings visible.";
  }
  if (classification === "NOINDEX_REVIEW") {
    return `Hold noindex until model-specific Tier-1 evidence and compat reconciliation: ${blockers[0] ?? "see gate blockers"}`;
  }
  return `Do not publish: ${blockers[0] ?? "hard gate blocked"}`;
}

export async function buildPageQualityGateReportV1(
  args: BuildPageQualityGateArgsV1,
): Promise<PageQualityGateReportV1> {
  const now = args.now ?? (() => new Date());
  const reviewRel = args.wildcardReviewJsonRelPath ?? HAF_QIN_WILDCARD_EXPANSION_REVIEW_JSON_REL_V1;

  const resolved = resolvePageFactoryTargetForQualityGateV1({
    rootDir: args.rootDir,
    fridgeSlug: args.fridgeSlug,
    registryRelPath: args.registryRelPath,
    wildcardReviewJsonRelPath: reviewRel,
  });

  const { target, target_source, registry_source, wildcard_row, catalog_row } = resolved;
  const brandSlug = catalog_row.brand_slug.trim().toLowerCase();
  const modelNumber = catalog_row.model_number.trim();

  let preflight_gates: PageFactoryPreflightGateV1[] | null = null;
  let preflight_status: string | null = null;
  if (target_source === "page_factory_registry") {
    const preflight = await buildPageFactoryPreflightReportV1({
      rootDir: args.rootDir,
      fridgeSlug: target.fridge_slug,
      registryRelPath: registry_source ?? PAGE_FACTORY_TARGETS_CSV_REL_V1,
      checkSupabase: args.checkSupabase === true,
    });
    preflight_gates = preflight.gates;
    preflight_status = preflight.preflight_status;
  }

  const clone_packet = loadClonePacket({
    rootDir: args.rootDir,
    fridgeSlug: target.fridge_slug,
    wildcardReviewJsonRelPath: reviewRel,
    clonePacketJsonRelPath: args.clonePacketJsonRelPath,
    cloneSourceSlug: args.cloneSourceSlug,
    cloneFamilyKey: args.cloneFamilyKey,
  });

  const gates: PageQualityGateV1[] = [
    evaluateModelExistenceConfirmed({
      target,
      catalog_row,
      wildcard_row,
      target_source,
      rootDir: args.rootDir,
    }),
    evaluateModelSpecificEvidence({
      rootDir: args.rootDir,
      target,
      model_number: modelNumber,
    }),
    ...evaluateCompatProof({
      rootDir: args.rootDir,
      target,
      brand_slug: brandSlug,
      strict: target_source === "page_factory_registry",
    }),
    evaluateWrongPartRisk({ target, wildcard_row, rootDir: args.rootDir }),
    evaluateSourceTransparency({ rootDir: args.rootDir, target }),
    evaluateBuyerPath({ rootDir: args.rootDir, target }),
    evaluateHomeownerGuidance({ rootDir: args.rootDir, target }),
    evaluateDuplicateThinContent({
      rootDir: args.rootDir,
      target,
      model_number: modelNumber,
      wildcard_row,
      wildcardReviewJsonRelPath: reviewRel,
    }),
    evaluateInternalLinkContext({
      rootDir: args.rootDir,
      target,
      brand_slug: brandSlug,
    }),
    evaluateQuarantine({ target }),
    gate(
      "index_decision",
      "PASS",
      [],
      ["src/lib/page-state/page-state.ts", "src/lib/page-state/page-state-meta.ts"],
      { note: "derived from quality_classification" },
    ),
  ];

  const buyerPathGate = gates.find((g) => g.gate_id === "buyer_path");
  const verifiedBuyCount =
    typeof buyerPathGate?.observed?.verified_buy_link_count === "number"
      ? buyerPathGate.observed.verified_buy_link_count
      : 0;

  const quality_classification = classifyPageQualityV1({
    gates,
    clone_status: clone_packet?.clone_status ?? null,
    verified_buy_link_count: verifiedBuyCount,
  });

  const indexRecs = deriveQualityIndexRecommendations({
    classification: quality_classification,
    verified_buy_link_count: verifiedBuyCount,
  });

  const top_blockers = gates
    .flatMap((g) => g.blockers.map((b) => `${g.gate_id}: ${b}`))
    .slice(0, 10);

  if (clone_packet?.clone_status === "NEEDS_TARGET_EVIDENCE") {
    top_blockers.unshift("clone_status: NEEDS_TARGET_EVIDENCE");
  }

  const inspect_summary: PageQualityGateInspectSummaryV1 = {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: ".command_center_v2.buckparts_page_quality_gate_v1.inspect_summary",
    },
    fridge_slug: target.fridge_slug,
    quality_classification,
    publication_authorized: indexRecs.publication_authorized,
    recommended_page_state: indexRecs.recommended_page_state,
    recommended_robots: indexRecs.recommended_robots,
    recommended_sitemap_include: indexRecs.recommended_sitemap_include,
    clone_status: clone_packet?.clone_status ?? null,
    preflight_status,
    verified_buy_link_count: verifiedBuyCount,
    quality_gate_status_counts: gateStatusCounts(gates),
    top_blockers,
    recommended_next_action: recommendedNextAction(quality_classification, top_blockers),
  };

  const exact_repo_paths_read = Array.from(
    new Set([
      "data/fridge_models.csv",
      "data/compatibility_mappings.csv",
      "data/filters.csv",
      "data/retailer_links.csv",
      reviewRel,
      target.evidence_json_relpath,
      ...(registry_source ? [registry_source] : []),
      ...(args.clonePacketJsonRelPath ? [args.clonePacketJsonRelPath] : []),
      ...gates.flatMap((g) => g.proof_paths_read),
      ...(preflight_gates?.flatMap((g) => g.proof_paths_read) ?? []),
    ]),
  ).sort();

  return {
    contract: BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    fridge_slug: target.fridge_slug,
    target_source,
    registry_source,
    quality_classification,
    publication_authorized: indexRecs.publication_authorized,
    recommended_page_state: indexRecs.recommended_page_state,
    recommended_robots: indexRecs.recommended_robots,
    recommended_sitemap_include: indexRecs.recommended_sitemap_include,
    gates,
    inspect_summary,
    clone_packet,
    preflight_gates,
    exact_repo_paths_read,
    proven_facts: [
      `PROVEN: read-only quality gate for ${target.fridge_slug} (${target_source}).`,
      `PROVEN: publication_authorized=${indexRecs.publication_authorized}.`,
    ],
    unknown_facts: [],
  };
}

export function pageQualityGateArtifactRelPathsV1(fridgeSlug: string): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const slug = normalizeSlug(fridgeSlug);
  return {
    jsonRelPath: `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${slug}-quality-gate-v1.json`,
    mdRelPath: `data/fridge/batch-production/drafts/page-factory-quality-gate-${slug}-v1.md`,
  };
}

export function pageQualityGateBatchArtifactRelPathsV1(batchId: string): {
  jsonRelPath: string;
  mdRelPath: string;
} {
  const id = batchId.trim();
  return {
    jsonRelPath: `${PAGE_QUALITY_GATE_ARTIFACT_DIR_REL_V1}/${id}-rollup-v1.json`,
    mdRelPath: `data/fridge/batch-production/drafts/page-factory-quality-gate-batch-${id}-v1.md`,
  };
}

export function buildPageQualityGateMarkdownV1(report: PageQualityGateReportV1): string {
  const lines = [
    "# Page Factory quality gate owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Stop condition",
    "",
    "Read-only quality gate only. Does **not** publish pages, mutate sitemap/robots, compat, retailer links, Supabase, or evidence.",
    "",
    "## Summary",
    "",
    `- quality_classification: **${report.quality_classification}**`,
    `- publication_authorized: **${report.publication_authorized}**`,
    `- fridge_slug: \`${report.fridge_slug}\``,
    `- target_source: \`${report.target_source}\``,
    `- recommended_page_state: \`${report.recommended_page_state}\``,
    `- recommended_robots: index=${report.recommended_robots.index}, follow=${report.recommended_robots.follow}`,
    `- recommended_sitemap_include: **${report.recommended_sitemap_include}**`,
    `- clone_status: ${report.clone_packet?.clone_status ?? "—"}`,
    `- preflight_status: ${report.preflight_gates ? report.inspect_summary.preflight_status : "—"}`,
    "",
    `**Recommended next action:** ${report.inspect_summary.recommended_next_action}`,
    "",
    "## Gates",
    "",
    "| gate | status | blockers |",
    "|---|---|---|",
  ];

  for (const g of report.gates) {
    const blockers = g.blockers.length > 0 ? g.blockers.join("; ") : "—";
    lines.push(`| ${g.gate_id} | ${g.status} | ${blockers} |`);
  }

  if (report.inspect_summary.top_blockers.length > 0) {
    lines.push("", "### Top blockers", "");
    for (const b of report.inspect_summary.top_blockers) lines.push(`- ${b}`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildPageQualityGateBatchMarkdownV1(report: PageQualityGateBatchReportV1): string {
  const lines = [
    "# Page Factory quality gate batch owner review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Batch summary",
    "",
    `- batch_id: \`${report.batch_id}\``,
    `- review_status: **${report.review_status}**`,
    `- pair_count: **${report.inspect_summary.pair_count}**`,
    "",
    "### Classification counts",
    "",
  ];

  for (const [k, v] of Object.entries(report.inspect_summary.quality_classification_counts)) {
    lines.push(`- ${k}: **${v}**`);
  }

  lines.push(
    "",
    `- publication_authorized_count: **${report.inspect_summary.publication_authorized_count}**`,
    `- recommended_sitemap_include_count: **${report.inspect_summary.recommended_sitemap_include_count}**`,
    "",
    `**Recommended next action:** ${report.inspect_summary.recommended_next_action}`,
    "",
    "## Pairs",
    "",
    "| target | classification | publication_authorized | clone_status |",
    "|---|---|---|---|",
  );

  for (const pair of report.pair_reports) {
    lines.push(
      `| \`${pair.fridge_slug}\` | ${pair.quality_classification} | ${pair.publication_authorized} | ${pair.clone_packet?.clone_status ?? "—"} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function writePageQualityGateArtifactsV1(args: {
  rootDir: string;
  report: PageQualityGateReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const paths = pageQualityGateArtifactRelPathsV1(args.report.fridge_slug);
  const jsonAbs = path.join(args.rootDir, paths.jsonRelPath);
  const mdAbs = path.join(args.rootDir, paths.mdRelPath);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildPageQualityGateMarkdownV1(args.report), "utf8");
  return paths;
}

export function writePageQualityGateBatchArtifactsV1(args: {
  rootDir: string;
  report: PageQualityGateBatchReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const paths = pageQualityGateBatchArtifactRelPathsV1(args.report.batch_id);
  const jsonAbs = path.join(args.rootDir, paths.jsonRelPath);
  const mdAbs = path.join(args.rootDir, paths.mdRelPath);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildPageQualityGateBatchMarkdownV1(args.report), "utf8");
  return paths;
}

export function resolveBatchManifestPathV1(batchId: string, rootDir: string): string {
  const rel = `${PAGE_FACTORY_EVIDENCE_CLONE_BATCH_MANIFEST_DIR_REL_V1}/${batchId.trim()}-manifest-v1.json`;
  if (!existsSync(path.join(rootDir, rel))) {
    throw new Error(`missing batch manifest: ${rel}`);
  }
  return rel;
}

export async function buildPageQualityGateBatchReportV1(args: {
  rootDir: string;
  batchId: string;
  manifestRelPath?: string;
  registryRelPath?: string;
  wildcardReviewJsonRelPath?: string;
  checkSupabase?: boolean;
  now?: () => Date;
}): Promise<PageQualityGateBatchReportV1> {
  const now = args.now ?? (() => new Date());
  const manifestRel =
    args.manifestRelPath ?? resolveBatchManifestPathV1(args.batchId, args.rootDir);
  const manifest = readJsonFile<PageQualityGateBatchManifestV1>(args.rootDir, manifestRel);

  const pair_reports: PageQualityGateReportV1[] = [];
  for (const pair of manifest.pairs) {
    const report = await buildPageQualityGateReportV1({
      rootDir: args.rootDir,
      fridgeSlug: pair.target_slug,
      registryRelPath: args.registryRelPath,
      wildcardReviewJsonRelPath: args.wildcardReviewJsonRelPath,
      cloneSourceSlug: pair.source_slug,
      cloneFamilyKey: pair.family_key,
      checkSupabase: args.checkSupabase,
      now,
    });
    pair_reports.push(report);
  }

  const quality_classification_counts: Record<PageQualityClassificationV1, number> = {
    INDEXABLE_VERIFIED: 0,
    INDEXABLE_NO_BUY_LINK: 0,
    NOINDEX_REVIEW: 0,
    BLOCKED: 0,
  };
  for (const r of pair_reports) {
    quality_classification_counts[r.quality_classification] += 1;
  }

  const publication_authorized_count = pair_reports.filter((r) => r.publication_authorized).length;
  const recommended_sitemap_include_count = pair_reports.filter(
    (r) => r.recommended_sitemap_include,
  ).length;

  const top_blockers = pair_reports
    .flatMap((r) => r.inspect_summary.top_blockers.map((b) => `${r.fridge_slug}: ${b}`))
    .slice(0, 10);

  const hasBlocked = quality_classification_counts.BLOCKED > 0;
  const hasUnauthorized = pair_reports.some((r) => !r.publication_authorized);

  return {
    contract: BUCKPARTS_PAGE_QUALITY_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_blocked_until_owner_approval: true,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    batch_id: args.batchId,
    manifest_path: manifestRel,
    review_status: "READY_FOR_OWNER_REVIEW",
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center:
          ".command_center_v2.buckparts_page_quality_gate_batch_v1.inspect_summary",
      },
      batch_id: args.batchId,
      pair_count: pair_reports.length,
      quality_classification_counts,
      publication_authorized_count,
      recommended_sitemap_include_count,
      top_blockers,
      recommended_next_action: hasBlocked
        ? "Resolve BLOCKED pairs before any batch publication."
        : hasUnauthorized
          ? "Hold NOINDEX_REVIEW pairs; publish only publication_authorized targets after owner approval."
          : "All pairs publication_authorized; proceed to owner-approved deploy lane.",
    },
    pair_reports,
    exact_repo_paths_read: Array.from(
      new Set(pair_reports.flatMap((r) => r.exact_repo_paths_read)),
    ).sort(),
    proven_facts: [
      `PROVEN: batch quality gate for ${pair_reports.length} pair(s) from ${manifestRel}.`,
    ],
    unknown_facts: [],
  };
}
