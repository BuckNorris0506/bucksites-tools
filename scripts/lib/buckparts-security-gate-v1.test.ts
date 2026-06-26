import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BUCKPARTS_SECURITY_GATE_CONTRACT_V1,
  buildBuckpartsSecurityGateMarkdownV1,
  buildBuckpartsSecurityGateReportV1,
  resolveSecurityGateOverallStatusV1,
  resolveSecurityGateSafeToCommitVerdictV1,
  securityGateReportFingerprintV1,
  writeBuckpartsSecurityGateArtifactsV1,
  type SecurityGateCheckV1,
} from "./buckparts-security-gate-v1";

function makeMiniRepo(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "buckparts-security-gate-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  return root;
}

function baseFixtureFiles(): Record<string, string> {
  return {
    "next.config.mjs": `const nextConfig = { experimental: {} };\nexport default nextConfig;\n`,
    "netlify.toml": `[build]\n  command = "npm run buckparts:repo-runtime-convergence:check -- --enforce && npm run build"\n`,
    "package.json": JSON.stringify({ scripts: { "buckparts:ship-guard": "tsx scripts/x.ts" } }),
    "mcp/buckparts-truth/server.ts": `
const READ_ONLY_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false };
server.registerTool("a", { annotations: READ_ONLY_ANNOTATIONS }, () => {});
`,
    "src/app/api/search/route.ts": `export async function GET() { return Response.json({ ok: true }); }\n`,
    "src/app/ownerdashboard/[secret]/page.tsx": `
const expected = process.env.OWNER_DASHBOARD_SECRET;
if (!constantTimeSecretMatch(expected, params.secret)) notFound();
function constantTimeSecretMatch() { return true; }
`,
    "src/lib/site-url/get-required-site-url.ts": `const x = process.env.NEXT_PUBLIC_SITE_URL;\n`,
  };
}

test("contract envelope is read-only with stable contract id", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => ["src/app/api/search/route.ts"],
      runNpmAuditJson: () => ({ status: "ok", payload: { metadata: { vulnerabilities: { critical: 0, high: 0 } } } }),
    },
  });

  assert.equal(report.contract, BUCKPARTS_SECURITY_GATE_CONTRACT_V1);
  assert.equal(report.read_only, true);
  assert.equal(report.data_mutation, false);
  assert.equal(report.mutation_authorized, false);
  assert.equal(report.supabase_mutation_authorized, false);
  assert.equal(report.dependency_upgrade_authorized, false);
  assert.equal(report.automatic_fix_authorized, false);
  assert.equal(report.check_count, 16);
});

test("secret_in_tracked_files FAIL with redacted evidence", () => {
  const root = makeMiniRepo({
    ...baseFixtureFiles(),
    "scripts/leak.txt": "token ghp_abcdefghijklmnopqrstuvwxyz123456",
  });
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => ["scripts/leak.txt"],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });

  const check = report.checks.find((c) => c.check_id === "secret_in_tracked_files");
  assert.equal(check?.status, "FAIL");
  assert.ok(check?.evidence[0]?.detail.includes("ghp_"));
  assert.ok(!check?.evidence[0]?.detail.includes("abcdefghijklmnopqrstuvwxyz123456"));
});

test("secret_in_committed_env_files FAIL when .env tracked", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [".env.local"],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  const check = report.checks.find((c) => c.check_id === "secret_in_committed_env_files");
  assert.equal(check?.status, "FAIL");
});

test("owner_dashboard_secret_gate PASS on fixture pattern", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  assert.equal(
    report.checks.find((c) => c.check_id === "owner_dashboard_secret_gate")?.status,
    "PASS",
  );
});

test("security_headers_repo_config WARN when no headers config", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  assert.equal(
    report.checks.find((c) => c.check_id === "security_headers_repo_config")?.status,
    "WARN",
  );
});

test("public_api_rate_limit WARN without rate limiter", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => ["src/app/api/search/route.ts"],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  assert.equal(
    report.checks.find((c) => c.check_id === "public_api_rate_limit")?.status,
    "WARN",
  );
});

test("mcp_mutation_tool_present FAIL when annotations missing", () => {
  const root = makeMiniRepo({
    ...baseFixtureFiles(),
    "mcp/buckparts-truth/server.ts": `server.registerTool("mutate", { title: "x" }, () => {});`,
  });
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  assert.equal(
    report.checks.find((c) => c.check_id === "mcp_mutation_tool_present")?.status,
    "FAIL",
  );
});

test("security_gate_in_build_chain WARN only in slice 1", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  assert.equal(
    report.checks.find((c) => c.check_id === "security_gate_in_build_chain")?.status,
    "WARN",
  );
});

test("critical FAIL rolls up to NOT_SAFE_TO_COMMIT", () => {
  const checks: SecurityGateCheckV1[] = [
    {
      check_id: "secret_in_tracked_files",
      category: "secret_exposure",
      status: "FAIL",
      severity: "critical",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "x",
      remediation_hint: "x",
    },
  ];
  const overall = resolveSecurityGateOverallStatusV1(checks);
  const verdict = resolveSecurityGateSafeToCommitVerdictV1({ checks, overall_status: overall });
  assert.equal(overall, "FAIL");
  assert.equal(verdict, "NOT_SAFE_TO_COMMIT");
});

test("WARN-only posture can still be SAFE_TO_COMMIT", () => {
  const checks: SecurityGateCheckV1[] = [
    {
      check_id: "security_headers_repo_config",
      category: "http_headers",
      status: "WARN",
      severity: "medium",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "x",
      remediation_hint: "x",
    },
    {
      check_id: "public_api_rate_limit",
      category: "rate_limiting",
      status: "WARN",
      severity: "medium",
      evaluation_layer: "repo_static",
      evidence: [],
      notes: "x",
      remediation_hint: "x",
    },
  ];
  const overall = resolveSecurityGateOverallStatusV1(checks);
  const verdict = resolveSecurityGateSafeToCommitVerdictV1({ checks, overall_status: overall });
  assert.equal(overall, "WARN");
  assert.equal(verdict, "SAFE_TO_COMMIT");
});

test("artifact writer emits json and markdown", () => {
  const root = makeMiniRepo(baseFixtureFiles());
  const report = buildBuckpartsSecurityGateReportV1({
    rootDir: root,
    deps: {
      listTrackedFiles: () => [],
      listRouteFiles: () => [],
      runNpmAuditJson: () => ({ status: "unavailable", detail: "offline" }),
    },
  });
  const written = writeBuckpartsSecurityGateArtifactsV1({ rootDir: root, report });
  assert.equal(written.jsonRelPath, "data/command-center/audits/buckparts-security-gate-v1.json");
  assert.equal(written.mdRelPath, "data/command-center/drafts/buckparts-security-gate-v1.md");
  const md = buildBuckpartsSecurityGateMarkdownV1(report);
  assert.ok(md.includes("BuckParts Security Gate v1"));
  assert.ok(securityGateReportFingerprintV1(report).length === 12);
});
