/**
 * Read-only evidence sufficiency model for lifecycle mutation authorization review.
 * PROVEN: no evidence artifact writes; classification only.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type UniversalBatchLifecycleMutationAuthorizationEvidenceRowStatusV1 =
  | "STRUCTURED_PROVEN"
  | "LEGACY_ACCEPTABLE"
  | "INSUFFICIENT";

export type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyStatusV1 =
  | "PROVEN"
  | "BLOCKED";

export type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1 = {
  slug: string;
  status: UniversalBatchLifecycleMutationAuthorizationEvidenceRowStatusV1;
  evidence_artifact_path: string;
  reason: string;
};

export type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyCountsV1 = {
  structured_proven: number;
  legacy_acceptable: number;
  insufficient: number;
  total: number;
};

export type UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyV1 = {
  evidence_sufficiency_status: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyStatusV1;
  evidence_sufficiency_counts: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyCountsV1;
  evidence_sufficiency_rows: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1[];
  evidence_sufficiency_blockers: string[];
};

export type PlannedChangeEvidenceRefV1 = {
  slug: string;
  evidence_artifact_path: string;
  oem_token?: string;
};

export type AssessUniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyInputV1 = {
  rootDir: string;
  plannedChanges: readonly PlannedChangeEvidenceRefV1[];
  fileExists?: (absPath: string) => boolean;
  readText?: (absPath: string) => string;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function committedLiveRowDirectBuyable(doc: Record<string, unknown>): boolean {
  const row = asRecord(doc.committed_live_row);
  if (!row) return false;
  return normalizeText(String(row.browser_truth_classification ?? "")) === "direct_buyable";
}

function committedLiveRowApproved(doc: Record<string, unknown>): boolean {
  const row = asRecord(doc.committed_live_row);
  if (!row) return false;
  const status = normalizeText(String(row.status ?? ""));
  return status === "approved" || status.length === 0;
}

function committedLiveRowNotes(doc: Record<string, unknown>): string {
  const row = asRecord(doc.committed_live_row);
  return nonEmptyString(row?.browser_truth_notes) ?? "";
}

function hasStructuredBrowserOrTokenOrBuyabilityProof(doc: Record<string, unknown>): boolean {
  if (nonEmptyString(doc.exact_token_proof)) return true;
  if (nonEmptyString(doc.buyability_proof)) return true;
  const browser = asRecord(doc.browser_evidence);
  if (!browser) return false;
  if (browser.token_visible_in_pdp_title === true) return true;
  if (nonEmptyString(browser.buy_path_visible)) return true;
  if (nonEmptyString(browser.browser_verdict)) return true;
  if (nonEmptyString(browser.asin)) return true;
  if (nonEmptyString(browser.amazon_pdp_url) || nonEmptyString(browser.amazon_pdp_url_canonical)) {
    return true;
  }
  return false;
}

function notesHaveAttributionLanguage(notes: string, slug: string, token: string): boolean {
  const hay = notes.toLowerCase();
  if (hay.length === 0) return false;
  const slugNorm = slug.trim().toLowerCase();
  const tokenNorm = token.trim().toLowerCase();
  if (slugNorm.length > 0 && hay.includes(slugNorm)) return true;
  if (tokenNorm.length > 0 && hay.includes(tokenNorm)) return true;
  const keywords = [
    "asin",
    "pdp",
    "buy path",
    "buyability",
    "direct_buyable",
    "direct buyable",
    "amazon.com/dp/",
    "/dp/",
    "add to cart",
    "buy now",
    "oem",
    "aftermarket",
    "compatible",
  ];
  return keywords.some((keyword) => hay.includes(keyword));
}

function lacksModernStructuredFields(doc: Record<string, unknown>): boolean {
  return doc.final_amazon_cta_state_proven !== true;
}

export function classifyUniversalBatchLifecycleMutationAuthorizationEvidenceArtifactV1(args: {
  slug: string;
  evidence_artifact_path: string;
  doc: Record<string, unknown> | null;
  oem_token?: string;
}): UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1 {
  const token = args.oem_token ?? args.slug;
  if (!args.doc) {
    return {
      slug: args.slug,
      status: "INSUFFICIENT",
      evidence_artifact_path: args.evidence_artifact_path,
      reason: "evidence_artifact_missing_or_invalid_json",
    };
  }

  const doc = args.doc;
  const notes = committedLiveRowNotes(doc);
  const directBuyable = committedLiveRowDirectBuyable(doc);
  const approved = committedLiveRowApproved(doc);
  const structuredProof = hasStructuredBrowserOrTokenOrBuyabilityProof(doc);
  const notesAttribution = notesHaveAttributionLanguage(notes, args.slug, token);

  if (
    doc.final_amazon_cta_state_proven === true &&
    directBuyable &&
    (structuredProof || notesAttribution)
  ) {
    return {
      slug: args.slug,
      status: "STRUCTURED_PROVEN",
      evidence_artifact_path: args.evidence_artifact_path,
      reason: structuredProof
        ? "final_amazon_cta_state_proven=true with direct_buyable committed_live_row and structured browser/token/buyability proof"
        : "final_amazon_cta_state_proven=true with direct_buyable committed_live_row and committed_live_row.browser_truth_notes attribution",
    };
  }

  if (
    lacksModernStructuredFields(doc) &&
    directBuyable &&
    approved &&
    notesAttribution
  ) {
    return {
      slug: args.slug,
      status: "LEGACY_ACCEPTABLE",
      evidence_artifact_path: args.evidence_artifact_path,
      reason:
        "legacy evidence without final_amazon_cta_state_proven; committed_live_row direct_buyable with sufficient browser_truth_notes attribution",
    };
  }

  if (!directBuyable) {
    return {
      slug: args.slug,
      status: "INSUFFICIENT",
      evidence_artifact_path: args.evidence_artifact_path,
      reason: "committed_live_row.browser_truth_classification is not direct_buyable",
    };
  }

  if (doc.final_amazon_cta_state_proven === true && !structuredProof && !notesAttribution) {
    return {
      slug: args.slug,
      status: "INSUFFICIENT",
      evidence_artifact_path: args.evidence_artifact_path,
      reason:
        "final_amazon_cta_state_proven=true but missing structured browser/token/buyability proof and committed_live_row.browser_truth_notes attribution",
    };
  }

  return {
    slug: args.slug,
    status: "INSUFFICIENT",
    evidence_artifact_path: args.evidence_artifact_path,
    reason:
      "evidence lacks structured proof and legacy committed_live_row browser_truth_notes are insufficient for token/PDP/buyability attribution",
  };
}

export function assessUniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyV1(
  input: AssessUniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyInputV1,
): UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyV1 {
  const fileExists = input.fileExists ?? ((abs: string) => existsSync(abs));
  const readText = input.readText ?? ((abs: string) => readFileSync(abs, "utf8"));

  const evidence_sufficiency_rows: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyRowV1[] =
    [];
  const evidence_sufficiency_blockers: string[] = [];

  if (input.plannedChanges.length === 0) {
    evidence_sufficiency_blockers.push("apply_plan_planned_changes_missing");
    return {
      evidence_sufficiency_status: "BLOCKED",
      evidence_sufficiency_counts: {
        structured_proven: 0,
        legacy_acceptable: 0,
        insufficient: 0,
        total: 0,
      },
      evidence_sufficiency_rows,
      evidence_sufficiency_blockers,
    };
  }

  for (const planned of input.plannedChanges) {
    const relPath = planned.evidence_artifact_path;
    if (!relPath || relPath.trim().length === 0) {
      evidence_sufficiency_rows.push({
        slug: planned.slug,
        status: "INSUFFICIENT",
        evidence_artifact_path: relPath ?? "",
        reason: "planned_change_missing_evidence_artifact_path",
      });
      evidence_sufficiency_blockers.push(
        `evidence_insufficient: slug=${planned.slug} reason=planned_change_missing_evidence_artifact_path`,
      );
      continue;
    }

    const absPath = path.join(input.rootDir, relPath);
    let doc: Record<string, unknown> | null = null;
    if (!fileExists(absPath)) {
      evidence_sufficiency_blockers.push(
        `evidence_artifact_missing: slug=${planned.slug} path=${relPath}`,
      );
    } else {
      try {
        doc = JSON.parse(readText(absPath)) as Record<string, unknown>;
      } catch {
        evidence_sufficiency_blockers.push(
          `evidence_artifact_invalid_json: slug=${planned.slug} path=${relPath}`,
        );
      }
    }

    const classified = classifyUniversalBatchLifecycleMutationAuthorizationEvidenceArtifactV1({
      slug: planned.slug,
      evidence_artifact_path: relPath,
      doc,
      oem_token: planned.oem_token,
    });
    evidence_sufficiency_rows.push(classified);
    if (classified.status === "INSUFFICIENT") {
      evidence_sufficiency_blockers.push(
        `evidence_insufficient: slug=${planned.slug} reason=${classified.reason}`,
      );
    }
  }

  const counts: UniversalBatchLifecycleMutationAuthorizationEvidenceSufficiencyCountsV1 = {
    structured_proven: evidence_sufficiency_rows.filter((row) => row.status === "STRUCTURED_PROVEN")
      .length,
    legacy_acceptable: evidence_sufficiency_rows.filter((row) => row.status === "LEGACY_ACCEPTABLE")
      .length,
    insufficient: evidence_sufficiency_rows.filter((row) => row.status === "INSUFFICIENT").length,
    total: evidence_sufficiency_rows.length,
  };

  return {
    evidence_sufficiency_status: counts.insufficient === 0 ? "PROVEN" : "BLOCKED",
    evidence_sufficiency_counts: counts,
    evidence_sufficiency_rows,
    evidence_sufficiency_blockers,
  };
}
