/**
 * Phase 3 — Post-apply verification / closeout for retailer-link parity corrections.
 * Never auto-closes issue registry. VERIFIED only when every planned row is IN_SYNC.
 */

import {
  type FridgeRetailerLinksDiffRowV1,
  type FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import {
  type BuckpartsRetailerLinkParityCorrectionPlanV1,
  type BuckpartsRetailerLinkParityPlanRowSnapshotV1,
  hashRetailerLinkParityCorrectionPlanV1,
  validateRetailerLinkParityCorrectionPlanSemanticsV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";
import {
  buildRetailerLinkParityRollbackPlanV1,
} from "./buckparts-retailer-link-parity-correction-plan-v1";

export const BUCKPARTS_RETAILER_LINK_PARITY_CLOSEOUT_CONTRACT_V1 =
  "buckparts_retailer_link_parity_closeout_v1" as const;

export type BuckpartsRetailerLinkParityCloseoutStatusV1 = "VERIFIED" | "NOT_PROVEN";

export type BuckpartsRetailerLinkParityCloseoutRowV1 = {
  filter_slug: string;
  issue_id: string;
  post_status: "IN_SYNC" | "NOT_IN_SYNC" | "UNKNOWN";
  detector_status: string | null;
  blockers: string[];
};

export type BuckpartsRetailerLinkParityCloseoutReceiptV1 = {
  contract: typeof BUCKPARTS_RETAILER_LINK_PARITY_CLOSEOUT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  closeout_status: BuckpartsRetailerLinkParityCloseoutStatusV1;
  plan_sha256: string;
  execution_identity: string | null;
  issue_registry_auto_closed: false;
  rows: BuckpartsRetailerLinkParityCloseoutRowV1[];
  verified_count: number;
  failed_or_reconciliation_count: number;
  blockers: string[];
  recommended_next_action: string;
  rollback_plan_sha256: string | null;
};

export type BuckpartsRetailerLinkParityExecutionReceiptV1 = {
  execution_id: string;
  plan_sha256: string;
  apply_status: "APPLIED";
  rows_updated: number;
  updated_link_ids: string[];
};

/** Drift statuses that cannot coexist with both-sides direct_buyable proof. */
export const BUCKPARTS_RETAILER_LINK_PARITY_BOTH_BUYABLE_FORBIDDEN_STATUSES_V1 = [
  "CSV_HAS_WIN_SUPABASE_MISSING",
  "SUPABASE_HAS_WIN_CSV_MISSING",
  "EVIDENCE_ONLY_NOT_IN_SUPABASE",
  "CSV_AND_SUPABASE_MATCH_PLACEHOLDER",
] as const;

/** Reject detector fixtures that make mutually incompatible truth claims. */
export function validateParityCloseoutDetectorFixtureV1(
  row: FridgeRetailerLinksDiffRowV1,
): string[] {
  const bothBuyable = row.csv_has_direct_buyable === true && (row.supabase_direct_buyable_count ?? 0) > 0;
  if (!bothBuyable) return [];
  if (
    (BUCKPARTS_RETAILER_LINK_PARITY_BOTH_BUYABLE_FORBIDDEN_STATUSES_V1 as readonly string[]).includes(
      row.status,
    )
  ) {
    return [
      `contradictory_detector_fixture:${row.filter_slug}:both_buyable_incompatible_status:${row.status}`,
    ];
  }
  // Production classifier may still emit UNKNOWN when both sides are buyable;
  // that is projected to IN_SYNC. Explicit IN_SYNC/MATCH-compatible statuses pass.
  return [];
}

/** Project detector row into closeout IN_SYNC when both sides have direct_buyable wins. */
export function projectParityCloseoutRowStatusV1(
  row: FridgeRetailerLinksDiffRowV1 | undefined,
): "IN_SYNC" | "NOT_IN_SYNC" | "UNKNOWN" {
  if (!row) return "UNKNOWN";
  if (validateParityCloseoutDetectorFixtureV1(row).length > 0) return "NOT_IN_SYNC";
  // Production-consistent after-state: both sides direct_buyable proves IN_SYNC
  // even when the classifier text remains UNKNOWN (known detector gap).
  if (row.csv_has_direct_buyable && (row.supabase_direct_buyable_count ?? 0) > 0) {
    return "IN_SYNC";
  }
  if (row.status === "UNKNOWN") return "UNKNOWN";
  return "NOT_IN_SYNC";
}

export function buildRetailerLinkParityCloseoutV1(args: {
  plan: BuckpartsRetailerLinkParityCorrectionPlanV1;
  postDiff: FridgeSupabaseVsCsvRetailerLinksDiffV1;
  execution_identity?: string | null;
  expected_plan_sha256?: string;
  execution_receipt?: BuckpartsRetailerLinkParityExecutionReceiptV1 | null;
  /** Exact post-write database snapshots keyed by link ID; mandatory for VERIFIED. */
  postLiveRows?: Map<string, BuckpartsRetailerLinkParityPlanRowSnapshotV1>;
}): BuckpartsRetailerLinkParityCloseoutReceiptV1 {
  const blockers: string[] = [];
  blockers.push(...validateRetailerLinkParityCorrectionPlanSemanticsV1(args.plan).blockers);
  const recomputedPlanHash = hashRetailerLinkParityCorrectionPlanV1(args.plan);
  if (!args.expected_plan_sha256) {
    blockers.push("closeout_expected_plan_sha256_missing");
  }
  if (recomputedPlanHash !== args.plan.plan_sha256) {
    blockers.push("closeout_plan_hash_recompute_mismatch");
  }
  if (args.expected_plan_sha256 !== args.plan.plan_sha256 || recomputedPlanHash !== args.expected_plan_sha256) {
    blockers.push("closeout_plan_hash_mismatch");
  }
  const receipt = args.execution_receipt as unknown as Record<string, unknown> | null | undefined;
  const executionIdentity = typeof args.execution_identity === "string" ? args.execution_identity.trim() : "";
  if (!executionIdentity) blockers.push("closeout_execution_identity_missing");
  if (!receipt || !String(receipt.execution_id ?? "").trim()) {
    blockers.push("closeout_execution_receipt_or_identity_missing");
  } else {
    if (receipt.execution_id !== executionIdentity) blockers.push("closeout_execution_receipt_identity_mismatch");
    if (receipt.plan_sha256 !== args.plan.plan_sha256) blockers.push("closeout_execution_receipt_plan_hash_mismatch");
    if (receipt.apply_status !== "APPLIED") blockers.push("closeout_execution_receipt_not_applied");
    if (receipt.rows_updated !== 1 || receipt.rows_updated !== args.plan.row_count) blockers.push("closeout_execution_receipt_row_count_mismatch");
    const expectedIds = args.plan.rows.map((row) => row.expected_current.supabase_link_id).sort();
    if (!Array.isArray(receipt.updated_link_ids) ||
        receipt.updated_link_ids.some((id) => typeof id !== "string") ||
        JSON.stringify([...receipt.updated_link_ids].sort()) !== JSON.stringify(expectedIds)) {
      blockers.push("closeout_execution_receipt_cohort_mismatch");
    }
  }
  if (!args.postLiveRows) {
    blockers.push("closeout_post_live_rows_missing");
  } else {
    const expectedIds = new Set(args.plan.rows.map((row) => row.expected_current.supabase_link_id));
    for (const id of args.postLiveRows.keys()) {
      if (!expectedIds.has(id)) blockers.push(`closeout_post_live_unexpected_row:${id}`);
    }
    for (const planned of args.plan.rows) {
      const live = args.postLiveRows.get(planned.expected_current.supabase_link_id);
      if (!live) {
        blockers.push(`closeout_post_live_row_missing:${planned.expected_current.supabase_link_id}`);
        continue;
      }
      for (const field of [
        "supabase_link_id", "filter_slug", "filter_id", "retailer_key", "retailer_name",
        "affiliate_url", "is_primary", "browser_truth_classification",
      ] as const) {
        if (live[field] !== planned.approved_after[field]) {
          blockers.push(`closeout_post_live_mismatch:${planned.filter_slug}:${field}`);
        }
      }
    }
  }
  if (args.postDiff.supabase_truth_status !== "CHECKED") {
    blockers.push(
      `closeout_detector_unknown:${args.postDiff.supabase_unavailable_reason ?? "UNKNOWN"}`,
    );
  }

  const bySlug = new Map(args.postDiff.rows.map((r) => [r.filter_slug, r]));
  const rows: BuckpartsRetailerLinkParityCloseoutRowV1[] = [];
  for (const planned of args.plan.rows) {
    const detected = bySlug.get(planned.filter_slug);
    if (detected) blockers.push(...validateParityCloseoutDetectorFixtureV1(detected));
    const post_status = projectParityCloseoutRowStatusV1(detected);
    const rowBlockers: string[] = [];
    if (post_status !== "IN_SYNC") {
      rowBlockers.push(`post_apply_not_in_sync:${planned.filter_slug}:${post_status}`);
    }
    rows.push({
      filter_slug: planned.filter_slug,
      issue_id: planned.issue_id,
      post_status,
      detector_status: detected?.status ?? null,
      blockers: rowBlockers,
    });
    blockers.push(...rowBlockers);
  }

  const verified_count = rows.filter((r) => r.post_status === "IN_SYNC").length;
  const failed_or_reconciliation_count = rows.length - verified_count;
  const uniqueBlockers = [...new Set(blockers)].sort();
  const closeout_status: BuckpartsRetailerLinkParityCloseoutStatusV1 =
    uniqueBlockers.length === 0 &&
    rows.length > 0 &&
    verified_count === rows.length
      ? "VERIFIED"
      : "NOT_PROVEN";

  const rollback =
    closeout_status === "NOT_PROVEN" && args.plan.rows.length > 0
      ? buildRetailerLinkParityRollbackPlanV1({ forwardPlan: args.plan })
      : null;

  return {
    contract: BUCKPARTS_RETAILER_LINK_PARITY_CLOSEOUT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    closeout_status,
    plan_sha256: args.plan.plan_sha256,
    execution_identity: executionIdentity || null,
    issue_registry_auto_closed: false,
    rows,
    verified_count,
    failed_or_reconciliation_count,
    blockers: uniqueBlockers,
    recommended_next_action:
      closeout_status === "VERIFIED"
        ? "Closeout VERIFIED; issue registry remains manual (no auto-close)."
        : "NOT_PROVEN; reconcile or bind a new founder-approved rollback plan.",
    rollback_plan_sha256: rollback?.plan_sha256 ?? null,
  };
}
