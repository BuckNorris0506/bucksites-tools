/**
 * Server-only entry to build the BuckParts Command Center report (includes v2).
 * Lives under src so Next can bundle Node runtime code; delegates to scripts/.
 */
import { buildBuckpartsCommandCenterReport } from "../../../scripts/report-buckparts-command-center";

export type OwnerCommandCenterLoadResult =
  | { ok: true; report: Awaited<ReturnType<typeof buildBuckpartsCommandCenterReport>> }
  | { ok: false; message: string };

export async function loadCommandCenterReportForOwner(rootDir = process.cwd()): Promise<OwnerCommandCenterLoadResult> {
  try {
    const report = await buildBuckpartsCommandCenterReport({ rootDir });
    return { ok: true, report };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return { ok: false, message: msg };
  }
}
