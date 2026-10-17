/**
 * Executive Runtime v2 CLI — BROKEN-FIRST adjudication.
 * Stdout JSON only (see docs/BuckParts-JSON-STDOUT-CONTRACT.md).
 * Runs existing v0 observe + v1 understand, then adjudicates broken_state / binding_constraint.
 * Does not dispatch, write, schedule, or create ODRs.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  brokenFirstSucceededV2,
  buildExecutiveRuntimeBrokenFirstV2,
} from "./lib/buckparts-executive-runtime-broken-first-v2";
import {
  buildExecutiveRuntimeUnderstandV1,
  understandSucceededV1,
} from "./lib/buckparts-executive-runtime-understand-v1";
import {
  readGitHeadFromRepoV0,
  runExecutiveRuntimeWakeObserveV0,
} from "./lib/buckparts-executive-runtime-wake-observe-v0";

export async function main(rootDir = process.cwd()): Promise<void> {
  let commandCenter: unknown = null;
  const { ok: observeOk, snapshot: observe } = await runExecutiveRuntimeWakeObserveV0({
    rootDir,
    readGitHead: () => readGitHeadFromRepoV0(rootDir),
    loadCommandCenter: async () => {
      const { buildBuckpartsCommandCenterReport } = await import("./report-buckparts-command-center");
      commandCenter = await buildBuckpartsCommandCenterReport({
        rootDir,
        inlineLiveSiteSmokeFallback: true,
      });
      return commandCenter;
    },
  });

  const understand = buildExecutiveRuntimeUnderstandV1({
    commandCenter,
    observe: {
      cycle_status: observe.cycle_status,
      blocked_reasons: observe.blocked_reasons,
    },
  });

  const snapshot = buildExecutiveRuntimeBrokenFirstV2({
    commandCenter,
    observe: {
      cycle_status: observe.cycle_status,
      blocked_reasons: observe.blocked_reasons,
    },
    understand: {
      cycle_status: understand.cycle_status,
      blocked_reasons: understand.blocked_reasons,
    },
  });

  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  if (!observeOk || !understandSucceededV1(understand) || !brokenFirstSucceededV2(snapshot)) {
    process.exitCode = 1;
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error("[executive-runtime-broken-first-v2] failed", error);
    process.exit(1);
  });
}
