/**
 * Read-only RPWFE official GE Supabase parity plan.
 * Compares committed repo CSV to expected public.retailer_links shape — no Supabase writes.
 */

import { existsSync, readFileSync } from "node:fs";

import {
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
} from "@/lib/retailers/launch-buy-links";
import {
  tryLoadSupabaseRetailerLinksBySlugV1,
  type SupabaseLinksBySlugResultV1,
  type SupabaseRetailerLinkRowV1,
} from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import {
  RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_TARGET_URL_V1,
} from "./rpwfe-official-ge-browser-capture-v1";
import { RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1 } from "./rpwfe-official-ge-retailer-links-apply-v1";
import {
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CONTRACT_V1 =
  "rpwfe_official_ge_supabase_parity_plan_v1" as const;

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CC_JQ_PATH_V1 =
  ".command_center_v2.rpwfe_official_ge_supabase_parity_plan_v1" as const;

const FILTER_SLUG = "rpwfe" as const;
const RETAILER_KEY = "oem-parts-catalog" as const;
const SUPABASE_TABLE = "public.retailer_links" as const;

export type RpwfeRepoCsvStatusV1 =
  | "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP"
  | "REPO_ROW_MISSING"
  | "REPO_NOT_DIRECT_BUYABLE"
  | "REPO_INVALID_ROW_SHAPE";

export type RpwfeProposedSupabaseParityStatusV1 =
  | "READY_FOR_OWNER_SUPABASE_APPLY"
  | "SUPABASE_MATCHES_REPO_CSV"
  | "SUPABASE_DRIFT_FROM_REPO_CSV"
  | "BLOCKED_REPO_CSV_NOT_READY"
  | "UNKNOWN_LIVE_SUPABASE";

export type RpwfeOfficialGeSupabaseParityPlanLaneV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  recommended_jq_path: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CC_JQ_PATH_V1;
  filter_slug: typeof FILTER_SLUG;
  repo_csv_status: RpwfeRepoCsvStatusV1;
  proposed_supabase_parity_status: RpwfeProposedSupabaseParityStatusV1;
  proposed_url: typeof RPWFE_OFFICIAL_GE_TARGET_URL_V1 | null;
  proposed_retailer_name: string | null;
  proposed_retailer_key: typeof RETAILER_KEY | null;
  proposed_browser_truth_classification: "direct_buyable" | null;
  evidence_artifact_path: typeof RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1;
  csv_apply_run_artifact_path: typeof RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1;
  supabase_target_table: typeof SUPABASE_TABLE;
  live_supabase_truth_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  repo_csv_row: RetailerLinkCsvRowV1 | null;
  proposed_supabase_row_preview: {
    filter_slug: typeof FILTER_SLUG;
    retailer_key: typeof RETAILER_KEY;
    affiliate_url: string;
    is_primary: true;
    browser_truth_classification: "direct_buyable";
    browser_truth_notes: string | null;
    browser_truth_checked_at: string | null;
    label_subtype: "official_manufacturer_official_ge";
    customer_visible_label: "BuckParts Verified Link";
  } | null;
  live_supabase_primary_row_preview: SupabaseRetailerLinkRowV1 | null;
  parity_action_preview: "update_existing_primary_row" | "none_needed" | "blocked" | "unknown";
  owner_supabase_apply_required: true;
  supabase_mutation_authorized: false;
  csv_apply_authorized: false;
  evidence_write_authorized: false;
  public_ui_mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  buckparts_verified_link_authorized: false;
  repo_proven_verified_link_candidate_only: true;
  waterdrop_in_plan: false;
  amazon_in_plan: false;
  compatible_replacement_in_plan: false;
  blockers: string[];
  next_recommended_action: string;
};

const BASE_BLOCKERS = [
  "owner_supabase_apply_approval_missing",
  "supabase_apply_not_authorized",
  "live_page_not_revalidated_after_supabase_parity",
] as const;

function findRpwfePrimaryRow(rows: readonly RetailerLinkCsvRowV1[]): RetailerLinkCsvRowV1 | null {
  const slugRows = rows.filter((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG);
  if (slugRows.length !== 1) return slugRows[0] ?? null;
  return (
    slugRows.find((r) => r.retailer_key?.trim().toLowerCase() === RETAILER_KEY) ?? slugRows[0] ?? null
  );
}

function classifyRepoCsv(row: RetailerLinkCsvRowV1 | null): RpwfeRepoCsvStatusV1 {
  if (!row) return "REPO_ROW_MISSING";
  if (row.filter_slug?.trim().toLowerCase() !== FILTER_SLUG) return "REPO_INVALID_ROW_SHAPE";
  if (row.retailer_key?.trim().toLowerCase() !== RETAILER_KEY) return "REPO_INVALID_ROW_SHAPE";
  const url = row.affiliate_url?.trim() ?? "";
  const classification = row.browser_truth_classification?.trim() ?? "";
  const linkRow = { ...row, affiliate_url: url };
  if (
    url === RPWFE_OFFICIAL_GE_TARGET_URL_V1 &&
    classification === "direct_buyable" &&
    isDirectBuyableSafeCtaRow(linkRow) &&
    !isManufacturerSiteSearchUrl(url)
  ) {
    return "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP";
  }
  if (classification !== "direct_buyable" || isManufacturerSiteSearchUrl(url)) {
    return "REPO_NOT_DIRECT_BUYABLE";
  }
  return "REPO_INVALID_ROW_SHAPE";
}

function findSupabasePrimaryRow(
  supabase: SupabaseLinksBySlugResultV1,
): SupabaseRetailerLinkRowV1 | null {
  if (supabase.status !== "CHECKED") return null;
  const rows = supabase.links_by_slug.get(FILTER_SLUG) ?? [];
  if (rows.length === 0) return null;
  return (
    rows.find((r) => (r.retailer_key ?? "").trim().toLowerCase() === RETAILER_KEY) ??
    rows.find((r) => r.is_primary === true) ??
    rows[0] ??
    null
  );
}

function supabaseMatchesRepoPreview(
  live: SupabaseRetailerLinkRowV1 | null,
  preview: NonNullable<RpwfeOfficialGeSupabaseParityPlanLaneV1["proposed_supabase_row_preview"]>,
): boolean {
  if (!live) return false;
  return (
    (live.retailer_key ?? "").trim().toLowerCase() === preview.retailer_key &&
    live.affiliate_url.trim() === preview.affiliate_url &&
    (live.browser_truth_classification ?? "").trim() === preview.browser_truth_classification &&
    live.is_primary === true
  );
}

export function buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1(args: {
  repoCsvRow: RetailerLinkCsvRowV1 | null;
  supabase: SupabaseLinksBySlugResultV1;
}): RpwfeOfficialGeSupabaseParityPlanLaneV1 {
  const repoStatus = classifyRepoCsv(args.repoCsvRow);
  const liveStatus =
    args.supabase.status === "CHECKED" ? "CHECKED" : "UNKNOWN_DB_UNAVAILABLE";
  const livePrimary = findSupabasePrimaryRow(args.supabase);

  const preview =
    repoStatus === "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP" && args.repoCsvRow
      ? {
          filter_slug: FILTER_SLUG,
          retailer_key: RETAILER_KEY,
          affiliate_url: RPWFE_OFFICIAL_GE_TARGET_URL_V1,
          is_primary: true as const,
          browser_truth_classification: "direct_buyable" as const,
          browser_truth_notes: args.repoCsvRow.browser_truth_notes?.trim() || null,
          browser_truth_checked_at: args.repoCsvRow.browser_truth_checked_at?.trim() || null,
          label_subtype: "official_manufacturer_official_ge" as const,
          customer_visible_label: "BuckParts Verified Link" as const,
        }
      : null;

  let proposedStatus: RpwfeProposedSupabaseParityStatusV1;
  let parityAction: RpwfeOfficialGeSupabaseParityPlanLaneV1["parity_action_preview"];

  if (repoStatus !== "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP") {
    proposedStatus = "BLOCKED_REPO_CSV_NOT_READY";
    parityAction = "blocked";
  } else if (liveStatus === "UNKNOWN_DB_UNAVAILABLE") {
    proposedStatus = "UNKNOWN_LIVE_SUPABASE";
    parityAction = "unknown";
  } else if (preview && supabaseMatchesRepoPreview(livePrimary, preview)) {
    proposedStatus = "SUPABASE_MATCHES_REPO_CSV";
    parityAction = "none_needed";
  } else {
    proposedStatus = livePrimary
      ? "SUPABASE_DRIFT_FROM_REPO_CSV"
      : "READY_FOR_OWNER_SUPABASE_APPLY";
    parityAction = "update_existing_primary_row";
  }

  const blockers: string[] = [...BASE_BLOCKERS];
  if (repoStatus === "REPO_ROW_MISSING") blockers.push("repo_csv_rpwfe_row_missing");
  if (repoStatus === "REPO_NOT_DIRECT_BUYABLE") blockers.push("repo_csv_not_direct_buyable");
  if (repoStatus === "REPO_INVALID_ROW_SHAPE") blockers.push("repo_csv_invalid_row_shape");
  if (liveStatus === "UNKNOWN_DB_UNAVAILABLE") blockers.push("live_supabase_state_unknown");

  let next_recommended_action: string;
  if (repoStatus !== "REPO_DIRECT_BUYABLE_OFFICIAL_GE_SPEC_PDP") {
    next_recommended_action =
      "Blocked: repo CSV is not a direct_buyable official GE spec PDP for rpwfe. Do not plan Supabase parity.";
  } else if (proposedStatus === "SUPABASE_MATCHES_REPO_CSV") {
    next_recommended_action =
      "Repo CSV and live Supabase appear aligned for rpwfe. Owner must still approve explicit Supabase apply/revalidation workflow before treating live page as proven.";
  } else if (proposedStatus === "UNKNOWN_LIVE_SUPABASE") {
    next_recommended_action =
      "Repo CSV is ready. Read live public.retailer_links for rpwfe (read-only) before owner Supabase apply — this lane does not mutate Supabase.";
  } else {
    next_recommended_action =
      "Owner review: apply repo-proven rpwfe official GE row to public.retailer_links only after explicit Supabase apply approval. Revalidate /filter/rpwfe after parity.";
  }

  return {
    contract: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    recommended_jq_path: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_PLAN_CC_JQ_PATH_V1,
    filter_slug: FILTER_SLUG,
    repo_csv_status: repoStatus,
    proposed_supabase_parity_status: proposedStatus,
    proposed_url: preview ? RPWFE_OFFICIAL_GE_TARGET_URL_V1 : null,
    proposed_retailer_name: args.repoCsvRow?.retailer_name?.trim() || null,
    proposed_retailer_key: preview ? RETAILER_KEY : null,
    proposed_browser_truth_classification: preview ? "direct_buyable" : null,
    evidence_artifact_path: RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
    csv_apply_run_artifact_path: RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1,
    supabase_target_table: SUPABASE_TABLE,
    live_supabase_truth_status: liveStatus,
    repo_csv_row: args.repoCsvRow,
    proposed_supabase_row_preview: preview,
    live_supabase_primary_row_preview: livePrimary,
    parity_action_preview: parityAction,
    owner_supabase_apply_required: true,
    supabase_mutation_authorized: false,
    csv_apply_authorized: false,
    evidence_write_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    buckparts_verified_link_authorized: false,
    repo_proven_verified_link_candidate_only: true,
    waterdrop_in_plan: false,
    amazon_in_plan: false,
    compatible_replacement_in_plan: false,
    blockers,
    next_recommended_action,
  };
}

export async function buildRpwfeOfficialGeSupabaseParityPlanLaneV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  loadSupabase?: (slugs: string[]) => Promise<SupabaseLinksBySlugResultV1>;
}): Promise<RpwfeOfficialGeSupabaseParityPlanLaneV1> {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const loadSupabase = args.loadSupabase ?? tryLoadSupabaseRetailerLinksBySlugV1;

  const rows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText: readTextFile,
  });
  const repoCsvRow = findRpwfePrimaryRow(rows);
  const supabase = await loadSupabase([FILTER_SLUG]);

  return buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
    repoCsvRow,
    supabase,
  });
}
