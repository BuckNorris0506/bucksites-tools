import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertApAgentPacketOutDirAllowedV1,
  buildAirPurifierAgentPacketsV1Report,
  parseAirPurifierAgentPacketsCliArgsV1,
} from "./lib/air-purifier-agent-packets-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const { outDir } = parseAirPurifierAgentPacketsCliArgsV1(process.argv.slice(2));
  if (outDir) {
    assertApAgentPacketOutDirAllowedV1(outDir, rootDir);
  }

  const report = await buildAirPurifierAgentPacketsV1Report({
    rootDir,
    outDir,
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
