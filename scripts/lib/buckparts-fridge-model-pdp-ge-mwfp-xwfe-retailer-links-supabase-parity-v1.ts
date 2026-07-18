/**
 * Read-only GE MWFP/XWFE retailer_links CSV ↔ Supabase/runtime parity proof.
 * Scope: smartwater-mwfp + xwfe only; context models ge-gfe24jgkww, ge-gfe27jmkes,
 * ge-gne25jmkww, ge-pvd28bymfs. No Supabase/CSV mutation. No apply lane.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";

import { resolveArtifactProvenanceV1 } from "./buckparts-artifact-provenance-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-cta-go-link-proof-pack-v1";
import { BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1";
import {
  assertOnlyAllowedSlugsV1,
  buildScopedFridgeRetailerLinksParityReportV1,
  fridgeRetailerLinksScopedFieldValuesMatchV1,
  loadScopedSupabasePrimariesV1,
  normalizeUtcInstantForParityV1,
  selectScopedCsvPrimaryRowsV1,
  type FridgeRetailerLinksScopedLaneConfigV1,
  type FridgeRetailerLinksScopedParityReportV1,
  type FridgeRetailerLinksScopedSlugParityV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

/** Keep in sync with supabase-sync-owner-review EXACT_COMMAND (avoid circular import). */
export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review -- --write-artifacts" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_MD_REL_V1,
  ] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1 =
  ["smartwater-mwfp", "xwfe"] as const;

export type GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1 =
  (typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1)[number];

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1 =
  ["ge-gfe24jgkww", "ge-gfe27jmkes", "ge-gne25jmkww", "ge-pvd28bymfs"] as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1: FridgeRetailerLinksScopedLaneConfigV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1> =
  {
    contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1,
    closeout_contract:
      "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_parity_closeout_v1",
    allowed_slugs:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
    report_artifact_rel:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
    closeout_artifact_rel:
      "data/fridge/batch-production/closeout/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-closeout-v1.json",
    dry_run_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_SOURCE_COMMAND_V1,
    write_command:
      "PROHIBITED: this read-only parity proof does not authorize Supabase writes",
    allowlist_proven_fact:
      "PROVEN: filter scope is exactly smartwater-mwfp + xwfe; xwf excluded.",
    max_planned_rows: 2,
  };

export type GeMwfpXwfeParitySyncStatusV1 = "IN_SYNC" | "DRIFTED" | "UNKNOWN";

export type GeMwfpXwfeFilterParityRowV1 = {
  filter_slug: GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1;
  sync_status: GeMwfpXwfeParitySyncStatusV1;
  core_status: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>["status"];
  csv_primary: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>["csv_primary"];
  supabase_primary: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>["supabase_primary"];
  field_parity: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>["field_parity"];
  mismatched_fields: string[];
  csv_is_search_placeholder: boolean;
  supabase_is_search_placeholder: boolean | null;
  csv_direct_buyable: boolean;
  supabase_direct_buyable: boolean | null;
  retailer_key_match: boolean | null;
  retailer_name_match: boolean | null;
  checked_at_match_normalized: boolean | null;
  csv_checked_at_normalized: string | null;
  supabase_checked_at_normalized: string | null;
};

export type GeMwfpXwfeCtaGoAffectedSlugRowV1 = {
  slug: (typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1)[number];
  verdict: string | null;
  missing_reasons: string[];
  safe_cta_count: number | null;
  go_resolvable_count: number | null;
  mapped_filter_count: number | null;
  buyer_path_state: string | null;
};

export type GeMwfpXwfeRetailerLinksSupabaseParityProofV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  apply_lane_authorized: false;
  pages_claimed_closed: false;
  conversion_claimed: false;
  generated_at: string;
  base_commit: string | "UNKNOWN";
  source_commit: string | null;
  provenance_status: "BOUND_TO_SOURCE_COMMIT" | "DIRTY_WORKTREE" | "UNKNOWN";
  worktree_clean: boolean | null;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_SOURCE_COMMAND_V1;
  filter_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1;
  affected_model_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1;
  closeout_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1;
  cta_go_proof_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1;
  supabase_truth_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_unavailable_reason: string | null;
  overall_sync_status: GeMwfpXwfeParitySyncStatusV1;
  drifted_filter_count: number;
  in_sync_filter_count: number;
  unknown_filter_count: number;
  any_supabase_search_placeholder: boolean | null;
  filter_rows: GeMwfpXwfeFilterParityRowV1[];
  cta_go_affected_slugs: GeMwfpXwfeCtaGoAffectedSlugRowV1[];
  cta_go_failure_cause:
    | "SUPABASE_STALE_OR_SEARCH_PLACEHOLDER_BLOCKS_RUNTIME_CTA"
    | "CSV_SUPABASE_IN_SYNC_BUT_CTA_GO_STILL_FAILS_OTHER_GATE"
    | "UNKNOWN_DB_UNAVAILABLE"
    | "CTA_GO_PROOF_MISSING_OR_INCOMPLETE"
    | null;
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
  /** When DRIFTED: executable next read-only stage for Command Center / dispatch. */
  exact_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1 | null;
  core_parity: FridgeRetailerLinksScopedParityReportV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>;
};

function mapCoreStatusToSync(
  status: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>["status"],
): GeMwfpXwfeParitySyncStatusV1 {
  if (status === "CSV_AND_SUPABASE_MATCH") return "IN_SYNC";
  if (status === "UNKNOWN_DB_UNAVAILABLE") return "UNKNOWN";
  return "DRIFTED";
}

function isDirectBuyable(value: string | null | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "direct_buyable";
}

function loadCtaGoAffectedRowsV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}): {
  rows: GeMwfpXwfeCtaGoAffectedSlugRowV1[];
  pack_present: boolean;
  pack_summary: { PASS: number | null; FAIL: number | null };
} {
  const readText = args.readText ?? ((abs: string) => readFileSync(abs, "utf8"));
  const abs = path.join(args.rootDir, BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) {
    return {
      pack_present: false,
      pack_summary: { PASS: null, FAIL: null },
      rows: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1.map(
        (slug) => ({
          slug,
          verdict: null,
          missing_reasons: ["cta_go_proof_pack_missing"],
          safe_cta_count: null,
          go_resolvable_count: null,
          mapped_filter_count: null,
          buyer_path_state: null,
        }),
      ),
    };
  }

  const pack = JSON.parse(readText(abs)) as {
    summary?: { SAFE_BUYER_PATH_PASS?: number; SAFE_BUYER_PATH_FAIL?: number };
    rows?: Array<{
      slug?: string;
      verdict?: string;
      missing_reasons?: string[];
      safe_cta_count?: number;
      go_resolvable_count?: number;
      mapped_filter_count?: number;
      buyer_path_state?: string;
    }>;
  };
  const bySlug = new Map((pack.rows ?? []).map((r) => [String(r.slug ?? ""), r]));
  const rows =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1.map(
      (slug) => {
        const row = bySlug.get(slug);
        if (!row) {
          return {
            slug,
            verdict: null,
            missing_reasons: ["cta_go_slug_row_missing"],
            safe_cta_count: null,
            go_resolvable_count: null,
            mapped_filter_count: null,
            buyer_path_state: null,
          };
        }
        return {
          slug,
          verdict: row.verdict ?? null,
          missing_reasons: [...(row.missing_reasons ?? [])],
          safe_cta_count: row.safe_cta_count ?? null,
          go_resolvable_count: row.go_resolvable_count ?? null,
          mapped_filter_count: row.mapped_filter_count ?? null,
          buyer_path_state: row.buyer_path_state ?? null,
        };
      },
    );

  return {
    pack_present: true,
    pack_summary: {
      PASS: pack.summary?.SAFE_BUYER_PATH_PASS ?? null,
      FAIL: pack.summary?.SAFE_BUYER_PATH_FAIL ?? null,
    },
    rows,
  };
}

export function assertGeMwfpXwfeParityFilterScopeV1(slugs: readonly string[]): {
  ok: boolean;
  blockers: string[];
} {
  return assertOnlyAllowedSlugsV1(
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    slugs,
  );
}

export function selectGeMwfpXwfeParityCsvPrimaryRowsV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}) {
  return selectScopedCsvPrimaryRowsV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    ...args,
  });
}

export function classifyGeMwfpXwfeFilterParityRowV1(
  coreRow: FridgeRetailerLinksScopedSlugParityV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>,
): GeMwfpXwfeFilterParityRowV1 {
  const csv = coreRow.csv_primary;
  const sb = coreRow.supabase_primary;
  const csvPlaceholder = csv
    ? isSearchPlaceholderBuyLink(csv.retailer_key, csv.affiliate_url)
    : false;
  const sbPlaceholder =
    sb == null ? null : isSearchPlaceholderBuyLink(sb.retailer_key, sb.affiliate_url);

  const retailer_key_match =
    csv && sb
      ? fridgeRetailerLinksScopedFieldValuesMatchV1(
          "retailer_key",
          csv.retailer_key,
          sb.retailer_key,
        )
      : null;
  const retailer_name_match =
    csv && sb
      ? fridgeRetailerLinksScopedFieldValuesMatchV1(
          "retailer_name",
          csv.retailer_name,
          sb.retailer_name,
        )
      : null;
  const csv_checked_at_normalized = csv
    ? normalizeUtcInstantForParityV1(csv.browser_truth_checked_at)
    : null;
  const supabase_checked_at_normalized = sb
    ? normalizeUtcInstantForParityV1(sb.browser_truth_checked_at)
    : null;
  const checked_at_match_normalized =
    csv && sb
      ? fridgeRetailerLinksScopedFieldValuesMatchV1(
          "browser_truth_checked_at",
          csv.browser_truth_checked_at,
          sb.browser_truth_checked_at,
        )
      : null;

  return {
    filter_slug: coreRow.filter_slug,
    sync_status: mapCoreStatusToSync(coreRow.status),
    core_status: coreRow.status,
    csv_primary: csv,
    supabase_primary: sb,
    field_parity: coreRow.field_parity,
    mismatched_fields: [...coreRow.mismatched_fields],
    csv_is_search_placeholder: csvPlaceholder,
    supabase_is_search_placeholder: sbPlaceholder,
    csv_direct_buyable: csv ? isDirectBuyable(csv.browser_truth_classification) : false,
    supabase_direct_buyable: sb ? isDirectBuyable(sb.browser_truth_classification) : null,
    retailer_key_match,
    retailer_name_match,
    checked_at_match_normalized,
    csv_checked_at_normalized,
    supabase_checked_at_normalized,
  };
}

export function classifyOverallGeMwfpXwfeParitySyncStatusV1(
  rows: readonly GeMwfpXwfeFilterParityRowV1[],
): GeMwfpXwfeParitySyncStatusV1 {
  if (rows.some((r) => r.sync_status === "UNKNOWN")) return "UNKNOWN";
  if (rows.some((r) => r.sync_status === "DRIFTED")) return "DRIFTED";
  if (
    rows.length ===
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1.length &&
    rows.every((r) => r.sync_status === "IN_SYNC")
  ) {
    return "IN_SYNC";
  }
  return "DRIFTED";
}

export async function buildGeMwfpXwfeRetailerLinksSupabaseParityProofV1(args: {
  rootDir: string;
  now?: () => Date;
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>;
}): Promise<GeMwfpXwfeRetailerLinksSupabaseParityProofV1> {
  // Fresh allowlisted object only — never forward caller object (blocks runtime provenance forgery).
  return buildGeMwfpXwfeRetailerLinksSupabaseParityProofInternalV1({
    rootDir: args.rootDir,
    now: args.now,
    readText: args.readText,
    loadSupabase: args.loadSupabase,
  });
}

/** Test-only builder with provenance injection. Not used by CLI/production paths. */
export async function buildGeMwfpXwfeRetailerLinksSupabaseParityProofForTestsV1(args: {
  rootDir: string;
  now?: () => Date;
  worktreeClean?: boolean | null;
  baseCommit?: string | "UNKNOWN";
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>;
}): Promise<GeMwfpXwfeRetailerLinksSupabaseParityProofV1> {
  return buildGeMwfpXwfeRetailerLinksSupabaseParityProofInternalV1({
    rootDir: args.rootDir,
    now: args.now,
    readText: args.readText,
    loadSupabase: args.loadSupabase,
    worktreeClean: args.worktreeClean,
    baseCommit: args.baseCommit,
  });
}

async function buildGeMwfpXwfeRetailerLinksSupabaseParityProofInternalV1(args: {
  rootDir: string;
  now?: () => Date;
  worktreeClean?: boolean | null;
  baseCommit?: string | "UNKNOWN";
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1>;
}): Promise<GeMwfpXwfeRetailerLinksSupabaseParityProofV1> {
  const now = args.now ?? (() => new Date());
  const provenance = resolveArtifactProvenanceV1({
    rootDir: args.rootDir,
    worktreeClean: args.worktreeClean,
    baseCommit: args.baseCommit,
  });
  const { source_commit, provenance_status, base_commit, worktree_clean } = provenance;
  const core_parity = await buildScopedFridgeRetailerLinksParityReportV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    rootDir: args.rootDir,
    mode: "dry_run",
    now,
    readText: args.readText,
    loadSupabase: args.loadSupabase,
  });

  const filter_rows = core_parity.rows.map(classifyGeMwfpXwfeFilterParityRowV1);
  const overall_sync_status = classifyOverallGeMwfpXwfeParitySyncStatusV1(filter_rows);
  const drifted_filter_count = filter_rows.filter((r) => r.sync_status === "DRIFTED").length;
  const in_sync_filter_count = filter_rows.filter((r) => r.sync_status === "IN_SYNC").length;
  const unknown_filter_count = filter_rows.filter((r) => r.sync_status === "UNKNOWN").length;

  const cta = loadCtaGoAffectedRowsV1({
    rootDir: args.rootDir,
    readText: args.readText,
  });

  const any_supabase_search_placeholder =
    unknown_filter_count > 0
      ? null
      : filter_rows.some((r) => r.supabase_is_search_placeholder === true);

  const allAffectedFail =
    cta.pack_present &&
    cta.rows.every((r) => r.verdict === "SAFE_BUYER_PATH_FAIL");
  const ctaGateMissing =
    allAffectedFail &&
    cta.rows.every(
      (r) =>
        (r.missing_reasons ?? []).includes("no_safe_direct_buyable_cta_after_gate") &&
        (r.missing_reasons ?? []).includes("no_go_resolvable_safe_retailer_link"),
    );

  let cta_go_failure_cause: GeMwfpXwfeRetailerLinksSupabaseParityProofV1["cta_go_failure_cause"] =
    null;
  if (!cta.pack_present || cta.rows.some((r) => r.verdict == null)) {
    cta_go_failure_cause = "CTA_GO_PROOF_MISSING_OR_INCOMPLETE";
  } else if (overall_sync_status === "UNKNOWN") {
    cta_go_failure_cause = "UNKNOWN_DB_UNAVAILABLE";
  } else if (
    overall_sync_status === "DRIFTED" &&
    (any_supabase_search_placeholder === true ||
      filter_rows.some((r) => r.supabase_direct_buyable === false) ||
      ctaGateMissing)
  ) {
    cta_go_failure_cause = "SUPABASE_STALE_OR_SEARCH_PLACEHOLDER_BLOCKS_RUNTIME_CTA";
  } else if (overall_sync_status === "IN_SYNC" && allAffectedFail) {
    cta_go_failure_cause = "CSV_SUPABASE_IN_SYNC_BUT_CTA_GO_STILL_FAILS_OTHER_GATE";
  } else if (overall_sync_status === "DRIFTED" && allAffectedFail) {
    cta_go_failure_cause = "SUPABASE_STALE_OR_SEARCH_PLACEHOLDER_BLOCKS_RUNTIME_CTA";
  }

  const proven_facts = [
    "PROVEN: read_only=true; data_mutation=false; mutation_authorized=false; supabase_mutation_authorized=false; apply_lane_authorized=false.",
    `PROVEN: provenance_status=${provenance_status}; base_commit=${base_commit}; source_commit=${source_commit === null ? "null" : source_commit}.`,
    "PROVEN: filter scope is exactly smartwater-mwfp + xwfe; xwf excluded.",
    "PROVEN: affected model context is exactly ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs.",
    "PROVEN: live fridge/filter PDP retailer_links load from Supabase after buy-path gates — CSV alone does not update CTA/go.",
    `PROVEN: overall_sync_status=${overall_sync_status}; in_sync=${String(in_sync_filter_count)}; drifted=${String(drifted_filter_count)}; unknown=${String(unknown_filter_count)}.`,
    `PROVEN: any_supabase_search_placeholder=${String(any_supabase_search_placeholder)}.`,
    `PROVEN: pages_claimed_closed=false; conversion_claimed=false; CTA/go pack summary PASS=${String(cta.pack_summary.PASS)} FAIL=${String(cta.pack_summary.FAIL)}.`,
    ...core_parity.proven_facts.filter((f) => !f.startsWith("PROVEN: lane allowlist")),
  ];

  const unknown_facts = [
    "UNKNOWN: conversion/revenue impact of MWFP/XWFE retailer_links parity.",
    "UNKNOWN: whether the 4 GE model PDPs are buyer-path closed — this packet does not re-run CTA/go or claim closure.",
    ...core_parity.unknown_facts,
  ];

  const notesOnlyResidual =
    overall_sync_status === "DRIFTED" &&
    any_supabase_search_placeholder === false &&
    filter_rows.every(
      (r) =>
        r.sync_status === "DRIFTED" &&
        (r.mismatched_fields ?? []).length > 0 &&
        (r.mismatched_fields ?? []).every((f) => f === "browser_truth_notes"),
    );

  let recommended_next_action =
    "Review filter_rows and cta_go_affected_slugs; do not claim pages closed from this proof.";
  if (overall_sync_status === "UNKNOWN") {
    recommended_next_action =
      "Configure Supabase service-role env and re-run this read-only parity proof before any sync discussion.";
  } else if (notesOnlyResidual) {
    recommended_next_action =
      "Notes-only residual drift (browser_truth_notes); any_supabase_search_placeholder=false. Sync owner-review/write is NOT_NEEDED. Do not claim conversion/revenue or 4 GE pages closed.";
  } else if (overall_sync_status === "DRIFTED") {
    recommended_next_action =
      `Run ${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1} (read-only owner-review drafts). Hard-stop before Supabase write / founder approval. Then re-run CTA/go proof. Do not claim 4 pages closed yet.`;
  } else if (cta_go_failure_cause === "CSV_SUPABASE_IN_SYNC_BUT_CTA_GO_STILL_FAILS_OTHER_GATE") {
    recommended_next_action =
      "CSV and Supabase are IN_SYNC — investigate non-parity CTA/go gates (mapping/quarantine/trust freshness) and re-run CTA/go proof; do not claim pages closed.";
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    apply_lane_authorized: false,
    pages_claimed_closed: false,
    conversion_claimed: false,
    generated_at: now().toISOString(),
    base_commit,
    source_commit,
    provenance_status,
    worktree_clean,
    source_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_SOURCE_COMMAND_V1,
    filter_slugs:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
    affected_model_slugs:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1,
    closeout_rel_path:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
    cta_go_proof_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_CTA_GO_LINK_PROOF_JSON_REL_V1,
    supabase_truth_status: core_parity.supabase_truth_status,
    supabase_unavailable_reason: core_parity.supabase_unavailable_reason,
    overall_sync_status,
    drifted_filter_count,
    in_sync_filter_count,
    unknown_filter_count,
    any_supabase_search_placeholder,
    filter_rows,
    cta_go_affected_slugs: cta.rows,
    cta_go_failure_cause,
    proven_facts,
    unknown_facts,
    recommended_next_action,
    exact_command:
      overall_sync_status === "DRIFTED" && !notesOnlyResidual
        ? BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1
        : null,
    core_parity,
  };
}

export function renderGeMwfpXwfeRetailerLinksSupabaseParityMarkdownV1(
  report: GeMwfpXwfeRetailerLinksSupabaseParityProofV1,
): string {
  const lines: string[] = [
    "# GE MWFP/XWFE retailer_links Supabase/runtime parity proof",
    "",
    `- contract: \`${report.contract}\``,
    `- overall_sync_status: **${report.overall_sync_status}**`,
    `- supabase_truth_status: \`${report.supabase_truth_status}\``,
    `- cta_go_failure_cause: \`${report.cta_go_failure_cause ?? "null"}\``,
    `- pages_claimed_closed: \`${String(report.pages_claimed_closed)}\``,
    `- conversion_claimed: \`${String(report.conversion_claimed)}\``,
    `- apply_lane_authorized: \`${String(report.apply_lane_authorized)}\``,
    `- exact_command: \`${report.exact_command ?? "null"}\``,
    "",
    "## Filter scope",
    "",
    ...report.filter_slugs.map((s) => `- \`${s}\``),
    "",
    "## Affected model slugs",
    "",
    ...report.affected_model_slugs.map((s) => `- \`${s}\``),
    "",
    "## Per-filter parity",
    "",
  ];

  for (const row of report.filter_rows) {
    lines.push(`### \`${row.filter_slug}\` — **${row.sync_status}**`);
    lines.push("");
    lines.push(`- core_status: \`${row.core_status}\``);
    lines.push(
      `- CSV url: \`${row.csv_primary?.affiliate_url ?? "(missing)"}\` (search_placeholder=${String(row.csv_is_search_placeholder)}; direct_buyable=${String(row.csv_direct_buyable)})`,
    );
    lines.push(
      `- Supabase url: \`${row.supabase_primary?.affiliate_url ?? "(missing)"}\` (search_placeholder=${String(row.supabase_is_search_placeholder)}; direct_buyable=${String(row.supabase_direct_buyable)})`,
    );
    lines.push(
      `- retailer_key_match=${String(row.retailer_key_match)}; retailer_name_match=${String(row.retailer_name_match)}; checked_at_match_normalized=${String(row.checked_at_match_normalized)}`,
    );
    if (row.mismatched_fields.length > 0) {
      lines.push(`- mismatched_fields: ${row.mismatched_fields.map((f) => `\`${f}\``).join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## CTA/go for affected models");
  lines.push("");
  for (const row of report.cta_go_affected_slugs) {
    lines.push(
      `- \`${row.slug}\`: verdict=\`${row.verdict ?? "null"}\`; safe_cta=${String(row.safe_cta_count)}; go=${String(row.go_resolvable_count)}; reasons=${row.missing_reasons.join(", ") || "(none)"}`,
    );
  }
  lines.push("");
  lines.push("## Recommended next action");
  lines.push("");
  lines.push(report.recommended_next_action);
  lines.push("");
  lines.push("## Proven");
  lines.push("");
  for (const f of report.proven_facts) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## Unknown");
  lines.push("");
  for (const f of report.unknown_facts) lines.push(`- ${f}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeGeMwfpXwfeRetailerLinksSupabaseParityArtifactsV1(args: {
  rootDir: string;
  report: GeMwfpXwfeRetailerLinksSupabaseParityProofV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, renderGeMwfpXwfeRetailerLinksSupabaseParityMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}

export function parseGeMwfpXwfeRetailerLinksSupabaseParityArgvV1(argv: readonly string[]): {
  writeArtifacts: boolean;
} {
  if (argv.includes("--write") || argv.includes("--apply")) {
    throw new Error(
      "This lane is read-only. Use --write-artifacts only. Supabase/CSV mutation is not authorized.",
    );
  }
  return { writeArtifacts: argv.includes("--write-artifacts") };
}

export { loadScopedSupabasePrimariesV1, normalizeUtcInstantForParityV1 };
