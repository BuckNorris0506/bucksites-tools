import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPublicWedgeReadinessAndEasiestWinsV1 } from "./lib/public-wedge-readiness-and-easiest-wins-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildPublicWedgeReadinessAndEasiestWinsV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
