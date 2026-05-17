/**
 * Read-only Batch Agent Evidence Capture Packet v1 — stdout JSON only.
 *
 *   node --import tsx scripts/report-batch-agent-evidence-capture-packet.ts --source amazon-rescue-default
 *   node --import tsx scripts/report-batch-agent-evidence-capture-packet.ts --plan path/to/plan.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchAgentEvidenceCapturePacketV1,
  type BatchAgentEvidenceCapturePacketV1,
} from "../src/lib/owner-dashboard/batch-agent-evidence-capture-packet-v1";
import { buildBatchProductionReviewFromSourceCliV1 } from "./report-batch-evidence-collection-plan";
import {
  buildBatchEvidenceCollectionPlanV1,
  parseBatchProductionReviewReportForPlanV1,
} from "../src/lib/owner-dashboard/batch-evidence-collection-plan-v1";
import { parseBatchEvidenceCollectionPlanForTemplateV1 } from "../src/lib/owner-dashboard/batch-owner-screenshot-facts-template-v1";
import { formatBatchProductionSupportedSourcesListV1 } from "../src/lib/owner-dashboard/batch-production-source-v1";

export class BatchAgentEvidenceCapturePacketCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchAgentEvidenceCapturePacketCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runReportBatchAgentEvidenceCapturePacketV1(args: {
  argv: string[];
  cwd: string;
  readFile: (absolutePath: string) => string;
}): BatchAgentEvidenceCapturePacketV1 {
  const sourceIdx = args.argv.indexOf("--source");
  const planPath = readArgValue(args.argv, "--plan");

  if (sourceIdx >= 0 && planPath) {
    throw new BatchAgentEvidenceCapturePacketCliErrorV1(
      "--source cannot be combined with --plan",
    );
  }

  let plan;
  if (sourceIdx >= 0) {
    const source = args.argv[sourceIdx + 1];
    if (!source) {
      throw new BatchAgentEvidenceCapturePacketCliErrorV1("--source requires a source name");
    }
    let review;
    try {
      review = buildBatchProductionReviewFromSourceCliV1(args.cwd, source);
    } catch (e) {
      throw new BatchAgentEvidenceCapturePacketCliErrorV1(
        e instanceof Error
          ? e.message
          : `unknown --source ${source}; supported: ${formatBatchProductionSupportedSourcesListV1()}`,
      );
    }
    plan = buildBatchEvidenceCollectionPlanV1({
      reviewReport: review,
      generated_at: new Date().toISOString(),
    });
  } else if (planPath) {
    let planRaw: unknown;
    try {
      planRaw = JSON.parse(args.readFile(path.resolve(planPath)));
    } catch (e) {
      throw new BatchAgentEvidenceCapturePacketCliErrorV1(
        e instanceof Error ? e.message : "invalid JSON in --plan file",
      );
    }
    if (
      planRaw &&
      typeof planRaw === "object" &&
      (planRaw as Record<string, unknown>).contract === "batch_production_review_report_v1"
    ) {
      const review = parseBatchProductionReviewReportForPlanV1(planRaw);
      plan = buildBatchEvidenceCollectionPlanV1({
        reviewReport: review,
        generated_at: new Date().toISOString(),
      });
    } else {
      plan = parseBatchEvidenceCollectionPlanForTemplateV1(planRaw);
    }
  } else {
    throw new BatchAgentEvidenceCapturePacketCliErrorV1(
      `requires --source (${formatBatchProductionSupportedSourcesListV1()}) or --plan path/to/plan.json`,
    );
  }

  return buildBatchAgentEvidenceCapturePacketV1({
    plan,
    generated_at: new Date().toISOString(),
  });
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-agent-evidence-capture-packet.ts --source amazon-rescue-default",
      "  node --import tsx scripts/report-batch-agent-evidence-capture-packet.ts --plan path/to/batch-evidence-plan.json",
      "",
      "PROVEN: stdout only (batch_agent_evidence_capture_packet_v1); agent fills facts; owner reviews. No data/evidence/ writes.",
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
    const packet = runReportBatchAgentEvidenceCapturePacketV1({
      argv,
      cwd: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });
    process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch agent evidence capture packet error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
