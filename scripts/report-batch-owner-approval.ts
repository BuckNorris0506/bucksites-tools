/**
 * Batch Owner Approval v1 — compile founder Markdown decisions into approval + registry export JSON.
 *
 *   node --import tsx scripts/report-batch-owner-approval.ts --source non-amazon-pdp-candidates --facts agent-facts.json --decisions checklist.md
 *   node --import tsx scripts/report-batch-owner-approval.ts --review draft.json --decisions checklist.md
 *   node --import tsx scripts/report-batch-owner-approval.ts --review draft.json --decisions checklist.md --out data/batch-production/drafts/approval.json --registry-out data/owner-decisions/batch-non-amazon-pdp-owner-approval.json
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileBatchOwnerApprovalFromMarkdownV1,
  parseBatchOwnerApprovalDraftReviewFromFileV1,
} from "../src/lib/owner-dashboard/batch-owner-approval-v1";
import {
  BATCH_OWNER_APPROVAL_DRAFT_DEFAULT_RELATIVE_V1,
  BATCH_OWNER_APPROVAL_REGISTRY_EXPORT_DEFAULT_RELATIVE_V1,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  validateBatchOwnerApprovalPacketOutputPathV1,
  validateBatchOwnerApprovalRegistryExportPathV1,
} from "../src/lib/owner-dashboard/batch-owner-approval-write-v1";
import { resolveBatchDraftReviewForOwnerApprovalV1 } from "../src/lib/owner-dashboard/batch-production-lane-pipeline-v1";
import { formatBatchProductionSupportedSourcesListV1 } from "../src/lib/owner-dashboard/batch-production-source-v1";

export class BatchOwnerApprovalCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchOwnerApprovalCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runReportBatchOwnerApprovalV1(args: {
  argv: string[];
  repoRoot: string;
  readFile: (absolutePath: string) => string;
}): {
  packet: ReturnType<typeof compileBatchOwnerApprovalFromMarkdownV1>["packet"];
  wrote_packet: boolean;
  packet_path: string | null;
  wrote_registry: boolean;
  registry_path: string | null;
} {
  const reviewPath = readArgValue(args.argv, "--review");
  const source = readArgValue(args.argv, "--source");
  const factsPath = readArgValue(args.argv, "--facts");
  const decisionsPath = readArgValue(args.argv, "--decisions");
  const outArg = readArgValue(args.argv, "--out");
  const registryOutArg = readArgValue(args.argv, "--registry-out");
  const force = args.argv.includes("--force");

  if (reviewPath && source) {
    throw new BatchOwnerApprovalCliErrorV1("use either --review or --source, not both");
  }
  if (!reviewPath && !source) {
    throw new BatchOwnerApprovalCliErrorV1(
      "--source <name> or --review path/to/draft-review.json is required",
    );
  }
  if (!decisionsPath) {
    throw new BatchOwnerApprovalCliErrorV1("--decisions path/to/checklist.md is required");
  }
  if (factsPath && !source) {
    throw new BatchOwnerApprovalCliErrorV1("--facts requires --source");
  }

  let draftReview;
  if (source) {
    let factsRaw: unknown;
    if (factsPath) {
      try {
        factsRaw = JSON.parse(args.readFile(path.resolve(factsPath)));
      } catch (e) {
        throw new BatchOwnerApprovalCliErrorV1(
          e instanceof Error ? e.message : "invalid JSON in --facts file",
        );
      }
    }

    try {
      draftReview = resolveBatchDraftReviewForOwnerApprovalV1({
        source,
        repoRoot: args.repoRoot,
        deps: {
          readTextFile: args.readFile,
          listEvidenceFilenames: (dir) => {
            try {
              return readdirSync(dir);
            } catch {
              return [];
            }
          },
        },
        factsRaw,
      }).draftReview;
    } catch (e) {
      throw new BatchOwnerApprovalCliErrorV1(
        e instanceof Error
          ? e.message
          : `unknown --source ${source}; supported: ${formatBatchProductionSupportedSourcesListV1()}`,
      );
    }
  } else {
    let reviewRaw: unknown;
    try {
      reviewRaw = JSON.parse(args.readFile(path.resolve(reviewPath!)));
    } catch (e) {
      throw new BatchOwnerApprovalCliErrorV1(
        e instanceof Error ? e.message : "invalid JSON in --review file",
      );
    }
    draftReview = parseBatchOwnerApprovalDraftReviewFromFileV1(reviewRaw);
  }

  const decisionsMarkdown = args.readFile(path.resolve(decisionsPath));
  const { packet, compile_errors } = compileBatchOwnerApprovalFromMarkdownV1({
    draftReview,
    decisionsMarkdown,
  });
  if (compile_errors.length > 0) {
    throw new BatchOwnerApprovalCliErrorV1(compile_errors.join("\n"));
  }

  let wrote_packet = false;
  let packet_path: string | null = null;

  if (outArg?.trim()) {
    const { absolutePath, repoRelativePosix } = validateBatchOwnerApprovalPacketOutputPathV1(
      args.repoRoot,
      outArg.trim(),
    );
    if (existsSync(absolutePath) && !force) {
      throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
        `refusing overwrite without --force: ${repoRelativePosix}`,
      );
    }
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    wrote_packet = true;
    packet_path = repoRelativePosix;
  }

  let wrote_registry = false;
  let registry_path: string | null = null;

  if (registryOutArg?.trim() && packet.founder_decision_registry_export) {
    const { absolutePath, repoRelativePosix } = validateBatchOwnerApprovalRegistryExportPathV1(
      args.repoRoot,
      registryOutArg.trim(),
    );
    if (existsSync(absolutePath) && !force) {
      throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
        `refusing overwrite without --force: ${repoRelativePosix}`,
      );
    }
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(
      absolutePath,
      `${JSON.stringify(packet.founder_decision_registry_export, null, 2)}\n`,
      "utf8",
    );
    wrote_registry = true;
    registry_path = repoRelativePosix;
  }

  return { packet, wrote_packet, packet_path, wrote_registry, registry_path };
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-owner-approval.ts --source non-amazon-pdp-candidates --facts agent-facts.json --decisions checklist.md",
      "  node --import tsx scripts/report-batch-owner-approval.ts --review draft.json --decisions checklist.md",
      `  Optional: --out ${BATCH_OWNER_APPROVAL_DRAFT_DEFAULT_RELATIVE_V1}`,
      `  Optional: --registry-out ${BATCH_OWNER_APPROVAL_REGISTRY_EXPORT_DEFAULT_RELATIVE_V1}`,
      "  Without --out, prints batch_owner_approval_packet_v1 JSON to stdout.",
      "",
      "PROVEN: compiles founder Markdown decisions only; does not mutate production data.",
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
    const result = runReportBatchOwnerApprovalV1({
      argv,
      repoRoot: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });

    if (!readArgValue(argv, "--out")) {
      process.stdout.write(`${JSON.stringify(result.packet, null, 2)}\n`);
    } else {
      process.stderr.write(
        `Wrote approval packet (${result.packet.approval_row_count} rows): ${result.packet_path}\n`,
      );
    }

    if (result.wrote_registry) {
      process.stderr.write(`Wrote registry export: ${result.registry_path}\n`);
    } else if (readArgValue(argv, "--registry-out") && !result.packet.founder_decision_registry_export) {
      process.stderr.write(
        "Warning: no valid registry rows to export (check registry_validation_errors in packet)\n",
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner approval error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
