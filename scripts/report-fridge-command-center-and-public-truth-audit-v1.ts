import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeCommandCenterAndPublicTruthAuditV1 } from "./lib/fridge-command-center-and-public-truth-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildFridgeCommandCenterAndPublicTruthAuditV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
