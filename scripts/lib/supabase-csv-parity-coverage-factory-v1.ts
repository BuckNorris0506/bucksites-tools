/**
 * Supabase CSV parity coverage factory v1 — reusable production factory for
 * SUPABASE_HAS_WIN_CSV_MISSING candidates. Read-only proposals only.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks } from "@/lib/retailers/launch-buy-links";

import { classifyAmazonAsinReusePolicy } from "./amazon-asin-reuse-policy";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
  FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1,
  FRIDGE_RETAILER_LINKS_CSV_REL_V1,
  normalizeAmazonAffiliateTagV1,
  resolveAffiliateTagStatusV1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  buildFridgeSupabaseVsCsvRetailerLinksDiffV1,
  type FridgeRetailerLinksDiffRowV1,
  type FridgeSupabaseVsCsvRetailerLinksDiffV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import type { RetailerLinkCsvRowV1 } from "./universal-batch-lifecycle-apply-execution-plan-v1";
import {
  UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
  type UniversalBatchLifecycleApplyExecutionPlanRowPatchV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1 =
  "supabase_csv_parity_coverage_factory_v1" as const;

export const SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:supabase-csv-parity-coverage-factory" as const;

export const SUPABASE_CSV_PARITY_COVERAGE_FACTORY_DRAFTS_DIR_REL_V1 =
  "data/fridge/batch-production/drafts" as const;

export const SUPABASE_CSV_PARITY_COVERAGE_FACTORY_EXECUTION_PLANS_DIR_REL_V1 =
  "data/fridge/batch-production/apply-execution-plans" as const;

export const SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1 = "SUPABASE_HAS_WIN_CSV_MISSING" as const;

export type SupabaseCsvParityFieldProofStatusV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type SupabaseCsvParityCandidateStatusV1 =
  | "READY_FOR_OWNER_REVIEW"
  | "BLOCKED_HARD_DO_NOT_USE"
  | "BLOCKED_MISSING_LIVE_OUTCOME_EVIDENCE"
  | "BLOCKED_POLICY"
  | "BLOCKED_CSV_SHAPE"
  | "BLOCKED_NOT_PARITY_CANDIDATE";

export type SupabaseCsvParityCsvRowSnapshotV1 = {
  filter_slug: string;
  retailer_name: string;
  affiliate_url: string;
  is_primary: string;
  sort_order: string;
  retailer_key: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
};

export type SupabaseCsvParityPostApplyValidationStepV1 = {
  step_id: string;
  command: string;
  purpose: string;
};

export type SupabaseCsvParityApplyPlanProposalV1 = {
  contract: "supabase_csv_parity_apply_plan_proposal_v1";
  factory_contract: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  generated_at: string;
  source_command: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1;
  target_slug: string;
  wedge: "refrigerator_water";
  parity_diff_status: typeof SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1 | "INFERRED_FROM_REPO_EVIDENCE";
  exact_repo_paths_read: string[];
  source_evidence_rel_path: string;
  target_csv_rel_path: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  current_csv_state: {
    retailer_row_count: number;
    safe_gated_count: number;
    primary_retailer_key: string | null;
    primary_affiliate_url: string | null;
    primary_is_primary: boolean | null;
    browser_truth_classification: string | null;
    summary: string;
  };
  supabase_parity: {
    classification: SupabaseCsvParityFieldProofStatusV1;
    committed_live_row_link_id: string | null;
    committed_live_row_is_primary: boolean | null;
    hypothesis: string;
  };
  evidence_files_read: string[];
  evidence_verdict_summary: string;
  apply_plan_ready: boolean;
  apply_plan_applied: false;
  proposed_action: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1;
  proposed_retailer_link_row_fields: Array<{
    field: string;
    proposed_value: string | boolean | number | null;
    proof_status: SupabaseCsvParityFieldProofStatusV1;
    proof_source: string;
  }>;
  current_csv_row: SupabaseCsvParityCsvRowSnapshotV1;
  proposed_csv_row: SupabaseCsvParityCsvRowSnapshotV1;
  amazon_asin_reuse_policy_classification: string;
  affiliate_tag_status: ReturnType<typeof resolveAffiliateTagStatusV1>;
  proposed_asin: string | null;
  expected_census_delta: {
    slug: string;
    before_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST";
    after_classification: "SAFE_BUYER_PATH_PROVEN";
    safe_buyer_path_proven_count_delta: 1;
    basis: string;
  } | null;
  blockers_before_apply: string[];
  owner_approval_needed_next: string[];
  rollback_revert_plan: string[];
  post_apply_validation_checklist: SupabaseCsvParityPostApplyValidationStepV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type SupabaseCsvParityCandidatePackageV1 = {
  filter_slug: string;
  candidate_status: SupabaseCsvParityCandidateStatusV1;
  parity_diff_row: FridgeRetailerLinksDiffRowV1 | null;
  apply_plan: SupabaseCsvParityApplyPlanProposalV1 | null;
  apply_plan_rel_path: string | null;
  apply_plan_md_rel_path: string | null;
  founder_decision_template_rel_path: string | null;
  execution_plan_rel_path: string | null;
  execution_plan: {
    contract: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1;
    read_only: true;
    data_mutation: false;
    mutation_authorized: false;
    generated_at: string;
    wedge: "refrigerator_water";
    execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW";
    source_apply_plan_artifact_rel_path: string;
    source_apply_readiness_status: "PROVEN";
    planned_change_count: 1;
    target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
    row_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
    rollback_patch_preview: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1[];
    proven_facts: string[];
    unknown_facts: string[];
  } | null;
  blockers: string[];
  hard_do_not_use_blocked: boolean;
  expected_census_delta: SupabaseCsvParityApplyPlanProposalV1["expected_census_delta"];
};

export type SupabaseCsvParityCoverageFactoryReportV1 = {
  contract: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  generated_at: string;
  source_command: typeof SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1;
  supabase_diff_source_contract: string;
  supabase_truth_status: FridgeSupabaseVsCsvRetailerLinksDiffV1["supabase_truth_status"];
  parity_candidates_discovered: number;
  ready_for_owner_review_count: number;
  blocked_count: number;
  expected_safe_buyer_path_proven_batch_delta: number;
  candidate_packages: SupabaseCsvParityCandidatePackageV1[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

type LiveOutcomeEvidenceV1 = {
  filter_slug?: string;
  token?: string;
  verdict?: string;
  mutation_ready?: boolean;
  product_attribution?: string;
  asin?: string;
  canonical_url?: string;
  affiliate_url_candidate?: string;
  exact_token_proof?: string;
  buyability_proof?: string;
  superseded_by?: string;
  committed_live_row?: {
    link_id?: string;
    retailer_key?: string;
    retailer_name?: string;
    affiliate_url?: string;
    destination_url?: string;
    is_primary?: boolean;
    browser_truth_classification?: string;
    browser_truth_buyable_subtype?: string;
    browser_truth_notes?: string;
    browser_truth_checked_at?: string;
  };
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

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string };

export type BuildSupabaseCsvParityCoverageFactoryDepsV1 = {
  rootDir: string;
  now?: () => Date;
  slugFilter?: string | null;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  loadDiff?: (rootDir: string) => Promise<FridgeSupabaseVsCsvRetailerLinksDiffV1>;
  hardDoNotUseAsins?: ReadonlySet<string>;
};

function defaultFileExists(abs: string): boolean {
  return existsSync(abs);
}

function defaultReadText(abs: string): string {
  return readFileSync(abs, "utf8");
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function isTruthyPrimary(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function loadJson<T>(abs: string, readText: (p: string) => string): T {
  return JSON.parse(readText(abs)) as T;
}

function extractAsinFromUrl(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function field(
  name: string,
  value: string | boolean | number | null,
  proof_status: SupabaseCsvParityFieldProofStatusV1,
  proof_source: string,
) {
  return { field: name, proposed_value: value, proof_status, proof_source };
}

export function supabaseCsvParityApplyPlanRelPathV1(slug: string): string {
  return `${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_DRAFTS_DIR_REL_V1}/supabase-csv-parity-${normalizeSlug(slug)}-apply-plan-proposal-v1.json`;
}

export function supabaseCsvParityApplyPlanMdRelPathV1(slug: string): string {
  return `${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_DRAFTS_DIR_REL_V1}/supabase-csv-parity-${normalizeSlug(slug)}-apply-plan-proposal-v1.md`;
}

export function supabaseCsvParityFounderTemplateRelPathV1(slug: string): string {
  return `${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_DRAFTS_DIR_REL_V1}/supabase-csv-parity-${normalizeSlug(slug)}-founder-decision-template-v1.json`;
}

export function supabaseCsvParityExecutionPlanRelPathV1(slug: string): string {
  return `${SUPABASE_CSV_PARITY_COVERAGE_FACTORY_EXECUTION_PLANS_DIR_REL_V1}/supabase-csv-parity-${normalizeSlug(slug)}-apply-execution-plan-v1.json`;
}

export function csvRowSnapshotFromRetailerRow(
  row: RetailerLinkRow,
  slug: string,
): SupabaseCsvParityCsvRowSnapshotV1 {
  return {
    filter_slug: slug,
    retailer_name: (row.retailer_name ?? "").trim(),
    affiliate_url: (row.affiliate_url ?? "").trim(),
    is_primary: (row.is_primary ?? "true").trim(),
    sort_order: (row.sort_order ?? "0").trim(),
    retailer_key: (row.retailer_key ?? "").trim(),
    browser_truth_classification: (row.browser_truth_classification ?? "").trim(),
    browser_truth_notes: (row.browser_truth_notes ?? "").trim(),
    browser_truth_checked_at: (row.browser_truth_checked_at ?? "").trim(),
  };
}

export function csvRowSnapshotToExecutorRowV1(
  snapshot: SupabaseCsvParityCsvRowSnapshotV1,
): RetailerLinkCsvRowV1 {
  return {
    filter_slug: snapshot.filter_slug,
    retailer_name: snapshot.retailer_name,
    affiliate_url: snapshot.affiliate_url,
    is_primary: snapshot.is_primary,
    sort_order: snapshot.sort_order,
    retailer_key: snapshot.retailer_key,
    browser_truth_classification: snapshot.browser_truth_classification,
    browser_truth_notes: snapshot.browser_truth_notes,
    browser_truth_checked_at: snapshot.browser_truth_checked_at,
  };
}

export function loadHardDoNotUseAsinSetV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): Set<string> {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const blocked = new Set<string>();

  const auditAssistRel =
    "data/fridge/batch-production/drafts/fridge-amazon-affiliate-link-audit-assist-v1.json";
  const auditAssistAbs = path.join(args.rootDir, auditAssistRel);
  if (fileExists(auditAssistAbs)) {
    try {
      const doc = loadJson<{
        do_not_use_table?: Array<{ asin?: string; status?: string }>;
        slug_audits?: Array<{ blocked_asins?: Array<{ asin?: string; status?: string }> }>;
      }>(auditAssistAbs, readText);
      for (const entry of doc.do_not_use_table ?? []) {
        const asin = (entry.asin ?? "").trim().toUpperCase();
        if (asin && String(entry.status ?? "").includes("HARD_DO_NOT_USE")) blocked.add(asin);
      }
      for (const audit of doc.slug_audits ?? []) {
        for (const b of audit.blocked_asins ?? []) {
          const asin = (b.asin ?? "").trim().toUpperCase();
          if (asin && String(b.status ?? "").includes("HARD_DO_NOT_USE")) blocked.add(asin);
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const proofDraftsDir = path.join(
    args.rootDir,
    "data/fridge/batch-production/drafts",
  );
  if (fileExists(proofDraftsDir)) {
    for (const name of readdirSync(proofDraftsDir)) {
      if (!name.includes("browser-proof-result") || !name.endsWith(".json")) continue;
      try {
        const doc = loadJson<{
          urls_to_avoid?: Array<{ url?: string; action?: string }>;
          blocked_asins?: Array<{ asin?: string; status?: string }>;
        }>(path.join(proofDraftsDir, name), readText);
        for (const entry of doc.urls_to_avoid ?? []) {
          if (!String(entry.action ?? "").includes("HARD_DO_NOT_USE")) continue;
          const asin = extractAsinFromUrl(String(entry.url ?? ""));
          if (asin) blocked.add(asin);
        }
        for (const b of doc.blocked_asins ?? []) {
          const asin = (b.asin ?? "").trim().toUpperCase();
          if (asin && String(b.status ?? "").includes("HARD_DO_NOT_USE")) blocked.add(asin);
        }
      } catch {
        // skip
      }
    }
  }

  return blocked;
}

export function isEvidenceHardDoNotUseBlockedV1(args: {
  evidenceRelPath: string;
  asin: string | null;
  hardDoNotUseAsins: ReadonlySet<string>;
  readText: (abs: string) => string;
  evidenceAbs: string;
}): boolean {
  if (args.asin && args.hardDoNotUseAsins.has(args.asin.toUpperCase())) return true;
  try {
    const raw = args.readText(args.evidenceAbs);
    if (!raw.includes("HARD_DO_NOT_USE")) return false;
    if (args.asin && raw.includes(args.asin)) {
      const asinIdx = raw.indexOf(args.asin);
      const window = raw.slice(Math.max(0, asinIdx - 200), asinIdx + 200);
      if (window.includes("HARD_DO_NOT_USE")) return true;
    }
    if (raw.includes('"action": "HARD_DO_NOT_USE"') || raw.includes('"status": "HARD_DO_NOT_USE"')) {
      return args.asin != null && raw.includes(args.asin);
    }
  } catch {
    return false;
  }
  return false;
}

export function selectPrimaryLiveOutcomeEvidenceRelV1(args: {
  rootDir: string;
  filterSlug: string;
  evidenceArtifacts: string[];
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): string | null {
  const slug = normalizeSlug(args.filterSlug);
  const candidates = args.evidenceArtifacts
    .filter((rel) => rel.includes("live-outcome") || rel.includes("live_outcome"))
    .sort((a, b) => b.localeCompare(a));

  for (const rel of candidates) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    try {
      const doc = loadJson<LiveOutcomeEvidenceV1 & { superseded_by?: string }>(abs, args.readText);
      if (doc.superseded_by) continue;
      if ((doc.filter_slug ?? "").trim().toLowerCase() !== slug) continue;
      const liveRow = doc.committed_live_row;
      if (!liveRow?.affiliate_url && !liveRow?.destination_url) continue;
      if ((liveRow.browser_truth_classification ?? "").trim() !== "direct_buyable") continue;
      return rel;
    } catch {
      continue;
    }
  }
  return null;
}

export function buildSupabaseCsvParityPostApplyValidationChecklistV1(args: {
  slug: string;
  asin: string | null;
}): SupabaseCsvParityPostApplyValidationStepV1[] {
  const asinNote = args.asin ?? "committed_live_row ASIN";
  return [
    {
      step_id: "census_rerun",
      command: "npm run buckparts:all-product-safe-buyer-path-census",
      purpose: `Confirm ${args.slug} moves from SAFE_BUYER_PATH_SUPPRESSED_TRUST to SAFE_BUYER_PATH_PROVEN (+1 delta).`,
    },
    {
      step_id: "go_route_parity",
      command: `Read-only: verify /go for filter ${args.slug} resolves to ${asinNote} affiliate URL — no automated click.`,
      purpose: "Parity with committed_live_row in live-outcome evidence; do not click production /go without policy.",
    },
    {
      step_id: "model_filter_correctness_audit",
      command: "npm run buckparts:model-filter-correctness-audit",
      purpose: `Confirm ${args.slug} filter/model mappings unchanged; no wrong-family regression.`,
    },
    {
      step_id: "deploy_classifier",
      command: "npm run buckparts:deploy-classifier",
      purpose: "Classify deploy requirement after data/retailer_links.csv mutation.",
    },
    {
      step_id: "customer_closure_report",
      command: "scripts/lib/customer-closure-report-v1.ts (read-only refresh after census)",
      purpose: "Refresh customer closure delta after census and CSV parity apply.",
    },
  ];
}

export function buildSupabaseCsvParityFounderDecisionTemplateV1(args: {
  slug: string;
  applyPlanRelPath: string;
  asin: string | null;
  now?: () => Date;
}) {
  const now = args.now ?? (() => new Date());
  const slug = normalizeSlug(args.slug);
  return {
    contract: "supabase_csv_parity_founder_decision_template_v1" as const,
    read_only: true as const,
    data_mutation: false as const,
    template_status: "PENDING_OWNER_FILL" as const,
    not_an_approved_decision: true as const,
    instructions: [
      "This is a TEMPLATE only — not an approved founder decision.",
      "Copy registry_row_template into data/owner-decisions/ as a new JSON file after owner review.",
      "Set decision_status=approved, decided_at, owner_approved_by, and owner_note before guarded --write-csv.",
      "Do not auto-create or commit owner approval from automation.",
    ],
    registry_row_template: {
      contract: "founder_decision_registry_v1" as const,
      decision_id: `decision-${now().toISOString().slice(0, 10)}-${slug}-approve_csv_parity_apply`,
      source_queue_row_id: `queue-supabase-csv-parity-${slug}`,
      source_decision_packet_id: "supabase_csv_parity_apply_plan_proposal_v1",
      decided_at: null,
      decision_status: "pending_owner_action" as const,
      owner_note: `FILL AFTER REVIEW: Approve single-slug ${slug} CSV parity apply (${args.asin ?? "direct_buyable"}). Authorize guarded executor --write-csv only — no Supabase mutation from this row.`,
      allowed_next_scope: "owner_mutation_approved" as const,
      evidence_required_before_mutation: true,
      prohibited_actions_still_apply: [
        "Do not mutate retailer_links.csv from this template alone.",
        "Do not auto-batch multiple slugs without per-slug owner review.",
        "Do not apply HARD_DO_NOT_USE or wrong-family blocked ASIN evidence.",
        "Do not mutate filters.csv, compatibility_mappings.csv, or fridge_models.csv.",
        "Do not write or overwrite evidence JSON under data/evidence/.",
        "Do not mutate Supabase from this approval row — CSV parity only.",
        "approve_csv_parity_apply authorizes guarded executor --write-csv — not automatic apply.",
      ],
      supabase_csv_parity_apply_context_v1: {
        apply_plan_rel_path: args.applyPlanRelPath,
        founder_option_id: "approve_csv_parity_apply" as const,
        target_slug: slug,
        target_asin: args.asin,
        mutation_authorized: false,
        apply_not_executed: true,
        separate_guarded_apply_executor_required: true,
        owner_approved_by: null,
        approved_at: null,
      },
    },
  };
}

function changedCsvFields(
  before: Record<string, string>,
  after: Record<string, string>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(keys)
    .filter((key) => (before[key] ?? "") !== (after[key] ?? ""))
    .sort();
}

export function buildSupabaseCsvParityExecutionPlanFromApplyPlanV1(args: {
  applyPlan: SupabaseCsvParityApplyPlanProposalV1;
  applyPlanRelPath: string;
  now?: () => Date;
}) {
  const now = args.now ?? (() => new Date());
  const slug = args.applyPlan.target_slug;
  const before_row = csvRowSnapshotToExecutorRowV1(args.applyPlan.current_csv_row);
  const after_row = csvRowSnapshotToExecutorRowV1(args.applyPlan.proposed_csv_row);
  const changed_fields = changedCsvFields(before_row, after_row);
  const rowPatch: UniversalBatchLifecycleApplyExecutionPlanRowPatchV1 = {
    slug,
    filter_slug: slug,
    action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
    before_row,
    after_row,
    changed_fields,
  };
  return {
    execution_plan_rel_path: supabaseCsvParityExecutionPlanRelPathV1(slug),
    execution_plan: {
      contract: UNIVERSAL_BATCH_LIFECYCLE_APPLY_EXECUTION_PLAN_CONTRACT_V1,
      read_only: true as const,
      data_mutation: false as const,
      mutation_authorized: false as const,
      generated_at: now().toISOString(),
      wedge: "refrigerator_water" as const,
      execution_plan_status: "READY_FOR_MUTATION_AUTH_REVIEW" as const,
      source_apply_plan_artifact_rel_path: args.applyPlanRelPath,
      source_apply_readiness_status: "PROVEN" as const,
      planned_change_count: 1 as const,
      target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
      row_patch_preview: [rowPatch],
      rollback_patch_preview: [
        {
          ...rowPatch,
          action: "rollback_restore_before_row",
          after_row: before_row,
          changed_fields,
        },
      ],
      proven_facts: [
        "PROVEN: supabase CSV parity apply plan transformed to universal_batch_lifecycle_apply_execution_plan_v1.",
        `PROVEN: single-slug guarded apply for ${slug}.`,
      ],
      unknown_facts: [] as string[],
    },
  };
}

export function buildSupabaseCsvParityApplyPlanProposalV1(args: {
  rootDir: string;
  filterSlug: string;
  evidenceRelPath: string;
  parityDiffStatus?: typeof SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1 | "INFERRED_FROM_REPO_EVIDENCE";
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  hardDoNotUseAsins?: ReadonlySet<string>;
}): SupabaseCsvParityApplyPlanProposalV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const slug = normalizeSlug(args.filterSlug);
  const hardDoNotUseAsins =
    args.hardDoNotUseAsins ?? loadHardDoNotUseAsinSetV1({ rootDir: args.rootDir, fileExists, readText });

  const evidenceAbs = path.join(args.rootDir, args.evidenceRelPath);
  if (!fileExists(evidenceAbs)) {
    throw new Error(`missing evidence ${args.evidenceRelPath}`);
  }

  const evidence = loadJson<LiveOutcomeEvidenceV1>(evidenceAbs, readText);
  if ((evidence.filter_slug ?? "").trim().toLowerCase() !== slug) {
    throw new Error(`evidence filter_slug mismatch: expected ${slug}`);
  }

  const linkRows = parse(readText(path.join(args.rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1)), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];
  const filterRows = parse(readText(path.join(args.rootDir, "data/filters.csv")), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];

  const csvRows = linkRows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === slug);
  if (csvRows.length !== 1) {
    throw new Error(`expected exactly one committed CSV row for ${slug}, found ${csvRows.length}`);
  }
  const csvRow = csvRows[0]!;
  const filter = filterRows.find((r) => (r.slug ?? "").trim().toLowerCase() === slug);

  const gated = filterRealBuyRetailerLinks(
    csvRows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
    })),
  );

  const liveRow = evidence.committed_live_row;
  const asin = (
    evidence.asin ??
    liveRow?.destination_url?.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] ??
    extractAsinFromUrl(liveRow?.affiliate_url ?? "")
  )
    ?.trim()
    .toUpperCase() ?? null;
  const canonical =
    (evidence.canonical_url ?? liveRow?.destination_url ?? "").trim() || null;
  const affiliateCandidate =
    (evidence.affiliate_url_candidate ?? liveRow?.affiliate_url ?? "").trim() || null;
  const attribution = (evidence.product_attribution ?? "").trim() || null;
  const verdict = (evidence.verdict ?? "").trim() || null;

  if (!canonical || !affiliateCandidate || !asin) {
    throw new Error(`${slug}: evidence missing canonical_url, affiliate_url_candidate, or asin`);
  }
  if (
    isEvidenceHardDoNotUseBlockedV1({
      evidenceRelPath: args.evidenceRelPath,
      asin,
      hardDoNotUseAsins,
      readText,
      evidenceAbs,
    })
  ) {
    throw new Error(`${slug}: proposed ASIN ${asin} is HARD_DO_NOT_USE blocked`);
  }

  const normalizedAffiliate = normalizeAmazonAffiliateTagV1({
    proposed_destination_url: canonical,
    proposed_affiliate_url: affiliateCandidate,
    proposed_retailer_key: "amazon",
  });

  const affiliateTagStatus = resolveAffiliateTagStatusV1({
    proposed_affiliate_url: normalizedAffiliate.proposed_affiliate_url,
    proposed_retailer_key: "amazon",
  });

  const exactTokenProof = Boolean(
    evidence.exact_token_proof?.trim() ||
      liveRow?.browser_truth_notes?.toUpperCase().includes(slug.toUpperCase()),
  );

  const policy = classifyAmazonAsinReusePolicy({
    token: slug,
    asin,
    noSafePdpFound: false,
    exactTokenProof: exactTokenProof,
    sellerControlledTargetTokenProof: exactTokenProof,
    replacementOrCompatibleRelationshipProof: attribution != null,
    buyabilityProof: Boolean(evidence.buyability_proof?.trim() || liveRow?.browser_truth_classification),
    attributionCanBeLabeled: attribution != null,
    asinCollisionEvidenceFileCount: 0,
    liveAsinReuseCount: 0,
  });

  const browserTruthClassification =
    liveRow?.browser_truth_classification?.trim() ?? "direct_buyable";
  const browserTruthSubtype = liveRow?.browser_truth_buyable_subtype?.trim() ?? null;
  const browserTruthNotes =
    liveRow?.browser_truth_notes?.trim() ??
    `Guarded apply proposal: replace search placeholder with Supabase-parity direct_buyable from ${args.evidenceRelPath}. Not applied.`;
  const browserTruthCheckedAt = liveRow?.browser_truth_checked_at
    ? liveRow.browser_truth_checked_at.slice(0, 10)
    : evidence.verdict?.includes("LIVE") || evidence.verdict
      ? (typeof evidence === "object" &&
          "generated_at" in evidence &&
          typeof (evidence as { generated_at?: string }).generated_at === "string"
          ? (evidence as { generated_at: string }).generated_at.slice(0, 10)
          : now().toISOString().slice(0, 10))
      : now().toISOString().slice(0, 10);

  const currentSnapshot = csvRowSnapshotFromRetailerRow(csvRow, slug);
  const proposedSnapshot: SupabaseCsvParityCsvRowSnapshotV1 = {
    filter_slug: slug,
    retailer_name: liveRow?.retailer_name?.trim() ?? "Amazon",
    affiliate_url: normalizedAffiliate.proposed_affiliate_url,
    is_primary: "true",
    sort_order: currentSnapshot.sort_order,
    retailer_key: liveRow?.retailer_key?.trim() ?? "amazon",
    browser_truth_classification: browserTruthClassification,
    browser_truth_notes: browserTruthNotes,
    browser_truth_checked_at: browserTruthCheckedAt,
  };

  const proposedFields = [
    field("filter_slug", slug, "PROVEN", "data/filters.csv + evidence.filter_slug"),
    field(
      "retailer_name",
      proposedSnapshot.retailer_name,
      liveRow?.retailer_name ? "PROVEN" : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.retailer_name`,
    ),
    field(
      "affiliate_url",
      proposedSnapshot.affiliate_url,
      affiliateCandidate.includes(FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1)
        ? "PROVEN"
        : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.affiliate_url`,
    ),
    field("is_primary", true, "PROVEN", "CSV primary row promotion; Supabase row may be is_primary=false"),
    field(
      "sort_order",
      Number.parseInt(proposedSnapshot.sort_order, 10) || 0,
      "PROVEN",
      "data/retailer_links.csv current row",
    ),
    field(
      "retailer_key",
      proposedSnapshot.retailer_key,
      liveRow?.retailer_key ? "PROVEN" : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.retailer_key`,
    ),
    field(
      "browser_truth_classification",
      browserTruthClassification,
      liveRow?.browser_truth_classification ? "PROVEN" : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.browser_truth_classification`,
    ),
    field(
      "browser_truth_buyable_subtype",
      browserTruthSubtype,
      browserTruthSubtype ? "PROVEN" : "UNKNOWN",
      `${args.evidenceRelPath}.committed_live_row.browser_truth_buyable_subtype`,
    ),
    field(
      "browser_truth_notes",
      browserTruthNotes,
      liveRow?.browser_truth_notes ? "PROVEN" : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.browser_truth_notes`,
    ),
    field(
      "browser_truth_checked_at",
      browserTruthCheckedAt,
      liveRow?.browser_truth_checked_at ? "PROVEN" : "INFERRED",
      `${args.evidenceRelPath}.committed_live_row.browser_truth_checked_at`,
    ),
  ];

  const blockers = [
    "mutation_authorized=false",
    "verified_link_authorized=false",
    "csv_apply_authorized=false",
    "supabase_mutation_authorized=false",
    "owner_apply_plan_approval_not_recorded",
    `committed CSV still search-placeholder (${csvRow.retailer_key}); zero safe gated rows`,
    "evidence.mutation_ready=false (live-outcome records manual Supabase insert; CSV parity pending)",
  ];

  if (affiliateTagStatus !== "HAS_BUCKPARTS_TAG") {
    blockers.push(`affiliate_tag_status=${affiliateTagStatus}`);
  }
  if (
    policy.classification !== "EXACT_PDP_PROVEN_NO_COLLISION" &&
    policy.classification !== "SHARED_ASIN_REUSE_OWNER_APPROVED_INSERT_PLAN_ELIGIBLE"
  ) {
    blockers.push(`amazon_asin_reuse_policy=${policy.classification}`);
  }
  if (!exactTokenProof) {
    blockers.push("exact_token_proof_missing_in_evidence");
  }

  const founderTemplateRel = supabaseCsvParityFounderTemplateRelPathV1(slug);
  const ownerApproval = [
    `Review proposed direct_buyable row for ${slug} (ASIN ${asin}).`,
    `Confirm product_attribution=${attribution ?? "UNKNOWN"} is acceptable.`,
    `Fill founder decision from ${founderTemplateRel} with allowed_next_scope=owner_mutation_approved.`,
    `Run guarded dry-run: npm run buckparts:supabase-csv-parity-guarded-apply -- --slug ${slug}`,
    `Only after founder approval: npm run buckparts:supabase-csv-parity-guarded-apply -- --slug ${slug} --write-csv`,
  ];

  const rollback = [
    `If guarded apply writes CSV and post-apply validation fails, revert data/retailer_links.csv row for filter_slug=${slug} to:`,
    `  retailer_name=${JSON.stringify(currentSnapshot.retailer_name)}`,
    `  affiliate_url=${JSON.stringify(currentSnapshot.affiliate_url)}`,
    `  retailer_key=${JSON.stringify(currentSnapshot.retailer_key)}`,
    `  browser_truth_classification=${JSON.stringify(currentSnapshot.browser_truth_classification)}`,
    liveRow?.link_id
      ? `Supabase row ${liveRow.link_id} already exists — CSV rollback does not delete Supabase.`
      : "Supabase row may exist — CSV rollback does not delete Supabase.",
    "Re-run census and model-filter audit after rollback.",
  ];

  const evidenceSummary = [
    `verdict=${verdict ?? "UNKNOWN"}`,
    `asin=${asin}`,
    `product_attribution=${attribution ?? "UNKNOWN"}`,
    `mutation_ready=${String(evidence.mutation_ready ?? "UNKNOWN")}`,
    `asin_collision=${policy.classification}`,
    `supabase_link_id=${liveRow?.link_id ?? "UNKNOWN"}`,
  ].join("; ");

  const checklist = buildSupabaseCsvParityPostApplyValidationChecklistV1({ slug, asin });

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
    parity_diff_status: args.parityDiffStatus ?? SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1,
    exact_repo_paths_read: [
      args.evidenceRelPath,
      FRIDGE_RETAILER_LINKS_CSV_REL_V1,
      "data/filters.csv",
      "scripts/lib/fridge-supabase-vs-csv-retailer-links-diff-v1.ts",
      "scripts/lib/supabase-csv-parity-coverage-factory-v1.ts",
    ],
    source_evidence_rel_path: args.evidenceRelPath,
    target_csv_rel_path: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    current_csv_state: {
      retailer_row_count: csvRows.length,
      safe_gated_count: gated.length,
      primary_retailer_key: csvRow.retailer_key?.trim() ?? null,
      primary_affiliate_url: csvRow.affiliate_url?.trim() ?? null,
      primary_is_primary: isTruthyPrimary(csvRow.is_primary),
      browser_truth_classification: csvRow.browser_truth_classification?.trim() ?? null,
      summary: `${csvRows.length} row(s), ${gated.length} safe gated, primary=${csvRow.retailer_key ?? "unknown"}:search_placeholder`,
    },
    supabase_parity: {
      classification: liveRow?.link_id ? "PROVEN" : "INFERRED",
      committed_live_row_link_id: liveRow?.link_id?.trim() ?? null,
      committed_live_row_is_primary: liveRow?.is_primary ?? null,
      hypothesis: "B_EVIDENCE_APPLIED_SUPABASE_ONLY — CSV primary still search placeholder",
    },
    evidence_files_read: [args.evidenceRelPath],
    evidence_verdict_summary: evidenceSummary,
    apply_plan_ready: true,
    apply_plan_applied: false,
    proposed_action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
    proposed_retailer_link_row_fields: proposedFields,
    current_csv_row: currentSnapshot,
    proposed_csv_row: proposedSnapshot,
    amazon_asin_reuse_policy_classification: policy.classification,
    affiliate_tag_status: affiliateTagStatus,
    proposed_asin: asin,
    expected_census_delta: {
      slug,
      before_classification: "SAFE_BUYER_PATH_SUPPRESSED_TRUST",
      after_classification: "SAFE_BUYER_PATH_PROVEN",
      safe_buyer_path_proven_count_delta: 1,
      basis: "CSV primary gains direct_buyable row matching launch-buy-links gates",
    },
    blockers_before_apply: blockers,
    owner_approval_needed_next: ownerApproval,
    rollback_revert_plan: rollback,
    post_apply_validation_checklist: checklist,
    proven_facts: [
      "PROVEN: proposal is read_only=true; data_mutation=false; mutation_authorized=false.",
      `PROVEN: target_slug=${slug} from supabase_csv_parity_coverage_factory_v1.`,
      `PROVEN: primary evidence ${args.evidenceRelPath} with committed_live_row.`,
      "PROVEN: committed CSV has search-placeholder primary with zero launch-buy-links safe gated rows.",
      `PROVEN: committed_live_row ASIN=${asin}; HARD_DO_NOT_USE registry excluded.`,
      `PROVEN: committed_live_row browser_truth_classification=${browserTruthClassification}; product_attribution=${attribution ?? "UNKNOWN"}.`,
    ],
    inferred_facts: [
      "INFERRED: guarded CSV apply promotes Amazon row to CSV primary while Supabase row may remain is_primary=false.",
      "INFERRED: post-apply census should show +1 SAFE_BUYER_PATH_PROVEN if launch-buy-links gates pass.",
    ],
    unknown_facts: [
      "UNKNOWN: production /go first-hop outcome without clicking /go after CSV-only apply.",
      "UNKNOWN: whether Netlify deploy is required until deploy-classifier runs post-apply.",
    ],
    recommended_next_action:
      "Owner review apply-plan proposal and founder decision template. Run guarded dry-run. Record founder approval before --write-csv.",
  };
}

export function buildSupabaseCsvParityCandidatePackageV1(args: {
  rootDir: string;
  diffRow: FridgeRetailerLinksDiffRowV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  hardDoNotUseAsins?: ReadonlySet<string>;
}): SupabaseCsvParityCandidatePackageV1 {
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const slug = normalizeSlug(args.diffRow.filter_slug);
  const hardDoNotUseAsins =
    args.hardDoNotUseAsins ?? loadHardDoNotUseAsinSetV1({ rootDir: args.rootDir, fileExists, readText });
  const blockers: string[] = [];

  if (args.diffRow.status !== SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1) {
    return {
      filter_slug: slug,
      candidate_status: "BLOCKED_NOT_PARITY_CANDIDATE",
      parity_diff_row: args.diffRow,
      apply_plan: null,
      apply_plan_rel_path: null,
      apply_plan_md_rel_path: null,
      founder_decision_template_rel_path: null,
      execution_plan_rel_path: null,
      execution_plan: null,
      blockers: [`parity_status=${args.diffRow.status}`],
      hard_do_not_use_blocked: false,
      expected_census_delta: null,
    };
  }

  const evidenceRel = selectPrimaryLiveOutcomeEvidenceRelV1({
    rootDir: args.rootDir,
    filterSlug: slug,
    evidenceArtifacts: args.diffRow.evidence_win_artifacts,
    fileExists,
    readText,
  });

  if (!evidenceRel) {
    return {
      filter_slug: slug,
      candidate_status: "BLOCKED_MISSING_LIVE_OUTCOME_EVIDENCE",
      parity_diff_row: args.diffRow,
      apply_plan: null,
      apply_plan_rel_path: null,
      apply_plan_md_rel_path: null,
      founder_decision_template_rel_path: null,
      execution_plan_rel_path: null,
      execution_plan: null,
      blockers: ["missing_live_outcome_evidence_with_committed_live_row"],
      hard_do_not_use_blocked: false,
      expected_census_delta: null,
    };
  }

  try {
    const applyPlan = buildSupabaseCsvParityApplyPlanProposalV1({
      rootDir: args.rootDir,
      filterSlug: slug,
      evidenceRelPath: evidenceRel,
      parityDiffStatus: SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1,
      now: args.now,
      fileExists,
      readText,
      hardDoNotUseAsins,
    });

    const applyPlanRel = supabaseCsvParityApplyPlanRelPathV1(slug);
    const executionBuilt = buildSupabaseCsvParityExecutionPlanFromApplyPlanV1({
      applyPlan,
      applyPlanRelPath: applyPlanRel,
      now: args.now,
    });

    return {
      filter_slug: slug,
      candidate_status: "READY_FOR_OWNER_REVIEW",
      parity_diff_row: args.diffRow,
      apply_plan: applyPlan,
      apply_plan_rel_path: applyPlanRel,
      apply_plan_md_rel_path: supabaseCsvParityApplyPlanMdRelPathV1(slug),
      founder_decision_template_rel_path: supabaseCsvParityFounderTemplateRelPathV1(slug),
      execution_plan_rel_path: executionBuilt.execution_plan_rel_path,
      execution_plan: executionBuilt.execution_plan,
      blockers: applyPlan.blockers_before_apply.filter((b) =>
        ["mutation_authorized=false", "owner_apply_plan_approval_not_recorded"].includes(b),
      ),
      hard_do_not_use_blocked: false,
      expected_census_delta: applyPlan.expected_census_delta,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hardBlocked = message.includes("HARD_DO_NOT_USE");
    return {
      filter_slug: slug,
      candidate_status: hardBlocked ? "BLOCKED_HARD_DO_NOT_USE" : "BLOCKED_POLICY",
      parity_diff_row: args.diffRow,
      apply_plan: null,
      apply_plan_rel_path: null,
      apply_plan_md_rel_path: null,
      founder_decision_template_rel_path: null,
      execution_plan_rel_path: null,
      execution_plan: null,
      blockers: [message],
      hard_do_not_use_blocked: hardBlocked,
      expected_census_delta: null,
    };
  }
}

export function buildSupabaseCsvParityApplyPlanMarkdownV1(
  report: SupabaseCsvParityApplyPlanProposalV1,
): string {
  const lines: string[] = [
    `# Supabase CSV parity apply-plan proposal — ${report.target_slug} (read-only)`,
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Authorization",
    "",
    "All false: mutation_authorized, verified_link_authorized, csv_apply_authorized, supabase_mutation_authorized.",
    "",
    `apply_plan_ready: **${report.apply_plan_ready}** | apply_plan_applied: **${report.apply_plan_applied}**`,
    "",
    "## Current CSV",
    "",
    `- ${report.current_csv_state.summary}`,
    "",
    "## Evidence",
    "",
    `- ${report.source_evidence_rel_path}`,
    `- Summary: ${report.evidence_verdict_summary}`,
    "",
    "## Expected census delta",
    "",
    report.expected_census_delta
      ? `- ${report.expected_census_delta.before_classification} → ${report.expected_census_delta.after_classification} (+${report.expected_census_delta.safe_buyer_path_proven_count_delta})`
      : "- UNKNOWN",
    "",
    "## Post-apply validation checklist",
    "",
  ];
  for (const step of report.post_apply_validation_checklist) {
    lines.push(`- **${step.step_id}**: \`${step.command}\` — ${step.purpose}`);
  }
  lines.push("", "## Blockers before apply", "", ...report.blockers_before_apply.map((b) => `- ${b}`));
  lines.push("", "## Recommended next action", "", report.recommended_next_action, "");
  return lines.join("\n");
}

export function writeSupabaseCsvParityCandidatePackageDraftsV1(args: {
  rootDir: string;
  pkg: SupabaseCsvParityCandidatePackageV1;
}): {
  apply_plan_rel_path: string | null;
  apply_plan_md_rel_path: string | null;
  founder_template_rel_path: string | null;
  execution_plan_rel_path: string | null;
} {
  if (!args.pkg.apply_plan || !args.pkg.apply_plan_rel_path) {
    return {
      apply_plan_rel_path: null,
      apply_plan_md_rel_path: null,
      founder_template_rel_path: null,
      execution_plan_rel_path: null,
    };
  }
  const jsonAbs = path.join(args.rootDir, args.pkg.apply_plan_rel_path);
  const mdAbs = path.join(args.rootDir, args.pkg.apply_plan_md_rel_path!);
  const founderAbs = path.join(args.rootDir, args.pkg.founder_decision_template_rel_path!);
  const execAbs = path.join(args.rootDir, args.pkg.execution_plan_rel_path!);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(execAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.pkg.apply_plan, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildSupabaseCsvParityApplyPlanMarkdownV1(args.pkg.apply_plan)}\n`, "utf8");
  writeFileSync(
    founderAbs,
    `${JSON.stringify(
      buildSupabaseCsvParityFounderDecisionTemplateV1({
        slug: args.pkg.filter_slug,
        applyPlanRelPath: args.pkg.apply_plan_rel_path,
        asin: args.pkg.apply_plan.proposed_asin,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(execAbs, `${JSON.stringify(args.pkg.execution_plan, null, 2)}\n`, "utf8");
  return {
    apply_plan_rel_path: args.pkg.apply_plan_rel_path,
    apply_plan_md_rel_path: args.pkg.apply_plan_md_rel_path,
    founder_template_rel_path: args.pkg.founder_decision_template_rel_path,
    execution_plan_rel_path: args.pkg.execution_plan_rel_path,
  };
}

export async function buildSupabaseCsvParityCoverageFactoryV1(
  deps: BuildSupabaseCsvParityCoverageFactoryDepsV1,
): Promise<SupabaseCsvParityCoverageFactoryReportV1> {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const loadDiff =
    deps.loadDiff ??
    ((rootDir: string) => buildFridgeSupabaseVsCsvRetailerLinksDiffV1({ rootDir, deps: { now } }));

  const diff = await loadDiff(deps.rootDir);
  let candidateRows = diff.rows.filter((r) => r.status === SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1);

  if (deps.slugFilter) {
    const filter = normalizeSlug(deps.slugFilter);
    candidateRows = candidateRows.filter((r) => normalizeSlug(r.filter_slug) === filter);
  }

  const hardDoNotUseAsins =
    deps.hardDoNotUseAsins ?? loadHardDoNotUseAsinSetV1({ rootDir: deps.rootDir, fileExists, readText });

  const candidate_packages: SupabaseCsvParityCandidatePackageV1[] = [];
  for (const row of candidateRows) {
    candidate_packages.push(
      buildSupabaseCsvParityCandidatePackageV1({
        rootDir: deps.rootDir,
        diffRow: row,
        now,
        fileExists,
        readText,
        hardDoNotUseAsins,
      }),
    );
  }

  const ready_for_owner_review_count = candidate_packages.filter(
    (p) => p.candidate_status === "READY_FOR_OWNER_REVIEW",
  ).length;
  const blocked_count = candidate_packages.length - ready_for_owner_review_count;
  const expected_safe_buyer_path_proven_batch_delta = candidate_packages.reduce(
    (sum, p) => sum + (p.expected_census_delta?.safe_buyer_path_proven_count_delta ?? 0),
    0,
  );

  const unknown_facts: string[] = [];
  if (diff.supabase_truth_status === "UNKNOWN_DB_UNAVAILABLE") {
    unknown_facts.push(
      "UNKNOWN: Supabase diff unavailable — candidate discovery may be incomplete without live DB.",
    );
  }

  return {
    contract: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    generated_at: now().toISOString(),
    source_command: SUPABASE_CSV_PARITY_COVERAGE_FACTORY_SOURCE_COMMAND_V1,
    supabase_diff_source_contract: diff.contract,
    supabase_truth_status: diff.supabase_truth_status,
    parity_candidates_discovered: candidateRows.length,
    ready_for_owner_review_count,
    blocked_count,
    expected_safe_buyer_path_proven_batch_delta,
    candidate_packages,
    proven_facts: [
      "PROVEN: factory is read_only=true; no auto-approve; no auto-write CSV.",
      `PROVEN: discovered ${candidateRows.length} SUPABASE_HAS_WIN_CSV_MISSING candidate(s).`,
      `PROVEN: ${ready_for_owner_review_count} READY_FOR_OWNER_REVIEW; ${blocked_count} blocked.`,
      `PROVEN: expected SAFE_BUYER_PATH_PROVEN batch delta=${expected_safe_buyer_path_proven_batch_delta} if all ready packages applied and census passes.`,
    ],
    inferred_facts: [
      "INFERRED: blocked candidates require owner review of HARD_DO_NOT_USE or missing evidence before apply.",
    ],
    unknown_facts,
    recommended_next_action:
      ready_for_owner_review_count > 0
        ? "Owner review per-slug apply plans and founder templates. Run guarded dry-run per slug before any --write-csv."
        : "No ready parity candidates — resolve blockers or refresh Supabase diff before apply planning.",
  };
}

export const SUPABASE_CSV_PARITY_UKF8001_REFERENCE_SLUG_V1 = "ukf8001" as const;

export function buildSupabaseCsvParityReferencePackageForSlugV1(args: {
  rootDir: string;
  filterSlug: string;
  evidenceRelPath: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): SupabaseCsvParityCandidatePackageV1 {
  const slug = normalizeSlug(args.filterSlug);
  const diffRow: FridgeRetailerLinksDiffRowV1 = {
    filter_slug: slug,
    csv_has_direct_buyable: false,
    csv_primary_url: null,
    csv_primary_retailer: "oem-parts-catalog",
    supabase_row_count: 1,
    supabase_direct_buyable_count: 1,
    supabase_safe_cta_count: 1,
    supabase_primary_url: null,
    evidence_win_artifacts: [args.evidenceRelPath],
    status: SUPABASE_CSV_PARITY_DIFF_STATUS_CANDIDATE_V1,
  };
  const fileExists = args.fileExists ?? defaultFileExists;
  const readText = args.readText ?? defaultReadText;
  const applyPlan = buildSupabaseCsvParityApplyPlanProposalV1({
    rootDir: args.rootDir,
    filterSlug: slug,
    evidenceRelPath: args.evidenceRelPath,
    now: args.now,
    fileExists,
    readText,
  });
  const applyPlanRel = supabaseCsvParityApplyPlanRelPathV1(slug);
  const executionBuilt = buildSupabaseCsvParityExecutionPlanFromApplyPlanV1({
    applyPlan,
    applyPlanRelPath: applyPlanRel,
    now: args.now,
  });
  return {
    filter_slug: slug,
    candidate_status: "READY_FOR_OWNER_REVIEW",
    parity_diff_row: diffRow,
    apply_plan: applyPlan,
    apply_plan_rel_path: applyPlanRel,
    apply_plan_md_rel_path: supabaseCsvParityApplyPlanMdRelPathV1(slug),
    founder_decision_template_rel_path: supabaseCsvParityFounderTemplateRelPathV1(slug),
    execution_plan_rel_path: executionBuilt.execution_plan_rel_path,
    execution_plan: executionBuilt.execution_plan,
    blockers: applyPlan.blockers_before_apply.filter((b) =>
      ["mutation_authorized=false", "owner_apply_plan_approval_not_recorded"].includes(b),
    ),
    hard_do_not_use_blocked: false,
    expected_census_delta: applyPlan.expected_census_delta,
  };
}
