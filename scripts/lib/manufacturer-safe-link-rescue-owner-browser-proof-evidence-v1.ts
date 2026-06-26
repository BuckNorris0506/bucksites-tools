/**
 * Shared owner browser proof evidence helpers for manufacturer safe-link rescue.
 * Used by orchestrator (facts) and readiness gate (promotion). Read-only.
 */

import path from "node:path";

import {
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1,
  FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1,
  type OwnerBrowserProofResultV1,
} from "./fridge-safe-link-owner-browser-proof-result-v1";

export const MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1 = 14;

export const MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1: Readonly<Record<string, string>> =
  Object.fromEntries(
    FRIDGE_OWNER_BROWSER_PROOF_RESULT_ARTIFACT_RELS_V1.map((rel) => {
      const match = rel.match(/owner-browser-proof-result-([a-z0-9-]+)-v1\.json$/);
      return [match?.[1] ?? "", rel];
    }),
  );

export type ManufacturerRescueOwnerBrowserProofLoadV1 = {
  artifact: OwnerBrowserProofResultV1 | null;
  artifact_rel: string | null;
};

export type ManufacturerRescueBrowserProofFreshnessV1 = {
  fresh: boolean;
  checked_at: string | null;
  age_days: number | "UNKNOWN";
  max_age_days: number;
  notes: string;
};

export type ManufacturerRescueOwnerBrowserProofEvidenceSummaryV1 = {
  filter_slug: string;
  artifact_rel: string | null;
  verdict: string | "MISSING";
  official_pass: boolean;
  checked_at: string | null;
  freshness: ManufacturerRescueBrowserProofFreshnessV1 | null;
  owner_proof_url_count: number;
  pass_url_count: number;
};

const OFFICIAL_PATH_TYPES = new Set([
  "official_manufacturer_pdp",
  "authorized_parts_distributor_pdp",
  "official_manufacturer_accessory_pdp",
]);

export function manufacturerRescueOwnerProofOfficialPassV1(
  artifact: OwnerBrowserProofResultV1 | null,
): boolean {
  if (!artifact || artifact.verdict !== "PASS_BROWSER_PROOF") return false;
  return (artifact.owner_proof_urls ?? []).some(
    (row) =>
      (row.browser_proof_status ?? "").trim() === "PASS" &&
      OFFICIAL_PATH_TYPES.has(row.path_type ?? ""),
  );
}

export function manufacturerRescueOwnerProofCheckedAtV1(
  artifact: OwnerBrowserProofResultV1 | null,
): string | null {
  const checked = (artifact as { checked_at?: string } | null)?.checked_at;
  return typeof checked === "string" && checked.trim() ? checked.trim() : null;
}

export function loadManufacturerRescueOwnerBrowserProofArtifactV1(args: {
  rootDir: string;
  filter_slug: string;
  fileExists: (abs: string) => boolean;
  readText: (abs: string) => string;
}): ManufacturerRescueOwnerBrowserProofLoadV1 {
  const slug = args.filter_slug.trim().toLowerCase();
  const rel = MANUFACTURER_RESCUE_OWNER_PROOF_REL_BY_SLUG_V1[slug] ?? null;
  if (!rel) return { artifact: null, artifact_rel: null };
  const abs = path.join(args.rootDir, rel);
  if (!args.fileExists(abs)) return { artifact: null, artifact_rel: rel };
  try {
    const artifact = JSON.parse(args.readText(abs)) as OwnerBrowserProofResultV1;
    if (artifact.contract !== FRIDGE_OWNER_BROWSER_PROOF_RESULT_CONTRACT_V1) {
      return { artifact: null, artifact_rel: rel };
    }
    return { artifact, artifact_rel: rel };
  } catch {
    return { artifact: null, artifact_rel: rel };
  }
}

export function assessManufacturerRescueBrowserProofFreshnessV1(args: {
  artifact: OwnerBrowserProofResultV1 | null;
  now?: () => Date;
  max_age_days?: number;
}): ManufacturerRescueBrowserProofFreshnessV1 {
  const maxAgeDays = args.max_age_days ?? MANUFACTURER_RESCUE_BROWSER_PROOF_MAX_AGE_DAYS_V1;
  const checkedAt = manufacturerRescueOwnerProofCheckedAtV1(args.artifact);
  if (!checkedAt) {
    return {
      fresh: false,
      checked_at: null,
      age_days: "UNKNOWN",
      max_age_days: maxAgeDays,
      notes: "checked_at missing on browser proof artifact",
    };
  }
  const now = args.now ?? (() => new Date());
  const ageMs = now().getTime() - Date.parse(checkedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return {
      fresh: false,
      checked_at: checkedAt,
      age_days: "UNKNOWN",
      max_age_days: maxAgeDays,
      notes: `invalid checked_at=${checkedAt}`,
    };
  }
  const ageDays = ageMs / 86_400_000;
  const fresh = ageDays <= maxAgeDays;
  return {
    fresh,
    checked_at: checkedAt,
    age_days: ageDays,
    max_age_days: maxAgeDays,
    notes: fresh
      ? `proof age ${ageDays.toFixed(1)}d within ${String(maxAgeDays)}d`
      : `proof stale checked_at=${checkedAt}`,
  };
}

export function summarizeManufacturerRescueOwnerBrowserProofEvidenceV1(args: {
  filter_slug: string;
  artifact: OwnerBrowserProofResultV1 | null;
  artifact_rel: string | null;
  now?: () => Date;
  max_age_days?: number;
}): ManufacturerRescueOwnerBrowserProofEvidenceSummaryV1 {
  const urls = args.artifact?.owner_proof_urls ?? [];
  const passUrlCount = urls.filter(
    (row) =>
      (row.browser_proof_status ?? "").trim() === "PASS" &&
      OFFICIAL_PATH_TYPES.has(row.path_type ?? ""),
  ).length;
  const officialPass = manufacturerRescueOwnerProofOfficialPassV1(args.artifact);
  return {
    filter_slug: args.filter_slug,
    artifact_rel: args.artifact_rel,
    verdict: args.artifact?.verdict ?? "MISSING",
    official_pass: officialPass,
    checked_at: manufacturerRescueOwnerProofCheckedAtV1(args.artifact),
    freshness: args.artifact
      ? assessManufacturerRescueBrowserProofFreshnessV1({
          artifact: args.artifact,
          now: args.now,
          max_age_days: args.max_age_days,
        })
      : null,
    owner_proof_url_count: urls.length,
    pass_url_count: passUrlCount,
  };
}

export function officialUrlFromManufacturerRescueOwnerProofV1(
  artifact: OwnerBrowserProofResultV1 | null,
): string | null {
  if (!artifact) return null;
  const pass = (artifact.owner_proof_urls ?? []).find(
    (row) =>
      (row.browser_proof_status ?? "").trim() === "PASS" &&
      OFFICIAL_PATH_TYPES.has(row.path_type ?? ""),
  );
  return pass?.url?.trim() || null;
}
