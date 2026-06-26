/**
 * Manufacturer Safe Link Rescue Runner v1 — read-only execution engine between
 * Command Center director lane and manufacturer adapters.
 * BuckParts Truth Contract: deterministic plans only; no mutation, no browser automation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import { buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1 } from "./manufacturer-safe-link-rescue-director-command-center-v1";
import {
  assessSlugTrustRiskV1,
  computeDirectorValueScoreV1,
  isManufacturerRescueBrowserWorkCandidateV1,
  isManufacturerRescueGuardedApplyCandidateV1,
  isManufacturerRescueOwnerReviewCandidateV1,
  loadManufacturerRescueOrchestratorInputV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
  type ManufacturerRescueTrustRiskV1,
} from "./manufacturer-safe-link-rescue-director-v1";
import {
  type ManufacturerRescueOrchestratorQueueRowV1,
  type ManufacturerRescueOrchestratorReportV1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import { READ_ONLY_MUTATION_FLAGS_V1 } from "./manufacturer-safe-link-rescue-framework-v1";

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1 =
  "manufacturer_safe_link_rescue_runner_v1" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-v1.json" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1 =
  "data/fridge/batch-production/drafts/manufacturer-safe-link-rescue-runner-board-v1.md" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-safe-link-rescue-runner" as const;

export const MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1 = [
  "DISCOVER",
  "BROWSER_PROOF",
  "OWNER_REVIEW",
  "READY_FOR_APPLY",
  "APPLIED",
  "REAUDIT_DUE",
  "COMPLETE",
  "BLOCKED",
] as const;

export type ManufacturerRescueRunnerStageV1 =
  (typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1)[number];

export const MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1: Readonly<
  Record<ManufacturerRescueRunnerStageV1, number>
> = {
  READY_FOR_APPLY: 0,
  REAUDIT_DUE: 1,
  OWNER_REVIEW: 2,
  BROWSER_PROOF: 3,
  DISCOVER: 4,
  APPLIED: 5,
  BLOCKED: 6,
  COMPLETE: 7,
};

export type ManufacturerRescueRunnerBoardySafetyRuleV1 =
  | "browser_proof_freshness"
  | "wrong_family_validation"
  | "one_at_a_time_apply"
  | "reaudit_after_apply";

export type ManufacturerRescueRunnerSlugStateV1 = {
  filter_slug: string;
  manufacturer_key: string;
  oem_part_token: string;
  stage: ManufacturerRescueRunnerStageV1;
  execution_rank: number;
  next_executable_action: string;
  executable_now: boolean;
  blocked_reasons: string[];
  trust_risk: ManufacturerRescueTrustRiskV1;
  director_value_score: number;
  boardy_safety_rules: ManufacturerRescueRunnerBoardySafetyRuleV1[];
  orchestrator_recommended_next_action: string;
  coverage_unlocked: false;
};

export type ManufacturerRescueRunnerManufacturerWorkloadV1 = {
  manufacturer_key: string;
  remaining_slug_count: number;
  stage_counts: Record<ManufacturerRescueRunnerStageV1, number>;
  estimated_browser_hours_remaining: number;
  bottleneck_stage: ManufacturerRescueRunnerStageV1 | "UNKNOWN";
};

export type ManufacturerRescueRunnerBottleneckV1 = {
  bottleneck_id: string;
  stage: ManufacturerRescueRunnerStageV1;
  slug_count: number;
  dominant_blocker: string | "NONE";
  example_slugs: string[];
};

export type ManufacturerRescueRunnerReportV1 = {
  contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  browser_automation_authorized: false;
  coverage_unlocked: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1;
  director_cc_lane_contract: typeof MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1;
  director_source_path: string;
  orchestrator_source_path: string;
  director_generated_at: string;
  orchestrator_generated_at: string;
  ready_for_apply_slug: string | null;
  ready_for_apply_enforced: true;
  slug_states: ManufacturerRescueRunnerSlugStateV1[];
  execution_order: string[];
  manufacturer_workloads: ManufacturerRescueRunnerManufacturerWorkloadV1[];
  bottlenecks: ManufacturerRescueRunnerBottleneckV1[];
  blocker_summary: Array<{ reason: string; slug_count: number; example_slugs: string[] }>;
  boardy_safety_contract: {
    browser_proof_freshness_required: true;
    wrong_family_validation_required: true;
    one_at_a_time_apply_enforced: true;
    reaudit_after_apply_required: true;
  };
  post_apply_validation_checklist: string[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      command_center: ".command_center_v2.manufacturer_safe_link_rescue_runner_v1";
      ready_for_apply_slug: ".ready_for_apply_slug";
      execution_order: ".execution_order";
    };
    next_executable_slug: string | "UNKNOWN";
    ready_for_apply_slug: string | null;
    remaining_opportunity: number;
    recommended_next_action: string;
  };
  proven_facts: string[];
  unknown_facts: string[];
};

const BROWSER_HOURS_PER_SLUG_ESTIMATE_V1: Readonly<Record<string, number>> = {
  ge_appliance_parts: 0.75,
  everydrop_whirlpool: 0.5,
  frigidaire: 0.5,
};

function hasWrongFamilyBlocker(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  return row.blocked_reasons.some((r) => r.includes("confusion_family"));
}

function browserProofStaleOrMissing(row: ManufacturerRescueOrchestratorQueueRowV1): boolean {
  return row.blocked_reasons.some(
    (r) =>
      r.includes("browser_evidence_artifact_missing") ||
      r.includes("live_browser_capture_unavailable"),
  );
}

export function deriveManufacturerRescueRunnerStageV1(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  readyForApplySlug: string | null;
}): ManufacturerRescueRunnerStageV1 {
  const { row, readyForApplySlug } = args;

  if (row.cohort_lane === "REFERENCE_ALREADY_APPLIED") {
    return "COMPLETE";
  }

  if (row.browser_ready_state === "BLOCKED") {
    return "BLOCKED";
  }
  if (row.blocked_reasons.some((r) => r.includes("known_broken"))) {
    return "BLOCKED";
  }

  if (
    row.owner_review_readiness === "ALREADY_APPLIED" ||
    row.browser_ready_state === "ALREADY_APPLIED"
  ) {
    return "REAUDIT_DUE";
  }

  if (row.csv_primary_is_search_placeholder === false) {
    if (row.browser_truth_status === "PASS") {
      return "REAUDIT_DUE";
    }
    return "APPLIED";
  }

  if (
    readyForApplySlug === row.filter_slug &&
    isManufacturerRescueGuardedApplyCandidateV1(row) &&
    !browserProofStaleOrMissing(row)
  ) {
    return "READY_FOR_APPLY";
  }

  if (browserProofStaleOrMissing(row)) {
    return "BROWSER_PROOF";
  }

  if (
    row.browser_truth_status === "PASS" &&
    isManufacturerRescueOwnerReviewCandidateV1(row)
  ) {
    if (hasWrongFamilyBlocker(row) && row.owner_review_readiness !== "SUPERSESSION_REVIEW") {
      return "BLOCKED";
    }
    return "OWNER_REVIEW";
  }

  if (isManufacturerRescueBrowserWorkCandidateV1(row)) {
    return "BROWSER_PROOF";
  }

  if (
    row.browser_ready_state === "NOT_READY" ||
    !row.adapter_discovery_url ||
    row.adapter_discovery_provenance === "UNKNOWN"
  ) {
    if (row.blocked_reasons.length > 0 && !isManufacturerRescueBrowserWorkCandidateV1(row)) {
      return "BLOCKED";
    }
    return "DISCOVER";
  }

  if (row.blocked_reasons.length > 0) {
    return "BLOCKED";
  }

  return "DISCOVER";
}

function boardySafetyRulesForStage(
  stage: ManufacturerRescueRunnerStageV1,
  row: ManufacturerRescueOrchestratorQueueRowV1,
): ManufacturerRescueRunnerBoardySafetyRuleV1[] {
  const rules: ManufacturerRescueRunnerBoardySafetyRuleV1[] = [];
  if (stage === "BROWSER_PROOF" || stage === "READY_FOR_APPLY" || stage === "OWNER_REVIEW") {
    rules.push("browser_proof_freshness");
  }
  if (hasWrongFamilyBlocker(row) || row.owner_review_readiness === "SUPERSESSION_REVIEW") {
    rules.push("wrong_family_validation");
  }
  if (stage === "READY_FOR_APPLY") {
    rules.push("one_at_a_time_apply");
  }
  if (stage === "APPLIED" || stage === "REAUDIT_DUE") {
    rules.push("reaudit_after_apply");
  }
  return rules;
}

function nextExecutableActionForSlug(args: {
  row: ManufacturerRescueOrchestratorQueueRowV1;
  stage: ManufacturerRescueRunnerStageV1;
  readyForApplySlug: string | null;
}): string {
  const { row, stage, readyForApplySlug } = args;

  switch (stage) {
    case "COMPLETE":
      return "No action — reference lane complete; buyer path already repo-proven.";
    case "BLOCKED":
      return `Parked — resolve blockers before any capture or apply: ${row.blocked_reasons.join(", ") || "UNKNOWN"}.`;
    case "DISCOVER":
      return `Discover official manufacturer PDP via adapter — ${row.recommended_next_action}`;
    case "BROWSER_PROOF":
      if (browserProofStaleOrMissing(row)) {
        return "Refresh on-disk browser proof artifact (PASS required) before owner review or apply.";
      }
      return `Run read-only browser proof capture — ${row.recommended_next_action}`;
    case "OWNER_REVIEW":
      if (isManufacturerRescueGuardedApplyCandidateV1(row) && readyForApplySlug !== row.filter_slug) {
        return "Owner review complete — waiting for one-at-a-time READY_FOR_APPLY slot (another slug holds apply turn).";
      }
      if (hasWrongFamilyBlocker(row)) {
        return "Owner must complete wrong-family / confusion-family validation before apply.";
      }
      return `Owner review — ${row.recommended_next_action}`;
    case "READY_FOR_APPLY":
      return "Single guarded apply slot — owner-approved CSV apply executor may run for this slug only; re-audit required immediately after apply.";
    case "APPLIED":
      return "Apply detected in repo CSV — hold until post-apply re-audit checklist runs; do not claim coverage unlocked.";
    case "REAUDIT_DUE":
      return "Re-run orchestrator + director + model correctness audit after apply; parity UNKNOWN until validation passes.";
    default:
      return row.recommended_next_action;
  }
}

function isExecutableNow(stage: ManufacturerRescueRunnerStageV1): boolean {
  return (
    stage === "READY_FOR_APPLY" ||
    stage === "BROWSER_PROOF" ||
    stage === "OWNER_REVIEW" ||
    stage === "DISCOVER" ||
    stage === "REAUDIT_DUE"
  );
}

function compareSlugStates(a: ManufacturerRescueRunnerSlugStateV1, b: ManufacturerRescueRunnerSlugStateV1): number {
  const stageDiff =
    MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[a.stage] -
    MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[b.stage];
  if (stageDiff !== 0) return stageDiff;
  if (b.director_value_score !== a.director_value_score) {
    return b.director_value_score - a.director_value_score;
  }
  if (a.manufacturer_key !== b.manufacturer_key) {
    return a.manufacturer_key.localeCompare(b.manufacturer_key);
  }
  return a.filter_slug.localeCompare(b.filter_slug);
}

function buildBlockerSummary(
  slugStates: ManufacturerRescueRunnerSlugStateV1[],
): ManufacturerRescueRunnerReportV1["blocker_summary"] {
  const byReason = new Map<string, string[]>();
  for (const state of slugStates) {
    if (state.stage === "COMPLETE") continue;
    for (const reason of state.blocked_reasons) {
      const list = byReason.get(reason) ?? [];
      list.push(state.filter_slug);
      byReason.set(reason, list);
    }
  }
  return Array.from(byReason.entries())
    .map(([reason, slugs]) => ({
      reason,
      slug_count: slugs.length,
      example_slugs: Array.from(new Set(slugs)).sort().slice(0, 5),
    }))
    .sort((a, b) => b.slug_count - a.slug_count || a.reason.localeCompare(b.reason));
}

function buildManufacturerWorkloads(
  slugStates: ManufacturerRescueRunnerSlugStateV1[],
): ManufacturerRescueRunnerManufacturerWorkloadV1[] {
  const byMfg = new Map<string, ManufacturerRescueRunnerSlugStateV1[]>();
  for (const state of slugStates) {
    const list = byMfg.get(state.manufacturer_key) ?? [];
    list.push(state);
    byMfg.set(state.manufacturer_key, list);
  }

  const workloads: ManufacturerRescueRunnerManufacturerWorkloadV1[] = [];
  for (const [manufacturer_key, states] of Array.from(byMfg.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const stage_counts = Object.fromEntries(
      MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1.map((s) => [s, 0]),
    ) as Record<ManufacturerRescueRunnerStageV1, number>;
    let remaining = 0;
    let browserHours = 0;
    for (const state of states) {
      stage_counts[state.stage] += 1;
      if (state.stage !== "COMPLETE" && state.stage !== "BLOCKED") {
        remaining += 1;
      }
      if (state.stage === "BROWSER_PROOF" || state.stage === "DISCOVER") {
        browserHours += BROWSER_HOURS_PER_SLUG_ESTIMATE_V1[manufacturer_key] ?? 0.5;
      }
    }
    const activeStages = MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1.filter(
      (s) => s !== "COMPLETE" && s !== "BLOCKED" && stage_counts[s] > 0,
    ).sort(
      (a, b) =>
        stage_counts[b] - stage_counts[a] ||
        MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[a] - MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[b],
    );
    workloads.push({
      manufacturer_key,
      remaining_slug_count: remaining,
      stage_counts,
      estimated_browser_hours_remaining: Math.round(browserHours * 100) / 100,
      bottleneck_stage: activeStages[0] ?? "UNKNOWN",
    });
  }
  return workloads;
}

function buildBottlenecks(
  slugStates: ManufacturerRescueRunnerSlugStateV1[],
): ManufacturerRescueRunnerBottleneckV1[] {
  const byStage = new Map<ManufacturerRescueRunnerStageV1, ManufacturerRescueRunnerSlugStateV1[]>();
  for (const state of slugStates) {
    if (state.stage === "COMPLETE") continue;
    const list = byStage.get(state.stage) ?? [];
    list.push(state);
    byStage.set(state.stage, list);
  }

  return Array.from(byStage.entries())
    .map(([stage, states]) => {
      const blockerCounts = new Map<string, number>();
      for (const state of states) {
        for (const reason of state.blocked_reasons) {
          blockerCounts.set(reason, (blockerCounts.get(reason) ?? 0) + 1);
        }
      }
      const dominant =
        Array.from(blockerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "NONE";
      return {
        bottleneck_id: `bottleneck_${stage.toLowerCase()}`,
        stage,
        slug_count: states.length,
        dominant_blocker: dominant,
        example_slugs: states
          .slice()
          .sort(compareSlugStates)
          .slice(0, 5)
          .map((s) => s.filter_slug),
      };
    })
    .sort(
      (a, b) =>
        b.slug_count - a.slug_count ||
        MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[a.stage] -
          MANUFACTURER_RESCUE_RUNNER_STAGE_ORDER_V1[b.stage],
    );
}

export function buildManufacturerSafeLinkRescueRunnerFromInputsV1(args: {
  directorLane: ManufacturerSafeLinkRescueDirectorCommandCenterLaneV1;
  orchestrator: ManufacturerRescueOrchestratorReportV1;
  now?: () => Date;
}): ManufacturerRescueRunnerReportV1 {
  const now = args.now ?? (() => new Date());
  const directorLane = args.directorLane;
  const orchestrator = args.orchestrator;

  const readyForApplySlug = (() => {
    for (const ranked of directorLane.guarded_apply_queue) {
      const row = orchestrator.unified_rescue_queue.find(
        (r) => r.filter_slug === ranked.filter_slug,
      );
      if (
        row &&
        isManufacturerRescueGuardedApplyCandidateV1(row) &&
        !browserProofStaleOrMissing(row)
      ) {
        return row.filter_slug;
      }
    }
    return null;
  })();

  const slugStates: ManufacturerRescueRunnerSlugStateV1[] = orchestrator.unified_rescue_queue.map(
    (row) => {
      const stage = deriveManufacturerRescueRunnerStageV1({ row, readyForApplySlug });
      const director_value_score = computeDirectorValueScoreV1(row);
      return {
        filter_slug: row.filter_slug,
        manufacturer_key: row.manufacturer_key,
        oem_part_token: row.oem_part_token,
        stage,
        execution_rank: 0,
        next_executable_action: nextExecutableActionForSlug({ row, stage, readyForApplySlug }),
        executable_now: isExecutableNow(stage),
        blocked_reasons: row.blocked_reasons,
        trust_risk: assessSlugTrustRiskV1(row),
        director_value_score,
        boardy_safety_rules: boardySafetyRulesForStage(stage, row),
        orchestrator_recommended_next_action: row.recommended_next_action,
        coverage_unlocked: false,
      };
    },
  );

  slugStates.sort(compareSlugStates);
  slugStates.forEach((state, index) => {
    state.execution_rank = index + 1;
  });

  const execution_order = slugStates.map((s) => s.filter_slug);
  const nextExecutable = slugStates.find((s) => s.executable_now)?.filter_slug ?? "UNKNOWN";

  const readyForApplyCount = slugStates.filter((s) => s.stage === "READY_FOR_APPLY").length;

  return {
    contract: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1,
    ...READ_ONLY_MUTATION_FLAGS_V1,
    browser_automation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_SOURCE_COMMAND_V1,
    director_cc_lane_contract: MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1,
    director_source_path: directorLane.director_artifact_path,
    orchestrator_source_path: directorLane.orchestrator_artifact_path,
    director_generated_at: directorLane.generated_at,
    orchestrator_generated_at: directorLane.orchestrator_generated_at,
    ready_for_apply_slug: readyForApplySlug,
    ready_for_apply_enforced: true,
    slug_states: slugStates,
    execution_order,
    manufacturer_workloads: buildManufacturerWorkloads(slugStates),
    bottlenecks: buildBottlenecks(slugStates),
    blocker_summary: buildBlockerSummary(slugStates),
    boardy_safety_contract: {
      browser_proof_freshness_required: true,
      wrong_family_validation_required: true,
      one_at_a_time_apply_enforced: true,
      reaudit_after_apply_required: true,
    },
    post_apply_validation_checklist: [
      "Re-run npm run buckparts:manufacturer-safe-link-rescue-orchestrator",
      "Re-run npm run buckparts:manufacturer-safe-link-rescue-director",
      "Re-run npm run buckparts:manufacturer-safe-link-rescue-runner",
      "Re-run model_filter_correctness_audit_v1 for applied slug parity",
      "Confirm csv_primary_is_search_placeholder=false only after owner approval packet",
      "Do not set coverage_unlocked=true from runner or director artifacts",
    ],
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: ".command_center_v2.manufacturer_safe_link_rescue_runner_v1",
        ready_for_apply_slug: ".ready_for_apply_slug",
        execution_order: ".execution_order",
      },
      next_executable_slug: nextExecutable,
      ready_for_apply_slug: readyForApplySlug,
      remaining_opportunity: directorLane.remaining_opportunity,
      recommended_next_action:
        readyForApplySlug !== null
          ? `READY_FOR_APPLY slot held by ${readyForApplySlug} — guarded apply executor only; re-audit after apply.`
          : directorLane.recommended_next_action,
    },
    proven_facts: [
      "PROVEN: Runner is read-only — no CSV, Supabase, SQL, or browser automation authorized.",
      `PROVEN: ready_for_apply_enforced=true with ${String(readyForApplyCount)} slug(s) in READY_FOR_APPLY (max 1).`,
      "PROVEN: Boardy safety contract requires browser proof freshness, wrong-family validation, one-at-a-time apply, and re-audit after apply.",
      `PROVEN: Consumed Command Center director lane ${MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_CONTRACT_V1}.`,
      `PROVEN: Orchestrator contract ${orchestrator.contract} with ${String(orchestrator.unified_rescue_queue.length)} unified queue rows.`,
    ],
    unknown_facts: [
      ...directorLane.unknown_facts,
      "UNKNOWN: Live production buyer path parity until post-apply validation checklist completes.",
    ],
  };
}

export function buildManufacturerSafeLinkRescueRunnerV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): ManufacturerRescueRunnerReportV1 {
  const directorLane = buildManufacturerSafeLinkRescueDirectorCommandCenterLaneV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  const { orchestrator } = loadManufacturerRescueOrchestratorInputV1({
    rootDir: args.rootDir,
    now: args.now,
    fileExists: args.fileExists,
    readTextFile: args.readTextFile,
  });
  return buildManufacturerSafeLinkRescueRunnerFromInputsV1({
    directorLane,
    orchestrator,
    now: args.now,
  });
}

export function buildManufacturerSafeLinkRescueRunnerBoardMarkdownV1(
  report: ManufacturerRescueRunnerReportV1,
): string {
  const lines = [
    "# Manufacturer safe-link rescue runner board v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- director_generated_at: **${report.director_generated_at}**`,
    `- orchestrator_generated_at: **${report.orchestrator_generated_at}**`,
    `- ready_for_apply_slug: **${report.ready_for_apply_slug ?? "NONE"}**`,
    `- remaining_opportunity: **${String(report.inspect_summary.remaining_opportunity)}**`,
    "",
    "## Boardy safety contract",
    "",
    "- browser proof freshness required before owner review / apply",
    "- wrong-family validation required when confusion-family blockers present",
    "- exactly one READY_FOR_APPLY candidate at a time",
    "- re-audit begins immediately after apply",
    "",
    "## Execution order (top 15)",
    "",
  ];

  for (const slug of report.execution_order.slice(0, 15)) {
    const state = report.slug_states.find((s) => s.filter_slug === slug);
    if (!state) continue;
    lines.push(
      `${String(state.execution_rank)}. \`${slug}\` — **${state.stage}** (${state.manufacturer_key})`,
      `   - ${state.next_executable_action}`,
      "",
    );
  }

  lines.push("## Stage counts", "");
  const stageCounts = Object.fromEntries(
    MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1.map((s) => [s, 0]),
  ) as Record<ManufacturerRescueRunnerStageV1, number>;
  for (const state of report.slug_states) {
    stageCounts[state.stage] += 1;
  }
  for (const stage of MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_STAGES_V1) {
    lines.push(`- ${stage}: **${String(stageCounts[stage])}**`);
  }

  lines.push("", "## Manufacturer workloads", "");
  for (const workload of report.manufacturer_workloads) {
    lines.push(
      `### ${workload.manufacturer_key}`,
      "",
      `- remaining_slug_count: **${String(workload.remaining_slug_count)}**`,
      `- bottleneck_stage: **${workload.bottleneck_stage}**`,
      `- estimated_browser_hours_remaining: **${String(workload.estimated_browser_hours_remaining)}**`,
      "",
    );
  }

  lines.push("## Bottlenecks", "");
  for (const bottleneck of report.bottlenecks.slice(0, 5)) {
    lines.push(
      `- **${bottleneck.stage}** (${String(bottleneck.slug_count)} slugs) — dominant blocker: \`${bottleneck.dominant_blocker}\``,
      `  - examples: ${bottleneck.example_slugs.map((s) => `\`${s}\``).join(", ")}`,
    );
  }

  lines.push("", "## Post-apply validation checklist", "");
  for (const item of report.post_apply_validation_checklist) {
    lines.push(`- ${item}`);
  }

  lines.push("", "## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return `${lines.join("\n")}\n`;
}

export function writeManufacturerSafeLinkRescueRunnerArtifactsV1(args: {
  rootDir: string;
  report: ManufacturerRescueRunnerReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildManufacturerSafeLinkRescueRunnerBoardMarkdownV1(args.report), "utf8");
  return {
    jsonRelPath: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
    mdRelPath: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
  };
}

export function loadManufacturerRescueRunnerReportV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): {
  report: ManufacturerRescueRunnerReportV1;
  runner_source_path: string;
  runner_board_source_path: string;
} | null {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((abs: string) => readFileSync(abs, "utf8"));
  const jsonAbs = path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1);
  if (!fileExists(jsonAbs)) return null;
  try {
    const parsed = JSON.parse(readTextFile(jsonAbs)) as ManufacturerRescueRunnerReportV1;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_CONTRACT_V1) return null;
    return {
      report: parsed,
      runner_source_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
      runner_board_source_path: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_BOARD_MD_REL_V1,
    };
  } catch {
    return null;
  }
}
