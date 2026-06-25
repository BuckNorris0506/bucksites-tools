/**
 * Read-only GE refrigerator rescue owner-approval apply packet.
 * Guarded proposal only — no CSV/Supabase/public UI mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";
import { mapSignalsToRetailerLinkState } from "@/lib/retailers/retailer-link-state";

import { FOUNDER_DECISION_REGISTRY_CONTRACT_V1 } from "../../src/lib/owner-dashboard/founder-decision-registry-v1";
import {
  buildGeRefrigeratorRescueAdapterReportV1,
  GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
  GE_SUPERSESSION_REVIEW_SLUGS_V1,
  type GeRefrigeratorRescueAdapterReportV1,
} from "./ge-refrigerator-rescue-adapter-v1";
import {
  GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1,
  loadGeRefrigeratorRescueBrowserEvidenceArtifactV1,
  type GeRefrigeratorRescueBrowserEvidenceArtifactV1,
} from "./ge-refrigerator-rescue-browser-capture-v1";

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1 =
  "ge_refrigerator_rescue_owner_approval_packet_v1" as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/ge-refrigerator-rescue-owner-approval-packet-v1.json" as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_MD_REL_V1 =
  "data/fridge/batch-production/drafts/ge-refrigerator-rescue-owner-approval-packet-v1.md" as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_DECISION_TEMPLATE_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/ge-refrigerator-rescue-owner-decision-template-v1.json" as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_SOURCE_COMMAND_V1 =
  "npm run buckparts:ge-refrigerator-rescue-adapter" as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_ALLOWED_WRITE_REL_PATHS_V1 = [
  GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_JSON_REL_V1,
  GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_MD_REL_V1,
  GE_REFRIGERATOR_RESCUE_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
] as const;

export const GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1 =
  "ge_refrigerator_rescue_owner_approval_packet_v1" as const;

export const GE_REFRIGERATOR_RESCUE_APPROVAL_OPTION_IDS_V1 = [
  "approve_apply_plan",
  "reject_apply_plan",
  "defer_apply_plan",
  "request_more_proof",
] as const;

export type GeRefrigeratorRescueApprovalOptionIdV1 =
  (typeof GE_REFRIGERATOR_RESCUE_APPROVAL_OPTION_IDS_V1)[number];

export const GE_REFRIGERATOR_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1 =
  "PROVEN: Approving this owner approval packet records founder intent only. It does not apply data/retailer_links.csv changes, mutate Supabase, authorize BuckParts Verified Links, or deploy. A separate guarded apply executor with explicit owner_mutation_approved registry row and per-slug browser evidence PASS is still required before any CSV or Supabase mutation." as const;

export const GE_REFRIGERATOR_RESCUE_PROHIBITED_ACTIONS_V1 = [
  "Do not mutate retailer_links.csv from this approval packet alone.",
  "Do not mutate Supabase retailer_links or production database state.",
  "Do not mutate public fridge pages, sitemap, or robots.",
  "Do not authorize BuckParts Verified Links without separate apply executor.",
  "Do not deploy or call Netlify API from this packet.",
  "approve_apply_plan authorizes proceeding toward guarded per-slug apply — not automatic CSV apply.",
  "This approval packet is not automation_input for Runner Step, queues, or mutation gates.",
] as const;

export type GeRefrigeratorRescuePlannedRetailerLinksCsvChangeV1 = {
  source_path: "data/retailer_links.csv";
  filter_slug: string;
  change_kind: "update_existing_primary_row_affiliate_url";
  current_row: {
    retailer_name: string | null;
    retailer_key: string | null;
    affiliate_url: string | null;
    is_primary: boolean | null;
    gate_failure_kind: string | null;
    retailer_link_state: string;
    summary: string;
  };
  proposed_row: {
    retailer_name: "GE Appliance Parts";
    retailer_key: "oem-parts-catalog";
    affiliate_url: string;
    is_primary: true;
    customer_visible_label: "BuckParts Verified Link";
    label_subtype: "official_manufacturer_official_ge";
    compatible_replacement: false;
    waterdrop: false;
    amazon: false;
    browser_truth_classification: "direct_buyable";
    summary: string;
  };
};

export type GeRefrigeratorRescueOwnerApprovalLaneV1 = {
  filter_slug: string;
  oem_part_token: string;
  public_route: string;
  cohort_lane: "RESCUE_SEARCH_PLACEHOLDER" | "REFERENCE_ALREADY_APPLIED";
  in_fridge_rescue_queue: boolean;
  rescue_queue_rank: number | null;
  browser_evidence_artifact_rel_path: string;
  browser_evidence_contract: typeof GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1 | null;
  browser_truth_status: "PASS" | "FAIL" | "UNKNOWN" | "NOT_CAPTURED";
  plan_status:
    | "PROPOSED_OWNER_REVIEW_READY"
    | "ALREADY_APPLIED_REPO_DIRECT_BUYABLE"
    | "NOT_READY"
    | "SUPERSESSION_REVIEW_REQUIRED";
  owner_apply_review_ready: boolean;
  apply_plan_proposal_ready: boolean;
  supersession_review_required: boolean;
  current_row_state: string;
  proposed_url: string | null;
  planned_retailer_links_csv_change: GeRefrigeratorRescuePlannedRetailerLinksCsvChangeV1 | null;
  blockers: string[];
};

export type GeRefrigeratorRescueOwnerApprovalPacketV1 = {
  contract: typeof GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  owner_approval_required: true;
  apply_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  generated_at: string;
  source_command: typeof GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_SOURCE_COMMAND_V1;
  adapter_contract: typeof GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1;
  adapter_report_summary: GeRefrigeratorRescueAdapterReportV1["cohort_summary"];
  decision_needed: string;
  approval_options: Array<{
    option_id: GeRefrigeratorRescueApprovalOptionIdV1;
    label: string;
    description: string;
  }>;
  lanes: GeRefrigeratorRescueOwnerApprovalLaneV1[];
  owner_review_ready_lane_count: number;
  not_ready_lane_count: number;
  separate_apply_executor_required_statement: typeof GE_REFRIGERATOR_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1;
  prohibited_actions_still_apply: typeof GE_REFRIGERATOR_RESCUE_PROHIBITED_ACTIONS_V1;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  unknown_facts: string[];
};

type RetailerLinkRow = {
  filter_slug?: string;
  retailer_name?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

const RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;

function readRetailerRow(
  rootDir: string,
  slug: string,
  fileExists: (abs: string) => boolean,
  readTextFile: (abs: string) => string,
): RetailerLinkRow | null {
  const abs = path.join(rootDir, RETAILER_LINKS_CSV_REL);
  if (!fileExists(abs)) return null;
  try {
    const rows = parse(readTextFile(abs), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as RetailerLinkRow[];
    return rows.find((r) => r.filter_slug?.trim().toLowerCase() === slug) ?? null;
  } catch {
    return null;
  }
}

function currentRowState(row: RetailerLinkRow | null): string {
  if (!row) return "retailer_links_csv_row_missing";
  const url = (row.affiliate_url ?? "").trim().toLowerCase();
  if (url.includes("/parts/spec/") && row.browser_truth_classification === "direct_buyable") {
    return "repo_direct_buyable_official_ge_spec_pdp_applied";
  }
  if (url.includes("searchkeyword=") || url.includes("search.jsp")) {
    return "existing_ge_catalog_search_placeholder_blocked";
  }
  return "unknown_retailer_link_state";
}

function buildPlannedChange(args: {
  slug: string;
  row: RetailerLinkRow;
  proposedUrl: string;
  browserEvidencePath: string;
}): GeRefrigeratorRescuePlannedRetailerLinksCsvChangeV1 {
  const gate = buyLinkGateFailureKind({
    retailer_key: args.row.retailer_key ?? null,
    affiliate_url: args.row.affiliate_url ?? "",
    browser_truth_classification: args.row.browser_truth_classification ?? null,
    browser_truth_buyable_subtype: args.row.browser_truth_buyable_subtype ?? null,
  });
  const state = mapSignalsToRetailerLinkState({
    browserTruthClassification: args.row.browser_truth_classification ?? null,
    gateFailureKind: gate,
  });
  return {
    source_path: RETAILER_LINKS_CSV_REL,
    filter_slug: args.slug,
    change_kind: "update_existing_primary_row_affiliate_url",
    current_row: {
      retailer_name: args.row.retailer_name?.trim() || null,
      retailer_key: args.row.retailer_key?.trim() || null,
      affiliate_url: args.row.affiliate_url?.trim() || null,
      is_primary: args.row.is_primary?.trim().toLowerCase() === "true" ? true : null,
      gate_failure_kind: gate,
      retailer_link_state: state,
      summary:
        "Primary OEM row points at GE Appliance Parts catalog search placeholder; buy gates treat this as blocked.",
    },
    proposed_row: {
      retailer_name: "GE Appliance Parts",
      retailer_key: "oem-parts-catalog",
      affiliate_url: args.proposedUrl,
      is_primary: true,
      customer_visible_label: "BuckParts Verified Link",
      label_subtype: "official_manufacturer_official_ge",
      compatible_replacement: false,
      waterdrop: false,
      amazon: false,
      browser_truth_classification: "direct_buyable",
      summary: `Replace affiliate_url with browser-proven official GE spec PDP; evidence ${args.browserEvidencePath}.`,
    },
  };
}

function buildApprovalOptions(): GeRefrigeratorRescueOwnerApprovalPacketV1["approval_options"] {
  return [
    {
      option_id: "approve_apply_plan",
      label: "Approve GE rescue apply plan",
      description:
        "Owner approves guarded per-slug retailer_links.csv proposals for browser-PASS GE rescue lanes. Proceed to separate apply executor — no automatic CSV mutation.",
    },
    {
      option_id: "reject_apply_plan",
      label: "Reject apply plan",
      description: "Owner rejects GE rescue CSV proposals; keep search-placeholder rows unchanged.",
    },
    {
      option_id: "defer_apply_plan",
      label: "Defer apply plan",
      description: "Owner defers decision; no apply authority granted.",
    },
    {
      option_id: "request_more_proof",
      label: "Request more proof",
      description: "Owner needs additional browser evidence before approving any GE rescue apply.",
    },
  ];
}

export function buildGeRefrigeratorRescueOwnerApprovalLaneV1(args: {
  rootDir: string;
  cohortRow: GeRefrigeratorRescueAdapterReportV1["rows"][number];
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): GeRefrigeratorRescueOwnerApprovalLaneV1 {
  const fileExists = args.fileExists ?? existsSync;
  const readTextFile = args.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const slug = args.cohortRow.filter_slug;
  const retailerRow = readRetailerRow(args.rootDir, slug, fileExists, readTextFile);
  const rowState = currentRowState(retailerRow);
  const alreadyApplied = rowState === "repo_direct_buyable_official_ge_spec_pdp_applied";
  const artifact = loadGeRefrigeratorRescueBrowserEvidenceArtifactV1({
    rootDir: args.rootDir,
    filterSlug: slug,
    fileExists,
    readTextFile,
  });

  const supersession = GE_SUPERSESSION_REVIEW_SLUGS_V1.has(slug);
  let planStatus: GeRefrigeratorRescueOwnerApprovalLaneV1["plan_status"] = "NOT_READY";
  let ownerReviewReady = false;
  let applyReady = false;
  let plannedChange: GeRefrigeratorRescuePlannedRetailerLinksCsvChangeV1 | null = null;
  const blockers: string[] = [
    "owner_apply_approval_missing",
    "csv_apply_not_authorized",
    "supabase_mutation_not_authorized",
  ];

  let browserStatus: GeRefrigeratorRescueOwnerApprovalLaneV1["browser_truth_status"] =
    artifact?.browser_truth_status ?? "NOT_CAPTURED";

  if (args.cohortRow.cohort_lane === "REFERENCE_ALREADY_APPLIED" || alreadyApplied) {
    planStatus = "ALREADY_APPLIED_REPO_DIRECT_BUYABLE";
    blockers.push("repo_csv_already_applied_official_ge");
  } else if (!artifact) {
    blockers.push("browser_evidence_artifact_missing");
  } else if (artifact.browser_truth_status !== "PASS") {
    blockers.push("official_ge_browser_truth_not_pass");
  } else if (supersession) {
    planStatus = "SUPERSESSION_REVIEW_REQUIRED";
    blockers.push("xwf_xwfe_supersession_review_required");
    ownerReviewReady = true;
    applyReady = false;
    plannedChange = retailerRow
      ? buildPlannedChange({
          slug,
          row: retailerRow,
          proposedUrl: artifact.target_url,
          browserEvidencePath: args.cohortRow.browser_evidence_artifact_rel_path,
        })
      : null;
  } else {
    planStatus = "PROPOSED_OWNER_REVIEW_READY";
    ownerReviewReady = true;
    applyReady = true;
    plannedChange = retailerRow
      ? buildPlannedChange({
          slug,
          row: retailerRow,
          proposedUrl: artifact.target_url,
          browserEvidencePath: args.cohortRow.browser_evidence_artifact_rel_path,
        })
      : null;
    if (!retailerRow) blockers.push(`retailer_links_csv_row_missing_for_${slug}`);
  }

  return {
    filter_slug: slug,
    oem_part_token: args.cohortRow.oem_part_token,
    public_route: `/filter/${slug}`,
    cohort_lane: args.cohortRow.cohort_lane,
    in_fridge_rescue_queue: args.cohortRow.in_fridge_rescue_queue,
    rescue_queue_rank: args.cohortRow.rescue_queue_rank,
    browser_evidence_artifact_rel_path: args.cohortRow.browser_evidence_artifact_rel_path,
    browser_evidence_contract: artifact ? GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1 : null,
    browser_truth_status: browserStatus,
    plan_status: planStatus,
    owner_apply_review_ready: ownerReviewReady,
    apply_plan_proposal_ready: applyReady,
    supersession_review_required: supersession,
    current_row_state: rowState,
    proposed_url: artifact?.target_url ?? args.cohortRow.discovered_spec_pdp_url,
    planned_retailer_links_csv_change: plannedChange,
    blockers,
  };
}

export function buildGeRefrigeratorRescueOwnerApprovalPacketV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (abs: string) => boolean;
  readTextFile?: (abs: string) => string;
}): GeRefrigeratorRescueOwnerApprovalPacketV1 {
  const now = args.now ?? (() => new Date());
  const adapterReport = buildGeRefrigeratorRescueAdapterReportV1(args);

  const lanes = adapterReport.rows
    .filter((r) => r.cohort_lane === "RESCUE_SEARCH_PLACEHOLDER")
    .map((row) =>
      buildGeRefrigeratorRescueOwnerApprovalLaneV1({
        rootDir: args.rootDir,
        cohortRow: row,
        fileExists: args.fileExists,
        readTextFile: args.readTextFile,
      }),
    );

  const ownerReady = lanes.filter((l) => l.plan_status === "PROPOSED_OWNER_REVIEW_READY").length;
  const notReady = lanes.filter(
    (l) => l.plan_status === "NOT_READY" || l.browser_truth_status === "NOT_CAPTURED",
  ).length;

  const pathsRead = [
    ...adapterReport.source_paths_read,
    ...lanes.map((l) => l.browser_evidence_artifact_rel_path),
    GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_JSON_REL_V1,
  ];

  return {
    contract: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    owner_approval_required: true,
    apply_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    generated_at: now().toISOString(),
    source_command: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_SOURCE_COMMAND_V1,
    adapter_contract: GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    adapter_report_summary: adapterReport.cohort_summary,
    decision_needed: `Owner review guarded GE refrigerator rescue apply proposals for ${String(lanes.length)} search-placeholder slugs (${String(ownerReady)} PROPOSED_OWNER_REVIEW_READY).`,
    approval_options: buildApprovalOptions(),
    lanes,
    owner_review_ready_lane_count: ownerReady,
    not_ready_lane_count: notReady,
    separate_apply_executor_required_statement:
      GE_REFRIGERATOR_RESCUE_SEPARATE_APPLY_EXECUTOR_STATEMENT_V1,
    prohibited_actions_still_apply: GE_REFRIGERATOR_RESCUE_PROHIBITED_ACTIONS_V1,
    exact_repo_paths_read: pathsRead,
    proven_facts: [
      ...adapterReport.proven_facts,
      `PROVEN: Owner approval packet includes ${String(lanes.length)} rescue lanes (excludes reference ${adapterReport.rows.find((r) => r.cohort_lane === "REFERENCE_ALREADY_APPLIED")?.filter_slug ?? "rpwfe"}).`,
    ],
    unknown_facts: [
      ...adapterReport.unknown_facts,
      `UNKNOWN: ${String(notReady)} lanes lack browser-PASS evidence on disk.`,
    ],
  };
}

export function writeGeRefrigeratorRescueOwnerApprovalPacketDraftsV1(args: {
  rootDir: string;
  packet: GeRefrigeratorRescueOwnerApprovalPacketV1;
}): { json_rel_path: string; md_rel_path: string; decision_template_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_MD_REL_V1);
  const templateAbs = path.join(
    args.rootDir,
    GE_REFRIGERATOR_RESCUE_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
  );

  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");

  const md = [
    "# GE Refrigerator Rescue — Owner Approval Packet v1",
    "",
    `Generated: ${args.packet.generated_at}`,
    "",
    `**Decision needed:** ${args.packet.decision_needed}`,
    "",
    "## Cohort summary",
    "",
    `- Search-placeholder slugs: ${String(args.packet.adapter_report_summary.ge_rescue_search_placeholder_count)}`,
    `- In fridge rescue queue: ${String(args.packet.adapter_report_summary.in_fridge_rescue_queue_count)}`,
    `- Owner-review-ready lanes: ${String(args.packet.owner_review_ready_lane_count)}`,
    `- Not ready (missing/fail evidence): ${String(args.packet.not_ready_lane_count)}`,
    "",
    "## Lanes",
    "",
    ...args.packet.lanes.map(
      (l) =>
        `### ${l.filter_slug}\n- Plan status: **${l.plan_status}**\n- Browser: ${l.browser_truth_status}\n- Proposed URL: ${l.proposed_url ?? "—"}\n- Blockers: ${l.blockers.join(", ")}\n`,
    ),
    "",
    "## Prohibited actions",
    "",
    ...args.packet.prohibited_actions_still_apply.map((p) => `- ${p}`),
    "",
    args.packet.separate_apply_executor_required_statement,
    "",
  ].join("\n");

  writeFileSync(mdAbs, md, "utf8");

  const template = {
    contract: FOUNDER_DECISION_REGISTRY_CONTRACT_V1,
    template_only: true,
    not_consumed_by_automation: true,
    mutation_authorized: false,
    read_only: true,
    data_mutation: false,
    template_for_packet_contract: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_CONTRACT_V1,
    source_decision_packet_id: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_SOURCE_DECISION_PACKET_ID_V1,
    allowed_founder_option_ids: [...GE_REFRIGERATOR_RESCUE_APPROVAL_OPTION_IDS_V1],
    notes: [
      "Replace decision_id and decided_at before recording in founder decision registry.",
      "approve_apply_plan does not auto-apply CSV — separate guarded executor required.",
    ],
  };
  writeFileSync(templateAbs, `${JSON.stringify(template, null, 2)}\n`, "utf8");

  return {
    json_rel_path: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_JSON_REL_V1,
    md_rel_path: GE_REFRIGERATOR_RESCUE_OWNER_APPROVAL_PACKET_MD_REL_V1,
    decision_template_rel_path: GE_REFRIGERATOR_RESCUE_OWNER_DECISION_TEMPLATE_JSON_REL_V1,
  };
}

export function buildGeRefrigeratorRescueBrowserEvidenceFromFixture(args: {
  filterSlug: string;
  oemPartToken: string;
  targetUrl: string;
  pass: boolean;
}): GeRefrigeratorRescueBrowserEvidenceArtifactV1 {
  const slug = args.filterSlug.toLowerCase();
  const token = args.oemPartToken.toUpperCase();
  return {
    contract: GE_REFRIGERATOR_RESCUE_BROWSER_EVIDENCE_CONTRACT_V1,
    adapter_contract: GE_REFRIGERATOR_RESCUE_ADAPTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    filter_slug: slug,
    oem_part_token: token,
    target_url: args.targetUrl,
    checked_at: "2026-06-10T12:00:00.000Z",
    browser_truth_status: args.pass ? "PASS" : "FAIL",
    direct_pdp_status: args.pass ? "PROVEN" : "NOT_PROVEN",
    exact_token_in_primary_slice: args.pass,
    official_manufacturer_path: args.pass,
    direct_purchase_control_visible: args.pass,
    wrong_family_assessment: {
      blocked: false,
      forbidden_tokens_checked: [],
      detected_forbidden_tokens: [],
      notes: "fixture",
    },
    validation_gates: [],
    evidence_summary: args.pass ? "PASS fixture" : "FAIL fixture",
    captured_signals: {
      final_url: args.targetUrl,
      page_title: token,
      h1_text: token,
      sku_line_sample: null,
      purchase_actions_visible: args.pass ? ["Add to Cart"] : [],
      classification: args.pass ? "direct_buyable" : "likely_valid",
      classification_notes: null,
      text_sample_excerpt: null,
      screenshot_path: null,
      navigation_error: null,
    },
    blockers: args.pass ? [] : ["direct_purchase_control_not_visible"],
    prohibited_actions: [...GE_REFRIGERATOR_RESCUE_PROHIBITED_ACTIONS_V1],
    buckparts_verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    public_ui_mutation_authorized: false,
    netlify_api_authorized: false,
    waterdrop_in_scope: false,
    owner_review_ready: args.pass,
    apply_plan_proposal_ready: args.pass,
  };
}
