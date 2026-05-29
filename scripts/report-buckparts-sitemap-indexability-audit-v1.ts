import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckpartsSitemapIndexabilityAuditV1 } from "./lib/buckparts-sitemap-indexability-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildBuckpartsSitemapIndexabilityAuditV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
