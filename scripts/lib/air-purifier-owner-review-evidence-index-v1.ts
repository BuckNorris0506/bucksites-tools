/**
 * Read-only evidence index for AP demand-selected owner-review candidate selection.
 * Loads prior agent + model-first result JSON only; no CSV/Supabase/public mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildAirPurifierAgentResultsAggregatorV1Report,
  type ApAggregatedReviewRowV1,
  type ApReviewGroupKeyV1,
} from "./air-purifier-agent-results-aggregator-v1";

export const AP_OWNER_REVIEW_EVIDENCE_RESULT_DIRS_V1 = [
  "data/air-purifier/batch-production/agent-results",
  "data/air-purifier/batch-production/agent-results-batch-v2",
  "data/air-purifier/batch-production/agent-results-batch-v3",
] as const;

export type ApOwnerReviewEvidenceDispositionV1 =
  | "exclude_no_safe_path"
  | "exclude_mapping_review_required"
  | "hold_needs_owner_review"
  | "promote_pass_reference"
  | "neutral";

export type ApOwnerReviewEvidenceEntryV1 = {
  filter_slug: string;
  disposition: ApOwnerReviewEvidenceDispositionV1;
  agent_decision: string | null;
  agent_review_group: ApReviewGroupKeyV1 | null;
  model_first_mapping_review_required: boolean;
  promote_pass_reference: boolean;
  hold_needs_owner_review: boolean;
  exclude_from_owner_review: boolean;
  rationale: string;
  source_files: string[];
};

export type ApOwnerReviewEvidenceIndexV1 = {
  source_status: "PROVEN" | "PARTIAL" | "UNKNOWN";
  entries_by_slug: Map<string, ApOwnerReviewEvidenceEntryV1>;
  excluded_slugs: string[];
};

type SlugEvidenceAccumulatorV1 = {
  filter_slug: string;
  source_files: string[];
  agent_decisions: string[];
  agent_review_groups: ApReviewGroupKeyV1[];
  has_no_safe_path: boolean;
  has_needs_owner_review: boolean;
  has_pass_reference_mutation: boolean;
  pass_reference_source_file: string | null;
  model_first_mapping_review_required: boolean;
};

function ingestAgentRow(acc: SlugEvidenceAccumulatorV1, row: ApAggregatedReviewRowV1): void {
  acc.source_files.push(row.source_file);
  acc.agent_decisions.push(row.decision);
  acc.agent_review_groups.push(row.review_group);

  if (row.decision === "NO_SAFE_PATH" || row.review_group === "no_safe_path") {
    acc.has_no_safe_path = true;
  }
  if (
    row.decision === "NEEDS_OWNER_REVIEW" ||
    row.decision === "REJECT_WRONG_FAMILY" ||
    row.decision === "REJECT_SEARCH_CATEGORY" ||
    row.owner_review_required
  ) {
    acc.has_needs_owner_review = true;
  }
  if (
    row.decision === "PASS_REFERENCE" &&
    row.recommended_csv_mutation != null &&
    row.final_url?.trim()
  ) {
    acc.has_pass_reference_mutation = true;
    acc.pass_reference_source_file = row.source_file;
  }
}

function finalizeSlugEvidenceAccumulatorV1(acc: SlugEvidenceAccumulatorV1): ApOwnerReviewEvidenceEntryV1 {
  const exclude_from_owner_review =
    acc.has_no_safe_path || acc.model_first_mapping_review_required;
  const promote_pass_reference = !exclude_from_owner_review && acc.has_pass_reference_mutation;
  const hold_needs_owner_review =
    !exclude_from_owner_review && !promote_pass_reference && acc.has_needs_owner_review;

  let disposition: ApOwnerReviewEvidenceDispositionV1 = "neutral";
  if (acc.has_no_safe_path) disposition = "exclude_no_safe_path";
  else if (acc.model_first_mapping_review_required) disposition = "exclude_mapping_review_required";
  else if (promote_pass_reference) disposition = "promote_pass_reference";
  else if (hold_needs_owner_review) disposition = "hold_needs_owner_review";

  const rationaleParts: string[] = [];
  if (acc.has_no_safe_path) {
    rationaleParts.push("Agent evidence NO_SAFE_PATH across prior result files.");
  }
  if (acc.model_first_mapping_review_required) {
    rationaleParts.push("Model-first evidence MODEL_FILTER_MAPPING_REVIEW_REQUIRED.");
  }
  if (promote_pass_reference && acc.pass_reference_source_file) {
    rationaleParts.push(
      `Agent evidence PASS_REFERENCE with recommended_csv_mutation (${acc.pass_reference_source_file}).`,
    );
  }
  if (hold_needs_owner_review) {
    rationaleParts.push("Agent evidence NEEDS_OWNER_REVIEW or REJECT_WRONG_FAMILY.");
  }

  return {
    filter_slug: acc.filter_slug,
    disposition,
    agent_decision: acc.agent_decisions.at(-1) ?? null,
    agent_review_group: acc.agent_review_groups.at(-1) ?? null,
    model_first_mapping_review_required: acc.model_first_mapping_review_required,
    promote_pass_reference,
    hold_needs_owner_review,
    exclude_from_owner_review,
    rationale: rationaleParts.join(" "),
    source_files: Array.from(new Set(acc.source_files)),
  };
}

function modelFirstResultRelPathsV1(filterSlug: string): string[] {
  return [
    `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-${filterSlug}-live-browser-v1.results.json`,
    `data/air-purifier/batch-production/agent-results-model-first-v1/ap-model-first-${filterSlug}-v1.results.json`,
  ];
}

function loadModelFirstMappingReviewRequired(args: {
  rootDir: string;
  filterSlug: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): { required: boolean; sourceFile: string | null } {
  for (const rel of modelFirstResultRelPathsV1(args.filterSlug)) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const parsed = JSON.parse(args.readTextFile(abs)) as {
        proven_facts?: string[];
        filter_slug_evidence?: { rejection_reason?: string | null };
      };
      const facts = Array.isArray(parsed.proven_facts) ? parsed.proven_facts : [];
      const mappingInFacts = facts.some((fact) =>
        fact.includes("MODEL_FILTER_MAPPING_REVIEW_REQUIRED"),
      );
      const mappingInRejection = (parsed.filter_slug_evidence?.rejection_reason ?? "").includes(
        "MODEL_FILTER_MAPPING_REVIEW_REQUIRED",
      );
      if (mappingInFacts || mappingInRejection) {
        return { required: true, sourceFile: rel };
      }
    } catch {
      continue;
    }
  }
  return { required: false, sourceFile: null };
}

export function loadApOwnerReviewEvidenceIndexV1(args: {
  rootDir: string;
  fileExists?: (absolutePath: string) => boolean;
  readTextFile?: (absolutePath: string) => string;
}): ApOwnerReviewEvidenceIndexV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));

  const accumulators = new Map<string, SlugEvidenceAccumulatorV1>();
  let source_status: ApOwnerReviewEvidenceIndexV1["source_status"] = "UNKNOWN";
  let dirsWithFiles = 0;

  for (const resultsDir of AP_OWNER_REVIEW_EVIDENCE_RESULT_DIRS_V1) {
    const report = buildAirPurifierAgentResultsAggregatorV1Report({
      rootDir: args.rootDir,
      resultsDir,
      readFile: readTextFile,
    });
    if (report.result_file_count > 0) {
      dirsWithFiles += 1;
      if (report.source_status === "PROVEN") source_status = "PROVEN";
      else if (report.source_status === "PARTIAL" && source_status !== "PROVEN") {
        source_status = "PARTIAL";
      }
    }

    const allRows = [
      ...report.review_groups.no_safe_path,
      ...report.review_groups.owner_review_required,
      ...report.review_groups.reference_eligible,
      ...report.review_groups.auto_apply_eligible,
      ...report.review_groups.catalog_task_required,
      ...report.review_groups.rejected,
    ];

    for (const row of allRows) {
      const acc =
        accumulators.get(row.slug) ??
        ({
          filter_slug: row.slug,
          source_files: [],
          agent_decisions: [],
          agent_review_groups: [],
          has_no_safe_path: false,
          has_needs_owner_review: false,
          has_pass_reference_mutation: false,
          pass_reference_source_file: null,
          model_first_mapping_review_required: false,
        } satisfies SlugEvidenceAccumulatorV1);
      ingestAgentRow(acc, row);
      accumulators.set(row.slug, acc);
    }
  }

  const entries_by_slug = new Map<string, ApOwnerReviewEvidenceEntryV1>();
  for (const acc of Array.from(accumulators.values())) {
    entries_by_slug.set(acc.filter_slug, finalizeSlugEvidenceAccumulatorV1(acc));
  }

  if (dirsWithFiles === 0) {
    source_status = "UNKNOWN";
  } else if (source_status === "UNKNOWN") {
    source_status = "PARTIAL";
  }

  for (const slug of Array.from(accumulators.keys())) {
    const mapping = loadModelFirstMappingReviewRequired({
      rootDir: args.rootDir,
      filterSlug: slug,
      fileExists,
      readTextFile,
    });
    if (!mapping.required) continue;
    const acc = accumulators.get(slug);
    if (!acc) continue;
    acc.model_first_mapping_review_required = true;
    if (mapping.sourceFile) acc.source_files.push(mapping.sourceFile);
    entries_by_slug.set(slug, finalizeSlugEvidenceAccumulatorV1(acc));
  }

  const excluded_slugs = Array.from(entries_by_slug.values())
    .filter((entry) => entry.exclude_from_owner_review)
    .map((entry) => entry.filter_slug)
    .sort((a, b) => a.localeCompare(b));

  return { source_status, entries_by_slug, excluded_slugs };
}

export function getApOwnerReviewEvidenceEntryV1(
  index: ApOwnerReviewEvidenceIndexV1 | null | undefined,
  filterSlug: string,
): ApOwnerReviewEvidenceEntryV1 | null {
  if (!index) return null;
  return index.entries_by_slug.get(filterSlug) ?? null;
}
