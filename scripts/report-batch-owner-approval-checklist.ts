/**
 * Batch Owner Approval Checklist v1 — Markdown for founder decisions (not JSON).
 *
 *   node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates
 *   node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates --facts path/to/agent-facts.json
 *   node --import tsx scripts/report-batch-owner-approval-checklist.ts --review path/to/draft-review.json
 *   node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates --out data/batch-production/drafts/batch-owner-approval-checklist.md
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBatchOwnerApprovalChecklistMarkdownV1,
  parseBatchOwnerApprovalDraftReviewFromFileV1,
} from "../src/lib/owner-dashboard/batch-owner-approval-v1";
import {
  BATCH_OWNER_APPROVAL_CHECKLIST_DEFAULT_RELATIVE_V1,
  OwnerScreenshotFactsDraftOverwriteErrorV1,
  validateBatchOwnerApprovalChecklistOutputPathV1,
} from "../src/lib/owner-dashboard/batch-owner-approval-write-v1";
import { resolveBatchDraftReviewForOwnerApprovalV1 } from "../src/lib/owner-dashboard/batch-production-lane-pipeline-v1";
import { formatBatchProductionSupportedSourcesListV1 } from "../src/lib/owner-dashboard/batch-production-source-v1";

export class BatchOwnerApprovalChecklistCliErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchOwnerApprovalChecklistCliErrorV1";
  }
}

function readArgValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] ?? null;
}

export function runReportBatchOwnerApprovalChecklistV1(args: {
  argv: string[];
  repoRoot: string;
  readFile: (absolutePath: string) => string;
}): { markdown: string; wrote_file: boolean; output_path: string | null } {
  const reviewPath = readArgValue(args.argv, "--review");
  const source = readArgValue(args.argv, "--source");
  const factsPath = readArgValue(args.argv, "--facts");
  const outArg = readArgValue(args.argv, "--out");
  const force = args.argv.includes("--force");

  if (reviewPath && source) {
    throw new BatchOwnerApprovalChecklistCliErrorV1(
      "use either --review or --source, not both",
    );
  }
  if (!reviewPath && !source) {
    throw new BatchOwnerApprovalChecklistCliErrorV1(
      "--source <name> or --review path/to/draft-review.json is required",
    );
  }
  if (factsPath && !source) {
    throw new BatchOwnerApprovalChecklistCliErrorV1("--facts requires --source");
  }

  let draftReview;
  let includePlanningCohort = false;

  if (source) {
    let factsRaw: unknown;
    if (factsPath) {
      try {
        factsRaw = JSON.parse(args.readFile(path.resolve(factsPath)));
      } catch (e) {
        throw new BatchOwnerApprovalChecklistCliErrorV1(
          e instanceof Error ? e.message : "invalid JSON in --facts file",
        );
      }
    }

    let resolved;
    try {
      resolved = resolveBatchDraftReviewForOwnerApprovalV1({
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
      });
    } catch (e) {
      throw new BatchOwnerApprovalChecklistCliErrorV1(
        e instanceof Error
          ? e.message
          : `unknown --source ${source}; supported: ${formatBatchProductionSupportedSourcesListV1()}`,
      );
    }

    draftReview = resolved.draftReview;
    includePlanningCohort = resolved.from_planning_seed;
  } else {
    let reviewRaw: unknown;
    try {
      reviewRaw = JSON.parse(args.readFile(path.resolve(reviewPath!)));
    } catch (e) {
      throw new BatchOwnerApprovalChecklistCliErrorV1(
        e instanceof Error ? e.message : "invalid JSON in --review file",
      );
    }
    draftReview = parseBatchOwnerApprovalDraftReviewFromFileV1(reviewRaw);
  }

  const markdown = buildBatchOwnerApprovalChecklistMarkdownV1(draftReview, {
    include_planning_cohort_rows: includePlanningCohort,
  });
  const content = markdown.endsWith("\n") ? markdown : `${markdown}\n`;

  if (!outArg?.trim()) {
    return { markdown: content, wrote_file: false, output_path: null };
  }

  const resolvedOut = outArg.trim();
  const { absolutePath, repoRelativePosix } = validateBatchOwnerApprovalChecklistOutputPathV1(
    args.repoRoot,
    resolvedOut,
  );

  if (existsSync(absolutePath) && !force) {
    throw new OwnerScreenshotFactsDraftOverwriteErrorV1(
      `refusing overwrite without --force: ${repoRelativePosix}`,
    );
  }

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");

  return { markdown: content, wrote_file: true, output_path: repoRelativePosix };
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates",
      "  node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates --facts path/to/agent-facts.json",
      "  node --import tsx scripts/report-batch-owner-approval-checklist.ts --review path/to/draft-review.json",
      `  node --import tsx scripts/report-batch-owner-approval-checklist.ts --source non-amazon-pdp-candidates --out ${BATCH_OWNER_APPROVAL_CHECKLIST_DEFAULT_RELATIVE_V1} [--force]`,
      "",
      "PROVEN: Markdown checklist only; founder fills founder_decision lines (not JSON).",
      "PROVEN: --source builds planning cohort from repo without hand-authored draft-review JSON.",
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
    const result = runReportBatchOwnerApprovalChecklistV1({
      argv,
      repoRoot: process.cwd(),
      readFile: (p) => readFileSync(p, "utf8"),
    });
    if (result.wrote_file) {
      process.stderr.write(`Wrote approval checklist: ${result.output_path}\n`);
    } else {
      process.stdout.write(result.markdown);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Batch owner approval checklist error: ${msg}\n`);
    process.exit(2);
  }
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  main();
}
