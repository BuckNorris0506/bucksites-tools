import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runHyperAgentOrchestratorV0,
  type HyperAgentOrchestratorResultV0,
} from "./lib/hyperagent-orchestrator-v0";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgv(argv: string[]): { confirmDispatch: boolean; json: boolean } {
  const dryRun = argv.includes("--dry-run");
  const confirmDispatch = argv.includes("--confirm-dispatch") && !dryRun;
  return {
    confirmDispatch,
    json: argv.includes("--json"),
  };
}

export function formatOrchestratorStdout(result: HyperAgentOrchestratorResultV0): string {
  const haltLine = `halt_condition: ${result.halt_condition}`;

  if (result.halt_condition === "NO_ELIGIBLE_ITEM") {
    return `NO_ELIGIBLE_ITEM: no HyperAgent dispatch candidate after queue gates.\n${haltLine}\n`;
  }
  if (
    result.halt_condition === "ALREADY_DISPATCHED" ||
    result.halt_condition === "BLOCKED_BY_REGISTRY" ||
    result.halt_condition === "BLOCKED_BY_QUEUE"
  ) {
    const lines = [
      `${result.halt_condition}: HyperAgent orchestrator refused dispatch.`,
      haltLine,
      ...result.blocked_reasons.map((reason) => `- ${reason}`),
      "",
    ];
    return `${lines.join("\n")}`;
  }
  if (result.copy_paste_prompt) {
    const header =
      result.halt_condition === "DISPATCH_RECORDED"
        ? [
            `DISPATCH_RECORDED: ${result.mission_id}`,
            haltLine,
            `json: ${result.mission_packet_json_rel_path ?? "n/a"}`,
            `md: ${result.mission_packet_md_rel_path ?? "n/a"}`,
            "",
          ].join("\n")
        : [`DRY_RUN_PREVIEW: ${result.mission_id ?? "mission"}`, haltLine, ""].join("\n");
    return `${header}\n${result.copy_paste_prompt}\n`;
  }
  return `${result.halt_condition}\n${haltLine}\n`;
}

function main(): void {
  const { confirmDispatch, json } = parseArgv(process.argv.slice(2));
  const result = runHyperAgentOrchestratorV0({ rootDir, confirmDispatch });

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const stdout = formatOrchestratorStdout(result);
    if (
      result.halt_condition === "ALREADY_DISPATCHED" ||
      result.halt_condition === "BLOCKED_BY_REGISTRY" ||
      result.halt_condition === "BLOCKED_BY_QUEUE"
    ) {
      process.stderr.write(stdout);
    } else {
      process.stdout.write(stdout);
    }
  }

  process.exitCode = result.exit_code;
}

main();
