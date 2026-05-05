import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MANUAL_SOURCE_TIER_LABELS,
  manualSourcePublicTier,
  type ManualSourcePublicTier,
  type RefrigeratorManualEvidenceRecord,
  type RefrigeratorManualEvidenceSource,
  validateRefrigeratorManualEvidencePublicReady,
} from "@/lib/manuals/refrigerator-manual-evidence";

export type PublicRefrigeratorManualEvidence = RefrigeratorManualEvidenceRecord & {
  source_tier: ManualSourcePublicTier; // highest source tier in the bundle
  source_tier_label: string; // label for highest source tier
  sources: RefrigeratorManualEvidenceSource[];
};

function manualEvidenceDirPath(): string {
  return path.join(process.cwd(), "data", "manual-evidence", "refrigerator");
}

function looksLikeSafeSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export function toPublicRefrigeratorManualEvidence(
  record: Partial<RefrigeratorManualEvidenceRecord>,
): PublicRefrigeratorManualEvidence | null {
  const readiness = validateRefrigeratorManualEvidencePublicReady(record);
  if (!readiness.ok) return null;
  const sources: RefrigeratorManualEvidenceSource[] =
    Array.isArray(record.sources) && record.sources.length > 0
      ? record.sources
      : [
          {
            source_type: record.source_type!,
            source_url: record.source_url!,
            source_title: record.source_title!,
            source_host: record.source_host!,
            evidence_role: "replacement_process_guidance",
            source_tier: manualSourcePublicTier(record.source_type!),
          },
        ];
  const sourceTier = Math.min(
    ...sources.map((s) => manualSourcePublicTier(s.source_type)),
  ) as ManualSourcePublicTier;
  return {
    ...(record as RefrigeratorManualEvidenceRecord),
    sources,
    source_tier: sourceTier,
    source_tier_label: MANUAL_SOURCE_TIER_LABELS[sourceTier],
  };
}

/** Loads a model fixture and returns only public-ready evidence. */
export async function loadRefrigeratorManualEvidenceForModel(
  fridgeModelSlug: string,
): Promise<PublicRefrigeratorManualEvidence | null> {
  if (!looksLikeSafeSlug(fridgeModelSlug)) return null;
  const filePath = path.join(manualEvidenceDirPath(), `${fridgeModelSlug}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RefrigeratorManualEvidenceRecord>;
    return toPublicRefrigeratorManualEvidence(parsed);
  } catch {
    return null;
  }
}
