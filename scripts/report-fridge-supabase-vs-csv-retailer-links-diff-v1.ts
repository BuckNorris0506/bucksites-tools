import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFridgeSupabaseVsCsvRetailerLinksDiffV1 } from "./lib/fridge-supabase-vs-csv-retailer-links-diff-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const report = await buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
