/**
 * Manufacturer Safe Link Rescue Director v1 — read-only execution plan over orchestrator output.
 * BuckParts Truth Contract: repo truth, UNKNOWN over guessing, no mutation, no browser automation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildManufacturerSafeLinkRescueOrchestratorReportV1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import { MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1 } from "./manufacturer-safe-link-rescue-framework-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_director_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-director-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-next-actions-v1.md" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-roadmap-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-director" as const;

export type ManufacturerRescueTrustRiskV1 = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type ManufacturerRescueDirectorRankedSlugV1 = {
  rank: number;
  filter_slug: string;
  manufacturer_key: string;
  director_value_score: number;
  orchestrator_priority_score: number;
  expected_safe_coverage_signal: number;
  trust_risk: ManufacturerRescueTrustRiskV1;
  blocked_reasons: string[];
  recommended_next_action: string;
};

export type ManufacturerRescueDirectorManufacturerRankV1 = {
  rank: number;
  manufacturer_key: string;
  expected_coverage_unlock_score: number;
  rescue_candidate_count: number;
  owner_review_ready_count: number;
  browser_pass_count: number;
  browser_ready_count: number;
  remaining_opportunity: number;
  rationale: string;
};

export type ManufacturerRescueDirectorEstimatesV1 = {
  safe_buyer_paths_unlockable_estimate: number;
  safe_buyer_paths_unlockable_note: string;
  browser_hours_required_estimate: number;
  browser_hours_note: string;
  owner_review_count: number;
  trust_risk: ManufacturerRescueTrustRiskV1;
  trust_risk_factors: string[];
  expected_coverage_gain_percent_estimate: number | "UNKNOWN";
  expected_coverage_gain_note: string;
};

export type ManufacturerRescueDirectorRoadmapStageV1 = {
  stage_id: string;
  stage_order: number;
  title: string;
  workload_type: "owner_review" | "guarded_apply" | "browser_capture" | "blocked_park";
  slug_count: number;
  filter_slugs: string[];
  estimated_browser_hours: number;
  estimated_safe_paths_after_stage: number;
  becomes_available_after_stage: string[];
  blockers_remaining: string[];
};

export type ManufacturerRescueDirectorReportV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1;
  orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  framework_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1;
  orchestrator_source_path: string;
  orchestrator_generated_at: string;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  why_this_order_was_chosen: string[];
  blocked_summary: Array<{ reason: string; slug_count: number; example_slugs: string[] }>;
  ranked_manufacturers: ManufacturerRescueDirectorManufacturerRankV1[];
  ranked_browser_work: ManufacturerRescueDirectorRankedSlugV1[];
  ranked_owner_reviews: ManufacturerRescueDirectorRankedSlugV1[];
  ranked_guarded_apply_candidates: ManufacturerRescueDirectorRankedSlugV1[];
  estimates: ManufacturerRescueDirectorEstimatesV1;
  best_execution_plan_summary: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type ManufacturerRescueRoadmapV1 = {
  contract: "manufacturer_safe_link_rescue_roadmap_v1";
  director_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  coverage_unlocked: false;
  stages: ManufacturerRescueDirectorRoadmapStageV1[];
  cumulative_safe_paths_unlockable: number[];
  why_this_order_was_chosen: string[];
};

const BROWSER_HOURS_PER_SLUG_ESTIMATE_V1: Readonly<Record<string, number>> = {
  ge_appliance_parts: 0.75,
  everydrop_whirlpool: 0.5,
  frigidaire: 0.5,
};

function rescueRows(orchestrator: ManufacturerRescueOrchestratorReportV1) {
  return orchestrator.unified_rescue_queue.filter((r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED");
}

function isGuardedApplyCandidate(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  if (row.cohort_lane === "REFERENCE_ALREADY_APPLIED") return false;
  if (row.blocked_reasons.some((r) => r.includes("known_broken"))) return false;
  return (
    row.browser_truth_status === "PASS" &&
    (row.owner_review_readiness === "READY" || row.owner_review_readiness === "SUPERSESSION_REVIEW") &&
    row.csv_primary_is_search_placeholder === true
  );
}

function isBrowserWorkCandidate(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  if (row.browser_ready_state !== "READY") return false;
  if (row.browser_truth_status === "PASS") return false;
  if (row.blocked_reasons.some((r) => r.includes("known_broken"))) return false;
  return true;
}

function isOwnerReviewCandidate(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  return (
    row.owner_review_readiness === "READY" || row.owner_review_readiness === "SUPERSESSION_REVIEW"
  );
}

export function computeDirectorValueScoreV1(row: ManufacturerRescueOrchestratorQueueRowV1): number {
  let score = row.orchestrator_priority_score;
  if (row.in_fridge_rescue_queue) score += 25;
  score += Math.min(row.expected_safe_coverage_signal, 100);
  score += Math.min(row.existing_evidence_score, 50);
  if (row.owner_review_readiness === "READY") score += 40;
  if (row.owner_review_readiness === "SUPERSESSION_REVIEW") score += 20;
  if (row.browser_truth_status === "PASS") score += 35;
  if (row.blocked_reasons.some((r) => r.includes("known_broken"))) score -= 5_000;
  if (row.blocked_reasons.some((r) => r.includes("confusion_family"))) score -= 15;
  if (row.blocked_reasons.some((r) => r.includes("supersession"))) score -= 10;
  return score;
}

export function assessSlugTrustRiskV1(
  row: ManufacturerRescueOrchestratorQueueRowV1,
): ManufacturerRescueTrustRiskV1 {
  if (row.blocked_reasons.some((r) => r.includes("known_broken"))) return "HIGH";
  if (row.owner_review_readiness === "SUPERSESSION_REVIEW") return "MEDIUM";
  if (row.blocked_reasons.some((r) => r.includes("confusion_family"))) return "MEDIUM";
  if (row.browser_truth_status === "PASS" && row.repo_proven_official_target_url) return "LOW";
  if (row.browser_truth_status === "UNKNOWN" || row.browser_truth_status === "NOT_CAPTURED") {
    return "UNKNOWN";
  }
  return "MEDIUM";
}

export function computeManufacturerExpectedCoverageUnlockScoreV1(args: {
  manufacturerKey: string;
  summary: ManufacturerRescueOrchestratorReportV1["manufacturer_summaries"][number];
  rows: ManufacturerRescueOrchestratorQueueRowV1[];
}): number {
  const coverageSignal = args.rows.reduce((sum, r) => sum + r.expected_safe_coverage_signal, 0);
  return (
    args.summary.owner_review_ready_count * 120 +
    args.summary.browser_pass_count * 80 +
    args.summary.browser_ready_count * 35 +
    coverageSignal * 0.5 -
    args.summary.unknown_truth_count * 25
  );
}

function sortRankedSlugs(
  rows: ManufacturerRescueOrchestratorQueueRowV1[],
): ManufacturerRescueDirectorRankedSlugV1[] {
  const scored = rows.map((row) => ({
    row,
    director_value_score: computeDirectorValueScoreV1(row),
  }));
  scored.sort((a, b) => {
    if (b.director_value_score !== a.director_value_score) {
      return b.director_value_score - a.director_value_score;
    }
    if (a.row.manufacturer_key !== b.row.manufacturer_key) {
      return a.row.manufacturer_key.localeCompare(b.row.manufacturer_key);
    }
    return a.row.filter_slug.localeCompare(b.row.filter_slug);
  });
  return scored.map(({ row, director_value_score }, index) => ({
    rank: index + 1,
    filter_slug: row.filter_slug,
    manufacturer_key: row.manufacturer_key,
    director_value_score,
    orchestrator_priority_score: row.orchestrator_priority_score,
    expected_safe_coverage_signal: row.expected_safe_coverage_signal,
    trust_risk: assessSlugTrustRiskV1(row),
    blocked_reasons: row.blocked_reasons,
    recommended_next_action: row.recommended_next_action,
  }));
}

function rankManufacturers(
  orchestrator: ManufacturerRescueOrchestratorReportV1,
): ManufacturerRescueDirectorManufacturerRankV1[] {
  const rows = rescueRows(orchestrator);
  const ranked = orchestrator.manufacturer_summaries.map((summary) => {
    const mRows = rows.filter((r) => r.manufacturer_key === summary.manufacturer_key);
    const score = computeManufacturerExpectedCoverageUnlockScoreV1({
      manufacturerKey: summary.manufacturer_key,
      summary,
      rows: mRows,
    });
    const remaining = summary.rescue_candidate_count - summary.browser_pass_count;
    let rationale = "UNKNOWN — insufficient orchestrator signals.";
    if (summary.owner_review_ready_count > 0) {
      rationale = `${String(summary.owner_review_ready_count)} owner-review-ready slug(s) — highest near-term coverage unlock potential after founder review.`;
    } else if (summary.browser_ready_count > summary.browser_pass_count) {
      rationale = `${String(summary.browser_ready_count - summary.browser_pass_count)} browser-ready slug(s) need capture before apply planning.`;
    } else if (remaining > 0) {
      rationale = `${String(remaining)} rescue slug(s) remain without browser PASS — repo-proven PDP or capture required first.`;
    }
    return {
      manufacturer_key: summary.manufacturer_key,
      expected_coverage_unlock_score: score,
      rescue_candidate_count: summary.rescue_candidate_count,
      owner_review_ready_count: summary.owner_review_ready_count,
      browser_pass_count: summary.browser_pass_count,
      browser_ready_count: summary.browser_ready_count,
      remaining_opportunity: remaining,
      rationale,
    };
  });

  ranked.sort((a, b) => {
    if (b.expected_coverage_unlock_score !== a.expected_coverage_unlock_score) {
      return b.expected_coverage_unlock_score - a.expected_coverage_unlock_score;
    }
    return a.manufacturer_key.localeCompare(b.manufacturer_key);
  });

  return ranked.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function buildBlockedSummary(
  orchestrator: ManufacturerRescueOrchestratorReportV1,
): ManufacturerRescueDirectorReportV1["blocked_summary"] {
  const rows = rescueRows(orchestrator);
  const byReason = new Map<string, string[]>();
  for (const row of rows) {
    for (const reason of row.blocked_reasons) {
      if (
        reason === "csv_apply_not_authorized" ||
        reason === "mutation_authorized=false" ||
        reason === "owner_apply_approval_missing" ||
        reason === "supabase_mutation_not_authorized" ||
        reason === "verified_link_authorized=false"
      ) {
        continue;
      }
      const list = byReason.get(reason) ?? [];
      list.push(row.filter_slug);
      byReason.set(reason, list);
    }
  }

  return [...byReason.entries()]
    .map(([reason, slugs]) => ({
      reason,
      slug_count: slugs.length,
      example_slugs: [...new Set(slugs)].sort().slice(0, 5),
    }))
    .sort((a, b) => b.slug_count - a.slug_count || a.reason.localeCompare(b.reason));
}

function buildEstimates(
  orchestrator: ManufacturerRescueOrchestratorReportV1,
  browserWork: ManufacturerRescueDirectorRankedSlugV1[],
  ownerReviews: ManufacturerRescueDirectorRankedSlugV1[],
  guardedApply: ManufacturerRescueDirectorRankedSlugV1[],
): ManufacturerRescueDirectorEstimatesV1 {
  const browserHours = browserWork.reduce((sum, item) => {
    const hours = BROWSER_HOURS_PER_SLUG_ESTIMATE_V1[item.manufacturer_key] ?? 0.5;
    return sum + hours;
  }, 0);

  const trustFactors: string[] = [];
  let trustRisk: ManufacturerRescueTrustRiskV1 = "LOW";
  const supersessionCount = ownerReviews.filter((r) =>
    r.blocked_reasons.some((b) => b.includes("supersession")),
  ).length;
  const confusionCount = ownerReviews.filter((r) =>
    r.blocked_reasons.some((b) => b.includes("confusion_family")),
  ).length;
  const knownBrokenCount = rescueRows(orchestrator).filter((r) =>
    r.blocked_reasons.some((b) => b.includes("known_broken")),
  ).length;

  if (knownBrokenCount > 0) {
    trustRisk = "HIGH";
    trustFactors.push(`${String(knownBrokenCount)} slug(s) with known_broken destination — do not capture or apply.`);
  }
  if (supersessionCount > 0 || confusionCount > 0) {
    if (trustRisk !== "HIGH") trustRisk = "MEDIUM";
    if (supersessionCount > 0) {
      trustFactors.push(`${String(supersessionCount)} supersession-review owner lane(s).`);
    }
    if (confusionCount > 0) {
      trustFactors.push(`${String(confusionCount)} confusion-family review slug(s).`);
    }
  }
  if (trustFactors.length === 0) {
    trustFactors.push("Guarded apply candidates have repo-proven official URLs and browser PASS.");
  }

  const total = orchestrator.rescue_counts.total_rescue_candidates;
  const gainPercent =
    total > 0 ? Math.round((guardedApply.length / total) * 100) : ("UNKNOWN" as const);

  return {
    safe_buyer_paths_unlockable_estimate: guardedApply.length,
    safe_buyer_paths_unlockable_note:
      "Estimate only — assumes separate owner-approved apply executor succeeds for all guarded_apply candidates. Director does not authorize CSV apply.",
    browser_hours_required_estimate: Math.round(browserHours * 10) / 10,
    browser_hours_note:
      "Planning estimate from browser-work queue depth × per-manufacturer hour constants — not measured runtime.",
    owner_review_count: ownerReviews.length,
    trust_risk: trustRisk,
    trust_risk_factors: trustFactors,
    expected_coverage_gain_percent_estimate: gainPercent,
    expected_coverage_gain_note:
      gainPercent === "UNKNOWN"
        ? "UNKNOWN — no rescue candidates in orchestrator."
        : `Up to ${String(gainPercent)}% of rescue cohort (${String(guardedApply.length)}/${String(total)}) if guarded apply lanes complete with gates intact.`,
  };
}

export function buildManufacturerRescueRoadmapV1(args: {
  director: ManufacturerRescueDirectorReportV1;
  orchestrator: ManufacturerRescueOrchestratorReportV1;
}): ManufacturerRescueRoadmapV1 {
  const ownerSlugs = args.director.ranked_owner_reviews.map((r) => r.filter_slug);
  const applySlugs = args.director.ranked_guarded_apply_candidates.map((r) => r.filter_slug);
  const browserSlugs = args.director.ranked_browser_work.map((r) => r.filter_slug);
  const blockedSlugs = rescueRows(args.orchestrator)
    .filter(
      (r) =>
        !ownerSlugs.includes(r.filter_slug) &&
        !applySlugs.includes(r.filter_slug) &&
        !browserSlugs.includes(r.filter_slug),
    )
    .map((r) => r.filter_slug)
    .sort();

  const stages: ManufacturerRescueDirectorRoadmapStageV1[] = [
    {
      stage_id: "stage_1_owner_reviews",
      stage_order: 1,
      title: "Owner reviews (highest leverage)",
      workload_type: "owner_review",
      slug_count: ownerSlugs.length,
      filter_slugs: ownerSlugs,
      estimated_browser_hours: 0,
      estimated_safe_paths_after_stage: 0,
      becomes_available_after_stage: [
        "Guarded apply planning packets for browser-PASS search-placeholder primaries.",
        "Founder decision on supersession/confusion lanes before any CSV mutation.",
      ],
      blockers_remaining: ["csv_apply_not_authorized", "owner_apply_approval_missing"],
    },
    {
      stage_id: "stage_2_guarded_apply",
      stage_order: 2,
      title: "Guarded apply candidates (post-owner approval)",
      workload_type: "guarded_apply",
      slug_count: applySlugs.length,
      filter_slugs: applySlugs,
      estimated_browser_hours: 0,
      estimated_safe_paths_after_stage: applySlugs.length,
      becomes_available_after_stage: [
        "Up to one safe buyer path per slug in repo CSV (separate apply executor).",
        "Production /go validation still UNKNOWN until post-apply parity check.",
      ],
      blockers_remaining: ["csv_apply_not_authorized", "supabase_mutation_not_authorized"],
    },
    {
      stage_id: "stage_3_browser_captures",
      stage_order: 3,
      title: "Browser capture / owner checklist work",
      workload_type: "browser_capture",
      slug_count: browserSlugs.length,
      filter_slugs: browserSlugs,
      estimated_browser_hours: args.director.estimates.browser_hours_required_estimate,
      estimated_safe_paths_after_stage: 0,
      becomes_available_after_stage: [
        "New owner-review-ready lanes after PASS browser proof artifacts land on disk.",
        "Additional guarded apply candidates only when gates pass — not inferred.",
      ],
      blockers_remaining: ["browser_evidence_artifact_missing", "repo_proven_official_target_url_missing"],
    },
    {
      stage_id: "stage_4_blocked_park",
      stage_order: 4,
      title: "Blocked or not-ready park",
      workload_type: "blocked_park",
      slug_count: blockedSlugs.length,
      filter_slugs: blockedSlugs,
      estimated_browser_hours: 0,
      estimated_safe_paths_after_stage: 0,
      becomes_available_after_stage: [
        "UNKNOWN until repo-proven official PDP exists or known_broken blockers clear.",
      ],
      blockers_remaining: args.director.blocked_summary.slice(0, 5).map((b) => b.reason),
    },
  ];

  const cumulative = stages.map((_, i) =>
    stages
      .slice(0, i + 1)
      .reduce((sum, s) => sum + s.estimated_safe_paths_after_stage, 0),
  );

  return {
    contract: "manufacturer_safe_link_rescue_roadmap_v1",
    director_contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    generated_at: args.director.generated_at,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    stages,
    cumulative_safe_paths_unlockable: cumulative,
    why_this_order_was_chosen: args.director.why_this_order_was_chosen,
  };
}

export function loadManufacturerRescueOrchestratorInputV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): {
  orchestrator: ManufacturerRescueOrchestratorReportV1;
  orchestrator_source_path: string;
} {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1);

  if (fileExists(jsonAbs)) {
    try {
      const parsed = JSON.parse(readTextFile(jsonAbs)) as ManufacturerRescueOrchestratorReportV1;
      if (parsed.contract === MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1) {
        return {
          orchestrator: parsed,
          orchestrator_source_path: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
        };
      }
    } catch {
      // fall through to live build
    }
  }

  const orchestrator = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists,
    readTextFile,
  });
  return {
    orchestrator,
    orchestrator_source_path: "buildManufacturerSafeLinkRescueOrchestratorReportV1(live)",
  };
}

export function buildManufacturerSafeLinkRescueDirectorReportV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  orchestrator?: ManufacturerRescueOrchestratorReportV1;
  orchestratorSourcePath?: string;
}): ManufacturerRescueDirectorReportV1 {
  const now = args.now ?? (() => new Date());
  const loaded = args.orchestrator
    ? {
        orchestrator: args.orchestrator,
        orchestrator_source_path:
          args.orchestratorSourcePath ?? MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
      }
    : loadManufacturerRescueOrchestratorInputV1(args);
  const orchestrator = loaded.orchestrator;

  const rows = rescueRows(orchestrator);
  const rankedManufacturers = rankManufacturers(orchestrator);
  const rankedBrowserWork = sortRankedSlugs(rows.filter(isBrowserWorkCandidate));
  const rankedOwnerReviews = sortRankedSlugs(rows.filter(isOwnerReviewCandidate));
  const rankedGuardedApply = sortRankedSlugs(rows.filter(isGuardedApplyCandidate));
  const estimates = buildEstimates(
    orchestrator,
    rankedBrowserWork,
    rankedOwnerReviews,
    rankedGuardedApply,
  );
  const blockedSummary = buildBlockedSummary(orchestrator);

  const whyOrder = [
    "Stage 1 prioritizes owner-review-ready lanes — browser PASS already on disk for guarded apply candidates; founder review is the binding constraint before any CSV mutation.",
    `Manufacturers ranked by expected_coverage_unlock_score — top: ${rankedManufacturers[0]?.manufacturer_key ?? "UNKNOWN"} (${rankedManufacturers[0]?.rationale ?? "no data"}).`,
    "Browser capture work ordered after owner-review/apply stages because PASS proof must exist before guarded apply; new captures feed future owner-review lanes only.",
    "Blocked/not-ready slugs parked last — no PDP inference, no weakening of wrong-family or supersession gates.",
    "All estimates are planning projections — coverage_unlocked remains false until separate authorized apply executor mutates repo CSV.",
  ];

  const topManufacturer = rankedManufacturers[0]?.manufacturer_key ?? "UNKNOWN";
  const bestPlan = `Maximize safe buyer-path coverage by completing ${String(rankedOwnerReviews.length)} owner review(s) first (${topManufacturer} leads manufacturer priority), then ${String(rankedGuardedApply.length)} guarded apply candidate(s) via separate executor, while scheduling ${String(rankedBrowserWork.length)} browser capture(s) (~${String(estimates.browser_hours_required_estimate)}h estimate) for remaining READY lanes.`;

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1,
    orchestrator_source_path: loaded.orchestrator_source_path,
    orchestrator_generated_at: orchestrator.generated_at,
    generated_at: now().toISOString(),
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    why_this_order_was_chosen: whyOrder,
    blocked_summary: blockedSummary,
    ranked_manufacturers: rankedManufacturers,
    ranked_browser_work: rankedBrowserWork,
    ranked_owner_reviews: rankedOwnerReviews,
    ranked_guarded_apply_candidates: rankedGuardedApply,
    estimates,
    best_execution_plan_summary: bestPlan,
    proven_facts: [
      `PROVEN: director read orchestrator (${loaded.orchestrator_source_path}) with ${String(rows.length)} rescue candidates.`,
      `PROVEN: ${String(rankedOwnerReviews.length)} owner-review-ready slug(s); ${String(rankedGuardedApply.length)} guarded apply candidate(s).`,
      "PROVEN: read_only=true; browser_automation_authorized=false; csv_apply_authorized=false.",
      "PROVEN: coverage_unlocked=false — director is planning only.",
    ],
    unknown_facts: [
      "UNKNOWN: live Supabase/runtime parity after any future apply.",
      "UNKNOWN: production /go first-hop until post-apply validation.",
      "UNKNOWN: actual browser capture duration — hour estimates are planning constants only.",
      ...(orchestrator.unknown_facts ?? []),
    ],
  };
}

export function buildManufacturerRescueNextActionsMarkdownV1(
  director: ManufacturerRescueDirectorReportV1,
  roadmap: ManufacturerRescueRoadmapV1,
): string {
  const lines: string[] = [
    "# Manufacturer safe-link rescue — next actions (read-only director)",
    "",
    `Generated: ${director.generated_at}`,
    `Orchestrator: ${director.orchestrator_source_path} @ ${director.orchestrator_generated_at}`,
    "",
    "## Best execution plan",
    "",
    director.best_execution_plan_summary,
    "",
    "## Estimates (planning only)",
    "",
    `- Safe buyer paths unlockable (estimate): **${String(director.estimates.safe_buyer_paths_unlockable_estimate)}**`,
    `- Browser hours (estimate): **${String(director.estimates.browser_hours_required_estimate)}**`,
    `- Owner reviews required: **${String(director.estimates.owner_review_count)}**`,
    `- Trust risk: **${director.estimates.trust_risk}**`,
    `- Expected coverage gain (estimate): **${String(director.estimates.expected_coverage_gain_percent_estimate)}%**`,
    "",
    director.estimates.safe_buyer_paths_unlockable_note,
    "",
    "## Why this order",
    "",
  ];

  for (const reason of director.why_this_order_was_chosen) {
    lines.push(`- ${reason}`);
  }

  lines.push("", "## Top manufacturer priority", "");
  for (const m of director.ranked_manufacturers.slice(0, 3)) {
    lines.push(
      `${m.rank}. **${m.manufacturer_key}** — score=${m.expected_coverage_unlock_score} — ${m.rationale}`,
    );
  }

  lines.push("", "## Immediate next actions", "");

  if (director.ranked_owner_reviews.length > 0) {
    lines.push("### 1. Owner reviews", "");
    for (const row of director.ranked_owner_reviews.slice(0, 5)) {
      lines.push(
        `- **${row.filter_slug}** (${row.manufacturer_key}, trust=${row.trust_risk}) — ${row.recommended_next_action}`,
      );
    }
    lines.push("");
  }

  if (director.ranked_guarded_apply_candidates.length > 0) {
    lines.push("### 2. Guarded apply candidates (after owner approval)", "");
    for (const row of director.ranked_guarded_apply_candidates.slice(0, 5)) {
      lines.push(`- **${row.filter_slug}** (${row.manufacturer_key}, score=${row.director_value_score})`);
    }
    lines.push("");
  }

  if (director.ranked_browser_work.length > 0) {
    lines.push("### 3. Browser capture work", "");
    for (const row of director.ranked_browser_work.slice(0, 5)) {
      lines.push(`- **${row.filter_slug}** (${row.manufacturer_key}) — ${row.recommended_next_action}`);
    }
    lines.push("");
  }

  lines.push("## Roadmap stages", "");
  for (const stage of roadmap.stages) {
    lines.push(
      `### ${stage.stage_order}. ${stage.title}`,
      `- Slugs: ${String(stage.slug_count)}`,
      `- Est. safe paths after stage: ${String(stage.estimated_safe_paths_after_stage)}`,
      `- Becomes available: ${stage.becomes_available_after_stage.join("; ")}`,
      "",
    );
  }

  lines.push("## Blocked (actionable blockers only)", "");
  if (director.blocked_summary.length === 0) {
    lines.push("_No actionable blockers beyond standard authorization flags._", "");
  } else {
    for (const b of director.blocked_summary.slice(0, 8)) {
      lines.push(
        `- **${b.reason}** (${String(b.slug_count)} slug(s)) — e.g. ${b.example_slugs.join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push("## Authorization", "", "- mutation_authorized: **false**", "- csv_apply_authorized: **false**", "- browser_automation_authorized: **false**", "");

  return lines.join("\n");
}
