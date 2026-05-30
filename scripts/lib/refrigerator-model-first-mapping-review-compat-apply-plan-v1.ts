/**
 * Approval-gated read-only compatibility_mappings.csv apply plan v1.
 * Derived from mapping-review reconciliation plan — no CSV/Supabase/public/buy-link apply.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1,
  buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1,
  type MappingReviewReconciliationPlanRowV1,
  type RefrigeratorModelFirstMappingReviewReconciliationPlanV1,
} from "./refrigerator-model-first-mapping-review-reconciliation-plan-v1";

export const REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1 =
  "refrigerator_model_first_mapping_review_compat_apply_plan_v1" as const;

export const COMPAT_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;

export type CompatCsvRowV1 = { fridge_slug: string; filter_slug: string };

export type PlannedCompatCsvRowChangeV1 = {
  operation: "remove" | "add";
  fridge_slug: string;
  filter_slug: string;
  csv_row_key: string;
  exists_in_committed_csv: boolean | null;
};

export type MappingReviewCompatApplyPlanRowV1 = {
  refrigerator_model: string;
  fridge_slug: string;
  official_filter_token_or_name: string;
  planned_removals: PlannedCompatCsvRowChangeV1[];
  planned_additions: PlannedCompatCsvRowChangeV1[];
  planned_keeps: string[];
  not_applied: true;
};

export type MappingReviewCompatApplyPlanInspectSummaryV1 = {
  recommended_jq_paths: { standalone_report: ".inspect_summary" };
  mapping_review_model_count: number;
  total_planned_removals: number;
  total_planned_additions: number;
  total_planned_keeps: number;
  apply_authorized: false;
  founder_approval_required: true;
  founder_approval_status: "pending";
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  recommended_next_action: string;
};

export type RefrigeratorModelFirstMappingReviewCompatApplyPlanV1 = {
  contract: typeof REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  apply_authorized: false;
  founder_approval_required: true;
  founder_approval_status: "pending";
  waiting_for_founder_approval: true;
  generated_at: string;
  source_contract: typeof REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1;
  source_manifest_path: string;
  target_csv_rel_path: typeof COMPAT_MAPPINGS_CSV_REL_V1;
  exact_repo_paths_read: string[];
  rows: MappingReviewCompatApplyPlanRowV1[];
  planned_compat_csv_row_removals: PlannedCompatCsvRowChangeV1[];
  planned_compat_csv_row_additions: PlannedCompatCsvRowChangeV1[];
  csv_apply_authorized: false;
  supabase_update_authorized: false;
  buy_link_mutation_authorized: false;
  public_page_change_authorized: false;
  inspect_summary: MappingReviewCompatApplyPlanInspectSummaryV1;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function parseCompatRowKey(rowKey: string): { fridge_slug: string; filter_slug: string } {
  const comma = rowKey.indexOf(",");
  if (comma === -1) {
    throw new Error(`Invalid compat row key: ${rowKey}`);
  }
  return {
    fridge_slug: rowKey.slice(0, comma).trim().toLowerCase(),
    filter_slug: rowKey.slice(comma + 1).trim().toLowerCase(),
  };
}

function readCompatMappingsCsv(rootDir: string): Set<string> {
  const abs = path.join(rootDir, COMPAT_MAPPINGS_CSV_REL_V1);
  const rows = parse(readFileSync(abs, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CompatCsvRowV1[];
  return new Set(
    rows.map((r) => `${r.fridge_slug.trim().toLowerCase()},${r.filter_slug.trim().toLowerCase()}`),
  );
}

function toPlannedChange(args: {
  operation: "remove" | "add";
  rowKey: string;
  committedRows: Set<string>;
}): PlannedCompatCsvRowChangeV1 {
  const { fridge_slug, filter_slug } = parseCompatRowKey(args.rowKey);
  const csv_row_key = `${fridge_slug},${filter_slug}`;
  const exists = args.committedRows.has(csv_row_key);
  return {
    operation: args.operation,
    fridge_slug,
    filter_slug,
    csv_row_key,
    exists_in_committed_csv: args.operation === "remove" ? exists : exists,
  };
}

function buildApplyPlanRow(args: {
  reconciliationRow: MappingReviewReconciliationPlanRowV1;
  committedRows: Set<string>;
}): MappingReviewCompatApplyPlanRowV1 {
  const changes = args.reconciliationRow.proposed_future_compat_changes;
  const planned_removals = changes.remove_rows.map((rowKey) =>
    toPlannedChange({ operation: "remove", rowKey, committedRows: args.committedRows }),
  );
  const planned_additions = changes.add_rows.map((rowKey) =>
    toPlannedChange({ operation: "add", rowKey, committedRows: args.committedRows }),
  );

  return {
    refrigerator_model: args.reconciliationRow.refrigerator_model,
    fridge_slug: args.reconciliationRow.fridge_slug,
    official_filter_token_or_name: args.reconciliationRow.official_filter_token_or_name,
    planned_removals,
    planned_additions,
    planned_keeps: changes.keep_rows,
    not_applied: true,
  };
}

export function buildRefrigeratorModelFirstMappingReviewCompatApplyPlanV1(args: {
  rootDir: string;
  manifestRelPath: string;
  now?: () => Date;
  reconciliationPlan?: RefrigeratorModelFirstMappingReviewReconciliationPlanV1;
}): RefrigeratorModelFirstMappingReviewCompatApplyPlanV1 {
  const now = args.now ?? (() => new Date());
  const generated_at = now().toISOString();

  const reconciliationPlan =
    args.reconciliationPlan ??
    buildRefrigeratorModelFirstMappingReviewReconciliationPlanV1({
      rootDir: args.rootDir,
      manifestRelPath: args.manifestRelPath,
      now: args.now,
    });

  const committedRows = readCompatMappingsCsv(args.rootDir);

  const rows = reconciliationPlan.rows.map((reconciliationRow) =>
    buildApplyPlanRow({ reconciliationRow, committedRows }),
  );

  const planned_compat_csv_row_removals = rows.flatMap((row) => row.planned_removals);
  const planned_compat_csv_row_additions = rows.flatMap((row) => row.planned_additions);
  const total_planned_keeps = rows.reduce((sum, row) => sum + row.planned_keeps.length, 0);

  const inspect_summary: MappingReviewCompatApplyPlanInspectSummaryV1 = {
    recommended_jq_paths: { standalone_report: ".inspect_summary" },
    mapping_review_model_count: rows.length,
    total_planned_removals: planned_compat_csv_row_removals.length,
    total_planned_additions: planned_compat_csv_row_additions.length,
    total_planned_keeps,
    apply_authorized: false,
    founder_approval_required: true,
    founder_approval_status: "pending",
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    recommended_next_action:
      "BLOCKED: Founder approval required before any compatibility_mappings.csv apply. This artifact lists exact future row removals/additions only — nothing has been applied.",
  };

  const proven_facts = [
    `PROVEN: source_contract=${REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1}.`,
    `PROVEN: target_csv=${COMPAT_MAPPINGS_CSV_REL_V1}.`,
    "PROVEN: apply_authorized=false; founder_approval_required=true; founder_approval_status=pending.",
    "PROVEN: csv_apply_authorized=false; supabase_update_authorized=false; buy_link_mutation_authorized=false; public_page_change_authorized=false.",
    "PROVEN: every row has not_applied=true.",
  ];

  const inferred_facts = [
    `INFERRED: total_planned_removals=${String(planned_compat_csv_row_removals.length)}; total_planned_additions=${String(planned_compat_csv_row_additions.length)}; total_planned_keeps=${String(total_planned_keeps)}.`,
    "INFERRED: planned removals verified against committed CSV existence where applicable.",
  ];

  const unknown_facts = [
    "UNKNOWN: When founder will approve this compat apply packet.",
    "UNKNOWN: Whether live Supabase compatibility_mappings matches committed CSV at apply time.",
  ];

  return {
    contract: REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_COMPAT_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    apply_authorized: false,
    founder_approval_required: true,
    founder_approval_status: "pending",
    waiting_for_founder_approval: true,
    generated_at,
    source_contract: REFRIGERATOR_MODEL_FIRST_MAPPING_REVIEW_RECONCILIATION_PLAN_CONTRACT_V1,
    source_manifest_path: args.manifestRelPath,
    target_csv_rel_path: COMPAT_MAPPINGS_CSV_REL_V1,
    exact_repo_paths_read: [
      args.manifestRelPath,
      COMPAT_MAPPINGS_CSV_REL_V1,
      ...reconciliationPlan.exact_repo_paths_read,
    ],
    rows,
    planned_compat_csv_row_removals,
    planned_compat_csv_row_additions,
    csv_apply_authorized: false,
    supabase_update_authorized: false,
    buy_link_mutation_authorized: false,
    public_page_change_authorized: false,
    inspect_summary,
    proven_facts,
    inferred_facts,
    unknown_facts,
  };
}
