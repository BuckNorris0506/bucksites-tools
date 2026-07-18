/**
 * Complete fingerprint model for Phase 1 bounded validation.
 * Hashes paths + contents for tracked/porcelain/staged/untracked/ledger/
 * dispatch-runs/ignored/generated surfaces.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const BUCKPARTS_PHASE1_IGNORED_SURFACES_V1 = [
  ".next",
  "out",
  "build",
  "coverage",
  ".netlify",
] as const;

/** Explicit generated/evidence surfaces touched by Phase 1 validation commands. */
export const BUCKPARTS_PHASE1_GENERATED_SURFACES_V1 = [
  "data/command-center/execution-ledger-v1.json",
  "data/command-center/dispatch-runs",
  "data/ops/credit-control/credit-control-center-v1.json",
  "data/ops/credit-control/credit-control-center-v1.md",
  "data/reports",
  "data/ops/phase0-reporting-integrity",
] as const;

export type Phase1FingerprintV1 = {
  head: string;
  porcelain_sha: string;
  tracked_diff_sha: string;
  staged_diff_sha: string;
  untracked_paths_sha: string;
  untracked_content_sha: string;
  execution_ledger_sha: string;
  dispatch_runs_sha: string;
  ignored_surfaces_sha: string;
  generated_surfaces_sha: string;
  /** Per-surface digests for before/after printing. */
  surfaces: Record<string, string>;
};

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function sh(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/** Binary-safe git output (null bytes / binary deltas must not be decoded as UTF-8). */
function shBytes(cwd: string, args: string[]): Buffer {
  return execFileSync("git", args, { cwd, encoding: "buffer" });
}

function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function listFilesRecursive(absDir: string): string[] {
  if (!existsSync(absDir)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) out.push(abs);
    }
  };
  const st = statSync(absDir);
  if (st.isFile()) return [absDir];
  walk(absDir);
  return out.sort();
}

function hashPathTree(rootDir: string, rel: string): string {
  const abs = path.join(rootDir, rel);
  if (!existsSync(abs)) return sha256Text(`MISSING:${rel}`);
  const files = listFilesRecursive(abs);
  const lines = files.map((f) => {
    const relPath = path.relative(rootDir, f).split(path.sep).join("/");
    return `${sha256File(f)} ${relPath}`;
  });
  return sha256Text(lines.join("\n"));
}

export function buildPhase1FingerprintV1(rootDir: string): Phase1FingerprintV1 {
  const porcelain = sh(rootDir, ["status", "--porcelain=v1"]);
  // Binary-safe: include binary file deltas (git diff --binary).
  const tracked = shBytes(rootDir, ["diff", "--binary", "HEAD"]);
  const staged = shBytes(rootDir, ["diff", "--cached", "--binary", "HEAD"]);
  const untrackedPaths = sh(rootDir, ["ls-files", "--others", "--exclude-standard"]);
  const untrackedContentLines: string[] = [];
  for (const rel of untrackedPaths.split("\n").filter(Boolean).sort()) {
    const abs = path.join(rootDir, rel);
    if (existsSync(abs) && statSync(abs).isFile()) {
      untrackedContentLines.push(`${sha256File(abs)} ${rel}`);
    } else {
      untrackedContentLines.push(`DIR ${rel}`);
    }
  }

  const surfaces: Record<string, string> = {
    porcelain: sha256Text(porcelain),
    tracked_diff: sha256Bytes(tracked),
    staged_diff: sha256Bytes(staged),
    untracked_paths: sha256Text(untrackedPaths),
    untracked_content: sha256Text(untrackedContentLines.join("\n")),
    execution_ledger: hashPathTree(rootDir, "data/command-center/execution-ledger-v1.json"),
    dispatch_runs: hashPathTree(rootDir, "data/command-center/dispatch-runs"),
  };

  for (const rel of BUCKPARTS_PHASE1_IGNORED_SURFACES_V1) {
    surfaces[`ignored:${rel}`] = hashPathTree(rootDir, rel);
  }
  for (const rel of BUCKPARTS_PHASE1_GENERATED_SURFACES_V1) {
    surfaces[`generated:${rel}`] = hashPathTree(rootDir, rel);
  }

  const ignored_surfaces_sha = sha256Text(
    BUCKPARTS_PHASE1_IGNORED_SURFACES_V1.map((r) => `${r}=${surfaces[`ignored:${r}`]}`).join("\n"),
  );
  const generated_surfaces_sha = sha256Text(
    BUCKPARTS_PHASE1_GENERATED_SURFACES_V1.map((r) => `${r}=${surfaces[`generated:${r}`]}`).join(
      "\n",
    ),
  );

  return {
    head: sh(rootDir, ["rev-parse", "HEAD"]).trim(),
    porcelain_sha: surfaces.porcelain!,
    tracked_diff_sha: surfaces.tracked_diff!,
    staged_diff_sha: surfaces.staged_diff!,
    untracked_paths_sha: surfaces.untracked_paths!,
    untracked_content_sha: surfaces.untracked_content!,
    execution_ledger_sha: surfaces.execution_ledger!,
    dispatch_runs_sha: surfaces.dispatch_runs!,
    ignored_surfaces_sha,
    generated_surfaces_sha,
    surfaces,
  };
}

export function comparePhase1FingerprintsV1(
  before: Phase1FingerprintV1,
  after: Phase1FingerprintV1,
): { unchanged: boolean; changed_keys: string[] } {
  const keys = new Set([...Object.keys(before.surfaces), ...Object.keys(after.surfaces)]);
  const changed_keys: string[] = [];
  for (const k of [...keys].sort()) {
    if (before.surfaces[k] !== after.surfaces[k]) changed_keys.push(k);
  }
  if (before.head !== after.head) changed_keys.push("head");
  return { unchanged: changed_keys.length === 0, changed_keys };
}

export function formatPhase1FingerprintSurfacesV1(fp: Phase1FingerprintV1): string {
  return Object.keys(fp.surfaces)
    .sort()
    .map((k) => `${k}=${fp.surfaces[k]}`)
    .join("\n");
}
