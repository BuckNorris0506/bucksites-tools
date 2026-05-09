import path from "node:path";

import type { LiveSiteMonitorV1 } from "./buckparts-command-center-v2-types";
import {
  OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  readOwnerArtifactFromSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";

import { isLiveSiteMonitorV1 } from "./live-site-smoke";

export async function loadLiveSiteMonitorForCommandCenter(args: {
  rootDir: string;
  fileExists: (absolutePath: string) => boolean;
  readTextFile: (absolutePath: string) => string;
}): Promise<LiveSiteMonitorV1 | null> {
  const abs = path.resolve(args.rootDir, "data/reports/buckparts-live-site-smoke.json");
  if (args.fileExists(abs)) {
    try {
      const parsed: unknown = JSON.parse(args.readTextFile(abs));
      if (isLiveSiteMonitorV1(parsed)) return parsed;
    } catch {
      /* fall through to Supabase */
    }
  }

  const fromDb = await readOwnerArtifactFromSupabase<LiveSiteMonitorV1>({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_LIVE_SITE_SMOKE,
  });
  if (fromDb.ok && isLiveSiteMonitorV1(fromDb.artifact)) return fromDb.artifact;
  return null;
}
