/**
 * Read-only weekly-style founder digest (Markdown stdout).
 * Does not write Supabase, retailer_links, or evidence; optional `--compare-with` reads a prior file only.
 *
 * CI: run `npm run build` in a prior step and set `FOUNDER_DIGEST_SKIP_BUILD=1` to avoid duplicate builds.
 * Optional `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` (repo-relative or absolute): when set to a readable Runner Step v1 JSON file, digest embeds live CLI summary markdown instead of the modeled-only Runner section.
 * Optional `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH`: when set to a readable JSON file (typically stdout saved from `npm run buckparts:codex-next-execution-packet`), digest embeds `codex_packet_proof_read_model_v1` markdown and feeds Layer 6 summary — digest never invokes Codex.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildBuckpartsCommandCenterReport, stripEvidenceUncappedCandidatesForStdout } from "./report-buckparts-command-center";
import {
  buildFounderDigestMarkdownV1,
  type FounderDigestBuildV1,
  sliceCommandCenterForFounderDigest,
} from "./lib/buckparts-founder-digest-v1";
import {
  buildRunnerStepVisibilityModeledV1,
  formatRunnerStepCliResultMarkdownV1,
  formatRunnerStepDigestSectionMarkdownV1,
} from "./lib/buckparts-runner-step-summary-v1";
import {
  BUCKPARTS_RUNNER_STEP_CONTRACT_V1,
  type BuckpartsRunnerStepOutputV1,
} from "./lib/buckparts-runner-step-v1";
import {
  buildFounderActionQueueV1,
  formatFounderActionQueueForDigest,
  founderActionQueueInputFromCommandCenterJson,
} from "../src/lib/owner-dashboard/founder-action-queue-v1";
import {
  buildFounderExecutionPacketsV1,
  formatFounderExecutionPacketsForDigest,
  type FounderExecutionPacketV1,
} from "../src/lib/owner-dashboard/founder-execution-packet-v1";
import {
  buildFounderDecisionPacketsV1,
  formatFounderDecisionPacketsForDigestTopNV1,
} from "../src/lib/owner-dashboard/founder-decision-packet-v1";
import {
  buildFounderDecisionRegistryReadModelV1,
  formatFounderDecisionRegistryReadModelDigestMarkdownV1,
} from "../src/lib/owner-dashboard/founder-decision-registry-read-model-v1";
import { scanFounderDecisionRegistryJsonFilesV1 } from "../src/lib/owner-dashboard/founder-decision-registry-scan-v1";
import {
  buildFailurePatternRegistryReadModelFromSeededV1,
  formatFailurePatternRegistryDigestMarkdownV1,
} from "../src/lib/owner-dashboard/failure-pattern-registry-v1";
import {
  buildCodexPacketProofReadModelV1,
  buildCodexPacketProofReadModelParseFailedV1,
  formatCodexPacketProofDigestMarkdownV1,
  type CodexPacketProofReadModelV1,
} from "../src/lib/owner-dashboard/codex-packet-proof-read-model-v1";
import {
  buildLayerSixReadinessSummaryV1,
  formatLayerSixReadinessDigestMarkdownV1,
  type LayerSixReadinessRunnerContextV1,
} from "../src/lib/owner-dashboard/layer-six-readiness-summary-v1";

function parseCompareWithArg(): string | null {
  const idx = process.argv.indexOf("--compare-with");
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return path.resolve(process.argv[idx + 1]!);
}

function buildCompareNote(comparePath: string | null): string {
  if (!comparePath) {
    return "**UNKNOWN** — no `--compare-with <path>` argument and no prior digest content passed into this run.";
  }
  try {
    const prev = readFileSync(comparePath, "utf8");
    const prevGen = prev.match(/^Generated:\s*(.+)$/m);
    const curNote = prevGen ? `**PROVEN:** Prior file first matched \`Generated:\` line: ${prevGen[1]?.trim() ?? "UNKNOWN"}.` : "**INFERRED:** Prior file had no `Generated:` line match.";
    return `${prevNote} **INFERRED:** Line-by-line semantic diff not performed; re-read both files in your editor for detail.`;
  } catch {
    return `**PROVEN:** \`--compare-with\` path not readable: ${comparePath}`;
  }
}

function runBuildForDigest(rootDir: string): FounderDigestBuildV1 {
  if (process.env.FOUNDER_DIGEST_SKIP_BUILD === "1") {
    return { ran: false, ok: "UNKNOWN", delegated_to_prior_ci_step: true };
  }
  const r = spawnSync("npm", ["run", "build"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  return { ran: true, ok: r.status === 0 };
}

const FALLBACK_COMMAND_CENTER_JSON_FOR_DIGEST = {
  report_name: "UNKNOWN",
  generated_at: "UNKNOWN",
  system_health_summary: { status: "UNKNOWN" },
  next_best_action: "UNKNOWN (Command Center build threw — see CI log)",
  known_unknowns: [] as string[],
  execution_guidance: { next_move_mode: "UNKNOWN", mutating_blocked: false, mutating_block_reasons: [] as string[] },
  command_center_v2: {
    next_owner_action: "UNKNOWN",
    deploy_live_site_status: { status: "UNKNOWN", live_site_monitor: null },
    amazon_rescue: {
      next_agent_action: "",
      next_owner_action: "",
      human_browser_required_tokens: [] as string[],
      status: "UNKNOWN",
    },
    affiliate_readiness: { status: "UNKNOWN", next_owner_action: "", next_agent_action: "" },
    unknown_or_human_review: { status: "UNKNOWN", next_owner_action: "", blocker: null },
  },
} as Parameters<typeof sliceCommandCenterForFounderDigest>[0];

function unknownCommandCenterSlice(): ReturnType<typeof sliceCommandCenterForFounderDigest> {
  return sliceCommandCenterForFounderDigest(FALLBACK_COMMAND_CENTER_JSON_FOR_DIGEST);
}

function tryReadRunnerStepJsonV1(rootDir: string): BuckpartsRunnerStepOutputV1 | null {
  const rel = process.env.FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH?.trim();
  if (!rel) return null;
  const abs = path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
  try {
    const raw = readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw) as BuckpartsRunnerStepOutputV1;
    if (parsed?.contract !== BUCKPARTS_RUNNER_STEP_CONTRACT_V1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function tryReadRunnerStepOverallStatusV1(rootDir: string): string | null {
  const parsed = tryReadRunnerStepJsonV1(rootDir);
  return parsed && typeof parsed.overall_status === "string" ? parsed.overall_status : null;
}

function tryReadRunnerStepContextForLayerSixV1(rootDir: string): LayerSixReadinessRunnerContextV1 | null {
  const parsed = tryReadRunnerStepJsonV1(rootDir);
  if (!parsed) return null;
  return {
    overall_status: parsed.overall_status ?? null,
    layer_truth: parsed.layer_truth ?? null,
  };
}

function modeledRunnerDigestMarkdownV1(args: {
  command_center_ok: boolean;
  nextPacket: FounderExecutionPacketV1 | null;
}): string {
  return formatRunnerStepDigestSectionMarkdownV1(
    buildRunnerStepVisibilityModeledV1({
      surface: "founder_digest",
      command_center_ok: args.command_center_ok,
      nextPacket: args.nextPacket,
    }),
  );
}

/**
 * Codex Packet Proof digest fragment when `FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH` is set; otherwise omit section.
 */
export function buildCodexPacketProofDigestMarkdownForFounderRunV1(args: {
  rootDir: string;
  generated_at: string;
}): { markdownFragment: string | undefined; readModel: CodexPacketProofReadModelV1 | null } {
  const rel = process.env.FOUNDER_DIGEST_CODEX_PACKET_PROOF_JSON_PATH?.trim();
  if (!rel) {
    return { markdownFragment: undefined, readModel: null };
  }
  const abs = path.isAbsolute(rel) ? rel : path.join(args.rootDir, rel);
  try {
    const raw = readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const rm = buildCodexPacketProofReadModelV1(parsed, { generated_at: args.generated_at });
    return {
      markdownFragment: formatCodexPacketProofDigestMarkdownV1(rm, { env_path: rel }),
      readModel: rm,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const rm = buildCodexPacketProofReadModelParseFailedV1(args.generated_at, msg);
    return {
      markdownFragment: formatCodexPacketProofDigestMarkdownV1(rm, { env_path: rel }),
      readModel: rm,
    };
  }
}

/**
 * Runner Step section for digest: live JSON when `FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH` points at valid output; otherwise modeled-only (local runs).
 */
export function buildRunnerStepDigestMarkdownForFounderRunV1(args: {
  rootDir: string;
  command_center_ok: boolean;
  nextPacket: FounderExecutionPacketV1 | null;
}): string {
  const rel = process.env.FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH?.trim();
  const modeled = (): string =>
    modeledRunnerDigestMarkdownV1({
      command_center_ok: args.command_center_ok,
      nextPacket: args.nextPacket,
    });
  if (!rel) {
    return modeled();
  }
  const abs = path.isAbsolute(rel) ? rel : path.join(args.rootDir, rel);
  try {
    const raw = readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw) as BuckpartsRunnerStepOutputV1;
    if (parsed?.contract !== BUCKPARTS_RUNNER_STEP_CONTRACT_V1) {
      return `${modeled()}\n\n**PROVEN:** \`FOUNDER_DIGEST_RUNNER_STEP_JSON_PATH\` was set but JSON \`contract\` was not \`${BUCKPARTS_RUNNER_STEP_CONTRACT_V1}\` — modeled section above retained.\n`;
    }
    return formatRunnerStepCliResultMarkdownV1(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `${modeled()}\n\n**PROVEN:** Could not read Runner Step JSON (\`${rel}\`): ${msg}\n`;
  }
}

export async function runBuckpartsFounderDigestMain(): Promise<{ markdown: string; exitCode: number }> {
  const rootDir = process.cwd();
  const comparePath = parseCompareWithArg();
  const build = runBuildForDigest(rootDir);
  let slice: ReturnType<typeof sliceCommandCenterForFounderDigest>;
  let ccForQueue: unknown;
  let ccOk = true;
  try {
    const rawCc = await buildBuckpartsCommandCenterReport({ rootDir });
    const cc = stripEvidenceUncappedCandidatesForStdout(rawCc) as unknown as Parameters<typeof sliceCommandCenterForFounderDigest>[0];
    slice = sliceCommandCenterForFounderDigest(cc);
    ccForQueue = cc;
  } catch {
    ccOk = false;
    slice = unknownCommandCenterSlice();
    ccForQueue = FALLBACK_COMMAND_CENTER_JSON_FOR_DIGEST;
  }
  const compareNote = buildCompareNote(comparePath);
  const actionQueue = buildFounderActionQueueV1(founderActionQueueInputFromCommandCenterJson(ccForQueue));
  const executionPackets = buildFounderExecutionPacketsV1(actionQueue.rows, {
    generated_at: new Date().toISOString(),
    source: "buckparts-founder-digest",
  });
  const runnerOverall = tryReadRunnerStepOverallStatusV1(rootDir);
  const decisionPackets = buildFounderDecisionPacketsV1(actionQueue.rows, {
    generated_at: new Date().toISOString(),
    source: "buckparts-founder-digest",
    runner: runnerOverall ? { overall_status: runnerOverall } : null,
  });
  const nextPacket = executionPackets.packets[0] ?? null;
  const runner_step_digest_markdown = buildRunnerStepDigestMarkdownForFounderRunV1({
    rootDir,
    command_center_ok: ccOk,
    nextPacket,
  });
  const generatedAt = new Date().toISOString();
  const registryFiles = scanFounderDecisionRegistryJsonFilesV1(rootDir);
  const registryReadModel = buildFounderDecisionRegistryReadModelV1(registryFiles, {
    generated_at: generatedAt,
    reference_time_iso: generatedAt,
  });
  const failurePatternReadModel = buildFailurePatternRegistryReadModelFromSeededV1(generatedAt);
  const codexProofBundle = buildCodexPacketProofDigestMarkdownForFounderRunV1({
    rootDir,
    generated_at: generatedAt,
  });
  const layerSixReadiness = buildLayerSixReadinessSummaryV1(failurePatternReadModel, {
    generated_at: generatedAt,
    runner: tryReadRunnerStepContextForLayerSixV1(rootDir),
    codex_packet_proof: codexProofBundle.readModel === null ? null : codexProofBundle.readModel,
  });
  const markdown = buildFounderDigestMarkdownV1({
    generated_at: generatedAt,
    build,
    command_center: slice,
    compare_note: compareNote,
    founder_action_queue_digest_markdown: formatFounderActionQueueForDigest(actionQueue.rows),
    founder_decision_packets_digest_markdown: formatFounderDecisionPacketsForDigestTopNV1(decisionPackets, 3),
    founder_decision_registry_read_model_digest_markdown:
      formatFounderDecisionRegistryReadModelDigestMarkdownV1(registryReadModel),
    failure_pattern_registry_digest_markdown:
      formatFailurePatternRegistryDigestMarkdownV1(failurePatternReadModel),
    layer_six_readiness_digest_markdown: formatLayerSixReadinessDigestMarkdownV1(layerSixReadiness),
    codex_packet_proof_digest_markdown: codexProofBundle.markdownFragment,
    founder_execution_packets_digest_markdown: formatFounderExecutionPacketsForDigest(executionPackets),
    runner_step_digest_markdown,
  });
  const buildFailed = build.ran && build.ok === false;
  const exitCode = buildFailed || !ccOk ? 1 : 0;
  return { markdown, exitCode };
}

async function main(): Promise<void> {
  const { markdown, exitCode } = await runBuckpartsFounderDigestMain();
  process.stdout.write(markdown);
  process.exitCode = exitCode;
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
