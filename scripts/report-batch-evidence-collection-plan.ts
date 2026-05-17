/**
 * Read-only Batch Evidence Collection Plan v1 — stdout JSON only.
 *
 *   node --import tsx scripts/report-batch-evidence-collection-plan.ts --source amazon-rescue-default
 *   node --import tsx scripts/report-batch-evidence-collection-plan.ts --stdin  # batch_production_review_report_v1 JSON
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchEvidenceCollectionPlanV1,
  parseBatchProductionReviewReportForPlanV1,
  type BatchEvidenceCollectionPlanV1,
} from "../src/lib/owner-dashboard/batch-evidence-collection-plan-v1";
import {
  BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1,
  buildBatchProductionRowsFromAmazonRescueDefaultV1,
} from "../src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";
import { buildBatchProductionReviewReportV1 } from "../src/lib/owner-dashboard/batch-production-lane-v1";

export class BatchEvidenceCollectionPlanCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchEvidenceCollectionPlanCliErrorV1";
  }
}

function readStdinUtf8(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

/** PROVEN: same repo read path as batch production review amazon-rescue-default source. */
export function buildAmazonRescueDefaultBatchReviewReportV1(
  repoRoot: string,
): ReturnType<typeof buildBatchProductionReviewReportV1> {
  const built = buildBatchProductionRowsFromAmazonRescueDefaultV1(repoRoot, {
    readTextFile: (p) => readFileSync(p, "utf8"),
    listEvidenceFilenames: (dir) => {
      try {
        return readdirSync(dir);
      } catch {
        return [];
      }
    },
  });
  return buildBatchProductionReviewReportV1({
    rows: built.rows,
    generated_at: new Date().toISOString(),
  });
}

export function runReportBatchEvidenceCollectionPlanV1(args: {
  argv: string[];
  cwd: string;
  readStdin: () => Promise<string>;
}): Promise<BatchEvidenceCollectionPlanV1> {
  const sourceIdx = args.argv.indexOf("--source");
  const hasStdin = args.argv.includes("--stdin");
  const hasInput = args.argv.includes("--input");

  if (sourceIdx >= 0 && (hasStdin || hasInput)) {
    return Promise.reject(
      new BatchEvidenceCollectionPlanCliErrorV1(
        "--source cannot be combined with --stdin or --input",
      ),
    );
  }

  if (sourceIdx >= 0) {
    const source = args.argv[sourceIdx + 1];
    if (!source) {
      return Promise.reject(
        new BatchEvidenceCollectionPlanCliErrorV1("--source requires a source name"),
      );
    }
    if (source !== BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1) {
      return Promise.reject(
        new BatchEvidenceCollectionPlanCliErrorV1(
          `unknown --source ${source}; supported: ${BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1}`,
        ),
      );
    }
    const review = buildAmazonRescueDefaultBatchReviewReportV1(args.cwd);
    return Promise.resolve(
      buildBatchEvidenceCollectionPlanV1({
        reviewReport: review,
        generated_at: new Date().toISOString(),
      }),
    );
  }

  let raw = "";
  const inputIdx = args.argv.indexOf("--input");
  if (inputIdx >= 0) {
    const p = args.argv[inputIdx + 1];
    if (!p) {
      return Promise.reject(
        new BatchEvidenceCollectionPlanCliErrorV1("--input requires a file path"),
      );
    }
    raw = readFileSync(path.resolve(p), "utf8");
  } else if (hasStdin) {
    return args.readStdin().then((stdin) => {
      const review = parseBatchProductionReviewReportForPlanV1(JSON.parse(stdin));
      return buildBatchEvidenceCollectionPlanV1({
        reviewReport: review,
        generated_at: new Date().toISOString(),
      });
    });
  } else {
    return Promise.reject(
      new BatchEvidenceCollectionPlanCliErrorV1(
        "requires --source amazon-rescue-default, --stdin (batch review JSON), or --input path",
      ),
    );
  }

  const review = parseBatchProductionReviewReportForPlanV1(JSON.parse(raw));
  return Promise.resolve(
    buildBatchEvidenceCollectionPlanV1({
      reviewReport: review,
      generated_at: new Date().toISOString(),
    }),
  );
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-evidence-collection-plan.ts --source amazon-rescue-default",
      "  node --import tsx scripts/report-batch-evidence-collection-plan.ts --stdin < batch-review.json",
      "  node --import tsx scripts/report-batch-evidence-collection-plan.ts --input path/to/batch-review.json",
      "",
      "PROVEN: stdout JSON only (batch_evidence_collection_plan_v1); does not write evidence files.",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  try {
    const plan = await runReportBatchEvidenceCollectionPlanV1({
      argv: args,
      cwd: process.cwd(),
      readStdin: readStdinUtf8,
    });
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch evidence collection plan error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
