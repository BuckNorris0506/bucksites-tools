import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAirPurifierTruthSpineV1 } from "./lib/air-purifier-truth-spine-v1";

/**
 * Standalone air purifier truth spine JSON stdout.
 */
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildAirPurifierTruthSpineV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
