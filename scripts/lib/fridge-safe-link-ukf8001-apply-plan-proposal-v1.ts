/**
 * ukf8001 apply-plan proposal — thin wrapper over supabase_csv_parity_coverage_factory_v1.
 * Reference regression implementation only; no slug-specific apply logic.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildSupabaseCsvParityApplyPlanMarkdownV1,
  buildSupabaseCsvParityFounderDecisionTemplateV1,
  buildSupabaseCsvParityReferencePackageForSlugV1,
  csvRowSnapshotToExecutorRowV1,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  SUPABASE_CSV_PARITY_UKF8001_REFERENCE_SLUG_V1,
  type SupabaseCsvParityApplyPlanProposalV1,
  type SupabaseCsvParityCsvRowSnapshotV1,
  type SupabaseCsvParityPostApplyValidationStepV1,
} from "./supabase-csv-parity-coverage-factory-v1";

export { SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1 };

export const FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_PROPOSAL_CONTRACT_V1 =
  "fridge_safe_link_ukf8001_apply_plan_proposal_v1" as const;

export const FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1 = SUPABASE_CSV_PARITY_UKF8001_REFERENCE_SLUG_V1;

export const FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1 =
  "data/evidence/amazon-ukf8001-live-outcome.2026-05-05.json" as const;

export const FRIDGE_SAFE_LINK_UKF8001_SUPERSEDED_EVIDENCE_REL_V1 =
  "data/evidence/amazon-ukf8001-aftermarket-pdp-evidence.2026-05-04.json" as const;

export const FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-ukf8001-apply-plan-proposal-v1.json" as const;

export const FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-ukf8001-apply-plan-proposal-v1.md" as const;

export const FRIDGE_SAFE_LINK_UKF8001_FOUNDER_DECISION_TEMPLATE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-ukf8001-founder-decision-template-v1.json" as const;

export const FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-ukf8001-apply-plan-proposal" as const;

export const FRIDGE_SAFE_LINK_UKF8001_WATERDROP_HARD_DO_NOT_USE_ASIN_V1 = "B087PDLZL9" as const;

export const FRIDGE_SAFE_LINK_UKF8001_PROVEN_ASIN_V1 = "B07C8C2VBH" as const;

export type FieldProofStatusV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type ProposedRetailerLinkFieldV1 = {
  field: string;
  proposed_value: string | boolean | number | null;
  proof_status: FieldProofStatusV1;
  proof_source: string;
};

export type FridgeSafeLinkUkf8001CsvRowSnapshotV1 = SupabaseCsvParityCsvRowSnapshotV1;

export type FridgeSafeLinkUkf8001ApplyPlanProposalV1 = Omit<
  SupabaseCsvParityApplyPlanProposalV1,
  "contract" | "factory_contract" | "source_command" | "parity_diff_status"
> & {
  contract: typeof FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
  source_command: typeof FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_SOURCE_COMMAND_V1;
  excluded_slugs: readonly string[];
  excluded_asins: readonly string[];
  factory_contract: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1;
};

export type BuildFridgeSafeLinkUkf8001ApplyPlanProposalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
};

function mapGenericToUkf8001Legacy(
  generic: SupabaseCsvParityApplyPlanProposalV1,
): FridgeSafeLinkUkf8001ApplyPlanProposalV1 {
  const checklist = generic.post_apply_validation_checklist.filter(
    (s) => s.step_id !== "customer_closure_report",
  ) as SupabaseCsvParityPostApplyValidationStepV1[];

  return {
    ...generic,
    contract: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    source_command: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_SOURCE_COMMAND_V1,
    excluded_slugs: [],
    excluded_asins: [FRIDGE_SAFE_LINK_UKF8001_WATERDROP_HARD_DO_NOT_USE_ASIN_V1],
    factory_contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
    post_apply_validation_checklist: checklist,
    proven_facts: [
      ...generic.proven_facts,
      `PROVEN: built via ${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1} (ukf8001 reference wrapper).`,
    ],
    owner_approval_needed_next: [
      ...generic.owner_approval_needed_next.slice(0, 3),
      "Run guarded dry-run: npm run buckparts:fridge-safe-link-ukf8001-guarded-apply",
      "Only after founder approval: npm run buckparts:fridge-safe-link-ukf8001-guarded-apply -- --write-csv",
    ],
  };
}

export function buildFridgeSafeLinkUkf8001ApplyPlanProposalV1(
  deps: BuildFridgeSafeLinkUkf8001ApplyPlanProposalDepsV1,
): FridgeSafeLinkUkf8001ApplyPlanProposalV1 {
  const pkg = buildSupabaseCsvParityReferencePackageForSlugV1({
    rootDir: deps.rootDir,
    filterSlug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
    evidenceRelPath: FRIDGE_SAFE_LINK_UKF8001_PRIMARY_EVIDENCE_REL_V1,
    now: deps.now,
    fileExists: deps.fileExists,
    readText: deps.readText,
  });
  if (!pkg.apply_plan) {
    throw new Error(`ukf8001 factory package blocked: ${pkg.blockers.join("; ")}`);
  }
  return mapGenericToUkf8001Legacy(pkg.apply_plan);
}

export { csvRowSnapshotToExecutorRowV1 };

export function buildFridgeSafeLinkUkf8001ApplyPlanProposalMarkdownV1(
  report: FridgeSafeLinkUkf8001ApplyPlanProposalV1,
): string {
  return buildSupabaseCsvParityApplyPlanMarkdownV1(report).replace(
    `# Supabase CSV parity apply-plan proposal — ${report.target_slug}`,
    "# Fridge safe-link ukf8001 apply-plan proposal (read-only)",
  );
}

export function buildFridgeSafeLinkUkf8001FounderDecisionTemplateV1(args: {
  applyPlanRelPath?: string;
  now?: () => Date;
}) {
  const template = buildSupabaseCsvParityFounderDecisionTemplateV1({
    slug: FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1,
    applyPlanRelPath: args.applyPlanRelPath ?? FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
    asin: FRIDGE_SAFE_LINK_UKF8001_PROVEN_ASIN_V1,
    now: args.now,
  });
  const ctx = template.registry_row_template.supabase_csv_parity_apply_context_v1;
  const { supabase_csv_parity_apply_context_v1: _omit, ...registryRest } =
    template.registry_row_template;
  return {
    ...template,
    contract: "fridge_safe_link_ukf8001_founder_decision_template_v1" as const,
    registry_row_template: {
      ...registryRest,
      source_decision_packet_id: "fridge_safe_link_ukf8001_apply_plan_proposal_v1",
      ukf8001_apply_context_v1: ctx,
    },
  };
}

export function writeFridgeSafeLinkUkf8001ApplyPlanProposalDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLinkUkf8001ApplyPlanProposalV1;
}): { json_rel_path: string; md_rel_path: string; founder_template_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_MD_REL_V1);
  const founderAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_UKF8001_FOUNDER_DECISION_TEMPLATE_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLinkUkf8001ApplyPlanProposalMarkdownV1(args.report)}\n`, "utf8");
  writeFileSync(
    founderAbs,
    `${JSON.stringify(
      buildFridgeSafeLinkUkf8001FounderDecisionTemplateV1({
        applyPlanRelPath: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
  return {
    json_rel_path: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_JSON_REL_V1,
    md_rel_path: FRIDGE_SAFE_LINK_UKF8001_APPLY_PLAN_MD_REL_V1,
    founder_template_rel_path: FRIDGE_SAFE_LINK_UKF8001_FOUNDER_DECISION_TEMPLATE_REL_V1,
  };
}

export function proposedSlugSetFromReport(report: FridgeSafeLinkUkf8001ApplyPlanProposalV1): string[] {
  return report.target_slug === FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1
    ? [FRIDGE_SAFE_LINK_UKF8001_TARGET_SLUG_V1]
    : [];
}

export const FRIDGE_SAFE_LINK_UKF8001_EXCLUDED_SLUGS_V1 = [] as const;
