import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckpartsGrantReadinessV1 } from "./lib/buckparts-grant-readiness-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildBuckpartsGrantReadinessV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
