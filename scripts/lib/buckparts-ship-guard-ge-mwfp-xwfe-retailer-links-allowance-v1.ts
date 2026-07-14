/**
 * Ship-guard allowance: recognize the exact founder-approved GE MWFP/XWFE
 * retailer_links.csv closeout (2 existing-primary updates only). Fail closed
 * otherwise — does not weaken global retailer_links protection.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-closable-mwfp-xwfe-apply-plan-owner-review-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
  type GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-owner-browser-proof-result-packet-v1";

const PROTECTED_RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;
export const GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1 =
  "buckparts_ship_guard_ge_mwfp_xwfe_retailer_links_approved_closeout_allowance_v1" as const;

export const GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1 = [
  "smartwater-mwfp",
  "xwfe",
] as const;

export const GE_MWFP_XWFE_ALLOWED_CHANGED_FIELDS_V1 = [
  "retailer_name",
  "affiliate_url",
  "browser_truth_classification",
  "browser_truth_notes",
  "browser_truth_checked_at",
] as const;

type CsvRow = Record<string, string>;

export type GeMwfpXwfeRetailerLinksShipGuardAllowanceV1 = {
  contract: typeof GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1;
  status: "NOT_APPLICABLE" | "ALLOWED" | "BLOCKED";
  retailer_links_dirty: boolean;
  closeout_present: boolean;
  approval_present: boolean;
  blockers: string[];
  proven_facts: string[];
  allowed_filters: readonly string[];
  pages_claimed_closed: false;
  conversion_claimed: false;
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function parseCsvRows(text: string): CsvRow[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CsvRow[];
}

function rowKey(row: CsvRow, index: number): string {
  const slug = normalizeSlug(row.filter_slug ?? "");
  const primary = String(row.is_primary ?? "").trim().toLowerCase() === "true" ? "1" : "0";
  const key = (row.retailer_key ?? "").trim().toLowerCase();
  return `${slug}|${primary}|${key}|${String(index)}`;
}

function primaryByFilter(rows: CsvRow[]): Map<string, CsvRow> {
  const map = new Map<string, CsvRow>();
  for (const row of rows) {
    const slug = normalizeSlug(row.filter_slug ?? "");
    if (!slug) continue;
    if (String(row.is_primary ?? "").trim().toLowerCase() === "true") {
      map.set(slug, row);
    }
  }
  return map;
}

function serializeComparable(row: CsvRow | undefined): string {
  if (!row) return "";
  const keys = [
    "filter_slug",
    "retailer_name",
    "affiliate_url",
    "is_primary",
    "sort_order",
    "retailer_key",
    "browser_truth_classification",
    "browser_truth_notes",
    "browser_truth_checked_at",
  ];
  return keys.map((k) => `${k}=${(row[k] ?? "").trim()}`).join("\n");
}

function fieldDiffs(before: CsvRow, after: CsvRow): string[] {
  const keys = [
    "filter_slug",
    "retailer_name",
    "affiliate_url",
    "is_primary",
    "sort_order",
    "retailer_key",
    "browser_truth_classification",
    "browser_truth_notes",
    "browser_truth_checked_at",
  ];
  return keys.filter((k) => (before[k] ?? "").trim() !== (after[k] ?? "").trim());
}

export type AssessGeMwfpXwfeAllowanceDepsV1 = {
  rootDir: string;
  retailerLinksDirty: boolean;
  /** HEAD (pre-mutation) CSV text; when dirty, required for exact-diff check. */
  headCsvText?: string | null;
  workingCsvText?: string | null;
  readText?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
};

type GeMwfpXwfeCloseoutDocV1 = {
  apply_status?: string;
  rows_updated?: number;
  updated_filter_slugs?: string[];
  inserts?: number;
  deletes?: number;
  xwf_mutated?: boolean;
  supabase_mutated?: boolean;
  pages_claimed_closed?: boolean;
  buyer_path_claimed_closed?: boolean;
  approval_decision_id?: string;
  planned_updates?: Array<{
    filter_slug?: string;
    after_affiliate_url?: string;
    after_retailer_name?: string;
    after_browser_truth_classification?: string;
    changed_fields?: string[];
  }>;
};

export function assessGeMwfpXwfeApprovedRetailerLinksCloseoutAllowanceV1(
  deps: AssessGeMwfpXwfeAllowanceDepsV1,
): GeMwfpXwfeRetailerLinksShipGuardAllowanceV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const blockers: string[] = [];
  const proven_facts: string[] = [];

  if (!deps.retailerLinksDirty) {
    return {
      contract: GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
      status: "NOT_APPLICABLE",
      retailer_links_dirty: false,
      closeout_present: false,
      approval_present: false,
      blockers: [],
      proven_facts: [
        "PROVEN: data/retailer_links.csv not dirty — GE MWFP/XWFE closeout allowance not applicable.",
      ],
      allowed_filters: GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1,
      pages_claimed_closed: false,
      conversion_claimed: false,
    };
  }

  const closeoutRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1;
  const approvalRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_JSON_REL_V1;
  const closeoutAbs = path.join(deps.rootDir, closeoutRel);
  const approvalAbs = path.join(deps.rootDir, approvalRel);
  const closeout_present = fileExists(closeoutAbs);
  const approval_present = fileExists(approvalAbs);

  if (!closeout_present) blockers.push("ge_mwfp_xwfe_closeout_missing");
  if (!approval_present) blockers.push("ge_mwfp_xwfe_approval_missing");

  let closeout: GeMwfpXwfeCloseoutDocV1 | null = null;

  if (closeout_present) {
    try {
      closeout = JSON.parse(readText(closeoutAbs)) as GeMwfpXwfeCloseoutDocV1;
    } catch {
      blockers.push("ge_mwfp_xwfe_closeout_unreadable");
    }
  }

  if (closeout) {
    if (closeout.apply_status !== "APPLIED") blockers.push("ge_mwfp_xwfe_closeout_not_applied");
    if (closeout.rows_updated !== 2) blockers.push("ge_mwfp_xwfe_closeout_rows_updated_not_2");
    if (closeout.inserts !== 0) blockers.push("ge_mwfp_xwfe_closeout_inserts_not_0");
    if (closeout.deletes !== 0) blockers.push("ge_mwfp_xwfe_closeout_deletes_not_0");
    if (closeout.xwf_mutated !== false) blockers.push("ge_mwfp_xwfe_closeout_xwf_mutated");
    if (closeout.supabase_mutated !== false) {
      blockers.push("ge_mwfp_xwfe_closeout_supabase_mutated");
    }
    if (closeout.pages_claimed_closed !== false) {
      blockers.push("ge_mwfp_xwfe_closeout_pages_claimed_closed");
    }
    if (closeout.buyer_path_claimed_closed !== false) {
      blockers.push("ge_mwfp_xwfe_closeout_buyer_path_claimed_closed");
    }
    if (
      closeout.approval_decision_id !==
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1
    ) {
      blockers.push("ge_mwfp_xwfe_closeout_approval_decision_id_mismatch");
    }
    const slugs = [...(closeout.updated_filter_slugs ?? [])].map(normalizeSlug).sort();
    if (slugs.length !== 2 || slugs[0] !== "smartwater-mwfp" || slugs[1] !== "xwfe") {
      blockers.push("ge_mwfp_xwfe_closeout_filter_scope_mismatch");
    }
    if ((closeout.updated_filter_slugs ?? []).map(normalizeSlug).includes("xwf")) {
      blockers.push("ge_mwfp_xwfe_closeout_includes_xwf");
    }
  }

  if (approval_present) {
    try {
      const approval = JSON.parse(
        readText(approvalAbs),
      ) as GeMwfpXwfeRetailerLinksOwnerApprovalRegistryDocV1;
      const row = approval.rows?.[0];
      if (!row) {
        blockers.push("ge_mwfp_xwfe_approval_row_missing");
      } else {
        if (row.decision_status !== "approved") {
          blockers.push("ge_mwfp_xwfe_approval_not_approved");
        }
        if (row.allowed_next_scope !== "owner_mutation_approved") {
          blockers.push("ge_mwfp_xwfe_approval_scope_mismatch");
        }
        if (
          row.decision_id !==
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_DECISION_ID_V1
        ) {
          blockers.push("ge_mwfp_xwfe_approval_decision_id_mismatch");
        }
        const ctx =
          row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_owner_approval_context_v1;
        if (!ctx || ctx.xwf_promotion_authorized !== false) {
          blockers.push("ge_mwfp_xwfe_approval_xwf_promotion_not_false");
        }
        if (ctx && (ctx.approved_inserts !== 0 || ctx.approved_deletes !== 0)) {
          blockers.push("ge_mwfp_xwfe_approval_insert_or_delete_not_zero");
        }
        if (ctx && ctx.approved_updates !== 2) {
          blockers.push("ge_mwfp_xwfe_approval_updates_not_2");
        }

        // Re-verify bound sha256 for plan + proof still match committed files.
        const planRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_CLOSABLE_APPLY_PLAN_JSON_REL_V1;
        const proofRel = BUCKPARTS_FRIDGE_MODEL_PDP_OWNER_BROWSER_PROOF_RESULT_JSON_REL_V1;
        if (!fileExists(path.join(deps.rootDir, planRel))) {
          blockers.push("ge_mwfp_xwfe_bound_plan_missing");
        } else {
          const planSha = sha256Text(readText(path.join(deps.rootDir, planRel)));
          const bound = (row.bound_artifacts_v1 ?? []).find(
            (b) => b.artifact_rel_path === planRel,
          );
          if (!bound || bound.sha256_at_binding !== planSha) {
            blockers.push("ge_mwfp_xwfe_approval_plan_sha256_mismatch");
          }
        }
        if (!fileExists(path.join(deps.rootDir, proofRel))) {
          blockers.push("ge_mwfp_xwfe_bound_proof_missing");
        } else {
          const proofSha = sha256Text(readText(path.join(deps.rootDir, proofRel)));
          const bound = (row.bound_artifacts_v1 ?? []).find(
            (b) => b.artifact_rel_path === proofRel,
          );
          if (!bound || bound.sha256_at_binding !== proofSha) {
            blockers.push("ge_mwfp_xwfe_approval_proof_sha256_mismatch");
          }
        }
      }
    } catch {
      blockers.push("ge_mwfp_xwfe_approval_unreadable");
    }
  }

  const workingCsv =
    deps.workingCsvText ??
    (fileExists(path.join(deps.rootDir, PROTECTED_RETAILER_LINKS_CSV_REL))
      ? readText(path.join(deps.rootDir, PROTECTED_RETAILER_LINKS_CSV_REL))
      : null);
  const headCsv = deps.headCsvText ?? null;

  if (!workingCsv) blockers.push("ge_mwfp_xwfe_working_csv_missing");
  if (!headCsv) blockers.push("ge_mwfp_xwfe_head_csv_unavailable");

  if (workingCsv && headCsv) {
    const beforeRows = parseCsvRows(headCsv);
    const afterRows = parseCsvRows(workingCsv);
    if (beforeRows.length !== afterRows.length) {
      blockers.push(
        `ge_mwfp_xwfe_csv_row_count_changed:${String(beforeRows.length)}->${String(afterRows.length)}`,
      );
    }

    // Fail closed on reordered inserts of new filter_slugs set.
    const beforeSlugs = beforeRows.map((r) => normalizeSlug(r.filter_slug ?? "")).sort();
    const afterSlugs = afterRows.map((r) => normalizeSlug(r.filter_slug ?? "")).sort();
    if (JSON.stringify(beforeSlugs) !== JSON.stringify(afterSlugs)) {
      blockers.push("ge_mwfp_xwfe_csv_filter_slug_set_changed");
    }

    const beforePrimaries = primaryByFilter(beforeRows);
    const afterPrimaries = primaryByFilter(afterRows);

    const changedFilters: string[] = [];
    for (const slug of new Set([...beforePrimaries.keys(), ...afterPrimaries.keys()])) {
      const b = beforePrimaries.get(slug);
      const a = afterPrimaries.get(slug);
      if (serializeComparable(b) !== serializeComparable(a)) changedFilters.push(slug);
    }
    changedFilters.sort();

    if (
      changedFilters.length !== 2 ||
      changedFilters[0] !== "smartwater-mwfp" ||
      changedFilters[1] !== "xwfe"
    ) {
      blockers.push(`ge_mwfp_xwfe_csv_changed_filters_not_exact:${changedFilters.join(",")}`);
    }
    if (changedFilters.includes("xwf")) {
      blockers.push("ge_mwfp_xwfe_csv_xwf_changed");
    }

    for (const filter of GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1) {
      const before = beforePrimaries.get(filter);
      const after = afterPrimaries.get(filter);
      if (!before || !after) {
        blockers.push(`ge_mwfp_xwfe_csv_primary_missing:${filter}`);
        continue;
      }
      const diffs = fieldDiffs(before, after);
      for (const field of diffs) {
        if (
          !(GE_MWFP_XWFE_ALLOWED_CHANGED_FIELDS_V1 as readonly string[]).includes(field)
        ) {
          blockers.push(`ge_mwfp_xwfe_csv_disallowed_field_change:${filter}:${field}`);
        }
      }
      const expectedUrl =
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
      if ((after.affiliate_url ?? "").trim() !== expectedUrl) {
        blockers.push(`ge_mwfp_xwfe_csv_url_mismatch:${filter}`);
      }
      if ((after.retailer_name ?? "").trim() !== "GE Appliance Parts") {
        blockers.push(`ge_mwfp_xwfe_csv_retailer_name_mismatch:${filter}`);
      }
      if ((after.retailer_key ?? "").trim() !== "oem-parts-catalog") {
        blockers.push(`ge_mwfp_xwfe_csv_retailer_key_mismatch:${filter}`);
      }
      if ((after.browser_truth_classification ?? "").trim() !== "direct_buyable") {
        blockers.push(`ge_mwfp_xwfe_csv_browser_truth_mismatch:${filter}`);
      }
      if ((after.is_primary ?? "").trim().toLowerCase() !== "true") {
        blockers.push(`ge_mwfp_xwfe_csv_is_primary_not_true:${filter}`);
      }

      const planned = closeout?.planned_updates?.find(
        (u) => normalizeSlug(u.filter_slug ?? "") === filter,
      );
      if (planned?.after_affiliate_url && planned.after_affiliate_url !== expectedUrl) {
        blockers.push(`ge_mwfp_xwfe_closeout_url_mismatch:${filter}`);
      }
    }

    // Non-target rows must be byte-equal per index for all non-allowed filters.
    for (let i = 0; i < Math.min(beforeRows.length, afterRows.length); i++) {
      const b = beforeRows[i]!;
      const a = afterRows[i]!;
      const slug = normalizeSlug(b.filter_slug ?? "");
      if (
        (GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1 as readonly string[]).includes(slug)
      ) {
        continue;
      }
      if (serializeComparable(b) !== serializeComparable(a) || rowKey(b, i) !== rowKey(a, i)) {
        // Also compare raw by serializeComparable alone — rowKey includes index.
        if (serializeComparable(b) !== serializeComparable(a)) {
          blockers.push(`ge_mwfp_xwfe_csv_non_target_row_changed:${slug || `idx${String(i)}`}`);
        }
      }
    }

    // xwf must be unchanged explicitly.
    const xwfBefore = beforePrimaries.get("xwf");
    const xwfAfter = afterPrimaries.get("xwf");
    if (serializeComparable(xwfBefore) !== serializeComparable(xwfAfter)) {
      blockers.push("ge_mwfp_xwfe_csv_xwf_changed");
    }
  }

  if (blockers.length === 0) {
    proven_facts.push(
      "PROVEN: data/retailer_links.csv dirty diff matches founder-approved GE MWFP/XWFE closeout (exactly 2 primary updates; XWF unchanged; no inserts/deletes).",
    );
    proven_facts.push(
      "PROVEN: ship-guard allowance does not claim pages closed or conversion/revenue; CTA/go proof still independent.",
    );
    return {
      contract: GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
      status: "ALLOWED",
      retailer_links_dirty: true,
      closeout_present,
      approval_present,
      blockers: [],
      proven_facts,
      allowed_filters: GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1,
      pages_claimed_closed: false,
      conversion_claimed: false,
    };
  }

  return {
    contract: GE_MWFP_XWFE_RETAILER_LINKS_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
    status: "BLOCKED",
    retailer_links_dirty: true,
    closeout_present,
    approval_present,
    blockers,
    proven_facts: [
      "PROVEN: retailer_links.csv dirty but GE MWFP/XWFE approved-closeout allowance failed — protected-file block retained.",
    ],
    allowed_filters: GE_MWFP_XWFE_ALLOWED_FILTER_SLUGS_V1,
    pages_claimed_closed: false,
    conversion_claimed: false,
  };
}
