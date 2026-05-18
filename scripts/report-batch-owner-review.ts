/**
 * Read-only Batch Owner Review Report v1 — Markdown for founder review.
 *
 *   node --import tsx scripts/report-batch-owner-review.ts --review path/to/draft-review.json
 *   node --import tsx scripts/report-batch-owner-review.ts --review path/to/draft-review.json --out data/batch-production/drafts/owner-review.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchOwnerReviewReportMarkdownV1,
  parseBatchOwnerScreenshotDraftReviewV1,
  writeBatchOwnerReviewReportV1,
  type BatchOwnerReviewReportWriteSummaryV1,
} from "../src/lib/owner-dashboard/batch-owner-review-report-v1";

export class BatchOwnerReviewReportCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchOwnerReviewReportCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export type RunReportBatchOwnerReviewResultV1 =
  | { mode: "stdout"; markdown: string; review_row_count: number }
  | { mode: "file"; summary: BatchOwnerReviewReportWriteSummaryV1; markdown: string };

export function runReportBatchOwnerReviewV1(args: {
  argv: string[];
  repoRoot: string;
  readFile: (absolutePath: string) => string;
}): RunReportBatchOwnerReviewResultV1 {
  const reviewPath = readArgValue(args.argv, "--review");
  const outArg = readArgValue(args.argv, "--out");
  const force = args.argv.includes("--force");

  if (!reviewPath) {
    throw new BatchOwnerReviewReportCliErrorV1("--review path/to/draft-review.json is required");
  }

  let reviewRaw: unknown;
  try {
    reviewRaw = JSON.parse(args.readFile(path.resolve(reviewPath)));
  } catch (e) {
    throw new BatchOwnerReviewReportCliErrorV1(
      e instanceof Error ? e.message : "invalid JSON in --review file",
    );
  }

  const review = parseBatchOwnerScreenshotDraftReviewV1(reviewRaw);
  const markdown = buildBatchOwnerReviewReportMarkdownV1(review);

  if (!outArg?.trim()) {
    return { mode: "stdout", markdown, review_row_count: review.rows.length };
  }

  const result = writeBatchOwnerReviewReportV1({
    repoRoot: args.repoRoot,
    outArg: outArg.trim(),
    review,
    force,
    fs: {
      exists: existsSync,
      mkdir: mkdirSync,
      writeFile: writeFileSync,
    },
  });

  return { mode: "file", summary: result.summary, markdown: result.markdown };
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-owner-review.ts --review path/to/owner-screenshot-draft-review.json",
      "  node --import tsx scripts/report-batch-owner-review.ts --review path/to/review.json --out data/batch-production/drafts/owner-review.md [--force]",
      "",
      "PROVEN: Markdown only; --out must be under data/batch-production/drafts/*.md (no data/evidence/).",
      "Without --out, prints Markdown to stdout.",
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
    const result = runReportBatchOwnerReviewV1({
      argv,
      repoRoot: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });

    if (result.mode === "stdout") {
      process.stdout.write(result.markdown);
    } else {
      process.stderr.write(
        `Wrote owner review report (${result.summary.review_row_count} rows): ${result.summary.output_path}\n`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner review report error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
