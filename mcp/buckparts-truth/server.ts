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
  manufacturerRescueBlockersV1,
  manufacturerRescueCohortV1,
  manufacturerRescueNextActionV1,
  manufacturerRescueRunnerBoardV1,
  manufacturerRescueSlugStateV1,
  manufacturerRescueStatusV1,
  businessSnapshotV1,
  capabilityLookupV1,
  capabilityTimelineV1,
  commandCenterSummaryV1,
  executionHistoryV1,
  executionLedgerStatusV1,
  laneStatusV1,
  lastCompletedCapabilityV1,
  nextBestActionV1,
  workQueueV1,
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
    version: "0.6.1",
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

server.registerTool(
  "manufacturer_rescue_next_action",
  {
    title: "Manufacturer rescue next action (read-only)",
    description:
      "Returns the single READY_FOR_APPLY candidate from committed runner artifact, or the next executable blocking stage when no apply slot is open. Projects manufacturer-safe-link-rescue-runner-v1.json only.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(manufacturerRescueNextActionV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "manufacturer_rescue_runner_board",
  {
    title: "Manufacturer rescue runner board (read-only)",
    description:
      "Runner execution board: stage counts, manufacturer workloads, bottlenecks, execution order, and remaining opportunity from committed runner artifact.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(manufacturerRescueRunnerBoardV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "manufacturer_rescue_slug_state",
  {
    title: "Manufacturer rescue slug state (read-only)",
    description:
      "Complete per-slug runner state machine row (stage, next action, blockers, Boardy safety rules) from committed runner artifact.",
    inputSchema: {
      slug: z.string().min(1).describe("Exact BuckParts filter/part slug"),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ slug }) => toolResult(manufacturerRescueSlugStateV1({ rootDir: REPO_ROOT }, slug)),
);

server.registerTool(
  "manufacturer_rescue_blockers",
  {
    title: "Manufacturer rescue blockers (read-only)",
    description:
      "All BLOCKED rescue slugs grouped by blocker reason from committed runner artifact. No CSV or Supabase mutation.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(manufacturerRescueBlockersV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "command_center_summary",
  {
    title: "Command Center summary (read-only)",
    description:
      "Highest-level operational summary from BuckParts Command Center: system health, next_best_action, operator digest, daily operator summary, brain gate.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(await commandCenterSummaryV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "next_best_action",
  {
    title: "Next best action (read-only)",
    description:
      "Single highest-priority action across Command Center lanes with lane, reason, blocking prerequisites, business impact, and source artifact path.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(await nextBestActionV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "work_queue",
  {
    title: "Operational work queue (read-only)",
    description:
      "Active operational queues ranked by priority: root NBA, demand queue, agent control plane, money queue, rescue runner execution order.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(await workQueueV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "lane_status",
  {
    title: "Command Center lane status (read-only)",
    description:
      "Status, health, blockers, and metrics for a Command Center v2 lane by name or jq path fragment.",
    inputSchema: {
      lane_name: z
        .string()
        .min(1)
        .describe(
          "Lane key e.g. manufacturer_safe_link_rescue_runner_v1, operator_digest_v1, or alias runner",
        ),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ lane_name }) => toolResult(await laneStatusV1({ rootDir: REPO_ROOT, lane_name })),
);

server.registerTool(
  "business_snapshot",
  {
    title: "Business snapshot (read-only)",
    description:
      "Executive snapshot: coverage, rescue progress, repo/runtime convergence, trust status, highest risks, current phase, next milestone.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(await businessSnapshotV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "execution_history",
  {
    title: "Execution history (read-only)",
    description:
      "Completed operational work indexed from committed dispatch runs, batch closeouts, and closeout learning packets.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional max entries to return (newest first)."),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ limit }) => toolResult(executionHistoryV1({ rootDir: REPO_ROOT }, limit)),
);

server.registerTool(
  "last_completed_capability",
  {
    title: "Last completed capability (read-only)",
    description:
      "Most recent completed operational capability from the execution ledger by completion timestamp.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(lastCompletedCapabilityV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "capability_timeline",
  {
    title: "Capability timeline (read-only)",
    description:
      "Operational capabilities grouped by lane with latest completion per lane from the execution ledger.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(capabilityTimelineV1({ rootDir: REPO_ROOT })),
);

server.registerTool(
  "capability_lookup",
  {
    title: "Capability lookup (read-only)",
    description:
      "Find ledger entries by commit SHA prefix, entry id, operational lane, or business capability name fragment.",
    inputSchema: {
      commit_or_name: z
        .string()
        .min(1)
        .describe("Commit SHA prefix, lane name, capability text, or entry id fragment."),
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async ({ commit_or_name }) =>
    toolResult(capabilityLookupV1({ rootDir: REPO_ROOT }, commit_or_name)),
);

server.registerTool(
  "execution_ledger_status",
  {
    title: "Execution ledger status (read-only)",
    description:
      "Freshness metadata and provenance for the committed execution ledger index. Does not refresh or mutate artifacts.",
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
  },
  async () => toolResult(executionLedgerStatusV1({ rootDir: REPO_ROOT })),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
