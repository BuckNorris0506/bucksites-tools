/**
 * Command Center batch production operating checklist v1 — read-only director of operations.
 * Inspects on-disk lane artifacts; does not mutate CSV, Supabase, or production.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import { buildAirPurifierAgentResultsAggregatorV1Report } from "./air-purifier-agent-results-aggregator-v1";
import {
  AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1,
  AP_BATCH_V2_DIRECT_BUY_SLUGS_V1,
  AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1,
} from "./air-purifier-apply-planner-batch-v2-v1";
import {
  AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1,
  AP_APPLY_RUN_BATCH_V2_DEFAULT_JSON_V1,
  AP_APPLY_PLAN_ACCEPTED_REPORT_NAMES_V1,
} from "./air-purifier-apply-executor-v1";
import type { AirPurifierApplyPlannerReportV1, ApPlannedChangeV1, ApRetailerLinkCsvRowV1 } from "./air-purifier-apply-planner-v1";
import { AP_RETAILER_LINKS_CSV_REL_V1, loadApRetailerLinksCsvV1 } from "./air-purifier-apply-planner-v1";
import {
  AP_SUPABASE_PARITY_ACCEPTED_REPORT_NAMES_V1,
  validateApSupabaseParityPlanV1,
} from "./air-purifier-supabase-apply-parity-v1";

export const BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1 =
  "batch_production_operating_checklist_v1" as const;

export const BATCH_PRODUCTION_PROVEN_RUN_CONTRACT_V1 = "batch_production_proven_run_v1" as const;

export const BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1 =
  "data/air-purifier/batch-production/run-registry/ap-batch-v2-proven-run-v1.json" as const;

export const BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1 = [
  "lane_selected",
  "packets_generated",
  "evidence_collected",
  "aggregator_reviewed",
  "apply_plan_ready",
  "csv_apply_complete",
  "repo_validation_complete",
  "supabase_parity_dry_run_ready",
  "supabase_parity_applied",
  "production_runtime_smoke_complete",
  "closeout_complete",
] as const;

export const BATCH_PRODUCTION_STAGE_OWNER_CATALOG_V1: Record<
  BatchProductionChecklistStageIdV1,
  { stage_label: string; required_proof: string; what_must_be_built_if_missing: string }
> = {
  lane_selected: {
    stage_label: "Batch lane selected",
    required_proof: "Proven run registry names wedge + lane label",
    what_must_be_built_if_missing: "Add a run-registry JSON before opening a new batch lane.",
  },
  packets_generated: {
    stage_label: "Agent packets generated",
    required_proof: "Packets manifest on disk with packet_count > 0",
    what_must_be_built_if_missing: "Generate Codex/agent packets for the batch slugs.",
  },
  evidence_collected: {
    stage_label: "Browser evidence collected",
    required_proof: "Results JSON rows meet registry expected_evidence_row_count",
    what_must_be_built_if_missing: "Collect browser-truth evidence for every planned slug.",
  },
  aggregator_reviewed: {
    stage_label: "Aggregator reviewed",
    required_proof: "Aggregator valid rows + apply plan artifact present",
    what_must_be_built_if_missing: "Run aggregator review and produce apply plan JSON.",
  },
  apply_plan_ready: {
    stage_label: "Apply plan owner-ready",
    required_proof: "Plan status READY_FOR_OWNER_APPROVAL with planned_changes",
    what_must_be_built_if_missing: "Finish planner until plan is owner-review ready.",
  },
  csv_apply_complete: {
    stage_label: "CSV apply executed",
    required_proof: "Apply-run artifact with apply_status APPLIED",
    what_must_be_built_if_missing: "Run CSV apply executor after owner approval.",
  },
  repo_validation_complete: {
    stage_label: "Repo validation passed",
    required_proof: "post_apply_validation: direct_buyable, target-only, no search URLs",
    what_must_be_built_if_missing: "Fix apply-run validation failures before parity or smoke.",
  },
  supabase_parity_dry_run_ready: {
    stage_label: "Supabase parity dry-run ready",
    required_proof: "validateApSupabaseParityPlanV1 returns zero reasons",
    what_must_be_built_if_missing: "Fix plan parity blockers before any Supabase apply.",
  },
  supabase_parity_applied: {
    stage_label: "Supabase parity applied",
    required_proof: "Committed read-only Supabase parity apply-run JSON in repo",
    what_must_be_built_if_missing: "Ingest durable parity apply proof — dry-run alone is not enough.",
  },
  production_runtime_smoke_complete: {
    stage_label: "Production runtime smoke",
    required_proof: "Live or artifact gate_by_slug shows no buy/go gate failures",
    what_must_be_built_if_missing: "Run production smoke on applied slugs before scaling batch size.",
  },
  closeout_complete: {
    stage_label: "Return to expansion loop",
    required_proof: "Operator closeout marked in registry — growth mode ready, not a permanent finish",
    what_must_be_built_if_missing: "Mark closeout when this batch cycle is logged — then pick next wedge or batch size.",
  },
};

export type BatchProductionChecklistStageIdV1 =
  (typeof BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1)[number];

export type BatchProductionChecklistStageStatusV1 =
  | "complete"
  | "pending"
  | "blocked"
  | "unknown";

export type BatchProductionSafetyClassificationV1 =
  | "SAFE_PRIMARY_MATCH"
  | "SAFE_MULTIPLE_BUY_PATHS"
  | "SAFE_BUT_PRIMARY_POLICY_UNKNOWN"
  | "CSV_DB_PARITY_DRIFT"
  | "UNSAFE_OR_STALE"
  | "OWNER_REVIEW_REQUIRED"
  | "CATALOG_TASK_REQUIRED";

export type BatchProductionSetbackDetectorIdV1 =
  | "planned_rows_spent_post_apply"
  | "tests_expect_pre_apply_after_apply"
  | "production_safe_cta_differs_from_applied_row"
  | "supabase_parity_rejects_valid_report_name"
  | "local_csv_supabase_disagree";

export type BatchProductionProvenRunRegistryV1 = {
  contract: typeof BATCH_PRODUCTION_PROVEN_RUN_CONTRACT_V1;
  read_only?: boolean;
  data_mutation?: boolean;
  run_id: string;
  wedge: string;
  lane_label: string;
  proven_at?: string;
  closeout_complete?: boolean;
  expected_evidence_row_count?: number;
  expected_auto_apply_slugs?: string[];
  artifact_paths: Record<string, string>;
  operator_lessons?: string[];
};

export type BatchProductionChecklistStageV1 = {
  stage_id: BatchProductionChecklistStageIdV1;
  status: BatchProductionChecklistStageStatusV1;
  stage_label: string;
  required_proof: string;
  what_must_be_built_if_missing: string;
  evidence: string[];
  blocker_reasons: string[];
};

export type BatchProductionSlugSafetyV1 = {
  filter_slug: string;
  classifications: BatchProductionSafetyClassificationV1[];
  notes: string[];
};

export type BatchProductionSetbackV1 = {
  detector_id: BatchProductionSetbackDetectorIdV1;
  display_name: string;
  fired: boolean;
  severity: "info" | "warning" | "stop_the_line";
  message: string;
  recommended_fix: string;
  proof: string[];
};

export type BatchProductionChecklistRunV1 = {
  run_id: string;
  lane_label: string;
  wedge: string;
  registry_path: string;
  stages: BatchProductionChecklistStageV1[];
  safety_by_slug: BatchProductionSlugSafetyV1[];
  setbacks: BatchProductionSetbackV1[];
  operator_lessons: string[];
  next_blocked_stage: BatchProductionChecklistStageIdV1 | null;
  may_mutate: false;
  read_only: true;
  data_mutation: false;
};

export type BatchProductionOperatingChecklistRuntimeStatusV1 = "OK" | "ATTENTION" | "BLOCKED";

export const BATCH_PRODUCTION_PROOF_UNKNOWN_STAGE_IDS_V1 = [
  "supabase_parity_applied",
  "production_runtime_smoke_complete",
] as const satisfies readonly BatchProductionChecklistStageIdV1[];

export const BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1 =
  "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json" as const;

export const BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1 =
  "npx tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.batch_production_operating_checklist_v1.operating_decision'" as const;

export const BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1 = "data/command-center/dispatch-runs" as const;

export type BatchProductionChecklistSetbacksSummaryV1 = {
  all: BatchProductionSetbackV1[];
  fired: BatchProductionSetbackV1[];
  fired_ids: BatchProductionSetbackDetectorIdV1[];
};

export type BatchProductionOperatingDecisionV1 = {
  contract: "batch_production_operating_decision_v1";
  read_only: true;
  data_mutation: false;
  active_run_id: string | null;
  current_stage: BatchProductionChecklistStageIdV1 | null;
  runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1;
  mutation_allowed: false;
  owner_action_required: boolean;
  blocking_reasons: string[];
  next_exact_command: string;
  next_owner_action: string;
  next_agent_action: string;
  proof_required_before_next_stage: string;
};

export type BatchProductionChecklistDirectorOverrideV1 = {
  next_best_action: string;
  why_this_action: string;
  next_move_command: string;
  mutation_allowed: false;
  mutation_block_reasons: string[];
};

export type BatchProductionExpansionReadinessV1 = {
  contract: "batch_production_expansion_readiness_v1";
  read_only: true;
  ready_to_add_products_or_wedges: boolean | "unknown";
  summary: string;
  blockers_outranking_expansion: string[];
};

export type BatchProductionOperatingChecklistV1 = {
  contract: typeof BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_mutate: false;
  generated_at: string;
  runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1;
  active_run_id: string | null;
  /** Director view — promoted from active run for jq/Command Center consumers. */
  stages: BatchProductionChecklistStageV1[];
  setbacks: BatchProductionChecklistSetbacksSummaryV1;
  operating_decision: BatchProductionOperatingDecisionV1;
  expansion_readiness: BatchProductionExpansionReadinessV1;
  proven_historical_run_ids: string[];
  runs: BatchProductionChecklistRunV1[];
  setback_detectors_catalog: BatchProductionSetbackDetectorIdV1[];
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildBatchProductionOperatingChecklistDepsV1 = {
  rootDir: string;
  generated_at?: string;
  registryPaths?: string[];
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
  listDir?: (absPath: string) => string[];
  /** When false, skip reading data/command-center/dispatch-runs for parity proof (isolated tests). */
  ingest_dispatch_run_parity_proof?: boolean;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function defaultListDir(absPath: string): string[] {
  try {
    return readdirSync(absPath);
  } catch {
    return [];
  }
}

function relToAbs(rootDir: string, rel: string): string {
  return path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
}

function parseJsonSafe<T>(text: string, label: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function tryLoadLatestParityDispatchRunProofV1(
  ctx: StageEvalContextV1,
  dispatchRunsDirRel: string = BATCH_PRODUCTION_DISPATCH_RUNS_DIR_REL_V1,
): { artifact_rel_path: string; apply_status: string } | null {
  const dirRel = dispatchRunsDirRel;
  const dirAbs = relToAbs(ctx.rootDir, dirRel);
  if (!ctx.fileExists(dirAbs)) return null;

  const names = ctx
    .listDir(dirAbs)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .reverse();

  for (const name of names) {
    const rel = `${dirRel}/${name}`;
    const abs = path.join(dirAbs, name);
    const parsed = parseJsonSafe<{
      report_name?: string;
      execution_status?: string;
      execution_allowed?: boolean;
      exact_command?: string;
      blocked_reasons?: string[];
      parsed_json_summary?: any;
    }>(ctx.readText(abs), rel);
    if (!parsed) continue;
    if (parsed.report_name !== "buckparts_command_center_dispatch_run_v1") continue;
    if (parsed.execution_allowed !== true) continue;
    if (parsed.execution_status !== "EXECUTED") continue;
    if ((parsed.blocked_reasons ?? []).length > 0) continue;
    if (
      parsed.exact_command !==
      "npx tsx scripts/apply-air-purifier-supabase-parity-v1.ts --plan data/air-purifier/batch-production/apply-plans-batch-v2/ap-apply-plan-batch-v2.json"
    ) {
      continue;
    }
    const apply_status = String(parsed.parsed_json_summary?.apply_status ?? "");
    if (apply_status === "APPLIED" || apply_status === "ALREADY_APPLIED") {
      return { artifact_rel_path: rel, apply_status };
    }
  }
  return null;
}

function normRowField(row: ApRetailerLinkCsvRowV1, key: string): string {
  return (row[key] ?? "").trim();
}

function rowIsDirectBuyableSafe(row: ApRetailerLinkCsvRowV1): boolean {
  const dest = normRowField(row, "destination_url");
  const classification = normRowField(row, "browser_truth_classification").toLowerCase();
  if (classification !== "direct_buyable") return false;
  if (!dest) return false;
  return !isManufacturerSiteSearchUrl(dest);
}

function rowsForSlug(csvRows: ApRetailerLinkCsvRowV1[], slug: string): ApRetailerLinkCsvRowV1[] {
  return csvRows.filter((r) => normRowField(r, "filter_slug") === slug);
}

function csvRowMatchesSnapshot(row: ApRetailerLinkCsvRowV1, snapshot: ApRetailerLinkCsvRowV1): boolean {
  const keys = Array.from(new Set([...Object.keys(row), ...Object.keys(snapshot)]));
  for (const key of keys) {
    if (normRowField(row, key) !== normRowField(snapshot, key)) return false;
  }
  return true;
}

export function classifySlugSafetyV1(
  slug: string,
  csvRows: ApRetailerLinkCsvRowV1[],
  options?: { plannedChange?: ApPlannedChangeV1 | null },
): BatchProductionSlugSafetyV1 {
  const rows = rowsForSlug(csvRows, slug);
  const classifications = new Set<BatchProductionSafetyClassificationV1>();
  const notes: string[] = [];

  const safeRows = rows.filter(rowIsDirectBuyableSafe);
  const amazonRows = rows.filter((r) => normRowField(r, "retailer_key") === "amazon");
  const oemPrimary = rows.find(
    (r) => normRowField(r, "retailer_key") === "oem-catalog" && normRowField(r, "is_primary") === "true",
  );
  const searchOem = rows.find(
    (r) =>
      normRowField(r, "retailer_key") === "oem-catalog" &&
      isManufacturerSiteSearchUrl(normRowField(r, "destination_url")),
  );

  if (rows.length === 0) {
    classifications.add("UNSAFE_OR_STALE");
    notes.push("No retailer_links.csv row for slug.");
  } else if (safeRows.length === 0) {
    if (searchOem) {
      classifications.add("UNSAFE_OR_STALE");
      notes.push("OEM row still search-placeholder or non-direct_buyable.");
    } else {
      classifications.add("UNSAFE_OR_STALE");
      notes.push("No direct_buyable safe path in CSV.");
    }
  } else if (safeRows.length === 1 && oemPrimary && rowIsDirectBuyableSafe(oemPrimary)) {
    classifications.add("SAFE_PRIMARY_MATCH");
    notes.push("Single safe path: primary oem-catalog is direct_buyable.");
  } else if (safeRows.length >= 2 || (safeRows.length >= 1 && amazonRows.length > 0)) {
    classifications.add("SAFE_MULTIPLE_BUY_PATHS");
    notes.push("Multiple retailer rows and/or multiple safe destinations for slug.");
    if (oemPrimary && rowIsDirectBuyableSafe(oemPrimary) && amazonRows.length > 0) {
      classifications.add("SAFE_BUT_PRIMARY_POLICY_UNKNOWN");
      notes.push(
        "INFERRED: production /go primary CTA may still prefer an existing Amazon safe row even after OEM coverage apply.",
      );
    }
  } else {
    classifications.add("SAFE_BUT_PRIMARY_POLICY_UNKNOWN");
    notes.push("Safe path exists but primary oem-catalog direct_buyable alignment is unclear.");
  }

  const change = options?.plannedChange;
  if (change) {
    const beforeSearch = isManufacturerSiteSearchUrl(normRowField(change.before_row, "destination_url"));
    const afterDirect = rowIsDirectBuyableSafe(change.after_row);
    if (beforeSearch && afterDirect) {
      notes.push("PROVEN: batch apply moved OEM row from search placeholder to direct_buyable (coverage added).");
      if (amazonRows.length > 0) {
        classifications.add("SAFE_BUT_PRIMARY_POLICY_UNKNOWN");
        notes.push("LESSON: coverage added ≠ primary CTA changed on production when Amazon safe row already exists.");
      }
    }
  }

  if (slug.includes("blueair") && !classifications.has("SAFE_PRIMARY_MATCH")) {
    classifications.add("CATALOG_TASK_REQUIRED");
    notes.push("Blueair catalog identity must be resolved before buyer-path mutation.");
  }

  return {
    filter_slug: slug,
    classifications: Array.from(classifications),
    notes,
  };
}

type ApplyRunShapeV1 = {
  apply_status?: string;
  planned_change_count?: number;
  applied_change_count?: number;
  post_apply_validation?: {
    all_direct_buyable?: boolean;
    only_target_slugs_changed?: boolean;
    no_search_urls_on_targets?: boolean;
    gate_by_slug?: Record<string, { gate_failure_kind?: string | null }>;
  };
};

type StageEvalContextV1 = {
  rootDir: string;
  registry: BatchProductionProvenRunRegistryV1;
  registryPath: string;
  fileExists: (p: string) => boolean;
  readText: (p: string) => string;
  listDir: (p: string) => string[];
  csvRows: ApRetailerLinkCsvRowV1[];
  plan: AirPurifierApplyPlannerReportV1 | null;
  applyRun: ApplyRunShapeV1 | null;
  evidenceRowCount: number;
  aggregatorRowCount: number;
  ingest_dispatch_run_parity_proof: boolean;
};

function evaluateStagesV1(ctx: StageEvalContextV1): BatchProductionChecklistStageV1[] {
  const paths = ctx.registry.artifact_paths;
  const stages: BatchProductionChecklistStageV1[] = [];

  const push = (
    stage_id: BatchProductionChecklistStageIdV1,
    status: BatchProductionChecklistStageStatusV1,
    evidence: string[],
    blocker_reasons: string[] = [],
  ) => {
    const meta = BATCH_PRODUCTION_STAGE_OWNER_CATALOG_V1[stage_id];
    stages.push({
      stage_id,
      status,
      stage_label: meta.stage_label,
      required_proof: meta.required_proof,
      what_must_be_built_if_missing: meta.what_must_be_built_if_missing,
      evidence,
      blocker_reasons,
    });
  };

  push(
    "lane_selected",
    ctx.registry.wedge === "air_purifier" ? "complete" : "blocked",
    [`registry.wedge=${ctx.registry.wedge}`, `lane_label=${ctx.registry.lane_label}`],
    ctx.registry.wedge === "air_purifier" ? [] : ["wedge must be air_purifier for AP batch lane"],
  );

  const manifestRel = paths.packets_manifest ?? "";
  const manifestAbs = relToAbs(ctx.rootDir, manifestRel);
  if (ctx.fileExists(manifestAbs)) {
    const manifest = parseJsonSafe<{ packet_count?: number }>(ctx.readText(manifestAbs), manifestRel);
    const count = manifest?.packet_count ?? 0;
    push(
      "packets_generated",
      count > 0 ? "complete" : "blocked",
      [`${manifestRel} packet_count=${String(count)}`],
      count > 0 ? [] : ["packet_count must be > 0"],
    );
  } else {
    push("packets_generated", "blocked", [], [`missing ${manifestRel}`]);
  }

  const expectedEvidence = ctx.registry.expected_evidence_row_count ?? 0;
  push(
    "evidence_collected",
    ctx.evidenceRowCount >= expectedEvidence && expectedEvidence > 0 ? "complete" : "pending",
    [
      `results_dir row_count=${String(ctx.evidenceRowCount)}`,
      `expected=${String(expectedEvidence)}`,
    ],
    ctx.evidenceRowCount >= expectedEvidence
      ? []
      : [`evidence row count ${ctx.evidenceRowCount} < expected ${expectedEvidence}`],
  );

  push(
    "aggregator_reviewed",
    ctx.aggregatorRowCount > 0 && ctx.plan !== null ? "complete" : "pending",
    [
      `aggregator valid_row_count=${String(ctx.aggregatorRowCount)}`,
      ctx.plan ? `plan.report_name=${ctx.plan.report_name}` : "plan=missing",
    ],
    ctx.plan ? [] : ["apply plan artifact missing"],
  );

  if (ctx.plan) {
    const ready =
      ctx.plan.plan_status === "READY_FOR_OWNER_APPROVAL" &&
      ctx.plan.planned_change_count === (ctx.plan.planned_changes?.length ?? 0) &&
      (ctx.plan.planned_changes?.length ?? 0) > 0;
    push(
      "apply_plan_ready",
      ready ? "complete" : "blocked",
      [
        `plan_status=${ctx.plan.plan_status}`,
        `planned_change_count=${String(ctx.plan.planned_change_count)}`,
      ],
      ready ? [] : ["plan not READY_FOR_OWNER_APPROVAL or planned_changes empty"],
    );
  } else {
    push("apply_plan_ready", "blocked", [], ["apply plan missing"]);
  }

  const runStatus = ctx.applyRun?.apply_status ?? "UNKNOWN";
  push(
    "csv_apply_complete",
    runStatus === "APPLIED" ? "complete" : runStatus === "UNKNOWN" ? "unknown" : "pending",
    [`apply_run.apply_status=${runStatus}`],
    runStatus === "APPLIED" ? [] : ["CSV apply run not APPLIED in artifact"],
  );

  const post = ctx.applyRun?.post_apply_validation;
  const repoOk =
    post?.all_direct_buyable === true &&
    post?.only_target_slugs_changed === true &&
    post?.no_search_urls_on_targets === true;
  push(
    "repo_validation_complete",
    repoOk ? "complete" : ctx.applyRun ? "blocked" : "unknown",
    [
      `all_direct_buyable=${String(post?.all_direct_buyable ?? "UNKNOWN")}`,
      `only_target_slugs_changed=${String(post?.only_target_slugs_changed ?? "UNKNOWN")}`,
    ],
    repoOk ? [] : ["post_apply_validation failed or missing"],
  );

  const parityReasons = ctx.plan ? validateApSupabaseParityPlanV1(ctx.plan) : ["plan missing"];
  push(
    "supabase_parity_dry_run_ready",
    parityReasons.length === 0 ? "complete" : "blocked",
    [`validateApSupabaseParityPlanV1 reasons=${parityReasons.length}`],
    parityReasons,
  );

  push(
    "supabase_parity_applied",
    "unknown",
    ["UNKNOWN: no committed supabase parity apply-run artifact in repo — dry-run contract only PROVEN."],
    [],
  );

  const parityProof = ctx.ingest_dispatch_run_parity_proof
    ? tryLoadLatestParityDispatchRunProofV1(ctx)
    : null;
  if (parityProof) {
    const idx = stages.findIndex((s) => s.stage_id === "supabase_parity_applied");
    if (idx >= 0) {
      stages[idx] = {
        ...stages[idx],
        status: "complete",
        evidence: [
          ...stages[idx]!.evidence,
          `dispatch_run_proof=${parityProof.artifact_rel_path}`,
          `parity_apply_status=${parityProof.apply_status}`,
        ],
      };
    }
  }

  const gates = post?.gate_by_slug ?? {};
  const gateFailures = Object.entries(gates).filter(([, g]) => g?.gate_failure_kind != null);
  push(
    "production_runtime_smoke_complete",
    gateFailures.length === 0 && repoOk ? "complete" : ctx.applyRun ? "blocked" : "unknown",
    [
      `gate_failure_count=${String(gateFailures.length)}`,
      "INFERRED from apply-run post_apply_validation gate_by_slug (not live production fetch).",
    ],
    gateFailures.length > 0 ? gateFailures.map(([s, g]) => `${s}:${g?.gate_failure_kind}`) : [],
  );

  push(
    "closeout_complete",
    ctx.registry.closeout_complete === true ? "complete" : "pending",
    [`registry.closeout_complete=${String(ctx.registry.closeout_complete ?? false)}`],
    ctx.registry.closeout_complete ? [] : ["operator closeout not marked in proven run registry"],
  );

  return stages;
}

export function detectBatchProductionSetbacksV1(args: {
  plan: AirPurifierApplyPlannerReportV1 | null;
  csvRows: ApRetailerLinkCsvRowV1[];
  parityValidationReasons: string[];
  supabaseParityApplyArtifactPresent: boolean;
}): BatchProductionSetbackV1[] {
  const { plan, csvRows, parityValidationReasons, supabaseParityApplyArtifactPresent } = args;
  const setbacks: BatchProductionSetbackV1[] = [];

  let spentCount = 0;
  const spentSlugs: string[] = [];
  for (const change of plan?.planned_changes ?? []) {
    const live = rowsForSlug(csvRows, change.filter_slug).find(
      (r) => normRowField(r, "retailer_key") === normRowField(change.before_row, "retailer_key"),
    );
    if (!live) continue;
    const matchesAfter = csvRowMatchesSnapshot(live, change.after_row);
    const matchesBefore = csvRowMatchesSnapshot(live, change.before_row);
    if (matchesAfter && !matchesBefore) {
      spentCount += 1;
      spentSlugs.push(change.filter_slug);
    }
  }

  setbacks.push({
    detector_id: "planned_rows_spent_post_apply",
    display_name: "Apply plan is post-apply spent",
    fired: spentCount > 0,
    severity: spentCount > 0 ? "warning" : "info",
    message:
      spentCount > 0
        ? `Plan before_row no longer matches CSV for ${spentCount} slug(s) — plan is post-apply spent.`
        : "Plan before_row still matches CSV for planned rows (pre-apply or unapplied).",
    recommended_fix:
      spentCount > 0
        ? "Treat the plan as spent: refresh plan or start a new run registry before re-apply dry-runs."
        : "No action — plan still matches pre-apply CSV rows.",
    proof: spentSlugs.map((s) => `spent:${s}`),
  });

  setbacks.push({
    detector_id: "tests_expect_pre_apply_after_apply",
    display_name: "Tests still expect pre-apply state",
    fired: spentCount > 0,
    severity: "warning",
    message:
      spentCount > 0
        ? "Executor/planner dry-runs and tests that assert pre-apply before_row matches will fail until updated for post-apply state."
        : "No post-apply spent rows detected.",
    recommended_fix:
      spentCount > 0
        ? "Update operator docs and tests for post-apply before_row — do not re-run apply on spent rows."
        : "No action required.",
    proof: spentSlugs.length > 0 ? [`affected_slugs=${spentSlugs.join(",")}`] : [],
  });

  const multiPathApplied: string[] = [];
  for (const change of plan?.planned_changes ?? []) {
    const slugRows = rowsForSlug(csvRows, change.filter_slug);
    const amazon = slugRows.filter((r) => normRowField(r, "retailer_key") === "amazon");
    const oemApplied = rowIsDirectBuyableSafe(change.after_row);
    if (oemApplied && amazon.length > 0) {
      multiPathApplied.push(change.filter_slug);
    }
  }

  setbacks.push({
    detector_id: "production_safe_cta_differs_from_applied_row",
    display_name: "Primary CTA may differ from applied row",
    fired: multiPathApplied.length > 0,
    severity: multiPathApplied.length > 0 ? "warning" : "info",
    message:
      multiPathApplied.length > 0
        ? "Production may render a different safe primary CTA (e.g. Amazon) than the newly applied OEM direct-buy row."
        : "No applied slug with concurrent Amazon row in CSV.",
    recommended_fix:
      multiPathApplied.length > 0
        ? "Verify live /go primary CTA on affected slugs before scaling — safe Amazon path is not an apply failure."
        : "No action required.",
    proof: multiPathApplied.map((s) => `amazon_plus_oem:${s}`),
  });

  const reportName = plan?.report_name ?? "";
  const parityRejectsReportName =
    parityValidationReasons.some((r) => r.includes("unexpected plan report_name")) &&
    AP_APPLY_PLAN_ACCEPTED_REPORT_NAMES_V1.includes(
      reportName as (typeof AP_APPLY_PLAN_ACCEPTED_REPORT_NAMES_V1)[number],
    );

  setbacks.push({
    detector_id: "supabase_parity_rejects_valid_report_name",
    display_name: "Supabase parity rejects valid report name",
    fired: parityRejectsReportName,
    severity: parityRejectsReportName ? "stop_the_line" : "info",
    message: parityRejectsReportName
      ? `Supabase parity rejected accepted report_name ${reportName}.`
      : "Supabase parity accepts planner report_name for loaded plan.",
    recommended_fix: parityRejectsReportName
      ? "Fix parity validator or plan report_name before any Supabase apply."
      : "No action — report_name accepted by parity contract.",
    proof: parityRejectsReportName ? parityValidationReasons : [`report_name=${reportName}`],
  });

  setbacks.push({
    detector_id: "local_csv_supabase_disagree",
    display_name: "CSV vs Supabase drift",
    fired: false,
    severity: "info",
    message: supabaseParityApplyArtifactPresent
      ? "INFERRED: compare parity apply artifact to CSV when present."
      : "UNKNOWN: live Supabase not read — run parity dry-run/apply report to detect CSV_DB_PARITY_DRIFT.",
    recommended_fix: supabaseParityApplyArtifactPresent
      ? "Compare parity apply artifact rows to retailer_links.csv for drift."
      : "Run parity dry-run, then ingest apply proof before trusting production DB parity.",
    proof: [],
  });

  return setbacks;
}

export function summarizeBatchProductionSetbacksV1(
  setbacks: BatchProductionSetbackV1[],
): BatchProductionChecklistSetbacksSummaryV1 {
  const fired = setbacks.filter((s) => s.fired);
  return {
    all: setbacks,
    fired,
    fired_ids: fired.map((s) => s.detector_id),
  };
}

export function resolveDirectorCurrentStageV1(
  stages: BatchProductionChecklistStageV1[],
): BatchProductionChecklistStageIdV1 | null {
  for (const stage_id of BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1) {
    const stage = stages.find((s) => s.stage_id === stage_id);
    if (!stage) continue;
    if (stage.status === "blocked" || stage.status === "pending") return stage_id;
    if (
      stage.status === "unknown" &&
      (BATCH_PRODUCTION_PROOF_UNKNOWN_STAGE_IDS_V1 as readonly string[]).includes(stage_id)
    ) {
      return stage_id;
    }
  }
  return null;
}

export function buildBatchProductionOperatingDecisionV1(args: {
  runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1;
  active_run: BatchProductionChecklistRunV1 | null;
  stages: BatchProductionChecklistStageV1[];
  setbacks: BatchProductionChecklistSetbacksSummaryV1;
}): BatchProductionOperatingDecisionV1 {
  const { runtime_status, active_run, stages, setbacks } = args;
  const current_stage = resolveDirectorCurrentStageV1(stages);
  const parityStage = stages.find((s) => s.stage_id === "supabase_parity_applied");
  const runtimeSmokeStage = stages.find((s) => s.stage_id === "production_runtime_smoke_complete");
  const proofUnknown =
    parityStage?.status === "unknown" || runtimeSmokeStage?.status === "unknown";

  const blocking_reasons: string[] = [];
  if (current_stage) {
    const stage = stages.find((s) => s.stage_id === current_stage);
    blocking_reasons.push(...(stage?.blocker_reasons ?? []));
    if (stage?.status === "unknown") {
      blocking_reasons.push(...stage.evidence.filter((e) => e.startsWith("UNKNOWN:")));
    }
  }
  for (const setback of setbacks.fired) {
    blocking_reasons.push(`${setback.detector_id}: ${setback.message}`);
  }
  if (!args.active_run) {
    blocking_reasons.push("No active batch run loaded from run-registry.");
  }

  const owner_action_required =
    runtime_status !== "OK" || setbacks.fired.length > 0 || proofUnknown || current_stage !== null;

  const runLabel = active_run?.run_id ?? "active batch run";
  let proof_required_before_next_stage =
    "No additional proof required — do not start a new batch lane outside Command Center checklist.";
  let next_exact_command = BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1;
  let next_owner_action =
    "Batch production checklist OK — do not bypass checklist for the next batch lane.";
  let next_agent_action =
    "Do not run CSV apply, Supabase --apply, or new batch scripts outside checklist state.";

  if (current_stage === "supabase_parity_applied" && parityStage?.status === "unknown") {
    proof_required_before_next_stage =
      "Committed read-only Supabase parity apply-run JSON for the active plan (or registry path update) before scaling batch size or opening a new wedge.";
    next_exact_command = BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1;
    next_owner_action = `BATCH CHECKLIST [${runtime_status}]: Ingest durable Supabase parity apply proof for ${runLabel} before the next batch lane — parity applied state is UNKNOWN in repo.`;
    next_agent_action =
      "Do not run Supabase --apply or CSV apply for a new batch. Parity dry-run only when validating a plan: " +
      BATCH_PRODUCTION_PARITY_DRY_RUN_COMMAND_V1;
  } else if (setbacks.fired.some((s) => s.detector_id === "planned_rows_spent_post_apply")) {
    proof_required_before_next_stage =
      "Treat apply plan as post-apply spent; refresh plan or start a new run registry before re-apply dry-runs.";
    next_exact_command = BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1;
    next_owner_action = `BATCH CHECKLIST [${runtime_status}]: ${runLabel} is post-apply spent — do not re-interpret safe Amazon CTAs as apply failure; resolve checklist setbacks before new batch work.`;
    next_agent_action =
      "Do not re-run apply executor on spent before_row. Update tests/operators for post-apply state; run Command Center checklist inspect only.";
  } else if (current_stage) {
    proof_required_before_next_stage = `Clear stage ${current_stage} per checklist evidence before advancing batch production.`;
    next_exact_command = BATCH_PRODUCTION_CHECKLIST_INSPECT_COMMAND_V1;
    next_owner_action = `BATCH CHECKLIST [${runtime_status}]: Resolve stage ${current_stage} for ${runLabel} before starting another batch lane.`;
    next_agent_action =
      "Read-only: inspect checklist operating_decision via Command Center JSON — no CSV/Supabase mutation.";
  } else if (runtime_status !== "OK") {
    next_owner_action = `BATCH CHECKLIST [${runtime_status}]: Follow batch_production_operating_checklist_v1 before any new batch lane.`;
    next_agent_action = next_exact_command;
  }

  const mutation_allowed = false as const;

  return {
    contract: "batch_production_operating_decision_v1",
    read_only: true,
    data_mutation: false,
    active_run_id: active_run?.run_id ?? null,
    current_stage,
    runtime_status,
    mutation_allowed,
    owner_action_required,
    blocking_reasons,
    next_exact_command,
    next_owner_action,
    next_agent_action,
    proof_required_before_next_stage,
  };
}

export function resolveBatchProductionChecklistDirectorOverrideV1(args: {
  checklist: BatchProductionOperatingChecklistV1;
  brainStopTheLine: boolean;
}): BatchProductionChecklistDirectorOverrideV1 | null {
  if (args.brainStopTheLine) return null;
  if (args.checklist.runtime_status === "OK") return null;

  const decision = args.checklist.operating_decision;
  const mutation_block_reasons = [...decision.blocking_reasons];
  if (!decision.mutation_allowed || decision.owner_action_required) {
    mutation_block_reasons.push(
      "Batch production checklist: mutation blocked until proof stages and setbacks are resolved.",
    );
  }

  return {
    next_best_action: decision.next_owner_action,
    why_this_action:
      `Batch production operating checklist directs next action (${args.checklist.runtime_status}). ` +
      decision.blocking_reasons.slice(0, 3).join(" "),
    next_move_command: decision.next_exact_command,
    mutation_allowed: false,
    mutation_block_reasons,
  };
}

export function buildBatchProductionExpansionReadinessV1(args: {
  runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1;
  operating_decision: BatchProductionOperatingDecisionV1;
  setbacks: BatchProductionChecklistSetbacksSummaryV1;
  active_run: BatchProductionChecklistRunV1 | null;
  stages: BatchProductionChecklistStageV1[];
}): BatchProductionExpansionReadinessV1 {
  const { runtime_status, operating_decision, setbacks, active_run, stages } = args;

  if (!active_run) {
    return {
      contract: "batch_production_expansion_readiness_v1",
      read_only: true,
      ready_to_add_products_or_wedges: "unknown",
      summary: "No active batch run loaded — cannot assess expansion readiness.",
      blockers_outranking_expansion: ["No active batch run in run-registry."],
    };
  }

  const blockers_outranking_expansion: string[] = [];
  if (operating_decision.current_stage) {
    const stage = stages.find((s) => s.stage_id === operating_decision.current_stage);
    blockers_outranking_expansion.push(
      `Operating loop at stage: ${stage?.stage_label ?? operating_decision.current_stage}.`,
    );
  }
  for (const setback of setbacks.fired) {
    blockers_outranking_expansion.push(`${setback.display_name}: ${setback.message}`);
  }
  blockers_outranking_expansion.push(...operating_decision.blocking_reasons.slice(0, 4));

  const closeoutStage = stages.find((s) => s.stage_id === "closeout_complete");
  const growthLoopReady =
    runtime_status === "OK" &&
    setbacks.fired.length === 0 &&
    operating_decision.current_stage === null &&
    closeoutStage?.status === "complete";

  if (growthLoopReady) {
    return {
      contract: "batch_production_expansion_readiness_v1",
      read_only: true,
      ready_to_add_products_or_wedges: true,
      summary:
        "Growth mode ready — this batch cycle is closed. Return to the expansion loop to add products or open a new wedge.",
      blockers_outranking_expansion: [],
    };
  }

  if (runtime_status === "BLOCKED") {
    return {
      contract: "batch_production_expansion_readiness_v1",
      read_only: true,
      ready_to_add_products_or_wedges: false,
      summary: "Stop-the-line batch blockers — do not add products or wedges until resolved.",
      blockers_outranking_expansion: Array.from(new Set(blockers_outranking_expansion)).slice(0, 8),
    };
  }

  if (runtime_status === "ATTENTION") {
    return {
      contract: "batch_production_expansion_readiness_v1",
      read_only: true,
      ready_to_add_products_or_wedges: false,
      summary:
        "Not ready to expand — finish the current batch operating loop and clear missing proof before adding products or wedges.",
      blockers_outranking_expansion: Array.from(new Set(blockers_outranking_expansion)).slice(0, 8),
    };
  }

  return {
    contract: "batch_production_expansion_readiness_v1",
    read_only: true,
    ready_to_add_products_or_wedges: false,
    summary: "Batch loop in progress — complete remaining stages before expansion.",
    blockers_outranking_expansion: Array.from(new Set(blockers_outranking_expansion)).slice(0, 8),
  };
}

function countEvidenceRowsV1(
  rootDir: string,
  resultsDirRel: string,
  readText: (p: string) => string,
  listDir: (p: string) => string[],
): number {
  const dirAbs = relToAbs(rootDir, resultsDirRel);
  let total = 0;
  for (const name of listDir(dirAbs)) {
    if (!name.endsWith(".results.json")) continue;
    const parsed = parseJsonSafe<{ rows?: unknown[] }>(readText(path.join(dirAbs, name)), name);
    total += parsed?.rows?.length ?? 0;
  }
  return total;
}

export function buildBatchProductionChecklistRunV1(
  rootDir: string,
  registryPath: string,
  deps: BuildBatchProductionOperatingChecklistDepsV1,
): BatchProductionChecklistRunV1 | null {
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const listDir = deps.listDir ?? defaultListDir;
  const absRegistry = relToAbs(rootDir, registryPath);
  if (!fileExists(absRegistry)) return null;

  const registry = parseJsonSafe<BatchProductionProvenRunRegistryV1>(
    readText(absRegistry),
    registryPath,
  );
  if (!registry || registry.contract !== BATCH_PRODUCTION_PROVEN_RUN_CONTRACT_V1) return null;

  const planRel = registry.artifact_paths.apply_plan ?? AP_APPLY_PLAN_BATCH_V2_DEFAULT_PATH_V1;
  const planAbs = relToAbs(rootDir, planRel);
  const plan = fileExists(planAbs)
    ? parseJsonSafe<AirPurifierApplyPlannerReportV1>(readText(planAbs), planRel)
    : null;

  const applyRunRel = registry.artifact_paths.apply_run ?? AP_APPLY_RUN_BATCH_V2_DEFAULT_JSON_V1;
  const applyRunAbs = relToAbs(rootDir, applyRunRel);
  const applyRun = fileExists(applyRunAbs)
    ? parseJsonSafe<ApplyRunShapeV1>(readText(applyRunAbs), applyRunRel)
    : null;

  const resultsDirRel =
    registry.artifact_paths.results_dir ?? AP_APPLY_PLAN_BATCH_V2_RESULTS_DIR_V1;
  const evidenceRowCount = countEvidenceRowsV1(rootDir, resultsDirRel, readText, listDir);

  let aggregatorRowCount = 0;
  try {
    const agg = buildAirPurifierAgentResultsAggregatorV1Report({
      rootDir,
      resultsDir: resultsDirRel,
    });
    aggregatorRowCount = agg.valid_row_count;
  } catch {
    aggregatorRowCount = 0;
  }

  const csvRows = loadApRetailerLinksCsvV1(rootDir, readText);

  const stageCtx: StageEvalContextV1 = {
    rootDir,
    registry,
    registryPath,
    fileExists,
    readText,
    listDir,
    csvRows,
    plan,
    applyRun,
    evidenceRowCount,
    aggregatorRowCount,
    ingest_dispatch_run_parity_proof: deps.ingest_dispatch_run_parity_proof !== false,
  };
  const stages = evaluateStagesV1(stageCtx);

  const slugsToClassify = new Set<string>([
    ...(registry.expected_auto_apply_slugs ?? []),
    ...(plan?.planned_changes?.map((c) => c.filter_slug) ?? []),
  ]);
  const plannedBySlug = new Map(
    (plan?.planned_changes ?? []).map((c) => [c.filter_slug, c] as const),
  );
  const safety_by_slug = Array.from(slugsToClassify).sort().map((slug) =>
    classifySlugSafetyV1(slug, csvRows, { plannedChange: plannedBySlug.get(slug) ?? null }),
  );

  const parityReasons = plan ? validateApSupabaseParityPlanV1(plan) : ["plan missing"];
  const setbacks = detectBatchProductionSetbacksV1({
    plan,
    csvRows,
    parityValidationReasons: parityReasons,
    supabaseParityApplyArtifactPresent: false,
  });

  const next_blocked_stage = resolveDirectorCurrentStageV1(stages);

  return {
    run_id: registry.run_id,
    lane_label: registry.lane_label,
    wedge: registry.wedge,
    registry_path: registryPath,
    stages,
    safety_by_slug,
    setbacks,
    operator_lessons: registry.operator_lessons ?? [],
    next_blocked_stage,
    may_mutate: false,
    read_only: true,
    data_mutation: false,
  };
}

export function buildBatchProductionOperatingChecklistV1(
  deps: BuildBatchProductionOperatingChecklistDepsV1,
): BatchProductionOperatingChecklistV1 {
  const generated_at = deps.generated_at ?? new Date().toISOString();
  const registryPaths = deps.registryPaths ?? [BATCH_PRODUCTION_CHECKLIST_DEFAULT_REGISTRY_PATH_V1];

  const runs: BatchProductionChecklistRunV1[] = [];
  for (const registryPath of registryPaths) {
    const run = buildBatchProductionChecklistRunV1(deps.rootDir, registryPath, deps);
    if (run) runs.push(run);
  }

  const apRun = runs.find((r) => r.run_id === "ap-batch-v2-2026-05-24") ?? runs[0] ?? null;
  const stages = apRun?.stages ?? [];
  const setbacksSummary = summarizeBatchProductionSetbacksV1(apRun?.setbacks ?? []);
  const firedSetbacks = setbacksSummary.fired;
  const blockedStages = stages.filter((s) => s.status === "blocked");
  const unknownProofStages = stages.filter(
    (s) =>
      s.status === "unknown" &&
      (BATCH_PRODUCTION_PROOF_UNKNOWN_STAGE_IDS_V1 as readonly string[]).includes(s.stage_id),
  );

  let runtime_status: BatchProductionOperatingChecklistRuntimeStatusV1 = "OK";
  if (firedSetbacks.some((s) => s.severity === "stop_the_line")) {
    runtime_status = "BLOCKED";
  } else if (
    firedSetbacks.length > 0 ||
    blockedStages.length > 0 ||
    unknownProofStages.length > 0
  ) {
    runtime_status = "ATTENTION";
  }

  const operating_decision = buildBatchProductionOperatingDecisionV1({
    runtime_status,
    active_run: apRun,
    stages,
    setbacks: setbacksSummary,
  });

  const expansion_readiness = buildBatchProductionExpansionReadinessV1({
    runtime_status,
    operating_decision,
    setbacks: setbacksSummary,
    active_run: apRun,
    stages,
  });

  const recommended_next_action = operating_decision.next_owner_action;

  const proven_facts = [
    `Checklist contract ${BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1} is read-only.`,
    `Stage gate count=${String(BATCH_PRODUCTION_CHECKLIST_STAGE_IDS_V1.length)}.`,
    apRun
      ? `PROVEN historical run ${apRun.run_id}: evidence rows + apply artifacts on disk.`
      : "No proven run registry loaded.",
    `AP batch-v2 direct-buy slugs (repo constant): ${AP_BATCH_V2_DIRECT_BUY_SLUGS_V1.join(", ")}.`,
    `Accepted planner report names include ${AIR_PURIFIER_APPLY_PLANNER_BATCH_V2_REPORT_NAME_V1}.`,
  ];

  const unknown_facts = [
    "UNKNOWN: live production /go primary CTA order without live-site monitor fetch in this builder.",
    "UNKNOWN: Supabase parity apply state without committed parity apply-run artifact.",
  ];

  return {
    contract: BATCH_PRODUCTION_OPERATING_CHECKLIST_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_mutate: false,
    generated_at,
    runtime_status,
    active_run_id: apRun?.run_id ?? null,
    stages,
    setbacks: setbacksSummary,
    operating_decision,
    expansion_readiness,
    proven_historical_run_ids: runs.map((r) => r.run_id),
    runs,
    setback_detectors_catalog: [
      "planned_rows_spent_post_apply",
      "tests_expect_pre_apply_after_apply",
      "production_safe_cta_differs_from_applied_row",
      "supabase_parity_rejects_valid_report_name",
      "local_csv_supabase_disagree",
    ],
    recommended_next_action,
    proven_facts,
    unknown_facts,
  };
}
