import { pathToFileURL } from "node:url";

import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1 } from "./lib/ingest-hqii-retailer-links-mutation-gate-v1";
import {
  createIngestHqiiRetailerLinksLiveDepsV1,
  parseIngestHqiiRetailerLinksCliArgsV1,
  runIngestHqiiRetailerLinksV1,
  __testables,
} from "./lib/ingest-hqii-retailer-links-run-v1";

export { __testables };

const mutationGateRef = INGEST_HQII_RETAILER_LINKS_MUTATION_GATE_REF_V1;
void mutationGateRef;

async function main() {
  loadEnv();
  const { inputPath, write, wedge, allowUnknownRetailers } =
    parseIngestHqiiRetailerLinksCliArgsV1(process.argv);
  if (!inputPath) {
    throw new Error("Missing --input <path-to-json>");
  }
  const wedgeArg = wedge ?? HOMEKEEP_WEDGE_CATALOG.air_purifier;

  const result = await runIngestHqiiRetailerLinksV1({
    rootDir: process.cwd(),
    inputPath,
    write,
    wedgeArg,
    allowUnknownRetailers,
    deps: createIngestHqiiRetailerLinksLiveDepsV1(getSupabaseAdmin),
  });

  for (const warning of result.unknown_retailer_warnings) {
    console.warn(warning);
  }
  console.log(JSON.stringify(result.report, null, 2));
  process.exit(result.exit_code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    if (err instanceof Error) {
      console.error(`[ingest-hqii-retailer-links] FAILED: ${err.message}`);
      if (err.stack) console.error(err.stack);
    } else {
      console.error("[ingest-hqii-retailer-links] FAILED (non-Error):", err);
    }
    process.exitCode = 1;
  });
}
