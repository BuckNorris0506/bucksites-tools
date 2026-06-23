import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1,
  assertApSupabaseVsCsvDiffOutPathAllowedV1,
  buildAirPurifierSupabaseVsCsvDiffV1Report,
  parseApSupabaseVsCsvDiffCliArgsV1,
} from "./lib/air-purifier-supabase-vs-csv-diff-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function resolveGitHeadHint(): Promise<string | null> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync("git rev-parse HEAD", { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const cli = parseApSupabaseVsCsvDiffCliArgsV1(process.argv.slice(2));
  const gitHeadHint = await resolveGitHeadHint();

  const report = await buildAirPurifierSupabaseVsCsvDiffV1Report({
    rootDir,
    gitHeadHint,
  });

  const outRel = cli.outPath ?? AP_SUPABASE_VS_CSV_DIFF_DEFAULT_OUT_REL_V1;
  assertApSupabaseVsCsvDiffOutPathAllowedV1(outRel, rootDir);
  const outAbs = path.resolve(rootDir, outRel);
  mkdirSync(path.dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(`[report-air-purifier-supabase-vs-csv-diff-v1] wrote ${outRel}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
