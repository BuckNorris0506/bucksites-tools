/**
 * Universal batch lifecycle guarded CSV apply executor — stdout JSON.
 *
 *   npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor
 *   npm run buckparts:universal-batch-lifecycle-guarded-csv-apply-executor -- --write-csv
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildUniversalBatchLifecycleApplyExecutionPlanV1 } from "./lib/universal-batch-lifecycle-apply-execution-plan-v1";
import { buildUniversalBatchLifecycleApplyReadinessV1 } from "./lib/universal-batch-lifecycle-apply-readiness-v1";
import {
  buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1,
  parseGuardedCsvApplyExecutorCliArgsV1,
} from "./lib/universal-batch-lifecycle-guarded-csv-apply-executor-v1";
import { buildUniversalBatchLifecycleMutationAuthorizationReviewV1 } from "./lib/universal-batch-lifecycle-mutation-authorization-review-v1";

const REPO_ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function main(): void {
  const now = () => new Date();
  const { writeCsv } = parseGuardedCsvApplyExecutorCliArgsV1(process.argv.slice(2));
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
    writeCsv,
    mutationAuthorizationReview: {
      mutation_authorization_review_status:
        mutationAuthorizationReview.mutation_authorization_review_status,
      csv_apply_authorized: mutationAuthorizationReview.csv_apply_authorized,
      mutation_authorized: mutationAuthorizationReview.mutation_authorized,
      evidence_sufficiency_status: mutationAuthorizationReview.evidence_sufficiency_status,
      apply_executor_ready: mutationAuthorizationReview.apply_executor_ready,
      required_founder_decision_packet_id:
        mutationAuthorizationReview.required_founder_decision_packet_id,
      review_blockers: mutationAuthorizationReview.review_blockers,
    },
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
