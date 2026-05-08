import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { GscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";

export const OWNER_REPORT_ARTIFACT_KEY_GSC = "gsc_search_analytics" as const;
export const OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL = "ga4_trust_funnel" as const;

type EnvSource = Record<string, string | undefined>;

type ArtifactStoreClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: string; log_safe_details: string[] };

function createArtifactStoreClient(args?: { env?: EnvSource }): ArtifactStoreClientResult {
  const env = args?.env ?? process.env;
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "").trim();
  const serviceRole = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !serviceRole) {
    return {
      ok: false,
      reason: "UNKNOWN_SUPABASE_CONFIG",
      log_safe_details: [
        `NEXT_PUBLIC_SUPABASE_URL configured=${String(url.length > 0)}`,
        `SUPABASE_SERVICE_ROLE_KEY configured=${String(serviceRole.length > 0)}`,
      ],
    };
  }

  return {
    ok: true,
    client: createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export type DurableReadResult =
  | { ok: true; artifact: GscSearchAnalyticsArtifact; source: "SUPABASE" }
  | { ok: false; reason: "MISSING_CONFIG" | "NOT_FOUND" | "READ_ERROR"; details: string[] };

export async function readOwnerArtifactFromSupabase<T>(args: {
  artifact_key: string;
  env?: EnvSource;
}): Promise<
  | { ok: true; artifact: T; source: "SUPABASE" }
  | { ok: false; reason: "MISSING_CONFIG" | "NOT_FOUND" | "READ_ERROR"; details: string[] }
> {
  const clientResult = createArtifactStoreClient({ env: args?.env });
  if (!clientResult.ok) {
    return {
      ok: false,
      reason: "MISSING_CONFIG",
      details: [clientResult.reason, ...clientResult.log_safe_details],
    };
  }

  const { data, error } = await clientResult.client
    .from("owner_report_artifacts")
    .select("status,fetched_at,payload,source")
    .eq("artifact_key", args.artifact_key)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "READ_ERROR", details: [`Supabase read failed: ${error.message}`] };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "NOT_FOUND", details: [`Supabase artifact row not found for key=${args.artifact_key}.`] };
  }

  const payload = (data as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "READ_ERROR", details: [`Supabase artifact payload is missing or invalid for key=${args.artifact_key}.`] };
  }

  return { ok: true, artifact: payload as T, source: "SUPABASE" };
}

export async function readGscArtifactFromSupabase(args?: { env?: EnvSource }): Promise<DurableReadResult> {
  return readOwnerArtifactFromSupabase<GscSearchAnalyticsArtifact>({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_GSC,
    env: args?.env,
  });
}

export type DurableWriteResult =
  | { ok: true; sink: "SUPABASE"; details: string[] }
  | { ok: false; reason: "MISSING_CONFIG" | "WRITE_ERROR"; details: string[] };

export async function writeGscArtifactToSupabase(
  artifact: GscSearchAnalyticsArtifact,
  args?: { env?: EnvSource },
): Promise<DurableWriteResult> {
  return writeOwnerArtifactToSupabase({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_GSC,
    status: artifact.status,
    fetched_at: artifact.fetched_at,
    payload: artifact,
    source: "scripts/fetch-buckparts-gsc-artifact.ts",
    env: args?.env,
  });
}

export async function writeOwnerArtifactToSupabase(args: {
  artifact_key: string;
  status: string;
  fetched_at: string;
  payload: unknown;
  source: string;
  env?: EnvSource;
}): Promise<DurableWriteResult> {
  const clientResult = createArtifactStoreClient({ env: args?.env });
  if (!clientResult.ok) {
    return {
      ok: false,
      reason: "MISSING_CONFIG",
      details: [clientResult.reason, ...clientResult.log_safe_details],
    };
  }

  const { error } = await clientResult.client.from("owner_report_artifacts").upsert(
    {
      artifact_key: args.artifact_key,
      status: args.status,
      fetched_at: args.fetched_at,
      payload: args.payload,
      source: args.source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "artifact_key" },
  );

  if (error) {
    return { ok: false, reason: "WRITE_ERROR", details: [`Supabase write failed: ${error.message}`] };
  }

  return { ok: true, sink: "SUPABASE", details: ["Supabase owner_report_artifacts upsert succeeded."] };
}
