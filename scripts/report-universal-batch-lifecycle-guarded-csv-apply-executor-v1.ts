/**
 * Universal batch lifecycle guarded CSV apply executor — stdout JSON only (DRY-RUN read-only).
 *
 *   npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildUniversalBatchLifecycleApplyExecutionPlanV1 } from "./lib/universal-batch-lifecycle-apply-execution-plan-v1";
import { buildUniversalBatchLifecycleApplyReadinessV1 } from "./lib/universal-batch-lifecycle-apply-readiness-v1";
import { buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1 } from "./lib/universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import { buildUniversalBatchLifecycleMutationAuthorizationReviewV1 } from "./lib/universal-batch-lifecycle-mutation-authorization-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const now = () => new Date();
  const applyReadiness = buildUniversalBatchLifecycleApplyReadinessV1({
    rootDir: REPO_ROOT,
    now,
  });
  const applyExecutionPlan = buildUniversalBatchLifecycleApplyExecutionPlanV1({
    rootDir: REPO_ROOT,
    now,
    applyReadiness,
  });
  const mutationAuthorizationReview = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
    rootDir: REPO_ROOT,
    now,
    applyReadiness,
    applyExecutionPlan,
  });
  const report = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
    rootDir: REPO_ROOT,
    now,
    mutationAuthorizationReview,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
