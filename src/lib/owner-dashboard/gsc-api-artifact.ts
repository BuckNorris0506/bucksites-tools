export type GscArtifactStatus = "OK" | "UNKNOWN_CONFIG" | "UNKNOWN_API_ERROR";

export type GscArtifactDateRange = {
  start_date: string;
  end_date: string;
};

export type GscArtifactTopEntry = {
  key: string;
  impressions: number;
  clicks: number;
  ctr: number | "UNKNOWN";
  average_position?: number | "UNKNOWN";
};

export type GscTrackedPageSliceMatchStatusV1 =
  | "FOUND"
  | "ZERO_IN_RANGE"
  | "QUERY_FAILED"
  | "NOT_FETCHED";

export type GscTrackedPageSliceV1 = {
  slug: string;
  page_url: string;
  match_status: GscTrackedPageSliceMatchStatusV1;
  impressions: number | "UNKNOWN";
  clicks: number | "UNKNOWN";
  ctr: number | "UNKNOWN";
  average_position: number | "UNKNOWN";
  gsc_page_key: string | "UNKNOWN";
};

export type GscSearchAnalyticsArtifact = {
  status: GscArtifactStatus;
  fetched_at: string;
  property: string | "UNKNOWN";
  date_range: GscArtifactDateRange | "UNKNOWN";
  total_clicks: number | "UNKNOWN";
  total_impressions: number | "UNKNOWN";
  average_ctr: number | "UNKNOWN";
  average_position: number | "UNKNOWN";
  top_queries_by_clicks: GscArtifactTopEntry[] | "UNKNOWN";
  top_queries_by_impressions: GscArtifactTopEntry[] | "UNKNOWN";
  top_pages_by_clicks: GscArtifactTopEntry[] | "UNKNOWN";
  top_pages_by_impressions: GscArtifactTopEntry[] | "UNKNOWN";
  high_impression_low_click_opportunities: GscArtifactTopEntry[] | "UNKNOWN";
  /** Exact-page demand slices for tracked URLs (optional on older artifacts). */
  tracked_page_slices_v1?: GscTrackedPageSliceV1[];
  proven_facts: string[];
  unknown_facts: string[];
  provenance: {
    source: "google_search_console_api";
    scope: "https://www.googleapis.com/auth/webmasters.readonly";
    writer: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTopEntry(value: unknown): value is GscArtifactTopEntry {
  if (!isRecord(value)) return false;
  if (typeof value.key !== "string") return false;
  if (typeof value.impressions !== "number" || !Number.isFinite(value.impressions)) return false;
  if (typeof value.clicks !== "number" || !Number.isFinite(value.clicks)) return false;
  if (value.ctr !== "UNKNOWN" && (typeof value.ctr !== "number" || !Number.isFinite(value.ctr))) return false;
  if (
    "average_position" in value &&
    value.average_position !== "UNKNOWN" &&
    (typeof value.average_position !== "number" || !Number.isFinite(value.average_position))
  ) {
    return false;
  }
  return true;
}

function isTopEntries(value: unknown): value is GscArtifactTopEntry[] | "UNKNOWN" {
  if (value === "UNKNOWN") return true;
  if (!Array.isArray(value)) return false;
  return value.every(isTopEntry);
}

function isUnknownableNumber(value: unknown): value is number | "UNKNOWN" {
  return value === "UNKNOWN" || (typeof value === "number" && Number.isFinite(value));
}

const TRACKED_PAGE_SLICE_MATCH_STATUSES = [
  "FOUND",
  "ZERO_IN_RANGE",
  "QUERY_FAILED",
  "NOT_FETCHED",
] as const;

function isTrackedPageSliceMatchStatus(value: unknown): value is GscTrackedPageSliceMatchStatusV1 {
  return (
    typeof value === "string" &&
    (TRACKED_PAGE_SLICE_MATCH_STATUSES as readonly string[]).includes(value)
  );
}

function isTrackedPageSlice(value: unknown): value is GscTrackedPageSliceV1 {
  if (!isRecord(value)) return false;
  if (typeof value.slug !== "string") return false;
  if (typeof value.page_url !== "string") return false;
  if (!isTrackedPageSliceMatchStatus(value.match_status)) return false;
  if (!isUnknownableNumber(value.impressions)) return false;
  if (!isUnknownableNumber(value.clicks)) return false;
  if (!isUnknownableNumber(value.ctr)) return false;
  if (!isUnknownableNumber(value.average_position)) return false;
  if (value.gsc_page_key !== "UNKNOWN" && typeof value.gsc_page_key !== "string") return false;
  return true;
}

function isTrackedPageSlices(value: unknown): value is GscTrackedPageSliceV1[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every(isTrackedPageSlice);
}

export function parseGscSearchAnalyticsArtifact(
  text: string,
): { ok: true; artifact: GscSearchAnalyticsArtifact } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "Artifact JSON parse failed." };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "Artifact root must be an object." };
  const status = parsed.status;
  if (status !== "OK" && status !== "UNKNOWN_CONFIG" && status !== "UNKNOWN_API_ERROR") {
    return { ok: false, reason: "Artifact status is invalid." };
  }
  if (typeof parsed.fetched_at !== "string") return { ok: false, reason: "Artifact fetched_at is invalid." };
  if (parsed.property !== "UNKNOWN" && typeof parsed.property !== "string") {
    return { ok: false, reason: "Artifact property is invalid." };
  }
  if (
    parsed.date_range !== "UNKNOWN" &&
    (!isRecord(parsed.date_range) ||
      typeof parsed.date_range.start_date !== "string" ||
      typeof parsed.date_range.end_date !== "string")
  ) {
    return { ok: false, reason: "Artifact date_range is invalid." };
  }
  if (!isUnknownableNumber(parsed.total_clicks)) return { ok: false, reason: "Artifact total_clicks is invalid." };
  if (!isUnknownableNumber(parsed.total_impressions)) {
    return { ok: false, reason: "Artifact total_impressions is invalid." };
  }
  if (!isUnknownableNumber(parsed.average_ctr)) return { ok: false, reason: "Artifact average_ctr is invalid." };
  if (!isUnknownableNumber(parsed.average_position)) {
    return { ok: false, reason: "Artifact average_position is invalid." };
  }
  if (!isTopEntries(parsed.top_queries_by_clicks)) {
    return { ok: false, reason: "Artifact top_queries_by_clicks is invalid." };
  }
  if (!isTopEntries(parsed.top_queries_by_impressions)) {
    return { ok: false, reason: "Artifact top_queries_by_impressions is invalid." };
  }
  if (!isTopEntries(parsed.top_pages_by_clicks)) return { ok: false, reason: "Artifact top_pages_by_clicks is invalid." };
  if (!isTopEntries(parsed.top_pages_by_impressions)) {
    return { ok: false, reason: "Artifact top_pages_by_impressions is invalid." };
  }
  if (!isTopEntries(parsed.high_impression_low_click_opportunities)) {
    return { ok: false, reason: "Artifact high_impression_low_click_opportunities is invalid." };
  }
  if (!isTrackedPageSlices(parsed.tracked_page_slices_v1)) {
    return { ok: false, reason: "Artifact tracked_page_slices_v1 is invalid." };
  }
  if (!Array.isArray(parsed.proven_facts) || !parsed.proven_facts.every((v) => typeof v === "string")) {
    return { ok: false, reason: "Artifact proven_facts is invalid." };
  }
  if (!Array.isArray(parsed.unknown_facts) || !parsed.unknown_facts.every((v) => typeof v === "string")) {
    return { ok: false, reason: "Artifact unknown_facts is invalid." };
  }
  if (!isRecord(parsed.provenance)) return { ok: false, reason: "Artifact provenance is invalid." };
  if (parsed.provenance.source !== "google_search_console_api") {
    return { ok: false, reason: "Artifact provenance.source is invalid." };
  }
  if (parsed.provenance.scope !== "https://www.googleapis.com/auth/webmasters.readonly") {
    return { ok: false, reason: "Artifact provenance.scope is invalid." };
  }
  if (typeof parsed.provenance.writer !== "string") {
    return { ok: false, reason: "Artifact provenance.writer is invalid." };
  }
  return { ok: true, artifact: parsed as GscSearchAnalyticsArtifact };
}
