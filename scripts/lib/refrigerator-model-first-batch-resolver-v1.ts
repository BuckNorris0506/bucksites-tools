/**
 * Read-only refrigerator model-first batch resolver v1.
 * Model → official water filter proof → group → buy-path signal (no CSV/Supabase mutation).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  filterRealBuyRetailerLinks,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";

export const REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1 =
  "refrigerator_model_first_batch_resolver_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1 =
  "refrigerator_model_first_input_manifest_v1" as const;

export const REFRIGERATOR_MODEL_FIRST_MANUAL_EVIDENCE_DIR_REL_V1 =
  "data/manual-evidence/refrigerator" as const;

export const REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1 =
  "docs/fridge-model-filter-mapping-discrepancies.md" as const;

export type RefrigeratorModelFirstConfidenceV1 =
  | "PROVEN"
  | "UNKNOWN"
  | "MAPPING_REVIEW_REQUIRED";

export type SafeBuyPathExistsV1 = "yes" | "no" | "unknown";

export type RefrigeratorModelFirstInputRowV1 = {
  input_id: string;
  brand_slug: string;
  brand_display: string;
  model_number: string;
  fridge_slug: string;
  official_support_url_hint?: string;
  legacy_csv_filter_slugs?: string[];
  selection_reason?: string;
  research_notes?: string;
};

export type RefrigeratorModelFirstInputManifestV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1;
  read_only: true;
  batch_id: string;
  source_contract: string;
  models: RefrigeratorModelFirstInputRowV1[];
};

export type OfficialFilterProofV1 = {
  official_filter_token: string;
  proof_source_kind: "manual_evidence_filter_specification" | "discrepancy_doc_official_lg";
  proof_source_urls: string[];
  proof_notes: string;
};

export type RefrigeratorModelFirstBatchModelRowV1 = {
  input_id: string;
  refrigerator_brand: string;
  refrigerator_model: string;
  fridge_slug: string;
  /** Legacy CSV compat slugs — hypothesis only, not fit proof. */
  current_legacy_buckparts_filter_slugs: string[];
  legacy_filter_oem_tokens: string[];
  /** Official manufacturer token/name when committed proof exists; null when UNKNOWN. */
  official_filter_token_or_name: string | null;
  official_proof: OfficialFilterProofV1 | null;
  confidence: RefrigeratorModelFirstConfidenceV1;
  grouped_official_filter_family: string | null;
  safe_buy_path_exists: SafeBuyPathExistsV1;
  product_data_mutation_allowed: false;
  plain_english_next_action: string;
  manifest_selection_reason: string | null;
};

export type RefrigeratorModelFirstBatchResolverInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
  };
  batch_id: string;
  models_checked_count: number;
  confidence_counts: Record<RefrigeratorModelFirstConfidenceV1, number>;
  grouped_official_filter_families_count: number;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  recommended_next_action: string;
};

export type RefrigeratorModelFirstBatchResolverV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  manifest_contract: typeof REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1;
  manifest_path: string;
  batch_id: string;
  source_contract: string;
  exact_repo_paths_read: string[];
  model_rows: RefrigeratorModelFirstBatchModelRowV1[];
  grouped_official_filter_families: Array<{
    group_key: string;
    official_filter_token_or_name: string;
    model_slugs: string[];
    confidence_counts: Record<RefrigeratorModelFirstConfidenceV1, number>;
  }>;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  inspect_summary: RefrigeratorModelFirstBatchResolverInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FridgeModelRow = { brand_slug: string; slug: string; model_number?: string };
type FilterRow = { brand_slug: string; slug: string; oem_part_number?: string };
type MappingRow = { fridge_slug: string; filter_slug: string };
type RetailerRow = {
  filter_slug: string;
  affiliate_url: string;
  is_primary?: string;
  retailer_key?: string;
  browser_truth_classification?: string;
};

type ManualEvidenceSourceV1 = {
  source_url?: string;
  source_title?: string;
  evidence_role?: string;
};

type ManualEvidenceRecordV1 = {
  fridge_model_slug?: string;
  sources?: ManualEvidenceSourceV1[];
};

type DiscrepancyEntryV1 = {
  fridge_slug: string;
  official_filter_token: string;
  repo_mapped_filter_slugs: string[];
};

const CSV_PATHS_V1 = {
  fridge_models: "data/fridge_models.csv",
  compatibility_mappings: "data/compatibility_mappings.csv",
  filters: "data/filters.csv",
  retailer_links: "data/retailer_links.csv",
} as const;

const OFFICIAL_FILTER_TITLE_PATTERNS_V1 = [
  /water filter\s+([A-Z0-9][A-Z0-9-]{2,})/i,
  /filter specification[:\s]+([A-Z0-9][A-Z0-9-]{2,})/i,
];

function readCsv<T extends Record<string, string>>(rootDir: string, relPath: string): T[] {
  const abs = path.join(rootDir, relPath);
  return parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as T[];
}

function normalizeToken(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isPrimary(v: string | undefined): boolean {
  const n = (v ?? "").trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

function primaryLink(rows: RetailerRow[]): RetailerRow | null {
  if (rows.length === 0) return null;
  return rows.find((r) => isPrimary(r.is_primary)) ?? rows[0] ?? null;
}

function toBuyLinkRow(row: RetailerRow): {
  retailer_key?: string | null;
  affiliate_url: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
} {
  return {
    retailer_key: row.retailer_key,
    affiliate_url: (row.affiliate_url ?? "").trim(),
    browser_truth_classification: row.browser_truth_classification,
    browser_truth_buyable_subtype: undefined,
  };
}

function extractTokenFromTitle(title: string): string | null {
  for (const pattern of OFFICIAL_FILTER_TITLE_PATTERNS_V1) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim().toUpperCase();
  }
  return null;
}

function loadManualEvidenceBySlug(rootDir: string): Map<string, ManualEvidenceRecordV1> {
  const dir = path.join(rootDir, REFRIGERATOR_MODEL_FIRST_MANUAL_EVIDENCE_DIR_REL_V1);
  const out = new Map<string, ManualEvidenceRecordV1>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const abs = path.join(dir, file);
    try {
      const record = JSON.parse(readFileSync(abs, "utf8")) as ManualEvidenceRecordV1;
      const slug = (record.fridge_model_slug ?? file.replace(/\.json$/, "")).trim().toLowerCase();
      out.set(slug, record);
    } catch {
      // skip invalid fixtures
    }
  }
  return out;
}

function officialProofFromManualEvidence(
  record: ManualEvidenceRecordV1,
): OfficialFilterProofV1 | null {
  const sources = record.sources ?? [];
  const specSources = sources.filter((s) => s.evidence_role === "filter_specification");
  for (const source of specSources) {
    const title = source.source_title ?? "";
    const token = extractTokenFromTitle(title);
    if (!token) continue;
    return {
      official_filter_token: token,
      proof_source_kind: "manual_evidence_filter_specification",
      proof_source_urls: [source.source_url ?? ""].filter(Boolean),
      proof_notes: `Committed manual evidence filter_specification source: ${title}`,
    };
  }
  return null;
}

function loadDiscrepancyEntries(rootDir: string): Map<string, DiscrepancyEntryV1> {
  const abs = path.join(rootDir, REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1);
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
    const officialMatch = body.match(
      /Official LG product\/spec reported filter:\s*`([^`]+)`/i,
    );
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

function legacySlugsMatchOfficial(args: {
  officialToken: string;
  legacyFilterSlugs: string[];
  filterOemBySlug: Map<string, string>;
}): boolean {
  const officialNorm = normalizeToken(args.officialToken);
  if (args.legacyFilterSlugs.length === 0) return false;

  const matchingSlugs = args.legacyFilterSlugs.filter((slug) => {
    const oem = args.filterOemBySlug.get(slug) ?? slug;
    const oemNorm = normalizeToken(oem);
    return oemNorm === officialNorm || oemNorm.startsWith(officialNorm) || officialNorm.startsWith(oemNorm);
  });

  return matchingSlugs.length === args.legacyFilterSlugs.length && matchingSlugs.length > 0;
}

function resolveSafeBuyPathExists(args: {
  legacyFilterSlugs: string[];
  linksByFilter: Map<string, RetailerRow[]>;
}): SafeBuyPathExistsV1 {
  if (args.legacyFilterSlugs.length === 0) return "unknown";
  let sawAnyLink = false;
  for (const slug of args.legacyFilterSlugs) {
    const rows = args.linksByFilter.get(slug) ?? [];
    if (rows.length === 0) continue;
    sawAnyLink = true;
    const primary = primaryLink(rows);
    if (primary && isDirectBuyableSafeCtaRow(toBuyLinkRow(primary))) return "yes";
    const anyRealBuy = filterRealBuyRetailerLinks(rows.map(toBuyLinkRow));
    if (anyRealBuy.length > 0) return "yes";
  }
  return sawAnyLink ? "no" : "unknown";
}

function buildGroupedOfficialFamilies(
  rows: RefrigeratorModelFirstBatchModelRowV1[],
): RefrigeratorModelFirstBatchResolverV1["grouped_official_filter_families"] {
  const groups = new Map<
    string,
    {
      group_key: string;
      official_filter_token_or_name: string;
      model_slugs: string[];
      confidence_counts: Record<RefrigeratorModelFirstConfidenceV1, number>;
    }
  >();

  for (const row of rows) {
    if (!row.grouped_official_filter_family || !row.official_filter_token_or_name) continue;
    const existing = groups.get(row.grouped_official_filter_family) ?? {
      group_key: row.grouped_official_filter_family,
      official_filter_token_or_name: row.official_filter_token_or_name,
      model_slugs: [],
      confidence_counts: { PROVEN: 0, UNKNOWN: 0, MAPPING_REVIEW_REQUIRED: 0 },
    };
    existing.model_slugs.push(row.fridge_slug);
    existing.confidence_counts[row.confidence] += 1;
    groups.set(row.grouped_official_filter_family, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.group_key.localeCompare(b.group_key));
}

function resolveModelRow(args: {
  input: RefrigeratorModelFirstInputRowV1;
  legacyFromCsv: string[];
  filterOemBySlug: Map<string, string>;
  linksByFilter: Map<string, RetailerRow[]>;
  manualEvidence: ManualEvidenceRecordV1 | undefined;
  discrepancy: DiscrepancyEntryV1 | undefined;
}): RefrigeratorModelFirstBatchModelRowV1 {
  const legacySlugs = args.legacyFromCsv.length > 0 ? args.legacyFromCsv : (args.input.legacy_csv_filter_slugs ?? []);
  const legacyOems = legacySlugs.map((slug) => args.filterOemBySlug.get(slug) ?? slug);

  let officialProof =
    args.manualEvidence ? officialProofFromManualEvidence(args.manualEvidence) : null;
  if (!officialProof && args.discrepancy) {
    officialProof = {
      official_filter_token: args.discrepancy.official_filter_token,
      proof_source_kind: "discrepancy_doc_official_lg",
      proof_source_urls: args.input.official_support_url_hint
        ? [args.input.official_support_url_hint]
        : [],
      proof_notes:
        "Official filter token from docs/fridge-model-filter-mapping-discrepancies.md (PROVEN_OFFICIAL_LG); repo mapping conflict documented.",
    };
  }

  let confidence: RefrigeratorModelFirstConfidenceV1 = "UNKNOWN";
  let plainAction =
    "Capture official manufacturer model/support page naming the exact water filter token for this refrigerator — do not change CSV rows until proof exists.";

  if (officialProof) {
    const matches = legacySlugsMatchOfficial({
      officialToken: officialProof.official_filter_token,
      legacyFilterSlugs: legacySlugs,
      filterOemBySlug: args.filterOemBySlug,
    });
    if (matches) {
      confidence = "PROVEN";
      plainAction =
        "Official manufacturer proof matches legacy CSV mapping for the documented filter token — buy-path proof remains separate; no CSV mutation authorized.";
    } else {
      confidence = "MAPPING_REVIEW_REQUIRED";
      plainAction =
        `Owner mapping review: official manufacturer filter is ${officialProof.official_filter_token} but legacy CSV maps ${legacySlugs.join(", ") || "no slugs"} — reconcile before any compat or buy-path promotion.`;
    }
  }

  const brandSlug = args.input.brand_slug.trim().toLowerCase();
  const officialTokenOrName = officialProof?.official_filter_token ?? null;
  const groupedFamily =
    officialTokenOrName != null ? `${brandSlug}::${normalizeToken(officialTokenOrName)}` : null;

  return {
    input_id: args.input.input_id,
    refrigerator_brand: args.input.brand_display,
    refrigerator_model: args.input.model_number,
    fridge_slug: args.input.fridge_slug,
    current_legacy_buckparts_filter_slugs: legacySlugs,
    legacy_filter_oem_tokens: legacyOems,
    official_filter_token_or_name: officialTokenOrName,
    official_proof: officialProof,
    confidence,
    grouped_official_filter_family: groupedFamily,
    safe_buy_path_exists: resolveSafeBuyPathExists({
      legacyFilterSlugs: legacySlugs,
      linksByFilter: args.linksByFilter,
    }),
    product_data_mutation_allowed: false,
    plain_english_next_action: plainAction,
    manifest_selection_reason: args.input.selection_reason ?? null,
  };
}

export function loadRefrigeratorModelFirstInputManifestV1(args: {
  rootDir: string;
  manifestRelPath: string;
}): RefrigeratorModelFirstInputManifestV1 {
  const abs = path.join(args.rootDir, args.manifestRelPath);
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as RefrigeratorModelFirstInputManifestV1;
  if (parsed.contract !== REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1) {
    throw new Error(
      `Manifest contract mismatch: expected ${REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1}, got ${String(parsed.contract)}`,
    );
  }
  if (!parsed.read_only) {
    throw new Error("Manifest must set read_only=true");
  }
  if (!Array.isArray(parsed.models) || parsed.models.length === 0) {
    throw new Error("Manifest models array is required");
  }
  return parsed;
}

export function buildRefrigeratorModelFirstBatchResolverV1(args: {
  rootDir: string;
  manifestRelPath: string;
  now?: () => Date;
}): RefrigeratorModelFirstBatchResolverV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const manifest = loadRefrigeratorModelFirstInputManifestV1({
    rootDir: args.rootDir,
    manifestRelPath: args.manifestRelPath,
  });

  const fridgeModels = readCsv<FridgeModelRow>(args.rootDir, CSV_PATHS_V1.fridge_models);
  const mappingsRaw = readCsv<MappingRow>(args.rootDir, CSV_PATHS_V1.compatibility_mappings);
  const filtersRaw = readCsv<FilterRow>(args.rootDir, CSV_PATHS_V1.filters);
  const linksRaw = readCsv<RetailerRow>(args.rootDir, CSV_PATHS_V1.retailer_links);

  const modelBySlug = new Map(
    fridgeModels.map((r) => [r.slug.trim().toLowerCase(), r] as const),
  );
  const mappingByModel = new Map<string, string[]>();
  for (const row of mappingsRaw) {
    const modelSlug = row.fridge_slug.trim().toLowerCase();
    const filterSlug = row.filter_slug.trim().toLowerCase();
    if (!modelSlug || !filterSlug) continue;
    if (!mappingByModel.has(modelSlug)) mappingByModel.set(modelSlug, []);
    mappingByModel.get(modelSlug)!.push(filterSlug);
  }
  for (const slugs of mappingByModel.values()) {
    slugs.sort((a, b) => a.localeCompare(b));
  }

  const filterOemBySlug = new Map(
    filtersRaw.map((r) => [r.slug.trim().toLowerCase(), (r.oem_part_number ?? r.slug).trim()] as const),
  );

  const linksByFilter = new Map<string, RetailerRow[]>();
  for (const row of linksRaw) {
    const slug = row.filter_slug.trim().toLowerCase();
    if (!linksByFilter.has(slug)) linksByFilter.set(slug, []);
    linksByFilter.get(slug)!.push(row);
  }

  const manualEvidenceBySlug = loadManualEvidenceBySlug(args.rootDir);
  const discrepancyBySlug = loadDiscrepancyEntries(args.rootDir);

  const modelRows: RefrigeratorModelFirstBatchModelRowV1[] = manifest.models.map((input) => {
    const fridgeSlug = input.fridge_slug.trim().toLowerCase();
    if (!modelBySlug.has(fridgeSlug)) {
      throw new Error(`Manifest fridge_slug not found in data/fridge_models.csv: ${input.fridge_slug}`);
    }
    return resolveModelRow({
      input,
      legacyFromCsv: mappingByModel.get(fridgeSlug) ?? [],
      filterOemBySlug,
      linksByFilter,
      manualEvidence: manualEvidenceBySlug.get(fridgeSlug),
      discrepancy: discrepancyBySlug.get(fridgeSlug),
    });
  });

  const confidenceCounts: Record<RefrigeratorModelFirstConfidenceV1, number> = {
    PROVEN: 0,
    UNKNOWN: 0,
    MAPPING_REVIEW_REQUIRED: 0,
  };
  for (const row of modelRows) {
    confidenceCounts[row.confidence] += 1;
  }

  const groupedFamilies = buildGroupedOfficialFamilies(modelRows);

  const inspect_summary: RefrigeratorModelFirstBatchResolverInspectSummaryV1 = {
    recommended_jq_paths: { standalone_report: ".inspect_summary" },
    batch_id: manifest.batch_id,
    models_checked_count: modelRows.length,
    confidence_counts: confidenceCounts,
    grouped_official_filter_families_count: groupedFamilies.length,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    recommended_next_action:
      confidenceCounts.MAPPING_REVIEW_REQUIRED > 0
        ? "Resolve MAPPING_REVIEW_REQUIRED models from official manufacturer proof before any CSV compat changes; continue read-only evidence capture for UNKNOWN models."
        : "Continue read-only official manufacturer evidence capture for UNKNOWN models; no CSV or buy-path mutation authorized.",
  };

  const proven_facts = [
    `PROVEN: manifest_contract=${REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1}.`,
    `PROVEN: models_checked_count=${String(modelRows.length)} from ${args.manifestRelPath}.`,
    "PROVEN: CSV mappings loaded as hypothesis only — PROVEN confidence requires committed manual evidence or discrepancy-doc official token plus matching legacy OEM tokens.",
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; buy_link_mutation_authorized=false; public_page_change_authorized=false.",
    `PROVEN: manual_evidence_fixtures_loaded=${String(manualEvidenceBySlug.size)} from ${REFRIGERATOR_MODEL_FIRST_MANUAL_EVIDENCE_DIR_REL_V1}.`,
    `PROVEN: discrepancy_doc_entries_loaded=${String(discrepancyBySlug.size)} from ${REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1}.`,
  ];

  const inferred_facts = [
    `INFERRED: confidence_counts=${JSON.stringify(confidenceCounts)}.`,
    "INFERRED: safe_buy_path_exists uses committed data/retailer_links.csv gates only — not fit proof.",
    "INFERRED: Exa/discovery/retailer search artifacts are intentionally excluded from fit proof in v1.",
  ];

  const unknown_facts = [
    `UNKNOWN: ${String(confidenceCounts.UNKNOWN)} manifest models lack committed official filter token proof in manual evidence or discrepancy doc.`,
    "UNKNOWN: Live Supabase mapping/buy-path rows vs committed CSV — resolver is CSV-only.",
  ];

  return {
    contract: REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    manifest_contract: REFRIGERATOR_MODEL_FIRST_INPUT_MANIFEST_CONTRACT_V1,
    manifest_path: args.manifestRelPath,
    batch_id: manifest.batch_id,
    source_contract: manifest.source_contract,
    exact_repo_paths_read: [
      args.manifestRelPath,
      ...Object.values(CSV_PATHS_V1),
      REFRIGERATOR_MODEL_FIRST_MANUAL_EVIDENCE_DIR_REL_V1,
      REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1,
    ],
    model_rows: modelRows,
    grouped_official_filter_families: groupedFamilies,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    inspect_summary,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
