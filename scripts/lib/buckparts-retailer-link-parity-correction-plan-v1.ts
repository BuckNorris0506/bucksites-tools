/**
 * Phase 3 — Deterministic UPDATE-only correction plan for retailer-link parity.
 * Cohort from intake candidates only; SHA-256 bindable; no hardcoded GE/MWFP/XWFE cohort.
 */

import { createHash } from "node:crypto";

import {
  BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
  type BuckpartsRetailerLinkParityIssueCandidateV1,
  type BuckpartsRetailerLinkParityIssueIntakeReportV1,
} from "./buckparts-retailer-link-parity-issue-intake-v1";

export {
  BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
  BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
} from "./buckparts-retailer-link-parity-issue-intake-v1";

export const BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1 =
  "buckparts_retailer_link_parity_correction_plan_v1" as const;
/** v1 deliberately caps application at one row; detection and planning may still batch. */
export const BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1 = 1 as const;

export type BuckpartsRetailerLinkParityPlanRowSnapshotV1 = {
  filter_slug: string;
  filter_id: string;
  supabase_link_id: string;
  affiliate_url: string;
  retailer_key: string | null;
  retailer_name: string | null;
  browser_truth_classification: string | null;
  is_primary: true;
};

export type BuckpartsRetailerLinkParityCorrectionPlanRowV1 = {
  issue_id: string;
  filter_slug: string;
  table: typeof BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1;
  wedge: typeof BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1;
  operation: "UPDATE";
  expected_current: BuckpartsRetailerLinkParityPlanRowSnapshotV1;
  approved_after: BuckpartsRetailerLinkParityPlanRowSnapshotV1;
  before_row: BuckpartsRetailerLinkParityPlanRowSnapshotV1;
  after_row: BuckpartsRetailerLinkParityPlanRowSnapshotV1;
  rollback_restore_before_row: BuckpartsRetailerLinkParityPlanRowSnapshotV1;
  source_evidence: string[];
  defect_class: string;
};

export type BuckpartsRetailerLinkParityCorrectionPlanV1 = {
  contract: typeof BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  generated_at: string;
  intake_contract: typeof BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1;
  table: typeof BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1;
  wedge: typeof BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1;
  operation: "UPDATE";
  insert_posture: "forbidden";
  delete_posture: "forbidden";
  upsert_posture: "forbidden";
  apply_model: "single_row_apply_v1";
  row_count: number;
  rows: BuckpartsRetailerLinkParityCorrectionPlanRowV1[];
  plan_sha256: string;
  blockers: string[];
  recommended_next_action: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export const SNAPSHOT_KEYS_V1 = [
  "filter_slug",
  "filter_id",
  "supabase_link_id",
  "affiliate_url",
  "retailer_key",
  "retailer_name",
  "browser_truth_classification",
  "is_primary",
] as const;

export const PLAN_ROW_KEYS_V1 = [
  "issue_id",
  "filter_slug",
  "table",
  "wedge",
  "operation",
  "expected_current",
  "approved_after",
  "before_row",
  "after_row",
  "rollback_restore_before_row",
  "source_evidence",
  "defect_class",
] as const;

export const PLAN_TOP_LEVEL_KEYS_V1 = [
  "contract",
  "read_only",
  "data_mutation",
  "mutation_authorized",
  "generated_at",
  "intake_contract",
  "table",
  "wedge",
  "operation",
  "insert_posture",
  "delete_posture",
  "upsert_posture",
  "apply_model",
  "row_count",
  "rows",
  "plan_sha256",
  "blockers",
  "recommended_next_action",
] as const;

function sameSnapshotV1(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function ownKeysV1(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.getOwnPropertyNames(value)
    : [];
}

function exactOwnShapeBlockersV1(
  value: unknown,
  allowed: readonly string[],
  unexpectedPrefix: string,
  missingPrefix?: string,
): string[] {
  const keys = ownKeysV1(value);
  const blockers = keys
    .filter((key) => !allowed.includes(key))
    .map((key) => `${unexpectedPrefix}:${key}`);
  if (missingPrefix) {
    blockers.push(...allowed
      .filter((key) => !keys.includes(key))
      .map((key) => `${missingPrefix}:${key}`));
  }
  return blockers;
}

/** Canonical semantic boundary for every plan consumer, including the writer. */
export function validateRetailerLinkParityCorrectionPlanSemanticsV1(
  plan: BuckpartsRetailerLinkParityCorrectionPlanV1,
): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const unsafePlan = plan as unknown as Record<string, unknown>;
  blockers.push(...exactOwnShapeBlockersV1(
    plan,
    PLAN_TOP_LEVEL_KEYS_V1,
    "plan_unexpected_key",
    "plan_required_key_missing",
  ));
  // This is deliberately first: no consumer may reinterpret a plan as an
  // INSERT, DELETE, or UPSERT while doing deeper validation.
  if (unsafePlan.operation !== "UPDATE") blockers.push("plan_operation_not_update");
  if (!Array.isArray(unsafePlan.rows)) {
    blockers.push("plan_rows_invalid");
    return { ok: false, blockers: [...new Set(blockers)].sort() };
  }
  if (plan.apply_model !== "single_row_apply_v1" || plan.row_count > BUCKPARTS_RETAILER_LINK_PARITY_APPLY_MAX_ROWS_V1) {
    blockers.push("plan_apply_model_invalid");
  }
  if (plan.row_count !== plan.rows.length) blockers.push("plan_row_count_internal_mismatch");
  const identities = new Set<string>();
  for (const rawRow of plan.rows) {
    const row = rawRow as unknown as Record<string, unknown>;
    blockers.push(...exactOwnShapeBlockersV1(
      rawRow,
      PLAN_ROW_KEYS_V1,
      "plan_row_unexpected_key",
      "plan_row_required_key_missing",
    ));
    if (row.operation !== "UPDATE" || row.operation !== unsafePlan.operation) {
      blockers.push("plan_operation_not_update");
    }
    const typedRow = rawRow as BuckpartsRetailerLinkParityCorrectionPlanRowV1;
    if (typedRow.table !== plan.table || typedRow.table !== BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1) {
      blockers.push("plan_identity_mismatch:table");
    }
    if (typedRow.wedge !== plan.wedge || typedRow.wedge !== BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1) {
      blockers.push("plan_identity_mismatch:wedge");
    }
    const snapshots: Array<[string, unknown]> = [
      ["expected_current", typedRow.expected_current],
      ["before_row", typedRow.before_row],
      ["approved_after", typedRow.approved_after],
      ["after_row", typedRow.after_row],
      ["rollback_restore_before_row", typedRow.rollback_restore_before_row],
    ];
    for (const [snapshotName, snapshot] of snapshots) {
      blockers.push(...exactOwnShapeBlockersV1(
        snapshot,
        SNAPSHOT_KEYS_V1,
        `plan_snapshot_unexpected_key:${snapshotName}`,
        `plan_snapshot_required_key_missing:${snapshotName}`,
      ));
    }
    for (const field of ["supabase_link_id", "filter_slug", "filter_id"] as const) {
      const values = snapshots.map(([, snapshot]) =>
        snapshot && typeof snapshot === "object" && Object.hasOwn(snapshot, field)
          ? (snapshot as Record<string, unknown>)[field]
          : undefined,
      );
      if (values.some((value) => typeof value !== "string" || !value.trim()) ||
          values.some((value) => value !== values[0])) {
        blockers.push(`plan_identity_mismatch:${field}`);
      }
    }
    if (!sameSnapshotV1(typedRow.expected_current, typedRow.before_row)) blockers.push("plan_before_snapshot_mismatch");
    if (!sameSnapshotV1(typedRow.approved_after, typedRow.after_row)) blockers.push("plan_after_snapshot_mismatch");
    if (!sameSnapshotV1(typedRow.rollback_restore_before_row, typedRow.before_row)) blockers.push("plan_rollback_snapshot_mismatch");
    const identity = `${typedRow.expected_current?.supabase_link_id}|${typedRow.expected_current?.filter_slug}|${typedRow.expected_current?.filter_id}`;
    if (identities.has(identity)) blockers.push("plan_duplicate_identity");
    identities.add(identity);
  }
  return { ok: blockers.length === 0, blockers: [...new Set(blockers)].sort() };
}

export function hashRetailerLinkParityCorrectionPlanV1(
  plan: Omit<BuckpartsRetailerLinkParityCorrectionPlanV1, "plan_sha256" | "generated_at"> & {
    generated_at?: string;
    plan_sha256?: string;
    recommended_next_action?: string;
  },
): string {
  // Exclude non-binding presentation fields so recompute from a sealed plan matches.
  // recommended_next_action may embed plan_sha256 after sealing (circular otherwise).
  const {
    generated_at: _g,
    plan_sha256: _p,
    recommended_next_action: _n,
    ...rest
  } = plan as BuckpartsRetailerLinkParityCorrectionPlanV1;
  void _g;
  void _p;
  void _n;
  return createHash("sha256").update(stableStringify(rest)).digest("hex");
}

function snapshotFromExisting(
  c: BuckpartsRetailerLinkParityIssueCandidateV1,
): BuckpartsRetailerLinkParityPlanRowSnapshotV1 {
  return {
    filter_slug: c.filter_slug,
    filter_id: c.existing_row.filter_id,
    supabase_link_id: c.existing_row.supabase_link_id,
    affiliate_url: c.existing_row.current_affiliate_url,
    retailer_key: c.existing_row.current_retailer_key,
    retailer_name: c.existing_row.current_retailer_name,
    browser_truth_classification: c.existing_row.current_browser_truth_classification,
    is_primary: true,
  };
}

function approvedAfterFromCandidate(
  c: BuckpartsRetailerLinkParityIssueCandidateV1,
): BuckpartsRetailerLinkParityPlanRowSnapshotV1 | null {
  const url = (c.csv_primary_url ?? "").trim();
  if (!url) return null;
  return {
    filter_slug: c.filter_slug,
    filter_id: c.existing_row.filter_id,
    supabase_link_id: c.existing_row.supabase_link_id,
    affiliate_url: url,
    retailer_key: c.csv_primary_retailer,
    retailer_name: c.csv_primary_retailer,
    browser_truth_classification: "direct_buyable",
    is_primary: true,
  };
}

export function buildRetailerLinkParityCorrectionPlanV1(args: {
  intake: BuckpartsRetailerLinkParityIssueIntakeReportV1;
  now?: () => Date;
}): BuckpartsRetailerLinkParityCorrectionPlanV1 {
  const blockers: string[] = [];
  const generated_at = (args.now ?? (() => new Date()))().toISOString();

  if (args.intake.contract !== BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1) {
    blockers.push("intake_contract_mismatch");
  }
  if (args.intake.blockers.some((b) => b.includes("unknown_or_db_unavailable"))) {
    blockers.push("unknown_evidence_refuses_plan");
  }

  const candidates = [...(args.intake.candidates ?? [])].sort((a, b) =>
    a.issue_id.localeCompare(b.issue_id),
  );

  if (candidates.length === 0) {
    blockers.push("zero_row_plan_refused");
  }

  const seen = new Set<string>();
  const rows: BuckpartsRetailerLinkParityCorrectionPlanRowV1[] = [];
  for (const c of candidates) {
    if (seen.has(c.existing_row.supabase_link_id) || seen.has(c.issue_id)) {
      blockers.push(`duplicate_row_identity:${c.issue_id}`);
      continue;
    }
    seen.add(c.existing_row.supabase_link_id);
    seen.add(c.issue_id);

    if (c.operation !== "UPDATE" || c.insert_delete_posture !== "forbidden") {
      blockers.push(`unsupported_mutation_direction:${c.issue_id}`);
      continue;
    }
    if (!String(c.table ?? "").trim()) {
      blockers.push(`malformed_table:${c.issue_id}`);
      continue;
    }
    if (c.table !== BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1) {
      blockers.push(`unsupported_table:${c.issue_id}:${c.table}`);
      continue;
    }
    if (c.wedge !== BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1) {
      blockers.push(`unsupported_wedge:${c.issue_id}:${c.wedge}`);
      continue;
    }

    const before = snapshotFromExisting(c);
    const after = approvedAfterFromCandidate(c);
    if (!after) {
      blockers.push(`missing_approved_after_values:${c.issue_id}`);
      continue;
    }
    if (before.affiliate_url === after.affiliate_url) {
      blockers.push(`no_op_update_refused:${c.issue_id}`);
      continue;
    }

    rows.push({
      issue_id: c.issue_id,
      filter_slug: c.filter_slug,
      table: BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
      wedge: BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
      operation: "UPDATE",
      expected_current: before,
      approved_after: after,
      before_row: before,
      after_row: after,
      rollback_restore_before_row: before,
      source_evidence: [...c.evidence_win_artifacts].sort(),
      defect_class: c.defect_class,
    });
  }

  const draft = {
    contract: BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    intake_contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
    table: BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
    wedge: BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
    operation: "UPDATE" as const,
    insert_posture: "forbidden" as const,
    delete_posture: "forbidden" as const,
    upsert_posture: "forbidden" as const,
    apply_model: "single_row_apply_v1" as const,
    row_count: rows.length,
    rows,
    blockers: [...new Set(blockers)].sort(),
    recommended_next_action: "",
  };

  if (rows.length === 0 && !draft.blockers.includes("zero_row_plan_refused")) {
    draft.blockers.push("zero_row_plan_refused");
    draft.blockers.sort();
  }
  if (rows.length > 0) {
    const semantic = validateRetailerLinkParityCorrectionPlanSemanticsV1({
      ...draft,
      generated_at,
      plan_sha256: "",
    });
    draft.blockers.push(...semantic.blockers);
    draft.blockers = [...new Set(draft.blockers)].sort();
  }

  const plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(draft);
  draft.recommended_next_action =
    draft.blockers.length > 0 || rows.length === 0
      ? "Refuse plan; clear blockers before founder approval binding."
      : `Owner-review packet next; bind founder approval to plan_sha256=${plan_sha256}.`;

  return {
    ...draft,
    generated_at,
    plan_sha256,
  };
}

/** Build a rollback plan that restores before_row values (still UPDATE-only; new approval required). */
export function buildRetailerLinkParityRollbackPlanV1(args: {
  forwardPlan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  now?: () => Date;
}): BuckpartsRetailerLinkParityCorrectionPlanV1 {
  const rows: BuckpartsRetailerLinkParityCorrectionPlanRowV1[] = args.forwardPlan.rows.map((r) => {
    const restore = r.rollback_restore_before_row;
    const currentAfterApply = r.after_row;
    return {
      ...r,
      issue_id: `rollback:${r.issue_id}`,
      expected_current: currentAfterApply,
      approved_after: restore,
      before_row: currentAfterApply,
      after_row: restore,
      rollback_restore_before_row: currentAfterApply,
      defect_class: `rollback:${r.defect_class}`,
      source_evidence: [...r.source_evidence, "rollback_restore_before_row"],
    };
  });
  const draft = {
    contract: BUCKPARTS_RETAILER_LINK_PARITY_CORRECTION_PLAN_CONTRACT_V1,
    read_only: true as const,
    data_mutation: false as const,
    mutation_authorized: false as const,
    intake_contract: BUCKPARTS_RETAILER_LINK_PARITY_ISSUE_INTAKE_CONTRACT_V1,
    table: BUCKPARTS_RETAILER_LINK_PARITY_TABLE_V1,
    wedge: BUCKPARTS_RETAILER_LINK_PARITY_WEDGE_V1,
    operation: "UPDATE" as const,
    insert_posture: "forbidden" as const,
    delete_posture: "forbidden" as const,
    upsert_posture: "forbidden" as const,
    apply_model: "single_row_apply_v1" as const,
    row_count: rows.length,
    rows,
    blockers: rows.length === 0 ? ["zero_row_plan_refused"] : [],
    recommended_next_action: "New founder approval required for rollback plan SHA-256.",
  };
  const plan_sha256 = hashRetailerLinkParityCorrectionPlanV1(draft);
  return {
    ...draft,
    generated_at: (args.now ?? (() => new Date()))().toISOString(),
    plan_sha256,
  };
}
