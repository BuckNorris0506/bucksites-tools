/**
 * Guarded GSWF wrong-part repair Supabase compatibility sync executor v1.
 * Default dry-run; real apply requires --apply and a matching founder approval artifact.
 * This lane never mutates Supabase or CSV in dry-run. Apply is fail-closed until approval exists.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  validateFounderDecisionRegistryDocumentV1,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { founderRegistryRowPassesMutationApprovalGateV1 } from "./founder-mutation-approval-gate-v1";
import {
  GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
  GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1,
  GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1,
} from "./gswf-wrong-part-repair-apply-plan-owner-review-v1";
import {
  GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1,
  GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1,
  type GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1,
} from "./gswf-wrong-part-repair-supabase-compat-sync-plan-owner-review-v1";

export const GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1 =
  "gswf_wrong_part_repair_supabase_compat_sync_guarded_apply_v1" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1 =
  "data/owner-decisions/gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-guarded-dry-run-v1.json" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-wrong-part-repair-supabase-compat-sync-guarded-dry-run-v1.md" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-wrong-part-repair-supabase-compat-sync-guarded-apply" as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1 = {
  planned_slug_count: 13,
  planned_removals: 26,
  planned_additions: 13,
  conflict_requires_review: 13,
} as const;

export const GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_ALLOWED_WRITE_REL_PATHS_V1 = [
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1,
  GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1,
] as const;

export type SupabaseCompatSyncPlannedChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  row_key: string;
};

export type GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1 = {
  contract: typeof GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1;
  mode: "dry_run" | "apply";
  read_only: boolean;
  data_mutation: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "BLOCKED";
  blocked_reasons: string[];
  sync_plan_rel_path: string;
  owner_approval_rel_path: string;
  owner_approval_present: boolean;
  owner_approval_decision_id: string | null;
  owner_approval_valid: boolean;
  owner_approval_required_for_apply: true;
  csv_apply_commit: typeof GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1;
  planned_slug_count: number;
  planned_removals: number;
  planned_additions: number;
  classification_counts: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null;
  excluded_slugs_untouched: string[];
  planned_supabase_row_deltas: SupabaseCompatSyncPlannedChangeV1[];
  planned_removal_row_keys: string[];
  planned_addition_row_keys: string[];
  generated_at: string;
  source_command: typeof GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

type SupabaseSyncOwnerApprovalContextV1 = {
  founder_option_id?: string;
  option_id?: string;
  sync_plan_rel_path?: string;
  approved_slug_count?: number;
  approved_removals?: number;
  approved_additions?: number;
};

type RawRegistryRowV1 = FounderDecisionRegistryRowV1 & {
  gswf_wrong_part_repair_supabase_compat_sync_owner_approval_context_v1?: SupabaseSyncOwnerApprovalContextV1;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(fridgeSlug: string, filterSlug: string): string {
  return `${normalizeSlug(fridgeSlug)},${normalizeSlug(filterSlug)}`;
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean))).sort();
}

function loadSyncPlan(
  rootDir: string,
  relPath: string,
  readText: (p: string) => string,
): { plan: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1 | null; errors: string[] } {
  const abs = path.join(rootDir, relPath);
  if (!existsSync(abs)) {
    return { plan: null, errors: [`sync plan artifact missing: ${relPath}`] };
  }
  const plan = JSON.parse(readText(abs)) as GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1;
  if (plan.contract !== GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1) {
    return {
      plan: null,
      errors: [
        `sync plan contract mismatch: expected ${GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_CONTRACT_V1}, got ${String((plan as { contract?: string }).contract)}`,
      ],
    };
  }
  return { plan, errors: [] };
}

function findOwnerApprovalRow(args: {
  rootDir: string;
  relPath: string;
  syncPlanRelPath: string;
  expectedSlugCount: number;
  expectedRemovals: number;
  expectedAdditions: number;
  referenceTimeIso: string;
  readText: (p: string) => string;
}): { present: boolean; row: RawRegistryRowV1 | null; errors: string[] } {
  const errors: string[] = [];
  const approvalAbs = path.join(args.rootDir, args.relPath);
  if (!existsSync(approvalAbs)) {
    return {
      present: false,
      row: null,
      errors: [`owner approval file missing: ${args.relPath}`],
    };
  }

  const doc = JSON.parse(args.readText(approvalAbs)) as { rows?: unknown[] };
  const validated = validateFounderDecisionRegistryDocumentV1(doc);
  if (!validated.ok) {
    return {
      present: true,
      row: null,
      errors: [`owner approval document invalid: ${validated.errors.join("; ")}`],
    };
  }

  for (const raw of doc.rows ?? []) {
    const row = raw as RawRegistryRowV1;
    const rowValidation = validateFounderDecisionRegistryRowV1(row);
    if (!rowValidation.ok) continue;
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (row.evidence_required_before_mutation !== true) continue;

    const ctx = row.gswf_wrong_part_repair_supabase_compat_sync_owner_approval_context_v1;
    const optionId = ctx?.founder_option_id ?? ctx?.option_id;
    if (optionId !== "approve_supabase_compat_sync_plan") continue;
    if (ctx?.sync_plan_rel_path !== args.syncPlanRelPath) {
      errors.push(
        `owner approval sync_plan_rel_path mismatch: expected ${args.syncPlanRelPath}, got ${ctx?.sync_plan_rel_path ?? "missing"}`,
      );
      continue;
    }
    if (ctx?.approved_slug_count !== args.expectedSlugCount) {
      errors.push(
        `owner approval approved_slug_count mismatch: expected ${String(args.expectedSlugCount)}, got ${String(ctx?.approved_slug_count ?? "missing")}`,
      );
      continue;
    }
    if (ctx?.approved_removals !== args.expectedRemovals) {
      errors.push(
        `owner approval approved_removals mismatch: expected ${String(args.expectedRemovals)}, got ${String(ctx?.approved_removals ?? "missing")}`,
      );
      continue;
    }
    if (ctx?.approved_additions !== args.expectedAdditions) {
      errors.push(
        `owner approval approved_additions mismatch: expected ${String(args.expectedAdditions)}, got ${String(ctx?.approved_additions ?? "missing")}`,
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
    return { present: true, row, errors: [] };
  }

  errors.push(
    "no matching owner approval row with approve_supabase_compat_sync_plan for this sync plan",
  );
  return { present: true, row: null, errors };
}

function validatePlanShape(plan: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1): {
  errors: string[];
  removals: SupabaseCompatSyncPlannedChangeV1[];
  additions: SupabaseCompatSyncPlannedChangeV1[];
  excludedSlugs: string[];
} {
  const errors: string[] = [];
  const family = new Set(GSWF_WRONG_PART_FAMILY_FILTER_SLUGS_V1 as readonly string[]);

  if (plan.read_only !== true) {
    errors.push("sync plan read_only must be true");
  }
  if (plan.data_mutation !== false) {
    errors.push("sync plan data_mutation must be false");
  }
  if (plan.supabase_mutation_authorized !== false) {
    errors.push("sync plan supabase_mutation_authorized must be false");
  }
  if (plan.apply_authorized !== false) {
    errors.push("sync plan apply_authorized must be false");
  }
  if (plan.csv_apply_commit !== GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1) {
    errors.push(
      `sync plan csv_apply_commit mismatch: expected ${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}, got ${String(plan.csv_apply_commit)}`,
    );
  }

  if (plan.planned_slug_count !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `planned_slug_count expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.planned_slug_count)}`,
    );
  }
  if (plan.rows.length !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count) {
    errors.push(
      `plan.rows.length expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count)}, got ${String(plan.rows.length)}`,
    );
  }

  const plannedSlugs = sortedUnique(plan.rows.map((row) => row.fridge_slug));
  const expectedSlugs = [...GSWF_WRONG_PART_PLANNED_FRIDGE_SLUGS_V1].map(normalizeSlug).sort();
  if (JSON.stringify(plannedSlugs) !== JSON.stringify(expectedSlugs)) {
    errors.push(
      `planned slug set mismatch — expected ${expectedSlugs.join(",")}, got ${plannedSlugs.join(",")}`,
    );
  }

  const expectedExcluded = sortedUnique([
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ]);
  const planExcluded = sortedUnique(plan.excluded_slugs_untouched ?? []);
  if (JSON.stringify(planExcluded) !== JSON.stringify(expectedExcluded)) {
    errors.push(
      `excluded_slugs_untouched mismatch — expected ${expectedExcluded.join("|")}, got ${planExcluded.join("|")}`,
    );
  }
  for (const slug of expectedExcluded) {
    if (plannedSlugs.includes(slug)) {
      errors.push(`excluded slug ${slug} appears in planned sync rows`);
    }
  }

  if (
    plan.classification_counts.CONFLICT_REQUIRES_REVIEW !==
    GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.conflict_requires_review
  ) {
    errors.push(
      `classification_counts.CONFLICT_REQUIRES_REVIEW expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.conflict_requires_review)}, got ${String(plan.classification_counts.CONFLICT_REQUIRES_REVIEW)}`,
    );
  }
  if (plan.classification_counts.UNKNOWN_READ_FAILED !== 0) {
    errors.push(
      `classification_counts.UNKNOWN_READ_FAILED expected 0, got ${String(plan.classification_counts.UNKNOWN_READ_FAILED)}`,
    );
  }

  const summaryRemovals = plan.proposed_supabase_change_summary?.removals ?? [];
  const summaryAdditions = plan.proposed_supabase_change_summary?.additions ?? [];
  if (summaryRemovals.length !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals) {
    errors.push(
      `proposed removals expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals)}, got ${String(summaryRemovals.length)}`,
    );
  }
  if (summaryAdditions.length !== GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions) {
    errors.push(
      `proposed additions expected ${String(GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions)}, got ${String(summaryAdditions.length)}`,
    );
  }

  const removals: SupabaseCompatSyncPlannedChangeV1[] = [];
  const additions: SupabaseCompatSyncPlannedChangeV1[] = [];

  for (const change of summaryRemovals) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    if (!family.has(filter_slug)) {
      errors.push(`planned supabase removal is not gswf/gswf2: ${fridge_slug},${filter_slug}`);
    }
    if (expectedExcluded.includes(fridge_slug)) {
      errors.push(`planned supabase removal touches excluded slug: ${fridge_slug}`);
    }
    if (!plannedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase removal for non-planned slug: ${fridge_slug}`);
    }
    removals.push({
      operation: "remove",
      fridge_slug,
      filter_slug,
      row_key: rowKey(fridge_slug, filter_slug),
    });
  }

  for (const change of summaryAdditions) {
    const fridge_slug = normalizeSlug(change.fridge_slug);
    const filter_slug = normalizeSlug(change.filter_slug);
    if (family.has(filter_slug)) {
      errors.push(`planned supabase addition must not re-add wrong family: ${fridge_slug},${filter_slug}`);
    }
    if (expectedExcluded.includes(fridge_slug)) {
      errors.push(`planned supabase addition touches excluded slug: ${fridge_slug}`);
    }
    if (!plannedSlugs.includes(fridge_slug)) {
      errors.push(`planned supabase addition for non-planned slug: ${fridge_slug}`);
    }
    additions.push({
      operation: "add",
      fridge_slug,
      filter_slug,
      row_key: rowKey(fridge_slug, filter_slug),
    });
  }

  // Cross-check row-level proposed arrays aggregate to summary counts.
  const rowRemovals = plan.rows.flatMap((row) => row.proposed_supabase_removals ?? []);
  const rowAdditions = plan.rows.flatMap((row) => row.proposed_supabase_additions ?? []);
  if (rowRemovals.length !== summaryRemovals.length) {
    errors.push(
      `row proposed_supabase_removals (${String(rowRemovals.length)}) !== summary removals (${String(summaryRemovals.length)})`,
    );
  }
  if (rowAdditions.length !== summaryAdditions.length) {
    errors.push(
      `row proposed_supabase_additions (${String(rowAdditions.length)}) !== summary additions (${String(summaryAdditions.length)})`,
    );
  }

  return { errors, removals, additions, excludedSlugs: expectedExcluded };
}

export type RunGswfWrongPartRepairSupabaseCompatSyncGuardedApplyDepsV1 = {
  rootDir: string;
  mode: "dry_run" | "apply";
  now?: () => Date;
  syncPlanRelPath?: string;
  ownerApprovalRelPath?: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
};

export function runGswfWrongPartRepairSupabaseCompatSyncGuardedApplyV1(
  deps: RunGswfWrongPartRepairSupabaseCompatSyncGuardedApplyDepsV1,
): GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1 {
  const now = deps.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const readText = deps.readText ?? ((absPath: string) => readFileSync(absPath, "utf8"));
  const fileExists = deps.fileExists ?? ((absPath: string) => existsSync(absPath));

  const syncPlanRelPath =
    deps.syncPlanRelPath ?? GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_PLAN_JSON_REL_V1;
  const ownerApprovalRelPath =
    deps.ownerApprovalRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_OWNER_APPROVAL_JSON_REL_V1;

  const blocked_reasons: string[] = [];

  // Injectable exists for approval path checks in tests; plan load still uses existsSync via abs path
  // through loadSyncPlan — for tests that stub readText only, plan must exist on disk or via custom path.
  const loaded = loadSyncPlan(deps.rootDir, syncPlanRelPath, readText);
  blocked_reasons.push(...loaded.errors);

  let removals: SupabaseCompatSyncPlannedChangeV1[] = [];
  let additions: SupabaseCompatSyncPlannedChangeV1[] = [];
  let excludedSlugs = sortedUnique([
    ...GSWF_WRONG_PART_EXCLUDED_PARTIAL_SLUGS_V1,
    ...GSWF_WRONG_PART_EXCLUDED_NO_FILTER_SLUGS_V1,
  ]);
  let classification_counts: GswfWrongPartRepairSupabaseCompatSyncPlanOwnerReviewV1["classification_counts"] | null =
    null;
  let planned_slug_count = 0;

  if (loaded.plan) {
    classification_counts = loaded.plan.classification_counts;
    planned_slug_count = loaded.plan.planned_slug_count;
    const shape = validatePlanShape(loaded.plan);
    blocked_reasons.push(...shape.errors);
    removals = shape.removals;
    additions = shape.additions;
    excludedSlugs = shape.excludedSlugs;
  }

  const approvalAbs = path.join(deps.rootDir, ownerApprovalRelPath);
  const approvalFilePresent = fileExists(approvalAbs);
  const approval = findOwnerApprovalRow({
    rootDir: deps.rootDir,
    relPath: ownerApprovalRelPath,
    syncPlanRelPath,
    expectedSlugCount: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_slug_count,
    expectedRemovals: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_removals,
    expectedAdditions: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_EXPECTED_COUNTS_V1.planned_additions,
    referenceTimeIso: generatedAt,
    readText,
  });

  // Dry-run proves approval is absent today; presence is noted but not a dry-run blocker.
  // Apply mode requires a valid matching approval row, then still fail-closes because this
  // executor does not mutate Supabase — a future lane may enable writes after approval.
  if (deps.mode === "apply") {
    if (!approval.row) {
      blocked_reasons.push(...approval.errors);
      blocked_reasons.push(
        "apply mode blocked — matching founder supabase compat sync owner approval required",
      );
    }
    blocked_reasons.push(
      "apply mode blocked — supabase mutation surface is disabled in this executor; dry-run only until an explicit future apply authorization enables writes",
    );
  }

  const final_status: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1["apply_status"] =
    blocked_reasons.length === 0 ? "DRY_RUN_READY" : "BLOCKED";

  const planned_supabase_row_deltas = [...removals, ...additions].sort((a, b) =>
    a.row_key.localeCompare(b.row_key),
  );

  const proven_facts = [
    `PROVEN: mode=${deps.mode}; apply_status=${final_status}; data_mutation=false; supabase_mutation_authorized=false.`,
    `PROVEN: sync_plan_rel_path=${syncPlanRelPath}.`,
    `PROVEN: planned_slug_count=${String(planned_slug_count)}; planned_removals=${String(removals.length)}; planned_additions=${String(additions.length)}.`,
    `PROVEN: owner_approval_present=${String(approvalFilePresent)}; owner_approval_valid=${String(approval.row != null)}; decision_id=${approval.row?.decision_id ?? "none"}.`,
    `PROVEN: excluded_slugs_untouched=${excludedSlugs.join("|")}.`,
    `PROVEN: csv_apply_commit=${GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1}.`,
  ];
  if (deps.mode === "dry_run" && !approvalFilePresent) {
    proven_facts.push(
      `PROVEN: no founder approval artifact at ${ownerApprovalRelPath} (expected for this dry-run lane).`,
    );
  }
  if (final_status === "DRY_RUN_READY") {
    proven_facts.push(
      "PROVEN: sync plan shape verified (read_only=true; supabase_mutation_authorized=false; removals=26; additions=13; CONFLICT_REQUIRES_REVIEW=13).",
    );
  }

  const unknown_facts = [
    "UNKNOWN: When founder will create gswf-wrong-part-repair-supabase-compat-sync-owner-approval-v1.json.",
    "UNKNOWN: Whether a future apply session will enable the Supabase mutation surface after approval.",
  ];

  const risk_notes = [
    "This executor does not mutate Supabase or CSV.",
    "Do not run retailer_links / buy CTA / sitemap / robots / Product JSON-LD changes from this executor.",
    "Do not include PARTIAL or no-filter excluded slugs in any future Supabase sync apply.",
    "Apply mode remains fail-closed without a matching founder approval artifact for this exact sync plan.",
  ];

  return {
    contract: GSWF_WRONG_PART_REPAIR_SUPABASE_COMPAT_SYNC_GUARDED_APPLY_CONTRACT_V1,
    mode: deps.mode,
    read_only: true,
    data_mutation: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    apply_status: final_status,
    blocked_reasons,
    sync_plan_rel_path: syncPlanRelPath,
    owner_approval_rel_path: ownerApprovalRelPath,
    owner_approval_present: approvalFilePresent,
    owner_approval_decision_id: approval.row?.decision_id ?? null,
    owner_approval_valid: approval.row != null,
    owner_approval_required_for_apply: true,
    csv_apply_commit: GSWF_WRONG_PART_REPAIR_CSV_APPLY_COMMIT_V1,
    planned_slug_count,
    planned_removals: removals.length,
    planned_additions: additions.length,
    classification_counts,
    excluded_slugs_untouched: excludedSlugs,
    planned_supabase_row_deltas,
    planned_removal_row_keys: removals.map((row) => row.row_key).sort(),
    planned_addition_row_keys: additions.map((row) => row.row_key).sort(),
    generated_at: generatedAt,
    source_command: GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_SOURCE_COMMAND_V1,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(
  report: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1,
): string {
  const lines: string[] = [
    "# GSWF wrong-part repair — Supabase compatibility sync guarded dry-run v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- read_only: **${String(report.read_only)}**`,
    `- data_mutation: **false**`,
    `- supabase_mutation_authorized: **false**`,
    `- owner_approval_present: **${String(report.owner_approval_present)}**`,
    `- owner_approval_valid: **${String(report.owner_approval_valid)}**`,
    `- owner_approval_required_for_apply: **true**`,
    `- owner_approval_decision_id: \`${report.owner_approval_decision_id ?? "none"}\``,
    "",
    "## Sources",
    "",
    `- sync_plan: \`${report.sync_plan_rel_path}\``,
    `- owner_approval: \`${report.owner_approval_rel_path}\``,
    `- csv_apply_commit: \`${report.csv_apply_commit}\``,
    "",
    "## Planned Supabase changes (NOT applied)",
    "",
    `- planned_slug_count: ${String(report.planned_slug_count)}`,
    `- planned_removals: ${String(report.planned_removals)}`,
    `- planned_additions: ${String(report.planned_additions)}`,
    `- excluded_slugs_untouched: \`${report.excluded_slugs_untouched.join("|")}\``,
    "",
  ];

  if (report.classification_counts) {
    lines.push("## Classification counts (from sync plan)", "");
    for (const [key, value] of Object.entries(report.classification_counts)) {
      lines.push(`- **${key}**: ${String(value)}`);
    }
    lines.push("");
  }

  lines.push("## Exact Supabase row deltas (plan only)", "");
  for (const delta of report.planned_supabase_row_deltas) {
    lines.push(`- **${delta.operation}** \`${delta.row_key}\``);
  }

  if (report.blocked_reasons.length > 0) {
    lines.push("", "## Blocked reasons", "", ...report.blocked_reasons.map((r) => `- ${r}`));
  }

  lines.push("", "## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of report.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunArtifactsV1(args: {
  rootDir: string;
  report: GswfWrongPartRepairSupabaseCompatSyncGuardedApplyReportV1;
  jsonRelPath?: string;
  mdRelPath?: string;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = args.jsonRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_JSON_REL_V1;
  const mdRel = args.mdRelPath ?? GSWF_WRONG_PART_SUPABASE_COMPAT_SYNC_GUARDED_DRY_RUN_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    buildGswfWrongPartRepairSupabaseCompatSyncGuardedDryRunMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
