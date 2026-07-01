/**
 * Deletes legacy demo placeholder brands from public.brands. ON DELETE CASCADE removes
 * air_purifier_* and whole_house_water_* rows tied to purebrand / poewat (not in CSV packs).
 *
 * Default: dry-run (SELECT only, no DELETE). Pass --write for mutation intent.
 * Write also requires BUCKPARTS_ALLOW_FROZEN=true plus founder + trust + MUTATION gates.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Usage:
 *   npx tsx scripts/remove-demo-wedge-brands.ts
 *   BUCKPARTS_ALLOW_FROZEN=true npx tsx scripts/remove-demo-wedge-brands.ts --write
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./lib/load-env";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { runRemoveDemoWedgeBrandsV1 } from "./lib/remove-demo-wedge-brands-run-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

loadEnv();

async function main() {
  const write = process.argv.includes("--write");
  const { report, exit_code } = await runRemoveDemoWedgeBrandsV1({
    rootDir,
    write,
    allowFrozen: process.env.BUCKPARTS_ALLOW_FROZEN === "true",
    deps: { getSupabaseAdmin },
  });
  // eslint-disable-next-line no-console -- CLI artifact
  console.log(JSON.stringify(report, null, 2));
  if (exit_code !== 0) process.exit(exit_code);
}

if (process.argv[1]?.endsWith("remove-demo-wedge-brands.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
