export type Ga4TrustFunnelArtifactStatus = "OK" | "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR";

export type Ga4TrustFunnelDateRange = {
  start_date: string;
  end_date: string;
};

export type Ga4TrustFunnelEventTotals = {
  fridge_model_view: number;
  fridge_filter_chip_click: number;
  fridge_filter_detail_click_from_model: number;
  fridge_filter_view: number;
  fridge_help_opened: number;
};

export type Ga4TrustFunnelRates = {
  chip_clicks_per_model_view: number | "UNKNOWN";
  filter_views_per_chip_click: number | "UNKNOWN";
  help_opens_per_filter_view: number | "UNKNOWN";
};

export type Ga4TrustFunnelArtifact = {
  status: Ga4TrustFunnelArtifactStatus;
  fetched_at: string;
  property_id: string | "UNKNOWN";
  date_range: Ga4TrustFunnelDateRange | "UNKNOWN";
  event_totals: Ga4TrustFunnelEventTotals | "UNKNOWN";
  rates: Ga4TrustFunnelRates | "UNKNOWN";
  dimension_breakdowns: {
    top_model_slugs: "UNKNOWN";
    top_filter_slugs: "UNKNOWN";
    quarantined_vs_normal: "UNKNOWN";
  };
  proven_facts: string[];
  unknown_facts: string[];
  provenance: {
    source: "google_analytics_data_api";
    scope: "https://www.googleapis.com/auth/analytics.readonly";
    writer: string;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isUnknownableRate(v: unknown): v is number | "UNKNOWN" {
  return v === "UNKNOWN" || isFiniteNumber(v);
}

function isEventTotals(v: unknown): v is Ga4TrustFunnelEventTotals | "UNKNOWN" {
  if (v === "UNKNOWN") return true;
  if (!isRecord(v)) return false;
  return (
    isFiniteNumber(v.fridge_model_view) &&
    isFiniteNumber(v.fridge_filter_chip_click) &&
    isFiniteNumber(v.fridge_filter_detail_click_from_model) &&
    isFiniteNumber(v.fridge_filter_view) &&
    isFiniteNumber(v.fridge_help_opened)
  );
}

function isRates(v: unknown): v is Ga4TrustFunnelRates | "UNKNOWN" {
  if (v === "UNKNOWN") return true;
  if (!isRecord(v)) return false;
  return (
    isUnknownableRate(v.chip_clicks_per_model_view) &&
    isUnknownableRate(v.filter_views_per_chip_click) &&
    isUnknownableRate(v.help_opens_per_filter_view)
  );
}

export function parseGa4TrustFunnelArtifact(
  text: string,
): { ok: true; artifact: Ga4TrustFunnelArtifact } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "Artifact JSON parse failed." };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "Artifact root must be an object." };
  if (parsed.status !== "OK" && parsed.status !== "UNKNOWN_CONFIG" && parsed.status !== "UNKNOWN_API_ERROR") {
    return { ok: false, reason: "Artifact status is invalid." };
  }
  if (typeof parsed.fetched_at !== "string") return { ok: false, reason: "Artifact fetched_at is invalid." };
  if (parsed.property_id !== "UNKNOWN" && typeof parsed.property_id !== "string") {
    return { ok: false, reason: "Artifact property_id is invalid." };
  }
  if (
    parsed.date_range !== "UNKNOWN" &&
    (!isRecord(parsed.date_range) ||
      typeof parsed.date_range.start_date !== "string" ||
      typeof parsed.date_range.end_date !== "string")
  ) {
    return { ok: false, reason: "Artifact date_range is invalid." };
  }
  if (!isEventTotals(parsed.event_totals)) return { ok: false, reason: "Artifact event_totals is invalid." };
  if (!isRates(parsed.rates)) return { ok: false, reason: "Artifact rates is invalid." };
  if (!isRecord(parsed.dimension_breakdowns)) return { ok: false, reason: "Artifact dimension_breakdowns is invalid." };
  if (
    parsed.dimension_breakdowns.top_model_slugs !== "UNKNOWN" ||
    parsed.dimension_breakdowns.top_filter_slugs !== "UNKNOWN" ||
    parsed.dimension_breakdowns.quarantined_vs_normal !== "UNKNOWN"
  ) {
    return { ok: false, reason: "Artifact dimension_breakdowns must be UNKNOWN in stage 1." };
  }
  if (!Array.isArray(parsed.proven_facts) || !parsed.proven_facts.every((x) => typeof x === "string")) {
    return { ok: false, reason: "Artifact proven_facts is invalid." };
  }
  if (!Array.isArray(parsed.unknown_facts) || !parsed.unknown_facts.every((x) => typeof x === "string")) {
    return { ok: false, reason: "Artifact unknown_facts is invalid." };
  }
  if (!isRecord(parsed.provenance)) return { ok: false, reason: "Artifact provenance is invalid." };
  if (parsed.provenance.source !== "google_analytics_data_api") {
    return { ok: false, reason: "Artifact provenance.source is invalid." };
  }
  if (parsed.provenance.scope !== "https://www.googleapis.com/auth/analytics.readonly") {
    return { ok: false, reason: "Artifact provenance.scope is invalid." };
  }
  if (typeof parsed.provenance.writer !== "string") {
    return { ok: false, reason: "Artifact provenance.writer is invalid." };
  }
  return { ok: true, artifact: parsed as Ga4TrustFunnelArtifact };
}
