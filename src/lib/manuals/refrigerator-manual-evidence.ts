/**
 * Contract for future model-specific manual / support evidence.
 * No rows are loaded on public fridge pages until a fixture passes public-readiness checks.
 */

export type RefrigeratorManualEvidenceSourceType =
  | "owner_manual"
  | "manufacturer_support"
  | "official_parts_site"
  | "third_party_manual_index"
  | "unknown";

export type RefrigeratorManualEvidenceConfidence = "high" | "medium" | "low" | "unknown";

/**
 * Tier 1: manufacturer manual or support.
 * Tier 2: official parts / service manual source.
 * Tier 3: third-party manual index.
 * Tier 4: unknown / not suitable for public model-specific claims.
 */
export type ManualSourcePublicTier = 1 | 2 | 3 | 4;

export const MANUAL_SOURCE_TIER_LABELS: Record<ManualSourcePublicTier, string> = {
  1: "Tier 1 — manufacturer manual or support",
  2: "Tier 2 — official parts or service manual source",
  3: "Tier 3 — third-party manual index",
  4: "Tier 4 — unknown, not public-ready",
};

export function manualSourcePublicTier(
  sourceType: RefrigeratorManualEvidenceSourceType,
): ManualSourcePublicTier {
  if (sourceType === "owner_manual" || sourceType === "manufacturer_support") return 1;
  if (sourceType === "official_parts_site") return 2;
  if (sourceType === "third_party_manual_index") return 3;
  return 4;
}

export type RefrigeratorManualEvidenceRecord = {
  fridge_model_slug: string;
  source_type: RefrigeratorManualEvidenceSourceType;
  source_url: string;
  source_title: string;
  source_host: string;
  evidence_date: string;
  filter_location_text: string;
  replacement_steps_summary: string;
  cautions: string;
  confidence: RefrigeratorManualEvidenceConfidence;
  extracted_by: string;
  operator_reviewed: boolean;
  notes: string;
  /** Copied manufacturer imagery is never allowed on BuckParts. */
  copied_image_allowed?: false;
};

function isNonEmpty(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function looksLikeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export type RefrigeratorManualEvidenceReadinessResult = {
  ok: boolean;
  errors: string[];
};

/**
 * Rules for showing model-specific filter location or replacement steps on public pages.
 * Generic card copy does not require this; evidence-backed blocks would.
 */
export function validateRefrigeratorManualEvidencePublicReady(
  record: Partial<RefrigeratorManualEvidenceRecord>,
): RefrigeratorManualEvidenceReadinessResult {
  const errors: string[] = [];

  if (!isNonEmpty(record.source_url) || !looksLikeHttpUrl(record.source_url ?? "")) {
    errors.push("source_url must be a non-empty http(s) URL");
  }

  if (record.source_type === undefined || record.source_type === "unknown") {
    errors.push("source_type must not be unknown for public-ready evidence");
  }

  if (record.confidence !== "high" && record.confidence !== "medium") {
    errors.push("confidence must be high or medium for public-ready evidence");
  }

  if (record.operator_reviewed !== true) {
    errors.push("operator_reviewed must be true for public-ready evidence");
  }

  const hasLocation = isNonEmpty(record.filter_location_text);
  const hasSteps = isNonEmpty(record.replacement_steps_summary);
  if (!hasLocation && !hasSteps) {
    errors.push(
      "at least one of filter_location_text or replacement_steps_summary must be non-empty",
    );
  }

  const copiedFlag = (record as { copied_image_allowed?: boolean }).copied_image_allowed;
  if (copiedFlag === true) {
    errors.push("copied_image_allowed must not be true");
  }

  if (!isNonEmpty(record.fridge_model_slug)) {
    errors.push("fridge_model_slug must be non-empty");
  }

  return { ok: errors.length === 0, errors };
}
