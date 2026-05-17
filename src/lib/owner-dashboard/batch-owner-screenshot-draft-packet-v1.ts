/**
 * Batch Owner Screenshot Draft Packet v1 — review-only drafts from evidence plan + owner facts.
 * PROVEN: no I/O; does not write under `data/evidence/`.
 */

import type { AmazonOwnerScreenshotEvidenceV1 } from "../../../scripts/lib/amazon-owner-screenshot-evidence-v1";
import {
  buildAmazonOwnerScreenshotEvidenceV1,
  listOwnerReviewBlockersFromScreenshotFactsV1,
  listProductionEvidenceCommitBlockersFromScreenshotFactsV1,
  suggestedOwnerScreenshotEvidencePathV1,
  type AmazonOwnerScreenshotFactsV1,
  type ScreenshotEvidenceRetailContextV1,
} from "../../../scripts/lib/amazon-owner-screenshot-evidence-v1";
import { BATCH_AMAZON_RESCUE_DEFAULT_QUEUE_ROW_ID_V1 } from "./batch-production-amazon-rescue-source-v1";
import { BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1 } from "./batch-production-non-amazon-pdp-source-v1";
import {
  BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
  type BatchEvidenceCollectionPlanRowV1,
  type BatchEvidenceCollectionPlanV1,
} from "./batch-evidence-collection-plan-v1";

export const BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1 =
  "batch_owner_screenshot_draft_packet_v1" as const;

export const BATCH_OWNER_SCREENSHOT_DRAFT_NO_WRITE_ATTESTATION_V1 =
  "PROVEN: This artifact does not write production evidence JSON under data/evidence/. may_write_production_evidence and may_mutate are false on every row. Founder must explicitly save approved JSON separately. layer_6_founder_only_approval remains NOT_PROVEN.";

/** Fail-closed when owner facts token disagrees with matched plan row token. */
export const BATCH_OWNER_FACTS_TOKEN_CONFLICT_WITH_PLAN_V1 =
  "owner_facts_token_conflicts_with_plan_row" as const;

/** After normalization, required build fields may still be absent (fail-closed via listMissingOwnerFactsForBuildV1). */
export type BatchOwnerScreenshotFactsInputRowV1 = {
  row_id: string;
} & Partial<AmazonOwnerScreenshotFactsV1>;

export type BatchOwnerScreenshotFactsInputV1 = {
  facts: BatchOwnerScreenshotFactsInputRowV1[];
};

export type BatchOwnerScreenshotDraftRowV1 = {
  row_id: string;
  token: string | null;
  slug: string | null;
  source_queue_row_id: string | null;
  proposed_production_evidence_prefix: string | null;
  /** INFERRED: suggested full path if founder later commits — not written by this builder. */
  suggested_production_evidence_path: string | null;
  draft_packet: AmazonOwnerScreenshotEvidenceV1 | null;
  /** Owner-review blockers only (structural gaps or founder-review checklist). */
  missing_owner_facts: string[];
  /** Production evidence commit gates (ASIN on Amazon, repo screenshot commit) — do not block owner review. */
  production_evidence_commit_blockers: string[];
  draft_ready_for_owner_review: boolean;
  may_write_production_evidence: false;
  may_mutate: false;
};

export type BatchOwnerScreenshotDraftPacketV1 = {
  contract: typeof BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  may_write_production_evidence: false;
  automation_input: false;
  generated_at: string;
  source_plan_contract: typeof BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
  source_plan_generated_at: string | null;
  draft_row_count: number;
  layer_6_founder_only_approval: "NOT_PROVEN";
  no_production_evidence_write_attestation: typeof BATCH_OWNER_SCREENSHOT_DRAFT_NO_WRITE_ATTESTATION_V1;
  rows: BatchOwnerScreenshotDraftRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

function isBatchEvidenceCollectionPlanV1(value: unknown): value is BatchEvidenceCollectionPlanV1 {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).contract === BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1;
}

function normalizeTokenKey(token: string): string {
  return token.trim().toUpperCase();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function pickBoolean(...candidates: unknown[]): boolean | undefined {
  for (const c of candidates) {
    if (typeof c === "boolean") return c;
  }
  return undefined;
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return undefined;
}

function pickStringOrNull(...candidates: unknown[]): string | null | undefined {
  for (const c of candidates) {
    if (c === null) return null;
    if (typeof c === "string") return c.trim() || null;
  }
  return undefined;
}

function pickNumberOrNull(...candidates: unknown[]): number | null | undefined {
  for (const c of candidates) {
    if (c === null) return null;
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return undefined;
}

/**
 * Flatten owner facts that may be supplied either as `AmazonOwnerScreenshotFactsV1`
 * or as nested observation sections matching `AmazonOwnerScreenshotEvidenceV1`.
 * Flat fields win when both are present.
 */
export function normalizeBatchOwnerScreenshotFactsRowV1(
  raw: Record<string, unknown>,
): BatchOwnerScreenshotFactsInputRowV1 {
  const pageObs = asRecord(raw.page_observation);
  const buyObs = asRecord(raw.buyability_observation);
  const sellerObs = asRecord(raw.seller_observation);
  const productRel = asRecord(raw.product_relationship);
  const browser = asRecord(raw.browser_evidence);
  const ownerFinding = asRecord(raw.owner_browser_finding);

  const row_id =
    pickString(raw.row_id) ??
    pickString(raw.filter_slug) ??
    "";

  const token =
    pickString(raw.token, browser?.token_searched) ?? "";

  const page_kind =
    (raw.page_kind as AmazonOwnerScreenshotFactsV1["page_kind"] | undefined) ??
    (pageObs?.page_kind as AmazonOwnerScreenshotFactsV1["page_kind"] | undefined) ??
    (ownerFinding?.page_kind as AmazonOwnerScreenshotFactsV1["page_kind"] | undefined);

  const oem_or_aftermarket =
    (raw.oem_or_aftermarket as AmazonOwnerScreenshotFactsV1["oem_or_aftermarket"] | undefined) ??
    (productRel?.oem_or_aftermarket as
      | AmazonOwnerScreenshotFactsV1["oem_or_aftermarket"]
      | undefined) ??
    (browser?.oem_or_aftermarket as
      | AmazonOwnerScreenshotFactsV1["oem_or_aftermarket"]
      | undefined);

  const token_visible_in_pdp_title = pickBoolean(
    raw.token_visible_in_pdp_title,
    pageObs?.token_visible_in_pdp_title,
    browser?.token_visible_in_pdp_title,
  );

  const token_visible_elsewhere_on_page = pickBoolean(
    raw.token_visible_elsewhere_on_page,
    pageObs?.token_visible_elsewhere_on_page,
    browser?.token_visible_elsewhere_on_page,
  );

  const buy_path_visible = pickBoolean(raw.buy_path_visible, buyObs?.buy_path_visible);

  const seller_controlled_pdp_identity =
    raw.seller_controlled_pdp_identity ??
    pageObs?.seller_controlled_pdp_identity ??
    undefined;

  const screenshot_sources = Array.isArray(raw.screenshot_sources)
    ? (raw.screenshot_sources as AmazonOwnerScreenshotFactsV1["screenshot_sources"])
    : undefined;

  const asin = pickStringOrNull(raw.asin, browser?.asin);
  const canonical_url = pickStringOrNull(
    raw.canonical_url,
    browser?.canonical_url,
    browser?.amazon_pdp_url_canonical,
  );

  const normalized: BatchOwnerScreenshotFactsInputRowV1 = { row_id, token };

  const filterSlug = pickString(raw.filter_slug);
  if (filterSlug) normalized.filter_slug = filterSlug;
  const filterId = pickStringOrNull(raw.filter_id);
  if (filterId !== undefined) normalized.filter_id = filterId;
  const generatedAt = pickString(raw.generated_at);
  if (generatedAt) normalized.generated_at = generatedAt;
  if (screenshot_sources) normalized.screenshot_sources = screenshot_sources;
  if (page_kind !== undefined) normalized.page_kind = page_kind;
  if (token_visible_in_pdp_title !== undefined) {
    normalized.token_visible_in_pdp_title = token_visible_in_pdp_title;
  }
  if (token_visible_elsewhere_on_page !== undefined) {
    normalized.token_visible_elsewhere_on_page = token_visible_elsewhere_on_page;
  }
  if (seller_controlled_pdp_identity !== undefined) {
    normalized.seller_controlled_pdp_identity =
      seller_controlled_pdp_identity as AmazonOwnerScreenshotFactsV1["seller_controlled_pdp_identity"];
  }
  if (buy_path_visible !== undefined) normalized.buy_path_visible = buy_path_visible;
  const stockStatus = pickString(raw.stock_status, buyObs?.stock_status);
  if (stockStatus) normalized.stock_status = stockStatus;
  const priceUsd = pickNumberOrNull(raw.price_visible_usd, buyObs?.price_visible_usd);
  if (priceUsd !== undefined) normalized.price_visible_usd = priceUsd;
  const soldBy = pickStringOrNull(raw.sold_by, sellerObs?.sold_by, browser?.sold_by);
  if (soldBy !== undefined) normalized.sold_by = soldBy;
  const fulfilledBy = pickStringOrNull(raw.fulfilled_by, sellerObs?.fulfilled_by, browser?.fulfilled_by);
  if (fulfilledBy !== undefined) normalized.fulfilled_by = fulfilledBy;
  const brandVisible = pickStringOrNull(raw.brand_visible, sellerObs?.brand_visible, browser?.brand_store);
  if (brandVisible !== undefined) normalized.brand_visible = brandVisible;
  if (oem_or_aftermarket !== undefined) normalized.oem_or_aftermarket = oem_or_aftermarket;
  const relationshipNotes = pickStringOrNull(raw.relationship_notes, productRel?.notes);
  if (relationshipNotes !== undefined) normalized.relationship_notes = relationshipNotes;
  if (asin !== undefined) normalized.asin = asin;
  if (canonical_url !== undefined) normalized.canonical_url = canonical_url;
  const sellerTitle = pickStringOrNull(raw.seller_title_visible, browser?.seller_title_visible);
  if (sellerTitle !== undefined) normalized.seller_title_visible = sellerTitle;

  return normalized;
}

/** Minimum fields required before calling `buildAmazonOwnerScreenshotEvidenceV1`. */
export function listMissingOwnerFactsForBuildV1(
  facts: Partial<AmazonOwnerScreenshotFactsV1> | null | undefined,
): string[] {
  if (!facts) return ["owner_facts_row_missing"];
  const missing: string[] = [];
  if (typeof facts.token !== "string" || !facts.token.trim()) missing.push("token");
  if (facts.page_kind == null) missing.push("page_kind");
  if (facts.oem_or_aftermarket == null) missing.push("oem_or_aftermarket");
  if (!Array.isArray(facts.screenshot_sources)) missing.push("screenshot_sources");
  if (typeof facts.token_visible_in_pdp_title !== "boolean") {
    missing.push("token_visible_in_pdp_title");
  }
  if (typeof facts.token_visible_elsewhere_on_page !== "boolean") {
    missing.push("token_visible_elsewhere_on_page");
  }
  if (typeof facts.buy_path_visible !== "boolean") missing.push("buy_path_visible");
  return missing;
}

/**
 * When owner facts match a plan row, inherit plan token if owner omitted it.
 * Fail closed when owner supplied a token that disagrees with the plan row.
 */
export function reconcileOwnerFactsTokenWithPlanRowV1(
  planRow: BatchEvidenceCollectionPlanRowV1,
  ownerRow: Partial<AmazonOwnerScreenshotFactsV1> | undefined,
): {
  facts: Partial<AmazonOwnerScreenshotFactsV1> | undefined;
  token_conflict: boolean;
} {
  if (!ownerRow) return { facts: undefined, token_conflict: false };

  const planToken = planRow.token?.trim() ?? "";
  const ownerToken = typeof ownerRow.token === "string" ? ownerRow.token.trim() : "";

  if (
    ownerToken &&
    planToken &&
    normalizeTokenKey(ownerToken) !== normalizeTokenKey(planToken)
  ) {
    return { facts: ownerRow, token_conflict: true };
  }

  if (!ownerToken && planToken) {
    return { facts: { ...ownerRow, token: planToken }, token_conflict: false };
  }

  return { facts: ownerRow, token_conflict: false };
}

function mergeFactsWithPlanRow(
  planRow: BatchEvidenceCollectionPlanRowV1,
  ownerRow: Partial<AmazonOwnerScreenshotFactsV1> | undefined,
): AmazonOwnerScreenshotFactsV1 | null {
  const structuralMissing = listMissingOwnerFactsForBuildV1(ownerRow);
  if (structuralMissing.includes("owner_facts_row_missing")) return null;

  const token =
    (typeof ownerRow!.token === "string" && ownerRow!.token.trim()) ||
    planRow.token?.trim() ||
    "";
  if (!token) return null;

  return {
    token,
    filter_slug: ownerRow!.filter_slug ?? planRow.slug,
    filter_id: ownerRow!.filter_id ?? null,
    generated_at: ownerRow!.generated_at,
    screenshot_sources: ownerRow!.screenshot_sources ?? [],
    page_kind: ownerRow!.page_kind!,
    token_visible_in_pdp_title: ownerRow!.token_visible_in_pdp_title!,
    token_visible_elsewhere_on_page: ownerRow!.token_visible_elsewhere_on_page!,
    seller_controlled_pdp_identity: ownerRow!.seller_controlled_pdp_identity ?? "UNKNOWN",
    buy_path_visible: ownerRow!.buy_path_visible!,
    stock_status: ownerRow!.stock_status,
    price_visible_usd: ownerRow!.price_visible_usd,
    sold_by: ownerRow!.sold_by,
    fulfilled_by: ownerRow!.fulfilled_by,
    brand_visible: ownerRow!.brand_visible,
    oem_or_aftermarket: ownerRow!.oem_or_aftermarket!,
    relationship_notes: ownerRow!.relationship_notes,
    asin: ownerRow!.asin,
    canonical_url: ownerRow!.canonical_url,
    seller_title_visible: ownerRow!.seller_title_visible,
  };
}

function indexFactsByRowAndToken(
  factsInput: BatchOwnerScreenshotFactsInputV1,
): {
  byRowId: Map<string, BatchOwnerScreenshotFactsInputRowV1>;
  byToken: Map<string, BatchOwnerScreenshotFactsInputRowV1>;
} {
  const byRowId = new Map<string, BatchOwnerScreenshotFactsInputRowV1>();
  const byToken = new Map<string, BatchOwnerScreenshotFactsInputRowV1>();
  for (const row of factsInput.facts ?? []) {
    const normalized = normalizeBatchOwnerScreenshotFactsRowV1(
      row as unknown as Record<string, unknown>,
    );
    if (normalized.row_id) byRowId.set(normalized.row_id.trim(), normalized);
    if (normalized.token) byToken.set(normalizeTokenKey(normalized.token), normalized);
  }
  return { byRowId, byToken };
}

function resolveOwnerFactsForPlanRow(
  planRow: BatchEvidenceCollectionPlanRowV1,
  indexes: ReturnType<typeof indexFactsByRowAndToken>,
): Partial<AmazonOwnerScreenshotFactsV1> | undefined {
  return (
    indexes.byRowId.get(planRow.row_id) ??
    (planRow.token ? indexes.byToken.get(normalizeTokenKey(planRow.token)) : undefined)
  );
}

const OWNER_REVIEW_FAIL_CLOSED_VERDICTS = new Set([
  "INCOMPLETE_SCREENSHOT_FACTS",
  "SEARCH_PAGE_ONLY",
  "NO_SAFE_PDP_FOUND",
  "BLOCKED_UNSAFE",
  "TOKEN_NOT_IN_TITLE",
  "EXACT_TOKEN_VISIBLE_NOT_BUYABLE",
]);

/** INFERRED: plan queue id is primary; canonical URL host is fallback when queue is ambiguous. */
export function inferScreenshotEvidenceRetailContextV1(
  planRow: Pick<BatchEvidenceCollectionPlanRowV1, "source_queue_row_id">,
  facts?: Pick<AmazonOwnerScreenshotFactsV1, "canonical_url">,
): ScreenshotEvidenceRetailContextV1 {
  const queueId = planRow.source_queue_row_id?.trim();
  if (queueId === BATCH_NON_AMAZON_PDP_QUEUE_ROW_ID_V1) return "non_amazon";
  if (queueId === BATCH_AMAZON_RESCUE_DEFAULT_QUEUE_ROW_ID_V1) return "amazon";

  const url = facts?.canonical_url?.trim().toLowerCase() ?? "";
  if (url.includes("amazon.com") || url.includes("amazon.")) return "amazon";
  if (url) return "non_amazon";

  return "amazon";
}

export function isDraftReadyForOwnerReviewV1(args: {
  owner_review_blockers: string[];
  owner_verdict: AmazonOwnerScreenshotEvidenceV1["owner_verdict"] | null;
}): boolean {
  if (args.owner_review_blockers.length > 0) return false;
  if (!args.owner_verdict) return false;
  if (OWNER_REVIEW_FAIL_CLOSED_VERDICTS.has(args.owner_verdict)) return false;
  return true;
}

export function parseBatchOwnerScreenshotFactsInputV1(raw: unknown): BatchOwnerScreenshotFactsInputV1 {
  if (!raw || typeof raw !== "object") {
    throw new Error("facts input must be { facts: [...] }");
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.facts)) {
    throw new Error("facts input must include facts array");
  }
  const facts = o.facts.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`facts[${index}] must be an object`);
    }
    return normalizeBatchOwnerScreenshotFactsRowV1(row as Record<string, unknown>);
  });
  return { facts };
}

export function parseBatchEvidenceCollectionPlanForDraftV1(raw: unknown): BatchEvidenceCollectionPlanV1 {
  if (!isBatchEvidenceCollectionPlanV1(raw)) {
    throw new Error(`plan must be ${BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1}`);
  }
  return raw;
}

export type BuildBatchOwnerScreenshotDraftPacketOptionsV1 = {
  plan: BatchEvidenceCollectionPlanV1;
  factsInput: BatchOwnerScreenshotFactsInputV1;
  generated_at?: string;
};

/**
 * Pure builder: evidence collection plan + owner facts → review-only draft packets (stdout only).
 */
export function buildBatchOwnerScreenshotDraftPacketV1(
  options: BuildBatchOwnerScreenshotDraftPacketOptionsV1,
): BatchOwnerScreenshotDraftPacketV1 {
  const generated_at = options.generated_at ?? new Date().toISOString();
  const indexes = indexFactsByRowAndToken(options.factsInput);
  const rows: BatchOwnerScreenshotDraftRowV1[] = [];

  for (const planRow of options.plan.rows) {
    const ownerPartial = resolveOwnerFactsForPlanRow(planRow, indexes);
    const proposedPrefix = planRow.evidence_prefix;
    const slug = planRow.slug ?? ownerPartial?.filter_slug ?? null;

    let suggestedPath: string | null = null;
    if (slug) {
      suggestedPath = suggestedOwnerScreenshotEvidencePathV1({
        canonical_slug: slug,
        suffix: "owner-screenshot-review",
      });
    }

    if (!ownerPartial) {
      rows.push({
        row_id: planRow.row_id,
        token: planRow.token,
        slug,
        source_queue_row_id: planRow.source_queue_row_id,
        proposed_production_evidence_prefix: proposedPrefix,
        suggested_production_evidence_path: suggestedPath,
        draft_packet: null,
        missing_owner_facts: ["owner_facts_row_missing"],
        production_evidence_commit_blockers: [],
        draft_ready_for_owner_review: false,
        may_write_production_evidence: false,
        may_mutate: false,
      });
      continue;
    }

    const { facts: ownerReconciled, token_conflict } = reconcileOwnerFactsTokenWithPlanRowV1(
      planRow,
      ownerPartial,
    );
    if (token_conflict) {
      rows.push({
        row_id: planRow.row_id,
        token: planRow.token,
        slug,
        source_queue_row_id: planRow.source_queue_row_id,
        proposed_production_evidence_prefix: proposedPrefix,
        suggested_production_evidence_path: suggestedPath,
        draft_packet: null,
        missing_owner_facts: [BATCH_OWNER_FACTS_TOKEN_CONFLICT_WITH_PLAN_V1],
        production_evidence_commit_blockers: [],
        draft_ready_for_owner_review: false,
        may_write_production_evidence: false,
        may_mutate: false,
      });
      continue;
    }

    const structuralMissing = listMissingOwnerFactsForBuildV1(ownerReconciled);
    if (structuralMissing.length > 0) {
      rows.push({
        row_id: planRow.row_id,
        token: planRow.token,
        slug,
        source_queue_row_id: planRow.source_queue_row_id,
        proposed_production_evidence_prefix: proposedPrefix,
        suggested_production_evidence_path: suggestedPath,
        draft_packet: null,
        missing_owner_facts: structuralMissing,
        production_evidence_commit_blockers: [],
        draft_ready_for_owner_review: false,
        may_write_production_evidence: false,
        may_mutate: false,
      });
      continue;
    }

    const merged = mergeFactsWithPlanRow(planRow, ownerReconciled);
    if (!merged) {
      rows.push({
        row_id: planRow.row_id,
        token: planRow.token,
        slug,
        source_queue_row_id: planRow.source_queue_row_id,
        proposed_production_evidence_prefix: proposedPrefix,
        suggested_production_evidence_path: suggestedPath,
        draft_packet: null,
        missing_owner_facts: ["token"],
        production_evidence_commit_blockers: [],
        draft_ready_for_owner_review: false,
        may_write_production_evidence: false,
        may_mutate: false,
      });
      continue;
    }

    const draft_packet = buildAmazonOwnerScreenshotEvidenceV1(merged);
    const retailContext = inferScreenshotEvidenceRetailContextV1(planRow, merged);
    const missing_owner_facts = listOwnerReviewBlockersFromScreenshotFactsV1(
      merged,
      retailContext,
    );
    const production_evidence_commit_blockers =
      listProductionEvidenceCommitBlockersFromScreenshotFactsV1(merged, retailContext);
    const draft_ready_for_owner_review = isDraftReadyForOwnerReviewV1({
      owner_review_blockers: missing_owner_facts,
      owner_verdict: draft_packet.owner_verdict,
    });

    rows.push({
      row_id: planRow.row_id,
      token: draft_packet.token,
      slug: draft_packet.filter_slug,
      source_queue_row_id: planRow.source_queue_row_id,
      proposed_production_evidence_prefix: proposedPrefix,
      suggested_production_evidence_path: suggestedPath,
      draft_packet,
      missing_owner_facts,
      production_evidence_commit_blockers,
      draft_ready_for_owner_review,
      may_write_production_evidence: false,
      may_mutate: false,
    });
  }

  return {
    contract: BATCH_OWNER_SCREENSHOT_DRAFT_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    may_write_production_evidence: false,
    automation_input: false,
    generated_at,
    source_plan_contract: BATCH_EVIDENCE_COLLECTION_PLAN_CONTRACT_V1,
    source_plan_generated_at: options.plan.generated_at ?? null,
    draft_row_count: rows.length,
    layer_6_founder_only_approval: "NOT_PROVEN",
    no_production_evidence_write_attestation: BATCH_OWNER_SCREENSHOT_DRAFT_NO_WRITE_ATTESTATION_V1,
    rows,
    proven_facts: [
      "PROVEN: Draft packets built read-only from batch_evidence_collection_plan_v1 + owner facts JSON.",
      "PROVEN: No production evidence files written under data/evidence/.",
      `PROVEN: draft_row_count=${rows.length}.`,
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder will commit suggested_production_evidence_path to repo after review.",
      "INFERRED: draft_ready_for_owner_review is founder review readiness only; production_evidence_commit_blockers (ASIN on Amazon, screenshot commit) gate durable evidence writes.",
    ],
  };
}

/** PROVEN: draft packet never grants production write or mutation authority. */
export function batchOwnerScreenshotDraftGrantsProductionWrite(
  packet: BatchOwnerScreenshotDraftPacketV1,
): boolean {
  if (packet.may_write_production_evidence !== false) return true;
  if (packet.data_mutation !== false) return true;
  if (packet.layer_6_founder_only_approval !== "NOT_PROVEN") return true;
  return packet.rows.some(
    (r) => r.may_write_production_evidence !== false || r.may_mutate !== false,
  );
}
