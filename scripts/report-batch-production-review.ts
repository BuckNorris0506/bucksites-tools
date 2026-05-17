/**
 * Read-only Batch Production Lane v1 report — stdout JSON only (no file writes by default).
 * Machine-parseable: `node --import tsx scripts/report-batch-production-review.ts` (optional stdin JSON).
 * PROVEN: does not mutate Supabase, retailer_links, evidence JSON, registry files, or git state.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BatchProductionReviewCliParseErrorV1,
  buildBatchProductionReviewReportV1,
  parseBatchProductionReviewCliInputV1,
  type BatchProductionLaneInputRowV1,
  type BatchProductionReviewCliInputV1,
  type BatchProductionReviewReportV1,
} from "../src/lib/owner-dashboard/batch-production-lane-v1";

export {
  parseBatchProductionReviewCliInputV1,
  type BatchProductionReviewCliInputV1,
};

function readStdinUtf8(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

export function runReportBatchProductionReviewV1(
  input: BatchProductionReviewCliInputV1,
): BatchProductionReviewReportV1 {
  const now = new Date().toISOString();
  return buildBatchProductionReviewReportV1({
    rows: input.rows ?? [],
    context: input.context,
    generated_at: input.generated_at ?? now,
  });
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-production-review.ts",
      "  node --import tsx scripts/report-batch-production-review.ts --input path/to/input.json",
      "  node --import tsx scripts/report-batch-production-review.ts --stdin < path/to/input.json",
      "",
      "Stdin JSON shapes:",
      "  - Raw array: [{ \"row_id\": \"...\", \"part_token\"?, \"candidate_url\"?, \"source_reason\"? }, ...]",
      "  - Wrapper: { \"rows\": [...], \"context\"?: { ... }, \"generated_at\"?: \"...\" }",
      "Default (no flags): emits NO_CANDIDATES report without reading stdin.",
      "Use --stdin only when intentionally piping JSON (avoids hang under accidental pipes).",
      "PROVEN: stdout only; no file writes unless --input reads an existing JSON file.",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let raw = "";
  const inputIdx = args.indexOf("--input");
  if (inputIdx >= 0) {
    const p = args[inputIdx + 1];
    if (!p) {
      process.stderr.write("--input requires a file path\n");
      process.exit(2);
    }
    raw = readFileSync(path.resolve(p), "utf8");
  } else if (args.includes("--stdin")) {
    raw = await readStdinUtf8();
  }

  let parsed: BatchProductionReviewCliInputV1;
  try {
    parsed = parseBatchProductionReviewCliInputV1(raw);
  } catch (e) {
    const msg =
      e instanceof BatchProductionReviewCliParseErrorV1
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    process.stderr.write(`Invalid batch production stdin JSON: ${msg}\n`);
    process.exit(2);
  }

  const report = runReportBatchProductionReviewV1(parsed);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main().catch((e) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}

export type { BatchProductionLaneInputRowV1 };
