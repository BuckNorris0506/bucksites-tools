/**
 * Artifact provenance for Phase 0 reporting integrity.
 * BOUND_TO_SOURCE_COMMIT only when the git worktree is clean at generation time.
 */

import { spawnSync } from "node:child_process";

export type ArtifactProvenanceStatusV1 =
  | "BOUND_TO_SOURCE_COMMIT"
  | "DIRTY_WORKTREE"
  | "UNKNOWN";

export type ArtifactProvenanceV1 = {
  provenance_status: ArtifactProvenanceStatusV1;
  /** HEAD short sha at generation time (always attempted). */
  base_commit: string | "UNKNOWN";
  /**
   * Non-null only when provenance_status=BOUND_TO_SOURCE_COMMIT.
   * Dirty trees must not claim source_commit binding.
   */
  source_commit: string | null;
  worktree_clean: boolean | null;
};

function revParseShort(rootDir: string): string | "UNKNOWN" {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (r.status !== 0) return "UNKNOWN";
  const sha = String(r.stdout ?? "").trim();
  return sha || "UNKNOWN";
}

function isWorktreeClean(rootDir: string): boolean | null {
  const r = spawnSync("git", ["status", "--porcelain"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return String(r.stdout ?? "").trim().length === 0;
}

export function resolveArtifactProvenanceV1(args: {
  rootDir: string;
  /** Test override — do not use in production CLI paths. */
  worktreeClean?: boolean | null;
  baseCommit?: string | "UNKNOWN";
}): ArtifactProvenanceV1 {
  const base_commit = args.baseCommit ?? revParseShort(args.rootDir);
  const worktree_clean =
    args.worktreeClean !== undefined ? args.worktreeClean : isWorktreeClean(args.rootDir);

  if (worktree_clean === null || base_commit === "UNKNOWN") {
    return {
      provenance_status: "UNKNOWN",
      base_commit,
      source_commit: null,
      worktree_clean,
    };
  }

  if (worktree_clean === true) {
    return {
      provenance_status: "BOUND_TO_SOURCE_COMMIT",
      base_commit,
      source_commit: base_commit,
      worktree_clean: true,
    };
  }

  return {
    provenance_status: "DIRTY_WORKTREE",
    base_commit,
    source_commit: null,
    worktree_clean: false,
  };
}
