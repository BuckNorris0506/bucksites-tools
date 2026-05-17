/**
 * Lane-local draft writer for owner screenshot facts templates (not production evidence).
 *
 *   node --import tsx scripts/write-batch-owner-screenshot-facts-template-draft.ts --source amazon-rescue-default
 *   node --import tsx scripts/write-batch-owner-screenshot-facts-template-draft.ts --plan path/to/plan.json [--out path] [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  writeOwnerScreenshotFactsTemplateDraftV1,
  resolveOwnerScreenshotFactsDraftOutputPathV1,
} from "../src/lib/owner-dashboard/batch-owner-screenshot-facts-template-draft-write-v1";
import { runReportBatchOwnerScreenshotFactsTemplateV1 } from "./report-batch-owner-screenshot-facts-template";
import { BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1 } from "../src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";

export class WriteBatchOwnerScreenshotFactsTemplateDraftCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WriteBatchOwnerScreenshotFactsTemplateDraftCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runWriteBatchOwnerScreenshotFactsTemplateDraftV1(args: {
  argv: string[];
  repoRoot: string;
  readFile: (absolutePath: string) => string;
}): ReturnType<typeof writeOwnerScreenshotFactsTemplateDraftV1>["summary"] {
  const sourceIdx = args.argv.indexOf("--source");
  const planPath = readArgValue(args.argv, "--plan");
  const outArg = readArgValue(args.argv, "--out");
  const force = args.argv.includes("--force");

  if (sourceIdx >= 0 && planPath) {
    throw new WriteBatchOwnerScreenshotFactsTemplateDraftCliErrorV1(
      "--source cannot be combined with --plan",
    );
  }
  if (sourceIdx < 0 && !planPath) {
    throw new WriteBatchOwnerScreenshotFactsTemplateDraftCliErrorV1(
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

  const resolvedOut = resolveOwnerScreenshotFactsDraftOutputPathV1({
    repoRoot: args.repoRoot,
    outArg,
    usedAmazonRescueDefaultSource,
  });

  const result = writeOwnerScreenshotFactsTemplateDraftV1({
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
      "  node --import tsx scripts/write-batch-owner-screenshot-facts-template-draft.ts --source amazon-rescue-default",
      "  node --import tsx scripts/write-batch-owner-screenshot-facts-template-draft.ts --plan path/to/plan.json [--out data/batch-production/drafts/custom.json] [--force]",
      "",
      `Default --out: ${resolveOwnerScreenshotFactsDraftOutputPathV1({ repoRoot: ".", outArg: null, usedAmazonRescueDefaultSource: true })}`,
      "PROVEN: writes lane-local draft JSON only; never writes data/evidence/.",
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
    const summary = runWriteBatchOwnerScreenshotFactsTemplateDraftV1({
      argv,
      repoRoot: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner screenshot facts template draft write error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
