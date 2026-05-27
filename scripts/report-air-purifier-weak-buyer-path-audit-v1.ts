import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAirPurifierWeakBuyerPathAuditV1Report } from "./lib/air-purifier-weak-buyer-path-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildAirPurifierWeakBuyerPathAuditV1Report({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
