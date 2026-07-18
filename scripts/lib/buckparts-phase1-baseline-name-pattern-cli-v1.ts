/**
 * Emit escaped regex name-pattern for the nine baseline CC tests.
 * Usage: node --import tsx scripts/lib/buckparts-phase1-baseline-name-pattern-cli-v1.ts <specJson>
 */
import { readFileSync } from "node:fs";

const specPath = process.argv[2];
if (!specPath) {
  console.error("usage: <specJson>");
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, "utf8")) as {
  tests: Array<{ name: string }>;
};
console.log(
  spec.tests
    .map((t) => t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
);
