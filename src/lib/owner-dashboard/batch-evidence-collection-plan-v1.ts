/**
 * Batch Evidence Collection Plan v1 — read-only per-token owner browser capture plan.
 * PROVEN: no I/O; does not write evidence JSON or mutate production.
 * Input: `batch_production_review_report_v1` from `batch-production-lane-v1.ts`.
 */

import {
  BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1,
  BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1,
  BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1,
  type BatchProductionReviewReportRowV1,
  type BatchProductionReviewReportV1,
} from "./batch-production-lane-v1";

export const BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1 =
  "batch_evidence_collection_plan_v1" as const;

export const BATCH_EVIDENCE_COLLECTION_RECOMMENDED_ACTION_V1 =
  "owner_browser_capture_required" as const;

export const BATCH_EVIDENCE_COLLECTION_NO_WRITE_ATTESTATION_V1 =
  "PROVEN: This plan does not authorize writing evidence JSON, Supabase writes, retailer_links mutation, affiliate URL changes, or commits. may_write_evidence and may_mutate are false on every plan row. layer_6_founder_only_approval remains NOT_PROVEN.";

/** Stable check ids aligned with `amazon-rescue-human-verification-packet-v1` browser checks. */
export const BATCH_EVIDENCE_REQUIRED_CHECK_IDS_V1 = [
  "exact_token_visible_on_pdp",
  "pdp_is_product_detail_not_search_or_category",
  "buy_path_visible",
  "stock_buyability_visible",
  "asin_captured_if_amazon",
  "oem_vs_compatible_aftermarket_identified",
  "do_not_label_aftermarket_as_oem",
] as const;

export type BatchEvidenceRequiredCheckIdV1 =
  (typeof BATCH_EVIDENCE_REQUIRED_CHECK_IDS_V1)[number];

export type BatchEvidenceRequiredCheckV1 = {
  check_id: BatchEvidenceRequiredCheckIdV1;
  label: string;
};

export const BATCH_EVIDENCE_COLLECTION_REQUIRED_CHECKS_V1: BatchEvidenceRequiredCheckV1[] =
  [
    {
      check_id: "exact_token_visible_on_pdp",
      label: "Exact token visible on PDP (seller-controlled title / primary identity)",
    },
    {
      check_id: "pdp_is_product_detail_not_search_or_category",
      label: "PDP is a product detail page, not search results or category browse",
    },
    {
      check_id: "buy_path_visible",
      label: "Buy path visible (Add to Cart / Buy Now or explicit unavailable state)",
    },
    {
      check_id: "stock_buyability_visible",
      label: "Stock / buyability visible on PDP (do not guess inventory)",
    },
    {
      check_id: "asin_captured_if_amazon",
      label: "ASIN captured when Amazon PDP (canonical /dp/{ASIN} URL)",
    },
    {
      check_id: "oem_vs_compatible_aftermarket_identified",
      label: "OEM vs compatible aftermarket relationship identified from visible PDP copy",
    },
    {
      check_id: "do_not_label_aftermarket_as_oem",
      label: "Do not label compatible aftermarket listing as OEM",
    },
  ];

export type BatchEvidenceCollectionPlanRowV1 = {
  row_id: string;
  token: string | null;
  slug: string | null;
  source_queue_row_id: string | null;
  evidence_prefix: string | null;
  required_checks: BatchEvidenceRequiredCheckV1[];
  screenshot_needed: true;
  owner_browser_required: true;
  may_write_evidence: false;
  may_mutate: false;
  recommended_next_action: typeof BATCH_EVIDENCE_COLLECTION_RECOMMENDED_ACTION_V1;
  /** PROVEN: copied from batch review row for traceability. */
  review_classification: BatchProductionReviewReportRowV1["classification"];
  review_missing_evidence: string[];
};

export type BatchEvidenceCollectionPlanV1 = {
  contract: typeof BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_evidence: false;
  automation_input: false;
  generated_at: string;
  source_review_contract: typeof BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1;
  source_review_generated_at: string | null;
  plan_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  no_evidence_write_attestation: typeof BATCH_EVIDENCE_COLLECTION_NO_WRITE_ATTESTATION_V1;
  rows: BatchEvidenceCollectionPlanRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

function isBatchProductionReviewReportV1(
  value: unknown,
): value is BatchProductionReviewReportV1 {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return o.contract === BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1;
}

/** PROVEN: evidence collection plan applies when review row still lacks buyer-path / Amazon evidence. */
export function candidateNeedsEvidenceCollectionPlanV1(
  row: BatchProductionReviewReportRowV1,
): boolean {
  if (row.buyer_path_safety === "unknown" || row.buyer_path_safety === "unsafe") {
    return true;
  }
  const missing = row.missing_evidence;
  if (missing.includes(BATCH_MISSING_EVIDENCE_AMAZON_SELF_PREFIX_V1)) return true;
  for (const item of BATCH_MISSING_EVIDENCE_UNKNOWN_BUYER_PATH_V1) {
    if (missing.includes(item)) return true;
  }
  return false;
}

/** Build `data/evidence/amazon-{slug}-` prefix when slug is known. */
export function buildAmazonSelfPrefixEvidencePathV1(slug: string | null): string | null {
  if (!slug || slug.trim().length === 0) return null;
  return `data/evidence/amazon-${slug.trim().toLowerCase()}-`;
}

export type BuildBatchEvidenceCollectionPlanOptionsV1 = {
  reviewReport: BatchProductionReviewReportV1;
  generated_at?: string;
};

/**
 * Pure builder: batch review report → evidence collection plan rows.
 */
export function buildBatchEvidenceCollectionPlanV1(
  options: BuildBatchEvidenceCollectionPlanOptionsV1,
): BatchEvidenceCollectionPlanV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const report = options.reviewReport;

  const rows: BatchEvidenceCollectionPlanRowV1[] = [];
  for (const c of report.candidates) {
    if (!candidateNeedsEvidenceCollectionPlanV1(c)) continue;
    rows.push({
      row_id: c.row_id,
      token: c.token,
      slug: c.slug,
      source_queue_row_id: c.source_queue_row_id,
      evidence_prefix: buildAmazonSelfPrefixEvidencePathV1(c.slug),
      required_checks: [...BATCH_EVIDENCE_COLLECTION_REQUIRED_CHECKS_V1],
      screenshot_needed: true,
      owner_browser_required: true,
      may_write_evidence: false,
      may_mutate: false,
      recommended_next_action: BATCH_EVIDENCE_COLLECTION_RECOMMENDED_ACTION_V1,
      review_classification: c.classification,
      review_missing_evidence: [...c.missing_evidence],
    });
  }

  return {
    contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    automation_input: false,
    generated_at,
    source_review_contract: BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1,
    source_review_generated_at: report.generated_at ?? null,
    plan_row_count: rows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_evidence_write_attestation: BATCH_EVIDENCE_COLLECTION_NO_WRITE_ATTESTATION_V1,
    rows,
    proven_facts: [
      "PROVEN: Plan built read-only from batch_production_review_report_v1 candidates only.",
      "PROVEN: Every plan row has may_write_evidence false and may_mutate false.",
      `PROVEN: plan_row_count=${rows.length} (candidates needing owner browser capture).`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder will capture screenshots or commit evidence JSON after review (separate human step).",
    ],
  };
}

export function parseBatchProductionReviewReportForPlanV1(
  raw: unknown,
): BatchProductionReviewReportV1 {
  if (!isBatchProductionReviewReportV1(raw)) {
    throw new Error(
      `input must be ${BATCH_PRODUCTION_REVIEW_REPORT_CONTRACT_V1} JSON`,
    );
  }
  return raw;
}

/** PROVEN: plan never grants write or mutation authority. */
export function batchEvidenceCollectionPlanGrantsWriteAuthority(
  plan: BatchEvidenceCollectionPlanV1,
): boolean {
  if (plan.may_write_evidence !== false) return true;
  if (plan.data_mutation !== false) return true;
  if (plan.read_only !== true) return true;
  if (plan.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  return plan.rows.some((r) => r.may_write_evidence !== false || r.may_mutate !== false);
}
