/**
 * Load-only helpers for WHW director model-first batch artifacts (no director import).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ModelFirstEvidenceRowStatusV1 } from "./air-purifier-model-first-evidence-result-v1";
import { WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1 } from "./whole-house-water-model-first-evidence-result-v1";

export const WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1 =
  "whole_house_water_director_model_first_batch_v1" as const;

export const WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1 =
  `${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/whw-director-model-first-batch-v1.results.json` as const;

export type WhwDirectorModelFirstBatchParkedSnapshotV1 = {
  contract: typeof WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  director_batch_cycle_sealed?: boolean;
  parked_filter_slugs: string[];
  filters_checked: Array<{ filter_slug: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAllowedWhwDirectorModelFirstBatchRelPathV1(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${WHW_MODEL_FIRST_EVIDENCE_RESULTS_DIR_REL_V1}/`)) return false;
  if (!normalized.endsWith(".results.json")) return false;
  if (normalized.includes("..")) return false;
  return true;
}

export function loadWhwDirectorModelFirstBatchParkedSnapshotV1(args: {
  rootDir: string;
  relPath?: string;
}): WhwDirectorModelFirstBatchParkedSnapshotV1 | null {
  const rel = args.relPath ?? WHW_DIRECTOR_MODEL_FIRST_BATCH_V1_RESULT_REL_V1;
  if (!isAllowedWhwDirectorModelFirstBatchRelPathV1(rel)) return null;
  const abs = path.join(args.rootDir, rel);
  if (!existsSync(abs)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(abs, "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.contract !== WHW_DIRECTOR_MODEL_FIRST_BATCH_CONTRACT_V1) return null;
    if (parsed.read_only !== true || parsed.data_mutation !== false) return null;
    if (!Array.isArray(parsed.parked_filter_slugs)) return null;
    if (!Array.isArray(parsed.filters_checked)) return null;
    return parsed as WhwDirectorModelFirstBatchParkedSnapshotV1;
  } catch {
    return null;
  }
}

export function directorModelFirstBatchParkedFilterSlugsV1(args: {
  rootDir: string;
}): Set<string> {
  const batch = loadWhwDirectorModelFirstBatchParkedSnapshotV1({ rootDir: args.rootDir });
  if (!batch) return new Set();
  return new Set(batch.parked_filter_slugs.map((slug) => slug.trim().toLowerCase()));
}

/** Committed --write artifact sealed the director model-first batch cycle. */
export function whwDirectorModelFirstBatchCycleCompleteV1(args: {
  rootDir: string;
}): boolean {
  const batch = loadWhwDirectorModelFirstBatchParkedSnapshotV1({ rootDir: args.rootDir });
  return batch?.director_batch_cycle_sealed === true;
}

export type WhwDirectorModelFirstBatchEvidenceCountsV1 = Record<
  ModelFirstEvidenceRowStatusV1,
  number
>;
