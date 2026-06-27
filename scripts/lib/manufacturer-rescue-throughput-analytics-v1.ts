/**
 * Manufacturer Rescue Throughput Analytics v1 — read-only KPI dashboard.
 * Consumes committed artifacts only; never rebuilds upstream systems.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadManufacturerBrowserProofFactoryReportV1, type ManufacturerBrowserProofSlugAssessmentV1 } from "./manufacturer-browser-proof-factory-v1";
import { loadManufacturerBrowserProofRefreshOrchestratorReportV1 } from "./manufacturer-browser-proof-refresh-orchestrator-v1";
import {
  loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
  type ManufacturerRescueDirectorReportV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";
import { loadManufacturerRescueOwnerApprovalPacketFactoryReportV1 } from "./manufacturer-rescue-owner-approval-packet-factory-v1";
import {
  loadManufacturerSafeLinkRescueReadinessGateV1,
  type ManufacturerRescueReadinessCandidateV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  loadManufacturerRescueRunnerReportV1,
  type ManufacturerRescueRunnerReportV1,
  type ManufacturerRescueRunnerSlugStateV1,
  type ManufacturerRescueRunnerStageV1,
} from "./manufacturer-safe-link-rescue-runner-v1";

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1 =
  "manufacturer_rescue_throughput_analytics_v1" as const;

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-rescue-throughput-analytics-v1.json" as const;

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-rescue-throughput-analytics-v1.md" as const;

export const MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-rescue-throughput-analytics" as const;

export const MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1 = [
  "rescue_candidate",
  "browser_proof_capture_scheduled",
  "browser_proof_fresh_official_pass",
  "apply_plan_ready_for_owner_review",
  "owner_approval_packet_cohort",
  "readiness_gate_ready_for_apply",
  "runner_ready_for_apply",
  "applied_or_complete",
] as const;

export type ManufacturerRescueThroughputFunnelStageV1 =
  (typeof MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1)[number];

export type CommittedArtifactStatusV1 = "LOADED" | "MISSING" | "INVALID";

export type ManufacturerRescueThroughputArtifactIntakeV1 = {
  artifact_rel: string;
  status: CommittedArtifactStatusV1;
  generated_at: string | "UNKNOWN";
};

export type ManufacturerRescueThroughputFunnelMetricsV1 = {
  stage_counts: Record<ManufacturerRescueThroughputFunnelStageV1, number>;
  stage_conversion_rates: Record<
    ManufacturerRescueThroughputFunnelStageV1,
    number | "UNKNOWN"
  >;
  rescue_candidate_count: number;
  furthest_stage_reached: ManufacturerRescueThroughputFunnelStageV1;
};

export type ManufacturerRescueThroughputStageAgeV1 = {
  stage: ManufacturerRescueThroughputFunnelStageV1 | "browser_proof_stale";
  slug_count: number;
  average_age_days: number | "UNKNOWN";
  median_age_days: number | "UNKNOWN";
  notes: string;
};

export type ManufacturerRescueThroughputBlockerRowV1 = {
  blocker_reason: string;
  slug_count: number;
  example_slugs: string[];
  source_systems: string[];
};

export type ManufacturerRescueThroughputManufacturerRowV1 = {
  manufacturer_key: string;
  rescue_candidate_count: number;
  capture_scheduled_count: number;
  fresh_official_pass_count: number;
  apply_plan_ready_count: number;
  owner_approval_cohort_slug_count: number;
  readiness_ready_for_apply_count: number;
  runner_ready_for_apply_count: number;
  runner_blocked_count: number;
  dominant_runner_stage: ManufacturerRescueRunnerStageV1 | "UNKNOWN";
  dominant_bottleneck: string | "UNKNOWN";
};

export type ManufacturerRescueThroughputWeeklyUnlockEstimateV1 = {
  estimated_slugs_per_week: number | "UNKNOWN";
  theoretical_ceiling_if_primary_bottleneck_cleared: number;
  single_blocker_browser_proof_refresh_candidates: number;
  readiness_ready_for_apply_count: number;
  execution_ledger_manufacturer_rescue_entries_30d: number | "UNKNOWN";
  methodology: string;
  assumptions: string[];
  unknown_gaps: string[];
};

export type ManufacturerRescueThroughputBottleneckRankV1 = {
  rank: number;
  bottleneck_id: string;
  slug_count: number;
  dominant_blocker: string;
  affected_manufacturers: string[];
  example_slugs: string[];
  leverage_score: number;
};

export type ManufacturerRescueThroughputAnalyticsReportV1 = {
  contract: typeof MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1;
  artifact_intake: {
    orchestrator: ManufacturerRescueThroughputArtifactIntakeV1;
    director: ManufacturerRescueThroughputArtifactIntakeV1;
    browser_proof_factory: ManufacturerRescueThroughputArtifactIntakeV1;
    browser_proof_refresh_orchestrator: ManufacturerRescueThroughputArtifactIntakeV1;
    readiness_gate: ManufacturerRescueThroughputArtifactIntakeV1;
    runner: ManufacturerRescueThroughputArtifactIntakeV1;
    apply_plan_factory: ManufacturerRescueThroughputArtifactIntakeV1;
    owner_approval_packet_factory: ManufacturerRescueThroughputArtifactIntakeV1;
    execution_ledger: ManufacturerRescueThroughputArtifactIntakeV1;
  };
  intake_complete: boolean;
  funnel_metrics: ManufacturerRescueThroughputFunnelMetricsV1;
  stage_ages: ManufacturerRescueThroughputStageAgeV1[];
  blocker_distribution: ManufacturerRescueThroughputBlockerRowV1[];
  manufacturer_throughput: ManufacturerRescueThroughputManufacturerRowV1[];
  weekly_unlock_capacity_estimate: ManufacturerRescueThroughputWeeklyUnlockEstimateV1;
  top_bottleneck_ranking: ManufacturerRescueThroughputBottleneckRankV1[];
  recommended_highest_leverage_improvement: {
    recommendation: string;
    rationale: string[];
    supporting_bottleneck_id: string | "UNKNOWN";
    proven_facts: string[];
    unknown_facts: string[];
  };
  inspect_summary: {
    recommended_next_action: string;
    kpi_dashboard_note: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

const ARTIFACT_RELS = {
  orchestrator: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  director: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
  browser_proof_factory:
    "data/fridge/batch-production/drafts/manufacturer-browser-proof-factory-v1.json",
  browser_proof_refresh_orchestrator:
    "data/fridge/batch-production/drafts/manufacturer-browser-proof-refresh-orchestrator-v1.json",
  readiness_gate:
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-readiness-gate-v1.json",
  runner: "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json",
  apply_plan_factory:
    "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-apply-plan-factory-v1.json",
  owner_approval_packet_factory:
    "data/fridge/batch-production/drafts/manufacturer-rescue-owner-approval-packet-factory-v1.json",
  execution_ledger: "data/command-center/execution-ledger-v1.json",
} as const;

type ManufacturerRescueThroughputExecutionLedgerSnapshotV1 = {
  contract: "buckparts_execution_ledger_v1";
  generated_at: string;
  entries: Array<{
    operational_lane: string;
    completion_timestamp: string;
  }>;
};

function loadCommittedJson<T extends { contract: string }>(args: {
  rootDir: string;
  rel: string;
  expectedContract: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): { artifact: T | null; intake: ManufacturerRescueThroughputArtifactIntakeV1 } {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, args.rel);
  if (!fileExists(abs)) {
    return {
      artifact: null,
      intake: { artifact_rel: args.rel, status: "MISSING", generated_at: "UNKNOWN" },
    };
  }
  try {
    const parsed = JSON.parse(readText(abs)) as T;
    if (parsed.contract !== args.expectedContract) {
      return {
        artifact: null,
        intake: { artifact_rel: args.rel, status: "INVALID", generated_at: "UNKNOWN" },
      };
    }
    const generated_at =
      typeof (parsed as { generated_at?: unknown }).generated_at === "string"
        ? ((parsed as unknown as { generated_at: string }).generated_at)
        : "UNKNOWN";
    return {
      artifact: parsed,
      intake: { artifact_rel: args.rel, status: "LOADED", generated_at },
    };
  } catch {
    return {
      artifact: null,
      intake: { artifact_rel: args.rel, status: "INVALID", generated_at: "UNKNOWN" },
    };
  }
}

export type ManufacturerRescueThroughputCommittedIntakeV1 = {
  orchestrator: ManufacturerRescueOrchestratorReportV1 | null;
  director: ManufacturerRescueDirectorReportV1 | null;
  browser_proof_factory: ReturnType<typeof loadManufacturerBrowserProofFactoryReportV1>;
  browser_proof_refresh_orchestrator: ReturnType<
    typeof loadManufacturerBrowserProofRefreshOrchestratorReportV1
  >;
  readiness_gate: ReturnType<typeof loadManufacturerSafeLinkRescueReadinessGateV1>;
  runner: ManufacturerRescueRunnerReportV1 | null;
  apply_plan_factory: ReturnType<typeof loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1>;
  owner_approval_packet_factory: ReturnType<
    typeof loadManufacturerRescueOwnerApprovalPacketFactoryReportV1
  >;
  execution_ledger: ManufacturerRescueThroughputExecutionLedgerSnapshotV1 | null;
  artifact_intake: ManufacturerRescueThroughputAnalyticsReportV1["artifact_intake"];
  intake_complete: boolean;
};

export function loadManufacturerRescueThroughputCommittedIntakeV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueThroughputCommittedIntakeV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const orchestratorLoad = loadCommittedJson<ManufacturerRescueOrchestratorReportV1>({
    rootDir: args.rootDir,
    rel: ARTIFACT_RELS.orchestrator,
    expectedContract: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_CONTRACT_V1,
    fileExists,
    readText,
  });

  const directorLoad = loadCommittedJson<ManufacturerRescueDirectorReportV1>({
    rootDir: args.rootDir,
    rel: ARTIFACT_RELS.director,
    expectedContract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    fileExists,
    readText,
  });

  const browser_proof_factory = loadManufacturerBrowserProofFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const browser_proof_refresh_orchestrator = loadManufacturerBrowserProofRefreshOrchestratorReportV1(
    {
      rootDir: args.rootDir,
      fileExists,
      readText,
    },
  );
  const readiness_gate = loadManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const runnerLoaded = loadManufacturerRescueRunnerReportV1({
    rootDir: args.rootDir,
    fileExists,
    readTextFile: readText,
  });
  const apply_plan_factory = loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const owner_approval_packet_factory = loadManufacturerRescueOwnerApprovalPacketFactoryReportV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  const executionLedgerLoad = loadCommittedJson<ManufacturerRescueThroughputExecutionLedgerSnapshotV1>({
    rootDir: args.rootDir,
    rel: ARTIFACT_RELS.execution_ledger,
    expectedContract: "buckparts_execution_ledger_v1",
    fileExists,
    readText,
  });
  const execution_ledger = executionLedgerLoad.artifact;

  const artifact_intake = {
    orchestrator: orchestratorLoad.intake,
    director: directorLoad.intake,
    browser_proof_factory: {
      artifact_rel: ARTIFACT_RELS.browser_proof_factory,
      status: browser_proof_factory ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: browser_proof_factory?.generated_at ?? "UNKNOWN",
    },
    browser_proof_refresh_orchestrator: {
      artifact_rel: ARTIFACT_RELS.browser_proof_refresh_orchestrator,
      status: browser_proof_refresh_orchestrator ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: browser_proof_refresh_orchestrator?.generated_at ?? "UNKNOWN",
    },
    readiness_gate: {
      artifact_rel: ARTIFACT_RELS.readiness_gate,
      status: readiness_gate ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: readiness_gate?.generated_at ?? "UNKNOWN",
    },
    runner: {
      artifact_rel: ARTIFACT_RELS.runner,
      status: runnerLoaded ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: runnerLoaded?.report.generated_at ?? "UNKNOWN",
    },
    apply_plan_factory: {
      artifact_rel: ARTIFACT_RELS.apply_plan_factory,
      status: apply_plan_factory ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: apply_plan_factory?.generated_at ?? "UNKNOWN",
    },
    owner_approval_packet_factory: {
      artifact_rel: ARTIFACT_RELS.owner_approval_packet_factory,
      status: owner_approval_packet_factory ? ("LOADED" as const) : ("MISSING" as const),
      generated_at: owner_approval_packet_factory?.generated_at ?? "UNKNOWN",
    },
    execution_ledger: {
      artifact_rel: ARTIFACT_RELS.execution_ledger,
      status: executionLedgerLoad.intake.status,
      generated_at: executionLedgerLoad.intake.generated_at,
    },
  };

  const intake_complete = Object.values(artifact_intake).every((a) => a.status === "LOADED");

  return {
    orchestrator: orchestratorLoad.artifact,
    director: directorLoad.artifact,
    browser_proof_factory,
    browser_proof_refresh_orchestrator,
    readiness_gate,
    runner: runnerLoaded?.report ?? null,
    apply_plan_factory,
    owner_approval_packet_factory,
    execution_ledger,
    artifact_intake,
    intake_complete,
  };
}

function rescueCandidates(
  orchestrator: ManufacturerRescueOrchestratorReportV1 | null,
): ManufacturerRescueOrchestratorQueueRowV1[] {
  if (!orchestrator) return [];
  return orchestrator.unified_rescue_queue.filter(
    (row) => row.cohort_lane !== "REFERENCE_ALREADY_APPLIED",
  );
}

function slugSetFromRefreshOrchestrator(
  refresh: ReturnType<typeof loadManufacturerBrowserProofRefreshOrchestratorReportV1>,
): Set<string> {
  const slugs = new Set<string>();
  if (!refresh) return slugs;
  for (const batch of refresh.manufacturer_refresh_batches) {
    for (const item of batch.work_items) {
      slugs.add(item.filter_slug);
    }
  }
  return slugs;
}

function slugSetFromOwnerApprovalCohorts(
  factory: ReturnType<typeof loadManufacturerRescueOwnerApprovalPacketFactoryReportV1>,
): Set<string> {
  const slugs = new Set<string>();
  if (!factory) return slugs;
  for (const cohort of factory.cohorts) {
    for (const slug of cohort.filter_slugs) {
      slugs.add(slug);
    }
  }
  return slugs;
}

function applyPlanReadySlugs(
  factory: ReturnType<typeof loadManufacturerSafeLinkRescueApplyPlanFactoryReportV1>,
): Set<string> {
  const slugs = new Set<string>();
  if (!factory) return slugs;
  for (const row of factory.slug_results) {
    if (row.plan_status === "READY_FOR_OWNER_REVIEW") {
      slugs.add(row.filter_slug);
    }
  }
  return slugs;
}

function readinessReadySlugs(
  gate: ReturnType<typeof loadManufacturerSafeLinkRescueReadinessGateV1>,
): Set<string> {
  const slugs = new Set<string>();
  if (!gate) return slugs;
  for (const candidate of gate.candidates) {
    if (candidate.ready_for_apply) {
      slugs.add(candidate.filter_slug);
    }
  }
  return slugs;
}

function runnerSlugMap(
  runner: ManufacturerRescueRunnerReportV1 | null,
): Map<string, ManufacturerRescueRunnerSlugStateV1> {
  const map = new Map<string, ManufacturerRescueRunnerSlugStateV1>();
  if (!runner) return map;
  for (const state of runner.slug_states) {
    map.set(state.filter_slug, state);
  }
  return map;
}

function readinessSlugMap(
  gate: ReturnType<typeof loadManufacturerSafeLinkRescueReadinessGateV1>,
): Map<string, ManufacturerRescueReadinessCandidateV1> {
  const map = new Map<string, ManufacturerRescueReadinessCandidateV1>();
  if (!gate) return map;
  for (const candidate of gate.candidates) {
    map.set(candidate.filter_slug, candidate);
  }
  return map;
}

function factoryAssessmentMap(
  factory: ReturnType<typeof loadManufacturerBrowserProofFactoryReportV1>,
) {
  const map = new Map<
    string,
    NonNullable<typeof factory>["slug_assessments"][number]
  >();
  if (!factory) return map;
  for (const assessment of factory.slug_assessments) {
    map.set(assessment.filter_slug, assessment);
  }
  return map;
}

export function classifyManufacturerRescueFunnelStageV1(args: {
  slug: string;
  orchestrator_row: ManufacturerRescueOrchestratorQueueRowV1 | null;
  factory_assessment: ManufacturerBrowserProofSlugAssessmentV1 | undefined;
  refresh_scheduled: boolean;
  apply_plan_ready: boolean;
  owner_approval_cohort: boolean;
  readiness_ready: boolean;
  runner_state: ManufacturerRescueRunnerSlugStateV1 | undefined;
}): ManufacturerRescueThroughputFunnelStageV1 {
  if (
    args.runner_state?.stage === "APPLIED" ||
    args.runner_state?.stage === "COMPLETE"
  ) {
    return "applied_or_complete";
  }
  if (args.runner_state?.stage === "READY_FOR_APPLY" || args.readiness_ready) {
    return args.runner_state?.stage === "READY_FOR_APPLY"
      ? "runner_ready_for_apply"
      : "readiness_gate_ready_for_apply";
  }
  if (args.owner_approval_cohort) {
    return "owner_approval_packet_cohort";
  }
  if (args.apply_plan_ready) {
    return "apply_plan_ready_for_owner_review";
  }
  if (args.factory_assessment?.evidence_status === "FRESH_OFFICIAL_PASS") {
    return "browser_proof_fresh_official_pass";
  }
  if (args.refresh_scheduled || args.factory_assessment?.capture_work_required) {
    return "browser_proof_capture_scheduled";
  }
  if (args.orchestrator_row) {
    return "rescue_candidate";
  }
  return "rescue_candidate";
}

function stageIndex(stage: ManufacturerRescueThroughputFunnelStageV1): number {
  return MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1.indexOf(stage);
}

function computeFunnelMetrics(args: {
  candidates: ManufacturerRescueOrchestratorQueueRowV1[];
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
}): ManufacturerRescueThroughputFunnelMetricsV1 {
  const refreshSlugs = slugSetFromRefreshOrchestrator(args.intake.browser_proof_refresh_orchestrator);
  const applyReady = applyPlanReadySlugs(args.intake.apply_plan_factory);
  const ownerCohort = slugSetFromOwnerApprovalCohorts(args.intake.owner_approval_packet_factory);
  const readinessReady = readinessReadySlugs(args.intake.readiness_gate);
  const runnerMap = runnerSlugMap(args.intake.runner);
  const factoryMap = factoryAssessmentMap(args.intake.browser_proof_factory);

  const stage_counts = Object.fromEntries(
    MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1.map((s) => [s, 0]),
  ) as Record<ManufacturerRescueThroughputFunnelStageV1, number>;

  const orchestratorRowBySlug = new Map(
    args.candidates.map((row) => [row.filter_slug, row]),
  );

  for (const row of args.candidates) {
    const stage = classifyManufacturerRescueFunnelStageV1({
      slug: row.filter_slug,
      orchestrator_row: row,
      factory_assessment: factoryMap.get(row.filter_slug),
      refresh_scheduled: refreshSlugs.has(row.filter_slug),
      apply_plan_ready: applyReady.has(row.filter_slug),
      owner_approval_cohort: ownerCohort.has(row.filter_slug),
      readiness_ready: readinessReady.has(row.filter_slug),
      runner_state: runnerMap.get(row.filter_slug),
    });
    stage_counts[stage] += 1;
  }

  const stage_conversion_rates = {} as Record<
    ManufacturerRescueThroughputFunnelStageV1,
    number | "UNKNOWN"
  >;
  const base = stage_counts.rescue_candidate || args.candidates.length;
  for (const stage of MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1) {
    if (base === 0) {
      stage_conversion_rates[stage] = "UNKNOWN";
      continue;
    }
    const idx = stageIndex(stage);
    let atOrBeyond = 0;
    for (const s of MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1) {
      if (stageIndex(s) >= idx) {
        atOrBeyond += stage_counts[s];
      }
    }
    stage_conversion_rates[stage] = Math.round((atOrBeyond / base) * 1000) / 1000;
  }

  let furthest_stage_reached: ManufacturerRescueThroughputFunnelStageV1 = "rescue_candidate";
  for (const stage of [...MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1].reverse()) {
    if (stage_counts[stage] > 0) {
      furthest_stage_reached = stage;
      break;
    }
  }

  return {
    stage_counts,
    stage_conversion_rates,
    rescue_candidate_count: args.candidates.length,
    furthest_stage_reached,
  };
}

function daysBetween(iso: string | null, now: Date): number | "UNKNOWN" {
  if (!iso) return "UNKNOWN";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "UNKNOWN";
  return Math.max(0, Math.round((now.getTime() - ts) / (24 * 60 * 60 * 1000)));
}

function median(values: number[]): number | "UNKNOWN" {
  if (values.length === 0) return "UNKNOWN";
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10
    : sorted[mid]!;
}

function average(values: number[]): number | "UNKNOWN" {
  if (values.length === 0) return "UNKNOWN";
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function computeStageAges(args: {
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
  now: Date;
}): ManufacturerRescueThroughputStageAgeV1[] {
  const factoryMap = factoryAssessmentMap(args.intake.browser_proof_factory);
  const staleAges: number[] = [];
  const missingCount = { count: 0 };

  for (const assessment of Array.from(factoryMap.values())) {
    if (assessment.evidence_status === "STALE" && assessment.owner_proof_checked_at) {
      const age = daysBetween(assessment.owner_proof_checked_at, args.now);
      if (typeof age === "number") staleAges.push(age);
    }
    if (assessment.evidence_status === "MISSING") {
      missingCount.count += 1;
    }
  }

  const ages: ManufacturerRescueThroughputStageAgeV1[] = [
    {
      stage: "browser_proof_stale",
      slug_count: staleAges.length,
      average_age_days: average(staleAges),
      median_age_days: median(staleAges),
      notes: "Days since owner_proof_checked_at for STALE assessments in browser proof factory.",
    },
    {
      stage: "browser_proof_capture_scheduled",
      slug_count: args.intake.browser_proof_factory?.capture_work_required_count ?? 0,
      average_age_days: average(staleAges),
      median_age_days: median(staleAges),
      notes:
        missingCount.count > 0
          ? `${String(missingCount.count)} slug(s) MISSING proof — age UNKNOWN (no checked_at).`
          : "All scheduled slugs have checked_at for age estimate.",
    },
  ];

  if (args.intake.readiness_gate) {
    const pendingRefresh = args.intake.readiness_gate.candidates.filter(
      (c) => c.readiness_status === "PENDING_BROWSER_REFRESH",
    );
    const pendingAges: number[] = [];
    for (const candidate of pendingRefresh) {
      const assessment = factoryMap.get(candidate.filter_slug);
      if (assessment?.owner_proof_checked_at) {
        const age = daysBetween(assessment.owner_proof_checked_at, args.now);
        if (typeof age === "number") pendingAges.push(age);
      }
    }
    ages.push({
      stage: "browser_proof_fresh_official_pass",
      slug_count: args.intake.browser_proof_factory?.fresh_official_pass_count ?? 0,
      average_age_days: average(pendingAges),
      median_age_days: median(pendingAges),
      notes:
        "Guarded nominees pending refresh use stale proof ages as proxy; fresh PASS slugs use checked_at.",
    });
  }

  return ages;
}

function normalizeBlocker(blocker: string): string {
  return blocker.trim().toLowerCase().replace(/\s+/g, "_");
}

function computeBlockerDistribution(args: {
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
  candidates: ManufacturerRescueOrchestratorQueueRowV1[];
}): ManufacturerRescueThroughputBlockerRowV1[] {
  const byBlocker = new Map<
    string,
    { slugs: Set<string>; sources: Set<string> }
  >();

  const add = (blocker: string, slug: string, source: string) => {
    const key = normalizeBlocker(blocker);
    const entry = byBlocker.get(key) ?? { slugs: new Set(), sources: new Set() };
    entry.slugs.add(slug);
    entry.sources.add(source);
    byBlocker.set(key, entry);
  };

  if (args.intake.runner) {
    for (const state of args.intake.runner.slug_states) {
      for (const blocker of state.blocked_reasons) {
        add(blocker, state.filter_slug, "runner");
      }
    }
  }

  if (args.intake.readiness_gate) {
    for (const candidate of args.intake.readiness_gate.candidates) {
      for (const blocker of candidate.blocking_reasons) {
        add(blocker, candidate.filter_slug, "readiness_gate");
      }
    }
  }

  if (args.intake.apply_plan_factory) {
    for (const row of args.intake.apply_plan_factory.slug_results) {
      for (const blocker of row.blockers) {
        add(blocker, row.filter_slug, "apply_plan_factory");
      }
    }
  }

  return Array.from(byBlocker.entries())
    .map(([blocker_reason, data]) => ({
      blocker_reason,
      slug_count: data.slugs.size,
      example_slugs: Array.from(data.slugs).sort().slice(0, 5),
      source_systems: Array.from(data.sources).sort(),
    }))
    .sort((a, b) => b.slug_count - a.slug_count || a.blocker_reason.localeCompare(b.blocker_reason));
}

function computeManufacturerThroughput(args: {
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
  candidates: ManufacturerRescueOrchestratorQueueRowV1[];
}): ManufacturerRescueThroughputManufacturerRowV1[] {
  const refreshSlugs = slugSetFromRefreshOrchestrator(args.intake.browser_proof_refresh_orchestrator);
  const applyReady = applyPlanReadySlugs(args.intake.apply_plan_factory);
  const ownerCohort = slugSetFromOwnerApprovalCohorts(args.intake.owner_approval_packet_factory);
  const readinessReady = readinessReadySlugs(args.intake.readiness_gate);
  const runnerMap = runnerSlugMap(args.intake.runner);
  const factoryMap = factoryAssessmentMap(args.intake.browser_proof_factory);
  const readinessMap = readinessSlugMap(args.intake.readiness_gate);

  const byMfg = new Map<string, ManufacturerRescueThroughputManufacturerRowV1>();

  for (const row of args.candidates) {
    const mfg = row.manufacturer_key;
    const current = byMfg.get(mfg) ?? {
      manufacturer_key: mfg,
      rescue_candidate_count: 0,
      capture_scheduled_count: 0,
      fresh_official_pass_count: 0,
      apply_plan_ready_count: 0,
      owner_approval_cohort_slug_count: 0,
      readiness_ready_for_apply_count: 0,
      runner_ready_for_apply_count: 0,
      runner_blocked_count: 0,
      dominant_runner_stage: "UNKNOWN" as const,
      dominant_bottleneck: "UNKNOWN" as const,
    };
    current.rescue_candidate_count += 1;
    const assessment = factoryMap.get(row.filter_slug);
    if (assessment?.capture_work_required || refreshSlugs.has(row.filter_slug)) {
      current.capture_scheduled_count += 1;
    }
    if (assessment?.evidence_status === "FRESH_OFFICIAL_PASS") {
      current.fresh_official_pass_count += 1;
    }
    if (applyReady.has(row.filter_slug)) current.apply_plan_ready_count += 1;
    if (ownerCohort.has(row.filter_slug)) current.owner_approval_cohort_slug_count += 1;
    if (readinessReady.has(row.filter_slug)) current.readiness_ready_for_apply_count += 1;
    const runnerState = runnerMap.get(row.filter_slug);
    if (runnerState?.stage === "READY_FOR_APPLY") current.runner_ready_for_apply_count += 1;
    if (runnerState?.stage === "BLOCKED") current.runner_blocked_count += 1;
    byMfg.set(mfg, current);
  }

  if (args.intake.runner) {
    for (const workload of args.intake.runner.manufacturer_workloads) {
      const row = byMfg.get(workload.manufacturer_key);
      if (!row) continue;
      row.dominant_runner_stage = workload.bottleneck_stage;
    }
  }

  for (const [mfg, row] of Array.from(byMfg.entries())) {
    const blockers = args.candidates
      .filter((c) => c.manufacturer_key === mfg)
      .flatMap((c) => readinessMap.get(c.filter_slug)?.blocking_reasons ?? []);
    const top = blockers.reduce<Map<string, number>>((acc, b) => {
      const k = normalizeBlocker(b);
      acc.set(k, (acc.get(k) ?? 0) + 1);
      return acc;
    }, new Map());
    const sorted = Array.from(top.entries()).sort((a, b) => b[1] - a[1]);
    row.dominant_bottleneck = sorted[0]?.[0] ?? "UNKNOWN";
  }

  return Array.from(byMfg.values()).sort(
    (a, b) => b.rescue_candidate_count - a.rescue_candidate_count || a.manufacturer_key.localeCompare(b.manufacturer_key),
  );
}

function countLedgerManufacturerRescueEntries30d(
  ledger: ManufacturerRescueThroughputExecutionLedgerSnapshotV1 | null,
  now: Date,
): number | "UNKNOWN" {
  if (!ledger) return "UNKNOWN";
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const entry of ledger.entries) {
    if (!entry.operational_lane.includes("manufacturer_safe_link_rescue")) continue;
    const ts = Date.parse(entry.completion_timestamp);
    if (!Number.isNaN(ts) && ts >= cutoff) count += 1;
  }
  return count;
}

function computeWeeklyUnlockEstimate(args: {
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
  readinessMap: Map<string, ManufacturerRescueReadinessCandidateV1>;
  now: Date;
}): ManufacturerRescueThroughputWeeklyUnlockEstimateV1 {
  const singleBlockerBrowser = Array.from(args.readinessMap.values()).filter(
    (c) =>
      c.readiness_status === "PENDING_BROWSER_REFRESH" &&
      c.blocking_reasons.length === 1 &&
      c.blocking_reasons[0]?.includes("browser_proof"),
  ).length;

  const readyCount = args.intake.readiness_gate?.ready_for_apply_count ?? 0;
  const ledger30d = countLedgerManufacturerRescueEntries30d(args.intake.execution_ledger, args.now);

  const theoretical =
    args.intake.readiness_gate?.readiness_summary.by_status.PENDING_BROWSER_REFRESH ?? 0;

  return {
    estimated_slugs_per_week: "UNKNOWN",
    theoretical_ceiling_if_primary_bottleneck_cleared: theoretical,
    single_blocker_browser_proof_refresh_candidates: singleBlockerBrowser,
    readiness_ready_for_apply_count: readyCount,
    execution_ledger_manufacturer_rescue_entries_30d: ledger30d,
    methodology:
      "Committed-artifact snapshot only. estimated_slugs_per_week remains UNKNOWN without proven historical apply throughput in execution ledger.",
    assumptions: [
      "Theoretical ceiling counts readiness gate PENDING_BROWSER_REFRESH guarded nominees only.",
      "Single-blocker candidates have exactly one blocking reason containing browser_proof.",
    ],
    unknown_gaps: [
      "UNKNOWN: owner review throughput (slugs/week) — no committed velocity metric.",
      "UNKNOWN: post-apply unlock rate — ledger indexes artifact generation not CSV apply outcomes.",
    ],
  };
}

function computeTopBottlenecks(args: {
  blocker_distribution: ManufacturerRescueThroughputBlockerRowV1[];
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
}): ManufacturerRescueThroughputBottleneckRankV1[] {
  const runnerBottlenecks = args.intake.runner?.bottlenecks ?? [];
  const ranked: ManufacturerRescueThroughputBottleneckRankV1[] = [];

  const topBlockers = args.blocker_distribution.slice(0, 10);
  for (let index = 0; index < topBlockers.length; index += 1) {
    const blocker = topBlockers[index]!;
    const manufacturers = new Set<string>();
    if (args.intake.runner) {
      for (const state of args.intake.runner.slug_states) {
        if (state.blocked_reasons.some((b) => normalizeBlocker(b) === blocker.blocker_reason)) {
          manufacturers.add(state.manufacturer_key);
        }
      }
    }
    ranked.push({
      rank: index + 1,
      bottleneck_id: `blocker_${blocker.blocker_reason}`,
      slug_count: blocker.slug_count,
      dominant_blocker: blocker.blocker_reason,
      affected_manufacturers: Array.from(manufacturers).sort(),
      example_slugs: blocker.example_slugs,
      leverage_score: blocker.slug_count * 10,
    });
  }

  for (const bottleneck of runnerBottlenecks) {
    if (ranked.some((r) => r.bottleneck_id === bottleneck.bottleneck_id)) continue;
    ranked.push({
      rank: ranked.length + 1,
      bottleneck_id: bottleneck.bottleneck_id,
      slug_count: bottleneck.slug_count,
      dominant_blocker: bottleneck.dominant_blocker,
      affected_manufacturers: [],
      example_slugs: bottleneck.example_slugs,
      leverage_score: bottleneck.slug_count * 8,
    });
  }

  return ranked
    .sort((a, b) => b.leverage_score - a.leverage_score || b.slug_count - a.slug_count)
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .slice(0, 10);
}

function computeRecommendedImprovement(args: {
  top_bottleneck_ranking: ManufacturerRescueThroughputBottleneckRankV1[];
  intake: ManufacturerRescueThroughputCommittedIntakeV1;
  weekly_unlock_capacity_estimate: ManufacturerRescueThroughputWeeklyUnlockEstimateV1;
}): ManufacturerRescueThroughputAnalyticsReportV1["recommended_highest_leverage_improvement"] {
  const top = args.top_bottleneck_ranking[0];
  const staleCount = args.intake.browser_proof_factory?.stale_count ?? 0;
  const missingCount = args.intake.browser_proof_factory?.missing_count ?? 0;
  const scheduled = args.intake.browser_proof_refresh_orchestrator?.scheduled_slug_count ?? 0;

  if (staleCount > 0 && top?.dominant_blocker.includes("browser_proof")) {
    return {
      recommendation:
        "Refresh stale owner browser proof for guarded apply nominees, then regenerate readiness gate and apply-plan factory.",
      rationale: [
        `PROVEN: ${String(staleCount)} slug(s) STALE in browser proof factory.`,
        `PROVEN: ${String(args.weekly_unlock_capacity_estimate.single_blocker_browser_proof_refresh_candidates)} guarded nominee(s) blocked only by browser proof.`,
        `PROVEN: refresh orchestrator scheduled ${String(scheduled)} slug(s).`,
      ],
      supporting_bottleneck_id: top?.bottleneck_id ?? "UNKNOWN",
      proven_facts: [
        "Readiness Gate remains sole READY_FOR_APPLY promotion authority.",
      ],
      unknown_facts: [
        "UNKNOWN: calendar time to complete owner browser proof sessions.",
      ],
    };
  }

  if (missingCount > staleCount && missingCount > 0) {
    return {
      recommendation:
        "Execute manufacturer browser proof refresh batches (factory + refresh orchestrator) starting with highest-priority manufacturer batch.",
      rationale: [
        `PROVEN: ${String(missingCount)} slug(s) MISSING owner browser proof.`,
        `PROVEN: ${String(args.intake.browser_proof_refresh_orchestrator?.manufacturer_refresh_batch_count ?? 0)} manufacturer refresh batch(es) ready.`,
      ],
      supporting_bottleneck_id: top?.bottleneck_id ?? "UNKNOWN",
      proven_facts: ["Factory never auto-grants PASS_BROWSER_PROOF."],
      unknown_facts: ["UNKNOWN: owner session throughput for missing-proof slugs."],
    };
  }

  if (
    (args.intake.apply_plan_factory?.ready_for_owner_review_count ?? 0) > 0
  ) {
    return {
      recommendation:
        "Review owner approval packet factory cohorts and record founder owner_mutation_approved decisions.",
      rationale: [
        `PROVEN: ${String(args.intake.apply_plan_factory?.ready_for_owner_review_count ?? 0)} apply plan(s) READY_FOR_OWNER_REVIEW.`,
      ],
      supporting_bottleneck_id: top?.bottleneck_id ?? "UNKNOWN",
      proven_facts: ["Owner approval packet factory never auto-approves."],
      unknown_facts: [],
    };
  }

  return {
    recommendation: top
      ? `Address dominant blocker: ${top.dominant_blocker} (${String(top.slug_count)} slug(s)).`
      : "Regenerate upstream committed artifacts (factory, refresh orchestrator, readiness gate) before re-running analytics.",
    rationale: top
      ? [`PROVEN: top bottleneck affects ${String(top.slug_count)} slug(s).`]
      : ["UNKNOWN: no dominant bottleneck ranked from committed artifacts."],
    supporting_bottleneck_id: top?.bottleneck_id ?? "UNKNOWN",
    proven_facts: [],
    unknown_facts: top ? [] : ["UNKNOWN: blocker ranking empty — intake may be incomplete."],
  };
}

export function buildManufacturerRescueThroughputAnalyticsV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueThroughputAnalyticsReportV1 {
  const now = args.now ?? (() => new Date());
  const intake = loadManufacturerRescueThroughputCommittedIntakeV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  const candidates = rescueCandidates(intake.orchestrator);
  const readinessMap = readinessSlugMap(intake.readiness_gate);

  const funnel_metrics = computeFunnelMetrics({ candidates, intake });
  const stage_ages = computeStageAges({ intake, now: now() });
  const blocker_distribution = computeBlockerDistribution({ intake, candidates });
  const manufacturer_throughput = computeManufacturerThroughput({ intake, candidates });
  const weekly_unlock_capacity_estimate = computeWeeklyUnlockEstimate({
    intake,
    readinessMap,
    now: now(),
  });
  const top_bottleneck_ranking = computeTopBottlenecks({ blocker_distribution, intake });
  const recommended_highest_leverage_improvement = computeRecommendedImprovement({
    top_bottleneck_ranking,
    intake,
    weekly_unlock_capacity_estimate,
  });

  const missingArtifacts = Object.entries(intake.artifact_intake)
    .filter(([, v]) => v.status !== "LOADED")
    .map(([k]) => k);

  return {
    contract: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_SOURCE_COMMAND_V1,
    artifact_intake: intake.artifact_intake,
    intake_complete: intake.intake_complete,
    funnel_metrics,
    stage_ages,
    blocker_distribution,
    manufacturer_throughput,
    weekly_unlock_capacity_estimate,
    top_bottleneck_ranking,
    recommended_highest_leverage_improvement,
    inspect_summary: {
      recommended_next_action: recommended_highest_leverage_improvement.recommendation,
      kpi_dashboard_note:
        "manufacturer_rescue_throughput_analytics_v1 is the read-only Manufacturer Rescue KPI dashboard — consumes committed artifacts only.",
    },
    proven_facts: [
      "PROVEN: Analytics is read-only — no CSV, Supabase, SQL, or browser mutation.",
      `PROVEN: ${String(candidates.length)} rescue candidate slug(s) in committed orchestrator.`,
      `PROVEN: funnel furthest stage reached: ${funnel_metrics.furthest_stage_reached}.`,
      `PROVEN: ${String(blocker_distribution.length)} distinct blocker reason(s) aggregated.`,
      intake.intake_complete
        ? "PROVEN: all nine upstream committed artifacts LOADED."
        : `PROVEN: incomplete intake — missing/invalid: ${missingArtifacts.join(", ") || "UNKNOWN"}.`,
    ],
    unknown_facts: [
      weekly_unlock_capacity_estimate.estimated_slugs_per_week === "UNKNOWN"
        ? "UNKNOWN: estimated_slugs_per_week — no proven historical apply throughput in ledger."
        : "UNKNOWN: post-apply production parity until census re-run.",
      ...weekly_unlock_capacity_estimate.unknown_gaps,
    ],
  };
}

export function buildManufacturerRescueThroughputAnalyticsMarkdownV1(
  report: ManufacturerRescueThroughputAnalyticsReportV1,
): string {
  const lines = [
    "# Manufacturer Rescue throughput analytics v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- intake_complete: **${String(report.intake_complete)}**`,
    `- rescue_candidates: **${String(report.funnel_metrics.rescue_candidate_count)}**`,
    `- furthest_funnel_stage: **${report.funnel_metrics.furthest_stage_reached}**`,
    "",
    "## Funnel stage counts",
    "",
    ...MANUFACTURER_RESCUE_THROUGHPUT_FUNNEL_STAGES_V1.map(
      (stage) =>
        `- ${stage}: **${String(report.funnel_metrics.stage_counts[stage])}** (conversion ${String(report.funnel_metrics.stage_conversion_rates[stage])})`,
    ),
    "",
    "## Top bottlenecks",
    "",
  ];

  if (report.top_bottleneck_ranking.length === 0) {
    lines.push("_No bottlenecks ranked._", "");
  } else {
    for (const row of report.top_bottleneck_ranking.slice(0, 5)) {
      lines.push(
        `${String(row.rank)}. **${row.dominant_blocker}** — ${String(row.slug_count)} slug(s); leverage ${String(row.leverage_score)}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Manufacturer throughput",
    "",
    "| manufacturer | candidates | capture_scheduled | fresh_pass | ready_for_apply |",
    "| --- | ---: | ---: | ---: | ---: |",
  );
  for (const row of report.manufacturer_throughput) {
    lines.push(
      `| ${row.manufacturer_key} | ${String(row.rescue_candidate_count)} | ${String(row.capture_scheduled_count)} | ${String(row.fresh_official_pass_count)} | ${String(row.readiness_ready_for_apply_count)} |`,
    );
  }

  lines.push(
    "",
    "## Weekly unlock capacity",
    "",
    `- estimated_slugs_per_week: **${String(report.weekly_unlock_capacity_estimate.estimated_slugs_per_week)}**`,
    `- theoretical_ceiling_if_primary_bottleneck_cleared: **${String(report.weekly_unlock_capacity_estimate.theoretical_ceiling_if_primary_bottleneck_cleared)}**`,
    `- single_blocker_browser_proof_refresh_candidates: **${String(report.weekly_unlock_capacity_estimate.single_blocker_browser_proof_refresh_candidates)}**`,
    "",
    "## Recommended highest-leverage improvement",
    "",
    report.recommended_highest_leverage_improvement.recommendation,
    "",
    report.inspect_summary.kpi_dashboard_note,
    "",
  );
  return lines.join("\n");
}

export function writeManufacturerRescueThroughputAnalyticsArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerRescueThroughputAnalyticsReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildManufacturerRescueThroughputAnalyticsMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    jsonRelPath: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1,
    mdRelPath: MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_MD_REL_V1,
  };
}

export function loadManufacturerRescueThroughputAnalyticsReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueThroughputAnalyticsReportV1 | null {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_JSON_REL_V1);
  if (!fileExists(abs)) return null;
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueThroughputAnalyticsReportV1;
    if (parsed.contract !== MANUFACTURER_RESCUE_THROUGHPUT_ANALYTICS_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}
