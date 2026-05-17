/**
 * Lane-local Markdown worksheet for owner screenshot capture (not production evidence).
 *
 *   node --import tsx scripts/write-batch-owner-screenshot-capture-worksheet.ts --source amazon-rescue-default
 *   node --import tsx scripts/write-batch-owner-screenshot-capture-worksheet.ts --plan path/to/plan.json [--out path] [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveOwnerScreenshotCaptureWorksheetOutputPathV1,
  writeOwnerScreenshotCaptureWorksheetV1,
} from "../src/lib/owner-dashboard/batch-owner-screenshot-capture-worksheet-v1";
import { runReportBatchOwnerScreenshotFactsTemplateV1 } from "./report-batch-owner-screenshot-facts-template";
import { BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1 } from "../src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";

export class WriteBatchOwnerScreenshotCaptureWorksheetCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteBatchOwnerScreenshotCaptureWorksheetCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runWriteBatchOwnerScreenshotCaptureWorksheetV1(args: {
  argv: string[];
  repoRoot: string;
  readFile: (absolutePath: string) => string;
}): ReturnType<typeof writeOwnerScreenshotCaptureWorksheetV1>["summary"] {
  const sourceIdx = args.argv.indexOf("--source");
  const planPath = readArgValue(args.argv, "--plan");
  const outArg = readArgValue(args.argv, "--out");
  const force = args.argv.includes("--force");

  if (sourceIdx >= 0 && planPath) {
    throw new WriteBatchOwnerScreenshotCaptureWorksheetCliErrorV1(
      "--source cannot be combined with --plan",
    );
  }
  if (sourceIdx < 0 && !planPath) {
    throw new WriteBatchOwnerScreenshotCaptureWorksheetCliErrorV1(
      "requires --source amazon-rescue-default or --plan path/to/plan.json",
    );
  }

  const usedAmazonRescueDefaultSource =
    sourceIdx >= 0 && args.argv[sourceIdx + 1] === BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1;

  const templateArgv: string[] = [];
  if (sourceIdx >= 0) {
    templateArgv.push("--source", args.argv[sourceIdx + 1]!);
  } else if (planPath) {
    templateArgv.push("--plan", planPath);
  }

  const template = runReportBatchOwnerScreenshotFactsTemplateV1({
    argv: templateArgv,
    cwd: args.repoRoot,
    readFile: args.readFile,
  });

  const resolvedOut = resolveOwnerScreenshotCaptureWorksheetOutputPathV1({
    outArg,
    usedAmazonRescueDefaultSource,
  });

  const result = writeOwnerScreenshotCaptureWorksheetV1({
    repoRoot: args.repoRoot,
    outArg: resolvedOut,
    template,
    force,
    fs: {
      exists: existsSync,
      mkdir: mkdirSync,
      writeFile: writeFileSync,
    },
  });

  return result.summary;
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/write-batch-owner-screenshot-capture-worksheet.ts --source amazon-rescue-default",
      "  node --import tsx scripts/write-batch-owner-screenshot-capture-worksheet.ts --plan path/to/plan.json [--out data/batch-production/drafts/custom.md] [--force]",
      "",
      "PROVEN: writes lane-local Markdown worksheet only; never writes data/evidence/.",
    ].join("\n"),
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  try {
    const summary = runWriteBatchOwnerScreenshotCaptureWorksheetV1({
      argv,
      repoRoot: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner screenshot capture worksheet error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
