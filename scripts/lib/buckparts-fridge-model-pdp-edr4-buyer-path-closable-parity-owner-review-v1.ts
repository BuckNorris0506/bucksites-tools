/**
 * Read-only owner-review plan: close 2 CLOSABLE buyer-path gaps via existing edr4rxd1 CSV evidence.
 * Models: whirlpool-wrf540cwhz, whirlpool-wrx735sdhz → filter edr4rxd1.
 * Does not apply, does not create founder approval, does not mutate CSV/Supabase.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buyLinkGateFailureKind,
  isDirectBuyableSafeCtaRow,
} from "@/lib/retailers/launch-buy-links";
import { isAffiliateUrlSafeForGoRedirect } from "@/lib/retailers/go-redirect-gate";

import { BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1 } from "./buckparts-fridge-model-pdp-buyer-path-gap-plan-v1";
import {
  FRIDGE_RETAILER_LINKS_SCOPED_CSV_REL_V1,
  selectScopedCsvPrimaryRowsV1,
  type FridgeRetailerLinksScopedCsvPrimaryRowV1,
} from "./fridge-retailer-links-scoped-supabase-parity-core-v1";
import {
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_DRY_RUN_COMMAND_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
  BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1,
} from "./buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-v1";

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_CONTRACT_V1 =
  "buckparts_fridge_model_pdp_edr4_buyer_path_closable_parity_owner_review_v1" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review-v1.json" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/buckparts-fridge-model-pdp-edr4-buyer-path-closable-parity-owner-review-v1.md" as const;

export const BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1 =
  [
    BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_JSON_REL_V1,
    BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_MD_REL_V1,
  ] as const;

export type BuckpartsEdr4BuyerPathClosableParityOwnerReviewV1 = {
  contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  apply_authorized: false;
  founder_approval_created: false;
  supabase_mutation_authorized: false;
  csv_mutation_authorized: false;
  buy_cta_authorized: false;
  retailer_links_mutation_authorized: false;
  invent_link_authorized: false;
  auto_promote_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_SOURCE_COMMAND_V1;
  gap_plan_rel_path: typeof BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1;
  parity_executor_contract: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1;
  scope: {
    context_model_slugs: readonly string[];
    allowed_filter_slugs: readonly string[];
    max_planned_retailer_links_rows: 1;
  };
  evidence: {
    required_rels: readonly string[];
    present_rels: string[];
    missing_rels: string[];
    csv_primary: FridgeRetailerLinksScopedCsvPrimaryRowV1<"edr4rxd1"> | null;
    csv_direct_buyable_safe: boolean;
    csv_go_resolvable: boolean;
    csv_gate_failure_kind: string | null;
  };
  planned_delta: {
    surface: "public.retailer_links";
    action: "insert_or_update_primary_from_csv";
    filter_slug: "edr4rxd1";
    fields: readonly string[];
    closes_model_slugs: readonly string[];
    notes: string[];
  };
  gate_conditions_for_future_apply: string[];
  blocked_reuse: {
    csv_only_approval_decision_id: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1;
    does_not_authorize_this_supabase_parity_lane: true;
  };
  dry_run_command: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_DRY_RUN_COMMAND_V1;
  write_command_when_later_authorized: typeof BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1;
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type BuildEdr4BuyerPathClosableParityOwnerReviewDepsV1 = {
  rootDir: string;
  now?: () => Date;
  evidenceExists?: (relPath: string) => boolean;
};

export function buildEdr4BuyerPathClosableParityOwnerReviewV1(
  deps: BuildEdr4BuyerPathClosableParityOwnerReviewDepsV1,
): BuckpartsEdr4BuyerPathClosableParityOwnerReviewV1 {
  const generated_at = (deps.now ?? (() => new Date()))().toISOString();
  const evidenceExists =
    deps.evidenceExists ?? ((rel) => existsSync(path.join(deps.rootDir, rel)));

  const present_rels = BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1.filter(
    (rel) => evidenceExists(rel),
  );
  const missing_rels = BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1.filter(
    (rel) => !evidenceExists(rel),
  );

  const csvRows = selectScopedCsvPrimaryRowsV1({
    lane: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_LANE_V1,
    rootDir: deps.rootDir,
  });
  const csv_primary = csvRows[0] ?? null;

  let csv_direct_buyable_safe = false;
  let csv_go_resolvable = false;
  let csv_gate_failure_kind: string | null = "csv_primary_missing";
  if (csv_primary) {
    const gateLink = {
      retailer_key: csv_primary.retailer_key,
      affiliate_url: csv_primary.affiliate_url,
      browser_truth_classification: csv_primary.browser_truth_classification,
      browser_truth_buyable_subtype: null,
      browser_truth_checked_at: csv_primary.browser_truth_checked_at,
      browser_truth_notes: csv_primary.browser_truth_notes,
    };
    csv_gate_failure_kind = buyLinkGateFailureKind(gateLink);
    csv_direct_buyable_safe = isDirectBuyableSafeCtaRow(gateLink);
    csv_go_resolvable = isAffiliateUrlSafeForGoRedirect(
      gateLink.retailer_key,
      gateLink.affiliate_url,
      gateLink.browser_truth_classification,
      gateLink.browser_truth_buyable_subtype,
      gateLink.browser_truth_checked_at,
      gateLink.browser_truth_notes,
    );
  }

  if (!csv_direct_buyable_safe || !csv_go_resolvable) {
    throw new Error(
      "Owner-review requires existing gate-passable CSV primary for edr4rxd1; refusing invented-link plan",
    );
  }
  if (missing_rels.length > 0) {
    throw new Error(`Missing required evidence artifacts: ${missing_rels.join(", ")}`);
  }

  return {
    contract: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    apply_authorized: false,
    founder_approval_created: false,
    supabase_mutation_authorized: false,
    csv_mutation_authorized: false,
    buy_cta_authorized: false,
    retailer_links_mutation_authorized: false,
    invent_link_authorized: false,
    auto_promote_authorized: false,
    generated_at,
    source_command:
      BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_SOURCE_COMMAND_V1,
    gap_plan_rel_path: BUCKPARTS_FRIDGE_MODEL_PDP_BUYER_PATH_GAP_PLAN_JSON_REL_V1,
    parity_executor_contract: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTRACT_V1,
    scope: {
      context_model_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1,
      allowed_filter_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_ALLOWED_FILTER_SLUGS_V1,
      max_planned_retailer_links_rows: 1,
    },
    evidence: {
      required_rels: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_EVIDENCE_RELS_V1,
      present_rels,
      missing_rels,
      csv_primary,
      csv_direct_buyable_safe,
      csv_go_resolvable,
      csv_gate_failure_kind,
    },
    planned_delta: {
      surface: "public.retailer_links",
      action: "insert_or_update_primary_from_csv",
      filter_slug: "edr4rxd1",
      fields: [
        "affiliate_url",
        "retailer_name",
        "browser_truth_classification",
        "browser_truth_notes",
        "browser_truth_checked_at",
        "is_primary",
        "retailer_key",
        "destination_url",
      ],
      closes_model_slugs:
        BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CONTEXT_MODEL_SLUGS_V1,
      notes: [
        "One filter primary retailer_links row closes both model PDPs via existing compat mappings.",
        "Desired row must equal existing CSV primary — no invented destination URL.",
        "CSV itself is not mutated by this lane.",
      ],
    },
    gate_conditions_for_future_apply: [
      "Dry-run parity report CHECKed with planned_action insert|update for edr4rxd1 only.",
      "BUCKPARTS_IO_CAPABILITY=MUTATION set for write session.",
      "New founder approval specifically authorizing THIS Supabase parity contract (not CSV manufacturer-rescue).",
      `Existing decision ${BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1} must NOT authorize --write.`,
      "Explicit founder session authorize of apply for this exact lane after approval.",
      "Re-run CTA/go proof for whirlpool-wrf540cwhz + whirlpool-wrx735sdhz after apply.",
    ],
    blocked_reuse: {
      csv_only_approval_decision_id:
        BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_CSV_ONLY_APPROVAL_DECISION_ID_V1,
      does_not_authorize_this_supabase_parity_lane: true,
    },
    dry_run_command: BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_DRY_RUN_COMMAND_V1,
    write_command_when_later_authorized:
      BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_WRITE_COMMAND_V1,
    proven_facts: [
      "PROVEN: read_only owner-review; apply_authorized=false; founder_approval_created=false.",
      "PROVEN: context models exactly whirlpool-wrf540cwhz + whirlpool-wrx735sdhz.",
      "PROVEN: mutation surface allowlist exactly filter slug edr4rxd1 (max 1 retailer_links primary).",
      "PROVEN: CSV primary is existing direct_buyable + go-resolvable Whirlpool OEM PDP evidence.",
      `PROVEN: retailer CSV path=${FRIDGE_RETAILER_LINKS_SCOPED_CSV_REL_V1}.`,
      "PROVEN: no invent_link / auto_promote authorization in this packet.",
    ],
    unknown_facts: [
      "UNKNOWN until dry-run: whether Supabase primary for edr4rxd1 needs insert vs update vs already-in-parity.",
      "UNKNOWN: live HTML CTA render until post-apply CTA/go proof re-run.",
    ],
    risk_notes: [
      "This packet does not authorize --write or create founder approval.",
      "Do not expand scope to XWFE/XWF/MWFP or ge-gte18gsnrss remain-no-buy.",
      "Do not invent new retailer destinations; sync CSV evidence only.",
    ],
  };
}

export function buildEdr4BuyerPathClosableParityOwnerReviewMarkdownV1(
  report: BuckpartsEdr4BuyerPathClosableParityOwnerReviewV1,
): string {
  const lines = [
    "# EDR4 buyer-path closable parity owner-review v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- read_only: **true**`,
    `- apply_authorized: **false**`,
    `- founder_approval_created: **false**`,
    "",
    "## Scope",
    "",
    `- models: ${report.scope.context_model_slugs.join(", ")}`,
    `- filter allowlist: ${report.scope.allowed_filter_slugs.join(", ")}`,
    `- max planned retailer_links rows: ${String(report.scope.max_planned_retailer_links_rows)}`,
    "",
    "## Planned delta",
    "",
    `- surface: \`${report.planned_delta.surface}\``,
    `- action: \`${report.planned_delta.action}\``,
    `- filter_slug: \`${report.planned_delta.filter_slug}\``,
    `- desired URL: \`${report.evidence.csv_primary?.affiliate_url ?? "(missing)"}\``,
    `- classification: \`${report.evidence.csv_primary?.browser_truth_classification ?? ""}\``,
    "",
    "## Gate conditions (future apply only)",
    "",
    ...report.gate_conditions_for_future_apply.map((g) => `- ${g}`),
    "",
    "## Blocked reuse",
    "",
    `- CSV-only approval \`${report.blocked_reuse.csv_only_approval_decision_id}\` does **not** authorize this Supabase parity lane.`,
    "",
    "## Commands",
    "",
    `- dry-run: \`${report.dry_run_command}\``,
    `- write (later, only if newly approved): \`${report.write_command_when_later_authorized}\``,
    "",
    "## Proven facts",
    "",
    ...report.proven_facts.map((f) => `- ${f}`),
    "",
    "## Risk notes",
    "",
    ...report.risk_notes.map((n) => `- ${n}`),
    "",
  ];
  return lines.join("\n");
}

export function writeEdr4BuyerPathClosableParityOwnerReviewArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsEdr4BuyerPathClosableParityOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_JSON_REL_V1;
  const mdRel = BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_MD_REL_V1;
  const allowed = new Set<string>(
    BUCKPARTS_FRIDGE_MODEL_PDP_EDR4_BUYER_PATH_CLOSABLE_PARITY_OWNER_REVIEW_ALLOWED_WRITE_REL_PATHS_V1,
  );
  if (!allowed.has(jsonRel) || !allowed.has(mdRel)) {
    throw new Error("owner-review write paths must stay on allowlist");
  }
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildEdr4BuyerPathClosableParityOwnerReviewMarkdownV1(args.report), "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}
