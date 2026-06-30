/**
 * Read-only audit: MCP network exposure and Supabase public-read surface.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  auditSupabaseServiceRoleInventoryDriftV1,
  discoverSupabaseServiceRoleWritersV1,
} from "./lib/buckparts-supabase-service-role-inventory-v1";
import { MCP_SUPABASE_EXTRACTION_BLOCKED_LIVE_BUILD_V1 } from "./lib/buckparts-mcp-control-plane-v1";

export const MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1 =
  "buckparts_mcp_supabase_exposure_audit_v1" as const;

export type ExposureClassificationV1 =
  | "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE"
  | "SHOULD_FIX_BEFORE_SCALE"
  | "NOT_PROVEN";

export type McpSupabaseExposureAuditV1 = {
  contract: typeof MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1;
  enforce: boolean;
  status: "PASS" | "FAIL";
  mcp_config_files_found: string[];
  public_mcp_server_exposure: ExposureClassificationV1;
  supabase_anon_client_in_app: ExposureClassificationV1;
  catalog_scrape_risk: ExposureClassificationV1;
  blockers: string[];
  warnings: string[];
  proven_facts: string[];
  not_proven_facts: string[];
  recommended_next_action: string;
};

const MCP_SUPABASE_IMPORT_RE =
  /from\s+["'].*supabase-admin["']|getSupabaseAdmin\s*\(/;

const PUBLIC_MCP_LISTEN_RE = /0\.0\.0\.0|public.*mcp|listen.*0\.0\.0\.0/i;

function listMcpSurfaceRelPaths(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const relPaths: string[] = [];

  const mcpDir = path.join(args.rootDir, "mcp");
  if (fileExists(mcpDir)) {
    const walk = (abs: string, rel: string): void => {
      for (const entry of readdirSync(abs, { withFileTypes: true })) {
        const entryAbs = path.join(abs, entry.name);
        const entryRel = path.posix.join(rel, entry.name);
        if (entry.isDirectory()) walk(entryAbs, entryRel);
        else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          relPaths.push(entryRel);
        }
      }
    };
    walk(mcpDir, "mcp");
  }

  const scriptsLib = path.join(args.rootDir, "scripts/lib");
  if (fileExists(scriptsLib)) {
    for (const entry of readdirSync(scriptsLib, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
        continue;
      }
      if (entry.name.startsWith("buckparts-mcp")) {
        relPaths.push(path.posix.join("scripts/lib", entry.name));
      }
    }
  }

  return relPaths.sort();
}

export function auditMcpSupabaseImportSurfacesV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): string[] {
  const fileExists = args.fileExists ?? existsSync;
  const readText = args.readText ?? ((p: string) => readFileSync(p, "utf8"));
  const blockers: string[] = [];
  for (const rel of listMcpSurfaceRelPaths({ rootDir: args.rootDir, fileExists })) {
    const text = readText(path.join(args.rootDir, rel));
    if (MCP_SUPABASE_IMPORT_RE.test(text)) {
      blockers.push(`mcp_supabase_admin_import_forbidden:${rel}`);
    }
  }
  return blockers;
}

export function auditMcpControlPlaneLiveBuildGuardV1(args: {
  rootDir: string;
  readText?: (abs: string) => string;
}): string[] {
  const readText = args.readText ?? ((p: string) => readFileSync(p, "utf8"));
  const rel = "scripts/lib/buckparts-mcp-control-plane-v1.ts";
  const text = readText(path.join(args.rootDir, rel));
  const blockers: string[] = [];

  if (!text.includes(MCP_SUPABASE_EXTRACTION_BLOCKED_LIVE_BUILD_V1)) {
    blockers.push("mcp_control_plane_missing_extraction_blocker_constant");
  }
  if (!text.includes("BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD")) {
    blockers.push("mcp_control_plane_missing_live_cc_escape_hatch");
  }

  const start = text.indexOf("export async function loadCommandCenterForMcpV1");
  if (start < 0) {
    blockers.push("mcp_control_plane_load_function_missing");
    return blockers;
  }
  const fnBody = text.slice(start);
  const buildIdx = fnBody.indexOf("buildBuckpartsCommandCenterReport");
  const guardIdx = fnBody.indexOf("BUCKPARTS_MCP_ALLOW_LIVE_CC_BUILD");
  if (buildIdx >= 0 && (guardIdx < 0 || guardIdx > buildIdx)) {
    blockers.push("mcp_control_plane_live_supabase_fallback_without_escape_hatch");
  }

  return blockers;
}

export function auditMcpSupabaseExposureV1(args: {
  rootDir: string;
  enforce?: boolean;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): McpSupabaseExposureAuditV1 {
  const enforce = args.enforce ?? false;
  const fileExists = args.fileExists ?? ((p: string) => existsSync(p));
  const readText = args.readText ?? ((p: string) => readFileSync(p, "utf8"));

  const mcp_config_files_found: string[] = [];
  for (const rel of [".mcp.json", ".cursor/mcp.json"]) {
    const abs = path.join(args.rootDir, rel);
    if (fileExists(abs)) mcp_config_files_found.push(rel);
  }

  let public_mcp_server_exposure: ExposureClassificationV1 = "NOT_PROVEN";
  if (mcp_config_files_found.length > 0) {
    public_mcp_server_exposure = "SHOULD_FIX_BEFORE_SCALE";
    for (const rel of mcp_config_files_found) {
      const text = readText(path.join(args.rootDir, rel));
      if (PUBLIC_MCP_LISTEN_RE.test(text)) {
        public_mcp_server_exposure = "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE";
      }
    }
  }

  const serverClient = path.join(args.rootDir, "src/lib/supabase/server-client.ts");
  const hasAnonClient = fileExists(serverClient);
  let supabase_anon_client_in_app: ExposureClassificationV1 = "NOT_PROVEN";
  if (hasAnonClient) {
    const text = readText(serverClient);
    supabase_anon_client_in_app = text.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
      ? "SHOULD_FIX_BEFORE_SCALE"
      : "NOT_PROVEN";
  }

  const workflowsDir = path.join(args.rootDir, ".github/workflows");
  const hasWorkflows = fileExists(workflowsDir);
  let catalog_scrape_risk: ExposureClassificationV1 = "SHOULD_FIX_BEFORE_SCALE";
  if (hasAnonClient && hasWorkflows) {
    catalog_scrape_risk = "SHOULD_FIX_BEFORE_SCALE";
  }

  const blockers: string[] = [
    ...auditMcpSupabaseImportSurfacesV1(args),
    ...auditMcpControlPlaneLiveBuildGuardV1(args),
  ];
  if (public_mcp_server_exposure === "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE") {
    blockers.push("public_mcp_listen_surface_detected");
  }

  const inventory = auditSupabaseServiceRoleInventoryDriftV1(args);
  if (!inventory.ok) blockers.push(...inventory.blockers);

  const warnings: string[] = [];
  if (supabase_anon_client_in_app === "SHOULD_FIX_BEFORE_SCALE") {
    warnings.push("supabase_anon_catalog_read_surface:SHOULD_FIX_BEFORE_SCALE");
  }
  if (catalog_scrape_risk === "SHOULD_FIX_BEFORE_SCALE") {
    warnings.push("catalog_scrape_risk:SHOULD_FIX_BEFORE_SCALE");
  }

  const proven_facts = [
    `PROVEN: mcp_config_files_found=${String(mcp_config_files_found.length)}.`,
    hasAnonClient
      ? "PROVEN: Next.js app uses Supabase server client with public anon key pattern."
      : "PROVEN: no src/lib/supabase/server-client.ts on disk.",
    `PROVEN: service_role_writer_inventory_count=${String(discoverSupabaseServiceRoleWritersV1(args).length)}.`,
    `PROVEN: mcp_supabase_extraction_enforced=${String(enforce)}.`,
  ];

  const not_proven_facts = [
    "NOT_PROVEN: no in-repo network MCP server listening on public interface (no Runlayer shadow MCP in repo root .mcp.json).",
    "NOT_PROVEN: Supabase RLS policies — not audited by this script.",
    "NOT_PROVEN: production MCP tool exposure outside Cursor IDE session.",
  ];

  const status: McpSupabaseExposureAuditV1["status"] =
    blockers.length === 0 ? "PASS" : "FAIL";

  return {
    contract: MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1,
    enforce,
    status,
    mcp_config_files_found,
    public_mcp_server_exposure,
    supabase_anon_client_in_app,
    catalog_scrape_risk,
    blockers,
    warnings,
    proven_facts,
    not_proven_facts,
    recommended_next_action:
      blockers.length > 0
        ? "Resolve MCP/Supabase extraction blockers before broader production-data automation."
        : public_mcp_server_exposure === "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE"
          ? "Remove public MCP listen surfaces before external exposure."
          : "Treat catalog as public-read via anon Supabase + Next routes — rate-limit and RLS review before scale.",
  };
}

export function enforceMcpSupabaseExposureAuditV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): McpSupabaseExposureAuditV1 {
  return auditMcpSupabaseExposureV1({ ...args, enforce: true });
}

function main(): void {
  const enforce = process.argv.includes("--enforce");
  const report = auditMcpSupabaseExposureV1({ rootDir: process.cwd(), enforce });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (enforce && report.status === "FAIL") {
    process.stderr.write(
      `BUCKPARTS_MCP_SUPABASE_EXPOSURE_AUDIT_FAILED\n${report.blockers.join("\n")}\n`,
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
