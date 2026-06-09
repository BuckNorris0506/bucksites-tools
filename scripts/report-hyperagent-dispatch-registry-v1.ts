import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildHyperAgentDispatchRegistryV1 } from "./lib/hyperagent-dispatch-registry-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildHyperAgentDispatchRegistryV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
