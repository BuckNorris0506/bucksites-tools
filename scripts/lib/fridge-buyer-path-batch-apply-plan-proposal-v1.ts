/**
 * Read-only fridge buyer-path batch apply-plan proposal v1 — planned_changes only; no CSV/Supabase apply.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildFridgeBuyerPathBatchApprovalReportV1,
  type FridgeBuyerPathBatchApprovalReportV1,
} from "./fridge-buyer-path-batch-approval-v1";
import {
  buildFridgeBuyerPathBatchProposalV1,
  FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
  type BuildFridgeBuyerPathBatchProposalDepsV1,
  type FridgeBuyerPathBatchProposalReportV1,
} from "./fridge-buyer-path-batch-proposal-v1";
import {
  buildFridgeRunRegistryArtifactRelPathV1,
} from "./fridge-buyer-path-batch-run-registry-v1";
import {
  loadFridgeRunRegistryAtPathV1,
  resolveFridgeRunRegistryStatusV1,
} from "./batch-run-registry-intake-v1";

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1 =
  "fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1 =
  "fridge_buyer_path_batch_apply_plan_proposal_v1" as const;

export const FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1 =
  "data/fridge/batch-production/apply-plans" as const;

export const FRIDGE_RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1 =
  "propose_replace_search_placeholder_with_verified_direct_buyable" as const;

export const FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1 = "tag=buckparts20-20" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_MISSING_TAG_V1 =
  "MISSING_BUCKPARTS_AFFILIATE_TAG" as const;

export const FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_DUPLICATE_DEST_V1 =
  "DUPLICATE_PROPOSED_DESTINATION_URL" as const;

export type FridgeBuyerPathBatchApplyPlanStatusV1 = "READY_FOR_OWNER_REVIEW" | "BLOCKED";

export type FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1 =
  | "OWNER_REVIEW_READY"
  | "OWNER_REVIEW_BLOCKED";

export type FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 =
  | "ACCEPTABLE_SHARED_DESTINATION_PROVEN"
  | "OWNER_REVIEW_REQUIRED"
  | "BLOCKED";

export type FridgeBuyerPathBatchApplyPlanAffiliateTagStatusV1 =
  | "HAS_BUCKPARTS_TAG"
  | "MISSING_BUCKPARTS_TAG"
  | "NON_AMAZON_OR_TAG_NOT_REQUIRED_UNKNOWN";

export type FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1 = {
  duplicate_destination_group_id: string;
  proposed_destination_url: string;
  slugs: string[];
  review_status: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1;
  review_reason: string;
};

export type FridgeBuyerPathBatchApplyPlanPlannedChangeV1 = {
  slug: string;
  oem_token: string;
  current_committed_buyer_path_status: string;
  proposed_destination_url: string;
  proposed_affiliate_url: string;
  proposed_retailer_key: string | null;
  proposed_retailer_slug: string | null;
  evidence_artifact_path: string | null;
  action: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1;
  mutation_authorized: false;
  affiliate_tag_status: FridgeBuyerPathBatchApplyPlanAffiliateTagStatusV1;
  affiliate_tag_normalization_applied: boolean;
  affiliate_tag_normalization_reason: string | null;
  duplicate_destination_group_id: string | null;
  duplicate_destination_group_review_status: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 | null;
  owner_review_risk_flags: string[];
  owner_review_required_reasons: string[];
};

export type FridgeBuyerPathBatchApplyPlanBlockedRowV1 = {
  slug: string;
  blockers: string[];
};

export type FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 = {
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
};

export type FridgeBuyerPathBatchApplyPlanProposalReportV1 =
  FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 & {
    contract: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1;
    report_name: typeof FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1;
    read_only: true;
    data_mutation: false;
    generated_at: string;
    wedge: "refrigerator_water";
    source_run_registry_rel_path: string;
    source_proposal_contract: typeof FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1;
    proposed_batch_id: string;
    run_id: string;
    plan_status: FridgeBuyerPathBatchApplyPlanStatusV1;
    owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1;
    plan_status_reasons: string[];
    planned_change_count: number;
    planned_changes: FridgeBuyerPathBatchApplyPlanPlannedChangeV1[];
    blocked_rows: FridgeBuyerPathBatchApplyPlanBlockedRowV1[];
    missing_affiliate_tag_count: number;
    duplicate_destination_group_count: number;
    duplicate_destination_group_review_status: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 | null;
    duplicate_destination_groups: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1[];
    owner_review_risk_count: number;
    plan_artifact_rel_path: string;
    recommended_next_action: string;
    proven_facts: string[];
    unknown_facts: string[];
  };

export type BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildProposal?: (deps: BuildFridgeBuyerPathBatchProposalDepsV1) => FridgeBuyerPathBatchProposalReportV1;
  buildApproval?: (deps: { rootDir: string; now?: () => Date }) => FridgeBuyerPathBatchApprovalReportV1;
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
};

type RetailerLinksCsvRowV1 = Record<string, string>;

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultReadText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function planningMutationFlagsFalse(): FridgeBuyerPathBatchApplyPlanProposalMutationFlagsV1 {
  return {
    apply_mutation_authorized: false,
    csv_apply_authorized: false,
    retailer_links_mutation_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    buy_link_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
  };
}

export function buildFridgeApplyPlanArtifactRelPathV1(proposedBatchId: string): string {
  const trimmed = proposedBatchId.trim();
  const base = trimmed.startsWith("fridge-buyer-path-batch-proposal-v1-")
    ? trimmed.replace(/^fridge-buyer-path-batch-proposal-v1-/, "fridge-buyer-path-batch-apply-plan-v1-")
    : `fridge-buyer-path-batch-apply-plan-v1-${trimmed}`;
  return `${FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1}/${base}.json`;
}

export function assertFridgeApplyPlanOutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.resolve(rootDir, outPath);
  const allowedDir = path.resolve(rootDir, FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1);
  if (!abs.startsWith(`${allowedDir}${path.sep}`) && abs !== allowedDir) {
    throw new Error(
      `--plan-out must be under ${FRIDGE_BATCH_APPLY_PLANS_DIR_REL_V1}/ (got ${outPath})`,
    );
  }
}

function loadRetailerLinksBySlugV1(
  rootDir: string,
  fileExists: (absPath: string) => boolean,
  readText: (absPath: string) => string,
): Map<string, RetailerLinksCsvRowV1[]> {
  const abs = path.join(rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  const map = new Map<string, RetailerLinksCsvRowV1[]>();
  if (!fileExists(abs)) return map;
  const rows = parse(readText(abs), { columns: true, skip_empty_lines: true }) as RetailerLinksCsvRowV1[];
  for (const row of rows) {
    const slug = row.filter_slug?.trim().toLowerCase();
    if (!slug) continue;
    const list = map.get(slug) ?? [];
    list.push(row);
    map.set(slug, list);
  }
  return map;
}

function evidenceHasCommittedLiveRowV1(jsonText: string): boolean {
  try {
    const doc = JSON.parse(jsonText) as Record<string, unknown>;
    const row = doc.committed_live_row;
    return row != null && typeof row === "object" && !Array.isArray(row);
  } catch {
    return false;
  }
}

function sortedSlugSet(slugs: string[]): string[] {
  return Array.from(new Set(slugs.map((s) => s.trim().toLowerCase()))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function slugSetsEqual(a: string[], b: string[]): boolean {
  const sa = sortedSlugSet(a);
  const sb = sortedSlugSet(b);
  return sa.length === sb.length && sa.every((slug, i) => slug === sb[i]);
}

export function isAmazonAffiliateUrlV1(affiliateUrl: string, retailerKey: string | null): boolean {
  if (retailerKey?.trim().toLowerCase() === "amazon") return true;
  try {
    const host = new URL(affiliateUrl.trim()).hostname.toLowerCase();
    return host === "amazon.com" || host.endsWith(".amazon.com");
  } catch {
    return affiliateUrl.toLowerCase().includes("amazon.com");
  }
}

export function resolveAffiliateTagStatusV1(args: {
  proposed_affiliate_url: string;
  proposed_retailer_key: string | null;
}): FridgeBuyerPathBatchApplyPlanAffiliateTagStatusV1 {
  if (!isAmazonAffiliateUrlV1(args.proposed_affiliate_url, args.proposed_retailer_key)) {
    return "NON_AMAZON_OR_TAG_NOT_REQUIRED_UNKNOWN";
  }
  return args.proposed_affiliate_url.includes(FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1)
    ? "HAS_BUCKPARTS_TAG"
    : "MISSING_BUCKPARTS_TAG";
}

export function isAmazonPdpDpUrlV1(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (host !== "amazon.com" && !host.endsWith(".amazon.com")) return false;
    return /\/dp\/[A-Z0-9]{10}(?:[/?]|$)/i.test(parsed.pathname + parsed.search);
  } catch {
    return /amazon\.com\/dp\/[A-Z0-9]{10}/i.test(url);
  }
}

export function extractAmazonAsinFromUrlV1(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() ?? null;
  } catch {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/i);
    return match?.[1]?.toUpperCase() ?? null;
  }
}

export function normalizeAmazonAffiliateTagV1(args: {
  proposed_destination_url: string;
  proposed_affiliate_url: string;
  proposed_retailer_key: string | null;
}): {
  proposed_affiliate_url: string;
  affiliate_tag_normalization_applied: boolean;
  affiliate_tag_normalization_reason: string | null;
} {
  const destination = args.proposed_destination_url.trim();
  const affiliate = args.proposed_affiliate_url.trim();
  const retailerKey = args.proposed_retailer_key?.trim().toLowerCase() ?? null;

  if (retailerKey !== "amazon") {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }
  if (!isAmazonPdpDpUrlV1(destination)) {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }
  if (!isAmazonAffiliateUrlV1(affiliate, retailerKey)) {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }

  const destinationAsin = extractAmazonAsinFromUrlV1(destination);
  const affiliateAsin = extractAmazonAsinFromUrlV1(affiliate);
  if (!destinationAsin || !affiliateAsin || destinationAsin !== affiliateAsin) {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }

  if (affiliate.includes(FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1)) {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }

  let parsedAffiliate: URL;
  try {
    parsedAffiliate = new URL(affiliate);
  } catch {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }

  const existingTag = parsedAffiliate.searchParams.get("tag");
  if (existingTag != null && existingTag !== "buckparts20-20") {
    return {
      proposed_affiliate_url: affiliate,
      affiliate_tag_normalization_applied: false,
      affiliate_tag_normalization_reason: null,
    };
  }

  parsedAffiliate.searchParams.set("tag", "buckparts20-20");
  const normalized = parsedAffiliate.toString();
  return {
    proposed_affiliate_url: normalized,
    affiliate_tag_normalization_applied: true,
    affiliate_tag_normalization_reason: `Appended ${FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1} to Amazon /dp/${destinationAsin} affiliate URL without changing PDP ASIN.`,
  };
}

export function buildDuplicateDestinationGroupIdMapV1(
  destinationUrls: string[],
): Map<string, string | null> {
  const normalizedCounts = new Map<string, number>();
  for (const url of destinationUrls) {
    const key = url.trim();
    normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + 1);
  }
  const duplicateUrls = Array.from(normalizedCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([url]) => url)
    .sort((a, b) => a.localeCompare(b));

  const groupIdByUrl = new Map<string, string | null>();
  duplicateUrls.forEach((url, index) => {
    groupIdByUrl.set(url, `dup-dest-${String(index + 1)}`);
  });
  for (const url of destinationUrls) {
    const key = url.trim();
    if (!groupIdByUrl.has(key)) {
      groupIdByUrl.set(key, null);
    }
  }
  return groupIdByUrl;
}

type PlannedChangeDraftV1 = Omit<
  FridgeBuyerPathBatchApplyPlanPlannedChangeV1,
  | "affiliate_tag_status"
  | "affiliate_tag_normalization_applied"
  | "affiliate_tag_normalization_reason"
  | "duplicate_destination_group_id"
  | "duplicate_destination_group_review_status"
  | "owner_review_risk_flags"
  | "owner_review_required_reasons"
>;

function readEvidenceCommittedDestinationV1(
  rootDir: string,
  evidenceRelPath: string | null,
  fileExists: (absPath: string) => boolean,
  readText: (absPath: string) => string,
): string | null {
  if (!evidenceRelPath?.trim()) return null;
  const abs = path.join(rootDir, evidenceRelPath);
  if (!fileExists(abs)) return null;
  try {
    const doc = JSON.parse(readText(abs)) as Record<string, unknown>;
    const row = doc.committed_live_row;
    if (row == null || typeof row !== "object" || Array.isArray(row)) return null;
    const destination = (row as Record<string, unknown>).destination_url;
    return typeof destination === "string" && destination.trim() ? destination.trim() : null;
  } catch {
    return null;
  }
}

export function resolveDuplicateDestinationGroupReviewV1(args: {
  group_id: string;
  proposed_destination_url: string;
  rows: Array<{ slug: string; evidence_artifact_path: string | null }>;
  rootDir: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1 {
  const normalizedDestination = args.proposed_destination_url.trim();
  const evidenceDestinations: string[] = [];

  for (const row of args.rows) {
    const evidenceDestination = readEvidenceCommittedDestinationV1(
      args.rootDir,
      row.evidence_artifact_path,
      args.fileExists,
      args.readText,
    );
    if (evidenceDestination != null) {
      evidenceDestinations.push(evidenceDestination);
    }
  }

  if (evidenceDestinations.length !== args.rows.length) {
    return {
      duplicate_destination_group_id: args.group_id,
      proposed_destination_url: normalizedDestination,
      slugs: args.rows.map((row) => row.slug).sort((a, b) => a.localeCompare(b)),
      review_status: "OWNER_REVIEW_REQUIRED",
      review_reason:
        "Duplicate proposed_destination_url group lacks committed_live_row evidence on every slug; owner must confirm intentional shared PDP.",
    };
  }

  const normalizedEvidence = evidenceDestinations.map((url) => url.trim());
  const uniqueEvidenceDestinations = new Set(normalizedEvidence);
  if (uniqueEvidenceDestinations.size > 1) {
    return {
      duplicate_destination_group_id: args.group_id,
      proposed_destination_url: normalizedDestination,
      slugs: args.rows.map((row) => row.slug).sort((a, b) => a.localeCompare(b)),
      review_status: "BLOCKED",
      review_reason:
        "Duplicate proposed_destination_url group has conflicting committed_live_row destination_url values across evidence artifacts.",
    };
  }

  const evidenceDestination = normalizedEvidence[0] ?? null;
  if (evidenceDestination !== normalizedDestination) {
    return {
      duplicate_destination_group_id: args.group_id,
      proposed_destination_url: normalizedDestination,
      slugs: args.rows.map((row) => row.slug).sort((a, b) => a.localeCompare(b)),
      review_status: "OWNER_REVIEW_REQUIRED",
      review_reason:
        "Duplicate proposed_destination_url group evidence destination does not match proposed_destination_url on every slug.",
    };
  }

  return {
    duplicate_destination_group_id: args.group_id,
    proposed_destination_url: normalizedDestination,
    slugs: args.rows.map((row) => row.slug).sort((a, b) => a.localeCompare(b)),
    review_status: "ACCEPTABLE_SHARED_DESTINATION_PROVEN",
    review_reason:
      "Every slug in duplicate proposed_destination_url group has committed_live_row evidence matching the shared Amazon PDP.",
  };
}

export function summarizeDuplicateDestinationGroupReviewV1(
  groups: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1[],
): FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 | null {
  if (groups.length === 0) return null;
  if (groups.some((group) => group.review_status === "BLOCKED")) return "BLOCKED";
  if (groups.some((group) => group.review_status === "OWNER_REVIEW_REQUIRED")) {
    return "OWNER_REVIEW_REQUIRED";
  }
  return "ACCEPTABLE_SHARED_DESTINATION_PROVEN";
}

type NormalizedPlannedChangeDraftV1 = PlannedChangeDraftV1 & {
  affiliate_tag_normalization_applied: boolean;
  affiliate_tag_normalization_reason: string | null;
};

export function applyAffiliateTagNormalizationToDraftsV1(
  drafts: PlannedChangeDraftV1[],
): NormalizedPlannedChangeDraftV1[] {
  return drafts.map((row) => {
    const normalized = normalizeAmazonAffiliateTagV1({
      proposed_destination_url: row.proposed_destination_url,
      proposed_affiliate_url: row.proposed_affiliate_url,
      proposed_retailer_key: row.proposed_retailer_key,
    });
    return {
      ...row,
      proposed_affiliate_url: normalized.proposed_affiliate_url,
      affiliate_tag_normalization_applied: normalized.affiliate_tag_normalization_applied,
      affiliate_tag_normalization_reason: normalized.affiliate_tag_normalization_reason,
    };
  });
}

export function annotateOwnerReviewRisksV1(
  drafts: NormalizedPlannedChangeDraftV1[],
  duplicateGroups: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1[],
): FridgeBuyerPathBatchApplyPlanPlannedChangeV1[] {
  const groupIdByUrl = buildDuplicateDestinationGroupIdMapV1(
    drafts.map((row) => row.proposed_destination_url),
  );
  const groupReviewById = new Map(
    duplicateGroups.map((group) => [group.duplicate_destination_group_id, group]),
  );

  return drafts.map((row) => {
    const affiliate_tag_status = resolveAffiliateTagStatusV1({
      proposed_affiliate_url: row.proposed_affiliate_url,
      proposed_retailer_key: row.proposed_retailer_key,
    });
    const duplicate_destination_group_id =
      groupIdByUrl.get(row.proposed_destination_url.trim()) ?? null;
    const duplicateGroup =
      duplicate_destination_group_id != null
        ? groupReviewById.get(duplicate_destination_group_id)
        : undefined;
    const duplicate_destination_group_review_status =
      duplicateGroup?.review_status ?? null;

    const owner_review_risk_flags: string[] = [];
    const owner_review_required_reasons: string[] = [];

    if (affiliate_tag_status === "MISSING_BUCKPARTS_TAG") {
      owner_review_risk_flags.push(FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_MISSING_TAG_V1);
      owner_review_required_reasons.push(FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_MISSING_TAG_V1);
    }
    if (duplicate_destination_group_id != null) {
      owner_review_risk_flags.push(
        FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_DUPLICATE_DEST_V1,
      );
      if (duplicate_destination_group_review_status === "OWNER_REVIEW_REQUIRED") {
        owner_review_required_reasons.push(
          `${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_OWNER_REVIEW_RISK_DUPLICATE_DEST_V1}:${duplicate_destination_group_id}`,
        );
      }
      if (duplicate_destination_group_review_status === "BLOCKED") {
        owner_review_required_reasons.push(
          `DUPLICATE_PROPOSED_DESTINATION_URL_BLOCKED:${duplicate_destination_group_id}`,
        );
      }
    }

    return {
      ...row,
      affiliate_tag_status,
      duplicate_destination_group_id,
      duplicate_destination_group_review_status,
      owner_review_risk_flags,
      owner_review_required_reasons,
    };
  });
}

export function summarizeOwnerReviewRiskCountsV1(
  plannedChanges: FridgeBuyerPathBatchApplyPlanPlannedChangeV1[],
  duplicateDestinationGroupReviewStatus: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 | null,
): {
  missing_affiliate_tag_count: number;
  duplicate_destination_group_count: number;
  owner_review_risk_count: number;
  owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1;
} {
  const missing_affiliate_tag_count = plannedChanges.filter(
    (row) => row.affiliate_tag_status === "MISSING_BUCKPARTS_TAG",
  ).length;
  const duplicateGroupIds = new Set(
    plannedChanges
      .map((row) => row.duplicate_destination_group_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  const duplicate_destination_group_count = duplicateGroupIds.size;
  const owner_review_risk_count = plannedChanges.reduce(
    (sum, row) => sum + row.owner_review_required_reasons.length,
    0,
  );
  const duplicateReviewBlocks =
    duplicateDestinationGroupReviewStatus === "OWNER_REVIEW_REQUIRED" ||
    duplicateDestinationGroupReviewStatus === "BLOCKED";
  const owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1 =
    missing_affiliate_tag_count > 0 || duplicateReviewBlocks
      ? "OWNER_REVIEW_BLOCKED"
      : "OWNER_REVIEW_READY";

  return {
    missing_affiliate_tag_count,
    duplicate_destination_group_count,
    owner_review_risk_count,
    owner_review_status,
  };
}

function buildDuplicateDestinationGroupsV1(args: {
  drafts: NormalizedPlannedChangeDraftV1[];
  rootDir: string;
  fileExists: (absPath: string) => boolean;
  readText: (absPath: string) => string;
}): FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupV1[] {
  const groupIdByUrl = buildDuplicateDestinationGroupIdMapV1(
    args.drafts.map((row) => row.proposed_destination_url),
  );
  const rowsByGroupId = new Map<string, typeof args.drafts>();
  for (const row of args.drafts) {
    const groupId = groupIdByUrl.get(row.proposed_destination_url.trim());
    if (groupId == null) continue;
    const list = rowsByGroupId.get(groupId) ?? [];
    list.push(row);
    rowsByGroupId.set(groupId, list);
  }

  return Array.from(rowsByGroupId.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupId, rows]) =>
      resolveDuplicateDestinationGroupReviewV1({
        group_id: groupId,
        proposed_destination_url: rows[0]!.proposed_destination_url,
        rows: rows.map((row) => ({
          slug: row.slug,
          evidence_artifact_path: row.evidence_artifact_path,
        })),
        rootDir: args.rootDir,
        fileExists: args.fileExists,
        readText: args.readText,
      }),
    );
}

function buildRecommendedNextActionV1(args: {
  planStatus: FridgeBuyerPathBatchApplyPlanStatusV1;
  ownerReviewStatus: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1;
  planArtifactRelPath: string;
  blockedCount: number;
  missingAffiliateTagCount: number;
  duplicateDestinationGroupCount: number;
  duplicateDestinationGroupReviewStatus: FridgeBuyerPathBatchApplyPlanDuplicateDestinationGroupReviewStatusV1 | null;
  affiliateTagNormalizationCount: number;
}): string {
  if (args.planStatus === "BLOCKED") {
    return (
      `Fridge buyer-path apply-plan proposal is BLOCKED (${String(args.blockedCount)} row(s) or gate failure) — ` +
      "repair blockers before any plan artifact write; mutation remains unauthorized."
    );
  }
  if (args.missingAffiliateTagCount > 0) {
    return (
      `Fridge buyer-path apply-plan proposal is READY_FOR_OWNER_REVIEW with OWNER_REVIEW_BLOCKED monetization/link risks at \`${args.planArtifactRelPath}\` — ` +
      `${String(args.missingAffiliateTagCount)} Amazon row(s) still missing ${FRIDGE_BUYER_PATH_BATCH_BUCKPARTS_AMAZON_TAG_V1} after read-only normalization. ` +
      `${String(args.duplicateDestinationGroupCount)} duplicate proposed_destination_url group(s) remain visible for review. ` +
      "Review plan only; mutation unauthorized. No CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes."
    );
  }
  if (
    args.duplicateDestinationGroupCount > 0 &&
    args.duplicateDestinationGroupReviewStatus === "OWNER_REVIEW_REQUIRED"
  ) {
    return (
      `Fridge buyer-path apply-plan proposal is READY_FOR_OWNER_REVIEW with duplicate destination review required at \`${args.planArtifactRelPath}\` — ` +
      `${String(args.affiliateTagNormalizationCount)} Amazon affiliate tag normalization(s) applied read-only; ` +
      `${String(args.duplicateDestinationGroupCount)} duplicate proposed_destination_url group(s) require owner review before approval. ` +
      "Review plan only; mutation unauthorized. No CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes."
    );
  }
  if (args.ownerReviewStatus === "OWNER_REVIEW_BLOCKED") {
    return (
      `Fridge buyer-path apply-plan proposal is READY_FOR_OWNER_REVIEW with OWNER_REVIEW_BLOCKED link risks at \`${args.planArtifactRelPath}\` — ` +
      `${String(args.duplicateDestinationGroupCount)} duplicate proposed_destination_url group(s) remain visible for review. ` +
      "Review plan only; mutation unauthorized. No CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify changes."
    );
  }
  return (
    `Fridge buyer-path apply-plan proposal is READY_FOR_OWNER_REVIEW with clean owner-review status at \`${args.planArtifactRelPath}\` — ` +
    `${String(args.affiliateTagNormalizationCount)} Amazon affiliate tag normalization(s) applied read-only; ` +
    `${String(args.duplicateDestinationGroupCount)} duplicate proposed_destination_url group(s) classified with evidence. ` +
    "Owner review only; no CSV, retailer_links, Supabase, public UI, buy-link, evidence, deploy, or Netlify mutation is authorized. " +
    "Optional write via `npm run buckparts:fridge-buyer-path-batch-apply-plan-proposal -- --plan-out <canonical-path>`."
  );
}

export function buildFridgeBuyerPathBatchApplyPlanProposalV1(
  deps: BuildFridgeBuyerPathBatchApplyPlanProposalDepsV1,
): FridgeBuyerPathBatchApplyPlanProposalReportV1 {
  const now = deps.now ?? (() => new Date());
  const fileExists = deps.fileExists ?? defaultFileExists;
  const readText = deps.readText ?? defaultReadText;
  const buildProposal = deps.buildProposal ?? buildFridgeBuyerPathBatchProposalV1;
  const buildApproval = deps.buildApproval ?? buildFridgeBuyerPathBatchApprovalReportV1;

  const proposal = buildProposal({ rootDir: deps.rootDir, now: deps.now });
  const approval = buildApproval({ rootDir: deps.rootDir, now: deps.now });
  const planArtifactRelPath = buildFridgeApplyPlanArtifactRelPathV1(proposal.proposed_batch_id);
  const runRegistryRelPath = buildFridgeRunRegistryArtifactRelPathV1(proposal.proposed_batch_id);
  const registryLoad = loadFridgeRunRegistryAtPathV1({
    rootDir: deps.rootDir,
    relPath: runRegistryRelPath,
    fileExists,
    readText,
  });
  const registryResolved = resolveFridgeRunRegistryStatusV1({
    proposal,
    approval,
    registryLoad,
  });

  const plan_status_reasons: string[] = [];
  const blocked_rows: FridgeBuyerPathBatchApplyPlanBlockedRowV1[] = [];
  const proven_facts: string[] = [
    `PROVEN: contract=${FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1}; read_only=true; data_mutation=false; all mutation flags false.`,
    `PROVEN: committed CSV source=${FRIDGE_RETAILER_LINKS_CSV_REL_V1} (read-only).`,
  ];
  const unknown_facts: string[] = [
    "UNKNOWN: Whether live Supabase/public.retailer_links matches committed CSV — apply-plan reads CSV only.",
  ];

  if (approval.approval_status !== "owner_approved_for_next_planning_only") {
    plan_status_reasons.push(
      `approval_status must be owner_approved_for_next_planning_only (got ${approval.approval_status})`,
    );
  }
  if (registryResolved.status !== "PROVEN_PLANNING_RUN_REGISTRY") {
    plan_status_reasons.push(
      `run-registry status must be PROVEN_PLANNING_RUN_REGISTRY (got ${registryResolved.status})`,
    );
  }
  if (!registryLoad.planning?.valid || !registryLoad.planning.doc) {
    const parseErrors = [
      ...(registryLoad.planning?.parse_errors ?? []),
      ...(registryLoad.closed?.parse_errors ?? []),
    ];
    plan_status_reasons.push(
      registryLoad.exists
        ? `run-registry failed validation: ${parseErrors.join("; ")}`
        : `run-registry missing at ${runRegistryRelPath}`,
    );
  }
  const planningRegistry = registryLoad.planning?.doc ?? null;
  if (planningRegistry && planningRegistry.proposed_batch_id !== proposal.proposed_batch_id) {
    plan_status_reasons.push(
      `run-registry proposed_batch_id mismatch (registry=${planningRegistry.proposed_batch_id}; proposal=${proposal.proposed_batch_id})`,
    );
  }
  if (
    planningRegistry &&
    !slugSetsEqual(planningRegistry.proposed_slugs, proposal.proposed_rows.map((row) => row.slug))
  ) {
    plan_status_reasons.push("run-registry proposed_slugs must match proposal proposed_rows slug set");
  }

  const csvBySlug = loadRetailerLinksBySlugV1(deps.rootDir, fileExists, readText);
  const registrySlugs = new Set(
    (planningRegistry?.proposed_slugs ?? proposal.proposed_rows.map((row) => row.slug)).map((s) =>
      s.trim().toLowerCase(),
    ),
  );

  const planned_change_drafts: PlannedChangeDraftV1[] = [];
  const gatesPassed = plan_status_reasons.length === 0;

  if (gatesPassed) {
    for (const row of proposal.proposed_rows) {
      const slugKey = row.slug.trim().toLowerCase();
      const rowBlockers: string[] = [];

      if (!registrySlugs.has(slugKey)) {
        rowBlockers.push("slug is not a member of run-registry proposed_slugs");
      }
      if (!row.destination_url?.trim()) {
        rowBlockers.push("missing destination_url on proposal row");
      }
      if (!row.affiliate_url?.trim()) {
        rowBlockers.push("missing affiliate_url on proposal row");
      }
      if (!row.evidence_artifact_path?.trim()) {
        rowBlockers.push("missing evidence_artifact_path on proposal row");
      } else {
        const evidenceAbs = path.join(deps.rootDir, row.evidence_artifact_path);
        if (!fileExists(evidenceAbs)) {
          rowBlockers.push(`evidence artifact missing at ${row.evidence_artifact_path}`);
        } else if (!evidenceHasCommittedLiveRowV1(readText(evidenceAbs))) {
          rowBlockers.push(`evidence artifact lacks committed_live_row at ${row.evidence_artifact_path}`);
        }
      }

      const csvRows = csvBySlug.get(slugKey) ?? [];
      if (csvRows.length === 0) {
        rowBlockers.push(`no committed retailer_links.csv rows for slug ${row.slug}`);
      }

      if (rowBlockers.length > 0) {
        blocked_rows.push({ slug: row.slug, blockers: rowBlockers });
        continue;
      }

      planned_change_drafts.push({
        slug: row.slug,
        oem_token: row.oem_token,
        current_committed_buyer_path_status: row.committed_buyer_path_status,
        proposed_destination_url: row.destination_url,
        proposed_affiliate_url: row.affiliate_url,
        proposed_retailer_key: row.retailer_key,
        proposed_retailer_slug: row.retailer_key,
        evidence_artifact_path: row.evidence_artifact_path,
        action: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_ACTION_V1,
        mutation_authorized: false,
      });
    }

    const extraProposalSlugs = proposal.proposed_rows
      .map((row) => row.slug.trim().toLowerCase())
      .filter((slug) => !registrySlugs.has(slug));
    if (extraProposalSlugs.length > 0) {
      plan_status_reasons.push(
        `proposal contains slugs outside run-registry scope: ${extraProposalSlugs.join(", ")}`,
      );
    }
  }

  const normalized_drafts =
    plan_status_reasons.length === 0 && blocked_rows.length === 0
      ? applyAffiliateTagNormalizationToDraftsV1(planned_change_drafts)
      : [];
  const duplicate_destination_groups =
    normalized_drafts.length > 0
      ? buildDuplicateDestinationGroupsV1({
          drafts: normalized_drafts,
          rootDir: deps.rootDir,
          fileExists,
          readText,
        })
      : [];
  const duplicate_destination_group_review_status =
    summarizeDuplicateDestinationGroupReviewV1(duplicate_destination_groups);
  const planned_changes =
    normalized_drafts.length > 0
      ? annotateOwnerReviewRisksV1(normalized_drafts, duplicate_destination_groups)
      : [];
  const riskSummary = summarizeOwnerReviewRiskCountsV1(
    planned_changes,
    duplicate_destination_group_review_status,
  );
  const affiliate_tag_normalization_count = planned_changes.filter(
    (row) => row.affiliate_tag_normalization_applied,
  ).length;

  const plan_status: FridgeBuyerPathBatchApplyPlanStatusV1 =
    plan_status_reasons.length > 0 || blocked_rows.length > 0 ? "BLOCKED" : "READY_FOR_OWNER_REVIEW";

  const owner_review_status: FridgeBuyerPathBatchApplyPlanOwnerReviewStatusV1 =
    plan_status === "BLOCKED" ? "OWNER_REVIEW_BLOCKED" : riskSummary.owner_review_status;

  if (plan_status === "READY_FOR_OWNER_REVIEW") {
    proven_facts.push(
      `PROVEN: planned_change_count=${String(planned_changes.length)} limited to run-registry proposed slugs.`,
      `PROVEN: run-registry validated at ${runRegistryRelPath}; approval_status=${approval.approval_status}.`,
      `PROVEN: owner_review_status=${owner_review_status}; missing_affiliate_tag_count=${String(riskSummary.missing_affiliate_tag_count)}; duplicate_destination_group_count=${String(riskSummary.duplicate_destination_group_count)}; duplicate_destination_group_review_status=${duplicate_destination_group_review_status ?? "none"}; affiliate_tag_normalization_count=${String(affiliate_tag_normalization_count)}.`,
    );
  } else {
    proven_facts.push(
      `PROVEN: plan blocked — gate_reasons=${String(plan_status_reasons.length)}; blocked_rows=${String(blocked_rows.length)}.`,
    );
  }

  const runId = planningRegistry?.run_id ?? registryLoad.closed?.doc?.run_id ?? proposal.proposed_run_id;

  return {
    contract: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_BATCH_APPLY_PLAN_PROPOSAL_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    source_run_registry_rel_path: runRegistryRelPath,
    source_proposal_contract: FRIDGE_BUYER_PATH_BATCH_PROPOSAL_CONTRACT_V1,
    proposed_batch_id: proposal.proposed_batch_id,
    run_id: runId,
    plan_status,
    owner_review_status,
    plan_status_reasons,
    planned_change_count: planned_changes.length,
    planned_changes,
    blocked_rows,
    missing_affiliate_tag_count: riskSummary.missing_affiliate_tag_count,
    duplicate_destination_group_count: riskSummary.duplicate_destination_group_count,
    duplicate_destination_group_review_status,
    duplicate_destination_groups,
    owner_review_risk_count: riskSummary.owner_review_risk_count,
    plan_artifact_rel_path: planArtifactRelPath,
    recommended_next_action: buildRecommendedNextActionV1({
      planStatus: plan_status,
      ownerReviewStatus: owner_review_status,
      planArtifactRelPath,
      blockedCount: blocked_rows.length,
      missingAffiliateTagCount: riskSummary.missing_affiliate_tag_count,
      duplicateDestinationGroupCount: riskSummary.duplicate_destination_group_count,
      duplicateDestinationGroupReviewStatus: duplicate_destination_group_review_status,
      affiliateTagNormalizationCount: affiliate_tag_normalization_count,
    }),
    proven_facts,
    unknown_facts,
    ...planningMutationFlagsFalse(),
  };
}
