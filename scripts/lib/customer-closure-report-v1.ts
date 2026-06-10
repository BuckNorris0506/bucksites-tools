/**
 * Read-only customer closure report — proves customer-visible improvement only when evidence chain is complete.
 */

import path from "node:path";

import type { AllProductSafeBuyerPathCensusV1, AllProductCensusProductRowV1 } from "./all-product-safe-buyer-path-census-v1";
import type { FridgeGuardedBatchCloseoutLearningLaneV1 } from "./fridge-guarded-batch-closeout-learning-command-center-v1";
import { FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1 } from "./fridge-guarded-batch-closeout-learning-command-center-v1";
import type { MissionFactoryRegistryReportV1 } from "./mission-factory-registry-v1";
import { loadMissionFactoryRegistryV1 } from "./mission-factory-registry-v1";
import type { PagePublishabilityTruthSummaryV1 } from "./buckparts-page-publishability-truth-v1";
import type { DecisionLane, EvidenceRollup } from "./buckparts-command-center-v2-types";
import type { RescueDeltaTrendSummaryInputV1 } from "./customer-reality-scoreboard-v1";

export const CUSTOMER_CLOSURE_REPORT_CONTRACT_V1 = "customer_closure_report_v1" as const;

export const CUSTOMER_CLOSURE_REPORT_CC_JQ_PATH_V1 =
  ".command_center_v2.customer_closure_report_v1" as const;

export const CUSTOMER_CLOSURE_REPORT_SOURCE_COMMAND_V1 =
  "npm run buckparts:command-center" as const;

const PUBLISHABLE_BUY_READY = "PUBLISHABLE_BUY_READY" as const;

const REQUIRED_SOURCE_LANES = [
  "mission_factory_registry_v1",
  "fridge_guarded_batch_closeout_learning_v1",
  "rescue_delta_trend_summary",
  "all_product_safe_buyer_path_census_v1",
  "page_publishability_truth_summary_v1",
  "recent_evidence",
] as const;

export type CustomerClosureProofKindV1 =
  | "closeout_artifact"
  | "census_reclassification"
  | "publishability_improvement"
  | "mission_promoted";

export type CustomerVisibleShipmentV1 = {
  slug: string;
  customer_visible: boolean;
  evidence_basis: "PROVEN" | "INFERRED" | "UNKNOWN";
  proof_kinds: CustomerClosureProofKindV1[];
  census_classification: string | "UNKNOWN";
  publishability_state: string | "UNKNOWN";
  closed_at: string | null;
  source_artifact_path: string | null;
  proof_chain: string[];
};

export type PagesUpgradedThisWeekStatusV1 = {
  status: "PROVEN" | "INFERRED" | "UNKNOWN";
  count: number | "UNKNOWN";
  summary: string;
};

export type ClosureConfidenceV1 = "PROVEN" | "INFERRED" | "UNKNOWN" | "LOW";

export type CustomerClosureReportV1 = {
  contract: typeof CUSTOMER_CLOSURE_REPORT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof CUSTOMER_CLOSURE_REPORT_CC_JQ_PATH_V1;
  source_command: typeof CUSTOMER_CLOSURE_REPORT_SOURCE_COMMAND_V1;
  generated_at: string;
  customer_visible_closures_count: number;
  promoted_missions_count: number;
  closure_candidates_count: number;
  pages_upgraded_this_week_status: PagesUpgradedThisWeekStatusV1;
  discovery_without_closure_ratio: number | "UNKNOWN" | "INFINITE";
  closure_confidence: ClosureConfidenceV1;
  customer_visible_shipments: CustomerVisibleShipmentV1[];
  source_lanes: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

export type RecentEvidenceInputV1 = Pick<DecisionLane, "status"> & {
  evidence_rollup?: EvidenceRollup | null;
};

export type BuildCustomerClosureReportV1Input = {
  generated_at: string;
  rootDir: string;
  missionFactoryRegistry: Pick<
    MissionFactoryRegistryReportV1,
    "missions_by_state" | "active_missions"
  > | null | undefined;
  closeoutLearning: FridgeGuardedBatchCloseoutLearningLaneV1 | null | undefined;
  rescueDeltaTrendSummary: RescueDeltaTrendSummaryInputV1 | null | undefined;
  census: AllProductSafeBuyerPathCensusV1 | null | undefined;
  publishability: PagePublishabilityTruthSummaryV1 | null | undefined;
  recentEvidence: RecentEvidenceInputV1 | null | undefined;
  fileExists?: (absolutePath: string) => boolean;
  readDir?: (absolutePath: string) => string[];
  readTextFile?: (absolutePath: string) => string;
};

type CloseoutSlugEvidenceV1 = {
  slug: string;
  packet_path: string;
  packet_generated_at: string | null;
  closed_at: string | null;
  parity_status: string | null;
  parity_proven: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function censusBySlug(
  census: AllProductSafeBuyerPathCensusV1 | null | undefined,
): Map<string, AllProductCensusProductRowV1> {
  const map = new Map<string, AllProductCensusProductRowV1>();
  if (census?.contract !== "all_product_safe_buyer_path_census_v1") return map;
  for (const product of census.products) {
    map.set(normalizeSlug(product.slug), product);
  }
  return map;
}

function publishabilityBySlug(
  publishability: PagePublishabilityTruthSummaryV1 | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (publishability?.contract !== "page_publishability_truth_summary_v1") return map;
  for (const row of publishability.sample_rows) {
    map.set(normalizeSlug(row.filter_slug), row.publishability_state);
  }
  return map;
}

export function discoveryWithoutClosureRatioV1(
  missions_by_state: Record<string, number> | null | undefined,
): number | "UNKNOWN" | "INFINITE" {
  if (!missions_by_state) return "UNKNOWN";
  const promoted = missions_by_state.PROMOTED ?? 0;
  const dispatchReady = missions_by_state.DISPATCH_READY ?? 0;
  if (dispatchReady > 0 && promoted === 0) return "INFINITE";
  if (promoted > 0) return Math.round((dispatchReady / promoted) * 10) / 10;
  return 0;
}

export function isWithinDays(isoTimestamp: string | null, referenceIso: string, days: number): boolean {
  if (!isoTimestamp) return false;
  const closed = Date.parse(isoTimestamp);
  const reference = Date.parse(referenceIso);
  if (Number.isNaN(closed) || Number.isNaN(reference)) return false;
  const windowMs = days * 24 * 60 * 60 * 1000;
  return closed >= reference - windowMs && closed <= reference;
}

function loadCloseoutSlugEvidence(input: BuildCustomerClosureReportV1Input): CloseoutSlugEvidenceV1[] {
  const fileExists = input.fileExists ?? (() => false);
  const readDir = input.readDir ?? (() => []);
  const readTextFile = input.readTextFile ?? (() => "");
  const dirAbs = path.join(input.rootDir, ...FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1.split("/"));

  const closedAtBySlug = new Map<string, string>();
  const runRegistryDir = path.join(
    input.rootDir,
    "data/fridge/batch-production/run-registry",
  );
  if (fileExists(runRegistryDir)) {
    for (const filename of readDir(runRegistryDir).filter((name) => name.endsWith(".json"))) {
      const rel = `data/fridge/batch-production/run-registry/${filename}`;
      try {
        const registry = asRecord(JSON.parse(readTextFile(path.join(input.rootDir, rel))));
        if (!registry || registry.closeout_complete !== true) continue;
        const closedAt = asString(registry.closed_at);
        for (const slug of asStringArray(registry.proposed_slugs)) {
          const key = normalizeSlug(slug);
          if (closedAt) closedAtBySlug.set(key, closedAt);
        }
      } catch {
        // skip unreadable registry
      }
    }
  }

  const results: CloseoutSlugEvidenceV1[] = [];
  if (!fileExists(dirAbs)) return results;

  for (const filename of readDir(dirAbs).filter((name) => name.endsWith(".json"))) {
    const relPath = `${FRIDGE_GUARDED_BATCH_CLOSEOUT_LEARNING_DIR_REL_V1}/${filename}`;
    try {
      const packet = asRecord(JSON.parse(readTextFile(path.join(input.rootDir, relPath))));
      if (!packet) continue;
      if (packet.contract !== "fridge_buyer_path_batch_closeout_learning_packet_v1") continue;
      const postApply = asRecord(packet.post_apply_parity) ?? {};
      const parityStatus = asString(postApply.status);
      const parityProven = parityStatus === "APPLIED_PARITY_PROVEN";
      const generatedAt = asString(packet.generated_at);
      for (const slug of asStringArray(packet.applied_slugs)) {
        const key = normalizeSlug(slug);
        results.push({
          slug,
          packet_path: relPath,
          packet_generated_at: generatedAt,
          closed_at: closedAtBySlug.get(key) ?? generatedAt,
          parity_status: parityStatus,
          parity_proven: parityProven,
        });
      }
    } catch {
      // skip unreadable packet
    }
  }

  return results;
}

export function proveCustomerVisibleClosureV1(args: {
  slug: string;
  closeout: CloseoutSlugEvidenceV1 | null;
  censusRow: AllProductCensusProductRowV1 | null;
  publishabilityState: string | null;
  missionPromoted: boolean;
}): CustomerVisibleShipmentV1 {
  const proof_kinds: CustomerClosureProofKindV1[] = [];
  const proof_chain: string[] = [];
  const census_classification = args.censusRow?.page_classification ?? "UNKNOWN";
  const publishability_state = args.publishabilityState ?? "UNKNOWN";
  const censusProven = census_classification === "SAFE_BUYER_PATH_PROVEN";
  const publishabilityProven = publishability_state === PUBLISHABLE_BUY_READY;

  if (args.closeout?.parity_proven) {
    proof_kinds.push("closeout_artifact");
    proof_chain.push(
      `PROVEN: closeout packet ${args.closeout.packet_path} reports ${args.closeout.parity_status}.`,
    );
  }
  if (censusProven) {
    proof_kinds.push("census_reclassification");
    proof_chain.push("PROVEN: all_product_safe_buyer_path_census_v1 classifies slug SAFE_BUYER_PATH_PROVEN.");
  }
  if (publishabilityProven) {
    proof_kinds.push("publishability_improvement");
    proof_chain.push(
      "PROVEN: page_publishability_truth_summary_v1 reports PUBLISHABLE_BUY_READY for slug.",
    );
  }
  if (args.missionPromoted) {
    proof_kinds.push("mission_promoted");
    proof_chain.push("PROVEN: mission_factory_registry_v1 mission reached PROMOTED with matching target_slug.");
  }

  const hasCloseoutAndCensus = Boolean(args.closeout?.parity_proven && censusProven);
  const hasMissionAndCensus = Boolean(args.missionPromoted && censusProven);
  const customer_visible = hasCloseoutAndCensus || hasMissionAndCensus;

  let evidence_basis: CustomerVisibleShipmentV1["evidence_basis"] = "UNKNOWN";
  if (customer_visible) {
    evidence_basis = "PROVEN";
  } else if (args.closeout?.parity_proven && !censusProven) {
    evidence_basis = "UNKNOWN";
    proof_chain.push(
      "UNKNOWN: batch closeout applied but census does not show SAFE_BUYER_PATH_PROVEN — customer-visible closure not proven.",
    );
  } else if (args.missionPromoted && !censusProven) {
    evidence_basis = "UNKNOWN";
    proof_chain.push(
      "UNKNOWN: mission PROMOTED but census does not show SAFE_BUYER_PATH_PROVEN — customer-visible closure not proven.",
    );
  } else if (censusProven && !args.closeout?.parity_proven && !args.missionPromoted) {
    evidence_basis = "UNKNOWN";
    proof_chain.push(
      "UNKNOWN: census shows SAFE_BUYER_PATH_PROVEN without closeout artifact or PROMOTED mission — improvement timing not proven.",
    );
  }

  return {
    slug: args.slug,
    customer_visible,
    evidence_basis,
    proof_kinds,
    census_classification,
    publishability_state,
    closed_at: args.closeout?.closed_at ?? null,
    source_artifact_path: args.closeout?.packet_path ?? null,
    proof_chain,
  };
}

function buildPagesUpgradedThisWeekStatus(args: {
  generated_at: string;
  provenShipments: CustomerVisibleShipmentV1[];
  rescueDeltaTrendSummary: RescueDeltaTrendSummaryInputV1 | null | undefined;
}): PagesUpgradedThisWeekStatusV1 {
  const thisWeekProven = args.provenShipments.filter(
    (shipment) =>
      shipment.customer_visible &&
      isWithinDays(shipment.closed_at, args.generated_at, 7),
  );

  if (thisWeekProven.length > 0) {
    return {
      status: "PROVEN",
      count: thisWeekProven.length,
      summary: `${String(thisWeekProven.length)} slug(s) have PROVEN customer-visible closure with closeout timestamps inside the last 7 days.`,
    };
  }

  const rescue = args.rescueDeltaTrendSummary;
  if (
    rescue?.runtime_status === "OK" &&
    rescue.net_rescue_direction === "IMPROVING" &&
    typeof rescue.deltas.safe_cta_links_delta === "number" &&
    rescue.deltas.safe_cta_links_delta > 0
  ) {
    return {
      status: "INFERRED",
      count: "UNKNOWN",
      summary:
        "rescue_delta_trend_summary reports IMPROVING safe CTA delta, but no per-slug closure registry proves pages upgraded this week.",
    };
  }

  return {
    status: "UNKNOWN",
    count: "UNKNOWN",
    summary:
      "No PROVEN per-slug closure timestamps inside 7d and no durable census delta registry — pages_upgraded_this_week is UNKNOWN.",
  };
}

function deriveClosureConfidence(args: {
  provenCount: number;
  candidateCount: number;
  hasCensus: boolean;
  hasCloseoutLane: boolean;
}): ClosureConfidenceV1 {
  if (args.provenCount > 0 && args.hasCensus && args.hasCloseoutLane) {
    return "PROVEN";
  }
  if (args.provenCount > 0) {
    return "INFERRED";
  }
  if (args.candidateCount > 0 && args.hasCensus) {
    return "LOW";
  }
  return "UNKNOWN";
}

function uniqueSourceLanes(lanes: string[]): string[] {
  return Array.from(new Set(lanes.filter((lane) => lane.trim().length > 0)));
}

export function buildCustomerClosureReportV1(
  input: BuildCustomerClosureReportV1Input,
): CustomerClosureReportV1 {
  const proven_facts: string[] = [
    `PROVEN: ${CUSTOMER_CLOSURE_REPORT_CC_JQ_PATH_V1} is read-only and does not mutate product data or next_best_action.`,
  ];
  const inferred_facts: string[] = [];
  const unknown_facts: string[] = [];

  const censusMap = censusBySlug(input.census);
  const publishabilityMap = publishabilityBySlug(input.publishability);
  const hasCensus = input.census?.contract === "all_product_safe_buyer_path_census_v1";
  const hasCloseoutLane =
    input.closeoutLearning?.contract === "fridge_guarded_batch_closeout_learning_command_center_v1";

  if (hasCensus) {
    proven_facts.push(
      `PROVEN: all_product_safe_buyer_path_census_v1 — SAFE_BUYER_PATH_PROVEN=${String(input.census!.classification_counts.SAFE_BUYER_PATH_PROVEN)}.`,
    );
  } else {
    unknown_facts.push("all_product_safe_buyer_path_census_v1 missing or wrong contract.");
  }

  if (hasCloseoutLane) {
    proven_facts.push(
      `PROVEN: fridge_guarded_batch_closeout_learning_v1 lane_status=${input.closeoutLearning!.lane_status} packet_count=${String(input.closeoutLearning!.packet_count)}.`,
    );
  } else {
    unknown_facts.push("fridge_guarded_batch_closeout_learning_v1 missing or wrong contract.");
  }

  const promoted_missions_count =
    input.missionFactoryRegistry?.missions_by_state?.PROMOTED ?? 0;
  proven_facts.push(`PROVEN: mission_factory_registry_v1 — PROMOTED=${String(promoted_missions_count)}.`);

  const discovery_without_closure_ratio = discoveryWithoutClosureRatioV1(
    input.missionFactoryRegistry?.missions_by_state,
  );
  if (discovery_without_closure_ratio === "INFINITE") {
    inferred_facts.push(
      "INFERRED: discovery-without-closure ratio is infinite — dispatch-ready missions exist with zero promoted.",
    );
  }

  const closeoutEvidence = loadCloseoutSlugEvidence(input);
  const closeoutBySlug = new Map<string, CloseoutSlugEvidenceV1>();
  for (const entry of closeoutEvidence) {
    closeoutBySlug.set(normalizeSlug(entry.slug), entry);
  }

  const promotedSlugSet = new Set<string>();
  try {
    const registry = loadMissionFactoryRegistryV1(input.rootDir);
    for (const mission of registry.missions) {
      if (mission.state !== "PROMOTED") continue;
      for (const slug of mission.target_slugs) {
        promotedSlugSet.add(normalizeSlug(slug));
      }
    }
  } catch {
    unknown_facts.push("UNKNOWN: mission registry file could not be loaded for PROMOTED target_slugs.");
  }

  const shipmentSlugs = new Set<string>();
  for (const entry of closeoutEvidence) shipmentSlugs.add(normalizeSlug(entry.slug));
  for (const slug of Array.from(promotedSlugSet)) shipmentSlugs.add(slug);

  const customer_visible_shipments: CustomerVisibleShipmentV1[] = [];
  for (const slugKey of Array.from(shipmentSlugs).sort()) {
    const displaySlug =
      closeoutBySlug.get(slugKey)?.slug ??
      input.census?.products.find((p) => normalizeSlug(p.slug) === slugKey)?.slug ??
      slugKey;
    customer_visible_shipments.push(
      proveCustomerVisibleClosureV1({
        slug: displaySlug,
        closeout: closeoutBySlug.get(slugKey) ?? null,
        censusRow: censusMap.get(slugKey) ?? null,
        publishabilityState: publishabilityMap.get(slugKey) ?? null,
        missionPromoted: promotedSlugSet.has(slugKey),
      }),
    );
  }

  const customer_visible_closures_count = customer_visible_shipments.filter(
    (shipment) => shipment.customer_visible && shipment.evidence_basis === "PROVEN",
  ).length;

  let closure_candidates_count = 0;
  for (const entry of closeoutEvidence) {
    const censusRow = censusMap.get(normalizeSlug(entry.slug));
    if (entry.parity_proven && censusRow?.page_classification !== "SAFE_BUYER_PATH_PROVEN") {
      closure_candidates_count += 1;
    }
  }
  if (input.census?.contract === "all_product_safe_buyer_path_census_v1") {
    closure_candidates_count += input.census.top_20_rescue_queue.length;
  }
  const inFlightStates = new Set([
    "DISCOVERY_COMPLETE",
    "INGEST_COMMITTED",
    "CURSOR_VALIDATED",
    "OWNER_REVIEWED",
    "GUARD_CAPTURED",
  ]);
  for (const mission of input.missionFactoryRegistry?.active_missions ?? []) {
    if (inFlightStates.has(mission.state)) closure_candidates_count += 1;
  }

  const pages_upgraded_this_week_status = buildPagesUpgradedThisWeekStatus({
    generated_at: input.generated_at,
    provenShipments: customer_visible_shipments.filter((s) => s.customer_visible),
    rescueDeltaTrendSummary: input.rescueDeltaTrendSummary,
  });

  const closure_confidence = deriveClosureConfidence({
    provenCount: customer_visible_closures_count,
    candidateCount: closure_candidates_count,
    hasCensus,
    hasCloseoutLane,
  });

  if (input.rescueDeltaTrendSummary?.runtime_status === "OK") {
    proven_facts.push(
      `PROVEN: rescue_delta_trend_summary net_rescue_direction=${input.rescueDeltaTrendSummary.net_rescue_direction}.`,
    );
  } else {
    unknown_facts.push("rescue_delta_trend_summary unavailable or not OK.");
  }

  if (input.recentEvidence?.evidence_rollup) {
    proven_facts.push(
      `PROVEN: recent_evidence evidence_rollup live_outcome_count=${String(input.recentEvidence.evidence_rollup.live_outcome_count)}.`,
    );
  }

  if (customer_visible_closures_count === 0) {
    unknown_facts.push(
      "UNKNOWN: zero PROVEN customer-visible closures — closeout/census/mission proof chain incomplete for all candidate slugs.",
    );
  } else {
    proven_facts.push(
      `PROVEN: customer_visible_closures_count=${String(customer_visible_closures_count)} with full closeout-or-mission + census proof chain.`,
    );
  }

  if (pages_upgraded_this_week_status.status === "UNKNOWN") {
    unknown_facts.push(pages_upgraded_this_week_status.summary);
  }

  inferred_facts.push(
    "INFERRED: customer_closure_report_v1 does not replace next_best_action or write closure records to disk.",
  );

  const source_lanes = uniqueSourceLanes([
    ...REQUIRED_SOURCE_LANES,
    ...(input.closeoutLearning?.packet_count ? ["batch_closeout_artifacts_on_disk"] : []),
  ]);

  return {
    contract: CUSTOMER_CLOSURE_REPORT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: CUSTOMER_CLOSURE_REPORT_CC_JQ_PATH_V1,
    source_command: CUSTOMER_CLOSURE_REPORT_SOURCE_COMMAND_V1,
    generated_at: input.generated_at,
    customer_visible_closures_count,
    promoted_missions_count,
    closure_candidates_count,
    pages_upgraded_this_week_status,
    discovery_without_closure_ratio,
    closure_confidence,
    customer_visible_shipments,
    source_lanes,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
