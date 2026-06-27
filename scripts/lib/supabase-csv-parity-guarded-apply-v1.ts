/**
 * Generic Supabase CSV parity guarded apply — thin adapter to universal guarded CSV executor.
 * Dry-run by default; --write-csv blocked until founder approval.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  isFounderRegistryRowActiveMutationApproval,
  validateFounderDecisionRegistryRowV1,
  type FounderDecisionRegistryRowV1,
} from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  buildSupabaseCsvParityCoverageFactoryV1,
  buildSupabaseCsvParityReferencePackageForSlugV1,
  selectPrimaryLiveOutcomeEvidenceRelV1,
  supabaseCsvParityApplyPlanRelPathV1,
  supabaseCsvParityExecutionPlanRelPathV1,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  type SupabaseCsvParityApplyPlanProposalV1,
  type SupabaseCsvParityCandidatePackageV1,
} from "./supabase-csv-parity-coverage-factory-v1";
import { buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1 } from "./supabase-csv-parity-owner-review-insert-plan-v1";
import {
  buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1,
  UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
  type UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1,
  type UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-v1";

export const SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1 =
  "supabase_csv_parity_guarded_apply_v1" as const;

export const SUPABASE_CSV_PARITY_GUARDED_APPLY_SOURCE_COMMAND_V1 =
  "npm run buckparts:supabase-csv-parity-guarded-apply" as const;

export const SUPABASE_CSV_PARITY_GUARDED_APPLY_WRITE_SOURCE_COMMAND_V1 =
  "npm run buckparts:supabase-csv-parity-guarded-apply -- --slug <slug> --write-csv" as const;

export const SUPABASE_CSV_PARITY_GUARDED_APPLY_WRITE_CSV_FLAG_V1 = "--write-csv" as const;

export const SUPABASE_CSV_PARITY_GUARDED_APPLY_SLUG_FLAG_V1 = "--slug" as const;

export type SupabaseCsvParityGuardedApplyStatusV1 = "DRY_RUN_READY" | "APPLIED" | "BLOCKED";

export type SupabaseCsvParityGuardedApplyReportV1 = {
  contract: typeof SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  mutation_authorized: boolean;
  csv_apply_authorized: boolean;
  generated_at: string;
  source_command: typeof SUPABASE_CSV_PARITY_GUARDED_APPLY_SOURCE_COMMAND_V1;
  bridge_status: SupabaseCsvParityGuardedApplyStatusV1;
  write_csv_requested: boolean;
  write_csv_applied: boolean;
  write_csv_blocked_until_founder_approval: boolean;
  target_slug: string;
  apply_plan_rel_path: string;
  execution_plan_artifact_rel_path: string;
  founder_decision_id: string | null;
  founder_decision_missing: boolean;
  guarded_executor_contract: typeof UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1;
  guarded_executor_report: UniversalBatchLifecycleGuardedCsvApplyExecutorReportV1 | null;
  expected_census_delta: SupabaseCsvParityApplyPlanProposalV1["expected_census_delta"];
  post_apply_validation_checklist: SupabaseCsvParityApplyPlanProposalV1["post_apply_validation_checklist"];
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  factory_contract: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1;
};

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function loadFounderDecisionRows(rootDir: string): FounderDecisionRegistryRowV1[] {
  const rows: FounderDecisionRegistryRowV1[] = [];
  for (const file of scanFounderDecisionRegistryJsonFilesV1(rootDir)) {
    if ("parseError" in file || !file.parsed || typeof file.parsed !== "object") continue;
    const doc = file.parsed as { rows?: unknown[] };
    if (!Array.isArray(doc.rows)) continue;
    for (const raw of doc.rows) {
      const validated = validateFounderDecisionRegistryRowV1(raw);
      if (validated.ok) rows.push(validated.row);
    }
  }
  return rows;
}

export function findActiveFounderDecisionForSupabaseCsvParitySlug(args: {
  slug: string;
  applyPlanRel: string;
  founderRows: FounderDecisionRegistryRowV1[];
  nowIso: string;
}): FounderDecisionRegistryRowV1 | null {
  const slug = normalizeSlug(args.slug);
  for (const row of args.founderRows) {
    if (row.decision_status !== "approved") continue;
    if (row.allowed_next_scope !== "owner_mutation_approved") continue;
    if (!isFounderRegistryRowActiveMutationApproval(row, args.nowIso)) continue;
    const haystack = JSON.stringify(row).toLowerCase();
    if (haystack.includes(slug) || haystack.includes(args.applyPlanRel.toLowerCase())) {
      return row;
    }
  }
  return null;
}

export function buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1(args: {
  founderRow: FounderDecisionRegistryRowV1 | null;
  applyExecutorReady: boolean;
}): UniversalBatchLifecycleGuardedCsvApplyExecutorMutationAuthInputV1 {
  const authorized = args.founderRow != null && args.applyExecutorReady;
  return {
    mutation_authorization_review_status: authorized
      ? "MUTATION_AUTHORIZED_FOR_GUARDED_APPLY"
      : "BLOCKED",
    csv_apply_authorized: authorized,
    mutation_authorized: authorized,
    evidence_sufficiency_status: authorized ? "PROVEN" : "BLOCKED",
    apply_executor_ready: args.applyExecutorReady,
    required_founder_decision_packet_id: "supabase_csv_parity_apply_plan_proposal_v1",
    review_blockers: authorized
      ? []
      : ["founder_owner_mutation_approved_missing_or_inactive"],
  };
}

export function writeSupabaseCsvParityExecutionPlanArtifactV1(args: {
  rootDir: string;
  executionPlanRelPath: string;
  executionPlan: NonNullable<SupabaseCsvParityCandidatePackageV1["execution_plan"]>;
}): string {
  const abs = path.join(args.rootDir, args.executionPlanRelPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.executionPlan, null, 2)}\n`, "utf8");
  return args.executionPlanRelPath;
}

export function parseSupabaseCsvParityGuardedApplyCliArgsV1(
  argv: string[],
): { writeCsv: boolean; slug: string | null } {
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === SUPABASE_CSV_PARITY_GUARDED_APPLY_SLUG_FLAG_V1 && argv[i + 1]) {
      slug = argv[i + 1]!.trim();
    }
  }
  return {
    writeCsv: argv.includes(SUPABASE_CSV_PARITY_GUARDED_APPLY_WRITE_CSV_FLAG_V1),
    slug,
  };
}

async function resolveCandidatePackageV1(args: {
  rootDir: string;
  slug: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  loadDiff?: Parameters<typeof buildSupabaseCsvParityCoverageFactoryV1>[0]["loadDiff"];
}): Promise<SupabaseCsvParityCandidatePackageV1> {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const slug = normalizeSlug(args.slug);

  const factory = await buildSupabaseCsvParityCoverageFactoryV1({
    rootDir: args.rootDir,
    slugFilter: slug,
    now: args.now,
    fileExists,
    readText,
    loadDiff: args.loadDiff,
  });

  const fromFactory = factory.candidate_packages.find((p) => p.filter_slug === slug);
  if (fromFactory?.apply_plan) return fromFactory;

  const diffRow = factory.candidate_packages[0]?.parity_diff_row;
  if (diffRow?.evidence_win_artifacts.length) {
    const evidenceRel = selectPrimaryLiveOutcomeEvidenceRelV1({
      rootDir: args.rootDir,
      filterSlug: slug,
      evidenceArtifacts: diffRow.evidence_win_artifacts,
      fileExists,
      readText,
    });
    if (evidenceRel) {
      return buildSupabaseCsvParityReferencePackageForSlugV1({
        rootDir: args.rootDir,
        filterSlug: slug,
        evidenceRelPath: evidenceRel,
        now: args.now,
        fileExists,
        readText,
      });
    }
  }

  const evidenceDir = path.join(args.rootDir, "data/evidence");
  if (fileExists(evidenceDir)) {
    for (const name of readdirSync(evidenceDir)) {
      if (!name.startsWith(`amazon-${slug}-live-outcome`) || !name.endsWith(".json")) continue;
      const rel = `data/evidence/${name}`;
      try {
        return buildSupabaseCsvParityReferencePackageForSlugV1({
          rootDir: args.rootDir,
          filterSlug: slug,
          evidenceRelPath: rel,
          now: args.now,
          fileExists,
          readText,
        });
      } catch {
        continue;
      }
    }
  }

  const ownerReviewInsertPlan = buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1({
    rootDir: args.rootDir,
    slug,
    now: args.now,
    fileExists,
    readText,
  });
  if (ownerReviewInsertPlan?.apply_plan && ownerReviewInsertPlan.execution_plan) {
    return ownerReviewInsertPlan;
  }

  throw new Error(
    `no supabase CSV parity package for slug=${slug}; status=${fromFactory?.candidate_status ?? "missing"}`,
  );
}

export async function runSupabaseCsvParityGuardedApplyV1(args: {
  rootDir: string;
  slug: string;
  writeCsv?: boolean;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
  loadDiff?: Parameters<typeof buildSupabaseCsvParityCoverageFactoryV1>[0]["loadDiff"];
  candidatePackage?: SupabaseCsvParityCandidatePackageV1;
}): Promise<SupabaseCsvParityGuardedApplyReportV1> {
  const now = args.now ?? (() => new Date());
  const writeCsv = args.writeCsv === true;
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const slug = normalizeSlug(args.slug);
  const blockers: string[] = [];
  const proven_facts: string[] = [];
  const unknown_facts: string[] = [];

  const pkg =
    args.candidatePackage ??
    (await resolveCandidatePackageV1({
      rootDir: args.rootDir,
      slug,
      now,
      fileExists,
      readText,
      loadDiff: args.loadDiff,
    }));

  if (!pkg.apply_plan || !pkg.execution_plan) {
    blockers.push(`candidate_status=${pkg.candidate_status}`);
    blockers.push(...pkg.blockers);
    return {
      contract: SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mutation_authorized: false,
      csv_apply_authorized: false,
      generated_at: now().toISOString(),
      source_command: SUPABASE_CSV_PARITY_GUARDED_APPLY_SOURCE_COMMAND_V1,
      bridge_status: "BLOCKED",
      write_csv_requested: writeCsv,
      write_csv_applied: false,
      write_csv_blocked_until_founder_approval: true,
      target_slug: slug,
      apply_plan_rel_path: pkg.apply_plan_rel_path ?? supabaseCsvParityApplyPlanRelPathV1(slug),
      execution_plan_artifact_rel_path:
        pkg.execution_plan_rel_path ?? supabaseCsvParityExecutionPlanRelPathV1(slug),
      founder_decision_id: null,
      founder_decision_missing: true,
      guarded_executor_contract: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
      guarded_executor_report: null,
      expected_census_delta: null,
      post_apply_validation_checklist: [],
      blockers,
      proven_facts,
      unknown_facts,
      recommended_next_action: "Resolve candidate blockers before guarded apply.",
      factory_contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
    };
  }

  const applyPlanRel = pkg.apply_plan_rel_path ?? supabaseCsvParityApplyPlanRelPathV1(slug);
  const executionPlanRel =
    pkg.execution_plan_rel_path ?? supabaseCsvParityExecutionPlanRelPathV1(slug);

  const founderRow = findActiveFounderDecisionForSupabaseCsvParitySlug({
    slug,
    applyPlanRel,
    founderRows: loadFounderDecisionRows(args.rootDir),
    nowIso: now().toISOString(),
  });
  const founderDecisionMissing = founderRow == null;
  if (writeCsv && founderDecisionMissing) {
    blockers.push("founder_owner_mutation_approved_missing_or_inactive");
  }

  if (args.writeText) {
    args.writeText(
      path.join(args.rootDir, executionPlanRel),
      `${JSON.stringify(pkg.execution_plan, null, 2)}\n`,
    );
  } else {
    writeSupabaseCsvParityExecutionPlanArtifactV1({
      rootDir: args.rootDir,
      executionPlanRelPath: executionPlanRel,
      executionPlan: pkg.execution_plan,
    });
  }

  const mutationAuth = buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1({
    founderRow,
    applyExecutorReady: false,
  });

  const guardedExecutor = buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
    rootDir: args.rootDir,
    now,
    writeCsv,
    executionPlanArtifactRelPath: executionPlanRel,
    mutationAuthorizationReview: mutationAuth,
    fileExists,
    readText,
    writeText: args.writeText,
  });

  const mutationAuthFinal = buildSupabaseCsvParityGuardedApplyMutationAuthorizationV1({
    founderRow,
    applyExecutorReady: guardedExecutor.apply_executor_ready,
  });

  const guardedExecutorFinal =
    writeCsv && mutationAuthFinal.mutation_authorized
      ? buildUniversalBatchLifecycleGuardedCsvApplyExecutorV1({
          rootDir: args.rootDir,
          now,
          writeCsv: true,
          executionPlanArtifactRelPath: executionPlanRel,
          mutationAuthorizationReview: mutationAuthFinal,
          fileExists,
          readText,
          writeText: args.writeText,
        })
      : guardedExecutor;

  blockers.push(...guardedExecutorFinal.executor_blockers);
  if (writeCsv) blockers.push(...guardedExecutorFinal.write_mode_blockers);

  const uniqueBlockers = [...new Set(blockers)];

  let bridge_status: SupabaseCsvParityGuardedApplyStatusV1 = "BLOCKED";
  if (guardedExecutorFinal.write_mode_status === "APPLIED") {
    bridge_status = "APPLIED";
  } else if (
    guardedExecutorFinal.executor_status === "PRE_APPLY_DRY_RUN_READY" &&
    !writeCsv
  ) {
    bridge_status = "DRY_RUN_READY";
  }

  proven_facts.push(
    "PROVEN: supabase_csv_parity_guarded_apply uses universal_batch_lifecycle_guarded_csv_apply_executor_v1.",
    `PROVEN: target_slug=${slug}; execution_plan=${executionPlanRel}.`,
  );
  if (founderDecisionMissing) {
    unknown_facts.push("UNKNOWN: write mode blocked until founder owner_mutation_approved recorded.");
  }

  const writeBlocked = founderDecisionMissing || !mutationAuthFinal.mutation_authorized;

  return {
    contract: SUPABASE_CSV_PARITY_GUARDED_APPLY_CONTRACT_V1,
    read_only: !writeCsv || guardedExecutorFinal.data_mutation !== true,
    data_mutation: guardedExecutorFinal.data_mutation,
    mutation_authorized: mutationAuthFinal.mutation_authorized,
    csv_apply_authorized: mutationAuthFinal.csv_apply_authorized,
    generated_at: now().toISOString(),
    source_command: SUPABASE_CSV_PARITY_GUARDED_APPLY_SOURCE_COMMAND_V1,
    bridge_status,
    write_csv_requested: writeCsv,
    write_csv_applied: guardedExecutorFinal.write_mode_status === "APPLIED",
    write_csv_blocked_until_founder_approval: writeBlocked,
    target_slug: slug,
    apply_plan_rel_path: applyPlanRel,
    execution_plan_artifact_rel_path: executionPlanRel,
    founder_decision_id: founderRow?.decision_id ?? null,
    founder_decision_missing: founderDecisionMissing,
    guarded_executor_contract: UNIVERSAL_BATCH_LIFECYCLE_GUARDED_CSV_APPLY_EXECUTOR_CONTRACT_V1,
    guarded_executor_report: guardedExecutorFinal,
    expected_census_delta: pkg.apply_plan.expected_census_delta,
    post_apply_validation_checklist: pkg.apply_plan.post_apply_validation_checklist,
    blockers: uniqueBlockers,
    proven_facts,
    unknown_facts,
    recommended_next_action: writeBlocked
      ? "Run dry-run (default). Record founder approval from template, then re-run with --write-csv."
      : "Founder approved — re-run with --write-csv, then post-apply validation checklist.",
    factory_contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  };
}

export function buildSupabaseCsvParityGuardedApplyForEvidenceSlugV1(args: {
  rootDir: string;
  filterSlug: string;
  evidenceRelPath: string;
  writeCsv?: boolean;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): Promise<SupabaseCsvParityGuardedApplyReportV1> {
  const pkg = buildSupabaseCsvParityReferencePackageForSlugV1({
    rootDir: args.rootDir,
    filterSlug: args.filterSlug,
    evidenceRelPath: args.evidenceRelPath,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  return runSupabaseCsvParityGuardedApplyV1({
    rootDir: args.rootDir,
    slug: args.filterSlug,
    writeCsv: args.writeCsv,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
    candidatePackage: pkg,
  });
}
