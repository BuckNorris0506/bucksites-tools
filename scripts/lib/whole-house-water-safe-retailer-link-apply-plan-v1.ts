/**
 * Read-only WHW safe retailer_links apply plan v1 — founder approval packet only.
 * No CSV, Supabase, public UI, launch-state, or buy-gate mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import {
  BUYABLE_SUBTYPES,
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
  isManufacturerSiteSearchUrl,
  normalizeUrlForKnownTruthLookup,
} from "@/lib/retailers/launch-buy-links";

import {
  WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
  type WhwBrowserTruthCaptureResultV1,
  type WhwBrowserTruthCsvMutationRecommendationV1,
  loadWhwBrowserTruthCaptureResultV1,
} from "./whole-house-water-browser-truth-capture-result-v1";

export const WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1 =
  "whole_house_water_safe_retailer_link_apply_plan_v1" as const;

export const WHW_APPLY_PLANS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/apply-plans-v1" as const;

export const WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1 =
  `${WHW_APPLY_PLANS_DIR_REL_V1}/whw-ap810-retailer-link-apply-plan-v1.json` as const;

export const WHW_AP810_FILTER_SLUG_V1 = "3m-ap810" as const;

export const WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1 = "aquapurefilters_authorized_dealer" as const;

export const WHW_RETAILER_LINKS_CSV_REL_V1 = "data/whole-house-water/retailer_links.csv" as const;

export type WhwRetailerLinkCsvRowV1 = Record<string, string>;

export type WhwProposedRetailerLinkRowV1 = {
  filter_slug: string;
  retailer_name: string;
  affiliate_url: string;
  is_primary: string;
  retailer_key: string;
  retailer_slug: string;
  destination_url: string;
  browser_truth_classification: string;
  browser_truth_notes: string;
  browser_truth_checked_at: string;
};

export type WhwSafeRetailerLinkApplyPlanV1 = {
  contract: typeof WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  packet_id: "whw-ap810-retailer-link-apply-plan-v1";
  anchor_filter_slug: typeof WHW_AP810_FILTER_SLUG_V1;
  source_browser_truth_artifact: typeof WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1;
  apply_authorized_by_artifact: boolean;
  founder_approval_required: true;
  ready_for_founder_approval: boolean;
  whw_public_opening_authorized: false;
  proposed_retailer_link_row: WhwProposedRetailerLinkRowV1 | null;
  row_already_exists_in_committed_csv: boolean;
  matching_committed_csv_rows: WhwRetailerLinkCsvRowV1[];
  current_committed_primary_row: WhwRetailerLinkCsvRowV1 | null;
  committed_csv_columns: string[];
  validation_refusals: string[];
  validation_checklist: string[];
  generated_at: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
  why_whw_stays_closed: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAllowedWhwApplyPlanRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_APPLY_PLANS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function loadWhwRetailerLinksCsvV1(
  rootDir: string,
  readText?: (absPath: string) => string,
): WhwRetailerLinkCsvRowV1[] {
  const abs = path.join(rootDir, WHW_RETAILER_LINKS_CSV_REL_V1);
  const text = (readText ?? ((p) => readFileSync(p, "utf8")))(abs);
  return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as WhwRetailerLinkCsvRowV1[];
}

export function isNonSearchPdpUrlV1(url: string): boolean {
  if (!url.trim()) return false;
  if (isManufacturerSiteSearchUrl(url)) return false;
  try {
    const u = new URL(url.trim());
    const p = u.pathname.toLowerCase();
    return /\/products?\//.test(p) || /\/store\/products?\//.test(p) || /\.html$/i.test(p);
  } catch {
    return false;
  }
}

export function isCompatibleMislabeledOfficialV1(args: {
  listingKind: string | null;
  captureNotes: string;
  exactTokenProof: string;
}): boolean {
  if (args.listingKind === "compatible_replacement") return true;
  const blob = `${args.captureNotes} ${args.exactTokenProof}`.toLowerCase();
  return (
    blob.includes("compatible replacement") &&
    !blob.includes("authorized dealer") &&
    !blob.includes("oem ap810")
  );
}

export function rowsMatchProposedRetailerLinkRowV1(
  committed: WhwRetailerLinkCsvRowV1,
  proposed: WhwProposedRetailerLinkRowV1,
): boolean {
  const sameFilter = committed.filter_slug?.trim() === proposed.filter_slug;
  const sameKey =
    (committed.retailer_key ?? "").trim().toLowerCase() === proposed.retailer_key.toLowerCase();
  const sameDest =
    normalizeUrlForKnownTruthLookup(committed.destination_url ?? "") ===
    normalizeUrlForKnownTruthLookup(proposed.destination_url);
  return sameFilter && sameKey && sameDest;
}

export function findMatchingCommittedRowsV1(args: {
  rows: WhwRetailerLinkCsvRowV1[];
  proposed: WhwProposedRetailerLinkRowV1;
}): WhwRetailerLinkCsvRowV1[] {
  return args.rows.filter((row) => rowsMatchProposedRetailerLinkRowV1(row, args.proposed));
}

export function findCommittedPrimaryRowV1(
  rows: WhwRetailerLinkCsvRowV1[],
  filterSlug: string,
): WhwRetailerLinkCsvRowV1 | null {
  const matches = rows.filter((row) => row.filter_slug?.trim() === filterSlug);
  return (
    matches.find((row) => {
      const v = (row.is_primary ?? "").trim().toLowerCase();
      return v === "true" || v === "1" || v === "yes";
    }) ?? null
  );
}

export function buildProposedRowFromBrowserTruthV1(args: {
  artifact: WhwBrowserTruthCaptureResultV1;
  mutation: WhwBrowserTruthCsvMutationRecommendationV1;
}): WhwProposedRetailerLinkRowV1 {
  const passRow = args.artifact.candidates_checked.find((c) => c.evidence_status === "PASS");
  const linkRow = passRow?.recommended_retailer_link_row;
  const checkedAt = linkRow?.browser_truth_checked_at ?? args.artifact.checked_at;

  return {
    filter_slug: WHW_AP810_FILTER_SLUG_V1,
    retailer_name: linkRow?.retailer_name ?? "Aqua-Pure Filters (authorized dealer)",
    affiliate_url: args.mutation.destination_url,
    is_primary: "false",
    retailer_key: args.mutation.retailer_key,
    retailer_slug: args.mutation.retailer_key,
    destination_url: args.mutation.destination_url,
    browser_truth_classification: args.mutation.browser_truth_classification,
    browser_truth_notes:
      linkRow?.browser_truth_notes ??
      args.mutation.buyability_proof ??
      "WHW apply plan v1: browser_truth PASS authorized dealer AP810 PDP.",
    browser_truth_checked_at: checkedAt,
  };
}

export function validateWhwApplyPlanGatesFromArtifactV1(
  artifact: WhwBrowserTruthCaptureResultV1,
): string[] {
  const refusals: string[] = [];

  if (!artifact.safe_apply_authorized) {
    refusals.push("artifact_safe_apply_authorized_false");
  }
  if (artifact.anchor_filter_slug !== WHW_AP810_FILTER_SLUG_V1) {
    refusals.push(`anchor_filter_slug_not_${WHW_AP810_FILTER_SLUG_V1}`);
  }
  if (artifact.pass_count !== 1) {
    refusals.push(`pass_count_not_1:${String(artifact.pass_count)}`);
  }
  if (artifact.recommended_csv_mutations.length !== 1) {
    refusals.push(`recommended_csv_mutations_count_not_1:${String(artifact.recommended_csv_mutations.length)}`);
  }

  const mutation = artifact.recommended_csv_mutations[0];
  if (!mutation) {
    refusals.push("missing_recommended_csv_mutation");
    return refusals;
  }

  if (mutation.filter_slug !== WHW_AP810_FILTER_SLUG_V1) {
    refusals.push("mutation_filter_slug_mismatch");
  }
  if (mutation.browser_truth_classification !== "direct_buyable") {
    refusals.push("mutation_not_direct_buyable");
  }
  if (mutation.browser_truth_buyable_subtype !== BUYABLE_SUBTYPES.SINGLE_UNIT_DIRECT_BUYABLE) {
    refusals.push("mutation_buyable_subtype_not_single_unit");
  }
  if (!isNonSearchPdpUrlV1(mutation.destination_url)) {
    refusals.push("mutation_destination_not_non_search_pdp");
  }

  const best = artifact.best_truthful_buyer_path;
  if (!best) {
    refusals.push("missing_best_truthful_buyer_path");
  } else if (best.retailer_or_source !== WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1) {
    refusals.push(`best_buyer_path_not_${WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1}`);
  }

  const passCandidate = artifact.candidates_checked.find((c) => c.evidence_status === "PASS");
  if (!passCandidate) {
    refusals.push("no_pass_candidate_in_artifact");
  } else {
    if (passCandidate.retailer_or_source !== WHW_AP810_AQUAPURE_RETAILER_SOURCE_V1) {
      refusals.push("pass_candidate_retailer_mismatch");
    }
    if (passCandidate.listing_kind === "compatible_replacement") {
      refusals.push("pass_candidate_compatible_replacement");
    }
    if (passCandidate.safe_cta_gate_status !== "PASS") {
      refusals.push("pass_candidate_safe_cta_gate_not_pass");
    }
    if (
      isCompatibleMislabeledOfficialV1({
        listingKind: passCandidate.listing_kind,
        captureNotes: passCandidate.capture_notes,
        exactTokenProof: best?.exact_token_proof ?? "",
      })
    ) {
      refusals.push("compatible_mislabeled_official");
    }
    if (!isDirectBuyableSafeCtaRow({
      retailer_key: mutation.retailer_key,
      affiliate_url: mutation.destination_url,
      browser_truth_classification: mutation.browser_truth_classification,
      browser_truth_buyable_subtype: mutation.browser_truth_buyable_subtype,
    })) {
      refusals.push("proposed_row_fails_launch_buy_links_safe_cta_gate");
    }
    if (buyLinkGateFailureKind({
      retailer_key: mutation.retailer_key,
      affiliate_url: mutation.destination_url,
      browser_truth_classification: mutation.browser_truth_classification,
      browser_truth_buyable_subtype: mutation.browser_truth_buyable_subtype,
    }) !== null) {
      refusals.push("proposed_row_buy_link_gate_failure");
    }
  }

  return refusals;
}

export function validateWhwSafeRetailerLinkApplyPlanV1(
  value: unknown,
): value is WhwSafeRetailerLinkApplyPlanV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.founder_approval_required !== true) return false;
  if (value.whw_public_opening_authorized !== false) return false;
  if (value.ready_for_founder_approval === true && value.proposed_retailer_link_row === null) {
    return false;
  }
  if (value.ready_for_founder_approval === true && !Array.isArray(value.validation_refusals)) {
    return false;
  }
  if (
    value.ready_for_founder_approval === true &&
    Array.isArray(value.validation_refusals) &&
    (value.validation_refusals as string[]).length > 0
  ) {
    return false;
  }
  return true;
}

export function buildWhwAp810SafeRetailerLinkApplyPlanV1(args: {
  rootDir: string;
  now?: () => Date;
  browserTruthArtifact?: WhwBrowserTruthCaptureResultV1 | null;
}): WhwSafeRetailerLinkApplyPlanV1 {
  const now = args.now ?? (() => new Date());
  const iso = now().toISOString();

  const artifact =
    args.browserTruthArtifact !== undefined
      ? args.browserTruthArtifact
      : loadWhwBrowserTruthCaptureResultV1({
          rootDir: args.rootDir,
          relPath: WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
        });

  if (!artifact) {
    throw new Error(`Missing required browser_truth artifact: ${WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1}`);
  }

  const validation_refusals = validateWhwApplyPlanGatesFromArtifactV1(artifact);
  const csvRows = loadWhwRetailerLinksCsvV1(args.rootDir);
  const committed_csv_columns =
    csvRows.length > 0 ? Object.keys(csvRows[0]!) : ["filter_slug", "retailer_name", "affiliate_url", "is_primary", "retailer_key", "retailer_slug", "destination_url"];

  const mutation = artifact.recommended_csv_mutations[0] ?? null;
  const proposed_retailer_link_row =
    mutation && validation_refusals.length === 0
      ? buildProposedRowFromBrowserTruthV1({ artifact, mutation })
      : null;

  const matching_committed_csv_rows = proposed_retailer_link_row
    ? findMatchingCommittedRowsV1({ rows: csvRows, proposed: proposed_retailer_link_row })
    : [];

  const row_already_exists_in_committed_csv = matching_committed_csv_rows.length > 0;
  const current_committed_primary_row = findCommittedPrimaryRowV1(csvRows, WHW_AP810_FILTER_SLUG_V1);

  const ready_for_founder_approval =
    validation_refusals.length === 0 &&
    proposed_retailer_link_row !== null &&
    !row_already_exists_in_committed_csv;

  const launchState = getVerticalLaunchState("whole-house-water");

  const validation_checklist = [
    "Founder explicitly approves adding proposed retailer_links.csv row (no auto-apply).",
    "Confirm aquapurefilters PDP still shows AP810 / 5618902 OEM SKU with direct Add to cart.",
    "Confirm proposed row remains is_primary=false until primary oem-catalog search placeholder is retired deliberately.",
    "Run apply executor only after approval; re-run guardrails and Supabase parity separately.",
    "Do not change whole-house-water launch state until broader WHW wedge criteria are met.",
  ];

  const why_whw_stays_closed = [
    `Launch state is ${launchState} (not publicly opened).`,
    "Browser_truth artifact sets do_not_open_public=true.",
    "This apply plan is read-only (data_mutation=false) — no CSV row written yet.",
    "Founder approval is required before any retailer_links.csv mutation.",
    row_already_exists_in_committed_csv
      ? "Proposed aquapure-dealer row already exists in committed CSV — no new row needed."
      : "Even after founder-approved apply, WHW public opening requires separate launch-state decision.",
  ];

  return {
    contract: WHW_SAFE_RETAILER_LINK_APPLY_PLAN_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    packet_id: "whw-ap810-retailer-link-apply-plan-v1",
    anchor_filter_slug: WHW_AP810_FILTER_SLUG_V1,
    source_browser_truth_artifact: WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1,
    apply_authorized_by_artifact: artifact.safe_apply_authorized,
    founder_approval_required: true,
    ready_for_founder_approval,
    whw_public_opening_authorized: false,
    proposed_retailer_link_row,
    row_already_exists_in_committed_csv,
    matching_committed_csv_rows,
    current_committed_primary_row,
    committed_csv_columns,
    validation_refusals,
    validation_checklist,
    generated_at: iso,
    why_whw_stays_closed,
    proven_facts: [
      `PROVEN: Loaded browser_truth artifact ${WHW_AP810_BROWSER_TRUTH_RESULT_REL_V1} with safe_apply_authorized=${String(artifact.safe_apply_authorized)}.`,
      `PROVEN: recommended_csv_mutations.length=${String(artifact.recommended_csv_mutations.length)}; pass_count=${String(artifact.pass_count)}.`,
      `PROVEN: best_truthful_buyer_path retailer=${artifact.best_truthful_buyer_path?.retailer_or_source ?? "none"}.`,
      `PROVEN: Committed CSV has ${String(csvRows.length)} rows; 3m-ap810 primary remains oem-catalog site-search placeholder.`,
      `PROVEN: row_already_exists_in_committed_csv=${String(row_already_exists_in_committed_csv)}.`,
      `PROVEN: validation_refusals=${validation_refusals.length === 0 ? "none" : validation_refusals.join(",")}.`,
      `PROVEN: ready_for_founder_approval=${String(ready_for_founder_approval)}.`,
      `PROVEN: whole-house-water launch state remains ${launchState}.`,
    ],
    inferred_facts: [
      ready_for_founder_approval
        ? "INFERRED: Founder can approve adding non-primary aquapure-dealer direct_buyable row while keeping existing oem-catalog primary until a separate primary-retirement decision."
        : "INFERRED: Plan is blocked until validation refusals are cleared or artifact is updated.",
      "INFERRED: Supabase parity apply is out of scope for this read-only plan packet.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether founder wants aquapure-dealer row to become primary CTA after apply.",
      "UNKNOWN: Whether affiliate tag should be added to aquapurefilters URL on apply.",
    ],
  };
}

export function writeWhwSafeRetailerLinkApplyPlanV1(args: {
  rootDir: string;
  plan: WhwSafeRetailerLinkApplyPlanV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_AP810_RETAILER_LINK_APPLY_PLAN_REL_V1;
  if (!isAllowedWhwApplyPlanRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW apply-plans dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.plan, null, 2)}\n`, "utf8");
  return rel;
}

export function loadWhwSafeRetailerLinkApplyPlanV1(args: {
  rootDir: string;
  relPath: string;
}): WhwSafeRetailerLinkApplyPlanV1 | null {
  if (!isAllowedWhwApplyPlanRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!validateWhwSafeRetailerLinkApplyPlanV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
