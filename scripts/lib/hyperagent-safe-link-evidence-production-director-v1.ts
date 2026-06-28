/**
 * HyperAgent safe-link evidence production director v1 — read-only planning over
 * hyperagent_safe_link_14 cohort. BuckParts Truth Contract: repo truth only;
 * no CSV/Supabase/owner-decision/production mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildAllProductSafeBuyerPathCensusV1Report,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import { buildFridgeSafeLinkBatchFactoryV1, type FridgeSafeLinkBatchFactoryRowV1 } from "./fridge-safe-link-batch-factory-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1,
  FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1,
  type SlugVerdictV1,
} from "./fridge-safe-link-owner-browser-proof-batch-validation-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import { buildPublicWedgeReadinessAndEasiestWinsV1 } from "./public-wedge-readiness-and-easiest-wins-v1";

export const HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1 =
  "hyperagent_safe_link_evidence_production_director_v1" as const;

export const HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_COHORT_ID_V1 =
  "hyperagent_safe_link_14" as const;

export const HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/hyperagent-safe-link-evidence-production-director-v1.json" as const;

export const HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_MD_REL_V1 =
  "data/fridge/batch-production/drafts/hyperagent-safe-link-evidence-production-director-v1.md" as const;

export const HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:hyperagent-safe-link-evidence-production-director" as const;

export type HyperagentEvidenceBlockerTypeV1 =
  | "OWNER_BROWSER_PROOF"
  | "COMMITTED_EVIDENCE"
  | "COMPATIBILITY_DECISION"
  | "SUPERSESSION_LABEL"
  | "CONFLICT"
  | "OTHER";

export type HyperagentEvidenceGapStepV1 =
  | "OWNER_BROWSER_PROOF"
  | "CURSOR_REVALIDATION"
  | "COMMITTED_EVIDENCE"
  | "APPLY_PLAN_PROPOSAL"
  | "FOUNDER_APPROVAL";

export type HyperagentEvidenceQueueRowV1 = {
  rank: number;
  slug: string;
  census_page_classification: string;
  batch_factory_state: string;
  owner_browser_proof_verdict: string | null;
  owner_browser_proof_result_verdict: string | null;
  cursor_validation_verdict: string | null;
  hyperagent_classification: string | null;
  blocker_type: HyperagentEvidenceBlockerTypeV1;
  evidence_gap_steps: HyperagentEvidenceGapStepV1[];
  evidence_gap_count: number;
  probability_to_safe_buyer_path_proven: number;
  expected_coverage_delta: 0 | 1;
  model_compatibility_mapping_signal: "UNKNOWN" | "INFERRED_HIGH_DEMAND" | "INFERRED_LOW";
  recommended_next_evidence_action: string;
  guarded_apply_recommended: false;
};

export type HyperagentEvidenceProductionBatchV1 = {
  batch_id: string;
  batch_label: string;
  slug_count: number;
  target_slugs: string[];
  workload_type: "committed_evidence" | "owner_browser_proof" | "cursor_revalidation";
  expected_safe_buyer_path_proven_delta: number;
  rationale: string;
  commands: string[];
};

export type HyperagentMixedEliminationEstimateV1 = {
  current_buyer_path_truth_status: string;
  linked_filters_with_safe_gated_buy_path: number;
  linked_filters_with_zero_safe_buy_path: number;
  cohort_actionable_slug_count: number;
  cohort_blocked_slug_count: number;
  near_term_hyperagent_delta_realistic: number;
  near_term_hyperagent_delta_optimistic: number;
  filters_remaining_for_mixed_clear: number;
  estimated_phases: Array<{
    phase_id: string;
    title: string;
    slug_count: number;
    cumulative_proven_delta_estimate: number;
    blockers: string[];
  }>;
  mixed_clear_note: string;
};

export type HyperagentSafeLinkEvidenceProductionDirectorReportV1 = {
  contract: typeof HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  guarded_apply_work_generated: false;
  source_command: typeof HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_SOURCE_COMMAND_V1;
  generated_at: string;
  active_production_cohort_id: typeof HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_COHORT_ID_V1;
  cohort_slug_count: number;
  excluded_proven_slugs: string[];
  remaining_cohort_slug_count: number;
  ranked_evidence_queue: HyperagentEvidenceQueueRowV1[];
  expected_near_term_safe_buyer_path_proven_delta: {
    realistic: number;
    optimistic: number;
    note: string;
  };
  smallest_executable_evidence_batch: HyperagentEvidenceProductionBatchV1;
  next_owner_browser_proof_session_targets: string[];
  next_cursor_validation_targets: string[];
  next_founder_approval_candidates: string[];
  path_to_eliminate_buyer_path_truth_status_mixed: HyperagentMixedEliminationEstimateV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_commands: string[];
};

const COMMITTED_EVIDENCE_VERDICTS = new Set([
  "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT",
  "EXACT_PDP_PROVEN",
  "PROVEN_FROM_OWNER_BROWSER",
]);

function loadJson<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function loadOwnerBrowserProofResultsBySlugV1(
  rootDir: string,
): Map<string, OwnerBrowserProofResultV1> {
  const bySlug = new Map<string, OwnerBrowserProofResultV1>();
  for (const rel of FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1) {
    const abs = path.join(rootDir, rel);
    if (!existsSync(abs)) continue;
    const result = loadJson<OwnerBrowserProofResultV1>(rootDir, rel);
    bySlug.set(result.slug.toLowerCase(), result);
  }
  return bySlug;
}

function loadOwnerBrowserProofCursorVerdictsBySlugV1(
  rootDir: string,
): Map<string, SlugVerdictV1> {
  const abs = path.join(rootDir, FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1);
  if (!existsSync(abs)) return new Map();
  const doc = loadJson<{
    validation_details?: { slug_verdicts?: SlugVerdictV1[] };
  }>(rootDir, FRIDGE_OWNER_BROWSER_PROOF_CURSOR_VALIDATION_REL_V1);
  const verdicts = doc.validation_details?.slug_verdicts ?? [];
  return new Map(verdicts.map((v) => [v.slug.toLowerCase(), v]));
}

function hasFounderApprovalArtifactV1(rootDir: string, slug: string): boolean {
  const rel = `data/owner-decisions/fridge-safe-link-${slug}-owner-approval-v1.json`;
  if (!existsSync(path.join(rootDir, rel))) return false;
  try {
    const doc = loadJson<{ rows?: Array<{ decision_status?: string }> }>(rootDir, rel);
    return (doc.rows ?? []).some((r) => r.decision_status === "approved");
  } catch {
    return false;
  }
}

export function isHyperagentCohortSlugCensusProvenV1(
  census: AllProductSafeBuyerPathCensusV1,
  slug: string,
): boolean {
  const row = census.products.find((p) => p.slug === slug);
  return row?.page_classification === "SAFE_BUYER_PATH_PROVEN";
}

export function classifyHyperagentEvidenceBlockerTypeV1(args: {
  factoryRow: FridgeSafeLinkBatchFactoryRowV1 | null;
  cursorVerdict: SlugVerdictV1 | null;
  proofResult: OwnerBrowserProofResultV1 | null;
}): HyperagentEvidenceBlockerTypeV1 {
  const cursor = args.cursorVerdict?.verdict ?? args.factoryRow?.owner_browser_proof_slug_verdict ?? null;
  const factoryState = args.factoryRow?.batch_factory_state ?? null;

  if (cursor === "BLOCKED_CONFLICT" || factoryState === "CONFLICT_REQUIRES_RECONCILIATION") {
    return "CONFLICT";
  }

  if (cursor === "BLOCKED_LABEL_REQUIRED" || factoryState === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL") {
    const reason = (args.cursorVerdict?.reason ?? args.factoryRow?.state_basis ?? "").toLowerCase();
    if (
      reason.includes("supersession") ||
      reason.includes("→") ||
      reason.includes("eol") ||
      reason.includes("discontinued")
    ) {
      return "SUPERSESSION_LABEL";
    }
    return "COMPATIBILITY_DECISION";
  }

  if (factoryState === "DO_NOT_USE_WRONG_PART_RISK") return "OTHER";
  if (factoryState === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED") return "OTHER";

  const passProof = args.proofResult?.verdict === "PASS_BROWSER_PROOF";
  const hasCommittedEvidence =
    (args.factoryRow?.repo_evidence_verdict &&
      COMMITTED_EVIDENCE_VERDICTS.has(args.factoryRow.repo_evidence_verdict)) ||
    (args.factoryRow?.csv_safe_gated_count ?? 0) > 0 ||
    args.factoryRow?.launch_buy_links_gate_passes === true;

  if (passProof && !hasCommittedEvidence) return "COMMITTED_EVIDENCE";

  if (!passProof) {
    if (cursor === "DISCOVERY_CANDIDATES_OK" || factoryState === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF") {
      return "OWNER_BROWSER_PROOF";
    }
    return "OWNER_BROWSER_PROOF";
  }

  return "OTHER";
}

export function computeHyperagentEvidenceGapStepsV1(args: {
  blockerType: HyperagentEvidenceBlockerTypeV1;
  proofResult: OwnerBrowserProofResultV1 | null;
  factoryRow: FridgeSafeLinkBatchFactoryRowV1 | null;
  founderApproved: boolean;
}): HyperagentEvidenceGapStepV1[] {
  if (
    args.blockerType === "CONFLICT" ||
    args.blockerType === "COMPATIBILITY_DECISION" ||
    args.blockerType === "SUPERSESSION_LABEL" ||
    args.blockerType === "OTHER"
  ) {
    return [];
  }

  const passProof = args.proofResult?.verdict === "PASS_BROWSER_PROOF";
  const hasCommittedEvidence =
    (args.factoryRow?.repo_evidence_verdict &&
      COMMITTED_EVIDENCE_VERDICTS.has(args.factoryRow.repo_evidence_verdict)) ||
    (args.factoryRow?.csv_safe_gated_count ?? 0) > 0;

  const steps: HyperagentEvidenceGapStepV1[] = [];

  if (!passProof) {
    steps.push("OWNER_BROWSER_PROOF");
  } else if ((args.proofResult?.unverified_candidates?.length ?? 0) > 0) {
    steps.push("OWNER_BROWSER_PROOF");
  }

  steps.push("CURSOR_REVALIDATION");

  if (!hasCommittedEvidence) {
    steps.push("COMMITTED_EVIDENCE");
  }

  steps.push("APPLY_PLAN_PROPOSAL");

  if (!args.founderApproved) {
    steps.push("FOUNDER_APPROVAL");
  }

  return steps;
}

export function computeHyperagentProbabilityToProvenV1(args: {
  blockerType: HyperagentEvidenceBlockerTypeV1;
  proofResult: OwnerBrowserProofResultV1 | null;
  factoryRow: FridgeSafeLinkBatchFactoryRowV1 | null;
  evidenceGapCount: number;
}): number {
  if (args.blockerType === "CONFLICT") return 12;
  if (args.blockerType === "COMPATIBILITY_DECISION") return 22;
  if (args.blockerType === "SUPERSESSION_LABEL") return 20;
  if (args.blockerType === "OTHER") return 8;

  let score = args.blockerType === "COMMITTED_EVIDENCE" ? 82 : 68;

  if (args.proofResult?.verdict === "PASS_BROWSER_PROOF") score += 10;
  if ((args.factoryRow?.repo_evidence_files?.length ?? 0) > 0) score += 3;
  if (args.factoryRow?.hyperagent_classification === "SAFE_CANDIDATE_FOUND") score += 4;
  if ((args.proofResult?.unverified_candidates?.length ?? 0) > 0) score -= 6;
  if ((args.proofResult?.hold_candidates?.length ?? 0) > 0) score -= 2;

  score -= Math.max(0, args.evidenceGapCount - 3) * 4;

  return Math.max(5, Math.min(95, score));
}

function compareQueueRowsV1(a: HyperagentEvidenceQueueRowV1, b: HyperagentEvidenceQueueRowV1): number {
  if (b.expected_coverage_delta !== a.expected_coverage_delta) {
    return b.expected_coverage_delta - a.expected_coverage_delta;
  }
  if (a.evidence_gap_count !== b.evidence_gap_count) {
    return a.evidence_gap_count - b.evidence_gap_count;
  }
  if (b.probability_to_safe_buyer_path_proven !== a.probability_to_safe_buyer_path_proven) {
    return b.probability_to_safe_buyer_path_proven - a.probability_to_safe_buyer_path_proven;
  }
  const blockerOrder: HyperagentEvidenceBlockerTypeV1[] = [
    "COMMITTED_EVIDENCE",
    "OWNER_BROWSER_PROOF",
    "COMPATIBILITY_DECISION",
    "SUPERSESSION_LABEL",
    "CONFLICT",
    "OTHER",
  ];
  const aBlock = blockerOrder.indexOf(a.blocker_type);
  const bBlock = blockerOrder.indexOf(b.blocker_type);
  if (aBlock !== bBlock) return aBlock - bBlock;
  return a.slug.localeCompare(b.slug);
}

function buildRecommendedEvidenceActionV1(row: HyperagentEvidenceQueueRowV1): string {
  switch (row.blocker_type) {
    case "COMMITTED_EVIDENCE":
      return "Promote PASS owner-browser-proof URLs into committed evidence + re-run batch factory Cursor overlay.";
    case "OWNER_BROWSER_PROOF":
      return "Run owner browser proof session; record PASS_BROWSER_PROOF result artifact.";
    case "CONFLICT":
      return "Owner reconciliation required — do not prepare apply evidence until conflict resolved.";
    case "COMPATIBILITY_DECISION":
      return "Resolve compatibility/canonical alias decision before any evidence commit.";
    case "SUPERSESSION_LABEL":
      return "Apply supersession/EOL label handling before browser proof or evidence commit.";
    default:
      return "Park slug — insufficient repo truth for HyperAgent evidence lane.";
  }
}

export function rankHyperagentEvidenceQueueV1(args: {
  cohortSlugs: readonly string[];
  excludedProvenSlugs: readonly string[];
  census: AllProductSafeBuyerPathCensusV1;
  factoryRows: FridgeSafeLinkBatchFactoryRowV1[];
  proofBySlug: Map<string, OwnerBrowserProofResultV1>;
  cursorBySlug: Map<string, SlugVerdictV1>;
  rootDir: string;
}): HyperagentEvidenceQueueRowV1[] {
  const remaining = args.cohortSlugs.filter((slug) => !args.excludedProvenSlugs.includes(slug));
  const rows: HyperagentEvidenceQueueRowV1[] = [];

  for (const slug of remaining) {
    const factoryRow = args.factoryRows.find((r) => r.slug === slug) ?? null;
    const proofResult = args.proofBySlug.get(slug.toLowerCase()) ?? null;
    const cursorVerdict = args.cursorBySlug.get(slug.toLowerCase()) ?? null;
    const censusRow = args.census.products.find((p) => p.slug === slug);
    const blockerType = classifyHyperagentEvidenceBlockerTypeV1({
      factoryRow,
      cursorVerdict,
      proofResult,
    });
    const founderApproved = hasFounderApprovalArtifactV1(args.rootDir, slug);
    const evidenceGapSteps = computeHyperagentEvidenceGapStepsV1({
      blockerType,
      proofResult,
      factoryRow,
      founderApproved,
    });
    const evidenceGapCount = evidenceGapSteps.length;
    const probability = computeHyperagentProbabilityToProvenV1({
      blockerType,
      proofResult,
      factoryRow,
      evidenceGapCount,
    });
    const expectedDelta: 0 | 1 =
      blockerType === "CONFLICT" ||
      blockerType === "COMPATIBILITY_DECISION" ||
      blockerType === "SUPERSESSION_LABEL" ||
      blockerType === "OTHER"
        ? 0
        : 1;

    const queueRow: HyperagentEvidenceQueueRowV1 = {
      rank: 0,
      slug,
      census_page_classification: censusRow?.page_classification ?? "UNKNOWN",
      batch_factory_state: factoryRow?.batch_factory_state ?? "UNKNOWN",
      owner_browser_proof_verdict:
        cursorVerdict?.verdict ?? factoryRow?.owner_browser_proof_slug_verdict ?? null,
      owner_browser_proof_result_verdict: proofResult?.verdict ?? null,
      cursor_validation_verdict: cursorVerdict?.verdict ?? null,
      hyperagent_classification: factoryRow?.hyperagent_classification ?? null,
      blocker_type: blockerType,
      evidence_gap_steps: evidenceGapSteps,
      evidence_gap_count: evidenceGapCount,
      probability_to_safe_buyer_path_proven: probability,
      expected_coverage_delta: expectedDelta,
      model_compatibility_mapping_signal: "UNKNOWN",
      recommended_next_evidence_action: "",
      guarded_apply_recommended: false,
    };
    queueRow.recommended_next_evidence_action = buildRecommendedEvidenceActionV1(queueRow);
    rows.push(queueRow);
  }

  rows.sort(compareQueueRowsV1);
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function selectSmallestExecutableEvidenceBatchV1(
  queue: readonly HyperagentEvidenceQueueRowV1[],
): HyperagentEvidenceProductionBatchV1 {
  const committedEvidenceReady = queue.filter(
    (r) => r.blocker_type === "COMMITTED_EVIDENCE" && r.expected_coverage_delta === 1,
  );
  if (committedEvidenceReady.length >= 2) {
    const targets = committedEvidenceReady.slice(0, 2).map((r) => r.slug);
    return {
      batch_id: "hyperagent_evidence_committed_evidence_pair_v1",
      batch_label: "Smallest near-term evidence commit pair (PASS browser proof on disk)",
      slug_count: targets.length,
      target_slugs: targets,
      workload_type: "committed_evidence",
      expected_safe_buyer_path_proven_delta: targets.length,
      rationale:
        "Both slugs already have PASS_BROWSER_PROOF result artifacts; binding gap is committed evidence + Cursor revalidation — not another owner session.",
      commands: [
        "npm run buckparts:fridge-safe-link-batch-factory",
        "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
      ],
    };
  }

  const ownerProofNeeded = queue.filter((r) => r.blocker_type === "OWNER_BROWSER_PROOF");
  if (ownerProofNeeded.length >= 1) {
    const target = ownerProofNeeded[0]!.slug;
    return {
      batch_id: "hyperagent_evidence_owner_browser_proof_single_v1",
      batch_label: "Smallest owner-browser-proof session (single slug)",
      slug_count: 1,
      target_slugs: [target],
      workload_type: "owner_browser_proof",
      expected_safe_buyer_path_proven_delta: 0,
      rationale:
        "No PASS proof on disk yet — evidence factory must capture owner browser proof before apply-plan work.",
      commands: [
        "node --import tsx scripts/report-fridge-safe-link-owner-browser-proof-session-v1.ts",
        "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
      ],
    };
  }

  return {
    batch_id: "hyperagent_evidence_blocked_v1",
    batch_label: "No executable HyperAgent evidence batch — cohort blocked on labels/conflicts",
    slug_count: 0,
    target_slugs: [],
    workload_type: "cursor_revalidation",
    expected_safe_buyer_path_proven_delta: 0,
    rationale: "All remaining cohort slugs require conflict or compatibility resolution before evidence work.",
    commands: ["npm run buckparts:fridge-safe-link-batch-factory"],
  };
}

function buildMixedEliminationEstimateV1(args: {
  queue: readonly HyperagentEvidenceQueueRowV1[];
  publicWedgeRow: {
    buyer_path_truth_status: string;
    linked_filters_with_safe_gated_buy_path: number;
    linked_filters_with_zero_safe_buy_path: number;
  };
}): HyperagentMixedEliminationEstimateV1 {
  const actionable = args.queue.filter((r) => r.expected_coverage_delta === 1);
  const blocked = args.queue.filter((r) => r.expected_coverage_delta === 0);
  const nearTermRealistic = actionable.filter((r) => r.blocker_type === "COMMITTED_EVIDENCE").length;
  const nearTermOptimistic = actionable.filter(
    (r) => r.blocker_type === "COMMITTED_EVIDENCE" || r.blocker_type === "OWNER_BROWSER_PROOF",
  ).length;

  const zeroSafe = args.publicWedgeRow.linked_filters_with_zero_safe_buy_path;
  const safe = args.publicWedgeRow.linked_filters_with_safe_gated_buy_path;

  return {
    current_buyer_path_truth_status: args.publicWedgeRow.buyer_path_truth_status,
    linked_filters_with_safe_gated_buy_path: safe,
    linked_filters_with_zero_safe_buy_path: zeroSafe,
    cohort_actionable_slug_count: actionable.length,
    cohort_blocked_slug_count: blocked.length,
    near_term_hyperagent_delta_realistic: nearTermRealistic,
    near_term_hyperagent_delta_optimistic: Math.min(nearTermOptimistic, 6),
    filters_remaining_for_mixed_clear: zeroSafe,
    estimated_phases: [
      {
        phase_id: "phase_1_committed_evidence",
        title: "Commit PASS owner-browser-proof evidence for top-ranked slugs",
        slug_count: nearTermRealistic,
        cumulative_proven_delta_estimate: safe + nearTermRealistic,
        blockers: ["committed_csv_browser_truth_not_direct_buyable", "VALIDATION_PARTIAL"],
      },
      {
        phase_id: "phase_2_owner_browser_proof",
        title: "Complete remaining owner browser proof sessions (fppwfu01 + amazon gap closes)",
        slug_count: actionable.filter((r) => r.blocker_type === "OWNER_BROWSER_PROOF").length,
        cumulative_proven_delta_estimate: safe + nearTermOptimistic,
        blockers: ["owner_browser_proof_required", "discovery_candidates_only_not_verified_link"],
      },
      {
        phase_id: "phase_3_label_conflict_park",
        title: "Resolve compatibility/supersession labels and conflicts before evidence lane",
        slug_count: blocked.length,
        cumulative_proven_delta_estimate: safe + actionable.length,
        blockers: ["BLOCKED_LABEL_REQUIRED", "BLOCKED_CONFLICT"],
      },
      {
        phase_id: "phase_4_outside_hyperagent_14",
        title: "Remaining refrigerator_water zero-safe filters outside HyperAgent 14 cohort",
        slug_count: Math.max(0, zeroSafe - actionable.length),
        cumulative_proven_delta_estimate: safe + zeroSafe,
        blockers: ["outside_hyperagent_safe_link_14_scope"],
      },
    ],
    mixed_clear_note:
      "buyer_path_truth_status=MIXED clears when linked_filters_with_zero_safe_buy_path reaches 0 on committed CSV. HyperAgent 14 can realistically contribute up to +6 near-term (batch factory VALIDATION_PARTIAL cap); full MIXED clear requires additional rescue cohorts beyond this 14-slug factory.",
  };
}

export function buildHyperagentSafeLinkEvidenceProductionDirectorMarkdownV1(
  report: HyperagentSafeLinkEvidenceProductionDirectorReportV1,
): string {
  const lines: string[] = [
    "# HyperAgent safe-link evidence production director v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Cohort",
    "",
    `- Active cohort: **${report.active_production_cohort_id}** (${String(report.cohort_slug_count)} slugs)`,
    `- Excluded SAFE_BUYER_PATH_PROVEN: ${report.excluded_proven_slugs.join(", ") || "none"}`,
    `- Remaining queue: **${String(report.remaining_cohort_slug_count)}** slugs`,
    "",
    "## Expected near-term SAFE_BUYER_PATH_PROVEN delta",
    "",
    `- Realistic: **+${String(report.expected_near_term_safe_buyer_path_proven_delta.realistic)}**`,
    `- Optimistic: **+${String(report.expected_near_term_safe_buyer_path_proven_delta.optimistic)}**`,
    `- ${report.expected_near_term_safe_buyer_path_proven_delta.note}`,
    "",
    "## Smallest executable evidence batch",
    "",
    `- **${report.smallest_executable_evidence_batch.batch_label}**`,
    `- Slugs: ${report.smallest_executable_evidence_batch.target_slugs.join(", ") || "none"}`,
    `- Expected delta: +${String(report.smallest_executable_evidence_batch.expected_safe_buyer_path_proven_delta)}`,
    `- ${report.smallest_executable_evidence_batch.rationale}`,
    "",
    "## Ranked evidence queue",
    "",
    "| Rank | Slug | Gap | Blocker | P(proven) | Δ | Next action |",
    "| ---: | --- | ---: | --- | ---: | ---: | --- |",
  ];

  for (const row of report.ranked_evidence_queue) {
    lines.push(
      `| ${String(row.rank)} | ${row.slug} | ${String(row.evidence_gap_count)} | ${row.blocker_type} | ${String(row.probability_to_safe_buyer_path_proven)} | ${String(row.expected_coverage_delta)} | ${row.recommended_next_evidence_action} |`,
    );
  }

  lines.push(
    "",
    "## Next owner-browser-proof session targets",
    "",
    report.next_owner_browser_proof_session_targets.length > 0
      ? report.next_owner_browser_proof_session_targets.map((s) => `- ${s}`).join("\n")
      : "- none",
    "",
    "## Next Cursor validation targets",
    "",
    report.next_cursor_validation_targets.length > 0
      ? report.next_cursor_validation_targets.map((s) => `- ${s}`).join("\n")
      : "- none",
    "",
    "## Next founder approval candidates",
    "",
    report.next_founder_approval_candidates.length > 0
      ? report.next_founder_approval_candidates.map((s) => `- ${s}`).join("\n")
      : "- none (after evidence commit + apply-plan proposal)",
    "",
    "## Path to eliminate buyer_path_truth_status=MIXED",
    "",
    `- Current: **${report.path_to_eliminate_buyer_path_truth_status_mixed.current_buyer_path_truth_status}** (${String(report.path_to_eliminate_buyer_path_truth_status_mixed.linked_filters_with_safe_gated_buy_path)} safe / ${String(report.path_to_eliminate_buyer_path_truth_status_mixed.linked_filters_with_zero_safe_buy_path)} zero-safe)`,
    `- ${report.path_to_eliminate_buyer_path_truth_status_mixed.mixed_clear_note}`,
    "",
    "### Estimated phases",
    "",
  );

  for (const phase of report.path_to_eliminate_buyer_path_truth_status_mixed.estimated_phases) {
    lines.push(
      `- **${phase.title}** — ${String(phase.slug_count)} slug(s); cumulative proven estimate ${String(phase.cumulative_proven_delta_estimate)}`,
    );
  }

  lines.push(
    "",
    "## Recommended commands (read-only planning)",
    "",
    ...report.recommended_commands.map((c) => `- \`${c}\``),
    "",
    "## Proven facts",
    "",
    ...report.proven_facts.map((f) => `- ${f}`),
    "",
    "## Inferred facts",
    "",
    ...report.inferred_facts.map((f) => `- ${f}`),
    "",
    "## Unknown facts",
    "",
    ...report.unknown_facts.map((f) => `- ${f}`),
    "",
  );

  return `${lines.join("\n")}\n`;
}

export async function buildHyperagentSafeLinkEvidenceProductionDirectorReportV1(args: {
  rootDir: string;
  now?: () => Date;
}): Promise<HyperagentSafeLinkEvidenceProductionDirectorReportV1> {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;

  const census = await buildAllProductSafeBuyerPathCensusV1Report({ rootDir });
  const factory = buildFridgeSafeLinkBatchFactoryV1({ rootDir });
  const proofBySlug = loadOwnerBrowserProofResultsBySlugV1(rootDir);
  const cursorBySlug = loadOwnerBrowserProofCursorVerdictsBySlugV1(rootDir);
  const publicWedge = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir });
  const fridgeWedge = publicWedge.wedge_rows.find((r) => r.wedge === "refrigerator_water");

  const cohortSlugs = FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1;
  const excludedProvenSlugs = cohortSlugs.filter((slug) => isHyperagentCohortSlugCensusProvenV1(census, slug));

  const rankedEvidenceQueue = rankHyperagentEvidenceQueueV1({
    cohortSlugs,
    excludedProvenSlugs,
    census,
    factoryRows: factory.rows,
    proofBySlug,
    cursorBySlug,
    rootDir,
  });

  const smallestBatch = selectSmallestExecutableEvidenceBatchV1(rankedEvidenceQueue);

  const committedEvidenceSlugs = rankedEvidenceQueue.filter((r) => r.blocker_type === "COMMITTED_EVIDENCE");
  const ownerProofSlugs = rankedEvidenceQueue.filter((r) => r.blocker_type === "OWNER_BROWSER_PROOF");
  const cursorTargets = rankedEvidenceQueue
    .filter((r) => r.evidence_gap_steps.includes("CURSOR_REVALIDATION") && r.expected_coverage_delta === 1)
    .map((r) => r.slug);
  const founderCandidates = rankedEvidenceQueue
    .filter(
      (r) =>
        r.expected_coverage_delta === 1 &&
        r.evidence_gap_steps.includes("FOUNDER_APPROVAL") &&
        r.blocker_type !== "OWNER_BROWSER_PROOF",
    )
    .slice(0, 5)
    .map((r) => r.slug);

  const nearTermRealistic = committedEvidenceSlugs.length;
  const nearTermOptimistic = Math.min(
    6,
    committedEvidenceSlugs.length + ownerProofSlugs.filter((r) => r.evidence_gap_count <= 5).length,
  );

  const pathEstimate = buildMixedEliminationEstimateV1({
    queue: rankedEvidenceQueue,
    publicWedgeRow: {
      buyer_path_truth_status: fridgeWedge?.buyer_path_truth_status ?? "UNKNOWN",
      linked_filters_with_safe_gated_buy_path: fridgeWedge?.linked_filters_with_safe_gated_buy_path ?? 0,
      linked_filters_with_zero_safe_buy_path: fridgeWedge?.linked_filters_with_zero_safe_buy_path ?? 0,
    },
  });

  const passProofSlugs = [...proofBySlug.values()]
    .filter((r) => r.verdict === "PASS_BROWSER_PROOF")
    .map((r) => r.slug);

  return {
    contract: HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    guarded_apply_work_generated: false,
    source_command: HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_DIRECTOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    active_production_cohort_id: HYPERAGENT_SAFE_LINK_EVIDENCE_PRODUCTION_COHORT_ID_V1,
    cohort_slug_count: cohortSlugs.length,
    excluded_proven_slugs: excludedProvenSlugs,
    remaining_cohort_slug_count: cohortSlugs.length - excludedProvenSlugs.length,
    ranked_evidence_queue: rankedEvidenceQueue,
    expected_near_term_safe_buyer_path_proven_delta: {
      realistic: nearTermRealistic,
      optimistic: nearTermOptimistic,
      note: "Realistic counts COMMITTED_EVIDENCE-only slugs with PASS_BROWSER_PROOF on disk. Optimistic caps at +6 per batch factory VALIDATION_PARTIAL near-term ceiling.",
    },
    smallest_executable_evidence_batch: smallestBatch,
    next_owner_browser_proof_session_targets: ownerProofSlugs.map((r) => r.slug),
    next_cursor_validation_targets: cursorTargets,
    next_founder_approval_candidates: founderCandidates,
    path_to_eliminate_buyer_path_truth_status_mixed: pathEstimate,
    proven_facts: [
      `PROVEN: hyperagent_safe_link_14 cohort = ${cohortSlugs.length} slugs from FRIDGE_OWNER_BROWSER_PROOF_EXPECTED_SLUGS_V1.`,
      `PROVEN: census SAFE_BUYER_PATH_PROVEN count site-wide = ${String(census.classification_counts.SAFE_BUYER_PATH_PROVEN)}.`,
      `PROVEN: excluded_proven_slugs in cohort = [${excludedProvenSlugs.join(", ")}].`,
      `PROVEN: PASS_BROWSER_PROOF result artifacts on disk for [${passProofSlugs.join(", ")}].`,
      `PROVEN: batch factory eligible_now_count=${String(factory.cohort_summary.eligible_now_count)}.`,
      `PROVEN: refrigerator_water buyer_path_truth_status=${fridgeWedge?.buyer_path_truth_status ?? "UNKNOWN"}.`,
      `PROVEN: guarded_apply_work_generated=false — no guarded-apply recommendations for census-proven slugs.`,
    ],
    inferred_facts: [
      `INFERRED: smallest executable batch targets [${smallestBatch.target_slugs.join(", ")}] for +${String(smallestBatch.expected_safe_buyer_path_proven_delta)} near-term delta.`,
      `INFERRED: ${String(committedEvidenceSlugs.length)} slug(s) are one committed-evidence step from apply-plan candidacy.`,
      `INFERRED: ${String(ownerProofSlugs.length)} slug(s) still require owner browser proof sessions.`,
      `INFERRED: ${String(rankedEvidenceQueue.filter((r) => r.expected_coverage_delta === 0).length)} slug(s) blocked on label/conflict — outside near-term evidence factory.`,
    ],
    unknown_facts: [
      "UNKNOWN: exact calendar time to full MIXED clear — depends on founder approval cadence and label/conflict resolution outside HyperAgent lane.",
      "UNKNOWN: whether amazon unverified/hold gaps on wf3cb/eptwfu01 block committed evidence without supplemental proof.",
    ],
    recommended_commands: [
      "npm run buckparts:hyperagent-safe-link-evidence-production-director",
      "npm run buckparts:fridge-safe-link-batch-factory",
      "node --import tsx scripts/run-fridge-safe-link-owner-browser-proof-cursor-validation-v1.ts",
      ...smallestBatch.commands,
    ],
  };
}
