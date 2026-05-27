/**
 * Read-only: aggregate AP agent evidence result files into one owner review packet.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  isManufacturerSiteSearchUrl,
  isOfficialReferencePdpUrl,
  OFFICIAL_REFERENCE_RETAILER_KEYS,
} from "@/lib/retailers/launch-buy-links";

import {
  AP_AGENT_EVIDENCE_DECISIONS_V1,
  type ApAgentEvidenceCsvMutationV1,
  type ApAgentEvidenceDecisionV1,
  type ApAgentEvidenceRowV1,
} from "./air-purifier-agent-packets-v1";

export const AIR_PURIFIER_AGENT_RESULTS_AGGREGATOR_REPORT_NAME_V1 =
  "air_purifier_agent_results_aggregator_v1" as const;

export const AP_AGENT_RESULTS_DEFAULT_DIR_V1 =
  "data/air-purifier/batch-production/agent-results" as const;

export type ApAgentResultsAggregatorSourceStatusV1 = "PROVEN" | "PARTIAL" | "UNKNOWN";

export type ApReviewGroupKeyV1 =
  | "auto_apply_eligible"
  | "reference_eligible"
  | "owner_review_required"
  | "rejected"
  | "catalog_task_required"
  | "no_safe_path";

export type ApAggregatedReviewRowV1 = {
  slug: string;
  packet_id: string;
  decision: ApAgentEvidenceDecisionV1 | string;
  /** Present on `air_purifier_agent_packet_result_v1` rows (batch-v3 evidence_status). */
  evidence_status?: string;
  review_group: ApReviewGroupKeyV1;
  review_reasons: string[];
  final_url: string | null;
  browser_truth_classification: string | null;
  exact_tokens_seen: string[];
  wrong_family_tokens_seen: string[];
  buy_action_seen: boolean | null;
  recommended_csv_mutation: ApAgentEvidenceCsvMutationV1 | null;
  owner_review_required: boolean;
  reference_only_reason: string | null;
  source_file: string;
  evidence_notes: string;
};

export type ApInvalidFileV1 = {
  file: string;
  error: string;
};

export type ApInvalidRowV1 = {
  source_file: string;
  slug: string | null;
  packet_id: string | null;
  decision: string | null;
  reasons: string[];
  row: unknown;
};

export type AirPurifierAgentResultsAggregatorReportV1 = {
  report_name: typeof AIR_PURIFIER_AGENT_RESULTS_AGGREGATOR_REPORT_NAME_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  source_status: ApAgentResultsAggregatorSourceStatusV1;
  results_dir: string;
  result_file_count: number;
  row_count: number;
  valid_row_count: number;
  invalid_row_count: number;
  recommended_csv_mutation_count: number;
  recommended_catalog_action_count: number;
  decision_counts: Record<string, number>;
  review_groups: Record<ApReviewGroupKeyV1, ApAggregatedReviewRowV1[]>;
  projected_coverage_delta: {
    direct_buyable_plus: number;
    official_reference_plus: number;
    blocked_minus: number;
  };
  recommended_next_action: string;
  owner_review_summary: string[];
  invalid_files: ApInvalidFileV1[];
  invalid_rows: ApInvalidRowV1[];
  notes: string[];
};

function isPdpLikeFinalUrl(url: string | null): boolean {
  if (!url?.trim()) return false;
  if (isManufacturerSiteSearchUrl(url)) return false;
  return isOfficialReferencePdpUrl(url) || /\.html$/i.test(url) || /\/product\//i.test(url);
}

function hasApplyPlanFields(row: ApAgentEvidenceRowV1): boolean {
  if (row.recommended_csv_mutation) return true;
  return !!(
    row.final_url?.trim() &&
    row.browser_truth_classification?.trim() &&
    row.slug?.trim()
  );
}

export function validateAgentEvidenceRowV1(
  row: unknown,
  sourceFile: string,
): { ok: true; row: ApAgentEvidenceRowV1 } | { ok: false; invalid: ApInvalidRowV1 } {
  const r = row as Partial<ApAgentEvidenceRowV1>;
  const reasons: string[] = [];

  if (!r.slug?.trim()) reasons.push("missing_slug");
  if (!r.packet_id?.trim()) reasons.push("missing_packet_id");
  if (!r.decision?.trim()) {
    reasons.push("missing_decision");
  } else if (!AP_AGENT_EVIDENCE_DECISIONS_V1.includes(r.decision as ApAgentEvidenceDecisionV1)) {
    reasons.push("decision_not_in_enum");
  }

  const decision = r.decision as ApAgentEvidenceDecisionV1 | undefined;
  const exactTokens = Array.isArray(r.exact_tokens_seen) ? r.exact_tokens_seen : [];
  const wrongFamily = Array.isArray(r.wrong_family_tokens_seen)
    ? r.wrong_family_tokens_seen
    : [];

  if (decision === "PASS_DIRECT_BUYABLE") {
    if (r.buy_action_seen !== true) reasons.push("pass_direct_buyable_without_buy_action");
    if (exactTokens.length === 0) reasons.push("pass_direct_buyable_without_exact_tokens");
    if (wrongFamily.length > 0) reasons.push("pass_direct_buyable_with_wrong_family_tokens");
    if (!isPdpLikeFinalUrl(r.final_url ?? null)) {
      reasons.push("pass_direct_buyable_final_url_not_pdp_like");
    }
    if (r.browser_truth_classification?.trim() !== "direct_buyable") {
      reasons.push("pass_direct_buyable_classification_mismatch");
    }
  }

  if (decision === "PASS_REFERENCE") {
    if (exactTokens.length === 0) reasons.push("pass_reference_without_exact_tokens");
    if (!isPdpLikeFinalUrl(r.final_url ?? null)) {
      reasons.push("pass_reference_final_url_not_pdp_like");
    }
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      invalid: {
        source_file: sourceFile,
        slug: r.slug ?? null,
        packet_id: r.packet_id ?? null,
        decision: r.decision ?? null,
        reasons,
        row,
      },
    };
  }

  return { ok: true, row: r as ApAgentEvidenceRowV1 };
}

function isAutoApplyEligible(row: ApAgentEvidenceRowV1): boolean {
  if (row.decision !== "PASS_DIRECT_BUYABLE") return false;
  if (row.browser_truth_classification?.trim() !== "direct_buyable") return false;
  if (row.buy_action_seen !== true) return false;
  if (!isPdpLikeFinalUrl(row.final_url)) return false;
  if (row.exact_tokens_seen.length === 0) return false;
  if (row.wrong_family_tokens_seen.length > 0) return false;
  if (row.owner_review_required) return false;
  if (!hasApplyPlanFields(row)) return false;
  return true;
}

function isReferenceEligible(row: ApAgentEvidenceRowV1): boolean {
  if (row.decision !== "PASS_REFERENCE") return false;
  const classification = row.browser_truth_classification?.trim();
  const refOk =
    classification === "likely_valid" ||
    !!row.reference_only_reason?.trim() ||
    row.buy_action_seen === false;
  if (!refOk) return false;
  if (!isPdpLikeFinalUrl(row.final_url)) return false;
  if (row.exact_tokens_seen.length === 0) return false;
  if (row.wrong_family_tokens_seen.length > 0) return false;

  const retailerKey = row.recommended_csv_mutation?.retailer_key?.trim().toLowerCase();
  if (retailerKey && !OFFICIAL_REFERENCE_RETAILER_KEYS.has(retailerKey)) {
    return false;
  }
  return true;
}

function referenceNeedsOwnerReview(row: ApAgentEvidenceRowV1): string[] {
  const reasons: string[] = [];
  if (row.owner_review_required) reasons.push("owner_review_required_flag");
  const retailerKey = row.recommended_csv_mutation?.retailer_key?.trim().toLowerCase();
  if (row.decision === "PASS_REFERENCE") {
    if (retailerKey && !OFFICIAL_REFERENCE_RETAILER_KEYS.has(retailerKey)) {
      reasons.push("reference_retailer_not_on_allowlist");
    }
    if (row.wrong_family_tokens_seen.length > 0) {
      reasons.push("wrong_family_tokens_present");
    }
    if (row.exact_tokens_seen.length === 0) reasons.push("missing_exact_tokens");
  }
  return reasons;
}

function classifyReviewGroup(args: {
  row: ApAgentEvidenceRowV1;
  invalid: ApInvalidRowV1 | null;
}): { group: ApReviewGroupKeyV1; reasons: string[] } {
  const { row, invalid } = args;
  const reasons: string[] = [];

  if (invalid) {
    reasons.push(...invalid.reasons.map((r) => `validation:${r}`));
  }

  if (row.decision === "REJECT_WRONG_FAMILY" || row.decision === "REJECT_SEARCH_CATEGORY") {
    return { group: "rejected", reasons: [row.decision, ...reasons] };
  }

  if (row.decision === "CATALOG_GAP" || row.decision === "ALIAS_REDIRECT_GAP") {
    return { group: "catalog_task_required", reasons: [row.decision, ...reasons] };
  }

  if (row.decision === "NO_SAFE_PATH") {
    return { group: "no_safe_path", reasons: ["NO_SAFE_PATH", ...reasons] };
  }

  if (isAutoApplyEligible(row) && !invalid) {
    return { group: "auto_apply_eligible", reasons: ["passes_auto_apply_validation", ...reasons] };
  }

  if (isReferenceEligible(row) && !invalid) {
    const refOwner = referenceNeedsOwnerReview(row);
    if (refOwner.length > 0) {
      return {
        group: "owner_review_required",
        reasons: [...refOwner, ...reasons],
      };
    }
    return { group: "reference_eligible", reasons: ["passes_reference_validation", ...reasons] };
  }

  if (row.decision === "NEEDS_OWNER_REVIEW") {
    reasons.push("agent_needs_owner_review");
  }
  if (row.owner_review_required) {
    reasons.push("owner_review_required_flag");
  }
  if (row.decision === "PASS_DIRECT_BUYABLE" && !isAutoApplyEligible(row)) {
    reasons.push("pass_direct_buyable_failed_auto_apply_checks");
  }
  if (row.decision === "PASS_REFERENCE") {
    reasons.push(...referenceNeedsOwnerReview(row));
    if (reasons.length === 0) reasons.push("pass_reference_failed_reference_checks");
  }
  if (row.recommended_csv_mutation?.note?.toLowerCase().includes("primary")) {
    reasons.push("recommended_mutation_touches_primary_choice");
  }
  if (
    row.decision === "PASS_DIRECT_BUYABLE" &&
    row.exact_tokens_seen.length === 0 &&
    row.evidence_notes.toLowerCase().includes("family")
  ) {
    reasons.push("token_equivalence_plausible_but_unproven");
  }

  return { group: "owner_review_required", reasons: Array.from(new Set(reasons)) };
}

export type ApAgentResultFileFormatV1 = "legacy_rows" | "air_purifier_agent_packet_result_v1";

export type ParsedAgentResultFileContentV1 = {
  rows: unknown[];
  packet_id: string | null;
  result_format: ApAgentResultFileFormatV1;
  error: string | null;
};

/** One row inside `candidate_results[]` on batch-v3 `air_purifier_agent_packet_result_v1` files. */
export type ApPacketResultCandidateV1 = {
  filter_slug?: string;
  searched_url?: string | null;
  candidate_url?: string | null;
  evidence_status?: string;
  browser_truth_classification?: string | null;
  exact_token_found?: boolean;
  add_to_cart_or_buy_button_found?: boolean;
  token_evidence?: string;
  buy_button_evidence?: string;
  catalog_identity_evidence?: string;
  compatibility_evidence?: string;
  rejection_reason?: string;
  notes?: string;
  recommended_csv_mutation?: ApAgentEvidenceCsvMutationV1 | null;
  recommended_catalog_action?: unknown;
};

export function normalizePacketResultCandidateV1(
  packetId: string,
  raw: unknown,
): { row: ApAgentEvidenceRowV1; evidence_status: string } | null {
  const c = raw as ApPacketResultCandidateV1;
  const slug = c.filter_slug?.trim();
  if (!slug) return null;

  const evidence_status = (c.evidence_status ?? "UNKNOWN").trim().toUpperCase();
  const classification = c.browser_truth_classification?.trim().toLowerCase() ?? "";

  let decision: ApAgentEvidenceDecisionV1;
  if (c.recommended_catalog_action != null) {
    decision = "CATALOG_GAP";
  } else if (evidence_status === "FAIL") {
    decision = "NO_SAFE_PATH";
  } else if (evidence_status === "BLOCKED" && classification === "wrong_family") {
    decision = "REJECT_WRONG_FAMILY";
  } else if (evidence_status === "BLOCKED") {
    decision = "NEEDS_OWNER_REVIEW";
  } else {
    decision = "NEEDS_OWNER_REVIEW";
  }

  const evidence_notes = [
    c.notes,
    c.rejection_reason,
    c.token_evidence,
    c.buy_button_evidence,
    c.catalog_identity_evidence,
    c.compatibility_evidence,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" | ");

  return {
    evidence_status,
    row: {
      packet_id: packetId,
      slug,
      decision,
      candidate_url: c.candidate_url ?? c.searched_url ?? null,
      final_url: c.candidate_url ?? null,
      browser_truth_classification: c.browser_truth_classification ?? null,
      exact_tokens_seen: c.exact_token_found === true ? ["exact_token_reported"] : [],
      wrong_family_tokens_seen: classification === "wrong_family" ? ["wrong_family_reported"] : [],
      buy_action_seen: c.add_to_cart_or_buy_button_found ?? null,
      reference_only_reason:
        classification === "official_reference" ? "official_reference_without_exact_token" : null,
      evidence_notes: evidence_notes || evidence_status,
      recommended_csv_mutation: c.recommended_csv_mutation ?? null,
      owner_review_required:
        c.recommended_catalog_action != null ||
        decision === "CATALOG_GAP" ||
        decision === "NEEDS_OWNER_REVIEW" ||
        evidence_status === "UNKNOWN" ||
        evidence_status === "BLOCKED",
    },
  };
}

export function parseAgentResultFileContentV1(
  raw: unknown,
  sourceFile: string,
): ParsedAgentResultFileContentV1 {
  if (Array.isArray(raw)) {
    return { rows: raw, packet_id: null, result_format: "legacy_rows", error: null };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (
      obj.report_name === "air_purifier_agent_packet_result_v1" &&
      Array.isArray(obj.candidate_results)
    ) {
      const packet_id =
        typeof obj.packet_id === "string" && obj.packet_id.trim() ? obj.packet_id.trim() : null;
      return {
        rows: obj.candidate_results,
        packet_id,
        result_format: "air_purifier_agent_packet_result_v1",
        error: null,
      };
    }
    if (Array.isArray(obj.results)) {
      return { rows: obj.results, packet_id: null, result_format: "legacy_rows", error: null };
    }
    if (Array.isArray(obj.rows)) {
      const packet_id =
        typeof obj.packet_id === "string" && obj.packet_id.trim() ? obj.packet_id.trim() : null;
      return { rows: obj.rows, packet_id, result_format: "legacy_rows", error: null };
    }
  }
  return {
    rows: [],
    packet_id: null,
    result_format: "legacy_rows",
    error: `unsupported shape in ${sourceFile} (expected array, results[], rows[], or air_purifier_agent_packet_result_v1.candidate_results[])`,
  };
}

export function buildAirPurifierAgentResultsAggregatorV1Report(args: {
  rootDir: string;
  resultsDir?: string;
  strict?: boolean;
  now?: () => Date;
  readFile?: (absPath: string) => string;
  listDir?: (absDir: string) => string[];
}): AirPurifierAgentResultsAggregatorReportV1 {
  const rootDir = args.rootDir;
  const relResultsDir = args.resultsDir?.trim() || AP_AGENT_RESULTS_DEFAULT_DIR_V1;
  const absResultsDir = path.isAbsolute(relResultsDir)
    ? relResultsDir
    : path.join(rootDir, relResultsDir);
  const readFile = args.readFile ?? ((p: string) => readFileSync(p, "utf8"));
  const now = args.now ?? (() => new Date());

  const invalid_files: ApInvalidFileV1[] = [];
  const invalid_rows: ApInvalidRowV1[] = [];
  const parsedRows: Array<{
    row: ApAgentEvidenceRowV1;
    sourceFile: string;
    invalid: ApInvalidRowV1 | null;
    evidence_status: string | null;
  }> = [];

  let recommended_csv_mutation_count = 0;
  let recommended_catalog_action_count = 0;

  let resultFiles: string[] = [];
  if (existsSync(absResultsDir)) {
    resultFiles = (args.listDir ?? ((d) => readdirSync(d)))
      .call(null, absResultsDir)
      .filter((f) => f.endsWith(".results.json"))
      .sort();
  }

  for (const fileName of resultFiles) {
    const absFile = path.join(absResultsDir, fileName);
    const relFile = path.join(relResultsDir, fileName).replace(/\\/g, "/");
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFile(absFile));
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      invalid_files.push({ file: relFile, error: `json_parse_error: ${error}` });
      if (args.strict) break;
      continue;
    }

    const extracted = parseAgentResultFileContentV1(parsed, relFile);
    if (extracted.error) {
      invalid_files.push({ file: relFile, error: extracted.error });
      if (args.strict) break;
      continue;
    }

    const packetIdFromFile =
      extracted.packet_id ??
      fileName.replace(/\.results\.json$/i, "");

    for (const rawRow of extracted.rows) {
      let rowInput: ApAgentEvidenceRowV1;
      let evidence_status: string | null = null;

      if (extracted.result_format === "air_purifier_agent_packet_result_v1") {
        const normalized = normalizePacketResultCandidateV1(packetIdFromFile, rawRow);
        if (!normalized) {
          invalid_rows.push({
            source_file: relFile,
            slug: null,
            packet_id: packetIdFromFile,
            decision: (rawRow as ApPacketResultCandidateV1).evidence_status ?? null,
            reasons: ["missing_filter_slug"],
            row: rawRow,
          });
          continue;
        }
        rowInput = normalized.row;
        evidence_status = normalized.evidence_status;
        if ((rawRow as ApPacketResultCandidateV1).recommended_catalog_action != null) {
          recommended_catalog_action_count += 1;
        }
      } else {
        rowInput = rawRow as ApAgentEvidenceRowV1;
      }

      const validated = validateAgentEvidenceRowV1(rowInput, relFile);
      if (!validated.ok) {
        invalid_rows.push(validated.invalid);
        if (validated.invalid.slug && validated.invalid.packet_id && validated.invalid.decision) {
          parsedRows.push({
            row: rowInput,
            sourceFile: relFile,
            invalid: validated.invalid,
            evidence_status,
          });
        }
        continue;
      }
      parsedRows.push({
        row: validated.row,
        sourceFile: relFile,
        invalid: null,
        evidence_status,
      });
    }
  }

  const review_groups: Record<ApReviewGroupKeyV1, ApAggregatedReviewRowV1[]> = {
    auto_apply_eligible: [],
    reference_eligible: [],
    owner_review_required: [],
    rejected: [],
    catalog_task_required: [],
    no_safe_path: [],
  };

  const decision_counts: Record<string, number> = {};
  const slugSeen = new Map<string, ApAggregatedReviewRowV1>();

  for (const entry of parsedRows) {
    const { row, sourceFile, invalid, evidence_status } = entry;
    const decisionKey = evidence_status ?? row.decision;
    decision_counts[decisionKey] = (decision_counts[decisionKey] ?? 0) + 1;
    if (row.recommended_csv_mutation) recommended_csv_mutation_count += 1;

    const classified = classifyReviewGroup({ row, invalid });
    const aggregated: ApAggregatedReviewRowV1 = {
      slug: row.slug,
      packet_id: row.packet_id,
      decision: row.decision,
      evidence_status: evidence_status ?? undefined,
      review_group: classified.group,
      review_reasons: classified.reasons,
      final_url: row.final_url,
      browser_truth_classification: row.browser_truth_classification,
      exact_tokens_seen: row.exact_tokens_seen,
      wrong_family_tokens_seen: row.wrong_family_tokens_seen,
      buy_action_seen: row.buy_action_seen,
      recommended_csv_mutation: row.recommended_csv_mutation,
      owner_review_required: row.owner_review_required,
      reference_only_reason: row.reference_only_reason,
      source_file: sourceFile,
      evidence_notes: row.evidence_notes,
    };

    const prior = slugSeen.get(row.slug);
    if (prior && prior.packet_id !== row.packet_id) {
      review_groups.owner_review_required.push({
        ...aggregated,
        review_group: "owner_review_required",
        review_reasons: ["duplicate_slug_across_packets", ...classified.reasons],
      });
      continue;
    }
    slugSeen.set(row.slug, aggregated);
    review_groups[classified.group].push(aggregated);
  }

  const valid_row_count = parsedRows.filter((p) => !p.invalid).length;
  const invalid_row_count = invalid_rows.length;

  const direct_buyable_plus = review_groups.auto_apply_eligible.length;
  const official_reference_plus = review_groups.reference_eligible.length;
  const blocked_minus = direct_buyable_plus + official_reference_plus;

  let recommended_next_action =
    "Review owner_review_summary; no CSV apply until owner approves auto_apply_eligible rows.";
  if (direct_buyable_plus > 0) {
    recommended_next_action = `Owner review ${direct_buyable_plus} auto_apply_eligible row(s), then run a future apply planner (not this script).`;
  } else if (
    recommended_csv_mutation_count === 0 &&
    recommended_catalog_action_count > 0
  ) {
    recommended_next_action =
      "No CSV apply is safe (0 recommended_csv_mutation). Owner-approved catalog identity task required — see catalog_task_required (Blueair F4MAX vs PART411 split) before buyer-path or apply planning.";
  } else if (review_groups.owner_review_required.length > 0) {
    recommended_next_action =
      "Resolve owner_review_required rows (token equivalence, Amazon policy, wrong-family notes) before apply planner.";
  } else if (resultFiles.length === 0) {
    recommended_next_action = "No agent result files found — run agents and save *.results.json first.";
  } else if (recommended_csv_mutation_count === 0 && valid_row_count > 0) {
    recommended_next_action =
      "No CSV apply is safe (0 recommended_csv_mutation). Review review_groups and owner_review_summary before any apply planner.";
  }

  const owner_review_summary: string[] = [];
  if (review_groups.auto_apply_eligible.length > 0) {
    owner_review_summary.push(
      `${review_groups.auto_apply_eligible.length} slug(s) pass strict auto-apply validation: ${review_groups.auto_apply_eligible.map((r) => r.slug).join(", ")}`,
    );
  }
  if (review_groups.reference_eligible.length > 0) {
    owner_review_summary.push(
      `${review_groups.reference_eligible.length} reference-eligible slug(s): ${review_groups.reference_eligible.map((r) => r.slug).join(", ")}`,
    );
  }
  const ownerSlugs = review_groups.owner_review_required;
  if (ownerSlugs.length > 0) {
    const byReason = new Map<string, string[]>();
    for (const r of ownerSlugs) {
      const key = r.review_reasons[0] ?? "unspecified";
      const list = byReason.get(key) ?? [];
      list.push(r.slug);
      byReason.set(key, list);
    }
    for (const [reason, slugs] of Array.from(byReason.entries())) {
      owner_review_summary.push(`Owner review (${reason}): ${slugs.join(", ")}`);
    }
  }
  if (review_groups.no_safe_path.length > 0) {
    owner_review_summary.push(
      `No safe path: ${review_groups.no_safe_path.map((r) => r.slug).join(", ")}`,
    );
  }
  if (review_groups.catalog_task_required.length > 0) {
    owner_review_summary.push(
      `Catalog identity task required (${recommended_catalog_action_count}): ${review_groups.catalog_task_required.map((r) => r.slug).join(", ")}`,
    );
  }
  if (recommended_csv_mutation_count === 0 && valid_row_count > 0) {
    owner_review_summary.push("No recommended_csv_mutation rows — CSV apply is not safe from this batch.");
  }
  if (invalid_rows.length > 0) {
    owner_review_summary.push(
      `${invalid_rows.length} row(s) failed strict validation — see invalid_rows (may still appear in owner_review_required).`,
    );
  }

  let source_status: ApAgentResultsAggregatorSourceStatusV1 = "UNKNOWN";
  if (resultFiles.length > 0 && invalid_files.length === 0) {
    source_status = valid_row_count > 0 ? "PROVEN" : "PARTIAL";
  } else if (resultFiles.length > 0) {
    source_status = "PARTIAL";
  }

  return {
    report_name: AIR_PURIFIER_AGENT_RESULTS_AGGREGATOR_REPORT_NAME_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    source_status,
    results_dir: relResultsDir.replace(/\\/g, "/"),
    result_file_count: resultFiles.length,
    row_count: parsedRows.length,
    valid_row_count,
    invalid_row_count,
    recommended_csv_mutation_count,
    recommended_catalog_action_count,
    decision_counts,
    review_groups,
    projected_coverage_delta: {
      direct_buyable_plus,
      official_reference_plus,
      blocked_minus,
    },
    recommended_next_action,
    owner_review_summary,
    invalid_files,
    invalid_rows,
    notes: [
      "Read-only aggregator — does not apply recommended_csv_mutation or edit CSVs.",
      "auto_apply_eligible requires empty wrong_family_tokens_seen per strict validation rules.",
      "reference_eligible requires shark-official allowlist on recommended retailer_key when present.",
      "Rows failing PASS_DIRECT_BUYABLE validation are listed in invalid_rows and routed to owner_review_required.",
    ],
  };
}

export function renderAirPurifierAgentResultsAggregatorMarkdownV1(
  report: AirPurifierAgentResultsAggregatorReportV1,
): string {
  const lines: string[] = [
    "# Air Purifier Agent Results — Owner Review",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "**NOT DEPLOYED · No CSV mutation · Supabase untouched**",
    "",
    "## Headline counts",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Result files | ${report.result_file_count} |`,
    `| Total rows | ${report.row_count} |`,
    `| Valid rows | ${report.valid_row_count} |`,
    `| Invalid rows | ${report.invalid_row_count} |`,
    `| Auto-apply eligible | ${report.review_groups.auto_apply_eligible.length} |`,
    `| Reference eligible | ${report.review_groups.reference_eligible.length} |`,
    `| Owner review | ${report.review_groups.owner_review_required.length} |`,
    `| Rejected | ${report.review_groups.rejected.length} |`,
    `| Catalog task | ${report.review_groups.catalog_task_required.length} |`,
    `| No safe path | ${report.review_groups.no_safe_path.length} |`,
    "",
    "## Projected coverage delta (if owner approves apply planner)",
    "",
    `- Direct-buy safe CTA **+${report.projected_coverage_delta.direct_buyable_plus}**`,
    `- Official reference links **+${report.projected_coverage_delta.official_reference_plus}**`,
    `- Blocked rows reduced (approx) **−${report.projected_coverage_delta.blocked_minus}**`,
    "",
    "## Auto-apply candidates",
    "",
  ];

  if (report.review_groups.auto_apply_eligible.length === 0) {
    lines.push("_None pass strict auto-apply validation._", "");
  } else {
    for (const r of report.review_groups.auto_apply_eligible) {
      lines.push(`- **${r.slug}** (${r.packet_id}) — ${r.final_url ?? "no url"}`);
    }
    lines.push("");
  }

  lines.push("## Reference candidates", "");
  if (report.review_groups.reference_eligible.length === 0) {
    lines.push("_None pass strict reference validation._", "");
  } else {
    for (const r of report.review_groups.reference_eligible) {
      lines.push(`- **${r.slug}** — ${r.reference_only_reason ?? r.evidence_notes.slice(0, 120)}`);
    }
    lines.push("");
  }

  lines.push("## Owner review required", "");
  for (const r of report.review_groups.owner_review_required) {
    lines.push(
      `- **${r.slug}** — ${r.review_reasons.join("; ") || r.decision}`,
    );
  }
  lines.push("");

  lines.push("## Rejected / no safe path", "");
  for (const r of [...report.review_groups.rejected, ...report.review_groups.no_safe_path]) {
    lines.push(`- **${r.slug}** — ${r.decision}: ${r.review_reasons.join("; ")}`);
  }
  lines.push("");

  lines.push("## Owner summary", "");
  for (const s of report.owner_review_summary) {
    lines.push(`- ${s}`);
  }
  lines.push("");

  lines.push("## Next action", "", report.recommended_next_action, "");
  lines.push(
    "---",
    "",
    "_This summary is read-only. Apply planner (future task) may consume `ap-agent-results-review-v1.json`._",
  );

  return `${lines.join("\n")}\n`;
}

export function parseAirPurifierAgentResultsAggregatorCliArgsV1(argv: string[]): {
  resultsDir: string | null;
  outPath: string | null;
  markdownOutPath: string | null;
  strict: boolean;
} {
  const resultsIdx = argv.indexOf("--results-dir");
  const outIdx = argv.indexOf("--out");
  const mdIdx = argv.indexOf("--markdown-out");
  return {
    resultsDir: resultsIdx >= 0 ? (argv[resultsIdx + 1]?.trim() ?? null) : null,
    outPath: outIdx >= 0 ? (argv[outIdx + 1]?.trim() ?? null) : null,
    markdownOutPath: mdIdx >= 0 ? (argv[mdIdx + 1]?.trim() ?? null) : null,
    strict: argv.includes("--strict"),
  };
}

export function assertAggregatorOutPathAllowedV1(outPath: string, rootDir: string): void {
  const abs = path.isAbsolute(outPath) ? outPath : path.resolve(rootDir, outPath);
  const normalized = abs.replace(/\\/g, "/");
  if (!normalized.includes("/data/air-purifier/batch-production/")) {
    throw new Error(`--out must be under data/air-purifier/batch-production/ (got ${outPath})`);
  }
}

export function writeAggregatorArtifactsV1(args: {
  report: AirPurifierAgentResultsAggregatorReportV1;
  outPath: string;
  markdownOutPath: string | null;
  rootDir: string;
}): { jsonPath: string; markdownPath: string | null } {
  const absJson = path.isAbsolute(args.outPath)
    ? args.outPath
    : path.resolve(args.rootDir, args.outPath);
  assertAggregatorOutPathAllowedV1(absJson, args.rootDir);
  mkdirSync(path.dirname(absJson), { recursive: true });
  writeFileSync(absJson, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");

  let markdownPath: string | null = null;
  if (args.markdownOutPath) {
    const absMd = path.isAbsolute(args.markdownOutPath)
      ? args.markdownOutPath
      : path.resolve(args.rootDir, args.markdownOutPath);
    assertAggregatorOutPathAllowedV1(absMd, args.rootDir);
    mkdirSync(path.dirname(absMd), { recursive: true });
    writeFileSync(absMd, renderAirPurifierAgentResultsAggregatorMarkdownV1(args.report), "utf8");
    markdownPath = absMd;
  }

  return { jsonPath: absJson, markdownPath };
}

export function readCsvSnapshotForAggregatorTest(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

export function csvExistsForAggregatorTest(absPath: string): boolean {
  return existsSync(absPath);
}

export function csvMtimeForAggregatorTest(absPath: string): number {
  return statSync(absPath).mtimeMs;
}
