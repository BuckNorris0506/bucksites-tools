/**
 * Read-only GE MWFP/XWFE Supabase retailer_links sync owner-review plan.
 * Scope: smartwater-mwfp + xwfe only (xwf excluded). Affected models: 4 GE slugs.
 * Hard-stop: no Supabase write, no founder approval stamp, no CSV mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-guarded-apply-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-owner-approval-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
} from "./buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-parity-v1";
import {
  selectScopedCsvPrimaryRowsV1,
  type FridgeRetailerLinksScopedCsvPrimaryRowV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_ge_mwfp_xwfe_retailer_links_supabase_sync_owner_review_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review" as const;

/** Exact allowlisted dispatch command (writes drafts only). */
export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1 =
  BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-ge-mwfp-xwfe-retailer-links-supabase-sync-owner-review-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_MD_REL_V1,
  ] as const;

type GeFilter = (typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1)[number];

type ParityArtifactV1 = {
  contract?: string;
  overall_sync_status?: string;
  any_supabase_search_placeholder?: boolean | null;
  filter_rows?: Array<{
    filter_slug?: string;
    sync_status?: string;
    csv_primary?: FridgeRetailerLinksScopedCsvPrimaryRowV1<GeFilter> | null;
    supabase_primary?: {
      id?: string | null;
      affiliate_url?: string;
      retailer_name?: string;
      browser_truth_classification?: string;
    } | null;
    supabase_is_search_placeholder?: boolean | null;
  }>;
};

export type GeMwfpXwfeSupabaseSyncPlannedUpdateV1 = {
  filter_slug: GeFilter;
  change_kind: "update_existing_primary_from_csv";
  supabase_link_id: string | null;
  before_affiliate_url: string | null;
  after_affiliate_url: string;
  before_retailer_name: string | null;
  after_retailer_name: string;
  before_browser_truth_classification: string | null;
  after_browser_truth_classification: "direct_buyable";
  after_retailer_key: "oem-parts-catalog";
  supabase_was_search_placeholder: boolean | null;
};

export type GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  apply_authorized: false;
  founder_approval_created: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_csv_mutation_authorized: false;
  pages_claimed_closed: false;
  conversion_claimed: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_SOURCE_COMMAND_V1;
  exact_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1;
  parity_artifact_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1;
  closeout_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1;
  overall_sync_status_required: "DRIFTED";
  overall_sync_status_observed: string;
  any_supabase_search_placeholder: boolean | null;
  scope: {
    filter_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1;
    excluded_filter_slugs: readonly ["xwf"];
    affected_model_slugs: typeof BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1;
    max_planned_updates: 2;
  };
  planned_updates: GeMwfpXwfeSupabaseSyncPlannedUpdateV1[];
  gate_conditions_for_future_apply: string[];
  hard_stop: {
    supabase_write_authorized: false;
    founder_approval_required_before_write: true;
    next_forbidden_actions: readonly string[];
  };
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

function loadParityArtifactV1(rootDir: string, readText: (abs: string) => string): ParityArtifactV1 {
  const abs = path.join(
    rootDir,
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
  );
  if (!existsSync(abs)) {
    throw new Error(
      `Missing parity artifact: ${BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1}`,
    );
  }
  return JSON.parse(readText(abs)) as ParityArtifactV1;
}

export function parseGeMwfpXwfeSupabaseSyncOwnerReviewArgvV1(argv: readonly string[]): {
  writeArtifacts: boolean;
} {
  if (argv.includes("--write") || argv.includes("--apply")) {
    throw new Error(
      "This owner-review lane is read-only. Use --write-artifacts only. Supabase write / --apply is forbidden.",
    );
  }
  return { writeArtifacts: argv.includes("--write-artifacts") };
}

export function buildGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1(deps: {
  rootDir: string;
  now?: () => Date;
  readText?: (abs: string) => string;
}): GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1 {
  const now = deps.now ?? (() => new Date());
  const readText = deps.readText ?? ((abs) => readFileSync(abs, "utf8"));
  const parity = loadParityArtifactV1(deps.rootDir, readText);
  const overall = String(parity.overall_sync_status ?? "UNKNOWN");
  if (overall !== "DRIFTED") {
    throw new Error(
      `Owner-review requires overall_sync_status=DRIFTED (got ${overall}). Re-run supabase-parity proof first.`,
    );
  }

  const csvRows = selectScopedCsvPrimaryRowsV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_LANE_V1,
    rootDir: deps.rootDir,
    readText,
  });
  const csvBySlug = new Map(csvRows.map((r) => [r.filter_slug, r]));
  const parityBySlug = new Map(
    (parity.filter_rows ?? []).map((r) => [String(r.filter_slug ?? "").toLowerCase(), r]),
  );

  const planned_updates: GeMwfpXwfeSupabaseSyncPlannedUpdateV1[] = [];
  for (const filter of BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1) {
    const csv = csvBySlug.get(filter);
    if (!csv) {
      throw new Error(`CSV primary missing for ${filter}`);
    }
    const expectedUrl =
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_OWNER_APPROVAL_URLS_V1[filter];
    if (csv.affiliate_url !== expectedUrl) {
      throw new Error(`CSV affiliate_url mismatch for ${filter}`);
    }
    if (csv.browser_truth_classification !== "direct_buyable") {
      throw new Error(`CSV not direct_buyable for ${filter}`);
    }
    const prow = parityBySlug.get(filter);
    planned_updates.push({
      filter_slug: filter,
      change_kind: "update_existing_primary_from_csv",
      supabase_link_id: prow?.supabase_primary?.id ?? null,
      before_affiliate_url: prow?.supabase_primary?.affiliate_url ?? null,
      after_affiliate_url: expectedUrl,
      before_retailer_name: prow?.supabase_primary?.retailer_name ?? null,
      after_retailer_name: "GE Appliance Parts",
      before_browser_truth_classification:
        prow?.supabase_primary?.browser_truth_classification ?? null,
      after_browser_truth_classification: "direct_buyable",
      after_retailer_key: "oem-parts-catalog",
      supabase_was_search_placeholder: prow?.supabase_is_search_placeholder ?? null,
    });
  }

  if (planned_updates.length !== 2) {
    throw new Error(`Expected exactly 2 planned updates; got ${String(planned_updates.length)}`);
  }

  return {
    contract:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    apply_authorized: false,
    founder_approval_created: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_csv_mutation_authorized: false,
    pages_claimed_closed: false,
    conversion_claimed: false,
    generated_at: now().toISOString(),
    source_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_SOURCE_COMMAND_V1,
    exact_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_EXACT_COMMAND_V1,
    parity_artifact_rel_path:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_JSON_REL_V1,
    closeout_rel_path:
      BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_GUARDED_APPLY_CLOSEOUT_JSON_REL_V1,
    overall_sync_status_required: "DRIFTED",
    overall_sync_status_observed: overall,
    any_supabase_search_placeholder: parity.any_supabase_search_placeholder ?? null,
    scope: {
      filter_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_FILTER_SLUGS_V1,
      excluded_filter_slugs: ["xwf"],
      affected_model_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_PARITY_AFFECTED_MODEL_SLUGS_V1,
      max_planned_updates: 2,
    },
    planned_updates,
    gate_conditions_for_future_apply: [
      "Separate founder approval packet required for Supabase retailer_links UPDATE of existing smartwater-mwfp + xwfe primaries only.",
      "CSV retailer_links must remain the approved GE PDP URLs (already applied).",
      "Explicit founder-run of a future guarded Supabase apply executor with MUTATION capability — not this packet.",
      "Do not INSERT/DELETE rows; do not mutate xwf; do not mutate compatibility; do not expand buy CTA.",
      "Re-run CTA/go proof after apply; do not claim 4 pages closed from this owner-review alone.",
    ],
    hard_stop: {
      supabase_write_authorized: false,
      founder_approval_required_before_write: true,
      next_forbidden_actions: [
        "supabase_retailer_links_write",
        "csv_retailer_links_mutation",
        "founder_approval_auto_stamp",
        "buy_cta_expansion",
        "claim_pages_closed",
      ],
    },
    proven_facts: [
      "PROVEN: read_only=true; mutation_authorized=false; apply_authorized=false; founder_approval_created=false; supabase_mutation_authorized=false.",
      "PROVEN: filter scope exactly smartwater-mwfp + xwfe; xwf excluded; max_planned_updates=2.",
      "PROVEN: affected models exactly ge-gfe24jgkww, ge-gfe27jmkes, ge-gne25jmkww, ge-pvd28bymfs.",
      "PROVEN: overall_sync_status=DRIFTED from committed parity artifact; owner-review plans CSV→Supabase primary updates only.",
      "PROVEN: pages_claimed_closed=false; conversion_claimed=false.",
      "PROVEN: this packet does not write Supabase and does not create owner-decision approval rows.",
    ],
    unknown_facts: [
      "UNKNOWN: conversion/revenue impact of a future Supabase sync.",
      "UNKNOWN: whether CTA/go FAIL 7 flips after a future authorized sync — must re-proof.",
    ],
    recommended_next_action:
      "HARD STOP: founder must review this plan, then create a separate Supabase sync founder-approval packet. Do not run Supabase write from this stage. Do not claim 4 GE pages closed.",
  };
}

export function renderGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewMarkdownV1(
  report: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1,
): string {
  const lines = [
    "# GE MWFP/XWFE Supabase retailer_links sync owner-review",
    "",
    `- contract: \`${report.contract}\``,
    `- overall_sync_status_observed: **${report.overall_sync_status_observed}**`,
    `- exact_command: \`${report.exact_command}\``,
    `- apply_authorized: \`${String(report.apply_authorized)}\``,
    `- supabase_mutation_authorized: \`${String(report.supabase_mutation_authorized)}\``,
    `- founder_approval_required_before_write: \`${String(report.hard_stop.founder_approval_required_before_write)}\``,
    `- pages_claimed_closed: \`${String(report.pages_claimed_closed)}\``,
    "",
    "## Planned updates (2)",
    "",
  ];
  for (const u of report.planned_updates) {
    lines.push(`### \`${u.filter_slug}\``);
    lines.push("");
    lines.push(`- before: \`${u.before_affiliate_url ?? "(missing)"}\``);
    lines.push(`- after: \`${u.after_affiliate_url}\``);
    lines.push(`- retailer_name: \`${u.after_retailer_name}\``);
    lines.push(`- classification: \`${u.after_browser_truth_classification}\``);
    lines.push(
      `- supabase_was_search_placeholder: \`${String(u.supabase_was_search_placeholder)}\``,
    );
    lines.push("");
  }
  lines.push("## Hard stop");
  lines.push("");
  lines.push(report.recommended_next_action);
  lines.push("");
  lines.push("## Gate conditions for future apply");
  lines.push("");
  for (const g of report.gate_conditions_for_future_apply) lines.push(`- ${g}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewArtifactsV1(args: {
  rootDir: string;
  report: GeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_JSON_REL_V1;
  const mdRel =
    BUCKPARTS_FRIDGE_MODEL_PDP_GE_MWFP_XWFE_RETAILER_LINKS_SUPABASE_SYNC_OWNER_REVIEW_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(
    mdAbs,
    renderGeMwfpXwfeRetailerLinksSupabaseSyncOwnerReviewMarkdownV1(args.report),
    "utf8",
  );
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
