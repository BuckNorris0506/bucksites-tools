/**
 * Owner-authorized guarded Supabase parity apply for RPWFE official GE only.
 * Updates a single existing public.retailer_links primary oem-parts-catalog row — no inserts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import {
  RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
  RPWFE_OFFICIAL_GE_TARGET_URL_V1,
} from "./rpwfe-official-ge-browser-capture-v1";
import { isRpwfeRepoCsvOfficialGeDirectBuyableApplied } from "./rpwfe-official-ge-repo-csv-state-v1";
import type { BuckpartsIoCapabilityV1 } from "./buckparts-io-capabilities-v1";
import {
  buildRpwfeOfficialGeSupabaseParityMutationPreflightV1,
  RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
  rpwfeOfficialGeSupabaseParityMutationAuthorizedV1,
} from "./rpwfe-official-ge-supabase-parity-mutation-gate-v1";
import {
  recordTruthLedgerMutationOutcomeV1,
  type TruthLedgerMutationApplyOutcomeV1,
} from "./truth-ledger-v1";
import {
  buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1,
  type RpwfeOfficialGeSupabaseParityPlanLaneV1,
} from "./rpwfe-official-ge-supabase-parity-plan-v1";
import type { SupabaseLinksBySlugResultV1 } from "./fridge-supabase-vs-csv-retailer-links-diff-v1";
import {
  loadFridgeRetailerLinksCsvRowsV1,
  type RetailerLinkCsvRowV1,
} from "./universal-batch-lifecycle-apply-execution-plan-v1";

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_CONTRACT_V1 =
  "rpwfe_official_ge_supabase_parity_apply_v1" as const;

export const RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_RUN_REL_V1 =
  "data/fridge/batch-production/rpwfe-rescue/rpwfe-official-ge-supabase-parity-apply-run-v1.json" as const;

const FILTER_SLUG = "rpwfe" as const;
const RETAILER_KEY = "oem-parts-catalog" as const;
const TARGET_TABLE = "public.retailer_links" as const;
const PROPOSED_CLASSIFICATION = "direct_buyable" as const;

export type RpwfeSupabaseRetailerLinkRowV1 = {
  id: string;
  filter_id: string;
  retailer_name: string | null;
  affiliate_url: string;
  destination_url: string | null;
  retailer_key: string | null;
  retailer_slug: string | null;
  is_primary: boolean | null;
  browser_truth_classification: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
};

export type RpwfeSupabaseParityApplyStatusV1 =
  | "DRY_RUN_READY"
  | "APPLIED"
  | "ALREADY_APPLIED"
  | "BLOCKED";

export type RpwfeOfficialGeSupabaseParityApplyRunV1 = {
  contract: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_CONTRACT_V1;
  generated_at: string;
  mode: "apply" | "dry_run";
  data_mutation: boolean;
  owner_supabase_apply_authorized: boolean;
  mutation_authorized: boolean;
  mutation_preflight_blockers: string[];
  founder_decision_id: string | null;
  io_capability: BuckpartsIoCapabilityV1;
  apply_artifact_rel: typeof RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1;
  target_table: typeof TARGET_TABLE;
  filter_slug: typeof FILTER_SLUG;
  apply_status: RpwfeSupabaseParityApplyStatusV1;
  target_update_count: number;
  rows_updated: number;
  browser_evidence_artifact_path: typeof RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1;
  repo_csv_row: RetailerLinkCsvRowV1 | null;
  before_supabase_row: RpwfeSupabaseRetailerLinkRowV1 | null;
  after_supabase_row_projected: Record<string, unknown> | null;
  after_supabase_row_loaded: RpwfeSupabaseRetailerLinkRowV1 | null;
  post_apply_parity_status: RpwfeOfficialGeSupabaseParityPlanLaneV1["proposed_supabase_parity_status"] | null;
  post_apply_gate_failure_kind: string | null;
  post_apply_retailer_link_state: string | null;
  post_apply_is_direct_buyable_safe_cta: boolean;
  waterdrop_in_patch: false;
  amazon_in_patch: false;
  compatible_replacement_in_patch: false;
  buckparts_verified_link_authorized: false;
  blockers: string[];
  notes: string[];
};

export type RpwfeSupabaseParityApplyDepsV1 = {
  resolveFilterIdBySlug: (slug: string) => Promise<string | null>;
  fetchPrimaryOemRow: (filterId: string) => Promise<RpwfeSupabaseRetailerLinkRowV1[]>;
  updateRowById: (id: string, patch: Record<string, unknown>) => Promise<void>;
  loadSupabaseSnapshot: (slugs: string[]) => Promise<SupabaseLinksBySlugResultV1>;
};

function findRpwfeRepoRow(rows: readonly RetailerLinkCsvRowV1[]): RetailerLinkCsvRowV1 | null {
  const slugRows = rows.filter((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG);
  if (slugRows.length !== 1) return slugRows[0] ?? null;
  return (
    slugRows.find((r) => r.retailer_key?.trim().toLowerCase() === RETAILER_KEY) ?? slugRows[0] ?? null
  );
}

function slugifyRetailerKey(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "store";
}

function retailerSlugFromRepoRow(row: RetailerLinkCsvRowV1): string {
  const fromKey = row.retailer_key?.trim();
  if (fromKey) return slugifyRetailerKey(fromKey);
  return slugifyRetailerKey(row.retailer_name ?? "store");
}

export function buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(
  row: RetailerLinkCsvRowV1,
): Record<string, unknown> {
  const affiliate_url = row.affiliate_url?.trim() ?? "";
  return {
    retailer_name: row.retailer_name?.trim() || null,
    affiliate_url,
    destination_url: affiliate_url,
    is_primary: row.is_primary?.trim().toLowerCase() === "true",
    retailer_key: RETAILER_KEY,
    retailer_slug: retailerSlugFromRepoRow(row),
    browser_truth_classification: row.browser_truth_classification?.trim() || null,
    browser_truth_notes: row.browser_truth_notes?.trim() || null,
    browser_truth_checked_at: row.browser_truth_checked_at?.trim() || null,
  };
}

export function proposedPatchContainsForbiddenRetailerLanguageV1(
  patch: Record<string, unknown>,
): boolean {
  const blob = JSON.stringify(patch).toLowerCase();
  return (
    /waterdrop|wd-f19c|amazon\.com|compatible.replacement|compatible_replacement/.test(blob)
  );
}

export function dbRowMatchesRepoCsvForParityV1(
  db: RpwfeSupabaseRetailerLinkRowV1,
  repoRow: RetailerLinkCsvRowV1,
): boolean {
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(repoRow);
  return (
    (db.retailer_key ?? "").trim().toLowerCase() === RETAILER_KEY &&
    db.affiliate_url.trim() === String(patch.affiliate_url) &&
    (db.browser_truth_classification ?? "").trim() ===
      String(patch.browser_truth_classification ?? "") &&
    db.is_primary === true &&
    (db.retailer_name ?? "").trim() === String(patch.retailer_name ?? "")
  );
}

export function validateRpwfeSupabaseParityApplyPreconditionsV1(args: {
  repoRow: RetailerLinkCsvRowV1 | null;
  rpwfeRepoRowCount: number;
}): string[] {
  const blockers: string[] = [];
  if (args.rpwfeRepoRowCount !== 1) {
    blockers.push(`rpwfe_repo_csv_row_count_not_one:${args.rpwfeRepoRowCount}`);
  }
  if (!args.repoRow) {
    blockers.push("rpwfe_repo_csv_row_missing");
    return blockers;
  }
  if (args.repoRow.filter_slug?.trim().toLowerCase() !== FILTER_SLUG) {
    blockers.push("repo_filter_slug_not_rpwfe");
  }
  if (args.repoRow.retailer_key?.trim().toLowerCase() !== RETAILER_KEY) {
    blockers.push("repo_retailer_key_not_oem_parts_catalog");
  }
  if (!isRpwfeRepoCsvOfficialGeDirectBuyableApplied(args.repoRow)) {
    blockers.push("repo_csv_not_direct_buyable_official_ge_applied");
  }
  const url = args.repoRow.affiliate_url?.trim() ?? "";
  if (url !== RPWFE_OFFICIAL_GE_TARGET_URL_V1) {
    blockers.push("proposed_url_not_official_ge_spec_pdp");
  }
  if (args.repoRow.browser_truth_classification?.trim() !== PROPOSED_CLASSIFICATION) {
    blockers.push("proposed_classification_not_direct_buyable");
  }
  const patch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(args.repoRow);
  if (proposedPatchContainsForbiddenRetailerLanguageV1(patch)) {
    blockers.push("forbidden_waterdrop_amazon_or_compatible_language_in_patch");
  }
  const gate = buyLinkGateFailureKind({
    retailer_key: RETAILER_KEY,
    affiliate_url: url,
    browser_truth_classification: PROPOSED_CLASSIFICATION,
    browser_truth_buyable_subtype: null,
    browser_truth_checked_at: args.repoRow.browser_truth_checked_at?.trim() || null,
  });
  if (gate !== null) blockers.push(`projected_gate_failure:${gate}`);
  return blockers;
}

export async function executeRpwfeOfficialGeSupabaseParityApplyV1(args: {
  rootDir: string;
  apply: boolean;
  deps: RpwfeSupabaseParityApplyDepsV1;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
  writeTextFile?: (abs: string, content: string) => void;
  now?: () => Date;
  io_capability?: BuckpartsIoCapabilityV1;
  mutationGateRef?: { authorized: boolean };
}): Promise<RpwfeOfficialGeSupabaseParityApplyRunV1> {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const writeTextFile = args.writeTextFile ?? ((p: string, c: string) => writeFileSync(p, c, "utf8"));
  const generatedAt = (args.now ?? (() => new Date()))().toISOString();
  const io_capability = args.io_capability ?? "READ_INDEX";
  const blockers: string[] = [];

  const mutationPreflight = args.apply
    ? buildRpwfeOfficialGeSupabaseParityMutationPreflightV1({
        rootDir: args.rootDir,
        mode: "apply",
        planRel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
        plan: { filter_slug: FILTER_SLUG },
        io_capability,
        now: args.now,
        readText: readTextFile,
      })
    : null;
  const mutation_authorized = args.apply
    ? rpwfeOfficialGeSupabaseParityMutationAuthorizedV1(mutationPreflight!)
    : false;
  if (mutationPreflight && mutationPreflight.blockers.length > 0) {
    blockers.push(...mutationPreflight.blockers);
  }
  if (args.mutationGateRef) {
    args.mutationGateRef.authorized = mutation_authorized;
  }

  const rows = loadFridgeRetailerLinksCsvRowsV1({
    rootDir: args.rootDir,
    fileExists,
    readText: readTextFile,
  });
  const repoRow = findRpwfeRepoRow(rows);
  const rpwfeRepoRowCount = rows.filter((r) => r.filter_slug?.trim().toLowerCase() === FILTER_SLUG).length;
  blockers.push(...validateRpwfeSupabaseParityApplyPreconditionsV1({ repoRow, rpwfeRepoRowCount }));

  let beforeRow: RpwfeSupabaseRetailerLinkRowV1 | null = null;
  let projectedPatch: Record<string, unknown> | null = null;
  let afterLoaded: RpwfeSupabaseRetailerLinkRowV1 | null = null;
  let rowsUpdated = 0;
  let applyStatus: RpwfeSupabaseParityApplyStatusV1 = "BLOCKED";

  if (blockers.length === 0 && repoRow) {
    projectedPatch = buildRpwfeSupabaseUpdatePatchFromRepoCsvRowV1(repoRow);
    const filterId = await args.deps.resolveFilterIdBySlug(FILTER_SLUG);
    if (!filterId) {
      blockers.push("supabase_filters_slug_rpwfe_not_found");
    } else {
      const matches = await args.deps.fetchPrimaryOemRow(filterId);
      if (matches.length === 0) {
        blockers.push("supabase_primary_oem_row_missing");
      } else if (matches.length > 1) {
        blockers.push(`supabase_primary_oem_row_count_gt_one:${matches.length}`);
      } else {
        beforeRow = matches[0]!;
        if (dbRowMatchesRepoCsvForParityV1(beforeRow, repoRow)) {
          applyStatus = "ALREADY_APPLIED";
        } else if (blockers.length === 0) {
          applyStatus = args.apply ? "APPLIED" : "DRY_RUN_READY";
          if (args.apply && mutation_authorized) {
            await args.deps.updateRowById(beforeRow.id, projectedPatch);
            rowsUpdated = 1;
            const reloaded = await args.deps.fetchPrimaryOemRow(filterId);
            if (reloaded.length !== 1) {
              blockers.push(`post_apply_reload_row_count_not_one:${reloaded.length}`);
              applyStatus = "BLOCKED";
            } else {
              afterLoaded = reloaded[0]!;
              if (!dbRowMatchesRepoCsvForParityV1(afterLoaded, repoRow)) {
                blockers.push("post_apply_supabase_row_does_not_match_repo_csv");
                applyStatus = "BLOCKED";
              }
            }
          }
        }
      }
    }
  }

  let postParityStatus: RpwfeOfficialGeSupabaseParityPlanLaneV1["proposed_supabase_parity_status"] | null =
    null;
  let postGate: string | null = null;
  let postState: string | null = null;
  let postSafeCta = false;

  if (blockers.length === 0 && repoRow && (applyStatus === "APPLIED" || applyStatus === "ALREADY_APPLIED")) {
    const supabase = await args.deps.loadSupabaseSnapshot([FILTER_SLUG]);
    const parityLane = buildRpwfeOfficialGeSupabaseParityPlanLaneFromInputsV1({
      repoCsvRow: repoRow,
      supabase,
    });
    postParityStatus = parityLane.proposed_supabase_parity_status;
    if (postParityStatus !== "SUPABASE_MATCHES_REPO_CSV") {
      blockers.push(`post_apply_parity_status:${postParityStatus}`);
      applyStatus = "BLOCKED";
    }
    const verifyRow = afterLoaded ?? beforeRow;
    if (verifyRow) {
      postGate = buyLinkGateFailureKind({
        retailer_key: verifyRow.retailer_key,
        affiliate_url: verifyRow.affiliate_url,
        browser_truth_classification: verifyRow.browser_truth_classification,
        browser_truth_buyable_subtype: null,
        browser_truth_checked_at: verifyRow.browser_truth_checked_at,
      }, { now: args.now?.() });
      postState = mapSignalsToRetailerLinkState({
        browserTruthClassification: verifyRow.browser_truth_classification,
        gateFailureKind: postGate,
      });
      postSafeCta = isDirectBuyableSafeCtaRow({
        retailer_key: verifyRow.retailer_key,
        affiliate_url: verifyRow.affiliate_url,
        browser_truth_classification: verifyRow.browser_truth_classification,
        browser_truth_buyable_subtype: null,
        browser_truth_checked_at: verifyRow.browser_truth_checked_at,
        browser_truth_notes: verifyRow.browser_truth_notes,
      });
    }
  }

  const run: RpwfeOfficialGeSupabaseParityApplyRunV1 = {
    contract: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_CONTRACT_V1,
    generated_at: generatedAt,
    mode: args.apply ? "apply" : "dry_run",
    data_mutation: args.apply && rowsUpdated > 0,
    owner_supabase_apply_authorized: mutation_authorized,
    mutation_authorized,
    mutation_preflight_blockers: mutationPreflight?.blockers ?? [],
    founder_decision_id: mutationPreflight?.founder_decision_id ?? null,
    io_capability,
    apply_artifact_rel: RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_ARTIFACT_REL_V1,
    target_table: TARGET_TABLE,
    filter_slug: FILTER_SLUG,
    apply_status: blockers.length > 0 ? "BLOCKED" : applyStatus,
    target_update_count: applyStatus === "DRY_RUN_READY" || applyStatus === "APPLIED" ? 1 : 0,
    rows_updated: rowsUpdated,
    browser_evidence_artifact_path: RPWFE_OFFICIAL_GE_ARTIFACT_REL_V1,
    repo_csv_row: repoRow,
    before_supabase_row: beforeRow,
    after_supabase_row_projected: projectedPatch,
    after_supabase_row_loaded: afterLoaded,
    post_apply_parity_status: postParityStatus,
    post_apply_gate_failure_kind: postGate,
    post_apply_retailer_link_state: postState,
    post_apply_is_direct_buyable_safe_cta: postSafeCta,
    waterdrop_in_patch: false,
    amazon_in_patch: false,
    compatible_replacement_in_patch: false,
    buckparts_verified_link_authorized: false,
    blockers,
    notes: [
      "Owner-authorized narrow Supabase parity: rpwfe primary oem-parts-catalog row only.",
      "Update-by-id only — no insert path.",
      "No Waterdrop, Amazon, or compatible-replacement rows added or authorized.",
    ],
  };

  if (args.apply) {
    const applyOutcome: TruthLedgerMutationApplyOutcomeV1 =
      run.apply_status === "BLOCKED" ? "blocked" : "applied";
    const record = recordTruthLedgerMutationOutcomeV1({
      rootDir: args.rootDir,
      io_capability,
      mutation_lane: "rpwfe_official_ge_supabase_parity_apply_v1",
      founder_decision_id: mutationPreflight?.founder_decision_id ?? null,
      apply_outcome: applyOutcome,
      blockers: run.blockers,
      now: args.now,
    });
    if (!record.ok) {
      run.blockers.push(...record.blockers);
      run.apply_status = "BLOCKED";
    }
  }

  if (args.apply || run.apply_status !== "BLOCKED") {
    const runAbs = path.join(args.rootDir, RPWFE_OFFICIAL_GE_SUPABASE_PARITY_APPLY_RUN_REL_V1);
    mkdirSync(path.dirname(runAbs), { recursive: true });
    writeTextFile(runAbs, `${JSON.stringify(run, null, 2)}\n`);
  }

  return run;
}

export function createRpwfeSupabaseParityLiveDepsV1(
  getSupabaseAdmin: () => import("@supabase/supabase-js").SupabaseClient,
  mutationGateRef?: { authorized: boolean },
): RpwfeSupabaseParityApplyDepsV1 {
  const SELECT_COLS =
    "id, filter_id, retailer_name, affiliate_url, destination_url, retailer_key, retailer_slug, is_primary, browser_truth_classification, browser_truth_notes, browser_truth_checked_at";

  return {
    async resolveFilterIdBySlug(slug) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("filters")
        .select("id")
        .ilike("slug", slug.trim())
        .maybeSingle();
      if (error) throw error;
      return (data as { id: string } | null)?.id ?? null;
    },
    async fetchPrimaryOemRow(filterId) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("retailer_links")
        .select(SELECT_COLS)
        .eq("filter_id", filterId)
        .eq("retailer_key", RETAILER_KEY)
        .eq("is_primary", true);
      if (error) throw error;
      return (data ?? []) as RpwfeSupabaseRetailerLinkRowV1[];
    },
    async updateRowById(id, patch) {
      if (mutationGateRef && !mutationGateRef.authorized) {
        throw new Error("RPWFE_OFFICIAL_GE_SUPABASE_PARITY_MUTATION_NOT_AUTHORIZED");
      }
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("retailer_links").update(patch).eq("id", id);
      if (error) throw error;
    },
    async loadSupabaseSnapshot(slugs) {
      const { tryLoadSupabaseRetailerLinksBySlugV1 } = await import(
        "./fridge-supabase-vs-csv-retailer-links-diff-v1"
      );
      return tryLoadSupabaseRetailerLinksBySlugV1(slugs);
    },
  };
}
