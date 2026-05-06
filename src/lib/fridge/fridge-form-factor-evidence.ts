import { readFile } from "node:fs/promises";
import path from "node:path";

export type FridgeFormFactor =
  | "french_door_bottom_freezer"
  | "side_by_side"
  | "top_freezer"
  | "bottom_freezer"
  | "unknown";

export type FridgeFormFactorSourceType =
  | "owner_manual"
  | "manufacturer_support"
  | "official_parts_site"
  | "third_party_manual_index"
  | "unknown";

export type FridgeFormFactorConfidence = "high" | "medium" | "low" | "unknown";

export type FridgeFormFactorEvidenceRecord = {
  fridge_model_slug: string;
  form_factor: FridgeFormFactor;
  source_type: FridgeFormFactorSourceType;
  source_url: string;
  source_title: string;
  confidence: FridgeFormFactorConfidence;
  operator_reviewed: boolean;
  copied_image_allowed?: boolean;
  evidence_date?: string;
  notes?: string;
};

function evidenceDirPath(): string {
  return path.join(process.cwd(), "data", "fridge-form-factor-evidence");
}

function isNonEmpty(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function looksLikeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function looksLikeSafeSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export function validateFridgeFormFactorEvidencePublicReady(
  record: Partial<FridgeFormFactorEvidenceRecord>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isNonEmpty(record.fridge_model_slug)) {
    errors.push("fridge_model_slug must be non-empty");
  }
  if (!record.form_factor) {
    errors.push("form_factor is required");
  }
  if (!record.source_type) {
    errors.push("source_type is required");
  }
  if (!record.confidence) {
    errors.push("confidence is required");
  }
  if (!isNonEmpty(record.source_url) || !looksLikeHttpUrl(record.source_url ?? "")) {
    errors.push("source_url must be a non-empty http(s) URL");
  }
  if (!isNonEmpty(record.source_title)) {
    errors.push("source_title must be non-empty");
  }
  if (record.operator_reviewed !== true) {
    errors.push("operator_reviewed must be true");
  }
  if (record.copied_image_allowed === true) {
    errors.push("copied_image_allowed must not be true");
  }
  if (record.form_factor !== "unknown" && record.source_type === "unknown") {
    errors.push("source_type must not be unknown when form_factor is specific");
  }
  if (record.form_factor !== "unknown" && record.confidence === "unknown") {
    errors.push("confidence must not be unknown when form_factor is specific");
  }
  return { ok: errors.length === 0, errors };
}

export async function loadFridgeFormFactorEvidenceForModel(
  fridgeModelSlug: string,
): Promise<FridgeFormFactorEvidenceRecord | null> {
  if (!looksLikeSafeSlug(fridgeModelSlug)) return null;
  const filePath = path.join(evidenceDirPath(), `${fridgeModelSlug}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FridgeFormFactorEvidenceRecord>;
    const readiness = validateFridgeFormFactorEvidencePublicReady(parsed);
    if (!readiness.ok) return null;
    return parsed as FridgeFormFactorEvidenceRecord;
  } catch {
    return null;
  }
}
