#!/usr/bin/env node
/**
 * Owner-authorized guarded Supabase parity apply for RPWFE official GE only.
 * Pass --apply to mutate public.retailer_links (single rpwfe primary row).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRpwfeSupabaseParityLiveDepsV1,
  executeRpwfeOfficialGeSupabaseParityApplyV1,
} from "./lib/rpwfe-official-ge-supabase-parity-apply-v1";
import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  loadEnv();
  const apply = process.argv.includes("--apply");

  const run = await executeRpwfeOfficialGeSupabaseParityApplyV1({
    rootDir,
    apply,
    deps: createRpwfeSupabaseParityLiveDepsV1(getSupabaseAdmin),
  });

  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
  process.exit(run.apply_status === "BLOCKED" ? 1 : 0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
