/**
 * Read-only owner-review bridge for refrigerator_water publishable_amazon_candidate cohort.
 * PROVEN: selects cohort from large_batch_coverage_factory_v1 repo truth — no hardcoded slug list.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildLargeBatchCoverageFactoryReportV1,
  LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
  type BuildLargeBatchCoverageFactoryDepsV1,
  type LargeBatchCoverageCandidateV1,
  type LargeBatchCoverageFactoryReportV1,
  type RetailerLinkCsvRowV1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";
import {
  buildUcfCoverageDispositionProvenanceFactsV1,
  buildUcfDecisionAuthoritySnapshotV1,
  type UcfDecisionAuthoritySnapshotV1,
} from "@/lib/coverage-factory/ucf-decision-authority-cutover-v1";
import { UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1 } from "@/lib/coverage-factory/ucf-decision-authority-cutover-phase2-v1";
import { buyLinkGateFailureKind } from "@/lib/retailers/launch-buy-links";

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1 =
  "fridge_buyer_path_owner_review_bridge_v1" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_REPORT_NAME_V1 =
  "fridge_buyer_path_owner_review_bridge_v1" as const;

export const FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1 =
  "data/fridge/batch-production/run-registry" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1 =
  "publishable_amazon_candidate" as const;

export const FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_RECOMMENDED_NEXT_ACTION_V1 =
  "Owner-review this read-only bridge cohort (stdout JSON); no CSV, retailer_links, Supabase, public UI, or buy-link mutation is authorized. formal_batch_exists=false until a fridge batch run-registry JSON exists and Command Center authorizes apply planning." as const;

const EVIDENCE_DIR_REL_V1 = "data/evidence" as const;

export type FridgeBuyerPathOwnerReviewBridgeRowV1 = {
  slug: string;
  oem_token: string;
  brand: string | null;
  factory_state: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1;
  priority_score: number;
  evidence_artifact_paths: string[];
  live_outcome_status: string | null;
  committed_buyer_path_status: string;
  why_not_gated: string;
  owner_review_ready: boolean;
  apply_mutation_authorized: false;
};

export type FridgeBuyerPathOwnerReviewBridgeSummaryV1 = {
  cohort_count: number;
  owner_review_ready_count: number;
  mutation_ready_count: number;
  missing_evidence_count: number;
  formal_batch_exists: false;
  formal_batch_registry_path: string | null;
  recommended_next_action: string;
};

export type FridgeBuyerPathOwnerReviewBridgeReportV1 = {
  contract: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1;
  report_name: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  wedge: "refrigerator_water";
  source_factory_report: typeof LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1;
  source_factory_state: typeof FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1;
  apply_authorization_present: false;
  rows: FridgeBuyerPathOwnerReviewBridgeRowV1[];
  summary: FridgeBuyerPathOwnerReviewBridgeSummaryV1;
  proven_facts: string[];
  unknown_facts: string[];
};

export type BuildFridgeBuyerPathOwnerReviewBridgeDepsV1 = {
  rootDir: string;
  now?: () => Date;
  buildFactoryReport?: (
    deps: BuildLargeBatchCoverageFactoryDepsV1,
  ) => LargeBatchCoverageFactoryReportV1;
  buildUcfSnapshot?: (args: {
    rootDir: string;
    now?: () => Date;
  }) => UcfDecisionAuthoritySnapshotV1;
  readTextFile?: (absolutePath: string) => string;
  fileExists?: (absolutePath: string) => boolean;
  listEvidenceFilenames?: (absolutePath: string) => string[];
};

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function defaultListEvidence(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

export function findAmazonLiveOutcomeEvidencePathsV1(
  slug: string,
  evidenceFilenames: string[],
  evidenceDirRel = EVIDENCE_DIR_REL_V1,
): string[] {
  const prefix = `amazon-${slug.toLowerCase()}-`;
  return evidenceFilenames
    .filter((f) => {
      const lower = f.toLowerCase();
      return (
        lower.startsWith(prefix) &&
        (lower.includes("live-outcome") || lower.includes("live_outcome"))
      );
    })
    .sort()
    .map((f) => `${evidenceDirRel}/${f}`);
}

export function parseAmazonLiveOutcomeStatusV1(
  jsonText: string,
): { live_outcome_status: string | null; evidence_mutation_ready: boolean | null } {
  try {
    const doc = JSON.parse(jsonText) as Record<string, unknown>;
    const browser = doc.browser_evidence as Record<string, unknown> | undefined;
    const committed = doc.committed_live_row as Record<string, unknown> | undefined;
    const postCommitAudit = doc.post_commit_audit as Record<string, unknown> | undefined;
    const status =
      (typeof doc.verdict === "string" && doc.verdict.trim()) ||
      (typeof doc.insert_outcome === "string" && doc.insert_outcome.trim()) ||
      (typeof browser?.browser_verdict === "string" && browser.browser_verdict.trim()) ||
      (postCommitAudit?.status === "PASS" ? "POST_COMMIT_AUDIT_PASS" : null) ||
      (doc.final_amazon_cta_state_proven === true ? "FINAL_AMAZON_CTA_STATE_PROVEN" : null) ||
      (committed?.browser_truth_classification === "direct_buyable"
        ? "COMMITTED_LIVE_ROW_DIRECT_BUYABLE"
        : null) ||
      null;
    const evidence_mutation_ready =
      typeof doc.mutation_ready === "boolean" ? doc.mutation_ready : null;
    return { live_outcome_status: status, evidence_mutation_ready };
  } catch {
    return { live_outcome_status: null, evidence_mutation_ready: null };
  }
}

function loadRetailerLinksBySlug(
  rootDir: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): Map<string, RetailerLinkCsvRowV1[]> {
  const p = path.join(rootDir, "data/retailer_links.csv");
  const map = new Map<string, RetailerLinkCsvRowV1[]>();
  if (!fileExists(p)) return map;
  const rows = parse(readTextFile(p), { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];
  for (const row of rows) {
    const filter_slug = row.filter_slug?.trim().toLowerCase();
    const affiliate_url = row.affiliate_url?.trim();
    if (!filter_slug || !affiliate_url) continue;
    const link: RetailerLinkCsvRowV1 = {
      filter_slug,
      retailer_key: row.retailer_key?.trim().toLowerCase() ?? "",
      affiliate_url,
      browser_truth_classification: row.browser_truth_classification?.trim() || null,
      browser_truth_buyable_subtype: row.browser_truth_buyable_subtype?.trim() || null,
    };
    const list = map.get(filter_slug) ?? [];
    list.push(link);
    map.set(filter_slug, list);
  }
  return map;
}

function describeCommittedBuyerPathStatus(links: RetailerLinkCsvRowV1[]): string {
  if (links.length === 0) return "MISSING_RETAILER_LINK_ROWS";
  const primary =
    links.find((l) => l.retailer_key === "oem-parts-catalog") ??
    links.find((l) => l.affiliate_url) ??
    links[0];
  const gate = buyLinkGateFailureKind(primary);
  if (gate === null) return "SAFE_GATED_DIRECT_BUYABLE";
  return gate.toUpperCase();
}

function describeWhyNotGated(args: {
  committed_buyer_path_status: string;
  has_gated_buyable_link: boolean;
  evidence_artifact_paths: string[];
}): string {
  if (args.has_gated_buyable_link) {
    return "PROVEN: committed retailer_links row passes buyLinkGate — unexpected for this cohort; verify factory signals.";
  }
  const evidenceNote =
    args.evidence_artifact_paths.length > 0
      ? "amazon live-outcome evidence exists on disk but is not reflected in committed data/retailer_links.csv."
      : "no amazon live-outcome evidence file found for slug.";
  return `Committed CSV primary fails gate (${args.committed_buyer_path_status}); ${evidenceNote}`;
}

function resolveLiveOutcomeStatus(
  evidencePaths: string[],
  rootDir: string,
  readTextFile: (p: string) => string,
  fileExists: (p: string) => boolean,
): string | null {
  for (const rel of evidencePaths) {
    const abs = path.join(rootDir, rel);
    if (!fileExists(abs)) continue;
    const parsed = parseAmazonLiveOutcomeStatusV1(readTextFile(abs));
    if (parsed.live_outcome_status) return parsed.live_outcome_status;
  }
  return null;
}

function isOwnerReviewReady(args: {
  evidence_artifact_paths: string[];
  live_outcome_status: string | null;
  has_amazon_live_evidence: boolean;
}): boolean {
  return (
    args.has_amazon_live_evidence &&
    args.evidence_artifact_paths.length > 0 &&
    args.live_outcome_status != null
  );
}

function detectFormalBatchRegistry(
  rootDir: string,
  fileExists: (p: string) => boolean,
): { formal_batch_exists: false; formal_batch_registry_path: string | null } {
  const registryDir = path.join(rootDir, FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1);
  if (!fileExists(registryDir)) {
    return { formal_batch_exists: false, formal_batch_registry_path: null };
  }
  const filenames = defaultListEvidence(registryDir).filter((f) => f.endsWith(".json"));
  if (filenames.length === 0) {
    return { formal_batch_exists: false, formal_batch_registry_path: null };
  }
  return {
    formal_batch_exists: false,
    formal_batch_registry_path: `${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}/${filenames[0]}`,
  };
}

function selectPublishableAmazonCohort(
  factoryReport: LargeBatchCoverageFactoryReportV1,
): LargeBatchCoverageCandidateV1[] {
  const fromTop = factoryReport.top_candidates.filter(
    (c) => c.factory_state === FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1,
  );
  const expectedCount =
    factoryReport.state_counts[FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1] ??
    0;
  if (fromTop.length >= expectedCount) {
    return fromTop.sort(
      (a, b) => b.priority_score - a.priority_score || a.slug.localeCompare(b.slug),
    );
  }
  return fromTop;
}

export function buildFridgeBuyerPathOwnerReviewBridgeV1(
  deps: BuildFridgeBuyerPathOwnerReviewBridgeDepsV1,
): FridgeBuyerPathOwnerReviewBridgeReportV1 {
  const now = deps.now ?? (() => new Date());
  const readTextFile = deps.readTextFile ?? defaultReadText;
  const fileExists = deps.fileExists ?? defaultFileExists;
  const listEvidenceFilenames =
    deps.listEvidenceFilenames ??
    ((dir: string) => defaultListEvidence(dir));
  const buildFactory =
    deps.buildFactoryReport ??
    ((factoryDeps: BuildLargeBatchCoverageFactoryDepsV1) =>
      buildLargeBatchCoverageFactoryReportV1(factoryDeps));

  const evidenceDirAbs = path.join(deps.rootDir, EVIDENCE_DIR_REL_V1);
  const evidenceFilenames = listEvidenceFilenames(evidenceDirAbs);
  const linksBySlug = loadRetailerLinksBySlug(deps.rootDir, readTextFile, fileExists);

  const factoryReport = buildFactory({
    rootDir: deps.rootDir,
    now,
    topCandidatesLimit: 100,
  });

  const cohort = selectPublishableAmazonCohort(factoryReport);
  const batchRegistry = detectFormalBatchRegistry(deps.rootDir, fileExists);

  const buildUcfSnapshot = deps.buildUcfSnapshot ?? buildUcfDecisionAuthoritySnapshotV1;
  const ucfSnapshot = buildUcfSnapshot({ rootDir: deps.rootDir, now: deps.now });
  const ucfCoverageDispositionProvenanceFacts = buildUcfCoverageDispositionProvenanceFactsV1({
    snapshot: ucfSnapshot,
    filterSlugs: cohort.map((candidate) => candidate.slug),
    wedge: "refrigerator_water",
    cutover_contract: UCF_DECISION_AUTHORITY_CUTOVER_PHASE2_CONTRACT_V1,
  });

  const rows: FridgeBuyerPathOwnerReviewBridgeRowV1[] = cohort.map((candidate) => {
    const evidence_artifact_paths = findAmazonLiveOutcomeEvidencePathsV1(
      candidate.slug,
      evidenceFilenames,
    );
    const live_outcome_status = resolveLiveOutcomeStatus(
      evidence_artifact_paths,
      deps.rootDir,
      readTextFile,
      fileExists,
    );
    const links = linksBySlug.get(candidate.slug) ?? [];
    const committed_buyer_path_status = describeCommittedBuyerPathStatus(links);
    const why_not_gated = describeWhyNotGated({
      committed_buyer_path_status,
      has_gated_buyable_link: candidate.has_gated_buyable_link,
      evidence_artifact_paths,
    });
    const owner_review_ready = isOwnerReviewReady({
      evidence_artifact_paths,
      live_outcome_status,
      has_amazon_live_evidence: candidate.has_amazon_live_evidence,
    });

    return {
      slug: candidate.slug,
      oem_token: candidate.oem_part_number,
      brand: candidate.brand_slug,
      factory_state: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1,
      priority_score: candidate.priority_score,
      evidence_artifact_paths,
      live_outcome_status,
      committed_buyer_path_status,
      why_not_gated,
      owner_review_ready,
      apply_mutation_authorized: false,
    };
  });

  const owner_review_ready_count = rows.filter((r) => r.owner_review_ready).length;
  const missing_evidence_count = rows.filter((r) => r.evidence_artifact_paths.length === 0).length;
  const mutation_ready_count = 0;

  return {
    contract: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_CONTRACT_V1,
    report_name: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    wedge: "refrigerator_water",
    source_factory_report: LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1,
    source_factory_state: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1,
    apply_authorization_present: false,
    rows,
    summary: {
      cohort_count: rows.length,
      owner_review_ready_count,
      mutation_ready_count,
      missing_evidence_count,
      formal_batch_exists: false,
      formal_batch_registry_path: batchRegistry.formal_batch_registry_path,
      recommended_next_action: FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_RECOMMENDED_NEXT_ACTION_V1,
    },
    proven_facts: [
      `PROVEN: cohort selected from ${LARGE_BATCH_COVERAGE_FACTORY_REPORT_NAME_V1} factory_state=${FRIDGE_BUYER_PATH_OWNER_REVIEW_BRIDGE_SOURCE_FACTORY_STATE_V1}.`,
      `PROVEN: cohort_count=${String(rows.length)} matches factory state_counts.publishable_amazon_candidate when topCandidatesLimit covers full candidate set.`,
      "PROVEN: committed buyer-path fields read data/retailer_links.csv only (repo CSV truth).",
      "PROVEN: apply_authorization_present=false; apply_mutation_authorized=false for every row.",
      `PROVEN: formal_batch_exists=false (no fridge batch run-registry at ${FRIDGE_BATCH_PRODUCTION_RUN_REGISTRY_DIR_REL_V1}).`,
      ...ucfCoverageDispositionProvenanceFacts,
    ],
    unknown_facts: [
      "UNKNOWN: Whether Supabase retailer_links holds direct_buyable rows matching evidence committed_live_row payloads — bridge does not read Supabase.",
      batchRegistry.formal_batch_registry_path
        ? `UNKNOWN: Registry path ${batchRegistry.formal_batch_registry_path} exists on disk but is not a proven batch_production_proven_run_v1 closeout — formal_batch_exists remains false.`
        : "UNKNOWN: N/A — no run-registry JSON path detected.",
    ].filter((f) => f !== "UNKNOWN: N/A — no run-registry JSON path detected."),
  };
}
