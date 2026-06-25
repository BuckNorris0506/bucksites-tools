/**
 * Read-only Search Intent Factory proof experiment v1 — falsify whether a Search Intent
 * Factory can manufacture useful owner-review work items from existing BuckParts truth
 * without inventing new facts. Does NOT implement the factory.
 */

import {
  buildSearchIntentAlignmentExperimentReportV1,
  tokenizeHomeownerLanguageV1,
  type BuildSearchIntentAlignmentExperimentDepsV1,
  type ProvenQueryLanguageItemV1,
  type SearchIntentAlignmentPageRowV1,
  type SearchIntentAlignmentExperimentReportV1,
} from "./buckparts-search-intent-alignment-experiment-v1";
import type { ReferenceabilityFactoryRunV1 } from "./referenceability-factory-run-v1";

export const SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_CONTRACT_V1 =
  "search_intent_factory_proof_experiment_v1" as const;

export const SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_SOURCE_COMMAND_V1 =
  "npm run buckparts:search-intent-factory:proof-experiment" as const;

export const SEARCH_INTENT_FACTORY_PROOF_HYPOTHESIS_V1 =
  "A Search Intent Factory can manufacture useful owner-review work items using existing BuckParts truth without inventing new facts." as const;

export const SEARCH_INTENT_FACTORY_PROOF_WORK_ITEM_CLASSES_V1 = [
  "SEARCH_LANGUAGE_ALIGNMENT",
  "QUERY_ALIAS_REVIEW",
  "FAQ_OPPORTUNITY",
  "HEADING_ALIGNMENT",
  "VOCABULARY_GAP",
] as const;

export type SearchIntentFactoryProofWorkItemClassV1 =
  (typeof SEARCH_INTENT_FACTORY_PROOF_WORK_ITEM_CLASSES_V1)[number];

export type SearchIntentFactoryProofTruthRiskV1 = "LOW" | "MEDIUM" | "HIGH";

export type SearchIntentFactoryProofRejectionReasonV1 =
  | "CONTENT_INVENTION_REQUIRED"
  | "INSUFFICIENT_EVIDENCE"
  | "COMPATIBILITY_CLAIM_REQUIRED"
  | "SEO_COPY_REQUIRED"
  | "METADATA_EDIT_REQUIRED"
  | "PAGE_ALREADY_ALIGNED"
  | "INSUFFICIENT_GSC_DATA";

export type SearchIntentFactoryProofWorkItemV1 = {
  work_item_id: string;
  work_item_class: SearchIntentFactoryProofWorkItemClassV1;
  wedge: SearchIntentAlignmentPageRowV1["wedge"];
  slug: string;
  public_route: string;
  summary: string;
  evidence: string[];
  source: string;
  expected_customer_value: string;
  truth_risk: SearchIntentFactoryProofTruthRiskV1;
  validation_path: string;
  content_invention_required: false;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
};

export type SearchIntentFactoryProofRejectedWorkItemV1 = {
  work_item_class: SearchIntentFactoryProofWorkItemClassV1;
  summary: string;
  rejection_reason: SearchIntentFactoryProofRejectionReasonV1;
  evidence: string[];
};

export type SearchIntentFactoryProofPageRowV1 = {
  selection_rank: number;
  wedge: SearchIntentAlignmentPageRowV1["wedge"];
  slug: string;
  public_route: string;
  page_classification: "SAFE_BUYER_PATH_PROVEN";
  alignment_classification: SearchIntentAlignmentPageRowV1["alignment"]["classification"];
  root_cause: SearchIntentAlignmentPageRowV1["root_cause"];
  work_items_manufactured: SearchIntentFactoryProofWorkItemV1[];
  work_items_rejected: SearchIntentFactoryProofRejectedWorkItemV1[];
  source_artifacts: string[];
};

export type SearchIntentFactoryProofVerdictV1 =
  | "FACTORY_PROVEN"
  | "FACTORY_PARTIALLY_PROVEN"
  | "FACTORY_NOT_JUSTIFIED"
  | "UNKNOWN";

export type SearchIntentFactoryProofExperimentReportV1 = {
  contract: typeof SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  artifact_write_authorized: false;
  supabase_writes: false;
  source_command: typeof SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_SOURCE_COMMAND_V1;
  generated_at: string;
  falsification_hypothesis: typeof SEARCH_INTENT_FACTORY_PROOF_HYPOTHESIS_V1;
  upstream_contracts: [
    "search_intent_alignment_experiment_v1",
    "distribution_five_page_experiment_v1",
    "referenceability_factory_run_v1",
  ];
  gsc_available: boolean;
  manufactured_work_item_count: number;
  rejected_work_item_count: number;
  selected_pages: SearchIntentFactoryProofPageRowV1[];
  experiment_verdict: SearchIntentFactoryProofVerdictV1;
  verdict_rationale: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type BuildSearchIntentFactoryProofExperimentDepsV1 =
  BuildSearchIntentAlignmentExperimentDepsV1 & {
    alignmentReport?: SearchIntentAlignmentExperimentReportV1;
    referenceabilityFactory?: ReferenceabilityFactoryRunV1 | null;
  };

type WorkItemCandidateV1 = {
  work_item_class: SearchIntentFactoryProofWorkItemClassV1;
  summary: string;
  evidence: string[];
  source: string;
  expected_customer_value: string;
  truth_risk: SearchIntentFactoryProofTruthRiskV1;
  validation_path: string;
};

const INVENTION_PHRASES = [
  "write copy",
  "draft faq",
  "add metadata",
  "claim compatibility",
  "guarantee fit",
  "seo title",
  "meta description",
] as const;

function isWorkItemClass(value: unknown): value is SearchIntentFactoryProofWorkItemClassV1 {
  return (
    typeof value === "string" &&
    (SEARCH_INTENT_FACTORY_PROOF_WORK_ITEM_CLASSES_V1 as readonly string[]).includes(value)
  );
}

function workItemId(
  slug: string,
  workItemClass: SearchIntentFactoryProofWorkItemClassV1,
): string {
  return `search-intent-factory-proof-v1:${slug}:${workItemClass}`;
}

function inventoryValue(
  page: SearchIntentAlignmentPageRowV1,
  field: string,
): string | null {
  const item = page.homeowner_language_inventory.find((i) => i.field === field);
  return item?.value ?? null;
}

function pageTokenSet(page: SearchIntentAlignmentPageRowV1): Set<string> {
  const tokens = new Set<string>();
  for (const item of page.homeowner_language_inventory) {
    for (const t of tokenizeHomeownerLanguageV1(item.value)) tokens.add(t);
  }
  return tokens;
}

function queryTokenSet(queries: ProvenQueryLanguageItemV1[]): Set<string> {
  const tokens = new Set<string>();
  for (const q of queries) {
    for (const t of tokenizeHomeownerLanguageV1(q.query)) tokens.add(t);
  }
  return tokens;
}

function vocabularyGapTokens(
  pageTokens: Set<string>,
  queryTokens: Set<string>,
): string[] {
  return [...queryTokens].filter((t) => !pageTokens.has(t) && t.length >= 4).sort();
}

function questionShapedQueries(queries: ProvenQueryLanguageItemV1[]): ProvenQueryLanguageItemV1[] {
  return queries.filter((q) =>
    /\b(how|what|when|which|where|compatible|fit|replace|replacement)\b/i.test(q.query),
  );
}

function rejectCandidate(
  candidate: WorkItemCandidateV1,
  page: SearchIntentAlignmentPageRowV1,
): SearchIntentFactoryProofRejectedWorkItemV1 | null {
  const lower = candidate.summary.toLowerCase();
  if (candidate.evidence.length === 0) {
    return {
      work_item_class: candidate.work_item_class,
      summary: candidate.summary,
      rejection_reason: "INSUFFICIENT_EVIDENCE",
      evidence: candidate.evidence,
    };
  }

  if (INVENTION_PHRASES.some((p) => lower.includes(p))) {
    return {
      work_item_class: candidate.work_item_class,
      summary: candidate.summary,
      rejection_reason: "CONTENT_INVENTION_REQUIRED",
      evidence: candidate.evidence,
    };
  }

  if (
    page.root_cause === "PAGE_ALREADY_ALIGNED" &&
    (candidate.work_item_class === "SEARCH_LANGUAGE_ALIGNMENT" ||
      candidate.work_item_class === "VOCABULARY_GAP" ||
      candidate.work_item_class === "HEADING_ALIGNMENT")
  ) {
    return {
      work_item_class: candidate.work_item_class,
      summary: candidate.summary,
      rejection_reason: "PAGE_ALREADY_ALIGNED",
      evidence: candidate.evidence,
    };
  }

  if (
    page.root_cause === "INSUFFICIENT_GSC_DATA" &&
    (candidate.work_item_class === "SEARCH_LANGUAGE_ALIGNMENT" ||
      candidate.work_item_class === "VOCABULARY_GAP" ||
      candidate.work_item_class === "FAQ_OPPORTUNITY")
  ) {
    return {
      work_item_class: candidate.work_item_class,
      summary: candidate.summary,
      rejection_reason: "INSUFFICIENT_GSC_DATA",
      evidence: candidate.evidence,
    };
  }

  if (candidate.work_item_class === "FAQ_OPPORTUNITY") {
    const hasQuestion = questionShapedQueries(page.proven_query_language).length > 0;
    if (!hasQuestion) {
      return {
        work_item_class: candidate.work_item_class,
        summary: candidate.summary,
        rejection_reason: "INSUFFICIENT_EVIDENCE",
        evidence: candidate.evidence,
      };
    }
    if (lower.includes("answer:") || lower.includes("write faq")) {
      return {
        work_item_class: candidate.work_item_class,
        summary: candidate.summary,
        rejection_reason: "CONTENT_INVENTION_REQUIRED",
        evidence: candidate.evidence,
      };
    }
  }

  if (candidate.work_item_class === "QUERY_ALIAS_REVIEW") {
    const aliases = inventoryValue(page, "filter_aliases");
    if (!aliases) {
      return {
        work_item_class: candidate.work_item_class,
        summary: candidate.summary,
        rejection_reason: "INSUFFICIENT_EVIDENCE",
        evidence: candidate.evidence,
      };
    }
  }

  if (
    candidate.work_item_class === "VOCABULARY_GAP" &&
    page.proven_query_language.length === 0
  ) {
    return {
      work_item_class: candidate.work_item_class,
      summary: candidate.summary,
      rejection_reason: "INSUFFICIENT_GSC_DATA",
      evidence: candidate.evidence,
    };
  }

  const compatModels = inventoryValue(page, "compat_model_slugs");
  const compatTokens = compatModels ? tokenizeHomeownerLanguageV1(compatModels) : new Set<string>();
  if (candidate.work_item_class === "VOCABULARY_GAP") {
    const gaps = vocabularyGapTokens(pageTokenSet(page), queryTokenSet(page.proven_query_language));
    const modelLikeGaps = gaps.filter(
      (g) => !compatTokens.has(g) && /\d/.test(g) && g.length >= 6,
    );
    if (modelLikeGaps.length > 0 && gaps.every((g) => modelLikeGaps.includes(g))) {
      return {
        work_item_class: candidate.work_item_class,
        summary: candidate.summary,
        rejection_reason: "COMPATIBILITY_CLAIM_REQUIRED",
        evidence: [...candidate.evidence, ...modelLikeGaps.map((g) => `model_like_gap:${g}`)],
      };
    }
  }

  return null;
}

export function manufactureSearchIntentFactoryProofCandidatesV1(
  page: SearchIntentAlignmentPageRowV1,
): WorkItemCandidateV1[] {
  const candidates: WorkItemCandidateV1[] = [];
  const pageTokens = pageTokenSet(page);
  const queryTokens = queryTokenSet(page.proven_query_language);
  const gapTokens = vocabularyGapTokens(pageTokens, queryTokens);
  const gscSource = page.alignment.source;
  const oem = inventoryValue(page, "oem_part_number");
  const h1 = inventoryValue(page, "visible_h1_pattern");
  const aliases = inventoryValue(page, "filter_aliases");
  const filterName = inventoryValue(page, "filter_name");

  if (
    (page.alignment.classification === "LOW_ALIGNMENT" ||
      page.alignment.classification === "PARTIAL_ALIGNMENT") &&
    page.proven_query_language.length > 0
  ) {
    candidates.push({
      work_item_class: "SEARCH_LANGUAGE_ALIGNMENT",
      summary:
        "Owner review: align exposed page vocabulary with proven GSC homeowner-typed queries (inventory only — no copy drafted).",
      evidence: [
        `alignment:${page.alignment.classification}`,
        `root_cause:${page.root_cause}`,
        ...page.proven_query_language.slice(0, 5).map((q) => `gsc_query:${q.query}`),
      ],
      source: gscSource,
      expected_customer_value:
        "Homeowners searching proven query phrases can recognize the page as answering their intent.",
      truth_risk: "LOW",
      validation_path:
        "Re-run search_intent_alignment_experiment_v1 after owner review; compare token overlap only.",
    });
  }

  if (gapTokens.length > 0 && page.proven_query_language.length > 0) {
    candidates.push({
      work_item_class: "VOCABULARY_GAP",
      summary:
        "Owner review: proven query tokens absent from current homeowner language inventory.",
      evidence: gapTokens.slice(0, 8).map((t) => `query_token_missing_on_page:${t}`),
      source: gscSource,
      expected_customer_value:
        "Discovery improves when page vocabulary includes homeowner-typed tokens already visible in GSC.",
      truth_risk: "MEDIUM",
      validation_path:
        "Confirm each gap token appears in GSC/search-gap artifact before any surface copy change.",
    });
  }

  if (aliases) {
    candidates.push({
      work_item_class: "QUERY_ALIAS_REVIEW",
      summary:
        "Owner review: confirm filter_aliases.csv mappings cover proven query spellings (no new aliases invented in factory).",
      evidence: [
        `filter_aliases:${aliases}`,
        ...page.proven_query_language.slice(0, 3).map((q) => `gsc_query:${q.query}`),
      ],
      source: "data/filter_aliases.csv",
      expected_customer_value:
        "Search and on-page vocabulary stay consistent with repo-proven alias rows.",
      truth_risk: "LOW",
      validation_path: "Cross-check alias CSV against GSC query tokens; owner approves any CSV edit separately.",
    });
  }

  const h1Lower = (h1 ?? "").toLowerCase();
  const nameTokens = filterName ? [...tokenizeHomeownerLanguageV1(filterName)] : [];
  const queryHasNonOemConsumerToken = [...queryTokens].some(
    (t) =>
      t.length >= 5 &&
      t !== oem?.toLowerCase() &&
      !h1Lower.includes(t) &&
      nameTokens.includes(t),
  );
  if (queryHasNonOemConsumerToken && oem) {
    candidates.push({
      work_item_class: "HEADING_ALIGNMENT",
      summary:
        "Owner review: visible H1 emphasizes OEM token while proven queries include consumer name tokens already in filters.csv.",
      evidence: [
        `visible_h1_pattern:${h1 ?? "unknown"}`,
        `filter_name:${filterName ?? "unknown"}`,
        ...page.proven_query_language.slice(0, 3).map((q) => `gsc_query:${q.query}`),
      ],
      source: page.homeowner_language_inventory.find((i) => i.field === "visible_h1_pattern")?.source ??
        "page_template",
      expected_customer_value:
        "Homeowners who search consumer model names can match the visible heading without guessing OEM codes.",
      truth_risk: "LOW",
      validation_path: "Owner copy review against filters.csv name field only — no new fit claims.",
    });
  }

  const questionQueries = questionShapedQueries(page.proven_query_language);
  if (questionQueries.length > 0) {
    candidates.push({
      work_item_class: "FAQ_OPPORTUNITY",
      summary:
        "Owner review: proven question-shaped GSC queries exist — evaluate whether existing page sections address them (no FAQ text drafted).",
      evidence: questionQueries.slice(0, 5).map((q) => `question_query:${q.query}`),
      source: gscSource,
      expected_customer_value:
        "Question-shaped search demand is visible before any FAQ content is authored.",
      truth_risk: "LOW",
      validation_path:
        "Owner confirms existing copy covers query intent or defers — factory does not author FAQ answers.",
    });
  }

  return candidates;
}

export function validateSearchIntentFactoryProofWorkItemV1(
  item: SearchIntentFactoryProofWorkItemV1,
): boolean {
  if (!isWorkItemClass(item.work_item_class)) return false;
  if (item.content_invention_required !== false) return false;
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) return false;
  if (typeof item.source !== "string" || item.source.trim().length === 0) return false;
  if (typeof item.expected_customer_value !== "string" || item.expected_customer_value.trim().length === 0) {
    return false;
  }
  if (item.truth_risk !== "LOW" && item.truth_risk !== "MEDIUM" && item.truth_risk !== "HIGH") {
    return false;
  }
  if (typeof item.validation_path !== "string" || item.validation_path.trim().length === 0) {
    return false;
  }
  if (item.read_only !== true || item.data_mutation !== false) return false;
  if (item.mutation_authorized !== false || item.artifact_write_authorized !== false) return false;
  const lower = item.summary.toLowerCase();
  if (INVENTION_PHRASES.some((p) => lower.includes(p))) return false;
  return true;
}

export function manufactureSearchIntentFactoryProofPageV1(
  page: SearchIntentAlignmentPageRowV1,
): Pick<
  SearchIntentFactoryProofPageRowV1,
  "work_items_manufactured" | "work_items_rejected"
> {
  const work_items_manufactured: SearchIntentFactoryProofWorkItemV1[] = [];
  const work_items_rejected: SearchIntentFactoryProofRejectedWorkItemV1[] = [];
  const seen = new Set<string>();

  for (const candidate of manufactureSearchIntentFactoryProofCandidatesV1(page)) {
    const dedupeKey = `${page.slug}:${candidate.work_item_class}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rejection = rejectCandidate(candidate, page);
    if (rejection) {
      work_items_rejected.push(rejection);
      continue;
    }

    const item: SearchIntentFactoryProofWorkItemV1 = {
      work_item_id: workItemId(page.slug, candidate.work_item_class),
      work_item_class: candidate.work_item_class,
      wedge: page.wedge,
      slug: page.slug,
      public_route: page.public_route,
      summary: candidate.summary,
      evidence: candidate.evidence,
      source: candidate.source,
      expected_customer_value: candidate.expected_customer_value,
      truth_risk: candidate.truth_risk,
      validation_path: candidate.validation_path,
      content_invention_required: false,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      artifact_write_authorized: false,
    };

    if (!validateSearchIntentFactoryProofWorkItemV1(item)) {
      work_items_rejected.push({
        work_item_class: candidate.work_item_class,
        summary: candidate.summary,
        rejection_reason: "CONTENT_INVENTION_REQUIRED",
        evidence: candidate.evidence,
      });
      continue;
    }

    work_items_manufactured.push(item);
  }

  return { work_items_manufactured, work_items_rejected };
}

export function resolveSearchIntentFactoryProofVerdictV1(args: {
  pages: SearchIntentFactoryProofPageRowV1[];
  gscAvailable: boolean;
}): { verdict: SearchIntentFactoryProofVerdictV1; rationale: string[] } {
  const rationale: string[] = [];
  const manufactured = args.pages.reduce((n, p) => n + p.work_items_manufactured.length, 0);
  const rejected = args.pages.reduce((n, p) => n + p.work_items_rejected.length, 0);
  const insufficientDataPages = args.pages.filter(
    (p) => p.root_cause === "INSUFFICIENT_GSC_DATA",
  ).length;

  rationale.push(`manufactured_work_items=${manufactured}`);
  rationale.push(`rejected_work_items=${rejected}`);
  rationale.push(`insufficient_gsc_data_pages=${insufficientDataPages}/${args.pages.length}`);
  rationale.push(`gsc_available=${args.gscAvailable}`);

  const allManufacturedValid = args.pages.every((p) =>
    p.work_items_manufactured.every(validateSearchIntentFactoryProofWorkItemV1),
  );

  if (!args.gscAvailable && insufficientDataPages >= 3) {
    rationale.push("GSC unavailable on majority of pages — cannot prove factory manufacturing.");
    return { verdict: "UNKNOWN", rationale };
  }

  if (manufactured === 0) {
    rationale.push("No work items could be manufactured from repo truth.");
    return { verdict: "FACTORY_NOT_JUSTIFIED", rationale };
  }

  if (!allManufacturedValid) {
    rationale.push("At least one manufactured work item failed truth-derived validation.");
    return { verdict: "FACTORY_NOT_JUSTIFIED", rationale };
  }

  if (rejected > 0) {
    rationale.push(
      "Some candidates fail-closed rejected; manufactured items remain entirely repo-derived.",
    );
    return { verdict: "FACTORY_PARTIALLY_PROVEN", rationale };
  }

  rationale.push(
    "Every manufactured work item is repo-derived with zero invented content; zero rejections.",
  );
  return { verdict: "FACTORY_PROVEN", rationale };
}

export async function buildSearchIntentFactoryProofExperimentReportV1(
  deps: BuildSearchIntentFactoryProofExperimentDepsV1,
): Promise<SearchIntentFactoryProofExperimentReportV1> {
  const now = deps.now ?? (() => new Date());
  const alignment =
    deps.alignmentReport ??
    (await buildSearchIntentAlignmentExperimentReportV1({
      rootDir: deps.rootDir,
      now,
      fileExists: deps.fileExists,
      readText: deps.readText,
      loadGscArtifact: deps.loadGscArtifact,
      distributionPages: deps.distributionPages,
      searchGapRows: deps.searchGapRows,
      referenceabilityFactory: deps.referenceabilityFactory,
    }));

  const selected_pages: SearchIntentFactoryProofPageRowV1[] = alignment.selected_pages.map((page) => {
    const { work_items_manufactured, work_items_rejected } =
      manufactureSearchIntentFactoryProofPageV1(page);
    return {
      selection_rank: page.selection_rank,
      wedge: page.wedge,
      slug: page.slug,
      public_route: page.public_route,
      page_classification: "SAFE_BUYER_PATH_PROVEN",
      alignment_classification: page.alignment.classification,
      root_cause: page.root_cause,
      work_items_manufactured,
      work_items_rejected,
      source_artifacts: [
        "search_intent_alignment_experiment_v1",
        "distribution_five_page_experiment_v1",
        "referenceability_factory_run_v1",
        ...page.source_artifacts,
      ],
    };
  });

  const manufactured_work_item_count = selected_pages.reduce(
    (n, p) => n + p.work_items_manufactured.length,
    0,
  );
  const rejected_work_item_count = selected_pages.reduce(
    (n, p) => n + p.work_items_rejected.length,
    0,
  );

  const { verdict, rationale } = resolveSearchIntentFactoryProofVerdictV1({
    pages: selected_pages,
    gscAvailable: alignment.gsc_available,
  });

  return {
    contract: SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    artifact_write_authorized: false,
    supabase_writes: false,
    source_command: SEARCH_INTENT_FACTORY_PROOF_EXPERIMENT_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    falsification_hypothesis: SEARCH_INTENT_FACTORY_PROOF_HYPOTHESIS_V1,
    upstream_contracts: [
      "search_intent_alignment_experiment_v1",
      "distribution_five_page_experiment_v1",
      "referenceability_factory_run_v1",
    ],
    gsc_available: alignment.gsc_available,
    manufactured_work_item_count,
    rejected_work_item_count,
    selected_pages,
    experiment_verdict: verdict,
    verdict_rationale: rationale,
    proven_facts: [
      "PROVEN: read_only=true data_mutation=false mutation_authorized=false supabase_writes=false",
      "PROVEN: no Search Intent Factory implemented — manufacturing proof only",
      `PROVEN: manufactured_work_item_count=${manufactured_work_item_count}`,
      `PROVEN: rejected_work_item_count=${rejected_work_item_count}`,
      "PROVEN: all manufactured work items have content_invention_required=false",
    ],
    inferred_facts: alignment.inferred_facts,
    unknown_facts: alignment.unknown_facts,
  };
}
