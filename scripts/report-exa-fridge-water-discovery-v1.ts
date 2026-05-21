/**
 * Operator-only Exa fridge-water discovery import (read-only).
 *
 *   npx tsx scripts/report-exa-fridge-water-discovery-v1.ts --input data/discovery/exa/fridge-water/fixtures/exa-fridge-water-sample.v1.json
 *   npx tsx scripts/report-exa-fridge-water-discovery-v1.ts --input <export.json> --out-dir data/discovery/exa/fridge-water/runs/<run-id> --write-manifest
 *
 * Does not call Exa API or the network. Does not mutate Supabase or catalog CSVs.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExaFridgeWaterDiscoveryFromMcpExport,
  EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1,
  type ExaMcpExportInputV1,
} from "@/lib/discovery/exa-fridge-water-discovery-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function main(): void {
  const inputPath = argValue("--input");
  if (!inputPath) {
    throw new Error("--input <path> is required (MCP/Exa export JSON fixture)");
  }

  const absInput = path.isAbsolute(inputPath) ? inputPath : path.join(REPO_ROOT, inputPath);
  const raw = JSON.parse(readFileSync(absInput, "utf8")) as ExaMcpExportInputV1;
  const now = new Date();
  const runId =
    argValue("--run-id") ??
    now.toISOString().replace(/[:.]/g, "-").replace("T", "T").slice(0, 20) + "Z";
  const generated_at = now.toISOString();

  const built = buildExaFridgeWaterDiscoveryFromMcpExport({
    input: raw,
    discovery_run_id: runId,
    rootDir: REPO_ROOT,
    generated_at,
    input_path: path.relative(REPO_ROOT, absInput).replace(/\\/g, "/"),
  });

  const outDirArg = argValue("--out-dir");
  const writeManifest = hasFlag("--write-manifest");

  if (!outDirArg) {
    process.stdout.write(
      `${JSON.stringify({ run_meta: built.run_meta, candidates: built.candidates_file }, null, 2)}\n`,
    );
    return;
  }

  const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.join(REPO_ROOT, outDirArg);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "run-meta.json"), `${JSON.stringify(built.run_meta, null, 2)}\n`, "utf8");
  writeFileSync(
    path.join(outDir, "candidates.json"),
    `${JSON.stringify(built.candidates_file, null, 2)}\n`,
    "utf8",
  );

  if (writeManifest) {
    const relCandidates = path.relative(REPO_ROOT, path.join(outDir, "candidates.json")).replace(
      /\\/g,
      "/",
    );
    const manifest = {
      contract: EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      wedge: "refrigerator_water",
      latest_run_id: runId,
      latest_candidates_path: relCandidates,
      demoted_slug_blocklist_source:
        "src/lib/coverage/fridge-homekeep-bulk-catalog-v1.ts:FRIDGE_HOMEKEEP_BULK_EXPANSION_DEMOTED_V1",
    };
    const manifestPath = path.join(REPO_ROOT, "data/discovery/exa/fridge-water/manifest.v1.json");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        out_dir: path.relative(REPO_ROOT, outDir).replace(/\\/g, "/"),
        run_id: runId,
        candidate_count: built.candidates_file.candidates.length,
        manifest_written: writeManifest,
      },
      null,
      2,
    )}\n`,
  );
}

main();
