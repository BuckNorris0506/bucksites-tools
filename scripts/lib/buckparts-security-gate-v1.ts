/**
 * BuckParts Security Gate v1 — read-only repository and deploy-readiness security evaluation.
 * No CSV/Supabase/SQL mutation; no dependency upgrades; no automatic fixes.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { BUCKPARTS_SHIP_GUARD_COMMAND_V1 } from "./buckparts-ship-guard-v1";

export const BUCKPARTS_SECURITY_GATE_CONTRACT_V1 = "buckparts_security_gate_v1" as const;

export const BUCKPARTS_SECURITY_GATE_SOURCE_COMMAND_V1 =
  "npm run buckparts:security-gate" as const;

export const BUCKPARTS_SECURITY_GATE_JSON_REL_V1 =
  "data/command-center/audits/buckparts-security-gate-v1.json" as const;

export const BUCKPARTS_SECURITY_GATE_MD_REL_V1 =
  "data/command-center/drafts/buckparts-security-gate-v1.md" as const;

export const BUCKPARTS_SECURITY_GATE_CC_JQ_PATH_V1 =
  ".command_center_v2.buckparts_security_gate_v1" as const;

export const DEPLOY_BLOCKING_CHECK_IDS_V1 = [
  "secret_in_tracked_files",
  "secret_in_committed_env_files",
  "dangerous_env_in_next_config",
  "mcp_mutation_tool_present",
] as const;

export const NEXT_PUBLIC_ALLOWLIST_V1 = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_GROW_FAVES_SITE_ID",
  "NEXT_PUBLIC_SITE_NAME",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
] as const;

export type SecurityGateStatusV1 = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export type SecurityCategoryV1 =
  | "secret_exposure"
  | "env_leakage"
  | "client_bundle"
  | "http_headers"
  | "rate_limiting"
  | "public_api"
  | "owner_dashboard"
  | "mcp_boundaries"
  | "dependencies"
  | "deploy_safety";

export type SecurityEvaluationLayerV1 =
  | "repo_static"
  | "build_artifact"
  | "live_production"
  | "dependency";

export type SecurityGateSeverityV1 = "critical" | "high" | "medium" | "low";

export type SecurityGateEvidenceV1 = {
  kind: "file_path" | "header" | "route" | "env_var_name" | "pattern_match" | "command_output";
  ref: string;
  detail: string;
  line_number?: number;
};

export type SecurityGateCheckV1 = {
  check_id: string;
  category: SecurityCategoryV1;
  status: SecurityGateStatusV1;
  severity: SecurityGateSeverityV1;
  evaluation_layer: SecurityEvaluationLayerV1;
  evidence: SecurityGateEvidenceV1[];
  notes: string;
  remediation_hint: string;
};

export type SecurityGateCategoryRollupV1 = {
  pass: number;
  warn: number;
  fail: number;
  unknown: number;
};

export type SecurityGateSafeToCommitVerdictV1 =
  | "SAFE_TO_COMMIT"
  | "NOT_SAFE_TO_COMMIT"
  | "UNKNOWN";

export type BuckpartsSecurityGateReportV1 = {
  contract: typeof BUCKPARTS_SECURITY_GATE_CONTRACT_V1;
  read_only: true;
  data_mutation: false;
  mutation_authorized: false;
  supabase_mutation_authorized: false;
  deploy_authorized: false;
  evidence_write_authorized: true;
  dependency_upgrade_authorized: false;
  secret_generation_authorized: false;
  automatic_fix_authorized: false;
  generated_at: string;
  source_command: typeof BUCKPARTS_SECURITY_GATE_SOURCE_COMMAND_V1;
  overall_status: SecurityGateStatusV1;
  deploy_readiness: "SAFE" | "BLOCKED" | "UNKNOWN";
  safe_to_commit_verdict: SecurityGateSafeToCommitVerdictV1;
  check_count: number;
  checks: SecurityGateCheckV1[];
  category_rollups: Record<SecurityCategoryV1, SecurityGateCategoryRollupV1>;
  blockers: string[];
  warnings: string[];
  proven_facts: string[];
  unknown_facts: string[];
  source_paths_read: string[];
  inspect_summary: {
    recommended_jq_paths: {
      standalone_report: ".inspect_summary";
      command_center: typeof BUCKPARTS_SECURITY_GATE_CC_JQ_PATH_V1;
      overall_status: ".overall_status";
      safe_to_commit_verdict: ".safe_to_commit_verdict";
      checks: ".checks";
      blockers: ".blockers";
    };
    recommended_next_action: string;
  };
};

export type BuckpartsSecurityGateDepsV1 = {
  now?: () => Date;
  readText?: (absPath: string) => string | null;
  fileExists?: (absPath: string) => boolean;
  listTrackedFiles?: (rootDir: string) => string[];
  listRouteFiles?: (rootDir: string) => string[];
  runNpmAuditJson?: (rootDir: string) => NpmAuditResultV1;
};

type NpmAuditResultV1 =
  | { status: "ok"; payload: Record<string, unknown> }
  | { status: "unavailable"; detail: string };

const SECRET_SCAN_SKIP_SUFFIXES = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".zip",
  ".pdf",
  ".lock",
] as const;

const SECRET_PATTERNS: Array<{ id: string; regex: RegExp; redactGroup?: number }> = [
  { id: "private_key_pem", regex: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/ },
  { id: "stripe_sk_live", regex: /\bsk_live_[A-Za-z0-9]{10,}/ },
  { id: "github_pat", regex: /\bghp_[A-Za-z0-9]{20,}/ },
  { id: "slack_token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: "aws_access_key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    id: "supabase_service_role_assignment",
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{8,}['"]/,
  },
];

const COMMITTED_ENV_FILE_NAMES = [".env", ".env.local", ".env.production"] as const;

const TEXT_SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".toml",
  ".yml",
  ".yaml",
  ".csv",
  ".sh",
  ".env",
  ".example",
  ".txt",
]);

function defaultReadText(absPath: string): string | null {
  if (!existsSync(absPath)) return null;
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
}

function defaultFileExists(absPath: string): boolean {
  return existsSync(absPath);
}

function defaultListTrackedFiles(rootDir: string): string[] {
  const r = spawnSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8" });
  if (r.status !== 0) return [];
  return r.stdout
    .split("\0")
    .map((f) => f.trim())
    .filter(Boolean)
    .sort();
}

function walkRouteFiles(dirAbs: string, rootDir: string, out: string[]): void {
  if (!existsSync(dirAbs)) return;
  for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      walkRouteFiles(abs, rootDir, out);
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      out.push(path.relative(rootDir, abs).split(path.sep).join("/"));
    }
  }
}

function defaultListRouteFiles(rootDir: string): string[] {
  const routes: string[] = [];
  walkRouteFiles(path.join(rootDir, "src/app"), rootDir, routes);
  return routes.sort();
}

function defaultRunNpmAuditJson(rootDir: string): NpmAuditResultV1 {
  const r = spawnSync("npm", ["audit", "--json"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120_000,
  });
  const stdout = String(r.stdout ?? "").trim();
  if (!stdout) {
    return {
      status: "unavailable",
      detail: r.stderr?.trim() || `npm audit exit ${String(r.status)}`,
    };
  }
  try {
    const payload = JSON.parse(stdout) as Record<string, unknown>;
    return { status: "ok", payload };
  } catch {
    return { status: "unavailable", detail: "npm audit stdout was not valid JSON" };
  }
}

function shouldSkipSecretScan(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.includes("node_modules/")) return true;
  if (normalized.startsWith(".next/")) return true;
  if (normalized === "package-lock.json") return true;
  if (/\.test\.(ts|tsx|js|mjs)$/.test(normalized)) return true;
  if (normalized.startsWith("docs/")) return true;
  for (const suffix of SECRET_SCAN_SKIP_SUFFIXES) {
    if (normalized.endsWith(suffix)) return true;
  }
  return false;
}

function isTextScanCandidate(relPath: string): boolean {
  if (shouldSkipSecretScan(relPath)) return false;
  const ext = path.extname(relPath).toLowerCase();
  return TEXT_SCAN_EXTENSIONS.has(ext) || COMMITTED_ENV_FILE_NAMES.includes(relPath as never);
}

function redactMatch(match: string): string {
  if (match.length <= 12) return `${match.slice(0, 4)}…`;
  return `${match.slice(0, 8)}…${match.slice(-4)}`;
}

function scanTextForSecrets(
  relPath: string,
  text: string,
): SecurityGateEvidenceV1[] {
  const evidence: SecurityGateEvidenceV1[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const pattern of SECRET_PATTERNS) {
      const match = pattern.regex.exec(line);
      if (!match) continue;
      const raw = match[0];
      if (/placeholder|example\.com|your[-_]?key|xxx|changeme|REDACTED/i.test(raw)) continue;
      evidence.push({
        kind: "pattern_match",
        ref: relPath,
        detail: `${pattern.id}: ${redactMatch(raw)}`,
        line_number: i + 1,
      });
      break;
    }
  }
  return evidence;
}

function makeCheck(args: Omit<SecurityGateCheckV1, "status"> & { status: SecurityGateStatusV1 }): SecurityGateCheckV1 {
  return args;
}

function checkSecretInTrackedFiles(args: {
  rootDir: string;
  trackedFiles: string[];
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const evidence: SecurityGateEvidenceV1[] = [];
  for (const rel of args.trackedFiles) {
    if (!isTextScanCandidate(rel)) continue;
    const text = args.readText(path.join(args.rootDir, rel));
    if (text == null) continue;
    evidence.push(...scanTextForSecrets(rel, text));
  }
  const status: SecurityGateStatusV1 = evidence.length > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "secret_in_tracked_files",
    category: "secret_exposure",
    status,
    severity: "critical",
    evaluation_layer: "repo_static",
    evidence: evidence.slice(0, 25),
    notes:
      status === "PASS"
        ? "No high-signal secret patterns in tracked text files (tests/docs/binary paths excluded)."
        : `${evidence.length} suspected secret pattern(s) in tracked files.`,
    remediation_hint: "Remove secrets from git history; rotate exposed credentials; use env vars server-side only.",
  });
}

function checkSecretInCommittedEnvFiles(trackedFiles: string[]): SecurityGateCheckV1 {
  const hits = COMMITTED_ENV_FILE_NAMES.filter((name) => trackedFiles.includes(name));
  const evidence = hits.map((name) => ({
    kind: "file_path" as const,
    ref: name,
    detail: "env file is tracked by git",
  }));
  const status: SecurityGateStatusV1 = hits.length > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "secret_in_committed_env_files",
    category: "secret_exposure",
    status,
    severity: "critical",
    evaluation_layer: "repo_static",
    evidence,
    notes:
      status === "PASS"
        ? "No .env / .env.local / .env.production files are git-tracked."
        : "Committed env files can leak secrets — keep them gitignored.",
    remediation_hint: "Untrack env files, add to .gitignore, rotate any exposed values.",
  });
}

function checkSecretInDataArtifacts(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const dataDir = path.join(args.rootDir, "data");
  const evidence: SecurityGateEvidenceV1[] = [];
  const walk = (dirAbs: string, relPrefix: string) => {
    if (!existsSync(dirAbs)) return;
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      const rel = path.posix.join(relPrefix, entry.name);
      const abs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      if (!rel.endsWith(".json")) continue;
      const text = args.readText(abs);
      if (text == null) continue;
      evidence.push(...scanTextForSecrets(rel, text));
    }
  };
  walk(dataDir, "data");
  const status: SecurityGateStatusV1 = evidence.length > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "secret_in_data_artifacts",
    category: "secret_exposure",
    status,
    severity: "high",
    evaluation_layer: "repo_static",
    evidence: evidence.slice(0, 25),
    notes:
      status === "PASS"
        ? "No high-signal secret patterns in data/**/*.json artifacts."
        : `${evidence.length} suspected secret pattern(s) in data JSON artifacts.`,
    remediation_hint: "Redact or remove credential-shaped values from committed data artifacts.",
  });
}

function checkDangerousEnvInNextConfig(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "next.config.mjs";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "dangerous_env_in_next_config",
      category: "env_leakage",
      status: "UNKNOWN",
      severity: "critical",
      evaluation_layer: "repo_static",
      evidence: [{ kind: "file_path", ref: rel, detail: "next.config.mjs not readable" }],
      notes: "Could not read next.config.mjs.",
      remediation_hint: "Ensure next.config.mjs exists and does not expose server secrets via env: block.",
    });
  }
  const evidence: SecurityGateEvidenceV1[] = [];
  const envBlockMatch = /env\s*:\s*\{([^}]*)\}/s.exec(text);
  if (envBlockMatch) {
    const block = envBlockMatch[1] ?? "";
    const serverSecretRefs = block.match(/process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]+/g) ?? [];
    for (const ref of serverSecretRefs) {
      evidence.push({
        kind: "env_var_name",
        ref: rel,
        detail: `env block references ${ref}`,
      });
    }
  }
  const inlineServerEnv =
    text.match(/process\.env\.(SUPABASE_SERVICE_ROLE_KEY|SENTRY_DSN|OPENAI_API_KEY)/g) ?? [];
  for (const ref of inlineServerEnv) {
    if (ref.includes("NEXT_PUBLIC")) continue;
    evidence.push({
      kind: "env_var_name",
      ref: rel,
      detail: `config references ${ref}`,
    });
  }
  const status: SecurityGateStatusV1 = evidence.length > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "dangerous_env_in_next_config",
    category: "env_leakage",
    status,
    severity: "critical",
    evaluation_layer: "repo_static",
    evidence,
    notes:
      status === "PASS"
        ? "next.config.mjs does not map non-NEXT_PUBLIC server secrets into client env."
        : "Server-only env vars may be exposed to the client bundle via next.config env mapping.",
    remediation_hint: "Remove server secrets from next.config env/client exposure; keep SERVICE_ROLE server-only.",
  });
}

function checkNextPublicSurfaceAudit(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
  listRouteFiles: (rootDir: string) => string[];
}): SecurityGateCheckV1 {
  const srcDir = path.join(args.rootDir, "src");
  const found = new Set<string>();
  const walk = (dirAbs: string) => {
    if (!existsSync(dirAbs)) return;
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
      const text = args.readText(abs);
      if (text == null) continue;
      for (const match of text.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
        const key = match[1];
        if (key) found.add(key);
      }
    }
  };
  walk(srcDir);
  const allowlist = new Set<string>(NEXT_PUBLIC_ALLOWLIST_V1);
  const unexpected = [...found].filter((k) => !allowlist.has(k)).sort();
  const evidence: SecurityGateEvidenceV1[] = [
    ...[...found].sort().map((key) => ({
      kind: "env_var_name" as const,
      ref: "src/",
      detail: key,
    })),
    ...unexpected.map((key) => ({
      kind: "env_var_name" as const,
      ref: "src/",
      detail: `unexpected public env: ${key}`,
    })),
  ];
  const status: SecurityGateStatusV1 = unexpected.length > 0 ? "WARN" : "PASS";
  return makeCheck({
    check_id: "next_public_surface_audit",
    category: "client_bundle",
    status,
    severity: "medium",
    evaluation_layer: "repo_static",
    evidence,
    notes:
      unexpected.length > 0
        ? `${unexpected.length} NEXT_PUBLIC_* key(s) outside allowlist in src/.`
        : `All ${found.size} NEXT_PUBLIC_* reference(s) in src/ match allowlist.`,
    remediation_hint: "Document new NEXT_PUBLIC keys in security gate allowlist only when intentionally public.",
  });
}

function checkSecurityHeadersRepoConfig(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
  fileExists: (absPath: string) => boolean;
}): SecurityGateCheckV1 {
  const paths = ["next.config.mjs", "netlify.toml", "src/middleware.ts", "middleware.ts"];
  const evidence: SecurityGateEvidenceV1[] = [];
  let anyHeadersConfig = false;
  for (const rel of paths) {
    const abs = path.join(args.rootDir, rel);
    if (!args.fileExists(abs)) continue;
    evidence.push({ kind: "file_path", ref: rel, detail: "config file present" });
    const text = args.readText(abs);
    if (text == null) continue;
    if (/\bheaders\s*\(/.test(text) || /\[\[headers\]\]/.test(text) || /Content-Security-Policy/i.test(text)) {
      anyHeadersConfig = true;
      evidence.push({ kind: "file_path", ref: rel, detail: "security headers configuration detected" });
    }
  }
  const status: SecurityGateStatusV1 = anyHeadersConfig ? "PASS" : "WARN";
  return makeCheck({
    check_id: "security_headers_repo_config",
    category: "http_headers",
    status,
    severity: "medium",
    evaluation_layer: "repo_static",
    evidence,
    notes: anyHeadersConfig
      ? "Repo declares HTTP security headers in config."
      : "No security headers configuration found in next.config.mjs, netlify.toml, or middleware.",
    remediation_hint: "Add CSP/HSTS/X-Frame-Options via Next headers() or Netlify [[headers]] (separate hardening slice).",
  });
}

function checkPublicApiRateLimit(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "src/app/api/search/route.ts";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "public_api_rate_limit",
      category: "rate_limiting",
      status: "UNKNOWN",
      severity: "medium",
      evaluation_layer: "repo_static",
      evidence: [{ kind: "route", ref: rel, detail: "route file not readable" }],
      notes: "Could not evaluate /api/search rate limiting.",
      remediation_hint: "Add rate limiting middleware for public API routes (future slice).",
    });
  }
  const hasRateLimit = /rateLimit|rate-limit|express-rate-limit|RateLimiter/i.test(text);
  const status: SecurityGateStatusV1 = hasRateLimit ? "PASS" : "WARN";
  return makeCheck({
    check_id: "public_api_rate_limit",
    category: "rate_limiting",
    status,
    severity: "medium",
    evaluation_layer: "repo_static",
    evidence: [{ kind: "route", ref: rel, detail: hasRateLimit ? "rate limit helper present" : "no rate limit detected" }],
    notes: hasRateLimit
      ? "Public search API appears to include rate limiting."
      : "/api/search has no application-level rate limit (observation only).",
    remediation_hint: "Add rate limiting middleware for public API routes (future slice).",
  });
}

function checkApiRouteInventory(routeFiles: string[]): SecurityGateCheckV1 {
  const evidence = routeFiles.map((rel) => ({
    kind: "route" as const,
    ref: rel,
    detail: rel.includes("/api/") ? "public API route" : "route handler",
  }));
  return makeCheck({
    check_id: "api_route_inventory",
    category: "public_api",
    status: "PASS",
    severity: "low",
    evaluation_layer: "repo_static",
    evidence,
    notes: `${routeFiles.length} Next.js route handler(s) inventoried under src/app.`,
    remediation_hint: "Review new route.ts files for auth boundaries before exposing externally.",
  });
}

function checkApiErrorLeakage(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "src/app/api/search/route.ts";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "api_error_leakage",
      category: "public_api",
      status: "UNKNOWN",
      severity: "low",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "Could not read search API route.",
      remediation_hint: "Return generic 500 messages to clients; log details server-side only.",
    });
  }
  const leaks = /e instanceof Error \? e\.message/.test(text);
  const status: SecurityGateStatusV1 = leaks ? "WARN" : "PASS";
  return makeCheck({
    check_id: "api_error_leakage",
    category: "public_api",
    status,
    severity: "low",
    evaluation_layer: "repo_static",
    evidence: leaks
      ? [{ kind: "file_path", ref: rel, detail: "500 JSON includes raw Error.message" }]
      : [],
    notes: leaks
      ? "Search API may return internal error messages in JSON 500 responses."
      : "Search API does not appear to leak raw Error.message in responses.",
    remediation_hint: "Return generic 500 messages to clients; log details server-side only.",
  });
}

function checkOwnerDashboardSecretGate(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "src/app/ownerdashboard/[secret]/page.tsx";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "owner_dashboard_secret_gate",
      category: "owner_dashboard",
      status: "UNKNOWN",
      severity: "high",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "Owner dashboard page not readable.",
      remediation_hint: "Gate owner dashboard with OWNER_DASHBOARD_SECRET and constant-time compare.",
    });
  }
  const hasSecret = text.includes("OWNER_DASHBOARD_SECRET");
  const hasCompare = text.includes("constantTimeSecretMatch");
  const hasNotFound = text.includes("notFound()");
  const ok = hasSecret && hasCompare && hasNotFound;
  const status: SecurityGateStatusV1 = ok ? "PASS" : "FAIL";
  return makeCheck({
    check_id: "owner_dashboard_secret_gate",
    category: "owner_dashboard",
    status,
    severity: "high",
    evaluation_layer: "repo_static",
    evidence: [
      { kind: "file_path", ref: rel, detail: `OWNER_DASHBOARD_SECRET=${String(hasSecret)}` },
      { kind: "file_path", ref: rel, detail: `constantTimeSecretMatch=${String(hasCompare)}` },
      { kind: "file_path", ref: rel, detail: `notFound()=${String(hasNotFound)}` },
    ],
    notes: ok
      ? "Owner dashboard uses secret env gate with constant-time compare and notFound() on mismatch."
      : "Owner dashboard secret gate pattern incomplete.",
    remediation_hint: "Require OWNER_DASHBOARD_SECRET and constant-time compare; return 404 on mismatch.",
  });
}

function parseMcpToolBlocks(serverText: string): Array<{ name: string; annotationsText: string }> {
  const tools: Array<{ name: string; annotationsText: string }> = [];
  const registerRe = /server\.registerTool\(\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = registerRe.exec(serverText)) !== null) {
    const name = match[1] ?? "UNKNOWN";
    const start = match.index;
    const slice = serverText.slice(start, start + 1200);
    const annotationsMatch = /annotations\s*:\s*(\{[\s\S]*?\}|READ_ONLY_ANNOTATIONS)/.exec(slice);
    tools.push({
      name,
      annotationsText: annotationsMatch?.[1] ?? "MISSING",
    });
  }
  return tools;
}

function checkMcpReadOnlyAnnotations(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "mcp/buckparts-truth/server.ts";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "mcp_read_only_annotations",
      category: "mcp_boundaries",
      status: "UNKNOWN",
      severity: "high",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "MCP server source not readable.",
      remediation_hint: "All MCP tools must declare readOnlyHint: true.",
    });
  }
  const tools = parseMcpToolBlocks(text);
  const missing = tools.filter(
    (t) => !/readOnlyHint\s*:\s*true/.test(t.annotationsText) && t.annotationsText !== "READ_ONLY_ANNOTATIONS",
  );
  const status: SecurityGateStatusV1 =
    tools.length === 0 ? "UNKNOWN" : missing.length === 0 ? "PASS" : "FAIL";
  return makeCheck({
    check_id: "mcp_read_only_annotations",
    category: "mcp_boundaries",
    status,
    severity: "high",
    evaluation_layer: "repo_static",
    evidence: tools.map((t) => ({
      kind: "file_path" as const,
      ref: rel,
      detail: `tool ${t.name} annotations=${t.annotationsText === "READ_ONLY_ANNOTATIONS" ? "READ_ONLY_ANNOTATIONS" : t.annotationsText.slice(0, 80)}`,
    })),
    notes:
      status === "PASS"
        ? `${tools.length} MCP tool registration(s) use read-only annotations.`
        : `${missing.length} MCP tool(s) missing readOnlyHint: true.`,
    remediation_hint: "Set READ_ONLY_ANNOTATIONS on every buckparts-truth MCP tool.",
  });
}

function checkMcpMutationToolPresent(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "mcp/buckparts-truth/server.ts";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "mcp_mutation_tool_present",
      category: "mcp_boundaries",
      status: "UNKNOWN",
      severity: "critical",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "MCP server source not readable.",
      remediation_hint: "MCP truth server must remain read-only; no mutation tools.",
    });
  }
  const tools = parseMcpToolBlocks(text);
  const mutationTools = tools.filter((t) => {
    if (t.annotationsText === "READ_ONLY_ANNOTATIONS") return false;
    return (
      /readOnlyHint\s*:\s*false/.test(t.annotationsText) ||
      /destructiveHint\s*:\s*true/.test(t.annotationsText) ||
      t.annotationsText === "MISSING"
    );
  });
  const status: SecurityGateStatusV1 =
    tools.length === 0 ? "UNKNOWN" : mutationTools.length > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "mcp_mutation_tool_present",
    category: "mcp_boundaries",
    status,
    severity: "critical",
    evaluation_layer: "repo_static",
    evidence: mutationTools.map((t) => ({
      kind: "file_path" as const,
      ref: rel,
      detail: `mutation-capable or unannotated tool: ${t.name}`,
    })),
    notes:
      status === "PASS"
        ? "No MCP mutation tools detected in buckparts-truth server."
        : `${mutationTools.length} MCP tool(s) lack read-only boundaries.`,
    remediation_hint: "Remove or annotate mutation MCP tools; buckparts-truth must stay read-only.",
  });
}

function countNpmAuditSeverities(payload: Record<string, unknown>): { critical: number; high: number } {
  let critical = 0;
  let high = 0;
  const vulnerabilities = payload.vulnerabilities;
  if (typeof vulnerabilities !== "object" || vulnerabilities === null) {
    const metadata = payload.metadata as Record<string, unknown> | undefined;
    const vulns = metadata?.vulnerabilities as Record<string, number> | undefined;
    if (vulns) {
      critical = vulns.critical ?? 0;
      high = vulns.high ?? 0;
    }
    return { critical, high };
  }
  for (const entry of Object.values(vulnerabilities as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null) continue;
    const severity = String((entry as Record<string, unknown>).severity ?? "").toLowerCase();
    if (severity === "critical") critical += 1;
    if (severity === "high") high += 1;
  }
  return { critical, high };
}

function checkNpmAuditCriticalHigh(args: {
  rootDir: string;
  runNpmAuditJson: (rootDir: string) => NpmAuditResultV1;
}): SecurityGateCheckV1 {
  const audit = args.runNpmAuditJson(args.rootDir);
  if (audit.status === "unavailable") {
    return makeCheck({
      check_id: "npm_audit_critical_high",
      category: "dependencies",
      status: "UNKNOWN",
      severity: "high",
      evaluation_layer: "dependency",
      evidence: [{ kind: "command_output", ref: "npm audit --json", detail: audit.detail }],
      notes: "npm audit JSON unavailable; dependency risk UNKNOWN.",
      remediation_hint: "Run npm audit locally or wire CI audit artifact (read-only).",
    });
  }
  const { critical, high } = countNpmAuditSeverities(audit.payload);
  const status: SecurityGateStatusV1 = critical > 0 || high > 0 ? "FAIL" : "PASS";
  return makeCheck({
    check_id: "npm_audit_critical_high",
    category: "dependencies",
    status,
    severity: "high",
    evaluation_layer: "dependency",
    evidence: [
      {
        kind: "command_output",
        ref: "npm audit --json",
        detail: `critical=${critical}; high=${high}`,
      },
    ],
    notes:
      status === "PASS"
        ? "npm audit reports no critical/high production vulnerabilities."
        : `npm audit reports critical=${critical}, high=${high}.`,
    remediation_hint: "Review npm audit output; remediate in a dedicated dependency slice (gate does not auto-fix).",
  });
}

function deployPreflightScriptText(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): string | null {
  const packageText = args.readText(path.join(args.rootDir, "package.json"));
  if (packageText == null) return null;
  try {
    const parsed = JSON.parse(packageText) as { scripts?: Record<string, string> };
    return parsed.scripts?.["buckparts:deploy:preflight"] ?? null;
  } catch {
    return null;
  }
}

function checkNetlifyBuildEnforceChain(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "netlify.toml";
  const text = args.readText(path.join(args.rootDir, rel));
  if (text == null) {
    return makeCheck({
      check_id: "netlify_build_enforce_chain",
      category: "deploy_safety",
      status: "UNKNOWN",
      severity: "high",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "netlify.toml not readable.",
      remediation_hint:
        "Netlify build should run buckparts:deploy:preflight (MCP audit + convergence --enforce) before npm run build.",
    });
  }
  const hasBuild = text.includes("npm run build");
  const hasDeployPreflight = text.includes("buckparts:deploy:preflight");
  const preflightScript = deployPreflightScriptText(args);
  const preflightHasMcpAudit =
    preflightScript != null && preflightScript.includes("buckparts:mcp-supabase-exposure:audit");
  const preflightHasConvergence =
    preflightScript != null &&
    preflightScript.includes("buckparts:repo-runtime-convergence:check") &&
    preflightScript.includes("--enforce");
  const ok =
    hasBuild &&
    hasDeployPreflight &&
    preflightHasMcpAudit &&
    preflightHasConvergence;
  const status: SecurityGateStatusV1 = ok ? "PASS" : "FAIL";
  return makeCheck({
    check_id: "netlify_build_enforce_chain",
    category: "deploy_safety",
    status,
    severity: "high",
    evaluation_layer: "repo_static",
    evidence: [
      { kind: "file_path", ref: rel, detail: `deploy_preflight=${String(hasDeployPreflight)}` },
      { kind: "file_path", ref: rel, detail: `npm_run_build=${String(hasBuild)}` },
      {
        kind: "file_path",
        ref: "package.json",
        detail: `preflight_mcp_audit=${String(preflightHasMcpAudit)}`,
      },
      {
        kind: "file_path",
        ref: "package.json",
        detail: `preflight_convergence_enforce=${String(preflightHasConvergence)}`,
      },
    ],
    notes: ok
      ? "Netlify build runs buckparts:deploy:preflight (MCP audit + convergence --enforce) before npm run build."
      : "Netlify build chain missing deploy preflight, MCP audit, convergence enforce, or build step.",
    remediation_hint:
      "Keep npm run buckparts:deploy:preflight && npm run build in netlify.toml with package.json preflight chaining MCP audit and convergence --enforce.",
  });
}

function checkMcpSupabaseExposureAuditInBuildChain(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const netlifyRel = "netlify.toml";
  const netlifyText = args.readText(path.join(args.rootDir, netlifyRel)) ?? "";
  const wiredInNetlify = netlifyText.includes("buckparts:deploy:preflight");
  const preflightScript = deployPreflightScriptText(args);
  const wiredInPreflight =
    preflightScript != null && preflightScript.includes("buckparts:mcp-supabase-exposure:audit");
  const wired = wiredInNetlify && wiredInPreflight;
  return makeCheck({
    check_id: "mcp_supabase_exposure_audit_in_build_chain",
    category: "deploy_safety",
    status: wired ? "PASS" : "WARN",
    severity: "high",
    evaluation_layer: "repo_static",
    evidence: [
      { kind: "file_path", ref: netlifyRel, detail: `deploy_preflight=${String(wiredInNetlify)}` },
      {
        kind: "file_path",
        ref: "package.json",
        detail: `preflight_mcp_audit=${String(wiredInPreflight)}`,
      },
    ],
    notes: wired
      ? "MCP/Supabase extraction audit is wired into Netlify deploy preflight chain."
      : "MCP/Supabase extraction audit is not wired into Netlify deploy preflight chain.",
    remediation_hint:
      "Wire npm run buckparts:mcp-supabase-exposure:audit into buckparts:deploy:preflight and netlify.toml.",
  });
}

function checkShipGuardAvailable(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "package.json";
  const text = args.readText(path.join(args.rootDir, rel));
  const hasScript = text != null && text.includes('"buckparts:ship-guard"');
  const status: SecurityGateStatusV1 = hasScript ? "PASS" : "FAIL";
  return makeCheck({
    check_id: "ship_guard_available",
    category: "deploy_safety",
    status,
    severity: "low",
    evaluation_layer: "repo_static",
    evidence: [
      {
        kind: "file_path",
        ref: rel,
        detail: hasScript ? BUCKPARTS_SHIP_GUARD_COMMAND_V1 : "buckparts:ship-guard script missing",
      },
    ],
    notes: hasScript
      ? `Ship guard CLI available (${BUCKPARTS_SHIP_GUARD_COMMAND_V1}).`
      : "buckparts:ship-guard npm script missing.",
    remediation_hint: "Restore buckparts:ship-guard for pre-push protected-file checks.",
  });
}

function checkSecurityGateInBuildChain(args: {
  rootDir: string;
  readText: (absPath: string) => string | null;
}): SecurityGateCheckV1 {
  const rel = "netlify.toml";
  const text = args.readText(path.join(args.rootDir, rel)) ?? "";
  const wired = text.includes("buckparts:security-gate");
  return makeCheck({
    check_id: "security_gate_in_build_chain",
    category: "deploy_safety",
    status: wired ? "PASS" : "WARN",
    severity: "low",
    evaluation_layer: "repo_static",
    evidence: [{ kind: "file_path", ref: rel, detail: wired ? "security gate in build chain" : "not wired yet (slice 1)" }],
    notes: wired
      ? "Security gate is wired into Netlify build chain."
      : "Security gate not yet wired into Netlify build/CI enforce chain (expected for slice 1).",
    remediation_hint: "Wire buckparts:security-gate --enforce into CI after slice 1 stabilizes.",
  });
}

function emptyCategoryRollups(): Record<SecurityCategoryV1, SecurityGateCategoryRollupV1> {
  const categories: SecurityCategoryV1[] = [
    "secret_exposure",
    "env_leakage",
    "client_bundle",
    "http_headers",
    "rate_limiting",
    "public_api",
    "owner_dashboard",
    "mcp_boundaries",
    "dependencies",
    "deploy_safety",
  ];
  return Object.fromEntries(
    categories.map((c) => [c, { pass: 0, warn: 0, fail: 0, unknown: 0 }]),
  ) as Record<SecurityCategoryV1, SecurityGateCategoryRollupV1>;
}

function rollupCategories(checks: SecurityGateCheckV1[]): Record<SecurityCategoryV1, SecurityGateCategoryRollupV1> {
  const rollups = emptyCategoryRollups();
  for (const check of checks) {
    const bucket = rollups[check.category];
    if (check.status === "PASS") bucket.pass += 1;
    else if (check.status === "WARN") bucket.warn += 1;
    else if (check.status === "FAIL") bucket.fail += 1;
    else bucket.unknown += 1;
  }
  return rollups;
}

export function resolveSecurityGateOverallStatusV1(checks: SecurityGateCheckV1[]): SecurityGateStatusV1 {
  const unknownCount = checks.filter((c) => c.status === "UNKNOWN").length;
  if (checks.length > 0 && unknownCount / checks.length > 0.5) return "UNKNOWN";

  const criticalFails = checks.filter((c) => c.severity === "critical" && c.status === "FAIL");
  if (criticalFails.length > 0) return "FAIL";

  const highFails = checks.filter((c) => c.severity === "high" && c.status === "FAIL");
  const mediumFails = checks.filter((c) => c.severity === "medium" && c.status === "FAIL");
  if (highFails.length > 0 || mediumFails.length >= 3) return "WARN";

  const anyWarn = checks.some((c) => c.status === "WARN");
  const anyFail = checks.some((c) => c.status === "FAIL");
  if (anyFail) return "WARN";
  if (anyWarn) return "WARN";
  return "PASS";
}

export function resolveSecurityGateSafeToCommitVerdictV1(args: {
  checks: SecurityGateCheckV1[];
  overall_status: SecurityGateStatusV1;
}): SecurityGateSafeToCommitVerdictV1 {
  if (args.overall_status === "UNKNOWN") return "UNKNOWN";
  const blocking = args.checks.filter(
    (c) =>
      (DEPLOY_BLOCKING_CHECK_IDS_V1 as readonly string[]).includes(c.check_id) && c.status === "FAIL",
  );
  if (args.overall_status === "FAIL" || blocking.length > 0) return "NOT_SAFE_TO_COMMIT";
  return "SAFE_TO_COMMIT";
}

export function buildBuckpartsSecurityGateReportV1(args: {
  rootDir: string;
  deps?: BuckpartsSecurityGateDepsV1;
}): BuckpartsSecurityGateReportV1 {
  const rootDir = path.resolve(args.rootDir);
  const now = args.deps?.now ?? (() => new Date());
  const readText = args.deps?.readText ?? defaultReadText;
  const fileExists = args.deps?.fileExists ?? defaultFileExists;
  const listTrackedFiles = args.deps?.listTrackedFiles ?? defaultListTrackedFiles;
  const listRouteFiles = args.deps?.listRouteFiles ?? defaultListRouteFiles;
  const runNpmAuditJson = args.deps?.runNpmAuditJson ?? defaultRunNpmAuditJson;

  const trackedFiles = listTrackedFiles(rootDir);
  const routeFiles = listRouteFiles(rootDir);
  const source_paths_read = Array.from(
    new Set([
      "next.config.mjs",
      "netlify.toml",
      "package.json",
      "mcp/buckparts-truth/server.ts",
      "src/app/api/search/route.ts",
      "src/app/ownerdashboard/[secret]/page.tsx",
      ...trackedFiles.slice(0, 50),
      ...routeFiles,
    ]),
  ).sort();

  const checks: SecurityGateCheckV1[] = [
    checkSecretInTrackedFiles({ rootDir, trackedFiles, readText }),
    checkSecretInCommittedEnvFiles(trackedFiles),
    checkSecretInDataArtifacts({ rootDir, readText }),
    checkDangerousEnvInNextConfig({ rootDir, readText }),
    checkNextPublicSurfaceAudit({ rootDir, readText, listRouteFiles }),
    checkSecurityHeadersRepoConfig({ rootDir, readText, fileExists }),
    checkPublicApiRateLimit({ rootDir, readText }),
    checkApiRouteInventory(routeFiles),
    checkApiErrorLeakage({ rootDir, readText }),
    checkOwnerDashboardSecretGate({ rootDir, readText }),
    checkMcpReadOnlyAnnotations({ rootDir, readText }),
    checkMcpMutationToolPresent({ rootDir, readText }),
    checkNpmAuditCriticalHigh({ rootDir, runNpmAuditJson }),
    checkNetlifyBuildEnforceChain({ rootDir, readText }),
    checkMcpSupabaseExposureAuditInBuildChain({ rootDir, readText }),
    checkShipGuardAvailable({ rootDir, readText }),
    checkSecurityGateInBuildChain({ rootDir, readText }),
  ];

  const overall_status = resolveSecurityGateOverallStatusV1(checks);
  const safe_to_commit_verdict = resolveSecurityGateSafeToCommitVerdictV1({ checks, overall_status });
  const blockers = checks
    .filter((c) => c.status === "FAIL")
    .map((c) => `${c.check_id}:${c.notes}`);
  const warnings = checks
    .filter((c) => c.status === "WARN")
    .map((c) => `${c.check_id}:${c.notes}`);

  const deploy_readiness: BuckpartsSecurityGateReportV1["deploy_readiness"] =
    safe_to_commit_verdict === "NOT_SAFE_TO_COMMIT"
      ? "BLOCKED"
      : safe_to_commit_verdict === "SAFE_TO_COMMIT"
        ? "SAFE"
        : "UNKNOWN";

  const proven_facts = [
    "buckparts_security_gate_v1 is read-only; no CSV, Supabase, SQL, or production mutation.",
    `Evaluated ${checks.length} security checks across repo_static and dependency layers.`,
    `overall_status=${overall_status}; safe_to_commit_verdict=${safe_to_commit_verdict}.`,
    `Tracked files scanned for secrets: ${trackedFiles.filter(isTextScanCandidate).length} text candidate(s).`,
    `Route inventory: ${routeFiles.length} handler(s).`,
  ];

  const unknown_facts = checks
    .filter((c) => c.status === "UNKNOWN")
    .map((c) => `UNKNOWN: ${c.check_id} — ${c.notes}`);

  let recommended_next_action: string;
  if (safe_to_commit_verdict === "NOT_SAFE_TO_COMMIT") {
    recommended_next_action =
      "Resolve FAIL blockers before commit/deploy; re-run npm run buckparts:security-gate. Gate does not auto-fix.";
  } else if (overall_status === "WARN") {
    recommended_next_action =
      "Review WARN findings (headers, rate limits, API error leakage); hardening slices are separate from this gate.";
  } else if (safe_to_commit_verdict === "UNKNOWN") {
    recommended_next_action = "Re-run gate with npm audit available; resolve UNKNOWN checks before trusting verdict.";
  } else {
    recommended_next_action = "Security gate PASS; continue normal ship-guard and command-center workflow.";
  }

  return {
    contract: BUCKPARTS_SECURITY_GATE_CONTRACT_V1,
    read_only: true,
    data_mutation: false,
    mutation_authorized: false,
    supabase_mutation_authorized: false,
    deploy_authorized: false,
    evidence_write_authorized: true,
    dependency_upgrade_authorized: false,
    secret_generation_authorized: false,
    automatic_fix_authorized: false,
    generated_at: now().toISOString(),
    source_command: BUCKPARTS_SECURITY_GATE_SOURCE_COMMAND_V1,
    overall_status,
    deploy_readiness,
    safe_to_commit_verdict,
    check_count: checks.length,
    checks,
    category_rollups: rollupCategories(checks),
    blockers,
    warnings,
    proven_facts,
    unknown_facts,
    source_paths_read,
    inspect_summary: {
      recommended_jq_paths: {
        standalone_report: ".inspect_summary",
        command_center: BUCKPARTS_SECURITY_GATE_CC_JQ_PATH_V1,
        overall_status: ".overall_status",
        safe_to_commit_verdict: ".safe_to_commit_verdict",
        checks: ".checks",
        blockers: ".blockers",
      },
      recommended_next_action,
    },
  };
}

export function buildBuckpartsSecurityGateMarkdownV1(report: BuckpartsSecurityGateReportV1): string {
  const lines: string[] = [
    "# BuckParts Security Gate v1",
    "",
    `- generated_at: **${report.generated_at}**`,
    `- overall_status: **${report.overall_status}**`,
    `- deploy_readiness: **${report.deploy_readiness}**`,
    `- safe_to_commit_verdict: **${report.safe_to_commit_verdict}**`,
    `- check_count: **${report.check_count}**`,
    "",
    "## Category rollups",
    "",
  ];

  for (const [category, rollup] of Object.entries(report.category_rollups)) {
    lines.push(
      `- **${category}**: pass=${rollup.pass} warn=${rollup.warn} fail=${rollup.fail} unknown=${rollup.unknown}`,
    );
  }

  lines.push("", "## Blockers", "");
  if (report.blockers.length === 0) lines.push("- none");
  else for (const b of report.blockers) lines.push(`- ${b}`);

  lines.push("", "## Warnings", "");
  if (report.warnings.length === 0) lines.push("- none");
  else for (const w of report.warnings) lines.push(`- ${w}`);

  lines.push("", "## Checks", "");
  for (const check of report.checks) {
    lines.push(
      `### ${check.check_id}`,
      `- status: **${check.status}**`,
      `- category: ${check.category}`,
      `- severity: ${check.severity}`,
      `- notes: ${check.notes}`,
      "",
    );
  }

  lines.push("## Recommended next action", "", report.inspect_summary.recommended_next_action, "");
  return lines.join("\n");
}

export function writeBuckpartsSecurityGateArtifactsV1(args: {
  rootDir: string;
  report: BuckpartsSecurityGateReportV1;
}): { jsonRelPath: string; mdRelPath: string } {
  const jsonAbs = path.join(args.rootDir, BUCKPARTS_SECURITY_GATE_JSON_REL_V1);
  const mdAbs = path.join(args.rootDir, BUCKPARTS_SECURITY_GATE_MD_REL_V1);
  mkdirSync(path.dirname(jsonAbs), { recursive: true });
  mkdirSync(path.dirname(mdAbs), { recursive: true });
  writeFileSync(jsonAbs, `${JSON.stringify(args.report, null, 2)}\n`, "utf8");
  writeFileSync(mdAbs, `${buildBuckpartsSecurityGateMarkdownV1(args.report)}\n`, "utf8");
  return { jsonRelPath: BUCKPARTS_SECURITY_GATE_JSON_REL_V1, mdRelPath: BUCKPARTS_SECURITY_GATE_MD_REL_V1 };
}

export function securityGateReportFingerprintV1(report: BuckpartsSecurityGateReportV1): string {
  const stable = {
    contract: report.contract,
    check_ids: report.checks.map((c) => ({ id: c.check_id, status: c.status })),
    overall_status: report.overall_status,
    safe_to_commit_verdict: report.safe_to_commit_verdict,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 12);
}
