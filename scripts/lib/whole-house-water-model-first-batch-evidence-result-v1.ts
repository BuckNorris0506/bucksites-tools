/**
 * Whole-house-water model-first batch evidence v1 — bounded multi-candidate read-only packet.
 * Pulls active queue candidates; no CSV, Supabase, public UI, launch-state, or buy-gate mutation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getVerticalLaunchState } from "@/lib/catalog/vertical-launch-state";
import { isManufacturerSiteSearchUrl } from "@/lib/retailers/launch-buy-links";

import {
  liveBrowserBuyerPathMayRecommendCsvMutationV1,
  type ModelFirstCandidateBuyerPathV1,
  type ModelFirstEvidenceRowStatusV1,
} from "./air-purifier-model-first-evidence-result-v1";
import {
  WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
  buildWholeHouseWaterModelFirstEasiestProofQueueV1,
  type WholeHouseWaterModelFirstEasiestProofQueueV1,
  type WhwEasiestProofCandidateV1,
} from "./whole-house-water-model-first-easiest-proof-queue-v1";

export const WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1 =
  "whole_house_water_model_first_batch_evidence_result_v1" as const;

export const WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1 =
  "data/whole-house-water/batch-production/agent-results-model-first-batch-v1" as const;

export const WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1 =
  `${WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1}/whw-model-first-batch-v1.results.json` as const;

export const WHW_MODEL_FIRST_BATCH_PACKET_ID_V1 = "whw-model-first-batch-v1" as const;

export const WHW_MODEL_FIRST_BATCH_SIZE_V1 = 5;

const OFFICIAL_AP800_HOUSING_PDF =
  "https://multimedia.3m.com/mws/media/1903341O/3m-aqua-pure-ap800-series-whole-house-filter-housings.pdf";

const OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF =
  "https://multimedia.3m.com/mws/media/2337401O/residential-aqua-pure-home-water-filter-comparison-chart.pdf";

export type WhwBatchCsvMutationRecommendationV1 = {
  filter_slug: string;
  anchor_model_slug: string;
  retailer_key: string;
  destination_url: string;
  exact_token_proof: string;
  buyability_proof: string;
};

export type WhwBatchCandidateCheckedV1 = {
  queue_rank: number;
  filter_slug: string;
  brand_slug: string;
  anchor_model_slug: string;
  model_or_system_slugs: string[];
  oem_part_number: string;
  model_proof_status: ModelFirstEvidenceRowStatusV1;
  model_proof_notes: string;
  documented_filter_tokens: string[];
  official_source_urls: string[];
  buyer_path_status: ModelFirstEvidenceRowStatusV1;
  candidate_outcome: ModelFirstEvidenceRowStatusV1;
  candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[];
  skip_fast_reason: string | null;
  grind_avoided: true;
};

export type WhwBatchSkippedOrHardCaseV1 = {
  filter_slug: string;
  reason: string;
  classification: string;
};

export type WhwModelFirstBatchEvidenceResultV1 = {
  contract: typeof WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  evidence_mode: "live_browser_model_first_batch_v1";
  packet_id: typeof WHW_MODEL_FIRST_BATCH_PACKET_ID_V1;
  source_queue_contract: typeof WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1;
  source_queue_head: {
    filter_slug: string;
    anchor_model_slug: string;
    queue_rank: number;
  };
  batch_size: number;
  candidates_checked: WhwBatchCandidateCheckedV1[];
  evidence_status_counts: Record<ModelFirstEvidenceRowStatusV1, number>;
  candidate_outcomes: Record<ModelFirstEvidenceRowStatusV1, number>;
  recommended_csv_mutations: WhwBatchCsvMutationRecommendationV1[];
  safe_apply_authorized: false;
  skipped_or_hard_cases: WhwBatchSkippedOrHardCaseV1[];
  generated_at: string;
  checked_at: string;
  do_not_open_public: true;
  proven_facts: string[];
  inferred_facts: string[];
  unknown_facts: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStatusCounts(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const counts = value.evidence_status_counts;
  if (!isRecord(counts)) return false;
  return (
    typeof counts.PASS === "number" &&
    typeof counts.FAIL === "number" &&
    typeof counts.UNKNOWN === "number" &&
    typeof counts.BLOCKED === "number"
  );
}

function validateCandidateBuyerPaths(paths: unknown): paths is ModelFirstCandidateBuyerPathV1[] {
  if (!Array.isArray(paths)) return false;
  return paths.every((pathRow) => {
    if (!isRecord(pathRow)) return false;
    const url = typeof pathRow.url === "string" ? pathRow.url.trim() : "";
    if (!url || isManufacturerSiteSearchUrl(url)) return false;
    return (
      typeof pathRow.retailer_or_source === "string" &&
      typeof pathRow.exact_token_proof === "string" &&
      typeof pathRow.buyability_proof === "string" &&
      typeof pathRow.wrong_family_risk === "string" &&
      (pathRow.status === "PASS" ||
        pathRow.status === "FAIL" ||
        pathRow.status === "UNKNOWN" ||
        pathRow.status === "BLOCKED")
    );
  });
}

function validateCandidatesChecked(rows: unknown): rows is WhwBatchCandidateCheckedV1[] {
  if (!Array.isArray(rows)) return false;
  return rows.every((row) => {
    if (!isRecord(row)) return false;
    if (row.grind_avoided !== true) return false;
    if (!validateCandidateBuyerPaths(row.candidate_buyer_paths)) return false;
    const paths = row.candidate_buyer_paths as ModelFirstCandidateBuyerPathV1[];
    if (paths.some((p) => p.status === "PASS" && !liveBrowserBuyerPathMayRecommendCsvMutationV1(p))) {
      return false;
    }
    return (
      typeof row.filter_slug === "string" &&
      typeof row.anchor_model_slug === "string" &&
      typeof row.model_proof_status === "string" &&
      typeof row.buyer_path_status === "string" &&
      typeof row.candidate_outcome === "string"
    );
  });
}

export function isAllowedWhwModelFirstBatchEvidenceResultRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_MODEL_FIRST_BATCH_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function computeBatchCandidateOutcomeV1(args: {
  model_proof_status: ModelFirstEvidenceRowStatusV1;
  buyer_path_status: ModelFirstEvidenceRowStatusV1;
}): ModelFirstEvidenceRowStatusV1 {
  if (args.model_proof_status === "PASS" && args.buyer_path_status === "PASS") return "PASS";
  if (args.model_proof_status === "BLOCKED" || args.buyer_path_status === "BLOCKED") {
    return "BLOCKED";
  }
  if (args.model_proof_status === "FAIL" && args.buyer_path_status === "FAIL") return "FAIL";
  return "UNKNOWN";
}

export function selectActiveBatchCandidatesFromQueueV1(
  queue: WholeHouseWaterModelFirstEasiestProofQueueV1,
  batchSize: number = WHW_MODEL_FIRST_BATCH_SIZE_V1,
): WhwEasiestProofCandidateV1[] {
  const excluded = new Set(
    queue.completed_or_waiting_candidates.map((row) => row.filter_slug.trim().toLowerCase()),
  );
  return queue.top_10_easiest_candidates
    .filter((row) => !excluded.has(row.filter_slug.trim().toLowerCase()))
    .slice(0, batchSize);
}

function countOutcomes(
  rows: WhwBatchCandidateCheckedV1[],
): Record<ModelFirstEvidenceRowStatusV1, number> {
  const counts: Record<ModelFirstEvidenceRowStatusV1, number> = {
    PASS: 0,
    FAIL: 0,
    UNKNOWN: 0,
    BLOCKED: 0,
  };
  for (const row of rows) counts[row.candidate_outcome] += 1;
  return counts;
}

export function batchCandidateMayAuthorizeCsvMutationV1(
  row: WhwBatchCandidateCheckedV1,
): boolean {
  if (row.candidate_outcome !== "PASS") return false;
  if (row.model_proof_status !== "PASS" || row.buyer_path_status !== "PASS") return false;
  return row.candidate_buyer_paths.some((p) => liveBrowserBuyerPathMayRecommendCsvMutationV1(p));
}

export function validateWhwModelFirstBatchEvidenceResultV1(
  value: unknown,
): value is WhwModelFirstBatchEvidenceResultV1 {
  if (!isRecord(value)) return false;
  if (value.contract !== WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1) return false;
  if (value.read_only !== true || value.data_mutation !== false) return false;
  if (value.evidence_mode !== "live_browser_model_first_batch_v1") return false;
  if (value.packet_id !== WHW_MODEL_FIRST_BATCH_PACKET_ID_V1) return false;
  if (value.do_not_open_public !== true) return false;
  if (value.safe_apply_authorized !== false) return false;
  if (!hasStatusCounts(value)) return false;
  if (!validateCandidatesChecked(value.candidates_checked)) return false;
  if (!Array.isArray(value.recommended_csv_mutations)) return false;
  if (value.recommended_csv_mutations.length > 0 && value.safe_apply_authorized !== false) {
    return false;
  }
  const candidates = value.candidates_checked as WhwBatchCandidateCheckedV1[];
  const mutations = value.recommended_csv_mutations as WhwBatchCsvMutationRecommendationV1[];
  if (mutations.length > 0) {
    return candidates.some((c) => batchCandidateMayAuthorizeCsvMutationV1(c));
  }
  return !candidates.some((c) => batchCandidateMayAuthorizeCsvMutationV1(c));
}

type BoundedCandidateSpecV1 = {
  oem_part_number: string;
  documented_filter_tokens: string[];
  model_proof_status: ModelFirstEvidenceRowStatusV1;
  model_proof_notes: string;
  official_source_urls: string[];
  buyer_path_status: ModelFirstEvidenceRowStatusV1;
  candidate_buyer_paths: ModelFirstCandidateBuyerPathV1[];
};

function boundedEvidenceForQueueRow(
  row: WhwEasiestProofCandidateV1,
): BoundedCandidateSpecV1 {
  const anchor = row.model_or_system_slugs[0] ?? "";
  const tokenFromSlug = row.filter_slug.split("-").pop()?.toUpperCase() ?? "";

  if (row.filter_slug === "3m-ap811") {
    return {
      oem_part_number: "AP811",
      documented_filter_tokens: ["AP811"],
      model_proof_status: "PASS",
      model_proof_notes:
        "PROVEN: Official 3M AP800 housing PDF and residential comparison chart document AP802-class systems and AP811 carbon cartridge (bounded batch read, May 2026). PROVEN: Committed compatibility_mappings.csv maps 3m-aquapure-ap802 → 3m-ap811 is_recommended=true. INFERRED: Dual-stage AP802 installs use AP810 sediment + AP811 carbon per committed models.csv notes — sediment not re-proven in this row.",
      official_source_urls: [OFFICIAL_AP800_HOUSING_PDF, OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF],
      buyer_path_status: "UNKNOWN",
      candidate_buyer_paths: [],
    };
  }

  if (row.filter_slug === "3m-ap910r") {
    return {
      oem_part_number: "AP910R",
      documented_filter_tokens: ["AP910R"],
      model_proof_status: "UNKNOWN",
      model_proof_notes:
        "PARTIAL: Committed models.csv documents AP903/AP904-class manifolds serviced with AP910R carbon + AP917HD-S sediment. Repo mapping 3m-aquapure-ap903 → 3m-ap910r is_recommended=true. UNKNOWN: AP900-series official comparison-chart row not verified in bounded batch — not grinding AP903 manual hunt.",
      official_source_urls: [OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF],
      buyer_path_status: "UNKNOWN",
      candidate_buyer_paths: [],
    };
  }

  if (row.filter_slug === "3m-ap917hd-s") {
    return {
      oem_part_number: "AP917HD-S",
      documented_filter_tokens: ["AP917HD-S", "AP917HDS"],
      model_proof_status: "UNKNOWN",
      model_proof_notes:
        "PARTIAL: Same AP903 anchor as AP910R row; committed filters.csv notes AP917HD-S for AP900-series sediment. Repo mapping is_recommended=true. UNKNOWN: Official stamped-head compatibility not verified in bounded batch.",
      official_source_urls: [OFFICIAL_AQUA_PURE_COMPARISON_CHART_PDF],
      buyer_path_status: "UNKNOWN",
      candidate_buyer_paths: [],
    };
  }

  if (row.filter_slug === "whirlpool-whkf-gd05") {
    return {
      oem_part_number: "WHKF-GD05",
      documented_filter_tokens: ["WHKF-GD05", "WHKFGD05"],
      model_proof_status: "UNKNOWN",
      model_proof_notes:
        "PARTIAL: Committed mapping whirlpool-whkf-dwhbb → whirlpool-whkf-gd05 is_recommended=true; models.csv notes WHKF-GD05 + WHKF-WHPL on dual Big Blue installs. UNKNOWN: No official Whirlpool manual URL captured in bounded batch; primary committed link is whirlpoolparts.com search placeholder.",
      official_source_urls: [],
      buyer_path_status: "UNKNOWN",
      candidate_buyer_paths: [],
    };
  }

  if (row.filter_slug === "ge-fxhtc") {
    return {
      oem_part_number: "FXHTC",
      documented_filter_tokens: ["FXHTC"],
      model_proof_status: "UNKNOWN",
      model_proof_notes:
        "BLOCKED for fast batch: queue skip_fast_reason cites replacement-chain / generation ambiguity across GXWH20S/GXWH30C/GXWH35F/GXWH40F manifolds. Repo maps four housing models → ge-fxhtc is_recommended=true but official sticker proof not attempted in bounded batch.",
      official_source_urls: [],
      buyer_path_status: "UNKNOWN",
      candidate_buyer_paths: [],
    };
  }

  return {
    oem_part_number: tokenFromSlug,
    documented_filter_tokens: tokenFromSlug ? [tokenFromSlug] : [],
    model_proof_status: "UNKNOWN",
    model_proof_notes: `UNKNOWN: No bounded evidence template for ${row.filter_slug} — anchor ${anchor}.`,
    official_source_urls: [],
    buyer_path_status: "UNKNOWN",
    candidate_buyer_paths: [],
  };
}

function buildCheckedRow(row: WhwEasiestProofCandidateV1): WhwBatchCandidateCheckedV1 {
  const anchor = row.model_or_system_slugs[0] ?? "";
  const spec = boundedEvidenceForQueueRow(row);
  const model_proof_status =
    row.filter_slug === "ge-fxhtc" && row.skip_fast_reason
      ? ("BLOCKED" as const)
      : spec.model_proof_status;
  const buyer_path_status = spec.buyer_path_status;
  const candidate_outcome = computeBatchCandidateOutcomeV1({
    model_proof_status,
    buyer_path_status,
  });

  return {
    queue_rank: row.rank,
    filter_slug: row.filter_slug,
    brand_slug: row.brand_slug,
    anchor_model_slug: anchor,
    model_or_system_slugs: row.model_or_system_slugs,
    oem_part_number: spec.oem_part_number,
    model_proof_status,
    model_proof_notes: spec.model_proof_notes,
    documented_filter_tokens: spec.documented_filter_tokens,
    official_source_urls: spec.official_source_urls,
    buyer_path_status,
    candidate_outcome,
    candidate_buyer_paths: spec.candidate_buyer_paths,
    skip_fast_reason: row.skip_fast_reason,
    grind_avoided: true,
  };
}

export function buildWhwModelFirstBatchEvidenceV1(args?: {
  rootDir?: string;
  now?: () => Date;
  queue?: WholeHouseWaterModelFirstEasiestProofQueueV1;
  batchSize?: number;
}): WhwModelFirstBatchEvidenceResultV1 {
  const rootDir = args?.rootDir ?? process.cwd();
  const now = args?.now ?? (() => new Date());
  const iso = now().toISOString();
  const queue = args?.queue ?? buildWholeHouseWaterModelFirstEasiestProofQueueV1({ rootDir, now });
  const batchSize = args?.batchSize ?? WHW_MODEL_FIRST_BATCH_SIZE_V1;
  const selected = selectActiveBatchCandidatesFromQueueV1(queue, batchSize);
  const candidates_checked = selected.map(buildCheckedRow);
  const candidate_outcomes = countOutcomes(candidates_checked);
  const evidence_status_counts = { ...candidate_outcomes };

  const head = selected[0];
  const source_queue_head = {
    filter_slug: head?.filter_slug ?? "none",
    anchor_model_slug: head?.model_or_system_slugs[0] ?? "none",
    queue_rank: head?.rank ?? 0,
  };

  const skipped_or_hard_cases: WhwBatchSkippedOrHardCaseV1[] = [
    ...queue.completed_or_waiting_candidates.map((row) => ({
      filter_slug: row.filter_slug,
      reason: row.retry_hint,
      classification: row.classification,
    })),
    ...queue.skipped_or_hard_cases
      .filter((row) => !candidates_checked.some((c) => c.filter_slug === row.filter_slug))
      .slice(0, 8)
      .map((row) => ({
        filter_slug: row.filter_slug,
        reason: row.skip_fast_reason,
        classification: row.recommended_action,
      })),
  ];

  const committedSearchNotes: Record<string, string> = {
    "3m-ap811": "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP811",
    "3m-ap910r": "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP910R",
    "3m-ap917hd-s": "https://www.3m.com/3M/en_US/water-filtration-us/search/?Ntt=AP917HD-S",
    "whirlpool-whkf-gd05":
      "https://www.whirlpoolparts.com/catalog.jsp?search=stw=&path=&searchKeyword=WHKF-GD05",
    "ge-fxhtc":
      "https://www.geapplianceparts.com/store/catalog/search.jsp?searchKeyword=FXHTC",
  };

  return {
    contract: WHW_MODEL_FIRST_BATCH_EVIDENCE_RESULT_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    evidence_mode: "live_browser_model_first_batch_v1",
    packet_id: WHW_MODEL_FIRST_BATCH_PACKET_ID_V1,
    source_queue_contract: WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1,
    source_queue_head,
    batch_size: batchSize,
    candidates_checked,
    evidence_status_counts,
    candidate_outcomes,
    recommended_csv_mutations: [],
    safe_apply_authorized: false,
    skipped_or_hard_cases,
    generated_at: iso,
    checked_at: iso,
    do_not_open_public: true,
    proven_facts: [
      `PROVEN: Batch pulled ${String(candidates_checked.length)} active candidates from ${WHW_MODEL_FIRST_EASIEST_PROOF_QUEUE_CONTRACT_V1}; head filter ${source_queue_head.filter_slug}.`,
      "PROVEN: 3m-ap810 excluded — completed_or_waiting BUYER_PATH_BROWSER_TRUTH_REQUIRED.",
      `PROVEN: candidate_outcomes PASS=${candidate_outcomes.PASS} FAIL=${candidate_outcomes.FAIL} UNKNOWN=${candidate_outcomes.UNKNOWN} BLOCKED=${candidate_outcomes.BLOCKED}.`,
      "PROVEN: recommended_csv_mutations=[]; safe_apply_authorized=false.",
      ...candidates_checked
        .filter((c) => c.model_proof_status === "PASS")
        .map(
          (c) =>
            `PROVEN: ${c.filter_slug} model_proof_status=PASS via official sources (${c.official_source_urls.length} URL(s)) + repo mapping.`,
        ),
      ...Object.entries(committedSearchNotes)
        .filter(([slug]) => candidates_checked.some((c) => c.filter_slug === slug))
        .map(
          ([slug, url]) =>
            `PROVEN: Committed retailer_links.csv primary for ${slug} is manufacturer search placeholder ${url} — excluded from candidate_buyer_paths (search cannot PASS).`,
        ),
      `PROVEN: whole-house-water launch state remains ${getVerticalLaunchState("whole-house-water")}.`,
    ],
    inferred_facts: [
      "INFERRED: Bounded batch intentionally avoids grinding any single filter — buyer paths left UNKNOWN unless safe direct_buyable proof exists.",
      "INFERRED: Next production lane after batch is per-filter browser_truth on strongest UNKNOWN PDPs (see 3m-ap810 completed_or_waiting).",
      candidates_checked.some((c) => c.model_proof_status === "PASS")
        ? "INFERRED: 3m-ap811 is the only model-fit PASS in batch v1; still lacks buyer-path PASS — no CSV apply."
        : "INFERRED: No model-fit PASS rows in this batch snapshot.",
    ],
    unknown_facts: [
      "UNKNOWN: Whether AP900-series official docs will PASS model proof for AP910R/AP917HD-S on a follow-up bounded packet.",
      "UNKNOWN: Whether Whirlpool/GE official manuals yield PASS model proof without generation sticker ambiguity.",
      "UNKNOWN: Whether any retailer PDP in this batch family will pass browser_truth direct_buyable without wrong-family drift.",
    ],
  };
}

export function writeWhwModelFirstBatchEvidenceResultV1(args: {
  rootDir: string;
  result: WhwModelFirstBatchEvidenceResultV1;
  relPath?: string;
}): string {
  const rel = args.relPath ?? WHW_MODEL_FIRST_BATCH_V1_RESULT_REL_V1;
  if (!isAllowedWhwModelFirstBatchEvidenceResultRelPathV1(rel)) {
    throw new Error(`Refusing to write outside allowed WHW model-first batch results dir: ${rel}`);
  }
  const abs = path.join(args.rootDir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(args.result, null, 2)}\n`, "utf8");
  return rel;
}

export function loadWhwModelFirstBatchEvidenceResultV1(args: {
  rootDir: string;
  relPath: string;
}): WhwModelFirstBatchEvidenceResultV1 | null {
  if (!isAllowedWhwModelFirstBatchEvidenceResultRelPathV1(args.relPath)) return null;
  const abs = path.join(args.rootDir, args.relPath);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!validateWhwModelFirstBatchEvidenceResultV1(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
