/**
 * Read-only universal batch lifecycle apply-readiness discovery for refrigerator_water.
 * PROVEN: no CSV, retailer_links, Supabase, public UI, buy-link, evidence writes, deploy, or Netlify.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  findMatchingFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1,
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1,
  loadFridgeBuyerPathBatchApplyPlanArtifactV1,
  resolveFridgeBuyerPathBatchApplyPlanApprovalStatusV1,
} from "./fridge-buyer-path-batch-apply-plan-approval-v1";
import {
  FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
  FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1,
} from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import { validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1 } from "./fridge-buyer-path-batch-run-registry-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../../src/lib/owner-dashboard/founder-decision-registry-scan-v1";

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CONTRACT_V1 =
  "universal_batch_lifecycle_apply_readiness_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1 =
  "npm run buckparts:universal-batch-lifecycle-apply-readiness" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CC_JQ_PATH_V1 =
  ".command_center_v2.universal_batch_lifecycle_apply_readiness_v1" as const;

export const UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1 = 14 as const;

export type UniversalBatchLifecycleApplyReadinessStatusV1 = "PROVEN" | "BLOCKED" | "UNKNOWN";

export type UniversalBatchLifecycleApplyReadinessFactCheckV1 = {
  fact_id: string;
  present: boolean;
  blocks_readiness: boolean;
  summary: string;
};

export type UniversalBatchLifecycleApplyReadinessReportV1 = {
  contract: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  recommended_jq_path: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CC_JQ_PATH_V1;
  source_command: typeof UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1;
  generated_at: string;
  wedge: "refrigerator_water";
  source_apply_plan_artifact_rel_path: string;
  source_run_registry_rel_path: string | null;
  apply_readiness_status: UniversalBatchLifecycleApplyReadinessStatusV1;
  lifecycle_state_when_proven: "apply_readiness_ready";
  lifecycle_state_when_not_proven: "apply_readiness_unknown";
  fact_checks: UniversalBatchLifecycleApplyReadinessFactCheckV1[];
  apply_readiness_blockers: string[];
  apply_readiness_missing_facts: string[];
  planned_change_count: number | null;
  approved_slug_count: number | null;
  owner_planning_approval_status: string | null;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  recommended_next_action: string;
  proven_facts: string[];
  unknown_facts: string[];
};

type ApplyPlanRowForReadinessV1 = {
  slug: string;
  proposed_affiliate_url: string;
  evidence_artifact_path: string | null;
  mutation_authorized: boolean;
};

export type BuildUniversalBatchLifecycleApplyReadinessInputV1 = {
  rootDir: string;
  now?: () => Date;
  applyPlanArtifactRelPath?: string;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
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

function amazonAffiliateUrlHasBuckpartsTag(url: string): boolean {
  return url.includes(FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1);
}

function loadApplyPlanRowsForReadinessV1(args: {
  rootDir: string;
  relPath: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): {
  ok: true;
  source_run_registry_rel_path: string | null;
  blocked_row_count: number;
  rows: ApplyPlanRowForReadinessV1[];
  mutation_flags_false: boolean;
} | { ok: false } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return { ok: false };
  try {
    const doc = JSON.parse(args.readText(abs)) as Record<string, unknown>;
    if (doc.contract !== FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1) return { ok: false };
    const planned_changes = doc.planned_changes;
    if (!Array.isArray(planned_changes)) return { ok: false };
    const mutation_keys = [
      "apply_mutation_authorized",
      "csv_apply_authorized",
      "retailer_links_mutation_authorized",
      "supabase_mutation_authorized",
      "public_ui_mutation_authorized",
      "buy_link_mutation_authorized",
      "evidence_write_authorized",
      "netlify_api_authorized",
    ] as const;
    const mutation_flags_false = mutation_keys.every((key) => doc[key] === false);
    const blocked_rows = Array.isArray(doc.blocked_rows) ? doc.blocked_rows : [];
    const rows: ApplyPlanRowForReadinessV1[] = planned_changes.map((row) => {
      const o = row as Record<string, unknown>;
      return {
        slug: typeof o.slug === "string" ? o.slug : "",
        proposed_affiliate_url: typeof o.proposed_affiliate_url === "string" ? o.proposed_affiliate_url : "",
        evidence_artifact_path:
          typeof o.evidence_artifact_path === "string" ? o.evidence_artifact_path : null,
        mutation_authorized: o.mutation_authorized === true,
      };
    });
    return {
      ok: true,
      source_run_registry_rel_path:
        typeof doc.source_run_registry_rel_path === "string" ? doc.source_run_registry_rel_path : null,
      blocked_row_count: blocked_rows.length,
      rows,
      mutation_flags_false,
    };
  } catch {
    return { ok: false };
  }
}

function loadApprovedSlugsFromRunRegistryV1(args: {
  rootDir: string;
  relPath: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): { ok: true; slugs: string[]; proposed_row_count: number } | { ok: false } {
  const abs = path.join(args.rootDir, args.relPath);
  if (!args.fileExists(abs)) return { ok: false };
  try {
    const doc = JSON.parse(args.readText(abs)) as unknown;
    const validated = validateFridgeBuyerPathBatchPlanningRunRegistryDocumentV1(doc);
    if (!validated.ok) return { ok: false };
    return {
      ok: true,
      slugs: validated.doc.proposed_slugs.map(normalizeSlug),
      proposed_row_count: validated.doc.proposed_row_count,
    };
  } catch {
    return { ok: false };
  }
}

export function buildUniversalBatchLifecycleApplyReadinessV1(
  input: BuildUniversalBatchLifecycleApplyReadinessInputV1,
): UniversalBatchLifecycleApplyReadinessReportV1 {
  const now = input.now ?? (() => new Date());
  const fileExists = input.fileExists ?? defaultFileExists;
  const readText = input.readText ?? defaultReadText;
  const applyPlanRelPath =
    input.applyPlanArtifactRelPath ?? FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_APPROVAL_CANONICAL_APPLY_PLAN_REL_V1;

  const fact_checks: UniversalBatchLifecycleApplyReadinessFactCheckV1[] = [];
  const apply_readiness_blockers: string[] = [];
  const apply_readiness_missing_facts: string[] = [];
  const proven_facts: string[] = [
    "PROVEN: universal_batch_lifecycle_apply_readiness_v1 is read-only discovery; mutation_authorized=false.",
  ];
  const unknown_facts: string[] = [];

  const pushFact = (fact: UniversalBatchLifecycleApplyReadinessFactCheckV1) => {
    fact_checks.push(fact);
    if (!fact.present) {
      apply_readiness_missing_facts.push(fact.fact_id);
    }
    if (fact.blocks_readiness) {
      apply_readiness_blockers.push(`${fact.fact_id}: ${fact.summary}`);
    }
  };

  const applyPlan = loadFridgeBuyerPathBatchApplyPlanArtifactV1({
    rootDir: input.rootDir,
    relPath: applyPlanRelPath,
    fileExists,
    readText,
  });
  pushFact({
    fact_id: "apply_plan_artifact_valid",
    present: applyPlan != null,
    blocks_readiness: applyPlan == null,
    summary:
      applyPlan == null
        ? `Committed apply-plan artifact missing or invalid at ${applyPlanRelPath}.`
        : `Apply-plan artifact validates at ${applyPlanRelPath}.`,
  });

  const applyPlanDetail = loadApplyPlanRowsForReadinessV1({
    rootDir: input.rootDir,
    relPath: applyPlanRelPath,
    fileExists,
    readText,
  });

  pushFact({
    fact_id: "plan_status_ready_for_owner_review",
    present: applyPlan?.plan_status === "READY_FOR_OWNER_REVIEW",
    blocks_readiness: applyPlan != null && applyPlan.plan_status !== "READY_FOR_OWNER_REVIEW",
    summary:
      applyPlan?.plan_status === "READY_FOR_OWNER_REVIEW"
        ? "plan_status=READY_FOR_OWNER_REVIEW."
        : `plan_status=${applyPlan?.plan_status ?? "MISSING"}.`,
  });

  pushFact({
    fact_id: "owner_review_status_ready",
    present: applyPlan?.owner_review_status === "OWNER_REVIEW_READY",
    blocks_readiness: applyPlan != null && applyPlan.owner_review_status !== "OWNER_REVIEW_READY",
    summary:
      applyPlan?.owner_review_status === "OWNER_REVIEW_READY"
        ? "owner_review_status=OWNER_REVIEW_READY."
        : `owner_review_status=${applyPlan?.owner_review_status ?? "MISSING"}.`,
  });

  const registryFiles = scanFounderDecisionRegistryJsonFilesV1(input.rootDir);
  const { matched_row, validation_errors } = applyPlan
    ? findMatchingFridgeBuyerPathBatchApplyPlanApprovalRegistryRowV1({
        source_apply_plan_artifact_rel_path: applyPlan.source_apply_plan_artifact_rel_path,
        files: registryFiles,
      })
    : { matched_row: null, validation_errors: ["apply_plan_artifact_valid:false"] as string[] };
  const owner_planning_approval_status = applyPlan
    ? resolveFridgeBuyerPathBatchApplyPlanApprovalStatusV1({
        matched_row,
        validation_errors,
      })
    : null;

  pushFact({
    fact_id: "owner_planning_approval_recorded",
    present: owner_planning_approval_status === "owner_approved_for_next_planning_only",
    blocks_readiness: owner_planning_approval_status !== "owner_approved_for_next_planning_only",
    summary:
      owner_planning_approval_status === "owner_approved_for_next_planning_only"
        ? "Founder registry records owner_approved_for_next_planning_only for this apply-plan artifact."
        : `Owner planning approval status=${owner_planning_approval_status ?? "MISSING"}.`,
  });

  const runRegistryRelPath = applyPlanDetail.ok ? applyPlanDetail.source_run_registry_rel_path : null;
  const approvedRegistry = runRegistryRelPath
    ? loadApprovedSlugsFromRunRegistryV1({
        rootDir: input.rootDir,
        relPath: runRegistryRelPath,
        fileExists,
        readText,
      })
    : { ok: false as const };

  const plannedSlugs =
    applyPlan?.planned_changes.map((row) => normalizeSlug(row.slug)).sort() ?? [];
  const approvedSlugs = approvedRegistry.ok ? [...approvedRegistry.slugs].sort() : [];
  const slugSetsMatch =
    plannedSlugs.length > 0 &&
    approvedSlugs.length > 0 &&
    plannedSlugs.length === approvedSlugs.length &&
    plannedSlugs.every((slug, index) => slug === approvedSlugs[index]);

  pushFact({
    fact_id: "planned_slug_set_matches_run_registry",
    present: slugSetsMatch,
    blocks_readiness: applyPlan != null && !slugSetsMatch,
    summary: slugSetsMatch
      ? "planned_changes slugs match run-registry proposed_slugs."
      : `planned slug count=${String(plannedSlugs.length)} approved slug count=${String(approvedSlugs.length)}.`,
  });

  pushFact({
    fact_id: "planned_change_count_is_14",
    present: applyPlan?.planned_change_count === UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1,
    blocks_readiness:
      applyPlan != null &&
      applyPlan.planned_change_count !== UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_APPROVED_SLUG_COUNT_V1,
    summary: `planned_change_count=${String(applyPlan?.planned_change_count ?? "MISSING")}.`,
  });

  pushFact({
    fact_id: "artifact_mutation_flags_false",
    present: applyPlanDetail.ok && applyPlanDetail.mutation_flags_false,
    blocks_readiness: applyPlanDetail.ok && !applyPlanDetail.mutation_flags_false,
    summary:
      applyPlanDetail.ok && applyPlanDetail.mutation_flags_false
        ? "All apply-plan artifact mutation flags are false."
        : "One or more apply-plan artifact mutation flags are not false.",
  });

  const missingAmazonTagSlugs =
    applyPlanDetail.ok
      ? applyPlanDetail.rows
          .filter(
            (row) =>
              row.proposed_affiliate_url.includes("amazon.com/dp/") &&
              !amazonAffiliateUrlHasBuckpartsTag(row.proposed_affiliate_url),
          )
          .map((row) => row.slug)
      : [];

  pushFact({
    fact_id: "amazon_affiliate_tags_present",
    present: applyPlanDetail.ok && missingAmazonTagSlugs.length === 0,
    blocks_readiness: applyPlanDetail.ok && missingAmazonTagSlugs.length > 0,
    summary:
      missingAmazonTagSlugs.length === 0
        ? "All Amazon /dp/ planned affiliate URLs include buckparts20-20 tag."
        : `Missing Amazon affiliate tag on slugs: ${missingAmazonTagSlugs.join(", ")}.`,
  });

  const missingEvidenceSlugs =
    applyPlanDetail.ok
      ? applyPlanDetail.rows
          .filter((row) => {
            if (!row.evidence_artifact_path) return true;
            return !fileExists(path.join(input.rootDir, row.evidence_artifact_path));
          })
          .map((row) => row.slug)
      : [];

  pushFact({
    fact_id: "evidence_artifacts_present",
    present: applyPlanDetail.ok && missingEvidenceSlugs.length === 0,
    blocks_readiness: applyPlanDetail.ok && missingEvidenceSlugs.length > 0,
    summary:
      missingEvidenceSlugs.length === 0
        ? "All planned_changes evidence_artifact_path files exist on disk."
        : `Missing evidence artifacts for slugs: ${missingEvidenceSlugs.join(", ")}.`,
  });

  pushFact({
    fact_id: "blocked_rows_empty",
    present: applyPlanDetail.ok && applyPlanDetail.blocked_row_count === 0,
    blocks_readiness: applyPlanDetail.ok && applyPlanDetail.blocked_row_count > 0,
    summary:
      applyPlanDetail.ok && applyPlanDetail.blocked_row_count === 0
        ? "blocked_rows is empty."
        : `blocked_rows count=${String(applyPlanDetail.ok ? applyPlanDetail.blocked_row_count : "UNKNOWN")}.`,
  });

  pushFact({
    fact_id: "row_mutation_not_authorized",
    present: applyPlanDetail.ok && applyPlanDetail.rows.every((row) => row.mutation_authorized === false),
    blocks_readiness:
      applyPlanDetail.ok && applyPlanDetail.rows.some((row) => row.mutation_authorized === true),
    summary: "Every planned_change row keeps mutation_authorized=false.",
  });

  const hasUnknownInputs = applyPlan == null || !applyPlanDetail.ok || !approvedRegistry.ok;
  let apply_readiness_status: UniversalBatchLifecycleApplyReadinessStatusV1;
  if (hasUnknownInputs && apply_readiness_blockers.length === 0) {
    apply_readiness_status = "UNKNOWN";
    unknown_facts.push("UNKNOWN: apply-readiness could not evaluate all facts due to missing inputs.");
  } else if (apply_readiness_blockers.length > 0) {
    apply_readiness_status = "BLOCKED";
  } else {
    apply_readiness_status = "PROVEN";
    proven_facts.push("PROVEN: All required apply-readiness facts are present; status=PROVEN (mutation still unauthorized).");
  }

  const recommended_next_action =
    apply_readiness_status === "PROVEN"
      ? "LIFECYCLE APPLY-READINESS [PROVEN]: refrigerator_water apply-readiness facts are present for the committed apply-plan artifact. Mutation unauthorized; no apply executor exists."
      : apply_readiness_status === "BLOCKED"
        ? `LIFECYCLE APPLY-READINESS [BLOCKED]: refrigerator_water apply-readiness blockers remain (${String(apply_readiness_blockers.length)}). Run ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1} read-only. Mutation unauthorized.`
        : `LIFECYCLE APPLY-READINESS [UNKNOWN]: refrigerator_water apply-readiness facts incomplete. Run ${UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1} read-only. Mutation unauthorized.`;

  return {
    contract: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    recommended_jq_path: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_CC_JQ_PATH_V1,
    source_command: UNIVERSAL_BATCH_LIFECYCLE_APPLY_READINESS_SOURCE_COMMAND_V1,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    source_apply_plan_artifact_rel_path: applyPlanRelPath,
    source_run_registry_rel_path: runRegistryRelPath,
    apply_readiness_status,
    lifecycle_state_when_proven: "apply_readiness_ready",
    lifecycle_state_when_not_proven: "apply_readiness_unknown",
    fact_checks,
    apply_readiness_blockers,
    apply_readiness_missing_facts,
    planned_change_count: applyPlan?.planned_change_count ?? null,
    approved_slug_count: approvedRegistry.ok ? approvedRegistry.proposed_row_count : null,
    owner_planning_approval_status,
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    recommended_next_action,
    proven_facts,
    unknown_facts,
  };
}
