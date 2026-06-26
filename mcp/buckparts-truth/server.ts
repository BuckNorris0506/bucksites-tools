#!/usr/bin/env node
/**
 * BuckParts Truth MCP v2 — canonical read-only server (stdio).
 * No HTTPS deployment, no writes, no Supabase mutation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  checkReplacementFitV1,
  getCoverageMetricsV2,
  getFilterV2,
  getModelV2,
  getSafeBuyerPathV2,
  getTruthPolicyV2,
  manufacturerBrowserProofStatusV1,
  manufacturerRescueCohortV1,
  manufacturerRescueStatusV1,
  searchPartsV2,
} from "../../scripts/lib/buckparts-mcp-tools-v2";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function toolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

const server = new McpServer(
  {
    name: "buckparts-truth",
    version: "0.3.0",
  },
  {
    instructions:
      "Canonical read-only BuckParts truth server. Repo CSV + committed audit JSON only. Returns FULL truth or UNKNOWN — never infers fit or safe buy paths.",
  },
);

const checkReplacementFitHandler = async ({ model_or_part }: { model_or_part: string }) =>
  toolResult(checkReplacementFitV1({ rootDir: REPO_ROOT }, model_or_part));

const checkReplacementFitSchema = {
  title: "Check replacement fit (read-only)",
  description:
    "Look up appliance model slug, filter/part slug, or unambiguous OEM/model number. Returns proven fit slug when audit-proven, wedge, disposition, safe buyer path status, and evidence paths. Exact match only.",
  inputSchema: {
    model_or_part: z
      .string()
      .min(1)
      .describe("Exact model slug, filter slug, or unambiguous OEM/model number token"),
  },
  annotations: READ_ONLY_ANNOTATIONS,
};

server.registerTool("check_replacement_fit", checkReplacementFitSchema, checkReplacementFitHandler);
server.registerTool("checkReplacementFit", checkReplacementFitSchema, checkReplacementFitHandler);

server.registerTool(
  "getFilter",
  {
    title: "Get filter truth (read-only)",
    description:
      "Exact filter slug lookup from committed catalog CSV. Returns identity, OEM, aliases, replacement interval, compatible model count, safe buyer path status, evidence paths, and truth status.",
    inputSchema: {
      filter_slug: z.string().min(1).describe("Exact BuckParts filter/part slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ filter_slug }) => toolResult(getFilterV2({ rootDir: REPO_ROOT }, filter_slug)),
);

server.registerTool(
  "getModel",
  {
    title: "Get model truth (read-only)",
    description:
      "Exact appliance model slug lookup. Returns compatible filters with recommendation flags, fit confidence, and evidence. UNKNOWN when fit is not audit-proven.",
    inputSchema: {
      model_slug: z.string().min(1).describe("Exact BuckParts appliance model slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ model_slug }) => toolResult(getModelV2({ rootDir: REPO_ROOT }, model_slug)),
);

server.registerTool(
  "searchParts",
  {
    title: "Search parts (exact-token only)",
    description:
      "Exact-token catalog search across filter slugs, model slugs, aliases, OEM tokens, and model numbers. Ranked exact matches only — never fuzzy or invented results.",
    inputSchema: {
      query: z.string().min(1).describe("Exact token to match (slug, alias, OEM, or model number)"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ query }) => toolResult(searchPartsV2({ rootDir: REPO_ROOT }, query)),
);

server.registerTool(
  "getSafeBuyerPath",
  {
    title: "Get safe buyer path (read-only)",
    description:
      "Exact filter slug lookup for buy-path truth: primary retailer, browser truth, direct_buyable state, suppression reason, evidence paths, owner approval requirements.",
    inputSchema: {
      filter_slug: z.string().min(1).describe("Exact BuckParts filter/part slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ filter_slug }) => toolResult(getSafeBuyerPathV2({ rootDir: REPO_ROOT }, filter_slug)),
);

server.registerTool(
  "getCoverageMetrics",
  {
    title: "Get coverage metrics (read-only)",
    description:
      "Aggregate repo truth: wedge counts, safe buyer path counts, suppressed counts, AP convergence snapshot from committed artifacts, census summaries. No live Supabase.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(getCoverageMetricsV2({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "getTruthPolicy",
  {
    title: "Get BuckParts Truth Policy",
    description:
      "Returns the BuckParts Truth Contract, governing document references, and explanation of UNKNOWN behavior for MCP consumers.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(getTruthPolicyV2({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "manufacturer_rescue_status",
  {
    title: "Manufacturer rescue status (read-only)",
    description:
      "Exact filter slug lookup for GE, EveryDrop/Whirlpool, or Frigidaire safe-link rescue cohort truth. Repo CSV + committed adapter artifacts only. Never infers PDP as repo-proven; UNKNOWN when not in cohort.",
    inputSchema: {
      slug: z.string().min(1).describe("Exact BuckParts filter/part slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ slug }) => toolResult(manufacturerRescueStatusV1({ rootDir: REPO_ROOT }, slug)),
);

server.registerTool(
  "manufacturer_rescue_cohort",
  {
    title: "Manufacturer rescue cohort (read-only)",
    description:
      "Cohort summary for ge_appliance_parts, everydrop_whirlpool, or frigidaire rescue lanes. Reuses manufacturer-safe-link-rescue-framework-v1 adapters. No PDP inference as apply authorization.",
    inputSchema: {
      manufacturer: z
        .string()
        .min(1)
        .describe("Manufacturer key: ge_appliance_parts, everydrop_whirlpool, or frigidaire"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ manufacturer }) =>
    toolResult(manufacturerRescueCohortV1({ rootDir: REPO_ROOT }, manufacturer)),
);

server.registerTool(
  "manufacturer_browser_proof_status",
  {
    title: "Manufacturer browser proof status (read-only)",
    description:
      "Owner browser proof draft artifact for a filter slug when on disk. PASS URLs and direct_buyable_proven only when official-path observations prove purchase signal. No Playwright side effects.",
    inputSchema: {
      slug: z.string().min(1).describe("Exact BuckParts filter/part slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ slug }) =>
    toolResult(manufacturerBrowserProofStatusV1({ rootDir: REPO_ROOT }, slug)),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
