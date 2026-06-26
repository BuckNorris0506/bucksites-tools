/**
 * Command Center v2 projection for manufacturer safe-link rescue director (read-only).
 */

import {
  loadManufacturerRescueDirectorBundleV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1,
  type ManufacturerRescueDirectorEstimatesV1,
  type ManufacturerRescueDirectorManufacturerRankV1,
  type ManufacturerRescueDirectorRankedSlugV1,
  type ManufacturerRescueDirectorReportV1,
  type ManufacturerRescueTrustRiskV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1,
  type ManufacturerRescueScoreboardV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_LANE_CONTRACT_V1 =
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1;

export const MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1 =
  ".command_center_v2.manufacturer_safe_link_rescue_director_v1" as const;

export type ManufacturerSafeLinkRescueDirectorInspectSummaryV1 = {
  recommended_jq_paths: {
    standalone_report: ".inspect_summary";
    command_center: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1;
  };
  next_recommended_manufacturer: string | "UNKNOWN";
  next_recommended_slug: string | "UNKNOWN";
  safe_buyer_paths_unlocked: 0;
  remaining_opportunity: number;
  browser_proofed_count: number;
  browser_proof_queue_count: number;
  owner_review_queue_count: number;
  guarded_apply_queue_count: number;
  estimated_coverage_gain_percent_estimate: number | "UNKNOWN";
  trust_risk: ManufacturerRescueTrustRiskV1;
  director_generated_at: string;
  orchestrator_generated_at: string;
};

export type ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_LANE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  recommended_jq_path: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1;
  generated_at: string;
  orchestrator_generated_at: string;
  director_artifact_path: string;
  orchestrator_artifact_path: string;
  scoreboard_artifact_path: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1;
  manufacturer_rescue_scoreboard: ManufacturerRescueScoreboardV1;
  ranked_manufacturers: ManufacturerRescueDirectorManufacturerRankV1[];
  safe_buyer_paths_unlocked: 0;
  remaining_opportunity: number;
  browser_proof_queue: ManufacturerRescueDirectorRankedSlugV1[];
  owner_review_queue: ManufacturerRescueDirectorRankedSlugV1[];
  /** @deprecated Use nominated_apply_candidates — does not imply readiness-gate promotion. */
  guarded_apply_queue: ManufacturerRescueDirectorRankedSlugV1[];
  nominated_apply_candidates: ManufacturerRescueDirectorRankedSlugV1[];
  readiness_gate_required_before_apply: true;
  estimates: ManufacturerRescueDirectorEstimatesV1;
  trust_risk_summary: {
    trust_risk: ManufacturerRescueTrustRiskV1;
    trust_risk_factors: string[];
  };
  next_recommended_manufacturer: string | "UNKNOWN";
  next_recommended_slug: string | "UNKNOWN";
  best_execution_plan_summary: string;
  recommended_next_action: string;
  inspect_summary: ManufacturerSafeLinkRescueDirectorInspectSummaryV1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildManufacturerSafeLinkRescueDirectorCommandCenterLaneDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  loadBundle?: typeof loadManufacturerRescueDirectorBundleV1;
};

function resolveNextRecommendedSlug(director: ManufacturerRescueDirectorReportV1): string | "UNKNOWN" {
  if (director.ranked_owner_reviews.length > 0) {
    return director.ranked_owner_reviews[0].filter_slug;
  }
  if (director.ranked_guarded_apply_candidates.length > 0) {
    return director.ranked_guarded_apply_candidates[0].filter_slug;
  }
  if (director.ranked_browser_work.length > 0) {
    return director.ranked_browser_work[0].filter_slug;
  }
  return "UNKNOWN";
}

export function buildManufacturerSafeLinkRescueDirectorCommandCenterLaneFromBundleV1(args: {
  director: ManufacturerRescueDirectorReportV1;
  scoreboard: ManufacturerRescueScoreboardV1;
  director_source_path: string;
  orchestrator_source_path: string;
  scoreboard_source_path: string;
}): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
  const nextManufacturer = args.director.ranked_manufacturers[0]?.manufacturer_key ?? "UNKNOWN";
  const nextSlug = resolveNextRecommendedSlug(args.director);

  const inspect_summary: ManufacturerSafeLinkRescueDirectorInspectSummaryV1 = {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary",
      command_center: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
    },
    next_recommended_manufacturer: nextManufacturer,
    next_recommended_slug: nextSlug,
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: args.scoreboard.remaining_opportunity,
    browser_proofed_count: args.scoreboard.browser_proofed,
    browser_proof_queue_count: args.director.ranked_browser_work.length,
    owner_review_queue_count: args.director.ranked_owner_reviews.length,
    guarded_apply_queue_count: args.director.ranked_guarded_apply_candidates.length,
    estimated_coverage_gain_percent_estimate:
      args.director.estimates.expected_coverage_gain_percent_estimate,
    trust_risk: args.director.estimates.trust_risk,
    director_generated_at: args.director.generated_at,
    orchestrator_generated_at: args.director.orchestrator_generated_at,
  };

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
    generated_at: args.director.generated_at,
    orchestrator_generated_at: args.director.orchestrator_generated_at,
    director_artifact_path: args.director_source_path,
    orchestrator_artifact_path: args.orchestrator_source_path,
    scoreboard_artifact_path: args.scoreboard_source_path,
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1,
    manufacturer_rescue_scoreboard: args.scoreboard,
    ranked_manufacturers: args.director.ranked_manufacturers,
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: args.scoreboard.remaining_opportunity,
    browser_proof_queue: args.director.ranked_browser_work,
    owner_review_queue: args.director.ranked_owner_reviews,
    guarded_apply_queue: args.director.ranked_guarded_apply_candidates,
    nominated_apply_candidates: args.director.ranked_guarded_apply_candidates,
    readiness_gate_required_before_apply: true,
    estimates: args.director.estimates,
    trust_risk_summary: {
      trust_risk: args.director.estimates.trust_risk,
      trust_risk_factors: args.director.estimates.trust_risk_factors,
    },
    next_recommended_manufacturer: nextManufacturer,
    next_recommended_slug: nextSlug,
    best_execution_plan_summary: args.director.best_execution_plan_summary,
    recommended_next_action: args.director.best_execution_plan_summary,
    inspect_summary,
    proven_facts: [
      ...args.director.proven_facts,
      `PROVEN: Command Center lane ${MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1} projects director bundle read-only.`,
      `PROVEN: scoreboard total_rescue_candidates=${String(args.scoreboard.total_rescue_candidates)} browser_proofed=${String(args.scoreboard.browser_proofed)}.`,
      "PROVEN: safe_buyer_paths_unlocked=0 — director does not authorize CSV apply or coverage claims.",
      "PROVEN: nominated_apply_candidates and guarded_apply_queue rank orchestrator-nominated slugs only; readiness_gate_required_before_apply=true.",
    ],
    unknown_facts: [...args.director.unknown_facts],
  };
}

export function buildManufacturerSafeLinkRescueDirectorCommandCenterLaneUnknownV1(args: {
  generated_at: string;
  reason: string;
}): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
  const emptyScoreboard: ManufacturerRescueScoreboardV1 = {
    contract: "manufacturer_safe_link_rescue_scoreboard_v1",
    orchestrator_contract: "manufacturer_safe_link_rescue_orchestrator_v1",
    generated_at: args.generated_at,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    total_rescue_candidates: 0,
    browser_proofed: 0,
    owner_review_ready: 0,
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: 0,
    by_manufacturer: [],
  };

  const emptyEstimates: ManufacturerRescueDirectorEstimatesV1 = {
    safe_buyer_paths_unlockable_estimate: 0,
    safe_buyer_paths_unlockable_note: "UNKNOWN — director bundle failed to load.",
    browser_hours_required_estimate: 0,
    browser_hours_note: "UNKNOWN",
    owner_review_count: 0,
    trust_risk: "UNKNOWN",
    trust_risk_factors: [args.reason],
    expected_coverage_gain_percent_estimate: "UNKNOWN",
    expected_coverage_gain_note: "UNKNOWN",
  };

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_LANE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    browser_automation_authorized: false,
    coverage_unlocked: false,
    recommended_jq_path: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
    generated_at: args.generated_at,
    orchestrator_generated_at: "UNKNOWN",
    director_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
    orchestrator_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
    scoreboard_artifact_path: MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1,
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_SOURCE_COMMAND_V1,
    manufacturer_rescue_scoreboard: emptyScoreboard,
    ranked_manufacturers: [],
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: 0,
    browser_proof_queue: [],
    owner_review_queue: [],
    guarded_apply_queue: [],
    nominated_apply_candidates: [],
    readiness_gate_required_before_apply: true,
    estimates: emptyEstimates,
    trust_risk_summary: {
      trust_risk: "UNKNOWN",
      trust_risk_factors: [args.reason],
    },
    next_recommended_manufacturer: "UNKNOWN",
    next_recommended_slug: "UNKNOWN",
    best_execution_plan_summary:
      "Manufacturer rescue director lane UNKNOWN — run npm run buckparts:manufacturer-safe-link-rescue-director locally after orchestrator artifacts.",
    recommended_next_action:
      "Restore manufacturer rescue orchestrator/director draft artifacts or run npm run buckparts:manufacturer-safe-link-rescue-orchestrator && npm run buckparts:manufacturer-safe-link-rescue-director. Lane is read-only.",
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CC_JQ_PATH_V1,
      },
      next_recommended_manufacturer: "UNKNOWN",
      next_recommended_slug: "UNKNOWN",
      safe_buyer_paths_unlocked: 0,
      remaining_opportunity: 0,
      browser_proofed_count: 0,
      browser_proof_queue_count: 0,
      owner_review_queue_count: 0,
      guarded_apply_queue_count: 0,
      estimated_coverage_gain_percent_estimate: "UNKNOWN",
      trust_risk: "UNKNOWN",
      director_generated_at: args.generated_at,
      orchestrator_generated_at: "UNKNOWN",
    },
    proven_facts: [
      "PROVEN: Command Center caught manufacturer_safe_link_rescue_director_v1 build failure without throwing.",
      "PROVEN: All mutation and apply authorization fields are false.",
    ],
    unknown_facts: [`UNKNOWN: manufacturer_safe_link_rescue_director_v1 failed: ${args.reason}`],
  };
}

export function buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1(
  deps: BuildManufacturerSafeLinkRescueDirectorCommandCenterLaneDepsV1,
): ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 {
  const loadBundle = deps.loadBundle ?? loadManufacturerRescueDirectorBundleV1;
  const bundle = loadBundle({
    rootDir: deps.rootDir,
    now: deps.now,
    fileExists: deps.fileExists,
    readTextFile: deps.readTextFile,
  });
  return buildManufacturerSafeLinkRescueDirectorCommandCenterLaneFromBundleV1({
    director: bundle.director,
    scoreboard: bundle.scoreboard,
    director_source_path: bundle.director_source_path,
    orchestrator_source_path: bundle.orchestrator_source_path,
    scoreboard_source_path: bundle.scoreboard_source_path,
  });
}
