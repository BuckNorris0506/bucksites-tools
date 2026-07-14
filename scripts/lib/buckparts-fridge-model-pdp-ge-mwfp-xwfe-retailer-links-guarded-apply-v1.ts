/**
 * Guarded retailer_links CSV apply for approved GE MWFP/XWFE official GE PDP updates.
 * Dry-run by default. Write only with explicit --write when founder approval binds
 * exact plan/proof sha256. No inserts/deletes, no XWF, no Supabase.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  isSearchPlaceholderBuyLink,
} from "@/lib/retailers/launch-buy-links";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
  type GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1,
  type BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1,
} from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";
import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  applyGuardedCsvWritePlanToCsvTextV1,
  FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";
import {
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_guarded_apply_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-closeout-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-closeout-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_MD_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_MD_REL_V1,
  FRIDGE_RETAILER_LINKS_CSV_REL_V1,
] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_TARGET_FILTERS_V1 = [
  "smartwater-mwfp",
  "xwfe",
] as const;

const RETAILER_NAME = "GE Appliance Parts" as const;
const RETAILER_KEY = "oem-parts-catalog" as const;
const BROWSER_TRUTH = "direct_buyable" as const;
const CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const LABEL_SUBTYPE = "official_manufacturer_official_ge" as const;

export type GeMwfpXwfeGuardedApplyModeV1 = "dry_run" | "write";

export type GeMwfpXwfeGuardedApplyGateStatusV1 = {
  approval_packet_present: boolean;
  approval_decision_status_approved: boolean;
  approval_scope_owner_mutation_approved: boolean;
  approval_decision_id_matches: boolean;
  plan_sha256_matches_binding: boolean;
  proof_sha256_matches_binding: boolean;
  approved_filter_scope_exact: boolean;
  approved_urls_exact: boolean;
  existing_primary_rows_present: boolean;
  xwf_mutation_forbidden_held: boolean;
  inserts_forbidden_held: boolean;
  deletes_forbidden_held: boolean;
  all_gates_pass: boolean;
  blockers: string[];
};

export type GeMwfpXwfeGuardedApplyPlannedUpdateV1 = {
  filter_slug: string;
  row_index: number;
  change_kind: "update_existing_primary_row";
  before_affiliate_url: string | null;
  after_affiliate_url: string;
  before_retailer_name: string | null;
  after_retailer_name: typeof RETAILER_NAME;
  before_browser_truth_classification: string | null;
  after_browser_truth_classification: typeof BROWSER_TRUTH;
  after_browser_truth_checked_at: string;
  before_was_search_placeholder: boolean;
  changed_fields: string[];
};

export type GeMwfpXwfeGuardedApplyReportV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_SOURCE_COMMAND_V1;
  mode: GeMwfpXwfeGuardedApplyModeV1;
  data_mutation: boolean;
  apply_status: "DRY_RUN_READY" | "APPLIED" | "BLOCKED";
  csv_mutation_authorized: boolean;
  supabase_mutation_authorized: false;
  xwf_promotion_authorized: false;
  inserts_authorized: false;
  deletes_authorized: false;
  pages_claimed_closed: false;
  buyer_path_claimed_closed: false;
  conversion_claimed: false;
  target_csv_rel: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  approval_rel: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1;
  gates: GeMwfpXwfeGuardedApplyGateStatusV1;
  planned_updates: GeMwfpXwfeGuardedApplyPlannedUpdateV1[];
  planned_update_count: number;
  xwf_row_unchanged: boolean;
  non_target_rows_unchanged: boolean | null;
  closeout_written: boolean;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type GeMwfpXwfeGuardedApplyCloseoutV1 = {
  contract: "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_guarded_apply_closeout_v1";
  generated_at: string;
  parent_apply_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1;
  apply_status: "APPLIED";
  data_mutation: true;
  rows_updated: number;
  updated_filter_slugs: string[];
  pages_claimed_closed: false;
  buyer_path_claimed_closed: false;
  supabase_mutated: false;
  xwf_mutated: false;
  inserts: 0;
  deletes: 0;
  target_csv_rel: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  approval_decision_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1;
  planned_updates: GeMwfpXwfeGuardedApplyPlannedUpdateV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type RunGeMwfpXwfeGuardedApplyDepsV1 = {
  rootDir: string;
  mode: GeMwfpXwfeGuardedApplyModeV1;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
  writeText?: (abs: string, content: string) => void;
};

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(rootDir: string, rel: string, readText: (abs: string) => string): string {
  return sha256Text(readText(path.join(rootDir, rel)));
}

function sha256Rows(rows: readonly RetailerLinkCsvRowV1[]): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function isPrimary(row: RetailerLinkCsvRowV1): boolean {
  return String(row.is_primary ?? "").trim().toLowerCase() === "true";
}

function findPrimaryRowIndex(
  rows: readonly RetailerLinkCsvRowV1[],
  filter_slug: string,
): number {
  const slug = normalizeSlug(filter_slug);
  const indices = rows
    .map((r, i) => ({ r, i }))
    .filter(
      ({ r }) =>
        normalizeSlug(r.filter_slug ?? "") === slug &&
        (isPrimary(r) ||
          (r.retailer_key ?? "").trim().toLowerCase() === RETAILER_KEY),
    );
  const primary = indices.find(({ r }) => isPrimary(r));
  if (primary) return primary.i;
  if (indices.length === 1) return indices[0]!.i;
  return -1;
}

function buildAfterRow(args: {
  before: RetailerLinkCsvRowV1;
  filter_slug: string;
  url: string;
  checked_at: string;
}): { after: RetailerLinkCsvRowV1; changed_fields: string[] } {
  const after: RetailerLinkCsvRowV1 = { ...args.before };
  after.retailer_name = RETAILER_NAME;
  after.affiliate_url = args.url;
  after.is_primary = "true";
  after.retailer_key = RETAILER_KEY;
  after.browser_truth_classification = BROWSER_TRUTH;
  after.browser_truth_notes = [
    `GE MWFP/XWFE guarded CSV apply v1 for ${args.filter_slug};`,
    `owner browser proof ${BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1};`,
    `customer label ${CUSTOMER_LABEL} (${LABEL_SUBTYPE}).`,
  ].join(" ");
  after.browser_truth_checked_at = args.checked_at;
  const changed_fields: string[] = [];
  for (const key of FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1) {
    if ((args.before[key] ?? "") !== (after[key] ?? "")) changed_fields.push(key);
  }
  return { after, changed_fields };
}

export function runBuckpartsFridgeModelPdpGeMwfpXwfeRetailerLinksGuardedApplyV1(
  deps: RunGeMwfpXwfeGuardedApplyDepsV1,
): GeMwfpXwfeGuardedApplyReportV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const writeText =
    deps.writeText ??
    ((abs, content) => {
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
    });
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const blockers: string[] = [];

  const approvalRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1;
  const planRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
  const proofRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
  const csvRel = FRIDGE_RETAILER_LINKS_CSV_REL_V1;

  const approvalPresent = fileExists(path.join(deps.rootDir, approvalRel));
  const planPresent = fileExists(path.join(deps.rootDir, planRel));
  const proofPresent = fileExists(path.join(deps.rootDir, proofRel));
  const csvPresent = fileExists(path.join(deps.rootDir, csvRel));

  if (!approvalPresent) blockers.push("approval_packet_missing");
  if (!planPresent) blockers.push("owner_review_plan_missing");
  if (!proofPresent) blockers.push("owner_browser_proof_result_missing");
  if (!csvPresent) blockers.push("retailer_links_csv_missing");

  let approval: GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1 | null = null;
  let proof: BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1 | null = null;
  let planSha = "";
  let proofSha = "";
  let boundPlanSha = "";
  let boundProofSha = "";

  let approval_decision_status_approved = false;
  let approval_scope_owner_mutation_approved = false;
  let approval_decision_id_matches = false;
  let plan_sha256_matches_binding = false;
  let proof_sha256_matches_binding = false;
  let approved_filter_scope_exact = false;
  let approved_urls_exact = false;

  if (approvalPresent && planPresent && proofPresent) {
    approval = JSON.parse(
      readText(path.join(deps.rootDir, approvalRel)),
    ) as GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1;
    proof = JSON.parse(
      readText(path.join(deps.rootDir, proofRel)),
    ) as BuckpartsFridgeModelPdpOwnerBrowserProofResultPacketV1;
    planSha = sha256File(deps.rootDir, planRel, readText);
    proofSha = sha256File(deps.rootDir, proofRel, readText);

    const row = approval.rows?.[0];
    if (!row) {
      blockers.push("approval_row_missing");
    } else {
      approval_decision_status_approved = row.decision_status === "approved";
      approval_scope_owner_mutation_approved =
        row.allowed_next_scope === "owner_mutation_approved";
      approval_decision_id_matches =
        row.decision_id ===
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1;
      if (!approval_decision_status_approved) blockers.push("approval_decision_status_not_approved");
      if (!approval_scope_owner_mutation_approved) {
        blockers.push("approval_allowed_next_scope_not_owner_mutation_approved");
      }
      if (!approval_decision_id_matches) blockers.push("approval_decision_id_mismatch");

      const ctx =
        row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1;
      if (!ctx) {
        blockers.push("approval_context_missing");
      } else {
        if (ctx.xwf_promotion_authorized !== false) blockers.push("approval_xwf_promotion_not_false");
        if (ctx.approved_inserts !== 0) blockers.push("approval_inserts_not_zero");
        if (ctx.approved_deletes !== 0) blockers.push("approval_deletes_not_zero");
        if (ctx.approved_updates !== 2) blockers.push("approval_updates_not_two");
        if (ctx.supabase_mutation_authorized !== false) {
          blockers.push("approval_supabase_mutation_not_false");
        }

        const filters = [...(ctx.approved_filter_slugs ?? [])].map(normalizeSlug).sort();
        approved_filter_scope_exact =
          filters.length === 2 &&
          filters[0] === "smartwater-mwfp" &&
          filters[1] === "xwfe" &&
          !filters.includes("xwf");
        if (!approved_filter_scope_exact) blockers.push("approval_filter_scope_not_exact");

        const deltaByFilter = new Map(
          (ctx.approved_deltas ?? []).map((d) => [normalizeSlug(d.filter_slug), d]),
        );
        let urlsOk = true;
        for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_TARGET_FILTERS_V1) {
          const delta = deltaByFilter.get(filter);
          const expected =
            BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
          if (!delta || delta.proposed_affiliate_url !== expected) {
            urlsOk = false;
            blockers.push(`approval_url_mismatch:${filter}`);
          }
          if (delta && delta.change_kind !== "update_existing_primary_row") {
            blockers.push(`approval_change_kind_not_update:${filter}`);
          }
          if (delta && delta.proposed_retailer_name !== RETAILER_NAME) {
            blockers.push(`approval_retailer_name_mismatch:${filter}`);
          }
          if (delta && delta.proposed_retailer_key !== RETAILER_KEY) {
            blockers.push(`approval_retailer_key_mismatch:${filter}`);
          }
          if (delta && delta.proposed_browser_truth_classification !== BROWSER_TRUTH) {
            blockers.push(`approval_browser_truth_mismatch:${filter}`);
          }
        }
        if (deltaByFilter.has("xwf")) blockers.push("approval_includes_xwf_delta");
        approved_urls_exact = urlsOk && !blockers.some((b) => b.startsWith("approval_url_mismatch"));
      }

      for (const bound of row.bound_artifacts_v1 ?? []) {
        if (bound.artifact_rel_path === planRel) boundPlanSha = bound.sha256_at_binding;
        if (bound.artifact_rel_path === proofRel) boundProofSha = bound.sha256_at_binding;
      }
      plan_sha256_matches_binding = Boolean(boundPlanSha) && boundPlanSha === planSha;
      proof_sha256_matches_binding = Boolean(boundProofSha) && boundProofSha === proofSha;
      if (!plan_sha256_matches_binding) blockers.push("approval_plan_sha256_mismatch");
      if (!proof_sha256_matches_binding) blockers.push("approval_proof_sha256_mismatch");
    }

    for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_TARGET_FILTERS_V1) {
      const frow = (proof.filter_rows ?? []).find(
        (r) => normalizeSlug(r.filter_slug) === filter,
      );
      if (!frow || frow.classification !== "OWNER_BROWSER_PASS" || !frow.clean_direct_buy_pass) {
        blockers.push(`owner_browser_proof_not_pass:${filter}`);
      }
    }
  }

  const rowsBefore = csvPresent
    ? loadFridgeRetailerLinksCsvRowsV1({
        rootDir: deps.rootDir,
        fileExists,
        readText,
      })
    : [];

  const checkedAt = proof?.generated_at?.trim() || generated_at;
  const planned_updates: GeMwfpXwfeGuardedApplyPlannedUpdateV1[] = [];
  const afterByIndex = new Map<number, RetailerLinkCsvRowV1>();

  let existing_primary_rows_present = true;
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_TARGET_FILTERS_V1) {
    const idx = findPrimaryRowIndex(rowsBefore, filter);
    if (idx < 0) {
      existing_primary_rows_present = false;
      blockers.push(`existing_primary_row_missing:${filter}`);
      continue;
    }
    const before = rowsBefore[idx]!;
    const url =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
    const { after, changed_fields } = buildAfterRow({
      before,
      filter_slug: filter,
      url,
      checked_at: checkedAt,
    });
    afterByIndex.set(idx, after);
    planned_updates.push({
      filter_slug: filter,
      row_index: idx,
      change_kind: "update_existing_primary_row",
      before_affiliate_url: before.affiliate_url?.trim() || null,
      after_affiliate_url: url,
      before_retailer_name: before.retailer_name?.trim() || null,
      after_retailer_name: RETAILER_NAME,
      before_browser_truth_classification:
        before.browser_truth_classification?.trim() || null,
      after_browser_truth_classification: BROWSER_TRUTH,
      after_browser_truth_checked_at: checkedAt,
      before_was_search_placeholder: isSearchPlaceholderBuyLink(
        before.retailer_key,
        before.affiliate_url ?? "",
      ),
      changed_fields,
    });
  }

  // Fail closed: never plan xwf.
  const xwfIndex = findPrimaryRowIndex(rowsBefore, "xwf");
  const xwfBefore =
    xwfIndex >= 0 ? JSON.stringify(rowsBefore[xwfIndex]) : null;
  if (planned_updates.some((u) => u.filter_slug === "xwf")) {
    blockers.push("planned_updates_include_xwf");
  }
  if (afterByIndex.has(xwfIndex) && xwfIndex >= 0) {
    blockers.push("xwf_row_targeted_for_mutation");
  }

  if (planned_updates.length !== 2 && blockers.length === 0) {
    blockers.push(`planned_update_count_not_two:${String(planned_updates.length)}`);
  }

  const inserts_forbidden_held = true;
  const deletes_forbidden_held = true;
  const xwf_mutation_forbidden_held =
    !planned_updates.some((u) => u.filter_slug === "xwf") &&
    !blockers.includes("planned_updates_include_xwf") &&
    !blockers.includes("xwf_row_targeted_for_mutation") &&
    !blockers.includes("approval_includes_xwf_delta");

  const all_gates_pass = blockers.length === 0;
  const gates: GeMwfpXwfeGuardedApplyGateStatusV1 = {
    approval_packet_present: approvalPresent,
    approval_decision_status_approved,
    approval_scope_owner_mutation_approved,
    approval_decision_id_matches,
    plan_sha256_matches_binding,
    proof_sha256_matches_binding,
    approved_filter_scope_exact,
    approved_urls_exact,
    existing_primary_rows_present,
    xwf_mutation_forbidden_held,
    inserts_forbidden_held,
    deletes_forbidden_held,
    all_gates_pass,
    blockers: [...blockers],
  };

  let apply_status: GeMwfpXwfeGuardedApplyReportV1["apply_status"] = all_gates_pass
    ? deps.mode === "write"
      ? "APPLIED"
      : "DRY_RUN_READY"
    : "BLOCKED";

  let data_mutation = false;
  let closeout_written = false;
  let non_target_rows_unchanged: boolean | null = null;
  let xwf_row_unchanged = true;

  const targetIndices = new Set(planned_updates.map((u) => u.row_index));
  const nonTargetBefore = rowsBefore.filter((_, i) => !targetIndices.has(i));
  const nonTargetHashBefore = sha256Rows(nonTargetBefore);

  if (all_gates_pass && deps.mode === "write") {
    const rowsAfter = rowsBefore.map((r, i) =>
      afterByIndex.has(i) ? afterByIndex.get(i)! : { ...r },
    );
    if (rowsAfter.length !== rowsBefore.length) {
      blockers.push("row_count_changed_insert_or_delete");
      apply_status = "BLOCKED";
      gates.blockers = [...blockers];
      gates.all_gates_pass = false;
    } else {
      const csvAbs = path.join(deps.rootDir, csvRel);
      const csvText = readText(csvAbs);
      const nextCsv = applyGuardedCsvWritePlanToCsvTextV1({
        csvText,
        headers: FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
        rows: rowsAfter,
        targetRowIndices: [...targetIndices],
      });
      writeText(csvAbs, nextCsv);
      data_mutation = true;

      const rowsReloaded = loadFridgeRetailerLinksCsvRowsV1({
        rootDir: deps.rootDir,
        fileExists,
        readText,
      });
      if (rowsReloaded.length !== rowsBefore.length) {
        blockers.push("post_write_row_count_changed");
        apply_status = "BLOCKED";
      }
      const nonTargetAfter = rowsReloaded.filter((_, i) => !targetIndices.has(i));
      non_target_rows_unchanged = sha256Rows(nonTargetAfter) === nonTargetHashBefore;
      if (!non_target_rows_unchanged) {
        blockers.push("non_target_rows_changed");
        apply_status = "BLOCKED";
      }

      if (xwfIndex >= 0) {
        xwf_row_unchanged =
          JSON.stringify(rowsReloaded[xwfIndex]) === xwfBefore;
        if (!xwf_row_unchanged) {
          blockers.push("xwf_row_changed");
          apply_status = "BLOCKED";
        }
      }

      for (const update of planned_updates) {
        const applied = rowsReloaded[update.row_index];
        if (!applied || applied.affiliate_url?.trim() !== update.after_affiliate_url) {
          blockers.push(`post_write_url_mismatch:${update.filter_slug}`);
          apply_status = "BLOCKED";
        } else if (
          (applied.browser_truth_classification ?? "").trim() !== BROWSER_TRUTH ||
          (applied.retailer_name ?? "").trim() !== RETAILER_NAME
        ) {
          blockers.push(`post_write_fields_mismatch:${update.filter_slug}`);
          apply_status = "BLOCKED";
        }
      }

      if (apply_status === "APPLIED" && blockers.length === 0) {
        const closeout: GeMwfpXwfeGuardedApplyCloseoutV1 = {
          contract:
            "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_guarded_apply_closeout_v1",
          generated_at,
          parent_apply_contract:
            BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1,
          apply_status: "APPLIED",
          data_mutation: true,
          rows_updated: planned_updates.length,
          updated_filter_slugs: planned_updates.map((u) => u.filter_slug),
          pages_claimed_closed: false,
          buyer_path_claimed_closed: false,
          supabase_mutated: false,
          xwf_mutated: false,
          inserts: 0,
          deletes: 0,
          target_csv_rel: csvRel,
          approval_decision_id:
            BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
          planned_updates,
          proven_facts: [
            "PROVEN: retailer_links.csv updated for exactly smartwater-mwfp and xwfe primaries.",
            "PROVEN: xwf not mutated; inserts=0; deletes=0; supabase_mutated=false.",
            "PROVEN: pages_claimed_closed=false — model PDPs still need CTA/go proof rerun.",
          ],
          unknown_facts: [
            "UNKNOWN: live Supabase retailer_links parity until separate founder lane.",
            "UNKNOWN: conversion/revenue impact.",
          ],
        };
        writeText(
          path.join(
            deps.rootDir,
            BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
          ),
          `${JSON.stringify(closeout, null, 2)}\n`,
        );
        writeText(
          path.join(
            deps.rootDir,
            BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_MD_REL_V1,
          ),
          buildCloseoutMarkdownV1(closeout),
        );
        closeout_written = true;
      } else if (blockers.length > 0) {
        apply_status = "BLOCKED";
        gates.blockers = [...new Set([...gates.blockers, ...blockers])];
        gates.all_gates_pass = false;
      }
    }
  } else if (deps.mode === "write" && !all_gates_pass) {
    apply_status = "BLOCKED";
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CONTRACT_V1,
    generated_at,
    source_command: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_SOURCE_COMMAND_V1,
    mode: deps.mode,
    data_mutation,
    apply_status,
    csv_mutation_authorized: all_gates_pass && deps.mode === "write",
    supabase_mutation_authorized: false,
    xwf_promotion_authorized: false,
    inserts_authorized: false,
    deletes_authorized: false,
    pages_claimed_closed: false,
    buyer_path_claimed_closed: false,
    conversion_claimed: false,
    target_csv_rel: csvRel,
    approval_rel: approvalRel,
    gates,
    planned_updates,
    planned_update_count: planned_updates.length,
    xwf_row_unchanged,
    non_target_rows_unchanged,
    closeout_written,
    proven_facts: [
      `PROVEN: mode=${deps.mode}; data_mutation=${String(data_mutation)}; apply_status=${apply_status}.`,
      `PROVEN: all_gates_pass=${String(gates.all_gates_pass)}; planned_updates=${String(planned_updates.length)}.`,
      "PROVEN: inserts_authorized=false; deletes_authorized=false; xwf_promotion_authorized=false; supabase_mutation_authorized=false.",
      "PROVEN: pages_claimed_closed=false; buyer_path_claimed_closed=false; conversion_claimed=false.",
    ],
    unknown_facts: [
      "UNKNOWN: production buyer-path closure for the 4 model PDPs until CTA/go proof rerun.",
      "UNKNOWN: Supabase retailer_links parity (not in this lane).",
    ],
    risk_notes: [
      "Dry-run default — pass --write only after reviewing gates.all_gates_pass=true.",
      "Do not claim model pages closed from CSV apply alone.",
      "XWF remains out of scope.",
    ],
  };
}

function buildCloseoutMarkdownV1(closeout: GeMwfpXwfeGuardedApplyCloseoutV1): string {
  const lines = [
    "# GE MWFP/XWFE retailer_links guarded apply closeout v1",
    "",
    `Generated: ${closeout.generated_at}`,
    "",
    `- apply_status: **${closeout.apply_status}**`,
    `- rows_updated: **${String(closeout.rows_updated)}**`,
    `- pages_claimed_closed: **false**`,
    `- xwf_mutated: **false**`,
    `- inserts/deletes: **0/0**`,
    "",
    "## Updated filters",
    "",
  ];
  for (const u of closeout.planned_updates) {
    lines.push(
      `- \`${u.filter_slug}\`: \`${u.before_affiliate_url ?? ""}\` → \`${u.after_affiliate_url}\``,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function buildBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyMarkdownV1(
  report: GeMwfpXwfeGuardedApplyReportV1,
): string {
  const lines = [
    "# GE MWFP/XWFE retailer_links guarded apply v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `- mode: **${report.mode}**`,
    `- apply_status: **${report.apply_status}**`,
    `- data_mutation: **${String(report.data_mutation)}**`,
    `- all_gates_pass: **${String(report.gates.all_gates_pass)}**`,
    `- pages_claimed_closed: **false**`,
    "",
    "## Gates",
    "",
  ];
  for (const [k, v] of Object.entries(report.gates)) {
    if (k === "blockers") continue;
    lines.push(`- ${k}: **${String(v)}**`);
  }
  if (report.gates.blockers.length) {
    lines.push("");
    lines.push("Blockers:");
    for (const b of report.gates.blockers) lines.push(`- ${b}`);
  }
  lines.push("");
  lines.push("## Planned updates");
  lines.push("");
  lines.push("| filter | before URL | after URL | search_placeholder_before |");
  lines.push("|---|---|---|---|");
  for (const u of report.planned_updates) {
    lines.push(
      `| ${u.filter_slug} | \`${u.before_affiliate_url ?? ""}\` | \`${u.after_affiliate_url}\` | ${String(u.before_was_search_placeholder)} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyArtifactsV1(args: {
  rootDir: string;
  report: GeMwfpXwfeGuardedApplyReportV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_MD_REL_V1;
  mkdirSync(path.dirname(path.join(args.rootDir, jsonRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, jsonRel),
    `${JSON.stringify(args.report, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, mdRel),
    buildBuckpartsFridgeModelPdpGeMwfpXwfeGuardedApplyMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
