/**
 * Local helper: build the same next execution packet snapshot as `buckparts:next-execution-packet`,
 * copy the default prompt to the macOS clipboard via `pbcopy`, print a one-line PROVEN confirmation.
 *
 * Read-only: no file writes, no DB/retailer/evidence/affiliate mutations. No CI wiring (local/dev use).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildNextExecutionPacketSnapshotV1,
  formatNextExecutionPacketNoPacketText,
  type NextExecutionPacketSnapshotV1,
} from "./lib/buckparts-next-execution-packet";

export type ClipboardCopyResult = { ok: boolean; error?: string };

/** macOS `pbcopy` only; inject in tests. */
export function copyTextViaPbcopy(text: string): ClipboardCopyResult {
  if (process.platform !== "darwin") {
    return {
      ok: false,
      error:
        "PROVEN: Clipboard helper uses macOS pbcopy only; clipboard unchanged. Use `npm run buckparts:next-execution-packet` and copy manually.",
    };
  }
  const r = spawnSync("pbcopy", {
    input: text,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return {
      ok: false,
      error: `PROVEN: pbcopy failed (exit ${String(r.status)}); clipboard unchanged.`,
    };
  }
  return { ok: true };
}

export type CopyNextExecutionPacketDeps = {
  loadSnapshot?: () => Promise<NextExecutionPacketSnapshotV1>;
  copyToClipboard?: (text: string) => ClipboardCopyResult;
};

export async function runCopyNextExecutionPacketMain(
  deps: CopyNextExecutionPacketDeps = {},
): Promise<{ exitCode: number; stdout: string }> {
  const load = deps.loadSnapshot ?? (() => buildNextExecutionPacketSnapshotV1(process.cwd()));
  const copyFn = deps.copyToClipboard ?? copyTextViaPbcopy;

  const snapshot = await load();

  if (!snapshot.command_center_ok) {
    return {
      exitCode: 1,
      stdout:
        "PROVEN: Command Center report build failed; clipboard unchanged. Re-run with `npm run buckparts:command-center`.\n",
    };
  }

  if (!snapshot.next_packet) {
    return { exitCode: 1, stdout: formatNextExecutionPacketNoPacketText(snapshot) };
  }

  const text = snapshot.next_packet.copy_paste_prompt;
  const cr = copyFn(text);
  if (!cr.ok) {
    return {
      exitCode: 1,
      stdout: `${cr.error ?? "PROVEN: Clipboard copy failed; clipboard unchanged."}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: "PROVEN: Next execution packet copied to clipboard.\n",
  };
}

async function main(): Promise<void> {
  const { stdout, exitCode } = await runCopyNextExecutionPacketMain();
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
