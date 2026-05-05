import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MANUAL_SOURCE_TIER_LABELS,
  manualSourcePublicTier,
  type ManualSourcePublicTier,
  type RefrigeratorManualEvidenceRecord,
  validateRefrigeratorManualEvidencePublicReady,
} from "@/lib/manuals/refrigerator-manual-evidence";

export type PublicRefrigeratorManualEvidence = RefrigeratorManualEvidenceRecord & {
  source_tier: ManualSourcePublicTier;
  source_tier_label: string;
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
  const sourceType = record.source_type;
  if (!sourceType) return null;
  const sourceTier = manualSourcePublicTier(sourceType);
  return {
    ...(record as RefrigeratorManualEvidenceRecord),
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
