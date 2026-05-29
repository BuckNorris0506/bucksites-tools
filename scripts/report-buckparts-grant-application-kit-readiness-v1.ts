import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBuckpartsGrantApplicationKitReadinessV1 } from "./lib/buckparts-grant-application-kit-readiness-v1";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main(): void {
  let repoCheckpointCommit = "UNKNOWN";
  try {
    repoCheckpointCommit = execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      encoding: "utf8",
    }).trim();
  } catch {
    // read-only report — omit git if unavailable
  }

  const report = buildBuckpartsGrantApplicationKitReadinessV1({
    rootDir,
    repoCheckpointCommit,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
