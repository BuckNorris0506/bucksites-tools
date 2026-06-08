import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  anchorIntegrityAuditExitCodeV1,
  buildAnchorIntegrityAuditV1,
  writeAnchorIntegrityAuditArtifactsV1,
} from "./lib/anchor-integrity-audit-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  const report = buildAnchorIntegrityAuditV1({ rootDir });

  if (process.argv.includes("--write-artifacts")) {
    writeAnchorIntegrityAuditArtifactsV1({ rootDir, report });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  process.exitCode = anchorIntegrityAuditExitCodeV1(report);
}

main();
