/**
 * Command Center dispatch CLI.
 *
 * Exit contract:
 * - EXECUTED / ALREADY_EXECUTED → exit 0
 * - REFUSED / FAILED → exit 1
 * - thrown errors → exit 1
 *
 * `--no-artifact`: execute only stdout-only allowlisted commands; write no dispatch-run
 * artifact and do not refresh the execution ledger. Full result JSON still printed to stdout.
 *
 * `--resume-run-id=<id>`: resume durable journal stages (artifact/ledger). Cannot combine with --no-artifact.
 */
import path from "node:path";

import { runBuckpartsCommandCenterDispatchRunnerV1 } from "./lib/buckparts-command-center-dispatch-runner-v1";
import { isValidDispatchRunIdV1 } from "./lib/buckparts-command-center-dispatch-recovery-v1";

/** Production CLI argv parser (exported for Phase 2 lifecycle integration tests). */
export function parseBuckpartsCommandCenterDispatchArgvV1(argv: string[]): {
  noArtifact: boolean;
  resumeRunId?: string;
} {
  let noArtifact = false;
  let resumeRunId: string | undefined;
  for (const a of argv) {
    if (a === "--no-artifact") {
      noArtifact = true;
      continue;
    }
    if (a.startsWith("--resume-run-id=")) {
      resumeRunId = a.slice("--resume-run-id=".length).trim();
      continue;
    }
    if (a.startsWith("-")) {
      throw new Error(`Unknown dispatch argv: ${a}`);
    }
  }
  if (resumeRunId !== undefined) {
    if (!resumeRunId || !isValidDispatchRunIdV1(resumeRunId)) {
      throw new Error(
        `Refused: malformed --resume-run-id (expected 32 hex chars): ${resumeRunId || "(empty)"}`,
      );
    }
  }
  if (noArtifact && resumeRunId) {
    throw new Error(
      "Refused: --resume-run-id cannot combine with --no-artifact (no read-only resume mutation mode).",
    );
  }
  return { noArtifact, resumeRunId };
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const { noArtifact, resumeRunId } = parseBuckpartsCommandCenterDispatchArgvV1(
    process.argv.slice(2),
  );
  const result = await runBuckpartsCommandCenterDispatchRunnerV1({
    rootDir,
    noArtifact,
    resumeRunId,
  });
  if (result.artifact_abs_path) {
    const rel = path.relative(rootDir, result.artifact_abs_path);
    process.stdout.write(`${rel}\n`);
  } else {
    process.stdout.write("no_artifact=true\n");
  }
  process.stdout.write(`${JSON.stringify(result.artifact, null, 2)}\n`);
  if (
    result.artifact.execution_status === "REFUSED" ||
    result.artifact.execution_status === "FAILED"
  ) {
    process.exitCode = 1;
  }
}

const isDirectCli =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("run-buckparts-command-center-dispatch-v1.ts") ||
    process.argv[1].endsWith("run-buckparts-command-center-dispatch-v1.js"));

if (isDirectCli) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
