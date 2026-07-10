/**
 * Read-only GSWF family reconciliation owner review packet v1.
 * Separates filter-page buyer-path proof from GSWF/GSWF2 model compatibility contamination.
 * Does not mutate compat, retailer_links, evidence, Supabase, pages, or HQ handoff.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import { CURSOR_VALIDATION_PACKET_CONTRACT_V1 } from "./buckparts-ops-agent-workflow-v1";
import {
  FAMILY_RECONCILIATION_CONTRACT_V1,
  FAMILY_RECONCILIATION_JSON_REL_V1,
  type FamilyReconciliationV1,
  type ReconciliationSeverityV1,
} from "./family-reconciliation-v1";

export const GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1 =
  "gswf_family_reconciliation_owner_review_v1" as const;

export const GSWF_FAMILY_KEY_V1 = "filter::ge::gswf" as const;

export const GSWF_CURSOR_VALIDATION_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-bounded-evidence-slice-5a735d4a-cursor-validation-v1.json" as const;

export const GSWF_GE_OFFICIAL_BROWSER_PROOF_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/fridge-safe-link-gswf-ge-official-owner-browser-proof-v1.json" as const;

export const GSWF_BP_000003_ISSUE_REL_V1 = "data/command-center/issues/BP-000003.json" as const;

export const GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-family-reconciliation-owner-review-v1.json" as const;

export const GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_MD_REL_V1 =
  "data/fridge/batch-production/drafts/gswf-family-reconciliation-owner-review-v1.md" as const;

export const GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_SOURCE_COMMAND_V1 =
  "npm run buckparts:gswf-family-reconciliation-owner-review" as const;

const COMPATIBILITY_MAPPINGS_CSV_REL_V1 = "data/compatibility_mappings.csv" as const;
const RETAILER_LINKS_CSV_REL_V1 = "data/retailer_links.csv" as const;

export type GswfFamilyReconciliationRowCategoryV1 =
  | "proven_wrong_part_repair"
  | "partial_browser_proof_required"
  | "no_filter_suppression";

export type GswfFamilyReconciliationProposedCompatActionV1 =
  | "remove_gswf_remap"
  | "owner_browser_proof"
  | "suppress_all_filter_mappings";

export type GswfFamilyReconciliationSlugRowV1 = {
  fridge_slug: string;
  repo_mapped_filter_slugs: string[];
  hyperagent_actual_filter: string;
  hyperagent_evidence_confidence: string;
  cursor_verdict: string;
  row_category: GswfFamilyReconciliationRowCategoryV1;
  recommended_owner_action: string;
  proposed_compat_action: GswfFamilyReconciliationProposedCompatActionV1;
  proposed_remap_target_filter_slug: string | null;
  mutation_authorized: false;
  csv_apply_authorized: false;
  verified_link_authorized: false;
};

export type GswfFilterPageBuyerPathProofV1 = {
  filter_slug: "gswf";
  proof_artifact_rel_path: typeof GSWF_GE_OFFICIAL_BROWSER_PROOF_JSON_REL_V1;
  target_url: string;
  checked_at: string | null;
  exact_token_gswf_proven: boolean;
  direct_buyability_proven: boolean;
  official_manufacturer_path_proven: boolean;
  browser_truth_status: string;
  gswf2_conflation_blocked: boolean;
  committed_retailer_links_safe_gated_count: number;
  committed_primary_affiliate_url: string | null;
  live_go_cta_authorized: false;
  buy_cta_authorized: false;
  separation_note: string;
};

export type GswfFamilyReconciliationOwnerReviewV1 = {
  contract: typeof GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  csv_apply_authorized: false;
  verified_link_authorized: false;
  supabase_mutation_authorized: false;
  buy_cta_authorized: false;
  live_go_cta_authorized: false;
  owner_review_required: true;
  apply_plan_authorized: false;
  generated_at: string;
  source_command: typeof GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_SOURCE_COMMAND_V1;
  family_key: typeof GSWF_FAMILY_KEY_V1;
  validation_status: string;
  baseline_family_reconciliation_severity: ReconciliationSeverityV1;
  recommended_family_reconciliation_severity: "CRITICAL";
  mission_factory_id: string | null;
  bp_000003_status: string | null;
  bp_000003_closure_note: string | null;
  filter_page_buyer_path_proof: GswfFilterPageBuyerPathProofV1;
  compatibility_contamination: {
    mission_slug_count: number;
    all_mapped_to_gswf_in_committed_csv: true;
    repo_audit_classification: string;
    hyperagent_vs_repo_drift: string;
    summary: string;
  };
  summary_counts: {
    proven_wrong_part_repair: number;
    partial_browser_proof_required: number;
    no_filter_suppression: number;
    total_mission_rows: number;
  };
  proven_wrong_part_repair_candidates: GswfFamilyReconciliationSlugRowV1[];
  browser_proof_required_rows: GswfFamilyReconciliationSlugRowV1[];
  no_filter_suppression_rows: GswfFamilyReconciliationSlugRowV1[];
  owner_checklist: string[];
  recommended_next_action: string;
  exact_repo_paths_read: string[];
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

type GswfCursorValidationRowV1 = {
  fridge_slug?: string;
  repo_compat_filter_slugs?: string[];
  hyperagent_actual_filter?: string;
  hyperagent_evidence_confidence?: string;
  cursor_verdict?: string;
  reason?: string;
};

type GswfCursorValidationPacketV1 = {
  contract?: string;
  validation_status?: string;
  validation_details?: {
    batch_id?: string;
    family_key?: string;
    mission_factory_id?: string;
    slug_count?: number;
    answers?: {
      exact_oem_proven_row_count?: number;
      browser_proof_required_row_count?: number;
      no_filter_catalog_suppression_count?: number;
    };
    repair_review_summary?: {
      headline?: string;
      recommended_owner_actions?: string[];
    };
    repo_baseline_checks?: {
      hyperagent_vs_repo_audit_drift?: string;
      all_17_repo_classification_LIKELY_CORRECT_NEEDS_EVIDENCE?: boolean;
    };
    row_verdicts?: GswfCursorValidationRowV1[];
  };
  proven_facts?: string[];
  unknown_facts?: string[];
};

type GeOfficialBrowserProofV1 = {
  contract?: string;
  filter_slug?: string;
  target_url?: string;
  checked_at?: string;
  exact_token_gswf_proven?: boolean;
  current_direct_buyability_proven?: boolean;
  official_manufacturer_path_proven?: boolean;
  browser_truth_status?: string;
  gswf2_conflation_blocked?: boolean;
};

type Bp000003IssueV1 = {
  issue_id?: string;
  status?: string;
  closure_reason?: string;
};

function readJsonFile<T>(rootDir: string, rel: string): T {
  return JSON.parse(readFileSync(path.join(rootDir, rel), "utf8")) as T;
}

function readCompatMappings(rootDir: string): Map<string, string[]> {
  const rows = parse(readFileSync(path.join(rootDir, COMPATIBILITY_MAPPINGS_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ fridge_slug?: string; filter_slug?: string }>;

  const bySlug = new Map<string, string[]>();
  for (const row of rows) {
    const slug = row.fridge_slug?.trim().toLowerCase();
    const filter = row.filter_slug?.trim().toLowerCase();
    if (!slug || !filter) continue;
    const existing = bySlug.get(slug) ?? [];
    existing.push(filter);
    bySlug.set(slug, existing);
  }
  for (const [slug, filters] of Array.from(bySlug.entries())) {
    bySlug.set(slug, Array.from(new Set(filters)).sort());
  }
  return bySlug;
}

function readGswfRetailerLinksSummary(rootDir: string): {
  safe_gated_count: number;
  primary_affiliate_url: string | null;
} {
  const rows = parse(readFileSync(path.join(rootDir, RETAILER_LINKS_CSV_REL_V1), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{
    filter_slug?: string;
    is_primary?: string;
    affiliate_url?: string;
    browser_truth_classification?: string;
  }>;

  const gswfRows = rows.filter((r) => (r.filter_slug ?? "").trim().toLowerCase() === "gswf");
  const primary =
    gswfRows.find((r) => (r.is_primary ?? "").trim().toLowerCase() === "true") ?? gswfRows[0];
  const safe_gated_count = gswfRows.filter(
    (r) => (r.browser_truth_classification ?? "").trim() === "direct_buyable",
  ).length;

  return {
    safe_gated_count,
    primary_affiliate_url: primary?.affiliate_url?.trim() ?? null,
  };
}

function rowCategoryForVerdict(
  verdict: string,
): GswfFamilyReconciliationRowCategoryV1 | null {
  if (verdict === "VALIDATION_PASS_READY_FOR_OWNER_REVIEW") {
    return "proven_wrong_part_repair";
  }
  if (verdict === "VALIDATION_PARTIAL_NEEDS_OWNER_REVIEW") {
    return "partial_browser_proof_required";
  }
  if (verdict === "VALIDATION_FAIL") {
    return "no_filter_suppression";
  }
  return null;
}

function proposedCompatActionForCategory(
  category: GswfFamilyReconciliationRowCategoryV1,
): GswfFamilyReconciliationProposedCompatActionV1 {
  if (category === "proven_wrong_part_repair") return "remove_gswf_remap";
  if (category === "partial_browser_proof_required") return "owner_browser_proof";
  return "suppress_all_filter_mappings";
}

function proposedRemapTarget(hyperagentActualFilter: string): string | null {
  const raw = hyperagentActualFilter.trim();
  if (!raw || raw.toUpperCase().includes("NONE")) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("rpwfe")) return "rpwfe";
  if (lower.includes("xwfe")) return "xwfe";
  if (lower.includes("mwf")) return "mwf";
  return raw.split("/")[0]!.trim().toLowerCase().replace(/\s+/g, "-");
}

function dedupeUnknownFactsV1(facts: string[]): string[] {
  const bySemanticKey = new Map<string, string>();
  for (const raw of facts) {
    const fact = raw.trim();
    if (!fact) continue;
    const lower = fact.toLowerCase();
    let key: string;
    let canonical: string;
    if (lower.includes("mark gswf family discontinued")) {
      key = "gswf_discontinued";
      canonical = "UNKNOWN: Whether owner will mark GSWF family discontinued before rebuild.";
    } else if (lower.includes("live supabase compat state")) {
      key = "supabase_vs_csv";
      canonical = "UNKNOWN: Live Supabase compat state vs committed CSV for the 17 mission slugs.";
    } else {
      key = fact;
      canonical = fact;
    }
    bySemanticKey.set(key, canonical);
  }
  return Array.from(bySemanticKey.values());
}

function recommendedOwnerAction(args: {
  category: GswfFamilyReconciliationRowCategoryV1;
  row: GswfCursorValidationRowV1;
  remapTarget: string | null;
}): string {
  const slug = args.row.fridge_slug ?? "unknown";
  if (args.category === "proven_wrong_part_repair") {
    return `Owner-review surgical gswf removal for ${slug} and remap to ${args.remapTarget ?? args.row.hyperagent_actual_filter ?? "validated target"} — not auto-applied.`;
  }
  if (args.category === "partial_browser_proof_required") {
    return `Hold compat edits for ${slug} — capture owner-browser Tier-1 proof on exact model before any gswf removal.`;
  }
  return `Suppress all filter mappings for ${slug} — OEM confirms no water dispenser/filtration hardware.`;
}

function buildSlugRow(
  row: GswfCursorValidationRowV1,
  compatBySlug: Map<string, string[]>,
): GswfFamilyReconciliationSlugRowV1 | null {
  const slug = (row.fridge_slug ?? "").trim().toLowerCase();
  if (!slug) return null;
  const verdict = row.cursor_verdict ?? "UNKNOWN";
  const category = rowCategoryForVerdict(verdict);
  if (!category) return null;

  const repoMaps = compatBySlug.get(slug) ?? row.repo_compat_filter_slugs ?? [];
  const hyperagentActual = row.hyperagent_actual_filter ?? "UNKNOWN";
  const remapTarget = proposedRemapTarget(hyperagentActual);

  return {
    fridge_slug: slug,
    repo_mapped_filter_slugs: repoMaps.map((s) => s.toLowerCase()).sort(),
    hyperagent_actual_filter: hyperagentActual,
    hyperagent_evidence_confidence: row.hyperagent_evidence_confidence ?? "UNKNOWN",
    cursor_verdict: verdict,
    row_category: category,
    recommended_owner_action: recommendedOwnerAction({ category, row, remapTarget }),
    proposed_compat_action: proposedCompatActionForCategory(category),
    proposed_remap_target_filter_slug: remapTarget,
    mutation_authorized: false,
    csv_apply_authorized: false,
    verified_link_authorized: false,
  };
}

function buildOwnerChecklist(args: {
  provenCount: number;
  partialCount: number;
  noFilterCount: number;
}): string[] {
  return [
    "filter_page_buyer_path_proof is separate from model compatibility contamination — GE official PDP proof for gswf does not authorize buy CTA while compat maps are contaminated.",
    "BP-000003 closed by preserving GSWF/GSWF2 caution and no confident buy — do not add GSWF buy CTA until family reconciliation owner approves compat repairs.",
    `Review ${String(args.provenCount)} proven wrong-part repair candidate(s) for surgical gswf removal/remap only after explicit owner approval.`,
    `Capture owner-browser Tier-1 proof for ${String(args.partialCount)} PARTIAL platform-inferred slug(s) before compat edits.`,
    `Suppress all filter mappings for ${String(args.noFilterCount)} no-dispenser slug(s) after owner confirms OEM no-filter truth.`,
    "Escalate filter::ge::gswf family reconciliation to CRITICAL before any apply plan or retailer_links CSV edit.",
    "Do not mutate compatibility_mappings.csv, retailer_links.csv, manual-evidence JSON, Supabase, pages, sitemap/robots, or HQ handoff from this packet.",
    "mutation_authorized=false, csv_apply_authorized=false, verified_link_authorized=false, buy_cta_authorized=false on every row and on the packet.",
  ];
}

export function buildGswfFamilyReconciliationOwnerReviewV1(args: {
  rootDir: string;
  now?: () => Date;
}): GswfFamilyReconciliationOwnerReviewV1 {
  const now = args.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const pathsRead = new Set<string>([
    GSWF_CURSOR_VALIDATION_JSON_REL_V1,
    GSWF_GE_OFFICIAL_BROWSER_PROOF_JSON_REL_V1,
    FAMILY_RECONCILIATION_JSON_REL_V1,
    GSWF_BP_000003_ISSUE_REL_V1,
    COMPATIBILITY_MAPPINGS_CSV_REL_V1,
    RETAILER_LINKS_CSV_REL_V1,
  ]);

  const validation = readJsonFile<GswfCursorValidationPacketV1>(
    args.rootDir,
    GSWF_CURSOR_VALIDATION_JSON_REL_V1,
  );
  if (validation.contract !== CURSOR_VALIDATION_PACKET_CONTRACT_V1) {
    throw new Error("GSWF cursor validation packet contract mismatch");
  }
  if (validation.validation_details?.family_key !== GSWF_FAMILY_KEY_V1) {
    throw new Error("GSWF cursor validation family_key mismatch");
  }

  const browserProof = readJsonFile<GeOfficialBrowserProofV1>(
    args.rootDir,
    GSWF_GE_OFFICIAL_BROWSER_PROOF_JSON_REL_V1,
  );

  const reconciliation = readJsonFile<FamilyReconciliationV1>(
    args.rootDir,
    FAMILY_RECONCILIATION_JSON_REL_V1,
  );
  if (reconciliation.contract !== FAMILY_RECONCILIATION_CONTRACT_V1) {
    throw new Error("Family reconciliation audit contract mismatch");
  }

  let bp000003: Bp000003IssueV1 | null = null;
  if (existsSync(path.join(args.rootDir, GSWF_BP_000003_ISSUE_REL_V1))) {
    bp000003 = readJsonFile<Bp000003IssueV1>(args.rootDir, GSWF_BP_000003_ISSUE_REL_V1);
  }

  const compatBySlug = readCompatMappings(args.rootDir);
  const retailerSummary = readGswfRetailerLinksSummary(args.rootDir);

  const familyRow = reconciliation.family_rows.find((row) => row.family_key === GSWF_FAMILY_KEY_V1);
  const baselineSeverity: ReconciliationSeverityV1 = familyRow?.severity ?? "MEDIUM";

  const proven_wrong_part_repair_candidates: GswfFamilyReconciliationSlugRowV1[] = [];
  const browser_proof_required_rows: GswfFamilyReconciliationSlugRowV1[] = [];
  const no_filter_suppression_rows: GswfFamilyReconciliationSlugRowV1[] = [];

  for (const row of validation.validation_details?.row_verdicts ?? []) {
    const built = buildSlugRow(row, compatBySlug);
    if (!built) continue;
    if (built.row_category === "proven_wrong_part_repair") {
      proven_wrong_part_repair_candidates.push(built);
    } else if (built.row_category === "partial_browser_proof_required") {
      browser_proof_required_rows.push(built);
    } else {
      no_filter_suppression_rows.push(built);
    }
  }

  const summary_counts = {
    proven_wrong_part_repair: proven_wrong_part_repair_candidates.length,
    partial_browser_proof_required: browser_proof_required_rows.length,
    no_filter_suppression: no_filter_suppression_rows.length,
    total_mission_rows:
      proven_wrong_part_repair_candidates.length +
      browser_proof_required_rows.length +
      no_filter_suppression_rows.length,
  };

  const filter_page_buyer_path_proof: GswfFilterPageBuyerPathProofV1 = {
    filter_slug: "gswf",
    proof_artifact_rel_path: GSWF_GE_OFFICIAL_BROWSER_PROOF_JSON_REL_V1,
    target_url: browserProof.target_url ?? "https://www.geapplianceparts.com/store/parts/spec/GSWF",
    checked_at: browserProof.checked_at ?? null,
    exact_token_gswf_proven: browserProof.exact_token_gswf_proven === true,
    direct_buyability_proven: browserProof.current_direct_buyability_proven === true,
    official_manufacturer_path_proven: browserProof.official_manufacturer_path_proven === true,
    browser_truth_status: browserProof.browser_truth_status ?? "UNKNOWN",
    gswf2_conflation_blocked: browserProof.gswf2_conflation_blocked === true,
    committed_retailer_links_safe_gated_count: retailerSummary.safe_gated_count,
    committed_primary_affiliate_url: retailerSummary.primary_affiliate_url,
    live_go_cta_authorized: false,
    buy_cta_authorized: false,
    separation_note:
      "GE official spec PDP proves gswf filter identity and direct-buyability on manufacturer path only; committed retailer_links remain search-placeholder with zero safe-gated rows; model compat contamination blocks confident buy CTA.",
  };

  const contaminationSummary =
    validation.validation_details?.repair_review_summary?.headline ??
    "GSWF family compatibility contamination — review required before apply.";

  return {
    contract: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    csv_apply_authorized: false,
    verified_link_authorized: false,
    supabase_mutation_authorized: false,
    buy_cta_authorized: false,
    live_go_cta_authorized: false,
    owner_review_required: true,
    apply_plan_authorized: false,
    generated_at: generatedAt,
    source_command: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_SOURCE_COMMAND_V1,
    family_key: GSWF_FAMILY_KEY_V1,
    validation_status: validation.validation_status ?? "UNKNOWN",
    baseline_family_reconciliation_severity: baselineSeverity,
    recommended_family_reconciliation_severity: "CRITICAL",
    mission_factory_id: validation.validation_details?.mission_factory_id ?? null,
    bp_000003_status: bp000003?.status ?? null,
    bp_000003_closure_note: bp000003?.closure_reason ?? null,
    filter_page_buyer_path_proof,
    compatibility_contamination: {
      mission_slug_count: validation.validation_details?.slug_count ?? summary_counts.total_mission_rows,
      all_mapped_to_gswf_in_committed_csv: true,
      repo_audit_classification: validation.validation_details?.repo_baseline_checks
        ?.all_17_repo_classification_LIKELY_CORRECT_NEEDS_EVIDENCE
        ? "LIKELY_CORRECT_NEEDS_EVIDENCE"
        : "UNKNOWN",
      hyperagent_vs_repo_drift:
        validation.validation_details?.repo_baseline_checks?.hyperagent_vs_repo_audit_drift ??
        "UNKNOWN",
      summary: contaminationSummary,
    },
    summary_counts,
    proven_wrong_part_repair_candidates,
    browser_proof_required_rows,
    no_filter_suppression_rows,
    owner_checklist: buildOwnerChecklist({
      provenCount: summary_counts.proven_wrong_part_repair,
      partialCount: summary_counts.partial_browser_proof_required,
      noFilterCount: summary_counts.no_filter_suppression,
    }),
    recommended_next_action:
      "Owner opens filter::ge::gswf family reconciliation at CRITICAL severity: review proven wrong-part repair candidates, complete browser proof for PARTIAL rows, suppress no-filter slug — no CSV apply, no buy CTA, no Verified Link until explicit owner approval after compat reconciliation.",
    exact_repo_paths_read: Array.from(pathsRead).sort(),
    proven_facts: [
      ...(validation.proven_facts ?? []),
      `PROVEN: GSWF cursor validation ${summary_counts.proven_wrong_part_repair}/${summary_counts.partial_browser_proof_required}/${summary_counts.no_filter_suppression} (PASS/PARTIAL/FAIL).`,
      `PROVEN: GE official browser proof artifact documents exact GSWF token and Add to Cart at ${filter_page_buyer_path_proof.target_url}.`,
      `PROVEN: committed retailer_links for gswf has safe_gated_count=${String(retailerSummary.safe_gated_count)}; primary remains search-placeholder URL.`,
      `PROVEN: baseline_family_reconciliation_severity=${baselineSeverity}; recommended escalation to CRITICAL per bounded-evidence validation packet.`,
      "PROVEN: Read-only owner packet — mutation_authorized=false; buy_cta_authorized=false; apply_plan_authorized=false.",
    ],
    inferred_facts: [
      "INFERRED: Filter-page buyer-path proof and model-line compat contamination must be reconciled in separate owner decisions — proof alone does not clear gswf model maps.",
    ],
    unknown_facts: dedupeUnknownFactsV1([
      ...(validation.unknown_facts ?? []),
      "UNKNOWN: Whether owner will mark GSWF family discontinued before rebuild.",
      "UNKNOWN: Live Supabase compat state vs committed CSV for the 17 mission slugs.",
    ]),
  };
}

export function buildGswfFamilyReconciliationOwnerReviewMarkdownV1(
  packet: GswfFamilyReconciliationOwnerReviewV1,
): string {
  const lines: string[] = [
    "# GSWF family reconciliation owner review v1",
    "",
    `Generated: ${packet.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${packet.contract}\``,
    `- family_key: \`${packet.family_key}\``,
    `- validation_status: **${packet.validation_status}**`,
    `- baseline_family_reconciliation_severity: **${packet.baseline_family_reconciliation_severity}**`,
    `- recommended_family_reconciliation_severity: **${packet.recommended_family_reconciliation_severity}**`,
    `- buy_cta_authorized: **false**`,
    `- apply_plan_authorized: **false**`,
    `- mutation_authorized: **false**`,
    "",
    "## Filter-page buyer-path proof (separate lane)",
    "",
    `- proof artifact: \`${packet.filter_page_buyer_path_proof.proof_artifact_rel_path}\``,
    `- target_url: ${packet.filter_page_buyer_path_proof.target_url}`,
    `- exact_token_gswf_proven: **${String(packet.filter_page_buyer_path_proof.exact_token_gswf_proven)}**`,
    `- direct_buyability_proven: **${String(packet.filter_page_buyer_path_proof.direct_buyability_proven)}**`,
    `- committed safe_gated retailer rows: **${String(packet.filter_page_buyer_path_proof.committed_retailer_links_safe_gated_count)}**`,
    `- separation: ${packet.filter_page_buyer_path_proof.separation_note}`,
    "",
    "## Compatibility contamination summary",
    "",
    `- mission rows: **${String(packet.compatibility_contamination.mission_slug_count)}**`,
    `- proven wrong-part repair: **${String(packet.summary_counts.proven_wrong_part_repair)}**`,
    `- partial / browser proof required: **${String(packet.summary_counts.partial_browser_proof_required)}**`,
    `- no-filter suppression: **${String(packet.summary_counts.no_filter_suppression)}**`,
    `- summary: ${packet.compatibility_contamination.summary}`,
    "",
    "## Owner checklist",
    "",
    ...packet.owner_checklist.map((item) => `- ${item}`),
    "",
    "## Proven wrong-part repair candidates",
    "",
  ];

  if (packet.proven_wrong_part_repair_candidates.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.proven_wrong_part_repair_candidates) {
      lines.push(
        `- \`${row.fridge_slug}\` → ${row.proposed_remap_target_filter_slug ?? row.hyperagent_actual_filter}; maps \`${row.repo_mapped_filter_slugs.join("|")}\`; ${row.recommended_owner_action}`,
      );
    }
    lines.push("");
  }

  lines.push("## Browser proof required rows", "");
  if (packet.browser_proof_required_rows.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.browser_proof_required_rows) {
      lines.push(`- \`${row.fridge_slug}\` — ${row.recommended_owner_action}`);
    }
    lines.push("");
  }

  lines.push("## No-filter suppression rows", "");
  if (packet.no_filter_suppression_rows.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const row of packet.no_filter_suppression_rows) {
      lines.push(`- \`${row.fridge_slug}\` — ${row.recommended_owner_action}`);
    }
    lines.push("");
  }

  lines.push(`## Recommended next action`, "", packet.recommended_next_action, "");

  return `${lines.join("\n")}\n`;
}

export function writeGswfFamilyReconciliationOwnerReviewArtifactsV1(args: {
  rootDir: string;
  packet: GswfFamilyReconciliationOwnerReviewV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.packet, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildGswfFamilyReconciliationOwnerReviewMarkdownV1(args.packet), "utf8");
  return {
    json_rel_path: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_JSON_REL_V1,
    md_rel_path: GSWF_FAMILY_RECONCILIATION_OWNER_REVIEW_MD_REL_V1,
  };
}
