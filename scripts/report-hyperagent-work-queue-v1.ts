import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildHyperAgentWorkQueueV1 } from "./lib/hyperagent-work-queue-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildHyperAgentWorkQueueV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
