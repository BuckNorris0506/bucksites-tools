import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSingleSubjectContractPortabilityTestReportV1 } from "./lib/buckparts-single-subject-contract-portability-test-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildSingleSubjectContractPortabilityTestReportV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
