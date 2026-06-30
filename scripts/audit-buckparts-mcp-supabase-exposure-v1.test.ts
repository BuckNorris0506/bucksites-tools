import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  auditMcpControlPlaneLiveBuildGuardV1,
  auditMcpSupabaseExposureV1,
  auditMcpSupabaseImportSurfacesV1,
  enforceMcpSupabaseExposureAuditV1,
} from "./audit-buckparts-mcp-supabase-exposure-v1";

test("auditMcpSupabaseImportSurfacesV1 fails when MCP file imports supabase-admin", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mcp-exposure-import-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    writeFileSync(
      path.join(root, "scripts/lib/buckparts-mcp-tools-v2.ts"),
      `import { getSupabaseAdmin } from "./supabase-admin";\n`,
      "utf8",
    );
    const blockers = auditMcpSupabaseImportSurfacesV1({ rootDir: root });
    assert.ok(blockers.some((b) => b.includes("mcp_supabase_admin_import_forbidden")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auditMcpSupabaseExposureV1 fails on public MCP listen surface when enforced", () => {
  const root = process.cwd();
  const tempMcp = mkdtempSync(path.join(tmpdir(), "mcp-exposure-listen-"));
  try {
    writeFileSync(
      path.join(tempMcp, ".mcp.json"),
      JSON.stringify({ listen: "0.0.0.0:8080" }, null, 2),
      "utf8",
    );
    const fileExists = (abs: string) => {
      if (abs.endsWith(`${path.sep}.mcp.json`) || abs.endsWith("/.mcp.json")) return true;
      return existsSync(abs);
    };
    const readText = (abs: string) => {
      if (abs.endsWith(`${path.sep}.mcp.json`) || abs.endsWith("/.mcp.json")) {
        return readFileSync(path.join(tempMcp, ".mcp.json"), "utf8");
      }
      return readFileSync(abs, "utf8");
    };
    const report = auditMcpSupabaseExposureV1({
      rootDir: root,
      enforce: true,
      fileExists,
      readText,
    });
    assert.equal(report.status, "FAIL");
    assert.ok(report.blockers.includes("public_mcp_listen_surface_detected"));
    assert.ok(report.warnings.some((w) => w.includes("supabase_anon_catalog_read_surface")));
  } finally {
    rmSync(tempMcp, { recursive: true, force: true });
  }
});

test("enforceMcpSupabaseExposureAuditV1 passes on repo root", () => {
  const report = enforceMcpSupabaseExposureAuditV1({ rootDir: process.cwd() });
  assert.equal(report.status, "PASS");
  assert.equal(report.enforce, true);
  assert.equal(report.blockers.length, 0);
});

test("auditMcpControlPlaneLiveBuildGuardV1 requires escape hatch before live build", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mcp-exposure-guard-"));
  try {
    mkdirSync(path.join(root, "scripts/lib"), { recursive: true });
    writeFileSync(
      path.join(root, "scripts/lib/buckparts-mcp-control-plane-v1.ts"),
      `export const MCP_SUPABASE_EXTRACTION_BLOCKED_LIVE_BUILD_V1 = "x";
export async function loadCommandCenterForMcpV1() {
  await buildBuckpartsCommandCenterReport({});
}
`,
      "utf8",
    );
    const blockers = auditMcpControlPlaneLiveBuildGuardV1({ rootDir: root });
    assert.ok(blockers.includes("mcp_control_plane_missing_live_cc_escape_hatch"));
    assert.ok(blockers.includes("mcp_control_plane_live_supabase_fallback_without_escape_hatch"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
