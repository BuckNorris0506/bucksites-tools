/**
 * Bounded Supabase CSV parity package builder for owner-review insert-plan slugs.
 * PROVEN: does not treat owner-review evidence as live-outcome; does not infer browser_truth.
 */

import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_RETAILER_LINKS_CSV_REL_V1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1,
  FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1,
  FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1,
  type FridgeSafeLink4396508ApplyPlanProposalV1,
} from "./fridge-safe-link-4396508-apply-plan-proposal-v1";
import {
  buildSupabaseCsvParityExecutionPlanFromApplyPlanV1,
  buildSupabaseCsvParityPostApplyValidationChecklistV1,
  csvRowSnapshotFromRetailerRow,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
  SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1,
  SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1,
  type SupabaseCsvParityApplyPlanProposalV1,
  type SupabaseCsvParityCandidatePackageV1,
  type SupabaseCsvParityCsvRowSnapshotV1,
} from "./supabase-csv-parity-coverage-factory-v1";

export const SUPABASE_CSV_PARITY_OWNER_REVIEW_INSERT_PLAN_CONTRACT_V1 =
  "supabase_csv_parity_owner_review_insert_plan_v1" as const;

export const FRIDGE_SAFE_LINK_4396508_OWNER_CLASSIFICATION_PACKET_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-owner-classification-approval-packet-v1.json" as const;

export const FRIDGE_SAFE_LINK_4396508_FOUNDER_DECISION_TEMPLATE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-4396508-founder-decision-template-v1.json" as const;

export const FRIDGE_SAFE_LINK_4396508_EXECUTION_PLAN_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans/fridge-safe-link-4396508-apply-execution-plan-v1.json" as const;

export type SupabaseCsvParityOwnerReviewInsertPlanSlugConfigV1 = {
  target_slug: typeof FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1;
  apply_plan_rel_path: typeof FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1;
  primary_evidence_rel_path: typeof FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1;
  owner_classification_packet_rel_path: typeof FRIDGE_SAFE_LINK_4396508_OWNER_CLASSIFICATION_PACKET_REL_V1;
  founder_decision_template_rel_path: typeof FRIDGE_SAFE_LINK_4396508_FOUNDER_DECISION_TEMPLATE_REL_V1;
  execution_plan_rel_path: typeof FRIDGE_SAFE_LINK_4396508_EXECUTION_PLAN_REL_V1;
};

export const SUPABASE_CSV_PARITY_OWNER_REVIEW_INSERT_PLAN_REGISTRY_V1: Readonly<
  Record<typeof FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1, SupabaseCsvParityOwnerReviewInsertPlanSlugConfigV1>
> = {
  [FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1]: {
    target_slug: FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1,
    apply_plan_rel_path: FRIDGE_SAFE_LINK_4396508_APPLY_PLAN_JSON_REL_V1,
    primary_evidence_rel_path: FRIDGE_SAFE_LINK_4396508_PRIMARY_EVIDENCE_REL_V1,
    owner_classification_packet_rel_path: FRIDGE_SAFE_LINK_4396508_OWNER_CLASSIFICATION_PACKET_REL_V1,
    founder_decision_template_rel_path: FRIDGE_SAFE_LINK_4396508_FOUNDER_DECISION_TEMPLATE_REL_V1,
    execution_plan_rel_path: FRIDGE_SAFE_LINK_4396508_EXECUTION_PLAN_REL_V1,
  },
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  sort_order?: string;
  browser_truth_classification?: string | null;
  browser_truth_notes?: string | null;
  browser_truth_checked_at?: string | null;
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function loadJson<T>(abs: string, readText: (p: string) => string): T {
  return JSON.parse(readText(abs)) as T;
}

function snapshotValueToString(value: string | boolean | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function isOwnerReviewEvidenceRelPathV1(relPath: string): boolean {
  const rel = relPath.toLowerCase();
  if (rel.includes("live-outcome") || rel.includes("live_outcome")) return false;
  return rel.includes("owner-review") || rel.includes("owner_review");
}

export function isOwnerReviewEvidenceDocumentV1(doc: Record<string, unknown>): boolean {
  if (doc.scope === "owner_browser_review_evidence_only") return true;
  const reportName = doc.report_name;
  if (typeof reportName === "string" && reportName.toLowerCase().includes("owner_review")) return true;
  const verdict = doc.verdict;
  if (typeof verdict === "string" && verdict.includes("OWNER_BROWSER")) return true;
  return false;
}

export function resolveSupabaseCsvParityOwnerReviewInsertPlanConfigV1(
  slug: string,
): SupabaseCsvParityOwnerReviewInsertPlanSlugConfigV1 | null {
  const key = normalizeSlug(slug) as typeof FRIDGE_SAFE_LINK_4396508_TARGET_SLUG_V1;
  return SUPABASE_CSV_PARITY_OWNER_REVIEW_INSERT_PLAN_REGISTRY_V1[key] ?? null;
}

export function csvSnapshotFromFridgeProposedFieldsV1(args: {
  slug: string;
  fields: FridgeSafeLink4396508ApplyPlanProposalV1["proposed_retailer_link_row_fields"];
}): SupabaseCsvParityCsvRowSnapshotV1 {
  const byField = new Map(args.fields.map((field) => [field.field, field.proposed_value]));
  return {
    filter_slug: args.slug,
    retailer_name: snapshotValueToString(byField.get("retailer_name")),
    affiliate_url: snapshotValueToString(byField.get("affiliate_url")),
    is_primary: snapshotValueToString(byField.get("is_primary")),
    sort_order: snapshotValueToString(byField.get("sort_order") ?? "0"),
    retailer_key: snapshotValueToString(byField.get("retailer_key")),
    browser_truth_classification: snapshotValueToString(byField.get("browser_truth_classification")),
    browser_truth_notes: snapshotValueToString(byField.get("browser_truth_notes")),
    browser_truth_checked_at: snapshotValueToString(byField.get("browser_truth_checked_at")),
  };
}

export const FRIDGE_SAFE_LINK_4396508_OWNER_DECISION_REL_V1 =
  "data/owner-decisions/fridge-safe-link-4396508-owner-approval-v1.json" as const;

export type PendingOwnerBrowserTruthClassification4396508V1 = {
  classification: string;
  source_rel_path: string;
  source_field: string;
  blocked_until_founder_approval: true;
};

export function resolvePendingOwnerBrowserTruthClassification4396508V1(args: {
  rootDir: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): PendingOwnerBrowserTruthClassification4396508V1 | null {
  const ownerDecisionAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_4396508_OWNER_DECISION_REL_V1);
  if (args.fileExists(ownerDecisionAbs)) {
    const doc = loadJson<{ rows?: Array<Record<string, unknown>> }>(ownerDecisionAbs, args.readText);
    const row = doc.rows?.[0];
    const ctx = row?.["4396508_apply_context_v1"] as Record<string, unknown> | undefined;
    const fromCtx =
      typeof ctx?.owner_browser_truth_classification === "string"
        ? ctx.owner_browser_truth_classification.trim()
        : "";
    if (fromCtx) {
      return {
        classification: fromCtx,
        source_rel_path: FRIDGE_SAFE_LINK_4396508_OWNER_DECISION_REL_V1,
        source_field: "4396508_apply_context_v1.owner_browser_truth_classification",
        blocked_until_founder_approval: true,
      };
    }
  }

  const packetAbs = path.join(args.rootDir, FRIDGE_SAFE_LINK_4396508_OWNER_CLASSIFICATION_PACKET_REL_V1);
  if (!args.fileExists(packetAbs)) return null;
  const packet = loadJson<{
    owner_classification_review_v1?: {
      owner_must_answer_before_guarded_apply?: Array<{
        question_id?: string;
        recommended_value?: string;
      }>;
    };
  }>(packetAbs, args.readText);
  const question = packet.owner_classification_review_v1?.owner_must_answer_before_guarded_apply?.find(
    (item) => item.question_id === "browser_truth_classification",
  );
  const recommended = question?.recommended_value?.trim() ?? "";
  if (!recommended) return null;
  return {
    classification: recommended,
    source_rel_path: FRIDGE_SAFE_LINK_4396508_OWNER_CLASSIFICATION_PACKET_REL_V1,
    source_field: "owner_classification_review_v1.browser_truth_classification.recommended_value",
    blocked_until_founder_approval: true,
  };
}

export function buildOwnerReviewInsertPlanProposedCsvRow4396508V1(args: {
  rootDir: string;
  slug: string;
  fields: FridgeSafeLink4396508ApplyPlanProposalV1["proposed_retailer_link_row_fields"];
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): {
  proposed_csv_row: SupabaseCsvParityCsvRowSnapshotV1;
  pending_owner_browser_truth: PendingOwnerBrowserTruthClassification4396508V1 | null;
} {
  const proposed_csv_row = csvSnapshotFromFridgeProposedFieldsV1({
    slug: args.slug,
    fields: args.fields,
  });
  const pending_owner_browser_truth = resolvePendingOwnerBrowserTruthClassification4396508V1({
    rootDir: args.rootDir,
    fileExists: args.fileExists,
    readText: args.readText,
  });
  if (pending_owner_browser_truth) {
    proposed_csv_row.browser_truth_classification = pending_owner_browser_truth.classification;
  }
  return { proposed_csv_row, pending_owner_browser_truth };
}

export function buildSupabaseCsvParityApplyPlanFromFridge4396508ProposalV1(args: {
  rootDir: string;
  fridgeProposal: FridgeSafeLink4396508ApplyPlanProposalV1;
  config: SupabaseCsvParityOwnerReviewInsertPlanSlugConfigV1;
  now?: () => Date;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): SupabaseCsvParityApplyPlanProposalV1 {
  const now = args.now ?? (() => new Date());
  const slug = args.config.target_slug;
  const evidenceAbs = path.join(args.rootDir, args.config.primary_evidence_rel_path);
  if (!args.fileExists(evidenceAbs)) {
    throw new Error(`missing owner-review evidence ${args.config.primary_evidence_rel_path}`);
  }
  if (!isOwnerReviewEvidenceRelPathV1(args.config.primary_evidence_rel_path)) {
    throw new Error(
      `owner-review insert plan requires owner-review evidence path, got ${args.config.primary_evidence_rel_path}`,
    );
  }

  const evidence = loadJson<Record<string, unknown>>(evidenceAbs, args.readText);
  if (!isOwnerReviewEvidenceDocumentV1(evidence)) {
    throw new Error(
      `${args.config.primary_evidence_rel_path} is not owner-review evidence (refusing live-outcome parity path)`,
    );
  }

  const linkRows = parse(
    args.readText(path.join(args.rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1)),
    { columns: true, skip_empty_lines: true },
  ) as RetailerLinkRow[];
  const csvRows = linkRows.filter((row) => normalizeSlug(row.filter_slug ?? "") === slug);
  if (csvRows.length !== 1) {
    throw new Error(`expected exactly one committed CSV row for ${slug}, found ${csvRows.length}`);
  }

  const currentSnapshot = csvRowSnapshotFromRetailerRow(csvRows[0]!, slug);
  const { proposed_csv_row: proposedSnapshot, pending_owner_browser_truth } =
    buildOwnerReviewInsertPlanProposedCsvRow4396508V1({
      rootDir: args.rootDir,
      slug,
      fields: args.fridgeProposal.proposed_retailer_link_row_fields,
      fileExists: args.fileExists,
      readText: args.readText,
    });
  const proposedAsin =
    typeof evidence.asin === "string" ? evidence.asin.trim().toUpperCase() : null;

  const checklist = buildSupabaseCsvParityPostApplyValidationChecklistV1({
    slug,
    asin: proposedAsin,
  }).map((step) =>
    step.step_id === "go_route_parity"
      ? {
          ...step,
          purpose: `Owner-review evidence only — verify /go for filter ${slug} after founder sets browser_truth and apply; no automated click.`,
        }
      : step,
  );

  return {
    contract: "supabase_csv_parity_apply_plan_proposal_v1",
    factory_contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    generated_at: now().toISOString(),
    source_command: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1,
    target_slug: slug,
    wedge: "refrigerator_water",
    parity_diff_status: "INFERRED_FROM_REPO_EVIDENCE",
    exact_repo_paths_read: [
      args.config.apply_plan_rel_path,
      args.config.primary_evidence_rel_path,
      args.config.owner_classification_packet_rel_path,
      FRIDGE_RETAILER_LINKS_CSV_REL_V1,
      "scripts/lib/supabase-csv-parity-owner-review-insert-plan-v1.ts",
    ],
    source_evidence_rel_path: args.config.primary_evidence_rel_path,
    target_csv_rel_path: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    current_csv_state: {
      retailer_row_count: args.fridgeProposal.current_csv_state.retailer_row_count,
      safe_gated_count: args.fridgeProposal.current_csv_state.safe_gated_count,
      primary_retailer_key: args.fridgeProposal.current_csv_state.primary_retailer_key,
      primary_affiliate_url: args.fridgeProposal.current_csv_state.primary_affiliate_url,
      primary_is_primary: args.fridgeProposal.current_csv_state.primary_is_primary,
      browser_truth_classification: args.fridgeProposal.current_csv_state.browser_truth_classification,
      summary: args.fridgeProposal.current_csv_state.summary,
    },
    supabase_parity: {
      classification: "UNKNOWN",
      committed_live_row_link_id: null,
      committed_live_row_is_primary: null,
      hypothesis:
        "A_CSV_INSERT_FROM_OWNER_REVIEW — slug not in SUPABASE_HAS_WIN_CSV_MISSING diff; owner-review evidence only",
    },
    evidence_files_read: args.fridgeProposal.evidence_files_read,
    evidence_verdict_summary: args.fridgeProposal.evidence_verdict_summary,
    apply_plan_ready: true,
    apply_plan_applied: false,
    proposed_action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
    proposed_retailer_link_row_fields: args.fridgeProposal.proposed_retailer_link_row_fields,
    current_csv_row: currentSnapshot,
    proposed_csv_row: proposedSnapshot,
    amazon_asin_reuse_policy_classification:
      args.fridgeProposal.amazon_asin_reuse_policy_classification,
    affiliate_tag_status: args.fridgeProposal.affiliate_tag_status,
    proposed_asin: proposedAsin,
    expected_census_delta: {
      slug,
      before_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
      after_classification: "SAFE_BUYER_PATH_PROVEN",
      safe_buyer_path_proven_count_delta: 1,
      basis: pending_owner_browser_truth
        ? `CSV primary gains ${pending_owner_browser_truth.classification} row from owner draft/packet preview; --write-csv blocked until active founder approval`
        : "CSV primary gains direct_buyable row only after founder sets browser_truth_classification and guarded --write-csv",
    },
    blockers_before_apply: args.fridgeProposal.blockers_before_apply,
    owner_approval_needed_next: args.fridgeProposal.owner_approval_needed_next,
    rollback_revert_plan: args.fridgeProposal.rollback_revert_plan,
    post_apply_validation_checklist: checklist,
    proven_facts: [
      ...args.fridgeProposal.proven_facts,
      `PROVEN: ${SUPABASE_CSV_PARITY_OWNER_REVIEW_INSERT_PLAN_CONTRACT_V1} bounded insert-plan path for ${slug}.`,
      `PROVEN: primary evidence ${args.config.primary_evidence_rel_path} is owner-review — not live-outcome.`,
      pending_owner_browser_truth
        ? `PROVEN: proposed_csv_row.browser_truth_classification=${pending_owner_browser_truth.classification} sourced from ${pending_owner_browser_truth.source_rel_path}.${pending_owner_browser_truth.source_field} (dry-run preview only; --write-csv blocked until founder approval).`
        : "PROVEN: proposed_csv_row.browser_truth_classification empty — owner draft/packet classification not loaded.",
      `PROVEN: apply plan source ${args.config.apply_plan_rel_path}.`,
    ],
    inferred_facts: args.fridgeProposal.inferred_facts,
    unknown_facts: args.fridgeProposal.unknown_facts,
    recommended_next_action:
      "Owner review classification packet and founder decision template. Run guarded dry-run. Record active founder approval, fresh precheck, then --write-csv.",
  };
}

export function buildSupabaseCsvParityOwnerReviewInsertPlanPackageV1(args: {
  rootDir: string;
  slug: string;
  now?: () => Date;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): SupabaseCsvParityCandidatePackageV1 | null {
  const config = resolveSupabaseCsvParityOwnerReviewInsertPlanConfigV1(args.slug);
  if (!config) return null;

  const applyPlanAbs = path.join(args.rootDir, config.apply_plan_rel_path);
  const classificationAbs = path.join(args.rootDir, config.owner_classification_packet_rel_path);
  if (!args.fileExists(applyPlanAbs)) {
    throw new Error(`missing owner-review insert apply plan ${config.apply_plan_rel_path}`);
  }
  if (!args.fileExists(classificationAbs)) {
    throw new Error(
      `missing owner classification packet ${config.owner_classification_packet_rel_path}`,
    );
  }

  const fridgeProposal = loadJson<FridgeSafeLink4396508ApplyPlanProposalV1>(
    applyPlanAbs,
    args.readText,
  );
  if (normalizeSlug(fridgeProposal.target_slug) !== config.target_slug) {
    throw new Error(
      `apply plan target_slug mismatch: expected ${config.target_slug}, got ${fridgeProposal.target_slug}`,
    );
  }

  const applyPlan = buildSupabaseCsvParityApplyPlanFromFridge4396508ProposalV1({
    rootDir: args.rootDir,
    fridgeProposal,
    config,
    now: args.now,
    fileExists: args.fileExists,
    readText: args.readText,
  });

  const executionBuilt = buildSupabaseCsvParityExecutionPlanFromApplyPlanV1({
    applyPlan,
    applyPlanRelPath: config.apply_plan_rel_path,
    now: args.now,
  });

  return {
    filter_slug: config.target_slug,
    candidate_status: "READY_FOR_OWNER_REVIEW",
    parity_diff_row: null,
    apply_plan: applyPlan,
    apply_plan_rel_path: config.apply_plan_rel_path,
    apply_plan_md_rel_path: config.apply_plan_rel_path.replace(/\.json$/, ".md"),
    founder_decision_template_rel_path: config.founder_decision_template_rel_path,
    execution_plan_rel_path: config.execution_plan_rel_path,
    execution_plan: executionBuilt.execution_plan,
    blockers: applyPlan.blockers_before_apply.filter((blocker) =>
      [
        "mutation_authorized=false",
        "owner_apply_plan_approval_not_recorded",
        "runtime browser_truth_classification UNKNOWN until owner sets classification on apply",
      ].includes(blocker),
    ),
    hard_do_not_use_blocked: false,
    expected_census_delta: applyPlan.expected_census_delta,
  };
}
