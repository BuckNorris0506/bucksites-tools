/**
 * Read-only Batch Owner Screenshot Draft Packet v1 — stdout JSON only.
 *
 *   node --import tsx scripts/report-batch-owner-screenshot-drafts.ts --plan path/to/plan.json --facts path/to/facts.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchOwnerScreenshotDraftPacketV1,
  parseBatchEvidenceCollectionPlanForDraftV1,
  parseBatchOwnerScreenshotFactsInputV1,
  type BatchOwnerScreenshotDraftPacketV1,
} from "../src/lib/owner-dashboard/batch-owner-screenshot-draft-packet-v1";

export class BatchOwnerScreenshotDraftCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchOwnerScreenshotDraftCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runReportBatchOwnerScreenshotDraftsV1(args: {
  argv: string[];
  readFile: (absolutePath: string) => string;
}): BatchOwnerScreenshotDraftPacketV1 {
  const planPath = readArgValue(args.argv, "--plan");
  const factsPath = readArgValue(args.argv, "--facts");
  if (!planPath || !factsPath) {
    throw new BatchOwnerScreenshotDraftCliErrorV1("--plan and --facts are required file paths");
  }

  let planRaw: unknown;
  let factsRaw: unknown;
  try {
    planRaw = JSON.parse(args.readFile(path.resolve(planPath)));
    factsRaw = JSON.parse(args.readFile(path.resolve(factsPath)));
  } catch (e) {
    throw new BatchOwnerScreenshotDraftCliErrorV1(
      e instanceof Error ? e.message : "invalid JSON in --plan or --facts file",
    );
  }

  const plan = parseBatchEvidenceCollectionPlanForDraftV1(planRaw);
  const factsInput = parseBatchOwnerScreenshotFactsInputV1(factsRaw);

  return buildBatchOwnerScreenshotDraftPacketV1({
    plan,
    factsInput,
    generated_at: new Date().toISOString(),
  });
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-owner-screenshot-drafts.ts --plan path/to/plan.json --facts path/to/facts.json",
      "",
      "Facts JSON: { \"facts\": [{ \"row_id\": \"w10413645a\", \"token\": \"W10413645A\", ... }] }",
      "PROVEN: stdout only (batch_owner_screenshot_draft_packet_v1); does not write data/evidence/.",
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
    const packet = runReportBatchOwnerScreenshotDraftsV1({
      argv,
      readFile: (p) => readFileSync(p, "utf8"),
    });
    process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner screenshot draft error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
