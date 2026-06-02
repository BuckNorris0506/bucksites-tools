/**
 * BuckParts ship guard — consolidated pre-commit/pre-push read-only guard proof.
 *
 * Safe by default (dry-run JSON). Does not commit, push, deploy, or mutate protected paths.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const BUCKPARTS_SHIP_GUARD_CONTRACT_V1 = "buckparts_ship_guard_v1" as const;
export const BUCKPARTS_SHIP_GUARD_COMMAND_V1 = "npm run buckparts:ship-guard" as const;
export const PROTECTED_RETAILER_LINKS_CSV_REL = "data/retailer_links.csv" as const;

export type ShipGuardModeV1 = "dry_run" | "commit" | "push";

export type ShipGuardGitProviderV1 = {
  revParseHead: () => string | null;
  revParseOriginMain: () => string | null;
  currentBranch: () => string | null;
  commitsAheadOfOriginMain: () => number | "UNKNOWN";
  filesChangedAheadOfOriginMain: () => string[];
  filesChangedWorkingTree: () => string[];
  filesStaged: () => string[];
  filesUntracked: () => string[];
  /** True when `git diff --quiet HEAD -- path` reports a diff (exit 1). */
  pathHasDiffWorkingTreeVsHead: (filePath: string) => boolean | "UNKNOWN";
  /** True when `git diff --quiet origin/main..HEAD -- path` reports a diff (exit 1). */
  pathHasDiffHeadVsOriginMain: (filePath: string) => boolean | "UNKNOWN";
  /** Informational hash only — not used for drift blockers. */
  showBlobHashAtRef: (ref: string, filePath: string) => string | null;
};

export type NetlifyIgnoreDryRunResultV1 = {
  available: boolean;
  per_file: Array<{
    path: string;
    classification: "SKIP_BUILD" | "TRIGGER_BUILD" | "UNKNOWN";
    exit_code: number | null;
  }>;
  aggregate: "SKIP_BUILD" | "TRIGGER_BUILD" | "MIXED" | "UNKNOWN";
  stderr_sample: string | null;
};

export type ProtectedRetailerLinksCheckV1 = {
  path: typeof PROTECTED_RETAILER_LINKS_CSV_REL;
  /** Git truth for drift blockers (matches `git diff`). */
  git_diff_working_tree_vs_head: boolean | "UNKNOWN";
  git_diff_head_vs_origin_main: boolean | "UNKNOWN";
  listed_in_changed_files: boolean;
  /** Informational only — hash mismatch does not imply drift when git diff is empty. */
  hash_check: {
    origin_main_blob_sha256: string | null;
    head_blob_sha256: string | null;
    working_tree_file_sha256: string | null;
    working_tree_hash_differs_from_head_blob: boolean | "UNKNOWN";
    working_tree_hash_differs_from_origin_main_blob: boolean | "UNKNOWN";
  };
};

export type ShipGuardReportV1 = {
  contract: typeof BUCKPARTS_SHIP_GUARD_CONTRACT_V1;
  mode: ShipGuardModeV1;
  read_only: true;
  data_mutation: false;
  deploy_authorized: false;
  netlify_api_authorized: false;
  push_authorized: false;
  commit_authorized: false;
  supabase_mutation_authorized: false;
  evidence_write_authorized: false;
  buckparts_verified_link_authorized: false;
  /** Stable compact jq fields */
  current_head: string | null;
  origin_main: string | null;
  commits_ahead: number | "UNKNOWN";
  changed_files: string[];
  protected_file_checks: {
    retailer_links_csv: ProtectedRetailerLinksCheckV1;
  };
  push_assessment: "SAFE" | "BLOCKED" | "UNKNOWN";
  blockers: string[];
  recommended_validations: string[];
  git: {
    head: string | null;
    origin_main: string | null;
    branch: string | null;
    commits_ahead_of_origin_main: number | "UNKNOWN";
    files_changed_ahead_of_origin_main: string[];
    files_changed_working_tree: string[];
    files_staged: string[];
  };
  protected_retailer_links_csv: ProtectedRetailerLinksCheckV1;
  netlify_ignore_dry_run: NetlifyIgnoreDryRunResultV1;
  recommended_validation_commands: string[];
  validation_results: Array<{ command: string; ok: boolean; exit_code: number | null }>;
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

function sha256File(absPath: string): string | null {
  if (!existsSync(absPath)) return null;
  try {
    const buf = readFileSync(absPath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function uniqueSorted(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean))).sort();
}

function gitDiffQuietHasDiff(
  rootDir: string,
  diffArgs: string[],
  filePath: string,
): boolean | "UNKNOWN" {
  const r = spawnSync("git", ["diff", "--quiet", ...diffArgs, "--", filePath], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (r.status === 0) return false;
  if (r.status === 1) return true;
  return "UNKNOWN";
}

export function defaultShipGuardGitProvider(rootDir: string): ShipGuardGitProviderV1 {
  const run = (args: string[]): { ok: boolean; out: string; status: number | null } => {
    const r = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
    return { ok: r.status === 0, out: String(r.stdout ?? "").trimEnd(), status: r.status };
  };

  return {
    revParseHead: () => {
      const r = run(["rev-parse", "HEAD"]);
      return r.ok ? r.out : null;
    },
    revParseOriginMain: () => {
      const r = run(["rev-parse", "origin/main"]);
      return r.ok ? r.out : null;
    },
    currentBranch: () => {
      const r = run(["rev-parse", "--abbrev-ref", "HEAD"]);
      return r.ok ? r.out : null;
    },
    commitsAheadOfOriginMain: () => {
      const r = run(["rev-list", "--count", "origin/main..HEAD"]);
      if (!r.ok) return "UNKNOWN";
      const n = Number.parseInt(r.out, 10);
      return Number.isFinite(n) ? n : "UNKNOWN";
    },
    filesChangedAheadOfOriginMain: () => {
      const r = run(["diff", "--name-only", "origin/main...HEAD"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    filesChangedWorkingTree: () => {
      const r = run(["diff", "--name-only", "HEAD"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    filesStaged: () => {
      const r = run(["diff", "--cached", "--name-only", "HEAD"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    filesUntracked: () => {
      const r = run(["ls-files", "--others", "--exclude-standard"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    pathHasDiffWorkingTreeVsHead: (filePath: string) =>
      gitDiffQuietHasDiff(rootDir, ["HEAD"], filePath),
    pathHasDiffHeadVsOriginMain: (filePath: string) =>
      gitDiffQuietHasDiff(rootDir, ["origin/main..HEAD"], filePath),
    showBlobHashAtRef: (ref: string, filePath: string) => {
      const r = run(["show", `${ref}:${filePath}`]);
      if (!r.ok) return null;
      return sha256Text(r.out);
    },
  };
}

export function classifyNetlifyIgnoreDryRun(args: {
  rootDir: string;
  changedFiles: string[];
  scriptRel?: string;
}): NetlifyIgnoreDryRunResultV1 {
  const scriptRel = args.scriptRel ?? "scripts/netlify-ignore-build.sh";
  const scriptAbs = path.join(args.rootDir, scriptRel);
  if (!existsSync(scriptAbs) || args.changedFiles.length === 0) {
    return {
      available: false,
      per_file: [],
      aggregate: "UNKNOWN",
      stderr_sample: null,
    };
  }

  const per_file: NetlifyIgnoreDryRunResultV1["per_file"] = [];
  for (const filePath of args.changedFiles) {
    const r = spawnSync("bash", [scriptAbs, "--dry-run", filePath], {
      cwd: args.rootDir,
      encoding: "utf8",
    });
    const exit = r.status;
    per_file.push({
      path: filePath,
      classification: exit === 0 ? "SKIP_BUILD" : exit === 1 ? "TRIGGER_BUILD" : "UNKNOWN",
      exit_code: exit,
    });
  }

  const classifications = new Set(per_file.map((row) => row.classification));
  let aggregate: NetlifyIgnoreDryRunResultV1["aggregate"] = "UNKNOWN";
  if (classifications.has("TRIGGER_BUILD")) {
    aggregate = classifications.has("SKIP_BUILD") ? "MIXED" : "TRIGGER_BUILD";
  } else if (classifications.size === 1 && classifications.has("SKIP_BUILD")) {
    aggregate = "SKIP_BUILD";
  }

  return {
    available: true,
    per_file,
    aggregate,
    stderr_sample: null,
  };
}

export function classifyNetlifyIgnoreDryRunBatch(args: {
  rootDir: string;
  changedFiles: string[];
}): NetlifyIgnoreDryRunResultV1 {
  const scriptAbs = path.join(args.rootDir, "scripts/netlify-ignore-build.sh");
  if (!existsSync(scriptAbs) || args.changedFiles.length === 0) {
    return {
      available: existsSync(scriptAbs),
      per_file: [],
      aggregate: "UNKNOWN",
      stderr_sample: null,
    };
  }

  const r = spawnSync("bash", [scriptAbs, "--dry-run", ...args.changedFiles], {
    cwd: args.rootDir,
    encoding: "utf8",
  });
  const exit = r.status;
  const aggregate: NetlifyIgnoreDryRunResultV1["aggregate"] =
    exit === 0 ? "SKIP_BUILD" : exit === 1 ? "TRIGGER_BUILD" : "UNKNOWN";

  return {
    available: true,
    per_file: args.changedFiles.map((filePath) => ({
      path: filePath,
      classification: aggregate === "UNKNOWN" ? "UNKNOWN" : aggregate,
      exit_code: exit,
    })),
    aggregate,
    stderr_sample: String(r.stderr ?? "").slice(0, 400) || null,
  };
}

const PROTECTED_PUSH_PREFIXES = [
  "data/retailer_links.csv",
  "data/evidence/",
  "data/filters.csv",
  "data/compatibility_mappings.csv",
] as const;

function isProtectedPushPath(filePath: string): boolean {
  return PROTECTED_PUSH_PREFIXES.some(
    (prefix) => filePath === prefix || filePath.startsWith(prefix),
  );
}

export function recommendValidationCommands(changedFiles: string[]): string[] {
  const cmds = new Set<string>();
  const all = new Set(changedFiles);

  const touches = (pred: (f: string) => boolean) => Array.from(all).some(pred);

  if (
    touches((f) => f.startsWith("scripts/report-buckparts-command-center") || f.startsWith("scripts/lib/"))
  ) {
    cmds.add("node --import tsx --test scripts/report-buckparts-command-center.test.ts");
  }
  if (touches((f) => f.includes("buckparts-ship-guard"))) {
    cmds.add("node --import tsx --test scripts/lib/buckparts-ship-guard-v1.test.ts");
  }
  if (touches((f) => f.includes("netlify-ignore-build"))) {
    cmds.add("node --import tsx --test scripts/netlify-ignore-build.test.ts");
  }
  if (touches((f) => f.startsWith("src/") || f === "package.json" || f.startsWith("tsconfig"))) {
    cmds.add("npm run build");
  }
  if (cmds.size === 0 && all.size > 0) {
    cmds.add(BUCKPARTS_SHIP_GUARD_COMMAND_V1);
  }
  if (all.size === 0) {
    cmds.add(BUCKPARTS_SHIP_GUARD_COMMAND_V1);
  }

  return Array.from(cmds);
}

function runValidationCommand(command: string, rootDir: string): { ok: boolean; exit_code: number | null } {
  const r = spawnSync(command, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    stdio: "ignore",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, exit_code: r.status };
}

export function buildProtectedRetailerLinksCheck(args: {
  rootDir: string;
  git: ShipGuardGitProviderV1;
  changedUnion: string[];
  headRef?: string | null;
}): ProtectedRetailerLinksCheckV1 {
  const rel = PROTECTED_RETAILER_LINKS_CSV_REL;
  const abs = path.join(args.rootDir, rel);
  const originHash = args.git.showBlobHashAtRef("origin/main", rel);
  const headHash =
    args.headRef != null ? args.git.showBlobHashAtRef(args.headRef, rel) : null;
  const workingHash = sha256File(abs);

  const gitDiffWorking = args.git.pathHasDiffWorkingTreeVsHead(rel);
  const gitDiffHeadVsOrigin = args.git.pathHasDiffHeadVsOriginMain(rel);

  return {
    path: rel,
    git_diff_working_tree_vs_head: gitDiffWorking,
    git_diff_head_vs_origin_main: gitDiffHeadVsOrigin,
    listed_in_changed_files: args.changedUnion.includes(rel),
    hash_check: {
      origin_main_blob_sha256: originHash,
      head_blob_sha256: headHash,
      working_tree_file_sha256: workingHash,
      working_tree_hash_differs_from_head_blob:
        headHash && workingHash ? headHash !== workingHash : "UNKNOWN",
      working_tree_hash_differs_from_origin_main_blob:
        originHash && workingHash ? originHash !== workingHash : "UNKNOWN",
    },
  };
}

export function retailerLinksDriftBlockers(check: ProtectedRetailerLinksCheckV1): string[] {
  const blockers: string[] = [];
  if (check.listed_in_changed_files) {
    blockers.push(`${PROTECTED_RETAILER_LINKS_CSV_REL}:listed_in_changed_files`);
  }
  if (check.git_diff_working_tree_vs_head === true) {
    blockers.push(`${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_working_tree_vs_head`);
  }
  if (check.git_diff_head_vs_origin_main === true) {
    blockers.push(`${PROTECTED_RETAILER_LINKS_CSV_REL}:git_diff_head_vs_origin_main`);
  }
  return blockers;
}

export function buildBuckpartsShipGuardReportV1(args: {
  rootDir: string;
  mode?: ShipGuardModeV1;
  git?: ShipGuardGitProviderV1;
  runValidations?: boolean;
}): ShipGuardReportV1 {
  const rootDir = args.rootDir;
  const mode = args.mode ?? "dry_run";
  const git = args.git ?? defaultShipGuardGitProvider(rootDir);

  const head = git.revParseHead();
  const originMain = git.revParseOriginMain();
  const commitsAhead = git.commitsAheadOfOriginMain();
  const aheadFiles = git.filesChangedAheadOfOriginMain();
  const workingFiles = git.filesChangedWorkingTree();
  const stagedFiles = git.filesStaged();
  const untrackedFiles = git.filesUntracked();
  const changed_files = uniqueSorted([
    ...aheadFiles,
    ...workingFiles,
    ...stagedFiles,
    ...untrackedFiles,
  ]);

  const protectedRetailer = buildProtectedRetailerLinksCheck({
    rootDir,
    git,
    changedUnion: changed_files,
    headRef: head,
  });
  const protected_file_checks = { retailer_links_csv: protectedRetailer };
  const netlify = classifyNetlifyIgnoreDryRunBatch({ rootDir, changedFiles: changed_files });
  const recommended_validations = recommendValidationCommands(changed_files);

  const blockers: string[] = [...retailerLinksDriftBlockers(protectedRetailer)];
  for (const filePath of changed_files) {
    if (filePath.startsWith("data/evidence/")) {
      blockers.push(`data/evidence/:${filePath}`);
    }
    if (isProtectedPushPath(filePath) && filePath !== PROTECTED_RETAILER_LINKS_CSV_REL) {
      blockers.push(`protected_catalog_or_evidence_path:${filePath}`);
    }
  }
  if (originMain === null) {
    blockers.push("origin/main:unavailable");
  }

  let push_assessment: ShipGuardReportV1["push_assessment"] = "UNKNOWN";
  if (blockers.length > 0) {
    push_assessment = "BLOCKED";
  } else if (originMain !== null && head !== null) {
    push_assessment = "SAFE";
  }

  const validation_results: ShipGuardReportV1["validation_results"] = [];
  const shouldRunValidations = args.runValidations === true && (mode === "commit" || mode === "push");
  if (shouldRunValidations) {
    for (const command of recommended_validations) {
      const result = runValidationCommand(command, rootDir);
      validation_results.push({ command, ...result });
      if (!result.ok) {
        blockers.push(`validation_failed:${command}`);
        push_assessment = "BLOCKED";
      }
    }
  }

  const proven_facts = [
    "PROVEN: ship guard defaults to read-only dry_run; commit_authorized=false; push_authorized=false; deploy_authorized=false.",
    "PROVEN: script does not call Netlify API, Supabase, or mutate data/retailer_links.csv.",
    "PROVEN: protected-file drift blockers use git diff --quiet semantics, not hash-only inference.",
  ];
  if (protectedRetailer.hash_check.origin_main_blob_sha256) {
    proven_facts.push(
      `PROVEN: origin/main ${PROTECTED_RETAILER_LINKS_CSV_REL} informational hash=${protectedRetailer.hash_check.origin_main_blob_sha256.slice(0, 12)}…`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: live Netlify deploy state (local ignore dry-run only).",
    "UNKNOWN: GitHub Actions live PASS/FAIL (no GitHub API in ship guard).",
  ];

  const recommended_next_action =
    push_assessment === "BLOCKED"
      ? "Resolve blockers before push; re-run npm run buckparts:ship-guard. Do not mutate protected paths without owner review."
      : mode === "dry_run"
        ? "Review report; run npm run buckparts:ship-guard -- --commit to execute recommended validations without committing."
        : "If validations passed, operator may git push manually — ship guard never pushes automatically.";

  return {
    contract: BUCKPARTS_SHIP_GUARD_CONTRACT_V1,
    mode,
    read_only: true,
    data_mutation: false,
    deploy_authorized: false,
    netlify_api_authorized: false,
    push_authorized: false,
    commit_authorized: false,
    supabase_mutation_authorized: false,
    evidence_write_authorized: false,
    buckparts_verified_link_authorized: false,
    current_head: head,
    origin_main: originMain,
    commits_ahead: commitsAhead,
    changed_files,
    protected_file_checks,
    push_assessment,
    blockers,
    recommended_validations,
    git: {
      head,
      origin_main: originMain,
      branch: git.currentBranch(),
      commits_ahead_of_origin_main: commitsAhead,
      files_changed_ahead_of_origin_main: aheadFiles,
      files_changed_working_tree: workingFiles,
      files_staged: stagedFiles,
    },
    protected_retailer_links_csv: protectedRetailer,
    netlify_ignore_dry_run: netlify,
    recommended_validation_commands: recommended_validations,
    validation_results,
    proven_facts,
    unknown_facts,
    recommended_next_action,
  };
}

export function parseShipGuardArgv(argv: string[]): ShipGuardModeV1 {
  if (argv.includes("--push")) return "push";
  if (argv.includes("--commit")) return "commit";
  return "dry_run";
}
