#!/usr/bin/env node
/**
 * Read-only CLI for all-product safe buyer path census JSON.
 */
import { buildAllProductSafeBuyerPathCensusV1Report } from "./lib/all-product-safe-buyer-path-census-v1";

async function main(): Promise<void> {
  const report = await buildAllProductSafeBuyerPathCensusV1Report({ rootDir: process.cwd() });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
