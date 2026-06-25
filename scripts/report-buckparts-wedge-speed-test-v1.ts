import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWedgeSpeedTestReportV1 } from "./lib/buckparts-wedge-speed-test-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildWedgeSpeedTestReportV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
