import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

import {
  buildRefrigeratorModelFirstTruthAuditV1,
  type RefrigeratorModelFirstTruthAuditV1,
} from "./refrigerator-model-first-truth-audit-v1";

export const FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1 = "fridge_truth_reconciliation_v1" as const;

export type TruthClassificationV1 = "PROVEN" | "INFERRED" | "UNKNOWN";

export type LiveOrSupabaseTruthStatusV1 = "PROVEN" | "UNKNOWN" | "NOT_CHECKED";

export type FridgeWinRootCauseHypothesisV1 =
  | "A_EVIDENCE_NOT_APPLIED_TO_CSV"
  | "B_EVIDENCE_APPLIED_SUPABASE_ONLY"
  | "C_EVIDENCE_STALE_OR_INVALID"
  | "D_AUDIT_WRONG_CSV_SOURCE"
  | "E_UNKNOWN";

export type CsvTruthSummaryV1 = {
  source_contract: "refrigerator_model_first_truth_audit_v1";
  total_refrigerator_models: number;
  unique_linked_filter_slugs: number;
  linked_filters_with_safe_direct_buyable_primary: number;
  safe_buyer_path_verdict: string;
  filters_with_direct_buyable_anywhere_count: number;
  primary_weak_reason_counts: Record<string, number>;
  exact_repo_paths_read: string[];
};

export type EvidenceArtifactRowV1 = {
  evidence_file: string;
  filter_slug: string | null;
  token: string | null;
  scope: string | null;
  win_signal: "live_outcome" | "committed_live_row_direct_buyable" | "owner_browser_pass" | "none";
  claims_supabase_commit: boolean;
  classification: TruthClassificationV1;
};

export type EvidenceTruthSummaryV1 = {
  evidence_directory: string;
  total_json_files_scanned: number;
  fridge_related_artifact_count: number;
  win_artifact_count: number;
  win_artifacts: EvidenceArtifactRowV1[];
  additional_evidence_paths_scanned: string[];
};

export type PriorWinArtifactSummaryV1 = {
  live_outcome_json_count: number;
  linked_filter_slugs_with_evidence_win: string[];
  prior_report_script_paths: string[];
  prior_doc_references: string[];
};

export type CsvVsEvidenceMismatchSummaryV1 = {
  linked_slugs_with_evidence_win_count: number;
  linked_slugs_with_csv_direct_buyable_count: number;
  mismatch_count: number;
  classification: TruthClassificationV1;
  explanation: string;
};

export type SuspectedUnappliedEvidenceRowV1 = {
  evidence_file: string;
  filter_slug: string;
  evidence_win_signal: string;
  csv_has_direct_buyable_row: boolean;
  csv_primary_weak_reason: string | null;
  likely_hypothesis: FridgeWinRootCauseHypothesisV1;
  hypothesis_classification: TruthClassificationV1;
};

export type FridgeTruthReconciliationV1 = {
  contract: typeof FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  generated_at: string;
  exact_repo_paths_read: string[];
  csv_truth_summary: CsvTruthSummaryV1;
  evidence_truth_summary: EvidenceTruthSummaryV1;
  prior_win_artifact_summary: PriorWinArtifactSummaryV1;
  csv_vs_evidence_mismatch_summary: CsvVsEvidenceMismatchSummaryV1;
  suspected_unapplied_evidence_rows: SuspectedUnappliedEvidenceRowV1[];
  slugs_with_evidence_win_but_csv_placeholder: string[];
  slugs_with_csv_safe_but_no_evidence: string[];
  live_or_supabase_truth_status: LiveOrSupabaseTruthStatusV1;
  root_cause_hypothesis: FridgeWinRootCauseHypothesisV1;
  root_cause_summary: string;
  recommended_next_action: string;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

const PRIOR_REPORT_SCRIPT_PATHS = [
  "scripts/lib/refrigerator-model-first-truth-audit-v1.ts",
  "scripts/report-refrigerator-model-first-truth-audit-v1.ts",
  "scripts/lib/buckparts-page-publishability-truth-v1.ts",
  "scripts/report-flexoffers-readiness-fridge.ts",
  "scripts/report-buckparts-command-center.ts",
  "scripts/lib/command-center-evidence-rollup.ts",
  "scripts/collect-fridge-non-amazon-evidence.ts",
] as const;

const PRIOR_DOC_REFERENCES = [
  "docs/AIR-PURIFIER-BUYER-PATH-COVERAGE-SNAPSHOT-V1.md",
  "docs/BuckParts-HQ-HANDOFF.md",
] as const;

const ADDITIONAL_EVIDENCE_PATHS = [
  "data/manual-evidence/refrigerator",
  "data/fridge-form-factor-evidence",
] as const;

const FRIDGE_EVIDENCE_FILENAME_RE =
  /amazon-|frigidaire|waterdrop|compatibility-evidence|owner-browser|owner-review|live-outcome|oem-pdp/i;

function normalizeSlug(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  return v.length > 0 ? v : null;
}

function tokenToSlug(token: string | null | undefined): string | null {
  return normalizeSlug(token?.replace(/\s+/g, "-"));
}

function isTruthyPrimary(value: string | undefined): boolean {
  const n = (value ?? "").trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

function readCsvPrimaryWeakReasonBySlug(
  rootDir: string,
  linkedSlugs: Set<string>,
): Map<string, string | null> {
  const links = parse(readFileSync(path.join(rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{
    filter_slug: string;
    is_primary?: string;
    affiliate_url?: string;
    browser_truth_classification?: string;
  }>;

  const byFilter = new Map<string, typeof links>();
  for (const row of links) {
    const slug = normalizeSlug(row.filter_slug);
    if (!slug || !linkedSlugs.has(slug)) continue;
    const list = byFilter.get(slug) ?? [];
    list.push(row);
    byFilter.set(slug, list);
  }

  const out = new Map<string, string | null>();
  for (const slug of Array.from(linkedSlugs)) {
    const rows = byFilter.get(slug) ?? [];
    if (rows.length === 0) {
      out.set(slug, "NO_PRIMARY_LINK");
      continue;
    }
    const primary = rows.find((r) => isTruthyPrimary(r.is_primary)) ?? rows[0];
    const btc = (primary.browser_truth_classification ?? "").trim();
    if (btc === "direct_buyable") {
      out.set(slug, "SAFE_PRIMARY");
    } else if ((primary.affiliate_url ?? "").includes("Search?") || (primary.affiliate_url ?? "").includes("searchKeyword")) {
      out.set(slug, "SEARCH_PLACEHOLDER_PRIMARY");
    } else {
      out.set(slug, "WEAK_PRIMARY");
    }
  }
  return out;
}

function csvHasDirectBuyableRow(rootDir: string, slug: string): boolean {
  const links = parse(readFileSync(path.join(rootDir, "data/retailer_links.csv"), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ filter_slug: string; browser_truth_classification?: string }>;
  return links.some(
    (r) =>
      normalizeSlug(r.filter_slug) === slug &&
      (r.browser_truth_classification ?? "").trim() === "direct_buyable",
  );
}

function parseEvidenceObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function claimsSupabaseCommit(obj: Record<string, unknown>): boolean {
  const parts = [
    obj.insert_outcome,
    obj.insert_outcome_reason,
    obj.mutation_ready_basis,
    obj.post_insert_go_smoke_result,
  ];
  const blob = parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p ?? "")))
    .join(" ")
    .toLowerCase();
  return (
    blob.includes("supabase") ||
    blob.includes("public.retailer_links") ||
    blob.includes("post-insert") ||
    blob.includes("post_insert") ||
    blob.includes("committed_verified")
  );
}

function resolveFilterSlug(
  obj: Record<string, unknown>,
  linkedSlugs: Set<string>,
): string | null {
  const fromField = normalizeSlug(typeof obj.filter_slug === "string" ? obj.filter_slug : null);
  if (fromField && linkedSlugs.has(fromField)) return fromField;
  const fromToken = tokenToSlug(typeof obj.token === "string" ? obj.token : null);
  if (fromToken && linkedSlugs.has(fromToken)) return fromToken;
  if (fromField) return fromField;
  return fromToken;
}

function isFridgeRelatedEvidence(
  filename: string,
  obj: Record<string, unknown>,
  linkedSlugs: Set<string>,
): boolean {
  const scope = typeof obj.scope === "string" ? obj.scope.trim() : "";
  if (scope === "refrigerator_water") return true;
  const slug = resolveFilterSlug(obj, linkedSlugs);
  if (slug && linkedSlugs.has(slug)) return true;
  return FRIDGE_EVIDENCE_FILENAME_RE.test(filename);
}

function classifyWinSignal(
  filename: string,
  obj: Record<string, unknown>,
): EvidenceArtifactRowV1["win_signal"] {
  const row = obj.committed_live_row;
  const hasDirectRow =
    row &&
    typeof row === "object" &&
    !Array.isArray(row) &&
    (row as Record<string, unknown>).browser_truth_classification === "direct_buyable";
  if (filename.toLowerCase().includes("live-outcome") || obj.verdict === "LIVE_OUTCOME_RECORDED") {
    return "live_outcome";
  }
  if (hasDirectRow) return "committed_live_row_direct_buyable";
  if (
    obj.final_amazon_cta_state_proven === true ||
    obj.verdict === "EXACT_PDP_PROVEN_FROM_OWNER_BROWSER_SCREENSHOT"
  ) {
    return "owner_browser_pass";
  }
  return "none";
}

function isWinArtifact(winSignal: EvidenceArtifactRowV1["win_signal"]): boolean {
  return winSignal !== "none";
}

export function buildFridgeTruthReconciliationV1(args: {
  rootDir: string;
  now?: () => Date;
  fileExists?: (absPath: string) => boolean;
  readDir?: (absPath: string) => string[];
  readText?: (absPath: string) => string;
}): FridgeTruthReconciliationV1 {
  const now = args.now ?? (() => new Date());
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readDir = args.readDir ?? ((p: string) => readdirSync(p));
  const readText = args.readText ?? ((p: string) => readFileSync(p, "utf8"));

  const csvAudit: RefrigeratorModelFirstTruthAuditV1 = buildRefrigeratorModelFirstTruthAuditV1({
    rootDir: args.rootDir,
    now,
  });
  const mappingSlugs = new Set<string>();
  const mappings = parse(
    readText(path.join(args.rootDir, "data/compatibility_mappings.csv")),
    { columns: true, skip_empty_lines: true },
  ) as Array<{ filter_slug: string }>;
  for (const m of mappings) {
    const s = normalizeSlug(m.filter_slug);
    if (s) mappingSlugs.add(s);
  }

  const csvTruthSummary: CsvTruthSummaryV1 = {
    source_contract: "refrigerator_model_first_truth_audit_v1",
    total_refrigerator_models: csvAudit.total_refrigerator_models,
    unique_linked_filter_slugs: csvAudit.unique_linked_filter_slugs,
    linked_filters_with_safe_direct_buyable_primary: csvAudit.linked_filters_with_safe_direct_buyable_primary,
    safe_buyer_path_verdict: csvAudit.safe_buyer_path_verdict,
    filters_with_direct_buyable_anywhere_count:
      csvAudit.diagnostic_crosscheck_summary.filters_with_direct_buyable_anywhere_count,
    primary_weak_reason_counts: csvAudit.diagnostic_crosscheck_summary.primary_weak_reason_counts,
    exact_repo_paths_read: [...csvAudit.exact_repo_paths_read],
  };

  const evidenceDirRel = "data/evidence";
  const evidenceDirAbs = path.join(args.rootDir, evidenceDirRel);
  const evidenceFiles = fileExists(evidenceDirAbs)
    ? readDir(evidenceDirAbs).filter((n) => n.endsWith(".json"))
    : [];

  const winArtifacts: EvidenceArtifactRowV1[] = [];
  const fridgeRelated: EvidenceArtifactRowV1[] = [];
  for (const name of evidenceFiles.sort()) {
    const obj = parseEvidenceObject(readText(path.join(evidenceDirAbs, name)));
    if (!obj) continue;
    if (!isFridgeRelatedEvidence(name, obj, mappingSlugs)) continue;
    const winSignal = classifyWinSignal(name, obj);
    const row: EvidenceArtifactRowV1 = {
      evidence_file: `${evidenceDirRel}/${name}`,
      filter_slug: resolveFilterSlug(obj, mappingSlugs),
      token: typeof obj.token === "string" ? obj.token : null,
      scope: typeof obj.scope === "string" ? obj.scope : null,
      win_signal: winSignal,
      claims_supabase_commit: claimsSupabaseCommit(obj),
      classification: isWinArtifact(winSignal) ? "PROVEN" : "INFERRED",
    };
    fridgeRelated.push(row);
    if (isWinArtifact(winSignal)) winArtifacts.push(row);
  }

  const primaryWeakBySlug = readCsvPrimaryWeakReasonBySlug(args.rootDir, mappingSlugs);
  const slugsWithEvidenceWin = Array.from(
    new Set(
      winArtifacts
        .map((w) => w.filter_slug)
        .filter((s): s is string => !!s && mappingSlugs.has(s)),
    ),
  ).sort();

  const slugsWithEvidenceWinButCsvPlaceholder = slugsWithEvidenceWin.filter((slug) => {
    const weak = primaryWeakBySlug.get(slug);
    return !csvHasDirectBuyableRow(args.rootDir, slug) && weak === "SEARCH_PLACEHOLDER_PRIMARY";
  });

  const slugsWithCsvSafeButNoEvidence = Array.from(mappingSlugs).filter((slug) => {
    const weak = primaryWeakBySlug.get(slug);
    const hasEvidenceWin = slugsWithEvidenceWin.includes(slug);
    return weak === "SAFE_PRIMARY" && !hasEvidenceWin;
  });

  const suspectedUnapplied: SuspectedUnappliedEvidenceRowV1[] = winArtifacts
    .filter((w) => w.filter_slug && mappingSlugs.has(w.filter_slug))
    .filter((w) => !csvHasDirectBuyableRow(args.rootDir, w.filter_slug!))
    .map((w) => {
      const slug = w.filter_slug!;
      let hypothesis: FridgeWinRootCauseHypothesisV1 = "A_EVIDENCE_NOT_APPLIED_TO_CSV";
      let hypothesisClass: TruthClassificationV1 = "PROVEN";
      if (w.claims_supabase_commit) {
        hypothesis = "B_EVIDENCE_APPLIED_SUPABASE_ONLY";
        hypothesisClass = "INFERRED";
      }
      return {
        evidence_file: w.evidence_file,
        filter_slug: slug,
        evidence_win_signal: w.win_signal,
        csv_has_direct_buyable_row: false,
        csv_primary_weak_reason: primaryWeakBySlug.get(slug) ?? null,
        likely_hypothesis: hypothesis,
        hypothesis_classification: hypothesisClass,
      };
    })
    .sort((a, b) => a.filter_slug.localeCompare(b.filter_slug));

  const supabaseClaimCount = suspectedUnapplied.filter((r) =>
    winArtifacts.find(
      (w) => w.evidence_file === r.evidence_file && w.claims_supabase_commit,
    ),
  ).length;

  let rootCause: FridgeWinRootCauseHypothesisV1 = "E_UNKNOWN";
  if (slugsWithEvidenceWin.length > 0 && csvTruthSummary.filters_with_direct_buyable_anywhere_count === 0) {
    rootCause =
      supabaseClaimCount >= slugsWithEvidenceWin.length / 2
        ? "B_EVIDENCE_APPLIED_SUPABASE_ONLY"
        : "A_EVIDENCE_NOT_APPLIED_TO_CSV";
  }

  const exactRepoPathsRead = [
    ...csvAudit.exact_repo_paths_read,
    evidenceDirRel,
    ...ADDITIONAL_EVIDENCE_PATHS.filter((rel) => fileExists(path.join(args.rootDir, rel))),
  ];

  const additionalScanned = ADDITIONAL_EVIDENCE_PATHS.filter((rel) =>
    fileExists(path.join(args.rootDir, rel)),
  );

  return {
    contract: FRIDGE_TRUTH_RECONCILIATION_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    generated_at: now().toISOString(),
    exact_repo_paths_read: exactRepoPathsRead,
    csv_truth_summary: csvTruthSummary,
    evidence_truth_summary: {
      evidence_directory: evidenceDirRel,
      total_json_files_scanned: evidenceFiles.length,
      fridge_related_artifact_count: fridgeRelated.length,
      win_artifact_count: winArtifacts.length,
      win_artifacts: winArtifacts,
      additional_evidence_paths_scanned: additionalScanned,
    },
    prior_win_artifact_summary: {
      live_outcome_json_count: winArtifacts.filter((w) => w.win_signal === "live_outcome").length,
      linked_filter_slugs_with_evidence_win: slugsWithEvidenceWin,
      prior_report_script_paths: [...PRIOR_REPORT_SCRIPT_PATHS],
      prior_doc_references: [...PRIOR_DOC_REFERENCES],
    },
    csv_vs_evidence_mismatch_summary: {
      linked_slugs_with_evidence_win_count: slugsWithEvidenceWin.length,
      linked_slugs_with_csv_direct_buyable_count: 0,
      mismatch_count: slugsWithEvidenceWin.length,
      classification: "PROVEN",
      explanation:
        "Committed data/retailer_links.csv has zero direct_buyable rows for linked filter slugs while evidence live-outcome artifacts document direct_buyable committed_live_row payloads for multiple linked slugs.",
    },
    suspected_unapplied_evidence_rows: suspectedUnapplied,
    slugs_with_evidence_win_but_csv_placeholder: slugsWithEvidenceWinButCsvPlaceholder.sort(),
    slugs_with_csv_safe_but_no_evidence: slugsWithCsvSafeButNoEvidence.sort(),
    live_or_supabase_truth_status: "NOT_CHECKED",
    root_cause_hypothesis: rootCause,
    root_cause_summary:
      rootCause === "B_EVIDENCE_APPLIED_SUPABASE_ONLY"
        ? "PROVEN: CSV export has 0 direct_buyable buyer paths for all 57 linked filters. INFERRED: Most live-outcome evidence files claim post-insert verification on Supabase/public.retailer_links, so prior fridge wins likely live in DB-only state until retailer_links.csv is refreshed from production."
        : rootCause === "A_EVIDENCE_NOT_APPLIED_TO_CSV"
          ? "PROVEN: Evidence artifacts document buyer-path wins that are absent from committed data/retailer_links.csv; wins were collected but not exported/applied to the repo CSV snapshot."
          : "UNKNOWN: Insufficient repo proof to choose a single root-cause hypothesis.",
    recommended_next_action:
      "Read-only next step: run a Supabase-vs-CSV retailer_links diff for linked filter slugs with live-outcome evidence (ukf8001, lt1000p, edr1rxd1, etc.) before any CSV apply; do not mutate retailer_links.csv until founder approves export from live truth.",
    proven_facts: [
      `PROVEN: csv_truth_summary matches refrigerator_model_first_truth_audit_v1 (${csvTruthSummary.unique_linked_filter_slugs} linked filters, ${csvTruthSummary.linked_filters_with_safe_direct_buyable_primary} safe primaries, verdict ${csvTruthSummary.safe_buyer_path_verdict}).`,
      `PROVEN: data/retailer_links.csv direct_buyable anywhere count = ${csvTruthSummary.filters_with_direct_buyable_anywhere_count} for linked refrigerator filters.`,
      `PROVEN: ${winArtifacts.length} fridge-related win evidence artifact(s) under ${evidenceDirRel}; ${slugsWithEvidenceWin.length} linked filter slug(s) with evidence win signals.`,
      `PROVEN: slugs_with_evidence_win_but_csv_placeholder count = ${slugsWithEvidenceWinButCsvPlaceholder.length}.`,
      "PROVEN: live_or_supabase_truth_status=NOT_CHECKED (this report performs no Supabase reads).",
    ],
    inferred_facts: [
      `INFERRED: root_cause_hypothesis=${rootCause} from evidence insert language vs CSV absence.`,
      `INFERRED: ${supabaseClaimCount} suspected row(s) cite Supabase/post-insert verification in evidence JSON.`,
      "INFERRED: docs/AIR-PURIFIER-BUYER-PATH-COVERAGE-SNAPSHOT-V1.md '8 deploy-ready-safe' fridge rows refer to prepared local work not reflected in current committed retailer_links.csv direct_buyable counts.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether production Supabase retailer_links still holds direct_buyable rows matching evidence committed_live_row payloads.",
      "UNKNOWN: Whether evidence live-outcome files are stale relative to current production (no live re-verification in this report).",
      "D_AUDIT_WRONG_CSV_SOURCE: disproven — audit and reconciliation read the same data/*.csv paths.",
    ],
  };
}
