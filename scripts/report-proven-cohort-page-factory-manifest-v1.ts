import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildProvenCohortPageFactoryManifestV1,
  writeProvenCohortPageFactoryManifestArtifactsV1,
} from "./lib/proven-cohort-page-factory-manifest-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildProvenCohortPageFactoryManifestV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeProvenCohortPageFactoryManifestArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.eligible_for_owner_review_count < report.proven_correct_slug_count) {
    process.exitCode = 1;
  }
}

main();
