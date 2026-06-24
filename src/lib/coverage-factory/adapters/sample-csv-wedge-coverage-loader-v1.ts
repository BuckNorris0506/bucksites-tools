/**
 * Shared read-only loader for sample-only wedge CSV artifacts (no batch-production lanes).
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { CoverageProvenanceRefV1 } from "../coverage-provenance-ref-v1";

export const SAMPLE_CSV_FILTER_ARTIFACT_CONTRACT_V1 = "sample_csv_filter_row_v1" as const;
export const SAMPLE_CSV_MODEL_ARTIFACT_CONTRACT_V1 = "sample_csv_model_row_v1" as const;
export const SAMPLE_CSV_COMPATIBILITY_ARTIFACT_CONTRACT_V1 =
  "sample_csv_compatibility_mapping_row_v1" as const;
export const SAMPLE_CSV_RETAILER_LINK_ARTIFACT_CONTRACT_V1 =
  "sample_csv_retailer_link_row_v1" as const;

export type SampleCsvFilterRowV1 = {
  contract: typeof SAMPLE_CSV_FILTER_ARTIFACT_CONTRACT_V1;
  brand_slug: string;
  slug: string;
  oem_part_number: string;
  name: string;
  replacement_interval_months: string | null;
  notes: string | null;
};

export type SampleCsvModelRowV1 = {
  contract: typeof SAMPLE_CSV_MODEL_ARTIFACT_CONTRACT_V1;
  brand_slug: string;
  slug: string;
  model_number: string;
  title: string;
  series: string | null;
  notes: string | null;
};

export type SampleCsvCompatibilityRowV1 = {
  contract: typeof SAMPLE_CSV_COMPATIBILITY_ARTIFACT_CONTRACT_V1;
  model_slug: string;
  filter_slug: string;
};

export type SampleCsvRetailerLinkRowV1 = {
  contract: typeof SAMPLE_CSV_RETAILER_LINK_ARTIFACT_CONTRACT_V1;
  filter_slug: string;
  retailer_name: string;
  affiliate_url: string;
  is_primary: string;
  retailer_key: string;
};

export type SampleCsvWedgeBundleV1 = {
  wedge_data_dir_rel: string;
  filters: SampleCsvFilterRowV1[];
  models: SampleCsvModelRowV1[];
  compatibility_mappings: SampleCsvCompatibilityRowV1[];
  retailer_links: SampleCsvRetailerLinkRowV1[];
  source_artifact_paths: string[];
};

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (header) row[header] = values[index] ?? "";
    }
    return row;
  });
}

function readCsvIfExists(rootDir: string, relPath: string): Record<string, string>[] {
  const absolutePath = path.join(rootDir, relPath);
  if (!existsSync(absolutePath)) return [];
  return parseCsvRows(readFileSync(absolutePath, "utf8"));
}

export function artifactHashRefFromPath(
  rootDir: string,
  relPath: string,
): CoverageProvenanceRefV1 | null {
  const absolutePath = path.join(rootDir, relPath);
  if (!existsSync(absolutePath)) return null;
  const content = readFileSync(absolutePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex");
  return { kind: "artifact_path_hash", label: relPath, hash: `sha256:${hash}` };
}

export function loadSampleCsvWedgeBundleV1(args: {
  rootDir: string;
  wedgeDataDirRel: string;
}): SampleCsvWedgeBundleV1 {
  const filtersPath = `${args.wedgeDataDirRel}/filters.sample.csv`;
  const modelsPath = `${args.wedgeDataDirRel}/models.sample.csv`;
  const compatibilityPath = `${args.wedgeDataDirRel}/compatibility_mappings.sample.csv`;
  const retailerLinksPath = `${args.wedgeDataDirRel}/retailer_links.sample.csv`;

  const filters = readCsvIfExists(args.rootDir, filtersPath).map((row) => ({
    contract: SAMPLE_CSV_FILTER_ARTIFACT_CONTRACT_V1,
    brand_slug: row.brand_slug ?? "",
    slug: row.slug ?? "",
    oem_part_number: row.oem_part_number ?? "",
    name: row.name ?? "",
    replacement_interval_months: row.replacement_interval_months?.trim()
      ? row.replacement_interval_months
      : null,
    notes: row.notes?.trim() ? row.notes : null,
  }));

  const models = readCsvIfExists(args.rootDir, modelsPath).map((row) => ({
    contract: SAMPLE_CSV_MODEL_ARTIFACT_CONTRACT_V1,
    brand_slug: row.brand_slug ?? "",
    slug: row.slug ?? "",
    model_number: row.model_number ?? "",
    title: row.title ?? "",
    series: row.series?.trim() ? row.series : null,
    notes: row.notes?.trim() ? row.notes : null,
  }));

  const compatibility_mappings = readCsvIfExists(args.rootDir, compatibilityPath).map((row) => ({
    contract: SAMPLE_CSV_COMPATIBILITY_ARTIFACT_CONTRACT_V1,
    model_slug: row.model_slug ?? "",
    filter_slug: row.filter_slug ?? "",
  }));

  const retailer_links = readCsvIfExists(args.rootDir, retailerLinksPath).map((row) => ({
    contract: SAMPLE_CSV_RETAILER_LINK_ARTIFACT_CONTRACT_V1,
    filter_slug: row.filter_slug ?? "",
    retailer_name: row.retailer_name ?? "",
    affiliate_url: row.affiliate_url ?? "",
    is_primary: row.is_primary ?? "",
    retailer_key: row.retailer_key ?? "",
  }));

  const source_artifact_paths = [filtersPath, modelsPath, compatibilityPath, retailerLinksPath].filter(
    (relPath) => existsSync(path.join(args.rootDir, relPath)),
  );

  return {
    wedge_data_dir_rel: args.wedgeDataDirRel,
    filters,
    models,
    compatibility_mappings,
    retailer_links,
    source_artifact_paths,
  };
}

export function retailerLinkIsDemoUnverified(link: SampleCsvRetailerLinkRowV1): boolean {
  return (
    link.affiliate_url.includes("example.com") ||
    link.retailer_name.toLowerCase().includes("example") ||
    link.retailer_key.includes("example")
  );
}
