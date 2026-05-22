import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildDemandToCoverageNextLaneV1Report } from "./lib/demand-to-coverage-next-lane-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildDemandToCoverageNextLaneV1Report({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
