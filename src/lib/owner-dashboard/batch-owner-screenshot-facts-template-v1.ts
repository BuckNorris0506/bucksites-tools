/**
 * Batch Owner Screenshot Facts Template v1 — read-only fill-in templates from evidence plan.
 * PROVEN: no I/O; does not write under `data/evidence/`.
 */

import { suggestedOwnerScreenshotEvidencePathV1 } from "../../../scripts/lib/amazon-owner-screenshot-evidence-v1";
import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanRowV1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";

export const BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1 =
  "batch_owner_screenshot_facts_template_v1" as const;

export const BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_NO_WRITE_ATTESTATION_V1 =
  "PROVEN: This template generator does not write evidence JSON, Supabase rows, retailer_links, affiliate URLs, or commits. may_write_evidence is false. layer_6_founder_only_approval remains NOT_PROVEN.";

export const BATCH_OWNER_SCREENSHOT_FACTS_FILL_IN_INSTRUCTIONS_V1 = [
  "Capture ASIN from Amazon PDP if present.",
  "Confirm page is product detail page, not search/category page.",
  "Confirm exact token visibility.",
  "Confirm buy path visible.",
  "Confirm OEM vs compatible aftermarket.",
  "Commit screenshot before durable evidence commit.",
  "Do not label aftermarket as OEM.",
] as const;

/** Nested shape accepted by `normalizeBatchOwnerScreenshotFactsRowV1` in draft packet builder. */
export type BatchOwnerScreenshotFactsTemplateNestedV1 = {
  row_id: string;
  filter_slug: string | null;
  filter_id: null;
  screenshot_sources: Array<{
    label: string;
    path: string;
    committed_to_repo: false;
    captured_at_iso: string;
  }>;
  browser_evidence: {
    token_searched: string;
    asin: string;
    canonical_url: string;
    seller_title_visible: string;
  };
  page_observation: {
    page_kind: string;
    token_visible_in_pdp_title: boolean | null;
    token_visible_elsewhere_on_page: boolean | null;
    seller_controlled_pdp_identity: boolean | null;
  };
  buyability_observation: {
    buy_path_visible: boolean | null;
    stock_status: string;
    price_visible_usd: number | null;
  };
  seller_observation: {
    sold_by: string;
    fulfilled_by: string;
    brand_visible: string;
  };
  product_relationship: {
    oem_or_aftermarket: string;
    notes: string;
  };
};

export type BatchOwnerScreenshotFactsTemplateRowV1 = {
  row_id: string;
  token: string | null;
  slug: string | null;
  source_queue_row_id: string | null;
  suggested_production_evidence_path: string | null;
  evidence_prefix: string | null;
  facts_template: BatchOwnerScreenshotFactsTemplateNestedV1;
  fill_in_instructions: readonly string[];
  may_write_evidence: false;
  may_mutate: false;
};

export type BatchOwnerScreenshotFactsTemplateV1 = {
  contract: typeof BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_evidence: false;
  automation_input: false;
  generated_at: string;
  source_plan_contract: typeof BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
  source_plan_generated_at: string | null;
  template_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  no_evidence_write_attestation: typeof BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_NO_WRITE_ATTESTATION_V1;
  rows: BatchOwnerScreenshotFactsTemplateRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

function isBatchEvidenceCollectionPlanV1(value: unknown): value is BatchEvidenceCollectionPlanV1 {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).contract === BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
}

export function parseBatchEvidenceCollectionPlanForTemplateV1(
  raw: unknown,
): BatchEvidenceCollectionPlanV1 {
  if (!isBatchEvidenceCollectionPlanV1(raw)) {
    throw new Error(`plan must be ${BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1}`);
  }
  return raw;
}

export function buildFactsTemplateNestedForPlanRowV1(
  planRow: BatchEvidenceCollectionPlanRowV1,
): BatchOwnerScreenshotFactsTemplateNestedV1 {
  const token = planRow.token?.trim() ?? "";
  const slug = planRow.slug?.trim().toLowerCase() ?? planRow.row_id.trim().toLowerCase();

  return {
    row_id: planRow.row_id,
    filter_slug: slug || null,
    filter_id: null,
    screenshot_sources: [
      {
        label: "owner screenshot",
        path: "",
        committed_to_repo: false,
        captured_at_iso: "",
      },
    ],
    browser_evidence: {
      token_searched: token,
      asin: "",
      canonical_url: "",
      seller_title_visible: "",
    },
    page_observation: {
      page_kind: "",
      token_visible_in_pdp_title: null,
      token_visible_elsewhere_on_page: null,
      seller_controlled_pdp_identity: null,
    },
    buyability_observation: {
      buy_path_visible: null,
      stock_status: "",
      price_visible_usd: null,
    },
    seller_observation: {
      sold_by: "",
      fulfilled_by: "",
      brand_visible: "",
    },
    product_relationship: {
      oem_or_aftermarket: "",
      notes: "",
    },
  };
}

export type BuildBatchOwnerScreenshotFactsTemplateOptionsV1 = {
  plan: BatchEvidenceCollectionPlanV1;
  generated_at?: string;
};

export function buildBatchOwnerScreenshotFactsTemplateV1(
  options: BuildBatchOwnerScreenshotFactsTemplateOptionsV1,
): BatchOwnerScreenshotFactsTemplateV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const rows: BatchOwnerScreenshotFactsTemplateRowV1[] = options.plan.rows.map((planRow) => {
    const slug = planRow.slug?.trim().toLowerCase() ?? null;
    const suggested_production_evidence_path = slug
      ? suggestedOwnerScreenshotEvidencePathV1({
          canonical_slug: slug,
          suffix: "owner-screenshot-review",
        })
      : null;

    return {
      row_id: planRow.row_id,
      token: planRow.token,
      slug,
      source_queue_row_id: planRow.source_queue_row_id,
      suggested_production_evidence_path,
      evidence_prefix: planRow.evidence_prefix,
      facts_template: buildFactsTemplateNestedForPlanRowV1(planRow),
      fill_in_instructions: [...BATCH_OWNER_SCREENSHOT_FACTS_FILL_IN_INSTRUCTIONS_V1],
      may_write_evidence: false,
      may_mutate: false,
    };
  });

  return {
    contract: BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_evidence: false,
    automation_input: false,
    generated_at,
    source_plan_contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    source_plan_generated_at: options.plan.generated_at ?? null,
    template_row_count: rows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_evidence_write_attestation: BATCH_OWNER_SCREENSHOT_FACTS_TEMPLATE_NO_WRITE_ATTESTATION_V1,
    rows,
    proven_facts: [
      "PROVEN: Templates generated read-only from batch_evidence_collection_plan_v1.",
      "PROVEN: No production evidence files written under data/evidence/.",
      `PROVEN: template_row_count=${rows.length}.`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder will fill templates and commit screenshots/JSON after browser review.",
    ],
  };
}

/** PROVEN: template artifact never grants write or mutation authority. */
export function batchOwnerScreenshotFactsTemplateGrantsWriteAuthority(
  template: BatchOwnerScreenshotFactsTemplateV1,
): boolean {
  if (template.may_write_evidence !== false) return true;
  if (template.data_mutation !== false) return true;
  if (template.read_only !== true) return true;
  if (template.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  return template.rows.some((r) => r.may_write_evidence !== false || r.may_mutate !== false);
}
