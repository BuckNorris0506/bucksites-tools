/**
 * Read-only audit: MCP network exposure and Supabase public-read surface.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1 =
  "buckparts_mcp_supabase_exposure_audit_v1" as const;

export type ExposureClassificationV1 =
  | "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE"
  | "SHOULD_FIX_BEFORE_SCALE"
  | "NOT_PROVEN";

export type McpSupabaseExposureAuditV1 = {
  contract: typeof MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1;
  mcp_config_files_found: string[];
  public_mcp_server_exposure: ExposureClassificationV1;
  supabase_anon_client_in_app: ExposureClassificationV1;
  catalog_scrape_risk: ExposureClassificationV1;
  proven_facts: string[];
  not_proven_facts: string[];
  recommended_next_action: string;
};

export function auditMcpSupabaseExposureV1(args: {
  rootDir: string;
  fileExists?: (abs: string) => boolean;
  readText?: (abs: string) => string;
}): McpSupabaseExposureAuditV1 {
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
      if (/0\.0\.0\.0|public.*mcp|listen.*0\.0\.0\.0/i.test(text)) {
        public_mcp_server_exposure = "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE";
      }
    }
  }

  const serverClient = path.join(args.rootDir, "src/lib/supabase/server-client.ts");
  const hasAnonClient = fileExists(serverClient);
  let supabase_anon_client_in_app: ExposureClassificationV1 = "NOT_PROVEN";
  if (hasAnonClient) {
    const text = readText(serverClient);
    supabase_anon_client_in_app =
      text.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "SHOULD_FIX_BEFORE_SCALE" : "NOT_PROVEN";
  }

  const workflowsDir = path.join(args.rootDir, ".github/workflows");
  const hasWorkflows = fileExists(workflowsDir);
  let catalog_scrape_risk: ExposureClassificationV1 = "SHOULD_FIX_BEFORE_SCALE";
  if (hasAnonClient && hasWorkflows) {
    catalog_scrape_risk = "SHOULD_FIX_BEFORE_SCALE";
  }

  const proven_facts = [
    `PROVEN: mcp_config_files_found=${String(mcp_config_files_found.length)}.`,
    hasAnonClient
      ? "PROVEN: Next.js app uses Supabase server client with public anon key pattern."
      : "PROVEN: no src/lib/supabase/server-client.ts on disk.",
  ];

  const not_proven_facts = [
    "NOT_PROVEN: no in-repo network MCP server listening on public interface (no Runlayer shadow MCP in repo root .mcp.json).",
    "NOT_PROVEN: Supabase RLS policies — not audited by this script.",
    "NOT_PROVEN: production MCP tool exposure outside Cursor IDE session.",
  ];

  return {
    contract: MCP_SUPABASE_EXPOSURE_AUDIT_CONTRACT_V1,
    mcp_config_files_found,
    public_mcp_server_exposure,
    supabase_anon_client_in_app,
    catalog_scrape_risk,
    proven_facts,
    not_proven_facts,
    recommended_next_action:
      public_mcp_server_exposure === "MUST_FIX_BEFORE_EXTERNAL_EXPOSURE"
        ? "Remove public MCP listen surfaces before external exposure."
        : "Treat catalog as public-read via anon Supabase + Next routes — rate-limit and RLS review before scale.",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = auditMcpSupabaseExposureV1({ rootDir: process.cwd() });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
