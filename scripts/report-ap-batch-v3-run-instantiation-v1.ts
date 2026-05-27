import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildApBatchV3RunInstantiationV1Report,
  parseApBatchV3RunInstantiationCliArgsV1,
} from "./lib/ap-batch-v3-run-instantiation-v1";
import { buildBatchProductionOperatingChecklistV1 } from "./lib/buckparts-batch-production-operating-checklist-v1";
import { buildDemandToCoverageNextLaneV1Report } from "./lib/demand-to-coverage-next-lane-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const { write, writePackets, outDir } = parseApBatchV3RunInstantiationCliArgsV1(process.argv.slice(2));
  if (writePackets && !write) {
    throw new Error("--write-packets requires --write");
  }

  const demand = await buildDemandToCoverageNextLaneV1Report({ rootDir });
  const checklist = buildBatchProductionOperatingChecklistV1({ rootDir });

  const report = await buildApBatchV3RunInstantiationV1Report({
    rootDir,
    demandToCoverageNextLane: demand,
    checklist,
    write,
    writePackets,
    outDir,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
