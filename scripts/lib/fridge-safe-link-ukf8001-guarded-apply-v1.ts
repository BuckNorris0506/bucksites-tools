/**
 * ukf8001 guarded CSV apply — thin wrapper over supabase_csv_parity_guarded_apply_v1.
 */

import {
  buildSupabaseCsvParityExecutionPlanFromApplyPlanV1,
  buildSupabaseCsvParityReferencePackageForSlugV1,
  csvRowSnapshotToExecutorRowV1,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
} from "./supabase-csv-parity-coverage-factory-v1";
import {
  FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
  FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
  FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
  type FridgeSafeLinkUkf8001ApplyPlanProposalV1,
} from "./fridge-safe-link-ukf8001-apply-plan-proposal-v1";
import {
  findActiveFounderDecisionForSupabaseCsvParitySlug,
  runSupabaseCsvParityGuardedApplyV1,
  type SupabaseCsvParityGuardedApplyReportV1,
} from "./supabase-csv-parity-guarded-apply-v1";
import { UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1 } from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";

export const FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1 =
  "fridge_safe_link_ukf8001_guarded_apply_v1" as const;

export const FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-ukf8001-guarded-apply" as const;

export const FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_WRITE_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-ukf8001-guarded-apply -- --write-csv" as const;

export const FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_WRITE_CSV_FLAG_V1 = "--write-csv" as const;

export const FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/fridge-safe-link-ukf8001-apply-execution-plan-v1.json" as const;

export type FridgeSafeLinkUkf8001GuardedApplyStatusV1 = "DRY_RUN_READY" | "APPLIED" | "BLOCKED";

export type FridgeSafeLinkUkf8001GuardedApplyReportV1 = {
  contract: typeof FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  csv_apply_authorized: boolean;
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_SOURCE_COMMAND_V1;
  bridge_status: FridgeSafeLinkUkf8001GuardedApplyStatusV1;
  write_csv_requested: boolean;
  write_csv_applied: boolean;
  write_csv_blocked_until_founder_approval: boolean;
  target_slug: typeof FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1;
  apply_plan_rel_path: typeof FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1;
  execution_plan_artifact_rel_path: typeof FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1;
  founder_decision_id: string | null;
  founder_decision_missing: boolean;
  guarded_executor_contract: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1;
  guarded_executor_report: SupabaseCsvParityGuardedApplyReportV1["guarded_executor_report"];
  expected_census_delta: FridgeSafeLinkUkf8001ApplyPlanProposalV1["expected_census_delta"];
  post_apply_validation_checklist: FridgeSafeLinkUkf8001ApplyPlanProposalV1["post_apply_validation_checklist"];
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  exact_dry_run_command: typeof FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_SOURCE_COMMAND_V1;
  exact_write_command_blocked: typeof FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_WRITE_SOURCE_COMMAND_V1;
  factory_contract: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1;
};

function mapGenericGuardedReport(
  generic: SupabaseCsvParityGuardedApplyReportV1,
): FridgeSafeLinkUkf8001GuardedApplyReportV1 {
  return {
    contract: FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_CONTRACT_V1,
    read_only: generic.read_only,
    data_mutation: generic.data_mutation,
    mutation_authorized: generic.mutation_authorized,
    csv_apply_authorized: generic.csv_apply_authorized,
    generated_at: generic.generated_at,
    source_command: FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_SOURCE_COMMAND_V1,
    bridge_status: generic.bridge_status,
    write_csv_requested: generic.write_csv_requested,
    write_csv_applied: generic.write_csv_applied,
    write_csv_blocked_until_founder_approval: generic.write_csv_blocked_until_founder_approval,
    target_slug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
    apply_plan_rel_path: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
    execution_plan_artifact_rel_path: FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1,
    founder_decision_id: generic.founder_decision_id,
    founder_decision_missing: generic.founder_decision_missing,
    guarded_executor_contract: generic.guarded_executor_contract,
    guarded_executor_report: generic.guarded_executor_report,
    expected_census_delta: generic.expected_census_delta,
    post_apply_validation_checklist: generic.post_apply_validation_checklist.filter(
      (s) => s.step_id !== "customer_closure_report",
    ),
    blockers: generic.blockers,
    proven_facts: [
      ...generic.proven_facts,
      `PROVEN: ukf8001 wrapper delegates to ${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1}.`,
    ],
    unknown_facts: generic.unknown_facts,
    recommended_next_action: generic.recommended_next_action,
    exact_dry_run_command: FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_SOURCE_COMMAND_V1,
    exact_write_command_blocked: FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_WRITE_SOURCE_COMMAND_V1,
    factory_contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  };
}

export function buildFridgeSafeLinkUkf8001UniversalExecutionPlanV1(args: {
  applyPlan: FridgeSafeLinkUkf8001ApplyPlanProposalV1;
  applyPlanRelPath: string;
  now?: () => Date;
}) {
  const built = buildSupabaseCsvParityExecutionPlanFromApplyPlanV1({
    applyPlan: args.applyPlan,
    applyPlanRelPath: args.applyPlanRelPath,
    now: args.now,
  });
  return {
    execution_plan_artifact_rel_path: FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1,
    execution_plan: built.execution_plan,
  };
}

export function parseFridgeSafeLinkUkf8001GuardedApplyCliArgsV1(
  argv: string[],
): { writeCsv: boolean } {
  return { writeCsv: argv.includes(FRIDGE_SAFE_LINK_UKF8001_GUARDED_APPLY_WRITE_CSV_FLAG_V1) };
}

export function findActiveFounderDecisionForUkf8001(
  args: Parameters<typeof findActiveFounderDecisionForSupabaseCsvParitySlug>[0],
) {
  return findActiveFounderDecisionForSupabaseCsvParitySlug(args);
}

export async function runFridgeSafeLinkUkf8001GuardedApplyV1(args: {
  rootDir: string;
  writeCsv?: boolean;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
}): Promise<FridgeSafeLinkUkf8001GuardedApplyReportV1> {
  const pkg = buildSupabaseCsvParityReferencePackageForSlugV1({
    rootDir: args.rootDir,
    filterSlug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
    evidenceRelPath: FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });

  const genericReport = await runSupabaseCsvParityGuardedApplyV1({
    rootDir: args.rootDir,
    slug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
    writeCsv: args.writeCsv,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
    writeText: args.writeText,
    candidatePackage: {
      ...pkg,
      execution_plan_rel_path: FRIDGE_SAFE_LINK_UKF8001_EXECUTION_PLAN_REL_V1,
    },
  });

  return mapGenericGuardedReport(genericReport);
}

export { csvRowSnapshotToExecutorRowV1 };
