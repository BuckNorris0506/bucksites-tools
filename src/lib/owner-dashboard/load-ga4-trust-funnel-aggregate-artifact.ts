import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
  readOwnerArtifactFromSupabase,
} from "@/lib/owner-dashboard/gsc-durable-artifact-store";
import {
  parseGa4TrustFunnelArtifact,
  type Ga4TrustFunnelArtifact,
} from "@/lib/owner-dashboard/ga4-trust-funnel-artifact";

export async function loadGa4TrustFunnelAggregateArtifact(args: {
  rootDir: string;
}): Promise<{
  artifact: { source: "SUPABASE" | "LOCAL_ARTIFACT"; artifact: Ga4TrustFunnelArtifact } | null;
  issue: string | null;
}> {
  const supabaseRead = await readOwnerArtifactFromSupabase<Ga4TrustFunnelArtifact>({
    artifact_key: OWNER_REPORT_ARTIFACT_KEY_GA4_TRUST_FUNNEL,
  });
  if (supabaseRead.ok) {
    return { artifact: { source: "SUPABASE", artifact: supabaseRead.artifact }, issue: null };
  }
  let issue: string | null = null;
  if (supabaseRead.reason !== "NOT_FOUND") {
    issue = `GA4 durable artifact read issue: ${supabaseRead.details.join(" ")}`;
  }

  const localPath = path.resolve(args.rootDir, "data/reports/buckparts-ga4-trust-funnel.json");
  if (!existsSync(localPath)) {
    return { artifact: null, issue };
  }
  try {
    const parsed = parseGa4TrustFunnelArtifact(readFileSync(localPath, "utf8"));
    if (parsed.ok) {
      return {
        artifact: { source: "LOCAL_ARTIFACT", artifact: parsed.artifact },
        issue:
          issue ??
          (supabaseRead.reason === "NOT_FOUND"
            ? "GA4 durable artifact not found; local artifact fallback used."
            : null),
      };
    }
    return { artifact: null, issue: `Local GA4 trust-funnel artifact parse failed: ${parsed.reason}` };
  } catch {
    return { artifact: null, issue: "Local GA4 trust-funnel artifact exists but could not be read." };
  }
}
