/**
 * Read-only AP model-first evidence queue v1 — steering layer from model-first lane +
 * weak buyer path audit. No packet files, CSV, or Supabase mutation.
 */

import type { AirPurifierModelFirstProductionLaneReportV1 } from "./air-purifier-model-first-production-lane-v1";
import {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
  isModelFirstResultCompletedNoMutationV1,
  latestCommittedModelFirstResultsByFilterSlugV1,
  loadCommittedModelFirstEvidenceResultsV1,
} from "./air-purifier-model-first-evidence-result-v1";
import type {
  AirPurifierWeakBuyerPathAuditReportV1,
  WeakBuyerPathWeaknessClassV1,
} from "./air-purifier-weak-buyer-path-audit-v1";

export {
  AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
  AP_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1,
} from "./air-purifier-model-first-evidence-result-v1";

export const AP_MODEL_FIRST_EVIDENCE_QUEUE_COMMAND_V1 =
  "npx tsx scripts/report-ap-model-first-evidence-queue-v1.ts" as const;

export const AP_MODEL_FIRST_EVIDENCE_PACKETS_DIR_REL_V1 =
  "data/air-purifier/batch-production/agent-packets-model-first-v1" as const;

/** Repo-proven dominance: 39/41 weak filters are search-placeholder primaries. */
export const AP_MODEL_FIRST_SEARCH_PLACEHOLDER_DOMINANCE_MIN_V1 = 30;

export const MODEL_FIRST_EVIDENCE_PATH_DESCRIPTION_V1 =
  "official model/support/manual page → documented replacement filter/part → verified safe buyer path (read-only browser proof; no CSV apply)" as const;

export const MODEL_FIRST_QUEUE_FORBIDDEN_MUTATIONS_V1 = [
  "product_csv_write",
  "retailer_links_csv_write",
  "models_csv_write",
  "supabase_apply",
  "dispatch_run_registry_write",
  "batch_review_artifact_mutation",
  "filter_first_csv_apply_without_browser_proof",
] as const;

export type ApModelFirstQueueStatusV1 = "READY" | "EMPTY" | "BLOCKED" | "UNKNOWN";

export type ApModelFirstQueueSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type ApModelFirstQueueCandidateV1 = {
  filter_slug: string;
  brand_slug: string;
  model_count_using_filter: number;
  buyer_path_weakness_class: WeakBuyerPathWeaknessClassV1;
  evidence_priority_score: number;
  sample_model_slugs: string[];
  sample_model_numbers: string[];
  intended_evidence_path: typeof MODEL_FIRST_EVIDENCE_PATH_DESCRIPTION_V1;
  do_not_claim_unavailable: true;
};

export const MODEL_FIRST_COMPLETION_REASON_COMPLETED_NO_MUTATION_V1 =
  "completed_model_first_no_mutation" as const;

export type ApModelFirstCompletedNoMutationCandidateV1 = ApModelFirstQueueCandidateV1 & {
  completion_reason: typeof MODEL_FIRST_COMPLETION_REASON_COMPLETED_NO_MUTATION_V1;
  result_artifact_rel: string;
  result_pass_count: number;
  retry_hint: string;
};

export type ApModelFirstEvidenceResultHistoryV1 = {
  completed_result_count: number;
  completed_filter_slugs: string[];
  no_mutation_completed_filter_slugs: string[];
  invalid_result_files: string[];
};

export type ApModelFirstRecommendedPacketV1 = {
  packet_id: string;
  read_only: true;
  anchor_filter_slug: string;
  anchor_brand_slug: string;
  anchor_model_slugs: string[];
  evidence_path: typeof MODEL_FIRST_EVIDENCE_PATH_DESCRIPTION_V1;
  artifacts_not_written_yet: true;
};

export type ApModelFirstEvidenceQueueReportV1 = {
  contract: typeof AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: ApModelFirstQueueSourceStatusV1;
  queue_status: ApModelFirstQueueStatusV1;
  /** Active candidates eligible for primary top slot (excludes completed no-mutation). */
  candidate_count: number;
  merged_candidate_count: number;
  top_candidates: ApModelFirstQueueCandidateV1[];
  completed_no_mutation_candidates: ApModelFirstCompletedNoMutationCandidateV1[];
  result_history: ApModelFirstEvidenceResultHistoryV1;
  recommended_packet: ApModelFirstRecommendedPacketV1 | null;
  why_model_first: string;
  old_filter_first_drift_risk: string;
  forbidden_mutations: readonly string[];
  steering_primary_eligible: boolean;
  demoted_batch_subsystem: string | null;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildApModelFirstEvidenceQueueDepsV1 = {
  rootDir?: string;
  now?: () => Date;
  modelFirstLane: AirPurifierModelFirstProductionLaneReportV1 | null;
  weakBuyerPathAudit: AirPurifierWeakBuyerPathAuditReportV1 | null;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  readdir?: (absDir: string) => string[];
};

function sampleModelsForFilter(
  lane: AirPurifierModelFirstProductionLaneReportV1 | null,
  filterSlug: string,
): { slugs: string[]; numbers: string[] } {
  if (!lane) return { slugs: [], numbers: [] };
  const rows = lane.candidate_rows.filter((r) => r.linked_filter_slug === filterSlug);
  const slugs: string[] = [];
  const numbers: string[] = [];
  for (const row of rows) {
    if (slugs.length >= 5) break;
    slugs.push(row.model_slug);
    if (row.model_number) numbers.push(row.model_number);
  }
  return { slugs, numbers };
}

function mergeTopCandidates(
  weakAudit: AirPurifierWeakBuyerPathAuditReportV1,
  lane: AirPurifierModelFirstProductionLaneReportV1 | null,
): ApModelFirstQueueCandidateV1[] {
  const bySlug = new Map<string, ApModelFirstQueueCandidateV1>();

  const addFromSummary = (
    row: {
      filter_slug: string;
      brand_slug: string;
      model_count_using_filter: number;
      buyer_path_weakness_class: WeakBuyerPathWeaknessClassV1;
      evidence_priority_score: number;
    },
    priorityBoost: number,
  ) => {
    const samples = sampleModelsForFilter(lane, row.filter_slug);
    const existing = bySlug.get(row.filter_slug);
    const score = row.evidence_priority_score + priorityBoost;
    if (!existing || score > existing.evidence_priority_score) {
      bySlug.set(row.filter_slug, {
        filter_slug: row.filter_slug,
        brand_slug: row.brand_slug,
        model_count_using_filter: row.model_count_using_filter,
        buyer_path_weakness_class: row.buyer_path_weakness_class,
        evidence_priority_score: score,
        sample_model_slugs: samples.slugs.length > 0 ? samples.slugs : existing?.sample_model_slugs ?? [],
        sample_model_numbers:
          samples.numbers.length > 0 ? samples.numbers : existing?.sample_model_numbers ?? [],
        intended_evidence_path: MODEL_FIRST_EVIDENCE_PATH_DESCRIPTION_V1,
        do_not_claim_unavailable: true,
      });
    } else if (existing && samples.slugs.length > 0 && existing.sample_model_slugs.length === 0) {
      existing.sample_model_slugs = samples.slugs;
      existing.sample_model_numbers = samples.numbers;
    }
  };

  for (const row of weakAudit.top_10_weak_filters_by_evidence_priority) {
    addFromSummary(row, 3);
  }
  for (const row of weakAudit.top_10_weak_filters_by_model_coverage) {
    addFromSummary(row, 0);
  }

  return Array.from(bySlug.values())
    .sort((a, b) => {
      if (b.evidence_priority_score !== a.evidence_priority_score) {
        return b.evidence_priority_score - a.evidence_priority_score;
      }
      return b.model_count_using_filter - a.model_count_using_filter;
    })
    .slice(0, 10);
}

function splitCandidatesByCommittedResults(args: {
  merged: ApModelFirstQueueCandidateV1[];
  exhaustedSlugs: Set<string>;
  latestBySlug: ReturnType<typeof latestCommittedModelFirstResultsByFilterSlugV1>;
}): {
  active: ApModelFirstQueueCandidateV1[];
  completed: ApModelFirstCompletedNoMutationCandidateV1[];
} {
  const active: ApModelFirstQueueCandidateV1[] = [];
  const completed: ApModelFirstCompletedNoMutationCandidateV1[] = [];

  for (const candidate of args.merged) {
    if (!args.exhaustedSlugs.has(candidate.filter_slug)) {
      active.push(candidate);
      continue;
    }
    const entry = args.latestBySlug.get(candidate.filter_slug);
    if (!entry) continue;
    completed.push({
      ...candidate,
      completion_reason: MODEL_FIRST_COMPLETION_REASON_COMPLETED_NO_MUTATION_V1,
      result_artifact_rel: entry.relPath,
      result_pass_count: entry.result.evidence_status_counts.PASS,
      retry_hint:
        "Committed model-first result exists with recommended_csv_mutation null and PASS=0 — retry only after new evidence strategy or upstream catalog change.",
    });
  }

  return { active, completed };
}

export function buildModelFirstEvidenceResultHistoryV1(args: {
  rootDir: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  readdir?: (absDir: string) => string[];
}): {
  history: ApModelFirstEvidenceResultHistoryV1;
  exhaustedSlugs: Set<string>;
  latestBySlug: ReturnType<typeof latestCommittedModelFirstResultsByFilterSlugV1>;
} {
  const load = loadCommittedModelFirstEvidenceResultsV1(args);
  const latestBySlug = latestCommittedModelFirstResultsByFilterSlugV1(load);
  const completed_filter_slugs = Array.from(latestBySlug.keys()).sort();
  const no_mutation_completed_filter_slugs: string[] = [];

  for (const [slug, entry] of Array.from(latestBySlug.entries())) {
    if (isModelFirstResultCompletedNoMutationV1(entry.result)) {
      no_mutation_completed_filter_slugs.push(slug);
    }
  }
  no_mutation_completed_filter_slugs.sort();

  return {
    history: {
      completed_result_count: latestBySlug.size,
      completed_filter_slugs,
      no_mutation_completed_filter_slugs,
      invalid_result_files: load.invalid_result_files.slice().sort(),
    },
    exhaustedSlugs: new Set(no_mutation_completed_filter_slugs),
    latestBySlug,
  };
}

export function isModelFirstSteeringPrimaryEligibleV1(args: {
  weakBuyerPathAudit: AirPurifierWeakBuyerPathAuditReportV1 | null;
  candidateCount: number;
  apBatchV3SafeCsvMutationCount: number;
}): boolean {
  if (!args.weakBuyerPathAudit) return false;
  if (args.candidateCount === 0) return false;
  if (args.apBatchV3SafeCsvMutationCount > 0) return false;
  if (args.weakBuyerPathAudit.weak_linked_filter_count === 0) return false;
  return (
    args.weakBuyerPathAudit.search_placeholder_primary_count >=
    AP_MODEL_FIRST_SEARCH_PLACEHOLDER_DOMINANCE_MIN_V1
  );
}

export function buildApModelFirstEvidenceQueueUnknownV1(args: {
  now?: () => Date;
  reason: string;
}): ApModelFirstEvidenceQueueReportV1 {
  const now = args.now ?? (() => new Date());
  return {
    contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status: "UNKNOWN",
    queue_status: "UNKNOWN",
    candidate_count: 0,
    merged_candidate_count: 0,
    top_candidates: [],
    completed_no_mutation_candidates: [],
    result_history: {
      completed_result_count: 0,
      completed_filter_slugs: [],
      no_mutation_completed_filter_slugs: [],
      invalid_result_files: [],
    },
    recommended_packet: null,
    why_model_first: "Model-first queue could not be built from upstream reports.",
    old_filter_first_drift_risk: args.reason,
    forbidden_mutations: MODEL_FIRST_QUEUE_FORBIDDEN_MUTATIONS_V1,
    steering_primary_eligible: false,
    demoted_batch_subsystem: null,
    proven_facts: [],
    unknown_facts: [args.reason],
  };
}

export function buildApModelFirstEvidenceQueueV1Report(
  deps: BuildApModelFirstEvidenceQueueDepsV1,
): ApModelFirstEvidenceQueueReportV1 {
  const now = deps.now ?? (() => new Date());
  const lane = deps.modelFirstLane;
  const weak = deps.weakBuyerPathAudit;

  if (!lane || !weak) {
    return buildApModelFirstEvidenceQueueUnknownV1({
      now,
      reason: "Missing model-first lane or weak buyer path audit input.",
    });
  }

  const rootDir = deps.rootDir ?? process.cwd();
  const merged_candidates = mergeTopCandidates(weak, lane);
  const merged_candidate_count = merged_candidates.length;

  const { history: result_history, exhaustedSlugs, latestBySlug } =
    buildModelFirstEvidenceResultHistoryV1({
      rootDir,
      fileExists: deps.fileExists,
      readText: deps.readText,
      readdir: deps.readdir,
    });

  const { active, completed } = splitCandidatesByCommittedResults({
    merged: merged_candidates,
    exhaustedSlugs,
    latestBySlug,
  });

  const top_candidates = active.slice(0, 10);
  const completed_no_mutation_candidates = completed;
  const candidate_count = top_candidates.length;
  const top = top_candidates[0] ?? null;

  const batchSafeMutations = lane.comparison_to_filter_first_batch_v3.safe_csv_mutations;
  const steering_primary_eligible = isModelFirstSteeringPrimaryEligibleV1({
    weakBuyerPathAudit: weak,
    candidateCount: candidate_count,
    apBatchV3SafeCsvMutationCount: batchSafeMutations,
  });

  const recommended_packet: ApModelFirstRecommendedPacketV1 | null = top
    ? {
        packet_id: "ap-model-first-evidence-proposed-v1",
        read_only: true,
        anchor_filter_slug: top.filter_slug,
        anchor_brand_slug: top.brand_slug,
        anchor_model_slugs: top.sample_model_slugs,
        evidence_path: MODEL_FIRST_EVIDENCE_PATH_DESCRIPTION_V1,
        artifacts_not_written_yet: true,
      }
    : null;

  const source_status: ApModelFirstQueueSourceStatusV1 =
    lane.source_status === "PROVEN" && weak.source_status === "PROVEN"
      ? "PROVEN"
      : lane.source_status === "UNKNOWN" || weak.source_status === "UNKNOWN"
        ? "UNKNOWN"
        : "PARTIAL";

  const queue_status: ApModelFirstQueueStatusV1 =
    candidate_count === 0 ? "EMPTY" : source_status === "UNKNOWN" ? "UNKNOWN" : "READY";

  const why_model_first =
    "Homeowners discover replacement filters from owned appliance model; repo maps 287 models to filters but 41 linked filters lack verified safe direct-buyable primaries — collect official model/support evidence before filter-SKU search rescue.";

  const old_filter_first_drift_risk =
    `INFERRED: ${String(weak.search_placeholder_primary_count)} of ${String(weak.weak_linked_filter_count)} weak filters use OEM search-placeholder primaries; ap-batch-v3 filter-first produced ${String(batchSafeMutations)} safe CSV mutations — continuing aggregation-first steering retries low-yield search rescue.`;

  const demoted_batch_subsystem = steering_primary_eligible
    ? "ap_batch_v3_aggregation_review"
    : null;

  return {
    contract: AP_MODEL_FIRST_EVIDENCE_QUEUE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status,
    queue_status,
    candidate_count,
    merged_candidate_count,
    top_candidates,
    completed_no_mutation_candidates,
    result_history,
    recommended_packet,
    why_model_first,
    old_filter_first_drift_risk,
    forbidden_mutations: MODEL_FIRST_QUEUE_FORBIDDEN_MUTATIONS_V1,
    steering_primary_eligible,
    demoted_batch_subsystem,
    proven_facts: [
      `PROVEN: Queue built from ${lane.contract} + ${weak.contract}.`,
      `PROVEN: ${String(candidate_count)} active top queue candidate(s); top filter ${top?.filter_slug ?? "none"}.`,
      `PROVEN: ${String(merged_candidate_count)} merged weak-lane candidate(s); ${String(completed_no_mutation_candidates.length)} completed no-mutation excluded.`,
      `PROVEN: Committed model-first results loaded: ${String(result_history.completed_result_count)} valid; no_mutation_completed=${result_history.no_mutation_completed_filter_slugs.join(",") || "none"}.`,
      `PROVEN: Weak audit search_placeholder_primary_count=${String(weak.search_placeholder_primary_count)}.`,
      `PROVEN: AP batch-v3 safe_csv_mutations=${String(batchSafeMutations)}.`,
      steering_primary_eligible
        ? "PROVEN: Model-first steering is primary-eligible (search-placeholder dominance + zero safe batch-v3 mutations + active queue candidates)."
        : "PROVEN: Model-first steering is not primary-eligible in this snapshot.",
    ],
    unknown_facts: [
      result_history.completed_result_count > 0
        ? "UNKNOWN: Whether a different evidence strategy will yield PASS>0 for filters already completed with no mutation."
        : "UNKNOWN: Whether model-first browser evidence will yield direct_buyable primaries.",
      lane.unknown_facts[0] ?? "UNKNOWN: model-first lane caveats apply.",
    ],
  };
}
