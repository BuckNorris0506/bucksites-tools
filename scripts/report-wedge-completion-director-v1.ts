import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWedgeCompletionDirectorReportV1 } from "./lib/wedge-completion-director-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildWedgeCompletionDirectorReportV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`wedge_completion_director_v1 failed: ${message}\n`);
  process.exit(1);
});
