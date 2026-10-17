/**
 * Executive Runtime v0 CLI — stdout JSON only (see docs/BuckParts-JSON-STDOUT-CONTRACT.md).
 * Invokes existing Command Center. Does not dispatch, write, or create ODRs.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readGitHeadFromRepoV0,
  runExecutiveRuntimeWakeObserveV0,
} from "./lib/buckparts-executive-runtime-wake-observe-v0";

export async function main(rootDir = process.cwd()): Promise<void> {
  const { ok, snapshot } = await runExecutiveRuntimeWakeObserveV0({
    rootDir,
    readGitHead: () => readGitHeadFromRepoV0(rootDir),
    loadCommandCenter: async () => {
      const { buildBuckpartsCommandCenterReport } = await import("./report-buckparts-command-center");
      return buildBuckpartsCommandCenterReport({
        rootDir,
        inlineLiveSiteSmokeFallback: true,
      });
    },
  });
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  if (!ok) process.exitCode = 1;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error("[executive-runtime-wake-observe-v0] failed", error);
    process.exit(1);
  });
}
