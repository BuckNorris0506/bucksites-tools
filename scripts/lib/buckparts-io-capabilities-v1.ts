/**
 * BuckParts IO capabilities v1 — hard boundary between index reads and domain mutation.
 * READ_INDEX cannot write protected paths (CSV, evidence, owner decisions, UI, Supabase artifacts).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const BUCKPARTS_IO_CAPABILITIES_CONTRACT_V1 = "buckparts_io_capabilities_v1" as const;

export type BuckpartsIoCapabilityV1 = "READ_INDEX" | "MUTATION";

export class BuckpartsProtectedPathWriteError extends Error {
  readonly capability: BuckpartsIoCapabilityV1;
  readonly rel_path: string;

  constructor(capability: BuckpartsIoCapabilityV1, relPath: string) {
    super(
      `BuckpartsProtectedPathWriteError: capability=${capability} cannot write protected path ${relPath}`,
    );
    this.name = "BuckpartsProtectedPathWriteError";
    this.capability = capability;
    this.rel_path = relPath;
  }
}

const PROTECTED_REL_PREFIXES_V1 = [
  "data/retailer_links.csv",
  "data/evidence/",
  "data/owner-decisions/",
  "src/",
  "data/filters.csv",
  "data/compatibility_mappings.csv",
  "data/fridge_models.csv",
  "data/air-purifier/retailer_links.csv",
  "data/whole-house-water/retailer_links.csv",
  "data/vacuum/retailer_links.csv",
  "data/humidifier/retailer_links.csv",
  "data/appliance-air/retailer_links.csv",
] as const;

export function normalizeRepoRelPathV1(absOrRel: string, rootDir: string): string {
  const normalized = absOrRel.replace(/\\/g, "/");
  const root = rootDir.replace(/\\/g, "/").replace(/\/$/, "");
  if (normalized.startsWith(`${root}/`)) {
    return normalized.slice(root.length + 1);
  }
  return normalized.replace(/^\.\//, "");
}

export function isProtectedMutationRelPathV1(relPath: string): boolean {
  const rel = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  for (const prefix of PROTECTED_REL_PREFIXES_V1) {
    if (rel === prefix || rel.startsWith(prefix)) return true;
  }
  if (rel.includes("/retailer_links.csv")) return true;
  if (rel.includes("supabase") && rel.endsWith(".sql")) return true;
  return false;
}

export function assertWriteAllowedForCapabilityV1(args: {
  capability: BuckpartsIoCapabilityV1;
  relPath: string;
  rootDir: string;
}): void {
  if (args.capability === "MUTATION") return;
  const rel = normalizeRepoRelPathV1(args.relPath, args.rootDir);
  if (isProtectedMutationRelPathV1(rel)) {
    throw new BuckpartsProtectedPathWriteError(args.capability, rel);
  }
}

export type BuckpartsRepoIoV1 = {
  capability: BuckpartsIoCapabilityV1;
  rootDir: string;
  readText: (relPath: string) => string;
  writeText: (relPath: string, content: string) => void;
  fileExists: (relPath: string) => boolean;
};

export function createRepoIoV1(args: {
  rootDir: string;
  capability: BuckpartsIoCapabilityV1;
}): BuckpartsRepoIoV1 {
  const rootDir = path.resolve(args.rootDir);
  return {
    capability: args.capability,
    rootDir,
    fileExists(relPath: string) {
      return existsSync(path.join(rootDir, relPath));
    },
    readText(relPath: string) {
      return readFileSync(path.join(rootDir, relPath), "utf8");
    },
    writeText(relPath: string, content: string) {
      assertWriteAllowedForCapabilityV1({
        capability: args.capability,
        relPath,
        rootDir,
      });
      const abs = path.join(rootDir, relPath);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
    },
  };
}

export function requireMutationCapabilityV1(io: BuckpartsRepoIoV1): void {
  if (io.capability !== "MUTATION") {
    throw new Error(
      `Mutation requires MUTATION capability; got ${io.capability}`,
    );
  }
}
