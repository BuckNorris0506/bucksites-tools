#!/usr/bin/env node
/**
 * Refresh wrong-code-prevention v1 artifact from committed repo baseline (read-only).
 * HyperAgent write path not enabled.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWrongCodePreventionRepoBaselineArtifactV1,
  WRONG_CODE_PREVENTION_ARTIFACT_REL_V1,
} from "./lib/wrong-code-prevention-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const artifact = buildWrongCodePreventionRepoBaselineArtifactV1({ rootDir: REPO_ROOT });
  const abs = path.join(REPO_ROOT, WRONG_CODE_PREVENTION_ARTIFACT_REL_V1);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`Wrote ${WRONG_CODE_PREVENTION_ARTIFACT_REL_V1} (repo baseline; read-only).\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

main();
