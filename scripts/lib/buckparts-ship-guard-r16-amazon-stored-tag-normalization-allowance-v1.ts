/**
 * Ship-guard allowance: founder-approved R16 refrigerator Amazon tag-only CSV closeout (14 rows).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  R16_AMAZON_CSV_TARGET_SLUGS_V1,
  R16_AMAZON_INACTIVE_TAG_V1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_CSV_CLOSEOUT_JSON_REL_V1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_DECISION_ID_V1,
  R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_JSON_REL_V1,
  stripInactiveAmazonAssociatesTagFromUrl,
  urlHasInactiveAmazonTag,
} from "./buckparts-r16-amazon-stored-tag-normalization-v1";

const PROTECTED_RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;

export const R16_AMAZON_STORED_TAG_SHIP_GUARD_ALLOWANCE_CONTRACT_V1 =
  "buckparts_ship_guard_r16_amazon_stored_tag_normalization_allowance_v1" as const;

export type R16AmazonStoredTagShipGuardAllowanceV1 = {
  contract: typeof R16_AMAZON_STORED_TAG_SHIP_GUARD_ALLOWANCE_CONTRACT_V1;
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

type CsvRow = Record<string, string>;

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

export function assessR16AmazonStoredTagNormalizationRetailerLinksAllowanceV1(deps: {
  rootDir: string;
  retailerLinksDirty: boolean;
  headCsvText?: string | null;
  workingCsvText?: string | null;
  readText?: (abs: string) => string;
  fileExists?: (abs: string) => boolean;
}): R16AmazonStoredTagShipGuardAllowanceV1 {
  const fileExists = deps.fileExists ?? existsSync;
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const blockers: string[] = [];
  const proven_facts: string[] = [];

  if (!deps.retailerLinksDirty) {
    return {
      contract: R16_AMAZON_STORED_TAG_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
      status: "NOT_APPLICABLE",
      retailer_links_dirty: false,
      closeout_present: false,
      approval_present: false,
      blockers: [],
      proven_facts: [
        "PROVEN: data/retailer_links.csv not dirty — R16 Amazon tag normalization allowance not applicable.",
      ],
      allowed_filters: R16_AMAZON_CSV_TARGET_SLUGS_V1,
      pages_claimed_closed: false,
      conversion_claimed: false,
    };
  }

  const closeoutRel = R16_AMAZON_STORED_TAG_NORMALIZATION_CSV_CLOSEOUT_JSON_REL_V1;
  const approvalRel = R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_JSON_REL_V1;
  const closeout_present = fileExists(path.join(deps.rootDir, closeoutRel));
  const approval_present = fileExists(path.join(deps.rootDir, approvalRel));
  if (!closeout_present) blockers.push("r16_closeout_missing");
  if (!approval_present) blockers.push("r16_approval_missing");

  if (closeout_present) {
    try {
      const closeout = JSON.parse(readText(path.join(deps.rootDir, closeoutRel))) as {
        apply_status?: string;
        rows_updated?: number;
        inserts?: number;
        deletes?: number;
        supabase_mutated?: boolean;
        approval_decision_id?: string;
      };
      if (closeout.apply_status !== "APPLIED") blockers.push("r16_closeout_not_applied");
      if (closeout.rows_updated !== 14) blockers.push("r16_closeout_rows_not_14");
      if (closeout.inserts !== 0) blockers.push("r16_closeout_inserts_not_0");
      if (closeout.deletes !== 0) blockers.push("r16_closeout_deletes_not_0");
      if (closeout.supabase_mutated !== false) blockers.push("r16_closeout_supabase_mutated");
      if (
        closeout.approval_decision_id !==
        R16_AMAZON_STORED_TAG_NORMALIZATION_OWNER_APPROVAL_DECISION_ID_V1
      ) {
        blockers.push("r16_closeout_decision_id_mismatch");
      }
    } catch {
      blockers.push("r16_closeout_unreadable");
    }
  }

  const workingCsv =
    deps.workingCsvText ??
    (fileExists(path.join(deps.rootDir, PROTECTED_RETAILER_LINKS_CSV_REL))
      ? readText(path.join(deps.rootDir, PROTECTED_RETAILER_LINKS_CSV_REL))
      : null);
  const headCsv = deps.headCsvText ?? null;
  if (!workingCsv || !headCsv) {
    blockers.push("r16_csv_head_or_working_missing");
  } else {
    const beforeRows = parseCsvRows(headCsv);
    const afterRows = parseCsvRows(workingCsv);
    const beforeBySlug = new Map<string, CsvRow>();
    for (const row of beforeRows) {
      if (normalizeSlug(row.is_primary ?? "") !== "true") continue;
      if (normalizeSlug(row.retailer_key ?? "") !== "amazon") continue;
      beforeBySlug.set(normalizeSlug(row.filter_slug ?? ""), row);
    }
    const afterBySlug = new Map<string, CsvRow>();
    for (const row of afterRows) {
      if (normalizeSlug(row.is_primary ?? "") !== "true") continue;
      if (normalizeSlug(row.retailer_key ?? "") !== "amazon") continue;
      afterBySlug.set(normalizeSlug(row.filter_slug ?? ""), row);
    }
    for (const slug of R16_AMAZON_CSV_TARGET_SLUGS_V1) {
      const before = beforeBySlug.get(slug);
      const after = afterBySlug.get(slug);
      if (!before || !after) {
        blockers.push(`r16_csv_slug_missing:${slug}`);
        continue;
      }
      const diffs = fieldDiffs(before, after);
      if (diffs.length === 0) blockers.push(`r16_csv_no_change:${slug}`);
      if (diffs.some((d) => d !== "affiliate_url")) {
        blockers.push(`r16_csv_non_affiliate_diff:${slug}:${diffs.join(",")}`);
      }
      const beforeUrl = (before.affiliate_url ?? "").trim();
      const afterUrl = (after.affiliate_url ?? "").trim();
      if (!urlHasInactiveAmazonTag(beforeUrl)) {
        blockers.push(`r16_csv_before_not_tagged:${slug}`);
      }
      if (urlHasInactiveAmazonTag(afterUrl)) {
        blockers.push(`r16_csv_after_still_tagged:${slug}`);
      }
      if (afterUrl !== stripInactiveAmazonAssociatesTagFromUrl(beforeUrl)) {
        blockers.push(`r16_csv_after_not_exact_strip:${slug}`);
      }
      if (afterUrl.includes(R16_AMAZON_INACTIVE_TAG_V1)) {
        blockers.push(`r16_csv_after_contains_tag:${slug}`);
      }
    }
    const taggedAfter = afterRows.filter(
      (r) =>
        normalizeSlug(r.retailer_key ?? "") === "amazon" &&
        urlHasInactiveAmazonTag(r.affiliate_url ?? ""),
    );
    if (taggedAfter.length > 0) {
      blockers.push(`r16_csv_residual_tagged_amazon_rows:${String(taggedAfter.length)}`);
    }
  }

  const status = blockers.length === 0 ? "ALLOWED" : "BLOCKED";
  if (status === "ALLOWED") {
    proven_facts.push(
      "PROVEN: R16 Amazon stored tag normalization CSV closeout matches 14 slug tag-only affiliate_url strip.",
    );
  }

  return {
    contract: R16_AMAZON_STORED_TAG_SHIP_GUARD_ALLOWANCE_CONTRACT_V1,
    status,
    retailer_links_dirty: true,
    closeout_present,
    approval_present,
    blockers,
    proven_facts,
    allowed_filters: R16_AMAZON_CSV_TARGET_SLUGS_V1,
    pages_claimed_closed: false,
    conversion_claimed: false,
  };
}

export function applyR16AmazonStoredTagAllowanceToBlockersV1(args: {
  driftBlockers: string[];
  allowance: R16AmazonStoredTagShipGuardAllowanceV1;
}): string[] {
  if (args.allowance.status === "ALLOWED") {
    return args.driftBlockers.filter(
      (b) => !b.startsWith(`${PROTECTED_RETAILER_LINKS_CSV_REL}:`),
    );
  }
  if (args.allowance.status === "BLOCKED") {
    return [
      ...args.driftBlockers,
      ...args.allowance.blockers.map((b) => `r16_amazon_tag_allowance:${b}`),
    ];
  }
  return args.driftBlockers;
}
