/**
 * BuckParts Credit Control Center v1 — read-only credit governance snapshot.
 * Uses owner-provided Netlify credit evidence + local git/path classification.
 * Does not call Netlify APIs, mutate Supabase/CSV, or spend credits.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  classifyDeployPathV1,
  type DeployClassificationV1,
} from "./buckparts-deploy-classifier-v1";

export const BUCKPARTS_CREDIT_CONTROL_CENTER_CONTRACT_V1 =
  "buckparts_credit_control_center_v1" as const;

export const BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1 =
  "buckparts_netlify_credit_state_v1" as const;

export const BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1 =
  "data/ops/credit-control/netlify-credit-state-v1.json" as const;

export const BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1 =
  "data/ops/credit-control/credit-control-center-v1.json" as const;

export const BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1 =
  "data/ops/credit-control/credit-control-center-v1.md" as const;

export const BUCKPARTS_CREDIT_CONTROL_SOURCE_COMMAND_V1 =
  "npm run buckparts:credit-control" as const;

export const BUCKPARTS_CREDIT_CONTROL_ALLOWED_WRITE_REL_PATHS_V1 = [
  BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1,
  BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1,
] as const;

export type CreditDeploymentPostureV1 =
  | "REPO_ONLY_SAFE"
  | "DEPLOY_HOLD_CREDITS_EXHAUSTED"
  | "DEPLOY_ALLOWED_MANUAL_REVIEW"
  | "UNKNOWN_CREDIT_STATE";

export type CreditWorkClassV1 =
  | "clean"
  | "docs_only"
  | "tests_only"
  | "scripts_only"
  | "mixed_non_production"
  | "production_impacting"
  | "unknown";

export type NetlifyCreditStatusV1 =
  | "exhausted"
  | "available"
  | "unknown"
  | "paused"
  | "restored";

export type BuckpartsNetlifyCreditStateV1 = {
  contract: typeof BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1;
  read_only: boolean;
  data_mutation: boolean;
  provider: "netlify";
  status: NetlifyCreditStatusV1;
  observed_at: string;
  reset_at: string | null;
  source: string;
  production_deploy_posture?: string;
  latest_skipped_production_deploy?: {
    branch?: string;
    at_or_after_commit?: string;
    note?: string;
  };
  notes?: string;
  live_netlify_api_state?: string;
  netlify_api_call_authorized?: boolean;
};

export type CreditChangedPathRowV1 = {
  path: string;
  deploy_classification: DeployClassificationV1;
  rule_id: string;
};

export type BuckpartsCreditControlCenterReportV1 = {
  contract: typeof BUCKPARTS_CREDIT_CONTROL_CENTER_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  netlify_api_call_authorized: false;
  credit_spend_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_CREDIT_CONTROL_SOURCE_COMMAND_V1;
  deployment_posture: CreditDeploymentPostureV1;
  repo_head: string | null;
  origin_main_head: string | null;
  git_status_clean: boolean;
  changed_paths: string[];
  changed_path_rows: CreditChangedPathRowV1[];
  work_class: CreditWorkClassV1;
  credit_evidence_rel_path: string;
  credit_evidence_present: boolean;
  credit_evidence: BuckpartsNetlifyCreditStateV1 | null;
  credit_evidence_errors: string[];
  deploy_held: boolean;
  local_build_recommended: boolean;
  local_build_optional: boolean;
  push_allowed: boolean;
  production_deploy_recommended: boolean;
  governance_recommendations: string[];
  proven_facts: string[];
  unknown_facts: string[];
  risk_notes: string[];
};

export type CreditControlGitSnapshotV1 = {
  repo_head: string | null;
  origin_main_head: string | null;
  git_status_clean: boolean;
  changed_paths: string[];
};

function normalizeRelPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeRelPath).filter(Boolean))).sort();
}

export function loadBuckpartsNetlifyCreditStateV1(args: {
  rootDir: string;
  relPath?: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): { evidence: BuckpartsNetlifyCreditStateV1 | null; errors: string[]; present: boolean } {
  const rel = args.relPath ?? BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1;
  const abs = path.join(args.rootDir, rel);
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readText = args.readText ?? ((p: string) => readFileSync(p, "utf8"));

  if (!fileExists(abs)) {
    return { evidence: null, errors: [`credit evidence missing: ${rel}`], present: false };
  }

  try {
    const raw = JSON.parse(readText(abs)) as BuckpartsNetlifyCreditStateV1;
    const errors: string[] = [];
    if (raw.contract !== BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1) {
      errors.push(
        `credit evidence contract mismatch: expected ${BUCKPARTS_NETLIFY_CREDIT_STATE_CONTRACT_V1}`,
      );
    }
    if (raw.provider !== "netlify") {
      errors.push(`credit evidence provider must be netlify, got ${String(raw.provider)}`);
    }
    if (!raw.status) {
      errors.push("credit evidence status missing");
    }
    if (!raw.observed_at) {
      errors.push("credit evidence observed_at missing");
    }
    if (!raw.source) {
      errors.push("credit evidence source missing");
    }
    if (errors.length > 0) {
      return { evidence: null, errors, present: true };
    }
    return { evidence: raw, errors: [], present: true };
  } catch (err) {
    return {
      evidence: null,
      errors: [`credit evidence parse failed: ${err instanceof Error ? err.message : String(err)}`],
      present: true,
    };
  }
}

export function classifyCreditWorkClassV1(
  changedPaths: string[],
): { work_class: CreditWorkClassV1; rows: CreditChangedPathRowV1[] } {
  const paths = uniqueSorted(changedPaths);
  if (paths.length === 0) {
    return { work_class: "clean", rows: [] };
  }

  const rows = paths.map((p) => {
    const classified = classifyDeployPathV1(p);
    return {
      path: classified.path,
      deploy_classification: classified.classification,
      rule_id: classified.rule_id,
    };
  });

  const hasProduction = rows.some((row) => row.deploy_classification === "DEPLOY_REQUIRED");
  const hasUnknown = rows.some((row) => row.deploy_classification === "UNKNOWN");
  if (hasProduction) {
    return { work_class: "production_impacting", rows };
  }
  if (hasUnknown) {
    return { work_class: "unknown", rows };
  }

  const allDocs = rows.every((row) => row.rule_id === "docs_only");
  const allTests = rows.every((row) => row.rule_id === "tests_only");
  const allScripts = rows.every((row) => row.rule_id === "scripts_only");
  if (allDocs) return { work_class: "docs_only", rows };
  if (allTests) return { work_class: "tests_only", rows };
  if (allScripts) return { work_class: "scripts_only", rows };
  return { work_class: "mixed_non_production", rows };
}

export function classifyCreditDeploymentPostureV1(args: {
  creditStatus: NetlifyCreditStatusV1 | null;
  creditEvidencePresent: boolean;
  creditEvidenceErrors: string[];
  workClass: CreditWorkClassV1;
}): CreditDeploymentPostureV1 {
  if (!args.creditEvidencePresent || args.creditEvidenceErrors.length > 0) {
    return "UNKNOWN_CREDIT_STATE";
  }
  if (args.creditStatus == null || args.creditStatus === "unknown") {
    return "UNKNOWN_CREDIT_STATE";
  }
  if (args.creditStatus === "exhausted" || args.creditStatus === "paused") {
    return "DEPLOY_HOLD_CREDITS_EXHAUSTED";
  }
  // available / restored
  if (args.workClass === "production_impacting" || args.workClass === "unknown") {
    return "DEPLOY_ALLOWED_MANUAL_REVIEW";
  }
  return "REPO_ONLY_SAFE";
}

export function deriveCreditGovernanceFlagsV1(args: {
  posture: CreditDeploymentPostureV1;
  workClass: CreditWorkClassV1;
  gitStatusClean: boolean;
}): {
  deploy_held: boolean;
  local_build_recommended: boolean;
  local_build_optional: boolean;
  push_allowed: boolean;
  production_deploy_recommended: boolean;
} {
  const deploy_held =
    args.posture === "DEPLOY_HOLD_CREDITS_EXHAUSTED" ||
    args.posture === "UNKNOWN_CREDIT_STATE";

  const production_impacting = args.workClass === "production_impacting";
  const docs_only = args.workClass === "docs_only";
  const clean = args.workClass === "clean";

  // Docs-only / clean / scripts-only / tests-only: local build optional unless production-impacting.
  const local_build_recommended = production_impacting || args.workClass === "unknown";
  const local_build_optional =
    !local_build_recommended &&
    (docs_only ||
      clean ||
      args.workClass === "scripts_only" ||
      args.workClass === "tests_only" ||
      args.workClass === "mixed_non_production");

  // Push may be allowed even when deploy is held (e.g. clean + exhausted).
  const push_allowed = true;

  // Never auto-recommend production deploy while credits held/unknown,
  // or while the tree is dirty / not production-impacting.
  const production_deploy_recommended =
    !deploy_held &&
    args.posture === "DEPLOY_ALLOWED_MANUAL_REVIEW" &&
    production_impacting &&
    args.gitStatusClean;

  return {
    deploy_held,
    local_build_recommended,
    local_build_optional,
    push_allowed,
    production_deploy_recommended,
  };
}

export function defaultCreditControlGitSnapshotV1(rootDir: string): CreditControlGitSnapshotV1 {
  const run = (args: string[]): { ok: boolean; out: string } => {
    const result = spawnSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
    });
    return {
      ok: result.status === 0,
      out: String(result.stdout ?? "").replace(/\n$/, ""),
    };
  };

  const head = run(["rev-parse", "--short", "HEAD"]);
  const origin = run(["rev-parse", "--short", "origin/main"]);
  const porcelain = run(["status", "--porcelain"]);
  const unstaged = run(["diff", "--name-only", "HEAD"]);
  const staged = run(["diff", "--cached", "--name-only", "HEAD"]);
  const untracked = run(["ls-files", "--others", "--exclude-standard"]);

  const changed_paths = uniqueSorted([
    ...(unstaged.ok ? unstaged.out.split("\n") : []),
    ...(staged.ok ? staged.out.split("\n") : []),
    ...(untracked.ok ? untracked.out.split("\n") : []),
  ]);

  return {
    repo_head: head.ok && head.out ? head.out.trim() : null,
    origin_main_head: origin.ok && origin.out ? origin.out.trim() : null,
    git_status_clean: porcelain.ok && porcelain.out.trim().length === 0,
    changed_paths,
  };
}

export type BuildCreditControlCenterDepsV1 = {
  rootDir: string;
  now?: () => Date;
  gitSnapshot?: CreditControlGitSnapshotV1;
  creditEvidenceRelPath?: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
};

export function buildBuckpartsCreditControlCenterV1(
  deps: BuildCreditControlCenterDepsV1,
): BuckpartsCreditControlCenterReportV1 {
  const now = deps.now ?? (() => new Date());
  const generated_at = now().toISOString();
  const creditEvidenceRelPath =
    deps.creditEvidenceRelPath ?? BUCKPARTS_NETLIFY_CREDIT_STATE_JSON_REL_V1;

  const git = deps.gitSnapshot ?? defaultCreditControlGitSnapshotV1(deps.rootDir);
  const loaded = loadBuckpartsNetlifyCreditStateV1({
    rootDir: deps.rootDir,
    relPath: creditEvidenceRelPath,
    readText: deps.readText,
    fileExists: deps.fileExists,
  });

  const { work_class, rows } = classifyCreditWorkClassV1(git.changed_paths);
  const creditStatus = loaded.evidence?.status ?? null;
  const deployment_posture = classifyCreditDeploymentPostureV1({
    creditStatus,
    creditEvidencePresent: loaded.present,
    creditEvidenceErrors: loaded.errors,
    workClass: work_class,
  });

  const flags = deriveCreditGovernanceFlagsV1({
    posture: deployment_posture,
    workClass: work_class,
    gitStatusClean: git.git_status_clean,
  });

  // Dirty production-impacting always means deploy not recommended (even if credits available).
  if (work_class === "production_impacting" && !git.git_status_clean) {
    flags.production_deploy_recommended = false;
  }

  const governance_recommendations: string[] = [];
  if (deployment_posture === "DEPLOY_HOLD_CREDITS_EXHAUSTED") {
    governance_recommendations.push(
      "Hold all Netlify production deploys until credits reset or owner purchases credits with an explicit spend decision.",
    );
    governance_recommendations.push(
      "Prefer repo-only work (docs/scripts/tests/drafts). Push to origin/main is allowed only if Netlify auto-deploy is confirmed skipped/disabled.",
    );
  }
  if (deployment_posture === "UNKNOWN_CREDIT_STATE") {
    governance_recommendations.push(
      "Update data/ops/credit-control/netlify-credit-state-v1.json with owner screenshot evidence before any deploy spend.",
    );
  }
  if (work_class === "docs_only") {
    governance_recommendations.push(
      "Docs-only changes: local npm run build is optional unless explicitly requested.",
    );
  }
  if (work_class === "production_impacting" && !git.git_status_clean) {
    governance_recommendations.push(
      "Dirty production-impacting tree: do not recommend production deploy; finish/commit lane first.",
    );
  }
  if (flags.push_allowed && flags.deploy_held && git.git_status_clean) {
    governance_recommendations.push(
      "Clean repo + credits exhausted: push may be allowed for bookkeeping; production deploy remains held.",
    );
  }
  governance_recommendations.push(
    "Do not buy/spend Netlify credits from this report alone — founder spend decision required.",
  );

  const proven_facts = [
    `PROVEN: read_only=true; data_mutation=false; netlify_api_call_authorized=false; credit_spend_authorized=false.`,
    `PROVEN: deployment_posture=${deployment_posture}; deploy_held=${String(flags.deploy_held)}.`,
    `PROVEN: work_class=${work_class}; git_status_clean=${String(git.git_status_clean)}; changed_path_count=${String(git.changed_paths.length)}.`,
    `PROVEN: repo_head=${git.repo_head ?? "UNKNOWN"}; origin_main_head=${git.origin_main_head ?? "UNKNOWN"}.`,
    `PROVEN: credit_evidence_present=${String(loaded.present)}; credit_status=${creditStatus ?? "none"}.`,
    `PROVEN: local_build_recommended=${String(flags.local_build_recommended)}; local_build_optional=${String(flags.local_build_optional)}; push_allowed=${String(flags.push_allowed)}; production_deploy_recommended=${String(flags.production_deploy_recommended)}.`,
  ];
  if (loaded.evidence?.reset_at) {
    proven_facts.push(`PROVEN: owner-recorded credit reset_at=${loaded.evidence.reset_at}.`);
  }
  if (loaded.evidence?.latest_skipped_production_deploy?.at_or_after_commit) {
    proven_facts.push(
      `PROVEN: latest skipped production deploy recorded at/after ${loaded.evidence.latest_skipped_production_deploy.at_or_after_commit}.`,
    );
  }

  const unknown_facts = [
    "UNKNOWN: Live Netlify billing/credit balance was not queried via API (no safe read-only Netlify credit API authorized in this lane).",
    "UNKNOWN: Whether origin/main auto-deploy is currently hard-disabled in Netlify UI beyond owner screenshot evidence.",
  ];
  if (loaded.errors.length > 0) {
    unknown_facts.unshift(`UNKNOWN: credit evidence errors: ${loaded.errors.join("; ")}`);
  }

  const risk_notes = [
    "This control center does not spend credits and does not call Netlify APIs.",
    "Do not treat production_deploy_recommended=true as authorization to buy credits or force-deploy.",
    "Avoid unnecessary production builds/deploys while status=exhausted.",
    "Manual owner updates to netlify-credit-state-v1.json are the durable credit evidence source for this v1.",
  ];

  return {
    contract: BUCKPARTS_CREDIT_CONTROL_CENTER_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    netlify_api_call_authorized: false,
    credit_spend_authorized: false,
    generated_at,
    source_command: BUCKPARTS_CREDIT_CONTROL_SOURCE_COMMAND_V1,
    deployment_posture,
    repo_head: git.repo_head,
    origin_main_head: git.origin_main_head,
    git_status_clean: git.git_status_clean,
    changed_paths: git.changed_paths,
    changed_path_rows: rows,
    work_class,
    credit_evidence_rel_path: creditEvidenceRelPath,
    credit_evidence_present: loaded.present,
    credit_evidence: loaded.evidence,
    credit_evidence_errors: loaded.errors,
    deploy_held: flags.deploy_held,
    local_build_recommended: flags.local_build_recommended,
    local_build_optional: flags.local_build_optional,
    push_allowed: flags.push_allowed,
    production_deploy_recommended: flags.production_deploy_recommended,
    governance_recommendations,
    proven_facts,
    unknown_facts,
    risk_notes,
  };
}

export function buildBuckpartsCreditControlCenterMarkdownV1(
  report: BuckpartsCreditControlCenterReportV1,
): string {
  const lines: string[] = [
    "# BuckParts Credit Control Center v1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Status",
    "",
    `- contract: \`${report.contract}\``,
    `- deployment_posture: **${report.deployment_posture}**`,
    `- deploy_held: **${String(report.deploy_held)}**`,
    `- read_only: **true**`,
    `- data_mutation: **false**`,
    `- netlify_api_call_authorized: **false**`,
    `- credit_spend_authorized: **false**`,
    "",
    "## Repo",
    "",
    `- repo_head: \`${report.repo_head ?? "UNKNOWN"}\``,
    `- origin_main_head: \`${report.origin_main_head ?? "UNKNOWN"}\``,
    `- git_status_clean: **${String(report.git_status_clean)}**`,
    `- work_class: **${report.work_class}**`,
    `- changed_path_count: ${String(report.changed_paths.length)}`,
    "",
    "## Credit evidence",
    "",
    `- path: \`${report.credit_evidence_rel_path}\``,
    `- present: **${String(report.credit_evidence_present)}**`,
    `- status: \`${report.credit_evidence?.status ?? "none"}\``,
    `- observed_at: \`${report.credit_evidence?.observed_at ?? "none"}\``,
    `- reset_at: \`${report.credit_evidence?.reset_at ?? "none"}\``,
    `- source: \`${report.credit_evidence?.source ?? "none"}\``,
    "",
    "## Governance flags",
    "",
    `- local_build_recommended: **${String(report.local_build_recommended)}**`,
    `- local_build_optional: **${String(report.local_build_optional)}**`,
    `- push_allowed: **${String(report.push_allowed)}**`,
    `- production_deploy_recommended: **${String(report.production_deploy_recommended)}**`,
    "",
    "## Recommendations",
    "",
  ];
  for (const rec of report.governance_recommendations) lines.push(`- ${rec}`);

  if (report.changed_path_rows.length > 0) {
    lines.push("", "## Changed paths", "");
    for (const row of report.changed_path_rows) {
      lines.push(`- \`${row.path}\` — ${row.deploy_classification} (\`${row.rule_id}\`)`);
    }
  }

  if (report.credit_evidence_errors.length > 0) {
    lines.push("", "## Credit evidence errors", "");
    for (const err of report.credit_evidence_errors) lines.push(`- ${err}`);
  }

  lines.push("", "## Proven facts", "");
  for (const fact of report.proven_facts) lines.push(`- ${fact}`);
  lines.push("", "## Unknown facts", "");
  for (const fact of report.unknown_facts) lines.push(`- ${fact}`);
  lines.push("", "## Risk notes", "");
  for (const note of report.risk_notes) lines.push(`- ${note}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeBuckpartsCreditControlCenterArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsCreditControlCenterReportV1;
}): { json_rel_path: string; md_rel_path: string } {
  const jsonAbs = path.join(args.rootDir, BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, buildBuckpartsCreditControlCenterMarkdownV1(args.report), "utf8");
  return {
    json_rel_path: BUCKPARTS_CREDIT_CONTROL_CENTER_JSON_REL_V1,
    md_rel_path: BUCKPARTS_CREDIT_CONTROL_CENTER_MD_REL_V1,
  };
}

/** Compact credit posture for deploy classifier / ship-guard / pre-push summaries. */
export type CreditControlDeployAwarenessSummaryV1 = {
  source_command: typeof BUCKPARTS_CREDIT_CONTROL_SOURCE_COMMAND_V1;
  deployment_posture: CreditDeploymentPostureV1;
  deploy_held: boolean;
  production_deploy_recommended: boolean;
  push_allowed: boolean;
  credit_spend_authorized: false;
  netlify_api_call_authorized: false;
  credit_status: NetlifyCreditStatusV1 | null;
  operator_line: string;
  push_with_deploy_hold_message: string | null;
};

export function buildCreditControlDeployAwarenessSummaryV1(
  report: Pick<
    BuckpartsCreditControlCenterReportV1,
    | "deployment_posture"
    | "deploy_held"
    | "production_deploy_recommended"
    | "push_allowed"
    | "credit_evidence"
  >,
): CreditControlDeployAwarenessSummaryV1 {
  const credit_status = report.credit_evidence?.status ?? null;
  const operator_line = [
    `credit_control: posture=${report.deployment_posture}`,
    `deploy_held=${String(report.deploy_held)}`,
    `production_deploy_recommended=${String(report.production_deploy_recommended)}`,
    `push_allowed=${String(report.push_allowed)}`,
    `credit_spend_authorized=false`,
  ].join(" ");

  const push_with_deploy_hold_message =
    report.deploy_held && report.push_allowed
      ? `Push may proceed for repo bookkeeping, but Netlify production deploy is held (${report.deployment_posture}); production_deploy_recommended=false.`
      : report.deploy_held
        ? `Netlify production deploy is held (${report.deployment_posture}); production_deploy_recommended=false.`
        : null;

  return {
    source_command: BUCKPARTS_CREDIT_CONTROL_SOURCE_COMMAND_V1,
    deployment_posture: report.deployment_posture,
    deploy_held: report.deploy_held,
    production_deploy_recommended: report.production_deploy_recommended,
    push_allowed: report.push_allowed,
    credit_spend_authorized: false,
    netlify_api_call_authorized: false,
    credit_status,
    operator_line,
    push_with_deploy_hold_message,
  };
}

export function loadCreditControlDeployAwarenessSummaryV1(args: {
  rootDir: string;
  now?: () => Date;
  gitSnapshot?: CreditControlGitSnapshotV1;
  creditEvidenceRelPath?: string;
  readText?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
}): CreditControlDeployAwarenessSummaryV1 {
  const report = buildBuckpartsCreditControlCenterV1(args);
  return buildCreditControlDeployAwarenessSummaryV1(report);
}
