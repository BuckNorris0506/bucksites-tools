/**
 * Manufacturer Rescue Guarded Apply Bridge v1 — thin adapter from Readiness Gate READY_FOR_APPLY
 * to universal_batch_lifecycle_guarded_csv_apply_executor_v1. No new CSV mutation engine.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  buildAllProductSafeBuyerPathCensusV1,
  type AllProductSafeBuyerPathCensusV1,
} from "./all-product-safe-buyer-path-census-v1";
import {
  EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_V1,
  refreshBuckpartsExecutionLedgerV1,
  type BuckpartsExecutionLedgerReportV1,
} from "./buckparts-execution-ledger-v1";
import { buildCustomerClosureReportV1, type CustomerClosureReportV1 } from "./customer-closure-report-v1";
import { FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1, FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1,
  manufacturerSafeLinkRescueApplyPlanRelV1,
  type ManufacturerRescueApplyPlanV1,
  type ManufacturerRescueRetailerLinksCsvRowSnapshotV1,
} from "./manufacturer-safe-link-rescue-apply-plan-factory-v1";
import {
  buildManufacturerRescueScoreboardV1,
  buildManufacturerSafeLinkRescueOrchestratorReportV1,
  buildManufacturerRescueOwnerWorkQueueMarkdownV1,
  MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1,
} from "./manufacturer-safe-link-rescue-orchestrator-v1";
import {
  buildManufacturerSafeLinkRescueDirectorReportV1,
  buildManufacturerRescueNextActionsMarkdownV1,
  buildManufacturerRescueRoadmapV1,
  MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1,
  MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1,
} from "./manufacturer-safe-link-rescue-director-v1";
import {
  buildManufacturerRescueThroughputAnalyticsV1,
  writeManufacturerRescueThroughputAnalyticsArtifactsV1,
} from "./manufacturer-rescue-throughput-analytics-v1";
import {
  loadManufacturerRescueRunnerReportV1,
  buildManufacturerSafeLinkRescueRunnerV1,
  MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
  writeManufacturerSafeLinkRescueRunnerArtifactsV1,
} from "./manufacturer-safe-link-rescue-runner-v1";
import {
  buildManufacturerSafeLinkRescueReadinessGateV1,
  loadManufacturerSafeLinkRescueReadinessGateV1,
  MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1,
  writeManufacturerSafeLinkRescueReadinessGateArtifactsV1,
  type ManufacturerRescueReadinessCandidateV1,
  type ManufacturerRescueReadinessGateReportV1,
} from "./manufacturer-safe-link-rescue-readiness-gate-v1";
import {
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1,
  type RetailerLinkCsvRowV1,
  type UniversalBatchLifecycleApplyExecutionPlanRowPatchV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
  type UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1,
  type UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1 =
  "manufacturer_rescue_guarded_apply_bridge_v1" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_CONTRACT_V1 =
  "manufacturer_rescue_guarded_apply_bridge_closeout_v1" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-rescue-guarded-apply-bridge" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_WRITE_SOURCE_COMMAND_V1 =
  "npm run buckparts:manufacturer-rescue-guarded-apply-bridge -- --write-csv" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/closeout/manufacturer-rescue-guarded-apply-bridge-closeout-v1.json" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_WRITE_CSV_FLAG_V1 = "--write-csv" as const;

export const MANUFACTURER_RESCUE_GUARDED_APPLY_REQUIRED_READINESS_CHECKS_V1 = [
  "browser_proof_exists",
  "browser_proof_fresh",
  "apply_plan_exists",
  "owner_approval_exists",
  "owner_apply_lane_eligible",
  "wrong_family_safe",
  "direct_buyable_exact_token_safe",
  "no_unresolved_blockers",
] as const;

export type ManufacturerRescueGuardedApplyBridgeStatusV1 =
  | "DRY_RUN_READY"
  | "APPLIED"
  | "BLOCKED";

export type ManufacturerRescueGuardedApplyBridgePreconditionsV1 = {
  ok: boolean;
  blockers: string[];
  ready_slug: string | null;
  readiness_gate: ManufacturerRescueReadinessGateReportV1 | null;
  runner_ready_for_apply_slug: string | null;
  candidate: ManufacturerRescueReadinessCandidateV1 | null;
  apply_plan: ManufacturerRescueApplyPlanV1 | null;
  apply_plan_rel_path: string | null;
  founder_decision_id: string | null;
};

export type ManufacturerRescueGuardedApplyBridgeReportV1 = {
  contract: typeof MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  csv_apply_authorized: boolean;
  generated_at: string;
  source_command: typeof MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_SOURCE_COMMAND_V1;
  bridge_status: ManufacturerRescueGuardedApplyBridgeStatusV1;
  write_csv_requested: boolean;
  write_csv_applied: boolean;
  preconditions: ManufacturerRescueGuardedApplyBridgePreconditionsV1;
  ready_slug: string | null;
  execution_plan_artifact_rel_path: string | null;
  guarded_executor_contract: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1;
  guarded_executor_report: UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 | null;
  closeout_artifact_rel_path: typeof MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1;
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type ManufacturerRescueGuardedApplyBridgeCloseoutV1 = {
  contract: typeof MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  source_command: typeof MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_SOURCE_COMMAND_V1;
  filter_slug: string;
  bridge_status: ManufacturerRescueGuardedApplyBridgeStatusV1;
  write_csv_applied: boolean;
  previous_page_classification: string;
  new_page_classification: string;
  safe_buyer_path_proven_delta: number;
  census_delta: {
    safe_buyer_path_proven_count_before: number;
    safe_buyer_path_proven_count_after: number;
    safe_buyer_path_proven_count_delta: number;
  };
  customer_closure_delta: {
    customer_visible_closures_count_before: number;
    customer_visible_closures_count_after: number;
    customer_visible_closures_count_delta: number;
    closure_confidence_before: string;
    closure_confidence_after: string;
  };
  execution_ledger_entry: {
    trigger_source: string;
    ledger_rel_path: string;
    entries_indexed: number;
    latest_entry_summary: string | null;
  };
  source_artifact_paths: {
    readiness_gate: string;
    runner: string;
    apply_plan: string;
    execution_plan: string | null;
  };
  guarded_executor_summary: {
    executor_status: string;
    row_patch_count: number;
    post_write_validation_status: string | null;
  };
  post_apply_refresh_ran: boolean;
  proven_facts: string[];
  unknown_facts: string[];
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function csvRowFromManufacturerSnapshot(
  row: ManufacturerRescueRetailerLinksCsvRowSnapshotV1,
): RetailerLinkCsvRowV1 {
  return {
    filter_slug: row.filter_slug,
    retailer_name: row.retailer_name ?? "",
    affiliate_url: row.affiliate_url ?? "",
    is_primary: row.is_primary === true ? "true" : row.is_primary === false ? "false" : String(row.is_primary ?? "true"),
    sort_order: row.sort_order ?? "0",
    retailer_key: row.retailer_key ?? "oem-parts-catalog",
    browser_truth_classification: row.browser_truth_classification ?? "",
    browser_truth_notes: row.browser_truth_notes ?? "",
    browser_truth_checked_at: row.browser_truth_checked_at ?? "",
  };
}

function changedCsvFields(before: RetailerLinkCsvRowV1, after: RetailerLinkCsvRowV1): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    if ((before[key] ?? "") !== (after[key] ?? "")) changed.push(key);
  }
  return changed.sort();
}

export function manufacturerRescueGuardedApplyExecutionPlanRelV1(slug: string): string {
  const digest = createHash("sha256").update(normalizeSlug(slug)).digest("hex").slice(0, 12);
  return `${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1}/manufacturer-rescue-guarded-apply-execution-plan-${normalizeSlug(slug)}-v1-${digest}.json`;
}

export function loadManufacturerRescueApplyPlanArtifactV1(args: {
  rootDir: string;
  slug: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): { plan: ManufacturerRescueApplyPlanV1 | null; rel: string } {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const rel = manufacturerSafeLinkRescueApplyPlanRelV1(args.slug);
  const abs = path.join(args.rootDir, rel);
  if (!fileExists(abs)) return { plan: null, rel };
  try {
    const parsed = JSON.parse(readText(abs)) as ManufacturerRescueApplyPlanV1;
    if (parsed.contract !== MANUFACTURER_SAFE_LINK_RESCUE_APPLY_PLAN_CONTRACT_V1) {
      return { plan: null, rel };
    }
    return { plan: parsed, rel };
  } catch {
    return { plan: null, rel };
  }
}

function loadFounderDecisionRows(rootDir: string): FounderDecisionRegistryRowV1[] {
  const rows: FounderDecisionRegistryRowV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if ("parseError" in file || !file.parsed || typeof file.parsed !== "object") continue;
    const doc = file.parsed as { rows?: unknown[] };
    if (!Array.isArray(doc.rows)) continue;
    for (const raw of doc.rows) {
      const validated = validateFounderDecisionRegistryRowV1(raw);
      if (validated.ok) rows.push(validated.row);
    }
  }
  return rows;
}

function findActiveFounderDecisionForSlug(args: {
  slug: string;
  applyPlanRel: string | null;
  founderRows: FounderDecisionRegistryRowV1[];
  nowIso: string;
  rootDir: string;
  readText?: (abs: string) => string;
}): FounderDecisionRegistryRowV1 | null {
  const slug = normalizeSlug(args.slug);
  for (const row of args.founderRows) {
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row,
      referenceTimeIso: args.nowIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) continue;
    const haystack = JSON.stringify(row).toLowerCase();
    if (haystack.includes(slug) || (args.applyPlanRel && haystack.includes(args.applyPlanRel.toLowerCase()))) {
      return row;
    }
  }
  return null;
}

export function assessManufacturerRescueGuardedApplyBridgePreconditionsV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): ManufacturerRescueGuardedApplyBridgePreconditionsV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const now = args.now ?? (() => new Date());
  const blockers: string[] = [];

  const readiness_gate = loadManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    fileExists,
    readText,
  });
  if (!readiness_gate) {
    blockers.push(`readiness_gate_artifact_missing:${MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1}`);
  }

  const runnerLoaded = loadManufacturerRescueRunnerReportV1({ rootDir: args.rootDir, fileExists, readTextFile: readText });
  if (!runnerLoaded) {
    blockers.push(`runner_artifact_missing:${MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1}`);
  }

  const ready_slug = readiness_gate?.ready_for_apply_slug ?? null;
  if (!ready_slug) {
    blockers.push("readiness_gate_ready_for_apply_slug_missing");
  }
  if ((readiness_gate?.ready_for_apply_count ?? 0) !== 1) {
    blockers.push(
      `readiness_gate_ready_for_apply_count_invalid: count=${String(readiness_gate?.ready_for_apply_count ?? 0)} expected=1`,
    );
  }

  const runner_ready_for_apply_slug = runnerLoaded?.report.ready_for_apply_slug ?? null;
  if (ready_slug && runner_ready_for_apply_slug !== ready_slug) {
    blockers.push(
      `runner_ready_for_apply_slug_mismatch: runner=${String(runner_ready_for_apply_slug)} gate=${ready_slug}`,
    );
  }

  const candidate =
    ready_slug != null
      ? readiness_gate?.candidates.find((c) => c.filter_slug === ready_slug) ?? null
      : null;
  if (ready_slug && !candidate) {
    blockers.push(`readiness_gate_candidate_missing: slug=${ready_slug}`);
  }
  if (candidate && !candidate.ready_for_apply) {
    blockers.push(`readiness_gate_candidate_not_ready_for_apply: slug=${candidate.filter_slug}`);
  }
  if (candidate && candidate.blocking_reasons.length > 0) {
    blockers.push(...candidate.blocking_reasons.map((r) => `readiness_blocking_reason:${r}`));
  }

  for (const checkId of MANUFACTURER_RESCUE_GUARDED_APPLY_REQUIRED_READINESS_CHECKS_V1) {
    const check = candidate?.checks.find((c) => c.check_id === checkId);
    if (!check || check.status !== "PASS") {
      blockers.push(`readiness_check_not_pass:${checkId}`);
    }
  }

  const applyPlanLoad =
    ready_slug != null
      ? loadManufacturerRescueApplyPlanArtifactV1({ rootDir: args.rootDir, slug: ready_slug, fileExists, readText })
      : { plan: null, rel: manufacturerSafeLinkRescueApplyPlanRelV1("UNKNOWN") };
  if (!applyPlanLoad.plan) {
    blockers.push(`manufacturer_apply_plan_missing:${applyPlanLoad.rel}`);
  } else if (applyPlanLoad.plan.filter_slug !== ready_slug) {
    blockers.push("manufacturer_apply_plan_slug_mismatch");
  } else if (applyPlanLoad.plan.plan_status !== "READY_FOR_OWNER_REVIEW") {
    blockers.push(`manufacturer_apply_plan_status_invalid:${applyPlanLoad.plan.plan_status}`);
  } else if (!applyPlanLoad.plan.proposed_csv_row || !applyPlanLoad.plan.current_csv_row) {
    blockers.push("manufacturer_apply_plan_csv_row_snapshot_missing");
  }

  const founderRow = ready_slug
    ? findActiveFounderDecisionForSlug({
        slug: ready_slug,
        applyPlanRel: applyPlanLoad.rel,
        founderRows: loadFounderDecisionRows(args.rootDir),
        nowIso: now().toISOString(),
        rootDir: args.rootDir,
        readText: args.readText,
      })
    : null;
  if (!founderRow) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  return {
    ok: blockers.length === 0,
    blockers,
    ready_slug,
    readiness_gate,
    runner_ready_for_apply_slug,
    candidate,
    apply_plan: applyPlanLoad.plan,
    apply_plan_rel_path: applyPlanLoad.plan ? applyPlanLoad.rel : null,
    founder_decision_id: founderRow?.decision_id ?? null,
  };
}

export function buildManufacturerRescueUniversalExecutionPlanV1(args: {
  applyPlan: ManufacturerRescueApplyPlanV1;
  applyPlanRelPath: string;
  now?: () => Date;
}): {
  execution_plan_artifact_rel_path: string;
  execution_plan: {
    contract: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1;
    read_only: true;
    data_mutation: false;
    mutation_authorized: false;
    generated_at: string;
    wedge: "refrigerator_water";
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW";
    source_apply_plan_artifact_rel_path: string;
    source_apply_readiness_status: "PROVEN";
    planned_change_count: number;
    target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
    row_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
    rollback_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
    proven_facts: string[];
    unknown_facts: string[];
  };
} {
  const now = args.now ?? (() => new Date());
  const slug = args.applyPlan.filter_slug;
  const before_row = csvRowFromManufacturerSnapshot(args.applyPlan.current_csv_row!);
  const after_row = csvRowFromManufacturerSnapshot(args.applyPlan.proposed_csv_row!);
  const changed_fields = changedCsvFields(before_row, after_row);
  const rowPatch: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 = {
    slug,
    filter_slug: slug,
    action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
    before_row,
    after_row,
    changed_fields,
  };

  const execution_plan_artifact_rel_path = manufacturerRescueGuardedApplyExecutionPlanRelV1(slug);

  return {
    execution_plan_artifact_rel_path,
    execution_plan: {
      contract: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      generated_at: now().toISOString(),
      wedge: "refrigerator_water",
      execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW",
      source_apply_plan_artifact_rel_path: args.applyPlanRelPath,
      source_apply_readiness_status: "PROVEN",
      planned_change_count: 1,
      target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
      row_patch_preview: [rowPatch],
      rollback_patch_preview: [
        {
          ...rowPatch,
          after_row: before_row,
          changed_fields: changed_fields,
        },
      ],
      proven_facts: [
        "PROVEN: manufacturer rescue apply plan transformed to universal_batch_lifecycle_apply_execution_plan_v1.",
        `PROVEN: single-slug guarded apply for ${slug}.`,
      ],
      unknown_facts: [],
    },
  };
}

export function buildManufacturerRescueGuardedApplyMutationAuthorizationV1(args: {
  preconditions: ManufacturerRescueGuardedApplyBridgePreconditionsV1;
  applyExecutorReady: boolean;
}): UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 {
  const authorized = args.preconditions.ok && args.applyExecutorReady;
  const review_blockers: string[] = [];
  if (!args.preconditions.founder_decision_id) {
    review_blockers.push("missing_active_owner_mutation_approval:manufacturer_rescue_readiness_gate");
  }
  if (!args.preconditions.ok) {
    review_blockers.push(...args.preconditions.blockers.map((b) => `bridge_precondition:${b}`));
  }

  return {
    mutation_authorization_review_status: authorized
      ? "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY"
      : "BLOCKED",
    csv_apply_authorized: authorized,
    mutation_authorized: authorized,
    evidence_sufficiency_status: authorized ? "PROVEN" : "BLOCKED",
    apply_executor_ready: args.applyExecutorReady,
    required_founder_decision_packet_id: args.preconditions.founder_decision_id ?? "UNKNOWN",
    review_blockers: authorized ? [] : review_blockers,
  };
}

function censusClassificationForSlug(
  census: AllProductSafeBuyerPathCensusV1 | null,
  slug: string,
): string {
  const row = census?.products.find((p) => normalizeSlug(p.slug) === normalizeSlug(slug));
  return row?.page_classification ?? "UNKNOWN";
}

function writeJsonArtifact(rootDir: string, rel: string, doc: unknown): void {
  const abs = path.join(rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

export function runManufacturerRescuePostApplyRefreshChainV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
}): { post_apply_refresh_ran: boolean } {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const writeText = args.writeText ?? ((abs, content) => writeFileSync(abs, content, "utf8"));

  const orchestrator = buildManufacturerSafeLinkRescueOrchestratorReportV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readTextFile: readText,
  });
  const scoreboard = buildManufacturerRescueScoreboardV1(orchestrator);
  const workQueueMd = buildManufacturerRescueOwnerWorkQueueMarkdownV1(orchestrator);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1), `${JSON.stringify(orchestrator, null, 2)}\n`);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_SCOREBOARD_JSON_REL_V1), `${JSON.stringify(scoreboard, null, 2)}\n`);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_OWNER_WORK_QUEUE_MD_REL_V1), workQueueMd);

  const director = buildManufacturerSafeLinkRescueDirectorReportV1({
    rootDir: args.rootDir,
    orchestrator,
    orchestratorSourcePath: MANUFACTURER_SAFE_LINK_RESCUE_ORCHESTRATOR_JSON_REL_V1,
  });
  const roadmap = buildManufacturerRescueRoadmapV1({ director, orchestrator });
  const nextActionsMd = buildManufacturerRescueNextActionsMarkdownV1(director, roadmap);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_DIRECTOR_JSON_REL_V1), `${JSON.stringify(director, null, 2)}\n`);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_ROADMAP_JSON_REL_V1), `${JSON.stringify(roadmap, null, 2)}\n`);
  writeText(path.join(args.rootDir, MANUFACTURER_SAFE_LINK_RESCUE_NEXT_ACTIONS_MD_REL_V1), nextActionsMd);

  const readiness = buildManufacturerSafeLinkRescueReadinessGateV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerSafeLinkRescueReadinessGateArtifactsV1({ rootDir: args.rootDir, report: readiness });

  const runner = buildManufacturerSafeLinkRescueRunnerV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readTextFile: readText,
  });
  writeManufacturerSafeLinkRescueRunnerArtifactsV1({ rootDir: args.rootDir, report: runner });

  const throughput = buildManufacturerRescueThroughputAnalyticsV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });
  writeManufacturerRescueThroughputAnalyticsArtifactsV1({ rootDir: args.rootDir, report: throughput });

  return { post_apply_refresh_ran: true };
}

export function buildManufacturerRescueGuardedApplyBridgeCloseoutV1(args: {
  slug: string;
  bridge_status: ManufacturerRescueGuardedApplyBridgeStatusV1;
  write_csv_applied: boolean;
  census_before: AllProductSafeBuyerPathCensusV1 | null;
  census_after: AllProductSafeBuyerPathCensusV1 | null;
  customer_closure_before: CustomerClosureReportV1 | null;
  customer_closure_after: CustomerClosureReportV1 | null;
  execution_ledger: BuckpartsExecutionLedgerReportV1;
  execution_plan_rel_path: string | null;
  apply_plan_rel_path: string;
  guarded_executor: UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 | null;
  post_apply_refresh_ran: boolean;
  now?: () => Date;
}): ManufacturerRescueGuardedApplyBridgeCloseoutV1 {
  const now = args.now ?? (() => new Date());
  const beforeClass = censusClassificationForSlug(args.census_before, args.slug);
  const afterClass = censusClassificationForSlug(args.census_after, args.slug);
  const safeBefore = args.census_before?.classification_counts.SAFE_BUYER_PATH_PROVEN ?? 0;
  const safeAfter = args.census_after?.classification_counts.SAFE_BUYER_PATH_PROVEN ?? 0;
  const provenDelta =
    beforeClass === "SAFE_BUYER_PATH_PROVEN" || afterClass !== "SAFE_BUYER_PATH_PROVEN" ? 0 : 1;

  const latestEntry = args.execution_ledger.entries[0] ?? null;

  return {
    contract: MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_SOURCE_COMMAND_V1,
    filter_slug: args.slug,
    bridge_status: args.bridge_status,
    write_csv_applied: args.write_csv_applied,
    previous_page_classification: beforeClass,
    new_page_classification: afterClass,
    safe_buyer_path_proven_delta: afterClass === "SAFE_BUYER_PATH_PROVEN" && beforeClass !== "SAFE_BUYER_PATH_PROVEN" ? 1 : provenDelta,
    census_delta: {
      safe_buyer_path_proven_count_before: safeBefore,
      safe_buyer_path_proven_count_after: safeAfter,
      safe_buyer_path_proven_count_delta: safeAfter - safeBefore,
    },
    customer_closure_delta: {
      customer_visible_closures_count_before: args.customer_closure_before?.customer_visible_closures_count ?? 0,
      customer_visible_closures_count_after: args.customer_closure_after?.customer_visible_closures_count ?? 0,
      customer_visible_closures_count_delta:
        (args.customer_closure_after?.customer_visible_closures_count ?? 0) -
        (args.customer_closure_before?.customer_visible_closures_count ?? 0),
      closure_confidence_before: args.customer_closure_before?.closure_confidence ?? "UNKNOWN",
      closure_confidence_after: args.customer_closure_after?.closure_confidence ?? "UNKNOWN",
    },
    execution_ledger_entry: {
      trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_V1,
      ledger_rel_path: "data/command-center/execution-ledger-v1.json",
      entries_indexed: args.execution_ledger.entries.length,
      latest_entry_summary: latestEntry?.summary ?? null,
    },
    source_artifact_paths: {
      readiness_gate: MANUFACTURER_SAFE_LINK_RESCUE_READINESS_GATE_JSON_REL_V1,
      runner: MANUFACTURER_SAFE_LINK_RESCUE_RUNNER_JSON_REL_V1,
      apply_plan: args.apply_plan_rel_path,
      execution_plan: args.execution_plan_rel_path,
    },
    guarded_executor_summary: {
      executor_status: args.guarded_executor?.executor_status ?? "BLOCKED",
      row_patch_count: args.guarded_executor?.row_patch_count ?? 0,
      post_write_validation_status:
        args.guarded_executor?.post_write_validation?.validation_status ?? null,
    },
    post_apply_refresh_ran: args.post_apply_refresh_ran,
    proven_facts: [
      `PROVEN: bridge closeout for ${args.slug} with bridge_status=${args.bridge_status}.`,
      `PROVEN: classification ${beforeClass} -> ${afterClass}.`,
    ],
    unknown_facts:
      args.write_csv_applied && afterClass !== "SAFE_BUYER_PATH_PROVEN"
        ? ["UNKNOWN: CSV apply succeeded but census has not yet classified SAFE_BUYER_PATH_PROVEN — re-run census read-only."]
        : [],
  };
}

export function runManufacturerRescueGuardedApplyBridgeV1(args: {
  rootDir: string;
  writeCsv?: boolean;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
}): ManufacturerRescueGuardedApplyBridgeReportV1 {
  const now = args.now ?? (() => new Date());
  const writeCsv = args.writeCsv === true;
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const writeText = args.writeText ?? ((abs, content) => writeFileSync(abs, content, "utf8"));

  const preconditions = assessManufacturerRescueGuardedApplyBridgePreconditionsV1({
    rootDir: args.rootDir,
    now,
    fileExists,
    readText,
  });

  const blockers = [...preconditions.blockers];
  let execution_plan_artifact_rel_path: string | null = null;
  let guarded_executor_report: UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 | null = null;
  let write_csv_applied = false;

  const census_before = buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir, now });
  const customer_closure_before = buildCustomerClosureReportV1({
    rootDir: args.rootDir,
    generated_at: now().toISOString(),
    census: census_before,
    closeoutLearning: null,
    publishability: null,
    missionFactoryRegistry: null,
    recentEvidence: null,
    rescueDeltaTrendSummary: null,
  });

  if (preconditions.ok && preconditions.apply_plan && preconditions.apply_plan_rel_path) {
    const built = buildManufacturerRescueUniversalExecutionPlanV1({
      applyPlan: preconditions.apply_plan,
      applyPlanRelPath: preconditions.apply_plan_rel_path,
      now,
    });
    execution_plan_artifact_rel_path = built.execution_plan_artifact_rel_path;
    writeJsonArtifact(args.rootDir, execution_plan_artifact_rel_path, built.execution_plan);

    const dryRunExecutor = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
      rootDir: args.rootDir,
      now,
      executionPlanArtifactRelPath: execution_plan_artifact_rel_path,
      writeCsv: false,
      fileExists,
      readText,
      writeText,
      mutationAuthorizationReview: buildManufacturerRescueGuardedApplyMutationAuthorizationV1({
        preconditions,
        applyExecutorReady: false,
      }),
    });

    const mutationAuth = buildManufacturerRescueGuardedApplyMutationAuthorizationV1({
      preconditions,
      applyExecutorReady: dryRunExecutor.apply_executor_ready,
    });

    guarded_executor_report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
      rootDir: args.rootDir,
      now,
      executionPlanArtifactRelPath: execution_plan_artifact_rel_path,
      writeCsv,
      fileExists,
      readText,
      writeText,
      mutationAuthorizationReview: mutationAuth,
    });

    write_csv_applied = writeCsv && guarded_executor_report.data_mutation === true;
    if (writeCsv && !write_csv_applied) {
      blockers.push(...guarded_executor_report.write_mode_blockers.map((b) => `guarded_executor:${b}`));
    }
  }

  let post_apply_refresh_ran = false;
  if (write_csv_applied && preconditions.ready_slug && preconditions.apply_plan_rel_path) {
    runManufacturerRescuePostApplyRefreshChainV1({
      rootDir: args.rootDir,
      now,
      fileExists,
      readText,
      writeText,
    });
    post_apply_refresh_ran = true;
  }

  const census_after = buildAllProductSafeBuyerPathCensusV1({ rootDir: args.rootDir, now });
  const customer_closure_after = buildCustomerClosureReportV1({
    rootDir: args.rootDir,
    generated_at: now().toISOString(),
    census: census_after,
    closeoutLearning: null,
    publishability: null,
    missionFactoryRegistry: null,
    recentEvidence: null,
    rescueDeltaTrendSummary: null,
  });

  const ledger = refreshBuckpartsExecutionLedgerV1({
    rootDir: args.rootDir,
    trigger_source: EXECUTION_LEDGER_TRIGGER_MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_V1,
    now,
  }).report;

  const bridge_status: ManufacturerRescueGuardedApplyBridgeStatusV1 = write_csv_applied
    ? "APPLIED"
    : preconditions.ok && guarded_executor_report?.apply_executor_ready
      ? "DRY_RUN_READY"
      : "BLOCKED";

  if (preconditions.ready_slug && preconditions.apply_plan_rel_path) {
    const closeout = buildManufacturerRescueGuardedApplyBridgeCloseoutV1({
      slug: preconditions.ready_slug,
      bridge_status,
      write_csv_applied,
      census_before,
      census_after,
      customer_closure_before,
      customer_closure_after,
      execution_ledger: ledger,
      execution_plan_rel_path: execution_plan_artifact_rel_path,
      apply_plan_rel_path: preconditions.apply_plan_rel_path,
      guarded_executor: guarded_executor_report,
      post_apply_refresh_ran,
      now,
    });
    writeJsonArtifact(args.rootDir, MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1, closeout);
  }

  const data_mutation = write_csv_applied;
  return {
    contract: MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CONTRACT_V1,
    read_only: !data_mutation,
    data_mutation,
    mutation_authorized: data_mutation,
    csv_apply_authorized: data_mutation,
    generated_at: now().toISOString(),
    source_command: MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_SOURCE_COMMAND_V1,
    bridge_status,
    write_csv_requested: writeCsv,
    write_csv_applied,
    preconditions,
    ready_slug: preconditions.ready_slug,
    execution_plan_artifact_rel_path,
    guarded_executor_contract: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
    guarded_executor_report,
    closeout_artifact_rel_path: MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1,
    blockers,
    proven_facts: [
      write_csv_applied
        ? `PROVEN: manufacturer rescue guarded apply bridge wrote CSV for ${String(preconditions.ready_slug)} via universal executor.`
        : "PROVEN: manufacturer rescue guarded apply bridge default is read-only dry-run.",
      "PROVEN: Readiness Gate is sole READY_FOR_APPLY promotion authority — bridge does not bypass gate.",
    ],
    unknown_facts: write_csv_applied
      ? []
      : ["UNKNOWN: CSV mutation not applied until explicit --write-csv with all preconditions PASS."],
    recommended_next_action:
      bridge_status === "APPLIED"
        ? `Review ${MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_CLOSEOUT_JSON_REL_V1} — verify SAFE_BUYER_PATH_PROVEN for ${String(preconditions.ready_slug)}.`
        : bridge_status === "DRY_RUN_READY"
          ? `Dry-run ready for ${String(preconditions.ready_slug)} — invoke ${MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_WRITE_SOURCE_COMMAND_V1} when founder authorization remains active.`
          : `Bridge blocked (${String(blockers.length)} blockers) — resolve readiness gate, founder approval, and apply plan artifacts first.`,
  };
}

export function parseManufacturerRescueGuardedApplyBridgeCliArgsV1(argv: readonly string[]): {
  writeCsv: boolean;
} {
  return { writeCsv: argv.includes(MANUFACTURER_RESCUE_GUARDED_APPLY_BRIDGE_WRITE_CSV_FLAG_V1) };
}
