/**
 * Fridge buyer-path batch planning run-registry — stdout JSON by default; explicit write only with --registry-out.
 *
 *   npm run buckparts:fridge-buyer-path-batch-run-registry
 *   npm run buckparts:fridge-buyer-path-batch-run-registry -- --registry-out data/fridge/batch-production/run-registry/fridge-buyer-path-batch-run-v1-0fec4a7b623a.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1,
  FRIDGE_BUYER_PATH_BATCH_PLANNING_RUN_REGISTRY_DEFAULT_REL_V1,
} from "./lib/fridge-buyer-path-batch-run-registry-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

function main(): void {
  const argv = process.argv.slice(2);
  const registryOut = readArgValue(argv, "--registry-out");
  const now = () => new Date();

  const built = buildFridgeBuyerPathBatchPlanningRunRegistryDocumentV1({
    rootDir: REPO_ROOT,
    now,
  });
  if (!built.ok) {
    process.stderr.write(`${built.errors.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }

  const payload = {
    ...built.doc,
    registry_rel_path: built.registry_rel_path,
    recommended_next_action:
      "Planning run-registry recorded — verify with `npm run buckparts:batch-run-registry-intake`. No CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify mutation is authorized from this artifact.",
  };

  if (registryOut) {
    const abs = path.resolve(registryOut);
    const expectedAbs = path.resolve(REPO_ROOT, built.registry_rel_path);
    if (abs !== expectedAbs) {
      process.stderr.write(
        `--registry-out must match expected path ${built.registry_rel_path} (got ${path.relative(REPO_ROOT, abs)})\n`,
      );
      process.exitCode = 1;
      return;
    }
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(built.doc, null, 2)}\n`, "utf8");
    process.stdout.write(
      `${JSON.stringify({ ...payload, registry_written: true, registry_out: built.registry_rel_path }, null, 2)}\n`,
    );
    return;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
