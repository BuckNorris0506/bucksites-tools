/**
 * Manufacturer Safe Link Rescue Orchestrator v1 — unified read-only control plane.
 * Orchestrates committed GE, EveryDrop/Whirlpool, and Frigidaire rescue adapters only.
 * BuckParts Truth Contract: repo truth, UNKNOWN over guessing, no mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductCensusProductRowV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  buildFrigidaireRefrigeratorRescueAdapterReportV1,
  FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  type FrigidaireRefrigeratorRescueCohortRowV1,
} from "./frigidaire-refrigerator-rescue-adapter-v1";
import {
  buildOwnerBrowserChecklistOnlyProofForSlugV1,
  EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1,
  loadRepoProvenOfficialTargetUrlV1,
  type EverydropWhirlpoolOfficialProofRowV1,
} from "./fridge-safe-link-everydrop-whirlpool-official-browser-capture-v1";
import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";
import { FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1 } from "./fridge-safe-link-rescue-owner-review-v1";
import {
  buildGeRefrigeratorRescueAdapterReportV1,
  GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  GE_RESCUE_REFERENCE_APPLIED_SLUG_V1,
  type GeRefrigeratorRescueCohortRowV1,
} from "./ge-refrigerator-rescue-adapter-v1";
import {
  buildGeRefrigeratorRescueOwnerApprovalLaneV1,
  type GeRefrigeratorRescueOwnerApprovalLaneV1,
} from "./ge-refrigerator-rescue-owner-approval-packet-v1";
import { loadGeRefrigeratorRescueBrowserEvidenceArtifactV1 } from "./ge-refrigerator-rescue-browser-capture-v1";
import { EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1 } from "./manufacturer-safe-link-rescue-everydrop-whirlpool-config-v1";
import { FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1 } from "./manufacturer-safe-link-rescue-frigidaire-config-v1";
import { GE_MANUFACTURER_RESCUE_CONFIG_V1 } from "./manufacturer-safe-link-rescue-ge-config-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
  READ_ONLY_MUTATION_FLAGS_V1,
  type ManufacturerRescueAdapter,
} from "./manufacturer-safe-link-rescue-framework-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_orchestrator_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-orchestrator-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-owner-work-queue-v1.md" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-scoreboard-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-orchestrator" as const;

export type RegisteredManufacturerRescueAdapterV1 = {
  manufacturer_key: string;
  framework_config_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1;
  adapter_contract: string;
};

export const MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1: readonly RegisteredManufacturerRescueAdapterV1[] =
  [
    {
      manufacturer_key: GE_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
      framework_config_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      adapter_contract: GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    },
    {
      manufacturer_key: EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
      framework_config_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      adapter_contract: "fridge_safe_link_everydrop_whirlpool_official_adapter_v1",
    },
    {
      manufacturer_key: FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
      framework_config_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
      adapter_contract: FRIGIDAIRE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    },
  ] as const;

export type ManufacturerRescueBrowserReadyStateV1 =
  | "READY"
  | "NOT_READY"
  | "BLOCKED"
  | "ALREADY_APPLIED"
  | "UNKNOWN";

export type ManufacturerRescueOwnerReviewReadinessV1 =
  | "READY"
  | "NOT_READY"
  | "ALREADY_APPLIED"
  | "SUPERSESSION_REVIEW"
  | "UNKNOWN";

export type ManufacturerRescueOrchestratorQueueRowV1 = {
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  cohort_lane: string;
  in_fridge_rescue_queue: boolean;
  rescue_queue_rank: number | null;
  census_rescue_priority_score: number | "UNKNOWN";
  orchestrator_priority_score: number;
  expected_safe_coverage_signal: number;
  existing_evidence_score: number;
  browser_ready_state: ManufacturerRescueBrowserReadyStateV1;
  owner_review_readiness: ManufacturerRescueOwnerReviewReadinessV1;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN" | "NOT_CAPTURED";
  repo_proven_official_target_url: string | null;
  adapter_discovery_url: string | null;
  adapter_discovery_provenance: string | "UNKNOWN";
  csv_primary_is_search_placeholder: boolean | "UNKNOWN";
  blocked_reasons: string[];
  recommended_next_action: string;
  orchestrator_rank: number;
  coverage_unlocked: false;
};

export type ManufacturerRescueOrchestratorManufacturerSummaryV1 = {
  manufacturer_key: string;
  adapter_contract: string;
  rescue_candidate_count: number;
  browser_ready_count: number;
  owner_review_ready_count: number;
  browser_pass_count: number;
  unknown_truth_count: number;
  blocked_slug_count: number;
  reference_applied_count: number;
};

export type ManufacturerRescueOrchestratorReportV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  framework_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_SOURCE_COMMAND_V1;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  verified_link_authorized: false;
  coverage_unlocked: false;
  registered_manufacturers: RegisteredManufacturerRescueAdapterV1[];
  manufacturer_summaries: ManufacturerRescueOrchestratorManufacturerSummaryV1[];
  rescue_counts: {
    total_rescue_candidates: number;
    browser_ready_count: number;
    owner_review_ready_count: number;
    browser_pass_count: number;
    unknown_truth_count: number;
    blocked_slug_count: number;
    guarded_apply_candidate_count: number;
  };
  blocked_reasons: Array<{ reason: string; slug_count: number }>;
  recommended_execution_order: string[];
  unified_rescue_queue: ManufacturerRescueOrchestratorQueueRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
  source_paths_read: string[];
};

export type ManufacturerRescueScoreboardV1 = {
  contract: "manufacturer_safe_link_rescue_scoreboard_v1";
  orchestrator_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1;
  generated_at: string;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  coverage_unlocked: false;
  total_rescue_candidates: number;
  browser_proofed: number;
  owner_review_ready: number;
  safe_buyer_paths_unlocked: 0;
  remaining_opportunity: number;
  by_manufacturer: Array<{
    manufacturer_key: string;
    rescue_candidates: number;
    browser_proofed: number;
    owner_review_ready: number;
    remaining_opportunity: number;
  }>;
};

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
const FILTERS_CSV_REL = "data/filters.csv" as const;

const OWNER_PROOF_REL_BY_SLUG: Readonly<Record<string, string>> = Object.fromEntries(
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1.map((rel) => {
    const match = rel.match(/owner-browser-proof-result-([a-z0-9-]+)-v1\.json$/);
    return [match?.[1] ?? "", rel];
  }),
);

function loadOwnerProofArtifact(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
  readTextFile: (abs: string) => string,
): OwnerBrowserProofResultV1 | null {
  const rel = OWNER_PROOF_REL_BY_SLUG[slug.trim().toLowerCase()];
  if (!rel) return null;
  const abs = path.join(rootDir, rel);
  if (!fileExists(abs)) return null;
  try {
    const artifact = JSON.parse(readTextFile(abs)) as OwnerBrowserProofResultV1;
    if (artifact.contract !== FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) return null;
    return artifact;
  } catch {
    return null;
  }
}

function ownerProofOfficialPass(artifact: OwnerBrowserProofResultV1 | null): boolean {
  if (!artifact || artifact.verdict !== "PASS_BROWSER_PROOF") return false;
  return (artifact.owner_proof_urls ?? []).some(
    (row) =>
      (row.browser_proof_status ?? "").trim() === "PASS" &&
      (row.path_type === "official_manufacturer_pdp" ||
        row.path_type === "authorized_parts_distributor_pdp" ||
        row.path_type === "official_manufacturer_accessory_pdp"),
  );
}

function officialUrlFromOwnerProof(artifact: OwnerBrowserProofResultV1 | null): string | null {
  if (!artifact) return null;
  const pass = (artifact.owner_proof_urls ?? []).find(
    (row) =>
      (row.browser_proof_status ?? "").trim() === "PASS" &&
      (row.path_type === "official_manufacturer_pdp" ||
        row.path_type === "authorized_parts_distributor_pdp" ||
        row.path_type === "official_manufacturer_accessory_pdp"),
  );
  return pass?.url?.trim() || null;
}

export function discoverRegisteredManufacturerRescueAdaptersV1(): RegisteredManufacturerRescueAdapterV1[] {
  return [...MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1];
}

export function computeOrchestratorPriorityScoreV1(args: {
  censusRescuePriorityScore: number | "UNKNOWN";
  inFridgeRescueQueue: boolean;
  rescueQueueRank: number | null;
  browserReadyState: ManufacturerRescueBrowserReadyStateV1;
  browserTruthStatus: ManufacturerRescueOrchestratorQueueRowV1["browser_truth_status"];
  ownerReviewReadiness: ManufacturerRescueOwnerReviewReadinessV1;
  repoProvenOfficialTargetUrl: string | null;
  existingEvidenceScore: number;
  cohortLane: string;
  blockedReasons: string[];
}): number {
  let score = 0;
  if (args.censusRescuePriorityScore !== "UNKNOWN") {
    score += args.censusRescuePriorityScore;
  }
  if (args.inFridgeRescueQueue && args.rescueQueueRank !== null) {
    score += Math.max(0, 500 - args.rescueQueueRank * 10);
  }
  if (args.browserReadyState === "READY") score += 100;
  if (args.browserTruthStatus === "PASS") score += 150;
  if (args.ownerReviewReadiness === "READY") score += 120;
  if (args.ownerReviewReadiness === "SUPERSESSION_REVIEW") score += 80;
  if (args.repoProvenOfficialTargetUrl) score += 60;
  score += Math.min(args.existingEvidenceScore, 50);
  if (args.blockedReasons.some((r) => r.includes("known_broken"))) score -= 10_000;
  if (args.cohortLane === "REFERENCE_ALREADY_APPLIED") score -= 5_000;
  return score;
}

function expectedSafeCoverageSignal(args: {
  inFridgeRescueQueue: boolean;
  rescueQueueRank: number | null;
  censusRow: AllProductCensusProductRowV1 | null;
}): number {
  let signal = 0;
  if (args.inFridgeRescueQueue && args.rescueQueueRank !== null) {
    signal += Math.max(0, 200 - args.rescueQueueRank * 5);
  }
  if (args.censusRow) {
    if (args.censusRow.indexable_in_repo_policy === true) signal += 50;
    if (args.censusRow.page_classification === "SAFE_BUYER_PATH_SUPPRESSED_TRUST") signal += 30;
  }
  return signal;
}

function existingEvidenceScoreForSlug(args: {
  ownerProof: OwnerBrowserProofResultV1 | null;
  geBrowserEvidencePresent: boolean;
}): number {
  let score = 0;
  if (args.ownerProof) score += 40;
  if (args.ownerProof?.verdict === "PASS_BROWSER_PROOF") score += 30;
  if (args.geBrowserEvidencePresent) score += 35;
  return score;
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

function buildEverydropChecklistCohortReadOnlyV1(args: {
  rootDir: string;
  now: () => Date;
  fileExists: (abs: string) => boolean;
  readTextFile: (abs: string) => string;
}): EverydropWhirlpoolOfficialProofRowV1[] {
  const filters = parse(args.readTextFile(path.join(args.rootDir, FILTERS_CSV_REL)), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ slug?: string; brand_slug?: string; oem_part_number?: string }>;
  const links = parse(args.readTextFile(path.join(args.rootDir, RETAILER_LINKS_CSV_REL)), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<{ filter_slug?: string; affiliate_url?: string; is_primary?: string }>;

  const filterBySlug = new Map(filters.map((f) => [f.slug?.trim().toLowerCase() ?? "", f]));
  const primaryBySlug = new Map<string, (typeof links)[number]>();
  for (const row of links) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const existing = primaryBySlug.get(slug);
    if (!existing || (row.is_primary ?? "").trim().toLowerCase() === "true") {
      primaryBySlug.set(slug, row);
    }
  }

  return EVERYDROP_WHIRLPOOL_RESCUE_COHORT_SLUGS_V1.map((slug) => {
    const filter = filterBySlug.get(slug);
    const primary = primaryBySlug.get(slug);
    const { url } = loadRepoProvenOfficialTargetUrlV1({ rootDir: args.rootDir, slug });
    return buildOwnerBrowserChecklistOnlyProofForSlugV1({
      slug,
      oemToken: (filter?.oem_part_number ?? slug).trim().toUpperCase(),
      brandSlug: filter?.brand_slug?.trim() ?? null,
      csvPrimaryUrl: (primary?.affiliate_url ?? "").trim() || null,
      repoProvenTargetUrl: url,
      now: args.now,
    });
  });
}

function normalizeGeRow(args: {
  row: GeRefrigeratorRescueCohortRowV1;
  ownerLane: GeRefrigeratorRescueOwnerApprovalLaneV1;
  censusRow: AllProductCensusProductRowV1 | null;
  ownerProof: OwnerBrowserProofResultV1 | null;
}): ManufacturerRescueOrchestratorQueueRowV1 {
  const slug = args.row.filter_slug;
  const blocked: string[] = [];
  if (args.row.discovered_spec_known_broken) {
    blocked.push("known_broken_destination");
  }
  if (args.row.supersession_review_required) {
    blocked.push("supersession_review_required");
  }
  for (const b of args.ownerLane.blockers) blocked.push(b);

  const browserTruth =
    args.ownerLane.browser_truth_status === "PASS"
      ? "PASS"
      : args.ownerLane.browser_truth_status === "FAIL"
        ? "FAIL"
        : args.ownerLane.browser_truth_status === "NOT_CAPTURED"
          ? "NOT_CAPTURED"
          : "UNKNOWN";

  let browserReady: ManufacturerRescueBrowserReadyStateV1 = "UNKNOWN";
  if (args.row.cohort_lane === "REFERENCE_ALREADY_APPLIED") {
    browserReady = "ALREADY_APPLIED";
  } else if (args.row.discovered_spec_known_broken) {
    browserReady = "BLOCKED";
  } else if (args.row.adapter_ready_for_browser_capture) {
    browserReady = "READY";
  } else {
    browserReady = "NOT_READY";
  }

  let ownerReview: ManufacturerRescueOwnerReviewReadinessV1 = "NOT_READY";
  if (args.row.cohort_lane === "REFERENCE_ALREADY_APPLIED") {
    ownerReview = "ALREADY_APPLIED";
  } else if (args.ownerLane.plan_status === "SUPERSESSION_REVIEW_REQUIRED") {
    ownerReview = "SUPERSESSION_REVIEW";
  } else if (args.ownerLane.owner_apply_review_ready) {
    ownerReview = "READY";
  }

  const evidenceScore = existingEvidenceScoreForSlug({
    ownerProof: args.ownerProof,
    geBrowserEvidencePresent: browserTruth === "PASS",
  });

  const censusScore = args.censusRow?.rescue_priority_score ?? "UNKNOWN";
  const orchestratorScore = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: censusScore,
    inFridgeRescueQueue: args.row.in_fridge_rescue_queue,
    rescueQueueRank: args.row.rescue_queue_rank,
    browserReadyState: browserReady,
    browserTruthStatus: browserTruth,
    ownerReviewReadiness: ownerReview,
    repoProvenOfficialTargetUrl:
      args.row.cohort_lane === "REFERENCE_ALREADY_APPLIED"
        ? args.row.discovered_spec_pdp_url
        : null,
    existingEvidenceScore: evidenceScore,
    cohortLane: args.row.cohort_lane,
    blockedReasons: blocked,
  });

  return {
    filter_slug: slug,
    manufacturer_key: GE_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
    oem_part_token: args.row.oem_part_token,
    cohort_lane: args.row.cohort_lane,
    in_fridge_rescue_queue: args.row.in_fridge_rescue_queue,
    rescue_queue_rank: args.row.rescue_queue_rank,
    census_rescue_priority_score: censusScore,
    orchestrator_priority_score: orchestratorScore,
    expected_safe_coverage_signal: expectedSafeCoverageSignal({
      inFridgeRescueQueue: args.row.in_fridge_rescue_queue,
      rescueQueueRank: args.row.rescue_queue_rank,
      censusRow: args.censusRow,
    }),
    existing_evidence_score: evidenceScore,
    browser_ready_state: browserReady,
    owner_review_readiness: ownerReview,
    browser_truth_status: browserTruth,
    repo_proven_official_target_url:
      args.row.cohort_lane === "REFERENCE_ALREADY_APPLIED"
        ? args.row.discovered_spec_pdp_url
        : null,
    adapter_discovery_url:
      args.row.cohort_lane !== "REFERENCE_ALREADY_APPLIED" ? args.row.discovered_spec_pdp_url : null,
    adapter_discovery_provenance:
      args.row.cohort_lane === "REFERENCE_ALREADY_APPLIED"
        ? "PROVEN_REPO_CSV_DIRECT_BUYABLE"
        : args.row.discovered_spec_pdp_url
          ? args.row.discovered_spec_known_broken
            ? "KNOWN_BROKEN_BLOCKED"
            : "INFERRED_GE_SPEC"
          : "UNKNOWN",
    csv_primary_is_search_placeholder: args.row.csv_primary_is_search_placeholder,
    blocked_reasons: [...new Set(blocked)],
    recommended_next_action: args.ownerLane.plan_status.startsWith("ALREADY")
      ? "Reference lane — repo CSV direct_buyable already applied; no rescue capture needed."
      : browserReady === "BLOCKED"
        ? "Blocked — known broken GE spec destination; do not capture until official path is repo-proven."
        : browserTruth === "PASS"
          ? "Owner review guarded GE apply packet — separate executor required; no CSV mutation from orchestrator."
          : browserReady === "READY"
            ? `Run read-only GE browser capture for ${slug}; owner approval before any CSV apply.`
            : "UNKNOWN — GE adapter gates not satisfied; do not guess PDP or direct_buyable.",
    orchestrator_rank: 0,
    coverage_unlocked: false,
  };
}

function normalizeFrigidaireRow(args: {
  row: FrigidaireRefrigeratorRescueCohortRowV1;
  censusRow: AllProductCensusProductRowV1 | null;
  ownerProof: OwnerBrowserProofResultV1 | null;
}): ManufacturerRescueOrchestratorQueueRowV1 {
  const slug = args.row.filter_slug;
  const blocked: string[] = [];
  if (args.row.confusion_family_review_required) blocked.push("confusion_family_review_required");
  if (!args.row.repo_proven_official_pdp_url) blocked.push("repo_proven_official_pdp_url_missing");

  const browserPass = ownerProofOfficialPass(args.ownerProof);
  const browserTruth: ManufacturerRescueOrchestratorQueueRowV1["browser_truth_status"] = browserPass
    ? "PASS"
    : args.ownerProof
      ? "UNKNOWN"
      : "NOT_CAPTURED";

  const browserReady: ManufacturerRescueBrowserReadyStateV1 = args.row.adapter_ready_for_browser_capture
    ? "READY"
    : args.row.repo_proven_official_pdp_url
      ? "READY"
      : "NOT_READY";

  let ownerReview: ManufacturerRescueOwnerReviewReadinessV1 = "NOT_READY";
  if (args.row.confusion_family_review_required && browserPass) {
    ownerReview = "SUPERSESSION_REVIEW";
  } else if (browserPass) {
    ownerReview = "READY";
  }

  const repoUrl =
    args.row.repo_proven_official_pdp_url ?? officialUrlFromOwnerProof(args.ownerProof);
  const evidenceScore = existingEvidenceScoreForSlug({
    ownerProof: args.ownerProof,
    geBrowserEvidencePresent: false,
  });
  const censusScore = args.censusRow?.rescue_priority_score ?? "UNKNOWN";

  const orchestratorScore = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: censusScore,
    inFridgeRescueQueue: args.row.in_fridge_rescue_queue,
    rescueQueueRank: args.row.rescue_queue_rank,
    browserReadyState: browserReady,
    browserTruthStatus: browserTruth,
    ownerReviewReadiness: ownerReview,
    repoProvenOfficialTargetUrl: repoUrl,
    existingEvidenceScore: evidenceScore,
    cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
    blockedReasons: blocked,
  });

  return {
    filter_slug: slug,
    manufacturer_key: FRIGIDAIRE_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
    oem_part_token: args.row.oem_part_token,
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: args.row.in_fridge_rescue_queue,
    rescue_queue_rank: args.row.rescue_queue_rank,
    census_rescue_priority_score: censusScore,
    orchestrator_priority_score: orchestratorScore,
    expected_safe_coverage_signal: expectedSafeCoverageSignal({
      inFridgeRescueQueue: args.row.in_fridge_rescue_queue,
      rescueQueueRank: args.row.rescue_queue_rank,
      censusRow: args.censusRow,
    }),
    existing_evidence_score: evidenceScore,
    browser_ready_state: browserReady,
    owner_review_readiness: ownerReview,
    browser_truth_status: browserTruth,
    repo_proven_official_target_url: repoUrl,
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: args.row.csv_primary_is_search_placeholder,
    blocked_reasons: [...new Set(blocked)],
    recommended_next_action: browserPass
      ? "Owner review Frigidaire owner browser proof — no PDP inference; separate apply authorization required."
      : args.row.repo_proven_official_pdp_url
        ? `Complete owner browser checklist for ${slug} using repo-proven official URL.`
        : "UNKNOWN — no repo-proven Frigidaire official PDP; do not infer token URL.",
    orchestrator_rank: 0,
    coverage_unlocked: false,
  };
}

function normalizeEverydropRow(args: {
  row: EverydropWhirlpoolOfficialProofRowV1;
  censusRow: AllProductCensusProductRowV1 | null;
  ownerProof: OwnerBrowserProofResultV1 | null;
  inFridgeRescueQueue: boolean;
  rescueQueueRank: number | null;
}): ManufacturerRescueOrchestratorQueueRowV1 {
  const slug = args.row.filter_slug;
  const blocked = [...args.row.blockers];
  if (args.row.supersession_review_required) blocked.push("supersession_review_required");

  const browserPass = ownerProofOfficialPass(args.ownerProof);
  const browserTruth: ManufacturerRescueOrchestratorQueueRowV1["browser_truth_status"] = browserPass
    ? "PASS"
    : args.ownerProof
      ? "UNKNOWN"
      : "NOT_CAPTURED";

  const browserReady: ManufacturerRescueBrowserReadyStateV1 = args.row.repo_proven_official_target_url
    ? "READY"
    : "NOT_READY";

  let ownerReview: ManufacturerRescueOwnerReviewReadinessV1 = "NOT_READY";
  if (args.row.supersession_review_required && browserPass) {
    ownerReview = "SUPERSESSION_REVIEW";
  } else if (browserPass) {
    ownerReview = "READY";
  }

  const repoUrl =
    args.row.repo_proven_official_target_url ?? officialUrlFromOwnerProof(args.ownerProof);
  const evidenceScore = existingEvidenceScoreForSlug({
    ownerProof: args.ownerProof,
    geBrowserEvidencePresent: false,
  });
  const censusScore = args.censusRow?.rescue_priority_score ?? "UNKNOWN";

  const orchestratorScore = computeOrchestratorPriorityScoreV1({
    censusRescuePriorityScore: censusScore,
    inFridgeRescueQueue: args.inFridgeRescueQueue,
    rescueQueueRank: args.rescueQueueRank,
    browserReadyState: browserReady,
    browserTruthStatus: browserTruth,
    ownerReviewReadiness: ownerReview,
    repoProvenOfficialTargetUrl: repoUrl,
    existingEvidenceScore: evidenceScore,
    cohortLane: "RESCUE_SEARCH_PLACEHOLDER",
    blockedReasons: blocked,
  });

  return {
    filter_slug: slug,
    manufacturer_key: EVERYDROP_WHIRLPOOL_MANUFACTURER_RESCUE_CONFIG_V1.manufacturer_key,
    oem_part_token: args.row.oem_part_token,
    cohort_lane: "RESCUE_SEARCH_PLACEHOLDER",
    in_fridge_rescue_queue: args.inFridgeRescueQueue,
    rescue_queue_rank: args.rescueQueueRank,
    census_rescue_priority_score: censusScore,
    orchestrator_priority_score: orchestratorScore,
    expected_safe_coverage_signal: expectedSafeCoverageSignal({
      inFridgeRescueQueue: args.inFridgeRescueQueue,
      rescueQueueRank: args.rescueQueueRank,
      censusRow: args.censusRow,
    }),
    existing_evidence_score: evidenceScore,
    browser_ready_state: browserReady,
    owner_review_readiness: ownerReview,
    browser_truth_status: browserTruth,
    repo_proven_official_target_url: repoUrl,
    adapter_discovery_url: null,
    adapter_discovery_provenance: "UNKNOWN",
    csv_primary_is_search_placeholder: args.row.csv_primary_is_search_placeholder,
    blocked_reasons: [...new Set(blocked)],
    recommended_next_action: args.row.recommended_next_action,
    orchestrator_rank: 0,
    coverage_unlocked: false,
  };
}

function rankUnifiedQueue(
  rows: ManufacturerRescueOrchestratorQueueRowV1[],
): ManufacturerRescueOrchestratorQueueRowV1[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.orchestrator_priority_score !== a.orchestrator_priority_score) {
      return b.orchestrator_priority_score - a.orchestrator_priority_score;
    }
    if (a.manufacturer_key !== b.manufacturer_key) {
      return a.manufacturer_key.localeCompare(b.manufacturer_key);
    }
    return a.filter_slug.localeCompare(b.filter_slug);
  });
  return sorted.map((row, index) => ({ ...row, orchestrator_rank: index + 1 }));
}

function aggregateBlockedReasons(
  rows: ManufacturerRescueOrchestratorQueueRowV1[],
): Array<{ reason: string; slug_count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const reason of row.blocked_reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([reason, slug_count]) => ({ reason, slug_count }))
    .sort((a, b) => b.slug_count - a.slug_count || a.reason.localeCompare(b.reason));
}

function summarizeManufacturer(
  manufacturerKey: string,
  adapterContract: string,
  rows: ManufacturerRescueOrchestratorQueueRowV1[],
): ManufacturerRescueOrchestratorManufacturerSummaryV1 {
  const rescueRows = rows.filter((r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED");
  return {
    manufacturer_key: manufacturerKey,
    adapter_contract: adapterContract,
    rescue_candidate_count: rescueRows.length,
    browser_ready_count: rescueRows.filter((r) => r.browser_ready_state === "READY").length,
    owner_review_ready_count: rescueRows.filter(
      (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
    ).length,
    browser_pass_count: rescueRows.filter((r) => r.browser_truth_status === "PASS").length,
    unknown_truth_count: rescueRows.filter((r) => r.browser_truth_status === "UNKNOWN").length,
    blocked_slug_count: rescueRows.filter((r) => r.blocked_reasons.length > 0).length,
    reference_applied_count: rows.filter((r) => r.cohort_lane === "REFERENCE_ALREADY_APPLIED").length,
  };
}

export function buildManufacturerRescueScoreboardV1(
  report: ManufacturerRescueOrchestratorReportV1,
): ManufacturerRescueScoreboardV1 {
  const rescueRows = report.unified_rescue_queue.filter(
    (r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );
  const browserProofed = rescueRows.filter((r) => r.browser_truth_status === "PASS").length;
  const ownerReady = rescueRows.filter(
    (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
  ).length;

  const byManufacturer = report.manufacturer_summaries.map((summary) => ({
    manufacturer_key: summary.manufacturer_key,
    rescue_candidates: summary.rescue_candidate_count,
    browser_proofed: summary.browser_pass_count,
    owner_review_ready: summary.owner_review_ready_count,
    remaining_opportunity: summary.rescue_candidate_count - summary.browser_pass_count,
  }));

  return {
    contract: "manufacturer_safe_link_rescue_scoreboard_v1",
    orchestrator_contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    generated_at: report.generated_at,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    coverage_unlocked: false,
    total_rescue_candidates: rescueRows.length,
    browser_proofed: browserProofed,
    owner_review_ready: ownerReady,
    safe_buyer_paths_unlocked: 0,
    remaining_opportunity: rescueRows.length - browserProofed,
    by_manufacturer: byManufacturer,
  };
}

export function buildManufacturerRescueOwnerWorkQueueMarkdownV1(
  report: ManufacturerRescueOrchestratorReportV1,
): string {
  const rescueRows = report.unified_rescue_queue.filter(
    (r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );

  const nextBrowserCaptures = rescueRows.filter(
    (r) =>
      r.browser_ready_state === "READY" &&
      r.browser_truth_status !== "PASS" &&
      !r.blocked_reasons.some((b) => b.includes("known_broken")),
  );

  const nextOwnerReviews = rescueRows.filter(
    (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
  );

  const nextGuardedApply = rescueRows.filter(isGuardedApplyCandidate);

  const lines: string[] = [
    "# Manufacturer safe-link rescue owner work queue (read-only)",
    "",
    `Generated: ${report.generated_at}`,
    `Source: \`${report.source_command}\``,
    "",
    "## Authorization",
    "",
    "- mutation_authorized: **false**",
    "- csv_apply_authorized: **false**",
    "- supabase_mutation_authorized: **false**",
    "- coverage_unlocked: **false**",
    "",
    "## Next browser captures",
    "",
  ];

  if (nextBrowserCaptures.length === 0) {
    lines.push("_None ranked READY without PASS — UNKNOWN retained where proof is missing._", "");
  } else {
    for (const row of nextBrowserCaptures.slice(0, 15)) {
      lines.push(
        `- **${row.filter_slug}** (${row.manufacturer_key}, rank ${row.orchestrator_rank}) — ${row.recommended_next_action}`,
        row.repo_proven_official_target_url
          ? `  - Repo-proven URL: ${row.repo_proven_official_target_url}`
          : row.adapter_discovery_url
            ? `  - Adapter discovery only (not repo-proven): ${row.adapter_discovery_url}`
            : "  - No repo-proven PDP URL on disk.",
        "",
      );
    }
  }

  lines.push("## Next owner reviews", "");
  if (nextOwnerReviews.length === 0) {
    lines.push("_No owner-review-ready lanes — fail closed._", "");
  } else {
    for (const row of nextOwnerReviews.slice(0, 15)) {
      lines.push(
        `- **${row.filter_slug}** (${row.manufacturer_key}, ${row.owner_review_readiness}) — browser=${row.browser_truth_status}`,
        `  - ${row.recommended_next_action}`,
        "",
      );
    }
  }

  lines.push("## Next guarded apply candidates", "");
  lines.push(
    "_Apply still requires separate owner-approved executor — orchestrator does not authorize CSV mutation._",
    "",
  );
  if (nextGuardedApply.length === 0) {
    lines.push("_None — browser PASS + owner-review readiness + search-placeholder primary required._", "");
  } else {
    for (const row of nextGuardedApply.slice(0, 10)) {
      lines.push(
        `- **${row.filter_slug}** (${row.manufacturer_key}, rank ${row.orchestrator_rank})`,
        `  - Repo-proven URL: ${row.repo_proven_official_target_url ?? "UNKNOWN"}`,
        "",
      );
    }
  }

  lines.push("## Recommended execution order (top 10)", "");
  for (const slug of report.recommended_execution_order.slice(0, 10)) {
    const row = report.unified_rescue_queue.find((r) => r.filter_slug === slug);
    if (!row) continue;
    lines.push(
      `${row.orchestrator_rank}. \`${slug}\` — ${row.manufacturer_key} — score=${row.orchestrator_priority_score}`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function buildManufacturerSafeLinkRescueOrchestratorReportV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): ManufacturerRescueOrchestratorReportV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));

  const sourcePaths = new Set<string>([
    RETAILER_LINKS_CSV_REL,
    FILTERS_CSV_REL,
    FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    ...FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  ]);

  let censusBySlug = new Map<string, AllProductCensusProductRowV1>();
  let censusLoaded = false;
  try {
    const census = buildAllProductSafeBuyerPathCensusV1({
      rootDir: args.rootDir,
      now,
      fileExists,
      readText: readTextFile,
    });
    if (census.contract === "all_product_safe_buyer_path_census_v1") {
      censusLoaded = true;
      for (const p of census.products) {
        censusBySlug.set(p.slug.toLowerCase(), p);
      }
      sourcePaths.add("data/filters.csv");
      sourcePaths.add("data/retailer_links.csv");
      sourcePaths.add("data/compatibility_mappings.csv");
    }
  } catch {
    censusLoaded = false;
  }

  let rescueRankBySlug = new Map<string, number>();
  const rescueAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1);
  if (fileExists(rescueAbs)) {
    try {
      const rescue = JSON.parse(readTextFile(rescueAbs)) as {
        missing_safe_link_slugs?: Array<{ slug: string; rank: number }>;
      };
      for (const row of rescue.missing_safe_link_slugs ?? []) {
        rescueRankBySlug.set(row.slug.toLowerCase(), row.rank);
      }
    } catch {
      rescueRankBySlug = new Map();
    }
  }

  const geReport = buildGeRefrigeratorRescueAdapterReportV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readTextFile,
  });
  for (const p of geReport.source_paths_read) sourcePaths.add(p);

  const frigidaireReport = buildFrigidaireRefrigeratorRescueAdapterReportV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readTextFile,
  });
  for (const p of frigidaireReport.source_paths_read) sourcePaths.add(p);

  const everydropRows = buildEverydropChecklistCohortReadOnlyV1({
    rootDir: args.rootDir,
    now: now,
    fileExists,
    readTextFile,
  });

  const queue: ManufacturerRescueOrchestratorQueueRowV1[] = [];

  for (const row of geReport.rows) {
    const ownerLane = buildGeRefrigeratorRescueOwnerApprovalLaneV1({
      rootDir: args.rootDir,
      cohortRow: row,
      fileExists,
      readTextFile,
    });
    const ownerProof = loadOwnerProofArtifact(args.rootDir, row.filter_slug, fileExists, readTextFile);
    if (ownerProof) {
      const rel = OWNER_PROOF_REL_BY_SLUG[row.filter_slug];
      if (rel) sourcePaths.add(rel);
    }
    const geEvidence = loadGeRefrigeratorRescueBrowserEvidenceArtifactV1({
      rootDir: args.rootDir,
      filterSlug: row.filter_slug,
      fileExists,
      readTextFile,
    });
    if (geEvidence) sourcePaths.add(row.browser_evidence_artifact_rel_path);

    queue.push(
      normalizeGeRow({
        row,
        ownerLane,
        censusRow: censusBySlug.get(row.filter_slug) ?? null,
        ownerProof,
      }),
    );
  }

  for (const row of frigidaireReport.rows) {
    const ownerProof = loadOwnerProofArtifact(args.rootDir, row.filter_slug, fileExists, readTextFile);
    if (ownerProof) {
      const rel = OWNER_PROOF_REL_BY_SLUG[row.filter_slug];
      if (rel) sourcePaths.add(rel);
    }
    queue.push(
      normalizeFrigidaireRow({
        row,
        censusRow: censusBySlug.get(row.filter_slug) ?? null,
        ownerProof,
      }),
    );
  }

  for (const row of everydropRows) {
    const slug = row.filter_slug;
    const ownerProof = loadOwnerProofArtifact(args.rootDir, slug, fileExists, readTextFile);
    if (ownerProof) {
      const rel = OWNER_PROOF_REL_BY_SLUG[slug];
      if (rel) sourcePaths.add(rel);
    }
    queue.push(
      normalizeEverydropRow({
        row,
        censusRow: censusBySlug.get(slug) ?? null,
        ownerProof,
        inFridgeRescueQueue: rescueRankBySlug.has(slug),
        rescueQueueRank: rescueRankBySlug.get(slug) ?? null,
      }),
    );
  }

  const unified = rankUnifiedQueue(queue);
  const rescueRows = unified.filter((r) => r.cohort_lane !== "REFERENCE_ALREADY_APPLIED");

  const manufacturerSummaries = MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1.map((entry) =>
    summarizeManufacturer(
      entry.manufacturer_key,
      entry.adapter_contract,
      unified.filter((r) => r.manufacturer_key === entry.manufacturer_key),
    ),
  );

  const blockedReasons = aggregateBlockedReasons(rescueRows);
  const recommendedExecutionOrder = rescueRows
    .slice()
    .sort((a, b) => a.orchestrator_rank - b.orchestrator_rank)
    .map((r) => r.filter_slug);

  const guardedApplyCount = rescueRows.filter(isGuardedApplyCandidate).length;

  const proven_facts = [
    `PROVEN: ${String(MANUFACTURER_RESCUE_ORCHESTRATOR_REGISTRY_V1.length)} manufacturers registered in orchestrator registry.`,
    `PROVEN: unified rescue queue contains ${String(rescueRows.length)} rescue candidates (excludes reference-applied lanes).`,
    "PROVEN: read_only=true; all mutation and apply authorization flags false.",
    "PROVEN: coverage_unlocked=false on orchestrator and every queue row.",
    `PROVEN: browser-ready count=${String(rescueRows.filter((r) => r.browser_ready_state === "READY").length)}.`,
    `PROVEN: owner-review-ready count=${String(rescueRows.filter((r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW").length)}.`,
  ];

  const unknown_facts = [
    censusLoaded
      ? "PROVEN: all_product_safe_buyer_path_census_v1 loaded for rescue_priority_score overlay."
      : "UNKNOWN: census overlay unavailable — orchestrator_priority_score excludes census component.",
    "UNKNOWN: live Supabase/runtime parity for all cohort slugs.",
    "UNKNOWN: production /go first-hop for rescue slugs.",
  ];

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    framework_contract: MANUFACTURER_SAFE_LINK_RESCUE_FRAMEWORK_CONTRACT_V1,
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    ...READ_ONLY_MUTATION_FLAGS_V1,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    verified_link_authorized: false,
    registered_manufacturers: discoverRegisteredManufacturerRescueAdaptersV1(),
    manufacturer_summaries: manufacturerSummaries,
    rescue_counts: {
      total_rescue_candidates: rescueRows.length,
      browser_ready_count: rescueRows.filter((r) => r.browser_ready_state === "READY").length,
      owner_review_ready_count: rescueRows.filter(
        (r) => r.owner_review_readiness === "READY" || r.owner_review_readiness === "SUPERSESSION_REVIEW",
      ).length,
      browser_pass_count: rescueRows.filter((r) => r.browser_truth_status === "PASS").length,
      unknown_truth_count: rescueRows.filter((r) => r.browser_truth_status === "UNKNOWN").length,
      blocked_slug_count: rescueRows.filter((r) => r.blocked_reasons.length > 0).length,
      guarded_apply_candidate_count: guardedApplyCount,
    },
    blocked_reasons: blockedReasons,
    recommended_execution_order: recommendedExecutionOrder,
    unified_rescue_queue: unified,
    proven_facts,
    unknown_facts,
    source_paths_read: [...sourcePaths].sort(),
  };
}

/** Satisfies ManufacturerRescueAdapter for registry contract tests. */
export const MANUFACTURER_RESCUE_ORCHESTRATOR_ADAPTER_V1: ManufacturerRescueAdapter<ManufacturerRescueOrchestratorReportV1> =
  {
    manufacturerKey: "orchestrator",
    contract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    buildReport: buildManufacturerSafeLinkRescueOrchestratorReportV1,
  };
