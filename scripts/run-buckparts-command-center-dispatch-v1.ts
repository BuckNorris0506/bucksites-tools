/**
 * Command Center dispatch CLI.
 *
 * Exit contract (deliberate safety correction vs pre-Phase-1 baseline that exited 0 on REFUSED):
 * - EXECUTED → exit 0
 * - REFUSED / FAILED → exit 1
 * - thrown errors → exit 1
 *
 * `--no-artifact`: execute only stdout-only allowlisted commands; write no dispatch-run
 * artifact and do not refresh the execution ledger. Full result JSON still printed to stdout.
 */
import path from "node:path";

import { runBuckpartsCommandCenterDispatchRunnerV1 } from "./lib/buckparts-command-center-dispatch-runner-v1";

function parseArgv(argv: string[]): { noArtifact: boolean } {
  const noArtifact = argv.includes("--no-artifact");
  const unknown = argv.filter((a) => a !== "--no-artifact" && a.startsWith("-"));
  if (unknown.length > 0) {
    throw new Error(`Unknown dispatch argv: ${unknown.join(", ")}`);
  }
  return { noArtifact };
}

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const { noArtifact } = parseArgv(process.argv.slice(2));
  const result = await runBuckpartsCommandCenterDispatchRunnerV1({
    rootDir,
    noArtifact,
  });
  if (result.artifact_abs_path) {
    const rel = path.relative(rootDir, result.artifact_abs_path);
    process.stdout.write(`${rel}\n`);
  } else {
    process.stdout.write("no_artifact=true\n");
  }
  process.stdout.write(`${JSON.stringify(result.artifact, null, 2)}\n`);
  // Deliberate safety: REFUSED/FAILED are nonzero so automation cannot treat refusal as success.
  if (result.artifact.execution_status === "REFUSED" || result.artifact.execution_status === "FAILED") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
