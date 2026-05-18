import { loadGa4TrustFunnelAggregateArtifact } from "@/lib/owner-dashboard/load-ga4-trust-funnel-aggregate-artifact";
import type {
  Ga4TrustFunnelArtifact,
  Ga4TrustFunnelArtifactStatus,
} from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";
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
export type ExternalMeasurementUsabilityStatusV1 = "OK" | "UNKNOWN";

export type ExternalMeasurementFreshnessGscV1 = {
  runtime_status: "OK" | "UNKNOWN";
  connection_level: OwnerGscConnectionLevel;
  artifact_source: OwnerGscArtifactSource;
  fetched_at_or_export_date: string | "UNKNOWN";
  /** Timestamp-only recency within the rolling window (ignores API error status). */
  artifact_recency_status: ExternalMeasurementFreshnessStatusV1;
  /** Usable GSC metrics in Command Center — OK only when artifact status is OK. */
  measurement_usability_status: ExternalMeasurementUsabilityStatusV1;
  /** Legacy alias of artifact_recency_status for jq callers. */
  freshness_status: ExternalMeasurementFreshnessStatusV1;
  top_level_note: string;
};

export type ExternalMeasurementFreshnessGa4V1 = {
  runtime_status: "OK" | "UNKNOWN";
  artifact_source: "SUPABASE" | "LOCAL_ARTIFACT" | "NONE";
  fetched_at: string | "UNKNOWN";
  artifact_recency_status: ExternalMeasurementFreshnessStatusV1;
  measurement_usability_status: ExternalMeasurementUsabilityStatusV1;
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

function artifactRecencyStatusV1(
  timestamp: string | "UNKNOWN",
  hasArtifact: boolean,
  now: Date,
): ExternalMeasurementFreshnessStatusV1 {
  if (!hasArtifact) return "UNKNOWN";
  return freshnessStatusFromTimestampV1(timestamp, now);
}

function measurementUsabilityFromGscStatus(
  status: OwnerGscLaneStatus,
  hasArtifact: boolean,
): ExternalMeasurementUsabilityStatusV1 {
  if (!hasArtifact) return "UNKNOWN";
  return status === "OK" ? "OK" : "UNKNOWN";
}

function measurementUsabilityFromGa4Status(
  status: Ga4TrustFunnelArtifactStatus | undefined,
  hasArtifact: boolean,
): ExternalMeasurementUsabilityStatusV1 {
  if (!hasArtifact || !status) return "UNKNOWN";
  return status === "OK" ? "OK" : "UNKNOWN";
}

function mapGscRuntimeStatus(status: OwnerGscLaneStatus): "OK" | "UNKNOWN" {
  return status === "OK" ? "OK" : "UNKNOWN";
}

function mapGa4RuntimeStatus(artifact: Ga4TrustFunnelArtifact | null | undefined): "OK" | "UNKNOWN" {
  return artifact?.status === "OK" ? "OK" : "UNKNOWN";
}

function combineRecencyStatus(
  gsc: ExternalMeasurementFreshnessStatusV1,
  ga4: ExternalMeasurementFreshnessStatusV1,
): ExternalMeasurementFreshnessStatusV1 {
  if (gsc === "UNKNOWN" && ga4 === "UNKNOWN") return "UNKNOWN";
  if (gsc === "STALE" || ga4 === "STALE") return "STALE";
  if (gsc === "OK" && ga4 === "OK") return "OK";
  return "UNKNOWN";
}

export function combineOverallMeasurementFreshnessStatusV1(args: {
  gscUsability: ExternalMeasurementUsabilityStatusV1;
  ga4Usability: ExternalMeasurementUsabilityStatusV1;
  gscRecency: ExternalMeasurementFreshnessStatusV1;
  ga4Recency: ExternalMeasurementFreshnessStatusV1;
}): ExternalMeasurementFreshnessStatusV1 {
  if (args.gscUsability !== "OK" || args.ga4Usability !== "OK") {
    return "UNKNOWN";
  }
  return combineRecencyStatus(args.gscRecency, args.ga4Recency);
}

function combineRuntimeStatus(
  gscRuntime: "OK" | "UNKNOWN",
  ga4Runtime: "OK" | "UNKNOWN",
): ExternalMeasurementFreshnessRuntimeStatusV1 {
  if (gscRuntime === "OK" && ga4Runtime === "OK") return "OK";
  if (gscRuntime === "UNKNOWN" && ga4Runtime === "UNKNOWN") return "UNKNOWN";
  return "PARTIAL";
}

function unusableArtifactUnknownFact(args: {
  feed: "GSC" | "GA4";
  artifactSource: string;
  timestampLabel: string;
  timestamp: string | "UNKNOWN";
  status: string;
}): string {
  return `${args.feed} artifact was refreshed (${args.artifactSource}; ${args.timestampLabel}=${args.timestamp}) but API status is ${args.status}; ${args.feed} metrics are not usable in Command Center.`;
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
    `artifact_recency_status uses a rolling ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}-day window on artifact timestamps only.`,
    "measurement_usability_status is OK only when artifact status is OK — recent UNKNOWN_API_ERROR / UNKNOWN_CONFIG artifacts are not usable measurement truth.",
  ];
  const unknown_facts: string[] = [];

  const [gscNeuron, ga4Read] = await Promise.all([
    buildGsc({ rootDir: args.rootDir }),
    loadGa4({ rootDir: args.rootDir }),
  ]);

  const gscHasArtifact = gscNeuron.artifact_source !== "NONE";
  const gscTimestamp =
    gscNeuron.export_date !== "UNKNOWN" ? gscNeuron.export_date : gscNeuron.fetched_at;
  const gscRecency = artifactRecencyStatusV1(gscTimestamp, gscHasArtifact, now);
  const gscUsability = measurementUsabilityFromGscStatus(gscNeuron.status, gscHasArtifact);

  const gsc: ExternalMeasurementFreshnessGscV1 = {
    runtime_status: mapGscRuntimeStatus(gscNeuron.status),
    connection_level: gscNeuron.connection_level,
    artifact_source: gscNeuron.artifact_source,
    fetched_at_or_export_date: gscTimestamp,
    artifact_recency_status: gscRecency,
    measurement_usability_status: gscUsability,
    freshness_status: gscRecency,
    top_level_note:
      !gscHasArtifact
        ? "No GSC durable/local/manual artifact for freshness."
        : gscUsability !== "OK"
          ? `GSC artifact (${gscNeuron.artifact_source}) was refreshed but status=${gscNeuron.status} — metrics not usable.`
          : gscRecency === "OK"
            ? `GSC artifact (${gscNeuron.artifact_source}) is recent and status=OK.`
            : gscRecency === "STALE"
              ? `GSC artifact (${gscNeuron.artifact_source}) is older than ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d but status=OK.`
              : "GSC artifact timestamp is UNKNOWN — recency cannot be proven.",
  };

  proven_facts.push(`gsc artifact_source=${gscNeuron.artifact_source}; status=${gscNeuron.status}.`);
  if (!gscHasArtifact) {
    unknown_facts.push("GSC measurement artifact is missing — external search demand freshness is UNKNOWN.");
  }
  if (gscHasArtifact && gscUsability !== "OK") {
    unknown_facts.push(
      unusableArtifactUnknownFact({
        feed: "GSC",
        artifactSource: gscNeuron.artifact_source,
        timestampLabel: gscNeuron.export_date !== "UNKNOWN" ? "export_date" : "fetched_at",
        timestamp: gscTimestamp,
        status: gscNeuron.status,
      }),
    );
  }
  if (gscRecency === "STALE" && gscUsability === "OK") {
    unknown_facts.push(
      `GSC artifact reference date ${gscTimestamp} is STALE (>${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d).`,
    );
  }

  const ga4Artifact = ga4Read.artifact?.artifact ?? null;
  const ga4Source: ExternalMeasurementFreshnessGa4V1["artifact_source"] = ga4Read.artifact?.source ?? "NONE";
  const ga4FetchedAt = ga4Artifact?.fetched_at ?? "UNKNOWN";
  const ga4HasArtifact = ga4Source !== "NONE";
  const ga4Recency = artifactRecencyStatusV1(ga4FetchedAt, ga4HasArtifact, now);
  const ga4Usability = measurementUsabilityFromGa4Status(ga4Artifact?.status, ga4HasArtifact);

  const ga4: ExternalMeasurementFreshnessGa4V1 = {
    runtime_status: mapGa4RuntimeStatus(ga4Artifact),
    artifact_source: ga4Source,
    fetched_at: ga4FetchedAt,
    artifact_recency_status: ga4Recency,
    measurement_usability_status: ga4Usability,
    freshness_status: ga4Recency,
    top_level_note:
      !ga4HasArtifact
        ? "No GA4 trust-funnel aggregate artifact for freshness."
        : ga4Usability !== "OK"
          ? `GA4 artifact (${ga4Source}) was refreshed but status=${ga4Artifact?.status ?? "UNKNOWN"} — metrics not usable.`
          : ga4Recency === "OK"
            ? `GA4 artifact (${ga4Source}) is recent and status=OK.`
            : ga4Recency === "STALE"
              ? `GA4 artifact (${ga4Source}) is older than ${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d but status=OK.`
              : "GA4 artifact fetched_at is UNKNOWN — recency cannot be proven.",
  };

  if (ga4HasArtifact) {
    proven_facts.push(`ga4 artifact_source=${ga4Source}; status=${ga4Artifact?.status ?? "UNKNOWN"}; fetched_at=${ga4FetchedAt}.`);
  }
  if (ga4Read.issue) {
    unknown_facts.push(ga4Read.issue);
  }
  if (!ga4HasArtifact) {
    unknown_facts.push("GA4 trust-funnel aggregate artifact is missing — trust-funnel freshness is UNKNOWN.");
  }
  if (ga4HasArtifact && ga4Usability !== "OK") {
    unknown_facts.push(
      unusableArtifactUnknownFact({
        feed: "GA4",
        artifactSource: ga4Source,
        timestampLabel: "fetched_at",
        timestamp: ga4FetchedAt,
        status: ga4Artifact?.status ?? "UNKNOWN",
      }),
    );
  }
  if (ga4Recency === "STALE" && ga4Usability === "OK") {
    unknown_facts.push(
      `GA4 artifact fetched_at ${ga4FetchedAt} is STALE (>${EXTERNAL_MEASUREMENT_FRESHNESS_STALE_DAYS_V1}d).`,
    );
  }

  const overall_status = combineOverallMeasurementFreshnessStatusV1({
    gscUsability,
    ga4Usability,
    gscRecency,
    ga4Recency,
  });
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
