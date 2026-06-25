#!/usr/bin/env node
/**
 * Local read-only BuckParts MCP server for Cursor (stdio).
 * No HTTPS, no writes, no Supabase mutation, no affiliate/click mutation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { checkReplacementFitV1 } from "../../scripts/lib/buckparts-mcp-check-replacement-fit-v1";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const server = new McpServer(
  {
    name: "buckparts-truth",
    version: "0.1.0",
  },
  {
    instructions:
      "Read-only BuckParts verified fit and safe buyer-path truth from committed repo CSV and audit artifacts. Returns FULL truth or UNKNOWN — never infers fit.",
  },
);

server.registerTool(
  "check_replacement_fit",
  {
    title: "Check replacement fit (read-only)",
    description:
      "Look up a BuckParts appliance model slug, filter/part slug, or unambiguous OEM/model number in committed repo truth. Returns proven fit slug (when audit-proven), wedge, disposition, safe buyer path status, and evidence paths. Exact match only — UNKNOWN when not proven.",
    inputSchema: {
      model_or_part: z
        .string()
        .min(1)
        .describe(
          "Exact appliance model slug (e.g. samsung-rf28r7351sr), filter slug (e.g. edr1rxd1), or unambiguous OEM/model number token",
        ),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ model_or_part }) => {
    const result = checkReplacementFitV1({ rootDir: REPO_ROOT }, model_or_part);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
