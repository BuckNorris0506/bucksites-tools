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

export type RefrigeratorManualEvidenceRole =
  | "model_support_context"
  | "replacement_process_guidance"
  | "video_tutorial"
  | "control_overview_reset_guidance"
  | "filter_specification";

export type RefrigeratorManualEvidenceSource = {
  source_type: RefrigeratorManualEvidenceSourceType;
  source_url: string;
  source_title: string;
  source_host: string;
  evidence_role: RefrigeratorManualEvidenceRole;
  /** Optional explicit tier for fixture readability; runtime derives from source_type. */
  source_tier?: ManualSourcePublicTier;
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
  /**
   * Optional multi-source bundle.
   * Prefer this for model evidence that combines support article + spec sheet + video.
   */
  sources?: RefrigeratorManualEvidenceSource[];
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

function normalizedSources(
  record: Partial<RefrigeratorManualEvidenceRecord>,
): RefrigeratorManualEvidenceSource[] {
  if (Array.isArray(record.sources) && record.sources.length > 0) return record.sources;
  if (
    typeof record.source_type === "string" &&
    typeof record.source_url === "string" &&
    typeof record.source_title === "string" &&
    typeof record.source_host === "string"
  ) {
    return [
      {
        source_type: record.source_type,
        source_url: record.source_url,
        source_title: record.source_title,
        source_host: record.source_host,
        evidence_role: "replacement_process_guidance",
      },
    ];
  }
  return [];
}

/**
 * Rules for showing model-specific filter location or replacement steps on public pages.
 * Generic card copy does not require this; evidence-backed blocks would.
 */
export function validateRefrigeratorManualEvidencePublicReady(
  record: Partial<RefrigeratorManualEvidenceRecord>,
): RefrigeratorManualEvidenceReadinessResult {
  const errors: string[] = [];
  const sources = normalizedSources(record);

  if (sources.length === 0) {
    errors.push("at least one source is required for public-ready evidence");
  }

  for (const source of sources) {
    if (!isNonEmpty(source.source_url) || !looksLikeHttpUrl(source.source_url ?? "")) {
      errors.push("each source_url must be a non-empty http(s) URL");
    }
    if (source.source_type === "unknown") {
      errors.push("source_type must not be unknown for public-ready evidence");
    }
    if (!isNonEmpty(source.source_title) || !isNonEmpty(source.source_host)) {
      errors.push("each source must include source_title and source_host");
    }
    if (source.source_tier !== undefined) {
      const expectedTier = manualSourcePublicTier(source.source_type);
      if (source.source_tier !== expectedTier) {
        errors.push("source_tier must match source_type-derived tier");
      }
    }
  }

  const tier1Sources = sources.filter((s) => manualSourcePublicTier(s.source_type) === 1);
  const tier1Roles = new Set(tier1Sources.map((s) => s.evidence_role));

  if (record.confidence !== "high" && record.confidence !== "medium") {
    errors.push("confidence must be high or medium for public-ready evidence");
  }

  if (record.operator_reviewed !== true) {
    errors.push("operator_reviewed must be true for public-ready evidence");
  }

  const hasLocation = isNonEmpty(record.filter_location_text);
  const hasSteps = isNonEmpty(record.replacement_steps_summary);
  const hasCautions = isNonEmpty(record.cautions);
  if (!hasLocation && !hasSteps) {
    errors.push(
      "at least one of filter_location_text or replacement_steps_summary must be non-empty",
    );
  }
  if (hasLocation) {
    const locationSupported =
      tier1Roles.has("replacement_process_guidance") || tier1Roles.has("video_tutorial");
    if (!locationSupported) {
      errors.push("filter_location_text requires at least one Tier 1 replacement/video source");
    }
  }
  if (hasSteps) {
    const stepsSupported =
      tier1Roles.has("replacement_process_guidance") || tier1Roles.has("video_tutorial");
    if (!stepsSupported) {
      errors.push("replacement_steps_summary requires at least one Tier 1 replacement/video source");
    }
  }
  if (hasCautions) {
    const cautionsSupported =
      tier1Roles.has("replacement_process_guidance") ||
      tier1Roles.has("video_tutorial") ||
      tier1Roles.has("control_overview_reset_guidance");
    if (!cautionsSupported) {
      errors.push("cautions requires at least one Tier 1 replacement/reset source");
    }
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
