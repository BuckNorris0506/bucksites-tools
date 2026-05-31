import path from "node:path";

import type { LiveSiteMonitorV1 } from "./buckparts-command-center-v2-types";
import {
  OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  readOwnerArtifactFromSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";

import { isLiveSiteMonitorV1 } from "./live-site-smoke";
import type { LiveSiteMonitorArtifactSourceV1 } from "./deploy-live-site-monitor-command-center-lane-v1";
import { runLiveSiteSmokeCheck } from "../live-site-smoke-check";
import { loadEnv } from "./load-env";

export type LiveSiteMonitorLoadResultV1 = {
  monitor: LiveSiteMonitorV1 | null;
  artifact_source: LiveSiteMonitorArtifactSourceV1;
};

function isStaleLegacyLiveSiteMonitor(mon: LiveSiteMonitorV1): boolean {
  return (
    mon.content_contracts.length === 0 ||
    mon.content_contract_status == null ||
    mon.content_contract_status === "UNKNOWN" ||
    mon.route_http_status == null
  );
}

function normalizeLegacyMonitor(parsed: LiveSiteMonitorV1): LiveSiteMonitorV1 {
  const allHttpOk =
    parsed.routes.length > 0 && parsed.routes.every((r) => r.ok && typeof r.status_code === "number");
  const route_http_status = parsed.route_http_status ?? (allHttpOk ? "OK" : "ATTENTION");
  const content_contracts = parsed.content_contracts ?? [];
  const content_contract_status =
    parsed.content_contract_status ??
    (content_contracts.length > 0 && content_contracts.every((c) => c.content_contract_ok) ? "OK" : "ATTENTION");
  const runtime_status =
    route_http_status === "OK" && content_contract_status === "OK" && parsed.runtime_status !== "UNKNOWN_CONFIG"
      ? parsed.runtime_status === "ATTENTION"
        ? "ATTENTION"
        : "OK"
      : parsed.runtime_status === "UNKNOWN_CONFIG"
        ? "UNKNOWN_CONFIG"
        : "ATTENTION";

  return {
    ...parsed,
    route_http_status,
    content_contract_status,
    content_contracts,
    runtime_status,
  };
}

export async function loadLiveSiteMonitorForCommandCenter(args: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): Promise<LiveSiteMonitorLoadResultV1> {
  const abs = path.resolve(args.rootDir, "data/reports/buckparts-live-site-smoke.json");
  if (args.fileExists(abs)) {
    try {
      const parsed: unknown = JSON.parse(args.readTextFile(abs));
      if (isLiveSiteMonitorV1(parsed)) {
        return {
          monitor: normalizeLegacyMonitor(parsed),
          artifact_source: "local_file",
        };
      }
    } catch {
      /* fall through to Supabase */
    }
  }

  const fromDb = await readOwnerArtifactFromSupabase<LiveSiteMonitorV1>({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  });
  if (fromDb.ok && isLiveSiteMonitorV1(fromDb.artifact)) {
    return {
      monitor: normalizeLegacyMonitor(fromDb.artifact),
      artifact_source: "supabase",
    };
  }

  return { monitor: null, artifact_source: "UNKNOWN" };
}

export async function loadOrRunLiveSiteMonitorForCommandCenter(args: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
  env?: NodeJS.ProcessEnv;
  inlineReadOnlyFallback?: boolean;
}): Promise<LiveSiteMonitorLoadResultV1> {
  const loaded = await loadLiveSiteMonitorForCommandCenter(args);
  const staleLegacy = loaded.monitor != null && isStaleLegacyLiveSiteMonitor(loaded.monitor);
  if (loaded.monitor && !staleLegacy) return loaded;
  if (args.inlineReadOnlyFallback !== true) {
    return loaded.monitor
      ? { monitor: normalizeLegacyMonitor(loaded.monitor), artifact_source: loaded.artifact_source }
      : loaded;
  }

  loadEnv(args.rootDir);
  const inline = await runLiveSiteSmokeCheck(args.rootDir, {
    env: args.env ?? process.env,
    loadEnvFn: () => {},
    source: "scripts/report-buckparts-command-center.ts:inline_read_only",
  });
  if (inline.runtime_status === "UNKNOWN_CONFIG" && loaded.monitor) {
    return {
      monitor: normalizeLegacyMonitor(loaded.monitor),
      artifact_source: loaded.artifact_source,
    };
  }
  return { monitor: inline, artifact_source: "inline_read_only" };
}
