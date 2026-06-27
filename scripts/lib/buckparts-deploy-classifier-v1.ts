/**
 * BuckParts deploy batching policy v1 — read-only git diff / commit-range deploy classification.
 * PROVEN: no Netlify API, no production mutation, no hook blocking.
 */

import { spawnSync } from "node:child_process";

export const BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1 =
  "buckparts_deploy_batching_policy_v1" as const;

export const BUCKPARTS_DEPLOY_CLASSIFIER_SOURCE_COMMAND_V1 =
  "npm run buckparts:deploy-classifier" as const;

export const BUCKPARTS_DEPLOY_CLASSIFIER_PRE_PUSH_SOURCE_COMMAND_V1 =
  "npm run buckparts:deploy-classifier:pre-push-summary" as const;

export type DeployClassificationV1 =
  | "DEPLOY_REQUIRED"
  | "DEPLOY_OPTIONAL"
  | "NO_DEPLOY_NEEDED"
  | "UNKNOWN";

export type DeployOperatorActionV1 =
  | "PUSH_AND_DEPLOY"
  | "PUSH_BATCH_LOCALLY"
  | "BATCH_LOCALLY"
  | "HOLD_REVIEW";

export type DeployClassifierScopeV1 =
  | "push-ahead"
  | "working-tree"
  | "staged"
  | "range"
  | "paths";

export type DeployPathRuleV1 = {
  rule_id: string;
  classification: DeployClassificationV1;
  description: string;
};

/** Exported rule catalog — matches repo truth in netlify-ignore-build.sh where applicable. */
export const BUCKPARTS_DEPLOY_CLASSIFIER_RULES_V1: DeployPathRuleV1[] = [
  {
    rule_id: "production_app_routes",
    classification: "DEPLOY_REQUIRED",
    description: "src/app production routes and owner dashboard runtime",
  },
  {
    rule_id: "public_components",
    classification: "DEPLOY_REQUIRED",
    description: "src/components used by public pages",
  },
  {
    rule_id: "public_runtime_lib",
    classification: "DEPLOY_REQUIRED",
    description: "src/lib runtime code (includes owner dashboard / Command Center runtime)",
  },
  {
    rule_id: "deploy_config",
    classification: "DEPLOY_REQUIRED",
    description: "netlify.toml, next.config, build toolchain configs",
  },
  {
    rule_id: "runtime_dependencies",
    classification: "DEPLOY_REQUIRED",
    description: "package.json / lockfiles — runtime dependency changes",
  },
  {
    rule_id: "customer_visible_csv",
    classification: "DEPLOY_REQUIRED",
    description: "Customer-visible catalog CSV (retailer_links, filters, compatibility, vertical catalogs)",
  },
  {
    rule_id: "public_assets",
    classification: "DEPLOY_REQUIRED",
    description: "public/ customer-visible static assets",
  },
  {
    rule_id: "supabase_runtime",
    classification: "DEPLOY_REQUIRED",
    description: "supabase/ schema or functions affecting deployed runtime",
  },
  {
    rule_id: "command_center_snapshot",
    classification: "DEPLOY_OPTIONAL",
    description: "Committed Command Center snapshot JSON under data/reports/",
  },
  {
    rule_id: "execution_ledger_artifact",
    classification: "DEPLOY_OPTIONAL",
    description: "Execution ledger index artifact (local operator read model)",
  },
  {
    rule_id: "command_center_internal",
    classification: "DEPLOY_OPTIONAL",
    description: "Internal Command Center registries, issues, opportunities (not public runtime)",
  },
  {
    rule_id: "mcp_local_stdio",
    classification: "DEPLOY_OPTIONAL",
    description: "Local stdio MCP server (mcp/buckparts-truth) — not Netlify-deployed",
  },
  {
    rule_id: "draft_batch_production",
    classification: "NO_DEPLOY_NEEDED",
    description: "Read-only draft artifacts under data/fridge/batch-production/",
  },
  {
    rule_id: "audit_artifacts",
    classification: "NO_DEPLOY_NEEDED",
    description: "Audit JSON/MD, audit-exports, command-center audits/drafts",
  },
  {
    rule_id: "owner_proof_guides",
    classification: "NO_DEPLOY_NEEDED",
    description: "Owner browser proof guides, intake templates, local execution packets",
  },
  {
    rule_id: "operator_reports",
    classification: "NO_DEPLOY_NEEDED",
    description: "data/reports/, data/evidence/, data/discovery/, data/owner-decisions/",
  },
  {
    rule_id: "scripts_only",
    classification: "NO_DEPLOY_NEEDED",
    description: "scripts/ CLI and lib — not imported by Next.js production runtime",
  },
  {
    rule_id: "tests_only",
    classification: "NO_DEPLOY_NEEDED",
    description: "Test files (*.test.ts, *.test.tsx, __tests__/)",
  },
  {
    rule_id: "docs_only",
    classification: "NO_DEPLOY_NEEDED",
    description: "docs/, README, markdown-only changes",
  },
  {
    rule_id: "ci_operator_only",
    classification: "NO_DEPLOY_NEEDED",
    description: ".github/, .cursor/, reports/ operator tooling",
  },
];

export type DeployPathClassificationV1 = {
  path: string;
  classification: DeployClassificationV1;
  rule_id: string;
  notes: string;
};

export type DeployClassifierGitProviderV1 = {
  filesChangedAheadOfOriginMain: () => string[];
  filesChangedWorkingTree: () => string[];
  filesStaged: () => string[];
  filesInRange: (range: string) => string[];
  revParseOriginMain: () => string | null;
};

export type BuckpartsDeployClassifierReportV1 = {
  contract: typeof BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  netlify_api_authorized: false;
  deploy_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_DEPLOY_CLASSIFIER_SOURCE_COMMAND_V1;
  scope: DeployClassifierScopeV1;
  scope_range: string | null;
  changed_files: string[];
  per_path: DeployPathClassificationV1[];
  counts: {
    deploy_required: number;
    deploy_optional: number;
    no_deploy_needed: number;
    unknown: number;
  };
  aggregate_classification: DeployClassificationV1;
  operator_action: DeployOperatorActionV1;
  operator_summary: string;
  proven_facts: string[];
  unknown_facts: string[];
  recommended_next_action: string;
};

function normalizeRepoPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
}

function isTestPath(normalized: string): boolean {
  if (normalized.includes("/__tests__/")) return true;
  if (/\.(test|spec)\.(tsx?|jsx?)$/.test(normalized)) return true;
  return false;
}

export function classifyDeployPathV1(filePath: string): DeployPathClassificationV1 {
  const path = normalizeRepoPath(filePath);
  if (!path) {
    return {
      path: filePath,
      classification: "UNKNOWN",
      rule_id: "empty_path",
      notes: "empty path",
    };
  }

  if (isTestPath(path)) {
    return {
      path,
      classification: "NO_DEPLOY_NEEDED",
      rule_id: "tests_only",
      notes: "test file — no production runtime impact",
    };
  }

  // --- DEPLOY_REQUIRED (highest specificity first) ---
  if (path === "netlify.toml") {
    return rule(path, "deploy_config", "DEPLOY_REQUIRED", "Netlify deploy configuration");
  }
  if (/^next\.config\.(js|mjs|ts)$/.test(path)) {
    return rule(path, "deploy_config", "DEPLOY_REQUIRED", "Next.js deploy configuration");
  }
  if (
    path === "package.json" ||
    path === "package-lock.json" ||
    path === "pnpm-lock.yaml" ||
    path === "yarn.lock"
  ) {
    return rule(path, "runtime_dependencies", "DEPLOY_REQUIRED", "Runtime dependency manifest");
  }
  if (
    path === "tailwind.config.js" ||
    path === "tailwind.config.ts" ||
    path === "postcss.config.js" ||
    path === "postcss.config.mjs" ||
    path === "postcss.config.ts" ||
    path === "tsconfig.json" ||
    /^tsconfig\..+\.json$/.test(path)
  ) {
    return rule(path, "deploy_config", "DEPLOY_REQUIRED", "Build toolchain configuration");
  }
  if (path.startsWith("src/app/")) {
    return rule(path, "production_app_routes", "DEPLOY_REQUIRED", "Next.js app router production route");
  }
  if (path.startsWith("src/components/")) {
    return rule(path, "public_components", "DEPLOY_REQUIRED", "Shared UI component consumed by public pages");
  }
  if (path.startsWith("src/lib/")) {
    return rule(path, "public_runtime_lib", "DEPLOY_REQUIRED", "Runtime library code (public + owner dashboard)");
  }
  if (path.startsWith("public/")) {
    return rule(path, "public_assets", "DEPLOY_REQUIRED", "Public static asset");
  }
  if (path.startsWith("supabase/")) {
    return rule(path, "supabase_runtime", "DEPLOY_REQUIRED", "Supabase schema/functions");
  }

  const customerCsv =
    path === "data/retailer_links.csv" ||
    path === "data/filters.csv" ||
    path === "data/filter_aliases.csv" ||
    path === "data/compatibility_mappings.csv" ||
    path === "data/fridge_models.csv" ||
    path === "data/fridge_model_aliases.csv" ||
    path === "data/brands.csv" ||
    path.startsWith("data/air-purifier/") ||
    path.startsWith("data/vacuum/") ||
    path.startsWith("data/humidifier/") ||
    path.startsWith("data/appliance-air/") ||
    path.startsWith("data/whole-house-water/");
  if (customerCsv && !path.endsWith(".sample.csv")) {
    return rule(path, "customer_visible_csv", "DEPLOY_REQUIRED", "Customer-visible catalog CSV");
  }

  // --- DEPLOY_OPTIONAL ---
  if (path === "data/reports/buckparts-command-center.json") {
    return rule(path, "command_center_snapshot", "DEPLOY_OPTIONAL", "Command Center snapshot archive");
  }
  if (path === "data/command-center/execution-ledger-v1.json") {
    return rule(path, "execution_ledger_artifact", "DEPLOY_OPTIONAL", "Execution ledger read-model index");
  }
  if (path.startsWith("data/command-center/")) {
    return rule(path, "command_center_internal", "DEPLOY_OPTIONAL", "Internal Command Center artifact");
  }
  if (path.startsWith("mcp/buckparts-truth/")) {
    return rule(path, "mcp_local_stdio", "DEPLOY_OPTIONAL", "Local stdio MCP — not deployed to Netlify");
  }

  // --- NO_DEPLOY_NEEDED ---
  if (path.startsWith("data/fridge/batch-production/")) {
    return rule(path, "draft_batch_production", "NO_DEPLOY_NEEDED", "Read-only batch-production draft artifact");
  }
  if (path.startsWith("audit-exports/")) {
    return rule(path, "audit_artifacts", "NO_DEPLOY_NEEDED", "Local audit export");
  }
  if (
    path.startsWith("data/command-center/audits/") ||
    path.startsWith("data/command-center/drafts/")
  ) {
    return rule(path, "audit_artifacts", "NO_DEPLOY_NEEDED", "Command Center audit/draft artifact");
  }
  if (
    path.includes("manufacturer-browser-proof-batch-commit-assist-guide") ||
    path.includes("manufacturer-browser-proof-batch-commit-intake") ||
    path.includes("owner-browser-proof-session") ||
    path.includes("owner-session-packet")
  ) {
    return rule(path, "owner_proof_guides", "NO_DEPLOY_NEEDED", "Owner proof guide/template/local packet");
  }
  if (
    path.startsWith("data/evidence/") ||
    path.startsWith("data/discovery/") ||
    path.startsWith("data/owner-decisions/") ||
    path.startsWith("data/reports/") ||
    path.startsWith("data/manual-evidence/") ||
    path.startsWith("data/bulk/") ||
    path.startsWith("data/waterdrop/") ||
    path.startsWith("data/gsc/") ||
    path.startsWith("data/affiliate/") ||
    path.startsWith("data/ops/") ||
    path.startsWith("data/fridge-form-factor-evidence/")
  ) {
    return rule(path, "operator_reports", "NO_DEPLOY_NEEDED", "Operator/evidence/report artifact");
  }
  if (path.startsWith("docs/") || path === "README" || path.startsWith("README.")) {
    return rule(path, "docs_only", "NO_DEPLOY_NEEDED", "Documentation only");
  }
  if (path.endsWith(".md")) {
    return rule(path, "docs_only", "NO_DEPLOY_NEEDED", "Markdown-only change");
  }
  if (path.startsWith("scripts/")) {
    return rule(path, "scripts_only", "NO_DEPLOY_NEEDED", "CLI/lib script — not Next.js runtime import");
  }
  if (path.startsWith(".github/") || path.startsWith(".cursor/") || path.startsWith("reports/")) {
    return rule(path, "ci_operator_only", "NO_DEPLOY_NEEDED", "CI/operator tooling");
  }
  if (path.endsWith(".sample.csv")) {
    return rule(path, "operator_reports", "NO_DEPLOY_NEEDED", "Sample CSV — not production catalog");
  }

  return {
    path,
    classification: "UNKNOWN",
    rule_id: "unclassified_path",
    notes: "Path not matched by deploy batching policy v1 — fail closed",
  };
}

function rule(
  path: string,
  rule_id: string,
  classification: DeployClassificationV1,
  notes: string,
): DeployPathClassificationV1 {
  return { path, rule_id, classification, notes };
}

export function aggregateDeployClassificationV1(
  perPath: DeployPathClassificationV1[],
): DeployClassificationV1 {
  if (perPath.length === 0) return "NO_DEPLOY_NEEDED";
  const classes = new Set(perPath.map((row) => row.classification));
  if (classes.has("DEPLOY_REQUIRED")) return "DEPLOY_REQUIRED";
  if (classes.has("UNKNOWN")) return "UNKNOWN";
  if (classes.has("DEPLOY_OPTIONAL")) return "DEPLOY_OPTIONAL";
  return "NO_DEPLOY_NEEDED";
}

export function deployOperatorActionV1(
  aggregate: DeployClassificationV1,
): DeployOperatorActionV1 {
  switch (aggregate) {
    case "DEPLOY_REQUIRED":
      return "PUSH_AND_DEPLOY";
    case "DEPLOY_OPTIONAL":
      return "PUSH_BATCH_LOCALLY";
    case "NO_DEPLOY_NEEDED":
      return "BATCH_LOCALLY";
    case "UNKNOWN":
      return "HOLD_REVIEW";
  }
}

export function deployOperatorSummaryV1(args: {
  aggregate: DeployClassificationV1;
  action: DeployOperatorActionV1;
  changed_file_count: number;
}): string {
  const n = String(args.changed_file_count);
  switch (args.action) {
    case "PUSH_AND_DEPLOY":
      return `PUSH AND DEPLOY — ${n} changed file(s) require Netlify production deploy (${args.aggregate}).`;
    case "PUSH_BATCH_LOCALLY":
      return `BATCH LOCALLY (deploy optional) — ${n} changed file(s); safe to push and batch deploy later (${args.aggregate}).`;
    case "BATCH_LOCALLY":
      return `BATCH LOCALLY — ${n} changed file(s); no Netlify deploy needed (${args.aggregate}).`;
    case "HOLD_REVIEW":
      return `HOLD — review ${n} changed file(s) before push; treat as deploy-required until classified (${args.aggregate}).`;
  }
}

function uniqueSorted(paths: string[]): string[] {
  return Array.from(new Set(paths.map(normalizeRepoPath).filter(Boolean))).sort();
}

export function defaultDeployClassifierGitProvider(rootDir: string): DeployClassifierGitProviderV1 {
  const run = (args: string[]): { ok: boolean; out: string } => {
    const r = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
    return { ok: r.status === 0, out: String(r.stdout ?? "").trimEnd() };
  };

  return {
    revParseOriginMain: () => {
      const r = run(["rev-parse", "origin/main"]);
      return r.ok ? r.out : null;
    },
    filesChangedAheadOfOriginMain: () => {
      const r = run(["diff", "--name-only", "origin/main...HEAD"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    filesChangedWorkingTree: () => {
      const unstaged = run(["diff", "--name-only", "HEAD"]);
      const untracked = run(["ls-files", "--others", "--exclude-standard"]);
      return uniqueSorted([
        ...(unstaged.ok ? unstaged.out.split("\n") : []),
        ...(untracked.ok ? untracked.out.split("\n") : []),
      ]);
    },
    filesStaged: () => {
      const r = run(["diff", "--cached", "--name-only", "HEAD"]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
    filesInRange: (range: string) => {
      const r = run(["diff", "--name-only", range]);
      return r.ok ? uniqueSorted(r.out.split("\n")) : [];
    },
  };
}

export function resolveDeployClassifierChangedFilesV1(args: {
  scope: DeployClassifierScopeV1;
  range?: string | null;
  paths?: string[];
  git?: DeployClassifierGitProviderV1;
}): { changed_files: string[]; scope_range: string | null; unknown_facts: string[] } {
  const unknown_facts: string[] = [];
  const git = args.git;

  if (args.scope === "paths") {
    return {
      changed_files: uniqueSorted(args.paths ?? []),
      scope_range: null,
      unknown_facts: [],
    };
  }

  if (!git) {
    return { changed_files: [], scope_range: null, unknown_facts: ["UNKNOWN: git provider missing"] };
  }

  if (args.scope === "range") {
    const range = args.range?.trim() ?? "";
    if (!range) {
      unknown_facts.push("UNKNOWN: --range required for scope=range");
      return { changed_files: [], scope_range: null, unknown_facts };
    }
    return { changed_files: git.filesInRange(range), scope_range: range, unknown_facts };
  }

  if (args.scope === "staged") {
    return { changed_files: git.filesStaged(), scope_range: "staged", unknown_facts };
  }

  if (args.scope === "working-tree") {
    return { changed_files: git.filesChangedWorkingTree(), scope_range: "working-tree", unknown_facts };
  }

  // push-ahead (default)
  const originMain = git.revParseOriginMain();
  if (!originMain) {
    unknown_facts.push("UNKNOWN: origin/main unavailable — falling back to working-tree paths");
    return {
      changed_files: uniqueSorted([
        ...git.filesChangedWorkingTree(),
        ...git.filesStaged(),
      ]),
      scope_range: "origin/main...HEAD (fallback: working-tree+staged)",
      unknown_facts,
    };
  }

  return {
    changed_files: git.filesChangedAheadOfOriginMain(),
    scope_range: "origin/main...HEAD",
    unknown_facts,
  };
}

export function buildBuckpartsDeployClassifierReportV1(args: {
  scope?: DeployClassifierScopeV1;
  range?: string | null;
  paths?: string[];
  git?: DeployClassifierGitProviderV1;
  now?: () => Date;
}): BuckpartsDeployClassifierReportV1 {
  const now = args.now ?? (() => new Date());
  const scope = args.scope ?? "push-ahead";
  const resolved = resolveDeployClassifierChangedFilesV1({
    scope,
    range: args.range,
    paths: args.paths,
    git: args.git,
  });

  const per_path = resolved.changed_files.map(classifyDeployPathV1);
  const counts = {
    deploy_required: per_path.filter((r) => r.classification === "DEPLOY_REQUIRED").length,
    deploy_optional: per_path.filter((r) => r.classification === "DEPLOY_OPTIONAL").length,
    no_deploy_needed: per_path.filter((r) => r.classification === "NO_DEPLOY_NEEDED").length,
    unknown: per_path.filter((r) => r.classification === "UNKNOWN").length,
  };
  const aggregate_classification = aggregateDeployClassificationV1(per_path);
  const operator_action = deployOperatorActionV1(aggregate_classification);
  const operator_summary = deployOperatorSummaryV1({
    aggregate: aggregate_classification,
    action: operator_action,
    changed_file_count: resolved.changed_files.length,
  });

  const proven_facts = [
    "PROVEN: deploy batching policy v1 is read-only — no Netlify API, no production mutation.",
    `PROVEN: classified ${String(resolved.changed_files.length)} path(s) with scope=${scope}.`,
    `PROVEN: aggregate=${aggregate_classification}; operator_action=${operator_action}.`,
  ];

  const unknown_facts = [...resolved.unknown_facts];
  if (counts.unknown > 0) {
    unknown_facts.push(
      `UNKNOWN: ${String(counts.unknown)} path(s) unclassified — fail closed to HOLD_REVIEW.`,
    );
  }

  const recommended_next_action =
    operator_action === "PUSH_AND_DEPLOY"
      ? "Push to origin/main when ready; Netlify build/deploy is required for production parity."
      : operator_action === "PUSH_BATCH_LOCALLY"
        ? "Push now if desired; batch Netlify deploy with the next runtime change or deploy at operator discretion."
        : operator_action === "BATCH_LOCALLY"
          ? "Batch commits locally and push without urgency — skip Netlify deploy for this batch."
          : "Review unclassified paths, extend policy rules if appropriate, then re-run npm run buckparts:deploy-classifier.";

  return {
    contract: BUCKPARTS_DEPLOY_BATCHING_POLICY_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    netlify_api_authorized: false,
    deploy_authorized: false,
    generated_at: now().toISOString(),
    source_command: BUCKPARTS_DEPLOY_CLASSIFIER_SOURCE_COMMAND_V1,
    scope,
    scope_range: resolved.scope_range,
    changed_files: resolved.changed_files,
    per_path,
    counts,
    aggregate_classification,
    operator_action,
    operator_summary,
    proven_facts,
    unknown_facts,
    recommended_next_action,
  };
}

export function parseDeployClassifierCliArgsV1(argv: readonly string[]): {
  scope: DeployClassifierScopeV1;
  range: string | null;
  paths: string[];
  summaryOnly: boolean;
} {
  let scope: DeployClassifierScopeV1 = "push-ahead";
  let range: string | null = null;
  const paths: string[] = [];
  let summaryOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--summary-only") {
      summaryOnly = true;
      continue;
    }
    if (arg === "--scope" && argv[i + 1]) {
      scope = argv[i + 1]! as DeployClassifierScopeV1;
      i += 1;
      continue;
    }
    if (arg === "--range" && argv[i + 1]) {
      range = argv[i + 1]!;
      scope = "range";
      i += 1;
      continue;
    }
    if (arg === "--paths") {
      scope = "paths";
      for (let j = i + 1; j < argv.length; j += 1) {
        if (argv[j]!.startsWith("--")) break;
        paths.push(argv[j]!);
        i = j;
      }
      continue;
    }
    if (arg === "--working-tree") {
      scope = "working-tree";
      continue;
    }
    if (arg === "--staged") {
      scope = "staged";
      continue;
    }
    if (arg === "--push-ahead") {
      scope = "push-ahead";
      continue;
    }
  }

  return { scope, range, paths, summaryOnly };
}
