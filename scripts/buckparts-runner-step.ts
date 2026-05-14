/**
 * Runner Step v1 CLI: read-only snapshot + bounded `npm run` validation; JSON on stdout.
 * Does not invoke Cursor/Codex/OpenAI. Spawns only the fixed npm script allowlist — never the packet's validation text.
 */

import { spawnSync } from "node:child_process";

import { buildNextExecutionPacketSnapshotV1 } from "./lib/buckparts-next-execution-packet";
import {
  RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1,
  assertRunnerStepAllowedNpmScriptV1,
  buildBuckpartsRunnerStepOutputV1,
  commandRecordFromSpawnV1,
  npmRunCommandDisplayV1,
  skippedCommandRecordV1,
  type RunnerStepAllowedNpmScriptV1,
  type RunnerStepCommandRecordV1,
  type RunnerStepOverallStatusV1,
} from "./lib/buckparts-runner-step-v1";

const STDIO_TAIL_CHARS = 8000;

function runNpmScript(script: RunnerStepAllowedNpmScriptV1, cwd: string): {
  exit_code: number | null;
  stdout: string;
  stderr: string;
} {
  assertRunnerStepAllowedNpmScriptV1(script);
  const r = spawnSync("npm", ["run", script], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    exit_code: r.status === null ? null : r.status,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
  };
}

function exitCodeForOverall(status: RunnerStepOverallStatusV1): number {
  if (status === "FAIL") {
    return 1;
  }
  if (status === "BLOCKED") {
    return 2;
  }
  return 0;
}

export async function runBuckpartsRunnerStepMain(cwd: string): Promise<{ exitCode: number; jsonText: string }> {
  const generated_at = new Date().toISOString();
  const snapshot = await buildNextExecutionPacketSnapshotV1(cwd);

  let commands: RunnerStepCommandRecordV1[] = [];

  if (!snapshot.command_center_ok) {
    commands = RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1.map((script) =>
      skippedCommandRecordV1(
        npmRunCommandDisplayV1(script),
        "PROVEN SKIPPED: command_center_ok=false (Command Center build failed).",
      ),
    );
  } else {
    for (const script of RUNNER_STEP_ALLOWED_NPM_SCRIPTS_V1) {
      const { exit_code, stdout, stderr } = runNpmScript(script, cwd);
      commands.push(
        commandRecordFromSpawnV1({
          script,
          exit_code,
          stdout,
          stderr,
          tailChars: STDIO_TAIL_CHARS,
        }),
      );
    }
  }

  const output = buildBuckpartsRunnerStepOutputV1({
    generated_at,
    snapshot,
    commands,
  });

  const jsonText = `${JSON.stringify(output, null, 2)}\n`;
  return { exitCode: exitCodeForOverall(output.overall_status), jsonText };
}

async function main(): Promise<void> {
  const { exitCode, jsonText } = await runBuckpartsRunnerStepMain(process.cwd());
  process.stdout.write(jsonText);
  process.exit(exitCode);
}

void main();
