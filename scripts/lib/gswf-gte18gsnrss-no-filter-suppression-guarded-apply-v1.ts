/**
 * Guarded ge-gte18gsnrss no-filter suppression CSV apply executor v1.
 * Default dry-run; real apply requires --apply, matching founder approval,
 * exact 1/2/0 plan shape, and BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENABLED=1.
 * Dry-run never mutates. Apply remains fail-closed unless all gates pass.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
  type GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1,
} from "./gswf-gte18gsnrss-no-filter-suppression-apply-plan-owner-review-v1";

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_APPLY_CONTRACT_V1 =
  "gswf_gte18gsnrss_no_filter_suppression_guarded_apply_v1" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/gswf-gte18gsnrss-no-filter-suppression-owner-approval-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-suppression-guarded-dry-run-v1.json" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-gte18gsnrss-no-filter-suppression-guarded-dry-run-v1.md" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-gte18gsnrss-no-filter-suppression-guarded-apply" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1 =
  "BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENABLED" as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 1,
  planned_removals: 2,
  planned_additions: 0,
} as const;

export const GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1,
] as const;

type CompatCsvRowV1 = { fridge_slug: string; filter_slug: string };

export type Gte18NoFilterPlannedChangeV1 = {
  operation: "remove";
  fridge_slug: string;
  filter_slug: string;
  csv_row_key: string;
};

export type GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1 = {
  contract: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: boolean;
  csv_mutation_authorized: boolean;
  supabase_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  mutation_flag_enabled: boolean;
  apply_status: "DRY_RUN_READY" | "ALREADY_APPLIED" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  apply_plan_rel_path: string;
  apply_plan_sha256: string | null;
  owner_approval_rel_path: string;
  owner_approval_present: boolean;
  owner_approval_valid: boolean;
  owner_approval_decision_id: string | null;
  owner_approval_required_for_apply: true;
  target_csv_rel_path: string;
  target_fridge_slug: typeof GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  planned_csv_row_deltas: Gte18NoFilterPlannedChangeV1[];
  excluded_partial_slugs: string[];
  excluded_gswf_repaired_slugs: string[];
  csv_sync_state: "pending_suppression" | "already_applied";
  before_mappings: string[];
  after_mappings: string[];
  csv_row_count_before: number;
  csv_row_count_after: number;
  applied_removal_row_keys: string[];
  generated_at: string;
  source_command: typeof GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_SOURCE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

type OwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  apply_plan_rel_path?: string;
  approved_slug_count?: number;
  approved_removals?: number;
  approved_additions?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  gswf_gte18gsnrss_no_filter_suppression_owner_approval_context_v1?: OwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(row: CompatCsvRowV1): string {
  return `${normalizeSlug(row.fridge_slug)},${normalizeSlug(row.filter_slug)}`;
}

function readCompatRows(absPath: string, readText: (p: string) => string): CompatCsvRowV1[] {
  return parse(readText(absPath), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CompatCsvRowV1[];
}

function writeCompatRows(
  absPath: string,
  rows: CompatCsvRowV1[],
  writeText: (p: string, c: string) => void,
): void {
  const lines = ["fridge_slug,filter_slug"];
  for (const row of rows) {
    lines.push(`${row.fridge_slug.trim()},${row.filter_slug.trim()}`);
  }
  writeText(absPath, `${lines.join("\n")}\n`);
}

function mappingsForSlug(rows: CompatCsvRowV1[], fridgeSlug: string): string[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => normalizeSlug(row.fridge_slug) === normalizeSlug(fridgeSlug))
        .map((row) => normalizeSlug(row.filter_slug)),
    ),
  ).sort();
}

export function isGswfGte18gsnrssNoFilterSuppressionMutationEnabledV1(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1] === "1";
}

function loadPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1 | null; sha256: string | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, sha256: null, errors: [`apply plan missing: ${relPath}`] };
  }
  const text = readText(abs);
  const sha256 = createHash("sha256").update(text, "utf8").digest("hex");
  const plan = JSON.parse(text) as GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1;
  if (plan.contract !== GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_CONTRACT_V1) {
    return { plan: null, sha256, errors: ["GTE18 no-filter suppression apply plan contract mismatch"] };
  }
  return { plan, sha256, errors: [] };
}

function validatePlanShape(plan: GswfGte18gsnrssNoFilterSuppressionApplyPlanOwnerReviewV1): {
  errors: string[];
  removals: Gte18NoFilterPlannedChangeV1[];
} {
  const errors: string[] = [];
  if (plan.target_fridge_slug !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1) {
    errors.push(
      `target_fridge_slug expected ${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}, got ${plan.target_fridge_slug}`,
    );
  }
  if (plan.proposed_compat_action !== "suppress_all_filter_mappings") {
    errors.push(`proposed_compat_action expected suppress_all_filter_mappings`);
  }
  if (plan.evidence_label !== "PROVEN_NO_FILTER") {
    errors.push(`evidence_label expected PROVEN_NO_FILTER`);
  }
  if (plan.planned_slug_count !== GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `planned_slug_count expected ${String(GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_slug_count)}`,
    );
  }
  if (plan.planned_compat_row_additions !== 0 || (plan.planned_csv_additions?.length ?? 0) !== 0) {
    errors.push(
      `planned additions must be zero, got planned_compat_row_additions=${String(plan.planned_compat_row_additions)} additions=${String(plan.planned_csv_additions?.length ?? 0)}`,
    );
  }
  if (plan.planned_compat_row_removals !== GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_removals) {
    errors.push(
      `planned_compat_row_removals expected ${String(GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_removals)}, got ${String(plan.planned_compat_row_removals)}`,
    );
  }

  const expectedKeys = GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map(
    (row) => `${row.fridge_slug},${row.filter_slug}`,
  ).sort();
  const actualKeys = (plan.planned_csv_removals ?? [])
    .map((row) => normalizeSlug(row.row_key || `${row.fridge_slug},${row.filter_slug}`))
    .sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    errors.push(
      `planned removals must be exactly ${expectedKeys.join(" | ")}, got ${actualKeys.join(" | ") || "(none)"}`,
    );
  }

  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);
  const removals: Gte18NoFilterPlannedChangeV1[] = [];
  for (const row of plan.planned_csv_removals ?? []) {
    const fridge_slug = normalizeSlug(row.fridge_slug);
    const filter_slug = normalizeSlug(row.filter_slug);
    if (fridge_slug !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1) {
      errors.push(`planned removal touches non-target slug: ${fridge_slug}`);
    }
    if (!family.has(filter_slug)) {
      errors.push(`planned removal filter must be gswf/gswf2: ${filter_slug}`);
    }
    if ((GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1 as readonly string[]).includes(fridge_slug)) {
      errors.push(`planned removal touches PARTIAL slug: ${fridge_slug}`);
    }
    if ((GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1 as readonly string[]).includes(fridge_slug)) {
      errors.push(`planned removal touches GSWF-13 repaired slug: ${fridge_slug}`);
    }
    removals.push({
      operation: "remove",
      fridge_slug,
      filter_slug,
      csv_row_key: `${fridge_slug},${filter_slug}`,
    });
  }

  return { errors, removals };
}

function findOwnerApprovalRow(args: {
  rootDir: string;
  relPath: string;
  applyPlanRelPath: string;
  applyPlanSha256: string | null;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { row: RawRegistryRowV1 | null; present: boolean; errors: string[] } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) {
    return {
      row: null,
      present: false,
      errors: [`matching founder GTE18 no-filter suppression owner approval required (${args.relPath})`],
    };
  }
  const doc = JSON.parse(args.readText(abs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return {
      row: null,
      present: true,
      errors: [`owner approval document invalid: ${validated.errors.join("; ")}`],
    };
  }

  const errors: string[] = [];
  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;

    const ctx = row.gswf_gte18gsnrss_no_filter_suppression_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_no_filter_suppression_plan" && optionId !== "approve_apply_plan") {
      continue;
    }
    if (ctx?.apply_plan_rel_path !== args.applyPlanRelPath) {
      errors.push(
        `owner approval apply_plan_rel_path mismatch: expected ${args.applyPlanRelPath}, got ${ctx?.apply_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (ctx?.approved_slug_count !== 1 || ctx?.approved_removals !== 2 || ctx?.approved_additions !== 0) {
      errors.push(
        `owner approval counts must be slug=1 removals=2 additions=0 (got ${String(ctx?.approved_slug_count)}/${String(ctx?.approved_removals)}/${String(ctx?.approved_additions)})`,
      );
      continue;
    }

    const gate = founderRegistryRowPassesMutationApprovalGateV1({
      row: rowValidation.row,
      referenceTimeIso: args.referenceTimeIso,
      rootDir: args.rootDir,
      readText: args.readText,
    });
    if (!gate.ok) {
      errors.push(`owner approval row fails mutation approval gate: ${gate.blockers.join(",")}`);
      continue;
    }

    if (args.applyPlanSha256) {
      const bound = (row.bound_artifacts_v1 ?? []).find(
        (artifact) => artifact.artifact_rel_path === args.applyPlanRelPath,
      );
      if (!bound || bound.sha256_at_binding !== args.applyPlanSha256) {
        errors.push("owner approval bound apply-plan sha256 mismatch");
        continue;
      }
    }

    return { row, present: true, errors: [] };
  }

  errors.push("no matching GTE18 no-filter suppression owner approval row for this apply plan");
  return { row: null, present: true, errors };
}

export type RunGswfGte18gsnrssNoFilterSuppressionGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  applyPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  compatCsvRelPath?: string;
  readText?: (absPath: string) => string;
  writeText?: (absPath: string, content: string) => void;
  env?: NodeJS.ProcessEnv;
  mutationEnabled?: boolean;
};

export function runGswfGte18gsnrssNoFilterSuppressionGuardedApplyV1(
  deps: RunGswfGte18gsnrssNoFilterSuppressionGuardedApplyDepsV1,
): GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1 {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const writeText =
    deps.writeText ?? ((absPath: string, content: string) => writeFileSync(absPath, content, "utf8"));
  const env = deps.env ?? process.env;
  const mutation_flag_enabled =
    typeof deps.mutationEnabled === "boolean"
      ? deps.mutationEnabled
      : isGswfGte18gsnrssNoFilterSuppressionMutationEnabledV1(env);

  const applyPlanRelPath =
    deps.applyPlanRelPath ?? GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_APPLY_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];
  const loaded = loadPlan(deps.rootDir, applyPlanRelPath, readText);
  blocked_reasons.push(...loaded.errors);

  let removals: Gte18NoFilterPlannedChangeV1[] = [];
  let before_mappings: string[] = [];
  let targetCsvRelPath = "data/compatibility_mappings.csv";

  if (loaded.plan) {
    targetCsvRelPath = loaded.plan.target_csv_rel_path;
    const shape = validatePlanShape(loaded.plan);
    blocked_reasons.push(...shape.errors);
    removals = shape.removals;
    before_mappings = [...loaded.plan.before_mappings].map(normalizeSlug).sort();
  }

  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    applyPlanRelPath,
    applyPlanSha256: loaded.sha256,
    referenceTimeIso: generatedAt,
    readText,
  });

  const compatCsvRelPath = deps.compatCsvRelPath ?? targetCsvRelPath;
  const compatAbsPath = path.join(deps.rootDir, compatCsvRelPath);
  const rowsBefore = readCompatRows(compatAbsPath, readText);
  const csv_row_count_before = rowsBefore.length;
  const currentMappings = mappingsForSlug(rowsBefore, GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1);
  const csvKeySet = new Set(rowsBefore.map((row) => rowKey(row)));
  const plannedRemovalKeys = removals.map((row) => row.csv_row_key).sort();
  const expectedBeforeMappings = [...GSWF_GTE18GSNRSS_NO_FILTER_PLANNED_REMOVALS_V1.map((r) => r.filter_slug)].sort();
  const planShapeOk =
    Boolean(loaded.plan) &&
    removals.length === GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_removals &&
    blocked_reasons.length === 0 &&
    JSON.stringify(before_mappings) === JSON.stringify(expectedBeforeMappings);
  const removalsAlreadyAbsent = plannedRemovalKeys.every((key) => !csvKeySet.has(key));
  const csv_sync_state: GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1["csv_sync_state"] =
    planShapeOk && currentMappings.length === 0 && removalsAlreadyAbsent
      ? "already_applied"
      : "pending_suppression";

  // Post-apply / already suppressed: never re-remove rows; report explicit ALREADY_APPLIED.
  if (csv_sync_state === "already_applied") {
    const proven_facts = [
      `PROVEN: mode=${deps.mode}; apply_status=ALREADY_APPLIED; data_mutation=false; csv_mutation_authorized=false; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
      `PROVEN: target_fridge_slug=${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}; csv_sync_state=already_applied; current_mappings=(none).`,
      `PROVEN: historical before_mappings were ${expectedBeforeMappings.join("|")}; planned removals ${plannedRemovalKeys.join(" + ")} are already absent.`,
      `PROVEN: owner_approval_present=${String(approval.present)}; owner_approval_valid=${String(approval.row != null)}.`,
      "PROVEN: supabase_mutation_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
      "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are out of scope for this executor.",
      "PROVEN: post-apply dry-run/apply will not mutate compatibility_mappings.csv.",
    ];
    return {
      contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_APPLY_CONTRACT_V1,
      mode: deps.mode,
      read_only: true,
      data_mutation: false,
      csv_mutation_authorized: false,
      supabase_mutation_authorized: false,
      buy_cta_authorized: false,
      retailer_links_mutation_authorized: false,
      mutation_flag_enabled,
      apply_status: "ALREADY_APPLIED",
      blocked_reasons: [],
      apply_plan_rel_path: applyPlanRelPath,
      apply_plan_sha256: loaded.sha256,
      owner_approval_rel_path: ownerApprovalRelPath,
      owner_approval_present: approval.present,
      owner_approval_valid: approval.row != null,
      owner_approval_decision_id: approval.row?.decision_id ?? null,
      owner_approval_required_for_apply: true,
      target_csv_rel_path: compatCsvRelPath,
      target_fridge_slug: GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
      planned_slug_count: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_slug_count,
      planned_removals: removals.length,
      planned_additions: 0,
      planned_removal_row_keys: plannedRemovalKeys,
      planned_addition_row_keys: [],
      planned_csv_row_deltas: [...removals].sort((a, b) => a.csv_row_key.localeCompare(b.csv_row_key)),
      excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
      excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
      csv_sync_state,
      before_mappings: currentMappings,
      after_mappings: [],
      csv_row_count_before,
      csv_row_count_after: csv_row_count_before,
      applied_removal_row_keys: [],
      generated_at: generatedAt,
      source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_SOURCE_COMMAND_V1,
      proven_facts,
      unknown_facts: [
        "UNKNOWN: Whether live Supabase still maps gswf/gswf2 for ge-gte18gsnrss after CSV apply.",
      ],
      risk_notes: [
        "CSV suppression already applied — executor will not re-remove historical gswf/gswf2 rows.",
        "Do not mutate Supabase, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this executor.",
        "Do not include PARTIAL or GSWF-13 repaired slugs.",
      ],
    };
  }

  if (deps.mode === "apply") {
    if (!approval.row) {
      blocked_reasons.push(...approval.errors);
      blocked_reasons.push(
        "apply mode blocked — matching founder GTE18 no-filter suppression owner approval required",
      );
    }
    if (!mutation_flag_enabled) {
      blocked_reasons.push(
        `apply mode blocked — mutation flag absent (${GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENV_FLAG_V1}=1 required)`,
      );
    }
  }

  if (before_mappings.length > 0 && JSON.stringify(currentMappings) !== JSON.stringify(before_mappings)) {
    blocked_reasons.push(
      `before_mappings mismatch for ${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}: CSV has ${currentMappings.join("|") || "none"}, plan expects ${before_mappings.join("|")}`,
    );
  }

  const untouchedBefore = rowsBefore
    .filter((row) => normalizeSlug(row.fridge_slug) !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1)
    .map((row) => rowKey(row))
    .sort();

  let workingRows = rowsBefore.map((row) => ({
    fridge_slug: row.fridge_slug.trim(),
    filter_slug: row.filter_slug.trim(),
  }));
  const planned_removal_row_keys: string[] = [];
  const applied_removal_row_keys: string[] = [];

  if (blocked_reasons.length === 0) {
    for (const removal of removals) {
      const key = removal.csv_row_key;
      const index = workingRows.findIndex((row) => rowKey(row) === key);
      if (index === -1) {
        blocked_reasons.push(`planned removal missing from CSV: ${key}`);
        continue;
      }
      workingRows = workingRows.filter((_, i) => i !== index);
      planned_removal_row_keys.push(key);
    }

    const afterMappings = mappingsForSlug(workingRows, GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1);
    if (afterMappings.length !== 0) {
      blocked_reasons.push(
        `post-apply after_mappings must be empty for ${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}, got ${afterMappings.join("|")}`,
      );
    }

    const untouchedAfter = workingRows
      .filter((row) => normalizeSlug(row.fridge_slug) !== GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1)
      .map((row) => rowKey(row))
      .sort();
    if (JSON.stringify(untouchedBefore) !== JSON.stringify(untouchedAfter)) {
      blocked_reasons.push("non-target slug rows would be modified — apply blocked");
    }

    for (const slug of [
      ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
      ...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
    ]) {
      const before = mappingsForSlug(rowsBefore, slug);
      const after = mappingsForSlug(workingRows, slug);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        blocked_reasons.push(`excluded/out-of-scope slug mappings would change: ${slug}`);
      }
    }
  }

  const csv_mutation_authorized =
    deps.mode === "apply" &&
    blocked_reasons.length === 0 &&
    Boolean(approval.row) &&
    mutation_flag_enabled;

  let apply_status: GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1["apply_status"] = "BLOCKED";
  let data_mutation = false;

  if (deps.mode === "dry_run") {
    apply_status = blocked_reasons.length === 0 ? "DRY_RUN_READY" : "BLOCKED";
  } else if (!csv_mutation_authorized) {
    apply_status = "BLOCKED";
  } else {
    writeCompatRows(compatAbsPath, workingRows, writeText);
    data_mutation = true;
    apply_status = "APPLIED";
    applied_removal_row_keys.push(...planned_removal_row_keys);
  }

  const after_mappings =
    apply_status === "APPLIED" || apply_status === "DRY_RUN_READY"
      ? mappingsForSlug(workingRows, GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1)
      : currentMappings;

  const proven_facts = [
    `PROVEN: mode=${deps.mode}; apply_status=${apply_status}; data_mutation=${String(data_mutation)}; csv_mutation_authorized=${String(csv_mutation_authorized)}; mutation_flag_enabled=${String(mutation_flag_enabled)}.`,
    `PROVEN: target_fridge_slug=${GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1}; planned_removals=${String(removals.length)}; planned_additions=0; csv_sync_state=${csv_sync_state}.`,
    `PROVEN: owner_approval_present=${String(approval.present)}; owner_approval_valid=${String(approval.row != null)}.`,
    "PROVEN: supabase_mutation_authorized=false; buy_cta_authorized=false; retailer_links_mutation_authorized=false.",
    "PROVEN: PARTIAL 3 and GSWF 13 repaired slugs are out of scope for this executor.",
  ];
  if (apply_status === "DRY_RUN_READY") {
    proven_facts.push(
      "PROVEN: dry-run verified exact removals ge-gte18gsnrss,gswf + ge-gte18gsnrss,gswf2 with empty after_mappings.",
    );
  }
  if (apply_status === "APPLIED") {
    proven_facts.push(
      `PROVEN: applied exactly ${String(applied_removal_row_keys.length)} CSV row removals for ge-gte18gsnrss.`,
    );
  }

  return {
    contract: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: !data_mutation,
    data_mutation,
    csv_mutation_authorized,
    supabase_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    mutation_flag_enabled,
    apply_status,
    blocked_reasons,
    apply_plan_rel_path: applyPlanRelPath,
    apply_plan_sha256: loaded.sha256,
    owner_approval_rel_path: ownerApprovalRelPath,
    owner_approval_present: approval.present,
    owner_approval_valid: approval.row != null,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_required_for_apply: true,
    target_csv_rel_path: compatCsvRelPath,
    target_fridge_slug: GSWF_GTE18GSNRSS_NO_FILTER_TARGET_SLUG_V1,
    planned_slug_count: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_EXPECTED_COUNTS_V1.planned_slug_count,
    planned_removals: removals.length,
    planned_additions: 0,
    planned_removal_row_keys: planned_removal_row_keys.sort(),
    planned_addition_row_keys: [],
    planned_csv_row_deltas: [...removals].sort((a, b) => a.csv_row_key.localeCompare(b.csv_row_key)),
    excluded_partial_slugs: [...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1],
    excluded_gswf_repaired_slugs: [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1],
    csv_sync_state,
    before_mappings: currentMappings,
    after_mappings,
    csv_row_count_before,
    csv_row_count_after: workingRows.length,
    applied_removal_row_keys,
    generated_at: generatedAt,
    source_command: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_SOURCE_COMMAND_V1,
    proven_facts,
    unknown_facts: [
      "UNKNOWN: Whether founder will create gswf-gte18gsnrss-no-filter-suppression-owner-approval-v1.json.",
      "UNKNOWN: Whether live Supabase still maps gswf/gswf2 for ge-gte18gsnrss after CSV apply.",
    ],
    risk_notes: [
      "Dry-run never mutates compatibility_mappings.csv.",
      "Apply requires matching founder approval + BUCKPARTS_GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_MUTATION_ENABLED=1 + exact 2 removals / 0 additions.",
      "Already-applied CSV state returns ALREADY_APPLIED and does not re-remove rows.",
      "Do not mutate Supabase, retailer_links, buy CTA, sitemap, robots, or Product JSON-LD from this executor.",
      "Do not include PARTIAL or GSWF-13 repaired slugs.",
    ],
  };
}

export function buildGswfGte18gsnrssNoFilterSuppressionGuardedDryRunMarkdownV1(
  report: GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1,
): string {
  return [
    "# GSWF ge-gte18gsnrss no-filter suppression guarded dry-run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- csv_sync_state: **${report.csv_sync_state}**`,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- csv_mutation_authorized: **${String(report.csv_mutation_authorized)}**`,
    `- mutation_flag_enabled: **${String(report.mutation_flag_enabled)}**`,
    `- owner_approval_present: **${String(report.owner_approval_present)}**`,
    `- owner_approval_valid: **${String(report.owner_approval_valid)}**`,
    "",
    "## Scope",
    "",
    `- target_fridge_slug: \`${report.target_fridge_slug}\``,
    `- planned_removals: **${String(report.planned_removals)}**`,
    `- planned_additions: **${String(report.planned_additions)}**`,
    `- before_mappings: \`${report.before_mappings.join("|") || "(none)"}\``,
    `- after_mappings: \`${report.after_mappings.join("|") || "(none)"}\``,
    "",
    "### Planned removal keys",
    "",
    ...(report.planned_removal_row_keys.length
      ? report.planned_removal_row_keys.map((key) => `- \`${key}\``)
      : ["- none"]),
    "",
    "## Blocked reasons",
    "",
    ...(report.blocked_reasons.length
      ? report.blocked_reasons.map((reason) => `- ${reason}`)
      : ["- none"]),
    "",
  ].join("\n");
}

export function writeGswfGte18gsnrssNoFilterSuppressionGuardedDryRunArtifactsV1(args: {
  rootDir: string;
  report: GswfGte18gsnrssNoFilterSuppressionGuardedApplyReportV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1,
  );
  const mdAbs = path.join(
    args.rootDir,
    GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1,
  );
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    `${buildGswfGte18gsnrssNoFilterSuppressionGuardedDryRunMarkdownV1(args.report)}\n`,
    "utf8",
  );
  return {
    json_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_JSON_REL_V1,
    md_rel_path: GSWF_GTE18GSNRSS_NO_FILTER_SUPPRESSION_GUARDED_DRY_RUN_MD_REL_V1,
  };
}
