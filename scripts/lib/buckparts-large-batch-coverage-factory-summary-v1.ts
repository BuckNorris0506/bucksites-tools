/**
 * Command Center v1 summary lane for Large Batch Coverage Factory (read-only projection).
 */

import {
  buildUcfCoverageDispositionProvenanceFactsV1,
  buildUcfDecisionAuthoritySnapshotV1,
  type UcfDecisionAuthoritySnapshotV1,
} from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";
import { UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1 } from "@/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1";
import {
  buildLargeBatchCoverageFactoryReportV1,
  LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
  type BuildLargeBatchCoverageFactoryDepsV1,
  type LargeBatchCoverageFactoryReportV1,
  type LargeBatchCoverageFactoryStateV1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";

import {
  buildLargeBatchCoverageFactorySummaryDualAuthorityV1,
  buildTopCandidatesUcfDispositionV1,
  dualOutputAuthorityProvenanceFactV1,
  LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1,
  type LargeBatchCoverageFactorySummaryDualAuthorityV1,
  type LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1,
  UCF_DISPOSITION_AUTHORITY_V1,
} from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";

export {
  GOAT_C1_LBCF_UCF_DUAL_OUTPUT_AUTHORITY_CONTRACT_V1,
  LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1,
  UCF_DISPOSITION_AUTHORITY_V1,
  type LargeBatchCoverageFactorySummaryDualAuthorityV1,
  type LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1,
} from "./buckparts-large-batch-coverage-factory-dual-output-authority-v1";

export const LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_CONTRACT_V1 =
  "large_batch_coverage_factory_summary_v1" as const;

export const LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1 =
  "buckparts_large_batch_coverage_factory_summary_v1" as const;

const MAX_TOP_CANDIDATES = 5;

const EXPANSION_DEPTH_NOTE_V1 =
  "Factory currently classifies the existing fridge set only until a deeper expansion source is added (bulk catalog row count matches live filters.csv today).";

const FIRST_FRIDGE_EXPANSION_DEMOTED_NOTE_V1 =
  "PROVEN: first fridge expansion batch (docs/BuckParts-FIRST-FRIDGE-EXPANSION-EVIDENCE-TRIAGE.md) produced 0 import-ready candidates; failed slugs are in FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1 only — active expansion source needs a stronger upstream source before new bulk-only rows are queued.";

export type LargeBatchCoverageFactorySummaryRuntimeStatusV1 = "OK" | "ATTENTION" | "UNKNOWN";

export type LargeBatchCoverageFactorySummaryTopCandidateV1 = {
  slug: string;
  oem_part_number: string;
  factory_state: LargeBatchCoverageFactoryStateV1;
  priority_score: number;
  block_reason: string | null;
};

export type LargeBatchCoverageFactorySummaryV1 = {
  report_name: typeof LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1;
  contract: typeof LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_ready: false;
  generated_at: string;
  runtime_status: LargeBatchCoverageFactorySummaryRuntimeStatusV1;
  source_command: "npm run buckparts:large-batch-coverage-factory";
  factory_report_name: typeof LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1 | "UNKNOWN";
  candidate_count: number | "UNKNOWN";
  state_counts: Record<LargeBatchCoverageFactoryStateV1, number> | "UNKNOWN";
  blocked_counts: LargeBatchCoverageFactoryReportV1["blocked_counts"] | "UNKNOWN";
  top_5_candidates: LargeBatchCoverageFactorySummaryTopCandidateV1[];
  next_owner_action: string;
  next_agent_action: string;
  expansion_blocker_summary: string;
  factory_failure_reason: string | null;
  expansion_taxonomy_authority: typeof LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1;
  disposition_authority: typeof UCF_DISPOSITION_AUTHORITY_V1;
  dual_authority: LargeBatchCoverageFactorySummaryDualAuthorityV1;
  top_5_candidates_ucf_disposition: LargeBatchCoverageFactorySummaryTopCandidateUcfDispositionV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildLargeBatchCoverageFactorySummaryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  topCandidatesLimit?: number;
  buildFactoryReport?: (
    factoryDeps: BuildLargeBatchCoverageFactoryDepsV1,
  ) => LargeBatchCoverageFactoryReportV1;
  buildUcfSnapshot?: (args: {
    rootDir: string;
    now?: () => Date;
  }) => UcfDecisionAuthoritySnapshotV1;
};

function buildExpansionBlockerSummary(report: LargeBatchCoverageFactoryReportV1): string {
  const bulkCount = report.source_summary.bulk_catalog.row_count;
  const liveCount = report.source_summary.live_filters_csv.row_count;
  const newCount = report.state_counts.new_product_candidate ?? 0;
  const exa = report.source_summary.exa_fridge_water_discovery;
  const exaNote =
    exa.status === "PROVEN" && exa.merged_into_factory_count > 0
      ? ` PROVEN: Exa discovery merged ${exa.merged_into_factory_count} read-only row(s) (${exa.evidence_needed_count} evidence_needed, ${exa.blocked_count} blocked) from ${exa.path}.`
      : "";
  if (newCount === 0 && bulkCount === liveCount) {
    return `PROVEN: new_product_candidate=0 and bulk_catalog.row_count (${bulkCount}) equals live_filters_csv.row_count (${liveCount}). ${EXPANSION_DEPTH_NOTE_V1} ${FIRST_FRIDGE_EXPANSION_DEMOTED_NOTE_V1}${exaNote}`;
  }
  if (newCount > 0) {
    return `PROVEN: ${newCount} bulk-only slug(s) await import/review — run batch production lane before production mutation.`;
  }
  return `INFERRED: expansion depth UNKNOWN — bulk (${bulkCount}) vs live (${liveCount}) counts differ but no new_product_candidate rows classified.`;
}

function buildActions(report: LargeBatchCoverageFactoryReportV1): {
  next_owner_action: string;
  next_agent_action: string;
} {
  const topSlug = report.top_candidates[0]?.slug ?? "top cohort";
  return {
    next_owner_action: `Review Large Batch Coverage Factory top cohort (starts with ${topSlug}) in Command Center JSON — use batch owner-review / approval checklists when ready. Do not hand-edit candidate JSON. This lane is not mutation-ready.`,
    next_agent_action:
      "Run npm run buckparts:large-batch-coverage-factory and prepare the next read-only review cohort for founder batch lanes; do not mutate production, add products, change CTAs, or run apply scripts.",
  };
}

export function buildLargeBatchCoverageFactorySummaryV1FromReport(
  report: LargeBatchCoverageFactoryReportV1,
  options?: {
    ucfCoverageDispositionProvenanceFacts?: string[];
    ucfSnapshot?: UcfDecisionAuthoritySnapshotV1 | null;
    dualOutputAttentionRequired?: boolean;
    dualOutputUnknownFacts?: string[];
  },
): LargeBatchCoverageFactorySummaryV1 {
  const top_5_candidates = report.top_candidates.slice(0, MAX_TOP_CANDIDATES).map((c) => ({
    slug: c.slug,
    oem_part_number: c.oem_part_number,
    factory_state: c.factory_state,
    priority_score: c.priority_score,
    block_reason: c.block_reason,
  }));

  const dual_authority = buildLargeBatchCoverageFactorySummaryDualAuthorityV1();
  const ucfDisposition = buildTopCandidatesUcfDispositionV1({
    topCandidates: top_5_candidates,
    snapshot: options?.ucfSnapshot ?? null,
  });
  const dualUnknownFacts = [
    ...(options?.dualOutputUnknownFacts ?? []),
    ...ucfDisposition.unknown_facts,
  ];
  const runtime_status =
    options?.dualOutputAttentionRequired || ucfDisposition.attention_required
      ? "ATTENTION"
      : "OK";

  const actions = buildActions(report);

  return {
    report_name: LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1,
    contract: LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_ready: false,
    generated_at: report.generated_at,
    runtime_status,
    source_command: "npm run buckparts:large-batch-coverage-factory",
    factory_report_name: report.report_name,
    candidate_count: report.candidate_count,
    state_counts: report.state_counts,
    blocked_counts: report.blocked_counts,
    top_5_candidates,
    next_owner_action: actions.next_owner_action,
    next_agent_action: actions.next_agent_action,
    expansion_blocker_summary: buildExpansionBlockerSummary(report),
    factory_failure_reason: null,
    expansion_taxonomy_authority: LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1,
    disposition_authority: UCF_DISPOSITION_AUTHORITY_V1,
    dual_authority,
    top_5_candidates_ucf_disposition: ucfDisposition.rows,
    proven_facts: [
      ...report.notes,
      `${LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_CONTRACT_V1} is a read-only Command Center projection of ${LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1}.`,
      "PROVEN: mutation_ready is false — not a Codex publish or retailer_links authority source.",
      dualOutputAuthorityProvenanceFactV1(),
      EXPANSION_DEPTH_NOTE_V1,
      ...(options?.ucfCoverageDispositionProvenanceFacts ?? []),
      ...(report.state_counts.new_product_candidate === 0 &&
      report.source_summary.bulk_catalog.row_count ===
        report.source_summary.live_filters_csv.row_count
        ? [FIRST_FRIDGE_EXPANSION_DEMOTED_NOTE_V1]
        : []),
    ],
    unknown_facts: dualUnknownFacts,
  };
}

export function buildLargeBatchCoverageFactorySummaryV1(
  deps: BuildLargeBatchCoverageFactorySummaryDepsV1,
): LargeBatchCoverageFactorySummaryV1 {
  const now = deps.now ?? (() => new Date());
  const dual_authority = buildLargeBatchCoverageFactorySummaryDualAuthorityV1();
  try {
    const report = (deps.buildFactoryReport ?? buildLargeBatchCoverageFactoryReportV1)({
      rootDir: deps.rootDir,
      topCandidatesLimit: deps.topCandidatesLimit ?? MAX_TOP_CANDIDATES,
    });
    const buildUcfSnapshot = deps.buildUcfSnapshot ?? buildUcfDecisionAuthoritySnapshotV1;
    let snapshot: UcfDecisionAuthoritySnapshotV1 | null = null;
    let dualOutputAttentionRequired = false;
    const dualOutputUnknownFacts: string[] = [];
    try {
      snapshot = buildUcfSnapshot({ rootDir: deps.rootDir, now: deps.now });
    } catch (ucfError) {
      dualOutputAttentionRequired = true;
      const reason = ucfError instanceof Error ? ucfError.message : String(ucfError);
      dualOutputUnknownFacts.push(
        `UNKNOWN: universal_coverage_factory_v1 snapshot failed (${reason}); disposition_authority degraded.`,
      );
    }
    const ucfCoverageDispositionProvenanceFacts = snapshot
      ? buildUcfCoverageDispositionProvenanceFactsV1({
          snapshot,
          filterSlugs: report.top_candidates.slice(0, MAX_TOP_CANDIDATES).map((c) => c.slug),
          wedge: "refrigerator_water",
          cutover_contract: UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1,
        })
      : [];
    return buildLargeBatchCoverageFactorySummaryV1FromReport(report, {
      ucfCoverageDispositionProvenanceFacts,
      ucfSnapshot: snapshot,
      dualOutputAttentionRequired,
      dualOutputUnknownFacts,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return {
      report_name: LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_REPORT_NAME_V1,
      contract: LARGE_BATCH_COVERAGE_FACTORY_SUMMARY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_ready: false,
      generated_at: now().toISOString(),
      runtime_status: "ATTENTION",
      source_command: "npm run buckparts:large-batch-coverage-factory",
      factory_report_name: "UNKNOWN",
      candidate_count: "UNKNOWN",
      state_counts: "UNKNOWN",
      blocked_counts: "UNKNOWN",
      top_5_candidates: [],
      next_owner_action:
        "Large Batch Coverage Factory failed to build — run npm run buckparts:large-batch-coverage-factory locally and fix CSV/catalog inputs before planning expansion. Do not hand-edit JSON.",
      next_agent_action:
        "Diagnose Large Batch Coverage Factory build failure read-only; re-run npm run buckparts:large-batch-coverage-factory after fix. Do not mutate production.",
      expansion_blocker_summary: `UNKNOWN: factory report did not build (${reason}). ${EXPANSION_DEPTH_NOTE_V1}`,
      factory_failure_reason: reason,
      expansion_taxonomy_authority: LBCF_EXPANSION_TAXONOMY_AUTHORITY_V1,
      disposition_authority: UCF_DISPOSITION_AUTHORITY_V1,
      dual_authority,
      top_5_candidates_ucf_disposition: [],
      proven_facts: [
        "PROVEN: Command Center caught factory build failure without throwing.",
        "PROVEN: mutation_ready is false.",
        dualOutputAuthorityProvenanceFactV1(),
      ],
      unknown_facts: [`UNKNOWN: ${LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1} build error: ${reason}`],
    };
  }
}
