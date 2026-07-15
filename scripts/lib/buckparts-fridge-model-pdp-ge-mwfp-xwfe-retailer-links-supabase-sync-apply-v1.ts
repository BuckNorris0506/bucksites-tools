/**
 * Guarded GE MWFP/XWFE Supabase public.retailer_links sync apply.
 * UPDATE existing primaries only (smartwater-mwfp + xwfe). Dry-run default.
 * Write requires MUTATION + matching Supabase-sync founder approval + stale search-placeholder pretest.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isSearchPlaceholderBuyLink } from "@/lib/retailers/launch-buy-links";

import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  resolveIoCapabilityFromEnvV1,
} from "./buckparts-supabase-mutation-gate-core-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
  type GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-approval-v1";
import {
  loadScopedSupabasePrimariesV1,
  selectScopedCsvPrimaryRowsV1,
  type FridgeRetailerLinksScopedCsvPrimaryRowV1,
  type FridgeRetailerLinksScopedSupabasePrimaryRowV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_apply_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_apply_closeout_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_DRY_RUN_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply -- --write-artifacts" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1 =
  "BUCKPARTS_IO_CAPABILITY=MUTATION npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply -- --write" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-closeout-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-closeout-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_REPORT_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_REPORT_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1 =
  {
    "smartwater-mwfp":
      "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=MWFP",
    xwfe: "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=XWFE",
  } as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1 =
  {
    "smartwater-mwfp": "e3d9ca23-1be5-4fe7-b001-6dc4948331fe",
    xwfe: "e274568e-2998-4a93-8642-53862d2eb915",
  } as const;

type GeFilter = GeMwfpXwfeRetailerLinksSupabaseParityFilterSlugV1;

type ApprovalDeltaV1 = {
  filter_slug: string;
  change_kind?: string;
  supabase_link_id?: string;
  proposed_affiliate_url?: string;
  proposed_retailer_name?: string;
  proposed_retailer_key?: string;
  proposed_browser_truth_classification?: string;
  proposed_browser_truth_checked_at?: string;
  proposed_browser_truth_notes?: string;
};

type ApprovalRowV1 = {
  decision_id?: string;
  decision_status?: string;
  allowed_next_scope?: string;
  source_decision_packet_id?: string;
  expires_at?: string;
  review_after?: string | null;
  bound_artifacts_v1?: Array<{
    artifact_rel_path?: string;
    sha256_at_binding?: string;
    entry_type?: string;
  }>;
  buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1?: {
    approved_filter_slugs?: string[];
    approved_updates?: number;
    approved_inserts?: number;
    approved_deletes?: number;
    allowed_future_mutation_type?: string;
    xwf_promotion_authorized?: boolean;
    retailer_links_csv_mutation_authorized?: boolean;
    pages_claimed_closed?: boolean;
    conversion_claimed?: boolean;
    approved_deltas?: ApprovalDeltaV1[];
  };
};

export type GeMwfpXwfeSupabaseSyncApplyDesiredV1 = {
  filter_slug: GeFilter;
  supabase_link_id: string;
  affiliate_url: string;
  retailer_name: "GE Appliance Parts";
  retailer_key: "oem-parts-catalog";
  browser_truth_classification: "direct_buyable";
  browser_truth_checked_at: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1;
  browser_truth_notes: string;
};

export type GeMwfpXwfeSupabaseSyncApplyRowV1 = {
  filter_slug: GeFilter;
  planned_action: "update" | "none";
  csv_primary: FridgeRetailerLinksScopedCsvPrimaryRowV1<GeFilter> | null;
  supabase_primary: FridgeRetailerLinksScopedSupabasePrimaryRowV1 | null;
  primary_row_count: number | null;
  expected_stale_affiliate_url: string;
  expected_supabase_link_id: string;
  desired: GeMwfpXwfeSupabaseSyncApplyDesiredV1 | null;
  supabase_is_search_placeholder: boolean | null;
  stale_url_matches_expected: boolean | null;
  link_id_matches_approval: boolean | null;
  is_existing_primary: boolean | null;
  blockers: string[];
};

export type GeMwfpXwfeSupabaseSyncApplyReportV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CONTRACT_V1;
  read_only: boolean;
  data_mutation: false;
  mode: "dry_run" | "write";
  mutation_authorized: boolean;
  supabase_mutation_authorized: boolean;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  pages_claimed_closed: false;
  conversion_claimed: false;
  generated_at: string;
  dry_run_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_DRY_RUN_COMMAND_V1;
  write_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1;
  allowed_filter_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1;
  excluded_filter_slugs: readonly ["xwf"];
  row_count_planned: number;
  planned_updates: 2 | 0;
  planned_inserts: 0;
  planned_deletes: 0;
  founder_approval_present: boolean;
  founder_decision_id: string | null;
  supabase_truth_status: "CHECKED" | "UNKNOWN_DB_UNAVAILABLE";
  supabase_unavailable_reason: string | null;
  rows: GeMwfpXwfeSupabaseSyncApplyRowV1[];
  blockers: string[];
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

export type GeMwfpXwfeSupabaseSyncApplyCloseoutV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_CONTRACT_V1;
  read_only: true;
  data_mutation: true;
  mutation_authorized: true;
  generated_at: string;
  apply_status: "APPLIED";
  founder_decision_id: string;
  allowed_filter_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1;
  excluded_filter_slugs: readonly ["xwf"];
  rows_updated: 2;
  inserts: 0;
  deletes: 0;
  xwf_mutated: false;
  csv_mutated: false;
  pages_claimed_closed: false;
  conversion_claimed: false;
  updated_rows: Array<{
    filter_slug: GeFilter;
    supabase_link_id: string;
    before_affiliate_url: string;
    after_affiliate_url: string;
    after_retailer_name: string;
    after_retailer_key: string;
    after_browser_truth_classification: string;
    after_browser_truth_checked_at: string;
  }>;
  proven_facts: string[];
  unknown_facts: string[];
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function parseGeMwfpXwfeSupabaseSyncApplyArgvV1(argv: readonly string[]): {
  write: boolean;
  writeArtifacts: boolean;
} {
  if (argv.includes("--apply")) {
    throw new Error("Use --write (not --apply) with BUCKPARTS_IO_CAPABILITY=MUTATION.");
  }
  const write = argv.includes("--write");
  return {
    write,
    writeArtifacts: argv.includes("--write-artifacts") || !write,
  };
}

function loadApprovalDocV1(
  rootDir: string,
  readText: (abs: string) => string,
): { ok: boolean; row: ApprovalRowV1 | null; blockers: string[] } {
  const rel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_JSON_REL_V1;
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) {
    return { ok: false, row: null, blockers: [`founder_approval_missing:${rel}`] };
  }
  try {
    const doc = JSON.parse(readText(abs)) as {
      packet_contract?: string;
      rows?: ApprovalRowV1[];
    };
    if (
      doc.packet_contract !==
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1
    ) {
      return {
        ok: false,
        row: null,
        blockers: [`founder_approval_packet_contract_mismatch:${String(doc.packet_contract)}`],
      };
    }
    const row =
      (doc.rows ?? []).find(
        (r) =>
          r.decision_id ===
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
      ) ?? null;
    if (!row) {
      return {
        ok: false,
        row: null,
        blockers: [
          `founder_approval_decision_id_missing:${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1}`,
        ],
      };
    }
    return { ok: true, row, blockers: [] };
  } catch (err) {
    return {
      ok: false,
      row: null,
      blockers: [
        `founder_approval_unreadable:${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}

function verifyGeSyncApprovalBindingsV1(args: {
  row: ApprovalRowV1;
  rootDir: string;
  nowIso: string;
  readText: (abs: string) => string;
}): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (args.row.decision_status !== "approved") {
    blockers.push(`founder_approval_not_approved:${String(args.row.decision_status)}`);
  }
  if (args.row.allowed_next_scope !== "owner_mutation_approved") {
    blockers.push(`founder_approval_scope_mismatch:${String(args.row.allowed_next_scope)}`);
  }
  const now = Date.parse(args.nowIso);
  const exp = Date.parse(String(args.row.expires_at ?? ""));
  if (Number.isNaN(now) || Number.isNaN(exp) || now >= exp) {
    blockers.push("founder_approval_expired_or_unbounded");
  }
  if (args.row.review_after) {
    const rev = Date.parse(args.row.review_after);
    if (!Number.isNaN(rev) && now >= rev) blockers.push("founder_approval_past_review_after");
  }

  const bound = args.row.bound_artifacts_v1 ?? [];
  if (bound.length < 2) blockers.push("founder_approval_unbound_artifacts_v1");
  const allowedEntryTypes = new Set(["apply_plan", "evidence", "parity_proof"]);
  for (const [i, b] of bound.entries()) {
    const rel = String(b.artifact_rel_path ?? "").trim();
    const sha = String(b.sha256_at_binding ?? "").trim().toLowerCase();
    const entry = String(b.entry_type ?? "");
    if (!rel || !/^[a-f0-9]{64}$/.test(sha)) {
      blockers.push(`founder_approval_binding_malformed:${String(i)}`);
      continue;
    }
    if (!allowedEntryTypes.has(entry)) {
      blockers.push(`founder_approval_binding_entry_type:${entry}`);
    }
    const abs = path.join(args.rootDir, rel);
    if (!existsSync(abs)) {
      blockers.push(`founder_approval_bound_missing:${rel}`);
      continue;
    }
    const live = sha256Text(args.readText(abs));
    if (live !== sha) blockers.push(`founder_approval_bound_sha256_mismatch:${rel}`);
  }
  return { ok: blockers.length === 0, blockers };
}

function evaluateApprovalV1(args: {
  rootDir: string;
  nowIso: string;
  readText: (abs: string) => string;
}): {
  ok: boolean;
  present: boolean;
  decision_id: string | null;
  deltas_by_slug: Map<GeFilter, ApprovalDeltaV1>;
  blockers: string[];
} {
  const loaded = loadApprovalDocV1(args.rootDir, args.readText);
  const blockers = [...loaded.blockers];
  if (!loaded.row) {
    return {
      ok: false,
      present: false,
      decision_id: null,
      deltas_by_slug: new Map(),
      blockers,
    };
  }
  const row = loaded.row;
  const binding = verifyGeSyncApprovalBindingsV1({
    row,
    rootDir: args.rootDir,
    nowIso: args.nowIso,
    readText: args.readText,
  });
  blockers.push(...binding.blockers);

  if (
    row.source_decision_packet_id !==
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_CONTRACT_V1
  ) {
    blockers.push(
      `founder_approval_source_packet_mismatch:${String(row.source_decision_packet_id)}`,
    );
  }

  const ctx =
    row.buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_approval_context_v1;
  if (!ctx) {
    blockers.push("founder_approval_context_missing");
    return {
      ok: false,
      present: true,
      decision_id: row.decision_id ?? null,
      deltas_by_slug: new Map(),
      blockers,
    };
  }
  if (ctx.allowed_future_mutation_type !== "supabase_retailer_links_update_existing_primary_only") {
    blockers.push(
      `founder_approval_mutation_type_mismatch:${String(ctx.allowed_future_mutation_type)}`,
    );
  }
  if (ctx.approved_updates !== 2) blockers.push("founder_approval_updates_not_2");
  if (ctx.approved_inserts !== 0) blockers.push("founder_approval_inserts_not_0");
  if (ctx.approved_deletes !== 0) blockers.push("founder_approval_deletes_not_0");
  if (ctx.xwf_promotion_authorized !== false) blockers.push("founder_approval_xwf_not_false");
  if (ctx.retailer_links_csv_mutation_authorized !== false) {
    blockers.push("founder_approval_csv_mutation_not_false");
  }
  if (ctx.pages_claimed_closed !== false) blockers.push("founder_approval_pages_claimed_closed");
  if (ctx.conversion_claimed !== false) blockers.push("founder_approval_conversion_claimed");

  const approved = [...(ctx.approved_filter_slugs ?? [])].sort();
  const expected = [
    ...BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
  ].sort();
  if (JSON.stringify(approved) !== JSON.stringify(expected)) {
    blockers.push(`founder_approval_filter_scope_mismatch:${approved.join(",")}`);
  }
  if ((ctx.approved_filter_slugs ?? []).includes("xwf")) {
    blockers.push("founder_approval_includes_xwf");
  }

  const deltas_by_slug = new Map<GeFilter, ApprovalDeltaV1>();
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1) {
    const delta = (ctx.approved_deltas ?? []).find((d) => d.filter_slug === filter);
    if (!delta) {
      blockers.push(`founder_approval_delta_missing:${filter}`);
      continue;
    }
    if (delta.change_kind !== "update_existing_primary_row") {
      blockers.push(`founder_approval_delta_not_update:${filter}`);
    }
    const expectedUrl =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
    if (delta.proposed_affiliate_url !== expectedUrl) {
      blockers.push(`founder_approval_url_mismatch:${filter}`);
    }
    if (delta.proposed_retailer_name !== "GE Appliance Parts") {
      blockers.push(`founder_approval_retailer_name_mismatch:${filter}`);
    }
    if (delta.proposed_retailer_key !== "oem-parts-catalog") {
      blockers.push(`founder_approval_retailer_key_mismatch:${filter}`);
    }
    if (delta.proposed_browser_truth_classification !== "direct_buyable") {
      blockers.push(`founder_approval_browser_truth_mismatch:${filter}`);
    }
    if (
      delta.proposed_browser_truth_checked_at !==
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1
    ) {
      blockers.push(`founder_approval_checked_at_mismatch:${filter}`);
    }
    if (
      delta.supabase_link_id !==
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[filter]
    ) {
      blockers.push(`founder_approval_link_id_mismatch:${filter}`);
    }
    if (
      !delta.proposed_browser_truth_notes ||
      !/owner browser proof/i.test(delta.proposed_browser_truth_notes) ||
      !/owner-review/i.test(delta.proposed_browser_truth_notes) ||
      /pages closed|conversion proven/i.test(delta.proposed_browser_truth_notes)
    ) {
      blockers.push(`founder_approval_notes_invalid:${filter}`);
    }
    deltas_by_slug.set(filter, delta);
  }

  return {
    ok: blockers.length === 0,
    present: true,
    decision_id: row.decision_id ?? null,
    deltas_by_slug,
    blockers,
  };
}

async function countPrimaryRowsV1(args: {
  filterId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
}): Promise<number> {
  const { data, error } = await args.supabase
    .from("retailer_links")
    .select("id, is_primary")
    .eq("filter_id", args.filterId);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ is_primary?: boolean | null }>;
  return rows.filter((r) => r.is_primary === true || r.is_primary === ("true" as never)).length;
}

export async function buildGeMwfpXwfeSupabaseSyncApplyReportV1(args: {
  rootDir: string;
  mode?: "dry_run" | "write";
  now?: () => Date;
  readText?: (abs: string) => string;
  loadSupabase?: typeof loadScopedSupabasePrimariesV1<GeFilter>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSupabaseAdmin?: () => any;
  loadEnv?: () => void;
}): Promise<GeMwfpXwfeSupabaseSyncApplyReportV1> {
  const now = args.now ?? (() => new Date());
  const mode = args.mode ?? "dry_run";
  const readText = args.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const generated_at = now().toISOString();
  const blockers: string[] = [];

  const approval = evaluateApprovalV1({
    rootDir: args.rootDir,
    nowIso: generated_at,
    readText,
  });
  blockers.push(...approval.blockers);

  const csvRows = selectScopedCsvPrimaryRowsV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    rootDir: args.rootDir,
    readText,
  });
  const csvBySlug = new Map(csvRows.map((r) => [r.filter_slug, r]));

  const loadSupabase = args.loadSupabase ?? loadScopedSupabasePrimariesV1;
  const supabaseLoad = await loadSupabase({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    slugs: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
  });

  const rows: GeMwfpXwfeSupabaseSyncApplyRowV1[] = [];

  if (supabaseLoad.status === "UNKNOWN_DB_UNAVAILABLE") {
    for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1) {
      rows.push({
        filter_slug: filter,
        planned_action: "none",
        csv_primary: csvBySlug.get(filter) ?? null,
        supabase_primary: null,
        primary_row_count: null,
        expected_stale_affiliate_url:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
            filter
          ],
        expected_supabase_link_id:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
            filter
          ],
        desired: null,
        supabase_is_search_placeholder: null,
        stale_url_matches_expected: null,
        link_id_matches_approval: null,
        is_existing_primary: null,
        blockers: [`supabase_unavailable:${supabaseLoad.reason}`],
      });
    }
    return {
      contract:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CONTRACT_V1,
      read_only: true,
      data_mutation: false,
      mode,
      mutation_authorized: false,
      supabase_mutation_authorized: false,
      csv_mutation_authorized: false,
      buy_cta_authorized: false,
      pages_claimed_closed: false,
      conversion_claimed: false,
      generated_at,
      dry_run_command:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_DRY_RUN_COMMAND_V1,
      write_command:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1,
      allowed_filter_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
      excluded_filter_slugs: ["xwf"],
      row_count_planned: 0,
      planned_updates: 0,
      planned_inserts: 0,
      planned_deletes: 0,
      founder_approval_present: approval.present,
      founder_decision_id: approval.decision_id,
      supabase_truth_status: "UNKNOWN_DB_UNAVAILABLE",
      supabase_unavailable_reason: supabaseLoad.reason,
      rows,
      blockers: Array.from(new Set([...blockers, `supabase_unavailable:${supabaseLoad.reason}`])),
      proven_facts: [
        "PROVEN: filter scope exactly smartwater-mwfp + xwfe; xwf excluded; inserts/deletes=0.",
        "PROVEN: pages_claimed_closed=false; conversion_claimed=false.",
      ],
      unknown_facts: ["UNKNOWN: Supabase retailer_links not readable in this environment."],
      recommended_next_action:
        "Configure service-role env and re-run dry-run before any guarded write.",
    };
  }

  let primaryCounts: Map<GeFilter, number> | null = null;
  try {
    const loadEnv = args.loadEnv ?? (await import("./load-env")).loadEnv;
    const getSupabaseAdmin =
      args.getSupabaseAdmin ?? (await import("./supabase-admin")).getSupabaseAdmin;
    loadEnv();
    const supabase = getSupabaseAdmin();
    primaryCounts = new Map();
    for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1) {
      const filterId = supabaseLoad.filter_id_by_slug.get(filter);
      if (!filterId) {
        primaryCounts.set(filter, 0);
        continue;
      }
      primaryCounts.set(filter, await countPrimaryRowsV1({ filterId, supabase }));
    }
  } catch (err) {
    blockers.push(
      `primary_count_unavailable:${err instanceof Error ? err.message : String(err)}`,
    );
  }

  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1) {
    const rowBlockers: string[] = [];
    const csv = csvBySlug.get(filter) ?? null;
    const sb = supabaseLoad.by_slug.get(filter) ?? null;
    const expectedStale =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_STALE_URLS_V1[
        filter
      ];
    const expectedId =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_EXPECTED_LINK_IDS_V1[
        filter
      ];
    const delta = approval.deltas_by_slug.get(filter) ?? null;
    const primaryCount = primaryCounts?.get(filter) ?? null;

    if (!csv) rowBlockers.push(`csv_primary_missing:${filter}`);
    else {
      const expectedUrl =
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
      if (csv.affiliate_url !== expectedUrl) {
        rowBlockers.push(`csv_url_not_approved_pdp:${filter}`);
      }
      if (csv.browser_truth_classification !== "direct_buyable") {
        rowBlockers.push(`csv_not_direct_buyable:${filter}`);
      }
    }
    if (!sb) rowBlockers.push(`supabase_primary_missing:${filter}`);
    if (primaryCount === 0) rowBlockers.push(`supabase_primary_missing_count:${filter}`);
    if (primaryCount != null && primaryCount > 1) {
      rowBlockers.push(`duplicate_primary_rows:${filter}:${String(primaryCount)}`);
    }

    const isExistingPrimary = sb ? sb.is_primary === true && Boolean(sb.id) : null;
    if (isExistingPrimary === false) rowBlockers.push(`supabase_not_existing_primary:${filter}`);

    const linkIdMatch = sb?.id != null ? sb.id === expectedId : null;
    if (linkIdMatch === false) rowBlockers.push(`supabase_link_id_mismatch:${filter}`);
    if (sb?.id == null) rowBlockers.push(`supabase_link_id_missing:${filter}`);

    const staleMatch = sb ? sb.affiliate_url === expectedStale : null;
    if (staleMatch === false) {
      rowBlockers.push(`unexpected_current_url:${filter}`);
    }

    const placeholder =
      sb == null ? null : isSearchPlaceholderBuyLink(sb.retailer_key, sb.affiliate_url);
    if (placeholder === false) {
      rowBlockers.push(`current_not_search_placeholder:${filter}`);
    }
    if (placeholder === null && sb) {
      rowBlockers.push(`placeholder_unknown:${filter}`);
    }

    let desired: GeMwfpXwfeSupabaseSyncApplyDesiredV1 | null = null;
    if (delta && delta.proposed_browser_truth_notes && delta.supabase_link_id) {
      desired = {
        filter_slug: filter,
        supabase_link_id: delta.supabase_link_id,
        affiliate_url:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter],
        retailer_name: "GE Appliance Parts",
        retailer_key: "oem-parts-catalog",
        browser_truth_classification: "direct_buyable",
        browser_truth_checked_at:
          BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_BROWSER_TRUTH_CHECKED_AT_V1,
        browser_truth_notes: delta.proposed_browser_truth_notes,
      };
    }

    const planned_action: "update" | "none" =
      rowBlockers.length === 0 && desired && sb ? "update" : "none";

    rows.push({
      filter_slug: filter,
      planned_action,
      csv_primary: csv,
      supabase_primary: sb,
      primary_row_count: primaryCount,
      expected_stale_affiliate_url: expectedStale,
      expected_supabase_link_id: expectedId,
      desired,
      supabase_is_search_placeholder: placeholder,
      stale_url_matches_expected: staleMatch,
      link_id_matches_approval: linkIdMatch,
      is_existing_primary: isExistingPrimary,
      blockers: rowBlockers,
    });
    blockers.push(...rowBlockers);
  }

  const plannedUpdates = rows.filter((r) => r.planned_action === "update").length;
  if (plannedUpdates !== 2) {
    blockers.push(`planned_updates_not_2:${String(plannedUpdates)}`);
  }
  if (rows.some((r) => r.planned_action !== "update" && r.planned_action !== "none")) {
    blockers.push("non_update_action_detected");
  }
  // Fail closed: never plan inserts/deletes.
  blockers.push(...(plannedUpdates > 2 ? ["planned_updates_exceed_2"] : []));

  const io = resolveIoCapabilityFromEnvV1();
  const mutationGate = buildSupabaseMutationGatePreflightV1({
    mode: mode === "write" ? "write" : "dry_run",
    io_capability: io,
  });
  if (mode === "write") {
    blockers.push(...mutationGate.blockers);
    if (io !== "MUTATION") blockers.push("io_capability_read_index_cannot_mutate_supabase");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  const mutation_authorized =
    mode === "write" &&
    approval.ok &&
    uniqueBlockers.filter((b) => !b.startsWith("io_capability")).length === 0 &&
    io === "MUTATION" &&
    plannedUpdates === 2 &&
    rows.every((r) => r.planned_action === "update");

  // When authorized, clear soft blocker leftovers that contradict authorization.
  const reportBlockers = mutation_authorized
    ? []
    : mode === "write"
      ? uniqueBlockers
      : uniqueBlockers.filter(
          (b) =>
            !b.startsWith("io_capability") &&
            b !== "BUCKPARTS_IO_CAPABILITY must be MUTATION for write/apply",
        );

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CONTRACT_V1,
    read_only: mode !== "write",
    data_mutation: false,
    mode,
    mutation_authorized,
    supabase_mutation_authorized: mutation_authorized,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    pages_claimed_closed: false,
    conversion_claimed: false,
    generated_at,
    dry_run_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_DRY_RUN_COMMAND_V1,
    write_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1,
    allowed_filter_slugs:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
    excluded_filter_slugs: ["xwf"],
    row_count_planned: plannedUpdates,
    planned_updates: plannedUpdates === 2 ? 2 : 0,
    planned_inserts: 0,
    planned_deletes: 0,
    founder_approval_present: approval.present && approval.ok,
    founder_decision_id: approval.decision_id,
    supabase_truth_status: "CHECKED",
    supabase_unavailable_reason: null,
    rows,
    blockers: reportBlockers,
    proven_facts: [
      "PROVEN: filter scope exactly smartwater-mwfp + xwfe; xwf excluded.",
      "PROVEN: planned_inserts=0; planned_deletes=0; UPDATE existing primary only.",
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false; csv_mutation_authorized=false.",
      ...(approval.decision_id
        ? [`PROVEN: founder_decision_id=${approval.decision_id}.`]
        : []),
      ...(mutation_authorized
        ? ["PROVEN: write-mode mutation_authorized=true for exact 2 UPDATE ops."]
        : []),
    ],
    unknown_facts: [
      "UNKNOWN: CTA/go outcome after write until proof re-run.",
      "UNKNOWN: conversion/revenue impact.",
    ],
    recommended_next_action:
      mode === "dry_run"
        ? plannedUpdates === 2 && approval.ok && reportBlockers.length === 0
          ? `Dry-run READY. Run ${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_WRITE_COMMAND_V1}`
          : "Resolve dry-run blockers (approval/stale-state/scope) before write."
        : mutation_authorized
          ? "Write authorized — apply exactly 2 public.retailer_links UPDATEs."
          : "WRITE BLOCKED: approve match + stale search-placeholder + MUTATION required.",
  };
}

export async function applyGeMwfpXwfeSupabaseSyncWriteV1(args: {
  rootDir: string;
  report: GeMwfpXwfeSupabaseSyncApplyReportV1;
  now?: () => Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSupabaseAdmin?: () => any;
  loadEnv?: () => void;
}): Promise<{
  applied: true;
  updated: 2;
  inserted: 0;
  deleted: 0;
  closeout: GeMwfpXwfeSupabaseSyncApplyCloseoutV1;
  closeout_json_rel: string;
  closeout_md_rel: string;
}> {
  const now = args.now ?? (() => new Date());
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "write",
    io_capability: resolveIoCapabilityFromEnvV1(),
  });
  assertSupabaseMutationAuthorizedV1(preflight);
  if (!args.report.mutation_authorized) {
    throw new Error("GE_MWFP_XWFE_SUPABASE_SYNC_MUTATION_NOT_AUTHORIZED");
  }
  const updateRows = args.report.rows.filter((r) => r.planned_action === "update");
  if (updateRows.length !== 2) {
    throw new Error(`Expected exactly 2 update rows, got ${String(updateRows.length)}`);
  }
  for (const r of updateRows) {
    if (!r.desired || !r.supabase_primary?.id || !r.supabase_primary.filter_id) {
      throw new Error(`Incomplete update row for ${r.filter_slug}`);
    }
    if (r.filter_slug === ("xwf" as never)) throw new Error("refusing xwf mutation");
    if (r.desired.supabase_link_id !== r.supabase_primary.id) {
      throw new Error(`link id drift for ${r.filter_slug}`);
    }
  }

  const loadEnv = args.loadEnv ?? (await import("./load-env")).loadEnv;
  const getSupabaseAdmin =
    args.getSupabaseAdmin ?? (await import("./supabase-admin")).getSupabaseAdmin;
  loadEnv();
  const supabase = getSupabaseAdmin();

  const updated_rows: GeMwfpXwfeSupabaseSyncApplyCloseoutV1["updated_rows"] = [];
  for (const r of updateRows) {
    const desired = r.desired!;
    const payload = {
      affiliate_url: desired.affiliate_url,
      retailer_name: desired.retailer_name,
      retailer_key: desired.retailer_key,
      is_primary: true,
      browser_truth_classification: desired.browser_truth_classification,
      browser_truth_notes: desired.browser_truth_notes,
      browser_truth_checked_at: desired.browser_truth_checked_at,
      destination_url: desired.affiliate_url,
    };
    const { error, count } = await supabase
      .from("retailer_links")
      .update(payload, { count: "exact" })
      .eq("id", desired.supabase_link_id)
      .eq("filter_id", r.supabase_primary!.filter_id)
      .eq("is_primary", true);
    if (error) throw new Error(error.message);
    if (typeof count === "number" && count !== 1) {
      throw new Error(
        `Expected exactly 1 updated row for ${r.filter_slug}, got ${String(count)}`,
      );
    }
    updated_rows.push({
      filter_slug: r.filter_slug,
      supabase_link_id: desired.supabase_link_id,
      before_affiliate_url: r.supabase_primary!.affiliate_url,
      after_affiliate_url: desired.affiliate_url,
      after_retailer_name: desired.retailer_name,
      after_retailer_key: desired.retailer_key,
      after_browser_truth_classification: desired.browser_truth_classification,
      after_browser_truth_checked_at: desired.browser_truth_checked_at,
    });
  }

  const closeout: GeMwfpXwfeSupabaseSyncApplyCloseoutV1 = {
    contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_CONTRACT_V1,
    read_only: true,
    data_mutation: true,
    mutation_authorized: true,
    generated_at: now().toISOString(),
    apply_status: "APPLIED",
    founder_decision_id:
      args.report.founder_decision_id ??
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_APPROVAL_DECISION_ID_V1,
    allowed_filter_slugs:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
    excluded_filter_slugs: ["xwf"],
    rows_updated: 2,
    inserts: 0,
    deletes: 0,
    xwf_mutated: false,
    csv_mutated: false,
    pages_claimed_closed: false,
    conversion_claimed: false,
    updated_rows,
    proven_facts: [
      "PROVEN: updated exactly 2 existing public.retailer_links primaries (smartwater-mwfp + xwfe).",
      "PROVEN: inserts=0; deletes=0; xwf_mutated=false; csv_mutated=false.",
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false.",
    ],
    unknown_facts: [
      "UNKNOWN: CTA/go after write until re-proof.",
      "UNKNOWN: conversion/revenue.",
    ],
  };

  const written = writeGeMwfpXwfeSupabaseSyncApplyCloseoutArtifactsV1({
    rootDir: args.rootDir,
    closeout,
  });
  return {
    applied: true,
    updated: 2,
    inserted: 0,
    deleted: 0,
    closeout,
    closeout_json_rel: written.json_rel_path,
    closeout_md_rel: written.md_rel_path,
  };
}

export function renderGeMwfpXwfeSupabaseSyncApplyMarkdownV1(
  report: GeMwfpXwfeSupabaseSyncApplyReportV1,
): string {
  const lines = [
    "# GE MWFP/XWFE Supabase retailer_links sync apply",
    "",
    `- contract: \`${report.contract}\``,
    `- mode: **${report.mode}**`,
    `- mutation_authorized: \`${String(report.mutation_authorized)}\``,
    `- founder_approval_present: \`${String(report.founder_approval_present)}\``,
    `- planned_updates: **${String(report.row_count_planned)}**`,
    `- pages_claimed_closed: \`${String(report.pages_claimed_closed)}\``,
    "",
    "## Rows",
    "",
  ];
  for (const r of report.rows) {
    lines.push(`### \`${r.filter_slug}\``);
    lines.push("");
    lines.push(`- planned_action: \`${r.planned_action}\``);
    lines.push(`- current_url: \`${r.supabase_primary?.affiliate_url ?? "(missing)"}\``);
    lines.push(`- expected_stale: \`${r.expected_stale_affiliate_url}\``);
    lines.push(`- desired_url: \`${r.desired?.affiliate_url ?? "(none)"}\``);
    lines.push(`- blockers: ${r.blockers.length ? r.blockers.join("; ") : "(none)"}`);
    lines.push("");
  }
  lines.push("## Report blockers");
  lines.push("");
  if (report.blockers.length === 0) lines.push("- (none)");
  else for (const b of report.blockers) lines.push(`- ${b}`);
  lines.push("");
  lines.push(report.recommended_next_action);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function renderGeMwfpXwfeSupabaseSyncApplyCloseoutMarkdownV1(
  closeout: GeMwfpXwfeSupabaseSyncApplyCloseoutV1,
): string {
  const lines = [
    "# GE MWFP/XWFE Supabase sync apply closeout",
    "",
    `- apply_status: **${closeout.apply_status}**`,
    `- rows_updated: **${String(closeout.rows_updated)}**`,
    `- inserts: \`${String(closeout.inserts)}\``,
    `- deletes: \`${String(closeout.deletes)}\``,
    `- xwf_mutated: \`${String(closeout.xwf_mutated)}\``,
    `- pages_claimed_closed: \`${String(closeout.pages_claimed_closed)}\``,
    "",
    "## Updated rows",
    "",
  ];
  for (const u of closeout.updated_rows) {
    lines.push(`### \`${u.filter_slug}\``);
    lines.push("");
    lines.push(`- id: \`${u.supabase_link_id}\``);
    lines.push(`- before: \`${u.before_affiliate_url}\``);
    lines.push(`- after: \`${u.after_affiliate_url}\``);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function writeGeMwfpXwfeSupabaseSyncApplyReportArtifactsV1(args: {
  rootDir: string;
  report: GeMwfpXwfeSupabaseSyncApplyReportV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_REPORT_JSON_REL_V1;
  const mdRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_REPORT_MD_REL_V1;
  mkdirSync(path.dirname(path.join(args.rootDir, jsonRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, jsonRel),
    `${JSON.stringify(args.report, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, mdRel),
    renderGeMwfpXwfeSupabaseSyncApplyMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}

export function writeGeMwfpXwfeSupabaseSyncApplyCloseoutArtifactsV1(args: {
  rootDir: string;
  closeout: GeMwfpXwfeSupabaseSyncApplyCloseoutV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_JSON_REL_V1;
  const mdRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_APPLY_CLOSEOUT_MD_REL_V1;
  mkdirSync(path.dirname(path.join(args.rootDir, jsonRel)), { recursive: true });
  writeFileSync(
    path.join(args.rootDir, jsonRel),
    `${JSON.stringify(args.closeout, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(args.rootDir, mdRel),
    renderGeMwfpXwfeSupabaseSyncApplyCloseoutMarkdownV1(args.closeout),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}

/** Test helper: assert notes cite proof + owner-review without overclaim. */
export function geMwfpXwfeSupabaseSyncNotesAreSafeV1(notes: string): boolean {
  return (
    /owner browser proof/i.test(notes) &&
    /owner-review/i.test(notes) &&
    !/pages closed|conversion proven|revenue proven/i.test(notes)
  );
}

export function geMwfpXwfeSupabaseSyncApplySourceSha256V1(rootDir: string): string {
  return sha256Text(
    readFileSync(
      path.join(
        rootDir,
        "scripts/lib/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-apply-v1.ts",
      ),
      "utf8",
    ),
  );
}
