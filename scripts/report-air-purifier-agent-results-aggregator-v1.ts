import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertAggregatorOutPathAllowedV1,
  buildAirPurifierAgentResultsAggregatorV1Report,
  parseAirPurifierAgentResultsAggregatorCliArgsV1,
  writeAggregatorArtifactsV1,
} from "./lib/air-purifier-agent-results-aggregator-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const cli = parseAirPurifierAgentResultsAggregatorCliArgsV1(process.argv.slice(2));

  const report = buildAirPurifierAgentResultsAggregatorV1Report({
    rootDir,
    resultsDir: cli.resultsDir ?? undefined,
    strict: cli.strict,
  });

  if (cli.outPath) {
    assertAggregatorOutPathAllowedV1(cli.outPath, rootDir);
    writeAggregatorArtifactsV1({
      report,
      outPath: cli.outPath,
      markdownOutPath: cli.markdownOutPath,
      rootDir,
    });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
