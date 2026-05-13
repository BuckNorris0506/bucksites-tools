import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEvidenceToLearningOutcomesCandidateImportV1 } from "./lib/evidence-to-learning-outcomes-candidate-import-v1";
import { loadLearningOutcomesConfidenceApprovalsRegistry } from "./lib/learning-outcomes-confidence-approvals-registry-v1";
import { runLearningOutcomesApprovedInsertExecutorV1 } from "./lib/learning-outcomes-approved-insert-executor-v1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function main() {
  const mutate = process.argv.includes("--mutate-approved-learning-outcome");
  const now = () => new Date();
  const fileExists = (p: string) => existsSync(p);
  const readDir = (p: string) => readdirSync(p);
  const readTextFile = (p: string) => readFileSync(p, "utf8");

  const evidenceImport = await buildEvidenceToLearningOutcomesCandidateImportV1({
    rootDir,
    fileExists,
    readDir,
    readTextFile,
    now,
  });

  const approvalsLoaded = loadLearningOutcomesConfidenceApprovalsRegistry({
    rootDir,
    fileExists,
    readTextFile,
  });

  const report = await runLearningOutcomesApprovedInsertExecutorV1({
    mode: mutate ? "MUTATE_APPROVED" : "DRY_RUN",
    evidenceImport,
    approvalsLoaded,
  });

  // eslint-disable-next-line no-console -- CLI artifact
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console -- CLI error path
  console.error(e);
  process.exit(1);
});
