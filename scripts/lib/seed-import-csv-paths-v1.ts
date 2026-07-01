/**
 * Repo-relative CSV paths for seed import gates (fridge + vertical catalogs).
 */

import fs from "node:fs";
import path from "node:path";

import type { HomekeepWedgeCatalog } from "@/lib/catalog/identity";
import { HOMEKEEP_WEDGE_CATALOG } from "@/lib/catalog/identity";
import { categoryDataCsvPath, dataCsvPath } from "./csv";
import { normalizeRepoRelPathV1 } from "./buckparts-io-capabilities-v1";

export type VerticalSeedKeyV1 = Exclude<HomekeepWedgeCatalog, "refrigerator_water">;

const VERTICAL_DATA_DIR: Record<VerticalSeedKeyV1, string> = {
  [HOMEKEEP_WEDGE_CATALOG.air_purifier]: "air-purifier",
  [HOMEKEEP_WEDGE_CATALOG.vacuum]: "vacuum",
  [HOMEKEEP_WEDGE_CATALOG.humidifier]: "humidifier",
  [HOMEKEEP_WEDGE_CATALOG.appliance_air]: "appliance-air",
  [HOMEKEEP_WEDGE_CATALOG.whole_house_water]: "whole-house-water",
};

const FRIDGE_REQUIRED_BASES = [
  "brands",
  "filters",
  "fridge_models",
  "compatibility_mappings",
  "retailer_links",
] as const;

const FRIDGE_OPTIONAL_BASES = ["fridge_model_aliases", "filter_aliases"] as const;

const VERTICAL_REQUIRED_BASES = [
  "brands",
  "filters",
  "models",
  "compatibility_mappings",
  "retailer_links",
] as const;

const VERTICAL_OPTIONAL_BASES = ["model_aliases", "filter_aliases"] as const;

function toRepoRel(rootDir: string, absPath: string): string {
  return normalizeRepoRelPathV1(absPath, rootDir);
}

export function importSeedCsvRelPathsV1(args: {
  rootDir: string;
  useSample: boolean;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const exists = args.fileExists ?? fs.existsSync;
  const paths: string[] = [];
  for (const base of FRIDGE_REQUIRED_BASES) {
    paths.push(toRepoRel(args.rootDir, dataCsvPath(args.rootDir, base, args.useSample)));
  }
  for (const base of FRIDGE_OPTIONAL_BASES) {
    const abs = dataCsvPath(args.rootDir, base, args.useSample);
    if (exists(abs)) {
      paths.push(toRepoRel(args.rootDir, abs));
    }
  }
  return paths;
}

export function verticalSeedCsvRelPathsV1(args: {
  rootDir: string;
  verticalKey: VerticalSeedKeyV1;
  useSample: boolean;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const exists = args.fileExists ?? fs.existsSync;
  const dataDir = VERTICAL_DATA_DIR[args.verticalKey];
  const paths: string[] = [];
  for (const base of VERTICAL_REQUIRED_BASES) {
    paths.push(
      toRepoRel(args.rootDir, categoryDataCsvPath(args.rootDir, dataDir, base, args.useSample)),
    );
  }
  for (const base of VERTICAL_OPTIONAL_BASES) {
    const abs = categoryDataCsvPath(args.rootDir, dataDir, base, args.useSample);
    if (exists(abs)) {
      paths.push(toRepoRel(args.rootDir, abs));
    }
  }
  return paths;
}

export function verticalSeedDataDirV1(verticalKey: VerticalSeedKeyV1): string {
  return VERTICAL_DATA_DIR[verticalKey];
}
