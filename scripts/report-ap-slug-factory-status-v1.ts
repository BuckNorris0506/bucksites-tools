import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildApSlugFactoryStatusV1,
  parseApSlugFactoryStatusCliArgsV1,
} from "./lib/ap-slug-factory-status-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const { slug } = parseApSlugFactoryStatusCliArgsV1(process.argv.slice(2));
  if (!slug) {
    process.stderr.write(
      "Usage: node --import tsx scripts/report-ap-slug-factory-status-v1.ts --slug <filter_slug>\n",
    );
    process.exit(1);
  }

  const report = buildApSlugFactoryStatusV1({ rootDir, slug });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
