/**
 * Read-only refrigerator model-first mapping-review reconciliation plan v1.
 * Proposed future compat changes only — no CSV/Supabase/public/buy-link apply.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1,
  REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1,
  buildRefrigeratorModelFirstBatchResolverV1,
  type OfficialFilterProofV1,
  type RefrigeratorModelFirstBatchModelRowV1,
  type RefrigeratorModelFirstBatchResolverV1,
} from "./refrigerator-model-first-batch-resolver-v1";

export const REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1 =
  "refrigerator_model_first_mapping_review_reconciliation_plan_v1" as const;

export type MappingReviewLegacySlugAssessmentV1 = {
  filter_slug: string;
  oem_part_number: string;
  reason: string;
};

export type ProposedFutureCompatChangesV1 = {
  remove_rows: string[];
  keep_rows: string[];
  add_rows: string[];
  not_applied: true;
};

export type MappingReviewReconciliationPlanRowV1 = {
  refrigerator_model: string;
  fridge_slug: string;
  official_filter_token_or_name: string;
  official_proof_source: OfficialFilterProofV1["proof_source_kind"] | "unknown";
  current_legacy_buckparts_filter_slugs: string[];
  legacy_mappings_look_wrong: MappingReviewLegacySlugAssessmentV1[];
  legacy_mappings_look_correct: MappingReviewLegacySlugAssessmentV1[];
  proposed_future_compat_changes: ProposedFutureCompatChangesV1;
  proposed_future_action: string;
  why_no_buy_link_change_yet: string;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
};

export type MappingReviewReconciliationPlanInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
  };
  mapping_review_model_count: number;
  total_proposed_removals: number;
  total_proposed_keeps: number;
  total_proposed_adds: number;
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  recommended_next_action: string;
};

export type RefrigeratorModelFirstMappingReviewReconciliationPlanV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_contract: typeof REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1;
  source_manifest_path: string;
  source_resolver_batch_id: string;
  discrepancy_doc_path: typeof REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1;
  exact_repo_paths_read: string[];
  grouped_official_filter_families: MappingReviewReconciliationPlanFamilyGroupV1[];
  rows: MappingReviewReconciliationPlanRowV1[];
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  inspect_summary: MappingReviewReconciliationPlanInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

import {
  canonicalSamsungRefrigeratorFilterSlugV1,
  legacyFilterSlugsMatchOfficialTokenV1,
  normalizeRefrigeratorFilterTokenV1,
} from "./refrigerator-model-first-samsung-marketing-token-cross-reference-v1";

type FilterRow = { slug: string; oem_part_number?: string };

const FILTERS_CSV_REL_V1 = "data/filters.csv" as const;

export type MappingReviewReconciliationPlanFamilyGroupV1 = {
  group_key: string;
  official_filter_token_or_name: string;
  model_slugs: string[];
  total_proposed_removals: number;
  total_proposed_keeps: number;
  total_proposed_adds: number;
};

function readFiltersCsv(rootDir: string): Map<string, string> {
  const abs = path.join(rootDir, FILTERS_CSV_REL_V1);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as FilterRow[];
  return new Map(
    rows.map((r) => [r.slug.trim().toLowerCase(), (r.oem_part_number ?? r.slug).trim()] as const),
  );
}

function normalizeToken(value: string): string {
  return normalizeRefrigeratorFilterTokenV1(value);
}

function slugOemMatchesOfficial(args: {
  brandSlug: string;
  filterSlug: string;
  officialToken: string;
  filterOemBySlug: Map<string, string>;
}): boolean {
  return legacyFilterSlugsMatchOfficialTokenV1({
    brandSlug: args.brandSlug,
    officialToken: args.officialToken,
    legacyFilterSlugs: [args.filterSlug],
    filterOemBySlug: args.filterOemBySlug,
  });
}

function compatRowKey(fridgeSlug: string, filterSlug: string): string {
  return `${fridgeSlug},${filterSlug}`;
}

function canonicalOfficialFilterSlug(args: {
  officialToken: string;
  filterOemBySlug: Map<string, string>;
}): string | null {
  const samsungCanonical = canonicalSamsungRefrigeratorFilterSlugV1(args);
  if (samsungCanonical) return samsungCanonical;

  const officialNorm = normalizeToken(args.officialToken);
  for (const [slug, oem] of args.filterOemBySlug.entries()) {
    if (normalizeToken(oem) === officialNorm) return slug;
  }
  return null;
}

function buildPlanRow(args: {
  modelRow: RefrigeratorModelFirstBatchModelRowV1;
  filterOemBySlug: Map<string, string>;
}): MappingReviewReconciliationPlanRowV1 {
  const officialToken = args.modelRow.official_filter_token_or_name;
  if (!officialToken) {
    throw new Error(`Mapping-review plan requires official_filter_token_or_name: ${args.modelRow.fridge_slug}`);
  }

  const fridgeSlug = args.modelRow.fridge_slug.trim().toLowerCase();
  const brandSlug = fridgeSlug.split("-")[0] ?? "unknown";
  const legacySlugs = args.modelRow.current_legacy_buckparts_filter_slugs;

  const legacy_mappings_look_correct: MappingReviewLegacySlugAssessmentV1[] = [];
  const legacy_mappings_look_wrong: MappingReviewLegacySlugAssessmentV1[] = [];

  for (const filterSlug of legacySlugs) {
    const oem = args.filterOemBySlug.get(filterSlug) ?? filterSlug;
    const assessment: MappingReviewLegacySlugAssessmentV1 = {
      filter_slug: filterSlug,
      oem_part_number: oem,
      reason: "",
    };
    if (slugOemMatchesOfficial({ brandSlug, filterSlug, officialToken, filterOemBySlug: args.filterOemBySlug })) {
      assessment.reason = `OEM token ${oem} matches official ${officialToken} family in data/filters.csv`;
      legacy_mappings_look_correct.push(assessment);
    } else {
      assessment.reason = `OEM token ${oem} does not match official ${officialToken} in data/filters.csv`;
      legacy_mappings_look_wrong.push(assessment);
    }
  }

  const canonicalSlug = canonicalOfficialFilterSlug({
    officialToken,
    filterOemBySlug: args.filterOemBySlug,
  });

  const remove_rows = legacy_mappings_look_wrong.map((r) => compatRowKey(fridgeSlug, r.filter_slug));
  const keep_rows = legacy_mappings_look_correct.map((r) => compatRowKey(fridgeSlug, r.filter_slug));
  const add_rows: string[] = [];
  if (canonicalSlug && !legacySlugs.includes(canonicalSlug)) {
    add_rows.push(compatRowKey(fridgeSlug, canonicalSlug));
  }

  const proofSource = args.modelRow.official_proof?.proof_source_kind ?? "unknown";

  let proposed_future_action: string;
  if (legacy_mappings_look_wrong.length > 0 && add_rows.length > 0) {
    proposed_future_action =
      `Owner-approved future compat patch (not applied): remove ${legacy_mappings_look_wrong.map((r) => r.filter_slug).join(", ")}; add ${canonicalSlug ?? officialToken} only after mapping-review sign-off.`;
  } else if (legacy_mappings_look_wrong.length > 0) {
    proposed_future_action =
      `Owner-approved future compat patch (not applied): remove ${legacy_mappings_look_wrong.map((r) => r.filter_slug).join(", ")}; keep ${legacy_mappings_look_correct.map((r) => r.filter_slug).join(", ") || "none"} after mapping-review sign-off.`;
  } else {
    proposed_future_action =
      "No compat row removals proposed — legacy slugs already align with official token family; buy-path proof remains separate.";
  }

  if (proofSource === "discrepancy_doc_official_lg") {
    proposed_future_action += " See docs/fridge-model-filter-mapping-discrepancies.md for owner adjudication options.";
  }

  return {
    refrigerator_model: args.modelRow.refrigerator_model,
    fridge_slug: args.modelRow.fridge_slug,
    official_filter_token_or_name: officialToken,
    official_proof_source: proofSource,
    current_legacy_buckparts_filter_slugs: legacySlugs,
    legacy_mappings_look_wrong,
    legacy_mappings_look_correct,
    proposed_future_compat_changes: {
      remove_rows,
      keep_rows,
      add_rows,
      not_applied: true,
    },
    proposed_future_action,
    why_no_buy_link_change_yet:
      "Fit mapping is not reconciled to official manufacturer token yet; this plan does not authorize CSV, Supabase, public page, or buy-link changes.",
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
  };
}

export function buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1(args: {
  rootDir: string;
  manifestRelPath: string;
  now?: () => Date;
  resolver?: RefrigeratorModelFirstBatchResolverV1;
}): RefrigeratorModelFirstMappingReviewReconciliationPlanV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();

  const resolver =
    args.resolver ??
    buildRefrigeratorModelFirstBatchResolverV1({
      rootDir: args.rootDir,
      manifestRelPath: args.manifestRelPath,
      now: args.now,
    });

  const filterOemBySlug = readFiltersCsv(args.rootDir);

  const mappingReviewRows = resolver.model_rows.filter(
    (row) => row.confidence === "MAPPING_REVIEW_REQUIRED",
  );

  const rows = mappingReviewRows.map((modelRow) =>
    buildPlanRow({ modelRow, filterOemBySlug }),
  );

  const familyGroupMap = new Map<string, MappingReviewReconciliationPlanFamilyGroupV1>();
  for (const row of rows) {
    const brandSlug = row.fridge_slug.split("-")[0] ?? "unknown";
    const groupKey = `${brandSlug}::${normalizeToken(row.official_filter_token_or_name)}`;
    const existing = familyGroupMap.get(groupKey) ?? {
      group_key: groupKey,
      official_filter_token_or_name: row.official_filter_token_or_name,
      model_slugs: [],
      total_proposed_removals: 0,
      total_proposed_keeps: 0,
      total_proposed_adds: 0,
    };
    existing.model_slugs.push(row.fridge_slug);
    existing.total_proposed_removals += row.proposed_future_compat_changes.remove_rows.length;
    existing.total_proposed_keeps += row.proposed_future_compat_changes.keep_rows.length;
    existing.total_proposed_adds += row.proposed_future_compat_changes.add_rows.length;
    familyGroupMap.set(groupKey, existing);
  }
  const grouped_official_filter_families = Array.from(familyGroupMap.values()).sort((a, b) =>
    a.group_key.localeCompare(b.group_key),
  );

  const totalProposedRemovals = rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.remove_rows.length,
    0,
  );
  const totalProposedKeeps = rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.keep_rows.length,
    0,
  );
  const totalProposedAdds = rows.reduce(
    (sum, row) => sum + row.proposed_future_compat_changes.add_rows.length,
    0,
  );

  const inspect_summary: MappingReviewReconciliationPlanInspectSummaryV1 = {
    recommended_jq_paths: { standalone_report: ".inspect_summary" },
    mapping_review_model_count: rows.length,
    total_proposed_removals: totalProposedRemovals,
    total_proposed_keeps: totalProposedKeeps,
    total_proposed_adds: totalProposedAdds,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    recommended_next_action:
      rows.length > 0
        ? "Founder review proposed compat diffs only — do not apply until each model has cleared mapping review."
        : "No MAPPING_REVIEW_REQUIRED rows in source resolver — reconciliation plan is empty.",
  };

  const proven_facts = [
    `PROVEN: source_contract=${REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1}.`,
    `PROVEN: mapping_review_model_count=${String(rows.length)} from resolver confidence=MAPPING_REVIEW_REQUIRED.`,
    `PROVEN: OEM comparison uses ${FILTERS_CSV_REL_V1} only — not retailer search or Exa.`,
    "PROVEN: proposed_future_compat_changes.not_applied=true for every row.",
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; buy_link_mutation_authorized=false; public_page_change_authorized=false.",
  ];

  const inferred_facts = [
    `INFERRED: total_proposed_removals=${String(totalProposedRemovals)}; total_proposed_keeps=${String(totalProposedKeeps)}; total_proposed_adds=${String(totalProposedAdds)}.`,
    `INFERRED: grouped_official_filter_families_count=${String(grouped_official_filter_families.length)} across LG LT1000P, Samsung HAF-QIN/HAF-CIN, GE RPWFE, Whirlpool EDR*, Frigidaire EPTWFU01/ULTRAWF.`,
    "INFERRED: lt1000pc may be kept as LT1000P-family variant when OEM token matches official family prefix rules.",
    "INFERRED: Samsung HAF-QIN/HAF-CIN reconcile via da97-17376* and da29-00020* slug families in data/filters.csv.",
  ];

  const unknown_facts =
    rows.length === 0
      ? ["UNKNOWN: No mapping-review rows in source resolver output."]
      : [
          "UNKNOWN: Whether lt1000pc scented variant should remain alongside lt1000p after owner review — plan keeps both when OEM family matches.",
          "UNKNOWN: Whether samsung da97-17376a vs da97-17376b both remain after owner review when either is present.",
          "UNKNOWN: Live Supabase compatibility_mappings vs committed CSV — plan is CSV-slug/OEM only.",
        ];

  return {
    contract: REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at,
    source_contract: REFRIGERATOR_MODEL_FIRST_BATCH_RESOLVER_CONTRACT_V1,
    source_manifest_path: args.manifestRelPath,
    source_resolver_batch_id: resolver.batch_id,
    discrepancy_doc_path: REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1,
    exact_repo_paths_read: [
      args.manifestRelPath,
      FILTERS_CSV_REL_V1,
      REFRIGERATOR_MODEL_FIRST_DISCREPANCY_DOC_REL_V1,
    ],
    grouped_official_filter_families,
    rows,
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
