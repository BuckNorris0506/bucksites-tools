/**
 * Read-only Decision Priors Framework v1 stdout report.
 * Does not attach to Command Center / NBA / Dispatch / Daily Operator.
 */

import { buildDecisionPriorsFrameworkProjectionFromRepoV1 } from "./lib/buckparts-decision-priors-framework-v1";

const projection = buildDecisionPriorsFrameworkProjectionFromRepoV1();

if (projection.nba_authority !== false) {
  throw new Error("decision_priors_framework_v1 must keep nba_authority=false");
}
if (projection.dispatch_authority !== false) {
  throw new Error("decision_priors_framework_v1 must keep dispatch_authority=false");
}
if (projection.daily_operator_authority !== false) {
  throw new Error("decision_priors_framework_v1 must keep daily_operator_authority=false");
}
if (projection.command_center_authority !== false) {
  throw new Error("decision_priors_framework_v1 must keep command_center_authority=false");
}
if (projection.steering_authority !== false) {
  throw new Error("decision_priors_framework_v1 must keep steering_authority=false");
}
if (projection.new_store_created !== false) {
  throw new Error("decision_priors_framework_v1 must keep new_store_created=false");
}
if (projection.scoring !== false || projection.weighting !== false || projection.behavior_change !== false) {
  throw new Error("decision_priors_framework_v1 must remain labels-only (no scoring/weighting/behavior)");
}

process.stdout.write(
  `${JSON.stringify(
    {
      contract: projection.contract,
      read_only: projection.read_only,
      data_mutation: projection.data_mutation,
      mutation_authorized: projection.mutation_authorized,
      steering_authority: projection.steering_authority,
      nba_authority: projection.nba_authority,
      dispatch_authority: projection.dispatch_authority,
      daily_operator_authority: projection.daily_operator_authority,
      command_center_authority: projection.command_center_authority,
      labels_only: projection.labels_only,
      scoring: projection.scoring,
      weighting: projection.weighting,
      behavior_change: projection.behavior_change,
      new_store_created: projection.new_store_created,
      tagged_candidate_count: projection.tagged_candidate_count,
      disagreement_record_count: projection.disagreement_record_count,
      catalog: projection.catalog,
      oar_reuse: projection.oar_reuse,
      odr_reuse: projection.odr_reuse,
    },
    null,
    2,
  )}\n`,
);
