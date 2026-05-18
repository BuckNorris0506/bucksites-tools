import { loadGa4TrustFunnelAggregateArtifact } from "@/lib/owner-dashboard/load-ga4-trust-funnel-aggregate-artifact";
import type { Ga4TrustFunnelArtifact } from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
import {
  buildOwnerGscExternalDemandNeuron,
  type OwnerGscArtifactSource,
  type OwnerGscConnectionLevel,
  type OwnerGscExternalDemandNeuron,
  type OwnerGscLaneStatus,
} from "@/lib/owner-dashboard/gsc-external-demand";

export const EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1 = 7;

export type ExternalMeasurementFreshnessStatusV1 = "OK" | "STALE" | "UNKNOWN";
export type ExternalMeasurementFreshnessRuntimeStatusV1 = "OK" | "PARTIAL" | "UNKNOWN";

export type ExternalMeasurementFreshnessGscV1 = {
  runtime_status: "OK" | "UNKNOWN";
  connection_level: OwnerGscConnectionLevel;
  artifact_source: OwnerGscArtifactSource;
  fetched_at_or_export_date: string | "UNKNOWN";
  freshness_status: ExternalMeasurementFreshnessStatusV1;
  top_level_note: string;
};

export type ExternalMeasurementFreshnessGa4V1 = {
  runtime_status: "OK" | "UNKNOWN";
  artifact_source: "SUPABASE" | "LOCAL_ARTIFACT" | "NONE";
  fetched_at: string | "UNKNOWN";
  freshness_status: ExternalMeasurementFreshnessStatusV1;
  top_level_note: string;
};

export type ExternalMeasurementFreshnessV1 = {
  contract: "external_measurement_freshness_v1";
  read_only: true;
  data_mutation: false;
  runtime_status: ExternalMeasurementFreshnessRuntimeStatusV1;
  overall_status: ExternalMeasurementFreshnessStatusV1;
  gsc: ExternalMeasurementFreshnessGscV1;
  ga4: ExternalMeasurementFreshnessGa4V1;
  recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"];
  proven_facts: string[];
  unknown_facts: string[];
};

export type ExternalMeasurementFreshnessBuildDeps = {
  loadGa4?: typeof loadGa4TrustFunnelAggregateArtifact;
  buildGsc?: (args: { rootDir: string }) => Promise<OwnerGscExternalDemandNeuron>;
  now?: () => Date;
};

function parseReferenceInstant(value: string | "UNKNOWN"): Date | null {
  if (value === "UNKNOWN" || !value.trim()) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const dayEnd = new Date(`${value.trim()}T23:59:59.999Z`);
    return Number.isNaN(dayEnd.getTime()) ? null : dayEnd;
  }
  return null;
}

export function freshnessStatusFromTimestampV1(
  timestamp: string | "UNKNOWN",
  now: Date,
  staleDays = EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1,
): ExternalMeasurementFreshnessStatusV1 {
  const instant = parseReferenceInstant(timestamp);
  if (!instant) return "UNKNOWN";
  const ageMs = now.getTime() - instant.getTime();
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  if (ageMs > staleMs) return "STALE";
  return "OK";
}

function mapGscRuntimeStatus(status: OwnerGscLaneStatus): "OK" | "UNKNOWN" {
  return status === "OK" ? "OK" : "UNKNOWN";
}

function mapGa4RuntimeStatus(artifact: Ga4TrustFunnelArtifact | null | undefined): "OK" | "UNKNOWN" {
  return artifact?.status === "OK" ? "OK" : "UNKNOWN";
}

function combineOverallStatus(
  gsc: ExternalMeasurementFreshnessStatusV1,
  ga4: ExternalMeasurementFreshnessStatusV1,
): ExternalMeasurementFreshnessStatusV1 {
  if (gsc === "UNKNOWN" && ga4 === "UNKNOWN") return "UNKNOWN";
  if (gsc === "STALE" || ga4 === "STALE") return "STALE";
  if (gsc === "OK" && ga4 === "OK") return "OK";
  if (gsc === "UNKNOWN" || ga4 === "UNKNOWN") return "UNKNOWN";
  return "UNKNOWN";
}

function combineRuntimeStatus(
  gscRuntime: "OK" | "UNKNOWN",
  ga4Runtime: "OK" | "UNKNOWN",
): ExternalMeasurementFreshnessRuntimeStatusV1 {
  if (gscRuntime === "OK" && ga4Runtime === "OK") return "OK";
  if (gscRuntime === "UNKNOWN" && ga4Runtime === "UNKNOWN") return "UNKNOWN";
  return "PARTIAL";
}

export async function buildExternalMeasurementFreshnessV1(args: {
  rootDir: string;
  deps?: ExternalMeasurementFreshnessBuildDeps;
}): Promise<ExternalMeasurementFreshnessV1> {
  const now = args.deps?.now?.() ?? new Date();
  const loadGa4 = args.deps?.loadGa4 ?? loadGa4TrustFunnelAggregateArtifact;
  const buildGsc = args.deps?.buildGsc ?? buildOwnerGscExternalDemandNeuron;

  const proven_facts: string[] = [
    "external_measurement_freshness_v1 is read-only Command Center truth; it does not fetch GSC/GA4 or mutate Supabase.",
    `Staleness uses a rolling ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}-day window against artifact timestamps only.`,
  ];
  const unknown_facts: string[] = [];

  const [gscNeuron, ga4Read] = await Promise.all([
    buildGsc({ rootDir: args.rootDir }),
    loadGa4({ rootDir: args.rootDir }),
  ]);

  const gscTimestamp =
    gscNeuron.export_date !== "UNKNOWN" ? gscNeuron.export_date : gscNeuron.fetched_at;
  const gscFreshness =
    gscNeuron.artifact_source === "NONE"
      ? "UNKNOWN"
      : freshnessStatusFromTimestampV1(gscTimestamp, now);

  const gsc: ExternalMeasurementFreshnessGscV1 = {
    runtime_status: mapGscRuntimeStatus(gscNeuron.status),
    connection_level: gscNeuron.connection_level,
    artifact_source: gscNeuron.artifact_source,
    fetched_at_or_export_date: gscTimestamp,
    freshness_status: gscFreshness,
    top_level_note:
      gscNeuron.artifact_source === "NONE"
        ? "No usable GSC durable/local/manual artifact for freshness."
        : gscFreshness === "OK"
          ? `GSC artifact (${gscNeuron.artifact_source}) is within the ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d window.`
          : gscFreshness === "STALE"
            ? `GSC artifact (${gscNeuron.artifact_source}) is older than the ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d window.`
            : "GSC artifact timestamp is UNKNOWN — freshness cannot be proven.",
  };

  proven_facts.push(`gsc artifact_source=${gscNeuron.artifact_source}; connection_level=${gscNeuron.connection_level}.`);
  if (gscFreshness === "UNKNOWN" && gscNeuron.artifact_source === "NONE") {
    unknown_facts.push("GSC measurement artifact is missing — external search demand freshness is UNKNOWN.");
  }
  if (gscFreshness === "STALE") {
    unknown_facts.push(
      `GSC artifact reference date ${gscTimestamp} is STALE (>${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d).`,
    );
  }

  const ga4Artifact = ga4Read.artifact?.artifact ?? null;
  const ga4Source: ExternalMeasurementFreshnessGa4V1["artifact_source"] = ga4Read.artifact?.source ?? "NONE";
  const ga4FetchedAt = ga4Artifact?.fetched_at ?? "UNKNOWN";
  const ga4Freshness =
    ga4Source === "NONE" ? "UNKNOWN" : freshnessStatusFromTimestampV1(ga4FetchedAt, now);

  const ga4: ExternalMeasurementFreshnessGa4V1 = {
    runtime_status: mapGa4RuntimeStatus(ga4Artifact),
    artifact_source: ga4Source,
    fetched_at: ga4FetchedAt,
    freshness_status: ga4Freshness,
    top_level_note:
      ga4Source === "NONE"
        ? "No usable GA4 trust-funnel aggregate artifact for freshness."
        : ga4Freshness === "OK"
          ? `GA4 artifact (${ga4Source}) is within the ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d window.`
          : ga4Freshness === "STALE"
            ? `GA4 artifact (${ga4Source}) is older than the ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d window.`
            : "GA4 artifact fetched_at is UNKNOWN — freshness cannot be proven.",
  };

  if (ga4Source !== "NONE") {
    proven_facts.push(`ga4 artifact_source=${ga4Source}; fetched_at=${ga4FetchedAt}.`);
  }
  if (ga4Read.issue) {
    unknown_facts.push(ga4Read.issue);
  }
  if (ga4Freshness === "UNKNOWN" && ga4Source === "NONE") {
    unknown_facts.push("GA4 trust-funnel aggregate artifact is missing — trust-funnel freshness is UNKNOWN.");
  }
  if (ga4Freshness === "STALE") {
    unknown_facts.push(
      `GA4 artifact fetched_at ${ga4FetchedAt} is STALE (>${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d).`,
    );
  }

  const overall_status = combineOverallStatus(gsc.freshness_status, ga4.freshness_status);
  const runtime_status = combineRuntimeStatus(gsc.runtime_status, ga4.runtime_status);

  return {
    contract: "external_measurement_freshness_v1",
    read_only: true,
    data_mutation: false,
    runtime_status,
    overall_status,
    gsc,
    ga4,
    recommended_commands: ["npm run buckparts:gsc:fetch", "npm run buckparts:ga4:fetch"],
    proven_facts,
    unknown_facts,
  };
}
