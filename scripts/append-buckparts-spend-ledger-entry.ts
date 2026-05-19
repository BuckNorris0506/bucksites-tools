/**
 * Append one spend row to `data/ops/spend-ledger-v1.json` (stdin JSON). No HTTP, no deploy, no build.
 *
 *   echo '{...}' | npm run buckparts:spend-ledger:append
 */

import { appendSpendLedgerEntryV1 } from "./lib/buckparts-spend-ledger-contract-v1";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

export async function runAppendSpendLedgerMain(input?: {
  rootDir?: string;
  stdin?: string;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const rootDir = input?.rootDir ?? ROOT;
  let stdin = input?.stdin;
  if (stdin === undefined) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    stdin = Buffer.concat(chunks).toString("utf8").trim();
  }

  if (!stdin) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Expected JSON entry on stdin.\n",
    };
  }

  let entryInput: unknown;
  try {
    entryInput = JSON.parse(stdin) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Invalid JSON on stdin: ${message}\n` };
  }

  const result = appendSpendLedgerEntryV1({ rootDir, entryInput });
  if (!result.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `${result.errors.join("\n")}\n`,
    };
  }

  return {
    exitCode: 0,
    stdout: `${JSON.stringify(result.summary)}\n`,
    stderr: "",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runAppendSpendLedgerMain().then(({ exitCode, stdout, stderr }) => {
    if (stderr) process.stderr.write(stderr);
    if (stdout) process.stdout.write(stdout);
    process.exit(exitCode);
  });
}
