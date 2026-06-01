/**
 * Read-only universal batch lifecycle apply execution plan for refrigerator_water.
 * PROVEN: no CSV, retailer_links, Supabase, public UI, evidence writes, deploy, or Netlify.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  loadFridgeBuyerPathBatchApplyPlanArtifactV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
  FRIDGE_RETAILER_LINKS_CSV_REL_V1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import type { UniversalBatchLifecycleApplyReadinessReportV1 } from "./universal-batch-lifecycle-apply-readiness-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1 } from "./universal-batch-lifecycle-apply-readiness-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1 =
  "universal_batch_lifecycle_apply_execution_plan_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-apply-execution-plan" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans" as const;

export type UniversalBatchLifecycleApplyExecutionPlanStatusV1 =
  | "READY_FOR_MUTATION_AUTH_REVIEW"
  | "BLOCKED";

export type RetailerLinkCsvRowV1 = Record<string, string>;

export type UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 = {
  slug: string;
  filter_slug: string;
  action: string;
  before_row: RetailerLinkCsvRowV1;
  after_row: RetailerLinkCsvRowV1;
  changed_fields: string[];
};

export type UniversalBatchLifecycleApplyExecutionPlanValidationStepV1 = {
  step_id: string;
  command_or_test: string;
  purpose: string;
};

export type UniversalBatchLifecycleApplyExecutionPlanReportV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CC_JQ_PATH_V1;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1;
  generated_at: string;
  wedge: "refrigerator_water";
  execution_plan_status: UniversalBatchLifecycleApplyExecutionPlanStatusV1;
  source_apply_plan_artifact_rel_path: string;
  source_apply_readiness_status: UniversalBatchLifecycleApplyReadinessReportV1["apply_readiness_status"];
  planned_change_count: number;
  target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  row_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
  rollback_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
  validation_plan: UniversalBatchLifecycleApplyExecutionPlanValidationStepV1[];
  rollback_plan: string[];
  closeout_requirements: string[];
  execution_plan_blockers: string[];
  apply_executor_available: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

type ApplyPlanPlannedChangeV1 = {
  slug: string;
  proposed_affiliate_url: string;
  proposed_retailer_key: string | null;
  evidence_artifact_path: string | null;
  action: string;
};

export type BuildUniversalBatchLifecycleApplyExecutionPlanInputV1 = {
  rootDir: string;
  now?: () => Date;
  applyPlanArtifactRelPath?: string;
  applyReadiness?: Pick<
    UniversalBatchLifecycleApplyReadinessReportV1,
    "apply_readiness_status" | "planned_change_count" | "source_apply_plan_artifact_rel_path"
  >;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
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

function sortedSlugSet(slugs: readonly string[]): string[] {
  return Array.from(new Set(slugs.map(normalizeSlug))).sort((a, b) => a.localeCompare(b));
}

function slugSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  const sa = sortedSlugSet(a);
  const sb = sortedSlugSet(b);
  return sa.length === sb.length && sa.every((slug, index) => slug === sb[index]);
}

export function assertUniversalBatchLifecycleApplyExecutionPlanOutPathAllowedV1(
  outPath: string,
  rootDir: string,
): void {
  const abs = path.resolve(rootDir, outPath);
  const allowedDir = path.resolve(rootDir, UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1);
  if (!abs.startsWith(`${allowedDir}${path.sep}`) && abs !== allowedDir) {
    throw new Error(
      `--plan-out must be under ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLANS_DIR_REL_V1}/ (got ${outPath})`,
    );
  }
}

export function loadFridgeRetailerLinksCsvRowsV1(args: {
  rootDir: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): RetailerLinkCsvRowV1[] {
  const abs = path.join(args.rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  if (!args.fileExists(abs)) return [];
  return parse(args.readText(abs), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as RetailerLinkCsvRowV1[];
}

export function indexRetailerLinksBySlugV1(
  rows: readonly RetailerLinkCsvRowV1[],
): Map<string, RetailerLinkCsvRowV1[]> {
  const map = new Map<string, RetailerLinkCsvRowV1[]>();
  for (const row of rows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const list = map.get(slug) ?? [];
    list.push(row);
    map.set(slug, list);
  }
  return map;
}

export function findPrimaryRetailerLinkRowForSlugV1(
  rows: readonly RetailerLinkCsvRowV1[],
): RetailerLinkCsvRowV1 | null {
  const primaries = rows.filter((row) => (row.is_primary ?? "").trim().toLowerCase() === "true");
  if (primaries.length === 0) return null;
  const oemCatalog = primaries.find(
    (row) => (row.retailer_key ?? "").trim().toLowerCase() === "oem-parts-catalog",
  );
  return oemCatalog ?? primaries[0] ?? null;
}

function loadApplyPlanPlannedChangesV1(args: {
  rootDir: string;
  relPath: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): { ok: true; planned_changes: ApplyPlanPlannedChangeV1[] } | { ok: false } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return { ok: false };
  try {
    const doc = JSON.parse(args.readText(abs)) as Record<string, unknown>;
    if (doc.contract !== FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1) return { ok: false };
    if (!Array.isArray(doc.planned_changes)) return { ok: false };
    const planned_changes = doc.planned_changes.map((row) => {
      const o = row as Record<string, unknown>;
      return {
        slug: typeof o.slug === "string" ? o.slug : "",
        proposed_affiliate_url:
          typeof o.proposed_affiliate_url === "string" ? o.proposed_affiliate_url : "",
        proposed_retailer_key: typeof o.proposed_retailer_key === "string" ? o.proposed_retailer_key : null,
        evidence_artifact_path:
          typeof o.evidence_artifact_path === "string" ? o.evidence_artifact_path : null,
        action: typeof o.action === "string" ? o.action : "",
      };
    });
    return { ok: true, planned_changes };
  } catch {
    return { ok: false };
  }
}

function readEvidenceCheckedAtV1(args: {
  rootDir: string;
  relPath: string | null;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): string | null {
  if (!args.relPath) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return null;
  try {
    const doc = JSON.parse(args.readText(abs)) as Record<string, unknown>;
    return typeof doc.generated_at === "string" ? doc.generated_at : null;
  } catch {
    return null;
  }
}

export function buildAfterRowFromApplyPlanChangeV1(args: {
  before: RetailerLinkCsvRowV1;
  planned: ApplyPlanPlannedChangeV1;
  evidenceCheckedAt: string | null;
}): { after_row: RetailerLinkCsvRowV1; changed_fields: string[] } {
  const after_row: RetailerLinkCsvRowV1 = { ...args.before };
  const changed_fields: string[] = [];
  const setField = (key: string, value: string) => {
    if ((after_row[key] ?? "") !== value) {
      after_row[key] = value;
      changed_fields.push(key);
    }
  };

  setField("affiliate_url", args.planned.proposed_affiliate_url);
  setField("retailer_name", "Amazon");
  setField("retailer_key", (args.planned.proposed_retailer_key ?? "amazon").trim().toLowerCase());
  setField("browser_truth_classification", "direct_buyable");
  setField(
    "browser_truth_notes",
    `Lifecycle execution-plan preview: replace search placeholder with verified direct-buyable Amazon URL from ${args.planned.evidence_artifact_path ?? "evidence"}. Not applied.`,
  );
  if (args.evidenceCheckedAt) {
    setField("browser_truth_checked_at", args.evidenceCheckedAt);
  }

  return { after_row, changed_fields };
}

function defaultValidationPlanV1(): UniversalBatchLifecycleApplyExecutionPlanValidationStepV1[] {
  return [
    {
      step_id: "reverify_apply_readiness",
      command_or_test: "npm run buckparts:universal-batch-lifecycle-apply-readiness",
      purpose: "Confirm apply-readiness remains PROVEN immediately before any future apply authorization.",
    },
    {
      step_id: "reverify_execution_plan",
      command_or_test: "npm run buckparts:universal-batch-lifecycle-apply-execution-plan",
      purpose: "Confirm row_patch_preview still matches committed apply-plan artifact and CSV before rows.",
    },
    {
      step_id: "command_center_lifecycle_lane",
      command_or_test:
        "node --import tsx scripts/report-buckparts-command-center.ts | jq '.command_center_v2.universal_batch_lifecycle_apply_execution_plan_v1.execution_plan_status'",
      purpose: "Verify Command Center lifecycle lane still reports READY_FOR_MUTATION_AUTH_REVIEW.",
    },
    {
      step_id: "fridge_truth_spine_tests",
      command_or_test: "node --import tsx --test scripts/lib/fridge-truth-reconciliation-v1.test.ts",
      purpose: "Run fridge truth-spine regression tests after any future CSV apply.",
    },
    {
      step_id: "command_center_regression",
      command_or_test: "node --import tsx --test scripts/report-buckparts-command-center.test.ts",
      purpose: "Run Command Center regression suite after any future CSV apply.",
    },
  ];
}

function defaultRollbackPlanV1(): string[] {
  return [
    "Restore data/retailer_links.csv primary rows from rollback_patch_preview.before_row snapshots for the 14 target slugs only.",
    "Do not revert unrelated retailer_links.csv rows outside the approved apply-plan slug set.",
    "Re-run npm run buckparts:universal-batch-lifecycle-apply-readiness and npm run buckparts:universal-batch-lifecycle-apply-execution-plan read-only to confirm rollback parity.",
    "Do not mutate Supabase, public UI, evidence, or deploy until parity is re-proven.",
  ];
}

function defaultCloseoutRequirementsV1(): string[] {
  return [
    "Explicit future mutation authorization system must authorize csv_apply_authorized=true (not present in this repo state).",
    "Dedicated apply executor must exist and remain scoped to data/retailer_links.csv for the 14 approved slugs only.",
    "Post-apply parity audit across CSV, Supabase/public.retailer_links, and public buyer-path truth spine.",
    "Run-registry closeout_complete=true only after parity_verified lifecycle state is proven.",
  ];
}

export function buildUniversalBatchLifecycleApplyExecutionPlanV1(
  input: BuildUniversalBatchLifecycleApplyExecutionPlanInputV1,
): UniversalBatchLifecycleApplyExecutionPlanReportV1 {
  const now = input.now ?? (() => new Date());
  const fileExists = input.fileExists ?? defaultFileExists;
  const readText = input.readText ?? defaultReadText;
  const applyPlanRelPath =
    input.applyPlanArtifactRelPath ??
    input.applyReadiness?.source_apply_plan_artifact_rel_path ??
    FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;

  const proven_facts: string[] = [
    "PROVEN: universal_batch_lifecycle_apply_execution_plan_v1 is read-only preview; mutation_authorized=false.",
    "PROVEN: No apply executor exists; this lane does not authorize CSV mutation.",
  ];
  const unknown_facts: string[] = [];
  const execution_plan_blockers: string[] = [];

  const applyReadinessStatus = input.applyReadiness?.apply_readiness_status ?? "UNKNOWN";
  if (applyReadinessStatus !== "PROVEN") {
    execution_plan_blockers.push(
      `apply_readiness_not_proven: apply_readiness_status=${applyReadinessStatus}`,
    );
  }

  const applyPlanArtifact = loadFridgeBuyerPathBatchApplyPlanArtifactV1({
    rootDir: input.rootDir,
    relPath: applyPlanRelPath,
    fileExists,
    readText,
  });
  if (!applyPlanArtifact) {
    execution_plan_blockers.push(
      `apply_plan_artifact_invalid: missing or invalid at ${applyPlanRelPath}`,
    );
  }

  const applyPlanDetail = loadApplyPlanPlannedChangesV1({
    rootDir: input.rootDir,
    relPath: applyPlanRelPath,
    fileExists,
    readText,
  });
  if (!applyPlanDetail.ok) {
    execution_plan_blockers.push(`apply_plan_planned_changes_unreadable: ${applyPlanRelPath}`);
  }

  const artifactSlugs = applyPlanArtifact?.planned_changes.map((row) => row.slug) ?? [];
  const detailSlugs = applyPlanDetail.ok ? applyPlanDetail.planned_changes.map((row) => row.slug) : [];
  if (applyPlanArtifact && applyPlanDetail.ok && !slugSetsEqual(artifactSlugs, detailSlugs)) {
    execution_plan_blockers.push("apply_plan_slug_mismatch: artifact vs planned_changes slug sets differ");
  }

  const expectedCount =
    input.applyReadiness?.planned_change_count ??
    applyPlanArtifact?.planned_change_count ??
    UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1;
  if (applyPlanArtifact && applyPlanArtifact.planned_change_count !== expectedCount) {
    execution_plan_blockers.push(
      `planned_change_count_mismatch: artifact=${String(applyPlanArtifact.planned_change_count)} expected=${String(expectedCount)}`,
    );
  }

  const csvRows = loadFridgeRetailerLinksCsvRowsV1({ rootDir: input.rootDir, fileExists, readText });
  const csvBySlug = indexRetailerLinksBySlugV1(csvRows);

  const row_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[] = [];
  if (applyPlanDetail.ok && applyReadinessStatus === "PROVEN") {
    for (const planned of applyPlanDetail.planned_changes) {
      const slugKey = normalizeSlug(planned.slug);
      const slugRows = csvBySlug.get(slugKey) ?? [];
      const before_row = findPrimaryRetailerLinkRowForSlugV1(slugRows);
      if (!before_row) {
        execution_plan_blockers.push(`csv_primary_row_missing: slug=${planned.slug}`);
        continue;
      }
      if (!planned.proposed_affiliate_url.trim()) {
        execution_plan_blockers.push(`missing_proposed_affiliate_url: slug=${planned.slug}`);
        continue;
      }
      if (planned.action !== FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1) {
        execution_plan_blockers.push(`unexpected_action: slug=${planned.slug} action=${planned.action}`);
        continue;
      }

      const evidenceCheckedAt = readEvidenceCheckedAtV1({
        rootDir: input.rootDir,
        relPath: planned.evidence_artifact_path,
        fileExists,
        readText,
      });
      const { after_row, changed_fields } = buildAfterRowFromApplyPlanChangeV1({
        before: before_row,
        planned,
        evidenceCheckedAt,
      });
      row_patch_preview.push({
        slug: planned.slug,
        filter_slug: before_row.filter_slug ?? planned.slug,
        action: planned.action,
        before_row: { ...before_row },
        after_row,
        changed_fields,
      });
    }
  }

  if (
    applyPlanDetail.ok &&
    applyReadinessStatus === "PROVEN" &&
    row_patch_preview.length !== applyPlanDetail.planned_changes.length
  ) {
    execution_plan_blockers.push(
      `row_patch_preview_incomplete: preview=${String(row_patch_preview.length)} planned=${String(applyPlanDetail.planned_changes.length)}`,
    );
  }

  const previewSlugs = row_patch_preview.map((row) => row.slug);
  if (
    applyPlanDetail.ok &&
    applyReadinessStatus === "PROVEN" &&
    row_patch_preview.length > 0 &&
    !slugSetsEqual(previewSlugs, applyPlanDetail.planned_changes.map((row) => row.slug))
  ) {
    execution_plan_blockers.push("row_patch_preview_slug_set_mismatch: preview slugs differ from apply-plan artifact");
  }

  const rollback_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[] = row_patch_preview.map(
    (row) => ({
      slug: row.slug,
      filter_slug: row.filter_slug,
      action: "rollback_restore_before_row",
      before_row: { ...row.after_row },
      after_row: { ...row.before_row },
      changed_fields: row.changed_fields.filter((field) => row.before_row[field] !== row.after_row[field]),
    }),
  );

  const execution_plan_status: UniversalBatchLifecycleApplyExecutionPlanStatusV1 =
    execution_plan_blockers.length === 0 && row_patch_preview.length === expectedCount
      ? "READY_FOR_MUTATION_AUTH_REVIEW"
      : "BLOCKED";

  if (execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW") {
    proven_facts.push(
      `PROVEN: execution_plan_status=READY_FOR_MUTATION_AUTH_REVIEW for ${String(row_patch_preview.length)} retailer_links.csv primary rows.`,
      `PROVEN: target_file=${FRIDGE_RETAILER_LINKS_CSV_REL_V1}; apply_readiness_status=PROVEN.`,
    );
  } else {
    proven_facts.push(
      `PROVEN: execution_plan_status=BLOCKED with ${String(execution_plan_blockers.length)} blockers.`,
    );
  }

  const recommended_next_action =
    execution_plan_status === "READY_FOR_MUTATION_AUTH_REVIEW"
      ? `LIFECYCLE APPLY-EXECUTION-PLAN [READY]: refrigerator_water has a read-only execution plan for ${String(row_patch_preview.length)} retailer_links.csv row patches. Mutation unauthorized; requires separate future mutation authorization before any apply executor.`
      : `LIFECYCLE APPLY-EXECUTION-PLAN [BLOCKED]: refrigerator_water execution plan blocked (${String(execution_plan_blockers.length)} blockers). Run ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1} read-only. Mutation unauthorized.`;

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CC_JQ_PATH_V1,
    source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    execution_plan_status,
    source_apply_plan_artifact_rel_path: applyPlanRelPath,
    source_apply_readiness_status: applyReadinessStatus,
    planned_change_count: row_patch_preview.length > 0 ? row_patch_preview.length : expectedCount,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    row_patch_preview,
    rollback_patch_preview,
    validation_plan: defaultValidationPlanV1(),
    rollback_plan: defaultRollbackPlanV1(),
    closeout_requirements: defaultCloseoutRequirementsV1(),
    execution_plan_blockers,
    apply_executor_available: false,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    recommended_next_action,
    proven_facts,
    unknown_facts,
  };
}
