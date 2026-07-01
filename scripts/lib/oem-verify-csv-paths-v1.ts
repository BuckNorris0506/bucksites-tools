/**
 * Repo-relative retailer_links CSV paths loaded by OEM verify Playwright runs.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { normalizeRepoRelPathV1 } from "./buckparts-io-capabilities-v1";

export type OemVerifyWedgeFlagsV1 = {
  fridgeOnly: boolean;
  airOnly: boolean;
  vacuumOnly: boolean;
  humidifierOnly: boolean;
  applianceAirOnly: boolean;
  wholeHouseWaterOnly: boolean;
  csvPath: string | null;
};

const FRIDGE_CSV_REL = "data/retailer_links.csv";
const AIR_CSV_REL = "data/air-purifier/retailer_links.csv";
const VACUUM_CSV_REL = "data/vacuum/retailer_links.csv";
const HUMIDIFIER_CSV_REL = "data/humidifier/retailer_links.csv";
const APPLIANCE_AIR_CSV_REL = "data/appliance-air/retailer_links.csv";
const WHOLE_HOUSE_WATER_CSV_REL = "data/whole-house-water/retailer_links.csv";

export function isRepoRelativeHashableCsvPathV1(args: {
  relOrAbs: string;
  rootDir: string;
  fileExists?: (abs: string) => boolean;
}): boolean {
  const rel = normalizeRepoRelPathV1(args.relOrAbs, args.rootDir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const exists = args.fileExists ?? ((abs) => existsSync(abs));
  return exists(path.join(args.rootDir, rel));
}

export function oemVerifyCsvRelPathsV1(args: {
  rootDir: string;
  flags: OemVerifyWedgeFlagsV1;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const fileExists = args.fileExists ?? ((abs) => existsSync(abs));

  if (args.flags.csvPath) {
    if (
      isRepoRelativeHashableCsvPathV1({
        relOrAbs: args.flags.csvPath,
        rootDir: args.rootDir,
        fileExists,
      })
    ) {
      return [normalizeRepoRelPathV1(args.flags.csvPath, args.rootDir)];
    }
    return [];
  }

  const rels: string[] = [];
  const f = args.flags;

  if (!f.airOnly && !f.vacuumOnly && !f.humidifierOnly && !f.applianceAirOnly && !f.wholeHouseWaterOnly) {
    rels.push(FRIDGE_CSV_REL);
  }
  if (!f.fridgeOnly && !f.vacuumOnly && !f.humidifierOnly && !f.applianceAirOnly && !f.wholeHouseWaterOnly) {
    rels.push(AIR_CSV_REL);
  }
  if (!f.fridgeOnly && !f.airOnly && !f.humidifierOnly && !f.applianceAirOnly && !f.wholeHouseWaterOnly) {
    rels.push(VACUUM_CSV_REL);
  }
  if (!f.fridgeOnly && !f.airOnly && !f.vacuumOnly && !f.applianceAirOnly && !f.wholeHouseWaterOnly) {
    rels.push(HUMIDIFIER_CSV_REL);
  }
  if (!f.fridgeOnly && !f.airOnly && !f.vacuumOnly && !f.humidifierOnly && !f.wholeHouseWaterOnly) {
    rels.push(APPLIANCE_AIR_CSV_REL);
  }
  if (!f.fridgeOnly && !f.airOnly && !f.vacuumOnly && !f.humidifierOnly && !f.applianceAirOnly) {
    rels.push(WHOLE_HOUSE_WATER_CSV_REL);
  }

  return rels.filter((rel) =>
    isRepoRelativeHashableCsvPathV1({
      relOrAbs: rel,
      rootDir: args.rootDir,
      fileExists,
    }),
  );
}
