/**
 * Merge Exa fridge-water discovery artifacts into Large Batch Coverage Factory (read-only).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1,
  type ExaFridgeWaterDiscoveryCandidateV1,
  type ExaFridgeWaterDiscoveryCandidatesFileV1,
  type ExaFridgeWaterDiscoveryManifestV1,
} from "@/lib/discovery/exa-fridge-water-discovery-v1";
import type {
  LargeBatchCoverageCandidateV1,
  LargeBatchCoverageFactoryStateV1,
} from "@/lib/coverage/large-batch-coverage-factory-v1";

export const EXA_DISCOVERY_MANIFEST_REL_PATH_V1 = "data/discovery/exa/fridge-water/manifest.v1.json";

export type ExaFridgeWaterDiscoverySourceSummaryV1 = {
  status: "PROVEN" | "MISSING" | "EMPTY";
  path: string | null;
  manifest_path: string;
  run_id: string | null;
  row_count: number;
  merged_into_factory_count: number;
  evidence_needed_count: number;
  blocked_count: number;
  omitted_live_slug_count: number;
};

export type LoadExaDiscoveryForFactoryResultV1 = {
  manifest: ExaFridgeWaterDiscoveryManifestV1 | null;
  candidates: ExaFridgeWaterDiscoveryCandidateV1[];
  source_summary: ExaFridgeWaterDiscoverySourceSummaryV1;
};

function defaultReadText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function defaultFileExists(absolutePath: string): boolean {
  return existsSync(absolutePath);
}

function toFactoryCandidate(
  row: ExaFridgeWaterDiscoveryCandidateV1,
  candidatesPath: string,
): LargeBatchCoverageCandidateV1 {
  const slug = row.candidate_slug!;
  const factory_state: LargeBatchCoverageFactoryStateV1 = row.recommended_factory_state;
  const priority_score = factory_state === "evidence_needed" ? 640 : 0;
  return {
    candidate_key: `exa:${slug}`,
    slug,
    oem_part_number: row.candidate_oem_part_number ?? slug.toUpperCase(),
    brand_slug: row.brand_guess === "unknown" ? null : row.brand_guess,
    factory_state,
    priority_score,
    block_reason: row.recommended_block_reason,
    rationale: [
      `PROVEN: Exa discovery row from ${candidatesPath}.`,
      `PROVEN: evidence_tier=${row.evidence_tier}; source_type=${row.source_type}.`,
      `PROVEN: query=${row.query}.`,
      ...(row.rejection_flags.length > 0
        ? [`PROVEN: rejection_flags=${row.rejection_flags.join(",")}.`]
        : []),
      "INFERRED: Exa snippets are discovery only — not compatibility proof.",
    ],
    sources: [candidatesPath, row.discovered_url],
    is_live_catalog_row: false,
    is_bulk_catalog_row: false,
    has_gated_buyable_link: false,
    has_search_placeholder_only_links: false,
    waterdrop_recommended: false,
    has_amazon_live_evidence: false,
  };
}

export function loadExaDiscoveryForFactoryV1(
  rootDir: string,
  deps?: {
    readTextFile?: (p: string) => string;
    fileExists?: (p: string) => boolean;
  },
): LoadExaDiscoveryForFactoryResultV1 {
  const readTextFile = deps?.readTextFile ?? defaultReadText;
  const fileExists = deps?.fileExists ?? defaultFileExists;
  const manifestPath = path.join(rootDir, EXA_DISCOVERY_MANIFEST_REL_PATH_V1);

  const emptySummary = (status: ExaFridgeWaterDiscoverySourceSummaryV1["status"]): ExaFridgeWaterDiscoverySourceSummaryV1 => ({
    status,
    path: null,
    manifest_path: EXA_DISCOVERY_MANIFEST_REL_PATH_V1,
    run_id: null,
    row_count: 0,
    merged_into_factory_count: 0,
    evidence_needed_count: 0,
    blocked_count: 0,
    omitted_live_slug_count: 0,
  });

  if (!fileExists(manifestPath)) {
    return { manifest: null, candidates: [], source_summary: emptySummary("MISSING") };
  }

  let manifest: ExaFridgeWaterDiscoveryManifestV1;
  try {
    manifest = JSON.parse(readTextFile(manifestPath)) as ExaFridgeWaterDiscoveryManifestV1;
  } catch {
    return { manifest: null, candidates: [], source_summary: emptySummary("MISSING") };
  }

  if (manifest.contract !== EXA_FRIDGE_WATER_MANIFEST_CONTRACT_V1) {
    return { manifest: null, candidates: [], source_summary: emptySummary("MISSING") };
  }

  const candidatesPath = path.join(rootDir, manifest.latest_candidates_path);
  if (!fileExists(candidatesPath)) {
    return { manifest, candidates: [], source_summary: emptySummary("EMPTY") };
  }

  let file: ExaFridgeWaterDiscoveryCandidatesFileV1;
  try {
    file = JSON.parse(readTextFile(candidatesPath)) as ExaFridgeWaterDiscoveryCandidatesFileV1;
  } catch {
    return { manifest, candidates: [], source_summary: emptySummary("EMPTY") };
  }

  const candidates = file.candidates ?? [];
  const relPath = path.relative(rootDir, candidatesPath).replace(/\\/g, "/");
  const merged = candidates.filter((c) => !c.omit_from_factory_merge && c.candidate_slug);
  const omitted_live = candidates.filter((c) => c.rejection_flags.includes("live_slug_exists")).length;

  return {
    manifest,
    candidates,
    source_summary: {
      status: candidates.length > 0 ? "PROVEN" : "EMPTY",
      path: relPath,
      manifest_path: EXA_DISCOVERY_MANIFEST_REL_PATH_V1,
      run_id: manifest.latest_run_id,
      row_count: candidates.length,
      merged_into_factory_count: merged.length,
      evidence_needed_count: merged.filter((c) => c.recommended_factory_state === "evidence_needed")
        .length,
      blocked_count: merged.filter((c) => c.recommended_factory_state === "blocked_do_not_publish")
        .length,
      omitted_live_slug_count: omitted_live,
    },
  };
}

export function buildExaDiscoveryFactoryCandidatesV1(
  loadResult: LoadExaDiscoveryForFactoryResultV1,
  rootDir: string,
): LargeBatchCoverageCandidateV1[] {
  const candidatesPath = loadResult.source_summary.path
    ? path.join(rootDir, loadResult.source_summary.path)
    : "data/discovery/exa/fridge-water/candidates.json";
  const rel = path.relative(rootDir, candidatesPath).replace(/\\/g, "/");

  return loadResult.candidates
    .filter((c) => !c.omit_from_factory_merge && c.candidate_slug)
    .map((c) => toFactoryCandidate(c, rel));
}
