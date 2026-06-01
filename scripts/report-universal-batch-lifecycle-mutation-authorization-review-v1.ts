/**
 * Universal batch lifecycle mutation-authorization review — stdout JSON only (read-only).
 *
 *   npm run buckparts:universal-batch-lifecycle-mutation-authorization-review
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildUniversalBatchLifecycleApplyExecutionPlanV1 } from "./lib/universal-batch-lifecycle-apply-execution-plan-v1";
import { buildUniversalBatchLifecycleApplyReadinessV1 } from "./lib/universal-batch-lifecycle-apply-readiness-v1";
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
  const report = buildUniversalBatchLifecycleMutationAuthorizationReviewV1({
    rootDir: REPO_ROOT,
    now,
    applyReadiness,
    applyExecutionPlan,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
