import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { GscSearchAnalyticsArtifact } from "@/lib/owner-dashboard/gsc-api-artifact";

export const OWNER_REPORT_ARTIFACT_KEY_GSC = "gsc_search_analytics" as const;

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

export async function readGscArtifactFromSupabase(args?: { env?: EnvSource }): Promise<DurableReadResult> {
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
    .eq("artifact_key", OWNER_REPORT_ARTIFACT_KEY_GSC)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "READ_ERROR", details: [`Supabase read failed: ${error.message}`] };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "NOT_FOUND", details: ["Supabase GSC artifact row not found."] };
  }

  const payload = (data as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "READ_ERROR", details: ["Supabase GSC artifact payload is missing or invalid."] };
  }

  return { ok: true, artifact: payload as GscSearchAnalyticsArtifact, source: "SUPABASE" };
}

export type DurableWriteResult =
  | { ok: true; sink: "SUPABASE"; details: string[] }
  | { ok: false; reason: "MISSING_CONFIG" | "WRITE_ERROR"; details: string[] };

export async function writeGscArtifactToSupabase(
  artifact: GscSearchAnalyticsArtifact,
  args?: { env?: EnvSource },
): Promise<DurableWriteResult> {
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
      artifact_key: OWNER_REPORT_ARTIFACT_KEY_GSC,
      status: artifact.status,
      fetched_at: artifact.fetched_at,
      payload: artifact,
      source: "scripts/fetch-buckparts-gsc-artifact.ts",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "artifact_key" },
  );

  if (error) {
    return { ok: false, reason: "WRITE_ERROR", details: [`Supabase write failed: ${error.message}`] };
  }

  return { ok: true, sink: "SUPABASE", details: ["Supabase owner_report_artifacts upsert succeeded."] };
}
