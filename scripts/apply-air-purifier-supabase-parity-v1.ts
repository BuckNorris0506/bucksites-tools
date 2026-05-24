import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import {
  createApSupabaseParityLiveDepsV1,
  parseApSupabaseParityCliArgsV1,
  runAirPurifierSupabaseParityV1,
} from "./lib/air-purifier-supabase-apply-parity-v1";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  loadEnv();
  const cli = parseApSupabaseParityCliArgsV1(process.argv.slice(2));
  const mode = cli.apply ? "apply" : "dry_run";

  const report = await runAirPurifierSupabaseParityV1({
    rootDir,
    mode,
    planPath: cli.planPath ?? undefined,
    deps: createApSupabaseParityLiveDepsV1(getSupabaseAdmin),
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.apply_status === "BLOCKED") {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
