/**
 * Owner-authorized guarded CSV apply for RPWFE official GE spec PDP only.
 * Mutates data/retailer_links.csv for the single existing rpwfe oem-parts-catalog row.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  isSearchPlaceholderBuyLink,
} from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  loadRpwfeOfficialGeBrowserEvidenceArtifactV1,
  RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_TARGET_URL_V1,
} from "./rpwfe-official-ge-browser-capture-v1";
import {
  applyGuardedCsvWritePlanToCsvTextV1,
  FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
  rowMatchesSnapshotV1,
} from "./universal-batch-lifecycle-guarded-csv-apply-executor-write-v1";
import { FRIDGE_RETAILER_LINKS_CSV_REL_V1 } from "./fridge-buyer-path-batch-apply-plan-proposal-v1";
import {
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_CONTRACT_V1 =
  "rpwfe_official_ge_retailer_links_apply_v1" as const;

export const RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1 =
  "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-retailer-links-apply-run-v1.json" as const;

const FILTER_SLUG = "rpwfe" as const;
const RETAILER_KEY = "oem-parts-catalog" as const;
const BEFORE_SEARCH_URL =
  "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=RPWFE" as const;
const AFTER_RETAILER_NAME = "GE Appliance Parts" as const;
const CUSTOMER_LABEL = "BuckParts Verified Link" as const;
const LABEL_SUBTYPE = "official_manufacturer_official_ge" as const;

export type RpwfeOfficialGeRetailerLinksApplyRunV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_CONTRACT_V1;
  generated_at: string;
  mode: "apply" | "dry_run";
  data_mutation: boolean;
  owner_csv_apply_authorized: true;
  target_file: typeof FRIDGE_RETAILER_LINKS_CSV_REL_V1;
  filter_slug: typeof FILTER_SLUG;
  apply_status: "APPLIED" | "BLOCKED" | "DRY_RUN_READY";
  target_changed_count: number;
  non_target_rows_unchanged: boolean;
  browser_evidence_artifact_path: typeof RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1;
  proposed_customer_label: typeof CUSTOMER_LABEL;
  proposed_label_subtype: typeof LABEL_SUBTYPE;
  before_row: RetailerLinkCsvRowV1 | null;
  after_row: RetailerLinkCsvRowV1 | null;
  before_url_was_blocked_search_placeholder: boolean;
  after_url_is_official_ge_spec_pdp: boolean;
  waterdrop_row_added: false;
  amazon_row_added: false;
  compatible_replacement_row_added: false;
  post_apply_gate_failure_kind: string | null;
  post_apply_retailer_link_state: string | null;
  post_apply_is_direct_buyable_safe_cta: boolean;
  /** True when post-apply row still fails launch-buy-links gates (not blindly bypassed). */
  buckparts_verified_link_still_gated_by_safety_rules: boolean;
  buckparts_verified_link_blindly_authorized: false;
  blockers: string[];
  changed_fields: string[];
  rollback_row: RetailerLinkCsvRowV1 | null;
  non_rpwfe_row_hash_before: string;
  non_rpwfe_row_hash_after: string;
  notes: string[];
};

function sha256Rows(rows: readonly RetailerLinkCsvRowV1[]): string {
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function nonRpwfeRows(rows: readonly RetailerLinkCsvRowV1[]): RetailerLinkCsvRowV1[] {
  return rows.filter((r) => r.filter_slug?.trim().toLowerCase() !== FILTER_SLUG);
}

function findTargetRowIndex(rows: readonly RetailerLinkCsvRowV1[]): number {
  return rows.findIndex(
    (r) =>
      r.filter_slug?.trim().toLowerCase() === FILTER_SLUG &&
      r.retailer_key?.trim().toLowerCase() === RETAILER_KEY,
  );
}

function buildAfterRow(
  before: RetailerLinkCsvRowV1,
  checkedAt: string,
): { after: RetailerLinkCsvRowV1; changed_fields: string[] } {
  const after: RetailerLinkCsvRowV1 = { ...before };
  after.retailer_name = AFTER_RETAILER_NAME;
  after.affiliate_url = RPWFE_OFFICIAL_GE_TARGET_URL_V1;
  after.browser_truth_classification = "direct_buyable";
  after.browser_truth_notes = `RPWFE official GE guarded CSV apply v1; browser evidence ${RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1}; customer label ${CUSTOMER_LABEL} (${LABEL_SUBTYPE}).`;
  after.browser_truth_checked_at = checkedAt;
  const changed_fields: string[] = [];
  for (const key of FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1) {
    if ((before[key] ?? "") !== (after[key] ?? "")) changed_fields.push(key);
  }
  return { after, changed_fields };
}

export function executeRpwfeOfficialGeRetailerLinksApplyV1(args: {
  rootDir: string;
  apply: boolean;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  writeTextFile?: (abs: string, content: string) => void;
}): RpwfeOfficialGeRetailerLinksApplyRunV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const writeTextFile = args.writeTextFile ?? ((p: string, c: string) => writeFileSync(p, c, "utf8"));
  const generatedAt = new Date().toISOString();
  const csvAbs = path.join(args.rootDir, FRIDGE_RETAILER_LINKS_CSV_REL_V1);
  const blockers: string[] = [];

  const artifact = loadRpwfeOfficialGeBrowserEvidenceArtifactV1({
    rootDir: args.rootDir,
    fileExists,
    readTextFile,
  });
  if (!artifact || artifact.browser_truth_status !== "PASS") {
    blockers.push("browser_evidence_not_pass");
  }

  const rowsBefore = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText: readTextFile,
  });
  const targetIndex = findTargetRowIndex(rowsBefore);
  if (targetIndex === -1) blockers.push("rpwfe_oem_parts_catalog_row_missing");

  const rpwfeRows = rowsBefore.filter((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG);
  if (rpwfeRows.length !== 1) blockers.push(`rpwfe_row_count_not_one:${rpwfeRows.length}`);

  const beforeRow = targetIndex >= 0 ? { ...rowsBefore[targetIndex]! } : null;
  if (beforeRow) {
    if (beforeRow.affiliate_url?.trim() !== BEFORE_SEARCH_URL) {
      blockers.push("before_row_url_not_expected_blocked_search_placeholder");
    }
    if (!isSearchPlaceholderBuyLink(beforeRow.retailer_key, beforeRow.affiliate_url ?? "")) {
      blockers.push("before_row_not_search_placeholder");
    }
  }

  const nonTargetHashBefore = sha256Rows(nonRpwfeRows(rowsBefore));

  let afterRow: RetailerLinkCsvRowV1 | null = null;
  let changedFields: string[] = [];
  if (beforeRow && artifact) {
    const built = buildAfterRow(beforeRow, artifact.checked_at);
    afterRow = built.after;
    changedFields = built.changed_fields;
  }

  let applyStatus: RpwfeOfficialGeRetailerLinksApplyRunV1["apply_status"] =
    blockers.length === 0 ? (args.apply ? "APPLIED" : "DRY_RUN_READY") : "BLOCKED";

  let nonTargetUnchanged = true;
  let nonTargetHashAfter = nonTargetHashBefore;
  let postGate: string | null = null;
  let postState: string | null = null;
  let postSafeCta = false;

  if (blockers.length === 0 && args.apply && beforeRow && afterRow) {
    const csvText = readTextFile(csvAbs);
    const rowsAfter = rowsBefore.map((r, i) => (i === targetIndex ? afterRow! : { ...r }));
    const nextCsv = applyGuardedCsvWritePlanToCsvTextV1({
      csvText,
      headers: FRIDGE_RETAILER_LINKS_CSV_HEADER_COLUMNS_V1,
      rows: rowsAfter,
      targetRowIndices: [targetIndex],
    });
    writeTextFile(csvAbs, nextCsv);

    const rowsReloaded = loadFridgeRetailerLinksCsvRowsV1({
      rootDir: args.rootDir,
      fileExists,
      readText: readTextFile,
    });
    nonTargetHashAfter = sha256Rows(nonRpwfeRows(rowsReloaded));
    nonTargetUnchanged = nonTargetHashBefore === nonTargetHashAfter;

    const applied = rowsReloaded[targetIndex]!;
    postGate = buyLinkGateFailureKind(applied);
    postState = mapSignalsToRetailerLinkState({
      browserTruthClassification: applied.browser_truth_classification ?? null,
      gateFailureKind: postGate,
    });
    postSafeCta = isDirectBuyableSafeCtaRow(applied);
    if (!nonTargetUnchanged) blockers.push("non_target_rows_changed");
    if (applied.affiliate_url?.trim() !== RPWFE_OFFICIAL_GE_TARGET_URL_V1) {
      blockers.push("after_url_mismatch");
      applyStatus = "BLOCKED";
    }
  } else if (blockers.length === 0 && afterRow) {
    postGate = buyLinkGateFailureKind(afterRow);
    postState = mapSignalsToRetailerLinkState({
      browserTruthClassification: afterRow.browser_truth_classification ?? null,
      gateFailureKind: postGate,
    });
    postSafeCta = isDirectBuyableSafeCtaRow(afterRow);
  }

  const run: RpwfeOfficialGeRetailerLinksApplyRunV1 = {
    contract: RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_CONTRACT_V1,
    generated_at: generatedAt,
    mode: args.apply ? "apply" : "dry_run",
    data_mutation: args.apply && applyStatus === "APPLIED",
    owner_csv_apply_authorized: true,
    target_file: FRIDGE_RETAILER_LINKS_CSV_REL_V1,
    filter_slug: FILTER_SLUG,
    apply_status: applyStatus,
    target_changed_count: applyStatus === "APPLIED" ? 1 : 0,
    non_target_rows_unchanged: nonTargetUnchanged,
    browser_evidence_artifact_path: RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
    proposed_customer_label: CUSTOMER_LABEL,
    proposed_label_subtype: LABEL_SUBTYPE,
    before_row: beforeRow,
    after_row: afterRow,
    before_url_was_blocked_search_placeholder:
      beforeRow !== null &&
      isSearchPlaceholderBuyLink(beforeRow.retailer_key, beforeRow.affiliate_url ?? "") &&
      isManufacturerSiteSearchUrl(beforeRow.affiliate_url ?? ""),
    after_url_is_official_ge_spec_pdp:
      afterRow?.affiliate_url?.trim() === RPWFE_OFFICIAL_GE_TARGET_URL_V1,
    waterdrop_row_added: false,
    amazon_row_added: false,
    compatible_replacement_row_added: false,
    post_apply_gate_failure_kind: postGate,
    post_apply_retailer_link_state: postState,
    post_apply_is_direct_buyable_safe_cta: postSafeCta,
    buckparts_verified_link_still_gated_by_safety_rules: postGate !== null || !postSafeCta,
    buckparts_verified_link_blindly_authorized: false,
    blockers,
    changed_fields: changedFields,
    rollback_row: beforeRow,
    non_rpwfe_row_hash_before: nonTargetHashBefore,
    non_rpwfe_row_hash_after: nonTargetHashAfter,
    notes: [
      "Owner-authorized narrow apply: rpwfe oem-parts-catalog row only.",
      "No Waterdrop, Amazon, or compatible-replacement rows added.",
      "BuckParts Verified Link customer label is metadata in apply-run; live UI still uses existing gate rules.",
    ],
  };

  if (args.apply || blockers.length === 0) {
    const runAbs = path.join(args.rootDir, RPWFE_OFFICIAL_GE_RETAILER_LINKS_APPLY_RUN_REL_V1);
    mkdirSync(path.dirname(runAbs), { recursive: true });
    writeTextFile(runAbs, `${JSON.stringify(run, null, 2)}\n`);
  }

  return run;
}

export function validateRpwfeOfficialGeRetailerLinksApplyState(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): {
  ok: boolean;
  rpwfe_row_count: number;
  has_waterdrop: boolean;
  has_amazon: boolean;
  gate_failure_kind: string | null;
  is_direct_buyable_safe_cta: boolean;
  affiliate_url: string | null;
} {
  const rows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists: args.fileExists ?? existsSync,
    readText: args.readTextFile ?? ((p: string) => readFileSync(p, "utf8")),
  });
  const rpwfeRows = rows.filter((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG);
  const primary = rpwfeRows.find((r) => r.retailer_key?.trim() === RETAILER_KEY) ?? null;
  const gate = primary ? buyLinkGateFailureKind(primary) : "missing_row";
  return {
    ok: primary !== null && gate === null && isDirectBuyableSafeCtaRow(primary ?? { affiliate_url: "" }),
    rpwfe_row_count: rpwfeRows.length,
    has_waterdrop: rpwfeRows.some((r) => /waterdrop|wd-f19c/i.test(JSON.stringify(r))),
    has_amazon: rpwfeRows.some((r) => (r.retailer_key ?? "").toLowerCase() === "amazon"),
    gate_failure_kind: typeof gate === "string" ? gate : gate,
    is_direct_buyable_safe_cta: primary ? isDirectBuyableSafeCtaRow(primary) : false,
    affiliate_url: primary?.affiliate_url?.trim() ?? null,
  };
}

export function rowMatchesBeforeSnapshot(
  current: RetailerLinkCsvRowV1,
  snapshot: RetailerLinkCsvRowV1,
): boolean {
  return rowMatchesSnapshotV1(current, snapshot);
}
