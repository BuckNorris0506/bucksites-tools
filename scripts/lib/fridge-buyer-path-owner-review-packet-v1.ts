/**
 * Read-only formal fridge buyer-path owner review packet — expands bridge rows from evidence artifacts.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFridgeBuyerPathOwnerReviewBridgeV1,
  FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1,
  FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_REPORT_NAME_V1,
  type BuildFridgeBuyerPathOwnerReviewBridgeDepsV1,
  type FridgeBuyerPathOwnerReviewBridgeReportV1,
  parseAmazonLiveOutcomeStatusV1,
} from "./fridge-buyer-path-owner-review-bridge-v1";

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1 =
  "fridge_buyer_path_owner_review_packet_v1" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_REPORT_NAME_V1 =
  "fridge_buyer_path_owner_review_packet_v1" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_RECOMMENDED_NEXT_ACTION_V1 =
  "Owner-review normalized committed_live_row fields in this packet (stdout JSON); no CSV, retailer_links, Supabase, public UI, or buy-link mutation is authorized until founder batch run-registry and apply planning exist." as const;

export type FridgeBuyerPathOwnerReviewRowStatusV1 =
  | "READY_FOR_OWNER_REVIEW"
  | "MISSING_COMMITTED_ROW"
  | "MISSING_DESTINATION_URL"
  | "MISSING_AFFILIATE_URL"
  | "UNKNOWN";

export type FridgeBuyerPathOwnerReviewPacketRowV1 = {
  rank: number;
  slug: string;
  oem_token: string;
  brand: string | null;
  factory_state: string;
  priority_score: number;
  evidence_artifact_paths: string[];
  evidence_file_exists: boolean;
  primary_evidence_artifact_path: string | null;
  artifact_contract: string | null;
  artifact_report_name: string | null;
  live_outcome_status: string | null;
  committed_buyer_path_status: string;
  why_not_gated: string;
  owner_review_ready: boolean;
  committed_live_row_present: boolean;
  filter_id: string | null;
  link_id: string | null;
  retailer_key: string | null;
  retailer_name: string | null;
  retailer_slug: string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  status: string | null;
  source: string | null;
  is_primary: boolean | null;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
  asin: string | null;
  canonical_url: string | null;
  evidence_mutation_ready: boolean | null;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  row_review_status: FridgeBuyerPathOwnerReviewRowStatusV1;
  row_blockers: string[];
};

export type FridgeBuyerPathOwnerReviewPacketSummaryV1 = {
  cohort_count: number;
  owner_review_ready_count: number;
  row_review_ready_count: number;
  missing_committed_live_row_count: number;
  missing_destination_url_count: number;
  missing_affiliate_url_count: number;
  mutation_ready_count: 0;
  formal_batch_exists: false;
  formal_batch_registry_path: string | null;
  apply_authorization_present: false;
  apply_mutation_authorized: false;
  csv_apply_authorized: false;
  retailer_links_mutation_authorized: false;
  supabase_mutation_authorized: false;
  public_ui_mutation_authorized: false;
  buy_link_mutation_authorized: false;
  recommended_next_action: string;
};

export type FridgeBuyerPathOwnerReviewPacketReportV1 = {
  contract: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1;
  report_name: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  wedge: "refrigerator_water";
  source_bridge_report: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_REPORT_NAME_V1;
  summary: FridgeBuyerPathOwnerReviewPacketSummaryV1;
  rows: FridgeBuyerPathOwnerReviewPacketRowV1[];
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathOwnerReviewPacketDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildBridgeReport?: (
    deps: BuildFridgeBuyerPathOwnerReviewBridgeDepsV1,
  ) => FridgeBuyerPathOwnerReviewBridgeReportV1;
  readTextFile?: (absolutePath: string) => string;
  fileExists?: (absolutePath: string) => boolean;
};

function readStringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBooleanField(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export type ParsedAmazonLiveOutcomeEvidenceV1 = {
  artifact_contract: string | null;
  artifact_report_name: string | null;
  live_outcome_status: string | null;
  evidence_mutation_ready: boolean | null;
  asin: string | null;
  canonical_url: string | null;
  committed_live_row: Record<string, unknown> | null;
};

export function parseAmazonLiveOutcomeEvidenceArtifactV1(
  jsonText: string,
): ParsedAmazonLiveOutcomeEvidenceV1 {
  try {
    const doc = JSON.parse(jsonText) as Record<string, unknown>;
    const browser = doc.browser_evidence as Record<string, unknown> | undefined;
    const committed =
      doc.committed_live_row != null && typeof doc.committed_live_row === "object"
        ? (doc.committed_live_row as Record<string, unknown>)
        : null;
    const statusParsed = parseAmazonLiveOutcomeStatusV1(jsonText);
    return {
      artifact_contract: readStringField(doc.contract),
      artifact_report_name: readStringField(doc.report_name),
      live_outcome_status: statusParsed.live_outcome_status,
      evidence_mutation_ready: statusParsed.evidence_mutation_ready,
      asin:
        readStringField(doc.asin) ??
        readStringField(browser?.asin) ??
        null,
      canonical_url:
        readStringField(doc.canonical_url) ??
        readStringField(browser?.amazon_pdp_url) ??
        null,
      committed_live_row: committed,
    };
  } catch {
    return {
      artifact_contract: null,
      artifact_report_name: null,
      live_outcome_status: null,
      evidence_mutation_ready: null,
      asin: null,
      canonical_url: null,
      committed_live_row: null,
    };
  }
}

function extractCommittedLiveRowFields(committed: Record<string, unknown> | null): {
  filter_id: string | null;
  link_id: string | null;
  retailer_key: string | null;
  retailer_name: string | null;
  retailer_slug: string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  status: string | null;
  source: string | null;
  is_primary: boolean | null;
  browser_truth_classification: string | null;
  browser_truth_buyable_subtype: string | null;
  browser_truth_notes: string | null;
  browser_truth_checked_at: string | null;
} {
  if (!committed) {
    return {
      filter_id: null,
      link_id: null,
      retailer_key: null,
      retailer_name: null,
      retailer_slug: null,
      destination_url: null,
      affiliate_url: null,
      status: null,
      source: null,
      is_primary: null,
      browser_truth_classification: null,
      browser_truth_buyable_subtype: null,
      browser_truth_notes: null,
      browser_truth_checked_at: null,
    };
  }
  return {
    filter_id: readStringField(committed.filter_id),
    link_id: readStringField(committed.link_id),
    retailer_key: readStringField(committed.retailer_key),
    retailer_name: readStringField(committed.retailer_name),
    retailer_slug: readStringField(committed.retailer_slug),
    destination_url: readStringField(committed.destination_url),
    affiliate_url: readStringField(committed.affiliate_url),
    status: readStringField(committed.status),
    source: readStringField(committed.source),
    is_primary: readBooleanField(committed.is_primary),
    browser_truth_classification: readStringField(committed.browser_truth_classification),
    browser_truth_buyable_subtype: readStringField(committed.browser_truth_buyable_subtype),
    browser_truth_notes: readStringField(committed.browser_truth_notes),
    browser_truth_checked_at: readStringField(committed.browser_truth_checked_at),
  };
}

export function deriveFridgeBuyerPathOwnerReviewRowStatusV1(args: {
  committed_live_row_present: boolean;
  destination_url: string | null;
  affiliate_url: string | null;
}): { row_review_status: FridgeBuyerPathOwnerReviewRowStatusV1; row_blockers: string[] } {
  const row_blockers: string[] = [];
  if (!args.committed_live_row_present) {
    row_blockers.push("Evidence artifact lacks committed_live_row payload.");
    return { row_review_status: "MISSING_COMMITTED_ROW", row_blockers };
  }
  if (!args.destination_url) {
    row_blockers.push("committed_live_row.destination_url is missing or empty.");
  }
  if (!args.affiliate_url) {
    row_blockers.push("committed_live_row.affiliate_url is missing or empty.");
  }
  if (!args.destination_url) {
    return { row_review_status: "MISSING_DESTINATION_URL", row_blockers };
  }
  if (!args.affiliate_url) {
    return { row_review_status: "MISSING_AFFILIATE_URL", row_blockers };
  }
  return { row_review_status: "READY_FOR_OWNER_REVIEW", row_blockers };
}

function loadPrimaryEvidenceArtifact(args: {
  rootDir: string;
  evidencePaths: string[];
  readTextFile: (absolutePath: string) => string;
  fileExists: (absolutePath: string) => boolean;
}): {
  primary_evidence_artifact_path: string | null;
  evidence_file_exists: boolean;
  parsed: ParsedAmazonLiveOutcomeEvidenceV1 | null;
} {
  const primary = args.evidencePaths[0] ?? null;
  if (!primary) {
    return { primary_evidence_artifact_path: null, evidence_file_exists: false, parsed: null };
  }
  const abs = path.join(args.rootDir, primary);
  if (!args.fileExists(abs)) {
    return { primary_evidence_artifact_path: primary, evidence_file_exists: false, parsed: null };
  }
  const parsed = parseAmazonLiveOutcomeEvidenceArtifactV1(args.readTextFile(abs));
  return { primary_evidence_artifact_path: primary, evidence_file_exists: true, parsed };
}

export function buildFridgeBuyerPathOwnerReviewPacketFromBridgeV1(args: {
  bridge: FridgeBuyerPathOwnerReviewBridgeReportV1;
  rootDir: string;
  readTextFile: (absolutePath: string) => string;
  fileExists: (absolutePath: string) => boolean;
}): FridgeBuyerPathOwnerReviewPacketReportV1 {
  const rows: FridgeBuyerPathOwnerReviewPacketRowV1[] = args.bridge.rows.map((bridgeRow, index) => {
    const evidence = loadPrimaryEvidenceArtifact({
      rootDir: args.rootDir,
      evidencePaths: bridgeRow.evidence_artifact_paths,
      readTextFile: args.readTextFile,
      fileExists: args.fileExists,
    });
    const committedFields = extractCommittedLiveRowFields(
      evidence.parsed?.committed_live_row ?? null,
    );
    const committed_live_row_present = evidence.parsed?.committed_live_row != null;
    const { row_review_status, row_blockers } = deriveFridgeBuyerPathOwnerReviewRowStatusV1({
      committed_live_row_present,
      destination_url: committedFields.destination_url,
      affiliate_url: committedFields.affiliate_url,
    });

    return {
      rank: index + 1,
      slug: bridgeRow.slug,
      oem_token: bridgeRow.oem_token,
      brand: bridgeRow.brand,
      factory_state: bridgeRow.factory_state,
      priority_score: bridgeRow.priority_score,
      evidence_artifact_paths: bridgeRow.evidence_artifact_paths,
      evidence_file_exists: evidence.evidence_file_exists,
      primary_evidence_artifact_path: evidence.primary_evidence_artifact_path,
      artifact_contract: evidence.parsed?.artifact_contract ?? null,
      artifact_report_name: evidence.parsed?.artifact_report_name ?? null,
      live_outcome_status:
        evidence.parsed?.live_outcome_status ?? bridgeRow.live_outcome_status,
      committed_buyer_path_status: bridgeRow.committed_buyer_path_status,
      why_not_gated: bridgeRow.why_not_gated,
      owner_review_ready: bridgeRow.owner_review_ready,
      committed_live_row_present,
      ...committedFields,
      asin: evidence.parsed?.asin ?? null,
      canonical_url: evidence.parsed?.canonical_url ?? null,
      evidence_mutation_ready: evidence.parsed?.evidence_mutation_ready ?? null,
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
      row_review_status,
      row_blockers,
    };
  });

  const row_review_ready_count = rows.filter(
    (r) => r.row_review_status === "READY_FOR_OWNER_REVIEW",
  ).length;
  const missing_committed_live_row_count = rows.filter(
    (r) => r.row_review_status === "MISSING_COMMITTED_ROW",
  ).length;
  const missing_destination_url_count = rows.filter(
    (r) => r.row_review_status === "MISSING_DESTINATION_URL",
  ).length;
  const missing_affiliate_url_count = rows.filter(
    (r) => r.row_review_status === "MISSING_AFFILIATE_URL",
  ).length;

  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: args.bridge.generated_at,
    wedge: "refrigerator_water",
    source_bridge_report: args.bridge.report_name,
    summary: {
      cohort_count: rows.length,
      owner_review_ready_count: args.bridge.summary.owner_review_ready_count,
      row_review_ready_count,
      missing_committed_live_row_count,
      missing_destination_url_count,
      missing_affiliate_url_count,
      mutation_ready_count: 0,
      formal_batch_exists: false,
      formal_batch_registry_path: args.bridge.summary.formal_batch_registry_path,
      apply_authorization_present: false,
      apply_mutation_authorized: false,
      csv_apply_authorized: false,
      retailer_links_mutation_authorized: false,
      supabase_mutation_authorized: false,
      public_ui_mutation_authorized: false,
      buy_link_mutation_authorized: false,
      recommended_next_action: FRIDGE_BUYER_PATH_OWNER_REVIEW_PACKET_RECOMMENDED_NEXT_ACTION_V1,
    },
    rows,
    proven_facts: [
      ...args.bridge.proven_facts,
      "PROVEN: row-level committed_live_row fields extracted from evidence artifact JSON on disk only.",
      "PROVEN: apply_mutation_authorized=false and csv_apply_authorized=false for every row.",
      `PROVEN: formal_batch_exists=false (no proven fridge batch run-registry at ${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}).`,
    ],
    unknown_facts: [
      ...args.bridge.unknown_facts,
      "UNKNOWN: Whether evidence committed_live_row still matches live Supabase/public.retailer_links — packet does not read Supabase.",
    ],
  };
}

export function buildFridgeBuyerPathOwnerReviewPacketV1(
  deps: BuildFridgeBuyerPathOwnerReviewPacketDepsV1,
): FridgeBuyerPathOwnerReviewPacketReportV1 {
  const buildBridge =
    deps.buildBridgeReport ??
    ((bridgeDeps: BuildFridgeBuyerPathOwnerReviewBridgeDepsV1) =>
      buildFridgeBuyerPathOwnerReviewBridgeV1(bridgeDeps));
  const bridge = buildBridge({
    rootDir: deps.rootDir,
    now: deps.now,
    readTextFile: deps.readTextFile,
    fileExists: deps.fileExists,
  });
  const readTextFile = deps.readTextFile ?? ((p: string) => readFileSync(p, "utf8"));
  const fileExists = deps.fileExists ?? ((p: string) => existsSync(p));
  return buildFridgeBuyerPathOwnerReviewPacketFromBridgeV1({
    bridge,
    rootDir: deps.rootDir,
    readTextFile,
    fileExists,
  });
}
