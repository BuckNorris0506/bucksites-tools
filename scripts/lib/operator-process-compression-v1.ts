/**
 * Read-only Command Center lane: operator process compression (ship guard workflow).
 */

import {
  BUCKPARTS_SHIP_GUARD_COMMAND_V1,
  BUCKPARTS_SHIP_GUARD_CONTRACT_V1,
} from "./buckparts-ship-guard-v1";

export const OPERATOR_PROCESS_COMPRESSION_CONTRACT_V1 = "operator_process_compression_v1" as const;
export const OPERATOR_PROCESS_COMPRESSION_CC_JQ_PATH_V1 =
  ".command_center_v2.operator_process_compression_v1" as const;

export type OperatorProcessCompressionLaneV1 = {
  contract: typeof OPERATOR_PROCESS_COMPRESSION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof OPERATOR_PROCESS_COMPRESSION_CC_JQ_PATH_V1;
  ship_guard_command: typeof BUCKPARTS_SHIP_GUARD_COMMAND_V1;
  current_problem: string;
  target_workflow: string;
  current_status: "AVAILABLE" | "NOT_WIRED";
  blockers: string[];
  protected_actions_not_allowed: string[];
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  push_authorized: false;
  commit_authorized: false;
  buckparts_verified_link_authorized: false;
  proven_facts: string[];
  recommended_next_action: string;
};

export function buildOperatorProcessCompressionLaneV1(): OperatorProcessCompressionLaneV1 {
  return {
    contract: OPERATOR_PROCESS_COMPRESSION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: OPERATOR_PROCESS_COMPRESSION_CC_JQ_PATH_V1,
    ship_guard_command: BUCKPARTS_SHIP_GUARD_COMMAND_V1,
    current_problem:
      "Repeated manual commit/push guard copy-pastes increase operator burden and error risk without strengthening BuckParts truth gates.",
    target_workflow:
      "One reusable local guard command replaces 3–4 custom copy/paste blocks: npm run buckparts:ship-guard (dry-run) → optional --commit for validations → manual git push only after SAFE.",
    current_status: "AVAILABLE",
    blockers: [],
    protected_actions_not_allowed: [
      "netlify_api_call",
      "deploy",
      "automatic_git_push",
      "automatic_git_commit",
      "supabase_mutation",
      "data/evidence_write",
      "data/retailer_links.csv_mutation_without_owner_review",
      "buckparts_verified_link_authorization",
    ],
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    push_authorized: false,
    commit_authorized: false,
    buckparts_verified_link_authorized: false,
    proven_facts: [
      `PROVEN: ${BUCKPARTS_SHIP_GUARD_COMMAND_V1} exists and defaults to read-only dry_run JSON.`,
      "PROVEN: ship guard reports HEAD, origin/main, commits ahead, changed files, retailer_links.csv hash check, and Netlify ignore dry-run classification.",
    ],
    recommended_next_action:
      "Before every commit/push: run npm run buckparts:ship-guard; use npm run buckparts:ship-guard -- --commit to run path-based validations. Never skip protected-file checks.",
  };
}
