/**
 * Read-only Batch Owner Screenshot Facts Template v1 — stdout JSON only.
 *
 *   node --import tsx scripts/report-batch-owner-screenshot-facts-template.ts --source amazon-rescue-default
 *   node --import tsx scripts/report-batch-owner-screenshot-facts-template.ts --plan path/to/plan.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchOwnerScreenshotFactsTemplateV1,
  parseBatchEvidenceCollectionPlanForTemplateV1,
  type BatchOwnerScreenshotFactsTemplateV1,
} from "../src/lib/owner-dashboard/batch-owner-screenshot-facts-template-v1";
import { buildAmazonRescueDefaultBatchReviewReportV1 } from "./report-batch-evidence-collection-plan";
import { buildBatchEvidenceCollectionPlanV1 } from "../src/lib/owner-dashboard/batch-evidence-collection-plan-v1";
import { BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1 } from "../src/lib/owner-dashboard/batch-production-amazon-rescue-source-v1";

export class BatchOwnerScreenshotFactsTemplateCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchOwnerScreenshotFactsTemplateCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runReportBatchOwnerScreenshotFactsTemplateV1(args: {
  argv: string[];
  cwd: string;
  readFile: (absolutePath: string) => string;
}): BatchOwnerScreenshotFactsTemplateV1 {
  const sourceIdx = args.argv.indexOf("--source");
  const planPath = readArgValue(args.argv, "--plan");

  if (sourceIdx >= 0 && planPath) {
    throw new BatchOwnerScreenshotFactsTemplateCliErrorV1(
      "--source cannot be combined with --plan",
    );
  }

  let plan;
  if (sourceIdx >= 0) {
    const source = args.argv[sourceIdx + 1];
    if (!source) {
      throw new BatchOwnerScreenshotFactsTemplateCliErrorV1("--source requires a source name");
    }
    if (source !== BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1) {
      throw new BatchOwnerScreenshotFactsTemplateCliErrorV1(
        `unknown --source ${source}; supported: ${BATCH_PRODUCTION_SOURCE_AMAZON_RESCUE_DEFAULT_V1}`,
      );
    }
    const review = buildAmazonRescueDefaultBatchReviewReportV1(args.cwd);
    plan = buildBatchEvidenceCollectionPlanV1({
      reviewReport: review,
      generated_at: new Date().toISOString(),
    });
  } else if (planPath) {
    let planRaw: unknown;
    try {
      planRaw = JSON.parse(args.readFile(path.resolve(planPath)));
    } catch (e) {
      throw new BatchOwnerScreenshotFactsTemplateCliErrorV1(
        e instanceof Error ? e.message : "invalid JSON in --plan file",
      );
    }
    plan = parseBatchEvidenceCollectionPlanForTemplateV1(planRaw);
  } else {
    throw new BatchOwnerScreenshotFactsTemplateCliErrorV1(
      "requires --source amazon-rescue-default or --plan path/to/plan.json",
    );
  }

  return buildBatchOwnerScreenshotFactsTemplateV1({
    plan,
    generated_at: new Date().toISOString(),
  });
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-owner-screenshot-facts-template.ts --source amazon-rescue-default",
      "  node --import tsx scripts/report-batch-owner-screenshot-facts-template.ts --plan path/to/batch-evidence-plan.json",
      "",
      "PROVEN: stdout only (batch_owner_screenshot_facts_template_v1); does not write data/evidence/.",
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
    const template = runReportBatchOwnerScreenshotFactsTemplateV1({
      argv,
      cwd: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });
    process.stdout.write(`${JSON.stringify(template, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner screenshot facts template error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
