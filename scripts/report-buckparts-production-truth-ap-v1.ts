import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildProductionTruthApReportV1 } from "./lib/buckparts-production-truth-ap-v1";

const THIS_FILE = fileURLToPath(import.meta.url);

export async function main(): Promise<void> {
  const report = await buildProductionTruthApReportV1();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.summary.fail > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((err) => {
    console.error("[report-buckparts-production-truth-ap-v1] failed", err);
    process.exit(1);
  });
}
