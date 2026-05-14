/**
 * Read-only CLI: print the next Founder Execution Packet prompt without opening digest/dashboard.
 *
 * - Default: stdout = copy_paste_prompt only (or PROVEN no-packet line).
 * - `--json`: full snapshot JSON (no nested npm).
 * - `--list`: short human-readable list.
 *
 * Does not write files, mutate Supabase/retailer_links/evidence/affiliate data, or run mutating scripts.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildNextExecutionPacketSnapshotV1,
  formatNextExecutionPacketListText,
  formatNextExecutionPacketNoPacketText,
  type NextExecutionPacketSnapshotV1,
} from "./lib/buckparts-next-execution-packet";

export function runCliFromSnapshot(
  snapshot: NextExecutionPacketSnapshotV1,
  argv: string[],
): { exitCode: number; stdout: string } {
  const { json, list } = parseFlags(argv);

  if (!snapshot.command_center_ok) {
    const msg =
      "PROVEN: Command Center report build failed; using fallback snapshot. Re-run locally with `npm run buckparts:command-center` for details.\n";
    if (json) {
      return {
        exitCode: 1,
        stdout: `${JSON.stringify({ ...snapshot, cli_note: msg.trim() }, null, 2)}\n`,
      };
    }
    if (list) {
      return { exitCode: 1, stdout: `${msg}${formatNextExecutionPacketListText(snapshot)}` };
    }
    if (snapshot.next_packet) {
      return { exitCode: 1, stdout: `${msg}${snapshot.next_packet.copy_paste_prompt}\n` };
    }
    return { exitCode: 1, stdout: `${msg}${formatNextExecutionPacketNoPacketText(snapshot)}` };
  }

  if (json) {
    const payload = {
      command_center_ok: snapshot.command_center_ok,
      generated_at: snapshot.generated_at,
      source: snapshot.source,
      founder_action_queue_contract: snapshot.queue.contract,
      next_packet: snapshot.next_packet,
      execution: snapshot.execution,
    };
    return { exitCode: 0, stdout: `${JSON.stringify(payload, null, 2)}\n` };
  }

  if (list) {
    return { exitCode: 0, stdout: formatNextExecutionPacketListText(snapshot) };
  }

  if (snapshot.next_packet) {
    return { exitCode: 0, stdout: `${snapshot.next_packet.copy_paste_prompt}\n` };
  }
  return { exitCode: 0, stdout: formatNextExecutionPacketNoPacketText(snapshot) };
}

function parseFlags(argv: string[]): { json: boolean; list: boolean } {
  return {
    json: argv.includes("--json"),
    list: argv.includes("--list"),
  };
}

export async function runBuckpartsNextExecutionPacketCli(argv: string[]): Promise<{ exitCode: number; stdout: string }> {
  const snapshot = await buildNextExecutionPacketSnapshotV1(process.cwd());
  return runCliFromSnapshot(snapshot, argv);
}

async function main(): Promise<void> {
  const { stdout, exitCode } = await runBuckpartsNextExecutionPacketCli(process.argv.slice(2));
  process.stdout.write(stdout);
  process.exitCode = exitCode;
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
