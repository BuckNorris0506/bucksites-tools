import path from "node:path";

import { runBuckpartsCommandCenterDispatchRunnerV1 } from "./lib/buckparts-command-center-dispatch-runner-v1";

async function main(): Promise<void> {
  const rootDir = process.cwd();
  const result = await runBuckpartsCommandCenterDispatchRunnerV1({ rootDir });
  const rel = path.relative(rootDir, result.artifact_abs_path);
  process.stdout.write(`${rel}\n`);
  process.stdout.write(`${JSON.stringify(result.artifact, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

